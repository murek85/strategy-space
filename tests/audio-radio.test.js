const { test } = require("node:test");
const assert = require("node:assert/strict");
const { GameAudio } = require("../audio");
global.GameAudio = GameAudio;
require("../audio-radio");

test("every speaker has a radio voice and a motif; lines become syllables", () => {
	const { RADIO_VOICES, RADIO_MOTIFS } = GameAudio;
	for (const who of ["lira", "tessa", "vale", "koss", "varn", "dominium", "whisper"]) {
		assert.ok(RADIO_VOICES[who] && RADIO_MOTIFS[who], who);
	}
	const a = new GameAudio({});
	const line = a.radioSyllables("lira", "Przechwyciliśmy rozkaz Dominium. Ściągnij obrońców do bazy.");
	assert.ok(line.length > 6);
	assert.ok(line.at(-1).t + line.at(-1).len <= 4.01, "at most 4 s");
	assert.deepEqual(a.radioSyllables("lira", "Test linii."), a.radioSyllables("lira", "Test linii."), "the same line sounds the same");
	// Voices differ: Varn speaks lower than Lira; a question rises at the end.
	const low = a.radioSyllables("varn", "Tu Varn, słyszycie mnie"),
		high = a.radioSyllables("lira", "Tu Varn, słyszycie mnie");
	assert.ok(low.reduce((n, s) => n + s.f, 0) / low.length < high.reduce((n, s) => n + s.f, 0) / high.length);
	const q = a.radioSyllables("lira", "Czy to już koniec całej tej długiej drogi?"),
		s = a.radioSyllables("lira", "Czy to już koniec całej tej długiej drogi.");
	assert.ok(q.at(-1).f > s.at(-1).f);
	// Without an audio context nothing is played.
	assert.equal(a.speak("lira", "Test."), false);
});
