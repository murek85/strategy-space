const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, MISSIONS, THEMED_LAYOUTS, THEMED_MAP_VERSION, dist } = RTS;
const scenarios = ["horizon", "solar", "ember", "frost"];
const skirmish = (id, opts = {}) => {
	const g = new Game(42, id);
	g.configureSkirmish({ players: 2, ...opts });
	return g;
};

test("reworked scenario maps get their themed terrain when a scenario is configured", () => {
	const kinds = { horizon: ["dune", "outcrop"], solar: ["dune", "outcrop"], ember: ["derelict", "eggs", "resin", "processor"], frost: ["crevasse", "ruin", "resin", "eggs"] };
	for (const id of scenarios) {
		const g = skirmish(id),
			found = new Set([...g.waters, ...g.obstacles].map((o) => o.kind).filter(Boolean));
		for (const kind of kinds[id]) assert.ok(found.has(kind), id + " " + kind);
		assert.equal(g.mapVersion, THEMED_MAP_VERSION);
		assert.equal(MISSIONS[id].theme, THEMED_LAYOUTS[id].theme);
		assert.equal(g.entities.filter((e) => RTS.TYPES[e.type].threat).length, 3, id);
	}
});

test("the bare constructor keeps the classic layout used by engine tests and campaign", () => {
	for (const id of [...scenarios, "training"]) {
		const g = new Game(42, id);
		assert.ok([...g.waters, ...g.obstacles].every((o) => !o.kind), id);
		assert.equal(g.mapVersion, undefined, id);
	}
	// Chapters I–III have their own maps (campaign-maps.js, 0.162).
	for (const id of ["colony1", "colony2", "colony3"]) assert.ok(new Game(42, id).obstacles.some((o) => o.kind), id);
	for (const id of ["colony1", "colony2", "colony3", "training"]) assert.ok(MISSIONS[id].theme, id);
});

test("dune ridges and crevasses only open at their passes", () => {
	const blockedRow = (g, y, from, to) => {
		for (let x = from; x <= to; x += 10) if (g.blocked(x, y, 22)) return true;
		return false;
	};
	const blockedColumn = (g, x, from, to) => {
		for (let y = from; y <= to; y += 10) if (g.blocked(x, y, 22)) return true;
		return false;
	};
	const horizon = new Game(42, "horizon");
	horizon.applyThemedLayout();
	// The northern ridge spans x 800–2560 around y 640–760; its two passes are open, the rest is sealed.
	for (const x of [1000, 1700, 2000]) assert.ok(blockedColumn(horizon, x, 560, 860), "ridge at " + x);
	for (const x of [1480, 2360]) assert.equal(blockedColumn(horizon, x, 560, 860), false, "pass at " + x);
	const frost = new Game(42, "frost");
	frost.applyThemedLayout();
	for (const x of [1200, 2100]) assert.ok(blockedColumn(frost, x, 440, 700), "crevasse at " + x);
	assert.equal(blockedColumn(frost, 1680, 440, 600), false, "north bridge");
	assert.ok(blockedRow(frost, 1640, 1300, 1500));
});

test("the derelict interior and its crystals are reachable through the open end", () => {
	for (const size of ["small", "medium", "large"]) {
		const g = skirmish("ember", { size }),
			hq = g.hq(0),
			ship = g.obstacles.filter((o) => o.kind === "derelict"),
			left = Math.min(...ship.map((o) => o.x)),
			right = Math.max(...ship.map((o) => o.x + o.w)),
			inside = g.crystalFields.filter((f) => f.x > left && f.x < right && f.y < Math.max(...ship.map((o) => o.y + o.h)));
		assert.ok(inside.length >= 2, size);
		for (const f of inside) {
			const path = g.pathTo(hq, f);
			assert.ok(path.length && dist(path.at(-1), f) < 2, size + " crystal route");
		}
	}
});

test("scenario saves from before the rework are rejected with a clear message; others still load", () => {
	const current = skirmish("solar", { mode: "relays" });
	assert.equal(Game.fromSave(current.serialize()).mapVersion, THEMED_MAP_VERSION);
	const old = current.serialize();
	delete old.mapVersion;
	assert.throws(
		() => Game.fromSave(old),
		(e) => e.outdated === true && /starszej wersji mapy/.test(e.userMessage),
	);
	for (const id of ["colony1", "colony2", "colony3", "training"]) assert.equal(Game.fromSave(new Game(42, id).serialize()).missionId, id);
	for (const id of ["lumen", "magma"]) {
		const s = skirmish(id).serialize();
		delete s.mapVersion;
		assert.equal(Game.fromSave(s).missionId, id);
	}
	const bare = new Game(42, "horizon").serialize();
	assert.equal(Game.fromSave(bare).missionId, "horizon");
});
