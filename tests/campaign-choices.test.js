const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { CampaignProgress } = require("../campaign");
const { Game, TYPES } = RTS;
const run = (g, seconds) => {
	for (let i = 0; i < seconds * 30 && !g.result; i++) g.tick(1 / 30);
	return g;
};
const chapter = (id, choices = {}, level = "normal") => {
	const g = new Game(42, id);
	g.applyCampaignLevel(level);
	g.applyCampaignChoices(choices);
	return g;
};
const own = (g, team, type) => g.entities.filter((e) => e.team === team && e.hp > 0 && (!type || e.type === type));

test("decisions come up during their chapters and are taken once", () => {
	const g = chapter("colony1");
	g.nextWave = 1e9;
	run(g, 1);
	assert.equal(g.campaignDecision, undefined);
	for (const n of g.nodes.slice(0, 2)) n.owner = 0;
	run(g, 0.5);
	assert.equal(g.campaignDecision.state, "pending");
	assert.equal(g.decideCampaign("nonsense"), false);
	assert.ok(g.decideCampaign("secret"));
	assert.equal(g.campaignChoice(), "secret");
	assert.equal(g.decideCampaign("appeal"), false, "cannot be changed");
	// III: the citadel falling; VIII: from the 5th minute at the latest.
	const g3 = chapter("colony3");
	g3.hq(1).hp = g3.hq(1).maxHp * 0.3;
	run(g3, 0.5);
	assert.equal(g3.campaignDecision?.state, "pending");
	const g8 = chapter("colony8");
	g8.time = 299.99;
	run(g8, 0.5);
	assert.equal(g8.campaignDecision?.state, "pending");
	// Without a campaign level (an old start) no decision appears.
	const old = new Game(42, "colony1");
	for (const n of old.nodes.slice(0, 2)) n.owner = 0;
	run(old, 0.5);
	assert.equal(old.campaignDecision, undefined);
});

test("the codes: volunteers and a warned enemy, or the intercepts", () => {
	const base = chapter("colony2"),
		appeal = chapter("colony2", { colony1: "appeal" }),
		secret = chapter("colony2", { colony1: "secret" });
	assert.equal(own(appeal, 0, "trooper").length, own(base, 0, "trooper").length + 2);
	assert.equal(Math.round(appeal.enemyAi.teams[1].metal), Math.round(base.enemyAi.teams[1].metal) + 150);
	assert.equal(secret.intelAhead, 45);
	const foe = secret.hq(1);
	assert.ok(secret.explored[secret.visionIndex(foe.x, foe.y)], "enemy base on the map");
	assert.ok(!base.explored[base.visionIndex(foe.x, foe.y)]);
	// Earlier intercepts.
	secret.enemyAi.teams[1].nextAttack = secret.time + 40;
	run(secret, 1);
	assert.equal(secret.campaignEvents.warned, 1);
});

test("the citadel: the arsenal or the prisoners in act II", () => {
	const base = chapter("colony6"),
		arsenal = chapter("colony6", { colony3: "arsenal" }),
		prisoners = chapter("colony6", { colony3: "prisoners" });
	assert.equal(arsenal.credits, base.credits + 250);
	assert.equal(own(arsenal, 0, "tank").length, own(base, 0, "tank").length + 1);
	assert.ok(Math.abs(prisoners.hq(1).maxHp / base.hq(1).maxHp - 0.9) < 1e-9);
	assert.equal(prisoners.campaignEvents.reinforceLeft, 2);
	// Two drops, two minutes apart.
	const hq = prisoners.hq(0);
	prisoners.nextWave = 1e9;
	for (const T of Object.values(prisoners.enemyAi.teams)) T.nextAttack = 1e9;
	prisoners.time = 70;
	hq.hp = hq.maxHp * 0.3;
	const before = prisoners.units(0).length;
	run(prisoners, 1);
	const one = prisoners.units(0).length;
	assert.ok(one > before);
	run(prisoners, 1);
	assert.equal(prisoners.units(0).length, one, "not at once");
	prisoners.time += 120;
	run(prisoners, 1);
	assert.ok(prisoners.units(0).length > one, "the second drop");
});

test("Varn: an escort and a faster strike, or one's own artillery; the epilogue follows", () => {
	const trust = chapter("colony9", { colony8: "trust" }),
		distance = chapter("colony9", { colony8: "distance" }),
		base = chapter("colony9");
	assert.equal(own(trust, 0, "sentinel").length, own(base, 0, "sentinel").length + 2);
	assert.equal(trust.strikeBoost, 0.7);
	assert.equal(distance.credits, base.credits + 400);
	assert.equal(own(distance, 0, "artillery").length, own(base, 0, "artillery").length + 1);
	assert.ok(trust.act2Epilogue().includes("rozejm na całym pograniczu"));
	assert.ok(distance.act2Epilogue().includes("własną drogą"));
	// Once per chapter.
	const n = own(trust, 0, "sentinel").length;
	trust.applyCampaignChoices({ colony8: "trust" });
	assert.equal(own(trust, 0, "sentinel").length, n);
});

test("decisions are kept in the save and in the campaign progress", () => {
	const g = chapter("colony3", { colony1: "secret" });
	g.hq(1).hp = g.hq(1).maxHp * 0.3;
	run(g, 0.5);
	g.decideCampaign("prisoners");
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.deepEqual(back.campaignDecision, { state: "done", choice: "prisoners" });
	assert.equal(back.campaignLegacy.colony1, "secret");
	assert.equal(back.intelAhead, 45);
	const store = new Map(),
		storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
	const p = new CampaignProgress(storage);
	g.result = "victory";
	assert.ok(p.record(g));
	assert.equal(new CampaignProgress(storage).choices.colony3, "prisoners");
	assert.equal(TYPES.sentinel != null, true);
});
