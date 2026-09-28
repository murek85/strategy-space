const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Game, MISSIONS } = require("../engine");
const { CampaignProgress } = require("../campaign");
const advance = (g, s) => {
	for (let t = 0; t < s; t += 1 / 30) g.tick(1 / 30);
};
const peaceful = () => {
	const g = new Game();
	g.entities = g.entities.filter((e) => e.team === 0);
	g.nextWave = 1e9;
	return g;
};
test("power counts finished friendly structures only and technology raises supply", () => {
	const g = new Game();
	assert.deepEqual(g.power, {
		supply: 40,
		demand: 10,
		energy: 0,
		capacity: 0,
		discharge: 0,
		factor: 1,
	});
	const r = g.spawn("reactor", 0, 500, 1300);
	r.constructionLeft = 3;
	g.spawn("lab", 0, 500, 1000);
	g.spawn("factory", 0, 550, 1100);
	assert.equal(g.power.supply, 40);
	assert.equal(g.power.demand, 65);
	r.constructionLeft = 0;
	assert.equal(g.power.supply, 100);
	g.upgrades.efficiency = true;
	assert.equal(g.power.supply, 130);
	r.hp = 0;
	assert.equal(g.power.supply, 40);
	g.spawn("reactor", 1, 1500, 1000);
	assert.equal(g.power.supply, 40);
});
test("shortage slows military production and research but not worker recovery", () => {
	const g = peaceful();
	g.credits = 5000;
	for (let i = 0; i < 5; i++) g.spawn("lab", 0, 1000 + i * 80, 300);
	g.gas = 100;
	g.crystals = 100;
	g.startResearch("efficiency");
	g.enqueue("trooper");
	g.enqueue("worker");
	const research = g.research.left;
	g.tick(1);
	assert.equal(g.power.factor, 0.25);
	assert.equal(g.queue.find((q) => q.type === "trooper").left, 2.75);
	assert.equal(g.queue.find((q) => q.type === "worker").left, 3);
	assert.equal(g.research.left, research - 0.25);
	const r = g.spawn("reactor", 0, 400, 800),
		builder = g.units(0).find((e) => e.type === "worker");
	r.constructionLeft = 1;
	builder.x = 400;
	builder.y = 850;
	g.buildWith([builder.id], r.id);
	g.tick(1);
	assert.equal(r.constructionLeft, 0);
});
test("crystals must be delivered and switching resource orders does not convert cargo", () => {
	const g = peaceful(),
		w = g.units(0).find((e) => e.type === "worker"),
		f = g.crystalFields[0];
	g.stop(
		g
			.units(0)
			.filter((e) => e.type === "worker")
			.map((e) => e.id),
	);
	w.x = f.x;
	w.y = f.y;
	w.cargo = 12;
	w.cargoKind = "ore";
	g.gatherCrystal([w.id], f.id);
	g.workTick(w, 0.01);
	assert.ok(w.order.returning);
	assert.equal(g.crystals, 0);
	const mined = g.mined;
	advance(g, 20);
	assert.ok(g.mined >= mined + 12);
	assert.ok(g.crystals > 0);
	assert.ok(f.amount < 600);
});
test("crystal costs are atomic, lab loss pauses, cancellation refunds three currencies", () => {
	const g = peaceful(),
		lab = g.spawn("lab", 0, 600, 1200);
	g.spawn("reactor", 0, 400, 900);
	g.credits = 500;
	g.gas = 50;
	g.crystals = 44;
	assert.equal(g.startResearch("precision"), false);
	assert.equal(g.credits, 500);
	g.crystals = 45;
	assert.ok(g.startResearch("precision"));
	assert.equal(g.credits, 280);
	assert.equal(g.gas, 0);
	assert.equal(g.crystals, 0);
	advance(g, 2);
	const left = g.research.left;
	lab.hp = 0;
	advance(g, 2);
	assert.equal(g.research.left, left);
	const money = g.credits;
	g.cancelResearch();
	assert.equal(g.credits, money + 220);
	assert.equal(g.gas, 50);
	assert.equal(g.crystals, 45);
});
test("precision applies once to friendly damage and research completes", () => {
	const g = peaceful();
	g.spawn("lab", 0, 600, 1200);
	g.spawn("reactor", 0, 400, 900);
	g.gas = 100;
	g.crystals = 100;
	g.startResearch("precision");
	const a = g.units(0).find((e) => e.type === "trooper"),
		b = g.spawn("tank", 1, 2000, 100);
	const before = g.damage(a, b);
	advance(g, 36);
	assert.ok(g.upgrades.precision);
	assert.ok(Math.abs(g.damage(a, b) - before * 1.15) < 1e-8);
	assert.equal(g.startResearch("precision"), false);
});
test("each mission has distinct playable terrain and connected strategic sites", () => {
	const layouts = [];
	for (const id of Object.keys(MISSIONS)) {
		const g = new Game(42, id);
		assert.equal(g.missionId, id);
		const base = g.hq(0);
		for (const e of g.entities)
			assert.equal(g.blocked(e.x, e.y, 0), false, id + " spawn");
		for (const o of [
			...g.nodes,
			...g.ores,
			...g.gasFields,
			...g.crystalFields,
		]) {
			assert.equal(g.blocked(o.x, o.y, 15), false, id + " resource");
			const path = g.pathTo(base, o);
			assert.ok(path.length, id + " route");
			assert.ok(
				Math.hypot(path.at(-1).x - o.x, path.at(-1).y - o.y) < 2,
				id + " route end",
			);
		}
		layouts.push(JSON.stringify(g.obstacles));
	}
	assert.equal(new Set(layouts.slice(0, 3)).size, 3);
});
test("campaign cannot win before all mission objectives and does not affect skirmishes", () => {
	const g = new Game(42, "colony1");
	g.hq(1).hp = 0;
	g.tick(0.01);
	assert.equal(g.result, null);
	g.nodes[0].owner = 0;
	g.nodes[1].owner = 0;
	const lab = g.spawn("lab", 0, 500, 1300);
	lab.constructionLeft = 3;
	g.spawn("reactor", 0, 400, 800);
	g.tick(0.01);
	assert.equal(g.result, null);
	lab.constructionLeft = 0;
	g.tick(0.01);
	assert.equal(g.result, "victory");
});
test("campaign completion persists separately and rejects defeat or skirmish", () => {
	const values = new Map(),
		storage = {
			getItem: (k) => values.get(k),
			setItem: (k, v) => values.set(k, v),
		};
	const p = new CampaignProgress(storage);
	assert.equal(p.record({ missionId: "horizon", result: "victory" }), false);
	assert.equal(p.record({ missionId: "colony1", result: "defeat" }), false);
	assert.equal(p.record({ missionId: "colony1", result: "victory" }), true);
	assert.equal(new CampaignProgress(storage).completed.colony1, true);
	assert.equal(
		new CampaignProgress({
			getItem() {
				throw Error();
			},
			setItem() {
				throw Error();
			},
		}).record({ missionId: "colony1", result: "victory" }),
		false,
	);
});
test("new map save retains layout, crystal cargo and research costs", () => {
	const g = new Game(42, "frost");
	g.crystals = 70;
	g.gas = 100;
	g.spawn("lab", 0, 800, 400);
	g.startResearch("efficiency");
	const w = g.units(0).find((e) => e.type === "worker");
	w.cargo = 17;
	w.cargoKind = "crystal";
	g.gatherCrystal([w.id], 1);
	const r = Game.fromSave(g.serialize());
	assert.equal(r.missionId, "frost");
	assert.deepEqual(r.obstacles, g.obstacles);
	assert.deepEqual(r.crystalFields, g.crystalFields);
	assert.equal(r.get(w.id).cargoKind, "crystal");
	assert.equal(r.crystals, 40);
	r.cancelResearch();
	assert.equal(r.crystals, 70);
});
test("legacy v4 saves get crystals without losing paid research or occupied sites", () => {
	const g = new Game();
	g.spawn("factory", 0, 500, 1280);
	g.startResearch("weapons");
	const s = g.serialize();
	s.version = 4;
	delete s.crystals;
	delete s.crystalFields;
	delete s.missionId;
	delete s.obstacles;
	const r = Game.fromSave(s);
	assert.equal(r.missionId, "horizon");
	assert.equal(r.crystals, 0);
	assert.equal(r.research.left, s.research.left);
	assert.equal(r.researchBuilding(), "factory");
	assert.equal(r.credits, s.credits);
	assert.ok(r.crystalFields.length);
	assert.throws(() =>
		Game.fromSave({ ...g.serialize(), missionId: "unknown" }),
	);
});

