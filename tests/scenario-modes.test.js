const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, MAP_SIZES, dist, CELL } = RTS;
const skirmish = (opts, map = "horizon") => {
	const g = new Game(42, map);
	g.configureSkirmish(opts);
	return g;
};
const quiet = (g) => {
	g.entities = g.entities.filter((e) => e.team === 0 || e.type === "hq");
	g.nextWave = 1e9;
	return g;
};

test("every scenario map generates a valid layout for each size and player count", () => {
	for (const map of Object.keys(RTS.MISSIONS).filter(
		(id) => !RTS.MISSIONS[id].campaign,
	))
		for (const size of ["small", "medium", "large"])
			for (const players of [2, 4]) {
				const g = skirmish({ size, players }, map),
					label = map + " " + size + " " + players;
				assert.equal(g.W, MAP_SIZES[size].w, label);
				assert.equal(g.H, MAP_SIZES[size].h, label);
				assert.equal(
					g.explored.length,
					((g.W / CELL) * g.H) / CELL,
					label,
				);
				assert.equal(g.nodes.length, MAP_SIZES[size].relays, label);
				for (const e of g.entities)
					assert.ok(
						!g.blocked(e.x, e.y, 8) &&
							e.x > 0 &&
							e.y > 0 &&
							e.x < g.W &&
							e.y < g.H,
						label + " " + e.type,
					);
				for (const o of [
					...g.ores,
					...g.gasFields,
					...g.crystalFields,
					...g.nodes,
				])
					assert.equal(g.blocked(o.x, o.y, 30), false, label);
				const hqs = g.entities.filter((e) => e.type === "hq");
				assert.equal(hqs.length, players, label);
				for (const t of g.entities.filter((e) => TYPES[e.type].threat))
					assert.ok(
						hqs.every((h) => dist(h, t) > 480),
						label + " threat",
					);
				for (const b of [...hqs.slice(1), ...g.nodes])
					assert.ok(g.pathTo(hqs[0], b).length, label + " route");
			}
});

test("large maps gain extra deposits, terrain and habitats; default stays the original medium map", () => {
	const medium = skirmish({}),
		large = skirmish({ size: "large" });
	assert.deepEqual(
		[medium.W, medium.H, medium.scenario.size, medium.scenario.mode],
		[3360, 2160, "medium", "conquest"],
	);
	assert.ok(
		large.ores.length > medium.ores.length &&
			large.crystalFields.length > medium.crystalFields.length &&
			large.gasFields.length > medium.gasFields.length,
	);
	assert.ok(large.obstacles.length > medium.obstacles.length);
	assert.ok(
		large.entities.filter((e) => TYPES[e.type].threat).length >
			medium.entities.filter((e) => TYPES[e.type].threat).length,
	);
	assert.equal(new Game(42, "colony1").W, 3360);
});

test("saves keep map size and mode; old saves load as medium conquest", () => {
	const g = skirmish({ size: "large", mode: "relays", players: 3 });
	g.tick(0.1);
	const r = Game.fromSave(g.serialize());
	assert.deepEqual(
		[r.W, r.H, r.scenario.size, r.scenario.mode, r.nodes.length],
		[4480, 2880, "large", "relays", 14],
	);
	assert.equal(r.explored.length, g.explored.length);
	assert.equal(r.modeState.target, 14 * 90);
	const old = skirmish({}).serialize();
	delete old.W;
	delete old.H;
	delete old.modeState;
	delete old.scenario.size;
	delete old.scenario.mode;
	const o = Game.fromSave(old);
	assert.deepEqual(
		[o.W, o.scenario.size, o.scenario.mode],
		[3360, "medium", "conquest"],
	);
	const broken = g.serialize();
	broken.scenario.size = "small";
	assert.throws(() => Game.fromSave(broken), /rozmiar/);
});

test("relay mode: each held relay scores a point per second; first to the target wins", () => {
	const g = quiet(skirmish({ mode: "relays" }));
	const s = g.modeState;
	assert.equal(s.target, g.nodes.length * 90);
	g.nodes[0].owner = 0;
	g.nodes[1].owner = 0;
	g.nodes[2].owner = 1;
	for (let i = 0; i < 10; i++) g.tick(0.1);
	assert.ok(Math.abs(s.scores[0] - 2) < 0.05);
	assert.ok(Math.abs(s.scores[1] - 1) < 0.05);
	assert.match(g.modeStatus(), /Punkty kontroli: Ty 2/);
	s.scores[0] = s.target - 0.05;
	g.tick(0.1);
	assert.equal(g.result, "victory");
	assert.match(g.modeResult(), /punktów kontroli/);
	const lost = quiet(skirmish({ mode: "relays" }));
	lost.nodes[0].owner = 1;
	lost.modeState.scores[1] = lost.modeState.target - 0.01;
	lost.tick(0.1);
	assert.equal(lost.result, "defeat");
	assert.match(lost.modeResult(), /Dominium/);
});

test("relay mode sends most of each wave toward relays (classic waves)", () => {
	const g = skirmish({ mode: "relays", enemy: "waves" });
	g.entities = g.entities.filter((e) => e.team === 0 || e.type === "hq");
	g.nextWave = g.time + 0.05;
	g.tick(0.1);
	const wave = g.entities.filter((e) => e.team === 1 && TYPES[e.type].speed);
	assert.ok(wave.length >= 5);
	const toRelays = wave.filter((e) =>
		g.nodes.some((n) => dist(n, e.order) < 1),
	).length;
	assert.ok(
		toRelays >= Math.floor(wave.length / 2),
		toRelays + "/" + wave.length,
	);
});

test("defense mode: stronger start and waves; surviving the timer wins (classic waves)", () => {
	const conquest = skirmish({ enemy: "waves" }),
		g = skirmish({ mode: "defense", enemy: "waves" });
	assert.equal(g.credits, conquest.credits + 500);
	assert.equal(
		g.entities.filter((e) => e.team === 0 && e.type === "turret").length,
		2,
	);
	g.entities = g.entities.filter((e) => e.team === 0 || e.type === "hq");
	g.nextWave = g.time + 0.05;
	const base = Math.min(4 + 1, 13);
	g.tick(0.1);
	assert.equal(
		g.entities.filter((e) => e.team === 1 && TYPES[e.type].speed).length,
		base + Math.ceil(base * 0.25),
	);
	quiet(g);
	g.time = 599.95;
	g.tick(0.1);
	assert.equal(g.result, "victory");
	assert.match(g.modeResult(), /10 minut/);
	const lost = skirmish({ mode: "defense" });
	lost.time = 300;
	lost.applyDamage(lost.hq(1) || lost.hq(0), lost.hq(0), 1e6);
	assert.equal(lost.result, "defeat");
	assert.equal(lost.modeResult(), null);
});
