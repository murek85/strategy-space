const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, dist } = RTS;
const skirmish = (opts = {}, map = "horizon") => {
	const g = new Game(42, map);
	g.configureSkirmish(opts);
	return g;
};
const run = (g, seconds) => {
	for (let i = 0; i < seconds * 30 && !g.result; i++) g.tick(1 / 30);
	return g;
};
const peaceful = (g) => {
	for (const T of Object.values(g.enemyAi.teams)) T.nextAttack = 1e9;
	return g;
};
// A free spot far from both command centres.
const far = (g) => {
	const a = g.hq(0),
		b = g.hq(1);
	for (let y = 120; y < g.H - 120; y += 40)
		for (let x = 120; x < g.W - 120; x += 40) {
			const p = { x, y };
			if (dist(p, a) > 900 && dist(p, b) > 1100 && !g.blocked(x, y, 40)) return p;
		}
	return null;
};

test("the commander starts knowing only the enemy's starting base", () => {
	const g = skirmish({ difficulty: "normal" }),
		known = g.aiKnown(1);
	assert.ok(known.some((s) => s.type === "hq" && s.team === 0), "the player's command centre is known");
	assert.ok(known.every((s) => s.team === 0));
	// A building put up later, out of its sight, stays unknown.
	const p = far(g),
		tower = g.spawn("turret", 0, p.x, p.y);
	g.aiVision(1, true);
	assert.ok(!g.aiSees(1, p.x, p.y));
	assert.ok(!g.aiKnown(1).some((s) => s.id === tower.id));
	// Once a unit of its own comes near, it is learnt — and remembered after the unit leaves.
	const scout = g.spawn("drone", 1, p.x + 40, p.y + 40);
	g.aiVision(1, true);
	assert.ok(g.aiKnown(1).some((s) => s.id === tower.id));
	scout.hp = 0;
	g.entities = g.entities.filter((e) => e.hp > 0);
	g.aiVision(1, true);
	assert.ok(g.aiKnown(1).some((s) => s.id === tower.id), "remembered out of sight");
	// Destroyed while unseen: still remembered; seen gone: forgotten.
	tower.hp = 0;
	g.entities = g.entities.filter((e) => e.hp > 0);
	g.aiVision(1, true);
	assert.ok(g.aiKnown(1).some((s) => s.id === tower.id));
	g.spawn("drone", 1, p.x + 40, p.y + 40);
	g.aiVision(1, true);
	assert.ok(!g.aiKnown(1).some((s) => s.id === tower.id));
});

test("attack targets come from what it knows; threats and the army mix from what it sees", () => {
	const g = peaceful(skirmish({ difficulty: "hard" })),
		T = g.enemyAi.teams[1],
		L = g.aiLevel(1);
	const p = far(g),
		hidden = g.spawn("barracks", 0, p.x, p.y);
	// An unknown, undefended building is not chosen, however tempting.
	const t = g.aiTarget(T, L, T.rally);
	assert.ok(t && t.id !== hidden.id);
	assert.ok(g.aiKnown(1).some((s) => s.id === t.id));
	// The army it has not seen does not shape its production; once seen, it does.
	for (let i = 0; i < 10; i++) g.spawn("tank", 0, p.x + 60 + i * 25, p.y + 60);
	g.aiVision(1, true);
	assert.equal(Object.keys(g.enemyAi.teams[1].intel.army).length, 0);
	g.spawn("drone", 1, p.x + 120, p.y + 40);
	g.aiVision(1, true);
	assert.ok(g.enemyAi.teams[1].intel.army.tank >= 10);
	assert.equal(g.aiPlayerArmy(1).filter((e) => e.type === "tank").length, 10);
});

test("a scout goes out to the places it has not seen for longest, and the knowledge survives saving", () => {
	const g = peaceful(skirmish({ difficulty: "normal" }));
	run(g, 260);
	const T = g.enemyAi.teams[1],
		scouts = g.entities.filter((e) => e.team === 1 && e.aiRole === "scout"),
		seen = T.scoutAt > 0;
	assert.ok(seen, "a scouting time is planned");
	// After some minutes it has looked at more than its own corner.
	const V = g.aiVision(1, true),
		looked = [...V.seen].filter((t) => t > 0).length / V.seen.length;
	assert.ok(looked > 0.08, `seen ${Math.round(looked * 100)}% of the map`);
	assert.ok(scouts.length <= 1);
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.deepEqual(Object.keys(back.enemyAi.teams[1].intel.structures).sort(), Object.keys(T.intel.structures).sort());
});

test("under the fog the commander still attacks and plays a whole battle", () => {
	const g = skirmish({ difficulty: "normal" });
	run(g, 600);
	assert.ok(g.enemyAi.teams[1].attackNo >= 1, "attacks the base it knows");
});
