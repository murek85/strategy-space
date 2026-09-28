const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, MISSIONS, MAP_SIZES, dist } = RTS;
const maps = Object.keys(MISSIONS).filter((id) => !MISSIONS[id].campaign);
const skirmish = (opts, map = "horizon") => {
	const g = new Game(42, map);
	g.configureSkirmish(opts);
	return g;
};
const layout = (g) => JSON.stringify([g.ores, g.gasFields, g.crystalFields, g.obstacles, g.nodes.map((n) => [n.x, n.y]), g.entities.map((e) => [e.type, e.team, Math.round(e.x), Math.round(e.y)])]);
const quiet = (g) => {
	g.nextWave = 1e9;
	return g;
};

test("a map seed gives a repeatable, different and valid layout on every map", () => {
	for (const map of maps)
		for (const size of ["small", "medium", "large"]) {
			const a = skirmish({ size, players: 4, seed: 4242 }, map),
				b = skirmish({ size, players: 4, seed: 4242 }, map),
				c = skirmish({ size, players: 4, seed: 99 }, map),
				classic = skirmish({ size, players: 4 }, map),
				label = map + " " + size;
			assert.equal(layout(a), layout(b), label + " repeatable");
			assert.notEqual(layout(a), layout(c), label + " seeds differ");
			assert.notEqual(layout(a), layout(classic), label + " differs from classic");
			assert.ok(a.layoutVaried, label + " varied");
			assert.equal(a.nodes.length, classic.nodes.length, label + " relays");
			const reach = a.reachable(a.hq(0));
			for (const h of a.entities.filter((e) => e.type === "hq")) {
				assert.ok(reach(h), label + " bases connected");
				assert.ok(a.ores.some((o) => reach(o) && dist(o, h) < 700), label + " metal near base");
			}
			for (const n of a.nodes) assert.ok(reach(n), label + " relay reachable");
			for (const e of a.entities) assert.ok(!a.blocked(e.x, e.y, 8), label + " " + e.type);
		}
});

test("no seed keeps the classic layout", () => {
	assert.equal(layout(skirmish({ seed: 0 })), layout(skirmish({})));
	assert.equal(skirmish({ seed: "" }).scenario.seed, 0);
	assert.equal(skirmish({ seed: 12345678 }).scenario.seed, 999999);
});

test("defence time and relay points are configurable", () => {
	const d = skirmish({ mode: "defense", defenseTime: 300 });
	assert.equal(d.modeState.duration, 300);
	assert.match(d.modeObjective(), /5 min/);
	quiet(d).time = 299;
	d.tick(1 / 30);
	assert.equal(d.result, null);
	d.time = 300;
	d.tick(1 / 30);
	assert.equal(d.result, "victory");
	const r = skirmish({ mode: "relays", pointsPerRelay: 150 });
	assert.equal(r.modeState.target, r.nodes.length * 150);
	assert.match(RTS.describeScenario(r.scenario).description, /150 pkt na przekaźnik/);
	assert.equal(skirmish({ mode: "defense", defenseTime: 17 }).modeState.duration, 600, "invalid values fall back");
});

test("deposit, fauna and weather settings change the map", () => {
	const base = skirmish({ seed: 5 }),
		rich = skirmish({ seed: 5, resources: "rich" }),
		poor = skirmish({ seed: 5, resources: "poor" });
	const total = (g) => [...g.ores, ...g.gasFields, ...g.crystalFields].reduce((n, o) => n + o.amount, 0);
	assert.ok(Math.abs(total(rich) / total(base) - 1.5) < 0.01);
	assert.ok(Math.abs(total(poor) / total(base) - 0.65) < 0.01);
	const animals = (g) => g.entities.filter((e) => e.team === 2 && e.home).length;
	assert.ok(animals(skirmish({ fauna: "few" })) < animals(skirmish({})));
	assert.ok(animals(skirmish({ fauna: "many" })) > animals(skirmish({})));
	const storms = (weather) => {
		const g = skirmish({ weather });
		let n = 0;
		for (g.time = 0; g.time < 1200; g.time += 5) n += g.weather.intensity;
		return n;
	};
	assert.ok(storms("calm") < storms("normal") && storms("normal") < storms("harsh"));
});

test("presets fill the settings and are recognised", () => {
	for (const [key, p] of Object.entries(RTS.SCENARIO_PRESETS)) {
		const s = RTS.applyPreset({ name: "X" }, key);
		assert.equal(RTS.presetFor(s), key, p.name);
		skirmish(s);
	}
	assert.equal(RTS.presetFor({ ...RTS.SCENARIO_PRESETS.war.settings, players: 3 }), "custom");
	assert.equal(RTS.SCENARIO_PRESETS.danger.settings.mode, "expedition");
});

test("operation codes round-trip every setting", () => {
	const s = { size: "large", players: 3, difficulty: "hard", mode: "relays", pointsPerRelay: 120, resources: "rich", fauna: "few", weather: "harsh", seed: 31337 };
	const code = RTS.scenarioCode("magma", s);
	assert.equal(code, "magma-L3H-R120-RFH-31337");
	const parsed = RTS.parseScenarioCode(code.toLowerCase());
	assert.equal(parsed.missionId, "magma");
	for (const [k, v] of Object.entries(s)) assert.equal(parsed.scenario[k], v, k);
	assert.equal(RTS.parseScenarioCode("horizon-M2N-D15-NNN-0").scenario.defenseTime, 900);
	assert.equal(RTS.parseScenarioCode("horizon-M2N-X-NNN-7").scenario.mode, "expedition");
	for (const bad of ["", "colony1-M2N-C-NNN-1", "horizon-M2N-R77-NNN-1", "horizon-M5N-C-NNN-1", "nowhere-M2N-C-NNN-1"]) assert.equal(RTS.parseScenarioCode(bad), null, bad);
});

