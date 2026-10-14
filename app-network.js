/* The network battle in the app (0.173, I4 — split out of app.js unchanged): the battle chat, the shared pause,
   the rematch, starting and ending the lockstep session (netplay.js) and the end of a network battle. app.js hands
   over its state through `app` (getters for what changes: the game, the session, started, paused, finished, the
   menu) and calls back through what this returns. */
function createAppNetwork(app) {
	"use strict";
	const { $, act, advanceHidden, decorateEnd, restart, sound, timeLabel, toast } = app;
	// Battle chat (network): recent lines over the battlefield, a line opened with Enter.
	const CHAT_SHOW = 15;
	let chatLog = [],
		chatBox = null;
	function chatHud() {
		if (chatBox) return chatBox;
		chatBox = document.createElement("div");
		chatBox.className = "battle-chat";
		chatBox.innerHTML = '<ol class="battle-chat-log" aria-live="polite" aria-label="Czat"></ol><input class="battle-chat-input" maxlength="200" autocomplete="off" aria-label="Wiadomość" hidden>';
		$("battlefield").append(chatBox);
		const input = chatBox.querySelector("input");
		input.addEventListener("keydown", (e) => {
			// The game's own shortcuts never see the keys typed here.
			e.stopPropagation();
			if (e.key === "Enter") {
				e.preventDefault();
				const text = NetPlay.sendChat(app.netSession?.link, input.value);
				if (text) addChat(app.game.players[app.game.viewer], text, true);
				closeChat();
			} else if (e.key === "Escape") {
				e.preventDefault();
				closeChat();
			}
		});
		input.addEventListener("blur", () => closeChat(false));
		return chatBox;
	}
	function addChat(player, text, mine = false) {
		chatLog.push({ name: player?.name || "Gracz", color: player?.color || "#cfe6df", text, mine, at: performance.now() });
		if (chatLog.length > 50) chatLog.shift();
		renderChat();
	}
	function openChat() {
		const input = chatHud().querySelector("input");
		input.hidden = false;
		input.placeholder = `Wiadomość do: ${netRelay ? "wszystkich w bitwie" : app.game.players[1 - app.game.viewer].name} · Enter wysyła, Esc zamyka`;
		input.focus();
		renderChat();
	}
	function closeChat(blur = true) {
		const input = chatBox?.querySelector("input");
		if (!input || input.hidden) return;
		input.value = "";
		input.hidden = true;
		if (blur) input.blur();
		renderChat();
	}
	// The last lines: those of the last 15 s, or all recent ones while typing.
	function renderChat() {
		if (!chatBox) return;
		const typing = !chatBox.querySelector("input").hidden,
			now = performance.now(),
			shown = chatLog.filter((e) => typing || now - e.at < CHAT_SHOW * 1000).slice(-6),
			log = chatBox.querySelector("ol"),
			key = shown.map((e) => e.at).join() + typing;
		chatBox.hidden = !app.netSession && !typing;
		if (log.dataset.key === key) return;
		log.dataset.key = key;
		log.replaceChildren(
			...shown.map((e) => {
				const li = document.createElement("li"),
					who = document.createElement("b");
				who.textContent = e.name + ": ";
				who.style.color = e.color;
				li.append(who, document.createTextNode(e.text));
				if (e.mine) li.className = "mine";
				return li;
			}),
		);
	}
	// Tactical intel in a network battle: the opponent, the relays, the connection and the pauses left.
	function networkIntel() {
		const me = app.game.viewer,
			mySide = app.game.sideLeader?.(me) ?? me,
			ping = app.netSession?.ping,
			nodes = app.game.nodes.length,
			mine = app.game.nodes.filter((n) => n.owner === me).length,
			theirs = app.game.nodes.filter((n) => n.owner != null && n.owner >= 0 && n.owner !== 2 && n.owner !== mySide).length;
		$("wave").previousElementSibling.textContent = "Opóźnienie sieci";
		$("wave").textContent = ping != null ? ping + " ms" : "—";
		// The bar: the share of relays held (yours against the opponent's).
		$("wave-progress").style.width = `${nodes ? (100 * mine) / nodes : 0}%`;
		$("intel-text").textContent =
			`${foes(me).length > 1 ? "Przeciwnicy" : "Przeciwnik"}: ${foes(me).map((p) => `${p.name} (${app.game.factionFor(p.team)?.name || "frakcja nieznana"}${p.ai ? ", komputer" : ""})`).join(", ")}. Przekaźniki: Twoje ${mine}, przeciwnika ${theirs} z ${nodes}. ` +
			`Zniszcz jego centrum dowodzenia. Wspólna pauza [Spacja]: zostało ${app.game.pausesLeft?.[me] ?? 0} z ${RTS.NET_PAUSE.count}.`;
	}
	// Shared pause (network): a request goes to both players as an ordinary action.
	function sharedPause() {
		if (!app.netSession || !app.started || app.finished) return;
		const pause = app.game.netPause,
			me = app.game.viewer;
		if (pause) {
			if (pause.resumeIn === null) {
				act("resumeGame");
				toast("Wznawiam grę…");
			}
			return;
		}
		if ((app.game.pausesLeft?.[me] ?? 0) <= 0) {
			toast(`Wykorzystano wszystkie pauzy (${RTS.NET_PAUSE.count}).`);
			return;
		}
		act("pauseGame");
	}
	let pauseBox = null,
		pauseSeen = null;
	function renderSharedPause() {
		const pause = app.netSession && app.started && !app.finished ? app.game.netPause : null;
		if (!pause && !pauseBox) return;
		if (!pauseBox) {
			pauseBox = document.createElement("div");
			pauseBox.className = "net-pause";
			pauseBox.setAttribute("role", "status");
			pauseBox.innerHTML = '<span class="eyebrow">WSPÓLNA PAUZA</span><strong></strong><p></p><button type="button" class="net-pause-resume">Wznów grę [Spacja]</button>';
			pauseBox.querySelector("button").onclick = sharedPause;
			$("battlefield").append(pauseBox);
		}
		// A pause began or ended: say who did it.
		const key = pause ? pause.by + ":" + (pause.resumeIn === null) : null;
		if (key !== pauseSeen) {
			if (pause && pause.resumeIn === null) {
				toast(`${app.game.players[pause.by].name} zatrzymuje grę.`);
				sound.play("radio");
			} else if (pause && pauseSeen) toast(pause.resumedBy != null ? `${app.game.players[pause.resumedBy].name} wznawia grę.` : "Koniec czasu pauzy.");
			pauseSeen = key;
		}
		pauseBox.hidden = !pause;
		if (!pause) return;
		const me = app.game.viewer,
			counting = pause.resumeIn !== null;
		pauseBox.classList.toggle("counting", counting);
		pauseBox.querySelector("strong").textContent = counting ? `Wznowienie za ${Math.max(1, Math.ceil(pause.resumeIn))}…` : pause.by === me ? "Twoja pauza" : `Pauza gracza ${app.game.players[pause.by].name}`;
		pauseBox.querySelector("p").textContent = counting
			? "Przygotuj się — bitwa zaraz rusza."
			: `Gra ruszy sama za ${Math.ceil(pause.left)} s. Rozkazy wydane teraz wykonają się po wznowieniu. Twoje pauzy: ${app.game.pausesLeft[me]} z ${RTS.NET_PAUSE.count}.`;
		pauseBox.querySelector("button").hidden = counting;
	}
	// Network battle: start, end of the session (leave, lost connection, desync), rematch.
	// netLink: the connection to the other player; it outlives a battle (the end screen offers a rematch on it).
	let netLink = null,
		netLast = null,
		// A lobby battle (G4): { url, room, client, player } — the server to come back to.
		netRelay = null,
		rematch = null;
	const hookedLinks = new WeakSet();
	// Listeners of the application on a link, once per connection: chat, rematch, the other player leaving.
	function hookLink(link) {
		if (hookedLinks.has(link)) return;
		hookedLinks.add(link);
		link.on("message", (msg) => {
			if (link !== netLink) return;
			if (msg.k === "chat") {
				const text = NetPlay.chatText(msg.text);
				if (!text || !app.netSession) return;
				// A lobby battle names the sender (team); 1 on 1 has only the other player.
				addChat(Number.isInteger(msg.team) ? app.game.players[msg.team] || { name: msg.name, color: msg.color } : app.game.players[1 - app.game.viewer], text);
				sound.play("radio");
			} else if (["dropped", "back", "takeover"].includes(msg.k) && app.netSession) {
				const who = app.game.players[msg.team]?.name || msg.name || "Gracz";
				toast(msg.k === "dropped" ? `${who} traci połączenie — bitwa trwa, jego wojska czekają.` : msg.k === "back" ? `${who} wraca do bitwy.` : `${who} nie wraca — jego stronę prowadzi komputer.`);
				sound.play("radio");
			} else if (msg.k === "rematch" && rematch) {
				rematch.theirs = true;
				if (!rematch.mine) {
					toast(`${app.game.players[1 - app.game.viewer].name} proponuje rewanż.`);
					sound.play("radio");
				}
				tryRematch();
			} else if (msg.k === "rematch-start" && rematch && netLast.team === 1 && Number.isInteger(msg.seed) && msg.seed > 0 && msg.seed < 2 ** 32)
				// The guest takes the host's new seed; everything else stays as agreed in the lobby.
				startNetwork({ link, team: 1, settings: { ...netLast.settings, seed: msg.seed } });
		});
		link.on("close", () => {
			if (link !== netLink || !rematch) return;
			rematch.gone = true;
			renderRematch();
		});
	}
	// Both players asked for a rematch: the host picks a new map seed and starts; the guest follows its message.
	function tryRematch() {
		renderRematch();
		if (!rematch?.mine || !rematch.theirs || netLast.team !== 0 || !netLink?.open) return;
		const seed = RTS.randomSeed();
		netLink.send({ k: "rematch-start", seed });
		startNetwork({ link: netLink, team: 0, settings: { ...netLast.settings, seed } });
	}
	function askRematch() {
		if (!rematch || rematch.mine || rematch.gone || !netLink?.open) return;
		rematch.mine = true;
		netLink.send({ k: "rematch" });
		tryRematch();
	}
	function renderRematch() {
		const button = $("rematch"),
			status = $("rematch-status");
		if (!button || !rematch) return;
		const other = app.game.players[1 - app.game.viewer].name;
		button.disabled = rematch.gone || rematch.mine;
		button.firstChild.textContent = rematch.gone ? "REWANŻ NIEMOŻLIWY " : rematch.mine ? "CZEKAM NA ZGODĘ… " : rematch.theirs ? "PRZYJMIJ REWANŻ " : "REWANŻ ";
		status.textContent = rematch.gone
			? `${other} opuszcza grę — rewanż jest niemożliwy.`
			: rematch.mine
				? `Propozycja wysłana. Czekam na odpowiedź gracza ${other}.`
				: rematch.theirs
					? `${other} proponuje rewanż — te same zasady i frakcje, nowy układ mapy.`
					: "Rewanż: te same zasady i frakcje, nowy układ mapy. Obaj gracze muszą się zgodzić.";
		status.classList.toggle("rematch-offer", !!rematch.theirs && !rematch.mine && !rematch.gone);
	}
	// The players of the other side of a network battle (1 on 1: the opponent; 2 vs 2: both of them).
	function foes(me = app.game.viewer) {
		return Object.entries(app.game.players || {})
			.map(([t, p]) => ({ ...p, team: Number(t) }))
			.filter((p) => p.team !== me && !app.game.allied(me, p.team));
	}
	// relay (G4): a lobby battle through the server — { url, room, client, player }; resume: the server's log after
	// coming back (the battle is rebuilt by replaying it).
	function startNetwork({ link, team, settings, relay = null, resume = null }) {
		// A rematch reuses the connection: only the finished battle ends.
		const again = link === netLink;
		endNetwork(again);
		netLink = link;
		netLast = { team, settings };
		netRelay = relay;
		rematch = null;
		hookLink(link);
		const prepared = RTS.createNetworkGame(settings);
		prepared.viewer = team;
		app.netSession = new NetPlay.Lockstep(prepared, team, link, {
			teams: relay ? prepared.humans.slice() : [0, 1],
			relay: !!relay,
			resuming: !!resume,
			onDesync: () => networkOver("Rozsynchronizowanie gry", "Symulacje graczy przestały się zgadzać — bitwa została przerwana. Zgłoś to twórcy gry (mapa, frakcje, co działo się tuż przed)."),
			onClose: () => (relay ? relayLost() : networkOver("Połączenie zerwane", "Drugi gracz opuścił bitwę albo połączenie zostało przerwane.")),
			onPhase: networkPhase,
			pump: advanceHidden,
		});
		if (resume) app.netSession.replay(resume.log, resume.from, resume.release);
		// (The log may have carried the battle into its next phase — the landing of an Inwazja.)
		const current = app.netSession.game;
		// The lobby conversation continues in the battle (and from one battle to its rematch).
		if (!again) chatLog = (app.menu.net?.chat || []).slice(-6).map((e) => ({ ...e, at: performance.now() }));
		chatHud().hidden = false;
		app.menu.hide();
		restart(current.missionId, null, current);
		// The chosen board, behind a loading screen if it is not up yet (0.175.5: it showed on Canvas 2D first).
		app.boardScreen?.(again ? "REWANŻ" : "GRA WIELOOSOBOWA");
		const mine = Object.entries(app.game.players).filter(([t]) => app.game.allied(team, Number(t)) || Number(t) === team).map(([, p]) => p.name),
			theirs = foes(team).map((p) => p.name),
			mode = app.game.modeState?.mode || "conquest",
			// The goal: the scenario mode's (network-modes.js), the orbit of an Inwazja, or the enemy centres.
			goal =
				app.game.invasion?.phase === "orbit"
					? "Inwazja — faza 1: zdobądź orbitę (zniszcz stację wroga albo miej silniejszą flotę po 8 minutach), potem lądowanie."
					: mode !== "conquest" && app.game.modeObjective
						? `${RTS.MODES[mode]?.name || ""}: ${app.game.modeObjective()}`
						: `Zniszcz ${theirs.length > 1 ? "wszystkie centra dowodzenia przeciwników" : "centrum dowodzenia przeciwnika"}.`;
		toast(resume ? "Powrót do bitwy — dogoniono jej przebieg." : `${again ? "Rewanż" : "Bitwa sieciowa"}: ${mine.join(" i ")} kontra ${theirs.join(" i ")}. ${goal}`);
	}
	// Inwazja through the network: the orbit is decided and every computer has built the ground battle at the same
	// step — the board takes it at once (the battle goes on, no landing screen to wait on).
	function networkPhase(next) {
		const I = next.invasion,
			O = I?.orbit || {},
			mine = I?.owner === (next.viewer ?? 0),
			how = O.decided === "time" ? "Po 8 minutach o orbicie zdecydowała siła flot i stacji." : mine ? "Stacja dowodzenia wroga na orbicie zniszczona." : "Twoja stacja dowodzenia na orbicie zniszczona.";
		restart(next.missionId, null, next);
		toast(`Inwazja — faza 2: lądowanie. ${how} ${mine ? `Orbita Twoja: ${O.pods} kapsuł desantowych, uderzenie z orbity i skan (panel orbity).` : `Orbita wroga: ma ${O.pods} kapsuł desantowych — buduj baterie przeciwlotnicze.`}`);
	}
	// A lobby battle lost its server: reconnect (every 2 s, for a minute) and come back by the server's log.
	function relayLost() {
		const relay = netRelay;
		if (!relay || app.finished) return networkOver("Połączenie zerwane", "Połączenie z serwerem gry zostało przerwane.");
		const team = netLast.team;
		app.netSession?.stop();
		app.netSession = null;
		app.paused = true;
		$("overlay").hidden = false;
		$("overlay").innerHTML = `<div class="briefing"><span class="eyebrow">GRA WIELOOSOBOWA / ${timeLabel(app.game.time)}</span><div class="briefing-symbol">⌁</div><h2>Łączenie ponownie…</h2><p id="relay-status">Połączenie z serwerem gry zostało przerwane. Bitwa trwa u pozostałych graczy — wracam do niej.</p><button id="end-menu" class="primary-button end-secondary">ZREZYGNUJ <span>↗</span></button></div>`;
		$("end-menu").onclick = () => {
			netRelay = null;
			endNetwork();
			app.started = false;
			app.menu.show("home");
		};
		let tries = 0;
		const attempt = () => {
			if (netRelay !== relay) return;
			if (++tries > 30) return networkOver("Nie udało się wrócić", "Serwer gry nie odpowiada. Spróbuj później: Gra wieloosobowa → Przez serwer — trwająca bitwa pojawi się na liście.");
			if ($("relay-status")) $("relay-status").textContent = `Połączenie z serwerem przerwane — próba ${tries} z 30…`;
			const link = new NetPlay.RelayLink(relay.url);
			link.on("open", () => link.send({ k: "hello", v: 1, game: typeof GAME_VERSION !== "undefined" ? GAME_VERSION : "", client: relay.client, player: relay.player }));
			link.on("message", (msg) => {
				if (msg.k === "welcome") link.send({ k: "rejoin", room: relay.room });
				else if (msg.k === "resume") {
					$("overlay").hidden = true;
					app.paused = false;
					startNetwork({ link, team: msg.team ?? team, settings: msg.settings, relay, resume: msg });
				} else if (msg.k === "error" && netRelay === relay) {
					// A few more tries (0.171.16: the first refusal ended the battle — e.g. while the server still held
					// the seat for the lost connection); the server's text is shown as text.
					if (tries < 5) {
						link.close();
						return;
					}
					networkOver("Nie udało się wrócić", escHtml(String(msg.text || "")));
				}
			});
			link.on("close", () => {
				if (netRelay === relay && !app.netSession) setTimeout(attempt, 2000);
			});
		};
		attempt();
	}
	// keepLink: the battle ends but the connection stays (end screen with a rematch, or the rematch itself).
	function endNetwork(keepLink = false) {
		closeChat();
		if (chatBox) chatBox.hidden = true;
		if (pauseBox) pauseBox.hidden = true;
		pauseSeen = null;
		if (app.netSession) {
			app.netSession.stop();
			app.netSession = null;
		}
		if (keepLink) return;
		rematch = null;
		netRelay = null;
		if (netLink) {
			netLink.close();
			netLink = null;
		}
		if (app.menu?.net) app.menu.net = null;
	}
	const escHtml = (s) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
	// The end of a network battle: the account of both sides, a rematch or the menu.
	function networkEnd(victory) {
		const me = app.game.viewer,
			others = foes(me),
			other = { name: others.map((p) => p.name).join(" i ") };
		$("overlay").hidden = false;
		// A scenario mode ends with its own account (worded for this player); conquest with the centres.
		const modeText = app.game.modeResult?.();
		$("overlay").innerHTML = `<div class="briefing"><span class="eyebrow">GRA WIELOOSOBOWA / ${timeLabel(app.game.time)}</span><div class="briefing-symbol">${victory ? "◈" : "⌁"}</div><h2>${victory ? "Zwycięstwo." : "Porażka."}</h2><p>${modeText ? modeText : netRelay ? (victory ? `Wszystkie centra dowodzenia strony ${other.name} zniszczone.` : `Strona ${other.name} zniszczyła wszystkie centra dowodzenia Twojej strony.`) : victory ? `Centrum dowodzenia gracza ${other.name} zniszczone.` : `${other.name} zniszczył Twoje centrum dowodzenia.`}</p><div class="briefing-controls"><span><b>${app.game.sideOf(me).kills}</b>Twoje zniszczone cele</span><span><b>${others.reduce((n, p) => n + (app.game.sideOf(p.team)?.kills || 0), 0)}</b>Cele zniszczone przez przeciwnika</span><span><b>${app.game.nodes.filter((n) => n.owner === (app.game.sideLeader?.(me) ?? me)).length} / ${app.game.nodes.length}</b>Twoje przekaźniki</span></div><p id="rematch-status" class="rematch-status" role="status"></p>${netRelay ? "" : '<button id="rematch" class="primary-button">REWANŻ <span>↻</span></button>'}<button id="end-menu" class="primary-button end-secondary">MENU GŁÓWNE <span>↗</span></button></div>`;
		// The connection stays for a rematch; the lockstep stops a moment later (the other computer still gets
		// the last turn).
		const ended = app.netSession;
		setTimeout(() => {
			if (app.netSession === ended) endNetwork(true);
		}, 1500);
		decorateEnd(victory);
		rematch = { mine: false, theirs: false, gone: !netLink?.open };
		renderRematch();
		if ($("rematch")) $("rematch").onclick = askRematch;
		$("end-menu").onclick = () => {
			endNetwork();
			app.started = false;
			app.menu.show("home");
		};
	}
	function networkOver(title, text) {
		if (!app.netSession || app.finished) {
			endNetwork();
			return;
		}
		app.finished = true;
		endNetwork();
		$("overlay").hidden = false;
		$("overlay").innerHTML = `<div class="briefing"><span class="eyebrow">GRA WIELOOSOBOWA / ${timeLabel(app.game.time)}</span><div class="briefing-symbol">⌁</div><h2>${title}</h2><p>${text}</p><button id="end-menu" class="primary-button">MENU GŁÓWNE <span>↗</span></button></div>`;
		$("end-menu").onclick = () => {
			app.started = false;
			app.menu.show("home");
		};
	}
	return {
		openChat,
		renderChat,
		networkIntel,
		sharedPause,
		renderSharedPause,
		foes,
		startNetwork,
		endNetwork,
		networkEnd,
	};
}
