/* Scene effects of the 3D renderer: water, night lights, weather and particles. Visual only.
   - Water: every water body of the map (game.waters: an ellipse with the shared wavy shore of
     RTS.waterRadius) gets a surface just under its rim. Lakes and ice crevasses mirror the sun through
     a scrolling ripple normal map, glowing pools (Lumeria) shine teal, lava flows with scrolling
     glowing cracks; chasms stay dark ground. Surfaces go through the same fog-of-war shader as the
     terrain.
   - Night lights: every headlight, flashlight, searchlight and building floodlight in the view lights the
     terrain and the models (webgl3d/night-lights-3d.js, in their shaders), with beams visible in the air;
     soft glow of the windows and of the map (groves, glowing pools, lava) laid on the ground. Faded in
     with game.night.
   - Weather: webgl3d/weather-3d.js (rain with splashes and a wet ground, snow settling, sandstorms,
     lightning bolts), animated on the graphics card.
   - Particles: smoke and fire on damaged buildings and vehicles, fire sparks and smoke puffs on every
     explosion; one point draw for smoke, one (additive) for fire.
   - Mining: sparks and rock dust at a working robot's drill, chunks of ore tossed into its hopper,
     glinting crystal chips, vapour from a working pump; a flickering drill light at night; silver
     flecks over ore and golden sparkles rising over crystals (thinner as a field runs out).
   - Map effects around the camera focus: spores over Lumeria, embers rising from Pyrrhos' lava, mist
     welling up from Aerion's chasms, sand blown over the dune maps, motes over the derelict fields and the
     frozen hive.
   - Shots (called by the renderer): muzzle flashes, rocket smoke trails, impact sparks. */
import { createWeather3D } from "./weather-3d.js";
import { createNightLights } from "./night-lights-3d.js";

