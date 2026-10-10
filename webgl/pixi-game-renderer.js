/* WebGL/WebGPU renderer for the game (PixiJS 8), with the same interface as createCanvasRenderer.
   The whole board is native PixiJS; the Canvas art is still the single source of every look:
   - terrain texture (with mipmaps), terrain height with relief light and cast shadows
     (webgl/terrain-height.js), water shimmer, scorched ground;
   - ground: deposits, relays, puddles, lakes, tracks, paths (webgl/ground-native.js);
   - models of units and buildings, their sun shadows, volume light and damage scars, selection,
     bars, combat effects, habitats and walls (webgl/models-native.js, webgl/model-light.js);
   - wildlife and floating islands (webgl/fauna-native.js);
   - map glow, map effects and the interface on the board, recorded from the Canvas drawing and
     replayed as Pixi objects (webgl/canvas-replay.js);
   - light map with real night and point lights, bloom, GPU rain and snow, lightning, soft fog;
   - optional slight 2.5D camera tilt (the flat frame is projected through a perspective mesh;
     pointer positions are mapped back with the inverse projection).
   Nothing is uploaded as a whole Canvas layer any more. The Canvas layers (world, under, over, post,
   overlay) remain as fallbacks: a phase whose drawing cannot be replayed, or a switch in the
   comparison API (setNativeGround / setNativeModels / setNativeEffects / setNativeOverlay). */
