// 0.155: scenario modes and the Inwazja in network play (network-modes.js, netplay.js): which modes a battle allows,
// results and messages worded for each player, the guest's expedition left alone, the Inwazja going from the orbit
// to the planet on both computers at the same step (also when the log is replayed), co-op defense and survival.
const { test } = require("node:test");
const assert = require("node:assert/strict");
globalThis.RTS = require("../engine");
const RTS = globalThis.RTS;
const { TYPES, dist } = RTS;

const duel = (extra = {}) => ({
	map: "horizon",
	seed: 4242,
	size: "small",
	resources: "normal",
	weather: "normal",
	fauna: "few",
	dayLength: "normal",
	players: [
		{ name: "Ala", color: RTS.PLAYER_COLORS[0], faction: "colonies" },
		{ name: "Bartek", color: RTS.PLAYER_COLORS[2], faction: "dominion" },
	],
	...extra,
});
const coop = (mode) =>
	duel({
		mode,
		players: [
			{ team: 0, name: "Ala", color: RTS.PLAYER_COLORS[0], faction: "colonies" },
			{ team: 3, name: "Cyd", color: RTS.PLAYER_COLORS[1], faction: "watchers" },
			{ team: 1, ai: true, faction: "dominion" },
			{ team: 4, ai: true, faction: "swarm" },
		],
		teams: "duo",
	});
const run = (g, seconds) => {
	for (let i = 0; i < seconds * 30 && !g.result; i++) g.tick(1 / 30);
	return g;
};
const said = (g, team, re) => g.sideOf(team).events.some((t) => re.test(t));

test("which modes a network battle allows; the rest falls back to conquest", () => {
	const allowed = (m, ctx) => RTS.netModeAllowed(m, ctx);
	for (const m of ["conquest", "relays", "hill", "expedition", "invasion"]) assert.ok(allowed(m, { seats: 2 }), m);
	assert.ok(!allowed("defense", { seats: 2 }) && !allowed("survival", { lobby: true, seats: 4, aiFoes: false }));
	assert.ok(allowed("survival", { lobby: true, seats: 4, aiFoes: true }) && !allowed("invasion", { lobby: true, seats: 4 }));
	assert.equal(RTS.createNetworkGame(duel({ mode: "relays" })).modeState.mode, "relays");
	assert.equal(RTS.createNetworkGame(duel({ mode: "survival" })).modeState.mode, "conquest", "no co-op one on one by codes");
	assert.equal(RTS.createNetworkGame(coop("invasion")).invasion, null, "no Inwazja two on two");
	// The Inwazja on a map in space is a conquest.
	assert.equal(RTS.createNetworkGame(duel({ mode: "invasion", map: "orbit" })).invasion, null);
});

test("relays and the hill: the guest can win; results and messages for each player", () => {
	const g = RTS.createNetworkGame(duel({ mode: "relays" }));
	assert.equal(g.modeState.target, g.nodes.length * 90);
	for (const n of g.nodes) n.owner = 1;
	run(g, g.modeState.target / g.nodes.length + 2);
	assert.equal(g.result, "defeat");
	assert.equal(g.resultFor(0), "defeat");
	assert.equal(g.resultFor(1), "victory");
	assert.ok(said(g, 1, /Sieć przekaźników pod kontrolą/) && said(g, 0, /Bartek zdobywa pulę/));
	g.viewer = 1;
	assert.match(g.modeResult(), /Twoje oddziały utrzymały/);
	assert.match(g.modeStatus(), new RegExp(`Ty ${Math.floor(g.modeState.scores[1])} / `));
	g.viewer = 0;
	assert.match(g.modeResult(), /^Bartek — pierwsza pełna pula/);

	const h = RTS.createNetworkGame(duel({ mode: "hill" }));
	const hill = h.hillNode();
	assert.ok(hill);
	hill.owner = 1;
	h.viewer = 1;
	assert.match(h.modeStatus(), /^Szczyt: Twój/);
	h.viewer = 0;
	assert.match(h.modeStatus(), /^Szczyt: Bartek/);
	run(h, h.modeState.target + 2);
	assert.equal(h.resultFor(1), "victory");
	assert.ok(said(h, 1, /Szczyt utrzymany/) && said(h, 0, /Bartek utrzymuje Szczyt/));
});

