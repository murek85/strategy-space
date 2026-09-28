const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, MISSIONS, FRONTIER_MAPS, dist } = RTS;
const ids = ["lumen", "skyfall", "twinsun", "magma"];
// Straight lines across a barrier must hit it everywhere except near its crossings.
const sealed = (g, axis, from, to, span, crossings, margin = 260) => {
	let leaks = 0;
	for (let v = span[0]; v <= span[1]; v += 20) {
		if (crossings.some((c) => Math.abs(v - c) < margin)) continue;
		let hit = false;
		for (let u = from; u <= to && !hit; u += 10)
			hit = axis === "x" ? g.blocked(u, v, 22) : g.blocked(v, u, 22);
		if (!hit) leaks++;
	}
	return leaks;
};

test("four themed scenario maps are selectable, with their own weather names", () => {
	for (const id of ids) {
		const m = MISSIONS[id];
		assert.ok(
			m &&
				!m.campaign &&
				m.theme &&
				m.weatherName &&
				m.description.length > 80,
			id,
		);
		assert.equal(new Game(42, id).weather.name, m.weatherName);
	}
	assert.equal(MISSIONS.twinsun.twinSun, true);
});

test("rivers, chasms and lava only let ground units through their fords and bridges", () => {
	const lumen = new Game(42, "lumen");
	assert.equal(
		sealed(lumen, "x", 1300, 2100, [100, 2060], [610, 1370, 1930]),
		0,
	);
	const sky = new Game(42, "skyfall");
	assert.equal(
		sealed(sky, "x", 1450, 1900, [100, 2060], [720, 1380, 1080]),
		0,
	);
	assert.equal(sealed(sky, "y", 850, 1300, [100, 1450], [820]), 0);
	assert.equal(sealed(sky, "y", 850, 1300, [1950, 3250], [2560]), 0);
	const magma = new Game(42, "magma");
	assert.equal(sealed(magma, "x", 850, 1400, [100, 2060], [760, 1680]), 0);
	assert.equal(sealed(magma, "x", 1950, 2550, [100, 2060], [470, 1390]), 0);
	for (const [id, a, b] of [
		["lumen", { x: 900, y: 500 }, { x: 2500, y: 500 }],
		["skyfall", { x: 900, y: 500 }, { x: 900, y: 1600 }],
		["magma", { x: 600, y: 1080 }, { x: 1680, y: 700 }],
	]) {
		const g = new Game(42, id),
			path = g.pathTo({ ...a, type: "tank" }, b);
		assert.ok(path.length, id);
	}
});

test("shaped terrain survives skirmish setup, resizing and saving", () => {
	for (const id of ids)
		for (const size of ["small", "large"]) {
			const g = new Game(42, id);
			g.configureSkirmish({ size, players: 4 });
			const kinds = [
				...new Set(
					[
						...g.waters.map((w) => w.kind),
						...g.obstacles.map((o) => o.kind),
					].filter(Boolean),
				),
			];
			assert.ok(kinds.length, id);
			const r = Game.fromSave(g.serialize());
			assert.deepEqual(r.waters, g.waters);
			assert.deepEqual(r.obstacles, g.obstacles);
		}
});

test("giant trees and spires shelter infantry like rocks do; aircraft cross chasms", () => {
	const g = new Game(42, "lumen"),
		grove = g.obstacles.find((o) => o.kind === "grove"),
		t = g.spawn("trooper", 0, grove.x - 20, grove.y + grove.h / 2);
	assert.ok(g.cover(t));
	const sky = new Game(42, "skyfall"),
		chasm = sky.waters.find((w) => w.kind === "chasm" && w.y < 500),
		jet = sky.spawn("interceptor", 0, chasm.x - 300, chasm.y);
	assert.equal(sky.pathTo(jet, { x: chasm.x + 300, y: chasm.y }).length, 1);
	assert.ok(sky.blocked(chasm.x, chasm.y));
});
