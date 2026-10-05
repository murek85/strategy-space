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
		glow: () => new THREE.MeshStandardMaterial({ color: "#1f8f9c", emissive: "#23a9b8", emissiveIntensity: 0.3, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.78, normalMap: ripples, normalScale: new THREE.Vector2(0.4, 0.4) }),
		lava: () => new THREE.MeshStandardMaterial({ color: "#2a0d06", emissive: "#ffffff", emissiveMap: cracks, emissiveIntensity: 1.3, roughness: 0.85, metalness: 0 }),
	};
	// The look of open water (lakes, crevasses, glowing pools; not lava), on top of the fog-of-war shader:
	// small waves, a second ripple layer against tiling, the sky reflected at grazing angles (fresnel),
	// lighter shallows towards the shore (the shore fade is the depth), foam along the shore line, and
	// rings from the drops while it rains.
	const waterUniforms = { waterTime: { value: 0 }, waterRain: { value: 0 }, waterSky: { value: new THREE.Color("#8fa6b4") } };
	const WATER_COMMON = `
		uniform float waterTime; uniform float waterRain; uniform vec3 waterSky;
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
				s += smoothstep(0.8, 0.0, abs(d - ph * 5.0)) * (1.0 - ph);
			}
			return s;
		}`;
	function waterLook(material) {
		const before = material.onBeforeCompile;
		material.onBeforeCompile = (shader, renderer) => {
			before?.call(material, shader, renderer);
			Object.assign(shader.uniforms, waterUniforms);
			shader.vertexShader = shader.vertexShader
				.replace("#include <common>", "#include <common>\nuniform float waterTime;")
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
					outgoingLight = mix(outgoingLight, waterSky * 1.1, fres * 0.55);
					outgoingLight = mix(outgoingLight * vec3(1.15, 1.22, 1.05) + vec3(0.04, 0.06, 0.04), outgoingLight, smoothstep(0.0, 0.8, depthK));
					float foamNoise = wvNoise(vMapXY * 0.21 + vec2(waterTime * 0.35, -waterTime * 0.25)) * 0.6 + wvNoise(vMapXY * 0.53 - vec2(waterTime * 0.2, 0.0)) * 0.4;
					float foam = smoothstep(0.04, 0.16, depthK) * (1.0 - smoothstep(0.2, 0.42, depthK)) * smoothstep(0.42, 0.8, foamNoise);
					outgoingLight += vec3(0.85, 0.9, 0.92) * foam * 0.35;
					diffuseColor.a = max(diffuseColor.a, foam * 0.55);
					outgoingLight += vec3(0.8, 0.86, 0.92) * waterRain * wvRings(vMapXY, waterTime) * 0.4;
					#include <opaque_fragment>`,
				);
		};
		material.customProgramCacheKey = () => "water";
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
		const level = (kind === "lake" || kind === "crevasse") && rimHigh - rimLow < 8 ? rimHigh + 0.6 : null;
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
			const material = kind === "lava" ? fogged(WATER[kind]()) : waterLook(fogged(WATER[kind]()));
			// Per-vertex opacity fades the shore.
			Object.assign(material, { vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
			const mesh = new THREE.Mesh(waterMesh(cells, kind), material);
			mesh.receiveShadow = kind !== "lava";
			mesh.renderOrder = 1;
			waterGroup.add(mesh);
			waters.push({ mesh, kind });
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
			else if (w.kind === "lava") glowSpots.push({ x: w.x, y: w.y, r: Math.max(w.rx, w.ry) * 2.4, color: "#ff6a2a", day: 0.12, night: 0.42 });
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
		// Explosions light the ground and the models around them for a moment, by day too.
		for (const ef of game.effects) {
			if (ef.kind !== "explosion" || hidden({ x: ef.x, y: ef.y, team: -1 })) continue;
			const k = 1 - ef.life / ef.maxLife,
				f = Math.max(0, 1 - k / 0.55),
				size = ef.size || 40;
			if (f > 0) lights.point(ef.x, ef.y, heightAt(ef.x, ef.y) + (ef.air ? 90 : size * 0.4), { color: "#ffb35c", power: f * f * size * (25 + night * 15), range: size * 5 + 80 });
		}
		lights.end(focus, span, true);
		pools.visible = pools.count > 0;
		pools.instanceMatrix.needsUpdate = true;
		pools.instanceColor.needsUpdate = true;
	}
	// Engine trails of aircraft in the air: a short glowing streak at the nozzle and a pale vapour trail
	// thinning out behind (only flying units that move, near the view).
	const lastAir = new Map();
	function airTrails(game, dt, hidden, focus, span) {
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
	function particleSystem(max, additive) {
		const geometry = new THREE.BufferGeometry(),
			positions = new Float32Array(max * 3),
			sizes = new Float32Array(max),
			colors = new Float32Array(max * 4);
		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
		geometry.setAttribute("rgba", new THREE.BufferAttribute(colors, 4));
		const material = new THREE.ShaderMaterial({
			uniforms: { map: { value: softDot }, scale: { value: 500 }, light: { value: 1 } },
			vertexShader: `attribute float size; attribute vec4 rgba; varying vec4 vC; uniform float scale;
				void main() { vC = rgba; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
			fragmentShader: `uniform sampler2D map; uniform float light; varying vec4 vC;
				void main() { float a = texture2D(map, gl_PointCoord).a * vC.a; if (a < 0.01) discard; gl_FragColor = vec4(vC.rgb * light, a); }`,
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
					n++;
				}
				geometry.setDrawRange(0, n);
				// Upload only the live part of each buffer.
				for (const name of ["position", "size", "rgba"]) {
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
	let emitClock = 0;
	function damageAndExplosions(game, dt, hidden, scars = true) {
		emitClock += dt;
		// Emitters run 10 times a second; each spawn carries its own randomness.
		if (emitClock >= 0.1 && scars) {
			emitClock = 0;
			for (const e of game.entities) {
				if (e.hp <= 0 || e.constructionLeft > 0 || hidden(e)) continue;
				const s = TYPES[e.type];
				if (!s || s.flying || e.team === 2) continue;
				const f = e.hp / e.maxHp,
					building = !s.speed,
					vehicle = s.speed && s.radius >= 16;
				if (!(building ? f < 0.5 : vehicle && f < 0.35)) continue;
				const ground = heightAt(e.x, e.y),
					top = building ? Math.min(60, s.radius * 0.8) : 18;
				if (Math.random() < (building ? 0.8 : 0.45) * density)
					smoke.spawn({ x: e.x + rand(-s.radius, s.radius) * 0.4, y: ground + top, z: e.y + rand(-s.radius, s.radius) * 0.4, vx: rand(4, 14), vy: rand(18, 32), vz: rand(-4, 4), life: 0, max: rand(2.5, 4.2), s0: s.radius * 0.6, s1: s.radius * 2.6, r: 0.42, g: 0.41, b: 0.4, a: 0.5 });
				if (f < (building ? 0.3 : 0.2) && Math.random() < 0.9 * density)
					fire.spawn({ x: e.x + rand(-s.radius, s.radius) * 0.35, y: ground + top * 0.8, z: e.y + rand(-s.radius, s.radius) * 0.35, vx: rand(-3, 3), vy: rand(20, 40), vz: rand(-3, 3), life: 0, max: rand(0.4, 0.8), s0: s.radius * 0.45, s1: s.radius * 0.1, r: 1, g: rand(0.45, 0.65), b: 0.15, a: 0.9 });
			}
		}
		for (const ef of game.effects) {
			if (ef.kind !== "explosion" || seenExplosions.has(ef)) continue;
			seenExplosions.add(ef);
			if (hidden({ x: ef.x, y: ef.y, team: -1 })) continue;
			const size = ef.size || 40,
				scale = size / 50,
				ground = heightAt(ef.x, ef.y),
				y = ground + (ef.air ? 90 : 8),
				n = (count) => Math.ceil(count * density * Math.min(1.6, 0.6 + scale * 0.5));
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
				smoke.spawn({ x: ef.x, y, z: ef.y, vx: Math.cos(a) * sp, vy: rand(ef.air ? -20 : 90, 220), vz: Math.sin(a) * sp, lift: -420, life: 0, max: rand(0.8, 1.4), s0: rand(2, 4) * Math.max(1, scale), s1: rand(1.5, 3), r: c, g: c * 0.95, b: c * 0.9, a: 1 });
			}
			// The smoke column: dark puffs welling up one after another, growing.
			for (let i = 0; i < n(12); i++)
				smoke.spawn({ x: ef.x + rand(-size, size) * 0.2, y: y + rand(0, size * 0.4), z: ef.y + rand(-size, size) * 0.2, vx: rand(-8, 8), vy: rand(18, 45), vz: rand(-8, 8), drag: 0.6, life: -rand(0.05, 0.7), max: rand(2.4, 4.4), s0: size * 0.45, s1: size * rand(1.6, 2.3), r: 0.2, g: 0.19, b: 0.18, a: 0.62 });
			// Dust thrown out along the ground (not in the air).
			if (!ef.air)
				for (let i = 0; i < n(12); i++) {
					const a = (i / n(12)) * TAU + rand(-0.2, 0.2),
						sp = rand(70, 130) * scale;
					smoke.spawn({ x: ef.x + Math.cos(a) * size * 0.2, y: ground + 4, z: ef.y + Math.sin(a) * size * 0.2, vx: Math.cos(a) * sp, vy: rand(3, 10), vz: Math.sin(a) * sp, drag: 2.2, life: 0, max: rand(1.1, 1.8), s0: size * 0.25, s1: size * 0.9, r: 0.56, g: 0.49, b: 0.4, a: 0.42 });
				}
		}
	}

	// ---------- map effects (MapArt.effects in 2D), around the camera focus ----------
	// Lumeria: glowing spores drifting over the ground, brighter at night. Pyrrhos: embers rising from the
	// lava. Aerion: mist welling up from the chasms.
	let byKind = {},
		theme = null;
	const owed = { spores: 0, embers: 0, mist: 0 },
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

	// ---------- shots: muzzle flashes, rocket trails, impact sparks ----------
	function shotFx(what, x, y, z, rocket) {
		if (what === "muzzle") fire.spawn({ x, y, z, vx: 0, vy: 0, vz: 0, life: 0, max: 0.08, s0: rocket ? 16 : 11, s1: 4, r: 1, g: 0.85, b: 0.5, a: 1 });
		else if (what === "trail") smoke.spawn({ x, y, z, vx: rand(-3, 3), vy: rand(4, 10), vz: rand(-3, 3), life: 0, max: rand(0.6, 1), s0: 5, s1: 18, r: 0.62, g: 0.6, b: 0.58, a: 0.45 });
		else
			for (let i = 0; i < (rocket ? 10 : 4); i++) {
				const a = rand(0, TAU),
					sp = rand(30, rocket ? 120 : 70);
				fire.spawn({ x, y, z, vx: Math.cos(a) * sp, vy: rand(20, 90), vz: Math.sin(a) * sp, lift: -240, life: 0, max: rand(0.15, 0.35), s0: rand(2.5, 5), s1: 1, r: 1, g: rand(0.7, 0.95), b: 0.45, a: 1 });
			}
	}

	return {
		setGame(game, heights) {
			if (heights) weather3d.setTerrain(heights);
			weather3d.reset();
			buildWater(game);
			smoke.clear();
			fire.clear();
			theme = RTS.MISSIONS[game.missionId]?.theme || null;
			findGlow(game);
			byKind = { lava: [], chasm: [], glow: [] };
			for (const w of game.waters || []) byKind[w.kind]?.push(w);
		},
		shot: shotFx,
		// One frame: returns the weather state for the renderer (haze, lightning flash).
		update(dt, { game, time, night, focus, span, hidden, scale, light, gasFlow, sky, quality = {} }) {
			density = quality.particles ?? 1;
			waterUniforms.waterTime.value = time;
			waterUniforms.waterRain.value = weatherNow.kind === "rain" ? weatherNow.intensity || 0 : 0;
			if (sky) waterUniforms.waterSky.value.copy(sky);
			for (const w of waters) {
				const m = w.mesh.material;
				if (m.normalMap) m.normalMap.offset.set(time * 0.012, time * 0.007);
				if (w.kind === "lava") {
					m.emissiveMap.offset.set(time * 0.01, -time * 0.006);
					m.emissiveIntensity = 1.2 + Math.sin(time * 1.7) * 0.2;
				}
				if (w.kind === "glow") m.emissiveIntensity = 0.25 + night * 0.4;
			}
			waterGroup.visible = quality.water !== false;
			nightLights(game, quality.lights === false ? 0 : night, hidden, focus, span);
			airTrails(game, dt, hidden, focus, span);
			damageAndExplosions(game, dt, hidden, quality.scars !== false);
			mapEffects(game, dt, focus, span, night, (x, y) => !hidden({ x, y, team: -1 }), gasFlow);
			for (const sys of [smoke, fire]) sys.material.uniforms.scale.value = scale;
			smoke.material.uniforms.light.value = light;
			const n = smoke.update(dt) + fire.update(dt);
			const state = weather3d.update(game, time, dt, { focus, span, density, flashes: quality.flashes !== false, mist: night * 0.3, mistTint: sky });
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
