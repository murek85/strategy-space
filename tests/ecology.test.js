const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES } = RTS;
test("each planet has threats away from starting bases, with persistent homes", () => {
	for (const id of Object.keys(RTS.MISSIONS)) {
		const g = new Game(73, id);
		if (!RTS.MISSIONS[id].campaign) g.configureSkirmish({ players: 4 });
		const creatures = g.entities.filter((e) => TYPES[e.type].threat);
		if (RTS.MISSIONS[id].training) {
			assert.equal(creatures.length, 0, id);
			continue;
		}
		assert.ok(creatures.length >= 2, id);
		for (const e of creatures) {
			assert.ok(
				g.entities
					.filter((b) => b.type === "hq")
					.every((b) => RTS.dist(b, e) > 480),
				id,
			);
			assert.equal(g.blocked(e.x, e.y, 45), false, id);
		}
		const restored = Game.fromSave(g.serialize());
		assert.deepEqual(
			restored.entities.filter((e) => TYPES[e.type].threat),
			creatures,
		);
	}
});
test("threats harm either ground army, cannot hit aircraft and can be killed", () => {
	for (const type of ["duneMaw", "frostTusk", "ashCrawler"])
		for (const team of [0, 1]) {
			const g = new Game(42, "solar");
			g.entities = [];
			g.obstacles = [];
			g.waters = [];
			g.nodes = [];
			g.nextWave = 1e9;
			g.spawn("hq", 0, 300, 300);
			g.spawn("hq", 1, 3000, 1900);
			const beast = g.spawn(type, 2, 1500, 1000);
			beast.home = { x: 1500, y: 1000 };
			const victim = g.spawn("heavy", team, 1525, 1000);
			victim.order = { kind: "hold" };
			const hp = victim.hp;
			for (let i = 0; i < 8; i++) g.tick(0.1);
			assert.ok(victim.hp < hp, type);
			if (type === "duneMaw") assert.equal(beast.x, 1500);
			const aircraft = g.spawn("interceptor", team, 1500, 1000);
			assert.equal(g.canTarget(beast, aircraft), false);
			assert.equal(g.damage(beast, aircraft), 0);
			assert.equal(
				g.canTarget(beast, { type: "worker", x: 1800, y: 1000 }),
				false,
			);
			g.applyDamage(victim, beast, 10000);
			assert.ok(beast.hp <= 0);
		}
});
test("shoreline admits dry coves and blocks water using the rendered boundary", () => {
	const g = new Game(4, "solar");
	g.entities = [];
	g.obstacles = [];
	const w = { x: 1000, y: 1000, rx: 200, ry: 140 };
	g.waters = [w];
	for (let i = 0; i < 80; i++) {
		const a = (i * Math.PI) / 40,
			r = RTS.waterRadius(w, a);
		assert.equal(
			g.blocked(
				w.x + Math.cos(a) * w.rx * (r - 0.02),
				w.y + Math.sin(a) * w.ry * (r - 0.02),
				0,
			),
			true,
		);
		assert.equal(
			g.blocked(
				w.x + Math.cos(a) * w.rx * (r + 0.02),
				w.y + Math.sin(a) * w.ry * (r + 0.02),
				0,
			),
			false,
		);
	}
});