test("expedition: the artifact site is far from every base and guarded", () => {
	for (const map of maps)
		for (const players of [2, 4]) {
			const g = skirmish({ mode: "expedition", players }, map),
				a = g.modeState.artifact,
				bases = g.entities.filter((e) => e.type === "hq");
			assert.ok(!g.blocked(a.x, a.y, 40), map);
			assert.ok(g.reachable(g.hq(0))(a), map + " reachable");
			assert.ok(Math.min(...bases.map((b) => dist(b, a))) > 900, map + " far from bases");
			assert.equal(g.entities.filter((e) => e.guardian && TYPES[e.type].threat).length, RTS.EXPEDITION.guardians, map + " guardians");
		}
});

test("expedition: pick up, slower carrier, drop on death and deliver to win", () => {
	const g = quiet(skirmish({ mode: "expedition" })),
		a = g.modeState.artifact;
	g.entities = g.entities.filter((e) => !e.guardian);
	const u = g.spawn("trooper", 0, a.x + 10, a.y);
	const speed = g.movementFactor(u);
	for (let i = 0; i < 30 * (RTS.EXPEDITION.pickup - 1); i++) g.tick(1 / 30);
	assert.equal(a.carrier, null, "still picking up");
	for (let i = 0; i < 45; i++) g.tick(1 / 30);
	assert.equal(a.carrier, u.id);
	assert.ok(Math.abs(g.movementFactor(u) - speed * 0.7) < 1e-9);
	assert.match(g.modeStatus(), /Artefakt niesie: Ty/);
	// An enemy nearby stops a pick-up; a killed carrier drops the artifact where it fell.
	u.hp = 0;
	g.tick(1 / 30);
	assert.equal(a.carrier, null);
	assert.match(g.modeStatus(), /Artefakt porzucony|Artefakt na wykopalisku/);
	const rival = g.spawn("trooper", 1, a.x - 20, a.y),
		v = g.spawn("trooper", 0, a.x + 20, a.y);
	g.expeditionTick(1);
	g.expeditionTick(1);
	assert.equal(a.progress, 0, "contested");
	g.entities = g.entities.filter((e) => e !== rival);
	for (let i = 0; i < RTS.EXPEDITION.pickup + 1; i++) g.expeditionTick(1);
	assert.equal(a.carrier, v.id);
	// Reaching the command centre wins.
	const hq = g.hq(0);
	v.x = hq.x + 90;
	v.y = hq.y;
	g.tick(1 / 30);
	assert.equal(g.result, "victory");
	assert.match(g.modeResult(), /Artefakt obcych dotarł/);
});

test("expedition: an enemy carrier heads home and its delivery is a defeat", () => {
	const g = quiet(skirmish({ mode: "expedition" })),
		a = g.modeState.artifact;
	g.entities = g.entities.filter((e) => !e.guardian);
	const e = g.spawn("trooper", 1, a.x, a.y + 10);
	e.expedition = true;
	for (let i = 0; i < 30 * (RTS.EXPEDITION.pickup + 1); i++) g.tick(1 / 30);
	assert.equal(a.carrier, e.id);
	const home = g.nearestHq(1, e);
	assert.equal(e.order.kind, "move");
	assert.ok(dist(e.order, home) < 5);
	e.x = home.x + 100;
	e.y = home.y;
	g.tick(1 / 30);
	assert.equal(g.result, "defeat");
});

test("expedition: enemy waves and an early party go for the artifact (classic waves)", () => {
	const g = skirmish({ mode: "expedition", enemy: "waves" }),
		a = g.modeState.artifact;
	g.time = RTS.EXPEDITION.aiStart;
	g.nextWave = 1e9;
	g.tick(1 / 30);
	const party = g.entities.filter((e) => e.expedition);
	assert.ok(party.length > 0 && party.length <= RTS.EXPEDITION.aiParty && party.every((e) => e.team === 1));
	assert.ok(party.every((e) => e.order?.kind === "attackMove" && dist(e.order, a) < 100));
	const wave = g.wave;
	g.nextWave = g.time;
	for (let i = 0; i < 10 && g.wave === wave; i++) g.tick(1 / 30);
	assert.ok(g.entities.filter((e) => e.expedition).length > party.length);
});

test("expedition and settings survive save and load", () => {
	const g = quiet(skirmish({ mode: "expedition", seed: 321, weather: "harsh", fauna: "many", resources: "rich" })),
		a = g.modeState.artifact;
	g.entities = g.entities.filter((e) => !e.guardian);
	const u = g.spawn("tank", 0, a.x, a.y);
	for (let i = 0; i < 30 * (RTS.EXPEDITION.pickup + 1); i++) g.tick(1 / 30);
	assert.equal(a.carrier, u.id);
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.equal(back.modeState.artifact.carrier, u.id);
	assert.equal(back.scenario.seed, 321);
	assert.equal(back.scenario.weather, "harsh");
	assert.equal(back.movementFactor(back.get(u.id)), g.movementFactor(u));
	const broken = g.serialize();
	broken.modeState.artifact.x = "x";
	assert.throws(() => Game.fromSave(broken));
	// Saves from before these settings load with the defaults.
	const older = skirmish({ mode: "defense" }).serialize();
	for (const k of ["seed", "defenseTime", "pointsPerRelay", "resources", "fauna", "weather"]) delete older.scenario[k];
	const loaded = Game.fromSave(older);
	assert.equal(loaded.scenario.defenseTime, 600);
	assert.equal(loaded.modeState.duration, 600);
});
