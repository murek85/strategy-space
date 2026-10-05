/* Ground marks and links of the 3D renderer, rebuilt every frame from the game state (the 2D board paints
   them on the ground; on the 3D board the ground painting is static). Visual only, same rules as 2D.
   - Wall links: a wall between neighbouring walls, gates and turrets of one side (30–70 apart, not through
     an open gate; AdvancedArt.walls), half height while either end is being built.
   - Tracks: vehicle treads and infantry footprints (game.tracks), fading with their life.
   - Craters: scorched pits of heavy blasts (game.craters), fading over CRATER_LIFE.
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
			kind = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
		g.setAttribute("aAlpha", alpha);
		g.setAttribute("aKind", kind);
		const material = new THREE.ShaderMaterial({
			uniforms: { tint: { value: new THREE.Color(kindColor) } },
			vertexShader: `attribute float aAlpha; attribute float aKind; varying float vAlpha; varying float vKind; varying vec2 vUv;
				void main() { vAlpha = aAlpha; vKind = aKind; vUv = uv;
					gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
			fragmentShader: `uniform vec3 tint; varying float vAlpha; varying float vKind; varying vec2 vUv;
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
						// Crater: dark pit, a lighter thrown-out rim, scorch fading outward.
						float r = length(c) * 2.0;
						float pit = 1.0 - smoothstep(0.35, 0.55, r);
						float rim = smoothstep(0.45, 0.6, r) * (1.0 - smoothstep(0.6, 0.78, r));
						float scorch = (1.0 - smoothstep(0.5, 1.0, r)) * 0.6;
						a = max(max(pit, scorch), rim * 0.7);
						col = mix(tint, vec3(0.45, 0.38, 0.3), rim * (1.0 - pit));
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
		return { mesh, alpha, kind, max, n: 0 };
	}
	const decals = decalBatch(900, "#0c1218");
	// A decal at (x, y), turned by angle, size w × h, tilted to the slope.
	function decal(x, y, angle, w, h, alpha, kind) {
		if (decals.n >= decals.max) return;
		const e = 4,
			dx = (heightAt(x + e, y) - heightAt(x - e, y)) / (2 * e),
			dz = (heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e);
		normal.set(-dx, 1, -dz).normalize();
		q.setFromUnitVectors(up, normal).multiply(spin.setFromAxisAngle(up, -angle));
		decals.mesh.setMatrixAt(decals.n, m.compose(p.set(x, heightAt(x, y) + 0.7, y), q, s.set(w, 1, h)));
		decals.alpha.array[decals.n] = alpha;
		decals.kind.array[decals.n] = kind;
		decals.n++;
	}

	// ---------- habitat bones ----------
	const bones = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std("#d1bc8b"), 200);
	bones.castShadow = true;
	bones.frustumCulled = false;
	bones.count = 0;
	group.add(bones);

	function update(game, { hidden }) {
		wallLinks(game);
		decals.n = 0;
		const biome = RTS.MISSIONS[game.missionId]?.biome;
		decals.mesh.material.uniforms.tint.value.set(biome === "ice" ? "#162c40" : "#0a0f16");
		for (const t of game.tracks || []) {
			if (!game.isVisible(t.x, t.y)) continue;
			const a = Math.min(0.38, t.life / 45);
			if (t.vehicle) decal(t.x, t.y, t.angle, 16, 30, a, 0);
			else decal(t.x, t.y, t.angle, 12, 12, a, 1);
		}
		for (const c of game.craters || []) {
			if (!game.explored[game.visionIndex(c.x, c.y)]) continue;
			const age = (game.time - c.born) / (RTS.CRATER_LIFE || 300);
			decal(c.x, c.y, c.seed, c.size * 2.6, c.size * 2.6, Math.max(0, 1 - age) * 0.85, 2);
		}
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
		decals.alpha.needsUpdate = decals.kind.needsUpdate = true;
	}
	return { update, stats: () => ({ decals: decals.n, wallLinks: wallBody.count }) };
}
