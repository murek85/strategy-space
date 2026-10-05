/* 3D renderer prototype (Three.js). Visual only: the simulation, orders and saves stay 2D (x, y on the
   map); the renderer places them in 3D with X = x, Z = y and Y = terrain height.
   - Terrain: a mesh from the height map (webgl/terrain-height.js), textured with the board ground painted
     by the Canvas renderer (terrain, deposits, relays) in tiles; a tile is repainted when its deposits,
     relays, wrecks or craters change.
   - Models: code-built low-poly 3D models (webgl3d/models-3d.js) for the types that have one.
   - Other buildings: a plinth box under a roof painted by the same art code as the board (model-light paint()).
   - Other units: the board painting laid flat on the ground as a decal, turned with the unit; aircraft float.
   - Fog of war: the terrain shader darkens what is out of sight (smoothed vision grid); other sides'
     models there are hidden.
   - Sun and moon: one directional light with a shadow map following the camera; day cycle; weather haze
     and lightning (webgl3d/scene-fx-3d.js, with water, night lights, smoke and fire).
   - Outskirts: land past the map edge in the ground's mean colour.
   - Scenery: wildlife, birds, fish, floating islands and wrecks (webgl3d/scene-life-3d.js); ground
     scatter: stones, grass, drifts, shards, small mushrooms (webgl3d/scatter-3d.js).
   - Terrain relief: the height map plus seeded rolling noise, normals and slope/hollow shading from the
     whole map (no tile seams), a tiling normal map of the biome's surface (sand ripples, ash grain, ice).
   - Objectives: shield domes, orbital strike columns, the artifact, the Peak, mission markers
     (webgl3d/objectives-3d.js).
   - Picking: screenToMap() casts a ray from the screen onto the terrain, mapToScreen() projects a map point.
   - Instancing: model parts are drawn as one InstancedMesh per geometry and material.
   - Interface overlay: setOverlay() drapes a flat-frame Canvas layer over the terrain (the game UI). */
import { createModels3D } from "./models-3d.js";
import { createSceneFx3D } from "./scene-fx-3d.js";
import { createSceneLife3D } from "./scene-life-3d.js";
import { createScatter3D } from "./scatter-3d.js";
import { createObjectives3D } from "./objectives-3d.js";
import { createMarks3D } from "./marks-3d.js";
import { createSky3D, cloudShade } from "./sky-3d.js";
import { nightLightShade } from "./night-lights-3d.js";

