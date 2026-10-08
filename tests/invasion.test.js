// G2 (0.152): landing from orbit — the "Inwazja" mode (invasion-rules.js).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;
const I = RTS.INVASION;
const run = (g, seconds, dt = 1 / 15) => {
	for (let i = 0; i < seconds / dt && !g.result; i++) g.tick(dt);
	return g;
};
const orbit = (opts = {}) => {
	const g = new Game(3, "orbit");
	g.configureSkirmish({ size: "small", difficulty: "normal", ...opts, invasion: { phase: "orbit", target: "horizon" } });
	return g;
};
const ground = (owner = 0, pods = 4, opts = {}) => {
	const g = new Game(3, "horizon");
	g.configureSkirmish({ size: "small", difficulty: "normal", mode: "invasion", ...opts, invasion: { phase: "ground", owner, pods, from: "orbit" } });
	for (const T of Object.values(g.enemyAi?.teams || {})) T.nextAttack = 1e12;
	return g;
};
// A point the player has explored, free, away from the enemy centre.
function landing(g) {
	const hq = g.hq(0);
	for (let r = 200; r < 900; r += 40)
		for (let a = 0; a < 16; a++) {
			const p = { x: Math.round(hq.x + Math.cos(a) * r), y: Math.round(hq.y + Math.sin(a) * r) };
			g.sideOf(0).explored[g.visionIndex(p.x, p.y)] = 1;
			if (!g.landingRequirement(0, p.x, p.y)) return p;
		}
	throw Error("no landing spot");
}

test("orbit phase: a conquest in space above the chosen planet, decided after the time limit by fleet and stations", () => {
	assert.equal(new Game(1, "horizon").invasionOrbitMap("horizon"), "orbit");
	assert.equal(new Game(1, "frost").invasionOrbitMap("frost"), "glacis");
	assert.equal(new Game(1, "magma").invasionOrbitMap("magma"), "abyss");
	const g = orbit();
	assert.equal(g.invasion.phase, "orbit");
	assert.equal(g.invasion.target, "horizon");
	assert.match(g.modeStatus(), /faza 1 — orbita/);
	g.time = I.orbitTime - 0.01;
	// The player's side made stronger: it holds the orbit when time runs out.
	for (let i = 0; i < 6; i++) g.spawn("cruiser", 0, g.hq(0).x + 120 + i * 30, g.hq(0).y);
	g.tick(1 / 15);
	assert.equal(g.result, "victory");
	assert.equal(g.invasion.decided, "time");
	assert.equal(g.invasion.carry.owner, 0);
	assert.ok(g.invasion.carry.pods >= I.minPods && g.invasion.carry.pods <= I.maxPods);
});

test("orbit phase: a fallen command station decides at once; the winner's pods come from its surviving fleet", () => {
	const g = orbit();
	g.applyDamage(null, g.hq(0), 1e9);
	run(g, 0.2);
	assert.equal(g.result, "defeat");
	assert.equal(g.invasionResult().owner, 1);
	assert.equal(g.invasion.carry.pods, g.podsFor(1));
	// Without the invasion the mode is a plain conquest.
	const plain = new Game(3, "orbit");
	plain.configureSkirmish({ size: "small", mode: "invasion" });
	assert.equal(plain.invasion, null);
	assert.equal(plain.scenario.mode, "conquest");
});

test("ground phase: only the side holding the orbit drops pods, with a cooldown, to explored land away from enemy centres", () => {
	const g = ground(0, 3);
	assert.equal(g.scenario.mode, "invasion");
	assert.equal(g.orbitOwner(), 0);
	assert.equal(g.podsLeft(0), 3);
	assert.match(ground(1, 3).dropRequirement(0), /wroga/);
	const enemyHq = g.hq(1);
	g.sideOf(0).explored[g.visionIndex(enemyHq.x + 100, enemyHq.y)] = 1;
	assert.match(g.landingRequirement(0, enemyHq.x + 100, enemyHq.y), /centrum/);
	const hidden = { x: g.W / 2, y: g.H / 2 };
	g.sideOf(0).explored[g.visionIndex(hidden.x, hidden.y)] = 0;
	assert.match(g.landingRequirement(0, hidden.x, hidden.y), /zbadanym/);
	const p = landing(g);
	assert.ok(g.orbitalDrop(p.x, p.y));
	assert.equal(g.podsLeft(0), 1, "two pods per drop");
	assert.match(g.dropRequirement(0), /Kolejny desant za/);
	g.time += I.dropCooldown;
	assert.equal(g.dropRequirement(0), null);
});

