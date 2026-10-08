const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, MISSIONS, SPACE } = RTS;

// A quiet spot: no cloud, no rocks, near the player's base and far from the enemy's.
const quietSpot = (g) => {
	const own = g.hq(0),
		foe = g.hq(1);
	let best = null;
	for (let y = 200; y < g.H - 200; y += 40)
		for (let x = 200; x < g.W - 200; x += 40) {
			const p = { x, y, type: "frigate" };
			if (g.inNebula(p) || g.byAsteroids(p) || g.blocked(x, y, 40) || RTS.dist(p, foe) < 900 || RTS.dist(p, own) < 250) continue;
			const d = RTS.dist(p, own);
			if (!best || d < best.d) best = { x, y, d };
		}
	return best;
};
const orbit = (input = {}) => {
	const g = new Game(7, "orbit");
	g.configureSkirmish({ size: "medium", players: 2, ...input });
	return g;
};

test("the orbital map is a scenario map in space: no night or wildlife, ion storms for weather", () => {
	const m = MISSIONS.orbit;
	assert.ok(m && m.space && !m.campaign && m.theme === "space");
	const g = orbit({ fauna: "many", weather: "harsh" });
	assert.equal(g.space, true);
	assert.equal(new Game(7, "horizon").space, false);
	assert.equal(g.weather.kind, "ion");
	assert.equal(g.weather.name, "Burza jonowa");
	assert.equal(g.night, 0);
	// No wildlife (the neutral side has only pirates in space).
	assert.equal(g.entities.filter((e) => e.team === 2 && !TYPES[e.type].pirate).length, 0);
	assert.ok(g.obstacles.length >= 8 && g.obstacles.every((o) => o.kind === "asteroids" || !o.kind));
	// Every base reaches the middle of the belt.
	for (const hq of g.entities.filter((e) => e.type === "hq")) assert.ok(g.reachable(hq)({ x: g.W / 2, y: g.H / 2 }), "hq " + hq.team);
});

test("starting forces and spawned ground units become ships; ground units cannot be built in space", () => {
	const g = orbit({ players: 4 });
	const fighters = g.entities.filter((e) => TYPES[e.type].speed && TYPES[e.type].damage && e.type !== "worker");
	assert.ok(fighters.length > 0);
	assert.ok(fighters.every((e) => TYPES[e.type].ship), fighters.map((e) => e.type).join());
	assert.equal(g.spawn("tank", 1, 900, 900).type, "lancer");
	assert.equal(g.spawn("heavy", 1, 900, 900).type, "cruiser");
	assert.equal(g.spawn("trooper", 1, 900, 900).shield, TYPES.corvette.shield);
	assert.match(g.developmentRequirement("tank"), /orbicie/);
	assert.equal(g.enqueue("trooper"), false);
	assert.equal(g.productionType("frigate"), "barracks");
	assert.equal(g.productionType("cruiser"), "factory");
	assert.match(g.developmentRequirement("cruiser"), /laboratorium/);
	// Ships only fight in space.
	assert.match(new Game(7, "horizon").developmentRequirement("corvette"), /orbicie/);
	assert.equal(g.unitName("barracks"), "Stocznia lekka");
	assert.equal(g.entityName(g.hq(0)), "Stacja dowodzenia");
	assert.equal(new Game(7, "horizon").unitName("barracks"), TYPES.barracks.name);
});

test("a shipyard builds a ship that keeps its shield through a save", () => {
	const g = orbit();
	g.credits = 5000;
	const before = g.nextId;
	assert.equal(g.enqueue("corvette"), true);
	for (let i = 0; i < 40 * 8; i++) g.tick(1 / 40);
	const ship = g.entities.find((e) => e.type === "corvette" && e.team === 0 && e.id >= before);
	assert.ok(ship, "corvette launched");
	assert.equal(ship.shield, TYPES.corvette.shield);
	const r = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.equal(r.get(ship.id).shield, ship.shield);
	assert.equal(r.space, true);
});

