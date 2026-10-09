const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const RTS = require("../engine");
const { pathToFileURL } = require("url");
const { build, OUT } = require("../tools/build-3d.js");
// ES modules of the renderer, imported by file URL (Windows paths are not URLs).
const load = (...parts) => import(pathToFileURL(path.join(__dirname, "..", ...parts)).href);

test("the 3D bundle for pages opened from disk matches the renderer sources (npm run build:3d)", () => {
	assert.equal(fs.readFileSync(OUT, "utf8"), build(), "webgl3d/bundle-3d.js is out of date: run npm run build:3d");
	assert.doesNotThrow(() => new Function(build()));
});

test("every entity type has a code-built 3D model for every look, and it animates", async () => {
	globalThis.RTS = RTS;
	const THREE = await load("vendor", "three.module.js");
	const { createModels3D } = await load("webgl3d", "models-3d.js");
	const models = createModels3D(THREE),
		colors = ["#9ae5cb", "#ed8277"];
	const looks = [
		{ team: 0, faction: "colonies" },
		{ team: 1, faction: "dominion" },
		{ team: 1, faction: "swarm" },
		{ team: 1, faction: "watchers" },
		{ team: 2 },
	];
	for (const type of Object.keys(RTS.TYPES))
		for (const look of looks) {
			const e = { id: 7, type, x: 0, y: 0, hp: 50, maxHp: 100, angle: 0, cargo: 1, order: { kind: "gather" }, open: true, ...look };
			assert.ok(models.has(e), `${type} (${look.faction || "wildlife"}) has a model`);
			const m = models.create(e, colors);
			// A body, not a placeholder (static parts are merged on creation, so count triangles, not parts).
			let triangles = 0;
			m.root.traverse((o) => o.isMesh && (triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3));
			assert.ok(triangles >= 40, `${type} (${look.faction || "wildlife"}) has a body (${triangles} triangles)`);
			for (const time of [0, 0.4, 1.3]) m.update(e, { time, moving: true, aim: 0.6, recoil: 0.5, built: 1, working: true });
			m.root.updateMatrixWorld(true);
			m.root.traverse((o) => o.isMesh && assert.ok(o.matrixWorld.elements.every(Number.isFinite), `${type}: finite transforms`));
		}
});

test("act III special buildings: the Heart (chapter IX), the nests (VIII), the orbital station, the Peak", async () => {
	globalThis.RTS = RTS;
	const THREE = await load("vendor", "three.module.js");
	const { createModels3D } = await load("webgl3d", "models-3d.js");
	const models = createModels3D(THREE),
		gate = { id: 3, type: "hq", team: 1, faction: "swarm", x: 0, y: 0, hp: 1, maxHp: 1, angle: 0 },
		size = (m) => {
			let t = 0;
			m.root.traverse((o) => o.isMesh && (t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3));
			return t;
		};
	const plain = size(models.create(gate, ["#9ae5cb", "#ed8277"]));
	for (const mission of ["colony8", "colony9"]) {
		models.setMission(mission);
		const m = models.create(gate, ["#9ae5cb", "#ed8277"]);
		for (const time of [0, 0.3, 1.1]) m.update(gate, { time, moving: false, aim: 0, recoil: 0, built: 1, working: false });
		assert.notEqual(size(m), plain, `${mission}: the Swarm gate has its own model`);
	}
	models.setMission(null);
	const station = models.create({ id: 4, type: "uplink", team: 1, faction: "dominion", x: 0, y: 0, hp: 1, maxHp: 1, angle: 0 }, ["#9ae5cb", "#ed8277"]);
	for (const charge of [0, 0.5, 1]) station.update({ id: 4 }, { time: 1, built: 1, charge });
	const peak = models.scenery("relay", "#d4bf86", true),
		relay = models.scenery("relay", "#d4bf86", false);
	peak.update({ progress: 0.5, capturing: 1 }, { time: 1, colors: ["#9ae5cb"] });
	assert.ok(size(peak) > size(relay), "the Peak has its jammer tower");
});

