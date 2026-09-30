const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES } = RTS;

const swarmHq = (g) => g.entities.filter((e) => e.type === "hq" && e.hp > 0 && g.factionFor(e.team)?.key === "swarm");
const readyFactory = (g) => {
	const hq = g.hq(0);
	const f = g.spawn("factory", 0, hq.x + 200, hq.y + 150);
	f.constructionLeft = 0;
	return f;
};

test("act III without a recorded act II decision: nothing changes, the Dominium's destroyer stays locked", () => {
	for (const id of ["colony7", "colony8", "colony9"]) {
		const g = new Game(42, id),
			credits = g.credits,
			count = g.entities.length;
		assert.equal(g.applyCampaignChoices({}), null);
		assert.equal(g.credits, credits);
		assert.equal(g.entities.length, count);
		assert.equal(g.loanedUnit("destroyer"), false);
		assert.match(g.developmentRequirement("destroyer"), /innej frakcji/);
	}
	// Outside act III the decision does nothing.
	assert.equal(new Game(42, "colony6").applyCampaignChoices?.({ colony6: "evacuate" }) ?? null, null);
});

test("evacuation: the Colonies build the Dominium's tank destroyer; Varn's base gets reinforcements, then an escort", () => {
	const g7 = new Game(42, "colony7");
	assert.equal(g7.applyCampaignChoices({ colony6: "evacuate" }), "evacuate");
	assert.equal(g7.applyCampaignChoices({ colony6: "evacuate" }), null, "applied once");
	assert.equal(g7.loanedUnit("destroyer"), true);
	assert.equal(g7.loanedUnit("flamer"), false, "only the destroyer");
	assert.equal(g7.developmentRequirement("destroyer"), "");
	readyFactory(g7);
	g7.credits = 2000;
	assert.equal(g7.enqueue("destroyer"), true);
	assert.equal(g7.enqueue("flamer"), false);
	for (let i = 0; i < 30 * 20 && !g7.units(0).some((e) => e.type === "destroyer"); i++) g7.tick(1 / 30);
	const built = g7.units(0).find((e) => e.type === "destroyer");
	assert.ok(built, "a destroyer rolls out of the factory");
	assert.equal(built.faction, "dominion", "with the Dominium's look");
	assert.match(g7.act2.radio.at(-1).text, /plany niszczyciela/);

	const g8 = new Game(42, "colony8"),
		allyBefore = g8.entities.filter((e) => e.team === 3).length;
	g8.applyCampaignChoices({ colony6: "evacuate" });
	const ally = g8.entities.filter((e) => e.team === 3);
	assert.equal(ally.length, allyBefore + 3);
	assert.equal(ally.filter((e) => e.type === "destroyer").length, 2);
	assert.ok(ally.some((e) => e.type === "sentinel"));

	const g9 = new Game(42, "colony9"),
		heart = swarmHq(g9)[0].maxHp;
	g9.applyCampaignChoices({ colony6: "evacuate" });
	const escort = g9.units(0).filter((e) => e.type === "destroyer");
	assert.equal(escort.length, 2);
	assert.ok(escort.every((e) => e.faction === "dominion"));
	assert.equal(swarmHq(g9)[0].maxHp, heart, "the Heart keeps its strength");
	assert.match(g9.act2Epilogue(), /dług został spłacony/);
});

test("destruction: weaker Swarm bases and metal from the ruins, no help from Varn", () => {
	for (const id of ["colony7", "colony8", "colony9"]) {
		const g = new Game(42, id),
			credits = g.credits,
			before = swarmHq(g).map((e) => e.maxHp),
			allies = g.entities.filter((e) => e.team === 3).length;
		assert.ok(before.length, id + " has Swarm bases");
		assert.equal(g.applyCampaignChoices({ colony6: "destroy" }), "destroy");
		assert.equal(g.credits, credits + 250);
		swarmHq(g).forEach((e, i) => assert.ok(Math.abs(e.maxHp - before[i] * 0.75) < 1e-6 && e.hp <= e.maxHp, id));
		assert.equal(g.entities.filter((e) => e.team === 3).length, allies);
		assert.equal(g.loanedUnit("destroyer"), false);
		assert.equal(g.hq(0).maxHp, new Game(42, id).hq(0).maxHp, "the player's base is untouched");
	}
	const g8 = new Game(42, "colony8");
	g8.applyCampaignChoices({ colony6: "destroy" });
	assert.ok(g8.hq(3), "Varn's base is still an ally");
	assert.match(g8.act2.radio.at(-1).text, /posiłków ode mnie nie będzie/);
});

test("the consequence is kept in the save and not applied twice after loading", () => {
	const g = new Game(42, "colony9");
	g.applyCampaignChoices({ colony6: "evacuate" });
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.equal(back.act2.legacy, "evacuate");
	assert.equal(back.loanedUnit("destroyer"), true);
	const count = back.entities.length;
	assert.equal(back.applyCampaignChoices({ colony6: "destroy" }), null);
	assert.equal(back.entities.length, count);
	// A damaged save with an unknown decision loses it instead of breaking the chapter.
	const odd = g.serialize();
	odd.act2.legacy = "nonsense";
	assert.equal(Game.fromSave(JSON.parse(JSON.stringify(odd))).act2.legacy, undefined);
	assert.ok(TYPES.destroyer.faction === "dominion");
});
