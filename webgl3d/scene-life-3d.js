/* Scenery of the 3D renderer that is not a game entity, with the same code-built models
   (webgl3d/models-3d.js scenery()) and the same instanced drawing as the units. Visual only; positions
   follow the same formulas as the Canvas and WebGL boards, so every renderer shows the same world.
   - Land animals: game.wildlife() (deer, hares, foxes, lizards), walking, heading where they drift.
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
export function createSceneLife3D(THREE, { world, heightAt, models3d, hiddenLayer }) {
	const TAU = Math.PI * 2;
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
			visible = (x, y) => !fog || game.isVisible(x, y);
		for (const r of records.values()) r.seen = false;

		// Land animals (advanced-rules.js wildlife()): heading from the drift of their position.
		for (const a of game.wildlife()) {
			if (a.kind === "bird" || a.kind === "fish" || !visible(a.x, a.y)) continue;
			const r = make("animal|" + a.id + "|" + a.kind, () => models3d.scenery("animal", a.kind, biome)),
				i = a.id,
				dx = Math.cos(time * 0.18 + i) * 10 * 0.18,
				dy = -Math.sin(time * 0.12 + i) * 8 * 0.12;
			r.holder.position.set(a.x, heightAt(a.x, a.y), a.y);
			r.holder.rotation.y = -Math.atan2(dy, dx);
			r.model.update({ id: a.id }, { time, moving: true, aim: 0, recoil: 0 });
		}
		// Birds (PlanetArt.fauna): eighteen crossing the map, flying along +x.
		for (let i = 0; i < 18; i++) {
			const x = (i * 317 + time * (20 + (i % 3) * 4)) % game.W,
				y = 100 + ((i * 197) % (game.H - 200)) + Math.sin(time * 0.12 + i) * 35;
			if (!visible(x, y)) continue;
			const r = make("bird|" + i, () => models3d.scenery("bird"));
			r.holder.position.set(x, heightAt(x, y) + 150 + Math.sin(time * 0.5 + i) * 12, y);
			r.holder.rotation.y = -Math.atan2(Math.cos(time * 0.12 + i) * 0.12 * 35, 20 + (i % 3) * 4);
			r.model.update({ id: i }, { time });
		}
		// Fish (webgl/fauna-native.js): seven per plain lake, circling just under the surface.
		(game.waters || []).forEach((w, wi) => {
			if (w.kind) return;
			for (let i = 0; i < 7; i++) {
				const a = time * 0.13 + i * 0.9 + wi,
					x = w.x + Math.cos(a) * w.rx * 0.65,
					y = w.y + Math.sin(a * 1.3) * w.ry * 0.6;
				if (!visible(x, y)) continue;
				const r = make("fish|" + wi + "|" + i, () => models3d.scenery("fish"));
				r.holder.position.set(x, heightAt(x, y) + 1.5, y);
				r.holder.rotation.y = -Math.atan2(Math.cos(a * 1.3) * w.ry * 1.3, -Math.sin(a) * w.rx);
				r.model.update({ id: i }, { time });
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
					: make("obstacle|" + i + "|" + o.x + "|" + o.y, () => models3d.scenery("obstacle", o.kind || "rock", o.w, o.h, biome, i + 1), o.kind === "spire" || o.kind === "grove"),
				cx = o.x + o.w / 2,
				cy = o.y + o.h / 2;
			if (!r.placed) {
				r.placed = true;
				r.holder.position.set(cx, heightAt(cx, cy), cy);
			}
			if (piece) r.model.update({ lit, progress: held }, { time });
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
					r = make(`deposit|${kind}|${o.id}|${n}`, () => models3d.scenery("deposit", kind, n));
				r.holder.position.set(o.x, heightAt(o.x, o.y), o.y);
			}
		// Relays: owner's colour and capture only while in sight or own (as on the 2D board).
		(game.nodes || []).forEach((node, i) => {
			if (!explored(node)) return;
			const shown = game.isVisible(node.x, node.y) || node.owner === (game.viewer ?? 0) ? node : { ...node, owner: -1, progress: 0 },
				color = shown.owner === -1 ? "#d4bf86" : colors[shown.owner] || "#d4bf86",
				// Act II chapter VI: the control nodes of the Hefajstos complex carry their machines.
				machine = game.missionId === "colony6" ? node.name : null,
				r = make(`relay|${i}|${color}|${node.hill ? 1 : 0}|${machine || ""}`, () => models3d.scenery("relay", color, !!node.hill, machine));
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
