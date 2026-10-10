// M5 (0.166): maps that change in time — tides over the sandbars (Archipelag Thalassy), ice that carries units and
// breaks (Lodowe Archiwum), comets crossing the field (Szlak Komet). world-rules.js.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, dist } = RTS;

const quietNotes = (g) => {
	const notes = [];
	const notify = g.notify.bind(g);
	g.notify = (text, sound) => (notes.push([Math.round(g.time), text]), notify(text, sound));
	return notes;
};

test("tides: a warning, the fords under water for a minute in four, units washed ashore", () => {
	const g = new Game(42, "thalassa");
	g.configureSkirmish({ players: 2 });
	const T = RTS.FRONTIER_MAPS.thalassa.tides,
		ford = g.tideBodies()[0];
	assert.equal(g.tideBodies().length, 6);
	g.time = T.first - 30;
	assert.equal(g.tide().high, false);
	assert.equal(g.blocked(ford.x, ford.y, 10), false);
	g.time = T.first + 20;
	assert.equal(g.tide().high, true);
	assert.equal(g.tide().level, 1);
	assert.equal(g.blocked(ford.x, ford.y, 10), true);
	g.time = T.first + T.high + 5;
	assert.equal(g.tide().high, false);
	assert.equal(g.tide().until, T.period - T.high - 5);
	// The whole cycle on the clock: the warning, high water, ebb; a trooper on the ford is washed ashore.
	const h = new Game(42, "thalassa");
	h.configureSkirmish({ players: 2 });
	const notes = quietNotes(h),
		trooper = h.spawn("trooper", 0, ford.x, ford.y);
	trooper.hp = trooper.maxHp = 1e6;
	for (let i = 0; i < (T.first + T.high + 5) * 10; i++) {
		h.tick(0.1);
		if (Math.abs(h.time - T.first - 1) < 0.05) assert.equal(h.onFord(trooper.x, trooper.y), false, "washed ashore");
	}
	const tideNotes = notes.filter(([, t]) => /Przypływ|Odpływ/.test(t)).map(([s]) => s);
	assert.deepEqual(tideNotes, [T.first - 15, T.first, T.first + T.high]);
	// Nothing is built on a ford; deposits and relays never lie on one, whatever the seed and size.
	assert.equal(g.canBuild(ford.x, ford.y, "turret"), false);
	for (const size of ["small", "medium", "large"])
		for (const seed of [0, 7, 99]) {
			const s = new Game(42, "thalassa");
			s.configureSkirmish({ players: 4, size, seed });
			for (const o of [...s.ores, ...s.gasFields, ...s.crystalFields, ...s.nodes]) assert.ok(!s.onFord(o.x, o.y, 40), `${size}/${seed} ${o.x},${o.y}`);
		}
	// No tides elsewhere.
	assert.equal(new Game(42, "lanterns").tide(), null);
});

test("ice: carries units, slows heavy ones, a blast breaks a hole that freezes back; holes are saved", () => {
	const g = new Game(42, "vesper");
	g.configureSkirmish({ players: 2 });
	const p = { x: 1680, y: 1080 };
	assert.ok(g.onIce(p.x, p.y));
	assert.equal(g.blocked(p.x, p.y, 22), false);
	const tank = g.spawn("tank", 0, 1500, 1080),
		trooper = g.spawn("trooper", 0, 1500, 1120),
		dry = g.spawn("tank", 0, 600, 1700);
	assert.ok(g.movementFactor(tank) < g.movementFactor(dry) * 0.7);
	assert.ok(g.movementFactor(trooper) > g.movementFactor(tank));
	const victim = g.spawn("trooper", 0, p.x + 10, p.y);
	victim.hp = victim.maxHp;
	g.fx("explosion", p.x, p.y, { size: 70 });
	g.tick(1 / 15);
	assert.equal(g.iceHoles.length, 1);
	assert.ok(g.blocked(p.x, p.y, 10));
	assert.ok(victim.hp < victim.maxHp && dist(victim, p) > g.iceHoles[0].r);
	assert.ok(!g.craters.some((c) => dist(c, p) < 5), "no crater on ice");
	// Small blasts do not break the ice.
	g.fx("explosion", 1450, 1080, { size: 20 });
	g.tick(1 / 15);
	assert.equal(g.iceHoles.length, 1);
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.deepEqual(back.iceHoles, g.iceHoles);
	g.time += RTS.WORLD.ice.life + 1;
	g.tick(1 / 15);
	assert.equal(g.iceHoles.length, 0);
	assert.equal(g.blocked(p.x, p.y, 10), false);
});

test("comets: on their tracks on a schedule, the tail hurts ships and refills gas, a warning first", () => {
	const g = new Game(42, "comets");
	g.configureSkirmish({ players: 2 });
	assert.ok(g.space);
	const seen = new Set();
	for (let t = 0; t < 180; t += 1) {
		g.time = t;
		for (const c of g.comets()) seen.add(c.id);
	}
	assert.deepEqual([...seen].sort(), [0, 1]);
	// A ship in a tail takes damage; the gas field the head sweeps fills back up.
	const h = new Game(42, "comets");
	h.configureSkirmish({ players: 2 });
	const notes = quietNotes(h);
	h.tick(0.1);
	const field = h.gasFields[0];
	field.amount = 100;
	let hit = false;
	const ship = h.spawn("frigate", 0, 100, 100);
	ship.hp = ship.maxHp = 1e6;
	ship.shield = 0;
	for (let i = 0; i < 2000; i++) {
		const c = h.comets()[0];
		if (c) {
			ship.x = c.x - c.dx * 150;
			ship.y = c.y - c.dy * 150;
		}
		const before = ship.hp + (ship.shield || 0);
		h.tick(0.1);
		if (c && ship.hp + (ship.shield || 0) < before) hit = true;
	}
	assert.ok(hit, "the tail hurts");
	assert.ok(field.amount > 100, "gas refilled");
	assert.ok(field.amount <= field.full);
	assert.ok(notes.some(([, t]) => /Kometa za/.test(t)));
	// No comets on the ground.
	assert.deepEqual(new Game(42, "thalassa").comets(), []);
});
