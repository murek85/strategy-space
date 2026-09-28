const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;
const game = (faction, opts = {}) => {
	const g = new Game(42, "horizon");
	g.configureSkirmish({ faction, enemy: "waves", ...opts });
	g.nextWave = 1e9;
	g.credits = 5000;
	g.gas = 500;
	return g;
};
const open = (g) => {
	// A clear, visible spot in the middle of the map.
	for (let y = 400; y < g.H - 400; y += 40)
		for (let x = 400; x < g.W - 400; x += 40) if (!g.blocked(x, y, 140) && g.entities.every((e) => dist(e, { x, y }) > 300)) return { x, y };
};

test("each faction gets its own units and building; the other faction's are refused", () => {
	const c = game("colonies"),
		d = game("dominion");
	c.upgrades.colony = d.upgrades.colony = true;
	for (const t of ["grenadier", "serviceRover", "outpost"]) assert.equal(TYPES[t].faction, "colonies");
	for (const t of ["flamer", "destroyer", "uplink"]) assert.equal(TYPES[t].faction, "dominion");
	assert.equal(c.productionType("grenadier"), "barracks");
	assert.equal(c.productionType("serviceRover"), "factory");
	assert.equal(d.productionType("flamer"), "barracks");
	assert.equal(d.productionType("destroyer"), "factory");
	assert.ok(c.enqueue("grenadier"));
	assert.equal(c.enqueue("flamer"), false);
	assert.ok(d.enqueue("flamer"));
	assert.equal(d.enqueue("grenadier"), false);
	assert.match(c.developmentRequirement("uplink"), /innej frakcji/);
	assert.match(d.developmentRequirement("outpost"), /innej frakcji/);
	const p = open(c);
	c.explored.fill(1);
	c.visible.fill(1);
	assert.equal(c.canBuild(p.x, p.y, "uplink"), false);
	assert.equal(c.buildStructure("uplink", p.x, p.y), false);
});

test("passive traits: faster Colony construction, sturdier Dominion buildings", () => {
	const c = game("colonies"),
		d = game("dominion");
	assert.equal(c.buildingFactor(0), 1.2);
	assert.equal(d.buildingFactor(0), 1);
	const cb = c.entities.find((e) => e.team === 0 && e.type === "barracks"),
		db = d.entities.find((e) => e.team === 0 && e.type === "barracks");
	assert.ok(Math.abs(db.maxHp / cb.maxHp - (1.25 * RTS.FACTIONS.dominion.hp) / RTS.FACTIONS.colonies.hp) < 1e-9);
	// New buildings too, but only once.
	const t = d.spawn("turret", 0, 500, 500);
	assert.ok(t.fortified);
	const hp = t.maxHp;
	d.fortify(t);
	assert.equal(t.maxHp, hp);
	// Construction: a worker at the site of a Colony building works 20% faster.
	const speed = (g) => {
		const w = g.units(0).find((e) => e.type === "worker"),
			site = g.spawn("turret", 0, w.x + 30, w.y);
		site.constructionLeft = 8;
		g.buildWith([w.id], site.id);
		for (let i = 0; i < 30; i++) g.workTick(w, 1 / 30);
		return 8 - site.constructionLeft;
	};
	assert.ok(Math.abs(speed(game("colonies")) / speed(game("dominion")) - 1.2) < 1e-6);
});

test("grenades and flames hit neighbours; the destroyer hunts vehicles", () => {
	const g = game("colonies"),
		p = open(g),
		gr = g.spawn("grenadier", 0, p.x - 150, p.y),
		target = g.spawn("trooper", 1, p.x, p.y),
		near = g.spawn("trooper", 1, p.x + 20, p.y),
		far = g.spawn("trooper", 1, p.x + 120, p.y),
		ally = g.spawn("trooper", 0, p.x - 20, p.y);
	const hp = [target.hp, near.hp, far.hp, ally.hp];
	g.applyDamage(gr, target, 20);
	assert.ok(target.hp < hp[0] && near.hp < hp[1]);
	assert.equal(far.hp, hp[2]);
	assert.equal(ally.hp, hp[3], "own units are spared");
	const d = game("dominion"),
		q = open(d),
		fl = d.spawn("flamer", 0, q.x - 60, q.y),
		inf = d.spawn("trooper", 1, q.x, q.y),
		tank = d.spawn("tank", 1, q.x + 200, q.y),
		de = d.spawn("destroyer", 0, q.x + 400, q.y),
		air = d.spawn("interceptor", 1, q.x + 450, q.y);
	assert.ok(d.damage(fl, inf) > d.damage(fl, tank));
	assert.ok(d.damage(de, tank) > d.damage(de, inf) * 2);
	assert.equal(d.canTarget(de, air), false);
	d.applyDamage(fl, inf, 10);
	assert.ok(d.effects.some((e) => e.kind === "flame"));
});

