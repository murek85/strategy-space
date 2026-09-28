const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;
const duo = (opts = {}, map = "horizon") => {
	const g = new Game(42, map);
	g.configureSkirmish({ teams: "duo", ...opts });
	return g;
};
const run = (g, seconds) => {
	for (let i = 0; i < seconds * 30 && !g.result; i++) g.tick(1 / 30);
	return g;
};
const peaceful = (g) => {
	for (const T of Object.values(g.enemyAi?.teams || {})) T.nextAttack = 1e9;
	g.nextWave = 1e9;
	return g;
};

test("2 vs 2: four bases, the player and the ally on one edge, the enemies on the other", () => {
	for (const map of ["horizon", "lumen", "magma"]) {
		const g = duo({ players: 2 }, map);
		assert.equal(g.scenario.players, 4);
		assert.equal(g.scenario.teams, "duo");
		const [p, a, e1, e4] = [0, 3, 1, 4].map((t) => g.hq(t));
		assert.ok(p && a && e1 && e4, map);
		assert.ok(dist(p, a) < dist(p, e1) && dist(e1, e4) < dist(p, e1), map + " sides");
		assert.ok(g.allied(0, 3) && g.allied(1, 4) && !g.allied(0, 1) && !g.allied(3, 4));
		assert.deepEqual(g.enemyBases().map((b) => b.team).sort(), [1, 4]);
		assert.deepEqual(Object.keys(g.enemyAi.teams).sort(), ["1", "3", "4"]);
	}
	assert.equal(new Game(42, "horizon").alliances, null);
	const survival = new Game(42, "horizon");
	survival.configureSkirmish({ teams: "duo", mode: "survival" });
	assert.equal(survival.alliances, null, "no teams in survival");
});

test("allies never fire at each other and share vision", () => {
	const g = peaceful(duo()),
		ally = g.hq(3),
		me = g.spawn("tank", 0, ally.x - 150, ally.y + 100),
		friend = g.spawn("tank", 3, ally.x - 120, ally.y + 100),
		foe = g.spawn("tank", 4, ally.x - 90, ally.y + 140);
	assert.equal(g.canTarget(me, friend), false);
	assert.equal(g.canTarget(friend, me), false);
	assert.ok(g.canTarget(me, foe) && g.canTarget(friend, foe));
	const e1 = g.spawn("trooper", 1, 50, 50),
		e4 = g.spawn("trooper", 4, 60, 50);
	assert.equal(g.canTarget(e1, e4), false, "the enemies are allied too");
	g.updateVision();
	assert.ok(g.isVisible(ally.x, ally.y), "the ally's base is visible");
});

test("relays taken by the ally belong to the player's side; mixed squads do not stall", () => {
	const g = peaceful(duo()),
		n = g.nodes[0];
	// Only the capture rules: no commanders moving the test units away.
	g.enemyAi = null;
	g.entities = g.entities.filter((e) => !TYPES[e.type].speed && e.team !== 2);
	g.spawn("trooper", 3, n.x + 20, n.y);
	g.spawn("trooper", 0, n.x - 20, n.y);
	run(g, 8);
	assert.equal(n.owner, 0);
	const m = g.nodes[1];
	g.spawn("trooper", 1, m.x + 20, m.y);
	g.spawn("trooper", 4, m.x - 20, m.y);
	run(g, 8);
	assert.equal(m.owner, 1, "enemy side leader");
});

test("victory needs both enemy command centres; losing the ally is not a defeat", () => {
	const g = peaceful(duo());
	g.applyDamage(null, g.hq(3), 1e6);
	g.tick(1 / 30);
	assert.equal(g.result, null);
	g.applyDamage(null, g.hq(1), 1e6);
	assert.equal(g.result, null);
	g.applyDamage(null, g.hq(4), 1e6);
	assert.equal(g.result, "victory");
	const lost = peaceful(duo());
	lost.applyDamage(null, lost.hq(0), 1e6);
	assert.equal(lost.result, "defeat");
});

test("commanders pick targets on the other side; the ally attacks enemies", () => {
	const g = peaceful(duo({ difficulty: "normal" }));
	run(g, 120);
	const ally = g.enemyAi.teams[3],
		enemy = g.enemyAi.teams[1];
	assert.deepEqual(g.aiFoes(3).sort(), [1, 4]);
	assert.deepEqual(g.aiFoes(1).sort(), [0, 3]);
	const t3 = g.aiTarget(ally, RTS.AI_LEVELS.normal, ally.rally),
		t1 = g.aiTarget(enemy, RTS.AI_LEVELS.normal, enemy.rally),
		ownerOf = (t) => g.entities.find((e) => e.id === t.id)?.team;
	assert.ok([1, 4].includes(ownerOf(t3)));
	assert.ok([0, 3].includes(ownerOf(t1)));
	// Only the enemy's attacks count for the HUD.
	for (let i = 0; i < 12; i++) g.spawn("trooper", 3, ally.rally.x + i * 8, ally.rally.y).aiRole = "defend";
	ally.nextAttack = g.time;
	ally.think = 0;
	const wave = g.wave;
	g.enemyAiTick(1 / 30);
	assert.ok(ally.attack);
	assert.equal(g.wave, wave);
	assert.ok(g.events.some((m) => m.startsWith("Sojusznik atakuje")));
	assert.ok(g.nextWave < 1e8 || g.nextWave === g.aiNextAttack());
});

test("expedition: the ally can pick up and deliver the artifact for the side", () => {
	const g = peaceful(duo({ mode: "expedition" })),
		a = g.modeState.artifact;
	g.entities = g.entities.filter((e) => !e.guardian);
	const mine = g.spawn("trooper", 0, a.x + 10, a.y),
		friend = g.spawn("trooper", 3, a.x - 10, a.y);
	for (let i = 0; i < RTS.EXPEDITION.pickup + 1; i++) g.expeditionTick(1);
	assert.ok([mine.id, friend.id].includes(a.carrier), "no stall between allies");
	const carrier = g.get(a.carrier),
		home = g.nearestHq(carrier.team, carrier);
	carrier.x = home.x + 90;
	carrier.y = home.y;
	g.expeditionTick(1 / 30);
	assert.equal(g.result, "victory");
});

test("the operation code and saves keep the teams", () => {
	const code = RTS.scenarioCode("horizon", { teams: "duo", players: 4 });
	assert.equal(code, "horizon-M4N-C-NNN-0-T");
	assert.equal(RTS.parseScenarioCode(code).scenario.teams, "duo");
	assert.equal(RTS.parseScenarioCode("horizon-M4N-C-NNN-0-T-W").scenario.enemy, "waves");
	const g = run(duo(), 3),
		back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.deepEqual(back.alliances, g.alliances);
	assert.equal(back.scenario.teams, "duo");
	assert.ok(back.allied(0, 3));
	const broken = g.serialize();
	broken.alliances = { 0: "x" };
	assert.throws(() => Game.fromSave(broken));
});
