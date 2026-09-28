const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Game, TYPES } = require("../engine");
const advance = (g, s) => {
	for (let t = 0; t < s; t += 1 / 30) g.tick(1 / 30);
};
function peaceful() {
	const g = new Game();
	g.entities = g.entities.filter((e) => e.team === 0);
	g.nextWave = Infinity;
	return g;
}
test("extractor snaps to a deposit, costs metal and rejects duplicate construction", () => {
	const g = new Game(),
		f = g.gasFields[0];
	assert.ok(g.buildStructure("extractor", f.x + 10, f.y));
	const b = g.entities.find((e) => e.type === "extractor");
	assert.equal(b.x, f.x);
	assert.equal(b.gasId, f.id);
	assert.equal(g.credits, 240);
	assert.equal(g.buildStructure("extractor", f.x, f.y), false);
	assert.equal(g.buildStructure("extractor", 400, 800), false);
});
test("gas requires a completed extractor and one worker, stops on reassignment and death", () => {
	const g = peaceful(),
		f = g.gasFields[0];
	g.buildStructure("extractor", f.x, f.y);
	const b = g.entities.find((e) => e.type === "extractor"),
		workers = g.units(0).filter((e) => e.type === "worker");
	assert.equal(g.assignGas([workers[0].id], b.id), false);
	advance(g, 13);
	assert.equal(g.gas, 0);
	assert.ok(
		g.assignGas(
			workers.map((w) => w.id),
			b.id,
		),
	);
	assert.equal(g.assignGas([workers[1].id], b.id), false);
	advance(g, 6);
	assert.ok(g.gas > 0);
	g.stop([workers[0].id]);
	const gas = g.gas;
	advance(g, 1);
	assert.equal(g.gas, gas);
	g.assignGas([workers[1].id], b.id);
	b.hp = 0;
	advance(g, 1);
	assert.equal(workers[1].order, null);
	assert.equal(g.gas, gas);
});
test("depleted gas becomes idle without negative stock or lost ore cargo", () => {
	const g = peaceful(),
		f = g.gasFields[0],
		b = g.spawn("extractor", 0, f.x, f.y),
		w = g.units(0).find((e) => e.type === "worker");
	b.gasId = f.id;
	f.amount = 1;
	w.x = f.x + 40;
	w.y = f.y;
	w.cargo = 12;
	g.assignGas([w.id], b.id);
	advance(g, 2);
	assert.equal(f.amount, 0);
	assert.ok(Math.abs(g.gas - 1) < 1e-8);
	assert.equal(w.cargo, 12);
	assert.ok(g.idleWorkers().includes(w));
});
test("depot shortens ore delivery and destroyed depot reroutes loaded worker", () => {
	const g = peaceful(),
		w = g.units(0).find((e) => e.type === "worker"),
		depot = g.spawn("depot", 0, 600, 1250);
	w.x = 660;
	w.y = 1210;
	w.cargo = 30;
	g.gather([w.id], 2);
	assert.equal(g.bestDropoff(w).id, depot.id);
	g.workTick(w, 0.01);
	assert.equal(w.order.depotId, depot.id);
	depot.hp = 0;
	g.workTick(w, 0.01);
	assert.equal(w.order.depotId, g.hq(0).id);
	assert.equal(w.cargo, 30);
	advance(g, 8);
	assert.ok(g.mined >= 30);
});
test("dropoff selection compares actual route lengths and ignores unfinished buildings", () => {
	const g = peaceful(),
		w = g.units(0).find((e) => e.type === "worker"),
		a = g.spawn("depot", 0, 200, 1200),
		b = g.spawn("depot", 0, 600, 1200);
	w.x = 100;
	w.y = 1200;
	g.pathTo = (from, to) =>
		to.id === a.id
			? [
					{ x: 1000, y: 1200 },
					{ x: to.x, y: to.y },
				]
			: [{ x: to.x, y: to.y }];
	g.hq(0).constructionLeft = 1;
	assert.equal(g.bestDropoff(w).id, b.id);
	b.constructionLeft = 10;
	assert.equal(g.bestDropoff(w).id, a.id);
});
test("mixed research cost is atomic and cancellation refunds each resource", () => {
	const g = new Game();
	g.spawn("depot", 0, 600, 1250);
	g.gas = 49;
	const credits = g.credits;
	assert.equal(g.startResearch("cargo"), false);
	assert.equal(g.credits, credits);
	assert.equal(g.gas, 49);
	g.gas = 50;
	assert.ok(g.startResearch("cargo"));
	assert.equal(g.credits, credits - 150);
	assert.equal(g.gas, 0);
	assert.ok(g.cancelResearch());
	assert.equal(g.credits, credits);
	assert.equal(g.gas, 50);
	assert.equal(g.cancelResearch(), false);
});
test("cargo research pauses without depot and doubles capacity once", () => {
	const g = peaceful(),
		b = g.spawn("depot", 0, 600, 1250);
	g.gas = 50;
	g.startResearch("cargo");
	advance(g, 5);
	const left = g.research.left;
	b.hp = 0;
	advance(g, 3);
	assert.equal(g.research.left, left);
	g.spawn("depot", 0, 600, 1250);
	advance(g, 22);
	assert.equal(g.cargoCapacity, 60);
	assert.equal(g.startResearch("cargo"), false);
	assert.equal(g.research, null);
});
test("old save migrates gas map around existing buildings and preserves paid research", () => {
	const g = new Game();
	g.spawn("factory", 0, 500, 1280);
	g.startResearch("weapons");
	g.enqueue("trooper");
	g.spawn("depot", 0, 80, 1080);
	const s = g.serialize();
	s.version = 3;
	delete s.gas;
	delete s.gasFields;
	delete s.upgrades.cargo;
	delete s.research.paid;
	const restored = Game.fromSave(s);
	assert.equal(restored.gas, 0);
	assert.equal(restored.credits, s.credits);
	assert.deepEqual(restored.queue, s.queue);
	assert.equal(restored.research.left, s.research.left);
	assert.ok(
		restored.gasFields.every(
			(f) =>
				!restored.entities.some(
					(e) =>
						Math.hypot(e.x - f.x, e.y - f.y) <
						TYPES[e.type].radius + 70,
				),
		),
	);
	const credits = restored.credits;
	restored.cancelResearch();
	assert.equal(restored.credits, credits + 250);
	assert.equal(restored.gas, 0);
});
test("new save roundtrip retains gas amount, worker assignment and mixed-cost refund", () => {
	const g = new Game(),
		f = g.gasFields[0],
		b = g.spawn("extractor", 0, f.x, f.y);
	b.gasId = f.id;
	g.assignGas([g.units(0).find((e) => e.type === "worker").id], b.id);
	g.spawn("depot", 0, 600, 1250);
	g.gas = 100;
	g.startResearch("cargo");
	const restored = Game.fromSave(g.serialize());
	assert.equal(restored.gas, 50);
	assert.ok(restored.units(0).some((w) => w.order?.extractorId === b.id));
	assert.deepEqual(restored.gasFields, g.gasFields);
	restored.cancelResearch();
	assert.equal(restored.gas, 100);
});
