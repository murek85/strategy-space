const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Game, TYPES, dist } = require("../engine.js");
function advance(game, seconds) {
	for (let i = 0; i < seconds * 30; i++) game.tick(1 / 30);
}

test("production charges once and creates the queued unit", () => {
	const g = new Game();
	const before = g.units(0).length;
	g.spawn("factory", 0, 520, 1260);
	assert.equal(g.enqueue("tank"), true);
	assert.equal(g.credits, 220);
	advance(g, 8);
	assert.equal(g.units(0).length, before + 1);
	assert.equal(g.queue.length, 0);
	g.credits = 0;
	assert.equal(g.enqueue("tank"), false);
	assert.equal(g.credits, 0);
});
test("route avoids blocked terrain and units reach the destination", () => {
	const g = new Game();
	const u = g.units(0)[0];
	u.x = 300;
	u.y = 650;
	const dest = { x: 650, y: 650 };
	const route = g.pathTo(u, dest);
	assert.ok(route.length > 1);
	let prev = u;
	for (const step of route) {
		assert.ok(g.clearLine(prev, step));
		prev = step;
	}
	g.command([u.id], dest.x, dest.y);
	advance(g, 20);
	assert.ok(dist(u, dest) < 15);
});
test("friendly presence captures a relay and increases income", () => {
	const g = new Game();
	const n = g.nodes[0];
	const u = g.units(0)[0];
	u.x = n.x;
	u.y = n.y;
	advance(g, 8);
	assert.equal(n.owner, 0);
	assert.equal(g.income, 13);
});
test("contested relay does not capture", () => {
	const g = new Game();
	const n = g.nodes[0];
	g.entities = [];
	g.spawn("trooper", 0, n.x - 80, n.y);
	g.spawn("trooper", 1, n.x + 80, n.y);
	g.entities.forEach((e) => {
		e.cooldown = 100;
	});
	advance(g, 5);
	assert.equal(n.owner, -1);
});
test("building validates range, collision, and credits", () => {
	const g = new Game();
	const credits = g.credits;
	assert.equal(g.buildTurret(2000, 1000), false);
	assert.equal(g.credits, credits);
	assert.equal(g.buildTurret(270, 1130), false);
	assert.equal(g.buildTurret(320, 850), true);
	assert.equal(g.credits, credits - 150);
});
test("rockets counter armor, tanks counter infantry", () => {
	const g = new Game();
	assert.ok(
		g.damage({ type: "rocket" }, { type: "tank" }) >
			g.damage({ type: "rocket" }, { type: "trooper" }),
	);
	assert.ok(
		g.damage({ type: "tank" }, { type: "trooper" }) > TYPES.tank.damage,
	);
});
test("destroying enemy HQ wins and freezes simulation", () => {
	const g = new Game();
	const base = g.hq(1);
	base.hp = 1;
	const u = g.spawn("rocket", 0, base.x - 130, base.y);
	u.cooldown = 0;
	g.command([u.id], base.x, base.y, base.id);
	advance(g, 1);
	assert.equal(g.result, "victory");
	const time = g.time;
	advance(g, 5);
	assert.equal(g.time, time);
});
test("enemy waves deploy and eventually defeat an undefended base", () => {
	const g = new Game();
	g.entities = g.entities.filter((e) => e.type === "hq");
	advance(g, 66);
	assert.equal(g.wave, 1);
	assert.ok(g.units(1).length >= 5);
	advance(g, 600);
	assert.equal(g.result, "defeat");
});

