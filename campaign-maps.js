/* Maps made for the campaign and playable as scenarios (M1, 0.162): the Valley of Beacons on Eos (chapter I),
   the Ice Archive on Vesper (II) and the Ruins of Nadir (III). Each layout is symmetric under a half turn round
   the middle of the map, so every pair of opposite corners is fair in a scenario; in its chapter the bases stand
   on fixed spots (CAMPAIGN_MAPS) instead of corners picked by the seed. Plain rocks (no kind) carry the act's
   landmarks in 3D (webgl3d/scene-life-3d.js: the rock nearest the middle, and in chapter I the one nearest the
   player's centre). Same data shape as frontier-maps.js, registered into RTS.FRONTIER_MAPS. Shared by browser
   and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.campaignMapsInstalled) return;
		RTS.campaignMapsInstalled = true;
		const { Game, TYPES, MISSIONS, TERRAIN, FRONTIER_MAPS } = RTS;
		const { chain, block, deposits } = TERRAIN;
		const W = 3360,
			H = 2160;
		// A half turn round the middle: [x, y, ...rest] → its twin on the other side.
		const turn = ([x, y, ...rest]) => [W - x, H - y, ...rest];
		const both = (list) => [...list, ...list.map(turn)];
		const chains = (list, rx, ry, kind, fords = []) =>
			list.flatMap((points) => [
				...chain(points, rx, ry, kind, fords),
				...chain(points.map(turn), rx, ry, kind, fords.map(turn)),
			]);

		const MAPS = {
			lanterns: {
				mission: {
					name: "Dolina Latarni",
					planet: "Eos",
					biome: "dust",
					theme: "dunesea",
					barren: true,
					mirror: "none",
					description:
						"Szeroka kotlina Eos, nad którą górowała latarnia Kolonii. Niskie grzbiety wydm i płytkie wąwozy mają wiele przejść, a ruiny dawnej osady i skalne wzgórza dają osłonę. Oazy przy obu krańcach doliny i bogate złoża w jej środku zachęcają do szybkiej ekspansji.",
				},
				waters: () => [
					...both([
						[1680, 430, 150, 80],
						[2500, 1500, 120, 70],
					]).map(([x, y, rx, ry]) => ({ x, y, rx, ry })),
					...chains(
						[
							[[640, 980], [900, 880], [1180, 900]],
							[[1250, 1420], [1400, 1620], [1380, 1860]],
							[[2000, 360], [2230, 520], [2450, 560]],
						],
						95,
						55,
						"dune",
					),
				],
				obstacles: () => [
					// The beacon's knoll in the middle, the Silent Station by the south-west corner.
					...block(null, [
						[1680, 1080, 210, 160],
						[930, 1500, 170, 130],
						[2430, 660, 170, 130],
					]),
					...block("outcrop", both([
						[1120, 520, 180, 130],
						[1500, 1360, 130, 100],
						[2150, 1060, 140, 110],
					])),
					...block("ruin", both([
						[1300, 1140, 150, 100],
						[1820, 700, 130, 100],
					])),
				],
				habitats: [[1040, 1300], [2320, 860], [2560, 1080]],
				ores: both([
					[1300, 880, 4600],
					[1680, 790, 5200],
					[700, 1180, 4000],
				]),
				gasFields: both([
					[1150, 760, 2400],
					[1980, 1240, 2000],
				]),
				crystalFields: both([
					[1920, 980, 1500],
					[2300, 420, 1100],
				]),
			},
			vesper: {
				mission: {
					name: "Lodowe Archiwum",
					planet: "Vesper",
					biome: "ice",
					theme: "frozenhive",
					barren: true,
					mirror: "none",
					weatherName: "Śnieżyca",
					description:
						"Pod lodem Vesperu spoczywa zapomniane archiwum Kolonii. Środek mapy zajmuje skuta lodem toń: lód udźwignie piechotę i lekkie pojazdy, ciężkie maszyny zwalniają, a silny wybuch przebija go na kilkadziesiąt sekund — kto stoi w przeręblu, ten ucierpi. Szczeliny lodowca schodzą ku jezioru z obu krańców, a przy brzegach sterczą ruiny stacji i zamarznięte narośle.",
				},
				waters: () => [
					// The frozen lake: two overlapping lobes across the middle — ice that carries units (world-rules.js).
					{ x: 1460, y: 1080, rx: 280, ry: 170, kind: "ice" },
					{ x: 1900, y: 1080, rx: 280, ry: 170, kind: "ice" },
					...both([[900, 1080, 130, 80]]).map(([x, y, rx, ry]) => ({ x, y, rx, ry })),
					...chains(
						[
							[[1080, 60], [1120, 300], [1060, 520]],
							[[640, 760], [820, 700]],
							[[2180, 380], [2400, 520], [2560, 700]],
						],
						90,
						60,
						"crevasse",
					),
				],
				obstacles: () => [
					// The archive gate above the north shore (and its twin to the south).
					...block(null, both([[1680, 690, 190, 110]])),
					...block("ruin", both([
						[1230, 760, 150, 100],
						[2280, 820, 130, 110],
						[1500, 400, 120, 90],
					])),
					...block("resin", both([[1950, 560, 200, 80]])),
					...block("eggs", both([[880, 1360, 80, 60]])),
				],
				habitats: [[1000, 700], [2360, 1460], [2600, 980]],
				ores: both([
					[1680, 500, 5000],
					[1060, 1250, 4600],
					[700, 1340, 3800],
				]),
				gasFields: both([[1300, 580, 2400]]),
				crystalFields: both([
					[2040, 820, 1600],
					[1330, 300, 1100],
				]),
			},
			nadir: {
				mission: {
					name: "Ruiny Nadiru",
					planet: "Nadir",
					biome: "ash",
					theme: "derelict",
					barren: true,
					mirror: "none",
					weatherName: "Burza popiołu",
					description:
						"Miasto Prekursorów na Nadirze: siatka zrujnowanych kwartałów przecięta wąskimi ulicami, z szeroką aleją i placem cytadeli w środku. Kto trzyma skrzyżowania, ten trzyma złoża. Na dwóch placach dymią stare wieże przetwarzania, a na przedmieściach gnieżdżą się pajęczaki.",
				},
				waters: () =>
					both([[1680, 290, 150, 70]]).map(([x, y, rx, ry]) => ({ x, y, rx, ry })),
				obstacles: () => {
					// City blocks on a grid; the avenue (x 1680) and the boulevard (y 1080) stay open.
					const blocks = [];
					for (const x of [1100, 1420, 1940, 2260])
						for (const y of [520, 820, 1340, 1640])
							if (!(x === 1420 && y === 520) && !(x === 1940 && y === 1640) && !(x === 1100 && y === 1340) && !(x === 2260 && y === 820))
								blocks.push([x, y, 230, 190]);
					return [
						// The citadel's obelisk in the middle of the plaza.
						...block(null, [[1680, 1080, 170, 170]]),
						...block("ruin", blocks),
						...block("processor", both([[1420, 520, 120, 120]])),
						...block("eggs", both([[720, 640, 80, 60]])),
					];
				},
				habitats: [[1100, 1340], [2260, 820], [1680, 1720]],
				ores: both([
					[1680, 660, 5200],
					[1260, 1080, 4600],
					[780, 1450, 4000],
				]),
				gasFields: both([[1260, 670, 2400]]),
				crystalFields: both([
					[1530, 940, 1800],
					[1100, 1340, 1000],
				]),
			},
		};
		// M2 (0.163): the valley of chapter I after the Admiralty's landing (XI) and the Admiralty's bastions (XII).
		const valley = MAPS.lanterns,
			// What stood where the cruiser fell (the beacon's knoll and the nearest ruins) is gone.
			middle = (o) => o.x < 2170 && o.x + o.w > 1190 && o.y < 1240 && o.y + o.h > 920;
		MAPS.ashvalley = {
			mission: {
				name: "Wypalona Dolina",
				planet: "Eos",
				biome: "dust",
				theme: "dunesea",
				barren: true,
				mirror: "none",
				weatherName: "Burza pyłowa",
				description:
					"Dolina Latarni po desancie Admiralicji. Na miejscu latarni leży rozbity krążownik, przez którego pęknięte sekcje prowadzą przejścia, a kotlinę zasypały szczątki zestrzelonych kapsuł. Oazy przetrwały, ruiny osady — nie wszystkie.",
			},
			waters: valley.waters,
			obstacles: () => [
				// The cruiser across the middle, where the beacon stood.
				...block("wreck", [
					[1390, 1080, 240, 130],
					[1680, 1080, 270, 170],
					[1970, 1080, 240, 130],
				]),
				...valley.obstacles().filter((o) => !middle(o)),
				// The remains of shot-down pods.
				...block("debris", both([
					[1000, 1500, 70, 50],
					[1540, 1380, 80, 50],
					[2280, 1240, 60, 50],
					[860, 620, 70, 50],
				])),
			],
			habitats: [[1040, 1300], [2320, 860], [1680, 1300]],
			ores: both([
				[1680, 800, 5400],
				[1300, 880, 4200],
				[700, 1180, 4000],
			]),
			gasFields: both([
				[1150, 760, 2400],
				[2000, 1270, 2000],
			]),
			crystalFields: both([
				[1400, 1250, 1600],
				[2300, 420, 1100],
			]),
		};
		MAPS.bastion = {
			mission: {
				name: "Bastion Admiralicji",
				planet: "Nadir",
				biome: "ash",
				theme: "derelict",
				barren: true,
				mirror: "none",
				weatherName: "Burza popiołu",
				description:
					"Dwa bastiony Admiralicji w przeciwległych narożnikach, każdy za murem z dwiema bramami i wieżą na rogu. Między nimi biegnie Popielny Szlak: stare wieże przetwarzania, ściany narośli i złoża, o które trzeba walczyć w otwartym polu. Bez przełamania bram szturm na centrum nie ma sensu.",
			},
			waters: () => both([[1680, 260, 140, 60]]).map(([x, y, rx, ry]) => ({ x, y, rx, ry })),
			obstacles: () => [
				// The walls of the north-east bastion (and their twins round the south-west one): a west gate and a south gate.
				...block("ruin", both([
					[2300, 200, 70, 360],
					[2300, 740, 70, 400],
					[2470, 980, 410, 70],
					[3090, 980, 480, 70],
				])),
				...block("processor", both([
					[2300, 990, 120, 120],
					[1500, 1000, 120, 120],
				])),
				...block("resin", both([
					[1200, 700, 260, 80],
					[900, 1000, 240, 80],
				])),
				...block("eggs", both([[1300, 1500, 90, 70]])),
				...block(null, both([
					[1680, 600, 200, 140],
					[900, 520, 180, 130],
				])),
			],
			habitats: [[1200, 1640], [2160, 520], [1680, 1080]],
			// In a scenario the first two sides start in the bastions (north-east, south-west).
			prefer: (g, [x, y]) => x > g.W / 2 !== y > g.H / 2,
			ores: both([
				[2620, 700, 4200],
				[1680, 830, 5200],
				[1150, 880, 4600],
				[1300, 300, 4000],
			]),
			gasFields: both([
				[2560, 250, 1800],
				[1350, 1250, 2400],
			]),
			crystalFields: both([
				[1900, 1000, 1600],
				[3150, 760, 900],
			]),
		};
		// M4 (0.165): two new worlds (themes of world-art.js) — the ocean world Thalassa and the crystal ridges of
		// Nivalis (chapter XIII).
		// The sea of Thalassa: a wide channel round the middle island (two rings of water side by side) and straits out
		// to the edges of the map (chains of water of kind "sea"); the breaks in them are the sandbars — fords about
		// 180 wide: two on the ring (towards the north-west and south-east islands) and one on each of the west and
		// east straits. The north and south straits are open water.
		const ringOf = (cx, cy, rx, ry, n) => Array.from({ length: n + 1 }, (_, i) => [Math.round(cx + Math.cos((i / n) * Math.PI * 2) * rx), Math.round(cy + Math.sin((i / n) * Math.PI * 2) * ry)]);
		const diagonals = (rx, ry) => [45, 225].map((d) => [Math.round(1680 + Math.cos((d * Math.PI) / 180) * rx), Math.round(1080 + Math.sin((d * Math.PI) / 180) * ry)]);
		const THALASSA = () => [
			...[[690, 470], [850, 610]].flatMap(([rx, ry]) => chain(ringOf(1680, 1080, rx, ry, 64), 200, 190, "sea", diagonals(rx, ry), 270)),
			...[
				[[[1680, 520], [1680, 250], [1680, -60]], []],
				[[[880, 1080], [500, 1080], [-60, 1080]], [[440, 1080]]],
			].flatMap(([points, fords]) => [
				...chain(points, 200, 190, "sea", fords, 270),
				...chain(points.map(turn), 200, 190, "sea", fords.map(turn), 270),
			]),
		];
		MAPS.thalassa = {
			mission: {
				name: "Archipelag Thalassy",
				planet: "Thalassa",
				biome: "ash",
				theme: "ocean",
				barren: true,
				mirror: "none",
				weatherName: "Sztorm",
				description:
					"Oceaniczny świat Thalassy: dwie szerokie cieśniny wiją się wokół wyspy środkowej z najbogatszymi złożami i rozdzielają wybrzeża, na których stoją bazy. Na wyspę i między wybrzeżami prowadzą tylko mielizny — każdą łatwo zablokować, a kto trzyma brody, ten trzyma środek. Co cztery minuty przychodzi przypływ i na minutę zalewa mielizny. Na plażach gnieżdżą się pajęczaki, sztormy przychodzą z deszczem i piorunami.",
			},
			waters: THALASSA,
			// Tides (world-rules.js): the sea over the six fords for a minute in every four, from the third minute.
			tides: {
				first: 180,
				period: 240,
				high: 60,
				bodies: [...[[690, 470], [850, 610]].flatMap(([rx, ry]) => diagonals(rx, ry).map(([x, y]) => [x, y, 230, 210])), [440, 1080, 280, 220], [2920, 1080, 280, 220]],
			},
			obstacles: () => [
				...block(null, both([[1400, 1150, 140, 110]])),
				...block("outcrop", both([
					[780, 820, 120, 90],
					[950, 420, 120, 90],
				])),
			],
			habitats: [[900, 1450], [2460, 710], [1250, 280]],
			ores: [[1680, 1080, 6400], ...both([[1150, 260, 5000], [620, 640, 4200]])],
			gasFields: both([[1480, 1200, 2400], [1350, 300, 2000]]),
			crystalFields: both([[1500, 980, 1600], [900, 250, 1100]]),
		};
		MAPS.crystals = {
			mission: {
				name: "Kryształowe Grzbiety",
				planet: "Nivalis",
				biome: "ice",
				theme: "crystal",
				barren: true,
				mirror: "none",
				weatherName: "Śnieżyca",
				description:
					"Na Nivalis z lodu wyrastają grzbiety kryształu: kolumny wysokie jak wieże blokują przejście, odbijają światło i świecą nocą. Dwa łuki grzbietów otaczają odsłonięty płaskowyż z najbogatszymi kryształami — wejścia prowadzą ze wschodu, z zachodu i wąskimi przełęczami w środku łuków. Bliżej narożników lodowiec pękł szczelinami.",
			},
			waters: () =>
				chains(
					[
						[[600, 1330], [860, 1400], [1040, 1620]],
						[[1250, 1880], [1380, 2140]],
					],
					90,
					60,
					"crevasse",
				),
			obstacles: () => [
				// The two arcs of the ridges round the plateau (the north arc and its twin), a pass in each middle:
				// clusters every 110 along a half-ellipse, overlapping into one wall.
				...block("crystal", both([
					...Array.from({ length: 19 }, (_, i) => {
						const a = Math.PI + ((i + 2) / 22) * Math.PI,
							x = Math.round(1680 + Math.cos(a) * 820),
							y = Math.round(1000 + Math.sin(a) * 470);
						return Math.abs(x - 1680) < 140 ? null : [x, y, 170, 140];
					}).filter(Boolean),
					[700, 520, 110, 100],
					[2620, 1300, 110, 100],
				])),
				...block(null, both([[1680, 330, 160, 110]])),
			],
			habitats: [[1200, 1240], [2160, 920], [1680, 140]],
			ores: both([
				[1480, 380, 5000],
				[800, 1080, 4200],
			]),
			gasFields: both([[1150, 400, 2400], [2280, 1060, 2000]]),
			crystalFields: [[1680, 1080, 2600], ...both([[1450, 960, 2000], [1960, 860, 1400]])],
		};
		for (const [id, map] of Object.entries(MAPS)) {
			FRONTIER_MAPS[id] = map;
			MISSIONS[id] = { ...map.mission, objective: "Zniszcz centrum Dominium." };
		}
		RTS.CAMPAIGN_MAP_LAYOUTS = MAPS;
		// Chapters on these maps, with the bases on fixed spots (player, enemy).
		const CAMPAIGN_MAPS = (RTS.CAMPAIGN_MAPS = {
			colony1: { map: "lanterns", bases: [[420, 1760], [2940, 400]] },
			colony2: { map: "vesper", bases: [[420, 400], [2940, 1760]] },
			colony3: { map: "nadir", bases: [[460, 1080], [2900, 1080]] },
			colony10: { map: "eosdocks", bases: [[420, 1760], [2940, 400]] },
			colony11: { map: "ashvalley", bases: [[420, 1760], [2940, 400]] },
			colony12: { map: "bastion", bases: [[420, 1760], [2940, 400]] },
			colony13: { map: "crystals", bases: [[420, 1760], [2940, 400]] },
		});

		const base = { baseSpots: Game.prototype.baseSpots, configureMission: Game.prototype.configureMission };
		Object.assign(Game.prototype, {
			// Called by the campaign setup of act I (advanced-rules.js) before the bases are placed.
			applyCampaignMap() {
				// Any registered map (the space ones come from space-rules.js).
				const chapter = CAMPAIGN_MAPS[this.missionId],
					map = chapter && FRONTIER_MAPS[chapter.map];
				if (!map) return false;
				this.waters = map.waters();
				this.obstacles = map.obstacles();
				this.ores = deposits(map.ores);
				this.gasFields = deposits(map.gasFields);
				this.crystalFields = deposits(map.crystalFields);
				return true;
			},
			// The wildlife of a chapter on its own map lives in the map's habitats (spawned after the terrain).
			configureMission() {
				base.configureMission.call(this);
				const chapter = CAMPAIGN_MAPS[this.missionId],
					map = chapter && FRONTIER_MAPS[chapter.map];
				if (!map?.habitats) return;
				const threats = this.entities.filter((e) => e.team === 2 && TYPES[e.type].threat),
					biome = MISSIONS[this.missionId].biome,
					type = threats[0]?.type || (biome === "dust" ? "duneMaw" : biome === "ice" ? "frostTusk" : "ashCrawler");
				map.habitats.forEach(([x, y], i) => {
					let e = threats[i];
					if (!e) {
						e = this.spawn(type, 2, x, y);
						e.species = TYPES[type].name;
					}
					Object.assign(e, { x, y, home: { x, y }, path: [], order: null });
				});
				const extra = new Set(threats.slice(map.habitats.length));
				this.entities = this.entities.filter((e) => !extra.has(e));
			},
			baseSpots() {
				const chapter = CAMPAIGN_MAPS[this.missionId],
					spots = base.baseSpots.call(this);
				const prefer = MAPS[this.missionId]?.prefer;
				if (!chapter) return prefer ? [...spots].sort((a, b) => prefer(this, b) - prefer(this, a)) : spots;
				const rest = spots.filter(([x, y]) => !chapter.bases.some(([bx, by]) => Math.hypot(bx - x, by - y) < 700));
				return [...chapter.bases, ...rest];
			},
		});
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