test("expedition: the guest's carrier is not steered by the computer's expedition rules", () => {
	const g = RTS.createNetworkGame(duel({ mode: "expedition" }));
	const a = g.modeState.artifact;
	const unit = g.spawn("trooper", 1, a.x + 10, a.y);
	// (The guardians of the dig site and the wildlife out of the way.)
	g.entities = g.entities.filter((e) => e.team !== 2);
	run(g, RTS.EXPEDITION.pickup + 1);
	assert.equal(a.carrier, unit.id);
	g.time = Math.max(g.time, RTS.EXPEDITION.aiStart + 1);
	g.steerExpedition(true);
	assert.ok(!unit.expedition && !g.entities.some((e) => e.team === 1 && e.expedition), "no computer orders for a human side");
	assert.ok(said(g, 1, /niesie artefakt\. Doprowadź/) && said(g, 0, /Bartek przejmuje artefakt/));
});

// Two locksteps joined by a fake link; every turn message is logged for a replay.
function pair(settings) {
	const NetPlay = require("../netplay.js");
	let now = 0;
	const queue = [],
		log = [];
	const link = (team, other) => ({
		open: true,
		handlers: {},
		on(k, f) {
			(this.handlers[k] ||= []).push(f);
		},
		send(m) {
			if (m.k === "turn") log.push({ team, t: m.t, c: m.c });
			queue.push({ at: now + 30, to: other(), m: JSON.parse(JSON.stringify(m)) });
		},
	});
	const la = link(0, () => lb),
		lb = link(1, () => la);
	const phases = [];
	const make = (team, l) => {
		const g = RTS.createNetworkGame(settings);
		g.viewer = team;
		const s = new NetPlay.Lockstep(g, team, l, { onPhase: (next) => phases.push([team, next.missionId]) });
		clearInterval(s.pingTimer);
		return s;
	};
	const a = make(0, la),
		b = make(1, lb);
	const frame = (dt) => {
		now += dt * 1000;
		queue.sort((x, y) => x.at - y.at);
		while (queue.length && queue[0].at <= now) {
			const q = queue.shift();
			for (const f of q.to.handlers.message) f(q.m);
		}
		a.advance(dt);
		b.advance(dt);
	};
	return { a, b, frame, log, phases, NetPlay };
}

