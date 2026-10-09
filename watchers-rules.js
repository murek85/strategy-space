/* The fourth faction — the Watchers of the Abyss (Wartownicy Otchłani), act IV (H3a, H3b; 0.154). A race of
   machines of pale stone and light: the artifacts were their beacons, the Swarm their garden.
   Faction: cost +15%, hit points −10%, damage +5%; every unit and building carries a shield (it soaks damage
   first and comes back after a while without hits); ground units hover — weather and terrain do not slow them.
   Economy without mining: their Weavers (workers) do not mine ore; a Resonator built at a deposit (ore or
   crystals) or at an own relay draws metal (and crystals) from it at a distance; the Core yields more.
   Unique units: Spark (fast; ability Blink — a short teleport), Prism (a beam whose damage grows the longer it
   holds one target), Arc (artillery whose discharge jumps to two more enemies), Warden (heavy; ability Phase —
   a few seconds immune to damage, without firing), Construct (a titan made by merging two Wardens). Unique
   buildings: Anchor (widens the building zone; units can jump between Anchors; units from the forges come out
   of a rift at the Anchor nearest their rally point) and Resonator. The Core (their command centre) can lift
   off and fly to a new site. Shared types keep their rules under Watcher names (WATCHERS_NAMES).
   New in the game: active abilities with cooldowns, teleports, growing and chained damage, merging units,
   a mobile command centre, an economy without miners, production through rifts. Player actions are network
   commands (NET_COMMANDS). Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.watchersInstalled) return;
		RTS.watchersInstalled = true;
		const { Game, TYPES, dist, clamp } = RTS;

		RTS.FACTIONS.watchers = {
			name: "Wartownicy Otchłani",
			cost: 1.15,
			hp: 0.9,
			speed: 1,
			damage: 1.05,
			description:
				"Koszt +15%, wytrzymałość −10%, obrażenia +5%; tarcze na wszystkim, lewitacja (pogoda i teren nie spowalniają). Bez górników — Rezonatory czerpią ze złóż i przekaźników. Unikalne: iskra (skok), pryzmat (narastająca wiązka), łuk (wyładowanie łańcuchowe), strażnik (faza), konstrukt (scalenie dwóch strażników), kotwica (szczeliny i teleporty), rezonator; centrum może przelecieć.",
		};
		Object.assign(TYPES, {
			spark: { name: "Iskra", hp: 120, speed: 135, range: 150, damage: 14, cooldown: 0.7, cost: 80, build: 5, radius: 10, faction: "watchers" },
			prism: { name: "Pryzmat", hp: 280, speed: 80, range: 210, damage: 11, cooldown: 0.5, cost: 200, build: 11, radius: 15, faction: "watchers" },
			arc: { name: "Łuk", hp: 220, speed: 65, range: 380, damage: 40, cooldown: 2.4, cost: 240, build: 13, radius: 17, faction: "watchers" },
			warden: { name: "Strażnik", hp: 820, speed: 60, range: 170, damage: 36, cooldown: 1.4, cost: 300, build: 15, radius: 22, faction: "watchers" },
			// Made by merging two Wardens, never produced.
			construct: { name: "Konstrukt", hp: 1900, speed: 45, range: 210, damage: 75, cooldown: 1.6, cost: 640, radius: 30, faction: "watchers", merged: true },
			anchor: { name: "Kotwica", hp: 700, speed: 0, range: 0, damage: 0, cooldown: 1, cost: 180, radius: 26, construction: 12, faction: "watchers", sight: 380 },
			resonator: { name: "Rezonator", hp: 600, speed: 0, range: 0, damage: 0, cooldown: 1, cost: 220, radius: 24, construction: 14, faction: "watchers" },
		});
		for (const t of ["spark"]) if (!RTS.INFANTRY_TYPES.includes(t)) RTS.INFANTRY_TYPES.push(t);
		// Drop pods of the Inwazja (invasion-rules.js): Sparks and a Shard, or a Warden.
		if (RTS.INVASION) RTS.INVASION.pods.watchers = [["spark", "spark", "trooper"], ["warden"]];

		const W = (RTS.WATCHERS = {
			shield: { share: 0.25, delay: 4, rate: 0.12 },
			coreIncome: 4,
			resonator: { reach: 75, ore: 5, crystalMetal: 3, crystals: 0.4, relay: 5 },
			anchor: { zone: 320, jumpReach: 150, jumpCooldown: 8 },
			blink: { range: 260, cooldown: 10 },
			phase: { time: 3, cooldown: 18 },
			beam: { step: 0.25, most: 6 },
			chain: { jumps: 2, reach: 110, falloff: 0.5 },
			merge: { reach: 140 },
			core: { speed: 70, reach: 1100, cooldown: 120 },
		});
		RTS.WATCHERS_NAMES = {
			hq: "Rdzeń",
			barracks: "Kuźnia Fazowa",
			factory: "Wielka Kuźnia",
			turret: "Iglica",
			depot: "Magazyn Echa",
			extractor: "Syfon gazu",
			reactor: "Soczewka mocy",
			lab: "Archiwum Światła",
			battery: "Ogniwa światła",
			workshop: "Łuk naprawczy",
			hangar: "Gniazdo soczewek",
			flak: "Iglice przeciwlotnicze",
			medbay: "Źródło odnowy",
			shieldgen: "Kopuła fazowa",
			salvageYard: "Przetwornik",
			worker: "Tkacz",
			trooper: "Odłamek",
			rocket: "Kolec",
			saboteur: "Echo",
			tank: "Pierścień",
			heavy: "Monument",
			artillery: "Wieża echa",
			transport: "Nosiciel",
			skyguard: "Soczewka przeciwlotnicza",
			interceptor: "Ostrze",
			bomber: "Płyta",
			drone: "Oko",
		};
		RTS.FACTION_KIT.watchers = {
			units: ["spark", "prism", "arc", "warden"],
			building: "anchor",
			buildings: ["anchor", "resonator"],
			trait: "Tarcze na jednostkach i budynkach; lewitacja; dochód z Rezonatorów zamiast górników; centrum może przelecieć.",
		};
		RTS.ENEMY_FACTIONS && (RTS.ENEMY_FACTIONS.watchers = "Wartownicy Otchłani");
		if (RTS.NET_COMMANDS) Object.assign(RTS.NET_COMMANDS, { ability: 3, anchorJump: 2, mergeWardens: 1, relocateCore: 3 });

		const old = {};
		for (const k of ["spawn", "applyDamage", "canTarget", "movementFactor", "productionType", "unitName", "entityName", "gather", "canBuild", "buildStructure", "sideTick", "tick", "unitTick"]) old[k] = Game.prototype[k];
		const watchersOf = (g, team) => g.factionFor(team)?.key === "watchers";
		const ready = (e) => e && e.hp > 0 && !e.constructionLeft;

		Object.assign(Game.prototype, {
			// Shields on everything of the faction (refilled after `delay` s without a hit).
			spawn(type, team, x, y) {
				const e = old.spawn.call(this, type, team, x, y);
				if (e.faction === "watchers" && team !== 2) e.ward = e.wardMax = Math.round(e.maxHp * W.shield.share);
				return e;
			},
			applyDamage(attacker, target, amount) {
				if (!target || !(amount > 0)) return old.applyDamage.call(this, attacker, target, amount);
				// Phase: nothing gets through.
				if ((target.phaseUntil || 0) > this.time) return;
				// The Prism's beam grows while it holds one target.
				if (attacker?.type === "prism") {
					attacker.beamStacks = attacker.beamTarget === target.id ? Math.min(W.beam.most, (attacker.beamStacks || 0) + 1) : 0;
					attacker.beamTarget = target.id;
					amount *= 1 + W.beam.step * attacker.beamStacks;
				}
				if (target.ward > 0) {
					const soaked = Math.min(target.ward, amount);
					target.ward -= soaked;
					amount -= soaked;
					target.wardHit = this.time;
					target.lastDamaged = this.time;
				}
				const r = amount > 0 ? old.applyDamage.call(this, attacker, target, amount) : undefined;
				// The Arc's (and the Watchers' Spire's) discharge jumps on to two more enemies.
				if ((attacker?.type === "arc" || (attacker?.type === "turret" && attacker.faction === "watchers")) && !attacker.chaining) {
					attacker.chaining = true;
					try {
						let from = target,
							power = amount;
						const hit = new Set([target.id]);
						for (let k = 0; k < W.chain.jumps; k++) {
							power *= W.chain.falloff;
							const next = this.entities
								.filter((o) => o.hp > 0 && !hit.has(o.id) && o.team !== 2 && !this.allied(attacker.team, o.team) && this.canTarget(attacker, o) && dist(o, from) < W.chain.reach)
								.sort((a, b) => dist(a, from) - dist(b, from))[0];
							if (!next || !(power > 0.5)) break;
							hit.add(next.id);
							this.effects.push({ kind: "shot", x: from.x, y: from.y, tx: next.x, ty: next.y, team: attacker.team, chain: true, life: 0.25, maxLife: 0.25 });
							this.applyDamage(attacker, next, power);
							from = next;
						}
					} finally {
						attacker.chaining = false;
					}
				}
				return r;
			},
			// A Warden in phase does not fire; a lifted Core cannot be hit.
			canTarget(a, b) {
				if ((a?.phaseUntil || 0) > this.time || b?.lifted) return false;
				return old.canTarget.call(this, a, b);
			},
			// Hovering: weather and terrain never slow their ground units (bonuses still count).
			movementFactor(e) {
				const n = old.movementFactor.call(this, e);
				return e.faction === "watchers" && TYPES[e.type].speed && !TYPES[e.type].flying ? Math.max(n, 1) : n;
			},
			productionType(type) {
				if (type === "spark") return "barracks";
				if (type === "prism" || type === "arc" || type === "warden") return "factory";
				if (type === "construct") return null;
				return old.productionType.call(this, type);
			},
			unitName(type, team = this.me) {
				return (watchersOf(this, team) && RTS.WATCHERS_NAMES[type]) || old.unitName.call(this, type, team);
			},
			entityName(e) {
				return (e.faction === "watchers" && RTS.WATCHERS_NAMES[e.type]) || old.entityName.call(this, e);
			},
			// Weavers do not mine ore: the Resonators draw it.
			gather(ids, oreId, resource = "ore") {
				if (resource === "ore" && watchersOf(this, this.me)) {
					this.notify("Tkacze nie wydobywają rudy — postaw Rezonator przy złożu lub przekaźniku.");
					return false;
				}
				return old.gather.call(this, ids, oreId, resource);
			},
			// What a Resonator would draw from at a point: a deposit (ore, crystals) or an own relay, free of other Resonators.
			resonatorSource(x, y, team = this.me) {
				const p = { x, y },
					taken = (s) => this.entities.some((e) => e.type === "resonator" && e.hp > 0 && e.source?.id === s.id && e.source.kind === s.kind),
					list = [
						...this.ores.filter((o) => o.amount > 0).map((o) => ({ kind: "ore", id: o.id, x: o.x, y: o.y })),
						...this.crystalFields.filter((o) => o.amount > 0).map((o) => ({ kind: "crystal", id: o.id, x: o.x, y: o.y })),
						...this.nodes.filter((n) => n.owner === (this.sideLeader ? this.sideLeader(team) : team)).map((n) => ({ kind: "relay", id: n.id, x: n.x, y: n.y })),
					];
				return list.filter((s) => dist(s, p) < W.resonator.reach + 40 && !taken(s)).sort((a, b) => dist(a, p) - dist(b, p))[0] || null;
			},
			canBuild(x, y, type = "turret") {
				if (TYPES[type]?.faction === "watchers" && this.scenario && !watchersOf(this, this.me)) return false;
				if (type === "resonator") {
					const s = this.resonatorSource(x, y);
					if (!s) return false;
					const d = dist(s, { x, y }) || 1,
						at = d > W.resonator.reach ? { x: s.x + ((x - s.x) / d) * W.resonator.reach, y: s.y + ((y - s.y) / d) * W.resonator.reach } : { x, y };
					return this.inWatchersZone(at.x, at.y) && this.freeSiteNear(at.x, at.y, type, s);
				}
				if (old.canBuild.call(this, x, y, type)) return true;
				// The Anchors widen the building zone (not for walls and extractors).
				if (["wall", "gate", "extractor"].includes(type) || !watchersOf(this, this.me)) return false;
				return this.nearAnchor(x, y) && (this.freeSite ? this.freeSite(x, y, type) : false);
			},
			nearAnchor(x, y, team = this.me) {
				return this.entities.some((e) => e.team === team && e.type === "anchor" && ready(e) && dist(e, { x, y }) < W.anchor.zone);
			},
			inWatchersZone(x, y) {
				const hq = this.hq(this.me);
				return (!!hq && dist(hq, { x, y }) < 420) || this.nearAnchor(x, y) || this.nodes.some((n) => n.owner === this.me && dist(n, { x, y }) < 260);
			},
			// Free ground beside a deposit (the deposit itself is allowed close by).
			freeSiteNear(x, y, type, source) {
				const r = TYPES[type].radius,
					p = { x, y };
				return (
					this.isVisible(x, y) &&
					!this.blocked(x, y, r + 6) &&
					!this.entities.some((e) => e.hp > 0 && dist(e, p) < TYPES[e.type].radius + r + 12) &&
					![...this.ores, ...this.crystalFields, ...this.nodes].some((o) => o.id !== source.id && dist(o, p) < r + 45)
				);
			},
			buildStructure(type, x, y, ids = []) {
				if (type !== "resonator") return old.buildStructure.call(this, type, x, y, ids);
				const s = this.resonatorSource(x, y);
				if (!s) {
					this.notify("Rezonator stoi przy złożu rudy, kryształów lub przy własnym przekaźniku.");
					return false;
				}
				const d = dist(s, { x, y }) || 1,
					at = d > W.resonator.reach ? { x: s.x + ((x - s.x) / d) * W.resonator.reach, y: s.y + ((y - s.y) / d) * W.resonator.reach } : { x, y };
				const before = this.nextId,
					ok = old.buildStructure.call(this, type, at.x, at.y, ids);
				if (ok) {
					const e = this.entities.find((o) => o.id >= before && o.type === "resonator");
					if (e) e.source = { kind: s.kind, id: s.id };
				}
				return ok;
			},
			// Income of the acting side: the Core's bonus and the Resonators; units from the forges come out of a
			// rift at the Anchor nearest their rally point.
			sideTick(dt) {
				const before = this.nextId;
				old.sideTick.call(this, dt);
				if (!watchersOf(this, this.me)) return;
				let extra = W.coreIncome;
				for (const r of this.entities) {
					if (r.type !== "resonator" || r.team !== this.me || !ready(r) || !r.source) continue;
					const R = W.resonator,
						s = r.source;
					if (s.kind === "relay") {
						const n = this.nodes.find((x) => x.id === s.id);
						if (n && n.owner === (this.sideLeader ? this.sideLeader(this.me) : this.me)) extra += R.relay;
					} else {
						const field = (s.kind === "ore" ? this.ores : this.crystalFields).find((o) => o.id === s.id);
						if (!field || field.amount <= 0) continue;
						const take = Math.min(field.amount, (s.kind === "ore" ? R.ore : R.crystalMetal) * dt);
						field.amount -= take;
						extra += take / dt;
						if (s.kind === "crystal") this.crystals += R.crystals * dt;
					}
				}
				this.income += extra;
				this.credits += extra * dt;
				this.recordIncome?.("passive", extra * dt);
				const anchors = this.entities.filter((e) => e.team === this.me && e.type === "anchor" && ready(e));
				if (!anchors.length) return;
				for (const e of this.entities) {
					if (e.id < before || e.team !== this.me || !TYPES[e.type].speed || e.order?.kind !== "move" || e.type === "worker") continue;
					const dest = { x: e.order.x, y: e.order.y },
						a = anchors.sort((p, q) => dist(p, dest) - dist(q, dest))[0];
					if (dist(a, dest) >= dist(e, dest)) continue;
					const spot = this.besideAnchor(a, e, 0);
					if (!spot) continue;
					e.x = spot.x;
					e.y = spot.y;
					e.path = this.pathTo(e, dest);
					e.rifted = this.time;
					this.fx("rift", spot.x, spot.y);
				}
			},
			besideAnchor(a, e, i) {
				const r = TYPES[e.type].radius;
				for (let ring = 1; ring < 6; ring++)
					for (let k = 0; k < 10; k++) {
						const ang = (k / 10) * Math.PI * 2 + i * 0.7 + ring,
							p = { x: a.x + Math.cos(ang) * (TYPES.anchor.radius + 20 + ring * 18), y: a.y + Math.sin(ang) * (TYPES.anchor.radius + 20 + ring * 18) };
						if (!this.blocked(p.x, p.y, r + 2) && !this.entities.some((o) => o !== e && o.hp > 0 && TYPES[o.type].speed && dist(o, p) < TYPES[o.type].radius + r)) return p;
					}
				return null;
			},
			// ---------- player actions (network commands) ----------
			// The ability of the selection: Sparks blink towards the point; Wardens phase.
			ability(ids, x, y) {
				let used = 0,
					phased = false;
				for (const id of ids) {
					const e = this.get(id);
					if (!e || e.team !== this.me || e.hp <= 0 || (e.abilityReady || 0) > this.time) continue;
					if (e.type === "spark" && Number.isFinite(x) && Number.isFinite(y)) {
						const d = dist(e, { x, y }) || 1,
							k = Math.min(1, W.blink.range / d);
						let p = { x: clamp(e.x + (x - e.x) * k, 30, this.W - 30), y: clamp(e.y + (y - e.y) * k, 30, this.H - 30) };
						for (let back = 0; back < 8 && this.blocked(p.x, p.y, TYPES.spark.radius + 2); back++) p = { x: e.x + (p.x - e.x) * 0.8, y: e.y + (p.y - e.y) * 0.8 };
						if (this.blocked(p.x, p.y, TYPES.spark.radius + 2)) continue;
						this.fx("rift", e.x, e.y, { small: true });
						e.x = p.x;
						e.y = p.y;
						e.path = [];
						e.order = null;
						e.abilityReady = this.time + W.blink.cooldown;
						this.fx("rift", p.x, p.y, { small: true });
						used++;
					} else if (e.type === "warden") {
						e.phaseUntil = this.time + W.phase.time;
						e.target = null;
						e.abilityReady = this.time + W.phase.cooldown;
						this.fx("phase", e.x, e.y);
						phased = true;
						used++;
					}
				}
				if (used && this.isHuman(this.me)) (this.soundEvents ??= []).push(phased ? "phase" : "rift");
				return used;
			},
			// Units within reach of an own Anchor jump to another one.
			anchorJump(ids, anchorId) {
				const to = this.get(anchorId);
				if (!ready(to) || to.team !== this.me || to.type !== "anchor") return 0;
				const anchors = this.entities.filter((e) => e.team === this.me && e.type === "anchor" && ready(e) && e !== to);
				let n = 0;
				for (const id of ids) {
					const e = this.get(id);
					if (!e || e.team !== this.me || !TYPES[e.type].speed || TYPES[e.type].flying || (e.jumpReady || 0) > this.time) continue;
					if (!anchors.some((a) => dist(a, e) < W.anchor.jumpReach)) continue;
					const p = this.besideAnchor(to, e, n);
					if (!p) continue;
					this.fx("rift", e.x, e.y);
					e.x = p.x;
					e.y = p.y;
					e.path = [];
					e.order = null;
					e.jumpReady = this.time + W.anchor.jumpCooldown;
					this.fx("rift", p.x, p.y);
					n++;
				}
				if (n && this.isHuman(this.me)) (this.soundEvents ??= []).push("rift");
				return n;
			},
			// Two Wardens near each other become a Construct (the pair nearest each other first).
			mergeWardens(ids) {
				const wardens = ids.map((id) => this.get(id)).filter((e) => e && e.team === this.me && e.type === "warden" && e.hp > 0);
				let made = 0;
				while (wardens.length >= 2) {
					let best = null;
					for (let i = 0; i < wardens.length; i++)
						for (let j = i + 1; j < wardens.length; j++) {
							const d = dist(wardens[i], wardens[j]);
							if (d < W.merge.reach && (!best || d < best.d)) best = { i, j, d };
						}
					if (!best) break;
					const a = wardens[best.i],
						b = wardens[best.j],
						share = (a.hp / a.maxHp + b.hp / b.maxHp) / 2;
					wardens.splice(best.j, 1);
					wardens.splice(best.i, 1);
					a.hp = b.hp = 0;
					a.merged = b.merged = true;
					const c = this.spawn("construct", this.me, (a.x + b.x) / 2, (a.y + b.y) / 2);
					c.hp = Math.max(1, c.maxHp * share);
					this.effects.push({ kind: "explosion", x: c.x, y: c.y, size: 40, life: 0.5, maxLife: 0.5 });
					this.fx("rift", c.x, c.y, { merge: true });
					made++;
				}
				if (made && this.isHuman(this.me)) this.notify(made === 1 ? "Dwaj strażnicy scalili się w konstrukt." : `Powstało ${made} konstruktów.`, "rift");
				return made;
			},
			// The Core lifts off and flies to a new site (it cannot be hit or produce in flight).
			relocateCore(id, x, y) {
				const e = this.get(id);
				if (!e || e.type !== "hq" || e.team !== this.me || e.faction !== "watchers" || e.constructionLeft || e.lifted) return false;
				if ((e.relocateReady || 0) > this.time) {
					this.notify(`Rdzeń może znów przelecieć za ${Math.ceil(e.relocateReady - this.time)} s.`);
					return false;
				}
				const p = { x, y };
				if (!Number.isFinite(x) || !Number.isFinite(y) || dist(e, p) > W.core.reach || !this.isVisible(x, y) || this.blocked(x, y, TYPES.hq.radius + 10) || this.entities.some((o) => o !== e && o.hp > 0 && !TYPES[o.type].speed && dist(o, p) < TYPES[o.type].radius + TYPES.hq.radius + 20)) {
					this.notify("Rdzeń wyląduje tylko na widocznym, wolnym terenie, najwyżej 1100 od obecnego miejsca.");
					return false;
				}
				e.lifted = { x: Math.round(x), y: Math.round(y) };
				e.relocateReady = this.time + W.core.cooldown;
				this.notify("Rdzeń wznosi się i leci na nowe miejsce.", "order-move");
				return true;
			},
			// The computer's Watchers use their abilities (once a second, from the game state only — deterministic):
			// Sparks blink at a target just out of reach, hurt Wardens phase, idle Wardens side by side merge.
			watchersAi() {
				const teams = new Set(this.entities.filter((e) => e.faction === "watchers" && e.team !== 2 && !this.isHuman(e.team) && e.hp > 0 && TYPES[e.type].speed).map((e) => e.team));
				for (const team of teams)
					this.as(team, () => {
						const own = this.entities.filter((e) => e.team === team && e.hp > 0 && (e.abilityReady || 0) <= this.time);
						for (const e of own) {
							const t = e.target != null ? this.get(e.target) : null;
							if (e.type === "spark" && t && t.hp > 0) {
								const d = dist(e, t);
								if (d > TYPES.spark.range && d < TYPES.spark.range + W.blink.range * 0.9) this.ability([e.id], t.x, t.y);
							} else if (e.type === "warden" && e.hp < e.maxHp * 0.45 && !(e.ward > 0) && this.time - (e.lastDamaged ?? -99) < 2) this.ability([e.id]);
						}
						const idle = this.entities.filter((e) => e.team === team && e.type === "warden" && e.hp > e.maxHp * 0.6 && e.target == null);
						if (idle.length >= 2) this.mergeWardens(idle.map((e) => e.id));
					});
			},
			tick(dt) {
				old.tick.call(this, dt);
				if (Math.floor(this.time) !== Math.floor(this.time - dt)) this.watchersAi();
				// The shimmer of a phase, renewed while it lasts (a visual effect only).
				const shimmer = Math.floor(this.time * 3) !== Math.floor((this.time - dt) * 3);
				for (const e of this.entities) {
					if (e.hp <= 0) continue;
					if (shimmer && (e.phaseUntil || 0) > this.time) this.fx("phase", e.x, e.y);
					// A player's Weavers never mine ore (the starting orders included): they wait at the Core.
					if (e.type === "worker" && e.faction === "watchers" && e.order?.kind === "gather" && (e.order.resource ?? "ore") === "ore" && this.isHuman(e.team)) {
						e.order = null;
						e.path = [];
						e.cargo = 0;
					}
					// Entities whose faction was set after they were spawned (starting bases, network games) get their shield.
					if (e.faction === "watchers" && e.wardMax === undefined && e.team !== 2) e.ward = e.wardMax = Math.round(e.maxHp * W.shield.share);
					if (e.wardMax && e.ward < e.wardMax && this.time - (e.wardHit ?? -99) > W.shield.delay) e.ward = Math.min(e.wardMax, e.ward + e.wardMax * W.shield.rate * dt);
					if (e.lifted) {
						const d = dist(e, e.lifted),
							step = W.core.speed * dt;
						if (d <= step) {
							e.x = e.lifted.x;
							e.y = e.lifted.y;
							e.lifted = null;
							this.fx("dust", e.x, e.y, { color: "#cfe9ef" });
							if (this.isHuman(e.team)) this.as(e.team, () => this.notify("Rdzeń wylądował.", "ready"));
						} else {
							e.x += ((e.lifted.x - e.x) / d) * step;
							e.y += ((e.lifted.y - e.y) / d) * step;
						}
					}
				}
			},
		});
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