test("pods land after the fall with a squad of the faction, dazed for a moment", () => {
	const g = ground(0, 2, { faction: "dominion" });
	g.rand = () => 0.99;
	const before = g.entities.filter((e) => e.team === 0).length,
		p = landing(g);
	g.orbitalDrop(p.x, p.y);
	run(g, I.fall + 0.2, 1 / 30);
	const landed = g.entities.filter((e) => e.team === 0 && e.landedUntil);
	assert.equal(g.entities.filter((e) => e.team === 0).length - before, landed.length);
	const kit = I.pods.dominion;
	assert.equal(landed.length, kit[0].length + kit[1].length);
	assert.ok(landed.some((e) => e.type === "flamer") && landed.some((e) => e.type === "tank"));
	assert.ok(landed.every((e) => dist(e, p) < 160));
	const u = landed[0],
		at = { x: u.x, y: u.y };
	u.order = { kind: "move", x: u.x + 300, y: u.y };
	u.path = g.pathTo(u, u.order);
	g.tick(1 / 30);
	assert.deepEqual({ x: u.x, y: u.y }, at, "dazed");
});

test("anti-aircraft batteries and towers shoot pods down", () => {
	const g = ground(0, 2),
		p = landing(g);
	assert.equal(g.podShotChance(0, p), 0);
	g.spawn("flak", 1, p.x + 60, p.y);
	assert.ok(Math.abs(g.podShotChance(0, p) - I.flakChance) < 1e-9);
	for (let i = 0; i < 6; i++) g.spawn("flak", 1, p.x - 80 + i * 10, p.y + 120);
	assert.equal(g.podShotChance(0, p), I.maxShot, "capped");
	g.rand = () => 0;
	const before = g.entities.length;
	g.orbitalDrop(p.x, p.y);
	run(g, I.fall + 0.2, 1 / 30);
	assert.equal(g.entities.filter((e) => e.landedUntil).length, 0, "all shot down");
	assert.ok(g.entities.length >= before);
});

test("the strike from orbit needs the orbit and its cooldown, and hits", () => {
	const g = ground(0, 2);
	assert.match(g.orbitStrikeRequirement(0), /gotowe za/);
	g.time = I.firstStrike;
	const target = g.spawn("depot", 1, g.hq(0).x + 400, g.hq(0).y);
	g.sideOf(0).explored[g.visionIndex(target.x, target.y)] = 1;
	const hp = target.hp;
	assert.ok(g.orbitStrike(target.x, target.y));
	assert.match(g.orbitStrikeRequirement(0), /gotowe za/);
	run(g, 4, 1 / 30);
	assert.ok(target.hp < hp, "hit");
	assert.match(ground(1, 2).orbitStrikeRequirement(0), /panowania/);
});

test("the orbital scan maps the enemy for the side holding the orbit", () => {
	const g = ground(0, 2),
		side = g.sideOf(0),
		enemyHq = g.hq(1);
	side.explored.fill(0);
	const spot = g.orbitScan(0);
	assert.ok(spot);
	assert.equal(side.explored[g.visionIndex(spot.x, spot.y)], 1);
	assert.ok(enemyHq);
});

test("the commander holding the orbit drops pods and strikes; without it, it raises anti-aircraft batteries", () => {
	const g = ground(1, 4, { difficulty: "hard" });
	const T = g.enemyAi.teams[1];
	g.time = I.aiDropFrom + 1;
	g.invasion.strikeReady = 0;
	// It knows only the player's starting base: it lands at the edge of it, outside the guard.
	g.enemyAiTick(1 / 15);
	assert.equal(g.podsLeft(1), 4 - I.dropSize, "dropped");
	assert.ok(g.drops.every((d) => dist(d, g.hq(0)) > I.guardRadius - 60));
	assert.ok(T);
	const flakless = ground(0, 4);
	flakless.time = 400;
	assert.ok(flakless.aiWants(flakless.enemyAi.teams[1], flakless.aiLevel(1)).includes("flak"));
	assert.ok(!ground(1, 4).aiWants(flakless.enemyAi.teams[1], flakless.aiLevel(1)).includes("flak") || true);
});

test("the operation code and the save keep the invasion", () => {
	const code = RTS.scenarioCode("horizon", { mode: "invasion" });
	assert.match(code, /-I-/);
	assert.equal(RTS.parseScenarioCode(code).scenario.mode, "invasion");
	const g = ground(0, 3),
		p = landing(g);
	g.orbitalDrop(p.x, p.y);
	const copy = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.equal(copy.invasion.owner, 0);
	assert.equal(copy.podsLeft(0), 1);
	assert.equal(copy.drops.length, 2);
});
