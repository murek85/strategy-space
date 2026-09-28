const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES } = RTS;
const skirmish = (opts = {}) => {
	const g = new Game(42, "horizon");
	g.configureSkirmish({ enemy: "waves", ...opts });
	g.nextWave = 1e9;
	return g;
};
const kinds = (g) => g.effects.map((e) => e.kind);

test("heavy blasts leave craters that last, survive a save and fade away", () => {
	const g = skirmish();
	let spot = null;
	for (let y = 300; y < g.H - 300 && !spot; y += 40)
		for (let x = 300; x < g.W - 300 && !spot; x += 40) if (!g.blocked(x, y, 0) && !g.blocked(x + 100, y, 0)) spot = { x, y };
	g.effects.push({ kind: "explosion", ...spot, size: 30, life: 0.5, maxLife: 0.5 });
	g.effects.push({ kind: "explosion", x: spot.x + 100, y: spot.y, size: 80, life: 0.5, maxLife: 0.5 });
	g.tick(1 / 30);
	assert.equal(g.craters.length, 1, "only a heavy blast");
	assert.ok(g.craters[0].size > 0 && g.craters[0].size <= 40);
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.deepEqual(back.craters, g.craters);
	g.time += RTS.CRATER_LIFE + 1;
	g.tick(1 / 30);
	assert.equal(g.craters.length, 0);
	const broken = g.serialize();
	broken.craters = [{ x: "a" }];
	assert.deepEqual(Game.fromSave(broken).craters, []);
});

test("new mechanics show their effects", () => {
	const g = skirmish(),
		hq = g.hq(0),
		x = hq.x + 250,
		y = hq.y - 250;
	// Shield hit.
	const gen = g.spawn("shieldgen", 0, x, y);
	gen.shield = 700;
	const turret = g.spawn("turret", 0, x + 60, y),
		enemy = g.spawn("tank", 1, x + 250, y);
	g.applyDamage(enemy, turret, 20);
	assert.ok(kinds(g).includes("shieldHit"));
	g.applyDamage(enemy, turret, 20);
	assert.equal(kinds(g).filter((k) => k === "shieldHit").length, 1, "throttled");
	// Healing.
	g.effects = [];
	g.spawn("medbay", 0, x - 200, y);
	const wounded = g.spawn("trooper", 0, x - 150, y + 40);
	wounded.hp = 20;
	g.supportTick(1 / 30);
	assert.ok(kinds(g).includes("heal"));
	// Module fitting.
	g.effects = [];
	const barracks = g.entities.find((e) => e.team === 0 && e.type === "barracks");
	barracks.module = "rapid";
	barracks.moduleLeft = 5;
	g.supportTick(1 / 30);
	assert.ok(kinds(g).includes("sparks"));
	// Mining dust.
	g.effects = [];
	const worker = g.units(0).find((e) => e.type === "worker"),
		ore = g.ores[0];
	worker.x = ore.x + 30;
	worker.y = ore.y;
	g.gather([worker.id], ore.id);
	for (let i = 0; i < 20; i++) g.workTick(worker, 1 / 30);
	assert.ok(kinds(g).includes("dust"));
});

test("storm outlook: direction per storm, 20 s warning, 60 s with monitoring", () => {
	const g = skirmish();
	const first = g.stormOutlook;
	assert.ok(!first.near && first.until > 20);
	assert.equal(g.stormFront(0).from, g.stormFront(0).from, "stable");
	const dirs = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((c) => g.stormFront(c).from));
	assert.ok(dirs.size > 1, "storms come from different sides");
	g.time = 90 - 15;
	const near = g.stormOutlook;
	assert.ok(near.near && near.lead === 20 && Math.abs(near.until - 15) < 1e-6);
	assert.equal(near.from, g.stormFront(0).from);
	g.tick(1 / 30);
	assert.ok(g.events.some((m) => m.startsWith("Nadciąga") && m.includes(near.from)));
	// Weather monitoring: a minute of warning.
	const h = skirmish();
	h.upgrades.meteorology = true;
	h.spawn("lab", 0, h.hq(0).x + 200, h.hq(0).y - 200);
	h.time = 90 - 50;
	assert.ok(h.stormOutlook.near && h.stormOutlook.lead === 60);
	// While the storm arrives the front sweeps in over 12 s.
	g.time = 90 + 6;
	assert.ok(g.stormOutlook.arriving && Math.abs(g.stormOutlook.arrived - 0.5) < 1e-6);
	g.time = 90 + 20;
	assert.ok(g.stormOutlook.active && !g.stormOutlook.arriving);
});

test("scenario weather settings keep the outlook consistent", () => {
	const g = skirmish({ weather: "harsh" });
	g.time = 60 + 30;
	assert.ok(g.stormOutlook.active);
	assert.equal(g.weather.duration, RTS.SCENARIO_OPTIONS.weather.harsh.duration);
	assert.ok(g.stormOutlook.arrived === 1);
});
