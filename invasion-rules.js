/* Landing from orbit — the "Inwazja" scenario mode (G2, 0.152). One operation, two battles:
   1. Orbit: the battle in space above the chosen planet (RTS.INVASION.orbitFor: desert → Orbita Kharona, ice →
      Pierścienie Glacjalis, ash and lava → Otchłań). It ends as usual when a command station falls, or after
      `orbitTime` s: then the side with the stronger fleet and stations (value by cost × health) holds the orbit.
   2. Planet: the ground battle on the chosen map (conquest). The side holding the orbit has
      - drop pods: one per `podValue` metal of its surviving fleet (at least `minPods`, at most `maxPods`); a drop
        sends up to `dropSize` pods to a point it has explored, away from enemy command centres (`guardRadius`),
        every `dropCooldown` s; they land after `fall` s with a squad of the side's faction (infantry and a vehicle
        pod in turn), dazed for `daze` s; every enemy anti-aircraft battery covering the point shoots a pod down
        with `flakChance`, every other defence building with `towerChance` (together at most `maxShot`);
      - an orbital strike without an uplink, every `strikeCooldown` s (the factions' strike: delay, radius, damage);
      - an orbital scan every `scanEvery` s: the enemy army (or its centre) is mapped for the side.
      The side without the orbit has none of that. The computer commander uses all of it when it holds the orbit,
      and builds anti-aircraft batteries when the player does.
   Single-player scenarios with two sides; deterministic (this.rand). Saved with the battle. Shared by browser and
   tests. */
