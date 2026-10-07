const { test } = require("node:test"),
	assert = require("node:assert/strict"),
	{ GameAudio } = require("../audio"),
	fx = require("../scene-fx");
function scene() {
	return {
		time: 0,
		entities: [
			{
				id: 1,
				team: 0,
				hp: 100,
				x: 100,
				y: 100,
				target: null,
				cooldown: 0.5,
			},
		],
		isVisible: () => true,
		queue: [],
		effects: [],
		soundEvents: [],
	};
}
test("music waits for sustained combat and recovers without resetting beat", () => {
	const a = new GameAudio(),
		g = scene();
	a.musicBeat = 37;
	a.updateMusicState(g);
	assert.equal(a.pendingMood, "explore");
	g.queue = [{}];
	g.time = 1;
	a.updateMusicState(g);
	assert.equal(a.pendingMood, "develop");
	g.entities[0].target = 2;
	g.time = 2;
	a.updateMusicState(g);
	assert.equal(a.pendingMood, "tension");
	g.time = 4.1;
	a.updateMusicState(g);
	assert.equal(a.pendingMood, "battle");
	g.entities[0].target = null;
	g.time = 15;
	a.updateMusicState(g);
	assert.equal(a.pendingMood, "recovery");
	g.time = 31;
	a.updateMusicState(g);
	assert.equal(a.pendingMood, "develop");
	assert.equal(a.musicBeat, 37);
});
test("hidden enemy does not reveal itself through music and state changes on phrase boundary", () => {
	const a = new GameAudio(),
		g = scene();
	g.isVisible = () => false;
	g.entities.push({ team: 1, hp: 100, x: 150, y: 150, target: 1 });
	a.updateMusicState(g);
	assert.equal(a.pendingMood, "explore");
	a.musicMode = "game:sun";
	a.pendingMood = "battle";
	a.instrument = () => {};
	a.musicStep(1, 0);
	assert.equal(a.musicMood, "explore");
	// (A phrase is two bars of eight steps.)
	a.musicStep(15, 1);
	assert.equal(a.musicMood, "explore");
	a.musicStep(16, 1);
	assert.equal(a.musicMood, "battle");
});
test("category settings persist, clamp and selectively mute sounds", () => {
	const data = new Map(),
		storage = {
			getItem: (k) => data.get(k),
			setItem: (k, v) => data.set(k, v),
		},
		a = new GameAudio({ storage });
	assert.ok(a.setChannelVolume("units", 0));
	a.setChannelVolume("ambient", 2);
	assert.equal(new GameAudio({ storage }).channels.units, 0);
	assert.equal(a.channels.ambient, 1);
	assert.equal(a.setChannelVolume("bad", 1), false);
	a.context = { currentTime: 1, state: "running" };
	a.tone = () => {};
	a.noise = () => {};
	assert.equal(a.play("robot-build"), false);
	assert.equal(a.play("shot"), true);
});
test("alarm ducks ambience and music, then restores the mix", () => {
	const a = new GameAudio(),
		g = scene(),
		levels = [];
	a.context = { currentTime: 1, state: "running" };
	a.musicGain = { gain: { setTargetAtTime: (v) => levels.push(v) } };
	a.play = () => {};
	g.soundEvents = ["alarm"];
	a.update(g);
	assert.equal(a.duckUntil, 3.5);
	assert.equal(levels.at(-1), 0.65 * a.musicVolume * 0.55);
	a.context.currentTime = 4;
	g.time = 4;
	a.update(g);
	assert.equal(levels.at(-1), 0.65 * a.musicVolume);
});
test("visual budgets are bounded and only terrain changes invalidate terrain cache", () => {
	const rev = fx.revision;
	fx.set("particles", "low");
	assert.equal(fx.stride("particles"), 3);
	assert.equal(fx.revision, rev);
	fx.set("terrain", "low");
	assert.equal(fx.revision, rev + 1);
	assert.equal(fx.set("terrain", "ultra"), false);
	assert.equal(fx.set("flashes", "yes"), false);
	for (let i = 0; i < 300; i++) fx.measure(i % 20);
	assert.equal(fx.samples.length, 120);
	assert.ok(fx.metrics.p95 <= 19);
	assert.equal(fx.metrics.count, 120);
});
