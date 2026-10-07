const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { CHAPTERS } = require("../campaign");
const { SCENES } = require("../interludes");

test("every campaign chapter has a radio scene of known speakers", () => {
	const speakers = new Set(Object.keys(RTS.ACT2_SPEAKERS));
	for (const id of CHAPTERS.filter((id) => id !== "training")) {
		const lines = SCENES[id];
		assert.ok(lines && lines.length >= 3 && lines.length <= 4, id);
		for (const [who, text] of lines) {
			assert.ok(speakers.has(who), `${id}: ${who}`);
			assert.ok(text.length > 10 && text.length < 140, `${id}: line length`);
		}
	}
	assert.deepEqual(Object.keys(SCENES).sort(), CHAPTERS.filter((id) => id !== "training").sort());
});
