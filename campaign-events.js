/* Campaign events: chapters that answer the player (on top of the scripts and of the commander AI of
   campaign-ai.js). Per chapter (CAMPAIGN_EVENTS):
   - intel: before each planned attack of the commander the Dominium's orders are intercepted (size, time);
   - retake: a relay taken by the player draws a counterattack to win it back;
   - diversion: while the player's army storms the enemy base, a small squad strikes the player's mines;
   - reinforce: once per chapter, after heavy losses or with the command centre in danger, a drop of
     reinforcements lands at the base;
   - saboteurs: the commander trains hidden saboteurs (from the normal level) and sends them at the player's
     reactor, factory or laboratory; the player is warned when a building goes dark.
   The campaign level (campaign-ai.js) sets the delays and the sizes. Started with the level at the start of a
   chapter, kept in the save. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.campaignEventsInstalled) return;
		RTS.campaignEventsInstalled = true;
		const { Game, TYPES, MISSIONS, dist } = RTS;

		// "ai": the commander's own units; "spawn": a scripted squad from the enemy base.
		const PLAN = (RTS.CAMPAIGN_EVENTS = {
			colony1: { retake: "spawn", diversion: "spawn", reinforce: true },
			colony2: { intel: true, retake: "ai", diversion: "ai", reinforce: true, saboteurs: true },
			colony3: { intel: true, retake: "ai", diversion: "ai", reinforce: true, saboteurs: true },
			colony4: { reinforce: true },
			colony5: { reinforce: true, speaker: "vale" },
			colony6: { intel: true, retake: "ai", diversion: "ai", reinforce: true, saboteurs: true },
			colony7: { diversion: "ai", reinforce: true, enemy: "whisper" },
			colony8: { reinforce: true, speaker: "varn", enemy: "whisper" },
			colony9: { diversion: "ai", reinforce: true, enemy: "whisper" },
		});
		// By the campaign level.
		const TUNE = (RTS.CAMPAIGN_EVENT_TUNE = {
			easy: { retakeDelay: 40, retakeSize: 3, diversionSize: 2, diversionEvery: 200, drop: ["trooper", "trooper", "trooper", "rocket", "rocket", "tank"], saboteursAt: null, saboteurEvery: null },
			normal: { retakeDelay: 22, retakeSize: 4, diversionSize: 3, diversionEvery: 150, drop: ["trooper", "trooper", "rocket", "tank"], saboteursAt: 300, saboteurEvery: 170 },
			hard: { retakeDelay: 12, retakeSize: 6, diversionSize: 4, diversionEvery: 110, drop: ["trooper", "trooper", "rocket"], saboteursAt: 210, saboteurEvery: 120 },
		});
		const EV = (RTS.CAMPAIGN_EVENT_RULES = {
			intelAhead: 25,
			retakeCooldown: 90,
			stormRadius: 650,
			stormUnits: 6,
			lossWindow: 60,
			lossCount: 8,
			hqDanger: 0.45,
			saboteurCost: 280,
			saboteurBuild: 16,
			saboteurCharges: 2,
			sabotageWarnEvery: 20,
		});
		// "1 jednostka", "3 jednostki", "5 jednostek".
		const units = (n) => n + " " + (n === 1 ? "jednostka" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "jednostki" : "jednostek");
		const armed = (e) => e.hp > 0 && TYPES[e.type].speed > 0 && TYPES[e.type].damage > 0 && e.type !== "worker";

		const old = {};
		for (const k of ["applyCampaignLevel", "tick", "applyDamage", "serialize"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;

		Object.assign(Game.prototype, {
			applyCampaignLevel(level) {
				const done = old.applyCampaignLevel.call(this, level);
				if (done && PLAN[this.missionId])
					this.campaignEvents = {
						owners: Object.fromEntries(this.nodes.map((n, i) => [i, n.owner])),
						retakes: [],
						retakeAt: {},
						warned: 0,
						diversionAt: 0,
						reinforced: false,
						losses: [],
						saboteursAt: null,
						sabotageQueue: null,
						lastSabotageWarn: -99,
						clock: 0,
					};
				return done;
			},
			// A line on the radio: the act II/III radio log, or a notice in act I.
			campaignSay(who, text, sound = true) {
				if (this.act2 && this.say) return this.say(who, text, sound);
				this.notify((RTS.ACT2_SPEAKERS?.[who]?.name || who) + ": " + text, sound ? "radio" : null);
			},
			applyDamage(a, b, n) {
				const alive = b.hp > 0;
				const r = old.applyDamage.call(this, a, b, n);
				if (this.campaignEvents && alive && b.hp <= 0 && this.isHuman(b.team) && TYPES[b.type].speed && TYPES[b.type].damage > 0 && b.type !== "worker") this.campaignEvents.losses.push(this.time);
				return r;
			},
			tick(dt) {
				old.tick.call(this, dt);
				const S = this.campaignEvents;
				if (!S || this.result) return;
				S.clock -= dt;
				if (S.clock > 0) return;
				S.clock = 0.5;
				this.campaignEventsTick();
			},
			campaignEventsTick() {
				const S = this.campaignEvents,
					P = PLAN[this.missionId],
					K = TUNE[this.campaignLevel] || TUNE.normal,
					me = this.humans[0],
					hq = this.hq(me),
					foeHq = this.hq(1),
					T = this.enemyAi?.teams?.[1],
					enemy = P.enemy || "dominium",
					friend = P.speaker || "lira";
				if (!hq) return;
				// Intercepted orders before the commander's attack.
				if (P.intel && T && this.campaignAi && foeHq) {
					const left = T.nextAttack - this.time,
						no = T.attackNo + 1;
					if (left > 0 && left <= (this.intelAhead || EV.intelAhead) && S.warned < no) {
						S.warned = no;
						const L = this.aiLevel(1),
							size = Math.min(L.attackSize[2], Math.round(L.attackSize[0] + L.attackSize[1] * T.attackNo));
						this.campaignSay(enemy, `…grupa uderzeniowa ${no}, ok. ${units(size)} — wymarsz za ${Math.round(left)} s…`);
						this.campaignSay(friend, "Przechwyciliśmy rozkaz Dominium. Ściągnij obrońców do bazy.", false);
					}
				}
				// Relays taken by the player draw a counterattack.
				this.nodes.forEach((n, i) => {
					const was = S.owners[i];
					S.owners[i] = n.owner;
					if (!P.retake || n.owner !== me || was === me || !foeHq) return;
					if (this.time < (S.retakeAt[i] ?? -1e9) + EV.retakeCooldown) return;
					S.retakeAt[i] = this.time;
					S.retakes.push({ node: i, at: this.time + K.retakeDelay });
				});
				for (const R of S.retakes.filter((R) => this.time >= R.at)) {
					S.retakes.splice(S.retakes.indexOf(R), 1);
					const n = this.nodes[R.node];
					if (!n || n.owner !== me) continue;
					const squad = this.campaignSquad(P.retake, K.retakeSize, n, foeHq);
					if (squad.length) {
						this.campaignSay(enemy, `…odbić przekaźnik ${n.name}! Wszystkie wolne oddziały…`);
						this.campaignSay(friend, `Dominium wysyła ${units(squad.length)} na ${n.name}. Wzmocnij obronę przekaźnika.`, false);
					}
				}
				// The player storms the enemy base: a strike at the player's mines.
				if (P.diversion && foeHq && this.time >= S.diversionAt) {
					const storm = this.units(me).filter((e) => armed(e) && dist(e, foeHq) < EV.stormRadius);
					if (storm.length >= EV.stormUnits) {
						S.diversionAt = this.time + K.diversionEvery;
						const miners = this.units(me).filter((e) => e.type === "worker" && e.hp > 0),
							spot = miners.sort((a, b) => dist(b, foeHq) - dist(a, foeHq))[0] || hq;
						const squad = this.campaignSquad(P.diversion, K.diversionSize, spot, foeHq, true);
						if (squad.length) this.campaignSay(friend, `Gdy nacieramy, oni uderzają na tyły — ${units(squad.length)} ${squad.length === 1 ? "zmierza" : "zmierzają"} do naszych robotów!`);
					}
				}
				// Reinforcements: once, after heavy losses or with the command centre in danger.
				S.losses = S.losses.filter((t) => this.time - t < EV.lossWindow);
				// (Twice after the citadel's prisoners talked, two minutes apart.)
				const dropsLeft = S.reinforceLeft ?? (S.reinforced ? 0 : 1);
				if (P.reinforce && dropsLeft > 0 && this.time > 60 && this.time >= (S.reinforceAt || 0)) {
					const army = this.units(me).filter(armed).length,
						danger = hq.hp < hq.maxHp * EV.hqDanger,
						beaten = S.losses.length >= EV.lossCount && army < 5;
					if (danger || beaten) {
						S.reinforceLeft = dropsLeft - 1;
						S.reinforced = S.reinforceLeft <= 0;
						S.reinforceAt = this.time + 120;
						const toward = Math.atan2(this.H / 2 - hq.y, this.W / 2 - hq.x);
						K.drop.forEach((type, i) => {
							const a = toward + (i - (K.drop.length - 1) / 2) * 0.35,
								p = this.pathTo(hq, { x: hq.x + Math.cos(a) * 140, y: hq.y + Math.sin(a) * 140 }).at(-1) || { x: hq.x + 100, y: hq.y };
							this.spawn(type, me, p.x, p.y);
							this.fx?.("dust", p.x, p.y);
						});
						this.campaignSay(friend, `${danger ? "Centrum dowodzenia w niebezpieczeństwie" : "Ciężkie straty"} — wysyłam posiłki z orbity: ${units(K.drop.length)} przy bazie.`);
					}
				}
				// The commander's saboteurs.
				if (P.saboteurs && T && this.campaignAi && K.saboteursAt != null) this.campaignSaboteurs(S, K, T, friend);
				// A building of the player knocked out by a charge.
				for (const b of this.entities)
					if (b.team === me && b.hp > 0 && !TYPES[b.type].speed && (b.disabledUntil || 0) > this.time && b.sabotagedSeen !== b.disabledUntil) {
						b.sabotagedSeen = b.disabledUntil;
						if (this.time - S.lastSabotageWarn >= EV.sabotageWarnEvery) {
							S.lastSabotageWarn = this.time;
							this.campaignSay(friend, `Sabotaż! Budynek wyłączony na ${Math.round(b.disabledUntil - this.time)} s: ${TYPES[b.type].name}. Ukrytych sabotażystów wykryją tylko nasze jednostki w pobliżu.`);
						}
					}
			},
			// A squad of the enemy sent at a point: the commander's free units (its fastest when raiding) or,
			// in a scripted chapter, a squad from its base.
			campaignSquad(kind, size, to, foeHq, raid = false) {
				let squad = [];
				if (kind === "ai") {
					const T = this.enemyAi?.teams?.[1];
					if (!T) return [];
					const free = this.entities.filter((e) => e.team === 1 && armed(e) && e.type !== "saboteur" && !TYPES[e.type].flying && (e.aiRole === "defend" || e.aiRole === "relay" || !e.aiRole));
					// Always leave a garrison of two.
					squad = free
						.sort((a, b) => (raid ? TYPES[b.type].speed - TYPES[a.type].speed : 0) || dist(a, to) - dist(b, to))
						.slice(0, Math.max(0, Math.min(size, free.length - 2)));
					for (const e of squad) {
						e.aiRole = "raid";
						e.raidUntil = this.time + 70;
						this.aiGoTo(e, to, "attackMove");
					}
				} else {
					const types = ["trooper", "rocket", "trooper", "tank", "trooper", "rocket"].slice(0, size);
					types.forEach((type, i) => {
						const p = this.pathTo(foeHq, { x: foeHq.x + Math.cos(i * 1.3) * 120, y: foeHq.y + Math.sin(i * 1.3) * 120 }).at(-1) || foeHq;
						const e = this.spawn(type, 1, p.x, p.y);
						e.order = { kind: "attackMove", x: to.x, y: to.y };
						e.path = this.pathTo(e, to);
						squad.push(e);
					});
				}
				return squad;
			},
			campaignSaboteurs(S, K, T, friend) {
				S.saboteursAt ??= K.saboteursAt;
				const barracks = this.entities.find((e) => e.team === 1 && e.type === "barracks" && e.hp > 0 && !e.constructionLeft);
				// Training: paid from the commander's treasury, ready after a while at the barracks.
				if (!S.sabotageQueue && barracks && this.time >= S.saboteursAt && T.metal >= EV.saboteurCost) {
					T.metal -= EV.saboteurCost;
					S.sabotageQueue = { at: this.time + EV.saboteurBuild, from: barracks.id };
					S.saboteursAt = this.time + K.saboteurEvery;
				}
				if (S.sabotageQueue && this.time >= S.sabotageQueue.at) {
					const b = this.get(S.sabotageQueue.from) || barracks;
					S.sabotageQueue = null;
					if (b)
						for (let i = 0; i < 2; i++) {
							const e = this.spawn("saboteur", 1, b.x + 40 + i * 20, b.y + 60);
							e.aiRole = "sabotage";
							e.charges = EV.saboteurCharges;
						}
				}
				// Each team goes for the player's reactor, factory or laboratory (else the command centre), and
				// home when its charges are spent.
				const me = this.humans[0],
					rank = { reactor: 0, factory: 1, lab: 2, hangar: 3, barracks: 4, hq: 5 };
				for (const e of this.entities.filter((e) => e.team === 1 && e.type === "saboteur" && e.hp > 0 && e.aiRole === "sabotage")) {
					if (e.sabotageTarget != null || (e.chargeReady || 0) > this.time) continue;
					if (e.charges <= 0) {
						e.aiRole = "defend";
						this.aiGoTo(e, T.rally, "move");
						continue;
					}
					const targets = this.entities.filter((b) => b.team === me && b.hp > 0 && rank[b.type] != null && !b.constructionLeft && (b.disabledUntil || 0) <= this.time).sort((a, b) => rank[a.type] - rank[b.type] || dist(a, e) - dist(b, e));
					const t = targets[0];
					if (!t) continue;
					e.sabotageTarget = t.id;
					e.planting = 0;
					e.charges--;
					e.order = { kind: "move", x: t.x, y: t.y };
					e.path = this.pathTo(e, t);
					e.target = null;
				}
			},
			serialize() {
				return { ...old.serialize.call(this), campaignEvents: this.campaignEvents || null };
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			const s = state.campaignEvents;
			if (s && typeof s === "object" && PLAN[g.missionId] && Array.isArray(s.retakes) && Array.isArray(s.losses) && s.owners && typeof s.owners === "object")
				g.campaignEvents = JSON.parse(JSON.stringify({ retakeAt: {}, warned: 0, diversionAt: 0, reinforced: false, saboteursAt: null, sabotageQueue: null, lastSabotageWarn: -99, clock: 0, ...s }));
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
