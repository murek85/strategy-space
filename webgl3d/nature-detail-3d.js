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
	// ears ("pointy", "long", "round", "none"), coat, belly, foot (hoof material), extra(parts, s);
	// optional: torso (stations), thick (legs), leg (lower legs), paws (paws, not hooves), bib (chest and
	// throat), muzzle, rump (patch), earTip, hop (hops: the hare), longFeet (hare's hind legs: thighs flat on
	// the flanks, long feet on the ground), haunch (their thighs, × size), shoulder (front shoulders, × size).
	function quadruped(key, s, o) {
		const L = o.length * s,
			W = o.width * s,
			H = o.depth * s,
			legH = o.legs * s,
			lift = legH + H * 0.3,
			root = new THREE.Group(),
			body = group(root, [0, lift, 0]);
		// Torso: rump, haunches, a waist, the chest, the withers rising into the neck.
		const torso = o.torso || [[-0.53, 0.32, 0.38, 0.18], [-0.45, 0.78, 0.82, 0.1], [-0.3, 0.97, 1, 0.04], [-0.1, 0.84, 0.88, -0.02], [0.12, 0.9, 0.97, 0], [0.3, 0.97, 1.06, 0.08], [0.45, 0.74, 0.86, 0.26], [0.53, 0.42, 0.52, 0.42]];
		mesh(body, loft("q" + key, torso.map(([x, w, h, y]) => [x * L, w * W, h * H, y * H]), 12), o.coat);
		ball(body, o.belly, 1, [L * 0.04, -H * 0.5, 0], [L * 0.3, H * 0.34, W * 0.66]);
		if (o.bib) ball(body, o.bib, 1, [L * 0.42, -H * 0.08, 0], [L * 0.1, H * 0.5, W * 0.56]);
		if (o.rump) ball(body, o.rump, 1, [-L * 0.47, H * 0.12, 0], [L * 0.07, H * 0.42, W * 0.6]);
		// Neck: thick at the shoulders, thinner to the head, a little bent.
		const [nf, nu] = o.neck,
			neckBase = [L * 0.42, H * 0.3, 0],
			neckMid = [L * 0.42 + nf * s * 0.45, H * 0.3 + nu * s * 0.55, 0],
			neckTop = [L * 0.42 + nf * s, H * 0.3 + nu * s, 0];
		// The neck is its own joint at the shoulders: it lowers the head to the ground (grazing) and
		// raises it (alert).
		const neck = group(body, neckBase),
			rel = (q) => [q[0] - neckBase[0], q[1] - neckBase[1], q[2]];
		limb(neck, o.coat, [0, 0, 0], rel(neckMid), W * 0.62, W * 0.46, 10);
		ball(neck, o.coat, W * 0.46, rel(neckMid));
		limb(neck, o.coat, rel(neckMid), rel(neckTop), W * 0.46, W * 0.36, 10);
		if (o.bib) limb(neck, o.bib, [W * 0.25, -W * 0.25, 0], rel([neckMid[0] + W * 0.22, neckMid[1] - W * 0.2, 0]), W * 0.4, W * 0.28, 8);
		// Head: skull, cheeks, a tapering muzzle, the nose; eyes with a glint; ears.
		const head = group(neck, rel(neckTop)),
			hl = o.head * s,
			ears = [];
		mesh(head, loft("h" + key, [[-0.2, 0.36, 0.4, 0.06], [0.08, 0.42, 0.46, 0.08], [0.36, 0.32, 0.34, -0.02], [0.66, 0.2, 0.22, -0.12], [0.92, 0.13, 0.14, -0.17], [1, 0.06, 0.07, -0.18]].map(([x, w, h, y]) => [x * hl, w * hl, h * hl, y * hl]), 10), o.coat);
		if (o.muzzle) ball(head, o.muzzle, hl * 0.2, [hl * 0.58, -hl * 0.14, 0], [1.7, 0.6, 1.15]);
		ball(head, dark, hl * 0.085, [hl * 0.98, -hl * 0.16, 0], [1, 0.8, 1.25]); // nose
		for (const z of [-1, 1]) {
			ball(head, o.eye || dark, hl * 0.075, [hl * 0.32, hl * 0.12, z * hl * 0.31]);
			ball(head, white, hl * 0.022, [hl * 0.37, hl * 0.16, z * hl * 0.37]); // glint
		}
		if (o.ears === "pointy" || o.ears === "long" || o.ears === "round")
			for (const z of [-1, 1]) {
				const ear = group(head, [hl * 0.05, hl * 0.35, z * hl * 0.22]);
				ear.rotation.set(z * (o.ears === "long" ? 0.15 : 0.4), 0, o.ears === "long" ? 0.5 : 0.12);
				if (o.ears === "round") ball(ear, o.coat, hl * 0.14, [0, hl * 0.08, 0], [0.6, 1, 0.9]);
				else {
					const eh = hl * (o.ears === "long" ? 1.1 : 0.42);
					limb(ear, o.coat, [0, 0, 0], [0, eh, 0], hl * 0.12, hl * 0.03, 6);
					limb(ear, pink, [0.04 * hl, eh * 0.1, 0], [0.04 * hl, eh * 0.8, 0], hl * 0.07, hl * 0.02, 4);
					if (o.earTip) limb(ear, o.earTip, [0, eh * 0.72, 0], [0, eh * 1.01, 0], hl * 0.055, hl * 0.012, 5);
				}
				ears.push(ear);
			}
		// Legs: a muscled shoulder or haunch; the upper leg to the elbow (stifle behind), the lower leg in
		// its own joint — forearm and cannon in front, the hock bent back behind — and a hoof or a paw.
		const legs = [];
		for (const [x, back] of [[L * 0.3, false], [-L * 0.3, true]])
			for (const side of [-1, 1]) {
				const pivot = group(body, [x, -H * 0.3, side * W * 0.55]),
					thick = W * (o.thick ?? 0.3) * (back ? 1.15 : 1),
					lower = o.leg ?? o.coat,
					J = back ? [0.35 * s, -legH * 0.32, 0] : [0.05 * s, -legH * 0.36, 0];
				// A hare's hind leg: a big thigh lying flat along the flank, the hock low and the long foot flat
				// on the ground, pointing forward.
				const hare = back && o.longFeet;
				if (hare) {
					ball(pivot, o.coat, thick * 1.5 * (o.haunch ?? 1), [-0.1 * s, -H * 0.06, 0], [1.5, 1.2, 0.5]);
					J[0] = 0.4 * s;
					J[1] = -legH * 0.4;
				} else ball(pivot, o.coat, thick * 1.5 * (back ? 1 : o.shoulder ?? 1), [back ? -0.1 * s : 0.05 * s, H * 0.12, 0], [back ? 1.5 : 1.1, 1.6, 1]);
				limb(pivot, o.coat, [0, H * 0.3, 0], J, thick * 1.35, thick * 0.85, 8);
				const joint = group(pivot, J),
					K = hare ? [-1.3 * s, -legH * 0.48, 0] : back ? [-0.75 * s, -legH * 0.3, 0] : [0.05 * s, -legH * 0.33, 0],
					F = hare ? [K[0] + L * 0.3, -legH - J[1] + thick * 0.3, 0] : [K[0] + (back ? 0.15 : 0.12) * s, -legH - J[1] + thick * 0.5, 0];
				ball(joint, o.coat, thick * 0.82, [0, 0, 0]);
				limb(joint, lower, [0, 0, 0], K, thick * 0.8, thick * 0.52, 7);
				ball(joint, lower, thick * 0.52, K);
				limb(joint, lower, K, F, thick * 0.5, thick * 0.42, 6);
				if (hare) ball(joint, o.foot ?? dark, thick * 0.55, [F[0], F[1] - thick * 0.05, 0], [1.6, 0.6, 1]);
				else if (o.paws) ball(joint, o.foot ?? dark, thick * 0.72, [F[0] + thick * 0.35, F[1] - thick * 0.18, 0], [1.45, 0.6, 1]);
				else cyl(joint, o.foot ?? hoof, thick * 0.5, thick * 1.1, [F[0] + thick * 0.1, F[1] - thick * 0.25, 0], { top: thick * 0.4, segs: 7 });
				legs.push({ pivot, joint, back });
			}
		// Tail.
		const tail = group(body, [-L * 0.5, H * 0.3, 0]),
			tl = (o.tail ?? 6) * s;
		if (o.bushy) mesh(tail, loft("t" + key, [[0, 0.1, 0.1, 0], [-0.2, 0.24, 0.24, -0.04], [-0.45, 0.32, 0.31, -0.14], [-0.75, 0.25, 0.24, -0.28], [-0.92, 0.12, 0.12, -0.34], [-1, 0.03, 0.03, -0.36]].map(([x, w, h, y]) => [x * tl, w * tl, h * tl, y * tl]), 9), o.coat);
		else if (tl > 0) limb(tail, o.coat, [0, 0, 0], [-tl * 0.85, -tl * 0.5, 0], W * 0.16, W * 0.06, 6);
		if (o.tip) ball(tail, o.tip, tl * (o.bushy ? 0.15 : 0.3), [-tl * 0.92, o.bushy ? -tl * 0.35 : -tl * 0.45, 0], o.bushy ? [1.4, 1, 1] : [0.8, 1, 1]);
		o.extra?.({ head, body, tail, hl, L, W, H }, s);
		const speed = o.gait ?? 13,
			reach = o.graze ?? 1.5;
		return {
			root,
			// i: time, moving; optionally stride (the walk cycle, advancing with the speed), graze 0…1 (head
			// down to the ground), alert 0…1 (head up, ears pricked), aim (head turned).
			update(e, i) {
				const t = (i.stride ?? i.time) * speed + e.id,
					graze = i.graze || 0,
					alert = i.alert || 0;
				neck.rotation.z = -graze * reach + alert * 0.25 + (graze > 0.5 ? Math.sin(i.time * 2.3 + e.id) * 0.05 : 0);
				if (o.hop) {
					// Hops: the hind legs push together, the front legs reach together, the body arcs.
					const ph = i.moving ? Math.sin(t) : 0;
					for (const l of legs) {
						l.pivot.rotation.z = (l.back ? -0.7 : 0.55) * ph;
						l.joint.rotation.z = (l.back ? 0.6 : -0.4) * Math.max(0, -ph);
					}
					body.position.y = lift + (i.moving ? Math.max(0, Math.sin(t)) * s * 3.2 : 0);
					body.rotation.z = i.moving ? Math.cos(t) * 0.16 : 0;
				} else {
					// A walk: diagonal pairs, the lower legs folding as they swing forward.
					legs.forEach((l, n) => {
						const ph = t + (n === 0 || n === 3 ? 0 : Math.PI);
						l.pivot.rotation.z = i.moving ? Math.sin(ph) * 0.5 : 0;
						l.joint.rotation.z = i.moving ? (l.back ? 0.7 : -0.75) * Math.max(0, Math.sin(ph + 1.3)) : 0;
					});
					body.position.y = lift + (i.moving ? Math.abs(Math.sin(t)) * s * 0.8 : Math.sin(i.time * 1.8 + e.id) * s * 0.06);
				}
				head.rotation.y = -Math.max(-0.6, Math.min(0.6, i.aim));
				head.rotation.z = i.recoil * 0.4 - graze * 0.45 + (i.moving ? Math.sin(t * 2) * 0.04 : Math.sin(i.time * 0.7 + e.id) * 0.08);
				// Ears twitch now and then; pricked up when alert.
				ears.forEach((ear, n) => (ear.rotation.y = Math.max(0, Math.sin(i.time * 0.9 + e.id * 3 + n * 2) - 0.93) * 4 * (1 - alert) - alert * 0.25));
				tail.rotation.y = Math.sin(i.time * (i.moving ? 9 : 2.5) + e.id) * 0.3;
			},
		};
	}
	// Antlers: a curving main beam with tines rising from it, on each side.
	function antlers({ head, hl }, s) {
		for (const z of [-1, 1]) {
			const a = group(head, [hl * 0.05, hl * 0.4, z * hl * 0.15]);
			a.rotation.x = z * 0.4;
			const beam = [[0, 0, 0], [-hl * 0.12, hl * 0.4, 0], [-hl * 0.1, hl * 0.8, 0], [hl * 0.05, hl * 1.12, 0]];
			for (let n = 1; n < beam.length; n++) limb(a, antler, beam[n - 1], beam[n], hl * (0.065 - n * 0.012), hl * (0.055 - n * 0.012), 5);
			for (const [p, t] of [[beam[1], [hl * 0.3, hl * 0.62, 0]], [beam[2], [hl * 0.22, hl * 1.02, 0]], [beam[2], [-hl * 0.42, hl * 1.05, 0]], [beam[3], [-hl * 0.15, hl * 1.36, 0]]]) limb(a, antler, p, t, hl * 0.035, hl * 0.012, 4);
		}
	}
	const ANIMALS = {
		deer: (biome) => quadruped("deer", 1.25, { length: 20, width: 3.4, depth: 4.4, legs: 9, neck: [2.8, 6.5], head: 6, tail: 2.5, ears: "pointy", coat: scenery.deer, belly: nature.belly, rump: white, thick: 0.27, gait: 11, extra: antlers, tip: white }),
		fox: (biome) => {
			const coat = biome === "ice" ? scenery.snowfox : scenery.fox;
			return quadruped("fox" + (biome === "ice" ? "i" : ""), 0.7, { length: 20, width: 3.2, depth: 3.8, legs: 6, neck: [2.6, 3.2], head: 6.5, tail: 11, bushy: true, tip: white, ears: "pointy", earTip: biome === "ice" ? null : dark, coat, belly: white, bib: white, muzzle: white, leg: biome === "ice" ? coat : dark, foot: dark, paws: true, gait: 14 });
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
				earTip: dark,
				coat: scenery.hare,
				belly: white,
				thick: 0.38,
				haunch: 1.1,
				shoulder: 0.6,
				longFeet: true,
				paws: true,
				foot: scenery.hare,
				hop: true,
				gait: 9,
				torso: [[-0.5, 0.5, 0.6, 0.12], [-0.38, 0.95, 1, 0.06], [-0.15, 0.95, 1, 0.02], [0.08, 0.85, 0.9, 0], [0.3, 0.74, 0.8, 0.1], [0.46, 0.5, 0.6, 0.3]],
			}),
	};

	// Lizard: flat and low, a wedge of a head with bulging eyes, legs sprawled out to the sides with the
	// elbows bent and toes spread on the ground, a long tail swinging the other way to the body; blotches
	// along the back.
	function lizard() {
		const root = new THREE.Group(),
			body = group(root, [0, 1.7, 0]),
			legs = [];
		const c = scenery.lizard;
		mesh(body, loft("liz2", [[10.6, 0.2, 0.14, -0.25], [9.4, 0.9, 0.55, -0.05], [8, 1.35, 0.85, 0.1], [6.4, 1.05, 0.7, 0.05], [4.5, 1.7, 1, 0.12], [1.5, 2.2, 1.2, 0.2], [-1.5, 2.1, 1.1, 0.16], [-4.2, 1.4, 0.8, 0.05], [-5.2, 1, 0.62, 0]], 10), c);
		for (const z of [-1, 1]) {
			ball(body, c, 0.5, [7.9, 0.55, z * 0.9]); // eye bulge
			ball(body, nature.eye, 0.3, [8.05, 0.7, z * 1.15]);
			ball(body, white, 0.09, [8.25, 0.8, z * 1.33]);
		}
		for (let n = 0; n < 6; n++) ball(body, dark, 0.55, [3.6 - n * 1.6, 1.05 - Math.abs(n - 2) * 0.05, (n % 2 ? 1 : -1) * 0.35], [1.3, 0.25, 0.75]); // blotches
		const tail = group(body, [-5, 0, 0]);
		mesh(tail, loft("lizT", [[0.2, 1, 0.62, 0], [-3, 0.7, 0.48, -0.12], [-7, 0.45, 0.32, -0.3], [-11, 0.25, 0.2, -0.45], [-15, 0.1, 0.1, -0.55], [-17.5, 0.03, 0.03, -0.6]], 8), c);
		for (let n = 0; n < 4; n++) ball(tail, dark, 0.38 - n * 0.06, [-1.5 - n * 3, 0.5 - n * 0.1, 0], [1.2, 0.25, 0.8]);
		for (const x of [3.6, -3.4])
			for (const z of [-1, 1]) {
				const leg = group(body, [x, -0.2, z * 1.6]),
					fwd = x > 0 ? 1 : -1,
					elbow = [fwd * 0.4, 0.15, z * 2],
					wrist = [fwd * 1.1, -1.35, z * 2.9];
				limb(leg, c, [0, 0, 0], elbow, 0.55, 0.42, 6);
				ball(leg, c, 0.42, elbow);
				limb(leg, c, elbow, wrist, 0.4, 0.28, 6);
				for (const f of [-1.2, -0.4, 0.4, 1.2]) limb(leg, dark, wrist, [wrist[0] + fwd * 0.7 + f * 0.25, -1.55, wrist[2] + z * 0.45 + f * 0.35], 0.13, 0.05, 3);
				legs.push(leg);
			}
		return {
			root,
			update(e, i) {
				const t = (i.stride ?? i.time) * 10 + e.id,
					run = i.moving ? 1 : i.stride !== undefined ? 0 : 0.15;
				legs.forEach((l, n) => (l.rotation.y = Math.sin(t + n * 1.6) * 0.5 * run));
				body.rotation.y = Math.sin(t) * 0.1 * run;
				tail.rotation.y = -Math.sin(t - 0.6) * 0.32 * run;
			},
		};
	}
	// Bird: a round body with a lighter breast, a head with a two-part beak and glinting eyes, wings with a
	// rounded leading edge and the primary feathers spread at the tips, a fan of tail feathers, the legs
	// tucked. It flaps, then glides on held wings.
	const birdBelly = std("#d8cdb8", { roughness: 0.9, metalness: 0 }),
		beakMat = std("#d9a640", { roughness: 0.6, metalness: 0 });
	function bird() {
		const root = new THREE.Group(),
			m = scenery.bird,
			wings = [];
		mesh(root, loft("bird2", [[5.3, 0.25, 0.25, 0.35], [4.3, 1.05, 1, 0.4], [2.6, 1.75, 1.7, 0.12], [0, 2, 1.9, -0.1], [-2.5, 1.5, 1.3, 0], [-4.6, 0.6, 0.5, 0.15]], 12), m);
		ball(root, birdBelly, 1, [1.3, -0.65, 0], [2.7, 1.2, 1.55]);
		ball(root, m, 1.25, [5, 1.1, 0]);
		limb(root, beakMat, [6, 1.05, 0], [8.1, 0.75, 0], 0.42, 0.06, 6); // upper beak
		limb(root, beakMat, [5.9, 0.75, 0], [7.4, 0.62, 0], 0.26, 0.05, 5); // lower beak
		for (const z of [-1, 1]) {
			ball(root, nature.eye, 0.26, [5.8, 1.45, z * 0.82]);
			ball(root, white, 0.08, [5.95, 1.55, z * 1.02]);
			limb(root, dark, [-0.5, -1.2, z * 0.6], [-2.6, -1.6, z * 0.6], 0.18, 0.12, 4); // tucked legs
		}
		// Tail: seven feathers fanned out.
		for (let n = 0; n < 7; n++) {
			const a = (n - 3) * 0.13;
			plate(root, n % 2 ? birdBelly : m, [[0, -0.32], [0, 0.32], [-4.6, 0.55], [-5.1, 0], [-4.6, -0.55]], 0.14, [-4.2, 0.25 + Math.abs(n - 3) * 0.02, 0], [0, 0, a]);
		}
		for (const z of [-1, 1]) {
			const wing = group(root, [0.6, 0.65, z * 1.4]),
				outer = group(wing, [0, 0, z * 5.4]);
			// Arm: a rounded leading edge; the lighter underwing coverts show from below.
			plate(wing, m, [[2.4, 0], [2.3, z * 2.6], [1.6, z * 5.4], [-1.9, z * 5.4], [-2.6, z * 2.6], [-2.5, 0]], 0.32, [0, 0, 0]);
			plate(wing, birdBelly, [[2.2, z * 0.4], [2.1, z * 2.6], [1.4, z * 5.2], [0.2, z * 5.2], [-0.2, z * 2.6], [0, z * 0.4]], 0.1, [0, -0.22, 0]);
			// Hand: a tapering plate and five primaries spread like fingers.
			plate(outer, m, [[1.6, 0], [0.8, z * 3.4], [-1.2, z * 4], [-2.4, z * 1.8], [-1.9, 0]], 0.28, [0, 0, 0]);
			for (let k = 0; k < 5; k++) {
				const bx = 0.8 - k * 0.65,
					tx = 0.2 - k * 1.25,
					tz = z * (7.2 - k * 0.55);
				plate(outer, m, [[bx + 0.3, z * 3.2], [tx + 0.25, tz], [tx - 0.3, tz - z * 0.25], [bx - 0.35, z * 3.2]], 0.12, [0, -k * 0.03, 0]);
			}
			wings.push([wing, outer, z]);
		}
		return {
			root,
			update(e, i) {
				// Flapping for a while, then gliding with the wings held a little up.
				const cycle = (i.time * 0.35 + e.id * 0.37) % 1,
					flap = cycle < 0.6,
					f = flap ? Math.sin(i.time * 8 + e.id) : 0.18,
					lag = flap ? Math.sin(i.time * 8 + e.id - 0.7) : 0.1;
				wings.forEach(([w, o, z]) => {
					w.rotation.x = z * f * 0.6;
					o.rotation.x = z * (f * 0.35 + lag * 0.35);
				});
			},
		};
	}
	// Fish: a lofted body with a lighter belly, eyes, a dorsal fin, pectoral fins and a forked tail
	// swinging.
	const fishBelly = std("#d6dcd8", { roughness: 0.5, metalness: 0.2 });
	function fish() {
		const root = new THREE.Group(),
			m = scenery.fish,
			tail = group(root, [-4.4, 0, 0]);
		mesh(root, loft("fish2", [[4.9, 0.18, 0.25, -0.05], [3.6, 0.85, 1.25, 0.05], [1, 1.2, 1.8, 0.12], [-1.8, 1, 1.4, 0.08], [-3.6, 0.55, 0.75, 0], [-4.6, 0.2, 0.28, 0]], 10), m);
		ball(root, fishBelly, 1, [0.6, -0.75, 0], [3.4, 0.9, 0.95]);
		for (const z of [-1, 1]) {
			ball(root, dark, 0.3, [3.5, 0.35, z * 0.72]);
			ball(root, white, 0.08, [3.62, 0.45, z * 0.86]);
			fin(root, m, [[0.6, 0], [-0.6, 0], [-1.8, -0.9], [-0.6, -0.8]], 0.1, [2, -0.6, z * 1], [z * 0.6, 0, 0]); // pectoral
		}
		fin(root, m, [[1.5, 0], [-1.8, 0], [-1.4, 1.5], [0.5, 1.3]], 0.15, [0, 1.6, 0]);
		fin(tail, m, [[0.2, 0], [-2.2, 1.9], [-3.1, 1.9], [-1.9, 0], [-3.1, -1.9], [-2.2, -1.9]], 0.15, [0, 0, 0]);
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
