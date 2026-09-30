/* Wildlife and the sky as native PixiJS objects (WebGL/WebGPU renderer), made like the models:
   each look is painted once by the same art code as the Canvas board (AdvancedArt.animal,
   PlanetArt.bird, PlanetArt.fish, MapArt.island) and reused; motion is native.
   - land animals: 16 leg phases per kind, shared by all animals; the slow body sway is a rotation;
   - birds: 12 wing positions; fish: one look, swimming inside their lake (masked by its shape);
   - floating islands: painted once each (at rest, without the shadow) and bobbing; the shadow stays
     on the ground.
   Sky layers added by map plugins stay in Canvas (phase skyPlugins), only on maps that have them. */
function createNativeFauna() {
	"use strict";
	const { MISSIONS } = RTS;
	const TAU = Math.PI * 2,
		// Small creatures are painted at 3× so they stay crisp when zoomed in.
		SHARP = 3,
		PHASES = 16,
		WINGS = 12;
	const root = new PIXI.Container(),
		fishLayer = new PIXI.Container(),
		birdsLayer = new PIXI.Container(),
		animalsLayer = new PIXI.Container(),
		islandsLayer = new PIXI.Container();
	// Same order as the Canvas phase: fish, birds, land animals, then the islands above them.
	root.addChild(fishLayer, birdsLayer, animalsLayer, islandsLayer);

	const looks = new Map();
	function look(key, w, h, ox, oy, scale, draw, mipmaps = false) {
		let entry = looks.get(key);
		if (!entry) {
			const canvas = document.createElement("canvas");
			canvas.width = Math.ceil(w * scale);
			canvas.height = Math.ceil(h * scale);
			const c = canvas.getContext("2d");
			c.setTransform(scale, 0, 0, scale, ox * scale, oy * scale);
			draw(c);
			const texture = mipmaps ? new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: canvas, autoGenerateMipmaps: true, scaleMode: "linear", mipmapFilter: "linear" }) }) : PIXI.Texture.from(canvas);
			entry = { texture, anchor: { x: ox / w, y: oy / h }, scale: 1 / scale };
			looks.set(key, entry);
		}
		return entry;
	}
	function pool(layer) {
		const list = [];
		let used = 0;
		return {
			begin() {
				used = 0;
			},
			take(entry) {
				let sp = list[used];
				if (!sp) {
					sp = new PIXI.Sprite(entry.texture);
					layer.addChild(sp);
					list.push(sp);
				}
				used++;
				if (sp.texture !== entry.texture) sp.texture = entry.texture;
				sp.anchor.set(entry.anchor.x, entry.anchor.y);
				sp.scale.set(entry.scale);
				sp.rotation = 0;
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
	const birds = pool(birdsLayer),
		animals = pool(animalsLayer);

	const roundTexture = (() => {
		const c = document.createElement("canvas");
		c.width = c.height = 128;
		const x = c.getContext("2d");
		x.fillStyle = "#fff";
		x.beginPath();
		x.arc(64, 64, 63, 0, TAU);
		x.fill();
		return PIXI.Texture.from(c);
	})();
	let game = null,
		lakes = [],
		islands = [];
	const mod = (n, m) => ((n % m) + m) % m;

	function buildLakes() {
		for (const l of lakes) l.box.destroy({ children: true });
		lakes = (game.waters || [])
			.filter((w) => !w.kind)
			.map((w, wi) => {
				const box = new PIXI.Container(),
					mask = new PIXI.Graphics(),
					pts = [];
				for (let i = 0; i < 120; i++) {
					const a = (i * TAU) / 120,
						r = RTS.waterRadius(w, a);
					pts.push(w.x + Math.cos(a) * w.rx * r, w.y + Math.sin(a) * w.ry * r);
				}
				mask.poly(pts).fill({ color: 0xffffff });
				const fish = [];
				for (let i = 0; i < 7; i++) {
					const sp = new PIXI.Sprite(PIXI.Texture.EMPTY);
					box.addChild(sp);
					fish.push(sp);
				}
				box.addChild(mask);
				box.mask = mask;
				fishLayer.addChild(box);
				return { w, wi, box, fish };
			});
	}
	function buildIslands() {
		islandsLayer.removeChildren().forEach((c) => c.destroy());
		const theme = MISSIONS[game.missionId]?.theme;
		islands = MapArt.islands(game).map((s) => {
			const r = s.size,
				left = r * 1.2 + 30,
				right = r * 1.2 + 50,
				top = 100 + r * 0.4 + 45,
				bottom = Math.max(-100 + r * 2.2 + 10, 72, 30 + r * 0.4 + 5),
				// Painted at rest: the bob is zero at time -seed / 0.6.
				// Painted without its shadow: the shadow stays on the ground while the island bobs.
				entry = look("island|" + game.missionId + "|" + s.seed + "|" + s.x + "|" + s.y, left + right, top + bottom, left, top, 1.5, (c) => {
					c.translate(-s.x, -s.y);
					MapArt.island(c, s, theme, -s.seed / 0.6, false);
				}, true);
			const shadow = new PIXI.Sprite(roundTexture);
			shadow.anchor.set(0.5);
			shadow.position.set(s.x + 30, s.y + 30);
			shadow.width = r * 1.8;
			shadow.height = r * 0.76;
			shadow.tint = 0x000000;
			shadow.alpha = 0x30 / 255;
			const sp = new PIXI.Sprite(entry.texture);
			sp.anchor.set(entry.anchor.x, entry.anchor.y);
			sp.scale.set(entry.scale);
			islandsLayer.addChild(shadow, sp);
			return { s, sp, shadow, scale: entry.scale };
		});
	}

	const upright = new PIXI.Matrix();
	function update(view) {
		const { camera, scale, width, height } = view,
			seen = { x: camera.x, y: camera.y, w: width / scale, h: height / scale },
			inView = (p, m) => Math.abs(p.x - seen.x) < seen.w / 2 + m && Math.abs(p.y - seen.y) < seen.h / 2 + m,
			t = game.time;
		// Fish (PlanetArt.fauna): seven per plain lake, circling.
		const fishLook = look("fish", 16, 8, 9, 4, SHARP, (c) => PlanetArt.fish(c));
		for (const { w, wi, box, fish } of lakes) {
			box.visible = inView(w, Math.max(w.rx, w.ry));
			if (!box.visible) continue;
			fish.forEach((sp, i) => {
				const a = t * 0.13 + i * 0.9 + wi,
					x = w.x + Math.cos(a) * w.rx * 0.65,
					y = w.y + Math.sin(a * 1.3) * w.ry * 0.6;
				sp.visible = game.isVisible(x, y);
				if (!sp.visible) return;
				sp.texture = fishLook.texture;
				sp.anchor.set(fishLook.anchor.x, fishLook.anchor.y);
				sp.scale.set(fishLook.scale);
				sp.position.set(x, y);
				sp.rotation = Math.atan2(Math.cos(a * 1.3) * w.ry * 1.3, -Math.sin(a) * w.rx);
			});
		}
		// Birds (PlanetArt.fauna): eighteen crossing the map.
		birds.begin();
		for (let i = 0; i < 18; i++) {
			const x = (i * 317 + t * (20 + (i % 3) * 4)) % game.W,
				y = 100 + ((i * 197) % (game.H - 200)) + Math.sin(t * 0.12 + i) * 35;
			if (!inView({ x, y }, 20) || !game.isVisible(x, y)) continue;
			const wing = 3 + Math.sin(t * 7 + i) * 4,
				step = Math.round(((wing + 1) / 8) * (WINGS - 1)),
				shape = (step / (WINGS - 1)) * 8 - 1;
			birds.take(look("bird|" + step, 18, 12, 9, 9, SHARP, (c) => PlanetArt.bird(c, 0, 0, shape))).position.set(x, y);
		}
		birds.end();
		// Land animals (AdvancedArt.fauna).
		animals.begin();
		for (const a of game.wildlife()) {
			if (a.kind === "bird" || a.kind === "fish" || !inView(a, 30) || !game.isVisible(a.x, a.y)) continue;
			const phase = Math.round((mod(t * 3 + a.id, TAU) / TAU) * PHASES) % PHASES,
				sp = animals.take(look("animal|" + a.kind + "|" + phase, 46, 22, 24, 11, SHARP, (c) => AdvancedArt.animal(c, { ...a, id: 0 }, (phase / PHASES) * TAU / 3, false)));
			sp.position.set(a.x, a.y);
			sp.rotation = Math.sin(t * 0.08 + a.id) * 0.3;
		}
		animals.end();
		// Floating islands, bobbing (MapArt.sky).
		for (const { s, sp, shadow, scale } of islands) {
			sp.visible = shadow.visible = inView(s, 300);
			if (!sp.visible) continue;
			const y = s.y + Math.sin(t * 0.6 + s.seed) * 6,
				// With the 2.5D tilt they stand upright over the tilted ground (see webgl/models-native.js).
				L = view.upright?.(s.x, s.y);
			if (L) sp.setFromMatrix(upright.set(L.a * scale, L.b * scale, L.c * scale, L.d * scale, s.x, y));
			else sp.setFromMatrix(upright.set(scale, 0, 0, scale, s.x, y));
		}
	}

	return {
		container: root,
		setGame(next) {
			game = next;
			buildLakes();
			buildIslands();
		},
		update,
		stats: () => ({ looks: looks.size, birds: birds.used, animals: animals.used, fish: lakes.reduce((n, l) => n + (l.box.visible ? l.fish.filter((f) => f.visible).length : 0), 0), islands: islands.filter((i) => i.sp.visible).length }),
	};
}
