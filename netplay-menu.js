/* Menu screens for network play: "Gra wieloosobowa" on the home screen, connecting by invitation and reply codes
   (WebRTC, netplay.js) and the lobby where the host picks the map and rules and each player their name, colour
   and faction. The battle itself is started by the application (api.startNetwork). Loaded after menu.js. */
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
		if (screen !== "network" && screen !== "lobby") {
			baseShow.call(this, screen, focusId);
			// The pause menu of a network battle: the menu itself stops nothing and there is no saving; a shared pause
			// (limited) and surrender instead.
			if (screen === "pause" && this.api.isNetwork?.()) {
				const info = this.api.networkInfo(),
					other = info.players[1 - info.viewer];
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
				if (single && NetPlay.available()) {
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
		this.root.querySelector("h1").textContent = screen === "lobby" ? "Lobby gry wieloosobowej" : "Gra wieloosobowa";
		const content = this.root.querySelector(".menu-content"),
			h1 = content.querySelector("h1");
		while (h1.nextSibling) h1.nextSibling.remove();
		h1.insertAdjacentHTML("afterend", screen === "lobby" ? this.lobbyHtml() : this.networkHtml());
		// The window layout: scrolled content, the actions and status fixed at the bottom.
		this.windowed();
		// The lobby chat: its own panel on the right of the lobby window.
		this.root.querySelector(".menu-layout").classList.toggle("net-lobby-layout", screen === "lobby");
		if (screen === "lobby") this.root.querySelector(".menu-layout").insertAdjacentHTML("beforeend", this.chatPanelHtml());
		this.root.querySelector(".menu-scroll").scrollTop = scrolled;
		if (draft && this.root.querySelector("#net-chat-input")) this.root.querySelector("#net-chat-input").value = draft;
		if (screen === "lobby") this.mountLobby();
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
			return `<p>Bitwa jeden na jeden z drugim graczem, bez serwera: przeglądarki łączą się bezpośrednio (WebRTC). Jeden gracz tworzy grę i wysyła kod zaproszenia, drugi odsyła kod odpowiedzi.</p>${this.profileFields(p)}<label class="menu-setting net-check"><input type="checkbox" id="net-stun" ${p.stun ? "checked" : ""}> Gra przez internet — publiczny serwer STUN (Google) podpowie przeglądarce jej adres. W sieci lokalnej można wyłączyć.</label>${n.phase === "setup" ? this.button("net-host", "Utwórz grę", true) + this.button("net-join", "Dołącz do gry") : step}<p id="net-status" class="net-status" role="status">${esc(n.status || "")}</p>${this.button(n.phase === "setup" ? "net-back" : "net-cancel", n.phase === "setup" ? "Wróć" : "Anuluj połączenie")}`;
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
			return `<aside class="net-chat-panel" aria-label="Czat lobby"><span class="eyebrow">CZAT LOBBY</span><h2>Rozmowa</h2><div class="net-chat-people">${who(me, "Ty")}${who(n.peer, "przeciwnik")}</div><ol id="net-chat-log" class="net-chat-log" aria-live="polite" aria-label="Wiadomości"></ol><div class="net-chat-row"><input id="net-chat-input" maxlength="200" autocomplete="off" placeholder="Napisz wiadomość…" aria-label="Wiadomość"><button id="net-chat-send" class="net-small">Wyślij</button></div><p class="net-chat-hint">Enter wysyła. Rozmowa przejdzie do bitwy — tam czat otwiera Enter.</p></aside>`;
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
