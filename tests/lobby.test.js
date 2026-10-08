// G4 (0.153): the lobby and relay server (lobby-server.js), lobby battles for 2 and 4 (network-rules.js) and the
// relayed lockstep (netplay.js): rooms, seats, the computer on a seat, start, turns of four players, a dropped
// player (empty turns, the computer taking over), coming back by replaying the log, and a real WebSocket.
const { test } = require("node:test");
const assert = require("node:assert/strict");
globalThis.RTS = require("../engine");
const RTS = globalThis.RTS;
const NetPlay = require("../netplay.js");
const { Lobby, startLobbyServer } = require("../lobby-server.js");

// A client on a fake transport: what the lobby sends arrives as messages of a link with the Link interface.
function client(lobby, name, id = name) {
	const link = { handlers: {}, open: true, inbox: [], on(t, f) { (this.handlers[t] ||= []).push(f); return this; }, emit(t, d) { for (const f of this.handlers[t] || []) f(d); } };
	const transport = { send: (text) => { const msg = JSON.parse(text); link.inbox.push(msg); link.emit("message", msg); }, close() {} };
	const h = lobby.attach(transport);
	link.send = (msg) => h.message(JSON.stringify(msg));
	link.drop = () => { link.open = false; h.close(); };
	link.last = (k) => [...link.inbox].reverse().find((m) => m.k === k);
	link.send({ k: "hello", v: 1, client: id, player: { name, color: "#72b7ff", faction: "dominion" } });
	return link;
}
const RULES = { map: "horizon", size: "small", resources: "normal", weather: "normal", fauna: "few", dayLength: "normal", startLevel: "outpost", seed: 11 };

test("rooms: create, join, seats, the computer on a seat, rules, ready, start", () => {
	let now = 0;
	const lobby = new Lobby({ now: () => now });
	const a = client(lobby, "Ala"),
		b = client(lobby, "Bob"),
		c = client(lobby, "Cyd");
	a.send({ k: "create", name: "Wieczór", size: 4, rules: RULES });
	const room = a.last("room").room;
	assert.equal(room.seats.length, 4);
	assert.deepEqual(room.seats.map((s) => s.team), [0, 3, 1, 4]);
	assert.equal(b.last("rooms").rooms[0].free, 3);
	b.send({ k: "join", room: room.id });
	c.send({ k: "join", room: room.id });
	c.send({ k: "seat", seat: 3 });
	a.send({ k: "ai", seat: 2, on: true });
	a.send({ k: "rules", rules: { ...RULES, map: "frost" } });
	assert.equal(a.last("room").room.rules.map, "frost");
	a.send({ k: "start" });
	assert.match(a.last("error").text, /gotowi/);
	b.send({ k: "ready", on: true });
	c.send({ k: "ready", on: true });
	a.send({ k: "start" });
	const sa = a.last("start"),
		sc = c.last("start");
	assert.equal(sa.team, 0);
	assert.equal(sc.team, 4);
	assert.deepEqual(sa.settings.players.map((p) => [p.team, !!p.ai]), [[0, false], [3, false], [1, true], [4, false]]);
	assert.equal(sa.settings.teams, "duo");
	assert.ok(sa.settings.seed > 0);
	// The game for these settings: three humans, the computer on team 1, allies 0+3 against 1+4.
	const g = RTS.createNetworkGame(sa.settings);
	assert.deepEqual(g.humans, [0, 3, 4]);
	assert.deepEqual(Object.keys(g.enemyAi.teams), ["1"]);
	assert.ok(g.allied(0, 3) && !g.allied(0, 4));
});

// Four lockstep clients through the lobby; returns helpers to run them.
function battle() {
	let now = 0;
	const lobby = new Lobby({ now: () => now, takeover: 20 });
	const names = ["Ala", "Bob", "Cyd", "Dan"],
		links = names.map((n) => client(lobby, n));
	links[0].send({ k: "create", name: "2 na 2", size: 4, rules: RULES });
	const id = links[0].last("room").room.id;
	for (const l of links.slice(1)) l.send({ k: "join", room: id });
	for (const l of links.slice(1)) l.send({ k: "ready", on: true });
	links[0].send({ k: "start" });
	const players = links.map((l) => {
		const s = l.last("start"),
			game = RTS.createNetworkGame(s.settings);
		game.viewer = s.team;
		return { link: l, game, team: s.team, settings: s.settings, net: new NetPlay.Lockstep(game, s.team, l, { teams: game.humans, relay: true }) };
	});
	const step = (who, seconds) => {
		for (let i = 0; i < seconds * 30; i++) {
			now += 1000 / 30;
			for (const p of who) p.net.advance(1 / 30);
		}
	};
	return { lobby, players, step, id, clock: () => now };
}