test("shields take hits first and come back after a quiet spell; class bonuses", () => {
	const g = orbit();
	g.entities = g.entities.filter((e) => e.type === "hq");
	const spot = quietSpot(g),
		target = g.spawn("frigate", 0, spot.x, spot.y),
		cap = TYPES.frigate.shield;
	g.applyDamage(null, target, 40);
	assert.equal(target.hp, target.maxHp);
	assert.equal(target.shield, cap - 40);
	g.applyDamage(null, target, cap);
	assert.equal(target.shield, 0);
	assert.ok(Math.abs(target.hp - (target.maxHp - 40)) < 1e-9);
	assert.ok(g.effects.some((f) => f.kind === "shieldHit" && f.ship));
	const hp = target.hp;
	for (let i = 0; i < 20 * (SPACE.shield.delay - 1); i++) g.tick(1 / 20);
	assert.equal(target.shield, 0, "no recharge while recently hit");
	for (let i = 0; i < 20 * 12; i++) g.tick(1 / 20);
	assert.ok(target.shield > cap * 0.9, "recharged: " + target.shield);
	assert.ok(target.hp >= hp, "the hull took no more damage");
	// Frigates hunt corvettes, destroyers break cruisers, corvettes are weak against stations.
	const frigate = g.spawn("frigate", 0, 1500, 1080),
		lancer = g.spawn("lancer", 0, 1500, 1080),
		corvette = g.spawn("corvette", 0, 1500, 1080),
		small = g.spawn("corvette", 1, 1700, 1080),
		big = g.spawn("cruiser", 1, 1700, 1080);
	assert.ok(g.damage(frigate, small) > g.damage(frigate, big) * 2);
	assert.ok(g.damage(lancer, big) > g.damage(lancer, small) * 3);
	assert.ok(g.damage(corvette, g.hq(1)) < TYPES.corvette.damage);
});

test("the commander in space builds ships and fights with them", () => {
	const g = orbit({ difficulty: "hard" });
	for (let i = 0; i < 4 * 240; i++) g.tick(0.25);
	const enemy = g.entities.filter((e) => e.team === 1 && TYPES[e.type].speed && e.type !== "worker");
	assert.ok(enemy.length >= 4, "fleet: " + enemy.map((e) => e.type).join());
	assert.ok(enemy.every((e) => TYPES[e.type].ship || TYPES[e.type].flying), enemy.map((e) => e.type).join());
});

test("nebulae and asteroid fields give cover; shields do not come back inside a nebula", () => {
	const g = orbit();
	g.entities = g.entities.filter((e) => e.type === "hq");
	const gas = g.gasFields[0],
		rock = g.obstacles.find((o) => o.kind === "asteroids"),
		attacker = g.spawn("frigate", 1, 100, 100),
		inCloud = g.spawn("frigate", 0, gas.x + 20, gas.y),
		byRock = g.spawn("frigate", 0, rock.x - 30, rock.y + rock.h / 2),
		spot = quietSpot(g),
		open = g.spawn("frigate", 0, spot.x, spot.y);
	assert.ok(g.inNebula(inCloud));
	assert.ok(g.byAsteroids(byRock));
	assert.ok(!g.inNebula(open) && !g.byAsteroids(open));
	const base = g.damage(attacker, open);
	assert.ok(Math.abs(g.damage(attacker, inCloud) - base * SPACE.nebula.cover) < 1e-9);
	assert.ok(Math.abs(g.damage(attacker, byRock) - base * SPACE.asteroids.cover) < 1e-9);
	// Buildings and units off the orbit keep their damage.
	assert.equal(new Game(7, "horizon").byAsteroids({ x: 900, y: 900, type: "tank" }), false);
	inCloud.shield = open.shield = 0;
	inCloud.shieldHit = open.shieldHit = -100;
	g.entities = g.entities.filter((e) => e !== attacker);
	for (let i = 0; i < 20 * 3; i++) g.tick(1 / 20);
	assert.equal(inCloud.shield, 0);
	assert.ok(open.shield > 0);
});

test("ships and mining drones leave no tread marks in space", () => {
	const g = orbit();
	for (let i = 0; i < 20 * 10; i++) g.tick(1 / 20);
	assert.equal(g.tracks.length, 0);
	const h = new Game(7, "horizon");
	h.configureSkirmish({ size: "medium", players: 2 });
	for (let i = 0; i < 20 * 10; i++) h.tick(1 / 20);
	assert.ok(h.tracks.length > 0, "workers on a planet still leave tracks");
});

