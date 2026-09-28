/* Higher-quality sound for the browser, layered over GameAudio (audio.js), which stays the fallback:
   - sampled effects (Kenney CC0 packs in assets/sfx): variants, random pitch, loudness normalised at load,
     weapons per faction, footsteps per ground, layered explosions; farther sounds are quieter and duller;
   - a mix bus: a generated convolution reverb shared by effects and music (the limiter stays in audio.js);
   - ambience per world: wind, whistling ice wind, a volcanic rumble, rain; it swells before a storm;
   - music played by Tone.js instruments (fat pads, FM brass and bells, a filtered bass, drums) with chorus and
     echo, through one lasting music reverb (native convolver, shared by all bands); the arrangement and moods are still composed by audio.js (musicStep);
   - stingers for victory, defeat, research and capture.
   Anything that fails to load falls back to the synthesized voices. Loaded after audio.js; Tone.js
   (vendor/tone.min.js) is added by this module after the first user gesture. */
(function (root) {
	"use strict";
	const GameAudio = root.GameAudio;
	if (!GameAudio || typeof root.fetch !== "function") return;
	const SFX = "assets/sfx/";
	// Tone.js is loaded only after the first user gesture: loaded with the page, it creates its own AudioContext
	// at once, which the browser blocks ("The AudioContext was not allowed to start").
	const TONE_URL = (() => {
		try {
			return new URL("vendor/tone.min.js", document.currentScript?.src || location.href).href;
		} catch {
			return "vendor/tone.min.js";
		}
	})();
	let toneLoading = null;
	function loadTone() {
		if (root.Tone) return Promise.resolve(root.Tone);
		if (!toneLoading)
			toneLoading = new Promise((resolve) => {
				root.TONE_SILENCE_LOGGING = true;
				const script = document.createElement("script");
				script.src = TONE_URL;
				script.onload = () => resolve(root.Tone || null);
				script.onerror = () => resolve(null);
				document.head.appendChild(script);
			});
		return toneLoading;
	}
	const five = (name) => [0, 1, 2, 3, 4].map((i) => `${name}_00${i}`);
	// Sample groups: files and the loudness (RMS) each is normalised to.
	const BANK = {
		"shot:colonies": { files: five("laserSmall"), rms: 0.012 },
		"shot:dominion": { files: five("laserRetro"), rms: 0.012 },
		"shot:swarm": { files: five("impactGlass_light"), rms: 0.012 },
		rocket: { files: ["laserLarge_000", "laserLarge_001", "laserLarge_002"], rms: 0.025 },
		explosion: { files: five("explosionCrunch"), rms: 0.035 },
		boom: { files: ["lowFrequency_explosion_000", "lowFrequency_explosion_001"], rms: 0.04 },
		"robot-mine": { files: five("impactMining"), rms: 0.004 },
		"robot-build": { files: ["impactMetal_light_000", "impactMetal_light_001", "impactMetal_light_002", "impactPlate_light_000", "impactPlate_light_001"], rms: 0.006 },
		"robot-gas": { files: ["slime_000", "slime_001"], rms: 0.004 },
		"footstep:concrete": { files: five("footstep_concrete"), rms: 0.0025 },
		"footstep:snow": { files: five("footstep_snow"), rms: 0.0025 },
		"footstep:grass": { files: five("footstep_grass"), rms: 0.0025 },
		engine: { files: ["spaceEngineLow_000"], rms: 0.012 },
		capture: { files: ["forceField_000"], rms: 0.02 },
	};
	const rmsOf = (buffer) => {
		const data = buffer.getChannelData(0);
		let sum = 0;
		for (let i = 0; i < data.length; i += 4) sum += data[i] * data[i];
		return Math.sqrt(sum / Math.ceil(data.length / 4)) || 1;
	};
	const jitter = (amount) => 1 + (Math.random() - 0.5) * 2 * amount;

	const base = {
		unlock: GameAudio.prototype.unlock,
		voice: GameAudio.prototype.voice,
		connect: GameAudio.prototype.connect,
		instrument: GameAudio.prototype.instrument,
		stopMusic: GameAudio.prototype.stopMusic,
		silence: GameAudio.prototype.silence,
		setMusicMode: GameAudio.prototype.setMusicMode,
		update: GameAudio.prototype.update,
	};

	const QUALITY_KEY = "pogranicze-audio-quality-v1";
	// "high" (samples, Tone.js, ambience) or "classic" (the synthesized sound of audio.js), remembered.
	// A real accessor on the prototype (Object.assign would copy only its value).
	Object.defineProperty(GameAudio.prototype, "quality", {
		configurable: true,
		get() {
			if (this._quality === undefined) {
				let saved = null;
				try {
					saved = this.storage?.getItem(QUALITY_KEY);
				} catch {}
				this._quality = saved === "classic" ? "classic" : "high";
			}
			return this._quality;
		},
	});
	Object.assign(GameAudio.prototype, {
		setQuality(value) {
			this._quality = value === "classic" ? "classic" : "high";
			try {
				this.storage?.setItem(QUALITY_KEY, this._quality);
			} catch {}
			if (this._quality === "classic") {
				this.retireBand();
				this.updateAmbience(null, false);
			} else if (this.context?.state === "running" && !this.hq) this.setupQuality();
		},
		hqOn() {
			return this.quality === "high" && !!this.hq;
		},
		async unlock() {
			const ok = await base.unlock.call(this);
			if (ok && !this.hq && this.quality === "high") this.setupQuality();
			return ok;
		},
		// A snapshot for the settings screen: what plays and how loud the output is right now.
		diagnostics() {
			const c = this.context,
				out = { quality: this.quality, state: c?.state || "brak", mode: this.musicMode, muted: this.muted, failed: this.failed };
			if (!c || !this.master) return out;
			try {
				if (!this.meter) {
					this.meter = c.createAnalyser();
					this.meter.fftSize = 2048;
					this.master.connect(this.meter);
				}
				const d = new Float32Array(this.meter.fftSize);
				this.meter.getFloatTimeDomainData(d);
				let sum = 0,
					peak = 0,
					bad = 0;
				for (const v of d) {
					if (!Number.isFinite(v)) bad++;
					else {
						sum += v * v;
						peak = Math.max(peak, Math.abs(v));
					}
				}
				out.level = Math.sqrt(sum / d.length);
				out.peak = peak;
				out.invalid = bad;
			} catch {}
			out.samples = this.hq ? this.hq.bank.size : 0;
			out.tone = this.hq?.toneFailed ? "błąd" : !this.hq?.toneReady ? "wczytywanie" : this.hq?.band ? "gra" : "gotowy";
			out.voices = this.voices;
			return out;
		},
		// Reverb, samples and the Tone.js band, once per audio context.
		setupQuality() {
			const c = this.context;
			this.hq = { bank: new Map(), band: null, ambience: null, ready: false };
			try {
				// A stereo impulse: decaying noise, darker towards the end (about 2.6 s).
				const seconds = 2.6,
					length = Math.floor(c.sampleRate * seconds),
					impulse = c.createBuffer(2, length, c.sampleRate);
				for (let ch = 0; ch < 2; ch++) {
					const data = impulse.getChannelData(ch);
					let low = 0;
					for (let i = 0; i < length; i++) {
						const t = i / length,
							white = Math.random() * 2 - 1;
						low += (white - low) * (0.5 - t * 0.42);
						data[i] = low * Math.pow(1 - t, 2.4) * (i < 90 ? i / 90 : 1);
					}
				}
				const reverb = c.createConvolver();
				reverb.buffer = impulse;
				const wet = c.createGain();
				wet.gain.value = 0.9;
				reverb.connect(wet);
				wet.connect(this.master);
				this.hq.reverb = reverb;
				this.hq.effectsSend = c.createGain();
				this.hq.effectsSend.gain.value = 0.16;
				this.hq.effectsSend.connect(reverb);
				// Effects reach the reverb after their own volume.
				this.effectsGain.connect(this.hq.effectsSend);
				// One lasting reverb for the music (same impulse), before the music volume, shared by every band:
				// a band no longer builds its own (a 5 s convolution per band was costly on the audio thread).
				const musicReverb = c.createConvolver();
				musicReverb.buffer = impulse;
				musicReverb.connect(this.musicGain);
				this.hq.musicReverb = musicReverb;
			} catch {}
			this.loadBank();
			// The band waits for Tone.js; until then the synthesized instruments play.
			this.hq.tone = loadTone().then((Tone) => {
				if (!Tone) return (this.hq.toneFailed = true);
				try {
					Tone.setContext(c);
					this.hq.toneReady = true;
				} catch {
					this.hq.toneFailed = true;
				}
			});
		},
		async loadBank() {
			const c = this.context,
				bank = this.hq.bank;
			await Promise.all(
				Object.entries(BANK).map(async ([group, { files, rms }]) => {
					const list = [];
					for (const name of files)
						try {
							const response = await root.fetch(SFX + name + ".ogg");
							if (!response.ok) continue;
							const buffer = await c.decodeAudioData(await response.arrayBuffer());
							list.push({ buffer, gain: Math.min(4, rms / rmsOf(buffer)) });
						} catch {}
					if (list.length) bank.set(group, list);
				}),
			);
			await this.hq.tone;
			this.hq.ready = true;
		},
		// A sample from a group: random variant, pitch and small level changes; farther = quieter and duller.
		sample(group, level, pan, { far = 0, rate = 1, delay = 0, offset = 0, duration = null, spread = 0.06 } = {}) {
			const list = this.hq?.bank.get(group);
			if (!list || this.voices - this.musicNodes.size >= this.maxVoices) return false;
			const c = this.context,
				pick = list[Math.floor(Math.random() * list.length)],
				t = c.currentTime + delay,
				source = c.createBufferSource(),
				filter = c.createBiquadFilter(),
				gain = c.createGain();
			source.buffer = pick.buffer;
			source.playbackRate.value = rate * jitter(spread);
			filter.type = "lowpass";
			filter.frequency.value = 900 + 17000 * Math.pow(1 - Math.min(1, far), 2);
			const g = pick.gain * level * (1 - Math.min(1, far) * 0.55) * jitter(0.08);
			gain.gain.setValueAtTime(g, t);
			if (duration) {
				gain.gain.setValueAtTime(0.0001, t);
				gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, g), t + 0.04);
				gain.gain.setValueAtTime(g, t + duration * 0.6);
				gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
			}
			source.connect(filter);
			filter.connect(gain);
			const out = this.connect(gain, pan);
			this.track(source, [filter, gain, out]);
			source.start(t, offset, duration || undefined);
			return true;
		},
		// Sampled voices where there is a sample; the synthesized voice otherwise (and for the interface).
		voice(kind, level, pan, more = {}) {
			const far = more.far || 0,
				hq = this.hqOn() && this.hq.ready;
			if (hq) {
				const opts = { far };
				if (kind === "shot") {
					const faction = ["dominion", "swarm"].includes(more.faction) ? more.faction : "colonies";
					if (this.sample("shot:" + faction, level * 0.9, pan, opts)) return;
				} else if (kind === "rocket") {
					if (this.sample("rocket", level, pan, { ...opts, rate: 0.9 })) {
						base.voice.call(this, "rocket", level * 0.35, pan);
						return;
					}
				} else if (kind === "explosion") {
					// A crunch on top, a low boom under it (always near, sometimes far), and the old thump.
					if (this.sample("explosion", level, pan, opts)) {
						if (far < 0.5 || Math.random() < 0.4) this.sample("boom", level * 0.8, pan, { ...opts, rate: 0.85 });
						this.tone(90, 30, 0.45, 0, 0.12 * level * (1 - far * 0.5), "sine", pan);
						return;
					}
				} else if (kind === "thunder") {
					if (this.sample("boom", level * 0.45, pan, { rate: 0.55, spread: 0.1 })) {
						this.sample("boom", level * 0.3, pan, { rate: 0.4, delay: 0.35, spread: 0.1 });
						return;
					}
				} else if (kind === "robot-mine" || kind === "robot-build" || kind === "robot-gas") {
					if (this.sample(kind, level, pan, opts)) return;
				} else if (kind === "footstep") {
					const ground = more.biome === "ice" ? "snow" : more.theme && /lumen|jungle|grove/.test(more.theme) ? "grass" : "concrete";
					if (this.sample("footstep:" + ground, level, pan, opts)) {
						this.sample("footstep:" + ground, level * 0.8, pan, { ...opts, delay: 0.2 });
						return;
					}
				} else if (kind === "engine") {
					const list = this.hq.bank.get("engine");
					if (list && this.sample("engine", level, pan, { ...opts, offset: Math.random() * 4, duration: 0.7, spread: 0.12, rate: more.faction === "swarm" ? 0.8 : 1 })) return;
				} else if (kind === "capture") {
					if (this.sample("capture", level, pan)) {
						this.stinger("capture");
						return;
					}
				}
			}
			if (["victory", "defeat", "research", "ready"].includes(kind) && this.hqOn() && this.band()) {
				this.stinger(kind);
				return;
			}
			base.voice.call(this, kind, level, pan, more);
		},

		// ---------- music on Tone.js ----------
		// The band: Tone.js instruments behind one gain (faded out and rebuilt when the music stops).
		band() {
			const T = root.Tone;
			if (!T || !this.hqOn() || !this.hq.toneReady || this.hq.toneFailed || !this.context) return null;
			if (this.hq.band) return this.hq.band;
			try {
				const out = new T.Gain(1);
				out.connect(this.musicGain);
				const reverbSend = new T.Gain(1),
					echo = new T.FeedbackDelay({ delayTime: 0.31, feedback: 0.3, wet: 1 }),
					echoFilter = new T.Filter(2400, "lowpass"),
					echoSend = new T.Gain(1);
				// The reverb send has its own gain, faded out with the band when it retires.
				const wet = new T.Gain(1);
				reverbSend.connect(wet);
				if (this.hq.musicReverb) wet.connect(this.hq.musicReverb);
				echoSend.chain(echo, echoFilter, out);
				const nodes = [out, wet, reverbSend, echo, echoFilter, echoSend];
				// Each instrument: a pool of monophonic voices → (filter) → (chorus, for the wide parts) → panner → band,
				// plus reverb and echo sends. Voices are scheduled directly on the audio clock (Tone's PolySynth hands
				// notes out on a JavaScript timer, which stalls in background tabs and offline rendering).
				const make = (Voice, options, size, { volume = 0, pan = 0, filter = null, wide = false, verb = 0.3, delay = 0 }) => {
					const input = new T.Gain(1),
						voices = Array.from({ length: size }, () => {
							const v = new Voice(options);
							v.volume.value = volume;
							v.connect(input);
							nodes.push(v);
							return { synth: v, until: 0 };
						});
					nodes.push(input);
					let head = input;
					if (filter) {
						const f = new T.Filter(filter, "lowpass", -24);
						head.connect(f);
						head = f;
						nodes.push(f);
					}
					if (wide) {
						const ch = new T.Chorus({ frequency: 0.5, delayTime: 3.5, depth: 0.6, wet: 0.55 }).start();
						head.connect(ch);
						head = ch;
						nodes.push(ch);
					}
					const panner = new T.Panner(pan);
					head.connect(panner);
					panner.connect(out);
					nodes.push(panner);
					for (const [amount, target] of [
						[verb, reverbSend],
						[delay, echoSend],
					])
						if (amount) {
							const g = new T.Gain(amount);
							panner.connect(g);
							g.connect(target);
							nodes.push(g);
						}
					return { voices, release: options.envelope?.release ?? 0.5 };
				};
				const instruments = {
					pad: make(T.Synth, { oscillator: { type: "fatsawtooth", count: 2, spread: 22 }, envelope: { attack: 0.9, decay: 0.6, sustain: 0.7, release: 2.4 } }, 8, { volume: -16, filter: 1300, wide: true, verb: 0.45 }),
					strings: make(T.Synth, { oscillator: { type: "fattriangle", count: 2, spread: 16 }, envelope: { attack: 0.55, decay: 0.4, sustain: 0.75, release: 1.9 } }, 8, { volume: -18, filter: 2200, wide: true, verb: 0.4 }),
					brass: make(T.FMSynth, { harmonicity: 1, modulationIndex: 2.6, envelope: { attack: 0.14, decay: 0.3, sustain: 0.6, release: 0.7 }, modulationEnvelope: { attack: 0.25, decay: 0.3, sustain: 0.5, release: 0.6 } }, 5, { volume: -15, filter: 1800, pan: -0.15, verb: 0.35 }),
					lead: make(T.FMSynth, { harmonicity: 2, modulationIndex: 1.4, oscillator: { type: "sine" }, envelope: { attack: 0.06, decay: 0.3, sustain: 0.5, release: 0.9 } }, 3, { volume: -15, pan: 0.15, verb: 0.35, delay: 0.25 }),
					bell: make(T.FMSynth, { harmonicity: 3.01, modulationIndex: 11, envelope: { attack: 0.002, decay: 1.3, sustain: 0, release: 1.6 }, modulationEnvelope: { attack: 0.002, decay: 0.45, sustain: 0, release: 0.5 } }, 6, { volume: -12, pan: 0.25, verb: 0.5, delay: 0.3 }),
					pluck: make(T.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.003, decay: 0.28, sustain: 0, release: 0.35 } }, 6, { volume: -14, pan: -0.25, verb: 0.3, delay: 0.15 }),
					arp: make(T.Synth, { oscillator: { type: "fatsquare", count: 2, spread: 12 }, envelope: { attack: 0.005, decay: 0.18, sustain: 0.1, release: 0.25 } }, 5, { volume: -20, filter: 2400, pan: 0.3, verb: 0.3, delay: 0.3 }),
					bass: make(T.MonoSynth, { oscillator: { type: "sawtooth" }, filter: { Q: 1.2, type: "lowpass", rolloff: -24 }, filterEnvelope: { attack: 0.01, decay: 0.25, sustain: 0.35, baseFrequency: 90, octaves: 2.4 }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.65, release: 0.45 } }, 3, { volume: -22, verb: 0.08 }),
					kick: make(T.MembraneSynth, { pitchDecay: 0.05, octaves: 5, envelope: { attack: 0.001, decay: 0.38, sustain: 0, release: 0.1 } }, 2, { volume: -17, verb: 0.05 }),
					snare: make(T.NoiseSynth, { noise: { type: "pink" }, envelope: { attack: 0.001, decay: 0.17, sustain: 0, release: 0.05 } }, 2, { volume: -16, filter: 5200, pan: 0.05, verb: 0.3 }),
					hat: make(T.MetalSynth, { envelope: { attack: 0.001, decay: 0.05, release: 0.02 }, harmonicity: 5.1, modulationIndex: 32, resonance: 5200, octaves: 1.5 }, 2, { volume: -41, pan: 0.35, verb: 0.1 }),
				};
				// A note on the voice that is free soonest.
				const play = (kind, freq, duration, time, velocity) => {
					const inst = instruments[kind];
					if (!inst) return false;
					const v = inst.voices.reduce((a, b) => (b.until < a.until ? b : a));
					v.until = time + duration + inst.release;
					if (kind === "snare") v.synth.triggerAttackRelease(duration, time, velocity);
					else if (kind === "hat") v.synth.triggerAttackRelease(8000, Math.min(duration, 0.06), time, velocity);
					else if (kind === "kick") v.synth.triggerAttackRelease(Math.max(35, freq * 0.5), duration, time, velocity);
					else v.synth.triggerAttackRelease(freq, duration, time, velocity);
					return true;
				};
				// Typical levels of each part in audio.js, turned into Tone velocities.
				const reference = { pad: 0.035, strings: 0.028, brass: 0.032, lead: 0.02, bell: 0.035, pluck: 0.05, arp: 0.021, bass: 0.065, kick: 0.075, snare: 0.022, hat: 0.012 };
				this.hq.band = { out, wet, nodes, instruments, reference, play };
				return this.hq.band;
			} catch {
				this.hq.toneFailed = true;
				return null;
			}
		},
		instrument(kind, freq, start, duration, level, pan = 0) {
			const band = this.band();
			if (!band?.instruments[kind]) return base.instrument.call(this, kind, freq, start, duration, level, pan);
			try {
				band.play(kind, freq, duration, start, Math.max(0.05, Math.min(1, (level / band.reference[kind]) * 0.7)));
			} catch {}
		},
		// Fade the band out and rebuild it later: notes already scheduled on it cannot be taken back.
		retireBand() {
			const band = this.hq?.band;
			if (!band) return;
			this.hq.band = null;
			const t = this.context.currentTime;
			for (const g of [band.out, band.wet])
				try {
					g.gain.cancelScheduledValues(t);
					g.gain.setValueAtTime(1, t);
					g.gain.linearRampToValueAtTime(0, t + 0.25);
				} catch {}
			// Gone soon after the fade: two bands at once doubled the load on the audio thread.
			setTimeout(() => band.nodes.forEach((n) => n.dispose?.()), 600);
		},
		stopMusic() {
			base.stopMusic.call(this);
			this.retireBand();
		},
		silence() {
			base.silence.call(this);
			this.retireBand();
		},
		// Stingers: short phrases on the band's instruments (a chord, a rising or falling line).
		stinger(kind) {
			const band = this.band();
			if (!band) return false;
			const t = this.context.currentTime + 0.03,
				n = (st) => 261.63 * 2 ** (st / 12),
				chord = (part, notes, duration, time, velocity) => notes.forEach((st) => band.play(part, n(st), duration, time, velocity));
			try {
				if (kind === "victory") {
					[0, 4, 7, 12, 16].forEach((st, i) => band.play("bell", n(st), 1.2, t + i * 0.16, 0.8));
					chord("brass", [-12, -5, 0, 4], 2.4, t + 0.75, 0.7);
					chord("pad", [-12, 0, 7], 3.5, t + 0.75, 0.6);
				} else if (kind === "defeat") {
					[7, 3, 0, -5].forEach((st, i) => band.play("strings", n(st - 12), 1.1, t + i * 0.3, 0.7));
					chord("pad", [-24, -21, -17], 3.5, t + 0.9, 0.6);
				} else if (kind === "research") {
					[0, 7, 12].forEach((st, i) => band.play("bell", n(st + 12), 0.9, t + i * 0.11, 0.7));
				} else if (kind === "capture") {
					chord("brass", [-5, 0, 4], 0.8, t, 0.55);
				} else if (kind === "ready") {
					band.play("bell", n(12), 0.5, t, 0.5);
					band.play("bell", n(19), 0.7, t + 0.13, 0.5);
				}
				return true;
			} catch {
				return false;
			}
		},

		// ---------- ambience ----------
		// Looped noise through filters: wind (dust), whistling wind (ice), a low rumble (ash), rain on top.
		ambience() {
			if (this.hq?.ambience || !this.context || !this.hq) return this.hq?.ambience;
			const c = this.context,
				seconds = 4,
				buffer = c.createBuffer(2, c.sampleRate * seconds, c.sampleRate);
			for (let ch = 0; ch < 2; ch++) {
				const data = buffer.getChannelData(ch);
				// Pink-ish noise (a few leaky integrators), looping cleanly.
				let b0 = 0,
					b1 = 0,
					b2 = 0;
				for (let i = 0; i < data.length; i++) {
					const w = Math.random() * 2 - 1;
					b0 = 0.997 * b0 + w * 0.029;
					b1 = 0.985 * b1 + w * 0.032;
					b2 = 0.95 * b2 + w * 0.048;
					data[i] = (b0 + b1 + b2 + w * 0.02) * 0.9;
				}
			}
			const layer = (type, freq, q) => {
				const source = c.createBufferSource(),
					filter = c.createBiquadFilter(),
					gain = c.createGain();
				source.buffer = buffer;
				source.loop = true;
				source.loopStart = 0;
				source.loopEnd = seconds;
				filter.type = type;
				filter.frequency.value = freq;
				filter.Q.value = q;
				gain.gain.value = 0;
				source.connect(filter);
				filter.connect(gain);
				gain.connect(this.effectsGain);
				source.start(c.currentTime, Math.random() * seconds);
				return { source, filter, gain };
			};
			this.hq.ambience = { wind: layer("lowpass", 520, 0.7), whistle: layer("bandpass", 950, 4), rumble: layer("lowpass", 110, 0.9), rain: layer("highpass", 2600, 0.5) };
			return this.hq.ambience;
		},
		updateAmbience(game, active) {
			const amb = active ? this.ambience() : this.hq?.ambience;
			if (!amb) return;
			const t = this.context.currentTime,
				level = active && !this.muted ? this.channels.ambient : 0,
				biome = root.RTS?.MISSIONS?.[game?.missionId]?.biome || "dust",
				weather = game?.weather || {},
				storm = Math.max(0, Math.min(1, weather.intensity || 0)),
				outlook = game?.stormOutlook,
				// The wind swells during the warning before a storm.
				coming = outlook?.near ? 1 - outlook.until / outlook.lead : 0,
				gust = 0.75 + 0.25 * Math.sin((game?.time || 0) * 0.37) * Math.sin((game?.time || 0) * 0.13 + 1),
				rain = weather.kind === "rain" ? storm : 0,
				blow = Math.max(storm * (weather.kind === "rain" ? 0.4 : 1), coming * 0.7);
			const set = (layer, value, freq) => {
				layer.gain.gain.setTargetAtTime(value * level, t, 0.6);
				if (freq) layer.filter.frequency.setTargetAtTime(freq, t, 0.8);
			};
			set(amb.wind, biome === "ash" ? 0.02 : (0.035 + blow * 0.2) * gust, 380 + blow * 900 + gust * 120);
			set(amb.whistle, biome === "ice" ? (0.012 + blow * 0.05) * gust : blow * 0.012, 800 + gust * 400 + blow * 500);
			set(amb.rumble, biome === "ash" ? 0.09 + blow * 0.05 : 0.015 + blow * 0.05, 0);
			set(amb.rain, rain * 0.09, 0);
		},
		setMusicMode(mode) {
			base.setMusicMode.call(this, mode);
			// Ambience belongs to the battle only.
			if (this.hq && !String(mode).startsWith("game")) this.updateAmbience(null, false);
		},
		update(game, view = {}) {
			base.update.call(this, game, view);
			if (this.hq && this.context?.state === "running") this.updateAmbience(game, this.hqOn() && !view.paused && !view.hidden && String(this.musicMode).startsWith("game"));
		},
	});
})(typeof window !== "undefined" ? window : globalThis);