export function createThreeRenderer(THREE, host, { canvasRenderer }) {
	const { TYPES } = RTS;
	// models: code-built 3D models where they exist (else the painted decals); fog: fog of war.
	const options = { models: true, fog: true };
	const working = new Set(),
		models3d = createModels3D(THREE),
		COLORS_ART = ["#9ae5cb", "#ed8277"];
	const RISE = 70,
		GROUND_EVERY = 0.5,
		TILE = 60,
		TAU = Math.PI * 2;

	// The ground is painted bare: rocks, plants and pebbles are 3D here (render-canvas.js setBareGround).
	canvasRenderer.setBareGround?.(true);
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	host.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color("#0b141c");
	scene.fog = new THREE.Fog("#0b141c", 2200, 5200);
	const camera = new THREE.PerspectiveCamera(38, 1, 10, 9000);
	// Camera rig: looks at a map point from a fixed pitch; yaw turns around it.
	const rig = { x: 0, y: 0, distance: 1100, pitch: 0.95, yaw: 0 };

	const hemi = new THREE.HemisphereLight("#bcd4e6", "#3a3226", 0.9),
		sun = new THREE.DirectionalLight("#fff1d6", 2.2);
	sun.castShadow = true;
	sun.shadow.mapSize.set(4096, 4096);
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 1.5;
	Object.assign(sun.shadow.camera, { left: -1100, right: 1100, top: 1100, bottom: -1100, near: 10, far: 6000 });
	scene.add(hemi, sun, sun.target);
	// The sky dome (sun, moon, stars, clouds) and the cloud shadows (webgl3d/sky-3d.js).
	const sky = createSky3D(THREE);
	scene.add(sky.mesh);

	const world = new THREE.Group(),
		terrain = new THREE.Group();
	world.add(terrain);
	scene.add(world);
	let game = null,
		heights = null,
		tiles = [],
		groundClock = GROUND_EVERY,
		timeOfDay = null,
		clock = 0;
	const terrainHeight = createTerrainHeight();
	// Water, night lights, weather and particles (webgl3d/scene-fx-3d.js).
	const fx = createSceneFx3D(THREE, { world, heightAt: (x, y) => heightAt(x, y), fogged: (m) => fogged(m) });
	// Stones, grass, drifts, shards and small mushrooms on the ground (webgl3d/scatter-3d.js).
	const scatter = createScatter3D(THREE, { world, heightAt: (x, y) => heightAt(x, y), fogged: (m) => fogged(m, true) });
	// Shield domes, orbital strikes, the artifact, the Peak and mission markers (webgl3d/objectives-3d.js).
	const objectives = createObjectives3D(THREE, { world, heightAt: (x, y) => heightAt(x, y) });
	let beacons = [];
	// Wall links, tracks, craters, habitats (webgl3d/marks-3d.js).
	const marks = createMarks3D(THREE, { world, heightAt: (x, y) => heightAt(x, y), fogged: (m) => fogged(m, true) });
	// Placement preview: translucent models of the building to place, green where it can stand, red where
	// it cannot (one per wall segment while a wall is dragged). The overlay keeps the footprint circle.
	const ghostOk = new THREE.MeshBasicMaterial({ color: "#aee5c7", transparent: true, opacity: 0.42, depthWrite: false }),
		ghostBad = new THREE.MeshBasicMaterial({ color: "#ef8178", transparent: true, opacity: 0.42, depthWrite: false }),
		ghosts = [];
	let placements = [];
	function syncGhosts() {
		const viewer = game.viewer ?? 0,
			faction = game.entities.find((e) => e.team === viewer && e.faction)?.faction;
		placements.forEach((pl, i) => {
			let g = ghosts[i];
			if (!g || g.type !== pl.type) {
				if (g) world.remove(g.root);
				const model = models3d.create({ id: 0, type: pl.type, team: viewer, faction, x: 0, y: 0, hp: 1, maxHp: 1, angle: 0 }, COLORS_ART),
					meshes = [];
				model.root.traverse((o) => o.isMesh && meshes.push(o));
				g = ghosts[i] = { type: pl.type, root: model.root, meshes, valid: null };
				g.root.renderOrder = 6;
				world.add(g.root);
			}
			if (g.valid !== pl.valid) {
				g.valid = pl.valid;
				for (const m of g.meshes) m.material = pl.valid ? ghostOk : ghostBad;
			}
			g.root.visible = true;
			g.root.position.set(pl.x, heightAt(pl.x, pl.y), pl.y);
		});
		for (let i = placements.length; i < ghosts.length; i++) ghosts[i].root.visible = false;
	}

	// Height in world units at a map point, bilinear between the height map cells.
	function heightAt(x, y) {
		if (!heights) return 0;
		const { cols, rows, cell, data } = heights,
			gx = Math.max(0, Math.min(cols - 1.001, x / cell)),
			gy = Math.max(0, Math.min(rows - 1.001, y / cell)),
			x0 = Math.floor(gx),
			y0 = Math.floor(gy),
			tx = gx - x0,
			ty = gy - y0,
			v = (i, j) => data[(y0 + j) * cols + x0 + i];
		return (v(0, 0) * (1 - tx) + v(1, 0) * tx) * (1 - ty) + (v(0, 1) * (1 - tx) + v(1, 1) * tx) * ty;
	}

	// Rolling relief over the whole map, from seeded value noise (visual only, like the height map: movement
	// and vision do not change): long swells and smaller bumps, a few units high, so even plains are not flat.
	function reliefNoise(seedText) {
		let seed = [...String(seedText)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 40503) >>> 0;
		const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296,
			octaves = [
				[620, 9],
				[230, 4.5],
				[70, 1.4],
			].map(([size, amp]) => ({ size, amp, grid: Array.from({ length: 64 * 64 }, rand) })),
			sm = (t) => t * t * (3 - 2 * t);
		return (x, y) => {
			let v = 0;
			for (const { size, amp, grid } of octaves) {
				const gx = x / size,
					gy = y / size,
					i = Math.floor(gx),
					j = Math.floor(gy),
					tx = sm(gx - i),
					ty = sm(gy - j),
					at = (a, b) => grid[((b & 63) << 6) | (a & 63)],
					top = at(i, j) + (at(i + 1, j) - at(i, j)) * tx,
					bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
				v += (top + (bottom - top) * ty - 0.5) * 2 * amp;
			}
			return v;
		};
	}
	// Fine surface texture of the biome as a tiling normal map (catches the low sun): wind ripples in sand,
	// grain in ash, smooth ice with cracks. One per biome, cached.
	const detailMaps = new Map();
	function detailNormals(biome) {
		if (detailMaps.has(biome)) return detailMaps.get(biome);
		const size = 256,
			h = new Float32Array(size * size);
		let seed = biome.length * 7919;
		const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296,
			noise = (cells) => {
				const grid = Array.from({ length: cells * cells }, rand),
					at = (a, b) => grid[((b + cells) % cells) * cells + ((a + cells) % cells)],
					sm = (t) => t * t * (3 - 2 * t);
				return (x, y) => {
					const gx = (x / size) * cells,
						gy = (y / size) * cells,
						i = Math.floor(gx),
						j = Math.floor(gy),
						tx = sm(gx - i),
						ty = sm(gy - j),
						top = at(i, j) + (at(i + 1, j) - at(i, j)) * tx,
						bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
					return top + (bottom - top) * ty;
				};
			},
			n1 = noise(8),
			n2 = noise(32),
			n3 = noise(64);
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) {
				const warp = n1(x, y) * 6;
				h[y * size + x] =
					biome === "dust"
						? Math.sin(((x + y * 0.35) / size) * Math.PI * 2 * 10 + warp * 1.6) * 0.3 * (0.4 + n1(x, y)) + n2(x, y) * 0.5 + n3(x, y) * 0.4
						: biome === "ice"
							? n1(x, y) * 0.4 + n2(x, y) * 0.25 - Math.max(0, 1 - Math.abs(n2(x, y) - 0.5) * 30) * 0.8
							: n2(x, y) * 0.7 + n3(x, y) * 0.6 + n1(x, y) * 0.3;
			}
		const data = new Uint8Array(size * size * 4),
			at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) {
				const dx = (at(x + 1, y) - at(x - 1, y)) * 3,
					dy = (at(x, y + 1) - at(x, y - 1)) * 3,
					l = Math.hypot(dx, dy, 1);
				data.set([(-dx / l) * 127.5 + 127.5, (-dy / l) * 127.5 + 127.5, (1 / l) * 127.5 + 127.5, 255], (y * size + x) * 4);
			}
		const t = new THREE.DataTexture(data, size, size);
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.minFilter = THREE.LinearMipmapLinearFilter;
		t.magFilter = THREE.LinearFilter;
		t.generateMipmaps = true;
		t.needsUpdate = true;
		detailMaps.set(biome, t);
		return t;
	}

	function buildTerrain() {
		terrainHeight.setGame(game);
		const cell = terrainHeight.cell,
			cols = Math.ceil(game.W / cell) + 1,
			rows = Math.ceil(game.H / cell) + 1,
			data = new Float32Array(cols * rows),
			relief = reliefNoise(game.missionId + ":" + game.W + "x" + game.H);
		const rolling = quality.relief ? relief : () => 0;
		for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) data[j * cols + i] = terrainHeight.heightAt(i * cell, j * cell) * RISE + rolling(i * cell, j * cell);
		heights = { cols, rows, cell, data };
		// Normals and shading from the whole height map (no seams between tiles): steep slopes and hollows
		// darker, crests a little lighter — the ground reads as relief under any light.
		const h = (i, j) => data[Math.max(0, Math.min(rows - 1, j)) * cols + Math.max(0, Math.min(cols - 1, i))],
			normals = new Float32Array(cols * rows * 3),
			shade = new Float32Array(cols * rows);
		for (let j = 0; j < rows; j++)
			for (let i = 0; i < cols; i++) {
				const dx = (h(i + 1, j) - h(i - 1, j)) / (2 * cell),
					dz = (h(i, j + 1) - h(i, j - 1)) / (2 * cell),
					l = Math.hypot(dx, 1, dz),
					k = j * cols + i;
				normals.set([-dx / l, 1 / l, -dz / l], k * 3);
				let around = 0;
				for (const [a, b] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) around += h(i + a, j + b);
				const cavity = around / 8 - data[k],
					slope = 1 - 1 / l;
				shade[k] = Math.max(0.55, Math.min(1.12, 1 - slope * 0.9 - Math.max(0, cavity) * 0.018 + Math.max(0, -cavity) * 0.008));
			}
		const biome = RTS.MISSIONS[game.missionId]?.biome || "dust",
			detail = detailNormals(biome);

		for (const t of tiles) {
			terrain.remove(t.mesh);
			t.mesh.geometry.dispose();
			t.mesh.material.normalMap?.dispose();
			t.mesh.material.dispose();
			t.texture.dispose();
		}
		tiles = [];
		// Tiles of TILE cells, each with its own full-resolution painting: a changed deposit repaints and
		// uploads one tile, not the whole map.
		const size = TILE * cell;
		for (let y0 = 0; y0 < game.H; y0 += size)
			for (let x0 = 0; x0 < game.W; x0 += size) {
				const w = Math.min(size, game.W - x0),
					h = Math.min(size, game.H - y0),
					geometry = new THREE.PlaneGeometry(w, h, Math.round(w / cell), Math.round(h / cell));
				geometry.rotateX(-Math.PI / 2);
				geometry.translate(x0 + w / 2, 0, y0 + h / 2);
				const pos = geometry.attributes.position,
					nrm = geometry.attributes.normal,
					colors = new Float32Array(pos.count * 3);
				for (let k = 0; k < pos.count; k++) {
					const i = Math.round(pos.getX(k) / cell),
						j = Math.round(pos.getZ(k) / cell),
						g = Math.min(rows - 1, j) * cols + Math.min(cols - 1, i);
					pos.setY(k, heightAt(pos.getX(k), pos.getZ(k)));
					nrm.setXYZ(k, normals[g * 3], normals[g * 3 + 1], normals[g * 3 + 2]);
					colors.fill(shade[g], k * 3, k * 3 + 3);
				}
				geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
				const canvas = document.createElement("canvas");
				canvas.width = w;
				canvas.height = h;
				const texture = new THREE.CanvasTexture(canvas);
				texture.colorSpace = THREE.SRGBColorSpace;
				texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
				const normalMap = quality.relief ? detail.clone() : null;
				if (normalMap) {
					normalMap.repeat.set(w / 110, h / 110);
					normalMap.needsUpdate = true;
				}
				const mesh = new THREE.Mesh(
					geometry,
					fogged(new THREE.MeshStandardMaterial({ map: texture, vertexColors: true, normalMap, normalScale: new THREE.Vector2(biome === "ice" ? 0.4 : 0.45, biome === "ice" ? 0.4 : 0.45), roughness: biome === "ice" ? 0.55 : 0.95, metalness: 0 }), true, true),
				);
				mesh.receiveShadow = true;
				terrain.add(mesh);
				const tile = { x0, y0, w, h, canvas, texture, mesh, signature: null };
				tiles.push(tile);
				paintTile(tile);
				tile.signature = signature(tile);
			}
		buildOutskirts();
	}

	// Land around the map, in the mean colour of the map's ground, a little lower than its edges: the
	// camera never looks into the void past the edge, and the distance haze swallows it.
	let outskirts = null;
	function buildOutskirts() {
		if (outskirts) {
			world.remove(outskirts);
			outskirts.geometry.dispose();
			outskirts.material.dispose();
		}
		const probe = document.createElement("canvas");
		probe.width = probe.height = 1;
		const c = probe.getContext("2d", { willReadFrequently: true }),
			sum = [0, 0, 0];
		for (const t of tiles) {
			c.drawImage(t.canvas, 0, 0, 1, 1);
			c.getImageData(0, 0, 1, 1).data.slice(0, 3).forEach((v, i) => (sum[i] += v / tiles.length));
		}
		const [r, g, b] = sum.map(Math.round);
		let low = Infinity;
		for (let x = 0; x <= game.W; x += 48) low = Math.min(low, heightAt(x, 0), heightAt(x, game.H));
		for (let y = 0; y <= game.H; y += 48) low = Math.min(low, heightAt(0, y), heightAt(game.W, y));
		const size = Math.max(game.W, game.H) * 8,
			geometry = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
		outskirts = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${r},${g},${b})`).multiplyScalar(0.7), roughness: 1, metalness: 0 }));
		outskirts.position.set(game.W / 2, low - 3, game.H / 2);
		outskirts.receiveShadow = true;
		world.add(outskirts);
	}

	// Fog of war on the ground: visible 255, explored 110, unknown 25, smoothed (see refreshFog); the
	// terrain shader darkens and desaturates by it.
	const fogUniforms = { fogMap: { value: null }, fogSize: { value: new THREE.Vector2(1, 1) }, fogOn: { value: 1 } },
		groundWeather = { wetness: { value: 0 }, snowCover: { value: 0 }, rainLevel: { value: 0 }, weatherTime: { value: 0 }, skyTint: { value: new THREE.Color() } };
	// The vision grid is upsampled FOG_UP times and box-blurred twice, so the edge of sight is a soft
	// curve instead of 40-unit steps.
	const FOG_UP = 3;
	let fogData = null,
		fogGrid = null,
		fogTmp = null,
		fogClock = 0;
	function buildFog() {
		const cols = (game.W / RTS.CELL) * FOG_UP,
			rows = (game.H / RTS.CELL) * FOG_UP;
		fogData = new Uint8Array(cols * rows * 4).fill(255);
		fogGrid = new Float32Array(cols * rows);
		fogTmp = new Float32Array(cols * rows);
		fogUniforms.fogMap.value?.dispose();
		const t = new THREE.DataTexture(fogData, cols, rows);
		t.magFilter = t.minFilter = THREE.LinearFilter;
		fogUniforms.fogMap.value = t;
		fogUniforms.fogSize.value.set(game.W, game.H);
		refreshFog();
	}
	function blurPass(src, dst, cols, rows, r, horizontal) {
		const n = horizontal ? cols : rows,
			lines = horizontal ? rows : cols,
			at = horizontal ? (line, i) => line * cols + i : (line, i) => i * cols + line;
		for (let line = 0; line < lines; line++) {
			let sum = 0;
			for (let i = -r; i <= r; i++) sum += src[at(line, Math.max(0, Math.min(n - 1, i)))];
			for (let i = 0; i < n; i++) {
				dst[at(line, i)] = sum / (2 * r + 1);
				sum += src[at(line, Math.min(n - 1, i + r + 1))] - src[at(line, Math.max(0, i - r))];
			}
		}
	}
	function refreshFog() {
		const cols = game.W / RTS.CELL,
			fine = cols * FOG_UP,
			rows = (game.H / RTS.CELL) * FOG_UP;
		for (let y = 0; y < rows; y++)
			for (let x = 0; x < fine; x++) {
				const i = Math.floor(y / FOG_UP) * cols + Math.floor(x / FOG_UP);
				fogGrid[y * fine + x] = game.visible[i] ? 255 : game.explored[i] ? 110 : 25;
			}
		for (let pass = 0; pass < 2; pass++) {
			blurPass(fogGrid, fogTmp, fine, rows, 2, true);
			blurPass(fogTmp, fogGrid, fine, rows, 2, false);
		}
		for (let i = 0; i < fogGrid.length; i++) fogData[i * 4] = fogGrid[i];
		fogUniforms.fogMap.value.needsUpdate = true;
	}
	// Interface on the board (placement preview, rally lines, markers) painted on a flat frame and draped
	// over the terrain after the fog, so it stays readable.
	const overlayUniforms = {
		overlayMap: { value: null },
		overlayOn: { value: 0 },
		overlayFrame: { value: new THREE.Vector4() },
		overlaySize: { value: new THREE.Vector2(1, 1) },
	};
	// ground = true: also wet in rain (darker, glossy) and white under settling snow on upward faces
	// (the terrain and the scattered stones and plants; weather-3d.js sets the amounts). Snow settles in
	// patches first (noise), then covers everything, and glints. terrain = true (the terrain only): puddles
	// gather in the rain on level ground — dark, mirror-smooth, reflecting the sky, with rings from the
	// drops while it rains — and dry out after it.
	const GROUND_COMMON = `
		varying float vUpward;
		uniform float wetness; uniform float snowCover; uniform float rainLevel; uniform float weatherTime; uniform vec3 skyTint;
		float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
		float wNoise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			f = f * f * (3.0 - 2.0 * f);
			return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y);
		}
		// Rings spreading from drops: two layers of cells, each with a drop at its own place and moment.
		float wRipples(vec2 p, float t) {
			float s = 0.0;
			for (int k = 0; k < 2; k++) {
				vec2 q = p / 12.0 + float(k) * 0.37, c = floor(q);
				vec2 o = vec2(wHash(c), wHash(c + 7.1)) * 0.6 + 0.2;
				float ph = fract(t * 0.9 + wHash(c + 3.3));
				float d = length(fract(q) - o) * 12.0;
				s += smoothstep(0.7, 0.0, abs(d - ph * 4.0)) * (1.0 - ph);
			}
			return s;
		}
		float puddleMask = 0.0;
		float snowMask = 0.0;`;
	const GROUND_COLOR = `
		#ifdef TERRAIN
		float wn = wNoise(vMapXY * 0.011) * 0.65 + wNoise(vMapXY * 0.043) * 0.35;
		puddleMask = smoothstep(0.86, 0.97, vUpward) * smoothstep(0.86 - wetness * 0.18, 0.9 - wetness * 0.18, wn) * smoothstep(0.12, 0.45, wetness);
		#endif
		diffuseColor.rgb *= 1.0 - 0.32 * wetness;
		diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.42 + vec3(0.03, 0.04, 0.05), puddleMask);
		float sn = wNoise(vMapXY * 0.008) * 0.6 + wNoise(vMapXY * 0.05) * 0.4, th = 1.05 - snowCover * 1.25;
		snowMask = smoothstep(0.55, 0.9, vUpward) * smoothstep(th - 0.08, th + 0.08, sn) * min(1.0, snowCover * 3.0);
		diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.94, 0.98), snowMask);`;
	const GROUND_ROUGH = `
		roughnessFactor = mix(roughnessFactor, 0.5, wetness * 0.8);
		roughnessFactor = mix(roughnessFactor, 0.04, puddleMask);
		roughnessFactor = mix(roughnessFactor, 0.55, snowMask);`;
	const GROUND_GLOW = `
		totalEmissiveRadiance += skyTint * puddleMask * 0.1;
		totalEmissiveRadiance += vec3(0.75, 0.82, 0.9) * puddleMask * rainLevel * wRipples(vMapXY, weatherTime) * 0.25;
		totalEmissiveRadiance += vec3(step(0.985, wHash(floor(vMapXY * 0.9) + floor(weatherTime * 0.5))) * snowMask * 0.5);`;
	function fogged(material, ground = false, terrain = false) {
		if (terrain) material.defines = { ...material.defines, TERRAIN: "" };
		material.onBeforeCompile = (shader) => {
			Object.assign(shader.uniforms, fogUniforms, overlayUniforms, groundWeather);
			cloudShade(THREE, shader);
			nightLightShade(shader);
			if (ground) {
				shader.vertexShader = shader.vertexShader
					.replace("#include <common>", "#include <common>\nvarying float vUpward;")
					.replace("#include <defaultnormal_vertex>", "#include <defaultnormal_vertex>\nvUpward = (vec4(transformedNormal, 0.0) * viewMatrix).y;");
				shader.fragmentShader = shader.fragmentShader
					.replace("#include <common>", "#include <common>\n" + GROUND_COMMON)
					.replace("#include <map_fragment>", "#include <map_fragment>\n" + GROUND_COLOR)
					.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n" + GROUND_ROUGH)
					.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + GROUND_GLOW);
			}
			shader.vertexShader = shader.vertexShader
				.replace("#include <common>", "#include <common>\nvarying vec2 vMapXY;")
				// The map point of the vertex (instanced meshes included: scattered stones and grass).
				.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvec4 mapPoint = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nmapPoint = instanceMatrix * mapPoint;\n#endif\nvMapXY = (modelMatrix * mapPoint).xz;");
			shader.fragmentShader = shader.fragmentShader
				.replace(
					"#include <common>",
					"#include <common>\nvarying vec2 vMapXY;\nuniform sampler2D fogMap;\nuniform float fogOn;\nuniform vec2 fogSize;\nuniform sampler2D overlayMap;\nuniform float overlayOn;\nuniform vec4 overlayFrame;\nuniform vec2 overlaySize;",
				)
				.replace(
					"#include <dithering_fragment>",
					`#include <dithering_fragment>
					float seen = mix(1.0, texture2D(fogMap, vMapXY / fogSize).r, fogOn);
					vec3 grey = vec3(dot(gl_FragColor.rgb, vec3(0.3, 0.55, 0.15)));
					gl_FragColor.rgb = mix(grey * vec3(0.55, 0.65, 0.8), gl_FragColor.rgb, smoothstep(0.35, 0.95, seen)) * (0.25 + 0.75 * seen);
					if (overlayOn > 0.5) {
						vec2 f = ((vMapXY - overlayFrame.xy) * overlayFrame.z + overlaySize * 0.5) / overlaySize;
						if (f.x > 0.0 && f.x < 1.0 && f.y > 0.0 && f.y < 1.0) {
							vec4 ui = texture2D(overlayMap, vec2(f.x, 1.0 - f.y));
							gl_FragColor.rgb = mix(gl_FragColor.rgb, ui.rgb, ui.a);
						}
					}`,
				);
		};
		return material;
	}

	// What on a tile changes the ground painting: nothing any more — tracks, craters, wrecks, habitats,
	// wall links and map effects are 3D (webgl3d/marks-3d.js and others), deposits and relays are models.
	// The ground is painted once per map.
	function signature() {
		return "";
	}
	function refreshTiles() {
		for (const t of tiles) {
			const s = signature(t);
			if (s === t.signature) continue;
			t.signature = s;
			paintTile(t);
			return; // one tile per check keeps frames even
		}
	}

	// The board's ground phases (terrain, deposits, relays), painted for one tile.
	// Captions are not painted on the ground: they stand as signs facing the camera (syncSigns).
	const groundView = (camera, width, height) => ({
		game,
		width,
		height,
		dpr: 1,
		scale: 1,
		camera,
		selected: new Set(),
		colors: COLORS,
		mouse: { x: -1e4, y: -1e4 },
		drag: null,
		building: false,
		wallDrag: null,
		shadeBody: null,
		underUnits: null,
		groundLabels: false,
		groundDeposits: false,
		ground3D: true,
	});
	function paintTile(t) {
		canvasRenderer.drawLayer(t.canvas.getContext("2d"), groundView({ x: t.x0 + t.w / 2, y: t.y0 + t.h / 2, zoom: 1 }, t.w, t.h), ["terrain", "ground", "groundTop"]);
		t.texture.needsUpdate = true;
	}

	// Signs: names and amounts of deposits and relays (the captions of the 2D board), standing over them
	// and always facing the camera; repainted only when their text changes. Shown where explored, with
	// a relay's owner only while it is in sight (as on the 2D board).
	const signs = new Map();
	function signTexture(lines) {
		const c = document.createElement("canvas"),
			x = c.getContext("2d"),
			fonts = lines.map((l, i) => `${i ? 500 : 600} ${i ? 20 : 24}px "Segoe UI", sans-serif`);
		let w = 0;
		lines.forEach((l, i) => {
			x.font = fonts[i];
			w = Math.max(w, x.measureText(l.text).width);
		});
		c.width = Math.ceil(w + 16);
		c.height = lines.length * 28 + 8;
		lines.forEach((l, i) => {
			x.font = fonts[i];
			x.textAlign = "center";
			x.textBaseline = "top";
			x.shadowColor = "#000000d0";
			x.shadowBlur = 6;
			x.fillStyle = l.color;
			x.fillText(l.text, c.width / 2, 4 + i * 28);
		});
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = 4;
		return { texture: t, aspect: c.width / c.height, lines: lines.length };
	}
	function sign(key, lines, x, y, lift) {
		const text = lines.map((l) => l.color + l.text).join("|");
		let s = signs.get(key);
		if (!s) {
			s = { sprite: new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false })), text: null };
			s.sprite.renderOrder = 12;
			world.add(s.sprite);
			signs.set(key, s);
		}
		if (s.text !== text) {
			s.text = text;
			s.sprite.material.map?.dispose();
			const t = signTexture(lines);
			s.sprite.material.map = t.texture;
			s.sprite.material.needsUpdate = true;
			// 11.5 map units per line, like the 11–12 px captions of the 2D board.
			s.sprite.scale.set(11.5 * t.lines * t.aspect * 1.05, 11.5 * t.lines + 3.5, 1);
		}
		s.sprite.position.set(x, heightAt(x, y) + lift, y);
		s.sprite.visible = true;
		s.seen = true;
	}
	const labelView = () => groundView({ x: 0, y: 0, zoom: 1 }, 1, 1);
	let gasView = null;
	function syncSigns() {
		for (const s of signs.values()) s.seen = false;
		const explored = (o) => game.explored[game.visionIndex(o.x, o.y)];
		const deposit = (prefix, list, label, lift) => {
			for (const o of list || []) if (explored(o)) sign(prefix + o.id, [label(o)], o.x, o.y, lift);
		};
		deposit("ore", game.ores, (o) => BoardArt.resourceLabel(o, false), 30);
		deposit("gas", game.gasFields, (o) => BoardArt.resourceLabel(o, true), 30);
		deposit("crystal", game.crystalFields, (o) => BoardArt.crystalLabel(o), 40);
		// Salvage wrecks: their metal value (SupportArt.wrecks caption).
		for (const w of game.wrecks || []) if (explored(w)) sign("salvage" + w.id, [{ text: "WRAK · " + w.value, color: "#c9b98f" }], w.x, w.y, 34);
		const v = labelView();
		for (const n of game.nodes || []) {
			if (!explored(n)) continue;
			const shown = game.isVisible(n.x, n.y) || n.owner === (game.viewer ?? 0) ? n : { ...n, owner: -1, progress: 0 },
				l = canvasRenderer.nodeLabel(v, shown);
			sign("node" + n.name + n.x, [{ text: l.name, color: l.color }, { text: l.status, color: "#9aaba7" }], n.x, n.y, 70);
		}
		for (const s of signs.values()) if (!s.seen) s.sprite.visible = false;
	}
	function clearSigns() {
		for (const s of signs.values()) {
			world.remove(s.sprite);
			s.sprite.material.map?.dispose();
			s.sprite.material.dispose();
		}
		signs.clear();
	}

	// Model looks: one texture and material per painted state, shared by every model in that state.
	const painter = createModelLight(),
		looks = new Map(),
		planes = new Map();
	function look(e, frame, moving) {
		const body = painter.paint(e, game, frame, moving);
		let entry = looks.get(body.key);
		if (entry) return entry;
		const texture = new THREE.CanvasTexture(body.canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.anisotropy = 8;
		const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.35, roughness: 0.8, metalness: 0.15, side: THREE.DoubleSide });
		// Solid part of the painting (drop shadows of the art are translucent) and its mean colour.
		const { width: bw, height: bh } = body.canvas,
			pixels = body.canvas.getContext("2d").getImageData(0, 0, bw, bh).data;
		let x0 = bw,
			y0 = bh,
			x1 = 0,
			y1 = 0,
			r = 0,
			g = 0,
			b = 0,
			n = 0;
		for (let y = 0; y < bh; y++)
			for (let x = 0; x < bw; x++) {
				const i = (y * bw + x) * 4;
				if (pixels[i + 3] < 200) continue;
				x0 = Math.min(x0, x);
				x1 = Math.max(x1, x);
				y0 = Math.min(y0, y);
				y1 = Math.max(y1, y);
				r += pixels[i];
				g += pixels[i + 1];
				b += pixels[i + 2];
				n++;
			}
		const wall = new THREE.Color(n ? `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})` : "#555").multiplyScalar(0.55);
		entry = { body, material, solid: n ? { x0: x0 - body.ox, x1: x1 - body.ox, y0: y0 - body.oy, y1: y1 - body.oy } : null, wall };
		looks.set(body.key, entry);
		return entry;
	}
	function plane(size) {
		if (!planes.has(size)) {
			const g = new THREE.PlaneGeometry(size, size);
			g.rotateX(-Math.PI / 2);
			planes.set(size, g);
		}
		return planes.get(size);
	}

	// One record per entity: a group at its foot, with a decal (and a plinth for buildings).
	const records = new Map(),
		unitBox = new THREE.BoxGeometry(1, 1, 1);
	function recordOf(e) {
		let r = records.get(e.id);
		if (r) return r;
		const group = new THREE.Group(),
			decal = new THREE.Mesh();
		decal.castShadow = true;
		decal.receiveShadow = true;
		group.add(decal);
		world.add(group);
		r = { group, decal, plinth: null, key: null, model: null };
		records.set(e.id, r);
		return r;
	}
	function buildingHeight(s) {
		return Math.max(16, Math.min(58, s.radius * 0.7));
	}
	// Hidden by the fog of war: other sides outside the viewer's sight.
	const hidden = (e) => options.fog && e.team !== (game.viewer ?? 0) && !game.isVisible(e.x, e.y);
	function syncEntity(e) {
		const s = TYPES[e.type],
			r = recordOf(e),
			building = !s.speed,
			moving = !!(e.path?.length || e.order?.kind === "move" || e.order?.kind === "attackMove");
		r.seen = true;
		r.group.visible = !hidden(e);
		if (!r.group.visible) return;
		r.group.position.set(e.x, heightAt(e.x, e.y), e.y);
		r.group.rotation.y = building ? 0 : -(e.angle || 0);
		if (options.models && models3d.has(e)) {
			syncModel(e, r, s, building, moving);
			return;
		}
		if (r.model) r.model.root.visible = false;
		r.decal.visible = true;
		if (r.plinth) r.plinth.visible = true;
		const frame = building ? 0 : moving ? Math.floor(clock * 10) % 8 : 0,
			l = look(e, frame, moving);
		if (r.key !== l.body.key) {
			const size = l.body.canvas.width;
			r.decal.geometry = plane(size);
			r.decal.material = l.material;
			// Painting centre relative to the foot (the art is not always centred on the canvas).
			r.decal.position.x = size / 2 - l.body.ox;
			r.decal.position.z = size / 2 - l.body.oy;
			r.key = l.body.key;
			if (building && l.solid && !r.plinth) {
				const h = buildingHeight(s);
				r.plinth = new THREE.Mesh(unitBox, new THREE.MeshStandardMaterial({ color: l.wall, roughness: 0.85, metalness: 0.2 }));
				r.plinth.castShadow = r.plinth.receiveShadow = true;
				// Slightly inside the painted roof, so the roof edge reads as an overhang.
				r.plinth.scale.set((l.solid.x1 - l.solid.x0) * 0.86, h, (l.solid.y1 - l.solid.y0) * 0.86);
				r.plinth.position.set((l.solid.x0 + l.solid.x1) / 2, h / 2, (l.solid.y0 + l.solid.y1) / 2);
				r.group.add(r.plinth);
			}
		}
		const lift = building ? buildingHeight(s) * (e.constructionLeft > 0 ? 0.35 : 1) + 0.5 : s.flying ? 90 : 2;
		if (r.plinth) r.plinth.scale.y = Math.max(1, lift - 0.5);
		if (r.plinth) r.plinth.position.y = r.plinth.scale.y / 2;
		r.decal.position.y = lift;
	}

	// Code-built 3D model (webgl3d/models-3d.js): turret aim, recoil, walking and construction.
	// Collapsing models of the destroyed (1.2 s): buildings sink and lean, vehicles and walkers tip over
	// and sink; still drawn in the batches while they go.
	const dying = [];
	function collapse(dt) {
		for (let i = dying.length - 1; i >= 0; i--) {
			const d = dying[i];
			d.t += dt;
			const k = Math.min(1, d.t / 1.2),
				root = d.r.model.root;
			(d.tint ??= new THREE.Color()).setScalar(1 - 0.7 * Math.min(1, k * 2));
			if (d.building) {
				root.position.y = -k * k * 40;
				root.rotation.z = d.spin * 0.25 * k;
				root.rotation.x = d.spin * 0.15 * k;
			} else {
				root.rotation.z = (d.spin > 0 ? 1 : -1) * Math.min(1, k * 2.5) * 1.3;
				root.position.y = -k * k * 14;
			}
			if (d.r.scaffold) d.r.scaffold.root.visible = false;
			if (k >= 1) {
				world.remove(d.r.group);
				dying.splice(i, 1);
			}
		}
	}
	// Pitch and roll from the ground under the front, back and sides of a ground vehicle (radius 12 and
	// more: infantry stays upright), eased so bumps do not jitter.
	function tilt(e, r, s, building) {
		let pitch = 0,
			roll = 0;
		if (!building && !s.flying && s.radius >= 12) {
			const c = Math.cos(e.angle || 0),
				sn = Math.sin(e.angle || 0),
				L = s.radius * 0.85,
				W = s.radius * 0.55;
			pitch = Math.atan2(heightAt(e.x + c * L, e.y + sn * L) - heightAt(e.x - c * L, e.y - sn * L), 2 * L);
			roll = -Math.atan2(heightAt(e.x - sn * W, e.y + c * W) - heightAt(e.x + sn * W, e.y - c * W), 2 * W);
		}
		r.tilt.rotation.z += (pitch - r.tilt.rotation.z) * 0.2;
		r.tilt.rotation.x += (roll - r.tilt.rotation.x) * 0.2;
	}
	function syncModel(e, r, s, building, moving) {
		r.building = building;
		// Hit flash: the game sets e.hit = 0.15 s on every hit.
		const flash = Math.max(0, Math.min(1, (e.hit || 0) / 0.15));
		r.tint = flash > 0 ? (r.flashColor ??= new THREE.Color()).setRGB(1 + flash * 1.6, 1 + flash * 1.1, 1 + flash * 0.9) : WHITE;
		r.decal.visible = false;
		if (r.plinth) r.plinth.visible = false;
		const key = [e.type, e.team, e.faction || "", e.tint || ""].join("|");
		if (r.model?.key !== key) {
			if (r.model) r.model.root.parent?.remove(r.model.root);
			r.model = models3d.create(e, COLORS_ART);
			// The parts only carry transforms; they are drawn in batches (see drawBatches).
			r.model.root.traverse((o) => o.isMesh && o.layers.set(HIDDEN_LAYER));
			// Ground vehicles and walkers lie on the slope: a tilt group between the record and the model.
			if (!r.tilt) r.group.add((r.tilt = new THREE.Group()));
			r.tilt.add(r.model.root);
		}
		tilt(e, r, s, building);
		r.model.root.visible = true;
		const target = e.target != null ? game.get(e.target) : null,
			facing = building ? 0 : e.angle || 0,
			aim = (target ? Math.atan2(target.y - e.y, target.x - e.x) : building ? e.angle || 0 : facing) - facing,
			recoil = Math.max(0, Math.min(1, (e.cooldown - (s.cooldown - 0.12)) / 0.12)),
			built = e.constructionLeft > 0 ? Math.max(0.08, 1 - e.constructionLeft / (s.construction || s.build || 10)) : 1;
		// The orbital station charges between strikes (0…1).
		const charge = e.type === "uplink" && e.strikeReady ? Math.max(0, Math.min(1, 1 - (e.strikeReady - game.time) / (RTS.FACTION_FX?.strike?.cooldown || 60))) : 1;
		r.model.update(e, { time: clock, moving, aim, recoil, built, working: working.has(e.id), charge });
		// Under construction: the building rises out of the ground inside a scaffold.
		r.model.root.scale.set(1, built, 1);
		if (s.flying) r.model.root.position.y = 90;
		if (building && built < 1) {
			if (!r.scaffold) {
				r.scaffold = models3d.scenery("scaffold", s.radius);
				r.scaffold.root.traverse((o) => o.isMesh && o.layers.set(HIDDEN_LAYER));
				r.group.add(r.scaffold.root);
			}
			r.scaffold.root.visible = true;
			r.scaffold.update(e, { time: clock });
		} else if (r.scaffold) r.scaffold.root.visible = false;
	}

	// Instancing: every model part with the same geometry and material, across all models, is one
	// InstancedMesh draw (and one shadow draw). Parts live on a layer no camera renders; each frame their
	// world matrices, which the models animate as usual, are copied into the batches.
	const HIDDEN_LAYER = 1,
		batches = new Map();
	let batchCalls = 0;
	function batchOf(mesh) {
		const key = mesh.geometry.id + ":" + mesh.material.id;
		let b = batches.get(key);
		if (!b) {
			b = { geometry: mesh.geometry, material: mesh.material, mesh: null, capacity: 0, count: 0 };
			batches.set(key, b);
		}
		return b;
	}
	function grow(b, need) {
		if (b.capacity >= need) return;
		if (b.mesh) {
			world.remove(b.mesh);
			b.mesh.dispose();
		}
		b.capacity = Math.max(32, 2 ** Math.ceil(Math.log2(need)));
		b.mesh = new THREE.InstancedMesh(b.geometry, b.material, b.capacity);
		// A colour per instance multiplies the material: white normally, brighter in a hit flash, darker
		// while a destroyed model collapses (charred).
		b.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(b.capacity * 3).fill(1), 3);
		b.mesh.castShadow = b.mesh.receiveShadow = true;
		// Instances move every frame; the batch spans the map.
		b.mesh.frustumCulled = false;
		world.add(b.mesh);
	}
	const shown = [],
		tints = [],
		WHITE = new THREE.Color(1, 1, 1);
	function collect(o, tint = WHITE) {
		if (!o.visible) return;
		if (o.isMesh) {
			shown.push(o);
			tints.push(tint);
			return;
		}
		for (const c of o.children) collect(c, tint);
	}
	function drawBatches() {
		world.updateMatrixWorld();
		shown.length = tints.length = 0;
		for (const d of dying) collect(d.r.model.root, d.tint);
		for (const r of records.values()) {
			if (!r.group.visible) continue;
			if (r.model?.root.visible) collect(r.model.root, r.tint);
			if (r.scaffold?.root.visible) collect(r.scaffold.root);
		}
		for (const root of life.roots()) collect(root);
		for (const b of batches.values()) b.count = 0;
		for (const m of shown) (m.userData.batch ??= batchOf(m)).count++;
		for (const b of batches.values()) {
			grow(b, b.count);
			if (b.mesh) b.mesh.count = 0;
		}
		shown.forEach((m, i) => {
			const b = m.userData.batch;
			b.mesh.setColorAt(b.mesh.count, tints[i]);
			b.mesh.setMatrixAt(b.mesh.count++, m.matrixWorld);
		});
		batchCalls = 0;
		for (const b of batches.values()) {
			if (!b.mesh) continue;
			b.mesh.visible = b.mesh.count > 0;
			if (b.mesh.count) {
				const m = b.mesh.instanceMatrix;
				m.clearUpdateRanges();
				m.addUpdateRange(0, b.mesh.count * 16);
				m.needsUpdate = true;
				const c = b.mesh.instanceColor;
				c.clearUpdateRanges();
				c.addUpdateRange(0, b.mesh.count * 3);
				c.needsUpdate = true;
				batchCalls++;
			}
		}
	}
	// Wildlife, birds, fish, floating islands and wrecks (webgl3d/scene-life-3d.js), drawn in the same batches.
	const life = createSceneLife3D(THREE, { world, heightAt: (x, y) => heightAt(x, y), models3d, hiddenLayer: HIDDEN_LAYER });

	// Selection rings and health bars (selected, damaged or recently hit).
	const ringGeometry = new THREE.RingGeometry(0.92, 1, 40);
	ringGeometry.rotateX(-Math.PI / 2);
	const rings = [],
		bars = [];
	const barMaterial = (color) => new THREE.SpriteMaterial({ color, depthTest: false, transparent: true });
	function pooled(list, i, make) {
		if (!list[i]) {
			list[i] = make();
			world.add(list[i].root || list[i]);
		}
		return list[i];
	}

	// Tracers as thin glowing beams (one instanced draw: a unit box stretched from tail to head), explosions
	// as additive flashes.
	const MAX_TRACERS = 600,
		tracers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), MAX_TRACERS);
	tracers.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRACERS * 3), 3);
	tracers.frustumCulled = false;
	world.add(tracers);
	const beam = { from: new THREE.Vector3(), to: new THREE.Vector3(), dir: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(), x: new THREE.Vector3(1, 0, 0), s: new THREE.Vector3() };
	function tracer(i, a, b, width, c) {
		beam.from.set(...a);
		beam.to.set(...b);
		beam.dir.subVectors(beam.to, beam.from);
		const len = beam.dir.length();
		beam.q.setFromUnitVectors(beam.x, beam.dir.normalize());
		tracers.setMatrixAt(i, beam.m.compose(beam.from.lerp(beam.to, 0.5), beam.q, beam.s.set(Math.max(1, len), width, width)));
		tracers.setColorAt(i, c);
	}
	const fireballGeometry = new THREE.IcosahedronGeometry(1, 2),
		shockGeometry = new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2);
	const flashes = [],
		shotsSeen = new WeakSet(),
		impactsSeen = new WeakSet();

	let selected = new Set();
	const COLORS = ["#b0efd0", "#f07d78", "#e4b968", "#819dff", "#d2a1ef"];

	// Team rings: a faint disc edge in the side's colour under every unit, so own and enemy units read
	// apart at any zoom (one instanced draw).
	const MAX_RINGS = 1200,
		teamRings = new THREE.InstancedMesh(
			new THREE.RingGeometry(0.72, 1, 28).rotateX(-Math.PI / 2),
			new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
			MAX_RINGS,
		),
		ringMatrix = new THREE.Matrix4(),
		ringColor = new THREE.Color();
	teamRings.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_RINGS * 3), 3);
	teamRings.frustumCulled = false;
	teamRings.renderOrder = 2;
	world.add(teamRings);
	function syncTeamRings() {
		let n = 0;
		for (const e of game.entities) {
			const s = TYPES[e.type];
			if (n >= MAX_RINGS || e.hp <= 0 || !s?.speed || s.flying || e.team === 2 || hidden(e)) continue;
			const r = s.radius * 1.15;
			teamRings.setMatrixAt(n, ringMatrix.makeScale(r, 1, r).setPosition(e.x, heightAt(e.x, e.y) + 1.2, e.y));
			teamRings.setColorAt(n++, ringColor.set(game.colorFor?.(e.team) || COLORS[e.team] || "#ffffff"));
		}
		teamRings.count = n;
		teamRings.instanceMatrix.needsUpdate = true;
		teamRings.instanceColor.needsUpdate = true;
	}
	function syncMarks() {
		syncTeamRings();
		let ri = 0,
			bi = 0;
		for (const e of game.entities) {
			if (e.hp <= 0 || hidden(e)) continue;
			const s = TYPES[e.type],
				ground = heightAt(e.x, e.y),
				top = !s.speed ? (options.models && models3d.has(e) ? 62 : buildingHeight(s) + 14) : s.flying ? 110 : 30,
				isSelected = selected.has(e.id);
			if (isSelected) {
				const ring = pooled(rings, ri++, () => new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: "#8dffc8", transparent: true, opacity: 0.9, depthWrite: false })));
				ring.visible = true;
				ring.scale.setScalar(s.radius + 6);
				ring.position.set(e.x, ground + 3, e.y);
			}
			if (isSelected || e.hp < e.maxHp) {
				const bar = pooled(bars, bi++, () => {
					const root = new THREE.Group(),
						back = new THREE.Sprite(barMaterial("#0d1a1f")),
						fill = new THREE.Sprite(barMaterial("#6fe39a"));
					fill.center.set(0, 0.5);
					back.renderOrder = 10;
					fill.renderOrder = 11;
					root.add(back, fill);
					return { root, back, fill };
				});
				const w = Math.max(24, s.radius * 1.8),
					f = Math.max(0, e.hp / e.maxHp);
				bar.root.visible = true;
				bar.root.position.set(e.x, ground + top, e.y);
				bar.back.scale.set(w + 3, 6, 1);
				bar.fill.scale.set(w * f, 4, 1);
				bar.fill.position.x = -w / 2;
				bar.fill.material.color.set(f > 0.6 ? "#6fe39a" : f > 0.3 ? "#e4c25a" : "#f06a5e");
			}
		}
		for (let i = ri; i < rings.length; i++) rings[i].visible = false;
		for (let i = bi; i < bars.length; i++) bars[i].root.visible = false;

		let si = 0,
			fi = 0;
		const color = new THREE.Color();
		for (const ef of game.effects) {
			if (options.fog && !game.isVisible(ef.x, ef.y)) continue;
			const alpha = ef.life / ef.maxLife;
			if (ef.kind === "shot" && si < MAX_TRACERS - 1) {
				// A tracer flies from the muzzle to the target over the shot's life (rockets slower, with a
				// smoke trail); a flash at the muzzle when it appears, sparks where it lands. Aircraft fire
				// from their flight height (fighters: two guns beside the nose, straight lines; the bomber
				// drops a bomb falling faster and faster, with smoke), and shots at aircraft go up to them.
				const dx = ef.tx - ef.x,
					dy = ef.ty - ef.y,
					d = Math.hypot(dx, dy) || 1,
					ux = dx / d,
					uy = dy / d,
					fromY = heightAt(ef.x, ef.y) + (ef.air ? 88 : 14),
					toY = heightAt(ef.tx, ef.ty) + (ef.airTarget ? 90 : 10),
					bomb = ef.bomb,
					straight = ef.air || ef.airTarget,
					head = Math.min(1, (1 - alpha) * (ef.rocket || bomb ? 1.25 : 1.7)),
					tail = Math.max(0, head - (ef.rocket ? 0.1 : bomb ? 0.06 : ef.air ? 0.16 : 0.3)),
					// The muzzle: at the nose of an aircraft, ahead of its centre.
					ox = ef.x + (ef.air && !bomb ? ux * 16 : 0),
					oy = ef.y + (ef.air && !bomb ? uy * 16 : 0),
					at = (k, side = 0) => [
						ox + (ef.tx - ox) * k - uy * side * (1 - k),
						bomb ? fromY + (toY - fromY) * k * k : fromY + (toY - fromY) * k + (straight ? 0 : Math.sin(k * Math.PI) * (ef.rocket ? 30 : 6)),
						oy + (ef.ty - oy) * k + ux * side * (1 - k),
					];
				if (!shotsSeen.has(ef)) {
					shotsSeen.add(ef);
					if (!bomb) fx.shot("muzzle", ox, fromY, oy, ef.rocket);
				}
				if (head < 1) {
					const [hx, hy, hz] = at(head);
					if (bomb) {
						tracer(si++, at(tail), [hx, hy, hz], 2.6, color.set("#ff9a50"));
						fx.shot("trail", hx, hy, hz);
					} else if (ef.air) for (const side of [-4.5, 4.5]) tracer(si++, at(tail, side), at(head, side), 1.1, color.set("#fff0b0"));
					else {
						tracer(si++, at(tail), [hx, hy, hz], ef.rocket ? 3.2 : 1.8, color.set(ef.rocket ? "#ffb15a" : "#ffe6a0"));
						if (ef.rocket) fx.shot("trail", hx, hy, hz);
					}
				} else if (!impactsSeen.has(ef)) {
					impactsSeen.add(ef);
					fx.shot("impact", ef.tx, toY, ef.ty, ef.rocket || bomb);
				}
			} else if (ef.kind === "explosion") {
				// A fireball swelling and cooling from white-yellow to dark red, and a shock ring running
				// over the ground (sparks and smoke come from scene-fx-3d.js).
				const blast = pooled(flashes, fi++, () => {
						const root = new THREE.Group(),
							ball = new THREE.Mesh(fireballGeometry, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })),
							ring = new THREE.Mesh(shockGeometry, new THREE.MeshBasicMaterial({ color: "#ffd9a8", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
						root.add(ball, ring);
						return { root, ball, ring };
					}),
					size = ef.size || 40,
					k = 1 - alpha,
					ground = heightAt(ef.x, ef.y);
				blast.root.visible = true;
				blast.ball.position.set(ef.x, ground + size * (0.25 + k * 0.35), ef.y);
				blast.ball.scale.setScalar(size * (0.35 + k * 0.55));
				blast.ball.material.color.setRGB(1, 0.85 - k * 0.5, 0.55 - k * 0.5);
				blast.ball.material.opacity = alpha * alpha;
				blast.ring.position.set(ef.x, ground + 2, ef.y);
				blast.ring.scale.setScalar(size * (0.4 + k * 1.2));
				blast.ring.material.opacity = alpha * 0.55;
			}
		}
		tracers.count = si;
		tracers.visible = si > 0;
		tracers.instanceMatrix.needsUpdate = true;
		tracers.instanceColor.needsUpdate = true;
		for (let i = fi; i < flashes.length; i++) flashes[i].root.visible = false;
	}

	// Sun height (-1 midnight … 1 noon) and its east–west position (-1 … 1). One shadowed light is the
	// sun by day and the moon by night: the sun reddens and fades through the golden hour and the
	// sunset, both are faint in the blue hour (where the light changes over), then the cool moonlight
	// from its own, lower direction. The sky's colours (webgl3d/sky-3d.js) tint the ambient light and
	// the distance haze; twilight warms the ambient from the horizon.
	const MOON_LIGHT = new THREE.Color("#a3b8e6"),
		NIGHT_AMBIENT = new THREE.Color("#2b3d66"),
		DAY_AMBIENT = new THREE.Color("#bcd4e6"),
		DAY_GROUND = new THREE.Color("#3a3226"),
		NIGHT_GROUND = new THREE.Color("#141922"),
		skyState = { e: 1, sunDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), zenith: new THREE.Color(), horizon: new THREE.Color(), sunlight: new THREE.Color() };
	const smooth = (a, b, x) => {
		const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
		return t * t * (3 - 2 * t);
	};
	function light(elevation, across) {
		const day = Math.max(0, Math.min(1, elevation * 3 + 0.35)),
			colors = sky.palette(elevation);
		skyState.e = elevation;
		skyState.zenith.copy(colors.zenith);
		skyState.horizon.copy(colors.horizon);
		skyState.sunlight.copy(colors.sunlight);
		skyState.sunDir.set(-across, elevation, 0.45).normalize();
		skyState.moonDir.set(0.6 + across * 0.2, 0.3, -0.74).normalize();
		const sunI = 2.45 * smooth(-0.12, 0.3, elevation),
			moonI = 0.55 * smooth(-0.05, -0.3, elevation),
			bySun = sunI >= moonI,
			// Moonlight from the moon's side but higher than its disk in the sky: a low light would throw
			// shadows of the hills across half the map.
			dir = bySun ? new THREE.Vector3(-across, Math.max(0.12, elevation), 0.45).normalize() : new THREE.Vector3(skyState.moonDir.x, 0.75, skyState.moonDir.z).normalize();
		sun.color.copy(bySun ? colors.sunlight : MOON_LIGHT);
		sun.intensity = Math.max(0.18, bySun ? sunI : moonI);
		// Ambient: night blue → day sky, warmed by the horizon in the twilight; the ground bounce darkens.
		const twilight = Math.max(0, 1 - Math.abs(elevation + 0.02) / 0.2);
		hemi.intensity = 0.38 + day * 0.6 + twilight * 0.12;
		hemi.color.copy(NIGHT_AMBIENT).lerp(DAY_AMBIENT, day).lerp(colors.horizon, twilight * 0.4);
		hemi.groundColor.copy(NIGHT_GROUND).lerp(DAY_GROUND, day);
		// Distance haze and the clear colour: the horizon, a little towards the zenith.
		scene.background.copy(colors.horizon).lerp(colors.zenith, 0.2);
		scene.fog.color.copy(scene.background);
		// The sun and its shadow box follow the camera.
		sun.target.position.set(rig.x, 0, rig.y);
		sun.position.copy(sun.target.position).addScaledVector(dir, 2500);
		return day;
	}
	// Weather on the whole scene: haze closes in and tints the distance; lightning flashes the sky.
	const HAZE = { sand: new THREE.Color("#b8925a"), snow: new THREE.Color("#c9d6df"), rain: new THREE.Color("#3c4a55") },
		FLASH = new THREE.Color("#cfe0ff");
	function weatherLight(state) {
		const haze = state.haze || 0;
		if (haze > 0.01) {
			scene.fog.color.lerp(HAZE[state.kind] || HAZE.rain, haze * 0.75);
			scene.background.lerp(HAZE[state.kind] || HAZE.rain, haze * 0.6);
			scene.fog.near *= 1 - 0.8 * haze;
			scene.fog.far *= 1 - 0.6 * haze;
			sun.intensity *= 1 - 0.5 * haze;
		}
		if (state.flash > 0) {
			hemi.intensity += state.flash * 2.2;
			scene.background.lerp(FLASH, state.flash * 0.45);
		}
		// The sky dome after the weather: hazy in rain, snow and sand, flashing with the lightning;
		// clouds thicker in bad weather; their shadows drift over the board (fainter under overcast).
		const cover = 0.35 + (state.kind ? (state.intensity || 0) * 0.5 : 0);
		sky.update({ camera, time: clock, ...skyState, haze, hazeColor: HAZE[state.kind] || HAZE.rain, cover, flash: state.flash || 0, flashColor: FLASH });
		sky.clouds(clock, options.cloudShadows === false ? 0 : 0.4 * (1 - haze * 0.6));
	}

	function placeCamera() {
		const ground = heightAt(rig.x, rig.y),
			flat = Math.cos(rig.pitch) * rig.distance;
		camera.position.set(rig.x + Math.sin(rig.yaw) * flat, ground + Math.sin(rig.pitch) * rig.distance, rig.y + Math.cos(rig.yaw) * flat);
		camera.lookAt(rig.x, ground, rig.y);
		// Distance haze, the far plane and the sun's shadow box follow the zoom (up to the whole map).
		scene.fog.near = rig.distance * 1.6;
		scene.fog.far = rig.distance * 4.5;
		if (Math.abs(camera.far - rig.distance * 5) > rig.distance * 0.5) {
			camera.far = rig.distance * 5;
			camera.updateProjectionMatrix();
		}
		const extent = Math.max(700, Math.min(3000, rig.distance * 1.1)),
			box = sun.shadow.camera;
		if (box.right !== extent) {
			Object.assign(box, { left: -extent, right: extent, top: extent, bottom: -extent, far: 2500 + extent * 2 });
			box.updateProjectionMatrix();
		}
	}

	function resize() {
		const w = host.clientWidth,
			h = host.clientHeight;
		renderer.setSize(w, h, false);
		renderer.domElement.style.width = w + "px";
		renderer.domElement.style.height = h + "px";
		camera.aspect = w / Math.max(1, h);
		camera.updateProjectionMatrix();
	}
	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(host);
	resize();

	// What a tall thing must not hide: own units, selected things and the pointer, on the screen.
	const watched = [],
		probe = new THREE.Vector3();
	let pointer = null;
	function watchList() {
		watched.length = 0;
		const viewer = game.viewer ?? 0;
		for (const e of game.entities) {
			if (e.hp <= 0 || !(e.team === viewer || selected.has(e.id))) continue;
			probe.set(e.x, heightAt(e.x, e.y) + 10, e.y).project(camera);
			if (probe.z > 1 || Math.abs(probe.x) > 1.1 || Math.abs(probe.y) > 1.1) continue;
			watched.push({ x: probe.x, y: probe.y, d: camera.position.distanceTo(probe.set(e.x, heightAt(e.x, e.y), e.y)) });
		}
		// The pointer counts at any depth: anything tall under it fades (no ray through the terrain each frame).
		if (pointer) {
			const rect = host.getBoundingClientRect();
			watched.push({ x: (pointer.x / rect.width) * 2 - 1, y: -(pointer.y / rect.height) * 2 + 1, d: Infinity });
		}
	}
	// Whether a sphere (world units) covers any watched point and stands in front of it.
	function covers(s) {
		const d = camera.position.distanceTo(s.center);
		probe.copy(s.center).project(camera);
		const r = (s.radius / (d * Math.tan((camera.fov * Math.PI) / 360))) * 0.85;
		for (const w of watched) if (w.d > d - s.radius * 0.3 && Math.hypot((w.x - probe.x) * camera.aspect, w.y - probe.y) < r) return true;
		return false;
	}

	// Quality from the game's graphics settings (SceneFX.options; the prototype has none: everything on):
	// terrain detail → scattered props, shadow-map size and render resolution; particles → weather and
	// smoke density; switches for shadows, night lights, water, damage smoke and fire, terrain relief and
	// lightning flashes.
	const quality = { scatter: 1, particles: 1, lights: true, water: true, scars: true, relief: true, flashes: true };
	let qualityKey = null;
	function applyQuality(api, building = false) {
		const o = typeof SceneFX !== "undefined" ? SceneFX.options : {},
			level = { high: 0, medium: 1, low: 2 },
			terrainLevel = level[o.terrain] ?? 0,
			key = [o.terrain, o.particles, o.shadows, o.lights, o.water, o.scars, o.relief, o.flashes].join("|");
		if (key === qualityKey) return;
		const first = qualityKey === null,
			reliefChanged = !first && quality.relief !== (o.relief !== false),
			scatterChanged = !first && quality.scatter !== [1, 0.55, 0.25][terrainLevel];
		qualityKey = key;
		Object.assign(quality, {
			scatter: [1, 0.55, 0.25][terrainLevel],
			particles: [1, 0.5, 0.25][level[o.particles] ?? 0],
			lights: o.lights !== false,
			water: o.water !== false,
			scars: o.scars !== false,
			relief: o.relief !== false,
			flashes: o.flashes !== false,
		});
		sun.castShadow = o.shadows !== false;
		const size = [4096, 2048, 1024][terrainLevel];
		if (sun.shadow.mapSize.x !== size) {
			sun.shadow.mapSize.set(size, size);
			sun.shadow.map?.dispose();
			sun.shadow.map = null;
		}
		const ratio = Math.min(window.devicePixelRatio || 1, [2, 1.5, 1][terrainLevel]);
		if (renderer.getPixelRatio() !== ratio) {
			renderer.setPixelRatio(ratio);
			resize();
		}
		// Relief and scatter density are built with the map: rebuild it.
		if (game && !building && (reliefChanged || scatterChanged)) api.setGame(game);
	}

	const raycaster = new THREE.Raycaster(),
		ndc = new THREE.Vector2();
	let lastFrame = 0,
		sunOverride = null,
		weatherState = {};

	const publicApi = {
		kind: "three",
		rig,
		// Buildings being placed ({ type, x, y, valid }, map points): translucent models.
		setPlacements(list) {
			placements = list;
		},
		// Mission markers drawn by the overlay this frame ({ x, y, color, radius }): light pillars.
		setBeacons(list) {
			beacons = list;
		},
		// Pointer position on the board (CSS px), or null: tall things in front of it fade.
		setPointer(p) {
			pointer = p;
		},
		options,
		get timeOfDay() {
			return timeOfDay;
		},
		set timeOfDay(v) {
			timeOfDay = v;
		},
		// Day cycle of the prototype: 0 = dawn, 0.25 = noon, 0.5 = dusk, 0.75 = midnight.
		dayPhase: () => (timeOfDay ?? (0.08 + clock / 150) % 1),
		// The game sets its own sun (from game.night and the day phase); null returns to dayPhase().
		setSun(sunState) {
			sunOverride = sunState;
		},
		// Interface drawn by the Canvas renderer on a flat frame (map point p → (p - centre) * scale +
		// size / 2), draped over the terrain; null removes it.
		setOverlay(canvas, frame) {
			if (!canvas) {
				overlayUniforms.overlayOn.value = 0;
				return;
			}
			if (overlayUniforms.overlayMap.value?.image !== canvas) {
				overlayUniforms.overlayMap.value?.dispose();
				// Mixed after the output conversion, so its sRGB values are used as they are (no colour space).
				const t = new THREE.CanvasTexture(canvas);
				t.generateMipmaps = false;
				t.minFilter = THREE.LinearFilter;
				overlayUniforms.overlayMap.value = t;
			}
			overlayUniforms.overlayMap.value.needsUpdate = true;
			overlayUniforms.overlayOn.value = 1;
			overlayUniforms.overlayFrame.value.set(frame.x, frame.y, frame.scale, 0);
			overlayUniforms.overlaySize.value.set(frame.width, frame.height);
		},
		setGame(next) {
			game = next;
			models3d.setMission(game.missionId);
			applyQuality(this, true);
			canvasRenderer.setGame(game);
			for (const r of records.values()) world.remove(r.group);
			for (const d of dying) world.remove(d.r.group);
			dying.length = 0;
			clearSigns();
			records.clear();
			buildFog();
			buildTerrain();
			fx.setGame(game, heights);
			life.setGame(game);
			scatter.setGame(game, quality.scatter);
			objectives.setGame(game);
		},
		setSelection(ids) {
			selected = new Set(ids);
		},
		render(dt) {
			const started = performance.now();
			applyQuality(this);
			clock += dt;
			if ((groundClock -= dt) <= 0) {
				groundClock = GROUND_EVERY;
				refreshTiles();
			}
			if ((fogClock -= dt) <= 0) {
				fogClock = 0.2;
				refreshFog();
			}
			fogUniforms.fogOn.value = options.fog ? 1 : 0;
			for (const r of records.values()) r.seen = false;
			// Extractors with an operator (only they show drilling, as on the Canvas board).
			working.clear();
			for (const e of game.entities) if (e.order?.kind === "gas" && e.hp > 0) working.add(e.order.extractorId);
			for (const e of game.entities) if (e.hp > 0 && TYPES[e.type]) syncEntity(e);
			for (const [id, r] of records)
				if (!r.seen) {
					records.delete(id);
					// Destroyed (an explosion where it stood): it collapses for a moment; otherwise it simply
					// leaves (a unit boarding a transport, a building taken down).
					const boom = r.model && r.group.visible && game.effects.some((ef) => ef.kind === "explosion" && Math.abs(ef.x - r.group.position.x) < 4 && Math.abs(ef.y - r.group.position.z) < 4);
					if (boom) dying.push({ r, t: 0, building: !!r.building, spin: (id % 7) / 7 - 0.5 });
					else world.remove(r.group);
				}
			collapse(dt);
			syncMarks();
			syncSigns();
			gasView = labelView();
			scatter.update(game);
			life.update(game.time, { fog: options.fog, colors: COLORS });
			marks.update(game, { hidden });
			syncGhosts();
			objectives.update(game, clock, { beacons, colorOf: (team) => game.colorFor?.(team) || COLORS[team] || "#f5e27a" });
			drawBatches();
			let day;
			if (sunOverride) day = light(sunOverride.elevation, sunOverride.across);
			else {
				const a = this.dayPhase() * TAU;
				day = light(Math.sin(a), Math.cos(a));
			}
			placeCamera();
			const night = sunOverride?.night ?? 1 - day;
			models3d.setNight(night);
			weatherState = fx.update(dt, {
				game,
				time: game.time,
				night,
				focus: rig,
				span: Math.max(900, Math.min(4200, rig.distance * 1.9)),
				hidden,
				scale: renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360)),
				light: 0.3 + 0.7 * day,
				gasFlow: (o) => canvasRenderer.gasFlowing(gasView, o),
				sky: scene.background,
				quality,
			});
			weatherLight(weatherState);
			scatter.tick(clock, weatherState);
			groundWeather.wetness.value = weatherState.wetness || 0;
			groundWeather.snowCover.value = weatherState.snowCover || 0;
			groundWeather.rainLevel.value = weatherState.kind === "rain" ? weatherState.intensity || 0 : 0;
			groundWeather.weatherTime.value = clock;
			groundWeather.skyTint.value.copy(scene.background);
			// Models: snow settling on their tops, a sheen when wet (models-detail-3d.js paint).
			models3d.setWeather(weatherState.snowCover || 0, weatherState.wetness || 0);
			watchList();
			life.fadeTall(covers, dt);
			renderer.render(scene, camera);
			lastFrame = performance.now() - started;
		},
		// Screen point (CSS px in the host) → map point, through the terrain.
		screenToMap(p) {
			const rect = host.getBoundingClientRect();
			ndc.set((p.x / rect.width) * 2 - 1, -(p.y / rect.height) * 2 + 1);
			raycaster.setFromCamera(ndc, camera);
			const hit = raycaster.intersectObject(terrain, true)[0];
			if (hit) return { x: hit.point.x, y: hit.point.z };
			// Off the map: the plane of height 0.
			const t = -raycaster.ray.origin.y / raycaster.ray.direction.y;
			return { x: raycaster.ray.origin.x + raycaster.ray.direction.x * t, y: raycaster.ray.origin.z + raycaster.ray.direction.z * t };
		},
		// Map point (on the ground, optionally raised) → screen point.
		mapToScreen(p, lift = 0) {
			const rect = host.getBoundingClientRect(),
				v = new THREE.Vector3(p.x, heightAt(p.x, p.y) + lift, p.y).project(camera);
			return { x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height, behind: v.z > 1 };
		},
		heightAt,
		canvas: renderer.domElement,
		destroy() {
			canvasRenderer.setBareGround?.(false);
			resizeObserver.disconnect();
			for (const b of batches.values()) b.mesh?.dispose();
			renderer.dispose();
			renderer.forceContextLoss();
			renderer.domElement.remove();
		},
		stats: () => ({
			ms: lastFrame,
			calls: renderer.info.render.calls,
			batches: batchCalls,
			particles: weatherState.particles || 0,
			...life.stats(),
			...scatter.stats(),
			...marks.stats(),
			weather: weatherState.kind ? `${weatherState.kind} ${Math.round((weatherState.intensity || 0) * 100)}%` : "",
			triangles: renderer.info.render.triangles,
			models: records.size,
			looks: looks.size,
			textures: renderer.info.memory.textures,
		}),
	};
	return publicApi;
}
