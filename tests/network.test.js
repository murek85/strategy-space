const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { TYPES, dist } = RTS;

const settings = (extra = {}) => ({
	map: "horizon",
	seed: 4242,
	size: "medium",
	resources: "normal",
	weather: "normal",
	fauna: "normal",
	dayLength: "normal",
	players: [
		{ name: "Ala", color: RTS.PLAYER_COLORS[0], faction: "colonies" },
		{ name: "Bartek", color: RTS.PLAYER_COLORS[2], faction: "dominion" },
	],
	...extra,
});
const counts = (g, team) => {
	const out = {};
	for (const e of g.entities) if (e.team === team && e.hp > 0) out[e.type] = (out[e.type] || 0) + 1;
	return out;
};

test("a network game has two human sides with the same start, their factions and colours", () => {
	const g = RTS.createNetworkGame(settings());
	assert.deepEqual(g.humans, [0, 1]);
	assert.equal(g.network, true);
	assert.equal(g.nextWave, Infinity);
	assert.equal(g.enemyAi, null);
	assert.ok(g.hq(0) && g.hq(1));
	assert.deepEqual(counts(g, 1), counts(g, 0));
	assert.equal(g.factionFor(0).key, "colonies");
	assert.equal(g.factionFor(1).key, "dominion");
	assert.equal(g.colorFor(1), RTS.PLAYER_COLORS[2]);
	assert.equal(g.sideName(1), "Bartek");
	assert.equal(g.sideOf(1).credits, g.sideOf(0).credits);
	// Same colour for both: the guest gets another one.
	const same = RTS.createNetworkGame(settings({ players: [{ color: RTS.PLAYER_COLORS[1] }, { color: RTS.PLAYER_COLORS[1] }] }));
	assert.notEqual(same.colorFor(1), same.colorFor(0));
});

test("each player has an own economy, queue and fog", () => {
	const g = RTS.createNetworkGame(settings());
	for (let i = 0; i < 30 * 60; i++) g.tick(1 / 30);
	for (const team of [0, 1]) {
		assert.ok(g.sideOf(team).mined > 0, "workers of " + team + " deliver ore to their own side");
		assert.ok(g.sideOf(team).credits > 400);
	}
	const before = [g.sideOf(0).credits, g.sideOf(1).credits];
	assert.equal(g.applyCommand(1, "enqueue", ["trooper"]), true);
	assert.equal(g.sideOf(1).queue.length, 1);
	assert.equal(g.sideOf(0).queue.length, 0);
	assert.ok(g.sideOf(1).credits < before[1]);
	assert.equal(g.sideOf(0).credits, before[0]);
	const troopers = g.units(1).filter((e) => e.type === "trooper").length;
	for (let i = 0; i < 30 * 10; i++) g.tick(1 / 30);
	assert.equal(g.units(1).filter((e) => e.type === "trooper").length, troopers + 1);
	// Fog: each side sees its own base, not the other one.
	const hq0 = g.hq(0),
		hq1 = g.hq(1);
	assert.ok(g.isVisibleTo(0, hq0.x, hq0.y) && g.isVisibleTo(1, hq1.x, hq1.y));
	assert.ok(!g.isVisibleTo(0, hq1.x, hq1.y) && !g.isVisibleTo(1, hq0.x, hq0.y));
	// The viewer decides what the interface reads.
	g.viewer = 1;
	assert.equal(g.credits, g.sideOf(1).credits);
	assert.equal(g.isVisible(hq1.x, hq1.y), true);
});

test("commands are checked: unknown actions, bad arguments and other teams are refused", () => {
	const g = RTS.createNetworkGame(settings());
	assert.equal(g.applyCommand(0, "tick", [1]), false);
	assert.equal(g.applyCommand(0, "applyDamage", []), false);
	assert.equal(g.applyCommand(2, "enqueue", ["trooper"]), false);
	assert.equal(g.applyCommand(0, "enqueue", [{ x: () => 1 }]), false);
	assert.equal(g.applyCommand(0, "command", [[1], NaN, 3]), false);
	assert.equal(g.applyCommand(0, "enqueue", ["trooper", null, 1, 2]), false);
	// A player cannot order the other player's units.
	const theirs = g.units(1).find((e) => e.type === "trooper");
	g.applyCommand(0, "command", [[theirs.id], 100, 100]);
	assert.notEqual(theirs.order?.x, 100);
});

