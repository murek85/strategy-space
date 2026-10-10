// M1 (0.162), M2 (0.163), M3 (0.164), M4 (0.165): maps made for chapters I–III and X–XIII (campaign-maps.js, space-rules.js),
// also playable as scenarios.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const RTS = require("../engine");
const { Game, MISSIONS, TYPES, dist } = RTS;

const MAPS = { colony1: "lanterns", colony2: "vesper", colony3: "nadir", colony10: "eosdocks", colony11: "ashvalley", colony12: "bastion", colony13: "crystals" };
const reach = (g, from, to) => {
	const end = g.pathTo(from, to).at(-1);
	return end && dist(end, to) < 220;
};

test("the new maps are scenarios, symmetric under a half turn", () => {
	for (const id of [...Object.values(MAPS), "crimson", "thalassa"]) {
		assert.ok(MISSIONS[id] && !MISSIONS[id].campaign, id);
		assert.ok(RTS.FRONTIER_MAPS[id], id);
		const map = RTS.FRONTIER_MAPS[id],
			key = (o) => [Math.round(o.x + (o.w || 0) / 2), Math.round(o.y + (o.h || 0) / 2)].join(",");
		const spots = map.obstacles().map(key),
			turned = map.obstacles().map((o) => key({ x: 3360 - o.x - o.w, y: 2160 - o.y - o.h, w: o.w, h: o.h }));
		assert.deepEqual([...turned].sort(), [...spots].sort(), id + " obstacles");
		for (const players of [2, 4]) {
			const g = new Game(42, id);
			g.configureSkirmish({ players });
			const home = g.hq(0);
			for (const o of [...g.ores, ...g.gasFields, ...g.crystalFields, ...g.nodes]) assert.ok(reach(g, home, o), `${id} ${o.x},${o.y}`);
			for (const team of [1, 3, 4]) if (g.hq(team)) assert.ok(reach(g, home, g.hq(team)), id + " base " + team);
		}
	}
});

