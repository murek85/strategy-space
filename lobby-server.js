/* The lobby and relay server for network battles (G4, 0.153). Plain Node, no dependencies.
   - Rooms: 1 vs 1 (teams 0 and 1) or 2 vs 2 (side A: teams 0 and 3, side B: teams 1 and 4). The host sets the
     rules (map, size, deposits, weather, fauna, day, start level, seed) and may put the computer (AI) on a free
     seat; players take seats, set name, colour and faction, say ready; the host starts.
   - Relay: in a battle every turn of every player goes through the server to the others and into the room's log
     (lockstep, netplay.js). The server compares the players' checksums and reports a desync.
   - Dropped player: the battle goes on — the server sends empty turns for the player's team ("ghost" turns); after
     `takeover` seconds it puts the computer in command of that team (a system command "@aiTakeover" in the log,
     run by every computer on the same turn). The player can come back (same client id): the server sends the start
     settings and the whole log, the game is rebuilt by replaying it, and the team is handed back ("@aiRelease").
   - Transport: WebSocket (RFC 6455, text frames) at /lobby — mounted in server.js (`npm start`), or standalone:
     `node lobby-server.js [port]` (default 4174, all interfaces — for a local network), or started by the desktop
     app. Lobby class is independent of the transport (tests attach fake sockets).
   Messages are JSON objects { k: kind, … }; see Lobby.receive. */
const crypto = require("node:crypto");
const http = require("node:http");

const LOBBY = {
	version: 1,
	maxRooms: 50,
	maxClients: 200,
	maxMessage: 64 * 1024,
	takeover: 20,
	delay: 2,
	keepEnded: 120,
	colors: ["#b0efd0", "#72b7ff", "#d3a0ff", "#f0cb70", "#f59caf"],
	factions: ["colonies", "dominion", "swarm", "watchers"],
};
const SEATS = { 2: [0, 1], 4: [0, 3, 1, 4] };
const clean = (s, n = 24) => String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, n);
const player = (p) => ({
	name: clean(p?.name) || "Gracz",
	color: LOBBY.colors.includes(p?.color) ? p.color : LOBBY.colors[0],
	faction: LOBBY.factions.includes(p?.faction) ? p.faction : "colonies",
});
const RULE_KEYS = ["mode", "map", "size", "resources", "weather", "fauna", "dayLength", "startLevel"];
const cleanRules = (r = {}) => {
	const out = {};
	for (const k of RULE_KEYS) if (typeof r[k] === "string") out[k] = clean(r[k], 20);
	out.seed = Number.isInteger(r.seed) && r.seed >= 0 && r.seed <= 999999 ? r.seed : 0;
	return out;
};

