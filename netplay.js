/* Network play in the browser: a WebRTC data channel between two players and the lockstep that keeps their
   simulations identical (the engine side is network-rules.js).
   - Connection without a server: the host makes an invitation code (a WebRTC offer), the guest answers with a
     reply code; the codes are copied by the players (chat, e-mail…). Optional STUN server for play over the
     internet (it only tells the browser its public address); on a local network it is not needed.
   - Lockstep: the game runs in turns of NET.stepsPerTurn simulation steps. Commands issued during a turn are
     sent at the start of the next one and run on both computers NET.delay turns later, in the same order
     (host first). A computer waits when it lacks the other player's turn. Every NET.checkEvery turns the
     players compare state checksums: a difference is a desync.
   Messages: hello / settings / ready / start (lobby), turn, ping / pong, bye. */
const NetPlay = (() => {
	"use strict";
	const PREFIX = "RTS1.";
	const DEFAULT_STUN = "stun:stun.l.google.com:19302";

	// ---------- codes: a session description, compressed and printable ----------
	const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	const fromBase64 = (text) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
	async function pipe(bytes, stream) {
		const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
		return new Uint8Array(await out.arrayBuffer());
	}
	async function encode(description) {
		const json = new TextEncoder().encode(JSON.stringify({ t: description.type, s: description.sdp }));
		const packed = typeof CompressionStream === "function" ? await pipe(json, new CompressionStream("deflate-raw")) : json;
		return PREFIX + (packed === json ? "j" : "z") + toBase64(packed);
	}
	async function decode(code) {
		const text = String(code || "").trim().replace(/\s+/g, "");
		if (!text.startsWith(PREFIX)) throw Error("To nie jest kod tej gry.");
		const kind = text[PREFIX.length],
			bytes = fromBase64(text.slice(PREFIX.length + 1));
		const json = kind === "z" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : bytes;
		const { t, s } = JSON.parse(new TextDecoder().decode(json));
		if (!["offer", "answer"].includes(t) || typeof s !== "string") throw Error("Uszkodzony kod.");
		return { type: t, sdp: s };
	}

	// ---------- the link between two browsers ----------
	class Link {
		constructor({ stun = true } = {}) {
			this.pc = new RTCPeerConnection({ iceServers: stun ? [{ urls: DEFAULT_STUN }] : [] });
			this.channel = null;
			this.handlers = {};
			this.open = false;
			this.pc.onconnectionstatechange = () => {
				if (["failed", "closed", "disconnected"].includes(this.pc.connectionState) && this.open) this.lost();
			};
		}
		on(type, fn) {
			(this.handlers[type] ||= []).push(fn);
			return this;
		}
		emit(type, data) {
			for (const fn of this.handlers[type] || []) fn(data);
		}
		attach(channel) {
			this.channel = channel;
			channel.onopen = () => {
				this.open = true;
				this.emit("open");
			};
			channel.onclose = () => this.lost();
			channel.onmessage = (m) => {
				let msg;
				try {
					msg = JSON.parse(m.data);
				} catch {
					return;
				}
				if (msg && typeof msg.k === "string") this.emit("message", msg);
			};
		}
		lost() {
			if (this.closed) return;
			this.closed = true;
			this.open = false;
			this.emit("close");
		}
		// Waits until the browser has gathered its addresses (the code then works without further exchange).
		gathered() {
			return new Promise((resolve) => {
				if (this.pc.iceGatheringState === "complete") return resolve();
				const done = () => {
					this.pc.removeEventListener("icegatheringstatechange", check);
					resolve();
				};
				const check = () => this.pc.iceGatheringState === "complete" && done();
				this.pc.addEventListener("icegatheringstatechange", check);
				setTimeout(done, 4000);
			});
		}
		// Host: the invitation code.
		async invite() {
			this.attach(this.pc.createDataChannel("rts", { ordered: true }));
			await this.pc.setLocalDescription(await this.pc.createOffer());
			await this.gathered();
			return encode(this.pc.localDescription);
		}
		// Guest: the reply code for an invitation.
		async reply(code) {
			const offer = await decode(code);
			if (offer.type !== "offer") throw Error("To jest kod odpowiedzi — wklej kod zaproszenia od gospodarza.");
			this.pc.ondatachannel = (e) => this.attach(e.channel);
			await this.pc.setRemoteDescription(offer);
			await this.pc.setLocalDescription(await this.pc.createAnswer());
			await this.gathered();
			return encode(this.pc.localDescription);
		}
		// Host: the guest's reply completes the connection.
		async accept(code) {
			const answer = await decode(code);
			if (answer.type !== "answer") throw Error("To jest kod zaproszenia — wklej kod odpowiedzi od gościa.");
			await this.pc.setRemoteDescription(answer);
		}
		send(msg) {
			if (this.open && this.channel?.readyState === "open") this.channel.send(JSON.stringify(msg));
		}
		close() {
			this.send({ k: "bye" });
			this.closed = true;
			this.open = false;
			try {
				this.channel?.close();
				this.pc.close();
			} catch {}
		}
	}

	// ---------- lockstep ----------
	class Lockstep {
		// game: from RTS.createNetworkGame; team: this player's team (0 host, 1 guest); link: an open Link.
		// pump: called when a turn arrives while the page is hidden (timers are then throttled hard; messages are not).
		constructor(game, team, link, { onDesync, onClose, pump } = {}) {
			const NET = RTS.NET;
			this.game = game;
			this.team = team;
			this.link = link;
			this.NET = NET;
			this.turn = 0;
			// Steps of the current turn already run (0 = the turn has not started: its commands are not applied yet).
			this.sub = 0;
			this.clock = 0;
			this.pending = [];
			// turns[t] = { 0: commands | undefined, 1: commands | undefined }; the first turns are empty for both.
			this.turns = new Map();
			for (let t = 0; t < NET.delay; t++) this.turns.set(t, { 0: [], 1: [] });
			this.sent = NET.delay - 1;
			this.hashes = new Map();
			this.remoteHashes = new Map();
			this.waiting = 0;
			this.ping = null;
			this.desync = false;
			this.onDesync = onDesync;
			this.onClose = onClose;
			this.pump = pump;
			this.handler = (msg) => this.receive(msg);
			this.closeHandler = () => this.onClose?.();
			link.on("message", this.handler);
			link.on("close", this.closeHandler);
			this.pingTimer = setInterval(() => link.send({ k: "ping", at: performance.now() }), 2000);
		}
		other() {
			return 1 - this.team;
		}
		// A player's action from the interface: sent with the next turn, run later on both computers.
		issue(name, args) {
			if (!Object.hasOwn(RTS.NET_COMMANDS, name)) return false;
			this.pending.push([name, JSON.parse(JSON.stringify(args))]);
			return true;
		}
		receive(msg) {
			if (msg.k === "turn" && Number.isInteger(msg.t) && Array.isArray(msg.c)) {
				const slot = this.turns.get(msg.t) || {};
				slot[this.other()] = msg.c.filter((c) => Array.isArray(c) && typeof c[0] === "string" && Array.isArray(c[1])).slice(0, 64);
				this.turns.set(msg.t, slot);
				if (Array.isArray(msg.h)) this.compare(msg.h[0], msg.h[1], true);
				if (typeof document !== "undefined" && document.hidden) this.pump?.();
			} else if (msg.k === "ping") this.link.send({ k: "pong", at: msg.at });
			else if (msg.k === "pong" && Number.isFinite(msg.at)) this.ping = Math.round(performance.now() - msg.at);
		}
		compare(turn, hash, remote) {
			(remote ? this.remoteHashes : this.hashes).set(turn, hash);
			const a = this.hashes.get(turn),
				b = this.remoteHashes.get(turn);
			if (a && b) {
				this.hashes.delete(turn);
				this.remoteHashes.delete(turn);
				if (a !== b && !this.desync) {
					this.desync = true;
					this.onDesync?.(turn);
				}
			}
		}
		// Sends this player's commands for turn t + delay (once), with a checksum of the state at turn t.
		sendFor(t) {
			const target = t + this.NET.delay;
			if (target <= this.sent) return;
			this.sent = target;
			const slot = this.turns.get(target) || {};
			slot[this.team] = this.pending.splice(0);
			this.turns.set(target, slot);
			const msg = { k: "turn", t: target, c: slot[this.team] };
			if (t % this.NET.checkEvery === 0) {
				const hash = this.game.checksum();
				msg.h = [t, hash];
				this.compare(t, hash, false);
			}
			this.link.send(msg);
		}
		// Runs as many steps as real time allows and both players' commands are known. Returns the steps run.
		// The steps of a turn are spread over the frames like in a single-player game (one step per 1/30 s), not
		// run together at the start of the turn — that made the picture move in jumps 10 times a second.
		advance(dt) {
			const NET = this.NET,
				turnTime = NET.step * NET.stepsPerTurn;
			// Up to 3 s can be caught up (a hidden page runs on slowed-down timers).
			this.clock = Math.min(this.clock + dt, turnTime * 30);
			// After a wait for the other player a visible page catches up gradually (a few steps per frame: the battle
			// runs faster for a moment instead of jumping); a hidden page catches up at once.
			const hidden = typeof document !== "undefined" && document.hidden,
				most = hidden ? Infinity : this.clock > turnTime * 5 ? 6 : 2;
			let steps = 0;
			while (this.clock >= NET.step && steps < most && !this.game.result) {
				if (this.sub === 0) {
					this.sendFor(this.turn);
					const slot = this.turns.get(this.turn);
					if (!slot || !slot[0] || !slot[1]) {
						this.waiting += dt;
						return steps;
					}
					this.waiting = 0;
					this.turns.delete(this.turn);
					for (const team of [0, 1]) for (const [name, args] of slot[team]) this.game.applyCommand(team, name, args);
				}
				this.game.tick(NET.step);
				steps++;
				this.clock -= NET.step;
				if (++this.sub === NET.stepsPerTurn) {
					this.sub = 0;
					this.turn++;
				}
			}
			return steps;
		}
		stop() {
			clearInterval(this.pingTimer);
			// The link may live on (a rematch on the same connection): drop only this lockstep's handlers.
			const h = this.link.handlers;
			h.message = (h.message || []).filter((fn) => fn !== this.handler);
			h.close = (h.close || []).filter((fn) => fn !== this.closeHandler);
		}
	}

	// Chat: plain text, one line, at most 200 characters (shown with textContent, never as HTML).
	const chatText = (text) =>
		String(text ?? "")
			.replace(/[\u0000-\u001f\u007f]/g, " ")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 200);
	// At most 5 messages per 5 seconds from this player.
	const sentAt = [];
	function sendChat(link, text) {
		const clean = chatText(text),
			now = Date.now();
		while (sentAt.length && now - sentAt[0] > 5000) sentAt.shift();
		if (!clean || !link?.open || sentAt.length >= 5) return null;
		sentAt.push(now);
		link.send({ k: "chat", text: clean });
		return clean;
	}

	return { Link, Lockstep, encode, decode, chatText, sendChat, DEFAULT_STUN, available: () => typeof RTCPeerConnection === "function" };
})();
if (typeof window !== "undefined") window.NetPlay = NetPlay;
