const { test } = require("node:test"),
	assert = require("node:assert/strict"),
	RTS = require("../engine");
const { TYPES, SUPPORT } = RTS;
function clean(colony = true) {
	const g = new RTS.Game(42, "solar");
	g.entities = [];
	g.obstacles = [];
	g.waters = [];
	g.nodes = [];
	g.ores = [];
	g.gasFields = [];
	g.crystalFields = [];
	g.nextWave = 999999;
	g.credits = 5000;
	g.gas = 500;
	g.upgrades.colony = colony;
	g.spawn("hq", 0, 200, 200);
	g.spawn("hq", 1, 3000, 1900);
	g.visible.fill(1);
	return g;
}
const run = (g, seconds, step = 0.1) => {
	for (let t = 0; t < seconds; t += step) g.tick(step);
};

test("new types are produced where expected and respect requirements", () => {
	const g = clean(false);
	assert.equal(g.productionType("drone"), "barracks");
	assert.equal(g.productionType("saboteur"), "barracks");
	assert.equal(g.productionType("skyguard"), "factory");
	assert.match(g.developmentRequirement("shieldgen"), /Kolonia/);
	assert.match(g.developmentRequirement("saboteur"), /Kolonia/);
	assert.match(g.developmentRequirement("medbay"), /koszar/);
	g.spawn("barracks", 0, 400, 300);
	assert.equal(g.developmentRequirement("medbay"), "");
	assert.ok(TYPES.drone.flying && !TYPES.drone.damage);
	assert.equal(g.enqueue("saboteur"), false);
	g.upgrades.colony = true;
	g.get(g.entities.find((e) => e.type === "barracks").id).constructionLeft = 0;
	assert.equal(g.enqueue("saboteur"), true);
});

test("medical post heals up to three wounded infantry nearby, for metal, not vehicles", () => {
	const g = clean(),
		post = g.spawn("medbay", 0, 600, 600),
		wounded = [0, 1, 2, 3].map((i) => g.spawn("trooper", 0, 640 + i * 12, 620)),
		tank = g.spawn("tank", 0, 600, 660),
		far = g.spawn("trooper", 0, 1200, 1200);
	for (const e of [...wounded, tank, far]) e.hp = e.maxHp * 0.3;
	const credits = g.credits;
	g.supportTick(1);
	const healed = wounded.filter((e) => e.hp > e.maxHp * 0.3);
	assert.equal(healed.length, 3);
	assert.equal(post.healTargets.length, 3);
	assert.ok(Math.abs(healed[0].hp - (healed[0].maxHp * 0.3 + SUPPORT.medbay.rate * g.power.factor)) < 1e-6);
	assert.equal(tank.hp, tank.maxHp * 0.3);
	assert.equal(far.hp, far.maxHp * 0.3);
	assert.ok(g.credits < credits);
	// Under fire the treatment slows down to a quarter.
	const e = healed[0],
		before = e.hp;
	e.lastDamaged = g.time;
	g.supportTick(1);
	assert.ok(e.hp - before <= (SUPPORT.medbay.rate * g.power.factor) / 4 + 1e-6);
});

test("shield generator absorbs 70% of damage to buildings in range, overloads and recovers", () => {
	const g = clean(),
		gen = g.spawn("shieldgen", 0, 600, 600),
		lab = g.spawn("lab", 0, 700, 620),
		outside = g.spawn("depot", 0, 1300, 600),
		unit = g.spawn("trooper", 0, 650, 600),
		enemy = g.spawn("tank", 1, 900, 600);
	gen.shield = 100;
	g.applyDamage(enemy, lab, 100);
	assert.ok(Math.abs(lab.hp - (lab.maxHp - 30)) < 1e-6);
	assert.ok(Math.abs(gen.shield - 30) < 1e-6);
	g.applyDamage(enemy, outside, 100);
	assert.equal(outside.hp, outside.maxHp - 100);
	g.applyDamage(enemy, unit, 10);
	assert.equal(unit.hp, unit.maxHp - 10);
	// Depletion: overload, no protection, then a restart with a quarter of the capacity.
	g.applyDamage(enemy, lab, 100);
	assert.equal(gen.shield, 0);
	assert.equal(gen.overload, SUPPORT.shield.overload);
	const hp = lab.hp;
	g.applyDamage(enemy, lab, 50);
	assert.equal(lab.hp, hp - 50);
	for (let i = 0; i < SUPPORT.shield.overload * 10 + 1; i++) g.supportTick(0.1);
	assert.equal(gen.overload, 0);
	assert.ok(gen.shield >= SUPPORT.shield.capacity * SUPPORT.shield.restart);
});

