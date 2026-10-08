(function (root) {
	"use strict";
	const W = 3360,
		H = 2160,
		CELL = 40,
		CRATER_LIFE = 300;
	// Shared shoreline geometry keeps drawing and navigation in agreement.
	function waterRadius(w, angle) {
		const phase = w.x * 0.003 + w.y * 0.005;
		return (
			0.82 +
			0.1 * Math.sin(angle * 3 + phase) +
			0.07 * Math.cos(angle * 5 - phase)
		);
	}
	function waterContains(w, x, y, pad = 0) {
		const nx = (x - w.x) / (w.rx + pad),
			ny = (y - w.y) / (w.ry + pad);
		return Math.hypot(nx, ny) < waterRadius(w, Math.atan2(ny, nx));
	}
	// Does the segment a→b pass through the open box |x - cx| < hx, |y - cy| < hy (in the box's own frame, turned by
	// angle)? The exact test for routes past rocks and walls: sampling missed segments that cut a padded corner.
	function segmentCrossesBox(a, b, cx, cy, hx, hy, angle = 0) {
		const c = Math.cos(angle),
			s = Math.sin(angle),
			ax = (a.x - cx) * c + (a.y - cy) * s,
			ay = -(a.x - cx) * s + (a.y - cy) * c,
			dx = (b.x - a.x) * c + (b.y - a.y) * s,
			dy = -(b.x - a.x) * s + (b.y - a.y) * c;
		let t0 = 0,
			t1 = 1;
		for (const [p, d, h] of [
			[ax, dx, hx],
			[ay, dy, hy],
		]) {
			if (Math.abs(d) < 1e-9) {
				if (Math.abs(p) >= h) return false;
				continue;
			}
			const u = (-h - p) / d,
				v = (h - p) / d;
			t0 = Math.max(t0, Math.min(u, v));
			t1 = Math.min(t1, Math.max(u, v));
			if (t0 >= t1) return false;
		}
		return true;
	}
	const TYPES = {
		trooper: {
			name: "Piechota",
			hp: 100,
			speed: 110,
			range: 160,
			damage: 12,
			cooldown: 0.7,
			cost: 60,
			build: 3,
			radius: 10,
		},
		rocket: {
			name: "Rakietowiec",
			hp: 85,
			speed: 85,
			range: 225,
			damage: 29,
			cooldown: 1.65,
			cost: 100,
			build: 5,
			radius: 11,
		},
		tank: {
			name: "Czołg zwiadowczy",
			hp: 360,
			speed: 78,
			range: 190,
			damage: 25,
			cooldown: 1.05,
			cost: 180,
			build: 7,
			radius: 20,
		},
		heavy: {
			name: "Ciężka maszyna",
			hp: 950,
			speed: 52,
			range: 220,
			damage: 58,
			cooldown: 1.6,
			cost: 420,
			build: 18,
			radius: 25,
		},
		artillery: {
			name: "Artyleria",
			hp: 210,
			speed: 58,
			range: 420,
			damage: 95,
			cooldown: 3.8,
			cost: 340,
			build: 15,
			radius: 20,
		},
		beast: {
			name: "Drapieżnik",
			hp: 220,
			speed: 95,
			range: 28,
			damage: 20,
			cooldown: 1.1,
			radius: 8,
		},
		wall: {
			name: "Mur",
			hp: 1300,
			speed: 0,
			range: 0,
			damage: 0,
			cooldown: 1,
			cost: 45,
			radius: 24,
			construction: 6,
		},
		gate: {
			name: "Brama",
			hp: 1000,
			speed: 0,
			range: 0,
			damage: 0,
			cooldown: 1,
			cost: 100,
			radius: 35,
			construction: 10,
		},
		hq: {
			name: "Centrum dowodzenia",
			hp: 2600,
			speed: 0,
			range: 260,
			damage: 17,
			cooldown: 0.85,
			radius: 65,
		},
		turret: {
			name: "Wieżyczka obronna",
			hp: 550,
			speed: 0,
			range: 240,
			damage: 20,
			cooldown: 0.65,
			cost: 150,
			radius: 22,
			construction: 8,
		},
		worker: {
			name: "Robot górniczy",
			hp: 100,
			speed: 105,
			range: 0,
			damage: 0,
			cooldown: 1,
			cost: 70,
			build: 4,
			radius: 12,
		},
		barracks: {
			name: "Koszary",
			hp: 1000,
			speed: 0,
			range: 0,
			damage: 0,
			cooldown: 1,
			cost: 200,
			radius: 43,
			construction: 12,
		},
		depot: {
			name: "Magazyn polowy",
			hp: 700,
			speed: 0,
			range: 0,
			damage: 0,
			cooldown: 1,
			cost: 120,
			radius: 32,
			construction: 10,
		},
		extractor: {
			name: "Ekstraktor gazu",
			hp: 800,
			speed: 0,
			range: 0,
			damage: 0,
			cooldown: 1,
			cost: 160,
			radius: 30,
			construction: 12,
		},
		reactor: {
			name: "Reaktor",
			hp: 850,
			speed: 0,
			range: 0,
			damage: 0,
			cooldown: 1,
			cost: 180,
			radius: 34,
			construction: 14,
		},
		lab: {
			name: "Laboratorium",
			hp: 800,
			speed: 0,
			range: 0,
			damage: 0,
			cooldown: 1,
			cost: 220,
			radius: 38,
			construction: 16,
		},
		factory: {
			name: "Fabryka pojazdów",
			hp: 1500,
			speed: 0,
			range: 0,
			damage: 0,
			cooldown: 1,
			cost: 320,
			radius: 55,
			construction: 18,
		},
	};
	const RESEARCH = {
		meteorology: {
			name: "Monitoring pogody",
			metal: 160,
			gas: 30,
			crystals: 25,
			time: 25,
			building: "lab",
		},
		guidance: {
			name: "Celowanie adaptacyjne",
			metal: 240,
			gas: 60,
			crystals: 50,
			time: 35,
			building: "lab",
		},
		mobility: {
			name: "Napędy terenowe",
			metal: 200,
			gas: 50,
			crystals: 35,
			time: 30,
			building: "lab",
		},
		weapons: {
			name: "Broń plazmowa",
			metal: 250,
			gas: 0,
			time: 25,
			building: "factory",
		},
		armor: {
			name: "Pancerz kompozytowy",
			metal: 250,
			gas: 0,
			time: 25,
			building: "factory",
		},
		cargo: {
			name: "Powiększone ładownie",
			metal: 150,
			gas: 50,
			time: 25,
			building: "depot",
		},
		efficiency: {
			name: "Stabilizacja reaktorów",
			metal: 180,
			gas: 40,
			crystals: 30,
			time: 30,
			building: "lab",
		},
		precision: {
			name: "Optyka kryształowa",
			metal: 220,
			gas: 50,
			crystals: 45,
			time: 35,
			building: "lab",
		},
	};
	const researchDescriptions = {
		meteorology:
			"Prognoza pogody i ostrzeżenie 30 sekund przed gwałtownymi zjawiskami. Monitoring wymaga działającego laboratorium.",
		guidance: "Zmniejsza o 75% karę celności powodowaną przez pogodę.",
		mobility:
			"Zmniejsza o 75% spowolnienie jednostek powodowane przez pogodę.",
		weapons: "Zwiększa obrażenia armii o 25%.",
		armor: "Zmniejsza otrzymywane obrażenia o 20%.",
		cargo: "Powiększa ładownie robotów z 30 do 60 jednostek rudy lub kryształów.",
		efficiency: "Zwiększa produkcję mocy każdego reaktora z 60 do 90.",
		precision: "Zwiększa obrażenia o 15%. Współdziała z ulepszeniem broni.",
	};
	for (const [id, description] of Object.entries(researchDescriptions))
		RESEARCH[id].description = description;
	const MISSIONS = {
		solar: {
			name: "Słoneczna Dolina",
			planet: "Helion II",
			biome: "dust",
			sunny: true,
			description:
				"Jasne słońce oświetla złote równiny Helionu, porośnięte niskimi drzewami i krzewami. Okresowe burze pustynne niosą tumany piasku. Skaliste grzbiety osłaniają środkowy szlak, a oazy i bogate złoża na wschodzie zachęcają do ekspansji. Zabezpiecz przekaźniki i uderz na bazę Dominium.",
			objective: "Zniszcz centrum Dominium.",
			mirror: "none",
		},
		horizon: {
			name: "Cichy Horyzont",
			planet: "Khepri IV",
			biome: "dust",
			description:
				"Skaliste pogranicze. Rozwiń bazę i zniszcz centrum Dominium.",
			objective: "Zniszcz centrum Dominium.",
			mirror: "none",
		},
		frost: {
			name: "Biały Przesmyk",
			planet: "Nivalis",
			biome: "ice",
			description:
				"Lodowe grzbiety dzielą szlaki. Baza startuje na południowym wschodzie; centralne złoża wymagają ochrony.",
			objective: "Zniszcz centrum Dominium.",
			mirror: "x",
		},
		ember: {
			name: "Popielny Szlak",
			planet: "Vulkan IX",
			biome: "ash",
			description:
				"Bazaltowe pola i wydłużone przesmyki. Więcej gazu, mniejsze złoża rudy; front biegnie z północy na południe.",
			objective: "Zniszcz centrum Dominium.",
			mirror: "y",
		},
		colony2: {
			name: "Szlak przez lód",
			planet: "Nivalis",
			biome: "ice",
			campaign: true,
			requires: "colony1",
			description:
				"Sygnał z Khepri ujawnił trasę konwoju. Zabezpiecz lodowy szlak, uruchom dwa magazyny zaopatrzenia i odbierz Dominium port przeładunkowy.",
			objective:
				"Utrzymaj 2 przekaźniki, ukończ 2 magazyny i zniszcz wrogie centrum.",
			mirror: "x",
		},
		colony3: {
			name: "Serce Dominium",
			planet: "Vulkan IX",
			biome: "ash",
			campaign: true,
			requires: "colony2",
			description:
				"Dzięki lodowemu szlakowi Kolonie docierają do kuźni Dominium. Wystaw ciężką maszynę oraz artylerię, odetnij łączność i przełam ostatni bastion.",
			objective:
				"Utrzymaj wszystkie przekaźniki, posiadaj ciężką maszynę i artylerię oraz zniszcz wrogie centrum.",
			mirror: "y",
		},
		colony1: {
			name: "Pierwszy Sygnał",
			planet: "Khepri IV",
			biome: "dust",
			campaign: true,
			description:
				"Wolne Kolonie: Odzyskany Świt. Ekspedycja ląduje przy opuszczonej stacji. Przywróć łączność, uruchom reaktor i laboratorium, a następnie usuń garnizon Dominium.",
			objective:
				"Utrzymaj 2 przekaźniki, ukończ reaktor i laboratorium oraz zniszcz wrogie centrum.",
			mirror: "none",
		},
	};
	const CRYSTAL_FIELDS = () => [
		{ id: 1, x: 350, y: 1320, amount: 600 },
		{ id: 2, x: 850, y: 700, amount: 900 },
		{ id: 3, x: 1730, y: 900, amount: 1200 },
	];
	const GAS_FIELDS = () => [
		{ id: 1, x: 80, y: 1080, amount: 1800 },
		{ id: 2, x: 760, y: 1010, amount: 2400 },
		{ id: 3, x: 1120, y: 490, amount: 3000 },
	];
	const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
	// WAL-01 (0.146): rocks block direct fire. Rock obstacles (no kind, rock, outcrop, spire, mesa) stand in the
	// way; wrecks, ruins, groves and the like, and the asteroids and hulks of space, do not. Artillery and
	// grenades fly over in an arc; shots of and at aircraft pass above.
	const FIRE_BLOCKERS = new Set(["rock", "outcrop", "spire", "mesa"]),
		INDIRECT_FIRE = new Set(["artillery", "grenadier"]);
	// Does the segment a→b cross the rectangle r shrunk by `inset` on every side (Liang–Barsky clipping)?
	function crossesRect(a, b, r, inset) {
		const x0 = r.x + inset,
			x1 = r.x + r.w - inset,
			y0 = r.y + inset,
			y1 = r.y + r.h - inset;
		if (x0 >= x1 || y0 >= y1) return false;
		const dx = b.x - a.x,
			dy = b.y - a.y;
		let t0 = 0,
			t1 = 1;
		for (const [p, q] of [
			[-dx, a.x - x0],
			[dx, x1 - a.x],
			[-dy, a.y - y0],
			[dy, y1 - a.y],
		]) {
			if (p === 0) {
				if (q < 0) return false;
				continue;
			}
			const t = q / p;
			if (p < 0) {
				if (t > t1) return false;
				if (t > t0) t0 = t;
			} else {
				if (t < t0) return false;
				if (t < t1) t1 = t;
			}
		}
		return t0 <= t1;
	}
	// Saves before map sizes (version < 7) always used the medium map.
	const mapW = (state) =>
		Number.isInteger(state?.W) &&
		state.W % CELL === 0 &&
		state.W >= 1600 &&
		state.W <= 6400
			? state.W
			: W;
	const mapH = (state) =>
		Number.isInteger(state?.H) &&
		state.H % CELL === 0 &&
		state.H >= 1000 &&
		state.H <= 4200
			? state.H
			: H;
	const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
	// The state of one human player (a "side"): economy, research, queues, fog of war, groups, alerts and
	// messages. A single-player game has one side (team 0); a network game one per human. The old fields
	// (game.credits, game.queue, game.explored…) read and write the side of the acting player (game.me).
	const SIDE_FIELDS = ["credits", "income", "mined", "economyHistory", "economySince", "gas", "crystals", "upgrades", "research", "queue", "explored", "visible", "groups", "captured", "baseAlert", "nextAlertAt", "events", "soundEvents", "kills", "formation"];
	const newSide = () => ({ credits: 0, income: 0, mined: 0, economyHistory: [], economySince: 0, gas: 0, crystals: 0, upgrades: {}, research: null, queue: [], explored: [], visible: [], groups: {}, captured: false, baseAlert: null, nextAlertAt: 0, events: [], soundEvents: undefined, kills: 0, formation: undefined });
	class Game {
		constructor(seed = 42, missionId = "horizon") {
			// Human sides: team 0 alone in a single-player game; set with setHumans() for a network game.
			this.humans = [0];
			this.sides = { 0: newSide() };
			// The player whose view the interface shows (and who acts when no one else is acting).
			this.viewer = 0;
			this.seed = seed;
			// Map size belongs to the game; scenarios may resize it (see configureSkirmish).
			this.W = W;
			this.H = H;
			this.nextId = 1;
			this.time = 0;
			this.credits = 400;
			this.income = 8;
			this.entities = [];
			this.effects = [];
			this.queue = [];
			this.events = [];
			this.result = null;
			this.wave = 0;
			this.nextWave = 65;
			this.kills = 0;
			this.captured = false;
			this.obstacles = [
				{ x: 740, y: 370, w: 190, h: 160 },
				{ x: 1180, y: 850, w: 210, h: 140 },
				{ x: 390, y: 570, w: 140, h: 170 },
				{ x: 1600, y: 660, w: 175, h: 150 },
				{ x: 950, y: 1100, w: 120, h: 170 },
				{ x: 1230, y: 160, w: 140, h: 180 },
			];
			this.nodes = [
				{
					x: 610,
					y: 960,
					owner: -1,
					progress: 0,
					capturing: -1,
					name: "AUREK",
				},
				{
					x: 1090,
					y: 650,
					owner: -1,
					progress: 0,
					capturing: -1,
					name: "BESH",
				},
				{
					x: 1580,
					y: 360,
					owner: -1,
					progress: 0,
					capturing: -1,
					name: "CRESH",
				},
			];
			this.spawn("hq", 0, 270, 1130);
			this.spawn("hq", 1, 1940, 250);
			[
				[390, 1030],
				[440, 1070],
				[395, 1120],
				[480, 1000],
			].forEach((p) => this.spawn("trooper", 0, ...p));
			this.spawn("rocket", 0, 340, 990);
			this.spawn("tank", 0, 460, 1160);
			this.spawn("turret", 1, 1820, 380);
			this.spawn("trooper", 1, 1840, 240);
			this.spawn("trooper", 1, 1930, 380);
			this.spawn("rocket", 1, 1810, 180);
			this.spawn("barracks", 0, 165, 950);
			this.ores = [
				{ id: 1, x: 130, y: 1280, amount: 4000 },
				{ id: 2, x: 660, y: 1210, amount: 3500 },
				{ id: 3, x: 1020, y: 460, amount: 4500 },
				{ id: 4, x: 1650, y: 1100, amount: 5000 },
			];
			this.mined = 0;
			this.economyHistory = [];
			this.economySince = 0;
			this.gas = 0;
			this.gasFields = GAS_FIELDS();
			this.upgrades = { weapons: false, armor: false, cargo: false };
			this.research = null;
			this.explored = new Array((this.W / CELL) * (this.H / CELL)).fill(
				0,
			);
			this.visible = new Array(this.explored.length).fill(0);
			this.fogTimer = 0;
			for (const [x, y] of [
				[160, 1190],
				[200, 1230],
			]) {
				const worker = this.spawn("worker", 0, x, y);
				this.gather([worker.id], 1);
			}
			this.updateVision();
			this.groups = {};
			this.weatherWarning = null;
			this.weatherThunder = -1;
			this.baseAlert = null;
			this.nextAlertAt = 0;
			this.missionId = Object.hasOwn(MISSIONS, missionId)
				? missionId
				: "horizon";
			this.crystals = 0;
			this.crystalFields = CRYSTAL_FIELDS();
			this.debris = [];
			this.craters = [];
			// Team alliances (2 vs 2 scenarios): team -> side leader. null = every side for itself.
			this.alliances = null;
			this.tracks = [];
			this.trackClock = 0;
			this.configureMission();
		}
		configureMission() {
			const m = MISSIONS[this.missionId];
			if (m.mirror === "x") {
				this.obstacles.push({ x: 970, y: 810, w: 140, h: 220 });
			} else if (m.mirror === "y") {
				this.obstacles[0] = { x: 700, y: 330, w: 260, h: 190 };
				this.obstacles[3] = { x: 1500, y: 610, w: 250, h: 190 };
				this.ores.forEach(
					(o) => (o.amount = Math.round(o.amount * 0.7)),
				);
				this.gasFields.forEach(
					(o) => (o.amount = Math.round(o.amount * 1.3)),
				);
			}
			if (m.mirror !== "none") {
				for (const o of [
					...this.entities,
					...this.nodes,
					...this.ores,
					...this.gasFields,
					...this.crystalFields,
				]) {
					if (m.mirror === "x") o.x = this.W - o.x;
					else o.y = this.H - o.y;
					if (o.path) o.path = [];
				}
				for (const r of this.obstacles) {
					if (m.mirror === "x") r.x = this.W - r.x - r.w;
					else r.y = this.H - r.y - r.h;
				}
			}
			this.ores.push({ id: 5, x: 2600, y: 1800, amount: 7000 });
			this.crystalFields.push({ id: 4, x: 2850, y: 1050, amount: 1800 });
			this.nodes.push({
				x: 2580,
				y: 1520,
				owner: -1,
				progress: 0,
				capturing: -1,
				name: "DORN",
			});
			this.obstacles.push(
				{ x: 2330, y: 780, w: 260, h: 150 },
				{ x: 2750, y: 1830, w: 290, h: 140 },
			);
			this.waters = [
				{ x: 2200, y: 1850, rx: 180, ry: 105 },
				{ x: 2900, y: 400, rx: 160, ry: 130 },
			];
			if (m.sunny) {
				for (const o of [
					...this.entities,
					...this.nodes.slice(0, 3),
					...this.ores.slice(0, 4),
					...this.gasFields,
					...this.crystalFields.slice(0, 3),
				]) {
					o.x += 250;
					o.y += 150;
					if (o.path) o.path = [];
				}
				this.obstacles = [
					{ x: 970, y: 620, w: 160, h: 130 },
					{ x: 1510, y: 1090, w: 210, h: 150 },
					{ x: 1780, y: 620, w: 190, h: 160 },
					{ x: 850, y: 1620, w: 240, h: 110 },
					{ x: 2440, y: 750, w: 220, h: 140 },
					{ x: 2790, y: 1880, w: 220, h: 100 },
				];
				this.waters = [
					{ x: 2080, y: 1580, rx: 170, ry: 100 },
					{ x: 2910, y: 420, rx: 140, ry: 110 },
					{ x: 1150, y: 1800, rx: 130, ry: 75 },
				];
			}
			for (const [x, y] of [
				[2480, 1130],
				[2670, 1260],
				[1700, 1740],
			]) {
				const b = this.spawn("beast", 2, x, y);
				b.home = { x, y };
				b.species =
					m.biome === "dust"
						? "Skorpion wydmowy"
						: m.biome === "ice"
							? "Wilk szronowy"
							: "Waran popielny";
			}
			if (m.campaign) {
				this.credits = 650;
				this.nextWave = 100;
			}
			this.explored.fill(0);
			this.updateVision();
		}
		get weather() {
			const biome = MISSIONS[this.missionId].biome,
				period = 210,
				first = 90,
				duration = 55;
			const elapsed = this.time - first,
				cycle = Math.floor(elapsed / period),
				phase = elapsed >= 0 ? elapsed % period : -1;
			const ramp =
				phase >= 0 && phase < duration
					? Math.min(1, phase / 12, (duration - phase) / 15)
					: 0;
			const intensity = ramp * ramp * (3 - 2 * ramp),
				until =
					elapsed < 0
						? -elapsed
						: phase < duration
							? 0
							: period - phase;
			return {
				kind:
					biome === "ice"
						? "snow"
						: biome === "ash"
							? "rain"
							: "sand",
				name:
					MISSIONS[this.missionId].weatherName ||
					(biome === "ice"
						? "Śnieżyca"
						: biome === "ash"
							? "Ulewa z piorunami"
							: "Burza piaskowa"),
				intensity,
				until,
				remaining:
					phase >= 0 && phase < duration ? duration - phase : 0,
				cycle,
				duration,
			};
		}
		// What a storm will do, for its warning (rule modules with other weather say their own).
		stormEffects() {
			return "Ruch i celność będą ograniczone.";
		}
		// Where a storm comes from: one of eight directions, fixed for each storm of a battle.
		stormFront(cycle) {
			const names = ["z północy", "z północnego wschodu", "ze wschodu", "z południowego wschodu", "z południa", "z południowego zachodu", "z zachodu", "z północnego zachodu"],
				k = (((cycle + 1) * 3 + (this.scenario?.seed || 0) + Array.from(this.missionId).reduce((n, ch) => n + ch.charCodeAt(0), 0)) % 8 + 8) % 8;
			return { angle: -Math.PI / 2 + (k * Math.PI) / 4, from: names[k] };
		}
		// The next or current storm as the player sees it: 20 s of warning, 60 s with weather monitoring.
		get stormOutlook() {
			const w = this.weather;
			if (!w) return null;
			const lead = this.upgrades.meteorology && this.ready("lab") ? 60 : 20,
				active = w.remaining > 0,
				since = active ? (w.duration || 55) - w.remaining : 0;
			return {
				kind: w.kind,
				name: w.name,
				lead,
				until: active ? 0 : w.until,
				active,
				near: !active && w.until > 0 && w.until <= lead,
				arriving: active && since < 12,
				arrived: Math.min(1, since / 12),
				intensity: w.intensity,
				...this.stormFront(active ? w.cycle : w.cycle + 1),
			};
		}
		// A short visual effect (shapes in FxArt); lifetimes per kind.
		fx(kind, x, y, extra = {}) {
			const life = { shieldHit: 0.45, heal: 0.9, sparks: 0.45, dust: 0.7, emp: 0.8, artifact: 1.2, flame: 0.3 }[kind] || 0.5;
			this.effects.push({ kind, x, y, life, maxLife: life, ...extra });
		}
		get night() {
			return Math.max(
				0,
				Math.min(
					1,
					(0.2 - Math.cos((this.time / 360) * Math.PI * 2)) / 0.65,
				),
			);
		}
		movementFactor(e) {
			return (
				1 -
				this.weather.intensity *
					0.35 *
					(this.upgradeOf(e.team, "mobility") ? 0.25 : 1)
			);
		}
		accuracy(e) {
			return TYPES[e.type].range <= 50
				? 1
				: 1 -
						this.weather.intensity *
							0.3 *
							(this.upgradeOf(e.team, "guidance") ? 0.25 : 1);
		}
		get forecast() {
			return this.upgrades.meteorology && this.ready("lab")
				? this.weather
				: null;
		}
		get power() {
			const team = this.me;
			if (this._powerFrame?.[team]) return this._powerFrame[team];
			let supply = 0,
				demand = 0;
			const draws = {
				barracks: 10,
				factory: 25,
				lab: 30,
				hangar: 25,
				workshop: 20,
				flak: 15,
				medbay: 10,
				uplink: 40,
				monolith: 20,
				shieldgen: 35,
				salvageYard: 5,
				extractor: 10,
				turret: 5,
			};
			for (const e of this.entities)
				if (e.team === team && e.hp > 0 && !e.constructionLeft) {
					if (e.type === "hq") supply += 40;
					if (e.type === "reactor" && !(this.training?.blackout > 0))
						supply += this.upgrades.efficiency ? 90 : 60;
					demand += draws[e.type] || 0;
				}
			const batteries = this.entities.filter(
				(e) =>
					e.type === "battery" &&
					e.team === team &&
					e.hp > 0 &&
					!e.constructionLeft,
			);
			const energy = batteries.reduce(
				(n, e) =>
					n +
					(Number.isFinite(e.energy) ? clamp(e.energy, 0, 900) : 0),
				0,
			);
			const discharge = Math.min(
				Math.max(0, demand - supply),
				batteries.reduce(
					(n, e) =>
						n +
						Math.min(
							30,
							(Number.isFinite(e.energy)
								? clamp(e.energy, 0, 900)
								: 0) / (this._energyStep || 0.1),
						),
					0,
				),
			);
			return {
				supply,
				demand,
				energy,
				capacity: batteries.length * 900,
				discharge,
				factor:
					demand > 0
						? Math.max(
								0.25,
								Math.min(1, (supply + discharge) / demand),
							)
						: 1,
			};
		}
		campaignReady() {
			if (this.missionId === "training")
				return this.training?.phase === 5;
			if (this.missionId === "colony2")
				return (
					this.nodes.filter((n) => n.owner === this.me).length >= 2 &&
					this.entities.filter(
						(e) =>
							e.team === this.me &&
							e.type === "depot" &&
							e.hp > 0 &&
							!e.constructionLeft,
					).length >= 2
				);
			if (this.missionId === "colony3")
				return (
					this.nodes.every((n) => n.owner === this.me) &&
					!!this.ready("heavy") &&
					!!this.ready("artillery")
				);
			return (
				this.nodes.filter((n) => n.owner === this.me).length >= 2 &&
				!!this.ready("reactor") &&
				!!this.ready("lab")
			);
		}
		gatherCrystal(ids, id) {
			return this.gather(ids, id, "crystal");
		}
		resourceFields(kind) {
			return kind === "crystal" ? this.crystalFields : this.ores;
		}
		researchBuilding() {
			return (
				this.research?.requiredBuilding ||
				RESEARCH[this.research?.kind]?.building
			);
		}
		// The acting player: whoever is being processed (see as()), otherwise the viewer.
		get me() {
			return this._actor ?? this.viewer;
		}
		// Runs fn as the given human team (its economy, fog and messages); nested calls restore the previous actor.
		as(team, fn) {
			const previous = this._actor;
			this._actor = team;
			try {
				return fn();
			} finally {
				this._actor = previous;
			}
		}
		isHuman(team) {
			return this.humans.includes(team);
		}
		sideOf(team) {
			return this.sides[team];
		}
		upgradeOf(team, kind) {
			return !!this.sides[team]?.upgrades?.[kind];
		}
		// Network game: every listed team becomes a human side, starting like team 0.
		setHumans(teams) {
			const first = this.sides[this.humans[0]];
			this.humans = [...teams];
			for (const team of teams)
				if (!this.sides[team]) {
					const side = newSide();
					side.credits = first.credits;
					side.income = first.income;
					side.upgrades = { ...first.upgrades };
					side.economySince = first.economySince;
					side.explored = new Array(first.explored.length).fill(0);
					side.visible = new Array(first.explored.length).fill(0);
					this.sides[team] = side;
				}
			this.updateVision();
		}
		// Whether a map point is seen by a team (humans have fog; computer sides see everything, as before).
		isVisibleTo(team, x, y) {
			const side = this.sides[this.isHuman(team) ? team : -1];
			return side ? !!side.visible[this.visionIndex(x, y)] : true;
		}
		// The outcome for one team: result is kept from the first human's point of view (1 on 1: the other sees it reversed).
		resultFor(team = this.viewer) {
			if (!this.result || team === this.humans[0] || !this.isHuman(team)) return this.result;
			return this.result === "victory" ? "defeat" : this.result === "defeat" ? "victory" : this.result;
		}
		rand() {
			this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
			return this.seed / 4294967296;
		}
		spawn(type, team, x, y) {
			const stats = TYPES[type];
			const e = {
				id: this.nextId++,
				type,
				team,
				x,
				y,
				hp: stats.hp,
				maxHp: stats.hp,
				angle: team ? 2.4 : -0.7,
				cooldown: this.rand() * 0.5,
				order: null,
				path: [],
				target: null,
				repath: 0,
				hit: 0,
				cargo: 0,
				work: 0,
				constructionLeft: 0,
				rally: null,
			};
			this.entities.push(e);
			return e;
		}
		get(id) {
			return this.entities.find((e) => e.id === id && e.hp > 0);
		}
		hq(team) {
			return this.entities.find(
				(e) => e.type === "hq" && e.team === team && e.hp > 0,
			);
		}
		units(team) {
			return this.entities.filter(
				(e) => e.team === team && TYPES[e.type].speed && e.hp > 0,
			);
		}
		notify(text, sound = null) {
			this.events.push(text);
			if (sound) (this.soundEvents ??= []).push(sound);
		}
		ready(type) {
			return this.entities.find(
				(e) =>
					e.team === this.me &&
					e.type === type &&
					e.hp > 0 &&
					!e.constructionLeft,
			);
		}
		productionType(type) {
			return type === "worker"
				? "hq"
				: ["tank", "heavy", "artillery"].includes(type)
					? "factory"
					: "barracks";
		}
		isProducer(e) {
			return (
				!!e &&
				e.team === this.me &&
				e.hp > 0 &&
				["hq", "barracks", "factory"].includes(e.type)
			);
		}
		buildingQueue(id) {
			return this.queue.filter((q) => q.producerId === id);
		}
		producer(type, preferredId = null) {
			const candidates = this.entities.filter(
				(e) =>
					this.isProducer(e) &&
					e.type === this.productionType(type) &&
					!e.constructionLeft,
			);
			if (preferredId !== null)
				return candidates.find((e) => e.id === preferredId);
			return candidates
				.filter((e) => this.buildingQueue(e.id).length < 10)
				.sort(
					(a, b) =>
						this.buildingQueue(a.id).reduce(
							(n, q) => n + q.left,
							0,
						) -
						this.buildingQueue(b.id).reduce(
							(n, q) => n + q.left,
							0,
						),
				)[0];
		}
		assignGroup(number, ids, append = false) {
			if (!/^[1-9]$/.test(String(number))) return [];
			this.groups[number] = [
				...new Set([
					...(append ? this.groups[number] || [] : []),
					...ids,
				]),
			].filter((id) => {
				const e = this.get(id);
				return e?.team === this.me && TYPES[e.type].speed;
			});
			return this.groups[number];
		}
		recallGroup(number) {
			return (this.groups[number] || []).filter((id) => {
				const e = this.get(id);
				return e?.team === this.me && TYPES[e.type].speed;
			});
		}
		setRally(ids, x, y) {
			if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
			let count = 0;
			for (const id of ids) {
				const b = this.get(id);
				if (this.isProducer(b)) {
					const destination = this.pathTo(b, { x, y }).at(-1);
					if (destination) {
						b.rally = { ...destination };
						count++;
					}
				}
			}
			return count;
		}
		reportAttack(target) {
			if (!this.isHuman(target.team) || TYPES[target.type].speed) return;
			if (target.team !== this.me) return this.as(target.team, () => this.reportAttack(target));
			this.baseAlert = {
				x: target.x,
				y: target.y,
				name: TYPES[target.type].name,
				until: this.time + 7,
			};
			if (this.time >= this.nextAlertAt) {
				this.notify(
					`BAZA ATAKOWANA — ${TYPES[target.type].name}!`,
					"alarm",
				);
				this.nextAlertAt = this.time + 10;
			}
		}
		resizeWorld(w, h) {
			this.W = w;
			this.H = h;
			for (const side of Object.values(this.sides)) {
				side.explored = new Array((w / CELL) * (h / CELL)).fill(0);
				side.visible = new Array(side.explored.length).fill(0);
			}
		}
		visionIndex(x, y) {
			return (
				clamp(Math.floor(y / CELL), 0, this.H / CELL - 1) *
					(this.W / CELL) +
				clamp(Math.floor(x / CELL), 0, this.W / CELL - 1)
			);
		}
		// Allied teams share vision, never fire at each other and take relays for the side leader.
		allied(a, b) {
			return a === b || (!!this.alliances && this.alliances[a] !== undefined && this.alliances[a] === this.alliances[b]);
		}
		sideLeader(team) {
			return this.alliances?.[team] ?? team;
		}
		// How a side is called in messages: the enemy's faction name, the ally, or the other computer armies.
		sideName(team) {
			if (team === this.me) return "Ty";
			if (this.players?.[team]?.name) return this.players[team].name;
			if (this.alliances && this.allied(this.me, team)) return "Sojusznik";
			if (team === 1) return this.factionFor?.(1)?.name || "Dominium";
			return team === 3 ? "Druga armia AI" : team === 4 ? "Trzecia armia AI" : "Przeciwnik";
		}
		isVisible(x, y) {
			return !!this.visible[this.visionIndex(x, y)];
		}
		updateVision() {
			if (this.humans.length > 1 || this._actor === undefined) {
				for (const team of this.humans) this.as(team, () => this.updateVisionOf(team));
				return;
			}
			this.updateVisionOf(this.me);
		}
		updateVisionOf(team) {
			this.visible.fill(0);
			const sources = this.entities
				.filter((e) => this.allied(team, e.team) && e.hp > 0)
				.map((e) => ({
					x: e.x,
					y: e.y,
					r: TYPES[e.type].sight || (e.type === "hq" ? 370 : e.type === "worker" ? 210 : 300),
				}));
			this.nodes
				.filter((n) => n.owner === team)
				.forEach((n) => sources.push({ ...n, r: 240 }));
			const cols = this.W / CELL,
				rows = this.H / CELL;
			for (const s of sources)
				for (
					let y = Math.max(0, Math.floor((s.y - s.r) / CELL));
					y <= Math.min(rows - 1, Math.floor((s.y + s.r) / CELL));
					y++
				)
					for (
						let x = Math.max(0, Math.floor((s.x - s.r) / CELL));
						x <= Math.min(cols - 1, Math.floor((s.x + s.r) / CELL));
						x++
					) {
						if (
							Math.hypot(
								(x + 0.5) * CELL - s.x,
								(y + 0.5) * CELL - s.y,
							) < s.r
						) {
							this.visible[y * cols + x] = 1;
							this.explored[y * cols + x] = 1;
						}
					}
		}
		gather(ids, oreId, resource = "ore") {
			const ore = this.resourceFields(resource).find(
				(o) => o.id === oreId && o.amount > 0,
			);
			if (!ore) return false;
			let count = 0;
			for (const id of ids) {
				const e = this.get(id);
				if (e?.type === "worker" && e.team === this.me) {
					e.order = { kind: "gather", oreId, resource };
					e.target = null;
					e.path = [];
					e.work = 0;
					count++;
				}
			}
			return count > 0;
		}
		repair(ids, targetId) {
			const target = this.get(targetId);
			if (
				!target ||
				target.team !== this.me ||
				target.hp >= target.maxHp ||
				target.constructionLeft
			)
				return false;
			let count = 0;
			for (const id of ids) {
				const e = this.get(id);
				if (e?.type === "worker" && e.id !== targetId) {
					e.order = { kind: "repair", targetId };
					e.target = null;
					e.path = [];
					count++;
				}
			}
			return count > 0;
		}
		buildWith(ids, targetId) {
			const target = this.get(targetId);
			if (!target || target.team !== this.me || !target.constructionLeft)
				return false;
			let count = 0;
			for (const id of ids) {
				const e = this.get(id);
				if (e?.type === "worker" && e.team === this.me && e.id !== targetId) {
					e.order = { kind: "build", targetId };
					e.target = null;
					e.path = [];
					e.repath = 0;
					e.work = 0;
					count++;
				}
			}
			return count > 0;
		}
		moveWorker(e, destination, dt, stopRange) {
			if (dist(e, destination) <= stopRange) {
				e.path = [];
				return true;
			}
			// Without a route the worker waits for the next attempt instead of searching again every frame.
			if (e.repath <= 0 || (!e.path.length && !e.noRoute)) {
				e.path = this.pathTo(e, destination);
				e.repath = 1.5;
				e.noRoute = e.path.length ? 0 : (e.noRoute || 0) + 1;
				if (e.noRoute >= 4 && e.team === this.me) {
					e.order = null;
					e.path = [];
					e.noRoute = 0;
					this.notify("Robot nie może dotrzeć do celu i przerwał zadanie.");
					return false;
				}
			}
			const p = e.path[0];
			if (!p) return false;
			const d = dist(e, p),
				step = TYPES.worker.speed * dt * this.movementFactor(e);
			if (d <= step + 2) {
				if (!this.blocked(p.x, p.y, 14)) {
					e.x = p.x;
					e.y = p.y;
				}
				e.path.shift();
			} else {
				const x = e.x + ((p.x - e.x) / d) * step,
					y = e.y + ((p.y - e.y) / d) * step;
				if (!this.blocked(x, y, 14)) {
					e.x = x;
					e.y = y;
					e.angle = Math.atan2(p.y - e.y, p.x - e.x);
				}
			}
			return false;
		}
		workTick(e, dt) {
			if (e.order.kind === "build") {
				const target = this.get(e.order.targetId);
				if (!target || !target.constructionLeft) {
					e.order = null;
					e.path = [];
					return;
				}
				if (
					this.moveWorker(
						e,
						target,
						dt,
						["wall", "gate"].includes(target.type)
							? 75
							: TYPES[target.type].radius + 24,
					)
				) {
					target.constructionLeft = Math.max(
						0,
						target.constructionLeft -
							dt *
								1.25 *
								(this.buildingFactor ? this.buildingFactor(e.team) : 1) *
								(this.upgradeOf(e.team, "assembly")
									? 1.25
									: 1),
					);
					e.work += dt;
					if (!target.constructionLeft) {
						this.notify(
							`${TYPES[target.type].name} — gotowe.`,
							"ready",
						);
						e.order = null;
						e.path = [];
					}
				}
				return;
			}
			if (e.order.kind === "repair") {
				const target = this.get(e.order.targetId);
				if (!target || target.hp >= target.maxHp) {
					e.order = null;
					e.path = [];
					return;
				}
				if (
					this.moveWorker(
						e,
						target,
						dt,
						TYPES[target.type].radius + 25,
					) &&
					this.credits > 0
				) {
					const restored = Math.min(
						35 * dt,
						target.maxHp - target.hp,
						this.credits * 5,
					);
					target.hp += restored;
					this.credits -= restored / 5;
					e.work += dt;
				}
				return;
			}
			if (e.order.kind === "gas") {
				const b = this.get(e.order.extractorId),
					field = this.gasFields.find((o) => o.id === b?.gasId);
				if (!b || b.constructionLeft || !field || field.amount <= 0) {
					e.order = null;
					e.path = [];
					this.notify("Wydobycie gazu zatrzymane. Robot bezczynny.");
					return;
				}
				if (this.moveWorker(e, b, dt, TYPES.extractor.radius + 25)) {
					const amount = Math.min(field.amount, 2 * dt);
					field.amount = Math.max(0, field.amount - amount);
					this.gas += amount;
					this.recordIncome("gas", amount);
				}
				return;
			}
			const ore = this.resourceFields(e.order.resource).find(
				(o) => o.id === e.order.oreId,
			);
			if (
				e.order.returning ||
				(e.cargo > 0 &&
					(e.cargoKind || "ore") !== (e.order.resource || "ore")) ||
				e.cargo >= this.cargoCapacity ||
				(!ore?.amount && e.cargo > 0)
			) {
				e.order.returning = true;
				let base = this.get(e.order.depotId);
				if (!base || base.constructionLeft) {
					base = this.bestDropoff(e);
					e.order.depotId = base?.id;
					e.path = [];
				}
				if (!base) {
					e.order = null;
					e.path = [];
					this.notify(
						"Brak dostępnego punktu rozładunku. Robot zachował rudę.",
					);
					return;
				}
				if (
					this.moveWorker(e, base, dt, TYPES[base.type].radius + 25)
				) {
					this.recordIncome(
						e.cargoKind === "crystal" ? "crystals" : "metal",
						e.cargo,
					);
					if (e.cargoKind === "crystal") this.crystals += e.cargo;
					else {
						this.credits += e.cargo;
						this.mined += e.cargo;
					}
					e.cargo = 0;
					e.work = 0;
					e.path = [];
					e.order.returning = false;
					e.order.depotId = null;
				}
			} else if (!ore || ore.amount <= 0) {
				e.order = null;
				e.path = [];
				this.notify("Złoże wyczerpane. Wyślij robota do kolejnego.");
			} else if (this.moveWorker(e, ore, dt, 42)) {
				e.work += dt;
				if (e.work >= 0.5) {
					this.fx("dust", e.x + (ore.x - e.x) * 0.5, e.y + (ore.y - e.y) * 0.5, { color: e.order.resource === "crystal" ? "#d9c07a" : "#a9b6b4", dx: (e.x - ore.x) * 0.2, chips: e.order.resource === "crystal" ? "#fff0b0" : "#dff2f6" });
					const amount = Math.min(
						this.upgradeOf(e.team, "extraction") ? 3.75 : 3,
						ore.amount,
						this.cargoCapacity - e.cargo,
					);
					ore.amount -= amount;
					e.cargoKind = e.order.resource || "ore";
					e.cargo += amount;
					e.work = 0;
				}
			}
		}
		get cargoCapacity() {
			return this.upgrades.cargo ? 60 : 30;
		}
		idleWorkers() {
			return this.units(this.me).filter((e) => e.type === "worker" && !e.order);
		}
		bestDropoff(worker) {
			return this.entities
				.filter(
					(b) =>
						b.team === this.me &&
						b.hp > 0 &&
						!b.constructionLeft &&
						["hq", "depot", "outpost"].includes(b.type),
				)
				.map((b) => {
					const path = this.pathTo(worker, b);
					let length = 0,
						prev = worker;
					for (const point of path) {
						length += dist(prev, point);
						prev = point;
					}
					return {
						b,
						length:
							path.length &&
							dist(path.at(-1), b) < TYPES[b.type].radius + 25
								? length
								: Infinity,
					};
				})
				.filter((v) => Number.isFinite(v.length))
				.sort((a, b) => a.length - b.length)[0]?.b;
		}
		assignGas(ids, extractorId) {
			const b = this.get(extractorId),
				field = this.gasFields.find((o) => o.id === b?.gasId);
			if (
				!b ||
				b.type !== "extractor" ||
				b.team !== this.me ||
				b.constructionLeft ||
				!field?.amount
			)
				return false;
			if (
				this.units(this.me).some(
					(e) =>
						e.order?.kind === "gas" && e.order.extractorId === b.id,
				)
			)
				return false;
			const e = ids
				.map((id) => this.get(id))
				.find((e) => e?.type === "worker" && e.team === this.me);
			if (!e) return false;
			e.order = { kind: "gas", extractorId };
			e.target = null;
			e.path = [];
			e.repath = 0;
			e.work = 0;
			return true;
		}
		researchStatus(kind) {
			const r = RESEARCH[kind];
			if (!r)
				return {
					allowed: false,
					state: "locked",
					reason: "Nieznane badanie",
				};
			const required =
				this.research?.kind === kind
					? this.researchBuilding()
					: r.building;
			const base = { allowed: false, required, progress: 0 };
			if (this.result)
				return {
					...base,
					state: "locked",
					reason: "Operacja zakończona",
				};
			if (
				["extraction", "assembly", "infantryTraining"].includes(kind) &&
				!this.upgrades.colony
			)
				return {
					...base,
					state: "locked",
					reason: "Wymaga centrum II — Kolonia",
				};
			if (this.upgrades[kind])
				return {
					...base,
					state: "done",
					reason: "Ukończone",
					progress: 1,
				};
			if (this.research?.kind === kind) {
				const ready = !!this.ready(required);
				return {
					...base,
					state: ready ? "working" : "paused",
					reason: ready
						? "Badanie w toku"
						: "Wstrzymane — odbuduj " + TYPES[required].name,
					progress: clamp(
						1 - this.research.left / this.research.total,
						0,
						1,
					),
				};
			}
			if (!this.ready(required))
				return {
					...base,
					state: "locked",
					reason: "Wymaga: " + TYPES[required].name,
				};
			if (this.research)
				return {
					...base,
					state: "busy",
					reason:
						"Trwa inne badanie: " +
						RESEARCH[this.research.kind].name,
				};
			const deficits = [
				[r.metal - this.credits, "metalu"],
				[r.gas - this.gas, "gazu"],
				[(r.crystals || 0) - this.crystals, "kryształów"],
			]
				.filter(([n]) => n > 0)
				.map(([n, label]) => Math.ceil(n) + " " + label);
			if (deficits.length)
				return {
					...base,
					state: "poor",
					reason: "Brakuje: " + deficits.join(", "),
				};
			return {
				...base,
				allowed: true,
				state: "ready",
				reason: "Gotowe do badania",
			};
		}
		startResearch(kind) {
			const r = RESEARCH[kind],
				status = this.researchStatus(kind);
			if (!status.allowed) {
				if (r) this.notify(status.reason);
				return false;
			}
			this.credits -= r.metal;
			this.gas -= r.gas;
			this.crystals -= r.crystals || 0;
			this.research = {
				kind,
				requiredBuilding: r.building,
				left: r.time,
				total: r.time,
				paid: { metal: r.metal, gas: r.gas, crystals: r.crystals || 0 },
			};
			return true;
		}
		cancelResearch() {
			if (!this.research) return false;
			const paid = this.research.paid || { metal: 250, gas: 0 };
			this.credits += paid.metal;
			this.gas += paid.gas;
			this.crystals += paid.crystals || 0;
			this.research = null;
			this.notify("Badanie anulowane. Zwrócono wszystkie surowce.");
			return true;
		}
		recordIncome(kind, amount) {
			if (!(amount > 0) || !Number.isFinite(amount)) return;
			const second = Math.floor(this.time);
			let bucket = this.economyHistory.at(-1);
			if (!bucket || bucket.second !== second) {
				bucket = { second, metal: 0, gas: 0, crystals: 0, passive: 0 };
				this.economyHistory.push(bucket);
				this.economyHistory = this.economyHistory
					.filter((b) => b.second >= second - 60)
					.slice(-61);
			}
			bucket[kind] += amount;
		}
		economyReport() {
			const end = Math.floor(this.time),
				start = Math.max(Math.ceil(this.economySince), end - 60);
			const seconds = Math.max(0, end - start),
				totals = { metal: 0, gas: 0, crystals: 0, passive: 0 };
			for (const b of this.economyHistory)
				if (b.second >= start && b.second < end)
					for (const key of Object.keys(totals))
						totals[key] += b[key];
			const rates = Object.fromEntries(
				Object.entries(totals).map(([key, value]) => [
					key,
					seconds ? (value * 60) / seconds : 0,
				]),
			);
			rates.metal += rates.passive;
			const workers = this.units(this.me).filter((e) => e.type === "worker");
			const roles = {
				ore: [],
				crystal: [],
				gas: [],
				build: [],
				repair: [],
				other: [],
				idle: [],
			};
			for (const e of workers) {
				const k = e.order?.kind;
				const role = !k
					? "idle"
					: k === "gather"
						? e.order.resource === "crystal"
							? "crystal"
							: "ore"
						: ["gas", "build", "repair"].includes(k)
							? k
							: "other";
				roles[role].push(e.id);
			}
			const depots = this.entities.filter(
				(e) =>
					e.team === this.me &&
					e.hp > 0 &&
					!e.constructionLeft &&
					["hq", "depot"].includes(e.type),
			);
			const deposits = [];
			for (const [kind, fields] of [
				["ore", this.ores],
				["crystal", this.crystalFields],
				["gas", this.gasFields],
			])
				for (const field of fields) {
					if (!this.isVisible(field.x, field.y)) continue;
					const assigned = workers.filter((e) =>
						kind === "gas"
							? e.order?.kind === "gas" &&
								this.get(e.order.extractorId)?.gasId ===
									field.id
							: e.order?.kind === "gather" &&
								(e.order.resource || "ore") === kind &&
								e.order.oreId === field.id,
					);
					const ownExtractor =
						kind === "gas" &&
						this.entities.find(
							(e) =>
								e.type === "extractor" &&
								e.team === this.me &&
								e.hp > 0 &&
								!e.constructionLeft &&
								e.gasId === field.id,
						);
					if (
						!assigned.length &&
						!ownExtractor &&
						!depots.some((d) => dist(d, field) < 400)
					)
						continue;
					const distance =
						kind === "gas"
							? null
							: depots.length
								? Math.min(...depots.map((d) => dist(d, field)))
								: null;
					deposits.push({
						kind,
						id: field.id,
						x: field.x,
						y: field.y,
						amount: Math.floor(field.amount),
						assigned: assigned.length,
						ids: assigned.map((e) => e.id),
						distance,
						low:
							field.amount <=
							(kind === "gas" ? 120 : this.cargoCapacity * 5),
						unmanned: !!ownExtractor && !assigned.length,
					});
				}
			deposits.sort(
				(a, b) =>
					Number(b.low) - Number(a.low) ||
					b.assigned - a.assigned ||
					a.id - b.id,
			);
			const power = this.power,
				alerts = [];
			if (power.discharge > 0)
				alerts.push({
					text: "Akumulatory podtrzymują sieć. Odbuduj moc reaktorów przed wyczerpaniem energii.",
					severity: "warning",
				});
			if (power.factor < 1)
				alerts.push({
					text:
						"Brak mocy: produkcja i badania działają w " +
						Math.round(power.factor * 100) +
						"%. Zbuduj reaktor.",
					severity: "danger",
				});
			if (roles.idle.length)
				alerts.push({
					text:
						roles.idle.length +
						" bezczynnych robotów. Przydziel im zadania.",
					role: "idle",
				});
			for (const d of deposits) {
				const label =
					{ ore: "Ruda", gas: "Gaz", crystal: "Kryształy" }[d.kind] +
					" #" +
					d.id;
				if (d.low)
					alerts.push({
						text:
							label +
							(d.amount
								? " — kończące się złoże (" + d.amount + ")."
								: " — złoże wyczerpane."),
						x: d.x,
						y: d.y,
					});
				if (d.unmanned && d.amount)
					alerts.push({
						text: label + " — ekstraktor bez operatora.",
						x: d.x,
						y: d.y,
					});
				if (d.assigned && d.distance === null && d.kind !== "gas")
					alerts.push({
						text: label + " — brak punktu rozładunku.",
						x: d.x,
						y: d.y,
					});
				else if (d.assigned && d.distance > 450)
					alerts.push({
						text:
							label +
							" — daleki rozładunek. Rozważ magazyn bliżej złoża.",
						x: d.x,
						y: d.y,
					});
			}
			return {
				seconds,
				rates,
				roles,
				workers: workers.length,
				power,
				reserve: power.supply - power.demand,
				deposits,
				alerts,
			};
		}
		serialize() {
			const fields = [
				"seed",
				"nextId",
				"time",
				"credits",
				"income",
				"entities",
				"queue",
				"result",
				"wave",
				"nextWave",
				"kills",
				"captured",
				"nodes",
				"ores",
				"mined",
				"upgrades",
				"research",
				"explored",
				"groups",
				"baseAlert",
				"nextAlertAt",
				"gas",
				"gasFields",
				"crystals",
				"crystalFields",
				"missionId",
				"obstacles",
				"waters",
				"trackClock",
				"weatherWarning",
				"weatherThunder",
				"economyHistory",
				"economySince",
				"craters",
				"alliances",
				"W",
				"H",
			];
			const state = { version: 6 };
			for (const key of fields) state[key] = this[key];
			return JSON.parse(JSON.stringify(state));
		}
		static fromSave(state) {
			if (
				!state ||
				![2, 3, 4, 5, 6].includes(state.version) ||
				!Array.isArray(state.entities) ||
				!Array.isArray(state.ores) ||
				!Array.isArray(state.nodes) ||
				!Array.isArray(state.queue) ||
				!Array.isArray(state.explored) ||
				![(mapW(state) / CELL) * (mapH(state) / CELL), 1925].includes(
					state.explored.length,
				)
			)
				throw new Error("Nieobsługiwany zapis");
			const finiteFields = [
				"seed",
				"nextId",
				"time",
				"credits",
				"income",
				"wave",
				"nextWave",
				"kills",
				"mined",
			];
			if (
				finiteFields.some((k) => !Number.isFinite(state[k])) ||
				state.entities.some(
					(e) =>
						!TYPES[e.type] ||
						![e.x, e.y, e.hp].every(Number.isFinite),
				) ||
				state.queue.some(
					(q) => !TYPES[q.type]?.build || !Number.isFinite(q.left),
				)
			)
				throw new Error("Uszkodzony zapis");
			const game = new Game();
			game.resizeWorld(mapW(state), mapH(state));
			for (const key of Object.keys(game.serialize()))
				if (key !== "version" && Object.hasOwn(state, key))
					game[key] = JSON.parse(JSON.stringify(state[key]));
			// Craters are only scenery: a damaged list is dropped rather than failing the save.
			if (!Array.isArray(game.craters) || game.craters.some((k) => ![k?.x, k?.y, k?.size, k?.born].every(Number.isFinite))) game.craters = [];
			for (const e of game.entities)
				if (e.type === "battery")
					e.energy = Number.isFinite(e.energy)
						? clamp(e.energy, 0, 900)
						: 0;
			if (
				!Object.hasOwn(state, "economyHistory") ||
				!Object.hasOwn(state, "economySince")
			) {
				game.economyHistory = [];
				game.economySince = game.time;
			} else if (
				!Number.isFinite(game.economySince) ||
				game.economySince < 0 ||
				game.economySince > game.time ||
				!Array.isArray(game.economyHistory) ||
				game.economyHistory.length > 61 ||
				game.economyHistory.some(
					(b, i) =>
						!b ||
						!Number.isInteger(b.second) ||
						b.second < 0 ||
						b.second > Math.floor(game.time) ||
						(i > 0 &&
							b.second <= game.economyHistory[i - 1].second) ||
						["metal", "gas", "crystals", "passive"].some(
							(k) => !Number.isFinite(b[k]) || b[k] < 0,
						),
				)
			) {
				throw Error("Uszkodzona historia gospodarki");
			}
			if (game.explored.length === 1925) {
				const old = game.explored;
				game.explored = new Array(
					(game.W / CELL) * (game.H / CELL),
				).fill(0);
				for (let y = 0; y < 35; y++)
					for (let x = 0; x < 55; x++)
						game.explored[y * (game.W / CELL) + x] =
							old[y * 55 + x];
			}
			if (state.version < 6) game.waters = [];
			if (
				!Array.isArray(game.waters) ||
				game.waters.some(
					(w) =>
						![w.x, w.y, w.rx, w.ry].every(Number.isFinite) ||
						w.rx <= 0 ||
						w.ry <= 0,
				)
			)
				throw new Error("Uszkodzona woda");
			if (state.version < 4) {
				game.gas = 0;
				game.gasFields = GAS_FIELDS();
				game.upgrades.cargo = false;
				// Preserve all old structures; move new deposits away from occupied terrain.
				for (const field of game.gasFields) {
					const origin = { ...field };
					let placed = false;
					for (let radius = 0; radius < 700 && !placed; radius += 40)
						for (let k = 0; k < 16 && !placed; k++) {
							const p = {
								x:
									origin.x +
									Math.cos((k * Math.PI) / 8) * radius,
								y:
									origin.y +
									Math.sin((k * Math.PI) / 8) * radius,
							};
							if (
								!game.blocked(p.x, p.y, 45) &&
								!game.entities.some(
									(e) =>
										dist(e, p) < TYPES[e.type].radius + 70,
								) &&
								!game.ores.some((o) => dist(o, p) < 100) &&
								!game.nodes.some((n) => dist(n, p) < 100) &&
								!game.gasFields.some(
									(o) => o !== field && dist(o, p) < 100,
								)
							) {
								field.x = p.x;
								field.y = p.y;
								placed = true;
							}
						}
					if (!placed) throw new Error("Brak miejsca na nowe złoże");
				}
			} else if (
				!Number.isFinite(state.gas) ||
				state.gas < 0 ||
				!Array.isArray(state.gasFields) ||
				game.gasFields.some(
					(o) =>
						![o.id, o.x, o.y, o.amount].every(Number.isFinite) ||
						o.amount < 0,
				)
			)
				throw new Error("Uszkodzony gaz");
			if (state.version < 5) {
				game.missionId = "horizon";
				game.crystals = 0;
				game.crystalFields = CRYSTAL_FIELDS();
				for (const f of game.crystalFields) {
					let found = false;
					const origin = { ...f };
					for (let r = 0; r < 800 && !found; r += 40)
						for (let k = 0; k < 16 && !found; k++) {
							const p = {
								x: origin.x + Math.cos((k * Math.PI) / 8) * r,
								y: origin.y + Math.sin((k * Math.PI) / 8) * r,
							};
							if (
								!game.blocked(p.x, p.y, 45) &&
								!game.entities.some(
									(e) =>
										dist(e, p) < TYPES[e.type].radius + 70,
								) &&
								![
									...game.ores,
									...game.gasFields,
									...game.nodes,
									...game.crystalFields.filter(
										(o) => o !== f,
									),
								].some((o) => dist(o, p) < 100)
							) {
								Object.assign(f, p);
								found = true;
							}
						}
					if (!found) throw new Error("Brak miejsca na kryształy");
				}
			} else if (
				!Object.hasOwn(MISSIONS, state.missionId) ||
				!Number.isFinite(state.crystals) ||
				state.crystals < 0 ||
				!Array.isArray(state.crystalFields) ||
				state.crystalFields.some(
					(o) =>
						![o.id, o.x, o.y, o.amount].every(Number.isFinite) ||
						o.amount < 0,
				) ||
				!Array.isArray(state.obstacles) ||
				state.obstacles.some(
					(o) =>
						![o.x, o.y, o.w, o.h].every(Number.isFinite) ||
						o.w <= 0 ||
						o.h <= 0,
				)
			)
				throw new Error("Uszkodzona mapa");
			if (game.research) {
				if (!RESEARCH[game.research.kind])
					throw new Error("Uszkodzone badanie");
				game.research.requiredBuilding ||=
					RESEARCH[game.research.kind].building;
			}
			game.debris = [];
			game.upgrades.cargo = !!game.upgrades.cargo;
			game.groups =
				game.groups && typeof game.groups === "object"
					? game.groups
					: {};
			for (let n = 1; n <= 9; n++)
				if (Object.hasOwn(game.groups, n)) {
					if (!Array.isArray(game.groups[n]))
						throw new Error("Uszkodzona grupa");
					game.assignGroup(n, game.groups[n]);
				}
			for (const e of game.entities) {
				e.rally =
					e.rally &&
					Number.isFinite(e.rally.x) &&
					Number.isFinite(e.rally.y)
						? {
								x: clamp(e.rally.x, 30, game.W - 30),
								y: clamp(e.rally.y, 30, game.H - 30),
							}
						: null;
			}
			for (const site of game.entities.filter(
				(e) => e.team === game.me && e.constructionLeft,
			))
				if (
					!game.entities.some(
						(e) =>
							e.type === "worker" &&
							e.order?.kind === "build" &&
							(e.order.targetId === site.id ||
								e.builderQueue?.includes(site.id)),
					)
				) {
					const worker = game
						.units(game.me)
						.filter((e) => e.type === "worker")
						.sort((a, b) => dist(a, site) - dist(b, site))[0];
					if (worker) game.queueBuilder(worker, site);
				}
			if (state.version === 2)
				for (const q of game.queue)
					q.producerId = game.producer(q.type)?.id ?? null;
			game.effects = [];
			game.events = [];
			game.updateVision();
			return game;
		}
		blocked(x, y, pad = 22) {
			return (
				x < 25 ||
				y < 25 ||
				x > this.W - 25 ||
				y > this.H - 25 ||
				(this.waters || []).some(
					(w) =>
						// The shoreline never exceeds the ellipse box, so the box is a cheap first test.
						Math.abs(x - w.x) < w.rx + pad &&
						Math.abs(y - w.y) < w.ry + pad &&
						waterContains(w, x, y, pad),
				) ||
				this.entities.some(
					(e) =>
						e.hp > 0 &&
						!e.constructionLeft &&
						["wall", "gate"].includes(e.type) &&
						!e.open &&
						Math.abs(
							(x - e.x) * Math.cos(e.wallAngle || 0) +
								(y - e.y) * Math.sin(e.wallAngle || 0),
						) <
							TYPES[e.type].radius + pad &&
						Math.abs(
							-(x - e.x) * Math.sin(e.wallAngle || 0) +
								(y - e.y) * Math.cos(e.wallAngle || 0),
						) <
							(e.type === "wall" ? 24 : 12) + pad,
				) ||
				this.obstacles.some(
					(r) =>
						x > r.x - pad &&
						x < r.x + r.w + pad &&
						y > r.y - pad &&
						y < r.y + r.h + pad,
				)
			);
		}
		// The margin a route keeps from rocks, walls and water: the classic 22, or more for a ground unit wider than that,
		// so that its own step check (radius + 2) never blocks a segment the route found clear.
		routePad(a) {
			const t = TYPES[a?.type];
			return t?.speed && !t.flying ? Math.max(22, t.radius + 3) : 22;
		}
		clearLine(a, b, pad = 22) {
			// Rocks and walls exactly; a box the segment starts in is left to the sampling below (the old behaviour), so a
			// unit standing within the margin can still leave it.
			const inside = (x, y, hx, hy, angle = 0) => {
				const c = Math.cos(angle),
					s = Math.sin(angle);
				return (
					Math.abs((a.x - x) * c + (a.y - y) * s) < hx &&
					Math.abs(-(a.x - x) * s + (a.y - y) * c) < hy
				);
			};
			for (const r of this.obstacles) {
				const x = r.x + r.w / 2,
					y = r.y + r.h / 2,
					hx = r.w / 2 + pad,
					hy = r.h / 2 + pad;
				if (!inside(x, y, hx, hy) && segmentCrossesBox(a, b, x, y, hx, hy))
					return false;
			}
			for (const e of this.entities)
				if (
					e.hp > 0 &&
					!e.constructionLeft &&
					["wall", "gate"].includes(e.type) &&
					!e.open
				) {
					const hx = TYPES[e.type].radius + pad,
						hy = (e.type === "wall" ? 24 : 12) + pad,
						angle = e.wallAngle || 0;
					if (
						!inside(e.x, e.y, hx, hy, angle) &&
						segmentCrossesBox(a, b, e.x, e.y, hx, hy, angle)
					)
						return false;
				}
			const d = dist(a, b),
				steps = Math.ceil(d / 20);
			for (let i = 1; i <= steps; i++)
				if (
					this.blocked(
						a.x + ((b.x - a.x) * i) / steps,
						a.y + ((b.y - a.y) * i) / steps,
						pad,
					)
				)
					return false;
			return true;
		}
		pathTo(a, b) {
			const pad = this.routePad(a),
				goal = {
					x: clamp(b.x, 30, this.W - 30),
					y: clamp(b.y, 30, this.H - 30),
				};
			if (this.blocked(goal.x, goal.y, pad)) {
				let found = false;
				for (let radius = 40; radius < 400 && !found; radius += 40)
					for (let k = 0; k < 16; k++) {
						const x = goal.x + Math.cos((k * Math.PI) / 8) * radius,
							y = goal.y + Math.sin((k * Math.PI) / 8) * radius;
						if (!this.blocked(x, y, pad)) {
							goal.x = x;
							goal.y = y;
							found = true;
							break;
						}
					}
			}
			if (this.clearLine(a, goal, pad)) return [goal];
			const cols = this.W / CELL,
				rows = this.H / CELL;
			const sx = clamp(Math.floor(a.x / CELL), 0, cols - 1),
				sy = clamp(Math.floor(a.y / CELL), 0, rows - 1),
				gx = Math.floor(goal.x / CELL),
				gy = Math.floor(goal.y / CELL);
			const key = (x, y) => y * cols + x,
				start = key(sx, sy),
				end = key(gx, gy),
				came = new Map(),
				g = new Map([[start, 0]]),
				closed = new Set(),
				// Passability of each cell, checked once per search. The goal cell is always open: the goal point
				// itself is free (checked above), even when the cell centre lies within an obstacle's margin.
				passable = new Uint8Array(cols * rows),
				open = (x, y, k) => {
					if (k === end) return true;
					if (!passable[k]) passable[k] = this.blocked((x + 0.5) * CELL, (y + 0.5) * CELL, pad) ? 2 : 1;
					return passable[k] === 1;
				};
			// Binary heap ordered by f = g + h, ties broken by insertion order.
			const heap = [],
				fScore = (k) => g.get(k) + heuristic(k);
			let order = 0;
			const push = (k) => {
				const item = { k, f: fScore(k), o: order++ };
				heap.push(item);
				for (let i = heap.length - 1; i > 0; ) {
					const p = (i - 1) >> 1;
					if (
						heap[p].f < item.f ||
						(heap[p].f === item.f && heap[p].o < item.o)
					)
						break;
					heap[i] = heap[p];
					heap[p] = item;
					i = p;
				}
			};
			const pop = () => {
				const top = heap[0],
					last = heap.pop();
				if (heap.length) {
					heap[0] = last;
					for (let i = 0; ; ) {
						const l = 2 * i + 1,
							r = l + 1;
						let m = i;
						for (const c of [l, r])
							if (
								c < heap.length &&
								(heap[c].f < heap[m].f ||
									(heap[c].f === heap[m].f &&
										heap[c].o < heap[m].o))
							)
								m = c;
						if (m === i) break;
						[heap[i], heap[m]] = [heap[m], heap[i]];
						i = m;
					}
				}
				return top;
			};
			const heuristic = (k) =>
				Math.hypot((k % cols) - gx, Math.floor(k / cols) - gy);
			push(start);
			let iterations = 0;
			while (heap.length && iterations < cols * rows) {
				const cur = pop().k;
				if (closed.has(cur)) continue;
				iterations++;
				if (cur === end) {
					const path = [goal];
					let k = cur;
					while (came.has(k)) {
						path.push({
							x: ((k % cols) + 0.5) * CELL,
							y: (Math.floor(k / cols) + 0.5) * CELL,
						});
						k = came.get(k);
					}
					path.reverse();
					const smooth = [];
					let from = a;
					while (path.length) {
						let j = path.length - 1;
						while (j > 0 && !this.clearLine(from, path[j], pad)) j--;
						from = path[j];
						smooth.push(from);
						path.splice(0, j + 1);
					}
					return smooth;
				}
				closed.add(cur);
				const cx = cur % cols,
					cy = Math.floor(cur / cols);
				for (const [dx, dy] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1],
					[1, 1],
					[1, -1],
					[-1, 1],
					[-1, -1],
				]) {
					const nx = cx + dx,
						ny = cy + dy,
						nk = key(nx, ny);
					if (
						nx < 0 ||
						ny < 0 ||
						nx >= cols ||
						ny >= rows ||
						closed.has(nk) ||
						!open(nx, ny, nk)
					)
						continue;
					if (
						dx &&
						dy &&
						(this.blocked(
							(cx + dx + 0.5) * CELL,
							(cy + 0.5) * CELL,
						) ||
							this.blocked(
								(cx + 0.5) * CELL,
								(cy + dy + 0.5) * CELL,
							))
					)
						continue;
					const ng = g.get(cur) + Math.hypot(dx, dy);
					if (ng < (g.get(nk) ?? Infinity)) {
						came.set(nk, cur);
						g.set(nk, ng);
						push(nk);
					}
				}
			}
			return [];
		}
		command(ids, x, y, targetId = null, attackMove = false) {
			const es = ids
				.map((id) => this.get(id))
				.filter((e) => e && e.team === this.me && TYPES[e.type].speed);
			const cols = Math.ceil(Math.sqrt(es.length));
			es.forEach((e, i) => {
				const dest = {
					x: clamp(
						x + ((i % cols) - (cols - 1) / 2) * 32,
						30,
						this.W - 30,
					),
					y: clamp(
						y +
							(Math.floor(i / cols) -
								(Math.ceil(es.length / cols) - 1) / 2) *
								32,
						30,
						this.H - 30,
					),
				};
				e.order = targetId
					? { kind: "attack", targetId }
					: { kind: attackMove ? "attackMove" : "move", ...dest };
				e.target = targetId;
				e.path = this.pathTo(
					e,
					targetId ? this.get(targetId) || dest : dest,
				);
				e.repath = 0.6;
			});
		}
		hold(ids) {
			let count = 0;
			for (const id of ids) {
				const e = this.get(id);
				if (
					e?.team === this.me &&
					TYPES[e.type].speed &&
					e.type !== "worker"
				) {
					e.order = { kind: "hold", x: e.x, y: e.y };
					e.path = [];
					e.target = null;
					count++;
				}
			}
			return count;
		}
		stop(ids) {
			ids.forEach((id) => {
				const e = this.get(id);
				if (e) {
					e.order = null;
					e.path = [];
					e.target = null;
				}
			});
		}
		enqueue(type, preferredId = null) {
			const s = TYPES[type];
			if (!s || !s.build || this.result) return false;
			const producer = this.producer(type, preferredId);
			if (!producer) {
				this.notify(
					"Brak dostępnego budynku produkcyjnego lub wolnej kolejki.",
				);
				return false;
			}
			if (this.credits < s.cost) {
				this.notify("Za mało metalu. Przejmij przekaźniki.");
				return false;
			}
			if (this.population(this.me) + this.queue.length >= 60) {
				this.notify("Osiągnięto limit 60 jednostek.");
				return false;
			}
			if (this.buildingQueue(producer.id).length >= 10) {
				this.notify("Kolejka tego budynku jest pełna (10 jednostek).");
				return false;
			}
			this.credits -= s.cost;
			this.queue.push({
				type,
				left: s.build,
				total: s.build,
				producerId: producer.id,
			});
			this.notify(
				`${s.name} — ${TYPES[producer.type].name} #${producer.id}`,
			);
			return true;
		}
		cancelQueue(producerId = null) {
			const index = this.queue.findLastIndex(
				(q) => producerId === null || q.producerId === producerId,
			);
			if (index < 0) return false;
			const [q] = this.queue.splice(index, 1);
			this.credits += TYPES[q.type].cost;
			this.notify("Anulowano ostatnią pozycję. Metal zwrócony.");
			return true;
		}
		canBuild(x, y, type = "turret") {
			const field =
				type === "extractor"
					? this.gasFields.find(
							(o) => o.amount > 0 && dist(o, { x, y }) < 55,
						)
					: null;
			if (type === "extractor") {
				if (!field) return false;
				x = field.x;
				y = field.y;
			}
			const base = this.hq(this.me);
			const radius = TYPES[type]?.radius || 22;
			return (
				!!base &&
				(dist(base, { x, y }) < 380 ||
					this.nodes.some(
						(n) => n.owner === this.me && dist(n, { x, y }) < 240,
					)) &&
				this.isVisible(x, y) &&
				!this.blocked(x, y, radius + 8) &&
				!this.entities.some(
					(e) =>
						e.hp > 0 &&
						dist(e, { x, y }) < TYPES[e.type].radius + radius + 16,
				) &&
				!this.nodes.some((n) => dist(n, { x, y }) < radius + 55) &&
				![...this.ores, ...this.crystalFields].some(
					(o) => dist(o, { x, y }) < radius + 50,
				) &&
				!this.gasFields.some(
					(o) => o !== field && dist(o, { x, y }) < radius + 45,
				)
			);
		}
		buildStructure(type, x, y, builderIds = []) {
			if (
				![
					"turret",
					"barracks",
					"factory",
					"depot",
					"extractor",
					"reactor",
					"lab",
					"wall",
					"gate",
				].includes(type) ||
				this.result
			)
				return false;
			const stats = TYPES[type];
			if (this.credits < stats.cost) {
				this.notify(`${stats.name}: potrzeba ${stats.cost} metalu.`);
				return false;
			}
			const requested = builderIds
				.map((id) => this.get(id))
				.filter((e) => e?.team === this.me && e.type === "worker");
			const builders = (
				requested.length
					? requested
					: this.units(this.me)
							.filter((e) => e.type === "worker")
							.sort(
								(a, b) => dist(a, { x, y }) - dist(b, { x, y }),
							)
			).slice(0, 1);
			if (!builders.length) {
				this.notify(`${stats.name}: potrzebny jest robot budowlany.`);
				return false;
			}
			if (!this.canBuild(x, y, type)) {
				this.notify(
					"Wybierz widoczne, wolne miejsce przy bazie lub własnym przekaźniku.",
				);
				return false;
			}
			const field =
				type === "extractor"
					? this.gasFields.find(
							(o) => o.amount > 0 && dist(o, { x, y }) < 55,
						)
					: null;
			if (field) {
				x = field.x;
				y = field.y;
			}
			this.credits -= stats.cost;
			const e = this.spawn(type, this.me, x, y);
			if (field) e.gasId = field.id;
			e.constructionLeft = stats.construction;
			this.buildWith(
				builders.map((b) => b.id),
				e.id,
			);
			this.notify(`${stats.name} — robot rozpoczął budowę.`);
			return true;
		}
		toggleGate(id) {
			const e = this.get(id);
			if (e?.type !== "gate" || e.team !== this.me || e.constructionLeft)
				return false;
			if (
				e.open &&
				this.entities.some(
					(u) =>
						u.hp > 0 &&
						TYPES[u.type].speed &&
						Math.abs(u.x - e.x) < TYPES[u.type].radius + 35 &&
						Math.abs(u.y - e.y) < TYPES[u.type].radius + 15,
				)
			)
				return false;
			e.open = !e.open;
			for (const u of this.entities)
				if (
					u.order &&
					TYPES[u.type].speed &&
					Number.isFinite(u.order.x) &&
					Number.isFinite(u.order.y)
				) {
					u.path = this.pathTo(
						u,
						this.get(u.order.targetId) || u.order,
					);
					u.repath = 0;
				}
			return true;
		}
		buildTurret(x, y) {
			return this.buildStructure("turret", x, y);
		}
		damage(attacker, target) {
			let multiplier = 1;
			if (attacker.type === "rocket")
				multiplier = [
					"tank",
					"heavy",
					"artillery",
					"transport",
					"flak",
					"hq",
					"turret",
					"barracks",
					"factory",
					"depot",
					"extractor",
					"reactor",
					"lab",
					"wall",
					"gate",
				].includes(target.type)
					? 2
					: 0.65;
			if (
				attacker.type === "trooper" &&
				[
					"tank",
					"heavy",
					"artillery",
					"transport",
					"flak",
					"hq",
					"turret",
					"barracks",
					"factory",
					"depot",
					"extractor",
					"reactor",
					"lab",
					"wall",
					"gate",
				].includes(target.type)
			)
				multiplier = 0.45;
			if (
				attacker.type === "tank" &&
				["trooper", "rocket"].includes(target.type)
			)
				multiplier = 1.4;
			if (this.upgradeOf(attacker.team, "precision"))
				multiplier *= 1.15;
			if (this.upgradeOf(attacker.team, "weapons"))
				multiplier *= 1.25;
			if (this.upgradeOf(target.team, "armor")) multiplier *= 0.8;
			if (
				TYPES[attacker.type].range > 50 &&
				["trooper", "rocket"].includes(target.type) &&
				this.cover(target)
			)
				multiplier *= 0.7;
			return TYPES[attacker.type].damage * multiplier;
		}
		// WAL-01: a clear line of fire from the shooter to the target — no rock across it (shrunk by 12 at every
		// side, so a shot grazing a rock's edge passes). Indirect fire and aircraft are never blocked.
		lineOfFire(e, target) {
			const s = TYPES[e.type];
			if (!s || s.flying || TYPES[target.type]?.flying || INDIRECT_FIRE.has(e.type)) return true;
			return !this.obstacles.some((r) => FIRE_BLOCKERS.has(r.kind || "rock") && crossesRect(e, target, r, 12));
		}
		cover(target) {
			const nearRect = this.obstacles.some(
				(r) =>
					target.x > r.x - 48 &&
					target.x < r.x + r.w + 48 &&
					target.y > r.y - 48 &&
					target.y < r.y + r.h + 48 &&
					!(
						target.x > r.x &&
						target.x < r.x + r.w &&
						target.y > r.y &&
						target.y < r.y + r.h
					),
			);
			const nearBarrier = this.entities.some(
				(e) =>
					e !== target &&
					e.hp > 0 &&
					!e.constructionLeft &&
					["wall", "gate"].includes(e.type) &&
					!e.open &&
					dist(e, target) < TYPES[e.type].radius + 40,
			);
			return nearRect || nearBarrier;
		}
		applyDamage(attacker, target, amount) {
			if (target.hp <= 0) return;
			target.hp -= amount;
			target.hit = 0.15;
			this.reportAttack(target);
			if (target.hp > 0) return;
			if (this.humans.some((h) => this.isVisibleTo(h, target.x, target.y)) || this.isHuman(target.team)) {
				this.debris.push({
					x: target.x,
					y: target.y,
					size: TYPES[target.type].radius,
					life: 20,
				});
				if (this.debris.length > 70) this.debris.shift();
			}
			this.effects.push({
				kind: "explosion",
				x: target.x,
				y: target.y,
				size: TYPES[target.type].radius * 2 + 15,
				// For the 3D board: an aircraft blows up at its flight height.
				air: !!TYPES[target.type].flying,
				life: 0.65,
				maxLife: 0.65,
			});
			const scorer = attacker && this.isHuman(attacker.team) ? attacker.team : this.humans[0];
			if (target.team !== 2 && !this.allied(scorer, target.team)) this.sides[scorer].kills++;
			if (target.type === "hq") {
				this.result =
					target.team === this.humans[0]
						? "defeat"
						: this.enemyBases().length
							? null
							: MISSIONS[this.missionId].campaign &&
								  !this.campaignReady()
								? null
								: "victory";
				if (this.result)
					for (const h of this.humans)
						this.as(h, () =>
							this.notify(
								this.resultFor(h) === "victory"
									? "Sektor wyzwolony. Operacja zakończona."
									: "Utracono centrum dowodzenia.",
								this.resultFor(h),
							),
						);
			}
		}
		tick(dt) {
			if (this.result) return;
			this.time += dt;
			const storm = this.weather,
				thunder = Math.floor(this.time / 17);
			if (
				storm.kind === "rain" &&
				storm.intensity > 0.4 &&
				this.time % 17 < 0.24 &&
				this.weatherThunder !== thunder
			) {
				this.weatherThunder = thunder;
				(this.soundEvents ??= []).push("thunder");
			}
			const forecast = this.forecast,
				outlook = this.stormOutlook;
			if (forecast && forecast.until > 0 && forecast.until <= 30) {
				const key = forecast.cycle + 1;
				if (this.weatherWarning !== key) {
					this.weatherWarning = key;
					this.notify(
						`OSTRZEŻENIE: ${forecast.name} ${outlook.from} za ${Math.ceil(forecast.until)} s. ${this.stormEffects(forecast)}`,
						"alarm",
					);
				}
			} else if (!forecast && outlook?.near && this.weather.cycle + 1 !== this.weatherWarning) {
				// Without monitoring the storm is noticed only when it is close.
				this.weatherWarning = this.weather.cycle + 1;
				this.notify(`Nadciąga ${outlook.name.toLowerCase()} ${outlook.from} — za ok. ${Math.ceil(outlook.until)} s.`, "alarm");
			}

			this.trackClock += dt;
			const trackFrame = this.trackClock >= 0.25;
			if (trackFrame) this.trackClock = 0;
			for (const e of this.entities) {
				// Tread marks and footprints: only units on the ground (aircraft leave none).
				if (trackFrame && TYPES[e.type].speed && !TYPES[e.type].flying && e.hp > 0) {
					if (e.lastTrack && dist(e, e.lastTrack) > 8) {
						this.tracks.push({
							x: e.x,
							y: e.y,
							angle: e.angle,
							vehicle: [
								"tank",
								"heavy",
								"artillery",
								"worker",
							].includes(e.type),
							life: 22,
						});
					}
					e.lastTrack = { x: e.x, y: e.y };
				}
				if (
					e.type === "beast" &&
					!e.target &&
					!e.path.length &&
					this.rand() < dt * 0.3
				) {
					const h = e.home || e;
					e.order = {
						kind: "attackMove",
						x: clamp(
							h.x + (this.rand() - 0.5) * 240,
							50,
							this.W - 50,
						),
						y: clamp(
							h.y + (this.rand() - 0.5) * 240,
							50,
							this.H - 50,
						),
					};
					e.path = this.pathTo(e, e.order);
				}
			}
			this.tracks = this.tracks
				.filter((t) => (t.life -= dt) > 0)
				.slice(-900);
			this.fogTimer -= dt;
			if (this.fogTimer <= 0) {
				this.updateVision();
				this.fogTimer = 0.15;
			}
			for (const team of this.humans) this.as(team, () => this.sideTick(dt));
			this.tickWaves();
			this.tickNodes(dt);
			this.tickUnits(dt);
		}
		// Income, production and research of the acting human side.
		sideTick(dt) {
			this.income =
				8 + this.nodes.filter((n) => n.owner === this.me).length * 5;
			this.credits += this.income * dt;
			this.recordIncome("passive", this.income * dt);
			// Legacy queues without a surviving producer wait for a replacement.
			for (const q of this.queue) {
				if (q.producerId != null && !this.get(q.producerId))
					q.producerId = null;
				if (q.producerId == null)
					q.producerId = this.producer(q.type)?.id ?? null;
			}
			const working = new Set();
			for (const q of [...this.queue]) {
				if (working.has(q.producerId)) continue;
				const b = this.get(q.producerId);
				if (!this.isProducer(b) || b.constructionLeft) continue;
				working.add(b.id);
				// productionRate: a doctrine's faster production (doctrine-rules.js), 1 otherwise.
				q.left -= dt * (q.type === "worker" ? 1 : this.power.factor) * (this.productionRate?.() || 1);
				if (q.left <= 0) {
					const point = this.pathTo(b, {
						x: b.x + TYPES[b.type].radius + 40,
						y: b.y + 30,
					}).at(-1) || { x: b.x + 100, y: b.y };
					const e = this.spawn(q.type, this.me, point.x, point.y);
					const dest = b.rally || {
						x: point.x + 40,
						y: point.y + 35,
					};
					e.order = { kind: "move", x: dest.x, y: dest.y };
					e.path = this.pathTo(e, e.order);
					this.queue.splice(this.queue.indexOf(q), 1);
					this.notify(
						`${TYPES[q.type].name} melduje gotowość.`,
						"ready",
					);
				}
			}
			if (this.research && this.ready(this.researchBuilding())) {
				this.research.left -= dt * this.power.factor;
				if (this.research.left <= 0) {
					this.upgrades[this.research.kind] = true;
					this.notify(
						// A research may say itself what its completion brings (`done`).
						RESEARCH[this.research.kind].done ||
						([
							"extraction",
							"assembly",
							"infantryTraining",
							"colony",
							"meteorology",
							"guidance",
							"mobility",
						].includes(this.research.kind)
							? RESEARCH[this.research.kind].name +
									" — badanie ukończone."
							: this.research.kind === "precision"
								? "Optyka aktywna: +15% obrażeń."
								: this.research.kind === "efficiency"
									? "Reaktory dostarczają 90 mocy."
									: this.research.kind === "cargo"
										? "Ładowność robotów zwiększona do 60."
										: this.research.kind === "weapons"
											? "Broń ulepszona: +25% obrażeń."
											: "Pancerz ulepszony: −20% otrzymywanych obrażeń."),
						"research",
					);
					this.research = null;
				}
			}
		}
		tickWaves() {
			if (this.time >= this.nextWave && this.enemyBases().length) {
				this.wave++;
				this.nextWave = this.time + Math.max(35, 65 - this.wave * 3);
				const base = this.hq(1) || this.enemyBases()[0],
					dest = this.hq(0);
				if (dest) {
					for (let i = 0; i < Math.min(4 + this.wave, 13); i++) {
						const type =
							this.wave >= 2 && i % 4 === 0
								? "tank"
								: i % 3 === 0
									? "rocket"
									: "trooper";
						const e = this.spawn(
							type,
							base.team,
							base.x - 90 - this.rand() * 80,
							base.y + 80 + this.rand() * 80,
						);
						e.order = { kind: "attackMove", x: dest.x, y: dest.y };
						e.path = this.pathTo(e, dest);
					}
					this.notify(
						`Desant ${this.wave} (${this.sideName(base.team)}). Wróg zmierza w stronę bazy!`,
						"alarm",
					);
				}
			}
		}
		// Relays: taken by the only side (alliance leader) with units beside them; contested when several are there.
		tickNodes(dt) {
			for (const n of this.nodes) {
				const near = this.entities.filter(
					(e) => e.hp > 0 && TYPES[e.type].speed && dist(e, n) < 100,
				);
				const first = this.humans[0],
					friendly = (e) => this.allied(first, e.team),
					blue = near.some(friendly),
					red = near.some((e) => !friendly(e) && e.team !== 2);
				const rivalTeams = [
					...new Set(
						near
							.filter((e) => !friendly(e) && e.team !== 2)
							.map((e) => this.sideLeader(e.team)),
					),
				];
				const team =
					blue && !red
						? first
						: !blue && rivalTeams.length === 1
							? rivalTeams[0]
							: -1;
				if (team >= 0 && n.owner !== team) {
					if (n.capturing !== team) {
						n.capturing = team;
						n.progress = 0;
					}
					n.progress += dt / 7;
					if (n.progress >= 1) {
						n.owner = team;
						n.progress = 0;
						n.capturing = -1;
						if (this.isHuman(team))
							this.as(team, () => {
								this.captured = true;
								this.notify(`Przekaźnik ${n.name} przejęty. +5 metalu/s`, "capture");
							});
						for (const h of this.humans)
							if (h !== team) this.as(h, () => this.notify(`${this.sideName(team)}: przejęty przekaźnik ${n.name}.`));
					}
				} else if (team === -1 && !blue && !red) {
					n.progress = Math.max(0, n.progress - dt * 0.08);
				}
			}
		}
		// Every unit and building; a human's own units act as that player (economy, fog, messages).
		tickUnits(dt) {
			for (const e of this.entities) {
				if (e.hp <= 0) continue;
				if (this.isHuman(e.team)) this.as(e.team, () => this.unitTick(e, dt));
				else this.unitTick(e, dt);
			}
			this.afterUnits(dt);
		}
		unitTick(e, dt) {
			{
				const s = TYPES[e.type];
				e.cooldown -= dt;
				e.repath -= dt;
				e.hit = Math.max(0, e.hit - dt);
				if (e.constructionLeft > 0) return;
				if (
					e.type === "worker" &&
					["gather", "repair", "gas", "build", "salvage"].includes(e.order?.kind)
				) {
					this.workTick(e, dt);
					return;
				}
				if (this.isHuman(e.team) && e.order?.kind === "attack") {
					const t = this.get(e.order.targetId);
					if (t && !this.isVisibleTo(e.team, t.x, t.y)) {
						const last = e.path.at(-1) || { x: e.x, y: e.y };
						e.order = { kind: "attackMove", x: last.x, y: last.y };
						e.target = null;
					}
				}
				let target =
					e.order?.kind === "attack"
						? this.get(e.order.targetId)
						: this.get(e.target);
				if (
					target &&
					(target.team === e.team || !this.canTarget(e, target))
				)
					target = null;
				const peaceful = e.order?.kind === "move" || !s.damage;
				// A new target when there is none, it ran off, or (WAL-01) a rock hides it — unless ordered to attack it.
				if (!peaceful && (!target || dist(e, target) > s.range + 90 || (e.order?.kind !== "attack" && !this.lineOfFire(e, target)))) {
					let best = Infinity;
					target = null;
					for (const other of this.entities)
						if (
							other.hp > 0 &&
							other.team !== e.team &&
							this.canTarget(e, other) &&
							this.isVisibleTo(e.team, other.x, other.y)
						) {
							const d = dist(e, other);
							if (d >= s.range + 65) continue;
							// WAL-01: one in the clear before one behind a rock.
							const score = d + (this.lineOfFire(e, other) ? 0 : 400);
							if (score < best) {
								best = score;
								target = other;
							}
						}
					if (e.order?.kind === "attack")
						target = this.get(e.order.targetId) || target;
				}
				if (
					peaceful ||
					(target &&
						!this.isVisibleTo(e.team, target.x, target.y))
				)
					target = null;
				e.target = target?.id || null;
				const inRange =
						target &&
						dist(e, target) <= s.range + TYPES[target.type].radius * 0.4,
					clear = inRange && this.lineOfFire(e, target);
				// WAL-01: in range but behind a rock — no shot; a unit ordered to attack goes round it (below), and
				// the player is told why (once in a while, not for every unit).
				if (inRange && !clear && e.order?.kind === "attack" && this.isHuman(e.team) && e.noLine !== target.id) {
					e.noLine = target.id;
					if (!(this.time - (this.noLineNotified ?? -1e9) < 8)) {
						this.noLineNotified = this.time;
						this.as(e.team, () => this.notify(s.speed ? "Cel za skałą — jednostki obchodzą przeszkodę, by mieć czystą linię strzału." : "Cel za skałą — brak linii strzału."));
					}
				}
				if (clear) {
					e.angle = Math.atan2(target.y - e.y, target.x - e.x);
					if (e.cooldown <= 0) {
						e.cooldown = s.cooldown;
						const hit =
								this.accuracy(e) >= 1 ||
								this.rand() < this.accuracy(e),
							missAngle = this.time * 2 + e.id;
						this.effects.push({
							kind: s.threat ? "claw" : "shot",
							x: e.x,
							y: e.y,
							tx: target.x + (hit ? 0 : Math.cos(missAngle) * 65),
							ty: target.y + (hit ? 0 : Math.sin(missAngle) * 65),
							team: e.team,
							rocket:
								e.type === "rocket" || e.type === "artillery",
							// For the 3D board: shots from and at aircraft fly at their height; the
							// bomber drops bombs.
							air: !!s.flying,
							airTarget: !!TYPES[target.type].flying,
							bomb: e.type === "bomber",
							// Ships of the orbital battle fire lasers between their hover heights; the
							// destroyer's spinal gun a long beam.
							ship: !!s.ship,
							shipTarget: !!TYPES[target.type].ship,
							lance: e.type === "lancer",
							life: 0.2,
							maxLife: 0.2,
						});
						const impact = { x: target.x, y: target.y };
						if (hit)
							this.applyDamage(
								e,
								target,
								this.damage(e, target) *
									(e.type === "artillery" &&
									dist(e, target) < 100
										? 0.25
										: 1),
							);
						if (hit && e.type === "artillery") {
							this.effects.push({
								kind: "explosion",
								...impact,
								size: 75,
								life: 0.65,
								maxLife: 0.65,
							});
							for (const other of this.entities)
								if (
									other !== target &&
									other.hp > 0 &&
									other.team !== e.team &&
									this.canTarget(e, other) &&
									dist(other, impact) < 75
								)
									this.applyDamage(
										e,
										other,
										this.damage(e, other) * 0.45,
									);
						}
					}
				} else if (s.speed && e.order?.kind !== "hold") {
					if (target && e.repath <= 0) {
						e.path = this.pathTo(e, target);
						e.repath = 0.8;
					} else if (e.order?.kind === "attack" && !target) {
						e.order = null;
						e.path = [];
					}
					if (e.path.length) {
						const p = e.path[0],
							d = dist(e, p),
							step = s.speed * dt * this.movementFactor(e);
						if (d < step + 3) {
							e.path.shift();
							if (!e.path.length && !target) e.order = null;
						} else {
							const nx = e.x + ((p.x - e.x) / d) * step,
								ny = e.y + ((p.y - e.y) / d) * step;
							e.angle = Math.atan2(p.y - e.y, p.x - e.x);
							// Where the step cuts the corner of a rock or a wall (a waypoint is taken a few pixels early,
							// so the unit's line is not quite the route's), the unit slides along it on one axis;
							// otherwise it could stop there for good.
							if (
								s.flying ||
								!this.blocked(nx, ny, s.radius + 2)
							) {
								e.x = nx;
								e.y = ny;
							} else if (!this.blocked(nx, e.y, s.radius + 2)) {
								e.x = nx;
							} else if (!this.blocked(e.x, ny, s.radius + 2)) {
								e.y = ny;
							} else if (e.repath <= 0) {
								e.path = this.pathTo(e, target || e.order || p);
								e.repath = 0.7;
							}
						}
					}
				}
			}
		}
		// Units pushing apart, the campaign goal, wreckage, craters and effects.
		afterUnits(dt) {
			const alive = this.entities.filter((e) => e.hp > 0);
			for (let i = 0; i < alive.length; i++)
				for (let j = i + 1; j < alive.length; j++) {
					const a = alive[i],
						b = alive[j];
					if (
						TYPES[a.type].flying ||
						TYPES[b.type].flying ||
						(!TYPES[a.type].speed && !TYPES[b.type].speed)
					)
						continue;
					const d = dist(a, b),
						min =
							(TYPES[a.type].radius + TYPES[b.type].radius) *
							0.85;
					if (d < min) {
						const dx = d > 0.01 ? (a.x - b.x) / d : 1,
							dy = d > 0.01 ? (a.y - b.y) / d : 0,
							push = (min - d) * 0.35;
						for (const [e, sign] of [
							[a, 1],
							[b, -1],
						])
							if (TYPES[e.type].speed) {
								const x = e.x + dx * push * sign,
									y = e.y + dy * push * sign;
								if (
									!this.blocked(
										x,
										y,
										TYPES[e.type].radius + 2,
									)
								) {
									e.x = x;
									e.y = y;
								}
							}
					}
				}
			if (
				!this.result &&
				MISSIONS[this.missionId].campaign &&
				!this.hq(1) &&
				this.hq(this.me) &&
				this.campaignReady()
			) {
				this.result = "victory";
				this.notify(
					MISSIONS[this.missionId].name + " — misja ukończona.",
					"victory",
				);
			}
			this.debris.forEach((d) => (d.life -= dt));
			this.debris = this.debris.filter((d) => d.life > 0);
			this.entities = alive;
			// Heavy blasts (large explosions) leave craters for a few minutes.
			for (const ef of this.effects)
				if (ef.kind === "explosion" && ef.crater === undefined) {
					ef.crater = (ef.size || 0) >= 60 && !this.blocked(ef.x, ef.y, 0);
					if (ef.crater) {
						this.craters.push({ x: Math.round(ef.x), y: Math.round(ef.y), size: Math.round(Math.min(40, ef.size * 0.35)), born: this.time, seed: Math.round(ef.x + ef.y) % 7 });
						if (this.craters.length > 60) this.craters.shift();
					}
				}
			if (this.craters.length && this.time - this.craters[0].born > CRATER_LIFE) this.craters = this.craters.filter((k) => this.time - k.born <= CRATER_LIFE);
			this.effects.forEach((e) => (e.life -= dt));
			this.effects = this.effects.filter((e) => e.life > 0);
		}
	}
	for (const key of SIDE_FIELDS)
		Object.defineProperty(Game.prototype, key, {
			configurable: true,
			get() {
				return (this.sides[this.me] ?? this.sides[this.humans[0]])[key];
			},
			set(value) {
				(this.sides[this.me] ?? this.sides[this.humans[0]])[key] = value;
			},
		});
	const api = {
		Game,
		SIDE_FIELDS,
		TYPES,
		RESEARCH,
		MISSIONS,
		W,
		H,
		CELL,
		CRATER_LIFE,
		dist,
		clamp,
		waterRadius,
		waterContains,
	};
	if (typeof module !== "undefined" && module.exports) module.exports = api;
	root.RTS = api;
	if (typeof module !== "undefined" && module.exports)
		require("./advanced-rules.js")(api);
})(typeof window !== "undefined" ? window : globalThis);
