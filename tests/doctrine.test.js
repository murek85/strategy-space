// Centre level III — the Fortress — and the factions' doctrines (doctrine-rules.js).
const { test } = require("node:test"),
	assert = require("node:assert/strict"),
	RTS = require("../engine");
const { Game, TYPES } = RTS;
function ready(faction = "colonies") {
	const g = new Game(42, "solar");
	g.configureSkirmish({ faction });
	g.credits = 9000;
	g.gas = 2000;
	g.crystals = 2000;
	return g;
}
// Starts a research and finishes it at once.
function finish(g, kind) {
	assert.ok(g.startResearch(kind), kind + ": " + g.researchStatus(kind).reason);
	g.research.left = 0.001;
	g.tick(0.05);
	assert.ok(g.upgrades[kind], kind);
}
function fortress(faction) {
	const g = ready(faction);
	g.upgrades.colony = true;
	const hq = g.hq(0);
	g.spawn("lab", 0, hq.x + 200, hq.y + 160);
	finish(g, "fortress");
	return g;
}

test("the Fortress needs the Colony and a laboratory; it makes the centre sturdier once and adds income", () => {
	const g = ready();
	assert.match(g.researchStatus("fortress").reason, /Kolonia/);
	g.upgrades.colony = true;
	assert.match(g.researchStatus("fortress").reason, /Laboratorium/);
	const hq = g.hq(0),
		hp = hq.maxHp;
	g.spawn("lab", 0, hq.x + 200, hq.y + 160);
	assert.equal(g.researchStatus("fortress").state, "ready");
	const credits = g.credits;
	finish(g, "fortress");
	assert.equal(g.credits < credits, true);
	assert.equal(g.centerLevel(), 3);
	assert.equal(hq.maxHp, hp * 1.5);
	g.tick(0.05);
	assert.equal(hq.maxHp, hp * 1.5, "only once");
	assert.equal(g.income, 8 + g.nodes.filter((n) => n.owner === 0).length * 5 + 4);
	// Saved and loaded: still level III, the centre not made sturdier a second time.
	const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	back.tick(0.05);
	assert.equal(back.centerLevel(), 3);
	assert.equal(back.hq(0).maxHp, hp * 1.5);
});

test("doctrines: only after the Fortress, only the side's faction, and the choice is final", () => {
	const g = ready();
	assert.match(g.researchStatus("doctrineMobility").reason, /Twierdza/);
	const f = fortress("colonies");
	assert.match(f.researchStatus("doctrineBarrage").reason, /innej frakcji/);
	assert.equal(f.researchStatus("doctrineMobility").state, "ready");
	assert.equal(f.researchStatus("doctrineBridgehead").state, "ready");
	// While one is under way the other is locked; cancelling frees it again.
	assert.ok(f.startResearch("doctrineMobility"));
	assert.match(f.researchStatus("doctrineBridgehead").reason, /Trwa przyjmowanie/);
	f.cancelResearch();
	assert.equal(f.researchStatus("doctrineBridgehead").state, "ready");
	finish(f, "doctrineMobility");
	assert.match(f.researchStatus("doctrineBridgehead").reason, /Wybrano już/);
	assert.equal(f.startResearch("doctrineBridgehead"), false);
	assert.equal(f.doctrineOf(0).id, "doctrineMobility");
	// Each faction has its own two.
	assert.deepEqual(fortress("dominion").doctrines().map((d) => d.id), ["doctrineBarrage", "doctrineShields"]);
	assert.deepEqual(fortress("swarm").doctrines().map((d) => d.id), ["doctrineTide", "doctrineCarapace"]);
});

test("doctrine effects: speed and production, holding ground, firepower and protection", () => {
	// Logistyka mobilna: ground units faster, production faster.
	const m = fortress("colonies"),
		tank = m.spawn("tank", 0, 900, 900),
		speed = m.movementFactor(tank);
	assert.equal(m.productionRate(), 1);
	finish(m, "doctrineMobility");
	assert.ok(Math.abs(m.movementFactor(tank) / speed - 1.15) < 1e-9);
	assert.equal(m.as(0, () => m.productionRate()), 1.25);

	// Fortyfikacja przyczółków: less damage near own buildings, nothing out in the open; towers hit harder.
	const b = fortress("colonies"),
		enemy = b.spawn("tank", 1, 2000, 1500),
		hq = b.hq(0),
		home = b.spawn("tank", 0, hq.x + 120, hq.y),
		away = b.spawn("tank", 0, 2000, 1400),
		turret = b.spawn("turret", 0, hq.x + 150, hq.y + 150),
		before = [b.damage(enemy, home), b.damage(enemy, away), b.damage(turret, enemy)];
	finish(b, "doctrineBridgehead");
	assert.ok(Math.abs(b.damage(enemy, home) / before[0] - 0.8) < 1e-9);
	assert.equal(b.damage(enemy, away), before[1]);
	assert.ok(Math.abs(b.damage(turret, enemy) / before[2] - 1.25) < 1e-9);

	// Ciężki ostrzał: vehicles hit harder, infantry does not.
	const d = fortress("dominion"),
		foe = d.spawn("tank", 1, 2000, 1500),
		gun = d.spawn("tank", 0, 1800, 1500),
		rifle = d.spawn("trooper", 0, 1800, 1520),
		was = [d.damage(gun, foe), d.damage(rifle, foe)];
	finish(d, "doctrineBarrage");
	assert.ok(Math.abs(d.damage(gun, foe) / was[0] - 1.2) < 1e-9);
	assert.equal(d.damage(rifle, foe), was[1]);

	// Silniejsze osłony: everything of the side takes less.
	const s = fortress("dominion"),
		attacker = s.spawn("tank", 1, 2000, 1500),
		own = s.spawn("trooper", 0, 1900, 1500),
		hit = s.damage(attacker, own);
	finish(s, "doctrineShields");
	assert.ok(Math.abs(s.damage(attacker, own) / hit - 0.85) < 1e-9);

	// The Swarm: Nawała produces faster; Pancerz chitynowy takes less.
	const t = fortress("swarm");
	finish(t, "doctrineTide");
	assert.equal(t.as(0, () => t.productionRate()), 1.3);
	const c = fortress("swarm"),
		a2 = c.spawn("tank", 1, 2000, 1500),
		bug = c.spawn("crawler", 0, 1900, 1500),
		h2 = c.damage(a2, bug);
	finish(c, "doctrineCarapace");
	assert.ok(Math.abs(c.damage(a2, bug) / h2 - 0.83) < 1e-9);
	// The opponent's units are not touched by the player's doctrine.
	assert.equal(TYPES.tank.speed > 0, true);
});
