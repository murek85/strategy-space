// G1 (0.150): the computer commander takes the Fortress and a doctrine, patrols and escorts (enemy-ai.js).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;
const skirmish = (opts = {}, map = "horizon") => {
	const g = new Game(42, map);
	g.configureSkirmish(opts);
	for (const T of Object.values(g.enemyAi.teams)) T.nextAttack = 1e12;
	return g;
};
const run = (g, seconds, dt = 1 / 30) => {
	for (let i = 0; i < seconds / dt && !g.result; i++) {
		g.tick(dt);
		for (const T of Object.values(g.enemyAi.teams)) T.nextAttack = 1e12;
	}
	return g;
};
const own = (g, team, type) => g.entities.filter((e) => e.team === team && e.hp > 0 && (!type || e.type === type));
// A side ready to advance: late enough, a factory, an army and metal.
function ready(opts = {}, faction = null) {
	const g = skirmish({ difficulty: "normal", ...opts });
	if (faction) (g.players ||= {})[1] = { ...(g.players?.[1] || {}), faction };
	const T = g.enemyAi.teams[1],
		hq = g.hq(1);
	g.time = 700;
	T.metal = 5000;
	g.spawn("factory", 1, hq.x + 160, hq.y + 200);
	for (let i = 0; i < 8; i++) {
		const e = g.spawn("trooper", 1, T.rally.x + (i % 4) * 22, T.rally.y + Math.floor(i / 4) * 22);
		e.aiRole = "defend";
		e.modeTagged = true;
	}
	return { g, T, hq };
}
const think = (g, T) => {
	T.think = 0;
	g.enemyAiTick(1 / 30);
};

test("normal: the commander raises the Fortress, then takes a doctrine of its faction", () => {
	const { g, T, hq } = ready(),
		hp = hq.maxHp,
		metal = T.metal;
	think(g, T);
	assert.equal(T.advance?.kind, "fortress");
	assert.ok(metal - T.metal >= RTS.AI.fortress.metal, "paid for the Fortress");
	g.time = T.advance.at + 1;
	think(g, T);
	assert.ok(T.upgrades.fortress);
	assert.equal(Math.round(hq.maxHp), Math.round(hp * RTS.FORTRESS.hpFactor), "the centre is sturdier");
	think(g, T);
	assert.ok(T.advance && RTS.RESEARCH[T.advance.kind]?.doctrine, "a doctrine under way");
	g.time = T.advance.at + 1;
	think(g, T);
	const d = g.doctrineOf(1);
	assert.ok(d);
	assert.ok(RTS.DOCTRINES[g.aiStyleKey(1)].some((o) => o.id === d.id), "one of its own faction's doctrines");
	// One doctrine only.
	think(g, T);
	assert.equal(T.advance, undefined);
});

test("easy never advances; the campaign commander neither", () => {
	const { g, T } = ready({ difficulty: "easy" });
	g.time = 3000;
	for (let i = 0; i < 5; i++) think(g, T);
	assert.ok(!T.upgrades.fortress && !T.advance);
});

test("the Fortress pays: 4 metal/s more for the commander", () => {
	const { g, T } = ready();
	const L = RTS.AI_LEVELS.normal;
	T.metal = 0;
	g.enemyAiTick(1);
	const plain = T.metal;
	T.upgrades.fortress = true;
	T.metal = 0;
	g.enemyAiTick(1);
	assert.ok(Math.abs(T.metal - plain - RTS.FORTRESS.income) < 0.5, `${T.metal} vs ${plain}`);
	assert.ok(L.fortressAt > 0);
});

test("the doctrine fits the moment: offensive when calm, defensive when pressed or behind", () => {
	const pick = (faction, setup) => {
		const { g, T } = ready({}, faction);
		setup?.(g, T);
		const army = own(g, 1).filter((e) => TYPES[e.type].damage && TYPES[e.type].speed && e.type !== "worker");
		return g.aiPickDoctrine(T, g.aiLevel(1), army).id;
	};
	assert.equal(pick("colonies"), "doctrineMobility");
	assert.equal(pick("colonies", (g, T) => (T.lastThreat = g.time - 30)), "doctrineBridgehead");
	assert.equal(pick("swarm"), "doctrineTide");
	assert.equal(pick("swarm", (g, T) => (T.intel.army = { tank: 30 })), "doctrineCarapace", "behind in the arms race");
	// The Dominium's heavy fire needs heavy units; with infantry only it takes the shields.
	assert.equal(pick("dominion"), "doctrineShields");
	assert.equal(
		pick("dominion", (g, T) => {
			for (let i = 0; i < 8; i++) g.spawn("tank", 1, T.rally.x - 60, T.rally.y + i * 20);
		}),
		"doctrineBarrage",
	);
});

