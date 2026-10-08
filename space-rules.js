/* Orbital battle (0.130): a map in space (MISSIONS.orbit, space: true) and the ships that fight there.
   - The map: asteroid fields (impassable, kind "asteroids") in three lanes across the middle, ore on
     asteroids, gas in nebulae, crystals; no weather, no wildlife, no night (the sun always shines).
   - The bases stay the same buildings under orbital names (command station, light and heavy shipyard,
     defence platform…), so the economy, the development tree, the computer opponent and saves work.
   - Ships: corvette, frigate, destroyer ("lancer": the key "destroyer" is the Dominium's tank destroyer)
     and cruiser, built by the shipyards; ground units are not available in space, and every ground unit
     the rules spawn there (starting forces, waves, a commander's choice) becomes the ship of its class.
   - Shields: each ship carries a shield that takes damage first and comes back after a few seconds
     without being hit. Class bonuses: corvettes swarm the big ships, frigates hunt the small ones,
     destroyers break the big ones, cruisers break stations.
   All values are tunable in RTS.SPACE. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.spaceInstalled) return;
		RTS.spaceInstalled = true;
		const { Game, TYPES, MISSIONS, FRONTIER_MAPS, TERRAIN, dist } = RTS;
		const { block } = TERRAIN;
		const SPACE = (RTS.SPACE = {
			// Shield: back after `delay` s without a hit, at `rate` of its capacity per second.
			shield: { delay: 4, rate: 0.12 },
			// Damage factors of a ship class against target types (others 1).
			bonus: {
				corvette: { lancer: 1.5, cruiser: 1.3, building: 0.6 },
				frigate: { corvette: 1.7, interceptor: 1.7, bomber: 1.7, drone: 1.7, worker: 1.7, fighter: 1.7, cruiser: 0.7, carrier: 0.7 },
				lancer: { frigate: 1.5, cruiser: 1.5, carrier: 1.6, corvette: 0.45, fighter: 0.3 },
				cruiser: { building: 1.4, fighter: 0.5 },
				carrier: { building: 0.5 },
				fighter: { worker: 1.4, corvette: 1.2, building: 0.4 },
			},
			// How high ships hover over the plane of the battle (3D board).
			hover: 34,
			// Carrier (0.136): up to `wing` fighters, one launched every `launch` s while it has fewer; they
			// fight within `reach` of the carrier and circle it otherwise; without it they last `orphan` s.
			carrier: { wing: 4, launch: 6, reach: 520, orbit: 75, orphan: 8 },
			// Nebula (0.131): the gas clouds round the gas fields. Ships inside are hard to hit (damage ×cover)
			// but their shields do not come back there.
			nebula: { radius: 230, cover: 0.75 },
			// Asteroid cover (0.131): a ship right next to an asteroid field takes damage ×cover.
			asteroids: { reach: 45, cover: 0.8 },
			// Ion storm (0.140): above this strength shields do not recharge.
			ion: { name: "Burza jonowa", shields: 0.3 },
			// Space storms take turns (0.142): ion storm → solar storm → asteroid shower → …
			storms: ["ion", "solar", "meteor"],
			// Solar storm: radiation wears ships' shields down (share of capacity per second at full strength).
			solar: { name: "Burza słoneczna", drain: 0.04 },
			// Asteroid shower: after `after` s of the storm, impacts every `every` s at full strength, each hurting
			// everything within `radius` (up to `damage`); the meteor shields research takes off `shield` of it.
			meteor: { name: "Deszcz asteroid", after: 20, every: 0.7, radius: 60, damage: 48, shield: 0.8 },
			// Pirates (0.141), by the scenario's wildlife setting: hideouts, crew per hideout, a new ship every
			// `build` s, a raid every `raid` s (the first after `first`), a raid's length; bounties in metal.
			pirates: {
				few: { bases: 1, crew: 3, raid: 120 },
				normal: { bases: 1, crew: 5, raid: 85 },
				many: { bases: 2, crew: 5, raid: 70 },
				build: 18,
				first: 110,
				raidTime: 55,
				retreat: 0.35,
				bounty: { pirate: 35, pirateBase: 250 },
			},
		});
		Object.assign(TYPES, {
			corvette: { name: "Korweta", hp: 130, speed: 150, range: 180, damage: 10, cooldown: 0.5, cost: 75, build: 5, radius: 13, sight: 360, ship: true, shield: 50 },
			frigate: { name: "Fregata", hp: 260, speed: 105, range: 240, damage: 22, cooldown: 0.9, cost: 140, build: 8, radius: 17, ship: true, shield: 110 },
			lancer: { name: "Niszczyciel", hp: 420, speed: 80, range: 300, damage: 60, cooldown: 1.9, cost: 240, build: 12, radius: 21, ship: true, shield: 160 },
			cruiser: { name: "Krążownik", hp: 1050, speed: 55, range: 330, damage: 34, cooldown: 0.75, cost: 480, build: 20, radius: 28, sight: 380, ship: true, shield: 380 },
			// The carrier fights through its fighters; its own guns only keep small craft off.
			carrier: { name: "Lotniskowiec", hp: 1400, speed: 48, range: 220, damage: 8, cooldown: 0.5, cost: 560, build: 24, radius: 33, sight: 420, ship: true, shield: 320 },
			// Launched by a carrier, never built; small, fast and fragile, flying over the ships.
			// Pirates (team 2, the neutral side: they fight everyone and everyone fights them).
			pirate: { name: "Okręt piracki", hp: 170, speed: 145, range: 200, damage: 11, cooldown: 0.55, cost: 0, build: 0, radius: 14, sight: 320, ship: true, shield: 40, pirate: true },
			pirateBase: { name: "Kryjówka piratów", hp: 1600, speed: 0, range: 280, damage: 16, cooldown: 0.8, cost: 0, radius: 42, sight: 420, pirate: true },
			fighter: { name: "Myśliwiec pokładowy", hp: 55, speed: 220, range: 130, damage: 6, cooldown: 0.35, cost: 0, build: 0, radius: 8, sight: 260, flying: true, fighter: true },
		});
		const SHIPS = (RTS.SHIPS = ["corvette", "frigate", "lancer", "cruiser", "carrier"]);
		// The ship of a ground unit's class (starting forces, waves, guardians of a mode).
		const SHIP_OF = { trooper: "corvette", raider: "corvette", crawler: "corvette", flamer: "corvette", saboteur: "corvette", rocket: "frigate", grenadier: "frigate", spitter: "frigate", skyguard: "frigate", transport: "frigate", tank: "lancer", destroyer: "lancer", sentinel: "lancer", heavy: "cruiser", colossus: "cruiser", artillery: "cruiser" };
		// Ground units the shipyards do not build (the hangar's craft, drones and workers stay).
		const GROUND = new Set([...Object.keys(SHIP_OF), "serviceRover", "hauler"]);
		// Orbital names of the shared buildings and units.
		RTS.SPACE_NAMES = {
			hq: "Stacja dowodzenia",
			barracks: "Stocznia lekka",
			factory: "Stocznia ciężka",
			turret: "Platforma obronna",
			depot: "Stacja przeładunkowa",
			extractor: "Kolektor mgławicy",
			reactor: "Reaktor orbitalny",
			lab: "Laboratorium orbitalne",
			wall: "Pas barier",
			gate: "Śluza",
			worker: "Dron górniczy",
			hangar: "Dok myśliwców",
			flak: "Bateria przeciwlotnicza",
		};

		const MAP = {
			mission: {
				name: "Orbita Kharona",
				planet: "Kharon · orbita",
				biome: "ice",
				theme: "space",
				space: true,
				mirror: "none",
				weatherName: "Burza jonowa",
				description:
					"Bitwa na orbicie gazowego olbrzyma Kharon; co jakiś czas przechodzi burza — na zmianę jonowa (słabsza celność, osłony się nie odnawiają), słoneczna (osłony słabną) i deszcz asteroid (uderzenia odłamków, gdy trwa dłużej), a z kryjówki w pasie asteroid najeżdżają piraci — na wszystkie strony. Pas asteroid przecina pole bitwy trzema korytarzami; w środkowym leżą najbogatsze złoża, gaz zbiera się w obłokach mgławicy. Zamiast pojazdów — korwety, fregaty, niszczyciele i krążowniki z regenerującymi się osłonami. W mgławicy statki trudniej trafić, ale osłony się tam nie odnawiają; tuż przy asteroidach statki mają osłonę przed ogniem.",
			},
			waters: () => [],
			obstacles: () =>
				block("asteroids", [
					// The belt: three lanes (north, middle, south).
					[1680, 260, 240, 200],
					[1680, 760, 200, 200],
					[1680, 1400, 200, 200],
					[1680, 1900, 240, 200],
					// Flanking fields.
					[1150, 560, 200, 140],
					[2210, 1600, 200, 140],
					[1100, 1620, 160, 130],
					[2260, 540, 160, 130],
					[900, 1350, 110, 100],
					[2460, 810, 110, 100],
				]),
			ores: [
				[1680, 1080, 6000],
				[1180, 860, 4600],
				[2180, 1300, 4600],
				[560, 900, 4000],
				[2800, 1260, 4000],
				[1680, 520, 3600],
				[1680, 1640, 3600],
			],
			gasFields: [
				[1300, 1300, 2600],
				[2060, 860, 2600],
				[800, 700, 2000],
				[2560, 1460, 2000],
			],
			crystalFields: [
				[1450, 1560, 1400],
				[1910, 600, 1400],
			],
		};
		FRONTIER_MAPS.orbit = MAP;
		MISSIONS.orbit = { ...MAP.mission, objective: "Zniszcz stację dowodzenia wroga." };

		// Three more maps in space (0.143), each in a world of its own: its own layout, obstacles, look of
		// the sky and the planet (or none), light and storms. `look` drives the 2D and 3D art.
		// A band of blocks along a line through (cx, cy) in direction (dx, dy), from `a` to `b` along it, a block
		// every `step`, leaving out the stretches round the given positions (lanes through it).
		const band = (cx, cy, dx, dy, a, b, step, w, h, gaps = []) => {
			const l = Math.hypot(dx, dy),
				out = [];
			for (let t = a; t <= b; t += step) if (gaps.every((g) => Math.abs(t - g) > step * 0.8)) out.push([Math.round(cx + (dx / l) * t), Math.round(cy + (dy / l) * t), w, h]);
			return out;
		};
		// Blocks round a circle, leaving gaps at the given angles (degrees).
		const ringOf = (cx, cy, r, count, size, gaps = []) => {
			const out = [];
			for (let i = 0; i < count; i++) {
				const deg = (i / count) * 360;
				if (gaps.some((g) => Math.abs(((deg - g + 540) % 360) - 180) < 360 / count)) continue;
				const a = (deg * Math.PI) / 180;
				out.push([Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), size, size]);
			}
			return out;
		};
		const MORE = {
			// Ice: a pale ice giant with vast bright rings near the battle; diagonal bands of ice make the lanes.
			glacis: {
				mission: {
					name: "Pierścienie Glacjalis",
					planet: "Glacjalis · pierścienie",
					biome: "ice",
					theme: "space",
					space: true,
					mirror: "none",
					weatherName: "Burza jonowa",
					storms: ["ion", "meteor"],
					stormNames: { meteor: "Deszcz lodowych odłamków" },
					look: { planet: "ice", rocks: "ice", nebula: [["#58d8e8", "#3a8ad8", "#a8f0ff"], ["#3fa0d8", "#2f6ad0", "#7fe8d8"]], sky: [["#2a7a9a", "#7fd8f0"], ["#1a3a70", "#4a8ad0"]], sun: "#e8f4ff", glow: "#7fb8e8", rings: "near", comet: true, convoys: true, derelict: false, ice: true },
					description:
						"Lodowy olbrzym Glacjalis, przewrócony na bok jak Uran, otacza tarcza lśniących pierścieni z lodu. Pola lodowych brył układają się w skośne pasma i wyznaczają skośne korytarze. Gaz wydobywa się z lodowych komet, kryształy rosną w szczelinach. Burze jonowe i deszcz lodowych odłamków.",
				},
				waters: () => [],
				obstacles: () =>
					block("asteroids", [
						...band(1680, 1080, 1, -0.62, -900, 900, 190, 150, 110, [-520, 0, 520]),
						...band(1180, 760, 1, -0.62, -600, 500, 190, 130, 100, [0, 320]),
						...band(2180, 1400, 1, -0.62, -500, 600, 190, 130, 100, [-320, 0]),
					]),
				ores: [[1680, 1080, 6200], [1300, 1350, 4600], [2060, 810, 4600], [560, 1080, 4000], [2800, 1080, 4000]],
				gasFields: [[1050, 1100, 2600], [2310, 1060, 2600], [1700, 540, 2200], [1660, 1620, 2200]],
				crystalFields: [[1430, 560, 1600], [1930, 1600, 1600], [880, 700, 1200], [2480, 1460, 1200]],
			},
			// The void: a black hole with a burning accretion disk instead of a planet; a ring of debris round
			// the middle with four ways in, the richest ore inside.
			abyss: {
				mission: {
					name: "Wrota Pustki",
					planet: "Czarna dziura Erebus",
					biome: "ash",
					theme: "space",
					space: true,
					mirror: "none",
					weatherName: "Rozbłysk dysku",
					storms: ["solar", "ion"],
					stormNames: { solar: "Rozbłysk dysku" },
					look: { planet: "none", blackHole: true, rocks: "dark", nebula: [["#a02838", "#601848", "#e05040"], ["#401060", "#702070", "#c03060"]], sky: [["#701828", "#e05040"], ["#301050", "#8030a0"]], sun: "#ffd8b0", glow: "#ff8a4a", rings: false, comet: false, convoys: false, derelict: true, ice: false },
					description:
						"Na skraju czarnej dziury Erebus płonie dysk akrecyjny, a światło gnie się wokół horyzontu zdarzeń. Pierścień gruzu otacza środek pola bitwy — cztery przejścia prowadzą do najbogatszych złóż w jego wnętrzu. Rozbłyski dysku wyczerpują osłony, burze jonowe zakłócają celowanie.",
				},
				waters: () => [],
				obstacles: () =>
					block("asteroids", [
						...ringOf(1680, 1080, 470, 16, 140, [0, 90, 180, 270]),
						[900, 560, 120, 110],
						[2460, 1600, 120, 110],
						[900, 1600, 120, 110],
						[2460, 560, 120, 110],
						[1680, 260, 160, 100],
						[1680, 1900, 160, 100],
					]),
				ores: [[1680, 1080, 7600], [1500, 940, 3000], [1860, 1220, 3000], [560, 1080, 4000], [2800, 1080, 4000]],
				gasFields: [[1680, 600, 2400], [1680, 1560, 2400], [1180, 1080, 2400], [2180, 1080, 2400]],
				crystalFields: [[1860, 940, 1600], [1500, 1220, 1600], [1100, 400, 1200], [2260, 1760, 1200]],
			},
			// The graveyard: hulks of a dead battle fleet over a volcanic moon under a red dwarf; the wrecks
			// make a maze round a central yard.
			graveyard: {
				mission: {
					name: "Cmentarzysko Floty",
					planet: "Pyros · księżyc wulkaniczny",
					biome: "ash",
					theme: "space",
					space: true,
					mirror: "none",
					weatherName: "Burza czerwonego karła",
					storms: ["solar", "meteor"],
					stormNames: { solar: "Burza czerwonego karła", meteor: "Deszcz odłamków kadłubów" },
					look: { planet: "lava", rocks: "hulk", nebula: [["#c05020", "#803010", "#f08040"], ["#702818", "#a04020", "#e07030"]], sky: [["#803818", "#f09040"], ["#502010", "#c05030"]], sun: "#ff9a6a", glow: "#ff6a2a", rings: false, comet: true, convoys: false, derelict: false, ice: false },
					description:
						"Nad wulkanicznym księżycem Pyros, w czerwonym świetle karła, dryfują wraki floty poległej w dawnej bitwie. Ogromne kadłuby okrętów tworzą labirynt korytarzy wokół centralnego dziedzińca. Burze słoneczne czerwonego karła i deszcz odłamków z rozbitych kadłubów.",
				},
				waters: () => [],
				obstacles: () =>
					block("hulk", [
						[1680, 640, 820, 100],
						[1680, 1520, 820, 100],
						[1080, 1080, 100, 460],
						[2280, 1080, 100, 460],
						[1180, 330, 360, 80],
						[2180, 1830, 360, 80],
						[760, 1080, 80, 300],
						[2600, 1080, 80, 300],
						[1680, 1080, 220, 90],
					]),
				ores: [[1680, 880, 5200], [1680, 1290, 5200], [1350, 1080, 4200], [2010, 1080, 4200], [560, 1080, 4000], [2800, 1080, 4000]],
				gasFields: [[880, 640, 2400], [2480, 1520, 2400], [1680, 420, 2000], [1680, 1740, 2000]],
				crystalFields: [[1350, 820, 1500], [2010, 1340, 1500], [2480, 640, 1200], [880, 1520, 1200]],
			},
		};
		for (const [id, map] of Object.entries(MORE)) {
			FRONTIER_MAPS[id] = map;
			MISSIONS[id] = { ...map.mission, objective: "Zniszcz stację dowodzenia wroga." };
		}
		// The look of the first orbit (the gas giant Kharon) — the defaults of the art.
		MISSIONS.orbit.look = { planet: "gas", rocks: "rock", rings: "far", comet: true, convoys: true, derelict: true, ice: true };

		const old = {};
		for (const k of ["configureMission", "configureSkirmish", "applyScenarioModifiers", "spawn", "productionType", "developmentRequirement", "enqueue", "damage", "applyDamage", "tick", "unitName", "entityName", "aiPickUnit", "canTarget", "population", "movementFactor", "serialize", "accuracy", "researchStatus", "stormEffects"]) old[k] = Game.prototype[k];
		// Meteor shields: a research of the laboratory, on the orbit only.
		RTS.RESEARCH.meteorShield = {
			name: "Osłony przeciwmeteorytowe",
			metal: 180,
			gas: 40,
			crystals: 30,
			time: 30,
			building: "lab",
			description: "Na orbicie: pola siłowe nad statkami i stacjami odbijają odłamki — obrażenia od deszczu asteroid mniejsze o 80%.",
		};
		const baseFromSave = Game.fromSave;
		// The pirates' plans travel with the save.
		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			if (state.pirates) g.pirates = { ...state.pirates };
			return g;
		};
		const weatherGetter = Object.getOwnPropertyDescriptor(Game.prototype, "weather").get,
			nightGetter = Object.getOwnPropertyDescriptor(Game.prototype, "night").get;
		const isSpace = (g) => !!MISSIONS[g.missionId]?.space;

		// A ground unit refitted as the ship of its class: same share of health, same faction factor.
		function refit(g, e) {
			const to = SHIP_OF[e.type];
			if (!to) return;
			const factor = (e.maxHp || TYPES[e.type].hp) / TYPES[e.type].hp,
				share = e.hp / (e.maxHp || TYPES[e.type].hp);
			e.type = to;
			e.maxHp = TYPES[to].hp * factor;
			e.hp = e.maxHp * share;
			e.shield = TYPES[to].shield;
			e.path = [];
		}
		// Space has no wildlife (team 2; the guardians of an expedition's artifact stay) and only ships
		// among the fighting units.
		function clearSpace(g) {
			g.entities = g.entities.filter((e) => e.team !== 2 || e.guardian || TYPES[e.type]?.pirate);
			for (const e of g.entities) refit(g, e);
		}

		Object.defineProperty(Game.prototype, "space", {
			configurable: true,
			get() {
				return isSpace(this);
			},
		});
		// Space weather (0.140): ion storms in the same rhythm as the storms on planets (and the same scenario
		// settings, warnings and forecast with weather monitoring). Sensors go astray (accuracy, as in any
		// storm), but nothing slows a ship in vacuum, and shields do not recharge in the storm.
		Object.defineProperty(Game.prototype, "weather", {
			configurable: true,
			get() {
				const w = weatherGetter.call(this);
				if (!isSpace(this)) return w;
				// The storm now (or the next one, between storms) by its number in the series.
				const n = w.remaining > 0 ? w.cycle : w.cycle + 1,
					list = MISSIONS[this.missionId].storms || SPACE.storms,
					kind = list[((n % list.length) + list.length) % list.length];
				return { ...w, kind, name: MISSIONS[this.missionId].stormNames?.[kind] || SPACE[kind].name };
			},
		});
		Object.defineProperty(Game.prototype, "night", {
			configurable: true,
			get() {
				return isSpace(this) ? 0 : nightGetter.call(this);
			},
		});

		Object.assign(Game.prototype, {
			configureMission() {
				old.configureMission.call(this);
				if (isSpace(this)) clearSpace(this);
			},
			configureSkirmish(input = {}) {
				const result = old.configureSkirmish.call(this, input);
				if (isSpace(this)) {
					clearSpace(this);
					this.placePirates();
				}
				return result;
			},
			serialize() {
				return { ...old.serialize.call(this), pirates: this.pirates || null };
			},
			// Pirate hideouts (0.141): on open ground as far as possible from every base, apart from each other.
			placePirates() {
				const P = SPACE.pirates,
					level = P[this.scenario?.fauna] || P.normal,
					bases = this.entities.filter((e) => e.type === "hq"),
					spots = [];
				for (let n = 0; n < level.bases; n++) {
					let best = null;
					for (let y = 260; y < this.H - 260; y += 60)
						for (let x = 260; x < this.W - 260; x += 60) {
							const p = { x, y };
							if (this.blocked(x, y, 70) || [...this.ores, ...this.gasFields, ...this.crystalFields].some((o) => dist(o, p) < 160) || (this.nodes || []).some((o) => dist(o, p) < 180)) continue;
							const score = Math.min(...bases.map((b) => dist(b, p)), ...spots.map((s) => dist(s, p) * 0.8));
							if (!best || score > best.score) best = { x, y, score };
						}
					if (!best) break;
					spots.push(best);
					const hideout = this.spawn("pirateBase", 2, best.x, best.y);
					hideout.crewMax = level.crew;
					hideout.buildClock = 4;
					for (let i = 0; i < Math.min(2, level.crew); i++) {
						const a = (i / 2) * Math.PI * 2,
							f = this.spawn("pirate", 2, best.x + Math.cos(a) * 80, best.y + Math.sin(a) * 80);
						f.hideout = hideout.id;
					}
				}
				this.pirates = { nextRaid: this.time + P.first, turn: 0, every: level.raid };
			},
			// The pirates' minds: hideouts build their crews, a band goes raiding now and then — at the miners or
			// an outlying station of each side in turn — and comes home when the raid drags on or it is battered.
			pirateTick(dt) {
				const P = SPACE.pirates,
					state = this.pirates;
				if (!state) return;
				const hideouts = this.entities.filter((e) => e.type === "pirateBase" && e.hp > 0);
				for (const h of hideouts) {
					const crew = this.entities.filter((e) => e.type === "pirate" && e.hp > 0 && e.hideout === h.id);
					h.buildClock = (h.buildClock ?? P.build) - dt;
					if (crew.length < (h.crewMax || 4) && h.buildClock <= 0) {
						const a = this.rand() * Math.PI * 2,
							f = this.spawn("pirate", 2, h.x + Math.cos(a) * 70, h.y + Math.sin(a) * 70);
						f.hideout = h.id;
						h.buildClock = P.build;
					}
				}
				const pirates = this.entities.filter((e) => e.type === "pirate" && e.hp > 0);
				for (const f of pirates) {
					const home = this.get(f.hideout);
					if (f.raidUntil != null && (this.time > f.raidUntil || f.hp < f.maxHp * P.retreat || !home)) {
						f.raidUntil = null;
						if (home) {
							f.order = { kind: "move", x: home.x, y: home.y };
							f.path = this.pathTo(f, home);
						}
					}
				}
				if (this.time < state.nextRaid) return;
				state.nextRaid = this.time + state.every;
				const sides = [...new Set(this.entities.filter((e) => e.type === "hq" && e.hp > 0 && e.team !== 2).map((e) => e.team))].sort((a, b) => a - b);
				if (!sides.length || !hideouts.length) return;
				const team = sides[state.turn++ % sides.length];
				for (const h of hideouts) {
					const band = pirates.filter((f) => f.hideout === h.id && f.raidUntil == null).sort((a, b) => b.hp - a.hp);
					if (band.length < 2) continue;
					const goal =
						this.entities.filter((e) => e.team === team && e.hp > 0 && e.type === "worker").sort((a, b) => dist(a, h) - dist(b, h))[0] ||
						this.entities.filter((e) => e.team === team && e.hp > 0 && !TYPES[e.type].speed && e.type !== "wall" && e.type !== "gate").sort((a, b) => dist(a, h) - dist(b, h))[0];
					if (!goal) continue;
					// The band, all but one who keeps watch at the hideout.
					for (const f of band.slice(0, Math.max(1, band.length - 1))) {
						f.order = { kind: "attackMove", x: goal.x, y: goal.y };
						f.path = this.pathTo(f, goal);
						f.raidUntil = this.time + P.raidTime;
					}
					if (this.isHuman(team)) this.as(team, () => this.notify("Piraci ruszają na najazd na Twoją kolonię!", "alarm"));
				}
			},
			applyScenarioModifiers() {
				old.applyScenarioModifiers?.call(this);
				if (isSpace(this)) clearSpace(this);
			},
			spawn(type, team, x, y) {
				if (isSpace(this) && SHIP_OF[type]) type = SHIP_OF[type];
				const e = old.spawn.call(this, type, team, x, y);
				if (TYPES[type]?.shield) e.shield = TYPES[type].shield;
				return e;
			},
			productionType(type) {
				if (type === "corvette" || type === "frigate") return "barracks";
				if (type === "lancer" || type === "cruiser" || type === "carrier") return "factory";
				return old.productionType.call(this, type);
			},
			developmentRequirement(type) {
				if (isSpace(this) && GROUND.has(type)) return "Niedostępne na orbicie — stocznie budują statki";
				if (SHIPS.includes(type) && !isSpace(this)) return "Statki walczą tylko na orbicie";
				if ((type === "cruiser" || type === "carrier") && !this.ready("lab")) return "Wymaga ukończonego laboratorium orbitalnego";
				if (type === "fighter") return "Myśliwce startują z lotniskowca";
				return old.developmentRequirement.call(this, type);
			},
			enqueue(type, preferredId = null) {
				if (TYPES[type]?.speed && (SHIPS.includes(type) || GROUND.has(type) || type === "fighter")) {
					const requirement = this.developmentRequirement(type);
					if (requirement) {
						this.notify(this.unitName(type) + ": " + requirement);
						return false;
					}
				}
				return old.enqueue.call(this, type, preferredId);
			},
			damage(attacker, target) {
				let n = old.damage.call(this, attacker, target);
				const bonus = SPACE.bonus[attacker.type];
				if (bonus) n *= bonus[target.type] ?? (!TYPES[target.type]?.speed ? (bonus.building ?? 1) : 1);
				if (TYPES[target.type]?.ship) n *= this.spaceCover(target);
				return n;
			},
			// An ion storm does not slow ships (the engine slows every unit in a storm: that share undone).
			movementFactor(e) {
				const n = old.movementFactor.call(this, e);
				if (!isSpace(this)) return n;
				const storm = 1 - this.weather.intensity * 0.35 * (this.upgradeOf(e.team, "mobility") ? 0.25 : 1);
				return storm > 0.01 ? n / storm : n;
			},
			// Whether shields are blocked by an ion storm now.
			ionStorm() {
				const w = this.weather;
				return isSpace(this) && w.kind === "ion" && w.intensity > SPACE.ion.shields;
			},
			// Only the ion storm disturbs the sensors (solar storms and asteroid showers leave aim alone).
			accuracy(e) {
				const w = this.weather;
				if (isSpace(this) && w.kind !== "ion" && w.intensity > 0) return 1;
				return old.accuracy.call(this, e);
			},
			// The warning of a space storm says what it will really do (nothing slows down in vacuum).
			stormEffects(w) {
				if (!isSpace(this)) return old.stormEffects.call(this, w);
				return w.kind === "ion"
					? "Celność spadnie, osłony statków nie będą się odnawiać."
					: w.kind === "solar"
						? "Promieniowanie wyczerpie osłony statków."
						: "Odłamki zaczną uderzać w statki i stacje — chronią osłony przeciwmeteorytowe.";
			},
			researchStatus(kind) {
				if (kind === "meteorShield" && !isSpace(this)) return { allowed: false, state: "locked", required: "lab", progress: 0, reason: "Tylko na orbicie" };
				return old.researchStatus.call(this, kind);
			},
			// The storms' own effects each tick: a solar storm drains shields; an asteroid shower that lasts
			// strikes at random places — everyone is hit, pirates included.
			spaceStormTick(dt) {
				const w = this.weather;
				if (!(w.intensity > 0.05)) return;
				if (w.kind === "solar") {
					const k = SPACE.solar.drain * w.intensity * dt;
					for (const e of this.entities) {
						const cap = TYPES[e.type]?.shield;
						if (cap && e.hp > 0 && e.shield > 0) e.shield = Math.max(0, e.shield - cap * k);
					}
				}
				if (w.kind === "meteor") {
					const M = SPACE.meteor,
						since = (w.duration || 55) - w.remaining;
					if (since < M.after || w.intensity < 0.4) return;
					this.meteorClock = (this.meteorClock || 0) - dt;
					while (this.meteorClock <= 0) {
						this.meteorClock += M.every / w.intensity;
						const p = { x: 60 + this.rand() * (this.W - 120), y: 60 + this.rand() * (this.H - 120) };
						this.effects.push({ kind: "explosion", x: p.x, y: p.y, size: 34, life: 0.55, maxLife: 0.55, space: true, lift: 14, meteor: true });
						let hurtHuman = null;
						for (const e of this.entities) {
							if (e.hp <= 0 || !TYPES[e.type]) continue;
							const d = dist(e, p);
							if (d > M.radius + TYPES[e.type].radius) continue;
							const shielded = e.team !== 2 && this.upgradeOf(e.team, "meteorShield");
							const amount = M.damage * (1 - Math.min(1, d / (M.radius + TYPES[e.type].radius)) * 0.6) * (shielded ? 1 - M.shield : 1);
							if (this.isHuman(e.team) && !shielded) hurtHuman = e.team;
							this.applyDamage(null, e, amount);
						}
						if (hurtHuman != null && this.meteorWarned !== w.cycle) {
							this.meteorWarned = w.cycle;
							this.as(hurtHuman, () => this.notify("Deszcz asteroid uderza w Twoje siły! Osłony przeciwmeteorytowe zbadasz w laboratorium.", "alarm"));
						}
					}
				}
			},
			canTarget(a, b) {
				if (TYPES[a.type]?.ship && TYPES[b.type]?.flying) return old.canTarget.call(this, a, { ...b, type: "trooper" });
				return old.canTarget.call(this, a, b);
			},
			// Fighters do not take up places in the army.
			population(team) {
				return old.population.call(this, team) - this.entities.filter((e) => e.team === team && e.hp > 0 && e.type === "fighter").length;
			},
			// Carriers: launch fighters up to the wing, send them at enemies near the carrier, keep them circling
			// it otherwise; fighters whose carrier is gone run out of fuel.
			carrierTick(dt) {
				const C = SPACE.carrier;
				for (const c of this.entities) {
					if (c.type !== "carrier" || c.hp <= 0 || c.constructionLeft) continue;
					c.wing = (c.wing || []).filter((id) => this.get(id)?.hp > 0);
					c.launchClock = (c.launchClock ?? 3) - dt;
					if (c.wing.length < C.wing && c.launchClock <= 0) {
						const a = (c.angle || 0) + Math.PI,
							f = this.spawn("fighter", c.team, c.x + Math.cos(a) * 30, c.y + Math.sin(a) * 30);
						f.mothership = c.id;
						f.angle = c.angle || 0;
						c.wing.push(f.id);
						c.launchClock = C.launch;
					}
					c.wingClock = (c.wingClock || 0) - dt;
					if (c.wingClock > 0) continue;
					c.wingClock = 0.5;
					const foes = this.entities.filter((e) => e.hp > 0 && e.team !== 2 && e.team !== c.team && !this.allied?.(c.team, e.team) && dist(c, e) < C.reach && this.isVisibleTo(c.team, e.x, e.y));
					c.wing.forEach((id, i) => {
						const f = this.get(id);
						if (!f) return;
						const near = foes.filter((e) => this.canTarget(f, e)).sort((p, q) => dist(f, p) - dist(f, q))[0];
						if (near) {
							if (f.order?.kind !== "attack" || f.order.targetId !== near.id) {
								f.order = { kind: "attack", targetId: near.id };
								f.target = near.id;
								f.path = this.pathTo(f, near);
							}
						} else {
							const t = this.time * 0.9 + (i / Math.max(1, c.wing.length)) * Math.PI * 2,
								p = { x: c.x + Math.cos(t) * C.orbit, y: c.y + Math.sin(t) * C.orbit };
							f.order = { kind: "move", x: p.x, y: p.y };
							f.target = null;
							f.path = this.pathTo(f, p);
						}
					});
				}
				for (const f of this.entities) {
					if (f.type !== "fighter" || f.hp <= 0) continue;
					const mother = this.get(f.mothership);
					if (mother?.hp > 0) continue;
					f.orphanAt ??= this.time;
					if (this.time - f.orphanAt > C.orphan) this.applyDamage(null, f, 1e6);
				}
			},
			// Inside a nebula cloud (null elsewhere).
			inNebula(e) {
				if (!isSpace(this)) return null;
				return (this.gasFields || []).find((f) => dist(f, e) < SPACE.nebula.radius) || null;
			},
			// Next to an asteroid field (space only).
			byAsteroids(e) {
				if (!isSpace(this)) return false;
				const pad = (TYPES[e.type]?.radius || 10) + SPACE.asteroids.reach;
				return (this.obstacles || []).some((o) => e.x > o.x - pad && e.x < o.x + o.w + pad && e.y > o.y - pad && e.y < o.y + o.h + pad);
			},
			// The damage factor a ship gets from the terrain round it: nebula and asteroid cover multiply.
			spaceCover(e) {
				return (this.inNebula(e) ? SPACE.nebula.cover : 1) * (this.byAsteroids(e) ? SPACE.asteroids.cover : 1);
			},
			// The ship's shield takes the hit first; a ripple shows where it struck.
			applyDamage(attacker, target, amount) {
				if (target.hp > 0 && (target.shield || 0) > 0 && Number.isFinite(amount) && amount > 0) {
					const absorbed = Math.min(target.shield, amount);
					target.shield -= absorbed;
					amount -= absorbed;
					target.shieldHit = this.time;
					if (!(target.shieldFxAt > this.time - 0.15)) {
						target.shieldFxAt = this.time;
						const r = TYPES[target.type].radius + 8,
							hx = attacker ? attacker.x - target.x : 0,
							hy = attacker ? attacker.y - target.y : -1,
							hl = Math.hypot(hx, hy) || 1;
						this.fx("shieldHit", target.x + (hx / hl) * r, target.y + (hy / hl) * r, { gx: target.x, gy: target.y, reach: r, ship: true });
					}
				}
				const alive = target.hp > 0;
				old.applyDamage.call(this, attacker, target, amount);
				// A bounty for a pirate ship or hideout, to the side that destroyed it.
				const bounty = SPACE.pirates.bounty[target.type];
				if (alive && target.hp <= 0 && bounty && attacker && attacker.team !== 2) {
					if (this.isHuman(attacker.team))
						this.as(attacker.team, () => {
							this.credits += bounty;
							this.notify(`${TYPES[target.type].name} zniszczony — nagroda ${bounty} metalu.`, "ready");
						});
					else if (this.enemyAi?.teams?.[attacker.team]) this.enemyAi.teams[attacker.team].metal = (this.enemyAi.teams[attacker.team].metal || 0) + bounty;
				}
				// In space a ship or station blows up at its own height (3D board): the explosion knows it.
				if (alive && target.hp <= 0 && isSpace(this)) {
					const s = TYPES[target.type],
						ef = this.effects.findLast?.((f) => f.kind === "explosion" && f.x === target.x && f.y === target.y);
					if (ef) Object.assign(ef, { space: true, lift: s.flying ? 90 : s.ship ? SPACE.hover : !s.speed ? s.radius * 0.8 + 10 + s.radius * 0.4 : target.type === "worker" ? 22 : 0 });
				}
			},
			tick(dt) {
				old.tick.call(this, dt);
				// No tread marks in space: ships and drones fly.
				if (isSpace(this) && this.tracks?.length) this.tracks.length = 0;
				// Nor craters: there is no ground to scorch.
				if (isSpace(this) && this.craters?.length) this.craters.length = 0;
				if (this.result) return;
				this.spaceStormTick(dt);
				this.carrierTick(dt);
				this.pirateTick(dt);
				const c = SPACE.shield;
				// Ion and solar storms: shields do not recharge (a solar storm wears them down besides).
				const w = this.weather;
				if (this.ionStorm() || (isSpace(this) && w.kind === "solar" && w.intensity > SPACE.ion.shields)) return;
				for (const e of this.entities) {
					const cap = TYPES[e.type]?.shield;
					if (!cap || e.hp <= 0 || (e.shield ?? cap) >= cap) continue;
					if (this.time - (e.shieldHit ?? -1e9) < c.delay || this.inNebula(e)) continue;
					e.shield = Math.min(cap, (e.shield || 0) + cap * c.rate * dt);
				}
			},
			unitName(type, team = this.me) {
				return (isSpace(this) && RTS.SPACE_NAMES[type]) || old.unitName.call(this, type, team);
			},
			entityName(e) {
				return (isSpace(this) && e.faction !== "swarm" && RTS.SPACE_NAMES[e.type]) || old.entityName.call(this, e);
			},
			// The commander in space builds ships: corvettes and frigates at the light shipyard, destroyers
			// and cruisers at the heavy one, answering what it has seen of the enemy fleet.
			aiPickUnit(T, L, producer) {
				if (!isSpace(this) || !["barracks", "factory"].includes(producer.type)) return old.aiPickUnit.call(this, T, L, producer);
				const enemy = this.aiPlayerArmy(T.team),
					share = (types) => (enemy.length ? enemy.filter((e) => types.includes(e.type)).length / enemy.length : 0),
					small = share(["corvette", "interceptor", "bomber", "drone"]),
					big = share(["lancer", "cruiser"]),
					mid = share(["frigate"]),
					c = L.counter,
					weights =
						producer.type === "barracks"
							? { corvette: 3 + 4 * c * big, frigate: 2.5 + 5 * c * small }
							: {
									lancer: 3 + 5 * c * (big + mid),
									cruiser: L.heavyAt != null && this.time >= L.heavyAt ? 1.5 + 2 * c * small : 0,
									// The carrier answers big ships (its fighters wear them down) once heavy units come.
									carrier: L.heavyAt != null && this.time >= L.heavyAt ? 1 + 2.5 * c * big : 0,
								},
					options = Object.keys(weights).filter((t) => weights[t] > 0),
					sum = options.reduce((n, t) => n + weights[t], 0);
				let roll = this.rand() * sum;
				for (const t of options) if ((roll -= weights[t]) <= 0) return t;
				return options.at(-1) || null;
			},
		});
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
