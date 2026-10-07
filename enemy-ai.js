/* Enemy commander AI for scenarios. Each enemy side runs its own economy (workers mining ore, passive and relay income),
   builds and rebuilds its base, pays for every unit, defends its base and workers, takes relays and plans attacks.
   Three levels (easy, normal, hard) differ in income, reaction time, build order, army composition and tactics.
   Campaign missions keep their scripted waves, except the chapters of campaign-ai.js; a scenario can still choose the classic free waves. All values are tunable below.
   On top of the level, each faction has its own style (AI_STYLES): the Dominium builds towers and attacks rarely but hard,
   the Colonies harass workers and take relays; the Swarm keeps the level's plan. */
(function (root) {
	function install(RTS) {
		if (RTS.enemyAiInstalled) return;
		RTS.enemyAiInstalled = true;
		const { Game, TYPES, MISSIONS, dist } = RTS;

		const LEVELS = (RTS.AI_LEVELS = {
			easy: {
				name: "Łatwy",
				description:
					"Przeciwnik powoli rozbudowuje bazę (4 roboty, jedna wieżyczka, fabryka dopiero po 7 minutach), reaguje z opóźnieniem, atakuje rzadko i zawsze centrum dowodzenia. Nie dobiera jednostek pod Twoją armię.",
				think: 4,
				passive: 2,
				relayIncome: 1,
				army: [4, 1.5, 16],
				attackSize: [4, 2, 10],
				workers: 4,
				buildRate: 0.8,
				prodTime: 1.3,
				firstAttack: 240,
				interval: 150,
				minAttack: 4,
				keepHome: 2,
				relayShare: 0.1,
				counter: 0,
				flee: false,
				retreat: false,
				raids: false,
				defendRadius: 550,
				turrets: [60],
				factoryAt: 420,
				secondBarracksAt: null,
				depotAt: null,
				hangarAt: null,
				uplinkAt: null,
				projects: 1,
				upgrades: [],
				heavyAt: null,
				artilleryAt: null,
			},
			normal: {
				name: "Średni",
				description:
					"Przeciwnik utrzymuje 6 robotów, stawia fabrykę po ok. 3 minutach i drugie koszary, zajmuje pobliskie przekaźniki, broni kopalń, a do ataku wybiera najbliższy Twój budynek. Częściowo dobiera jednostki przeciw Twojej armii; po 9 minutach ulepsza pancerz.",
				think: 2,
				passive: 3,
				relayIncome: 2,
				army: [6, 2.5, 28],
				attackSize: [6, 2, 16],
				workers: 6,
				buildRate: 1,
				prodTime: 1,
				firstAttack: 170,
				interval: 110,
				minAttack: 5,
				keepHome: 3,
				relayShare: 0.2,
				counter: 0.5,
				flee: true,
				retreat: false,
				raids: false,
				defendRadius: 700,
				turrets: [50, 240],
				factoryAt: 180,
				secondBarracksAt: 480,
				depotAt: 200,
				hangarAt: null,
				uplinkAt: 540,
				projects: 1,
				upgrades: [{ kind: "armor", at: 540, cost: 300 }],
				heavyAt: 420,
				artilleryAt: null,
			},
			hard: {
				name: "Trudny",
				description:
					"Przeciwnik szybko rozwija gospodarkę (8 robotów, magazyn przy dalszym złożu), buduje fabrykę po 2 minutach, trzy wieżyczki i hangar, reaguje co sekundę, dobiera jednostki przeciw Twojej armii, atakuje najsłabiej bronione cele, nęka roboty szybkimi oddziałami i wycofuje przegrane ataki. Ulepsza pancerz i broń.",
				think: 1,
				passive: 4.5,
				relayIncome: 3,
				army: [8, 4.5, 45],
				attackSize: [8, 4, 30],
				workers: 8,
				buildRate: 1.2,
				prodTime: 0.85,
				firstAttack: 120,
				interval: 75,
				minAttack: 6,
				keepHome: 4,
				relayShare: 0.25,
				counter: 1,
				flee: true,
				retreat: true,
				raids: true,
				defendRadius: 800,
				turrets: [40, 150, 300],
				factoryAt: 110,
				secondBarracksAt: 300,
				depotAt: 150,
				hangarAt: 420,
				uplinkAt: 360,
				projects: 2,
				upgrades: [
					{ kind: "armor", at: 360, cost: 300 },
					{ kind: "weapons", at: 540, cost: 400 },
				],
				heavyAt: 300,
				artilleryAt: 480,
			},
		});
		// Faction styles, applied to a level (see aiLevel): multipliers (×), additions (+) and unit weight biases.
		const STYLES = (RTS.AI_STYLES = {
			dominion: {
				name: "Twierdza",
				description: "Dominium buduje więcej wieżyczek, rzadko zajmuje przekaźniki, atakuje wolno, ale dużymi grupami ciężkich maszyn i bastionów.",
				extraTurrets: [110, 360],
				interval: 1.4,
				firstAttack: 1.25,
				attackSize: 1.35,
				minAttack: 2,
				relayShare: 0.5,
				heavyEarlier: 90,
				factoryEarlier: 60,
				raids: false,
				units: { sentinel: 1.8, heavy: 1.6, destroyer: 1.3, trooper: 0.5, rocket: 0.8, raider: 0 },
			},
			colonies: {
				name: "Nękanie",
				description: "Kolonie atakują często małymi grupami, szybkimi zwiadowcami nękają Twoje roboty przy złożach i zajmują przekaźniki; przegrany atak wycofują.",
				interval: 0.7,
				firstAttack: 0.8,
				attackSize: 0.75,
				minAttack: -1,
				relayShare: 2,
				relayMin: 0.35,
				raids: true,
				retreat: true,
				raidFrom: 180,
				raidEvery: 55,
				units: { raider: 2.5, grenadier: 1.2, heavy: 0.6 },
			},
			swarm: {
				name: "Fala",
				description: "Rój trzyma się planu poziomu trudności: tanie jednostki, stała presja.",
			},
		});
		const ENEMY = (RTS.ENEMY_MODES = {
			commander: { name: "Dowódca AI", code: "A", description: "Przeciwnik zbiera surowce, buduje i płaci za każdą jednostkę." },
			waves: { name: "Klasyczne desanty", code: "W", description: "Dawny przeciwnik: darmowe desanty co 35–65 s, bez gospodarki." },
		});
		const AI = (RTS.AI = {
			startMetal: 300,
			startWorkers: 2,
			mineRate: 6,
			cargo: 30,
			defenseBonus: 1.25,
			weapons: 1.2,
			armor: 0.8,
			raidEvery: 75,
			raidFrom: 300,
			surplus: 1500,
			surplusTurrets: 2,
		});

		const old = {};
		for (const k of ["configureSkirmish", "tick", "serialize", "damage"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;
		const mobile = (e) => e.hp > 0 && TYPES[e.type].speed > 0;
		const armed = (e) => mobile(e) && TYPES[e.type].damage > 0;
		const value = (e) => ((TYPES[e.type].cost || 60) * e.hp) / Math.max(1, e.maxHp || TYPES[e.type].hp);
		const total = (list) => list.reduce((n, e) => n + value(e), 0);
		const centre = (list) => ({ x: list.reduce((n, e) => n + e.x, 0) / list.length, y: list.reduce((n, e) => n + e.y, 0) / list.length });
		const PRODUCERS = { hq: ["worker"], barracks: ["trooper", "rocket", "raider", "grenadier", "flamer", "crawler", "spitter"], factory: ["tank", "sentinel", "destroyer", "colossus", "heavy", "artillery", "skyguard"], hangar: ["interceptor", "bomber"] };
		const disabled = (g, e) => (e.disabledUntil || 0) > g.time || (e.moduleLeft || 0) > 0;

		Object.assign(Game.prototype, {
			// Whom a commander fights: without alliances only the player is attacked (as before);
			// in 2 vs 2 every team outside its own side.
			aiFoes(team) {
				if (!this.alliances) return [0];
				const teams = new Set(this.entities.filter((e) => e.hp > 0 && e.team !== 2).map((e) => e.team));
				return [...teams].filter((t) => !this.allied(team, t));
			},
			aiFoeHq(team, from) {
				const foes = this.aiFoes(team);
				return this.entities.filter((e) => e.type === "hq" && e.hp > 0 && foes.includes(e.team)).sort((a, b) => dist(a, from) - dist(b, from))[0] || null;
			},
			aiActive() {
				return !!this.enemyAi && !!this.scenario && this.scenario.enemy !== "waves" && (!MISSIONS[this.missionId]?.campaign || MISSIONS[this.missionId].act === 3);
			},
			// The level, shaped by the faction's style when a team is given.
			aiLevel(team = null) {
				const L = LEVELS[this.scenario?.difficulty || this.campaignLevel] || LEVELS.normal,
					S = team == null ? null : STYLES[this.aiStyleKey(team)];
				if (!S || S.interval == null) return L;
				const scale = (n, k) => (n == null ? n : Math.round(n * k));
				return {
					...L,
					style: S,
					turrets: S.extraTurrets ? [...L.turrets, ...S.extraTurrets].sort((a, b) => a - b) : L.turrets,
					interval: L.interval * S.interval,
					firstAttack: L.firstAttack * S.firstAttack,
					attackSize: [Math.max(3, scale(L.attackSize[0], S.attackSize)), L.attackSize[1] * S.attackSize, Math.max(4, scale(L.attackSize[2], S.attackSize))],
					minAttack: Math.max(3, L.minAttack + S.minAttack),
					relayShare: Math.min(0.6, Math.max(S.relayMin || 0, L.relayShare * S.relayShare)),
					heavyAt: L.heavyAt != null && S.heavyEarlier ? Math.max(120, L.heavyAt - S.heavyEarlier) : L.heavyAt,
					factoryAt: L.factoryAt != null && S.factoryEarlier ? Math.max(60, L.factoryAt - S.factoryEarlier) : L.factoryAt,
					// Raids and retreats of a style only from the normal level up (easy keeps its gentle plan).
					raids: S.raids === false ? false : S.raids && L.counter > 0 ? true : L.raids,
					retreat: L.retreat || (!!S.retreat && L.counter > 0),
					raidFrom: S.raidFrom ?? AI.raidFrom,
					raidEvery: S.raidEvery ?? AI.raidEvery,
					units: S.units || null,
				};
			},
			// The faction whose style and units a commander follows (campaign-ai.js: the Dominium of the campaign,
			// which has no scenario faction).
			aiStyleKey(team) {
				return this.factionFor(team)?.key || null;
			},
			aiCost(type, team) {
				return Math.round((TYPES[type].cost || 0) * (this.factionFor(team)?.cost || 1));
			},
			configureSkirmish(input = {}) {
				const result = old.configureSkirmish.call(this, input);
				// Survival has no enemy base: its waves are the whole opponent.
				this.scenario.enemy = this.modeState?.mode === "survival" ? "waves" : ENEMY[input.enemy] ? input.enemy : "commander";
				this.enemyAi = null;
				if (this.scenario.enemy === "commander" && (!MISSIONS[this.missionId]?.campaign || MISSIONS[this.missionId].act === 3)) this.setupEnemyAi();
				return result;
			},
			setupEnemyAi() {
				const pace = this.modeState?.mode === "defense" ? 0.85 : 1;
				this.enemyAi = { teams: {} };
				// Every computer side, including a player's ally in 2 vs 2.
				for (const hq of this.entities.filter((e) => e.type === "hq" && e.hp > 0 && !this.isHuman(e.team) && e.team !== 2)) {
					const team = hq.team,
						toward = { x: this.W / 2 - hq.x, y: this.H / 2 - hq.y },
						len = Math.hypot(toward.x, toward.y) || 1;
					// Rally point in front of the base, clear of deposits (workers) and relays.
					const facing = Math.atan2(toward.y, toward.x);
					let rally = null;
					for (const d of [220, 280, 180, 340])
						for (let k = 0; k < 12 && !rally; k++) {
							const a = facing + Math.ceil(k / 2) * (Math.PI / 10) * (k % 2 ? 1 : -1),
								p = { x: hq.x + Math.cos(a) * d, y: hq.y + Math.sin(a) * d };
							if (
								!this.blocked(p.x, p.y, 45) &&
								[...this.ores, ...this.gasFields, ...this.crystalFields].every((o) => dist(o, p) > 190) &&
								this.nodes.every((n) => dist(n, p) > 150) &&
								this.entities.every((e) => TYPES[e.type].speed || dist(e, p) > TYPES[e.type].radius + 60)
							)
								rally = p;
						}
					rally ||= this.pathTo(hq, { x: hq.x + (toward.x / len) * 210, y: hq.y + (toward.y / len) * 210 }).at(-1) || { x: hq.x, y: hq.y + 120 };
					const L = this.aiLevel(team);
					this.enemyAi.teams[team] = {
						team,
						metal: AI.startMetal,
						think: 0,
						nextAttack: this.time + L.firstAttack * pace,
						attackNo: 0,
						attack: null,
						rally: { x: Math.round(rally.x), y: Math.round(rally.y) },
						upgrades: {},
						lastThreat: -99,
						raidAt: L.raidFrom ?? AI.raidFrom,
						mined: 0,
						spent: 0,
					};
					for (const e of this.entities)
						if (e.team === team && mobile(e)) {
							e.modeTagged = true;
							e.aiRole = "defend";
							e.order = null;
							e.path = [];
						}
					for (let i = 0; i < AI.startWorkers; i++) {
						const p = this.pathTo(hq, { x: hq.x + (toward.x / len) * 110 + (i - 0.5) * 40, y: hq.y + (toward.y / len) * 110 }).at(-1) || { x: hq.x + 100, y: hq.y };
						const w = this.spawn("worker", team, p.x, p.y);
						w.modeTagged = true;
					}
				}
				this.nextWave = this.aiNextAttack();
			},
			aiNextAttack() {
				const times = Object.values(this.enemyAi?.teams || {})
					.filter((T) => this.hq(T.team) && !this.allied(this.humans[0], T.team))
					.map((T) => T.nextAttack);
				return times.length ? Math.min(...times) : this.time + 1e6;
			},
			// Sabotage of an enemy command centre postpones that side's next attack.
			delayAttack(team, seconds) {
				const T = this.aiActive() && this.enemyAi.teams[team];
				if (T) {
					T.nextAttack += seconds;
					this.nextWave = this.aiNextAttack();
				} else this.nextWave += seconds;
			},
			tick(dt) {
				if (!this.aiActive()) return old.tick.call(this, dt);
				// The engine's free waves are switched off; the commanders decide when to attack.
				this.nextWave = Infinity;
				try {
					old.tick.call(this, dt);
				} finally {
					this.nextWave = this.aiNextAttack();
				}
				if (!this.result) this.enemyAiTick(dt);
			},
			damage(attacker, target) {
				let n = old.damage.call(this, attacker, target);
				const teams = this.enemyAi?.teams;
				if (teams && this.aiActive()) {
					if (teams[attacker.team]?.upgrades.weapons) n *= AI.weapons;
					if (teams[target.team]?.upgrades.armor) n *= AI.armor;
				}
				return n;
			},
			enemyAiTick(dt) {
				const bonus = this.modeState?.mode === "defense" ? AI.defenseBonus : 1;
				for (const T of Object.values(this.enemyAi.teams)) {
					const hq = this.hq(T.team);
					if (!hq) continue;
					const L = this.aiLevel(T.team);
					const relays = this.nodes.filter((n) => n.owner === this.sideLeader(T.team)).length;
					T.metal += dt * (L.passive + relays * L.relayIncome) * bonus;
					this.aiWorkers(T, dt, L);
					this.aiProduce(T, dt, L);
					if ((T.think -= dt) <= 0) {
						T.think = L.think;
						this.aiThink(T, L, hq);
					}
				}
			},
			aiGoTo(e, p, kind = "move") {
				if (e.order?.kind === kind && Math.abs(e.order.x - p.x) < 20 && Math.abs(e.order.y - p.y) < 20 && (e.path.length || e.target)) return;
				if ((e.aiRepathAt || 0) > this.time && e.order?.kind === kind && Math.abs(e.order.x - p.x) < 20 && Math.abs(e.order.y - p.y) < 20) return;
				e.order = { kind, x: p.x, y: p.y };
				e.path = this.pathTo(e, p);
				e.aiRepathAt = this.time + 1;
			},
			aiDropoffs(team) {
				return this.entities.filter((b) => b.team === team && b.hp > 0 && !b.constructionLeft && ["hq", "depot", "outpost"].includes(b.type));
			},
			// Ore on this side of the map: nearer to the own centre than to the player's, not beside another base.
			aiPickOre(T, e) {
				const hq = this.hq(T.team),
					rival = this.aiFoeHq(T.team, hq),
					load = new Map();
				for (const w of this.entities) if (w.team === T.team && w.type === "worker" && w.hp > 0 && w !== e && w.aiTask?.oreId) load.set(w.aiTask.oreId, (load.get(w.aiTask.oreId) || 0) + 1);
				const drops = this.aiDropoffs(T.team);
				return this.ores
					.filter(
						(o) =>
							o.amount > 0 &&
							(!rival || dist(o, hq) < dist(o, rival) * 0.95) &&
							this.entities.every((b) => b.type !== "hq" || b.team === T.team || b.hp <= 0 || dist(b, o) > 500) &&
							dist(o, hq) < 1100,
					)
					.map((o) => ({ o, cost: Math.min(...drops.map((d) => dist(d, o))) + (load.get(o.id) || 0) * 140 }))
					.sort((a, b) => a.cost - b.cost)[0]?.o;
			},
			aiWorkers(T, dt, L) {
				for (const e of this.entities) {
					if (e.team !== T.team || e.type !== "worker" || e.hp <= 0) continue;
					if ((e.aiFleeUntil || 0) > this.time) continue;
					const task = (e.aiTask ||= { kind: "mine" });
					if (task.kind === "build") {
						const site = this.get(task.siteId);
						if (!site || !site.constructionLeft) {
							e.aiTask = { kind: "mine" };
							continue;
						}
						if (dist(e, site) < TYPES[site.type].radius + 34) {
							e.order = { kind: "hold" };
							e.path = [];
							site.constructionLeft = Math.max(0, site.constructionLeft - dt * 1.25 * L.buildRate * (this.buildingFactor ? this.buildingFactor(T.team) : 1));
						} else this.aiGoTo(e, site);
						continue;
					}
					let ore = this.ores.find((o) => o.id === task.oreId && o.amount > 0);
					if (!ore && !(e.cargo > 0)) {
						ore = this.aiPickOre(T, e);
						task.oreId = ore?.id ?? null;
					}
					if (e.cargo >= AI.cargo || (!ore && e.cargo > 0)) {
						const drop = this.aiDropoffs(T.team).sort((a, b) => dist(a, e) - dist(b, e))[0];
						if (!drop) continue;
						if (dist(e, drop) < TYPES[drop.type].radius + 32) {
							T.metal += e.cargo;
							T.mined += e.cargo;
							e.cargo = 0;
						} else this.aiGoTo(e, drop);
					} else if (ore) {
						if (dist(e, ore) < 46) {
							e.order = { kind: "hold" };
							e.path = [];
							// Mined in portions every half second, like the player's workers.
							e.work = (e.work || 0) + dt;
							if (e.work >= 0.5) {
								e.work = 0;
								const amount = Math.min(AI.mineRate * 0.5, ore.amount, AI.cargo - (e.cargo || 0));
								ore.amount -= amount;
								e.cargo = (e.cargo || 0) + amount;
								e.cargoKind = "ore";
								this.fx("dust", e.x + (ore.x - e.x) * 0.5, e.y + (ore.y - e.y) * 0.5, { color: "#a9b6b4", dx: (e.x - ore.x) * 0.2 });
							}
						} else this.aiGoTo(e, ore);
					} else {
						const hq = this.hq(T.team);
						if (hq && dist(e, hq) > 160) this.aiGoTo(e, hq);
					}
				}
			},
			aiProduce(T, dt, L) {
				for (const b of this.entities) {
					if (b.team !== T.team || !b.aiQueue || b.hp <= 0 || b.constructionLeft || disabled(this, b)) continue;
					b.aiQueue.left -= dt;
					if (b.aiQueue.left > 0) continue;
					const type = b.aiQueue.type;
					delete b.aiQueue;
					const toward = T.rally,
						d = dist(b, toward) || 1,
						r = TYPES[b.type].radius + 30,
						p = this.pathTo(b, { x: b.x + ((toward.x - b.x) / d) * r, y: b.y + ((toward.y - b.y) / d) * r }).at(-1) || { x: b.x, y: b.y + r };
					const e = this.spawn(type, T.team, p.x, p.y);
					e.modeTagged = true;
					if (type !== "worker") {
						e.aiRole = "defend";
						this.aiGoTo(e, this.aiRallySpot(T, e), "attackMove");
					}
				}
			},
			aiRallySpot(T, e) {
				const a = (e.id * 2.39996) % (Math.PI * 2),
					r = 30 + (e.id % 4) * 22;
				return { x: T.rally.x + Math.cos(a) * r, y: T.rally.y + Math.sin(a) * r };
			},
			// Free ground near the base: turrets in front (towards the map centre), other buildings around.
			aiSite(T, type) {
				const hq = this.hq(T.team),
					r = TYPES[type].radius,
					facing = Math.atan2(this.H / 2 - hq.y, this.W / 2 - hq.x),
					free = (p) =>
						p.x > 90 &&
						p.y > 90 &&
						p.x < this.W - 90 &&
						p.y < this.H - 90 &&
						!this.blocked(p.x, p.y, r + 10) &&
						this.entities.every((o) => o.hp <= 0 || dist(o, p) > TYPES[o.type].radius + r + 18) &&
						this.nodes.every((n) => dist(n, p) > r + 60) &&
						[...this.ores, ...this.crystalFields, ...this.gasFields].every((o) => dist(o, p) > r + 55);
				if (type === "depot" || type === "outpost") {
					const ore = this.ores
						.filter((o) => {
							const rival = this.aiFoeHq(T.team, hq);
							return o.amount > 1000 && dist(o, hq) > 380 && dist(o, hq) < 950 && (!rival || dist(o, hq) < dist(o, rival) * 0.8) && this.aiDropoffs(T.team).every((d) => dist(d, o) > 300);
						})
						.sort((a, b) => dist(a, hq) - dist(b, hq))[0];
					if (!ore) return null;
					for (let k = 0; k < 16; k++) {
						const a = Math.atan2(hq.y - ore.y, hq.x - ore.x) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8),
							p = { x: ore.x + Math.cos(a) * 120, y: ore.y + Math.sin(a) * 120 };
						if (free(p)) return p;
					}
					return null;
				}
				const rings = type === "turret" || type === "monolith" ? [240, 300, 190, 360] : [200, 280, 350, 420];
				for (const d of rings)
					for (let k = 0; k < 18; k++) {
						const step = Math.ceil(k / 2) * (Math.PI / 9) * (k % 2 ? 1 : -1);
						if (type !== "turret" && type !== "monolith" && Math.abs(step) < Math.PI / 5) continue;
						const p = { x: hq.x + Math.cos(facing + step) * d, y: hq.y + Math.sin(facing + step) * d };
						if (free(p)) return p;
					}
				return null;
			},
			// Build order: what the side still misses at this moment (destroyed buildings are wanted again).
			aiWants(T, L) {
				const t = this.time,
					have = (type) => this.entities.filter((e) => e.team === T.team && e.type === type && e.hp > 0).length,
					wants = [];
				if (have("barracks") < 1) wants.push("barracks");
				// Extra towers: hard after a recent threat; normal and hard also with a large metal surplus.
				const turrets = L.turrets.filter((at) => t >= at).length + (L.retreat && t - T.lastThreat < 30 ? 1 : 0) + (L.counter > 0 && T.metal > AI.surplus ? AI.surplusTurrets : 0);
				if (have("turret") < turrets) wants.push("turret");
				// Starting as a colony moves the factory earlier (the player can build one at once).
				const early = this.scenario?.startLevel === "colony" ? 90 : 0;
				if (L.factoryAt != null && t >= Math.max(30, L.factoryAt - early) && have("factory") < 1) wants.push("factory");
				// A drop-off at a further deposit: the Colonies' field outpost, otherwise a depot.
				const faction = this.aiStyleKey(T.team),
					dropoff = faction === "colonies" && TYPES.outpost ? "outpost" : "depot";
				if (L.depotAt != null && t >= L.depotAt && have(dropoff) < 1) wants.push(dropoff);
				if (faction === "dominion" && TYPES.uplink && L.uplinkAt != null && t >= L.uplinkAt && have("uplink") < 1) wants.push("uplink");
				// The Swarm raises a resonance monolith in front of its base.
				if (faction === "swarm" && TYPES.monolith && L.uplinkAt != null && t >= L.uplinkAt - 120 && have("monolith") < 1) wants.push("monolith");
				if (L.secondBarracksAt != null && t >= L.secondBarracksAt && have("barracks") < 2) wants.push("barracks");
				if (L.hangarAt != null && t >= L.hangarAt && have("hangar") < 1) wants.push("hangar");
				return wants;
			},
			aiThink(T, L, hq) {
				const own = this.entities.filter((e) => e.team === T.team && e.hp > 0),
					workers = own.filter((e) => e.type === "worker"),
					army = own.filter((e) => armed(e) && e.type !== "worker" && !e.expedition),
					projects = own.filter((e) => e.constructionLeft > 0),
					pay = (cost) => {
						T.metal -= cost;
						T.spent += cost;
					};
				// Construction: one project at a time (two on hard), each with a builder.
				const wants = this.aiWants(T, L);
				let reserve = 0;
				if (projects.length < L.projects && wants.length) {
					const type = wants.find((w) => !projects.some((p) => p.type === w)) || null,
						cost = type && this.aiCost(type, T.team);
					if (type && T.metal >= cost) {
						const p = this.aiSite(T, type);
						if (p) {
							const b = this.spawn(type, T.team, p.x, p.y);
							b.constructionLeft = TYPES[type].construction;
							pay(cost);
							projects.push(b);
						}
					} else if (type) reserve = cost;
				}
				for (const site of projects)
					if (!workers.some((w) => w.aiTask?.kind === "build" && w.aiTask.siteId === site.id)) {
						const builder = workers.filter((w) => w.aiTask?.kind !== "build").sort((a, b) => dist(a, site) - dist(b, site))[0];
						if (builder) builder.aiTask = { kind: "build", siteId: site.id };
					}
				// Workers: replace losses up to the level's count.
				if (!hq.aiQueue && !disabled(this, hq) && workers.length < L.workers && T.metal >= this.aiCost("worker", T.team) + reserve) {
					pay(this.aiCost("worker", T.team));
					hq.aiQueue = { type: "worker", left: TYPES.worker.build * L.prodTime };
				}
				// Upgrades.
				for (const u of L.upgrades)
					if (!T.upgrades[u.kind] && this.time >= u.at && T.metal >= u.cost + reserve) {
						pay(u.cost);
						T.upgrades[u.kind] = true;
					}
				// Army production in every free producer, up to the size allowed at this moment of the battle.
				const [base, perMinute, cap] = L.army;
				let armySize = army.length + own.filter((b) => b.aiQueue && b.aiQueue.type !== "worker").length;
				for (const b of own) {
					if (armySize >= Math.min(cap, base + (perMinute * this.time) / 60)) break;
					if (!PRODUCERS[b.type] || b.type === "hq" || b.aiQueue || b.constructionLeft || disabled(this, b)) continue;
					const type = this.aiPickUnit(T, L, b);
					if (!type) continue;
					const cost = this.aiCost(type, T.team);
					if (T.metal < cost + reserve) continue;
					pay(cost);
					b.aiQueue = { type, left: TYPES[type].build * L.prodTime * (RTS.FACTION_KIT?.[this.factionFor(T.team)?.key]?.production || 1) };
					armySize++;
				}
				this.aiMilitary(T, L, hq, army, workers);
				this.aiOrbital(T, L);
			},
			// Orbital strike: at the densest group of enemy units (at least four) or, failing that, an enemy building.
			aiOrbital(T, L) {
				if (!this.orbitalStrike) return;
				const uplink = this.entities.find((e) => e.team === T.team && e.type === "uplink" && e.hp > 0);
				if (!uplink || this.strikeRequirement(uplink.id)) return;
				const foes = this.aiFoes(T.team),
					R = RTS.FACTION_FX.strike.radius * 0.8,
					units = this.entities.filter((e) => foes.includes(e.team) && armed(e));
				let best = null;
				for (const u of units) {
					const group = units.filter((o) => dist(o, u) < R);
					if (group.length >= 4 && (!best || group.length > best.n)) best = { ...centre(group), n: group.length };
				}
				if (!best && L.counter >= 1) {
					const b = this.entities.filter((e) => foes.includes(e.team) && e.hp > 0 && !TYPES[e.type].speed && e.type !== "wall").sort((a, b) => (b.type === "turret") - (a.type === "turret") || b.hp - a.hp)[0];
					if (b) best = { x: b.x, y: b.y };
				}
				if (best) this.orbitalStrike(uplink.id, best.x, best.y);
			},
			aiPlayerArmy(team = 1) {
				const foes = this.aiFoes(team);
				return this.entities.filter((e) => foes.includes(e.team) && armed(e) && e.type !== "worker");
			},
			// Weighted choice; normal and hard shift the mix against the player's army.
			aiPickUnit(T, L, producer) {
				const t = this.time,
					faction = this.aiStyleKey(T.team),
					player = this.aiPlayerArmy(T.team),
					share = (test) => (player.length ? player.filter(test).length / player.length : 0),
					air = share((e) => TYPES[e.type].flying),
					vehicles = share((e) => !TYPES[e.type].flying && TYPES[e.type].hp >= 300),
					infantry = share((e) => !TYPES[e.type].flying && TYPES[e.type].hp < 300),
					c = L.counter,
					weights = {
						trooper: 3 + 2 * c * infantry,
						rocket: 2 + 6 * c * vehicles,
						raider: faction === "colonies" ? 1.5 : 0,
						grenadier: faction === "colonies" ? 1.5 + 3 * c * infantry : 0,
						flamer: faction === "dominion" ? 1.5 + 3 * c * infantry : 0,
						tank: 3 + 4 * c * infantry,
						sentinel: faction === "dominion" ? 2 : 0,
						destroyer: faction === "dominion" ? 1 + 5 * c * vehicles : 0,
						crawler: faction === "swarm" ? 3 + 2 * c * infantry : 0,
						spitter: faction === "swarm" ? 2 + 3 * c * vehicles : 0,
						colossus: faction === "swarm" && L.heavyAt != null && t >= L.heavyAt ? 1.2 : 0,
						heavy: L.heavyAt != null && t >= L.heavyAt ? 1.2 + 2 * c * vehicles : 0,
						artillery: L.artilleryAt != null && t >= L.artilleryAt ? 0.8 : 0,
						skyguard: TYPES.skyguard && air > 0 ? 8 * c * air : 0,
						interceptor: 2 + 6 * c * air,
						bomber: 1.5,
					};
				// The faction's style prefers some units.
				if (L.units) for (const [type, k] of Object.entries(L.units)) if (type in weights) weights[type] *= k;
				const options = PRODUCERS[producer.type].filter((type) => TYPES[type] && weights[type] > 0),
					sum = options.reduce((n, type) => n + weights[type], 0);
				let roll = this.rand() * sum;
				for (const type of options) if ((roll -= weights[type]) <= 0) return type;
				return options.at(-1) || null;
			},
			aiMilitary(T, L, hq, army, workers) {
				const own = this.entities.filter((e) => e.team === T.team && e.hp > 0 && !TYPES[e.type].speed),
					hostile = this.entities.filter((e) => armed(e) && !this.allied(T.team, e.team) && e.team !== 2);
				// Threats to the base and its buildings.
				const threats = hostile.filter((e) => dist(e, hq) < L.defendRadius || own.some((b) => dist(b, e) < TYPES[b.type].radius + 280));
				const threat = total(threats);
				// Workers run home from nearby enemies (normal, hard).
				if (L.flee)
					for (const w of workers)
						if (hostile.some((e) => dist(e, w) < 240) && dist(w, hq) > 200) {
							w.aiFleeUntil = this.time + 6;
							w.order = { kind: "move", x: hq.x, y: hq.y };
							w.path = this.pathTo(w, hq);
						}
				let attack = T.attack ? T.attack.ids.map((id) => this.get(id)).filter(Boolean) : [];
				if (T.attack && !attack.length) T.attack = null;
				const defenders = army.filter((e) => e.aiRole === "defend" || !e.aiRole);
				if (threats.length) {
					T.lastThreat = this.time;
					let responders = defenders;
					const nearHome = attack.filter((e) => dist(e, hq) < 1000);
					if (threat > total(responders) * 0.8) responders = responders.concat(nearHome);
					// Hard: an attack far away comes back when the base is outmatched.
					if (L.retreat && T.attack && threat > total(responders) * 1.2) {
						for (const e of attack) e.aiRole = "defend";
						responders = responders.concat(attack.filter((e) => !nearHome.includes(e)));
						T.attack = null;
						attack = [];
					}
					const c = centre(threats);
					for (const e of responders) this.aiGoTo(e, c, "attackMove");
				} else
					for (const e of defenders) {
						const spot = this.aiRallySpot(T, e);
						if (!e.target && dist(e, spot) > 120) this.aiGoTo(e, spot, "attackMove");
					}
				this.aiRelays(T, L, army);
				this.aiAttack(T, L, hq, army, attack);
			},
			// Relay squads: a share of the army takes and holds the nearest relays not owned by the side.
			aiRelays(T, L, army) {
				const mode = this.modeState?.mode,
					hill = mode === "hill" ? this.hillNode?.() : null,
					share = mode === "relays" ? Math.max(0.5, L.relayShare) : hill ? Math.max(RTS.HILL?.aiShare ?? 0.5, L.relayShare) : L.relayShare,
					hq = this.hq(T.team),
					rival = this.aiFoeHq(T.team, hq),
					side = this.sideLeader(T.team),
					squad = army.filter((e) => e.aiRole === "relay"),
					wanted = Math.floor(army.length * share);
				// King of the hill: the squad takes the hill and stays on it.
				const targets = hill
					? [hill]
					: this.nodes.filter((n) => n.owner !== side && (L.counter > 0 || mode === "relays" || !rival || dist(n, hq) < dist(n, rival))).sort((a, b) => dist(a, hq) - dist(b, hq));
				if (!targets.length) {
					for (const e of squad) e.aiRole = "defend";
					return;
				}
				for (const e of army.filter((e) => e.aiRole === "defend").sort((a, b) => TYPES[b.type].speed - TYPES[a.type].speed))
					if (squad.length < wanted && !T.attack?.ids.includes(e.id)) {
						e.aiRole = "relay";
						squad.push(e);
					}
				squad.forEach((e, i) => {
					const n = targets[Math.floor(i / 3) % targets.length];
					if (!e.target) this.aiGoTo(e, { x: n.x + ((i % 3) - 1) * 30, y: n.y + 20 }, "attackMove");
				});
			},
			// Targets: easy — the command centre; normal — the nearest player building; hard — the weakest defended one.
			// In the relay mode attacks go for relays held by others.
			aiTarget(T, L, from) {
				const hq = this.hq(T.team),
					hill = this.modeState?.mode === "hill" ? this.hillNode?.() : null;
				const side = this.sideLeader(T.team),
					foes = this.aiFoes(T.team);
				if (hill && hill.owner !== side) return { x: hill.x, y: hill.y, name: "Szczyt" };
				if (this.modeState?.mode === "relays") {
					const held = (n) => foes.includes(n.owner);
					const n = this.nodes.filter((n) => n.owner !== side).sort((a, b) => (held(a) ? 0 : 1) - (held(b) ? 0 : 1) || dist(a, from) - dist(b, from))[0];
					if (n) return { x: n.x, y: n.y, name: "przekaźnik " + n.name };
				}
				const structures = this.entities.filter((e) => foes.includes(e.team) && e.hp > 0 && !TYPES[e.type].speed && !["wall", "gate"].includes(e.type));
				if (!structures.length) {
					const u = this.entities.filter((e) => foes.includes(e.team) && mobile(e)).sort((a, b) => dist(a, from) - dist(b, from))[0];
					return u ? { x: u.x, y: u.y, name: "oddziały wroga" } : null;
				}
				let target = this.aiFoeHq(T.team, hq || from) || structures[0];
				if (L.counter >= 1) {
					const defence = (b) => total(this.entities.filter((e) => e.team === b.team && e.hp > 0 && TYPES[e.type].damage > 0 && e.type !== "worker" && dist(e, b) < 450));
					target = structures.map((b) => ({ b, score: defence(b) / 250 + dist(b, hq) / 900 + (b.type === "hq" ? 0.8 : 0) })).sort((a, b) => a.score - b.score)[0].b;
				} else if (L.counter > 0) target = structures.sort((a, b) => dist(a, hq) - dist(b, hq))[0];
				return { x: target.x, y: target.y, id: target.id, name: TYPES[target.type].name };
			},
			aiAttack(T, L, hq, army, attack) {
				if (this.time >= T.nextAttack) {
					const pool = army
							.filter((e) => e.aiRole === "defend" || !e.aiRole)
							.sort((a, b) => dist(a, hq) - dist(b, hq)),
						keep = Math.min(L.keepHome, Math.floor(pool.length / 3)),
						[size, grow, most] = L.attackSize,
						group = pool.slice(keep).slice(-Math.min(most, size + grow * T.attackNo)),
						needed = Math.min(L.minAttack + T.attackNo, most);
					if (group.length < needed) {
						T.nextAttack = this.time + (L.counter ? 15 : 25);
						this.nextWave = this.aiNextAttack();
						return;
					}
					const target = this.aiTarget(T, L, T.rally);
					if (!target) return;
					T.attackNo++;
					// The HUD's attack counter follows the enemy side only.
					const ally = this.allied(0, T.team);
					if (!ally) this.wave++;
					// Survivors of the previous attack join the new one.
					const remnants = attack.filter((e) => !e.expedition);
					for (const e of remnants) this.aiGoTo(e, target, "attackMove");
					T.attack = { ids: remnants.concat(group).map((e) => e.id), target, startValue: total(remnants) + total(group), since: this.time };
					for (const e of group) {
						e.aiRole = "attack";
						this.aiGoTo(e, target, "attackMove");
					}
					// Expedition: two thirds of an attack go for the artifact once the hunt is open.
					if (this.modeState?.mode === "expedition" && this.time >= (RTS.EXPEDITION?.aiStart ?? 0))
						group.forEach((e, i) => {
							if (i % 3 !== 2) {
								e.expedition = true;
								e.aiRole = "expedition";
							}
						});
					T.nextAttack = this.time + L.interval * (this.modeState?.mode === "defense" ? 0.85 : 1) * (0.9 + this.rand() * 0.2);
					this.nextWave = this.aiNextAttack();
					if (ally) this.notify(`Sojusznik atakuje: ${group.length} jednostek rusza na cel (${target.name}).`);
					else this.notify(`${this.sideName(T.team)}: atak ${T.attackNo} — ${group.length} jednostek zmierza w stronę celu (${target.name}).`, "alarm");
					return;
				}
				if (T.attack) {
					const A = T.attack;
					attack = attack.filter((e) => !e.expedition);
					if (!attack.length) {
						T.attack = null;
						return;
					}
					// Hard: a beaten attack pulls back to regroup.
					if (L.retreat) {
						const c = centre(attack),
							enemies = this.entities.filter((e) => armed(e) && !this.allied(T.team, e.team) && e.team !== 2 && dist(e, c) < 450);
						if (total(attack) < A.startValue * 0.35 && total(enemies) > total(attack)) {
							for (const e of attack) {
								e.aiRole = "defend";
								this.aiGoTo(e, this.aiRallySpot(T, e), "move");
							}
							T.attack = null;
							return;
						}
					}
					const gone = A.target.id != null ? !this.get(A.target.id) : attack.every((e) => dist(e, A.target) < 160 && !e.target);
					if (gone) A.target = this.aiTarget(T, L, centre(attack)) || A.target;
					for (const e of attack) if (!e.target) this.aiGoTo(e, A.target, "attackMove");
				}
				// Hard: fast raiders harass workers at the player's outer deposits.
				if (L.raids && this.time >= T.raidAt) {
					T.raidAt = this.time + (L.raidEvery ?? AI.raidEvery);
					const foes = this.aiFoes(T.team),
						miners = this.entities.filter((e) => foes.includes(e.team) && e.type === "worker" && e.hp > 0 && (e.order?.kind === "gather" || e.aiTask?.kind === "mine"));
					const home = this.aiFoeHq(T.team, hq);
					const spot = miners.sort((a, b) => (home ? dist(b, home) - dist(a, home) : 0))[0];
					const raiders = army
						.filter((e) => e.aiRole === "defend" && TYPES[e.type].speed >= 100 && !TYPES[e.type].flying)
						.sort((a, b) => TYPES[b.type].speed - TYPES[a.type].speed)
						.slice(0, 3);
					if (spot && raiders.length >= 2)
						for (const e of raiders) {
							e.aiRole = "raid";
							e.raidUntil = this.time + 45;
							this.aiGoTo(e, spot, "attackMove");
						}
				}
				for (const e of army)
					if (e.aiRole === "raid" && this.time > (e.raidUntil || 0)) {
						e.aiRole = "defend";
						this.aiGoTo(e, this.aiRallySpot(T, e), "move");
					}
			},
			// Short report for the objectives panel and tests.
			aiReport() {
				if (!this.aiActive()) return null;
				return Object.values(this.enemyAi.teams).map((T) => {
					const own = this.entities.filter((e) => e.team === T.team && e.hp > 0);
					return {
						team: T.team,
						name: this.sideName(T.team),
						metal: Math.floor(T.metal),
						workers: own.filter((e) => e.type === "worker").length,
						army: own.filter((e) => armed(e) && e.type !== "worker").length,
						buildings: own.filter((e) => !TYPES[e.type].speed).length,
						attacks: T.attackNo,
						upgrades: Object.keys(T.upgrades),
					};
				});
			},
			serialize() {
				return { ...old.serialize.call(this), enemyAi: this.enemyAi || null };
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			if (!g.scenario) return g;
			const s = state.enemyAi;
			if (!s) {
				// Saves from before the commander keep the classic waves.
				g.scenario.enemy = ENEMY[g.scenario.enemy] ? g.scenario.enemy : "waves";
				g.enemyAi = null;
				return g;
			}
			if (
				typeof s !== "object" ||
				!s.teams ||
				Object.values(s.teams).some(
					(T) => ![T.team, T.metal, T.nextAttack, T.attackNo, T.think].every(Number.isFinite) || !T.rally || ![T.rally.x, T.rally.y].every(Number.isFinite) || (T.attack && (!Array.isArray(T.attack.ids) || !T.attack.target)),
				)
			)
				throw Error("Uszkodzony zapis przeciwnika");
			g.enemyAi = JSON.parse(JSON.stringify(s));
			for (const T of Object.values(g.enemyAi.teams)) {
				T.upgrades ||= {};
				T.lastThreat ??= -99;
				T.raidAt ??= AI.raidFrom;
				T.mined ??= 0;
				T.spent ??= 0;
			}
			g.scenario.enemy = ENEMY[g.scenario.enemy] ? g.scenario.enemy : "commander";
			if (g.aiActive()) g.nextWave = g.aiNextAttack();
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
