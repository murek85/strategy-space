/* Dune-sea and derelict-ship versions of the original scenario maps (new terrain) and matching campaign looks (visual only). Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.themedInstalled) return;
		RTS.themedInstalled = true;
		const { Game, TYPES, MISSIONS, TERRAIN } = RTS;
		const { chain, block, deposits } = TERRAIN;
		// Scenario saves made before these layouts carry no version and are rejected on load.
		const MAP_VERSION = 2;

		const LAYOUTS = {
			horizon: {
				theme: "dunesea",
				description:
					"Morze wydm Khepri IV. Dwa grzbiety piaszczystych fal przecinają mapę, a przejścia między nimi prowadzą na otwarty erg, gdzie w piasku czają się paszczaki. Skalne wyspy dają bezpieczne schronienie i osłonę; bursztynowe kryształy lśnią w pyle.",
				waters: () => [
					...chain([[800, 760], [1250, 640], [1700, 760], [2150, 650], [2560, 760]], 110, 70, "dune", [[1480, 700], [2360, 700]]),
					...chain([[800, 1400], [1250, 1520], [1700, 1400], [2150, 1510], [2560, 1400]], 110, 70, "dune", [[1000, 1460], [1900, 1455]]),
				],
				obstacles: () =>
					block("outcrop", [
						[1300, 1080, 200, 150],
						[2060, 1080, 220, 160],
						[1680, 900, 120, 90],
						[1680, 1270, 120, 90],
						[1100, 380, 160, 120],
						[2250, 380, 160, 120],
						[1100, 1780, 160, 120],
						[2250, 1780, 160, 120],
					]),
				habitats: [[1680, 1080], [950, 1080], [2420, 1080]],
				ores: [[1680, 560, 5200], [1680, 1600, 5200], [1080, 1080, 4600], [2280, 1080, 4600], [600, 1080, 4000], [2760, 1080, 4000]],
				gasFields: [[1450, 420, 2400], [1910, 1740, 2400]],
				crystalFields: [[1480, 1310, 1700], [1880, 850, 1700], [1300, 850, 1200], [2060, 1310, 1200]],
			},
			solar: {
				theme: "goldsand",
				description:
					"Złote wydmy Helionu pod palącym słońcem. Środkiem mapy biegnie kanion między ścianami skalnymi z przejściami na różnych wysokościach; na jego dnie leżą oazy i najbogatsze złoża. Na flankach sypkie grzbiety wydm, w piasku czają się paszczaki.",
				waters: () => [
					{ x: 1680, y: 420, rx: 120, ry: 70 },
					{ x: 1680, y: 1720, rx: 120, ry: 70 },
					...chain([[820, 700], [1060, 900], [980, 1260]], 100, 70, "dune"),
					...chain([[2540, 1460], [2300, 1260], [2380, 900]], 100, 70, "dune"),
				],
				obstacles: () =>
					block("outcrop", [
						[1450, 420, 140, 300],
						[1450, 900, 140, 280],
						[1450, 1500, 140, 320],
						[1910, 560, 140, 300],
						[1910, 1200, 140, 340],
						[1910, 1740, 140, 200],
					]),
				habitats: [[820, 1560], [2540, 560], [1680, 1300]],
				ores: [[1680, 1080, 5600], [1100, 560, 4600], [2260, 1600, 4600], [600, 1080, 4000], [2760, 1080, 4000], [1680, 780, 4200]],
				gasFields: [[1680, 1420, 2600], [1100, 1600, 2200], [2260, 560, 2200]],
				crystalFields: [[1600, 600, 1500], [1760, 1560, 1500], [1230, 1080, 1200], [2130, 1080, 1200]],
			},
			ember: {
				theme: "derelict",
				description:
					"Na Vulkanie IX, pod nieustanną burzą, spoczywa wrak obcego statku o żebrowanym, organicznym kadłubie. Jego wnętrze pełne jest kokonów i kryształów; pajęczaki gnieżdżą się w środku i przy polach jaj na zewnątrz. Stare wieże przetwarzania atmosfery wciąż dymią na flankach.",
				waters: () => [{ x: 1680, y: 1660, rx: 170, ry: 90 }],
				obstacles: () => [
					...block("derelict", [
						[1680, 760, 560, 130],
						[1420, 1000, 130, 360],
						[1940, 1000, 130, 360],
						[1470, 1230, 110, 120],
						[1890, 1230, 110, 120],
					]),
					...block("eggs", [
						[1600, 950, 70, 60],
						[1760, 950, 70, 60],
						[1250, 1450, 90, 70],
						[2110, 700, 90, 70],
					]),
					...block("resin", [
						[1000, 560, 220, 90],
						[2360, 1600, 220, 90],
						[900, 1500, 90, 220],
						[2460, 560, 90, 220],
					]),
					...block("processor", [
						[800, 1080, 150, 150],
						[2560, 1080, 150, 150],
					]),
				],
				habitats: [[1680, 1050], [1250, 1540], [2110, 610]],
				ores: [[1680, 1420, 5600], [1180, 900, 4600], [2180, 1260, 4600], [620, 1300, 4000], [2740, 860, 4000]],
				gasFields: [[1300, 700, 2400], [2060, 1460, 2400]],
				crystalFields: [[1560, 1110, 1800], [1800, 1110, 1800], [1100, 1180, 1100], [2260, 980, 1100]],
			},
			frost: {
				theme: "frozenhive",
				description:
					"Zamarznięta placówka badawcza Nivalis. Ruiny modułów w centrum otaczają szczeliny lodowca z dwoma mostami, a ściany zamrożonych narośli i kokonów zdradzają, że coś tu przetrwało zimę. Rogacze lodowe krążą między ruinami.",
				waters: () => [
					{ x: 900, y: 1080, rx: 170, ry: 100 },
					{ x: 2460, y: 1080, rx: 170, ry: 100 },
					...chain([[1000, 620], [1400, 520], [1960, 520], [2360, 620]], 100, 60, "crevasse", [[1680, 520]]),
					...chain([[1000, 1540], [1400, 1640], [1960, 1640], [2360, 1540]], 100, 60, "crevasse", [[1680, 1640]]),
				],
				obstacles: () => [
					...block("ruin", [
						[1560, 960, 160, 110],
						[1820, 960, 140, 120],
						[1560, 1210, 140, 110],
						[1830, 1200, 170, 110],
					]),
					...block("resin", [
						[1250, 1080, 90, 200],
						[2110, 1080, 90, 200],
					]),
					...block("eggs", [
						[1400, 800, 70, 60],
						[1960, 1360, 70, 60],
					]),
				],
				habitats: [[1690, 1085], [1100, 1300], [2260, 860]],
				ores: [[1100, 800, 4600], [2260, 1360, 4600], [1680, 300, 5000], [1680, 1860, 5000], [600, 1080, 3800], [2760, 1080, 3800]],
				gasFields: [[1300, 1320, 2400], [2060, 840, 2400]],
				crystalFields: [[1680, 760, 1600], [1680, 1410, 1600]],
			},
		};
		// Campaign chapters on the same worlds share the look, not the terrain.
		const LOOKS = {
			training: "goldsand",
			colony1: "dunesea",
			colony2: "frozenhive",
			colony3: "derelict",
		};
		for (const [id, map] of Object.entries(LAYOUTS))
			Object.assign(MISSIONS[id], {
				theme: map.theme,
				barren: true,
				description: map.description,
			});
		for (const [id, theme] of Object.entries(LOOKS))
			Object.assign(MISSIONS[id], { theme, barren: true });
		RTS.THEMED_LAYOUTS = LAYOUTS;
		RTS.THEMED_MAP_VERSION = MAP_VERSION;

		const base = {
			configureSkirmish: Game.prototype.configureSkirmish,
			serialize: Game.prototype.serialize,
		};
		const baseFromSave = Game.fromSave;
		Object.assign(Game.prototype, {
			// Scenarios always pass through configureSkirmish; the bare constructor keeps the classic layout.
			applyThemedLayout() {
				const map = LAYOUTS[this.missionId];
				if (!map || this.mapVersion) return;
				this.waters = map.waters();
				this.obstacles = map.obstacles();
				this.ores = deposits(map.ores);
				this.gasFields = deposits(map.gasFields);
				this.crystalFields = deposits(map.crystalFields);
				const threats = this.entities.filter((e) => TYPES[e.type].threat);
				map.habitats.forEach(([x, y], i) => {
					let e = threats[i];
					if (!e) {
						const type = threats[0]?.type || "duneMaw";
						e = this.spawn(type, 2, x, y);
						e.species = TYPES[type].name;
					}
					Object.assign(e, { x, y, home: { x, y }, path: [], order: null });
				});
				const extra = new Set(threats.slice(map.habitats.length));
				this.entities = this.entities.filter((e) => !extra.has(e));
				this.clusterRelays();
				this.settleIntoTerrain();
				this.mapVersion = MAP_VERSION;
			},
			configureSkirmish(input = {}) {
				this.applyThemedLayout();
				return base.configureSkirmish.call(this, input);
			},
			serialize() {
				return {
					...base.serialize.call(this),
					mapVersion: this.mapVersion || null,
				};
			},
		});
		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			if (LAYOUTS[g.missionId] && g.scenario) {
				if (state.mapVersion !== MAP_VERSION) {
					const error = Error("Zapis starszej wersji mapy");
					error.userMessage =
						"Zapis pochodzi ze starszej wersji mapy " +
						MISSIONS[g.missionId].name +
						". Rozpocznij nową operację, aby zagrać na nowym terenie.";
					error.outdated = true;
					throw error;
				}
				g.mapVersion = MAP_VERSION;
			}
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports)
		module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
