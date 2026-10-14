// I6 (0.175.1): accessibility — keys of one's own, the interface's size, the palette for colour-blind players.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Access = require("../accessibility.js");
const RTS = require("../engine.js");

// A key event as the game sees it after the capture listener.
const press = (key, extra = {}) => {
	const e = { type: "keydown", key, target: null, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault() {}, stopImmediatePropagation() {}, ...extra };
	Access.translate(e);
	return e.key;
};

test("a rebound key reaches the game as the action's default key; the default one goes quiet", () => {
	Access.configure({ keys: { q: "z" } });
	assert.equal(press("z"), "q", "Z now trains infantry");
	assert.equal(press("q"), "Unidentified", "Q, given away, does nothing");
	assert.equal(press("Z", { shiftKey: true }), "Q", "a Shift combination follows its key");
	assert.equal(press("w"), "w", "the other keys as they are");
	assert.equal(press("z", { ctrlKey: true }), "z", "Ctrl shortcuts untouched");
	const field = { closest: (sel) => (/input/.test(sel) ? {} : null) };
	assert.equal(press("z", { target: field }), "z", "not while typing");
	assert.equal(Access.keyFor("q"), "z");
	// Two actions swapped: each reaches its own.
	Access.configure({ keys: { a: "s", s: "a" } });
	assert.equal(press("s"), "a");
	assert.equal(press("a"), "s");
	Access.configure({});
	assert.equal(press("q"), "q", "the defaults");
});

test("every action's default key is one the game handles, none is reserved", () => {
	const fs = require("node:fs"),
		path = require("node:path"),
		controls = fs.readFileSync(path.join(__dirname, "..", "app-controls.js"), "utf8") + fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
	for (const a of Access.ACTIONS) {
		const k = a.key === " " ? '" "' : JSON.stringify(a.key);
		assert.ok(controls.includes(`key === ${k}`) || controls.includes(`keys.has(${k})`) || controls.includes(`=== ${k} &&`) || controls.includes(`"${a.key}",`), `${a.label}: ${a.key}`);
		assert.ok(!/^[0-9]$|^escape$|^enter$/.test(a.key));
	}
	assert.equal(new Set(Access.ACTIONS.map((a) => a.key)).size, Access.ACTIONS.length, "one action per key");
});

test("the colour-blind palette colours the sides by relation; off, the usual colours", () => {
	const g = new RTS.Game(1, "horizon");
	g.configureSkirmish({ players: 3 });
	const usual = [0, 1, 3].map((t) => g.colorFor(t));
	Access.configure({ palette: "cvd" });
	try {
		assert.equal(g.colorFor(g.viewer ?? 0), "#56b4e9", "you: sky blue");
		const foes = [1, 3].map((t) => g.colorFor(t));
		assert.ok(foes.every((c) => ["#e69f00", "#f0e442", "#d55e00", "#ff9fd0"].includes(c)) && foes[0] !== foes[1], `two different enemy colours: ${foes}`);
		assert.ok(![...foes, g.colorFor(0)].some((c) => /^#(f07d78|b0efd0)$/.test(c)), "no red or pale green");
		// Units and buildings take it at once.
		g.entities.find((e) => e.team === 1 && e.tint);
		Access.retint(g);
		for (const e of g.entities.filter((e) => e.tint)) assert.equal(e.tint, g.colorFor(e.team));
	} finally {
		Access.configure({});
	}
	assert.deepEqual([0, 1, 3].map((t) => g.colorFor(t)), usual);
});

test("the game loads accessibility first and offers it in the settings", () => {
	const fs = require("node:fs"),
		path = require("node:path"),
		ROOT = path.join(__dirname, ".."),
		scripts = [...fs.readFileSync(path.join(ROOT, "index.html"), "utf8").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
	assert.ok(scripts.indexOf("accessibility.js") >= 0 && scripts.indexOf("accessibility.js") < scripts.indexOf("engine.js"));
	assert.match(Access.settingsHtml(), /id="access-scale"[\s\S]*id="access-palette"[\s\S]*data-action="q"[\s\S]*id="access-reset"/);
	assert.match(fs.readFileSync(path.join(ROOT, "menu.js"), "utf8"), /Access\.settingsHtml\(\)/);
	assert.match(fs.readFileSync(path.join(ROOT, "style.css"), "utf8"), /zoom: var\(--ui-scale, 1\)/);
});

test("0.175.2: the size is applied with a button and kept or undone", () => {
	const fs = require("node:fs"),
		path = require("node:path"),
		ROOT = path.join(__dirname, ".."),
		html = Access.settingsHtml();
	assert.match(html, /id="access-scale-apply"[^>]*disabled/, "nothing applied while the slider moves");
	assert.match(html, /id="access-scale-keep"[\s\S]*id="access-scale-undo"/);
	const src = fs.readFileSync(path.join(ROOT, "accessibility.js"), "utf8");
	assert.match(src, /scale\.oninput = \(\) => \{\s*\$\("access-scale-value"\)\.textContent/, "the slider only shows its value");
	assert.match(src, /if \(--scalePending\.left <= 0\) settleScale\(false\)/, "back to the old size when not kept");
	// (The board built again behind a loading screen when the renderer changed went with the other boards, 0.176.)
});

test("0.175.3: a pause says why and stays on the board; pausing on focus loss and longer messages are settings", () => {
	Access.configure({});
	assert.equal(Access.autoPause, true, "on by default");
	assert.equal(Access.toastFactor, 1);
	Access.configure({ autoPause: false, longToasts: true });
	assert.equal(Access.autoPause, false);
	assert.equal(Access.toastFactor, 2);
	Access.configure({});
	assert.match(Access.settingsHtml(), /id="access-autopause" checked[\s\S]*id="access-long-toasts"/);
	const app = require("./app-source.js")();
	assert.match(app, /togglePause\("blur"\)/, "the focus loss gives its reason");
	assert.match(app, /Access\.autoPause\)+ togglePause\("blur"\)/, "and asks the setting first");
	assert.match(app, /function togglePause\(reason = "player"\)[\s\S]{0,500}pauseInfo = paused \? \{ reason/);
	assert.match(app, /Gra wstrzymana, bo okno straciło fokus/);
	assert.match(app, /updatePauseBar\(\);[\s\S]{0,40}network\.renderChat\(\)/, "kept up to date with the HUD");
	assert.match(app, /toastTimer \*= Access\.toastFactor/);
});

test("0.175.5: a battle’s loading screen waits for the 3D board", () => {
	const app = require("./app-source.js")();
	assert.match(app, /function boardReady\(screen\)[\s\S]{0,500}Promise\.resolve\(applyRenderer\(\)\)[\s\S]{0,120}\.finally\(done\)/, "the screen goes after the board is up");
	assert.match(app, /restart\(missionId, scenario, prepared\);\s*\}\s*finally\s*\{\s*boardReady\(screen\);/, "a new battle");
	assert.match(app, /screen = LoadingScreen\.show\(\{ eyebrow: "WCZYTANY ZAPIS[\s\S]{0,300}boardReady\(screen\);/, "a loaded save");
	assert.match(app, /app\.boardScreen\?\.\(again \? "REWANŻ" : "GRA WIELOOSOBOWA"\)/, "a network battle and its rematch");
	assert.match(app, /setTimeout\(done, 15000\)/, "never stuck behind the screen");
	assert.match(app, /const warm = \(\) => setTimeout\(\(\) => load3D\(\)/, "the 3D code loads while the menu is up");
});