class Lobby {
	constructor(options = {}) {
		this.o = { ...LOBBY, ...options };
		this.clients = new Map(); // socket → client
		this.rooms = new Map();
		this.nextRoom = 1;
		this.now = options.now || (() => Date.now());
	}
	// A transport: { send(text), close() }; returns the handlers for its messages and its end.
	attach(socket) {
		if (this.clients.size >= this.o.maxClients) {
			socket.send(JSON.stringify({ k: "error", text: "Serwer jest pełny." }));
			socket.close();
			return { message() {}, close() {} };
		}
		const c = { socket, id: null, profile: player({}), room: null };
		this.clients.set(socket, c);
		return {
			message: (text) => {
				let msg;
				try {
					msg = JSON.parse(text);
				} catch {
					return;
				}
				if (msg && typeof msg.k === "string") this.receive(c, msg);
			},
			close: () => this.gone(c),
		};
	}
	send(c, msg) {
		try {
			c?.socket.send(JSON.stringify(msg));
		} catch {}
	}
	summary(room) {
		return {
			id: room.id,
			name: room.name,
			map: room.rules.map,
			size: room.size,
			started: !!room.started,
			free: room.seats.filter((s) => !s.client && !s.ai && !s.left).length,
			players: room.seats.filter((s) => s.client || s.ai).length,
		};
	}
	roomState(room) {
		return {
			id: room.id,
			name: room.name,
			size: room.size,
			host: room.host,
			rules: room.rules,
			started: !!room.started,
			seats: room.seats.map((s) => ({ team: s.team, ai: !!s.ai, player: s.player, ready: !!s.ready, taken: !!s.client || !!s.left, connected: !!s.client, host: !!s.owner && s.owner === room.host })),
		};
	}
	broadcastRooms() {
		const rooms = [...this.rooms.values()].filter((r) => !r.ended).map((r) => this.summary(r));
		for (const c of this.clients.values()) if (c.id && !c.room) this.send(c, { k: "rooms", rooms });
	}
	broadcastRoom(room) {
		for (const s of room.seats) if (s.client) this.send(s.client, { k: "room", room: this.roomState(room), you: room.seats.indexOf(s) });
		this.broadcastRooms();
	}
	toRoom(room, msg, except = null) {
		for (const s of room.seats) if (s.client && s.client !== except) this.send(s.client, msg);
	}
	seatOf(c) {
		return c.room ? c.room.seats.find((s) => s.client === c) : null;
	}
	receive(c, msg) {
		if (msg.k === "hello") {
			if (msg.v !== this.o.version) return this.send(c, { k: "error", text: "Inna wersja gry — zaktualizuj grę." });
			c.id = clean(msg.client, 40) || crypto.randomUUID();
			c.profile = player(msg.player);
			this.send(c, { k: "welcome", client: c.id });
			// A battle this client left by accident: it may come back.
			const back = [...this.rooms.values()].find((r) => r.started && !r.ended && r.seats.some((s) => s.owner === c.id && !s.client));
			if (back) this.send(c, { k: "resumable", room: back.id, name: back.name });
			return this.broadcastRooms();
		}
		if (!c.id) return;
		const room = c.room,
			seat = this.seatOf(c),
			host = room && room.host === c.id;
		switch (msg.k) {
			case "ping":
				return this.send(c, { k: "pong", at: msg.at });
			case "list":
				return this.send(c, { k: "rooms", rooms: [...this.rooms.values()].filter((r) => !r.ended).map((r) => this.summary(r)) });
			case "profile":
				c.profile = player(msg.player);
				if (seat && !room.started) {
					seat.player = c.profile;
					seat.ready = false;
					this.broadcastRoom(room);
				}
				return;
			case "create": {
				if (room) this.leave(c);
				if (this.rooms.size >= this.o.maxRooms) return this.send(c, { k: "error", text: "Za dużo gier na serwerze." });
				const size = msg.size === 4 ? 4 : 2,
					r = { id: String(this.nextRoom++), name: clean(msg.name, 40) || `Gra gracza ${c.profile.name}`, size, host: c.id, rules: cleanRules(msg.rules), started: false, seats: SEATS[size].map((team) => ({ team })) };
				this.rooms.set(r.id, r);
				this.take(c, r, 0);
				return this.broadcastRoom(r);
			}
			case "join": {
				const r = this.rooms.get(String(msg.room));
				if (!r || r.started || r.ended) return this.send(c, { k: "error", text: "Ta gra już się zaczęła albo nie istnieje." });
				const free = r.seats.findIndex((s) => !s.client && !s.ai && !s.left);
				if (free < 0) return this.send(c, { k: "error", text: "Brak wolnych miejsc." });
				if (room) this.leave(c);
				this.take(c, r, free);
				return this.broadcastRoom(r);
			}
			case "leave":
				this.leave(c);
				return this.broadcastRooms();
			case "seat": {
				const i = Number(msg.seat),
					to = room?.seats[i];
				if (!to || room.started || to.client || to.ai) return;
				seat.client = null;
				delete seat.player;
				delete seat.owner;
				seat.ready = false;
				this.take(c, room, i);
				return this.broadcastRoom(room);
			}
			case "ai": {
				const s = room?.seats[Number(msg.seat)];
				if (!host || room.started || !s || s.client) return;
				s.ai = !!msg.on;
				s.player = s.ai ? { name: "Komputer", color: LOBBY.colors[(room.seats.indexOf(s) + 2) % LOBBY.colors.length], faction: LOBBY.factions[room.seats.indexOf(s) % 3] } : undefined;
				return this.broadcastRoom(room);
			}
			case "rules":
				if (!host || room.started) return;
				room.rules = cleanRules(msg.rules);
				for (const s of room.seats) if (s.client && s.owner !== c.id) s.ready = false;
				return this.broadcastRoom(room);
			case "ready":
				if (!seat || room.started) return;
				seat.ready = !!msg.on;
				return this.broadcastRoom(room);
			case "start": {
				if (!host || room.started) return;
				const humans = room.seats.filter((s) => s.client);
				if (room.seats.some((s) => !s.client && !s.ai)) return this.send(c, { k: "error", text: "Zajmij lub oddaj komputerowi każde miejsce." });
				if (humans.some((s) => s.owner !== c.id && !s.ready)) return this.send(c, { k: "error", text: "Nie wszyscy gracze są gotowi." });
				room.started = true;
				room.startedAt = this.now();
				room.settings = {
					...room.rules,
					seed: room.rules.seed || 1 + crypto.randomInt(999999),
					teams: room.size === 4 ? "duo" : "ffa",
					players: room.seats.map((s) => ({ team: s.team, ai: !!s.ai, ...s.player })),
				};
				room.log = [];
				room.last = {};
				room.hashes = new Map();
				for (const s of humans) {
					room.last[s.team] = this.o.delay - 1;
					this.send(s.client, { k: "start", settings: room.settings, team: s.team });
				}
				return this.broadcastRooms();
			}
			case "turn":
				return this.turn(c, room, seat, msg);
			case "chat": {
				const text = clean(msg.text, 200);
				if (room && seat && text) this.toRoom(room, { k: "chat", team: seat.team, name: seat.player?.name, color: seat.player?.color, text, all: !!msg.all || !room.started }, c);
				return;
			}
			case "rejoin": {
				const r = this.rooms.get(String(msg.room)),
					s = r?.seats.find((x) => x.owner === c.id && !x.client);
				if (!r || !r.started || r.ended || !s) return this.send(c, { k: "error", text: "Nie można wrócić do tej bitwy." });
				if (room) this.leave(c);
				s.client = c;
				delete s.left;
				c.room = r;
				const release = s.takenOver;
				s.takenOver = false;
				// The client goes on from the last turn the server sent for its team.
				this.send(c, { k: "resume", settings: r.settings, team: s.team, log: r.log, from: r.last[s.team], release: !!release });
				this.toRoom(r, { k: "back", team: s.team, name: s.player?.name }, c);
				if (release) s.releasePending = true;
				return;
			}
		}
	}
	take(c, room, i) {
		const s = room.seats[i];
		s.client = c;
		s.owner = c.id;
		s.player = c.profile;
		s.ready = false;
		c.room = room;
	}
	// The client leaves its room (before the battle: frees the seat; the host leaving closes the room).
	leave(c) {
		const room = c.room;
		if (!room) return;
		const seat = this.seatOf(c);
		c.room = null;
		if (!seat) return;
		if (room.started && !room.ended) return this.drop(room, seat);
		seat.client = null;
		delete seat.player;
		delete seat.owner;
		seat.ready = false;
		if (room.host === c.id) {
			this.toRoom(room, { k: "closed", text: "Gospodarz zamknął grę." });
			for (const s of room.seats) if (s.client) s.client.room = null;
			this.rooms.delete(room.id);
		} else this.broadcastRoom(room);
	}
	drop(room, seat) {
		seat.client = null;
		seat.left = this.now();
		this.toRoom(room, { k: "dropped", team: seat.team, name: seat.player?.name });
		if (room.seats.every((s) => !s.client)) {
			room.ended = true;
			setTimeout?.(() => this.rooms.delete(room.id), this.o.keepEnded * 1000)?.unref?.();
		}
	}
	gone(c) {
		this.leave(c);
		this.clients.delete(c.socket);
		this.broadcastRooms();
	}
	// A player's turn: logged, relayed, checked; dropped teams get empty ("ghost") turns up to it, and the computer
	// takes a team over after `takeover` seconds.
	turn(c, room, seat, msg) {
		if (!room?.started || room.ended || !seat || !Number.isInteger(msg.t) || !Array.isArray(msg.c)) return;
		if (msg.t <= room.last[seat.team]) return;
		// System commands only from the server — except the hand-back a player who came back was told to send (it
		// must be in its own turn, which the server does not echo to it).
		const release = seat.releasePending && msg.c.some((x) => Array.isArray(x) && x[0] === "@aiRelease"),
			commands = msg.c.filter((x) => Array.isArray(x) && typeof x[0] === "string" && !x[0].startsWith("@") && Array.isArray(x[1])).slice(0, 64);
		if (release) {
			commands.unshift(["@aiRelease", []]);
			seat.releasePending = false;
		}
		// Turns in order: a gap (lost message) is filled with empty turns.
		for (let t = room.last[seat.team] + 1; t < msg.t; t++) this.record(room, { team: seat.team, t, c: [] });
		this.record(room, { team: seat.team, t: msg.t, c: commands });
		if (Array.isArray(msg.h) && Number.isInteger(msg.h[0]) && typeof msg.h[1] === "string") this.hash(room, seat.team, msg.h[0], msg.h[1]);
		for (const s of room.seats)
			if (!s.ai && !s.client && s.left != null)
				for (let t = room.last[s.team] + 1; t <= msg.t; t++) {
					const c2 = [];
					if (!s.takenOver && (this.now() - s.left) / 1000 >= this.o.takeover) {
						s.takenOver = true;
						c2.push(["@aiTakeover", []]);
						this.toRoom(room, { k: "takeover", team: s.team, name: s.player?.name });
					}
					this.record(room, { team: s.team, t, c: c2 });
				}
	}
	record(room, entry) {
		room.log.push(entry);
		room.last[entry.team] = entry.t;
		this.toRoom(room, { k: "turn", ...entry }, room.seats.find((s) => s.team === entry.team)?.client);
	}
	hash(room, team, t, h) {
		const seen = room.hashes.get(t) || {};
		seen[team] = h;
		room.hashes.set(t, seen);
		const values = Object.values(seen);
		if (new Set(values).size > 1 && !room.desync) {
			room.desync = t;
			this.toRoom(room, { k: "desync", t });
		}
		const humans = room.seats.filter((s) => !s.ai && s.client).length;
		if (values.length >= humans) room.hashes.delete(t);
	}
}

