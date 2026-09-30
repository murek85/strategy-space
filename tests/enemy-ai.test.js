const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;
const skirmish = (opts = {}, map = "horizon") => {
	const g = new Game(42, map);
	g.configureSkirmish(opts);
	return g;
};
const run = (g, seconds) => {
	for (let i = 0; i < seconds * 30 && !g.result; i++) g.tick(1 / 30);
	return g;
};
// No attacks: the commander only builds up.
const peaceful = (g) => {
	for (const T of Object.values(g.enemyAi.teams)) T.nextAttack = 1e9;
	return g;
};
const g0 = (e) => {
	e.aiRole = "defend";
	e.modeTagged = true;
	return e;
};
const own = (g, team, type) => g.entities.filter((e) => e.team === team && e.hp > 0 && (!type || e.type === type));

test("scenarios use the commander by default; campaign missions keep their scripted waves", () => {
	const g = skirmish();
	assert.equal(g.scenario.enemy, "commander");
	assert.ok(g.aiActive());
	assert.equal(own(g, 1, "worker").length, RTS.AI.startWorkers);
	const campaign = new Game(42, "colony1");
	assert.ok(!campaign.aiActive());
	const classic = skirmish({ enemy: "waves" });
	assert.ok(!classic.aiActive());
	classic.nextWave = classic.time;
	classic.tick(1 / 30);
	assert.equal(classic.wave, 1, "classic free waves still available");
});

test("no free waves: enemy units come only from paid production", () => {
	const g = peaceful(skirmish({ difficulty: "normal" })),
		T = g.enemyAi.teams[1];
	g.nextWave = 0;
	run(g, 5);
	assert.equal(g.wave, 0);
	// Without metal and income nothing new appears.
	const L = RTS.AI_LEVELS.normal,
		passive = L.passive;
	L.passive = 0;
	try {
		T.metal = 0;
		for (const b of own(g, 1)) delete b.aiQueue;
		g.entities = g.entities.filter((e) => !(e.team === 1 && e.type === "worker"));
		g.nodes.forEach((n) => (n.owner = -1));
		const before = own(g, 1).length;
		run(g, 30);
		assert.equal(own(g, 1).length, before);
	} finally {
		L.passive = passive;
	}
});

test("workers mine ore into the side's own treasury and lost workers are replaced", () => {
	const g = peaceful(skirmish({ difficulty: "normal" })),
		T = g.enemyAi.teams[1];
	run(g, 60);
	assert.ok(T.mined > 0, "ore delivered");
	assert.equal(own(g, 1, "worker").length, RTS.AI_LEVELS.normal.workers);
	for (const w of own(g, 1, "worker").slice(0, 3)) w.hp = 0;
	run(g, 40);
	assert.equal(own(g, 1, "worker").length, RTS.AI_LEVELS.normal.workers);
	assert.ok(T.spent > 0);
});

test("levels differ in economy, build order and army size", () => {
	const at = (difficulty) => run(peaceful(skirmish({ difficulty })), 300);
	const easy = at("easy"),
		normal = at("normal"),
		hard = at("hard");
	assert.ok(own(easy, 1, "worker").length < own(normal, 1, "worker").length);
	assert.ok(own(normal, 1, "worker").length < own(hard, 1, "worker").length);
	assert.equal(own(easy, 1, "factory").length, 0, "easy: no factory yet");
	assert.equal(own(normal, 1, "factory").length, 1);
	assert.equal(own(hard, 1, "factory").length, 1);
	assert.ok(own(hard, 1, "turret").length > own(easy, 1, "turret").length);
	const army = (g) => own(g, 1).filter((e) => TYPES[e.type].speed && TYPES[e.type].damage && e.type !== "worker").length;
	assert.ok(army(easy) < army(normal) && army(normal) < army(hard), `${army(easy)} ${army(normal)} ${army(hard)}`);
	assert.ok(army(easy) <= RTS.AI_LEVELS.easy.army[0] + RTS.AI_LEVELS.easy.army[1] * 5 + 1, "army limit");
	assert.ok(own(hard, 1, "depot").length === 1, "hard builds a depot at a further deposit");
});

test("destroyed buildings are rebuilt by a worker", () => {
	const g = run(peaceful(skirmish({ difficulty: "normal" })), 60),
		barracks = own(g, 1, "barracks")[0];
	barracks.hp = 0;
	g.enemyAi.teams[1].metal = 1000;
	run(g, 5);
	const site = own(g, 1, "barracks")[0];
	assert.ok(site?.constructionLeft > 0, "new construction site");
	assert.ok(own(g, 1, "worker").some((w) => w.aiTask?.kind === "build" && w.aiTask.siteId === site.id));
	run(g, 40);
	assert.equal(site.constructionLeft, 0);
});

