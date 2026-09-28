/* Units and buildings as native PixiJS objects (WebGL/WebGPU renderer), made the same way as the ground:
   the look of a model is painted by the same art code as the Canvas board, into its own small texture,
   and repainted only when its state changes. Everything that moves every frame is native.
   - State key: type, team, faction, colour, direction (64 steps; the small rest is a sprite rotation),
     turret aim, motion, firing, hit, cargo, work, construction stage, damage, passengers, gate, wall…
   - Whether a look is animated in time (legs, tracks, rotors, pumps, fire) is measured once per kind of
     state: the look is painted at two moments and compared. Still looks are shared between models;
     animated ones get their own texture, repainted up to 20 times per second (with a per-frame budget).
   - Native: position, direction, sun shadows, selection rings, construction frames, ranges, repair
     beams, health and construction bars, hit flashes, combat effects, habitats and walls.
   - Light: buildings get volume light and damage scars (overlays); units get the same volume light made
     from the look shown (turret included), and vehicles soot when damaged (unitOverlays). */
function createNativeModels(options) {
	"use strict";
	const { canvasRenderer, silhouette, overlays, unitOverlays, lightFrame, shadowFrame } = options;
	const { TYPES, MISSIONS } = RTS;
	// Habitats keep one fixed painting scale.
	const BAKE = 1.5,
		TAU = Math.PI * 2,
		DIRS = 64,
		AIMS = 32,
		FPS = 20,
		BUDGET = 40;
	const root = new PIXI.Container(),
		habitatsLayer = new PIXI.Container(),
		walls = new PIXI.Graphics(),
		shadowsLayer = new PIXI.Container(),
		entitiesLayer = new PIXI.Container(),
		bars = new PIXI.Graphics(),
		labels = new PIXI.Container(),
		effects = new PIXI.Graphics();
	entitiesLayer.sortableChildren = true;
	root.addChild(habitatsLayer, walls, shadowsLayer, entitiesLayer, bars, labels, effects);

	const canvasOf = (w, h) => {
		const c = document.createElement("canvas");
		c.width = Math.max(1, Math.ceil(w));
		c.height = Math.max(1, Math.ceil(h));
		return c;
	};
	// Still looks get mipmaps (sharp when zoomed out); animated ones are repainted too often for that.
	const textureOf = (canvas, mipmaps = true) => new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: canvas, autoGenerateMipmaps: mipmaps, scaleMode: "linear", mipmapFilter: "linear" }) });
	const ellipseTexture = (() => {
		const c = canvasOf(64, 64),
			x = c.getContext("2d");
		x.fillStyle = "#fff";
		x.beginPath();
		x.ellipse(32, 32, 31, 31, 0, 0, TAU);
		x.fill();
		return PIXI.Texture.from(c);
	})();
	const silhouetteTextures = new Map();
	const silhouetteTexture = (canvas) => {
		if (!silhouetteTextures.has(canvas)) silhouetteTextures.set(canvas, PIXI.Texture.from(canvas));
		return silhouetteTextures.get(canvas);
	};
	const overlayTextures = new Map();
	const overlayTexture = (canvas) => {
		if (!overlayTextures.has(canvas)) overlayTextures.set(canvas, PIXI.Texture.from(canvas));
		return overlayTextures.get(canvas);
	};

	let game = null,
		view = null,
		frame = 0,
		budget = 0,
		repaints = 0;
	const shared = new Map(),
		animatedKinds = new Map(),
		records = new Map();

	const bucket = (angle, steps) => ((Math.round((angle / TAU) * steps) % steps) + steps) % steps;
	// Looks are painted at a scale matching the zoom (steps of about 1.25×), so they stay as sharp as the
	// Canvas board; after a zoom change the new ones arrive within the per-frame budget.
	const LEVELS = [0.4, 0.5, 0.64, 0.8, 1, 1.25, 1.6, 2, 2.5, 3.2];
	let level = 1.25;
	function paint(canvas, w, h, ox, oy, draw, time, at) {
		const c = canvas.getContext("2d");
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.clearRect(0, 0, canvas.width, canvas.height);
		c.setTransform(at, 0, 0, at, at * ox, at * oy);
		draw(c, time);
	}
	// part: body/top; kindKey: the state without direction (for the animated test); key: the full state.
	// Returns { texture, anchor, level } — the sprite is scaled by 1 / level.
	function look(rec, part, kindKey, key, box, draw) {
		const { w, h, ox, oy } = box,
			anchor = { x: ox / w, y: oy / h },
			at = level;
		let animated = animatedKinds.get(kindKey);
		if (animated === undefined) {
			// The test for motion is painted small: it only has to see whether anything moves.
			const probe = Math.min(at, 0.64),
				a = canvasOf(w * probe, h * probe),
				b = canvasOf(w * probe, h * probe);
			// The read-back hint has to be given with the first context request.
			a.getContext("2d", { willReadFrequently: true });
			b.getContext("2d", { willReadFrequently: true });
			paint(a, w, h, ox, oy, draw, game.time, probe);
			paint(b, w, h, ox, oy, draw, game.time + 0.37, probe);
			const da = a.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, a.width, a.height).data,
				db = b.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, b.width, b.height).data;
			animated = false;
			for (let i = 0; i < da.length; i += 4)
				if (da[i + 3] !== db[i + 3] || da[i] !== db[i]) {
					animated = true;
					break;
				}
			animatedKinds.set(kindKey, animated);
			if (!animated && probe === at) remember(key, at, { texture: textureOf(a), anchor, level: at });
		}
		if (!animated) {
			const levels = shared.get(key);
			let entry = levels?.get(at);
			if (!entry) {
				// Out of budget: keep showing the look painted for another zoom, if there is one.
				if (budget <= 0 && levels?.size) entry = [...levels.values()][0];
				else {
					const canvas = canvasOf(w * at, h * at);
					paint(canvas, w, h, ox, oy, draw, game.time, at);
					entry = remember(key, at, { texture: textureOf(canvas), anchor, level: at });
					budget--;
					repaints++;
				}
			}
			entry.used = frame;
			return entry;
		}
		// Animated: this model's own texture, repainted when the moment or the state moves on.
		let own = rec.own[part];
		if (!own || own.w !== w || own.h !== h || own.level !== at) {
			own?.texture.destroy(true);
			const canvas = canvasOf(w * at, h * at);
			own = rec.own[part] = { canvas, texture: textureOf(canvas, false), key: null, w, h, level: at };
		}
		const moment = key + "|" + Math.floor(game.time * FPS);
		if (own.key !== moment && (budget > 0 || own.key === null || !own.key.startsWith(key + "|"))) {
			paint(own.canvas, w, h, ox, oy, draw, game.time, at);
			own.texture.source.update();
			own.key = moment;
			budget--;
			repaints++;
		}
		return { texture: own.texture, anchor, level: at };
	}
	function remember(key, at, entry) {
		if (!shared.has(key)) shared.set(key, new Map());
		shared.get(key).set(at, entry);
		entry.used = frame;
		return entry;
	}
	function releaseShared() {
		if (frame % 120) return;
		for (const [key, levels] of shared) {
			for (const [at, entry] of levels)
				if (frame - entry.used > 600 || (at !== level && frame - entry.used > 60)) {
					entry.texture.destroy(true);
					levels.delete(at);
				}
			if (!levels.size) shared.delete(key);
		}
	}

	// The same decision as the Canvas phase: which art draws the model, and the faction trim on top.
	function drawBody(c, e, time, target, working) {
		const biome = MISSIONS[game.missionId].biome;
		if (!SceneFX.construction(c, e) && !Act2Art.body(c, e, time) && !AdvancedArt.body(c, e, time, biome)) BoardArt.body(c, e, time, target, working);
		if (!e.constructionLeft || 1 - e.constructionLeft / TYPES[e.type].construction >= 0.65) AdvancedArt.factionDetails(c, e, time);
	}
	function drawTop(c, e, time) {
		const s = TYPES[e.type],
			color = game.colorFor(e.team);
		if (e.type === "hq") {
			c.save();
			c.fillStyle = color;
			c.font = "bold 13px Segoe UI";
			c.textAlign = "center";
			c.fillText(e.team === (game.viewer ?? 0) ? (game.centerLevel() === 2 ? "II · KOLONIA" : "I · PRZYCZÓŁEK") : "II", 0, -90);
			c.restore();
		}
		PlanetArt.damage(c, e, time);
		if (e.constructionLeft && 1 - e.constructionLeft / s.construction >= 0.25) BoardArt.scaffold(c, e, time);
		if (["trooper", "rocket"].includes(e.type) && game.cover(e)) {
			c.strokeStyle = "#c8e7d077";
			c.lineWidth = 2;
			c.beginPath();
			c.arc(0, 2, s.radius + 7, Math.PI * 0.15, Math.PI * 0.85);
			c.stroke();
		}
		if (!s.speed) {
			c.font = "10px Segoe UI";
			c.textAlign = "center";
			c.fillStyle = color;
			// An extractor stands on its gas deposit: its name goes below the deposit's amount label.
			c.fillText((game.entityName?.(e) || s.name).toUpperCase(), 0, s.radius + (e.type === "extractor" ? 34 : 20));
		}
	}
	const hasTop = (e, s) =>
		e.type === "hq" ||
		!s.speed ||
		(!e.constructionLeft && e.hp / e.maxHp <= 0.55 && !["beast", "trooper", "rocket"].includes(e.type)) ||
		(e.constructionLeft && 1 - e.constructionLeft / s.construction >= 0.25) ||
		(["trooper", "rocket"].includes(e.type) && game.cover(e));

	function boxFor(s) {
		if (!s.speed) return { w: 300, h: 330, ox: 150, oy: 200 };
		const size = Math.max(130, Math.ceil(s.radius * 7));
		return { w: size, h: size, ox: size / 2, oy: size / 2 };
	}

	// State of one model, with its direction rounded; `rest` is the small rotation that makes it exact.
	function modelState(e) {
		const s = TYPES[e.type],
			unit = !!s.speed,
			moving = e.path.length > 0,
			target = e.target ? game.get(e.target) : null;
		let direction = e.angle;
		if (e.type === "tank" && moving) direction = Math.atan2(e.path[0].y - e.y, e.path[0].x - e.x);
		const d = unit ? bucket(direction, DIRS) : 0,
			rest = unit ? direction - (d / DIRS) * TAU : 0,
			a = bucket(e.angle - rest, unit ? DIRS : 96),
			aimAngle = target ? Math.atan2(target.y - e.y, target.x - e.x) - rest : 0,
			aim = target ? bucket(aimAngle, AIMS) : -1,
			fire = e.cooldown > s.cooldown - 0.13 ? Math.ceil(((e.cooldown - (s.cooldown - 0.13)) / 0.13) * 3) : 0,
			construction = e.constructionLeft ? Math.floor((1 - e.constructionLeft / s.construction) * 24) : -1,
			// Damage matters to the look only at the art's thresholds: scars (0.72), fire (0.55), smoke
			// (0.45), heavy fire (0.28). Continuous fire size is drawn in the animated top part anyway.
			health = Math.max(0, e.hp) / e.maxHp,
			hp = health > 0.72 ? 0 : health > 0.55 ? 1 : health > 0.45 ? 2 : health > 0.28 ? 3 : 4,
			working = e.type === "worker" || e.type === "extractor" ? canvasRenderer.entityWorking(view, e) : false;
		const probe = { ...e, angle: (a / (unit ? DIRS : 96)) * TAU };
		if (moving) {
			const pd = (d / DIRS) * TAU;
			probe.path = [{ x: e.x + Math.cos(pd) * 40, y: e.y + Math.sin(pd) * 40 }, ...e.path.slice(1)];
		}
		const aimed = target ? { ...target, x: e.x + Math.cos((aim / AIMS) * TAU) * 100, y: e.y + Math.sin((aim / AIMS) * TAU) * 100 } : null;
		// Stage E states that change the look: sabotage (animated sparks), hidden saboteurs, a charge being
		// planted, a module being fitted.
		const disabledNow = (e.disabledUntil || 0) > game.time ? 1 : 0,
			kindKey = [e.type, e.team, moving ? 1 : 0, working ? 1 : 0, fire, e.hit > 0 ? 1 : 0, construction, hp, e.open ? 1 : 0, disabledNow, e.stealth ? 1 : 0, e.planting > 0 ? 1 : 0].join("|");
		const key = [
			kindKey,
			e.faction || "",
			e.tint || "",
			d,
			a,
			aim,
			Math.min(5, Math.ceil((e.cargo || 0) / 12)),
			e.cargoKind || "",
			(e.repairTargets || []).length,
			(e.passengers || []).length,
			e.wallAngle ? bucket(e.wallAngle, 96) : "",
			e.archive ? 1 : 0,
			e.energy !== undefined ? Math.round(e.energy * 10) : "",
			e.module || "",
			(e.moduleLeft || 0) > 0 ? 1 : 0,
			disabledNow ? Math.ceil(e.disabledUntil - game.time) : "",
			(e.chargeReady || 0) > game.time ? 1 : 0,
			e.type === "shieldgen" ? [Math.round((e.shield || 0) / 35), (e.overload || 0) > 0 ? 1 : 0].join(":") : "",
			(e.healTargets || []).length,
			e.type === "uplink" ? ((e.strikeReady || 0) > game.time ? 0 : 1) : "",
		].join("|");
		return { s, unit, rest, lookAngle: (d / DIRS) * TAU, probe, aimed, working, kindKey, key, box: boxFor(s) };
	}

	function record(e) {
		let rec = records.get(e);
		if (rec) return rec;
		rec = {
			box: new PIXI.Container(),
			under: new PIXI.Graphics(),
			shadow: new PIXI.Sprite(ellipseTexture),
			marks: new PIXI.Graphics(),
			body: new PIXI.Sprite(PIXI.Texture.EMPTY),
			layers: new PIXI.Container(),
			top: new PIXI.Sprite(PIXI.Texture.EMPTY),
			sun: new PIXI.Container(),
			sunSprite: new PIXI.Sprite(PIXI.Texture.EMPTY),
			own: {},
			seen: frame,
		};
		rec.shadow.anchor.set(0.5);
		rec.shadow.tint = 0x07111a;
		rec.shadow.alpha = 0x65 / 255;
		rec.box.addChild(rec.under, rec.shadow, rec.marks, rec.body, rec.layers, rec.top);
		rec.sun.addChild(rec.sunSprite);
		entitiesLayer.addChild(rec.box);
		shadowsLayer.addChild(rec.sun);
		records.set(e, rec);
		return rec;
	}
	function drop(e, rec) {
		for (const own of Object.values(rec.own)) own.texture.destroy(true);
		rec.box.destroy({ children: true });
		rec.sun.destroy({ children: true });
		records.delete(e);
	}

	// Dashes along a polyline, continuing across its corners (like setLineDash).
	function dashed(g, points, on, off, offset = 0) {
		let dash = ((offset % (on + off)) + on + off) % (on + off);
		for (let i = 1; i < points.length; i++) {
			const [ax, ay] = points[i - 1],
				[bx, by] = points[i],
				len = Math.hypot(bx - ax, by - ay);
			for (let d = 0; d < len; ) {
				const phase = dash % (on + off),
					inside = phase < on,
					step = Math.min(len - d, inside ? on - phase : on + off - phase);
				if (inside) g.moveTo(ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len).lineTo(ax + ((bx - ax) * (d + step)) / len, ay + ((by - ay) * (d + step)) / len);
				d += step;
				dash += step;
			}
		}
	}
	const ring = (x, y, rx, ry, n = 72) => Array.from({ length: n + 1 }, (_, i) => [x + Math.cos((i / n) * TAU) * rx, y + Math.sin((i / n) * TAU) * ry]);

	function decorate(rec, e, s, selected, color) {
		const u = rec.under,
			m = rec.marks;
		u.clear();
		m.clear();
		if (e.type === "flak" && selected && e.team === (game.viewer ?? 0)) {
			dashed(u, ring(0, 0, s.range, s.range, 96), 6, 9);
			u.stroke({ width: 1, color: 0x91c7dd, alpha: 0x66 / 255 });
		}
		if (e.type === "workshop" && selected && e.team === (game.viewer ?? 0)) {
			dashed(u, ring(0, 0, 190, 190, 96), 6, 8);
			u.stroke({ width: 1, color: 0x8fdec5, alpha: 0x77 / 255 });
		}
		if ((e.type === "workshop" || e.type === "serviceRover") && !e.constructionLeft)
			for (const id of e.repairTargets || []) {
				const unit = game.get(id);
				if (!unit || unit.hp <= 0) continue;
				dashed(
					u,
					[
						[0, -20],
						[unit.x - e.x, unit.y - e.y],
					],
					3,
					7,
					game.time * 15,
				);
				u.stroke({ width: 1.5, color: 0x9be6c5, alpha: 0x70 / 255 });
			}
		// Medical post: care lines to the soldiers being treated (as in Canvas).
		if (e.type === "medbay" && !e.constructionLeft)
			for (const id of e.healTargets || []) {
				const unit = game.get(id);
				if (!unit || unit.hp <= 0) continue;
				dashed(
					u,
					[
						[0, -30],
						[unit.x - e.x, unit.y - e.y],
					],
					2,
					6,
					game.time * 20,
				);
				u.stroke({ width: 1.5, color: 0x8de7b8, alpha: 0x70 / 255 });
			}
		rec.shadow.position.set(6, 10);
		rec.shadow.scale.set((s.radius * 1.3) / 31, (s.radius * 0.65) / 31);
		if (selected) m.ellipse(0, 2, s.radius + 9, (s.radius + 9) * 0.7).stroke({ width: 1.8, color });
		if (e.constructionLeft) {
			const r = s.radius + 6,
				sq = [
					[-r, -r],
					[r, -r],
					[r, r],
					[-r, r],
					[-r, -r],
				];
			dashed(m, sq, 5, 5);
			m.stroke({ width: 1, color: 0xddc287, alpha: 0.55 });
		}
	}

	function updateOverlays(rec, e, state, body) {
		let list;
		if (state.unit && unitOverlays) {
			// angle: the look's own direction (the hull for a moving tank), for the soot pattern.
			list = unitOverlays(e, { key: "b|" + state.key, box: state.box, draw: body, angle: state.lookAngle });
			// Out of budget this frame: keep the light of the previous look (a few degrees off at most).
			if (list === null) list = rec.unitLight || [];
			rec.unitLight = list;
		} else list = overlays(e);
		// Unit looks are turned by the small rest of their direction, like the body.
		rec.layers.rotation = state.unit ? state.rest : 0;
		while (rec.layers.children.length < list.length) {
			const sp = new PIXI.Sprite(PIXI.Texture.EMPTY);
			rec.layers.addChild(sp);
		}
		rec.layers.children.forEach((sp, i) => {
			const v = list[i];
			sp.visible = !!v;
			if (!v) return;
			sp.texture = overlayTexture(v.canvas);
			sp.position.set(-v.ox, -v.oy);
			sp.alpha = v.alpha;
		});
	}

	function updateSun(rec, e, s) {
		const { alpha, sunX, stretch } = shadowFrame;
		rec.sun.visible = alpha > 0.01 && e.type !== "wall" && e.type !== "gate";
		if (!rec.sun.visible) return;
		shadowFrame.count++;
		const moving = e.path.length > 0,
			sil = silhouette(e, moving ? Math.floor(game.time * 8) % 4 : 0, moving),
			lift = s.flying ? 26 : 0,
			h = s.speed ? s.radius * 0.6 + lift : s.radius * 1.3,
			sp = rec.sunSprite;
		sp.texture = silhouetteTexture(sil.canvas);
		sp.anchor.set(sil.ox / sil.canvas.width, sil.oy / sil.canvas.height);
		sp.tint = 0x000000;
		rec.sun.alpha = alpha * (s.flying ? 0.6 : 1) * (e.constructionLeft ? 0.5 : 1);
		if (s.speed) {
			// Flattened copy beside the unit: scale first, then the unit's own rotation (as in Canvas).
			rec.sun.position.set(e.x + sunX * h * stretch * 0.35, e.y + h * 0.25 + lift * 0.6);
			rec.sun.scale.set(1, 0.7);
			sp.rotation = e.angle;
			sp.skew.x = 0;
			sp.scale.set(1);
		} else {
			// Buildings lean it from their base so it stays attached.
			rec.sun.position.set(e.x + sunX * s.radius * 0.35, e.y + s.radius * 0.28);
			rec.sun.scale.set(1);
			sp.rotation = 0;
			sp.skew.x = -sunX * 0.45;
			sp.scale.set(1, 0.62);
		}
	}

	// Habitats of the map's creatures: a baked look per kind, shown at the creature's home.
	const habitatSprites = new Map();
	function updateHabitats() {
		const alive = new Set();
		for (const e of game.entities) {
			if (!TYPES[e.type].threat || e.hp <= 0) continue;
			const h = e.home || e;
			if (!game.isVisible(h.x, h.y)) continue;
			alive.add(e);
			let sp = habitatSprites.get(e);
			if (!sp) {
				const key = "habitat|" + e.type;
				let entry = shared.get(key)?.get(BAKE);
				if (!entry) {
					const canvas = canvasOf(300 * BAKE, 260 * BAKE),
						c = canvas.getContext("2d");
					c.scale(BAKE, BAKE);
					AdvancedArt.habitats(c, { entities: [{ ...e, home: { x: 150, y: 110 } }], isVisible: () => true });
					entry = remember(key, BAKE, { texture: textureOf(canvas), anchor: { x: 0.5, y: 110 / 260 }, level: BAKE });
				}
				entry.used = frame;
				sp = new PIXI.Sprite(entry.texture);
				sp.anchor.set(entry.anchor.x, entry.anchor.y);
				sp.scale.set(1 / BAKE);
				habitatsLayer.addChild(sp);
				habitatSprites.set(e, sp);
			}
			shared.get("habitat|" + e.type).get(BAKE).used = frame;
			sp.position.set(h.x, h.y);
		}
		for (const [e, sp] of habitatSprites)
			if (!alive.has(e)) {
				sp.destroy();
				habitatSprites.delete(e);
			}
	}
	function updateWalls() {
		walls.clear();
		const nodes = game.entities.filter((e) => e.hp > 0 && ["wall", "gate", "turret"].includes(e.type));
		for (let i = 0; i < nodes.length; i++)
			for (let j = i + 1; j < nodes.length; j++) {
				const a = nodes[i],
					b = nodes[j],
					d = RTS.dist(a, b);
				if (a.team !== b.team || d > 70 || d < 30 || (!game.isVisible(a.x, a.y) && !game.isVisible(b.x, b.y))) continue;
				if (a.open || b.open) continue;
				const dx = (b.x - a.x) / d,
					dy = (b.y - a.y) / d,
					nx = -dy * 9,
					ny = dx * 9,
					alpha = a.constructionLeft || b.constructionLeft ? 0.35 : 1;
				walls.poly([a.x + nx, a.y + ny, b.x + nx, b.y + ny, b.x + nx, b.y + ny - 20, a.x + nx, a.y + ny - 20]).fill({ color: 0x526b70, alpha });
				walls.poly([a.x + nx, a.y + ny - 20, b.x + nx, b.y + ny - 20, b.x - nx, b.y - ny - 20, a.x - nx, a.y - ny - 20]).fill({ color: 0x849a9a, alpha });
			}
	}

	// Construction captions, reused between frames.
	const captionPool = [];
	function caption(i, text, x, y) {
		let t = captionPool[i];
		if (!t) {
			t = new PIXI.Text({ text, style: { fontFamily: "Segoe UI", fontSize: 11, fill: "#ddc287" }, resolution: 2 });
			t.anchor.set(0.5, 0.8);
			labels.addChild(t);
			captionPool.push(t);
		}
		if (t.text !== text) t.text = text;
		t.position.set(x, y);
		t.visible = true;
	}

	function updateEffects(colors) {
		effects.clear();
		for (const ef of game.effects) {
			if (ef.kind !== "command" && !game.isVisible(ef.x, ef.y)) continue;
			const a = Math.max(0, ef.life / ef.maxLife);
			if (ef.kind === "claw") {
				for (let i = 0; i < 3; i++) effects.arc(ef.tx + i * 5 - 5, ef.ty, 12 + (1 - a) * 9, 0.7, 2.7).stroke({ width: 3, color: 0xe7c091, alpha: a });
			} else if (ef.kind === "shot") {
				const color = ef.rocket ? "#f8d999" : colors[ef.team] || game.colorFor(ef.team) || "#f8d999",
					width = ef.rocket ? 4 : 2;
				// A wider faint stroke stands in for the Canvas shadow blur.
				effects.moveTo(ef.x, ef.y).lineTo(ef.tx, ef.ty).stroke({ width: width + 7, color, alpha: a * 0.18 });
				effects.moveTo(ef.x, ef.y).lineTo(ef.tx, ef.ty).stroke({ width, color, alpha: a });
				effects.circle(ef.x, ef.y, ef.rocket ? 8 : 5).fill({ color: 0xfff2bd, alpha: a });
			} else if (ef.kind === "explosion") {
				effects.circle(ef.x, ef.y, ef.size * (1 - a) + 4).stroke({ width: 4 * a, color: 0xf0c989, alpha: a });
				effects.circle(ef.x, ef.y, ef.size * a * 0.6).fill({ color: 0xdba76e, alpha: a * 0.5 });
				for (let i = 0; i < 8; i++) {
					const an = (i * Math.PI) / 4,
						r = (1 - a) * ef.size;
					effects.rect(ef.x + Math.cos(an) * r, ef.y + Math.sin(an) * r, 3, 3).fill({ color: i % 2 ? 0xeabc72 : 0x8c7770, alpha: a * 0.5 });
				}
			} else if (ef.kind === "command") {
				effects.circle(ef.x, ef.y, 10 + (1 - a) * 25).stroke({ width: 2, color: ef.attack ? 0xed8c78 : 0xaee5c7, alpha: a });
			} else if (typeof FxArt !== "undefined" && FxArt.handles(ef)) {
				FxArt.drawPixi(effects, FxArt.shapes(ef));
			}
		}
	}

	function update(v) {
		view = v;
		frame++;
		budget = BUDGET;
		lightFrame?.();
		shadowFrame.count = 0;
		const want = v.scale * (v.dpr || 1);
		level = LEVELS.find((l) => l >= want) || LEVELS[LEVELS.length - 1];
		repaints = 0;
		const { camera, scale, width, height, selected, colors } = v,
			seen = { x: camera.x, y: camera.y, w: width / scale, h: height / scale },
			inView = (p, m) => Math.abs(p.x - seen.x) < seen.w / 2 + m && Math.abs(p.y - seen.y) < seen.h / 2 + m;
		updateHabitats();
		updateWalls();
		bars.clear();
		let captions = 0;
		const shown = new Set();
		for (const e of game.entities) {
			if (e.team !== (game.viewer ?? 0) && !game.isVisible(e.x, e.y)) continue;
			const s = TYPES[e.type];
			if (!inView(e, s.speed ? 160 : 260)) continue;
			shown.add(e);
			const rec = record(e),
				state = modelState(e),
				color = game.colorFor(e.team),
				sel = selected.has(e.id);
			rec.box.visible = true;
			rec.box.position.set(e.x, e.y);
			rec.box.zIndex = (s.flying ? 1e7 : 0) + e.y;
			decorate(rec, e, s, sel, color);
			const drawLook = (c, time) => drawBody(c, state.probe, time, state.aimed, state.working),
				body = look(rec, "body", "b|" + state.kindKey, "b|" + state.key, state.box, drawLook);
			if (rec.body.texture !== body.texture) rec.body.texture = body.texture;
			rec.body.anchor.set(body.anchor.x, body.anchor.y);
			rec.body.scale.set(1 / body.level);
			rec.body.rotation = state.rest;
			updateOverlays(rec, e, state, drawLook);
			rec.top.visible = !!hasTop(e, s);
			if (rec.top.visible) {
				const topKind = ["t", e.type, color, state.kindKey, game.cover(e) ? 1 : 0, e.type === "hq" ? game.centerLevel() : ""].join("|"),
					top = look(rec, "top", topKind, topKind, state.box, (c, time) => drawTop(c, e, time));
				if (rec.top.texture !== top.texture) rec.top.texture = top.texture;
				rec.top.anchor.set(top.anchor.x, top.anchor.y);
				rec.top.scale.set(1 / top.level);
			}
			updateSun(rec, e, s);
			// Bars and flashes, as the Canvas phase draws them after each model.
			const r = s.radius;
			if (e.constructionLeft) {
				bars.rect(e.x - r, e.y - r - 20, r * 2, 6).fill(0x14242a);
				bars.rect(e.x - r, e.y - r - 20, r * 2 * (1 - e.constructionLeft / s.construction), 6).fill(0xddc287);
				caption(captions++, `BUDOWA · ${Math.ceil(e.constructionLeft)} s`, e.x, e.y - r - 27);
			}
			if (sel || e.hp < e.maxHp || e.type === "hq") {
				const bw = e.type === "hq" ? 108 : e.type === "tank" ? 46 : 28,
					y = e.y - (e.type === "hq" ? 82 : r + 16);
				bars.rect(e.x - bw / 2 - 1, y - 1, bw + 2, 5).fill({ color: 0x0b171b, alpha: 0xdd / 255 });
				bars.rect(e.x - bw / 2, y, (bw * Math.max(0, e.hp)) / e.maxHp, 3).fill(e.hp / e.maxHp < 0.3 ? 0xe7a075 : color);
			}
			if (e.hit > 0) bars.circle(e.x, e.y, r).fill({ color: 0xffffff, alpha: Math.min(1, e.hit * 3) });
		}
		for (let i = captions; i < captionPool.length; i++) captionPool[i].visible = false;
		const existing = new Set(game.entities);
		for (const [e, rec] of records) {
			if (shown.has(e)) {
				rec.seen = frame;
				continue;
			}
			rec.box.visible = false;
			rec.sun.visible = false;
			if (!existing.has(e) || frame - rec.seen > 900) drop(e, rec);
		}
		updateEffects(colors);
		releaseShared();
	}

	return {
		container: root,
		shadows: shadowsLayer,
		setGame(next) {
			game = next;
			for (const [e, rec] of records) drop(e, rec);
			for (const sp of habitatSprites.values()) sp.destroy();
			habitatSprites.clear();
		},
		update,
		stats: () => ({ models: records.size, level, shared: [...shared.values()].reduce((n, l) => n + l.size, 0), animatedKinds: [...animatedKinds.values()].filter(Boolean).length, stillKinds: [...animatedKinds.values()].filter((a) => !a).length, repaints }),
	};
}
