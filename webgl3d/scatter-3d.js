/* Ground scatter of the 3D renderer: tens of thousands of small 3D things on the ground — grass clumps,
   reeds, shrubs, ferns, rounded and angular stones, gravel, rock slabs, snow drifts, ice shards, glowing
   mushrooms, bones, cinders — so the plains are not a flat picture (the 2D ground painting leaves out its
   blades, pebbles and bones on the 3D board: RTS.bareGround). Visual only.
   - Kinds, colours and amounts follow the biome and the map theme. Plants and trees carry their shading
     in vertex colours (darker inside, underneath and at the root, lighter at the tips).
   - Placed from a seeded generator (the same for every player of a map) on a meadow field: grass grows
     in meadows, gravel and stones gather on the bare patches between them, and everything clumps. Away
     from water, obstacles, deposits, relays and the map edge; lake shores get reeds and pebbles.
   - Every instance has its own shade (instance colour), so a field of one kind is not one flat colour.
   - Grass, reeds, ferns and shrubs sway in the wind, harder in storms (tick(), in the vertex shader).
   - One InstancedMesh per kind (a dozen draws in all); only the bigger kinds cast shadows.
   - Hidden under buildings, also ones built during the game (re-checked when the set of buildings
     changes). Units walk through grass; stones are small enough to look like gravel under them.
   - The fog-of-war shader darkens them like the ground. */
