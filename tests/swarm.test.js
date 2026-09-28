const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;
const game = (opts = {}) => {
	const g = new Game(42, "horizon");
	g.configureSkirmish({ faction: "swarm", enemy: "waves", ...opts });
	g.nextWave = 1e9;
	g.credits = 5000;
	return g;
};
const open = (g) => {
	for (let y = 400; y < g.H - 400; y += 40)
		for (let x = 400; x < g.W - 400; x += 40) if (!g.blocked(x, y, 140) && g.entities.every((e) => dist(e, { x, y }) > 300)) return { x, y };
};

test("the Swarm is a playable faction with its own units and building", () => {
	const g = game();
	assert.equal(g.factionFor(0).key, "swarm");
	assert.equal(g.factionFor(1).key, "dominion", "a Swarm player meets the Dominium by default");
	assert.ok(g.enqueue("crawler"));
	assert.equal(g.enqueue("grenadier"), false);
	assert.equal(g.productionType("colossus"), "factory");
	assert.ok(g.cost("crawler") < TYPES.crawler.cost);
	assert.ok(g.cost("trooper") < TYPES.trooper.cost, "cheaper units");
	const colonies = new Game(42, "horizon");
	colonies.configureSkirmish({ faction: "colonies" });
	assert.equal(colonies.enqueue("crawler"), false);
	assert.match(colonies.developmentRequirement("monolith"), /innej frakcji/);
});

test("faster hatching for the player and for a Swarm commander", () => {
	const g = game(),
		plain = new Game(42, "horizon");
	plain.configureSkirmish({ faction: "colonies", enemy: "waves" });
	plain.credits = 5000;
	g.enqueue("trooper");
	plain.enqueue("trooper");
	assert.ok(Math.abs(g.queue[0].left / plain.queue[0].left - 0.85) < 1e-9);
	const h = new Game(42, "horizon");
	h.configureSkirmish({ faction: "colonies", enemyFaction: "swarm", difficulty: "normal" });
	const T = h.enemyAi.teams[1];
	assert.equal(h.factionFor(1).key, "swarm");
	T.metal = 5000;
	T.think = 0;
	h.spawn("barracks", 1, h.hq(1).x + 160, h.hq(1).y + 160);
	h.enemyAiTick(1 / 30);
	const queued = h.entities.find((e) => e.team === 1 && e.aiQueue && e.aiQueue.type !== "worker");
	assert.ok(queued);
	assert.ok(Math.abs(queued.aiQueue.left - TYPES[queued.aiQueue.type].build * RTS.AI_LEVELS.normal.prodTime * 0.85) < 1e-9);
});

test("enemy faction setting: every enemy side takes it; an ally keeps the player's faction", () => {
	const g = new Game(42, "horizon");
	g.configureSkirmish({ faction: "colonies", enemyFaction: "swarm", players: 3 });
	assert.equal(g.factionFor(1).key, "swarm");
	assert.equal(g.factionFor(3).key, "swarm");
	const hq = g.hq(1);
	assert.equal(hq.faction, "swarm");
	const duo = new Game(42, "horizon");
	duo.configureSkirmish({ faction: "dominion", enemyFaction: "swarm", teams: "duo" });
	assert.equal(duo.factionFor(3).key, "dominion");
	assert.equal(duo.factionFor(4).key, "swarm");
	assert.equal(duo.hq(3).faction, "dominion");
	const auto = new Game(42, "horizon");
	auto.configureSkirmish({ faction: "colonies" });
	assert.equal(auto.factionFor(1).key, "dominion", "automatic as before");
	assert.equal(auto.scenario.enemyFaction, "auto");
});