test("the base is defended and workers flee", () => {
	const g = run(peaceful(skirmish({ difficulty: "normal" })), 90),
		hq = g.hq(1),
		T = g.enemyAi.teams[1];
	const worker = own(g, 1, "worker").find((w) => dist(w, hq) > 220) || own(g, 1, "worker")[0];
	worker.x = hq.x + 300;
	worker.y = hq.y;
	const raid = [0, 1, 2].map((i) => g.spawn("tank", 0, hq.x + 330 + i * 20, hq.y + 30));
	T.think = 0;
	g.enemyAiTick(1 / 30);
	const defenders = own(g, 1).filter((e) => e.aiRole === "defend");
	assert.ok(defenders.length > 0);
	assert.ok(defenders.every((e) => e.order?.kind === "attackMove" && dist(e.order, raid[1]) < 150));
	assert.ok(worker.aiFleeUntil > g.time && dist(worker.order, hq) < 5);
});

test("relays near the base are taken", () => {
	const g = run(peaceful(skirmish({ difficulty: "normal" })), 240);
	assert.ok(g.nodes.some((n) => n.owner === 1));
});

test("attacks: planned time, minimum size and target by level", () => {
	for (const [difficulty, expect] of [
		["easy", "hq"],
		["normal", "near"],
	]) {
		// The Swarm keeps the level's plan (the Dominium and the Colonies have their own styles, tested below).
		const g = run(peaceful(skirmish({ difficulty, enemyFaction: "swarm" })), 200),
			T = g.enemyAi.teams[1],
			outpost = g.spawn("depot", 0, g.W / 2, g.H / 2);
		T.nextAttack = g.time;
		T.think = 0;
		g.enemyAiTick(1 / 30);
		assert.equal(g.wave, 1, difficulty);
		const target = T.attack.target;
		if (expect === "hq") assert.ok(dist(target, g.hq(0)) < 1, difficulty);
		else assert.ok(dist(target, outpost) < 1, difficulty + " nearest building");
		assert.ok(T.attack.ids.every((id) => g.get(id).order?.kind === "attackMove"));
		assert.ok(T.nextAttack > g.time + 60);
		assert.ok(Math.abs(g.nextWave - T.nextAttack) < 1e-9, "HUD shows the planned attack");
	}
	// Too small an army postpones the attack.
	const g = peaceful(skirmish({ difficulty: "hard" })),
		T = g.enemyAi.teams[1];
	T.nextAttack = g.time;
	T.think = 0;
	g.enemyAiTick(1 / 30);
	assert.equal(g.wave, 0);
	assert.ok(T.nextAttack > g.time);
});

test("hard picks the weakest defended building and pulls back a beaten attack", () => {
	const g = run(peaceful(skirmish({ difficulty: "hard" })), 200),
		T = g.enemyAi.teams[1],
		hq0 = g.hq(0);
	for (let i = 0; i < 8; i++) g.spawn("tank", 0, hq0.x + 60 + i * 25, hq0.y - 80);
	const outpost = g.spawn("depot", 0, g.W / 2, g.H / 2);
	T.nextAttack = g.time;
	T.think = 0;
	g.enemyAiTick(1 / 30);
	assert.ok(dist(T.attack.target, outpost) < 1);
	const group = T.attack.ids.map((id) => g.get(id));
	for (const e of group) {
		e.x = outpost.x;
		e.y = outpost.y;
		e.hp = e.maxHp * 0.2;
	}
	for (let i = 0; i < 6; i++) g.spawn("tank", 0, outpost.x + 40 + i * 20, outpost.y);
	T.think = 0;
	g.enemyAiTick(1 / 30);
	assert.equal(T.attack, null);
	assert.ok(group.every((e) => e.aiRole === "defend"));
});

