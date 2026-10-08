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
import { createRelief3D } from "./relief-3d.js";
import { createSunFx3D } from "./sun-fx-3d.js";
import { createPost3D } from "./post-3d.js";
import { createSpace3D } from "./space-3d.js";

export function createThreeRenderer(THREE, host, { canvasRenderer }) {
	const { TYPES } = RTS;
	// models: code-built 3D models where they exist (else the painted decals); fog: fog of war.
	const options = { models: true, fog: true };
	const working = new Set(),
		models3d = createModels3D(THREE),
		COLORS_ART = ["#9ae5cb", "#ed8277"];
	const RISE = 70,
		GROUND_EVERY = 0.5,
		// Ground tiles of 720 × 720 map units (each with its own painting).
		TILE_SIZE = 720,
		TAU = Math.PI * 2;

	// The ground is painted bare: rocks, plants and pebbles are 3D here (render-canvas.js setBareGround).
	canvasRenderer.setBareGround?.(true);
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	// Clipping planes on single materials: the halves of a ship breaking up in space (breakUp).
	renderer.localClippingEnabled = true;
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	host.appendChild(renderer.domElement);
	// The cinematic image (webgl3d/post-3d.js): a high-range frame finished with ambient occlusion, bloom,
	// filmic tone mapping and a colour grade; sky reflections on the materials.
	const post = createPost3D(THREE, renderer);
	// Multisampling of the high-range frame (set with the quality).
	let postSamples = 4;

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
	// The second sun (twin-sun worlds): a soft light without shadows, kept in the scene (intensity 0
	// elsewhere) so the shaders don't change between maps.
	const sun2 = new THREE.DirectionalLight("#ffae70", 0);
	scene.add(hemi, sun, sun.target, sun2, sun2.target);
	// The sky dome (sun, moon, stars, clouds) and the cloud shadows (webgl3d/sky-3d.js).
	const sky = createSky3D(THREE);
	scene.add(sky.mesh);
	// Deep space under and around the orbital battle: the gas giant, its rings, a moon, the starry sphere
	// (webgl3d/space-3d.js); shown only on space maps, in place of the sky dome.
	const space3d = createSpace3D(THREE);
	scene.add(space3d.group);
	// Sunbeams through the clouds and the lens flare (webgl3d/sun-fx-3d.js).
	const sunFx = createSunFx3D(THREE, { scene, heightAt: (x, y) => heightAt(x, y) });

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
	const terrainHeight = createTerrainHeight(),
		relief3d = createRelief3D({ RISE });
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
	// Rally points of the selected producers: a gilded pole with a knob and a cloth waving in the wind
	// (its vertices moved every frame), casting a shadow — instead of a flat flag painted on the ground.
	const RALLY = "#e4c587",
		rallyPole = new THREE.CylinderGeometry(1.2, 1.5, 56, 6).translate(0, 28, 0),
		rallyKnob = new THREE.SphereGeometry(2.6, 8, 6).translate(0, 57, 0),
		rallyPoleMat = new THREE.MeshStandardMaterial({ color: "#c9b27a", roughness: 0.35, metalness: 0.8 }),
		rallyClothMat = new THREE.MeshStandardMaterial({ color: RALLY, emissive: RALLY, emissiveIntensity: 0.25, roughness: 0.8, side: THREE.DoubleSide }),
		rallies = [];
	function rallyFlag() {
		const g = new THREE.Group(),
			cloth = new THREE.PlaneGeometry(32, 18, 8, 3).translate(16, 45, 0);
		const pole = new THREE.Mesh(rallyPole, rallyPoleMat),
			knob = new THREE.Mesh(rallyKnob, rallyPoleMat),
			flag = new THREE.Mesh(cloth, rallyClothMat);
		for (const m of [pole, knob, flag]) m.castShadow = true;
		g.add(pole, knob, flag);
		g.userData.cloth = cloth;
		g.userData.rest = Float32Array.from(cloth.attributes.position.array);
		world.add(g);
		return g;
	}
	function syncRallies() {
		let n = 0;
		for (const id of selected) {
			const b = game.get(id);
			if (!b || !game.isProducer?.(b) || !b.rally) continue;
			const f = rallies[n] || (rallies[n] = rallyFlag());
			n++;
			f.visible = true;
			f.position.set(b.rally.x, heightAt(b.rally.x, b.rally.y), b.rally.y);
			// The cloth streams away from the building and ripples, more at the free end.
			f.rotation.y = -Math.atan2(b.rally.y - b.y, b.rally.x - b.x);
			const pos = f.userData.cloth.attributes.position,
				rest = f.userData.rest;
			for (let i = 0; i < pos.count; i++) {
				const x = rest[i * 3],
					k = x / 32;
				pos.setZ(i, Math.sin(clock * 6 - x * 0.35 + rest[i * 3 + 1] * 0.08) * 3.4 * k);
				pos.setY(i, rest[i * 3 + 1] - k * k * 2);
			}
			pos.needsUpdate = true;
			f.userData.cloth.computeVertexNormals();
		}
		for (let i = n; i < rallies.length; i++) rallies[i].visible = false;
	}
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
		// The relief of the 3D board (webgl3d/relief-3d.js): hills, mesa cliffs, peaks, beds; bare rock.
		const built = relief3d.build(game, { relief: quality.relief }),
			{ cols, rows, cell, data, rock } = built;
		heights = { cols, rows, cell, data };
		// Where low mist lies: from the 15th percentile of the heights (thick) to the median (none).
		{
			const sample = [];
			for (let k = 0; k < data.length; k += 37) sample.push(data[k]);
			sample.sort((a, b) => a - b);
			groundWeather.mistBand.value.set(sample[Math.floor(sample.length * 0.15)], sample[Math.floor(sample.length * 0.5)] + 6);
		}
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
				for (const [a, b] of [[-6, 0], [6, 0], [0, -6], [0, 6], [-4, -4], [4, 4], [-4, 4], [4, -4]]) around += h(i + a, j + b);
				const cavity = around / 8 - data[k],
					slope = 1 - 1 / l;
				shade[k] = Math.max(0.55, Math.min(1.12, 1 - slope * 0.9 - Math.max(0, cavity) * 0.018 + Math.max(0, -cavity) * 0.008));
			}
		const biome = RTS.MISSIONS[game.missionId]?.biome || "dust",
			detail = detailNormals(biome);
		groundWeather.pbrBiome.value = biome === "ice" ? 1 : biome === "ash" ? 2 : 0;
		// Space: the painted starfield is the whole ground (no surface grain, no shadows on it).
		const space = spaceMap();
		groundWeather.spaceGround.value = space ? 1 : 0;
		if (space) groundWeather.pbrOn.value = 0;
		else if (quality.pbr !== false) groundWeather.pbrOn.value = 1;

		for (const t of tiles) {
			terrain.remove(t.mesh);
			t.mesh.geometry.dispose();
			t.mesh.material.normalMap?.dispose();
			t.mesh.material.dispose();
			t.texture.dispose();
		}
		tiles = [];
		// Tiles, each with its own full-resolution painting: a changed deposit repaints and uploads one
		// tile, not the whole map.
		const size = TILE_SIZE;
		for (let y0 = 0; y0 < game.H; y0 += size)
			for (let x0 = 0; x0 < game.W; x0 += size) {
				const w = Math.min(size, game.W - x0),
					h = Math.min(size, game.H - y0),
					geometry = new THREE.PlaneGeometry(w, h, Math.round(w / cell), Math.round(h / cell));
				geometry.rotateX(-Math.PI / 2);
				geometry.translate(x0 + w / 2, 0, y0 + h / 2);
				const pos = geometry.attributes.position,
					nrm = geometry.attributes.normal,
					colors = new Float32Array(pos.count * 3),
					bare = new Float32Array(pos.count);
				for (let k = 0; k < pos.count; k++) {
					const i = Math.round(pos.getX(k) / cell),
						j = Math.round(pos.getZ(k) / cell),
						g = Math.min(rows - 1, j) * cols + Math.min(cols - 1, i);
					pos.setY(k, heightAt(pos.getX(k), pos.getZ(k)));
					nrm.setXYZ(k, normals[g * 3], normals[g * 3 + 1], normals[g * 3 + 2]);
					colors.fill(shade[g], k * 3, k * 3 + 3);
					bare[k] = rock[g];
				}
				geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
				geometry.setAttribute("rock", new THREE.BufferAttribute(bare, 1));
				const canvas = document.createElement("canvas");
				canvas.width = w;
				canvas.height = h;
				const texture = new THREE.CanvasTexture(canvas);
				texture.colorSpace = THREE.SRGBColorSpace;
				texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
				const normalMap = quality.relief && !space ? detail.clone() : null;
				if (normalMap) {
					normalMap.repeat.set(w / 110, h / 110);
					normalMap.needsUpdate = true;
				}
				const mesh = new THREE.Mesh(
					geometry,
					fogged(new THREE.MeshStandardMaterial({ map: texture, vertexColors: true, normalMap, normalScale: new THREE.Vector2(biome === "ice" ? 0.4 : 0.45, biome === "ice" ? 0.4 : 0.45), roughness: biome === "ice" ? 0.55 : 0.95, metalness: 0, transparent: space, depthWrite: !space }), true, true),
				);
				mesh.receiveShadow = !space;
				terrain.add(mesh);
				const tile = { x0, y0, w, h, canvas, texture, mesh, signature: null };
				tiles.push(tile);
				paintTile(tile);
				tile.signature = signature(tile);
			}
		buildOutskirts();
		buildNebula();
	}

	// Space (0.131): the nebula clouds over the gas fields — soft glowing sprites at a few heights, violet
	// and blue, added light (they brighten what is behind them); none on other maps.
	let nebula = null,
		nebulaTexture = null,
		cloudTexture = null;
	function buildNebula() {
		if (nebula) {
			world.remove(nebula);
			nebula.traverse((o) => {
				o.material?.dispose();
				if (o.isPoints) o.geometry.dispose();
			});
			nebula = null;
		}
		if (!spaceMap()) return;
		if (!nebulaTexture) {
			const c = document.createElement("canvas");
			c.width = c.height = 128;
			const x = c.getContext("2d"),
				g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
			g.addColorStop(0, "rgba(255,255,255,1)");
			g.addColorStop(0.35, "rgba(255,255,255,.55)");
			g.addColorStop(1, "rgba(255,255,255,0)");
			x.fillStyle = g;
			x.fillRect(0, 0, 128, 128);
			nebulaTexture = new THREE.CanvasTexture(c);
			nebulaTexture.colorSpace = THREE.SRGBColorSpace;
			// A cloud: many soft blobs of different sizes, denser in the middle (0.137).
			const c2 = document.createElement("canvas");
			c2.width = c2.height = 256;
			const y = c2.getContext("2d");
			let sd = 77;
			const r2 = () => (sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296;
			for (let i = 0; i < 90; i++) {
				const a = r2() * Math.PI * 2,
					d = Math.pow(r2(), 0.8) * 90,
					cx = 128 + Math.cos(a) * d,
					cy = 128 + Math.sin(a) * d,
					rr = 12 + r2() * 46,
					gg = y.createRadialGradient(cx, cy, 0, cx, cy, rr);
				gg.addColorStop(0, `rgba(255,255,255,${(0.08 + r2() * 0.12).toFixed(3)})`);
				gg.addColorStop(1, "rgba(255,255,255,0)");
				y.fillStyle = gg;
				y.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
			}
			cloudTexture = new THREE.CanvasTexture(c2);
			cloudTexture.colorSpace = THREE.SRGBColorSpace;
		}
		nebula = new THREE.Group();
		const R = RTS.SPACE?.nebula?.radius || 230;
		// Layers of cloud from below the plane to over the ships: as the camera moves they slide apart and
		// the cloud reads as a volume.
		(game.gasFields || []).forEach((f, i) => {
			for (let k = 0; k < 12; k++) {
				const a = k * 2.4 + i,
					d = k ? R * (0.3 + ((k * 37) % 10) / 16) : 0,
					m = new THREE.SpriteMaterial({ map: k % 2 ? cloudTexture : nebulaTexture, color: new THREE.Color(k % 3 === 1 ? "#4f86e6" : k % 3 === 2 ? "#c05ad8" : "#8a46e0"), transparent: true, opacity: k % 2 ? 0.12 : 0.04, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
					sprite = new THREE.Sprite(m),
					size = R * (0.9 + ((k * 53) % 9) / 10);
				sprite.position.set(f.x + Math.cos(a) * d, -60 + ((k * 29) % 170), f.y + Math.sin(a) * d);
				sprite.scale.set(size, size, 1);
				m.rotation = a;
				nebula.add(sprite);
			}
		});
		// Space dust and ice specks at many heights over the plane: they slide against each other and the
		// painted stars as the camera moves, so the board reads as deep space.
		const area = (game.W * game.H) / (3360 * 2160),
			count = Math.round(2600 * area),
			pos = new Float32Array(count * 3),
			col = new Float32Array(count * 3);
		let seed = 4711;
		const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
		for (let i = 0; i < count; i++) {
			pos.set([rnd() * game.W, 6 + Math.pow(rnd(), 1.6) * 220, rnd() * game.H], i * 3);
			const warm = rnd() < 0.2,
				b = 0.35 + rnd() * 0.65;
			col.set(warm ? [b, b * 0.85, b * 0.7] : [b * 0.8, b * 0.9, b], i * 3);
		}
		const dust = new THREE.BufferGeometry();
		dust.setAttribute("position", new THREE.BufferAttribute(pos, 3));
		dust.setAttribute("color", new THREE.BufferAttribute(col, 3));
		nebula.add(new THREE.Points(dust, new THREE.PointsMaterial({ size: 3.2, map: nebulaTexture, vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false })));
		world.add(nebula);
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
		// Bare rock: the mean ground colour, darker and a little greyer (the terrain shader).
		const mean = new THREE.Color(`rgb(${r},${g},${b})`);
		groundWeather.rockTint.value.copy(mean).lerp(new THREE.Color(mean.r * 0.3 + mean.g * 0.55 + mean.b * 0.15, mean.r * 0.3 + mean.g * 0.55 + mean.b * 0.15, mean.r * 0.3 + mean.g * 0.55 + mean.b * 0.15), 0.3).multiplyScalar(0.82);
		let low = Infinity;
		for (let x = 0; x <= game.W; x += 48) low = Math.min(low, heightAt(x, 0), heightAt(x, game.H));
		for (let y = 0; y <= game.H; y += 48) low = Math.min(low, heightAt(0, y), heightAt(game.W, y));
		// A ring round the map (a hole where the map is): under the map it would cover deep lake beds.
		const size = Math.max(game.W, game.H) * 4,
			ring = new THREE.Shape([new THREE.Vector2(-size, size), new THREE.Vector2(game.W + size, size), new THREE.Vector2(game.W + size, -game.H - size), new THREE.Vector2(-size, -game.H - size)]);
		ring.holes.push(new THREE.Path([new THREE.Vector2(4, -4), new THREE.Vector2(4, -game.H + 4), new THREE.Vector2(game.W - 4, -game.H + 4), new THREE.Vector2(game.W - 4, -4)]));
		const geometry = new THREE.ShapeGeometry(ring).rotateX(-Math.PI / 2);
		outskirts = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${r},${g},${b})`).multiplyScalar(0.7), roughness: 1, metalness: 0 }));
		outskirts.position.set(0, low - 3, 0);
		outskirts.receiveShadow = true;
		// Space: no land round the map — deep space goes on.
		outskirts.visible = !spaceMap();
		world.add(outskirts);
	}

	// Fog of war on the ground: visible 255, explored 110, unknown 25, smoothed (see refreshFog); the
	// terrain shader darkens and desaturates by it.
	const fogUniforms = { fogMap: { value: null }, fogSize: { value: new THREE.Vector2(1, 1) }, fogOn: { value: 1 }, fogTime: { value: 0 } },
		groundWeather = { wetness: { value: 0 }, snowCover: { value: 0 }, rainLevel: { value: 0 }, weatherTime: { value: 0 }, skyTint: { value: new THREE.Color() }, rockTint: { value: new THREE.Color("#7a6a58") }, sandLevel: { value: 0 }, mistLevel: { value: 0 }, mistBand: { value: new THREE.Vector2(0, 40) }, pbrOn: { value: 1 }, pbrBiome: { value: 0 }, spaceGround: { value: 0 }, ionLevel: { value: 0 } };
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
		// 1 while the board is drawn into the high-range frame: the interface's sRGB colours are made linear.
		overlayLinear: { value: 0 },
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
		uniform float wetness; uniform float snowCover; uniform float rainLevel; uniform float weatherTime; uniform vec3 skyTint; uniform vec3 rockTint; uniform float sandLevel; uniform float mistLevel; uniform vec2 mistBand;
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
				// Thin rings of different sizes, gone before they grow large.
				s += smoothstep(0.32, 0.0, abs(d - ph * (2.0 + 2.5 * wHash(c + 5.7)))) * (1.0 - ph) * (1.0 - ph);
			}
			return s;
		}
		float puddleMask = 0.0;
		float snowMask = 0.0;
		#ifdef TERRAIN
		varying float vRock; varying float vWorldY;
		// Terrain materials (stage 2): the world normal, the switch and the planet's kind of ground
		// (0 sand, 1 ice and snow, 2 ash, soil and lava fields).
		varying vec3 vTerrN; uniform float pbrOn; uniform float pbrBiome;
		float pbrH = 0.0, pbrRough = -1.0, pbrRockK = 0.0;
		float tFbm(vec2 p) { return wNoise(p) * 0.5 + wNoise(p * 2.03 + 1.7) * 0.25 + wNoise(p * 4.01 + 3.1) * 0.125 + wNoise(p * 8.05 + 5.3) * 0.0625; }
		// A pattern laid on the three planes and blended by the normal: no stretching on steep faces.
		float tTri(vec3 p, vec3 n, float s) {
			vec3 w = pow(abs(n), vec3(4.0));
			w /= w.x + w.y + w.z;
			return tFbm(p.yz * s) * w.x + tFbm(p.xz * s) * w.y + tFbm(p.xy * s) * w.z;
		}
		#endif`;
	const GROUND_COLOR = `
		#ifdef TERRAIN
		// Bare rock on cliffs, peaks and steep slopes: the ground's colour darkened and greyed, in strata
		// (bands by height, wavering), with grain; the rock never holds puddles or much snow.
		{
			// The painted ground stretches on a wall: the stone takes the map's mean ground colour instead,
			// with grain running along the wall and up it (not seen from above).
			vec2 wall = vec2((vMapXY.x + vMapXY.y) * 0.7, vWorldY);
			float band = sin(vWorldY * 0.55 + wNoise(vMapXY * 0.018) * 4.0) * 0.5 + 0.5;
			float grain = wNoise(wall * vec2(0.18, 0.5)) * 0.55 + wNoise(wall * vec2(0.05, 0.12)) * 0.45;
			float r = smoothstep(0.1, 0.6, vRock);
			vec3 stone = rockTint * mix(0.68, 1.05, band) * (0.78 + 0.44 * grain);
			diffuseColor.rgb = mix(diffuseColor.rgb, stone, r);
		}
		// Terrain materials: broad patches that break the painting's repetition, paler high ground and darker
		// hollows, stone on every steep face (on three planes, in strata), and the planet's own fine ground —
		// wind ripples in sand, drifts and cracks in ice, grit and clods in ash and soil. pbrH is a small
		// height field for the lighting (normal_fragment_maps), flat far away so it never shimmers.
		if (pbrOn > 0.5) {
			vec3 wp = vec3(vMapXY.x, vWorldY, vMapXY.y), n = normalize(vTerrN);
			float slope = 1.0 - n.y, near = 1.0 - smoothstep(2200.0, 4800.0, length(vViewPosition));
			diffuseColor.rgb *= mix(0.74, 1.2, smoothstep(0.2, 0.8, tFbm(vMapXY * 0.0022)));
			diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 1.0, 0.92), smoothstep(0.55, 0.8, tFbm(vMapXY * 0.0007 + 9.0)) * 0.5);
			diffuseColor.rgb *= mix(0.9, 1.06, smoothstep(mistBand.x, mistBand.y + 40.0, vWorldY));
			float rockK = max(smoothstep(0.1, 0.6, vRock), smoothstep(0.3, 0.55, slope)), tri = tTri(wp, n, 0.045);
			vec3 stone = rockTint * (0.62 + 0.55 * tri) * mix(0.75, 1.05, sin(vWorldY * 0.55 + tri * 5.0) * 0.5 + 0.5);
			diffuseColor.rgb = mix(diffuseColor.rgb, stone, rockK * 0.85);
			float fine;
			if (pbrBiome < 0.5) {
				vec2 q = vMapXY + vec2(tFbm(vMapXY * 0.02) * 30.0, tFbm(vMapXY * 0.02 + 4.0) * 12.0);
				fine = (sin(dot(q, vec2(0.15, 0.055))) * 0.5 + 0.5) * 0.7 + tFbm(vMapXY * 0.12) * 0.3;
				pbrRough = 0.93;
			} else if (pbrBiome < 1.5) {
				float crack = 1.0 - smoothstep(0.0, 0.05, abs(tFbm(vMapXY * 0.03) - 0.5));
				fine = tFbm(vMapXY * 0.05) * 0.7 + 0.3 * (1.0 - crack);
				diffuseColor.rgb *= 1.0 - crack * 0.18 * near;
				pbrRough = mix(0.5, 0.28, crack);
			} else {
				fine = tFbm(vMapXY * 0.09) * 0.6 + smoothstep(0.7, 0.9, wNoise(vMapXY * 0.25)) * 0.4;
				pbrRough = 0.97;
			}
			diffuseColor.rgb *= mix(1.0, mix(0.82, 1.1, fine), near * (1.0 - rockK));
			pbrH = mix(fine, tri, rockK) * near;
			pbrRough = mix(pbrRough, 0.82, rockK);
			pbrRockK = rockK;
		}
		float wn = wNoise(vMapXY * 0.011) * 0.65 + wNoise(vMapXY * 0.043) * 0.35;
		puddleMask = smoothstep(0.86, 0.97, vUpward) * smoothstep(0.86 - wetness * 0.18, 0.9 - wetness * 0.18, wn) * smoothstep(0.12, 0.45, wetness) * (1.0 - smoothstep(0.1, 0.4, vRock));
		#endif
		// A sandstorm: streams of sand snaking fast over the ground along the wind (lighter streaks).
		if (sandLevel > 0.01) {
			vec2 wd = normalize(vec2(0.35, 0.12)), q = vec2(dot(vMapXY, wd) * 0.018 - weatherTime * 2.6, dot(vMapXY, vec2(-wd.y, wd.x)) * 0.12);
			float stream = smoothstep(0.58, 0.85, wNoise(q) * 0.7 + wNoise(q * vec2(2.0, 3.1) + 3.3) * 0.3) * smoothstep(0.5, 0.9, vUpward);
			diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.22 + vec3(0.05, 0.04, 0.02), stream * sandLevel * 0.55);
		}
		diffuseColor.rgb *= 1.0 - 0.32 * wetness;
		diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.42 + vec3(0.03, 0.04, 0.05), puddleMask);
		// Snow settles in patches first (noise), then nearly everywhere (a few bare spots stay); not on
		// steep ground nor on bare rock walls. Bright, faintly blue in the hollows, with ripples blown by the
		// wind; thin and grey at the edges of a patch, the ground showing through.
		float sn = wNoise(vMapXY * 0.008) * 0.55 + wNoise(vMapXY * 0.05) * 0.3 + wNoise(vMapXY * 0.21) * 0.15, th = 1.05 - snowCover * 1.15;
		float settle = smoothstep(0.55, 0.9, vUpward);
		#ifdef TERRAIN
		settle *= 1.0 - 0.75 * smoothstep(0.2, 0.7, vRock);
		#endif
		snowMask = settle * smoothstep(th - 0.06, th + 0.06, sn) * min(1.0, snowCover * 3.0);
		float ripple = sin(dot(vMapXY, vec2(0.21, 0.13)) + wNoise(vMapXY * 0.03) * 6.0) * 0.5 + 0.5;
		vec3 snowColor = mix(vec3(0.76, 0.82, 0.92), vec3(0.95, 0.97, 1.0), 0.55 + 0.25 * ripple + 0.2 * wNoise(vMapXY * 0.4));
		snowColor = mix(diffuseColor.rgb * 0.65 + vec3(0.28, 0.3, 0.33), snowColor, smoothstep(0.0, 0.65, snowMask));
		diffuseColor.rgb = mix(diffuseColor.rgb, snowColor, smoothstep(0.0, 0.35, snowMask));`;
	const GROUND_ROUGH = `
		#ifdef TERRAIN
		if (pbrRough >= 0.0) roughnessFactor = pbrRough;
		#endif
		roughnessFactor = mix(roughnessFactor, 0.5, wetness * 0.8);
		roughnessFactor = mix(roughnessFactor, 0.04, puddleMask);
		roughnessFactor = mix(roughnessFactor, 0.55, snowMask);`;
	// Stage 2: the small height field of the terrain materials bends the normal (bump mapping from the
	// screen-space derivatives of the height), stronger on stone.
	const GROUND_BUMP = `
		#ifdef TERRAIN
		if (pbrOn > 0.5) {
			float amp = mix(6.0, 9.0, pbrRockK);
			vec3 sp = -vViewPosition, sx = dFdx(sp), sy = dFdy(sp);
			vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
			float det = dot(sx, r1);
			vec3 grad = sign(det) * (dFdx(pbrH) * amp * r1 + dFdy(pbrH) * amp * r2);
			normal = normalize(abs(det) * normal - grad);
		}
		#endif`;
	const GROUND_GLOW = `
		totalEmissiveRadiance += skyTint * puddleMask * 0.1;
		#ifdef TERRAIN
		// Low mist lying over the lower ground (dawn, dusk, rain, snow, night): drifting patches in the
		// colour of the sky, thickest in the lowest parts of the map.
		if (mistLevel > 0.01) {
			float mistK = mistLevel * smoothstep(mistBand.y, mistBand.x, vWorldY) * smoothstep(0.3, 0.75, wNoise(vMapXY * 0.004 + vec2(weatherTime * 0.012, weatherTime * 0.007)) * 0.65 + wNoise(vMapXY * 0.013 - vec2(weatherTime * 0.02, 0.0)) * 0.35);
			totalEmissiveRadiance = mix(totalEmissiveRadiance, skyTint * 0.85 + vec3(0.06, 0.065, 0.07), mistK * 0.65);
			diffuseColor.rgb *= 1.0 - mistK * 0.35;
		}
		#endif
		totalEmissiveRadiance += vec3(0.75, 0.82, 0.9) * puddleMask * rainLevel * wRipples(vMapXY, weatherTime) * 0.12;
		// Glints of snow crystals: rare, tiny, twinkling.
		totalEmissiveRadiance += vec3(step(0.993, wHash(floor(vMapXY * 1.7) + floor(weatherTime * 0.7))) * snowMask * 0.3);`;
	const FOG_NOISE = `
		float fwHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
		float fwNoise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			f = f * f * (3.0 - 2.0 * f);
			return mix(mix(fwHash(i), fwHash(i + vec2(1.0, 0.0)), f.x), mix(fwHash(i + vec2(0.0, 1.0)), fwHash(i + vec2(1.0, 1.0)), f.x), f.y);
		}`;
	function fogged(material, ground = false, terrain = false) {
		if (terrain) material.defines = { ...material.defines, TERRAIN: "" };
		// Its own shader program per kind (ground or not), with whatever wraps onBeforeCompile later
		// (wind, water): the source of the hook alone would not tell them apart.
		material.customProgramCacheKey = () => "fogged|" + ground + "|" + terrain + "|" + material.onBeforeCompile.toString();
		material.onBeforeCompile = (shader) => {
			Object.assign(shader.uniforms, fogUniforms, overlayUniforms, groundWeather);
			cloudShade(THREE, shader);
			nightLightShade(shader);
			if (ground) {
				shader.vertexShader = shader.vertexShader
					.replace("#include <common>", "#include <common>\nvarying float vUpward;")
					.replace("#include <defaultnormal_vertex>", "#include <defaultnormal_vertex>\nvUpward = normalize((vec4(transformedNormal, 0.0) * viewMatrix).xyz).y;"); // normalised: instancing scales the normal
				if (terrain)
					shader.vertexShader = shader.vertexShader
						.replace("#include <common>", "#include <common>\nattribute float rock;\nvarying float vRock;\nvarying float vWorldY;\nvarying vec3 vTerrN;")
						.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvRock = rock;\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;\nvTerrN = normalize(mat3(modelMatrix) * objectNormal);");
				shader.fragmentShader = shader.fragmentShader
					.replace("#include <common>", "#include <common>\n" + GROUND_COMMON)
					.replace("#include <map_fragment>", "#include <map_fragment>\n" + GROUND_COLOR)
					.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n" + GROUND_ROUGH)
					.replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n" + GROUND_BUMP)
					.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + GROUND_GLOW);
			}
			shader.vertexShader = shader.vertexShader
				.replace("#include <common>", "#include <common>\nvarying vec2 vMapXY;")
				// The map point of the vertex (instanced meshes included: scattered stones and grass).
				.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvec4 mapPoint = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nmapPoint = instanceMatrix * mapPoint;\n#endif\nvMapXY = (modelMatrix * mapPoint).xz;");
			shader.fragmentShader = shader.fragmentShader
				.replace(
					"#include <common>",
					"#include <common>\nvarying vec2 vMapXY;\nuniform float spaceGround;\nuniform float ionLevel;\nuniform sampler2D fogMap;\nuniform float fogOn;\nuniform float fogTime;\nuniform vec2 fogSize;\nuniform sampler2D overlayMap;\nuniform float overlayLinear;\nuniform float overlayOn;\nuniform vec4 overlayFrame;\nuniform vec2 overlaySize;\n" + FOG_NOISE,
				)
				.replace(
					"#include <dithering_fragment>",
					`#include <dithering_fragment>
					// Fog of war: the edge of sight ragged and shifting (drifting noise); what was seen before
					// in cool grey, remembered; the unknown under dark murk slowly drifting over the land.
					float raw = texture2D(fogMap, vMapXY / fogSize).r;
					float drift = fwNoise(vMapXY * 0.011 + vec2(fogTime * 0.018, fogTime * 0.011)) * 0.6 + fwNoise(vMapXY * 0.034 - vec2(fogTime * 0.03, 0.0)) * 0.4;
					float seen = mix(1.0, clamp(raw + (drift - 0.5) * 0.4 * (1.0 - raw * raw), 0.0, 1.0), fogOn);
					vec3 grey = vec3(dot(gl_FragColor.rgb, vec3(0.3, 0.55, 0.15)));
					gl_FragColor.rgb = mix(grey * vec3(0.58, 0.66, 0.8), gl_FragColor.rgb, smoothstep(0.35, 0.95, seen)) * (0.25 + 0.75 * seen);
					float unknown = (1.0 - smoothstep(0.08, 0.3, seen)) * fogOn;
					gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.05, 0.065, 0.09) * (0.6 + 0.8 * drift), unknown * 0.5);
					if (overlayOn > 0.5) {
						vec2 f = ((vMapXY - overlayFrame.xy) * overlayFrame.z + overlaySize * 0.5) / overlaySize;
						if (f.x > 0.0 && f.x < 1.0 && f.y > 0.0 && f.y < 1.0) {
							vec4 ui = texture2D(overlayMap, vec2(f.x, 1.0 - f.y));
							gl_FragColor.rgb = mix(gl_FragColor.rgb, overlayLinear > 0.5 ? pow(ui.rgb, vec3(2.2)) * 1.25 : ui.rgb, ui.a);
						}
					}
					#ifdef TERRAIN
					// Space (the orbital battle): the plane of the battle is see-through — deep space shows
					// below it; what was seen before lies under a thin dark veil, the unknown under a thicker
					// one, and the interface layer (orders, selections, ghosts) stays on it.
					if (spaceGround > 0.5) {
						float veil = clamp((1.0 - seen) * 0.42 * fogOn + unknown * 0.16, 0.0, 0.62);
						vec3 murk = vec3(0.008, 0.012, 0.024) * (0.6 + 0.8 * drift);
						vec4 ui2 = vec4(0.0);
						if (overlayOn > 0.5) {
							vec2 f2 = ((vMapXY - overlayFrame.xy) * overlayFrame.z + overlaySize * 0.5) / overlaySize;
							if (f2.x > 0.0 && f2.x < 1.0 && f2.y > 0.0 && f2.y < 1.0) {
								ui2 = texture2D(overlayMap, vec2(f2.x, 1.0 - f2.y));
								ui2.rgb = overlayLinear > 0.5 ? pow(ui2.rgb, vec3(2.2)) * 1.25 : ui2.rgb;
							}
						}
						// A faint tactical grid where the side sees, and a glowing frame along the edge of the map.
						// An ion storm: the grid flickers, tears sideways in bands and turns violet.
						float tear = step(0.8, fract(sin(floor(vMapXY.y / 60.0) * 12.9898 + floor(fogTime * 6.0)) * 43758.5)) * ionLevel;
						vec2 cellXY = abs(fract((vMapXY + vec2(tear * 40.0, 0.0)) / 400.0) - 0.5) * 400.0;
						float grid = smoothstep(197.0, 199.6, max(cellXY.x, cellXY.y));
						float edge = min(min(vMapXY.x, vMapXY.y), min(fogSize.x - vMapXY.x, fogSize.y - vMapXY.y));
						float frame = exp(-max(edge, 0.0) / 7.0) + exp(-max(edge, 0.0) / 60.0) * 0.12;
						vec3 holo = mix(vec3(0.3, 0.75, 0.95), vec3(0.7, 0.4, 1.0), ionLevel);
						float holoA = (grid * 0.06 * smoothstep(0.4, 0.9, seen) + frame * 0.45) * (1.0 + ionLevel * (0.8 * sin(fogTime * 23.0 + vMapXY.x * 0.01) - 0.2));
						vec3 base = mix(murk, holo, holoA / max(0.001, holoA + veil));
						float a = max(veil, holoA);
						gl_FragColor = vec4(mix(base, ui2.rgb, ui2.a), max(a, ui2.a));
					}
					#endif`,
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
		// In space the deposits and relay buoys float: their signs higher.
		const up = spaceMap() ? 40 : 0;
		deposit("ore", game.ores, (o) => BoardArt.resourceLabel(o, false), 30 + up);
		deposit("gas", game.gasFields, (o) => BoardArt.resourceLabel(o, true), 30 + up);
		deposit("crystal", game.crystalFields, (o) => BoardArt.crystalLabel(o), 40 + up);
		// Salvage wrecks: their metal value (SupportArt.wrecks caption).
		for (const w of game.wrecks || []) if (explored(w)) sign("salvage" + w.id, [{ text: "WRAK · " + w.value, color: "#c9b98f" }], w.x, w.y, 34);
		const v = labelView();
		for (const n of game.nodes || []) {
			if (!explored(n)) continue;
			const shown = game.isVisible(n.x, n.y) || n.owner === (game.viewer ?? 0) ? n : { ...n, owner: -1, progress: 0 },
				l = canvasRenderer.nodeLabel(v, shown);
			sign("node" + n.name + n.x, [{ text: l.name, color: l.color }, { text: l.status, color: "#9aaba7" }], n.x, n.y, 70 + up * 0.4);
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
		const lift = building ? buildingHeight(s) * (e.constructionLeft > 0 ? 0.35 : 1) + 0.5 : s.flying ? 90 : s.ship ? (RTS.SPACE?.hover ?? 34) : e.type === "worker" && spaceMap() ? DRONE_HOVER : 2;
		if (r.plinth) r.plinth.scale.y = Math.max(1, lift - 0.5);
		if (r.plinth) r.plinth.position.y = r.plinth.scale.y / 2;
		r.decal.position.y = lift;
	}

	// Code-built 3D model (webgl3d/models-3d.js): turret aim, recoil, walking and construction.
	// Collapsing models of the destroyed (1.2 s): buildings sink and lean, vehicles and walkers tip over
	// and sink; still drawn in the batches while they go.
	const dying = [];
	// A ship destroyed in space breaks in two (0.135.2): two copies of its parts, each cut by a slanted
	// plane at the break — the bow flies on and up, the stern back and down, both tumbling the opposite
	// ways and sinking below the plane; embers glow along the broken edges and fade; a dozen fragments of
	// hull (some burning) fly out in every direction, spinning, shrinking away.
	const FRAGMENT = { geos: [new THREE.TetrahedronGeometry(1), new THREE.BoxGeometry(1.6, 0.5, 1), new THREE.OctahedronGeometry(0.9)], hull: new THREE.MeshStandardMaterial({ color: "#5d6366", roughness: 0.6, metalness: 0.6, flatShading: true }), ember: new THREE.MeshBasicMaterial({ color: "#ff8a3c", fog: false, toneMapped: false }) };
	const breakTmp = { inv: new THREE.Matrix4(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), axis: new THREE.Vector3() };
	function breakUp(d) {
		const root = d.r.model.root;
		root.updateWorldMatrix(true, true);
		breakTmp.inv.copy(root.matrixWorld).invert();
		const parts = [];
		let reach = 4;
		root.traverse((o) => {
			if (!o.isMesh || !o.visible) return;
			const rel = new THREE.Matrix4().multiplyMatrices(breakTmp.inv, o.matrixWorld);
			parts.push({ geometry: o.geometry, material: o.material, rel });
			o.geometry.boundingSphere || o.geometry.computeBoundingSphere();
			breakTmp.v.setFromMatrixPosition(rel);
			reach = Math.max(reach, Math.abs(breakTmp.v.x) + o.geometry.boundingSphere.radius * 0.5);
		});
		const wreck = new THREE.Group(),
			cut = (d.spin * 0.6) * reach * 0.3,
			tilt = new THREE.Vector3(1, d.spin * 0.5, 0.35 - d.spin * 0.4).normalize(),
			halves = [];
		root.matrixWorld.decompose(wreck.position, wreck.quaternion, wreck.scale);
		for (const side of [1, -1]) {
			const pivot = new THREE.Group(),
				plane = new THREE.Plane(tilt.clone().multiplyScalar(side), -cut * side),
				clip = new THREE.Plane(),
				materials = [];
			for (const p of parts) {
				const m = (Array.isArray(p.material) ? p.material[0] : p.material).clone();
				m.clippingPlanes = [clip];
				m.side = THREE.DoubleSide;
				materials.push(m);
				const mesh = new THREE.Mesh(p.geometry, m);
				mesh.matrixAutoUpdate = false;
				mesh.matrix.copy(p.rel);
				pivot.add(mesh);
			}
			// The glowing broken edge.
			const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glareTexture, color: "#ff8a3c", blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
			glow.position.set(cut, 0, 0);
			glow.scale.setScalar(reach * 1.4);
			pivot.add(glow);
			materials.push(glow.material);
			wreck.add(pivot);
			halves.push({ pivot, plane, clip, materials, glow, side, axis: new THREE.Vector3(side * 0.3, 1, d.spin).normalize(), roll: (0.7 + Math.abs(d.spin)) * side });
		}
		// Fragments.
		const fragments = [];
		// A station throws out more pieces (and heavier ones) than a ship.
		const pieces = d.building ? 22 : 14;
		for (let i = 0; i < pieces; i++) {
			const ember = i % 4 === 0,
				mesh = new THREE.Mesh(FRAGMENT.geos[i % 3], ember ? FRAGMENT.ember : FRAGMENT.hull),
				a = i * 2.399 + d.spin * 7,
				u = ((i * 0.37 + d.spin) % 1) * 2 - 1,
				r = Math.sqrt(Math.max(0, 1 - u * u)),
				speed = reach * (1.2 + (i % 5) * 0.45) * (d.building ? 0.6 : 1);
			mesh.position.set(cut, 0, 0);
			const size = reach * (0.06 + (i % 4) * 0.035);
			mesh.scale.setScalar(size);
			wreck.add(mesh);
			fragments.push({ mesh, size, v: new THREE.Vector3(Math.cos(a) * r, u * 0.6, Math.sin(a) * r).multiplyScalar(speed), spin: new THREE.Vector3((i % 3) - 1, ((i + 1) % 3) - 1, 1).normalize(), rate: 2 + (i % 4) });
		}
		world.add(wreck);
		root.visible = false;
		return { wreck, halves, fragments, reach };
	}
	function animateBreak(d, k, dt) {
		const b = d.broken,
			ease = 1 - Math.pow(1 - k, 2),
			// A station is heavier: its halves part and turn more slowly.
			heavy = d.building ? 0.55 : 1;
		for (const h of b.halves) {
			// Apart along the axis, drifting a little up (bow) or down (stern), sinking with time.
			h.pivot.position.set(h.side * b.reach * 1.1 * ease * heavy, (h.side * 0.25 * heavy - 0.9 * k) * b.reach * 1.2 * k, d.spin * b.reach * 0.4 * ease * heavy);
			h.pivot.quaternion.setFromAxisAngle(h.axis, h.roll * 0.9 * k * heavy);
			h.pivot.updateMatrixWorld(true);
			h.clip.copy(h.plane).applyMatrix4(h.pivot.matrixWorld);
			h.glow.material.opacity = Math.max(0, 1 - k * 1.6) * (0.75 + 0.25 * Math.sin(d.t * 23 + h.side));
			const fade = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
			h.pivot.scale.setScalar(Math.max(0.001, fade));
		}
		for (const f of b.fragments) {
			f.mesh.position.addScaledVector(f.v, dt / Math.max(0.001, b.wreck.scale.x));
			f.mesh.rotateOnAxis(f.spin, f.rate * dt);
			f.mesh.scale.setScalar(Math.max(0.001, f.size * (1 - k * 0.9)));
		}
	}
	function endBreak(d) {
		world.remove(d.broken.wreck);
		for (const h of d.broken.halves) for (const m of h.materials) m.dispose();
	}
	function collapse(dt) {
		for (let i = dying.length - 1; i >= 0; i--) {
			const d = dying[i];
			d.t += dt;
			const k = Math.min(1, d.t / (d.space ? (d.building ? 4.5 : 3.5) : 1.2)),
				root = d.r.model.root;
			(d.tint ??= new THREE.Color()).setScalar(1 - 0.7 * Math.min(1, k * 2));
			// From where it was: aircraft, ships and stations in space fall from their height.
			d.y0 ??= root.position.y;
			if (d.space) {
				// Space: the ship breaks in two and to pieces (breakUp); only the wreck moves on.
				d.broken ??= breakUp(d);
				animateBreak(d, k, dt);
			} else if (d.building) {
				root.position.y = d.y0 - k * k * 40;
				root.rotation.z = d.spin * 0.25 * k;
				root.rotation.x = d.spin * 0.15 * k;
			} else {
				root.rotation.z = (d.spin > 0 ? 1 : -1) * Math.min(1, k * 2.5) * 1.3;
				root.position.y = d.y0 * (1 - k * k) - k * k * 14;
			}
			if (d.r.scaffold) d.r.scaffold.root.visible = false;
			if (k >= 1) {
				world.remove(d.r.group);
				if (d.broken) endBreak(d);
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
		// Ships of the orbital battle hover over the plane of the battle (space-rules.js).
		else if (s.ship) r.model.root.position.y = RTS.SPACE?.hover ?? 34;
		// The mining drone hovers a little lower than the warships.
		else if (e.type === "worker" && spaceMap()) r.model.root.position.y = DRONE_HOVER;
		// Stations of the orbital battle float on their platforms (webgl3d/ships-3d.js).
		else if (building) r.model.root.position.y = stationLift(e, s);
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
	const life = createSceneLife3D(THREE, { world, heightAt: (x, y) => heightAt(x, y), models3d, hiddenLayer: HIDDEN_LAYER, splash: (x, y, z) => fx.shot("splash", x, y, z) });

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
		// Tracers: streaks along their flight turned to face the camera — a white-hot core, a soft glow
		// round it in the shot's colour, the head brightest, fading towards the tail.
		tracers = new THREE.InstancedMesh(
			new THREE.PlaneGeometry(1, 1),
			new THREE.ShaderMaterial({
				vertexShader: `varying vec2 vUv; varying vec3 vTint;
					void main() {
						mat4 w = modelMatrix * instanceMatrix;
						vec3 centre = (w * vec4(0.0, 0.0, 0.0, 1.0)).xyz, axis = mat3(w) * vec3(1.0, 0.0, 0.0), across = mat3(w) * vec3(0.0, 1.0, 0.0);
						vec3 side = normalize(cross(axis, cameraPosition - centre)) * length(across);
						vUv = uv;
						vTint = instanceColor;
						gl_Position = projectionMatrix * viewMatrix * vec4(centre + axis * position.x + side * position.y, 1.0);
					}`,
				fragmentShader: `varying vec2 vUv; varying vec3 vTint;
					void main() {
						float v = abs(vUv.y - 0.5) * 2.0, along = pow(vUv.x, 1.6);
						float core = pow(1.0 - v, 6.0), glow = pow(1.0 - v, 1.8) * 0.45;
						float head = smoothstep(0.82, 1.0, vUv.x) * 0.8;
						vec3 col = mix(vTint, vec3(1.0, 0.97, 0.88), core) * (core + glow) * (along + head);
						gl_FragColor = vec4(col, 1.0);
					}`,
				transparent: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				side: THREE.DoubleSide,
			}),
			MAX_TRACERS,
		);
	tracers.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TRACERS * 3), 3);
	tracers.frustumCulled = false;
	world.add(tracers);
	// The anamorphic streak of explosions in space (0.135): a thin horizontal flare, bright in the middle.
	const streakTexture = (() => {
		const c = document.createElement("canvas");
		c.width = 256;
		c.height = 32;
		const x = c.getContext("2d"),
			g = x.createLinearGradient(0, 0, 256, 0);
		g.addColorStop(0, "rgba(255,255,255,0)");
		g.addColorStop(0.42, "rgba(255,255,255,.35)");
		g.addColorStop(0.5, "rgba(255,255,255,1)");
		g.addColorStop(0.58, "rgba(255,255,255,.35)");
		g.addColorStop(1, "rgba(255,255,255,0)");
		x.fillStyle = g;
		x.fillRect(0, 0, 256, 32);
		x.globalCompositeOperation = "destination-in";
		const v = x.createLinearGradient(0, 0, 0, 32);
		v.addColorStop(0, "rgba(0,0,0,0)");
		v.addColorStop(0.5, "rgba(0,0,0,1)");
		v.addColorStop(1, "rgba(0,0,0,0)");
		x.fillStyle = v;
		x.fillRect(0, 0, 256, 32);
		return new THREE.CanvasTexture(c);
	})();
	// Ship shields in space (0.136): a bubble with a bright rim (Fresnel) and a flare where the shot struck,
	// hexagonal cells shimmering across it; added light.
	const bubbles = [],
		bubbleGeometry = new THREE.IcosahedronGeometry(1, 3),
		bubbleMaterial = () =>
			new THREE.ShaderMaterial({
				uniforms: { uHit: { value: new THREE.Vector3(1, 0, 0) }, uK: { value: 1 } },
				vertexShader: `varying vec3 vN; varying vec3 vView; varying vec3 vLocal;
					void main() { vLocal = normalize(position); vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vView = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
				fragmentShader: `varying vec3 vN; varying vec3 vView; varying vec3 vLocal; uniform vec3 uHit; uniform float uK;
					void main() {
						float rim = pow(1.0 - abs(dot(normalize(vN), vView)), 2.5);
						float hit = pow(max(0.0, dot(vLocal, uHit)), 6.0);
						vec2 h = vLocal.xz * 9.0 + vLocal.y * 4.0;
						float cells = smoothstep(0.85, 1.0, max(abs(fract(h.x) - 0.5), abs(fract(h.y + h.x * 0.5) - 0.5)) * 2.0);
						float a = (rim * 0.5 + hit * 1.4 + cells * hit * 0.8) * uK;
						gl_FragColor = vec4(vec3(0.45, 0.8, 1.0) * a, 1.0);
					}`,
				transparent: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				side: THREE.DoubleSide,
				fog: false,
			});
	// Altitude lines of ships in space (see the effects pass): line segments, one pixel wide.
	const ALT_MAX = 6 * 200,
		ALT_OWN = new THREE.Color("#3fae8c").multiplyScalar(0.55),
		ALT_FOE = new THREE.Color("#c0503c").multiplyScalar(0.55),
		altGeometry = new THREE.BufferGeometry(),
		altPos = new Float32Array(ALT_MAX * 3),
		altCol = new Float32Array(ALT_MAX * 3);
	altGeometry.setAttribute("position", new THREE.BufferAttribute(altPos, 3).setUsage(THREE.DynamicDrawUsage));
	altGeometry.setAttribute("color", new THREE.BufferAttribute(altCol, 3).setUsage(THREE.DynamicDrawUsage));
	const altLines = new THREE.LineSegments(altGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
	altLines.frustumCulled = false;
	altLines.visible = false;
	world.add(altLines);
	// Engine trails of ships in space: id → [[x, y, time], …] behind the stern (see the effects pass).
	// Drawn as one continuous ribbon per ship (all ships in one mesh): turned to face the camera, soft
	// across (a gradient texture), narrowing and fading out towards its end; added light.
	const trails = new Map(),
		TRAIL_LIFE = 0.7,
		TRAIL_POINTS = 24,
		TRAIL_MAX = 160 * TRAIL_POINTS * 2,
		TRAIL_COOL = new THREE.Color("#5fd8ff"),
		TRAIL_HOT = new THREE.Color("#ff8a3c"),
		trailGeometry = new THREE.BufferGeometry(),
		trailPos = new Float32Array(TRAIL_MAX * 3),
		trailCol = new Float32Array(TRAIL_MAX * 3),
		trailUv = new Float32Array(TRAIL_MAX * 2),
		trailIndex = [];
	for (let k = 0; k < TRAIL_MAX / 2 - 1; k++) {
		const a = k * 2;
		trailIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
	}
	trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
	trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailCol, 3).setUsage(THREE.DynamicDrawUsage));
	trailGeometry.setAttribute("uv", new THREE.BufferAttribute(trailUv, 2));
	trailGeometry.setIndex(trailIndex);
	const trailTexture = (() => {
		const c = document.createElement("canvas");
		c.width = 4;
		c.height = 64;
		const x = c.getContext("2d"),
			g = x.createLinearGradient(0, 0, 0, 64);
		g.addColorStop(0, "rgba(0,0,0,1)");
		g.addColorStop(0.5, "rgba(255,255,255,1)");
		g.addColorStop(1, "rgba(0,0,0,1)");
		x.fillStyle = g;
		x.fillRect(0, 0, 4, 64);
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		return t;
	})();
	const trailMesh = new THREE.Mesh(trailGeometry, new THREE.MeshBasicMaterial({ map: trailTexture, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
	trailMesh.frustumCulled = false;
	trailMesh.visible = false;
	world.add(trailMesh);
	const trailA = new THREE.Vector3(),
		trailDir = new THREE.Vector3(),
		trailSide = new THREE.Vector3(),
		trailView = new THREE.Vector3();
	const beam = { from: new THREE.Vector3(), to: new THREE.Vector3(), dir: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(), x: new THREE.Vector3(1, 0, 0), s: new THREE.Vector3() };
	function tracer(i, a, b, width, c) {
		beam.from.set(...a);
		beam.to.set(...b);
		beam.dir.subVectors(beam.to, beam.from);
		const len = beam.dir.length();
		beam.q.setFromUnitVectors(beam.x, beam.dir.normalize());
		// (Three times the given width: the glow; the core is the middle third.)
		tracers.setMatrixAt(i, beam.m.compose(beam.from.lerp(beam.to, 0.5), beam.q, beam.s.set(Math.max(1, len), width * 3, width * 3)));
		tracers.setColorAt(i, c);
	}
	// Explosions: a fireball of churning noise (white-hot core → yellow → orange → dark red → smoke,
	// breaking up into wisps as it cools), a soft shock ring running over the ground and a short glare.
	const fireballGeometry = new THREE.IcosahedronGeometry(1, 4),
		shockGeometry = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
		NOISE3 = `
			float bHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
			float bNoise(vec3 p) {
				vec3 i = floor(p), f = fract(p);
				f = f * f * (3.0 - 2.0 * f);
				return mix(mix(mix(bHash(i), bHash(i + vec3(1, 0, 0)), f.x), mix(bHash(i + vec3(0, 1, 0)), bHash(i + vec3(1, 1, 0)), f.x), f.y),
					mix(mix(bHash(i + vec3(0, 0, 1)), bHash(i + vec3(1, 0, 1)), f.x), mix(bHash(i + vec3(0, 1, 1)), bHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
			}
			float bFbm(vec3 p) { return bNoise(p) * 0.55 + bNoise(p * 2.1 + 3.1) * 0.3 + bNoise(p * 4.3 - 1.7) * 0.15; }`,
		fireballMaterial = () =>
			new THREE.ShaderMaterial({
				uniforms: { uK: { value: 0 }, uSeed: { value: 0 } },
				vertexShader: `uniform float uK; uniform float uSeed; varying float vNoise; varying vec3 vN; varying vec3 vView; varying vec3 vObj;
					${NOISE3}
					void main() {
						vec3 p = position;
						// Billows: the surface pushed out by turbulence warped by another noise (rolling, curling
						// lumps instead of a lumpy ball), churning outwards and upwards as it ages.
						vec3 q = p * 2.1 + vec3(uSeed, uSeed * 0.7 - uK * 2.6, uSeed * 1.3);
						vec3 warp = vec3(bFbm(q + 3.1), bFbm(q - 1.7), bFbm(q + 7.3)) - 0.5;
						float n = bFbm(q + warp * 1.6);
						float lumps = abs(bNoise(p * 5.0 + warp * 2.0 + uSeed - uK * 2.0) - 0.5) * 2.0;
						vNoise = n;
						vObj = p + warp * 0.6;
						vec4 mv = modelViewMatrix * vec4(p * (0.5 + n * 0.85 + lumps * 0.22), 1.0);
						vN = normalize(normalMatrix * normal);
						vView = normalize(-mv.xyz);
						gl_Position = projectionMatrix * mv;
					}`,
				fragmentShader: `uniform float uK; uniform float uSeed; varying float vNoise; varying vec3 vN; varying vec3 vView; varying vec3 vObj;
					${NOISE3}
					// Blackbody-like ramp: dark red → red → orange → yellow → white, by temperature 0…1.
					vec3 blackbody(float t) {
						return t < 0.25 ? mix(vec3(0.25, 0.02, 0.0), vec3(0.85, 0.12, 0.02), t / 0.25)
							: t < 0.5 ? mix(vec3(0.85, 0.12, 0.02), vec3(1.0, 0.45, 0.06), (t - 0.25) / 0.25)
							: t < 0.75 ? mix(vec3(1.0, 0.45, 0.06), vec3(1.0, 0.82, 0.35), (t - 0.5) / 0.25)
							: mix(vec3(1.0, 0.82, 0.35), vec3(1.0, 0.98, 0.92), (t - 0.75) / 0.25);
					}
					void main() {
						float facing = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);
						// Fine turbulence across the surface: the fire is not smooth.
						float fine = bFbm(vObj * 6.0 + vec3(0.0, -uK * 4.0, uSeed));
						float n = vNoise * 0.65 + fine * 0.35;
						// Temperature: hottest at the core seen face-on and early, falling as it ages and expands.
						float heat = clamp(0.92 - uK * 1.7 + (n - 0.5) * 1.9 + facing * 0.4 - 0.35, 0.0, 1.0);
						// The cooler parts become smoke: dark, a little brown, lit faintly by the fire inside.
						float smoke = smoothstep(0.32, 0.08, heat);
						vec3 fire = blackbody(heat) * (0.5 + 1.1 * pow(heat, 4.0));
						vec3 soot = mix(vec3(0.05, 0.045, 0.04), vec3(0.22, 0.12, 0.07), smoothstep(0.0, 0.3, heat)) * (0.7 + 0.5 * fine);
						vec3 col = mix(fire, soot, smoke);
						// Erosion: holes open in the thin parts first, the fireball breaks into wisps.
						float erode = smoothstep(uK * 1.05 - 0.15, uK * 1.05 + 0.05, n * 0.95 + facing * 0.25);
						float alpha = erode * smoothstep(0.0, 0.4, facing) * (1.0 - smoothstep(0.82, 1.0, uK)) * mix(1.0, 0.85, smoke);
						gl_FragColor = vec4(col, alpha);
						#include <colorspace_fragment>
					}`,
				transparent: true,
				depthWrite: false,
			}),
		shockMaterial = () =>
			new THREE.ShaderMaterial({
				uniforms: { uK: { value: 0 } },
				vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
				fragmentShader: `uniform float uK; varying vec2 vUv;
					void main() {
						float r = length(vUv - 0.5) * 2.0;
						float edge = smoothstep(0.8, 0.95, r) * (1.0 - smoothstep(0.95, 1.0, r));
						float a = edge * (1.0 - uK) * (1.0 - uK) * 0.7;
						gl_FragColor = vec4(vec3(1.0, 0.82, 0.6) * a, 1.0);
						#include <colorspace_fragment>
					}`,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		glareTexture = (() => {
			const c = document.createElement("canvas");
			c.width = c.height = 64;
			const x = c.getContext("2d"),
				g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
			g.addColorStop(0, "#ffffffff");
			g.addColorStop(0.25, "#fff2c8aa");
			g.addColorStop(1, "#ff904000");
			x.fillStyle = g;
			x.fillRect(0, 0, 64, 64);
			return new THREE.CanvasTexture(c);
		})();
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
				top = !s.speed ? (options.models && models3d.has(e) ? 62 : buildingHeight(s) + 14) + stationLift(e, s) : s.flying ? 110 : s.ship ? 50 + s.radius : e.type === "worker" && spaceMap() ? 46 : 30,
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
			fi = 0,
			bi2 = 0;
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
					hover = RTS.SPACE?.hover ?? 34,
					fromY = heightAt(ef.x, ef.y) + (ef.air ? 88 : ef.ship ? hover + 4 : 14),
					toY = heightAt(ef.tx, ef.ty) + (ef.airTarget ? 90 : ef.shipTarget ? hover + 4 : spaceMap() ? 26 : 10),
					bomb = ef.bomb,
					straight = ef.air || ef.airTarget || ef.ship || ef.shipTarget,
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
					// Space: the destroyer's beam stands from muzzle to target and thins out; the other ships fire
					// fast laser bolts — cyan from the viewer's side, orange from the enemy.
					const laser = ef.ship && (ef.team === (game.viewer ?? 0) ? "#7ff4ff" : "#ff8a4c");
					if (laser && ef.lance) tracer(si++, at(0), at(1), 0.8 + 3.2 * alpha, color.set(laser));
					else if (laser) tracer(si++, at(Math.max(0, head - 0.22)), at(Math.min(1, head * 1.3)), 1.5, color.set(laser));
					else if (bomb) {
						tracer(si++, at(tail), [hx, hy, hz], 2.6, color.set("#ff9a50"));
						fx.shot("trail", hx, hy, hz);
					} else if (ef.air) for (const side of [-4.5, 4.5]) tracer(si++, at(tail, side), at(head, side), 1.1, color.set("#fff0b0"));
					else {
						tracer(si++, at(tail), [hx, hy, hz], ef.rocket ? 3.2 : 1.8, color.set(ef.rocket ? "#ffb15a" : "#ffe6a0"));
						if (ef.rocket) fx.shot("trail", hx, hy, hz);
					}
				} else if (!impactsSeen.has(ef)) {
					impactsSeen.add(ef);
					fx.shot("impact", ef.tx, toY, ef.ty, ef.rocket || bomb, { air: ef.airTarget });
				}
			} else if (ef.kind === "shieldHit" && ef.ship) {
				// A ship's shield in space: a bubble round it, flaring where the shot struck, fading.
				const b = pooled(bubbles, bi2++, () => {
					const m = new THREE.Mesh(bubbleGeometry, bubbleMaterial());
					m.renderOrder = 6;
					world.add(m);
					return { root: m };
				});
				const hover = RTS.SPACE?.hover ?? 34,
					R = (ef.reach || 20) * 1.2;
				b.root.visible = true;
				b.root.position.set(ef.gx, hover + 2, ef.gy);
				b.root.scale.set(R * 1.25, R * 0.75, R * 1.25);
				b.root.material.uniforms.uHit.value.set(ef.x - ef.gx, 0, ef.y - ef.gy).normalize();
				b.root.material.uniforms.uK.value = alpha;
			} else if (ef.kind === "explosion") {
				// A churning fireball swelling fast, rising and cooling into smoke; a shock ring running over
				// the ground; a glare at the start (sparks, debris, dust and smoke come from scene-fx-3d.js,
				// the light it throws around from its night lights). Aircraft blow up at their height.
				const blast = pooled(flashes, fi++, () => {
						const root = new THREE.Group(),
							ball = new THREE.Mesh(fireballGeometry, fireballMaterial()),
							balls = [new THREE.Mesh(fireballGeometry, fireballMaterial()), new THREE.Mesh(fireballGeometry, fireballMaterial())],
							ring = new THREE.Mesh(shockGeometry, shockMaterial()),
							glare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glareTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })),
							streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: streakTexture, color: "#9fc8ff", blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false }));
						ball.renderOrder = 7;
						ring.renderOrder = 3;
						glare.renderOrder = 8;
						streak.renderOrder = 9;
						for (const b of balls) b.renderOrder = 7;
						root.add(ball, ...balls, ring, glare, streak);
						return { root, ball, balls, ring, glare, streak };
					}),
					size = ef.size || 40,
					k = 1 - alpha,
					ground = heightAt(ef.x, ef.y),
					base = ef.space ? ef.lift : ground + (ef.air ? 90 : 0),
					grow = 1 - Math.pow(1 - Math.min(1, k * 1.6), 3);
				if (!blast.seeds) blast.seeds = new WeakMap();
				if (!blast.seeds.has(ef)) blast.seeds.set(ef, Math.random() * 50);
				blast.root.visible = true;
				// In space the fireball does not rise (no air): it swells and fades where the ship was.
				blast.ball.position.set(ef.x, base + (ef.space ? 0 : size * (ef.air ? 0 : 0.22 + k * 0.45)), ef.y);
				blast.ball.scale.set(size * (0.25 + grow * 0.55), size * (0.25 + grow * 0.55) * (0.85 + k * 0.45), size * (0.25 + grow * 0.55));
				blast.ball.material.uniforms.uK.value = k;
				blast.ball.material.uniforms.uSeed.value = blast.seeds.get(ef);
				// Secondary blasts: smaller fireballs bursting a moment later beside the first (bigger blasts
				// have both, small ones none) — the explosion reads as a cluster, not a single ball.
				const seed = blast.seeds.get(ef);
				blast.balls.forEach((b, j) => {
					const delay = 0.12 + j * 0.14,
						kk = (k - delay) / (1 - delay),
						on = size >= 30 + j * 25 && kk > 0;
					b.visible = on;
					if (!on) return;
					const a = seed * 3.1 + j * 2.4,
						off = size * (0.35 + j * 0.15),
						g2 = 1 - Math.pow(1 - Math.min(1, kk * 1.8), 3),
						s2 = size * (0.55 - j * 0.12) * (0.3 + g2 * 0.6);
					b.position.set(ef.x + Math.cos(a) * off, base + (ef.space ? Math.sin(a * 1.7) * off * 0.5 : size * (0.15 + j * 0.12 + kk * 0.4)), ef.y + Math.sin(a) * off);
					b.scale.set(s2, s2 * (0.85 + kk * 0.35), s2);
					b.material.uniforms.uK.value = Math.min(1, kk * 1.1);
					b.material.uniforms.uSeed.value = seed + 11 + j * 7;
				});
				// Spark streaks: a dozen hot fragments on ballistic arcs (straight in space), drawn as short
				// streaks along their flight, white-hot to orange, for the first part of the blast.
				if (k < 0.55)
					for (let j = 0; j < Math.min(14, 6 + size / 8) && si < MAX_TRACERS - 1; j++) {
						const h1 = Math.sin(seed * 12.9 + j * 78.2) * 43758.5453,
							h2 = Math.sin(seed * 4.1 + j * 19.7) * 23421.631,
							r1 = h1 - Math.floor(h1),
							r2 = h2 - Math.floor(h2),
							ang = r1 * Math.PI * 2,
							up = ef.space ? (r2 - 0.5) * 1.2 : 0.35 + r2 * 0.9,
							speed = size * (3.5 + r2 * 4),
							g = ef.space ? 0 : 520,
							at = (t) => [ef.x + Math.cos(ang) * speed * t, base + size * 0.2 + up * speed * t - 0.5 * g * t * t, ef.y + Math.sin(ang) * speed * t],
							t1 = Math.min(0.4, k * 0.65),
							t0 = Math.max(0, t1 - 0.09),
							fade = 1 - k / 0.55;
						tracer(si++, at(t0), at(t1), 0.35 + 0.35 * fade, color.setRGB(1, 0.55 + fade * 0.4, 0.2 + fade * 0.5).multiplyScalar(fade * 1.3));
					}
				blast.ring.visible = !ef.air;
				// Space: the shock wave is a flat disc running out in the plane of the battle, wider and faster.
				blast.ring.position.set(ef.x, ef.space ? base : ground + 2, ef.y);
				blast.ring.scale.setScalar(size * (ef.space ? 0.4 + k * 3.2 : 0.3 + k * 1.6));
				blast.ring.material.uniforms.uK.value = k;
				const g = Math.max(0, 1 - k / 0.22);
				blast.glare.visible = g > 0;
				blast.glare.position.set(ef.x, base + size * 0.3, ef.y);
				blast.glare.scale.setScalar(size * (1.6 + (1 - g) * 1.2));
				blast.glare.material.opacity = g * g * 0.3;
				// Space: an anamorphic streak through the blast, flaring at once and fading over half its life;
				// a second, warmer and shorter one inside it.
				const st = ef.space ? Math.max(0, 1 - k / 0.45) : 0;
				blast.streak.visible = st > 0;
				if (st > 0) {
					blast.streak.position.set(ef.x, base + size * 0.1, ef.y);
					blast.streak.scale.set(size * (9 + (1 - st) * 7), size * 0.32 * (0.4 + st * 0.6), 1);
					blast.streak.material.opacity = st * st * 0.9;
				}
			}
		}
		// Space: altitude lines — a faint line from each ship down to its spot on the tactical plane, with a
		// small cross there, so its place on the map reads at any camera angle. Plain one-pixel lines (not
		// glowing beams: those swelled into white pegs zoomed out), dim, in the side's colour, fading upward.
		let lv = 0;
		if (spaceMap()) {
			const hover = RTS.SPACE?.hover ?? 34;
			for (const e of game.entities) {
				const s = RTS.TYPES[e.type];
				if (!(s?.ship || e.type === "worker") || e.hp <= 0 || lv + 6 > ALT_MAX || (options.fog && !game.isVisible(e.x, e.y))) continue;
				const y = (s.ship ? hover : DRONE_HOVER) - 3,
					c = e.team === (game.viewer ?? 0) ? ALT_OWN : ALT_FOE,
					r = s.radius * 0.45;
				const put = (x, h, z, k) => {
					altPos.set([x, h, z], lv * 3);
					altCol.set([c.r * k, c.g * k, c.b * k], lv * 3);
					lv++;
				};
				put(e.x, 0.5, e.y, 1);
				put(e.x, y, e.y, 0.15);
				put(e.x - r, 0.5, e.y, 0.8);
				put(e.x + r, 0.5, e.y, 0.8);
				put(e.x, 0.5, e.y - r, 0.8);
				put(e.x, 0.5, e.y + r, 0.8);
			}
		}
		altLines.visible = lv > 0;
		if (lv > 0) {
			altGeometry.setDrawRange(0, lv);
			altGeometry.attributes.position.needsUpdate = true;
			altGeometry.attributes.color.needsUpdate = true;
		}
		// Space: engine trails — a ribbon through each ship's last positions behind its stern, from the
		// drives (full width, bright) to its end (narrow, dark); only while the ship moves.
		let tv = 0;
		if (spaceMap()) {
			const hover = RTS.SPACE?.hover ?? 34;
			for (const e of game.entities) {
				const s = RTS.TYPES[e.type];
				if (!(s?.ship || s?.fighter || e.type === "worker") || e.hp <= 0) continue;
				const back = s.radius * 0.95,
					px = e.x - Math.cos(e.angle || 0) * back,
					py = e.y - Math.sin(e.angle || 0) * back;
				let t = trails.get(e.id);
				if (!t) trails.set(e.id, (t = []));
				const last = t[t.length - 1];
				if (!last || Math.hypot(px - last[0], py - last[1]) > 5) t.push([px, py, clock]);
				else last[2] = Math.max(last[2], clock - TRAIL_LIFE * 0.5);
				while (t.length > TRAIL_POINTS || (t.length && clock - t[0][2] > TRAIL_LIFE)) t.shift();
				if (t.length < 2 || (options.fog && !game.isVisible(e.x, e.y)) || tv + t.length * 2 + 4 > TRAIL_MAX) continue;
				const hot = e.faction === "dominion" || (!e.faction && e.team !== (game.viewer ?? 0)) ? TRAIL_HOT : TRAIL_COOL,
					y = s.fighter ? 90 : s.ship ? hover : DRONE_HOVER,
					width = s.radius * (s.ship || s.fighter ? 0.55 : 0.4),
					bright = s.ship || s.fighter ? 1 : 0.55;
				// Separate it from the strip before: a collapsed black pair on its first point (zero area).
				for (let k = 0; k < 2; k++) {
					trailPos.set([t[t.length - 1][0], y, t[t.length - 1][1]], tv * 3);
					trailCol.set([0, 0, 0], tv * 3);
					tv++;
				}
				// Newest point first (at the drives), each one a pair of vertices across the ribbon.
				for (let k = t.length - 1, n = 0; k >= 0; k--, n++) {
					const p = t[k],
						q = t[Math.max(0, k - 1)],
						r = t[Math.min(t.length - 1, k + 1)],
						age = Math.min(1, (clock - p[2]) / TRAIL_LIFE),
						f = (1 - age) * (1 - n / t.length);
					trailA.set(p[0], y, p[1]);
					trailDir.set(r[0] - q[0], 0, r[1] - q[1]);
					if (trailDir.lengthSq() < 1e-4) trailDir.set(Math.cos(e.angle || 0), 0, Math.sin(e.angle || 0));
					trailView.subVectors(camera.position, trailA);
					trailSide.crossVectors(trailDir, trailView).normalize().multiplyScalar(width * (0.25 + 0.75 * f));
					const c = color.copy(hot).multiplyScalar(f * f * 1.6 * bright);
					for (const side of [1, -1]) {
						trailPos.set([trailA.x + trailSide.x * side, trailA.y + trailSide.y * side, trailA.z + trailSide.z * side], tv * 3);
						trailCol.set([c.r, c.g, c.b], tv * 3);
						trailUv.set([n / (t.length - 1), side > 0 ? 1 : 0], tv * 2);
						tv++;
					}
				}
				// And after it: a collapsed black pair on its last point.
				for (let k = 0; k < 2; k++) {
					trailPos.set([trailA.x, trailA.y, trailA.z], tv * 3);
					trailCol.set([0, 0, 0], tv * 3);
					tv++;
				}
			}
			if (trails.size > 400 || (clock * 4) % 20 < 0.3) for (const id of trails.keys()) if (!game.get(id)) trails.delete(id);
		}
		trailMesh.visible = tv > 0;
		if (tv > 0) {
			trailGeometry.setDrawRange(0, Math.max(0, (tv / 2 - 1) * 6));
			trailGeometry.attributes.position.needsUpdate = true;
			trailGeometry.attributes.color.needsUpdate = true;
			trailGeometry.attributes.uv.needsUpdate = true;
		}
		tracers.count = si;
		tracers.visible = si > 0;
		tracers.instanceMatrix.needsUpdate = true;
		tracers.instanceColor.needsUpdate = true;
		for (let i = fi; i < flashes.length; i++) flashes[i].root.visible = false;
		for (let i = bi2; i < bubbles.length; i++) bubbles[i].root.visible = false;
	}

	// Sun height (-1 midnight … 1 noon) and its east–west position (-1 … 1). One shadowed light is the
	// sun by day and the moon by night: the sun reddens and fades through the golden hour and the
	// sunset, both are faint in the blue hour (where the light changes over), then the cool moonlight
	// from its own, lower direction. The sky's colours (webgl3d/sky-3d.js) tint the ambient light and
	// the distance haze; twilight warms the ambient from the horizon.
	const MOON_LIGHT = new THREE.Color("#a3b8e6"),
		NIGHT_DEEP = new THREE.Color("#1c2a4e"),
		NIGHT_AMBIENT = new THREE.Color("#2b3d66"),
		DAY_AMBIENT = new THREE.Color("#bcd4e6"),
		DAY_GROUND = new THREE.Color("#3a3226"),
		NIGHT_GROUND = new THREE.Color("#141922"),
		skyState = { e: 1, sunDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), zenith: new THREE.Color(), horizon: new THREE.Color(), sunlight: new THREE.Color() };
	const smooth = (a, b, x) => {
		const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
		return t * t * (3 - 2 * t);
	};
	const SPACE_LIGHT = { zenith: new THREE.Color("#02040a"), horizon: new THREE.Color("#070b1a"), sun: new THREE.Color("#fff3e2"), ambient: new THREE.Color("#7f92c4"), bounce: new THREE.Color("#5a4232") };
	const SOLAR_GLOW = new THREE.Color("#ffc070"),
		PLANET_GLOW = new THREE.Color("#ff9a5c"),
		PLANET_FROM = new THREE.Vector3(0.15, -0.85, -0.5).normalize();
	const spaceMap = () => !!RTS.MISSIONS[game?.missionId]?.space,
		DRONE_HOVER = 22;
	// How high a building floats in space: its platform's underside clears the plane (0 elsewhere).
	const stationLift = (e, s) => (spaceMap() && !["wall", "gate"].includes(e.type) ? s.radius * 0.8 + 10 : 0);
	function light(elevation, across) {
		const day = Math.max(0, Math.min(1, elevation * 3 + 0.35)),
			colors = sky.palette(elevation);
		skyState.e = elevation;
		skyState.zenith.copy(colors.zenith);
		skyState.horizon.copy(colors.horizon);
		skyState.sunlight.copy(colors.sunlight);
		skyState.sunDir.set(-across, elevation, 0.45).normalize();
		skyState.moonDir.set(0.6 + across * 0.2, 0.3, -0.74).normalize();
		// The moon's phase: an eighth of a cycle a day (game days of 360 s; the prototype's own cycle).
		const dayIndex = sunOverride ? Math.floor((game?.time || 0) / 360) : Math.floor(0.08 + clock / 150);
		skyState.moonPhase = (dayIndex * 0.125 + 0.62) % 1;
		const full = 0.5 - 0.5 * Math.cos(skyState.moonPhase * Math.PI * 2);
		const sunI = 2.45 * smooth(-0.12, 0.3, elevation),
			moonI = 0.55 * (0.25 + 0.75 * full) * smooth(-0.05, -0.3, elevation),
			bySun = sunI >= moonI,
			// Moonlight from the moon's side but higher than its disk in the sky: a low light would throw
			// shadows of the hills across half the map.
			dir = bySun ? new THREE.Vector3(-across, Math.max(0.12, elevation), 0.45).normalize() : new THREE.Vector3(skyState.moonDir.x, 0.75, skyState.moonDir.z).normalize();
		sun.color.copy(bySun ? colors.sunlight : MOON_LIGHT);
		sun.intensity = Math.max(0.18, bySun ? sunI : moonI);
		// Ambient: night blue → day sky, warmed by the horizon in the twilight; the ground bounce darkens.
		const twilight = Math.max(0, 1 - Math.abs(elevation + 0.02) / 0.2);
		// At night the sky glows with the moon: deep blue and dim at the new moon, silvery at the full.
		hemi.intensity = 0.3 + 0.14 * full + day * (0.68 - 0.14 * full) + twilight * 0.12;
		hemi.color.copy(NIGHT_DEEP).lerp(NIGHT_AMBIENT, full).lerp(DAY_AMBIENT, day).lerp(colors.horizon, twilight * 0.4);
		hemi.groundColor.copy(NIGHT_GROUND).lerp(DAY_GROUND, day);
		// Distance haze and the clear colour: the horizon, a little towards the zenith.
		scene.background.copy(colors.horizon).lerp(colors.zenith, 0.2);
		scene.fog.color.copy(scene.background);
		// Space (the orbital battle): a hard white sun from the side, black sky, dim blue ambient and the
		// warm light of the gas giant below.
		if (spaceMap()) {
			skyState.zenith.copy(SPACE_LIGHT.zenith);
			skyState.horizon.copy(SPACE_LIGHT.horizon);
			skyState.sunlight.copy(SPACE_LIGHT.sun);
			dir.set(-0.62, 0.58, 0.52).normalize();
			skyState.sunDir.copy(dir);
			sun.color.copy(SPACE_LIGHT.sun);
			// Vacuum: a hard sun, little ambient light — deep shadows on the hulls.
			sun.intensity = 3.1;
			hemi.color.copy(SPACE_LIGHT.ambient);
			hemi.groundColor.copy(SPACE_LIGHT.bounce);
			hemi.intensity = 0.4;
			scene.background.copy(SPACE_LIGHT.horizon);
			scene.fog.color.copy(SPACE_LIGHT.horizon);
		}
		// The sun and its shadow box follow the camera.
		// The shadow box sits a little ahead of the view centre (more of the board lies beyond it than in front).
		const ahead = rig.distance * 0.22 * Math.cos(rig.pitch);
		sun.target.position.set(rig.x - Math.sin(rig.yaw) * ahead, 0, rig.y - Math.cos(rig.yaw) * ahead);
		sun.position.copy(sun.target.position).addScaledVector(dir, 2500);
		return day;
	}
	// Weather on the whole scene: haze closes in and tints the distance; lightning flashes the sky.
	const AURORA_GREEN = new THREE.Color("#5cffb0"),
		sun2Dir = new THREE.Vector3();
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
		// The aurora over ice maps at night, waxing and waning; it tints the ground and the models green.
		const aurora = RTS.MISSIONS[game?.missionId]?.biome === "ice" ? smooth(-0.08, -0.28, skyState.e) * (0.6 + 0.4 * Math.sin(clock * 0.021) * Math.sin(clock * 0.013 + 1)) * (1 - Math.min(1, haze * 1.2)) : 0;
		if (aurora > 0.01) {
			const ripple = 0.85 + 0.15 * Math.sin(clock * 0.7) * Math.sin(clock * 0.31);
			hemi.color.lerp(AURORA_GREEN, aurora * 0.3 * ripple);
			hemi.intensity += aurora * 0.08 * ripple;
		}
		const twin = sky.sun2(skyState.sunDir, sun2Dir);
		sun2.intensity = twin ? 0.5 * smooth(-0.04, 0.2, twin.y) * (1 - 0.6 * haze) : 0;
		// Space, solar storm: the sun blazes and warm light floods the scene in surges.
		if (spaceMap() && state.solar > 0) {
			sun.intensity *= 1 + 0.9 * state.solar;
			hemi.color.lerp(SOLAR_GLOW, 0.45 * state.solar);
			hemi.intensity += 0.3 * state.solar;
		}
		// Space: the gas giant below throws a warm glow up onto the undersides of ships and stations.
		if (spaceMap()) {
			sun2.color.copy(PLANET_GLOW);
			sun2.intensity = 0.75;
			sun2.target.position.set(rig.x, 0, rig.y);
			sun2.position.copy(sun2.target.position).addScaledVector(PLANET_FROM, 2500);
		}
		if (twin) {
			sun2.target.position.set(rig.x, 0, rig.y);
			sun2.position.copy(sun2.target.position).addScaledVector(twin, 2500);
		}
		sky.update({ camera, time: clock, ...skyState, aurora, haze, hazeColor: HAZE[state.kind] || HAZE.rain, cover, flash: state.flash || 0, flashColor: FLASH });
		sunFx.update({ camera, imageRays: quality.cinema && quality.atmo, sunDir: skyState.sunDir, sunColor: skyState.sunlight, e: skyState.e, haze, mist: groundWeather.mistLevel.value, focus: rig, span: Math.max(1600, Math.min(4200, rig.distance * 2.2)) });
		sky.clouds(clock, options.cloudShadows === false || spaceMap() ? 0 : 0.4 * (1 - haze * 0.6));
		sky.mesh.visible = !spaceMap();
		space3d.update({ camera, time: clock, sun: skyState.sunDir });
	}

	function placeCamera() {
		const ground = heightAt(rig.x, rig.y),
			flat = Math.cos(rig.pitch) * rig.distance;
		camera.position.set(rig.x + Math.sin(rig.yaw) * flat, ground + Math.sin(rig.pitch) * rig.distance, rig.y + Math.cos(rig.yaw) * flat);
		camera.lookAt(rig.x, ground, rig.y);
		// Distance haze, the far plane and the sun's shadow box follow the zoom (up to the whole map).
		scene.fog.near = rig.distance * 1.6;
		scene.fog.far = rig.distance * 4.5;
		// Space: the planet lies thousands of units below — a far view and no distance haze.
		const far = spaceMap() ? 60000 : rig.distance * 5;
		if (spaceMap()) {
			scene.fog.near = 1e6;
			scene.fog.far = 2e6;
		}
		if (Math.abs(camera.far - far) > rig.distance * 0.5) {
			camera.far = far;
			camera.updateProjectionMatrix();
		}
		const extent = Math.max(460, Math.min(3000, rig.distance * 0.9)),
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
		post.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio(), postSamples);
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
	const quality = { scatter: 1, particles: 1, lights: true, water: true, scars: true, relief: true, flashes: true, cinema: true, ao: true, bloom: true, samples: 4 };
	let qualityKey = null;
	function applyQuality(api, building = false) {
		const o = typeof SceneFX !== "undefined" ? SceneFX.options : {},
			level = { high: 0, medium: 1, low: 2 },
			terrainLevel = level[o.terrain] ?? 0,
			key = [o.terrain, o.particles, o.shadows, o.lights, o.water, o.scars, o.relief, o.flashes, o.cinema, o.ao, o.bloom, o.pbr, o.reflect, o.atmo, o.surface, o.dof].join("|");
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
			// The cinematic image and its parts (the bloom switch is shared with the WebGL board).
			cinema: o.cinema !== false,
			ao: o.cinema !== false && o.ao !== false,
			bloom: o.cinema !== false && o.bloom !== false,
			samples: [4, 2, 0][terrainLevel],
			// Water reflections (a second, half-size picture of the scene): not on the lowest terrain detail.
			reflect: o.water !== false && o.reflect !== false && terrainLevel < 2,
			atmo: o.cinema !== false && o.atmo !== false,
			surface: o.surface !== false,
			pbr: o.pbr !== false,
			dof: o.dof !== false,
		});
		models3d.setSurface(quality.surface);
		groundWeather.pbrOn.value = o.pbr !== false && !spaceMap() ? 1 : 0;
		postSamples = quality.samples;
		post.setSize(host.clientWidth * renderer.getPixelRatio(), host.clientHeight * renderer.getPixelRatio(), postSamples);
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

	// The cinematic frame: sky reflections (renewed twice a second at most), the ambient light lowered by what
	// the reflections and the occlusion now give, and the grade of the planet and the hour.
	const GRADES = {
		dust: { light: [1.05, 1.0, 0.9], shadow: [0.94, 0.97, 1.06], saturation: 1.1 },
		ice: { light: [0.99, 1.01, 1.05], shadow: [0.92, 0.98, 1.08], saturation: 1.02 },
		ash: { light: [1.06, 0.97, 0.9], shadow: [0.97, 0.95, 0.99], saturation: 0.96 },
		lumen: { light: [0.98, 1.04, 1.0], shadow: [0.9, 1.02, 1.04], saturation: 1.14 },
		magma: { light: [1.08, 0.97, 0.88], shadow: [1.0, 0.94, 0.95], saturation: 1.08 },
		frozenhive: { light: [1.0, 1.0, 1.05], shadow: [0.96, 0.95, 1.08], saturation: 1.0 },
		derelict: { light: [1.04, 0.99, 0.94], shadow: [0.95, 0.97, 1.03], saturation: 0.98 },
		space: { light: [1.02, 1.0, 0.97], shadow: [0.88, 0.94, 1.14], saturation: 1.12 },
	};
	const NIGHT_SHADOW = new THREE.Color(0.86, 0.94, 1.14),
		NIGHT_LIGHT = new THREE.Color(0.97, 1.0, 1.06),
		grade = { shadowTint: new THREE.Color(), lightTint: new THREE.Color(), exposure: 1, saturation: 1.08, contrast: 1.06, vignette: 0.28 },
		envSky = { zenith: new THREE.Color(), horizon: new THREE.Color(), ground: new THREE.Color(), sunDir: new THREE.Vector3(), sunColor: new THREE.Color() };
	let envClock = 0;
	const atmo = { sunColor: new THREE.Color() };
	function cinematic(dt, day, night) {
		if ((envClock -= dt) <= 0 || !scene.environment) {
			envClock = 0.5;
			envSky.zenith.copy(skyState.zenith);
			envSky.horizon.copy(scene.background);
			envSky.ground.copy(hemi.groundColor).multiplyScalar(0.8);
			envSky.sunDir.copy(sun.position).sub(sun.target.position).normalize();
			envSky.sunColor.copy(sun.color).multiplyScalar(sun.intensity * 0.35);
			scene.environment = post.environment(envSky);
		}
		scene.environmentIntensity = 0.3 + 0.5 * day;
		hemi.intensity *= 0.72;
		const m = RTS.MISSIONS[game?.missionId] || {},
			g = GRADES[m.theme] || GRADES[m.biome] || GRADES.dust;
		grade.lightTint.setRGB(...g.light).lerp(NIGHT_LIGHT, night);
		grade.shadowTint.setRGB(...g.shadow).lerp(NIGHT_SHADOW, night);
		grade.saturation = g.saturation * (1 - 0.18 * night);
		grade.exposure = 1.22 + 0.35 * night;
		overlayUniforms.overlayLinear.value = 1;
		const haze = weatherState.haze || 0;
		atmo.sunColor.copy(skyState.sunlight).multiplyScalar(smooth(-0.05, 0.2, skyState.e) * 1.2);
		Object.assign(atmo, {
			sunDir: skyState.sunDir,
			haze: scene.fog.color,
			base: groundWeather.mistBand.value.x,
			// The weather has its own haze (scene fog, dust and mist layers): not added here again.
			// No air in space: no height fog, no light shafts.
			density: spaceMap() ? 0 : 0.0005 + groundWeather.mistLevel.value * 0.0025 * (1 - haze),
			falloff: 1 / 80,
			rays: spaceMap() ? 0 : 0.55 * smooth(-0.02, 0.12, skyState.e) * (1 - haze),
		});
		post.render(scene, camera, { ...grade, atmosphere: quality.atmo ? atmo : null, ao: quality.ao, bloom: quality.bloom, aoRadius: Math.max(18, Math.min(40, rig.distance * 0.03)), aoStrength: 1.3, aoFade: rig.distance * 2, bloomStrength: spaceMap() ? 0.5 : 0.3 + 0.15 * night,
			// Depth of field (tilt-shift) in space: strongest close in (a miniature), gentle zoomed out.
			dof: quality.dof && spaceMap() ? 0.15 + 0.35 * smooth(2600, 900, rig.distance) : 0, view: globalThis.post3dView || 0 });
	}

	// Reflections in the water (0.127): the scene seen from under the surface of the flat water nearest the
	// view (a mirrored camera; everything below the surface clipped away), at half resolution, without the
	// water itself and the interface; the water shader projects its points onto this picture.
	const reflectTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }),
		mirror = new THREE.PerspectiveCamera(),
		reflectPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
		BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1),
		drawSize = new THREE.Vector2();
	function drawReflection() {
		const u = fx.water.uniforms,
			level = quality.reflect && fx.water.group.visible ? fx.water.levelNear(rig, rig.distance * 1.6) : null;
		if (level == null) {
			u.reflectOn.value = 0;
			return;
		}
		renderer.getDrawingBufferSize(drawSize);
		const w = Math.max(1, Math.round(drawSize.x / 2)),
			h = Math.max(1, Math.round(drawSize.y / 2));
		if (reflectTarget.width !== w || reflectTarget.height !== h) reflectTarget.setSize(w, h);
		const ground = heightAt(rig.x, rig.y);
		mirror.copy(camera);
		mirror.position.set(camera.position.x, 2 * level - camera.position.y, camera.position.z);
		mirror.up.set(0, 1, 0);
		mirror.lookAt(rig.x, 2 * level - ground, rig.y);
		mirror.updateMatrixWorld();
		u.reflectMatrix.value.copy(BIAS).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
		reflectPlane.constant = -(level - 0.5);
		const overlay = overlayUniforms.overlayOn.value,
			shadows = renderer.shadowMap.autoUpdate;
		overlayUniforms.overlayOn.value = 0;
		fx.water.group.visible = false;
		renderer.shadowMap.autoUpdate = false;
		renderer.clippingPlanes = [reflectPlane];
		renderer.setRenderTarget(reflectTarget);
		renderer.clear();
		renderer.render(scene, mirror);
		renderer.setRenderTarget(null);
		renderer.clippingPlanes = [];
		renderer.shadowMap.autoUpdate = shadows;
		fx.water.group.visible = true;
		overlayUniforms.overlayOn.value = overlay;
		u.reflectMap.value = reflectTarget.texture;
		u.reflectLevel.value = level;
		u.reflectOn.value = 1;
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
			// The dust on the models in the colour of the planet's ground.
			{
				const m = RTS.MISSIONS[game.missionId] || {},
					SOILS = { dust: "#9a7d58", ash: "#5a5450", ice: "#c9d3dc" };
				models3d.setSurface(quality.surface !== false, new THREE.Color(SOILS[m.biome] || SOILS.dust));
			}
			sky.setTheme(RTS.MISSIONS[game.missionId]?.theme);
			space3d.setGame(game);
			applyQuality(this, true);
			canvasRenderer.setGame(game);
			for (const r of records.values()) world.remove(r.group);
			for (const d of dying) world.remove(d.r.group);
			for (const d of dying) if (d.broken) endBreak(d);
			dying.length = 0;
			clearSigns();
			records.clear();
			buildFog();
			buildTerrain();
			fx.setGame(game, heights);
			life.setGame(game);
			scatter.setGame(game, spaceMap() ? 0 : quality.scatter);
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
					if (boom) dying.push({ r, t: 0, building: !!r.building, spin: (id % 7) / 7 - 0.5, space: spaceMap() });
					else world.remove(r.group);
				}
			collapse(dt);
			syncMarks();
			syncSigns();
			gasView = labelView();
			scatter.update(game);
			life.update(game.time, { fog: options.fog, colors: COLORS });
			marks.update(game, { hidden, sun: sun.position.clone().sub(sun.target.position).normalize() });
			syncGhosts();
			syncRallies();
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
			// Space: the lights of hulls and stations burn as at night against the dark.
			models3d.setNight(spaceMap() ? 0.8 : night);
			const dawnMist = Math.max(0, 1 - Math.abs(skyState.e - 0.05) / 0.18) * 0.45;
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
				working: canvasRenderer.entityWorking ? (e) => canvasRenderer.entityWorking(gasView, e) : null,
				sky: scene.background,
				// Mist at dawn and dusk (morning fog, evening haze), besides rain, snow and night.
				mistLevel: dawnMist,
				sun: { dir: sun.position.clone().sub(sun.target.position).normalize(), color: sun.color, intensity: sun.intensity },
				quality,
			});
			weatherLight(weatherState);
			scatter.tick(clock, weatherState);
			groundWeather.wetness.value = weatherState.wetness || 0;
			groundWeather.snowCover.value = weatherState.snowCover || 0;
			groundWeather.rainLevel.value = weatherState.kind === "rain" ? weatherState.intensity || 0 : 0;
			groundWeather.sandLevel.value = weatherState.kind === "sand" ? weatherState.intensity || 0 : 0;
			groundWeather.ionLevel.value = weatherState.kind === "ion" ? weatherState.intensity || 0 : 0;
			{
				const k = weatherState.intensity || 0;
				groundWeather.mistLevel.value = Math.max(dawnMist, night * 0.3, weatherState.kind === "rain" ? k * 0.6 : weatherState.kind === "snow" ? k * 0.5 : 0);
			}
			groundWeather.weatherTime.value = clock;
			fogUniforms.fogTime.value = clock;
			groundWeather.skyTint.value.copy(scene.background);
			// Models: snow settling on their tops, a sheen when wet (models-detail-3d.js paint).
			models3d.setWeather(weatherState.snowCover || 0, weatherState.wetness || 0, weatherState.sandCover || 0, clock);
			watchList();
			life.fadeTall(covers, dt);
			drawReflection();
			if (quality.cinema) cinematic(dt, day, night);
			else {
				scene.environment = null;
				overlayUniforms.overlayLinear.value = 0;
				renderer.render(scene, camera);
			}
			lastFrame = performance.now() - started;
		},
		// Screen point (CSS px in the host) → map point, through the terrain.
		screenToMap(p) {
			const rect = host.getBoundingClientRect();
			ndc.set((p.x / rect.width) * 2 - 1, -(p.y / rect.height) * 2 + 1);
			raycaster.setFromCamera(ndc, camera);
			const hit = raycaster.intersectObject(terrain, true)[0];
			if (hit) return { x: hit.point.x, y: hit.point.z };
			// Off the map: the plane of height 0 (a ray into the sky: a point far out under it).
			const t = raycaster.ray.origin.y / Math.max(-raycaster.ray.direction.y, 0.05);
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
			post.dispose();
			reflectTarget.dispose();
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
