/* Menu screens for network play: "Gra wieloosobowa" on the home screen, connecting by invitation and reply codes
   (WebRTC, netplay.js) and the lobby where the host picks the map and rules and each player their name, colour
   and faction. The battle itself is started by the application (api.startNetwork). Loaded after menu.js.
   Through a server (G4, 0.153): the list of games on a lobby server (lobby-server.js; this page's own server, a
   typed address, or — in the desktop app — a server started for the local network), rooms for 1 vs 1 and 2 vs 2
   with seats in two teams, the computer on a free seat, the host's rules, readiness and chat, and coming back to
   a battle in progress. */
(function () {
	"use strict";
	if (typeof CommandMenu === "undefined") return;
	const PROFILE_KEY = "pogranicze-network-v1";
	const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
	const option = (value, label, selected) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;
	const colorName = { "#b0efd0": "Miętowy", "#72b7ff": "Błękitny", "#d3a0ff": "Fioletowy", "#f0cb70": "Złoty", "#f59caf": "Różowy" };
	const DEFAULT_RULES = { map: "horizon", seed: 0, size: "medium", resources: "normal", weather: "normal", fauna: "normal", dayLength: "normal", startLevel: "outpost" };

	function loadProfile() {
		let saved = {};
		try {
			saved = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
		} catch {}
		return {
			// A lasting id for the lobby server (coming back to a battle after a dropped connection or a reload).
			clientId: typeof saved.clientId === "string" && saved.clientId.length >= 8 ? saved.clientId : (globalThis.crypto?.randomUUID?.() || "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)),
			server: typeof saved.server === "string" ? saved.server.slice(0, 120) : "",
			name: typeof saved.name === "string" ? saved.name.slice(0, 24) : "Dowódca",
			color: RTS.PLAYER_COLORS.includes(saved.color) ? saved.color : RTS.PLAYER_COLORS[0],
			faction: RTS.FACTIONS[saved.faction] ? saved.faction : "colonies",
			stun: saved.stun !== false,
		};
	}
	function saveProfile(p) {
		try {
			localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
		} catch {}
	}
	// A player's public data, cleaned (also what arrives from the other player).
	const cleanPlayer = (p) => ({
		name: String(p?.name || "Gracz").replace(/[<>]/g, "").slice(0, 24) || "Gracz",
		color: RTS.PLAYER_COLORS.includes(p?.color) ? p.color : RTS.PLAYER_COLORS[0],
		faction: RTS.FACTIONS[p?.faction] ? p.faction : "colonies",
	});
	const cleanRules = (r) => {
		const O = RTS.SCENARIO_OPTIONS;
		return {
			map: RTS.MISSIONS[r?.map] && !RTS.MISSIONS[r.map].campaign ? r.map : "horizon",
			seed: Number.isInteger(r?.seed) && r.seed >= 0 && r.seed <= 999999 ? r.seed : 0,
			size: RTS.MAP_SIZES[r?.size] ? r.size : "medium",
			resources: O.resources[r?.resources] ? r.resources : "normal",
			weather: O.weather[r?.weather] ? r.weather : "normal",
			fauna: O.fauna[r?.fauna] ? r.fauna : "normal",
			dayLength: O.dayLength[r?.dayLength] ? r.dayLength : "normal",
			startLevel: O.startLevel[r?.startLevel] ? r.startLevel : "outpost",
		};
	};

	const baseShow = CommandMenu.prototype.show;
	CommandMenu.prototype.show = function (screen, focusId) {
		if (!["network", "lobby", "rooms", "room"].includes(screen)) {
			baseShow.call(this, screen, focusId);
			// The pause menu of a network battle: the menu itself stops nothing and there is no saving; a shared pause
			// (limited) and surrender instead.
			if (screen === "pause" && this.api.isNetwork?.()) {
				const info = this.api.networkInfo(),
					other = { name: info.foes || info.players[1 - info.viewer]?.name };
				this.root.querySelector("h1").textContent = "Gra wieloosobowa";
				this.root.querySelector(".menu-content h1 + p").textContent =
					`Bitwa z graczem ${other.name} ${info.pause ? "jest wstrzymana (wspólna pauza)" : "trwa — samo menu nie zatrzymuje gry"}.${info.ping != null ? " Opóźnienie: " + info.ping + " ms." : ""}`;
				for (const id of ["save", "slots", "review"]) this.root.querySelector("#menu-" + id)?.remove();
				this.root.querySelector("#menu-home").firstChild.textContent = "Opuść bitwę";
				this.root.querySelector("#menu-resume").insertAdjacentHTML("afterend", this.button("surrender", "Poddaj się"));
				const total = RTS.NET_PAUSE.count,
					label = info.pause
						? info.pause.resumeIn !== null
							? "Gra zaraz rusza…"
							: "Wznów grę dla obu"
						: `Wspólna pauza (${info.pausesLeft} z ${total})`;
				this.root.querySelector("#menu-resume").insertAdjacentHTML("afterend", this.button("shared-pause", label));
				const shared = this.root.querySelector("#menu-shared-pause");
				shared.disabled = info.pause ? info.pause.resumeIn !== null : info.pausesLeft <= 0;
				shared.onclick = () => {
					this.api.sharedPause();
					this.hide();
					this.api.resume();
				};
				this.root.querySelector("#menu-surrender").onclick = () => {
					this.api.surrender();
					this.hide();
					this.api.resume();
				};
			}
			if (screen === "home") {
				// "Gra wieloosobowa" right after "Gra jednoosobowa".
				const single = this.root.querySelector("#menu-single");
				if (single && (NetPlay.available() || NetPlay.lobbyAvailable?.())) {
					single.insertAdjacentHTML("afterend", this.button("multi", "Gra wieloosobowa"));
					this.root.querySelector("#menu-multi").onclick = () => this.show("network");
				}
			}
			return;
		}
		// Keep the scroll position and an unsent chat line when the same screen is drawn again (the lobby redraws
		// on every message).
		const again = this.screen === screen,
			scrolled = again ? this.root.querySelector(".menu-scroll")?.scrollTop || 0 : 0,
			draft = again ? this.root.querySelector("#net-chat-input")?.value || "" : "";
		// Borrow the frame of a plain window screen, then fill it with the network content.
		baseShow.call(this, "news");
		this.screen = screen;
		this.net ??= { phase: "setup", profile: loadProfile(), rules: { ...DEFAULT_RULES }, peer: null, peerReady: false, ready: false };
		this.root.querySelector(".menu-content").classList.add("wide", "net-screen");
		// (The borrowed frame's eyebrow belongs to the news screen.)
		const eyebrow = this.root.querySelector(".menu-content .eyebrow");
		if (eyebrow) eyebrow.textContent = screen === "rooms" || screen === "room" ? "GRA WIELOOSOBOWA / SERWER" : "GRA WIELOOSOBOWA";
		this.root.querySelector("h1").textContent = screen === "lobby" ? "Lobby gry wieloosobowej" : screen === "rooms" ? "Gry na serwerze" : screen === "room" ? this.net.relay?.room?.name || "Gra na serwerze" : "Gra wieloosobowa";
		const content = this.root.querySelector(".menu-content"),
			h1 = content.querySelector("h1");
		while (h1.nextSibling) h1.nextSibling.remove();
		h1.insertAdjacentHTML("afterend", screen === "lobby" ? this.lobbyHtml() : screen === "rooms" ? this.roomsHtml() : screen === "room" ? this.roomHtml() : this.networkHtml());
		// The window layout: scrolled content, the actions and status fixed at the bottom.
		this.windowed();
		// The lobby chat: its own panel on the right of the lobby window.
		this.root.querySelector(".menu-layout").classList.toggle("net-lobby-layout", screen === "lobby" || screen === "room");
		if (screen === "lobby" || screen === "room") this.root.querySelector(".menu-layout").insertAdjacentHTML("beforeend", this.chatPanelHtml());
		this.root.querySelector(".menu-scroll").scrollTop = scrolled;
		if (draft && this.root.querySelector("#net-chat-input")) this.root.querySelector("#net-chat-input").value = draft;
		if (screen === "lobby") this.mountLobby();
		else if (screen === "rooms") this.mountRooms();
		else if (screen === "room") this.mountRoom();
		else this.mountNetwork();
		((focusId && this.root.querySelector("#" + focusId)) || h1).focus();
	};

	Object.assign(CommandMenu.prototype, {
		profileFields(p, idPrefix = "net") {
			return `<div class="net-fields"><label class="menu-setting">Nazwa gracza<input id="${idPrefix}-name" maxlength="24" value="${esc(p.name)}"></label><label class="menu-setting">Kolor<select id="${idPrefix}-color">${RTS.PLAYER_COLORS.map((c) => option(c, colorName[c] || c, p.color)).join("")}</select></label><label class="menu-setting">Frakcja<select id="${idPrefix}-faction">${Object.entries(RTS.FACTIONS).map(([k, f]) => option(k, f.name, p.faction)).join("")}</select></label></div>`;
		},
		networkHtml() {
			const n = this.net,
				p = n.profile;
			let step = "";
			if (n.phase === "host")
				step = `<h2>Tworzysz grę</h2><ol class="net-steps"><li><b>Wyślij drugiemu graczowi kod zaproszenia</b> (komunikator, e-mail).<textarea id="net-invite" readonly rows="3" placeholder="Tworzenie kodu…">${esc(n.invite || "")}</textarea><button id="net-copy-invite" class="net-small">Kopiuj kod zaproszenia</button></li><li><b>Wklej kod odpowiedzi</b>, który przyśle drugi gracz.<textarea id="net-answer" rows="3" placeholder="RTS1.…"></textarea><button id="net-connect" class="net-small">Połącz</button></li></ol>`;
			else if (n.phase === "join")
				step = `<h2>Dołączasz do gry</h2><ol class="net-steps"><li><b>Wklej kod zaproszenia</b> od gospodarza.<textarea id="net-offer" rows="3" placeholder="RTS1.…"></textarea><button id="net-reply" class="net-small">Utwórz kod odpowiedzi</button></li><li><b>Odeślij gospodarzowi kod odpowiedzi</b> i poczekaj na połączenie.<textarea id="net-answer-out" readonly rows="3" placeholder="Pojawi się po wklejeniu zaproszenia">${esc(n.reply || "")}</textarea><button id="net-copy-reply" class="net-small">Kopiuj kod odpowiedzi</button></li></ol>`;
			const server =
				n.phase === "setup" && NetPlay.lobbyAvailable?.()
					? `<h2>Przez serwer — lista gier, 1 na 1 i 2 na 2</h2><p>Gry widoczne dla wszystkich na serwerze; drużyny 2 na 2, komputer na wolnym miejscu, powrót do bitwy po zerwaniu połączenia. Adres pusty — serwer, z którego wczytano grę${typeof window !== "undefined" && window.desktop?.lobby ? "; albo uruchom serwer na tym komputerze dla graczy w tej samej sieci" : ""}.</p><label class="menu-setting">Adres serwera<input id="net-server" maxlength="120" placeholder="np. 192.168.1.10:4174" value="${esc(p.server)}"></label>${this.button("net-relay", "Połącz z serwerem")}${typeof window !== "undefined" && window.desktop?.lobby ? this.button("net-local-server", "Uruchom serwer w sieci lokalnej") : ""}<h2>Bezpośrednio — 1 na 1 przez kody</h2>`
					: "";
			return `${server}<p>Bitwa jeden na jeden z drugim graczem, bez serwera: przeglądarki łączą się bezpośrednio (WebRTC). Jeden gracz tworzy grę i wysyła kod zaproszenia, drugi odsyła kod odpowiedzi.</p>${this.profileFields(p)}<label class="menu-setting net-check"><input type="checkbox" id="net-stun" ${p.stun ? "checked" : ""}> Gra przez internet — publiczny serwer STUN (Google) podpowie przeglądarce jej adres. W sieci lokalnej można wyłączyć.</label>${n.phase === "setup" ? this.button("net-host", "Utwórz grę", true) + this.button("net-join", "Dołącz do gry") : step}<p id="net-status" class="net-status" role="status">${esc(n.status || "")}</p>${this.button(n.phase === "setup" ? "net-back" : "net-cancel", n.phase === "setup" ? "Wróć" : "Anuluj połączenie")}`;
		},
		mountNetwork() {
			const n = this.net,
				$ = (id) => this.root.querySelector("#" + id),
				status = (t) => {
					n.status = t;
					if ($("net-status")) $("net-status").textContent = t;
				};
			const bindProfile = () => {
				for (const key of ["name", "color", "faction"])
					$("net-" + key).onchange = $("net-" + key).oninput = (e) => {
						n.profile[key] = e.target.value;
						saveProfile(n.profile);
					};
				$("net-stun").onchange = (e) => {
					n.profile.stun = e.target.checked;
					saveProfile(n.profile);
				};
			};
			bindProfile();
			if ($("net-server"))
				$("net-server").oninput = (e) => {
					n.profile.server = e.target.value.trim().slice(0, 120);
					saveProfile(n.profile);
				};
			const on0 = (id, fn) => $("menu-" + id) && ($("menu-" + id).onclick = fn);
			on0("net-relay", () => this.relayConnect(n.profile.server));
			on0("net-local-server", async () => {
				status("Uruchamianie serwera…");
				try {
					const info = await window.desktop.lobby();
					n.localServer = info;
					this.relayConnect(`localhost:${info.port}`, `Serwer działa. Inni gracze w tej sieci wpisują adres: ${(info.addresses.length ? info.addresses : ["localhost"]).map((a) => a + ":" + info.port).join(" lub ")}.`);
				} catch (e) {
					status("Nie udało się uruchomić serwera: " + (e.message || e));
				}
			});
			const link = () => {
				n.link?.close();
				n.link = new NetPlay.Link({ stun: n.profile.stun });
				n.link.on("open", () => {
					n.phase = "lobby";
					n.status = "";
					n.link.send({ k: "hello", v: RTS.NET.version, player: cleanPlayer(n.profile) });
					if (n.role === "host") n.link.send({ k: "settings", rules: n.rules });
					this.show("lobby");
				});
				n.link.on("message", (msg) => this.netMessage(msg));
				n.link.on("close", () => this.netLost());
				return n.link;
			};
			const copy = async (id) => {
				try {
					await navigator.clipboard.writeText($(id).value);
					status("Skopiowano do schowka.");
				} catch {
					$(id).select();
					status("Zaznaczono kod — skopiuj go (Ctrl+C).");
				}
			};
			const on = (id, fn) => $("menu-" + id) && ($("menu-" + id).onclick = fn);
			on("net-back", () => this.show("home", "menu-multi"));
			on("net-cancel", () => {
				n.link?.close();
				n.link = null;
				Object.assign(n, { phase: "setup", invite: "", reply: "", status: "" });
				this.show("network");
			});
			on("net-host", async () => {
				n.role = "host";
				n.phase = "host";
				n.invite = "";
				this.show("network");
				status("Tworzenie kodu zaproszenia…");
				try {
					n.invite = await link().invite();
					if ($("net-invite")) $("net-invite").value = n.invite;
					status("Kod gotowy. Wyślij go i czekaj na kod odpowiedzi.");
				} catch (e) {
					status("Nie udało się utworzyć połączenia: " + (e.message || e));
				}
			});
			on("net-join", () => {
				n.role = "guest";
				n.phase = "join";
				n.reply = "";
				this.show("network");
			});
			if ($("net-copy-invite")) $("net-copy-invite").onclick = () => copy("net-invite");
			if ($("net-copy-reply")) $("net-copy-reply").onclick = () => copy("net-answer-out");
			if ($("net-connect"))
				$("net-connect").onclick = async () => {
					status("Łączenie…");
					try {
						await n.link.accept($("net-answer").value);
						status("Łączenie z drugim graczem…");
					} catch (e) {
						status(e.message || "Nieprawidłowy kod odpowiedzi.");
					}
				};
			if ($("net-reply"))
				$("net-reply").onclick = async () => {
					status("Tworzenie kodu odpowiedzi…");
					try {
						n.reply = await link().reply($("net-offer").value);
						$("net-answer-out").value = n.reply;
						status("Odeślij kod odpowiedzi gospodarzowi. Połączenie nastąpi samo.");
					} catch (e) {
						status(e.message || "Nieprawidłowy kod zaproszenia.");
					}
				};
		},
		lobbyHtml() {
			const n = this.net,
				host = n.role === "host",
				r = n.rules,
				O = RTS.SCENARIO_OPTIONS,
				dis = host ? "" : "disabled",
				me = cleanPlayer(n.profile),
				card = (p, label, ready) =>
					p
						? `<div class="net-player"><span class="net-swatch" style="background:${esc(p.color)}"></span><span><b>${esc(p.name)}</b><small>${esc(label)} · ${esc(RTS.FACTIONS[p.faction]?.name)}</small></span><em>${ready}</em></div>`
						: `<div class="net-player"><span class="net-swatch"></span><span><b>…</b><small>${esc(label)}</small></span></div>`;
			const hostPlayer = host ? me : n.peer,
				guestPlayer = host ? n.peer : me;
			const select = (id, entries, value) => `<select id="net-rule-${id}" ${dis}>${entries.map(([k, label]) => option(k, label, value)).join("")}</select>`;
			const rules = `<div class="net-fields"><label class="menu-setting">Mapa${select("map", Object.entries(RTS.MISSIONS).filter(([, m]) => !m.campaign).map(([id, m]) => [id, m.name + " / " + m.planet]), r.map)}</label><label class="menu-setting">Rozmiar mapy${select("size", Object.entries(RTS.MAP_SIZES).map(([k, s]) => [k, s.name]), r.size)}</label><label class="menu-setting">Złoża${select("resources", Object.entries(O.resources).map(([k, o]) => [k, o.name]), r.resources)}</label><label class="menu-setting">Pogoda${select("weather", Object.entries(O.weather).map(([k, o]) => [k, o.name]), r.weather)}</label><label class="menu-setting">Fauna${select("fauna", Object.entries(O.fauna).map(([k, o]) => [k, o.name]), r.fauna)}</label><label class="menu-setting">Długość doby${select("dayLength", Object.entries(O.dayLength).map(([k, o]) => [k, o.name]), r.dayLength)}</label><label class="menu-setting">Poziom startowy${select("startLevel", Object.entries(O.startLevel).map(([k, o]) => [k, o.name]), r.startLevel)}</label><label class="menu-setting">Ziarno mapy<span class="net-seed"><input id="net-rule-seed" type="number" min="0" max="999999" value="${r.seed}" ${dis}>${host ? '<button id="net-seed-random" class="net-small">Losuj</button>' : ""}</span></label></div>`;
			return `<div class="net-players">${card(hostPlayer, "Gospodarz · drużyna 1", "")}${card(guestPlayer, "Gość · drużyna 2", n.peer || !host ? (host ? n.peerReady : n.ready) ? "gotowy" : "czeka" : "")}</div><h2>Ty</h2>${this.profileFields(n.profile, "lobby")}<h2>Zasady ${host ? "" : "<small>(wybiera gospodarz)</small>"}</h2>${rules}<p id="net-status" class="net-status" role="status">${esc(n.status || "")}</p>${host ? this.button("net-start", "Rozpocznij bitwę", true) : this.button("net-ready", n.ready ? "Nie jestem gotowy" : "Jestem gotowy", !n.ready)}${this.button("net-leave", "Rozłącz i wróć")}`;
		},
		chatPanelHtml() {
			const n = this.net,
				me = cleanPlayer(n.profile),
				who = (p, label) =>
					p
						? `<span class="net-chat-who"><i class="net-swatch" style="background:${esc(p.color)}"></i>${esc(p.name)}<small>${label}</small></span>`
						: `<span class="net-chat-who"><i class="net-swatch"></i>…<small>${label}</small></span>`;
			// A room on a server: everyone in it (the computer seats left out).
			const room = this.screen === "room" ? n.relay?.room : null,
				people = room
					? room.seats
							.map((s, i) => (s.player && !s.ai ? who(s.player, i === n.relay.you ? "Ty" : room.size === 4 ? ([0, 1].includes(i) === [0, 1].includes(n.relay.you) ? "sojusznik" : "przeciwnik") : "przeciwnik") : ""))
							.join("")
					: who(me, "Ty") + who(n.peer, "przeciwnik");
			return `<aside class="net-chat-panel" aria-label="Czat lobby"><span class="eyebrow">CZAT LOBBY</span><h2>Rozmowa</h2><div class="net-chat-people">${people}</div><ol id="net-chat-log" class="net-chat-log" aria-live="polite" aria-label="Wiadomości"></ol><div class="net-chat-row"><input id="net-chat-input" maxlength="200" autocomplete="off" placeholder="Napisz wiadomość…" aria-label="Wiadomość"><button id="net-chat-send" class="net-small">Wyślij</button></div><p class="net-chat-hint">Enter wysyła. Rozmowa przejdzie do bitwy — tam czat otwiera Enter.</p></aside>`;
		},
		// One chat line (textContent only: the other player's text is never HTML).
		chatLine(entry) {
			const li = document.createElement("li"),
				who = document.createElement("b");
			who.textContent = entry.name + ": ";
			who.style.color = entry.color;
			li.append(who, document.createTextNode(entry.text));
			if (entry.mine) li.className = "mine";
			return li;
		},
		renderChat() {
			const log = this.root.querySelector("#net-chat-log");
			if (!log) return;
			log.replaceChildren(...(this.net.chat || []).map((e) => this.chatLine(e)));
			log.scrollTop = log.scrollHeight;
		},
		addChat(entry) {
			const n = this.net;
			(n.chat ||= []).push(entry);
			if (n.chat.length > 100) n.chat.shift();
			if (this.screen === "lobby" && this.active) this.renderChat();
		},
		mountLobby() {
			const n = this.net,
				host = n.role === "host",
				$ = (id) => this.root.querySelector("#" + id);
			this.renderChat();
			const send = () => {
				const text = NetPlay.sendChat(n.link, $("net-chat-input").value);
				if (!text) return;
				const me = cleanPlayer(n.profile);
				this.addChat({ name: me.name, color: me.color, text, mine: true });
				$("net-chat-input").value = "";
			};
			$("net-chat-send").onclick = send;
			$("net-chat-input").onkeydown = (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					send();
				}
			};
			for (const key of ["name", "color", "faction"])
				$("lobby-" + key).onchange = (e) => {
					n.profile[key] = e.target.value;
					saveProfile(n.profile);
					n.link?.send({ k: "hello", v: RTS.NET.version, player: cleanPlayer(n.profile) });
					this.show("lobby", "lobby-" + key);
				};
			if (host) {
				for (const key of ["map", "size", "resources", "weather", "fauna", "dayLength", "startLevel", "seed"])
					$("net-rule-" + key).onchange = (e) => {
						n.rules[key] = key === "seed" ? Math.max(0, Math.min(999999, Math.round(Number(e.target.value) || 0))) : e.target.value;
						n.rules = cleanRules(n.rules);
						n.peerReady = false;
						n.link?.send({ k: "settings", rules: n.rules });
						this.show("lobby", "net-rule-" + key);
					};
				$("net-seed-random").onclick = () => {
					n.rules.seed = RTS.randomSeed();
					n.peerReady = false;
					n.link?.send({ k: "settings", rules: n.rules });
					this.show("lobby", "net-seed-random");
				};
			}
			const start = $("menu-net-start");
			if (start) {
				start.disabled = !n.peer || !n.peerReady;
				if (!n.peer) n.status = "Czekam na dane drugiego gracza…";
				else if (!n.peerReady) n.status = "Czekam, aż drugi gracz będzie gotowy.";
				else n.status = "Obaj gracze gotowi.";
				$("net-status").textContent = n.status;
				start.onclick = () => {
					const settings = { ...cleanRules(n.rules), seed: n.rules.seed || RTS.randomSeed(), players: [cleanPlayer(n.profile), n.peer] };
					n.link.send({ k: "start", settings });
					this.startNetworkBattle(settings, 0);
				};
			}
			const ready = $("menu-net-ready");
			if (ready)
				ready.onclick = () => {
					n.ready = !n.ready;
					n.link?.send({ k: "ready", ready: n.ready });
					this.show("lobby", "menu-net-ready");
				};
			$("menu-net-leave").onclick = () => {
				n.link?.close();
				this.net = null;
				this.show("network");
			};
		},
		// ---------- through a server (G4) ----------
		relayConnect(address, note = "") {
			const n = this.net,
				url = NetPlay.lobbyUrl(address);
			n.relay?.link?.close();
			const r = (n.relay = { url, link: new NetPlay.RelayLink(url), rooms: [], room: null, you: -1, status: "Łączenie z " + url + "…", note });
			n.chat = [];
			r.link.on("open", () => r.link.send({ k: "hello", v: 1, client: n.profile.clientId, player: cleanPlayer(n.profile) }));
			r.link.on("message", (msg) => this.relayMessage(msg));
			r.link.on("close", () => {
				if (n.relay !== r || n.battle) return;
				n.relay = null;
				n.status = r.room || r.welcomed ? "Połączenie z serwerem zostało zerwane." : "Nie udało się połączyć z serwerem " + url + ".";
				if (this.active && ["rooms", "room", "network"].includes(this.screen)) this.show("network");
			});
			this.show("rooms");
		},
		relayMessage(msg) {
			const n = this.net,
				r = n?.relay;
			if (!r) return;
			if (msg.k === "welcome") {
				r.welcomed = true;
				r.client = msg.client;
				r.status = r.note || "Połączono z serwerem.";
				r.link.send({ k: "list" });
			} else if (msg.k === "rooms") r.rooms = msg.rooms || [];
			else if (msg.k === "resumable") r.resumable = msg;
			else if (msg.k === "room") {
				const first = !r.room;
				r.room = msg.room;
				r.you = msg.you;
				if (first || this.screen !== "room") return this.show("room");
			} else if (msg.k === "closed") {
				r.room = null;
				r.status = msg.text || "Gra została zamknięta.";
				return this.show("rooms");
			} else if (msg.k === "error") {
				r.status = msg.text;
				if (this.active) this.root.querySelector("#net-status") && (this.root.querySelector("#net-status").textContent = msg.text);
				return;
			} else if (msg.k === "chat") {
				const text = NetPlay.chatText(msg.text);
				if (text) this.addChat({ name: msg.name || "Gracz", color: msg.color || "#c8d8dc", text });
				return;
			} else if (msg.k === "start" || msg.k === "resume") {
				n.battle = true;
				const relay = { url: r.url, room: msg.k === "start" ? r.room.id : r.resumeRoom, client: r.client || n.profile.clientId, player: cleanPlayer(n.profile) };
				this.api.startNetwork?.({ link: r.link, team: msg.team, settings: msg.settings, relay, resume: msg.k === "resume" ? msg : null });
				return;
			} else return;
			if (this.active && (this.screen === "rooms" || this.screen === "room")) this.show(this.screen, document.activeElement?.id);
		},
		roomsHtml() {
			const n = this.net,
				r = n.relay || {},
				maps = (id) => RTS.MISSIONS[id]?.name || id;
			const list = (r.rooms || []).length
				? `<div class="net-rooms">${r.rooms
						.map(
							(g) =>
								`<div class="net-room"><span><b>${esc(g.name)}</b><small>${esc(maps(g.map))} · ${g.size === 4 ? "2 na 2" : "1 na 1"} · gracze ${g.players}/${g.size}${g.started ? " · bitwa trwa" : g.free ? ` · wolne miejsca: ${g.free}` : " · komplet"}</small></span><button class="net-small" data-room="${esc(g.id)}" ${g.started || !g.free ? "disabled" : ""}>Dołącz</button></div>`,
						)
						.join("")}</div>`
				: `<p class="net-empty">${r.welcomed ? "Na serwerze nie ma jeszcze gier — utwórz pierwszą." : "Łączenie…"}</p>`;
			const resume = r.resumable ? `<div class="net-resume"><p>Twoja bitwa „${esc(r.resumable.name)}” trwa — połączenie zostało przerwane.</p>${this.button("net-rejoin", "Wróć do bitwy", true)}</div>` : "";
			return `<p class="net-server">Serwer: <b>${esc(r.url || "")}</b></p>${resume}<h2>Gry na serwerze</h2>${list}<h2>Nowa gra</h2><div class="net-fields"><label class="menu-setting">Nazwa gry<input id="net-room-name" maxlength="40" value="${esc("Gra gracza " + n.profile.name)}"></label><label class="menu-setting">Układ<select id="net-room-size"><option value="2">1 na 1</option><option value="4">2 na 2 — drużyny</option></select></label></div>${this.button("net-room-create", "Utwórz grę", true)}<h2>Ty</h2>${this.profileFields(n.profile, "relay")}<p id="net-status" class="net-status" role="status">${esc(r.status || "")}</p>${this.button("net-relay-refresh", "Odśwież listę")}${this.button("net-relay-leave", "Rozłącz z serwerem")}`;
		},
		mountRooms() {
			const n = this.net,
				r = n.relay,
				$ = (id) => this.root.querySelector("#" + id);
			if (!r) return this.show("network");
			for (const b of this.root.querySelectorAll("[data-room]")) b.onclick = () => r.link.send({ k: "join", room: b.dataset.room });
			for (const key of ["name", "color", "faction"])
				$("relay-" + key).onchange = (e) => {
					n.profile[key] = e.target.value;
					saveProfile(n.profile);
					r.link.send({ k: "profile", player: cleanPlayer(n.profile) });
				};
			$("menu-net-room-create").onclick = () => r.link.send({ k: "create", name: $("net-room-name").value, size: Number($("net-room-size").value), rules: { ...DEFAULT_RULES, ...cleanRules(n.rules) } });
			$("menu-net-relay-refresh").onclick = () => r.link.send({ k: "list" });
			$("menu-net-relay-leave").onclick = () => {
				n.relay = null;
				r.link.close();
				this.show("network");
			};
			if ($("menu-net-rejoin"))
				$("menu-net-rejoin").onclick = () => {
					r.resumeRoom = r.resumable.room;
					r.link.send({ k: "rejoin", room: r.resumable.room });
				};
		},
		rulesHtml(r, editable) {
			const O = RTS.SCENARIO_OPTIONS,
				dis = editable ? "" : "disabled",
				select = (id, entries, value) => `<select id="net-rule-${id}" ${dis}>${entries.map(([k, label]) => option(k, label, value)).join("")}</select>`;
			return `<div class="net-fields"><label class="menu-setting">Mapa${select("map", Object.entries(RTS.MISSIONS).filter(([, m]) => !m.campaign).map(([id, m]) => [id, m.name + " / " + m.planet]), r.map)}</label><label class="menu-setting">Rozmiar mapy${select("size", Object.entries(RTS.MAP_SIZES).map(([k, s]) => [k, s.name]), r.size)}</label><label class="menu-setting">Złoża${select("resources", Object.entries(O.resources).map(([k, o]) => [k, o.name]), r.resources)}</label><label class="menu-setting">Pogoda${select("weather", Object.entries(O.weather).map(([k, o]) => [k, o.name]), r.weather)}</label><label class="menu-setting">Fauna${select("fauna", Object.entries(O.fauna).map(([k, o]) => [k, o.name]), r.fauna)}</label><label class="menu-setting">Długość doby${select("dayLength", Object.entries(O.dayLength).map(([k, o]) => [k, o.name]), r.dayLength)}</label><label class="menu-setting">Poziom startowy${select("startLevel", Object.entries(O.startLevel).map(([k, o]) => [k, o.name]), r.startLevel)}</label><label class="menu-setting">Ziarno mapy<span class="net-seed"><input id="net-rule-seed" type="number" min="0" max="999999" value="${r.seed}" ${dis}>${editable ? '<button id="net-seed-random" class="net-small">Losuj</button>' : ""}</span></label></div>`;
		},
		roomHtml() {
			const n = this.net,
				r = n.relay,
				room = r?.room;
			if (!room) return "";
			const host = room.host === r.client,
				me = room.seats[r.you],
				rules = cleanRules({ ...DEFAULT_RULES, ...room.rules });
			const seat = (s, i) => {
				const mine = i === r.you,
					p = s.player,
					state = s.ai ? "komputer" : !s.taken ? "wolne" : s.host ? "gospodarz" : s.ready ? "gotowy" : "czeka";
				const actions = [
					!s.taken && !s.ai && !mine ? `<button class="net-small" data-seat="${i}">Zajmij</button>` : "",
					host && !s.taken ? `<button class="net-small" data-ai="${i}" data-on="${s.ai ? 0 : 1}">${s.ai ? "Usuń komputer" : "Komputer"}</button>` : "",
				].join("");
				return `<div class="net-player${mine ? " mine" : ""}"><span class="net-swatch" style="${p ? `background:${esc(p.color)}` : ""}"></span><span><b>${p ? esc(p.name) + (mine ? " (Ty)" : "") : "Wolne miejsce"}</b><small>${p ? esc(RTS.FACTIONS[p.faction]?.name || "") : "czeka na gracza lub komputer"}</small></span><em>${state}</em>${actions}</div>`;
			};
			const teams = room.size === 4 ? [["Drużyna A", [0, 1]], ["Drużyna B", [2, 3]]] : [["Strona 1", [0]], ["Strona 2", [1]]];
			const seats = `<div class="net-teams">${teams.map(([label, idx]) => `<div class="net-team"><h3>${label}</h3>${idx.map((i) => seat(room.seats[i], i)).join("")}</div>`).join("")}</div>`;
			const all = room.seats.every((s) => s.taken || s.ai),
				readyAll = room.seats.every((s) => s.ai || !s.taken || s.ready || s.host);
			r.canStart = host && all && readyAll;
			return `<p class="net-server">Serwer: <b>${esc(r.url)}</b> · ${room.size === 4 ? "2 na 2" : "1 na 1"}${host ? " · gospodarz: Ty" : ""}</p>${seats}<h2>Ty</h2>${this.profileFields(n.profile, "room")}<h2>Zasady ${host ? "" : "<small>(wybiera gospodarz)</small>"}</h2>${this.rulesHtml(rules, host)}<p id="net-status" class="net-status" role="status">${esc(host ? (all ? (readyAll ? "Wszyscy gotowi." : "Czekam, aż gracze będą gotowi.") : "Zajmij lub oddaj komputerowi każde miejsce.") : r.status || "")}</p>${host ? this.button("net-room-start", "Rozpocznij bitwę", true) : this.button("net-room-ready", me?.ready ? "Nie jestem gotowy" : "Jestem gotowy", !me?.ready)}${this.button("net-room-leave", host ? "Zamknij grę" : "Opuść grę")}`;
		},
		mountRoom() {
			const n = this.net,
				r = n.relay,
				room = r?.room,
				$ = (id) => this.root.querySelector("#" + id);
			if (!room) return this.show("rooms");
			const host = room.host === r.client;
			this.renderChat();
			const send = () => {
				const text = NetPlay.sendChat(r.link, $("net-chat-input").value);
				if (!text) return;
				const me = cleanPlayer(n.profile);
				this.addChat({ name: me.name, color: me.color, text, mine: true });
				$("net-chat-input").value = "";
			};
			$("net-chat-send").onclick = send;
			$("net-chat-input").onkeydown = (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					send();
				}
			};
			for (const key of ["name", "color", "faction"])
				$("room-" + key).onchange = (e) => {
					n.profile[key] = e.target.value;
					saveProfile(n.profile);
					r.link.send({ k: "profile", player: cleanPlayer(n.profile) });
				};
			for (const b of this.root.querySelectorAll("[data-seat]")) b.onclick = () => r.link.send({ k: "seat", seat: Number(b.dataset.seat) });
			for (const b of this.root.querySelectorAll("[data-ai]")) b.onclick = () => r.link.send({ k: "ai", seat: Number(b.dataset.ai), on: b.dataset.on === "1" });
			if (host) {
				const push = (rules) => r.link.send({ k: "rules", rules: cleanRules(rules) });
				for (const key of ["map", "size", "resources", "weather", "fauna", "dayLength", "startLevel", "seed"])
					$("net-rule-" + key).onchange = (e) => push({ ...room.rules, [key]: key === "seed" ? Math.max(0, Math.min(999999, Math.round(Number(e.target.value) || 0))) : e.target.value });
				$("net-seed-random").onclick = () => push({ ...room.rules, seed: RTS.randomSeed() });
				$("menu-net-room-start").disabled = !r.canStart;
				$("menu-net-room-start").onclick = () => r.link.send({ k: "start" });
			} else
				$("menu-net-room-ready").onclick = () => {
					const me = room.seats[r.you];
					r.link.send({ k: "ready", on: !me?.ready });
				};
			$("menu-net-room-leave").onclick = () => {
				r.link.send({ k: "leave" });
				r.room = null;
				n.chat = [];
				this.show("rooms");
			};
		},
		netMessage(msg) {
			const n = this.net;
			if (!n) return;
			if (msg.k === "hello") {
				if (msg.v !== RTS.NET.version) {
					n.status = "Drugi gracz ma inną wersję gry — zaktualizujcie ją oboje.";
					n.link.close();
				}
				n.peer = cleanPlayer(msg.player);
			} else if (msg.k === "settings" && n.role === "guest") {
				n.rules = cleanRules(msg.rules);
				n.ready = false;
			} else if (msg.k === "ready" && n.role === "host") n.peerReady = !!msg.ready;
			else if (msg.k === "start" && n.role === "guest" && msg.settings) {
				const s = msg.settings;
				this.startNetworkBattle({ ...cleanRules(s), seed: Number.isInteger(s.seed) ? s.seed : 42, players: (s.players || []).slice(0, 2).map(cleanPlayer) }, 1);
				return;
			} else if (msg.k === "bye") {
				this.netLost();
				return;
			} else if (msg.k === "chat") {
				const text = NetPlay.chatText(msg.text);
				if (text && n.peer) this.addChat({ name: n.peer.name, color: n.peer.color, text });
				return;
			} else return;
			if (this.screen === "lobby" && this.active) this.show("lobby", document.activeElement?.id);
		},
		netLost() {
			const n = this.net;
			if (!n || n.battle) return;
			n.link = null;
			n.peer = null;
			n.peerReady = false;
			n.phase = "setup";
			n.status = "Połączenie z drugim graczem zostało zerwane.";
			if (this.active && (this.screen === "lobby" || this.screen === "network")) this.show("network");
		},
		startNetworkBattle(settings, team) {
			const n = this.net;
			n.battle = true;
			this.api.startNetwork?.({ link: n.link, team, settings });
		},
	});
})();
