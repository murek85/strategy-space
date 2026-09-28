const { test } = require("node:test"),
	assert = require("node:assert/strict"),
	{ Game } = require("../engine");
function clean() {
	const g = new Game(42, "solar");
	g.entities = [];
	g.nodes = [];
	g.obstacles = [];
	g.waters = [];
	g.ores = [];
	g.gasFields = [];
	g.crystalFields = [];
	g.nextWave = 99999;
	g.spawn("hq", 0, 400, 400);
	g.spawn("hq", 1, 2900, 1900);
	g.visible.fill(1);
	return g;
}
function energy(g, dt) {
	g.energyTick(dt);
	const budget = g.power;
	delete g._powerFrame;
	return budget;
}
test("charging shares surplus and respects rate, capacity and construction", () => {
	const g = clean(),
		a = g.spawn("battery", 0, 600, 600),
		b = g.spawn("battery", 0, 700, 600);
	g.spawn("factory", 0, 800, 600);
	energy(g, 1);
	assert.equal(a.energy + b.energy, 15);
	a.energy = 899;
	b.constructionLeft = 1;
	energy(g, 1);
	assert.equal(a.energy, 900);
	assert.equal(b.energy, 0);
	a.hp = 0;
	assert.equal(g.power.capacity, 0);
});
test("stored energy funds limited output and cannot create power on depletion", () => {
	const g = clean(),
		b = g.spawn("battery", 0, 600, 600);
	g.spawn("lab", 0, 800, 600);
	g.spawn("factory", 0, 900, 600);
	b.energy = 900;
	const p = energy(g, 2);
	assert.equal(p.discharge, 15);
	assert.equal(p.factor, 1);
	assert.equal(b.energy, 870);
	b.energy = 1;
	assert.equal(energy(g, 1).discharge, 1);
	assert.equal(b.energy, 0);
	assert.equal(g.power.discharge, 0);
	assert.equal(g.power.factor, 40 / 55);
	g.spawn("hangar", 0, 1100, 600);
	b.energy = 900;
	assert.equal(energy(g, 1).discharge, 30);
	assert.equal(b.energy, 870);
});
test("save retains reserve, old batteries start empty and invalid reserves normalize", () => {
	const g = clean(),
		b = g.spawn("battery", 0, 600, 600);
	b.energy = 432;
	assert.equal(Game.fromSave(g.serialize()).get(b.id).energy, 432);
	delete b.energy;
	assert.equal(Game.fromSave(g.serialize()).get(b.id).energy, 0);
	b.energy = 10000;
	assert.equal(Game.fromSave(g.serialize()).get(b.id).energy, 900);
});
test("actual production uses funded step and transient budget is cleared", () => {
	const g = clean(),
		b = g.spawn("battery", 0, 600, 600);
	g.spawn("lab", 0, 800, 600);
	const f = g.spawn("factory", 0, 900, 600);
	g.credits = 2000;
	b.energy = 10;
	g.enqueue("tank", f.id);
	const before = g.queue[0].left;
	g.tick(0.1);
	assert.ok(Math.abs(g.queue[0].left - before + 0.1) < 1e-8);
	assert.ok(Math.abs(b.energy - 8.5) < 1e-8);
	assert.equal(g._powerFrame, undefined);
	const value = b.energy;
	g.power;
	g.economyReport();
	assert.equal(b.energy, value);
});