test("Inwazja through the network: the orbit, then the planet on both computers at the same step", () => {
	const keep = RTS.INVASION.orbitTime;
	RTS.INVASION.orbitTime = 6;
	try {
		const settings = duel({ mode: "invasion", players: [{ name: "Ala", faction: "colonies" }, { name: "Bartek", faction: "watchers" }] });
		const { a, b, frame, log, phases, NetPlay } = pair(settings);
		assert.equal(a.game.invasion.phase, "orbit");
		assert.equal(a.game.missionId, "orbit");
		for (let f = 0; f < 60 * 4; f++) {
			if (f === 60) {
				const ship = a.game.units(0).find((e) => e.type !== "worker");
				if (ship) a.issue("command", [[ship.id], ship.x + 60, ship.y, null, false]);
			}
			frame(1 / 60);
		}
		// The orbit is decided at 6 s; the commands of the turns already sent are dropped, the landing goes on.
		for (let f = 0; f < 60 * 6; f++) {
			if (f % 40 === 0) a.issue("enqueue", ["trooper"]);
			frame(1 / 60);
		}
		for (const s of [a, b]) {
			assert.equal(s.game.invasion.phase, "ground");
			assert.equal(s.game.missionId, "horizon");
			assert.ok(!s.desync && !s.game.result);
		}
		assert.equal(a.ignoreUntil, b.ignoreUntil);
		assert.deepEqual(phases.map(([t, m]) => m), ["horizon", "horizon"]);
		const owner = a.game.invasion.owner;
		assert.equal(b.game.invasion.owner, owner);
		assert.ok(a.game.podsLeft(owner) >= RTS.INVASION.minPods);
		assert.equal(a.game.factionFor(1).key, "watchers");
		for (let f = 0; f < 60 * 4; f++) {
			frame(1 / 60);
			if (a.turn === b.turn && a.sub === b.sub && a.sub === 0) assert.equal(a.game.checksum(), b.game.checksum());
		}
		// Coming back: the log replayed from the start lands on the planet at the same turn.
		const c = RTS.createNetworkGame(settings);
		c.viewer = 1;
		const back = new NetPlay.Lockstep(c, 1, { on() {}, send() {} }, {});
		clearInterval(back.pingTimer);
		back.replay(log, 0);
		assert.equal(back.game.invasion?.phase, "ground");
		assert.equal(back.ignoreUntil, a.ignoreUntil);
		// The landing: the owner of the orbit drops its pods.
		const g = a.game,
			hq = g.hq(owner);
		g.sideOf(owner).explored.fill(1);
		let spot = null;
		for (let r = 200; r < 900 && !spot; r += 40)
			for (let k = 0; k < 16 && !spot; k++) {
				const p = { x: Math.round(hq.x + Math.cos(k) * r), y: Math.round(hq.y + Math.sin(k) * r) };
				if (!g.landingRequirement(owner, p.x, p.y)) spot = p;
			}
		assert.ok(spot && g.applyCommand(owner, "orbitalDrop", [spot.x, spot.y]));
	} finally {
		RTS.INVASION.orbitTime = keep;
	}
});

test("Inwazja: a surrender in orbit ends the whole operation", () => {
	const g = RTS.createNetworkGame(duel({ mode: "invasion" }));
	g.applyCommand(1, "surrender", []);
	assert.equal(g.resultFor(0), "victory");
	assert.equal(RTS.nextNetworkPhase(g), null);
});

test("co-op survival and defense in a lobby: the defenders together against the computer", () => {
	const g = RTS.createNetworkGame(coop("survival"));
	assert.equal(g.modeState.mode, "survival");
	assert.deepEqual(g.humans, [0, 3]);
	assert.ok(g.hq(0) && g.hq(3), "both defenders keep a base");
	assert.ok(!g.entities.some((e) => [1, 4].includes(e.team)), "no enemy base");
	g.survivalWave();
	const wave = g.entities.filter((e) => e.team === 1);
	assert.ok(wave.length > 0);
	for (const e of wave) {
		const hqs = [g.hq(0), g.hq(3)].sort((p, q) => dist(p, e) - dist(q, e));
		assert.ok(dist(e.order, hqs[0]) < 1, "each attacker goes for the nearest defenders' centre");
	}
	assert.ok(said(g, 3, /^Fala 1/) && said(g, 0, /^Fala 1/));
	g.applyDamage(null, g.hq(0), 1e9);
	assert.equal(g.result, null, "the ally's centre still stands");
	g.applyDamage(null, g.hq(3), 1e9);
	assert.equal(g.result, "defeat");
	assert.equal(g.resultFor(3), "defeat");
	assert.match(g.modeResult(), /Razem przetrwaliście/);

	const d = RTS.createNetworkGame(coop("defense"));
	assert.equal(d.modeState.mode, "defense");
	d.applyDamage(null, d.hq(0), 1e9);
	assert.equal(d.result, null);
	d.time = d.modeState.duration;
	d.tick(1 / 30);
	assert.equal(d.result, "victory");
	assert.equal(d.resultFor(3), "victory");
});
