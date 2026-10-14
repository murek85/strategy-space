// I1 (0.174): the balance simulator (tools/balance.js) — a short match of two commanders: both sides start the same
// (the command centre and the commander's workers, no map kit), both build, mine and fight, the account adds up.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { match } = require("../tools/balance.js");

test("a match of the computer against the computer: an equal start, both sides play", () => {
	const r = match({ map: "horizon", a: "colonies", b: "dominion", seed: 101, level: "normal", minutes: 4 });
	assert.deepEqual(r.factions, ["colonies", "dominion"]);
	// Each commander's enemy is the other side (without alliances aiFoes() names side 0 for every one of them).
	assert.deepEqual(r.foes, [[1], [0]]);
	const first = r.series[0];
	for (const t of [0, 1]) {
		assert.equal(first[t].army, 0, `side ${t}: no map kit at the start`);
		assert.equal(first[t].workers, first[1 - t].workers, "the same workers");
		assert.ok(r.mined[t] > 0, `side ${t} mines`);
		assert.ok(Object.keys(r.built[t]).length > 0, `side ${t} builds`);
	}
	assert.ok(r.time >= 4 * 60 - 1 || r.winner != null, "the match runs to its limit or to a winner");
	assert.ok(r.series.length >= 8, "samples every 30 s");
	if (r.winner == null) assert.equal(r.reason, "czas");
});
