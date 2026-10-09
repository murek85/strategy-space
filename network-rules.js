/* Network play (two humans, one on one) for the deterministic engine. Shared by the browser and the tests.
   - RTS.createNetworkGame(settings): a scenario map where team 0 (the host) and team 1 (the guest) are both human
     sides with their own economy, research, queues and fog; no computer commander, no attack waves. The guest gets
     the same starting force as the host, mirrored to its corner.
   - game.applyCommand(team, name, args): a player's action, received over the network, run as that player. Only
     the listed actions exist; bad arguments or an action that throws are ignored (the same on both computers).
   - game.checksum(): a hash of the simulation state (not of the view), compared by the players to detect a desync.
   - Shared pause: game.pauseGame() / game.resumeGame() are ordinary network actions, so both computers stop and
     start on the same step. Each player may pause RTS.NET_PAUSE.count times, each pause ends by itself after
     RTS.NET_PAUSE.length seconds; either player resumes, after a countdown of RTS.NET_PAUSE.resume seconds.
   - Lobby battles (G4, 0.153): settings whose players carry a team — 1 vs 1 or 2 vs 2 (teams 0 and 3 against 1 and
     4), each seat a human or the computer commander. Every human starts like the host; the result is counted by
     sides (a side is beaten when all its command centres fall). A dropped player's team can be handed to the
     computer and back (netTakeover — system commands of the relay server, the same turn on every computer).
   The lockstep itself (turns, delays, the WebRTC channel, the relay) lives in netplay.js. Loaded after campaign-act3.js. */
