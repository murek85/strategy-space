/* Scenario challenges: King of the Hill and Survival modes, day length and start level.
   Loaded after scenario-setup.js (options, codes, descriptions) and before enemy-ai.js. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.challengesInstalled) return;
		RTS.challengesInstalled = true;
		const { Game, TYPES, MODES, dist, clamp } = RTS;
		const OPTIONS = RTS.SCENARIO_OPTIONS;

		MODES.hill = {
			name: "Król wzgórza",
			objective: "Utrzymaj Szczyt — centralny przekaźnik.",
			description:
				"Przekaźnik najbliżej środka mapy staje się Szczytem. Każda sekunda jego posiadania liczy się stronie, która go trzyma; wygrywa pierwsza, która utrzyma go łącznie przez {time}. Pozostałe przekaźniki działają jak zwykle, a przeciwnik walczy o Szczyt. Zniszczenie wszystkich wrogich centrów nadal daje zwycięstwo.",
		};
		MODES.survival = {
			name: "Przetrwanie",
			objective: "Przetrwaj jak najdłużej — fale nie kończą się.",
			description:
				"Bez wrogiej bazy: z krawędzi mapy nadchodzą coraz większe i silniejsze fale (czołgi od 3., ciężkie maszyny od 6., lotnictwo od 8., artyleria od 10. fali). Gra kończy się utratą centrum; liczy się czas i liczba fal, a najlepszy wynik na każdej mapie i poziomie jest zapamiętywany. Liczba graczy i rodzaj przeciwnika nie mają znaczenia.",
		};
		const HILL = (RTS.HILL = { aiShare: 0.5 });
		const SURVIVAL = (RTS.SURVIVAL = { first: 90, interval: 45, minInterval: 30, base: 4, perWave: 2.2, most: 45, difficulty: { easy: 0.75, normal: 1, hard: 1.3 } });

		// Survival records per map and level, kept by the page (localStorage); pure helpers for app, menu and tests.
		const RECORDS = "pogranicze-records-v1",
			readRecords = (storage) => {
				try {
					return JSON.parse(storage?.getItem(RECORDS)) || {};
				} catch {
					return {};
				}
			};
		RTS.survivalBest = (storage, missionId, difficulty) => readRecords(storage)[missionId + "|" + difficulty] || null;
		RTS.recordSurvival = (storage, game) => {
			const key = game.missionId + "|" + game.scenario.difficulty,
				all = readRecords(storage),
				run = { time: Math.floor(game.time), wave: game.wave, kills: game.kills },
				best = all[key],
				isNew = !best || run.time > best.time;
			if (isNew) {
				all[key] = run;
				try {
					storage?.setItem(RECORDS, JSON.stringify(all));
				} catch {}
			}
			return { best: isNew ? run : best, isNew };
		};
		const old = {};
		for (const k of ["configureSkirmish", "modeTick", "modeStatus", "modeResult", "reinforceWave"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;
		const nightGetter = Object.getOwnPropertyDescriptor(Game.prototype, "night").get;
		const clock = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

		// Day length: the same curve as the engine's night, on the chosen period; "day" has no night, "night" no day.
		Object.defineProperty(Game.prototype, "night", {
			configurable: true,
			get() {
				const p = OPTIONS.dayLength[this.scenario?.dayLength];
				if (!p || p.period === 360) return nightGetter.call(this);
				if (!p.period) return p.dark ? 1 : 0;
				return clamp((0.2 - Math.cos((this.time / p.period) * Math.PI * 2)) / 0.65, 0, 1);
			},
		});

		Object.assign(Game.prototype, {
			configureSkirmish(input = {}) {
				const result = old.configureSkirmish.call(this, input);
				if (this.scenario.startLevel === "colony") this.upgrades.colony = true;
				const mode = this.modeState?.mode;
				if (mode === "hill") this.setupHill();
				if (mode === "survival") this.setupSurvival();
				this.explored.fill(0);
				this.updateVision();
				return result;
			},
			hillNode() {
				return this.nodes.find((n) => n.hill) || null;
			},
			setupHill() {
				const centre = { x: this.W / 2, y: this.H / 2 },
					hill = [...this.nodes].sort((a, b) => dist(a, centre) - dist(b, centre))[0];
				if (hill) {
					hill.hill = true;
					hill.name = "SZCZYT";
				}
				Object.assign(this.modeState, { target: this.scenario.hillTime, scores: {} });
			},
			// Survival: no enemy base; the side exists only as waves coming from the map edges.
			setupSurvival() {
				this.entities = this.entities.filter((e) => e.team === 0 || e.team === 2);
				this.scenario.enemy = "waves";
				this.wave = 0;
				this.nextWave = this.time + SURVIVAL.first;
				Object.assign(this.modeState, { next: this.nextWave, spawned: 0, lastWave: 0 });
			},
			survivalWave() {
				const s = this.modeState,
					n = ++this.wave,
					scale = SURVIVAL.difficulty[this.scenario.difficulty] || 1,
					count = Math.min(SURVIVAL.most, Math.round((SURVIVAL.base + SURVIVAL.perWave * (n - 1)) * scale)),
					target = this.hq(0) || this.entities.find((e) => e.team === 0 && !TYPES[e.type].speed);
				s.lastWave = n;
				s.next = this.time + Math.max(SURVIVAL.minInterval, SURVIVAL.interval - n);
				this.nextWave = s.next;
				if (!target) return;
				// One or two groups, each entering from a map edge away from the player's base.
				const sides = ["z północy", "ze wschodu", "z południa", "z zachodu"],
					groups = n >= 5 ? 2 : 1,
					pick = () => {
						for (let tries = 0; tries < 40; tries++) {
							const side = Math.floor(this.rand() * 4),
								along = 0.15 + this.rand() * 0.7,
								p = side === 0 ? { x: along * this.W, y: 70 } : side === 1 ? { x: this.W - 70, y: along * this.H } : side === 2 ? { x: along * this.W, y: this.H - 70 } : { x: 70, y: along * this.H };
							if (dist(p, target) > 900 && !this.blocked(p.x, p.y, 40)) return { ...p, side };
						}
						return { x: this.W - target.x, y: this.H - target.y, side: 0 };
					};
				const types = (i) => {
					const roll = (i * 7 + n * 3) % 10;
					if (n >= 10 && roll === 0) return "artillery";
					if (n >= 8 && roll === 1) return "interceptor";
					if (n >= 6 && roll === 2) return "heavy";
					if (n >= 3 && roll <= 4) return "tank";
					return roll % 2 ? "rocket" : "trooper";
				};
				const entries = [];
				for (let gi = 0; gi < groups; gi++) {
					const at = pick();
					entries.push(sides[at.side]);
					for (let i = gi; i < count; i += groups) {
						const p = { x: clamp(at.x + ((i % 5) - 2) * 26, 40, this.W - 40), y: clamp(at.y + (Math.floor(i / 5) % 4) * 26 * (at.y > this.H / 2 ? -1 : 1), 40, this.H - 40) };
						const e = this.spawn(types(i), 1, p.x, p.y);
						e.modeTagged = true;
						e.order = { kind: "attackMove", x: target.x, y: target.y };
						e.path = this.pathTo(e, target);
					}
				}
				s.spawned += count;
				this.notify(`Fala ${n}: ${count} jednostek nadciąga ${[...new Set(entries)].join(" i ")}.`, "alarm");
			},
			modeTick(dt) {
				const s = this.modeState;
				if (s?.mode === "survival" && !this.result) {
					if (this.time >= s.next) this.survivalWave();
					// Idle attackers (after destroying a target) look for the next building.
					if (Math.floor(this.time) !== Math.floor(this.time - dt)) {
						const target = this.hq(0) || this.entities.find((e) => e.team === 0 && e.hp > 0 && !TYPES[e.type].speed);
						if (target)
							for (const e of this.entities)
								if (e.team === 1 && e.hp > 0 && TYPES[e.type].speed && !e.order && !e.target) {
									e.order = { kind: "attackMove", x: target.x, y: target.y };
									e.path = this.pathTo(e, target);
								}
					}
					s.lastWave = this.wave;
				}
				old.modeTick.call(this, dt);
				if (s?.mode === "hill" && !this.result) this.hillTick(dt);
			},
			hillTick(dt) {
				const s = this.modeState,
					hill = this.hillNode();
				if (!hill || hill.owner < 0 || hill.owner === 2) return;
				s.scores[hill.owner] = (s.scores[hill.owner] || 0) + dt;
				if (s.scores[hill.owner] >= s.target) {
					s.winner = hill.owner;
					s.outcome = hill.owner === 0 ? "hill-won" : "hill-lost";
					this.result = hill.owner === 0 ? "victory" : "defeat";
					this.notify(hill.owner === 0 ? "Szczyt utrzymany — zwycięstwo." : this.sideName(hill.owner) + " utrzymuje Szczyt do końca.", this.result);
				}
			},
			// Classic waves in the hill mode go for the hill.
			reinforceWave() {
				const fresh =
					this.modeState?.mode === "hill"
						? this.entities.filter((e) => e.team !== 0 && e.team !== 2 && TYPES[e.type].speed && e.order?.kind === "attackMove" && !e.modeTagged)
						: [];
				old.reinforceWave.call(this);
				const hill = this.hillNode();
				if (hill)
					fresh.forEach((e, i) => {
						if (i % 3 === 2) return;
						e.order = { kind: "attackMove", x: hill.x, y: hill.y };
						e.path = this.pathTo(e, hill);
					});
			},
			modeStatus() {
				const s = this.modeState;
				if (s?.mode === "hill") {
					const hill = this.hillNode(),
						rivals = [...new Set(this.enemyBases().map((b) => this.sideLeader(b.team)))];
					return `Szczyt: ${hill ? (hill.owner === 0 ? "Twój" : hill.owner > 0 && hill.owner !== 2 ? this.sideName(hill.owner) : "wolny") : "—"} · Ty ${clock(s.scores[0] || 0)} / ${clock(s.target)}${rivals.map((t) => " · " + this.sideName(t) + " " + clock(s.scores[t] || 0)).join("")}`;
				}
				if (s?.mode === "survival") return `Fala ${this.wave} · przetrwano ${clock(this.time)} · następna fala za ${Math.max(0, Math.ceil(s.next - this.time))} s`;
				return old.modeStatus.call(this);
			},
			modeResult() {
				const s = this.modeState;
				if (s?.outcome === "hill-won") return `Szczyt w Twoich rękach przez ${clock(s.target)}. Sektor należy do Kolonii.`;
				if (s?.outcome === "hill-lost") return `${this.sideName(s.winner)}: Szczyt utrzymany przez ${clock(s.target)}. Odbijaj go wcześniej i broń dłużej.`;
				if (s?.mode === "survival" && this.result === "defeat") return `Przetrwano ${clock(this.time)} i ${Math.max(0, this.wave - 1)} pełnych fal; zniszczonych przeciwników: ${this.kills}.`;
				return old.modeResult.call(this);
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			const s = g.modeState;
			if (s?.mode === "survival" && !Number.isFinite(s.next)) throw Error("Uszkodzony zapis przetrwania");
			if (s?.mode === "hill" && (!g.nodes.some((n) => n.hill) || !Number.isFinite(s.target))) throw Error("Uszkodzony zapis trybu Król wzgórza");
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