test("workers carry finite ore back to base and stop on depleted deposit", () => {
	const g = new Game();
	const ore = g.ores[0];
	ore.amount = 60;
	advance(g, 35);
	assert.equal(ore.amount, 0);
	assert.equal(g.mined, 60);
	assert.equal(
		g
			.units(0)
			.filter((e) => e.type === "worker")
			.reduce((s, e) => s + e.cargo, 0),
		0,
	);
	assert.equal(
		g
			.units(0)
			.filter((e) => e.type === "worker" && e.order?.kind === "gather")
			.length,
		0,
	);
});
test("factory construction unlocks tanks only on completion", () => {
	const g = new Game();
	assert.equal(g.enqueue("tank"), false);
	assert.equal(g.buildStructure("factory", 510, 1280), false);
	g.upgrades.colony = true;
	assert.equal(g.buildStructure("factory", 510, 1280), true);
	assert.equal(g.enqueue("tank"), false);
	advance(g, 19);
	assert.ok(g.ready("factory"));
	assert.equal(g.enqueue("tank"), true);
});
test("losing production building stalls queue and cancellation refunds cost", () => {
	const g = new Game();
	assert.equal(g.enqueue("trooper"), true);
	g.ready("barracks").hp = 0;
	const remaining = g.queue[0].left;
	advance(g, 4);
	assert.equal(g.queue[0].left, remaining);
	const credits = g.credits;
	assert.equal(g.cancelQueue(), true);
	assert.equal(g.credits, credits + 60);
	assert.equal(g.queue.length, 0);
});
test("vision reveals nearby enemies and retains explored terrain after leaving", () => {
	const g = new Game();
	assert.equal(g.isVisible(1940, 250), false);
	const u = g.units(0)[0];
	u.x = 1940;
	u.y = 250;
	g.updateVision();
	assert.equal(g.isVisible(1940, 250), true);
	u.x = 270;
	u.y = 1130;
	g.updateVision();
	assert.equal(g.isVisible(1940, 250), false);
	assert.equal(g.explored[g.visionIndex(1940, 250)], 1);
});
test("worker repairs consume metal and stop at max health", () => {
	const g = new Game();
	const worker = g.units(0).find((e) => e.type === "worker"),
		base = g.hq(0);
	base.hp -= 100;
	worker.x = base.x + 85;
	worker.y = base.y;
	assert.equal(g.repair([worker.id], base.id), true);
	const hp = base.hp;
	advance(g, 5);
	assert.ok(base.hp > hp);
	assert.equal(base.hp, base.maxHp);
});
test("research finishes once and modifies combat damage", () => {
	const g = new Game();
	g.spawn("factory", 0, 510, 1280);
	g.credits = 1000;
	const attacker = { type: "trooper", team: 0 },
		target = { type: "trooper", team: 1 };
	const damage = g.damage(attacker, target);
	assert.equal(g.startResearch("weapons"), true);
	assert.equal(g.startResearch("armor"), false);
	advance(g, 26);
	assert.equal(g.upgrades.weapons, true);
	assert.equal(g.damage(attacker, target), damage * 1.25);
	assert.equal(g.startResearch("weapons"), false);
});
test("save round trip preserves economy, orders, queue and construction", () => {
	const g = new Game();
	g.buildStructure("factory", 510, 1280);
	g.enqueue("trooper");
	advance(g, 2);
	const saved = g.serialize(),
		loaded = Game.fromSave(saved);
	assert.deepEqual(loaded.serialize(), saved);
	advance(g, 8);
	advance(loaded, 8);
	assert.deepEqual(loaded.serialize(), g.serialize());
	assert.throws(() => Game.fromSave({ version: 1 }));
});

test("two barracks produce simultaneously while one remains sequential", () => {
	const g = new Game();
	g.credits = 2000;
	const a = g.ready("barracks"),
		b = g.spawn("barracks", 0, 510, 1280);
	const before = g.units(0).length;
	g.enqueue("trooper", a.id);
	g.enqueue("trooper", a.id);
	g.enqueue("trooper", b.id);
	advance(g, 3.1);
	assert.equal(g.units(0).length, before + 2);
	assert.equal(g.buildingQueue(a.id).length, 1);
	assert.equal(g.buildingQueue(b.id).length, 0);
	advance(g, 3.1);
	assert.equal(g.units(0).length, before + 3);
});
test("automatic production distributes load and explicit producer is honored", () => {
	const g = new Game();
	g.credits = 5000;
	const a = g.ready("barracks"),
		b = g.spawn("barracks", 0, 510, 1280);
	g.enqueue("rocket");
	g.enqueue("rocket");
	assert.deepEqual(
		g.queue.map((q) => q.producerId),
		[a.id, b.id],
	);
	g.enqueue("trooper", a.id);
	assert.equal(g.queue.at(-1).producerId, a.id);
	assert.equal(g.enqueue("tank", a.id), false);
});
test("per-building limit does not block another building and cancel is scoped", () => {
	const g = new Game();
	g.credits = 5000;
	const a = g.ready("barracks"),
		b = g.spawn("barracks", 0, 510, 1280);
	for (let i = 0; i < 10; i++) assert.equal(g.enqueue("trooper", a.id), true);
	assert.equal(g.enqueue("trooper", a.id), false);
	assert.equal(g.enqueue("trooper", b.id), true);
	const credits = g.credits;
	g.cancelQueue(a.id);
	assert.equal(g.credits, credits + 60);
	assert.equal(g.buildingQueue(a.id).length, 9);
	assert.equal(g.buildingQueue(b.id).length, 1);
});
test("new recruits follow the rally point and blocked rally is corrected", () => {
	const g = new Game();
	const b = g.ready("barracks");
	const oldIds = new Set(g.entities.map((e) => e.id));
	assert.equal(g.setRally([b.id], 610, 960), 1);
	g.enqueue("trooper", b.id);
	advance(g, 3.1);
	const recruit = g.entities.find((e) => !oldIds.has(e.id));
	assert.equal(recruit.order.x, 610);
	assert.equal(recruit.order.y, 960);
	advance(g, 8);
	assert.ok(dist(recruit, { x: 610, y: 960 }) < 35);
	g.setRally([b.id], 450, 650);
	assert.equal(g.blocked(b.rally.x, b.rally.y), false);
});
test("groups deduplicate, append and filter enemy, buildings and dead units", () => {
	const g = new Game();
	const [a, b] = g.units(0),
		enemy = g.units(1)[0];
	assert.deepEqual(g.assignGroup(1, [a.id, a.id, enemy.id, g.hq(0).id]), [
		a.id,
	]);
	assert.deepEqual(g.assignGroup(1, [b.id], true), [a.id, b.id]);
	a.hp = 0;
	assert.deepEqual(g.recallGroup(1), [b.id]);
	g.assignGroup(1, []);
	assert.deepEqual(g.recallGroup(1), []);
});
test("attacks on structures raise an actionable alarm without toast spam", () => {
	const g = new Game();
	const b = g.hq(0);
	g.reportAttack(b);
	g.reportAttack(b);
	assert.equal(g.baseAlert.x, b.x);
	assert.equal(
		g.events.filter((e) => e.includes("BAZA ATAKOWANA")).length,
		1,
	);
	g.time = 11;
	g.reportAttack(b);
	assert.equal(
		g.events.filter((e) => e.includes("BAZA ATAKOWANA")).length,
		2,
	);
	const previous = g.baseAlert;
	g.reportAttack(g.units(0)[0]);
	assert.equal(g.baseAlert, previous);
});
test("version 2 save migrates queue, version 3 retains groups and rally points", () => {
	const g = new Game();
	g.enqueue("trooper");
	const legacy = g.serialize();
	legacy.version = 2;
	delete legacy.groups;
	delete legacy.baseAlert;
	delete legacy.nextAlertAt;
	legacy.queue.forEach((q) => delete q.producerId);
	legacy.entities.forEach((e) => delete e.rally);
	const loaded = Game.fromSave(legacy);
	assert.equal(loaded.queue.length, 1);
	assert.equal(loaded.queue[0].producerId, loaded.ready("barracks").id);
	loaded.assignGroup(2, [loaded.units(0)[0].id]);
	loaded.setRally([loaded.ready("barracks").id], 610, 960);
	const restored = Game.fromSave(loaded.serialize());
	assert.deepEqual(restored.serialize(), loaded.serialize());
});

