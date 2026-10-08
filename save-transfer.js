/* Saves to a file and back (G3, 0.151): everything the game keeps on this device — battle saves and slots, campaign
   progress, records, settings — exported as one JSON file and imported on another device or after reinstalling.
   Only the game's own keys (pogranicze-…, hud.…) are read or written; an import replaces those keys and leaves
   anything else in storage alone. Pure (works on a Storage-like object); used by menu.js (Ustawienia → Aplikacja
   i zapisy), in the browser and in the desktop app alike. Shared by browser and tests. */
(function (root) {
	const FORMAT = "pogranicze-zapisy",
		VERSION = 1,
		KEY = /^(pogranicze-|hud\.)[\w.-]{1,80}$/,
		MAX_VALUE = 8 * 1024 * 1024;

	function keysOf(storage) {
		const keys = [];
		for (let i = 0; i < storage.length; i++) {
			const k = storage.key(i);
			if (KEY.test(k)) keys.push(k);
		}
		return keys.sort();
	}

	// The file's content: { format, version, game, exported, data: { key: value } }.
	function exportSaves(storage, gameVersion = "", now = new Date()) {
		const data = {};
		for (const k of keysOf(storage)) data[k] = storage.getItem(k);
		return JSON.stringify({ format: FORMAT, version: VERSION, game: gameVersion, exported: now.toISOString(), data }, null, 1);
	}

	// Checks a file before anything is written: { ok, keys, error }.
	function readSaves(text) {
		let file;
		try {
			file = JSON.parse(text);
		} catch {
			return { ok: false, error: "To nie jest plik zapisów tej gry (uszkodzony JSON)." };
		}
		if (!file || file.format !== FORMAT || typeof file.data !== "object" || !file.data) return { ok: false, error: "To nie jest plik zapisów tej gry." };
		if (file.version > VERSION) return { ok: false, error: "Plik pochodzi z nowszej wersji gry." };
		const entries = Object.entries(file.data);
		if (!entries.length) return { ok: false, error: "Plik nie zawiera zapisów." };
		for (const [k, v] of entries) if (!KEY.test(k) || typeof v !== "string" || v.length > MAX_VALUE) return { ok: false, error: "Plik zawiera nieprawidłowe dane." };
		return { ok: true, keys: entries.map(([k]) => k).sort(), data: file.data, game: file.game || "", exported: file.exported || "" };
	}

	// Replaces the game's keys with the file's (the ones missing from the file are removed). Returns readSaves' result.
	function importSaves(storage, text) {
		const r = readSaves(text);
		if (!r.ok) return r;
		for (const k of keysOf(storage)) if (!(k in r.data)) storage.removeItem(k);
		for (const [k, v] of Object.entries(r.data)) storage.setItem(k, v);
		return r;
	}

	const api = { FORMAT, VERSION, keysOf, exportSaves, readSaves, importSaves };
	if (typeof module !== "undefined" && module.exports) module.exports = api;
	else root.SaveTransfer = api;
})(typeof window !== "undefined" ? window : globalThis);
