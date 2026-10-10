const { test } = require("node:test");
const assert = require("node:assert/strict");
const { GameAudio, STORIES } = require("../audio.js");

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
test("the opening (0.168.4): an Interstellar-like departure, 30 s, ending on a question", () => {
	const a = new GameAudio(),
		notes = [];
	a.musicMode = "intro";
	a.instrument = (...n) => notes.push(n);
	let t = 0;
	for (let step = 0; step < 60; step++) t += a.musicStep(step, t);
	assert.equal(t, 30);
	assert.ok(new Set(notes.map((n) => n[0])).size >= 6);
	assert.ok(notes.every((n) => n.slice(1).every(Number.isFinite)));
	// The parts at their times: the piano call and the slow clock, the figure, the build, the cut, the last note.
	for (const [total, length] of [[60, 30]]) {
		const b = new GameAudio(),
			at = [];
		b.musicMode = "intro";
		b.instrument = (kind, freq, start) => at.push({ kind, freq, start });
		let time = 0;
		for (let step = 0; step < total + 10; step++) time += b.musicStep(step, time);
		const between = (from, to, kind) => at.filter((n) => n.start >= from * length && n.start < to * length && (!kind || n.kind === kind));
		assert.ok(between(0, 0.3, "piano").length >= 2 && between(0, 0.3, "tick").length >= 4, length + " the call");
		assert.equal(between(0, 0.3, "taiko").length, 0, length + " no drums at first");
		assert.ok(between(0.34, 0.66, "organ").length >= 12, length + " the figure");
		assert.ok(between(0.67, 0.9, "taiko").length >= 3 && between(0.66, 0.7, "braam").length === 1, length + " the build");
		const last = at.filter((n) => n.start >= 0.9 * length);
		assert.ok(last.length === 2 && last.every((n) => n.kind === "piano"), length + " silence and one note");
		assert.ok(!at.some((n) => n.start >= length), length + " nothing after the film");
	}
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
test("listening from the settings holds the theme and mood; the intro loops", () => {
	const a = new GameAudio();
	a.instrument = () => {};
	a.previewMusic("game:ash", "battle");
	assert.equal(a.musicMode, "game:ash");
	assert.equal(a.musicMood, "battle");
	// The game's state does not take the mood away while listening.
	a.updateMusicState({ time: 100, entities: [], isVisible: () => true });
	for (let step = 0; step < 40; step++) a.musicStep(step, step);
	assert.equal(a.musicMood, "battle");
	// The intro starts over (step 64 = step 0): the pedal, the drone and the clock.
	a.previewMusic("intro");
	const notes = [];
	a.instrument = (...n) => notes.push(n[0]);
	a.musicStep(64, 0);
	assert.ok(notes.includes("organ") && notes.includes("drone") && notes.includes("tick"));
	assert.ok(a.stopPreview());
	assert.equal(a.musicPreview, null);
	assert.equal(a.stopPreview(), false);
});
test("the eerie themes (and those of the new worlds, 0.167): their own instruments, tempo and harmony; moods change them", () => {
	const sets = [],
		seqs = [];
	const EERIE = ["game:wreck", "game:hive", "game:lumen", "game:forge", "game:tide", "game:crystal", "game:ruins", "game:bastion", "game:archive", "game:beacons", "game:ashes", "game:dunes", "game:frost", "game:skyfall", "game:oasis", "game:convoy", "game:signal"];
	for (const mode of EERIE) {
		const a = new GameAudio(),
			notes = [];
		a.musicMode = mode;
		a.instrument = (...n) => notes.push(n);
		let t = 0;
		for (let step = 0; step < 64; step++) t += a.musicStep(step, t);
		const kinds = new Set(notes.map((n) => n[0]));
		assert.ok(kinds.size >= 3, mode + " " + [...kinds]);
		assert.ok(notes.every((n) => n.slice(1).every(Number.isFinite) && n[2] >= 0 && n[3] > 0 && n[4] > 0 && n[1] > 20), mode);
		sets.push([...kinds].sort().join());
		seqs.push(JSON.stringify(notes));
		// Battle: the heartbeat, drums and blasts.
		const b = new GameAudio(),
			fight = [];
		b.previewMusic(mode, "battle");
		b.instrument = (...n) => fight.push(n[0]);
		for (let step = 0; step < 32; step++) b.musicStep(step, step);
		for (const kind of ["heart", "taiko", "braam"]) assert.ok(fight.includes(kind), mode + " battle " + kind);
	}
	assert.ok(new Set(sets).size >= 7, sets.join(" | "));
	assert.equal(new Set(seqs).size, EERIE.length);
	// The accents of the new worlds: the surf, glass bells, a marching snare.
	const accents = (mode) => {
		const a = new GameAudio(),
			kinds = [];
		a.musicMode = mode;
		a.instrument = (...n) => kinds.push(n[0]);
		let t = 0;
		for (let step = 0; step < 128; step++) t += a.musicStep(step, t);
		return kinds;
	};
	assert.ok(accents("game:tide").filter((k) => k === "hiss").length >= 6, "the surf");
	assert.ok(accents("game:crystal").filter((k) => k === "bell").length > accents("game:hive").filter((k) => k === "bell").length, "glass bells");
	assert.ok(accents("game:bastion").includes("snare") && !accents("game:ruins").includes("snare"), "the march");
	// The valley of Eos: the beacon signals often in chapter I, rarely after the landing (XI); the same call.
	const bells = (mode) => accents(mode).filter((k) => k === "bell").length;
	assert.ok(bells("game:beacons") > bells("game:ashes") * 2 && bells("game:ashes") > 0, "the beacon");
	// The archive under the ice: a music box (a high piano figure) and the ice cracking — neither in the crystal ridges.
	const box = (mode) => {
		const a = new GameAudio(),
			notes = [];
		a.musicMode = mode;
		a.instrument = (...n) => notes.push(n);
		let t = 0;
		for (let step = 0; step < 256; step++) t += a.musicStep(step, t);
		return { piano: notes.filter((n) => n[0] === "piano").length, cracks: notes.filter((n) => n[0] === "tick" && n[1] > 1000).length };
	};
	assert.ok(box("game:archive").piano >= 8 && box("game:archive").cracks >= 2, "the archive: " + JSON.stringify(box("game:archive")));
	assert.equal(box("game:crystal").piano, 0);
	assert.equal(box("game:crystal").cracks, 0);
	// The ruins of Nadir: the call echoing off the walls, the citadel's gong, a ritual drum outside the fight.
	const notesOf = (mode) => {
		const a = new GameAudio(),
			notes = [];
		a.musicMode = mode;
		a.instrument = (...n) => notes.push(n);
		let t = 0;
		for (let step = 0; step < 128; step++) t += a.musicStep(step, t);
		return notes;
	};
	const ruins = notesOf("game:ruins"),
		forge = notesOf("game:forge");
	assert.ok(ruins.filter((n) => n[0] === "flute").length >= 2 * forge.filter((n) => n[0] === "flute").length, "echoes");
	assert.ok(ruins.some((n) => n[0] === "bell" && n[1] < 80), "the gong");
	assert.ok(ruins.filter((n) => n[0] === "taiko").length >= 8 && !forge.some((n) => n[0] === "taiko"), "the ritual drum");
	// The Admiralty's bastion: the bugle on brass, low strings with the march, distant guns — none in the ruins.
	const bastion = notesOf("game:bastion");
	for (const kind of ["brass", "strings", "kick"]) {
		assert.ok(bastion.some((n) => n[0] === kind), "the bastion " + kind);
		assert.ok(!ruins.some((n) => n[0] === kind), "the ruins " + kind);
	}
	// The remaining maps (0.168): the wailing voice and the rumble of the dune sea, the harp of the islands and the
	// oasis, the signal's code.
	const dunes = notesOf("game:dunes"),
		skyfall = notesOf("game:skyfall"),
		signal = notesOf("game:signal");
	assert.ok(dunes.some((n) => n[0] === "wail") && dunes.some((n) => n[0] === "bass"), "the dune sea");
	assert.ok(skyfall.filter((n) => n[0] === "pluck").length >= 8 && !ruins.some((n) => n[0] === "pluck"), "the harp");
	assert.ok(signal.filter((n) => n[0] === "bell" && n[3] < 0.3).length >= 6, "the code");
});
test("the space themes in the manner of Interstellar (seven with 0.167): organ figure, clock, piano; a driving battle", () => {
	const sets = [],
		seqs = [];
	const SPACE = ["game:orbit", "game:glacis", "game:void", "game:requiem", "game:docks", "game:nebula", "game:comets"];
	for (const mode of SPACE) {
		const a = new GameAudio(),
			notes = [];
		a.musicMode = mode;
		a.instrument = (...n) => notes.push(n);
		let t = 0;
		// A whole cycle of layers (32 bars), with its silent cut at the end.
		for (let step = 0; step < 256; step++) t += a.musicStep(step, t);
		const kinds = new Set(notes.map((n) => n[0]));
		assert.ok(kinds.size >= 4, mode + " " + [...kinds]);
		for (const kind of ["organ", "tick"]) assert.ok(kinds.has(kind), mode + " " + kind);
		assert.ok(notes.every((n) => n.slice(1).every(Number.isFinite) && n[2] >= 0 && n[3] > 0 && n[4] > 0 && n[1] > 20), mode);
		sets.push([...kinds].sort().join());
		seqs.push(JSON.stringify(notes.slice(0, 200)));
		const b = new GameAudio(),
			fight = [];
		b.previewMusic(mode, "battle");
		b.instrument = (...n) => fight.push(n[0]);
		for (let step = 0; step < 32; step++) b.musicStep(step, step);
		for (const kind of ["organ", "taiko", "braam", "tick"]) assert.ok(fight.includes(kind), mode + " battle " + kind);
	}
	assert.equal(new Set(seqs).size, SPACE.length);
	assert.ok(new Set(sets).size >= 3, sets.join(" | "));
});

// 0.168.3 (0.170: 122 s): the finale's score, its parts on the film's shots.
test("the campaign finale: an Interstellar-like score in step with the two-minute film", () => {
	const vm = require("node:vm"),
		fs = require("node:fs"),
		path = require("node:path");
	const ctx = vm.createContext({ Math, RTS: {} });
	vm.runInContext(["campaign-film.js", "act4-film.js", "campaign-finale.js"].map((f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8")).join("\n;\n") + ";globalThis.F = FinaleFilm;", ctx);
	const F = ctx.F,
		starts = F.lengths.reduce((out, l) => [...out, out.at(-1) + l], [0]);
	assert.equal(F.duration, 122);
	const a = new GameAudio(),
		notes = [];
	a.musicMode = "finale";
	a.instrument = (kind, freq, start) => notes.push({ kind, freq, start });
	let t = 0;
	for (let step = 0; step < 260; step++) t += a.musicStep(step, t);
	const at = (from, to, kind) => notes.filter((n) => n.start >= from && n.start < to && (!kind || n.kind === kind));
	// The Gate (1): the drone, the blast as it cracks; the rifts (2): bells, no clock.
	assert.ok(at(0, 0.1, "drone").length === 1 && at(5.9, 6.1, "braam").length === 1);
	assert.ok(at(starts[1], starts[2], "bell").length >= 8 && at(starts[1], starts[2], "tick").length === 0);
	// Home and Eos (3–4): the organ's figure; the beacon (5): the full organ and the bell chord.
	assert.ok(at(starts[2], starts[4], "organ").length >= 30);
	assert.ok(at(starts[4], starts[5], "bell").length >= 15 && at(starts[4], starts[5], "braam").length === 1);
	// Hefajstos (6): the piano alone; the council (8): the brass chorale.
	assert.ok(at(starts[5], starts[6], "piano").length >= 4 && at(starts[5], starts[6], "taiko").length === 0);
	assert.ok(at(starts[7], starts[8], "brass").length >= 12);
	// The people (10): the piano tune; the routes (12): drums gathering.
	assert.ok(at(starts[9], starts[10], "piano").length >= 8);
	assert.ok(at(starts[11], starts[12], "taiko").length >= 6);
	// The end (13): the great chord in C, the cut, one bright note, nothing after the film.
	assert.ok(at(starts[12], starts[12] + 0.1, "organ").some((n) => Math.abs(n.freq - 130.81) < 1));
	assert.equal(at(118.2, 119).length, 0);
	assert.ok(at(119, 120, "piano").length >= 1);
	assert.equal(at(122, 200).length, 0);
});
// 0.169: the campaign prologue — 150 s of score telling the film's story, its parts on the film's shots.
test("the campaign prologue: its score in step with the 150 s film", () => {
	const vm = require("node:vm"),
		fs = require("node:fs"),
		path = require("node:path");
	const ctx = vm.createContext({ Math });
	vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "campaign-film.js"), "utf8") + ";globalThis.F = CampaignFilm;", ctx);
	const F = ctx.F,
		starts = F.lengths.reduce((out, l) => [...out, out.at(-1) + l], [0]);
	assert.equal(F.duration, 150);
	assert.equal(F.lengths.length, 15);
	const a = new GameAudio(),
		notes = [];
	a.musicMode = "prologue";
	a.instrument = (kind, freq, start) => notes.push({ kind, freq, start });
	let t = 0;
	for (let step = 0; step < 320; step++) t += a.musicStep(step, t);
	const at = (from, to, kind) => notes.filter((n) => n.start >= from && n.start < to && (!kind || n.kind === kind));
	// The frontier (shots 1–4): the piano, bells in the network shot (3), no drums.
	assert.ok(at(0, starts[4], "piano").length >= 30 && at(starts[2], starts[3], "bell").length >= 2);
	assert.equal(at(0, starts[4], "taiko").length, 0);
	// The blockade (shot 6): blasts and drums; the dark (7): no drums; the ultimatum (8): brass.
	assert.ok(at(starts[5], starts[6], "braam").length >= 2 && at(starts[5], starts[6], "taiko").length >= 6);
	assert.equal(at(starts[6], starts[7], "taiko").length, 0);
	assert.ok(at(starts[7], starts[8], "brass").length >= 6);
	// Lira (9–10): the lone piano, no drums.
	assert.ok(at(starts[8], starts[10], "piano").length >= 8 && at(starts[8], starts[10], "taiko").length === 0);
	// The mission (11–14): the organ's figure; drums in the run and the descent, none at the landing.
	assert.ok(at(starts[10], starts[11], "organ").length >= 16);
	assert.ok(at(starts[11], starts[13], "taiko").length >= 12 && at(starts[13], starts[14], "taiko").length === 0);
	assert.ok(at(starts[12], starts[12] + 0.1, "braam").length === 1, "a blast as the descent begins");
	// The title (15): the great chord, the cut, one bright note, nothing after the film.
	assert.ok(at(starts[14], starts[14] + 0.1, "organ").length >= 6);
	assert.equal(at(146.2, 147).length, 0);
	assert.ok(at(147, 148, "piano").length >= 1);
	assert.equal(at(150, 200).length, 0);
	// Lira speaks in the transmission and at the landing.
	assert.deepEqual(Object.keys(F.lines).map(Number), [9, 13]);
});

// 0.171: the prologues of acts II-IV — about 75 s each, a score of their own with its parts on the film's shots.
test("the prologues of acts II-IV: their scores in step with the films", () => {
	const vm = require("node:vm"),
		fs = require("node:fs"),
		path = require("node:path");
	const ctx = vm.createContext({ Math });
	vm.runInContext(["campaign-film.js", "act2-film.js", "act3-film.js", "act4-film.js"].map((f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8")).join("\n;\n") + ";globalThis.L = { prologue2: Act2Film, prologue3: Act3Film, prologue4: Act4Film };", ctx);
	for (const [mode, F] of Object.entries(ctx.L)) {
		const P = STORIES[mode],
			starts = F.lengths.reduce((out, l) => [...out, out.at(-1) + l], [0]);
		assert.equal(F.duration, 76, mode);
		assert.equal(F.lengths.length, 8, mode);
		assert.deepEqual(P.parts.map(([at]) => at), starts.slice(0, -1), mode + ": the parts start with the shots");
		assert.equal(P.end, F.duration, mode);
		assert.equal(P.parts.at(-1)[1], "title", mode + ": the title on the last shot");
		const a = new GameAudio(),
			notes = [];
		a.musicMode = mode;
		a.instrument = (kind, freq, start) => notes.push({ kind, freq, start });
		let t = 0;
		for (let step = 0; step < 180; step++) t += a.musicStep(step, t);
		const at = (from, to, kind) => notes.filter((n) => n.start >= from && n.start < to && (!kind || n.kind === kind));
		assert.ok(notes.every((n) => Number.isFinite(n.freq) && n.freq > 20), mode + ": valid notes");
		// Drums in the battles, none in the quiet; the great chord at the title, the cut and one note; nothing after.
		for (const [i, [from, mood]] of P.parts.entries()) {
			const to = P.parts[i + 1]?.[0] ?? P.end;
			if (mood === "battle") assert.ok(at(from, to, "taiko").length >= 6, `${mode}: drums in the battle at ${from}`);
			if (mood === "quiet" || mood === "hope") assert.equal(at(from, to, "taiko").length, 0, `${mode}: no drums at ${from}`);
		}
		const title = P.parts.at(-1)[0];
		assert.ok(at(title, title + 0.1, "organ").length >= 6, mode + ": the great chord");
		assert.equal(at(P.end - 3.9, P.end - 3).length, 0, mode + ": the cut");
		assert.ok(at(P.end - 3, P.end - 2, "piano").length >= 1, mode + ": one bright note");
		assert.equal(at(P.end, 200).length, 0, mode + ": nothing after the film");
	}
	// The decisions change the prologues of acts III and IV.
	const three = (colony6) => ctx.L.prologue3.prepare({ colony6 }).captions,
		four = (colony8) => ctx.L.prologue4.prepare({ colony8 }).captions;
	assert.notEqual(three("destroy")[0], three("evacuate")[0]);
	assert.notEqual(three("destroy")[4], three("evacuate")[4]);
	assert.equal(three("destroy")[1], three("evacuate")[1]);
	assert.notEqual(four("trust")[0], four("distance")[0]);
	assert.equal(four("trust").length, 8);
	assert.equal(typeof ctx.L.prologue4.parts.blackHole, "function", "the finale and the epilogues borrow its pieces");
	// 0.171.9: a quiet part after a loud one begins with a drone dying away (act III, the call of Varn at 37 s).
	const a3 = new GameAudio(),
		n3 = [];
	a3.musicMode = "prologue3";
	a3.instrument = (kind, freq, start) => n3.push({ kind, start });
	let t3 = 0;
	for (let step = 0; step < 180; step++) t3 += a3.musicStep(step, t3);
	assert.ok(n3.some((n) => n.kind === "drone" && n.start >= 37 && n.start < 37.1), "a drone as the quiet begins");
	// The voices: Lira in act II, Tessa and Varn (by the Hefajstos decision) in act III, Vok and Lira in act IV.
	assert.deepEqual(Object.keys(ctx.L.prologue2.lines).map(Number), [2, 7]);
	assert.equal(ctx.L.prologue3.prepare({ colony6: "evacuate" }).lines[4][0], "varn");
	assert.notEqual(ctx.L.prologue3.prepare({ colony6: "evacuate" }).lines[4][1], ctx.L.prologue3.prepare({ colony6: "destroy" }).lines[4][1]);
	assert.deepEqual(Object.values(ctx.L.prologue4.lines).map((l) => l[0]), ["vok", "lira"]);
});

// 0.171.14: a fake Web Audio context for the sound's own logic.
function fakeContext() {
	const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
	const node = () => {
		const n = { connect() {}, disconnect() {}, start() {}, stop(t) { n.stopAt = t ?? 0; }, onended: null, curve: null, buffer: null, type: "", oversample: "" };
		for (const k of ["gain", "frequency", "detune", "Q", "pan", "threshold", "knee", "ratio", "attack", "release", "delayTime", "playbackRate"]) n[k] = param();
		return n;
	};
	return {
		state: "running",
		currentTime: 1,
		sampleRate: 48000,
		destination: node(),
		createGain: node,
		createOscillator: node,
		createBiquadFilter: node,
		createStereoPanner: node,
		createDynamicsCompressor: node,
		createWaveShaper: node,
		createDelay: node,
		createBufferSource: node,
		createConvolver: node,
		createBuffer: (channels, length, sampleRate) => ({ length, sampleRate, getChannelData: () => new Float32Array(length) }),
		async resume() {
			this.state = "running";
		},
		async suspend() {
			this.state = "suspended";
		},
	};
}

test("radio speech has its own voices, a new line cuts the old one, Vok and the Gate have voices of their own", async () => {
	require("../audio-radio.js");
	const a = new GameAudio({ contextFactory: fakeContext });
	assert.ok(await a.unlock());
	a.stopMusic(0);
	const long = "Tu admirał Selen Vok. Varn to zdrajca, a jego rozejm to papier. Każdy statek Kolonii na tej orbicie zostanie zatopiony.";
	const before = a.effectVoices();
	assert.ok(a.speak("koss", long));
	assert.ok(a.speechNodes.size > 20, "the line's syllables");
	assert.ok(a.effectVoices() - before < 3, "not counted against the effects");
	const first = [...a.speechNodes];
	assert.ok(a.speak("lira", "Druga linia."));
	assert.ok(first.every((n) => n.stopAt > 0), "the line on the air is cut");
	for (const who of ["vok", "gate"]) {
		assert.ok(GameAudio.RADIO_VOICES[who], who);
		assert.ok(GameAudio.RADIO_MOTIFS[who], who);
	}
	assert.notDeepEqual(GameAudio.RADIO_VOICES.vok, GameAudio.RADIO_VOICES.lira);
});

test("battle themes go on where they were after the menu; a replay starts over; no notes below hearing; one noise buffer", async () => {
	const a = new GameAudio({ contextFactory: fakeContext });
	assert.ok(await a.unlock());
	a.setMusicMode("game:dust");
	for (let i = 0; i < 20; i++) {
		a.context.currentTime += 0.3;
		clearTimeout(a.musicTimer);
		a.musicTimer = null;
		a.scheduleMusic();
	}
	const beat = a.musicBeat;
	assert.ok(beat > 10);
	a.setMusicMode("menu");
	a.setMusicMode("game:dust");
	assert.ok(a.musicBeat >= beat && a.musicBeat <= beat + 3, `taken up again (${beat} → ${a.musicBeat})`);
	a.restartMusic("intro");
	assert.ok(a.musicBeat < 6, "the replay from its start");
	let heard = null;
	a.cinematic = (kind, freq) => (heard = freq);
	a.instrument("organ", 20.6, 1, 1, 0.1);
	assert.ok(heard >= 38, `an octave (or two) up: ${heard}`);
	assert.equal(a.noiseBuffer(0.3), a.noiseBuffer(1.2));
	a.stopMusic(0);
});