test("act II objective sites: pad, camp, archive, data core, stops, lighthouse, conduits, Hefajstos machines", async () => {
	globalThis.RTS = RTS;
	const THREE = await load("vendor", "three.module.js");
	const { createModels3D } = await load("webgl3d", "models-3d.js");
	const models = createModels3D(THREE),
		size = (m) => {
			let t = 0;
			m.root.traverse((o) => o.isMesh && (t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3));
			return t;
		};
	for (const what of ["pad", "camp", "archive", "coreSite", "stop", "lighthouse"]) {
		const m = models.scenery(what);
		for (const time of [0, 0.7, 2.2]) m.update({ progress: time / 3 }, { time });
		assert.ok(size(m) >= 100, `${what} has a body`);
	}
	const pipe = models.scenery("conduit", [[0, 0, 0], [50, 2, 10], [100, 4, 20], [150, 3, 30]]);
	assert.ok(size(pipe) >= 100, "conduit has a body");
	const plain = size(models.scenery("relay", "#d4bf86", false));
	for (const name of ["ZAWÓR", "TURBINA", "ŁĄCZNIK"]) {
		const m = models.scenery("relay", "#d4bf86", false, name);
		m.update({ owner: 1, progress: 0.4, capturing: 0 }, { time: 1.3, colors: ["#9ae5cb", "#ed8277"] });
		assert.ok(size(m) > plain, `${name} carries its machine`);
	}
});

test("act I: the relay station keeps its capture rings, the landmarks of the story build and wake up", async () => {
	globalThis.RTS = RTS;
	const THREE = await load("vendor", "three.module.js");
	const { createModels3D } = await load("webgl3d", "models-3d.js");
	const models = createModels3D(THREE),
		size = (m) => {
			let t = 0;
			m.root.traverse((o) => o.isMesh && (t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3));
			return t;
		};
	const relay = models.scenery("relay", "#d4bf86");
	assert.equal(relay.ground.length, 36 + 24, "the zone dashes and the capture ring stay separate parts");
	assert.ok(relay.ground.every((g) => g.parent), "and stay in the model");
	relay.update({ progress: 0.5, capturing: 1 }, { time: 1, colors: ["#9ae5cb", "#ed8277"] });
	assert.ok(relay.ground.filter((g) => g.visible).length >= 36 + 12, "half the capture ring shows");
	for (const piece of ["eosBeacon", "silentStation", "iceArchive", "nadirCitadel", "trainingRange"]) {
		const m = models.scenery("landmark", piece, 220, 300);
		for (const [lit, progress] of [[false, 0], [true, 0.5], [true, 1]]) m.update({ lit, progress }, { time: 2 });
		assert.ok(size(m) >= 300, `${piece} has a body`);
	}
});

test("scenery models (wildlife, birds, fish, islands, wrecks, obstacles, deposits, relays) build and animate", async () => {
	globalThis.RTS = RTS;
	const THREE = await load("vendor", "three.module.js");
	const { createModels3D } = await load("webgl3d", "models-3d.js");
	const models = createModels3D(THREE);
	const made = [
		...["deer", "hare", "fox", "lizard"].map((k) => models.scenery("animal", k, "ice")),
		models.scenery("bird"),
		models.scenery("fish"),
		models.scenery("island", "lumen", 60, 1),
		models.scenery("island", "skyfall", 80, 2),
		models.scenery("wreck", 20, 3),
		...["ore", "gas", "crystal"].flatMap((k) => [0, 1, 3, 6].map((n) => models.scenery("deposit", k, n))),
		models.scenery("relay", "#d4bf86"),
		...["rock", "outcrop", "mesa", "spire", "grove", "wreck", "debris", "derelict", "ruin", "resin", "eggs", "processor"].map((k, i) => models.scenery("obstacle", k, 160, 110, ["dust", "ice", "ash"][i % 3], i + 1)),
	];
	for (const m of made) {
		m.update({ id: 1, life: 10, progress: 0.5, capturing: 1 }, { time: 2, moving: true, aim: 0, recoil: 0, colors: ["#9ae5cb", "#ed8277"] });
		// A body (static parts are merged on creation, so count triangles, not parts).
		let triangles = 0;
		m.root.traverse((o) => o.isMesh && (triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3));
		assert.ok(triangles >= 40, `scenery has a body (${triangles} triangles)`);
	}
});
