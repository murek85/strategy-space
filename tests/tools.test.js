// 0.171.17: small pieces that had no tests — the weather's closeness to the camera, the interface's event-target
// helper, the local server's paths — and the test pages' script lists against index.html.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const ROOT = path.join(__dirname, "..");

test("weatherCloseness: 0 far away, 1 close in, smooth between", async () => {
	const { weatherCloseness } = await import("../webgl3d/weather-3d.js");
	assert.equal(weatherCloseness(3000), 0);
	assert.equal(weatherCloseness(1500), 0);
	assert.equal(weatherCloseness(700), 1);
	assert.equal(weatherCloseness(100), 1);
	assert.equal(weatherCloseness(undefined), 0);
	const mid = weatherCloseness(1100);
	assert.ok(mid > 0.4 && mid < 0.6, `halfway: ${mid}`);
	let last = -1;
	for (let d = 1600; d >= 600; d -= 50) {
		const k = weatherCloseness(d);
		assert.ok(k >= last, "never less as the camera comes closer");
		last = k;
	}
	assert.equal(weatherCloseness(2600, 2600, 900), 0);
	assert.equal(weatherCloseness(900, 2600, 900), 1);
});

test("closestTo: an element, a text node, the document, nothing", () => {
	const source = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"),
		line = source.match(/const closestTo = [^\n]+;/)?.[0];
	assert.ok(line, "closestTo in app.js");
	const closestTo = new Function(line + " return closestTo;")();
	const button = { nodeType: 1, closest: (sel) => (sel === "button" ? button : null) },
		text = { nodeType: 3, parentElement: button };
	assert.equal(closestTo(button, "button"), button);
	assert.equal(closestTo(text, "button"), button);
	assert.equal(closestTo({ nodeType: 9 }, "button"), null, "the document");
	assert.equal(closestTo(window0(), "button"), null, "the window");
	assert.equal(closestTo(null, "button"), null);
	assert.equal(closestTo(button, "input"), null);
	function window0() {
		return {};
	}
});

test("the test pages load the game's rules in index.html's order", () => {
	const scripts = (file) => [...fs.readFileSync(path.join(ROOT, file), "utf8").matchAll(/<script src="(?:\.\.\/)?([^"]+)"/g)].map((m) => m[1]);
	const game = scripts("index.html"),
		rules = game.filter((s) => /-rules\.js$|^campaign-(act\d|ai|events|choices|maps)\.js$|^(engine|scenario-\w+|frontier-maps|themed-maps|enemy-ai|network-modes)\.js$/.test(s));
	const page = scripts("tests/render-3d-browser.html"),
		inPage = page.filter((s) => rules.includes(s));
	assert.deepEqual(inPage, rules.filter((s) => page.includes(s)), "the same order as the game");
	for (const s of rules.filter((r) => !["save-transfer.js", "game-dialog.js"].includes(r))) assert.ok(page.includes(s), `render-3d-browser.html loads ${s}`);
	// The weather and space page takes the list from index.html itself.
	const weather = fs.readFileSync(path.join(ROOT, "tests/weather-browser.html"), "utf8");
	assert.match(weather, /loadGameScripts/);
	assert.ok(!/<script src="\.\.\/engine\.js">/.test(weather), "no copied list");
});

test("the local server serves the game, not its hidden folders or packages", async () => {
	const child = spawn(process.execPath, ["server.js"], { cwd: ROOT, env: { ...process.env, PORT: "0", HOST: "127.0.0.1" } });
	try {
		const port = await new Promise((resolve, reject) => {
			const timer = setTimeout(() => reject(Error("the server did not start")), 8000);
			child.stdout.on("data", (d) => {
				const m = String(d).match(/:(\d+)/);
				if (m) {
					clearTimeout(timer);
					resolve(Number(m[1]));
				}
			});
			child.on("exit", () => reject(Error("the server stopped")));
		});
		const status = async (p) => (await fetch(`http://127.0.0.1:${port}${p}`)).status;
		assert.equal(await status("/"), 200);
		assert.equal(await status("/menu.js"), 200);
		for (const p of ["/.git/config", "/node_modules/", "/.claude/launch.json", "/tests/%2e%2e/.git/HEAD"]) assert.equal(await status(p), 403, p);
	} finally {
		child.kill();
	}
});
