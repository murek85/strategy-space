/* Scenario setup: map seed, presets, rule settings (defence time, relay points, deposits, fauna, weather)
   and the Artifact Expedition mode. Loaded after the other rule modules; shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.scenarioSetupInstalled) return;
		RTS.scenarioSetupInstalled = true;
		const { Game, TYPES, MISSIONS, MODES, dist } = RTS;
		const CELL = RTS.CELL || 40;

		const OPTIONS = (RTS.SCENARIO_OPTIONS = {
			defenseTime: [300, 600, 900, 1200],
			pointsPerRelay: [60, 90, 120, 150],
			resources: {
				poor: { name: "Ubogie", code: "P", factor: 0.65 },
				normal: { name: "Zwykłe", code: "N", factor: 1 },
				rich: { name: "Bogate", code: "R", factor: 1.5 },
			},
			fauna: {
				few: { name: "Nieliczna", code: "F" },
				normal: { name: "Zwykła", code: "N" },
				many: { name: "Liczna", code: "M" },
			},
			// Storm cycle: seconds between storms, first storm, storm length, peak strength.
			weather: {
				calm: { name: "Łagodna", code: "C", period: 300, first: 150, duration: 40, peak: 0.55 },
				normal: { name: "Zwykła", code: "N" },
				harsh: { name: "Surowa", code: "H", period: 150, first: 60, duration: 70, peak: 1 },
			},
			// Length of a full day and night; "day" has no night at all, "night" no day.
			dayLength: {
				short: { name: "Krótka (4 min)", code: "S", period: 240 },
				normal: { name: "Zwykła (6 min)", code: "N", period: 360 },
				long: { name: "Długa (10 min)", code: "L", period: 600 },
				day: { name: "Wieczny dzień", code: "D", period: 0 },
				night: { name: "Wieczna noc", code: "E", period: 0, dark: true },
			},
			startLevel: {
				outpost: { name: "Przyczółek", code: "O" },
				colony: { name: "Kolonia", code: "C" },
			},
			hillTime: [90, 180, 300],
		});
		const SEED_MAX = 999999;
		const DEFAULTS = { difficulty: "normal", players: 2, mode: "conquest", size: "medium", defenseTime: 600, pointsPerRelay: 90, resources: "normal", fauna: "normal", weather: "normal", dayLength: "normal", startLevel: "outpost", hillTime: 180 };
		const PRESETS = (RTS.SCENARIO_PRESETS = {
			standard: {
				name: "Standardowe",
				description: "Zwykłe zasady: Podbój dla dwóch graczy na średniej mapie.",
				settings: { ...DEFAULTS },
			},
			calm: {
				name: "Spokojna ekspansja",
				description: "Łatwy przeciwnik, bogate złoża, nieliczna fauna i łagodna pogoda na dużej mapie — czas na rozbudowę kolonii.",
				settings: { ...DEFAULTS, difficulty: "easy", size: "large", resources: "rich", fauna: "few", weather: "calm" },
			},
			danger: {
				name: "Niebezpieczna planeta",
				description: "Ekspedycja po artefakt wśród licznej fauny, z częstymi i długimi burzami.",
				settings: { ...DEFAULTS, mode: "expedition", fauna: "many", weather: "harsh" },
			},
			war: {
				name: "Wojna o zasoby",
				description: "Czterech graczy, ubogie złoża i szybki wyścig o przekaźniki (60 pkt na przekaźnik) z trudnym przeciwnikiem.",
				settings: { ...DEFAULTS, difficulty: "hard", players: 4, mode: "relays", resources: "poor", pointsPerRelay: 60 },
			},
		});
		const EXPEDITION = (RTS.EXPEDITION = { pickup: 8, radius: 55, slow: 0.7, deliver: 80, guardians: 3, guardianRing: 85, aiStart: 150, aiParty: 3 });

		MODES.expedition = {
			name: "Ekspedycja po artefakt",
			objective: "Przejmij artefakt obcych z wykopaliska i dostarcz go do swojego centrum dowodzenia.",
			description:
				"Artefakt leży w miejscu najdalszym od baz, strzeżony przez faunę. Jednostka naziemna podnosi go w " +
				EXPEDITION.pickup +
				" s, gdy w pobliżu nie ma wroga; niosący porusza się o 30% wolniej i jest zawsze widoczny. Gdy zginie lub wsiądzie do transportera, artefakt upada na ziemię. Przeciwnik również wysyła ekspedycje. Zniszczenie wszystkich wrogich centrów nadal daje zwycięstwo.",
		};

		const pick = (value, list, fallback) => (list.includes(value) ? value : fallback);
		const normalizeSeed = (v) => {
			const n = Math.floor(Number(String(v ?? "").trim() || 0));
			return Number.isFinite(n) && n > 0 ? Math.min(n, SEED_MAX) : 0;
		};
		// Settings added by this module; everything else is validated by the earlier modules.
		function normalize(input = {}) {
			return {
				seed: normalizeSeed(input.seed),
				defenseTime: pick(Number(input.defenseTime), OPTIONS.defenseTime, DEFAULTS.defenseTime),
				pointsPerRelay: pick(Number(input.pointsPerRelay), OPTIONS.pointsPerRelay, DEFAULTS.pointsPerRelay),
				resources: OPTIONS.resources[input.resources] ? input.resources : "normal",
				fauna: OPTIONS.fauna[input.fauna] ? input.fauna : "normal",
				weather: OPTIONS.weather[input.weather] ? input.weather : "normal",
				dayLength: OPTIONS.dayLength[input.dayLength] ? input.dayLength : "normal",
				startLevel: OPTIONS.startLevel[input.startLevel] ? input.startLevel : "outpost",
				hillTime: pick(Number(input.hillTime), OPTIONS.hillTime, DEFAULTS.hillTime),
				teams: input.teams === "duo" ? "duo" : "ffa",
			};
		}
		RTS.normalizeScenarioSettings = normalize;
		RTS.randomSeed = () => 1 + Math.floor(Math.random() * SEED_MAX);
		RTS.presetFor = (s) => {
			const found = Object.entries(PRESETS).find(([, p]) =>
				Object.entries(p.settings).every(([k, v]) => String(s?.[k] ?? DEFAULTS[k]) === String(v)),
			);
			return found ? found[0] : "custom";
		};
		RTS.applyPreset = (s, key) => (PRESETS[key] ? Object.assign(s, PRESETS[key].settings) : s);
		// Objective and description with the chosen timer and point pool.
		RTS.describeScenario = (s = {}) => {
			const mode = MODES[s.mode] ? s.mode : "conquest",
				extra = normalize(s),
				minutes = extra.defenseTime / 60,
				m = MODES[mode];
			if (mode === "defense")
				return {
					objective: `Utrzymaj centrum dowodzenia przez ${minutes} min.`,
					description: m.description.replace("Przetrwaj 10 minut.", `Przetrwaj ${minutes} min.`),
				};
			if (mode === "relays")
				return {
					objective: `Zdobądź punkty kontroli: każdy przekaźnik daje 1 pkt/s. Wygrywa pierwsza strona z pulą ${extra.pointsPerRelay} pkt na przekaźnik na mapie.`,
					description: m.description.replace("90 pkt na przekaźnik", extra.pointsPerRelay + " pkt na przekaźnik"),
				};
			if (mode === "hill")
				return {
					objective: `Utrzymaj Szczyt — centralny przekaźnik — łącznie przez ${extra.hillTime / 60} min.`,
					description: m.description.replace("{time}", extra.hillTime / 60 + " min"),
				};
			return { objective: m.objective, description: m.description };
		};

		// Shareable operation code: map, size+players+difficulty, mode(+setting), deposits+fauna+weather, seed.
		const SIZE = { small: "S", medium: "M", large: "L" },
			DIFF = { easy: "E", normal: "N", hard: "H" },
			letter = (table, key) => table[key],
			byLetter = (table, ch) => Object.keys(table).find((k) => table[k] === ch);
		const codeOf = (table) => Object.fromEntries(Object.entries(table).map(([k, v]) => [k, v.code]));
		RTS.scenarioCode = (missionId, s = {}) => {
			const extra = normalize(s),
				mode = MODES[s.mode] ? s.mode : "conquest",
				modePart =
					mode === "relays" ? "R" + extra.pointsPerRelay : mode === "defense" ? "D" + extra.defenseTime / 60 : mode === "expedition" ? "X" : mode === "hill" ? "H" + extra.hillTime : mode === "survival" ? "V" : mode === "invasion" ? "I" : "C",
				// Day length and start level are added only when they differ from the defaults (older codes stay valid).
				extraLetters = extra.dayLength !== "normal" || extra.startLevel !== "outpost" ? OPTIONS.dayLength[extra.dayLength].code + OPTIONS.startLevel[extra.startLevel].code : "";
			return [
				missionId,
				(letter(SIZE, s.size) || "M") + (s.players || 2) + (letter(DIFF, s.difficulty) || "N"),
				modePart,
				OPTIONS.resources[extra.resources].code + OPTIONS.fauna[extra.fauna].code + OPTIONS.weather[extra.weather].code + extraLetters,
				extra.seed,
			].join("-") + (s.teams === "duo" ? "-T" : "") + (s.enemy === "waves" ? "-W" : "");
		};
		RTS.parseScenarioCode = (code) => {
			const m = /^([a-z0-9]+)-([SML])([234])([ENH])-(C|X|V|I|R\d+|D\d+|H\d+)-([PNR])([FNM])([CNH])(?:([SNLDE])([OC]))?-(\d{1,6})(?:-(T))?(?:-(W))?$/i.exec(String(code || "").trim());
			if (!m) return null;
			const [, missionId, size, players, diff, modePart, res, fauna, weather, day, start, seed, duo, waves] = m;
			if (!MISSIONS[missionId] || MISSIONS[missionId].campaign) return null;
			const up = (s) => s.toUpperCase(),
				kind = up(modePart[0]),
				value = Number(modePart.slice(1)),
				scenario = {
					size: byLetter(SIZE, up(size)),
					players: Number(players),
					difficulty: byLetter(DIFF, up(diff)),
					mode: { C: "conquest", X: "expedition", R: "relays", D: "defense", H: "hill", V: "survival", I: "invasion" }[kind],
					dayLength: day ? byLetter(codeOf(OPTIONS.dayLength), up(day)) : "normal",
					startLevel: start ? byLetter(codeOf(OPTIONS.startLevel), up(start)) : "outpost",
					resources: byLetter(codeOf(OPTIONS.resources), up(res)),
					fauna: byLetter(codeOf(OPTIONS.fauna), up(fauna)),
					weather: byLetter(codeOf(OPTIONS.weather), up(weather)),
					seed: normalizeSeed(seed),
					enemy: waves ? "waves" : "commander",
					teams: duo ? "duo" : "ffa",
				};
			if (kind === "R") {
				if (!OPTIONS.pointsPerRelay.includes(value)) return null;
				scenario.pointsPerRelay = value;
			}
			if (kind === "D") {
				if (!OPTIONS.defenseTime.includes(value * 60)) return null;
				scenario.defenseTime = value * 60;
			}
			if (kind === "H") {
				if (!OPTIONS.hillTime.includes(value)) return null;
				scenario.hillTime = value;
			}
			return { missionId, scenario };
		};

		// Small deterministic generator for the seeded layout, independent of the game's own random stream.
		const generator = (seed) => {
			let a = seed >>> 0;
			return () => {
				a = (a + 0x6d2b79f5) >>> 0;
				let t = a;
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};
		};

		const old = {};
		for (const k of ["configureSkirmish", "modeTick", "modeStatus", "modeResult", "modeObjective", "reinforceWave", "movementFactor"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;
		const weatherGetter = Object.getOwnPropertyDescriptor(Game.prototype, "weather").get;
		const deposits = (g) => [...g.ores, ...g.gasFields, ...g.crystalFields];
		const wildlife = (g) => g.entities.filter((e) => e.team === 2 && e.home && e.hp > 0);
		const hqs = (g) => g.entities.filter((e) => e.type === "hq" && e.hp > 0 && e.team !== 2);
		const mobile = (e) => e.hp > 0 && e.team !== 2 && TYPES[e.type].speed > 0 && !TYPES[e.type].flying;

		Object.defineProperty(Game.prototype, "weather", {
			configurable: true,
			get() {
				const w = weatherGetter.call(this),
					p = OPTIONS.weather[this.scenario?.weather];
				if (!p?.period) return w;
				const elapsed = this.time - p.first,
					cycle = Math.floor(elapsed / p.period),
					phase = elapsed >= 0 ? elapsed % p.period : -1,
					ramp = phase >= 0 && phase < p.duration ? Math.min(1, phase / 12, (p.duration - phase) / 15) : 0;
				return {
					...w,
					intensity: ramp * ramp * (3 - 2 * ramp) * p.peak,
					until: elapsed < 0 ? -elapsed : phase < p.duration ? 0 : p.period - phase,
					remaining: phase >= 0 && phase < p.duration ? p.duration - phase : 0,
					duration: p.duration,
					cycle,
				};
			},
		});

		Object.assign(Game.prototype, {
			configureSkirmish(input = {}) {
				const extra = normalize(input);
				// The seed also decides which corner each side starts in.
				if (extra.seed) this.seed = extra.seed;
				old.configureSkirmish.call(this, input);
				Object.assign(this.scenario, extra);
				this.layoutVaried = extra.seed ? this.varyLayout(extra.seed) : false;
				this.applyScenarioModifiers();
				const s = this.modeState;
				if (s.mode === "relays") s.target = this.nodes.length * extra.pointsPerRelay;
				if (s.mode === "defense") s.duration = extra.defenseTime;
				if (s.mode === "expedition") this.setupExpedition();
				this.explored.fill(0);
				this.updateVision();
				return this.scenario;
			},
			// Cells reachable on foot from a point (same passability test as path finding).
			reachable(from) {
				const cols = this.W / CELL,
					rows = this.H / CELL,
					seen = new Uint8Array(cols * rows),
					free = new Uint8Array(cols * rows);
				for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) free[y * cols + x] = this.blocked((x + 0.5) * CELL, (y + 0.5) * CELL) ? 0 : 1;
				const cell = (p) => Math.min(rows - 1, Math.max(0, Math.floor(p.y / CELL))) * cols + Math.min(cols - 1, Math.max(0, Math.floor(p.x / CELL)));
				let start = cell(from);
				if (!free[start]) {
					const sx = start % cols,
						sy = Math.floor(start / cols);
					for (let r = 1; r < 4 && !free[start]; r++)
						for (let dy = -r; dy <= r; dy++)
							for (let dx = -r; dx <= r; dx++) {
								const x = sx + dx,
									y = sy + dy;
								if (x >= 0 && y >= 0 && x < cols && y < rows && free[y * cols + x]) start = y * cols + x;
							}
				}
				const stack = [start];
				seen[start] = 1;
				while (stack.length) {
					const k = stack.pop(),
						x = k % cols,
						y = Math.floor(k / cols);
					for (let dy = -1; dy <= 1; dy++)
						for (let dx = -1; dx <= 1; dx++) {
							const nx = x + dx,
								ny = y + dy,
								nk = ny * cols + nx;
							if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[nk] || !free[nk]) continue;
							seen[nk] = 1;
							stack.push(nk);
						}
				}
				// A point counts as reachable when its cell or a neighbouring one is.
				return (p) => {
					const k = cell(p),
						x = k % cols,
						y = Math.floor(k / cols);
					for (let dy = -1; dy <= 1; dy++)
						for (let dx = -1; dx <= 1; dx++) {
							const nx = x + dx,
								ny = y + dy;
							if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && seen[ny * cols + nx]) return true;
						}
					return false;
				};
			},
			// Seeded variant of the map: deposits shift, new rocks appear and habitats move.
			// Each attempt is checked (reachable bases, deposits and relays, no worse access to metal and gas); after eight failures the classic layout stays.
			varyLayout(seed) {
				const rand = generator(seed),
					bases = hqs(this),
					relays = this.nodes.length,
					nearest = (list, p, ok = () => true) => Math.min(Infinity, ...list.filter((o) => ok(o)).map((o) => dist(o, p)));
				const before = bases.map((h) => ({ ore: nearest(this.ores, h), gas: nearest(this.gasFields, h) }));
				const snapshot = JSON.stringify({ ores: this.ores, gasFields: this.gasFields, crystalFields: this.crystalFields, obstacles: this.obstacles, nodes: this.nodes }),
					animals = wildlife(this).map((e) => ({ e, x: e.x, y: e.y, home: { ...e.home } }));
				const inside = (p, m) => p.x > m && p.y > m && p.x < this.W - m && p.y < this.H - m;
				for (let attempt = 0; attempt < 8; attempt++) {
					for (const o of deposits(this)) {
						o.amount = Math.round(o.amount * (0.85 + rand() * 0.3));
						// Deposits next to a base move only a little and never further from it.
						const home = bases.find((b) => dist(b, o) < 520);
						for (let i = 0; i < 12; i++) {
							const a = rand() * Math.PI * 2,
								r = home ? 40 + rand() * 80 : 90 + rand() * 170,
								p = { x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r };
							if (
								inside(p, 150) &&
								(!home || dist(home, p) <= dist(home, o) + 30) &&
								!this.blocked(p.x, p.y, 70) &&
								this.entities.every((e) => dist(e, p) > TYPES[e.type].radius + 100) &&
								deposits(this).every((d) => d === o || dist(d, p) > 220)
							) {
								o.x = p.x;
								o.y = p.y;
								break;
							}
						}
					}
					const rocks = 2 + Math.floor(rand() * 3);
					for (let n = 0, tries = 0; n < rocks && tries < 80; tries++) {
						const w = 90 + Math.round(rand() * 90),
							h = 80 + Math.round(rand() * 80),
							c = { x: 200 + rand() * (this.W - 400), y: 200 + rand() * (this.H - 400) },
							reach = Math.max(w, h) / 2;
						if (
							this.blocked(c.x, c.y, reach + 60) ||
							bases.some((b) => dist(b, c) < 650) ||
							deposits(this).some((d) => dist(d, c) < 230 + reach) ||
							this.entities.some((e) => dist(e, c) < 200 + reach) ||
							this.obstacles.some((r) => c.x > r.x - reach - 120 && c.x < r.x + r.w + reach + 120 && c.y > r.y - reach - 120 && c.y < r.y + r.h + reach + 120)
						)
							continue;
						this.obstacles.push({ x: Math.round(c.x - w / 2), y: Math.round(c.y - h / 2), w, h });
						n++;
					}
					for (const { e } of animals)
						for (let i = 0; i < 30; i++) {
							const p = { x: 250 + rand() * (this.W - 500), y: 250 + rand() * (this.H - 500) };
							if (
								!this.blocked(p.x, p.y, 60) &&
								bases.every((b) => dist(b, p) > 700) &&
								deposits(this).every((d) => dist(d, p) > 180) &&
								this.entities.every((o) => o === e || (o.team === 2 ? dist(o, p) > 160 : dist(o, p) > 250))
							) {
								Object.assign(e, { x: p.x, y: p.y, home: { ...p }, path: [], order: null });
								break;
							}
						}
					this.clusterRelays();
					const reach = this.reachable(bases[0]),
						valid =
							this.nodes.length === relays &&
							bases.every((b) => reach(b)) &&
							this.nodes.every((n) => reach(n)) &&
							bases.every((b, i) => nearest(this.ores, b, reach) <= before[i].ore + 150 && nearest(this.gasFields, b, reach) <= before[i].gas + 200) &&
							this.entities.every((e) => !this.blocked(e.x, e.y, 8));
					if (valid) {
						for (const w of this.units(0).filter((e) => e.type === "worker" && e.order?.kind === "gather"))
							this.gather([w.id], [...this.ores].sort((a, b) => dist(w, a) - dist(w, b))[0].id);
						return true;
					}
					const saved = JSON.parse(snapshot);
					Object.assign(this, saved);
					for (const a of animals) Object.assign(a.e, { x: a.x, y: a.y, home: { ...a.home } });
				}
				return false;
			},
			applyScenarioModifiers() {
				const s = this.scenario,
					factor = OPTIONS.resources[s.resources].factor;
				if (factor !== 1) for (const o of deposits(this)) o.amount = Math.round(o.amount * factor);
				const animals = wildlife(this);
				if (s.fauna === "few") {
					const gone = new Set(animals.filter((e, i) => i % 2 === 1));
					this.entities = this.entities.filter((e) => !gone.has(e));
				}
				if (s.fauna === "many") {
					const rand = generator((s.seed || this.seed) + 7919),
						bases = hqs(this),
						kinds = animals.length ? animals.map((e) => e.type) : ["beast"];
					for (let n = 0, tries = 0; n < Math.max(2, Math.ceil(animals.length / 2)) && tries < 200; tries++) {
						const p = { x: 250 + rand() * (this.W - 500), y: 250 + rand() * (this.H - 500) };
						if (
							this.blocked(p.x, p.y, 60) ||
							bases.some((b) => dist(b, p) < 700) ||
							deposits(this).some((d) => dist(d, p) < 180) ||
							this.entities.some((o) => dist(o, p) < (o.team === 2 ? 220 : 300))
						)
							continue;
						const type = kinds[n % kinds.length],
							e = this.spawn(type, 2, p.x, p.y);
						e.home = { ...p };
						if (TYPES[type].threat) e.species = TYPES[type].name;
						n++;
					}
				}
			},
			// The excavation site: reachable, clear ground as far as possible from every base, preferring equal distances.
			setupExpedition() {
				const bases = hqs(this),
					reach = this.reachable(bases[0]);
				let best = null;
				for (let y = 220; y < this.H - 220; y += 80)
					for (let x = 220; x < this.W - 220; x += 80) {
						const p = { x, y };
						if (this.blocked(x, y, 80) || !reach(p) || deposits(this).some((d) => dist(d, p) < 170) || this.nodes.some((n) => dist(n, p) < 140) || this.entities.some((e) => dist(e, p) < 120)) continue;
						const d = bases.map((b) => dist(b, p)),
							score = Math.min(...d) - 0.35 * (Math.max(...d) - Math.min(...d));
						if (!best || score > best.score) best = { ...p, score };
					}
				best ??= { x: this.W / 2, y: this.H / 2 };
				this.modeState.artifact = { x: best.x, y: best.y, site: { x: best.x, y: best.y }, carrier: null, team: -1, claimant: -1, progress: 0, aiClock: 0, aiSent: false };
				// Guardians: the map's own dangerous species, or its classic biome counterpart.
				const biome = MISSIONS[this.missionId].biome,
					type = this.entities.find((e) => e.team === 2 && TYPES[e.type].threat)?.type || (biome === "dust" ? "duneMaw" : biome === "ice" ? "frostTusk" : "ashCrawler");
				for (let i = 0, placed = 0; i < 12 && placed < EXPEDITION.guardians; i++) {
					// Spread around the site: 0°, 150°, 300°, 90°, …
					const a = (((i * 5) % 12) / 12) * Math.PI * 2 + 0.4,
						p = { x: best.x + Math.cos(a) * EXPEDITION.guardianRing, y: best.y + Math.sin(a) * EXPEDITION.guardianRing };
					if (this.blocked(p.x, p.y, 50) || this.entities.some((e) => e.team === 2 && dist(e, p) < 80)) continue;
					const e = this.spawn(type, 2, p.x, p.y);
					e.home = { ...p };
					e.species = TYPES[type].name;
					e.guardian = true;
					placed++;
				}
			},
			artifactCarrier() {
				const a = this.modeState?.artifact;
				return a?.carrier != null ? this.get(a.carrier) || null : null;
			},
			nearestHq(team, p) {
				return hqs(this)
					.filter((h) => h.team === team)
					.sort((a, b) => dist(a, p) - dist(b, p))[0];
			},
			expeditionTick(dt) {
				const s = this.modeState,
					a = s.artifact,
					X = EXPEDITION;
				let carrier = this.artifactCarrier();
				if (a.carrier != null && (!carrier || carrier.hp <= 0)) {
					const lost = a.team;
					this.announce((h) => (this.allied(h, lost) ? ["Utraciliśmy artefakt — leży na ziemi. Odzyskaj go!", "alarm"] : ["Niosący artefakt padł — artefakt leży na ziemi.", "ready"]));
					a.carrier = null;
					a.team = -1;
					a.claimant = -1;
					a.progress = 0;
					carrier = null;
					this.fx("artifact", a.x, a.y);
				}
				if (carrier) {
					a.x = carrier.x;
					a.y = carrier.y;
					carrier.revealedUntil = this.time + 1;
					carrier.stealth = false;
					const home = this.nearestHq(carrier.team, carrier);
					if (home && dist(home, carrier) < TYPES.hq.radius + X.deliver) {
						// A delivery by the player's ally is a shared victory (kept for the first human's side).
						const ours = this.allied(this.humans[0] ?? 0, carrier.team),
							by = carrier.team;
						s.outcome = ours ? "artifact-won" : "artifact-lost";
						s.winner = by;
						this.result = ours ? "victory" : "defeat";
						this.announce((h, r) => (r === "victory" ? [by === h ? "Artefakt w centrum dowodzenia — ekspedycja zakończona sukcesem." : "Sojusznik dowiózł artefakt do swojej bazy — wspólne zwycięstwo.", "victory"] : [this.sideName(by) + " dostarcza artefakt do swojej bazy.", "defeat"]));
						return;
					}
				} else {
					const near = this.entities.filter((e) => mobile(e) && dist(e, a) < X.radius),
						teams = [...new Set(near.map((e) => this.sideLeader(e.team)))];
					if (teams.length === 1) {
						if (a.claimant !== teams[0]) {
							a.claimant = teams[0];
							a.progress = 0;
						}
						a.progress += dt;
						if (a.progress >= X.pickup) {
							const e = near.filter((u) => this.sideLeader(u.team) === teams[0]).sort((p, q) => dist(p, a) - dist(q, a))[0];
							a.carrier = e.id;
							this.fx("artifact", a.x, a.y);
							a.team = e.team;
							a.progress = 0;
							this.announce((h) => (e.team === h ? [`${TYPES[e.type].name} niesie artefakt. Doprowadź go do centrum dowodzenia.`, "ready"] : this.allied(h, e.team) ? [this.sideName(e.team) + " niesie artefakt — osłaniaj go!", "ready"] : [this.sideName(e.team) + " przejmuje artefakt!", "alarm"]));
							if (!this.isHuman(e.team)) this.steerExpedition(true);
						}
					} else if (!teams.length) a.progress = Math.max(0, a.progress - dt);
				}
				if ((a.aiClock -= dt) <= 0) this.steerExpedition();
			},
			// Enemy expeditions: from EXPEDITION.aiStart a party of the garrison, then two thirds of every wave go for the artifact or its carrier.
			steerExpedition(now = false) {
				const a = this.modeState.artifact,
					carrier = this.artifactCarrier();
				a.aiClock = 2;
				// Only the computer's sides are steered (network play: a human rival leads its own expedition).
				const rivals = [...new Set(this.enemyBases().map((b) => b.team))].filter((t) => !this.isHuman(t));
				if (!a.aiSent && this.time >= EXPEDITION.aiStart) {
					a.aiSent = true;
					for (const t of rivals) {
						const h = this.nearestHq(t, a);
						this.entities
							.filter((e) => e.team === t && mobile(e) && e.type !== "worker" && !e.expedition)
							.sort((p, q) => dist(p, h) - dist(q, h))
							.slice(0, EXPEDITION.aiParty)
							.forEach((e) => (e.expedition = true));
					}
				}
				for (const e of this.entities) {
					if (!e.expedition || e.hp <= 0 || this.isHuman(e.team) || e.team === 0 || e.team === 2) continue;
					if (carrier === e) {
						const h = this.nearestHq(e.team, e);
						if (h && (e.order?.kind !== "move" || dist(e.order, h) > 5 || now)) {
							e.order = { kind: "move", x: h.x, y: h.y };
							e.path = this.pathTo(e, h);
						}
						continue;
					}
					const goal = carrier || a;
					if (e.target && !now) continue;
					if (!e.order || e.order.kind !== "attackMove" || dist(e.order, goal) > 90) {
						e.order = { kind: "attackMove", x: goal.x, y: goal.y };
						e.path = this.pathTo(e, goal);
					}
				}
			},
			reinforceWave() {
				const fresh =
					this.modeState?.mode === "expedition" && this.time >= EXPEDITION.aiStart
						? this.entities.filter((e) => e.team !== 0 && e.team !== 2 && !this.isHuman(e.team) && TYPES[e.type].speed && e.order?.kind === "attackMove" && !e.modeTagged)
						: [];
				old.reinforceWave.call(this);
				fresh.forEach((e, i) => {
					if (i % 3 !== 2) e.expedition = true;
				});
				if (fresh.length) this.steerExpedition(true);
			},
			modeTick(dt) {
				old.modeTick.call(this, dt);
				if (!this.result && this.modeState?.mode === "expedition" && this.modeState.artifact) this.expeditionTick(dt);
			},
			movementFactor(e) {
				const n = old.movementFactor.call(this, e);
				return this.modeState?.artifact?.carrier === e.id ? n * EXPEDITION.slow : n;
			},
			modeObjective() {
				return this.scenario ? RTS.describeScenario(this.scenario).objective : old.modeObjective.call(this);
			},
			modeStatus() {
				const s = this.modeState;
				if (s?.mode !== "expedition" || !s.artifact) return old.modeStatus.call(this);
				const a = s.artifact,
					carrier = this.artifactCarrier(),
					home = this.nearestHq(this.me, a);
				if (carrier) {
					const h = this.nearestHq(carrier.team, carrier);
					return `Artefakt niesie: ${this.sideName(carrier.team)} (${TYPES[carrier.type].name}) · do centrum ${h ? Math.round(dist(h, carrier)) : "—"}`;
				}
				const where = dist(a, a.site) < 1 ? "na wykopalisku" : "porzucony";
				return `Artefakt ${where} · ${home ? Math.round(dist(home, a)) + " od Twojego centrum" : ""}${a.progress > 0 ? ` · podnosi ${this.sideName(a.claimant)}: ${Math.floor(a.progress)}/${EXPEDITION.pickup} s` : ""}`;
			},
			modeResult() {
				const s = this.modeState;
				if (s?.outcome === "artifact-won" || s?.outcome === "artifact-lost")
					return this.resultFor(this.me) === "victory"
						? "Artefakt obcych dotarł do centrum dowodzenia. Badacze Twojej strony przejmują znalezisko."
						: this.sideName(s.winner) + ": artefakt wywieziony do bazy przeciwnika. Przechwytuj niosącego, zanim dotrze do celu.";
				return old.modeResult.call(this);
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			if (g.scenario) {
				Object.assign(g.scenario, normalize(g.scenario));
				const s = g.modeState;
				if (s?.mode === "expedition") {
					const a = s.artifact;
					if (
						!a ||
						![a.x, a.y, a.progress, a.team, a.claimant].every(Number.isFinite) ||
						!a.site ||
						![a.site.x, a.site.y].every(Number.isFinite) ||
						(a.carrier != null && !Number.isFinite(a.carrier))
					)
						throw Error("Uszkodzony zapis ekspedycji");
					a.aiClock = Number.isFinite(a.aiClock) ? a.aiClock : 0;
					a.aiSent = !!a.aiSent;
				}
			}
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
