/* Detailed code-built models of the Colonies and the Dominium (units and buildings), replacing the simple
   box models of models-3d.js for those types. Built from a small kit of shapes: bevelled boxes, side
   profiles extruded across the width (hulls), lofts through rings of points (turrets, fuselages), lathes
   (towers, domes), track belts with the road wheels inside, barrels with sleeves and muzzle brakes, lamps,
   pipes. Same contract as models-3d.js: build(kit, radius) → { root, update(e, info) }, local frame +X the
   front, +Y up, +Z the right side; the same animated parts (turrets aim, barrels recoil, wheels roll, legs
   walk, cranes and dishes turn).
   Detail costs no extra draw calls in the game: models-3d.js bakes every model on creation, merging the
   parts that never move into one geometry per group and material (bakeModel). The Colonies read rounded
   (cast turrets, domes, arched halls), the Dominium angular (wedges, sloped plates, crenels). */
import { cloudShade } from "./sky-3d.js";
import { nightLightShade } from "./night-lights-3d.js";

export function createDetail3D(THREE, { group }) {
	const cache = new Map(),
		cached = (key, make) => {
			let g = cache.get(key);
			if (!g) cache.set(key, (g = make()));
			return g;
		},
		n2 = (v) => Math.round(v * 100) / 100,
		UP = new THREE.Vector3(0, 1, 0);

	// ---------- geometry ----------
	// A box with bevelled edges, centred.
	function bevelGeo(w, h, d, b) {
		b = Math.max(0.05, Math.min(b ?? Math.min(w, h, d) * 0.12, w / 2 - 0.02, h / 2 - 0.02, d / 2 - 0.02));
		return cached(`bb${n2(w)},${n2(h)},${n2(d)},${n2(b)}`, () => {
			const s = new THREE.Shape(),
				x = w / 2 - b,
				y = h / 2 - b;
			s.moveTo(-x, -y);
			s.lineTo(x, -y);
			s.lineTo(x, y);
			s.lineTo(-x, y);
			s.lineTo(-x, -y);
			const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.02, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
			g.translate(0, 0, -Math.max(0.02, d - 2 * b) / 2);
			return g;
		});
	}
	// A side profile (x, y points, counter-clockwise) extruded across the width (Z), centred on Z.
	function profileGeo(points, width, b = 0.5) {
		return cached("pr" + JSON.stringify(points) + width + b, () => {
			const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))),
				depth = Math.max(0.02, width - 2 * b),
				g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
			g.translate(0, 0, -depth / 2);
			return g;
		});
	}
	// A solid through rings of points (same count each), capped at both ends; faces turned outwards.
	function loftGeo(key, rings) {
		return cached("lo" + key, () => {
			const pos = [],
				all = rings.flat(),
				centre = all.reduce((c, p) => c.add(new THREE.Vector3(...p)), new THREE.Vector3()).divideScalar(all.length),
				a = new THREE.Vector3(),
				b = new THREE.Vector3(),
				c = new THREE.Vector3(),
				n = new THREE.Vector3(),
				m = new THREE.Vector3();
			const tri = (p, q, r) => {
				a.set(...p);
				b.set(...q);
				c.set(...r);
				n.subVectors(b, a).cross(m.subVectors(c, a));
				const mid = a.clone().add(b).add(c).divideScalar(3).sub(centre);
				if (n.dot(mid) < 0) pos.push(...p, ...r, ...q);
				else pos.push(...p, ...q, ...r);
			};
			const count = rings[0].length;
			for (let r = 0; r < rings.length - 1; r++)
				for (let i = 0; i < count; i++) {
					const p = rings[r][i],
						q = rings[r][(i + 1) % count],
						s = rings[r + 1][(i + 1) % count],
						t = rings[r + 1][i];
					tri(p, q, s);
					tri(p, s, t);
				}
			for (const ring of [rings[0], rings[rings.length - 1]]) {
				const mid = ring.reduce((s, p) => s.map((v, i) => v + p[i] / ring.length), [0, 0, 0]);
				for (let i = 0; i < count; i++) tri(mid, ring[i], ring[(i + 1) % count]);
			}
			const g = new THREE.BufferGeometry();
			g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
			g.computeVertexNormals();
			return g;
		});
	}
	const plainGeo = (w, h, d) => cached(`bx${n2(w)},${n2(h)},${n2(d)}`, () => new THREE.BoxGeometry(w, h, d));
	// Cylinder (or cone frustum) along an axis, centred.
	const cylGeo = (rt, rb, h, segs = 12, axis = "y", open = false) =>
		cached(`cy${n2(rt)},${n2(rb)},${n2(h)},${segs},${axis},${open}`, () => {
			const g = new THREE.CylinderGeometry(rt, rb, h, segs, 1, open);
			if (axis === "x") g.rotateZ(-Math.PI / 2);
			if (axis === "z") g.rotateX(Math.PI / 2);
			return g;
		});
	// A lathe with a wall thickness (dishes, chimneys, cooling towers): out along the outside, back along
	// the inside, so it shows from both sides.
	const shellGeo = (points, t, segs = 16) => latheGeo([...points, ...points.map(([r, y]) => [Math.max(0.2, r - t), y]).reverse()], segs);
	const latheGeo = (points, segs = 16) => cached("la" + JSON.stringify(points) + segs, () => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs));
	const torusGeo = (R, t, segs = 20, axis = "y") =>
		cached(`to${n2(R)},${n2(t)},${segs},${axis}`, () => {
			const g = new THREE.TorusGeometry(R, t, 6, segs);
			if (axis === "y") g.rotateX(Math.PI / 2);
			if (axis === "x") g.rotateY(Math.PI / 2);
			return g;
		});
	const sphereGeo = (r, w = 12, h = 8, half = false) => cached(`sp${n2(r)},${w},${h},${half}`, () => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI));
	// A track belt: a stadium ring (open inside, so the road wheels show) extruded across the width.
	const beltGeo = (len, h, width, thick) =>
		cached(`be${n2(len)},${n2(h)},${n2(width)},${n2(thick)}`, () => {
			const R = h / 2,
				L = len / 2 - R,
				r = R - thick,
				s = new THREE.Shape(),
				hole = new THREE.Path();
			s.absarc(L, 0, R, -Math.PI / 2, Math.PI / 2, false);
			s.absarc(-L, 0, R, Math.PI / 2, (Math.PI * 3) / 2, false);
			hole.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false);
			hole.absarc(-L, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
			s.holes.push(hole);
			const depth = width - 0.6,
				g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 1, curveSegments: 7 });
			g.translate(0, 0, -depth / 2);
			return g;
		});

	// ---------- placing ----------
	function mesh(parent, g, m, [x, y, z] = [0, 0, 0], rot) {
		const o = new THREE.Mesh(g, m);
		o.position.set(x, y, z);
		if (rot) o.rotation.set(...rot);
		o.castShadow = o.receiveShadow = true;
		parent.add(o);
		return o;
	}
	const box = (parent, m, [w, h, d], pos, rot, b) => mesh(parent, bevelGeo(w, h, d, b), m, pos, rot);
	const slab = (parent, m, [w, h, d], pos, rot) => box(parent, m, [w, h, d], pos, rot, Math.min(w, h, d) * 0.3);
	const cyl = (parent, m, r, h, pos, o = {}) => mesh(parent, cylGeo(o.top ?? r, r, h, o.segs ?? 12, o.axis ?? "y"), m, pos, o.rot);
	const ball = (parent, m, r, pos, scale) => {
		const o = mesh(parent, sphereGeo(r), m, pos);
		if (scale) o.scale.set(...scale);
		return o;
	};
	// A rod from point a to point b.
	function pipe(parent, m, a, b, r, segs = 8) {
		const A = new THREE.Vector3(...a),
			B = new THREE.Vector3(...b),
			o = mesh(parent, cylGeo(r, r, A.distanceTo(B), segs), m);
		o.position.copy(A).add(B).multiplyScalar(0.5);
		o.quaternion.setFromUnitVectors(UP, B.sub(A).normalize());
		return o;
	}
	// Distance driven, from the time while moving (wheels and tracks roll with it).
	function odometer(speed) {
		let last = null,
			d = 0;
		return (i) => {
			if (last !== null) d += (i.moving ? speed : 0) * Math.max(0, Math.min(0.1, i.time - last));
			last = i.time;
			return d;
		};
	}

	// ---------- vehicle parts ----------
	// A road wheel turning around its axle (Z): tyre or rim, hub, cap with nuts.
	function wheel(parent, k, [x, y, z], r, width, o = {}) {
		const w = group(parent, [x, y, z]);
		cyl(w, o.sprocket ? k.dark : k.rubber, r, width, [0, 0, 0], { axis: "z", segs: o.sprocket ? 9 : 12 });
		cyl(w, k.hub, r * 0.62, width + 0.4, [0, 0, 0], { axis: "z", segs: 8 });
		if (o.spokes || o.sprocket) cyl(w, k.steel, r * 0.24, width + 0.9, [0, 0, 0], { axis: "z", segs: 6 });
		// Tread blocks around a tyre (it turns with the wheel, so they cost nothing extra).
		if (o.spokes)
			for (let i = 0; i < 12; i++) {
				const a = (i / 12) * Math.PI * 2;
				box(w, k.rubber, [r * 0.36, 0.6, width + 0.2], [Math.cos(a) * (r - 0.1), Math.sin(a) * (r - 0.1), 0], [0, 0, a + Math.PI / 2], 0.1);
			}
		if (o.spokes)
			for (let i = 0; i < 3; i++) {
				const a = (i * Math.PI) / 3;
				box(w, k.steel, [r * 1.15, 0.5, width + 0.6], [0, 0, 0], [0, 0, a], 0.1);
			}
		w.userData.radius = r;
		return w;
	}
	// A pair of tracks: belts with grousers on the top run, road wheels, sprocket (front) and idler.
	function tracks(root, k, { len, gap, h, width = 7, wheels: n = 5 }) {
		const list = [];
		for (const side of [-1, 1]) {
			const z = side * gap;
			mesh(root, beltGeo(len, h, width, 1.1), k.rubber, [0, h / 2, z]);
			for (let x = -len / 2 + h / 2; x <= len / 2 - h / 2; x += 2.6) {
				mesh(root, plainGeo(0.9, 0.5, width + 0.2), k.black, [x, h + 0.15, z]);
				mesh(root, plainGeo(0.9, 0.5, width + 0.2), k.black, [x + 1.3, 0.1, z]);
			}
			// Return rollers under the top run, a guide horn row along the middle.
			for (const x of [-len * 0.2, len * 0.2]) cyl(root, k.hub, 0.9, width - 1.6, [x, h - 2, z], { axis: "z", segs: 8 });
			mesh(root, plainGeo(len - h, 0.6, 0.8), k.steel, [0, h + 0.35, z]);
			const r = h * 0.33,
				span = len - h * 1.6;
			for (let i = 0; i < n; i++) list.push(wheel(root, k, [-span / 2 + (span * i) / (n - 1), r + 1.1, z], r, width - 1.2));
			list.push(wheel(root, k, [len / 2 - h / 2, h / 2, z], h * 0.36, width - 1.6, { sprocket: true }));
			list.push(wheel(root, k, [-len / 2 + h / 2, h / 2, z], h * 0.33, width - 1.6));
		}
		return list;
	}
	// Wheels on a wheeled vehicle: tyres with mudguards over them.
	function wheelSet(root, k, xs, gap, r, width = 5) {
		const list = [];
		for (const x of xs)
			for (const side of [-1, 1]) {
				list.push(wheel(root, k, [x, r, side * gap], r, width, { spokes: true }));
				arch(root, k, [x, r, side * gap], r, width + 1.4);
			}
		return list;
	}
	const roll = (list, d) => list.forEach((w) => (w.rotation.z = -d / w.userData.radius));
	// A hull: side profile with a sloped front (glacis) and a short slope at the rear, bevelled.
	function hullGeo(len, h, w, { nose = 0.3, tail = 0.1, sharp = false } = {}) {
		const L = len / 2;
		const pts = sharp
			? [[-L, 0], [L - len * 0.12, 0], [L, h * 0.35], [L - len * nose * 1.3, h], [-L + len * tail, h], [-L, h * 0.55]]
			: [[-L, 0], [L - len * 0.1, 0], [L, h * 0.5], [L - len * nose * 0.4, h * 0.62], [L - len * nose, h], [-L + len * tail, h], [-L, h * 0.62]];
		return profileGeo(pts.map(([x, y]) => [n2(x), n2(y)]), w, Math.min(0.8, h * 0.08));
	}
	// A turret shell from its plan (x, z points) at three heights: cast and rounded, or a sloped wedge.
	function turretGeo(len, wid, h, sharp) {
		const L = len / 2,
			W = wid / 2,
			plan = sharp
				? [[L * 1.2, 0], [L * 0.3, W], [-L, W * 0.95], [-L, -W * 0.95], [L * 0.3, -W]]
				: [[L * 1.1, 0], [L * 0.75, W * 0.85], [-L * 0.35, W], [-L, W * 0.7], [-L, -W * 0.7], [-L * 0.35, -W], [L * 0.75, -W * 0.85]],
			ring = (s, y, dx = 0) => plan.map(([x, z]) => [n2(x * s + dx), n2(y), n2(z * s)]);
		return sharp
			? loftGeo(`t${n2(len)},${n2(wid)},${n2(h)},s`, [ring(1, 0), ring(0.98, h * 0.4), ring(0.7, h, -L * 0.2)])
			: loftGeo(`t${n2(len)},${n2(wid)},${n2(h)},r`, [ring(0.94, 0), ring(1, h * 0.35), ring(0.95, h * 0.7), ring(0.78, h, -L * 0.08)]);
	}
	// A gun barrel along +X from the origin: tapering tube, bore evacuator sleeve, muzzle brake.
	function cannon(parent, k, len, r, { brake = true, sleeve = true } = {}) {
		cyl(parent, k.dark, r, len, [len / 2, 0, 0], { axis: "x", top: r * 0.82, segs: 12 });
		if (sleeve) cyl(parent, k.dark, r * 1.55, len * 0.16, [len * 0.58, 0, 0], { axis: "x", segs: 12 });
		cyl(parent, k.steel, r * 1.3, len * 0.06, [len * 0.05, 0, 0], { axis: "x", segs: 12 });
		if (brake) {
			box(parent, k.black, [r * 2.6, r * 2.2, r * 2.6], [len + r * 0.9, 0, 0], null, r * 0.4);
			box(parent, k.steel, [r * 0.5, r * 2.3, r * 1.6], [len + r * 0.6, 0, 0], null, 0.1);
		}
	}
	// Headlights on the front (facing +X) and tail lights on the back.
	function lamps(parent, k, x, y, zs, tail = false) {
		for (const z of zs) {
			if (tail) {
				box(parent, k.red, [0.5, 1, 1.8], [x, y, z], null, 0.1);
				continue;
			}
			cyl(parent, k.steel, 1.1, 1.4, [x, y, z], { axis: "x", top: 0.9, segs: 10 });
			cyl(parent, k.lamp, 0.8, 0.4, [x + 0.8, y, z], { axis: "x", segs: 10 });
		}
	}
	// Antenna: a spring mount and a whip; the group sways (see sway()).
	function antenna(parent, k, [x, y, z], h) {
		const a = group(parent, [x, y, z]);
		cyl(a, k.steel, 0.7, 1.2, [0, 0.6, 0], { segs: 6 });
		cyl(a, k.black, 0.15, h, [0, h / 2 + 1, 0], { top: 0.08, segs: 4 });
		return a;
	}
	const sway = (a, e, i) => {
		a.rotation.z = i.moving ? Math.sin(i.time * 7 + e.id) * 0.08 - 0.06 : 0;
		a.rotation.x = i.moving ? Math.sin(i.time * 5.3 + e.id) * 0.05 : 0;
	};
	const exhaust = (parent, k, [x, y, z]) => {
		cyl(parent, k.steel, 0.9, 3.5, [x, y, z], { axis: "x", top: 1.1, segs: 8 });
		cyl(parent, k.dark, 1.4, 4, [x + 2.5, y, z], { axis: "x", segs: 8 });
	};
	// Cupola with vision blocks and a hatch.
	function cupola(parent, k, [x, y, z], r = 2.6) {
		cyl(parent, k.dark, r, 2, [x, y + 1, z], { top: r * 0.9, segs: 12 });
		cyl(parent, k.metal, r * 0.85, 0.6, [x, y + 2.3, z], { segs: 12 });
		for (let i = 0; i < 5; i++) {
			const a = i * 1.25 + 0.6;
			box(parent, k.glass, [0.6, 0.6, 0.6], [x + Math.cos(a) * r * 0.95, y + 1.2, z + Math.sin(a) * r * 0.95], null, 0.1);
		}
	}

	// Smoke grenade launchers: three short tubes on a bracket, pointing forward-outward and up (no group:
	// static parts stay in their parent, so they merge with it).
	function smokeLaunchers(parent, k, [x, y, z], side) {
		box(parent, k.metal, [1.6, 1.2, 4.2], [x - 0.6, y - 0.9, z], null, 0.2);
		for (let i = 0; i < 3; i++) cyl(parent, k.dark, 0.55, 2.4, [x, y, z + (i - 1) * 1.25], { axis: "x", segs: 8, rot: [0, -side * 0.5, 0.45] });
	}
	// A stowage box with two straps.
	function stowage(parent, k, [w, h, d], [x, y, z]) {
		box(parent, k.dark, [w, h, d], [x, y, z], null, 0.3);
		for (const s of [-1, 1]) box(parent, k.black, [0.5, h + 0.2, d + 0.2], [x + s * w * 0.28, y, z], null, 0.1);
	}
	// A jerry can: body, spout.
	function jerry(parent, k, [x, y, z]) {
		box(parent, k.metal, [1.4, 3.2, 2.4], [x, y, z], null, 0.3);
		box(parent, k.black, [0.6, 0.7, 0.9], [x, y + 1.9, z + 0.6], null, 0.1);
	}
	// Tow hooks (rings across the end) at x.
	function towHooks(parent, k, x, y, zs) {
		for (const z of zs) mesh(parent, torusGeo(0.9, 0.3, 8, "z"), k.steel, [x, y, z]);
	}
	// A driver's hatch on a sloped plate (tilt: the slope, radians) with three periscopes in front.
	function driverHatch(parent, k, [x, y, z], tilt) {
		const c = Math.cos(tilt),
			s = Math.sin(tilt);
		cyl(parent, k.metal, 1.8, 0.6, [x, y, z], { segs: 10, rot: [0, 0, -tilt] });
		for (const dz of [-1.3, 0, 1.3]) box(parent, k.canopy, [0.7, 0.9, 1.1], [x + 2 * c, y - 2 * s + 0.4, z + dz], [0, 0, -tilt], 0.1);
	}
	// Radiator grille facing +X: dark frame with slats.
	function grille(parent, k, [x, y, z], [h, w], n = 6) {
		box(parent, k.black, [0.4, h, w], [x, y, z], null, 0.1);
		for (let i = 0; i < n; i++) box(parent, k.metal, [0.6, (h / n) * 0.45, w - 0.8], [x + 0.2, y - h / 2 + ((i + 0.5) * h) / n, z], null, 0.05);
	}
	// Side mirror on an arm (side: -1 left, 1 right).
	function mirror(parent, k, [x, y, z], side) {
		pipe(parent, k.black, [x, y, z], [x + 0.8, y + 0.8, z + side * 2], 0.15, 4);
		box(parent, k.black, [0.4, 1.8, 1.2], [x + 0.8, y + 1.4, z + side * 2.4], null, 0.1);
	}
	// A bull bar across the front at x, w wide.
	function bullbar(parent, k, x, y, w) {
		for (const z of [-w / 2, w / 2]) pipe(parent, k.steel, [x - 1.5, y - 2, z], [x, y + 2, z], 0.35, 6);
		for (const dy of [2, -0.5]) pipe(parent, k.steel, [x, y + dy, -w / 2], [x, y + dy, w / 2], 0.35, 6);
	}
	// A windscreen facing +X (tilt: raked back, radians): tinted glass in a dark frame, a middle post and
	// two wipers.
	function windscreen(parent, k, [x, y, z], [h, w], tilt = 0) {
		const c = Math.cos(tilt),
			s = Math.sin(tilt),
			rot = [0, 0, tilt];
		box(parent, k.dark, [0.5, h + 0.8, w + 0.8], [x, y, z], rot, 0.2);
		box(parent, k.canopy, [0.4, h, w], [x + 0.2 * c, y + 0.2 * s, z], rot, 0.1);
		box(parent, k.dark, [0.3, h, 0.4], [x + 0.35 * c, y + 0.35 * s, z], rot, 0.05);
		for (const dz of [-w / 4, w / 4]) box(parent, k.black, [0.2, h * 0.55, 0.25], [x + 0.45 * c + h * 0.15 * s, y + 0.45 * s - h * 0.15 * c, z + dz], [0.5, 0, tilt], 0.05);
	}
	// A wheel arch over a tyre: a half ring across the width.
	function arch(parent, k, [x, y, z], r, width) {
		const R = r * 1.22,
			ri = r * 1.08,
			pts = [];
		for (let i = 0; i <= 8; i++) pts.push([n2(Math.cos((i / 8) * Math.PI) * R), n2(Math.sin((i / 8) * Math.PI) * R)]);
		for (let i = 8; i >= 0; i--) pts.push([n2(Math.cos((i / 8) * Math.PI) * ri), n2(Math.sin((i / 8) * Math.PI) * ri)]);
		mesh(parent, profileGeo(pts, width, 0.15), k.dark, [x, y, z]);
	}

	// ---------- infantry ----------
	// weapon: rifle, rocket, flamer, grenade, none (civilians), carbine (saboteurs), tool (technicians).
	function infantry(k, weapon, coat = k.plate) {
		const root = new THREE.Group(),
			body = group(root),
			dom = k.dominion,
			legs = [-1, 1].map((side) => {
				const pivot = group(body, [0, 9.5, side * 2.3]);
				box(pivot, k.dark, [3, 5, 2.6], [0, -2.5, 0], null, 0.5); // thigh
				box(pivot, k.dark, [2.6, 4.6, 2.3], [0, -6.6, 0], null, 0.5); // shin
				box(pivot, k.metal, [2.8, 1.6, 2.5], [0.3, -4.6, 0], null, 0.4); // knee pad
				box(pivot, k.black, [4.4, 1.6, 2.7], [0.6, -8.9, 0], null, 0.4); // boot
				return pivot;
			});
		// Torso: chest armour, belt with pouches, shoulder pads, pack.
		box(body, coat, [4.8, 7, 7], [0, 13.2, 0], null, 1.2);
		box(body, dom ? k.metal : coat, [1.6, 5, 6], [2.3, 13.6, 0], null, 0.6); // chest plate
		box(body, k.black, [5.2, 1.3, 7.3], [0, 10, 0], null, 0.3); // belt
		for (const z of [-2.2, 0, 2.2]) box(body, k.dark, [1.4, 1.8, 1.6], [2.6, 10.2, z], null, 0.3);
		for (const side of [-1, 1]) box(body, dom ? k.team : k.metal, [4, 2, 2.6], [0, 16.3, side * 3.9], [side * 0.25, 0, 0], 0.6); // shoulder pads
		box(body, k.team, [5, 1, 7.2], [0, 15.2, 0], null, 0.3); // team band
		if (weapon !== "flamer") {
			box(body, weapon === "none" ? k.team : k.metal, [3, 5, 5], [-3.6, 13, 0], null, 0.8); // pack
			if (weapon === "rifle") cyl(body, k.black, 0.15, 9, [-4.4, 19.5, 2], { segs: 4 }); // radio whip
		}
		if (weapon === "none" && coat === k.white) box(body, k.glass, [2, 3, 2], [3, 11.5, -3], null, 0.4); // sample case
		// Head: neck, helmet (round for the Colonies, crested and angular for the Dominium), visor.
		cyl(body, k.dark, 1.2, 1.4, [0.2, 17.4, 0], { segs: 8 });
		if (dom) {
			box(body, k.metal, [4.6, 4.2, 4.4], [0.3, 19.6, 0], null, 0.8);
			box(body, k.team, [3.6, 1, 0.8], [0, 22, 0], null, 0.2); // crest
		} else {
			mesh(body, sphereGeo(2.6, 12, 6, true), k.metal, [0.2, 19.2, 0]);
			ball(body, coat === k.white ? k.white : k.dark, 2.1, [0.4, 18.9, 0], [1, 1, 1]);
		}
		box(body, k.glass, [0.8, 1.2, 3.4], [2.5, 19.4, 0], null, 0.2); // visor
		// Arms: upper arms on the body, forearms with the weapon (they kick back with it).
		for (const side of [-1, 1]) box(body, coat, [2, 4.4, 2], [0.6, 13.6, side * 4.3], [0, 0, -0.5], 0.5);
		const gun = group(body, [2.5, 12.8, 1.8]);
		box(gun, coat, [4, 1.8, 1.8], [-0.4, 0, 1.6], null, 0.4);
		box(gun, coat, [4, 1.8, 1.8], [0.4, 0.2, -3], [0, -0.5, 0], 0.4);
		if (weapon === "rocket") {
			cyl(gun, k.dark, 1.3, 14, [1, 3.6, -1.8], { axis: "x", segs: 10 });
			for (const x of [-4.5, 6.8]) cyl(gun, k.team, 1.6, 1.4, [x, 3.6, -1.8], { axis: "x", segs: 10 });
			box(gun, k.black, [2, 1.6, 0.8], [2, 5.4, -1.8], null, 0.2); // sight
		} else if (weapon === "flamer") {
			box(gun, k.black, [9, 1.6, 1.6], [3.5, 0, 0], null, 0.3);
			cyl(gun, k.steel, 0.9, 2, [8.8, 0, 0], { axis: "x", top: 1.2, segs: 8 });
			cyl(gun, k.fire, 0.4, 0.6, [9.9, 0, 0], { axis: "x", segs: 6 });
			for (const z of [-1.7, 1.7]) cyl(body, k.warn, 1.7, 7, [-4.2, 13.4, z], { segs: 10 });
			pipe(body, k.black, [-4.2, 10, 1.7], [2.5, 12, 1.8], 0.35);
		} else if (weapon === "grenade") {
			cyl(gun, k.black, 1.2, 8, [3, 0, 0], { axis: "x", segs: 10 });
			cyl(gun, k.dark, 2, 3, [1, -0.6, 0], { axis: "x", segs: 6 }); // drum
			for (const z of [-2.5, 0, 2.5]) ball(body, k.warn, 1, [2.7, 10.7, z]);
		} else if (weapon === "carbine") {
			box(gun, k.black, [7, 1.4, 1.2], [3, 0, 0], null, 0.25);
			cyl(gun, k.dark, 0.6, 3, [7.5, 0, 0], { axis: "x", segs: 6 }); // suppressor
		} else if (weapon === "tool") {
			box(gun, k.warn, [5, 2, 2], [2, -0.6, 0], null, 0.4);
			cyl(gun, k.steel, 0.5, 3, [5.6, -0.6, 0], { axis: "x", segs: 6 });
		} else if (weapon !== "none") {
			box(gun, k.black, [10, 1.5, 1.3], [4, 0, 0], null, 0.3); // rifle body
			cyl(gun, k.dark, 0.45, 4, [10, 0.2, 0], { axis: "x", segs: 6 }); // barrel
			box(gun, k.dark, [1.4, 2.6, 1], [3.2, -1.6, 0], [0, 0, 0.2], 0.2); // magazine
			box(gun, k.glass, [2.4, 0.9, 0.9], [3.6, 1.2, 0], null, 0.2); // scope
		}
		return {
			root,
			update(e, i) {
				const swing = i.moving ? Math.sin(i.time * 11 + e.id) * 0.6 : 0;
				legs[0].rotation.z = swing;
				legs[1].rotation.z = -swing;
				body.position.y = i.moving ? Math.abs(Math.cos(i.time * 11 + e.id)) * 1.2 : 0;
				body.rotation.z = i.moving ? -0.08 : 0; // leaning into the walk
				gun.position.x = 2.5 - i.recoil * 2.5;
			},
		};
	}

	// ---------- tracked vehicles ----------
	function tank(k) {
		const root = new THREE.Group(),
			body = group(root),
			dom = k.dominion,
			wheels = tracks(body, k, { len: 40, gap: 11.5, h: 9, width: 7, wheels: 5 }),
			odo = odometer(30);
		for (const side of [-1, 1]) {
			box(body, k.dark, [41, 0.6, 8.8], [0, 9.6, side * 11.5], null, 0.2); // fenders
			// Side skirts over the upper run, in plates; stowage bins on the fenders.
			for (let i = 0; i < 4; i++) slab(body, dom ? k.plate : k.metal, [8.6, 3.4, 0.6], [-13.5 + i * 9, 8, side * 15.4]);
			stowage(body, k, [8, 2.4, 3.6], [-10, 11.1, side * 12.6]);
			jerry(body, k, [-20.8, 11.6, side * 9.6]);
		}
		mesh(body, hullGeo(40, 7.5, 16.5, { nose: dom ? 0.3 : 0.28, sharp: dom }), k.plate, [0, 6.2, 0]);
		driverHatch(body, k, [13.6, 11.9, -4.5], 0.4);
		for (let i = 0; i < 3; i++) box(body, k.rubber, [1.5, 0.7, 4.8], [17.6 - i * 1.6, 10.4 + i * 0.66, 4.2], [0, 0, 0.4], 0.15); // spare track links
		towHooks(body, k, 20.3, 7.2, [-5.5, 5.5]);
		towHooks(body, k, -20.4, 8.4, [-5.5, 5.5]);
		box(body, k.dark, [10, 1, 12], [-12, 14, 0], null, 0.3); // engine deck
		for (let i = 0; i < 4; i++) box(body, k.black, [8.5, 0.5, 0.7], [-12, 14.6, -3.6 + i * 2.4], null, 0.1);
		box(body, k.team, [2.5, 0.4, 16.8], [-4.5, 13.8, 0], null, 0.1);
		for (const side of [-1, 1]) box(body, k.team, [14, 1, 0.4], [-6, 11, side * 8.3], null, 0.1);
		lamps(body, k, 18.6, 10.6, [-6.5, 6.5]);
		lamps(body, k, -20.2, 12, [-6.5, 6.5], true);
		for (const z of [-4.5, 4.5]) exhaust(body, k, [-22, 11, z]);
		box(body, k.metal, [6, 1, 1.2], [4, 10.6, 12.5], null, 0.2); // tools on the fender
		const turret = group(body, [2, 13.7, 0]),
			gun = group(turret, [9.5, 3.4, 0]),
			barrel = group(gun);
		mesh(turret, turretGeo(19, 14, 6.4, dom), k.metal, [0, 0, 0]);
		for (const side of [-1, 1]) box(turret, k.team, [7, 1.4, 0.4], [-2, 3.2, side * 7.2], null, 0.1);
		cupola(turret, k, [-3.5, 6.2, -3]);
		box(turret, k.glass, [2, 1.4, 3.4], [5, 6.6, 3.5], null, 0.3); // gunner sight
		if (dom) for (const side of [-1, 1]) box(turret, k.dark, [6, 3, 1], [1, 3, side * 7.3], [0, side * 0.2, 0], 0.3); // cheek plates
		box(turret, k.dark, [5, 3.4, 9], [-11, 3, 0], null, 0.6); // bustle
		// Stowage basket around the bustle: rails and a bedroll.
		for (const z of [-5.4, 5.4]) pipe(turret, k.steel, [-8.6, 5.2, z], [-14.4, 5.2, z], 0.25, 5);
		pipe(turret, k.steel, [-14.4, 5.2, -5.4], [-14.4, 5.2, 5.4], 0.25, 5);
		cyl(turret, k.warn, 1.2, 7, [-12.6, 5.4, -1], { axis: "z", segs: 8 });
		for (const side of [-1, 1]) smokeLaunchers(turret, k, [6, 4.6, side * 6.2], side);
		// Commander's machine gun on the cupola.
		box(turret, k.black, [3, 1.2, 1.2], [-3.5, 9.4, -3], null, 0.2);
		cyl(turret, k.black, 0.25, 5, [0.5, 9.4, -3], { axis: "x", segs: 6 });
		const aerial = antenna(turret, k, [-9, 4.8, 4.5], 16);
		box(gun, k.dark, [4, 4.4, 6.4], [0.5, 0, 0], null, 0.8); // mantlet
		cyl(gun, k.black, 0.3, 4, [3.5, 1.2, -2.4], { axis: "x", segs: 6 }); // coaxial gun
		const tube = group(barrel, [2, 0, 0]);
		cannon(tube, k, 22, 1.15);
		return {
			root,
			update(e, i) {
				turret.rotation.y = -i.aim;
				barrel.position.x = -i.recoil * 6;
				roll(wheels, odo(i));
				body.position.y = i.moving ? Math.sin(i.time * 30 + e.id) * 0.25 : 0;
				sway(aerial, e, i);
			},
		};
	}
	function heavy(k) {
		const root = new THREE.Group(),
			body = group(root),
			dom = k.dominion,
			wheels = tracks(body, k, { len: 52, gap: 15, h: 11, width: 9, wheels: 6 }),
			odo = odometer(24);
		for (const side of [-1, 1]) {
			box(body, k.dark, [53, 1.2, 10.4], [0, 11.6, side * 15], null, 0.4);
			for (let i = 0; i < 5; i++) slab(body, k.metal, [10, 6, 1], [-20 + i * 10.2, 9.4, side * 20.4]); // skirt plates
		}
		mesh(body, hullGeo(52, 9, 22, { nose: 0.26, sharp: dom }), k.plate, [0, 7.5, 0]);
		driverHatch(body, k, [18, 14.4, 0], 0.36);
		for (const side of [-1, 1]) {
			stowage(body, k, [10, 2.6, 4], [-12, 13.5, side * 17]);
			stowage(body, k, [6, 2.6, 4], [4, 13.5, side * 17]);
		}
		towHooks(body, k, 26.2, 9, [-7, 7]);
		towHooks(body, k, -26.3, 10, [-7, 7]);
		box(body, k.dark, [13, 1.2, 16], [-16, 17, 0], null, 0.4);
		for (let i = 0; i < 5; i++) box(body, k.black, [11, 0.5, 0.8], [-16, 17.8, -5.6 + i * 2.8], null, 0.1);
		box(body, k.team, [3, 0.5, 22.2], [-6, 16.7, 0], null, 0.1);
		for (const side of [-1, 1]) box(body, k.team, [18, 1.2, 0.4], [-8, 13.5, side * 11.1], null, 0.1);
		lamps(body, k, 24, 13, [-8, 8]);
		lamps(body, k, -26.2, 14.5, [-8, 8], true);
		for (const z of [-6, 6]) exhaust(body, k, [-28, 13, z]);
		for (let i = 0; i < 3; i++) box(body, k.warn, [4, 2.6, 4], [-24, 18.5, -6 + i * 6], null, 0.4); // rear rack
		const turret = group(body, [2, 16.6, 0]),
			guns = group(turret, [12, 4, 0]),
			barrel = group(guns);
		mesh(turret, turretGeo(26, 20, 8, dom), k.metal, [0, 0, 0]);
		for (const side of [-1, 1]) box(turret, k.team, [9, 1.6, 0.4], [-3, 4, side * 10], null, 0.1);
		for (const side of [-1, 1]) for (let i = 0; i < 3; i++) box(turret, k.dark, [3.6, 3.2, 1.2], [6 - i * 4, 3.8, side * 10.4], null, 0.3); // armour bricks
		cupola(turret, k, [-5, 7.8, -4.5], 3);
		box(turret, k.black, [4, 1.4, 1.4], [-3, 10.6, -4.5], null, 0.2); // roof MG
		cyl(turret, k.black, 0.3, 5, [1.5, 10.6, -4.5], { axis: "x", segs: 6 });
		box(turret, k.glass, [2, 1.6, 4], [6, 8.4, 5], null, 0.3);
		box(turret, k.dark, [6, 4.5, 14], [-14, 4, 0], null, 0.6);
		for (const side of [-1, 1]) smokeLaunchers(turret, k, [9, 5.8, side * 8.4], side);
		for (const z of [-4.5, 0, 4.5]) jerry(turret, k, [-17.6, 4.4, z]);
		const aerial = antenna(turret, k, [-12, 6.4, 6], 20);
		box(guns, k.dark, [5, 5.6, 13], [0.5, 0, 0], null, 0.9);
		for (const z of [-4, 4]) {
			const t = group(barrel, [2.5, 0, z]);
			cannon(t, k, 26, 1.35, { brake: z > 0 || dom });
		}
		return {
			root,
			update(e, i) {
				turret.rotation.y = -i.aim;
				barrel.position.x = -i.recoil * 8;
				roll(wheels, odo(i));
				body.position.y = i.moving ? Math.sin(i.time * 24 + e.id) * 0.3 : 0;
				sway(aerial, e, i);
			},
		};
	}
	function artillery(k) {
		const root = new THREE.Group(),
			body = group(root),
			wheels = tracks(body, k, { len: 42, gap: 12, h: 9, width: 7, wheels: 5 }),
			odo = odometer(26);
		for (const side of [-1, 1]) box(body, k.dark, [43, 1, 8.6], [0, 9.6, side * 12], null, 0.3);
		mesh(body, hullGeo(42, 7, 17, { nose: 0.2, sharp: k.dominion }), k.plate, [0, 6.2, 0]);
		box(body, k.team, [2.5, 0.4, 17.2], [12, 13.3, 0], null, 0.1);
		lamps(body, k, 20.6, 10.4, [-6, 6]);
		lamps(body, k, -21.2, 11.5, [-6, 6], true);
		// Spades folded at the rear, ammunition crates on the deck.
		for (const side of [-1, 1]) {
			pipe(body, k.dark, [-18, 8, side * 7], [-24, 3, side * 7], 0.8);
			box(body, k.dark, [1.2, 5, 5], [-24.5, 2.5, side * 7], [0, 0, 0.3], 0.3);
		}
		for (let i = 0; i < 3; i++) box(body, k.warn, [3.2, 2.4, 4.6], [12, 14.4, -5.5 + i * 5.5], null, 0.3);
		driverHatch(body, k, [17, 11.3, 0], 0.5);
		for (const side of [-1, 1]) stowage(body, k, [9, 2.4, 3.4], [2, 11.2, side * 13]);
		towHooks(body, k, 21.3, 7.2, [-5.5, 5.5]);
		// Shells racked on the deck behind the turret.
		for (let i = 0; i < 5; i++) cyl(body, k.warn, 0.8, 4, [-17, 14, -4 + i * 2], { axis: "x", segs: 8, top: 0.5 });
		const turret = group(body, [-3, 13.2, 0]),
			gun = group(turret, [5, 6, 0]),
			barrel = group(gun);
		gun.rotation.z = 0.42;
		mesh(turret, turretGeo(20, 16, 7, true), k.metal, [0, 0, 0]);
		box(turret, k.warn, [16, 1, 0.4], [-1, 5.5, 7.6], null, 0.1);
		box(turret, k.warn, [16, 1, 0.4], [-1, 5.5, -7.6], null, 0.1);
		box(gun, k.dark, [7, 4.6, 6], [0, 0, 0], null, 0.8);
		for (const z of [-2.2, 2.2]) cyl(gun, k.steel, 0.7, 10, [4, 2.8, z], { axis: "x", segs: 6 }); // recoil cylinders
		const tube = group(barrel, [3, 0, 0]);
		cannon(tube, k, 40, 1.5);
		const aerial = antenna(turret, k, [-8, 7, -6], 14);
		for (const side of [-1, 1]) smokeLaunchers(turret, k, [6, 4.6, side * 7], side);
		box(turret, k.dark, [4, 3, 5], [-6, 8.2, 4], null, 0.5); // fire-control box
		box(turret, k.canopy, [0.4, 1.4, 3], [-3.9, 8.4, 4], null, 0.1);
		return {
			root,
			update(e, i) {
				turret.rotation.y = -i.aim;
				barrel.position.x = -i.recoil * 10;
				roll(wheels, odo(i));
				body.position.y = i.moving ? Math.sin(i.time * 28 + e.id) * 0.25 : 0;
				sway(aerial, e, i);
			},
		};
	}
	function destroyer(k) {
		const root = new THREE.Group(),
			body = group(root),
			wheels = tracks(body, k, { len: 44, gap: 13, h: 9, width: 7.5, wheels: 5 }),
			odo = odometer(28);
		for (const side of [-1, 1]) {
			box(body, k.dark, [45, 1, 9.4], [0, 9.6, side * 13], null, 0.3);
			for (let i = 0; i < 4; i++) slab(body, k.plate, [10.5, 5, 0.9], [-16 + i * 10.8, 7.6, side * 17.4]);
		}
		// Low casemate: the whole upper hull is one sloped wedge, the gun in its front plate.
		mesh(body, profileGeo([[-22, 0], [18, 0], [23, 4], [6, 12], [-18, 12], [-22, 8]], 22, 0.7), k.plate, [0, 6, 0]);
		box(body, k.team, [3, 0.4, 20], [-10, 18.1, 0], null, 0.1);
		for (const side of [-1, 1]) box(body, k.team, [16, 1, 0.4], [-6, 13, side * 11], null, 0.1);
		cupola(body, k, [-4, 18, -5]);
		box(body, k.glass, [2, 1.4, 3], [3, 18.6, 5], null, 0.3);
		for (const side of [-1, 1]) {
			smokeLaunchers(body, k, [4, 19.4, side * 9], side);
			stowage(body, k, [10, 2.4, 3.6], [-12, 11.4, side * 15]);
		}
		for (const z of [-4, 0, 4]) jerry(body, k, [-19, 19.4, z]);
		towHooks(body, k, 23.2, 8, [-6, 6]);
		towHooks(body, k, -22.4, 9, [-6, 6]);
		for (let i = 0; i < 3; i++) box(body, k.rubber, [1.5, 0.7, 5], [-8 - i * 1.7, 18.4, 4], null, 0.15); // spare track links
		lamps(body, k, 22, 10.4, [-8, 8]);
		lamps(body, k, -22.2, 12.6, [-7, 7], true);
		for (const z of [-5, 5]) exhaust(body, k, [-24, 13, z]);
		const aerial = antenna(body, k, [-14, 18, 7], 16);
		const gun = group(body, [16, 13, 0]),
			barrel = group(gun);
		ball(gun, k.dark, 3.4, [0, 0, 0], [1, 1, 1]); // ball mantlet
		const tube = group(barrel, [1.5, 0, 0]);
		cannon(tube, k, 32, 1.3);
		return {
			root,
			update(e, i) {
				// The casemate gun traverses only a little; the hull does the rest.
				gun.rotation.y = -Math.max(-0.3, Math.min(0.3, Math.atan2(Math.sin(i.aim), Math.cos(i.aim))));
				barrel.position.x = -i.recoil * 7;
				roll(wheels, odo(i));
				body.position.y = i.moving ? Math.sin(i.time * 30 + e.id) * 0.25 : 0;
				sway(aerial, e, i);
			},
		};
	}

	// ---------- wheeled vehicles ----------
	function skyguard(k) {
		const root = new THREE.Group(),
			body = group(root),
			wheels = wheelSet(body, k, [-12, 0, 12], 11, 4.6),
			odo = odometer(34);
		mesh(body, hullGeo(38, 8, 17, { nose: 0.25, sharp: k.dominion }), k.plate, [0, 6.5, 0]);
		box(body, k.team, [2.5, 0.4, 17.2], [-12, 14.6, 0], null, 0.1);
		lamps(body, k, 18.6, 10, [-6, 6]);
		lamps(body, k, -19.2, 11.5, [-6, 6], true);
		for (const side of [-1, 1]) {
			box(body, k.canopy, [3, 1.6, 0.4], [9, 12.4, side * 8.4], null, 0.1);
			mirror(body, k, [13, 12.4, side * 8.4], side);
			stowage(body, k, [8, 2.4, 2.4], [-3, 10, side * 9.6]);
		}
		windscreen(body, k, [12.6, 13.1, 0], [2.6, 11], 1.09);
		grille(body, k, [19.2, 8.6, 0], [2.6, 10]);
		bullbar(body, k, 20.6, 9, 13);
		towHooks(body, k, -19.4, 8, [-5, 5]);
		const turret = group(body, [3, 14.5, 0]),
			guns = group(turret, [2, 5, 0]),
			barrel = group(guns);
		cyl(turret, k.metal, 6, 5, [0, 2.5, 0], { top: 5.2, segs: 6 });
		guns.rotation.z = 0.7;
		for (const z of [-4.2, 4.2]) {
			box(guns, k.dark, [6, 3.2, 2.4], [1, 0, z], null, 0.4);
			const t = group(barrel, [3, 0, z]);
			cannon(t, k, 16, 0.8, { sleeve: false, brake: false });
			cyl(t, k.black, 1.1, 1.5, [16.5, 0, 0], { axis: "x", segs: 8 });
		}
		box(turret, k.lamp, [1, 2, 2.4], [5.8, 3.8, 0], null, 0.3); // searchlight
		const radar = group(body, [-12, 14.5, 0]);
		cyl(radar, k.metal, 0.8, 7, [0, 3.5, 0], { segs: 6 });
		box(radar, k.dark, [1.4, 5.6, 13], [0, 8.4, 0], [0, 0, 0.2], 0.4);
		for (let i = -2; i <= 2; i++) box(radar, k.glass, [0.4, 4, 1], [0.7, 8.4, i * 2.4], [0, 0, 0.2], 0.1);
		return {
			root,
			update(e, i) {
				turret.rotation.y = -i.aim;
				barrel.position.x = -i.recoil * 4;
				radar.rotation.y = i.time * 2.5;
				roll(wheels, odo(i));
			},
		};
	}
	function raider(k) {
		const root = new THREE.Group(),
			body = group(root),
			odo = odometer(48),
			wheels = [];
		// Open buggy: tube frame, big tyres on struts, wedge nose, roll cage, pintle gun.
		for (const x of [-9, 9])
			for (const side of [-1, 1]) {
				wheels.push(wheel(body, k, [x, 5.2, side * 10.5], 5.2, 4.4, { spokes: true }));
				pipe(body, k.steel, [x * 0.7, 8, side * 4], [x, 5.2, side * 8.4], 0.6);
			}
		box(body, k.dark, [24, 2.4, 10], [0, 7.4, 0], null, 0.5);
		mesh(body, profileGeo([[-6, 0], [9, 0], [13, 2], [6, 5], [-6, 5]], 11, 0.5), k.plate, [2, 8.5, 0]);
		box(body, k.team, [7, 4.8, 11.2], [-7, 10.8, 0], null, 0.5);
		lamps(body, k, 14.6, 10.5, [-3.5, 3.5]);
		for (const z of [-5, 5]) {
			pipe(body, k.black, [3, 9.8, z], [-1, 18, z * 0.8], 0.45);
			pipe(body, k.black, [-8, 9.8, z], [-5, 18, z * 0.8], 0.45);
		}
		pipe(body, k.black, [-1, 18, -4], [-1, 18, 4], 0.45);
		pipe(body, k.black, [-5, 18, -4], [-5, 18, 4], 0.45);
		box(body, k.black, [3, 3, 3], [-2, 12, -2.5], null, 0.6); // seat
		cyl(body, k.rubber, 3.6, 2.4, [-12.5, 11.5, 0], { axis: "x", segs: 12 }); // spare tyre
		cyl(body, k.hub, 2.2, 2.6, [-12.5, 11.5, 0], { axis: "x", segs: 8 });
		windscreen(body, k, [5.5, 15, 0], [3, 8], 0.45);
		lamps(body, k, -0.6, 19.2, [-2.2, 2.2]); // light bar on the cage
		for (const z of [-3, 3]) pipe(body, k.steel, [-10, 8, z], [-13.5, 7, z * 1.3], 0.5, 6); // exhausts
		for (const side of [-1, 1]) jerry(body, k, [-9.5, 11.6, side * 4]);
		const turret = group(body, [-3, 18.5, 0]),
			barrel = group(turret);
		cyl(turret, k.steel, 0.7, 3, [0, 1, 0], { segs: 6 });
		box(barrel, k.black, [5, 2, 2], [1.5, 2.8, 0], null, 0.3);
		cyl(barrel, k.black, 0.4, 9, [7.5, 2.8, 0], { axis: "x", segs: 6 });
		box(barrel, k.metal, [0.5, 2.6, 3], [1, 4, 0], null, 0.1); // shield
		return {
			root,
			update(e, i) {
				turret.rotation.y = -i.aim;
				barrel.position.x = -i.recoil * 3;
				roll(wheels, odo(i));
				body.rotation.x = i.moving ? Math.sin(i.time * 17 + e.id) * 0.035 : 0;
				body.position.y = i.moving ? Math.abs(Math.sin(i.time * 13 + e.id)) * 0.5 : 0;
			},
		};
	}
	function transport(k) {
		const root = new THREE.Group(),
			body = group(root),
			dom = k.dominion,
			wheels = wheelSet(body, k, [-13, 0, 13], 12, 5.4),
			odo = odometer(32);
		mesh(body, profileGeo(dom ? [[-22, 0], [16, 0], [23, 6], [10, 14], [-22, 14]] : [[-22, 0], [18, 0], [23, 5], [20, 12], [14, 14], [-20, 14], [-22, 12]], 22, 0.9), k.plate, [0, 6, 0]);
		box(body, k.team, [44, 1.6, 22.4], [0, 16.5, 0], null, 0.2);
		for (const side of [-1, 1]) {
			box(body, k.dark, [9, 9, 0.6], [-4, 13, side * 11.2], null, 0.3); // side door
			for (const x of [-14, 6, 12]) box(body, k.canopy, [2.4, 1.2, 0.4], [x, 16.8, side * 11.4], null, 0.1); // vision slits
		}
		windscreen(body, k, [dom ? 16.2 : 20.4, 18.3, 0], [2.8, 11], dom ? 0.6 : 0.25);
		for (const side of [-1, 1]) {
			for (const x of [-15, -4, 7]) slab(body, k.metal, [9.6, 6, 0.6], [x, 10, side * 11.4]); // add-on armour
			mirror(body, k, [17, 17, side * 11], side);
			box(body, k.black, [0.4, 0.8, 3], [-23.4, 14, side * 4.5], null, 0.1); // door handles
			jerry(body, k, [-23.6, 9, side * 9.5]);
		}
		for (const z of [-7, 7]) pipe(body, k.steel, [-18, 20.8, z], [8, 20.8, z], 0.3, 5); // roof rails
		stowage(body, k, [8, 2, 8], [-13, 21.4, 2]);
		grille(body, k, dom ? [20.6, 9.8, 0] : [22.4, 12.6, 0], [3.4, 12]);
		towHooks(body, k, 23.1, 7.5, [-6, 6]);
		smokeLaunchers(body, k, [14, 21, -8], -1);
		smokeLaunchers(body, k, [14, 21, 8], 1);
		box(body, k.dark, [2, 11, 15], [-22.5, 12, 0], null, 0.5); // rear ramp
		lamps(body, k, 22.4, 11, [-8, 8]);
		lamps(body, k, -23.6, 15, [-8, 8], true);
		cyl(body, k.metal, 2.5, 0.6, [-10, 20.3, -5], { segs: 10 }); // roof hatch
		const aerial = antenna(body, k, [-18, 20, 8], 16);
		const turret = group(body, [-2, 20, 0]),
			barrel = group(turret);
		cyl(turret, k.metal, 4, 3, [0, 1.5, 0], { top: 3.4, segs: dom ? 6 : 12 });
		box(barrel, k.black, [5, 1.6, 2.4], [3, 2.4, 0], null, 0.3);
		cyl(barrel, k.black, 0.5, 9, [9, 2.4, 0], { axis: "x", segs: 6 });
		return {
			root,
			update(e, i) {
				turret.rotation.y = -i.aim;
				barrel.position.x = -i.recoil * 3;
				roll(wheels, odo(i));
				sway(aerial, e, i);
			},
		};
	}
	function hauler(k) {
		const root = new THREE.Group(),
			body = group(root),
			wheels = wheelSet(body, k, [-15, -5, 14], 11, 5),
			odo = odometer(30);
		box(body, k.dark, [46, 3.2, 14], [0, 8.6, 0], null, 0.5); // chassis
		box(body, k.plate, [11, 11, 18], [15, 16, 0], null, 1.4); // cab
		windscreen(body, k, [20.6, 18.4, 0], [4.4, 14], 0.18);
		grille(body, k, [20.6, 13, 0], [4, 12], 7);
		box(body, k.steel, [1.6, 2.4, 19], [21.4, 9.6, 0], null, 0.4); // bumper
		for (const side of [-1, 1]) {
			box(body, k.canopy, [5, 3.4, 0.4], [15.5, 18.6, side * 9.1], null, 0.1);
			box(body, k.dark, [0.4, 8, 0.4], [12.8, 16, side * 9.1], null, 0.05); // door line
			mirror(body, k, [20, 18, side * 9], side);
			cyl(body, k.metal, 1.9, 6, [4.5, 9, side * 8.4], { axis: "x", segs: 10 }); // fuel tanks
			box(body, k.black, [3, 0.5, 2], [11, 7.2, side * 9.6], null, 0.1); // step
		}
		box(body, k.team, [11.2, 1.6, 18.2], [15, 22, 0], null, 0.2);
		box(body, k.warn, [1.4, 1, 10], [15, 23, 0], null, 0.2); // roof beacon bar
		for (const z of [-3.5, 0, 3.5]) box(body, k.lamp, [1, 0.8, 1.6], [15.8, 23.1, z], null, 0.2);
		lamps(body, k, 20.8, 12.5, [-6.5, 6.5]);
		for (const z of [-7, 7]) pipe(body, k.steel, [9.5, 12, z * 1.25], [9.5, 25, z * 1.25], 0.7); // stacks
		// Cradle holding the energy core, with hazard stripes.
		for (const x of [-18, -8, 2]) {
			box(body, k.metal, [2, 13, 3], [x, 16, -7], null, 0.4);
			box(body, k.metal, [2, 13, 3], [x, 16, 7], null, 0.4);
			box(body, k.metal, [2, 2, 17], [x, 23, 0], null, 0.4);
		}
		for (let i = 0; i < 6; i++) box(body, i % 2 ? k.black : k.warn, [3.4, 0.6, 14.4], [-20 + i * 3.6 + 4, 10.4, 0], null, 0.1);
		const core = group(body, [-8, 17, 0]);
		cyl(core, k.energy, 5.2, 18, [0, 0, 0], { axis: "x", segs: 10 });
		for (const x of [-6, 0, 6]) mesh(core, torusGeo(5.6, 0.6, 14, "x"), k.metal, [x, 0, 0]);
		return {
			root,
			update(e, i) {
				roll(wheels, odo(i));
				core.rotation.x = i.time * 1.5;
			},
		};
	}
	function serviceRover(k) {
		const root = new THREE.Group(),
			body = group(root),
			wheels = wheelSet(body, k, [-9, 9], 10, 4.8),
			odo = odometer(34);
		mesh(body, hullGeo(28, 8, 15, { nose: 0.2 }), k.plate, [0, 6.6, 0]);
		box(body, k.team, [5, 8.2, 15.2], [-9, 10.7, 0], null, 0.5);
		windscreen(body, k, [12.8, 12.2, 0], [2.6, 10], 0.5);
		bullbar(body, k, 15.6, 8.5, 11);
		for (const side of [-1, 1]) mirror(body, k, [11, 12.5, side * 7.5], side);
		cyl(body, k.warn, 1.5, 6, [-9, 15.8, 0], { axis: "z", segs: 10 }); // cable reel
		cyl(body, k.dark, 1.8, 5.4, [-9, 15.8, 0], { axis: "z", segs: 10 });
		towHooks(body, k, -14.2, 8, [-4, 4]);
		lamps(body, k, 14.2, 9.5, [-5, 5]);
		box(body, k.warn, [2, 1.2, 4], [4, 15.2, -4], null, 0.3); // beacon
		for (const side of [-1, 1]) box(body, k.dark, [6, 3, 2], [-2, 9, side * 8.6], null, 0.4); // toolboxes
		const arm = group(body, [2, 14.6, 0]);
		cyl(arm, k.dark, 2.6, 2, [0, 1, 0], { segs: 10 });
		cyl(arm, k.warn, 1.2, 16, [0, 9, 0], { segs: 8 });
		const boom = group(arm, [0, 17, 0]);
		box(boom, k.warn, [16, 1.8, 1.8], [8, 0, 0], null, 0.3);
		pipe(boom, k.steel, [0, -1.5, 0.8], [10, -0.8, 0.8], 0.35); // hydraulic ram
		box(boom, k.black, [2.6, 4, 2.6], [16, -2.5, 0], null, 0.4);
		cyl(boom, k.steel, 0.4, 3, [16, -5.6, 0], { segs: 6 });
		return {
			root,
			update(e, i) {
				roll(wheels, odo(i));
				const working = e.order?.kind === "repair" && !i.moving;
				arm.rotation.y = working ? Math.sin(i.time * 1.5) * 0.8 : 0;
				boom.rotation.z = working ? -0.3 + Math.sin(i.time * 3) * 0.15 : 0.35;
			},
		};
	}
	// Harvester: four tyres, a cab, a hopper (shown while it carries ore), a drill arm in front.
	function worker(k) {
		const root = new THREE.Group(),
			body = group(root),
			wheels = wheelSet(body, k, [-7, 7], 8, 3.6, 4),
			odo = odometer(36);
		box(body, k.dark, [22, 3, 11], [0, 6, 0], null, 0.5);
		box(body, k.plate, [12, 6, 13], [-3, 10.5, 0], null, 1);
		box(body, k.team, [3, 6.2, 13.2], [3.5, 10.5, 0], null, 0.5);
		box(body, k.metal, [6, 6, 9], [6, 15, 0], null, 0.9); // cab
		windscreen(body, k, [9.1, 16, 0], [2.6, 7], 0.05);
		for (const side of [-1, 1]) {
			box(body, k.canopy, [3, 2.2, 0.4], [6, 16, side * 4.6], null, 0.1);
			mirror(body, k, [8.6, 16.5, side * 4.6], side);
		}
		grille(body, k, [11.1, 6.2, 0], [2.4, 8], 4);
		pipe(body, k.steel, [3, 13.5, -4], [3, 20, -4], 0.5, 6); // exhaust stack
		box(body, k.warn, [1.4, 0.8, 1.4], [5, 18.6, 3], null, 0.2); // beacon
		lamps(body, k, 11, 8.5, [-4, 4]);
		// Hopper: an open bin with flared walls, a reinforced rim, ribs and a tipping hinge at the back,
		// always there; the load inside rises with the cargo — grey lumps of ore with a metal sheen, or
		// golden crystal shards (keep: the renderer shows and scales them, they are never merged).
		const bin = group(body, [-5, 13.5, 0]);
		box(bin, k.black, [10, 0.6, 10], [0, 0.3, 0], null, 0.2); // floor
		for (const side of [-1, 1]) {
			box(bin, k.warn, [12, 5, 0.6], [0, 2.6, side * 5.5], [side * 0.2, 0, 0], 0.2);
			box(bin, k.warn, [0.6, 5, 12], [side * 5.5, 2.6, 0], [0, 0, -side * 0.2], 0.2);
			box(bin, k.dark, [13, 0.7, 0.9], [0, 5.1, side * 6], null, 0.2); // rim
			box(bin, k.dark, [0.9, 0.7, 13], [side * 6, 5.1, 0], null, 0.2);
			for (const x of [-3.5, 3.5]) box(bin, k.dark, [0.6, 4.6, 0.5], [x, 2.5, side * 5.95], [side * 0.2, 0, 0], 0.1); // ribs
		}
		cyl(bin, k.steel, 0.6, 12, [-6, 0.4, 0], { axis: "z", segs: 8 }); // hinge
		const pile = { ore: ball(bin, k.metal, 1, [0, 1, 0], [4.8, 1, 4.8]), crystal: ball(bin, k.warn, 1, [0, 1, 0], [4.8, 1, 4.8]) },
			lumps = { ore: [], crystal: [] };
		for (let n = 0; n < 7; n++) {
			const a = n * 2.4,
				d = n ? 2.6 : 0,
				x = Math.cos(a) * d,
				z = Math.sin(a) * d;
			const lump = mesh(bin, cached("lump", () => new THREE.IcosahedronGeometry(1, 0)), n % 3 ? k.metal : k.steel, [x, 0, z], [a, a * 0.7, 0]),
				r = 1.5 + (n % 3) * 0.25;
			lump.scale.set(r, r * 0.75, r * 1.1);
			lumps.ore.push(lump);
			const shard = mesh(bin, cylGeo(0.05, 0.9, 3, 6), k.crystal, [x, 0, z], [Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4]);
			lumps.crystal.push(shard);
		}
		for (const m of [pile.ore, pile.crystal, ...lumps.ore, ...lumps.crystal]) m.userData.keep = true;
		const arm = group(body, [9, 9, 3.5]);
		box(arm, k.dark, [9, 2, 2], [4.5, 0, 0], null, 0.4);
		pipe(arm, k.steel, [0, -1.4, 0], [6, -1, 0], 0.4);
		const drill = group(arm, [9.5, -1, 0]);
		mesh(drill, cylGeo(0.3, 2.2, 5, 8, "x"), k.metal, [2.5, 0, 0]);
		return {
			root,
			update(e, i) {
				// The load: a mound rising with the cargo (capacity 30), lumps or shards appearing on it.
				const fill = Math.min(1, (e.cargo || 0) / 30),
					kind = e.cargoKind === "crystal" ? "crystal" : "ore",
					top = 0.6 + fill * 3.8;
				for (const key of ["ore", "crystal"]) {
					const on = key === kind && fill > 0;
					pile[key].visible = on;
					pile[key].scale.y = 0.3 + fill * 2.6;
					pile[key].position.y = 0.6 + fill * 1.2;
					lumps[key].forEach((m, n) => {
						m.visible = on && n < Math.ceil(fill * 7);
						m.position.y = top - (n ? 0.5 : 0) + (key === "crystal" ? 1 : 0);
					});
				}
				const gathering = e.order?.kind === "gather" && !i.moving;
				arm.rotation.z = gathering ? Math.sin(i.time * 8 + e.id) * 0.4 - 0.4 : 0.15;
				drill.rotation.x = gathering ? i.time * 20 : 0;
				roll(wheels, odo(i));
			},
		};
	}
	// Dominium bastion: a two-legged walker with knees, an armoured cockpit and shoulder cannons.
	function sentinel(k) {
		const root = new THREE.Group(),
			hips = group(root, [0, 19, 0]),
			legs = [-1, 1].map((side) => {
				const leg = group(hips, [0, 0, side * 8]);
				box(leg, k.dark, [5, 10, 4], [1, -5, 0], [0, 0, -0.2], 0.8); // thigh
				cyl(leg, k.steel, 2.2, 5, [2, -10, 0], { axis: "z", segs: 10 }); // knee
				box(leg, k.metal, [4, 9, 3.6], [0.5, -14, 0], [0, 0, 0.15], 0.7); // shin
				box(leg, k.black, [10, 2, 6.4], [1, -18.2, 0], null, 0.6); // foot
				box(leg, k.black, [3, 1.6, 5], [6, -18.6, 0], [0, 0, -0.3], 0.3); // toe
				pipe(leg, k.steel, [-1.5, -3, 0], [-1, -14, 0], 0.5); // piston
				return leg;
			}),
			torso = group(hips, [0, 3, 0]);
		box(hips, k.dark, [8, 4, 14], [0, 0, 0], null, 0.8);
		mesh(torso, profileGeo([[-9, 0], [7, 0], [11, 4], [6, 11], [-8, 11], [-10, 6]], 18, 0.9), k.plate, [0, 0, 0]);
		box(torso, k.team, [16, 1.2, 18.4], [-1, 8, 0], null, 0.2);
		box(torso, k.glass, [0.6, 2.4, 9], [8.6, 7.4, 0], [0, 0, 0.7], 0.2);
		for (const side of [-1, 1]) box(torso, k.metal, [8, 3, 4], [-2, 12, side * 9], [side * 0.25, 0, 0], 0.6); // shoulder armour
		const aerial = antenna(torso, k, [-6, 11, 5], 14);
		const guns = [-1, 1].map((side) => {
			const g = group(torso, [2, 10, side * 11.5]);
			box(g, k.dark, [7, 4, 4], [0, 0, 0], null, 0.6);
			const t = group(g, [3, 0, 0]);
			cannon(t, k, 18, 1.1, { sleeve: true });
			return t;
		});
		return {
			root,
			update(e, i) {
				const s = i.moving ? Math.sin(i.time * 6 + e.id) * 0.45 : 0;
				legs[0].rotation.z = s;
				legs[1].rotation.z = -s;
				hips.position.y = 19 + (i.moving ? Math.abs(Math.sin(i.time * 6 + e.id)) * 1.5 : 0);
				torso.rotation.y = -i.aim;
				for (const g of guns) g.position.x = 3 - i.recoil * 5;
				sway(aerial, e, i);
			},
		};
	}

	// ---------- aircraft (the renderer lifts them; here the airframe, bank and rotors) ----------
	// A fuselage through rings along X: [x, half width, half height, y offset] stations (round for the
	// Colonies, 6-sided and angular for the Dominium).
	function fuselage(key, stations, sides = 12) {
		return loftGeo(
			"fu" + key + sides,
			stations.map(([x, w, h, dy = 0]) =>
				Array.from({ length: sides }, (_, i) => {
					const a = (i / sides) * Math.PI * 2 + (sides === 6 ? Math.PI / 6 : 0);
					return [n2(x), n2(Math.sin(a) * h + dy), n2(Math.cos(a) * w)];
				}),
			),
		);
	}
	// A wing (or tailplane) through airfoil sections: [leading edge x, chord, thickness, z, y]; rounded
	// leading edge, thin trailing edge, thicker on top. Mirror it with side -1.
	function wingGeo(key, sections, side = 1) {
		return loftGeo(
			"wi" + key + side,
			sections.map(([x, c, t, z, y]) =>
				[
					[0, 0],
					[0.06, 0.42],
					[0.3, 0.55],
					[0.7, 0.3],
					[1, 0],
					[0.7, -0.12],
					[0.3, -0.3],
					[0.06, -0.26],
				].map(([u, v]) => [n2(x - u * c), n2(y + v * t), n2(z * side)]),
			),
		);
	}
	// A jet engine along X with its front at x: intake lip, dark fan, the pod, a steel nozzle and the
	// glow of the exhaust inside.
	function jet(parent, k, [x, y, z], r, len, key) {
		mesh(parent, fuselage("jet" + key, [[x - len, r * 0.8, r * 0.8], [x - len * 0.75, r, r], [x - len * 0.2, r * 1.05, r * 1.05], [x, r * 0.95, r * 0.95]]), k.plate, [0, y, z]);
		mesh(parent, torusGeo(r * 0.92, r * 0.16, 14, "x"), k.metal, [x, y, z]);
		cyl(parent, k.black, r * 0.8, 0.3, [x - 0.3, y, z], { axis: "x", segs: 12 });
		cyl(parent, k.steel, r * 0.25, 0.8, [x, y, z], { axis: "x", segs: 8, top: 0.05 }); // spinner
		mesh(parent, shellGeo([[r * 0.85, 0], [r * 0.75, r * 0.9], [r * 0.62, r * 1.3]], r * 0.15, 12), k.steel, [x - len, y, z], [0, 0, Math.PI / 2]);
		cyl(parent, k.fire, r * 0.55, 0.3, [x - len - 0.4, y, z], { axis: "x", segs: 10 });
	}
	// A missile on a pylon under a wing: body, nose, fins.
	function missile(parent, k, [x, y, z], len) {
		box(parent, k.dark, [len * 0.5, 0.9, 0.4], [x, y + 0.6, z], null, 0.1); // pylon
		cyl(parent, k.white, 0.5, len, [x, y - 0.2, z], { axis: "x", segs: 8 });
		cyl(parent, k.red, 0.02, 1.4, [x + len / 2 + 0.7, y - 0.2, z], { axis: "x", segs: 8, top: 0.5 });
		box(parent, k.dark, [1.4, 2, 0.12], [x - len / 2 + 0.7, y - 0.2, z], null, 0.04);
		box(parent, k.dark, [1.4, 0.12, 2], [x - len / 2 + 0.7, y - 0.2, z], null, 0.04);
	}
	// Navigation lights: red on the left tip (-Z), green on the right (+Z), a white strobe (returned, it
	// blinks) at the tail.
	function navLights(parent, k, [x, y, z], tail) {
		box(parent, k.navRed, [1, 0.8, 0.8], [x, y, -z], null, 0.2);
		box(parent, k.navGreen, [1, 0.8, 0.8], [x, y, z], null, 0.2);
		return box(parent, k.strobe, [0.9, 0.9, 0.9], tail, null, 0.2);
	}
	// A canopy: tinted glass bubble with a frame arch across it.
	function canopy(parent, k, [x, y, z], [l, h, w], sides) {
		ball(parent, k.canopy, 1, [x, y, z], [l, h, w]);
		const arch = mesh(parent, torusGeo(1, 0.1, sides === 6 ? 6 : 14, "x"), k.dark, [x - l * 0.3, y, z]);
		arch.scale.set(1, h * 0.96, w * 0.96);
	}
	function interceptor(k) {
		const root = new THREE.Group(),
			frame = group(root),
			dom = k.dominion,
			sides = dom ? 6 : 12;
		mesh(
			frame,
			fuselage(
				"int",
				[[-17, 2.4, 2.4], [-13, 3.4, 3], [-5, 3.8, 3.4, 0.2], [3, 3.4, 3.4, 0.4], [9, 2.4, 2.8, 0.3], [14, 1.6, 1.9, 0.1], [18, 0.9, 1.1]],
				sides,
			),
			k.plate,
		);
		cyl(frame, k.dark, 0.9, 5.5, [20.7, 0, 0], { axis: "x", top: 0.08, segs: sides }); // radome
		pipe(frame, k.steel, [23, 0, 0], [26, 0, 0], 0.12, 5); // pitot
		canopy(frame, k, [8.5, 2.5, 0], [4.2, 1.6, 1.6], sides);
		// Wings: a cropped delta (Colonies), a sharp delta with canards (Dominium).
		const wing = dom
			? [[6, 18, 1.4, 2, 0], [-6, 7, 0.8, 11, -0.3], [-12.5, 2, 0.4, 18, -0.7]]
			: [[5, 16, 1.4, 2, 0], [-4, 8.5, 0.9, 11, -0.3], [-9.5, 4.5, 0.45, 18, -0.6]];
		for (const z of [-1, 1]) {
			mesh(frame, wingGeo("int" + dom, wing, z), k.plate);
			mesh(frame, wingGeo("intTail" + dom, [[-11, 6, 0.6, 2, 0], [-15, 3, 0.3, 8, -0.2]], z), k.plate); // tailplane
			if (dom) mesh(frame, wingGeo("intCanard", [[12, 4, 0.4, 2, 1], [10, 1.5, 0.2, 6, 1.2]], z), k.plate);
			// Intakes along the sides: a duct with a dark mouth.
			box(frame, k.plate, [8, 2.6, 1.8], [1, -0.3, z * 3.7], null, 0.5);
			box(frame, k.black, [0.6, 2, 1.3], [5, -0.3, z * 3.8], null, 0.1);
			// Twin fins, canted out.
			mesh(frame, profileGeo([[-17.5, 0], [-9, 0], [-14.5, 8], [-17.5, 8.5]], 0.6, 0.15), k.plate, [0, 1.8, z * 2.4], [z * 0.32, 0, 0]);
			box(frame, k.team, [3, 2.2, 0.75], [-15, 6, z * 3.8], [z * 0.32, 0, 0], 0.1);
			box(frame, k.team, [4, 0.3, 3.2], [-7.5, 0.25, z * 13], null, 0.1); // wing band
			missile(frame, k, [-5, -1.1, z * 9.5], 6);
			missile(frame, k, [-8, -0.9, z * 15], 5);
		}
		box(frame, k.dark, [6, 0.4, 1.6], [-2, -3.3, 0], null, 0.15); // belly panel
		pipe(frame, k.dark, [-2, 3.4, 0], [-4, 5.3, 0], 0.12, 5); // antenna
		cyl(frame, k.metal, 0.35, 2, [13, 0.6, 1.4], { axis: "x", segs: 6 }); // gun port
		// Engine: a ribbed nozzle with the afterburner glowing inside.
		cyl(frame, k.dark, 2.2, 2, [-17.5, 0, 0], { axis: "x", top: 2.4, segs: sides });
		mesh(frame, shellGeo([[2.1, 0], [1.9, 2.2], [1.6, 3.2]], 0.3, sides === 6 ? 6 : 16), k.steel, [-18, 0, 0], [0, 0, Math.PI / 2]);
		cyl(frame, k.fire, 1.5, 0.6, [-19.8, 0, 0], { axis: "x", segs: 12 });
		const strobe = navLights(frame, k, [-10.5, -0.4, 18.2], [-16.8, 9.2, 0]);
		return {
			root,
			update(e, i) {
				frame.rotation.x = Math.sin(i.time * 1.3 + e.id) * 0.25;
				strobe.visible = (i.time * 1.3 + e.id * 0.37) % 1 < 0.12;
			},
		};
	}
	function bomber(k) {
		const root = new THREE.Group(),
			frame = group(root),
			dom = k.dominion,
			sides = dom ? 6 : 12;
		mesh(
			frame,
			fuselage(
				"bomb",
				[[-25, 1.4, 1.6, 2], [-20, 3, 3.6, 1], [-10, 5, 5.2], [6, 5, 5.2], [14, 4.4, 4.6, -0.2], [19, 3.2, 3.4, -0.6], [22.5, 1.8, 2, -1], [24.2, 0.4, 0.5, -1.2]],
				sides,
			),
			k.plate,
		);
		canopy(frame, k, [17, 3, 0], [3.4, 1.3, 2.4], sides); // flight deck
		ball(frame, k.canopy, 1, [21.6, -1.2, 0], [2.6, 1.5, 1.7]); // bombardier glazing
		// Shoulder wings with dihedral: root, crank, tip.
		const wing = dom
			? [[11, 18, 2.6, 4, 2], [2, 10, 1.4, 16, 2.6], [-9, 3.5, 0.6, 31, 3.8]]
			: [[9, 16, 2.6, 4, 2], [3, 11, 1.6, 16, 2.6], [-6, 5, 0.6, 31, 3.8]];
		for (const z of [-1, 1]) {
			mesh(frame, wingGeo("bomb" + dom, wing, z), k.plate);
			box(frame, k.team, [4.5, 0.3, 4], [-6.5, 4, z * 27], null, 0.1); // wing band
			box(frame, k.dark, [7, 0.25, 9], [-5, 2.7, z * 11], null, 0.1); // flap
			// Two jet pods under each wing, on pylons.
			for (const [d, x, y] of [[11, 7, -1.4], [20, 3, -0.5]]) {
				box(frame, k.dark, [6, 2.6, 0.8], [x - 3, y + 2.4, z * d], null, 0.2);
				jet(frame, k, [x, y, z * d], 2.2, 10, "b");
			}
			// Tailplanes high on the fin (Colonies) or low (Dominium).
			mesh(frame, wingGeo("bombTail" + dom, [[-15.5, 8, 0.8, 1, 0], [-21, 3.5, 0.35, 12, 0.6]], z), k.plate, [0, dom ? 2 : 13.5, 0]);
		}
		mesh(frame, profileGeo([[-25, 0], [-12, 0], [-19.5, 12.5], [-24.5, 13]], 1.2, 0.3), k.plate, [0, 2, 0]); // fin
		box(frame, k.team, [5, 3, 1.5], [-20.5, 9, 0], null, 0.2);
		// Bomb bay doors on the belly, a dorsal turret with twin guns, the tail gunner.
		box(frame, k.dark, [14, 0.5, 4.6], [-1, -5, 0], null, 0.2);
		box(frame, k.black, [13, 0.3, 0.3], [-1, -5.3, 0], null, 0.1);
		const turret = group(frame, [-4, 5, 0]);
		ball(turret, k.canopy, 1.8, [0, 0, 0], [1.2, 0.8, 1.2]);
		for (const s of [-0.5, 0.5]) cyl(turret, k.steel, 0.2, 4, [1.8, 0.4, s], { axis: "x", segs: 6 });
		cyl(frame, k.dark, 1.2, 2, [-25.5, 2, 0], { axis: "x", segs: sides });
		cyl(frame, k.steel, 0.18, 3, [-27.5, 2, 0], { axis: "x", segs: 6 });
		pipe(frame, k.dark, [8, 5, 0], [6, 7.5, 0], 0.15, 5); // antennas
		pipe(frame, k.dark, [-12, -4.8, 0], [-14, -7, 0], 0.15, 5);
		const strobe = navLights(frame, k, [-8.2, 3.9, 31.3], [-23.5, 15.4, 0]);
		return {
			root,
			update(e, i) {
				frame.rotation.x = Math.sin(i.time * 0.9 + e.id) * 0.12;
				turret.rotation.y = i.aim || 0;
				strobe.visible = (i.time * 1.1 + e.id * 0.37) % 1 < 0.12;
			},
		};
	}
	function drone(k) {
		const root = new THREE.Group(),
			frame = group(root),
			rotors = [],
			dom = k.dominion,
			sides = dom ? 6 : 12;
		// Body pod with a team stripe on its back, a sensor gimbal under the nose.
		mesh(frame, fuselage("drn", [[-5, 1.8, 1.4, 0.2], [-3, 3, 2.2], [2, 3.2, 2.3], [4.5, 2.3, 1.8, -0.2], [6, 1, 1, -0.4]], sides), k.plate);
		box(frame, k.team, [6.5, 0.4, 2.2], [-0.5, 2.25, 0], null, 0.15);
		box(frame, k.canopy, [1.4, 0.8, 2.4], [4.4, 0.6, 0], [0, 0, -0.4], 0.2); // camera window
		const gimbal = group(frame, [3.5, -2.4, 0]);
		ball(gimbal, k.dark, 1.3, [0, 0, 0]);
		cyl(gimbal, k.canopy, 0.55, 0.6, [1.2, 0, 0], { axis: "x", segs: 10 });
		pipe(frame, k.dark, [-3, 2, 0], [-4.5, 4.5, 0], 0.12, 5); // antenna
		for (const z of [-2.6, 2.6]) {
			pipe(frame, k.black, [1.5, -1.8, z], [1.5, -4.6, z * 1.3], 0.25); // legs
			pipe(frame, k.black, [-2, -1.8, z], [-2, -4.6, z * 1.3], 0.25);
			pipe(frame, k.black, [3.5, -4.6, z * 1.3], [-4, -4.6, z * 1.3], 0.3);
		}
		// Four ducted rotors on tapered arms: duct, stator, motor, three spinning blades.
		for (const [x, z] of [[6.5, 6.5], [6.5, -6.5], [-6.5, 6.5], [-6.5, -6.5]]) {
			pipe(frame, k.dark, [x * 0.3, 0.3, z * 0.3], [x, 0.9, z], 0.55, sides === 6 ? 6 : 8);
			mesh(frame, shellGeo([[4.6, -0.9], [5, 0], [4.7, 0.9]], 0.45, dom ? 8 : 20), k.plate, [x, 1.2, z]);
			box(frame, k.dark, [9.2, 0.25, 0.3], [x, 0.6, z], null, 0.05);
			box(frame, k.dark, [0.3, 0.25, 9.2], [x, 0.6, z], null, 0.05);
			cyl(frame, k.steel, 0.9, 1.6, [x, 1.1, z], { segs: 10 });
			const rotor = group(frame, [x, 2, z]);
			cyl(rotor, k.metal, 0.5, 0.5, [0, 0, 0], { segs: 8, top: 0.2 });
			for (let b = 0; b < 3; b++) {
				const a = (b / 3) * Math.PI * 2;
				box(rotor, k.black, [4, 0.15, 0.9], [Math.cos(a) * 2.1, 0, Math.sin(a) * 2.1], [0, -a, 0.15], 0.05);
			}
			rotors.push(rotor);
		}
		const strobe = navLights(frame, k, [10, 1.3, 10], [-4.8, 2.4, 0]);
		return {
			root,
			update(e, i) {
				rotors.forEach((r, n) => (r.rotation.y = i.time * 40 * (n % 2 ? 1 : -1)));
				// Nose down while flying, the camera looking around.
				frame.rotation.z += ((i.moving ? -0.12 : 0) - frame.rotation.z) * 0.1;
				gimbal.rotation.y = Math.sin(i.time * 0.6 + e.id) * 0.8;
				strobe.visible = (i.time * 1.5 + e.id * 0.37) % 1 < 0.12;
			},
		};
	}

	// ---------- buildings (footprint from the 2D radius) ----------
	// Foundation: a bevelled pad, a hazard stripe on its front edge and bollards at the corners.
	function foundation(root, k, w, d = w, h = 4) {
		box(root, k.dark, [w, h, d], [0, h / 2, 0], null, Math.min(1.2, h * 0.3));
		const n = Math.max(4, Math.round(d / 6));
		for (let i = 0; i < n; i++) box(root, i % 2 ? k.black : k.warn, [1.4, 0.5, d / n], [w / 2 - 1.4, h + 0.1, -d / 2 + (d / n) * (i + 0.5)], null, 0.1);
		for (const x of [-1, 1]) for (const z of [-1, 1]) cyl(root, k.warn, 1, 3, [x * (w / 2 - 2), h + 1.5, z * (d / 2 - 2)], { segs: 8 });
	}
	// A row of windows on a wall facing +X (face at x), or ±Z (axis "z": face at z, spread along x).
	// Every window: a dark frame, the pane (dark reflecting glass by day; at night warm light inside, a
	// few cool screens, some dark), a sill, and a cross of glazing bars on the bigger ones. Which windows
	// are dark or cool is fixed per building (from the position), so the pattern does not flicker.
	function windows(parent, k, { at, y, from, to, n, size = [0.5, 2.6, 3], axis = "x" }) {
		const [d, h, w] = size;
		for (let i = 0; i < n; i++) {
			const t = from + ((to - from) * (i + 0.5)) / n,
				r = ((Math.sin(i * 12.9898 + at * 78.233 + y * 37.719 + from * 4.13) * 43758.5453) % 1 + 1) % 1,
				pane = r < 0.2 ? k.windowOff : r < 0.32 ? k.windowCool : k.window,
				put = (m, [pd, ph, pw], dy = 0, rot) => (axis === "x" ? box(parent, m, [pd, ph, pw], [at, y + dy, t], rot, 0.08) : box(parent, m, [pw, ph, pd], [t, y + dy, at], rot, 0.08));
			put(k.dark, [d * 0.8, h + 0.7, w + 0.7]);
			put(pane, [d, h, w]);
			put(k.metal, [d + 0.5, 0.35, w + 0.9], -h / 2 - 0.3);
			if (h >= 3 || w >= 3.5) {
				put(k.dark, [d + 0.12, h, 0.22]);
				put(k.dark, [d + 0.12, 0.22, w], h * 0.12);
			}
		}
	}
	const vent = (parent, k, [x, y, z], r = 2) => {
		cyl(parent, k.metal, r, 2.4, [x, y + 1.2, z], { segs: 10 });
		cyl(parent, k.dark, r * 1.2, 0.6, [x, y + 2.7, z], { segs: 10 });
	};
	const lamp = (parent, k, [x, y, z]) => box(parent, k.lamp, [1.2, 1.2, 1.2], [x, y, z], null, 0.3);
	function block(parent, k, m, [w, h, d], [x, y, z], dom) {
		// A building block: bevelled (Colonies) or with a sloped parapet (Dominium).
		box(parent, m, [w, h, d], [x, y + h / 2, z], null, dom ? 0.5 : Math.min(2.4, w * 0.08));
		if (dom) {
			box(parent, k.dark, [w + 1, 2, d + 1], [x, y + h + 1, z], null, 0.4);
			for (let i = 0; i < Math.floor(w / 6); i++) box(parent, m, [2.4, 2, 1.4], [x - w / 2 + 3 + i * 6, y + h + 3, z + d / 2], null, 0.2);
		}
	}

	function hq(k, r) {
		const root = new THREE.Group(),
			dom = k.dominion,
			w = r * 1.5;
		foundation(root, k, w * 1.12, w * 1.12, 6);
		block(root, k, k.plate, [w * 0.82, 22, w * 0.76], [-w * 0.04, 6, 0], dom);
		box(root, k.team, [w * 0.84, 2.4, w * 0.78], [-w * 0.04, 22, 0], null, 0.4);
		windows(root, k, { at: w * 0.37 + 0.2, y: 15, from: -w * 0.34, to: w * 0.34, n: 6 });
		windows(root, k, { at: w * 0.38 + 0.2, y: 15, from: -w * 0.42, to: w * 0.34, n: 5, axis: "z" });
		windows(root, k, { at: -w * 0.38 - 0.2, y: 15, from: -w * 0.42, to: w * 0.34, n: 5, axis: "z" });
		// Buttresses and the entrance.
		for (const z of [-1, 1]) box(root, k.metal, [6, 18, 4], [w * 0.38, 15, z * w * 0.38], null, 0.8);
		box(root, k.dark, [4, 9, 14], [w * 0.38, 10.5, 0], null, 0.6);
		box(root, k.lamp, [0.5, 1, 12], [w * 0.4 + 0.2, 15.6, 0], null, 0.1);
		// Upper tier: a dome (Colonies) or a stepped tower (Dominium), with the command deck.
		block(root, k, k.metal, [w * 0.46, 12, w * 0.42], [-w * 0.12, 28, 0], dom);
		windows(root, k, { at: w * 0.11 + 0.2, y: 35, from: -w * 0.18, to: w * 0.18, n: 4, size: [0.5, 3.4, 4] });
		if (dom) {
			block(root, k, k.plate, [w * 0.28, 16, w * 0.26], [-w * 0.15, 40, 0], true);
			box(root, k.red, [w * 0.29, 1, w * 0.27], [-w * 0.15, 50, 0], null, 0.2);
		} else {
			mesh(root, latheGeo([[w * 0.2, 0], [w * 0.19, w * 0.08], [w * 0.14, w * 0.16], [w * 0.07, w * 0.2], [0, w * 0.21]], 18), k.glass, [-w * 0.14, 40, 0]);
			mesh(root, torusGeo(w * 0.2, 0.9, 24), k.team, [-w * 0.14, 40, 0]);
		}
		for (const [x, z] of [[-w * 0.3, -w * 0.3], [-w * 0.3, w * 0.3], [w * 0.2, -w * 0.32]]) vent(root, k, [x, 28, z], 2.4);
		// Landing pad at the back corner.
		cyl(root, k.dark, w * 0.16, 1.2, [-w * 0.34, 28.6, w * 0.25], { segs: 16 });
		mesh(root, torusGeo(w * 0.12, 0.5, 20), k.warn, [-w * 0.34, 29.4, w * 0.25]);
		const mast = group(root, [w * 0.2, 28, -w * 0.22]);
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2;
			pipe(mast, k.metal, [Math.cos(a) * 4, 0, Math.sin(a) * 4], [0, 30, 0], 0.5);
		}
		for (const y of [8, 16, 24]) mesh(mast, torusGeo(4 - y / 8, 0.3, 10), k.metal, [0, y, 0]);
		lamp(mast, k, [0, 31, 0]);
		const dish = group(mast, [0, 30, 0]);
		mesh(dish, shellGeo([[0.5, 0], [4, 1.2], [7, 3.6], [8, 5]], 0.6, 16), k.metal, [0, 0, 0]);
		pipe(dish, k.steel, [0, 0.5, 0], [0, 7, 0], 0.3);
		ball(dish, k.glow, 1.2, [0, 7, 0]);
		return { root, update: (e, i) => (dish.rotation.y = i.time * 0.8) };
	}
	function barracks(k, r) {
		const root = new THREE.Group(),
			dom = k.dominion,
			w = r * 1.6;
		foundation(root, k, w, w * 0.82);
		for (const z of [-w * 0.2, w * 0.2]) {
			if (dom) {
				block(root, k, k.plate, [w * 0.8, 15, w * 0.3], [-w * 0.04, 4, z], true);
				windows(root, k, { at: z + (z > 0 ? 1 : -1) * (w * 0.15 + 0.2), y: 13, from: -w * 0.38, to: w * 0.3, n: 5, axis: "z", size: [0.5, 2, 3] });
			} else {
				// Quonset hut: a half cylinder with ribs and end walls.
				mesh(root, cylGeo(w * 0.15, w * 0.15, w * 0.8, 14, "x"), k.plate, [-w * 0.04, 4, z]);
				for (let i = 0; i <= 6; i++) mesh(root, torusGeo(w * 0.15 + 0.3, 0.45, 16, "x"), k.metal, [-w * 0.44 + (i * w * 0.8) / 6, 4, z]);
				box(root, k.dark, [1, w * 0.12, w * 0.18], [w * 0.36, 4 + w * 0.06, z], null, 0.3);
				box(root, k.lamp, [0.5, 1, 3], [w * 0.365, 4 + w * 0.13, z], null, 0.1);
			}
			box(root, k.team, [w * 0.82, 1.6, 1.4], [-w * 0.04, dom ? 17.5 : 4 + w * 0.15, z], null, 0.2);
		}
		// Gatehouse between the halls, a flag on a pole.
		block(root, k, k.metal, [12, 15, 16], [w * 0.38, 4, 0], dom);
		box(root, k.black, [0.6, 9, 9], [w * 0.38 + 6.1, 8.5, 0], null, 0.1);
		windows(root, k, { at: w * 0.38 + 6.2, y: 15.5, from: -4.5, to: 4.5, n: 2, size: [0.5, 2, 3.6] });
		lamp(root, k, [w * 0.38 + 6.4, 19, 5]);
		cyl(root, k.steel, 0.5, 26, [-w * 0.42, 17, w * 0.36], { segs: 6 });
		const flag = group(root, [-w * 0.42, 27, w * 0.36]);
		box(flag, k.team, [0.3, 5, 8], [0, 0, 4], null, 0.1);
		return { root, update: (e, i) => (flag.rotation.y = Math.sin(i.time * 1.7 + e.id) * 0.4) };
	}
	function factory(k, r) {
		const root = new THREE.Group(),
			dom = k.dominion,
			w = r * 1.6;
		foundation(root, k, w, w * 0.9);
		block(root, k, k.plate, [w * 0.86, 26, w * 0.66], [-w * 0.04, 4, 0], dom);
		// Sawtooth roof of the hall (Colonies) or a flat roof with a crane rail (Dominium).
		if (!dom)
			for (let i = 0; i < 4; i++) {
				const x = -w * 0.4 + (i + 0.5) * w * 0.2;
				mesh(root, profileGeo([[-w * 0.1, 0], [w * 0.1, 0], [w * 0.1, 8]], w * 0.64, 0.4), k.metal, [x, 30, 0]);
				box(root, k.window, [0.4, 6.4, w * 0.6], [x + w * 0.1 - 0.3, 33.6, 0], null, 0.1);
				for (let m = 1; m < 6; m++) box(root, k.dark, [0.6, 6.4, 0.4], [x + w * 0.1 - 0.3, 33.6, -w * 0.3 + m * w * 0.1], null, 0.05); // glazing bars
			}
		else for (const z of [-1, 1]) box(root, k.metal, [w * 0.86, 2, 2], [-w * 0.04, 32, z * w * 0.3], null, 0.3);
		box(root, k.team, [w * 0.88, 2.6, w * 0.68], [-w * 0.04, 26, 0], null, 0.4);
		windows(root, k, { at: w * 0.33 + 0.2, y: 22, from: -w * 0.42, to: w * 0.36, n: 7, axis: "z" });
		windows(root, k, { at: -w * 0.33 - 0.2, y: 22, from: -w * 0.42, to: w * 0.36, n: 7, axis: "z" });
		// Bay door with a hazard frame and a lamp.
		box(root, k.black, [1, 18, w * 0.36], [w * 0.39 + 0.3, 13, 0], null, 0.1);
		for (let i = 0; i < 6; i++) box(root, k.dark, [0.4, 0.6, w * 0.35], [w * 0.39 + 0.9, 6 + i * 3, 0], null, 0.1);
		for (const z of [-1, 1]) box(root, k.warn, [1.6, 20, 1.6], [w * 0.39 + 0.6, 14, z * w * 0.19], null, 0.2);
		box(root, k.warn, [1.6, 1.6, w * 0.4], [w * 0.39 + 0.6, 24, 0], null, 0.2);
		lamp(root, k, [w * 0.39 + 1.6, 26, 0]);
		// Stacks with fans and pipes.
		const fans = [];
		for (const z of [-w * 0.2, w * 0.2]) {
			mesh(root, shellGeo([[7, 0], [6, 10], [5, 22], [5.6, 24]], 0.6, 14), k.metal, [-w * 0.32, 30, z]);
			mesh(root, torusGeo(5.4, 0.5, 14), k.team, [-w * 0.32, 48, z]);
			pipe(root, k.steel, [-w * 0.32 + 6, 34, z], [-w * 0.1, 34, z], 1.2);
			const fan = group(root, [-w * 0.05, 38.5, z]);
			cyl(fan, k.dark, 7, 1.2, [0, 0, 0], { segs: 14 });
			for (let i = 0; i < 3; i++) box(fan, k.metal, [13, 0.5, 2], [0, 0.8, 0], [0, (i * Math.PI) / 3, 0.15], 0.1);
			fans.push(fan);
		}
		// Conveyor out of the side.
		box(root, k.dark, [w * 0.3, 2, 5], [w * 0.2, 6, w * 0.38], null, 0.4);
		for (let i = 0; i < 5; i++) cyl(root, k.steel, 0.6, 5.4, [w * 0.08 + i * w * 0.06, 7.2, w * 0.38], { axis: "z", segs: 6 });
		return { root, update: (e, i) => fans.forEach((f, n) => (f.rotation.y = i.time * (4 + n))) };
	}
	function depot(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		foundation(root, k, w, w, 3);
		// Container stacks with ribs.
		const colors = [k.plate, k.team, k.metal, k.warn];
		[[-1, -1, 2], [1, -1, 1], [-1, 1, 1], [1, 1, 2]].forEach(([x, z, levels], n) => {
			for (let l = 0; l < levels; l++) {
				const y = 3 + l * 10.4,
					cx = x * w * 0.22,
					cz = z * w * 0.22;
				box(root, colors[(n + l) % 4], [w * 0.36, 10, w * 0.3], [cx, y + 5, cz], null, 0.5);
				for (let i = 0; i < 5; i++) box(root, k.dark, [0.5, 9.4, w * 0.31], [cx - w * 0.15 + i * w * 0.075, y + 5, cz], null, 0.1);
			}
		});
		// Gantry crane over the yard.
		for (const z of [-1, 1]) box(root, k.warn, [2, 30, 2], [w * 0.42, 18, z * w * 0.42], null, 0.3);
		box(root, k.warn, [2.4, 2.4, w * 0.9], [w * 0.42, 33, 0], null, 0.3);
		const hoist = group(root, [w * 0.42, 31, 0]);
		box(hoist, k.black, [3, 2.6, 3], [0, 0, 0], null, 0.4);
		cyl(hoist, k.steel, 0.2, 8, [0, -5, 0], { segs: 4 });
		lamp(root, k, [w * 0.42, 35, w * 0.42]);
		return { root, update: (e, i) => (hoist.position.z = Math.sin(i.time * 0.6 + e.id) * w * 0.35) };
	}
	function turret(k, r) {
		const root = new THREE.Group(),
			dom = k.dominion;
		// Hexagonal bunker, a team ring, a turning head with twin barrels, armour plates and a sight.
		mesh(root, cylGeo(r * 0.78, r * 0.9, 10, 6), k.dark, [0, 5, 0]);
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
			box(root, k.metal, [r * 0.7, 6, 1], [Math.cos(a) * r * 0.78, 5, Math.sin(a) * r * 0.78], [0, -a + Math.PI / 2, 0.15], 0.3);
		}
		mesh(root, torusGeo(r * 0.66, 1, 18), k.team, [0, 10.5, 0]);
		box(root, k.warn, [4, 3, 3], [-r * 0.5, 11.5, r * 0.4], null, 0.4); // ammo box
		const head = group(root, [0, 11, 0]),
			guns = group(head, [r * 0.3, 6, 0]);
		dom ? mesh(head, turretGeo(r * 0.95, r * 0.75, 9, true), k.metal, [0, 0, 0]) : mesh(head, latheGeo([[r * 0.48, 0], [r * 0.5, 4], [r * 0.4, 8], [0, 9.4]], 14), k.metal, [0, 0, 0]);
		box(head, k.glass, [1.4, 1.6, 4], [r * 0.36, 7.4, -4], null, 0.3);
		cupola(head, k, [-r * 0.15, 8, 3], 2);
		box(guns, k.dark, [5, 5, 9], [0, 0, 0], null, 0.7);
		for (const z of [-2.8, 2.8]) {
			const t = group(guns, [2, 0, z]);
			cannon(t, k, 20, 1, { brake: dom });
		}
		return {
			root,
			update(e, i) {
				head.rotation.y = -i.aim;
				guns.position.x = r * 0.3 - i.recoil * 5;
			},
		};
	}
	function wall(k, r) {
		const root = new THREE.Group(),
			w = r * 1.75;
		box(root, k.plate, [w, 22, w], [0, 11, 0], null, 1.2);
		for (const x of [-1, 1]) for (const z of [-1, 1]) box(root, k.dark, [3, 22.4, 3], [x * (w / 2 - 1), 11.2, z * (w / 2 - 1)], null, 0.5);
		for (let i = 0; i < 3; i++) box(root, k.dark, [w + 0.4, 0.6, w + 0.4], [0, 5 + i * 5, 0], null, 0.1); // panel seams
		box(root, k.team, [w + 0.6, 1.6, w + 0.6], [0, 19.5, 0], null, 0.2);
		for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(root, k.metal, [w * 0.3, 5, w * 0.3], [x * w * 0.33, 24.5, z * w * 0.33], null, 0.6);
		lamp(root, k, [0, 22.6, 0]);
		return { root, update() {} };
	}
	function gate(k, r) {
		const root = new THREE.Group(),
			w = r * 1.5;
		for (const z of [-w / 2, w / 2]) {
			box(root, k.plate, [16, 32, 12], [0, 16, z], null, 1);
			box(root, k.team, [16.4, 2, 12.4], [0, 28, z], null, 0.3);
			for (let i = 0; i < 3; i++) box(root, k.dark, [16.4, 0.5, 12.4], [0, 8 + i * 6, z], null, 0.1);
			lamp(root, k, [8.4, 26, z]);
			box(root, k.metal, [6, 4, 6], [0, 34, z], null, 0.6);
		}
		box(root, k.metal, [16, 5, w + 12], [0, 34, 0], null, 0.8); // lintel
		box(root, k.warn, [16.4, 1.2, w - 12], [0, 31.4, 0], null, 0.2);
		const door = group(root, [0, 13, 0]);
		box(door, k.dark, [5, 26, w - 12], [0, 0, 0], null, 0.5);
		for (let i = -1; i <= 1; i++) box(door, k.metal, [5.6, 22, 1.2], [0, 0, i * (w - 12) * 0.3], null, 0.2);
		return {
			root,
			update(e, i) {
				const target = e.open ? -24 : 13;
				door.position.y += (target - door.position.y) * 0.15; // sinks into the ground when open
			},
		};
	}
	function extractor(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		foundation(root, k, w);
		// Storage tanks with ribs, joined to the well by pipes.
		for (const z of [-w * 0.28, w * 0.28]) {
			mesh(root, latheGeo([[7, 0], [7, 16], [5, 19], [0, 20]], 14), k.plate, [-w * 0.25, 4, z]);
			for (const y of [8, 14]) mesh(root, torusGeo(7.2, 0.5, 16), k.metal, [-w * 0.25, y, z]);
			pipe(root, k.steel, [-w * 0.25 + 6, 8, z], [w * 0.15, 8, z * 0.4], 1);
		}
		box(root, k.team, [4, 2, w * 0.8], [-w * 0.25, 22, 0], null, 0.3);
		// Derrick: a tapering lattice over the well, a crown block, a pump piston.
		const base = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
		for (const [x, z] of base) pipe(root, k.metal, [w * 0.15 + x * 7, 4, z * 7], [w * 0.15 + x * 3, 38, z * 3], 0.7);
		for (const y of [12, 22, 31])
			for (let i = 0; i < 4; i++) {
				const s = 7 - ((y - 4) / 34) * 4,
					[x0, z0] = base[i],
					[x1, z1] = base[(i + 1) % 4];
				pipe(root, k.metal, [w * 0.15 + x0 * s, y, z0 * s], [w * 0.15 + x1 * s, y, z1 * s], 0.4);
			}
		box(root, k.metal, [8, 2, 8], [w * 0.15, 39, 0], null, 0.4);
		lamp(root, k, [w * 0.15, 41, 0]);
		const piston = cyl(root, k.warn, 2.4, 20, [w * 0.15, 18, 0], { segs: 10 });
		const vent = ball(root, k.energy, 3, [w * 0.15, 6, 0]);
		return {
			root,
			update(e, i) {
				const work = i.working && i.built >= 1;
				piston.position.y = 18 + (work ? Math.sin(i.time * 9) * 5 : 0);
				vent.visible = work;
			},
		};
	}
	function reactor(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		foundation(root, k, w);
		// Cooling tower (hyperboloid), the reactor hall, the glowing core in a cage, pipes.
		mesh(root, shellGeo([[r * 0.6, 0], [r * 0.48, 16], [r * 0.4, 30], [r * 0.44, 40], [r * 0.4, 40.5]], 1.2, 20), k.metal, [-w * 0.14, 4, 0]);
		mesh(root, torusGeo(r * 0.42, 1.4, 22), k.team, [-w * 0.14, 42, 0]);
		mesh(root, torusGeo(r * 0.55, 0.8, 22), k.dark, [-w * 0.14, 8, 0]);
		block(root, k, k.plate, [14, 10, 13], [w * 0.28, 4, -w * 0.2], k.dominion);
		windows(root, k, { at: w * 0.28 + 7.2, y: 10, from: -w * 0.2 - 5, to: -w * 0.2 + 5, n: 3 });
		const core = cyl(root, k.energy, 4.6, 14, [w * 0.28, 11, w * 0.2], { segs: 12 });
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2;
			cyl(root, k.metal, 0.5, 16, [w * 0.28 + Math.cos(a) * 6, 12, w * 0.2 + Math.sin(a) * 6], { segs: 6 });
		}
		mesh(root, torusGeo(6, 0.6, 18), k.metal, [w * 0.28, 20, w * 0.2]);
		pipe(root, k.dark, [w * 0.28 - 6, 8, w * 0.2], [-w * 0.14 + r * 0.5, 8, w * 0.1], 1.6);
		pipe(root, k.dark, [w * 0.28, 8, -w * 0.2 + 6], [w * 0.28, 8, w * 0.2 - 6], 1.2);
		return { root, update: (e, i) => core.scale.set(1 + Math.sin(i.time * 3) * 0.12, 1, 1 + Math.sin(i.time * 3) * 0.12) };
	}
	function lab(k, r) {
		const root = new THREE.Group(),
			dom = k.dominion,
			w = r * 1.6;
		foundation(root, k, w);
		block(root, k, k.plate, [w * 0.78, 10, w * 0.68], [0, 4, 0], dom);
		box(root, k.team, [w * 0.8, 1.6, w * 0.7], [0, 14, 0], null, 0.3);
		windows(root, k, { at: w * 0.39 + 0.2, y: 10, from: -w * 0.3, to: w * 0.3, n: 5, size: [0.5, 3, 4] });
		mesh(root, latheGeo([[r * 0.5, 0], [r * 0.47, r * 0.18], [r * 0.36, r * 0.34], [r * 0.2, r * 0.43], [0, r * 0.46]], 20), dom ? k.metal : k.glass, [0, 14.5, 0]);
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2;
			pipe(root, k.metal, [Math.cos(a) * r * 0.5, 14.6, Math.sin(a) * r * 0.5], [Math.cos(a) * r * 0.2, 14.5 + r * 0.43, Math.sin(a) * r * 0.2], 0.4); // dome ribs
		}
		for (const [x, z] of [[-w * 0.3, -w * 0.26], [w * 0.28, w * 0.26]]) {
			cyl(root, k.steel, 0.4, 14, [x, 21, z], { segs: 5 });
			lamp(root, k, [x, 28.5, z]);
		}
		vent(root, k, [-w * 0.3, 14, w * 0.24]);
		const ring = group(root, [0, 26, 0]);
		mesh(ring, torusGeo(r * 0.62, 1.4, 28), k.metal, [0, 0, 0]);
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2;
			ball(ring, k.energy, 1.8, [Math.cos(a) * r * 0.62, 0, Math.sin(a) * r * 0.62]);
		}
		return { root, update: (e, i) => ((ring.rotation.y = i.time * 0.9), (ring.rotation.x = Math.sin(i.time * 0.7) * 0.25)) };
	}
	function battery(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6,
			caps = [];
		foundation(root, k, w);
		for (let x = -1; x <= 1; x++)
			for (const z of [-1, 1]) {
				const cx = x * w * 0.28,
					cz = z * w * 0.2;
				cyl(root, k.plate, 5.4, 18, [cx, 13, cz], { segs: 14 });
				for (const y of [7, 12, 17]) mesh(root, torusGeo(5.6, 0.5, 14), k.dark, [cx, y, cz]);
				cyl(root, k.metal, 4.4, 2, [cx, 23, cz], { segs: 14 });
				caps.push(cyl(root, k.energy, 3.6, 2.6, [cx, 25, cz], { segs: 12 }));
				pipe(root, k.black, [cx, 6, cz - z * 5], [cx, 6, 0], 0.7);
			}
		box(root, k.team, [w * 0.9, 2.6, 3.4], [0, 6, 0], null, 0.4); // bus bar
		box(root, k.dark, [8, 8, 6], [w * 0.42, 8, 0], null, 0.6); // control box
		lamp(root, k, [w * 0.42 + 4.2, 10, 0]);
		return { root, update: (e, i) => caps.forEach((c, n) => (c.visible = i.built >= 1 && Math.sin(i.time * 2 - n) > -0.6)) };
	}
	function workshop(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		foundation(root, k, w, w * 0.85);
		for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
			box(root, k.metal, [3, 26, 3], [x * w * 0.42, 15, z * w * 0.36], null, 0.4);
			pipe(root, k.metal, [x * w * 0.42, 8, z * w * 0.36], [x * w * 0.2, 26, z * w * 0.36], 0.4); // braces
		}
		box(root, k.plate, [w * 0.9, 2.4, w * 0.78], [0, 29, 0], null, 0.6);
		for (let i = 0; i < 4; i++) {
			box(root, k.dark, [w * 0.15, 0.3, w * 0.61], [-w * 0.3 + i * w * 0.2, 30.3, 0], null, 0.05);
			box(root, k.window, [w * 0.13, 0.4, w * 0.58], [-w * 0.3 + i * w * 0.2, 30.4, 0], null, 0.1); // skylights
		}
		box(root, k.team, [w * 0.92, 1.5, 4], [0, 31, w * 0.3], null, 0.3);
		for (const z of [-1, 1]) box(root, k.warn, [w * 0.86, 1.6, 1.6], [0, 26, z * w * 0.3], null, 0.2); // crane rails
		const crane = group(root, [0, 26, 0]);
		box(crane, k.warn, [3, 2.4, w * 0.64], [0, 0, 0], null, 0.3);
		box(crane, k.black, [4, 3, 4], [0, -2.4, 0], null, 0.4);
		cyl(crane, k.steel, 0.2, 8, [0, -7.5, 0], { segs: 4 });
		box(crane, k.dark, [2, 1, 4], [0, -11.8, 0], null, 0.2);
		// A hull on the jig, a tool cart and a welding light.
		box(root, k.dark, [w * 0.42, 6, w * 0.26], [0, 7, 0], null, 1);
		box(root, k.metal, [w * 0.2, 4, w * 0.2], [-w * 0.03, 12, 0], null, 0.8);
		for (const x of [-1, 1]) box(root, k.warn, [3, 3, w * 0.34], [x * w * 0.18, 5.5, 0], null, 0.3);
		box(root, k.warn, [5, 5, 4], [w * 0.32, 6.5, -w * 0.28], null, 0.5);
		const spark = ball(root, k.energy, 1.2, [w * 0.12, 9, w * 0.13]);
		return {
			root,
			update(e, i) {
				crane.position.x = Math.sin(i.time * 0.8) * w * 0.3;
				spark.visible = i.built >= 1 && Math.sin(i.time * 13 + e.id) > 0.3;
			},
		};
	}
	function hangar(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		foundation(root, k, w, w * 0.9);
		// Arched hall along X with ribs, a front door and a control tower.
		mesh(root, cylGeo(w * 0.3, w * 0.3, w * 0.62, 16, "x"), k.plate, [-w * 0.12, 4, 0]);
		for (let i = 0; i <= 5; i++) mesh(root, torusGeo(w * 0.3 + 0.3, 0.6, 18, "x"), k.metal, [-w * 0.43 + (i * w * 0.62) / 5, 4, 0]);
		box(root, k.team, [2, w * 0.3, w * 0.62], [w * 0.19, 4 + w * 0.15, 0], null, 0.3);
		box(root, k.black, [1.2, w * 0.22, w * 0.42], [w * 0.2, 4 + w * 0.11, 0], null, 0.2);
		for (let i = 0; i < 5; i++) box(root, k.dark, [1.4, 0.5, w * 0.42], [w * 0.2, 6 + i * w * 0.04, 0], null, 0.1);
		block(root, k, k.metal, [8, 22, 8], [-w * 0.38, 4, -w * 0.35], k.dominion);
		box(root, k.window, [9, 4, 9], [-w * 0.38, 28, -w * 0.35], null, 0.4); // control room
		for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(root, k.dark, [0.8, 4.2, 0.8], [-w * 0.38 + x * 4.4, 28, -w * 0.35 + z * 4.4], null, 0.1);
		box(root, k.dark, [10, 1, 10], [-w * 0.38, 30.6, -w * 0.35], null, 0.3);
		const beacon = ball(root, k.red, 1, [-w * 0.38, 32, -w * 0.35]);
		// Landing pad with markings and lights.
		cyl(root, k.dark, w * 0.15, 1, [w * 0.35, 4.6, w * 0.25], { segs: 18 });
		mesh(root, torusGeo(w * 0.12, 0.6, 20), k.warn, [w * 0.35, 5.2, w * 0.25]);
		box(root, k.warn, [w * 0.12, 0.4, 1.4], [w * 0.35, 5.2, w * 0.25], null, 0.1);
		box(root, k.warn, [1.4, 0.4, w * 0.12], [w * 0.35, 5.2, w * 0.25], null, 0.1);
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
			lamp(root, k, [w * 0.35 + Math.cos(a) * w * 0.15, 5.6, w * 0.25 + Math.sin(a) * w * 0.15]);
		}
		return { root, update: (e, i) => (beacon.visible = Math.sin(i.time * 3 + e.id) > 0) };
	}
	function flak(k, r) {
		const root = new THREE.Group();
		mesh(root, cylGeo(r * 0.7, r * 0.82, 10, 6), k.dark, [0, 5, 0]);
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
			box(root, k.warn, [3, 1.6, 3], [Math.cos(a) * r * 0.66, 10.8, Math.sin(a) * r * 0.66], null, 0.4); // ammo cases
		}
		mesh(root, torusGeo(r * 0.55, 1, 18), k.team, [0, 10.5, 0]);
		const head = group(root, [0, 12, 0]),
			guns = group(head, [3, 7, 0]),
			barrel = group(guns);
		cyl(head, k.metal, 7, 4, [0, 2, 0], { top: 6, segs: 10 });
		box(head, k.metal, [12, 8, 15], [0, 7, 0], null, 1);
		box(head, k.glass, [1.4, 2, 5], [6.2, 8.6, 0], null, 0.3);
		box(head, k.dark, [4, 3, 3], [-4, 12, 4], null, 0.4); // radar box
		guns.rotation.z = 0.8;
		for (const z of [-5.5, -2, 2, 5.5]) {
			const t = group(barrel, [2, 0, z]);
			cannon(t, k, 18, 0.7, { sleeve: false, brake: false });
			cyl(t, k.black, 1, 1.4, [18, 0, 0], { axis: "x", segs: 8 });
		}
		return {
			root,
			update(e, i) {
				head.rotation.y = -i.aim;
				barrel.position.x = -i.recoil * 4;
			},
		};
	}
	function forge(k, r) {
		const root = new THREE.Group(),
			w = r * 1.5;
		foundation(root, k, w * 1.1, w * 1.1, 5);
		mesh(root, cylGeo(w * 0.4, w * 0.46, 16, 6), k.dark, [0, 13, 0]);
		mesh(root, cylGeo(w * 0.28, w * 0.34, 14, 6), k.plate, [0, 28, 0]);
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2;
			box(root, k.fire, [1, 6, 3], [Math.cos(a) * w * 0.43, 12, Math.sin(a) * w * 0.43], [0, -a, 0], 0.2); // glowing vents
		}
		const heart = ball(root, nature.ember, 9, [0, 39, 0]);
		mesh(root, torusGeo(10, 1.2, 18), k.metal, [0, 39, 0]);
		for (let n = 0; n < 3; n++) {
			const a = (n / 3) * Math.PI * 2;
			mesh(root, shellGeo([[4, 0], [3.4, 40], [4.2, 44], [3.6, 46]], 0.6, 12), k.metal, [Math.cos(a) * w * 0.38, 5, Math.sin(a) * w * 0.38]);
			cyl(root, k.fire, 3, 2, [Math.cos(a) * w * 0.38, 52, Math.sin(a) * w * 0.38], { segs: 10 });
			pipe(root, k.steel, [Math.cos(a) * w * 0.38, 30, Math.sin(a) * w * 0.38], [Math.cos(a) * 8, 36, Math.sin(a) * 8], 1);
		}
		mesh(root, torusGeo(w * 0.46, 2.4, 24), k.team, [0, 21, 0]);
		return { root, update: (e, i) => heart.scale.setScalar(1 + Math.sin(i.time * 2.4) * 0.13) };
	}
	const nature = { ember: null };
	function medbay(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		foundation(root, k, w);
		block(root, k, k.white, [w * 0.62, 12, w * 0.62], [-w * 0.1, 4, 0], k.dominion);
		box(root, k.team, [w * 0.64, 2, w * 0.64], [-w * 0.1, 16, 0], null, 0.3);
		windows(root, k, { at: w * 0.21 + 0.2, y: 11, from: -w * 0.26, to: w * 0.26, n: 4 });
		box(root, k.red, [w * 0.42, 1.2, 8], [-w * 0.1, 17.6, 0], null, 0.3);
		box(root, k.red, [8, 1.2, w * 0.42], [-w * 0.1, 17.6, 0], null, 0.3);
		box(root, k.dark, [1, 8, 10], [w * 0.21 + 0.3, 8, 0], null, 0.2);
		box(root, k.white, [8, 1.2, 14], [w * 0.25, 13, 0], null, 0.3); // canopy over the door
		for (const z of [-6, 6]) cyl(root, k.steel, 0.5, 9, [w * 0.28, 8.5, z], { segs: 6 });
		// Ambulance pad with a cross and lights.
		cyl(root, k.dark, w * 0.13, 1, [w * 0.33, 4.5, -w * 0.26], { segs: 16 });
		box(root, k.red, [w * 0.12, 0.4, 2], [w * 0.33, 5.2, -w * 0.26], null, 0.1);
		box(root, k.red, [2, 0.4, w * 0.12], [w * 0.33, 5.2, -w * 0.26], null, 0.1);
		const beacon = ball(root, k.red, 1.2, [-w * 0.32, 19, w * 0.22]);
		cyl(root, k.steel, 0.4, 3, [-w * 0.32, 17, w * 0.22], { segs: 5 });
		return { root, update: (e, i) => (beacon.visible = Math.sin(i.time * 4 + e.id) > 0) };
	}
	function shieldgen(k, r) {
		const root = new THREE.Group(),
			w = r * 1.5;
		foundation(root, k, w);
		mesh(root, cylGeo(r * 0.38, r * 0.48, 12, 6), k.plate, [0, 10, 0]);
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2;
			pipe(root, k.metal, [Math.cos(a) * r * 0.45, 4, Math.sin(a) * r * 0.45], [Math.cos(a) * 3, 40, Math.sin(a) * 3], 1); // pylons
		}
		cyl(root, k.metal, 3, 30, [0, 31, 0], { top: 2.2, segs: 10 });
		const ring = group(root, [0, 36, 0]);
		mesh(ring, torusGeo(r * 0.42, 1.6, 24), k.team, [0, 0, 0]);
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2;
			box(ring, k.energy, [2, 2, 2], [Math.cos(a) * r * 0.42, 0, Math.sin(a) * r * 0.42], null, 0.4);
		}
		const ring2 = group(root, [0, 26, 0]);
		mesh(ring2, torusGeo(r * 0.3, 1, 20), k.metal, [0, 0, 0]);
		const emitter = ball(root, k.energy, 5, [0, 48, 0]);
		return {
			root,
			update(e, i) {
				ring.rotation.y = i.time * 1.4;
				ring.position.y = 36 + Math.sin(i.time * 2) * 3;
				ring2.rotation.y = -i.time * 2;
				emitter.visible = i.built >= 1;
			},
		};
	}
	function salvageYard(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		foundation(root, k, w, w, 3);
		for (let n = 0; n < 12; n++) {
			const a = (n / 12) * Math.PI * 2,
				b = ((n + 1) / 12) * Math.PI * 2;
			cyl(root, k.metal, 0.7, 10, [Math.cos(a) * w * 0.47, 8, Math.sin(a) * w * 0.47], { segs: 6 });
			if (n % 4 !== 0) pipe(root, k.steel, [Math.cos(a) * w * 0.47, 11, Math.sin(a) * w * 0.47], [Math.cos(b) * w * 0.47, 11, Math.sin(b) * w * 0.47], 0.3); // fence wire
		}
		const scrap = [[-0.2, -0.2, 0.5], [-0.25, 0.2, 1.3], [0.1, 0.25, 2.2], [-0.05, 0.02, 2.9]];
		for (const [x, z, a] of scrap) {
			box(root, k.dark, [12, 7, 9], [x * w, 6, z * w], [0.2, a, 0.15], 1);
			box(root, k.rust ?? k.warn, [6, 3, 6], [x * w + 2, 10.5, z * w - 1], [0.4, a * 2, 0.3], 0.6);
			cyl(root, k.rubber, 3, 2, [x * w - 3, 4.4, z * w + 4], { axis: "z", segs: 12 }); // loose tyres
		}
		cyl(root, k.warn, 2.5, 34, [w * 0.25, 20, -w * 0.2], { segs: 10 });
		box(root, k.metal, [6, 5, 6], [w * 0.25, 34, -w * 0.2], null, 0.6); // cab
		box(root, k.window, [0.4, 2.4, 4], [w * 0.25 + 3, 34.6, -w * 0.2], null, 0.1);
		const boom = group(root, [w * 0.25, 37, -w * 0.2]);
		box(boom, k.warn, [34, 2.5, 2.5], [-12, 0, 0], null, 0.4);
		box(boom, k.black, [5, 4, 5], [-26, -6, 0], null, 0.5); // magnet
		cyl(boom, k.steel, 0.2, 5, [-26, -2.5, 0], { segs: 4 });
		box(root, k.team, [8, 2, 8], [w * 0.25, 4, -w * 0.2], null, 0.3);
		return { root, update: (e, i) => (boom.rotation.y = Math.sin(i.time * 0.5) * 1.2) };
	}
	function outpost(k, r) {
		const root = new THREE.Group();
		// Sandbag ring (rows of bags), a bunker dome with slits, a mast with a blinking light.
		for (let row = 0; row < 2; row++)
			for (let n = 0; n < 18; n++) {
				const a = ((n + row * 0.5) / 18) * Math.PI * 2;
				box(root, k.warn, [6, 3, 3.6], [Math.cos(a) * r * 0.8, 1.5 + row * 3, Math.sin(a) * r * 0.8], [0, -a + Math.PI / 2, 0], 1.2);
			}
		mesh(root, latheGeo([[r * 0.55, 0], [r * 0.52, r * 0.2], [r * 0.38, r * 0.4], [0, r * 0.5]], 16), k.plate, [0, 0, 0]);
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2;
			box(root, k.black, [1, 1.4, 5], [Math.cos(a) * r * 0.5, r * 0.18, Math.sin(a) * r * 0.5], [0, -a, 0], 0.2);
		}
		mesh(root, torusGeo(r * 0.53, 1.2, 18), k.team, [0, 3, 0]);
		cyl(root, k.metal, 0.8, 28, [r * 0.2, 26, 0], { top: 0.5, segs: 6 });
		for (const y of [16, 28]) box(root, k.metal, [6, 0.5, 0.5], [r * 0.2, y, 0], null, 0.1);
		const light = ball(root, k.glow, 2, [r * 0.2, 41, 0]);
		return { root, update: (e, i) => (light.visible = Math.sin(i.time * 4) > 0) };
	}
	function uplink(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		foundation(root, k, w);
		block(root, k, k.plate, [w * 0.55, 14, w * 0.55], [0, 4, 0], k.dominion);
		box(root, k.team, [w * 0.57, 2, w * 0.57], [0, 17, 0], null, 0.3);
		windows(root, k, { at: w * 0.275 + 0.2, y: 11, from: -w * 0.2, to: w * 0.2, n: 3 });
		for (const [x, z] of [[-1, -1], [1, 1]]) box(root, k.dark, [5, 6, 5], [x * w * 0.36, 7, z * w * 0.36], null, 0.5); // transformers
		const dish = group(root, [0, 18, 0]);
		cyl(dish, k.metal, 5, 3, [0, 1.5, 0], { segs: 12 });
		box(dish, k.dark, [4, 9, 8], [0, 7, 0], null, 0.8);
		const bowl = group(dish, [0, 12, 0]);
		bowl.rotation.z = 0.55;
		mesh(bowl, shellGeo([[1, 0], [r * 0.3, 2.5], [r * 0.5, 6.5], [r * 0.62, 10]], 0.6, 20), k.metal, [0, 0, 0]);
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2;
			pipe(bowl, k.steel, [Math.cos(a) * r * 0.55, 8.5, Math.sin(a) * r * 0.55], [0, 17, 0], 0.35);
		}
		ball(bowl, k.glass, 2, [0, 17, 0]);
		return { root, update: (e, i) => (dish.rotation.y = i.time * 0.3) };
	}

	const builders = {
		trooper: (k) => infantry(k, "rifle"),
		rocket: (k) => infantry(k, "rocket"),
		flamer: (k) => infantry(k, "flamer"),
		grenadier: (k) => infantry(k, "grenade"),
		scientist: (k) => infantry(k, "none", k.white),
		technician: (k) => infantry(k, "tool", k.warn),
		saboteur: (k) => infantry(k, "carbine", k.black),
		tank,
		heavy,
		artillery,
		destroyer,
		skyguard,
		raider,
		transport,
		hauler,
		serviceRover,
		sentinel,
		worker,
		interceptor,
		bomber,
		drone,
		hq,
		barracks,
		factory,
		depot,
		turret,
		wall,
		gate,
		extractor,
		reactor,
		lab,
		battery,
		workshop,
		hangar,
		flak,
		forge,
		medbay,
		shieldgen,
		salvageYard,
		outpost,
		uplink,
	};
	return {
		builders,
		// The forge's heart uses the wildlife ember material of models-3d.js.
		setEmber: (m) => (nature.ember = m),
		// The shape kit, for the detailed nature models (webgl3d/nature-detail-3d.js).
		tools: { cached, mesh, box, cyl, ball, pipe, bevelGeo, profileGeo, loftGeo, cylGeo, latheGeo, shellGeo, torusGeo, sphereGeo, odometer },
	};
}