export function createScatter3D(THREE, { world, heightAt, fogged }) {
	const group = new THREE.Group();
	world.add(group);

	// ---------- wind (shared by every swaying material) ----------
	const wind = { time: { value: 0 }, power: { value: 0.3 } },
		// Units pushing through the plants (0.144.2): xz, reach, strength — up to 16 near the view.
		pushers = { value: Array.from({ length: 16 }, () => new THREE.Vector4()) };
	function windy(material) {
		const before = material.onBeforeCompile;
		material.onBeforeCompile = (shader, renderer) => {
			before?.call(material, shader, renderer);
			shader.uniforms.windTime = wind.time;
			shader.uniforms.windPower = wind.power;
			shader.uniforms.pushers = pushers;
			shader.vertexShader = shader.vertexShader
				.replace("#include <common>", "#include <common>\nuniform float windTime;\nuniform float windPower;\nuniform vec4 pushers[16];")
				.replace(
					"#include <begin_vertex>",
					`#include <begin_vertex>
					#ifdef USE_INSTANCING
					vec2 root = instanceMatrix[3].xz;
					#else
					vec2 root = vec2(0.0);
					#endif
					float gust = sin(windTime * 1.6 + root.x * 0.031 + root.y * 0.023) + 0.45 * sin(windTime * 3.3 + root.x * 0.07 - root.y * 0.05);
					float bend = position.y * position.y * windPower;
					transformed.x += gust * bend * 0.22;
					transformed.z += gust * bend * 0.09;
					// Grass, reeds, ferns and shrubs bow and spread under a vehicle or a soldier pushing through
					// (not the trees).
					#ifdef USE_INSTANCING
					if (length(instanceMatrix[1].xyz) < 20.0)
						for (int i = 0; i < 16; i++) {
							vec4 pu = pushers[i];
							if (pu.z <= 0.0) break;
							float d = length(root - pu.xy);
							if (d < pu.z) {
								float f = (1.0 - d / pu.z) * pu.w;
								transformed.y *= 1.0 - f * 0.75;
								transformed.xz *= 1.0 + f * 0.5;
							}
						}
					#endif`,
				);
		};
		return material;
	}
	const std = (c, o = {}) => fogged(new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, flatShading: true, ...o }));
	// Plants and bark carry their own shading in vertex colours (darker inside and at the root, lighter at
	// the tips), multiplied by the material colour and each instance's shade.
	const plant = (c, o = {}) => windy(std(c, { side: THREE.DoubleSide, roughness: 0.85, vertexColors: true, ...o }));
	const bark = (c, o = {}) => std(c, { vertexColors: true, ...o });

	// ---------- geometry (unit size: about 1 wide, 1 tall) ----------
	let shapeSeed = 7;
	const srand = () => (shapeSeed = (Math.imul(shapeSeed, 1664525) + 1013904223) >>> 0) / 4294967296;
	// Vertex colours: a grey level or [r, g, b], or a function of the position giving one.
	function paint(g, fn) {
		const p = g.attributes.position,
			c = new Float32Array(p.count * 3);
		for (let i = 0; i < p.count; i++) {
			const v = typeof fn === "function" ? fn(p.getX(i), p.getY(i), p.getZ(i)) : fn;
			c.set(typeof v === "number" ? [v, v, v] : v, i * 3);
		}
		g.setAttribute("color", new THREE.BufferAttribute(c, 3));
		return g;
	}
	// Minimal merge of non-indexed copies (position, normal, colour — white where a part has none).
	function merge(list) {
		const parts = list.map((g) => (g.index ? g.toNonIndexed() : g)),
			count = parts.reduce((n, g) => n + g.attributes.position.count, 0),
			position = new Float32Array(count * 3),
			normal = new Float32Array(count * 3),
			color = new Float32Array(count * 3).fill(1);
		let at = 0;
		for (const g of parts) {
			g.computeVertexNormals();
			position.set(g.attributes.position.array, at * 3);
			normal.set(g.attributes.normal.array, at * 3);
			if (g.attributes.color) color.set(g.attributes.color.array, at * 3);
			at += g.attributes.position.count;
		}
		const out = new THREE.BufferGeometry();
		out.setAttribute("position", new THREE.BufferAttribute(position, 3));
		out.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
		out.setAttribute("color", new THREE.BufferAttribute(color, 3));
		return out;
	}
	// A blade: a tapering, curving strip from the root to a tip, leaning out by `lean`; dark at the root.
	function blade(h, w, lean, turn, [x, z] = [0, 0]) {
		const mid = lean * 0.35,
			pos = [-w, 0, 0, w, 0, 0, -w * 0.6, h * 0.55, mid, w * 0.6, h * 0.55, mid, 0, h, lean];
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
		g.setIndex([0, 1, 3, 0, 3, 2, 2, 3, 4]);
		paint(g, (px, py) => 0.5 + 0.65 * (py / h));
		return g.rotateY(turn).translate(x, 0, z);
	}
	// A clump of blades of different heights, leaning outwards; `heads`: a share with a seed head.
	function clump(n, { spread = 0.25, width = 0.07, lean = 0.35, low = 0.55, heads = 0 } = {}) {
		const parts = [];
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2 + srand() * 0.8,
				r = srand() * spread,
				h = low + srand() * (1 - low),
				l = lean * (0.5 + srand()),
				turn = a + Math.PI / 2;
			parts.push(blade(h, width * (0.7 + srand() * 0.6), l, turn, [Math.cos(a) * r, Math.sin(a) * r]));
			if (srand() < heads) {
				// Where the tip ends after the turn: the blade leans along its local +Z.
				const tx = Math.cos(a) * r + Math.sin(turn) * l,
					tz = Math.sin(a) * r + Math.cos(turn) * l;
				parts.push(paint(new THREE.IcosahedronGeometry(0.045, 0).scale(1, 2.6, 1).translate(tx, h + 0.06, tz), 1.35));
			}
		}
		return merge(parts);
	}
	// A rock: a polyhedron with its corners pushed in and out (corners shared by faces move together).
	function rock(base, rough, flat) {
		const g = base.index ? base.toNonIndexed() : base,
			p = g.attributes.position,
			moved = new Map();
		for (let i = 0; i < p.count; i++) {
			const key = [p.getX(i), p.getY(i), p.getZ(i)].map((v) => Math.round(v * 1000)).join(",");
			if (!moved.has(key)) moved.set(key, 1 + (srand() - 0.5) * rough);
			const k = moved.get(key);
			p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * flat, p.getZ(i) * k);
		}
		g.computeVertexNormals();
		return g;
	}
	// A fern frond: a curving spine with leaflets on both sides, shorter towards the tip.
	function frond(len, lean, turn) {
		const parts = [],
			steps = 7,
			at = (t) => [0, Math.sin(t * 1.4) * len * 0.62, t * len * lean],
			tri = (a, b, c, shade) => {
				const g = new THREE.BufferGeometry();
				g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
				return paint(g, shade);
			};
		for (let s = 0; s < steps; s++) {
			const t0 = s / steps,
				t1 = (s + 1) / steps,
				[, y0, z0] = at(t0),
				[, y1, z1] = at(t1),
				w = 0.11 * (1 - t0 * 0.75),
				shade = 0.6 + 0.5 * t0;
			for (const side of [-1, 1]) parts.push(tri([0, y0, z0], [side * w, (y0 + y1) / 2 + 0.02, (z0 + z1) / 2 + 0.03], [0, y1, z1], shade));
		}
		return merge(parts).rotateY(turn);
	}
	// Leaves of a crown: rough lumps in vertex-colour shade — darker underneath and inside, lighter on top.
	const leafShade = (cx, cy, cz, r) => (x, y, z) => {
		const up = (y - cy) / r,
			out = Math.hypot(x - cx, z - cz) / r;
		return Math.max(0.45, Math.min(1.25, 0.72 + up * 0.32 + out * 0.15));
	};
	function crown(lumps, centre, radius) {
		return merge(lumps.map(([r, [x, y, z]]) => paint(rock(new THREE.IcosahedronGeometry(r, 1), 0.42, 0.85).translate(x, y, z), leafShade(...centre, radius))));
	}
	// Lumps spread over a dome: n of them, r0…r1 big, around `centre`, `spread` wide, `flat` squashed.
	function dome(n, centre, spread, [r0, r1], flat = 0.75) {
		return Array.from({ length: n }, (_, i) => {
			const a = (i / n) * Math.PI * 2 + srand() * 0.7,
				up = i === 0 ? 1 : srand() * 0.85,
				d = i === 0 ? 0 : spread * (0.55 + srand() * 0.45) * Math.cos(up * 0.9);
			return [r0 + srand() * (r1 - r0), [centre[0] + Math.cos(a) * d, centre[1] + Math.sin(up * 1.2) * spread * flat - (1 - up) * spread * 0.25, centre[2] + Math.sin(a) * d]];
		});
	}
	// A flower: a thin stem and a head of petals in its own colours (the material is white).
	function flower(h, lean, turn, [x, z], petal, heart) {
		const stem = paint(blade(h, 0.022, lean, turn), [0.36, 0.55, 0.26]).translate(x, 0, z),
			tx = x + Math.sin(turn) * lean,
			tz = z + Math.cos(turn) * lean,
			head = [paint(new THREE.CylinderGeometry(0.15, 0.04, 0.06, 7).translate(tx, h, tz), petal), paint(new THREE.IcosahedronGeometry(0.055, 0).translate(tx, h + 0.04, tz), heart)];
		return merge([stem, ...head]);
	}
	const flowers = (petal, heart) =>
		merge([
			// Leaves round the stems, green (the material is white).
			paint(clump(5, { spread: 0.2, width: 0.05, lean: 0.25, low: 0.4 }).scale(1, 0.6, 1), (x, y) => {
				const t = 0.5 + 1.1 * y;
				return [0.34 * t, 0.52 * t, 0.24 * t];
			}),
			...Array.from({ length: 5 }, (_, i) => {
				const a = (i / 5) * Math.PI * 2 + srand() * 0.6;
				return flower(0.45 + srand() * 0.5, 0.15 + srand() * 0.18, a, [Math.cos(a) * 0.32, Math.sin(a) * 0.32], petal(), heart);
			}),
		]);
	const geo = {
		grass: clump(11),
		tallGrass: clump(14, { spread: 0.3, width: 0.05, lean: 0.25, low: 0.6, heads: 0.45 }),
		reeds: merge([clump(10, { spread: 0.2, width: 0.04, lean: 0.12, low: 0.7 }), ...[0, 1].map((i) => paint(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 5).translate(i ? 0.08 : -0.06, 0.82 + i * 0.08, i ? 0.03 : -0.02), [0.55, 0.4, 0.28]))]),
		fern: merge(Array.from({ length: 7 }, (_, i) => frond(0.62 + srand() * 0.25, 0.75 + srand() * 0.2, (i / 7) * Math.PI * 2 + srand() * 0.4))),
		shrub: merge([
			...Array.from({ length: 5 }, (_, i) => paint(new THREE.CylinderGeometry(0.02, 0.05, 0.6, 4).translate(0, 0.3, 0).rotateZ(0.45 + srand() * 0.3).rotateY((i / 5) * Math.PI * 2), [0.5, 0.42, 0.34])),
			crown(dome(13, [0, 0.42, 0], 0.36, [0.12, 0.2], 0.9), [0, 0.42, 0], 0.4),
		]),
		flowersWarm: flowers(() => (srand() < 0.5 ? [1, 0.55, 0.7] : [1, 0.82, 0.3]), [1, 0.9, 0.4]),
		flowersCool: flowers(() => (srand() < 0.5 ? [0.95, 0.95, 1] : [0.7, 0.55, 1]), [1, 0.85, 0.35]),
		stone: rock(new THREE.IcosahedronGeometry(1, 1), 0.35, 0.72),
		angular: rock(new THREE.DodecahedronGeometry(1, 0), 0.4, 0.8),
		slab: rock(new THREE.CylinderGeometry(1, 1.1, 0.4, 7), 0.3, 1),
		pebble: rock(new THREE.IcosahedronGeometry(1, 0), 0.3, 0.6),
		drift: new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2),
		shard: merge([0, 1, 2].map((i) => new THREE.ConeGeometry(0.22, 1 - i * 0.25, 5).translate(0, 0.5 - i * 0.12, 0).rotateZ((i - 1) * 0.35).translate((i - 1) * 0.2, 0, 0))),
		cap: merge([new THREE.CylinderGeometry(0.12, 0.16, 0.8, 5).translate(0, 0.4, 0), new THREE.SphereGeometry(0.45, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1).translate(0, 0.8, 0)]),
		bone: merge([new THREE.CylinderGeometry(0.07, 0.07, 1, 5).rotateZ(Math.PI / 2), ...[-0.5, 0.5].map((x) => new THREE.SphereGeometry(0.13, 5, 4).translate(x, 0, 0.06)), ...[-0.5, 0.5].map((x) => new THREE.SphereGeometry(0.13, 5, 4).translate(x, 0, -0.06))]).translate(0, 0.08, 0),
		scrap: rock(new THREE.BoxGeometry(1, 0.25, 0.6), 0.5, 1),
	};
	// ---------- trees (unit height; trunk and crown are separate instanced draws sharing the placement) ----------
	const rod = (r0, r1, a, b, seg = 6) => {
		const A = new THREE.Vector3(...a),
			B = new THREE.Vector3(...b),
			g = new THREE.CylinderGeometry(r1, r0, A.distanceTo(B), seg).translate(0, A.distanceTo(B) / 2, 0);
		g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
		return g.translate(...a);
	};
	// Bark darker at the foot (the ground's shade), lighter up the limbs.
	const barkShade = (top) => (x, y) => Math.min(1.1, 0.62 + (y / top) * 0.5);
	const branches = (list, top = 0.7) => merge(list.map(([r0, r1, a, b]) => paint(rod(r0, r1, a, b), barkShade(top))));
	// Roots: short flaring rods round the foot of a trunk.
	const roots = (r, n = 4) => Array.from({ length: n }, (_, i) => {
		const a = (i / n) * Math.PI * 2 + srand() * 0.5;
		return [r * 0.9, r * 0.3, [0, 0.06, 0], [Math.cos(a) * r * 3.2, -0.01, Math.sin(a) * r * 3.2]];
	});
	// A pine crown: tiers of drooping, ragged branch whorls (every other rim point pulled in), each tier
	// turned a little; dark inside and below, lighter at the tips.
	function pineCrown(tiers = 7) {
		const parts = [];
		for (let i = 0; i < tiers; i++) {
			const f = i / tiers,
				r = 0.4 * Math.pow(1 - f, 0.85) + 0.05,
				h = 0.24,
				y = 0.2 + f * 0.62,
				seg = 10,
				g = new THREE.ConeGeometry(r, h, seg, 1).toNonIndexed(),
				p = g.attributes.position;
			for (let k = 0; k < p.count; k++) {
				const px = p.getX(k),
					py = p.getY(k),
					pz = p.getZ(k);
				if (py > -h / 2 + 1e-4) continue;
				const a = Math.atan2(pz, px),
					step = Math.round((a / (Math.PI * 2)) * seg + seg) % 2,
					rr = Math.hypot(px, pz),
					s = step ? 0.68 : 1 + (srand() - 0.5) * 0.12;
				p.setXYZ(k, px * s, py - (rr > r * 0.5 ? 0.05 * s : 0), pz * s);
			}
			g.rotateY(srand() * Math.PI).translate(0, y + h / 2, 0);
			parts.push(paint(g, (x, py, z) => Math.min(1.25, (0.55 + 0.6 * Math.hypot(x, z) / r) * (0.82 + 0.25 * f))));
		}
		return merge(parts);
	}
	const TREE_GEO = {
		pineTrunk: branches([[0.055, 0.03, [0, 0, 0], [0, 0.45, 0]], ...roots(0.05, 3)], 0.45),
		pineCrown: pineCrown(),
		// Snow lying on the upper side of every other tier (where the tier is as wide as the cap).
		snowCaps: merge(
			[1, 3, 5, 6].map((i) => {
				const f = i / 7,
					r = 0.4 * Math.pow(1 - f, 0.85) + 0.05;
				return new THREE.ConeGeometry(r * 0.62, 0.09, 10).translate(0, 0.2 + f * 0.62 + 0.24 * 0.42, 0);
			}),
		),
		broadTrunk: branches([
			[0.065, 0.045, [0, 0, 0], [0.03, 0.46, 0]],
			[0.04, 0.022, [0.03, 0.4, 0], [0.24, 0.62, 0.06]],
			[0.04, 0.022, [0.03, 0.44, 0], [-0.2, 0.64, -0.1]],
			[0.035, 0.02, [0.03, 0.46, 0], [0.04, 0.7, 0.2]],
			...roots(0.06),
		]),
		broadCrown: crown(dome(12, [0.02, 0.7, 0], 0.32, [0.13, 0.22], 0.8), [0.02, 0.7, 0], 0.36),
		acaciaTrunk: branches([
			[0.05, 0.035, [0, 0, 0], [0.1, 0.42, 0]],
			[0.032, 0.018, [0.1, 0.42, 0], [0.36, 0.72, 0.1]],
			[0.032, 0.018, [0.1, 0.42, 0], [-0.16, 0.74, -0.14]],
			[0.028, 0.016, [0.1, 0.42, 0], [0.12, 0.76, 0.26]],
			[0.022, 0.012, [0.24, 0.58, 0.06], [0.42, 0.66, -0.16]],
			...roots(0.05, 3),
		]),
		// Umbrella canopy: overlapping flat pads, ragged rims, darker underneath.
		acaciaCrown: merge(
			[
				[0.3, [0.32, 0.76, 0.08]],
				[0.26, [-0.14, 0.78, -0.12]],
				[0.24, [0.12, 0.82, 0.26]],
				[0.22, [0.1, 0.86, -0.06]],
				[0.2, [0.44, 0.7, -0.16]],
			].map(([r, [x, y, z]]) => paint(rock(new THREE.CylinderGeometry(r, r * 0.85, 0.09, 9), 0.35, 1).translate(x, y, z), (px, py) => (py > y ? 1.1 : 0.62))),
		),
		dead: branches(
			(() => {
				// Trunk and two orders of limbs, thinner and shorter each order.
				const list = [[0.06, 0.035, [0, 0, 0], [0.02, 0.6, 0]], ...roots(0.055)];
				const grow = (from, dir, len, r, order) => {
					const to = [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len];
					list.push([r, r * 0.55, from, to]);
					if (order < 2)
						for (let k = 0; k < 2; k++) {
							const a = srand() * Math.PI * 2;
							grow(to, [dir[0] * 0.6 + Math.cos(a) * 0.5, dir[1] * 0.7 + 0.3, dir[2] * 0.6 + Math.sin(a) * 0.5], len * 0.55, r * 0.5, order + 1);
						}
				};
				for (const [y, a] of [[0.32, 0.4], [0.44, 2.6], [0.56, 4.4]]) grow([0.02, y, 0], [Math.cos(a) * 0.75, 0.6, Math.sin(a) * 0.75], 0.24, 0.03, 0);
				grow([0.02, 0.6, 0], [0.15, 1, -0.1], 0.2, 0.025, 1);
				return list;
			})(),
		),
		fungalStem: branches([[0.05, 0.04, [0, 0, 0], [0.04, 0.5, 0]], [0.04, 0.03, [0.04, 0.5, 0], [-0.02, 0.85, 0.03]], ...roots(0.04, 3)], 0.85),
		fungalCap: merge([
			paint(new THREE.SphereGeometry(0.3, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(-0.02, 0.84, 0.03), (x, y) => 0.8 + (y - 0.84) * 2.5),
			// Gills under the cap.
			paint(new THREE.CylinderGeometry(0.29, 0.06, 0.05, 16, 1, true).translate(-0.02, 0.82, 0.03), 0.55),
			...[0, 1, 2, 3].map((i) => new THREE.SphereGeometry(0.06, 6, 4).translate(Math.cos(i * 1.6) * 0.08, 0.3 + i * 0.12, Math.sin(i * 1.6) * 0.08)),
		]),
	};
	const TREES = {
		pine: () => [[TREE_GEO.pineTrunk, bark("#4a3a2a")], [TREE_GEO.pineCrown, plant("#3f6a3c")]],
		broad: () => [[TREE_GEO.broadTrunk, bark("#5a4632")], [TREE_GEO.broadCrown, plant("#64924a")]],
		snowPine: () => [[TREE_GEO.pineTrunk, bark("#3e3428")], [TREE_GEO.pineCrown, plant("#335240")], [TREE_GEO.snowCaps, plant("#eef4f6", { roughness: 0.7 })]],
		acacia: (dusty) => [[TREE_GEO.acaciaTrunk, bark("#6a5236")], [TREE_GEO.acaciaCrown, plant(dusty ? "#82803f" : "#6e8640")]],
		dead: (charred) => [[TREE_GEO.dead, bark(charred ? "#2a2321" : "#6b5a46")]],
		fungal: () => [[TREE_GEO.fungalStem, bark("#cfc6b0")], [TREE_GEO.fungalCap, plant("#6ff2e0", { emissive: "#2fb8a8", emissiveIntensity: 0.55 })]],
	};
	// Placement of a kind on the ground: how it sits, scales and turns.
	const SHAPE = {
		grass: { sink: 0.3, tall: 1, tilt: 0.15 },
		tallGrass: { sink: 0.3, tall: 1, tilt: 0.12 },
		reeds: { sink: 0.5, tall: 1, tilt: 0.1 },
		fern: { sink: 0.3, tall: 1, tilt: 0.15 },
		flowersWarm: { sink: 0.3, tall: 1, tilt: 0.15 },
		flowersCool: { sink: 0.3, tall: 1, tilt: 0.15 },
		shrub: { sink: 0.5, tall: 1, tilt: 0.2 },
		stone: { sink: 0.3, tall: 0.75, tilt: 0.8 },
		angular: { sink: 0.35, tall: 0.8, tilt: 0.9 },
		slab: { sink: 0.15, tall: 0.5, tilt: 0.25 },
		pebble: { sink: 0.2, tall: 0.6, tilt: 1.2 },
		drift: { sink: 0.25, tall: 0.35, tilt: 0.1, deep: 0.7 },
		shard: { sink: 0.1, tall: 1.4, tilt: 0.5 },
		cap: { sink: 0.4, tall: 1, tilt: 0.25 },
		bone: { sink: 0.05, tall: 1, tilt: 0.3, flat: true },
		scrap: { sink: 0.1, tall: 1, tilt: 0.6 },
		tree: { sink: 0.04, tall: 1, tilt: 0.06 },
	};

	// What grows or lies where: [shape, material, count per 3360 × 2160, size range, where, shadow, shade].
	// where: "meadow" (in the grass field), "bare" (between the meadows), "any"; shade: brightness spread.
	function palette(biome, theme) {
		const dusty = theme === "goldsand" || theme === "twinsun" || theme === "dunesea";
		if (theme === "lumen")
			return [
				["grass", plant("#3f8f7a"), 3600, [5, 10], "meadow", false, 0.25],
				["fern", plant("#2f7d6a"), 1100, [7, 13], "meadow", false, 0.2],
				["cap", std("#6ff2e0", { emissive: "#2fb8a8", emissiveIntensity: 0.6 }), 700, [4, 8], "meadow", false, 0.15],
				["cap", std("#c68cff", { emissive: "#8a4ad0", emissiveIntensity: 0.5 }), 350, [4, 7], "meadow", false, 0.15],
				["stone", std("#3b4544"), 800, [3, 7], "bare", true, 0.2],
				["pebble", std("#34403e"), 2200, [1.4, 3.4], "bare", false, 0.25],
				["tree", TREES.fungal(), 110, [26, 42], "meadow", true, 0.15],
			];
		if (theme === "skyfall")
			return [
				["grass", plant("#7f9f62"), 4200, [5, 11], "meadow", false, 0.25],
				["tallGrass", plant("#8faa6a"), 900, [8, 15], "meadow", false, 0.2],
				["shrub", plant("#5f7a48"), 500, [7, 13], "any", true, 0.2],
				["fern", plant("#58804a"), 500, [7, 12], "meadow", false, 0.2],
				["flowersWarm", plant("#ffffff"), 450, [5, 9], "meadow", false, 0.15],
				["flowersCool", plant("#ffffff"), 350, [5, 9], "meadow", false, 0.15],
				["stone", std("#8a8f86"), 900, [3, 8], "bare", true, 0.2],
				["pebble", std("#7c8079"), 2500, [1.4, 3.4], "bare", false, 0.25],
				["tree", TREES.broad(), 140, [28, 44], "meadow", true, 0.2],
				["tree", TREES.pine(), 120, [30, 48], "any", true, 0.15],
			];
		if (biome === "ice")
			return [
				["drift", std("#e4eef2", { roughness: 0.7 }), 900, [8, 22], "any", true, 0.08],
				["stone", std("#8d9ea8"), 1300, [3, 8], "bare", true, 0.2],
				["angular", std("#7a8a94"), 400, [6, 12], "bare", true, 0.15],
				["pebble", std("#9aabb4"), 2600, [1.4, 3.4], "bare", false, 0.2],
				["shard", std("#bfe6f2", { roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }), 500, [4, 10], "any", true, 0.1],
				["grass", plant("#9aa7a0"), 900, [4, 7], "meadow", false, 0.2],
				["tree", TREES.snowPine(), 150, [28, 46], "any", true, 0.12],
			];
		if (biome === "ash") {
			const list = [
				["stone", std(theme === "magma" ? "#2f2928" : "#3e3836"), 2000, [3, 9], "any", true, 0.25],
				["angular", std(theme === "magma" ? "#241f1f" : "#332e2c"), 700, [6, 13], "bare", true, 0.2],
				["pebble", std(theme === "magma" ? "#2a2424" : "#3a3533"), 4500, [1.4, 3.6], "any", false, 0.3],
				["grass", plant(theme === "derelict" ? "#5c6b52" : "#5a524a"), 900, [4, 8], "meadow", false, 0.25],
				["shard", std("#4a4240"), 400, [4, 9], "bare", true, 0.2],
			];
			if (theme === "magma") list.push(["pebble", std("#ff7a2e", { emissive: "#ff5a12", emissiveIntensity: 1.1 }), 500, [1.4, 3.2], "bare", false, 0.2]);
			if (theme === "derelict") list.push(["scrap", std("#4c5052", { roughness: 0.6, metalness: 0.6 }), 350, [4, 10], "any", true, 0.25]);
			list.push(["tree", TREES.dead(true), theme === "magma" ? 40 : 60, [22, 36], "any", true, 0.15]);
			return list;
		}
		const list = [
			["pebble", std(dusty ? "#a48a5c" : "#8a7356"), 5000, [1.4, 3.6], "bare", false, 0.25],
			["stone", std(dusty ? "#a48a5c" : "#8a7356"), 1500, [3, 8], "bare", true, 0.22],
			["angular", std("#6d5d48"), 500, [6, 12], "bare", true, 0.18],
			["slab", std(dusty ? "#9c8158" : "#7c6a52"), 160, [9, 17], "bare", true, 0.15],
			["grass", plant(dusty ? "#b39a52" : "#8a8a4e"), dusty ? 900 : 2600, [5, 10], "meadow", false, 0.25],
			["tallGrass", plant(dusty ? "#c2a65c" : "#93924f"), dusty ? 200 : 600, [9, 15], "meadow", false, 0.2],
			["shrub", plant(dusty ? "#7d6a3e" : "#6a6a3a"), dusty ? 250 : 450, [7, 13], "any", true, 0.2],
		];
		if (!dusty) list.push(["flowersWarm", plant("#ffffff"), 260, [5, 9], "meadow", false, 0.15]);
		if (dusty) list.push(["bone", std("#e2d6ba", { roughness: 0.7 }), 140, [5, 9], "bare", false, 0.1]);
		list.push(["tree", TREES.dead(false), dusty ? 30 : 40, [22, 34], "any", true, 0.15]);
		if (!dusty) list.push(["tree", TREES.acacia(false), 60, [26, 40], "meadow", true, 0.15]);
		else if (theme === "twinsun") list.push(["tree", TREES.acacia(true), 30, [24, 36], "any", true, 0.15]);
		return list;
	}
	// Shore of lakes: reeds and pebbles in a ring along the water (not on ice: frozen shores stay bare).
	const shorePalette = (biome) =>
		biome === "ice"
			? [["pebble", std("#9aabb4"), 50, [1.4, 3.4], 0.95, 1.2, false, 0.2]]
			: [
					["reeds", plant(biome === "ash" ? "#5f6a4c" : "#6f8a4a"), 26, [9, 15], 0.92, 1.12, false, 0.2],
					["pebble", std(biome === "ash" ? "#3a3533" : "#8a8070"), 60, [1.4, 3.6], 0.98, 1.25, false, 0.25],
				];

	let batches = [],
		buildingsKey = "";
	function clear() {
		for (const b of batches) {
			group.remove(b.mesh);
			b.mesh.dispose();
		}
		batches = [];
		buildingsKey = "";
	}
	// density: share of the full count (graphics settings: terrain detail).
	function setGame(game, density = 1) {
		clear();
		const mission = RTS.MISSIONS[game.missionId] || {},
			area = (game.W * game.H) / (3360 * 2160);
		let seed = [...String(game.missionId)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 99991) >>> 0;
		const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
		// The meadow field (0…1): a few seeded waves; grass where it is high, bare ground where it is low.
		const phases = Array.from({ length: 6 }, () => rand() * Math.PI * 2);
		const meadow = (x, y) =>
			0.5 + 0.22 * Math.sin(x * 0.0041 + phases[0]) * Math.cos(y * 0.0037 + phases[1]) + 0.18 * Math.sin((x + y) * 0.0023 + phases[2]) + 0.1 * Math.sin(x * 0.011 - y * 0.009 + phases[3]);
		const keepOut = [
			...(game.ores || []).map((o) => [o.x, o.y, 70]),
			...(game.gasFields || []).map((o) => [o.x, o.y, 70]),
			...(game.crystalFields || []).map((o) => [o.x, o.y, 60]),
			...(game.nodes || []).map((n) => [n.x, n.y, 60]),
		];
		// Trees also keep off the bases and the relays (room to build, nothing tall over the action).
		const treeOut = [...game.entities.filter((e) => !RTS.TYPES[e.type]?.speed).map((e) => [e.x, e.y, e.type === "hq" ? 320 : 140]), ...(game.nodes || []).map((n) => [n.x, n.y, 160])];
		// Dunes are sand ridges (waters of kind "dune" only for the 2D art): things lie on them too.
		const wet = (game.waters || []).filter((w) => w.kind !== "dune"),
			dry = (x, y, margin) => !wet.some((w) => RTS.waterContains(w, x, y, margin));
		// Dune crests block movement, but they are sand: scatter lies on them.
		const dunes = (game.waters || []).filter((w) => w.kind === "dune"),
			onDune = (x, y) => dunes.some((w) => RTS.waterContains(w, x, y, 0));
		const free = (x, y, r, margin = 20) =>
			x > 30 &&
			y > 30 &&
			x < game.W - 30 &&
			y < game.H - 30 &&
			(!game.blocked(x, y, r + 6) || onDune(x, y)) &&
			dry(x, y, margin) &&
			!keepOut.some(([ox, oy, kr]) => Math.hypot(x - ox, y - oy) < kr);
		const fits = (where, x, y) => {
			if (where === "any") return true;
			const m = meadow(x, y);
			return where === "meadow" ? rand() < (m - 0.35) * 2.2 : rand() < (0.75 - m) * 2.2;
		};
		const kinds = [];
		for (const [shape, material, perMap, size, where, shadow, shade] of palette(mission.biome, mission.theme)) {
			// Small things in thick fields, big ones sparser (the counts above are per kind).
			const count = Math.round(perMap * area * density * (size[1] >= 9 ? 1.5 : 3)),
				spots = [];
			for (let tries = 0; spots.length < count && tries < count * 6; tries++) {
				const s = size[0] + rand() * (size[1] - size[0]);
				let x, y;
				// Clumps: things gather near each other more often than not.
				if (spots.length && rand() < 0.55) {
					const near = spots[Math.floor(rand() * spots.length)];
					x = near.x + (rand() - 0.5) * 50;
					y = near.y + (rand() - 0.5) * 50;
				} else {
					x = rand() * game.W;
					y = rand() * game.H;
					if (!fits(where, x, y)) continue;
				}
				if (shape === "tree" && treeOut.some(([ox, oy, kr]) => Math.hypot(x - ox, y - oy) < kr)) continue;
				if (free(x, y, shape === "tree" ? s * 0.3 : s)) spots.push({ x, y, size: s, turn: rand() * 6.28, tilt: rand(), shade: 1 + (rand() - 0.5) * 2 * shade });
			}
			kinds.push({ shape, material, shadow, spots });
		}
		// Lake shores.
		for (const [shape, material, perLake, [lo, hi], inner, outer, shadow, shade] of shorePalette(mission.biome)) {
			const spots = [];
			for (const w of (game.waters || []).filter((w) => !w.kind)) {
				const n = Math.round(perLake * Math.sqrt((w.rx * w.ry) / 9000) * density);
				for (let i = 0; i < n; i++) {
					const a = rand() * Math.PI * 2,
						r = RTS.waterRadius(w, a) * (inner + rand() * (outer - inner)),
						x = w.x + Math.cos(a) * w.rx * r,
						y = w.y + Math.sin(a) * w.ry * r,
						s = lo + rand() * (hi - lo);
					if (free(x, y, s, 2)) spots.push({ x, y, size: s, turn: rand() * 6.28, tilt: rand(), shade: 1 + (rand() - 0.5) * 2 * shade });
				}
			}
			kinds.push({ shape, material, shadow, spots });
		}
		const matrix = new THREE.Matrix4(),
			q = new THREE.Quaternion(),
			e = new THREE.Euler(),
			p = new THREE.Vector3(),
			s = new THREE.Vector3(),
			tint = new THREE.Color();
		for (const { shape, material, shadow, spots } of kinds) {
			if (!spots.length) continue;
			// A tree is several parts (trunk, crown, snow), each its own draw over the same placements.
			for (const [g, m] of shape === "tree" ? material : [[geo[shape], material]]) addBatch(shape, g, m, shadow, spots);
		}
		function addBatch(shape, geometry, material, shadow, spots) {
			const k = SHAPE[shape],
				mesh = new THREE.InstancedMesh(geometry, material, spots.length);
			// Only the bigger kinds cast shadows; thousands of pebbles and blades in the shadow map cost more
			// on the graphics card than they show.
			mesh.castShadow = shadow;
			mesh.receiveShadow = true;
			mesh.frustumCulled = false;
			spots.forEach((o, i) => {
				const h = o.size * k.tall * (0.75 + o.tilt * 0.5);
				o.matrix = matrix
					.compose(
						p.set(o.x, heightAt(o.x, o.y) - o.size * k.sink * 0.4, o.y),
						q.setFromEuler(e.set(k.flat ? 0 : (o.tilt - 0.5) * k.tilt, o.turn, (o.tilt - 0.5) * k.tilt * 0.5)),
						s.set(o.size, h, o.size * (k.deep ?? 1)),
					)
					.clone();
				mesh.setMatrixAt(i, o.matrix);
				mesh.setColorAt(i, tint.setScalar(o.shade));
			});
			mesh.count = spots.length;
			group.add(mesh);
			batches.push({ mesh, spots, tree: shape === "tree" });
		}
	}
	// Hides what lies under buildings (zero scale), re-checked when the buildings change.
	const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
	// Blasts (0.144.2): trees within a crater's reach fall away from it and stay down; the small plants in
	// the crater itself are gone.
	const cratersDone = new WeakSet(),
		fallQ = new THREE.Quaternion(),
		turnQ = new THREE.Quaternion(),
		fallAxis = new THREE.Vector3(),
		fp = new THREE.Vector3(),
		fs = new THREE.Vector3();
	function blasts(game) {
		let changed = false;
		for (const k of game.craters || []) {
			if (cratersDone.has(k)) continue;
			cratersDone.add(k);
			const reach = (k.size || 20) * 1.6 + 14;
			for (const b of batches)
				for (const o of b.spots) {
					if (o.fallen || o.gone) continue;
					const dx = o.x - k.x,
						dy = o.y - k.y,
						d = Math.hypot(dx, dy);
					if (d > reach) continue;
					if (b.tree) {
						const a = Math.atan2(dy, dx);
						fallAxis.set(Math.sin(a), 0, -Math.cos(a));
						o.matrix.decompose(fp, turnQ, fs);
						fallQ.setFromAxisAngle(fallAxis, 1.35 + (o.tilt - 0.5) * 0.3).multiply(turnQ);
						o.matrix = new THREE.Matrix4().compose(fp.setY(fp.y - o.size * 0.08), fallQ, fs);
						o.fallen = true;
					} else if (d < reach * 0.55) {
						o.matrix = hidden;
						o.gone = true;
					}
					changed = true;
				}
		}
		if (!changed) return;
		for (const { mesh, spots } of batches) {
			spots.forEach((o, i) => mesh.setMatrixAt(i, o.matrix));
			mesh.instanceMatrix.needsUpdate = true;
		}
		buildingsKey = null;
	}
	function update(game) {
		blasts(game);
		const buildings = game.entities.filter((e) => e.hp > 0 && !RTS.TYPES[e.type]?.speed);
		const key = buildings.map((b) => b.id).join(",");
		if (key === buildingsKey) return;
		buildingsKey = key;
		const under = (o) => buildings.some((b) => Math.hypot(o.x - b.x, o.y - b.y) < RTS.TYPES[b.type].radius * 1.25 + o.size);
		for (const { mesh, spots } of batches) {
			spots.forEach((o, i) => mesh.setMatrixAt(i, under(o) ? hidden : o.matrix));
			mesh.instanceMatrix.needsUpdate = true;
		}
	}
	// Each frame: the wind (time, and how hard it blows: a breeze, a gale in storms).
	function tick(time, weather = {}, push = []) {
		wind.time.value = time;
		for (let i = 0; i < 16; i++) (i < push.length ? pushers.value[i].fromArray(push[i]) : pushers.value[i].set(0, 0, 0, 0));
		const storm = weather.kind ? weather.intensity || 0 : 0;
		wind.power.value += (0.3 + storm * (weather.kind === "snow" ? 0.6 : 1.2) - wind.power.value) * 0.05;
	}
	// One of each tree and plant as plain meshes, for the model gallery: [name, group].
	function specimens() {
		const one = (name, parts, size) => {
			const g = new THREE.Group();
			for (const [geometry, material] of parts) g.add(new THREE.Mesh(geometry, material));
			g.scale.setScalar(size);
			return [name, g];
		};
		return [
			one("Sosna", TREES.pine(), 42),
			one("Sosna w śniegu", TREES.snowPine(), 42),
			one("Drzewo liściaste", TREES.broad(), 40),
			one("Akacja", TREES.acacia(false), 38),
			one("Martwe drzewo", TREES.dead(false), 32),
			one("Grzyb olbrzymi", TREES.fungal(), 38),
			one("Trawa", [[geo.grass, plant("#8a8a4e")]], 12),
			one("Wysoka trawa", [[geo.tallGrass, plant("#93924f")]], 15),
			one("Paproć", [[geo.fern, plant("#58804a")]], 14),
			one("Krzew", [[geo.shrub, plant("#6a6a3a")]], 14),
			one("Kwiaty", [[geo.flowersWarm, plant("#ffffff")]], 12),
			one("Kwiaty", [[geo.flowersCool, plant("#ffffff")]], 12),
			one("Trzciny", [[geo.reeds, plant("#6f8a4a")]], 14),
		];
	}
	return {
		setGame,
		update,
		tick,
		specimens,
		stats: () => ({ scatter: batches.reduce((n, b) => n + b.spots.length, 0) }),
	};
}
