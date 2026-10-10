(function (root) {
	"use strict";
	// Instruments of the cinematic score (cinematic()): pipe organ, a wordless choir, the low brass blast, war
	// drums, the ticking clock, a throat drone, a wailing solo voice and a soft piano; for the eerie themes an
	// echoing flute, bowed metal, a heartbeat, the hum of a ship, a hiss and an anvil.
	const CINEMATIC = new Set(["organ", "choir", "chant", "braam", "taiko", "tick", "drone", "wail", "piano", "flute", "metal", "heart", "hum", "hiss", "anvil"]);
	// The eerie themes: tempo, the root, the mode (semitones), the bed under them, the instrument of the call and
	// the bar of the four in which it sounds, and what else they have (clicks, hiss, anvil).
	const EERIE = {
		// "Wrak" — a dead ship: the hum of the hull, a flute calling into the dark, metal groaning.
		"game:wreck": { bpm: 54, root: 69.3, scale: [0, 1, 3, 6, 7, 8, 11], bed: "hum", call: "flute", callOctave: 24, callBar: 1, braam: 0 },
		// "Ul" — the Swarm: a low cluster, clicks and hisses in the walls, bells of ice.
		"game:hive": { bpm: 72, root: 61.74, scale: [0, 1, 4, 6, 7, 10], bed: "cluster", call: "flute", callOctave: 36, callBar: 2, braam: 1, clicks: true, hiss: true },
		// "Gąszcz" — alien jungles and floating islands: a breathing choir, glass bells in a whole-tone haze.
		"game:lumen": { bpm: 60, root: 87.31, scale: [0, 2, 4, 6, 8, 10], bed: "choir", call: "bell", callOctave: 24, callBar: 0, braam: -2, hiss: true },
		// "Kuźnia" — magma and the Hefajstos complex: a furnace drone, the anvil keeping time, heavy metal.
		"game:forge": { bpm: 84, root: 58.27, scale: [0, 1, 3, 5, 6, 8, 10], bed: "drone", call: "flute", callOctave: 24, callBar: 3, braam: 0, anvil: true },
		// The new worlds (0.167). "Przypływ" — Thalassa: an open major pentatonic, the choir like wind over water,
		// a flute calling, the surf breaking and drawing back (waves).
		"game:tide": { bpm: 64, root: 98, scale: [0, 2, 4, 7, 9], bed: "choir", call: "flute", callOctave: 24, callBar: 1, braam: -2, waves: true },
		// "Kryształ" — the crystal ridges of Nivalis: the hum of the pillars, high glass bells glinting (chimes).
		"game:crystal": { bpm: 58, root: 92.5, scale: [0, 2, 3, 7, 9, 10], bed: "hum", call: "bell", callOctave: 36, callBar: 2, braam: -1, chimes: true },
		// "Ruiny" — the Precursors' city on Nadir: an ancient mode over a drone, the wind; since 0.167.3 the flute's
		// call echoing off the walls (echoes), the citadel's gong every eight bars (gong) and a ritual frame drum.
		"game:ruins": { bpm: 62, root: 65.41, scale: [0, 1, 4, 5, 7, 8, 10], bed: "drone", call: "flute", callOctave: 24, callBar: 0, braam: 0, hiss: true, echoes: true, gong: true, ritual: true },
		// "Bastion" — the Admiralty's fortress: a minor march, a snare keeping step behind the walls; since 0.167.4 the
		// garrison's bugle call on brass (fanfare), low strings pulsing with the march (ostinato) and distant guns.
		"game:bastion": { bpm: 76, root: 55, scale: [0, 2, 3, 5, 7, 8, 10], bed: "drone", call: "flute", callOctave: 24, callBar: 2, braam: 0, march: true, fanfare: true, ostinato: true, guns: true },
		// "Archiwum" — the archive under the ice of Vesper: harmonic minor, the choir in the cold, a music box (an old
		// tune locked under the ice, 0.167.2) and the ice cracking and groaning now and then (cracks).
		"game:archive": { bpm: 56, root: 82.41, scale: [0, 2, 3, 5, 7, 8, 11], bed: "choir", call: "bell", callOctave: 24, callBar: 3, braam: -1, musicBox: true, cracks: true },
		// The valley of Eos (0.167.1), twice: "Latarnie" — chapter I, a bright major, the choir, and the beacon's bell
		// signalling every two bars; "Popioły" — chapter XI, the same root and the same call in the minor over a
		// drone, the wind, the beacon only now and then, faint (dim) — the valley after the landing.
		"game:beacons": { bpm: 70, root: 110, scale: [0, 2, 4, 5, 7, 9, 11], bed: "choir", call: "flute", callOctave: 24, callBar: 0, braam: -2, beacon: true },
		"game:ashes": { bpm: 66, root: 110, scale: [0, 2, 3, 5, 7, 8, 10], bed: "drone", call: "flute", callOctave: 24, callBar: 0, braam: 0, hiss: true, beacon: "dim" },
		// The remaining maps (0.168). "Wydmy" — Cichy Horyzont, Khepri IV: a double harmonic mode over a drone, a
		// wailing voice over the dune sea, the sand blowing, and something huge moving under it (rumble).
		"game:dunes": { bpm: 60, root: 87.31, scale: [0, 1, 4, 5, 7, 8, 11], bed: "drone", call: "wail", callOctave: 12, callBar: 1, braam: -1, hiss: true, rumble: true },
		// "Szron" — Biały Przesmyk, the frozen outpost (and chapter VIII): the hum of dead modules, a bell, the frozen
		// hive clicking in the walls, the ice cracking.
		"game:frost": { bpm: 58, root: 77.78, scale: [0, 1, 3, 5, 6, 8, 10], bed: "hum", call: "bell", callOctave: 24, callBar: 2, braam: -1, clicks: true, cracks: true },
		// "Szczyty" — Wiszące Szczyty, islands in the air: lydian, a high choir, a flute, a harp rising, the mist.
		"game:skyfall": { bpm: 66, root: 98, scale: [0, 2, 4, 6, 7, 9, 11], bed: "choir", call: "flute", callOctave: 24, callBar: 3, braam: -2, harp: true, hiss: true },
		// "Oaza" — Słoneczna Dolina, Helion II: warm mixolydian, a lute-like harp, a hand drum, a low flute.
		"game:oasis": { bpm: 72, root: 116.54, scale: [0, 2, 4, 5, 7, 9, 10], bed: "choir", call: "flute", callOctave: 12, callBar: 0, braam: -2, harp: true, ritual: true },
		// "Konwój" — chapter V, the last convoy through the mountain pass: low strings driving on, the snow wind,
		// the flute echoing between the walls of the pass.
		"game:convoy": { bpm: 80, root: 73.42, scale: [0, 2, 3, 5, 7, 8, 10], bed: "drone", call: "flute", callOctave: 24, callBar: 1, braam: 0, ostinato: true, hiss: true, echoes: true },
		// "Sygnał" — chapter IV, the signal from under the sand: a strange mode, the hum, a bell, the signal beeping
		// in a pattern (morse) and the rumble of what lies buried.
		"game:signal": { bpm: 64, root: 92.5, scale: [0, 1, 5, 7, 8], bed: "hum", call: "bell", callOctave: 24, callBar: 2, braam: -1, morse: true, rumble: true },
	};
	// The space themes (0.145), in the manner of the "Interstellar" score — by its means, not its melodies:
	// a pipe organ turning one small arpeggio over and over above slow chords, the clock ticking the beat,
	// a lone piano, layers gathering every eight bars to a full organ and a sudden silence; in battle the
	// organ drives an ostinato in sixteenths over drums and blasts. Chords: [step from the root, quality]
	// (m minor, M major, s sus2) — one a bar, or one every two bars (hold).
	const SPACE_MUSIC = {
		// "Orbita" (Kharon): the organ's turning figure in A minor, hopeful and sad, the clock, the piano.
		"game:orbit": { bpm: 72, root: 110, prog: [[0, "m"], [0, "m"], [-4, "M"], [-4, "M"], [3, "M"], [3, "M"], [-2, "M"], [-2, "M"]], hold: 1, lead: "organ", top: "piano" },
		// "Pierścienie" (Glacjalis): glassy — the figure on piano and bells high up, sus chords, the organ only as
		// the layers gather.
		"game:glacis": { bpm: 66, root: 123.47, prog: [[0, "s"], [0, "s"], [5, "M"], [5, "s"], [-3, "m"], [-3, "m"], [2, "s"], [7, "s"]], hold: 1, lead: "piano", top: "bell", high: 12 },
		// "Horyzont zdarzeń" (Wrota Pustki): slow and vast — long organ chords like a gravity well, the clock
		// louder than anything, a far piano echoing, silence in between.
		"game:void": { bpm: 48, root: 55, prog: [[0, "m"], [-1, "M"], [-5, "M"], [-3, "m"]], hold: 2, lead: "chords", top: "piano", deep: true },
		// "Requiem floty" (Cmentarzysko Floty): a chorale for the dead fleet — choir and organ in D minor, the
		// clock, low brass far off.
		"game:requiem": { bpm: 56, root: 73.42, prog: [[0, "m"], [-2, "M"], [-4, "M"], [-5, "M"], [0, "m"], [3, "M"], [-7, "m"], [-5, "M"]], hold: 1, lead: "chorale", top: "flute" },
		// "Doki" (0.167, Doki Eos): the Colonies' shipyard — hopeful, in D major, the organ's figure and bells.
		"game:docks": { bpm: 76, root: 146.83, prog: [[0, "M"], [0, "M"], [7, "M"], [7, "M"], [-3, "m"], [-3, "m"], [5, "M"], [5, "s"]], hold: 1, lead: "organ", top: "bell" },
		// "Mgławica" (Szkarłatna Mgławica): dark and slow, long organ chords and a drone, a flute lost in the red.
		"game:nebula": { bpm: 52, root: 61.74, prog: [[0, "m"], [1, "M"], [-2, "m"], [0, "s"]], hold: 2, lead: "chords", top: "flute", deep: true },
		// "Komety" (Szlak Komet): bright and moving — the piano's figure high up, sus chords, bells like ice dust.
		"game:comets": { bpm: 80, root: 130.81, prog: [[0, "s"], [4, "m"], [9, "m"], [5, "M"], [0, "s"], [7, "s"], [5, "M"], [2, "s"]], hold: 1, lead: "piano", top: "bell", high: 12 },
	};
	// The scores of the prologues of acts II-IV (0.171), in the manner of "Interstellar" like the campaign's prologue:
	// a root, the parts by the shots of their films (seconds from the start, a mood each) and the end. Moods: hope (a
	// major key, a piano arpeggio, strings), mystery (a minor key, signal-like bells, a soft pedal), quiet (a lone piano,
	// a soft choir), threat (a drone, a heartbeat, a blast as it begins), battle (blasts on the bar, war drums, strings),
	// mission (the organ's turning figure, the drums gathering in its second half), title (a great chord, a sudden
	// silence, one piano note). tests/audio.test.js keeps the parts in step with Act2Film, Act3Film and Act4Film.
	const STORIES = {
		prologue2: { root: 82.41, end: 76, parts: [[0, "hope"], [9, "mystery"], [18, "quiet"], [28, "threat"], [38, "mystery"], [47, "battle"], [57, "mission"], [66, "title"]] },
		prologue3: { root: 69.3, end: 76, parts: [[0, "battle"], [9, "mystery"], [18, "quiet"], [28, "threat"], [37, "quiet"], [47, "mission"], [56, "battle"], [66, "title"]] },
		prologue4: { root: 87.31, end: 76, parts: [[0, "hope"], [9, "threat"], [18, "battle"], [28, "mystery"], [37, "threat"], [47, "battle"], [56, "mystery"], [66, "title"]] },
	};
	// The parts of the campaign finale's score (seconds), by the shots of its film (campaign-finale.js, LENGTHS: 10, 9, 9,
	// 10, 9, 9, 10, 9, 9, 9, 10, 9, 10); tests/audio.test.js keeps them in step with the film.
	const FINALE = { rifts: 10, home: 19, eos: 28, beacon: 38, hefajstos: 47, heart: 56, council: 66, network: 75, people: 84, log: 93, routes: 103, end: 112, cut: 118, stop: 122 };
	// The parts of the campaign prologue's score (seconds), by the shots of its film (campaign-film.js, LENGTHS: 9, 10,
	// 10, 9, 10, 10, 10, 10, 10, 11, 10, 10, 11, 10, 10); tests/audio.test.js keeps them in step with the film.
	const PROLOGUE = { network: 19, routes: 29, dominion: 38, blockade: 48, dark: 58, ultimatum: 68, lira: 78, transmission: 88, mission: 99, run: 109, descent: 119, landing: 130, title: 140, cut: 146, end: 150 };
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
					// The notes of the piece playing go through its own bus, which fades out when the music changes
					// (0.171.14: every change of theme cut the sounding notes, with clicks).
					this.musicBus = this.context.createGain();
					this.musicBus.connect(this.musicGain);
					this.setupMusicSpace();
					const limiter = this.context.createDynamicsCompressor();
					limiter.threshold.value = -12;
					limiter.knee.value = 8;
					limiter.ratio.value = 12;
					limiter.attack.value = 0.003;
					limiter.release.value = 0.15;
					this.master.connect(limiter);
					// A soft clip after the compressor (0.171.14): its 3 ms attack let the peaks of a dense battle
					// through, above full scale.
					const clip = this.context.createWaveShaper(),
						curve = new Float32Array(1024);
					for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / (curve.length - 1)) * 4 - 2);
					clip.curve = curve;
					clip.oversample = "2x";
					limiter.connect(clip);
					clip.connect(this.context.destination);
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
			// A theme played from the settings keeps its mood until the preview ends.
			if (this.musicPreview) return;
			if (this.scoreGame !== game) {
				this.scoreGame = game;
				this.musicBeats = {};
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
		// The music fades out (and remembers where a battle theme was), the effects stop.
		silence() {
			this.stopMusic();
			this.silenceEffects();
		}
		// Window left or the tab hidden (0.171.14): the whole sound waits where it is and goes on when the player comes
		// back (unlock) — silence() had stopped the music, and it came back from its start only at the next press; a
		// film's score then no longer matched its shots.
		suspend() {
			if (this.context?.state === "running") this.context.suspend?.();
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
		// Battle themes are taken up again where they were (0.171.14: every visit to the pause menu restarted them,
		// and the space themes only reach their full organ after a minute); the films and the menu start over.
		resumable(mode) {
			return !!mode && mode !== "menu" && !mode.startsWith("intro") && !mode.startsWith("prologue") && mode !== "finale";
		}
		stopMusic(fade = 0.25) {
			if (this.musicTimer) {
				clearTimeout(this.musicTimer);
				this.musicTimer = null;
			}
			if (this.resumable(this.musicMode)) (this.musicBeats ||= {})[this.musicMode] = this.musicBeat;
			const c = this.context;
			if (c && this.musicBus && fade > 0 && c.state === "running") {
				// The sounding notes fade out with their bus; the next piece gets a new one.
				const old = this.musicBus,
					t = c.currentTime;
				old.gain.cancelScheduledValues(t);
				old.gain.setValueAtTime(old.gain.value, t);
				old.gain.linearRampToValueAtTime(0.0001, t + fade);
				for (const node of [...this.musicNodes]) {
					try {
						node.stop(t + fade + 0.02);
					} catch {}
				}
				setTimeout(() => {
					try {
						old.disconnect();
					} catch {}
				}, (fade + 0.3) * 1000)?.unref?.();
				this.musicBus = c.createGain();
				this.musicBus.connect(this.musicGain);
			} else
				for (const node of [...this.musicNodes]) {
					try {
						node.stop();
					} catch {}
				}
			this.musicNodes.clear();
			this.musicNextTime = 0;
			this.musicBeat = this.musicBeats?.[this.musicMode] || 0;
		}
		// The current theme from its first step (a replayed epilogue: the mode did not change, so nothing played).
		restartMusic(mode) {
			this.stopMusic();
			if (this.musicBeats) delete this.musicBeats[mode];
			this.musicMode = null;
			this.musicBeat = 0;
			this.setMusicMode(mode);
		}
		// Listening from the settings: a theme (menu, intro, game:dust/sun/ice/ash) in a chosen mood, held until
		// stopPreview() (or another theme). The intro loops.
		previewMusic(mode, mood = "explore") {
			this.musicPreview = { mode, mood };
			this.pendingMood = this.musicMood = mood;
			if (this.musicBeats) delete this.musicBeats[mode];
			if (this.musicMode === mode) {
				this.stopMusic();
				this.musicMode = null;
			}
			this.musicBeat = 0;
			this.setMusicMode(mode);
			return true;
		}
		stopPreview() {
			if (!this.musicPreview) return false;
			this.musicPreview = null;
			this.pendingMood = this.musicMood = "explore";
			return true;
		}
		setMusicMode(mode) {
			if (!mode) return;
			if (this.musicMode !== mode) {
				this.stopMusic();
				this.musicMode = mode;
				this.musicBeat = this.musicBeats?.[mode] || 0;
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
			if (this.effectVoices() >= this.maxVoices) return;
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
			if (this.effectVoices() >= this.maxVoices) return;
			const c = this.context,
				t = c.currentTime,
				buffer = this.noiseBuffer(duration);
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
		// Voices of the effects: all but the music's and the radio speech's (0.171.14: a radio line scheduled up to 69
		// syllables at once and every effect — shots, blasts, clicks — fell silent for its 4 s).
		effectVoices() {
			return this.voices - this.musicNodes.size - (this.speechNodes?.size || 0);
		}
		// White noise for the effects: one buffer, grown when a longer one is asked for (it was made and filled anew
		// for every shot and blast).
		noiseBuffer(duration) {
			const c = this.context,
				need = Math.ceil(c.sampleRate * Math.max(duration, 2));
			if (!this._noise || this._noise.length < need || this._noise.sampleRate !== c.sampleRate) {
				const buffer = c.createBuffer(1, need, c.sampleRate),
					data = buffer.getChannelData(0);
				let seed = 731;
				for (let i = 0; i < data.length; i++) {
					seed = (seed * 1664525 + 1013904223) >>> 0;
					data[i] = (seed / 4294967296) * 2 - 1;
				}
				this._noise = buffer;
			}
			return this._noise;
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
			// A radio line marks its sources while it is being scheduled (audio-radio.js).
			if (this.trackingSpeech) (this.speechNodes ||= new Set()).add(source);
			source.onended = () => {
				source.disconnect();
				cleanup.forEach((node) => node?.disconnect());
				this.nodes.delete(source);
				this.musicNodes.delete(source);
				this.speechNodes?.delete(source);
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
			// Below about 38 Hz a note is felt more than heard and only fills the limiter (0.171.14): an octave up.
			while (freq > 0 && freq < 38) freq *= 2;
			if (CINEMATIC.has(kind)) return this.cinematic(kind, freq, start, duration, level, pan);
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
				stereo.connect(this.musicBus || this.musicGain);
				cleanup.push(stereo);
			} else gain.connect(this.musicBus || this.musicGain);
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
		// One voice of the cinematic score: oscillators → (filters) → an envelope → pan → music bus, with sends to
		// the echo and (with audio-hq.js) the music reverb.
		cinematic(kind, freq, start, duration, level, pan = 0) {
			if (this.musicNodes.size >= 120) return;
			const c = this.context,
				end = start + duration,
				env = c.createGain(),
				nodes = [env],
				sources = [];
			const osc = (type, f, detune = 0) => {
				const o = c.createOscillator();
				o.type = type;
				o.frequency.setValueAtTime(f, start);
				o.detune.value = detune;
				sources.push(o);
				return o;
			};
			const into = (node, target, gain = 1) => {
				if (gain === 1) return node.connect(target);
				const g = c.createGain();
				g.gain.value = gain;
				node.connect(g);
				g.connect(target);
				nodes.push(g);
			};
			const lfo = (rate, depth, target) => {
				const l = c.createOscillator(),
					d = c.createGain();
				l.frequency.value = rate;
				d.gain.value = depth;
				l.connect(d);
				d.connect(target);
				nodes.push(d);
				sources.push(l);
			};
			// Envelope: attack, a slow fall to the release.
			const shape = (attack, release, sustain = 0.8) => {
				env.gain.setValueAtTime(0.0001, start);
				env.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), start + attack);
				env.gain.exponentialRampToValueAtTime(Math.max(0.0002, level * sustain), Math.max(start + attack + 0.01, end - release));
				env.gain.exponentialRampToValueAtTime(0.0001, end);
			};
			let send = 0.3,
				echo = false;
			if (kind === "organ") {
				// Pipe organ: 8', 4' and 2' ranks, slightly out of tune with each other, a soft wind attack.
				for (const [m, g, type, d] of [[1, 1, "sine", 0], [2, 0.55, "sine", 3], [4, 0.2, "triangle", -4], [0.5, freq > 160 || freq < 76 ? 0 : 0.45, "sine", 0]]) if (g) into(osc(type, freq * m, d), env, g);
				shape(0.07, 0.22, 0.95);
				send = 0.55;
			} else if (kind === "choir" || kind === "chant") {
				// A wordless choir ("aa"; the low chant "oo"): detuned saws through two vowel formants, vibrato.
				const [f1, f2] = kind === "chant" ? [420, 780] : [760, 1180],
					mix = c.createGain();
				for (const d of [-9, 0, 8]) {
					const o = osc("sawtooth", freq, d);
					lfo(5 + d * 0.03, freq * 0.004, o.frequency);
					o.connect(mix);
				}
				nodes.push(mix);
				for (const [f, q, g] of [[f1, 5, 1], [f2, 7, 0.55]]) {
					const b = c.createBiquadFilter();
					b.type = "bandpass";
					b.frequency.value = f;
					b.Q.value = q;
					mix.connect(b);
					into(b, env, g * 1.6);
					nodes.push(b);
				}
				shape(kind === "chant" ? 0.35 : 0.8, 1.2, 0.85);
				send = 0.7;
			} else if (kind === "braam") {
				// The low brass blast: detuned saws on the root, its fifth and the octave below, driven, the filter
				// tearing open and closing again; a sub underneath.
				const mix = c.createGain(),
					drive = c.createWaveShaper(),
					filter = c.createBiquadFilter(),
					curve = new Float32Array(256);
				for (let k = 0; k < 256; k++) curve[k] = Math.tanh(((k / 255) * 2 - 1) * 3);
				drive.curve = curve;
				for (const [m, d] of [[1, -12], [1, 11], [1.5, 0], [0.5, 4]]) osc("sawtooth", freq * m, d).connect(mix);
				filter.type = "lowpass";
				filter.Q.value = 4;
				filter.frequency.setValueAtTime(140, start);
				filter.frequency.exponentialRampToValueAtTime(1500, start + 0.4);
				filter.frequency.exponentialRampToValueAtTime(260, end);
				mix.connect(drive);
				drive.connect(filter);
				into(filter, env, 0.5);
				if (freq >= 76) into(osc("sine", freq * 0.5), env, 0.9);
				nodes.push(mix, drive, filter);
				shape(0.12, duration * 0.6, 0.7);
				send = 0.6;
			} else if (kind === "taiko") {
				// A war drum: a falling skin tone and a dull thud of noise.
				const skin = osc("sine", freq);
				skin.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.48), start + 0.35);
				into(skin, env, 1);
				const hit = c.createBufferSource(),
					lp = c.createBiquadFilter();
				hit.buffer = this.musicNoise;
				lp.type = "lowpass";
				lp.frequency.value = 700;
				const hg = c.createGain();
				hg.gain.setValueAtTime(0.6, start);
				hg.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
				hit.connect(lp);
				lp.connect(hg);
				hg.connect(env);
				sources.push(hit);
				nodes.push(lp, hg);
				env.gain.setValueAtTime(0.0001, start);
				env.gain.exponentialRampToValueAtTime(level, start + 0.006);
				env.gain.exponentialRampToValueAtTime(0.0001, end);
				send = 0.4;
			} else if (kind === "tick") {
				// The clock: a short dry click (tick higher, tock lower).
				const click = c.createBufferSource(),
					bp = c.createBiquadFilter();
				click.buffer = this.musicNoise;
				bp.type = "bandpass";
				bp.frequency.value = freq;
				bp.Q.value = 6;
				click.connect(bp);
				into(bp, env, 3);
				sources.push(click);
				nodes.push(bp);
				env.gain.setValueAtTime(0.0001, start);
				env.gain.exponentialRampToValueAtTime(level, start + 0.002);
				env.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);
				send = 0.15;
			} else if (kind === "drone") {
				// A throat drone: two saws a hair apart and a sub, the filter breathing slowly.
				const filter = c.createBiquadFilter();
				filter.type = "lowpass";
				filter.Q.value = 6;
				filter.frequency.value = 320;
				lfo(0.13, 180, filter.frequency);
				for (const d of [-6, 7]) osc("sawtooth", freq, d).connect(filter);
				into(filter, env, 0.8);
				if (freq >= 76) into(osc("sine", freq * 0.5), env, 0.7);
				nodes.push(filter);
				shape(Math.min(2.5, duration * 0.3), Math.min(2.5, duration * 0.3), 0.9);
				send = 0.45;
			} else if (kind === "wail") {
				// A solo voice: scooping up into the note, a vibrato that widens, a nasal formant.
				const o = osc("triangle", freq * 0.94),
					o2 = osc("sawtooth", freq * 0.94, 5),
					bp = c.createBiquadFilter();
				for (const v of [o, o2]) v.frequency.exponentialRampToValueAtTime(freq, start + 0.14);
				const vib = c.createGain();
				vib.gain.setValueAtTime(0, start);
				vib.gain.linearRampToValueAtTime(freq * 0.012, start + duration * 0.7);
				const l = c.createOscillator();
				l.frequency.value = 5.6;
				l.connect(vib);
				vib.connect(o.frequency);
				vib.connect(o2.frequency);
				sources.push(l);
				nodes.push(vib);
				bp.type = "bandpass";
				bp.frequency.value = 1100;
				bp.Q.value = 1.4;
				o.connect(bp);
				into(o2, bp, 0.25);
				into(bp, env, 1.4);
				nodes.push(bp);
				shape(0.18, Math.min(0.6, duration * 0.4), 0.85);
				send = 0.65;
				echo = true;
			} else if (kind === "flute") {
				// A breathy flute whose notes repeat in a long tape echo.
				const o = osc("sine", freq),
					breath = c.createBufferSource(),
					bp = c.createBiquadFilter(),
					bg = c.createGain();
				lfo(4.8, freq * 0.006, o.frequency);
				into(o, env, 1);
				into(osc("sine", freq * 2), env, 0.12);
				breath.buffer = this.musicNoise;
				breath.loop = true;
				bp.type = "bandpass";
				bp.frequency.value = freq * 2;
				bp.Q.value = 3;
				bg.gain.value = 0.18;
				breath.connect(bp);
				bp.connect(bg);
				bg.connect(env);
				sources.push(breath);
				nodes.push(bp, bg);
				shape(0.12, Math.min(0.5, duration * 0.4), 0.8);
				send = 0.6;
				echo = true;
			} else if (kind === "metal") {
				// Bowed metal: inharmonic partials sliding a little, a slow swell (an eerie sheet of steel).
				for (const [m, g] of [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]]) {
					const o = osc("sine", freq * m);
					o.frequency.linearRampToValueAtTime(freq * m * (1 + 0.025 * Math.sin(m)), end);
					lfo(0.3 + m * 0.11, freq * m * 0.004, o.frequency);
					into(o, env, g);
				}
				shape(Math.min(1.5, duration * 0.4), Math.min(1.5, duration * 0.4), 0.9);
				send = 0.8;
				echo = true;
			} else if (kind === "heart") {
				// A heartbeat: two low thumps.
				for (const [at, g] of [[0, 1], [0.24, 0.65]]) {
					const o = c.createOscillator(),
						g2 = c.createGain();
					o.type = "sine";
					o.frequency.setValueAtTime(freq, start + at);
					o.frequency.exponentialRampToValueAtTime(freq * 0.6, start + at + 0.16);
					g2.gain.setValueAtTime(0.0001, start);
					g2.gain.setValueAtTime(0.0001, start + at);
					g2.gain.exponentialRampToValueAtTime(g, start + at + 0.01);
					g2.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.22);
					o.connect(g2);
					g2.connect(env);
					sources.push(o);
					nodes.push(g2);
				}
				env.gain.setValueAtTime(level, start);
				send = 0.2;
			} else if (kind === "hum") {
				// The hum of a ship: a low tone with its harmonics and a rumble of filtered noise.
				for (const [m, g] of [[1, 1], [2, 0.4], [3, 0.2], [5, 0.06]]) into(osc("sine", freq * m, m * 2), env, g);
				const rumble = c.createBufferSource(),
					lp = c.createBiquadFilter();
				rumble.buffer = this.musicNoise;
				rumble.loop = true;
				lp.type = "lowpass";
				lp.frequency.value = 160;
				rumble.connect(lp);
				into(lp, env, 0.5);
				sources.push(rumble);
				nodes.push(lp);
				shape(Math.min(3, duration * 0.3), Math.min(3, duration * 0.3), 0.9);
				send = 0.2;
			} else if (kind === "hiss") {
				// A hiss swelling and dying: high noise breathing out.
				const air = c.createBufferSource(),
					hp = c.createBiquadFilter();
				air.buffer = this.musicNoise;
				air.loop = true;
				hp.type = "bandpass";
				hp.frequency.setValueAtTime(freq, start);
				hp.frequency.exponentialRampToValueAtTime(freq * 1.8, end);
				hp.Q.value = 1.2;
				air.connect(hp);
				into(hp, env, 1);
				sources.push(air);
				nodes.push(hp);
				shape(duration * 0.6, duration * 0.35, 0.9);
				send = 0.5;
			} else if (kind === "anvil") {
				// A metallic hit: bright inharmonic partials ringing out over a crack of noise.
				for (const [m, g] of [[1, 1], [2.4, 0.7], [3.9, 0.45], [5.6, 0.3]]) into(osc("square", freq * m), env, g * 0.3);
				const crack = c.createBufferSource(),
					hp = c.createBiquadFilter(),
					cg = c.createGain();
				crack.buffer = this.musicNoise;
				hp.type = "highpass";
				hp.frequency.value = 2500;
				cg.gain.setValueAtTime(0.8, start);
				cg.gain.exponentialRampToValueAtTime(0.0001, start + 0.06);
				crack.connect(hp);
				hp.connect(cg);
				cg.connect(env);
				sources.push(crack);
				nodes.push(hp, cg);
				env.gain.setValueAtTime(0.0001, start);
				env.gain.exponentialRampToValueAtTime(level, start + 0.003);
				env.gain.exponentialRampToValueAtTime(0.0001, end);
				send = 0.45;
			} else if (kind === "piano") {
				// A soft felt piano: fundamental and two quiet partials, decaying.
				for (const [m, g, type] of [[1, 1, "triangle"], [2, 0.25, "sine"], [3, 0.08, "sine"]]) into(osc(type, freq * m), env, g);
				env.gain.setValueAtTime(0.0001, start);
				env.gain.exponentialRampToValueAtTime(level, start + 0.005);
				env.gain.exponentialRampToValueAtTime(0.0001, end);
				send = 0.5;
				echo = true;
			}
			let out = env;
			if (c.createStereoPanner) {
				const stereo = c.createStereoPanner();
				stereo.pan.value = Math.max(-1, Math.min(1, pan));
				env.connect(stereo);
				nodes.push(stereo);
				out = stereo;
			}
			out.connect(this.musicBus || this.musicGain);
			if (echo && this.musicDelay) into(out, this.musicDelay, 0.6);
			// The music reverb only in the high quality (0.171.14: also in "classic").
			if (send && this.hq?.musicReverb && this.hqOn?.() !== false) into(out, this.hq.musicReverb, send);
			sources.forEach((src, k) => {
				this.track(src, k ? [] : nodes, true);
				src.start(start);
				src.stop(end + 0.05);
			});
		}
		// The score, after the films "Dune" and "Interstellar" in spirit, not in notes: drones, war drums, brass
		// blasts and a wailing voice over the desert and the ash; organ, a ticking clock, piano and strings over
		// the ice and in the menu. Moods (explore, develop, tension, battle, recovery) add and remove layers.
		musicStep(step, t) {
			const hz = (root, n) => root * 2 ** (n / 12);
			// The films' opening (0.168.4): "intro" under the radio scenes and the epilogues (its 20 s cut "intro:20",
			// under the prologues of acts II-IV until 0.171, is gone since 0.171.9: they have their own scores).
			if (this.musicMode === "intro") return this.introStep(step, t, 60);
			if (this.musicMode === "prologue") return this.prologueStep(step, t);
			if (STORIES[this.musicMode]) return this.storyStep(step, t, STORIES[this.musicMode]);
			if (this.musicMode === "finale") return this.finaleStep(step, t);
			const mode = this.musicMode,
				menu = mode === "menu",
				ice = mode === "game:ice",
				ash = mode === "game:ash",
				sun = mode === "game:sun",
				// Menu and ice: the organ and the clock; desert, dawn and ash: the drums and the voice.
				// One step is an eighth: the menu at 70 beats a minute, the ice 60, the ash front 100, the dawn 75, the desert 66.
				beat = 30 / (EERIE[mode]?.bpm || SPACE_MUSIC[mode]?.bpm || (menu ? 70 : ice ? 60 : ash ? 100 : sun ? 75 : 66)),
				meter = 8,
				bar = Math.floor(step / meter),
				pulse = step % meter;
			// The mood changes every two bars — into battle already at the next bar (0.171.14: up to 12 s late).
			if (!menu && (step % (meter * 2) === 0 || (step % meter === 0 && this.pendingMood === "battle" && this.musicMood !== "battle"))) this.musicMood = this.pendingMood || "explore";
			const mood = menu ? "explore" : this.musicMood,
				soft = { explore: 0.85, develop: 0.95, tension: 0.9, battle: 1, recovery: 0.75 }[mood] || 0.85;
			const play = (kind, root, n, duration, level, pan = 0, delay = 0) => this.instrument(kind, hz(root, n), t + delay, duration, level * soft, pan);
			if (EERIE[mode]) return this.eerieStep(mode, step, t, mood, soft, beat);
			if (SPACE_MUSIC[mode]) return this.spaceStep(mode, step, t, mood, soft, beat);
			if (menu || ice) {
				// "Distant light": a minor organ figure in eighths turning over a slow progression (8 bars), layers
				// entering phrase by phrase (32 bars), the clock ticking under it.
				const A = menu ? 110 : 98,
					prog = menu ? [[0, 3], [0, 3], [-4, 4], [-4, 4], [3, 4], [3, 4], [-2, 4], [-2, 4]] : [[0, 3], [0, 3], [5, 3], [5, 3], [-2, 4], [-2, 4], [-4, 4], [3, 4]],
					[r, third] = prog[bar % 8],
					phrase = Math.floor(bar / 8) % 4,
					root = hz(A, r),
					figure = [0, 7, 12, 7, third, 7, 12, third + 12];
				const organAt = menu ? 0.016 : ice && mood === "explore" ? 0 : 0.014;
				if (organAt) play("organ", root, figure[pulse], beat * 0.95, organAt * (phrase >= 2 ? 1.25 : 1), (pulse % 2 ? 0.25 : -0.25));
				if (!pulse) {
					// The pedal and held chord.
					play("organ", root, -12, beat * meter, menu ? 0.02 : 0.024);
					[0, third, 7].forEach((n, k) => play("strings", root, n + 12, beat * meter + 0.4, (menu ? 0.012 : 0.016) * (phrase >= 1 ? 1.4 : 1), (k - 1) * 0.5));
				}
				// The clock: tick-tock on the beat (always on the ice).
				if (pulse % 2 === 0 && (ice || phrase >= 1)) play("tick", pulse % 4 ? 2600 : 3300, 0, 0.05, 0.03 * (ice ? 1 : 0.7), pulse % 4 ? 0.35 : -0.35);
				if (menu && !pulse && (phrase >= 1 || bar % 2 === 0)) play("choir", root, 12 + (bar % 2 ? third : 7), beat * meter * 0.95, 0.012 * (phrase >= 2 ? 1.6 : 1), 0.2);
				if (ice && (pulse === 1 || pulse === 5)) play("piano", root, [24, 19, 22, 27, 24, 31, 26, 19][(bar * 2 + (pulse === 5 ? 1 : 0)) % 8], beat * 6, 0.03, Math.sin(step) * 0.4);
				if (menu && phrase === 3 && (pulse === 0 || pulse === 4)) play("organ", root, figure[(bar + pulse) % 8] + 24, beat * 3.8, 0.01, 0.4);
				if (menu && phrase === 3 && bar % 8 === 7 && !pulse) play("braam", root, -12, beat * 8, 0.022);
				// Moods over the ice.
				if (ice && mood === "tension" && pulse % 2) play("organ", root, figure[pulse] + 12, beat * 0.5, 0.009, 0.3);
				if (ice && mood === "battle") {
					if (pulse === 0 || pulse === 3 || pulse === 6) play("taiko", 82.41, 0, 1.2, 0.06, -0.15);
					if (!pulse && bar % 2 === 0) play("braam", root, -12, beat * 7, 0.035);
				}
				if (ice && mood === "develop" && pulse === 3) play("piano", root, 31, beat * 3, 0.02, 0.4);
				if (ice && mood === "recovery" && !pulse) play("choir", root, 12, beat * meter, 0.014);
				return beat;
			}
			// Desert (dust), twin-sun dawn (sun) and the ash front: a drone, a scale with a flattened second and a
			// raised third (the desert voice), war drums by mood.
			const root = ash ? 65.41 : sun ? 82.41 : 73.42,
				scale = sun ? [0, 2, 4, 7, 9, 12, 14, 16] : [0, 1, 4, 5, 7, 8, 10, 12],
				deg = (k) => scale[((k % 8) + 8) % 8] + 12 * Math.floor(k / 8);
			// The drone under everything (every two bars).
			if (step % (meter * 2) === 0) {
				if (sun) [0, 7, 16].forEach((n, k) => play("choir", root, n + 12, beat * meter * 2 + 0.6, 0.014, (k - 1) * 0.5));
				else play("drone", root, -12, beat * meter * 2 + 0.8, ash ? 0.05 : 0.04);
				if (ash) play("chant", root, 0, beat * meter * 2, 0.022);
			}
			// The voice: a phrase every four bars (its contour from the bar), on the dawn a shorter one.
			const phraseBar = bar % 4 === (sun ? 2 : 1);
			if (!ash && phraseBar && pulse % 2 === 0 && mood !== "battle") {
				const contour = [[4, 5, 4, 1], [7, 5, 4, 5], [4, 1, 0, 1], [8, 7, 5, 4]][Math.floor(bar / 4) % 4];
				play("wail", root, deg(contour[pulse / 2]) + 12, beat * 2.2, 0.026, 0.15);
			}
			// War drums: sparse in the desert, a march on the ash front, everywhere in battle.
			const drums =
				mood === "battle"
					? [0, 2, 3, 5, 6]
					: ash
						? [0, 3, 6]
						: sun
							? bar % 2 === 0 ? [0] : []
							: mood === "tension"
								? [0, 4]
								: bar % 2 === 0 ? [0, 5] : [];
			if (drums.includes(pulse)) play("taiko", root, pulse ? 7 : 0, 1.2, pulse ? 0.05 : 0.085, pulse % 2 ? 0.3 : -0.3);
			if (sun && pulse === 4) play("bell", root, deg(bar % 8) + 24, beat * 3, 0.016, 0.4);
			// Blasts: on the ash front every four bars, in battle every two.
			if (!pulse && (mood === "battle" ? bar % 2 === 0 : ash && bar % 4 === 0)) play("braam", root, bar % 8 < 4 ? 0 : 1, beat * 6, 0.04);
			if (ash && mood !== "battle" && pulse === 4 && bar % 4 === 2) play("braam", root, -5, beat * 3, 0.025);
			// Moods: plucked strings working (develop), a pulse under the tension, the choir after the fight.
			if (mood === "develop" && pulse % 2 === 0) play("pluck", root, deg([0, 2, 1, 4][pulse / 2] + (bar % 2) * 2) + 12, beat * 0.9, 0.035, -0.3);
			if (mood === "tension" && pulse % 2 === 1) play("bass", root, 0, beat * 0.6, 0.04);
			if (mood === "tension" && ash && pulse % 2 === 0) play("tick", 3000, 0, 0.05, 0.02);
			if (mood === "battle" && !pulse) play("chant", root, 0, beat * meter, 0.025);
			if (mood === "recovery" && !pulse) play("choir", root, deg(2) + 12, beat * meter, 0.016, -0.2);
			return beat;
		}
		// The prologues of acts II-IV (0.171): STORIES above, one step an eighth at 120 a minute (0.5 s), a bar 4 s.
		storyStep(step, t, P) {
			if (this.musicPreview) step %= P.end * 2 + 8;
			const beat = 0.5,
				s = step * beat,
				pulse = step % 8,
				bar = Math.floor(step / 8),
				index = P.parts.findLastIndex(([at]) => s >= at),
				[from, mood] = P.parts[Math.max(0, index)],
				next = P.parts[index + 1]?.[0] ?? P.end,
				within = s - from,
				progress = within / (next - from),
				progs = {
					hope: [[0, 4], [7, 4], [9, 3], [5, 4]],
					mystery: [[0, 3], [-4, 4]],
					quiet: [[0, 3], [-4, 4], [3, 4], [-2, 4]],
					threat: [[0, 3], [-4, 4], [5, 3], [7, 4]],
					battle: [[0, 3], [1, 4], [0, 3], [-4, 4]],
					mission: [[0, 3], [-4, 4], [3, 4], [-2, 4]],
					title: [[0, 3]],
				},
				prog = progs[mood],
				[r, third] = prog[bar % prog.length],
				chord = [0, third, 7],
				root = P.root * 2 ** (r / 12),
				play = (kind, n, duration, level, pan = 0, delay = 0) => this.instrument(kind, root * 2 ** (n / 12), t + delay, duration, level, pan),
				tick = (level) => this.instrument("tick", pulse % 4 ? 2600 : 3300, t, 0.05, level, pulse % 4 ? 0.35 : -0.35),
				long = beat * 8 + 0.4,
				arp = [chord[0], chord[2], 12 + chord[0], 12 + chord[1]],
				order = [0, 1, 2, 3, 2, 1, 2, 1],
				fig = arp[order[pulse]] + 12;
			if (s >= P.end) return beat;
			// The title: the great chord with the choir; the cut four seconds before the end; one piano note on the fifth.
			if (mood === "title") {
				const cut = P.end - 4;
				if (within === 0) {
					[0, 3, 7, 12, 15, 19].forEach((n, k) => play("organ", n, cut - from + 0.3, 0.018, (k - 2.5) * 0.25));
					chord.forEach((n, k) => play("strings", n + 12, cut - from, 0.016, (k - 1) * 0.5));
					play("choir", 15, cut - from, 0.02, 0.2);
					play("chant", 0, cut - from, 0.02);
					play("braam", -12, beat * 8, 0.05);
					play("taiko", -12, 1.4, 0.08);
				}
				if (s < cut && pulse % 2 === 0) tick(0.03);
				if (s === cut + 1) {
					play("piano", 31, beat * 8, 0.03, 0.2);
					play("piano", 31, beat * 6, 0.011, -0.3, beat * 1.5);
				}
				return beat;
			}
			// The clock: quarters; every eighth when it grows tense; none in the quiet.
			if (mood !== "quiet" && (pulse % 2 === 0 || mood === "threat" || mood === "battle" || mood === "mission")) tick(mood === "hope" || mood === "mystery" ? 0.022 : 0.032);
			// The pedal and the chord each bar, by the mood.
			if (!pulse) {
				play("organ", -12, long, mood === "quiet" ? 0.011 : 0.02);
				if (mood === "hope" || mood === "mission" || (mood === "quiet" && within >= 4) || mood === "battle") chord.forEach((n, k) => play("strings", n + 12, long, mood === "battle" ? 0.014 : 0.011, (k - 1) * 0.5));
				if (mood === "quiet" || (mood === "mission" && progress >= 0.5)) play("choir", chord[1] + 12, long, 0.012, 0.2);
				if (mood === "threat" || mood === "mystery") play("drone", -12, long, mood === "threat" ? 0.03 : 0.02);
				if (mood === "battle") play("braam", -12, beat * 6, 0.045);
			}
			if (mood === "threat" && within === 0) play("braam", -12, beat * 8, 0.035);
			// Transitions (0.171.9): after a loud part a quiet one begins with a soft drone dying away (the music
			// dropped from drums to a lone piano at once); in the last bar before a louder part the strings swell.
			const LOUD = ["battle", "threat", "mission"],
				before = P.parts[index - 1]?.[1],
				after = P.parts[index + 1]?.[1];
			if (within === 0 && LOUD.includes(before) && !LOUD.includes(mood) && mood !== "title") {
				play("drone", -12, beat * 10, 0.02);
				play("strings", chord[2], beat * 8, 0.008, -0.3);
			}
			if (pulse === 0 && next - s <= 4 && next - s > 0 && (LOUD.includes(after) || after === "title") && !LOUD.includes(mood)) play("strings", chord[2] + 12, 4, 0.009, 0.3);
			// Hope: the piano arpeggio.
			if (mood === "hope" && pulse % 2 === 0) play("piano", arp[pulse / 2] + 24, beat * 2.5, 0.02, pulse % 4 ? 0.25 : -0.25);
			// Mystery: signal-like bells high up, a beat of three then a rest.
			if (mood === "mystery" && [0, 1, 2, 5].includes(pulse)) play("bell", chord[pulse === 5 ? 2 : 0] + 36, beat * (pulse === 2 ? 2 : 0.4), 0.014, 0.35);
			// Quiet: a lone, slow piano melody.
			if (mood === "quiet" && (pulse === 0 || pulse === 4)) play("piano", [24, 27, 31, 29, 27, 24, 22, 24][(bar * 2 + pulse / 4) % 8] - r, beat * 4, 0.024, 0.15);
			// Threat: the heartbeat.
			if (mood === "threat" && pulse % 4 === 0) this.instrument("heart", 55, t, 0.6, 0.06, 0);
			// Battle: war drums, strings stabbing.
			if (mood === "battle") {
				if ([0, 3, 6].includes(pulse)) play("taiko", -12, 1.1, 0.07, pulse % 2 ? 0.3 : -0.3);
				if (pulse % 2 === 1) play("strings", chord[pulse % 3] + 12, beat * 0.4, 0.01, 0.2);
			}
			// Mission: the organ's turning figure, bells doubling it and drums gathering in the second half.
			if (mood === "mission") {
				play("organ", fig, beat * 0.95, 0.013, pulse % 2 ? 0.25 : -0.25);
				if (progress >= 0.5) {
					play("bell", fig + 12, beat * 0.9, 0.008, pulse % 2 ? -0.3 : 0.3);
					if ([0, 3, 6].includes(pulse)) play("taiko", -12, 1.1, 0.05, pulse % 2 ? 0.3 : -0.3);
				}
			}
			return beat;
		}
		// The campaign's prologue (0.169, under the 150 s film of campaign-film.js): a score in the manner of
		// "Interstellar" telling the same story. One step is an eighth at 120 a minute (0.5 s), a bar 4 s. Parts by the
		// film's shots (PROLOGUE, seconds): the frontier in hopeful D major (a piano arpeggio, strings, bells as the
		// beacons light); the Dominium in D minor (a drone, a heartbeat), the blockade (blasts, drums); the dark (almost
		// nothing); the ultimatum (brass stabs); Lira (a lone piano, a soft choir, then strings); the mission (the
		// organ's turning figure, building with drums and the full organ, easing for the landing); the title (a great
		// D major chord, a sudden silence, one bright piano note).
		prologueStep(step, t) {
			if (this.musicPreview) step %= PROLOGUE.end * 2 + 8;
			const beat = 0.5,
				D = 73.42,
				s = step * beat,
				P = PROLOGUE,
				pulse = step % 8,
				bar = Math.floor(step / 8),
				part = s < P.dominion ? "peace" : s < P.blockade ? "dominion" : s < P.dark ? "blockade" : s < P.ultimatum ? "dark" : s < P.lira ? "ultimatum" : s < P.mission ? "lira" : s < P.title ? "mission" : "title",
				progs = {
					peace: [[0, 4], [-5, 4], [-3, 3], [5, 4]],
					dominion: [[0, 3], [-4, 4], [5, 3], [7, 4]],
					blockade: [[0, 3], [-4, 4], [5, 3], [7, 4]],
					dark: [[0, 3]],
					ultimatum: [[0, 3], [1, 4]],
					lira: [[0, 3], [-4, 4], [3, 4], [-2, 4]],
					mission: [[0, 3], [-4, 4], [3, 4], [-2, 4]],
					title: [[0, 4]],
				},
				prog = progs[part],
				[r, third] = prog[bar % prog.length],
				chord = [0, third, 7],
				root = D * 2 ** (r / 12),
				play = (kind, n, duration, level, pan = 0, delay = 0) => this.instrument(kind, root * 2 ** (n / 12), t + delay, duration, level, pan),
				tick = (level) => this.instrument("tick", pulse % 4 ? 2600 : 3300, t, 0.05, level, pulse % 4 ? 0.35 : -0.35),
				long = beat * 8 + 0.4,
				arp = [chord[0], chord[2], 12 + chord[0], 12 + chord[1]],
				order = [0, 1, 2, 3, 2, 1, 2, 1],
				fig = arp[order[pulse]] + 12;
			if (s >= P.end) return beat;
			// The title: the great chord, held; the cut; one bright note on the third, a soft chord under it.
			if (part === "title") {
				if (s === P.title) {
					[0, 4, 7, 12, 16, 19].forEach((n, k) => play("organ", n, (P.cut - P.title) + 0.3, 0.018, (k - 2.5) * 0.25));
					chord.forEach((n, k) => play("strings", n + 12, P.cut - P.title, 0.016, (k - 1) * 0.5));
					play("choir", 16, P.cut - P.title, 0.022, 0.2);
					play("choir", 19, P.cut - P.title, 0.016, -0.2);
					play("braam", -12, beat * 8, 0.05);
					play("taiko", -12, 1.4, 0.08);
				}
				if (s < P.cut && pulse % 2 === 0) tick(0.03);
				if (s === P.cut + 1) {
					play("piano", 28, beat * 8, 0.032, 0.2);
					play("piano", 28, beat * 6, 0.012, -0.3, beat * 1.5);
					chord.forEach((n, k) => play("organ", n + 12, beat * 6, 0.008, (k - 1) * 0.4, 0.3));
				}
				return beat;
			}
			const tense = part === "dominion" || part === "blockade" || part === "ultimatum";
			// The clock: quarters, every eighth when it grows tense and in the mission; slowing in the dark.
			if (part === "dark" ? pulse === 0 : pulse % 2 === 0 || tense || part === "mission") tick(part === "peace" || part === "lira" ? 0.02 : 0.032);
			// The pedal and the chord, each bar.
			if (!pulse) {
				if (part !== "dark") play("organ", -12, long, part === "lira" ? 0.012 : 0.02);
				if (part === "peace" && s >= 8) chord.forEach((n, k) => play("strings", n + 12, long, 0.01, (k - 1) * 0.5));
				if (part === "lira" && s >= P.transmission) chord.forEach((n, k) => play("strings", n + 12, long, 0.011, (k - 1) * 0.5));
				if (part === "lira") play("choir", chord[1] + 12, long, 0.011, 0.2);
				if (tense || part === "dark") play("drone", -12, long, part === "dark" ? 0.04 : 0.03);
				if (part === "mission") {
					chord.forEach((n, k) => play("strings", n + 12, long, s >= P.run ? 0.015 : 0.011, (k - 1) * 0.5));
					if (s >= P.run && s < P.landing) play("choir", chord[1] + 12, long, 0.015, 0.2);
					if (s >= P.descent && s < P.landing) {
						chord.forEach((n, k) => play("organ", n + (k ? 12 : 0), long, 0.016, (k - 1) * 0.4));
						play("chant", chord[0], long, 0.016);
					}
				}
			}
			// The frontier: a piano arpeggio; bells as the beacons light up in Lira's network.
			if (part === "peace") {
				if (pulse % 2 === 0) play("piano", arp[pulse / 2] + 24, beat * 2.5, 0.02, pulse % 4 ? 0.25 : -0.25);
				if (s >= P.network && s < P.routes && pulse === 4) play("bell", chord[2] + 36, beat * 3, 0.016, (bar % 2) - 0.5);
			}
			// The Dominium: a heartbeat; the blockade: blasts on the bar and war drums; metal groaning.
			if (part === "dominion" && s >= P.dominion + 4 && pulse % 4 === 0) this.instrument("heart", 55, t, 0.6, 0.06, 0);
			if (part === "dominion" && s === P.dominion) play("braam", -12, beat * 8, 0.035);
			if (part === "blockade") {
				if (!pulse) play("braam", -12, beat * 6, 0.045);
				if ([0, 3, 6].includes(pulse)) play("taiko", -12, 1.1, 0.07, pulse % 2 ? 0.3 : -0.3);
				if (pulse % 2 === 1) play("strings", chord[pulse % 3] + 12, beat * 0.4, 0.01, 0.2);
			}
			// The dark: a low piano note now and then, metal groaning far off.
			if (part === "dark") {
				if (pulse === 0 && bar % 2 === 0) play("piano", 12, beat * 8, 0.02, -0.2);
				if (pulse === 4) play("metal", 0, beat * 6, 0.012, 0.3);
			}
			// The ultimatum: brass stabs on the beat, a low drum on the bar.
			if (part === "ultimatum") {
				if (pulse === 0 || pulse === 3) chord.forEach((n, k) => play("brass", n, beat * 0.6, 0.016, (k - 1) * 0.3));
				if (!pulse) play("taiko", -12, 1.2, 0.06);
			}
			// Lira: a lone, slow piano melody in D minor.
			if (part === "lira" && (pulse === 0 || pulse === 4)) {
				const melody = [24, 27, 31, 29, 27, 24, 22, 24];
				play("piano", melody[(bar * 2 + pulse / 4) % melody.length] - r, beat * 4, 0.024, 0.15);
			}
			// The mission: the organ's turning figure every eighth — doubled with bells in the run, by the organ in the
			// descent; drums gathering through the run and the descent; one blast as the descent begins; calm at the landing.
			if (part === "mission") {
				const landing = s >= P.landing;
				play(landing ? "piano" : "organ", fig, beat * (landing ? 2 : 0.95), landing ? 0.018 : s >= P.descent ? 0.016 : 0.012, pulse % 2 ? 0.25 : -0.25);
				if (s >= P.run && !landing) play(s >= P.descent ? "organ" : "bell", fig + 12, beat * 0.9, 0.009, pulse % 2 ? -0.3 : 0.3);
				if (s >= P.run && !landing && [0, 3, 6].includes(pulse)) play("taiko", -12, 1.1, s >= P.descent ? 0.08 : 0.04 + ((s - P.run) / (P.descent - P.run)) * 0.03, pulse % 2 ? 0.3 : -0.3);
				if (s === P.descent) play("braam", -12, beat * 8, 0.05);
			}
			return beat;
		}
		// The films' opening (0.168.4), in the manner of the "Interstellar" score like the finale, but a departure into
		// the unknown rather than a victory: D minor, ending on a question. `total` steps (eighths at 120 a minute,
		// 0.5 s each: 60 for 30 s, 40 for 20 s), in parts by its share: the first third a deep organ pedal, the clock
		// ticking slowly, a two-note piano call echoing; the second the organ's turning figure over D minor, B flat,
		// F, C, the strings, the clock every eighth; then to nine tenths the build (the choir, the full organ, drums
		// gathering, one brass blast); at the end a sudden silence and one high piano note left unresolved.
		introStep(step, t, total = 60) {
			if (this.musicPreview) step %= total + 4;
			const beat = 0.5,
				D = 73.42,
				third = Math.round(total / 3),
				build = Math.round((total * 2) / 3),
				cut = Math.round(total * 0.9),
				bar = Math.floor(step / 8),
				pulse = step % 8,
				[r, q] = [[0, 3], [0, 3], [-2, 4], [-2, 4], [3, 4], [3, 4], [-2, 4], [-2, 4]][bar % 8],
				chord = [0, q, 7],
				root = D * 2 ** (r / 12),
				play = (kind, n, duration, level, pan = 0, delay = 0) => this.instrument(kind, root * 2 ** (n / 12), t + delay, duration, level, pan);
			if (step >= total) return beat;
			// The end: silence, then one high piano note on the second (D to E: a question), echoed once.
			if (step >= cut) {
				if (step === cut + 2) {
					this.instrument("piano", D * 2 ** (26 / 12), t, beat * 8, 0.03, 0.2);
					this.instrument("piano", D * 2 ** (26 / 12), t + beat * 1.5, beat * 6, 0.012, -0.3);
				}
				return beat;
			}
			// The clock: slow at first (quarters), every eighth from the figure on.
			if (pulse % 2 === 0 || step >= third) this.instrument("tick", pulse % 4 ? 2600 : 3300, t, 0.05, step >= build ? 0.04 : 0.03, pulse % 4 ? 0.35 : -0.35);
			// The pedal each bar; the chord on the strings from the second part, the full organ and the choir in the build.
			if (!pulse) {
				const long = beat * 8 + 0.4;
				play("organ", -12, long, 0.022);
				if (!step) this.instrument("drone", D / 2, t, beat * third, 0.03);
				if (step >= third) chord.forEach((n, k) => play("strings", n + 12, long, step >= build ? 0.015 : 0.011, (k - 1) * 0.5));
				if (step >= build) {
					chord.forEach((n, k) => play("organ", n + (k ? 12 : 0), long, 0.016, (k - 1) * 0.4));
					play("choir", chord[1] + 12, long, 0.016, 0.2);
					play("chant", chord[0], long, 0.014);
				}
			}
			// The first part: a two-note piano call (the root and the fifth up), echoed.
			if (step < third && pulse === 2) {
				const n = (step % 16 < 8 ? 24 : 31) + (bar % 4 === 3 ? 2 : 0);
				this.instrument("piano", D * 2 ** (n / 12), t, beat * 6, 0.026, 0.3);
				this.instrument("piano", D * 2 ** (n / 12), t + beat * 1.5, beat * 6, 0.01, -0.3);
			}
			// The second part on: the organ's turning figure, every eighth (doubled in the build).
			if (step >= third) {
				const arp = [chord[0], chord[2], 12 + chord[0], 12 + chord[1]],
					order = [0, 1, 2, 3, 2, 1, 2, 1],
					fig = arp[order[pulse]] + 12;
				play("organ", fig, beat * 0.95, step >= build ? 0.015 : 0.012, pulse % 2 ? 0.25 : -0.25);
				if (step >= build) play("bell", fig + 12, beat * 0.9, 0.008, pulse % 2 ? -0.3 : 0.3);
			}
			// The build: drums gathering, one blast at its start.
			if (step >= build && [0, 3, 6].includes(pulse)) play("taiko", -12, 1.1, 0.04 + ((step - build) / (cut - build)) * 0.05, pulse % 2 ? 0.3 : -0.3);
			if (step === build) play("braam", -12, beat * 8, 0.045);
			return beat;
		}
		// The campaign's finale (0.168.3; 0.170 under the 122 s film of campaign-finale.js): a score in the manner of
		// "Interstellar" telling what came after the war. One step is an eighth at 120 a minute (0.5 s), a bar 4 s. Parts
		// by the film's shots (FINALE, seconds): the Gate (a drone, a chant, a blast as it cracks, the clock stopping);
		// the rifts (a high choir, a bell for each closing); home and Eos (the organ's turning figure from A minor into
		// C major, strings, the choir); the beacon (the first height — the full organ, bells as the lamp lights);
		// Hefajstos and the Heart (a piano alone, then a low drone and high notes); the council (a brass chorale); the
		// network, the people and the log (the figure again, a warm piano tune, the clock); the routes and the end (the
		// build with drums, a great C major chord, a sudden silence, one bright piano note).
		finaleStep(step, t) {
			if (this.musicPreview) step %= FINALE.stop * 2 + 8;
			const beat = 0.5,
				A = 110,
				s = step * beat,
				F = FINALE,
				pulse = step % 8,
				bar = Math.floor(step / 8),
				part = s < F.rifts ? "gate" : s < F.home ? "rifts" : s < F.beacon ? "home" : s < F.hefajstos ? "beacon" : s < F.council ? "memory" : s < F.network ? "council" : s < F.routes ? "frontier" : "end",
				progs = {
					gate: [[0, 3]],
					rifts: [[0, 3], [-4, 4]],
					home: s < F.eos ? [[0, 3], [-4, 4], [3, 4], [-2, 4]] : [[3, 4], [-2, 4], [0, 3], [-4, 4]],
					beacon: [[3, 4], [-2, 4], [-4, 4], [3, 4]],
					memory: [[0, 3], [-4, 4], [5, 3], [-2, 4]],
					council: [[3, 4], [-4, 4], [-2, 4], [3, 4]],
					frontier: [[3, 4], [-2, 4], [0, 3], [-4, 4]],
					end: s < F.end ? [[3, 4], [-2, 4], [0, 3], [-4, 4]] : [[3, 4]],
				},
				prog = progs[part],
				[r, third] = prog[bar % prog.length],
				chord = [0, third, 7],
				root = A * 2 ** (r / 12),
				play = (kind, n, duration, level, pan = 0, delay = 0) => this.instrument(kind, root * 2 ** (n / 12), t + delay, duration, level, pan),
				tick = (level) => this.instrument("tick", pulse % 4 ? 2600 : 3300, t, 0.05, level, pulse % 4 ? 0.35 : -0.35),
				long = beat * 8 + 0.4,
				arp = [chord[0], chord[2], 12 + chord[0], 12 + chord[1]],
				order = [0, 1, 2, 3, 2, 1, 2, 1],
				fig = arp[order[pulse]] + 12;
			if (s >= F.stop) return beat;
			// The end: the build to the great chord; then the cut and one bright note (the third of C, high).
			if (part === "end") {
				if (s < F.end) {
					tick(0.035);
					if (!pulse) {
						play("organ", -12, long, 0.024);
						chord.forEach((n, k) => play("strings", n + 12, long, 0.016, (k - 1) * 0.5));
						play("choir", chord[1] + 12, long, 0.016, 0.2);
					}
					play("organ", fig, beat * 0.95, 0.016, pulse % 2 ? 0.25 : -0.25);
					play("bell", fig + 12, beat * 0.9, 0.009, pulse % 2 ? -0.3 : 0.3);
					if ([0, 3, 6].includes(pulse)) play("taiko", -12, 1.1, 0.04 + ((s - F.routes) / (F.end - F.routes)) * 0.04, pulse % 2 ? 0.3 : -0.3);
					return beat;
				}
				if (s === F.end) {
					[0, 4, 7, 12, 16, 19].forEach((n, k) => play("organ", n, F.cut - F.end + 0.3, 0.018, (k - 2.5) * 0.25));
					chord.forEach((n, k) => play("strings", n + 12, F.cut - F.end, 0.018, (k - 1) * 0.5));
					play("choir", 16, F.cut - F.end, 0.022, 0.2);
					play("choir", 19, F.cut - F.end, 0.016, -0.2);
					play("chant", 0, F.cut - F.end, 0.02);
					play("braam", -12, beat * 8, 0.05);
					play("taiko", -12, 1.4, 0.08);
				}
				if (s < F.cut && pulse % 2 === 0) tick(0.03);
				if (s === F.cut + 1) {
					play("piano", 28, beat * 8, 0.032, 0.2);
					play("piano", 28, beat * 6, 0.012, -0.3, beat * 1.5);
					chord.forEach((n, k) => play("organ", n + 12, beat * 6, 0.008, (k - 1) * 0.4, 0.3));
				}
				return beat;
			}
			// The Gate: a drone and a chant, the clock racing, a blast as the Gate cracks, then the clock stops.
			if (part === "gate") {
				if (!step) {
					play("drone", -12, F.rifts, 0.05);
					play("chant", 0, F.rifts, 0.02);
					play("braam", -12, beat * 8, 0.045);
				}
				if (s < 8) tick(0.035);
				if (s === 6) {
					play("braam", -12, beat * 8, 0.05);
					play("taiko", -12, 1.4, 0.08);
				}
				return beat;
			}
			// The rifts: a high choir, a bell for each rift closing.
			if (part === "rifts") {
				if (!pulse) {
					play("organ", -12, long, 0.014);
					play("choir", chord[2] + 24, long, 0.014, 0.3);
					play("choir", chord[1] + 12, long, 0.012, -0.3);
				}
				if (pulse % 2 === 0) play("bell", 36 - ((bar * 4 + pulse / 2) % 6) * 2, beat * 4, 0.018, (pulse % 4 ? 0.4 : -0.4));
				return beat;
			}
			// The clock: quarters, every eighth at the heights.
			if (part !== "memory" && (pulse % 2 === 0 || part === "beacon")) tick(part === "beacon" ? 0.035 : 0.025);
			// The pedal and the chord, each bar.
			if (!pulse) {
				play("organ", -12, long, part === "memory" ? 0.012 : 0.02);
				if ((part === "home" && s >= F.home + 4) || part === "beacon" || part === "council" || part === "frontier") chord.forEach((n, k) => play("strings", n + 12, long, part === "beacon" ? 0.016 : 0.011, (k - 1) * 0.5));
				if ((part === "home" && s >= F.eos) || part === "beacon" || (part === "frontier" && s >= F.people && s < F.log)) play("choir", chord[1] + 12, long, 0.014, 0.2);
				if (part === "beacon") chord.forEach((n, k) => play("organ", n + (k ? 12 : 0), long, 0.016, (k - 1) * 0.4));
				if (part === "memory" && s >= F.heart) play("drone", -12, long, 0.03);
			}
			// The figure of the organ: home and Eos, the beacon (doubled), the network and the log.
			if (part === "home" || part === "beacon" || (part === "frontier" && (s < F.people || s >= F.log))) {
				play("organ", fig, beat * 0.95, part === "beacon" ? 0.016 : 0.012, pulse % 2 ? 0.25 : -0.25);
				if (part === "beacon") play("bell", fig + 12, beat * 0.9, 0.009, pulse % 2 ? -0.3 : 0.3);
			}
			// The beacon lights: a bell chord, a soft blast.
			if (part === "beacon" && s === F.beacon + 4.5) {
				chord.forEach((n, k) => play("bell", n + 24, beat * 8, 0.022, (k - 1) * 0.4));
				play("braam", -12, beat * 6, 0.03);
			}
			// The memory: Hefajstos — a piano alone; the Heart — high, cold notes over the drone.
			if (part === "memory") {
				if (s < F.heart && (pulse === 0 || pulse === 4)) play("piano", [24, 27, 31, 29, 27, 24, 22, 24][(bar * 2 + pulse / 4) % 8] - r, beat * 4, 0.024, 0.15);
				if (s >= F.heart && pulse === 2) play("piano", chord[(bar % 3)] + 36, beat * 3, 0.014, (bar % 2) - 0.5);
			}
			// The council: a brass chorale, one chord a bar, softly.
			if (part === "council" && (pulse === 0 || pulse === 4)) chord.forEach((n, k) => play("brass", n + (k ? 0 : -12), beat * 3.8, 0.012, (k - 1) * 0.3));
			// The people: a warm piano tune in C major.
			if (part === "frontier" && s >= F.people && s < F.log && pulse % 2 === 0) play("piano", [24, 26, 28, 31, 28, 26, 24, 19][(bar * 4 + pulse / 2) % 8] - r + 3, beat * 2.5, 0.022, 0.15);
			// The network: a bell as each world links up.
			if (part === "frontier" && s < F.people && pulse === 4) play("bell", chord[2] + 36, beat * 3, 0.014, (bar % 2) - 0.5);
			return beat;
		}
		// The eerie themes (EERIE), with a touch of "Alien" — silence and space, an echoing call, metal groaning,
		// the hum of the hull, a heartbeat in the tension, hits of metal in the fight. Notes chosen by step, so the
		// same bar always sounds the same.
		eerieStep(mode, step, t, mood, soft, beat) {
			const E = EERIE[mode],
				meter = 8,
				bar = Math.floor(step / meter),
				pulse = step % meter,
				root = E.root,
				hz = (n) => root * 2 ** (n / 12),
				play = (kind, n, duration, level, pan = 0, delay = 0) => this.instrument(kind, hz(n), t + delay, duration, level * soft, pan),
				// Steps of the theme's mode (a scale of semitones), wrapping by octaves.
				deg = (k) => E.scale[((k % E.scale.length) + E.scale.length) % E.scale.length] + 12 * Math.floor(k / E.scale.length),
				pick = (seed) => (Math.sin(seed * 12.9898 + E.root) * 43758.5453) % 1,
				r = (seed) => Math.abs(pick(seed));
			const battle = mood === "battle",
				tension = mood === "tension";
			// The bed: the hull's hum (wreck, forge), breathing choir (thicket), a low cluster (hive).
			if (step % (meter * 4) === 0) {
				if (E.bed === "hum") play("hum", 0, beat * meter * 4 + 1, 0.05);
				if (E.bed === "choir") [0, 6, 13].forEach((n, k) => play("choir", n + 12, beat * meter * 4 + 1, 0.011, (k - 1) * 0.5));
				if (E.bed === "cluster") [0, 1, 6].forEach((n, k) => play("chant", n, beat * meter * 4 + 1, 0.016, (k - 1) * 0.4));
				if (E.bed === "drone") play("drone", -12, beat * meter * 4 + 1, 0.05);
			}
			// The call: a few notes on the flute (or bells in the thicket), echoing, every four bars.
			if (!battle && bar % 4 === E.callBar && pulse % 2 === 0 && pulse < 6) {
				const k = Math.floor(r(bar) * 4),
					shape = [[0, 4, 3], [0, 6, 5], [7, 3, 0], [0, 8, 7]][k];
				const note = deg(shape[pulse / 2]) + E.callOctave,
					length = beat * (pulse === 4 ? 4 : 1.8),
					level = E.call === "bell" ? 0.03 : 0.022;
				play(E.call, note, length, level, 0.3);
				// Echoes off the walls: twice, from the other side and back, fading.
				if (E.echoes) [1, 2].forEach((k) => play(E.call, note, length, level * (k === 1 ? 0.45 : 0.2), k === 1 ? -0.5 : 0.5, beat * 1.5 * k));
			}
			// Metal groaning now and then (more in the tension).
			if (pulse === 3 && r(bar * 7 + 1) < (tension ? 0.6 : 0.3)) play("metal", deg(Math.floor(r(bar) * 5)) + 12, beat * 6, 0.016, r(bar + 3) - 0.5);
			// Clicks of the hive: irregular ticks.
			if (E.clicks && r(step * 3.7) < (tension || battle ? 0.45 : 0.18)) play("tick", 48 + Math.floor(r(step) * 12), 0.05, 0.022, r(step + 9) - 0.5);
			// Hiss swells (hive, thicket in the tension).
			if (E.hiss && !pulse && bar % (tension ? 2 : 4) === 2) play("hiss", 60 + Math.floor(r(bar) * 6), beat * 6, 0.02, r(bar + 5) - 0.5);
			// The forge: the anvil keeps time.
			if (E.anvil && !battle && (pulse === 0 || pulse === 5)) play("anvil", 31 + (pulse ? 2 : 0), 1.4, pulse ? 0.012 : 0.018, pulse ? 0.3 : -0.3);
			// The sea: the surf breaking every two bars, from one side and then the other, a low swell under it.
			if (E.waves && !pulse && bar % 2 === 0) {
				play("hiss", 55 + Math.floor(r(bar) * 5), beat * 7, tension ? 0.03 : 0.024, bar % 4 ? -0.6 : 0.6);
				play("bass", deg(0) - 12, beat * 6, 0.02);
			}
			// Something huge moving under the ground: a deep swell every eight bars (the dune sea, the buried signal).
			if (E.rumble && !pulse && bar % 8 === 6) {
				play("bass", deg(0) - 12, beat * 8, 0.03);
				play("drone", deg(0) - 12, beat * 8, 0.02);
			}
			// A harp: a rising arpeggio plucked every other bar (the islands in the air, the oasis).
			if (E.harp && !battle && bar % 2 === 1 && pulse < 4) play("pluck", deg(pulse * 2) + 24, beat * 2, 0.02, -0.3 + pulse * 0.2);
			// The signal: short beeps high up in a fixed pattern every four bars, like a code.
			if (E.morse && !battle && bar % 4 === 1 && [0, 1, 3, 6].includes(pulse)) play("bell", deg(0) + 36, beat * (pulse === 3 ? 0.6 : 0.25), 0.014, 0.4);
			// The beacon of Eos: a bell signalling from the tower, echoed; once dark (dim), rarely and faint.
			if (E.beacon && !battle && !pulse && bar % (E.beacon === "dim" ? 8 : 2) === 0) {
				const level = E.beacon === "dim" ? 0.012 : 0.026;
				play("bell", deg(4) + 24, beat * 6, level, -0.3);
				play("bell", deg(4) + 24, beat * 6, level * 0.45, 0.3, beat * 2);
			}
			// The fortress: the garrison's bugle — a rising call on brass every eight bars (four in the tension).
			if (E.fanfare && !battle && bar % (tension ? 4 : 8) === 0 && pulse < 4) play("brass", deg([0, 2, 4, 7][pulse]) + 12, beat * (pulse === 3 ? 3 : 0.8), pulse === 3 ? 0.02 : 0.016, 0.15);
			// The fortress: low strings pulsing with the march, the root and the fifth by turns.
			if (E.ostinato && !battle && pulse % 2 === 0) play("strings", deg(pulse % 4 ? 4 : 0) - 12, beat * 0.9, tension ? 0.012 : 0.008, -0.15);
			// The fortress: distant guns from the walls now and then — a dull thud and its rumble.
			if (E.guns && !battle && pulse === 6 && r(bar * 5 + 2) < (tension ? 0.5 : 0.2)) {
				play("kick", 0, 0.6, 0.03, r(bar) - 0.5);
				play("hiss", 40, beat * 2, 0.008, r(bar + 1) - 0.5, 0.05);
			}
			// The ruins: the citadel's gong — a deep, long bell (two octaves) every eight bars.
			if (E.gong && !pulse && bar % 8 === 4) {
				play("bell", deg(0), beat * 12, 0.03, 0);
				play("bell", deg(0) + 12, beat * 10, 0.016, 0.2);
			}
			// The ruins: a ritual frame drum, soft, on every other bar (not in the fight, which has its own drums).
			if (E.ritual && !battle && bar % 2 === 0 && [0, 3, 5].includes(pulse)) play("taiko", 0, 0.8, (pulse ? 0.014 : 0.022) * (tension ? 1.4 : 1), pulse === 3 ? 0.3 : -0.3);
			// The archive: a music box — a small high figure every four bars, like an old tune under the ice.
			if (E.musicBox && !battle && bar % 4 === 1 && pulse % 2 === 0) play("piano", deg([0, 2, 4, 2][pulse / 2] + (bar % 8 === 5 ? 1 : 0)) + 36, beat * 2, 0.014, 0.2);
			// The ice: a sharp crack and a low groan at odd moments (more in the tension and the fight).
			if (E.cracks && r(step * 2.9 + 1) < (tension || battle ? 0.08 : 0.04)) {
				play("tick", 72 + Math.floor(r(step) * 8), 0.04, 0.03, r(step + 2) - 0.5);
				play("metal", deg(0) - 12, beat * 4, 0.014, r(step + 3) - 0.5);
			}
			// Crystal and ice: glass bells glinting high up, now and then.
			if (E.chimes && !battle && pulse % 2 === 1 && r(step * 5.3) < (tension ? 0.35 : 0.22)) play("bell", deg(Math.floor(r(step + 4) * 9)) + 36, beat * 3, 0.012, r(step + 6) - 0.5);
			// The fortress: a snare keeping step (and the drum on the bar in the tension).
			if (E.march && !battle) {
				if (pulse % 2 === 0) play("snare", 0, 0.1, pulse ? 0.008 : 0.012, -0.2);
				if (tension && !pulse) play("taiko", 0, 1, 0.04, 0);
			}
			// Develop: a slow piano figure in the theme's mode.
			if (mood === "develop" && pulse % 4 === 1) play("piano", deg(Math.floor(r(step) * 7)) + 24, beat * 5, 0.022, 0.3);
			// Tension: the heartbeat.
			if (tension && pulse % 4 === 0) play("heart", 0, 0.6, 0.06);
			// Battle: the heart racing, metal hits, war drums, blasts on the bar.
			if (battle) {
				if (pulse % 2 === 0) play("heart", 0, 0.5, 0.05);
				if ([0, 3, 6].includes(pulse)) play("taiko", 0, 1.1, 0.07, pulse % 2 ? 0.3 : -0.3);
				if (pulse === 2 || pulse === 7) play("anvil", 31, 1, 0.018, 0.2);
				if (!pulse && bar % 2 === 0) play("braam", E.braam, beat * 6, 0.038);
				if (E.clicks && pulse % 2) play("snare", 0, 0.12, 0.016, -0.2);
			}
			// Recovery: a long, low flute and the choir.
			if (mood === "recovery" && !pulse && bar % 2 === 0) play("flute", deg(2) + 12, beat * 6, 0.016, -0.2);
			return beat;
		}
		// The space themes (SPACE_MUSIC): see above. Layers by phrase (8 bars, a cycle of 32): 0 — the pedal, the
		// clock and the figure, soft; 1 — strings and the piano; 2 — the choir, the figure doubled an octave up;
		// 3 — the full organ, a blast at the end, then the last half bar cut to silence but one piano note.
		spaceStep(mode, step, t, mood, soft, beat) {
			const S = SPACE_MUSIC[mode],
				meter = 8,
				bar = Math.floor(step / meter),
				pulse = step % meter,
				phrase = Math.floor(bar / 8) % 4,
				[r, q] = S.prog[Math.floor(bar / S.hold) % S.prog.length],
				chord = q === "m" ? [0, 3, 7] : q === "s" ? [0, 2, 7] : [0, 4, 7],
				base = S.root * 2 ** (r / 12),
				hz = (n) => base * 2 ** (n / 12),
				play = (kind, n, duration, level, pan = 0, delay = 0) => this.instrument(kind, hz(n), t + delay, duration, level * soft, pan),
				high = S.high || 0,
				battle = mood === "battle",
				tension = mood === "tension";
			// The cut: the end of a cycle falls silent, a single piano note left hanging.
			if (!battle && bar % 32 === 31 && pulse >= 4) {
				if (pulse === 4) play("piano", chord[1] + 24 + high, beat * 8, 0.03, 0.2);
				return beat;
			}
			// The clock: on the beat (quarters); in the tension and the fight every eighth.
			if (pulse % 2 === 0 || tension || battle) this.instrument("tick", pulse % 4 ? 2600 : 3300, t, 0.05, (S.deep ? 0.04 : 0.028) * soft, pulse % 4 ? 0.35 : -0.35);
			// The pedal and the chord (each chord change).
			if (!pulse && bar % S.hold === 0) {
				const long = beat * meter * S.hold + 0.5;
				play("organ", -12, long, S.deep ? 0.03 : 0.022);
				if (S.deep) play("drone", -12, long, 0.03);
				if (S.lead === "chords" || S.lead === "chorale" || phrase >= 3 || battle) chord.forEach((n, k) => play("organ", n + (k ? 12 : 0), long, (S.lead === "chorale" ? 0.012 : 0.014) * (phrase >= 3 ? 1.3 : 1), (k - 1) * 0.4));
				if (phrase >= 1 || S.lead === "chorale") chord.forEach((n, k) => play("strings", n + 12 + high, long, 0.011 * (phrase >= 2 ? 1.4 : 1), (k - 1) * 0.5));
				if (phrase >= 2 || S.lead === "chorale" || mood === "recovery") play(S.lead === "chorale" ? "chant" : "choir", chord[1] + 12, long, 0.012, 0.2);
			}
			// The figure: one small arpeggio turning (root, fifth, octave, third above), every eighth.
			const arp = [chord[0], chord[2], 12 + chord[0], 12 + chord[1]],
				order = [0, 1, 2, 3, 2, 1, 2, 1],
				fig = arp[order[pulse]] + 12 + high;
			if (battle) {
				// "No time for caution": the organ in sixteenths, accented, the strings with it, drums, blasts.
				play("organ", fig, beat * 0.45, pulse % 4 ? 0.014 : 0.02, -0.25);
				play("organ", arp[order[(pulse + 3) % 8]] + 12 + high, beat * 0.45, 0.012, 0.25, beat / 2);
				if (pulse % 2 === 0) play("strings", fig + 12, beat * 0.9, 0.012, 0.3);
				if ([0, 3, 6].includes(pulse)) play("taiko", -12, 1.1, 0.07, pulse % 2 ? 0.3 : -0.3);
				if (!pulse && bar % 2 === 0) play("braam", -12, beat * 6, 0.04);
				if (pulse === 4) play("chant", chord[0], beat * 4, 0.02);
				return beat;
			}
			if (S.lead === "organ" || S.lead === "piano") {
				const lead = S.lead === "piano" ? "piano" : "organ",
					level = (lead === "piano" ? 0.026 : 0.012) * [0.7, 0.85, 1, 1.15][phrase];
				play(lead, fig, beat * (lead === "piano" ? 2.5 : 0.95), level, pulse % 2 ? 0.25 : -0.25);
				if (phrase >= 2) play(lead === "piano" ? "bell" : "organ", fig + 12, beat * 0.9, level * 0.5, pulse % 2 ? -0.3 : 0.3);
				if (S.lead === "piano" && phrase >= 2 && pulse % 4 === 0) play("organ", fig, beat * 1.8, 0.008, 0);
			}
			// The far piano (and the theme's top voice): one note, echoed twice, fading.
			if (pulse === 2 && bar % (S.deep ? 4 : 2) === 1) {
				const n = arp[(bar >> 1) % 4] + 24 + high;
				play(S.top, n, beat * 6, S.top === "flute" ? 0.016 : 0.024, 0.3);
				play(S.top, n, beat * 6, 0.012, -0.3, beat * 1.5);
				play(S.top, n, beat * 6, 0.006, 0.3, beat * 3);
			}
			// The end of the cycle's last full phrase: a blast.
			if (phrase === 3 && bar % 8 === 6 && !pulse) play("braam", -12, beat * 10, 0.03);
			// Moods: work (a slow pluck under it), tension (a low organ pulse), recovery (the choir only, quiet).
			if (mood === "develop" && pulse % 4 === 1) play("pluck", chord[pulse % 3] + 12, beat * 1.5, 0.02, -0.3);
			if (tension && pulse % 2 === 1) play("organ", chord[0] - 12, beat * 0.5, 0.016);
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
				case "rift":
					tone(520, 1560, 0.32, 0, 0.05, "sine");
					tone(780, 2340, 0.28, 0.04, 0.03, "triangle");
					this.noise(0.18, 0.04 * level, pan);
					break;
				case "phase":
					tone(140, 150, 0.6, 0, 0.06, "sine");
					tone(1320, 1240, 0.5, 0.05, 0.035, "sine");
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
		module.exports = { GameAudio, STORIES };
	root.GameAudio = GameAudio;
})(typeof window !== "undefined" ? window : globalThis);
