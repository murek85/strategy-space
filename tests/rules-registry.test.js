// 0.173 (I4): the rule modules in one list (RTS.RULE_MODULES, engine.js). Every page loads them in its order, Node
// installs it, and the map of which modules wrap which method of the game (RTS.RULE_LAYERS) is kept in
// tests/rules-layers.json — a new module, or one wrapping a method it did not, shows here and is updated on purpose:
//   set RULES_UPDATE=1 and run this test (npm test) to write the new map.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const RTS = require("../engine.js");
const ROOT = path.join(__dirname, "..");

test("Node installs every rule module, in the list's order", () => {
	assert.deepEqual(RTS.rulesInstalled(), [...RTS.RULE_MODULES]);
	assert.ok(Object.isFrozen(RTS.RULE_MODULES));
	for (const name of RTS.RULE_MODULES) assert.ok(fs.existsSync(path.join(ROOT, name + ".js")), name + ".js");
});

test("every rule module hands its install to the registry", () => {
	for (const name of RTS.RULE_MODULES) {
		const source = fs.readFileSync(path.join(ROOT, name + ".js"), "utf8");
		assert.match(source, new RegExp(`root\\.RTS\\.rule\\("${name}", install\\)`), name);
		assert.ok(!/else install\(root\.RTS\)/.test(source), `${name}: no direct install left`);
	}
});

test("every page loads the rule modules it uses in the list's order", () => {
	const pages = ["index.html", ...fs.readdirSync(ROOT).filter((f) => /^prototyp.*\.html$/.test(f)), ...fs.readdirSync(path.join(ROOT, "tests")).filter((f) => f.endsWith(".html")).map((f) => "tests/" + f)];
	for (const page of pages) {
		const scripts = [...fs.readFileSync(path.join(ROOT, page), "utf8").matchAll(/<script src="(?:\.\.\/)?([^"?]+)\.js"/g)].map((m) => m[1]),
			rules = scripts.filter((s) => RTS.RULE_MODULES.includes(s)),
			order = rules.map((s) => RTS.RULE_MODULES.indexOf(s));
		assert.deepEqual(order, [...order].sort((a, b) => a - b), `${page}: ${rules.join(", ")}`);
	}
	// index.html loads them all.
	const index = [...fs.readFileSync(path.join(ROOT, "index.html"), "utf8").matchAll(/<script src="([^"?]+)\.js"/g)].map((m) => m[1]);
	assert.deepEqual(index.filter((s) => RTS.RULE_MODULES.includes(s)), [...RTS.RULE_MODULES]);
});

test("the registry refuses a module out of order and an unknown one", () => {
	assert.throws(() => RTS.rule("nie-ma-takiego", () => {}), /Nieznany moduł reguł/);
	assert.equal(RTS.rule("army-rules", () => assert.fail("installed twice")), false, "an installed module is not installed again");
});

test("which modules wrap which method of the game (tests/rules-layers.json)", () => {
	const file = path.join(__dirname, "rules-layers.json"),
		now = Object.fromEntries(Object.keys(RTS.RULE_LAYERS).sort().map((k) => [k, RTS.RULE_LAYERS[k]]));
	if (process.env.RULES_UPDATE) {
		const keys = Object.keys(now);
		fs.writeFileSync(file, "{\n" + keys.map((k, i) => `\t${JSON.stringify(k)}: ${JSON.stringify(now[k]).replace(/,/g, ", ")}${i < keys.length - 1 ? "," : ""}`).join("\n") + "\n}\n");
	}
	assert.deepEqual(now, JSON.parse(fs.readFileSync(file, "utf8")), "the layers changed — check the new order, then RULES_UPDATE=1");
	// The busiest chains, for a sense of the stakes.
	assert.ok(RTS.RULE_LAYERS.tick.length >= 10);
});
