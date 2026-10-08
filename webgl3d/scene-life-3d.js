/* Scenery of the 3D renderer that is not a game entity, with the same code-built models
   (webgl3d/models-3d.js scenery()) and the same instanced drawing as the units. Visual only; positions
   follow the same formulas as the Canvas and WebGL boards, so every renderer shows the same world.
   - Land animals: game.wildlife() (deer, hares, foxes, lizards) gives each one its home; from there it
     lives on its own here (visual only): rests and grazes, wanders far round its home to places it can
     reach (round water, walls, buildings, obstacles and steep slopes), deer in herds following a
     leader, hares and lizards in dashes and freezes; units, shots and explosions nearby put it to flight
     (the herd with it), then it stops, alert, and looks round.
   - Birds: 18 crossing the map (PlanetArt.fauna formula), flapping, high over the ground.
   - Fish: seven per plain lake, circling under the surface (webgl/fauna-native.js formula).
   - Floating islands: MapArt.islands() (Lumeria, Aerion), bobbing high over impassable ground; they
     cast real shadows.
   - Wrecks: game.debris, charred scrap that sinks away over the last seconds of its life.
   - Deposits: ore rocks with metal veins, gas craters with glowing fissures, golden crystal prisms — one
     model per stage of the 2D art (art.js), exhausted ones as pits and stumps. Relays: a tripod mast with
     a dish, the owner's light, the dashed capture zone and a ring filling with the capturing side.
   - Obstacles: game.obstacles, props on their raised ground (spires, giant glowing mushrooms, crashed
     hulls, alien ribs, ruins, resin, eggs, a processor, boulders).
   Everything outside the viewer's sight is hidden when the fog of war is on (islands and obstacles stay:
   they are part of the landscape, as on the 2D boards). */
