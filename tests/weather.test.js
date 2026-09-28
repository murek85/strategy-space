const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Game } = require("../engine");
test("planet weather and day/night derive from saved simulation time", () => {
	for (const [mission, kind] of [
		["solar", "sand"],
		["horizon", "sand"],
		["frost", "snow"],
		["ember", "rain"],
	]) {
		const g = new Game(42, mission);
		assert.equal(g.weather.kind, kind);
		assert.equal(g.night, 0);
		g.time = 110;
		assert.equal(g.weather.intensity, 1);
		assert.ok(g.night > 0.8);
		const restored = Game.fromSave(g.serialize());
		assert.deepEqual(restored.weather, g.weather);
		assert.equal(restored.night, g.night);
		g.time = 360;
		assert.equal(g.night, 0);
	}
});
test("weather slows actual worker and army movement; mobility recovers 75 percent of penalty", () => {
	for (const type of ["worker", "trooper"]) {
		const run = (upgrade) => {
			const g = new Game(42, "frost");
			g.entities = [];
			g.obstacles = [];
			g.waters = [];
			g.nextWave = 999;
			g.time = 110;
			g.upgrades.mobility = upgrade;
			const u = g.spawn(type, 0, 500, 500);
			u.order = { kind: "move", x: 700, y: 500 };
			u.path = [{ x: 700, y: 500 }];
			g.tick(0.1);
			return u.x - 500;
		};
		const slow = run(false),
			fast = run(true);
		assert.ok(slow > 0);
		assert.ok(fast > slow);
		assert.ok(Math.abs(fast / slow - 0.9125 / 0.65) < 0.001);
	}
});
test("bad weather causes real misses; guidance helps player but not enemy or melee", () => {
	const run = (upgrade) => {
		const g = new Game(42, "ember");
		g.entities = [];
		g.time = 110;
		g.nextWave = 999;
		g.upgrades.guidance = upgrade;
		g.rand = () => 0.8;
		const a = g.spawn("trooper", 0, 500, 500),
			b = g.spawn("trooper", 1, 560, 500);
		a.order = { kind: "hold", x: 500, y: 500 };
		a.target = b.id;
		a.cooldown = 0;
		b.cooldown = 10;
		g.updateVision();
		g.tick(0.01);
		return { hp: b.hp, g, a, b };
	};
	const missed = run(false),
		hit = run(true);
	assert.equal(missed.hp, 100);
	assert.ok(hit.hp < 100);
	assert.equal(hit.g.accuracy(hit.b), 0.7);
	assert.equal(hit.g.accuracy({ type: "beast", team: 2 }), 1);
});
test("lab weather research costs, completion, forecast and warning survive load", () => {
	const g = new Game(42, "solar");
	g.credits = 2000;
	g.gas = 500;
	g.crystals = 500;
	assert.equal(g.startResearch("meteorology"), false);
	g.spawn("lab", 0, 800, 400);
	assert.equal(g.startResearch("meteorology"), true);
	g.research.left = 0.01;
	g.tick(0.1);
	assert.equal(g.upgrades.meteorology, true);
	g.time = 60;
	g.nextWave = 999;
	g.events = [];
	g.tick(0.1);
	assert.equal(
		g.events.filter((e) => e.startsWith("OSTRZEŻENIE:")).length,
		1,
	);
	const r = Game.fromSave(g.serialize());
	r.tick(0.1);
	assert.ok(!r.events.some((e) => e.startsWith("OSTRZEŻENIE:")));
	assert.ok(r.forecast);
	r.entities = r.entities.filter((e) => e.type !== "lab");
	assert.equal(r.forecast, null);
	for (const kind of ["guidance", "mobility"]) {
		const t = new Game();
		t.credits = 2000;
		t.gas = 500;
		t.crystals = 500;
		t.spawn("lab", 0, 800, 400);
		assert.ok(t.startResearch(kind));
		t.research.left = 0.01;
		t.tick(0.1);
		assert.equal(t.upgrades[kind], true);
		assert.equal(Game.fromSave(t.serialize()).upgrades[kind], true);
	}
});
