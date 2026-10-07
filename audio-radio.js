/* Radio voices of the campaign's speakers (on top of audio.js): no recorded speech — every line is a run of
   synthesized syllables in the speaker's own voice (pitch range, timbre, pace, intonation; a question rises,
   the end of a sentence falls), sent through a radio chain (band-pass, a little drive, hiss) between the
   squelch clicks of the transmitter. The intercepted Dominium channel breaks up (ring modulation, dropouts),
   the Swarm's Whisper is a glassy chord swelling in and out. Each speaker also has a short motif (a few notes)
   played in the radio scenes before chapters when they first speak. */
(function (root) {
	"use strict";
	const Audio = root.GameAudio;
	if (!Audio) return;
	// base Hz, range (share of base), wave, syllables per second, drive, band-pass Hz, hiss, vibrato depth.
	const VOICES = (Audio.RADIO_VOICES = {
		lira: { base: 330, range: 0.35, wave: "triangle", rate: 11, drive: 1.5, band: 1700, hiss: 0.012, vibrato: 0 },
		tessa: { base: 270, range: 0.25, wave: "sine", rate: 8, drive: 1.2, band: 1500, hiss: 0.012, vibrato: 6 },
		vale: { base: 140, range: 0.3, wave: "sawtooth", rate: 9, drive: 2, band: 1100, hiss: 0.016, vibrato: 0 },
		koss: { base: 175, range: 0.3, wave: "square", rate: 10, drive: 1.6, band: 1200, hiss: 0.014, vibrato: 9 },
		varn: { base: 108, range: 0.22, wave: "sawtooth", rate: 7, drive: 2.6, band: 950, hiss: 0.014, vibrato: 0 },
		dominium: { base: 200, range: 0.4, wave: "square", rate: 12, drive: 4, band: 1300, hiss: 0.035, vibrato: 0, broken: true },
		whisper: { base: 220, range: 0.5, wave: "sine", rate: 3, drive: 1, band: 2200, hiss: 0.004, vibrato: 3, glass: true },
	});
	// Motifs: semitones from the base an octave up, [semitone, beats].
	const MOTIFS = (Audio.RADIO_MOTIFS = {
		lira: [[0, 1], [4, 1], [7, 1], [12, 2]],
		tessa: [[0, 1.5], [3, 1], [7, 1], [5, 2]],
		vale: [[0, 1], [5, 1], [7, 2], [0, 2]],
		koss: [[0, 1], [-2, 1], [-5, 1], [-7, 2]],
		varn: [[0, 2], [-1, 1], [3, 1], [-5, 2]],
		dominium: [[0, 0.5], [1, 0.5], [0, 0.5], [1, 1.5]],
		whisper: [[0, 2], [6, 2], [11, 3]],
	});
	const hash = (s) => {
		let h = 2166136261;
		for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
		return (h >>> 0) / 4294967296;
	};
	function driveCurve(k) {
		const n = 256,
			curve = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const x = (i / (n - 1)) * 2 - 1;
			curve[i] = Math.tanh(x * k) / Math.tanh(k);
		}
		return curve;
	}

	Object.assign(Audio.prototype, {
		// The plan of a line: syllables with their pitch (Hz), start and length (s). Exposed for tests.
		radioSyllables(who, text) {
			const V = VOICES[who] || VOICES.lira,
				words = String(text).replace(/[…]/g, " ").split(/\s+/).filter(Boolean),
				out = [];
			let t = 0;
			const question = /\?\s*$/.test(text);
			for (const w of words) {
				const n = Math.max(1, Math.min(4, Math.round(w.replace(/[^\p{L}]/gu, "").length / 3)));
				for (let k = 0; k < n; k++) {
					const h = hash(w + k),
						len = (0.7 + h * 0.6) / V.rate;
					out.push({ t, len, f: V.base * (1 + V.range * (h - 0.5)) });
					t += len;
				}
				// A pause between words, longer after punctuation.
				t += (/[,.;:!?—]$/.test(w) ? 2.2 : 0.5) / V.rate;
			}
			// Cap at 4 s; intonation over the last third: down for a statement, up for a question.
			const total = Math.min(4, t),
				keep = out.filter((s) => s.t < total);
			keep.forEach((s) => {
				const p = s.t / total;
				if (p > 0.66) s.f *= question ? 1 + (p - 0.66) * 0.9 : 1 - (p - 0.66) * 0.5;
			});
			return keep;
		},
		// Speaks a radio line in the speaker's voice; with motif: true the speaker's motif comes first.
		speak(who, text, { motif = false } = {}) {
			const c = this.context;
			if (!c || c.state !== "running" || this.muted || this.volume === 0 || this.failed) return false;
			if (this.voices - this.musicNodes.size >= this.maxVoices - 8) return false;
			const V = VOICES[who] || VOICES.lira,
				level = this.channels.alerts ?? 1;
			if (level <= 0) return false;
			let t0 = c.currentTime + 0.03;
			if (motif) t0 = this.radioMotif(who, t0, level) + 0.08;
			const syllables = this.radioSyllables(who, text),
				end = t0 + (syllables.length ? syllables.at(-1).t + syllables.at(-1).len : 0.3);
			// The radio chain: voice → drive → band-pass → out.
			const shaper = c.createWaveShaper(),
				band = c.createBiquadFilter(),
				out = c.createGain();
			shaper.curve = driveCurve(V.drive);
			band.type = "bandpass";
			band.frequency.value = V.band;
			band.Q.value = 0.8;
			out.gain.value = 0.55 * level;
			shaper.connect(band);
			band.connect(out);
			const output = this.connect(out, 0),
				chain = [shaper, band, out, output];
			let ring = null;
			if (V.broken) {
				// Ring modulation of the intercepted channel.
				ring = c.createGain();
				ring.gain.value = 0;
				const lfo = c.createOscillator(),
					depth = c.createGain();
				lfo.frequency.value = 37;
				depth.gain.value = 1;
				lfo.connect(depth);
				depth.connect(ring.gain);
				ring.connect(shaper);
				this.track(lfo, [depth]);
				lfo.start(t0);
				lfo.stop(end + 0.1);
			}
			const input = ring || shaper;
			let first = true;
			for (const [i, s] of syllables.entries()) {
				// The broken channel drops some syllables.
				if (V.broken && hash(text + i) < 0.22) continue;
				const start = t0 + s.t;
				const parts = V.glass ? [1, 1.5, 2.01] : [1];
				for (const mult of parts) {
					const osc = c.createOscillator(),
						g = c.createGain();
					osc.type = V.wave;
					osc.frequency.setValueAtTime(s.f * mult, start);
					osc.frequency.linearRampToValueAtTime(s.f * mult * (V.glass ? 1.06 : 0.97), start + s.len);
					if (V.vibrato) {
						const lfo = c.createOscillator(),
							d = c.createGain();
						lfo.frequency.value = 5.5;
						d.gain.value = V.vibrato;
						lfo.connect(d);
						d.connect(osc.frequency);
						this.track(lfo, [d]);
						lfo.start(start);
						lfo.stop(start + s.len + 0.05);
					}
					const peak = (V.glass ? 0.05 : 0.16) / parts.length,
						attack = V.glass ? s.len * 0.45 : 0.012;
					g.gain.setValueAtTime(0.0001, start);
					g.gain.exponentialRampToValueAtTime(peak, start + attack);
					g.gain.exponentialRampToValueAtTime(0.0001, start + s.len);
					osc.connect(g);
					g.connect(input);
					// The chain is released with the last source.
					this.track(osc, first ? [g] : [g]);
					osc.start(start);
					osc.stop(start + s.len + 0.03);
				}
				first = false;
			}
			// Hiss over the whole line, then the chain is let go.
			const len = end - t0 + 0.3,
				buffer = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate),
				data = buffer.getChannelData(0);
			let seed = 977;
			for (let i = 0; i < data.length; i++) {
				seed = (seed * 1664525 + 1013904223) >>> 0;
				data[i] = (seed / 4294967296) * 2 - 1;
			}
			const hiss = c.createBufferSource(),
				hg = c.createGain();
			hiss.buffer = buffer;
			hg.gain.setValueAtTime(0.0001, t0);
			hg.gain.exponentialRampToValueAtTime(V.hiss * 4, t0 + 0.05);
			hg.gain.setValueAtTime(V.hiss * 4, end);
			hg.gain.exponentialRampToValueAtTime(0.0001, end + 0.25);
			hiss.connect(hg);
			hg.connect(band);
			this.track(hiss, [hg, ...chain]);
			hiss.start(t0);
			hiss.stop(t0 + len);
			// Squelch of the transmitter: on (unless the game's radio blip just played) and off.
			if (!V.glass) {
				const blip = (this.last.get("radio") ?? -Infinity) > c.currentTime - 0.3;
				if (!blip) this.tone(1800, 1400, 0.04, t0 - c.currentTime - 0.03, 0.025 * level, "square");
				this.tone(1400, 900, 0.06, end - c.currentTime + 0.05, 0.03 * level, "square");
			}
			return true;
		},
		// The speaker's motif from time t; returns when it ends.
		radioMotif(who, t, level = 1) {
			const notes = MOTIFS[who] || MOTIFS.lira,
				V = VOICES[who] || VOICES.lira,
				beat = 0.16,
				root = V.base * 2;
			for (const [semi, beats] of notes) {
				const f = root * Math.pow(2, semi / 12),
					d = beats * beat;
				this.tone(f, f * 0.995, d * 1.4, t - this.context.currentTime, 0.035 * level, V.glass ? "sine" : "triangle");
				t += d;
			}
			return t;
		},
	});
})(typeof window !== "undefined" ? window : globalThis);
if (typeof module !== "undefined" && module.exports) module.exports = {};