test("wrecks: destroyed vehicles leave salvage that workers bring to the yard", () => {
	const g = clean(),
		yard = g.spawn("salvageYard", 0, 500, 500),
		worker = g.spawn("worker", 0, 520, 580),
		enemy = g.spawn("tank", 1, 800, 600),
		shooter = g.spawn("rocket", 0, 700, 600);
	g.applyDamage(shooter, enemy, enemy.hp + 5);
	assert.equal(g.wrecks.length, 1);
	const wreck = g.wrecks[0];
	assert.equal(wreck.value, Math.round(TYPES.tank.cost * SUPPORT.salvage.share));
	// Infantry leave no wreck.
	const infantry = g.spawn("trooper", 1, 820, 620);
	g.applyDamage(shooter, infantry, 999);
	assert.equal(g.wrecks.length, 1);
	g.entities = g.entities.filter((e) => e !== shooter);
	const credits = g.credits;
	assert.equal(g.salvage([worker.id], wreck.id), 1);
	run(g, 25);
	assert.equal(g.wrecks.length, 0);
	assert.equal(worker.scrap || 0, 0);
	assert.ok(g.credits - credits >= wreck.value);
	void yard;
});

test("salvage needs a finished yard", () => {
	const g = clean(),
		worker = g.spawn("worker", 0, 520, 580);
	g.wrecks = [{ id: 1, x: 700, y: 600, type: "tank", size: 20, value: 45, life: 100 }];
	assert.equal(g.salvage([worker.id], 1), 0);
	const yard = g.spawn("salvageYard", 0, 500, 500);
	yard.constructionLeft = 5;
	assert.equal(g.salvage([worker.id], 1), 0);
});

test("recon drone sees much farther than other units", () => {
	const g = clean();
	g.visible.fill(0);
	g.explored.fill(0);
	g.entities = g.entities.filter((e) => e.team !== 0);
	g.spawn("drone", 0, 1500, 1000);
	g.updateVision();
	assert.ok(g.isVisible(1500 + 480, 1000));
	g.entities = g.entities.filter((e) => e.type !== "drone");
	g.spawn("trooper", 0, 1500, 1000);
	g.updateVision();
	assert.ok(!g.isVisible(1500 + 480, 1000));
});

test("saboteurs stay hidden until enemies come close and disable a building with a charge", () => {
	const g = clean(),
		turret = g.spawn("turret", 1, 1500, 1000),
		sab = g.spawn("saboteur", 0, 1000, 1000);
	g.supportTick(0.1);
	assert.equal(sab.stealth, true);
	assert.equal(g.canTarget(turret, sab), false);
	assert.equal(g.sabotage([sab.id], turret.id), 1);
	run(g, 25);
	assert.ok(turret.disabledUntil > g.time);
	assert.equal(g.canTarget(turret, g.spawn("trooper", 0, 1520, 1000)), false);
	assert.ok(sab.chargeReady > g.time);
	// Buildings do not spot them; an enemy unit close by does, and then they can be shot.
	assert.equal(sab.stealth, true);
	const guard = g.spawn("trooper", 1, sab.x + 60, sab.y);
	g.supportTick(0.1);
	assert.equal(sab.stealth, false);
	assert.equal(g.canTarget(guard, sab), true);
});

test("sabotaging the enemy headquarters delays the next landing", () => {
	const g = clean(),
		hq = g.hq(1),
		sab = g.spawn("saboteur", 0, hq.x - 160, hq.y);
	g.nextWave = g.time + 500;
	const wave = g.nextWave;
	g.sabotage([sab.id], hq.id);
	run(g, 12);
	assert.ok(hq.disabledUntil > g.time);
	assert.equal(g.nextWave, wave + SUPPORT.saboteur.waveDelay);
});

