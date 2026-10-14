// 0.175.12: the interface shows the game's 3D models — the knowledge base, the development tree, the production deck.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

// model-icons.js in a page with no DOM beyond what it touches.
function load(renderer = "three") {
	const ctx = { SceneFX: { options: { renderer } }, document: { hidden: true }, setTimeout, console, window: {} };
	ctx.window = ctx;
	new Function("SceneFX", "document", "window", "setTimeout", read("model-icons.js") + "\nreturn ModelIcons;").call(ctx, ctx.SceneFX, ctx.document, ctx, setTimeout);
	return ctx.ModelIcons;
}

test("each look is rendered once and shared; a picture waits for the 3D code", async () => {
	const icons = load(),
		rendered = [];
	icons.loader = async () => ({ modelPortraits: () => ({ render: (e, o) => (rendered.push(e.type + ":" + o.width), { type: e.type }) }) });
	const got = [];
	const e = { type: "tank", team: 0, faction: "colonies", tint: "#b0efd0" };
	icons.picture(e, { width: 96, height: 96 }, (p) => got.push(p.type));
	icons.picture(e, { width: 96, height: 96 }, (p) => got.push(p.type));
	icons.picture({ ...e, type: "trooper" }, { width: 96, height: 96 }, (p) => got.push(p.type));
	await new Promise((r) => setTimeout(r, 120));
	assert.deepEqual(rendered, ["tank:96", "trooper:96"], "the same look twice: one render");
	assert.deepEqual(got.sort(), ["tank", "tank", "trooper"]);
	let now = null;
	icons.picture(e, { width: 96, height: 96 }, (p) => (now = p.type));
	assert.equal(now, "tank", "kept: at once");
});

test("without the 3D board, or when the 3D code fails, the 2D drawings stay", async () => {
	assert.equal(load("canvas").picture({ type: "tank" }, { width: 9, height: 9 }, () => {}), false);
	const icons = load();
	icons.loader = async () => {
		throw Error("no WebGL");
	};
	const warn = console.warn;
	console.warn = () => {};
	try {
		let called = false;
		icons.picture({ type: "tank" }, { width: 9, height: 9 }, () => (called = true));
		await new Promise((r) => setTimeout(r, 60));
		assert.equal(called, false);
		assert.equal(icons.enabled(), false, "not tried again");
	} finally {
		console.warn = warn;
	}
});

test("the knowledge base, the development tree and the deck ask for the models; the studio is in the 3D bundle", () => {
	assert.match(read("knowledge.js"), /ModelIcons\.paint\(canvas, e, \{ colors: \[e\.tint/);
	assert.match(read("development.js"), /ModelIcons\.paint\(canvas, e, \{ colors: \[e\.tint\], space: !!game\.space \}\)/);
	assert.match(read("app-deck.js"), /tabName !== "research"[\s\S]{0,600}ModelIcons\.icon\(symbol/);
	assert.match(read("app.js"), /ModelIcons\.loader = \(\) => load3D\(\)/);
	const html = read("index.html");
	assert.ok(html.indexOf('src="model-icons.js"') > 0 && html.indexOf('src="model-icons.js"') < html.indexOf('src="knowledge.js"'));
	assert.match(read("webgl3d/three-game-renderer.js"), /export function modelPortraits\(\)/);
	assert.match(read("tools/build-3d.js"), /"model-portraits\.js", "three-game-renderer\.js"[\s\S]*createThreeGameRenderer, modelPortraits/);
	assert.match(read("webgl3d/model-portraits.js"), /setViewOffset\(width, height/, "framed on the drawn pixels");
});

test("0.175.14: the queues, the selection and the queue status show the models too; the HUD writes them as it changes", () => {
	const hud = read("app-hud.js");
	assert.match(hud, /ModelIcons\.version : 0\]\)/, "a new picture writes the queue list again");
	assert.match(hud, /modelIcon\(e\.type, "queue-icon"\)[\s\S]{0,200}modelIcon\(e\.unit, "queue-unit-icon"\)/);
	assert.match(hud, /setIcon\(\$\("selection-icon"\), top\?\.\[0\]/, "the most numerous type of the selection");
	assert.match(hud, /setIcon\(\$\("queue-icon"\), q\?\.type && !q\.kind/, "no icon for research");
	assert.match(read("app-deck.js"), /<span id="queue-icon" class="queue-icon"/);
	assert.match(read("model-icons.js"), /url\(e, o = \{\}\) \{[\s\S]{0,300}return null;/);
});
