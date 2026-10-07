const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;
const run = (g, seconds) => {
	for (let i = 0; i < seconds * 30 && !g.result; i++) g.tick(1 / 30);
	return g;
};
const chapter = (id, level = "normal") => {
	const g = new Game(42, id);
	g.applyCampaignLevel(level);
	return g;
};
const said = (g, part) => g.events.some((e) => String(e.text ?? e.message ?? e).includes(part)) || (g.act2?.radio || []).some((l) => l.text.includes(part));
const enemyArmy = (g) => g.entities.filter((e) => e.team === 1 && e.hp > 0 && TYPES[e.type].speed && TYPES[e.type].damage > 0 && e.type !== "worker");

test("events start with the campaign level in the chapters that have them", () => {
	for (const id of Object.keys(RTS.CAMPAIGN_EVENTS)) assert.ok(chapter(id).campaignEvents, id);
	assert.ok(!new Game(42, "colony2").campaignEvents, "no level, no events");
	const s = new Game(42, "horizon");
	s.configureSkirmish({});
	assert.ok(!s.campaignEvents, "scenarios untouched");
});

test("intercepted orders announce the commander's attack", () => {
	const g = chapter("colony3");
	const T = g.enemyAi.teams[1];
	T.nextAttack = g.time + 20;
	run(g, 1);
	assert.equal(g.campaignEvents.warned, 1);
	assert.ok(said(g, "grupa uderzeniowa 1"));
});

test("a relay taken by the player draws a counterattack", () => {
	const g = chapter("colony2", "hard");
	for (const T of Object.values(g.enemyAi.teams)) T.nextAttack = 1e9;
	run(g, 5);
	const n = g.nodes[0];
	n.owner = 0;
	run(g, RTS.CAMPAIGN_EVENT_TUNE.hard.retakeDelay + 2);
	const squad = enemyArmy(g).filter((e) => e.aiRole === "raid");
	assert.ok(squad.length >= 1, "squad sent");
	assert.ok(squad.some((e) => e.order && dist(e.order, n) < 60), "towards the relay");
	assert.ok(said(g, "odbić przekaźnik " + n.name));
	// A scripted chapter sends a squad from its base.
	const s = chapter("colony1");
	const before = enemyArmy(s).length;
	s.nodes[0].owner = 0;
	run(s, RTS.CAMPAIGN_EVENT_TUNE.normal.retakeDelay + 2);
	assert.equal(enemyArmy(s).length, before + RTS.CAMPAIGN_EVENT_TUNE.normal.retakeSize);
});

test("storming the enemy base sets off a strike at the player's workers", () => {
	const g = chapter("colony3");
	for (const T of Object.values(g.enemyAi.teams)) T.nextAttack = 1e9;
	run(g, 10);
	const foe = g.hq(1);
	for (let i = 0; i < 7; i++) g.spawn("tank", 0, foe.x - 500 + i * 15, foe.y + 300);
	run(g, 1);
	assert.ok(g.campaignEvents.diversionAt > g.time, "diversion on cooldown");
	assert.ok(enemyArmy(g).some((e) => e.aiRole === "raid"));
	assert.ok(said(g, "uderzają na tyły"));
});

test("reinforcements land once when the command centre is in danger", () => {
	const g = chapter("colony1", "easy");
	g.nextWave = 1e9;
	run(g, 61);
	const hq = g.hq(0),
		before = g.units(0).length;
	hq.hp = hq.maxHp * 0.3;
	run(g, 1);
	assert.equal(g.units(0).length, before + RTS.CAMPAIGN_EVENT_TUNE.easy.drop.length);
	assert.ok(g.campaignEvents.reinforced);
	run(g, 2);
	assert.equal(g.units(0).length, before + RTS.CAMPAIGN_EVENT_TUNE.easy.drop.length, "only once");
});

test("the commander's saboteurs go for the reactor and the player is warned", () => {
	const g = chapter("colony3", "hard");
	for (const T of Object.values(g.enemyAi.teams)) {
		T.nextAttack = 1e9;
		T.metal = 5000;
	}
	const hq = g.hq(0),
		reactor = g.spawn("reactor", 0, hq.x + 150, hq.y + 150);
	const foe = g.hq(1);
	g.spawn("barracks", 1, foe.x - 160, foe.y + 120);
	g.campaignEvents.saboteursAt = g.time + 1;
	run(g, 2 + RTS.CAMPAIGN_EVENT_RULES.saboteurBuild);
	const team = g.entities.filter((e) => e.team === 1 && e.type === "saboteur" && e.hp > 0);
	assert.equal(team.length, 2);
	assert.ok(team.every((e) => e.sabotageTarget === reactor.id));
	// Planting at the reactor knocks it out (no guards near to spot them).
	g.entities = g.entities.filter((e) => !(e.team === 0 && TYPES[e.type].speed));
	for (const e of team) {
		e.x = reactor.x + 40;
		e.y = reactor.y;
	}
	run(g, RTS.SUPPORT.saboteur.plant + 1.5);
	assert.ok((reactor.disabledUntil || 0) > g.time, "reactor disabled");
	assert.ok(said(g, "Sabotaż!"));
	// Easy has none.
	const e = chapter("colony3", "easy");
	e.campaignEvents.saboteursAt = 0;
	e.enemyAi.teams[1].metal = 5000;
	run(e, 30);
	assert.ok(!e.entities.some((x) => x.team === 1 && x.type === "saboteur"));
});

test("event state survives save and load", () => {
	const g = chapter("colony6", "hard");
	g.nodes[0].owner = 0;
	run(g, 1);
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.deepEqual(back.campaignEvents.retakes, g.campaignEvents.retakes);
	assert.equal(back.campaignEvents.owners[0], 0);
	run(back, 2);
});
