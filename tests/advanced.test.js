const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Game, TYPES } = require("../engine");
function sandbox() {
	const g = new Game(42, "solar");
	g.entities = [];
	g.obstacles = [];
	g.waters = [];
	g.nodes = [];
	g.ores = [];
	g.gasFields = [];
	g.crystalFields = [];
	g.nextWave = 99999;
	g.credits = 10000;
	g.spawn("hq", 0, 480, 480);
	g.spawn("hq", 1, 2500, 1700);
	g.spawn("worker", 0, 410, 590);
	g.updateVision();
	return g;
}
test("scenario participants, faction costs and stats survive save", () => {
	for (const faction of ["colonies", "dominion"]) {
		const g = new Game(42, "solar");
		g.configureSkirmish({
			faction,
			players: 4,
			name: "Pilot",
			color: "#72b7ff",
			difficulty: "hard",
		});
		assert.equal(g.enemyBases().length, 3);
		assert.equal(g.hq(0).faction, faction);
		assert.ok(
			faction === "colonies"
				? g.cost("trooper") < TYPES.trooper.cost
				: g.cost("trooper") > TYPES.trooper.cost,
		);
		const r = Game.fromSave(g.serialize());
		assert.deepEqual(r.scenario, g.scenario);
		assert.equal(r.hq(0).hp, g.hq(0).hp);
	}
});
test("drag wall queues consecutive construction and preserves it on load", () => {
	const g = sandbox();
	const worker = g.units(0).find((e) => e.type === "worker");
	assert.ok(
		g.buildWallLine({ x: 576, y: 672 }, { x: 768, y: 672 }, [worker.id]),
	);
	assert.equal(g.entities.filter((e) => e.type === "wall").length, 5);
	assert.equal(worker.builderQueue.length, 4);
	const r = Game.fromSave(g.serialize());
	assert.equal(r.get(worker.id).order.targetId, worker.order.targetId);
	for (let i = 0; i < 500; i++) r.tick(0.15);
	assert.ok(
		r.entities
			.filter((e) => e.type === "wall")
			.every((e) => !e.constructionLeft),
	);
});
test("gate and turret replace wall anchors without overlapping wall pieces", () => {
	const g = sandbox();
	assert.ok(g.buildWallLine({ x: 576, y: 672 }, { x: 768, y: 672 }));
	assert.ok(g.buildStructure("gate", 672, 672));
	assert.ok(
		!g.entities.some((e) => e.type === "wall" && Math.abs(e.x - 672) < 30),
	);
	assert.ok(g.buildStructure("turret", 576, 672));
	assert.ok(!g.entities.some((e) => e.type === "wall" && e.x === 576));
});
test("air production, layer targeting, flight across obstacles and exact refund", () => {
	const g = sandbox();
	g.configureSkirmish({ faction: "dominion" });
	g.spawn("hangar", 0, 650, 460);
	const credits = g.credits;
	assert.ok(g.enqueue("interceptor"));
	assert.equal(g.credits, credits - g.cost("interceptor"));
	assert.ok(g.cancelQueue());
	assert.equal(g.credits, credits);
	const air = g.spawn("interceptor", 0, 800, 800),
		tank = g.spawn("tank", 1, 850, 800);
	assert.equal(g.damage(tank, air), 0);
	assert.ok(g.damage(air, tank) > 0);
	g.obstacles = [{ x: 810, y: 750, w: 80, h: 100 }];
	air.order = { kind: "move", x: 1000, y: 800 };
	air.path = g.pathTo(air, { x: 1000, y: 800 });
	for (let i = 0; i < 50; i++) g.tick(0.05);
	assert.ok(air.x > 910);
});
test("workers defend while constructing", () => {
	const g = sandbox(),
		w = g.units(0).find((e) => e.type === "worker");
	const foe = g.spawn("trooper", 1, w.x + 50, w.y);
	foe.cooldown = 100;
	w.cooldown = 0;
	g.buildStructure("wall", 576, 672, [w.id]);
	g.updateVision();
	const hp = foe.hp;
	g.tick(0.05);
	assert.ok(foe.hp < hp);
});
test("multiple enemy HQs must all fall before victory", () => {
	const g = new Game(42, "solar");
	g.configureSkirmish({ players: 4 });
	const hqs = g.enemyBases(),
		shooter = g.units(0)[0];
	g.applyDamage(shooter, hqs[0], 1e6);
	assert.notEqual(g.result, "victory");
	for (const hq of hqs.slice(1)) g.applyDamage(shooter, hq, 1e6);
	assert.ok(g.result);
});
test("closed gate seals wall and open gate admits traffic", () => {
	const g = sandbox();
	g.buildWallLine({ x: 576, y: 672 }, { x: 768, y: 672 });
	g.buildStructure("gate", 672, 672);
	for (const e of g.entities) e.constructionLeft = 0;
	for (let x = 552; x < 792; x += 4) assert.ok(g.blocked(x, 672, 1));
	const gate = g.entities.find((e) => e.type === "gate");
	assert.ok(g.toggleGate(gate.id));
	assert.equal(g.blocked(672, 672, 14), false);
});
test("free angle and circular walls form continuous lines", () => {
	const g = sandbox(),
		a = { x: 640, y: 580 },
		b = { x: 735, y: 653 };
	const points = g.wallPoints(a, b);
	assert.deepEqual(points.at(-1), b);
	assert.ok(points[1].x % 48 !== 0);
	const circle = g.wallPoints(
		{ x: 600, y: 600, circle: true },
		{ x: 710, y: 600 },
	);
	for (let i = 0; i < circle.length; i++) {
		const p = circle[i],
			q = circle[(i + 1) % circle.length];
		assert.ok(Math.hypot(p.x - q.x, p.y - q.y) <= 48);
		assert.ok(Math.abs(Math.hypot(p.x - 600, p.y - 600) - 110) < 0.001);
	}
});
test("demolition refunds actual paid cost and production without affecting HQ or foes", () => {
	const g = sandbox();
	const b = g.spawn("barracks", 0, 650, 480);
	b.paid = 200;
	g.enqueue("trooper", b.id);
	const money = g.credits;
	assert.equal(g.demolish([b.id, g.hq(0).id, g.hq(1).id]), 1);
	assert.equal(g.credits, money + 100 + TYPES.trooper.cost);
	assert.equal(g.get(b.id), undefined);
	assert.equal(g.queue.length, 0);
	const site = g.spawn("wall", 0, 800, 800);
	site.paid = 45;
	site.constructionLeft = 3;
	const before = g.credits;
	g.demolish([site.id]);
	assert.equal(g.credits, before + 45);
});
test("campaign has unique terrain and routes from landing zone to objectives", () => {
	const scenarios = ["horizon", "solar", "frost", "ember"].map((id) =>
		JSON.stringify(new Game(42, id).obstacles),
	);
	for (const id of ["colony1", "colony2", "colony3"]) {
		const g = new Game(42, id);
		assert.ok(!scenarios.includes(JSON.stringify(g.obstacles)));
		for (const goal of [...g.nodes, g.hq(1)])
			assert.ok(g.pathTo(g.hq(0), goal).length);
		for (const u of g.entities.filter((e) => e.team === 0))
			assert.equal(g.blocked(u.x, u.y, 14), false);
		const r = Game.fromSave(g.serialize());
		assert.deepEqual(r.obstacles, g.obstacles);
	}
});
test("circle can be built and blocks a full perimeter", () => {
	const g = sandbox();
	g.visible.fill(1);
	assert.ok(
		g.buildWallLine({ x: 650, y: 700, circle: true }, { x: 730, y: 700 }),
	);
	const walls = g.entities.filter((e) => e.type === "wall");
	assert.ok(walls.length > 10);
	for (let i = 0; i < 1800; i++) g.tick(0.1);
	assert.ok(walls.every((e) => !e.constructionLeft));
	for (let i = 0; i < 100; i++) {
		const a = (i * Math.PI * 2) / 100;
		assert.ok(g.blocked(650 + Math.cos(a) * 80, 700 + Math.sin(a) * 80, 1));
	}
});
test("corner bases and resource relays work for every scenario and player count", () => {
	for (const mission of ["solar", "horizon", "frost", "ember"])
		for (const players of [2, 3, 4]) {
			const g = new Game(73, mission);
			g.configureSkirmish({ players });
			const bases = g.entities.filter((e) => e.type === "hq");
			assert.equal(bases.length, players);
			for (const b of bases) {
				assert.ok(Math.min(b.x, 3360 - b.x) <= 450);
				assert.ok(Math.min(b.y, 2160 - b.y) <= 450);
				assert.equal(g.blocked(b.x, b.y, 65), false);
				assert.ok(
					g.ores.some((o) => Math.hypot(o.x - b.x, o.y - b.y) < 350),
				);
			}
			assert.ok(g.nodes.length >= 8);
			for (const n of g.nodes) {
				assert.ok(
					[...g.ores, ...g.gasFields, ...g.crystalFields].some(
						(o) => Math.hypot(o.x - n.x, o.y - n.y) <= 151,
					),
				);
				assert.ok(g.pathTo(g.hq(0), n).length);
			}
			const r = Game.fromSave(g.serialize());
			assert.deepEqual(r.nodes, g.nodes);
			assert.equal(r.hq(0).x, g.hq(0).x);
		}
});