async function createPixiGameRenderer(options) {
	"use strict";
	const { gameCanvas, canvasRenderer, onContextLost, preference = "webgl" } = options;
	if (typeof PIXI === "undefined") throw Error("Brak biblioteki PixiJS");
	const { TYPES, MISSIONS } = RTS;
	const app = new PIXI.Application();
	await app.init({
		width: Math.max(1, gameCanvas.clientWidth),
		height: Math.max(1, gameCanvas.clientHeight),
		background: "#111e24",
		antialias: true,
		preference,
		autoDensity: true,
		resolution: Math.min(window.devicePixelRatio || 1, 2),
		autoStart: false,
		sharedTicker: false,
	});
	const view = app.canvas;
	view.className = "webgl-board";
	Object.assign(view.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
	gameCanvas.after(view);
	// PixiJS falls back from WebGPU to WebGL by itself when WebGPU cannot start.
	const backend = app.renderer.name === "webgpu" ? "webgpu" : "webgl";
	let lost = false,
		destroyed = false;
	view.addEventListener("webglcontextlost", (event) => {
		event.preventDefault();
		// destroy() releases the context on purpose; that is not a loss to report.
		if (destroyed) return;
		lost = true;
		onContextLost?.();
	});
	app.renderer.gpu?.device?.lost?.then((info) => {
		if (destroyed || info?.reason === "destroyed") return;
		lost = true;
		onContextLost?.();
	});

	const canvasTexture = (width, height, draw) => {
		const c = document.createElement("canvas");
		c.width = width;
		c.height = height;
		draw(c.getContext("2d"));
		return PIXI.Texture.from(c);
	};
	const radial = canvasTexture(256, 256, (c) => {
		const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
		g.addColorStop(0, "rgba(255,255,255,1)");
		g.addColorStop(0.35, "rgba(255,255,255,.55)");
		g.addColorStop(1, "rgba(255,255,255,0)");
		c.fillStyle = g;
		c.fillRect(0, 0, 256, 256);
	});
	const noise = (() => {
		let seed = 7;
		const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
		return canvasTexture(256, 256, (c) => {
			for (let i = 0; i < 60; i++) {
				const x = rand() * 256,
					y = rand() * 256,
					r = 10 + rand() * 30;
				for (const dx of [-256, 0, 256])
					for (const dy of [-256, 0, 256]) {
						const g = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
						g.addColorStop(0, "rgba(255,255,255,.55)");
						g.addColorStop(1, "rgba(255,255,255,0)");
						c.fillStyle = g;
						c.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r);
					}
			}
		});
	})();

	// Screen-space layer painted by the Canvas renderer's phases. Every layer is uploaded to the GPU each
	// frame, which is the main cost of this renderer, so there are few of them.
	function layer(phases, resolution = 1) {
		const canvas = document.createElement("canvas"),
			ctx = canvas.getContext("2d"),
			texture = PIXI.Texture.from(canvas),
			sprite = new PIXI.Sprite(texture);
		return { phases, resolution, canvas, ctx, texture, sprite };
	}
	const layers = {
		// Native models (webgl/models-native.js) and wildlife (webgl/fauna-native.js): only what is still
		// Canvas art lies under and over them — animated map effects and sky layers of map plugins.
		under: layer(["mapEffects"]),
		over: layer(["skyPlugins"]),
		// Fallbacks and comparisons: models (and ground) painted through Canvas in one layer, as before.
		world: layer(["groundTop", "units", "sky"]),
		// Emissive map effects, above the light map. Full resolution: its tiny glowing specks would
		// shimmer while the camera moves if they were drawn at half resolution.
		post: layer(["glow"]),
		overlay: layer(["overlay", "screen"]),
	};
	// World-space containers share the camera transform.
	const back = new PIXI.Container(),
		lightWorld = new PIXI.Container(),
		glow = new PIXI.Container(),
		// Lamp beams seen in the air (added over the lit scene, sharp, like the Canvas "screen" beams).
		beamsWorld = new PIXI.Container(),
		fogWorld = new PIXI.Container();
	const terrainSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
	const water = new PIXI.Container(),
		waterMask = new PIXI.Graphics(),
		waterLayers = [0, 1].map((i) => {
			const t = new PIXI.TilingSprite({ texture: noise, width: 16, height: 16 });
			t.tileScale.set(i ? 1.7 : 1.1);
			t.tint = 0x9ff6ff;
			t.blendMode = "add";
			water.addChild(t);
			return t;
		});
	water.mask = waterMask;
	const scorchLayer = new PIXI.Container();
	// Terrain relief: the two baked sun directions nearest to the current one, cross-faded.
	const terrainHeight = createTerrainHeight(),
		relief = [0, 1].map(() => {
			const sp = new PIXI.Sprite(PIXI.Texture.EMPTY);
			sp.visible = false;
			return sp;
		});
	back.addChild(terrainSprite, ...relief, water, waterMask, scorchLayer);
	// Weather particles in map coordinates, above the models and under the fog.
	const weatherWorld = new PIXI.Container();
	glow.blendMode = "add";
	glow.filters = [new PIXI.BlurFilter({ strength: 14, quality: 3 })];
	const fogTexture = PIXI.Texture.from(canvasRenderer.fogCanvas),
		fogSprite = new PIXI.Sprite(fogTexture);
	// Blur sized to the fog cells (40 map units) on screen, so their edges read as soft shapes, not steps.
	const fogBlur = new PIXI.BlurFilter({ strength: 2, quality: 2 });
	fogSprite.filters = [fogBlur];
	fogWorld.addChild(fogSprite);
	const lightRoot = new PIXI.Container();
	lightRoot.addChild(lightWorld);
	let lightTexture = PIXI.RenderTexture.create({ width: 16, height: 16 });
	const lightSprite = new PIXI.Sprite(lightTexture);
	lightSprite.blendMode = "multiply";

	// Everything except the interface overlays is colour graded.
	const scene = new PIXI.Container(),
		grading = new PIXI.ColorMatrixFilter();
	// Opaque board colour under the map: the multiplied light map needs something to darken off the map's edge.
	const backdrop = new PIXI.Sprite(PIXI.Texture.WHITE);
	backdrop.tint = 0x111e24;
	// Deposits, relays, puddles, lakes, tracks and paths as native objects between the terrain and the models.
	const ground = createNativeGround({ canvasRenderer, depositOverlays: (key, box, draw) => depositOverlays(key, box, draw) });
	scene.addChild(backdrop, back, ground.container, layers.under.sprite, layers.world.sprite, layers.over.sprite, lightSprite, glow, beamsWorld, layers.post.sprite, weatherWorld);
	scene.filters = [grading];
	// The flat frame; with the 2.5D tilt it is rendered into a texture and shown through a perspective mesh.
	const flatRoot = new PIXI.Container();
	// The interface on the board (markers, rally flags, placement preview, selection box, vignette, sun,
	// moon, weather in the sky) replayed natively above the fog; its Canvas layer stays as the fallback.
	const overlayReplay = createCanvasReplay();
	// Sandstorm grains: a pool of particles moved every frame (thousands of them; recording them was the costliest part of a storm).
	const grainLayer = new PIXI.ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true } }),
		grainParticles = [];
	let grainTexture = null,
		grainCount = 0;
	function drawGrains(game, width, height, show) {
		let n = 0;
		if (show && typeof PlanetArt !== "undefined" && PlanetArt.sandGrains) {
			grainTexture ||= PIXI.Texture.from(PlanetArt.sandGrainCanvas());
			PlanetArt.sandGrains(game, width, height, (x, y, size, alpha) => {
				let p = grainParticles[n];
				if (!p) {
					p = grainParticles[n] = new PIXI.Particle({ texture: grainTexture, anchorX: 0.5, anchorY: 0.5 });
					grainLayer.addParticle(p);
				}
				p.x = x;
				p.y = y;
				p.scaleX = p.scaleY = size / 16;
				p.alpha = alpha;
				n++;
			});
		}
		// Unused particles stay in the pool, invisible.
		for (let i = n; i < grainParticles.length; i++) grainParticles[i].alpha = 0;
		grainLayer.visible = n > 0;
		return n;
	}
	flatRoot.addChild(scene, fogWorld, overlayReplay.container, grainLayer, layers.overlay.sprite);
	// With the 2.5D tilt: the screen-space interface, drawn over the perspective mesh.
	const screenReplay = createCanvasReplay(),
		screenRoot = new PIXI.Container();
	screenRoot.addChild(screenReplay.container);
	app.stage.addChild(flatRoot, screenRoot);
	const tiltMesh = new PIXI.PerspectiveMesh({ texture: PIXI.Texture.WHITE, verticesX: 24, verticesY: 24 });
	let flatTexture = null,
		projection = { margin: 0, inverse: null, toScreen: null };

	const lightPool = [],
		glowPool = [],
		beamPool = [],
		hazePool = [],
		lampPool = [],
		silhouettes = new Map();
	let game = null,
		hasWater = false,
		hasGlow = true,
		hasEffects = false,
		hasSkyPlugins = false,
		nativeGround = true,
		nativeModels = true,
		nativeEffects = true,
		nativeOverlay = true,
		terrainSource = null,
		size = { width: 0, height: 0, dpr: 0, flat: 0 };

	function light(pool, container, x, y, radius, color, alpha) {
		let s = pool[pool.used];
		if (!s) {
			s = new PIXI.Sprite(radial);
			s.anchor.set(0.5);
			s.blendMode = "add";
			pool.push(s);
			container.addChild(s);
		}
		pool.used++;
		s.visible = true;
		s.position.set(x, y);
		s.scale.set(radius / 128);
		s.tint = color;
		s.alpha = Math.max(0, Math.min(1, alpha));
	}
	// Flashlight / headlight: a narrow wedge (±0.3 rad, as the Canvas lamps) from the lamp outwards,
	// bright near the lamp and fading with distance, with soft sides. Apex at the left middle.
	const coneTexture = (() => {
		const w = 256,
			h = 176,
			wedge = document.createElement("canvas");
		wedge.width = w;
		wedge.height = h;
		const x = wedge.getContext("2d"),
			g = x.createRadialGradient(0, h / 2, 0, 0, h / 2, w);
		g.addColorStop(0, "rgba(255,255,255,1)");
		g.addColorStop(0.35, "rgba(255,255,255,.6)");
		g.addColorStop(1, "rgba(255,255,255,0)");
		x.fillStyle = g;
		x.beginPath();
		x.moveTo(0, h / 2);
		x.arc(0, h / 2, w, -0.3, 0.3);
		x.closePath();
		x.fill();
		const soft = document.createElement("canvas");
		soft.width = w;
		soft.height = h;
		const y = soft.getContext("2d");
		y.filter = "blur(5px)";
		y.drawImage(wedge, 0, 0);
		return PIXI.Texture.from(soft);
	})();
	function cone(pool, container, x, y, angle, length, color, alpha) {
		let s = pool[pool.used];
		if (!s) {
			s = new PIXI.Sprite(coneTexture);
			s.anchor.set(0, 0.5);
			s.blendMode = "add";
			pool.push(s);
			container.addChild(s);
		}
		pool.used++;
		s.visible = true;
		s.position.set(x, y);
		s.rotation = angle;
		s.scale.set(length / 256);
		s.tint = color;
		s.alpha = Math.max(0, Math.min(1, alpha));
	}
	// Scorched ground where something exploded; kept for a while in battle time, not saved.
	const scorchTexture = canvasTexture(128, 128, (c) => {
		let seed = 11;
		const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
		const g = c.createRadialGradient(64, 64, 4, 64, 64, 60);
		g.addColorStop(0, "rgba(8,6,5,.85)");
		g.addColorStop(0.45, "rgba(18,14,11,.6)");
		g.addColorStop(1, "rgba(22,18,14,0)");
		c.fillStyle = g;
		c.fillRect(0, 0, 128, 128);
		c.fillStyle = "rgba(10,8,7,.55)";
		for (let i = 0; i < 14; i++) {
			const a = rand() * Math.PI * 2,
				l = 30 + rand() * 30;
			c.beginPath();
			c.moveTo(64 + Math.cos(a - 0.12) * 16, 64 + Math.sin(a - 0.12) * 16);
			c.lineTo(64 + Math.cos(a) * l, 64 + Math.sin(a) * l);
			c.lineTo(64 + Math.cos(a + 0.12) * 16, 64 + Math.sin(a + 0.12) * 16);
			c.fill();
		}
	});
	const scorches = [],
		seenBlasts = new WeakSet();
	function updateScorch() {
		const opts = SceneFX.options;
		for (const ef of game.effects) {
			if (ef.kind !== "explosion" || seenBlasts.has(ef)) continue;
			seenBlasts.add(ef);
			if (!opts.scars || !game.isVisible(ef.x, ef.y) || game.blocked?.(ef.x, ef.y, 0)) continue;
			const sp = new PIXI.Sprite(scorchTexture);
			sp.anchor.set(0.5);
			sp.position.set(ef.x, ef.y);
			sp.rotation = (ef.x * 0.37 + ef.y * 0.11) % (Math.PI * 2);
			sp.scale.set(((ef.size || 40) * 1.1) / 128);
			scorchLayer.addChild(sp);
			scorches.push({ sprite: sp, born: game.time });
			if (scorches.length > 90) scorches.shift().sprite.destroy();
		}
		for (let i = scorches.length - 1; i >= 0; i--) {
			const age = game.time - scorches[i].born;
			if (age > 150 || age < 0 || !opts.scars) {
				scorches[i].sprite.destroy();
				scorches.splice(i, 1);
			} else scorches[i].sprite.alpha = 0.8 * Math.min(1, age * 4) * Math.min(1, (150 - age) / 40);
		}
	}
	function clearScorch() {
		for (const s of scorches) s.sprite.destroy();
		scorches.length = 0;
	}

	// Rain and snow as GPU sprites: denser than the Canvas version and with splashes.
	const rainTexture = canvasTexture(4, 64, (c) => {
		const g = c.createLinearGradient(0, 0, 0, 64);
		g.addColorStop(0, "rgba(190,215,230,0)");
		g.addColorStop(1, "rgba(215,235,245,.95)");
		c.fillStyle = g;
		c.fillRect(1, 0, 2, 64);
	});
	const splashTexture = canvasTexture(48, 24, (c) => {
		c.strokeStyle = "rgba(205,232,242,.95)";
		c.lineWidth = 2;
		c.beginPath();
		c.ellipse(24, 12, 21, 9, 0, 0, Math.PI * 2);
		c.stroke();
	});
	const flakeTexture = canvasTexture(16, 16, (c) => {
		const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
		g.addColorStop(0, "rgba(255,255,255,1)");
		g.addColorStop(0.5, "rgba(245,252,255,.7)");
		g.addColorStop(1, "rgba(245,252,255,0)");
		c.fillStyle = g;
		c.fillRect(0, 0, 16, 16);
	});
	const particlePools = new Map();
	function particle(texture) {
		let pool = particlePools.get(texture);
		if (!pool) particlePools.set(texture, (pool = { list: [], used: 0 }));
		let sp = pool.list[pool.used];
		if (!sp) {
			sp = new PIXI.Sprite(texture);
			sp.anchor.set(0.5, 1);
			pool.list.push(sp);
			weatherWorld.addChild(sp);
		}
		pool.used++;
		sp.visible = true;
		return sp;
	}
	// A particle dx, dy above its ground point x, y, turned and scaled; with the 2.5D tilt (L from
	// view.upright) it stays upright on the screen, so rain and snow keep falling straight down.
	const placed = new PIXI.Matrix();
	function place(sp, L, x, y, dx, dy, rotation, sx, sy) {
		if (!L) {
			sp.position.set(x + dx, y + dy);
			sp.rotation = rotation;
			sp.skew.set(0, 0);
			sp.scale.set(sx, sy);
			return;
		}
		const cos = Math.cos(rotation),
			sin = Math.sin(rotation),
			a = cos * sx,
			b = sin * sx,
			c = -sin * sy,
			d = cos * sy;
		sp.setFromMatrix(placed.set(L.a * a + L.c * b, L.b * a + L.d * b, L.a * c + L.c * d, L.b * c + L.d * d, x + L.a * dx + L.c * dy, y + L.b * dx + L.d * dy));
	}
	function updateWeather(seen, weather, time, upright) {
		for (const pool of particlePools.values()) pool.used = 0;
		const biome = MISSIONS[game.missionId].biome;
		if (biome === "ash" || biome === "ice") {
			const rain = biome === "ash",
				storm = weather.intensity,
				mod = (n, m) => ((n % m) + m) % m,
				area = (seen.w + 240) * (seen.h + 240);
			let cell = ((rain ? 52 : 46) / (1 + storm * (rain ? 0.9 : 1.8))) * Math.sqrt(SceneFX.stride("particles"));
			cell = Math.max(cell, Math.sqrt(area / 6000));
			const slant = 0.22 + storm * 0.65,
				tilt = Math.atan(slant);
			for (let ix = Math.floor((seen.x - seen.w / 2 - 120) / cell); ix <= (seen.x + seen.w / 2 + 120) / cell; ix++)
				for (let iy = Math.floor((seen.y - seen.h / 2 - 120) / cell); iy <= (seen.y + seen.h / 2 + 120) / cell; iy++) {
					const seed = mod(ix * 127.1 + iy * 311.7, 997),
						x = ix * cell + mod(seed * 17.3, cell),
						y = iy * cell + mod(seed * 9.7, cell);
					if (x < 0 || y < 0 || x > game.W || y > game.H) continue;
					if (rain) {
						const phase = mod(time * 1.7 + seed, 1);
						if (phase < 0.8) {
							const h = (1 - phase / 0.8) * 120,
								sp = particle(rainTexture);
							place(sp, upright?.(x, y), x, y, h * slant, -h, tilt, 0.5, (22 + storm * 20 + (seed % 7)) / 64);
							sp.alpha = 0.2 + storm * 0.25;
						} else {
							const age = (phase - 0.8) / 0.2,
								sp = particle(splashTexture);
							// The splash lies on the ground and tilts with it.
							place(sp, null, x, y, 0, 6 + age * 4, 0, 0.12 + age * 0.4, 0.12 + age * 0.4);
							sp.alpha = (1 - age) * (0.3 + storm * 0.3);
						}
					} else {
						const phase = mod(time * 0.42 + seed, 1),
							h = (1 - phase) * 90,
							sp = particle(flakeTexture),
							size = 2.4 + (seed % 3) * 1.1 + storm * 1.5;
						place(sp, upright?.(x, y), x, y, Math.sin(time * (0.9 + storm) + seed) * (12 + storm * 35) + h * storm, -h, 0, size / 16, size / 16);
						sp.alpha = (phase < 0.85 ? 0.9 : ((1 - phase) / 0.15) * 0.9) * (0.55 + (seed % 5) * 0.1);
					}
				}
		}
		for (const pool of particlePools.values()) for (let i = pool.used; i < pool.list.length; i++) pool.list[i].visible = false;
	}

	// Unit and building silhouettes for shadows, painted by the same code as the board.
	const models = createModelLight();
	function silhouette(e, frame, moving) {
		const body = models.paint(e, game, frame, moving);
		if (silhouettes.has(body.key)) return silhouettes.get(body.key);
		const canvas = document.createElement("canvas");
		canvas.width = body.canvas.width;
		canvas.height = body.canvas.height;
		const c = canvas.getContext("2d");
		c.drawImage(body.canvas, 0, 0);
		c.globalCompositeOperation = "source-in";
		c.fillStyle = "#000";
		c.fillRect(0, 0, canvas.width, canvas.height);
		const entry = { canvas, ox: body.ox, oy: body.oy };
		silhouettes.set(body.key, entry);
		return entry;
	}
	const shadowFrame = { alpha: 0, sunX: 0, stretch: 1, inView: () => false, count: 0 };
	// Units and buildings as native objects, between the Canvas layers under and over them.
	const natives = createNativeModels({ canvasRenderer, silhouette, overlays: (e) => bodyOverlays(e), unitOverlays, lightFrame: () => models.frameLooks(), shadowFrame });
	scene.addChildAt(natives.container, scene.getChildIndex(layers.world.sprite));
	// Map effects (under the models) and map glow (over the light map), replayed natively from the
	// Canvas art (webgl/canvas-replay.js); their Canvas layers stay as the fallback.
	const effectsReplay = createCanvasReplay(),
		glowReplay = createCanvasReplay({ group: true });
	scene.addChildAt(effectsReplay.container, scene.getChildIndex(layers.under.sprite));
	scene.addChildAt(glowReplay.container, scene.getChildIndex(layers.post.sprite));
	// Wildlife and floating islands, above the models (webgl/fauna-native.js).
	const fauna = createNativeFauna();
	scene.addChildAt(fauna.container, scene.getChildIndex(layers.world.sprite));
	// Called by the Canvas units phase before the models (map coordinates): flattened, sun-offset silhouettes.
	function drawShadows(c) {
		const { alpha, sunX, stretch, inView } = shadowFrame,
			time = game.time;
		shadowFrame.count = 0;
		for (const e of game.entities) {
			const s = TYPES[e.type];
			if (e.hp <= 0 || e.type === "wall" || e.type === "gate" || (e.team !== (game.viewer ?? 0) && !game.isVisible(e.x, e.y)) || !inView(e, 300)) continue;
			const moving = e.path.length > 0,
				sil = silhouette(e, moving ? Math.floor(time * 8) % 4 : 0, moving),
				lift = s.flying ? 26 : 0,
				h = s.speed ? s.radius * 0.6 + lift : s.radius * 1.3;
			c.save();
			if (s.speed) {
				// Units drop a flattened copy beside them.
				c.translate(e.x + sunX * h * stretch * 0.35, e.y + h * 0.25 + lift * 0.6);
				c.scale(1, 0.7);
				c.rotate(e.angle);
			} else {
				// Buildings lean it from their base so it stays attached.
				c.translate(e.x + sunX * s.radius * 0.35, e.y + s.radius * 0.28);
				const k = -sunX * 0.45;
				c.transform(1, 0, Math.sin(k) * 0.62, Math.cos(k) * 0.62, 0, 0);
			}
			c.globalAlpha = alpha * (s.flying ? 0.6 : 1) * (e.constructionLeft ? 0.5 : 1);
			c.drawImage(sil.canvas, -sil.ox, -sil.oy);
			c.restore();
			shadowFrame.count++;
		}
	}
	// Direction towards the sun (east in the morning, west in the evening, low at dusk) and towards the moon.
	function sunLight(q) {
		const low = Math.abs(q);
		return {
			key: "sun" + q,
			x: -q * 0.9,
			y: -0.5,
			z: 0.42 + 0.5 * (1 - low),
			color: [255, Math.round(246 - 50 * low), Math.round(225 - 95 * low)],
			shade: [10, 18, 30],
			gain: 2.3,
		};
	}
	const moonLight = { key: "moon", x: 0.55, y: -0.5, z: 0.65, color: [170, 200, 255], shade: [4, 10, 26], gain: 1.7 };
	// Called by the Canvas phases right after a model is drawn (in the model's own coordinates).
	const sky = { sun: 0, night: 0, storm: 0 };
	// The lights of the moment with their weights: the two nearest baked sun directions (so the light turns
	// smoothly during the day), weakened by storms, and the moon at night.
	function lightMix() {
		const out = [],
			steps = 4,
			f = (sky.sun + 1) * steps,
			lo = Math.floor(f),
			t = f - lo,
			strength = (1 - sky.night) * (1 - sky.storm * 0.55);
		for (const [q, w] of [
			[lo, 1 - t],
			[lo + 1, t],
		]) {
			if (w * strength < 0.02 || q > steps * 2) continue;
			out.push({ light: sunLight(q / steps - 1), alpha: w * strength });
		}
		if (sky.night > 0.05) out.push({ light: moonLight, alpha: sky.night * 0.75 });
		return out;
	}
	// Volume light and damage scars over a building: [{ canvas, ox, oy, alpha }], empty for units.
	function bodyOverlays(e) {
		const s = TYPES[e.type],
			opts = SceneFX.options,
			out = [];
		if (s.speed || e.constructionLeft || e.type === "wall" || e.type === "gate") return out;
		if (opts.volume)
			for (const { light, alpha } of lightMix()) {
				const v = models.volume(e, game, light);
				if (v) out.push({ ...v, alpha });
			}
		const hurt = e.hp / e.maxHp;
		if (opts.scars && hurt < 0.72) out.push({ ...models.scars(e, game), alpha: Math.min(1, (0.72 - hurt) / 0.45) });
		return out;
	}
	// Volume light over a unit, made from the look shown (look: key, box, draw, angle of the drawn direction);
	// vehicles also get soot when damaged. Null while its normal map waits for the frame budget.
	function unitOverlays(e, look) {
		const s = TYPES[e.type],
			opts = SceneFX.options;
		if (!opts.volume && !opts.scars) return [];
		const small = RTS.INFANTRY_TYPES.includes(e.type) || s.radius < 13,
			entry = models.unitLook(look.key, look.box, look.draw, small ? "infantry" : "vehicle");
		if (!entry) return null;
		const out = [];
		if (opts.volume)
			for (const { light, alpha } of lightMix()) {
				const v = models.unitVolume(entry, light);
				if (v) out.push({ ...v, alpha });
			}
		const hurt = e.hp / e.maxHp;
		if (opts.scars && !small && hurt < 0.72) {
			const v = models.unitScars(entry, e.type, s.radius, look.angle);
			if (v) out.push({ ...v, alpha: Math.min(1, (0.72 - hurt) / 0.45) });
		}
		return out;
	}
	// Volume light over a deposit (key: kind and stage), made from its art like a unit's.
	function depositOverlays(key, box, draw) {
		if (!SceneFX.options.volume) return [];
		const entry = models.unitLook("deposit|" + key, box, draw, "deposit");
		if (!entry) return [];
		const out = [];
		for (const { light, alpha } of lightMix()) {
			const v = models.unitVolume(entry, light);
			if (v) out.push({ ...v, alpha });
		}
		return out;
	}
	function shadeBody(c, e) {
		const list = bodyOverlays(e);
		if (!list.length) return;
		c.save();
		for (const v of list) {
			c.globalAlpha = v.alpha;
			c.drawImage(v.canvas, -v.ox, -v.oy);
		}
		c.restore();
	}
	function rebuildWater() {
		waterMask.clear();
		const list = (game.waters || []).filter((w) => !w.kind || w.kind === "glow");
		for (const w of list) {
			const pts = [];
			for (let i = 0; i < 48; i++) {
				const a = (i * Math.PI * 2) / 48,
					r = RTS.waterRadius(w, a);
				pts.push(w.x + Math.cos(a) * w.rx * r * 0.9, w.y + Math.sin(a) * w.ry * r * 0.9);
			}
			waterMask.poly(pts).fill({ color: 0xffffff });
		}
		hasWater = list.length > 0;
		for (const t of waterLayers) {
			t.width = game.W;
			t.height = game.H;
		}
	}
	// Most maps have no emissive effects (glow) or animated map effects; then their layer is neither
	// painted nor uploaded. Probed once per map: the whole map in miniature, at night.
	function probePhase(phase) {
		const probe = document.createElement("canvas");
		probe.width = 256;
		probe.height = Math.max(1, Math.ceil((256 * game.H) / game.W));
		const own = Object.getOwnPropertyDescriptor(game, "night");
		Object.defineProperty(game, "night", { value: 1, configurable: true });
		try {
			canvasRenderer.drawLayer(
				probe.getContext("2d"),
				{ game, width: probe.width, height: probe.height, dpr: 1, scale: 256 / game.W, camera: { x: game.W / 2, y: game.H / 2 }, selected: new Set(), colors: [], mouse: { x: 0, y: 0 }, drag: null, building: false, wallDrag: null },
				[phase],
			);
		} finally {
			delete game.night;
			if (own) Object.defineProperty(game, "night", own);
		}
		const data = probe.getContext("2d").getImageData(0, 0, probe.width, probe.height).data;
		for (let i = 3; i < data.length; i += 4) if (data[i]) return true;
		return false;
	}
	function refreshTerrain() {
		const source = canvasRenderer.terrainCanvas;
		if (source === terrainSource) return;
		terrainSource = source;
		const old = terrainSprite.texture;
		// The whole map is one large texture shown strongly reduced; mipmaps keep small details (grass,
		// stones, plants) from shimmering while the camera moves.
		terrainSprite.texture = new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: source, autoGenerateMipmaps: true, scaleMode: "linear", mipmapFilter: "linear" }) });
		if (old !== PIXI.Texture.EMPTY) old.destroy(true);
	}
	// width/height: the screen; flat/flatHeight: the flat frame (larger than the screen with the tilt).
	function resize(width, height, dpr, flat, flatHeight) {
		if (size.width === width && size.height === height && size.dpr === dpr && size.flat === flat && size.flatHeight === flatHeight) return;
		size = { width, height, dpr, flat, flatHeight };
		app.renderer.resize(width, height, dpr);
		for (const l of Object.values(layers)) {
			l.canvas.width = Math.max(1, Math.round(flat * dpr * l.resolution));
			l.canvas.height = Math.max(1, Math.round(flatHeight * dpr * l.resolution));
			l.texture.source.resize(l.canvas.width, l.canvas.height, 1);
			l.sprite.width = flat;
			l.sprite.height = flatHeight;
		}
		backdrop.width = flat;
		backdrop.height = flatHeight;
		const old = lightTexture;
		lightTexture = PIXI.RenderTexture.create({ width: flat, height: flatHeight });
		lightSprite.texture = lightTexture;
		old.destroy(true);
		if (flatTexture) flatTexture.destroy(true);
		flatTexture = flat !== width || flatHeight !== height ? PIXI.RenderTexture.create({ width: flat, height: flatHeight, resolution: dpr }) : null;
	}
	// Projective map taking 4 points onto 4 points (3×3 matrix with the last element 1).
	function homography(src, dst) {
		const a = [],
			b = [];
		for (let i = 0; i < 4; i++) {
			const [x, y] = src[i],
				[u, v] = dst[i];
			a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
			b.push(u);
			a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
			b.push(v);
		}
		for (let c = 0; c < 8; c++) {
			let p = c;
			for (let r = c + 1; r < 8; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
			[a[c], a[p]] = [a[p], a[c]];
			[b[c], b[p]] = [b[p], b[c]];
			for (let r = 0; r < 8; r++) {
				if (r === c) continue;
				const f = a[r][c] / a[c][c];
				for (let k = c; k < 8; k++) a[r][k] -= f * a[c][k];
				b[r] -= f * b[c];
			}
		}
		return [...b.map((value, i) => value / a[i][i]), 1];
	}
	const applyH = (m, x, y) => {
		const w = m[6] * x + m[7] * y + m[8];
		return { x: (m[0] * x + m[1] * y + m[2]) / w, y: (m[3] * x + m[4] * y + m[5]) / w };
	};
	// Share of the screen width added on each side of the flat frame; the top edge of the screen shows all of it.
	const TILT = 0.14;
	// The top of the screen shows the whole flat width, the bottom only its middle: the far edge recedes.
	// The flat frame is also taller than the screen: the art is drawn from a fixed oblique angle, and with
	// flatHeight = H·(1 + F/W)/2 the ground keeps that angle's proportions (1:1) in the middle row of the
	// screen, a little flatter above it (×0.88 at the top) and a little steeper below (×1.12 at the bottom).
	// With the flat frame as tall as the screen the top was 1:1 and the bottom stretched ×1.27.
	function tiltProjection(W, H, margin) {
		const F = W + 2 * margin,
			flatHeight = Math.round((H * (1 + F / W)) / 2),
			flat = [
				[0, 0],
				[F, 0],
				[F, flatHeight],
				[0, flatHeight],
			],
			corners = [
				[0, 0],
				[W, 0],
				[W + margin, H],
				[-margin, H],
			];
		// top: how far the flat frame reaches above the screen's own frame (the game keeps the screen's middle).
		return { margin, top: (flatHeight - H) / 2, flatWidth: F, flatHeight, corners, inverse: homography(corners, flat), toScreen: homography(flat, corners) };
	}
	const FLAT_PROJECTION = { margin: 0, top: 0, corners: null, inverse: null, toScreen: null };
	// The mesh bends everything drawn on the flat frame like the ground: things standing on it would be
	// stretched near the bottom and lean inwards at the sides. For a point of the flat frame this returns
	// the local transform (k·J⁻¹, J the Jacobian of the projection) that cancels the bend, so after the
	// mesh a standing thing keeps upright edges and its own proportions and only shrinks with distance.
	function upright(m, x, y) {
		const w = m[6] * x + m[7] * y + m[8],
			u = (m[0] * x + m[1] * y + m[2]) / w,
			v = (m[3] * x + m[4] * y + m[5]) / w,
			a = (m[0] - u * m[6]) / w,
			b = (m[1] - u * m[7]) / w,
			c = (m[3] - v * m[6]) / w,
			d = (m[4] - v * m[7]) / w,
			k = a / (a * d - b * c);
		// Pixi's Matrix: x' = a·x + c·y, y' = b·x + d·y.
		return { a: d * k, b: -c * k, c: -b * k, d: a * k };
	}
	function terrainLight(q) {
		const low = Math.abs(q);
		return { key: "t" + q, x: -q * 0.9, y: -0.5, z: 0.42 + 0.5 * (1 - low), color: [255, Math.round(240 - 45 * low), Math.round(215 - 90 * low)], shade: [8, 14, 26], gain: 1.6 };
	}
	const terrainMoon = { key: "tmoon", x: 0.55, y: -0.5, z: 0.6, color: [150, 180, 235], shade: [4, 8, 22], gain: 1.3 };
	const reliefTextures = new Map();
	function reliefTexture(canvas) {
		if (!reliefTextures.has(canvas)) reliefTextures.set(canvas, PIXI.Texture.from(canvas));
		return reliefTextures.get(canvas);
	}
	function updateRelief(sunX, night, storm) {
		relief.forEach((sp) => (sp.visible = false));
		if (!SceneFX.options.relief) return;
		terrainHeight.step(2);
		const steps = 4,
			f = (sunX + 1) * steps,
			lo = Math.floor(f),
			t = f - lo,
			strength = (1 - night) * (1 - storm * 0.5),
			wanted = [
				[terrainLight(lo / steps - 1), (1 - t) * strength],
				[terrainLight(Math.min(lo + 1, steps * 2) / steps - 1), t * strength],
			];
		// Deep in the night one moonlit relief takes the place of the fading sun.
		if (night > 0.5) wanted[1] = [terrainMoon, (night - 0.5) * 0.9];
		wanted.forEach(([l, alpha], i) => {
			if (alpha < 0.02) return;
			const canvas = terrainHeight.overlay(l),
				sp = relief[i];
			if (!canvas) return;
			sp.texture = reliefTexture(canvas);
			sp.scale.set(terrainHeight.cell);
			sp.position.set(-terrainHeight.cell / 2, -terrainHeight.cell / 2);
			sp.alpha = Math.min(1, alpha);
			sp.visible = true;
		});
	}
	function ambient(night) {
		const mix = (a, b, t) => a + (b - a) * t,
			dusk = Math.max(0, 1 - Math.abs(night - 0.45) / 0.35);
		let r = mix(1, 0.27, night),
			g = mix(0.98, 0.32, night),
			b = mix(0.94, 0.5, night);
		return [mix(r, 1, dusk * 0.35), mix(g, 0.72, dusk * 0.35), mix(b, 0.55, dusk * 0.35), 1];
	}

	const failures = [];
	function fallBack(part, error, disable, screenView) {
		console.warn(`Renderer WebGL: część „${part}” wraca do rysowania przez Canvas.`, error);
		failures.push({ part, message: String(error?.message || error) });
		disable();
		if (failures.length < 8) render(screenView);
	}
	function render(screenView) {
		if (lost) return;
		const opts = SceneFX.options,
			margin = opts.tilt ? Math.round(screenView.width * TILT) : 0;
		projection = margin ? tiltProjection(screenView.width, screenView.height, margin) : FLAT_PROJECTION;
		// The flat frame: with the tilt it is wider and taller, and pointer positions shift with it.
		const shift = (p) => p && { ...p, x: p.x + projection.margin, y: p.y + projection.top },
			v = margin ? { ...screenView, width: projection.flatWidth, height: projection.flatHeight, mouse: shift(screenView.mouse), drag: shift(screenView.drag) } : { ...screenView },
			{ width, height, dpr, scale, camera } = v,
			night = game.night,
			day = 1 - night,
			time = game.time,
			seen = { x: camera.x, y: camera.y, w: width / scale, h: height / scale },
			inView = (p, m = 200) => Math.abs(p.x - seen.x) < seen.w / 2 + m && Math.abs(p.y - seen.y) < seen.h / 2 + m;
		resize(screenView.width, screenView.height, dpr, width, height);
		// Standing things (models, bars, captions, floating islands) are turned back upright on the tilted ground.
		v.upright = projection.toScreen ? (x, y) => upright(projection.toScreen, (x - camera.x) * scale + width / 2, (y - camera.y) * scale + height / 2) : null;
		refreshTerrain();
		for (const c of [back, ground.container, effectsReplay.container, natives.container, fauna.container, glowReplay.container, lightWorld, glow, beamsWorld, weatherWorld, fogWorld]) {
			c.scale.set(scale);
			c.position.set(width / 2 - camera.x * scale, height / 2 - camera.y * scale);
		}
		const phase = (time / 360) % 1,
			sunX = Math.sin(phase * Math.PI * 2),
			weather = game.weather;
		sky.sun = sunX;
		sky.night = night;
		sky.storm = weather.intensity;
		// Sun shadows: long at dawn and dusk, short at noon, none at night.
		shadowFrame.alpha = opts.shadows ? 0.28 * Math.max(0, day - 0.15) : 0;
		shadowFrame.sunX = sunX;
		shadowFrame.stretch = 1 + Math.min(2.4, Math.abs(sunX) * 2.6);
		shadowFrame.inView = inView;
		const layerView = { ...v, shadeBody: opts.volume || opts.scars ? shadeBody : null, underUnits: shadowFrame.alpha > 0.01 ? drawShadows : null, nativeGrains: !!nativeOverlay };
		// Which Canvas layers carry anything this frame; the others are neither painted nor uploaded.
		const modelsNative = nativeGround && nativeModels,
			mapView = { x: camera.x, y: camera.y, w: width / scale, h: height / scale },
			glowNative = hasGlow && nativeEffects && glowReplay.run((c) => MapArt.glow(c, game, mapView)),
			effectsNative = modelsNative && hasEffects && nativeEffects && effectsReplay.run((c) => MapArt.effects(c, game, mapView));
		// The interface is recorded in the layer's own pixels (dpr), exactly as the Canvas layer drew it.
		// With the tilt the screen phase (vignette, selection box, sun, moon, sky weather) is recorded apart and
		// drawn after the mesh, so it stays flat on the screen; only the markers on the board tilt with it.
		const tilted = !!projection.toScreen,
			W = screenView.width,
			toScreen = (p) => p && { ...p, ...applyH(projection.toScreen, p.x, p.y) },
			H = screenView.height,
			screenLayerView = tilted && { ...layerView, width: W, height: H, mouse: toScreen(v.mouse), drag: toScreen(v.drag) },
			overlayNative =
				nativeOverlay &&
				overlayReplay.run((c) => canvasRenderer.drawLayer(c, layerView, tilted ? ["overlay"] : layers.overlay.phases), { width: Math.max(1, Math.round(width * dpr)), height: Math.max(1, Math.round(height * dpr)) }) &&
				(!tilted || screenReplay.run((c) => canvasRenderer.drawLayer(c, screenLayerView, ["screen"]), { width: Math.max(1, Math.round(W * dpr)), height: Math.max(1, Math.round(H * dpr)) }));
		overlayReplay.container.scale.set(1 / dpr);
		screenReplay.container.scale.set(1 / dpr);
		if (!overlayNative) overlayReplay.container.visible = false;
		if (!overlayNative || !tilted) screenReplay.container.visible = false;
		// Sandstorm grains belong to the screen too.
		const grainParent = tilted && overlayNative ? screenRoot : flatRoot;
		if (grainLayer.parent !== grainParent)
			if (grainParent === flatRoot) flatRoot.addChildAt(grainLayer, flatRoot.getChildIndex(overlayReplay.container) + 1);
			else screenRoot.addChild(grainLayer);
		grainCount = grainParent === screenRoot ? drawGrains(game, W, H, overlayNative) : drawGrains(game, width, height, overlayNative);
		if (!glowNative) glowReplay.container.visible = false;
		if (!effectsNative) effectsReplay.container.visible = false;
		layers.post.active = hasGlow && !glowNative;
		layers.under.active = modelsNative && hasEffects && !effectsNative;
		layers.over.active = modelsNative && hasSkyPlugins;
		layers.world.active = !modelsNative;
		layers.overlay.active = !overlayNative;
		for (const l of Object.values(layers)) {
			l.sprite.visible = l.active;
			if (!l.active) continue;
			canvasRenderer.drawLayer(l.ctx, l.resolution === 1 ? layerView : { ...layerView, dpr: dpr * l.resolution }, l.phases);
			l.texture.source.update();
		}
		updateScorch();
		updateWeather(seen, weather, time, v.upright);
		updateRelief(sunX, night, weather.intensity);
		ground.container.visible = nativeGround;
		// A failure in a native part must not blank the board: that part goes back to Canvas and the frame
		// is drawn again (once) with its Canvas layer.
		try {
			if (nativeGround) ground.update(v);
		} catch (error) {
			return fallBack("ground", error, () => (nativeGround = false), screenView);
		}
		natives.container.visible = modelsNative;
		fauna.container.visible = modelsNative;
		if (modelsNative)
			try {
				natives.update(v);
				fauna.update(v);
			} catch (error) {
				return fallBack("models", error, () => (nativeModels = false), screenView);
			}

		water.visible = opts.water && hasWater;
		waterLayers.forEach((t, i) => {
			t.tilePosition.set(time * (i ? -9 : 14), time * (i ? 6 : -4));
			t.alpha = (i ? 0.12 : 0.17) + night * 0.18;
		});

		// Light map and bloom from the map's emitters and what units are doing.
		lightPool.used = 0;
		glowPool.used = 0;
		beamPool.used = 0;
		hazePool.used = 0;
		lampPool.used = 0;
		const glowAlpha = opts.bloom ? 0.1 + night * 0.7 : 0;
		if (opts.lights) {
			for (const o of game.obstacles) {
				if (!inView(o, 400)) continue;
				const cx = o.x + o.w / 2,
					cy = o.y + o.h / 2,
					p = 0.85 + 0.15 * Math.sin(time * 0.9 + o.x);
				if (o.kind === "grove") {
					light(lightPool, lightWorld, cx, cy - o.h * 0.2, 300, 0x5af0d2, (0.2 + night * 0.9) * p);
					if (glowAlpha) light(glowPool, glow, cx, cy - o.h * 0.2, 90, 0x6ff2e0, glowAlpha * 0.6 * p);
				} else if (o.kind === "eggs") {
					light(lightPool, lightWorld, cx, cy, 130, MISSIONS[game.missionId].theme === "frozenhive" ? 0x96c8ff : 0x78dc8c, night * 0.6 * p);
				} else if (o.kind === "processor") {
					light(lightPool, lightWorld, cx, cy, 220, 0xffc27a, 0.2 + night * 0.7);
				} else if (o.kind === "crystal") {
					light(lightPool, lightWorld, cx, cy - 30, 200, 0x8cdcff, (0.1 + night * 0.6) * p);
					if (glowAlpha) light(glowPool, glow, cx, cy - 30, 70, 0xbfefff, glowAlpha * 0.5 * p);
				}
			}
			// Gas fissures and crystals light the ground around them at night.
			if (night > 0.05) {
				const lit = (list, kind, color, radius, strength, dy) => {
					for (const o of list || []) {
						const n = kind === "crystal" ? BoardArt.crystalLook(o) : BoardArt.resourceLook(o, true);
						if (!n || !game.explored[game.visionIndex(o.x, o.y)] || !inView(o, 200)) continue;
						light(lightPool, lightWorld, o.x, o.y + dy, radius, color, night * strength * (0.4 + (n / 6) * 0.6));
					}
				};
				lit(game.gasFields, "gas", 0xc47be8, 140, 0.75, 4);
				lit(game.crystalFields, "crystal", 0xf2cf6a, 100, 0.4, -8);
			}
			for (const [i, w] of (game.waters || []).entries()) {
				if ((w.kind !== "glow" && w.kind !== "lava") || (i % 2 && w.rx < 140) || !inView(w, 300)) continue;
				const lava = w.kind === "lava";
				light(lightPool, lightWorld, w.x, w.y, Math.max(w.rx, w.ry) * 2.2, lava ? 0xff7a30 : 0x46e6d7, (lava ? 0.55 : 0.15) + night * 0.7);
				if (glowAlpha) light(glowPool, glow, w.x, w.y, Math.max(w.rx, w.ry) * 0.9, lava ? 0xff8a3a : 0x58e8e0, glowAlpha * 0.35);
			}
			for (const e of game.entities) {
				const s = TYPES[e.type];
				// Hidden saboteurs carry no lamp.
				if (e.hp <= 0 || s.threat || e.stealth || e.type === "beast" || e.type === "wall" || e.type === "gate" || !inView(e) || (e.team !== (game.viewer ?? 0) && !game.isVisible(e.x, e.y))) continue;
				if (!s.speed) {
					if (e.constructionLeft) continue;
					light(lightPool, lightWorld, e.x, e.y + 10, s.radius * 4.6, 0xffd9a0, 0.15 + night * 0.9);
					if (glowAlpha && night > 0.3) light(glowPool, glow, e.x, e.y - s.radius * 0.3, s.radius * 0.9, 0xffe2a8, glowAlpha * 0.35);
				} else if (night > 0.05 && s.flying) {
					// Aircraft: navigation lamps at their flying height (red, green, white), no beam on the ground.
					const lift = -25 - Math.sin(time * 2 + e.id) * 2,
						cos = Math.cos(e.angle),
						sin = Math.sin(e.angle),
						r = s.radius;
					for (const [px, py, color] of [
						[-r * 0.65, -r, 0xff8f91],
						[-r * 0.65, r, 0x91e1bc],
						[r, 0, 0xd9ecff],
					]) {
						const x = e.x + px * cos - py * sin,
							y = e.y + lift + px * sin + py * cos;
						// As in Canvas: a 10-unit glow (0x88 alpha) and a small bright dot, sharp, over the lit scene.
						light(lightPool, lightWorld, x, y, 26, color, night * 0.5);
						light(lampPool, beamsWorld, x, y, 10, color, night * (0x88 / 255));
						light(lampPool, beamsWorld, x, y, 2.5, color, night);
					}
				} else if (night > 0.05) {
					// Infantry flashlights and vehicle headlights: a beam lighting the ground ahead (longer for
					// vehicles, as in Canvas), a faint spill around the unit, a bright lamp and a haze in the air.
					const r = s.radius,
						reach = ["trooper", "rocket"].includes(e.type) ? 75 : 115,
						lx = e.x + Math.cos(e.angle) * r,
						ly = e.y + Math.sin(e.angle) * r;
					cone(beamPool, lightWorld, lx, ly, e.angle, reach * 1.5, 0xfff1c8, night * 0.85);
					light(lightPool, lightWorld, e.x, e.y, r * 2.2 + 18, 0xfff0d0, night * 0.28);
					// The visible beam: same wedge, reach and strength as the Canvas lamp (#fff1b1, 0x6b alpha).
					cone(hazePool, beamsWorld, lx, ly, e.angle, reach, 0xfff1b1, night * (0x6b / 255));
					light(lampPool, beamsWorld, lx, ly, 4, 0xfff4c0, night);
					if (glowAlpha) light(glowPool, glow, lx, ly, 7, 0xfff4c0, night);
				}
			}
			// Burning damaged models (the flames themselves are drawn by the Canvas art).
			for (const e of game.entities) {
				if (e.hp <= 0 || e.constructionLeft || e.hp / e.maxHp > 0.55 || ["beast", "trooper", "rocket"].includes(e.type) || !inView(e) || (e.team !== (game.viewer ?? 0) && !game.isVisible(e.x, e.y))) continue;
				const r = TYPES[e.type].radius,
					flicker = 0.8 + 0.2 * Math.sin(time * 13 + e.id) * Math.sin(time * 7.3 + e.id * 2),
					heat = 1 - e.hp / e.maxHp;
				light(lightPool, lightWorld, e.x, e.y - r * 0.15, r * 2.2 + 40, 0xff8a3a, (0.25 + night * 0.65) * flicker * (0.6 + heat));
				if (glowAlpha) light(glowPool, glow, e.x, e.y - r * 0.2, r * 0.6 + 12, 0xffa040, glowAlpha * 0.8 * flicker);
			}
			for (const ef of game.effects) {
				if (!game.isVisible(ef.x, ef.y)) continue;
				const a = ef.life / ef.maxLife;
				if (ef.kind === "shot") {
					light(lightPool, lightWorld, ef.x, ef.y, 110, 0xffe0a0, a);
					if (glowAlpha) light(glowPool, glow, ef.x, ef.y, 26, 0xfff0c0, a);
				} else if (ef.kind === "explosion") {
					light(lightPool, lightWorld, ef.x, ef.y, (ef.size || 40) * 3, 0xffa050, a * 1.4);
					if (glowAlpha) light(glowPool, glow, ef.x, ef.y, (ef.size || 40) * 1.2, 0xffb060, a);
				}
			}
		}
		for (const pool of [lightPool, glowPool, beamPool, hazePool, lampPool]) for (let i = pool.used; i < pool.length; i++) pool[i].visible = false;
		glow.visible = opts.bloom && glowPool.used > 0;
		lightSprite.visible = opts.lights;
		// Lightning of a thunderstorm lights the whole board for a moment (same timing as the sky art).
		const strike = time % 17,
			flash = opts.flashes && weather.kind === "rain" && weather.intensity > 0.4 && strike < 1.3 ? Math.sin((Math.PI * strike) / 1.3) : 0,
			base = ambient(night),
			lit = flash ? base.map((c, i) => (i < 3 ? c + ([0.8, 0.87, 1][i] - c) * flash * 0.55 * (0.4 + night) : c)) : base;
		if (opts.lights) app.renderer.render({ container: lightRoot, target: lightTexture, clear: true, clearColor: lit });

		fogSprite.width = game.W;
		fogSprite.height = game.H;
		fogBlur.strength = Math.max(2, Math.min(22, 40 * scale * 0.55));
		grading.reset();
		grading.saturate(0.12 - night * 0.3, true);
		grading.contrast(0.06 + night * 0.1, true);
		// Without the light map the night still has to be visible: fall back to plain darkening.
		if (!opts.lights) grading.brightness(1 - night * 0.55, true);
		if (margin && flatTexture) {
			app.renderer.render({ container: flatRoot, target: flatTexture, clear: true, clearColor: "#111e24" });
			tiltMesh.texture = flatTexture;
			tiltMesh.setCorners(...projection.corners.flat());
			if (flatRoot.parent) app.stage.removeChild(flatRoot);
			if (!tiltMesh.parent) app.stage.addChildAt(tiltMesh, 0);
		} else {
			if (tiltMesh.parent) app.stage.removeChild(tiltMesh);
			if (!flatRoot.parent) app.stage.addChildAt(flatRoot, 0);
		}
		app.renderer.render(app.stage);
		canvasRenderer.drawMinimap(v);
	}

	return {
		kind: backend,
		get fogCanvas() {
			return canvasRenderer.fogCanvas;
		},
		setGame(nextGame) {
			game = nextGame;
			canvasRenderer.setGame(nextGame);
			terrainSource = null;
			refreshTerrain();
			rebuildWater();
			clearScorch();
			terrainHeight.setGame(nextGame);
			// A new map drops its relief lighting; release the textures of the previous one.
			if (!terrainHeight.stats().baked && reliefTextures.size) {
				relief.forEach((sp) => (sp.texture = PIXI.Texture.EMPTY));
				for (const texture of reliefTextures.values()) texture.destroy(true);
				reliefTextures.clear();
			}
			ground.setGame(nextGame);
			hasGlow = probePhase("glow");
			hasEffects = probePhase("mapEffects");
			hasSkyPlugins = probePhase("skyPlugins");
			natives.setGame(nextGame);
			fauna.setGame(nextGame);
		},
		refreshFog(nextGame) {
			canvasRenderer.refreshFog(nextGame);
			fogTexture.source.update();
		},
		render,
		canvas: view,
		// The PixiJS application (tests and debugging).
		pixi: app,
		get flatTexture() {
			return flatTexture;
		},
		// Pointer position on the board (CSS pixels) → position on the flat frame the game logic uses, and back.
		toFlat(p) {
			if (!projection.inverse) return p;
			const q = applyH(projection.inverse, p.x, p.y);
			return { x: q.x - projection.margin, y: q.y - projection.top };
		},
		fromFlat(p) {
			if (!projection.toScreen) return p;
			return applyH(projection.toScreen, p.x + projection.margin, p.y + projection.top);
		},
		// The upright transform at a point of the flat frame (see upright()); the identity without the tilt.
		uprightAt(p) {
			if (!projection.toScreen) return { a: 1, b: 0, c: 0, d: 1 };
			return upright(projection.toScreen, p.x + projection.margin, p.y + projection.top);
		},
		heightAt: (x, y) => terrainHeight.heightAt(x, y),
		// Comparison and fallback: false paints the whole ground through Canvas again, as in 0.23.
		// Comparisons and fallbacks: false paints the ground (and with it the models) through Canvas again.
		setNativeGround(on) {
			nativeGround = !!on;
			layers.world.phases = nativeGround ? ["groundTop", "units", "sky"] : ["ground", "units", "sky"];
		},
		// false draws map glow and map effects through their Canvas layers again.
		setNativeEffects(on) {
			nativeEffects = !!on;
		},
		// false draws the interface on the board through its Canvas layer again.
		setNativeOverlay(on) {
			nativeOverlay = !!on;
		},
		// false paints the models through Canvas again (the ground stays native).
		setNativeModels(on) {
			nativeModels = !!on;
		},
		// Copy of the last frame (tests, screenshots).
		snapshot() {
			const frame = app.renderer.extract.canvas({ target: app.stage, frame: new PIXI.Rectangle(0, 0, size.width, size.height) }),
				shot = document.createElement("canvas");
			shot.width = frame.width;
			shot.height = frame.height;
			const c = shot.getContext("2d");
			c.fillStyle = "#111e24";
			c.fillRect(0, 0, shot.width, shot.height);
			c.drawImage(frame, 0, 0);
			return shot;
		},
		stats: () => ({
			lights: lightPool.used || 0,
			beams: beamPool.used || 0,
			glows: glowPool.used || 0,
			shadows: shadowFrame.count,
			silhouettes: silhouettes.size,
			particles: [...particlePools.values()].reduce((n, p) => n + p.used, 0),
			scorches: scorches.length,
			...models.stats(),
			relief: terrainHeight.stats(),
			ground: ground.stats(),
			models: natives.stats(),
			fauna: fauna.stats(),
			replay: {
				effects: { ...effectsReplay.stats(), unsupported: effectsReplay.unsupported },
				glow: { ...glowReplay.stats(), unsupported: glowReplay.unsupported },
				overlay: { ...overlayReplay.stats(), unsupported: overlayReplay.unsupported },
				grains: grainCount,
			},
			failures: failures.slice(),
			layers: Object.entries(layers)
				.filter(([, l]) => l.active)
				.map(([name]) => name),
			tilt: projection.margin,
		}),
		destroy() {
			destroyed = true;
			view.remove();
			app.destroy(true, { children: true, texture: true });
		},
	};
}
