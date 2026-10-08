// 0.151.3: deposits that can be used (deposit-rules.js) — an extractor fits on every gas field, every ore and crystal
// field can be reached by a worker, on every map.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;

function check(g, where) {
	for (const f of g.gasFields) assert.ok(g.gasSiteFree(f, f), `${where}: gas field ${f.id} at ${f.x},${f.y} cannot take an extractor`);
	for (const o of [...g.ores, ...g.crystalFields]) assert.ok(g.oreReachable(o), `${where}: deposit ${o.id} cannot be reached`);
}

test("every scenario map, size and seed: an extractor fits on each gas field, each ore can be reached", () => {
	const maps = Object.keys(RTS.MISSIONS).filter((k) => !RTS.MISSIONS[k].campaign);
	for (const map of maps)
		for (const size of ["small", "medium", "large"])
			for (const seed of [1, 7, 42, 99]) {
				const g = new Game(seed, map);
				g.configureSkirmish({ size, players: 2 });
				check(g, `${map}/${size}/${seed}`);
			}
});

test("every campaign chapter too", () => {
	for (const map of Object.keys(RTS.MISSIONS).filter((k) => RTS.MISSIONS[k].campaign)) check(new Game(42, map), map);
});

test("a gas field inside a rock or beside ore is moved to the nearest free spot; the same everywhere", () => {
	const make = () => {
		const g = new Game(5, "horizon");
		g.configureSkirmish({ size: "medium" });
		const f = g.gasFields[0];
		g.obstacles.push({ x: f.x - 30, y: f.y - 30, w: 60, h: 60 });
		g.ores.push({ id: 999, x: f.x + 40, y: f.y, amount: 1000 });
		return { g, f, from: { x: f.x, y: f.y } };
	};
	const a = make(),
		b = make();
	assert.ok(!a.g.gasSiteFree(a.f, a.f));
	assert.ok(a.g.settleDeposits() >= 1);
	b.g.settleDeposits();
	assert.ok(a.g.gasSiteFree(a.f, a.f), "now usable");
	assert.ok(dist(a.f, a.from) <= 400, "not far from where it was");
	assert.deepEqual([a.f.x, a.f.y], [b.f.x, b.f.y], "deterministic (network games)");
	// A usable field is left where it is.
	const c = new Game(5, "horizon");
	c.configureSkirmish({ size: "medium" });
	const before = c.gasFields.map((f) => [f.x, f.y]);
	assert.equal(c.settleDeposits(), 0);
	assert.deepEqual(c.gasFields.map((f) => [f.x, f.y]), before);
	assert.ok(TYPES.extractor);
});
