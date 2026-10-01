/* Procedural low-poly models for the 3D renderer: built in code from boxes and cylinders, no asset files.
   Local frame: +X is the front of a unit (its 2D angle 0), +Y up, +Z the unit's right (map y).
   Every model: build(kit, radius) → { root, update(e, info) } where
   info = { time, moving, aim (relative to the facing), recoil 0..1, built 0..1, working }.
   A kit holds the materials of one side: team colour (stripes, lights), metal, dark metal, glass.
   Colonies read rounded and pale (cylinders, domes); the Dominium angular and rust-red (wedges, plates);
   the Swarm matte obsidian monoliths, sentries and walkers with the team stripe as the only colour
   (as swarm-art.js). Wildlife and monsters use natural materials. Types without a model stay as painted
   decals (three-renderer.js). */
export function createModels3D(THREE) {
	const geo = {
		box: new THREE.BoxGeometry(1, 1, 1),
		cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
		cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
		cone: new THREE.ConeGeometry(1, 1, 12),
		sphere: new THREE.SphereGeometry(1, 12, 8),
		dome: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
		wedge: (() => {
			// Sloped front: a box whose top-front edge is pulled back.
			const g = new THREE.BoxGeometry(1, 1, 1),
				p = g.attributes.position;
			for (let i = 0; i < p.count; i++) if (p.getY(i) > 0 && p.getX(i) > 0) p.setX(i, 0.1);
			g.computeVertexNormals();
			return g;
		})(),
		// Tapering four-sided stone (Swarm monoliths), its pointed crown, an octahedron (Swarm flyers).
		prism: new THREE.CylinderGeometry(0.62, 1, 1, 4, 1).rotateY(Math.PI / 4),
		pyramid: new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4),
		octa: new THREE.OctahedronGeometry(1),
		halfCyl: new THREE.CylinderGeometry(1, 1, 1, 14, 1, false, 0, Math.PI),
		torus: new THREE.TorusGeometry(1, 0.22, 8, 24).rotateX(Math.PI / 2),
		// A cooling tower: narrow waist, wider top and base.
		tower: new THREE.LatheGeometry([0, 0.5, 1].map((t) => new THREE.Vector2(1 - Math.sin(t * Math.PI) * 0.32 - t * 0.1, t - 0.5)), 16),
	};
	const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, metalness: 0.35, flatShading: true, ...o });
	const kits = new Map();
	function kit(team, faction, tint, teamColors) {
		const swarm = faction === "swarm",
			dominion = !swarm && (faction === "dominion" || (!faction && team === 1)),
			color = tint || teamColors[team] || "#bbc1e2",
			key = [color, faction || team].join("|");
		if (kits.has(key)) return kits.get(key);
		// Swarm: matte obsidian, no glow — the team stripe is the only colour (as in swarm-art.js).
		const k = swarm
			? {
					swarm,
					team: std(color, { roughness: 0.5 }),
					glow: std(color, { roughness: 0.5 }),
					metal: std("#3a434e", { roughness: 0.85, metalness: 0.1 }),
					plate: std("#1b2027", { roughness: 0.8, metalness: 0.15 }),
					dark: std("#0e1216", { roughness: 0.9, metalness: 0.1 }),
					black: std("#06090c", { roughness: 0.9 }),
					glass: std("#6a7581", { roughness: 0.4, metalness: 0.5 }),
					warn: std("#303336", { roughness: 0.9 }),
				}
			: {
					dominion,
					team: std(color, { roughness: 0.5 }),
					glow: std(color, { emissive: color, emissiveIntensity: 0.8 }),
					metal: std(dominion ? "#9c8578" : "#b9c4b3"),
					plate: std(dominion ? "#7a5f58" : "#8fa39c"),
					dark: std(dominion ? "#4d3b3c" : "#3f5654"),
					black: std("#1d2426", { metalness: 0.6 }),
					glass: std(dominion ? "#ffb070" : "#8ff0e4", { emissive: dominion ? "#ff8a3c" : "#5fe0cf", emissiveIntensity: 0.9 }),
					warn: std("#e2b33c"),
				};
		k.white = std("#dfe6e4", { roughness: 0.5, metalness: 0.1 });
		k.red = std("#d8453c", { emissive: "#d8453c", emissiveIntensity: 0.5 });
		k.fire = std("#ff9a3c", { emissive: "#ff7a1c", emissiveIntensity: 1.4 });
		k.energy = std("#9ff7ff", { emissive: "#6fe8ff", emissiveIntensity: 1.3 });
		for (const m of Object.values(k)) if (m.isMaterial && m.emissiveIntensity && m.emissive.getHex()) glowing.push([m, m.emissiveIntensity]);
		kits.set(key, k);
		return k;
	}
	// Lights of the models (windows, lamps, cores) glow brighter at night.
	const glowing = [];
	let nightLevel = 0;
	function setNight(n) {
		if (Math.abs(n - nightLevel) < 0.01) return;
		nightLevel = n;
		for (const [m, base] of glowing) m.emissiveIntensity = base * (0.6 + 1.6 * n);
	}
	// Wildlife and monsters: natural materials, no team colour.
	const nature = {
		hide: std("#7c6a52", { roughness: 0.95, metalness: 0 }),
		belly: std("#b3a07e", { roughness: 0.95, metalness: 0 }),
		fur: std("#d7e3ea", { roughness: 1, metalness: 0 }),
		bone: std("#efe6cf", { roughness: 0.6, metalness: 0 }),
		basalt: std("#2a2526", { roughness: 0.9, metalness: 0.1 }),
		ember: std("#ff7a2e", { emissive: "#ff5a12", emissiveIntensity: 1.6 }),
		sand: std("#b89b68", { roughness: 1, metalness: 0 }),
		maw: std("#3a1618", { roughness: 0.8, metalness: 0 }),
		eye: std("#ffe07a", { emissive: "#ffc23a", emissiveIntensity: 1.2 }),
	};
	for (const m of [nature.ember, nature.eye]) glowing.push([m, m.emissiveIntensity]);

	// A mesh from a shared geometry: size (sx, sy, sz), position of its centre, optional rotation.
	function part(parent, g, material, [sx, sy, sz], [x, y, z], rot) {
		const m = new THREE.Mesh(geo[g], material);
		m.scale.set(sx, sy, sz);
		m.position.set(x, y, z);
		if (rot) m.rotation.set(...rot);
		m.castShadow = true;
		m.receiveShadow = true;
		parent.add(m);
		return m;
	}
	const group = (parent, [x, y, z] = [0, 0, 0]) => {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		parent.add(g);
		return g;
	};

	// ---- Units ----
	// Infantry; weapon: rifle, rocket, flamer, grenade, none (civilians), carbine (saboteurs).
	// coat: torso material (scientists white, technicians hazard yellow, saboteurs black).
	function infantry(k, weapon, coat = k.plate) {
		const root = new THREE.Group(),
			body = group(root),
			legs = [-1, 1].map((side) => {
				const pivot = group(body, [0, 9, side * 2.6]);
				part(pivot, "box", k.dark, [3, 9, 2.6], [0, -4.5, 0]);
				return pivot;
			});
		part(body, "box", coat, [5, 8, 7.5], [0, 13, 0]); // torso
		part(body, "box", k.team, [5.2, 2, 7.8], [0, 15.5, 0]); // shoulder stripe
		part(body, "box", weapon === "none" ? k.team : k.metal, [3, 5, 5], [-3.8, 13, 0]); // pack
		if (weapon === "none" && coat === k.white) part(body, "box", k.glass, [2, 3, 2], [3, 12, -2.5]); // sample case
		k.dominion ? part(body, "box", k.metal, [4.6, 4, 4.6], [0.3, 19.2, 0]) : part(body, "sphere", k.metal, [2.6, 2.6, 2.6], [0.3, 19.3, 0]);
		part(body, "box", k.glass, [0.8, 1.2, 3.2], [2.6, 19.4, 0]); // visor
		const gun = group(body, [2.5, 13, 3]);
		if (weapon === "rocket") {
			part(gun, "cyl", k.dark, [2.2, 15, 2.2], [1, 5, -3], [0, 0, Math.PI / 2]);
			part(gun, "cyl", k.team, [2.4, 2, 2.4], [7.5, 5, -3], [0, 0, Math.PI / 2]);
		} else if (weapon === "flamer") {
			part(gun, "box", k.black, [11, 2, 2], [4, 0, 0]);
			part(body, "cyl", k.warn, [2, 7, 2], [-4.5, 13, -1.8]);
			part(body, "cyl", k.warn, [2, 7, 2], [-4.5, 13, 1.8]);
		} else if (weapon === "grenade") {
			part(gun, "cyl", k.black, [2.4, 9, 2.4], [3, 0, 0], [0, 0, Math.PI / 2]);
			for (const z of [-2.5, 0, 2.5]) part(body, "sphere", k.warn, [1.2, 1.2, 1.2], [2.8, 10.5, z]);
		} else if (weapon === "carbine") part(gun, "box", k.black, [8, 1.4, 1.4], [3, 0, 0]);
		else if (weapon === "tool") part(gun, "box", k.warn, [6, 2, 2], [2, -1, 0]);
		else if (weapon !== "none") part(gun, "box", k.black, [12, 1.6, 1.6], [4, 0, 0]);
		return {
			root,
			update(e, i) {
				const swing = i.moving ? Math.sin(i.time * 11 + e.id) * 0.6 : 0;
				legs[0].rotation.z = swing;
				legs[1].rotation.z = -swing;
				body.position.y = i.moving ? Math.abs(Math.cos(i.time * 11 + e.id)) * 1.2 : 0;
				gun.position.x = 2.5 - i.recoil * 3;
			},
		};
	}

	function tank(k) {
		const root = new THREE.Group();
		for (const side of [-1, 1]) {
			part(root, "box", k.black, [42, 9, 8], [0, 5, side * 12]); // track
			for (let w = -15; w <= 15; w += 10) part(root, "cyl", k.dark, [3.6, 9, 3.6], [w, 4.5, side * 12], [Math.PI / 2, 0, 0]);
		}
		part(root, k.dominion ? "wedge" : "box", k.plate, [40, 9, 18], [0, 12, 0]); // hull
		part(root, "box", k.team, [8, 1, 19], [-12, 16.6, 0]);
		part(root, "box", k.metal, [8, 3, 12], [-15, 17, 0]); // engine deck
		const turret = group(root, [2, 17, 0]),
			barrel = group(turret, [0, 4, 0]);
		k.dominion ? part(turret, "cyl6", k.metal, [11, 8, 11], [0, 4, 0]) : part(turret, "dome", k.metal, [11, 9, 11], [0, 0, 0]);
		part(turret, "box", k.glass, [2, 1.5, 4], [6, 6.5, -4]);
		part(barrel, "cyl", k.dark, [2.2, 26, 2.2], [17, 0, 0], [0, 0, Math.PI / 2]);
		part(barrel, "cyl", k.black, [3, 4, 3], [29, 0, 0], [0, 0, Math.PI / 2]);
		return {
			root,
			update(e, i) {
				turret.rotation.y = -i.aim;
				barrel.position.x = -i.recoil * 7;
				root.position.y = i.moving ? Math.sin(i.time * 30 + e.id) * 0.3 : 0;
			},
		};
	}

	function worker(k) {
		const root = new THREE.Group();
		for (const x of [-7, 7]) for (const z of [-7, 7]) part(root, "cyl", k.black, [3.5, 3, 3.5], [x, 3.5, z], [Math.PI / 2, 0, 0]);
		part(root, "box", k.plate, [20, 7, 13], [0, 8, 0]);
		part(root, "box", k.team, [4, 7.2, 13.4], [4, 8, 0]);
		part(root, "box", k.metal, [6, 6, 8], [6, 14, 0]); // cab
		part(root, "box", k.glass, [1, 2.5, 6], [9.2, 15, 0]);
		const cargo = part(root, "box", k.warn, [8, 5, 10], [-5, 14, 0]);
		const arm = group(root, [10, 10, 4]);
		part(arm, "box", k.dark, [10, 2, 2], [5, 0, 0]);
		part(arm, "box", k.metal, [2.5, 4, 5], [10, -1, 0]);
		return {
			root,
			update(e, i) {
				cargo.visible = (e.cargo || 0) > 0;
				arm.rotation.z = e.order?.kind === "gather" && !i.moving ? Math.sin(i.time * 8 + e.id) * 0.5 - 0.3 : 0.2;
			},
		};
	}

	// ---- Buildings (footprint from the 2D radius, so bases keep their proportions) ----
	function hq(k, r) {
		const root = new THREE.Group(),
			w = r * 1.5;
		part(root, "box", k.dark, [w * 1.1, 6, w * 1.1], [0, 3, 0]); // pad
		part(root, "box", k.plate, [w * 0.8, 30, w * 0.75], [0, 21, 0]);
		part(root, "box", k.team, [w * 0.82, 3, w * 0.77], [0, 30, 0]);
		k.dominion ? part(root, "box", k.metal, [w * 0.5, 22, w * 0.45], [-6, 47, 0]) : part(root, "dome", k.metal, [w * 0.3, w * 0.22, w * 0.3], [-6, 36, 0]);
		for (let i = 0; i < 4; i++) part(root, "box", k.glass, [1, 3, 8], [w * 0.4 + 0.2, 20, -24 + i * 16]);
		const mast = group(root, [w * 0.25, 36, -w * 0.25]);
		part(mast, "cyl", k.metal, [1.5, 34, 1.5], [0, 17, 0]);
		const dish = group(mast, [0, 34, 0]);
		part(dish, "cone", k.metal, [8, 4, 8], [0, 0, 0], [Math.PI, 0, 0]);
		part(dish, "sphere", k.glow, [1.6, 1.6, 1.6], [0, 1, 0]);
		part(root, "box", k.warn, [w * 1.1, 1, 3], [0, 6.3, w * 0.52]);
		return { root, update: (e, i) => (dish.rotation.y = i.time * 0.8) };
	}
	function barracks(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		part(root, "box", k.dark, [w, 4, w * 0.8], [0, 2, 0]);
		for (const z of [-w * 0.2, w * 0.2]) {
			k.dominion
				? part(root, "box", k.plate, [w * 0.85, 18, w * 0.3], [0, 13, z])
				: part(root, "cyl", k.plate, [w * 0.17, w * 0.8, w * 0.17], [0, 10, z], [0, 0, Math.PI / 2]);
			part(root, "box", k.team, [w * 0.87, 2.2, 2], [0, k.dominion ? 20 : 17, z]);
		}
		part(root, "box", k.metal, [10, 14, 16], [w * 0.45, 9, 0]); // gate
		part(root, "box", k.glass, [1, 8, 10], [w * 0.45 + 5.2, 8, 0]);
		return { root, update() {} };
	}
	function factory(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		part(root, "box", k.dark, [w, 4, w * 0.9], [0, 2, 0]);
		part(root, k.dominion ? "box" : "wedge", k.plate, [w * 0.9, 34, w * 0.62], [-4, 21, 0]);
		part(root, "box", k.team, [w * 0.92, 3, w * 0.64], [-4, 30, 0]);
		part(root, "box", k.black, [2, 22, w * 0.36], [w * 0.41, 15, 0]); // bay door
		part(root, "box", k.warn, [2.2, 2, w * 0.38], [w * 0.41, 27, 0]);
		const fans = [];
		for (const z of [-w * 0.2, w * 0.2]) {
			part(root, "cyl", k.metal, [6, 14, 6], [-w * 0.3, 44, z]); // stack
			const fan = group(root, [-w * 0.05, 38.5, z]);
			part(fan, "cyl", k.dark, [8, 1, 8], [0, 0, 0]);
			part(fan, "box", k.metal, [15, 1.2, 2], [0, 0.6, 0]);
			fans.push(fan);
		}
		return { root, update: (e, i) => fans.forEach((f, n) => (f.rotation.y = i.time * (4 + n))) };
	}
	function depot(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		part(root, "box", k.dark, [w, 3, w], [0, 1.5, 0]);
		const colors = [k.plate, k.team, k.metal, k.plate];
		[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z], n) => part(root, "box", colors[n], [w * 0.4, 12, w * 0.38], [x * w * 0.23, 9 + (n === 1 ? 12 : 0), z * w * 0.23]));
		part(root, "box", k.warn, [w * 0.4, 1, 3], [w * 0.23, 3.3, 0]);
		return { root, update() {} };
	}
	function turret(k, r) {
		const root = new THREE.Group();
		part(root, "cyl6", k.dark, [r * 0.9, 10, r * 0.9], [0, 5, 0]);
		part(root, "cyl", k.team, [r * 0.7, 2, r * 0.7], [0, 11, 0]);
		const head = group(root, [0, 12, 0]),
			guns = group(head, [0, 7, 0]);
		part(head, k.dominion ? "cyl6" : "dome", k.metal, [r * 0.55, 10, r * 0.55], [0, k.dominion ? 5 : 0, 0]);
		for (const z of [-3.5, 3.5]) part(guns, "cyl", k.black, [2, 26, 2], [16, 0, z], [0, 0, Math.PI / 2]);
		part(head, "box", k.glass, [1.5, 2, 5], [r * 0.5, 7, 0]);
		return {
			root,
			update(e, i) {
				head.rotation.y = -i.aim;
				guns.position.x = -i.recoil * 6;
			},
		};
	}

	// ---- Vehicle parts ----
	function trackPair(root, k, len, gap, h = 9) {
		for (const side of [-1, 1]) {
			part(root, "box", k.black, [len, h, 8], [0, h / 2 + 0.5, side * gap]);
			for (let w = -len / 2 + 5; w <= len / 2 - 5; w += 10) part(root, "cyl", k.dark, [h * 0.4, 9, h * 0.4], [w, h / 2, side * gap], [Math.PI / 2, 0, 0]);
		}
	}
	// Wheels spin with speed; returns the wheel meshes.
	function wheelSet(root, k, xs, gap, rad) {
		const list = [];
		for (const x of xs) for (const side of [-1, 1]) list.push(part(root, "cyl", k.black, [rad, 5, rad], [x, rad, side * gap], [Math.PI / 2, 0, 0]));
		return list;
	}
	const spin = (wheels, i, rad) => {
		if (i.moving) for (const w of wheels) w.rotation.y = -(i.time * 90) / rad;
	};
	// A turret group at (x, y) turning with the aim; its barrel group recoils along -X.
	function turretMount(root, [x, y]) {
		const turret = group(root, [x, y, 0]),
			barrel = group(turret, [0, 0, 0]);
		return { turret, barrel, aim: (i, kick = 6) => ((turret.rotation.y = -i.aim), (barrel.position.x = -i.recoil * kick)) };
	}
	const barrelPart = (parent, k, len, r, [x, y, z] = [0, 0, 0], elevation = 0) => {
		const g = group(parent, [x, y, z]);
		g.rotation.z = elevation;
		part(g, "cyl", k.dark, [r, len, r], [len / 2, 0, 0], [0, 0, Math.PI / 2]);
		part(g, "cyl", k.black, [r * 1.35, 3, r * 1.35], [len, 0, 0], [0, 0, Math.PI / 2]);
		return g;
	};

	function heavy(k) {
		const root = new THREE.Group();
		trackPair(root, k, 54, 16, 11);
		part(root, k.dominion ? "wedge" : "box", k.plate, [52, 11, 24], [0, 15, 0]);
		part(root, "box", k.team, [10, 1, 25], [-16, 20.8, 0]);
		for (const side of [-1, 1]) part(root, "box", k.metal, [46, 6, 3], [0, 13, side * 13.5]); // side skirts
		const m = turretMount(root, [2, 21]);
		part(m.turret, k.dominion ? "cyl6" : "box", k.metal, k.dominion ? [14, 10, 14] : [24, 10, 20], [0, 5, 0]);
		part(m.turret, "box", k.glass, [2, 2, 5], [10, 8, -6]);
		for (const z of [-4, 4]) barrelPart(m.barrel, k, 30, 2.3, [8, 5, z]);
		return { root, update: (e, i) => m.aim(i, 8) };
	}
	function artillery(k) {
		const root = new THREE.Group();
		trackPair(root, k, 42, 12);
		part(root, "box", k.plate, [40, 9, 18], [0, 12, 0]);
		part(root, "box", k.team, [6, 1, 19], [-14, 16.6, 0]);
		for (const side of [-1, 1]) part(root, "box", k.dark, [4, 3, 3], [-20, 6, side * 9]); // spades
		const m = turretMount(root, [-2, 17]);
		part(m.turret, "box", k.metal, [18, 7, 16], [0, 3.5, 0]);
		part(m.turret, "box", k.warn, [18.2, 1.2, 16.2], [0, 6.5, 0]);
		barrelPart(m.barrel, k, 44, 2.6, [4, 6, 0], 0.42);
		return { root, update: (e, i) => m.aim(i, 10) };
	}
	function destroyer(k) {
		const root = new THREE.Group();
		trackPair(root, k, 44, 13);
		part(root, "wedge", k.plate, [44, 12, 22], [0, 13, 0]); // low casemate, no turret
		part(root, "box", k.team, [8, 1, 23], [-14, 19.6, 0]);
		const gun = group(root, [10, 15, 0]);
		barrelPart(gun, k, 36, 2.6, [0, 0, 0]);
		part(root, "box", k.glass, [2, 2, 8], [-2, 19.5, -6]);
		return {
			root,
			update(e, i) {
				// The casemate gun traverses only a little; the hull does the rest.
				gun.rotation.y = -Math.max(-0.35, Math.min(0.35, Math.atan2(Math.sin(i.aim), Math.cos(i.aim))));
				gun.position.x = 10 - i.recoil * 7;
			},
		};
	}
	function skyguard(k) {
		const root = new THREE.Group(),
			wheels = wheelSet(root, k, [-12, 0, 12], 11, 5);
		part(root, "box", k.plate, [38, 9, 18], [0, 12, 0]);
		part(root, "box", k.team, [6, 1, 19], [-13, 16.6, 0]);
		const m = turretMount(root, [2, 17]);
		part(m.turret, "cyl6", k.metal, [9, 6, 9], [0, 3, 0]);
		for (const z of [-4.5, 4.5]) barrelPart(m.barrel, k, 20, 1.6, [2, 5, z], 0.75);
		const radar = group(root, [-12, 17, 0]);
		part(radar, "cyl", k.metal, [1, 8, 1], [0, 4, 0]);
		part(radar, "box", k.glass, [2, 5, 12], [0, 9, 0]);
		return {
			root,
			update(e, i) {
				m.aim(i, 4);
				radar.rotation.y = i.time * 2.5;
				spin(wheels, i, 5);
			},
		};
	}
	function raider(k) {
		const root = new THREE.Group(),
			wheels = wheelSet(root, k, [-9, 9], 10, 5.5);
		part(root, "box", k.dark, [26, 4, 12], [0, 7, 0]); // chassis
		part(root, "wedge", k.plate, [16, 5, 12], [3, 11, 0]);
		part(root, "box", k.team, [6, 5.2, 12.4], [-6, 11, 0]);
		for (const z of [-5, 5]) part(root, "box", k.black, [1, 8, 1], [-2, 15, z]); // roll cage
		part(root, "box", k.black, [12, 1, 11], [-2, 19, 0]);
		const m = turretMount(root, [-3, 20]);
		barrelPart(m.barrel, k, 12, 1.2, [0, 1, 0]);
		return {
			root,
			update(e, i) {
				m.aim(i, 3);
				spin(wheels, i, 5.5);
				root.rotation.x = i.moving ? Math.sin(i.time * 17 + e.id) * 0.04 : 0;
			},
		};
	}
	function transport(k) {
		const root = new THREE.Group(),
			wheels = wheelSet(root, k, [-13, 0, 13], 12, 5.5);
		part(root, k.dominion ? "wedge" : "box", k.plate, [44, 14, 22], [0, 16, 0]);
		part(root, "box", k.team, [44.4, 2, 22.4], [0, 19, 0]);
		part(root, "box", k.dark, [4, 10, 14], [-22, 15, 0]); // rear ramp
		part(root, "box", k.glass, [1, 3, 14], [k.dominion ? 4 : 22.2, 19, 0]);
		const m = turretMount(root, [-4, 23]);
		part(m.turret, "cyl", k.metal, [4, 3, 4], [0, 1.5, 0]);
		barrelPart(m.barrel, k, 12, 1.1, [2, 2.5, 0]);
		return {
			root,
			update(e, i) {
				m.aim(i, 3);
				spin(wheels, i, 5.5);
			},
		};
	}
	function hauler(k) {
		const root = new THREE.Group(),
			wheels = wheelSet(root, k, [-14, -4, 13], 11, 5);
		part(root, "box", k.dark, [44, 4, 18], [0, 8, 0]);
		part(root, "box", k.plate, [11, 12, 17], [14, 16, 0]); // cab
		part(root, "box", k.glass, [1, 4, 14], [19.7, 19, 0]);
		part(root, "box", k.team, [11.2, 2, 17.2], [14, 22, 0]);
		for (const x of [-16, 0]) part(root, "box", k.metal, [2, 12, 18], [x, 16, 0]); // cradle
		const core = part(root, "cyl", k.energy, [6, 14, 6], [-8, 17, 0], [0, 0, Math.PI / 2]);
		return {
			root,
			update(e, i) {
				spin(wheels, i, 5);
				core.rotation.x = i.time * 1.5;
			},
		};
	}
	function serviceRover(k) {
		const root = new THREE.Group(),
			wheels = wheelSet(root, k, [-9, 9], 10, 5);
		part(root, "box", k.plate, [28, 9, 16], [0, 11, 0]);
		part(root, "box", k.team, [6, 9.2, 16.2], [-9, 11, 0]);
		part(root, "box", k.glass, [1, 3, 10], [14.2, 13, 0]);
		const arm = group(root, [2, 16, 0]);
		part(arm, "cyl", k.warn, [2, 18, 2], [0, 9, 0]);
		const boom = group(arm, [0, 17, 0]);
		part(boom, "box", k.warn, [16, 2, 2], [8, 0, 0]);
		part(boom, "box", k.black, [3, 5, 3], [16, -2.5, 0]);
		return {
			root,
			update(e, i) {
				spin(wheels, i, 5);
				const working = e.order?.kind === "repair" && !i.moving;
				arm.rotation.y = working ? Math.sin(i.time * 1.5) * 0.8 : 0;
				boom.rotation.z = working ? -0.3 + Math.sin(i.time * 3) * 0.15 : 0.35;
			},
		};
	}
	// Dominium bastion: a two-legged walker with shoulder cannons.
	function sentinel(k) {
		const root = new THREE.Group(),
			hips = group(root, [0, 18, 0]),
			legs = [-1, 1].map((side) => {
				const leg = group(hips, [0, 0, side * 8]);
				part(leg, "box", k.dark, [5, 10, 4], [1, -5, 0]);
				part(leg, "box", k.metal, [4, 9, 4], [-1, -13, 0]);
				part(leg, "box", k.black, [9, 2, 6], [0, -17, 0]); // foot
				return leg;
			}),
			torso = group(hips, [0, 3, 0]);
		part(torso, "wedge", k.plate, [20, 12, 18], [0, 5, 0]);
		part(torso, "box", k.team, [20.2, 2, 18.2], [0, 9, 0]);
		part(torso, "box", k.glass, [1, 2, 8], [6, 7, 0]);
		const guns = [-1, 1].map((side) => barrelPart(torso, k, 20, 2.2, [2, 10, side * 11]));
		return {
			root,
			update(e, i) {
				const s = i.moving ? Math.sin(i.time * 6 + e.id) * 0.45 : 0;
				legs[0].rotation.z = s;
				legs[1].rotation.z = -s;
				hips.position.y = 18 + (i.moving ? Math.abs(Math.sin(i.time * 6 + e.id)) * 1.5 : 0);
				torso.rotation.y = -i.aim;
				for (const g of guns) g.position.x = 2 - i.recoil * 5;
			},
		};
	}
	// ---- Aircraft (the renderer lifts them; here only the airframe, bank and rotors) ----
	function interceptor(k) {
		const root = new THREE.Group(),
			frame = group(root);
		part(frame, "box", k.plate, [30, 5, 6], [0, 0, 0]);
		part(frame, "cone", k.metal, [3, 10, 3], [19, 0, 0], [0, 0, -Math.PI / 2]);
		part(frame, "wedge", k.plate, [18, 1.5, 36], [-4, 0, 0]); // delta wing
		part(frame, "box", k.team, [4, 1.7, 36.4], [-8, 0, 0]);
		for (const z of [-4, 4]) part(frame, "box", k.dark, [7, 8, 1], [-12, 4, z], [0.3 * Math.sign(z), 0, 0]);
		part(frame, "box", k.glass, [7, 2.5, 3], [8, 3, 0]);
		part(frame, "cyl", k.fire, [2.2, 2, 2.2], [-16, 0, 0], [0, 0, Math.PI / 2]);
		return { root, update: (e, i) => (frame.rotation.x = Math.sin(i.time * 1.3 + e.id) * 0.25) };
	}
	function bomber(k) {
		const root = new THREE.Group(),
			frame = group(root);
		part(frame, "box", k.plate, [36, 8, 10], [0, 0, 0]);
		part(frame, "cone", k.metal, [5, 8, 5], [22, 0, 0], [0, 0, -Math.PI / 2]);
		part(frame, "box", k.plate, [14, 2, 60], [0, 0, 0]);
		part(frame, "box", k.team, [4, 2.2, 60.4], [-4, 0, 0]);
		for (const z of [-15, 15]) {
			part(frame, "cyl", k.dark, [3.5, 14, 3.5], [2, -3, z], [0, 0, Math.PI / 2]);
			part(frame, "cyl", k.fire, [2.6, 1, 2.6], [-5.5, -3, z], [0, 0, Math.PI / 2]);
		}
		part(frame, "box", k.dark, [8, 10, 1.5], [-15, 5, 0]);
		part(frame, "box", k.glass, [5, 3, 6], [14, 4, 0]);
		return { root, update: (e, i) => (frame.rotation.x = Math.sin(i.time * 0.9 + e.id) * 0.12) };
	}
	function drone(k) {
		const root = new THREE.Group(),
			rotors = [];
		part(root, "sphere", k.plate, [5, 3, 5], [0, 0, 0]);
		part(root, "box", k.glass, [2, 1.5, 2], [4.5, 0, 0]);
		for (const [x, z] of [[7, 7], [7, -7], [-7, 7], [-7, -7]]) {
			part(root, "box", k.dark, [Math.hypot(x, z), 1, 1.2], [x / 2, 0, z / 2], [0, -Math.atan2(z, x), 0]);
			const rotor = group(root, [x, 1.2, z]);
			part(rotor, "box", k.team, [9, 0.4, 1.2], [0, 0, 0]);
			rotors.push(rotor);
		}
		return { root, update: (e, i) => rotors.forEach((r, n) => (r.rotation.y = i.time * 40 * (n % 2 ? 1 : -1))) };
	}

	// ---- More buildings ----
	const pad = (root, k, w, d = w, h = 4) => part(root, "box", k.dark, [w, h, d], [0, h / 2, 0]);
	function wall(k, r) {
		const root = new THREE.Group(),
			w = r * 1.75;
		part(root, "box", k.plate, [w, 24, w], [0, 12, 0]);
		part(root, "box", k.team, [w + 0.4, 2, w + 0.4], [0, 20, 0]);
		for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(root, "box", k.metal, [w * 0.3, 5, w * 0.3], [x * w * 0.33, 26.5, z * w * 0.33]);
		return { root, update() {} };
	}
	function gate(k, r) {
		const root = new THREE.Group(),
			w = r * 1.5;
		for (const z of [-w / 2, w / 2]) {
			part(root, "box", k.plate, [16, 32, 12], [0, 16, z]);
			part(root, "box", k.team, [16.4, 2, 12.4], [0, 28, z]);
		}
		part(root, "box", k.metal, [16, 5, w + 12], [0, 34, 0]); // lintel
		const door = part(root, "box", k.dark, [5, 26, w - 12], [0, 13, 0]);
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
		pad(root, k, w);
		for (const z of [-w * 0.28, w * 0.28]) part(root, "cyl", k.plate, [7, 18, 7], [-w * 0.25, 13, z]); // tanks
		part(root, "box", k.team, [4, 2, w * 0.8], [-w * 0.25, 18, 0]);
		for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(root, "box", k.metal, [2, 36, 2], [w * 0.15 + x * 6, 21, z * 6], [z * 0.1, 0, -x * 0.1]); // derrick
		part(root, "box", k.metal, [10, 2, 10], [w * 0.15, 39, 0]);
		const piston = part(root, "cyl", k.warn, [2.5, 20, 2.5], [w * 0.15, 18, 0]);
		const vent = part(root, "sphere", k.energy, [3, 3, 3], [w * 0.15, 6, 0]);
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
		pad(root, k, w);
		part(root, "tower", k.metal, [r * 0.55, 40, r * 0.55], [-w * 0.12, 24, 0]);
		part(root, "torus", k.team, [r * 0.5, 4, r * 0.5], [-w * 0.12, 42, 0]);
		const core = part(root, "cyl", k.energy, [5, 14, 5], [w * 0.28, 11, w * 0.2]);
		part(root, "box", k.plate, [12, 10, 12], [w * 0.28, 5, -w * 0.2]);
		part(root, "cyl", k.dark, [1.5, w * 0.4, 1.5], [w * 0.1, 8, w * 0.2], [0, 0, Math.PI / 2]);
		return { root, update: (e, i) => core.scale.set(5 + Math.sin(i.time * 3) * 0.6, 14, 5 + Math.sin(i.time * 3) * 0.6) };
	}
	function lab(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		pad(root, k, w);
		part(root, "box", k.plate, [w * 0.8, 12, w * 0.7], [0, 10, 0]);
		part(root, "box", k.team, [w * 0.82, 2, w * 0.72], [0, 15, 0]);
		part(root, "dome", k.dominion ? k.metal : k.glass, [r * 0.5, r * 0.45, r * 0.5], [0, 16, 0]);
		const ring = group(root, [0, 26, 0]);
		part(ring, "torus", k.metal, [r * 0.62, 3, r * 0.62], [0, 0, 0]);
		part(ring, "sphere", k.energy, [2, 2, 2], [r * 0.62, 0, 0]);
		return { root, update: (e, i) => ((ring.rotation.y = i.time * 0.9), (ring.rotation.x = Math.sin(i.time * 0.7) * 0.25)) };
	}
	function battery(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6,
			caps = [];
		pad(root, k, w);
		for (let x = -1; x <= 1; x++)
			for (const z of [-1, 1]) {
				part(root, "cyl", k.plate, [5.5, 20, 5.5], [x * w * 0.28, 14, z * w * 0.2]);
				caps.push(part(root, "cyl", k.energy, [4, 3, 4], [x * w * 0.28, 25, z * w * 0.2]));
			}
		part(root, "box", k.team, [w * 0.9, 2, 3], [0, 8, 0]);
		return { root, update: (e, i) => caps.forEach((c, n) => (c.visible = i.built >= 1 && Math.sin(i.time * 2 - n) > -0.6)) };
	}
	function workshop(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		pad(root, k, w, w * 0.85);
		for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(root, "box", k.metal, [3, 26, 3], [x * w * 0.42, 15, z * w * 0.36]);
		part(root, "box", k.plate, [w * 0.9, 3, w * 0.78], [0, 29, 0]);
		part(root, "box", k.team, [w * 0.92, 1.5, 4], [0, 31, w * 0.3]);
		const crane = group(root, [0, 26, 0]);
		part(crane, "box", k.warn, [3, 2, w * 0.74], [0, 0, 0]);
		part(crane, "box", k.black, [4, 7, 4], [0, -4.5, 0]);
		part(root, "box", k.dark, [w * 0.4, 7, w * 0.26], [0, 7.5, 0]); // hull on the jig
		return { root, update: (e, i) => (crane.position.x = Math.sin(i.time * 0.8) * w * 0.3) };
	}
	function hangar(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		pad(root, k, w, w * 0.9);
		part(root, "halfCyl", k.plate, [w * 0.3, w * 0.62, w * 0.3], [-w * 0.12, 4, 0], [0, 0, Math.PI / 2]); // arched roof along X
		part(root, "box", k.team, [2, w * 0.3, w * 0.62], [w * 0.19, 4 + w * 0.15, 0]);
		part(root, "box", k.black, [1.5, w * 0.2, w * 0.4], [w * 0.2, 4 + w * 0.1, 0]);
		part(root, "cyl", k.warn, [w * 0.14, 1, w * 0.14], [w * 0.35, 4.4, w * 0.25]); // landing pad
		return { root, update() {} };
	}
	function flak(k, r) {
		const root = new THREE.Group();
		part(root, "cyl6", k.dark, [r * 0.8, 10, r * 0.8], [0, 5, 0]);
		part(root, "cyl", k.team, [r * 0.62, 2, r * 0.62], [0, 11, 0]);
		const m = turretMount(root, [0, 12]);
		part(m.turret, "box", k.metal, [14, 9, 16], [0, 4.5, 0]);
		for (const z of [-5.5, -2, 2, 5.5]) barrelPart(m.barrel, k, 22, 1.3, [4, 7, z], 0.8);
		part(m.turret, "box", k.glass, [1.5, 2, 5], [7.2, 6, 0]);
		return { root, update: (e, i) => m.aim(i, 4) };
	}
	function forge(k, r) {
		const root = new THREE.Group(),
			w = r * 1.5;
		pad(root, k, w * 1.1, w * 1.1, 5);
		part(root, "cyl6", k.dark, [w * 0.45, 16, w * 0.45], [0, 13, 0]);
		part(root, "cyl6", k.plate, [w * 0.33, 14, w * 0.33], [0, 28, 0]);
		const heart = part(root, "sphere", nature.ember, [9, 9, 9], [0, 38, 0]);
		for (let n = 0; n < 3; n++) {
			const a = (n / 3) * Math.PI * 2;
			part(root, "cyl", k.metal, [4, 46, 4], [Math.cos(a) * w * 0.38, 28, Math.sin(a) * w * 0.38]);
			part(root, "cyl", k.fire, [3, 2, 3], [Math.cos(a) * w * 0.38, 52, Math.sin(a) * w * 0.38]);
		}
		part(root, "torus", k.team, [w * 0.46, 5, w * 0.46], [0, 21, 0]);
		return { root, update: (e, i) => heart.scale.setScalar(9 + Math.sin(i.time * 2.4) * 1.2) };
	}
	function medbay(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		pad(root, k, w);
		part(root, "box", k.white, [w * 0.62, 14, w * 0.62], [-w * 0.1, 11, 0]);
		part(root, "box", k.team, [w * 0.64, 2, w * 0.64], [-w * 0.1, 16, 0]);
		part(root, "box", k.red, [w * 0.42, 1.5, 8], [-w * 0.1, 18.8, 0]);
		part(root, "box", k.red, [8, 1.5, w * 0.42], [-w * 0.1, 18.8, 0]);
		part(root, "cyl", k.warn, [w * 0.13, 1, w * 0.13], [w * 0.33, 4.5, 0]);
		return { root, update() {} };
	}
	function shieldgen(k, r) {
		const root = new THREE.Group(),
			w = r * 1.5;
		pad(root, k, w);
		part(root, "cyl6", k.plate, [r * 0.45, 12, r * 0.45], [0, 10, 0]);
		part(root, "cyl", k.metal, [3, 30, 3], [0, 31, 0]);
		const ring = group(root, [0, 36, 0]);
		part(ring, "torus", k.team, [r * 0.42, 4, r * 0.42], [0, 0, 0]);
		const emitter = part(root, "sphere", k.energy, [5, 5, 5], [0, 47, 0]);
		return {
			root,
			update(e, i) {
				ring.rotation.y = i.time * 1.4;
				ring.position.y = 36 + Math.sin(i.time * 2) * 3;
				emitter.visible = i.built >= 1;
			},
		};
	}
	function salvageYard(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		pad(root, k, w, w, 3);
		for (let n = 0; n < 10; n++) {
			const a = (n / 10) * Math.PI * 2;
			part(root, "box", k.metal, [1.5, 10, 1.5], [Math.cos(a) * w * 0.47, 8, Math.sin(a) * w * 0.47]); // fence posts
		}
		const scrap = [[-0.2, -0.2, 0.5], [-0.25, 0.2, 1.3], [0.1, 0.25, 2.2]];
		for (const [x, z, a] of scrap) part(root, "box", k.dark, [12, 7, 9], [x * w, 6, z * w], [0.2, a, 0.15]);
		part(root, "cyl", k.warn, [2.5, 34, 2.5], [w * 0.25, 20, -w * 0.2]);
		const boom = group(root, [w * 0.25, 36, -w * 0.2]);
		part(boom, "box", k.warn, [34, 2.5, 2.5], [-12, 0, 0]);
		part(boom, "box", k.black, [5, 4, 5], [-26, -6, 0]);
		part(root, "box", k.team, [8, 2, 8], [w * 0.25, 4, -w * 0.2]);
		return { root, update: (e, i) => (boom.rotation.y = Math.sin(i.time * 0.5) * 1.2) };
	}
	function outpost(k, r) {
		const root = new THREE.Group();
		part(root, "torus", k.warn, [r * 0.8, 10, r * 0.8], [0, 2, 0]); // sandbag ring
		part(root, "dome", k.plate, [r * 0.55, r * 0.5, r * 0.55], [0, 0, 0]);
		part(root, "torus", k.team, [r * 0.55, 3, r * 0.55], [0, 3, 0]);
		part(root, "cyl", k.metal, [1, 28, 1], [r * 0.2, 26, 0]);
		const light = part(root, "sphere", k.glow, [2, 2, 2], [r * 0.2, 41, 0]);
		return { root, update: (e, i) => (light.visible = Math.sin(i.time * 4) > 0) };
	}
	function uplink(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		pad(root, k, w);
		part(root, "box", k.plate, [w * 0.55, 16, w * 0.55], [0, 12, 0]);
		part(root, "box", k.team, [w * 0.57, 2, w * 0.57], [0, 17, 0]);
		const dish = group(root, [0, 26, 0]);
		part(dish, "cyl", k.metal, [3, 10, 3], [0, -3, 0]);
		const bowl = group(dish, [0, 6, 0]);
		bowl.rotation.z = 0.5;
		part(bowl, "cone", k.metal, [r * 0.6, 10, r * 0.6], [0, 0, 0], [Math.PI, 0, 0]);
		part(bowl, "cyl", k.dark, [1, 14, 1], [0, 7, 0]);
		part(bowl, "sphere", k.glass, [2.2, 2.2, 2.2], [0, 14, 0]);
		return { root, update: (e, i) => (dish.rotation.y = i.time * 0.3) };
	}

	// ---- Wildlife and monsters ----
	function quadruped(scale, mat, extra) {
		const root = new THREE.Group(),
			body = group(root, [0, 10 * scale, 0]),
			legs = [];
		part(body, "sphere", mat, [12 * scale, 6.5 * scale, 6.5 * scale], [0, 0, 0]);
		part(body, "sphere", nature.belly, [9 * scale, 4 * scale, 5.5 * scale], [0, -2.5 * scale, 0]);
		const head = group(body, [11 * scale, 3 * scale, 0]);
		part(head, "sphere", mat, [5.5 * scale, 4.5 * scale, 4.5 * scale], [0, 0, 0]);
		for (const z of [-1.8, 1.8]) part(head, "sphere", nature.eye, [0.9 * scale, 0.9 * scale, 0.9 * scale], [4 * scale, 1.5 * scale, z * scale]);
		part(body, "cone", mat, [2 * scale, 9 * scale, 2 * scale], [-13 * scale, 1.5 * scale, 0], [0, 0, Math.PI / 2 + 0.4]); // tail
		for (const x of [-6, 6])
			for (const z of [-3.5, 3.5]) {
				const leg = group(body, [x * scale, -3 * scale, z * scale]);
				part(leg, "box", mat, [2.5 * scale, 8 * scale, 2.5 * scale], [0, -4 * scale, 0]);
				legs.push(leg);
			}
		extra?.(head, body, scale);
		return {
			root,
			update(e, i) {
				const s = i.moving ? Math.sin(i.time * 13 + e.id) * 0.55 : 0;
				legs.forEach((l, n) => (l.rotation.z = n === 0 || n === 3 ? s : -s));
				body.position.y = 10 * scale + (i.moving ? Math.abs(Math.sin(i.time * 13 + e.id)) * scale : 0);
				head.rotation.y = -Math.max(-0.6, Math.min(0.6, i.aim)) ;
				head.rotation.z = i.recoil * 0.4; // snap
			},
		};
	}
	const beast = (k, r) => quadruped(r / 9, nature.hide, (head, body, s) => part(head, "cone", nature.bone, [1.2 * s, 4 * s, 1.2 * s], [1 * s, 4 * s, 0])); // crest horn
	const frostTusk = (k, r) =>
		quadruped(r / 11, nature.fur, (head, body, s) => {
			for (const z of [-2.5, 2.5]) part(head, "cone", nature.bone, [1.1 * s, 9 * s, 1.1 * s], [5 * s, -2 * s, z * s], [0, 0, -Math.PI / 2 - 0.5]);
			part(body, "box", nature.fur, [10 * s, 4 * s, 5 * s], [0, 5 * s, 0]); // shaggy hump
		});
	function ashCrawler(k, r) {
		const root = new THREE.Group(),
			s = r / 19,
			body = group(root, [0, 12 * s, 0]),
			legs = [];
		part(body, "sphere", nature.basalt, [9 * s, 6 * s, 8 * s], [2 * s, 0, 0]);
		part(body, "sphere", nature.basalt, [11 * s, 8 * s, 10 * s], [-12 * s, 2 * s, 0]);
		part(body, "box", nature.ember, [14 * s, 1 * s, 1.5 * s], [-12 * s, 9.8 * s, 0]); // glowing seam
		for (const z of [-2.5, 2.5]) part(body, "sphere", nature.ember, [1.2 * s, 1.2 * s, 1.2 * s], [10 * s, 2 * s, z * s]);
		for (let n = 0; n < 4; n++)
			for (const side of [-1, 1]) {
				const leg = group(body, [(4 - n * 4) * s, 0, side * 6 * s]);
				leg.rotation.y = side * (0.4 - n * 0.3);
				part(leg, "box", nature.basalt, [2 * s, 2 * s, 14 * s], [0, 3 * s, side * 7 * s], [side * -0.5, 0, 0]);
				part(leg, "box", nature.basalt, [1.6 * s, 14 * s, 1.6 * s], [0, -4 * s, side * 13 * s]);
				legs.push(leg);
			}
		return {
			root,
			update(e, i) {
				legs.forEach((l, n) => (l.rotation.z = i.moving ? Math.sin(i.time * 16 + n * 1.3 + e.id) * 0.3 : 0));
			},
		};
	}
	// Dune maw: a sand crater with a ring of teeth; the throat rises when it strikes.
	function duneMaw(k, r) {
		const root = new THREE.Group();
		part(root, "torus", nature.sand, [r * 0.9, 14, r * 0.9], [0, 1, 0]);
		part(root, "cyl", nature.maw, [r * 0.7, 1, r * 0.7], [0, 0.5, 0]);
		const throat = group(root, [0, -20, 0]);
		for (let n = 0; n < 3; n++) part(throat, "cyl", n % 2 ? nature.sand : nature.hide, [r * (0.5 - n * 0.08), 12, r * (0.5 - n * 0.08)], [0, n * 11, 0]);
		for (let n = 0; n < 12; n++) {
			const a = (n / 12) * Math.PI * 2;
			part(throat, "cone", nature.bone, [2.5, 12, 2.5], [Math.cos(a) * r * 0.36, 36, Math.sin(a) * r * 0.36], [Math.sin(a) * -0.5, 0, Math.cos(a) * 0.5]);
		}
		return {
			root,
			update(e, i) {
				const up = e.target != null || i.recoil > 0 ? 1 : 0;
				throat.position.y += ((up ? 0 : -34) - throat.position.y) * 0.1;
			},
		};
	}

	// ---- Swarm: obsidian guardians ----
	const hash = (s) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
	function monolith(parent, k, h, w, [x, z], stripe) {
		const m = group(parent, [x, 0, z]);
		part(m, "prism", k.plate, [w, h, w], [0, h / 2 + 3, 0]);
		part(m, "pyramid", k.metal, [w * 0.62, w * 1.4, w * 0.62], [0, h + 3 + w * 0.7, 0]);
		part(m, "box", k.black, [w * 0.12, h * 0.8, w * 1.3], [0, h * 0.45 + 3, 0]); // seam
		if (stripe) part(m, "box", k.team, [w * 1.05, 3, w * 1.05], [0, h * 0.3, 0]);
		return m;
	}
	function swarmBuilding(k, r, type) {
		const root = new THREE.Group(),
			seed = hash(type),
			n = type === "hq" ? 5 : 3 + (seed % 3),
			tall = type === "hq" ? 3 : type === "monolith" ? 3.4 : 1.4 + ((seed >> 4) % 10) / 10;
		part(root, "box", k.warn, [r * 1.7, 3, r * 1.7], [0, 1.5, 0]); // plinth
		monolith(root, k, r * tall, r * 0.42, [0, 0], true);
		for (let m = 0; m < n; m++) {
			const a = (m / n) * Math.PI * 2 + (seed % 7);
			monolith(root, k, r * tall * (0.45 + ((seed >> (m + 2)) % 5) * 0.08), r * 0.26, [Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55], false);
		}
		// Defences turn a crown of prongs towards the target.
		let head = null;
		if (type === "turret" || type === "flak") {
			head = group(root, [0, r * tall + r * 0.2, 0]);
			for (const z of [-3, 3]) part(head, "prism", k.metal, [2.5, 22, 2.5], [10, 0, z], [0, 0, -Math.PI / 2]);
		}
		return { root, update: (e, i) => head && (head.rotation.y = -i.aim) };
	}
	// Small units: a wedge of stone on four thin legs, a lens at the front.
	function swarmSentry(k, size, o = {}) {
		const root = new THREE.Group(),
			s = size / 10,
			body = group(root, [0, 9 * s, 0]),
			legs = [];
		part(body, "wedge", k.plate, [18 * s, 7 * s, 11 * s], [0, 0, 0]);
		part(body, "pyramid", k.metal, [6 * s, 5 * s, 6 * s], [-2 * s, 5.5 * s, 0]);
		part(body, "box", k.glass, [1 * s, 1.6 * s, 3 * s], [8 * s, 0, 0]);
		part(body, "box", k.team, [3 * s, 7.4 * s, 11.4 * s], [-6 * s, 0, 0]);
		if (o.prongs) for (const z of [-3, 3]) part(body, "prism", k.metal, [1.6 * s, 13 * s, 1.6 * s], [12 * s, 0, z * s], [0, 0, -Math.PI / 2]);
		if (o.spine) for (let n = 0; n < 3; n++) part(body, "pyramid", k.metal, [2 * s, 5 * s, 2 * s], [(-6 + n * 4) * s, 5 * s, 0]);
		for (const x of [-5, 5])
			for (const z of [-4, 4]) {
				const leg = group(body, [x * s, -2 * s, z * s]);
				part(leg, "box", k.dark, [1.6 * s, 9 * s, 1.6 * s], [0, -3.5 * s, z * 0.2 * s], [z * 0.05, 0, 0]);
				legs.push(leg);
			}
		return {
			root,
			update(e, i) {
				legs.forEach((l, n) => (l.rotation.z = i.moving ? Math.sin(i.time * 13 + e.id + (n % 2) * Math.PI) * 0.5 : 0));
				body.rotation.y = -Math.max(-0.5, Math.min(0.5, i.aim)) * 0.5;
			},
		};
	}
	function crawler(k, r) {
		const root = new THREE.Group(),
			s = r / 9,
			legs = [];
		part(root, "wedge", k.plate, [18 * s, 4 * s, 10 * s], [0, 5 * s, 0]);
		part(root, "box", k.team, [3 * s, 4.2 * s, 10.2 * s], [-6 * s, 5 * s, 0]);
		for (let n = 0; n < 3; n++)
			for (const side of [-1, 1]) {
				const leg = group(root, [(-5 + n * 5) * s, 5 * s, side * 5 * s]);
				part(leg, "box", k.dark, [1.4 * s, 1.4 * s, 8 * s], [0, -1.5 * s, side * 4 * s], [side * 0.5, 0, 0]);
				legs.push(leg);
			}
		return { root, update: (e, i) => legs.forEach((l, n) => (l.rotation.y = i.moving ? Math.sin(i.time * 22 + n * 2 + e.id) * 0.4 : 0)) };
	}
	// Vehicles: a long tapering stone body on 2–4 legs, weapon prongs turning to the target.
	function swarmWalker(k, r, o = {}) {
		const root = new THREE.Group(),
			s = r / 20,
			n = o.legs ?? 4,
			body = group(root, [0, 20 * s, 0]),
			legs = [];
		part(body, "prism", k.plate, [9 * s, (o.long ? 44 : 34) * s, 13 * s], [0, 0, 0], [0, 0, -Math.PI / 2]);
		part(body, "pyramid", k.metal, [6 * s, 10 * s, 8 * s], [(o.long ? 25 : 20) * s, 0, 0], [0, 0, -Math.PI / 2]);
		part(body, "box", k.team, [4 * s, 10 * s, 14 * s], [-9 * s, 0, 0]);
		part(body, "box", k.black, [30 * s, 1 * s, 2 * s], [0, 6 * s, 0]); // groove
		if (o.plates) for (const z of [-1, 1]) part(body, "box", k.metal, [22 * s, 9 * s, 1.5 * s], [0, 0, z * 8 * s]);
		if (o.hump) part(body, "prism", k.metal, [10 * s, 14 * s, 10 * s], [-4 * s, 10 * s, 0]);
		if (o.sensors) for (const z of [-4, 4]) part(body, "prism", k.glass, [1.2 * s, 14 * s, 1.2 * s], [-2 * s, 11 * s, z * s]);
		const xs = n === 2 ? [0] : n === 3 ? [9, -9] : [9, -9];
		const places = n === 3 ? [[9, -1], [9, 1], [-11, 0]] : xs.flatMap((x) => [[x, -1], [x, 1]]);
		for (const [x, side] of places) {
			const leg = group(body, [x * s, -3 * s, side * (side ? 7 : 0) * s]);
			part(leg, "box", k.dark, [2.6 * s, 3 * s, 12 * s], [0, 2 * s, side * 6 * s]);
			part(leg, "prism", k.dark, [2.2 * s, 22 * s, 2.2 * s], [0, -8 * s, side * 12 * s], [Math.PI, 0, 0]);
			legs.push(leg);
		}
		const mount = group(body, [6 * s, 7 * s, 0]),
			weapon = group(mount);
		if (o.spike) part(weapon, "prism", k.metal, [2.5 * s, 34 * s, 2.5 * s], [10 * s, 8 * s, 0], [0, 0, -Math.PI / 2 + 0.5]);
		else for (const z of o.twin ? [-3.5, 3.5] : o.prong ? [0] : []) part(weapon, "prism", k.metal, [2.2 * s, 20 * s, 2.2 * s], [10 * s, 0, z * s], [0, 0, -Math.PI / 2]);
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
	function swarmFlyer(k, r) {
		const root = new THREE.Group(),
			frame = group(root),
			s = r / 17;
		part(frame, "octa", k.plate, [14 * s, 4 * s, 7 * s], [0, 0, 0]);
		for (const z of [-1, 1]) part(frame, "prism", k.metal, [2 * s, 22 * s, 5 * s], [-3 * s, 0, z * 12 * s], [Math.PI / 2, 0, 0]);
		part(frame, "box", k.team, [3 * s, 4.2 * s, 5 * s], [-5 * s, 0, 0]);
		return { root, update: (e, i) => (frame.rotation.x = Math.sin(i.time * 1.4 + e.id) * 0.3) };
	}
	const SWARM_UNITS = {
		worker: (k) => swarmSentry(k, 11, { prongs: true }),
		trooper: (k) => swarmSentry(k, 10),
		rocket: (k) => swarmSentry(k, 10, { prongs: true }),
		spitter: (k) => swarmSentry(k, 12, { spine: true }),
		saboteur: (k) => swarmSentry(k, 9),
		crawler,
		tank: (k, r) => swarmWalker(k, r, { prong: true }),
		heavy: (k, r) => swarmWalker(k, r, { twin: true, plates: true }),
		artillery: (k, r) => swarmWalker(k, r, { spike: true }),
		transport: (k, r) => swarmWalker(k, r, { legs: 3, long: true, plates: true }),
		skyguard: (k, r) => swarmWalker(k, r, { sensors: true }),
		hauler: (k, r) => swarmWalker(k, r, { legs: 3, long: true }),
		colossus: (k, r) => swarmWalker(k, r, { legs: 2, plates: true, twin: true, hump: true }),
	};

	const BUILDERS = {
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
		beast,
		frostTusk,
		ashCrawler,
		duneMaw,
		// Swarm-only types outside the Swarm dispatch (e.g. a crawler without a faction tag).
		crawler: (k, r) => crawler(kit(2, "swarm", "#8a94a3", []), r),
		spitter: (k) => swarmSentry(kit(2, "swarm", "#8a94a3", []), 12, { spine: true }),
		colossus: (k, r) => swarmWalker(kit(2, "swarm", "#8a94a3", []), r, { legs: 2, plates: true, twin: true, hump: true }),
		monolith: (k, r) => swarmBuilding(kit(2, "swarm", "#8a94a3", []), r, "monolith"),
	};

	// Which builder draws an entity: Swarm faction first (its own look for every shared type), then the type.
	function builderOf(e) {
		const s = RTS.TYPES[e.type];
		if (!s) return null;
		if (e.faction === "swarm" && !s.threat && e.type !== "wall" && e.type !== "gate") {
			if (!s.speed) return (k, r) => swarmBuilding(k, r, e.type);
			if (s.flying) return swarmFlyer;
			return SWARM_UNITS[e.type] || (s.radius < 14 ? (k) => swarmSentry(k, s.radius) : (k, r) => swarmWalker(k, r, { prong: true }));
		}
		return BUILDERS[e.type] || null;
	}

	return {
		has: (e) => !!builderOf(e),
		// A fresh model for an entity; its look depends on type, side and faction only.
		create(e, teamColors) {
			const s = RTS.TYPES[e.type],
				model = builderOf(e)(kit(e.team, e.faction, e.tint, teamColors), s.radius);
			model.key = [e.type, e.team, e.faction || "", e.tint || ""].join("|");
			return model;
		},
		types: () => Object.keys(BUILDERS),
		setNight,
	};
}