test("the service rover repairs vehicles and buildings of its side for metal", () => {
	const g = game("colonies"),
		p = open(g),
		rover = g.spawn("serviceRover", 0, p.x, p.y),
		tank = g.spawn("tank", 0, p.x + 60, p.y),
		turret = g.spawn("turret", 0, p.x - 80, p.y),
		soldier = g.spawn("trooper", 0, p.x, p.y + 60),
		enemy = g.spawn("tank", 1, p.x, p.y - 80);
	for (const e of [tank, turret, soldier, enemy]) e.hp = e.maxHp / 2;
	const metal = g.credits;
	g.factionTick(1);
	assert.ok(tank.hp > tank.maxHp / 2 && turret.hp > turret.maxHp / 2);
	assert.equal(soldier.hp, soldier.maxHp / 2, "infantry is healed by medical posts, not rovers");
	assert.equal(enemy.hp, enemy.maxHp / 2);
	assert.ok(g.credits < metal);
	assert.deepEqual(rover.repairTargets.sort(), [tank.id, turret.id].sort());
});

test("the field outpost stands anywhere visible, takes ore and opens a building zone", () => {
	const g = game("colonies"),
		p = open(g);
	g.explored.fill(1);
	g.visible.fill(1);
	assert.equal(g.canBuild(p.x, p.y, "turret"), false, "far from the base");
	assert.ok(g.canBuild(p.x, p.y, "outpost"));
	const o = g.spawn("outpost", 0, p.x, p.y);
	assert.ok(g.canBuild(p.x + 150, p.y, "turret"), "building zone around the outpost");
	const w = g.units(0).find((e) => e.type === "worker");
	w.x = p.x + 40;
	w.y = p.y;
	assert.equal(g.bestDropoff(w)?.id, o.id);
	g.updateVision();
	assert.ok(g.isVisible(p.x + 400, p.y) || g.blocked(p.x + 400, p.y, 0));
});

test("orbital strike: needs a colony and power, marks the target, hits foes after a delay, then cools down", () => {
	const g = game("dominion"),
		p = open(g);
	g.explored.fill(1);
	const up = g.spawn("uplink", 0, g.hq(0).x + 200, g.hq(0).y - 200);
	g.spawn("reactor", 0, g.hq(0).x - 200, g.hq(0).y - 200);
	g.spawn("reactor", 0, g.hq(0).x - 200, g.hq(0).y + 150);
	assert.match(g.developmentRequirement("uplink"), /Kolonia/);
	g.upgrades.colony = true;
	assert.equal(g.developmentRequirement("uplink"), "");
	const foe = g.spawn("tank", 1, p.x, p.y),
		mine = g.spawn("tank", 0, p.x + 20, p.y),
		out = g.spawn("tank", 1, p.x + 300, p.y);
	// Nobody fires: only the strike changes hit points.
	for (const e of [foe, mine, out]) e.cooldown = 1e9;
	const hp = [foe.hp, mine.hp, out.hp];
	assert.ok(g.orbitalStrike(up.id, p.x, p.y), g.strikeRequirement(up.id));
	assert.match(g.strikeRequirement(up.id), /gotowe za/);
	assert.equal(g.orbitalStrike(up.id, p.x, p.y), false);
	g.tick(1);
	assert.equal(foe.hp, hp[0], "not before the delay");
	for (let i = 0; i < 70; i++) g.tick(1 / 30);
	assert.ok(foe.hp < hp[0] - 300);
	assert.equal(mine.hp, hp[1], "own units are spared");
	assert.equal(out.hp, hp[2]);
	assert.equal(g.strikes.length, 0);
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.deepEqual(back.strikes, []);
});

test("commanders use their faction: Dominion builds an uplink and strikes the densest group", () => {
	const g = new Game(42, "horizon");
	g.configureSkirmish({ faction: "colonies", difficulty: "hard" });
	const T = g.enemyAi.teams[1];
	T.nextAttack = 1e9;
	g.time = 400;
	assert.equal(g.factionFor(1).key, "dominion");
	assert.ok(g.aiWants(T, RTS.AI_LEVELS.hard).includes("uplink"));
	const up = g.spawn("uplink", 1, g.hq(1).x + 150, g.hq(1).y + 150),
		p = open(g);
	for (let i = 0; i < 5; i++) g.spawn("trooper", 0, p.x + i * 15, p.y);
	g.aiOrbital(T, RTS.AI_LEVELS.hard);
	assert.equal(g.strikes.length, 1);
	assert.ok(dist(g.strikes[0], p) < 80);
	assert.ok(up.strikeReady > g.time);
	// Colonies build an outpost as their drop-off.
	const h = new Game(42, "horizon");
	h.configureSkirmish({ faction: "dominion", difficulty: "hard" });
	h.time = 400;
	assert.ok(h.aiWants(h.enemyAi.teams[1], RTS.AI_LEVELS.hard).includes("outpost") || h.entities.some((e) => e.team === 1 && e.type === "outpost"));
});
