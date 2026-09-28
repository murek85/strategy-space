const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, MISSIONS, dist } = RTS;
const { CampaignProgress } = require("../campaign");
const step = (g, s, each) => {
	for (let t = 0; t < s; t += 0.1) {
		g.tick(0.1);
		each?.(g);
		if (g.result) break;
	}
};
const peaceful = (g) => {
	g.entities = g.entities.filter(
		(e) =>
			e.team === 0 ||
			e.type === "forge" ||
			(e.type === "hq" && e.team === 1),
	);
};
const noRaids = (g) => {
	g.act2.nextRaid = 1e9;
	g.act2.nextPursuit = 1e9;
	g.act2.nextSwarm = 1e9;
};
const place = (e, p, dx = 0, dy = 0) => {
	e.x = p.x + dx;
	e.y = p.y + dy;
	e.path = [];
	e.order = null;
};
const memory = () => {
	const data = new Map();
	return { getItem: (k) => data.get(k), setItem: (k, v) => data.set(k, v) };
};

test("act II chapters unlock in order and start as scripted Kolonia missions", () => {
	assert.deepEqual(
		["colony4", "colony5", "colony6"].map((id) => MISSIONS[id].requires),
		["colony3", "colony4", "colony5"],
	);
	for (const id of ["colony4", "colony5", "colony6"]) {
		const g = new Game(42, id);
		assert.equal(g.centerLevel(), 2);
		assert.equal(g.act2.mission, id);
		assert.ok(g.act2.radio.length >= 2);
		assert.ok(g.act2Objectives().some((o) => o.secondary));
		assert.equal(g.enemyBases().length, id === "colony6" ? 1 : 0);
		for (const e of g.entities)
			assert.equal(g.blocked(e.x, e.y, 8), false, id + " " + e.type);
		const points = [
			g.act2.pad,
			g.act2.camp,
			g.act2.archive,
			...(g.act2.stops || []),
			...g.nodes,
		].filter(Boolean);
		for (const p of points) assert.ok(g.pathTo(g.hq(0), p).length, id);
	}
});

test("IV: researchers are found, archive read, core carried by transport and all evacuated", () => {
	const g = new Game(42, "colony4");
	peaceful(g);
	noRaids(g);
	const s = g.act2;
	const [tank] = g.units(0).filter((e) => e.type === "tank"),
		carrier = g.units(0).find((e) => e.type === "transport");
	place(tank, s.camp, -150);
	g.tick(0.1);
	assert.equal(s.discovered, true);
	assert.equal(g.units(0).filter((e) => e.type === "scientist").length, 4);
	const staff = g.units(0).filter((e) => e.type === "scientist");
	place(staff[0], s.archive, 40);
	step(g, 6);
	assert.equal(s.phase, 1);
	step(g, 7);
	assert.equal(s.phase, 2);
	place(carrier, s.coreSite, 30);
	g.tick(0.1);
	peaceful(g);
	assert.equal(carrier.archive, true);
	assert.equal(s.core, "loaded");
	assert.equal(g.transportSeats(carrier), 3);
	place(carrier, s.pad);
	g.tick(0.1);
	assert.equal(s.core, "delivered");
	assert.equal(carrier.archive, false);
	assert.equal(g.result, null);
	for (const e of g.units(0).filter((e) => e.type === "scientist"))
		place(e, s.pad, 20);
	g.tick(0.1);
	assert.equal(s.evacuated, 4);
	assert.equal(g.result, "victory");
	assert.equal(g.act2Secondary(), true);
});

