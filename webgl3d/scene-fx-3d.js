/* Scene effects of the 3D renderer: water, night lights, weather and particles. Visual only.
   - Water: every water body of the map (game.waters: an ellipse with the shared wavy shore of
     RTS.waterRadius) gets a surface just under its rim. Lakes and ice crevasses mirror the sun through
     a scrolling ripple normal map, glowing pools (Lumeria) shine teal, lava flows with scrolling
     glowing cracks; chasms stay dark ground. Surfaces go through the same fog-of-war shader as the
     terrain.
   - Night lights: additive light pools on the ground under buildings and headlight cones in front of
     vehicles and infantry, two instanced draws, faded in with game.night.
   - Weather (game.weather: kind and intensity): rain as falling streaks with lightning flashes,
     snow as drifting flakes, sandstorms as fast low dust plus a sand-coloured haze. Particles live in a
     box around the camera focus and wrap around it.
   - Particles: smoke and fire on damaged buildings and vehicles, fire sparks and smoke puffs on every
     explosion; one point draw for smoke, one (additive) for fire. */
export function createSceneFx3D(THREE, { world, heightAt, fogged, pointScale }) {
	const TAU = Math.PI * 2;
	const { TYPES } = RTS;

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
	// Headlight: a fan opening towards +X from the middle of the left edge.
	const cone = canvasTexture(128, (x, s) => {
		x.save();
		x.beginPath();
		x.moveTo(0, s / 2);
		x.lineTo(s, s * 0.08);
		x.lineTo(s, s * 0.92);
		x.closePath();
		x.clip();
		const g = x.createRadialGradient(0, s / 2, 0, 0, s / 2, s);
		g.addColorStop(0, "#ffffffdd");
		g.addColorStop(0.5, "#ffffff55");
		g.addColorStop(1, "#ffffff00");
		x.fillStyle = g;
		x.fillRect(0, 0, s, s);
		x.restore();
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
			const material = fogged(WATER[kind]());
			// Per-vertex opacity fades the shore.
			Object.assign(material, { vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
			const mesh = new THREE.Mesh(waterMesh(cells, kind), material);
			mesh.receiveShadow = kind !== "lava";
			mesh.renderOrder = 1;
			waterGroup.add(mesh);
			waters.push({ mesh, kind });
		}
	}

	// ---------- night lights ----------
	const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
	function lightBatch(texture, max) {
		const m = new THREE.InstancedMesh(flat, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }), max);
		m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
		m.frustumCulled = false;
		m.renderOrder = 2;
		m.count = 0;
		world.add(m);
		return m;
	}
	const pools = lightBatch(pool, 400),
		cones = lightBatch(cone, 600),
		matrix = new THREE.Matrix4(),
		quat = new THREE.Quaternion(),
		up = new THREE.Vector3(0, 1, 0),
		pos = new THREE.Vector3(),
		scl = new THREE.Vector3(),
		color = new THREE.Color();
	function place(batch, x, y, angle, sx, sz, c, strength) {
		if (batch.count >= batch.instanceMatrix.count) return;
		quat.setFromAxisAngle(up, -angle);
		batch.setMatrixAt(batch.count, matrix.compose(pos.set(x, heightAt(x, y) + 1.2, y), quat, scl.set(sx, 1, sz)));
		batch.setColorAt(batch.count, color.set(c).multiplyScalar(strength));
		batch.count++;
	}
	function nightLights(game, night, hidden) {
		pools.count = cones.count = 0;
		if (night > 0.05)
			for (const e of game.entities) {
				if (e.hp <= 0 || hidden(e)) continue;
				const s = TYPES[e.type];
				if (!s || s.threat || e.team === 2) continue;
				if (!s.speed) {
					if (e.constructionLeft > 0 || e.type === "wall") continue;
					place(pools, e.x, e.y, 0, s.radius * 3.4, s.radius * 3.4, "#ffcf8a", night * 0.55);
				} else if (!s.flying) {
					const len = s.radius >= 16 ? 190 : 120,
						c = Math.cos(e.angle || 0),
						sn = Math.sin(e.angle || 0);
					place(cones, e.x + c * (len / 2 + s.radius * 0.5), e.y + sn * (len / 2 + s.radius * 0.5), e.angle || 0, len, len * 0.7, "#fff1cc", night * (s.radius >= 16 ? 0.42 : 0.26));
				}
			}
		for (const b of [pools, cones]) {
			b.visible = b.count > 0;
			b.instanceMatrix.needsUpdate = true;
			if (b.instanceColor) b.instanceColor.needsUpdate = true;
		}
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
					p.vy += (p.lift ?? 0) * dt;
					p.x += p.vx * dt;
					p.y += p.vy * dt;
					p.z += p.vz * dt;
					const t = p.life / p.max;
					positions.set([p.x, p.y, p.z], n * 3);
					sizes[n] = p.s0 + (p.s1 - p.s0) * t;
					colors.set([p.r, p.g, p.b, p.a * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85)], n * 4);
					n++;
				}
				geometry.setDrawRange(0, n);
				for (const name of ["position", "size", "rgba"]) geometry.attributes[name].needsUpdate = true;
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
	function damageAndExplosions(game, dt, hidden) {
		emitClock += dt;
		// Emitters run 10 times a second; each spawn carries its own randomness.
		if (emitClock >= 0.1) {
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
				if (Math.random() < (building ? 0.8 : 0.45))
					smoke.spawn({ x: e.x + rand(-s.radius, s.radius) * 0.4, y: ground + top, z: e.y + rand(-s.radius, s.radius) * 0.4, vx: rand(4, 14), vy: rand(18, 32), vz: rand(-4, 4), life: 0, max: rand(2.5, 4.2), s0: s.radius * 0.6, s1: s.radius * 2.6, r: 0.42, g: 0.41, b: 0.4, a: 0.5 });
				if (f < (building ? 0.3 : 0.2) && Math.random() < 0.9)
					fire.spawn({ x: e.x + rand(-s.radius, s.radius) * 0.35, y: ground + top * 0.8, z: e.y + rand(-s.radius, s.radius) * 0.35, vx: rand(-3, 3), vy: rand(20, 40), vz: rand(-3, 3), life: 0, max: rand(0.4, 0.8), s0: s.radius * 0.45, s1: s.radius * 0.1, r: 1, g: rand(0.45, 0.65), b: 0.15, a: 0.9 });
			}
		}
		for (const ef of game.effects) {
			if (ef.kind !== "explosion" || seenExplosions.has(ef)) continue;
			seenExplosions.add(ef);
			if (hidden({ x: ef.x, y: ef.y, team: -1 })) continue;
			const size = ef.size || 40,
				ground = heightAt(ef.x, ef.y);
			for (let i = 0; i < 16; i++) {
				const a = rand(0, TAU),
					sp = rand(40, 140) * (size / 50);
				fire.spawn({ x: ef.x, y: ground + 8, z: ef.y, vx: Math.cos(a) * sp, vy: rand(40, 160), vz: Math.sin(a) * sp, lift: -260, life: 0, max: rand(0.35, 0.8), s0: rand(4, 9), s1: 1, r: 1, g: rand(0.55, 0.85), b: 0.3, a: 1 });
			}
			for (let i = 0; i < 7; i++)
				smoke.spawn({ x: ef.x + rand(-size, size) * 0.25, y: ground + rand(4, 16), z: ef.y + rand(-size, size) * 0.25, vx: rand(-10, 10), vy: rand(10, 26), vz: rand(-10, 10), life: 0, max: rand(1.6, 3), s0: size * 0.5, s1: size * 1.5, r: 0.38, g: 0.35, b: 0.32, a: 0.55 });
		}
	}

	// ---------- weather ----------
	const RAIN = 3000,
		FLAKES = 3500;
	const rainGeometry = new THREE.BufferGeometry(),
		rainPositions = new Float32Array(RAIN * 6);
	rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
	const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: "#a9c4d6", transparent: true, opacity: 0.45, depthWrite: false }));
	rain.frustumCulled = false;
	world.add(rain);
	const flakeGeometry = new THREE.BufferGeometry(),
		flakePositions = new Float32Array(FLAKES * 3);
	flakeGeometry.setAttribute("position", new THREE.BufferAttribute(flakePositions, 3));
	const flakes = new THREE.Points(flakeGeometry, new THREE.PointsMaterial({ map: softDot, size: 7, sizeAttenuation: true, transparent: true, depthWrite: false, color: "#ffffff", opacity: 0.85 }));
	flakes.frustumCulled = false;
	world.add(flakes);
	// Particle seeds: position in the unit box, plus a speed factor.
	const seeds = Float32Array.from({ length: Math.max(RAIN, FLAKES) * 4 }, Math.random);
	const wrap = (v, size) => ((v % size) + size) % size;
	function weather(game, time, focus, span) {
		const w = game.weather,
			kind = w.kind,
			k = w.intensity;
		rain.visible = kind === "rain" && k > 0.02;
		flakes.visible = (kind === "snow" || kind === "sand") && k > 0.02;
		const ground = heightAt(focus.x, focus.y),
			x0 = focus.x - span / 2,
			z0 = focus.y - span / 2;
		if (rain.visible) {
			const n = Math.floor(RAIN * k),
				fallH = 520,
				wind = 0.25;
			for (let i = 0; i < n; i++) {
				const s = seeds[i * 4 + 3] * 0.4 + 0.8,
					drop = wrap(seeds[i * 4 + 1] * fallH - time * 900 * s, fallH),
					x = x0 + wrap(seeds[i * 4] * span + time * 900 * s * wind, span),
					z = z0 + seeds[i * 4 + 2] * span,
					y = ground + drop;
				rainPositions.set([x, y, z, x - 26 * wind, y + 26, z], i * 6);
			}
			rainGeometry.setDrawRange(0, n * 2);
			rainGeometry.attributes.position.needsUpdate = true;
			rain.material.opacity = 0.25 + k * 0.3;
		}
		if (flakes.visible) {
			const sand = kind === "sand",
				n = Math.floor(FLAKES * k),
				fallH = sand ? 140 : 420;
			for (let i = 0; i < n; i++) {
				const s = seeds[i * 4 + 3] * 0.6 + 0.7;
				let x, y, z;
				if (sand) {
					// Low dust racing across the ground.
					x = x0 + wrap(seeds[i * 4] * span + time * 520 * s, span);
					y = ground + seeds[i * 4 + 1] * fallH + Math.sin(time * 3 + i) * 6;
					z = z0 + wrap(seeds[i * 4 + 2] * span + time * 90 * s, span);
				} else {
					x = x0 + wrap(seeds[i * 4] * span + Math.sin(time * 0.8 + i) * 18 + time * 30, span);
					y = ground + wrap(seeds[i * 4 + 1] * fallH - time * 70 * s, fallH);
					z = z0 + seeds[i * 4 + 2] * span;
				}
				flakePositions.set([x, y, z], i * 3);
			}
			flakeGeometry.setDrawRange(0, n);
			flakeGeometry.attributes.position.needsUpdate = true;
			flakes.material.color.set(sand ? "#d8b47c" : "#ffffff");
			flakes.material.size = sand ? 5 : 7;
			flakes.material.opacity = sand ? 0.55 * k + 0.2 : 0.9;
		}
		// Lightning in thunderstorms (the same timing as the Canvas and WebGL sky).
		const strike = time % 17,
			flash = kind === "rain" && k > 0.4 && strike < 1.3 ? Math.sin((Math.PI * strike) / 1.3) * (strike < 0.25 || (strike > 0.45 && strike < 0.6) ? 1 : 0.35) : 0;
		return { kind, intensity: k, flash, haze: kind === "sand" ? k : kind === "snow" ? k * 0.6 : k * 0.35 };
	}

	return {
		setGame(game) {
			buildWater(game);
			smoke.clear();
			fire.clear();
		},
		// One frame: returns the weather state for the renderer (haze, lightning flash).
		update(dt, { game, time, night, focus, span, hidden, scale, light }) {
			for (const w of waters) {
				const m = w.mesh.material;
				if (m.normalMap) m.normalMap.offset.set(time * 0.012, time * 0.007);
				if (w.kind === "lava") {
					m.emissiveMap.offset.set(time * 0.01, -time * 0.006);
					m.emissiveIntensity = 1.2 + Math.sin(time * 1.7) * 0.2;
				}
				if (w.kind === "glow") m.emissiveIntensity = 0.25 + night * 0.4;
			}
			nightLights(game, night, hidden);
			damageAndExplosions(game, dt, hidden);
			for (const sys of [smoke, fire]) sys.material.uniforms.scale.value = scale;
			smoke.material.uniforms.light.value = light;
			const n = smoke.update(dt) + fire.update(dt);
			const state = weather(game, time, focus, span);
			state.particles = n;
			return state;
		},
	};
}