// How strongly lit windows shine for a night level 0…1: dark by day, on from dusk.
export function windowCurve(n) {
	return Math.max(0, Math.min(1, (n - 0.15) / 0.45)) * 0.75;
}

/* Baking: the parts of a model that never move are merged into one geometry per group: the painted parts
   into one vertex-coloured mesh per finish, lit and see-through parts per material. A detailed model
   then costs a few instanced draws, not one per part. Which parts move is found by animating
   a fresh model through a range of states (moving, aiming, firing, building, working, carrying, open)
   and comparing every part's transform, visibility and material; the merged geometries are cached per
   look, so every entity of one look shares them (and the renderer's batches). */
// Noise for the surface detail of the paint (hash, 3D value noise).
const SURFACE_COMMON = `
float mdHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mdHash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float mdNoise3(vec3 p) {
	vec3 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(mdHash3(i), mdHash3(i + vec3(1, 0, 0)), f.x), mix(mdHash3(i + vec3(0, 1, 0)), mdHash3(i + vec3(1, 1, 0)), f.x), f.y),
		mix(mix(mdHash3(i + vec3(0, 0, 1)), mdHash3(i + vec3(1, 0, 1)), f.x), mix(mdHash3(i + vec3(0, 1, 1)), mdHash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`;
const SURFACE = `
float mdWear = 0.0, mdLine = 0.0, mdGrime = 0.0;
// Surface detail (0.128): armour plates with seams and slightly different shades, paint chipped off the
// bevelled edges down to bare metal, dust and dirt of the planet low on the model and streaks running down
// the walls. In the model's own frame (it does not slide when the model moves), faded with the distance.
if (surfaceOn > 0.5 && vFinish.z < 0.5 && dot(vGlow, vec3(1.0)) < 0.02) {
	vec3 n = normalize(vObjN), an = abs(n);
	float near = 1.0 - smoothstep(1000.0, 2600.0, length(vViewPosition));
	vec2 uv = an.x >= an.y && an.x >= an.z ? vObjPos.zy : an.y >= an.z ? vObjPos.xz : vObjPos.xy;
	vec2 cell = uv / vec2(9.0, 6.0), f = 0.5 - abs(fract(cell) - 0.5), fw = fwidth(cell);
	float seam = max(1.0 - smoothstep(fw.x, fw.x * 2.0 + 0.01, f.x), 1.0 - smoothstep(fw.y, fw.y * 2.0 + 0.01, f.y));
	float metal = smoothstep(0.12, 0.3, vFinish.y);
	mdLine = seam * metal * near * (1.0 - smoothstep(0.2, 0.45, max(fw.x, fw.y)));
	// Plates of slightly different shades: they still read when the seams are too fine to see.
	float shade = (mdHash(floor(cell) + floor(n.xy * 2.0 + n.z * 7.0)) - 0.5) * 0.2 * metal * near;
	// Bevels (faces between the main ones) wear first; the paint chips in patches.
	float edge = smoothstep(0.96, 0.8, max(an.x, max(an.y, an.z)));
	float chips = smoothstep(0.3, 0.55, mdNoise3(vObjPos * 0.45));
	mdWear = edge * chips * near;
	// Dust low on the model, streaks of dirt down its walls.
	float low = smoothstep(9.0, 0.0, vObjPos.y) * (0.6 + 0.4 * mdNoise3(vObjPos * 0.25));
	float streak = smoothstep(0.55, 0.8, mdNoise3(vec3(uv.x * 0.9, vObjPos.y * 0.05, n.x + n.z))) * (1.0 - an.y) * smoothstep(1.0, 8.0, vObjPos.y) * 0.75;
	// Dust settled on roofs and upper faces, in patches.
	float settled = smoothstep(0.75, 0.95, n.y) * smoothstep(0.35, 0.7, mdNoise3(vObjPos * 0.12)) * 0.55;
	mdGrime = clamp(low + streak + settled, 0.0, 1.0) * near;
	diffuseColor.rgb *= (1.0 + shade) * (1.0 - 0.38 * mdLine);
	diffuseColor.rgb = mix(diffuseColor.rgb, soilColor, mdGrime * 0.62);
	diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.62, 0.6), mdWear * 0.8);
}
`;
export function createBaker(THREE) {
	const plans = new Map(),
		merged = new Map();
	const meshesOf = (root) => {
		const list = [];
		root.traverse((o) => o.isMesh && list.push(o));
		return list;
	};
	const stateOf = (m) => [...m.position.toArray(), ...m.quaternion.toArray(), ...m.scale.toArray(), m.visible ? 1 : 0, m.material.id].map((v) => Math.round(v * 1e4)).join(",");
	// Index of every mesh that keeps its state through all the probes.
	function probe(model, e) {
		const list = meshesOf(model.root),
			first = list.map(stateOf),
			moving = new Set(),
			es = [
				{ ...e, cargo: 0, order: null, open: false, target: null, life: 0 },
				{ ...e, cargo: 6, order: { kind: "gather" }, open: true, target: e.id, life: 20 },
				{ ...e, cargo: 6, order: { kind: "repair" }, open: false, target: null, life: 20 },
			],
			infos = [
				{ time: 0, moving: false, aim: 0, recoil: 0, built: 1, working: false },
				{ time: 0.37, moving: true, aim: 0.8, recoil: 1, built: 1, working: true },
				{ time: 1.91, moving: true, aim: -1.2, recoil: 0.4, built: 0.5, working: true },
				{ time: 3.3, moving: false, aim: 2, recoil: 0, built: 0.2, working: false },
			];
		for (const ee of es)
			for (const info of infos) {
				model.update(ee, info);
				list.forEach((m, i) => stateOf(m) !== first[i] && moving.add(i));
			}
		return list.map((_, i) => !moving.has(i));
	}
	// One geometry from parts (in their parent's frame). Painted: per vertex the part's colour, finish
	// (roughness, metalness) and glow (emissive colour × intensity), so one material draws them all.
	function mergeGeometry(parts, painted) {
		const geos = parts.map((m) => {
			const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
			if (!g.attributes.normal) g.computeVertexNormals();
			return g;
		});
		const count = geos.reduce((s, g) => s + g.attributes.position.count, 0),
			pos = new Float32Array(count * 3),
			nor = new Float32Array(count * 3),
			col = painted ? new Float32Array(count * 3) : null,
			fin = painted ? new Float32Array(count * 3) : null,
			glo = painted ? new Float32Array(count * 3) : null;
		let at = 0;
		geos.forEach((g, n) => {
			const m = parts[n].material,
				k = m.userData.baseGlow ?? (m.emissiveIntensity || 0),
				vertices = g.attributes.position.count;
			pos.set(g.attributes.position.array, at * 3);
			nor.set(g.attributes.normal.array, at * 3);
			if (painted)
				for (let i = at; i < at + vertices; i++) {
					col.set([m.color.r, m.color.g, m.color.b], i * 3);
					// Finish: roughness, metalness, and 1 for windows (lit only at night).
					fin.set([m.roughness, m.metalness, m.userData.nightOnly ? 1 : 0], i * 3);
					glo.set([m.emissive.r * k, m.emissive.g * k, m.emissive.b * k], i * 3);
				}
			at += vertices;
			g.dispose();
		});
		const out = new THREE.BufferGeometry();
		out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
		out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
		if (painted) {
			out.setAttribute("color", new THREE.BufferAttribute(col, 3));
			out.setAttribute("finish", new THREE.BufferAttribute(fin, 3));
			out.setAttribute("glow", new THREE.BufferAttribute(glo, 3));
		}
		out.computeBoundingSphere();
		return out;
	}
	// The paint: one material for the merged parts of every model. Lights glow brighter at night like the
	// glowing materials of models-3d.js (same factor, set by setNight); windows only light up at night
	// (windowScale, the same curve as nightOnly materials in models-3d.js).
	const night = { value: 0.6 },
		windowLight = { value: 0 },
		PAINT = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true });
	// Weather on the models: snow settling on upward faces (roofs, hulls, turrets), a sheen when wet.
	const snowCover = { value: 0 },
		wetness = { value: 0 },
		// Surface detail of the models (stage 3 of the 3D graphics): on/off and the colour of the planet's dust.
		surfaceOn = { value: 1 },
		soilColor = { value: new THREE.Color(0.55, 0.45, 0.33) };
	PAINT.onBeforeCompile = (shader) => {
		cloudShade(THREE, shader); // drifting cloud shadows (webgl3d/sky-3d.js)
		nightLightShade(shader); // headlights and floodlights (webgl3d/night-lights-3d.js)
		shader.uniforms.glowScale = night;
		shader.uniforms.windowScale = windowLight;
		shader.uniforms.snowCover = snowCover;
		shader.uniforms.wetness = wetness;
		shader.uniforms.surfaceOn = surfaceOn;
		shader.uniforms.soilColor = soilColor;
		shader.vertexShader = shader.vertexShader
			.replace("#include <common>", "#include <common>\nattribute vec3 finish;\nattribute vec3 glow;\nvarying vec3 vFinish;\nvarying vec3 vGlow;\nvarying float vUp;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;")
			.replace("#include <begin_vertex>", "#include <begin_vertex>\nvFinish = finish;\nvGlow = glow;\nvObjPos = position;\nvObjN = normal;")
			.replace(
				"#include <defaultnormal_vertex>",
				"#include <defaultnormal_vertex>\n#ifdef USE_INSTANCING\nvUp = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal).y;\n#else\nvUp = normalize(mat3(modelMatrix) * objectNormal).y;\n#endif",
			);
		shader.fragmentShader = shader.fragmentShader
			.replace("#include <common>", "#include <common>\nuniform float glowScale;\nuniform float windowScale;\nuniform float snowCover;\nuniform float wetness;\nuniform float surfaceOn;\nuniform vec3 soilColor;\nvarying vec3 vFinish;\nvarying vec3 vGlow;\nvarying float vUp;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;\n" + SURFACE_COMMON)
			.replace("#include <color_fragment>", "#include <color_fragment>\n" + SURFACE + "\nfloat modelSnow = snowCover * smoothstep(0.6, 0.9, vUp) * step(0.5, 1.0 - vFinish.z);\ndiffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - 0.25 * wetness), vec3(0.9, 0.94, 0.98), min(1.0, modelSnow * 1.3));")
			.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(clamp(vFinish.x + mdGrime * 0.25 + mdLine * 0.1 - mdWear * 0.3, 0.05, 1.0), 0.6, min(1.0, modelSnow * 1.3)) * (1.0 - 0.45 * wetness);")
			.replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = clamp(vFinish.y + mdWear * 0.45 - mdGrime * 0.2, 0.0, 1.0);")
			.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow * mix(glowScale, windowScale, step(0.5, vFinish.z));");
	};
	PAINT.customProgramCacheKey = () => "paint|surface";
	const paintable = (m) => m.isMeshStandardMaterial && !m.transparent && !m.map;
	const signature = (parts) => parts.map((m) => m.geometry.id + ":" + m.material.id + "@" + m.matrix.elements.map((v) => Math.round(v * 1000)).join(",")).join(";");
	function bakeModel(model, key, e) {
		let plan = plans.get(key);
		if (!plan) plans.set(key, (plan = probe(model, e)));
		const list = meshesOf(model.root);
		if (list.length !== plan.length) return model; // a model that builds differently each time: leave it
		for (const m of list) m.updateMatrix();
		// Static, visible meshes grouped by parent: the painted ones into one mesh, the rest by material.
		const groups = new Map();
		list.forEach((m, i) => {
			if (!plan[i] || !m.visible || m.userData.keep) return; // keep: parts the renderer moves itself
			const g = groups.get(m.parent) || new Map(),
				slot = paintable(m.material) ? PAINT : m.material;
			groups.set(m.parent, g);
			g.set(slot, [...(g.get(slot) || []), m]);
		});
		for (const [parent, slots] of groups)
			for (const [slot, parts] of slots) {
				const painted = slot === PAINT;
				if (!painted && parts.length < 2) continue;
				// Same parts in the same places → the same geometry (all the road wheels of a tank).
				const id = signature(parts),
					geometry = merged.get(id) || merged.set(id, mergeGeometry(parts, painted)).get(id),
					one = new THREE.Mesh(geometry, slot);
				one.castShadow = one.receiveShadow = true;
				for (const m of parts) parent.remove(m);
				parent.add(one);
			}
		return model;
	}
	// Night level 0…1 (the glowing parts brighten as in models-3d.js setNight).
	bakeModel.setNight = (n) => {
		night.value = 0.6 + 1.6 * n;
		windowLight.value = windowCurve(n);
	};
	// Surface detail on or off, and the planet's dust colour (a THREE.Color).
	bakeModel.setSurface = (on, soil) => {
		surfaceOn.value = on ? 1 : 0;
		if (soil) soilColor.value.copy(soil);
	};
	bakeModel.setWeather = (snow, wet) => {
		snowCover.value = snow;
		wetness.value = wet;
	};
	return bakeModel;
}