export function createSceneLife3D(THREE, { world, heightAt, models3d, hiddenLayer, splash }) {
	// The surface of a lake: as scene-fx-3d.js lays it (flat, at the rim; the lowest rim on uneven shores).
	const levels = new Map(),
		leapt = new Set(),
		landed = new Set();
	function lakeLevel(w, wi) {
		const key = wi + "|" + w.x + "|" + w.y;
		if (!levels.has(key)) {
			let low = Infinity,
				high = -Infinity;
			for (let i = 0; i < 48; i++) {
				const a = (i / 48) * Math.PI * 2,
					r = RTS.waterRadius(w, a) * 0.92,
					h = heightAt(w.x + Math.cos(a) * w.rx * r, w.y + Math.sin(a) * w.ry * r);
				low = Math.min(low, h);
				high = Math.max(high, h);
			}
			levels.set(key, (high - low < 8 ? high : low) + 0.6);
		}
		return levels.get(key);
	}
	const TAU = Math.PI * 2;
	// ---------- wildlife behaviour ----------
	// Per kind: range round the home, walking and running speed, how near a unit scares it, turning rate
	// (rad/s), rest between walks (s), herd size, how much it grazes, dashes (move and freeze), climbs.
	const BEASTS = {
		deer: { range: 560, walk: 22, run: 110, fear: 180, turn: 2.6, rest: [4, 12], herd: 5, graze: 0.8 },
		fox: { range: 480, walk: 32, run: 100, fear: 140, turn: 3.6, rest: [2, 7], herd: 0, graze: 0.45 },
		hare: { range: 320, walk: 26, run: 125, fear: 120, turn: 5, rest: [2, 8], herd: 0, graze: 0.5, dashes: true },
		lizard: { range: 220, walk: 18, run: 75, fear: 85, turn: 7, rest: [1.5, 6], herd: 0, graze: 0, dashes: true, climbs: true },
	};
	const brains = new Map(),
		rand = (a, b) => a + Math.random() * (b - a);
	let lastTime = null,
		wildlifeClock = 0;
	// Animals of game.wildlife(): new ones start at their home; those gone (a building next to the
	// home) leave.
	function syncBrains() {
		const seen = new Set();
		for (const a of game.wildlife()) {
			if (a.kind === "bird" || a.kind === "fish" || !BEASTS[a.kind]) continue;
			seen.add(a.id);
			if (brains.has(a.id)) continue;
			const k = BEASTS[a.kind];
			brains.set(a.id, {
				id: a.id,
				kind: a.kind,
				home: { x: a.x, y: a.y },
				x: a.x,
				y: a.y,
				h: Math.random() * TAU,
				v: 0,
				state: "rest",
				timer: rand(0, k.rest[1]),
				target: null,
				herd: k.herd ? a.kind + Math.floor(a.id / (k.herd * 3)) : null,
				stride: Math.random() * 10,
				graze: 0,
				alert: 0,
				look: 0,
				fearClock: Math.random() * 0.3,
				probeClock: 0,
				dash: 0,
			});
		}
		for (const id of brains.keys()) if (!seen.has(id)) brains.delete(id);
	}
	// Somewhere an animal can stand: on the map, not in water, walls or obstacles, away from buildings,
	// and (unless it climbs) not up a steep slope from where it is.
	function walkable(b, x, y, statics) {
		if (x < 60 || y < 60 || x > game.W - 60 || y > game.H - 60 || game.blocked(x, y, 14)) return false;
		for (const e of statics) if (Math.abs(e.x - x) < 90 && Math.abs(e.y - y) < 90 && Math.hypot(e.x - x, e.y - y) < (RTS.TYPES[e.type]?.radius || 30) + 22) return false;
		return BEASTS[b.kind].climbs || Math.abs(heightAt(x, y) - heightAt(b.x, b.y)) < Math.hypot(x - b.x, y - b.y) * 0.6 + 3;
	}
	// A new place to go: round the home (a herd round its leader's goal).
	function pickTarget(b, statics) {
		const k = BEASTS[b.kind],
			leader = b.herd && [...brains.values()].find((o) => o.herd === b.herd);
		for (let n = 0; n < 10; n++) {
			let x, y;
			if (leader && leader !== b && leader.target) {
				const a = rand(0, TAU),
					d = rand(25, 70);
				x = leader.target.x + Math.cos(a) * d;
				y = leader.target.y + Math.sin(a) * d;
			} else {
				const a = rand(0, TAU),
					d = k.range * Math.sqrt(rand(0.05, 1));
				x = b.home.x + Math.cos(a) * d;
				y = b.home.y + Math.sin(a) * d;
			}
			if (walkable({ ...b, x, y }, x, y, statics)) return { x, y };
		}
		return null;
	}
	function scare(b, from, k) {
		b.state = "flee";
		b.timer = rand(1.6, 2.8);
		b.from = { x: from.x, y: from.y };
		b.swerve = rand(-0.5, 0.5);
		b.graze = Math.min(b.graze, 0.3);
		if (b.herd)
			for (const o of brains.values())
				if (o !== b && o.herd === b.herd && o.state !== "flee" && Math.hypot(o.x - b.x, o.y - b.y) < 260) {
					o.state = "flee";
					o.timer = rand(1.8, 3);
					o.from = b.from;
					o.swerve = rand(-0.6, 0.6);
				}
	}
	function think(b, dt, time, movers, statics, booms) {
		const k = BEASTS[b.kind];
		// Danger: the nearest unit, a shot or an explosion close by.
		b.fearClock -= dt;
		if (b.fearClock <= 0) {
			b.fearClock = rand(0.2, 0.35);
			let threat = null,
				best = k.fear;
			for (const m of movers) {
				const d = Math.abs(m.x - b.x) + Math.abs(m.y - b.y) < best * 1.5 ? Math.hypot(m.x - b.x, m.y - b.y) : Infinity;
				if (d < best) {
					best = d;
					threat = m;
				}
			}
			for (const f of booms) {
				const fx = f.tx ?? f.x,
					fy = f.ty ?? f.y;
				if (Math.hypot(fx - b.x, fy - b.y) < k.fear * 1.8) threat = { x: fx, y: fy };
			}
			if (threat) scare(b, threat, k);
		}
		let want = 0,
			goal = null;
		if (b.state === "flee") {
			want = k.run;
			goal = Math.atan2(b.y - b.from.y, b.x - b.from.x) + b.swerve;
			b.timer -= dt;
			if (b.timer <= 0) {
				// Safe for now: stop and look round.
				b.state = "rest";
				b.timer = rand(2, 4);
				b.alert = 1;
				b.target = null;
			}
		} else if (b.state === "walk") {
			if (!b.target || Math.hypot(b.target.x - b.x, b.target.y - b.y) < 14) {
				b.state = "rest";
				b.timer = rand(...k.rest);
				b.grazing = Math.random() < k.graze;
			} else {
				goal = Math.atan2(b.target.y - b.y, b.target.x - b.x);
				want = k.walk;
				// Dashes: run a little, freeze, run again.
				if (k.dashes) {
					b.dash -= dt;
					if (b.dash <= 0) b.dash = b.dashOn ? ((b.dashOn = false), rand(0.4, 1.4)) : ((b.dashOn = true), rand(0.5, 1.6));
					want = b.dashOn ? k.walk * 2 : 0;
				}
				// A herd keeps together: wait for those left behind.
				if (b.herd) {
					const lag = [...brains.values()].filter((o) => o.herd === b.herd && Math.hypot(o.x - b.x, o.y - b.y) > 160).length;
					if (lag) want *= 0.55;
				}
			}
		} else {
			b.timer -= dt;
			if (b.timer <= 0) {
				b.target = pickTarget(b, statics);
				if (b.target) b.state = "walk";
				else b.timer = rand(1, 3);
			}
		}
		// Steering: turn towards the goal, look ahead, swerve round what can't be crossed.
		if (goal !== null) {
			let dh = ((goal - b.h + Math.PI * 3) % TAU) - Math.PI;
			b.h += Math.max(-1, Math.min(1, dh)) * Math.min(1, k.turn * (b.state === "flee" ? 1.8 : 1) * dt);
			b.probeClock -= dt;
			if (b.probeClock <= 0 && want > 0) {
				b.probeClock = 0.15;
				const look = 14 + b.v * 0.5;
				if (!walkable(b, b.x + Math.cos(b.h) * look, b.y + Math.sin(b.h) * look, statics)) {
					let free = null;
					for (const turn of [0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4])
						if (walkable(b, b.x + Math.cos(b.h + turn) * look, b.y + Math.sin(b.h + turn) * look, statics)) {
							free = turn;
							break;
						}
					if (free === null) {
						b.v = 0;
						b.h += Math.PI;
						if (b.state === "walk") b.target = pickTarget(b, statics);
					} else {
						b.h += free;
						if (b.state === "flee") b.swerve += free;
					}
				}
			}
			// Too far from home: head back.
			if (b.state !== "flee" && Math.hypot(b.x - b.home.x, b.y - b.home.y) > k.range * 1.4) b.target = { ...b.home };
		}
		b.v += Math.max(-1, Math.min(1, want - b.v)) * Math.min(Math.abs(want - b.v), (b.state === "flee" ? 220 : 60) * dt);
		b.x += Math.cos(b.h) * b.v * dt;
		b.y += Math.sin(b.h) * b.v * dt;
		// The walk cycle follows the speed (longer strides when running).
		b.stride += dt * Math.pow(b.v / k.walk, 0.65);
		// Grazing while resting; alert after a scare, looking round.
		b.graze += ((b.state === "rest" && b.grazing && b.alert < 0.3 ? 1 : 0) - b.graze) * Math.min(1, dt * 2);
		b.alert = Math.max(0, b.alert - dt * 0.25);
		b.look = b.state === "rest" ? Math.sin(time * 0.8 + b.id) * 0.5 * (0.3 + b.alert) : 0;
	}
	const group = new THREE.Group();
	world.add(group);
	const records = new Map();
	let game = null,
		islands = [];

	// tall: a tall thing that may stand between the camera and the units (floating islands, spires, giant
	// mushrooms). It is drawn on its own with its own materials, so it can fade out (see fadeTall).
	function make(key, build, tall = false) {
		let r = records.get(key);
		if (!r) {
			const model = build(),
				materials = [];
			if (tall)
				model.root.traverse((o) => {
					if (!o.isMesh) return;
					const source = o.material;
					o.material = source.clone();
					// The baked paint (models-detail-3d.js) keeps its finish and glow in the copy.
					o.material.onBeforeCompile = source.onBeforeCompile;
					o.material.customProgramCacheKey = source.customProgramCacheKey;
					o.material.transparent = true;
					materials.push([o.material, source]);
				});
			else model.root.traverse((o) => o.isMesh && o.layers.set(hiddenLayer));
			const holder = new THREE.Group();
			holder.add(model.root);
			group.add(holder);
			r = { holder, model, tall, materials, fade: 1 };
			records.set(key, r);
		}
		r.seen = true;
		r.holder.visible = true;
		return r;
	}
	// Tall things fade to a ghost while they hide something that matters (covers(sphere): the renderer
	// checks own and selected units and the pointer); bounds are measured once, in the holder's frame.
	const box = new THREE.Box3(),
		sphere = new THREE.Sphere();
	function fadeTall(covers, dt) {
		for (const r of records.values()) {
			if (!r.tall || !r.holder.visible) continue;
			if (!r.bounds) {
				r.holder.updateMatrixWorld(true);
				box.setFromObject(r.model.root).getBoundingSphere(sphere);
				r.bounds = { offset: sphere.center.clone().sub(r.holder.position), radius: sphere.radius };
			}
			sphere.center.copy(r.holder.position).add(r.bounds.offset);
			sphere.radius = r.bounds.radius;
			const target = covers(sphere) ? 0.25 : 1;
			r.fade += (target - r.fade) * Math.min(1, dt * 6);
			for (const [m, source] of r.materials) {
				m.opacity = r.fade * source.opacity;
				m.depthWrite = r.fade > 0.97;
				// Glow follows the shared material (brighter at night, models-3d setNight).
				m.emissiveIntensity = source.emissiveIntensity;
			}
		}
	}

	// Act I: the landmarks of the story on the rock outcrops of its maps (obstacle index → piece), found
	// once per game: the one nearest the map's middle carries the main landmark, the one nearest the
	// player's command centre the Silent Station (chapter I).
	let landmarkCache = null;
	function landmarks() {
		if (landmarkCache?.game === game) return landmarkCache.map;
		const map = new Map(),
			rocks = (game.obstacles || []).map((o, i) => ({ i, x: o.x + o.w / 2, y: o.y + o.h / 2, rock: !o.kind })).filter((o) => o.rock),
			nearest = (p, except = -1) => rocks.filter((o) => o.i !== except).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0],
			middle = { x: game.W / 2, y: game.H / 2 },
			main = { training: "trainingRange", colony1: "eosBeacon", colony2: "iceArchive", colony3: "nadirCitadel" }[game.missionId];
		if (main && rocks.length) {
			const a = nearest(middle);
			map.set(a.i, main);
			const hq = game.hq?.(0);
			if (game.missionId === "colony1" && hq) {
				const b = nearest(hq, a.i);
				if (b) map.set(b.i, "silentStation");
			}
		}
		landmarkCache = { game, map };
		return map;
	}
	function update(time, { fog, colors }) {
		const biome = RTS.MISSIONS[game.missionId]?.biome,
			// Space (the orbital battle): no animals or birds; the asteroid fields drift slowly.
			space = !!RTS.MISSIONS[game.missionId]?.space,
			visible = (x, y) => !fog || game.isVisible(x, y);
		for (const r of records.values()) r.seen = false;

		// Land animals: their own behaviour round the homes game.wildlife() gives them.
		const dt = lastTime === null ? 0 : Math.max(0, Math.min(0.1, time - lastTime));
		lastTime = time;
		wildlifeClock -= dt;
		if (wildlifeClock <= 0 || !brains.size) {
			wildlifeClock = 2;
			syncBrains();
		}
		const movers = [],
			statics = [];
		for (const e of game.entities) {
			if (e.hp <= 0) continue;
			(RTS.TYPES[e.type]?.speed ? movers : statics).push(e);
		}
		const booms = (game.effects || []).filter((f) => f.kind === "explosion" || f.kind === "shot");
		if (!space) for (const b of brains.values()) think(b, dt, time, movers, statics, booms);
		if (!space) for (const b of brains.values()) {
			if (!visible(b.x, b.y)) continue;
			const r = make("animal|" + b.id + "|" + b.kind, () => models3d.scenery("animal", b.kind, biome));
			r.holder.position.set(b.x, heightAt(b.x, b.y), b.y);
			r.holder.rotation.y = -b.h;
			r.model.update({ id: b.id }, { time, stride: b.stride, moving: b.v > 3, graze: b.graze, alert: b.alert, aim: b.look, recoil: 0 });
		}
		// Birds (PlanetArt.fauna): eighteen crossing the map, flying along +x.
		for (let i = 0; i < (space ? 0 : 18); i++) {
			const x = (i * 317 + time * (20 + (i % 3) * 4)) % game.W,
				y = 100 + ((i * 197) % (game.H - 200)) + Math.sin(time * 0.12 + i) * 35;
			if (!visible(x, y)) continue;
			const r = make("bird|" + i, () => models3d.scenery("bird"));
			r.holder.position.set(x, heightAt(x, y) + 150 + Math.sin(time * 0.5 + i) * 12, y);
			r.holder.rotation.y = -Math.atan2(Math.cos(time * 0.12 + i) * 0.12 * 35, 20 + (i % 3) * 4);
			r.model.update({ id: i }, { time });
		}
		// Fish: two loose schools per plain lake, wandering just under the surface along their own winding
		// paths (each fish weaving around its school), turning the way they swim; now and then one leaps
		// out in an arc, with a splash where it leaves the water and where it falls back.
		(game.waters || []).forEach((w, wi) => {
			if (w.kind) return;
			const level = lakeLevel(w, wi),
				at = (i, t) => {
					const school = i % 2,
						ph = wi * 1.7 + school * 3.1,
						cx = Math.sin(t * 0.07 + ph) * 0.45 + Math.sin(t * 0.031 + ph * 2.3) * 0.15,
						cy = Math.cos(t * 0.053 + ph * 1.4) * 0.42 + Math.sin(t * 0.027 + ph) * 0.12,
						ox = Math.sin(t * 0.4 + i * 2.1) * 0.08,
						oy = Math.cos(t * 0.33 + i * 1.3) * 0.08;
					return [w.x + (cx + ox) * w.rx, w.y + (cy + oy) * w.ry];
				};
			for (let i = 0; i < 8; i++) {
				const [x, y] = at(i, time);
				if (!visible(x, y)) continue;
				const [nx, ny] = at(i, time + 0.2),
					r = make("fish|" + wi + "|" + i, () => models3d.scenery("fish")),
					// A leap: every 20–40 s for 1.1 s.
					period = 20 + ((i * 7 + wi * 3) % 20),
					leap = (time + i * 5.3 + wi * 2.1) % period,
					jump = leap < 1.1 ? leap / 1.1 : -1,
					key = wi * 100 + i;
				let y0 = level - 2.6 - Math.sin(time * 0.6 + i) * 0.8,
					pitch = 0;
				if (jump >= 0) {
					y0 = level - 2 + Math.sin(jump * Math.PI) * 13;
					pitch = Math.cos(jump * Math.PI) * 0.9;
					if (!leapt.has(key)) {
						leapt.add(key);
						splash?.(x, level, y);
					}
					if (jump > 0.85 && !landed.has(key)) {
						landed.add(key);
						splash?.(x, level, y);
					}
				} else if (leapt.has(key)) {
					leapt.delete(key);
					landed.delete(key);
				}
				r.holder.position.set(x, y0, y);
				r.holder.rotation.set(0, -Math.atan2(ny - y, nx - x), pitch, "YXZ");
				r.model.update({ id: i }, { time: time * 1.4 });
			}
		});
		// Obstacles (game.obstacles): props on the raised ground — spires, giant mushrooms, wrecks, ruins,
		// eggs, resin, boulders. Static: built once, always shown.
		const marks = landmarks(),
			lit = marks.size ? !!game.campaignReady?.() : false,
			held = marks.size && game.nodes?.length ? game.nodes.filter((n) => n.owner === (game.viewer ?? 0)).length / game.nodes.length : 0;
		(game.obstacles || []).forEach((o, i) => {
			const piece = marks.get(i),
				r = piece
					? make(`landmark|${i}|${piece}`, () => models3d.scenery("landmark", piece, o.w, o.h), piece === "eosBeacon" || piece === "nadirCitadel")
					: make("obstacle|" + i + "|" + o.x + "|" + o.y, () => models3d.scenery("obstacle", space ? (o.kind === "hulk" ? "hulk" : "asteroids") : o.kind || "rock", o.w, o.h, space ? RTS.MISSIONS[game.missionId].look?.rocks || "rock" : biome, i + 1), o.kind === "spire" || o.kind === "grove"),
				cx = o.x + o.w / 2,
				cy = o.y + o.h / 2;
			if (!r.placed) {
				r.placed = true;
				r.holder.position.set(cx, heightAt(cx, cy), cy);
			}
			if (piece) r.model.update({ lit, progress: held }, { time });
			// Asteroid fields turn slowly; hulks of warships only drift a little, keeping to their field.
			else if (space && o.kind === "hulk") r.holder.rotation.y = Math.sin(time * 0.06 + i) * 0.015;
			else if (space) r.holder.rotation.y = time * (0.012 + (i % 3) * 0.006) * (i % 2 ? 1 : -1);
		});
		// Deposits (ore, gas, crystals): one model per stage (art.js layouts), swapped when the stage
		// changes; shown once explored, like on the 2D board.
		const explored = (o) => game.explored[game.visionIndex(o.x, o.y)];
		for (const [kind, list, stage] of [
			["ore", game.ores, (o) => BoardArt.resourceLook(o, false)],
			["gas", game.gasFields, (o) => BoardArt.resourceLook(o, true)],
			["crystal", game.crystalFields, (o) => BoardArt.crystalLook(o)],
		])
			for (const o of list || []) {
				if (!explored(o)) continue;
				const n = stage(o),
					r = make(`deposit|${kind}|${o.id}|${n}${space ? "|space" : ""}`, () => models3d.scenery("deposit", kind, n, space));
				r.holder.position.set(o.x, heightAt(o.x, o.y), o.y);
			}
		// Relays: owner's colour and capture only while in sight or own (as on the 2D board).
		(game.nodes || []).forEach((node, i) => {
			if (!explored(node)) return;
			const shown = game.isVisible(node.x, node.y) || node.owner === (game.viewer ?? 0) ? node : { ...node, owner: -1, progress: 0 },
				color = shown.owner === -1 ? "#d4bf86" : colors[shown.owner] || "#d4bf86",
				// Act II chapter VI: the control nodes of the Hefajstos complex carry their machines.
				machine = game.missionId === "colony6" ? node.name : null,
				r = make(`relay|${i}|${color}|${node.hill ? 1 : 0}|${machine || ""}${space ? "|space" : ""}`, () => models3d.scenery("relay", color, !!node.hill, machine, space));
			if (!r.placed) {
				r.placed = true;
				const base = heightAt(node.x, node.y);
				r.holder.position.set(node.x, base, node.y);
				// The zone and capture rings follow the slopes around the relay.
				for (const m of r.model.ground || []) m.position.y = heightAt(node.x + m.position.x, node.y + m.position.z) - base + 0.6;
			}
			r.model.update(shown, { time, colors });
		});
		// Act II objective sites (on the 2D board only beacons): pad, camp, archive, data core, convoy stops,
		// the lighthouse, the conduits of the Hefajstos complex. Shown once explored.
		const s = game.act2;
		if (s) {
			const site = (key, build, p, e = {}, tall = false) => {
				if (!p || !explored(p)) return;
				const r = make(key, build, tall);
				if (!r.placed) {
					r.placed = true;
					r.holder.position.set(p.x, heightAt(p.x, p.y), p.y);
				}
				r.model.update(e, { time });
			};
			site("a2pad", () => models3d.scenery("pad"), s.pad);
			if (game.missionId === "colony4") {
				site("a2camp", () => models3d.scenery("camp"), s.camp);
				site("a2archive", () => models3d.scenery("archive"), s.archive, { progress: (s.reading || 0) / 12 });
				if (s.core === "site" || s.core === "dropped") site(`a2core|${Math.round(s.coreSite.x)}|${Math.round(s.coreSite.y)}`, () => models3d.scenery("coreSite"), s.coreSite);
			}
			if (game.missionId === "colony5") (s.stops || []).forEach((st, i) => site("a2stop|" + i, () => models3d.scenery(st.final ? "lighthouse" : "stop"), st, {}, !!st.final));
			const forge = game.missionId === "colony6" && game.forge?.();
			if (forge)
				(game.nodes || []).forEach((node, i) => {
					if (!explored(node) || !["ZAWÓR", "TURBINA", "ŁĄCZNIK"].includes(node.name)) return;
					// From the Heart of Ash towards the node, stopping short of both.
					const d = Math.hypot(node.x - forge.x, node.y - forge.y),
						n = Math.max(2, Math.round((d - 150) / 45)),
						points = Array.from({ length: n + 1 }, (_, k) => {
							const t = (80 + ((d - 150) * k) / n) / d,
								x = forge.x + (node.x - forge.x) * t,
								y = forge.y + (node.y - forge.y) * t;
							return [x, heightAt(x, y), y];
						});
					make("a2conduit|" + i, () => models3d.scenery("conduit", points));
				});
		}
		// Floating islands (MapArt.islands): bobbing like the 2D ones.
		for (const s of islands) {
			const r = make("island|" + s.seed + "|" + s.x + "|" + s.y, () => models3d.scenery("island", RTS.MISSIONS[game.missionId]?.theme, s.size, s.seed), true);
			r.holder.position.set(s.x, heightAt(s.x, s.y) + 150 + s.size * 0.6 + Math.sin(time * 0.6 + s.seed) * 6, s.y);
			r.holder.rotation.y = s.seed * 1.3 + time * 0.02;
		}
		// Salvage wrecks (game.wrecks, for the salvage yard): charred hulks while explored; their value is on
		// a sign (three-renderer.js).
		for (const w of game.wrecks || []) {
			if (!game.explored[game.visionIndex(w.x, w.y)]) continue;
			const r = make(`salvage|${w.id}`, () => models3d.scenery("wreck", Math.max(10, Math.min(46, w.size)) * 1.4, w.id + 100));
			r.holder.position.set(w.x, heightAt(w.x, w.y), w.y);
			r.model.update({ life: 0 }, { time });
		}
		// Wrecks (game.debris): sink into the ground over the last 3 seconds.
		game.debris?.forEach((d) => {
			if (!visible(d.x, d.y)) return;
			const seed = Math.round(d.x * 7 + d.y * 13),
				r = make("wreck|" + seed + "|" + d.size, () => models3d.scenery("wreck", d.size, seed));
			r.holder.position.set(d.x, heightAt(d.x, d.y) - Math.max(0, 3 - d.life) * d.size * 0.12, d.y);
			r.model.update(d, { time });
		});

		for (const [key, r] of records)
			if (!r.seen) {
				// Wrecks and fish come and go; animals and birds keep their model for the next time they show.
				if (key.startsWith("wreck|") || key.startsWith("deposit|") || key.startsWith("relay|") || key.startsWith("salvage|")) {
					group.remove(r.holder);
					records.delete(key);
				} else r.holder.visible = false;
			}
	}

	return {
		setGame(next) {
			game = next;
			brains.clear();
			lastTime = null;
			for (const r of records.values()) group.remove(r.holder);
			records.clear();
			islands = typeof MapArt !== "undefined" && MapArt.islands ? MapArt.islands(game) : [];
		},
		update,
		// Model roots to draw this frame (for the instanced batches).
		*roots() {
			for (const r of records.values()) if (r.holder.visible && !r.tall) yield r.model.root;
		},
		fadeTall,
		stats: () => ({ scenery: [...records.values()].filter((r) => r.holder.visible).length }),
	};
}
