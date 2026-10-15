// 0.177.6: npm run web — the browser version for a server: only what the page loads.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { files, moduleGraph } = require("../tools/web.js");
const ROOT = path.join(__dirname, "..");

test("everything index.html names, the 3D modules app.js imports, the libraries, the sounds — and nothing else", () => {
	const list = files(),
		html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
	for (const m of html.matchAll(/<script src="([^"?]+)"/g)) assert.ok(list.includes(m[1]), m[1]);
	for (const f of ["index.html", "style.css", "favicon.ico", "lang/en.js", "webgl3d/three-game-renderer.js", "webgl3d/three-renderer.js", "webgl3d/model-portraits.js", "webgl3d/bundle-3d.js", "vendor/three.module.js", "vendor/tone.min.js", "assets/menu-world.svg", "assets/sfx/laserSmall_000.ogg"])
		assert.ok(list.includes(f), f);
	assert.ok(list.every((f) => fs.existsSync(path.join(ROOT, f))), "every file exists");
	for (const out of [/^tests\//, /^tools\//, /^docs\//, /^prototyp-/, /prototype-3d\.js$/, /model-gallery\.js$/, /unit-showcase\.js$/, /^server\.js$/, /^lobby-server\.js$/, /\.blend/, /\.glb$/, /^node_modules\//, /three-addons/])
		assert.ok(!list.some((f) => out.test(f)), `left out: ${out}`);
});

test("the 3D modules follow the imports (a new module needs no list)", () => {
	const graph = moduleGraph("webgl3d/three-game-renderer.js");
	assert.ok(graph.includes("vendor/three.module.js") && graph.includes("webgl3d/models-3d.js") && graph.includes("webgl3d/model-portraits.js"));
	const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
	assert.equal(pkg.scripts.web, "node tools/web.js");
	assert.match(fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8"), /^web\/$/m);
});
