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
	assert.ok(RTS.MISSIONS.colony10.space && RTS.MISSIONS.colony14.space && !RTS.MISSIONS.colony11.space && !RTS.MISSIONS.colony13.space, "XIII on the planet under the orbit");
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

test("the badge of IX gives 200 metal at the start of X; the Gate of XIV does not fall while its rifts are open", () => {
	const g = start("colony10", { badges: { colony9: true } });
	assert.equal(g.act2.bonus, 200);
	const x14 = start("colony14");
	assert.equal(x14.factionFor(1).key, "watchers");
	x14.applyDamage(null, x14.hq(1), 1e9);
	assert.equal(x14.result, null);
	assert.ok(x14.hq(1));
});

test("XII · Twierdza Admiralicji: the Fortress, the convoy to the uplink with an ambush, the decision, the rifts", () => {
	const g = start("colony12");
	assert.ok(g.aiActive(), "the Admiralty is a commander");
	const hq = g.hq(1);
	assert.ok(hq.fortress, "the Fortress (its doctrine on hard: the balance test)");
	assert.ok(g.entities.filter((e) => e.team === 1 && ["turret", "flak"].includes(e.type)).length >= 4);
	assert.ok(g.aiLevel(1).patrols >= 1 && g.aiLevel(1).escorts >= 1);
	const A = g.act4,
		tech = g.get(A.technician);
	assert.equal(tech?.type, "technician");
	assert.ok(A.site && g.act2.beacons.some((b) => b.text === "STACJA UPLINK"));
	// The Fortress falls first: no victory without the uplink.
	const early = start("colony12");
	early.applyDamage(null, early.hq(1), 1e9);
	run(early, 2);
	assert.equal(early.result, null);
	const home = g.hq(0);
	// The technician walks to the station: the ambush half way, the uplink and a reactor on arrival.
	g.command([tech.id], A.site.x, A.site.y, null, false);
	for (let i = 0; i < 15 * 60 && !A.uplink; i++) {
		home.hp = home.maxHp;
		tech.hp = tech.maxHp;
		g.tick(1 / 15);
	}
	assert.ok(A.ambushed && A.uplink);
	assert.ok(["uplink", "reactor"].every((t) => g.entities.some((e) => e.team === 0 && e.type === t && e.hp > 0)));
	run(g, 1);
	assert.equal(g.campaignDecisionInfo()?.state, "pending", "Varn calls when the uplink works");
	g.applyDamage(null, g.hq(1), 1e9);
	run(g, 2);
	assert.equal(g.result, "victory", "uplink and no enemy centre: the chapter is won");
	assert.equal(g.decideCampaign("shipyard"), true);
	assert.equal(g.campaignChoice(), "shipyard");
	const progress = new CampaignProgress(memory());
	progress.record(g);
	assert.equal(progress.choices.colony12, "shipyard");

	// The technician lost: the chapter fails.
	const lost = start("colony12");
	lost.applyDamage(null, lost.get(lost.act4.technician), 1e9);
	run(lost, 2);
	assert.equal(lost.result, "defeat");
	assert.match(lost.act2.failReason, /Technik zginął/);

	// Garrison: Varn's men join at once.
	const saved = start("colony12");
	saved.act4.uplink = true;
	run(saved, 2);
	assert.equal(saved.decideCampaign("garrison"), true);
	assert.ok(saved.entities.filter((e) => e.team === 0 && e.faction === "dominion" && ["destroyer", "sentinel"].includes(e.type)).length === 3);
	// Three rifts of the Watchers over the battle.
	run(saved, 1150);
	assert.equal(saved.act4.rifts, 3);
});

test("the decision of XII changes XIII: Varn's garrison and a second flak battery, or a weaker landing", () => {
	const garrison = start("colony13", { choices: { colony12: "garrison" } });
	assert.equal(garrison.entities.filter((e) => e.team === 0 && e.faction === "dominion" && ["destroyer", "sentinel"].includes(e.type)).length, 3);
	assert.equal(garrison.entities.filter((e) => e.team === 0 && e.type === "flak").length, 2);
	const plain = start("colony13"),
		shipyard = start("colony13", { choices: { colony12: "shipyard" } });
	assert.equal(shipyard.podsLeft(1), plain.podsLeft(1) - 3);
	assert.ok(shipyard.invasion.strikeReady > plain.invasion.strikeReady);
	assert.ok(shipyard.hq(1).maxHp < plain.hq(1).maxHp);
	assert.ok(shipyard.act2.radio.some((l) => /Stocznia Admiralicji/.test(l.text)));
});

