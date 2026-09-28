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
   The lockstep itself (turns, delays, the WebRTC channel) lives in netplay.js. Loaded after campaign-act3.js. */
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
		function mirrorStart(g) {
			const hq0 = g.hq(0),
				hq1 = g.hq(1);
			if (!hq0 || !hq1) return;
			for (const e of g.entities.filter((e) => e.team === 1 && e.type !== "hq")) e.hp = 0;
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
				const copy = g.spawn(e.type, 1, spot.x, spot.y);
				copy.constructionLeft = e.constructionLeft;
				copy.angle = e.angle + Math.PI;
			}
			for (const w of g.units(1).filter((e) => e.type === "worker")) {
				const ore = [...g.ores].sort((a, b) => dist(w, a) - dist(w, b))[0];
				if (ore) g.as(1, () => g.gather([w.id], ore.id));
			}
		}

		// settings: { map, seed, size, resources, weather, fauna, dayLength, startLevel, players: [host, guest] },
		// each player { name, color, faction }.
		RTS.createNetworkGame = function (settings) {
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
				mode: "conquest",
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
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