(function (root) {
	function install(RTS) {
		if (RTS.invasionInstalled) return;
		RTS.invasionInstalled = true;
		const { Game, TYPES, MISSIONS, MODES, dist } = RTS;
		const INVASION = (RTS.INVASION = {
			orbitTime: 480,
			podValue: 250,
			minPods: 2,
			maxPods: 8,
			dropSize: 2,
			dropCooldown: 40,
			fall: 2.5,
			daze: 1.5,
			guardRadius: 320,
			flakChance: 0.35,
			towerChance: 0.15,
			maxShot: 0.8,
			strikeCooldown: 120,
			firstStrike: 60,
			scanEvery: 60,
			scanRadius: 380,
			aiDropFrom: 120,
			aiDropEvery: 90,
			aiFlak: [150, 360],
			// Squads per faction: even pods carry infantry, odd ones a vehicle.
			pods: {
				colonies: [["trooper", "trooper", "rocket"], ["tank"]],
				dominion: [["trooper", "flamer", "rocket"], ["tank"]],
				swarm: [["crawler", "crawler", "spitter"], ["spitter", "spitter"]],
			},
			orbitFor: { dust: "orbit", ice: "glacis", ash: "abyss" },
		});
		MODES.invasion = {
			name: "Inwazja",
			objective: "Zdobądź orbitę, potem wyląduj i zniszcz wrogie centra dowodzenia.",
			description:
				"Dla map planet (na mapie kosmicznej gra się zwykły podbój). Operacja w dwóch fazach. Najpierw bitwa na orbicie nad planetą (do 8 minut — wygrywa ten, kto zniszczy stację wroga albo ma wtedy silniejszą flotę i stacje), potem bitwa na planecie. Kto panuje na orbicie, ma kapsuły desantowe (z ocalałej floty), uderzenie z orbity bez stacji i skan orbitalny; baterie przeciwlotnicze zestrzeliwują kapsuły.",
		};
		const old = {};
		for (const k of ["configureSkirmish", "tick", "unitTick", "serialize", "modeStatus", "enemyAiTick", "aiWants"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;
		const worth = (e) => (TYPES[e.type].cost || (e.type === "hq" ? 400 : 120)) * Math.max(0, e.hp) / Math.max(1, e.maxHp || TYPES[e.type].hp);
		const fleet = (e) => e.hp > 0 && TYPES[e.type].speed > 0 && TYPES[e.type].damage > 0 && e.type !== "worker";

		Object.assign(Game.prototype, {
			// The orbit map above a ground map.
			invasionOrbitMap(groundId) {
				const m = MISSIONS[groundId];
				return m && !m.space && !m.campaign ? INVASION.orbitFor[m.biome] || "orbit" : null;
			},
			// The value a side has in orbit: its ships, or ships and stations.
			orbitValue(team, shipsOnly = false) {
				return this.entities.filter((e) => e.team === team && e.hp > 0 && (shipsOnly ? fleet(e) : e.type !== "worker" && !e.constructionLeft)).reduce((n, e) => n + worth(e), 0);
			},
			podsFor(team) {
				return Math.max(INVASION.minPods, Math.min(INVASION.maxPods, Math.floor(this.orbitValue(team, true) / INVASION.podValue)));
			},
			configureSkirmish(input = {}) {
				const I = input.invasion;
				const r = old.configureSkirmish.call(this, I ? { ...input, players: 2, teams: "ffa" } : input);
				this.invasion = null;
				if (I?.phase === "orbit" && MISSIONS[this.missionId]?.space && MISSIONS[I.target] && !MISSIONS[I.target].space) {
					this.scenario.mode = "conquest";
					this.invasion = { phase: "orbit", target: I.target, ends: INVASION.orbitTime };
				} else if (I?.phase === "ground" && !MISSIONS[this.missionId]?.space) {
					const owner = I.owner === 1 ? 1 : 0,
						pods = (n) => Math.max(0, Math.min(INVASION.maxPods, Math.floor(Number(n) || 0)));
					this.scenario.mode = "invasion";
					this.invasion = {
						phase: "ground",
						owner,
						from: MISSIONS[I.from]?.space ? I.from : this.invasionOrbitMap(this.missionId),
						pods: { [owner]: pods(I.pods) },
						dropReady: 0,
						strikeReady: INVASION.firstStrike,
						scanAt: 30,
						aiDropAt: INVASION.aiDropFrom,
					};
				} else if (this.scenario?.mode === "invasion") this.scenario.mode = "conquest";
				return r;
			},
			// The outcome of the orbit phase once it is decided (also when a station fell outside a tick): who holds
			// the orbit and its pods.
			invasionResult() {
				const I = this.invasion;
				if (I?.phase !== "orbit" || !this.result) return null;
				if (!I.carry) {
					const owner = this.result === "victory" ? 0 : 1;
					I.carry = { owner, pods: this.podsFor(owner), mine: Math.round(this.orbitValue(0)), theirs: Math.round(this.orbitValue(1)) };
				}
				return I.carry;
			},
			orbitOwner() {
				return this.invasion?.phase === "ground" ? this.invasion.owner : null;
			},
			podsLeft(team = this.me) {
				return this.invasion?.pods?.[team] || 0;
			},
			// Why the side cannot drop now (null when it can).
			dropRequirement(team = this.me) {
				const I = this.invasion;
				if (I?.phase !== "ground") return "Desant tylko w operacji Inwazja.";
				if (I.owner !== team) return "Orbita należy do wroga — brak kapsuł desantowych.";
				if (!this.podsLeft(team)) return "Wszystkie kapsuły desantowe zostały użyte.";
				if (this.time < I.dropReady) return `Kolejny desant za ${Math.ceil(I.dropReady - this.time)} s.`;
				return null;
			},
			// Why pods cannot land there (null when they can).
			landingRequirement(team, x, y) {
				if (!Number.isFinite(x) || !Number.isFinite(y) || x < 80 || y < 80 || x > this.W - 80 || y > this.H - 80) return "Poza mapą.";
				if (this.isHuman(team) && !this.sideOf(team).explored[this.visionIndex(x, y)]) return "Lądowisko musi leżeć w zbadanym terenie.";
				if (this.blocked(x, y, 40)) return "Teren nie nadaje się do lądowania.";
				if (this.entities.some((e) => e.type === "hq" && e.hp > 0 && !this.allied(team, e.team) && e.team !== 2 && dist(e, { x, y }) < INVASION.guardRadius)) return "Za blisko wrogiego centrum — obrona orbitalna bazy.";
				return null;
			},
			// The acting side's drop (player's action).
			orbitalDrop(x, y) {
				return this.dropPods(this.me, x, y);
			},
			dropPods(team, x, y) {
				const why = this.dropRequirement(team) || this.landingRequirement(team, x, y);
				if (why) {
					if (this.isHuman(team)) this.as(team, () => this.notify(why));
					return false;
				}
				const I = this.invasion,
					count = Math.min(INVASION.dropSize, this.podsLeft(team));
				I.pods[team] -= count;
				// (A campaign chapter may set its own pace: I.dropCooldown, I.strikeCooldown.)
				I.dropReady = this.time + (I.dropCooldown ?? INVASION.dropCooldown);
				I.dropNo = (I.dropNo || 0) + count;
				for (let k = 0; k < count; k++) {
					const a = (k / Math.max(1, count)) * Math.PI * 2 + 0.4,
						p = { x: Math.round(x + (count > 1 ? Math.cos(a) * 55 : 0)), y: Math.round(y + (count > 1 ? Math.sin(a) * 55 : 0)) };
					(this.drops ||= []).push({ ...p, team, at: this.time + INVASION.fall, pod: I.dropNo - count + k });
					this.fx("emp", p.x, p.y);
				}
				if (this.isHuman(team)) this.as(team, () => this.notify(`Desant z orbity: ${count} ${count === 1 ? "kapsuła" : "kapsuły"} — lądowanie za ${INVASION.fall} s.`, "order-move"));
				for (const h of this.humans) if (!this.allied(h, team) && this.isVisibleTo(h, x, y)) this.as(h, () => this.notify("UWAGA: wrogie kapsuły desantowe nad Twoim terenem!", "alarm"));
				return true;
			},
			// The chance that the enemy's defences shoot a pod down over a point.
			podShotChance(team, p) {
				let miss = 1;
				for (const e of this.entities) {
					if (e.hp <= 0 || e.constructionLeft || this.allied(team, e.team) || e.team === 2) continue;
					const s = TYPES[e.type];
					if (s.speed || !s.damage || dist(e, p) > s.range) continue;
					miss *= 1 - (e.type === "flak" ? INVASION.flakChance : INVASION.towerChance);
				}
				return Math.min(INVASION.maxShot, 1 - miss);
			},
			landPod(d) {
				if (this.rand() < this.podShotChance(d.team, d)) {
					this.effects.push({ kind: "explosion", x: d.x, y: d.y, size: 45, life: 0.6, maxLife: 0.6 });
					for (const h of this.humans) if (this.allied(h, d.team)) this.as(h, () => this.notify("Kapsuła desantowa zestrzelona przez obronę przeciwlotniczą!", "alarm"));
					return [];
				}
				const kit = INVASION.pods[this.factionFor(d.team)?.key] || INVASION.pods.colonies,
					squad = kit[d.pod % kit.length],
					units = [];
				squad.forEach((type, i) => {
					if (!TYPES[type]) return;
					let p = null;
					for (let ring = 0; ring < 6 && !p; ring++)
						for (let a = 0; a < 8 && !p; a++) {
							const q = { x: d.x + Math.cos(a * 0.785 + i) * ring * 22, y: d.y + Math.sin(a * 0.785 + i) * ring * 22 };
							if (!this.blocked(q.x, q.y, TYPES[type].radius + 2) && !units.some((u) => dist(u, q) < 22)) p = q;
						}
					if (!p) return;
					const e = this.spawn(type, d.team, p.x, p.y);
					e.landedUntil = this.time + INVASION.daze;
					e.modeTagged = true;
					if (!this.isHuman(d.team)) {
						e.aiRole = "raid";
						e.raidUntil = this.time + 60;
					}
					units.push(e);
				});
				this.effects.push({ kind: "explosion", x: d.x, y: d.y, size: 32, life: 0.5, maxLife: 0.5 });
				this.fx("dust", d.x, d.y, { color: "#b9b2a0" });
				return units;
			},
			// The orbital strike of the side holding the orbit (no uplink needed).
			orbitStrikeRequirement(team = this.me) {
				const I = this.invasion;
				if (I?.phase !== "ground" || I.owner !== team) return "Uderzenie z orbity wymaga panowania na orbicie.";
				if (this.time < I.strikeReady) return `Uderzenie z orbity gotowe za ${Math.ceil(I.strikeReady - this.time)} s.`;
				return null;
			},
			orbitStrike(x, y) {
				return this.orbitStrikeFor(this.me, x, y);
			},
			orbitStrikeFor(team, x, y) {
				const why = this.orbitStrikeRequirement(team) || (this.isHuman(team) && !this.sideOf(team).explored[this.visionIndex(x, y)] ? "Cel uderzenia musi leżeć w zbadanym terenie." : null);
				if (why) {
					if (this.isHuman(team)) this.as(team, () => this.notify(why));
					return false;
				}
				const S = RTS.FACTION_FX?.strike || { delay: 3 };
				this.invasion.strikeReady = this.time + (this.invasion.strikeCooldown ?? INVASION.strikeCooldown);
				(this.strikes ||= []).push({ x: Math.round(x), y: Math.round(y), at: this.time + S.delay, team });
				if (this.isHuman(team)) this.as(team, () => this.notify("Uderzenie z orbity — trafienie za " + S.delay + " s.", "order-move"));
				for (const h of this.humans) if (!this.allied(h, team) && this.isVisibleTo(h, x, y)) this.as(h, () => this.notify("UWAGA: namierzanie orbitalne! Uciekaj z oznaczonego obszaru.", "alarm"));
				return true;
			},
			// The orbital scan: where the enemy army stands (or its centre).
			orbitScan(team) {
				const foes = this.entities.filter((e) => e.hp > 0 && e.team !== 2 && !this.allied(team, e.team)),
					army = foes.filter(fleet),
					spot = army.length ? { x: army.reduce((n, e) => n + e.x, 0) / army.length, y: army.reduce((n, e) => n + e.y, 0) / army.length } : foes.find((e) => e.type === "hq");
				if (!spot) return null;
				const R = INVASION.scanRadius;
				if (this.isHuman(team)) {
					const side = this.sideOf(team),
						cell = RTS.CELL || 40;
					for (let y = spot.y - R; y <= spot.y + R; y += cell / 2)
						for (let x = spot.x - R; x <= spot.x + R; x += cell / 2)
							if (Math.hypot(x - spot.x, y - spot.y) <= R && x > 0 && y > 0 && x < this.W && y < this.H) side.explored[this.visionIndex(x, y)] = 1;
					this.as(team, () => this.notify("Skan orbitalny: zmapowano pozycje wroga."));
				} else {
					const T = this.enemyAi?.teams?.[team];
					if (T?.intel)
						for (const e of foes) if (dist(e, spot) <= R && !TYPES[e.type].speed) T.intel.structures[e.id] = { x: Math.round(e.x), y: Math.round(e.y), type: e.type, team: e.team };
				}
				return spot;
			},
			unitTick(e, dt) {
				// Fresh from a pod: dazed for a moment.
				if (e.landedUntil > this.time) return;
				return old.unitTick.call(this, e, dt);
			},
			tick(dt) {
				old.tick.call(this, dt);
				const I = this.invasion;
				if (!I) return;
				if (I.phase === "orbit") {
					if (!this.result && this.time >= I.ends) {
						const mine = this.orbitValue(0),
							theirs = this.orbitValue(1);
						this.result = mine >= theirs ? "victory" : "defeat";
						I.decided = "time";
					}
					if (this.result) this.invasionResult();
					return;
				}
				if (this.result) return;
				for (const d of (this.drops || []).filter((d) => this.time >= d.at)) this.landPod(d);
				if (this.drops?.length) this.drops = this.drops.filter((d) => this.time < d.at);
				if (this.time >= I.scanAt) {
					I.scanAt = this.time + INVASION.scanEvery;
					this.orbitScan(I.owner);
				}
			},
			modeStatus() {
				const I = this.invasion;
				if (!I) return old.modeStatus?.call(this) || "";
				if (I.phase === "orbit") {
					const left = Math.max(0, I.ends - this.time),
						clock = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`;
					const me = this.viewer ?? 0;
					return `Inwazja · faza 1 — orbita: zniszcz stację wroga lub miej silniejszą flotę za ${clock}. Siły: Ty ${Math.round(this.orbitValue(me))} · wróg ${Math.round(this.orbitValue(1 - me))}.`;
				}
				const mine = I.owner === (this.viewer ?? 0);
				return `Inwazja · faza 2 — planeta. Orbita: ${mine ? `TWOJA — kapsuły ${this.podsLeft(I.owner)}, uderzenie z orbity, skan` : `WROGA — wróg ma ${this.podsLeft(I.owner)} kapsuł; baterie przeciwlotnicze je zestrzeliwują`}.`;
			},
			// The commander holding the orbit drops on the player's outer buildings and strikes groups.
			enemyAiTick(dt) {
				old.enemyAiTick.call(this, dt);
				const I = this.invasion;
				if (I?.phase !== "ground" || this.isHuman(I.owner) || this.result || !this.enemyAi?.teams?.[I.owner]) return;
				const team = I.owner;
				if (this.time >= I.aiDropAt && !this.dropRequirement(team)) {
					I.aiDropAt = this.time + (I.aiDropEvery ?? INVASION.aiDropEvery);
					const spot = this.aiLandingSpot(team);
					if (spot) this.dropPods(team, spot.x, spot.y);
				}
				if (!this.orbitStrikeRequirement(team)) {
					const units = this.entities.filter((e) => fleet(e) && !this.allied(team, e.team) && e.team !== 2 && this.aiSees(team, e.x, e.y));
					let best = null;
					for (const u of units) {
						const n = units.filter((o) => dist(o, u) < 90).length;
						if (n >= 4 && (!best || n > best.n)) best = { x: u.x, y: u.y, n };
					}
					if (best) this.orbitStrikeFor(team, best.x, best.y);
				}
			},
			// Where the commander lands: beside the enemy's outer buildings it knows (furthest from their centre first),
			// otherwise at the edge of an enemy base, just outside its guard, on the commander's side.
			aiLandingSpot(team) {
				const ring = (c, r) => {
					for (let a = 0; a < 12; a++) {
						const p = { x: Math.round(c.x + Math.cos((a * Math.PI) / 6) * r), y: Math.round(c.y + Math.sin((a * Math.PI) / 6) * r) };
						if (!this.landingRequirement(team, p.x, p.y)) return p;
					}
					return null;
				};
				const known = this.aiKnown(team),
					centres = known.filter((b) => b.type === "hq"),
					fromCentre = (b) => (centres.length ? Math.min(...centres.map((h) => dist(h, b))) : 0),
					outer = known.filter((b) => b.type !== "hq").sort((a, b) => fromCentre(b) - fromCentre(a));
				for (const b of outer) {
					const p = ring(b, 140) || ring(b, 220);
					if (p) return p;
				}
				const home = this.hq(team);
				for (const h of centres) {
					const d = dist(h, home || h) || 1,
						toward = home ? { x: (home.x - h.x) / d, y: (home.y - h.y) / d } : { x: 1, y: 0 };
					for (let k = 0; k < 7; k++) {
						const a = Math.atan2(toward.y, toward.x) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.35,
							r = INVASION.guardRadius + 70,
							p = { x: Math.round(h.x + Math.cos(a) * r), y: Math.round(h.y + Math.sin(a) * r) };
						if (!this.landingRequirement(team, p.x, p.y)) return p;
					}
				}
				return null;
			},
			// The commander without the orbit raises anti-aircraft batteries against the pods.
			aiWants(T, L) {
				const wants = old.aiWants.call(this, T, L),
					I = this.invasion;
				if (I?.phase === "ground" && I.owner !== T.team && TYPES.flak) {
					const need = INVASION.aiFlak.filter((at) => this.time >= at).length,
						have = this.entities.filter((e) => e.team === T.team && e.type === "flak" && e.hp > 0).length;
					if (have < need) wants.push("flak");
				}
				return wants;
			},
			serialize() {
				return { ...old.serialize.call(this), invasion: this.invasion || null, drops: this.drops || [] };
			},
		});
		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			const I = state.invasion;
			if (I && typeof I === "object" && ["orbit", "ground"].includes(I.phase)) g.invasion = JSON.parse(JSON.stringify(I));
			if (Array.isArray(state.drops)) g.drops = state.drops.filter((d) => [d.x, d.y, d.at, d.team, d.pod].every(Number.isFinite)).map((d) => ({ ...d }));
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
