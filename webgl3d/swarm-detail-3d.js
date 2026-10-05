/* The Swarm (Obsidian Guardians) in detail: matte obsidian, cut in facets, no glow — the team stripe is
   the only colour (swarm-art.js). Built with the shape kit of models-detail-3d.js; same contract as
   models-3d.js ({ root, update(e, info) }, +X the front, +Y up, +Z the right side).
   - Shards: tapering five-sided stones with uneven faces and a chipped top, a few shapes shared by all.
   - Buildings: a stepped six-sided plinth, a central monolith with grooves, a stripe band and a crown,
     a ring of smaller (some broken) monoliths leaning out, fragments at the foot; the core has buttresses
     to the centre, the monolith slowly orbiting shards, the defences a turning crown of blades.
   - Units: faceted bodies with plates, a lens, legs with knees and pointed feet; prongs, blades or a
     spike as weapons; the crawler a segmented carapace on six legs; flyers with blade wings. */
export function createSwarm3D(THREE, { tools, group }) {
	const { mesh, box, cyl, ball, loftGeo, cylGeo, cached } = tools,
		UP = new THREE.Vector3(0, 1, 0),
		n2 = (v) => Math.round(v * 100) / 100;
	const hash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

	// A tapering rod from a (radius r0) to b (radius r1), few sides (stone, not flesh).
	function limb(parent, m, a, b, r0, r1, segs = 5) {
		const A = new THREE.Vector3(...a),
			B = new THREE.Vector3(...b),
			o = mesh(parent, cylGeo(n2(r1), n2(r0), n2(A.distanceTo(B)), segs), m);
		o.position.copy(A).add(B).multiplyScalar(0.5);
		o.quaternion.setFromUnitVectors(UP, B.sub(A).normalize());
		return o;
	}
	// A shard (unit radius at the foot, unit height, standing on y = 0): five uneven faces tapering up, a
	// chipped, slanted top with a point. Variant 3 and up: broken off low, no point.
	function shardGeo(v) {
		let s = 7 + v * 9973;
		const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
		const sides = 5,
			radii = Array.from({ length: sides }, () => 0.82 + rnd() * 0.3),
			broken = v >= 3,
			ring = (y, k, tilt = 0, dx = 0) =>
				radii.map((r, i) => {
					const a = (i / sides) * Math.PI * 2 + v * 0.7;
					return [n2(Math.cos(a) * r * k + dx), n2(y + Math.cos(a) * tilt), n2(Math.sin(a) * r * k)];
				});
		const rings = broken ? [ring(0, 1), ring(0.45, 0.82), ring(0.6, 0.74, 0.08)] : [ring(0, 1), ring(0.55, 0.78), ring(0.86, 0.5, 0.05), ring(0.97, 0.12, 0, 0.05)];
		return loftGeo("shard" + v, rings);
	}
	const SHARDS = 5;
	// A shard part: radius w at the foot, height h, standing at (x, y, z), turned and leaning.
	function shard(parent, m, [x, y, z], w, h, v, rot = [0, 0, 0]) {
		const o = mesh(parent, shardGeo(v % SHARDS), m, [x, y, z], rot);
		o.scale.set(w, h, w);
		return o;
	}
	// A faceted body lying along X (unit length, radius ~0.5): like a shard on its side.
	const bodyGeo = (v) =>
		cached("sbody" + v, () => {
			let s = 31 + v * 7;
			const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
			const ring = (x, k, h = 1) =>
				Array.from({ length: 6 }, (_, i) => {
					const a = (i / 6) * Math.PI * 2 + 0.26,
						r = (0.85 + rnd() * 0.25) * k;
					return [n2(x), n2(Math.sin(a) * r * h), n2(Math.cos(a) * r)];
				});
			return loftGeo("sbodyl" + v, [ring(-0.5, 0.22, 0.7), ring(-0.3, 0.46), ring(0.1, 0.5, 0.9), ring(0.38, 0.36, 0.8), ring(0.5, 0.06, 0.5)]);
		});

	// ---------- buildings ----------
	function building(k, r, type) {
		const root = new THREE.Group(),
			seed = hash(type),
			core = type === "hq",
			lone = type === "monolith",
			n = core ? 6 : lone ? 0 : 3 + (seed % 3),
			tall = core ? 3 : lone ? 3.4 : 1.4 + ((seed >> 4) % 10) / 10,
			H = r * tall,
			W = r * 0.42;
		// Stepped six-sided plinth.
		mesh(root, cylGeo(n2(r * 0.86), n2(r * 0.95), 3, 6), k.warn, [0, 1.5, 0]);
		mesh(root, cylGeo(n2(r * 0.62), n2(r * 0.7), 2.4, 6), k.dark, [0, 4.2, 0], [0, Math.PI / 6, 0]);
		// The central monolith: grooves down its faces, a stripe band, a pale lip under the crown.
		shard(root, k.plate, [0, 5, 0], W, H, seed % 3);
		for (let i = 0; i < 5; i++) {
			const a = (i / 5) * Math.PI * 2 + (seed % 3) * 0.7 + 0.63;
			box(root, k.black, [0.6, H * 0.5, W * 0.18], [Math.cos(a) * W * 0.74, 5 + H * 0.33, Math.sin(a) * W * 0.74], [0, -a, 0.05], 0.1);
		}
		mesh(root, cylGeo(n2(W * 0.84), n2(W * 0.88), 3, 5), k.team, [0, 5 + H * 0.28, 0], [0, (seed % 3) * 0.7, 0]);
		mesh(root, cylGeo(n2(W * 0.44), n2(W * 0.46), 1.6, 5), k.glass, [0, 5 + H * 0.82, 0], [0, (seed % 3) * 0.7, 0]);
		// Satellites leaning out, some broken; buttresses to the centre on the core.
		for (let m = 0; m < n; m++) {
			const a = (m / n) * Math.PI * 2 + (seed % 7),
				d = r * 0.58,
				h = H * (0.42 + ((seed >> (m + 2)) % 5) * 0.08),
				v = (seed + m) % SHARDS,
				x = Math.cos(a) * d,
				z = Math.sin(a) * d;
			shard(root, m % 2 ? k.plate : k.metal, [x, 3, z], r * 0.24, h, v, [Math.sin(a) * 0.12, a, -Math.cos(a) * 0.12]);
			box(root, k.team, [r * 0.3, 1.6, r * 0.3], [x, 3 + h * 0.25, z], [0, a, 0], 0.3);
			if (core) limb(root, k.metal, [x * 0.92, 3 + h * 0.7, z * 0.92], [x * 0.22, 5 + H * 0.55, z * 0.22], 2.2, 1.4);
		}
		// Fragments lying at the foot.
		for (let i = 0; i < 6; i++) {
			const a = i * 2.3 + seed,
				d = r * (0.7 + (i % 3) * 0.08);
			shard(root, k.plate, [Math.cos(a) * d, 1.5, Math.sin(a) * d], r * 0.05 + 1, r * 0.08 + 2, 3 + (i % 2), [1.2, a, 0.3]);
		}
		// The monolith: shards orbiting slowly round its waist.
		let orbit = null;
		if (lone) {
			orbit = group(root, [0, 5 + H * 0.45, 0]);
			for (let i = 0; i < 5; i++) {
				const a = (i / 5) * Math.PI * 2;
				shard(orbit, k.metal, [Math.cos(a) * r * 0.75, (i % 2) * 6, Math.sin(a) * r * 0.75], 2.4, 9, i, [0.4, a, 0.2]);
			}
		}
		// Defences: a crown of blades turning to the target.
		let head = null;
		if (type === "turret" || type === "flak") {
			head = group(root, [0, 5 + H + r * 0.05, 0]);
			mesh(head, cylGeo(n2(r * 0.22), n2(r * 0.3), 4, 5), k.dark, [0, 0, 0]);
			const blades = type === "flak" ? [-6, -2, 2, 6] : [-3, 3];
			for (const z of blades) shard(head, k.metal, [2, 2, z], 1.6, 22, 0, [0, 0, -Math.PI / 2 + (type === "flak" ? 0.6 : 0)]);
			box(head, k.glass, [2, 2, 4], [r * 0.18, 2.5, 0], null, 0.4);
		}
		return {
			root,
			update(e, i) {
				if (head) head.rotation.y = -i.aim;
				if (orbit) {
					orbit.rotation.y = i.time * 0.25;
					orbit.position.y = 5 + H * 0.45 + Math.sin(i.time * 0.8) * 3;
				}
			},
		};
	}

	// ---------- small units: a faceted body on four legs ----------
	// o: prongs (two spikes forward), spine (shards along the back).
	function sentry(k, size, o = {}) {
		const root = new THREE.Group(),
			s = size / 10,
			body = group(root, [0, 9 * s, 0]),
			legs = [];
		const b = mesh(body, bodyGeo(1), k.plate, [0, 0, 0]);
		b.scale.set(19 * s, 13 * s, 13 * s);
		for (const z of [-1, 1]) box(body, k.metal, [10 * s, 0.8 * s, 3 * s], [-1 * s, 2.6 * s, z * 4.4 * s], [z * 0.5, 0, 0], 0.3 * s); // shoulder plates
		box(body, k.team, [2.4 * s, 7 * s, 11.6 * s], [-5 * s, 0, 0], null, 0.4 * s);
		box(body, k.glass, [1.2 * s, 1.6 * s, 3.2 * s], [8.6 * s, 0.6 * s, 0], null, 0.3 * s); // lens
		box(body, k.black, [1 * s, 2.2 * s, 4 * s], [8.2 * s, 0.6 * s, 0], null, 0.2 * s);
		shard(body, k.metal, [-2 * s, 3.4 * s, 0], 3 * s, 5 * s, 2);
		if (o.prongs) for (const z of [-3, 3]) shard(body, k.metal, [6 * s, -0.5 * s, z * s], 1.1 * s, 12 * s, 1, [0, 0, -Math.PI / 2]);
		if (o.spine) for (let n = 0; n < 4; n++) shard(body, k.metal, [(-6 + n * 3.6) * s, 3.6 * s, 0], 1.3 * s, (5 - Math.abs(n - 1.5)) * s, n, [0, 0, 0.25]);
		for (const x of [-5, 5])
			for (const z of [-1, 1]) {
				const leg = group(body, [x * s, -1.5 * s, z * 4 * s]),
					knee = [x > 0 ? 1.5 * s : -1.5 * s, 2 * s, z * 4 * s],
					foot = [x > 0 ? 2.5 * s : -2.5 * s, -7.5 * s, z * 5.5 * s];
				limb(leg, k.dark, [0, 0, 0], knee, 1 * s, 0.8 * s);
				ball(leg, k.metal, 0.9 * s, knee);
				limb(leg, k.dark, knee, foot, 0.8 * s, 0.25 * s);
				legs.push(leg);
			}
		return {
			root,
			update(e, i) {
				legs.forEach((l, n) => (l.rotation.z = i.moving ? Math.sin(i.time * 13 + e.id + (n % 2) * Math.PI) * 0.5 : 0));
				body.rotation.y = -Math.max(-0.5, Math.min(0.5, i.aim)) * 0.5;
				body.position.y = 9 * s + (i.moving ? Math.abs(Math.sin(i.time * 13 + e.id)) * 0.6 * s : 0);
			},
		};
	}
	// Crawler: a low segmented carapace, mandibles, six thin legs.
	function crawler(k, r) {
		const root = new THREE.Group(),
			s = r / 9,
			legs = [];
		for (let n = 0; n < 3; n++) {
			const seg = mesh(root, bodyGeo(n + 2), n === 1 ? k.plate : k.metal, [(-6 + n * 6) * s, 5 * s, 0]);
			seg.scale.set(8 * s, 6 * s, (10 - Math.abs(n - 1) * 2) * s);
		}
		box(root, k.team, [2 * s, 3.6 * s, 9 * s], [-3 * s, 5.4 * s, 0], null, 0.3 * s);
		for (const z of [-1, 1]) shard(root, k.metal, [8 * s, 4 * s, z * 2 * s], 0.8 * s, 6 * s, 1, [0, z * 0.4, -Math.PI / 2 + 0.2]); // mandibles
		box(root, k.glass, [1 * s, 1.2 * s, 2.4 * s], [7.6 * s, 6 * s, 0], null, 0.2 * s);
		for (let n = 0; n < 3; n++)
			for (const side of [-1, 1]) {
				const leg = group(root, [(-5 + n * 5) * s, 5 * s, side * 4 * s]);
				limb(leg, k.dark, [0, 0, 0], [0, 2.5 * s, side * 5 * s], 0.7 * s, 0.5 * s);
				limb(leg, k.dark, [0, 2.5 * s, side * 5 * s], [(n - 1) * 1.5 * s, -5 * s, side * 8 * s], 0.5 * s, 0.15 * s);
				legs.push(leg);
			}
		return { root, update: (e, i) => legs.forEach((l, n) => (l.rotation.y = i.moving ? Math.sin(i.time * 22 + n * 2 + e.id) * 0.4 : 0)) };
	}
	// Walkers: a long faceted body on two to four legs with knees, a weapon mount turning to the target.
	// o: legs (2, 3, 4), long, plates, hump, sensors; weapon: spike, twin, prong.
	function walker(k, r, o = {}) {
		const root = new THREE.Group(),
			s = r / 20,
			n = o.legs ?? 4,
			L = (o.long ? 46 : 36) * s,
			body = group(root, [0, 20 * s, 0]),
			legs = [];
		const b = mesh(body, bodyGeo(0), k.plate, [0, 0, 0]);
		b.scale.set(L, 15 * s, 16 * s);
		box(body, k.team, [4 * s, 9 * s, 15 * s], [-L * 0.22, 0, 0], null, 0.6 * s);
		box(body, k.black, [L * 0.75, 0.9 * s, 1.8 * s], [0, 6.6 * s, 0], null, 0.3 * s); // groove
		box(body, k.glass, [1.4 * s, 2 * s, 4 * s], [L * 0.46, 1 * s, 0], null, 0.4 * s); // lens
		for (let i = 0; i < 3; i++) shard(body, k.metal, [(-L * 0.25 + i * L * 0.18), 6 * s, 0], 1.8 * s, (5 - i) * s, i, [0, 0, 0.3]); // ridge
		if (o.plates) for (const z of [-1, 1]) for (let i = 0; i < 3; i++) box(body, k.metal, [L * 0.22, 8 * s, 1.4 * s], [-L * 0.2 + i * L * 0.2, -0.5 * s, z * 7.6 * s], [z * 0.15, 0, 0.1], 0.4 * s);
		if (o.hump) shard(body, k.metal, [-4 * s, 4 * s, 0], 6 * s, 14 * s, 2);
		if (o.sensors) for (const z of [-4, 4]) shard(body, k.glass, [-2 * s, 5 * s, z * s], 0.9 * s, 14 * s, 1);
		const places = n === 3 ? [[L * 0.24, -1], [L * 0.24, 1], [-L * 0.3, 0]] : n === 2 ? [[0, -1], [0, 1]] : [[L * 0.24, -1], [L * 0.24, 1], [-L * 0.24, -1], [-L * 0.24, 1]];
		for (const [x, side] of places) {
			const z = side ? side * 6 * s : 0,
				leg = group(body, [x, -3 * s, z]),
				knee = [x >= 0 ? 4 * s : -4 * s, 4 * s, side * 10 * s],
				foot = [x >= 0 ? 2 * s : -2 * s, -17 * s, side * 13 * s];
			ball(leg, k.metal, 2 * s, [0, 0, 0]);
			limb(leg, k.dark, [0, 0, 0], knee, 2 * s, 1.6 * s);
			ball(leg, k.metal, 1.8 * s, knee);
			limb(leg, k.dark, knee, foot, 1.6 * s, 0.5 * s);
			shard(leg, k.plate, [foot[0], foot[1] - 1 * s, foot[2]], 1.6 * s, 3 * s, 1); // foot
			legs.push(leg);
		}
		const mount = group(body, [L * 0.18, 7 * s, 0]),
			weapon = group(mount);
		mesh(mount, cylGeo(n2(4 * s), n2(5 * s), n2(3 * s), 5), k.dark, [0, 0, 0]);
		if (o.spike) shard(weapon, k.metal, [0, 2 * s, 0], 2.4 * s, 34 * s, 0, [0, 0, -Math.PI / 2 + 0.5]);
		else for (const z of o.twin ? [-3.5, 3.5] : o.prong ? [0] : []) shard(weapon, k.metal, [0, 1.5 * s, z * s], 2 * s, 22 * s, 1, [0, 0, -Math.PI / 2]);
		return {
			root,
			update(e, i) {
				legs.forEach((l, m) => (l.rotation.z = i.moving ? Math.sin(i.time * 8 + m * 1.7 + e.id) * 0.35 : 0));
				body.position.y = 20 * s + (i.moving ? Math.sin(i.time * 16 + e.id) * 0.6 * s : 0);
				mount.rotation.y = -i.aim;
				weapon.position.x = -i.recoil * 5 * s;
			},
		};
	}
	// Flyer: a faceted body, two blade wings swept back, a tail spike; banks as it flies.
	function flyer(k, r) {
		const root = new THREE.Group(),
			frame = group(root),
			s = r / 17;
		const b = mesh(frame, bodyGeo(4), k.plate, [0, 0, 0]);
		b.scale.set(26 * s, 7 * s, 9 * s);
		box(frame, k.team, [3 * s, 4.4 * s, 6 * s], [-5 * s, 0, 0], null, 0.4 * s);
		box(frame, k.glass, [1.6 * s, 1.4 * s, 3 * s], [11.4 * s, 0.6 * s, 0], null, 0.3 * s);
		for (const z of [-1, 1]) {
			shard(frame, k.metal, [0, 0, z * 3 * s], 2.4 * s, 26 * s, z > 0 ? 0 : 1, [z * (Math.PI / 2), z * 0.5, 0]); // wing blade
			shard(frame, k.plate, [-4 * s, 0, z * 3 * s], 1.6 * s, 14 * s, 2, [z * (Math.PI / 2 + 0.3), z * 0.9, 0]);
		}
		shard(frame, k.metal, [-11 * s, 0, 0], 1.4 * s, 12 * s, 1, [0, 0, Math.PI / 2]); // tail spike
		return { root, update: (e, i) => (frame.rotation.x = Math.sin(i.time * 1.4 + e.id) * 0.3) };
	}

	return { building, sentry, crawler, walker, flyer, shard, limb };
}
