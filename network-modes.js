/* Scenario modes and the Inwazja in network play (0.155). Loaded last in the rules chain (after invasion-rules.js
   and watchers-rules.js); shared by the browser, the lobby and the tests.
   - RTS.NET_MODES / RTS.netModeAllowed(mode, { lobby, seats, aiFoes }): which modes a network battle can have.
     Competitive modes (conquest, relays, hill, expedition) for any battle; the Inwazja for two sides only (one on
     one, also against the computer); the cooperative ones (defense, survival) in a lobby battle whose other side is
     all computers — the players defend together. A mode the battle does not allow falls back to conquest, the same
     on every computer (the settings are the same everywhere).
   - The Inwazja: the battle starts in orbit above the chosen planet (the orbit map of its biome). When the orbit is
     decided (a station falls or the time runs out) every computer builds the ground battle at the same step —
     RTS.nextNetworkPhase(game) — and the lockstep goes on with it (netplay.js). A side that surrenders in orbit
     gives up the whole operation.
   - Co-op: the human seats keep their bases in survival, the waves go for the nearest defenders' centre, the
     defenders lose when the last of their centres falls; in defense the base holds while any defender's centre
     stands.
   Messages, statuses and results of the modes are worded for each player (scenario-modes.js announce). */
(function (root) {
	function install(RTS) {
		if (RTS.netModesInstalled) return;
		RTS.netModesInstalled = true;
		const { Game, MISSIONS, MODES, dist } = RTS;

		const NET_MODES = (RTS.NET_MODES = {
			conquest: {},
			relays: {},
			hill: {},
			expedition: {},
			invasion: { duel: true, note: "tylko jeden na jednego, na mapie planety" },
			defense: { coop: true, note: "kooperacja: druga strona — same komputery" },
			survival: { coop: true, note: "kooperacja: druga strona — same komputery" },
		});
		// lobby: a battle through the server; seats: 2 or 4; aiFoes: every seat of the other side is the computer.
		RTS.netModeAllowed = (mode, { lobby = false, seats = 2, aiFoes = false } = {}) => {
			const m = NET_MODES[mode];
			if (!m || !MODES[mode]) return false;
			if (m.duel && seats !== 2) return false;
			if (m.coop && !(lobby && aiFoes)) return false;
			return true;
		};
		// What the settings say about the battle: a lobby battle (seats with teams), its size, computers on the other side.
		const shape = (settings) => {
			const players = settings.players || [],
				lobby = players.some((p) => Number.isInteger(p?.team)),
				seats = lobby && players.length >= 4 ? 4 : 2,
				other = seats === 4 ? [1, 4] : [1];
			return { lobby, seats, aiFoes: lobby && other.every((t) => players.find((p) => p?.team === t)?.ai ?? true) };
		};
		RTS.netBattleShape = shape;
		// The orbit's actions of the Inwazja (invasion-rules.js) as network commands: drop pods, strike from orbit.
		Object.assign(RTS.NET_COMMANDS, { orbitalDrop: 2, orbitStrike: 2 });
		const validMap = (id) => (MISSIONS[id] && !MISSIONS[id].campaign ? id : "horizon");

		const baseCreate = RTS.createNetworkGame;
		RTS.createNetworkGame = function (settings = {}) {
			const map = validMap(settings.map),
				ground = settings.invasion?.phase === "ground";
			let mode = RTS.netModeAllowed(settings.mode, shape(settings)) ? settings.mode : "conquest";
			// The Inwazja needs a planet; on a map in space it is an ordinary conquest.
			if (mode === "invasion" && MISSIONS[map].space) mode = "conquest";
			let g;
			if (mode === "invasion" && !ground) g = baseCreate({ ...settings, map: Game.prototype.invasionOrbitMap(map) || "orbit", mode: "conquest", invasion: { phase: "orbit", target: map } });
			else g = baseCreate({ ...settings, map, mode, invasion: mode === "invasion" ? settings.invasion : undefined, coop: !!NET_MODES[mode].coop });
			// The settings as agreed (the next phase of an Inwazja is built from them).
			g.netSettings = { ...settings, invasion: undefined };
			return g;
		};

		// The ground battle of an Inwazja once its orbit is decided (null otherwise, or after a surrender).
		RTS.nextNetworkPhase = function (g) {
			if (!g.network || !g.netSettings || g.netSurrendered || g.invasion?.phase !== "orbit") return null;
			const C = g.invasionResult?.();
			if (!C) return null;
			const next = RTS.createNetworkGame({ ...g.netSettings, mode: "invasion", invasion: { phase: "ground", owner: C.owner, pods: C.pods, from: g.missionId } });
			next.viewer = g.viewer;
			next.invasion.orbit = { mine: C.mine, theirs: C.theirs, pods: C.pods, decided: g.invasion.decided || "station" };
			if (g.pausesLeft) next.pausesLeft = { ...g.pausesLeft };
			// A player the computer held in orbit is still away: the computer keeps the side on the planet.
			for (const team of next.humans.slice()) if (!g.isHuman(team)) next.netTakeover?.(team, true);
			return next;
		};

		const old = {};
		for (const k of ["surrender", "teamResult", "setupSurvival", "survivalTarget", "modeHomeAlive", "modeResult"]) old[k] = Game.prototype[k];
		// The human seats of a battle (also while the computer holds one for a dropped player).
		const humanSeats = (g) => (g.players ? Object.entries(g.players).filter(([, p]) => !p.ai).map(([t]) => Number(t)) : [0]);
		const side = (g, team) => (g.alliances ? g.sideLeader(team) : team);

		Object.assign(Game.prototype, {
			surrender() {
				if (this.network && !this.result) this.netSurrendered = true;
				return old.surrender.call(this);
			},
			// Co-op survival: there is no enemy centre — the defenders lose with their last one.
			teamResult() {
				if (this.modeState?.mode !== "survival") return old.teamResult.call(this);
				const own = side(this, this.perspective ?? 0),
					alive = this.entities.some((e) => e.type === "hq" && e.hp > 0 && side(this, e.team) === own);
				return alive ? null : "defeat";
			},
			// Co-op survival keeps every human seat's base (one player: only the player's).
			setupSurvival() {
				// (A lobby battle: its players carry the computer flag, set before the battle is configured.)
				const lobby = Object.values(this.players || {}).some((p) => typeof p?.ai === "boolean"),
					keep = lobby ? humanSeats(this).filter((t) => t !== 0) : [],
					kept = this.entities.filter((e) => keep.includes(e.team));
				old.setupSurvival.call(this);
				this.entities.push(...kept);
			},
			// The waves go for the defenders' centre nearest to them.
			survivalTarget(from) {
				if (!this.network) return old.survivalTarget.call(this, from);
				const seats = humanSeats(this),
					p = from || { x: this.W / 2, y: this.H / 2 },
					hqs = this.entities.filter((e) => e.type === "hq" && e.hp > 0 && seats.includes(e.team)).sort((a, b) => dist(a, p) - dist(b, p));
				return hqs[0] || old.survivalTarget.call(this, from);
			},
			modeHomeAlive() {
				if (!this.network) return old.modeHomeAlive.call(this);
				const first = this.humans[0] ?? 0;
				return this.entities.some((e) => e.type === "hq" && e.hp > 0 && (e.team === first || this.allied(first, e.team)));
			},
			// The end of a co-op survival: the time held, for every defender.
			modeResult() {
				const text = old.modeResult.call(this);
				if (this.network && this.modeState?.mode === "survival" && this.result === "defeat" && humanSeats(this).length > 1) return text.replace("Przetrwano", "Razem przetrwaliście");
				return text;
			},
		});
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
