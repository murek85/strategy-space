// 0.177.4: the loading screen's percentage and stage move with the bar while the page is busy — rolls slid by the
// compositor (Web Animations on transform), timed by the same walk as the bar's CSS animation.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "loading-screen.js"), "utf8"),
	css = fs.readFileSync(path.join(ROOT, "style.css"), "utf8");

test("the rolls follow the bar's own walk (the same stretches, curve and length as the CSS animation)", () => {
	const keyframes = css.match(/@keyframes loading-fill \{([\s\S]*?)\n\}/)[1],
		stops = [...keyframes.matchAll(/(\d+)% \{\s*transform: scaleX\(([\d.]+)\)/g)].map((m) => [Number(m[1]) / 100, Number(m[2])]);
	const fill = src.match(/const FILL = \{ seconds: (\d+), stops: (\[[^;]*?\]\]), curve: (\[[^\]]+\]) \};/);
	assert.deepEqual(JSON.parse(fill[2]), stops, "the stops");
	assert.ok(css.includes(`animation: loading-fill ${fill[1]}s cubic-bezier(${JSON.parse(fill[3]).join(", ")}) forwards`), "the length and the curve");
});

test("percentage and stage are compositor rolls, to the end as well; the screen goes on a timer once they are there", () => {
	assert.match(src, /strip\.animate\?\.\(frames, \{ duration: FILL\.seconds \* 1000, fill: "forwards" \}\)/);
	assert.match(src, /easing: "step-end"/, "a value jumps, it does not slide");
	// (0.177.5) The end: from where the bar stands, on the compositor, closed by a timer once it is there.
	assert.match(src, /pctRoll\.finish\(p\);\s*stageRoll\.finish\(p\);[\s\S]{0,200}setTimeout\(close, wait\);/);
	assert.match(src, /done\(\) \{[\s\S]{0,150}complete\(\);/, "started by done(), not by the next animation frame");
	assert.doesNotMatch(src, /\+ 1200\);/, "no safety timer cutting the bar short");
	assert.doesNotMatch(src, /pct\.textContent = /, "no text written on the busy thread");
	assert.match(css, /\.loading-stage > span,\s*\.loading-stage > em \{[\s\S]{0,80}height: 16px;\s*overflow: hidden;/);
});
