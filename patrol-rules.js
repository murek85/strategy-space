/* DOW-01 further (0.148): patrol and escort orders.
   - Patrol (⇧P, then a right click): combat units march to the point in their formation, fighting on the
     way (as an attack move), then back to where they stood, and so on until another order. After a fight
     they go on with the leg they were on. Points closer than 60 to the unit are refused.
   - Escort (⇧E, then a right click on an own or allied unit or building): the units keep round it in a
     ring and follow it; they fire at enemies in range and chase them, but never further than 280 from the
     one they guard — then they come back. A building escorted is guarded where it stands. The order ends
     when the escorted one is destroyed.
   Orders of the side acting (this.me); lockstep-safe (no random numbers). Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.patrolInstalled) return;
		RTS.patrolInstalled = true;
		const { Game, TYPES, dist, clamp } = RTS;
		const PATROL = (RTS.PATROL = { minLength: 60, arrive: 40 }),
			ESCORT = (RTS.ESCORT = { leash: 280, gap: 30, settle: 28 });
		const old = {};
		for (const k of ["unitTick", "stop"]) old[k] = Game.prototype[k];
		// Combat units of the acting side that can be given the order (not the workers, as with holding).
		const fighters = (g, ids) =>
			ids
				.map((id) => g.get(id))
				.filter((e) => e && e.hp > 0 && e.team === g.me && e.type !== "worker" && TYPES[e.type].speed && TYPES[e.type].damage && !e.constructionLeft);
		Object.assign(Game.prototype, {
			patrol(ids, x, y) {
				if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
				const es = fighters(this, ids).filter((e) => dist(e, { x, y }) >= PATROL.minLength);
				if (!es.length) return 0;
				const starts = new Map(es.map((e) => [e.id, { x: e.x, y: e.y }]));
				// The way out: the usual attack move, so the formation and its sound stay the same.
				this.command(
					es.map((e) => e.id),
					x,
					y,
					null,
					true,
				);
				let count = 0;
				for (const e of es) {
					const a = starts.get(e.id),
						b = e.order?.kind === "attackMove" ? { x: e.order.x, y: e.order.y } : null;
					if (!b || dist(a, b) < PATROL.minLength || !e.path.length) continue;
					e.order.patrol = true;
					e.patrol = { a, b, to: "b" };
					delete e.escortOf;
					count++;
				}
				return count;
			},
			escort(ids, targetId) {
				const t = this.get(targetId);
				if (!t || t.hp <= 0 || !(t.team === this.me || this.allied?.(this.me, t.team))) return 0;
				const es = fighters(this, ids).filter((e) => e.id !== t.id);
				es.forEach((e, i) => {
					e.order = { kind: "escort", targetId: t.id, slot: i, of: es.length };
					e.path = [];
					e.target = null;
					e.repath = 0;
					delete e.patrol;
				});
				if (es.length) (this.soundEvents ??= []).push("order-move");
				return es.length;
			},
			// Where an escort stands: its place in a ring round the one it guards.
			escortSpot(e, t) {
				const o = e.order,
					angle = ((o.slot || 0) / Math.max(1, o.of || 1)) * Math.PI * 2 + 0.6,
					r = TYPES[t.type].radius + TYPES[e.type].radius + ESCORT.gap + (o.of > 6 ? 18 : 0);
				return {
					x: clamp(t.x + Math.cos(angle) * r, 30, this.W - 30),
					y: clamp(t.y + Math.sin(angle) * r, 30, this.H - 30),
				};
			},
			stop(ids) {
				for (const id of ids) {
					const e = this.get(id);
					if (e) delete e.patrol;
				}
				return old.stop.call(this, ids);
			},
			unitTick(e, dt) {
				const o = e.order;
				let guarded = null;
				if (o?.kind === "escort") {
					guarded = this.get(o.targetId);
					if (!guarded || guarded.hp <= 0) {
						e.order = null;
						e.path = [];
						guarded = null;
					} else {
						// The leash: an enemy that drew the escort away from the one it guards is let go.
						const enemy = e.target && this.get(e.target);
						if (enemy && (enemy.hp <= 0 || dist(enemy, guarded) > ESCORT.leash)) e.target = null;
						if (!e.target) {
							const spot = this.escortSpot(e, guarded);
							if (dist(e, spot) <= ESCORT.settle) e.path = [];
							else if (e.repath <= 0 || !e.path.length) {
								e.path = this.pathTo(e, spot);
								if (!e.path.length) e.path = [spot];
								e.repath = 0.5;
							}
						}
					}
				}
				old.unitTick.call(this, e, dt);
				// The engine ends an order whose path ran out; an escort goes on while the guarded one lives.
				if (guarded && !e.order && e.hp > 0) e.order = o;
				if (e.patrol) {
					if (e.order && !e.order.patrol) delete e.patrol;
					else if (!e.order && e.hp > 0) {
						const p = e.patrol;
						// Leg done: turn back; cut short by a fight: carry on to the same end.
						if (dist(e, p[p.to]) <= PATROL.arrive) p.to = p.to === "b" ? "a" : "b";
						const d = p[p.to];
						e.path = this.pathTo(e, d);
						if (!e.path.length) {
							if (dist(e, d) > PATROL.arrive) {
								delete e.patrol;
								return;
							}
							e.path = [{ x: d.x, y: d.y }];
						}
						e.order = { kind: "attackMove", x: d.x, y: d.y, patrol: true };
						e.repath = 0.6;
					}
				}
			},
		});
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