// ---------- WebSocket (RFC 6455): handshake and text frames ----------
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
function upgrade(lobby, req, socket) {
	const key = req.headers["sec-websocket-key"];
	if (!key || req.headers.upgrade?.toLowerCase() !== "websocket") return socket.destroy();
	const accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
	socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
	socket.setNoDelay(true);
	let closed = false;
	const frame = (opcode, payload) => {
		const len = payload.length,
			head = len < 126 ? Buffer.from([0x80 | opcode, len]) : len < 65536 ? Buffer.from([0x80 | opcode, 126, len >> 8, len & 255]) : Buffer.concat([Buffer.from([0x80 | opcode, 127]), (() => {
				const b = Buffer.alloc(8);
				b.writeBigUInt64BE(BigInt(len));
				return b;
			})()]);
		return Buffer.concat([head, payload]);
	};
	const transport = {
		send(text) {
			if (!closed) socket.write(frame(1, Buffer.from(text)));
		},
		close() {
			if (closed) return;
			closed = true;
			try {
				socket.end(frame(8, Buffer.alloc(0)));
			} catch {}
		},
	};
	const handlers = lobby.attach(transport);
	let buffer = Buffer.alloc(0),
		parts = [];
	socket.on("data", (chunk) => {
		buffer = Buffer.concat([buffer, chunk]);
		while (buffer.length >= 2) {
			const fin = buffer[0] & 0x80,
				opcode = buffer[0] & 0x0f,
				masked = buffer[1] & 0x80;
			let len = buffer[1] & 0x7f,
				at = 2;
			if (len === 126) {
				if (buffer.length < 4) return;
				len = buffer.readUInt16BE(2);
				at = 4;
			} else if (len === 127) {
				if (buffer.length < 10) return;
				len = Number(buffer.readBigUInt64BE(2));
				at = 10;
			}
			if (len > lobby.o.maxMessage) return socket.destroy();
			const need = at + (masked ? 4 : 0) + len;
			if (buffer.length < need) return;
			const mask = masked ? buffer.subarray(at, at + 4) : null,
				data = Buffer.from(buffer.subarray(at + (masked ? 4 : 0), need));
			if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
			buffer = buffer.subarray(need);
			if (opcode === 8) {
				transport.close();
				return socket.destroy();
			}
			if (opcode === 9) socket.write(frame(10, data));
			else if (opcode === 1 || opcode === 0) {
				parts.push(data);
				if (fin) {
					const text = Buffer.concat(parts).toString("utf8");
					parts = [];
					handlers.message(text);
				}
			}
		}
	});
	const end = () => {
		if (closed && !socket.destroyed) socket.destroy();
		closed = true;
		handlers.close();
	};
	socket.on("close", end);
	socket.on("error", () => socket.destroy());
}

