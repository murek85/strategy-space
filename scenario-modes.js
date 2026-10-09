/* Stage C (scenarios): victory modes and map sizes for independent operations. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.modesInstalled) return;
		RTS.modesInstalled = true;
		const { Game, TYPES, MISSIONS, dist, clamp } = RTS;

		// Medium is the original map; saves and the campaign keep using it.
		const MAP_SIZES = {
			small: {
				name: "Mała",
				w: 2560,
				h: 1640,
				relays: 7,
				description:
					"2560 × 1640 · szybkie starcie, bazy blisko siebie",
			},
			medium: {
				name: "Średnia",
				w: 3360,
				h: 2160,
				relays: 10,
				description: "3360 × 2160 · dotychczasowy rozmiar",
			},
			large: {
				name: "Duża",
				w: 4480,
				h: 2880,
				relays: 14,
				description:
					"4480 × 2880 · dodatkowe złoża, jeziora, skały i siedliska",
			},
		};
		const MODES = {
			conquest: {
				name: "Podbój",
				objective: "Zniszcz wszystkie wrogie centra dowodzenia.",
				description:
					"Klasyczna bitwa: wygrywa ten, kto zniszczy wszystkie wrogie centra.",
			},
			relays: {
				name: "Utrzymanie przekaźników",
				objective:
					"Zdobądź punkty kontroli: każdy przekaźnik daje 1 pkt/s. Wygrywa pierwsza strona z wymaganą pulą.",
				description:
					"Każdy kontrolowany przekaźnik daje 1 punkt na sekundę. Pierwsza strona, która zbierze pulę (90 pkt na przekaźnik na mapie), wygrywa. Desanty przeciwnika celują w przekaźniki. Zniszczenie wszystkich centrów nadal daje zwycięstwo.",
			},
			defense: {
				name: "Obrona",
				objective: "Utrzymaj centrum dowodzenia przez 10 minut.",
				description:
					"Przetrwaj 10 minut. Desanty są o 25% liczniejsze i przychodzą o 15% częściej; na start dostajesz 500 metalu więcej i dwie wieżyczki przy bazie. Zniszczenie wszystkich wrogich centrów kończy obronę wcześniej.",
			},
		};
		RTS.MAP_SIZES = MAP_SIZES;
		RTS.MODES = MODES;
		const DEFENSE_TIME = 600,
			POINTS_PER_RELAY = 90;

		const base = {};
		for (const k of [
			"configureSkirmish",
			"tick",
			"serialize",
			"clusterRelays",
		])
			base[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;

		Object.assign(Game.prototype, {
			mapSize() {
				return this.scenario?.size || "medium";
			},
			mode() {
				return this.scenario?.mode || "conquest";
			},
			// Stretch the medium layout onto the chosen size; object footprints stay the same.
			scaleWorld(size) {
				const target = MAP_SIZES[size];
				if (!target || (target.w === this.W && target.h === this.H))
					return;
				const fx = target.w / this.W,
					fy = target.h / this.H,
					shrink = Math.min(1, fx, fy);
				for (const o of [
					...this.entities,
					...this.nodes,
					...this.ores,
					...this.gasFields,
					...this.crystalFields,
				]) {
					o.x *= fx;
					o.y *= fy;
					if (o.home) o.home = { x: o.home.x * fx, y: o.home.y * fy };
					if (o.path) o.path = [];
					if (o.order && o.order.kind !== "gather") o.order = null;
				}
				for (const r of this.obstacles) {
					r.x *= fx;
					r.y *= fy;
					r.w *= shrink;
					r.h *= shrink;
				}
				for (const w of this.waters) {
					w.x *= fx;
					w.y *= fy;
					w.rx *= shrink;
					w.ry *= shrink;
				}
				this.resizeWorld(target.w, target.h);
				this.mapRelays = target.relays;
				if (size === "large") this.enrichWorld();
			},
			// Extra terrain for the large map, generated from the game seed away from the corner bases.
			enrichWorld() {
				const corners = [
					[420, 400],
					[this.W - 420, 400],
					[this.W - 420, this.H - 400],
					[420, this.H - 400],
				].map(([x, y]) => ({ x, y }));
				const deposits = () => [
					...this.ores,
					...this.gasFields,
					...this.crystalFields,
				];
				const free = (p, pad) =>
					!this.blocked(p.x, p.y, pad) &&
					corners.every((c) => dist(c, p) > 760) &&
					deposits().every((o) => dist(o, p) > 300) &&
					this.entities.every((e) => dist(e, p) > 320);
				const pick = (pad) => {
					for (let i = 0; i < 120; i++) {
						const p = {
							x: 260 + this.rand() * (this.W - 520),
							y: 240 + this.rand() * (this.H - 480),
						};
						if (free(p, pad)) return p;
					}
					return null;
				};
				for (let i = 0; i < 5; i++) {
					const p = pick(150);
					if (p)
						this.obstacles.push({
							x: p.x - 90,
							y: p.y - 60,
							w: 140 + Math.round(this.rand() * 140),
							h: 100 + Math.round(this.rand() * 100),
						});
				}
				for (let i = 0; i < 2; i++) {
					const p = pick(260);
					if (p)
						this.waters.push({
							x: p.x,
							y: p.y,
							rx: 150 + Math.round(this.rand() * 80),
							ry: 90 + Math.round(this.rand() * 50),
						});
				}
				const nextId = (list) =>
					Math.max(0, ...list.map((o) => o.id)) + 1;
				for (const [list, count, amount] of [
					[this.ores, 3, 5500],
					[this.crystalFields, 2, 1600],
					[this.gasFields, 2, 2600],
				])
					for (let i = 0; i < count; i++) {
						const p = pick(60);
						if (p) list.push({ id: nextId(list), ...p, amount });
					}
				const biome = MISSIONS[this.missionId].biome,
					type =
						biome === "dust"
							? "duneMaw"
							: biome === "ice"
								? "frostTusk"
								: "ashCrawler";
				for (let i = 0; i < 2; i++) {
					const p = pick(100);
					if (p) {
						const e = this.spawn(type, 2, p.x, p.y);
						e.home = { ...p };
						e.species = TYPES[type].name;
					}
				}
			},
			clusterRelays() {
				const limit = this.mapRelays;
				if (!limit) return base.clusterRelays.call(this);
				// Same placement rule as the base layout, with a per-size relay count and extra names.
				const names = [
						"AUREK",
						"BESH",
						"CRESH",
						"DORN",
						"ESK",
						"FORN",
						"GREK",
						"HERF",
						"ISK",
						"JENTH",
						"KRILL",
						"LETH",
						"MERN",
						"NERN",
					],
					sources = [
						...this.ores,
						...this.crystalFields,
						...this.gasFields,
					],
					nodes = [];
				for (const source of sources) {
					if (nodes.length >= limit) break;
					if (nodes.some((n) => dist(n, source) < 260)) continue;
					for (let i = 0; i < 16; i++) {
						const a = (i * Math.PI) / 8,
							p = {
								x: source.x + Math.cos(a) * 150,
								y: source.y + Math.sin(a) * 150,
							};
						if (
							p.x < 140 ||
							p.y < 140 ||
							p.x > this.W - 140 ||
							p.y > this.H - 140 ||
							this.blocked(p.x, p.y, 60) ||
							this.entities.some(
								(e) => dist(e, p) < TYPES[e.type].radius + 110,
							) ||
							sources.some((o) => dist(o, p) < 105) ||
							nodes.some((n) => dist(n, p) < 260)
						)
							continue;
						nodes.push({
							...p,
							owner: -1,
							progress: 0,
							capturing: -1,
							name: names[nodes.length],
						});
						break;
					}
				}
				this.nodes = nodes;
			},
			configureSkirmish(input = {}) {
				const size = MAP_SIZES[input.size] ? input.size : "medium",
					mode = MODES[input.mode] ? input.mode : "conquest";
				this.scaleWorld(size);
				base.configureSkirmish.call(this, input);
				this.scenario.size = size;
				this.scenario.mode = mode;
				// Keep neutral habitats away from every base after the corner layout is known.
				for (const e of this.entities.filter(
					(e) => e.team === 2 && e.home,
				))
					if (
						this.entities.some(
							(b) => b.type === "hq" && dist(b, e) <= 520,
						)
					) {
						for (let i = 0; i < 60; i++) {
							const p = {
								x: 300 + this.rand() * (this.W - 600),
								y: 300 + this.rand() * (this.H - 600),
							};
							if (
								!this.blocked(p.x, p.y, 45) &&
								this.entities.every(
									(b) => b.type !== "hq" || dist(b, p) > 560,
								)
							) {
								e.x = p.x;
								e.y = p.y;
								e.home = { ...p };
								break;
							}
						}
					}
				this.modeState = {
					mode,
					scores: {},
					target:
						mode === "relays"
							? this.nodes.length * POINTS_PER_RELAY
							: 0,
					duration: mode === "defense" ? DEFENSE_TIME : 0,
					lastWave: this.wave,
					outcome: null,
				};
				if (mode === "defense") {
					this.credits += 500;
					// Two ready towers on the side facing the map centre.
					const hq = this.hq(0),
						sx = hq.x < this.W / 2 ? 1 : -1,
						sy = hq.y < this.H / 2 ? 1 : -1;
					for (const [dx, dy] of [
						[190, 70],
						[70, 190],
					]) {
						const p = { x: hq.x + sx * dx, y: hq.y + sy * dy };
						if (!this.blocked(p.x, p.y, 30))
							this.spawn("turret", 0, p.x, p.y);
					}
				}
				this.explored.fill(0);
				this.updateVision();
				return this.scenario;
			},
			modeObjective() {
				return MODES[this.mode()].objective;
			},
			// A message to every human side, worded for it: fn(team, the outcome for that team) → [text, sound].
			// (One player: the player; network play: each player gets the message about its own side.)
			announce(fn) {
				for (const h of this.humans)
					this.as(h, () => {
						const [text, sound] = fn(h, this.resultFor(h));
						this.notify(text, sound);
					});
			},
			// The side leaders the viewing (acting) side fights — those with a command centre.
			rivalSides() {
				return [
					...new Set(
						this.entities
							.filter((e) => e.type === "hq" && e.hp > 0 && e.team !== 2 && !this.allied(this.me, e.team))
							.map((b) => this.sideLeader(b.team)),
					),
				];
			},
			// Whether the first human's side still has a command centre (defense: the base held).
			modeHomeAlive() {
				return !!this.hq(this.humans[0] ?? 0);
			},
			modeStatus() {
				const s = this.modeState;
				if (!s) return "";
				const own = this.sideLeader(this.me);
				if (s.mode === "relays") {
					return (
						"Punkty kontroli: Ty " +
						Math.floor(s.scores[own] || 0) +
						" / " +
						s.target +
						" · " +
						this.rivalSides()
							.map((t) => this.sideName(t) + " " + Math.floor(s.scores[t] || 0))
							.join(" · ") +
						" · przekaźniki " +
						this.nodes.filter((n) => n.owner === own).length +
						"/" +
						this.nodes.length
					);
				}
				if (s.mode === "defense") {
					const left = Math.max(0, s.duration - this.time);
					return "Przetrwaj jeszcze " + Math.floor(left / 60) + ":" + String(Math.floor(left % 60)).padStart(2, "0") + " · desant " + this.wave;
				}
				return "";
			},
			modeTick(dt) {
				const s = this.modeState;
				if (!s || this.result) return;
				if (s.mode === "relays") {
					for (const n of this.nodes) if (n.owner >= 0 && n.owner !== 2) s.scores[n.owner] = (s.scores[n.owner] || 0) + dt;
					// The result is kept for the first human's side (team 0); every player is told about its own.
					const winner = (s.scores[0] || 0) >= s.target ? 0 : Number(Object.entries(s.scores).find(([team, v]) => team !== "0" && v >= s.target)?.[0] ?? -1);
					if (winner >= 0) {
						s.outcome = winner === 0 ? "relays-won" : "relays-lost";
						s.winner = winner;
						this.result = winner === 0 ? "victory" : "defeat";
						this.announce((h, r) => (r === "victory" ? ["Sieć przekaźników pod kontrolą — zwycięstwo punktowe.", "victory"] : [this.sideName(winner) + " zdobywa pulę punktów kontroli.", "defeat"]));
						return;
					}
				}
				if (s.mode === "defense" && this.time >= s.duration && this.modeHomeAlive()) {
					s.outcome = "defense-won";
					this.result = "victory";
					this.announce((h, r) => (r === "victory" ? ["Baza przetrwała oblężenie. Obrona zakończona.", "victory"] : ["Obrońcy przetrwali oblężenie.", "defeat"]));
					return;
				}
				if (this.wave !== s.lastWave) {
					s.lastWave = this.wave;
					this.reinforceWave();
				}
			},
			// Waves are spawned by the engine; modes adjust the fresh attackers.
			reinforceWave() {
				const s = this.modeState,
					fresh = this.entities.filter(
						(e) =>
							e.team !== 0 &&
							e.team !== 2 &&
							TYPES[e.type].speed &&
							e.order?.kind === "attackMove" &&
							!e.modeTagged,
					);
				for (const e of fresh) e.modeTagged = true;
				if (s.mode === "defense") {
					const extra = Math.ceil(fresh.length * 0.25),
						target = this.hq(0);
					for (let i = 0; i < extra && target; i++) {
						const src = fresh[i % fresh.length],
							e = this.spawn(
								src.type,
								src.team,
								src.x + ((i % 3) - 1) * 30,
								src.y + 30,
							);
						e.modeTagged = true;
						e.order = {
							kind: "attackMove",
							x: target.x,
							y: target.y,
						};
						e.path = this.pathTo(e, target);
					}
					this.nextWave =
						this.time + (this.nextWave - this.time) * 0.85;
				}
				if (s.mode === "relays") {
					fresh.forEach((e, i) => {
						if (i % 3 === 2) return; // every third attacker still pressures the base
						const goal = this.nodes
							.filter((n) => n.owner !== e.team)
							.sort((a, b) => dist(a, e) - dist(b, e))[i % 2];
						if (goal) {
							e.order = {
								kind: "attackMove",
								x: goal.x,
								y: goal.y,
							};
							e.path = this.pathTo(e, goal);
						}
					});
				}
			},
			modeResult() {
				const s = this.modeState;
				if (!s) return null;
				const won = this.resultFor(this.me) === "victory";
				if (s.outcome === "relays-won" || s.outcome === "relays-lost")
					return won
						? "Twoje oddziały utrzymały sieć przekaźników i zebrały " + s.target + " punktów kontroli."
						: this.sideName(s.winner ?? 0) + " — pierwsza pełna pula: " + s.target + " punktów kontroli. Przejmuj i broń więcej przekaźników.";
				if (s.outcome === "defense-won") return "Centrum dowodzenia przetrwało " + Math.round(s.duration / 60) + " minut oblężenia.";
				return null;
			},
			tick(dt) {
				base.tick.call(this, dt);
				if (!this.result) this.modeTick(dt);
			},
			serialize() {
				return {
					...base.serialize.call(this),
					modeState: this.modeState || null,
				};
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			if (g.scenario) {
				g.scenario.size = MAP_SIZES[g.scenario.size]
					? g.scenario.size
					: "medium";
				g.scenario.mode = MODES[g.scenario.mode]
					? g.scenario.mode
					: "conquest";
				if (
					MAP_SIZES[g.scenario.size].w !== g.W ||
					MAP_SIZES[g.scenario.size].h !== g.H
				)
					throw Error("Uszkodzony rozmiar mapy");
				g.mapRelays =
					g.scenario.size === "medium"
						? undefined
						: MAP_SIZES[g.scenario.size].relays;
				const s = state.modeState;
				if (s) {
					if (
						s.mode !== g.scenario.mode ||
						!s.scores ||
						typeof s.scores !== "object" ||
						Object.values(s.scores).some(
							(v) => !Number.isFinite(v) || v < 0,
						) ||
						![s.target, s.duration, s.lastWave].every(
							Number.isFinite,
						)
					)
						throw Error("Uszkodzony zapis trybu");
					g.modeState = JSON.parse(JSON.stringify(s));
				} else
					g.modeState = {
						mode: g.scenario.mode,
						scores: {},
						target:
							g.scenario.mode === "relays"
								? g.nodes.length * POINTS_PER_RELAY
								: 0,
						duration:
							g.scenario.mode === "defense" ? DEFENSE_TIME : 0,
						lastWave: g.wave,
						outcome: null,
					};
			}
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports)
		module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