test("a carrier launches its wing of fighters, sends them at nearby enemies, and they outlive it only briefly", () => {
	const g = orbit();
	g.entities = g.entities.filter((e) => e.type === "hq");
	assert.equal(g.productionType("carrier"), "factory");
	assert.match(g.developmentRequirement("carrier"), /laboratorium/);
	assert.equal(g.enqueue("fighter"), false);
	const spot = quietSpot(g),
		c = g.spawn("carrier", 0, spot.x, spot.y),
		pop = g.population(0);
	for (let i = 0; i < 20 * (SPACE.carrier.launch * SPACE.carrier.wing + 4); i++) g.tick(1 / 20);
	const wing = g.entities.filter((e) => e.type === "fighter" && e.team === 0);
	assert.equal(wing.length, SPACE.carrier.wing);
	assert.equal(g.population(0), pop, "fighters take no army places");
	assert.ok(wing.every((f) => f.mothership === c.id && RTS.dist(f, c) < SPACE.carrier.reach));
	// An enemy near the carrier draws the wing; ships can fire at fighters (craft in the air).
	const foe = g.spawn("corvette", 1, c.x + 200, c.y);
	for (let i = 0; i < 20 * 1; i++) g.tick(1 / 20);
	assert.ok(wing.some((f) => f.order?.kind === "attack" && f.order.targetId === foe.id));
	assert.equal(g.canTarget(g.spawn("frigate", 1, c.x + 900, c.y), wing[0]), true);
	g.applyDamage(null, c, 1e7);
	for (let i = 0; i < 20 * (SPACE.carrier.orphan + 2); i++) g.tick(1 / 20);
	assert.equal(g.entities.filter((e) => e.type === "fighter" && e.team === 0).length, 0);
});

test("an ion storm: aim suffers, ships are not slowed, shields do not recharge; a forecast warns of it", () => {
	const g = orbit();
	g.entities = g.entities.filter((e) => e.type === "hq");
	const spot = quietSpot(g),
		ship = g.spawn("frigate", 0, spot.x, spot.y),
		calm = g.movementFactor(ship);
	let t = 0;
	while (g.weather.intensity < 0.9 && t < 3000) g.time = t += 1;
	assert.ok(g.weather.intensity > 0.9, "a storm comes");
	assert.ok(g.accuracy(ship) < 0.8);
	assert.ok(Math.abs(g.movementFactor(ship) - calm) < 1e-9, "no slowing in vacuum");
	assert.equal(g.ionStorm(), true);
	ship.shield = 0;
	ship.shieldHit = -1e9;
	for (let i = 0; i < 20 * 2; i++) g.tick(1 / 20);
	assert.equal(ship.shield, 0);
	assert.equal(new Game(7, "horizon").ionStorm(), false);
});

test("pirates: hideouts far from the bases build crews and raid each side in turn; bounties; saved", () => {
	for (const [fauna, bases] of [["few", 1], ["normal", 1], ["many", 2]]) {
		const g = orbit({ fauna, players: 3 });
		const hideouts = g.entities.filter((e) => e.type === "pirateBase");
		assert.equal(hideouts.length, bases, fauna);
		for (const h of hideouts) {
			assert.equal(h.team, 2);
			for (const hq of g.entities.filter((e) => e.type === "hq")) assert.ok(RTS.dist(h, hq) > 700, fauna + " far from bases");
		}
	}
	const g = orbit({ fauna: "normal", players: 2 });
	const h = g.entities.find((e) => e.type === "pirateBase");
	g.time = SPACE.pirates.first - 1;
	for (let i = 0; i < 20 * 3; i++) g.tick(1 / 20);
	const raiders = g.entities.filter((e) => e.type === "pirate" && e.raidUntil != null);
	assert.ok(raiders.length >= 1, "a raid set out");
	assert.ok(raiders.every((f) => f.order?.kind === "attackMove"));
	assert.equal(g.pirates.turn, 1);
	// Bounty for the side that destroys a pirate.
	const credits = g.credits,
		hunter = g.spawn("cruiser", 0, h.x - 100, h.y),
		prey = g.spawn("pirate", 2, h.x - 120, h.y);
	g.applyDamage(hunter, prey, 1e6);
	assert.equal(g.credits, credits + SPACE.pirates.bounty.pirate);
	const r = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
	assert.deepEqual(r.pirates, g.pirates);
	// Off the orbit there are no pirates.
	const p = new Game(7, "horizon");
	p.configureSkirmish({ size: "medium", players: 2 });
	assert.equal(p.entities.filter((e) => TYPES[e.type].pirate).length, 0);
});