// Mounts the lobby on an HTTP server at /lobby.
function mountLobby(server, options) {
	const lobby = new Lobby(options);
	server.on("upgrade", (req, socket) => {
		if (new URL(req.url, "http://x").pathname === "/lobby") upgrade(lobby, req, socket);
		else socket.destroy();
	});
	return lobby;
}
// A standalone lobby server (also the desktop app's local-network server).
function startLobbyServer(port = 4174, host = "0.0.0.0", options) {
	const server = http.createServer((req, res) => res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end("Pogranicze Galaktyki — serwer lobby (WebSocket /lobby)\n"));
	const lobby = mountLobby(server, options);
	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, host, () => resolve({ server, lobby, port: server.address().port }));
	});
}

module.exports = { Lobby, LOBBY, SEATS, mountLobby, startLobbyServer, upgrade };
if (require.main === module)
	startLobbyServer(Number(process.argv[2]) || 4174).then(({ port }) => {
		const nets = Object.values(require("node:os").networkInterfaces()).flat().filter((n) => n && n.family === "IPv4" && !n.internal);
		console.log(`Serwer lobby Pogranicza Galaktyki: port ${port}. Adresy w sieci lokalnej: ${nets.map((n) => n.address + ":" + port).join(", ") || "localhost:" + port}`);
	});