test("XIII · Ostatnia orbita: Vok holds the orbit, the landing survived, her pods shot down, the truce or her rout", () => {
	const g = start("colony13");
	assert.ok(g.aiActive());
	assert.equal(g.orbitOwner(), 1);
	assert.equal(g.podsLeft(1), RTS.ACT4_TUNE.colony13.pods.normal, "her pods by the campaign level");
	assert.equal(g.podsLeft(0), 0, "no pods for the player");
	assert.ok(g.entities.some((e) => e.team === 0 && e.type === "flak"), "a flak battery at the start");
	run(g, 700);
	assert.equal(g.act4.survived, true, "the landing is over");
	assert.ok(g.invasion.dropNo > 0, "Vok dropped her pods");
	assert.equal(g.act4.rifts, 2);
	// Pods of Vok shot down count for the badge.
	const p = start("colony13");
	const realRand = p.rand;
	p.rand = () => 0;
	const flak = p.entities.find((e) => e.team === 0 && e.type === "flak");
	for (let k = 0; k < 3; k++) p.landPod({ x: flak.x + k * 10, y: flak.y, team: 1, at: 0, pod: k });
	p.rand = realRand;
	assert.equal(p.act4.enemyShot, 3);
	assert.ok(p.act2Objectives().find((o) => o.secondary).done);
	// The decision: her headquarters broken.
	const hq = g.hq(1);
	hq.hp = hq.maxHp * 0.3;
	run(g, 2);
	assert.equal(g.campaignDecisionInfo()?.state, "pending");
	assert.equal(g.decideCampaign("truce"), true);
	assert.equal(g.result, "victory", "the truce wins the chapter");
	assert.match(g.act2Epilogue(), /flota Vok poleci/);
	const progress = new CampaignProgress(memory());
	progress.record(g);
	assert.equal(progress.choices.colony13, "truce");
	// Rout: the fight goes on to her headquarters.
	const r = start("colony13");
	const rhq = r.hq(1);
	rhq.hp = rhq.maxHp * 0.3;
	run(r, 2);
	r.decideCampaign("rout");
	assert.equal(r.result, null);
	r.applyDamage(null, r.hq(1), 1e9);
	assert.equal(r.result, "victory");
});

test("the decision of XIII changes XIV: Vok's fleet at the player's side, or metal of the Admiralty", () => {
	const truce = start("colony14", { choices: { colony13: "truce" } });
	assert.equal(truce.entities.filter((e) => e.team === 0 && e.faction === "dominion" && ["frigate", "cruiser"].includes(e.type)).length, 3);
	const plain = start("colony14"),
		rout = start("colony14", { choices: { colony13: "rout" } });
	assert.equal(rout.credits, plain.credits + 600);
	assert.ok(truce.act2.radio.some((l) => l.who === "vok"));
});

test("XIV · Brama: three rifts with guards and waves, sealed by holding them, the Gate shielded until then", () => {
	const g = start("colony14", { choices: { colony13: "truce", colony12: "garrison" } });
	assert.ok(g.aiActive());
	assert.equal(g.factionFor(1).key, "watchers");
	const A = g.act4,
		gate = g.hq(1);
	assert.equal(A.rifts14.length, 3);
	assert.equal(g.entityName(gate), "Brama");
	assert.ok(A.varn14, "Varn flies along (garrison saved in XII)");
	// The Gate is shielded: no targeting, no damage.
	const ship = g.entities.find((e) => e.team === 0 && TYPES[e.type].ship);
	assert.equal(g.canTarget(ship, gate), false);
	const hp = gate.hp;
	g.applyDamage(ship, gate, 500);
	assert.equal(gate.hp, hp);
	// Waves leave the open rifts.
	const before = g.entities.filter((e) => e.team === 1 && e.modeTagged).length;
	run(g, 125);
	assert.ok(g.entities.filter((e) => e.team === 1 && e.modeTagged).length > before, "a wave out of a rift");
	// Hold each rift with a ship and no enemy near: it closes after 20 s.
	const hold = (r) => {
		for (let i = 0; i < 15 * 32 && !r.closed; i++) {
			g.hq(0).hp = g.hq(0).maxHp;
			ship.hp = ship.maxHp;
			ship.x = r.x + 20;
			ship.y = r.y;
			ship.path = [];
			ship.order = null;
			for (const e of g.entities) if ((e.team === 1 || e.team === 4) && TYPES[e.type].speed && Math.hypot(e.x - r.x, e.y - r.y) < 320) e.hp = 0;
			g.tick(1 / 15);
		}
	};
	for (const r of A.rifts14) hold(r);
	assert.equal(A.closed, 3);
	assert.equal(g.canTarget(ship, gate), true, "the Gate is open to fire");
	g.applyDamage(null, gate, 1e9);
	run(g, 2);
	assert.equal(g.result, "victory");
	assert.match(g.act2Epilogue(), /Okręty Vok i Kolonii wracają/);
	assert.match(g.act2Epilogue(), /Varn, który zaufał/);
});

