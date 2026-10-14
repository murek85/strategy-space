/* I6 (0.175): the texts of the game for the translation layer (i18n.js). The code stays in Polish; what reaches
   the screen is translated on the way out, by a dictionary of the Polish pieces — a whole string, or the fixed parts
   of a composed one (template literals, concatenations), split at HTML tags the way the page splits them into text
   nodes and attributes (title, aria-label, placeholder, alt).
   node tools/i18n-extract.js            — lists the pieces with no English yet (lang/en.js)
   node tools/i18n-extract.js --json F   — writes the missing ones to F ({ polish: "" }) for translating
   Used by tests/i18n.test.js. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const acorn = require("acorn");
const walk = require("acorn-walk");

const ROOT = path.join(__dirname, "..");
// Files that never reach the screen, or the changelog (kept in Polish, see i18n.js).
const SKIP = new Set(["i18n.js", "server.js", "cursor.js"]);

function sources() {
	const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
	const scripts = [...html.matchAll(/<script src="([^"?]+)"/g)].map((m) => m[1]).filter((s) => !s.startsWith("vendor/") && !s.startsWith("lang/") && !SKIP.has(s));
	const modules = fs.readdirSync(path.join(ROOT, "webgl3d")).filter((f) => f.endsWith(".js") && f !== "bundle-3d.js" && !f.startsWith("prototype")).map((f) => "webgl3d/" + f);
	return [...new Set([...scripts, ...modules, "lobby-server.js", "index.html"])];
}

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…" };
const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|#39|nbsp|mdash|ndash|hellip);/g, (m) => ENTITIES[m]);
const norm = (s) => decode(s).replace(/\s+/g, " ").trim();
// Single Polish words written in lower case, which the identifier rule below would drop ("gotowy", "wersja "):
// the ones on the screen. A new one goes here (tests/i18n.test.js cannot tell it from a key).
const WORDS = new Set("AKT GAZ MOC grupa mocy odblokowuje wymagane zapis bez brak budowa buduje czeka doktryna dostarczono eskortuje ewakuowano gaz gazu gospodarz gotowy gra graczy jednostek jednostka jednostki komputer kontra kryształów lodowy lub metalu moc nadciąga naprawia obiektów obrażenia odczyt patroluje porzucony pozostaje przeciwnik przekaźnik przeładunek pustynny roboty robotów rozpoznanie ruch sekund sojusznik spokojnie wczytywanie wersja wolne wolny wroga zamykanie zasięg zmierza zniszczone".split(" "));
// Text a person reads: letters, not an identifier, a class list, a path, a colour, CSS or a key.
function readable(s) {
	if (!s || s.length < 2 || !/\p{L}/u.test(s)) return false;
	if (WORDS.has(s)) return true;
	if (/^[a-z][A-Za-z0-9]*$/.test(s) && !/[ąćęłńóśźż]/.test(s)) return false; // identifier, key
	if (/^[a-z0-9]+(?:[-_:.][a-z0-9]+)+$/i.test(s)) return false; // css-class, file.js, a:b
	if (/^[a-z0-9-]+(?: [a-z0-9-]+)+$/.test(s) && !/[ąćęłńóśźż]/.test(s) && !/\b(i|w|z|na|do|nie|się|od|po|za|o)\b/.test(s)) return false; // class list
	if (/^#|^rgba?\(|^hsla?\(|^url\(|^data:|^https?:|^\.{0,2}\//.test(s)) return false;
	if (/^--[a-z][a-z0-9-]*$/.test(s)) return false; // a CSS custom property
	// Shader code (GLSL) and media types.
	if (/\b(?:uniform|varying|attribute|vec[234]|mat[34]|sampler2D|gl_\w+|float|int i)\b|#(?:include|ifdef|endif|define)\b|^[a-z]+\/[a-z+.-]+(?:;|$)/.test(s)) return false;
	if (s.includes(";") && !/[ąćęłńóśźż]/i.test(s) && /[=*]|\w\s*\(/.test(s)) return false;
	// (A semicolon is common in Polish prose; only a CSS declaration — "prop: value;" — is code.)
	if (/(?:^|;)\s*[a-z-]+\s*:\s*[^;]+;/i.test(s) && !/\s[a-ząćęłńóśźż]+\s[a-ząćęłńóśźż]+\s/i.test(s.split(";")[0])) return false;
	if (/[{}|]|=>|\$\{|="|^["'=]|["'=]$|^\.[a-z]|^\(?prefers-|^\(min-|^\(max-|^[a-z]+\(|^[A-Z][a-z]+(?:Left|Right|Up|Down)$/.test(s)) return false;
	if (/^[\d\s.,:%+\-×x/()]+[a-z]{0,3}$/i.test(s)) return false; // numbers and units
	if (/^(?:bold|italic|normal|\d+px|monospace|sans-serif|serif|Consolas|Arial|Segoe UI)\b/.test(s) && !/[ąćęłńóśźż]/.test(s)) return false; // fonts
	if (/^[A-Z][A-Z0-9_]+$/.test(s) && s.length < 4) return false; // short constants
	return true;
}
// The parts the interface cuts out of a long text: its first clause (a research card shows `desc.split(/[.;]/)[0]`,
// "Awans Przyczółka do Kolonii" of the whole description), and what follows "Name: " ("Doktryna: Ciężki ostrzał"
// shown as "Doktryna · Ciężki ostrzał").
function parts(s) {
	const out = [];
	const first = s.split(/[.;]/)[0].trim();
	if (first && first !== s && first.length > 3 && readable(first)) out.push(first);
	const colon = s.match(/^([^:]{2,40}):\s+(.{3,})$/);
	if (colon && readable(colon[2]) && !/^\d/.test(colon[2])) out.push(colon[2]);
	return out;
}
// The pieces a source string makes on the screen: text between tags, and the readable attributes.
function pieces(raw) {
	const out = [];
	if (!/[<>]/.test(raw)) {
		const s = norm(raw);
		if (readable(s)) out.push(s, ...parts(s));
		return out;
	}
	// Attributes, also one a template fragment leaves open (`aria-label="Podgląd planety ${name}"` gives "Podgląd planety").
	for (const m of raw.matchAll(/\b(?:title|aria-label|placeholder|alt|data-tip)="([^"]*)(?:"|$)/g)) {
		const s = norm(m[1]);
		if (readable(s)) out.push(s);
	}
	// A fragment may start or end inside a tag (`<span class="${…}">text`): cut what is a tag or its remains.
	const text = raw.replace(/<[^>]*>/g, "\u0000").replace(/^[^<\u0000]*>/, "\u0000").replace(/<[^>]*$/, "\u0000");
	for (const part of text.split("\u0000")) {
		const s = norm(part);
		if (readable(s) && !/\w+="/.test(s)) out.push(s);
	}
	return out;
}

function extract() {
	const found = new Map(); // piece -> first place
	for (const file of sources()) {
		const full = path.join(ROOT, file);
		if (!fs.existsSync(full)) continue;
		const src = fs.readFileSync(full, "utf8");
		const add = (raw, line) => {
			// The changelog ("Co nowego"): one literal per version, kept in Polish (i18n.js says so in English).
			if (/<h2>0\.\d/.test(raw)) return;
			for (const p of pieces(raw)) if (!found.has(p)) found.set(p, `${file}:${line}`);
		};
		if (file.endsWith(".html")) {
			const body = src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "");
			add(body, 1);
			continue;
		}
		let ast;
		try {
			ast = acorn.parse(src, { ecmaVersion: 2024, sourceType: /^\s*(import|export) /m.test(src) ? "module" : "script", locations: true, allowReturnOutsideFunction: true });
		} catch (e) {
			throw Error(`${file}: ${e.message}`);
		}
		walk.full(ast, (node) => {
			// Object keys and imports are code, not text.
			if (node.type === "Literal" && typeof node.value === "string") add(node.value, node.loc.start.line);
			else if (node.type === "TemplateElement") add(node.value.cooked ?? node.value.raw, node.loc.start.line);
		});
	}
	return found;
}

// Pieces that are Polish (diacritics or a Polish word): the ones that must have English.
const POLISH = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|\b(?:i|w|z|na|do|nie|się|jest|od|po|za|lub|oraz|dla|przy|przez|bez|gdy|już|Twoj\w*|Wróg|wróg\w*|Gracz\w*|gracz\w*|Zbuduj|Kliknij|Brak|Rozpocznij|Wróć|Ustawienia|Mapa|Wersja|Tryb|Poziom|Dowódc\w*|Piechota|Rakietowiec|Metal|Gaz|Moc|Koszary|Fabryka|Centrum|Przekaźnik\w*|Robot\w*|Jednostk\w*|Zapis\w*|Gra|Bitwa|Atak\w*|Menu)\b/;

function load(lang) {
	const file = path.join(ROOT, "lang", lang + ".js");
	if (!fs.existsSync(file)) return {};
	const ctx = { I18N_DICTIONARIES: {} };
	new Function("window", fs.readFileSync(file, "utf8"))(ctx);
	return ctx.I18N_DICTIONARIES[lang] || {};
}

module.exports = { extract, pieces, readable, norm, POLISH, load, sources };

if (require.main === module) {
	const found = extract(),
		en = load("en");
	const missing = [...found].filter(([p]) => !(p in en));
	const i = process.argv.indexOf("--json");
	if (i > 0) {
		fs.writeFileSync(process.argv[i + 1], JSON.stringify(Object.fromEntries(missing.map(([p, at]) => [p, ""])), null, 1));
		console.log(`${missing.length} brakujących tłumaczeń → ${process.argv[i + 1]}`);
	} else {
		for (const [p, at] of missing.slice(0, 200)) console.log(at.padEnd(30), p.slice(0, 110));
		console.log(`Fragmentów tekstu: ${found.size}, bez tłumaczenia: ${missing.length}`);
	}
}