(function (root) {
	function install(RTS) {
		if (RTS.networkInstalled) return;
		RTS.networkInstalled = true;
		const { Game, TYPES, dist } = RTS;

		const NET = (RTS.NET = {
			version: 1,
			// Simulation step and turn: commands issued during a turn run at the start of turn + delay.
			step: 1 / 30,
			stepsPerTurn: 3,
			delay: 2,
			// A checksum is exchanged every this many turns.
			checkEvery: 10,
		});
		// Shared pause: pauses per player, the longest pause (s) and the countdown before the battle goes on (s).
		const PAUSE = (RTS.NET_PAUSE = { count: 3, length: 60, resume: 3 });
		// Actions a player may send: [method, number of arguments]. Everything else is refused.
		const COMMANDS = (RTS.NET_COMMANDS = {
			command: 5,
			hold: 1,
			stop: 1,
			enqueue: 2,
			cancelQueue: 1,
			buildStructure: 4,
			buildWallLine: 3,
			gather: 3,
			gatherCrystal: 2,
			repair: 2,
			buildWith: 2,
			assignGas: 2,
			startResearch: 1,
			cancelResearch: 0,
			setRally: 3,
			toggleGate: 1,
			demolish: 1,
			salvage: 2,
			sabotage: 2,
			installModule: 2,
			orbitalStrike: 3,
			board: 2,
			unload: 1,
			setFormation: 1,
			patrol: 3,
			escort: 2,
			surrender: 0,
			trade: 3,
			pauseGame: 0,
			resumeGame: 0,
		});
		// A JSON-like value of limited size (ids, numbers, short strings, small objects such as a wall start point).
		const plain = (v, depth = 0) => {
			if (v === null || typeof v === "boolean" || typeof v === "string") return typeof v !== "string" || v.length <= 40;
			if (typeof v === "number") return Number.isFinite(v);
			if (depth > 2) return false;
			if (Array.isArray(v)) return v.length <= 200 && v.every((x) => plain(x, depth + 1));
			if (typeof v === "object") return Object.keys(v).length <= 8 && Object.values(v).every((x) => plain(x, depth + 1));
			return false;
		};

		Object.assign(Game.prototype, {
			applyCommand(team, name, args = []) {
				if (!this.isHuman(team) || !Object.hasOwn(COMMANDS, name) || !Array.isArray(args) || args.length > COMMANDS[name] || !plain(args)) return false;
				try {
					return this.as(team, () => this[name](...args));
				} catch {
					return false;
				}
			},
			// Giving up: the player's command centre falls (the usual end of a battle).
			surrender() {
				if (this.result) return false;
				const hq = this.hq(this.me);
				if (!hq) return false;
				this.applyDamage(null, hq, hq.hp + 1);
				return true;
			},
			// Shared pause. netPause = { by: team, left: s until it ends by itself, resumeIn: countdown s or null }.
			pauseGame() {
				if (this.result || this.netPause || !this.pausesLeft || this.pausesLeft[this.me] <= 0) return false;
				this.pausesLeft[this.me]--;
				this.netPause = { by: this.me, left: PAUSE.length, resumeIn: null };
				return true;
			},
			resumeGame() {
				if (!this.netPause || this.netPause.resumeIn !== null) return false;
				this.netPause.resumeIn = PAUSE.resume;
				this.netPause.resumedBy = this.me;
				return true;
			},
			// A hash of what the simulation decides (entities, sides, the random seed); not of messages or the view.
			checksum() {
				let h = 2166136261;
				const mix = (n) => {
					h = Math.imul(h ^ (Math.round(n * 64) | 0), 16777619) >>> 0;
				};
				mix(this.seed);
				mix(this.nextId);
				mix(this.time);
				for (const e of this.entities) {
					mix(e.id);
					mix(e.team);
					mix(e.x);
					mix(e.y);
					mix(e.hp);
					mix(e.constructionLeft || 0);
					mix(e.cargo || 0);
				}
				for (const team of this.humans) {
					const s = this.sides[team];
					mix(s.credits);
					mix(s.gas);
					mix(s.crystals);
					mix(s.queue.length);
					mix(s.research ? s.research.left : -1);
				}
				for (const n of this.nodes) {
					mix(n.owner);
					mix(n.progress);
				}
				const pause = this.netPause;
				mix(pause ? pause.left : -1);
				mix(pause?.resumeIn ?? -1);
				for (const team of this.humans) mix(this.pausesLeft?.[team] ?? -1);
				// Computer commanders of a lobby battle (their own treasury).
				for (const T of Object.values(this.enemyAi?.teams || {})) {
					mix(T.team);
					mix(T.metal);
					mix(T.attackNo);
				}
				return h.toString(16);
			},
		});

		// While the battle is paused nothing in the simulation moves; only the pause's own clocks run.
		const baseTick = Game.prototype.tick;
		Game.prototype.tick = function (dt) {
			const pause = this.netPause;
			if (!pause) return baseTick.call(this, dt);
			if (pause.resumeIn !== null) {
				pause.resumeIn -= dt;
				if (pause.resumeIn <= 1e-6) this.netPause = null;
			} else {
				pause.left -= dt;
				// The longest pause is over: the countdown starts by itself.
				if (pause.left <= 1e-6) {
					pause.left = 0;
					pause.resumeIn = PAUSE.resume;
					pause.resumedBy = null;
				}
			}
		};

		// The guest starts like the host: the host's starting units and buildings copied to the guest's corner
		// (offsets mirrored towards the map centre), placed on free ground.
		function mirrorStart(g, team = 1) {
			const hq0 = g.hq(0),
				hq1 = g.hq(team);
			if (!hq0 || !hq1) return;
			for (const e of g.entities.filter((e) => e.team === team && e.type !== "hq")) e.hp = 0;
			g.entities = g.entities.filter((e) => e.hp > 0);
			const sx = Math.sign(g.W / 2 - hq1.x) * Math.sign(g.W / 2 - hq0.x) || -1,
				sy = Math.sign(g.H / 2 - hq1.y) * Math.sign(g.H / 2 - hq0.y) || -1;
			for (const e of g.entities.filter((e) => e.team === 0 && e.type !== "hq")) {
				const r = TYPES[e.type].radius,
					want = { x: hq1.x + (e.x - hq0.x) * sx, y: hq1.y + (e.y - hq0.y) * sy };
				let spot = null;
				for (let d = 0; d < 400 && !spot; d += 20)
					for (let k = 0; k < 12 && !spot; k++) {
						const p = { x: want.x + Math.cos((k * Math.PI) / 6) * d, y: want.y + Math.sin((k * Math.PI) / 6) * d };
						if (p.x > 40 && p.y > 40 && p.x < g.W - 40 && p.y < g.H - 40 && !g.blocked(p.x, p.y, r + 6) && !g.entities.some((o) => o.hp > 0 && dist(o, p) < TYPES[o.type].radius + r + 8)) spot = p;
					}
				if (!spot) continue;
				const copy = g.spawn(e.type, team, spot.x, spot.y);
				copy.constructionLeft = e.constructionLeft;
				copy.angle = e.angle + Math.PI;
			}
			for (const w of g.units(team).filter((e) => e.type === "worker")) {
				const ore = [...g.ores].sort((a, b) => dist(w, a) - dist(w, b))[0];
				if (ore) g.as(team, () => g.gather([w.id], ore.id));
			}
		}

		// settings: { map, seed, size, resources, weather, fauna, dayLength, startLevel, players: [host, guest] },
		// each player { name, color, faction }.
		RTS.createNetworkGame = function (settings) {
			if ((settings.players || []).some((p) => Number.isInteger(p?.team))) return createLobbyGame(settings);
			const map = RTS.MISSIONS[settings.map] && !RTS.MISSIONS[settings.map].campaign ? settings.map : "horizon",
				[host, guest] = settings.players,
				seed = Number.isInteger(settings.seed) && settings.seed > 0 ? settings.seed : 42;
			const g = new Game(seed, map);
			const player = (p, fallback) => ({
				name: String(p?.name || fallback).replace(/[<>]/g, "").slice(0, 24),
				color: RTS.PLAYER_COLORS.includes(p?.color) ? p.color : RTS.PLAYER_COLORS[0],
				faction: RTS.FACTIONS[p?.faction] ? p.faction : "colonies",
			});
			g.players = { 0: player(host, "Gospodarz"), 1: player(guest, "Gość") };
			if (g.players[1].color === g.players[0].color) g.players[1].color = RTS.PLAYER_COLORS.find((c) => c !== g.players[0].color);
			g.configureSkirmish({
				name: g.players[0].name,
				color: g.players[0].color,
				faction: g.players[0].faction,
				enemyFaction: g.players[1].faction,
				players: 2,
				difficulty: "normal",
				enemy: "waves",
				// The scenario mode (network-modes.js checks which ones the battle allows) and its settings.
				mode: settings.mode || "conquest",
				invasion: settings.invasion,
				pointsPerRelay: settings.pointsPerRelay,
				hillTime: settings.hillTime,
				defenseTime: settings.defenseTime,
				coop: settings.coop,
				size: settings.size,
				resources: settings.resources,
				weather: settings.weather,
				fauna: settings.fauna,
				dayLength: settings.dayLength,
				startLevel: settings.startLevel,
				seed,
			});
			mirrorStart(g);
			g.setHumans([0, 1]);
			// No waves and no computer commander: the battle is between the two players.
			g.nextWave = Infinity;
			g.enemyAi = null;
			g.network = true;
			g.netSettings = settings;
			g.netPause = null;
			g.pausesLeft = { 0: PAUSE.count, 1: PAUSE.count };
			for (const e of g.entities) {
				const f = g.factionFor(e.team);
				if (f && e.team !== 2) {
					e.faction = f.key;
					e.tint = g.colorFor(e.team);
				}
			}
			g.updateVision();
			return g;
		};

		// A lobby battle: settings.players = [{ team, ai, name, color, faction }] for teams 0, 1 (1 vs 1) or 0, 3, 1, 4
		// (2 vs 2, settings.teams "duo"); the host is team 0 and a human.
		const LOBBY_TEAMS = { 2: [0, 1], 4: [0, 3, 1, 4] };
		function createLobbyGame(settings) {
			const map = RTS.MISSIONS[settings.map] && !RTS.MISSIONS[settings.map].campaign ? settings.map : "horizon",
				seed = Number.isInteger(settings.seed) && settings.seed > 0 ? settings.seed : 42,
				four = (settings.players || []).length >= 4,
				teams = LOBBY_TEAMS[four ? 4 : 2];
			const g = new Game(seed, map),
				seats = teams.map((team) => settings.players.find((p) => p?.team === team) || { team, ai: true });
			seats[0].ai = false;
			g.players = {};
			for (const p of seats)
				g.players[p.team] = {
					name: String(p.name || (p.ai ? "Komputer" : "Gracz")).replace(/[<>]/g, "").slice(0, 24),
					color: RTS.PLAYER_COLORS.includes(p.color) ? p.color : RTS.PLAYER_COLORS[teams.indexOf(p.team) % RTS.PLAYER_COLORS.length],
					faction: RTS.FACTIONS[p.faction] ? p.faction : "colonies",
					ai: !!p.ai,
				};
			g.configureSkirmish({
				name: g.players[0].name,
				color: g.players[0].color,
				faction: g.players[0].faction,
				enemyFaction: g.players[1].faction,
				players: four ? 4 : 2,
				teams: four ? "duo" : "ffa",
				difficulty: ["easy", "normal", "hard"].includes(settings.difficulty) ? settings.difficulty : "normal",
				enemy: "commander",
				// The scenario mode (network-modes.js checks which ones the battle allows) and its settings.
				mode: settings.mode || "conquest",
				invasion: settings.invasion,
				pointsPerRelay: settings.pointsPerRelay,
				hillTime: settings.hillTime,
				defenseTime: settings.defenseTime,
				coop: settings.coop,
				size: settings.size,
				resources: settings.resources,
				weather: settings.weather,
				fauna: settings.fauna,
				dayLength: settings.dayLength,
				startLevel: settings.startLevel,
				seed,
			});
			const humans = seats.filter((p) => !p.ai).map((p) => p.team);
			for (const team of humans) if (team !== 0) mirrorStart(g, team);
			g.setHumans(humans);
			g.humanOrder = [...humans];
			g.perspective = 0;
			for (const team of humans) delete g.enemyAi?.teams?.[team];
			if (g.enemyAi && !Object.keys(g.enemyAi.teams).length) g.enemyAi = null;
			g.nextWave = g.enemyAi ? g.aiNextAttack() : Infinity;
			g.network = true;
			g.netSettings = settings;
			g.teamBattle = true;
			g.netPause = null;
			g.pausesLeft = Object.fromEntries(humans.map((t) => [t, PAUSE.count]));
			for (const e of g.entities) {
				const f = g.factionFor(e.team);
				if (f && e.team !== 2) {
					e.faction = f.key;
					e.tint = g.colorFor(e.team);
				}
			}
			g.updateVision();
			return g;
		}
		RTS.createLobbyGame = createLobbyGame;

		const side = (g, team) => (g.alliances ? g.sideLeader(team) : team);
		const lobbyOld = {};
		for (const k of ["applyDamage", "resultFor", "tick"]) lobbyOld[k] = Game.prototype[k];
		Object.assign(Game.prototype, {
			// A lobby battle ends when one side has no command centre left; the result is kept for the perspective
			// (team 0's side), resultFor turns it for the other side.
			teamResult() {
				const teams = Object.keys(this.players || {}).map(Number),
					alive = new Set(this.entities.filter((e) => e.type === "hq" && e.hp > 0 && teams.includes(e.team)).map((e) => side(this, e.team)));
				if (alive.size > 1) return null;
				return alive.has(side(this, this.perspective ?? 0)) ? "victory" : "defeat";
			},
			applyDamage(a, b, n) {
				lobbyOld.applyDamage.call(this, a, b, n);
				if (this.teamBattle && b?.type === "hq" && b.hp <= 0) this.result = this.teamResult();
			},
			resultFor(team = this.viewer) {
				if (!this.teamBattle || !this.result) return lobbyOld.resultFor.call(this, team);
				if (side(this, team) === side(this, this.perspective ?? 0)) return this.result;
				return this.result === "victory" ? "defeat" : "victory";
			},
			// The computer takes a dropped player's team over (on) or hands it back (off) — the same turn everywhere.
			netTakeover(team, on) {
				if (!this.teamBattle || !this.hq(team)) return false;
				if (on) {
					if (!this.isHuman(team)) return false;
					const hq = this.hq(team),
						d = Math.hypot(this.W / 2 - hq.x, this.H / 2 - hq.y) || 1,
						foes = this.aiFoes ? this.aiFoes(team) : [];
					this.scenario.enemy = "commander";
					this.enemyAi ||= { teams: {} };
					this.enemyAi.teams[team] = {
						team,
						metal: Math.floor(this.sides[team].credits),
						think: 0,
						nextAttack: this.time + 90,
						attackNo: 0,
						attack: null,
						rally: { x: Math.round(hq.x + ((this.W / 2 - hq.x) / d) * 220), y: Math.round(hq.y + ((this.H / 2 - hq.y) / d) * 220) },
						upgrades: {},
						lastThreat: -99,
						raidAt: this.time + 120,
						mined: 0,
						spent: 0,
						intel: { structures: Object.fromEntries(this.entities.filter((e) => e.type === "hq" && e.hp > 0 && foes.includes(e.team)).map((e) => [e.id, { x: Math.round(e.x), y: Math.round(e.y), type: e.type, team: e.team }])), army: {}, workers: [] },
					};
					for (const e of this.entities)
						if (e.team === team && e.hp > 0 && TYPES[e.type].speed) {
							e.modeTagged = true;
							if (e.type !== "worker") e.aiRole = "defend";
						}
					this.humans = this.humans.filter((t) => t !== team);
				} else {
					const T = this.enemyAi?.teams?.[team];
					if (this.isHuman(team) || !T) return false;
					this.sides[team].credits = Math.floor(T.metal);
					delete this.enemyAi.teams[team];
					for (const e of this.entities) if (e.team === team) delete e.aiRole;
					this.humans = (this.humanOrder || [...this.humans, team]).filter((t) => t === team || this.humans.includes(t));
				}
				this.nextWave = this.enemyAi && Object.keys(this.enemyAi.teams).length ? this.aiNextAttack() : Infinity;
				this.updateVision();
				return true;
			},
		});
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
