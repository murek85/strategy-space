// 0.173 (I4): only the 3D board is developed on. The PixiJS board and the Canvas 2D board are frozen as fallbacks —
// bug fixes only. These checks keep them so: the frozen files say it, read no setting beyond those they read at the
// freeze (a new effect belongs in webgl3d/), and the old default "webgl" moves players to 3D once.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const OPTIONS = ["terrain", "particles", "flashes", "metrics", "fps", "renderer", "lights", "shadows", "clouds", "bloom", "water", "volume", "scars", "relief", "tilt", "cinema", "ao", "pbr", "reflect", "atmo", "surface", "dof", "haze", "shake"];
// The settings each frozen file read at the freeze.
const FROZEN = {
	"webgl/pixi-game-renderer.js": ["relief", "volume"],
	"webgl/ground-native.js": ["particles"],
	"webgl/models-native.js": [],
	"webgl/fauna-native.js": [],
	"webgl/canvas-replay.js": [],
	"webgl/pixi-renderer.js": ["bloom", "lights", "shadows", "water"],
	"webgl/prototype.js": null,
};

test("the frozen PixiJS files say so and read no new setting", () => {
	const pattern = new RegExp(`\\b(?:SceneFX\\.options|options|fx|o)\\.(${OPTIONS.join("|")})\\b`, "g");
	for (const [file, allowed] of Object.entries(FROZEN)) {
		const source = read(file);
		assert.match(source.slice(0, 400), /FROZEN since 0\.173/, `${file}: marked frozen`);
		if (!allowed) continue;
		const used = [...new Set([...source.matchAll(pattern)].map((m) => m[1]))].sort();
		assert.deepEqual(used, [...allowed].sort(), `${file}: a new effect goes to webgl3d/, not here`);
	}
	const canvas = read("render-canvas.js");
	assert.match(canvas.slice(0, 1200), /board itself[\s\S]*FROZEN/, "the Canvas 2D board is marked frozen");
	for (const shared of ["webgl/terrain-height.js", "webgl/model-light.js"]) assert.match(read(shared).slice(0, 300), /Shared with the 3D renderer/, shared);
});

test("the settings call PixiJS and Canvas 2D fallbacks", () => {
	const menu = read("menu.js");
	assert.match(menu, /<option value="three">3D \(Three\.js\) — zalecany/);
	assert.match(menu, /<option value="webgl">WebGL \(PixiJS\) — tryb awaryjny/);
	assert.match(menu, /<option value="canvas">Canvas 2D — ostatni tryb awaryjny/);
});

function sceneFx(saved) {
	const data = new Map(saved === undefined ? [] : [["pogranicze-visual-v1", JSON.stringify(saved)]]);
	const ctx = { localStorage: { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }, RTS: {} };
	ctx.window = ctx;
	vm.createContext(ctx);
	vm.runInContext(read("scene-fx.js"), ctx);
	return { fx: ctx.SceneFX, data };
}

test("the old default WebGL moves to 3D once; a choice made after stays", () => {
	assert.equal(sceneFx(undefined).fx.options.renderer, "three", "a new player");
	assert.equal(sceneFx({ renderer: "webgl" }).fx.options.renderer, "three", "the old default, saved without a choice");
	assert.equal(sceneFx({ renderer: "webgpu" }).fx.options.renderer, "webgpu", "chosen on purpose");
	assert.equal(sceneFx({ renderer: "canvas" }).fx.options.renderer, "canvas", "chosen on purpose");
	// Taking WebGL back in the settings after the move keeps it.
	const { fx, data } = sceneFx({ renderer: "webgl" });
	fx.set("renderer", "webgl");
	const again = sceneFx(JSON.parse(data.get("pogranicze-visual-v1")));
	assert.equal(again.fx.options.renderer, "webgl");
});