test("combat raises base alarm on an actual enemy hit", () => {
	const g = new Game(),
		base = g.hq(0);
	g.entities = [base];
	const attacker = g.spawn("rocket", 1, base.x + 150, base.y);
	attacker.cooldown = 0;
	advance(g, 0.1);
	assert.ok(base.hp < base.maxHp);
	assert.equal(g.baseAlert.name, "Centrum dowodzenia");
	assert.equal(g.baseAlert.x, base.x);
});
test("destroyed producer transfers paid work without blocking other queues", () => {
	const g = new Game();
	g.credits = 1000;
	const a = g.ready("barracks"),
		b = g.spawn("barracks", 0, 510, 1280);
	g.enqueue("trooper", a.id);
	g.enqueue("rocket", b.id);
	advance(g, 1);
	const remaining = g.buildingQueue(a.id)[0].left;
	a.hp = 0;
	advance(g, 0.1);
	assert.equal(
		g.queue.every((q) => q.producerId === b.id),
		true,
	);
	assert.ok(g.queue[0].left <= remaining);
	assert.ok(g.queue[1].left < 5);
});

test("a goal next to an obstacle is reachable even when its path cell touches the obstacle margin", () => {
	const g = new Game(42, "horizon");
	g.obstacles = [{ x: 1200, y: 1005, w: 200, h: 150 }];
	g.waters = [];
	const goal = { x: 1164, y: 1128 },
		worker = g.spawn("worker", 0, 1607, 1500);
	assert.ok(!g.blocked(goal.x, goal.y));
	const path = g.pathTo(worker, goal);
	assert.ok(path.length > 0);
	assert.ok(Math.hypot(path.at(-1).x - goal.x, path.at(-1).y - goal.y) < 1);
});

test("a worker without a route does not search again every frame and gives up with a message", () => {
	const g = new Game(42, "horizon"),
		worker = g.spawn("worker", 0, 600, 600),
		site = g.spawn("turret", 0, 1500, 1000);
	site.constructionLeft = 8;
	let searches = 0;
	g.pathTo = () => (searches++, []);
	worker.order = { kind: "build", targetId: site.id };
	worker.path = [];
	for (let i = 0; i < 30; i++) g.moveWorker(worker, site, 1 / 30, 40);
	assert.equal(searches, 1, "one search per repath interval");
	for (let i = 0; i < 30 * 6 && worker.order; i++) {
		worker.repath -= 1 / 30;
		g.moveWorker(worker, site, 1 / 30, 40);
	}
	assert.equal(worker.order, null);
	assert.ok(g.events.some((m) => /nie może dotrzeć/.test(m)));
});
