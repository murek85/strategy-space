const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Game } = require("../engine");
function clean() {
	const g = new Game(42, "solar");
	g.entities = [];
	g.nodes = [];
	g.obstacles = [];
	g.waters = [];
	g.nextWave = 99999;
	g.ores = [];
	g.gasFields = [];
	g.crystalFields = [];
	g.spawn("hq", 0, 400, 400);
	g.spawn("hq", 1, 2900, 1900);
	g.visible.fill(1);
	return g;
}
test("dashboard counts delivered ore/crystals and gas but not purchases or refunds", () => {
	const g = clean();
	g.time = 1.1;
	const w = g.spawn("worker", 0, 430, 400);
	g.ores = [{ id: 1, x: 500, y: 400, amount: 500 }];
	for (const kind of ["ore", "crystal"]) {
		w.cargo = 30;
		w.cargoKind = kind;
		w.order = {
			kind: "gather",
			resource: kind,
			oreId: 1,
			returning: true,
			depotId: g.hq(0).id,
		};
		g.workTick(w, 0.1);
	}
	const field = { id: 1, x: 600, y: 400, amount: 500 };
	g.gasFields = [field];
	const b = g.spawn("extractor", 0, 600, 400);
	b.gasId = 1;
	w.x = 610;
	w.order = { kind: "gas", extractorId: b.id };
	g.workTick(w, 0.1);
	g.time = 2.1;
	const before = g.economyReport();
	assert.equal(before.rates.metal, 900);
	assert.equal(before.rates.crystals, 900);
	assert.equal(before.rates.gas, 6);
	g.credits = 10000;
	g.enqueue("worker");
	g.cancelQueue();
	assert.deepEqual(g.economyReport().rates, before.rates);
});
test("rolling income is bounded, expires and does not change while game time is paused", () => {
	const g = clean();
	for (let s = 0; s < 130; s++) {
		g.time = s + 0.5;
		g.recordIncome("passive", 8);
		g.recordIncome("gas", 2);
	}
	g.time = 130;
	const r = g.economyReport();
	assert.equal(r.seconds, 60);
	assert.equal(r.rates.metal, 480);
	assert.equal(r.rates.passive, 480);
	assert.equal(r.rates.gas, 120);
	assert.ok(g.economyHistory.length <= 61);
	assert.deepEqual(g.economyReport(), r);
	g.time = 191;
	assert.equal(g.economyReport().rates.metal, 0);
});
test("statistics survive saves and old saves start a fresh measurement window", () => {
	const g = clean();
	g.time = 10.2;
	g.recordIncome("metal", 30);
	g.time = 12;
	const state = g.serialize();
	assert.deepEqual(
		Game.fromSave(state).economyReport().rates,
		g.economyReport().rates,
	);
	delete state.economyHistory;
	delete state.economySince;
	const old = Game.fromSave(state);
	assert.equal(old.economySince, 12);
	assert.equal(old.economyReport().seconds, 0);
	const broken = g.serialize();
	broken.economyHistory[0].gas = -1;
	assert.throws(() => Game.fromSave(broken), /historia/);
});
test("worker categories count each robot once and warnings respect visibility", () => {
	const g = clean(),
		orders = [
			null,
			{ kind: "gather", oreId: 1 },
			{ kind: "gather", resource: "crystal", oreId: 1 },
			{ kind: "gas" },
			{ kind: "build" },
			{ kind: "repair" },
			{ kind: "move" },
		];
	for (const order of orders) {
		const e = g.spawn("worker", 0, 500, 400);
		e.order = order;
	}
	g.ores = [
		{ id: 1, x: 550, y: 400, amount: 20 },
		{ id: 2, x: 3000, y: 1800, amount: 1 },
	];
	g.crystalFields = [{ id: 1, x: 600, y: 400, amount: 500 }];
	g.isVisible = (x) => x < 1000;
	for (let i = 0; i < 3; i++) g.spawn("factory", 0, 500 + i * 80, 600);
	const r = g.economyReport();
	assert.equal(r.workers, 7);
	assert.ok(Object.values(r.roles).every((ids) => ids.length === 1));
	assert.equal(r.deposits.length, 2);
	assert.ok(r.alerts.some((a) => a.severity === "danger"));
	assert.ok(r.alerts.some((a) => a.text.includes("kończące")));
	assert.ok(!r.deposits.some((d) => d.x === 3000));
});
test("unmanned extractors and distant deposits produce actionable warnings", () => {
	const g = clean();
	g.ores = [{ id: 1, x: 1200, y: 400, amount: 500 }];
	g.gasFields = [{ id: 1, x: 650, y: 400, amount: 500 }];
	const e = g.spawn("extractor", 0, 650, 400);
	e.gasId = 1;
	const w = g.spawn("worker", 0, 1200, 400);
	w.order = { kind: "gather", oreId: 1 };
	const r = g.economyReport();
	assert.ok(r.alerts.some((a) => a.text.includes("daleki")));
	assert.ok(r.alerts.some((a) => a.text.includes("operatora")));
	assert.ok(r.alerts.every((a) => Number.isFinite(a.x)));
});
