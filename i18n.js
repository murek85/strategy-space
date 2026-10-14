/* I6 (0.175): the game in Polish or English. The code and its texts stay Polish; what reaches the screen is translated
   on the way out by a dictionary of Polish pieces (lang/en.js, made with tools/i18n-extract.js):
   - the page: every text node and the attributes people read (title, aria-label, placeholder, alt), as they are put
     in or changed (a MutationObserver) — not the fields one types in, the chats, or what is marked data-i18n-skip;
   - the canvas: fillText, strokeText and measureText get the translated text (the films, the labels of the board, the
     minimap), so the measure matches what is drawn;
   - a text is looked up whole first; else the fixed pieces of a composed one (the parts of a template around its
     numbers and names) are replaced inside it, whole words only, the longest first. Results are cached.
   The choice is kept on this device (pogranicze-lang-v1); without one: the browser's language (Polish → pl, else
   English). Changing it reloads the page (the 3D board's labels and the films are drawn once). */
(function (root) {
	"use strict";
	const KEY = "pogranicze-lang-v1",
		LANGS = { pl: "Polski", en: "English" };
	const dictionaries = (root.I18N_DICTIONARIES ||= {});
	let lang = "pl";
	try {
		const saved = root.localStorage?.getItem(KEY);
		lang = LANGS[saved] ? saved : /^pl\b/i.test(root.navigator?.language || "pl") ? "pl" : "en";
	} catch {}

	const norm = (s) => s.replace(/\s+/g, " ").trim();
	let compiled = null;
	// The dictionary of the language: pieces by their normalised Polish, and one pattern of all of them (longest first,
	// bounded by non-letters so a short piece never eats into a word).
	function dictionary() {
		if (compiled && compiled.lang === lang) return compiled;
		const raw = dictionaries[lang] || {},
			map = new Map();
		for (const [pl, tr] of Object.entries(raw)) if (tr && tr !== pl) map.set(norm(pl), tr);
		const keys = [...map.keys()].filter((k) => k.length >= 3).sort((a, b) => b.length - a.length);
		const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		// Whole words: a piece starting with a letter is not taken from the middle of a word, one ending with a letter
		// not from the start of a longer one; a piece ending with "(" or ":" runs on into anything.
		const bounded = (k) => (/^[\p{L}\p{N}]/u.test(k) ? "(?<![\\p{L}\\p{N}])" : "") + escape(k) + (/\p{L}$/u.test(k) ? "(?![\\p{L}])" : "");
		let pattern = null;
		try {
			pattern = keys.length ? new RegExp(keys.map(bounded).join("|"), "giu") : null;
		} catch {}
		// The same pieces in any letter case: the code lowers or raises some texts ("mapa " + size.toLowerCase()).
		const lower = new Map();
		for (const [k, v] of map) if (!lower.has(k.toLowerCase())) lower.set(k.toLowerCase(), v);
		compiled = { lang, map, lower, pattern, cache: new Map() };
		return compiled;
	}
	// An English text in the letter case of the Polish one it stands for: ALL CAPS, or a lower-case start.
	function caseLike(source, tr) {
		if (tr == null) return null;
		if (source === source.toUpperCase() && source !== source.toLowerCase()) return tr.toUpperCase();
		const a = source[0];
		if (a && a === a.toLowerCase() && a !== a.toUpperCase() && !/^[A-Z]{2}/.test(tr)) return tr[0].toLowerCase() + tr.slice(1);
		return tr;
	}
	function t(text) {
		if (lang === "pl" || typeof text !== "string" || !/\p{L}/u.test(text)) return text;
		const D = dictionary();
		const hit = D.cache.get(text);
		if (hit !== undefined) return hit;
		const core = norm(text);
		let out;
		const whole = D.map.get(core) ?? caseLike(core, D.lower.get(core.toLowerCase()));
		if (whole != null) {
			const lead = text.match(/^\s*/)[0],
				trail = text.match(/\s*$/)[0];
			out = lead + whole + trail;
		} else if (D.pattern) {
			// Pieces inside a composed text. Whitespace inside is kept as it was where nothing matched.
			const spaced = text.replace(/\s+/g, " ");
			out = spaced.replace(D.pattern, (m) => D.map.get(m) ?? caseLike(m, D.lower.get(m.toLowerCase())) ?? m);
			if (out === spaced) out = text;
		} else out = text;
		// Rules for the words too short to be pieces, between numbers ("3 z 12" → "3 of 12": lang/en.js).
		for (const [rx, to] of root.I18N_RULES?.[lang] || []) out = out.replace(rx, to);
		if (D.cache.size > 20000) D.cache.clear();
		D.cache.set(text, out);
		return out;
	}

	// ---- the page
	const ATTRS = ["title", "aria-label", "placeholder", "alt"];
	const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "NOSCRIPT"]);
	const written = new WeakMap();
	const skipped = (el) => !el || SKIP_TAGS.has(el.tagName) || !!el.closest?.("[data-i18n-skip], [contenteditable]");
	function textNode(node) {
		const v = node.data;
		if (!v || written.get(node) === v || !/\p{L}/u.test(v) || skipped(node.parentElement)) return;
		const tr = t(v);
		written.set(node, tr);
		if (tr !== v) node.data = tr;
	}
	function attributes(el) {
		if (skipped(el) && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
		for (const a of ATTRS) {
			const v = el.getAttribute?.(a);
			if (!v) continue;
			const tr = t(v);
			if (tr !== v) el.setAttribute(a, tr);
		}
		if (el.tagName === "INPUT" && (el.type === "button" || el.type === "submit") && el.value) el.value = t(el.value);
	}
	function tree(root0) {
		if (lang === "pl" || !root0) return;
		if (root0.nodeType === 3) return textNode(root0);
		if (root0.nodeType !== 1 && root0.nodeType !== 9 && root0.nodeType !== 11) return;
		if (root0.nodeType === 1) {
			if (skipped(root0) && !["INPUT", "TEXTAREA"].includes(root0.tagName)) return;
			attributes(root0);
		}
		const walker = document.createTreeWalker(root0, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
		for (let n = walker.nextNode(); n; n = walker.nextNode()) {
			if (n.nodeType === 3) textNode(n);
			else attributes(n);
		}
	}
	function watch() {
		if (lang === "pl" || typeof MutationObserver === "undefined") return;
		tree(document.body);
		if (document.title) document.title = t(document.title);
		new MutationObserver((list) => {
			for (const m of list) {
				if (m.type === "characterData") textNode(m.target);
				else if (m.type === "attributes") attributes(m.target);
				else for (const n of m.addedNodes) tree(n);
			}
		}).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS, "value"] });
	}

	// ---- the canvas
	function patchCanvas(proto) {
		if (!proto || proto.__i18n) return;
		proto.__i18n = true;
		for (const name of ["fillText", "strokeText", "measureText"]) {
			const original = proto[name];
			if (typeof original !== "function") continue;
			proto[name] = function (text, ...rest) {
				return original.call(this, typeof text === "string" ? t(text) : text, ...rest);
			};
		}
	}

	const api = {
		LANGS,
		get lang() {
			return lang;
		},
		t,
		tree,
		// Another language: kept, and the page loads again in it.
		set(next) {
			if (!LANGS[next] || next === lang) return false;
			try {
				root.localStorage?.setItem(KEY, next);
			} catch {}
			if (root.location) root.location.reload();
			return true;
		},
		// For the tests: the dictionary in use and a cleared cache.
		use(next) {
			lang = LANGS[next] ? next : lang;
			compiled = null;
		},
	};
	root.I18N = api;
	if (typeof module !== "undefined" && module.exports) module.exports = api;
	if (typeof document !== "undefined") {
		document.documentElement.lang = lang;
		if (lang !== "pl") {
			patchCanvas(root.CanvasRenderingContext2D?.prototype);
			patchCanvas(root.OffscreenCanvasRenderingContext2D?.prototype);
			if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch, { once: true });
			else watch();
		}
	}
})(typeof window !== "undefined" ? window : globalThis);
