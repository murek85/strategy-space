// 0.175.8: the automatic quality — the 3D board's costliest effects stepped down while the frame rate stays low.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const SceneFX = require("../scene-fx.js");

const ROOT = path.join(__dirname, "..");
// Twice a second, as app.js feeds it; returns the changes as [second, level].
function feed(state, fps, seconds) {
	const changes = [];
	for (let i = 0; i < seconds * 2; i++) {
		state.t += 500;
		const level = SceneFX.autoTune(typeof fps === "function" ? fps(state.t) : fps, state.t);
		if (level !== null) changes.push([state.t / 1000, level]);
	}
	return changes;
}
const fresh = () => {
	SceneFX.options.autoQuality = true;
	SceneFX.resetAuto(true);
	return { t: 0 };
};

test("a steady low frame rate steps the quality down, one step at a time, to the last one", () => {
	const s = fresh();
	assert.deepEqual(feed(s, 60, 30), [], "enough frames: nothing changes");
	const down = feed(s, 30, 60);
	assert.deepEqual(down.map(([, l]) => l), [1, 2, 3, 4]);
	assert.ok(down[0][0] - 30 >= 4.5, "only after most of six seconds of it");
	for (let i = 1; i < down.length; i++) assert.ok(down[i][0] - down[i - 1][0] >= 8, "a step every eight seconds at most");
	assert.equal(SceneFX.autoLevel, SceneFX.AUTO_MAX);
});

test("a short hitch is not a low frame rate; a gap in the samples starts the watch again", () => {
	const s = fresh();
	assert.deepEqual(feed(s, (t) => (t % 6000 < 1500 ? 20 : 60), 60), [], "1.5 s in every 6 s below: the median holds");
	feed(s, 30, 5);
	s.t += 5000; // a pause, the menu, a hidden window
	assert.deepEqual(feed(s, 30, 5), [], "the five seconds before the gap do not count");
});

test("with room to spare it comes back up, and a raise that does not hold waits ever longer", () => {
	const s = fresh();
	const down = feed(s, 30, 20),
		start = down.at(-1)[0],
		top = SceneFX.autoLevel;
	assert.ok(top >= 2);
	s.t += 2000; // (a gap: the low samples since the last step left behind)
	const up = feed(s, 60, 150);
	assert.deepEqual(up.map(([, l]) => l), Array.from({ length: top }, (_, i) => top - 1 - i), "step by step back to the settings as chosen");
	assert.ok(up[0][0] - Math.max(start, 20) >= 19.5, "after twenty seconds of room");
	assert.equal(SceneFX.autoLevel, 0);
	// A machine on the edge: full quality runs at 32 frames, one step lower at 60.
	fresh();
	const t = { t: 0 },
		swings = [];
	for (let i = 0; i < 1200; i++) {
		t.t += 500;
		const level = SceneFX.autoTune(SceneFX.autoLevel >= 1 ? 60 : 32, t.t);
		if (level === 0) swings.push(t.t / 1000);
	}
	const gaps = swings.slice(1).map((x, i) => x - swings[i]);
	assert.ok(gaps.every((g, i) => i === 0 || g >= gaps[i - 1]), `the raises come ever later: ${swings}`);
	assert.ok(swings.length <= 5, "a handful of tries in ten minutes, not a flicker");
});

test("switched off, the board draws the settings as chosen; the level is never saved", () => {
	const s = fresh();
	feed(s, 25, 20);
	assert.ok(SceneFX.autoLevel > 0);
	SceneFX.set("autoQuality", false);
	assert.equal(SceneFX.autoLevel, 0);
	assert.deepEqual(feed(s, 25, 20), []);
	SceneFX.set("autoQuality", true);
	assert.equal(SceneFX.options.autoQuality, true, "on by default and kept as a setting");
	assert.ok(!("autoLevel" in SceneFX.options));
});

test("the 3D board applies the level without rebuilding the map; the battle feeds it and says when it lowers", () => {
	const three = fs.readFileSync(path.join(ROOT, "webgl3d", "three-renderer.js"), "utf8"),
		app = require("./app-source.js")(),
		menu = fs.readFileSync(path.join(ROOT, "menu.js"), "utf8");
	assert.match(three, /auto = o\.autoQuality && typeof SceneFX !== "undefined" \? SceneFX\.autoLevel/);
	assert.match(three, /o\.dof, o\.haze, o\.shake, auto\]\.join/, "a new level changes the quality key");
	assert.match(three, /sun\.castShadow = o\.shadows !== false && auto < 4/);
	assert.doesNotMatch(three, /scatter: \[1, 0\.55, 0\.25\]\[[^\]]*auto/, "the scatter (a rebuild) stays as chosen");
	assert.match(app, /rendererMode === "three"[^\n]*SceneFX|SceneFX\.autoTune\(fpsCount\.value, clockNow\)/);
	assert.match(app, /level > before\) toast\(`Automatyczna jakość/);
	assert.match(menu, /id="visual-autoQuality"[\s\S]*id="auto-quality-status"/);
});