test("chapters I–III and X–XIII play on their maps, bases on fixed spots, the landmark rocks in place", () => {
	for (const [chapter, id] of Object.entries(MAPS)) {
		for (const seed of [42, 7, 1234]) {
			const g = new Game(seed, chapter);
			g.applyCampaignLevel("normal");
			const [mine, theirs] = RTS.CAMPAIGN_MAPS[chapter].bases;
			assert.deepEqual([g.hq(0).x, g.hq(0).y], mine, chapter);
			assert.deepEqual([g.hq(1).x, g.hq(1).y], theirs, chapter);
			assert.ok(g.obstacles.some((o) => o.kind), chapter + " terrain");
			assert.equal(g.nodes.length, 8, chapter);
			for (const o of [...g.ores, ...g.gasFields, ...g.crystalFields, ...g.nodes]) assert.ok(reach(g, g.hq(0), o), `${chapter} ${o.x},${o.y}`);
			assert.ok(reach(g, g.hq(0), g.hq(1)), chapter + " enemy base");
			const threats = g.entities.filter((e) => TYPES[e.type].threat);
			assert.equal(threats.length, RTS.FRONTIER_MAPS[id].habitats?.length || 0, chapter);
			if (RTS.isAct4?.(chapter)) {
				assert.ok(g.isAct4(), chapter);
				continue;
			}
			// A plain rock near the middle carries the act's landmark in 3D.
			const rock = g.obstacles.filter((o) => !o.kind).sort((a, b) => dist({ x: a.x + a.w / 2, y: a.y + a.h / 2 }, { x: 1680, y: 1080 }) - dist({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, { x: 1680, y: 1080 }))[0];
			assert.ok(rock && dist({ x: rock.x + rock.w / 2, y: rock.y + rock.h / 2 }, { x: 1680, y: 1080 }) < 450, chapter + " landmark");
			// Saves keep the terrain.
			const back = Game.fromSave(g.serialize());
			assert.deepEqual(back.obstacles, g.obstacles);
		}
	}
	// XI: the cruiser lies where the beacon stood; XII: the uplink site is reachable on the way to the Fortress.
	assert.equal(new Game(42, "colony11").obstacles.filter((o) => o.kind === "wreck").length, 3);
	const xii = new Game(42, "colony12");
	xii.applyCampaignLevel("normal");
	assert.ok(xii.act4.site && reach(xii, xii.hq(0), xii.act4.site));
	// A scenario on the Bastion starts its first two sides in the bastions.
	for (const seed of [1, 2, 3, 4]) {
		const g = new Game(seed, "bastion");
		g.configureSkirmish({ players: 2, seed });
		for (const team of [0, 1]) assert.ok(g.hq(team).x > g.W / 2 !== g.hq(team).y > g.H / 2, "bastion " + seed);
	}
	// Training stays on its range.
	assert.ok(new Game(42, "training").obstacles.every((o) => !o.kind));
});

test("M3: the docks of Eos and the Crimson Nebula", () => {
	// Chapter X: the gantries of the shipyard over a desert Eos.
	const x = new Game(42, "colony10");
	x.applyCampaignLevel("normal");
	assert.ok(x.space && x.obstacles.filter((o) => o.kind === "dock").length >= 8);
	assert.equal(MISSIONS.colony10.look.planet, "desert");
	// The Crimson Nebula: most of the field in clouds, the corridor between the south-west and north-east clear.
	for (const size of ["small", "medium", "large"]) {
		const g = new Game(42, "crimson");
		g.configureSkirmish({ players: 2, size });
		let inside = 0,
			all = 0;
		for (let px = 100; px < g.W; px += 60)
			for (let py = 100; py < g.H; py += 60, all++) if (g.inNebula({ x: px, y: py })) inside++;
		assert.ok(inside / all > 0.55, size + " " + (inside / all).toFixed(2));
		for (let k = 0; k <= 20; k++) {
			const p = { x: g.W * (0.125 + 0.75 * (k / 20)), y: g.H * (0.815 - 0.63 * (k / 20)) };
			// The map's own clouds (gas fields, which the large size adds more of, carry clouds of their own).
			const own = g.nebulaClouds().filter((f) => !g.gasFields.some((o) => o.x === f.x && o.y === f.y));
			assert.ok(own.every((f) => dist(f, p) >= f.r), `${size} corridor ${Math.round(p.x)},${Math.round(p.y)}`);
		}
		// Clouds stay off the save (they follow from the map), and a restored game has the same ones.
		const back = Game.fromSave(JSON.parse(JSON.stringify(g.serialize())));
		assert.deepEqual(back.nebulaClouds(), g.nebulaClouds());
		assert.ok(!("_nebulae" in JSON.parse(JSON.stringify(g.serialize()))));
	}
	// No clouds on the ground.
	assert.deepEqual(new Game(42, "lanterns").nebulaClouds(), []);
});

test("M4: the sea of Thalassa and the crystal ridges of Nivalis", () => {
	// Thalassa: a sea of kind "sea" over a good share of the map, every piece of land reachable (the sandbars).
	for (const size of ["small", "medium", "large"]) {
		const g = new Game(42, "thalassa");
		g.configureSkirmish({ players: 4, size });
		assert.ok(g.waters.filter((w) => w.kind === "sea").length > 60, size);
		const reach = g.reachable(g.hq(0));
		let wet = 0,
			all = 0;
		for (let y = 60; y < g.H; y += 50)
			for (let x = 60; x < g.W; x += 50, all++) {
				if (g.blocked(x, y, 0)) wet++;
				else if (!g.blocked(x, y, 22)) assert.ok(reach({ x, y }), `${size} land ${x},${y}`);
			}
		assert.ok(wet / all > 0.2, size + " sea " + (wet / all).toFixed(2));
	}
	assert.equal(MISSIONS.thalassa.theme, "ocean");
	// The grid of waters answers like the full list.
	const g = new Game(42, "thalassa");
	const brute = (x, y, pad) => g.waters.some((w) => RTS.waterContains(w, x, y, pad));
	for (let i = 0; i < 4000; i++) {
		const x = 30 + ((i * 397) % (g.W - 60)),
			y = 30 + ((i * 233) % (g.H - 60)),
			pad = [0, 22, 60][i % 3];
		assert.equal([...g.watersNear(x, y, pad)].some((w) => RTS.waterContains(w, x, y, pad)), brute(x, y, pad), `${x},${y},${pad}`);
	}
	// XIII among the crystal ridges: pillars of kind "crystal", the plateau open from the east and the west.
	const xiii = new Game(42, "colony13");
	xiii.applyCampaignLevel("normal");
	assert.equal(MISSIONS.colony13.theme, "crystal");
	assert.ok(xiii.obstacles.filter((o) => o.kind === "crystal").length >= 30);
	for (const x of [780, 2580]) assert.ok(!xiii.blocked(x, 1080, 40), "entrance " + x);
});