test("IV: destroyed carrier drops the core and too many dead researchers fail the mission", () => {
	const g = new Game(42, "colony4");
	peaceful(g);
	noRaids(g);
	const s = g.act2,
		carrier = g.units(0).find((e) => e.type === "transport");
	place(
		g.units(0).find((e) => e.type === "tank"),
		s.camp,
		-150,
	);
	g.tick(0.1);
	s.phase = 2;
	s.reading = 12;
	place(carrier, s.coreSite, 20);
	g.tick(0.1);
	peaceful(g);
	const wreck = { x: carrier.x, y: carrier.y };
	g.applyDamage(g.hq(0), carrier, 1e4);
	assert.equal(s.core, "dropped");
	assert.ok(dist(s.coreSite, wreck) < 1);
	const spare = g.spawn("transport", 0, s.coreSite.x + 30, s.coreSite.y);
	g.tick(0.1);
	assert.equal(spare.archive, true);
	const restored = Game.fromSave(g.serialize());
	assert.equal(restored.get(spare.id).archive, true);
	assert.equal(restored.act2.core, "loaded");
	const staff = g.units(0).filter((e) => e.type === "scientist");
	for (const e of staff.slice(0, 3)) g.applyDamage(g.hq(0), e, 1e3);
	g.tick(0.1);
	assert.equal(g.result, "defeat");
	assert.match(g.act2.failReason, /badaczy/);
	assert.ok(g.act2.losses >= 4);
});

test("V: convoy halts at stops until the depot stands and vehicles are repaired, then arrives", () => {
	const g = new Game(42, "colony5");
	const s = g.act2;
	noRaids(g);
	s.stormCycle = 1e9;
	const purge = (g) => {
		g.entities = g.entities.filter((e) => e.team === 0);
	};
	const orders = g.command(
		g.haulers().map((e) => e.id),
		100,
		100,
	);
	assert.equal(g.haulers()[0].order, null);
	step(g, 26, purge);
	assert.equal(s.mode, "moving");
	while (s.mode !== "halt" && g.time < 90) step(g, 1, purge);
	assert.equal(s.mode, "halt");
	assert.equal(s.leg, 0);
	const weak = g.haulers()[0];
	weak.hp = weak.maxHp * 0.3;
	g.entities = g.entities.filter((e) => e !== g.stopDepot(s.stops[0]));
	step(g, 31, purge);
	assert.equal(s.mode, "halt");
	assert.match(g.convoyStatus(), /odbuduj magazyn/);
	g.spawn("depot", 0, s.stops[0].depot.x, s.stops[0].depot.y);
	step(g, 2, purge);
	assert.equal(s.mode, "halt");
	weak.hp = weak.maxHp;
	step(g, 1, purge);
	assert.equal(s.leg, 1);
	const restored = Game.fromSave(g.serialize());
	assert.equal(restored.act2.leg, 1);
	assert.ok(restored.haulers().every((e) => e.convoy));
	for (let i = 0; i < 120 && !g.result; i++) {
		step(g, 5, (g) => {
			purge(g);
			if (g.act2.mode === "halt") g.act2.haltLeft = 0;
		});
	}
	assert.equal(s.mode, "arrived");
	assert.equal(s.delivered, 3);
	assert.equal(g.result, "victory");
	assert.equal(g.act2Secondary(), true);
});

test("V: blizzard stops the convoy and losing two haulers fails the mission", () => {
	const g = new Game(42, "colony5");
	const s = g.act2;
	noRaids(g);
	g.time = 100;
	s.mode = "moving";
	s.phase = 1;
	g.driveConvoy(true);
	g.tick(0.1);
	assert.ok(g.weather.intensity > 0.35);
	assert.equal(s.mode, "storm");
	assert.ok(
		g.entities.some((e) => e.team === 1),
		"storm raid spawned",
	);
	assert.ok(g.haulers().every((e) => e.order?.kind === "hold"));
	const [a, b] = g.haulers();
	g.applyDamage(g.hq(0), a, 1e4);
	g.applyDamage(g.hq(0), b, 1e4);
	g.tick(0.1);
	assert.equal(g.result, "defeat");
	assert.match(g.act2.failReason, /rdzeni/);
	assert.equal(g.act2Secondary(), false);
});

