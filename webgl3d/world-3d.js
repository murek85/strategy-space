/* Map features that change in time on the 3D board (M5, 0.166; rules in world-rules.js), rebuilt every frame
   from the game state (the ground painting is static):
   - the tide: sheets of sea water over the sandbars, rising and falling with game.tide().level;
   - holes in the ice: dark open water in a ring of broken white ice, freezing back (game.iceHoles);
   - comets crossing the field in space: a blazing head and a long tail of glowing dust (game.comets()). */
export function createWorld3D(THREE, { world, heightAt }) {
	const group = new THREE.Group();
	world.add(group);
	const m = new THREE.Matrix4(),
		q = new THREE.Quaternion(),
		p = new THREE.Vector3(),
		s = new THREE.Vector3(),
		flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

	// ---------- the tide over the fords ----------
	const MAX_TIDE = 16,
		tideMaterial = new THREE.MeshStandardMaterial({ color: "#3a9cb0", roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0, depthWrite: false }),
		tide = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 40), tideMaterial, MAX_TIDE);
	tide.frustumCulled = false;
	tide.count = 0;
	tide.renderOrder = 2;
	group.add(tide);

	// ---------- holes in the ice ----------
	const MAX_HOLES = 32,
		holeWater = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14), new THREE.MeshStandardMaterial({ color: "#163a4e", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.95, depthWrite: false }), MAX_HOLES),
		holeRim = new THREE.InstancedMesh(new THREE.RingGeometry(0.82, 1.12, 14), new THREE.MeshStandardMaterial({ color: "#f2fafc", roughness: 0.6, transparent: true, opacity: 0.95, depthWrite: false }), MAX_HOLES);
	for (const h of [holeWater, holeRim]) {
		h.frustumCulled = false;
		h.count = 0;
		h.renderOrder = 2;
		group.add(h);
	}

	// ---------- comets ----------
	const glowTexture = (() => {
		const c = document.createElement("canvas");
		c.width = c.height = 64;
		const x = c.getContext("2d"),
			g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
		g.addColorStop(0, "rgba(255,255,255,1)");
		g.addColorStop(0.3, "rgba(200,236,255,.7)");
		g.addColorStop(1, "rgba(120,180,255,0)");
		x.fillStyle = g;
		x.fillRect(0, 0, 64, 64);
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		return t;
	})();
	const TAIL = 28,
		comets = [0, 1].map(() => {
			const holder = new THREE.Group(),
				head = new THREE.Mesh(new THREE.SphereGeometry(16, 14, 10), new THREE.MeshBasicMaterial({ color: "#f4fbff" })),
				parts = [];
			holder.add(head);
			for (let i = 0; i < TAIL; i++) {
				const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: i % 3 ? "#9fd0ff" : "#e6f6ff", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
				holder.add(sprite);
				parts.push(sprite);
			}
			const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: "#ffffff", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
			halo.scale.set(130, 130, 1);
			halo.material.opacity = 0.7;
			holder.add(halo);
			holder.visible = false;
			group.add(holder);
			return { holder, parts };
		});

	function update(game, { time = game.time } = {}) {
		// The tide.
		const level = game.tide?.()?.level || 0;
		let n = 0;
		if (level > 0)
			for (const w of game.tideBodies?.() || []) {
				if (n >= MAX_TIDE) break;
				p.set(w.x, heightAt(w.x, w.y) + 2 + level * 2, w.y);
				tide.setMatrixAt(n++, m.compose(p, flat, s.set(w.rx * 0.95, w.ry * 0.95, 1)));
			}
		tide.count = n;
		tide.instanceMatrix.needsUpdate = true;
		tideMaterial.opacity = 0.85 * level;
		// Holes in the ice.
		n = 0;
		for (const h of game.iceHoles || []) {
			if (n >= MAX_HOLES) break;
			const fade = Math.max(0.05, Math.min(1, (h.until - game.time) / 10));
			p.set(h.x, heightAt(h.x, h.y) + 1.2, h.y);
			m.compose(p, flat, s.set(h.r * fade, h.r * 0.85 * fade, 1));
			holeWater.setMatrixAt(n, m);
			p.y += 0.3;
			holeRim.setMatrixAt(n, m.compose(p, flat, s.set(h.r * fade, h.r * 0.85 * fade, 1)));
			n++;
		}
		for (const h of [holeWater, holeRim]) {
			h.count = n;
			h.instanceMatrix.needsUpdate = true;
		}
		// Comets.
		const list = game.comets?.() || [];
		comets.forEach((k, i) => {
			const c = list[i];
			k.holder.visible = !!c;
			if (!c) return;
			const y = 90;
			k.holder.position.set(c.x, y, c.y);
			const len = Math.hypot(c.x - c.tail.x, c.y - c.tail.y);
			k.parts.forEach((sp, j) => {
				const t = (j + 1) / TAIL,
					wobble = Math.sin(time * 2 + j * 0.7) * 6 * t,
					side = t * t * 70;
				sp.position.set(-c.dx * len * t + -c.dy * (side + wobble), -t * 20, -c.dy * len * t + c.dx * (side + wobble));
				const size = 40 + t * 140;
				sp.scale.set(size, size, 1);
				sp.material.opacity = 0.32 * (1 - t);
			});
		});
	}
	return { update };
}
