/* Stage C: campaign act II "Cena świtu" — missions IV–VI, radio, objectives, summaries and carried-over badges. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.act2Installed) return;
		RTS.act2Installed = true;
		const { Game, TYPES, MISSIONS, dist, clamp, W, H } = RTS;
		const PAD_RADIUS = 200,
			BLAST_RADIUS = 380,
			SEAT_LIMIT = 4;

		Object.assign(TYPES, {
			scientist: {
				name: "Badacz",
				hp: 70,
				speed: 92,
				range: 0,
				damage: 0,
				cooldown: 1,
				radius: 9,
			},
			technician: {
				name: "Technik kompleksu",
				hp: 80,
				speed: 88,
				range: 0,
				damage: 0,
				cooldown: 1,
				radius: 9,
			},
			hauler: {
				name: "Konwojowiec z rdzeniem",
				hp: 900,
				speed: 62,
				range: 0,
				damage: 0,
				cooldown: 1,
				radius: 20,
			},
			forge: {
				name: "Serce popiołu",
				hp: 2400,
				speed: 0,
				range: 0,
				damage: 0,
				cooldown: 1,
				radius: 58,
			},
		});
		RTS.PASSENGER_TYPES.push("scientist", "technician");
		RTS.WORKSHOP_VEHICLES.add("hauler");

		const SPEAKERS = {
			lira: { name: "Lira", role: "Inżynierka sieci", color: "#9fe3cf" },
			tessa: {
				name: "Dr Mira Tessa",
				role: "Kierowniczka ekipy badawczej",
				color: "#f0cf8a",
			},
			vale: {
				name: "Kpt. Oren Vale",
				role: "Dowódca konwoju",
				color: "#9cc6f2",
			},
			koss: {
				name: "Adrian Koss",
				role: "Główny technik kompleksu",
				color: "#f2a38c",
			},
			dominium: {
				name: "Nasłuch Dominium",
				role: "Przechwycona łączność",
				color: "#e98883",
			},
		};
		RTS.ACT2_SPEAKERS = SPEAKERS;

		Object.assign(MISSIONS, {
			colony4: {
				name: "IV · Sygnał spod piasku",
				planet: "Khepri IV — Pola Jam",
				biome: "dust",
				mirror: "none",
				campaign: true,
				act: 2,
				requires: "colony3",
				description:
					"Latarnie znów świecą, a z ich pasma wyłania się słaby sygnał odciętej ekipy badawczej. Dominium kopie w dawnych instalacjach sondy, a hałas wiertni rozbudził paszczaki w skalnym grzbiecie. Odnajdź badaczy, odczytaj archiwum i przewieź rdzeń danych transporterem przez obszar jam.",
				objective:
					"Odnajdź obóz badaczy, odczytaj archiwum, dostarcz rdzeń danych transporterem na lądowisko i ewakuuj co najmniej 2 badaczy. Dodatkowo: ewakuuj wszystkich czterech.",
				facts: [
					"Start: Kolonia, fabryka, transporter",
					"900 metalu · bez regularnych desantów<br>Pościg po załadunku rdzenia",
				],
				lesson: "Transport i omijanie zagrożeń",
			},
			colony5: {
				name: "V · Ostatni konwój",
				planet: "Vesper — Przełęcz Szronu",
				biome: "ice",
				mirror: "none",
				campaign: true,
				act: 2,
				requires: "colony4",
				description:
					"Archiwum wskazało, gdzie Dominium ukryło rdzenie energetyczne dawnej sieci. Trzy konwojowce muszą przejść przez lodową przełęcz do latarni Kestrel. Konwój jedzie sam; ty utrzymujesz postoje, naprawiasz pojazdy i odpierasz napady w śnieżycach.",
				objective:
					"Doprowadź co najmniej 2 z 3 konwojowców do latarni Kestrel przez postoje ALFA i BETA. Dodatkowo: zachowaj wszystkie pojazdy konwoju.",
				facts: [
					"Start: Kolonia, fabryka · warsztat do zbudowania",
					"1000 metalu · napady od 50 s co 100 s<br>i podczas każdej śnieżycy",
				],
				lesson: "Eskorta, naprawy i obrona postojów",
			},
			colony6: {
				name: "VI · Serce popiołu",
				planet: "Vulkan IX — Kompleks Hefajstos",
				biome: "ash",
				mirror: "none",
				campaign: true,
				act: 2,
				requires: "colony5",
				description:
					"Rdzenie z Vesperu doprowadziły Kolonie do źródła blokady: kompleksu Hefajstos, który wysysa energię planety i doprowadza faunę do szału. Przejmij węzły sterujące i zdecyduj: zniszczyć instalację czy odłączyć ją i ewakuować personel. Następnie rozbij centrum Dominium.",
				objective:
					"Przejmij 3 węzły sterujące, podejmij decyzję o kompleksie, wykonaj ją i zniszcz centrum Dominium.",
				facts: [
					"Start: Kolonia, laboratorium, fabryka",
					"1100 metalu · desanty od 150 s<br>Decyzja zmienia epilog i premię",
				],
				lesson: "Decyzja z konsekwencjami",
			},
		});

		const LAYOUTS = {
			colony4: {
				credits: 900,
				gas: 120,
				crystals: 0,
				obstacles: [
					{ x: 1700, y: 60, w: 100, h: 460 },
					{ x: 1700, y: 680, w: 100, h: 320 },
					{ x: 1700, y: 1160, w: 100, h: 320 },
					{ x: 1700, y: 1640, w: 100, h: 460 },
					{ x: 1150, y: 700, w: 220, h: 150 },
					{ x: 2350, y: 1050, w: 240, h: 140 },
					{ x: 2450, y: 250, w: 160, h: 120 },
				],
				waters: [
					{ x: 1100, y: 1300, rx: 170, ry: 110 },
					{ x: 2600, y: 1950, rx: 200, ry: 90 },
				],
				ores: [
					{ id: 1, x: 880, y: 1650, amount: 5000 },
					{ id: 2, x: 1350, y: 300, amount: 4000 },
					{ id: 3, x: 2250, y: 1850, amount: 4000 },
				],
				gasFields: [{ id: 1, x: 230, y: 1960, amount: 2200 }],
				crystalFields: [
					{ id: 1, x: 900, y: 1960, amount: 1200 },
					{ id: 2, x: 2600, y: 1500, amount: 1500 },
				],
				nodes: [
					{ x: 1250, y: 1720, name: "AUREK" },
					{ x: 2250, y: 560, name: "BESH" },
				],
				entities: [
					["hq", 0, 420, 1760],
					["barracks", 0, 600, 1560],
					["factory", 0, 700, 1880],
					["reactor", 0, 290, 1560],
					["trooper", 0, 860, 1400],
					["trooper", 0, 900, 1440],
					["trooper", 0, 820, 1450],
					["trooper", 0, 940, 1390],
					["trooper", 0, 880, 1490],
					["rocket", 0, 960, 1470],
					["rocket", 0, 800, 1390],
					["tank", 0, 1000, 1430],
					["transport", 0, 960, 1540],
					["worker", 0, 760, 1720],
					["worker", 0, 800, 1760],
					["worker", 0, 720, 1760],
					["turret", 1, 1900, 600],
					["trooper", 1, 1950, 560],
					["trooper", 1, 1960, 650],
					["trooper", 1, 1890, 700],
					["turret", 1, 2660, 560],
					["trooper", 1, 2750, 520],
					["trooper", 1, 2800, 570],
					["trooper", 1, 2700, 470],
					["rocket", 1, 2780, 450],
					["trooper", 1, 2700, 1720],
					["trooper", 1, 2760, 1760],
					["rocket", 1, 2680, 1790],
				],
				threats: [
					["duneMaw", 1860, 1010],
					["duneMaw", 1860, 1150],
					["duneMaw", 1860, 1490],
					["duneMaw", 1860, 1630],
				],
				state: () => ({
					phase: 0,
					discovered: false,
					reading: 0,
					core: "site",
					coreSite: { x: 2850, y: 1650 },
					carrierId: null,
					evacuated: 0,
					staff: 4,
					pursuit: 0,
					nextPursuit: 0,
					nextRaid: 240,
					raids: 0,
					pad: { x: 640, y: 1740 },
					camp: { x: 2950, y: 380 },
					archive: { x: 2850, y: 1650 },
				}),
			},
			colony5: {
				credits: 1000,
				gas: 150,
				crystals: 50,
				obstacles: [
					{ x: 1050, y: 150, w: 200, h: 560 },
					{ x: 1950, y: 1250, w: 180, h: 620 },
					{ x: 2500, y: 250, w: 200, h: 380 },
					{ x: 1450, y: 1880, w: 320, h: 180 },
					{ x: 2800, y: 1500, w: 220, h: 160 },
				],
				waters: [
					{ x: 1700, y: 1100, rx: 230, ry: 150 },
					{ x: 2620, y: 1180, rx: 150, ry: 100 },
				],
				ores: [
					{ id: 1, x: 820, y: 1080, amount: 5000 },
					{ id: 2, x: 1600, y: 350, amount: 4000 },
					{ id: 3, x: 2350, y: 1950, amount: 4000 },
				],
				gasFields: [{ id: 1, x: 250, y: 1300, amount: 2200 }],
				crystalFields: [
					{ id: 1, x: 880, y: 720, amount: 1000 },
					{ id: 2, x: 2900, y: 500, amount: 1400 },
				],
				nodes: [
					{ x: 1250, y: 1050, name: "AUREK" },
					{ x: 2350, y: 1050, name: "BESH" },
				],
				entities: [
					["hq", 0, 420, 1080],
					["barracks", 0, 600, 880],
					["factory", 0, 620, 1300],
					["reactor", 0, 290, 860],
					["trooper", 0, 780, 1500],
					["trooper", 0, 820, 1540],
					["trooper", 0, 740, 1540],
					["trooper", 0, 860, 1480],
					["trooper", 0, 700, 1480],
					["rocket", 0, 900, 1560],
					["rocket", 0, 660, 1560],
					["tank", 0, 960, 1500],
					["tank", 0, 960, 1600],
					["worker", 0, 700, 1130],
					["worker", 0, 720, 1040],
					["worker", 0, 640, 1180],
					["depot", 0, 1350, 1330],
					["depot", 0, 2250, 620],
				],
				haulers: [
					[760, 1650],
					[820, 1700],
					[700, 1700],
				],
				threats: [
					["frostTusk", 1780, 1700],
					["frostTusk", 2600, 1450],
				],
				state: () => ({
					phase: 0,
					leg: 0,
					mode: "waiting",
					departAt: 25,
					haltLeft: 0,
					delivered: 0,
					lost: 0,
					nextRaid: 50,
					raids: 0,
					warned: 0,
					stormCycle: -1,
					orderClock: 0,
					stops: [
						{
							name: "ALFA",
							x: 1350,
							y: 1470,
							depot: { x: 1350, y: 1330 },
						},
						{
							name: "BETA",
							x: 2250,
							y: 780,
							depot: { x: 2250, y: 620 },
						},
						{ name: "KESTREL", x: 3050, y: 1050, final: true },
					],
				}),
			},
			colony6: {
				credits: 1100,
				gas: 200,
				crystals: 100,
				nextWave: 150,
				obstacles: [
					{ x: 1150, y: 250, w: 220, h: 360 },
					{ x: 1150, y: 1560, w: 220, h: 360 },
					{ x: 2300, y: 350, w: 200, h: 300 },
					{ x: 2300, y: 1500, w: 200, h: 300 },
				],
				waters: [
					{ x: 1700, y: 420, rx: 200, ry: 120 },
					{ x: 1700, y: 1760, rx: 200, ry: 120 },
				],
				ores: [
					{ id: 1, x: 800, y: 1500, amount: 5000 },
					{ id: 2, x: 1100, y: 1080, amount: 4000 },
					{ id: 3, x: 2500, y: 1080, amount: 4500 },
				],
				gasFields: [
					{ id: 1, x: 250, y: 1500, amount: 2400 },
					{ id: 2, x: 2000, y: 250, amount: 2600 },
				],
				crystalFields: [
					{ id: 1, x: 800, y: 650, amount: 1200 },
					{ id: 2, x: 2000, y: 1900, amount: 1500 },
				],
				nodes: [
					{ x: 1450, y: 760, name: "ZAWÓR", owner: 1 },
					{ x: 1450, y: 1400, name: "TURBINA", owner: 1 },
					{ x: 1990, y: 1080, name: "ŁĄCZNIK", owner: 1 },
				],
				entities: [
					["hq", 0, 420, 1080],
					["barracks", 0, 620, 880],
					["factory", 0, 640, 1300],
					["lab", 0, 300, 850],
					["reactor", 0, 280, 1310],
					["trooper", 0, 800, 1000],
					["trooper", 0, 840, 1040],
					["trooper", 0, 800, 1080],
					["trooper", 0, 840, 1120],
					["trooper", 0, 800, 1160],
					["trooper", 0, 760, 1040],
					["rocket", 0, 880, 1000],
					["rocket", 0, 880, 1160],
					["rocket", 0, 760, 1120],
					["tank", 0, 920, 1060],
					["tank", 0, 920, 1120],
					["artillery", 0, 700, 1000],
					["transport", 0, 700, 1200],
					["worker", 0, 620, 1500],
					["worker", 0, 660, 1540],
					["worker", 0, 580, 1540],
					["worker", 0, 540, 1080],
					["forge", 1, 1700, 1080],
					["turret", 1, 1600, 860],
					["turret", 1, 1600, 1300],
					["turret", 1, 1850, 1080],
					["trooper", 1, 1500, 820],
					["trooper", 1, 1520, 1360],
					["rocket", 1, 1950, 1020],
					["trooper", 1, 1950, 1140],
					["hq", 1, 2960, 1080],
					["barracks", 1, 2780, 860],
					["turret", 1, 2720, 980],
					["turret", 1, 2720, 1180],
					["turret", 1, 2860, 700],
					["turret", 1, 2860, 1460],
					["trooper", 1, 2800, 1080],
					["rocket", 1, 2820, 1020],
				],
				threats: [
					["ashCrawler", 1560, 1080],
					["ashCrawler", 1900, 760],
					["ashCrawler", 1900, 1400],
				],
				state: () => ({
					phase: 0,
					choice: null,
					decision: null,
					overload: 0,
					evacuated: 0,
					staff: 6,
					blastLosses: 0,
					exploded: false,
					nextSwarm: 70,
					bonus: null,
					pad: { x: 640, y: 1080 },
				}),
			},
		};
		RTS.ACT2_LAYOUTS = LAYOUTS;
		const isAct2 = (id) => Object.hasOwn(LAYOUTS, id);

		const base = {};
		for (const k of [
			"configureMission",
			"tick",
			"applyDamage",
			"canTarget",
			"command",
			"hold",
			"stop",
			"serialize",
			"transportSeats",
			"campaignReady",
		])
			base[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;

		Object.assign(Game.prototype, {
			isAct2() {
				return isAct2(this.missionId) && !!this.act2;
			},
			setupAct2() {
				const plan = LAYOUTS[this.missionId];
				this.entities = [];
				this.queue = [];
				this.research = null;
				this.wave = 0;
				this.upgrades.colony = true;
				this.credits = plan.credits;
				this.gas = plan.gas;
				this.crystals = plan.crystals;
				this.nextWave = plan.nextWave ?? 1e9;
				this.obstacles = plan.obstacles.map((o) => ({ ...o }));
				this.waters = plan.waters.map((w) => ({ ...w }));
				this.ores = plan.ores.map((o) => ({ ...o }));
				this.gasFields = plan.gasFields.map((o) => ({ ...o }));
				this.crystalFields = plan.crystalFields.map((o) => ({ ...o }));
				this.nodes = plan.nodes.map((n) => ({
					owner: -1,
					...n,
					progress: 0,
					capturing: -1,
				}));
				for (const [type, team, x, y] of plan.entities) {
					const e = this.spawn(type, team, x, y);
					if (team === 1 && TYPES[type].speed)
						e.order = { kind: "hold", x, y };
				}
				for (const [x, y] of plan.haulers || []) {
					const e = this.spawn("hauler", 0, x, y);
					e.convoy = true;
				}
				for (const [type, x, y] of plan.threats) {
					const e = this.spawn(type, 2, x, y);
					e.home = { x, y };
					e.species = TYPES[type].name;
				}
				for (const w of this.units(0).filter(
					(e) => e.type === "worker",
				)) {
					const ore = [...this.ores].sort(
						(a, b) => dist(w, a) - dist(w, b),
					)[0];
					this.gather([w.id], ore.id);
				}
				this.act2 = {
					mission: this.missionId,
					radio: [],
					losses: 0,
					lostValue: 0,
					bonus: 0,
					failReason: null,
					...plan.state(),
				};
				this.explored.fill(0);
				this.updateVision();
				const opening = {
					colony4: [
						[
							"lira",
							"Sygnał pochodzi z obozu na północnym wschodzie. Za skalnym grzbietem są jamy paszczaków — przejścia w środku i na południu są pilnowane przez nie, północne przez posterunek Dominium.",
						],
						[
							"tessa",
							"Tu Tessa… jeśli ktoś to słyszy: czworo z nas przeżyło. Nie przejdziemy pieszo przez jamy.",
						],
					],
					colony5: [
						[
							"vale",
							"Konwój gotowy. Trzy rdzenie, trzy wozy. Ruszamy za 25 sekund i jedziemy sami — waszym zadaniem jest utrzymać postoje i nas łatać.",
						],
						[
							"lira",
							"Na postojach ALFA i BETA wozy przeładowują zapasy. Odjadą dopiero, gdy stacja stoi, a każdy pojazd ma co najmniej połowę pancerza.",
						],
					],
					colony6: [
						[
							"lira",
							"Kompleks Hefajstos pożera energię całej planety. Trzy węzły sterujące — ZAWÓR, TURBINA i ŁĄCZNIK — dadzą nam nad nim kontrolę.",
						],
						[
							"koss",
							"Tu Koss, technik kompleksu. Jest nas sześcioro, pracujemy pod przymusem. Zanim cokolwiek zniszczycie… pomyślcie o nas.",
						],
					],
				}[this.missionId];
				for (const [who, text] of opening) this.say(who, text, false);
			},
			say(who, text, sound = true) {
				const line = { who, text, time: Math.round(this.time) };
				this.act2.radio.push(line);
				if (this.act2.radio.length > 16) this.act2.radio.shift();
				this.notify(
					(SPEAKERS[who]?.name || who) + ": " + text,
					sound ? "radio" : null,
				);
			},
			configureMission() {
				base.configureMission.call(this);
				if (isAct2(this.missionId)) this.setupAct2();
			},
			transportSeats(carrier) {
				return (
					base.transportSeats.call(this, carrier) -
					(carrier?.archive ? 1 : 0)
				);
			},
			canTarget(a, b) {
				if (b?.type === "forge") return false;
				return base.canTarget.call(this, a, b);
			},
			command(ids, x, y, targetId = null, attackMove = false) {
				const free = ids.filter((id) => !this.get(id)?.convoy);
				if (ids.length && !free.length) {
					this.notify(
						"Konwój porusza się automatycznie między postojami.",
					);
					return;
				}
				return base.command.call(
					this,
					free,
					x,
					y,
					targetId,
					attackMove,
				);
			},
			hold(ids) {
				return base.hold.call(
					this,
					ids.filter((id) => !this.get(id)?.convoy),
				);
			},
			stop(ids) {
				return base.stop.call(
					this,
					ids.filter((id) => !this.get(id)?.convoy),
				);
			},
			staffType() {
				return this.missionId === "colony6"
					? "technician"
					: "scientist";
			},
			staffInField() {
				const type = this.staffType();
				return (
					this.entities.filter(
						(e) => e.team === 0 && e.hp > 0 && e.type === type,
					).length +
					this.entities
						.filter(
							(e) =>
								e.type === "transport" &&
								e.team === 0 &&
								e.hp > 0,
						)
						.reduce(
							(n, t) =>
								n +
								(t.passengers || []).filter(
									(p) => p.type === type && p.hp > 0,
								).length,
							0,
						)
				);
			},
			applyDamage(a, b, n) {
				const alive = b.hp > 0;
				base.applyDamage.call(this, a, b, n);
				if (!this.isAct2() || !alive || b.hp > 0) return;
				const s = this.act2;
				if (b.team === 0 && TYPES[b.type].speed) {
					s.losses++;
					s.lostValue += TYPES[b.type].cost || 0;
				}
				if (b.type === "transport" && b.archive) {
					b.archive = false;
					s.core = "dropped";
					s.coreSite = { x: b.x, y: b.y };
					s.carrierId = null;
					this.say(
						"lira",
						"Transporter z rdzeniem zniszczony! Rdzeń danych leży we wraku — podjedź innym transporterem.",
					);
				}
				if (b.type === "scientist")
					this.say("tessa", "Straciliśmy jednego z naszych…");
				if (b.type === "technician")
					this.say(
						"koss",
						"Technik nie żyje. Nie zostawiajcie reszty!",
					);
				if (b.type === "hauler") {
					s.lost++;
					this.say(
						"vale",
						"Wóz trafiony — rdzeń stracony! Chrońcie pozostałe.",
					);
				}
			},
			act2Tick(dt) {
				const s = this.act2;
				if (!s || this.result) return;
				if (this.missionId === "colony4") this.tickSignal(dt);
				else if (this.missionId === "colony5") this.tickConvoy(dt);
				else this.tickHeart(dt);
			},
			act2Fail(reason) {
				if (this.result) return;
				this.act2.failReason = reason;
				this.result = "defeat";
				this.notify(reason, "defeat");
			},
			evacuationTick() {
				const s = this.act2,
					type = this.staffType();
				let n = 0;
				const arrived = new Set(
					this.entities
						.filter(
							(e) =>
								e.team === 0 &&
								e.hp > 0 &&
								e.type === type &&
								dist(e, s.pad) <= PAD_RADIUS,
						)
						.map((e) => e.id),
				);
				if (arrived.size) {
					this.entities = this.entities.filter(
						(e) => !arrived.has(e.id),
					);
					n += arrived.size;
				}
				for (const t of this.entities.filter(
					(e) =>
						e.type === "transport" &&
						e.team === 0 &&
						e.hp > 0 &&
						dist(e, s.pad) <= PAD_RADIUS,
				)) {
					const before = (t.passengers || []).length;
					t.passengers = (t.passengers || []).filter(
						(p) => p.type !== type,
					);
					n += before - t.passengers.length;
				}
				if (n) {
					s.evacuated += n;
					this.say(
						this.missionId === "colony6" ? "koss" : "tessa",
						this.missionId === "colony6"
							? "Kolejni technicy bezpieczni: " +
									s.evacuated +
									"/" +
									s.staff +
									"."
							: "Jesteśmy na lądowisku. Ewakuowano " +
									s.evacuated +
									"/" +
									s.staff +
									" badaczy.",
					);
				}
				return n;
			},
			raid(from, target, count, label) {
				const types = Array.from({ length: count }, (_, i) =>
					i === 0 && count >= 6
						? "tank"
						: i % 3 === 2
							? "rocket"
							: "trooper",
				);
				for (const [i, type] of types.entries()) {
					const e = this.spawn(
						type,
						1,
						clamp(from.x + ((i % 3) - 1) * 40, 40, this.W - 40),
						clamp(from.y + Math.floor(i / 3) * 40, 40, this.H - 40),
					);
					e.order = { kind: "attackMove", x: target.x, y: target.y };
					e.path = this.pathTo(e, target);
				}
				if (label) this.notify(label, "alarm");
			},
			// Mission IV: find the researchers, read the archive, carry the data core through the burrows.
			tickSignal(dt) {
				const s = this.act2;
				if (!s.discovered) {
					if (
						this.units(0).some(
							(e) => e.type !== "worker" && dist(e, s.camp) < 300,
						)
					) {
						s.discovered = true;
						s.phase = 1;
						[
							[0, 0],
							[40, 30],
							[-40, 30],
							[0, 60],
						].forEach(([dx, dy]) => {
							const e = this.spawn(
								"scientist",
								0,
								s.camp.x + dx,
								s.camp.y + dy,
							);
							e.order = { kind: "hold", x: e.x, y: e.y };
						});
						this.say(
							"tessa",
							"Widzimy was! Czworo badaczy, bez broni. Archiwum sondy jest na południowym wschodzie — tylko jedno z nas potrafi je odczytać na miejscu.",
						);
					}
				}
				if (s.discovered && s.phase < 2 && this.staffInField() === 0)
					return this.act2Fail(
						"Zginęli wszyscy badacze. Archiwum pozostanie nieodczytane.",
					);
				if (s.phase === 1) {
					const near = this.entities.some(
						(e) =>
							e.team === 0 &&
							e.hp > 0 &&
							(e.type === "scientist" ||
								(e.type === "transport" &&
									(e.passengers || []).some(
										(p) => p.type === "scientist",
									))) &&
							dist(e, s.archive) <= 120,
					);
					if (near) {
						const before = s.reading;
						s.reading = Math.min(12, s.reading + dt);
						if (before < 6 && s.reading >= 6)
							this.say(
								"tessa",
								"Połowa danych skopiowana. Utrzymajcie teren!",
							);
					}
					if (s.reading >= 12) {
						s.phase = 2;
						s.core = "site";
						s.coreSite = { ...s.archive };
						this.say(
							"tessa",
							"Mamy wszystko w rdzeniu danych. Załadujcie go do transportera — zajmie jedno miejsce.",
						);
					}
				}
				if (
					s.phase >= 2 &&
					s.core !== "loaded" &&
					s.core !== "delivered"
				) {
					const carrier = this.entities.find(
						(e) =>
							e.type === "transport" &&
							e.team === 0 &&
							e.hp > 0 &&
							!e.archive &&
							dist(e, s.coreSite) <= 110 &&
							(e.passengers || []).length < SEAT_LIMIT,
					);
					if (carrier) {
						carrier.archive = true;
						s.core = "loaded";
						s.carrierId = carrier.id;
						if (s.phase === 2) {
							s.phase = 3;
							s.pursuit = 1;
							s.nextPursuit = this.time + 100;
							this.raid({ x: this.W - 80, y: 1080 }, carrier, 8);
							this.say(
								"dominium",
								"Dane sondy opuszczają wykop. Wszystkie jednostki: przechwycić transporter!",
							);
						} else
							this.say(
								"lira",
								"Rdzeń ponownie na pokładzie. Kieruj się na lądowisko.",
							);
					}
				}
				if (s.core === "loaded") {
					const carrier = this.get(s.carrierId);
					if (carrier && dist(carrier, s.pad) <= PAD_RADIUS) {
						carrier.archive = false;
						s.core = "delivered";
						s.carrierId = null;
						this.say(
							"lira",
							"Rdzeń danych bezpieczny w bazie. Lira zaczyna deszyfrowanie.",
						);
					} else if (
						s.pursuit < 3 &&
						this.time >= s.nextPursuit &&
						carrier
					) {
						s.pursuit++;
						s.nextPursuit = this.time + 100;
						this.raid(
							{
								x: this.W - 80,
								y: clamp(carrier.y, 200, this.H - 200),
							},
							carrier,
							4,
							"Kolejny oddział Dominium ściga transporter.",
						);
					}
				}
				if (s.phase >= 2) {
					this.evacuationTick();
					if (this.staffInField() + s.evacuated < 2)
						return this.act2Fail(
							"Zginęło zbyt wielu badaczy. Ekspedycja nie ma komu przekazać wyników.",
						);
				}
				if (this.time >= s.nextRaid && s.core !== "delivered") {
					s.raids++;
					s.nextRaid = this.time + 200;
					const hq = this.hq(0);
					if (hq)
						this.raid(
							{ x: this.W - 80, y: 300 },
							hq,
							Math.min(3 + s.raids, 7),
							"Oddział Dominium zmierza w stronę bazy.",
						);
				}
			},
			// Mission V: an automatic convoy that halts at stops and in blizzards.
			haulers() {
				return this.entities
					.filter(
						(e) => e.type === "hauler" && e.team === 0 && e.hp > 0,
					)
					.sort((a, b) => a.id - b.id);
			},
			convoyTarget(i) {
				const stop = this.act2.stops[this.act2.leg],
					o = [
						[-60, -30],
						[0, 35],
						[60, -30],
					][i % 3];
				return { x: stop.x + o[0], y: stop.y + o[1] };
			},
			driveConvoy(force = false) {
				this.haulers().forEach((e, i) => {
					const p = this.convoyTarget(i),
						stuck =
							!force &&
							e.path.length &&
							e.lastDrive &&
							dist(e, e.lastDrive) < 4;
					// A vehicle wedged on a shoreline corner gets a fresh route from a nearby free point.
					if (stuck) {
						const side = this.landingSpot?.(
							e,
							TYPES.hauler.radius,
							[],
							120,
						);
						if (side) {
							e.path = [
								side,
								...this.pathTo({ ...e, ...side }, p),
							];
						}
					} else if (force || (!e.path.length && dist(e, p) > 40)) {
						e.order = { kind: "move", ...p };
						e.path = this.pathTo(e, p);
						e.repath = 1;
					}
					e.lastDrive = { x: e.x, y: e.y };
				});
			},
			haltConvoy() {
				for (const e of this.haulers()) {
					e.order = { kind: "hold", x: e.x, y: e.y };
					e.path = [];
				}
			},
			stopDepot(stop) {
				return (
					stop.depot &&
					this.entities.find(
						(e) =>
							e.team === 0 &&
							e.type === "depot" &&
							e.hp > 0 &&
							!e.constructionLeft &&
							dist(e, stop.depot) <= 260,
					)
				);
			},
			tickConvoy(dt) {
				const s = this.act2,
					trucks = this.haulers(),
					stop = s.stops[s.leg],
					storm = this.weather;
				if (s.mode !== "arrived" && trucks.length + s.delivered < 2)
					return this.act2Fail(
						"Konwój utracił zbyt wiele rdzeni. Latarnia Kestrel nie zostanie zasilona.",
					);
				if (s.mode === "waiting" && this.time >= s.departAt) {
					s.mode = "moving";
					s.phase = 1;
					this.driveConvoy(true);
					this.say("vale", "Konwój rusza. Kierunek: postój ALFA.");
				} else if (s.mode === "moving") {
					if (storm.intensity > 0.35) {
						s.mode = "storm";
						this.haltConvoy();
						this.say(
							"vale",
							"Śnieżyca — zero widoczności. Konwój staje do przejaśnienia.",
						);
						if (s.stormCycle !== storm.cycle) {
							s.stormCycle = storm.cycle;
							s.raids++;
							const c = trucks[0] || stop;
							this.raid(
								{
									x: clamp(c.x, 200, this.W - 200),
									y: c.y < this.H / 2 ? this.H - 60 : 60,
								},
								c,
								Math.min(4 + s.raids, 9),
								"Dominium wykorzystuje śnieżycę — napad na konwój!",
							);
						}
					} else if (
						trucks.length &&
						trucks.every((e) => dist(e, stop) <= 170)
					) {
						if (stop.final) {
							s.mode = "arrived";
							s.delivered = trucks.length;
							s.phase = s.stops.length;
							this.haltConvoy();
							this.say(
								"vale",
								"Latarnia Kestrel! Dostarczono " +
									s.delivered +
									"/3 rdzeni.",
							);
						} else {
							s.mode = "halt";
							s.haltLeft = 30;
							this.haltConvoy();
							this.say(
								"vale",
								"Postój " +
									stop.name +
									". Przeładunek 30 sekund — łatajcie nas, póki stoimy.",
							);
						}
					} else if ((s.orderClock -= dt) <= 0) {
						s.orderClock = 2;
						this.driveConvoy();
					}
				} else if (s.mode === "storm" && storm.intensity < 0.2) {
					s.mode = "moving";
					this.driveConvoy(true);
					this.say("vale", "Przejaśnia się. Jedziemy dalej.");
				} else if (s.mode === "halt") {
					s.haltLeft = Math.max(0, s.haltLeft - dt);
					if (!s.depotWarned && !this.stopDepot(stop)) {
						s.depotWarned = true;
						this.say(
							"lira",
							"Stacja " +
								stop.name +
								" zniszczona. Zbuduj magazyn w zasięgu postoju, inaczej konwój nie odjedzie.",
						);
					}
					if (
						s.haltLeft === 0 &&
						storm.intensity <= 0.35 &&
						this.stopDepot(stop) &&
						trucks.every((e) => e.hp >= e.maxHp * 0.5)
					) {
						s.leg++;
						s.phase = s.leg + 1;
						s.mode = "moving";
						s.depotWarned = false;
						this.driveConvoy(true);
						this.say(
							"vale",
							"Odjazd z " +
								stop.name +
								". Następny cel: " +
								s.stops[s.leg].name +
								".",
						);
					}
				}
				if (
					s.mode !== "arrived" &&
					s.warned <= s.raids &&
					this.time >= s.nextRaid - 15
				) {
					s.warned = s.raids + 1;
					this.say(
						"dominium",
						"…oddział szturmowy na pozycji, uderzenie za piętnaście sekund. Cel: konwój Kolonii.",
					);
				}
				if (s.mode !== "arrived" && this.time >= s.nextRaid) {
					s.raids++;
					s.nextRaid = this.time + 100;
					const target =
						s.mode === "halt" && stop.depot
							? stop.depot
							: trucks[0] || stop;
					this.raid(
						{
							x: clamp(target.x + 300, 200, this.W - 200),
							y: target.y < this.H / 2 ? 60 : this.H - 60,
						},
						target,
						Math.min(3 + s.raids, 8),
						s.mode === "halt"
							? "Napad na postój " + stop.name + "!"
							: "Oddział Dominium przecina trasę konwoju.",
					);
				}
			},
			convoyStatus() {
				const s = this.act2,
					stop = s.stops[s.leg],
					trucks = this.haulers();
				if (s.mode === "waiting")
					return (
						"Konwój rusza za " +
						Math.ceil(Math.max(0, s.departAt - this.time)) +
						" s."
					);
				if (s.mode === "storm")
					return (
						"Śnieżyca — konwój stoi przed postojem " +
						stop.name +
						"."
					);
				if (s.mode === "moving")
					return "Konwój w drodze do: " + stop.name + ".";
				if (s.mode === "arrived") return "Konwój u celu.";
				const weak = trucks.filter((e) => e.hp < e.maxHp * 0.5).length;
				return (
					"Postój " +
					stop.name +
					": przeładunek " +
					Math.ceil(s.haltLeft) +
					" s · stacja " +
					(this.stopDepot(stop)
						? "✓"
						: "zniszczona — odbuduj magazyn") +
					" · " +
					(weak
						? weak + " wóz(y) poniżej 50% PW — napraw"
						: "pojazdy sprawne")
				);
			},
			// Mission VI: capture the complex, make the decision, execute it.
			forge() {
				return this.entities.find(
					(e) => e.type === "forge" && e.hp > 0,
				);
			},
			act2Choose(kind) {
				const s = this.act2;
				if (
					!this.isAct2() ||
					this.missionId !== "colony6" ||
					s.phase !== 1 ||
					!["destroy", "evacuate"].includes(kind) ||
					this.result
				)
					return false;
				s.choice = kind;
				s.decision = "made";
				s.phase = 2;
				const f = this.forge() || { x: 1700, y: 1080 };
				if (kind === "destroy") {
					s.overload = 20;
					this.say(
						"lira",
						"Przeciążam rdzeń. Za 20 sekund Serce popiołu wybuchnie — wycofaj wszystkich z promienia 380!",
					);
				} else {
					for (let i = 0; i < 6; i++) {
						const a = (i * Math.PI) / 3,
							e = this.spawn(
								"technician",
								0,
								f.x + Math.cos(a) * 95,
								f.y + Math.sin(a) * 95,
							);
						e.order = { kind: "hold", x: e.x, y: e.y };
					}
					for (let i = 0; i < 3; i++) {
						const h = LAYOUTS.colony6.threats[i],
							e = this.spawn("ashCrawler", 2, h[1], h[2]);
						e.home = { x: h[1], y: h[2] };
						e.species = TYPES.ashCrawler.name;
					}
					this.say(
						"koss",
						"Odłączyliśmy kompleks. Sześcioro techników wychodzi — odprowadźcie nas na lądowisko przy waszej bazie. Pajęczaki wpadły w szał!",
					);
				}
				return true;
			},
			tickHeart(dt) {
				const s = this.act2;
				if (
					s.phase === 0 &&
					this.nodes.length &&
					this.nodes.every((n) => n.owner === 0)
				) {
					s.phase = 1;
					s.decision = "pending";
					this.say(
						"lira",
						"Węzły są nasze. Kompleks czeka na rozkaz: zniszczyć czy odłączyć?",
					);
				}
				if (s.phase === 2 && s.choice === "destroy") {
					const before = s.overload;
					s.overload = Math.max(0, s.overload - dt);
					if (before > 10 && s.overload <= 10)
						this.say("lira", "10 sekund do przeciążenia!");
					if (s.overload === 0) this.detonateForge();
				}
				if (s.phase === 2 && s.choice === "evacuate") {
					this.evacuationTick();
					if (this.staffInField() + s.evacuated < 4)
						return this.act2Fail(
							"Zginęło zbyt wielu techników. Kompleks pozostał bez obsługi i wymknął się spod kontroli.",
						);
					if (this.staffInField() === 0) {
						s.phase = 3;
						s.bonus = this.upgrades.armor
							? this.upgrades.weapons
								? "metal"
								: "weapons"
							: "armor";
						if (s.bonus === "metal") this.credits += 300;
						else this.upgrades[s.bonus] = true;
						this.say(
							"koss",
							"Wszyscy, którzy przeżyli, są bezpieczni. W zamian: nasze plany " +
								(s.bonus === "armor"
									? "pancerza kompozytowego"
									: s.bonus === "weapons"
										? "broni plazmowej"
										: "magazynów — 300 metalu") +
								".",
						);
					}
				}
				const agitated =
					s.phase < 2 || (s.choice === "evacuate" && s.phase === 2);
				if (agitated && this.time >= s.nextSwarm) {
					s.nextSwarm = this.time + 70;
					if (
						this.entities.filter(
							(e) => e.type === "ashCrawler" && e.hp > 0,
						).length < 6
					) {
						const h =
								LAYOUTS.colony6.threats[
									Math.floor(this.time / 70) % 3
								],
							e = this.spawn("ashCrawler", 2, h[1], h[2]);
						e.home = { x: h[1], y: h[2] };
						e.species = TYPES.ashCrawler.name;
					}
				}
			},
			detonateForge() {
				const s = this.act2,
					f = this.forge();
				if (!f) return;
				const before = s.losses;
				for (const e of [...this.entities])
					if (e !== f && e.hp > 0 && dist(e, f) <= BLAST_RADIUS)
						this.applyDamage(f, e, 450);
				s.blastLosses = s.losses - before;
				f.hp = 0;
				this.entities = this.entities.filter((e) => e !== f);
				this.effects.push({
					kind: "explosion",
					x: f.x,
					y: f.y,
					size: BLAST_RADIUS,
					life: 1.4,
					maxLife: 1.4,
				});
				for (const t of this.entities.filter(
					(e) => e.team === 1 && e.type === "turret" && e.hp > 0,
				))
					t.hp = Math.max(1, t.hp * 0.5);
				this.credits += 400;
				s.exploded = true;
				s.phase = 3;
				s.bonus = "salvage";
				this.say(
					"lira",
					"Serce popiołu zniszczone. Fala przeciążenia uszkodziła wieże Dominium; odzyskaliśmy 400 metalu ze złomu.",
				);
				if (s.blastLosses)
					this.say(
						"lira",
						"Wybuch pochłonął " +
							s.blastLosses +
							" naszych jednostek.",
					);
			},
			campaignReady() {
				if (!this.isAct2()) return base.campaignReady.call(this);
				const s = this.act2;
				if (this.missionId === "colony4")
					return (
						s.core === "delivered" &&
						s.evacuated >= 2 &&
						this.staffInField() === 0
					);
				if (this.missionId === "colony5")
					return s.mode === "arrived" && s.delivered >= 2;
				return s.phase === 3;
			},
			act2Objectives() {
				const s = this.act2;
				if (!s) return [];
				if (this.missionId === "colony4")
					return [
						{
							text: "Odnajdź obóz badaczy na północnym wschodzie",
							done: s.discovered,
						},
						{
							text:
								"Odczytaj archiwum sondy — badacz w pobliżu (" +
								Math.floor(s.reading) +
								"/12 s)",
							done: s.phase >= 2,
						},
						{
							text:
								"Dostarcz rdzeń danych transporterem na lądowisko" +
								(s.core === "dropped"
									? " — rdzeń we wraku!"
									: ""),
							done: s.core === "delivered",
						},
						{
							text:
								"Ewakuuj co najmniej 2 badaczy (" +
								s.evacuated +
								"/" +
								s.staff +
								")",
							done: s.evacuated >= 2,
						},
						{
							text: "Dodatkowo: ewakuuj wszystkich badaczy",
							secondary: true,
							done: s.evacuated === s.staff,
							failed:
								s.discovered &&
								this.staffInField() + s.evacuated < s.staff,
						},
					];
				if (this.missionId === "colony5")
					return [
						{
							text: "Postój ALFA: przeładunek, stacja i pojazdy ≥50% PW",
							done: s.leg > 0,
						},
						{
							text: "Postój BETA: przeładunek, stacja i pojazdy ≥50% PW",
							done: s.leg > 1,
						},
						{
							text: "Doprowadź co najmniej 2 z 3 konwojowców do latarni Kestrel",
							done: s.mode === "arrived" && s.delivered >= 2,
						},
						{
							text:
								"Dodatkowo: zachowaj wszystkie pojazdy konwoju (" +
								this.haulers().length +
								"/3)",
							secondary: true,
							done: s.mode === "arrived" && s.delivered === 3,
							failed: s.lost > 0,
						},
					];
				const owned = this.nodes.filter((n) => n.owner === 0).length;
				return [
					{
						text:
							"Przejmij węzły sterujące kompleksu (" +
							(s.phase >= 1 ? 3 : owned) +
							"/3)",
						done: s.phase >= 1,
					},
					{
						text: "Zdecyduj o losie Serca popiołu",
						done: !!s.choice,
					},
					...(s.choice === "destroy"
						? [
								{
									text:
										"Przeciążenie rdzenia" +
										(s.phase === 2
											? " za " +
												Math.ceil(s.overload) +
												" s — wycofaj wojska"
											: ""),
									done: s.exploded,
								},
							]
						: s.choice === "evacuate"
							? [
									{
										text:
											"Ewakuuj co najmniej 4 techników (" +
											s.evacuated +
											"/" +
											s.staff +
											")",
										done: s.phase === 3,
									},
								]
							: []),
					{ text: "Zniszcz centrum Dominium", done: !this.hq(1) },
					s.choice === "destroy"
						? {
								text: "Dodatkowo: bez strat od wybuchu",
								secondary: true,
								done: s.exploded && s.blastLosses === 0,
								failed: s.exploded && s.blastLosses > 0,
							}
						: s.choice === "evacuate"
							? {
									text: "Dodatkowo: ewakuuj wszystkich techników",
									secondary: true,
									done: s.evacuated === s.staff,
									failed:
										this.staffInField() + s.evacuated <
										s.staff,
								}
							: {
									text: "Dodatkowo: zależy od decyzji o kompleksie",
									secondary: true,
									done: false,
								},
				];
			},
			act2Secondary() {
				const o = this.act2Objectives().find((o) => o.secondary);
				return !!o?.done;
			},
			act2Status() {
				const s = this.act2;
				if (!s) return "";
				if (this.missionId === "colony5") return this.convoyStatus();
				const next = this.act2Objectives().find(
					(o) => !o.done && !o.secondary,
				);
				return next ? next.text + "." : "Cele wykonane.";
			},
			act2Epilogue() {
				const s = this.act2;
				if (this.missionId === "colony4")
					return (
						"Rdzeń sondy ujawnia, dokąd Dominium wywiozło rdzenie dawnej sieci: na Vesper. " +
						(s.evacuated === s.staff
							? "Cała ekipa Tessy wróciła do domu."
							: "Nie wszyscy badacze przeżyli ewakuację.")
					);
				if (this.missionId === "colony5")
					return (
						"Latarnia Kestrel rozbłyska pełną mocą. " +
						(s.delivered === 3
							? "Wszystkie trzy rdzenie dotarły — Vale nie stracił żadnego wozu."
							: "Część rdzeni przepadła w śnieżycy, ale sieć odzyskała dość mocy.") +
						" Pomiary wskazują źródło blokady: Vulkan IX."
					);
				return s.choice === "destroy"
					? "Serce popiołu przestało istnieć. Dominium straciło źródło energii blokady, lecz razem z kompleksem zniknęła wiedza o sieci. Pogranicze jest wolne — i ostrożne wobec własnej siły."
					: "Kompleks Hefajstos ucichł, a sześcioro techników pomaga Lirze przebudować go w elektrownię dla Kolonii. Tam, gdzie była blokada, powstaje wspólna sieć. Świt ma swoją cenę, ale nie zapłacili jej niewinni.";
			},
			act2Summary() {
				const s = this.act2;
				return {
					objectives: this.act2Objectives(),
					secondary: this.act2Secondary(),
					losses: s.losses,
					lostValue: s.lostValue,
					kills: this.kills,
					time: this.time,
					bonus: s.bonus,
					choice: s.choice || null,
				};
			},
			applyAct2Bonus(badges = {}) {
				if (!this.isAct2() || this.act2.bonus) return 0;
				const previous = { colony5: "colony4", colony6: "colony5" }[
					this.missionId
				];
				if (!previous || !badges[previous]) return 0;
				this.credits += 200;
				this.act2.bonus = 200;
				this.say(
					"lira",
					"Odznaka z poprzedniego rozdziału: dodatkowe 200 metalu na start.",
					false,
				);
				return 200;
			},
			tick(dt) {
				base.tick.call(this, dt);
				if (this.result || !this.isAct2()) return;
				this.act2Tick(dt);
				// Same rule as the engine's campaign check, evaluated right after the scripted objectives advance.
				if (
					!this.result &&
					!this.hq(1) &&
					this.hq(0) &&
					this.campaignReady()
				) {
					this.result = "victory";
					this.notify(
						MISSIONS[this.missionId].name + " — misja ukończona.",
						"victory",
					);
				}
			},
			serialize() {
				return {
					...base.serialize.call(this),
					act2: this.act2 || null,
				};
			},
		});

		const numeric = {
			colony4: [
				"phase",
				"reading",
				"evacuated",
				"staff",
				"pursuit",
				"nextPursuit",
				"nextRaid",
				"raids",
				"losses",
				"lostValue",
			],
			colony5: [
				"phase",
				"leg",
				"departAt",
				"haltLeft",
				"delivered",
				"lost",
				"nextRaid",
				"raids",
				"warned",
				"losses",
				"lostValue",
			],
			colony6: [
				"phase",
				"overload",
				"evacuated",
				"staff",
				"blastLosses",
				"nextSwarm",
				"losses",
				"lostValue",
			],
		};
		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			if (!isAct2(g.missionId)) {
				delete g.act2;
				return g;
			}
			const s = state.act2;
			if (
				!s ||
				typeof s !== "object" ||
				s.mission !== g.missionId ||
				!Array.isArray(s.radio) ||
				s.radio.length > 16 ||
				s.radio.some(
					(l) =>
						!l ||
						typeof l.text !== "string" ||
						typeof l.who !== "string",
				) ||
				numeric[g.missionId].some(
					(k) => !Number.isFinite(s[k]) || s[k] < 0,
				) ||
				!Number.isInteger(s.phase)
			)
				throw Error("Uszkodzony zapis kampanii");
			if (
				g.missionId === "colony5" &&
				(!Number.isInteger(s.leg) ||
					s.leg > 2 ||
					!["waiting", "moving", "storm", "halt", "arrived"].includes(
						s.mode,
					) ||
					!Array.isArray(s.stops) ||
					s.stops.length !== 3)
			)
				throw Error("Uszkodzony zapis konwoju");
			if (
				g.missionId === "colony4" &&
				!["site", "loaded", "dropped", "delivered"].includes(s.core)
			)
				throw Error("Uszkodzony zapis archiwum");
			if (
				g.missionId === "colony6" &&
				s.choice !== null &&
				!["destroy", "evacuate"].includes(s.choice)
			)
				throw Error("Uszkodzony zapis decyzji");
			g.act2 = JSON.parse(JSON.stringify(s));
			for (const e of g.entities)
				if (e.type === "hauler") e.convoy = true;
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports)
		module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
