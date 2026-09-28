/* Scenario, faction, aviation and connected fortification rules. Shared by browser and tests. */
(function (root) {
	const install = (RTS) => {
		const { Game, TYPES, dist, clamp } = RTS;
		RTS.FACTIONS = {
			colonies: {
				name: "Wolne Kolonie",
				cost: 0.9,
				hp: 0.92,
				speed: 1.12,
				damage: 1,
				description:
					"Mobilność +12%, koszt −10%, wytrzymałość −8%. Unikalny zwiadowca; regeneracja poza walką.",
			},
			dominion: {
				name: "Dominium",
				cost: 1.12,
				hp: 1.18,
				speed: 0.88,
				damage: 1.08,
				description:
					"Wytrzymałość +18%, obrażenia +8%, koszt +12%, ruch −12%. Unikalny bastion; redukcja ostrzału w bezruchu.",
			},
		};
		RTS.PLAYER_COLORS = [
			"#b0efd0",
			"#72b7ff",
			"#d3a0ff",
			"#f0cb70",
			"#f59caf",
		];
		Object.assign(TYPES, {
			battery: {
				name: "Akumulator energii",
				hp: 850,
				speed: 0,
				range: 0,
				damage: 0,
				cost: 220,
				radius: 38,
				construction: 16,
			},
			workshop: {
				name: "Warsztat polowy",
				hp: 1000,
				speed: 0,
				range: 0,
				damage: 0,
				cost: 260,
				radius: 45,
				construction: 18,
			},
			hangar: {
				name: "Hangar lotniczy",
				hp: 1250,
				speed: 0,
				range: 0,
				damage: 0,
				cost: 350,
				radius: 53,
				construction: 22,
			},
			interceptor: {
				name: "Myśliwiec",
				hp: 240,
				speed: 180,
				range: 240,
				damage: 22,
				cooldown: 0.65,
				cost: 260,
				build: 14,
				radius: 17,
				flying: true,
			},
			bomber: {
				name: "Bombowiec",
				hp: 420,
				speed: 100,
				range: 190,
				damage: 65,
				cooldown: 2.2,
				cost: 390,
				build: 20,
				radius: 24,
				flying: true,
			},
			raider: {
				name: "Zwiadowca Kolonii",
				hp: 160,
				speed: 145,
				range: 185,
				damage: 17,
				cooldown: 0.8,
				cost: 120,
				build: 7,
				radius: 12,
				faction: "colonies",
			},
			sentinel: {
				name: "Bastion Dominium",
				hp: 480,
				speed: 60,
				range: 210,
				damage: 35,
				cooldown: 1.5,
				cost: 230,
				build: 12,
				radius: 20,
				faction: "dominion",
			},
		});

		Object.assign(TYPES, {
			duneMaw: {
				name: "Paszczak wydmowy",
				hp: 1500,
				speed: 0,
				range: 115,
				damage: 48,
				cooldown: 2.4,
				radius: 42,
				threat: true,
			},
			frostTusk: {
				name: "Rogacz lodowy",
				hp: 620,
				speed: 58,
				range: 36,
				damage: 30,
				cooldown: 1.7,
				radius: 22,
				threat: true,
			},
			ashCrawler: {
				name: "Pajęczak bazaltowy",
				hp: 420,
				speed: 78,
				range: 32,
				damage: 24,
				cooldown: 1.3,
				radius: 19,
				threat: true,
			},
		});
		RTS.RESEARCH.colony = {
			name: "Centrum II — Kolonia",
			building: "hq",
			metal: 300,
			gas: 50,
			crystals: 0,
			time: 30,
			description:
				"Awans Przyczółka do Kolonii. Odblokowuje fabrykę, laboratorium, hangar i warsztat. Roboty nadal powstają podczas rozbudowy.",
		};
		Object.assign(RTS.RESEARCH, {
			extraction: {
				name: "Narzędzia wydobywcze",
				building: "depot",
				metal: 180,
				gas: 30,
				crystals: 0,
				time: 25,
				description:
					"Kolonia: +25% rudy i kryształów na cykl wydobycia. Złoże ubywa o pobraną ilość; transport i gaz bez zmian.",
			},
			assembly: {
				name: "Montaż modułowy",
				building: "lab",
				metal: 200,
				gas: 40,
				crystals: 20,
				time: 30,
				description:
					"Kolonia: roboty wykonują budowę o 25% szybciej. Bez premii do ruchu, napraw i produkcji jednostek.",
			},
			infantryTraining: {
				name: "Szkolenie manewrowe",
				building: "barracks",
				metal: 180,
				gas: 35,
				crystals: 0,
				time: 25,
				description:
					"Kolonia: piechota i rakietowcy poruszają się o 10% szybciej. Premia łączy się z wpływem frakcji i pogody.",
			},
		});
		RTS.MISSIONS.training = {
			name: "Szkolenie · Próba kolonii",
			planet: "Eos — Poligon Liry",
			biome: "dust",
			sunny: true,
			mirror: "none",
			campaign: true,
			training: true,
			description:
				"Lira przygotowuje załogę do wyprawy. Na bezpiecznym poligonie rozwiń Przyczółek, zbadaj trzy specjalizacje, sprawdź rezerwowe zasilanie i napraw pojazd. Bez desantów i obowiązku niszczenia bazy.",
			objective:
				"Wykonaj pięć etapów szkolenia. Wskazówki i postęp w panelu celów. 1800 metalu na start; gaz i kryształy trzeba wydobyć.",
		};
		RTS.WORKSHOP_VEHICLES = new Set([
			"worker",
			"tank",
			"heavy",
			"artillery",
			"raider",
			"sentinel",
			"transport",
		]);
		TYPES.worker.range = 115;
		TYPES.worker.damage = 6;
		TYPES.worker.cooldown = 1.1;
		const original = {};
		for (const k of [
			"configureMission",
			"spawn",
			"serialize",
			"fromSave",
			"productionType",
			"isProducer",
			"enqueue",
			"cancelQueue",
			"damage",
			"movementFactor",
			"pathTo",
			"canBuild",
			"buildStructure",
			"workTick",
			"moveWorker",
			"tick",
			"applyDamage",
		])
			original[k] = k === "fromSave" ? Game[k] : Game.prototype[k];
		Object.assign(RTS.MISSIONS.colony1, {
			name: "I · Iskra na Eos",
			planet: "Eos — Stacja Ciszy",
			description:
				"Inżynierka Lira przetrwała wyłączenie latarni. Lądujesz na skraju kotliny Eos. Odbuduj zasilanie i laboratorium, przejmij dwie stacje łączności i usuń garnizon, zanim sygnał zamilknie. Z odszyfrowanych danych poznasz drogę do archiwum na Vesperze.",
		});
		Object.assign(RTS.MISSIONS.colony2, {
			name: "II · Archiwum pod lodem",
			planet: "Vesper — Lodowe Wrota",
			description:
				"Dane Liry prowadzą do zapomnianego archiwum na Vesperze. Dominium odcięło szlak zaopatrzenia między lodowymi jeziorami. Zabezpiecz dwa przekaźniki i dwa magazyny, a następnie odbierz port. W archiwum czeka klucz do sieci oraz prawda: blackout miał zmusić Kolonie do kapitulacji.",
		});
		Object.assign(RTS.MISSIONS.colony3, {
			name: "III · Świt nad Nadir",
			planet: "Nadir — Cytadela Węzła",
			description:
				"Klucz z Vesperu może przywrócić zasilanie całemu pograniczu. Musisz przejąć węzły sieci przy złożach na Nadirze i rozbić centrum blokady. Lira potrzebuje czasu: przygotuj ciężką maszynę i artylerię. Zwycięstwo zapali latarnie i otworzy szlak dla transportów pomocy.",
		});
		Object.assign(Game.prototype, {
			setupTraining() {
				this.upgrades.colony = false;
				this.training = {
					phase: 0,
					blackout: 0,
					support: 0,
					repaired: 0,
					targetId: null,
				};
				this.credits = 1800;
				this.gas = 0;
				this.crystals = 0;
				this.nextWave = 999999;
				this.entities = this.entities.filter((e) => e.team === 0);
				const h = this.hq(0),
					dx = 440 - h.x,
					dy = 440 - h.y;
				for (const e of this.entities) {
					e.x += dx;
					e.y += dy;
					e.path = [];
					e.order = null;
				}
				this.obstacles = [
					{ x: 1200, y: 850, w: 190, h: 300 },
					{ x: 1650, y: 350, w: 240, h: 160 },
				];
				this.waters = [{ x: 1800, y: 1300, rx: 270, ry: 180 }];
				this.ores = [{ id: 1, x: 640, y: 570, amount: 16000 }];
				this.gasFields = [{ id: 1, x: 670, y: 270, amount: 5000 }];
				this.crystalFields = [{ id: 1, x: 260, y: 670, amount: 5000 }];
				this.nodes = [
					{
						x: 850,
						y: 730,
						owner: 0,
						progress: 1,
						capturing: -1,
						name: "POLIGON",
					},
				];
				for (const w of this.units(0).filter(
					(e) => e.type === "worker",
				))
					this.gather([w.id], 1);
				this.explored.fill(0);
				this.updateVision();
			},
			trainingStatus() {
				const t = this.training;
				if (!t) return "";
				const lessons = [
					"Zbuduj ekstraktor na gazie i przydziel robota PPM. Zbierz 50 gazu, następnie BADANIA → Centrum II — Kolonia (300 metalu).",
					"Zbuduj magazyn i laboratorium. Robotem PPM wydobywaj kryształy. Zbadaj Narzędzia wydobywcze, Montaż modułowy i Szkolenie manewrowe (BADANIA / F2).",
					"Zbuduj reaktor, warsztat i akumulator. Zgromadź co najmniej 300 energii. Laboratorium musi pozostać gotowe. Lira odłączy reaktory na 8 s.",
					"Próba awarii: reaktory odłączone na " +
						Math.ceil(t.blackout) +
						" s. Utrzymaj akumulator; wsparcie sieci " +
						Math.floor(t.support) +
						"/40 energii.",
					"Warsztat ma naprawić 60 PW pojazdu testowego. Przestaw pojazd w jego zasięg w razie potrzeby; zapewnij metal. Naprawiono " +
						Math.floor(t.repaired) +
						"/60 PW.",
					"Próba ukończona — kolonia gotowa do samodzielnej operacji.",
				];
				return (
					"Etap " +
					Math.min(5, t.phase + 1) +
					"/5 · " +
					lessons[t.phase]
				);
			},
			trainingTick(dt) {
				const t = this.training;
				if (!t || this.result) return;
				this.nextWave = this.time + 999999;
				const phase = t.phase;
				if (t.phase === 0 && this.upgrades.colony) t.phase = 1;
				else if (
					t.phase === 1 &&
					["extraction", "assembly", "infantryTraining"].every(
						(k) => this.upgrades[k],
					)
				)
					t.phase = 2;
				else if (
					t.phase === 2 &&
					this.ready("reactor") &&
					this.ready("lab") &&
					this.ready("workshop") &&
					this.power.energy >= 300
				) {
					t.phase = 3;
					t.blackout = 8;
					t.support = 0;
				} else if (t.phase === 3) {
					t.blackout = Math.max(0, t.blackout - dt);
					if (!t.blackout) {
						if (t.support >= 40) {
							t.phase = 4;
						} else {
							t.phase = 2;
							this.notify(
								"Próba do powtórzenia: zapewnij zapas energii i pobór mocy (laboratorium + warsztat).",
							);
						}
					}
				}
				if (t.phase === 4) {
					let target = this.get(t.targetId);
					if (!target || target.hp <= 0) {
						const b = this.ready("workshop");
						if (b) {
							const p = Array.from({ length: 16 }, (_, i) => ({
								x: b.x + Math.cos((i * Math.PI) / 8) * 120,
								y: b.y + Math.sin((i * Math.PI) / 8) * 120,
							})).find((p) => !this.blocked(p.x, p.y, 24));
							if (p) {
								target = this.spawn("tank", 0, p.x, p.y);
								target.hp = target.maxHp - 180;
								target.order = { kind: "hold" };
								t.targetId = target.id;
								t.repaired = 0;
							}
						}
					}
					if (
						target &&
						t.repaired < 60 &&
						target.hp >= target.maxHp - 1
					)
						target.hp = Math.max(1, target.maxHp - 100);
					if (t.repaired >= 60) t.phase = 5;
				}
				if (t.phase !== phase)
					this.notify("Lira: " + this.trainingStatus());
			},
			centerLevel() {
				return this.upgrades.colony ? 2 : 1;
			},
			developmentRequirement(type) {
				return ["factory", "lab", "hangar", "workshop"].includes(
					type,
				) && this.centerLevel() < 2
					? "Wymaga centrum II — Kolonia (BADANIA lub ROZWÓJ / F2)"
					: "";
			},
			configureMission() {
				original.configureMission.call(this);
				if (this.missionId === "training") {
					this.setupTraining();
					return;
				}
				if (!RTS.MISSIONS[this.missionId].campaign) return;
				this.upgrades.colony = true;
				const chapter = Number(this.missionId.slice(-1)),
					bases =
						chapter === 1
							? [
									[460, 1710],
									[2780, 440],
								]
							: chapter === 2
								? [
										[460, 440],
										[2790, 1720],
									]
								: [
										[480, 1100],
										[2850, 1100],
									];
				for (const team of [0, 1]) {
					const old = this.hq(team),
						dx = bases[team][0] - old.x,
						dy = bases[team][1] - old.y;
					for (const e of this.entities.filter(
						(e) => e.team === team,
					)) {
						e.x += dx;
						e.y += dy;
						e.path = [];
					}
				}
				this.nodes.forEach((n, i) => {
					const points =
						chapter === 1
							? [
									[980, 1460],
									[1560, 1020],
									[2150, 650],
									[2440, 1590],
								]
							: chapter === 2
								? [
										[960, 560],
										[1550, 1100],
										[2240, 1640],
										[2520, 700],
									]
								: [
										[1050, 560],
										[1050, 1610],
										[2100, 560],
										[2100, 1610],
									];
					[n.x, n.y] = points[i];
				});
				this.obstacles =
					chapter === 1
						? [
								{ x: 1150, y: 300, w: 180, h: 390 },
								{ x: 650, y: 700, w: 280, h: 170 },
								{ x: 1700, y: 1350, w: 190, h: 360 },
								{ x: 2520, y: 950, w: 260, h: 180 },
							]
						: chapter === 2
							? [
									{ x: 820, y: 1100, w: 210, h: 510 },
									{ x: 1900, y: 350, w: 220, h: 500 },
									{ x: 1400, y: 1680, w: 260, h: 200 },
								]
							: [
									{ x: 1420, y: 300, w: 330, h: 420 },
									{ x: 1420, y: 1460, w: 330, h: 400 },
									{ x: 2250, y: 900, w: 160, h: 330 },
								];
				this.waters =
					chapter === 1
						? [{ x: 1850, y: 420, rx: 230, ry: 140 }]
						: chapter === 2
							? [
									{ x: 1300, y: 750, rx: 240, ry: 160 },
									{ x: 1870, y: 1430, rx: 230, ry: 140 },
								]
							: [{ x: 1750, y: 1020, rx: 160, ry: 180 }];
				const h = this.hq(0);
				this.ores.forEach((o, i) => {
					const pts = [
						[h.x + 170, h.y + 170],
						[980, 1000],
						[2250, 450],
						[2620, 1500],
						[2050, 1850],
					];
					[o.x, o.y] = pts[i];
				});
				this.gasFields.forEach((o, i) => {
					[o.x, o.y] = [
						[h.x - 230, h.y + 60],
						[1400, 1100],
						[3000, 880],
					][i];
				});
				this.crystalFields.forEach((o, i) => {
					[o.x, o.y] = [
						[h.x + 240, h.y - 160],
						[1150, 1900],
						[2360, 1850],
						[2940, 1040],
					][i];
				});
				for (const e of this.entities.filter((e) => e.team === 2)) {
					e.x = 2400 + (e.id % 3) * 160;
					e.y = 1750 + (e.id % 2) * 160;
					e.home = { x: e.x, y: e.y };
				}
				this.placeCornerBases();
				this.clusterRelays();
				this.explored.fill(0);
				this.updateVision();
			},
			placeCornerBases() {
				const corners = [
						[420, 400],
						[this.W - 420, 400],
						[this.W - 420, this.H - 400],
						[420, this.H - 400],
					],
					offset =
						(this.seed +
							Array.from(this.missionId).reduce(
								(n, c) => n + c.charCodeAt(0),
								0,
							)) %
						4,
					order = [
						offset,
						(offset + 2) % 4,
						(offset + 1) % 4,
						(offset + 3) % 4,
					];
				const teams = [0, 1, 3, 4].filter((team) => this.hq(team));
				teams.forEach((team, i) => {
					const h = this.hq(team),
						[x, y] = corners[order[i]],
						dx = x - h.x,
						dy = y - h.y;
					for (const e of this.entities.filter(
						(e) => e.team === team,
					)) {
						e.x = clamp(e.x + dx, 90, this.W - 90);
						e.y = clamp(e.y + dy, 90, this.H - 90);
						e.path = [];
					}
				});
				const bases = teams.map((team) => this.hq(team));
				this.obstacles = this.obstacles.filter(
					(r) =>
						!bases.some(
							(b) =>
								b.x > r.x - 330 &&
								b.x < r.x + r.w + 330 &&
								b.y > r.y - 330 &&
								b.y < r.y + r.h + 330,
						),
				);
				this.waters = this.waters.filter(
					(w) =>
						!bases.some(
							(b) =>
								Math.hypot(
									(b.x - w.x) / (w.rx + 340),
									(b.y - w.y) / (w.ry + 340),
								) < 1,
						),
				);
				// Keep the initial economy within reach of each corner base, with identical starting deposits.
				for (const b of bases) {
					const sx = b.x < this.W / 2 ? 1 : -1,
						sy = b.y < this.H / 2 ? 1 : -1;
					for (const [list, dx, dy, amount] of [
						[this.ores, 200, 140, 4000],
						[this.gasFields, 250, -160, 1800],
						[this.crystalFields, -170, 240, 900],
					]) {
						const point = { x: b.x + sx * dx, y: b.y + sy * dy };
						const existing = list.find((o) => dist(o, point) < 110);
						if (existing) {
							existing.x = point.x;
							existing.y = point.y;
							existing.amount = amount;
						} else
							list.push({
								id: Math.max(0, ...list.map((o) => o.id)) + 1,
								...point,
								amount,
							});
					}
				}
				for (const e of this.entities.filter((e) => e.team === 2))
					if (bases.some((b) => dist(b, e) < 500)) {
						e.x = this.W / 2 + ((e.id % 3) - 1) * 180;
						e.y = this.H / 2 + 350;
						e.home = { x: e.x, y: e.y };
					}
				const deposits = [
					...this.ores,
					...this.gasFields,
					...this.crystalFields,
				];
				for (const o of deposits)
					if (
						this.entities.some(
							(e) =>
								e.team !== 2 &&
								dist(e, o) < TYPES[e.type].radius + 65,
						)
					) {
						const base = bases.reduce((a, b) =>
							dist(a, o) < dist(b, o) ? a : b,
						);
						let done = false;
						for (const radius of [260, 300, 330]) {
							for (let i = 0; i < 24; i++) {
								const p = {
									x:
										base.x +
										Math.cos((i * Math.PI) / 12) * radius,
									y:
										base.y +
										Math.sin((i * Math.PI) / 12) * radius,
								};
								if (
									!this.blocked(p.x, p.y, 45) &&
									!this.entities.some(
										(e) =>
											dist(e, p) <
											TYPES[e.type].radius + 70,
									) &&
									!deposits.some(
										(other) =>
											other !== o && dist(other, p) < 95,
									)
								) {
									o.x = p.x;
									o.y = p.y;
									done = true;
									break;
								}
							}
							if (done) break;
						}
					}
				for (const item of [
					...this.entities,
					...this.ores,
					...this.gasFields,
					...this.crystalFields,
				]) {
					if (!this.blocked(item.x, item.y, 30)) continue;
					const origin = { x: item.x, y: item.y };
					let placed = false;
					for (
						let radius = 80;
						radius <= 600 && !placed;
						radius += 40
					)
						for (let k = 0; k < 16; k++) {
							const x =
									origin.x +
									Math.cos((k * Math.PI) / 8) * radius,
								y =
									origin.y +
									Math.sin((k * Math.PI) / 8) * radius;
							if (
								!this.blocked(x, y, 45) &&
								!this.entities.some(
									(e) =>
										e !== item && dist(e, { x, y }) < 100,
								)
							) {
								item.x = x;
								item.y = y;
								placed = true;
								break;
							}
						}
					if (item.home) item.home = { x: item.x, y: item.y };
				}
				for (const e of this.humans.flatMap((h) => this.units(h)).filter(
					(e) => e.type === "worker",
				)) {
					const ore = [...this.ores].sort(
						(a, b) => dist(e, a) - dist(e, b),
					)[0];
					this.as(e.team, () => this.gather([e.id], ore.id));
				}
			},
			clusterRelays() {
				const nodes = [],
					names = [
						"AUREK",
						"BESH",
						"CRESH",
						"DORN",
						"ESK",
						"FORN",
						"GREK",
						"HERF",
						"ISK",
						"JENTH",
					],
					sources = [
						...this.ores,
						...this.crystalFields,
						...this.gasFields,
					],
					limit = RTS.MISSIONS[this.missionId].campaign ? 8 : 10;
				for (const source of sources) {
					if (nodes.length >= limit) break;
					if (nodes.some((n) => dist(n, source) < 260)) continue;
					for (let i = 0; i < 16; i++) {
						const angle = (i * Math.PI) / 8,
							p = {
								x: source.x + Math.cos(angle) * 150,
								y: source.y + Math.sin(angle) * 150,
							};
						if (
							this.blocked(p.x, p.y, 60) ||
							this.entities.some(
								(e) => dist(e, p) < TYPES[e.type].radius + 110,
							) ||
							sources.some((o) => dist(o, p) < 105) ||
							nodes.some((n) => dist(n, p) < 260)
						)
							continue;
						nodes.push({
							...p,
							owner: -1,
							progress: 0,
							capturing: -1,
							name: names[nodes.length],
						});
						break;
					}
				}
				this.nodes = nodes;
			},
			wildlife() {
				const biome = RTS.MISSIONS[this.missionId].biome,
					out = [];
				for (let i = 0; i < 65; i++) {
					const x =
							100 +
							((i * 397.3) % (this.W - 200)) +
							Math.sin(this.time * 0.18 + i) * 10,
						y =
							100 +
							((i * 233.7) % (this.H - 200)) +
							Math.cos(this.time * 0.12 + i) * 8;
					if (
						!this.blocked(x, y, 12) &&
						!this.entities.some(
							(e) =>
								!TYPES[e.type].speed && dist(e, { x, y }) < 85,
						)
					)
						out.push({
							id: i,
							x,
							y,
							kind:
								biome === "ice"
									? i % 2
										? "fox"
										: "hare"
									: biome === "ash"
										? i % 2
											? "lizard"
											: "hare"
										: i % 3
											? "deer"
											: "lizard",
						});
				}
				for (let i = 0; i < 18; i++)
					out.push({
						id: 100 + i,
						kind: "bird",
						x: (i * 317 + this.time * (20 + (i % 3) * 4)) % this.W,
						y:
							100 +
							((i * 197) % (this.H - 200)) +
							Math.sin(this.time * 0.12 + i) * 35,
					});
				return out;
			},
			factionFor(team) {
				if (!this.scenario || team === 2) return null;
				if (this.players?.[team]?.faction) return { key: this.players[team].faction, ...RTS.FACTIONS[this.players[team].faction] };
				const key =
					team === 0
						? this.scenario.faction
						: team === 3
							? this.scenario.faction
							: this.scenario.faction === "colonies"
								? "dominion"
								: "colonies";
				return { key, ...RTS.FACTIONS[key] };
			},
			colorFor(team) {
				if (this.players?.[team]?.color) return this.players[team].color;
				return team === 0
					? this.scenario?.color || "#b0efd0"
					: {
							1: "#f07d78",
							2: "#e4b968",
							3: "#819dff",
							4: "#d2a1ef",
						}[team] || "#cccccc";
			},
			unitName(type) {
				return TYPES[type].name;
			},
			cost(type) {
				return Math.round(
					(TYPES[type].cost || 0) * (this.factionFor(this.me)?.cost || 1),
				);
			},
			canTarget(a, b) {
				if (
					TYPES[a.type].threat &&
					(TYPES[b.type].flying || dist(a.home || a, b) > 230)
				)
					return false;
				return (
					!TYPES[b.type].flying ||
					[
						"interceptor",
						"trooper",
						"rocket",
						"turret",
						"hq",
						"sentinel",
					].includes(a.type)
				);
			},
			enemyBases() {
				return this.entities.filter(
					(e) =>
						e.type === "hq" &&
						e.team !== this.humans[0] &&
						e.team !== 2 &&
						e.hp > 0,
				);
			},
			configureSkirmish(input = {}) {
				this.scenario = {
					name: String(input.name || "Dowódca")
						.replace(/[<>]/g, "")
						.slice(0, 24),
					color: RTS.PLAYER_COLORS.includes(input.color)
						? input.color
						: RTS.PLAYER_COLORS[0],
					faction: RTS.FACTIONS[input.faction]
						? input.faction
						: "colonies",
					difficulty: ["easy", "normal", "hard"].includes(
						input.difficulty,
					)
						? input.difficulty
						: "normal",
					players: clamp(
						Math.round(Number(input.players) || 2),
						2,
						4,
					),
				};
				for (const e of this.entities) {
					const f = this.factionFor(e.team);
					if (f) {
						const factor =
							f.hp * (!this.isHuman(e.team) ? this.difficultyScale() : 1);
						e.hp *= factor;
						e.maxHp *= factor;
						e.faction = f.key;
						e.tint = this.colorFor(e.team);
					}
				}
				for (let i = 2; i < this.scenario.players; i++) {
					const team = i + 1,
						x = i === 2 ? 550 : 2860,
						y = i === 2 ? 340 : 1690;
					this.obstacles = this.obstacles.filter(
						(r) =>
							!(
								x > r.x - 250 &&
								x < r.x + r.w + 250 &&
								y > r.y - 250 &&
								y < r.y + r.h + 250
							),
					);
					this.waters = this.waters.filter(
						(w) => dist(w, { x, y }) > w.rx + 250,
					);
					// Separate AI bases, each with its own faction, garrison and attack waves.
					this.spawn("hq", team, x, y);
					this.spawn("barracks", team, x + 130, y + 70);
					this.spawn("turret", team, x - 100, y + 110);
					this.spawn("trooper", team, x + 40, y + 130);
					this.spawn("rocket", team, x - 40, y + 130);
				}
				this.nextWave *=
					this.scenario.difficulty === "easy"
						? 1.35
						: this.scenario.difficulty === "hard"
							? 0.8
							: 1;
				this.placeCornerBases();
				this.clusterRelays();
				this.explored.fill(0);
				this.updateVision();
			},
			difficultyScale() {
				return this.scenario?.difficulty === "easy"
					? 0.85
					: this.scenario?.difficulty === "hard"
						? 1.15
						: 1;
			},
			spawn(type, team, x, y) {
				const e = original.spawn.call(this, type, team, x, y),
					f = this.factionFor(team);
				if (f) {
					const factor =
						f.hp * (!this.isHuman(team) ? this.difficultyScale() : 1);
					e.hp *= factor;
					e.maxHp *= factor;
					e.faction = f.key;
					e.tint = this.colorFor(team);
				}
				return e;
			},
			serialize() {
				return {
					...original.serialize.call(this),
					scenario: this.scenario || null,
					centerProgression: 1,
					training: this.training || null,
				};
			},
			productionType(type) {
				return TYPES[type]?.flying
					? "hangar"
					: type === "sentinel"
						? "factory"
						: original.productionType.call(this, type);
			},
			isProducer(e) {
				return (
					original.isProducer.call(this, e) ||
					!!(e && e.team === this.me && e.type === "hangar" && e.hp > 0)
				);
			},
			enqueue(type, preferredId = null) {
				if (
					TYPES[type]?.faction &&
					TYPES[type].faction !== this.factionFor(this.me)?.key
				)
					return false;
				const cost = this.cost(type),
					base = TYPES[type]?.cost;
				if (base == null) return false;
				if (this.credits < cost) return false;
				this.credits += base - cost;
				const ok = original.enqueue.call(this, type, preferredId);
				if (!ok) this.credits -= base - cost;
				else this.queue.at(-1).paid = cost;
				return ok;
			},
			cancelQueue(id = null) {
				const q = this.queue.findLast(
					(q) => id === null || q.producerId === id,
				);
				if (!q) return false;
				const ok = original.cancelQueue.call(this, id);
				if (ok)
					this.credits +=
						(q.paid ?? TYPES[q.type].cost) - TYPES[q.type].cost;
				return ok;
			},
			movementFactor(e) {
				return (
					original.movementFactor.call(this, e) *
					(this.factionFor(e.team)?.speed || 1) *
					(this.upgradeOf(e.team, "infantryTraining") &&
					["trooper", "rocket"].includes(e.type)
						? 1.1
						: 1)
				);
			},
			damage(a, b) {
				if (!this.canTarget(a, b)) return 0;
				let n =
					original.damage.call(this, a, b) *
					(this.factionFor(a.team)?.damage || 1) *
					(!this.isHuman(a.team) && a.team !== 2 ? this.difficultyScale() : 1);
				if (
					this.factionFor(b.team)?.key === "dominion" &&
					!b.path.length &&
					TYPES[b.type].speed
				)
					n *= 0.92;
				if (a.type === "bomber" && !TYPES[b.type].speed) n *= 1.5;
				return n;
			},
			pathTo(a, b) {
				return TYPES[a.type]?.flying
					? [
							{
								x: clamp(b.x, 30, this.W - 30),
								y: clamp(b.y, 30, this.H - 30),
							},
						]
					: original.pathTo.call(this, a, b);
			},
			replacement(type, x, y) {
				return ["gate", "turret"].includes(type)
					? this.entities.find(
							(e) =>
								e.team === this.me &&
								e.type === "wall" &&
								e.hp > 0 &&
								dist(e, { x, y }) < 27,
						)
					: null;
			},
			canBuild(x, y, type = "turret") {
				if (this.developmentRequirement(type)) return false;
				if (!["wall", "gate", "turret"].includes(type))
					return original.canBuild.call(this, x, y, type);
				const anchor = this.replacement(type, x, y);
				if (anchor) {
					x = anchor.x;
					y = anchor.y;
				}
				const walls = this.entities.filter(
						(e) => e.type === "wall" && e.team === this.me && e.hp > 0,
					),
					filtered = this.entities.filter((e) => !walls.includes(e));
				if (type === "turret" && !anchor)
					return original.canBuild.call(this, x, y, type);
				const old = this.entities;
				this.entities = filtered;
				let valid;
				try {
					valid = original.canBuild.call(this, x, y, type);
				} finally {
					this.entities = old;
				}
				return (
					valid &&
					!walls.some((e) => dist(e, { x, y }) < 22 && e !== anchor)
				);
			},
			queueBuilder(worker, target) {
				if (
					worker.order?.kind === "build" &&
					this.get(worker.order.targetId)?.constructionLeft
				) {
					(worker.builderQueue ??= []).push(target.id);
				} else this.buildWith([worker.id], target.id);
			},
			advanceBuilder(e) {
				let next;
				while ((e.builderQueue || []).length) {
					next = this.get(e.builderQueue.shift());
					if (next?.constructionLeft) {
						this.buildWith([e.id], next.id);
						return;
					}
				}
			},
			wallPoints(a, b) {
				if (a.circle) {
					const radius = Math.min(360, dist(a, b));
					if (radius < 40) return [];
					const count = Math.min(
						64,
						Math.ceil((Math.PI * 2 * radius) / 44),
					);
					return Array.from({ length: count }, (_, i) => ({
						x: a.x + Math.cos((i * Math.PI * 2) / count) * radius,
						y: a.y + Math.sin((i * Math.PI * 2) / count) * radius,
					}));
				}
				const snap = (p) => {
					const e = this.entities.find(
						(e) =>
							e.team === this.me &&
							["wall", "gate", "turret"].includes(e.type) &&
							dist(e, p) < 27,
					);
					return e ? { x: e.x, y: e.y } : p;
				};
				const start = snap(a),
					end = snap(b),
					d = dist(start, end);
				if (d < 22) return [{ x: start.x, y: start.y }];
				const length = Math.min(d, 1440),
					steps = Math.ceil(length / 48);
				return Array.from({ length: steps + 1 }, (_, i) => ({
					x: start.x + (((end.x - start.x) / d) * length * i) / steps,
					y: start.y + (((end.y - start.y) / d) * length * i) / steps,
				}));
			},
			demolish(ids) {
				if (this.result) return 0;
				let count = 0;
				for (const id of ids) {
					const e = this.get(id);
					if (
						!e ||
						e.team !== this.me ||
						TYPES[e.type].speed ||
						e.type === "hq"
					)
						continue;
					while (this.queue.some((q) => q.producerId === id))
						this.cancelQueue(id);
					this.credits += Math.floor(
						(e.paid ?? this.cost(e.type)) *
							(e.constructionLeft ? 1 : (0.5 * e.hp) / e.maxHp),
					);
					e.hp = 0;
					this.entities = this.entities.filter((u) => u.id !== id);
					this.effects.push({
						kind: "explosion",
						x: e.x,
						y: e.y,
						life: 0.5,
						maxLife: 0.5,
					});
					count++;
				}
				if (count)
					this.notify(
						"Rozebrano " +
							count +
							" budowli. Odzyskano część materiałów.",
					);
				return count;
			},
			buildWallLine(a, b, ids = []) {
				const points = this.wallPoints(a, b).filter(
					(p) =>
						!this.entities.some(
							(e) =>
								e.team === this.me &&
								["wall", "gate", "turret"].includes(e.type) &&
								dist(e, p) < 30,
						),
				);
				if (!points.length) return false;
				if (
					points.some((p) => !this.canBuild(p.x, p.y, "wall")) ||
					this.credits < points.length * this.cost("wall")
				) {
					this.notify(
						"Mur: brak miejsca, zasięgu lub metalu dla całego odcinka.",
					);
					return false;
				}
				if (!this.units(this.me).some((e) => e.type === "worker"))
					return false;
				for (const p of points) {
					if (this.buildStructure("wall", p.x, p.y, ids)) {
						this.entities.at(-1).wallAngle = a.circle
							? Math.atan2(p.y - a.y, p.x - a.x) + Math.PI / 2
							: Math.atan2(b.y - a.y, b.x - a.x);
					}
				}
				return true;
			},
			buildStructure(type, x, y, ids = []) {
				if (!TYPES[type]?.construction || this.result) return false;
				const anchor = this.replacement(type, x, y);
				if (anchor) {
					x = anchor.x;
					y = anchor.y;
				}
				const cost = this.cost(type);
				if (this.credits < cost || !this.canBuild(x, y, type))
					return false;
				const worker =
					ids
						.map((id) => this.get(id))
						.find((e) => e?.team === this.me && e.type === "worker") ||
					this.units(this.me)
						.filter((e) => e.type === "worker")
						.sort(
							(a, b) => dist(a, { x, y }) - dist(b, { x, y }),
						)[0];
				if (!worker) {
					this.notify("Potrzebny robot budowlany.");
					return false;
				}
				if (type === "extractor") {
					const field = this.gasFields.find(
						(o) => o.amount > 0 && dist(o, { x, y }) < 55,
					);
					if (!field) return false;
					x = field.x;
					y = field.y;
				}
				if (anchor) {
					this.entities = this.entities.filter(
						(e) =>
							!(
								e.team === this.me &&
								e.type === "wall" &&
								dist(e, anchor) < 30
							),
					);
				}
				this.credits -= cost;
				const e = this.spawn(type, this.me, x, y);
				e.constructionLeft = TYPES[type].construction;
				e.paid = cost;
				if (anchor) e.wallAngle = anchor.wallAngle || 0;
				if (type === "extractor")
					e.gasId = this.gasFields.find((o) => dist(o, e) < 5).id;
				this.queueBuilder(worker, e);
				this.notify(
					this.unitName(type) + " — zlecono robotowi budowę.",
				);
				return true;
			},
			moveWorker(e, destination, dt, stopRange) {
				if (
					e.order?.kind === "build" &&
					["wall", "gate"].includes(destination.type)
				) {
					if (dist(e, destination) <= stopRange) return true;
					if (
						e.buildApproach?.targetId === destination.id &&
						!this.blocked(e.buildApproach.x, e.buildApproach.y, 22)
					) {
						original.moveWorker.call(
							this,
							e,
							e.buildApproach,
							dt,
							5,
						);
						return dist(e, destination) <= stopRange;
					}
					const candidates = [];
					for (
						let x = Math.floor((destination.x - 75) / 20) * 20 + 10;
						x < destination.x + 75;
						x += 20
					)
						for (
							let y =
								Math.floor((destination.y - 75) / 20) * 20 + 10;
							y < destination.y + 75;
							y += 20
						) {
							const p = { x, y };
							if (
								dist(p, destination) < 73 &&
								!this.blocked(x, y, 22)
							)
								candidates.push(p);
						}
					candidates.sort((a, b) => dist(e, a) - dist(e, b));
					for (const p of candidates) {
						const route = this.pathTo(e, p);
						if (route.length) {
							e.buildApproach = {
								...p,
								targetId: destination.id,
							};
							e.path = route;
							e.repath = 1.5;
							original.moveWorker.call(this, e, p, dt, 5);
							return dist(e, destination) <= stopRange;
						}
					}
					return false;
				}
				return original.moveWorker.call(
					this,
					e,
					destination,
					dt,
					stopRange,
				);
			},
			workTick(e, dt) {
				original.workTick.call(this, e, dt);
				if (e.cooldown <= 0) {
					const target = this.entities.find(
						(t) =>
							t.team !== e.team &&
							t.hp > 0 &&
							!TYPES[t.type].flying &&
							dist(t, e) < TYPES.worker.range &&
							this.isVisibleTo(e.team, t.x, t.y),
					);
					if (target) {
						e.cooldown = TYPES.worker.cooldown;
						this.effects.push({
							kind: "shot",
							x: e.x,
							y: e.y,
							tx: target.x,
							ty: target.y,
							team: e.team,
							life: 0.2,
							maxLife: 0.2,
						});
						this.applyDamage(e, target, this.damage(e, target));
					}
				}
				if (!e.order) this.advanceBuilder(e);
			},
			energyTick(dt) {
				if (this.result || !Number.isFinite(dt) || dt <= 0) return;
				this._powerFrame = {};
				for (const team of this.humans) this.as(team, () => this.energyTickOf(dt));
			},
			energyTickOf(dt) {
				this._energyStep = dt;
				const power = this.power;
				delete this._energyStep;
				if (this.training?.phase === 3)
					this.training.support += power.discharge * dt;
				const batteries = this.entities.filter(
					(e) =>
						e.type === "battery" &&
						e.team === this.me &&
						e.hp > 0 &&
						!e.constructionLeft,
				);
				let available = Math.max(0, power.supply - power.demand) * dt,
					needed = power.discharge * dt;
				for (const b of batteries) {
					b.energy = Number.isFinite(b.energy)
						? clamp(b.energy, 0, 900)
						: 0;
					if (needed > 0) {
						const used = Math.min(b.energy, 30 * dt, needed);
						b.energy -= used;
						needed -= used;
					} else if (power.supply > power.demand) {
						const charge = Math.min(
							900 - b.energy,
							15 * dt,
							available,
						);
						b.energy += charge;
						available -= charge;
					}
				}
				// Freeze the funded power budget for this simulation step only.
				this._powerFrame[this.me] = power;
			},
			workshopTick(dt) {
				if (this.result || !Number.isFinite(dt) || dt <= 0) return;
				for (const team of this.humans) this.as(team, () => this.workshopTickOf(dt));
			},
			workshopTickOf(dt) {
				const serviced = new Set(),
					vehicles = RTS.WORKSHOP_VEHICLES;
				const candidates = this.entities.filter(
					(e) =>
						e.team === this.me &&
						e.hp > 0 &&
						e.hp < e.maxHp &&
						vehicles.has(e.type),
				);
				const power = this.power.factor;
				for (const b of this.entities.filter(
					(e) => e.type === "workshop",
				)) {
					b.repairTargets = [];
					if (b.team !== this.me || b.hp <= 0 || b.constructionLeft)
						continue;
					const nearby = candidates
						.filter((e) => !serviced.has(e.id) && dist(b, e) <= 190)
						.sort(
							(a, z) =>
								a.hp / a.maxHp - z.hp / z.maxHp || a.id - z.id,
						)
						.slice(0, 2);
					for (const e of nearby) {
						const underFire =
							Number.isFinite(e.lastDamaged) &&
							this.time - e.lastDamaged < 3;
						const amount = Math.min(
							e.maxHp - e.hp,
							16 * dt * power * (underFire ? 0.25 : 1),
							Math.max(0, this.credits) * 5,
						);
						if (amount <= 0) continue;
						if (
							this.training?.phase === 4 &&
							e.id === this.training.targetId
						)
							this.training.repaired += amount;
						e.hp += amount;
						this.credits = Math.max(0, this.credits - amount / 5);
						serviced.add(e.id);
						b.repairTargets.push(e.id);
					}
				}
			},
			tick(dt) {
				for (const e of this.entities.filter(
					(e) => TYPES[e.type].threat && e.home,
				)) {
					if (
						!e.target &&
						dist(e, e.home) > 12 &&
						e.order?.kind !== "move"
					) {
						e.order = { kind: "move", ...e.home };
						e.path = this.pathTo(e, e.home);
					}
				}
				const beforeWave = this.wave;
				this.energyTick(dt);
				try {
					original.tick.call(this, dt);
					if (!this.result) this.workshopTick(dt);
				} finally {
					delete this._powerFrame;
				}
				if (this.result) return;
				this.trainingTick(dt);
				for (const e of this.entities)
					if (
						e.hp > 0 &&
						this.factionFor(e.team)?.key === "colonies" &&
						TYPES[e.type].speed &&
						e.type !== "worker" &&
						!e.target &&
						this.time - (e.lastDamaged || 0) > 8
					)
						e.hp = Math.min(e.maxHp, e.hp + dt * 1.2);
				if (this.scenario && this.wave !== beforeWave) {
					this.nextWave =
						this.time +
						(this.nextWave - this.time) *
							(this.scenario.difficulty === "easy"
								? 1.3
								: this.scenario.difficulty === "hard"
									? 0.8
									: 1);
					for (const base of this.enemyBases().filter(
						(b) => b !== this.enemyBases()[0],
					)) {
						const target = this.hq(0);
						if (!target) continue;
						for (let i = 0; i < Math.min(3 + this.wave, 10); i++) {
							const e = this.spawn(
								this.wave > 2 && i === 0
									? "interceptor"
									: i % 3
										? "trooper"
										: "rocket",
								base.team,
								base.x + (i - 2) * 30,
								base.y + 100,
							);
							e.order = {
								kind: "attackMove",
								x: target.x,
								y: target.y,
							};
							e.path = this.pathTo(e, target);
						}
					}
				}
			},
			applyDamage(a, b, n) {
				b.lastDamaged = this.time;
				original.applyDamage.call(this, a, b, n);
			},
		});

		const configureWorld = Game.prototype.configureMission;
		Game.prototype.configureMission = function () {
			configureWorld.call(this);
			if (this.missionId === "training") return;
			const biome = RTS.MISSIONS[this.missionId].biome,
				type =
					biome === "dust"
						? "duneMaw"
						: biome === "ice"
							? "frostTusk"
							: "ashCrawler";
			let count = 0;
			for (let i = 0; i < 80 && count < 3; i++) {
				const p = {
					x: 650 + ((i * 491 + (this.seed % 211)) % (this.W - 1300)),
					y: 550 + ((i * 337) % (this.H - 1100)),
				};
				if (
					this.blocked(p.x, p.y, 100) ||
					this.entities.some(
						(e) => dist(e, p) < (e.type === "hq" ? 700 : 270),
					) ||
					[
						...this.ores,
						...this.gasFields,
						...this.crystalFields,
						...this.nodes,
					].some((o) => dist(o, p) < 170)
				)
					continue;
				const e = this.spawn(type, 2, p.x, p.y);
				e.home = { ...p };
				e.species = TYPES[type].name;
				count++;
			}
		};
		Game.fromSave = function (state) {
			const g = original.fromSave.call(this, state);
			if (g.missionId === "training") {
				const t = state.training;
				if (
					!t ||
					!Number.isInteger(t.phase) ||
					t.phase < 0 ||
					t.phase > 5 ||
					["blackout", "support", "repaired"].some(
						(k) => !Number.isFinite(t[k]) || t[k] < 0,
					) ||
					t.blackout > 8
				)
					throw Error("Uszkodzony zapis szkolenia");
				g.training = JSON.parse(JSON.stringify(t));
			}
			if (!state.centerProgression) {
				const advanced = ["factory", "lab", "hangar", "workshop"];
				if (
					g.entities.some(
						(e) => e.team === 0 && advanced.includes(e.type),
					) ||
					Object.entries(g.upgrades).some(
						([k, v]) => v && !["cargo"].includes(k),
					) ||
					(g.research &&
						["factory", "lab"].includes(g.researchBuilding())) ||
					RTS.MISSIONS[g.missionId].campaign
				)
					g.upgrades.colony = true;
			}
			if (g.scenario) {
				if (
					!RTS.FACTIONS[g.scenario.faction] ||
					!RTS.PLAYER_COLORS.includes(g.scenario.color) ||
					![2, 3, 4].includes(g.scenario.players)
				)
					throw Error("Uszkodzone ustawienia scenariusza");
			}
			return g;
		};
	};
	if (typeof module !== "undefined" && module.exports) {
		const baseInstall = install;
		module.exports = function (RTS) {
			baseInstall(RTS);
			require("./army-rules.js")(RTS);
			require("./campaign-act2.js")(RTS);
			require("./scenario-modes.js")(RTS);
			require("./frontier-maps.js")(RTS);
			require("./themed-maps.js")(RTS);
			require("./support-rules.js")(RTS);
			require("./scenario-setup.js")(RTS);
			require("./scenario-challenges.js")(RTS);
			require("./enemy-ai.js")(RTS);
			require("./teams-rules.js")(RTS);
			require("./factions-rules.js")(RTS);
			require("./swarm-rules.js")(RTS);
			require("./campaign-act3.js")(RTS);
			require("./trade-rules.js")(RTS);
			require("./network-rules.js")(RTS);
		};
	} else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
