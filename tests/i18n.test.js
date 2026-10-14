// I6 (0.175): Polish or English. The code stays Polish; i18n.js translates what reaches the screen by the dictionary of
// lang/en.js. Every piece of text in the code must have its English (tools/i18n-extract.js finds them: a new text
// without one fails here — run `node tools/i18n-extract.js` to list them).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const x = require("../tools/i18n-extract.js");

const en = x.load("en");

test("every piece of text on the screen has its English", () => {
	const found = x.extract(),
		missing = [...found].filter(([p]) => !(p in en));
	assert.ok(found.size > 2500, `pieces found: ${found.size}`);
	assert.deepEqual(missing.slice(0, 20).map(([p, at]) => `${at} ${p}`), [], `${missing.length} without English — node tools/i18n-extract.js`);
});

test("the English keeps the edges a composed text is glued at", () => {
	const bad = [];
	for (const [pl, tr] of Object.entries(en)) {
		if (typeof tr !== "string" || !tr.trim()) bad.push(`empty: ${pl}`);
		// A piece glued to a number or a name keeps its colon, opening bracket or dash at the end, and its leading
		// punctuation at the start.
		const end = (s) => (/[:(\-—–·/]$/.test(s.trim()) ? s.trim().slice(-1) : "");
		if (end(pl) && end(pl) !== end(tr) && !(end(pl) === "-" && /[—–]$/.test(tr.trim()))) bad.push(`end ${end(pl)}: ${pl} → ${tr}`);
		// (A leading comma or full stop may go: English often glues without it — ", który przyśle" → " sent by".)
		const start = (s) => (/^[·—–(]/.test(s.trim()) ? s.trim()[0] : "");
		if (start(pl) && start(pl) !== start(tr)) bad.push(`start ${start(pl)}: ${pl} → ${tr}`);
	}
	assert.deepEqual(bad.slice(0, 15), [], `${bad.length} pieces`);
});

test("the translation layer: whole texts, pieces of composed ones, whole words only, Polish untouched", () => {
	global.I18N_DICTIONARIES = { en: { "Wznów": "Resume", "jednostek zmierza w stronę celu (": "units heading for the target (", "Gaz": "Gas", "Atak": "Attack", "Średnia": "Medium" } };
	delete require.cache[require.resolve("../i18n.js")];
	const I18N = require("../i18n.js");
	I18N.use("pl");
	assert.equal(I18N.t("Wznów"), "Wznów", "Polish: as it is");
	I18N.use("en");
	assert.equal(I18N.t("Wznów"), "Resume");
	assert.equal(I18N.t("  Wznów "), "  Resume ", "the spaces around are kept");
	assert.equal(I18N.t("Atak 3 — 12 jednostek zmierza w stronę celu (centrum)."), "Attack 3 — 12 units heading for the target (centrum).");
	assert.equal(I18N.t("Gazociąg"), "Gazociąg", "never inside a word");
	assert.equal(I18N.t("1234"), "1234");
	// Any letter case: the code lowers or raises some texts.
	assert.equal(I18N.t("mapa średnia"), "mapa medium");
	assert.equal(I18N.t("GAZ"), "GAS");
	assert.equal(I18N.t("średnia"), "medium");
	delete global.I18N_DICTIONARIES;
});

test("the game loads the translation before anything draws, and offers the choice", () => {
	const fs = require("node:fs"),
		path = require("node:path"),
		ROOT = path.join(__dirname, ".."),
		html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"),
		scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
	assert.equal(scripts[0], "i18n.js");
	assert.equal(scripts[1], "lang/en.js");
	const menu = fs.readFileSync(path.join(ROOT, "menu.js"), "utf8");
	assert.match(menu, /id="app-language"/, "the language in the settings");
	assert.match(menu, /id="menu-lang"/, "and at the foot of the menu");
	assert.match(menu, /The changelog and the development plans are kept in Polish/);
});
