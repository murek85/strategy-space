const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { CampaignProgress } = require("../campaign");
const { Game, TYPES } = RTS;
const run = (g, seconds) => {
	for (let i = 0; i < seconds * 30 && !g.result; i++) g.tick(1 / 30);
	return g;
};
const chapter = (id, level = "normal") => {
	const g = new Game(42, id);
	g.applyCampaignLevel(level);
	return g;
};
const own = (g, team, type) => g.entities.filter((e) => e.team === team && e.hp > 0 && (!type || e.type === type));

test("chosen chapters hand the Dominium to the commander; the others keep their scripts", () => {
	assert.deepEqual(Object.keys(RTS.CAMPAIGN_AI).sort(), ["colony2", "colony3", "colony6"]);
	for (const id of ["colony2", "colony3", "colony6"]) {
		const g = chapter(id);
		assert.ok(g.aiActive(), id);
		assert.ok(g.campaignAi && RTS.MISSIONS[id].commander, id);
		assert.equal(own(g, 1, "worker").length, RTS.AI.startWorkers, id + " workers");
		assert.equal(Math.floor(g.enemyAi.teams[1].metal), RTS.CAMPAIGN_AI[id].startMetal, id + " metal");
	}
	for (const id of ["colony1", "colony4", "colony5"]) {
		const g = chapter(id);
		assert.ok(!g.aiActive() && !g.campaignAi, id);
	}
	// Without a chosen level (an old start) nothing changes.
	assert.ok(!new Game(42, "colony2").aiActive());
});

test("no scripted waves in a commander chapter: the commander builds and plans its own attacks", () => {
	const g = run(chapter("colony2"), 240);
	assert.equal(g.wave, g.enemyAi.teams[1].attackNo, "no free waves: every wave is a commander's attack");
	assert.ok(own(g, 1, "worker").length >= 4, "workers replaced and added");
	assert.ok(g.enemyAi.teams[1].mined > 0, "mines ore");
	assert.ok(own(g, 1).filter((e) => !TYPES[e.type].speed).length > 3, "builds");
	const L = g.aiLevel(1);
	assert.ok(L.firstAttack > RTS.AI_LEVELS.normal.firstAttack, "later first attack in chapter II");
	assert.equal(L.hangarAt, null, "no air in chapter II");
});

test("the level sets the commander and the enemy's strength in every chapter", () => {
	const easy = chapter("colony3", "easy"),
		hard = chapter("colony3", "hard");
	assert.equal(easy.aiLevel(1).think, RTS.AI_LEVELS.easy.think);
	assert.equal(hard.aiLevel(1).think, RTS.AI_LEVELS.hard.think);
	const hqHp = (g) => g.hq(1).maxHp;
	assert.ok(Math.abs(hqHp(hard) / hqHp(easy) - 1.15 / 0.85) < 1e-6, "enemy hit points");
	// A scripted chapter: the same scale for its enemy and for later arrivals.
	const s1 = chapter("colony1", "hard"),
		ref = new Game(42, "colony1");
	assert.ok(Math.abs(s1.hq(1).maxHp / ref.hq(1).maxHp - 1.15) < 1e-6);
	const late = s1.spawn("trooper", 1, 500, 500);
	assert.ok(Math.abs(late.maxHp / TYPES.trooper.hp - 1.15) < 1e-6);
	assert.equal(s1.difficultyScale(), 1.15, "enemy damage");
	assert.equal(s1.spawn("trooper", 0, 500, 500).maxHp, TYPES.trooper.hp, "the player is not scaled");
	// Act III: its commander follows the campaign level.
	const g9 = chapter("colony9", "hard");
	assert.equal(g9.scenario.difficulty, "hard");
	assert.equal(g9.aiLevel().think, RTS.AI_LEVELS.hard.think);
	// Once per chapter, before it starts.
	assert.equal(g9.applyCampaignLevel("easy"), false);
	assert.equal(g9.campaignLevel, "hard");
});

test("harder levels attack sooner and with more", () => {
	const at = (level) => {
		const g = chapter("colony3", level);
		return { first: g.enemyAi.teams[1].nextAttack, size: g.aiLevel(1).attackSize[0] };
	};
	const e = at("easy"),
		n = at("normal"),
		h = at("hard");
	assert.ok(e.first > n.first && n.first > h.first);
	assert.ok(e.size < n.size && n.size < h.size);
});

test("a commander chapter survives save and load", () => {
	const g = run(chapter("colony6", "hard"), 30),
		state = JSON.parse(JSON.stringify(g.serialize())),
		back = Game.fromSave(state);
	assert.equal(back.campaignLevel, "hard");
	assert.ok(back.campaignAi && back.aiActive());
	assert.equal(Math.round(back.enemyAi.teams[1].metal), Math.round(g.enemyAi.teams[1].metal));
	run(back, 5);
	assert.equal(back.wave, back.enemyAi.teams[1].attackNo);
});

test("the campaign progress keeps the chosen level", () => {
	const store = new Map(),
		storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
	const p = new CampaignProgress(storage);
	assert.equal(p.difficulty, "normal");
	assert.ok(p.setDifficulty("hard"));
	assert.equal(new CampaignProgress(storage).difficulty, "hard");
	assert.equal(p.setDifficulty("nonsense"), false);
	assert.equal(new CampaignProgress(storage).difficulty, "hard");
});

test("the campaign's commander plays the Dominium's style without its faction rules", () => {
	const g = chapter("colony3");
	assert.equal(g.aiStyleKey(1), "dominion");
	assert.equal(g.factionFor(1), null, "no scenario faction");
	const L = g.aiLevel(1),
		plain = RTS.AI_LEVELS.normal;
	assert.equal(L.style, RTS.AI_STYLES.dominion);
	assert.ok(L.turrets.length > plain.turrets.length, "more towers");
	assert.ok(L.interval > plain.interval && L.attackSize[0] > Math.round(plain.attackSize[0] * RTS.CAMPAIGN_AI.colony3.attackSize), "rarer, bigger attacks");
	assert.equal(L.raids, false);
	assert.equal(L.uplinkAt, null, "no orbital strikes in the campaign chapters");
	// Its factory turns out bastions and heavy machines (the idle player's centre is kept standing).
	for (let i = 0; i < 480 * 30 && !g.result; i++) {
		g.hq(0).hp = g.hq(0).maxHp;
		g.tick(1 / 30);
	}
	const built = g.entities.filter((e) => e.team === 1 && ["sentinel", "heavy"].includes(e.type));
	assert.ok(built.length > 0, "Dominium vehicles");
	assert.equal(g.entities.filter((e) => e.team === 1 && e.type === "raider").length, 0);
	// Scripted chapters and act III keep theirs.
	assert.equal(chapter("colony1").aiStyleKey(1), null);
	assert.equal(chapter("colony9").aiStyleKey(1), "swarm");
});
