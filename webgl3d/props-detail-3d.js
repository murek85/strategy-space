/* Detailed props of the 3D board: the obstacles that are not plain rock (a crashed ship and its debris
   field, an alien carcass, ruins, resin, egg clutches, a processing plant), the floating islands and the
   wrecks of destroyed units. Built with the shape kit of models-detail-3d.js and the stones and limbs of
   nature-detail-3d.js; models-3d.js bakes them (each obstacle and island is merged into a few meshes).
   Sizes follow the obstacle's raised ground (w × h on the map), so nothing hangs over passable ground.
   Local frame: +X east, +Y up, +Z south (map y). */
export function createProps3D(THREE, { tools, nature: kit, group, materials }) {
	const { mesh, box, cyl, ball, pipe, loftGeo, latheGeo, shellGeo, torusGeo, profileGeo } = tools,
		{ prop, scenery, std } = materials,
		n2 = (v) => Math.round(v * 100) / 100,
		glass = std("#18252b", { roughness: 0.2, metalness: 0.7 }),
		hullDark = std("#3d4245", { roughness: 0.7, metalness: 0.5 }),
		burnt = std("#221e1c", { roughness: 0.95, metalness: 0.2 }),
		stoneDark = std("#6f7a80", { roughness: 1, metalness: 0 }),
		lamp = std("#ffd27a", { emissive: "#ffb347", emissiveIntensity: 1.1 }),
		amberDark = std("#5a3410", { roughness: 0.4, metalness: 0 }),
		vein = std("#4f5a3a", { roughness: 0.6, metalness: 0, emissive: "#2f4a22", emissiveIntensity: 0.35 }),
		moss = std("#2f6b5a", { roughness: 1, metalness: 0 }),
		pine = std("#3c5e3a", { roughness: 0.9, metalness: 0 }),
		bark = std("#4a3a2a", { roughness: 1, metalness: 0 });
	const ring = (x, w, h, y = 0, n = 10, flat = 1) =>
		Array.from({ length: n }, (_, i) => {
			const a = (i / n) * Math.PI * 2,
				yy = Math.sin(a) * h;
			return [n2(x), n2(y + (yy < 0 ? yy * flat : yy)), n2(Math.cos(a) * w)];
		});
	// An arc of a ring (ribs, arches): radius r, tube t, the part of the circle `arc`, standing in the YZ plane.
	const arcGeo = (r, t, arc) => tools.cached(`arc${n2(r)},${n2(t)},${n2(arc)}`, () => new THREE.TorusGeometry(r, t, 5, 12, arc).rotateY(Math.PI / 2));

	// ---------- a crashed ship ----------
	function wreck(root, w, h, rnd, rock) {
		const L = w * 0.78,
			R = h * 0.21,
			hull = group(root, [0, R * 0.35, 0]);
		hull.rotation.set(0.14, 0.25, 0.08);
		// The fore hull, whole: a long body narrowing to the nose, flattened belly.
		mesh(hull, loftGeo(`wreckhull${n2(L)},${n2(R)}`, [[0.5, 0.12, 0.1], [0.42, 0.55, 0.5], [0.3, 0.92, 0.85], [0.05, 1, 0.95], [-0.12, 1, 0.95], [-0.2, 0.96, 0.9]].map(([x, k, kh]) => ring(x * L, k * R, kh * R, 0, 10, 0.55))), prop.metal);
		// Panel seams and a stripe along the side.
		for (let i = 0; i < 4; i++) cyl(hull, hullDark, R * (0.97 - (i === 0 ? 0.2 : 0)), 0.8, [L * (0.3 - i * 0.12), 0, 0], { axis: "x", segs: 10 });
		box(hull, prop.rust, [L * 0.5, R * 0.18, 0.6], [L * 0.05, R * 0.35, R * 0.97], [0.15, 0, 0], 0.2);
		ball(hull, glass, R * 0.42, [L * 0.36, R * 0.55, 0], [1.8, 0.6, 0.9]); // cockpit canopy
		// The broken stern: bare ribs, a keel and a few torn plates.
		for (let i = 0; i < 5; i++) mesh(hull, arcGeo(R * (0.95 - i * 0.04), R * 0.06, Math.PI * (1.25 - i * 0.12)), i % 2 ? prop.rust : hullDark, [-L * (0.24 + i * 0.065), 0, 0], [0.4 + i * 0.25, 0, 0]);
		pipe(hull, hullDark, [-L * 0.2, -R * 0.5, 0], [-L * 0.52, -R * 0.45, R * 0.1], R * 0.1);
		for (let i = 0; i < 3; i++) box(hull, prop.metal, [L * 0.08, R * 0.05, R * 0.6], [-L * (0.26 + i * 0.08), R * (0.55 - i * 0.2), (i % 2 ? -1 : 1) * R * 0.6], [0.6 * (i % 2 ? -1 : 1), 0, 0.3], 0.1);
		// A fin torn half off, an engine lying apart.
		mesh(hull, profileGeo([[0, 0], [L * 0.16, 0], [L * 0.04, R * 1.3], [-L * 0.03, R * 1.3]], 2, 0.4), prop.rust, [-L * 0.14, R * 0.8, 0], [0.5, 0, 0]);
		const engine = group(root, [-w * 0.36, R * 0.55, h * 0.24]);
		engine.rotation.set(0, 0.9, 0.2);
		cyl(engine, hullDark, R * 0.5, L * 0.22, [0, 0, 0], { axis: "x", top: R * 0.42, segs: 12 });
		cyl(engine, burnt, R * 0.42, R * 0.3, [-L * 0.12, 0, 0], { axis: "x", segs: 12 });
		for (let i = 0; i < 3; i++) mesh(engine, torusGeo(n2(R * 0.5), R * 0.04, 12, "x"), prop.rust, [L * (0.06 - i * 0.06), 0, 0]);
		// Sand and stones piled against the hull.
		for (let i = 0; i < 6; i++) {
			const a = rnd(i + 30) * Math.PI * 2;
			kit.stone(root, rock, [Math.cos(a) * w * 0.32, -2, Math.sin(a) * h * 0.3], [h * 0.12, h * 0.06, h * 0.1], i);
		}
		debris(root, w, h, rnd, 4, 0.8);
	}
	// A debris field: bent hull plates, beams, a pipe, half buried.
	function debris(root, w, h, rnd, n = 7, reach = 0.75) {
		const small = Math.min(w, h);
		for (let i = 0; i < n; i++) {
			const a = rnd(i + 60) * Math.PI * 2,
				d = Math.sqrt(rnd(i + 61)) * reach,
				x = Math.cos(a) * w * 0.5 * d,
				z = Math.sin(a) * h * 0.5 * d,
				kind = i % 4,
				g = group(root, [x, 1, z]);
			g.rotation.set(rnd(i + 3) * 0.6 - 0.3, rnd(i + 4) * 3, rnd(i + 5) * 0.6 - 0.3);
			const s = small * (0.1 + rnd(i) * 0.12);
			if (kind === 0) {
				// A bent plate: two panels at an angle, with ribs.
				box(g, i % 2 ? prop.rust : prop.metal, [s, 1, s * 0.7], [0, 0, 0], null, 0.3);
				box(g, prop.metal, [s * 0.6, 1, s * 0.7], [s * 0.7, s * 0.2, 0], [0, 0, 0.6], 0.3);
				for (let k = 0; k < 3; k++) box(g, hullDark, [0.8, 1.6, s * 0.7], [-s * 0.3 + k * s * 0.3, 0.8, 0], null, 0.2);
			} else if (kind === 1) {
				// A twisted beam.
				pipe(g, hullDark, [-s, 0, 0], [0, s * 0.25, s * 0.2], 1.2);
				pipe(g, hullDark, [0, s * 0.25, s * 0.2], [s * 0.8, s * 0.1, -s * 0.2], 1.1);
			} else if (kind === 2) {
				// A length of pipe with a flange.
				cyl(g, prop.rust, s * 0.18, s * 1.2, [0, s * 0.15, 0], { axis: "x", segs: 10 });
				cyl(g, hullDark, s * 0.26, 1.2, [s * 0.6, s * 0.15, 0], { axis: "x", segs: 10 });
			} else {
				// A box-shaped machine housing.
				box(g, prop.metal, [s * 0.7, s * 0.4, s * 0.5], [0, s * 0.15, 0], null, 0.8);
				box(g, burnt, [s * 0.3, s * 0.1, s * 0.52], [0, s * 0.37, 0], null, 0.3);
			}
		}
	}

	// ---------- an alien carcass ----------
	function derelict(root, w, h, rnd) {
		const L = w * 0.8,
			alien = prop.alien,
			n = 7;
		// Spine of vertebrae along the ground, a tail tapering west.
		for (let i = 0; i < 14; i++) {
			const t = i / 13,
				x = L * (0.42 - t * 0.95),
				s = (i < 9 ? 7 : 7 - (i - 9) * 1.2) * (h / 110);
			kit.stone(root, alien, [x, 0, Math.sin(t * 3) * h * 0.05], [s, s * 0.8, s * 1.1], i);
		}
		// Ribs arching up and curling in, biggest in the middle.
		for (let i = 0; i < n; i++) {
			const x = L * (0.3 - (i / (n - 1)) * 0.6),
				H = h * (0.75 - Math.abs(i - (n - 1) / 2) * 0.09),
				r = (h / 110) * 2.6;
			for (const side of [-1, 1]) {
				const pts = [[x, 3, side * 3], [x - 2, H * 0.55, side * h * 0.3], [x - 4, H * 0.92, side * h * 0.2], [x - 5, H, side * h * 0.04]];
				for (let k = 1; k < pts.length; k++) kit.limb(root, alien, pts[k - 1], pts[k], r * (1.1 - k * 0.22), r * (0.95 - k * 0.22), 6);
			}
		}
		// The skull: long, with sockets, a jaw and swept horns.
		const skull = group(root, [L * 0.5, h * 0.12, 0]);
		skull.rotation.z = -0.15;
		const S = h * 0.18;
		mesh(skull, loftGeo(`skull${n2(S)}`, [[-0.3, 0.55, 0.5], [0.3, 0.7, 0.6], [0.9, 0.45, 0.35], [1.4, 0.18, 0.15]].map(([x, k, kh]) => ring(x * S, k * S, kh * S, 0, 8))), alien);
		for (const z of [-1, 1]) {
			ball(skull, burnt, S * 0.18, [S * 0.4, S * 0.25, z * S * 0.42]);
			kit.limb(skull, scenery.bone, [-S * 0.1, S * 0.35, z * S * 0.4], [-S * 0.9, S * 0.9, z * S * 0.8], S * 0.14, S * 0.06, 6);
			kit.limb(skull, scenery.bone, [-S * 0.9, S * 0.9, z * S * 0.8], [-S * 1.5, S * 0.7, z * S * 0.7], S * 0.06, S * 0.01, 5);
		}
		mesh(skull, loftGeo(`jaw${n2(S)}`, [ring(-0.1 * S, 0.45 * S, 0.12 * S, -0.45 * S, 6), ring(1.2 * S, 0.12 * S, 0.06 * S, -0.35 * S, 6)]), alien);
	}

	// ---------- ruins ----------
	function ruin(root, w, h, rnd) {
		const stone = prop.stone,
			course = 4.5;
		// Broken walls of stone courses, the top courses missing towards the broken end.
		for (const [x0, z0, len, angle, high] of [[-w * 0.15, -h * 0.25, w * 0.55, 0.2, 7], [w * 0.22, h * 0.12, h * 0.55, Math.PI / 2 + 0.15, 5]]) {
			const wall = group(root, [x0, 0, z0]);
			wall.rotation.y = -angle;
			for (let c = 0; c < high; c++) {
				const blocks = Math.max(1, Math.round((len / 9) * (1 - (c / high) * (0.4 + rnd(c + 7) * 0.5)))),
					off = c % 2 ? 4.5 : 0;
				for (let b = 0; b < blocks; b++) {
					const bl = 8.4 + rnd(c * 9 + b) * 0.8;
					box(wall, c % 3 === 1 ? stoneDark : stone, [bl, course - 0.4, 7], [-len / 2 + off + b * 9 + bl / 2, c * course + course / 2 - 1, (rnd(c + b) - 0.5) * 0.8], [0, (rnd(b + c * 3) - 0.5) * 0.06, 0], 0.6);
				}
			}
		}
		// Columns: base, fluted shaft broken off at different heights, a fallen drum.
		for (let i = 0; i < 4; i++) {
			const x = -w * 0.3 + i * w * 0.2,
				z = h * 0.28,
				H = 14 + rnd(i + 20) * 34;
			box(root, stoneDark, [11, 3, 11], [x, 0.5, z], null, 0.8);
			cyl(root, stone, 4, H, [x, H / 2 + 2, z], { top: 3.6, segs: 12 });
			if (H > 30) box(root, stone, [10, 3, 10], [x, H + 3.5, z], [0, 0, 0.05], 0.8); // capital
			else cyl(root, stone, 3.8, 6, [x + 7, 3, z + 6], { axis: "x", segs: 12, rot: [0, 0.7 + i, 0] }); // fallen drum
		}
		// An arch still standing.
		const arch = group(root, [w * 0.05, 0, -h * 0.05]);
		arch.rotation.y = 0.3;
		for (const z of [-9, 9]) box(arch, stone, [6, 20, 6], [0, 10, z], null, 0.6);
		mesh(arch, arcGeo(9, 3, Math.PI), stone, [0, 20, 0]);
		// Rubble.
		for (let i = 0; i < 9; i++) {
			const a = rnd(i + 40) * Math.PI * 2,
				d = Math.sqrt(rnd(i + 41)) * 0.7;
			kit.stone(root, i % 2 ? stone : stoneDark, [Math.cos(a) * w * 0.5 * d, -1, Math.sin(a) * h * 0.5 * d], [3 + rnd(i) * 4, 2 + rnd(i + 1) * 3, 3 + rnd(i + 2) * 4], i);
		}
	}

	// ---------- resin ----------
	function resin(root, w, h, rnd) {
		const small = Math.min(w, h);
		for (let i = 0; i < 7; i++) {
			const a = rnd(i) * Math.PI * 2,
				d = Math.sqrt(rnd(i + 50)) * 0.55,
				x = Math.cos(a) * w * 0.5 * d,
				z = Math.sin(a) * h * 0.5 * d,
				s = small * (0.14 + rnd(i + 9) * 0.16);
			kit.stone(root, prop.resin, [x, -s * 0.15, z], [s, s * (0.5 + rnd(i + 3) * 0.4), s * 0.9], i + 2);
			ball(root, amberDark, s * 0.18, [x + s * 0.1, s * 0.12, z - s * 0.1]); // something caught inside
			for (let k = 0; k < 2; k++) kit.limb(root, prop.resin, [x + (k - 0.5) * s * 0.6, s * 0.35, z + s * 0.3], [x + (k - 0.5) * s * 0.7, 0, z + s * 0.55], s * 0.08, s * 0.03, 5); // drips
		}
	}

	// ---------- eggs ----------
	const EGG = [[0, 0], [0.42, 0.08], [0.6, 0.4], [0.55, 0.78], [0.32, 1.05], [0, 1.14]];
	function eggs(root, w, h, rnd, icy) {
		// The nest: a low ring of organic lumps, veins creeping out over the ground.
		for (let i = 0; i < 10; i++) {
			const a = (i / 10) * Math.PI * 2;
			kit.stone(root, prop.alien, [Math.cos(a) * w * 0.32, -1, Math.sin(a) * h * 0.3], [9, 4, 7], i);
		}
		// Veins: short, bending, creeping out of the nest.
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2 + 0.3,
				bend = (rnd(i + 71) - 0.5) * 0.6,
				r = [w * 0.29, w * (0.33 + rnd(i + 70) * 0.02), w * (0.37 + rnd(i + 72) * 0.03)],
				pts = r.map((d, k) => [Math.cos(a + bend * k) * d, 0.6 - k * 0.15, Math.sin(a + bend * k) * d * 0.8]);
			for (let k = 1; k < pts.length; k++) kit.limb(root, vein, pts[k - 1], pts[k], 2.4 - k * 0.7, 1.8 - k * 0.6, 5);
		}
		for (let i = 0; i < 9; i++) {
			const a = rnd(i) * Math.PI * 2,
				d = Math.sqrt(rnd(i + 50)) * 0.5,
				x = Math.cos(a) * w * 0.5 * d,
				z = Math.sin(a) * h * 0.5 * d,
				s = 6 + rnd(i + 9) * 5,
				cracked = i % 4 === 3;
			const egg = mesh(root, cracked ? shellGeo(EGG.slice(0, 4), 0.06, 14) : latheGeo(EGG, 14), prop.egg, [x, -s * 0.1, z], [rnd(i) * 0.4 - 0.2, 0, rnd(i + 1) * 0.4 - 0.2]);
			egg.scale.set(s, s * 1.25, s);
			if (cracked) ball(root, vein, s * 0.35, [x, s * 0.35, z]); // the glow inside an opened egg
		}
		void icy;
	}

	// ---------- a processing plant ----------
	function processor(root, w, h, rnd) {
		const small = Math.min(w, h);
		box(root, prop.metal, [w * 0.45, 24, h * 0.4], [0, 12, 0], null, 1.5);
		mesh(root, profileGeo([[-w * 0.24, 0], [w * 0.24, 0], [w * 0.18, 8], [-w * 0.18, 8]].map(([x, y]) => [n2(x), n2(y)]), h * 0.42, 0.6), hullDark, [0, 24, 0]);
		for (let i = 0; i < 5; i++) box(root, lamp, [2.4, 1.6, 0.4], [-w * 0.18 + i * w * 0.09, 16, h * 0.2 + 0.3], null, 0.1); // lit windows
		// Two tall tanks with rings and ladders, joined by pipes.
		for (const s of [-1, 1]) {
			const x = s * w * 0.3,
				z = s * h * 0.15;
			mesh(root, latheGeo([[small * 0.12, 0], [small * 0.12, 36], [small * 0.09, 40], [0, 41.5]].map(([r, y]) => [n2(r), y]), 14), prop.rust, [x, 0, z]);
			for (const y of [8, 18, 28]) mesh(root, torusGeo(n2(small * 0.122), 0.6, 16), hullDark, [x, y, z]);
			pipe(root, hullDark, [x - s * small * 0.12, 26, z], [s * w * 0.22, 20, z * 0.4], 1.6);
			for (let k = 0; k < 2; k++) pipe(root, hullDark, [x + small * 0.13, 0, z + (k - 0.5) * 3], [x + small * 0.13, 36, z + (k - 0.5) * 3], 0.3); // ladder rails
		}
		// Chimneys, a conveyor bridge to a hopper, lamps.
		for (let i = 0; i < 2; i++) cyl(root, hullDark, 2.6, 22, [-w * 0.08 + i * 8, 36, -h * 0.08], { top: 2.2, segs: 10 });
		pipe(root, prop.metal, [0, 18, -h * 0.2], [0, 10, -h * 0.42], 2.4);
		box(root, prop.rust, [10, 8, 10], [0, 5, -h * 0.45], null, 0.8);
		for (const [x, z] of [[w * 0.24, h * 0.22], [-w * 0.24, -h * 0.22]]) {
			cyl(root, hullDark, 0.4, 14, [x, 7, z], { segs: 5 });
			box(root, lamp, [1.4, 1.4, 1.4], [x, 14.5, z], null, 0.3);
		}
	}

	// ---------- floating islands ----------
	function island(theme, size, seed) {
		const root = new THREE.Group(),
			rnd = (n) => ((Math.sin(seed * 91.7 + n * 12.9) * 43758.5) % 1 + 1) % 1,
			lumen = theme === "lumen",
			lid = lumen ? moss : scenery.grass;
		// The rock underneath: a big stone hanging point down (its flat side up), smaller ones beside it.
		const under = (x, z, s, k, i) => {
			const o = mesh(root, kit.rockGeo(i % kit.ROCKS), i % 2 ? scenery.rockDark : scenery.rock, [x, -s * k * 0.3, z], [Math.PI, rnd(i) * 3, 0]);
			o.scale.set(s, s * k, s * 0.9);
		};
		under(0, 0, size, 1.6, seed);
		under(size * 0.35, size * 0.2, size * 0.55, 1.9, seed + 1);
		under(-size * 0.3, -size * 0.25, size * 0.45, 1.5, seed + 2);
		// The lid of moss or grass with a soft rim, roots hanging over the edge.
		mesh(root, latheGeo([[0, 4], [size * 0.7, 3.6], [size * 0.98, 1.5], [size * 1.04, -1], [size * 0.9, -3.5]].map(([r, y]) => [n2(r), n2(y)]), 18), lid, [0, 0, 0]);
		for (let i = 0; i < 7; i++) {
			const a = (i / 7) * Math.PI * 2 + rnd(i),
				r = size * 0.98,
				len = 8 + rnd(i + 3) * 16;
			kit.limb(root, lumen ? moss : bark, [Math.cos(a) * r, -1, Math.sin(a) * r], [Math.cos(a) * r * 1.02, -len, Math.sin(a) * r * 1.02], 0.9, 0.3, 4);
		}
		for (let n = 0; n < 5; n++) {
			const a = rnd(n) * Math.PI * 2,
				d = rnd(n + 7) * size * 0.65,
				x = Math.cos(a) * d,
				z = Math.sin(a) * d;
			if (lumen) kit.mushroom(root, { stem: prop.stem, cap: n % 3 ? scenery.shroom : scenery.violet, gills: scenery.gills, spot: n % 3 ? scenery.violet : scenery.shroom }, [x, z], 8 + rnd(n + 3) * 12, 5 + rnd(n + 5) * 5, seed + n);
			else if (n % 2) {
				// A small pine.
				cyl(root, bark, 0.8, 6, [x, 6, z], { segs: 5 });
				for (let k = 0; k < 3; k++) mesh(root, tools.cylGeo(0.3, 5 - k * 1.3, 6 - k, 7), pine, [x, 9 + k * 4, z]);
			} else kit.stone(root, scenery.rockDark, [x, 3, z], [6 + rnd(n) * 8, 5 + rnd(n + 2) * 6, 6 + rnd(n + 4) * 8], n);
		}
		return { root, update() {} };
	}

	// ---------- wrecks of destroyed units ----------
	// Many of them in a battle, each its own seed: built from unit shapes scaled per piece, so every wreck
	// shares the same few geometries (and the renderer's instanced batches).
	const unit = (parent, g, m, [sx, sy, sz], pos, rot) => {
		const o = mesh(parent, g, m, pos, rot);
		o.scale.set(sx, sy, sz);
		return o;
	};
	const UNIT_BOX = () => tools.bevelGeo(1, 1, 1, 0.12),
		UNIT_WHEEL = () => tools.cylGeo(0.5, 0.5, 1, 10, "z");
	function unitWreck(size, seed) {
		const root = new THREE.Group(),
			rnd = (n) => ((Math.sin(seed * 57.3 + n * 7.1) * 24634.6) % 1 + 1) % 1,
			s = Math.max(6, size),
			plate = scenery.scrap;
		// A burnt hull tipped on its side, its turret or cab, a gun barrel, torn plates, a wheel, an ember.
		const hull = group(root, [0, s * 0.12, 0]);
		hull.rotation.set(rnd(1) * 0.5 - 0.25, rnd(2) * 6.28, 0.4 + rnd(3) * 0.4);
		unit(hull, UNIT_BOX(), plate, [s * 0.7, s * 0.22, s * 0.42], [0, 0, 0]);
		unit(hull, UNIT_BOX(), burnt, [s * 0.3, s * 0.14, s * 0.3], [-s * 0.08, s * 0.16, 0]);
		unit(hull, UNIT_BOX(), plate, [s * 0.5, s * 0.06, s * 0.06], [s * 0.3, s * 0.24, 0], [0, 0, 0.3]);
		for (let n = 0; n < 4; n++) {
			const a = rnd(n) * Math.PI * 2,
				d = s * (0.35 + rnd(n + 9) * 0.3),
				g = group(root, [Math.cos(a) * d, s * 0.03, Math.sin(a) * d]);
			g.rotation.set(rnd(n + 4) * 0.6 - 0.3, rnd(n + 5) * 3, rnd(n + 6) * 0.6 - 0.3);
			if (n === 0) unit(g, UNIT_WHEEL(), burnt, [s * 0.28, s * 0.28, s * 0.08], [0, s * 0.07, 0]);
			else unit(g, UNIT_BOX(), n % 2 ? plate : burnt, [s * (0.18 + rnd(n + 1) * 0.15), s * 0.03, s * (0.1 + rnd(n + 2) * 0.1)], [0, 0, 0], [0, 0, 0.3]);
		}
		const coal = unit(root, UNIT_BOX(), scenery.ember, [s * 0.16, s * 0.05, s * 0.12], [s * 0.05, s * 0.06, s * 0.08], [0, rnd(11) * 3, 0]);
		return { root, update: (e, i) => (coal.visible = (e.life ?? 0) > 8) };
	}

	return { wreck, debris, derelict, ruin, resin, eggs, processor, island, unitWreck };
}