test("relayed lockstep: four players' turns, commands of each, the same simulation everywhere", () => {
	const { players, step } = battle();
	assert.deepEqual(players.map((p) => p.team), [0, 3, 1, 4]);
	step(players, 2);
	for (const p of players) {
		const tank = p.game.units(p.team).find((e) => e.type !== "worker");
		if (tank) p.net.issue("command", [[tank.id], tank.x + 120, tank.y + 40, null, false]);
	}
	step(players, 6);
	const turn = Math.min(...players.map((p) => p.net.turn));
	assert.ok(turn > 50, `turns ran: ${turn}`);
	assert.ok(players.every((p) => !p.net.desync));
	// The server compared every player's checksum every 10 turns and saw no difference.
	assert.ok(players.every((p) => !p.link.last("desync")));
	assert.ok(players[0].link.inbox.some((m) => m.k === "turn" && m.team === 4 && m.c.length), "commands of others arrived");
	// All at the same turn: identical state.
	for (const p of players) while (p.net.turn > turn) break;
	const at = players.filter((p) => p.net.turn === turn && p.net.sub === 0);
	if (at.length > 1) assert.equal(new Set(at.map((p) => p.game.checksum())).size, 1);
});

test("a dropped player: the battle goes on with empty turns, the computer takes over, the player comes back by replaying the log", () => {
	const { lobby, players, step } = battle();
	step(players, 2);
	const [host, , , dan] = players,
		rest = players.slice(0, 3);
	dan.link.drop();
	assert.equal(host.link.last("dropped").team, 4);
	// The others keep going (the server sends empty turns for team 4)…
	const before = host.net.turn;
	step(rest, 5);
	assert.ok(host.net.turn > before + 30, "not waiting for the dropped player");
	assert.ok(host.game.isHuman(4), "not yet taken over");
	// …and after the takeover time the computer commands team 4 on every computer.
	step(rest, 20);
	assert.equal(host.link.last("takeover")?.team, 4);
	for (const p of rest) assert.ok(!p.game.isHuman(4) && p.game.enemyAi?.teams?.[4], "computer on team 4");
	// Dan comes back with the same client id.
	const back = client(lobby, "Dan", "Dan");
	assert.ok(back.last("resumable"));
	back.send({ k: "rejoin", room: back.last("resumable").room });
	const r = back.last("resume");
	assert.equal(r.team, 4);
	assert.ok(r.release);
	const game = RTS.createNetworkGame(r.settings);
	game.viewer = 4;
	const net = new NetPlay.Lockstep(game, 4, back, { teams: game.humans, relay: true });
	net.replay(r.log, r.from, r.release);
	assert.ok(net.turn > 100, `replayed to turn ${net.turn}`);
	assert.ok(!game.isHuman(4), "replayed the takeover too");
	const dan2 = { ...dan, link: back, game, net };
	const all = [...rest, dan2];
	step(all, 4);
	// The team is handed back to the player everywhere, and the simulations agree.
	for (const p of all) assert.ok(p.game.isHuman(4), "team 4 human again");
	assert.ok(all.every((p) => !p.net.desync));
	assert.ok(all.every((p) => !p.link.last("desync")), "no desync after the replay and the hand-back");
	const t = Math.min(...all.map((p) => p.net.turn));
	step(all, 0);
	const same = all.filter((p) => p.net.turn === t && p.net.sub === 0);
	if (same.length > 1) assert.equal(new Set(same.map((p) => p.game.checksum())).size, 1);
});

test("a desync is reported by the server", () => {
	let now = 0;
	const lobby = new Lobby({ now: () => now }),
		a = client(lobby, "A"),
		b = client(lobby, "B");
	a.send({ k: "create", size: 2, rules: RULES });
	b.send({ k: "join", room: a.last("room").room.id });
	b.send({ k: "ready", on: true });
	a.send({ k: "start" });
	a.send({ k: "turn", t: 2, c: [], h: [0, "aaa"] });
	b.send({ k: "turn", t: 2, c: [], h: [0, "bbb"] });
	assert.equal(a.last("desync")?.t, 0);
	// Players cannot send system commands.
	a.send({ k: "turn", t: 3, c: [["@aiTakeover", []], ["stop", [[1]]]] });
	assert.deepEqual(b.last("turn").c, [["stop", [[1]]]]);
});

test("a real WebSocket: the standalone server answers hello, creates and lists rooms", async () => {
	if (typeof WebSocket !== "function") return;
	const { server, port } = await startLobbyServer(0, "127.0.0.1");
	try {
		const ws = new WebSocket(`ws://127.0.0.1:${port}/lobby`),
			got = [];
		await new Promise((resolve, reject) => {
			ws.onopen = resolve;
			ws.onerror = reject;
		});
		const wait = (k) =>
			new Promise((resolve) => {
				const check = () => {
					const m = got.find((x) => x.k === k);
					if (m) resolve(m);
					else setTimeout(check, 10);
				};
				check();
			});
		ws.onmessage = (m) => got.push(JSON.parse(m.data));
		ws.send(JSON.stringify({ k: "hello", v: 1, client: "ws-test", player: { name: "Sieć" } }));
		assert.equal((await wait("welcome")).client, "ws-test");
		ws.send(JSON.stringify({ k: "create", name: "Próba", size: 2, rules: RULES }));
		const room = await wait("room");
		assert.equal(room.room.name, "Próba");
		ws.send(JSON.stringify({ k: "ping", at: 5 }));
		assert.equal((await wait("pong")).at, 5);
		ws.close();
	} finally {
		server.close();
	}
});
