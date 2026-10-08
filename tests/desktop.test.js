// G3 (0.151): the desktop app — the app:// file mapping (electron/assets.js), saves to a file and back
// (save-transfer.js) and the packaging settings.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { resolveAsset, mimeOf } = require("../electron/assets");
const SaveTransfer = require("../save-transfer");
const ROOT = path.join(__dirname, "..");

test("app:// paths map onto the game folder and never outside it", () => {
	assert.equal(resolveAsset(ROOT, "/"), path.join(ROOT, "index.html"));
	assert.equal(resolveAsset(ROOT, "/webgl3d/bundle-3d.js"), path.join(ROOT, "webgl3d", "bundle-3d.js"));
	assert.equal(resolveAsset(ROOT, "/assets/sfx/a%20b.ogg"), path.join(ROOT, "assets", "sfx", "a b.ogg"));
	for (const bad of ["/../package.json", "/%2e%2e/secret", "/..%5c..%5cwindows", "/a/../../x", "/%E0%A4%A", "/x\0y"]) assert.equal(resolveAsset(ROOT, bad), null, bad);
	assert.match(mimeOf("a.js"), /javascript/);
	assert.match(mimeOf("a.HTML"), /text\/html/);
	assert.equal(mimeOf("s.ogg"), "audio/ogg");
	assert.equal(mimeOf("m.glb"), "model/gltf-binary");
	assert.equal(mimeOf("x.unknown"), "application/octet-stream");
});

test("every file the page loads is served with a known media type", () => {
	const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"),
		refs = [...html.matchAll(/(?:src|href)="([^"#?:]+)"/g)].map((m) => m[1]).filter((r) => !r.startsWith("./") || r.length > 2);
	assert.ok(refs.length > 40);
	for (const ref of refs) {
		const file = resolveAsset(ROOT, "/" + ref.replace(/^\.\//, ""));
		assert.ok(file && fs.existsSync(file), ref);
		assert.notEqual(mimeOf(file), "application/octet-stream", ref);
	}
});

class Store {
	constructor(o = {}) {
		this.m = new Map(Object.entries(o));
	}
	get length() {
		return this.m.size;
	}
	key(i) {
		return [...this.m.keys()][i] ?? null;
	}
	getItem(k) {
		return this.m.has(k) ? this.m.get(k) : null;
	}
	setItem(k, v) {
		this.m.set(k, String(v));
	}
	removeItem(k) {
		this.m.delete(k);
	}
}

test("saves go to a file and back: only the game's keys, replaced as a whole", () => {
	const a = new Store({ "pogranicze-save-v2": '{"t":1}', "pogranicze-campaign-v1": "{}", "hud.drawerCollapsed": "1", "other-site": "keep" });
	const text = SaveTransfer.exportSaves(a, "0.151", new Date("2026-10-08T12:00:00Z"));
	const file = JSON.parse(text);
	assert.equal(file.format, "pogranicze-zapisy");
	assert.equal(file.game, "0.151");
	assert.deepEqual(Object.keys(file.data).sort(), ["hud.drawerCollapsed", "pogranicze-campaign-v1", "pogranicze-save-v2"]);
	const b = new Store({ "pogranicze-records-v1": "old", "foreign": "x" });
	const r = SaveTransfer.importSaves(b, text);
	assert.ok(r.ok);
	assert.equal(b.getItem("pogranicze-save-v2"), '{"t":1}');
	assert.equal(b.getItem("pogranicze-records-v1"), null, "game keys missing from the file are removed");
	assert.equal(b.getItem("foreign"), "x", "other keys untouched");
});

test("a bad file changes nothing", () => {
	const s = new Store({ "pogranicze-save-v2": "mine" });
	for (const text of ["nie json", "{}", JSON.stringify({ format: "pogranicze-zapisy", version: 1, data: {} }), JSON.stringify({ format: "pogranicze-zapisy", version: 9, data: { "pogranicze-x": "1" } }), JSON.stringify({ format: "pogranicze-zapisy", version: 1, data: { "evil-key": "1" } }), JSON.stringify({ format: "pogranicze-zapisy", version: 1, data: { "pogranicze-x": 5 } })]) {
		const r = SaveTransfer.importSaves(s, text);
		assert.equal(r.ok, false, text);
		assert.ok(r.error);
		assert.equal(s.getItem("pogranicze-save-v2"), "mine");
	}
});

test("packaging: the app entry, the scripts and the files left out of the installer", () => {
	const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
	assert.equal(pkg.main, "electron/main.js");
	assert.ok(pkg.scripts.app && pkg.scripts.dist);
	assert.equal(pkg.build.productName, "Pogranicze Galaktyki");
	assert.ok(pkg.build.win.target.some((t) => (t.target || t) === "nsis"));
	for (const out of ["!tests/**", "!tools/**", "!docs/**"]) assert.ok(pkg.build.files.includes(out), out);
	assert.ok(fs.existsSync(path.join(ROOT, "build", "icon.png")));
	assert.ok(fs.readFileSync(path.join(ROOT, "index.html"), "utf8").includes('src="save-transfer.js"'));
});

test("the game's own confirmation window replaces the browser's confirm() for doctrines and save imports", () => {
	const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"),
		app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"),
		menu = fs.readFileSync(path.join(ROOT, "menu.js"), "utf8");
	assert.ok(html.includes('src="game-dialog.js"'));
	assert.match(app, /await confirmDoctrine\(kind\)/);
	assert.match(menu, /GameDialog\.confirm\(question\)/);
	// window.confirm only as a fallback when the module is missing.
	for (const src of [app, menu]) for (const line of src.split("\n").filter((l) => l.includes("window.confirm("))) assert.match(line, /GameDialog/, line.trim());
});
