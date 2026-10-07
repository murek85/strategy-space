/* Ground marks and links of the 3D renderer, rebuilt every frame from the game state (the 2D board paints
   them on the ground; on the 3D board the ground painting is static). Visual only, same rules as 2D.
   - Wall links: a wall between neighbouring walls, gates and turrets of one side (30–70 apart, not through
     an open gate; AdvancedArt.walls), half height while either end is being built.
   - Tracks: vehicle treads and infantry footprints (game.tracks), fading with their life.
   - Craters: pits of heavy blasts (game.craters), fading over CRATER_LIFE — a decal of the pit (the inner
     wall lit on the side facing the sun, soot, rays of thrown-out soil, the floor glowing while fresh),
     a raised rim of earth all round and scorched stones scattered about.
   - Scorch marks: smaller blasts (no crater) leave soot splashes on the ground for a minute.
   - Creature habitats: a dashed ring and scattered bones around the home of every threat in sight
     (AdvancedArt.habitats).
   Decals are flat quads tilted to the slope under them; one instanced draw per kind. */
export function createMarks3D(THREE, { world, heightAt, fogged }) {
	const group = new THREE.Group();
	world.add(group);
	const m = new THREE.Matrix4(),
		q = new THREE.Quaternion(),
		p = new THREE.Vector3(),
		s = new THREE.Vector3(),
		up = new THREE.Vector3(0, 1, 0),
		normal = new THREE.Vector3(),
		spin = new THREE.Quaternion();

	// ---------- wall links ----------
	const MAX_WALLS = 600,
		std = (c) => fogged(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.15, flatShading: true })),
		wallBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std("#5d7377"), MAX_WALLS),
		wallCap = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std("#8aa0a2"), MAX_WALLS);
	for (const w of [wallBody, wallCap]) {
		w.castShadow = w.receiveShadow = true;
		w.frustumCulled = false;
		w.count = 0;
		group.add(w);
	}
	function wallLinks(game) {
		const nodes = game.entities.filter((e) => e.hp > 0 && (e.type === "wall" || e.type === "gate" || e.type === "turret"));
		let n = 0;
		for (let i = 0; i < nodes.length && n < MAX_WALLS; i++)
			for (let j = i + 1; j < nodes.length && n < MAX_WALLS; j++) {
				const a = nodes[i],
					b = nodes[j],
					d = Math.hypot(b.x - a.x, b.y - a.y);
				if (a.team !== b.team || d > 70 || d < 30 || (!game.isVisible(a.x, a.y) && !game.isVisible(b.x, b.y)) || a.open || b.open) continue;
				const ha = heightAt(a.x, a.y),
					hb = heightAt(b.x, b.y),
					h = a.constructionLeft || b.constructionLeft ? 11 : 22,
					angle = Math.atan2(b.y - a.y, b.x - a.x);
				q.setFromAxisAngle(up, -angle);
				p.set((a.x + b.x) / 2, (ha + hb) / 2 + h / 2, (a.y + b.y) / 2);
				wallBody.setMatrixAt(n, m.compose(p, q, s.set(d, h, 12)));
				p.y += h / 2 + 1.5;
				wallCap.setMatrixAt(n, m.compose(p, q, s.set(d, 3, 15)));
				n++;
			}
		for (const w of [wallBody, wallCap]) {
			w.count = n;
			w.instanceMatrix.needsUpdate = true;
		}
	}

	// ---------- decals (tracks, footprints, craters, habitat rings) ----------
	// Per instance: alpha and kind (0 treads, 1 footprints, 2 crater, 3 habitat ring); drawn procedurally.
	function decalBatch(max, kindColor) {
		const g = new THREE.InstancedBufferGeometry();
		const base = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
		g.index = base.index;
		g.setAttribute("position", base.attributes.position);
		g.setAttribute("uv", base.attributes.uv);
		const alpha = new THREE.InstancedBufferAttribute(new Float32Array(max), 1),
			kind = new THREE.InstancedBufferAttribute(new Float32Array(max), 1),
			age = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
		g.setAttribute("aAlpha", alpha);
		g.setAttribute("aKind", kind);
		g.setAttribute("aAge", age);
		const material = new THREE.ShaderMaterial({
			uniforms: { tint: { value: new THREE.Color(kindColor) }, sun: { value: new THREE.Vector2(0.5, 0.5) }, soil: { value: new THREE.Color("#5a4a3a") } },
			vertexShader: `attribute float aAlpha; attribute float aKind; attribute float aAge; varying float vAlpha; varying float vKind; varying float vAge; varying vec2 vUv;
				void main() { vAlpha = aAlpha; vKind = aKind; vAge = aAge; vUv = uv;
					gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
			fragmentShader: `uniform vec3 tint; uniform vec2 sun; uniform vec3 soil; varying float vAlpha; varying float vKind; varying float vAge; varying vec2 vUv;
				float dHash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
				// Smooth noise round a circle (angle) and over the decal, for ragged rays and blotches.
				float dWave(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(dHash(i), dHash(i + 1.0), f); }
				float dSpot(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); float a = dHash(i.x + i.y * 57.0), b = dHash(i.x + 1.0 + i.y * 57.0), c2 = dHash(i.x + (i.y + 1.0) * 57.0), d = dHash(i.x + 1.0 + (i.y + 1.0) * 57.0); return mix(mix(a, b, f.x), mix(c2, d, f.x), f.y); }
				void main() {
					vec2 c = vUv - 0.5; float a = 0.0; vec3 col = tint;
					if (vKind < 0.5) {
						// Two treads with cross bars.
						float lane = step(0.12, abs(c.y)) * (1.0 - step(0.36, abs(c.y)));
						a = lane * (0.55 + 0.45 * step(0.5, fract(vUv.x * 5.0)));
					} else if (vKind < 1.5) {
						// Two boot prints.
						a = 1.0 - smoothstep(0.12, 0.2, length((c - vec2(-0.15, -0.18)) * vec2(1.0, 1.6)));
						a = max(a, 1.0 - smoothstep(0.12, 0.2, length((c - vec2(0.15, 0.18)) * vec2(1.0, 1.6))));
					} else if (vKind < 2.5) {
						// Crater: the pit (its inner wall lit where it faces the sun, the floor dark with soot),
						// rays of thrown-out soil and soot beyond the rim, the floor glowing while fresh.
						float r = length(c) * 2.0, ang = atan(c.y, c.x);
						float pit = 1.0 - smoothstep(0.42, 0.5, r);
						float wall = smoothstep(0.12, 0.42, r) * pit;
						float facing = clamp(0.5 - dot(normalize(c + 1e-4), normalize(sun)) * 0.5, 0.0, 1.0);
						vec3 floorCol = vec3(0.05, 0.045, 0.04);
						vec3 wallCol = mix(soil * 0.35, soil * 1.05, facing);
						float u = (ang + 3.1416) / 6.2832 * 13.0;
						float rays = smoothstep(0.25, 0.85, dWave(u) * 0.6 + dWave(u * 2.7 + 5.0) * 0.4);
						float ejecta = smoothstep(0.45, 0.55, r) * (1.0 - smoothstep(0.6 + rays * 0.35, 1.0, r)) * (0.35 + 0.65 * rays);
						float soot = (1.0 - smoothstep(0.4, 0.95, r)) * (0.5 + 0.5 * rays);
						col = mix(mix(floorCol, wallCol, wall), soil * 0.55, (1.0 - pit) * 0.5);
						col = mix(col, tint, soot * (1.0 - pit) * 0.7);
						a = max(pit, max(ejecta * 0.75, soot * 0.6));
						float ember = (1.0 - smoothstep(0.0, 0.08, vAge)) * (1.0 - smoothstep(0.08, 0.34, r)) * smoothstep(0.45, 0.75, dSpot(vUv * 18.0));
						col += vec3(1.0, 0.35, 0.08) * ember * 1.4;
					} else if (vKind > 3.5) {
						// Scorch: a splash of soot, darkest in the middle, ragged rays outwards.
						float r = length(c) * 2.0, ang = atan(c.y, c.x);
						float u = (ang + 3.1416) / 6.2832 * 11.0;
						float rays = dWave(u) * 0.6 + dWave(u * 2.9 + 3.0) * 0.4;
						a = (1.0 - smoothstep(0.12, 0.45 + rays * 0.5, r)) * (0.5 + 0.5 * rays) * (0.75 + 0.25 * dSpot(vUv * 12.0));
					} else {
						// Habitat: a dashed ring.
						float r = length(c) * 2.0, ang = atan(c.y, c.x);
						a = smoothstep(0.9, 0.93, r) * (1.0 - smoothstep(0.96, 0.99, r)) * step(0.45, fract(ang * 5.0));
						col = vec3(0.87, 0.67, 0.42);
					}
					if (a * vAlpha < 0.01) discard;
					gl_FragColor = vec4(col, a * vAlpha);
				}`,
			transparent: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -3,
			polygonOffsetUnits: -6,
		});
		const mesh = new THREE.InstancedMesh(g, material, max);
		mesh.frustumCulled = false;
		mesh.renderOrder = 1;
		mesh.count = 0;
		group.add(mesh);
		return { mesh, alpha, kind, age, max, n: 0 };
	}
	const decals = decalBatch(900, "#0c1218");
	// A decal at (x, y), turned by angle, size w × h, tilted to the slope.
	function decal(x, y, angle, w, h, alpha, kind, age = 1) {
		if (decals.n >= decals.max) return;
		const e = 4,
			dx = (heightAt(x + e, y) - heightAt(x - e, y)) / (2 * e),
			dz = (heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e);
		normal.set(-dx, 1, -dz).normalize();
		q.setFromUnitVectors(up, normal).multiply(spin.setFromAxisAngle(up, -angle));
		decals.mesh.setMatrixAt(decals.n, m.compose(p.set(x, heightAt(x, y) + 0.7, y), q, s.set(w, 1, h)));
		decals.alpha.array[decals.n] = alpha;
		decals.kind.array[decals.n] = kind;
		decals.age.array[decals.n] = age;
		decals.n++;
	}

	// ---------- crater rims and debris ----------
	// A rim of thrown-up earth: a ragged ring lathe (unit diameter 1), and scorched stones round it.
	const rimGeo = (() => {
		const pts = [[0.2, 0], [0.235, 0.18], [0.265, 0.35], [0.3, 0.22], [0.35, 0.08], [0.4, 0]].map(([r, y]) => new THREE.Vector2(r, y)),
			g = new THREE.LatheGeometry(pts, 22),
			pos = g.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i),
				z = pos.getZ(i),
				a = Math.atan2(z, x),
				k = 1 + 0.12 * Math.sin(a * 5 + 1.3) + 0.06 * Math.sin(a * 11);
			pos.setY(i, pos.getY(i) * k * (0.8 + 0.4 * Math.abs(Math.sin(a * 3.7))));
		}
		g.computeVertexNormals();
		return g;
	})();
	const MAX_CRATERS = 60,
		rims = new THREE.InstancedMesh(rimGeo, std("#4c3f33"), MAX_CRATERS),
		stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), std("#4a4038"), MAX_CRATERS * 7);
	for (const r of [rims, stones]) {
		r.castShadow = r.receiveShadow = true;
		r.frustumCulled = false;
		r.count = 0;
		group.add(r);
	}
	// Scorch marks of smaller blasts, kept here (the game keeps craters only).
	const scorches = [],
		seenBlasts = new WeakSet();

	// ---------- habitat bones ----------
	const bones = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std("#d1bc8b"), 200);
	bones.castShadow = true;
	bones.frustumCulled = false;
	bones.count = 0;
	group.add(bones);

	function update(game, { hidden, sun }) {
		wallLinks(game);
		decals.n = 0;
		const biome = RTS.MISSIONS[game.missionId]?.biome;
		decals.mesh.material.uniforms.tint.value.set(biome === "ice" ? "#162c40" : "#0a0f16");
		decals.mesh.material.uniforms.soil.value.set(biome === "ice" ? "#7c8a94" : biome === "ash" ? "#3e3633" : "#6a5642");
		rims.material.color.set(biome === "ice" ? "#8796a0" : biome === "ash" ? "#3a3330" : "#5a4a3a");
		if (sun) decals.mesh.material.uniforms.sun.value.set(sun.x, sun.z);
		for (const t of game.tracks || []) {
			if (!game.isVisible(t.x, t.y)) continue;
			const a = Math.min(0.38, t.life / 45);
			if (t.vehicle) decal(t.x, t.y, t.angle, 16, 30, a, 0);
			else decal(t.x, t.y, t.angle, 12, 12, a, 1);
		}
		// Scorch marks from blasts that made no crater (on the ground, seen): a minute each.
		for (const ef of game.effects || []) {
			if (ef.kind !== "explosion" || seenBlasts.has(ef) || ef.crater === undefined) continue;
			seenBlasts.add(ef);
			if (!ef.crater && !ef.air && game.isVisible(ef.x, ef.y)) scorches.push({ x: ef.x, y: ef.y, size: ef.size || 40, born: game.time, turn: (ef.x * 7 + ef.y * 3) % 6.28 });
		}
		while (scorches.length && (game.time - scorches[0].born > 60 || scorches.length > 80)) scorches.shift();
		for (const sc of scorches) decal(sc.x, sc.y, sc.turn, sc.size * 1.3, sc.size * 1.3, Math.max(0, 1 - (game.time - sc.born) / 60) * 0.55, 4);
		let cr = 0,
			st = 0;
		for (const c of game.craters || []) {
			if (!game.explored[game.visionIndex(c.x, c.y)]) continue;
			const age = (game.time - c.born) / (RTS.CRATER_LIFE || 300),
				fade = Math.max(0, 1 - age),
				d = c.size * 2.6;
			decal(c.x, c.y, c.seed, d, d, fade * 0.9, 2, age);
			// The rim sinks back as the crater fades; the stones stay until it is gone.
			if (cr < MAX_CRATERS) {
				rims.setMatrixAt(cr++, m.compose(p.set(c.x, heightAt(c.x, c.y) - 0.3, c.y), q.setFromAxisAngle(up, c.seed), s.set(d, c.size * 0.7 * Math.min(1, fade * 1.6), d)));
				for (let k = 0; k < 7 && st < stones.instanceMatrix.count; k++) {
					const a = c.seed * 3 + k * 2.39,
						rr = d * (0.32 + ((k * 37 + c.seed * 11) % 10) * 0.05),
						x = c.x + Math.cos(a) * rr,
						y = c.y + Math.sin(a) * rr,
						sz = c.size * (0.04 + (k % 3) * 0.02) * Math.min(1, fade * 2);
					stones.setMatrixAt(st++, m.compose(p.set(x, heightAt(x, y) + sz * 0.3, y), q.setFromAxisAngle(up, a * 1.7), s.set(sz * 1.3, sz * 0.8, sz)));
				}
			}
		}
		rims.count = cr;
		stones.count = st;
		rims.instanceMatrix.needsUpdate = stones.instanceMatrix.needsUpdate = true;
		// Habitats: ring, bones (AdvancedArt.habitats: threats with a home, in sight).
		let b = 0;
		for (const e of game.entities) {
			if (e.hp <= 0 || !RTS.TYPES[e.type]?.threat) continue;
			const h = e.home || e;
			if (!game.isVisible(h.x, h.y) || hidden?.({ ...h, team: -1 })) continue;
			decal(h.x, h.y, 0, 270, 200, 0.8, 3);
			for (let i = 0; i < 7 && b < 200; i++, b++) {
				const a = i * 2.4,
					x = h.x + Math.cos(a) * (74 + i * 5),
					y = h.y + Math.sin(a) * (58 + i * 3);
				bones.setMatrixAt(b, m.compose(p.set(x, heightAt(x, y) + 1.2, y), q.setFromAxisAngle(up, a * 1.7), s.set(14, 2.4, 3)));
			}
		}
		bones.count = b;
		bones.instanceMatrix.needsUpdate = true;
		decals.mesh.count = decals.n;
		decals.mesh.instanceMatrix.needsUpdate = true;
		decals.alpha.needsUpdate = decals.kind.needsUpdate = decals.age.needsUpdate = true;
	}
	return { update, stats: () => ({ decals: decals.n, wallLinks: wallBody.count }) };
}
