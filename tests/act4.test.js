// H1–H2 (0.156): act IV "Inwazja" (campaign-act4.js) — chapters X–XIV, the orbit of X carried to XI as drop
// pods, the bridgehead and the Watchers' rifts of XI, Varn after the decision of VIII, saves and progress.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { CampaignProgress } = require("../campaign.js");
const { TYPES } = RTS;

const start = (id, { level = "normal", carry = {}, choices = {}, badges = {} } = {}) => {
	const g = new RTS.Game(42, id);
	g.applyCampaignLevel(level);
	g.applyAct2Bonus(badges);
	g.applyCampaignCarry(carry);
	g.applyCampaignChoices(choices);
	return g;
};
const run = (g, seconds, keep = true) => {
	const hq = g.hq(0);
	for (let i = 0; i < seconds * 15 && !g.result; i++) {
		if (keep && hq) hq.hp = hq.maxHp;
		g.tick(1 / 15);
	}
	return g;
};
const memory = () => {
	const data = {};
	return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)), removeItem: (k) => delete data[k] };
};

test("act IV: five chapters after IX, unlocked one by one, with the new speakers", () => {
	const ids = ["colony10", "colony11", "colony12", "colony13", "colony14"];
	assert.deepEqual(ids.map((id) => RTS.MISSIONS[id].requires), ["colony9", "colony10", "colony11", "colony12", "colony13"]);
	for (const id of ids) {
		const m = RTS.MISSIONS[id];
		assert.equal(m.campaign, true);
		assert.equal(m.act, 4);
		assert.ok(m.name && m.objective && m.facts.length === 2, id);
	}
	assert.ok(RTS.MISSIONS.colony10.space && RTS.MISSIONS.colony13.space && RTS.MISSIONS.colony14.space && !RTS.MISSIONS.colony11.space);
	assert.ok(RTS.ACT2_SPEAKERS.vok && RTS.ACT2_SPEAKERS.gate);
	for (const id of ids) {
		const g = start(id);
		assert.ok(g.isAct4() && g.hq(0) && g.hq(1), id);
		assert.equal(g.factionFor(1).key, id === "colony14" ? "watchers" : "dominion");
		assert.ok(g.act2.radio.length >= 2, "opening radio");
		assert.ok(g.act2Objectives().some((o) => o.secondary));
	}
});

test("X · Blokada Eos: an orbit of 10 minutes with flagships; won, its pods go to the campaign progress", () => {
	const g = start("colony10");
	assert.equal(g.invasion.phase, "orbit");
	assert.equal(g.invasion.ends, 600);
	const flagship = g.get(g.act4.flagship);
	assert.equal(flagship?.type, "carrier");
	assert.ok(g.entities.some((e) => e.team === 1 && e.type === "carrier"), "the Admiralty's carrier");
	assert.equal(g.sideName(1), "Admiralicja");
	run(g, 200);
	assert.ok(g.act2.radio.some((l) => l.who === "gate"), "the artifact answers an unknown signal");
	// The blockade station falls.
	g.applyDamage(null, g.hq(1), 1e9);
	assert.equal(g.result, "victory");
	const carry = g.campaignCarry();
	assert.ok(Number.isInteger(carry.pods) && carry.pods >= RTS.INVASION.minPods);
	const progress = new CampaignProgress(memory());
	assert.equal(progress.record(g), true);
	assert.equal(progress.completed.colony10, true);
	assert.deepEqual(progress.carry.colony10, carry);
	assert.deepEqual(new CampaignProgress(progress.storage).carry.colony10, carry, "kept on the device");
	// The flagship kept: the badge.
	assert.equal(g.act2Secondary(), !!g.get(g.act4.flagship));
});

test("X lost on time: the Admiralty's fleet was stronger", () => {
	const g = start("colony10");
	for (const e of g.entities) if (e.team === 0 && TYPES[e.type].ship) e.hp = 0;
	g.entities = g.entities.filter((e) => e.hp > 0);
	g.invasion.ends = g.time + 2;
	run(g, 5);
	assert.equal(g.result, "defeat");
	assert.match(g.act2.failReason, /flota Admiralicji przeważyła/);
	assert.equal(g.campaignCarry(), null);
});

test("XI · Kapsuły nad Eos: the pods of X and Varn's, the bridgehead first, pods shot down, the Watchers' rifts", () => {
	const g = start("colony11", { carry: { colony10: { pods: 6 } }, choices: { colony8: "trust" } });
	assert.equal(g.invasion.phase, "ground");
	assert.equal(g.orbitOwner(), 0);
	assert.equal(g.podsLeft(0), 7, "6 from the fleet of X and 1 from Varn's scouts");
	const plain = start("colony11");
	assert.equal(plain.podsLeft(0), RTS.INVASION.minPods + 2, "no result of X saved: the default");
	const far = start("colony11", { choices: { colony8: "distance" } });
	assert.equal(far.act4.varn, "distance");
	// The base falls before the bridgehead: no victory yet.
	g.applyDamage(null, g.hq(1), 1e9);
	run(g, 2);
	assert.equal(g.result, null);
	assert.equal(g.campaignReady(), false);
	// Two relays: the bridgehead — and the victory.
	for (const n of g.nodes.slice(0, 2)) n.owner = 0;
	run(g, 2);
	assert.equal(g.act4.bridgehead, true);
	assert.equal(g.result, "victory");

	// Pods shot down count for the badge.
	const p = start("colony11");
	p.act4.podsShot = 0;
	p.landPod = Object.getPrototypeOf(p).landPod;
	const realRand = p.rand;
	p.rand = () => 0;
	const flak = p.spawn("flak", 1, p.hq(0).x + 500, p.hq(0).y);
	flak.constructionLeft = 0;
	p.landPod({ x: flak.x, y: flak.y, team: 0, at: 0, pod: 0 });
	p.landPod({ x: flak.x + 10, y: flak.y, team: 0, at: 0, pod: 1 });
	p.rand = realRand;
	assert.equal(p.act4.podsShot, 2);
	assert.ok(p.act2Objectives().find((o) => o.secondary).failed);

	// The rifts: the Watchers come through and strike both sides.
	const w = start("colony11");
	run(w, 425);
	assert.equal(w.act4.rifts, 1);
	const scouts = w.entities.filter((e) => e.team === 4);
	assert.ok(scouts.length >= 4 && scouts.every((e) => e.faction === "watchers"));
	assert.ok(!w.allied(4, 0) && !w.allied(4, 1), "hostile to the Colonies and the Admiralty");
	assert.ok(w.act2.radio.some((l) => l.who === "gate"));
	assert.equal(w.sideName(4), "Wartownicy");
	run(w, 430);
	assert.equal(w.act4.rifts, 2);
	// Kept in a save.
	const back = RTS.Game.fromSave(JSON.parse(JSON.stringify(w.serialize())));
	assert.equal(back.act4.rifts, 2);
	assert.equal(back.factionFor(4).key, "watchers");
});

test("the badge of IX gives 200 metal at the start of X; the draft chapters XII–XIV are playable", () => {
	const g = start("colony10", { badges: { colony9: true } });
	assert.equal(g.act2.bonus, 200);
	const x14 = start("colony14");
	assert.equal(x14.factionFor(1).key, "watchers");
	x14.applyDamage(null, x14.hq(1), 1e9);
	assert.equal(x14.result, "victory");
	assert.match(x14.act2Epilogue(), /Brama milknie/);
});
