/* Stage B: transports, anti-aircraft defence and destination formations. */
(function (root) {
	function install(RTS) {
		if (RTS.armyInstalled) return;
		RTS.armyInstalled = true;
		const { Game, TYPES, dist, clamp, W, H } = RTS;
		// Other rule modules may add passenger types (e.g. campaign civilians).
		RTS.PASSENGER_TYPES ??= ["trooper", "rocket"];
		Object.assign(TYPES, {
			transport: {
				name: "Transporter opancerzony",
				hp: 620,
				speed: 105,
				range: 150,
				damage: 10,
				cooldown: 1.1,
				cost: 260,
				build: 14,
				radius: 23,
			},
			flak: {
				name: "Bateria przeciwlotnicza",
				hp: 950,
				speed: 0,
				range: 360,
				damage: 40,
				cooldown: 0.8,
				cost: 260,
				construction: 16,
				radius: 34,
			},
		});
		const old = {};
		for (const k of [
			"command",
			"hold",
			"stop",
			"tick",
			"applyDamage",
			"canTarget",
			"productionType",
			"developmentRequirement",
			"serialize",
		])
			old[k] = Game.prototype[k];
		const fromSave = Game.fromSave;
		Object.assign(Game.prototype, {
			combatReport(ids) {
				const groups = new Map();
				for (const id of ids) {
					const e = this.get(id);
					if (!e) continue;
					const list = groups.get(e.type) || [];
					list.push(e);
					groups.set(e.type, list);
				}
				return [...groups].map(([type, es]) => {
					const e = es[0],
						s = TYPES[type];
					return {
						type,
						name: s.name,
						count: es.length,
						hp: Math.ceil(es.reduce((n, u) => n + u.hp, 0)),
						maxHp: Math.ceil(es.reduce((n, u) => n + u.maxHp, 0)),
						range: s.range,
						damage: s.damage
							? Math.round(
									s.damage *
										(this.factionFor(e.team)?.damage || 1) *
										(this.upgradeOf(e.team, "weapons")
											? 1.25
											: 1) *
										(this.upgradeOf(e.team, "precision")
											? 1.15
											: 1) *
										(!this.isHuman(e.team) && e.team !== 2
											? this.difficultyScale()
											: 1) *
										10,
								) / 10
							: 0,
						cooldown: s.cooldown || 0,
						speed: Math.round(s.speed * this.movementFactor(e)),
						accuracy: Math.round(this.accuracy(e) * 100),
						cost: this.cost(type),
						cover: es.filter(
							(u) =>
								["trooper", "rocket"].includes(u.type) &&
								this.cover(u),
						).length,
						passengers: es.reduce(
							(n, u) => n + (u.passengers || []).length,
							0,
						),
						role:
							type === "transport"
								? "Transport 4 piechurów · lekka broń naziemna"
								: type === "flak"
									? "Wyłącznie obrona przeciwlotnicza"
									: s.flying
										? "Lotnictwo"
										: ["trooper", "rocket"].includes(type)
											? "Piechota · korzysta z osłon"
											: s.speed
												? "Pojazd / wsparcie"
												: "Infrastruktura",
					};
				});
			},
			transportSeats(carrier) {
				return 4;
			},
			population(team) {
				return (
					this.units(team).length +
					this.entities
						.filter((e) => e.team === team && e.hp > 0)
						.reduce(
							(n, e) =>
								n +
								(e.passengers || []).filter((p) => p.hp > 0)
									.length,
							0,
						)
				);
			},
			productionType(type) {
				return type === "transport"
					? "factory"
					: old.productionType.call(this, type);
			},
			developmentRequirement(type) {
				return type === "flak" && this.centerLevel() < 2
					? "Wymaga centrum II — Kolonia (BADANIA lub ROZWÓJ / F2)"
					: old.developmentRequirement.call(this, type);
			},
			canTarget(a, b) {
				return a.type === "flak"
					? !!TYPES[b.type]?.flying
					: old.canTarget.call(this, a, b);
			},
			formationName() {
				return {
					line: "Linia",
					column: "Kolumna",
					spread: "Rozproszenie",
				}[this.formation || "line"];
			},
			setFormation(kind) {
				if (!["line", "column", "spread"].includes(kind)) return false;
				this.formation = kind;
				this.notify(
					"Formacja: " +
						this.formationName() +
						". Obowiązuje przy następnym rozkazie ruchu.",
					"order-formation",
				);
				return true;
			},
			landingSpot(center, radius = 12, reserved = [], limit = 220) {
				for (let r = 55; r <= limit; r += 28)
					for (let i = 0; i < 24; i++) {
						const p = {
							x: center.x + Math.cos((i * Math.PI) / 12) * r,
							y: center.y + Math.sin((i * Math.PI) / 12) * r,
						};
						if (
							p.x < radius + 10 ||
							p.y < radius + 10 ||
							p.x > this.W - radius - 10 ||
							p.y > this.H - radius - 10 ||
							this.blocked(p.x, p.y, radius + 3)
						)
							continue;
						if (
							reserved.some((q) => dist(q, p) < radius * 2 + 8) ||
							this.entities.some(
								(e) =>
									e.hp > 0 &&
									dist(e, p) <
										TYPES[e.type].radius + radius + 5,
							)
						)
							continue;
						return p;
					}
				return null;
			},
			board(ids, carrierId) {
				const carrier = this.get(carrierId);
				if (
					this.result ||
					carrier?.type !== "transport" ||
					carrier.team !== this.me ||
					carrier.hp <= 0
				)
					return 0;
				const waiting = this.entities.filter(
					(e) => e.boardTargetId === carrier.id,
				).length;
				let places =
						this.transportSeats(carrier) -
						(carrier.passengers || []).length -
						waiting,
					count = 0;
				for (const id of [...new Set(ids)]) {
					const e = this.get(id);
					if (places <= 0) break;
					if (
						!e ||
						e.hp <= 0 ||
						e.team !== carrier.team ||
						!RTS.PASSENGER_TYPES.includes(e.type) ||
						e.boardTargetId === carrier.id
					)
						continue;
					old.command.call(this, [id], carrier.x, carrier.y);
					e.boardTargetId = carrier.id;
					places--;
					count++;
				}
				if (count)
					this.notify(
						"Piechota kieruje się do transportera. Zatrzymaj pojazd na czas załadunku.",
						"order-board",
					);
				return count;
			},
			unload(carrierId, emergency = false) {
				const carrier = emergency
					? this.entities.find((e) => e.id === carrierId)
					: this.get(carrierId);
				if (
					!carrier ||
					carrier.type !== "transport" ||
					(!emergency &&
						(carrier.team !== this.me || carrier.hp <= 0 || this.result))
				)
					return 0;
				let count = 0;
				const remaining = [];
				for (const p of carrier.passengers || []) {
					const spot = this.landingSpot(
						carrier,
						TYPES[p.type].radius,
						[],
						emergency ? 1500 : 220,
					);
					if (!spot) {
						remaining.push(p);
						continue;
					}
					p.x = spot.x;
					p.y = spot.y;
					p.path = [];
					p.target = null;
					p.order = { kind: "hold" };
					p.repath = 0;
					p.hit = emergency ? 0.15 : 0;
					delete p.boardTargetId;
					if (emergency) {
						p.hp = Math.max(1, p.hp * 0.5);
						p.lastDamaged = this.time;
					}
					this.entities.push(p);
					count++;
				}
				carrier.passengers = remaining;
				if (emergency && remaining.length) {
					this.notify(
						"Brak miejsca na awaryjny desant — utracono " +
							remaining.length +
							" członków załogi.",
					);
					carrier.passengers = [];
				}
				if (count)
					this.notify(
						emergency
							? "Awaryjny desant: załoga straciła 50% pozostałych PW."
							: "Załoga wysiadła i utrzymuje pozycję.",
						"order-unload",
					);
				else if (!emergency && remaining.length)
					this.notify(
						"Brak miejsca na desant. Przestaw transporter na otwarty teren.",
					);
				return count;
			},
			boardingTick() {
				const boarded = new Set();
				for (const e of this.entities) {
					if (!e.boardTargetId || e.hp <= 0) continue;
					const c = this.get(e.boardTargetId);
					if (
						!c ||
						c.hp <= 0 ||
						c.team !== e.team ||
						c.type !== "transport" ||
						(c.passengers || []).length >= this.transportSeats(c)
					) {
						delete e.boardTargetId;
						e.order = null;
						e.path = [];
						continue;
					}
					if (
						dist(e, c) <=
						TYPES.transport.radius + TYPES[e.type].radius + 25
					) {
						c.passengers ??= [];
						c.passengers.push(e);
						boarded.add(e.id);
						e.order = null;
						e.target = null;
						e.path = [];
						delete e.boardTargetId;
					} else if (
						!e.order ||
						dist(e.order, c) > 35 ||
						!e.path.length
					) {
						old.command.call(this, [e.id], c.x, c.y);
					}
				}
				if (boarded.size)
					this.entities = this.entities.filter(
						(e) => !boarded.has(e.id),
					);
			},
			command(ids, x, y, targetId = null, attackMove = false) {
				const es = [...new Set(ids)]
					.map((id) => this.get(id))
					.filter(
						(e) =>
							e &&
							e.hp > 0 &&
							e.team === this.me &&
							TYPES[e.type].speed,
					);
				for (const e of es) delete e.boardTargetId;
				if (targetId || es.length < 2) {
					old.command.call(this, ids, x, y, targetId, attackMove);
				} else {
					const center = {
						x: es.reduce((n, e) => n + e.x, 0) / es.length,
						y: es.reduce((n, e) => n + e.y, 0) / es.length,
					};
					const angle = Math.atan2(y - center.y, x - center.x),
						kind = this.formation || "line";
					const cols =
						kind === "line"
							? es.length
							: kind === "column"
								? Math.min(2, es.length)
								: Math.ceil(Math.sqrt(es.length));
					const step = Math.max(
							kind === "spread" ? 85 : 38,
							...es.map((e) => TYPES[e.type].radius * 2 + 12),
						),
						reserved = [];
					es.forEach((e, i) => {
						const across = ((i % cols) - (cols - 1) / 2) * step,
							behind =
								(Math.floor(i / cols) -
									(Math.ceil(es.length / cols) - 1) / 2) *
								step;
						let p = {
							x: clamp(
								x -
									Math.sin(angle) * across -
									Math.cos(angle) * behind,
								35,
								this.W - 35,
							),
							y: clamp(
								y +
									Math.cos(angle) * across -
									Math.sin(angle) * behind,
								35,
								this.H - 35,
							),
						};
						if (
							!TYPES[e.type].flying &&
							(this.blocked(p.x, p.y, TYPES[e.type].radius + 3) ||
								reserved.some((q) => dist(q, p) < step * 0.6))
						)
							p = this.landingSpot(
								p,
								TYPES[e.type].radius,
								reserved,
							) || { x: e.x, y: e.y };
						reserved.push(p);
						old.command.call(
							this,
							[e.id],
							p.x,
							p.y,
							null,
							attackMove,
						);
					});
				}
				if (es.length)
					(this.soundEvents ??= []).push(
						targetId || attackMove ? "order-attack" : "order-move",
					);
			},
			hold(ids) {
				for (const id of ids) {
					const e = this.get(id);
					if (e) delete e.boardTargetId;
				}
				const n = old.hold.call(this, ids);
				if (n) (this.soundEvents ??= []).push("order-hold");
				return n;
			},
			stop(ids) {
				for (const id of ids) {
					const e = this.get(id);
					if (e) delete e.boardTargetId;
				}
				old.stop.call(this, ids);
			},
			tick(dt) {
				if (!this.result) this.boardingTick();
				old.tick.call(this, dt);
			},
			applyDamage(a, b, n) {
				old.applyDamage.call(this, a, b, n);
				if (b.hp <= 0 && b.type === "transport" && b.passengers?.length)
					this.unload(b.id, true);
			},
			serialize() {
				return {
					...old.serialize.call(this),
					formation: this.formation || "line",
				};
			},
		});
		Game.fromSave = function (state) {
			const g = fromSave.call(this, state);
			g.formation = ["line", "column", "spread"].includes(state.formation)
				? state.formation
				: "line";
			const ids = new Set(g.entities.map((e) => e.id));
			for (const e of g.entities) {
				if (e.passengers !== undefined) {
					if (
						e.type !== "transport" ||
						!Array.isArray(e.passengers) ||
						e.passengers.length > 4
					)
						throw Error("Uszkodzony zapis transportera");
					for (const p of e.passengers) {
						if (
							!p ||
							!RTS.PASSENGER_TYPES.includes(p.type) ||
							p.team !== e.team ||
							!Number.isInteger(p.id) ||
							ids.has(p.id) ||
							![p.hp, p.maxHp, p.x, p.y].every(Number.isFinite) ||
							p.hp <= 0 ||
							p.maxHp <= 0 ||
							p.hp > p.maxHp ||
							p.passengers
						)
							throw Error("Uszkodzony zapis załogi");
						ids.add(p.id);
						p.order = null;
						p.target = null;
						p.path = [];
						delete p.boardTargetId;
						g.nextId = Math.max(g.nextId, p.id + 1);
					}
				}
			}
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports)
		module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
