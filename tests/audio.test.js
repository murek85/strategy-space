const { test } = require("node:test");
const assert = require("node:assert/strict");
const { GameAudio } = require("../audio.js");

test("preferences persist and volume is clamped", () => {
	const data = new Map(),
		storage = {
			getItem: (k) => data.get(k),
			setItem: (k, v) => data.set(k, v),
		};
	const audio = new GameAudio({ storage });
	audio.setVolume(2);
	audio.setMuted(true);
	const restored = new GameAudio({ storage });
	assert.equal(restored.volume, 1);
	assert.equal(restored.muted, true);
	restored.setVolume(-2);
	restored.setVolume(NaN);
	assert.equal(restored.volume, 0);
});
test("missing audio and blocked storage do not break the game", async () => {
	const audio = new GameAudio({
		contextFactory: () => null,
		storage: {
			getItem() {
				throw Error();
			},
			setItem() {
				throw Error();
			},
		},
	});
	audio.setVolume(0.5);
	assert.equal(await audio.unlock(), false);
	assert.equal(audio.play("shot"), false);
});
test("spatial effects respect fog, camera and pause without replay", () => {
	const audio = new GameAudio(),
		calls = [];
	audio.play = (k) => calls.push(k);
	const game = {
		effects: [
			{ kind: "shot", x: 500, y: 500 },
			{ kind: "explosion", x: 600, y: 500 },
			{ kind: "shot", x: 2000, y: 500 },
		],
		soundEvents: ["alarm"],
		isVisible: (x) => x !== 600,
	};
	const view = {
		cameraX: 500,
		cameraY: 500,
		viewWidth: 1000,
		viewHeight: 1000,
	};
	audio.update(game, view);
	audio.update(game, view);
	assert.deepEqual(calls, ["alarm", "shot"]);
	assert.equal(game.soundEvents.length, 0);
	game.effects.push({ kind: "shot", x: 500, y: 500 });
	audio.update(game, { ...view, paused: true });
	audio.update(game, view);
	assert.equal(calls.length, 2);
});
test("hidden pages discard queued sounds", () => {
	const audio = new GameAudio(),
		calls = [];
	audio.play = (k) => calls.push(k);
	const game = { effects: [], soundEvents: ["alarm", "ready"] };
	audio.update(game, { hidden: true });
	audio.update(game);
	assert.deepEqual(calls, []);
});
test("rate limits and mute also apply to forced effects", () => {
	const audio = new GameAudio();
	audio.context = { state: "running", currentTime: 0 };
	audio.tone = () => {};
	assert.equal(audio.play("shot"), true);
	assert.equal(audio.play("shot"), false);
	audio.context.currentTime = 0.1;
	assert.equal(audio.play("shot"), true);
	audio.setMuted(true);
	assert.equal(audio.play("shot", { force: true }), false);
});
test("music mode selects separate menu and planetary themes safely before unlock", () => {
	const audio = new GameAudio();
	assert.equal(audio.musicMode, "menu");
	audio.setMusicMode("game:ice");
	assert.equal(audio.musicMode, "game:ice");
	audio.setMusicMode("game:ash");
	assert.equal(audio.musicMode, "game:ash");
	audio.setMusicMode("menu");
	assert.equal(audio.musicMode, "menu");
	audio.silence();
});
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
test("menu freeze and repeated theme selection preserve the playing music", () => {
	const audio = new GameAudio();
	let musicStops = 0,
		effectStops = 0;
	const music = {
			stop() {
				musicStops++;
			},
		},
		effect = {
			stop() {
				effectStops++;
			},
		};
	audio.nodes.add(music);
	audio.nodes.add(effect);
	audio.musicNodes.add(music);
	audio.musicTimer = setTimeout(() => {}, 10000);
	audio.musicTimer.unref();
	const timer = audio.musicTimer;
	const source = readFileSync(require.resolve("../app.js"), "utf8");
	// The development dialog has its own pause callback; inspect the main menu callback.
	const freeze = source
		.slice(source.indexOf("menu = new CommandMenu"))
		.match(/freeze:\s*\(\)\s*=>\s*\{([^}]+)\}/)[1];
	const scope = {
		paused: false,
		keys: new Set(),
		drag: {},
		pan: {},
		sound: audio,
	};
	for (let i = 0; i < 4; i++) {
		vm.runInNewContext(freeze, scope);
		audio.setMusicMode("menu");
	}
	assert.equal(musicStops, 0);
	assert.equal(effectStops, 4);
	assert.equal(audio.musicTimer, timer);
	assert.equal(audio.musicNodes.size, 1);
	audio.stopMusic();
	assert.equal(musicStops, 1);
});
test("themes contain layered instruments and distinct tempo/harmony", () => {
	const sequences = [],
		arrangements = [];
	for (const mode of [
		"menu",
		"game:dust",
		"game:ice",
		"game:ash",
		"game:sun",
	]) {
		const audio = new GameAudio();
		audio.musicMode = mode;
		const notes = [];
		audio.instrument = (...args) => notes.push(args);
		let time = 0;
		for (let step = 0; step < 32; step++)
			time += audio.musicStep(step, time);
		assert.ok(new Set(notes.map((n) => n[0])).size >= 3);
		if (mode === "game:ice")
			assert.ok(
				!notes.some((n) => ["kick", "snare", "hat"].includes(n[0])),
			);
		assert.ok(
			notes.every(
				(n) =>
					n.slice(1).every(Number.isFinite) &&
					n[2] >= 0 &&
					n[3] > 0 &&
					n[4] > 0,
			),
		);
		sequences.push(JSON.stringify(notes));
		arrangements.push([...new Set(notes.map((n) => n[0]))].sort().join());
	}
	assert.equal(new Set(sequences).size, 5);
	assert.equal(new Set(arrangements).size, 5);
});
test("lookahead schedules each beat once without resetting on repeated unlock", () => {
	const audio = new GameAudio();
	audio.context = { state: "running", currentTime: 0 };
	const steps = [];
	audio.musicStep = (step, time) => {
		steps.push([step, time]);
		return 0.75;
	};
	audio.scheduleMusic();
	const timer = audio.musicTimer;
	audio.scheduleMusic();
	assert.equal(audio.musicTimer, timer);
	assert.equal(steps.length, 1);
	clearTimeout(timer);
	audio.musicTimer = null;
	audio.context.currentTime = 0.65;
	audio.scheduleMusic();
	assert.deepEqual(steps, [
		[0, 0.08],
		[1, 0.83],
	]);
	audio.stopMusic();
});
test("music and effects volume are independent and persisted", () => {
	const data = new Map(),
		storage = {
			getItem: (k) => data.get(k),
			setItem: (k, v) => data.set(k, v),
		};
	const a = new GameAudio({ storage });
	a.setMusicVolume(0.2);
	a.setVolume(0.8);
	const r = new GameAudio({ storage });
	assert.equal(r.musicVolume, 0.2);
	assert.equal(r.volume, 0.8);
	r.setMusicVolume(8);
	assert.equal(r.musicVolume, 1);
	assert.equal(r.volume, 0.8);
});
test("intro has its own six-part thirty-second arrangement", () => {
	const a = new GameAudio(),
		notes = [];
	a.musicMode = "intro";
	a.instrument = (...n) => notes.push(n);
	let t = 0;
	for (let step = 0; step < 60; step++) t += a.musicStep(step, t);
	assert.equal(t, 30);
	assert.ok(new Set(notes.map((n) => n[0])).size >= 6);
	assert.ok(notes.every((n) => n.slice(1).every(Number.isFinite)));
});
test("activity audio follows visible working robots and respects pause", () => {
	const a = new GameAudio(),
		calls = [];
	a.play = (kind) => calls.push(kind);
	const game = {
		time: 1,
		effects: [],
		soundEvents: [],
		entities: [
			{
				id: 1,
				type: "worker",
				hp: 100,
				x: 500,
				y: 500,
				path: [],
				order: { kind: "build", targetId: 2 },
			},
		],
		get: () => ({ x: 530, y: 500, constructionLeft: 3 }),
		isVisible: () => true,
	};
	const view = {
		cameraX: 500,
		cameraY: 500,
		viewWidth: 500,
		viewHeight: 500,
	};
	a.update(game, view);
	assert.ok(calls.includes("robot-build"));
	game.time = 2;
	a.update(game, { ...view, paused: true });
	assert.equal(calls.length, 1);
	game.entities[0].order = { kind: "gather", oreId: 3 };
	game.resourceFields = () => [{ id: 3, x: 520, y: 500, amount: 100 }];
	game.time = 3;
	a.update(game, view);
	assert.equal(calls.at(-1), "robot-mine");
	game.isVisible = () => false;
	game.time = 4;
	a.update(game, view);
	assert.equal(calls.length, 2);
});