test("two computers fed the same commands stay in step, whoever watches", () => {
	const a = RTS.createNetworkGame(settings()),
		b = RTS.createNetworkGame(settings());
	a.viewer = 0;
	b.viewer = 1;
	// A scripted match: both build, research, train and attack each other.
	const script = (g, step) => {
		const at = (s) => step === Math.round(s * 30);
		for (const team of [0, 1]) {
			const enemy = g.hq(1 - team),
				own = g.hq(team);
			if (at(5)) g.applyCommand(team, "enqueue", ["trooper"]);
			if (at(8)) g.applyCommand(team, "enqueue", ["worker"]);
			if (at(20) && own) g.applyCommand(team, "buildStructure", ["turret", own.x + (own.x < g.W / 2 ? 200 : -200), own.y, []]);
			if (at(40)) g.applyCommand(team, "startResearch", ["weapons"]);
			if (at(60) || at(150)) for (let i = 0; i < 4; i++) g.applyCommand(team, "enqueue", [i % 2 ? "rocket" : "trooper"]);
			if ((at(100) || at(200)) && enemy) {
				const army = g.units(team).filter((e) => e.type !== "worker").map((e) => e.id);
				g.applyCommand(team, "command", [army, enemy.x, enemy.y, null, true]);
			}
		}
	};
	for (let step = 0; step < 30 * 240; step++) {
		script(a, step);
		script(b, step);
		a.tick(1 / 30);
		b.tick(1 / 30);
		if (step % 30 === 0) assert.equal(a.checksum(), b.checksum(), "desync at step " + step);
	}
	assert.equal(a.checksum(), b.checksum());
	// Something did happen: shots were fired and units died on both sides.
	assert.ok(a.sideOf(0).kills + a.sideOf(1).kills > 0);
});

test("surrender ends the battle; each player sees the outcome from their side", () => {
	const g = RTS.createNetworkGame(settings());
	assert.equal(g.applyCommand(1, "surrender", []), true);
	for (let i = 0; i < 3; i++) g.tick(1 / 30);
	assert.ok(g.result);
	assert.equal(g.resultFor(0), "victory");
	assert.equal(g.resultFor(1), "defeat");
	g.viewer = 1;
	assert.equal(g.resultFor(), "defeat");
});

test("a single-player game keeps one side and the first team as the viewer", () => {
	const g = new RTS.Game(42, "horizon");
	g.configureSkirmish({ players: 2 });
	assert.deepEqual(g.humans, [0]);
	assert.equal(g.me, 0);
	assert.equal(g.credits, g.sideOf(0).credits);
	assert.equal(g.resultFor(), g.result);
	assert.ok(!g.isHuman(1));
	assert.equal(g.isVisibleTo(1, 10, 10), true, "computer sides see everything, as before");
});

// The lockstep of netplay.js with two players joined by a fake link (30 ms one way, up to 20 ms jitter).
function lockstepPair() {
	const src = require("node:fs").readFileSync(require("node:path").join(__dirname, "../netplay.js"), "utf8");
	const NetPlay = new Function("RTS", src + "; return NetPlay;")(RTS);
	let now = 0,
		seed = 7;
	const queue = [],
		jitter = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 20;
	const link = (other) => ({
		open: true,
		handlers: {},
		on(k, f) {
			(this.handlers[k] ||= []).push(f);
		},
		send(m) {
			queue.push({ at: now + 30 + jitter(), to: other(), m: JSON.parse(JSON.stringify(m)) });
		},
	});
	const la = link(() => lb),
		lb = link(() => la);
	const a = new NetPlay.Lockstep(RTS.createNetworkGame(settings()), 0, la),
		b = new NetPlay.Lockstep(RTS.createNetworkGame(settings()), 1, lb);
	for (const s of [a, b]) clearInterval(s.pingTimer);
	const frame = (dt) => {
		now += dt * 1000;
		queue.sort((x, y) => x.at - y.at);
		while (queue.length && queue[0].at <= now) {
			const q = queue.shift();
			for (const f of q.to.handlers.message) f(q.m);
		}
		return [a.advance(dt), b.advance(dt)];
	};
	return { a, b, frame };
}

test("a network battle moves smoothly: the steps of a turn are spread over the frames, both sides stay identical", () => {
	const { a, b, frame } = lockstepPair();
	const perFrame = [];
	let compared = 0;
	for (let f = 0; f < 60 * 30; f++) {
		if (f % 90 === 0) {
			a.issue("enqueue", ["trooper"]);
			b.issue("enqueue", ["rocket"]);
		}
		const [steps] = frame(1 / 60);
		if (f >= 60) perFrame.push(steps);
		if (a.turn === b.turn && a.sub === b.sub) {
			assert.equal(a.game.checksum(), b.game.checksum());
			compared++;
		}
	}
	// 60 frames per second, 30 steps per second: one step every other frame, never 3 at once (jumps 10× a second).
	assert.ok(Math.max(...perFrame) <= 1, "at most one step per frame");
	let still = 0,
		longest = 0;
	for (const s of perFrame) longest = Math.max(longest, (still = s ? 0 : still + 1));
	assert.ok(longest <= 1, `longest pause ${longest} frames`);
	assert.ok(compared > 1000 && !a.desync && !b.desync);
	assert.ok(a.game.time > 29);
});

