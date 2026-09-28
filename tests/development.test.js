const { test } = require("node:test"),
	assert = require("node:assert/strict"),
	RTS = require("../engine"),
	Tree = require("../development");
function ready() {
	const g = new RTS.Game(42, "solar");
	g.configureSkirmish({ faction: "colonies" });
	g.credits = 5000;
	g.gas = 500;
	g.crystals = 500;
	return g;
}
test("tree includes all studies and constructible buildings without wildlife", () => {
	// Faction buildings and units appear only for their own faction.
	for (const faction of Object.keys(RTS.FACTIONS)) {
		const g = new RTS.Game(42, "solar");
		g.configureSkirmish({ faction });
		const keys = ["economy", "infrastructure", "army"].flatMap((t) =>
			Tree.groups(g, t).flatMap((b) => [b.root, ...b.leaves]),
		);
		for (const id of Object.keys(RTS.RESEARCH))
			assert.ok(keys.includes("research:" + id), id);
		for (const [id, s] of Object.entries(RTS.TYPES)) {
			const own = !s.faction || s.faction === faction;
			if (s.construction) assert.equal(keys.includes("building:" + id), own, faction + " " + id);
			if (s.faction && s.build) assert.equal(keys.includes("unit:" + id), own, faction + " " + id);
		}
		assert.ok(!keys.some((k) => RTS.TYPES[k.split(":")[1]]?.threat));
		for (const key of keys) assert.ok(Tree.node(g, key, RTS)?.name);
	}
});
test("research status and execution agree on buildings, costs, ongoing work and completion", () => {
	const g = ready();
	assert.equal(g.researchStatus("cargo").allowed, false);
	assert.equal(g.startResearch("cargo"), false);
	const b = g.spawn("depot", 0, 800, 800);
	b.constructionLeft = 5;
	assert.equal(g.researchStatus("cargo").allowed, false);
	b.constructionLeft = 0;
	g.gas = 0;
	assert.match(g.researchStatus("cargo").reason, /50 gazu/);
	assert.equal(g.startResearch("cargo"), false);
	g.gas = 50;
	const money = g.credits;
	assert.equal(g.researchStatus("cargo").allowed, true);
	assert.equal(g.startResearch("cargo"), true);
	assert.equal(g.credits, money - 150);
	assert.equal(g.gas, 0);
	assert.equal(g.researchStatus("cargo").state, "working");
	assert.equal(g.startResearch("cargo"), false);
	b.hp = 0;
	assert.equal(g.researchStatus("cargo").state, "paused");
	assert.match(Tree.node(g, "research:cargo", RTS).reason, /odbuduj/);
	const metal = g.credits;
	g.cancelResearch();
	assert.equal(g.credits, metal + 150);
	assert.equal(g.gas, 50);
	g.upgrades.cargo = true;
	assert.equal(g.researchStatus("cargo").state, "done");
	assert.equal(g.researchStatus("cargo").allowed, false);
});
test("other studies block a second research job and save retains progress", () => {
	const g = ready();
	g.spawn("lab", 0, 700, 700);
	g.startResearch("meteorology");
	g.research.left = 10;
	assert.equal(g.researchStatus("guidance").state, "busy");
	assert.equal(g.researchStatus("meteorology").progress, 0.6);
	const restored = RTS.Game.fromSave(g.serialize());
	assert.deepEqual(
		restored.researchStatus("meteorology"),
		g.researchStatus("meteorology"),
	);
});
test("tree faction prices, exclusive units, producers and population match gameplay", () => {
	const g = ready();
	assert.equal(Tree.node(g, "unit:trooper", RTS).metal, g.cost("trooper"));
	assert.equal(Tree.node(g, "unit:sentinel", RTS).allowed, false);
	assert.ok(
		Tree.groups(g, "army").some((b) => b.leaves.includes("unit:raider")),
	);
	assert.ok(
		!Tree.groups(g, "army").some((b) => b.leaves.includes("unit:sentinel")),
	);
	assert.equal(Tree.node(g, "unit:interceptor", RTS).allowed, false);
	g.spawn("hangar", 0, 800, 800);
	assert.equal(Tree.node(g, "unit:interceptor", RTS).allowed, true);
	const h = g.ready("hangar");
	for (let i = 0; i < 10; i++)
		g.queue.push({
			type: "interceptor",
			producerId: h.id,
			left: 14,
			total: 14,
		});
	assert.match(Tree.node(g, "unit:interceptor", RTS).reason, /pełne/);
	g.queue = [];
	while (g.units(0).length < 60) g.spawn("trooper", 0, 800, 800);
	assert.match(Tree.node(g, "unit:trooper", RTS).reason, /Limit/);
});
test("building placement is unavailable without a worker or after the match ends", () => {
	const g = ready();
	assert.equal(Tree.node(g, "building:reactor", RTS).allowed, true);
	assert.equal(Tree.node(g, "building:hq", RTS).allowed, false);
	for (const e of g.units(0).filter((e) => e.type === "worker")) e.hp = 0;
	assert.match(Tree.node(g, "building:reactor", RTS).reason, /robota/);
	g.result = "defeat";
	assert.equal(g.researchStatus("cargo").allowed, false);
	assert.equal(Tree.node(g, "unit:trooper", RTS).allowed, false);
});
