/* Scenario maps with shaped terrain: rivers and chasms built from overlapping ellipses, themed obstacles. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.frontierInstalled) return;
		RTS.frontierInstalled = true;
		const { Game, TYPES, MISSIONS, dist } = RTS;

		// A blocking band along a polyline, with fords left open around the given points.
		function chain(
			points,
			rx,
			ry,
			kind,
			fords = [],
			fordRadius = 190,
			step = 80,
		) {
			const out = [];
			for (let i = 0; i < points.length - 1; i++) {
				const [ax, ay] = points[i],
					[bx, by] = points[i + 1],
					len = Math.hypot(bx - ax, by - ay),
					n = Math.max(1, Math.round(len / step));
				for (let k = 0; k < n; k++) {
					const t = k / n,
						p = {
							x: Math.round(ax + (bx - ax) * t),
							y: Math.round(ay + (by - ay) * t),
						};
					if (
						fords.every(
							([fx, fy]) =>
								Math.hypot(p.x - fx, p.y - fy) > fordRadius,
						)
					)
						out.push({ ...p, rx, ry, kind });
				}
			}
			const [lx, ly] = points.at(-1);
			if (
				fords.every(
					([fx, fy]) => Math.hypot(lx - fx, ly - fy) > fordRadius,
				)
			)
				out.push({ x: lx, y: ly, rx, ry, kind });
			return out;
		}
		const block = (kind, list) =>
			list.map(([x, y, w, h]) =>
				kind
					? { x: x - w / 2, y: y - h / 2, w, h, kind }
					: { x: x - w / 2, y: y - h / 2, w, h },
			);
		const deposits = (list) =>
			list.map(([x, y, amount], i) => ({ id: i + 1, x, y, amount }));

		const MAPS = {
			lumen: {
				mission: {
					name: "Świetlisty Gąszcz",
					planet: "Lumeria V",
					biome: "ash",
					theme: "lumen",
					mirror: "none",
					weatherName: "Tropikalna ulewa",
					description:
						"Pradawna dżungla olbrzymich drzew, które nocą świecą własnym światłem. Środkiem mapy wije się świetlista rzeka z trzema brodami, a nad jej zakolami unoszą się porośnięte skalne wyspy. Gęstwina daje piechocie osłonę.",
				},
				waters: () => [
					...chain(
						[
							[1600, 40],
							[1760, 420],
							[1560, 800],
							[1800, 1180],
							[1580, 1560],
							[1720, 2130],
						],
						105,
						85,
						"glow",
						[
							[1660, 610],
							[1690, 1370],
							[1640, 1930],
						],
					),
					{ x: 900, y: 1080, rx: 150, ry: 95, kind: "glow" },
					{ x: 2480, y: 1100, rx: 160, ry: 95, kind: "glow" },
				],
				obstacles: () =>
					block("grove", [
						[1100, 560, 150, 150],
						[1270, 760, 110, 110],
						[2250, 600, 140, 140],
						[2120, 820, 110, 110],
						[1000, 1500, 160, 160],
						[1210, 1660, 110, 110],
						[2350, 1470, 150, 150],
						[2560, 1620, 120, 120],
						[1330, 1080, 120, 120],
						[2060, 1270, 130, 130],
						[700, 1330, 100, 100],
						[2700, 830, 110, 110],
					]),
				ores: [
					[1340, 420, 5200],
					[2020, 1720, 5200],
					[1250, 1330, 4600],
					[2120, 1030, 4600],
					[640, 1080, 4000],
					[2760, 1100, 4000],
				],
				gasFields: [
					[1450, 1780, 2600],
					[1950, 360, 2600],
					[1000, 850, 2000],
				],
				crystalFields: [
					[1880, 560, 1600],
					[1400, 1480, 1600],
					[2600, 1330, 1200],
					[760, 850, 1200],
				],
			},
			skyfall: {
				mission: {
					name: "Wiszące Szczyty",
					planet: "Aerion",
					biome: "ash",
					theme: "skyfall",
					barren: true,
					mirror: "none",
					weatherName: "Burza w chmurach",
					description:
						"Świat zawieszonych gór i bezdennych rozpadlin. Krzyż przepaści dzieli planetę na cztery płaskowyże połączone wąskimi skalnymi mostami. Kto utrzyma mosty, ten dyktuje tempo bitwy. Lotnictwo przelatuje nad przepaściami bez przeszkód.",
				},
				waters: () => [
					...chain(
						[
							[1680, 40],
							[1640, 500],
							[1720, 1000],
							[1650, 1500],
							[1700, 2130],
						],
						120,
						105,
						"chasm",
						[
							[1670, 720],
							[1690, 1380],
						],
					),
					...chain(
						[
							[40, 1080],
							[600, 1020],
							[1250, 1120],
							[1520, 1080],
						],
						115,
						100,
						"chasm",
						[[820, 1060]],
					),
					...chain(
						[
							[1850, 1080],
							[2300, 1140],
							[2900, 1040],
							[3330, 1100],
						],
						115,
						100,
						"chasm",
						[[2560, 1090]],
					),
				],
				obstacles: () =>
					block("spire", [
						[1000, 520, 90, 90],
						[2400, 560, 90, 90],
						[1050, 1600, 90, 90],
						[2350, 1650, 90, 90],
						[1250, 300, 70, 70],
						[2150, 1850, 70, 70],
						[1300, 1380, 80, 80],
						[2050, 760, 80, 80],
					]),
				ores: [
					[1150, 760, 5000],
					[2250, 1400, 5000],
					[1300, 1650, 4200],
					[2100, 520, 4200],
					[800, 1350, 4000],
					[2600, 800, 4000],
				],
				gasFields: [
					[1350, 560, 2400],
					[2000, 1600, 2400],
				],
				crystalFields: [
					[1480, 850, 1500],
					[1900, 1300, 1500],
					[820, 640, 1100],
					[2500, 1520, 1100],
				],
			},
			twinsun: {
				mission: {
					name: "Wydmy Bliźniaczych Słońc",
					planet: "Kessar",
					biome: "dust",
					sunny: true,
					twinSun: true,
					theme: "twinsun",
					barren: true,
					mirror: "none",
					weatherName: "Burza piaskowa",
					description:
						"Pustynia pod dwoma słońcami. Wysokie płaskowyże tworzą kaniony, a przez środek mapy ciągnie się kadłub rozbitego krążownika z przejściami między pękniętymi sekcjami. Kryształy z jego rdzeni wciąż świecą w piasku; w wydmach czają się paszczaki.",
				},
				waters: () => [{ x: 1680, y: 420, rx: 130, ry: 70 }],
				obstacles: () => [
					...block("mesa", [
						[1140, 370, 380, 230],
						[2230, 390, 360, 220],
						[1140, 1780, 360, 220],
						[2230, 1770, 380, 230],
						[830, 1060, 260, 320],
						[2530, 1060, 260, 320],
					]),
					...block("wreck", [
						[1370, 1085, 280, 150],
						[1800, 1080, 300, 190],
						[2240, 1090, 260, 140],
					]),
					...block("debris", [
						[1560, 1300, 70, 50],
						[1990, 880, 80, 50],
					]),
				],
				ores: [
					[1400, 700, 5200],
					[1960, 1460, 5200],
					[1100, 1350, 4200],
					[2250, 780, 4200],
					[560, 1080, 4000],
					[2800, 1080, 4000],
				],
				gasFields: [
					[1680, 1560, 2600],
					[1680, 640, 2600],
				],
				crystalFields: [
					[1580, 860, 1800],
					[1900, 1290, 1800],
					[1250, 1500, 1100],
					[2120, 660, 1100],
				],
			},
			magma: {
				mission: {
					name: "Rzeki Magmy",
					planet: "Pyrrhos",
					biome: "ash",
					theme: "magma",
					barren: true,
					mirror: "none",
					weatherName: "Burza wulkaniczna",
					description:
						"Wulkaniczny świat przecięty dwiema rzekami lawy. Bazaltowe przeprawy są jedynymi drogami do centralnej kaldery z najbogatszymi złożami. Obsydianowe iglice osłaniają piechotę, a lawa rozświetla noc.",
				},
				waters: () => [
					...chain(
						[
							[1150, 40],
							[1050, 520],
							[1240, 1020],
							[1060, 1560],
							[1180, 2130],
						],
						100,
						85,
						"lava",
						[
							[1110, 760],
							[1130, 1680],
						],
					),
					...chain(
						[
							[2210, 40],
							[2320, 600],
							[2130, 1120],
							[2300, 1600],
							[2200, 2130],
						],
						100,
						85,
						"lava",
						[
							[2250, 470],
							[2220, 1390],
						],
					),
					{ x: 1680, y: 1080, rx: 190, ry: 130, kind: "lava" },
				],
				obstacles: () =>
					block("spire", [
						[1500, 700, 80, 120],
						[1880, 700, 80, 120],
						[1480, 1460, 80, 120],
						[1880, 1450, 80, 120],
						[1680, 420, 70, 110],
						[1680, 1760, 70, 110],
						[700, 1080, 90, 130],
						[2660, 1080, 90, 130],
					]),
				ores: [
					[1500, 880, 5600],
					[1860, 1280, 5600],
					[1680, 660, 5000],
					[1680, 1500, 5000],
					[560, 900, 4000],
					[2800, 1260, 4000],
				],
				gasFields: [
					[1380, 880, 2800],
					[1980, 1300, 2800],
					[800, 760, 2000],
					[2560, 1400, 2000],
				],
				crystalFields: [
					[1450, 1280, 1600],
					[1910, 860, 1600],
					[1680, 250, 1200],
					[1680, 1920, 1200],
				],
			},
		};
		RTS.FRONTIER_MAPS = MAPS;
		RTS.TERRAIN = { chain, block, deposits };
		for (const [id, map] of Object.entries(MAPS))
			MISSIONS[id] = {
				...map.mission,
				objective: "Zniszcz centrum Dominium.",
			};

		const base = { configureMission: Game.prototype.configureMission };
		Object.assign(Game.prototype, {
			// Units and habitats placed by an earlier layout must not start inside new terrain.
			settleIntoTerrain() {
				const free = (p, pad) =>
					!this.blocked(p.x, p.y, pad) &&
					[
						...this.ores,
						...this.gasFields,
						...this.crystalFields,
					].every((o) => dist(o, p) > 110);
				for (const e of this.entities) {
					// Habitats keep a wider margin so their guardians can move around the den.
					const pad = TYPES[e.type].threat
						? 50
						: TYPES[e.type].radius + 6;
					if (free(e, pad)) continue;
					for (let r = 60; r < 900; r += 40) {
						let placed = false;
						for (let k = 0; k < 16; k++) {
							const p = {
								x: e.x + Math.cos((k * Math.PI) / 8) * r,
								y: e.y + Math.sin((k * Math.PI) / 8) * r,
							};
							if (free(p, pad)) {
								e.x = p.x;
								e.y = p.y;
								if (e.home) e.home = { ...p };
								e.path = [];
								placed = true;
								break;
							}
						}
						if (placed) break;
					}
				}
				for (const w of this.units(0).filter(
					(e) => e.type === "worker",
				))
					this.gather(
						[w.id],
						[...this.ores].sort(
							(a, b) => dist(w, a) - dist(w, b),
						)[0].id,
					);
			},
			theme() {
				return MISSIONS[this.missionId]?.theme || null;
			},
			configureMission() {
				base.configureMission.call(this);
				const map = MAPS[this.missionId];
				if (!map) return;
				this.waters = map.waters();
				this.obstacles = map.obstacles();
				this.ores = deposits(map.ores);
				this.gasFields = deposits(map.gasFields);
				this.crystalFields = deposits(map.crystalFields);
				this.clusterRelays();
				this.settleIntoTerrain();
				this.explored.fill(0);
				this.updateVision();
			},
		});
	}
	if (typeof module !== "undefined" && module.exports)
		module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
