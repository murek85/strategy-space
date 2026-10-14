/* I6 (0.175.1): accessibility — keys of one's own, the size of the interface, a palette for colour-blind players.
   Settings → Dostępność; kept on this device (pogranicze-access-v1). Only the view and the input: nothing of it goes
   into the game's state or a network battle (each player has their own).
   - Keys: each action keeps its default key in the code (app-controls.js). A key pressed is translated, before the
     game sees it, to the default key of the action it is bound to (a capture listener sets the event's `key`), and a
     default key given to another action does nothing. A Shift combination follows its key (Shift+P: patrol). The
     labels on the screen (<kbd>, "[M]") show the bound key.
   - Size: the top bar, the side panel, the command bar, the menu and the reports (CSS zoom, --ui-scale) — not the
     board, whose overlays follow the pointer.
   - Palette: the sides' colours by relation, from the Okabe-Ito set (blue and orange instead of green and red):
     you sky blue, allies bluish green, enemies orange / yellow / vermilion, the neutral side purple
     (advanced-rules.js colorFor asks Access.teamColor). */
(function (root) {
	"use strict";
	const KEY = "pogranicze-access-v1";
	// The actions that can be rebound: their default key in the code, a label, a group.
	const ACTIONS = [
		["q", "Piechota", "Produkcja"],
		["w", "Rakietowiec", "Produkcja"],
		["e", "Czołg zwiadowczy", "Produkcja"],
		["d", "Robot górniczy", "Produkcja"],
		["y", "Ciężka maszyna", "Produkcja"],
		["o", "Artyleria", "Produkcja"],
		["b", "Koszary", "Budowa"],
		["v", "Fabryka pojazdów", "Budowa"],
		["t", "Wieżyczka obronna", "Budowa"],
		["g", "Magazyn polowy", "Budowa"],
		["c", "Reaktor", "Budowa"],
		["n", "Laboratorium", "Budowa"],
		["x", "Ekstraktor gazu", "Budowa"],
		["k", "Mur", "Budowa"],
		["p", "Brama (z Shift: patrol)", "Budowa"],
		["u", "Badanie: broń", "Badania"],
		["i", "Badanie: pancerz", "Badania"],
		["l", "Badanie: ładownie", "Badania"],
		["a", "Atak w marszu", "Rozkazy"],
		["s", "Stop (z Shift: utrzymaj pozycję)", "Rozkazy"],
		["f", "Zaznacz całą armię", "Rozkazy"],
		["r", "Zaznacz roboty", "Rozkazy"],
		["z", "Bezczynne roboty", "Rozkazy"],
		["j", "Ostatni alarm", "Rozkazy"],
		["h", "Kamera na centrum dowodzenia", "Kamera"],
		["home", "Cała mapa", "Kamera"],
		["arrowup", "Kamera w górę", "Kamera"],
		["arrowdown", "Kamera w dół", "Kamera"],
		["arrowleft", "Kamera w lewo", "Kamera"],
		["arrowright", "Kamera w prawo", "Kamera"],
		[",", "Obrót kamery 3D w lewo", "Kamera"],
		[".", "Obrót kamery 3D w prawo", "Kamera"],
		["pageup", "Pochylenie kamery 3D w górę", "Kamera"],
		["pagedown", "Pochylenie kamery 3D w dół", "Kamera"],
		["/", "Kamera od południa", "Kamera"],
		[" ", "Pauza", "Gra"],
		["m", "Dźwięk", "Gra"],
	].map(([key, label, group]) => ({ key, label, group }));
	const DEFAULTS = new Set(ACTIONS.map((a) => a.key));
	// Keys never taken: the menu, the console of the game, the groups 1–9 and the modifiers.
	const RESERVED = new Set(["escape", "enter", "tab", "f2", "f11", "f12", "shift", "control", "alt", "meta", "capslock", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
	const NAMES = { " ": "Spacja", arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→", pageup: "PgUp", pagedown: "PgDn", home: "Home", end: "End", insert: "Ins", delete: "Del", backspace: "Backspace" };
	const keyName = (k) => NAMES[k] || (k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1));

	// autoPause: a battle holds when the window loses focus; longToasts: messages stay twice as long (0.175.3).
	let state = { scale: 1, palette: "default", keys: {}, autoPause: true, longToasts: false };
	try {
		const saved = JSON.parse(root.localStorage?.getItem(KEY) || "{}");
		if (Number.isFinite(saved.scale)) state.scale = Math.min(1.5, Math.max(0.8, saved.scale));
		if (saved.palette === "cvd") state.palette = "cvd";
		if (saved.autoPause === false) state.autoPause = false;
		if (saved.longToasts === true) state.longToasts = true;
		if (saved.keys && typeof saved.keys === "object")
			for (const [action, key] of Object.entries(saved.keys)) if (DEFAULTS.has(action) && typeof key === "string" && !RESERVED.has(key)) state.keys[action] = key;
	} catch {}
	const save = () => {
		try {
			root.localStorage?.setItem(KEY, JSON.stringify(state));
		} catch {}
	};

	// ---- keys
	// physical → default key of the action bound to it; a default key bound elsewhere → nothing.
	let physical = new Map();
	function rebuild() {
		physical = new Map();
		for (const a of ACTIONS) {
			const k = state.keys[a.key];
			if (k && k !== a.key) physical.set(k, a.key);
		}
		for (const a of ACTIONS) if (state.keys[a.key] && state.keys[a.key] !== a.key && !physical.has(a.key)) physical.set(a.key, null);
	}
	rebuild();
	const boundKey = (action) => state.keys[action] || action;
	let capture = null;
	const typing = (t) => !!t?.closest?.("input, textarea, select, [contenteditable]");
	function translate(e) {
		if (capture && e.type === "keydown") {
			e.preventDefault();
			e.stopImmediatePropagation();
			const k = e.key.toLowerCase();
			if (k === "escape") capture(null);
			else if (!["shift", "control", "alt", "meta"].includes(k)) capture(k);
			return;
		}
		if (!physical.size || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
		const k = e.key.toLowerCase();
		if (!physical.has(k)) return;
		const to = physical.get(k);
		// The game reads e.key (lower-cased) and keeps the held keys in a set: it gets the action's default key.
		Object.defineProperty(e, "key", { value: to === null ? "Unidentified" : to === " " ? " " : e.shiftKey ? to.toUpperCase() : to });
	}
	if (typeof root.addEventListener === "function") {
		root.addEventListener("keydown", translate, true);
		root.addEventListener("keyup", translate, true);
	}

	// ---- labels of the keys on the screen
	const SHOWN = new WeakMap();
	function relabel(node) {
		if (!physical.size) return;
		const kbds = node.nodeType === 1 ? [...(node.matches?.("kbd") ? [node] : []), ...node.querySelectorAll("kbd")] : [];
		for (const el of kbds) {
			if (el.closest("[data-access-skip]")) continue;
			const text = el.textContent.trim(),
				lower = text.toLowerCase();
			if (SHOWN.get(el) === text) continue;
			if (DEFAULTS.has(lower) && state.keys[lower] && state.keys[lower] !== lower) {
				const shown = keyName(state.keys[lower]);
				SHOWN.set(el, shown);
				el.textContent = shown;
			}
		}
	}
	const bracket = (text) => text.replace(/\[([A-Za-z])\]/g, (m, k) => (state.keys[k.toLowerCase()] && state.keys[k.toLowerCase()] !== k.toLowerCase() ? `[${keyName(state.keys[k.toLowerCase()])}]` : m));
	// Each text is relabelled once: a swap (Q ↔ Z) would otherwise turn "[Z]" to "[Q]" and back for ever.
	const relabelled = new WeakMap();
	function textLabel(t) {
		if (relabelled.get(t) === t.data) return;
		const v = bracket(t.data);
		relabelled.set(t, v);
		if (v !== t.data) t.data = v;
	}
	function watchLabels() {
		if (typeof MutationObserver === "undefined") return;
		const pass = (n) => {
			if (!physical.size) return;
			if (n.nodeType === 3) textLabel(n);
			else if (n.nodeType === 1) {
				relabel(n);
				const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
				for (let t = w.nextNode(); t; t = w.nextNode()) textLabel(t);
				for (const el of [n, ...n.querySelectorAll("[title]")]) {
					const v = el.getAttribute?.("title");
					if (v && relabelled.get(el) !== v) {
						const to = bracket(v);
						relabelled.set(el, to);
						if (to !== v) el.setAttribute("title", to);
					}
				}
			}
		};
		pass(document.body);
		new MutationObserver((list) => {
			for (const m of list) {
				if (m.type === "characterData") pass(m.target);
				else for (const n of m.addedNodes) pass(n);
			}
		}).observe(document.body, { subtree: true, childList: true, characterData: true });
	}

	// ---- size of the interface
	function applyScale() {
		if (typeof document === "undefined") return;
		document.documentElement.style.setProperty("--ui-scale", String(state.scale));
		// The full-width bars only as large as the window's width allows (their content needs about 960 px at 100%).
		document.documentElement.style.setProperty("--ui-scale-bar", String(Math.max(0.8, Math.min(state.scale, (root.innerWidth || 1280) / 960))));
		// The page's own marks of the sides (the map legend) follow the palette (style.css .palette-cvd).
		document.documentElement.classList.toggle("palette-cvd", state.palette === "cvd");
	}

	// ---- palette
	const CVD = { you: "#56b4e9", ally: "#3fc59a", foes: ["#e69f00", "#f0e442", "#d55e00", "#ff9fd0"], neutral: "#cc79a7" };
	function teamColor(game, team) {
		if (state.palette !== "cvd") return null;
		const me = game.viewer ?? game.humans?.[0] ?? 0;
		if (team === me) return CVD.you;
		if (team === 2 && !game.players?.[2]) return CVD.neutral;
		if (game.allied?.(me, team)) return CVD.ally;
		const foes = [0, 1, 2, 3, 4, 5].filter((t) => t !== me && !(t === 2 && !game.players?.[2]) && !game.allied?.(me, t));
		return CVD.foes[Math.max(0, foes.indexOf(team)) % CVD.foes.length];
	}
	// The colour kept on each unit and building (its tint) follows the palette, also in a loaded battle.
	function retint(game) {
		if (!game?.entities || typeof game.colorFor !== "function") return;
		for (const e of game.entities) if (e.tint) e.tint = game.colorFor(e.team);
	}

	// ---- the settings (menu.js: Ustawienia → Dostępność)
	function settingsHtml() {
		const groups = [...new Set(ACTIONS.map((a) => a.group))];
		return `<h2>Dostępność</h2><label class="menu-setting">Skala interfejsu <output id="access-scale-value">${Math.round(state.scale * 100)}%</output><input type="range" id="access-scale" min="80" max="150" step="10" value="${Math.round(state.scale * 100)}" aria-label="Skala interfejsu"></label><div class="access-scale-actions"><button type="button" id="access-scale-apply" class="net-small" disabled>Zastosuj</button><span id="access-scale-confirm" hidden><span id="access-scale-ask"></span> <button type="button" id="access-scale-keep" class="net-small">Zachowaj</button> <button type="button" id="access-scale-undo" class="net-small">Cofnij</button></span></div><p class="menu-note">Pasek u góry, panel boczny, pasek poleceń, menu i raporty; plansza bez zmian. Nowa skala wraca do poprzedniej po 15 s, jeśli jej nie zachowasz.</p><label class="menu-setting"><input type="checkbox" id="access-autopause" ${state.autoPause ? "checked" : ""}> Wstrzymuj grę, gdy okno traci fokus</label><p class="menu-note">Bitwa z komputerem staje, gdy przełączysz się do innego okna lub karty; wznawiasz ją sam (Spacja lub „Wznów” na planszy). Gra sieciowa nie staje.</p><label class="menu-setting"><input type="checkbox" id="access-long-toasts" ${state.longToasts ? "checked" : ""}> Dłuższe wyświetlanie komunikatów (×2)</label><label class="menu-setting"><input type="checkbox" id="access-palette" ${state.palette === "cvd" ? "checked" : ""}> Paleta dla daltonistów</label><p class="menu-note">Kolory stron według relacji: Ty — błękit, sojusznicy — niebieskozielony, przeciwnicy — pomarańcz, żółć i cynober, strona neutralna — fiolet.</p><div class="access-keys" id="access-keys">${groups
			.map(
				(g) =>
					`<p class="access-group">${g}</p>${ACTIONS.filter((a) => a.group === g)
						.map((a) => `<label class="menu-setting access-key"><span>${a.label}</span><button type="button" class="net-small" data-action="${a.key}" aria-label="${a.label}: zmień klawisz"><kbd data-access-skip>${keyName(boundKey(a.key))}</kbd></button></label>`)
						.join("")}`,
			)
			.join("")}</div><p id="access-status" class="menu-note" role="status">Kliknij klawisz akcji i naciśnij nowy (Esc — anuluj). Zajęty klawisz zamienia się miejscami z poprzednią akcją.</p><button type="button" id="access-reset" class="menu-action"><span>Przywróć domyślne klawisze</span><span aria-hidden="true">↺</span></button>`;
	}
	// A size applied and not yet kept: { before, left, timer } (it lives across redraws of the settings).
	let scalePending = null,
		showScale = () => {};
	const T = (text) => (root.I18N ? root.I18N.t(text) : text);
	function settleScale(keep) {
		if (!scalePending) return;
		clearInterval(scalePending.timer);
		if (!keep) {
			state.scale = scalePending.before;
			applyScale();
		}
		scalePending = null;
		save();
		const slider = document.getElementById("access-scale");
		if (slider) {
			slider.value = String(Math.round(state.scale * 100));
			document.getElementById("access-scale-value").textContent = slider.value + "%";
			document.getElementById("access-scale-apply").disabled = true;
		}
		showScale();
	}
	function mount(rootEl, onChange) {
		const $ = (id) => rootEl.querySelector("#" + id);
		const scale = $("access-scale");
		if (!scale) return;
		// The size: chosen on the slider (shown only), applied with a button, then kept — or back to the old one after
		// 15 s (0.175.2: the interface changing under the pointer while dragging was awkward, and a size too large
		// could push the controls out of reach). The countdown outlives a redraw of the settings.
		const apply = $("access-scale-apply");
		const show = () => {
			const confirm = document.getElementById("access-scale-confirm"),
				applyBtn = document.getElementById("access-scale-apply");
			if (!confirm || !applyBtn) return;
			confirm.hidden = !scalePending;
			applyBtn.hidden = !!scalePending;
			if (scalePending) document.getElementById("access-scale-ask").textContent = `${T("Zachować skalę")} ${Math.round(state.scale * 100)}%? (${scalePending.left} s)`;
		};
		scale.oninput = () => {
			$("access-scale-value").textContent = scale.value + "%";
			apply.disabled = Number(scale.value) / 100 === state.scale || !!scalePending;
		};
		apply.onclick = () => {
			scalePending = { before: state.scale, left: 15, timer: null };
			state.scale = Number(scale.value) / 100;
			applyScale();
			scalePending.timer = setInterval(() => {
				if (--scalePending.left <= 0) settleScale(false);
				else show();
			}, 1000);
			show();
			document.getElementById("access-scale-keep")?.focus();
		};
		$("access-scale-keep").onclick = () => settleScale(true);
		$("access-scale-undo").onclick = () => settleScale(false);
		showScale = show;
		show();
		$("access-autopause").onchange = (e) => {
			state.autoPause = e.target.checked;
			save();
		};
		$("access-long-toasts").onchange = (e) => {
			state.longToasts = e.target.checked;
			save();
		};
		$("access-palette").onchange = (e) => {
			state.palette = e.target.checked ? "cvd" : "default";
			save();
			applyScale();
			onChange?.("palette");
		};
		const status = $("access-status");
		for (const b of rootEl.querySelectorAll("[data-action]"))
			b.onclick = () => {
				const action = b.dataset.action;
				status.textContent = root.I18N ? root.I18N.t("Naciśnij nowy klawisz (Esc — anuluj)…") : "Naciśnij nowy klawisz (Esc — anuluj)…";
				b.classList.add("armed");
				capture = (k) => {
					capture = null;
					b.classList.remove("armed");
					if (!k) return (status.textContent = root.I18N ? root.I18N.t("Bez zmian.") : "Bez zmian.");
					if (RESERVED.has(k)) return (status.textContent = (root.I18N ? root.I18N.t("Tego klawisza nie można przypisać:") : "Tego klawisza nie można przypisać:") + " " + keyName(k));
					// The key's present owner gets this action's old key (a swap).
					const owner = ACTIONS.find((a) => boundKey(a.key) === k && a.key !== action);
					if (owner) state.keys[owner.key] = boundKey(action);
					state.keys[action] = k;
					for (const a of ACTIONS) if (state.keys[a.key] === a.key) delete state.keys[a.key];
					rebuild();
					save();
					onChange?.("keys");
				};
			};
		$("access-reset").onclick = () => {
			state.keys = {};
			rebuild();
			save();
			onChange?.("keys");
		};
	}

	const api = {
		ACTIONS,
		get scale() {
			return state.scale;
		},
		get palette() {
			return state.palette;
		},
		get autoPause() {
			return state.autoPause;
		},
		// How much longer the messages stay (app.js toast).
		get toastFactor() {
			return state.longToasts ? 2 : 1;
		},
		keyFor: (action) => boundKey(action),
		keyName,
		teamColor,
		retint,
		settingsHtml,
		mount,
		// Tests: settings as given, without the device's.
		configure(next) {
			state = { scale: 1, palette: "default", keys: {}, autoPause: true, longToasts: false, ...next };
			rebuild();
		},
		translate,
	};
	root.Access = api;
	if (typeof module !== "undefined" && module.exports) module.exports = api;
	if (typeof document !== "undefined") {
		applyScale();
		root.addEventListener?.("resize", applyScale);
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watchLabels, { once: true });
		else watchLabels();
	}
})(typeof window !== "undefined" ? window : globalThis);
