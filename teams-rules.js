/* Teams: 2 vs 2 scenarios. The player (team 0) and an allied commander (team 3) share one edge of the map,
   the enemy commanders (teams 1 and 4) the other. Allies share vision, never fire at each other, take relays
   for their side (engine: Game.allied / Game.sideLeader) and win or lose together: the enemy side is beaten
   when all its command centres fall; the player loses with their own command centre.
   Loaded after enemy-ai.js. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.teamsInstalled) return;
		RTS.teamsInstalled = true;
		const { Game, MISSIONS } = RTS;
		RTS.TEAM_MODES = {
			ffa: { name: "Każdy na każdego", code: "" },
			duo: { name: "2 na 2 — Ty i sojusznik AI", code: "T" },
		};
		const SIDES = { 0: 0, 3: 0, 1: 1, 4: 1 };
		const old = {};
		for (const k of ["configureSkirmish", "canTarget", "enemyBases"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;

		Object.assign(Game.prototype, {
			configureSkirmish(input = {}) {
				// Survival has no enemy side — except a co-op network battle (network-modes.js), where the defenders are allies.
				const duo = input.teams === "duo" && (input.mode !== "survival" || input.coop) && (!MISSIONS[this.missionId]?.campaign || MISSIONS[this.missionId].act === 3);
				// Two sides of two: four bases, placed so that teams 0 and 3 share one edge (corner order in placeCornerBases).
				// Sides are known before the bases are set up (factions, commanders, vision).
				this.alliances = duo ? { ...SIDES } : null;
				const result = old.configureSkirmish.call(this, duo ? { ...input, players: 4 } : input);
				this.scenario.teams = duo ? "duo" : "ffa";
				if (duo) {
					if (this.aiActive?.()) this.nextWave = this.aiNextAttack();
					this.explored.fill(0);
					this.updateVision();
				}
				return result;
			},
			canTarget(a, b) {
				if (a && b && a.team !== b.team && this.allied(a.team, b.team)) return false;
				return old.canTarget.call(this, a, b);
			},
			// Enemy command centres: the ally's is not among them (victory, objectives, AI rivals).
			enemyBases() {
				return old.enemyBases.call(this).filter((b) => !this.allied(0, b.team));
			},
			allyTeams() {
				return this.alliances ? [3] : [];
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			if (g.alliances !== null && g.alliances !== undefined) {
				const ok = typeof g.alliances === "object" && Object.entries(g.alliances).every(([k, v]) => Number.isInteger(Number(k)) && Number.isInteger(v));
				if (!ok) throw Error("Uszkodzony zapis drużyn");
			} else g.alliances = null;
			if (g.scenario) g.scenario.teams = g.alliances ? "duo" : "ffa";
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