test("the host stays smooth when the guest starts later (the guest still builds its board)", () => {
	const { a, b, frame } = lockstepPair();
	// The guest's first 0.8 s go to loading: it does not advance yet, the host already does.
	const late = b.advance.bind(b);
	let loading = 0.8;
	b.advance = (dt) => ((loading -= dt) > 0 ? 0 : late(dt));
	const perFrame = [];
	for (let f = 0; f < 60 * 20; f++) {
		const [steps] = frame(1 / 60);
		if (f >= 60 * 4) perFrame.push(steps);
	}
	// After the first seconds the host runs one step every other frame again — no bursts after each wait.
	let still = 0,
		longest = 0;
	for (const s of perFrame) longest = Math.max(longest, (still = s ? 0 : still + 1));
	assert.ok(Math.max(...perFrame) <= 1, `most steps in a frame: ${Math.max(...perFrame)}`);
	assert.ok(longest <= 2, `longest pause ${longest} frames`);
	assert.ok(!a.desync && !b.desync);
});

test("shared pause: both players stop on the same step, limited count and length, a countdown before the battle goes on", () => {
	const g = RTS.createNetworkGame(settings());
	const step = () => g.tick(RTS.NET.step);
	for (let i = 0; i < 30; i++) step();
	const t = g.time,
		hash = () => g.entities.map((e) => [e.x, e.y, e.hp].join()).join();
	assert.equal(g.applyCommand(1, "pauseGame", []), true);
	assert.equal(g.pausesLeft[1], RTS.NET_PAUSE.count - 1);
	assert.equal(g.applyCommand(0, "pauseGame", []), false, "one pause at a time");
	const before = hash();
	for (let i = 0; i < 90; i++) step();
	assert.equal(g.time, t, "the clock of the battle stands");
	assert.equal(hash(), before, "nothing moves");
	assert.ok(Math.abs(g.netPause.left - (RTS.NET_PAUSE.length - 3)) < 1e-6);
	// Either player resumes; the countdown still keeps the battle still.
	assert.equal(g.applyCommand(0, "resumeGame", []), true);
	assert.equal(g.applyCommand(1, "resumeGame", []), false);
	for (let i = 0; i < RTS.NET_PAUSE.resume * 30 - 1; i++) step();
	assert.equal(g.time, t);
	step();
	assert.equal(g.netPause, null);
	step();
	assert.ok(g.time > t, "the battle goes on");
	// A pause ends by itself after its longest time (plus the countdown).
	assert.equal(g.applyCommand(0, "pauseGame", []), true);
	for (let i = 0; i < (RTS.NET_PAUSE.length + RTS.NET_PAUSE.resume) * 30 + 2; i++) step();
	assert.equal(g.netPause, null);
	// The limit per player.
	for (let k = 0; k < RTS.NET_PAUSE.count; k++) {
		const ok = g.applyCommand(1, "pauseGame", []);
		assert.equal(ok, k < RTS.NET_PAUSE.count - 1);
		if (ok) {
			g.applyCommand(1, "resumeGame", []);
			for (let i = 0; i < RTS.NET_PAUSE.resume * 30 + 1; i++) step();
		}
	}
	assert.equal(g.pausesLeft[1], 0);
	assert.equal(g.pausesLeft[0], RTS.NET_PAUSE.count - 1);
});

test("shared pause over the lockstep: both computers pause and resume on the same step", () => {
	const { a, b, frame } = lockstepPair();
	let paused = 0,
		compared = 0;
	for (let f = 0; f < 60 * 20; f++) {
		if (f === 120) a.issue("pauseGame", []);
		if (f === 420) b.issue("resumeGame", []);
		if (f % 90 === 0) b.issue("enqueue", ["rocket"]);
		frame(1 / 60);
		if (a.game.netPause) paused++;
		if (a.turn === b.turn && a.sub === b.sub) {
			assert.equal(a.game.checksum(), b.game.checksum());
			assert.equal(!!a.game.netPause, !!b.game.netPause);
			compared++;
		}
	}
	// About 5 s paused plus the 3 s countdown, at 60 frames per second.
	assert.ok(paused > 60 * 7 && paused < 60 * 9, `paused for ${paused} frames`);
	assert.equal(a.game.netPause, null);
	assert.equal(a.game.pausesLeft[0], RTS.NET_PAUSE.count - 1);
	assert.ok(compared > 500 && !a.desync && !b.desync);
	assert.ok(Math.abs(a.game.time - (20 - 8)) < 1, `battle time ${a.game.time.toFixed(1)} s`);
});