test("normal and hard answer the player's army; easy does not", () => {
	const sample = (difficulty, playerType) => {
		const g = skirmish({ difficulty });
		g.entities = g.entities.filter((e) => e.team !== 0 || e.type === "hq");
		for (let i = 0; i < 10; i++) g.spawn(playerType, 0, 300 + i * 30, 300);
		const b = g.spawn("barracks", 1, g.hq(1).x, g.hq(1).y + 150),
			count = {};
		for (let i = 0; i < 400; i++) {
			const t = g.aiPickUnit(g.enemyAi.teams[1], RTS.AI_LEVELS[difficulty], b);
			count[t] = (count[t] || 0) + 1;
		}
		return count;
	};
	const hardVsTanks = sample("hard", "tank"),
		hardVsInfantry = sample("hard", "trooper"),
		easyVsTanks = sample("easy", "tank"),
		easyVsInfantry = sample("easy", "trooper");
	assert.ok(hardVsTanks.rocket > hardVsInfantry.rocket * 1.5);
	assert.ok(Math.abs(easyVsTanks.rocket - easyVsInfantry.rocket) < 60);
});

test("upgrades on schedule strengthen the side", () => {
	const g = peaceful(skirmish({ difficulty: "hard" })),
		T = g.enemyAi.teams[1];
	const a = g.spawn("tank", 1, 500, 500),
		b = g.spawn("tank", 0, 520, 500);
	const before = g.damage(a, b),
		taken = g.damage(b, a);
	T.upgrades = { weapons: true, armor: true };
	assert.ok(Math.abs(g.damage(a, b) / before - RTS.AI.weapons) < 1e-9);
	assert.ok(Math.abs(g.damage(b, a) / taken - RTS.AI.armor) < 1e-9);
	T.upgrades = {};
	T.metal = 5000;
	g.time = 600;
	T.think = 0;
	g.enemyAiTick(1 / 30);
	assert.deepEqual(Object.keys(T.upgrades).sort(), ["armor", "weapons"]);
});

test("sabotage of the command centre postpones that side's attack", () => {
	const g = skirmish({ players: 3 }),
		T = g.enemyAi.teams[1],
		before = T.nextAttack;
	g.delayAttack(1, 15);
	assert.equal(T.nextAttack, before + 15);
	assert.equal(g.enemyAi.teams[3].nextAttack < before + 15, true);
});

test("every enemy side runs its own commander", () => {
	const g = run(peaceful(skirmish({ players: 4, difficulty: "normal" })), 120);
	assert.deepEqual(Object.keys(g.enemyAi.teams).sort(), ["1", "3", "4"]);
	for (const team of [1, 3, 4]) {
		assert.ok(g.enemyAi.teams[team].mined > 0, "team " + team);
		assert.ok(own(g, team, "worker").length >= 4);
	}
});

test("modes: relays draw attacks to relays; expedition sends attackers for the artifact", () => {
	const r = run(peaceful(skirmish({ mode: "relays", difficulty: "normal" })), 200);
	r.nodes[0].owner = 0;
	const T = r.enemyAi.teams[1],
		rally = T.rally;
	for (let i = 0; i < 10; i++) g0(r.spawn("trooper", 1, rally.x + (i % 5) * 20, rally.y + Math.floor(i / 5) * 20));
	T.nextAttack = r.time;
	T.think = 0;
	r.enemyAiTick(1 / 30);
	assert.match(T.attack.target.name, /przekaźnik/);
	const x = run(peaceful(skirmish({ mode: "expedition", difficulty: "normal" })), 200),
		X = x.enemyAi.teams[1];
	for (let i = 0; i < 10; i++) g0(x.spawn("trooper", 1, X.rally.x + (i % 5) * 20, X.rally.y + Math.floor(i / 5) * 20));
	X.nextAttack = x.time;
	X.think = 0;
	x.enemyAiTick(1 / 30);
	assert.ok(own(x, 1).some((e) => e.expedition && e.aiRole === "expedition"));
});

test("the commander survives save and load; older saves keep the classic waves", () => {
	const g = run(skirmish({ difficulty: "hard" }), 90),
		back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.ok(back.aiActive());
	assert.deepEqual(back.enemyAi, JSON.parse(JSON.stringify(g.enemyAi)));
	run(back, 10);
	const broken = g.serialize();
	broken.enemyAi.teams[1].metal = "x";
	assert.throws(() => Game.fromSave(broken));
	const older = g.serialize();
	delete older.enemyAi;
	delete older.scenario.enemy;
	const legacy = Game.fromSave(older);
	assert.equal(legacy.scenario.enemy, "waves");
	assert.ok(!legacy.aiActive());
});

