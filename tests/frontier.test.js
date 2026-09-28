const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Game, TYPES, W, H } = require("../engine");
const { CampaignProgress } = require("../campaign");
const advance = (g, n) => {
	for (let i = 0; i < n * 30; i++) g.tick(1 / 30);
};
test("large maps and legacy fog migration preserve explored coordinates", () => {
	assert.equal(W, 3360);
	assert.equal(H, 2160);
	const g = new Game(),
		s = g.serialize();
	s.version = 5;
	s.explored = Array(1925).fill(0);
	s.explored[30 * 55 + 45] = 1;
	s.explored[0] = 1;
	const r = Game.fromSave(s);
	assert.equal(r.explored[30 * (W / 40) + 45], 1);
	assert.equal(r.explored[0], 1);
	assert.equal(r.explored.length, 4536);
	assert.deepEqual(r.waters, []);
	assert.deepEqual(r.entities, s.entities);
});
test("heavy and artillery require a factory, produce sequentially, and refund", () => {
	const g = new Game();
	g.credits = 2000;
	assert.equal(g.enqueue("heavy"), false);
	const f = g.spawn("factory", 0, 510, 1280);
	assert.ok(g.enqueue("heavy"));
	assert.ok(g.enqueue("artillery"));
	assert.equal(g.queue[0].producerId, f.id);
	assert.equal(g.credits, 2000 - 420 - 340);
	g.cancelQueue();
	assert.equal(g.credits, 1580);
	advance(g, 19);
	assert.equal(g.units(0).filter((e) => e.type === "heavy").length, 1);
	assert.equal(g.queue.length, 0);
});
test("walls block movement and pathfinding diverts around completed walls", () => {
	const g = new Game();
	const wall = g.spawn("wall", 0, 550, 900);
	assert.equal(g.blocked(550, 900, 0), true);
	const path = g.pathTo({ x: 450, y: 900 }, { x: 650, y: 900 });
	assert.ok(path.length > 1);
	for (const p of path) assert.equal(g.blocked(p.x, p.y), false);
	wall.hp = 0;
	assert.equal(g.blocked(550, 900, 0), false);
});
test("gates open for traffic, cannot close on units, survive saves", () => {
	const g = new Game(),
		gate = g.spawn("gate", 0, 550, 900);
	assert.ok(g.blocked(550, 900, 0));
	assert.equal(g.toggleGate(gate.id), true);
	assert.equal(g.blocked(550, 900, 0), false);
	const u = g.spawn("tank", 0, 550, 900);
	assert.equal(g.toggleGate(gate.id), false);
	assert.equal(Game.fromSave(g.serialize()).get(gate.id).open, true);
	u.x = 700;
	assert.equal(g.toggleGate(gate.id), true);
	assert.ok(g.blocked(550, 900, 0));
	gate.constructionLeft = 1;
	assert.equal(g.toggleGate(gate.id), false);
});
test("artillery damages nearby hostiles without hitting its escort", () => {
	const g = new Game();
	g.entities = [];
	const a = g.spawn("artillery", 0, 500, 500),
		t = g.spawn("heavy", 1, 800, 500),
		neighbor = g.spawn("heavy", 1, 830, 530),
		escort = g.spawn("tank", 0, 810, 560);
	g.updateVision();
	g.visible.fill(1);
	g.fogTimer = 1;
	a.cooldown = 0;
	t.cooldown = neighbor.cooldown = escort.cooldown = 10;
	g.tick(0.01);
	assert.ok(t.hp < TYPES.heavy.hp);
	assert.ok(neighbor.hp < TYPES.heavy.hp);
	assert.equal(escort.hp, TYPES.tank.hp);
});
test("artillery splash can destroy an HQ and completes victory correctly", () => {
	const g = new Game();
	g.entities = [];
	const a = g.spawn("artillery", 0, 500, 500),
		t = g.spawn("heavy", 1, 800, 500),
		hq = g.spawn("hq", 1, 840, 520);
	hq.hp = 20;
	a.cooldown = 0;
	g.spawn("hq", 0, 200, 200);
	g.updateVision();
	g.visible.fill(1);
	g.fogTimer = 1;
	g.tick(0.01);
	assert.equal(g.result, "victory");
	assert.ok(hq.hp <= 0);
});
test("planet wildlife attacks either army but not its own species", () => {
	for (const team of [0, 1]) {
		const g = new Game();
		g.entities = [];
		const b = g.spawn("beast", 2, 500, 500),
			other = g.spawn("beast", 2, 490, 500),
			u = g.spawn("worker", team, 527, 500);
		b.cooldown = other.cooldown = 0;
		g.tick(0.01);
		assert.ok(u.hp < TYPES.worker.hp);
		assert.equal(b.hp, TYPES.beast.hp);
		assert.equal(other.hp, TYPES.beast.hp);
	}
});
test("lakes block routes and terrain is retained by save roundtrip", () => {
	const g = new Game(),
		w = g.waters[0];
	assert.ok(g.blocked(w.x, w.y));
	const path = g.pathTo(
		{ x: w.x - w.rx - 100, y: w.y },
		{ x: w.x + w.rx + 100, y: w.y },
	);
	assert.ok(path.length > 1);
	for (const p of path) assert.equal(g.blocked(p.x, p.y), false);
	assert.deepEqual(Game.fromSave(g.serialize()).waters, g.waters);
});
test("chapter two and three have distinct achievable prerequisites", () => {
	const g = new Game(42, "colony2");
	g.hq(1).hp = 0;
	g.nodes[0].owner = g.nodes[1].owner = 0;
	g.spawn("depot", 0, 500, 1300);
	g.tick(0.01);
	assert.equal(g.result, null);
	g.spawn("depot", 0, 800, 1300);
	g.tick(0.01);
	assert.equal(g.result, "victory");
	const last = new Game(42, "colony3");
	last.hq(1).hp = 0;
	last.nodes.forEach((n) => (n.owner = 0));
	last.spawn("heavy", 0, 800, 1300);
	last.tick(0.01);
	assert.equal(last.result, null);
	last.spawn("artillery", 0, 900, 1300);
	last.tick(0.01);
	assert.equal(last.result, "victory");
});
test("all campaign chapters persist without erasing completed chapters", () => {
	const entries = new Map(),
		storage = {
			getItem: (k) => entries.get(k),
			setItem: (k, v) => entries.set(k, v),
		};
	for (const id of ["colony1", "colony2", "colony3"])
		assert.ok(
			new CampaignProgress(storage).record({
				missionId: id,
				result: "victory",
			}),
		);
	assert.deepEqual(new CampaignProgress(storage).completed, {
		colony1: true,
		colony2: true,
		colony3: true,
	});
});
test("movement trails stay bounded and disappear while idle", () => {
	const g = new Game();
	g.command([g.units(0)[0].id], 650, 800);
	advance(g, 3);
	assert.ok(g.tracks.length);
	g.entities = g.entities.filter((e) => e.team !== 2);
	g.stop(g.units(0).map((e) => e.id));
	g.nextWave = 999;
	advance(g, 24);
	assert.equal(g.tracks.length, 0);
});
test("construction needs a robot and only progresses while a builder works", () => {
	const g = new Game();
	g.entities = g.entities.filter((e) => e.type !== "worker");
	const metal = g.credits;
	assert.equal(g.buildStructure("turret", 510, 1280), false);
	assert.equal(g.credits, metal);
	const w = g.spawn("worker", 0, 500, 1280);
	assert.equal(g.buildStructure("turret", 560, 1280, [w.id]), true);
	const site = g.entities.find((e) => e.type === "turret" && e.team === 0),
		left = site.constructionLeft;
	w.hp = 0;
	g.tick(2);
	assert.equal(site.constructionLeft, left);
	const replacement = g.spawn("worker", 0, 560, 1320);
	assert.ok(g.buildWith([replacement.id], site.id));
	advance(g, 7);
	assert.equal(site.constructionLeft, 0);
});
test("infantry near terrain and walls receives ranged cover", () => {
	const g = new Game();
	const shooter = g.spawn("trooper", 1, 600, 450),
		open = g.spawn("trooper", 0, 600, 600),
		covered = g.spawn("trooper", 0, 710, 450);
	assert.equal(g.cover(open), false);
	assert.equal(g.cover(covered), true);
	assert.ok(
		Math.abs(g.damage(shooter, covered) - g.damage(shooter, open) * 0.7) <
			1e-8,
	);
	const wall = g.spawn("wall", 0, 900, 900),
		rocket = g.spawn("rocket", 0, 950, 900);
	assert.ok(g.cover(rocket));
	wall.hp = 0;
	assert.equal(g.cover(rocket), false);
});
test("hold position permits fire but prevents pursuit", () => {
	const g = new Game();
	g.entities = [];
	g.nextWave = 1e9;
	const u = g.spawn("trooper", 0, 500, 500),
		far = g.spawn("trooper", 1, 800, 500);
	g.visible.fill(1);
	g.hold([u.id]);
	advance(g, 2);
	assert.equal(u.x, 500);
	assert.equal(u.y, 500);
	assert.equal(far.hp, far.maxHp);
	far.x = 645;
	advance(g, 1);
	assert.equal(u.x, 500);
	assert.ok(far.hp < far.maxHp);
	g.command([u.id], 700, 500);
	assert.equal(u.order.kind, "move");
});
