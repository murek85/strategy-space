/* Maps that change in time (M5, 0.166):
   - Tides (Archipelag Thalassy): the sea rises over the sandbars for a minute in every four (`tides` in the map's
     layout: [x, y, rx, ry] bodies over the fords at the medium size, scaled with the map). A warning comes first;
     while the tide is high the fords block like the sea, and whoever stands on one is washed to the nearest shore.
     Nothing is built on a ford, and no relay is placed there.
   - Ice (Lodowe Archiwum): waters of kind "ice" are frozen — they carry units, but heavy vehicles go slower on
     them (RTS.WORLD.ice.slow), and a heavy blast breaks a hole through the ice: open water for a while (ice
     holes block), ground units in it are hurt and pushed out; the ice freezes back.
   - Comets (Szlak Komet, in space): comets fly along fixed tracks across the field, one pass every `period` s
     (`comets` in the layout). The tail hurts ships in it (shields first) and refills the gas fields it sweeps.
   Tides and comets follow from the clock (nothing saved); ice holes are kept in the save. Shared by browser
   and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.worldInstalled) return;
		RTS.worldInstalled = true;
		const { Game, TYPES, MISSIONS, FRONTIER_MAPS, TERRAIN, dist, waterContains } = RTS;
		const { block } = TERRAIN;
		const WORLD = (RTS.WORLD = {
			tide: { warn: 15, rise: 6 },
			ice: { slow: 0.6, heavy: ["tank", "heavy", "artillery", "sentinel", "destroyer", "colossus", "hauler"], blast: 36, life: 45, freeze: 10, hurt: 0.3, max: 24 },
			comet: { radius: 80, tail: 560, damage: 16, refill: 40, warn: 10 },
		});
		const W = 3360,
			H = 2160;
		const both = (list) => [...list, ...list.map(([x, y, ...rest]) => [W - x, H - y, ...rest])];
		const layout = (g) => FRONTIER_MAPS[g.missionId] || null;
		// Points of a layout at the medium size, scaled like the map (positions by the size, radii shrink only).
		const scale = (g) => {
			const fx = g.W / W,
				fy = g.H / H;
			return { fx, fy, r: Math.min(1, fx, fy) };
		};

		// ---- the Comet Trail (a space map) ----
		const COMETS = {
			mission: {
				name: "Szlak Komet",
				planet: "Pas Ikara · szlak komet",
				biome: "ice",
				theme: "space",
				space: true,
				mirror: "none",
				weatherName: "Burza jonowa",
				storms: ["ion", "meteor"],
				stormNames: { meteor: "Deszcz okruchów komet" },
				look: { planet: "ice", rocks: "ice", nebula: [["#8ad8ff", "#4a8ae0", "#c8f0ff"], ["#6a7ad8", "#3a4aa0", "#a8b8ff"]], sky: [["#2a4a8a", "#8ac8ff"], ["#141a40", "#4a6ad0"]], sun: "#f0f6ff", glow: "#8ab8ff", rings: false, comet: false, convoys: false, derelict: false, ice: true },
				description:
					"Pas Ikara, przez który co kilka minut przelatują komety po stałych szlakach — jeden przecina pole bitwy z zachodu na wschód, drugi z północy na południe. Warkocz komety rani statki, które się w nim znajdą (najpierw osłony), ale odnawia gaz w polach, przez które przejdzie. Kto zna rozkład przelotów, ten wie, kiedy uderzyć. Lodowe bryły dają osłonę, burze jonowe i deszcz okruchów komet.",
			},
			waters: () => [],
			obstacles: () =>
				block("asteroids", both([
					[1250, 560, 170, 130],
					[2050, 420, 150, 120],
					[880, 1240, 150, 120],
					[1500, 1500, 160, 120],
					[2620, 820, 130, 110],
				])),
			ores: [[1680, 1080, 6000], ...both([[1100, 700, 4600], [560, 1080, 4000], [1680, 330, 3600]])],
			gasFields: both([[1150, 980, 2400], [1560, 640, 2400], [2400, 1500, 1800]]),
			crystalFields: both([[1900, 960, 1600], [2300, 300, 1200]]),
			// Tracks [from, to] beyond the edges, the period and the share of it spent crossing, the phase offset.
			comets: [
				{ from: [-300, 900], to: [3660, 1260], period: 180, cross: 0.28, offset: 40 },
				{ from: [1300, -300], to: [2060, 2460], period: 180, cross: 0.24, offset: 130 },
			],
		};
		FRONTIER_MAPS.comets = COMETS;
		MISSIONS.comets = { ...COMETS.mission, objective: "Zniszcz stację dowodzenia wroga." };

		const old = {};
		for (const k of ["blocked", "tick", "movementFactor", "canBuild", "clusterRelays", "serialize", "configureSkirmish"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;
		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			g.iceHoles = Array.isArray(state.iceHoles) ? state.iceHoles.filter((h) => [h?.x, h?.y, h?.r, h?.until].every(Number.isFinite)).map((h) => ({ ...h })) : [];
			return g;
		};
		const hidden = (g, key, value) => Object.defineProperty(g, key, { value, configurable: true, writable: true, enumerable: false });

		Object.assign(Game.prototype, {
			// ---- tides ----
			tideBodies() {
				const T = layout(this)?.tides;
				if (!T) return [];
				const c = this._tideCache;
				if (c && c.W === this.W && c.H === this.H) return c.list;
				const { fx, fy, r } = scale(this),
					list = T.bodies.map(([x, y, rx, ry]) => ({ x: x * fx, y: y * fy, rx: rx * r, ry: ry * r }));
				hidden(this, "_tideCache", { W: this.W, H: this.H, list });
				return list;
			},
			// The tide now: { level 0…1 (the water over the fords), high (they block), until (s to the next change),
			// rising (within the warning before a high tide) }; null on maps without tides. High water from `first`, then
			// every `period` s, for `high` s.
			tide() {
				const T = layout(this)?.tides;
				if (!T) return null;
				const since = this.time - T.first;
				if (since < 0) return { level: 0, high: false, until: -since, rising: -since <= WORLD.tide.warn };
				const t = since % T.period,
					high = t < T.high,
					rise = WORLD.tide.rise,
					until = high ? T.high - t : T.period - t;
				return { level: high ? Math.max(0, Math.min(1, t / rise, (T.high - t) / rise)) : 0, high, until, rising: !high && until <= WORLD.tide.warn };
			},
			onFord(x, y, pad = 0) {
				return this.tideBodies().some((w) => Math.abs(x - w.x) < w.rx + pad && Math.abs(y - w.y) < w.ry + pad && waterContains(w, x, y, pad));
			},
			// ---- ice ----
			onIce(x, y) {
				return (this.waters || []).some((w) => w.kind === "ice" && Math.abs(x - w.x) < w.rx && Math.abs(y - w.y) < w.ry && waterContains(w, x, y, 0));
			},
			// ---- comets ----
			// The comets over the field now: head, the direction of flight, the tail's end; [] when none is crossing.
			comets() {
				const list = layout(this)?.comets;
				if (!list || !MISSIONS[this.missionId]?.space) return [];
				const { fx, fy } = scale(this),
					out = [];
				list.forEach((k, i) => {
					const u = (((this.time + k.offset) % k.period) + k.period) % k.period / k.period;
					if (u >= k.cross) return;
					const a = { x: k.from[0] * fx, y: k.from[1] * fy },
						b = { x: k.to[0] * fx, y: k.to[1] * fy },
						s = u / k.cross,
						l = Math.hypot(b.x - a.x, b.y - a.y),
						dx = (b.x - a.x) / l,
						dy = (b.y - a.y) / l,
						head = { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
					out.push({ id: i, x: head.x, y: head.y, dx, dy, tail: { x: head.x - dx * WORLD.comet.tail, y: head.y - dy * WORLD.comet.tail }, progress: s });
				});
				return out;
			},
			// The next comet to come (for the warning): seconds and its track.
			nextComet() {
				const list = layout(this)?.comets;
				if (!list || !MISSIONS[this.missionId]?.space) return null;
				let best = null;
				list.forEach((k, i) => {
					const u = (((this.time + k.offset) % k.period) + k.period) % k.period;
					const wait = u < k.cross * k.period ? 0 : k.period - u;
					if (!best || wait < best.wait) best = { id: i, wait };
				});
				return best;
			},
			inCometTail(e) {
				const R = WORLD.comet.radius;
				return this.comets().find((c) => {
					const vx = c.x - c.tail.x,
						vy = c.y - c.tail.y,
						l2 = vx * vx + vy * vy,
						t = Math.max(0, Math.min(1, ((e.x - c.tail.x) * vx + (e.y - c.tail.y) * vy) / l2));
					return Math.hypot(e.x - c.tail.x - vx * t, e.y - c.tail.y - vy * t) < R * (0.5 + t * 0.5) + (TYPES[e.type]?.radius || 0);
				}) || null;
			},

			blocked(x, y, pad = 22) {
				if (old.blocked.call(this, x, y, pad)) return true;
				if (this._tideStrict || this.tide()?.high) if (this.onFord(x, y, pad)) return true;
				return (this.iceHoles || []).some((h) => Math.hypot(x - h.x, y - h.y) < h.r + pad);
			},
			// Frozen water carries units (engine.js skips waters of kind "ice"); heavy vehicles go slower on it.
			movementFactor(e) {
				const f = old.movementFactor.call(this, e);
				return WORLD.ice.heavy.includes(e.type) && this.onIce(e.x, e.y) ? f * WORLD.ice.slow : f;
			},
			canBuild(x, y, type) {
				if (this.onFord(x, y, 40)) return false;
				return old.canBuild.call(this, x, y, type);
			},
			// No relay on a ford (it would go under water).
			clusterRelays() {
				hidden(this, "_tideStrict", true);
				try {
					return old.clusterRelays.call(this);
				} finally {
					this._tideStrict = false;
				}
			},
			// Deposits and relays moved by the scenario's seed never end on a ford.
			configureSkirmish(input = {}) {
				const result = old.configureSkirmish.call(this, input);
				if (this.tideBodies().length) {
					const items = [...this.ores, ...this.gasFields, ...this.crystalFields, ...this.nodes],
						off = (p) => this.onFord(p.x, p.y, 60) || this.blocked(p.x, p.y, 40) || items.some((o) => o !== p.item && dist(o, p) < 110);
					for (const item of items) {
						if (!this.onFord(item.x, item.y, 40)) continue;
						for (let r = 60, done = false; r < 600 && !done; r += 30)
							for (let k = 0; k < 16 && !done; k++) {
								const p = { item, x: item.x + Math.cos((k * Math.PI) / 8) * r, y: item.y + Math.sin((k * Math.PI) / 8) * r };
								if (!off(p)) {
									item.x = Math.round(p.x);
									item.y = Math.round(p.y);
									done = true;
								}
							}
					}
				}
				return result;
			},
			serialize() {
				return { ...old.serialize.call(this), iceHoles: (this.iceHoles || []).map((h) => ({ ...h })) };
			},
			// Washed or pushed out to the nearest free ground.
			pushAshore(e, test) {
				for (let r = 40; r < 700; r += 30)
					for (let k = 0; k < 16; k++) {
						const p = { x: e.x + Math.cos((k * Math.PI) / 8) * r, y: e.y + Math.sin((k * Math.PI) / 8) * r };
						if (!test(p) && !this.blocked(p.x, p.y, (TYPES[e.type]?.radius || 10) + 4)) {
							e.x = p.x;
							e.y = p.y;
							e.path = [];
							return true;
						}
					}
				return false;
			},
			tick(dt) {
				old.tick.call(this, dt);
				if (this.result) return;
				this.worldTick(dt);
			},
			worldTick(dt) {
				const ground = (e) => e.hp > 0 && TYPES[e.type]?.speed && !TYPES[e.type].flying && !TYPES[e.type].ship;
				// Tides: the warning, then the fords go under and whoever stands there is washed ashore.
				const tide = this.tide();
				if (tide) {
					const phase = tide.high ? "high" : tide.rising ? "rising" : "low";
					if (phase !== this._tidePhase) {
						const before = this._tidePhase;
						hidden(this, "_tidePhase", phase);
						if (phase === "rising") this.notify("Przypływ za " + Math.ceil(tide.until) + " s — mielizny znikną pod wodą.");
						if (phase === "high") {
							for (const e of this.entities) if (ground(e) && this.onFord(e.x, e.y, TYPES[e.type].radius || 0)) this.pushAshore(e, (p) => this.onFord(p.x, p.y, 10));
							this.notify("Przypływ — mielizny pod wodą przez " + Math.ceil(tide.until) + " s.");
						}
						if (phase === "low" && before === "high") this.notify("Odpływ — mielizny znów są przejezdne.");
					}
				}
				// Ice: heavy blasts on the ice break holes; the holes freeze back.
				if (this.waters?.some((w) => w.kind === "ice")) {
					this.iceHoles ||= [];
					for (const ef of this.effects || []) {
						if (ef.kind !== "explosion" || ef.iceChecked) continue;
						ef.iceChecked = true;
						if ((ef.size || 0) < WORLD.ice.blast || ef.air || !this.onIce(ef.x, ef.y)) continue;
						const r = Math.round(Math.min(70, 26 + ef.size * 0.45));
						if (this.iceHoles.some((h) => Math.hypot(h.x - ef.x, h.y - ef.y) < h.r * 0.6)) continue;
						this.iceHoles.push({ x: Math.round(ef.x), y: Math.round(ef.y), r, born: this.time, until: this.time + WORLD.ice.life });
						if (this.iceHoles.length > WORLD.ice.max) this.iceHoles.shift();
						// No crater on ice: the blast went through it.
						const k = this.craters?.findIndex((c) => Math.hypot(c.x - ef.x, c.y - ef.y) < 2);
						if (k >= 0) this.craters.splice(k, 1);
						for (const e of this.entities)
							if (ground(e) && Math.hypot(e.x - ef.x, e.y - ef.y) < r) {
								this.applyDamage(null, e, (e.maxHp || TYPES[e.type].hp) * WORLD.ice.hurt);
								if (e.hp > 0) this.pushAshore(e, (p) => Math.hypot(p.x - ef.x, p.y - ef.y) < r + 6);
							}
						this.fx("dust", ef.x, ef.y, { color: "#e8f6ff", chips: "#bfe6f2" });
					}
					if (this.iceHoles.length) this.iceHoles = this.iceHoles.filter((h) => h.until > this.time);
				}
				// Comets: the warning, the tail hurting ships, gas fields refilled.
				if (MISSIONS[this.missionId]?.space && layout(this)?.comets) {
					const next = this.nextComet();
					if (next && next.wait > 0 && next.wait <= WORLD.comet.warn && this._cometWarned !== next.id + ":" + Math.floor(this.time / 60)) {
						hidden(this, "_cometWarned", next.id + ":" + Math.floor(this.time / 60));
						this.notify("Kometa za " + Math.ceil(next.wait) + " s — " + (next.id ? "szlak północ–południe." : "szlak zachód–wschód."));
					}
					const list = this.comets();
					// What a field holds at the start is what a comet refills it to.
					for (const f of this.gasFields || []) f.full ??= f.amount;
					if (list.length) {
						for (const e of this.entities) if (e.hp > 0 && TYPES[e.type]?.ship && this.inCometTail(e)) this.applyDamage(null, e, WORLD.comet.damage * dt);
						for (const f of this.gasFields || []) {
							if (f.amount < f.full && list.some((c) => Math.hypot(f.x - c.x, f.y - c.y) < 260)) f.amount = Math.min(f.full, f.amount + WORLD.comet.refill * dt);
						}
					}
				}
			},
		});
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
