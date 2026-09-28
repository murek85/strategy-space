const { test } = require("node:test"),
	assert = require("node:assert/strict"),
	RTS = require("../engine"),
	{ CampaignProgress } = require("../campaign");
function clean() {
	const g = new RTS.Game(42, "training");
	g.entities = [];
	g.obstacles = [];
	g.waters = [];
	g.training = null;
	g.missionId = "solar";
	// A hand-built current game: the reworked Helion layout version, so its saves stay loadable.
	g.mapVersion = RTS.THEMED_MAP_VERSION;
	g.spawn("hq", 0, 400, 400);
	g.credits = 5000;
	g.gas = 500;
	g.crystals = 500;
	return g;
}
test("extraction increases actual ore and crystal yield while depleting equal amount", () => {
	for (const kind of ["ore", "crystal"]) {
		const g = clean(),
			w = g.spawn("worker", 0, 600, 600),
			field = { id: 90, x: 600, y: 600, amount: 100 };
		g[kind === "ore" ? "ores" : "crystalFields"] = [field];
		w.order = { kind: "gather", resource: kind, oreId: 90 };
		g.workTick(w, 0.5);
		assert.equal(w.cargo, 3);
		g.upgrades.extraction = true;
		g.workTick(w, 0.5);
		assert.equal(w.cargo, 6.75);
		assert.equal(field.amount, 93.25);
	}
});
test("assembly improves building work, infantry training changes only infantry speed", () => {
	const g = clean(),
		w = g.spawn("worker", 0, 600, 600),
		b = g.spawn("depot", 0, 630, 600);
	b.constructionLeft = 10;
	w.order = { kind: "build", targetId: b.id };
	g.workTick(w, 1);
	assert.equal(b.constructionLeft, 8.75);
	g.upgrades.assembly = true;
	g.workTick(w, 1);
	assert.equal(b.constructionLeft, 7.1875);
	const t = g.spawn("trooper", 0, 800, 800),
		enemy = g.spawn("trooper", 1, 900, 900),
		before = [
			g.movementFactor(t),
			g.movementFactor(w),
			g.movementFactor(enemy),
		];
	g.upgrades.infantryTraining = true;
	assert.equal(g.movementFactor(t), before[0] * 1.1);
	assert.equal(g.movementFactor(w), before[1]);
	assert.equal(g.movementFactor(enemy), before[2]);
});
test("new technologies enforce colony, share costs and refund and retain completion", () => {
	for (const faction of ["colonies", "dominion"])
		for (const id of ["extraction", "assembly", "infantryTraining"]) {
			const g = clean();
			g.scenario = {
				faction,
				players: 2,
				color: RTS.PLAYER_COLORS[0],
				difficulty: "normal",
				name: "Test",
			};
			g.spawn(RTS.RESEARCH[id].building, 0, 600, 600);
			assert.equal(g.startResearch(id), false);
			g.upgrades.colony = true;
			const before = [g.credits, g.gas, g.crystals];
			assert.ok(g.startResearch(id));
			assert.equal(g.credits, before[0] - RTS.RESEARCH[id].metal);
			assert.equal(g.startResearch(id), false);
			g.cancelResearch();
			assert.deepEqual([g.credits, g.gas, g.crystals], before);
			g.startResearch(id);
			g.research.left = 0.01;
			g.tick(0.1);
			assert.equal(g.upgrades[id], true);
			assert.equal(RTS.Game.fromSave(g.serialize()).upgrades[id], true);
		}
});
test("training advances through reserve outage and workshop, survives save, records victory", () => {
	let g = new RTS.Game(42, "training");
	assert.equal(g.centerLevel(), 1);
	assert.equal(
		g.entities.some((e) => e.team !== 0),
		false,
	);
	g.tick(0.1);
	assert.equal(g.result, null);
	g.credits = 5000;
	g.gas = 500;
	g.crystals = 500;
	g.startResearch("colony");
	g.research.left = 0.01;
	g.tick(0.1);
	assert.equal(g.training.phase, 1);
	for (const [type, x, y] of [
		["depot", 750, 500],
		["lab", 550, 600],
		["reactor", 750, 650],
		["workshop", 800, 850],
		["battery", 680, 850],
	])
		g.spawn(type, 0, x, y);
	for (const id of ["extraction", "assembly", "infantryTraining"]) {
		assert.ok(g.startResearch(id));
		g.research.left = 0.01;
		g.tick(0.1);
	}
	assert.equal(g.training.phase, 2);
	for (let i = 0; i < 240 && g.training.phase === 2; i++) g.tick(0.1);
	assert.equal(g.training.phase, 3);
	assert.equal(g.power.supply, 40);
	for (let i = 0; i < 25; i++) g.tick(0.1);
	g = RTS.Game.fromSave(g.serialize());
	assert.ok(g.training.blackout > 0);
	for (let i = 0; i < 200 && !g.result; i++) g.tick(0.1);
	assert.equal(g.training.phase, 5);
	assert.equal(g.result, "victory");
	assert.ok(g.training.support >= 40);
	assert.ok(g.training.repaired >= 60);
	assert.equal(g.power.supply, 100);
	const storage = {
			getItem() {
				return "{}";
			},
			setItem(k, v) {
				this.data = v;
			},
		},
		progress = new CampaignProgress(storage);
	assert.ok(progress.record(g));
	assert.match(storage.data, /training/);
});
test("insufficient reserve retries safely and invalid training save is rejected", () => {
	const g = new RTS.Game(42, "training");
	g.training.phase = 3;
	g.training.blackout = 0.1;
	g.trainingTick(0.2);
	assert.equal(g.training.phase, 2);
	assert.equal(g.training.blackout, 0);
	const state = g.serialize();
	state.training.phase = 99;
	assert.throws(() => RTS.Game.fromSave(state), /szkolenia/);
});
