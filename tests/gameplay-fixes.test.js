// 0.171.11: gameplay fixes from the review of the whole game — the attack move goes on after a chase, the armour
// rule covers every vehicle and building, the commander rebuilds its workers and finds ore beyond its side, an
// allied player shares the side's relays, kills go to the side that made them, the commander's sight is saved.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
require("../advanced-rules");
const { Game, TYPES } = RTS;

test("attack move: after killing a target on the way the unit goes on to the order's point", () => {
	const g = new Game(3, "horizon");
	g.configureSkirmish({ enemy: "waves" });
	g.nextWave = 1e9;
	g.enemyAi = null;
	g.entities = g.entities.filter((e) => e.type === "hq");
	g.obstacles = [];
	g.waters = [];
	const u = g.spawn("trooper", 0, 500, 600),
		foe = g.spawn("trooper", 1, 760, 800);
	foe.hp = 1;
	foe.cooldown = 99;
	g.command([u.id], 2000, 600, null, true);
	for (let i = 0; i < 30 * 25; i++) g.tick(1 / 30);
	assert.ok(foe.hp <= 0, "the target fell");
	assert.ok(Math.hypot(u.x - 2000, u.y - 600) < 60, `at the point (${Math.round(u.x)}, ${Math.round(u.y)})`);
});

test("armour: rockets hit every vehicle and building hard, infantry, creatures and ships lightly", () => {
	const g = new Game(5, "horizon");
	g.configureSkirmish({ players: 2 });
	const rocket = g.spawn("rocket", 0, 100, 100);
	const hit = (type) => {
		const t = g.spawn(type, 1, 900, 900),
			n = g.damage(rocket, t) / TYPES.rocket.damage;
		g.entities = g.entities.filter((e) => e !== t);
		return n;
	};
	for (const type of ["tank", "sentinel", "destroyer", "colossus", "warden", "construct", "prism", "hauler", "battery", "workshop", "monolith", "anchor", "pirateBase", "hq", "wall"]) assert.ok(hit(type) > 1.5, type);
	for (const type of ["trooper", "raider", "crawler", "spark", "worker", "beast", "corvette", "frostTusk"]) assert.ok(hit(type) < 1, type);
});

test("the commander without workers buys a worker first, and mines beyond its side when its ore is gone", () => {
	const g = new Game(7, "horizon");
	g.configureSkirmish({ players: 2, difficulty: "normal" });
	for (let i = 0; i < 30 * 40; i++) g.tick(1 / 30);
	for (const e of g.entities) if (e.team === 1 && e.type === "worker") e.hp = 0;
	g.entities = g.entities.filter((e) => e.hp > 0);
	const T = g.enemyAi.teams[1],
		sites = () => g.entities.filter((e) => e.team === 1 && e.constructionLeft > 0).length;
	T.metal = 2000;
	const before = sites();
	T.think = 0;
	g.aiThink(T, RTS.AI_LEVELS.normal, g.hq(1));
	assert.equal(g.hq(1).aiQueue?.type, "worker", "a worker queued");
	assert.equal(sites(), before, "no new site without a builder");
	// Its side's ore all mined: a worker still finds a field.
	const hq = g.hq(1);
	for (const o of g.ores) if (Math.hypot(o.x - hq.x, o.y - hq.y) < 1100) o.amount = 0;
	const w = g.spawn("worker", 1, hq.x + 40, hq.y);
	assert.ok(g.aiPickOre(T, w), "a field further away");
});

test("kills go to the human side that made them, not to the first player", () => {
	const g = new Game(5, "horizon");
	g.configureSkirmish({ players: 3 });
	const a = g.spawn("tank", 1, 500, 500),
		b = g.spawn("trooper", 3, 520, 500);
	const kills = g.sides[0].kills;
	g.applyDamage(a, b, 9999);
	assert.equal(g.sides[0].kills, kills, "a computer army killing another");
});

test("an allied player shares the side's relays (income)", () => {
	const g = RTS.createNetworkGame({ map: "horizon", size: "small", seed: 3, teams: "duo", players: [{ team: 0 }, { team: 3 }, { team: 1, ai: true }, { team: 4, ai: true }] });
	g.nodes[0].owner = g.sideLeader(0);
	g.nodes[1].owner = g.sideLeader(0);
	const income = (team) => g.as(team, () => (g.sideTick(0), g.income));
	assert.equal(income(3), income(0));
	assert.ok(income(3) > 8);
});

test("the commander's sight survives save and load", () => {
	const g = new Game(11, "lumen");
	g.configureSkirmish({ players: 3, difficulty: "hard" });
	for (let i = 0; i < 30 * 60; i++) g.tick(1 / 30);
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	for (const team of Object.keys(g._aiVision || {})) assert.deepEqual(Array.from(back._aiVision[team].seen), Array.from(g._aiVision[team].seen));
	for (let i = 0; i < 30 * 30; i++) {
		g.tick(1 / 30);
		back.tick(1 / 30);
	}
	assert.equal(back.checksum(), g.checksum());
});
