const { test } = require("node:test"),
	assert = require("node:assert/strict"),
	{ Game } = require("../engine"),
	Tree = require("../development");
function ready() {
	const g = new Game(42, "solar");
	g.credits = 2000;
	g.gas = 200;
	g.nextWave = 99999;
	return g;
}
test("new outpost blocks advanced construction through UI model and engine", () => {
	const g = ready();
	assert.equal(g.centerLevel(), 1);
	for (const type of ["factory", "lab", "hangar", "workshop"]) {
		assert.match(g.developmentRequirement(type), /Kolonia/);
		assert.equal(g.buildStructure(type, 600, 600), false);
		assert.equal(
			Tree.node(g, "building:" + type, require("../engine")).requires,
			"research:colony",
		);
	}
	for (const type of ["reactor", "extractor", "battery", "barracks"])
		assert.equal(g.developmentRequirement(type), "");
});
test("upgrade costs, cancellation, completion and duplicate prevention", () => {
	const g = ready(),
		before = [g.credits, g.gas];
	assert.ok(g.startResearch("colony"));
	assert.deepEqual([g.credits, g.gas], [before[0] - 300, before[1] - 50]);
	assert.equal(g.startResearch("colony"), false);
	g.cancelResearch();
	assert.deepEqual([g.credits, g.gas], before);
	g.startResearch("colony");
	g.research.left = 0.01;
	g.tick(0.1);
	assert.equal(g.centerLevel(), 2);
	assert.equal(g.developmentRequirement("factory"), "");
	assert.equal(g.startResearch("colony"), false);
});
test("save preserves ongoing upgrade and migration grants level for old infrastructure", () => {
	const g = ready();
	g.startResearch("colony");
	g.research.left = 17;
	const restored = Game.fromSave(g.serialize());
	assert.equal(restored.centerLevel(), 1);
	assert.equal(restored.research.left, 17);
	g.cancelResearch();
	g.spawn("lab", 0, 600, 600);
	const old = g.serialize();
	delete old.centerProgression;
	assert.equal(Game.fromSave(old).centerLevel(), 2);
	const current = g.serialize();
	assert.equal(Game.fromSave(current).centerLevel(), 1);
});
test("campaign retains access and missing headquarters prevents spending", () => {
	for (const mission of ["colony1", "colony2", "colony3"])
		assert.equal(new Game(42, mission).centerLevel(), 2);
	const g = ready(),
		money = g.credits;
	g.hq(0).hp = 0;
	assert.equal(g.startResearch("colony"), false);
	assert.equal(g.credits, money);
});