export function createSceneFx3D(THREE, { world, heightAt, fogged, pointScale }) {
	const TAU = Math.PI * 2;
	const { TYPES } = RTS;
	// Share of particles to make (graphics settings: weather particles; set each frame by update()).
	let density = 1;

	// ---------- textures made in code ----------
	// Periodic ripple heights: a few sine waves that tile seamlessly.
	function rippleHeight(size) {
		const h = new Float32Array(size * size),
			waves = [
				[1, 2, 0.5],
				[3, -1, 0.3],
				[-2, 5, 0.2],
				[5, 3, 0.12],
				[-7, 2, 0.08],
			];
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) {
				let v = 0;
				for (const [a, b, amp] of waves) v += Math.sin(((x * a + y * b) / size) * TAU + a * 1.7) * amp;
				h[y * size + x] = v;
			}
		return h;
	}
	function normalMap(size = 128) {
		const h = rippleHeight(size),
			data = new Uint8Array(size * size * 4),
			at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) {
				const dx = (at(x + 1, y) - at(x - 1, y)) * 2,
					dy = (at(x, y + 1) - at(x, y - 1)) * 2,
					l = Math.hypot(dx, dy, 1),
					i = (y * size + x) * 4;
				data.set([((-dx / l) * 0.5 + 0.5) * 255, ((-dy / l) * 0.5 + 0.5) * 255, (1 / l) * 0.5 * 255 + 127, 255], i);
			}
		const t = new THREE.DataTexture(data, size, size);
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.magFilter = THREE.LinearFilter;
		t.minFilter = THREE.LinearMipmapLinearFilter;
		t.generateMipmaps = true;
		t.needsUpdate = true;
		return t;
	}
	// Tileable value noise, a few octaves (0…1).
	function tileNoise(size, cells, octaves, seed) {
		const out = new Float32Array(size * size);
		let s = seed >>> 0;
		const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
		let amp = 1,
			total = 0;
		for (let o = 0; o < octaves; o++, cells *= 2, amp *= 0.5) {
			const grid = Array.from({ length: cells * cells }, rnd),
				v = (i, j) => grid[(j % cells) * cells + (i % cells)],
				sm = (t) => t * t * (3 - 2 * t);
			for (let y = 0; y < size; y++)
				for (let x = 0; x < size; x++) {
					const gx = (x / size) * cells,
						gy = (y / size) * cells,
						i = Math.floor(gx),
						j = Math.floor(gy),
						tx = sm(gx - i),
						ty = sm(gy - j),
						top = v(i, j) + (v(i + 1, j) - v(i, j)) * tx,
						bottom = v(i, j + 1) + (v(i + 1, j + 1) - v(i, j + 1)) * tx;
					out[y * size + x] += (top + (bottom - top) * ty) * amp;
				}
			total += amp;
		}
		for (let i = 0; i < out.length; i++) out[i] /= total;
		return out;
	}
	// Lava: dark crust plates with glowing orange seams where the noise crosses its middle.
	function crackMap(size = 256) {
		const n = tileNoise(size, 6, 4, 7),
			heat = tileNoise(size, 3, 2, 99),
			data = new Uint8Array(size * size * 4);
		for (let i = 0; i < size * size; i++) {
			const seam = Math.pow(Math.max(0, 1 - Math.abs(n[i] - 0.5) * 9), 2),
				glow = Math.min(1, seam + heat[i] * 0.25);
			data.set([255 * Math.min(1, 0.3 + glow), 60 + 160 * seam * seam, 25 + 60 * seam * seam * seam, 255].map((c, k) => (k < 3 ? c * (0.2 + glow * 0.8) : c)), i * 4);
		}
		const t = new THREE.DataTexture(data, size, size);
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.colorSpace = THREE.SRGBColorSpace;
		t.magFilter = THREE.LinearFilter;
		t.minFilter = THREE.LinearMipmapLinearFilter;
		t.generateMipmaps = true;
		t.needsUpdate = true;
		return t;
	}
	function canvasTexture(size, draw) {
		const c = document.createElement("canvas");
		c.width = c.height = size;
		draw(c.getContext("2d"), size);
		return new THREE.CanvasTexture(c);
	}
	const softDot = canvasTexture(64, (x, s) => {
		const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
		g.addColorStop(0, "#ffffffff");
		g.addColorStop(0.45, "#ffffff88");
		g.addColorStop(1, "#ffffff00");
		x.fillStyle = g;
		x.fillRect(0, 0, s, s);
	});
	const pool = canvasTexture(128, (x, s) => {
		const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
		g.addColorStop(0, "#ffffffcc");
		g.addColorStop(0.4, "#ffffff55");
		g.addColorStop(1, "#ffffff00");
		x.fillStyle = g;
		x.fillRect(0, 0, s, s);
	});

	// ---------- water ----------
	const ripples = normalMap(),
		cracks = crackMap(),
		waterGroup = new THREE.Group();
	world.add(waterGroup);
	const WATER = {
		lake: () => new THREE.MeshStandardMaterial({ color: "#2d6a80", roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.84, normalMap: ripples, normalScale: new THREE.Vector2(0.55, 0.55) }),
		crevasse: () => new THREE.MeshStandardMaterial({ color: "#1f4558", roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.9, normalMap: ripples, normalScale: new THREE.Vector2(0.25, 0.25) }),
		glow: () => new THREE.MeshStandardMaterial({ color: "#123e48", emissive: "#0d4a52", emissiveIntensity: 0.3, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.78, normalMap: ripples, normalScale: new THREE.Vector2(0.4, 0.4) }),
		lava: () => new THREE.MeshStandardMaterial({ color: "#2a0d06", emissive: "#ffffff", emissiveMap: cracks, emissiveIntensity: 1.3, roughness: 0.85, metalness: 0 }),
	};
	// The look of open water (lakes, crevasses, glowing pools; not lava), on top of the fog-of-war shader:
	// small waves, a second ripple layer against tiling, the sky reflected at grazing angles (fresnel),
	// lighter shallows towards the shore (the shore fade is the depth), foam along the shore line, and
	// rings from the drops while it rains.
	// Reflections (0.127): the renderer draws the scene seen from under the surface of the water nearest the
	// camera into reflectMap; reflectMatrix projects a point of the surface onto it.
	const waterUniforms = { glowPool: { value: 1 }, waterTime: { value: 0 }, waterRain: { value: 0 }, waterSky: { value: new THREE.Color("#8fa6b4") }, waterSunDir: { value: new THREE.Vector3(0, 1, 0) }, waterSun: { value: new THREE.Color("#ffffff") }, reflectMap: { value: null }, reflectMatrix: { value: new THREE.Matrix4() }, reflectOn: { value: 0 }, reflectLevel: { value: 0 } };
	const WATER_COMMON = `
		uniform float waterTime; uniform float waterRain; uniform vec3 waterSky; uniform vec3 waterSunDir; uniform vec3 waterSun; uniform float glowPool;
		uniform sampler2D reflectMap; uniform float reflectOn; uniform float reflectLevel; varying vec4 vReflect; varying float vWaterY;
		float wvHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
		float wvNoise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			f = f * f * (3.0 - 2.0 * f);
			return mix(mix(wvHash(i), wvHash(i + vec2(1.0, 0.0)), f.x), mix(wvHash(i + vec2(0.0, 1.0)), wvHash(i + vec2(1.0, 1.0)), f.x), f.y);
		}
		float wvRings(vec2 p, float t) {
			float s = 0.0;
			for (int k = 0; k < 3; k++) {
				vec2 q = p / 11.0 + float(k) * 0.31, c = floor(q);
				vec2 o = vec2(wvHash(c), wvHash(c + 7.1)) * 0.6 + 0.2;
				float ph = fract(t * 0.8 + wvHash(c + 3.3));
				float d = length(fract(q) - o) * 11.0;
				s += smoothstep(0.38, 0.0, abs(d - ph * (2.5 + 3.0 * wvHash(c + 5.7)))) * (1.0 - ph) * (1.0 - ph);
			}
			return s;
		}`;
	// Lava: plates of dark crust drifting slowly with the flow (cells of a moving Voronoi pattern), cracks
	// glowing between them, patches of open molten rock pulsing (low noise), cooler and darker at the
	// banks (the shore fade).
	const LAVA_COMMON = `
		uniform float waterTime;
		vec2 lvHash2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
		vec2 lvCells(vec2 x) {
			vec2 n = floor(x), f = fract(x);
			float d1 = 8.0, d2 = 8.0;
			for (int j = -1; j <= 1; j++)
				for (int i = -1; i <= 1; i++) {
					vec2 g = vec2(float(i), float(j)), o = lvHash2(n + g);
					o = 0.5 + 0.38 * sin(waterTime * 0.12 + 6.2831 * o);
					float d = length(g + o - f);
					if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
				}
			return vec2(d1, d2);
		}
		float lvNoise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			f = f * f * (3.0 - 2.0 * f);
			float a = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453), b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
			float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453), d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
			return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
		}`;
	function lavaLook(material) {
		const before = material.onBeforeCompile;
		material.onBeforeCompile = (shader, renderer) => {
			before?.call(material, shader, renderer);
			Object.assign(shader.uniforms, waterUniforms);
			shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\n" + LAVA_COMMON).replace(
				"#include <emissivemap_fragment>",
				`#ifdef USE_COLOR_ALPHA
				float bank = vColor.a;
				#else
				float bank = 1.0;
				#endif
				vec2 flow = vec2(waterTime * 0.9, waterTime * 0.35);
				vec2 warp = vec2(lvNoise(vMapXY * 0.03), lvNoise(vMapXY * 0.03 + 7.3)) * 14.0;
				vec2 cells = lvCells((vMapXY - flow + warp) / 19.0);
				float heat = lvNoise((vMapXY - flow * 0.5) * 0.011 + waterTime * 0.02) * 0.6 + lvNoise(vMapXY * 0.037 + waterTime * 0.05) * 0.4;
				float crack = 1.0 - smoothstep(0.0, 0.04 + 0.1 * heat, cells.y - cells.x);
				float molten = smoothstep(0.56, 0.8, heat) * smoothstep(0.15, 0.7, bank);
				float glowK = clamp(max(crack * (0.55 + 0.7 * heat) * smoothstep(0.05, 0.3, bank), molten), 0.0, 1.0);
				float pulse = 0.85 + 0.15 * sin(waterTime * 2.2 + heat * 11.0);
				vec3 hot = mix(vec3(0.85, 0.14, 0.02), vec3(1.0, 0.72, 0.24), glowK * glowK);
				totalEmissiveRadiance = hot * glowK * 2.4 * pulse;
				vec3 crust = vec3(0.03, 0.022, 0.02) * (0.6 + 0.8 * lvNoise(vMapXY * 0.09 + floor(cells.x * 3.0)));
				diffuseColor.rgb = mix(crust, hot * 0.25, glowK);`,
			);
		};
		material.customProgramCacheKey = () => "lava";
		return material;
	}
	function waterLook(material) {
		const before = material.onBeforeCompile;
		material.onBeforeCompile = (shader, renderer) => {
			before?.call(material, shader, renderer);
			Object.assign(shader.uniforms, waterUniforms);
			shader.vertexShader = shader.vertexShader
				.replace("#include <common>", "#include <common>\nuniform float waterTime;\nuniform mat4 reflectMatrix;\nvarying vec4 vReflect;\nvarying float vWaterY;")
				.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvec4 waterWorld = modelMatrix * vec4(transformed, 1.0);\nvReflect = reflectMatrix * waterWorld;\nvWaterY = waterWorld.y;")
				.replace(
					"#include <begin_vertex>",
					"#include <begin_vertex>\n#ifdef USE_COLOR_ALPHA\ntransformed.y += (sin(position.x * 0.045 + waterTime * 1.3) + sin(position.z * 0.06 - waterTime * 1.05)) * 0.35 * color.a;\n#endif",
				);
			shader.fragmentShader = shader.fragmentShader
				.replace("#include <common>", "#include <common>\n" + WATER_COMMON)
				.replace(
					"#include <normal_fragment_maps>",
					`#include <normal_fragment_maps>
					#ifdef USE_NORMALMAP
					vec3 detailN = texture2D(normalMap, vNormalMapUv * 0.37 + vec2(-waterTime * 0.005, waterTime * 0.007)).xyz * 2.0 - 1.0;
					normal = normalize(normal + vec3(detailN.xy * 0.18, 0.0));
					#endif`,
				)
				.replace(
					"#include <opaque_fragment>",
					`#ifdef USE_COLOR_ALPHA
					float depthK = vColor.a;
					#else
					float depthK = 1.0;
					#endif
					float fres = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 3.0);
					// Deep water darker and bluer towards the middle, turquoise shallows at the shore.
					outgoingLight *= mix(1.0, 0.72, smoothstep(0.45, 1.0, depthK));
					// What the water mirrors: the scene above it (shores, buildings, units, the sky) when this is the
					// surface being reflected, else the sky's colour; wavering with the ripples, stronger at grazing
					// angles, a little even looking straight down.
					vec3 mirrored = waterSky * 1.1;
					float mirrorK = fres * 0.55;
					if (reflectOn > 0.5 && abs(vWaterY - reflectLevel) < 3.0) {
						vec2 ruv = vReflect.xy / vReflect.w + normal.xy * 0.03;
						mirrored = texture2D(reflectMap, clamp(ruv, 0.001, 0.999)).rgb;
						mirrorK = mix(0.28, 0.85, fres);
					}
					outgoingLight = mix(outgoingLight, mirrored, mirrorK);
					outgoingLight = mix(outgoingLight * vec3(1.12, 1.25, 1.12) + vec3(0.04, 0.07, 0.06), outgoingLight, smoothstep(0.0, 0.8, depthK));
					// Light shimmering on the bed of the shallows.
					float shimmer = pow(abs(sin(wvNoise(vMapXY * 0.08 + waterTime * 0.12) * 9.0 + waterTime * 1.1)), 8.0);
					outgoingLight += vec3(0.75, 0.9, 0.85) * shimmer * (1.0 - smoothstep(0.25, 0.7, depthK)) * smoothstep(0.05, 0.2, depthK) * 0.12 * waterSun.b;
					// Glitter: the sun caught on the ripples, a few bright points twinkling.
					vec3 sunView = normalize((viewMatrix * vec4(waterSunDir, 0.0)).xyz);
					float glint = pow(max(dot(reflect(-normalize(vViewPosition), normal), sunView), 0.0), 60.0) * step(0.86, wvNoise(vMapXY * 0.9 + waterTime * 0.6));
					outgoingLight += waterSun * glint * 2.2;
					// Foam along the shore, lapping in and out with the small waves.
					float lap = 0.06 * sin(waterTime * 1.4 + wvNoise(vMapXY * 0.02) * 6.0);
					float foamNoise = wvNoise(vMapXY * 0.21 + vec2(waterTime * 0.35, -waterTime * 0.25)) * 0.6 + wvNoise(vMapXY * 0.53 - vec2(waterTime * 0.2, 0.0)) * 0.4;
					float foam = smoothstep(0.04 + lap, 0.14 + lap, depthK) * (1.0 - smoothstep(0.2 + lap, 0.4 + lap, depthK)) * smoothstep(0.42, 0.8, foamNoise);
					// Foam: brighter, in streaks drifting with the water, and a fine lace further out.
					float lace = smoothstep(0.62, 0.9, wvNoise(vMapXY * 0.9 + vec2(waterTime * 0.5, waterTime * 0.2))) * (1.0 - smoothstep(0.2, 0.55, depthK)) * smoothstep(0.08, 0.2, depthK);
					outgoingLight += vec3(0.85, 0.9, 0.92) * (foam * 0.55 + lace * 0.18);
					diffuseColor.a = max(diffuseColor.a, foam * 0.55);
					outgoingLight += vec3(0.8, 0.86, 0.92) * waterRain * wvRings(vMapXY, waterTime) * 0.2;
					#ifdef GLOW_POOL
					// Bioluminescence: swirling filaments of light drifting through the dark water, pulsing; a
					// glowing rim along the shore; brighter at night (glowPool).
					vec2 swirl = vMapXY * 0.028 + vec2(sin(waterTime * 0.21), cos(waterTime * 0.17)) * 1.6 + wvNoise(vMapXY * 0.011 + waterTime * 0.04) * 3.0;
					float sw = wvNoise(swirl) * 0.65 + wvNoise(swirl * 2.3 + 4.0) * 0.35;
					float fil = pow(1.0 - abs(sw - 0.5) * 2.0, 7.0);
					float pulse = 0.7 + 0.3 * sin(waterTime * 1.3 + sw * 7.0);
					outgoingLight = outgoingLight * 0.55 + vec3(0.12, 0.85, 0.82) * (fil * 0.9 + 0.12) * pulse * smoothstep(0.08, 0.6, depthK) * glowPool;
					outgoingLight += vec3(0.35, 1.0, 0.92) * smoothstep(0.04, 0.13, depthK) * (1.0 - smoothstep(0.13, 0.32, depthK)) * 0.45 * glowPool;
					#endif
					#include <opaque_fragment>`,
				);
		};
		material.customProgramCacheKey = () => "water" + (material.defines?.GLOW_POOL !== undefined ? "|glow" : "");
		return material;
	}
	let waters = [];
	// Water surfaces are grids (the terrain grid) over each body, faded out towards the shore: every grid
	// point gets an opacity from its distance to the wavy shore (opaque inside 70% of the radius, clear at
	// the shore, clipped to the map), so the edge is soft instead of stepped. On level ground a body's
	// surface is flat, just above the highest ground along its shore line, so it covers the sunken bed;
	// where the shore climbs (rivers and lava flowing down a slope) it lies on the bed instead of hanging
	// above it. Overlapping bodies of one kind share their grid points (the most opaque wins), so
	// translucent water never doubles up; each kind is one mesh.
	// The terrain mesh grid (webgl/terrain-height.js cell): a draped surface matches the ground exactly.
	const STEP = 12;
	function waterPoints(w, game, kind, points) {
		let rimLow = Infinity,
			rimHigh = -Infinity;
		for (let i = 0; i < 48; i++) {
			const a = (i / 48) * TAU,
				r = RTS.waterRadius(w, a) * 0.92,
				h = heightAt(w.x + Math.cos(a) * w.rx * r, w.y + Math.sin(a) * w.ry * r);
			rimLow = Math.min(rimLow, h);
			rimHigh = Math.max(rimHigh, h);
		}
		// Lakes and crevasses on level ground are flat mirrors; glowing pools and lava (chains of bodies
		// along a channel) always lie on their bed.
		// (On uneven shores a lake is still flat, at its lowest rim point.)
		const level = kind === "lake" || kind === "crevasse" ? (rimHigh - rimLow < 8 ? rimHigh : rimLow) + 0.6 : null;
		for (let y = Math.max(0, Math.floor((w.y - w.ry * 1.1) / STEP) * STEP); y <= Math.min(game.H, w.y + w.ry * 1.1); y += STEP)
			for (let x = Math.max(0, Math.floor((w.x - w.rx * 1.1) / STEP) * STEP); x <= Math.min(game.W, w.x + w.rx * 1.1); x += STEP) {
				const nx = (x - w.x) / w.rx,
					ny = (y - w.y) / w.ry,
					d = Math.hypot(nx, ny) / RTS.waterRadius(w, Math.atan2(ny, nx)),
					alpha = Math.max(0, Math.min(1, (1 - d) / 0.3));
				if (alpha <= 0) continue;
				const key = x + "," + y,
					had = points.get(key);
				if (!had || alpha > had.alpha) points.set(key, { x, y, alpha, level: level ?? had?.level ?? null });
			}
	}
	function waterMesh(points, kind) {
		const lift = kind === "lava" ? 0.8 : 1.2,
			positions = [],
			uvs = [],
			colors = [],
			seen = new Set();
		const corner = (x, y) => points.get(x + "," + y);
		for (const p of points.values())
			// Every cell touching a visible point (cells are keyed by their top-left corner).
			for (const [cx, cy] of [[p.x, p.y], [p.x - STEP, p.y], [p.x, p.y - STEP], [p.x - STEP, p.y - STEP]]) {
				const key = cx + "," + cy;
				if (seen.has(key)) continue;
				seen.add(key);
				const quad = [[cx, cy], [cx, cy + STEP], [cx + STEP, cy], [cx + STEP, cy + STEP]].map(([x, y]) => ({ x, y, p: corner(x, y) }));
				if (quad.every((q) => !q.p)) continue;
				const level = quad.find((q) => q.p?.level != null)?.p.level ?? null;
				for (const i of [0, 1, 2, 2, 1, 3]) {
					const q = quad[i];
					positions.push(q.x, level ?? heightAt(q.x, q.y) + lift, q.y);
					uvs.push(q.x / 220, -q.y / 220); // map units / 220: ripples keep their size on every body
					colors.push(1, 1, 1, q.p?.alpha ?? 0);
				}
			}
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
		geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
		geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
		geometry.computeVertexNormals();
		return geometry;
	}
	function buildWater(game) {
		for (const w of waters) {
			waterGroup.remove(w.mesh);
			w.mesh.geometry.dispose();
			w.mesh.material.dispose();
		}
		waters = [];
		const byKind = new Map();
		for (const w of game.waters || []) {
			const kind = WATER[w.kind] ? w.kind : w.kind ? null : "lake";
			if (!kind) continue; // chasms: dark ground, no surface
			if (!byKind.has(kind)) byKind.set(kind, new Map());
			waterPoints(w, game, kind, byKind.get(kind));
		}
		for (const [kind, cells] of byKind) {
			const base = WATER[kind]();
			if (kind === "glow") base.defines = { ...base.defines, GLOW_POOL: "" };
			const material = kind === "lava" ? lavaLook(fogged(base)) : waterLook(fogged(base));
			// Per-vertex opacity fades the shore.
			Object.assign(material, { vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
			const mesh = new THREE.Mesh(waterMesh(cells, kind), material);
			// Extent and (for flat water) the level of the surface, for the reflections.
			mesh.geometry.computeBoundingBox();
			const bb = mesh.geometry.boundingBox,
				box = { x0: bb.min.x, x1: bb.max.x, y0: bb.min.z, y1: bb.max.z, level: bb.max.y };
			mesh.receiveShadow = kind !== "lava";
			mesh.renderOrder = 1;
			waterGroup.add(mesh);
			waters.push({ mesh, kind, box });
		}
	}

	// ---------- weather (webgl3d/weather-3d.js: rain, snow, sand, lightning on the graphics card) ----------
	// Made before the night lights: they lie on the ground through its height map texture.
	const weather3d = createWeather3D(THREE, { world, heightAt });
	let weatherNow = { kind: null, intensity: 0 };

	// ---------- night lights ----------
	// Ground light (pools under buildings and map glow, headlight fans of the other vehicles, flashlights of
	// infantry): additive textured quads, one instanced draw per texture. Each quad is a fine grid that the
	// vertex shader lays on the terrain (bilinear height map, as the terrain mesh), so on a slope the light
	// follows the ground instead of cutting into it or hanging over it.
	const drape = new THREE.PlaneGeometry(1, 1, 12, 12).rotateX(-Math.PI / 2);
	function lightBatch(texture, max) {
		const material = new THREE.ShaderMaterial({
			uniforms: { map: { value: texture }, heightMap: weather3d.ground.heightMap, heightInfo: weather3d.ground.heightInfo },
			vertexShader: `uniform sampler2D heightMap; uniform vec4 heightInfo; varying vec2 vUv; varying vec3 vTint;
				float cellHeight(vec2 c) { return texture2D(heightMap, (c + 0.5) / heightInfo.xy).r; }
				float groundAt(vec2 p) {
					vec2 g = clamp(p / heightInfo.z, vec2(0.0), heightInfo.xy - 1.001), f = floor(g), t = g - f;
					return mix(mix(cellHeight(f), cellHeight(f + vec2(1.0, 0.0)), t.x), mix(cellHeight(f + vec2(0.0, 1.0)), cellHeight(f + vec2(1.0, 1.0)), t.x), t.y);
				}
				void main() {
					vUv = uv;
					vTint = instanceColor;
					vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
					w.y = groundAt(w.xz) + 1.2;
					gl_Position = projectionMatrix * viewMatrix * w;
				}`,
			fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec3 vTint;
				void main() {
					vec4 c = texture2D(map, vUv);
					gl_FragColor = vec4(c.rgb * vTint * c.a, 1.0);
					#include <colorspace_fragment>
				}`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const m = new THREE.InstancedMesh(drape, material, max);
		m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
		m.frustumCulled = false;
		m.renderOrder = 2;
		m.count = 0;
		world.add(m);
		return m;
	}
	const pools = lightBatch(pool, 900),
		matrix = new THREE.Matrix4(),
		quat = new THREE.Quaternion(),
		up = new THREE.Vector3(0, 1, 0),
		pos = new THREE.Vector3(),
		scl = new THREE.Vector3(),
		color = new THREE.Color();
	function place(batch, x, y, angle, sx, sz, c, strength) {
		if (batch.count >= batch.instanceMatrix.count) return;
		quat.setFromAxisAngle(up, -angle);
		batch.setMatrixAt(batch.count, matrix.compose(pos.set(x, 0, y), quat, scl.set(sx, 1, sz)));
		batch.setColorAt(batch.count, color.set(c).multiplyScalar(strength));
		batch.count++;
	}
	// Map glow (MapArt glow in 2D): groves, glowing pools and lava throw coloured light on the ground;
	// lava glows a little by day too. Spots are found once per map (setGame).
	let glowSpots = [];
	function findGlow(game) {
		glowSpots = [];
		for (const o of game.obstacles || []) if (o.kind === "grove") glowSpots.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, r: Math.max(o.w, o.h) * 1.4, color: "#3fd8c8", day: 0, night: 0.5 });
		for (const w of game.waters || [])
			if (w.kind === "glow") glowSpots.push({ x: w.x, y: w.y, r: Math.max(w.rx, w.ry) * 2.2, color: "#2fd0de", day: 0.05, night: 0.4 });
			else if (w.kind === "lava") glowSpots.push({ x: w.x, y: w.y, r: Math.max(w.rx, w.ry) * 2.4, color: "#ff6a2a", day: 0.04, night: 0.16 });
	}
	// Night lights (webgl3d/night-lights-3d.js): every lamp in the view at once, lighting the terrain and
	// the models in their shaders — no fixed set of Three.js lights handed to the things nearest the
	// camera, so nothing switches as the camera moves.
	// Light colour of a building at night: warm in the base, cool in the lab, energy blue at reactors and
	// batteries, fire at the forge, white at the medical post.
	const BUILDING_LIGHT = { lab: "#cfe8ff", uplink: "#cfe8ff", reactor: "#9ff2ff", battery: "#9ff2ff", shieldgen: "#9ff2ff", forge: "#ff9a4a", medbay: "#f4f8ff" };
	const buildingLight = (type) => BUILDING_LIGHT[type] || "#ffcf8a";
	const lights = createNightLights(THREE, { world });
	// A lamp on the front of an entity (reach ahead of its centre, height over the ground), aimed along its
	// facing at the ground len ahead.
	function headlamp(e, { len, reach, height, angle, color, power, range, haze }) {
		const c = Math.cos(e.angle || 0),
			sn = Math.sin(e.angle || 0),
			x = e.x + c * reach,
			y = e.y + sn * reach,
			tx = e.x + c * len,
			ty = e.y + sn * len;
		lights.spot(x, y, heightAt(e.x, e.y) + height, tx, ty, heightAt(tx, ty), { angle, color, power, range, haze });
	}
	const ground = (s) => !s.speed || s.flying ? false : true;
	function nightLights(game, night, hidden, focus, span) {
		pools.count = 0;
		for (const g of glowSpots) {
			const strength = g.day + (g.night - g.day) * night;
			if (strength > 0.02) place(pools, g.x, g.y, 0, g.r, g.r, g.color, strength);
		}
		lights.begin();
		const weather = weatherNow.kind ? weatherNow.intensity : 0,
			reach = span * 1.3;
		if (night > 0.05)
			for (const e of game.entities) {
				if (e.hp <= 0 || hidden(e)) continue;
				const s = TYPES[e.type];
				if (!s || s.threat || e.team === 2 || Math.abs(e.x - focus.x) > reach || Math.abs(e.y - focus.y) > reach) continue;
				const r = s.radius;
				if (!s.speed) {
					if (e.constructionLeft > 0 || e.type === "wall") continue;
					// The footprint of the 3D building is about 1.6 × its radius; buildings face +X (their
					// doors). A soft glow of the windows on the ground, two floodlights on the front corners
					// slanting out-forward and down, a light before the front washing the walls.
					const tint = buildingLight(e.type),
						len = r * 1.3 + 90,
						h = heightAt(e.x, e.y) + Math.max(12, r * 0.55);
					place(pools, e.x, e.y, 0, r * 3, r * 3, tint, night * 0.1);
					for (const side of [-1, 1]) {
						const a = side * 0.6,
							fx = e.x + r * 0.78,
							fy = e.y + side * r * 0.72,
							tx = fx + Math.cos(a) * len,
							ty = fy + Math.sin(a) * len;
						lights.spot(fx, fy, h, tx, ty, heightAt(tx, ty), { angle: 0.62, soft: 0.8, color: tint, power: night * 1500, range: len * 1.9, haze: night * (0.07 + weather * 0.3) });
					}
					lights.point(e.x + r * 1.25 + 8, e.y, heightAt(e.x, e.y) + Math.max(14, r * 0.42), { color: tint, power: night * 480, range: r * 2 + 70 });
				} else if (s.flying)
					// Searchlight from the nose, down and ahead (the flight height of the renderer is 90).
					headlamp(e, { len: 150, reach: r * 0.9, height: 88, angle: 0.3, color: "#e8f0ff", power: night * 1400, range: 240, haze: night * (0.14 + weather * 0.3) });
				else if (ground(s)) {
					if (r >= 12) {
						const len = r >= 16 ? 200 : 140;
						headlamp(e, { len, reach: r * 0.95, height: Math.max(8, r * 0.5), angle: 0.5, color: "#fff1cc", power: night * 1800, range: len * 1.6, haze: night * (0.05 + weather * 0.3) });
					} else headlamp(e, { len: 90, reach: r * 0.5, height: 14, angle: 0.26, color: "#eef4ff", power: night * 420, range: 144, haze: night * (0.04 + weather * 0.22) });
				}
			}
		// Lava and glowing pools near the view light the ground and the models round them (by day too,
		// fainter): one light per body, flickering on lava.
		for (const w of game.waters || []) {
			if (w.kind !== "lava" && w.kind !== "glow") continue;
			if (Math.abs(w.x - focus.x) > span * 0.7 || Math.abs(w.y - focus.y) > span * 0.7 || hidden({ x: w.x, y: w.y, team: -1 })) continue;
			const lava = w.kind === "lava",
				size = Math.max(w.rx, w.ry),
				flick = lava ? 0.85 + 0.15 * Math.sin(clockNow * 3.1 + w.x * 0.01) : 1;
			lights.point(w.x, w.y, heightAt(w.x, w.y) + 40, { color: lava ? "#ff6a22" : "#3fe0d0", power: flick * size * (lava ? 3 + night * 6 : 1.5 + night * 5), range: size * 2.2 + 70 });
		}
		// Muzzle flashes light up their surroundings at night for an instant.
		if (night > 0.05)
			for (const ef of game.effects) {
				if (ef.kind !== "shot" || ef.life < ef.maxLife * 0.6 || Math.abs(ef.x - focus.x) > span * 0.6 || Math.abs(ef.y - focus.y) > span * 0.6 || hidden({ x: ef.x, y: ef.y, team: -1 })) continue;
				lights.point(ef.x, ef.y, heightAt(ef.x, ef.y) + (ef.air ? 88 : 16), { color: "#ffc070", power: night * (ef.rocket ? 260 : 140), range: ef.rocket ? 90 : 60 });
			}
		// Fires on burning buildings and vehicles flicker over their surroundings — strongly at night, but
		// by day too (0.138).
		{
			for (const e of game.entities) {
				const s = TYPES[e.type];
				if (!s || e.hp <= 0 || s.flying || e.team === 2 || e.constructionLeft > 0 || hidden(e) || Math.abs(e.x - focus.x) > span || Math.abs(e.y - focus.y) > span) continue;
				const building = !s.speed;
				if (!(building || s.radius >= 16) || e.hp / e.maxHp >= (building ? 0.3 : 0.2)) continue;
				const flick = 0.75 + 0.25 * Math.sin(clockNow * 17 + e.id) * Math.sin(clockNow * 7.3 + e.id * 2);
				lights.point(e.x, e.y, heightAt(e.x, e.y) + Math.min(60, s.radius * 0.8) + 6, { color: "#ff8a3a", power: (0.35 + night) * flick * (building ? 560 : 300), range: s.radius * 2.6 + 80 });
			}
		}
		// A working drill flickers on the deposit at night (warm on ore, golden on crystal).
		if (night > 0.05)
			for (const m of miners)
				if (m.resource !== "gas") lights.point(m.x, m.y, heightAt(m.x, m.y) + 10, { color: m.resource === "crystal" ? "#ffd98a" : "#ffb35c", power: night * (110 + Math.random() * 120), range: 90 });
		// Explosions light the ground and the models around them for a moment, by day too: a white-hot
		// flash at first (0.144), stronger and wider, then the orange of the fire.
		for (const ef of game.effects) {
			if (ef.kind !== "explosion" || hidden({ x: ef.x, y: ef.y, team: -1 })) continue;
			const k = 1 - ef.life / ef.maxLife,
				f = Math.max(0, 1 - k / 0.55),
				hot = Math.max(0, 1 - k / 0.1),
				size = ef.size || 40;
			if (f > 0) lights.point(ef.x, ef.y, ef.space ? ef.lift : heightAt(ef.x, ef.y) + (ef.air ? 90 : size * 0.4), { color: hot > 0.3 ? "#fff0d8" : "#ffb35c", power: f * f * size * (25 + night * 15) * (1 + hot * 2), range: size * (5 + hot * 2.5) + 80 });
		}
		// Sparks of damaged machines flash blue-white for an instant (0.144).
		for (const l of sparkLights) lights.point(l.x, l.y, l.h, { color: "#c8dcff", power: 90 * (1 + night * 2), range: 80 });
		lights.end(focus, span, true);
		pools.visible = pools.count > 0;
		pools.instanceMatrix.needsUpdate = true;
		pools.instanceColor.needsUpdate = true;
	}
	// What vehicles throw up behind them (0.144.2): on dry ground a trail of dust (pale sand on the desert,
	// grey ash, the planet's soil), in the rain mud — dark clods flung up and falling back — and on snow or ice
	// a white spray; more the faster and the bigger the vehicle. Ground vehicles moving near the view only.
	const lastGround = new Map();
	function vehicleDust(game, dt, hidden, focus, span) {
		if (RTS.MISSIONS[game.missionId]?.space) return;
		const wet = weatherNow.kind === "rain" && weatherNow.intensity > 0.25,
			snowy = biomeNow === "ice" || (weatherNow.kind === "snow" && weatherNow.intensity > 0.3),
			soil = SOIL[biomeNow] || SOIL.dust,
			seen = new Set();
		for (const e of game.entities) {
			const s = TYPES[e.type];
			if (!s?.speed || s.flying || s.ship || s.radius < 9 || e.hp <= 0 || hidden(e) || Math.abs(e.x - focus.x) > span || Math.abs(e.y - focus.y) > span) continue;
			seen.add(e.id);
			const was = lastGround.get(e.id);
			lastGround.set(e.id, { x: e.x, y: e.y, t: game.time });
			if (!was || game.time <= was.t) {
				if (was) lastGround.set(e.id, was);
				continue;
			}
			const v = Math.hypot(e.x - was.x, e.y - was.y) / (game.time - was.t);
			if (v < 8) continue;
			const c = Math.cos(e.angle || 0),
				sn = Math.sin(e.angle || 0),
				r = s.radius,
				k = Math.min(1.5, v / 60) * (r / 14),
				x = e.x - c * r * 0.85,
				z = e.y - sn * r * 0.85,
				g = heightAt(x, z);
			if (Math.random() > dt * 14 * k * density) continue;
			const side = rand(-0.6, 0.6) * r;
			if (wet)
				for (let i = 0; i < 3; i++)
					smoke.spawn({ x: x - sn * side, y: g + 2, z: z + c * side, vx: -c * rand(10, 30) + rand(-12, 12), vy: rand(30, 70), vz: -sn * rand(10, 30) + rand(-12, 12), lift: -300, life: 0, max: rand(0.4, 0.7), s0: rand(1.4, 2.6), s1: 1.2, r: 0.2, g: 0.16, b: 0.12, a: 1, style: 1 });
			else if (snowy) {
				smoke.spawn({ x: x - sn * side, y: g + 3, z: z + c * side, vx: -c * rand(14, 30), vy: rand(16, 34), vz: -sn * rand(14, 30), lift: -60, drag: 1.2, life: 0, max: rand(0.7, 1.2), s0: r * 0.35, s1: r * 1.3, r: 0.94, g: 0.96, b: 1, a: 0.45 });
				for (let i = 0; i < 2; i++) smoke.spawn({ x, y: g + 3, z, vx: -c * rand(20, 40) + rand(-10, 10), vy: rand(30, 60), vz: -sn * rand(20, 40) + rand(-10, 10), lift: -200, life: 0, max: rand(0.4, 0.7), s0: rand(1, 1.8), s1: 0.8, r: 0.95, g: 0.97, b: 1, a: 1, style: 1 });
			} else
				smoke.spawn({ x: x - sn * side, y: g + 3, z: z + c * side, vx: -c * rand(6, 16) + rand(-4, 4), vy: rand(6, 16), vz: -sn * rand(6, 16) + rand(-4, 4), drag: 0.9, life: 0, max: rand(1.4, 2.4), s0: r * 0.45, s1: r * (1.8 + k), r: soil[0], g: soil[1], b: soil[2], a: 0.42 });
		}
		for (const id of lastGround.keys()) if (!seen.has(id)) lastGround.delete(id);
	}
	// Engine trails of aircraft in the air: a short glowing streak at the nozzle and a pale vapour trail
	// thinning out behind (only flying units that move, near the view).
	const lastAir = new Map();
	function airTrails(game, dt, hidden, focus, span) {
		// Space: no air for vapour trails (craft there leave engine ribbons, three-renderer.js).
		if (RTS.MISSIONS[game.missionId]?.space) return;
		const seen = new Set();
		for (const e of game.entities) {
			const s = TYPES[e.type];
			if (!s?.flying || e.hp <= 0 || hidden(e) || Math.hypot(e.x - focus.x, e.y - focus.y) > span) continue;
			seen.add(e.id);
			const was = lastAir.get(e.id);
			lastAir.set(e.id, { x: e.x, y: e.y });
			if (!was || Math.hypot(e.x - was.x, e.y - was.y) < 0.2) continue;
			const c = Math.cos(e.angle || 0),
				sn = Math.sin(e.angle || 0),
				r = s.radius * 0.95,
				x = e.x - c * r,
				z = e.y - sn * r,
				y = heightAt(e.x, e.y) + 90;
			if (e.type !== "drone") fire.spawn({ x, y, z, vx: -c * 20, vy: 0, vz: -sn * 20, lift: 0, life: 0, max: 0.18, s0: 6, s1: 2, r: 1, g: 0.75, b: 0.45, a: 0.8 });
			if (Math.random() < dt * 30) smoke.spawn({ x: x - c * 4, y, z: z - sn * 4, vx: rand(-1, 1), vy: rand(-0.5, 0.5), vz: rand(-1, 1), life: 0, max: e.type === "drone" ? 0.6 : 1.6, s0: e.type === "drone" ? 2 : 3.5, s1: e.type === "drone" ? 5 : 12, r: 0.9, g: 0.92, b: 0.95, a: 0.28 });
		}
		for (const id of lastAir.keys()) if (!seen.has(id)) lastAir.delete(id);
	}

	// ---------- particle systems (points with size and colour per particle) ----------
	// Each particle also carries misc: its age (0…1), a seed, and a style — smoke: 0 a billowing puff,
	// 1 a hard dot (debris, chunks); fire: 0 a soft dot (sparks, embers, flashes), 1 a flame tongue.
	const PUFF = `
		float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
		float pNoise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			f = f * f * (3.0 - 2.0 * f);
			return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), f.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), f.x), f.y);
		}`;
	function particleSystem(max, additive) {
		const geometry = new THREE.BufferGeometry(),
			positions = new Float32Array(max * 3),
			sizes = new Float32Array(max),
			colors = new Float32Array(max * 4),
			misc = new Float32Array(max * 3);
		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
		geometry.setAttribute("rgba", new THREE.BufferAttribute(colors, 4));
		geometry.setAttribute("misc", new THREE.BufferAttribute(misc, 3));
		const material = new THREE.ShaderMaterial({
			uniforms: { map: { value: softDot }, scale: { value: 500 }, light: { value: 1 }, time: { value: 0 } },
			vertexShader: `attribute float size; attribute vec4 rgba; attribute vec3 misc; varying vec4 vC; varying vec3 vM; uniform float scale;
				void main() { vC = rgba; vM = misc; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
			fragmentShader: additive
				? `uniform sampler2D map; uniform float light; uniform float time; varying vec4 vC; varying vec3 vM;
				${PUFF}
				void main() {
					vec2 q = gl_PointCoord;
					float a;
					vec3 col = vC.rgb;
					if (vM.z > 1.5) {
						// A flash: a bright core and a few spikes (a muzzle star), turned by the seed.
						vec2 d = q - 0.5;
						float r = length(d) * 2.0, ang = atan(d.y, d.x) + vM.y * 6.283;
						float spikes = pow(abs(cos(ang * 2.5)), 14.0) * (1.0 - smoothstep(0.15, 1.0, r));
						a = pow(1.0 - smoothstep(0.0, 0.6, r), 2.0) + spikes * 0.9;
						col = mix(vC.rgb, vec3(1.0), pow(1.0 - smoothstep(0.0, 0.35, r), 2.0));
					} else if (vM.z > 0.5) {
						// A flame tongue (0.138): turbulence rising through it (two octaves of noise scrolling up),
						// wide at the base and narrowing to a swaying, broken tip; white-yellow at the base,
						// orange in the middle, dark red at the tip, cooler as the particle ages.
						float h = 1.0 - q.y;
						float t = time * 2.6 + vM.y * 40.0;
						float n = pNoise(vec2(q.x * 3.5 + vM.y * 17.0, q.y * 3.0 + t)) * 0.65 + pNoise(vec2(q.x * 8.0 - vM.y * 9.0, q.y * 7.0 + t * 1.7)) * 0.35;
						float sway = (pNoise(vec2(vM.y * 7.0, t * 0.6)) - 0.5) * 0.55 * h * h;
						float x = abs((q.x - 0.5) * 2.0 + sway + (n - 0.5) * 0.45 * h);
						float w = mix(0.78, 0.06, pow(h, 0.85)) * (0.75 + 0.5 * n);
						a = smoothstep(w, w * 0.25, x) * smoothstep(1.0, 0.7 - n * 0.25, h) * smoothstep(0.0, 0.14, h);
						float heat = clamp((1.0 - h) * 1.15 - vM.x * 0.55 + (n - 0.5) * 0.3, 0.0, 1.0);
						col = heat > 0.66 ? mix(vec3(1.0, 0.62, 0.16), vec3(1.0, 0.95, 0.75), (heat - 0.66) / 0.34)
							: heat > 0.33 ? mix(vec3(0.85, 0.2, 0.04), vec3(1.0, 0.62, 0.16), (heat - 0.33) / 0.33)
							: mix(vec3(0.3, 0.04, 0.01), vec3(0.85, 0.2, 0.04), heat / 0.33);
						col *= vC.rgb * (0.55 + 0.75 * heat * heat);
					} else a = texture2D(map, q).a;
					a *= vC.a;
					if (a < 0.01) discard;
					gl_FragColor = vec4(col * light, a);
				}`
				: `uniform sampler2D map; uniform float light; varying vec4 vC; varying vec3 vM;
				${PUFF}
				void main() {
					vec2 q = gl_PointCoord;
					float a;
					float shade = 1.0;
					if (vM.z > 0.5 && vM.z < 1.5) a = smoothstep(0.5, 0.3, length(q - 0.5));
					else {
						// A puff: a ragged round edge from noise turned by the seed, billowing as it ages;
						// lit from above, darker underneath.
						float ang = vM.y * 6.283 + vM.x * 0.8, cs = cos(ang), sn = sin(ang);
						vec2 r = mat2(cs, -sn, sn, cs) * (q - 0.5);
						float n = pNoise(r * 4.0 + vM.y * 17.0 + vM.x * 1.5) * 0.6 + pNoise(r * 9.0 - vM.y * 5.0) * 0.4;
						a = smoothstep(0.5, 0.18, length(r) + (n - 0.5) * 0.32) * (0.75 + 0.4 * n);
						shade = mix(1.12, 0.78, q.y);
					}
					a *= vC.a;
					if (a < 0.01) discard;
					vec3 col = vC.rgb * light * shade;
					// Fire-lit smoke (style 2, from explosions): while young it glows orange from the fire inside,
					// most at its lower side and its dense middle.
					if (vM.z > 1.5) {
						float young = 1.0 - smoothstep(0.0, 0.35, vM.x);
						float inner = smoothstep(0.45, 0.0, length(q - vec2(0.5, 0.62)));
						col += vec3(1.0, 0.42, 0.12) * young * (0.6 + 1.6 * inner) * (1.0 - smoothstep(0.0, 1.0, 1.0 - q.y) * 0.5);
					}
					gl_FragColor = vec4(col, a);
				}`,
			transparent: true,
			depthWrite: false,
			blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
		});
		const points = new THREE.Points(geometry, material);
		points.frustumCulled = false;
		points.renderOrder = 3;
		world.add(points);
		const list = [];
		return {
			material,
			spawn(p) {
				if (list.length < max) list.push(p);
			},
			update(dt) {
				let n = 0;
				for (let i = list.length - 1; i >= 0; i--) {
					const p = list[i];
					p.life += dt;
					if (p.life >= p.max) {
						list[i] = list[list.length - 1];
						list.pop();
						continue;
					}
					// A delayed particle (negative life) waits unseen; drag slows it down.
					if (p.life < 0) continue;
					if (p.drag) {
						const k = Math.max(0, 1 - p.drag * dt);
						p.vx *= k;
						p.vz *= k;
					}
					p.vy += (p.lift ?? 0) * dt;
					p.x += p.vx * dt;
					p.y += p.vy * dt;
					p.z += p.vz * dt;
					const t = p.life / p.max;
					positions[n * 3] = p.x;
					positions[n * 3 + 1] = p.y;
					positions[n * 3 + 2] = p.z;
					sizes[n] = p.s0 + (p.s1 - p.s0) * t;
					colors[n * 4] = p.r;
					colors[n * 4 + 1] = p.g;
					colors[n * 4 + 2] = p.b;
					colors[n * 4 + 3] = p.a * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85);
					misc[n * 3] = t;
					misc[n * 3 + 1] = p.seed ?? (p.seed = Math.random());
					misc[n * 3 + 2] = p.style || 0;
					n++;
				}
				geometry.setDrawRange(0, n);
				// Upload only the live part of each buffer.
				for (const name of ["position", "size", "rgba", "misc"]) {
					const a = geometry.attributes[name];
					a.clearUpdateRanges();
					a.addUpdateRange(0, n * a.itemSize);
					a.needsUpdate = true;
				}
				points.visible = n > 0;
				return n;
			},
			clear: () => (list.length = 0),
		};
	}
	const smoke = particleSystem(2500, false),
		fire = particleSystem(2500, true);
	const rand = (a, b) => a + Math.random() * (b - a);
	const seenExplosions = new WeakSet();
	// Fire on burning buildings and vehicles (0.138): a few steady fire spots on the roof and the edges of the
	// building (more as it is wrecked further), fixed by its id, each pouring out flame tongues every frame
	// with a hot glow at its root, embers rising, and fire-lit smoke above. In space (no air) the flames do
	// not rise: short jets burst from torn modules in every direction, with sparks, and no smoke.
	const spotOf = (e, i, n, r, top) => {
		const h = Math.sin(e.id * 12.9898 + i * 78.233) * 43758.5453,
			u = h - Math.floor(h),
			a = (i / n) * TAU + e.id * 2.39 + u * 0.8;
		return [Math.cos(a) * r * (0.18 + u * 0.3), top * (0.55 + u * 0.45), Math.sin(a) * r * (0.18 + u * 0.3)];
	};
	function burnFires(game, dt, hidden) {
		const space = !!RTS.MISSIONS[game.missionId]?.space;
		for (const e of game.entities) {
			if (e.hp <= 0 || e.constructionLeft > 0 || e.team === 2) continue;
			const s = TYPES[e.type];
			if (!s || s.flying) continue;
			const f = e.hp / e.maxHp,
				building = !s.speed;
			if (!(building ? f < 0.3 : s.radius >= 16 && f < 0.2) || hidden(e)) continue;
			// How hard it burns: from 0 (just caught) to 1 (nearly gone).
			const fierce = Math.min(1, ((building ? 0.3 : 0.2) - f) / (building ? 0.25 : 0.17)),
				ground = heightAt(e.x, e.y) + (space ? (building ? s.radius * 0.8 + 10 : s.ship ? 34 : 22) : 0),
				top = building ? Math.min(60, s.radius * 0.8) : 16,
				n = building ? Math.max(2, Math.min(6, Math.round(s.radius / 14 + fierce * 2))) : 1 + Math.round(fierce),
				size = (building ? s.radius * 0.34 : s.radius * 0.5) * (0.8 + 0.5 * fierce);
			for (let i = 0; i < n; i++) {
				const [ox, oy, oz] = spotOf(e, i, n, s.radius, top),
					x = e.x + ox,
					y = ground + oy,
					z = e.y + oz;
				if (space) {
					// Venting: a short jet in a direction of its own, and sparks.
					if (Math.random() < dt * 10 * density) {
						const a = rand(0, TAU),
							u = rand(-0.6, 0.8),
							sp = rand(40, 80);
						fire.spawn({ x, y, z, vx: Math.cos(a) * sp, vy: u * sp, vz: Math.sin(a) * sp, lift: 0, drag: 2.5, life: 0, max: rand(0.25, 0.45), s0: size * 0.9, s1: size * 0.3, r: 1, g: 1, b: 1, a: 0.8, style: 1 });
					}
					if (Math.random() < dt * 6 * density) {
						const a = rand(0, TAU),
							sp = rand(60, 140);
						fire.spawn({ x, y, z, vx: Math.cos(a) * sp, vy: rand(-60, 60), vz: Math.sin(a) * sp, lift: 0, life: 0, max: rand(0.4, 0.8), s0: rand(1.5, 2.5), s1: 0.5, r: 1, g: 0.8, b: 0.5, a: 1 });
					}
					continue;
				}
				// Flame tongues pouring up, a hot glow at the root, now and then an ember.
				if (Math.random() < dt * (14 + 10 * fierce) * density)
					fire.spawn({ x: x + rand(-2, 2), y, z: z + rand(-2, 2), vx: rand(-3, 3) + 4, vy: rand(16, 30), vz: rand(-3, 3), life: 0, max: rand(0.5, 0.9), s0: size * rand(0.9, 1.25), s1: size * 0.55, r: 1, g: 1, b: 1, a: 0.42, style: 1 });
				if (Math.random() < dt * 8 * density) fire.spawn({ x, y: y + 2, z, vx: 0, vy: 3, vz: 0, lift: 0, life: 0, max: rand(0.25, 0.4), s0: size * 0.9, s1: size * 0.6, r: 1, g: 0.5, b: 0.15, a: 0.3 });
				if (Math.random() < dt * (1.5 + 2 * fierce) * density)
					fire.spawn({ x, y: y + size * 0.5, z, vx: rand(-6, 12), vy: rand(30, 70), vz: rand(-6, 6), drag: 0.6, lift: -10, life: 0, max: rand(1.2, 2.2), s0: rand(1.4, 2.4), s1: 0.5, r: 1, g: rand(0.5, 0.7), b: 0.15, a: 1 });
				if (Math.random() < dt * (2 + 2 * fierce) * density)
					smoke.spawn({ x: x + rand(-3, 3), y: y + size * 1.1, z: z + rand(-3, 3), vx: rand(8, 16), vy: rand(20, 34), vz: rand(1, 6), drag: 0.15, life: 0, max: rand(2.6, 4.2), s0: size * 1.1, s1: size * 4.5, r: 0.16, g: 0.155, b: 0.15, a: 0.55, style: 2 });
			}
		}
	}
	// Stages of damage (0.144): the harder it is hit, the more it shows. Below 75 % now and then a burst of
	// sparks from a torn spot (a short circuit), with a flash lighting its surroundings for an instant; the
	// worse, the more often. Below 50 % smoke on a planet (damageAndExplosions) or, in space, a pale jet of
	// gas venting from a torn line; below 30 % (buildings) / 20 % (big vehicles) the fires of burnFires.
	const sparkLights = [];
	function damageSparks(game, dt, hidden) {
		const space = !!RTS.MISSIONS[game.missionId]?.space;
		for (const e of game.entities) {
			if (e.hp <= 0 || e.constructionLeft > 0 || e.team === 2) continue;
			const s = TYPES[e.type];
			if (!s || s.flying || s.radius < 9) continue;
			const f = e.hp / e.maxHp;
			if (f >= 0.75 || hidden(e)) continue;
			const building = !s.speed,
				hurt = (0.75 - f) / 0.75,
				base = heightAt(e.x, e.y) + (space ? (building ? s.radius * 0.8 + 10 : s.ship ? 34 : 22) : 0),
				top = building ? Math.min(60, s.radius * 0.8) : s.ship ? 6 : 14,
				n = building ? 3 : 2;
			for (let i = 0; i < n; i++) {
				if (Math.random() > dt * (0.3 + hurt * 1.3) * density) continue;
				const [ox, oy, oz] = spotOf(e, i + 7, n, s.radius, top),
					x = e.x + ox,
					y = base + oy,
					z = e.y + oz;
				for (let j = 0, count = 6 + Math.round(Math.random() * 6); j < count; j++) {
					const a = rand(0, TAU),
						sp = rand(30, 90);
					fire.spawn({ x, y, z, vx: Math.cos(a) * sp, vy: space ? rand(-50, 50) : rand(20, 70), vz: Math.sin(a) * sp, lift: space ? 0 : -260, drag: space ? 0.4 : 0.2, life: 0, max: rand(0.25, 0.6), s0: rand(1, 1.8), s1: 0.3, r: 1, g: rand(0.8, 0.95), b: rand(0.5, 0.75), a: 1 });
				}
				fire.spawn({ x, y, z, vx: 0, vy: 0, vz: 0, lift: 0, life: 0, max: 0.08, s0: 7, s1: 3, r: 0.85, g: 0.9, b: 1, a: 0.9, style: 2 });
				sparkLights.push({ x, y: z, h: y, t: clockNow });
			}
			if (space && f < 0.5 && Math.random() < dt * 8 * density) {
				const [ox, oy, oz] = spotOf(e, 11, 1, s.radius, top),
					a = e.id * 1.7 + Math.sin(clockNow * 0.7 + e.id) * 0.3,
					sp = rand(30, 50);
				smoke.spawn({ x: e.x + ox, y: base + oy, z: e.y + oz, vx: Math.cos(a) * sp, vy: rand(-4, 4), vz: Math.sin(a) * sp, lift: 0, drag: 0.6, life: 0, max: rand(0.8, 1.4), s0: s.radius * 0.12, s1: s.radius * 0.5, r: 0.85, g: 0.9, b: 1, a: 0.25 });
			}
		}
		while (sparkLights.length && clockNow - sparkLights[0].t > 0.15) sparkLights.shift();
	}
	// Burning debris of explosions: chunks flying on their arcs (straight in space), each leaving a trail of
	// small flames and, on a planet, smoke behind it; they burn out or hit the ground.
	const burners = [];
	function updateBurners(dt) {
		for (let i = burners.length - 1; i >= 0; i--) {
			const b = burners[i];
			b.life += dt;
			b.vy -= b.g * dt;
			const px = b.x,
				py = b.y,
				pz = b.z;
			b.x += b.vx * dt;
			b.y += b.vy * dt;
			b.z += b.vz * dt;
			const left = 1 - b.life / b.max;
			if (left <= 0 || (!b.space && b.y < b.ground + 1)) {
				burners[i] = burners[burners.length - 1];
				burners.pop();
				continue;
			}
			// Flames all along the way flown this frame (an unbroken trail at any frame rate).
			const steps = Math.min(8, Math.max(1, Math.ceil(Math.hypot(b.x - px, b.y - py, b.z - pz) / (b.size * 0.8))));
			for (let k = 1; k <= steps; k++) {
				const f = k / steps;
				fire.spawn({ x: px + (b.x - px) * f, y: py + (b.y - py) * f, z: pz + (b.z - pz) * f, vx: rand(-4, 4), vy: rand(-4, 4), vz: rand(-4, 4), lift: 0, life: -dt * (1 - f), max: rand(0.25, 0.45), s0: b.size * (1.2 + left), s1: b.size * 0.4, r: 1, g: 0.5 + left * 0.3, b: 0.15, a: 0.95 * Math.min(1, left * 2) });
			}
			if (!b.space && Math.random() < dt * 40)
				smoke.spawn({ x: b.x, y: b.y, z: b.z, vx: rand(-3, 3), vy: rand(4, 12), vz: rand(-3, 3), drag: 0.8, life: 0, max: rand(1.4, 2.4), s0: b.size * 1.2, s1: b.size * 5, r: 0.22, g: 0.21, b: 0.2, a: 0.45 * left, style: 2 });
		}
	}
	let emitClock = 0;
	function damageAndExplosions(game, dt, hidden, scars = true) {
		emitClock += dt;
		// Emitters run 10 times a second; each spawn carries its own randomness.
		// (No damage smoke in space: there is no air to carry it; burnFires vents sparks there.)
		if (emitClock >= 0.1 && scars && !RTS.MISSIONS[game.missionId]?.space) {
			emitClock = 0;
			for (const e of game.entities) {
				if (e.hp <= 0 || e.constructionLeft > 0 || hidden(e)) continue;
				const s = TYPES[e.type];
				if (!s || s.flying || e.team === 2) continue;
				const f = e.hp / e.maxHp,
					building = !s.speed,
					vehicle = s.speed && s.radius >= 10;
				if (!(building ? f < 0.5 : vehicle && f < 0.35)) continue;
				const ground = heightAt(e.x, e.y),
					top = building ? Math.min(60, s.radius * 0.8) : 18;
				const burning = f < (building ? 0.3 : 0.2);
				// Smoke: grey from a damaged one, thick and dark over a fire; it leans with the wind.
				for (let n = burning ? 2 : 1; n-- > 0; )
					if (Math.random() < (building ? 0.8 : 0.45) * density) {
						const k = burning ? rand(0.16, 0.26) : rand(0.36, 0.46);
						smoke.spawn({ x: e.x + rand(-s.radius, s.radius) * 0.4, y: ground + top, z: e.y + rand(-s.radius, s.radius) * 0.4, vx: rand(8, 18), vy: rand(18, 34), vz: rand(1, 6), drag: 0.15, life: 0, max: rand(2.8, 4.6), s0: s.radius * 0.55, s1: s.radius * (burning ? 3 : 2.6), r: k, g: k * 0.97, b: k * 0.94, a: burning ? 0.62 : 0.5 });
					}
				// (The flames themselves come every frame from steady fire spots: burnFires below.)
			}
		}
		if (scars) {
			burnFires(game, dt, hidden);
			damageSparks(game, dt, hidden);
		}
		// Fresh craters smoulder: thin smoke curling up and now and then a spark, for about 25 s.
		for (const k of game.craters || []) {
			const age = game.time - k.born;
			if (age > 25 || hidden({ x: k.x, y: k.y, team: -1 })) continue;
			const fade = 1 - age / 25;
			if (Math.random() < dt * 3 * fade * density)
				smoke.spawn({ x: k.x + rand(-k.size, k.size) * 0.4, y: heightAt(k.x, k.y) + 2, z: k.y + rand(-k.size, k.size) * 0.4, vx: rand(3, 9), vy: rand(10, 20), vz: rand(-2, 4), drag: 0.2, life: 0, max: rand(2.2, 3.6), s0: k.size * 0.3, s1: k.size * 1.4, r: 0.3, g: 0.28, b: 0.27, a: 0.4 * fade });
			if (Math.random() < dt * 1.5 * fade * density)
				fire.spawn({ x: k.x + rand(-k.size, k.size) * 0.2, y: heightAt(k.x, k.y) + 2, z: k.y + rand(-k.size, k.size) * 0.2, vx: rand(-4, 4), vy: rand(20, 40), vz: rand(-4, 4), lift: -30, life: 0, max: rand(0.8, 1.4), s0: rand(1.4, 2.4), s1: 0.5, r: 1, g: 0.55, b: 0.15, a: 1 });
		}
		for (const ef of game.effects) {
			if (ef.kind !== "explosion" || seenExplosions.has(ef)) continue;
			seenExplosions.add(ef);
			if (hidden({ x: ef.x, y: ef.y, team: -1 })) continue;
			const size = ef.size || 40,
				scale = size / 50,
				ground = heightAt(ef.x, ef.y),
				y = ef.space ? ef.lift : ground + (ef.air ? 90 : 8),
				n = (count) => Math.ceil(count * density * Math.min(1.6, 0.6 + scale * 0.5));
			// Space (0.136): no air, no gravity — sparks fly out in every direction and burn out, hull
			// fragments drift away tumbling for a few seconds, burning pieces glow and fade; no smoke, no dust.
			if (ef.space) {
				const ball = (sp) => {
					const a = rand(0, TAU),
						u = rand(-1, 1),
						r = Math.sqrt(1 - u * u);
					return [Math.cos(a) * r * sp, u * sp * 0.6, Math.sin(a) * r * sp];
				};
				for (let i = 0; i < n(40); i++) {
					const [vx, vy, vz] = ball(rand(80, 260) * scale);
					fire.spawn({ x: ef.x, y, z: ef.y, vx, vy, vz, lift: 0, life: 0, max: rand(0.3, 0.8), s0: rand(3, 6), s1: 0.6, r: 1, g: rand(0.8, 0.95), b: rand(0.5, 0.75), a: 1 });
				}
				for (let i = 0; i < n(14); i++) {
					const [vx, vy, vz] = ball(rand(20, 70) * scale);
					fire.spawn({ x: ef.x, y, z: ef.y, vx, vy, vz, lift: 0, drag: 0.15, life: rand(-0.1, 0), max: rand(2, 3.5), s0: rand(2.5, 4), s1: 0.8, r: 1, g: rand(0.45, 0.6), b: 0.15, a: 0.95 });
				}
				for (let i = 0; i < Math.ceil(n(5)); i++) {
					const [vx, vy, vz] = ball(rand(60, 150) * scale);
					burners.push({ x: ef.x, y, z: ef.y, vx, vy, vz, life: 0, max: rand(1.2, 2.2), g: 0, size: rand(2, 3) * Math.max(1, scale), space: true });
				}
				for (let i = 0; i < n(16); i++) {
					const [vx, vy, vz] = ball(rand(25, 90) * scale),
						c = rand(0.12, 0.22);
					smoke.spawn({ x: ef.x, y, z: ef.y, vx, vy, vz, lift: 0, drag: 0.05, life: 0, max: rand(3, 5), s0: rand(2, 4.5) * Math.max(1, scale), s1: rand(1.5, 3), r: c, g: c * 0.98, b: c * 1.05, a: 1, style: 1 });
				}
				continue;
			}
			// Sparks: fast, white-yellow, falling.
			for (let i = 0; i < n(26); i++) {
				const a = rand(0, TAU),
					sp = rand(60, 200) * scale;
				fire.spawn({ x: ef.x, y, z: ef.y, vx: Math.cos(a) * sp, vy: rand(ef.air ? -60 : 50, 200), vz: Math.sin(a) * sp, lift: -320, life: 0, max: rand(0.3, 0.75), s0: rand(3, 7), s1: 0.8, r: 1, g: rand(0.75, 0.95), b: rand(0.4, 0.6), a: 1 });
			}
			// Embers: slow, orange, drifting down for a while.
			for (let i = 0; i < n(10); i++) {
				const a = rand(0, TAU),
					sp = rand(15, 60) * scale;
				fire.spawn({ x: ef.x, y: y + rand(0, 10), z: ef.y, vx: Math.cos(a) * sp, vy: rand(30, 90), vz: Math.sin(a) * sp, lift: -70, drag: 1.2, life: rand(-0.1, 0), max: rand(1.2, 2.2), s0: rand(2, 3.5), s1: 1, r: 1, g: rand(0.4, 0.6), b: 0.12, a: 0.95 });
			}
			// Debris: dark chunks thrown up and falling.
			for (let i = 0; i < n(12); i++) {
				const a = rand(0, TAU),
					sp = rand(50, 150) * scale,
					c = rand(0.08, 0.16);
				smoke.spawn({ x: ef.x, y, z: ef.y, vx: Math.cos(a) * sp, vy: rand(ef.air ? -20 : 90, 220), vz: Math.sin(a) * sp, lift: -420, life: 0, max: rand(0.8, 1.4), s0: rand(2, 4) * Math.max(1, scale), s1: rand(1.5, 3), r: c, g: c * 0.95, b: c * 0.9, a: 1, style: 1 });
			}
			// The smoke column: dark puffs welling up one after another, growing.
			for (let i = 0; i < n(12); i++)
				smoke.spawn({ x: ef.x + rand(-size, size) * 0.2, y: y + rand(0, size * 0.4), z: ef.y + rand(-size, size) * 0.2, vx: rand(-8, 8), vy: rand(18, 45), vz: rand(-8, 8), drag: 0.6, life: -rand(0.05, 0.7), max: rand(2.4, 4.4), s0: size * 0.45, s1: size * rand(1.6, 2.3), r: 0.2, g: 0.19, b: 0.18, a: 0.62, style: 2 });
			// Burning debris: a few chunks flung out on arcs, each trailing smoke and fire (see burners).
			for (let i = 0; i < Math.ceil(n(4)); i++) {
				const a = rand(0, TAU),
					sp = rand(70, 170) * scale;
				burners.push({ x: ef.x, y, z: ef.y, vx: Math.cos(a) * sp, vy: rand(120, 260) * Math.min(1.4, 0.7 + scale * 0.4), vz: Math.sin(a) * sp, life: 0, max: rand(0.9, 1.6), g: 420, size: rand(2, 3.5) * Math.max(1, scale), ground });
			}
			// Dust thrown out along the ground (not in the air).
			if (!ef.air)
				for (let i = 0; i < n(12); i++) {
					const a = (i / n(12)) * TAU + rand(-0.2, 0.2),
						sp = rand(70, 130) * scale;
					smoke.spawn({ x: ef.x + Math.cos(a) * size * 0.2, y: ground + 4, z: ef.y + Math.sin(a) * size * 0.2, vx: Math.cos(a) * sp, vy: rand(3, 10), vz: Math.sin(a) * sp, drag: 2.2, life: 0, max: rand(1.1, 1.8), s0: size * 0.25, s1: size * 0.9, r: 0.56, g: 0.49, b: 0.4, a: 0.42 });
				}
			// The shock wave of a big blast (0.144): a second, faster ring of pale dust racing out low over the
			// ground, thinning as it goes.
			if (!ef.air && size >= 45)
				for (let i = 0, m = n(22); i < m; i++) {
					const a = (i / m) * TAU + rand(-0.1, 0.1),
						sp = rand(170, 240) * scale;
					smoke.spawn({ x: ef.x + Math.cos(a) * size * 0.3, y: ground + 3, z: ef.y + Math.sin(a) * size * 0.3, vx: Math.cos(a) * sp, vy: rand(1, 5), vz: Math.sin(a) * sp, drag: 1.6, life: 0, max: rand(0.9, 1.4), s0: size * 0.3, s1: size * 1.2, r: 0.62, g: 0.56, b: 0.47, a: 0.3 });
				}
		}
	}

	// ---------- map effects (MapArt.effects in 2D), around the camera focus ----------
	// Lumeria: glowing spores drifting over the ground, brighter at night. Pyrrhos: embers rising from the
	// lava. Aerion: mist welling up from the chasms.
	let byKind = {},
		theme = null;
	const owed = { spores: 0, embers: 0, mist: 0, bubbles: 0 },
		vapour = new WeakMap();
	function emit(name, rate, dt) {
		owed[name] += rate * dt * density;
		const n = Math.floor(owed[name]);
		owed[name] -= n;
		return n;
	}
	function mapEffects(game, dt, focus, span, night, visible, gasFlow) {
		const near = (w) => Math.abs(w.x - focus.x) < span / 2 + w.rx && Math.abs(w.y - focus.y) < span / 2 + w.ry;
		// Gas fields breathe violet vapour; a pumping extractor draws it out thick (as the 2D vent).
		for (const o of game.gasFields || []) {
			if (!o.amount || !near({ x: o.x, y: o.y, rx: 60, ry: 60 }) || !visible(o.x, o.y) || !game.explored[game.visionIndex(o.x, o.y)]) continue;
			const flow = gasFlow?.(o);
			// Kept here, never on the game's deposit (saves and network checksums must not change).
			let v = (vapour.get(o) || 0) + dt * (flow ? 9 : 2.5) * density;
			for (; v >= 1; v--)
				smoke.spawn({ x: o.x + rand(-6, 6), y: heightAt(o.x, o.y) + 3, z: o.y + 4 + rand(-3, 3), vx: rand(-4, 4), vy: rand(14, flow ? 34 : 22), vz: rand(-4, 4), life: 0, max: rand(1.8, 3.2), s0: 8, s1: flow ? 34 : 24, r: 0.78, g: 0.55, b: 0.9, a: flow ? 0.38 : 0.22 });
			vapour.set(o, v);
		}
		if (theme === "lumen")
			for (let i = emit("spores", 60 * (span / 1600) ** 2, dt); i-- > 0; ) {
				const x = focus.x + rand(-0.5, 0.5) * span,
					y = focus.y + rand(-0.5, 0.5) * span;
				if (!visible(x, y)) continue;
				const violet = Math.random() < 0.33;
				fire.spawn({ x, y: heightAt(x, y) + rand(6, 55), z: y, vx: rand(-6, 6), vy: rand(-2, 5), vz: rand(-6, 6), life: 0, max: rand(5, 8), s0: rand(3, 6), s1: rand(3, 6), r: violet ? 0.78 : 0.43, g: violet ? 0.55 : 0.95, b: violet ? 1 : 0.88, a: 0.12 + 0.75 * night });
			}
		if (theme === "magma") {
			const lava = byKind.lava.filter(near);
			for (let i = lava.length ? emit("embers", 90, dt) : 0; i-- > 0; ) {
				const w = lava[Math.floor(Math.random() * lava.length)],
					x = w.x + rand(-0.5, 0.5) * w.rx * 1.4,
					y = w.y + rand(-0.5, 0.5) * w.ry;
				if (!visible(x, y)) continue;
				fire.spawn({ x, y: heightAt(x, y) + 2, z: y, vx: rand(-10, 10), vy: rand(50, 120), vz: rand(-10, 10), lift: -25, life: 0, max: rand(1.2, 2.4), s0: rand(3, 5), s1: 1, r: 1, g: rand(0.55, 0.85), b: 0.25, a: 0.9 });
			}
			// Bubbles bursting: a flash of molten rock, blobs thrown up and falling back, a puff of smoke.
			for (let i = lava.length ? emit("bubbles", 6, dt) : 0; i-- > 0; ) {
				const w = lava[Math.floor(Math.random() * lava.length)],
					x = w.x + rand(-0.35, 0.35) * w.rx * 1.4,
					y = w.y + rand(-0.35, 0.35) * w.ry;
				if (!visible(x, y)) continue;
				const g = heightAt(x, y) + 1.5;
				fire.spawn({ x, y: g, z: y, vx: 0, vy: 6, vz: 0, life: 0, max: 0.35, s0: 9, s1: 3, r: 1, g: 0.6, b: 0.2, a: 0.8 });
				for (let k = 0; k < 6; k++) {
					const a = rand(0, TAU),
						sp = rand(10, 28);
					fire.spawn({ x, y: g, z: y, vx: Math.cos(a) * sp, vy: rand(25, 55), vz: Math.sin(a) * sp, lift: -140, life: 0, max: rand(0.5, 0.8), s0: rand(1.6, 2.6), s1: 1.2, r: 1, g: rand(0.45, 0.65), b: 0.12, a: 1 });
				}
				smoke.spawn({ x, y: g + 3, z: y, vx: rand(4, 9), vy: rand(10, 18), vz: rand(-2, 3), life: 0, max: rand(1.6, 2.6), s0: 6, s1: 20, r: 0.3, g: 0.27, b: 0.26, a: 0.35 });
			}
		}
		// Themed maps (themed-art.js): sand blown low over the dunes, motes drifting over the derelict
		// fields (ash) and the frozen hive (frost).
		if (theme === "dunesea" || theme === "goldsand")
			for (let i = emit("spores", 30 * (span / 1600) ** 2, dt); i-- > 0; ) {
				const x = focus.x + rand(-0.5, 0.5) * span,
					y = focus.y + rand(-0.5, 0.5) * span;
				if (!visible(x, y)) continue;
				smoke.spawn({ x, y: heightAt(x, y) + rand(2, 10), z: y, vx: rand(70, 120), vy: rand(0, 4), vz: rand(8, 20), life: 0, max: rand(1.5, 2.5), s0: rand(14, 24), s1: rand(40, 70), r: theme === "goldsand" ? 1 : 0.96, g: theme === "goldsand" ? 0.92 : 0.86, b: theme === "goldsand" ? 0.75 : 0.67, a: 0.16 });
			}
		if (theme === "derelict" || theme === "frozenhive")
			for (let i = emit("spores", 45 * (span / 1600) ** 2, dt); i-- > 0; ) {
				const x = focus.x + rand(-0.5, 0.5) * span,
					y = focus.y + rand(-0.5, 0.5) * span;
				if (!visible(x, y)) continue;
				const ice = theme === "frozenhive";
				smoke.spawn({ x, y: heightAt(x, y) + rand(5, 60), z: y, vx: rand(-8, 8), vy: rand(2, 8), vz: rand(-8, 8), life: 0, max: rand(4, 7), s0: rand(2, 3.5), s1: rand(2, 3.5), r: ice ? 0.95 : 0.6, g: ice ? 0.97 : 0.68, b: ice ? 1 : 0.65, a: 0.7 });
			}
		if (theme === "skyfall") {
			const chasms = byKind.chasm.filter(near);
			for (let i = chasms.length ? emit("mist", 12, dt) : 0; i-- > 0; ) {
				const w = chasms[Math.floor(Math.random() * chasms.length)],
					x = w.x + rand(-0.4, 0.4) * w.rx,
					y = w.y + rand(-0.4, 0.4) * w.ry;
				if (!visible(x, y)) continue;
				smoke.spawn({ x, y: heightAt(x, y) + rand(-10, 10), z: y, vx: rand(-6, 6), vy: rand(4, 10), vz: rand(-6, 6), life: 0, max: rand(6, 9), s0: 70, s1: 190, r: 0.78, g: 0.82, b: 0.88, a: 0.16 });
			}
		}
	}

	// ---------- mining (robots at work, motes over the deposits) ----------
	// Who is mining right now (from the renderer: the same check that animates the tools), each frame:
	// [{ e, x, y (the tool), dx, dy (towards the deposit), resource }]; gas robots at a pump: { pump }.
	let miners = [];
	function findMiners(game, hidden, focus, span, working) {
		miners = [];
		if (!working) return;
		for (const e of game.entities) {
			if (e.type !== "worker" || e.hp <= 0 || hidden(e) || Math.abs(e.x - focus.x) > span || Math.abs(e.y - focus.y) > span) continue;
			const kind = e.order?.kind;
			if (kind !== "gather" && kind !== "gas") continue;
			if (!working(e)) continue;
			const target = kind === "gather" ? game.resourceFields(e.order.resource).find((o) => o.id === e.order.oreId) : game.get(e.order.extractorId);
			if (!target) continue;
			const d = Math.hypot(target.x - e.x, target.y - e.y) || 1,
				dx = (target.x - e.x) / d,
				dy = (target.y - e.y) / d,
				reach = Math.min(d * 0.6, 16);
			miners.push({ e, x: e.x + dx * reach, y: e.y + dy * reach, dx, dy, resource: kind === "gas" ? "gas" : e.order.resource || "ore", target });
		}
	}
	const mineOwed = new WeakMap(),
		moteOwed = new WeakMap();
	// Spawns `rate` per second for a key (fractions carried over between frames).
	function due(map, key, rate, dt) {
		const v = (map.get(key) || 0) + rate * dt * density,
			n = Math.floor(v);
		map.set(key, v - n);
		return n;
	}
	function miningFx(game, dt, focus, span, visible) {
		for (const m of miners) {
			const ground = heightAt(m.x, m.y),
				y = ground + 11;
			if (m.resource === "gas") {
				// The pump's relief valve: a plume of vapour now and then.
				for (let n = due(mineOwed, m.e, 3, dt); n-- > 0; )
					smoke.spawn({ x: m.target.x + rand(-6, 6), y: heightAt(m.target.x, m.target.y) + 34, z: m.target.y + rand(-6, 6), vx: rand(-4, 4), vy: rand(18, 30), vz: rand(-4, 4), life: 0, max: rand(0.9, 1.5), s0: 5, s1: 18, r: 0.86, g: 0.84, b: 0.92, a: 0.3 });
				continue;
			}
			const crystal = m.resource === "crystal",
				k = due(mineOwed, m.e, crystal ? 30 : 42, dt);
			for (let n = 0; n < k; n++) {
				const a = Math.atan2(m.dy, m.dx) + Math.PI + rand(-1.3, 1.3),
					sp = rand(30, 80);
				// Sparks off the drill (ore) or glinting chips of crystal, flying back from the face.
				if (crystal) fire.spawn({ x: m.x, y: y + rand(0, 4), z: m.y, vx: Math.cos(a) * sp, vy: rand(30, 90), vz: Math.sin(a) * sp, lift: -200, life: 0, max: rand(0.3, 0.6), s0: rand(3, 5), s1: 0.8, r: 1, g: rand(0.82, 0.95), b: rand(0.45, 0.75), a: 1 });
				else fire.spawn({ x: m.x, y: y + rand(-1, 3), z: m.y, vx: Math.cos(a) * sp, vy: rand(20, 70), vz: Math.sin(a) * sp, lift: -260, life: 0, max: rand(0.2, 0.45), s0: rand(2.6, 4.4), s1: 0.6, r: 1, g: rand(0.65, 0.9), b: 0.35, a: 1 });
			}
			// Rock dust (ore) or pale crystal dust welling up from the face.
			for (let n = due(moteOwed, m.e, crystal ? 5 : 9, dt); n-- > 0; )
				smoke.spawn({ x: m.x + rand(-5, 5), y: ground + 6, z: m.y + rand(-5, 5), vx: rand(-8, 8), vy: rand(8, 18), vz: rand(-8, 8), drag: 1, life: 0, max: rand(1.1, 2), s0: 6, s1: 22, r: crystal ? 0.92 : 0.36, g: crystal ? 0.88 : 0.33, b: crystal ? 0.72 : 0.3, a: crystal ? 0.26 : 0.5 });
			// Chunks of ore tossed back into the robot's hopper.
			if (!crystal && Math.random() < dt * 2.5 * density) {
				const hx = m.e.x - m.dx * 5,
					hy = m.e.y - m.dy * 5,
					t = 0.55;
				smoke.spawn({ x: m.x, y: y + 2, z: m.y, vx: (hx - m.x) / t, vy: 22 + 260 * t * 0.5, vz: (hy - m.y) / t, lift: -260, life: 0, max: t, s0: 2.6, s1: 2.2, r: 0.3, g: 0.32, b: 0.33, a: 1, style: 1 });
			}
		}
		// Motes over the deposits near the view: silver flecks and a little dust over ore, golden sparkles
		// rising over crystals (brighter at night); thinner as a field runs out.
		const near = (o) => Math.abs(o.x - focus.x) < span / 2 + 60 && Math.abs(o.y - focus.y) < span / 2 + 60;
		const seen = (o) => visible(o.x, o.y) && game.explored[game.visionIndex(o.x, o.y)];
		for (const o of game.ores || []) {
			if (!o.amount || !near(o) || !seen(o)) continue;
			const rich = Math.min(1, o.amount / 3000),
				ground = heightAt(o.x, o.y);
			for (let n = due(moteOwed, o, 3 * rich, dt); n-- > 0; )
				fire.spawn({ x: o.x + rand(-30, 30), y: ground + rand(4, 16), z: o.y + rand(-30, 30), vx: rand(-2, 2), vy: rand(3, 8), vz: rand(-2, 2), life: 0, max: rand(1.4, 2.4), s0: rand(1, 1.8), s1: 0.4, r: 0.85, g: 0.9, b: 0.95, a: 0.7 * (0.5 + nightNow * 0.5) });
			for (let n = due(mineOwed, o, 0.8 * rich, dt); n-- > 0; )
				smoke.spawn({ x: o.x + rand(-25, 25), y: ground + 2, z: o.y + rand(-25, 25), vx: rand(-3, 3), vy: rand(2, 5), vz: rand(-3, 3), life: 0, max: rand(2, 3.2), s0: 6, s1: 20, r: 0.55, g: 0.52, b: 0.48, a: 0.12 });
		}
		for (const o of game.crystalFields || []) {
			if (!o.amount || !near(o) || !seen(o)) continue;
			const rich = Math.min(1, o.amount / 1200),
				ground = heightAt(o.x, o.y);
			for (let n = due(moteOwed, o, 6 * rich, dt); n-- > 0; )
				fire.spawn({ x: o.x + rand(-26, 26), y: ground + rand(6, 34), z: o.y + rand(-26, 26), vx: rand(-3, 3), vy: rand(6, 14), vz: rand(-3, 3), drag: 0.3, life: 0, max: rand(1.6, 2.8), s0: rand(1.2, 2.4), s1: 0.3, r: 1, g: rand(0.82, 0.92), b: rand(0.45, 0.62), a: 0.75 + nightNow * 0.25 });
		}
	}
	let nightNow = 0,
		clockNow = 0;

	// ---------- shots: muzzle flashes, rocket trails, impact sparks ----------
	function shotFx(what, x, y, z, rocket, opts = {}) {
		if (what === "splash") {
			// Droplets thrown up and out, and a little white water.
			for (let i = 0; i < Math.ceil(12 * density); i++) {
				const a = rand(0, TAU),
					sp = rand(8, 26);
				smoke.spawn({ x, y, z, vx: Math.cos(a) * sp, vy: rand(20, 45), vz: Math.sin(a) * sp, lift: -160, life: 0, max: rand(0.4, 0.7), s0: rand(0.9, 1.6), s1: 0.6, r: 0.88, g: 0.94, b: 0.98, a: 0.9, style: 1 });
			}
			smoke.spawn({ x, y: y + 1, z, vx: 0, vy: 3, vz: 0, life: 0, max: 0.6, s0: 4, s1: 12, r: 0.92, g: 0.96, b: 1, a: 0.5 });
			return;
		}
		if (what === "muzzle") {
			// A star of flame at the muzzle and a little puff of smoke after it.
			fire.spawn({ x, y, z, vx: 0, vy: 0, vz: 0, life: 0, max: 0.09, s0: rocket ? 18 : 12, s1: 5, r: 1, g: 0.85, b: 0.5, a: 1, style: 2 });
			smoke.spawn({ x, y, z, vx: rand(-3, 3), vy: rand(4, 9), vz: rand(-3, 3), drag: 1, life: 0, max: rand(0.6, 1), s0: 3, s1: rocket ? 14 : 9, r: 0.55, g: 0.54, b: 0.52, a: 0.35 });
			return;
		}
		if (what === "trail") {
			smoke.spawn({ x, y, z, vx: rand(-3, 3), vy: rand(4, 10), vz: rand(-3, 3), life: 0, max: rand(0.8, 1.4), s0: 4, s1: 20, r: 0.66, g: 0.64, b: 0.62, a: 0.5 });
			fire.spawn({ x, y, z, vx: 0, vy: 0, vz: 0, life: 0, max: 0.06, s0: 6, s1: 3, r: 1, g: 0.7, b: 0.35, a: 0.9 });
			return;
		}
		if (what === "hull") {
			// A shot through a ship's dropped shield (0.144.1): a white-hot flash on the hull, a spray of sparks
			// back towards the shooter, flakes of plating tumbling away, a glowing scorch cooling for a moment,
			// and a flash of light round it.
			const dx = opts.dx || 0,
				dz = opts.dz || 0;
			fire.spawn({ x, y, z, vx: 0, vy: 0, vz: 0, lift: 0, life: 0, max: 0.1, s0: rocket ? 18 : 10, s1: 4, r: 1, g: 0.95, b: 0.8, a: 1, style: 2 });
			for (let i = 0; i < Math.ceil((rocket ? 18 : 10) * density); i++) {
				const ax = dx + rand(-0.7, 0.7),
					ay = rand(-0.6, 0.6),
					az = dz + rand(-0.7, 0.7),
					l = Math.hypot(ax, ay, az) || 1,
					sp = rand(60, 160);
				fire.spawn({ x, y, z, vx: (ax / l) * sp, vy: (ay / l) * sp, vz: (az / l) * sp, lift: 0, drag: 0.6, life: 0, max: rand(0.2, 0.5), s0: rand(1.4, 2.6), s1: 0.4, r: 1, g: rand(0.75, 0.95), b: rand(0.45, 0.7), a: 1 });
			}
			for (let i = 0; i < (rocket ? 5 : 3); i++) {
				const sp = rand(15, 45),
					c = rand(0.28, 0.4);
				smoke.spawn({ x, y, z, vx: (dx + rand(-1, 1)) * sp, vy: rand(-12, 12), vz: (dz + rand(-1, 1)) * sp, lift: 0, drag: 0.1, life: 0, max: rand(1.2, 2.2), s0: rand(1.4, 2.4), s1: rand(1, 1.6), r: c, g: c * 1.02, b: c * 1.1, a: 1, style: 1 });
			}
			fire.spawn({ x, y, z, vx: 0, vy: 0, vz: 0, lift: 0, life: 0, max: rocket ? 1.1 : 0.7, s0: rocket ? 7 : 4.5, s1: 1.5, r: 1, g: 0.45, b: 0.12, a: 0.85, style: 2 });
			sparkLights.push({ x, y: z, h: y, t: clockNow });
			return;
		}
		// An impact: a flash, sparks flying off, a kick of dust (on the ground); a rocket blows up in a small
		// ball of fire and smoke.
		const air = opts.air,
			dust = SOIL[biomeNow] || SOIL.dust;
		fire.spawn({ x, y, z, vx: 0, vy: 0, vz: 0, life: 0, max: rocket ? 0.14 : 0.08, s0: rocket ? 16 : 7, s1: 3, r: 1, g: 0.9, b: 0.65, a: 1, style: 2 });
		for (let i = 0; i < (rocket ? 14 : 7); i++) {
			const a = rand(0, TAU),
				sp = rand(30, rocket ? 130 : 80);
			fire.spawn({ x, y, z, vx: Math.cos(a) * sp, vy: rand(air ? -40 : 30, 100), vz: Math.sin(a) * sp, lift: -260, life: 0, max: rand(0.15, 0.4), s0: rand(1.8, 3.6), s1: 0.6, r: 1, g: rand(0.72, 0.95), b: 0.45, a: 1 });
		}
		if (!air)
			for (let i = 0; i < (rocket ? 5 : 2); i++)
				smoke.spawn({ x: x + rand(-3, 3), y: y - 6, z: z + rand(-3, 3), vx: rand(-12, 12), vy: rand(10, 26), vz: rand(-12, 12), drag: 1.5, life: 0, max: rand(0.7, 1.3), s0: rocket ? 7 : 4, s1: rocket ? 22 : 12, r: dust[0], g: dust[1], b: dust[2], a: 0.5 });
		if (rocket) {
			for (let i = 0; i < 5; i++) fire.spawn({ x: x + rand(-4, 4), y: y + rand(-2, 4), z: z + rand(-4, 4), vx: rand(-8, 8), vy: rand(10, 30), vz: rand(-8, 8), life: 0, max: rand(0.3, 0.5), s0: rand(8, 12), s1: 3, r: 1, g: 1, b: 1, a: 0.6, style: 1 });
			smoke.spawn({ x, y: y + 4, z, vx: rand(-4, 4), vy: rand(14, 24), vz: rand(-4, 4), drag: 0.4, life: 0, max: rand(1.4, 2.2), s0: 8, s1: 28, r: 0.26, g: 0.24, b: 0.23, a: 0.5 });
		}
	}
	// Dust kicked up by impacts, by biome.
	const SOIL = { dust: [0.62, 0.52, 0.4], ash: [0.33, 0.3, 0.28], ice: [0.86, 0.9, 0.95] };
	let biomeNow = "dust";

	// The flat water (lakes, crevasses) nearest the point: its level, or null.
	function waterLevelNear(point, span) {
		let best = null,
			bestD = Infinity;
		for (const w of waters) {
			if (w.kind !== "lake" && w.kind !== "crevasse") continue;
			const box = w.box;
			if (!box) continue;
			const d = Math.hypot(Math.max(box.x0 - point.x, 0, point.x - box.x1), Math.max(box.y0 - point.y, 0, point.y - box.y1));
			if (d < span && d < bestD) {
				bestD = d;
				best = box.level;
			}
		}
		return best;
	}
	return {
		water: { group: waterGroup, uniforms: waterUniforms, levelNear: waterLevelNear },
		// The height map of the ground (texture and size), for effects draped over it.
		ground: weather3d.ground,
		setGame(game, heights) {
			if (heights) weather3d.setTerrain(heights);
			weather3d.reset();
			buildWater(game);
			smoke.clear();
			fire.clear();
			theme = RTS.MISSIONS[game.missionId]?.theme || null;
			biomeNow = RTS.MISSIONS[game.missionId]?.biome || "dust";
			findGlow(game);
			byKind = { lava: [], chasm: [], glow: [] };
			for (const w of game.waters || []) byKind[w.kind]?.push(w);
		},
		shot: shotFx,
		// One frame: returns the weather state for the renderer (haze, lightning flash).
		update(dt, { game, time, night, focus, span, hidden, scale, light, gasFlow, working, sky, mistLevel, sun, quality = {} }) {
			density = quality.particles ?? 1;
			waterUniforms.waterTime.value = time;
			waterUniforms.glowPool.value = 0.55 + night * 0.65;
			waterUniforms.waterRain.value = weatherNow.kind === "rain" ? weatherNow.intensity || 0 : 0;
			if (sky) waterUniforms.waterSky.value.copy(sky);
			if (sun) {
				waterUniforms.waterSunDir.value.copy(sun.dir);
				waterUniforms.waterSun.value.copy(sun.color).multiplyScalar(Math.min(1, sun.intensity / 2.4));
			}
			for (const w of waters) {
				const m = w.mesh.material;
				if (m.normalMap) m.normalMap.offset.set(time * 0.012, time * 0.007);
				if (w.kind === "lava") {
					m.emissiveMap.offset.set(time * 0.01, -time * 0.006);
					m.emissiveIntensity = 1.2 + Math.sin(time * 1.7) * 0.2;
				}
				if (w.kind === "glow") m.emissiveIntensity = 0.1 + night * 0.25;
			}
			waterGroup.visible = quality.water !== false;
			nightNow = night;
			clockNow = time;
			findMiners(game, hidden, focus, span, working);
			nightLights(game, quality.lights === false ? 0 : night, hidden, focus, span);
			airTrails(game, dt, hidden, focus, span);
			if (quality.scars !== false) vehicleDust(game, dt, hidden, focus, span);
			damageAndExplosions(game, dt, hidden, quality.scars !== false);
			updateBurners(dt);
			mapEffects(game, dt, focus, span, night, (x, y) => !hidden({ x, y, team: -1 }), gasFlow);
			miningFx(game, dt, focus, span, (x, y) => !hidden({ x, y, team: -1 }));
			for (const sys of [smoke, fire]) sys.material.uniforms.scale.value = scale;
			fire.material.uniforms.time.value = time;
			smoke.material.uniforms.light.value = light;
			const n = smoke.update(dt) + fire.update(dt);
			const state = weather3d.update(game, time, dt, { focus, span, density, flashes: quality.flashes !== false, mist: Math.max(night * 0.3, mistLevel || 0), mistTint: sky });
			// Where the lightning strikes: sparks and a puff of smoke.
			if (state.strike) {
				const { x, y, ground } = state.strike;
				for (let i = 0; i < 4; i++) shotFx("impact", x + rand(-10, 10), ground + 2, y + rand(-10, 10), true);
				for (let i = 0; i < 6; i++) smoke.spawn({ x: x + rand(-12, 12), y: ground + 4, z: y + rand(-12, 12), vx: rand(-8, 8), vy: rand(10, 25), vz: rand(-8, 8), life: 0, max: rand(1.5, 2.5), s0: 10, s1: 34, r: 0.35, g: 0.35, b: 0.38, a: 0.5 });
			}
			state.particles = n;
			weatherNow = state;
			return state;
		},
	};
}
