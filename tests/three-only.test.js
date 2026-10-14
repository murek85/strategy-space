// 0.176: the game is 3D (Three.js) only. PixiJS and the Canvas 2D board are gone; render-canvas.js stays as the
// 2D painter of the 3D board's layers and the map previews; without WebGL the game says so.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

test("no PixiJS and no webgl/ left; the game loads only what the 3D board needs", () => {
	assert.ok(!fs.existsSync(path.join(ROOT, "webgl")), "webgl/ is gone");
	assert.ok(!fs.existsSync(path.join(ROOT, "vendor", "pixi.min.js")), "PixiJS is gone");
	const html = read("index.html");
	assert.doesNotMatch(html, /pixi|src="webgl\//);
	assert.match(html, /src="webgl3d\/model-light\.js"/, "the painted stand-in for what has no 3D model");
	// (menu.js too, but its changelog remembers PixiJS: the settings are checked below.)
	for (const f of ["app.js", "scene-fx.js", "fx-art.js", "render-canvas.js", "model-icons.js"]) assert.doesNotMatch(read(f), /PIXI|createPixi|webgpu/i, f);
});

test("the 3D board is the only one: built once, rebuilt after a lost context, a word without WebGL", () => {
	const app = require("./app-source.js")();
	assert.match(app, /function applyRenderer\(\) \{\s*if \(renderer !== canvasRenderer \|\| no3D\) return null;/);
	assert.match(app, /createThreeGameRenderer\(\{ gameCanvas: canvas, canvasRenderer, onContextLost: contextLost \}\)/);
	assert.match(app, /function contextLost\(\)[\s\S]{0,400}boardScreen\(/, "a lost context builds the 3D board again");
	assert.match(app, /function showNo3D\(\)[\s\S]{0,900}Brak grafiki 3D/);
	assert.match(app, /if \(no3D\) showNo3D\(\);/, "every battle says so again");
	assert.match(app, /if \(renderer !== canvasRenderer\) renderer\.render\(view\(\)\);/, "no 2D board drawn while the 3D one is built");
	assert.doesNotMatch(app, /switchRenderer|useCanvasRenderer|rendererChanged/);
});

test("the settings: only the 3D board, a saved older board is 3D, no PixiJS-only switches", () => {
	const fx = require("../scene-fx.js");
	assert.equal(fx.options.renderer, "three");
	assert.equal(fx.set("renderer", "canvas"), false);
	assert.equal(fx.set("renderer", "webgl"), false);
	assert.ok(!("volume" in fx.options) && !("tilt" in fx.options), "the PixiJS-only effects are gone");
	const menu = read("menu.js");
	assert.doesNotMatch(menu, /id="visual-renderer"|visual-volume|visual-tilt|Canvas 2D — ostatni/);
	assert.match(menu, /<h3 class="menu-subhead">Silnik<\/h3><p id="renderer-status"/);
});

test("render-canvas.js paints layers, not a board; what only the 2D board drew is gone", () => {
	const src = read("render-canvas.js");
	assert.doesNotMatch(src, /\n\t\trender\(view\) \{/, "no board entry");
	assert.doesNotMatch(src, /function (drawSky|drawLighting|drawPost|drawGlow|drawWeather|drawFog)\(/);
	assert.match(src, /drawLayer\(target, view, phases\)/);
	assert.match(src, /drawMinimap\(view\)/);
	assert.doesNotMatch(read("map-art.js"), /skyPlugins\(|\n\t\tsky\(c, g, view\)/);
});

test("0.177.1: a station or ship breaking up in space: its drives' flames and the glow under the platform go out", () => {
	const src = read("webgl3d/three-renderer.js");
	assert.match(src, /if \(m\.blending === THREE\.AdditiveBlending && m\.transparent\) glows\.push\(/, "the added-light parts of the wreck are found");
	assert.match(src, /return \{ wreck, halves, fragments, reach, glows \};/);
	assert.match(src, /const out = Math\.max\(0, 1 - d\.t \/ DRIVES_OUT\);[\s\S]{0,300}g\.m\.opacity = g\.opacity \* out \* out/, "they sputter and fade out");
	assert.match(read("webgl3d/ships-3d.js"), /AdditiveBlending[\s\S]*function platform/, "the platform's flames and glow are added light");
});