test("space storms take turns: ion, solar (shields drain), asteroid shower (impacts after a while, meteor shields)", () => {
	const g = orbit();
	const storm = (kind) => {
		let t = 0;
		while (!(g.weather.kind === kind && g.weather.intensity > 0.9) && t < 5000) g.time = t += 1;
		return t;
	};
	// The forecast names the next storm before it comes.
	g.time = 0;
	assert.equal(g.weather.kind, "ion");
	const tSolar = storm("solar");
	assert.ok(tSolar > 0 && tSolar < 5000);
	assert.equal(g.weather.name, "Burza słoneczna");
	g.entities = g.entities.filter((e) => e.type === "hq");
	const spot = quietSpot(g),
		ship = g.spawn("cruiser", 0, spot.x, spot.y);
	assert.equal(g.accuracy(ship), 1, "a solar storm does not spoil aim");
	const before = ship.shield;
	for (let i = 0; i < 20 * 3; i++) g.tick(1 / 20);
	assert.ok(ship.shield < before, "radiation drains the shield");
	// The asteroid shower: nothing at first, impacts once it has lasted.
	const g2 = orbit();
	g2.entities = g2.entities.filter((e) => e.type === "hq" || e.team === 2);
	let t = 0;
	while (!(g2.weather.kind === "meteor" && g2.weather.remaining > 0)) g2.time = t += 0.5;
	const w = g2.weather;
	assert.equal(w.name, "Deszcz asteroid");
	const hpAll = () => g2.entities.reduce((n, e) => n + e.hp, 0);
	g2.time = t + RTS.SPACE.meteor.after + 4;
	const hp0 = hpAll();
	const booms = () => g2.effects.filter((f) => f.meteor).length;
	for (let i = 0; i < 20 * 12; i++) g2.tick(1 / 20);
	assert.ok(booms() > 0 || hpAll() < hp0, "impacts strike");
	// The research: only on the orbit, it softens the blows.
	assert.equal(new Game(7, "horizon").researchStatus("meteorShield").allowed, false);
	assert.equal(RTS.RESEARCH.meteorShield.building, "lab");
});

test("storm warnings in space speak of what the storm does, not of movement", () => {
	const g = orbit();
	for (const kind of ["ion", "solar", "meteor"]) {
		const text = g.stormEffects({ kind });
		assert.ok(text.length > 10 && !/ruch/i.test(text), kind + ": " + text);
	}
	assert.match(new Game(7, "horizon").stormEffects({ kind: "sand" }), /Ruch/);
	// The warning itself, with weather monitoring.
	g.upgrades.meteorology = true;
	g.entities.push(Object.assign(g.spawn("lab", 0, g.hq(0).x + 200, g.hq(0).y), { constructionLeft: 0 }));
	const notes = [];
	g.notify = (text) => notes.push(text);
	for (let t = 0; t < 400 && !notes.some((n) => n.startsWith("OSTRZEŻENIE")); t += 0.5) {
		g.time = t;
		g.tick(0.01);
	}
	const warning = notes.find((n) => n.startsWith("OSTRZEŻENIE"));
	assert.ok(warning && !/Ruch/.test(warning), warning);
});

test("three more maps in space, each its own world: layout, look and storms", () => {
	const ids = ["glacis", "abyss", "graveyard"];
	const looks = new Set();
	for (const id of ids) {
		const m = MISSIONS[id];
		assert.ok(m && m.space && !m.campaign && m.look && m.description.length > 80, id);
		looks.add(m.look.blackHole ? "void" : m.look.planet);
		for (const size of ["small", "medium", "large"]) {
			const g = new Game(7, id);
			g.configureSkirmish({ size, players: 4 });
			const hqs = g.entities.filter((e) => e.type === "hq"),
				reach = g.reachable(hqs[0]);
			for (const o of [...g.ores, ...g.gasFields, ...g.crystalFields]) {
				assert.equal(g.blocked(o.x, o.y, 10), false, id + " deposit free");
				assert.ok(reach(o), id + " deposit reachable");
			}
			for (const hq of hqs) assert.ok(reach(hq), id + " bases connected");
			assert.ok(g.entities.some((e) => e.type === "pirateBase"), id + " pirates");
		}
		// Only its own storms come.
		const g = new Game(7, id);
		g.configureSkirmish({ size: "medium", players: 2 });
		const kinds = new Set();
		for (let t = 0; t < 2000; t += 5) {
			g.time = t;
			kinds.add(g.weather.kind);
		}
		assert.deepEqual([...kinds].sort(), [...m.storms].sort(), id);
	}
	assert.equal(looks.size, 3, "three different worlds");
	assert.ok(new Game(7, "graveyard").obstacles.some((o) => o.kind === "hulk"));
	assert.equal(new Game(7, "abyss").weather.name, "Rozbłysk dysku");
});