test("VI: capturing nodes asks for a decision; overload blast damages everything nearby", () => {
	const g = new Game(42, "colony6");
	const s = g.act2;
	noRaids(g);
	g.nextWave = 1e9;
	g.entities = g.entities.filter(
		(e) => e.team !== 1 || e.type === "forge" || dist(e, g.forge()) > 500,
	);
	assert.equal(g.act2Choose("destroy"), false);
	g.nodes.forEach((n) => (n.owner = 0));
	g.tick(0.1);
	assert.equal(s.decision, "pending");
	const forge = g.forge(),
		nearby = g.spawn("trooper", 0, forge.x + 150, forge.y),
		turret = g.entities.find(
			(e) => e.team === 1 && e.type === "turret" && dist(e, forge) > 1000,
		),
		hp = turret.hp,
		credits = g.credits;
	assert.equal(g.canTarget(nearby, forge), false);
	assert.equal(g.act2Choose("destroy"), true);
	assert.equal(g.act2Choose("evacuate"), false);
	const saved = Game.fromSave(g.serialize());
	assert.equal(saved.act2.choice, "destroy");
	step(g, 21);
	assert.equal(s.exploded, true);
	assert.equal(g.forge(), undefined);
	assert.equal(nearby.hp <= 0, true);
	assert.ok(s.blastLosses >= 1);
	assert.ok(turret.hp <= hp * 0.5 + 1);
	assert.ok(g.credits >= credits + 400);
	assert.equal(g.result, null);
	g.applyDamage(nearby, g.hq(1), 1e5);
	g.tick(0.1);
	assert.equal(g.result, "victory");
	assert.equal(g.act2Secondary(), false);
	assert.match(g.act2Epilogue(), /przestało istnieć/);
});

test("VI: evacuating technicians grants a technology and a distinct epilogue", () => {
	const g = new Game(42, "colony6");
	const s = g.act2;
	noRaids(g);
	g.nextWave = 1e9;
	g.applyDamage(g.hq(0), g.hq(1), 1e5);
	g.tick(0.1);
	assert.equal(g.result, null, "enemy HQ alone is not enough");
	g.nodes.forEach((n) => (n.owner = 0));
	g.tick(0.1);
	assert.ok(g.act2Choose("evacuate"));
	const techs = g.units(0).filter((e) => e.type === "technician");
	assert.equal(techs.length, 6);
	assert.equal(g.upgrades.armor, false);
	for (const e of techs) place(e, s.pad, 10);
	g.tick(0.1);
	assert.equal(s.evacuated, 6);
	assert.equal(s.bonus, "armor");
	assert.equal(g.upgrades.armor, true);
	assert.equal(g.result, "victory");
	assert.equal(g.act2Secondary(), true);
	assert.match(g.act2Epilogue(), /elektrownię/);
});

test("VI: losing technicians during evacuation fails the chapter", () => {
	const g = new Game(42, "colony6");
	noRaids(g);
	g.nodes.forEach((n) => (n.owner = 0));
	g.tick(0.1);
	g.act2Choose("evacuate");
	for (const e of g
		.units(0)
		.filter((e) => e.type === "technician")
		.slice(0, 3))
		g.applyDamage(g.hq(0), e, 1e3);
	g.tick(0.1);
	assert.equal(g.result, "defeat");
	assert.match(g.act2.failReason, /techników/);
});

test("campaign progress keeps badges and decisions; badges grant a limited bonus to the next chapter", () => {
	const storage = memory(),
		p = new CampaignProgress(storage);
	const four = new Game(42, "colony4");
	four.result = "victory";
	four.act2.evacuated = 4;
	four.act2.discovered = true;
	assert.ok(p.record(four));
	const six = new Game(42, "colony6");
	six.result = "victory";
	six.act2.choice = "evacuate";
	assert.ok(p.record(six));
	const again = new CampaignProgress(storage);
	assert.equal(again.completed.colony4, true);
	assert.equal(again.badges.colony4, true);
	assert.equal(again.choices.colony6, "evacuate");
	const five = new Game(42, "colony5"),
		before = five.credits;
	assert.equal(five.applyAct2Bonus(again.badges), 200);
	assert.equal(five.credits, before + 200);
	assert.equal(five.applyAct2Bonus(again.badges), 0);
	assert.equal(new Game(42, "colony6").applyAct2Bonus({}), 0);
	const broken = new Game(42, "colony4").serialize();
	broken.act2.core = "lost";
	assert.throws(() => Game.fromSave(broken), /archiwum/);
	const old = new Game(42, "colony2").serialize();
	assert.equal(Game.fromSave(old).act2, undefined);
});
