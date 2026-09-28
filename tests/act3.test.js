const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { CampaignProgress, CHAPTERS } = require("../campaign");
const { Game, TYPES, MISSIONS, dist } = RTS;
const quiet = (g) => {
	for (const T of Object.values(g.enemyAi?.teams || {})) T.nextAttack = 1e9;
	return g;
};

test("act III: three chapters after act II, on the terrain of scenario maps", () => {
	for (const [id, map, requires] of [
		["colony7", "lumen", "colony6"],
		["colony8", "frost", "colony7"],
		["colony9", "magma", "colony8"],
	]) {
		const m = MISSIONS[id];
		assert.ok(m.campaign && m.act === 3 && m.requires === requires, id);
		assert.equal(m.theme, MISSIONS[map].theme);
		const g = new Game(42, id),
			ref = new Game(42, map);
		ref.configureSkirmish({});
		assert.deepEqual(g.waters.map((w) => [w.x, w.y]), ref.waters.map((w) => [w.x, w.y]), id + " terrain");
	}
	assert.deepEqual(CHAPTERS.slice(-3), ["colony7", "colony8", "colony9"]);
});

test("chapter setups: the Swarm as the enemy, Varn's Dominium as the ally, the orbital uplink in the finale", () => {
	const g7 = new Game(42, "colony7");
	assert.equal(g7.modeState.mode, "expedition");
	assert.ok(g7.aiActive());
	assert.equal(g7.factionFor(0).key, "colonies");
	assert.equal(g7.factionFor(1).key, "swarm");
	assert.equal(g7.centerLevel(), 2);
	assert.equal(g7.credits, 900);
	assert.equal(g7.act2.radio.length, 2);
	const g8 = new Game(42, "colony8");
	assert.equal(g8.modeState.mode, "hill");
	assert.ok(g8.allied(0, 3));
	assert.equal(g8.factionFor(3).key, "dominion");
	assert.equal(g8.hq(3).faction, "dominion");
	assert.equal(g8.factionFor(4).key, "swarm");
	const g9 = new Game(42, "colony9"),
		uplink = g9.entities.find((e) => e.team === 0 && e.type === "uplink");
	assert.ok(uplink && !uplink.constructionLeft);
	assert.equal(g9.entities.filter((e) => e.team === 0 && e.type === "reactor").length, 2);
	assert.ok(g9.hq(1).maxHp > new Game(42, "colony7").hq(1).maxHp * 1.4);
	assert.equal(g9.strikeRequirement(uplink.id), "", "the player can use the uplink at once");
});

test("chapter VII: delivering the artifact wins; the secondary objective has a deadline", () => {
	const g = quiet(new Game(42, "colony7")),
		a = g.modeState.artifact;
	g.entities = g.entities.filter((e) => !e.guardian);
	const u = g.spawn("tank", 0, a.x, a.y);
	for (let i = 0; i < 30 * (RTS.EXPEDITION.pickup + 1); i++) g.tick(1 / 30);
	assert.equal(a.carrier, u.id);
	assert.ok(g.act2Objectives()[0].done);
	assert.ok(g.act2.radio.some((l) => l.who === "lira" && /w naszych rękach/.test(l.text)));
	const hq = g.hq(0);
	u.x = hq.x + 90;
	u.y = hq.y;
	g.tick(1 / 30);
	assert.equal(g.result, "victory");
	assert.ok(g.campaignReady());
	assert.ok(g.act2Secondary(), "before minute 12");
	assert.match(g.act2Epilogue(), /mapa/);
	const late = quiet(new Game(42, "colony7"));
	late.time = 721;
	assert.ok(late.act2Objectives().find((o) => o.secondary).failed);
});

test("chapter VIII: the hill or both nests win; losing Varn's base fails the badge", () => {
	const g = quiet(new Game(42, "colony8"));
	g.hillNode().owner = 0;
	g.modeState.scores[0] = 179;
	g.tick(1);
	assert.equal(g.result, "victory");
	assert.ok(g.act2Secondary());
	const nests = quiet(new Game(42, "colony8"));
	nests.applyDamage(null, nests.hq(1), 1e6);
	nests.tick(1 / 30);
	assert.equal(nests.result, null, "one nest is not enough");
	nests.applyDamage(null, nests.hq(4), 1e6);
	nests.tick(1 / 30);
	assert.equal(nests.result, "victory");
	const lost = quiet(new Game(42, "colony8"));
	lost.applyDamage(null, lost.hq(3), 1e6);
	for (let i = 0; i < 45; i++) lost.tick(1 / 30);
	assert.equal(lost.result, null, "the ally's loss is not a defeat");
	assert.ok(lost.act2Objectives().find((o) => o.secondary).failed);
	assert.ok(lost.act2.radio.some((l) => l.who === "varn" && /straciłem bazę/.test(l.text)));
});

test("chapter IX: destroying the Heart ends the act", () => {
	const g = quiet(new Game(42, "colony9"));
	g.applyDamage(null, g.hq(1), 1e7);
	g.tick(1 / 30);
	assert.equal(g.result, "victory");
	assert.ok(g.act2Secondary());
	assert.match(g.act2Epilogue(), /Serce Roju gaśnie/);
});

test("badges carry over and progress is recorded for act III", () => {
	const g = new Game(42, "colony8");
	assert.equal(g.applyAct2Bonus({ colony7: true }), 200);
	assert.equal(g.credits, 1200);
	assert.equal(g.applyAct2Bonus({ colony7: true }), 0, "once");
	assert.equal(new Game(42, "colony9").applyAct2Bonus({}), 0);
	const store = new Map(),
		storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
		progress = new CampaignProgress(storage),
		won = quiet(new Game(42, "colony9"));
	won.applyDamage(null, won.hq(1), 1e7);
	won.tick(1 / 30);
	assert.ok(progress.record(won));
	const again = new CampaignProgress(storage);
	assert.ok(again.completed.colony9 && again.badges.colony9);
});

test("act III chapters survive save and load", () => {
	const g = quiet(new Game(42, "colony8"));
	for (let i = 0; i < 60; i++) g.tick(1 / 30);
	g.say("varn", "Test.");
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.ok(back.isAct3());
	assert.equal(back.factionFor(3).key, "dominion");
	assert.equal(back.act2.radio.at(-1).text, "Test.");
	assert.deepEqual(back.act2.heard, g.act2.heard);
	const broken = g.serialize();
	broken.act2 = null;
	assert.throws(() => Game.fromSave(broken));
});