test("operation code carries the classic waves choice", () => {
	assert.equal(RTS.scenarioCode("horizon", { enemy: "waves" }), "horizon-M2N-C-NNN-0-W");
	assert.equal(RTS.parseScenarioCode("horizon-M2N-C-NNN-0-W").scenario.enemy, "waves");
	assert.equal(RTS.parseScenarioCode("horizon-M2N-C-NNN-0").scenario.enemy, "commander");
});

test("faction styles: the Dominium fortifies and hits rarely but hard, the Colonies harass and take relays", () => {
	for (const difficulty of ["easy", "normal", "hard"]) {
		const L = RTS.AI_LEVELS[difficulty],
			dom = skirmish({ difficulty, enemyFaction: "dominion" }).aiLevel(1),
			col = skirmish({ difficulty, enemyFaction: "colonies" }).aiLevel(1),
			swarm = skirmish({ difficulty, enemyFaction: "swarm" }).aiLevel(1);
		assert.equal(swarm, L, "the Swarm keeps the level");
		// Dominium: more towers, rarer and bigger attacks, fewer relays, no raids.
		assert.ok(dom.turrets.length > L.turrets.length, difficulty);
		assert.ok(dom.interval > L.interval && dom.firstAttack > L.firstAttack);
		assert.ok(dom.attackSize[2] > L.attackSize[2] && dom.minAttack > L.minAttack);
		assert.ok(dom.relayShare < L.relayShare && !dom.raids);
		// Colonies: frequent small attacks, more relays; raids and retreats from the normal level up.
		assert.ok(col.interval < L.interval && col.firstAttack < L.firstAttack);
		assert.ok(col.attackSize[2] < L.attackSize[2] && col.minAttack <= L.minAttack);
		assert.ok(col.relayShare > L.relayShare);
		assert.equal(col.raids, difficulty !== "easy");
		assert.equal(col.retreat, difficulty !== "easy");
		assert.ok(col.units.raider > 1 && dom.units.sentinel > 1);
	}
	assert.equal(skirmish({ difficulty: "normal" }).aiLevel(), RTS.AI_LEVELS.normal, "without a team: the plain level");
});

test("faction styles in play: the Dominium raises more towers, the Colonies send raiders at the workers", () => {
	const count = (g, type) => own(g, 1, type).length;
	const dom = run(peaceful(skirmish({ difficulty: "normal", enemyFaction: "dominion" })), 420),
		col = run(peaceful(skirmish({ difficulty: "normal", enemyFaction: "colonies" })), 420);
	assert.ok(count(dom, "turret") > count(col, "turret"), `towers: Dominium ${count(dom, "turret")}, Colonies ${count(col, "turret")}`);
	// The production mix (sampled): the Dominium's factory prefers bastions and heavy machines, the Colonies' barracks
	// scouts; the Dominium trains no scouts at all.
	const mix = (g, type) => {
		const T = g.enemyAi.teams[1],
			L = g.aiLevel(1),
			producer = own(g, 1, type)[0],
			n = {};
		for (let i = 0; i < 400; i++) {
			const u = g.aiPickUnit(T, L, producer);
			n[u] = (n[u] || 0) + 1;
		}
		return n;
	};
	const domFactory = mix(dom, "factory"),
		colBarracks = mix(col, "barracks"),
		domBarracks = mix(dom, "barracks");
	assert.ok((domFactory.sentinel || 0) + (domFactory.heavy || 0) > 400 * 0.35, JSON.stringify(domFactory));
	assert.ok((colBarracks.raider || 0) > 400 * 0.3, JSON.stringify(colBarracks));
	assert.equal(domBarracks.raider || 0, 0);
	// Raids: the Colonies' fast units go for a worker mining away from the player's base.
	const g = run(peaceful(skirmish({ difficulty: "normal", enemyFaction: "colonies" })), 240),
		T = g.enemyAi.teams[1],
		hq1 = g.hq(1);
	for (let i = 0; i < 3; i++) g0(g.spawn("raider", 1, hq1.x + 120 + i * 30, hq1.y + 120));
	const ore = [...g.ores].sort((a, b) => dist(b, g.hq(0)) - dist(a, g.hq(0)))[0],
		w = g.spawn("worker", 0, ore.x + 30, ore.y);
	g.gather([w.id], ore.id);
	T.raidAt = g.time;
	T.think = 0;
	g.enemyAiTick(1 / 30);
	assert.ok(own(g, 1).some((e) => e.aiRole === "raid"), "raiders sent");
	assert.ok(T.raidAt >= g.time + 50 && T.raidAt <= g.time + 60, "next raid after the style's interval");
});