test("solar scenario has its own layout and survives save/load", () => {
	const g = new Game(42, "solar"),
		base = new Game(42, "horizon");
	assert.equal(MISSIONS.solar.sunny, true);
	assert.notDeepEqual(g.obstacles, base.obstacles);
	assert.notDeepEqual(g.waters, base.waters);
	assert.equal(g.waters.length, 3);
	const restored = Game.fromSave(g.serialize());
	assert.equal(restored.missionId, "solar");
	assert.deepEqual(restored.waters, g.waters);
	assert.deepEqual(restored.obstacles, g.obstacles);
});

test("Helion storms ramp up, fade, recur and retain their phase after loading", () => {
	const vm = require("node:vm"),
		fs = require("node:fs"),
		RTS = require("../engine");
	const art = vm.runInNewContext(
		fs.readFileSync(require.resolve("../planet-art.js"), "utf8") +
			";PlanetArt",
		{ RTS },
	);
	const g = new Game(42, "solar");
	for (const [time, value] of [
		[0, 0],
		[90, 0],
		[102, 1],
		[130, 1],
		[145, 0],
		[299, 0],
		[312, 1],
	]) {
		g.time = time;
		assert.equal(art.stormStrength(g), value);
	}
	g.time = 96;
	assert.equal(art.stormStrength(g), 0.5);
	assert.equal(art.stormStrength(Game.fromSave(g.serialize())), 0.5);
	g.missionId = "frost";
	assert.equal(art.stormStrength(g), 0);
});
