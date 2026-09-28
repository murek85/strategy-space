(function (root) {
	"use strict";
	class GameAudio {
		constructor({ contextFactory, storage } = {}) {
			this.contextFactory =
				contextFactory ||
				(() => {
					const C = root.AudioContext || root.webkitAudioContext;
					return C ? new C() : null;
				});
			this.storage = storage;
			this.context = null;
			this.master = null;
			this.musicGain = null;
			this.muted = false;
			this.volume = 0.35;
			this.musicVolume = 0.35;
			this.effectsGain = null;
			this.channels = { combat: 1, units: 1, ambient: 1, alerts: 1 };
			this.musicMood = "explore";
			this.pendingMood = "explore";
			this.duckUntil = 0;
			this.failed = false;
			this.voices = 0;
			this.maxVoices = 40;
			this.last = new Map();
			this.seen = new WeakSet();
			this.nodes = new Set();
			this.musicNodes = new Set();
			this.musicTimer = null;
			this.musicMode = "menu";
			this.musicBeat = 0;
			this.musicNextTime = 0;
			this.musicDelay = null;
			this.musicNoise = null;
			try {
				const saved = JSON.parse(
					storage?.getItem("pogranicze-audio-v1") || "null",
				);
				if (saved) {
					for (const key of Object.keys(this.channels))
						if (Number.isFinite(saved.channels?.[key]))
							this.channels[key] = Math.max(
								0,
								Math.min(1, saved.channels[key]),
							);
					this.muted = !!saved.muted;
					if (Number.isFinite(saved.musicVolume))
						this.musicVolume = Math.max(
							0,
							Math.min(1, saved.musicVolume),
						);
					if (Number.isFinite(saved.volume))
						this.volume = Math.max(0, Math.min(1, saved.volume));
				}
			} catch {}
		}
		async unlock() {
			if (this.failed) return false;
			try {
				if (!this.context) {
					this.context = this.contextFactory();
					if (!this.context) {
						this.failed = true;
						return false;
					}
					this.master = this.context.createGain();
					this.master.gain.value = this.muted ? 0 : 1;
					this.effectsGain = this.context.createGain();
					this.effectsGain.gain.value = this.volume;
					this.effectsGain.connect(this.master);
					this.musicGain = this.context.createGain();
					this.musicGain.gain.value = 0.65 * this.musicVolume;
					this.musicGain.connect(this.master);
					this.setupMusicSpace();
					const limiter = this.context.createDynamicsCompressor();
					limiter.threshold.value = -12;
					limiter.knee.value = 8;
					limiter.ratio.value = 12;
					limiter.attack.value = 0.003;
					limiter.release.value = 0.15;
					this.master.connect(limiter);
					limiter.connect(this.context.destination);
				}
				if (this.context.state === "suspended" && this.context.resume)
					await this.context.resume();
				this.scheduleMusic();
				return this.context.state === "running";
			} catch {
				this.failed = true;
				return false;
			}
		}
		settings() {
			try {
				this.storage?.setItem(
					"pogranicze-audio-v1",
					JSON.stringify({
						muted: this.muted,
						volume: this.volume,
						musicVolume: this.musicVolume,
						channels: this.channels,
					}),
				);
			} catch {}
			if (this.master) {
				const t = this.context.currentTime;
				this.master.gain.cancelScheduledValues(t);
				this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.015);
			}
		}
		setChannelVolume(key, value) {
			if (!(key in this.channels) || !Number.isFinite(value))
				return false;
			this.channels[key] = Math.max(0, Math.min(1, value));
			this.settings();
			return true;
		}
		soundCategory(kind) {
			return ["shot", "rocket", "explosion"].includes(kind)
				? "combat"
				: ["bird", "beast", "herd", "thunder"].includes(kind)
					? "ambient"
					: kind.startsWith("robot-") ||
						  ["engine", "footstep"].includes(kind)
						? "units"
						: "alerts";
		}
		updateMusicState(game) {
			if (this.scoreGame !== game) {
				this.scoreGame = game;
				this.musicMood = "explore";
				this.pendingMood = "explore";
				this.combatSince = null;
				this.lastCombat = -Infinity;
				this.nextScore = 0;
			}
			if (game.time < this.nextScore) return;
			this.nextScore = game.time + 0.5;
			const visible = (game.entities || []).filter(
				(e) => e.hp > 0 && (e.team === (game.viewer ?? 0) || game.isVisible(e.x, e.y)),
			);
			const own = visible.filter((e) => e.team === (game.viewer ?? 0)),
				foes = visible.filter((e) => e.team !== (game.viewer ?? 0) && e.team !== 2);
			const combat = visible.some(
				(e) =>
					(e.target != null && e.cooldown > 0) ||
					(e.team === (game.viewer ?? 0) &&
						Number.isFinite(e.lastDamaged) &&
						game.time - e.lastDamaged < 2),
			);
			if (combat) {
				this.combatSince ??= game.time;
				if (game.time - this.combatSince >= 2)
					this.lastCombat = game.time;
			} else this.combatSince = null;
			const threat = foes.some((e) =>
				own.some((p) => Math.hypot(e.x - p.x, e.y - p.y) < 650),
			);
			this.pendingMood =
				game.time - this.lastCombat < 10
					? "battle"
					: game.time - this.lastCombat < 25
						? "recovery"
						: combat || threat
							? "tension"
							: game.research ||
								  game.queue?.length ||
								  own.some((e) => e.constructionLeft > 0)
								? "develop"
								: "explore";
		}
		setMusicVolume(value) {
			if (!Number.isFinite(value)) return;
			this.musicVolume = Math.max(0, Math.min(1, value));
			if (this.musicGain)
				this.musicGain.gain.setTargetAtTime(
					0.65 *
						this.musicVolume *
						(this.context.currentTime < this.duckUntil ? 0.55 : 1),
					this.context.currentTime,
					0.05,
				);
			this.settings();
		}
		setMuted(value) {
			this.muted = !!value;
			if (this.muted) this.silence();
			this.settings();
			if (!this.muted) this.scheduleMusic();
		}
		setVolume(value) {
			if (!Number.isFinite(value)) return;
			this.volume = Math.max(0, Math.min(1, value));
			if (this.effectsGain)
				this.effectsGain.gain.setTargetAtTime(
					this.volume,
					this.context.currentTime,
					0.02,
				);
			this.settings();
		}
		silence() {
			if (this.musicTimer) {
				clearTimeout(this.musicTimer);
				this.musicTimer = null;
			}
			for (const node of [...this.nodes]) {
				try {
					node.stop();
				} catch {}
			}
			this.musicNodes.clear();
			this.musicNextTime = 0;
			this.musicBeat = 0;
		}
		silenceEffects() {
			for (const node of [...this.nodes]) {
				if (!this.musicNodes.has(node)) {
					try {
						node.stop();
					} catch {}
				}
			}
		}
		stopMusic() {
			if (this.musicTimer) {
				clearTimeout(this.musicTimer);
				this.musicTimer = null;
			}
			for (const node of [...this.musicNodes]) {
				try {
					node.stop();
				} catch {}
			}
			this.musicNodes.clear();
			this.musicNextTime = 0;
			this.musicBeat = 0;
		}
		setMusicMode(mode) {
			if (!mode) return;
			if (this.musicMode !== mode) {
				this.stopMusic();
				this.musicMode = mode;
			}
			this.scheduleMusic();
		}
		tone(
			freq,
			end,
			duration,
			delay = 0,
			level = 0.1,
			type = "sine",
			pan = 0,
		) {
			if (this.voices - this.musicNodes.size >= this.maxVoices) return;
			const c = this.context,
				t = c.currentTime + delay,
				source = c.createOscillator(),
				gain = c.createGain();
			source.type = type;
			source.frequency.setValueAtTime(freq, t);
			source.frequency.exponentialRampToValueAtTime(
				Math.max(20, end),
				t + duration,
			);
			gain.gain.setValueAtTime(0.0001, t);
			gain.gain.exponentialRampToValueAtTime(
				Math.max(0.0002, level),
				t + 0.008,
			);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
			source.connect(gain);
			const output = this.connect(gain, pan);
			this.track(source, [gain, output]);
			source.start(t);
			source.stop(t + duration + 0.02);
		}
		noise(duration, level, pan = 0) {
			if (this.voices - this.musicNodes.size >= this.maxVoices) return;
			const c = this.context,
				t = c.currentTime,
				buffer = c.createBuffer(
					1,
					Math.ceil(c.sampleRate * duration),
					c.sampleRate,
				),
				data = buffer.getChannelData(0);
			let seed = 731;
			for (let i = 0; i < data.length; i++) {
				seed = (seed * 1664525 + 1013904223) >>> 0;
				data[i] = (seed / 4294967296) * 2 - 1;
			}
			const source = c.createBufferSource(),
				filter = c.createBiquadFilter(),
				gain = c.createGain();
			source.buffer = buffer;
			filter.type = "lowpass";
			filter.frequency.setValueAtTime(2000, t);
			filter.frequency.exponentialRampToValueAtTime(80, t + duration);
			gain.gain.setValueAtTime(0.0001, t);
			gain.gain.exponentialRampToValueAtTime(level, t + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
			source.connect(filter);
			filter.connect(gain);
			const output = this.connect(gain, pan);
			this.track(source, [filter, gain, output]);
			source.start(t);
			source.stop(t + duration + 0.02);
		}
		connect(gain, pan) {
			if (this.context.createStereoPanner) {
				const p = this.context.createStereoPanner();
				p.pan.value = Math.max(-1, Math.min(1, pan));
				gain.connect(p);
				p.connect(this.effectsGain || this.master);
				return p;
			}
			gain.connect(this.effectsGain || this.master);
			return null;
		}
		track(source, cleanup = [], music = false) {
			this.voices++;
			this.nodes.add(source);
			if (music) this.musicNodes.add(source);
			source.onended = () => {
				source.disconnect();
				cleanup.forEach((node) => node?.disconnect());
				this.nodes.delete(source);
				this.musicNodes.delete(source);
				this.voices = Math.max(0, this.voices - 1);
			};
		}
		setupMusicSpace() {
			const c = this.context,
				delay = c.createDelay(2),
				filter = c.createBiquadFilter(),
				wet = c.createGain();
			delay.delayTime.value = 0.31;
			filter.type = "lowpass";
			filter.frequency.value = 2400;
			wet.gain.value = 0.24;
			delay.connect(filter);
			filter.connect(wet);
			wet.connect(this.musicGain);
			this.musicDelay = delay;
			this.musicNoise = c.createBuffer(1, c.sampleRate, c.sampleRate);
			const data = this.musicNoise.getChannelData(0);
			let seed = 519;
			for (let i = 0; i < data.length; i++) {
				seed = (seed * 1664525 + 1013904223) >>> 0;
				data[i] = seed / 2147483648 - 1;
			}
		}
		instrument(kind, freq, start, duration, level, pan = 0) {
			if (this.musicNodes.size >= 96) return;
			const c = this.context,
				noise = kind === "hat" || kind === "snare",
				source = noise ? c.createBufferSource() : c.createOscillator(),
				filter = c.createBiquadFilter(),
				gain = c.createGain();
			if (noise) source.buffer = this.musicNoise;
			else {
				source.type = ["pad", "brass"].includes(kind)
					? "sawtooth"
					: ["arp", "bass", "strings"].includes(kind)
						? "triangle"
						: "sine";
				source.frequency.setValueAtTime(
					kind === "kick" ? 130 : freq,
					start,
				);
				if (kind === "kick")
					source.frequency.exponentialRampToValueAtTime(
						42,
						start + 0.15,
					);
				if (kind === "pad") source.detune.value = pan * 9;
			}
			filter.type = noise ? "highpass" : "lowpass";
			filter.frequency.setValueAtTime(
				kind === "hat"
					? 6500
					: kind === "snare"
						? 1500
						: kind === "pad"
							? 850
							: kind === "brass"
								? 1200
								: kind === "strings"
									? 1100
									: kind === "bass"
										? 420
										: 2800,
				start,
			);
			if (kind === "pad")
				filter.frequency.linearRampToValueAtTime(
					1600,
					start + duration * 0.45,
				);
			const attack = ["pad", "strings"].includes(kind)
				? 0.45
				: kind === "brass"
					? 0.18
					: kind === "lead"
						? 0.08
						: 0.008;
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.exponentialRampToValueAtTime(level, start + attack);
			if (["pad", "strings", "brass", "lead"].includes(kind))
				gain.gain.setValueAtTime(level * 0.75, start + duration * 0.65);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
			source.connect(filter);
			filter.connect(gain);
			const cleanup = [filter, gain];
			if (c.createStereoPanner) {
				const stereo = c.createStereoPanner();
				stereo.pan.value = pan;
				gain.connect(stereo);
				stereo.connect(this.musicGain);
				cleanup.push(stereo);
			} else gain.connect(this.musicGain);
			if (
				[
					"pad",
					"arp",
					"lead",
					"bell",
					"strings",
					"brass",
					"pluck",
				].includes(kind)
			)
				gain.connect(this.musicDelay);
			this.track(source, cleanup, true);
			source.start(start);
			source.stop(start + duration + 0.03);
		}
		musicStep(step, t) {
			if (this.musicMode === "intro") {
				// A self-contained 30-second cue: tension, pulse, signal, then hopeful resolution.
				const beat = 0.5,
					section = Math.min(5, Math.floor(step / 10)),
					pulse = step % 10,
					roots = [65.41, 55, 58.27, 73.42, 87.31, 130.81],
					base = roots[section];
				const note = (kind, n, duration, level, pan = 0, delay = 0) =>
					this.instrument(
						kind,
						base * 2 ** (n / 12),
						t + delay,
						duration,
						level,
						pan,
					);
				if (!pulse)
					[0, section === 5 ? 4 : 3, 7, 14].forEach((n, i) =>
						note("strings", n, 5.4, 0.022, (i - 1.5) * 0.4),
					);
				if (step < 60) {
					if (pulse % 2 === 0) note("bass", -12, 0.8, 0.045);
					if (section > 0 && section < 5 && pulse % 2 === 0)
						note("kick", 0, 0.28, 0.045);
					if (section >= 2 && section < 5) {
						note(
							"arp",
							[12, 19, 15, 22, 19][pulse % 5],
							0.24,
							0.02,
							Math.sin(step) * 0.5,
						);
						if (pulse === 4 || pulse === 9)
							note("snare", 0, 0.16, 0.013);
					}
					if (section === 3 && pulse % 3 === 0)
						note("bell", 24 + (pulse % 4), 1.6, 0.028, 0.35);
					if (section >= 4 && pulse % 3 === 0)
						note(
							"brass",
							[12, 19, 24, 28][Math.floor(pulse / 3)],
							1.4,
							0.028,
						);
				}
				return beat;
			}
			const mode = this.musicMode,
				menu = mode === "menu",
				ice = mode === "game:ice",
				ash = mode === "game:ash",
				sun = mode === "game:sun";
			const beat =
					60 / (menu ? 68 : ice ? 58 : ash ? 112 : sun ? 92 : 88),
				meter = menu || sun ? 6 : 8,
				bar = Math.floor(step / meter),
				pulse = step % meter;
			if (!menu && step % (meter * 2) === 0)
				this.musicMood = this.pendingMood || "explore";
			const root = menu
				? 130.81
				: ice
					? 174.61
					: ash
						? 73.42
						: sun
							? 146.83
							: 110;
			const progression = menu
				? [0, -5, 3, 7]
				: ice
					? [0, 5, 2, -3]
					: ash
						? [0, 0, -1, -5]
						: sun
							? [0, 5, 7, 0]
							: [0, 0, 5, -2];
			const base = root * 2 ** (progression[bar % 4] / 12),
				note = (kind, n, delay, duration, level, pan = 0) =>
					this.instrument(
						kind,
						base * 2 ** (n / 12),
						t + delay,
						duration,
						level *
							(menu
								? 1
								: {
										explore: 0.8,
										develop: 0.9,
										tension: 0.7,
										battle: 0.7,
										recovery: 0.6,
									}[this.musicMood] || 0.8),
						pan,
					);
			if (!menu) {
				const extra = (kind, n, duration, volume, delay = 0) =>
					this.instrument(
						kind,
						base * 2 ** (n / 12),
						t + delay,
						duration,
						volume,
						0,
					);
				if (this.musicMood === "develop" && pulse % 2 === 0)
					extra(
						"pluck",
						[12, 19, 24, 19][Math.floor(pulse / 2) % 4],
						beat * 0.8,
						0.025,
					);
				if (this.musicMood === "tension" && pulse % 2 === 0)
					extra("bass", -12, beat * 0.7, 0.04);
				if (this.musicMood === "battle") {
					if (pulse % 2 === 0) extra("kick", -12, 0.22, 0.065);
					if (pulse % 4 === 2) extra("snare", 0, 0.15, 0.025);
					if (!pulse) extra("brass", 7, beat * 2, 0.035);
				}
				if (this.musicMood === "recovery" && !pulse)
					extra("bell", 19, beat * 3, 0.02);
			}
			if (menu) {
				// Spacious orchestral 6-beat theme: strings and a slow brass melody.
				if (!pulse)
					[0, 3, 7, 12].forEach((n, i) =>
						note(
							"strings",
							n,
							0,
							beat * 6 + 0.7,
							0.03,
							(i - 1.5) * 0.35,
						),
					);
				if (pulse === 0 || pulse === 3) {
					note(
						"brass",
						[12, 19, 15, 22][(bar * 2 + (pulse === 3 ? 1 : 0)) % 4],
						0,
						beat * 2.7,
						0.035,
						0.08,
					);
					note("bass", -12, 0, beat * 2, 0.06);
				}
				if (pulse === 5 && bar % 2 === 1)
					note("bell", 24, 0, beat * 2, 0.018, 0.5);
			} else if (ice) {
				// Glacial ambient: sparse glass bells and suspended pads, no percussion.
				if (!pulse)
					[0, 7, 14].forEach((n, i) =>
						note("pad", n, 0, beat * 8 + 0.8, 0.022, (i - 1) * 0.6),
					);
				if ([0, 3, 6].includes(pulse))
					note(
						"bell",
						[24, 31, 38, 26][(bar + pulse) % 4],
						0,
						beat * 2.8,
						0.045,
						Math.sin(step) * 0.7,
					);
				if (pulse === 4) note("lead", 19, 0, beat * 3, 0.019, -0.4);
			} else if (ash) {
				// Industrial pulse: low ostinato, clipped synth and a driving drum pattern.
				note("bass", pulse % 3 === 0 ? -12 : 0, 0, beat * 0.42, 0.085);
				for (let i = 0; i < 2; i++)
					note(
						"arp",
						[0, 1, 7, 12][(step + i) % 4] + 12,
						(i * beat) / 2,
						beat * 0.23,
						0.026,
						i ? 0.5 : -0.5,
					);
				if (pulse % 2 === 0) note("kick", 0, 0, 0.22, 0.1);
				if (pulse === 2 || pulse === 6)
					note("snare", 0, 0, 0.16, 0.028, 0.1);
				note("hat", 0, beat * 0.5, 0.045, 0.015, -0.35);
				if (!pulse) note("brass", 7, 0, beat * 2, 0.02, 0.25);
			} else if (sun) {
				// Bright 6/8 exploration: major arpeggios and a buoyant melody.
				if (!pulse)
					[0, 4, 7].forEach((n, i) =>
						note("strings", n, 0, beat * 6, 0.025, (i - 1) * 0.5),
					);
				note(
					"pluck",
					[12, 16, 19, 24, 19, 16][pulse],
					0,
					beat * 0.9,
					0.05,
					Math.sin(step) * 0.45,
				);
				if (pulse === 0 || pulse === 3) {
					note("bass", -12, 0, beat * 1.6, 0.065);
					note(
						"lead",
						[24, 28, 31, 26][bar % 4],
						beat * 0.2,
						beat * 2,
						0.025,
						0.1,
					);
					note("kick", 0, 0, 0.2, 0.045);
				}
				if (pulse % 3 === 2) note("hat", 0, 0, 0.05, 0.009, -0.3);
			} else {
				// Desert caravan: pentatonic plucks, offbeat percussion and a low drone.
				if (!pulse) {
					note("pad", -12, 0, beat * 8, 0.045, -0.25);
					note("pad", 7, 0, beat * 8, 0.02, 0.25);
				}
				if ([0, 1, 3, 4, 6].includes(pulse))
					note(
						"pluck",
						[12, 15, 19, 22, 24, 19, 15, 12][pulse],
						pulse % 2 ? beat * 0.15 : 0,
						beat * 1.3,
						0.065,
						Math.sin(step) * 0.5,
					);
				if ([0, 3, 6].includes(pulse)) {
					note("kick", 0, 0, 0.18, 0.065);
					note("bass", -12, 0, beat * 0.7, 0.055);
				}
				if (pulse === 2 || pulse === 7)
					note("snare", 0, beat * 0.1, 0.09, 0.016, 0.35);
				if (pulse % 2) note("hat", 0, beat * 0.5, 0.05, 0.012, -0.3);
			}
			return beat;
		}
		scheduleMusic() {
			const c = this.context;
			if (
				!c ||
				c.state !== "running" ||
				this.muted ||
				!this.musicMode ||
				this.musicTimer
			)
				return false;
			if (!this.musicNextTime || this.musicNextTime < c.currentTime - 0.5)
				this.musicNextTime = c.currentTime + 0.08;
			// Audio-clock scheduling avoids a silent gap between phrases and timer drift.
			while (this.musicNextTime < c.currentTime + 0.3) {
				this.musicNextTime += this.musicStep(
					this.musicBeat++,
					this.musicNextTime,
				);
			}
			this.musicTimer = setTimeout(() => {
				this.musicTimer = null;
				this.scheduleMusic();
			}, 100);
			this.musicTimer.unref?.();
			return true;
		}
		// Gate (channels, ducking, rate limits, mute), then the voice. Extra options (faction, distance, ground)
		// are passed to the voice; the higher-quality module (audio-hq.js) replaces the voice only.
		play(kind, { pan = 0, level = 1, force = false, ...more } = {}) {
			const c = this.context;
			if (
				!c ||
				c.state !== "running" ||
				this.muted ||
				this.volume === 0 ||
				this.failed
			)
				return false;
			const category = this.soundCategory(kind);
			level *= this.channels[category];
			if (
				(category === "units" || category === "ambient") &&
				c.currentTime < this.duckUntil
			)
				level *= 0.3;
			if (level <= 0) return false;
			if (kind.startsWith("order-")) {
				if (
					c.currentTime -
						(this.last.get("order-group") ?? -Infinity) <
					0.65
				)
					return false;
				this.last.set("order-group", c.currentTime);
			}
			const interval =
				{
					shot: 0.075,
					rocket: 0.16,
					explosion: 0.12,
					alarm: 8,
					select: 0.12,
					click: 0.07,
					ready: 0.6,
					notice: 0.3,
				}[kind] ?? 0.3;
			if (
				!force &&
				c.currentTime - (this.last.get(kind) ?? -Infinity) < interval
			)
				return false;
			this.last.set(kind, c.currentTime);
			this.voice(kind, level, pan, more);
			return true;
		}
		// The synthesized voice of a sound.
		voice(kind, level, pan) {
			const tone = (a, b, d, delay = 0, g = 0.1, type = "sine") =>
				this.tone(a, b, d, delay, g * level, type, pan);
			switch (kind) {
				case "thunder":
					this.noise(1.6, 0.16 * level, pan);
					tone(65, 28, 1.8, 0, 0.12, "sine");
					break;
				case "bird":
					tone(1700, 2600, 0.12, 0, 0.025);
					tone(2200, 1600, 0.18, 0.17, 0.02);
					break;
				case "beast":
					tone(110, 60, 0.4, 0, 0.065, "sawtooth");
					this.noise(0.3, 0.025, pan);
					break;
				case "herd":
					tone(240, 140, 0.35, 0, 0.035, "triangle");
					break;
				case "engine":
					tone(58, 68, 0.65, 0, 0.05, "triangle");
					tone(115, 98, 0.6, 0, 0.015, "sine");
					break;
				case "robot-move":
					tone(180, 260, 0.22, 0, 0.035, "triangle");
					tone(330, 190, 0.18, 0.18, 0.018);
					break;
				case "robot-build":
					tone(850, 390, 0.09, 0, 0.035, "triangle");
					tone(620, 280, 0.1, 0.16, 0.025);
					this.noise(0.055, 0.018 * level, pan);
					break;
				case "robot-mine":
					tone(95, 140, 0.4, 0, 0.0175, "sawtooth");
					this.noise(0.16, 0.009 * level, pan);
					break;
				case "robot-gas":
					tone(165, 150, 0.5, 0, 0.0175, "sine");
					this.noise(0.4, 0.006 * level, pan);
					break;
				case "footstep":
					this.noise(0.055, 0.035 * level, pan);
					tone(95, 60, 0.055, 0.18, 0.014, "triangle");
					break;
				case "radio":
					tone(470, 640, 0.08, 0, 0.035);
					tone(350, 430, 0.1, 0.12, 0.03, "triangle");
					break;
				case "shot":
					tone(1050, 130, 0.13, 0, 0.09, "sawtooth");
					break;
				case "rocket":
					this.noise(0.22, 0.12 * level, pan);
					tone(190, 45, 0.28, 0, 0.16, "triangle");
					break;
				case "explosion":
					this.noise(0.6, 0.35 * level, pan);
					tone(95, 25, 0.5, 0, 0.3, "sine");
					break;
				case "alarm":
					for (let i = 0; i < 3; i++)
						tone(650, 880, 0.16, i * 0.24, 0.16, "triangle");
					break;
				case "ready":
					tone(440, 440, 0.13);
					tone(660, 660, 0.2, 0.13);
					break;
				case "capture":
				case "research":
					for (const [i, n] of [440, 554, 659, 880].entries())
						tone(n, n, 0.2, i * 0.1, 0.1);
					break;
				case "victory":
					for (const [i, n] of [392, 494, 587, 784, 988].entries())
						tone(n, n, 0.4, i * 0.17, 0.13, "triangle");
					break;
				case "defeat":
					for (const [i, n] of [330, 277, 220, 165].entries())
						tone(n, n * 0.95, 0.45, i * 0.18, 0.12, "triangle");
					break;
				case "start":
					tone(220, 440, 0.25);
					tone(660, 880, 0.3, 0.2);
					break;
				case "order-move":
					tone(380, 420, 0.09, 0, 0.035, "triangle");
					tone(560, 620, 0.12, 0.11, 0.035);
					break;
				case "order-attack":
					tone(220, 300, 0.1, 0, 0.045, "triangle");
					tone(680, 480, 0.14, 0.12, 0.04);
					break;
				case "order-hold":
					tone(480, 480, 0.13, 0, 0.035);
					tone(320, 320, 0.16, 0.16, 0.035);
					break;
				case "order-formation":
					tone(400, 500, 0.08, 0, 0.03);
					tone(500, 600, 0.08, 0.1, 0.03);
					tone(600, 700, 0.08, 0.2, 0.03);
					break;
				case "order-board":
					tone(280, 440, 0.2, 0, 0.035, "triangle");
					tone(520, 520, 0.08, 0.23, 0.03);
					break;
				case "order-unload":
					tone(520, 320, 0.18, 0, 0.035, "triangle");
					tone(360, 360, 0.08, 0.2, 0.03);
					break;
				case "command":
					tone(510, 760, 0.1, 0, 0.08);
					break;
				case "select":
					tone(730, 850, 0.055, 0, 0.045);
					break;
				case "click":
					tone(420, 600, 0.05, 0, 0.045);
					break;
				default:
					tone(360, 450, 0.11, 0, 0.055);
					break;
			}
		}
		update(
			game,
			{
				paused = false,
				hidden = false,
				cameraX = 1100,
				viewWidth = 2200,
				cameraY = 700,
				viewHeight = 1400,
			} = {},
		) {
			const notifications = game.soundEvents?.splice(0) || [];
			if (!paused && !hidden) this.updateMusicState(game);
			const clock = this.context?.currentTime || 0;
			if (
				!hidden &&
				notifications.some((k) =>
					[
						"alarm",
						"victory",
						"defeat",
						"research",
						"capture",
					].includes(k),
				)
			)
				this.duckUntil = clock + 2.5;
			const duck = clock < this.duckUntil ? 0.55 : 1;
			if (this.musicGain && this.lastDuck !== duck) {
				this.musicGain.gain.setTargetAtTime(
					0.65 * this.musicVolume * duck,
					clock,
					0.18,
				);
				this.lastDuck = duck;
			}
			// Important notifications get voices before ambience and weapon effects.
			if (!hidden)
				for (const kind of notifications)
					if (!paused || kind === "notice") this.play(kind);
			if (this.ambientGame !== game) {
				this.ambientGame = game;
				this.nextAmbient = 0;
				this.nextActivity = 0;
			}
			if (
				!paused &&
				!hidden &&
				game.wildlife &&
				game.time > (this.nextAmbient || 0)
			) {
				this.nextAmbient = game.time + 4;
				const nearby = game
					.wildlife()
					.filter(
						(a) =>
							a.kind !== "fish" &&
							game.isVisible(a.x, a.y) &&
							Math.abs(a.x - cameraX) < viewWidth / 2 &&
							Math.abs(a.y - cameraY) < viewHeight / 2,
					);
				const animal =
					nearby[
						Math.floor(game.time / 4) % Math.max(1, nearby.length)
					];
				if (animal)
					this.play(animal.kind === "bird" ? "bird" : "herd", {
						pan: (animal.x - cameraX) / (viewWidth / 2),
						level: 0.5,
					});
			}
			if (!paused && !hidden && game.time >= (this.nextActivity || 0)) {
				this.nextActivity = game.time + 0.7;
				const sounds = new Map();
				for (const e of game.entities || []) {
					if (
						e.hp <= 0 ||
						!game.isVisible(e.x, e.y) ||
						Math.abs(e.x - cameraX) > viewWidth / 2 ||
						Math.abs(e.y - cameraY) > viewHeight / 2
					)
						continue;
					let kind = null;
					const target = game.get?.(e.order?.targetId),
						moving = !!e.path?.length;
					if (e.type === "worker") {
						if (
							["build", "repair"].includes(e.order?.kind) &&
							target &&
							Math.hypot(target.x - e.x, target.y - e.y) < 100
						)
							kind = "robot-build";
						else if (e.order?.kind === "gas" && !moving) {
							const extractor = game.get?.(e.order.extractorId);
							if (
								extractor &&
								!extractor.constructionLeft &&
								Math.hypot(
									extractor.x - e.x,
									extractor.y - e.y,
								) < 80
							)
								kind = "robot-gas";
						} else if (
							e.order?.kind === "gather" &&
							!moving &&
							!e.order.returning
						) {
							const ore = game
								.resourceFields?.(e.order.resource)
								?.find((o) => o.id === e.order.oreId);
							if (
								ore?.amount > 0 &&
								Math.hypot(ore.x - e.x, ore.y - e.y) < 48
							)
								kind = "robot-mine";
						} else if (moving) kind = "robot-move";
					} else if (moving)
						kind =
							e.type === "beast"
								? "beast"
								: ["trooper", "rocket"].includes(e.type)
									? "footstep"
									: "engine";
					if (kind) {
						const d = Math.hypot(e.x - cameraX, e.y - cameraY),
							old = sounds.get(kind);
						if (!old || d < old.d) sounds.set(kind, { e, d });
					}
				}
				const biome = root.RTS?.MISSIONS?.[game.missionId]?.biome,
					theme = root.RTS?.MISSIONS?.[game.missionId]?.theme;
				for (const [kind, { e, d }] of [...sounds]
					.sort((a, b) => a[1].d - b[1].d)
					.slice(0, 4))
					this.play(kind, {
						pan: Math.max(
							-1,
							Math.min(1, (e.x - cameraX) / (viewWidth / 2)),
						),
						level: Math.max(
							0.25,
							1 - d / Math.max(viewWidth, viewHeight),
						),
						far: Math.min(1, d / (Math.max(viewWidth, viewHeight) / 2)),
						biome,
						theme,
						faction: e.faction,
					});
			}
			let effectVoices = 0;
			for (const effect of game.effects) {
				if (this.seen.has(effect)) continue;
				this.seen.add(effect);
				if (paused || hidden || !game.isVisible(effect.x, effect.y))
					continue;
				if (
					Math.abs(effect.x - cameraX) > viewWidth / 2 ||
					Math.abs(effect.y - cameraY) > viewHeight / 2
				)
					continue;
				if (effectVoices >= 12) continue;
				effectVoices++;
				if (
					effect.kind === "shot" ||
					effect.kind === "explosion" ||
					effect.kind === "command"
				)
					this.play(
						effect.kind === "shot" && effect.rocket
							? "rocket"
							: effect.kind,
						{
							pan: (effect.x - cameraX) / (viewWidth / 2),
							level: effect.kind === "command" ? 1 : 0.7,
							// For the sampled voices: distance from the view centre (0–1) and the shooter's faction.
							far: Math.min(1, Math.hypot(effect.x - cameraX, effect.y - cameraY) / (Math.max(viewWidth, viewHeight) / 2)),
							faction: effect.team != null ? game.factionFor?.(effect.team)?.key : undefined,
						},
					);
			}
		}
	}
	if (typeof module !== "undefined" && module.exports)
		module.exports = { GameAudio };
	root.GameAudio = GameAudio;
})(typeof window !== "undefined" ? window : globalThis);
