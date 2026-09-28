const { test } = require("node:test"),
	assert = require("node:assert/strict"),
	RTS = require("../engine"),
	{ GameAudio } = require("../audio");
function clean() {
	const g = new RTS.Game(42, "solar");
	g.entities = [];
	g.obstacles = [];
	g.waters = [];
	g.nodes = [];
	g.ores = [];
	g.gasFields = [];
	g.crystalFields = [];
	g.nextWave = 999999;
	g.credits = 5000;
	g.upgrades.colony = true;
	g.spawn("hq", 0, 200, 200);
	g.spawn("hq", 1, 3000, 1900);
	g.visible.fill(1);
	return g;
}
function squad(g, n = 5) {
	return Array.from({ length: n }, (_, i) =>
		g.spawn(i % 2 ? "rocket" : "trooper", 0, 620 + i, 600),
	);
}
test("transport boards only four infantry, hides passengers and preserves population", () => {
	const g = clean(),
		c = g.spawn("transport", 0, 600, 600),
		es = squad(g),
		w = g.spawn("worker", 0, 620, 600),
		enemy = g.spawn("trooper", 1, 620, 600);
	const pop = g.population(0);
	assert.equal(g.board([...es.map((e) => e.id), w.id, enemy.id], c.id), 4);
	g.boardingTick();
	assert.equal(c.passengers.length, 4);
	assert.equal(g.units(0).length, pop - 4);
	assert.equal(g.population(0), pop);
	assert.equal(g.get(es[0].id), undefined);
	assert.ok(g.get(w.id));
	assert.equal(g.board([es[4].id], c.id), 0);
});
test("boarding approaches carrier and can be cancelled by stop and move", () => {
	const g = clean(),
		c = g.spawn("transport", 0, 800, 600),
		e = g.spawn("trooper", 0, 500, 600);
	g.board([e.id], c.id);
	g.stop([e.id]);
	assert.equal(e.boardTargetId, undefined);
	g.board([e.id], c.id);
	g.command([e.id], 450, 450);
	assert.equal(e.boardTargetId, undefined);
	g.board([e.id], c.id);
	for (let i = 0; i < 100 && !c.passengers?.length; i++) g.tick(0.1);
	assert.equal(c.passengers.length, 1);
});
test("normal and emergency unloading preserve identities, blocked unloading preserves cargo", () => {
	const g = clean(),
		c = g.spawn("transport", 0, 600, 600),
		es = squad(g, 2);
	g.board(
		es.map((e) => e.id),
		c.id,
	);
	g.boardingTick();
	g.obstacles = [{ x: 250, y: 250, w: 700, h: 700 }];
	assert.equal(g.unload(c.id), 0);
	assert.equal(c.passengers.length, 2);
	g.obstacles = [];
	assert.equal(g.unload(c.id), 2);
	assert.equal(g.get(es[0].id).hp, es[0].maxHp);
	for (const e of es) {
		e.x = 620;
		e.y = 600;
	}
	g.board(
		es.map((e) => e.id),
		c.id,
	);
	g.boardingTick();
	const hp = es[0].hp;
	g.applyDamage(g.hq(1), c, 9999);
	assert.ok(g.get(es[0].id));
	assert.equal(g.get(es[0].id).hp, hp / 2);
	assert.equal(c.passengers.length, 0);
});
test("loaded army obeys production cap and saves without duplicate passengers", () => {
	const g = clean(),
		c = g.spawn("transport", 0, 600, 600),
		es = squad(g, 4);
	g.spawn("barracks", 0, 800, 800);
	g.board(
		es.map((e) => e.id),
		c.id,
	);
	g.boardingTick();
	while (g.population(0) < 60) g.spawn("trooper", 0, 1000, 1000);
	assert.equal(g.enqueue("trooper"), false);
	g.setFormation("column");
	const save = g.serialize(),
		r = RTS.Game.fromSave(save);
	assert.equal(r.population(0), 60);
	assert.equal(r.get(c.id).passengers.length, 4);
	assert.equal(r.formation, "column");
	save.entities.find((e) => e.id === c.id).passengers[0].id = c.id;
	assert.throws(() => RTS.Game.fromSave(save), /załogi/);
});
test("flak ignores ground targets and engages nearby aircraft", () => {
	const g = clean(),
		b = g.spawn("flak", 0, 600, 600),
		ground = g.spawn("tank", 1, 630, 600),
		air = g.spawn("interceptor", 1, 760, 600);
	ground.cooldown = 100;
	air.cooldown = 100;
	b.cooldown = 0;
	const hp = air.hp;
	g.tick(0.1);
	assert.equal(g.canTarget(b, ground), false);
	assert.equal(g.canTarget(b, air), true);
	assert.ok(air.hp < hp);
	assert.equal(g.power.demand, 15);
	g.upgrades.colony = false;
	assert.match(g.developmentRequirement("flak"), /Kolonia/);
});
test("formations rotate toward destination, spread out and avoid obstacles", () => {
	const g = clean(),
		es = squad(g, 6),
		ids = es.map((e) => e.id);
	g.setFormation("line");
	g.command(ids, 1200, 600);
	assert.equal(new Set(es.map((e) => Math.round(e.order.x))).size, 1);
	assert.equal(new Set(es.map((e) => Math.round(e.order.y))).size, 6);
	g.setFormation("column");
	g.command(ids, 1200, 600);
	assert.equal(new Set(es.map((e) => Math.round(e.order.x))).size, 3);
	g.setFormation("spread");
	g.obstacles = [{ x: 1100, y: 500, w: 200, h: 200 }];
	g.command(ids, 1200, 600, null, true);
	for (const e of es) {
		assert.equal(e.order.kind, "attackMove");
		assert.equal(
			g.blocked(e.order.x, e.order.y, RTS.TYPES[e.type].radius),
			false,
		);
	}
	assert.equal(g.setFormation("bad"), false);
});
test("selection report accounts for current upgrades and passenger counts", () => {
	const g = clean(),
		c = g.spawn("transport", 0, 600, 600),
		e = squad(g, 1)[0];
	g.board([e.id], c.id);
	g.boardingTick();
	const r = g.combatReport([c.id])[0];
	assert.equal(r.passengers, 1);
	assert.equal(r.cost, g.cost("transport"));
	const before = r.damage;
	g.upgrades.weapons = true;
	assert.equal(g.combatReport([c.id])[0].damage, before * 1.25);
});
test("radio order motifs differ and share a spam limiter", () => {
	const a = new GameAudio();
	a.context = { state: "running", currentTime: 1 };
	let tones = [];
	a.tone = (...x) => tones.push(x);
	assert.equal(a.play("order-move"), true);
	const move = JSON.stringify(tones);
	assert.equal(a.play("order-attack"), false);
	a.context.currentTime = 2;
	tones = [];
	assert.equal(a.play("order-attack"), true);
	assert.notEqual(JSON.stringify(tones), move);
	a.muted = true;
	a.context.currentTime = 3;
	assert.equal(a.play("order-board"), false);
});