test("crawlers burst, spitters corrode, the colossus splashes and regenerates", () => {
	const g = game(),
		p = open(g);
	const crawler = g.spawn("crawler", 0, p.x, p.y),
		near = g.spawn("trooper", 1, p.x + 30, p.y),
		mine = g.spawn("trooper", 0, p.x - 30, p.y);
	const nearHp = near.hp,
		mineHp = mine.hp;
	g.applyDamage(null, crawler, 1e6);
	assert.ok(near.hp <= nearHp - RTS.SWARM.burst.damage + 1e-9);
	assert.equal(mine.hp, mineHp);
	const spitter = g.spawn("spitter", 0, p.x - 150, p.y + 100),
		building = g.spawn("depot", 1, p.x + 200, p.y + 100),
		tank = g.spawn("tank", 1, p.x + 100, p.y + 150);
	const onTank = g.damage(spitter, tank);
	assert.ok(g.damage(spitter, building) >= TYPES.spitter.damage * RTS.SWARM.corrosion.buildings - 1e-9, "acid is stronger against buildings");
	g.applyDamage(spitter, tank, 10);
	assert.ok(tank.corrodedUntil > g.time);
	assert.ok(Math.abs(g.damage(spitter, tank) / onTank - RTS.SWARM.corrosion.extra) < 1e-9);
	const colossus = g.spawn("colossus", 0, p.x, p.y + 300),
		t1 = g.spawn("trooper", 1, p.x + 100, p.y + 300),
		t2 = g.spawn("trooper", 1, p.x + 130, p.y + 300);
	const t2hp = t2.hp;
	g.applyDamage(colossus, t1, 30);
	assert.ok(t2.hp < t2hp);
	colossus.hp = 500;
	colossus.lastDamaged = g.time;
	for (const e of g.entities) if (e.team === 1) e.hp = 0;
	g.tick(1);
	assert.ok(colossus.hp >= 500 + RTS.SWARM.colossusRegen * 0.99);
});

test("regeneration: units always, buildings after a calm moment", () => {
	const g = game(),
		b = g.entities.find((e) => e.team === 0 && e.type === "barracks"),
		u = g.units(0).find((e) => e.type === "trooper");
	g.entities = g.entities.filter((e) => e.team === 0);
	b.hp = b.maxHp / 2;
	u.hp = u.maxHp / 2;
	b.lastDamaged = g.time;
	u.lastDamaged = g.time - 5;
	g.tick(1);
	assert.equal(b.hp, b.maxHp / 2, "not right after a hit");
	assert.ok(u.hp > u.maxHp / 2);
	g.time += RTS.SWARM.buildingCalm;
	g.tick(1);
	assert.ok(b.hp > b.maxHp / 2);
});

test("the monolith slows enemy ground units and reveals saboteurs", () => {
	const g = game(),
		p = open(g),
		m = g.spawn("monolith", 0, p.x, p.y),
		foe = g.spawn("tank", 1, p.x + 100, p.y),
		far = g.spawn("tank", 1, p.x + 700, p.y),
		friend = g.spawn("tank", 0, p.x + 100, p.y + 50),
		sab = g.spawn("saboteur", 1, p.x - 100, p.y);
	sab.stealth = true;
	g.tick(1 / 30);
	assert.ok(Math.abs(g.movementFactor(foe) / g.movementFactor(far) - RTS.SWARM.monolith.slow) < 1e-9);
	assert.ok(g.movementFactor(friend) > g.movementFactor(foe));
	assert.equal(sab.stealth, false);
	assert.ok(m.hp > 0);
});

test("a Swarm commander builds its monolith and trains its own units", () => {
	const g = new Game(42, "horizon");
	g.configureSkirmish({ faction: "colonies", enemyFaction: "swarm", difficulty: "hard" });
	const T = g.enemyAi.teams[1];
	T.nextAttack = 1e9;
	for (let i = 0; i < 300 * 30; i++) g.tick(1 / 30);
	const types = new Set(g.entities.filter((e) => e.team === 1 && e.hp > 0).map((e) => e.type));
	assert.ok(types.has("monolith"), [...types].join(","));
	assert.ok(types.has("crawler") || types.has("spitter"));
});

test("Swarm buildings and units carry the obsidian guardians' names", () => {
	const g = game();
	assert.equal(g.unitName("hq"), "Brama Roju");
	assert.equal(g.unitName("barracks"), "Para strażnic");
	assert.equal(g.unitName("turret"), "Obelisk");
	assert.equal(g.unitName("crawler"), "Pełzacz", "own Swarm units keep their names");
	assert.equal(g.unitName("hq", 1), TYPES.hq.name, "the Dominium enemy keeps the shared names");
	const hq = g.entities.find((e) => e.type === "hq" && e.team === 0);
	assert.equal(g.entityName(hq), "Brama Roju");
	const enemy = g.entities.find((e) => e.team === 1 && !TYPES[e.type].speed);
	assert.equal(g.entityName(enemy), TYPES[enemy.type].name);
	const colonies = new Game(42, "horizon");
	colonies.configureSkirmish({ faction: "colonies", enemy: "waves" });
	assert.equal(colonies.unitName("hq"), TYPES.hq.name);
});
