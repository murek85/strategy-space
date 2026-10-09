/* The Watchers of the Abyss in detail (0.154): smooth white stone plates cut by cyan seams of light, parts
   hovering with no visible joints, rings and lenses (watchers-art.js). Built with the shape kit of
   models-detail-3d.js; same contract as models-3d.js ({ root, update(e, info) }, +X the front, +Y up,
   +Z the right side).
   - Buildings: a hexagonal pad with a ring of light, white pillars with seams and hovering caps; the Core a
     great diamond floating in a ring with orbiting plates, the forges a rift of light between pillars, the
     Anchor a pillar threaded by three turning rings, the Resonator a tuning fork over a dish, the Spire a
     floating diamond turning to the target.
   - Units: no legs, no tracks — a lens-shaped body hovering over a disc of light, plates floating beside
     it, prongs, a prism or arc horns as weapons; the Construct ringed by orbiting plates; flyers with
     blade wings and a ring. */
export function createWatchers3D(THREE, { tools, group }) {
	const { mesh, box, ball, loftGeo, cylGeo, torusGeo } = tools,
		UP = new THREE.Vector3(0, 1, 0),
		n2 = (v) => Math.round(v * 100) / 100;
	const hash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

	// A rod from a to b (horns, prongs).
	function limb(parent, m, a, b, r0, r1, segs = 6) {
		const A = new THREE.Vector3(...a),
			B = new THREE.Vector3(...b),
			o = mesh(parent, cylGeo(n2(r1), n2(r0), n2(A.distanceTo(B)), segs), m);
		o.position.copy(A).add(B).multiplyScalar(0.5);
		o.quaternion.setFromUnitVectors(UP, B.sub(A).normalize());
		return o;
	}
	// A diamond (two six-sided cones base to base), width w, height h, centred at its waist.
	function diamond(parent, m, [x, y, z], w, h, rot) {
		const g = group(parent, [x, y, z]);
		mesh(g, cylGeo(0, n2(w), n2(h * 0.55), 6), m, [0, h * 0.275, 0]);
		mesh(g, cylGeo(n2(w), 0, n2(h * 0.45), 6), m, [0, -h * 0.225, 0]);
		if (rot) g.rotation.set(...rot);
		return g;
	}
	// A white pillar (square, slightly tapering) with seams of light on two faces, the team band at its foot
	// and optionally a cap hovering above a gap. Returns the cap (it bobs) or null.
	function pillar(parent, k, [x, z], w, h, o = {}) {
		const base = o.y ?? 3;
		mesh(parent, cylGeo(n2(w * 0.5), n2(w * 0.72), n2(h), 4), k.plate, [x, base + h / 2, z], [0, Math.PI / 4, 0]);
		box(parent, k.glass, [0.6, h * 0.8, 1.1], [x + w * 0.6, base + h * 0.48, z], [0, 0, 0.03], 0.1);
		box(parent, k.glass, [1.1, h * 0.8, 0.6], [x, base + h * 0.48, z + w * 0.6], [-0.03, 0, 0], 0.1);
		if (o.team) box(parent, k.team, [w * 1.3, 2, w * 1.3], [x, base + h * 0.12, z], null, 0.3);
		for (const b of o.bands || []) box(parent, k.dark, [w * 1.05, 1, w * 1.05], [x, base + h * b, z], null, 0.2);
		if (!o.cap) return null;
		const cap = group(parent, [x, base + h + o.cap, z]);
		diamond(cap, k.plate, [0, 0, 0], w * 0.55, w * 1.1);
		return cap;
	}
	const ring = (parent, m, R, t, pos, segs = 28) => mesh(parent, torusGeo(n2(R), n2(t), segs), m, pos);

	// ---------- buildings ----------
	function building(k, r, type) {
		const root = new THREE.Group(),
			seed = hash(type),
			spin = [],
			bob = [];
		// The hexagonal pad and its ring of light.
		mesh(root, cylGeo(n2(r * 0.86), n2(r * 0.94), 2.6, 6), k.warn, [0, 1.3, 0]);
		ring(root, k.glass, r * 0.74, 0.5, [0, 2.7, 0], 6);
		mesh(root, cylGeo(n2(r * 0.6), n2(r * 0.66), 1.4, 6), k.metal, [0, 3.3, 0], [0, Math.PI / 6, 0]);
		const cap = (c, y, phase = 0) => c && bob.push([c, c.position.y, phase]);
		let head = null;
		if (type === "hq") {
			// The Core: a great diamond hovering in a ring of light, three plates orbiting it, two side pillars.
			const core = group(root, [0, r * 1.05, 0]);
			diamond(core, k.plate, [0, 0, 0], r * 0.42, r * 1.05);
			ball(core, k.glass, r * 0.14, [r * 0.3, 0, 0]);
			box(core, k.team, [r * 0.86, 2.2, 2.2], [0, -r * 0.12, 0], [0, 0, 0], 0.3);
			ring(core, k.glass, r * 0.58, 0.9, [0, 0, 0]);
			bob.push([core, core.position.y, 0]);
			const orbit = group(root, [0, r * 1.05, 0]);
			for (let i = 0; i < 3; i++) {
				const a = (i / 3) * Math.PI * 2;
				box(orbit, k.plate, [r * 0.05, r * 0.26, r * 0.16], [Math.cos(a) * r * 0.82, 0, Math.sin(a) * r * 0.82], [0, -a, 0.1], 0.4);
			}
			spin.push([orbit, 0.35]);
			for (const z of [-1, 1]) cap(pillar(root, k, [-r * 0.45, z * r * 0.55], r * 0.16, r * 0.62, { team: z < 0, cap: 5 }), 0, z);
		} else if (type === "barracks" || type === "factory") {
			// The forges: pillars round a rift of light — units step out of it.
			const big = type === "factory",
				h = r * (big ? 1.25 : 1.15),
				xs = big ? [-0.62, -0.22, 0.22, 0.62] : [-0.36, 0.36];
			xs.forEach((x, i) => cap(pillar(root, k, [0, x * r], r * (big ? 0.15 : 0.2), h * (big && (i === 0 || i === 3) ? 0.72 : 1), { team: i === 0, bands: [0.5], cap: 4 }), 0, i));
			const rift = group(root, [0, 4 + h * 0.5, 0]);
			mesh(rift, cylGeo(0, n2(r * 0.12), n2(h * 0.5), 4, "y"), k.glass, [0, h * 0.25, 0]).scale.set(0.25, 1, 1);
			mesh(rift, cylGeo(n2(r * 0.12), 0, n2(h * 0.5), 4, "y"), k.glass, [0, -h * 0.25, 0]).scale.set(0.25, 1, 1);
			spin.push([rift, 0, "pulse"]);
			if (big) {
				const halo = group(root, [0, 4 + h + 6, 0]);
				ring(halo, k.glass, r * 0.42, 0.8, [0, 0, 0]);
				spin.push([halo, 0.4]);
			}
		} else if (type === "anchor") {
			// The Anchor: a slender pillar threaded by three rings turning at their own pace, a crystal on top.
			pillar(root, k, [0, 0], r * 0.2, r * 2.2, { team: true });
			[0.6, 1.2, 1.8].forEach((y, i) => {
				const g = group(root, [0, 3 + r * y, 0]);
				ring(g, i === 1 ? k.glass : k.plate, r * (0.62 - i * 0.12), 1.1, [0, 0, 0]);
				g.rotation.x = 0.25 * (i - 1);
				spin.push([g, (i % 2 ? -1 : 1) * (0.5 + i * 0.2)]);
			});
			const top = group(root, [0, 3 + r * 2.2 + 8, 0]);
			diamond(top, k.glass, [0, 0, 0], r * 0.14, r * 0.42);
			bob.push([top, top.position.y, 1]);
		} else if (type === "resonator") {
			// The Resonator: a dish over the deposit, a tuning fork of two prongs, a lens humming between them.
			mesh(root, cylGeo(n2(r * 0.7), n2(r * 0.4), 3, 18), k.plate, [0, 5.5, 0]);
			ring(root, k.glass, r * 0.5, 0.6, [0, 7, 0]);
			for (const z of [-1, 1]) {
				limb(root, k.plate, [0, 6, z * r * 0.14], [0, 6 + r * 1.1, z * r * 0.24], r * 0.07, r * 0.045);
				if (z < 0) box(root, k.team, [r * 0.16, 2, r * 0.16], [0, 10, z * r * 0.15], null, 0.3);
			}
			const hum = group(root, [0, 6 + r * 0.75, 0]);
			ball(hum, k.glass, r * 0.12, [0, 0, 0]);
			ring(hum, k.glass, r * 0.24, 0.35, [0, 0, 0]);
			spin.push([hum, 0, "pulse"]);
		} else if (type === "turret" || type === "flak" || type === "shieldgen") {
			// Defences: a spire (twin spires for the flak) under a floating diamond head turning to the target.
			const twin = type === "flak",
				H = r * (twin ? 1.3 : 1.7);
			for (const z of twin ? [-0.3, 0.3] : [0]) pillar(root, k, [0, z * r], r * 0.18, H, { team: z <= 0, bands: [0.35, 0.7] });
			head = group(root, [0, 3 + H + 9, 0]);
			diamond(head, k.plate, [0, 0, 0], r * 0.2, r * 0.6);
			ball(head, k.glass, r * 0.08, [r * 0.18, 0, 0]);
			ring(head, k.glass, r * 0.32, 0.5, [0, 0, 0], 20);
			for (const z of twin ? [-2.5, 2.5] : type === "turret" ? [0] : []) limb(head, k.metal, [r * 0.1, 0, z], [r * 0.6, 0, z], 1.2, 0.5);
			bob.push([head, head.position.y, 0]);
		} else {
			// Any other building: one to three pillars with hovering caps, a floating diamond beside them.
			const n = 1 + (seed % 3),
				H = r * (0.9 + ((seed >> 3) % 6) / 10);
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2 + (seed % 5);
				cap(pillar(root, k, n === 1 ? [0, 0] : [Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36], r * (n === 1 ? 0.3 : 0.2), H * (1 - i * 0.15), { team: i === 0, bands: [0.5], cap: 5 }), 0, i);
			}
			const float = group(root, [-r * 0.45, H * 0.8, r * 0.45]);
			diamond(float, k.glass, [0, 0, 0], r * 0.1, r * 0.3);
			bob.push([float, float.position.y, 2]);
			const halo = group(root, [0, 6, 0]);
			ring(halo, k.plate, r * 0.62, 0.9, [0, 0, 0]);
			spin.push([halo, 0.2]);
		}
		return {
			root,
			update(e, i) {
				for (const [g, v, kind] of spin) {
					if (kind === "pulse") g.scale.setScalar(1 + Math.sin(i.time * 3 + (e.id || 0)) * 0.08);
					else g.rotation.y = i.time * v;
				}
				for (const [g, y, p] of bob) g.position.y = y + Math.sin(i.time * 1.4 + p * 1.7 + (e.id || 0)) * 1.4;
				if (head) head.rotation.y = -i.aim;
			},
		};
	}

	// ---------- units: everything hovers ----------
	// A lens-shaped body lying along X (unit length, radius ~0.5): eight smooth sides, pointed at both ends.
	const LENS = loftGeo("wlens", [
		[-0.5, 0.05],
		[-0.32, 0.36],
		[0.05, 0.5],
		[0.34, 0.36],
		[0.5, 0.04],
	].map(([x, k]) => Array.from({ length: 8 }, (_, i) => {
		const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
		return [n2(x), n2(Math.sin(a) * k * 0.62), n2(Math.cos(a) * k)];
	})));
	// o: long, plates (hovering side plates), prongs, beam (a prism on a mount), arc (horns and a ball of
	// light), ring (a halo round the body), fins, orbit (four orbiting plates — the Construct).
	function drone(k, r, o = {}) {
		const root = new THREE.Group(),
			s = r / 12,
			L = (26 + (o.long || 0) * 1.6) * s,
			hover = 9 * s,
			body = group(root, [0, hover, 0]),
			floats = [];
		// A faint ring of light on the ground under it (what it hovers on).
		ring(root, k.glass, r * 0.42, 0.25, [0, 0.6, 0], 18);
		const b = mesh(body, LENS, k.plate, [0, 0, 0]);
		b.scale.set(L, 14 * s, 15 * s);
		box(body, k.glass, [L * 0.72, 0.6 * s, 1.2 * s], [0, 4.4 * s, 0], null, 0.2 * s); // the seam along the back
		box(body, k.glass, [L * 0.6, 1 * s, 0.6 * s], [0, 0, 7.4 * s], null, 0.2 * s);
		box(body, k.glass, [L * 0.6, 1 * s, 0.6 * s], [0, 0, -7.4 * s], null, 0.2 * s);
		box(body, k.team, [2.4 * s, 4 * s, 9 * s], [-L * 0.32, 0.4 * s, 0], null, 0.4 * s);
		ball(body, k.glass, 1.8 * s, [L * 0.42, 0.6 * s, 0]); // the lens
		if (o.fins) for (const z of [-1, 1]) box(body, k.metal, [8 * s, 0.8 * s, 5 * s], [-L * 0.36, 0, z * 8 * s], [0, z * 0.5, 0], 0.3 * s);
		if (o.plates)
			for (const z of [-1, 1]) {
				const p = group(body, [-1 * s, 1 * s, z * 11 * s]);
				box(p, k.plate, [L * 0.5, 7 * s, 1.6 * s], [0, 0, 0], [z * 0.25, 0, 0], 0.6 * s);
				box(p, k.glass, [L * 0.36, 0.6 * s, 0.4 * s], [0, 0, z * 0.9 * s], null, 0.1 * s);
				floats.push([p, z]);
			}
		const mount = group(body, [L * 0.12, 5 * s, 0]),
			weapon = group(mount);
		if (o.prongs) for (const z of [-2.4, 2.4]) limb(body, k.dark, [L * 0.2, -0.5 * s, z * s], [L * 0.58, -0.5 * s, z * s * 0.6], 0.9 * s, 0.25 * s);
		if (o.beam) {
			mesh(mount, cylGeo(n2(3 * s), n2(3.6 * s), n2(2 * s), 6), k.dark, [0, 0, 0]);
			diamond(weapon, k.glass, [6 * s, 2.6 * s, 0], 2.6 * s, 7 * s, [0, 0, -Math.PI / 2]);
			limb(weapon, k.plate, [0, 2.6 * s, 0], [4 * s, 2.6 * s, 0], 1.2 * s, 1 * s);
		}
		if (o.arc) {
			for (const z of [-1, 1]) {
				limb(weapon, k.metal, [0, 1 * s, z * 1.5 * s], [5 * s, 4 * s, z * 4.5 * s], 1 * s, 0.7 * s);
				limb(weapon, k.metal, [5 * s, 4 * s, z * 4.5 * s], [10 * s, 3 * s, z * 1.6 * s], 0.7 * s, 0.3 * s);
			}
			ball(weapon, k.glass, 2.2 * s, [9 * s, 3 * s, 0]);
		}
		let halo = null;
		if (o.ring) {
			halo = group(body, [0, 0, 0]);
			ring(halo, k.glass, 13 * s + (o.long || 0) * 0.6 * s, 0.45 * s, [0, 0, 0], 24);
		}
		let orbit = null;
		if (o.orbit) {
			orbit = group(body, [0, 6 * s, 0]);
			for (let i = 0; i < 4; i++) {
				const a = (i / 4) * Math.PI * 2 + 0.4;
				box(orbit, i % 2 ? k.plate : k.metal, [7 * s, 9 * s, 3 * s], [Math.cos(a) * 17 * s, 0, Math.sin(a) * 17 * s], [0, -a, 0.15], 0.6 * s);
			}
			ball(body, k.glass, 3.6 * s, [0, 8 * s, 0]);
		}
		return {
			root,
			update(e, i) {
				const id = e.id || 0;
				body.position.y = hover + Math.sin(i.time * 2.2 + id) * 0.9 * s;
				body.rotation.z = i.moving ? -0.06 : 0;
				for (const [p, z] of floats) p.position.y = 1 * s + Math.sin(i.time * 2.6 + id + z) * 0.8 * s;
				mount.rotation.y = -i.aim;
				weapon.position.x = -i.recoil * 2 * s;
				if (halo) halo.rotation.x = Math.sin(i.time * 1.3 + id) * 0.3;
				if (orbit) orbit.rotation.y = i.time * 0.8;
			},
		};
	}
	// The Weaver: a small drone in a turning ring, a beam of light from its front while it builds.
	function weaver(k, r) {
		const m = drone(k, r, { ring: true }),
			hand = group(m.root, [r * 0.5, 9 * (r / 12), 0]);
		limb(hand, k.glass, [0, 0, 0], [r * 1.4, -6, 0], 0.5, 0.2);
		const own = m.update;
		m.update = (e, i) => {
			own(e, i);
			hand.visible = !!i.working;
		};
		return m;
	}
	// Flyers: blade wings swept back round a white body, a ring of light, banking as they fly.
	function flyer(k, r) {
		const root = new THREE.Group(),
			frame = group(root),
			s = r / 17;
		const b = mesh(frame, LENS, k.plate, [0, 0, 0]);
		b.scale.set(28 * s, 7 * s, 9 * s);
		box(frame, k.team, [3 * s, 3 * s, 6 * s], [-7 * s, 0, 0], null, 0.4 * s);
		ball(frame, k.glass, 1.6 * s, [12 * s, 0.6 * s, 0]);
		for (const z of [-1, 1]) {
			box(frame, k.plate, [16 * s, 0.9 * s, 14 * s], [-3 * s, 0, z * 9 * s], [0, z * 0.55, 0], 0.3 * s);
			box(frame, k.glass, [12 * s, 0.4 * s, 0.6 * s], [-3 * s, 0.6 * s, z * 9 * s], [0, z * 0.55, 0], 0.1 * s);
		}
		ring(frame, k.glass, 13 * s, 0.5 * s, [-1 * s, 0, 0], 24);
		return { root, update: (e, i) => (frame.rotation.x = Math.sin(i.time * 1.4 + (e.id || 0)) * 0.3) };
	}

	return { building, drone, weaver, flyer, diamond, pillar };
}
