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
   - Picking: screenToMap() casts a ray from the screen onto the terrain, mapToScreen() projects a map point.
   - Instancing: model parts are drawn as one InstancedMesh per geometry and material.
   - Interface overlay: setOverlay() drapes a flat-frame Canvas layer over the terrain (the game UI). */
import { createModels3D } from "./models-3d.js";
import { createSceneFx3D } from "./scene-fx-3d.js";

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

	function buildTerrain() {
		terrainHeight.setGame(game);
		const cell = terrainHeight.cell,
			cols = Math.ceil(game.W / cell) + 1,
			rows = Math.ceil(game.H / cell) + 1,
			data = new Float32Array(cols * rows);
		for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) data[j * cols + i] = terrainHeight.heightAt(i * cell, j * cell) * RISE;
		heights = { cols, rows, cell, data };

		for (const t of tiles) {
			terrain.remove(t.mesh);
			t.mesh.geometry.dispose();
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
				const pos = geometry.attributes.position;
				for (let k = 0; k < pos.count; k++) pos.setY(k, heightAt(pos.getX(k), pos.getZ(k)));
				geometry.computeVertexNormals();
				const canvas = document.createElement("canvas");
				canvas.width = w;
				canvas.height = h;
				const texture = new THREE.CanvasTexture(canvas);
				texture.colorSpace = THREE.SRGBColorSpace;
				texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
				const mesh = new THREE.Mesh(geometry, fogged(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, metalness: 0 })));
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
	const fogUniforms = { fogMap: { value: null }, fogSize: { value: new THREE.Vector2(1, 1) }, fogOn: { value: 1 } };
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
	function fogged(material) {
		material.onBeforeCompile = (shader) => {
			Object.assign(shader.uniforms, fogUniforms, overlayUniforms);
			shader.vertexShader = shader.vertexShader
				.replace("#include <common>", "#include <common>\nvarying vec2 vMapXY;")
				.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvMapXY = (modelMatrix * vec4(transformed, 1.0)).xz;");
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

	// What on a tile changes the ground painting: deposit stages, relay owners, wrecks, craters, exploration.
	function signature(t) {
		const inside = (o) => o.x > t.x0 - 80 && o.x < t.x0 + t.w + 80 && o.y > t.y0 - 80 && o.y < t.y0 + t.h + 80;
		let s = "";
		for (const list of [game.ores, game.gasFields, game.crystalFields]) for (const o of list || []) if (inside(o)) s += Math.ceil(o.amount / 250) + ",";
		for (const n of game.nodes || []) if (inside(n)) s += `n${n.owner ?? n.team}${Math.round((n.progress ?? n.capture ?? 0) * 5)},`;
		for (const list of [game.debris, game.craters]) s += `|${(list || []).filter(inside).length}`;
		// Deposits appear on the board once explored.
		const C = RTS.CELL,
			cols = game.W / C;
		let explored = 0;
		for (let y = Math.floor(t.y0 / C); y < Math.ceil((t.y0 + t.h) / C); y++) for (let x = Math.floor(t.x0 / C); x < Math.ceil((t.x0 + t.w) / C); x++) explored += game.explored[y * cols + x] ? 1 : 0;
		return s + `|e${explored}`;
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
	function paintTile(t) {
		canvasRenderer.drawLayer(t.canvas.getContext("2d"), {
			game,
			width: t.w,
			height: t.h,
			dpr: 1,
			scale: 1,
			camera: { x: t.x0 + t.w / 2, y: t.y0 + t.h / 2, zoom: 1 },
			selected: new Set(),
			colors: COLORS,
			mouse: { x: -1e4, y: -1e4 },
			drag: null,
			building: false,
			wallDrag: null,
			shadeBody: null,
			underUnits: null,
		}, ["terrain", "ground", "groundTop"]);
		t.texture.needsUpdate = true;
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
	function syncModel(e, r, s, building, moving) {
		r.decal.visible = false;
		if (r.plinth) r.plinth.visible = false;
		const key = [e.type, e.team, e.faction || "", e.tint || ""].join("|");
		if (r.model?.key !== key) {
			if (r.model) r.group.remove(r.model.root);
			r.model = models3d.create(e, COLORS_ART);
			// The parts only carry transforms; they are drawn in batches (see drawBatches).
			r.model.root.traverse((o) => o.isMesh && o.layers.set(HIDDEN_LAYER));
			r.group.add(r.model.root);
		}
		r.model.root.visible = true;
		const target = e.target != null ? game.get(e.target) : null,
			facing = building ? 0 : e.angle || 0,
			aim = (target ? Math.atan2(target.y - e.y, target.x - e.x) : building ? e.angle || 0 : facing) - facing,
			recoil = Math.max(0, Math.min(1, (e.cooldown - (s.cooldown - 0.12)) / 0.12)),
			built = e.constructionLeft > 0 ? Math.max(0.08, 1 - e.constructionLeft / (s.construction || s.build || 10)) : 1;
		r.model.update(e, { time: clock, moving, aim, recoil, built, working: working.has(e.id) });
		// Under construction: the building rises out of the ground.
		r.model.root.scale.set(1, built, 1);
		if (s.flying) r.model.root.position.y = 90;
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
		b.mesh.castShadow = b.mesh.receiveShadow = true;
		// Instances move every frame; the batch spans the map.
		b.mesh.frustumCulled = false;
		world.add(b.mesh);
	}
	const shown = [];
	function collect(o) {
		if (!o.visible) return;
		if (o.isMesh) {
			shown.push(o);
			return;
		}
		for (const c of o.children) collect(c);
	}
	function drawBatches() {
		world.updateMatrixWorld();
		shown.length = 0;
		for (const r of records.values()) if (r.group.visible && r.model?.root.visible) collect(r.model.root);
		for (const b of batches.values()) b.count = 0;
		for (const m of shown) (m.userData.batch ??= batchOf(m)).count++;
		for (const b of batches.values()) {
			grow(b, b.count);
			if (b.mesh) b.mesh.count = 0;
		}
		for (const m of shown) {
			const b = m.userData.batch;
			b.mesh.setMatrixAt(b.mesh.count++, m.matrixWorld);
		}
		batchCalls = 0;
		for (const b of batches.values()) {
			if (!b.mesh) continue;
			b.mesh.visible = b.mesh.count > 0;
			if (b.mesh.count) {
				b.mesh.instanceMatrix.needsUpdate = true;
				batchCalls++;
			}
		}
	}

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

	// Shots as lines, explosions as additive flashes.
	const shotGeometry = new THREE.BufferGeometry(),
		shotPositions = new Float32Array(600 * 6),
		shotColors = new Float32Array(600 * 6);
	shotGeometry.setAttribute("position", new THREE.BufferAttribute(shotPositions, 3));
	shotGeometry.setAttribute("color", new THREE.BufferAttribute(shotColors, 3));
	const shots = new THREE.LineSegments(shotGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
	shots.frustumCulled = false;
	world.add(shots);
	const flashTexture = (() => {
		const c = document.createElement("canvas");
		c.width = c.height = 64;
		const x = c.getContext("2d"),
			g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
		g.addColorStop(0, "#fffbe8");
		g.addColorStop(0.3, "#ffb347");
		g.addColorStop(1, "#ff450000");
		x.fillStyle = g;
		x.fillRect(0, 0, 64, 64);
		return new THREE.CanvasTexture(c);
	})();
	const flashes = [];

	let selected = new Set();
	const COLORS = ["#b0efd0", "#f07d78", "#e4b968", "#819dff", "#d2a1ef"];

	function syncMarks() {
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
			if (ef.kind === "shot" && si < 600) {
				const fromY = heightAt(ef.x, ef.y) + 14,
					toY = heightAt(ef.tx, ef.ty) + 10;
				shotPositions.set([ef.x, fromY, ef.y, ef.tx, toY, ef.ty], si * 6);
				color.set(ef.color || "#ffd27a").multiplyScalar(alpha);
				shotColors.set([color.r, color.g, color.b, color.r, color.g, color.b], si * 6);
				si++;
			} else if (ef.kind === "explosion") {
				const sp = pooled(flashes, fi++, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })));
				sp.visible = true;
				sp.material.opacity = alpha;
				sp.scale.setScalar((ef.size || 40) * (1.6 - alpha * 0.8));
				sp.position.set(ef.x, heightAt(ef.x, ef.y) + 20, ef.y);
			}
		}
		shotGeometry.setDrawRange(0, si * 2);
		shotGeometry.attributes.position.needsUpdate = true;
		shotGeometry.attributes.color.needsUpdate = true;
		for (let i = fi; i < flashes.length; i++) flashes[i].visible = false;
	}

	// Sun height (-1 midnight … 1 noon) and its east–west position (-1 … 1).
	function light(elevation, across) {
		const day = Math.max(0, Math.min(1, elevation * 3 + 0.35)),
			dir = elevation > -0.1
				? new THREE.Vector3(-across, Math.max(0.12, elevation), 0.45)
				: new THREE.Vector3(0.4, 0.8, -0.5); // moon
		dir.normalize();
		const warm = 1 - Math.min(1, Math.abs(elevation) * 2.2);
		sun.color.setRGB(1, 0.95 - warm * 0.25, 0.85 - warm * 0.45).lerp(new THREE.Color("#8fa6d6"), 1 - day);
		sun.intensity = 0.45 + day * 2;
		hemi.intensity = 0.38 + day * 0.6;
		hemi.color.set("#bcd4e6").lerp(new THREE.Color("#2b3d66"), 1 - day);
		const sky = new THREE.Color("#0b141c").lerp(new THREE.Color("#233a4a"), day * 0.6);
		scene.background.copy(sky);
		scene.fog.color.copy(sky);
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

	const raycaster = new THREE.Raycaster(),
		ndc = new THREE.Vector2();
	let lastFrame = 0,
		sunOverride = null,
		weatherState = {};

	return {
		kind: "three",
		rig,
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
			canvasRenderer.setGame(game);
			for (const r of records.values()) world.remove(r.group);
			records.clear();
			buildFog();
			buildTerrain();
			fx.setGame(game);
		},
		setSelection(ids) {
			selected = new Set(ids);
		},
		render(dt) {
			const started = performance.now();
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
					world.remove(r.group);
					records.delete(id);
				}
			syncMarks();
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
			});
			weatherLight(weatherState);
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
			weather: weatherState.kind ? `${weatherState.kind} ${Math.round((weatherState.intensity || 0) * 100)}%` : "",
			triangles: renderer.info.render.triangles,
			models: records.size,
			looks: looks.size,
			textures: renderer.info.memory.textures,
		}),
	};
}