test("modules: one per building, need a colony and resources; rapid training and veterans", () => {
	const g = clean(false),
		barracks = g.spawn("barracks", 0, 500, 400);
	assert.match(g.moduleRequirement(barracks), /Kolonia/);
	assert.equal(g.installModule(barracks.id, "rapid"), false);
	g.upgrades.colony = true;
	assert.equal(g.installModule(barracks.id, "heavyArms"), false);
	assert.equal(g.installModule(barracks.id, "rapid"), true);
	assert.equal(g.installModule(barracks.id, "veterans"), false);
	assert.equal(g.isProducer(barracks), false);
	run(g, SUPPORT.module.install + 1);
	assert.equal(barracks.moduleLeft, 0);
	assert.ok(g.isProducer(barracks));
	assert.ok(g.enqueue("trooper", barracks.id));
	assert.ok(Math.abs(g.queue.at(-1).left - TYPES.trooper.build * 0.7) < 1e-6);

	const other = g.spawn("barracks", 0, 900, 400);
	g.installModule(other.id, "veterans");
	run(g, SUPPORT.module.install + 1);
	g.queue = [];
	g.enqueue("trooper", other.id);
	run(g, TYPES.trooper.build * 1.2 + 3);
	const vet = g.units(0).find((e) => e.type === "trooper" && e.veteran);
	assert.ok(vet);
	assert.ok(Math.abs(vet.maxHp - TYPES.trooper.hp * 1.2 * (g.factionFor(0)?.hp || 1)) < 1e-6 || vet.maxHp > TYPES.trooper.hp);
});

test("turret modules: anti-air reaches aircraft, anti-armour hits vehicles harder", () => {
	const g = clean(),
		plain = g.spawn("turret", 0, 500, 500),
		aa = g.spawn("turret", 0, 600, 500),
		at = g.spawn("turret", 0, 700, 500),
		plane = g.spawn("bomber", 1, 900, 500),
		tank = g.spawn("tank", 1, 900, 600),
		soldier = g.spawn("trooper", 1, 900, 700);
	aa.module = "antiAir";
	at.module = "antiArmor";
	assert.equal(g.canTarget(aa, plane), true);
	assert.equal(g.canTarget(at, plane), g.canTarget(plain, plane));
	assert.ok(Math.abs(g.damage(at, tank) - g.damage(plain, tank) * 1.5) < 1e-6);
	assert.ok(Math.abs(g.damage(at, soldier) - g.damage(plain, soldier) * 0.7) < 1e-6);
});

test("anti-aircraft vehicle: full damage to aircraft, weak against ground", () => {
	const g = clean(),
		sky = g.spawn("skyguard", 0, 500, 500),
		plane = g.spawn("interceptor", 1, 700, 500),
		tank = g.spawn("tank", 1, 700, 600);
	assert.equal(g.canTarget(sky, plane), true);
	assert.equal(g.canTarget(sky, tank), true);
	assert.ok(g.damage(sky, tank) < g.damage(sky, plane) * 0.5);
	assert.equal(g.productionType("skyguard"), "factory");
});

test("logistics module shortens vehicle production and returns 10% of the cost", () => {
	const g = clean(),
		factory = g.spawn("factory", 0, 600, 500);
	factory.module = "logistics";
	const credits = g.credits;
	assert.ok(g.enqueue("tank", factory.id));
	const q = g.queue.at(-1);
	assert.ok(Math.abs(q.left - TYPES.tank.build * 0.75) < 1e-6);
	assert.equal(credits - g.credits, g.cost("tank") - Math.round(g.cost("tank") * 0.1));
});

test("save and load keep modules, wrecks and support state; corrupted modules are rejected", () => {
	const g = clean(),
		b = g.spawn("barracks", 0, 500, 400);
	g.installModule(b.id, "veterans");
	g.wrecks = [{ id: 3, x: 700, y: 600, type: "tank", size: 20, value: 45, life: 100 }];
	g.wreckId = 3;
	const state = g.serialize(),
		copy = RTS.Game.fromSave(JSON.parse(JSON.stringify(state)));
	assert.equal(copy.get(b.id).module, "veterans");
	assert.equal(copy.wrecks.length, 1);
	assert.equal(copy.wreckId, 3);
	const bad = JSON.parse(JSON.stringify(state));
	bad.entities.find((e) => e.id === b.id).module = "antiAir";
	assert.throws(() => RTS.Game.fromSave(bad));
	const badWreck = JSON.parse(JSON.stringify(state));
	badWreck.wrecks[0].value = -5;
	assert.throws(() => RTS.Game.fromSave(badWreck));
});
