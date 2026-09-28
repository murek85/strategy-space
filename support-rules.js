/* Stage E: support buildings and units, and building modules.
   Buildings: medical post (heals infantry), shield generator (absorbs damage to buildings, overloads),
   salvage yard (workers recover metal from wrecks). Units: anti-aircraft vehicle, recon drone,
   saboteurs (hidden until spotted; a charge disables an enemy building for a while).
   Modules: one per barracks, factory or turret, chosen from two. All values are tunable below. */
(function (root) {
	function install(RTS) {
		if (RTS.supportInstalled) return;
		RTS.supportInstalled = true;
		const { Game, TYPES, dist } = RTS;
		const SUPPORT = (RTS.SUPPORT = {
			medbay: { range: 170, slots: 3, rate: 12, metalPerHp: 1 / 8 },
			shield: { range: 230, capacity: 700, absorb: 0.7, recharge: 25, calm: 4, overload: 12, restart: 0.25 },
			salvage: { share: 0.25, min: 15, max: 140, life: 240, work: 3, searchRange: 450 },
			drone: { sight: 520 },
			saboteur: { detect: 150, plant: 4, disable: 25, recharge: 45, waveDelay: 15 },
			skyguard: { ground: 0.35 },
			module: { metal: 150, gas: 40, install: 12 },
		});
		RTS.INFANTRY_TYPES ??= ["trooper", "rocket", "raider"];
		if (!RTS.INFANTRY_TYPES.includes("saboteur")) RTS.INFANTRY_TYPES.push("saboteur");
		RTS.PASSENGER_TYPES ??= ["trooper", "rocket"];
		if (!RTS.PASSENGER_TYPES.includes("saboteur")) RTS.PASSENGER_TYPES.push("saboteur");
		Object.assign(TYPES, {
			medbay: { name: "Punkt medyczny", hp: 800, speed: 0, range: 0, damage: 0, cooldown: 1, cost: 180, radius: 34, construction: 14 },
			shieldgen: { name: "Generator osłon", hp: 900, speed: 0, range: 0, damage: 0, cooldown: 1, cost: 320, radius: 36, construction: 20 },
			salvageYard: { name: "Plac odzysku", hp: 900, speed: 0, range: 0, damage: 0, cooldown: 1, cost: 160, radius: 42, construction: 14 },
			skyguard: { name: "Wóz przeciwlotniczy", hp: 380, speed: 90, range: 330, damage: 28, cooldown: 0.6, cost: 220, build: 11, radius: 19 },
			drone: { name: "Dron zwiadowczy", hp: 110, speed: 210, range: 0, damage: 0, cooldown: 1, cost: 90, build: 6, radius: 11, flying: true },
			saboteur: { name: "Sabotażyści", hp: 80, speed: 120, range: 120, damage: 6, cooldown: 1, cost: 140, build: 8, radius: 10 },
		});
		// Modules: one per building, chosen from the two offered for its type.
		const MODULES = (RTS.MODULES = {
			veterans: { building: "barracks", name: "Szkolenie weteranów", effect: "Nowi żołnierze: +20% wytrzymałości, +10% obrażeń; szkolenie +20% dłużej." },
			rapid: { building: "barracks", name: "Szybka rekrutacja", effect: "Szkolenie o 30% krótsze." },
			heavyArms: { building: "factory", name: "Ciężkie uzbrojenie", effect: "Nowe pojazdy: +15% obrażeń, +10% wytrzymałości." },
			logistics: { building: "factory", name: "Logistyka", effect: "Pojazdy o 25% szybciej i 10% taniej." },
			antiArmor: { building: "turret", name: "Działo przeciwpancerne", effect: "+50% obrażeń pojazdom i budynkom, −30% piechocie." },
			antiAir: { building: "turret", name: "Wyrzutnia przeciwlotnicza", effect: "Wieżyczka strzela także do lotnictwa." },
		});
		// Existing damage rules treat the new types like their closest relatives.
		const ALIAS = { skyguard: "tank", drone: "interceptor", saboteur: "trooper", medbay: "barracks", shieldgen: "barracks", salvageYard: "depot" };
		const VEHICLES = new Set(["tank", "heavy", "artillery", "transport", "skyguard", "sentinel", "raider"]);
		const old = {};
		for (const k of ["productionType", "developmentRequirement", "canTarget", "damage", "applyDamage", "updateVisionOf", "tick", "enqueue", "isProducer", "workTick", "serialize", "combatReport"]) old[k] = Game.prototype[k];
		const fromSave = Game.fromSave;
		const aliasOf = (e) => (e && ALIAS[e.type] ? { ...e, type: ALIAS[e.type] } : e);
		const isInfantry = (e) => RTS.INFANTRY_TYPES.includes(e.type);
		const ready = (e) => e && e.hp > 0 && !e.constructionLeft;
		const disabled = (g, e) => (e.disabledUntil || 0) > g.time || (e.moduleLeft || 0) > 0;

		Object.assign(Game.prototype, {
			productionType(type) {
				if (type === "skyguard") return "factory";
				if (type === "drone" || type === "saboteur") return "barracks";
				return old.productionType.call(this, type);
			},
			developmentRequirement(type) {
				if (["shieldgen", "saboteur"].includes(type) && this.centerLevel() < 2) return "Wymaga centrum II — Kolonia (BADANIA lub ROZWÓJ / F2)";
				if (type === "medbay" && !this.ready("barracks")) return "Wymaga ukończonych koszar";
				return old.developmentRequirement.call(this, type);
			},
			isProducer(e) {
				// A building fitting a module does not produce until the module is in place.
				return old.isProducer.call(this, e) && !((e.moduleLeft || 0) > 0);
			},
			canTarget(a, b) {
				if (disabled(this, a)) return false;
				// Hidden saboteurs cannot be targeted; saboteurs themselves only fight when ordered to.
				if (b.type === "saboteur" && b.stealth) return false;
				if (a.type === "saboteur" && !(a.order?.kind === "attack" && a.order.targetId === b.id)) return false;
				if (a.type === "skyguard") return true;
				if (a.type === "turret" && a.module === "antiAir" && TYPES[b.type]?.flying) return true;
				return old.canTarget.call(this, a, b);
			},
			damage(attacker, target) {
				let n = old.damage.call(this, attacker, aliasOf(target));
				if (attacker.type === "skyguard" && !TYPES[target.type]?.flying) n *= SUPPORT.skyguard.ground;
				if (attacker.type === "turret" && attacker.module === "antiArmor") n *= VEHICLES.has(target.type) || !TYPES[target.type]?.speed ? 1.5 : 0.7;
				if (attacker.veteran) n *= 1.1;
				if (attacker.heavyArms) n *= 1.15;
				return n;
			},
			shieldFor(target) {
				if (!target || TYPES[target.type]?.speed) return null;
				let best = null;
				for (const g of this.entities)
					if (g.type === "shieldgen" && g.team === target.team && ready(g) && !(g.overload > 0) && (g.shield || 0) > 0 && dist(g, target) <= SUPPORT.shield.range && (!best || g.shield > best.shield)) best = g;
				return best;
			},
			applyDamage(attacker, target, amount) {
				if (target.hp > 0 && Number.isFinite(amount) && amount > 0) {
					const gen = this.shieldFor(target);
					if (gen) {
						const absorbed = Math.min(gen.shield, amount * SUPPORT.shield.absorb);
						gen.shield -= absorbed;
						gen.lastAbsorb = this.time;
						gen.flash = 0.35;
						// A ripple where the shot hits the dome (at most a few per second per generator).
						if (!(gen.fxAt > this.time - 0.12)) {
							gen.fxAt = this.time;
							const d = dist(gen, target) || 1,
								reach = Math.min(SUPPORT.shield.range, d + TYPES[target.type].radius + 10),
								hx = attacker ? attacker.x - target.x : 0,
								hy = attacker ? attacker.y - target.y : -1,
								hl = Math.hypot(hx, hy) || 1;
							this.fx("shieldHit", target.x + (hx / hl) * (TYPES[target.type].radius + 6), target.y + (hy / hl) * (TYPES[target.type].radius + 6), { gx: gen.x, gy: gen.y, reach });
						}
						amount -= absorbed;
						if (gen.shield <= 0.5) {
							gen.shield = 0;
							gen.overload = SUPPORT.shield.overload;
							if (this.isHuman(gen.team)) this.as(gen.team, () => this.notify("Generator osłon przeciążony — tarcza wróci za " + SUPPORT.shield.overload + " s.", "alarm"));
						}
					}
				}
				if (target.type === "saboteur") target.revealedUntil = this.time + 3;
				const alive = target.hp > 0;
				old.applyDamage.call(this, attacker, target, amount);
				if (alive && target.hp <= 0) this.leaveWreck(target);
			},
			// Destroyed vehicles and buildings leave wrecks that a salvage yard can recover.
			leaveWreck(e) {
				const s = TYPES[e.type];
				if (!s?.cost || e.team === 2 || ["wall", "gate"].includes(e.type) || isInfantry(e) || e.type === "drone") return;
				if (!(this.isHuman(e.team) || this.humans.some((h) => this.isVisibleTo(h, e.x, e.y)))) return;
				const c = SUPPORT.salvage;
				this.wrecks ??= [];
				this.wrecks.push({
					id: (this.wreckId = (this.wreckId || 0) + 1),
					x: e.x,
					y: e.y,
					type: e.type,
					size: s.radius,
					value: Math.round(Math.max(c.min, Math.min(c.max, s.cost * c.share))),
					life: c.life,
				});
				if (this.wrecks.length > 60) this.wrecks.shift();
			},
			salvageYard() {
				return this.entities.find((e) => e.team === this.me && e.type === "salvageYard" && ready(e));
			},
			salvage(ids, wreckId) {
				const wreck = (this.wrecks || []).find((w) => w.id === wreckId);
				if (!wreck || this.result) return 0;
				if (!this.salvageYard()) {
					this.notify("Odzysk wymaga ukończonego placu odzysku.");
					return 0;
				}
				let n = 0;
				for (const id of ids) {
					const e = this.get(id);
					if (!e || e.team !== this.me || e.type !== "worker") continue;
					e.order = { kind: "salvage", wreckId, work: 0 };
					e.path = this.pathTo(e, wreck);
					e.target = null;
					n++;
				}
				if (n) this.notify(`Odzysk wraku: ${wreck.value} metalu. Roboty dowiozą złom na plac odzysku.`, "order-move");
				return n;
			},
			workTick(e, dt) {
				if (e.order?.kind !== "salvage") return old.workTick.call(this, e, dt);
				const o = e.order,
					yard = this.salvageYard();
				if (!yard) {
					e.order = null;
					e.path = [];
					return;
				}
				if (e.scrap > 0) {
					// Deliver the load to the yard.
					if (this.moveWorker(e, yard, dt, TYPES.salvageYard.radius + 26)) {
						this.credits += e.scrap;
						this.recordIncome("metal", e.scrap);
						e.scrap = 0;
						// Look for the next wreck near the yard; otherwise stop.
						const next = (this.wrecks || []).filter((w) => !w.claimed && dist(w, yard) < SUPPORT.salvage.searchRange).sort((a, b) => dist(a, yard) - dist(b, yard))[0];
						if (next) {
							e.order = { kind: "salvage", wreckId: next.id, work: 0 };
							e.path = this.pathTo(e, next);
						} else {
							e.order = null;
							e.path = [];
						}
					}
					return;
				}
				const wreck = (this.wrecks || []).find((w) => w.id === o.wreckId);
				if (!wreck) {
					e.order = null;
					e.path = [];
					return;
				}
				if (this.moveWorker(e, wreck, dt, wreck.size + 24)) {
					wreck.claimed = true;
					o.work += dt;
					if (!(o.fxAt > o.work - 0.4)) {
						o.fxAt = o.work;
						this.fx("sparks", wreck.x + ((o.work * 37) % 20) - 10, wreck.y - 6, { seed: o.work * 3 });
					}
					if (o.work >= SUPPORT.salvage.work) {
						e.scrap = wreck.value;
						this.wrecks = this.wrecks.filter((w) => w !== wreck);
						e.path = this.pathTo(e, yard);
					}
				}
			},
			sabotage(ids, targetId) {
				const t = this.get(targetId);
				if (!t || t.team === this.me || t.team === 2 || TYPES[t.type].speed || this.result) return 0;
				let n = 0;
				for (const id of ids) {
					const e = this.get(id);
					if (!e || e.team !== this.me || e.type !== "saboteur") continue;
					e.sabotageTarget = t.id;
					e.planting = 0;
					e.order = { kind: "move", x: t.x, y: t.y };
					e.path = this.pathTo(e, t);
					e.target = null;
					n++;
				}
				if (n) this.notify(`Sabotażyści ruszają do celu: ${TYPES[t.type].name}. Ładunek wyłączy go na ${SUPPORT.saboteur.disable} s.`, "order-move");
				return n;
			},
			moduleOptions(e) {
				return Object.entries(MODULES)
					.filter(([, m]) => m.building === e?.type)
					.map(([key, m]) => ({ key, ...m }));
			},
			moduleRequirement(e) {
				if (!e || e.team !== this.me || !ready(e) || !this.moduleOptions(e).length) return "Wybierz własny ukończony budynek z modułami";
				if (e.module) return "Budynek ma już moduł: " + MODULES[e.module].name;
				if (this.centerLevel() < 2) return "Moduły wymagają centrum II — Kolonia";
				const c = SUPPORT.module;
				if (this.credits < c.metal || this.gas < c.gas) return `Moduł kosztuje ${c.metal} metalu i ${c.gas} gazu`;
				return "";
			},
			installModule(id, key) {
				const e = this.get(id),
					m = MODULES[key];
				if (!m || !e || e.type !== m.building || this.moduleRequirement(e)) {
					if (e) this.notify(this.moduleRequirement(e) || "Ten moduł nie pasuje do budynku.");
					return false;
				}
				const c = SUPPORT.module;
				this.credits -= c.metal;
				this.gas -= c.gas;
				e.module = key;
				e.moduleLeft = c.install;
				this.notify(`${m.name} — montaż modułu (${c.install} s). Budynek w tym czasie nie działa.`, "research");
				return true;
			},
			enqueue(type, preferredId = null) {
				const requirement = ["saboteur", "drone", "skyguard"].includes(type) ? this.developmentRequirement(type) : "";
				if (requirement) {
					this.notify(TYPES[type].name + ": " + requirement);
					return false;
				}
				const ok = old.enqueue.call(this, type, preferredId);
				if (!ok) return ok;
				const q = this.queue.at(-1),
					b = this.get(q.producerId);
				const factor = b?.module === "rapid" ? 0.7 : b?.module === "veterans" ? 1.2 : b?.module === "logistics" ? 0.75 : 1;
				q.left *= factor;
				q.total *= factor;
				if (b?.module === "logistics") {
					const refund = Math.round((q.paid ?? TYPES[type].cost) * 0.1);
					this.credits += refund;
					if (q.paid != null) q.paid -= refund;
				}
				return ok;
			},
			updateVisionOf(team) {
				old.updateVisionOf.call(this, team);
				// Drones see far: mark their wide circle as well.
				const cols = this.W / 40,
					rows = this.H / 40,
					r = SUPPORT.drone.sight;
				for (const d of this.entities) {
					if (!this.allied(team, d.team) || d.type !== "drone" || d.hp <= 0) continue;
					for (let y = Math.max(0, Math.floor((d.y - r) / 40)); y <= Math.min(rows - 1, Math.floor((d.y + r) / 40)); y++)
						for (let x = Math.max(0, Math.floor((d.x - r) / 40)); x <= Math.min(cols - 1, Math.floor((d.x + r) / 40)); x++)
							if (Math.hypot((x + 0.5) * 40 - d.x, (y + 0.5) * 40 - d.y) < r) {
								this.visible[y * cols + x] = 1;
								this.explored[y * cols + x] = 1;
							}
				}
			},
			supportTick(dt) {
				// Power of a side: a human's own grid; computer sides use the first human's (as before).
				const factors = {},
					powerOf = (team) => (factors[team] ??= this.as(this.isHuman(team) ? team : this.humans[0], () => this.power.factor)),
					power = powerOf(this.humans[0]);
				// Modules being fitted.
				for (const e of this.entities)
					if (e.moduleLeft > 0) {
						e.moduleLeft = Math.max(0, e.moduleLeft - dt * powerOf(e.team));
						if (!(e.fxAt > this.time - 0.6)) {
							e.fxAt = this.time;
							const r = TYPES[e.type].radius;
							this.fx("sparks", e.x + Math.cos(this.time * 2.3) * r * 0.6, e.y - r * 0.5, { seed: this.time });
						}
						if (!e.moduleLeft && this.isHuman(e.team)) this.as(e.team, () => this.notify(`${MODULES[e.module].name} — moduł gotowy.`, "ready"));
					}
				// Medical posts heal wounded infantry nearby.
				const m = SUPPORT.medbay,
					healed = new Set();
				for (const b of this.entities) {
					if (b.type !== "medbay") continue;
					b.healTargets = [];
					if (!ready(b)) continue;
					const wounded = this.entities
						.filter((e) => e.team === b.team && e.hp > 0 && e.hp < e.maxHp && isInfantry(e) && !healed.has(e.id) && dist(e, b) <= m.range)
						.sort((a, z) => a.hp / a.maxHp - z.hp / z.maxHp || a.id - z.id)
						.slice(0, m.slots);
					for (const e of wounded) {
						const underFire = Number.isFinite(e.lastDamaged) && this.time - e.lastDamaged < 3,
							side = this.isHuman(b.team) ? this.sideOf(b.team) : null,
							amount = Math.min(e.maxHp - e.hp, m.rate * dt * (side ? powerOf(b.team) : 1) * (underFire ? 0.25 : 1), side ? Math.max(0, side.credits) / m.metalPerHp : Infinity);
						if (amount <= 0) continue;
						e.hp += amount;
						if (side) side.credits = Math.max(0, side.credits - amount * m.metalPerHp);
						healed.add(e.id);
						b.healTargets.push(e.id);
						if (!(e.healFxAt > this.time - 0.8)) {
							e.healFxAt = this.time;
							this.fx("heal", e.x, e.y, { dx: ((e.id * 7) % 9) - 4 });
						}
					}
				}
				// Shield generators recharge after a calm moment; an overload shuts them for a while.
				const sh = SUPPORT.shield;
				for (const g of this.entities) {
					if (g.type !== "shieldgen" || !ready(g)) continue;
					g.flash = Math.max(0, (g.flash || 0) - dt);
					if (g.overload > 0) {
						g.overload = Math.max(0, g.overload - dt);
						if (!g.overload) g.shield = sh.capacity * sh.restart;
						continue;
					}
					g.shield ??= 0;
					if (this.time - (g.lastAbsorb ?? -99) >= sh.calm) g.shield = Math.min(sh.capacity, g.shield + sh.recharge * dt * (this.isHuman(g.team) ? powerOf(g.team) : 1));
				}
				// Saboteurs: hidden unless an enemy unit is close (buildings do not spot them — guards do) or they
				// were just hit; charges plant and recharge.
				const sb = SUPPORT.saboteur;
				for (const e of this.entities) {
					if (e.type !== "saboteur" || e.hp <= 0) continue;
					const near = this.entities.some((o) => o.hp > 0 && o.team !== e.team && o.team !== 2 && TYPES[o.type].speed > 0 && !TYPES[o.type].flying && dist(o, e) < sb.detect + TYPES[o.type].radius);
					e.stealth = !near && !((e.revealedUntil || 0) > this.time) && e.order?.kind !== "attack";
					if (e.sabotageTarget == null) continue;
					const t = this.get(e.sabotageTarget);
					if (!t || t.team === e.team) {
						delete e.sabotageTarget;
						e.planting = 0;
						continue;
					}
					if ((e.chargeReady || 0) > this.time) {
						if (this.isHuman(e.team) && !e.warnedCharge) {
							this.as(e.team, () => this.notify(`Sabotażyści: ładunek gotowy za ${Math.ceil(e.chargeReady - this.time)} s.`));
							e.warnedCharge = true;
						}
						continue;
					}
					if (dist(e, t) <= TYPES[t.type].radius + 35) {
						e.path = [];
						e.order = { kind: "hold" };
						e.planting = (e.planting || 0) + dt;
						if (e.planting >= sb.plant) {
							t.disabledUntil = this.time + sb.disable;
							e.chargeReady = this.time + sb.recharge;
							e.planting = 0;
							e.warnedCharge = false;
							delete e.sabotageTarget;
							if (t.type === "hq" && !this.isHuman(t.team)) {
								if (this.delayAttack) this.delayAttack(t.team, sb.waveDelay);
								else this.nextWave += sb.waveDelay;
							}
							this.effects.push({ kind: "explosion", x: t.x, y: t.y, size: 30, life: 0.5, maxLife: 0.5, sabotage: true });
							this.fx("emp", t.x, t.y);
							if (this.isHuman(e.team)) this.as(e.team, () => this.notify(`${TYPES[t.type].name} wyłączony na ${sb.disable} s${t.type === "hq" && !this.isHuman(t.team) ? " — desant opóźniony o " + sb.waveDelay + " s" : ""}.`, "ready"));
						}
					} else if (!e.path.length) {
						e.order = { kind: "move", x: t.x, y: t.y };
						e.path = this.pathTo(e, t);
					}
				}
				// Anti-aircraft vehicles keep their mount on the target (the model reads it).
				for (const e of this.entities)
					if (e.type === "skyguard" && e.target) {
						const t = this.get(e.target);
						if (t) e.aim = Math.atan2(t.y - e.y, t.x - e.x);
					}
				// Wrecks fade after a while.
				if (this.wrecks?.length) {
					for (const w of this.wrecks) w.life -= dt;
					this.wrecks = this.wrecks.filter((w) => w.life > 0);
				}
			},
			tick(dt) {
				const before = this.nextId;
				old.tick.call(this, dt);
				if (this.result || !(dt > 0)) return;
				// Units that just left a building with a module get its benefits.
				for (const e of this.entities) {
					if (e.id < before || !this.isHuman(e.team) || !TYPES[e.type].speed || e.moduleApplied) continue;
					e.moduleApplied = true;
					const producer = this.entities
						.filter((b) => b.team === e.team && b.module && b.type === this.productionType(e.type) && dist(b, e) < 280)
						.sort((a, b) => dist(a, e) - dist(b, e))[0];
					if (producer?.module === "veterans" && isInfantry(e)) {
						e.veteran = true;
						e.hp *= 1.2;
						e.maxHp *= 1.2;
					}
					if (producer?.module === "heavyArms" && producer.type === "factory") {
						e.heavyArms = true;
						e.hp *= 1.1;
						e.maxHp *= 1.1;
					}
				}
				this.supportTick(dt);
			},
			combatReport(ids) {
				return old.combatReport.call(this, ids).map((r) => ({
					...r,
					role:
						r.type === "skyguard"
							? "Mobilna obrona przeciwlotnicza · słaby przeciw celom naziemnym"
							: r.type === "drone"
								? `Zwiad z powietrza · widzi na ${SUPPORT.drone.sight} · bez broni`
								: r.type === "saboteur"
									? "Ukryci do wykrycia · PPM na wrogim budynku: sabotaż"
									: r.role,
				}));
			},
			serialize() {
				return { ...old.serialize.call(this), wrecks: this.wrecks || [], wreckId: this.wreckId || 0 };
			},
		});
		Game.fromSave = function (state) {
			const g = fromSave.call(this, state);
			const list = Array.isArray(state.wrecks) ? state.wrecks : [];
			for (const w of list)
				if (!w || !Number.isInteger(w.id) || !TYPES[w.type] || ![w.x, w.y, w.value, w.life, w.size].every(Number.isFinite) || w.value < 0 || w.value > 1000)
					throw Error("Uszkodzony zapis wraków");
			g.wrecks = list.map((w) => ({ ...w, claimed: false }));
			g.wreckId = Math.max(Number(state.wreckId) || 0, ...g.wrecks.map((w) => w.id), 0);
			for (const e of g.entities) {
				if (e.module !== undefined && (!MODULES[e.module] || MODULES[e.module].building !== e.type)) throw Error("Uszkodzony zapis modułu");
				if (e.scrap !== undefined && !(Number.isFinite(e.scrap) && e.scrap >= 0 && e.scrap <= 1000)) throw Error("Uszkodzony zapis złomu");
			}
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
