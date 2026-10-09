// H3 (0.154): the Watchers of the Abyss — the fourth faction (watchers-rules.js).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;
const W = RTS.WATCHERS;
const run = (g, seconds, dt = 1 / 15) => {
	for (let i = 0; i < seconds / dt && !g.result; i++) g.tick(dt);
	return g;
};
const watchers = (opts = {}) => {
	const g = new Game(5);
	g.configureSkirmish({ faction: "watchers", enemy: "waves", ...opts });
	return g;
};
// A free point at distance r from the player's Core.
function near(g, r, from = g.hq(0)) {
	for (let a = 0; a < 32; a++) {
		const p = { x: Math.round(from.x + Math.cos(a / 5) * r), y: Math.round(from.y + Math.sin(a / 5) * r) };
		if (!g.blocked(p.x, p.y, 30) && !g.entities.some((e) => e.hp > 0 && dist(e, p) < 50)) return p;
	}
	throw Error("no free point");
}

test("the Watchers are a playable faction: names, wards on everything, no ore mining", () => {
	const g = watchers();
	assert.equal(g.factionFor(0).key, "watchers");
	const hq = g.hq(0);
	assert.equal(g.entityName(hq), "Rdzeń");
	run(g, 0.2);
	assert.ok(hq.wardMax > 0 && hq.ward === hq.wardMax, "starting buildings get their ward");
	const p = near(g, 160),
		s = g.spawn("spark", 0, p.x, p.y);
	assert.equal(s.faction, "watchers");
	assert.equal(s.wardMax, Math.round(s.maxHp * W.shield.share));
	const hp = s.hp;
	g.applyDamage(null, s, s.wardMax - 1);
	assert.equal(s.hp, hp, "the ward soaks the hit");
	g.applyDamage(null, s, 5);
	assert.equal(s.hp, hp - 4);
	run(g, W.shield.delay + 10);
	assert.ok(s.ward > s.wardMax * 0.9, "the ward comes back after a pause");
	const worker = g.entities.find((e) => e.team === 0 && e.type === "worker");
	assert.equal(g.gather([worker.id], g.ores[0].id), false, "Weavers do not mine ore");
	assert.ok(g.entities.filter((e) => e.team === 0 && e.type === "worker").every((e) => !e.order), "the starting Weavers wait at the Core instead of walking to the ore");
	assert.equal(g.productionType("spark"), "barracks");
	assert.equal(g.productionType("warden"), "factory");
	assert.equal(g.productionType("construct"), null, "the Construct comes only from merging");
});

test("Resonators draw income from a deposit instead of miners", () => {
	const g = watchers();
	const hq = g.hq(0),
		ore = g.ores.filter((o) => o.amount > 0).sort((a, b) => dist(a, hq) - dist(b, hq))[0];
	g.sideOf(0).explored.fill(1);
	for (const s of [g.sideOf(0)]) s.visible?.fill?.(1);
	const r = g.spawn("resonator", 0, ore.x + 60, ore.y);
	r.source = { kind: "ore", id: ore.id };
	const left = ore.amount;
	g.credits = 0;
	run(g, 10);
	assert.ok(ore.amount < left, "the deposit is drawn");
	assert.ok(g.credits > W.coreIncome * 10, `the Resonator adds income (${g.credits.toFixed(0)})`);
});

test("Spark blink and Warden phase: active abilities with cooldowns", () => {
	const g = watchers();
	const p = near(g, 180),
		s = g.spawn("spark", 0, p.x, p.y),
		w = g.spawn("warden", 0, p.x + 40, p.y + 40),
		from = { x: s.x, y: s.y };
	assert.equal(g.ability([s.id], s.x + 1000, s.y), 1);
	assert.ok(dist(from, s) > 100 && dist(from, s) <= W.blink.range + 1, `blinked ${dist(from, s).toFixed(0)}`);
	assert.equal(g.ability([s.id], s.x - 100, s.y), 0, "the blink is on cooldown");
	assert.equal(g.ability([w.id]), 1);
	const hp = w.hp,
		ward = w.ward;
	g.applyDamage(null, w, 500);
	assert.equal(w.hp, hp);
	assert.equal(w.ward, ward, "nothing gets through the phase");
	const foe = g.spawn("trooper", 1, w.x + 60, w.y);
	assert.equal(g.canTarget(w, foe), false, "a Warden in phase does not fire");
	run(g, W.phase.time + 0.5);
	assert.equal(g.canTarget(w, foe), true);
	run(g, W.blink.cooldown);
	assert.equal(g.ability([s.id], s.x - 100, s.y), 1, "the blink is back");
});

