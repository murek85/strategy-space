const { test } = require("node:test"),
	assert = require("node:assert/strict"),
	{ Game } = require("../engine");
function clean() {
	const g = new Game(42, "solar");
	g.entities = [];
	g.nodes = [];
	g.obstacles = [];
	g.waters = [];
	g.credits = 1000;
	g.time = 20;
	g.spawn("hq", 0, 400, 400);
	g.spawn("hq", 1, 2900, 1900);
	g.visible.fill(1);
	return g;
}
function hurt(g, type = "tank", team = 0, x = 630) {
	const e = g.spawn(type, team, x, 600);
	e.hp = e.maxHp / 2;
	return e;
}
test("two bays repair eligible nearby allies with exact metal cost", () => {
	const g = clean(),
		b = g.spawn("workshop", 0, 600, 600),
		a = hurt(g),
		w = hurt(g, "worker");
	const others = [
		hurt(g, "heavy"),
		hurt(g, "trooper"),
		hurt(g, "bomber"),
		hurt(g, "tank", 1),
		hurt(g, "tank", 0, 900),
	];
	const before = others.map((e) => e.hp),
		hp = [a.hp, w.hp];
	g.workshopTick(1);
	assert.equal(a.hp, hp[0] + 16);
	assert.equal(w.hp, hp[1] + 16);
	assert.deepEqual(
		others.map((e) => e.hp),
		before,
	);
	assert.equal(b.repairTargets.length, 2);
	assert.ok(Math.abs(g.credits - 993.6) < 1e-9);
});
test("no stacking, over-repair, free repairs or unfinished workshop service", () => {
	const g = clean(),
		b = g.spawn("workshop", 0, 600, 600),
		a = hurt(g);
	g.spawn("workshop", 0, 610, 610);
	let hp = a.hp;
	g.workshopTick(1);
	assert.equal(a.hp, hp + 16);
	a.hp = a.maxHp - 1;
	g.workshopTick(1);
	assert.equal(a.hp, a.maxHp);
	a.hp -= 30;
	g.credits = 0.1;
	hp = a.hp;
	g.workshopTick(1);
	assert.equal(a.hp, hp + 0.5);
	assert.equal(g.credits, 0);
	g.credits = 100;
	for (const e of g.entities.filter((e) => e.type === "workshop"))
		e.constructionLeft = 5;
	hp = a.hp;
	g.workshopTick(1);
	assert.equal(a.hp, hp);
	assert.deepEqual(b.repairTargets, []);
});
test("power shortage and recent hits reduce repair; save preserves workshop", () => {
	const g = clean(),
		b = g.spawn("workshop", 0, 600, 600),
		a = hurt(g);
	g.spawn("lab", 0, 800, 800);
	const hp = a.hp;
	a.lastDamaged = 20;
	assert.equal(g.power.demand, 50);
	g.workshopTick(1);
	assert.ok(Math.abs(a.hp - hp - 3.2) < 1e-9);
	const saved = Game.fromSave(g.serialize());
	saved.time = 24;
	const restored = saved.get(a.id),
		before = restored.hp;
	saved.workshopTick(1);
	assert.ok(Math.abs(restored.hp - before - 12.8) < 1e-9);
	assert.equal(saved.get(b.id).type, "workshop");
});
test("workshop placement pays faction cost and assigns a builder", () => {
	const g = clean();
	g.configureSkirmish({ faction: "colonies" });
	g.upgrades.colony = true;
	g.entities = [];
	g.obstacles = [];
	g.waters = [];
	g.nodes = [];
	g.ores = [];
	g.gasFields = [];
	g.crystalFields = [];
	g.spawn("hq", 0, 400, 400);
	const w = g.spawn("worker", 0, 430, 400);
	g.visible.fill(1);
	g.credits = 1000;
	const cost = g.cost("workshop");
	assert.ok(g.buildStructure("workshop", 600, 600, [w.id]));
	assert.equal(g.credits, 1000 - cost);
	assert.equal(w.order.kind, "build");
	assert.equal(
		g.entities.find((e) => e.type === "workshop").constructionLeft,
		18,
	);
});
