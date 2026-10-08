/* Deposits that can be used (0.151.3). An extractor stands right on its gas field, so a field inside a rock or an
   asteroid, or too close to ore, crystals, a relay, another field or a building, could never be tapped (seen on the
   orbit maps, Rzeki Magmy and chapters I–II of the campaign). After every map is laid out (configureMission — every
   mission and chapter; configureSkirmish — scenarios, which can rescale and regenerate the map) each such field is
   moved to the nearest free spot (rings 20–400 around it, 16 directions), where the extractor's own placement rules
   (canBuild in engine.js) are met. Ore and crystal fields only need a spot within a worker's reach that is not
   blocked; one without is moved the same way. Units and fauna are ignored (they move or can be destroyed); buildings
   count. Deterministic — the same in every network game. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.depositsInstalled) return;
		RTS.depositsInstalled = true;
		const { Game, TYPES, dist } = RTS;
		const old = {};
		for (const k of ["configureMission", "configureSkirmish"]) old[k] = Game.prototype[k];
		const RINGS = 20,
			STEP = 20,
			DIRECTIONS = 16;

		Object.assign(Game.prototype, {
			// The spot meets the extractor's placement rules (canBuild), apart from the player's reach.
			gasSiteFree(p, field) {
				const r = TYPES.extractor.radius;
				return (
					!this.blocked(p.x, p.y, r + 8) &&
					!this.nodes.some((n) => dist(n, p) < r + 60) &&
					![...this.ores, ...this.crystalFields].some((o) => dist(o, p) < r + 55) &&
					!this.gasFields.some((o) => o !== field && dist(o, p) < r + 50) &&
					!this.entities.some((e) => e.hp > 0 && !TYPES[e.type].speed && dist(e, p) < TYPES[e.type].radius + r + 20)
				);
			},
			// A worker can reach the deposit: some point at mining distance is free.
			oreReachable(p) {
				for (let a = 0; a < DIRECTIONS; a++) {
					const q = { x: p.x + Math.cos((a * Math.PI * 2) / DIRECTIONS) * 38, y: p.y + Math.sin((a * Math.PI * 2) / DIRECTIONS) * 38 };
					if (!this.blocked(q.x, q.y, 12)) return true;
				}
				return false;
			},
			// The nearest spot around p that passes the test, or null.
			nearestSpot(p, ok) {
				for (let ring = 1; ring <= RINGS; ring++)
					for (let a = 0; a < DIRECTIONS; a++) {
						const angle = (a * Math.PI * 2) / DIRECTIONS + (ring % 2) * (Math.PI / DIRECTIONS),
							q = { x: Math.round(p.x + Math.cos(angle) * ring * STEP), y: Math.round(p.y + Math.sin(angle) * ring * STEP) };
						if (q.x > 90 && q.y > 90 && q.x < this.W - 90 && q.y < this.H - 90 && ok(q)) return q;
					}
				return null;
			},
			// Moves the deposits that could not be used; returns how many were moved.
			settleDeposits() {
				let moved = 0;
				for (const o of [...(this.ores || []), ...(this.crystalFields || [])])
					if (!this.oreReachable(o)) {
						const q = this.nearestSpot(o, (p) => this.oreReachable(p) && !this.blocked(p.x, p.y, 10));
						if (q) {
							o.x = q.x;
							o.y = q.y;
							moved++;
						}
					}
				for (const f of this.gasFields || [])
					if (!this.gasSiteFree(f, f)) {
						const q = this.nearestSpot(f, (p) => this.gasSiteFree(p, f));
						if (q) {
							f.x = q.x;
							f.y = q.y;
							moved++;
						}
					}
				return moved;
			},
			configureMission(...args) {
				const r = old.configureMission.apply(this, args);
				this.settleDeposits();
				return r;
			},
			configureSkirmish(...args) {
				const r = old.configureSkirmish.apply(this, args);
				this.settleDeposits();
				return r;
			},
		});
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
