const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");

// A player with a finished depot (or laboratory) and a surplus of crystals.
function market(type = "depot") {
	const g = new RTS.Game(42, "horizon");
	const hq = g.hq(0);
	const b = g.spawn(type, 0, hq.x + 160, hq.y + 40);
	b.constructionLeft = 0;
	g.credits = 500;
	g.gas = 100;
	g.crystals = 1265;
	return { g, b };
}

test("trade needs a finished depot or laboratory of the player", () => {
	const g = new RTS.Game(42, "horizon");
	g.crystals = 500;
	assert.match(g.tradeRequirement(), /magazynu polowego lub laboratorium/);
	assert.equal(g.trade("crystals", "metal", 100), false);
	assert.equal(g.crystals, 500);
	const { g: g2, b } = market();
	b.constructionLeft = 5;
	assert.equal(g2.trade("crystals", "metal", 100), false, "a depot under construction does not count");
	b.constructionLeft = 0;
	assert.equal(g2.tradeRequirement(), "");
	assert.equal(market("lab").g.tradeRequirement(), "");
});

test("trade rates are unfavourable: 40% of the value is lost, a round trip never pays", () => {
	const { g } = market();
	assert.equal(g.tradeQuote("crystals", "metal", 100), 120);
	assert.equal(g.tradeQuote("crystals", "gas", 100), 40);
	assert.equal(g.tradeQuote("gas", "metal", 100), 180);
	assert.equal(g.tradeQuote("metal", "gas", 100), 20);
	assert.equal(g.tradeQuote("metal", "crystals", 100), 30);
	for (const a of ["metal", "gas", "crystals"])
		for (const b of ["metal", "gas", "crystals"]) {
			if (a === b) continue;
			const back = g.tradeQuote(b, a, g.tradeQuote(a, b, 1000));
			assert.ok(back < 1000 * 0.4, `${a} → ${b} → ${a}: ${back} of 1000`);
		}
	assert.equal(g.tradeQuote("metal", "metal", 100), 0);
	assert.equal(g.tradeQuote("metal", "gold", 100), 0);
});

test("a trade moves the resources and refuses what the player does not have", () => {
	const { g } = market();
	assert.equal(g.trade("crystals", "metal", 250), 300);
	assert.equal(g.crystals, 1015);
	assert.equal(g.credits, 800);
	assert.equal(g.trade("gas", "crystals", 250), false, "only 100 gas");
	assert.equal(g.gas, 100);
	assert.equal(g.trade("crystals", "metal", 2.5), false);
	assert.equal(g.trade("crystals", "metal", -10), false);
	assert.ok(g.events.some((e) => /Handel: 250 kryształów → 300 metalu/.test(e.text ?? e)));
});

test("trade over the network: an allowed action, run as that player only", () => {
	const g = RTS.createNetworkGame({ map: "horizon", seed: 7, size: "small", players: [{ name: "A" }, { name: "B" }] });
	for (const team of [0, 1]) {
		const hq = g.hq(team);
		g.spawn("depot", team, hq.x + (team ? -160 : 160), hq.y).constructionLeft = 0;
	}
	g.sideOf(1).crystals = 400;
	const before0 = g.sideOf(0).credits,
		before1 = g.sideOf(1).credits;
	assert.equal(g.applyCommand(1, "trade", ["crystals", "metal", 100]), 120);
	assert.equal(g.sideOf(1).crystals, 300);
	assert.equal(g.sideOf(1).credits, before1 + 120);
	assert.equal(g.sideOf(0).credits, before0);
	assert.equal(g.applyCommand(0, "trade", ["crystals", "metal", 100]), false, "player 0 has no crystals");
});
