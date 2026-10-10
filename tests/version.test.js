// 0.171.13: the version shown in the menu's footer (and written into exported saves) is the package's.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("the menu's version is the package's", () => {
	const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")),
		menu = fs.readFileSync(path.join(__dirname, "..", "menu.js"), "utf8");
	assert.equal(menu.match(/const GAME_VERSION = "([^"]+)"/)?.[1], pkg.version);
});