test("H7 balance: garrisons and pace by the campaign level", () => {
	const foes = (id, level) => {
		const g = start(id, { level });
		return { g, n: g.entities.filter((e) => e.team === 1 && e.hp > 0).length };
	};
	for (const id of ["colony10", "colony11", "colony12", "colony13", "colony14"]) {
		const e = foes(id, "easy").n,
			n = foes(id, "normal").n,
			h = foes(id, "hard").n;
		assert.ok(e < n && n < h, `${id}: the enemy grows with the level (${e} < ${n} < ${h})`);
	}
	const xi = start("colony11");
	assert.equal(xi.invasion.dropReady, RTS.ACT4_TUNE.colony11.drop.first);
	assert.equal(xi.invasion.dropCooldown, RTS.ACT4_TUNE.colony11.drop.every);
	assert.equal(start("colony11", { carry: { colony10: { pods: 8 } } }).podsLeft(0), RTS.ACT4_TUNE.colony11.drop.cap, "at most 6 pods from the fleet");
	for (const level of ["easy", "normal", "hard"]) assert.equal(start("colony13", { level }).podsLeft(1), RTS.ACT4_TUNE.colony13.pods[level]);
	assert.ok(!start("colony12", { level: "normal" }).doctrineOf(1) && start("colony12", { level: "hard" }).doctrineOf(1)?.id === "doctrineShields", "the Fortress's doctrine on hard");
	const easy12 = start("colony12", { level: "easy" }).aiLevel(1),
		plain12 = new RTS.Game(42, "horizon");
	plain12.configureSkirmish({ difficulty: "easy" });
	assert.ok(easy12.army[2] < plain12.aiLevel(1).army[2], "the Fortress's commander keeps a smaller army");
});

test("H7 smoke: every chapter of act IV on every level runs two minutes without errors", () => {
	for (const id of ["colony10", "colony11", "colony12", "colony13", "colony14"])
		for (const level of ["easy", "normal", "hard"]) {
			const g = start(id, { level });
			for (let i = 0; i < 120 * 10 && !g.result; i++) g.tick(0.1);
			assert.equal(g.result, null, `${id} ${level}: no early end`);
			assert.ok(g.entities.every((e) => [e.x, e.y, e.hp].every(Number.isFinite)), `${id} ${level}: sane state`);
		}
});

// 0.161 (retold in 0.170): the campaign finale film — loads without a browser, thirteen shots over about two minutes,
// captions follow the decisions.
test("the finale film's captions follow the campaign decisions", () => {
	const vm = require("node:vm"),
		fs = require("node:fs"),
		path = require("node:path");
	const ctx = vm.createContext({ RTS, Math, console });
	const src = ["campaign-film.js", "act4-film.js", "campaign-finale.js"].map((f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8")).join("\n;\n");
	vm.runInContext(src + "\n;globalThis.F = FinaleFilm;", ctx);
	const F = ctx.F;
	assert.equal(F.duration, 122);
	assert.equal(F.lengths.length, 13);
	const a = [...F.prepare({ colony6: "evacuate", colony13: "truce", colony8: "trust" }).captions],
		b = [...F.prepare({ colony6: "destroy", colony13: "rout", colony8: "distance" }).captions];
	assert.equal(a.length, 13);
	// The return, Hefajstos, the council and the people tell each story their own way.
	for (const i of [2, 5, 7, 9]) assert.notEqual(a[i], b[i], "shot " + (i + 1));
	assert.match(a[2], /Vok/);
	assert.match(b[2], /wrakami/);
	assert.match(a[5], /odbudowali/);
	assert.match(b[5], /popiołem/);
});