test("the Prism's beam grows on one target; the Arc's discharge chains on to more enemies", () => {
	const g = watchers();
	const p = near(g, 500),
		prism = g.spawn("prism", 0, p.x, p.y),
		tank = g.spawn("tank", 1, p.x + 80, p.y);
	tank.maxHp = tank.hp = 1e6;
	const hits = [];
	for (let i = 0; i < 4; i++) {
		const before = tank.hp;
		g.applyDamage(prism, tank, 10);
		hits.push(Math.round(before - tank.hp));
	}
	assert.deepEqual(hits, [10, 13, 15, 18]);
	const arc = g.spawn("arc", 0, p.x, p.y + 200),
		a = g.spawn("trooper", 1, p.x + 100, p.y + 200),
		b = g.spawn("trooper", 1, p.x + 160, p.y + 200),
		c = g.spawn("trooper", 1, p.x + 220, p.y + 200),
		hpB = b.hp,
		hpC = c.hp;
	g.applyDamage(arc, a, 20);
	assert.ok(b.hp < hpB && c.hp < hpC, "the discharge jumps twice");
	assert.ok(hpB - b.hp > hpC - c.hp, "and weakens with each jump");
	assert.ok(g.effects.some((f) => f.kind === "shot" && f.chain));
});

test("two Wardens merge into a Construct; units jump between Anchors", () => {
	const g = watchers();
	const p = near(g, 200),
		a = g.spawn("warden", 0, p.x, p.y),
		b = g.spawn("warden", 0, p.x + 50, p.y);
	assert.equal(g.mergeWardens([a.id, b.id]), 1);
	assert.ok(a.hp <= 0 && b.hp <= 0);
	assert.equal(g.entities.filter((e) => e.type === "construct" && e.hp > 0 && e.team === 0).length, 1);
	const p1 = near(g, 300),
		p2 = near(g, 300, { x: p1.x + 500 > g.W - 100 ? p1.x - 500 : p1.x + 500, y: p1.y }),
		k1 = g.spawn("anchor", 0, p1.x, p1.y),
		k2 = g.spawn("anchor", 0, p2.x, p2.y),
		u = g.spawn("spark", 0, p1.x + 60, p1.y);
	k1.constructionLeft = k2.constructionLeft = 0;
	assert.equal(g.anchorJump([u.id], k2.id), 1);
	assert.ok(dist(u, k2) < W.anchor.jumpReach, "the unit stands at the target Anchor");
	assert.equal(g.anchorJump([u.id], k1.id), 0, "the jump is on cooldown");
});

test("the Core lifts off, cannot be hit in flight and lands at the new site", () => {
	const g = watchers();
	const hq = g.hq(0);
	g.sideOf(0).explored.fill(1);
	const to = near(g, 500);
	g.isVisible = () => true;
	assert.equal(g.relocateCore(hq.id, to.x, to.y), true);
	const foe = g.spawn("trooper", 1, hq.x + 60, hq.y);
	assert.equal(g.canTarget(foe, hq), false, "a lifted Core cannot be targeted");
	run(g, 500 / W.core.speed + 2);
	assert.ok(!hq.lifted && dist(hq, to) < 2, "landed");
	assert.equal(g.relocateCore(hq.id, hq.x + 100, hq.y), false, "cooldown");
});

test("the Watchers' commands are network commands", () => {
	for (const k of ["ability", "anchorJump", "mergeWardens", "relocateCore"]) assert.ok(RTS.NET_COMMANDS[k] !== undefined, k);
	for (const t of ["spark", "prism", "arc", "warden", "construct", "anchor", "resonator"]) assert.ok(TYPES[t], t);
});
