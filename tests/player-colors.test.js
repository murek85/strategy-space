// 0.177.3: ten colours for the player, named in one place; no computer side is coloured like the player.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const RTS = require("../engine.js");
require("../advanced-rules.js");
const ROOT = path.join(__dirname, "..");
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const distance = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

test("ten colours, each with a name, all different", () => {
	assert.equal(RTS.PLAYER_COLORS.length, 10);
	assert.equal(new Set(RTS.PLAYER_COLORS).size, 10);
	for (const c of RTS.PLAYER_COLORS) assert.ok(RTS.PLAYER_COLOR_NAMES[c], c);
	const menu = fs.readFileSync(path.join(ROOT, "menu.js"), "utf8"),
		net = fs.readFileSync(path.join(ROOT, "netplay-menu.js"), "utf8");
	assert.match(menu, /RTS\.PLAYER_COLOR_NAMES\?\.\[c\]/, "the scenarios use the shared names");
	assert.match(net, /const colorName = RTS\.PLAYER_COLOR_NAMES/, "and the network game");
});

test("whatever the player's colour, the four computer sides look unlike it and unlike each other", () => {
	for (const player of RTS.PLAYER_COLORS) {
		const sides = [1, 2, 3, 4].map((t) => RTS.sideColor(t, player));
		assert.equal(new Set(sides).size, 4, `${player}: ${sides}`);
		for (const s of sides) assert.ok(distance(s, player) >= 70, `${RTS.PLAYER_COLOR_NAMES[player]}: a side ${s} too like the player`);
	}
	// The usual colours stay where nothing is alike (mint: red, gold, blue, violet as always).
	assert.deepEqual([1, 2, 3, 4].map((t) => RTS.sideColor(t, "#b0efd0")), ["#f07d78", "#e4b968", "#819dff", "#d2a1ef"]);
	const g = new RTS.Game(1, "horizon");
	g.configureSkirmish({ players: 3, color: "#f0cb70" });
	assert.notEqual(g.colorFor(2), "#e4b968", "the gold enemy beside a gold player: another colour");
	assert.equal(g.colorFor(0), "#f0cb70");
});

test("the map legend takes the battle's colours", () => {
	const app = require("./app-source.js")();
	assert.match(app, /dot\("friendly", game\.colorFor\(me\)\);\s*dot\("hostile", foe !== undefined \? game\.colorFor\(foe\) : ""\);/);
});
