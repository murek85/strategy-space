/* Detailed nature of the 3D renderer: wildlife (deer, foxes, hares, lizards), birds, fish, the threats
   (predator, frost tusk, ash crawler, dune maw), and the shapes of rocks, spires, giant mushrooms and
   crystals used by obstacles and deposits (models-3d.js). Built with the shape kit of
   models-detail-3d.js; same contract: { root, update(e, info) }, +X the front, +Y up, +Z the right side.
   - Animals: a smooth torso lofted through rings, a neck, a head with a snout, ears and eyes, two-part
     legs with hooves or paws (walking), a tail (wagging); antlers, a bushy tail, long ears, a mammoth's
     trunk and tusks.
   - Rocks: a few irregular stones (an icosphere with its corners pushed in and out, the bottom flattened),
     shared by every boulder, so they still draw in a few instanced batches.
   Static parts are merged by the baker of models-detail-3d.js (models-3d.js bakes animals, birds, fish,
   deposits and the tall obstacles). */
export function createNature3D(THREE, { tools, group, materials }) {
	const { cached, mesh, box, cyl, ball, pipe, loftGeo, cylGeo, latheGeo, profileGeo, sphereGeo } = tools,
		{ nature, scenery, std } = materials,
		UP = new THREE.Vector3(0, 1, 0),
		n2 = (v) => Math.round(v * 100) / 100;
	const dark = std("#1d1a17", { roughness: 0.8, metalness: 0 }),
		hoof = std("#2e2620", { roughness: 0.7, metalness: 0 }),
		antler = std("#cbb894", { roughness: 0.8, metalness: 0 }),
		pink = std("#c9908a", { roughness: 0.9, metalness: 0 }),
		white = std("#f1ede4", { roughness: 0.95, metalness: 0 });

	// ---------- helpers ----------
	// A tapering rod from a (radius r0) to b (radius r1).
	function limb(parent, m, a, b, r0, r1, segs = 7) {
		const A = new THREE.Vector3(...a),
			B = new THREE.Vector3(...b),
			o = mesh(parent, cylGeo(n2(r1), n2(r0), n2(A.distanceTo(B)), segs), m);
		o.position.copy(A).add(B).multiplyScalar(0.5);
		o.quaternion.setFromUnitVectors(UP, B.sub(A).normalize());
		return o;
	}
	// An elliptic ring around the X axis: at x, half width w (Z), half height h (Y), raised by y.
	const ring = (x, w, h, y = 0, n = 10) => Array.from({ length: n }, (_, i) => [n2(x), n2(y + Math.sin((i / n) * Math.PI * 2) * h), n2(Math.cos((i / n) * Math.PI * 2) * w)]);
	const loft = (key, stations, n) => loftGeo(key, stations.map(([x, w, h, y]) => ring(x, w, h, y, n)));
	// A flat plate lying in the XZ plane (wings, fins seen from above), from its outline (x, z points).
	const plate = (parent, m, pts, thick, pos, rot) => mesh(parent, profileGeo(pts.map(([x, z]) => [n2(x), n2(-z)]), thick, Math.min(0.15, thick * 0.3)), m, pos, [-Math.PI / 2 + (rot?.[0] || 0), rot?.[1] || 0, rot?.[2] || 0]);
	// A fin standing in the XY plane, from its outline (x, y points).
	const fin = (parent, m, pts, thick, pos, rot) => mesh(parent, profileGeo(pts.map(([x, y]) => [n2(x), n2(y)]), thick, Math.min(0.12, thick * 0.3)), m, pos, rot);

	// ---------- rocks ----------
	// An irregular stone (unit size): corners pushed in and out from a seed, the bottom flattened.
	function rockGeo(variant, rough = 0.38, flat = 0.78) {
		return cached(`rock${variant},${rough},${flat}`, () => {
			let s = 97 + variant * 7919;
			const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
			const g = new THREE.IcosahedronGeometry(1, variant % 3 === 2 ? 0 : 1),
				p = g.attributes.position,
				moved = new Map(),
				// A few large dents and bulges, so the stone has faces, not just noise.
				lobes = Array.from({ length: 4 }, () => [new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), (rnd() - 0.4) * 0.5]),
				v = new THREE.Vector3();
			for (let i = 0; i < p.count; i++) {
				v.set(p.getX(i), p.getY(i), p.getZ(i));
				const key = [v.x, v.y, v.z].map((c) => Math.round(c * 1000)).join(",");
				if (!moved.has(key)) {
					let k = 1 + (rnd() - 0.5) * rough;
					for (const [d, a] of lobes) k += Math.max(0, v.dot(d)) ** 3 * a;
					moved.set(key, k);
				}
				const k = moved.get(key);
				p.setXYZ(i, v.x * k * (1 + variant * 0.06), Math.max(-0.35, v.y * k * flat), v.z * k);
			}
			g.computeVertexNormals();
			return g;
		});
	}
	const ROCKS = 6;
	// A boulder part: a stone of one of the shared shapes, sitting on the ground (y is the base).
	function stone(parent, m, [x, y, z], [sx, sy, sz], i = 0) {
		const o = mesh(parent, rockGeo(i % ROCKS), m, [x, y + sy * 0.3, z], [((i * 1.3) % 0.6) - 0.3, i * 2.3, ((i * 0.7) % 0.4) - 0.2]);
		o.scale.set(sx, sy, sz);
		return o;
	}
	// A tall rock spire (unit radius at the base, unit height), ringed and slightly twisted.
	function spireGeo(variant) {
		let s = 31 + variant * 104729;
		const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
		const rings = [];
		for (let k = 0; k <= 8; k++) {
			const t = k / 8,
				r = (1 - t * 0.82) * (0.85 + rnd() * 0.3),
				twist = t * 0.9 + variant;
			rings.push(Array.from({ length: 7 }, (_, i) => {
				const a = (i / 7) * Math.PI * 2 + twist,
					j = r * (0.85 + rnd() * 0.3);
				return [n2(Math.cos(a) * j), n2(t - 0.5), n2(Math.sin(a) * j)];
			}));
		}
		return loftGeo("spire" + variant, rings);
	}
	// A crystal (unit radius and height): a six-sided prism slightly widening, with a pointed tip.
	const crystalGeo = () =>
		loftGeo("crystal", [0, 0.72, 0.84, 1].map((y, k) => Array.from({ length: 6 }, (_, i) => {
			const a = (i / 6) * Math.PI * 2,
				r = [0.48, 0.55, 0.42, 0.04][k];
			return [n2(Math.cos(a) * r), y, n2(Math.sin(a) * r)];
		})));
	// A cluster of crystals at (x, z): a big one and smaller ones around its foot, leaning out.
	function crystals(parent, m, [x, z], h, w, lean, seed) {
		const g = group(parent, [x, 0, z]);
		g.rotation.z = -lean * 0.06;
		const one = (dx, dz, hh, ww, rx, rz) => {
			const o = mesh(g, crystalGeo(), m, [dx, -hh * 0.05, dz], [rx, seed, rz]);
			o.scale.set(ww, hh, ww);
		};
		one(0, 0, h, w, 0, 0);
		for (let i = 0; i < 3; i++) {
			const a = seed * 2 + i * 2.1;
			one(Math.cos(a) * w * 0.8, Math.sin(a) * w * 0.8, h * (0.35 + i * 0.1), w * 0.5, Math.sin(a) * 0.5, -Math.cos(a) * 0.5);
		}
		return g;
	}
	// A giant mushroom: a bent stem, a cap with a lip, gills underneath, light spots on the cap.
	function mushroom(parent, { stem, cap, gills, spot }, [x, z], H, R, seed) {
		const g = group(parent, [x, 0, z]),
			bend = [Math.sin(seed) * R * 0.25, Math.cos(seed * 1.7) * R * 0.2],
			top = [bend[0], H, bend[1]],
			mid = [bend[0] * 0.3, H * 0.5, bend[1] * 0.3];
		limb(g, stem, [0, -8, 0], mid, R * 0.22, R * 0.17, 9);
		limb(g, stem, mid, top, R * 0.17, R * 0.15, 9);
		cyl(g, stem, R * 0.28, 4, [0, -6, 0], { top: R * 0.2, segs: 9 }); // root flare
		const c = group(g, top);
		c.rotation.set(bend[1] * 0.012, 0, -bend[0] * 0.012);
		mesh(c, latheGeo([[0, R * 0.62], [R * 0.4, R * 0.55], [R * 0.75, R * 0.38], [R * 0.98, R * 0.14], [R, 0], [R * 0.9, -R * 0.06], [R * 0.5, -R * 0.02], [0, -R * 0.05]].map(([r, y]) => [n2(r), n2(y)]), 16), cap);
		cyl(c, gills, R * 0.88, 1.2, [0, -R * 0.05, 0], { segs: 16 });
		for (let i = 0; i < 6; i++) {
			const a = i * 1.1 + seed,
				d = R * (0.3 + (i % 3) * 0.18);
			ball(c, spot, R * 0.08, [Math.cos(a) * d, R * (0.6 - (d / R) * 0.45), Math.sin(a) * d], [1, 0.4, 1]);
		}
		return g;
	}

	// ---------- four-legged animals ----------
	// o: length, width, depth (torso), legs (length), neck [forward, up], head (length), tail (length),
	// ears ("pointy", "long", "round", "none"), coat, belly, foot (hoof material), extra(parts, s).
	function quadruped(key, s, o) {
		const L = o.length * s,
			W = o.width * s,
			H = o.depth * s,
			legH = o.legs * s,
			root = new THREE.Group(),
			body = group(root, [0, legH + H * 0.3, 0]);
		mesh(body, loft("q" + key, (o.torso || [[-0.5, 0.5, 0.6, 0.05], [-0.34, 0.92, 0.95, 0], [0.02, 0.86, 0.9, -0.04], [0.3, 0.96, 1.04, 0.08], [0.48, 0.62, 0.75, 0.28]]).map(([x, w, h, y]) => [x * L, w * W, h * H, y * H]), 10), o.coat);
		ball(body, o.belly, 1, [0, -H * 0.42, 0], [L * 0.34, H * 0.42, W * 0.68]);
		// Neck and head.
		const [nf, nu] = o.neck,
			neckBase = [L * 0.4, H * 0.35, 0],
			neckTop = [L * 0.4 + nf * s, H * 0.35 + nu * s, 0];
		limb(body, o.coat, neckBase, neckTop, W * 0.55, W * 0.38, 8);
		const head = group(body, neckTop),
			hl = o.head * s;
		mesh(head, loft("h" + key, [[-0.15, 0.42, 0.48, 0], [0.25, 0.4, 0.44, 0.05], [0.65, 0.24, 0.27, -0.12], [1, 0.14, 0.16, -0.2]].map(([x, w, h, y]) => [x * hl, w * hl, h * hl, y * hl]), 8), o.coat);
		ball(head, dark, hl * 0.09, [hl * 0.98, -hl * 0.19, 0], [1, 0.8, 1.2]); // nose
		for (const z of [-1, 1]) ball(head, nature.eye === o.eye ? nature.eye : dark, hl * 0.07, [hl * 0.38, hl * 0.12, z * hl * 0.3]);
		if (o.ears === "pointy" || o.ears === "long" || o.ears === "round")
			for (const z of [-1, 1]) {
				const ear = group(head, [hl * 0.05, hl * 0.35, z * hl * 0.22]);
				ear.rotation.set(z * (o.ears === "long" ? 0.15 : 0.4), 0, o.ears === "long" ? 0.5 : 0.12);
				if (o.ears === "round") ball(ear, o.coat, hl * 0.14, [0, hl * 0.08, 0], [0.6, 1, 0.9]);
				else {
					const eh = hl * (o.ears === "long" ? 1.1 : 0.42);
					limb(ear, o.coat, [0, 0, 0], [0, eh, 0], hl * (o.ears === "long" ? 0.12 : 0.12), hl * 0.03, 5);
					limb(ear, pink, [0.04 * hl, eh * 0.1, 0], [0.04 * hl, eh * 0.8, 0], hl * 0.07, hl * 0.02, 4);
				}
			}
		// Legs: a pivot at the hip or shoulder, thigh and shin (joined by a knee), a hoof or paw.
		const legs = [];
		for (const [x, back] of [[L * 0.3, false], [-L * 0.32, true]])
			for (const side of [-1, 1]) {
				const pivot = group(body, [x, -H * 0.3, side * W * 0.55]),
					knee = [back ? -0.9 * s : 0.5 * s, -legH * 0.5, 0],
					thick = W * (o.thick ?? 0.32) * (back ? 1.15 : 1);
				limb(pivot, o.coat, [0, H * 0.25, 0], knee, thick * 1.3, thick * 0.8, 7);
				ball(pivot, o.coat, thick * 0.8, knee);
				limb(pivot, o.leg ?? o.coat, knee, [0.2 * s, -legH * 0.93, 0], thick * 0.75, thick * 0.55, 6);
				box(pivot, o.foot ?? hoof, [thick * 1.9, thick * 0.9, thick * 1.5], [0.35 * s, -legH + thick * 0.4, 0], null, thick * 0.3);
				legs.push(pivot);
			}
		// Tail.
		const tail = group(body, [-L * 0.48, H * 0.3, 0]),
			tl = (o.tail ?? 6) * s;
		if (o.bushy) mesh(tail, loft("t" + key, [[0, 0.12, 0.12, 0], [-0.35, 0.3, 0.3, -0.1], [-0.75, 0.24, 0.24, -0.25], [-1, 0.05, 0.05, -0.35]].map(([x, w, h, y]) => [x * tl, w * tl, h * tl, y * tl]), 8), o.coat);
		else if (tl > 0) limb(tail, o.coat, [0, 0, 0], [-tl * 0.85, -tl * 0.5, 0], W * 0.16, W * 0.04, 5);
		if (o.tip) ball(tail, o.tip, tl * 0.16, [-tl * 0.92, -tl * 0.38, 0]);
		o.extra?.({ head, body, tail, hl, L, W, H }, s);
		const speed = o.gait ?? 13;
		return {
			root,
			update(e, i) {
				const t = i.time * speed + e.id,
					swing = i.moving ? Math.sin(t) * 0.55 : 0;
				legs.forEach((l, n) => (l.rotation.z = n === 0 || n === 3 ? swing : -swing));
				body.position.y = legH + H * 0.3 + (i.moving ? Math.abs(Math.sin(t)) * s * 0.8 : 0);
				head.rotation.y = -Math.max(-0.6, Math.min(0.6, i.aim));
				head.rotation.z = i.recoil * 0.4 + (i.moving ? Math.sin(t * 2) * 0.04 : Math.sin(i.time * 0.7 + e.id) * 0.08);
				tail.rotation.y = Math.sin(i.time * (i.moving ? 9 : 2.5) + e.id) * 0.3;
			},
		};
	}
	// Branching antlers on a deer's head.
	function antlers({ head, hl }, s) {
		for (const z of [-1, 1]) {
			const a = group(head, [hl * 0.05, hl * 0.4, z * hl * 0.15]);
			a.rotation.x = z * 0.35;
			const tip = [-hl * 0.15, hl * 0.95, 0];
			limb(a, antler, [0, 0, 0], tip, hl * 0.06, hl * 0.035, 5);
			limb(a, antler, [-hl * 0.05, hl * 0.35, 0], [hl * 0.35, hl * 0.6, 0], hl * 0.04, hl * 0.02, 4);
			limb(a, antler, [-hl * 0.1, hl * 0.65, 0], [hl * 0.2, hl * 1.0, 0], hl * 0.035, hl * 0.015, 4);
			limb(a, antler, tip, [-hl * 0.45, hl * 1.15, 0], hl * 0.03, hl * 0.012, 4);
		}
	}
	const ANIMALS = {
		deer: (biome) => quadruped("deer", 1.25, { length: 20, width: 3.4, depth: 4.4, legs: 9, neck: [2.8, 6.5], head: 6, tail: 2.5, ears: "pointy", coat: scenery.deer, belly: nature.belly, gait: 11, extra: antlers, tip: white }),
		fox: (biome) => {
			const coat = biome === "ice" ? scenery.snowfox : scenery.fox;
			return quadruped("fox" + (biome === "ice" ? "i" : ""), 0.7, { length: 20, width: 3.2, depth: 3.8, legs: 6, neck: [2.6, 3.2], head: 6.5, tail: 11, bushy: true, tip: white, ears: "pointy", coat, belly: white, leg: dark, foot: dark, gait: 14 });
		},
		hare: () =>
			quadruped("hare", 0.5, {
				length: 16,
				width: 4.2,
				depth: 5,
				legs: 5,
				neck: [2.4, 2.4],
				head: 6,
				tail: 1.5,
				tip: white,
				ears: "long",
				coat: scenery.hare,
				belly: white,
				thick: 0.38,
				gait: 16,
				torso: [[-0.5, 0.55, 0.65, 0.1], [-0.3, 0.95, 1, 0.05], [0.05, 0.85, 0.9, 0], [0.3, 0.75, 0.82, 0.1], [0.46, 0.5, 0.6, 0.3]],
			}),
	};

	// Lizard: low and long, the tail curving, legs sprawled to the sides.
	function lizard() {
		const root = new THREE.Group(),
			body = group(root, [0, 3, 0]),
			legs = [];
		const c = scenery.lizard;
		mesh(body, loft("liz", [[11, 0.3, 0.3, -0.2], [9, 1.5, 1.2, 0], [6, 1.3, 1.1, 0], [3, 2.2, 1.5, 0.1], [-3, 2.4, 1.6, 0.1], [-6, 1.5, 1.1, 0], [-11, 0.8, 0.6, -0.4], [-17, 0.35, 0.3, -0.8], [-22, 0.05, 0.05, -1]], 8), c);
		for (const z of [-1, 1]) ball(body, nature.eye, 0.35, [8.2, 0.9, z * 1.1]);
		for (let n = 0; n < 6; n++) box(body, dark, [1.2, 0.5, 0.6], [3 - n * 2, 1.6, 0], [0, 0, 0.3], 0.15); // spine ridge
		for (const x of [3.5, -3.5])
			for (const z of [-1, 1]) {
				const leg = group(body, [x, 0, z * 1.8]);
				limb(leg, c, [0, 0, 0], [x > 0 ? 1 : -1, -0.6, z * 3], 0.6, 0.45, 5);
				limb(leg, c, [x > 0 ? 1 : -1, -0.6, z * 3], [x > 0 ? 2 : -0.5, -2.8, z * 3.6], 0.45, 0.3, 5);
				for (const f of [-1, 0, 1]) limb(leg, dark, [x > 0 ? 2 : -0.5, -2.8, z * 3.6], [(x > 0 ? 2.9 : 0.4) + f * 0.2, -2.9, z * 3.6 + f * 0.6], 0.16, 0.06, 3);
				legs.push(leg);
			}
		return {
			root,
			update(e, i) {
				legs.forEach((l, n) => (l.rotation.y = Math.sin(i.time * 10 + e.id + n * 1.6) * 0.5));
				body.rotation.y = Math.sin(i.time * 10 + e.id) * 0.08;
			},
		};
	}
	// Bird: body, head and beak, two-part wings flapping (the outer part more), a fanned tail.
	function bird() {
		const root = new THREE.Group(),
			m = scenery.bird,
			wings = [];
		mesh(root, loft("bird", [[5.5, 0.3, 0.3, 0.6], [4, 1.3, 1.3, 0.4], [1, 1.9, 1.8, 0], [-2.5, 1.4, 1.2, -0.1], [-5, 0.5, 0.4, 0]], 8), m);
		ball(root, m, 1.3, [5.2, 1, 0]);
		limb(root, std("#d9a640", { roughness: 0.6 }), [6.2, 0.9, 0], [8.2, 0.6, 0], 0.4, 0.05, 5); // beak
		for (const z of [-1, 1]) ball(root, nature.eye, 0.25, [5.8, 1.4, z * 0.8]);
		plate(root, m, [[-4.5, 0], [-9, -2.2], [-9.6, 0], [-9, 2.2]], 0.3, [0, 0.2, 0]); // tail
		for (const z of [-1, 1]) {
			const wing = group(root, [0.5, 0.6, z * 1.4]),
				outer = group(wing, [0, 0, z * 5.5]);
			plate(wing, m, [[2.2, 0], [-2, 0], [-2.6, z * 5.8], [1.6, z * 5.8]], 0.35, [0, 0, 0]);
			plate(outer, m, [[1.6, 0], [-2.6, 0], [-4.4, z * 6.5], [-1, z * 7.2]], 0.3, [0, 0, 0]);
			wings.push([wing, outer, z]);
		}
		return {
			root,
			update(e, i) {
				const f = Math.sin(i.time * 7 + e.id);
				wings.forEach(([w, o, z]) => {
					w.rotation.x = z * f * 0.55;
					o.rotation.x = z * (f * 0.45 + Math.sin(i.time * 7 + e.id - 0.6) * 0.25);
				});
			},
		};
	}
	// Fish: a lofted body, eyes, a dorsal fin, a tail fin swinging.
	function fish() {
		const root = new THREE.Group(),
			m = scenery.fish,
			tail = group(root, [-4.4, 0, 0]);
		mesh(root, loft("fish", [[4.8, 0.2, 0.3, 0], [3.4, 0.9, 1.4, 0.05], [0, 1.2, 1.8, 0.1], [-3, 0.7, 1, 0], [-4.5, 0.2, 0.3, 0]], 8), m);
		for (const z of [-1, 1]) ball(root, dark, 0.28, [3.6, 0.4, z * 0.7]);
		fin(root, m, [[1.5, 0], [-1.8, 0], [-1.2, 1.4], [0.8, 1.2]], 0.15, [0, 1.6, 0]);
		fin(tail, m, [[0.2, 0], [-2.8, 1.8], [-2.2, 0], [-2.8, -1.8]], 0.15, [0, 0, 0]);
		return { root, update: (e, i) => (tail.rotation.y = Math.sin(i.time * 9 + e.id) * 0.5) };
	}

	// ---------- threats ----------
	// Predator: a lean dark beast, spikes along the spine, a horn, glowing eyes, claws.
	const beast = (k, r) =>
		quadruped("beast", r / 9, {
			length: 24,
			width: 4.4,
			depth: 5.4,
			legs: 7.5,
			neck: [3, 2.5],
			head: 7.5,
			tail: 9,
			ears: "pointy",
			coat: nature.hide,
			belly: nature.belly,
			foot: nature.bone,
			eye: nature.eye,
			thick: 0.36,
			gait: 13,
			extra({ head, body, hl, L, H }, s) {
				for (let n = 0; n < 6; n++) limb(body, nature.bone, [L * (0.3 - n * 0.12), H * 0.9, 0], [L * (0.26 - n * 0.12), H * 0.9 + (3.2 - n * 0.3) * s, 0], s * 0.7, s * 0.05, 5);
				limb(head, nature.bone, [hl * 0.3, hl * 0.42, 0], [hl * 0.15, hl * 1, 0], hl * 0.1, hl * 0.02, 5); // horn
				mesh(head, loftGeo("jaw" + n2(hl), [ring(0, hl * 0.3, hl * 0.12, -hl * 0.32, 6), ring(hl * 0.85, hl * 0.12, hl * 0.06, -hl * 0.3, 6)]), nature.maw); // jaw
				for (const z of [-1, 1]) limb(head, nature.bone, [hl * 0.8, -hl * 0.25, z * hl * 0.1], [hl * 0.85, -hl * 0.45, z * hl * 0.1], hl * 0.04, hl * 0.01, 4); // fangs
			},
		});
	// Frost tusk: a shaggy mammoth with a hump, a hanging trunk and curved tusks.
	const frostTusk = (k, r) =>
		quadruped("tusk", r / 11, {
			length: 24,
			width: 6.5,
			depth: 7.5,
			legs: 8.5,
			neck: [2, 1],
			head: 7,
			tail: 4,
			ears: "round",
			coat: nature.fur,
			belly: nature.fur,
			foot: dark,
			thick: 0.42,
			gait: 8,
			torso: [[-0.5, 0.6, 0.65, 0], [-0.3, 0.95, 1, 0.05], [0.0, 0.92, 1.05, 0.12], [0.28, 0.95, 1.12, 0.25], [0.46, 0.7, 0.9, 0.35]],
			extra({ head, body, hl, L, H }, s) {
				ball(body, nature.fur, 1, [L * 0.15, H * 0.95, 0], [L * 0.22, H * 0.4, H * 0.55]); // hump
				// Shaggy fringe hanging under the body.
				for (let n = 0; n < 7; n++) limb(body, nature.fur, [L * (0.35 - n * 0.11), -H * 0.55, (n % 2 ? 1 : -1) * H * 0.4], [L * (0.35 - n * 0.11), -H * 1.05, (n % 2 ? 1 : -1) * H * 0.48], s * 1.6, s * 0.5, 5);
				const trunk = [[hl * 0.95, -hl * 0.2], [hl * 1.15, -hl * 0.65], [hl * 1.1, -hl * 1.1], [hl * 1.25, -hl * 1.45]];
				for (let n = 1; n < trunk.length; n++) limb(head, nature.fur, [trunk[n - 1][0], trunk[n - 1][1], 0], [trunk[n][0], trunk[n][1], 0], hl * (0.18 - n * 0.035), hl * (0.15 - n * 0.035), 7);
				for (const z of [-1, 1]) {
					const t = [[hl * 0.8, -hl * 0.25], [hl * 1.2, -hl * 0.7], [hl * 1.65, -hl * 0.6], [hl * 1.85, -hl * 0.2]];
					for (let n = 1; n < t.length; n++) limb(head, nature.bone, [t[n - 1][0], t[n - 1][1], z * hl * (0.28 + n * 0.06)], [t[n][0], t[n][1], z * hl * (0.28 + (n + 1) * 0.06)], hl * (0.1 - n * 0.022), hl * (0.08 - n * 0.022), 6);
				}
			},
		});
	// Ash crawler: a basalt spider — thorax, a big abdomen with glowing seams, mandibles, eight
	// two-part legs.
	function ashCrawler(k, r) {
		const root = new THREE.Group(),
			s = r / 19,
			body = group(root, [0, 12 * s, 0]),
			legs = [];
		mesh(body, loft("crawler", [[12, 0.3, 0.3, 0], [9, 4.5, 3.6, 0.5], [3, 6, 4.8, 1], [-1, 4, 3.5, 0.5], [-5, 8, 6.5, 2.5], [-14, 9.5, 8, 3], [-22, 5, 5, 2], [-25, 0.5, 0.5, 1.5]].map(([x, w, h, y]) => [x * s, w * s, h * s, y * s]), 10), nature.basalt);
		for (let n = 0; n < 4; n++) box(body, nature.ember, [1.2 * s, 0.8 * s, 14 * s - n * 2 * s], [(-8 - n * 3.6) * s, (9.6 - Math.abs(n - 1.5) * 0.6) * s, 0], [0, 0, 0.1], 0.3 * s); // glowing seams
		for (const z of [-1, 1]) {
			ball(body, nature.ember, 1.1 * s, [10 * s, 2.2 * s, z * 2 * s]);
			ball(body, nature.ember, 0.7 * s, [10.6 * s, 3.2 * s, z * 1 * s]);
			limb(body, nature.basalt, [11 * s, -0.5 * s, z * 2 * s], [15 * s, -2.5 * s, z * 0.6 * s], 1 * s, 0.3 * s, 5); // mandibles
		}
		for (let n = 0; n < 4; n++)
			for (const side of [-1, 1]) {
				const leg = group(body, [(6 - n * 3.5) * s, 0, side * 4 * s]),
					spread = side * (0.5 - n * 0.32),
					kx = Math.cos(spread) * 2,
					kz = side * 10;
				leg.rotation.y = spread;
				limb(leg, nature.basalt, [0, 0, 0], [kx * s, 7 * s, kz * s], 1.4 * s, 1 * s, 6);
				ball(leg, nature.basalt, 1.1 * s, [kx * s, 7 * s, kz * s]);
				limb(leg, nature.basalt, [kx * s, 7 * s, kz * s], [kx * 1.5 * s, -12 * s, side * 16 * s], 1 * s, 0.35 * s, 6);
				legs.push(leg);
			}
		return {
			root,
			update(e, i) {
				legs.forEach((l, n) => (l.rotation.z = i.moving ? Math.sin(i.time * 16 + n * 1.3 + e.id) * 0.28 : 0));
				body.position.y = 12 * s + (i.moving ? Math.sin(i.time * 32 + e.id) * 0.4 * s : 0);
			},
		};
	}
	// Dune maw: a crater of sand lumps with a ring of curved teeth; the ribbed throat rises when it strikes.
	function duneMaw(k, r) {
		const root = new THREE.Group();
		for (let n = 0; n < 16; n++) {
			const a = (n / 16) * Math.PI * 2;
			stone(root, nature.sand, [Math.cos(a) * r * 0.9, -2, Math.sin(a) * r * 0.9], [r * 0.32, 9 + (n % 3) * 3, r * 0.26], n);
		}
		cyl(root, nature.maw, r * 0.72, 1, [0, 0.5, 0], { segs: 18 });
		const throat = group(root, [0, -20, 0]);
		for (let n = 0; n < 4; n++) {
			cyl(throat, n % 2 ? nature.sand : nature.hide, r * (0.5 - n * 0.06), 10, [0, n * 9.5, 0], { top: r * (0.47 - n * 0.06), segs: 14 });
			mesh(throat, tools.torusGeo(n2(r * (0.5 - n * 0.06)), 1.2, 16), nature.hide, [0, n * 9.5 + 5, 0]); // ribs
		}
		for (let n = 0; n < 14; n++) {
			const a = (n / 14) * Math.PI * 2,
				x = Math.cos(a) * r * 0.34,
				z = Math.sin(a) * r * 0.34;
			limb(throat, nature.bone, [x, 34, z], [x * 0.75, 44, z * 0.75], 2.2, 0.8, 5);
			limb(throat, nature.bone, [x * 0.75, 44, z * 0.75], [x * 0.45, 48, z * 0.45], 0.8, 0.1, 4);
		}
		cyl(throat, nature.maw, r * 0.3, 1, [0, 38, 0], { segs: 14 });
		return {
			root,
			update(e, i) {
				const up = e.target != null || i.recoil > 0 ? 1 : 0;
				throat.position.y += ((up ? 0 : -34) - throat.position.y) * 0.1;
			},
		};
	}

	return {
		animal: (kind, biome) => (kind === "lizard" ? lizard() : (ANIMALS[kind] || ANIMALS.deer)(biome)),
		bird,
		fish,
		beast,
		frostTusk,
		ashCrawler,
		duneMaw,
		stone,
		rockGeo,
		spireGeo,
		crystals,
		mushroom,
		limb,
		ROCKS,
	};
}
