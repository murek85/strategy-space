// DOW-01 further: patrol and escort orders (patrol-rules.js).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;
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
	g.spawn("hq", 0, 300, 300);
	g.spawn("hq", 1, 2600, 1800);
	return g;
}
const run = (g, seconds, each) => {
	for (let i = 0; i < seconds * 20; i++) {
		g.tick(0.05);
		each?.();
	}
};

test("patrol: the unit goes to the point and back, again and again", () => {
	const g = sandbox(),
		tank = g.spawn("tank", 0, 700, 700);
	assert.equal(g.patrol([tank.id], 1300, 700), 1);
	assert.equal(tank.order.kind, "attackMove");
	assert.ok(tank.patrol);
	let reachedB = 0,
		backAtA = 0;
	run(g, 40, () => {
		if (!reachedB && dist(tank, { x: 1300, y: 700 }) < 45) reachedB = g.time;
		if (reachedB && !backAtA && dist(tank, { x: 700, y: 700 }) < 45) backAtA = g.time;
	});
	assert.ok(reachedB, "reached the far end");
	assert.ok(backAtA > reachedB, "came back to where it stood");
	assert.ok(tank.patrol, "still patrolling");
	assert.equal(tank.order?.kind, "attackMove");
});

test("patrol: fights on the way and then carries on", () => {
	const g = sandbox(),
		tank = g.spawn("tank", 0, 700, 700),
		enemy = g.spawn("trooper", 1, 1000, 760);
	enemy.order = { kind: "hold", x: enemy.x, y: enemy.y };
	g.patrol([tank.id], 1400, 700);
	run(g, 30);
	assert.ok(enemy.hp <= 0, "the enemy met on the route was destroyed");
	assert.ok(tank.patrol && tank.order?.patrol, "the patrol goes on after the fight");
});

test("patrol: another order, stop or hold ends it; workers and too short routes are refused", () => {
	const g = sandbox(),
		tank = g.spawn("tank", 0, 700, 700),
		worker = g.spawn("worker", 0, 760, 700);
	assert.equal(g.patrol([worker.id], 1300, 700), 0, "workers do not patrol");
	assert.equal(g.patrol([tank.id], 720, 710), 0, "a route shorter than the minimum");
	g.patrol([tank.id], 1300, 700);
	g.command([tank.id], 700, 1000);
	run(g, 1);
	assert.equal(tank.patrol, undefined, "a move order ends the patrol");
	g.patrol([tank.id], 1300, 700);
	g.stop([tank.id]);
	run(g, 1);
	assert.equal(tank.patrol, undefined);
	assert.equal(tank.order, null, "stop really stops");
	g.patrol([tank.id], 1300, 700);
	g.hold([tank.id]);
	run(g, 1);
	assert.equal(tank.patrol, undefined);
	assert.equal(tank.order.kind, "hold");
});

test("escort: the units follow the one they guard and keep round it", () => {
	const g = sandbox(),
		vip = g.spawn("transport", 0, 700, 700),
		guards = [g.spawn("tank", 0, 640, 640), g.spawn("trooper", 0, 640, 760)];
	assert.equal(g.escort(guards.map((e) => e.id), vip.id), 2);
	assert.ok(guards.every((e) => e.order.kind === "escort"));
	g.command([vip.id], 1500, 1100);
	run(g, 25);
	assert.ok(dist(vip, { x: 1500, y: 1100 }) < 60, "the escorted transport arrived");
	for (const e of guards) {
		assert.equal(e.order?.kind, "escort", "the escort order stays");
		assert.ok(dist(e, vip) < 110, `${e.type} stays close (${Math.round(dist(e, vip))})`);
	}
});

test("escort: enemies near the guarded one are fought, but not chased beyond the leash", () => {
	const g = sandbox(),
		post = g.spawn("barracks", 0, 900, 900),
		tank = g.spawn("tank", 0, 840, 840),
		enemy = g.spawn("tank", 1, 1120, 900);
	enemy.order = { kind: "hold", x: enemy.x, y: enemy.y };
	g.escort([tank.id], post.id);
	run(g, 25);
	assert.ok(enemy.hp <= 0, "an enemy close to the guarded building is destroyed");
	// A far enemy that runs away: the escort lets it go and comes back.
	const runner = g.spawn("raider", 1, 1100, 900);
	runner.cooldown = 1e9;
	g.as(1, () => g.command([runner.id], 2400, 900));
	let furthest = 0;
	run(g, 20, () => (furthest = Math.max(furthest, dist(tank, post))));
	assert.ok(furthest < RTS.ESCORT.leash + TYPES.tank.range + 80, `kept to the leash (${Math.round(furthest)})`);
	assert.ok(dist(tank, post) < 120, "back by the guarded building");
});

test("escort: ends when the guarded one is destroyed; only own or allied units can be escorted", () => {
	const g = sandbox(),
		vip = g.spawn("transport", 0, 700, 700),
		tank = g.spawn("tank", 0, 640, 640),
		enemy = g.spawn("tank", 1, 2000, 1500);
	assert.equal(g.escort([tank.id], enemy.id), 0, "an enemy cannot be escorted");
	assert.equal(g.escort([tank.id], tank.id), 0, "a unit cannot escort itself");
	g.escort([tank.id], vip.id);
	g.applyDamage(null, vip, vip.hp + 1);
	run(g, 1);
	assert.notEqual(tank.order?.kind, "escort");
});

test("patrol and escort are network commands and survive a save", () => {
	assert.equal(RTS.NET_COMMANDS.patrol, 3);
	assert.equal(RTS.NET_COMMANDS.escort, 2);
	const g = sandbox(),
		tank = g.spawn("tank", 0, 700, 700),
		guard = g.spawn("trooper", 0, 660, 760);
	assert.equal(g.applyCommand(0, "patrol", [[tank.id], 1300, 700]), 1);
	assert.equal(g.applyCommand(0, "escort", [[guard.id], tank.id]), 1);
	const copy = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.deepEqual(copy.get(tank.id).patrol, tank.patrol);
	assert.equal(copy.get(guard.id).order.kind, "escort");
});
