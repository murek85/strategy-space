/* The ground of the board as native PixiJS objects (WebGL/WebGPU renderer).
   Replaces the most expensive Canvas phase, which repainted every deposit, relay, puddle and track
   in every frame:
   - deposits (ore, gas, crystals), relays and wreck debris are retained sprites; their look is painted
     once by the same art code as the Canvas board and repainted only when their state changes
     (amount left, owner, colours);
   - what moves is native: rising gas, relay capture arcs, lake ripples, tracks, dust behind vehicles
     and the paths of selected units;
   - puddles (ash worlds) and frost (ice worlds) are baked into one map texture, again only when
     they change (they grow during the first minutes and hide under new buildings).
   Animated map effects from plugins, habitats and walls stay in the Canvas layer (phase groundTop). */
function createNativeGround(options) {
	"use strict";
	const { canvasRenderer, depositOverlays } = options;
	const { MISSIONS } = RTS;
	// Deposits and relays are painted at 1.5× so they stay sharp when zoomed in.
	const BAKE = 1.5,
		STATIC_SCALE = 0.5;
	const root = new PIXI.Container(),
		tracksLayer = new PIXI.Container(),
		staticSprite = new PIXI.Sprite(PIXI.Texture.EMPTY),
		lakesLayer = new PIXI.Container(),
		oresLayer = new PIXI.Container(),
		gasLayer = new PIXI.Container(),
		plumesLayer = new PIXI.Container(),
		crystalsLayer = new PIXI.Container(),
		debrisLayer = new PIXI.Container(),
		wrecksLayer = new PIXI.Container(),
		cratersLayer = new PIXI.Container(),
		nodesLayer = new PIXI.Container(),
		labelsLayer = new PIXI.Container(),
		// Volume light over the deposits (sun and moon), as over the buildings.
		depositLightLayer = new PIXI.Container(),
		lines = new PIXI.Graphics();
	// Same order as the Canvas phase: tracks, puddles, lakes, ores, gas, crystals, debris, relays, paths.
	root.addChild(tracksLayer, staticSprite, lakesLayer, oresLayer, gasLayer, plumesLayer, crystalsLayer, depositLightLayer, labelsLayer, cratersLayer, debrisLayer, wrecksLayer, nodesLayer, lines);

	const canvasOf = (w, h) => {
		const c = document.createElement("canvas");
		c.width = Math.max(1, Math.ceil(w));
		c.height = Math.max(1, Math.ceil(h));
		return c;
	};
	const mipmapped = (canvas) => new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: canvas, autoGenerateMipmaps: true, scaleMode: "linear", mipmapFilter: "linear" }) });
	const shape = (w, h, draw) => {
		const c = canvasOf(w, h);
		draw(c.getContext("2d"));
		return PIXI.Texture.from(c);
	};
	const ellipseTexture = shape(64, 64, (c) => {
		c.fillStyle = "#fff";
		c.beginPath();
		c.ellipse(32, 32, 31, 31, 0, 0, Math.PI * 2);
		c.fill();
	});
	// Track prints in white (tinted per world), drawn at 4× for clean edges.
	const vehicleTrack = shape(64, 112, (c) => {
		c.scale(4, 4);
		c.translate(8, 14);
		c.fillStyle = "#fff";
		for (const y of [-12, 9]) c.fillRect(-5, y, 10, 3);
	});
	const footTrack = shape(48, 56, (c) => {
		c.scale(4, 4);
		c.translate(6, 7);
		c.fillStyle = "#fff";
		c.fillRect(-3, -5, 5, 3);
		c.fillRect(1, 4, 5, 3);
	});

	let game = null,
		frame = 0;
	const textures = new Map();

	// Painted looks, cached by their state key; unused ones are released after a while.
	function look(key, w, h, ox, oy, paint) {
		let entry = textures.get(key);
		if (!entry) {
			const canvas = canvasOf(w * BAKE, h * BAKE),
				c = canvas.getContext("2d");
			c.scale(BAKE, BAKE);
			paint(c, ox, oy);
			entry = { texture: mipmapped(canvas), anchor: { x: ox / w, y: oy / h } };
			textures.set(key, entry);
		}
		entry.used = frame;
		return entry;
	}
	function releaseLooks() {
		if (textures.size < 240 || frame % 120) return;
		for (const [key, entry] of textures)
			if (frame - entry.used > 600) {
				entry.texture.destroy(true);
				textures.delete(key);
			}
	}

	// Deposit amounts: live text objects, redrawn only when the number changes (the deposit drawing
	// itself is cached per size step, so mining does not paint a new texture for every unit of ore).
	const labels = new Map();
	let labelUpdates = 0;
	function syncLabels(list, show, labelOf, dy) {
		for (const o of list) {
			let t = labels.get(o);
			if (!show(o)) {
				if (t) t.visible = false;
				continue;
			}
			const { text, color } = labelOf(o);
			if (!t) {
				t = new PIXI.Text({ text, style: { fontFamily: "Segoe UI", fontSize: 11, fill: color }, resolution: 4 });
				t.anchor.set(0.5, 0.78);
				labelsLayer.addChild(t);
				labels.set(o, t);
			}
			if (t.text !== text) {
				t.text = text;
				labelUpdates++;
			}
			if (t.style.fill !== color) t.style.fill = color;
			t.position.set(o.x, o.y + dy);
			t.visible = true;
		}
	}
	function clearLabels() {
		for (const t of labels.values()) t.destroy();
		labels.clear();
	}

	// Retained sprites for one kind of ground object.
	function retained(layer) {
		const sprites = new Map();
		return {
			sync(list, show, keyed, alpha = () => 1) {
				const alive = new Set();
				for (const o of list) {
					if (!show(o)) continue;
					alive.add(o);
					let sp = sprites.get(o);
					if (!sp) {
						sp = new PIXI.Sprite(PIXI.Texture.EMPTY);
						sp.scale.set(1 / BAKE);
						layer.addChild(sp);
						sprites.set(o, sp);
					}
					const entry = keyed(o);
					if (sp.texture !== entry.texture) sp.texture = entry.texture;
					sp.anchor.set(entry.anchor.x, entry.anchor.y);
					sp.position.set(o.x, o.y);
					sp.alpha = alpha(o);
					sp.visible = true;
				}
				for (const [o, sp] of sprites)
					if (!alive.has(o)) {
						sp.destroy();
						sprites.delete(o);
					}
			},
			clear() {
				for (const sp of sprites.values()) sp.destroy();
				sprites.clear();
			},
			get size() {
				return sprites.size;
			},
		};
	}
	const ores = retained(oresLayer),
		gas = retained(gasLayer),
		crystals = retained(crystalsLayer),
		debris = retained(debrisLayer),
		wrecks = retained(wrecksLayer),
		craters = retained(cratersLayer),
		nodes = retained(nodesLayer);

	// Pool of plain sprites for things redrawn every frame (tracks, dust, gas).
	function pool(layer) {
		const list = [];
		let used = 0;
		return {
			begin() {
				used = 0;
			},
			take(texture) {
				let sp = list[used];
				if (!sp) {
					sp = new PIXI.Sprite(texture);
					sp.anchor.set(0.5);
					layer.addChild(sp);
					list.push(sp);
				}
				used++;
				if (sp.texture !== texture) sp.texture = texture;
				sp.visible = true;
				return sp;
			},
			end() {
				for (let i = used; i < list.length; i++) list[i].visible = false;
			},
			get used() {
				return used;
			},
		};
	}
	const trackPool = pool(tracksLayer),
		plumePool = pool(plumesLayer),
		depositLightPool = pool(depositLightLayer);
	const lightTextures = new Map();
	const lightTexture = (canvas) => {
		if (!lightTextures.has(canvas)) lightTextures.set(canvas, PIXI.Texture.from(canvas));
		return lightTextures.get(canvas);
	};

	// Puddles and frost of the whole map, baked at half resolution.
	const staticBake = { canvas: null, texture: null, key: "" };
	function staticKey() {
		const accumulation = Math.min(1, 0.12 + game.time / 100);
		// Puddles grow during the first minutes and are hidden where buildings stand; units do not matter.
		let buildings = 0;
		for (const e of game.entities) if (!RTS.TYPES[e.type].speed && e.hp > 0) buildings++;
		return [Math.round(accumulation * 12), SceneFX.options.particles, buildings].join("|");
	}
	function bakeStatic(force) {
		const biome = MISSIONS[game.missionId].biome;
		staticSprite.visible = biome === "ash" || biome === "ice";
		if (!staticSprite.visible) return;
		const key = staticKey();
		if (!force && key === staticBake.key) return;
		staticBake.key = key;
		const w = Math.ceil(game.W * STATIC_SCALE),
			h = Math.ceil(game.H * STATIC_SCALE);
		if (!staticBake.canvas || staticBake.canvas.width !== w || staticBake.canvas.height !== h) {
			staticBake.texture?.destroy(true);
			staticBake.canvas = canvasOf(w, h);
			staticBake.texture = PIXI.Texture.from(staticBake.canvas);
		}
		const c = staticBake.canvas.getContext("2d");
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.clearRect(0, 0, w, h);
		c.scale(STATIC_SCALE, STATIC_SCALE);
		// The art's own ground routine with nothing but the world-specific puddles or frost.
		PlanetArt.ground(c, Object.create(game, { tracks: { value: [] }, waters: { value: [] } }), null);
		staticBake.texture.source.update();
		staticSprite.texture = staticBake.texture;
		staticSprite.scale.set(1 / STATIC_SCALE);
	}

	// Lakes: clipped gradient sheen and moving ripple lines, only while in sight (as in Canvas).
	let lakes = [];
	function buildLakes() {
		for (const l of lakes) l.box.destroy({ children: true });
		lakes = (game.waters || [])
			.filter((w) => !w.kind)
			.map((w) => {
				const box = new PIXI.Container(),
					mask = new PIXI.Graphics(),
					pts = [];
				for (let i = 0; i < 120; i++) {
					const a = (i * Math.PI * 2) / 120,
						r = RTS.waterRadius(w, a);
					pts.push(w.x + Math.cos(a) * w.rx * r, w.y + Math.sin(a) * w.ry * r);
				}
				mask.poly(pts).fill({ color: 0xffffff });
				const sheen = new PIXI.Sprite(
					shape(64, 64 * (w.ry / w.rx), (c) => {
						const g = c.createLinearGradient(0, 0, c.canvas.width, c.canvas.height);
						g.addColorStop(0, "#bde4e016");
						g.addColorStop(0.45, "#2e72801e");
						g.addColorStop(1, "#071c2b28");
						c.fillStyle = g;
						c.fillRect(0, 0, c.canvas.width, c.canvas.height);
					}),
				);
				sheen.position.set(w.x - w.rx, w.y - w.ry);
				sheen.width = w.rx * 2;
				sheen.height = w.ry * 2;
				const ripples = new PIXI.Graphics();
				box.addChild(sheen, ripples, mask);
				box.mask = mask;
				lakesLayer.addChild(box);
				return { w, box, ripples };
			});
	}
	function updateLakes(inView) {
		for (const { w, box, ripples } of lakes) {
			box.visible = game.isVisible(w.x, w.y) && inView(w, Math.max(w.rx, w.ry));
			if (!box.visible) continue;
			ripples.clear();
			for (let i = 0; i < 16; i++) {
				const yy = w.y - w.ry + (i * w.ry * 2) / 15,
					span = w.rx * Math.sqrt(Math.max(0, 1 - ((yy - w.y) / w.ry) ** 2)),
					phase = game.time * (0.35 + (i % 3) * 0.11) + i * 0.9;
				if (span <= 0) continue;
				for (let x = -span; x <= span; x += 7) {
					const py = yy + Math.sin(x * 0.045 + phase) * 2.1 + Math.sin(x * 0.018 - phase * 0.7) * 1.2;
					if (x === -span) ripples.moveTo(w.x + x, py);
					else ripples.lineTo(w.x + x, py);
				}
				ripples.stroke(i % 3 ? { width: i % 4 === 0 ? 1.4 : 0.7, color: 0x9bc8c9, alpha: 0x2c / 255 } : { width: i % 4 === 0 ? 1.4 : 0.7, color: 0xe0f0df, alpha: 0x3b / 255 });
			}
		}
	}

	function updateTracks(inView) {
		const biome = MISSIONS[game.missionId].biome,
			ink = biome === "ice" ? 0x162c40 : 0x090f16,
			dust = biome === "ice" ? 0xdbe6e5 : biome === "ash" ? 0xa8b3ba : 0xd8b995;
		trackPool.begin();
		for (const t of game.tracks || []) {
			if (!game.isVisible(t.x, t.y) || !inView(t, 40)) continue;
			const sp = trackPool.take(t.vehicle ? vehicleTrack : footTrack);
			sp.position.set(t.x, t.y);
			sp.rotation = t.angle;
			sp.scale.set(0.25);
			sp.tint = ink;
			sp.alpha = Math.min(0.35, t.life / 45);
			if (t.vehicle && t.life > 21.3) {
				const d = trackPool.take(ellipseTexture),
					cos = Math.cos(t.angle),
					sin = Math.sin(t.angle);
				d.position.set(t.x - 12 * cos, t.y - 12 * sin);
				d.rotation = t.angle;
				d.scale.set(15 / 31, 8 / 31);
				d.tint = dust;
				d.alpha = (t.life - 21.3) * 0.1;
			}
		}
		trackPool.end();
	}

	function update(view) {
		frame++;
		const { camera, scale, width, height, colors, selected } = view,
			seen = { x: camera.x, y: camera.y, w: width / scale, h: height / scale },
			inView = (p, m = 150) => Math.abs(p.x - seen.x) < seen.w / 2 + m && Math.abs(p.y - seen.y) < seen.h / 2 + m,
			explored = (o) => !!game.explored[game.visionIndex(o.x, o.y)],
			time = game.time;
		bakeStatic(false);
		updateTracks(inView);
		updateLakes(inView);

		const oreLook = (o) => look("o|" + BoardArt.resourceLook(o, false), 150, 130, 75, 62, (c, x, y) => BoardArt.resource(c, { ...o, x, y }, false, null, false)),
			gasLook = (o) => look("g|" + BoardArt.resourceLook(o, true), 150, 130, 75, 62, (c, x, y) => BoardArt.resource(c, { ...o, x, y }, true, null, false)),
			crystalLook = (o) => look("c|" + BoardArt.crystalLook(o), 120, 110, 60, 55, (c, x, y) => BoardArt.crystal(c, { ...o, x, y }, false));
		ores.sync(game.ores, (o) => explored(o) && inView(o), oreLook);
		gas.sync(game.gasFields, (o) => explored(o) && inView(o), gasLook);
		// Rising gas: the same motion as the Canvas art (stronger over a working extractor), frozen while
		// the field is out of sight.
		plumePool.begin();
		for (const o of game.gasFields) {
			if (!o.amount || !explored(o) || !inView(o)) continue;
			const t = game.isVisible(o.x, o.y) ? time : 0;
			for (const p of BoardArt.plumeParts(t, canvasRenderer.gasFlowing(view, o))) {
				const sp = plumePool.take(ellipseTexture);
				sp.position.set(o.x + p.x, o.y + p.y);
				sp.scale.set(p.rx / 31, p.ry / 31);
				sp.tint = 0xc89ee5;
				sp.alpha = p.alpha;
			}
		}
		plumePool.end();
		crystals.sync(game.crystalFields, (o) => explored(o) && inView(o), crystalLook);
		// Sun and moon light over the deposits (drawn at scale 1 from the same art, one per kind and stage).
		depositLightPool.begin();
		if (depositOverlays) {
			const lit = (list, kind, stageOf, box, paint) => {
				for (const o of list) {
					if (!explored(o) || !inView(o)) continue;
					for (const v of depositOverlays(kind + "|" + stageOf(o), box, (c) => paint(c, o))) {
						const sp = depositLightPool.take(lightTexture(v.canvas));
						// The pool centres its sprites; the light is placed by its own origin.
						sp.anchor.set(0);
						sp.position.set(o.x - v.ox, o.y - v.oy);
						sp.alpha = v.alpha;
					}
				}
			};
			const big = { w: 150, h: 130, ox: 75, oy: 62 };
			lit(game.ores, "o", (o) => BoardArt.resourceLook(o, false), big, (c, o) => BoardArt.resource(c, { ...o, x: 0, y: 0 }, false, null, false));
			lit(game.gasFields, "g", (o) => BoardArt.resourceLook(o, true), big, (c, o) => BoardArt.resource(c, { ...o, x: 0, y: 0 }, true, null, false));
			lit(game.crystalFields, "c", (o) => BoardArt.crystalLook(o), { w: 120, h: 110, ox: 60, oy: 55 }, (c, o) => BoardArt.crystal(c, { ...o, x: 0, y: 0 }, false));
		}
		depositLightPool.end();
		const shown = (o) => explored(o) && inView(o);
		syncLabels(game.ores, shown, (o) => BoardArt.resourceLabel(o, false), 48);
		syncLabels(game.gasFields, shown, (o) => BoardArt.resourceLabel(o, true), 48);
		syncLabels(game.crystalFields, shown, (o) => BoardArt.crystalLabel(o), 44);
		debris.sync(
			game.debris,
			(d) => game.isVisible(d.x, d.y) && inView(d),
			(d) => {
				const size = Math.round(d.size);
				return look("d|" + size, size * 2 + 6, 26, size + 3, 12, (c, x, y) => {
					c.translate(x, y);
					c.beginPath();
					[
						[-size, 3],
						[-size * 0.4, -8],
						[size, 0],
						[size * 0.6, 9],
					].forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
					c.closePath();
					c.fillStyle = "#242a2b";
					c.fill();
					c.strokeStyle = "#635a48";
					c.stroke();
				});
			},
			(d) => Math.min(1, d.life / 5),
		);
		// Craters after heavy fire, fading in their last minute (same art as Canvas).
		if (typeof FxArt !== "undefined")
			craters.sync(
				game.craters || [],
				(k) => explored(k) && inView(k),
				(k) => look(["k", k.size, k.seed || 0].join("|"), k.size * 3 + 20, k.size * 2 + 20, k.size * 1.5 + 10, k.size + 10, (c, x, y) => FxArt.crater(c, { ...k, x, y })),
				(k) => FxArt.craterAlpha(game, k),
			);
		// Salvageable wrecks (Stage E), painted by the same art as in Canvas.
		if (typeof SupportArt !== "undefined")
			wrecks.sync(game.wrecks || [], (w) => explored(w) && inView(w), (w) =>
				look(["w", w.id, w.value, Math.round(w.size)].join("|"), 130, 110, 65, 50, (c, x, y) => SupportArt.wreck(c, { ...w, x, y })),
			);
		// Relays: the owner as the player sees it (an unseen enemy relay looks neutral), as in Canvas.
		const shownNode = (n) => (game.isVisible(n.x, n.y) || n.owner === (game.viewer ?? 0) ? n : { ...n, owner: -1, progress: 0 });
		nodes.sync(game.nodes, (n) => explored(n) && inView(n, 200), (n) => {
			const s = shownNode(n),
				color = s.owner === -1 ? "#d4bf86" : colors[s.owner] || "#d4bf86";
			return look(["n", s.owner, s.name, color, s.owner > 0 ? game.sideName?.(s.owner) || "" : ""].join("|"), 200, 200, 100, 100, (c, x, y) => canvasRenderer.paintNode(c, view, { ...s, x, y, progress: 0 }));
		});

		lines.clear();
		for (const n of game.nodes) {
			const s = shownNode(n);
			if (!(s.progress > 0) || !explored(n) || !inView(n, 200)) continue;
			// A capture may be fading with nobody taking it (capturing −1, e.g. on campaign maps): the Canvas art
			// then keeps its previous colour, here the relay's own.
			const capture = colors[s.capturing] || colors[s.owner] || "#d4bf86";
			lines.arc(n.x, n.y, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.progress).stroke({ width: 4, color: capture });
		}
		// Paths of selected units: dashed like the Canvas setLineDash([5, 8]).
		for (const id of selected) {
			const e = game.get(id);
			if (!e?.path.length) continue;
			let dash = 0,
				prev = e;
			for (const p of e.path) {
				const len = Math.hypot(p.x - prev.x, p.y - prev.y);
				for (let d = 0; d < len; ) {
					const phase = dash % 13,
						on = phase < 5,
						step = Math.min(len - d, on ? 5 - phase : 13 - phase),
						a = d / len,
						b = (d + step) / len;
					if (on) lines.moveTo(prev.x + (p.x - prev.x) * a, prev.y + (p.y - prev.y) * a).lineTo(prev.x + (p.x - prev.x) * b, prev.y + (p.y - prev.y) * b);
					d += step;
					dash += step;
				}
				prev = p;
			}
			lines.stroke({ width: 1.5, color: 0xaee5c7, alpha: 0x38 / 255 });
			const end = e.path[e.path.length - 1];
			lines.circle(end.x, end.y, 6).stroke({ width: 1.5, color: 0xaee5c7, alpha: 0x80 / 255 });
		}
		releaseLooks();
	}

	return {
		container: root,
		setGame(next) {
			// Labels belong to one battle's deposits; the same battle keeps them.
			if (next !== game) clearLabels();
			game = next;
			for (const r of [ores, gas, crystals, debris, wrecks, craters, nodes]) r.clear();
			buildLakes();
			staticBake.key = "";
			bakeStatic(true);
		},
		update,
		stats: () => ({ looks: textures.size, deposits: ores.size + gas.size + crystals.size, relays: nodes.size, debris: debris.size, tracks: trackPool.used, plumes: plumePool.used, lakes: lakes.length, labels: labels.size, labelUpdates }),
	};
}
