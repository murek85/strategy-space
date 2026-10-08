// WAL-01: rocks block direct fire (engine.js lineOfFire).
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
	g.spawn("hq", 0, 300, 300);
	g.spawn("hq", 1, 2600, 1800);
	return g;
}
const run = (g, seconds) => {
	for (let i = 0; i < seconds * 20; i++) g.tick(0.05);
};
// A shooter and a target on one line with a rock square between them, both holding their ground.
function duel(shooterTeam) {
	const g = sandbox(),
		range = TYPES.tank.range,
		shooter = g.spawn("tank", shooterTeam, 900, 800),
		target = g.spawn("tank", 1 - shooterTeam, 900 + range - 30, 800);
	g.obstacles = [{ x: 900 + 60, y: 700, w: range - 150, h: 200 }];
	for (const u of [shooter, target]) u.order = { kind: "hold", x: u.x, y: u.y };
	target.cooldown = 1e9;
	g.updateVision();
	return { g, shooter, target };
}

test("a target behind a rock takes no damage from direct fire", () => {
	const { g, shooter, target } = duel(0);
	assert.equal(g.lineOfFire(shooter, target), false);
	const hp = target.hp;
	run(g, 3);
	assert.equal(target.hp, hp);
});

test("ordered to attack, the unit goes round the rock and then fires", () => {
	const { g, shooter, target } = duel(0);
	const hp = target.hp,
		told = [];
	const notify = g.notify.bind(g);
	g.notify = (text, sound) => (told.push(text), notify(text, sound));
	shooter.order = { kind: "attack", targetId: target.id };
	shooter.path = [];
	run(g, 25);
	assert.ok(target.hp < hp, "no damage after going round");
	assert.equal(g.lineOfFire(shooter, target), true);
	// The player was told why it did not fire at once — once, not every tick.
	assert.equal(told.filter((t) => /skałą/.test(t)).length, 1, told.join(" | "));
});

test("the same for the enemy: its shots do not pass the rock either", () => {
	const { g, shooter, target } = duel(1);
	const hp = target.hp;
	run(g, 3);
	assert.equal(target.hp, hp);
});

test("indirect fire, aircraft, other obstacles and a grazing shot are not blocked", () => {
	const g = sandbox(),
		target = g.spawn("tank", 1, 1300, 800);
	g.obstacles = [{ x: 1000, y: 700, w: 200, h: 200 }];
	assert.equal(g.lineOfFire(g.spawn("tank", 0, 900, 800), target), false);
	assert.equal(g.lineOfFire(g.spawn("artillery", 0, 900, 800), target), true);
	assert.equal(g.lineOfFire(g.spawn("interceptor", 0, 900, 800), target), true);
	assert.equal(g.lineOfFire(g.spawn("tank", 0, 900, 800), g.spawn("interceptor", 1, 1300, 800)), true);
	// A shot along the rock's edge (inside the 12-unit margin) passes.
	assert.equal(g.lineOfFire(g.spawn("tank", 0, 900, 705), g.spawn("tank", 1, 1300, 705)), true);
	// Only rocks block: a wreck or a grove does not.
	g.obstacles = [{ x: 1000, y: 700, w: 200, h: 200, kind: "wreck" }];
	assert.equal(g.lineOfFire(g.spawn("tank", 0, 900, 800), target), true);
	g.obstacles = [{ x: 1000, y: 700, w: 200, h: 200, kind: "mesa" }];
	assert.equal(g.lineOfFire(g.spawn("tank", 0, 900, 800), target), false);
});

test("holding its ground, a unit fires at a target in the clear rather than the nearer one behind a rock", () => {
	const g = sandbox(),
		range = TYPES.tank.range,
		shooter = g.spawn("tank", 0, 900, 800),
		hidden = g.spawn("tank", 1, 900 + range - 60, 800),
		open = g.spawn("tank", 1, 900, 800 + range - 30);
	g.obstacles = [{ x: 960, y: 740, w: range - 160, h: 120 }];
	shooter.order = { kind: "hold", x: shooter.x, y: shooter.y };
	for (const u of [hidden, open]) {
		u.order = { kind: "hold", x: u.x, y: u.y };
		u.cooldown = 1e9;
	}
	g.updateVision();
	const a = hidden.hp,
		b = open.hp;
	run(g, 3);
	assert.equal(hidden.hp, a);
	assert.ok(open.hp < b);
});

test("ground units passing a rock's corner never stop there (routes keep the unit's own margin)", () => {
	const o = { x: 930, y: 690, w: 100, h: 220 },
		cx = o.x + o.w / 2,
		cy = o.y + o.h / 2,
		stuck = [];
	for (const type of ["tank", "heavy", "artillery", "trooper"])
		for (let k = 0; k < 12; k++) {
			const g = sandbox(),
				angle = (k * Math.PI) / 6 + 0.07,
				to = { x: cx - Math.cos(angle) * 190, y: cy - Math.sin(angle) * 190 };
			g.obstacles = [o];
			const u = g.spawn(type, 0, cx + Math.cos(angle) * 190, cy + Math.sin(angle) * 190);
			g.command([u.id], to.x, to.y);
			run(g, 20);
			if (Math.hypot(u.x - to.x, u.y - to.y) > 40) stuck.push(`${type}@${k}: ${u.x.toFixed(0)},${u.y.toFixed(0)}`);
		}
	// The reported case: a tank going for a target behind the rock.
	const g = sandbox(),
		tank = g.spawn("tank", 0, 900, 800),
		foe = g.spawn("tank", 1, 1080, 800);
	g.obstacles = [o];
	foe.order = { kind: "hold", x: foe.x, y: foe.y };
	foe.cooldown = 1e9;
	g.command([tank.id], foe.x, foe.y, foe.id);
	run(g, 20);
	if (!g.lineOfFire(tank, foe)) stuck.push(`attack: ${tank.x.toFixed(0)},${tank.y.toFixed(0)}`);
	assert.deepEqual(stuck, []);
	// Every segment of a route is clear with the unit's own margin.
	const route = g.pathTo({ type: "heavy", x: 900, y: 940 }, { x: 820, y: 690 });
	let prev = { x: 900, y: 940 };
	for (const p of route) {
		assert.ok(g.clearLine(prev, p, TYPES.heavy.radius + 2), JSON.stringify(route));
		prev = p;
	}
});