test("the doctrine's effects work for the commander's units", () => {
	const { g, T } = ready({}, "dominion");
	const shooter = g.spawn("tank", 0, 400, 400),
		target = g.spawn("tank", 1, 500, 400);
	const before = g.damage(shooter, target);
	T.upgrades.doctrineShields = true;
	assert.ok(Math.abs(g.damage(shooter, target) - before * 0.85) < 0.01, "shields take 15% off");
	delete T.upgrades.doctrineShields;
	const s = g.spawn("trooper", 1, 600, 400),
		slow = g.movementFactor(s);
	T.upgrades.doctrineMobility = true;
	assert.ok(Math.abs(g.movementFactor(s) - slow * 1.15) < 0.01, "mobility +15% speed");
	// Production 25% faster.
	const hq = g.hq(1),
		b = g.spawn("barracks", 1, hq.x - 200, hq.y + 160);
	think(g, T);
	assert.ok(b.aiQueue, "the barracks produce");
	const kit = RTS.FACTION_KIT?.[g.factionFor(1)?.key]?.production || 1;
	assert.ok(Math.abs(b.aiQueue.left - (TYPES[b.aiQueue.type].build * g.aiLevel(1).prodTime * kit) / 1.25) < 0.05, "production 25% faster");
});

test("the player hears of it when the enemy centre is in sight", () => {
	const { g, T, hq } = ready();
	const heard = () => (g.sides[0].events || []).map((e) => e.text || e).join(" | ");
	g.aiAdvanced(T, "fortress", hq);
	assert.doesNotMatch(heard(), /Twierdz/, "nothing without sight");
	g.spawn("tank", 0, hq.x + 120, hq.y);
	g.updateVisibility?.();
	g.tick(1 / 30);
	g.aiAdvanced(T, "doctrineShields", hq);
	assert.match(heard(), /Wywiad.*doktryn/);
});

test("patrols: squads walk to the side's relays or in front of the base, and join the defence on a threat", () => {
	const g = run(skirmish({ difficulty: "hard" }), 220, 1 / 15),
		T = g.enemyAi.teams[1];
	const patrols = own(g, 1).filter((e) => e.aiRole === "patrol");
	assert.ok(patrols.length >= 2, `patrols: ${patrols.length}`);
	assert.ok(patrols.every((e) => e.patrol && e.order?.patrol), "on patrol-rules routes");
	assert.ok(patrols.every((e) => dist(e.patrol.a, e.patrol.b) >= 120));
	// An enemy at the base: the patrols turn back to fight.
	const hq = g.hq(1);
	g.spawn("heavy", 0, hq.x + 150, hq.y + 60);
	g.aiVision(1, true);
	think(g, T);
	assert.ok(patrols.every((e) => e.aiRole === "defend"), "patrols joined the defence");
	assert.ok(patrols.every((e) => !e.patrol || e.order?.kind === "attackMove"));
});

test("escorts: a unit keeps with the worker mining furthest from the base", () => {
	const { g, T, hq } = ready();
	const ore = g.ores.filter((o) => o.amount > 0).sort((a, b) => dist(b, hq) - dist(a, hq)).find((o) => dist(o, hq) > RTS.AI.escortFrom && dist(o, hq) < 1400);
	assert.ok(ore, "a far deposit on the map");
	const w = own(g, 1, "worker")[0];
	w.aiTask = { kind: "mine", oreId: ore.id };
	think(g, T);
	const guard = own(g, 1).find((e) => e.order?.kind === "escort" && e.order.targetId === w.id);
	assert.ok(guard, "an escort for the far worker");
	assert.equal(guard.aiRole, "escort");
	// The worker back at a near deposit: the escort is let go.
	const near = g.ores.filter((o) => o.amount > 0).sort((a, b) => dist(a, hq) - dist(b, hq))[0];
	w.aiTask = { kind: "mine", oreId: near.id };
	think(g, T);
	assert.equal(guard.aiRole, "defend");
	assert.notEqual(guard.order?.kind, "escort");
});

test("hard: the heavy units of an attack get escorts", () => {
	const g = skirmish({ difficulty: "hard" }),
		T = g.enemyAi.teams[1];
	const group = [g.spawn("artillery", 1, 1500, 900), ...Array.from({ length: 4 }, (_, i) => g.spawn("trooper", 1, 1450 + i * 20, 950))];
	g.aiEscortHeavy(group);
	const escorts = group.filter((e) => e.order?.kind === "escort");
	assert.equal(escorts.length, 2);
	assert.ok(escorts.every((e) => e.order.targetId === group[0].id));
	assert.ok(T);
});

test("the Fortress and doctrine under way and taken survive save and load", () => {
	const { g, T } = ready();
	think(g, T);
	assert.equal(T.advance.kind, "fortress");
	const copy = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.equal(copy.enemyAi.teams[1].advance.kind, "fortress");
	T.upgrades.doctrineShields = true;
	const again = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.equal(again.doctrineOf(1)?.id, "doctrineShields");
});
