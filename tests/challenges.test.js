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

test("day length: short and long cycles, or no night at all", () => {
	const at = (dayLength, t) => {
		const g = skirmish({ dayLength });
		g.time = t;
		return g.night;
	};
	// Midnight falls at half the period.
	assert.equal(at("short", 120), 1);
	assert.equal(at("long", 300), 1);
	assert.equal(at("normal", 180), 1);
	assert.ok(at("short", 180) < 1 && at("long", 180) < 1, "other periods differ at the default midnight");
	assert.ok(at("short", 0) === 0 && at("long", 0) === 0);
	for (const t of [0, 90, 180, 300, 500]) assert.equal(at("day", t), 0);
	// Unchanged default.
	const g = skirmish({});
	g.time = 180;
	assert.equal(g.night, 1);
});

test("start level: a colony start lets the player build a factory at once; the commander builds its factory earlier", () => {
	const outpost = skirmish({}),
		colony = skirmish({ startLevel: "colony" });
	assert.ok(outpost.developmentRequirement("factory"));
	assert.equal(colony.developmentRequirement("factory"), "");
	assert.equal(colony.centerLevel(), 2);
	const wantsAt = (g, t) => {
		g.time = t;
		return g.aiWants(g.enemyAi.teams[1], RTS.AI_LEVELS.normal).includes("factory");
	};
	assert.ok(!wantsAt(skirmish({}), 100) && wantsAt(skirmish({ startLevel: "colony" }), 100));
});

test("king of the hill: the central relay is the hill; holding it long enough wins", () => {
	const g = skirmish({ mode: "hill", hillTime: 90, enemy: "waves" });
	g.nextWave = 1e9;
	const hill = g.hillNode(),
		centre = { x: g.W / 2, y: g.H / 2 };
	assert.ok(hill && hill.name === "SZCZYT");
	assert.ok(g.nodes.every((n) => dist(n, centre) >= dist(hill, centre)));
	assert.equal(g.modeState.target, 90);
	assert.match(g.modeObjective(), /1\.5 min/);
	hill.owner = 0;
	g.entities = g.entities.filter((e) => e.team === 0 || e.type === "hq");
	for (let i = 0; i < 30 * 89 && !g.result; i++) g.tick(1 / 30);
	assert.equal(g.result, null);
	assert.match(g.modeStatus(), /Szczyt: Twój/);
	run(g, 2);
	assert.equal(g.result, "victory");
	assert.match(g.modeResult(), /Szczyt w Twoich rękach/);
	const lost = skirmish({ mode: "hill", hillTime: 90, enemy: "waves" });
	lost.nextWave = 1e9;
	lost.hillNode().owner = 1;
	lost.entities = lost.entities.filter((e) => e.team === 1 || e.type === "hq");
	run(lost, 92);
	assert.equal(lost.result, "defeat");
});

test("king of the hill: the commander sends its squad and attacks to the hill", () => {
	const g = skirmish({ mode: "hill", difficulty: "normal" }),
		T = g.enemyAi.teams[1],
		hill = g.hillNode();
	T.nextAttack = 1e9;
	run(g, 180);
	assert.equal(hill.owner, 1, "the commander takes the hill");
	assert.ok(g.entities.some((e) => e.team === 1 && e.aiRole === "relay" && dist(e, hill) < 200), "and keeps a squad on it");
	hill.owner = 0;
	assert.equal(g.aiTarget(T, RTS.AI_LEVELS.normal, T.rally).name, "Szczyt");
});

test("survival: no enemy base, growing waves from the edges, result and record", () => {
	const g = skirmish({ mode: "survival", players: 4 });
	assert.equal(g.enemyBases().length, 0);
	assert.ok(!g.aiActive());
	assert.equal(g.scenario.enemy, "waves");
	assert.equal(g.entities.filter((e) => e.team !== 0 && e.team !== 2).length, 0);
	assert.equal(g.nextWave, RTS.SURVIVAL.first);
	g.time = RTS.SURVIVAL.first;
	g.tick(1 / 30);
	assert.equal(g.wave, 1);
	const first = g.entities.filter((e) => e.team === 1);
	assert.equal(first.length, RTS.SURVIVAL.base);
	const hq = g.hq(0);
	assert.ok(first.every((e) => dist(e, hq) > 800 && e.order?.kind === "attackMove"));
	for (let n = 2; n <= 6; n++) {
		g.time = g.modeState.next;
		g.tick(1 / 30);
	}
	assert.equal(g.wave, 6);
	assert.ok(g.entities.some((e) => e.team === 1 && e.type === "heavy"), "heavy machines from wave 6");
	assert.ok(g.modeState.next - g.time >= RTS.SURVIVAL.minInterval);
	// Never a victory; the result names time and waves.
	hq.hp = 0;
	g.applyDamage(null, hq, 1);
	g.result = "defeat";
	assert.match(g.modeResult(), /Przetrwano .* 5 pełnych fal/);
	// Records per map and level.
	const store = new Map(),
		storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
	assert.equal(RTS.recordSurvival(storage, g).isNew, true);
	const worse = skirmish({ mode: "survival" });
	worse.time = 10;
	assert.equal(RTS.recordSurvival(storage, worse).isNew, false);
	assert.equal(RTS.survivalBest(storage, "horizon", "normal").wave, 6);
	assert.equal(RTS.survivalBest(storage, "horizon", "hard"), null);
});

test("survival waves scale with the level", () => {
	const count = (difficulty) => {
		const g = skirmish({ mode: "survival", difficulty });
		for (let n = 0; n < 5; n++) {
			g.time = g.modeState.next;
			g.tick(1 / 30);
		}
		return g.entities.filter((e) => e.team === 1).length;
	};
	assert.ok(count("easy") < count("normal") && count("normal") < count("hard"));
});

test("operation codes carry the new modes and settings; older codes stay valid", () => {
	const s = { mode: "hill", hillTime: 300, dayLength: "long", startLevel: "colony" },
		code = RTS.scenarioCode("lumen", s);
	assert.equal(code, "lumen-M2N-H300-NNNLC-0");
	const back = RTS.parseScenarioCode(code).scenario;
	assert.equal(back.mode, "hill");
	assert.equal(back.hillTime, 300);
	assert.equal(back.dayLength, "long");
	assert.equal(back.startLevel, "colony");
	assert.equal(RTS.parseScenarioCode("lumen-M2N-V-NNN-0").scenario.mode, "survival");
	assert.equal(RTS.parseScenarioCode("lumen-M2N-C-NNN-0").scenario.dayLength, "normal");
	assert.equal(RTS.parseScenarioCode("lumen-M2N-H77-NNN-0"), null);
});

test("hill and survival survive save and load", () => {
	const h = run(skirmish({ mode: "hill" }), 5),
		hb = Game.fromSave(JSON.parse(JSON.stringify(h.serialize())));
	assert.ok(hb.hillNode());
	assert.equal(hb.scenario.hillTime, 180);
	const s = skirmish({ mode: "survival", dayLength: "day" });
	s.time = RTS.SURVIVAL.first;
	s.tick(1 / 30);
	const sb = Game.fromSave(JSON.parse(JSON.stringify(s.serialize())));
	assert.equal(sb.modeState.next, s.modeState.next);
	assert.equal(sb.night, 0);
	const broken = s.serialize();
	broken.modeState.next = "x";
	assert.throws(() => Game.fromSave(broken));
});
