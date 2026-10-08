/* Ships of the orbital battle (0.130, space-rules.js): corvette, frigate, destroyer ("lancer") and
   cruiser. Built with the shape kit of models-detail-3d.js; the Colonies' hulls are rounded with cyan
   drives, the Dominium's six-sided and angular with orange drives. Nose along +X; the renderer lifts
   them over the plane of the battle (RTS.SPACE.hover). The hull bobs and banks a little, turrets follow
   the target, drive plumes grow while the ship moves, navigation lights blink. */
export function createShips3D(THREE, { tools, group }) {
	const { mesh, box, cyl, ball, pipe, loftGeo } = tools;
	const n2 = (v) => Math.round(v * 100) / 100;
	// A hull through rings along X: [x, half beam, half height, y offset].
	const hull = (key, stations, sides) =>
		loftGeo(
			"ship" + key + sides,
			stations.map(([x, w, h, dy = 0]) =>
				Array.from({ length: sides }, (_, i) => {
					const a = (i / sides) * Math.PI * 2 + (sides === 6 ? Math.PI / 6 : 0);
					return [n2(x), n2(Math.sin(a) * h + dy), n2(Math.cos(a) * w)];
				}),
			),
		);
	// A drive: housing, glowing throat and a plume (returned, scaled by speed in update).
	function drive(parent, k, [x, y, z], r) {
		const hot = k.dominion ? k.fire : k.energy;
		cyl(parent, k.dark, r, r * 1.6, [x, y, z], { axis: "x", segs: 10, top: r * 0.85 });
		cyl(parent, k.steel, r * 0.8, r * 0.5, [x - r * 0.9, y, z], { axis: "x", segs: 10 });
		cyl(parent, hot, r * 0.62, 0.4, [x - r * 1.2, y, z], { axis: "x", segs: 10 });
		const plume = group(parent, [x - r * 1.2, y, z]);
		cyl(plume, hot, 0.05, 1, [-0.5, 0, 0], { axis: "x", segs: 8, top: r * 0.55 });
		return plume;
	}
	// A gun turret on the deck: ring, housing, barrels (returned group, turned towards the target).
	function turret(parent, k, [x, y, z], s, barrels = 2, len = 2.4) {
		const g = group(parent, [x, y, z]);
		cyl(g, k.dark, s, s * 0.5, [0, s * 0.25, 0], { segs: k.dominion ? 6 : 12 });
		box(g, k.plate, [s * 1.5, s * 0.7, s * 1.3], [0, s * 0.8, 0], null, s * 0.15);
		for (let b = 0; b < barrels; b++) {
			const off = (b - (barrels - 1) / 2) * s * 0.45;
			cyl(g, k.steel, s * 0.13, s * len, [s * (0.6 + len / 2), s * 0.85, off], { axis: "x", segs: 6 });
		}
		return g;
	}
	// Navigation lights: red port (-Z), green starboard (+Z), a blinking white strobe (returned).
	function lights(parent, k, [x, y, z], tail) {
		box(parent, k.navRed, [0.9, 0.7, 0.7], [x, y, -z], null, 0.2);
		box(parent, k.navGreen, [0.9, 0.7, 0.7], [x, y, z], null, 0.2);
		return box(parent, k.strobe, [0.8, 0.8, 0.8], tail, null, 0.2);
	}
	// Bridge windows: a row of small lit panes.
	function windows(parent, k, x0, x1, y, z) {
		for (let x = x0; x <= x1; x += 1.6) box(parent, k.glass, [1, 0.5, 0.2], [x, y, z], null, 0.05);
	}
	// A row of small lit ports along a hull side (both sides), and a pale light line along the keel.
	function ports(parent, k, x0, x1, y, z, step = 1.8) {
		for (const side of [-1, 1]) for (let x = x0; x <= x1; x += step) box(parent, k.glass, [0.7, 0.35, 0.15], [x, y, side * z], null, 0.05);
	}
	function ship(k, r, build) {
		const root = new THREE.Group(),
			frame = group(root),
			sides = k.dominion ? 6 : 10,
			parts = { plumes: [], turrets: [], strobe: null };
		build(frame, parts, sides, r / 13);
		return {
			root,
			update(e, i) {
				const t = i.time + e.id * 0.7;
				frame.position.y = Math.sin(t * 1.1) * 1.4;
				frame.rotation.x = Math.sin(t * 0.6) * 0.05 + (i.moving ? Math.sin(t * 0.35) * 0.06 : 0);
				frame.rotation.z = Math.sin(t * 0.8) * 0.025;
				const thrust = i.moving ? 1 + 0.15 * Math.sin(i.time * 40 + e.id) : 0.35;
				for (const [p, len] of parts.plumes) p.scale.set(len * thrust, 1, 1);
				for (const g of parts.turrets) g.rotation.y = -i.aim;
				if (parts.strobe) parts.strobe.visible = (i.time * 1.1 + e.id * 0.37) % 1 < 0.1;
				// The carrier's deck lights run towards the bow in sequence (a landing guide).
				if (parts.deckLights) for (const [l, x] of parts.deckLights) l.visible = (((x + 16) / 32 - i.time * 0.8) % 1 + 1) % 1 < 0.25;
				if (parts.charge) {
					const cd = RTS.TYPES[e.type]?.cooldown || 1,
						c = Math.max(0, Math.min(1, 1 - (e.cooldown || 0) / cd)),
						flash = i.recoil || 0;
					parts.charge.scale.setScalar(0.2 + c * c * 1.1 + flash * 1.6);
				}
			},
		};
	}
	// Corvette: a slim dart with swept fins and twin drives, a nose gun.
	const corvette = (k, r) =>
		ship(k, r, (f, p, sides, s) => {
			mesh(f, hull("corv", [[-13, 0.3, 0.3], [-12, 3.2, 2], [-5, 4, 2.6], [4, 3, 2.2, 0.2], [11, 1.4, 1.2, 0.2], [15, 0.2, 0.2, 0.2]].map(([x, w, h, dy]) => [x * s, w * s, h * s, (dy || 0) * s]), sides), k.plate);
			for (const z of [-1, 1]) {
				mesh(f, hull("corvFin" + z, [[-10, 0.2, 0.6, 0], [-4, 0.2, 0.6, 0]].map(([x, w, h]) => [x * s, w * s, h * s, 0]), 4), k.plate, [0, 0, z * 6 * s], [0, z * 0.5, 0]);
				box(f, k.plate, [7 * s, 0.6 * s, 5 * s], [-7 * s, 0, z * 4.5 * s], [0, z * 0.35, 0], 0.2 * s);
				box(f, k.team, [3 * s, 0.7 * s, 2 * s], [-8 * s, 0.1 * s, z * 6.2 * s], [0, z * 0.35, 0], 0.1);
				p.plumes.push([drive(f, k, [-12 * s, 0, z * 2.4 * s], 1.4 * s), 9 * s]);
			}
			ball(f, k.canopy, 1, [5 * s, 1.8 * s, 0], [3 * s, 1.1 * s, 1.4 * s]);
			cyl(f, k.steel, 0.25 * s, 5 * s, [14 * s, -0.4 * s, 0], { axis: "x", segs: 6 });
			p.strobe = lights(f, k, [-6 * s, 0.4 * s, 7.5 * s], [-12 * s, 2.2 * s, 0]);
			ports(f, k, -8 * s, 2 * s, 0.6 * s, 3.9 * s, 2.2 * s);
		});
	// Frigate: a broader hull with side pods, a dorsal twin turret and three drives.
	const frigate = (k, r) =>
		ship(k, r, (f, p, sides, s) => {
			mesh(f, hull("frig", [[-14, 0.3, 0.3], [-13, 4.5, 3], [-4, 5.5, 3.6], [6, 4.4, 3, 0.3], [12, 2.4, 1.8, 0.3], [16, 0.3, 0.3, 0.3]].map(([x, w, h, dy]) => [x * s, w * s, h * s, (dy || 0) * s]), sides), k.plate);
			for (const z of [-1, 1]) {
				mesh(f, hull("frigPod", [[-12, 0.3, 0.3], [-11, 1.8, 1.6], [2, 1.8, 1.6], [5, 0.3, 0.3]].map(([x, w, h]) => [x * s, w * s, h * s, 0]), sides), k.dark, [0, -0.6 * s, z * 7 * s]);
				box(f, k.metal, [6 * s, 0.8 * s, 3 * s], [-4 * s, -0.4 * s, z * 5 * s], null, 0.2 * s);
				box(f, k.team, [4 * s, 1.2 * s, 0.4 * s], [-2 * s, -0.4 * s, z * 8.9 * s], null, 0.1);
				p.plumes.push([drive(f, k, [-12 * s, -0.6 * s, z * 7 * s], 1.3 * s), 8 * s]);
			}
			p.plumes.push([drive(f, k, [-13 * s, 0, 0], 2 * s), 12 * s]);
			box(f, k.metal, [6 * s, 2.4 * s, 4 * s], [-5 * s, 3.4 * s, 0], null, 0.4 * s); // bridge block
			windows(f, k, -7 * s, -3.2 * s, 4 * s, 2.05 * s);
			p.turrets.push(turret(f, k, [4 * s, 2.6 * s, 0], 1.6 * s, 2, 2.6));
			pipe(f, k.steel, [-6 * s, 4.6 * s, 0], [-6 * s, 8 * s, 0], 0.15 * s, 5); // mast
			p.strobe = lights(f, k, [-4 * s, 0, 9.4 * s], [-6 * s, 8.2 * s, 0]);
			ports(f, k, -10 * s, 8 * s, 0.8 * s, 5.4 * s, 2 * s);
		});
	// Destroyer (lancer): a long narrow hull built round a spinal gun — the barrel runs past the bow.
	const lancer = (k, r) =>
		ship(k, r, (f, p, sides, s) => {
			mesh(f, hull("lanc", [[-16, 0.3, 0.3], [-15, 4, 3.2], [-6, 4.6, 3.4], [6, 3.2, 2.6], [14, 2, 1.6], [18, 0.3, 0.3]].map(([x, w, h]) => [x * s, w * s, h * s, 0]), sides), k.plate);
			// The spinal gun: a steel barrel with coil rings, glowing muzzle.
			cyl(f, k.steel, 1 * s, 26 * s, [10 * s, 0.4 * s, 0], { axis: "x", segs: 8 });
			for (let x = 2; x <= 18; x += 4) cyl(f, k.dark, 1.6 * s, 1 * s, [x * s, 0.4 * s, 0], { axis: "x", segs: 8 });
			cyl(f, k.dominion ? k.fire : k.energy, 0.7 * s, 0.4 * s, [23.2 * s, 0.4 * s, 0], { axis: "x", segs: 8 });
			// The charge at the muzzle (grows between shots, flares as it fires).
			p.charge = group(f, [23.8 * s, 0.4 * s, 0]);
			ball(p.charge, k.dominion ? k.fire : k.energy, 1.1 * s, [0, 0, 0]);
			for (const z of [-1, 1]) {
				box(f, k.plate, [10 * s, 1 * s, 4 * s], [-9 * s, 0, z * 5.4 * s], [0, z * 0.2, 0], 0.3 * s);
				box(f, k.team, [3 * s, 1.2 * s, 2.4 * s], [-12 * s, 0.1 * s, z * 6.6 * s], [0, z * 0.2, 0], 0.1);
				p.plumes.push([drive(f, k, [-15 * s, 0, z * 2.6 * s], 1.8 * s), 12 * s]);
			}
			box(f, k.metal, [7 * s, 3 * s, 3.6 * s], [-8 * s, 3.6 * s, 0], null, 0.4 * s); // bridge tower
			windows(f, k, -10.5 * s, -6 * s, 4.4 * s, 1.85 * s);
			p.turrets.push(turret(f, k, [-1 * s, 2.8 * s, 0], 1.2 * s, 1, 2));
			p.strobe = lights(f, k, [-9 * s, 0.6 * s, 7.6 * s], [-8 * s, 5.4 * s, 0]);
			ports(f, k, -12 * s, 10 * s, 0.6 * s, 3.9 * s, 2 * s);
		});
	// Cruiser: a heavy hull with a stepped superstructure, three turrets, hangar flanks and four drives.
	const cruiser = (k, r) =>
		ship(k, r, (f, p, sides, s) => {
			mesh(f, hull("crui", [[-17, 0.4, 0.4], [-16, 6, 3.6], [-6, 7.6, 4.2], [6, 6.6, 3.8, 0.2], [13, 4, 2.6, 0.2], [18, 0.4, 0.4, 0.2]].map(([x, w, h, dy]) => [x * s, w * s, h * s, (dy || 0) * s]), sides), k.plate);
			for (const z of [-1, 1]) {
				box(f, k.dark, [16 * s, 3 * s, 3 * s], [-5 * s, -0.5 * s, z * 8.5 * s], null, 0.4 * s); // hangar flank
				box(f, k.black, [3 * s, 1.6 * s, 0.4 * s], [1 * s, -0.5 * s, z * 10 * s], null, 0.05); // hangar mouth
				box(f, k.team, [6 * s, 0.6 * s, 3.2 * s], [-8 * s, 1.1 * s, z * 8.5 * s], null, 0.1);
				p.plumes.push([drive(f, k, [-15 * s, -0.5 * s, z * 8.5 * s], 1.4 * s), 9 * s]);
				p.plumes.push([drive(f, k, [-16 * s, 0, z * 3 * s], 2.2 * s), 14 * s]);
			}
			box(f, k.metal, [12 * s, 2.4 * s, 7 * s], [-6 * s, 4.4 * s, 0], null, 0.4 * s);
			box(f, k.metal, [6 * s, 2.4 * s, 4.6 * s], [-7 * s, 6.8 * s, 0], null, 0.4 * s);
			windows(f, k, -9.5 * s, -4.5 * s, 7.4 * s, 2.35 * s);
			ball(f, k.glass, 1 * s, [-7 * s, 8.6 * s, 0], [1, 0.6, 1]); // sensor dome
			pipe(f, k.steel, [-9 * s, 8 * s, 0], [-9 * s, 12 * s, 0], 0.18 * s, 5);
			p.turrets.push(turret(f, k, [8 * s, 3.4 * s, 0], 1.8 * s, 3, 2.6));
			p.turrets.push(turret(f, k, [2 * s, 4.2 * s, 0], 1.6 * s, 2, 2.4));
			p.turrets.push(turret(f, k, [-14 * s, 3.6 * s, 0], 1.4 * s, 2, 2.2));
			p.strobe = lights(f, k, [-6 * s, 1 * s, 10.2 * s], [-9 * s, 12.2 * s, 0]);
			ports(f, k, -14 * s, 12 * s, 1.2 * s, 7.4 * s, 1.8 * s);
			ports(f, k, -11 * s, 1 * s, 4.2 * s, 3.55 * s, 1.6 * s);
		});
	// Carrier (0.136): a long, broad hull under a flat flight deck with a runway (dashed centre line, edge
	// lights blinking in sequence towards the bow), the island (bridge tower with mast and dish) on one
	// side, the glowing mouth of the launch bay at the bow, point-defence turrets and four drives.
	const carrier = (k, r) =>
		ship(k, r, (f, p, sides, s) => {
			mesh(f, hull("carr", [[-17, 0.5, 0.5], [-16, 6.5, 3.2], [-4, 7.2, 3.6], [10, 6.4, 3.2], [16, 4, 2.2], [19, 0.5, 0.5]].map(([x, w, h]) => [x * s, w * s, h * s, 0]), sides), k.plate);
			// The flight deck and its runway.
			box(f, k.dark, [34 * s, 0.8 * s, 12 * s], [1 * s, 3.6 * s, 0], null, 0.3 * s);
			box(f, k.metal, [34.4 * s, 0.4 * s, 0.6 * s], [1 * s, 4.1 * s, 6 * s], null, 0.1);
			box(f, k.metal, [34.4 * s, 0.4 * s, 0.6 * s], [1 * s, 4.1 * s, -6 * s], null, 0.1);
			for (let x = -14; x <= 15; x += 3.2) box(f, k.white, [1.6 * s, 0.2 * s, 0.4 * s], [x * s, 4.1 * s, 0], null, 0.05);
			const deckLights = [];
			for (let x = -15; x <= 16; x += 2.6)
				for (const z of [-5.4, 5.4]) {
					const l = box(f, k.glass, [0.6 * s, 0.3 * s, 0.6 * s], [x * s, 4.2 * s, z * s], null, 0.05);
					deckLights.push([l, x]);
				}
			p.deckLights = deckLights;
			// The launch bay at the bow: a dark mouth with a glow inside.
			box(f, k.black, [1 * s, 2.4 * s, 7 * s], [17.6 * s, 1.6 * s, 0], null, 0.1);
			box(f, k.dominion ? k.fire : k.energy, [0.4 * s, 1.4 * s, 5.6 * s], [17.2 * s, 1.6 * s, 0], null, 0.05);
			// The island on the starboard side.
			box(f, k.metal, [7 * s, 5 * s, 2.6 * s], [-4 * s, 6.6 * s, 7.4 * s], null, 0.4 * s);
			box(f, k.metal, [4 * s, 2.4 * s, 2.2 * s], [-4.5 * s, 10.2 * s, 7.4 * s], null, 0.3 * s);
			windows(f, k, -6 * s, -2 * s, 8.4 * s, 8.75 * s);
			box(f, k.team, [7.2 * s, 0.8 * s, 2.8 * s], [-4 * s, 5.2 * s, 7.4 * s], null, 0.1);
			pipe(f, k.steel, [-5 * s, 11.4 * s, 7.4 * s], [-5 * s, 16 * s, 7.4 * s], 0.2 * s, 5);
			ball(f, k.glass, 0.9 * s, [-3 * s, 12 * s, 7.4 * s], [1, 0.4, 1]);
			// Side sponsons with point-defence turrets.
			for (const z of [-1, 1]) {
				box(f, k.dark, [12 * s, 2 * s, 2 * s], [2 * s, 0.6 * s, z * 8 * s], null, 0.3 * s);
				p.turrets.push(turret(f, k, [6 * s, 1.8 * s, z * 8 * s], 0.9 * s, 2, 2));
				p.turrets.push(turret(f, k, [-3 * s, 1.8 * s, z * 8 * s], 0.9 * s, 2, 2));
				p.plumes.push([drive(f, k, [-16 * s, -0.4 * s, z * 4.2 * s], 2 * s), 13 * s]);
				p.plumes.push([drive(f, k, [-15 * s, -0.4 * s, z * 1.4 * s], 1.6 * s), 10 * s]);
			}
			ports(f, k, -13 * s, 13 * s, 1.2 * s, 6.6 * s, 2 * s);
			p.strobe = lights(f, k, [-2 * s, 1 * s, 9.2 * s], [-5 * s, 16.2 * s, 7.4 * s]);
		});
	// Fighter (launched by a carrier): a small delta with a canopy, twin fins and one bright drive.
	const fighter = (k, r) =>
		ship(k, r, (f, p, sides, s) => {
			mesh(f, hull("ftr", [[-6, 0.2, 0.2], [-5, 1.6, 1], [0, 1.8, 1.1], [4, 0.9, 0.7], [7, 0.15, 0.15]].map(([x, w, h]) => [x * s, w * s, h * s, 0]), sides), k.plate);
			for (const z of [-1, 1]) {
				box(f, k.plate, [5 * s, 0.3 * s, 4 * s], [-1.5 * s, 0, z * 3 * s], [0, z * 0.45, 0], 0.1 * s);
				box(f, k.team, [1.6 * s, 0.35 * s, 1.2 * s], [-2.6 * s, 0.05 * s, z * 4.4 * s], [0, z * 0.45, 0], 0.05);
				box(f, k.plate, [2 * s, 1.6 * s, 0.2 * s], [-4 * s, 1 * s, z * 1 * s], [z * 0.3, 0, 0], 0.05);
			}
			ball(f, k.canopy, 1, [1.4 * s, 0.9 * s, 0], [1.6 * s, 0.6 * s, 0.8 * s]);
			p.plumes.push([drive(f, k, [-5.6 * s, 0, 0], 0.9 * s), 6 * s]);
		});
	// Pirates (0.141): rusty, patched, mismatched — dark red hulls with welded-on plates, hazard stripes,
	// ram spikes and hot red drives; their hideout is a hollowed asteroid with modules bolted on, a
	// turning docking ring, scrap and red beacons. Their own colours (they are no side's ships).
	const PIR = {
		hull: new THREE.MeshStandardMaterial({ color: "#4a2a26", roughness: 0.75, metalness: 0.45, flatShading: true }),
		rust: new THREE.MeshStandardMaterial({ color: "#7a3e22", roughness: 0.9, metalness: 0.3, flatShading: true }),
		dark: new THREE.MeshStandardMaterial({ color: "#1c1a1a", roughness: 0.6, metalness: 0.6, flatShading: true }),
		warn: new THREE.MeshStandardMaterial({ color: "#d8a028", roughness: 0.6, metalness: 0.2, flatShading: true }),
		glow: new THREE.MeshStandardMaterial({ color: "#ff5a3a", emissive: "#ff2a12", emissiveIntensity: 1.6, roughness: 0.4 }),
		rock: new THREE.MeshStandardMaterial({ color: "#4d4640", roughness: 1, metalness: 0.05, flatShading: true }),
	};
	const pirateKit = (k) => ({ ...k, dominion: true, fire: PIR.glow, energy: PIR.glow, glass: PIR.glow, dark: PIR.dark, steel: PIR.dark, plate: PIR.hull, metal: PIR.rust, team: PIR.warn, windowCool: PIR.glow });
	const pirate = (k0, r) =>
		ship(pirateKit(k0), r, (f, p, sides, s) => {
			const k = pirateKit(k0);
			mesh(f, hull("pir", [[-12, 0.3, 0.3], [-11, 3.6, 2.2], [-3, 4.2, 2.8], [5, 3.2, 2.2, 0.3], [11, 1.2, 1.1, 0.3], [14, 0.2, 0.2, 0.3]].map(([x, w, h, dy]) => [x * s, w * s, h * s, (dy || 0) * s]), 6), PIR.hull);
			// Welded-on plates, not matching; a cargo pod on one side only.
			box(f, PIR.rust, [6 * s, 1 * s, 3 * s], [-2 * s, 2.2 * s, 1.2 * s], [0, 0.2, 0.1], 0.2 * s);
			box(f, PIR.rust, [4 * s, 2.2 * s, 2.4 * s], [-5 * s, 0, -4.4 * s], null, 0.3 * s);
			for (let x = -6; x <= 2; x += 2) box(f, (x / 2) % 2 ? PIR.warn : PIR.dark, [1 * s, 0.4 * s, 0.4 * s], [x * s, 1.5 * s, 3.6 * s], null, 0.05);
			// Ram spikes at the bow, a gun on a crude mount.
			for (const z of [-1, 1]) cyl(f, PIR.dark, 0.5 * s, 5 * s, [13 * s, 0, z * 1.4 * s], { axis: "x", segs: 5, top: 0.02 });
			p.turrets.push(turret(f, k, [2 * s, 2.6 * s, 0], 1.1 * s, 2, 2.4));
			p.plumes.push([drive(f, k, [-11 * s, 0, 1.6 * s], 1.4 * s), 9 * s]);
			p.plumes.push([drive(f, k, [-11 * s, 0, -1.6 * s], 1.1 * s), 7 * s]);
			p.strobe = box(f, PIR.glow, [0.8 * s, 0.8 * s, 0.8 * s], [-6 * s, 3 * s, 0], null, 0.2);
		});
	function pirateBase(k0, r) {
		const root = new THREE.Group(),
			body = group(root, [0, 14, 0]),
			ring = group(body, [0, r * 0.15, 0]),
			s = r / 40,
			beacons = [];
		// The hollowed asteroid: a lumpy rock with a dark mouth.
		ball(body, PIR.rock, r * 0.62, [0, 0, 0], [1.25, 0.8, 1]);
		ball(body, PIR.rock, r * 0.38, [r * 0.45, -r * 0.1, r * 0.25], [1, 0.8, 1.1]);
		ball(body, PIR.rock, r * 0.3, [-r * 0.5, r * 0.05, -r * 0.3], [1.1, 0.9, 1]);
		box(body, PIR.dark, [r * 0.5, r * 0.3, r * 0.08], [r * 0.2, -r * 0.05, r * 0.6], null, 0.05);
		box(body, PIR.glow, [r * 0.4, r * 0.06, r * 0.04], [r * 0.2, -r * 0.05, r * 0.64], null, 0.02);
		// Modules bolted on, a mast, guns.
		box(body, PIR.hull, [r * 0.5, r * 0.25, r * 0.35], [-r * 0.15, r * 0.48, 0], null, 0.1 * r);
		box(body, PIR.rust, [r * 0.3, r * 0.2, r * 0.3], [r * 0.4, r * 0.38, -r * 0.25], null, 0.08 * r);
		for (let x = -0.35; x <= 0.1; x += 0.15) box(body, Math.round(x * 20) % 2 ? PIR.warn : PIR.dark, [r * 0.07, r * 0.05, r * 0.36], [x * r, r * 0.62, 0], null, 0.02);
		pipe(body, PIR.dark, [-r * 0.2, r * 0.6, 0], [-r * 0.2, r * 1.15, 0], 0.6 * s, 5);
		const k = pirateKit(k0),
			guns = [turret(body, k, [r * 0.45, r * 0.5, -r * 0.25], 2.4 * s, 2, 2.4), turret(body, k, [-r * 0.5, r * 0.3, r * 0.3], 2.2 * s, 2, 2.2)];
		// The docking ring round it, turning, with red beacons.
		const { torusGeo } = tools;
		mesh(ring, torusGeo(r * 1.0, r * 0.04, 40, "y"), PIR.dark);
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2;
			pipe(ring, PIR.rust, [Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55], [Math.cos(a) * r, 0, Math.sin(a) * r], 0.7 * s, 5);
			beacons.push(ball(ring, PIR.glow, 1.4 * s, [Math.cos(a) * r, r * 0.06, Math.sin(a) * r]));
		}
		ball(body, PIR.glow, 1.6 * s, [-r * 0.2, r * 1.18, 0]);
		return {
			root,
			update(e, i) {
				ring.rotation.y = i.time * 0.25;
				body.position.y = 14 + Math.sin(i.time * 0.5) * 2;
				for (const g of guns) g.rotation.y = -i.aim;
				beacons.forEach((b, n) => (b.visible = (i.time * 1.1 + n * 0.25) % 1 < 0.35));
			},
		};
	}
	// Mining drone (the worker in space, 0.133): a compact pod with a canopy, four thrusters on arms, a
	// cargo bay under it and two grabber claws in front; while it works, a mining beam reaches down and
	// the claws close. Hovers lower than the warships.
	function miner(k) {
		const root = new THREE.Group(),
			frame = group(root),
			hot = k.dominion ? k.fire : k.energy,
			sides = k.dominion ? 6 : 10;
		mesh(frame, hull("miner", [[-6, 0.3, 0.3], [-5, 4.4, 3.2], [1, 5, 3.6], [5, 3.6, 2.6, 0.4], [7.5, 0.4, 0.4, 0.4]], sides), k.plate);
		ball(frame, k.canopy, 1, [3.2, 2.2, 0], [2.4, 1.4, 2]);
		box(frame, k.team, [3, 0.5, 6], [-2.5, 3.2, 0], null, 0.1);
		box(frame, k.dark, [7, 3, 6], [-1, -3.6, 0], null, 0.4); // cargo bay
		box(frame, k.warn, [7.2, 0.6, 6.2], [-1, -2.2, 0], null, 0.1);
		const thrusters = [];
		for (const [x, z] of [[4, 5], [4, -5], [-5, 5], [-5, -5]]) {
			pipe(frame, k.steel, [x * 0.4, 0, z * 0.5], [x, 0.4, z * 1.4], 0.4, 5);
			cyl(frame, k.dark, 1.6, 1.8, [x, 0.4, z * 1.4], { segs: 8 });
			const jet = group(frame, [x, -0.8, z * 1.4]);
			cyl(jet, hot, 0.05, 1, [0, -0.5, 0], { segs: 8, top: 1.1 });
			thrusters.push(jet);
		}
		// Claws: two jaws on each side of the nose, opening and closing.
		const claws = [];
		for (const z of [-1, 1]) {
			const jaw = group(frame, [6.5, -1.2, z * 1.8]);
			box(jaw, k.steel, [3.5, 0.8, 0.8], [1.7, 0, 0], null, 0.1);
			box(jaw, k.metal, [0.9, 0.8, 1.4], [3.4, 0, -z * 0.5], null, 0.1);
			claws.push([jaw, z]);
		}
		// The mining beam (shown while working) and its emitter.
		cyl(frame, k.steel, 0.8, 1.6, [6.5, -2.6, 0], { segs: 8 });
		const beam = group(frame, [6.5, -3.4, 0]);
		cyl(beam, hot, 0.25, 1, [0, -0.5, 0], { segs: 8, top: 0.9 });
		const strobe = box(frame, k.strobe, [0.7, 0.7, 0.7], [-5.5, 2.6, 0], null, 0.2);
		return {
			root,
			update(e, i) {
				const t = i.time + e.id * 0.9;
				frame.position.y = Math.sin(t * 2.2) * 0.9;
				frame.rotation.z = (i.moving ? -0.12 : 0) + Math.sin(t * 1.3) * 0.04;
				frame.rotation.x = Math.sin(t * 1.7) * 0.05;
				const thrust = i.moving ? 3.2 : 1.6 + Math.sin(i.time * 30 + e.id) * 0.2;
				for (const j of thrusters) j.scale.set(1, thrust, 1);
				const work = i.working ? 1 : 0;
				beam.visible = !!work;
				// Down to the rock (about the drone's hover height), flickering.
				beam.scale.set(1, work ? 15 + Math.sin(i.time * 25) * 2 : 1, 1);
				for (const [jaw, z] of claws) jaw.rotation.y = z * (work ? 0.05 + Math.sin(i.time * 6) * 0.1 : 0.35);
				strobe.visible = (i.time * 1.4 + e.id * 0.31) % 1 < 0.12;
			},
		};
	}
	// The platform a building stands on in space (0.131): an eight-sided deck with a lit rim, a tapering
	// underside with a glowing core, struts and, for the bigger stations, docking arms with pods and
	// beacons. Added under the building's own model (models-3d.js); the renderer lifts the whole station.
	// Station thrusters (0.141.1): the flames of the station-keeping drives under a platform — a bright core
	// in a soft sheath, added light, cyan for the Colonies, orange for the Dominium.
	const PLUME = {
		cool: [new THREE.MeshBasicMaterial({ color: "#bff6ff", transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), new THREE.MeshBasicMaterial({ color: "#3fb8ff", transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })],
		warm: [new THREE.MeshBasicMaterial({ color: "#ffe2b0", transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), new THREE.MeshBasicMaterial({ color: "#ff7a2a", transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })],
	};
	const HALO = {
		cool: new THREE.MeshBasicMaterial({ color: "#3fb8ff", transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
		warm: new THREE.MeshBasicMaterial({ color: "#ff7a2a", transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
	};
	function platform(root, k, r, type) {
		const R = r * 1.18,
			deck = group(root, [0, 0, 0]),
			sides = 8,
			big = r >= 30 && !["turret", "flak"].includes(type);
		cyl(deck, k.steel, R, 3, [0, -1.5, 0], { segs: sides });
		cyl(deck, k.dark, R * 1.02, 1.2, [0, -3.4, 0], { segs: sides });
		// The underside: a stepped cone down to a glowing reactor core.
		cyl(deck, k.metal, R * 0.95, r * 0.28, [0, -4 - r * 0.14, 0], { segs: sides, top: R * 0.95 });
		cyl(deck, k.dark, R * 0.3, r * 0.42, [0, -4 - r * 0.28 - r * 0.21, 0], { segs: sides, top: R * 0.9 });
		cyl(deck, k.dominion ? k.fire : k.energy, R * 0.18, 2, [0, -4 - r * 0.7 - 1, 0], { segs: 10 });
		// Rim lights and deck struts.
		for (let i = 0; i < sides; i++) {
			const a = ((i + 0.5) / sides) * Math.PI * 2,
				x = Math.cos(a) * R * 0.98,
				z = Math.sin(a) * R * 0.98;
			box(deck, i % 2 ? k.lamp : k.glass, [1.6, 1, 1.6], [x, -0.6, z], null, 0.2);
			pipe(deck, k.steel, [x * 0.92, -3.2, z * 0.92], [x * 0.35, -4 - r * 0.5, z * 0.35], Math.max(0.4, r * 0.025), 5);
		}
		// Station-keeping thrusters under the deck: a nozzle and a flame pointing down, flickering.
		const [core, sheath] = k.dominion ? PLUME.warm : PLUME.cool,
			flames = [],
			nT = big ? 4 : 3;
		for (let i = 0; i < nT; i++) {
			const a = (i / nT) * Math.PI * 2 + Math.PI / nT,
				x = Math.cos(a) * R * 0.62,
				z = Math.sin(a) * R * 0.62,
				y = -4 - r * 0.22,
				w = Math.max(1.6, r * 0.09);
			cyl(deck, k.dark, w * 1.1, w * 1.4, [x, y, z], { segs: 8, top: w * 0.7 });
			cyl(deck, k.dominion ? k.fire : k.energy, w * 0.8, 0.4, [x, y - w * 0.75, z], { segs: 8 });
			const flame = group(deck, [x, y - w * 0.8, z]);
			cyl(flame, core, 0.05, 1, [0, -0.5, 0], { segs: 8, top: w * 0.55 });
			cyl(flame, sheath, 0.1, 1.15, [0, -0.55, 0], { segs: 8, top: w * 1.5 });
			flames.push([flame, r * 0.65 + 10, i]);
		}
		// The glow of the drives spilling out from under the deck (seen past its rim from above): a few thin
		// discs of added light, wider than the platform, one under another.
		for (let j = 0; j < 3; j++) cyl(deck, k.dominion ? HALO.warm : HALO.cool, R * (1.06 + j * 0.1), 0.3, [0, -6 - r * 0.25 - j * 3, 0], { segs: 24 });
		// The reactor core's own downward glow.
		const coreFlame = group(deck, [0, -4 - r * 0.7 - 2, 0]);
		cyl(coreFlame, sheath, 0.1, 1, [0, -0.5, 0], { segs: 10, top: R * 0.16 });
		flames.push([coreFlame, r * 0.3 + 4, 9]);
		const plumes = {
			update(t) {
				for (const [g, len, i] of flames) g.scale.set(1, len * (0.82 + 0.12 * Math.sin(t * 23 + i * 1.7) + 0.06 * Math.sin(t * 61 + i)), 1);
			},
		};
		if (!big) return plumes;
		// Docking arms with a pod and a blinking beacon at the end.
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2 + 0.5,
				x = Math.cos(a),
				z = Math.sin(a),
				L = R + r * 0.45;
			pipe(deck, k.steel, [x * R * 0.9, -2, z * R * 0.9], [x * L, -2, z * L], Math.max(0.7, r * 0.04), 6);
			pipe(deck, k.dark, [x * R * 0.9, -4.5, z * R * 0.9], [x * L, -2.6, z * L], Math.max(0.4, r * 0.025), 5);
			cyl(deck, k.metal, r * 0.12, r * 0.22, [x * L, -2, z * L], { segs: 8 });
			box(deck, k.team, [r * 0.18, 1, r * 0.18], [x * L, -2 + r * 0.12, z * L], null, 0.2);
			ball(deck, k.red, 0.9, [x * L, -2 + r * 0.12 + 1.2, z * L]);
			// A small thruster under the pod: nozzle, glowing mouth, a flame down and a little glow round it.
			const w = Math.max(1.2, r * 0.06),
				py = -2 - r * 0.11;
			cyl(deck, k.dark, w * 1.1, w * 1.2, [x * L, py - w * 0.5, z * L], { segs: 8, top: w * 0.7 });
			cyl(deck, k.dominion ? k.fire : k.energy, w * 0.8, 0.3, [x * L, py - w * 1.15, z * L], { segs: 8 });
			const flame = group(deck, [x * L, py - w * 1.2, z * L]);
			cyl(flame, core, 0.05, 1, [0, -0.5, 0], { segs: 8, top: w * 0.55 });
			cyl(flame, sheath, 0.1, 1.15, [0, -0.55, 0], { segs: 8, top: w * 1.4 });
			flames.push([flame, r * 0.4 + 6, 4 + i]);
			cyl(deck, k.dominion ? HALO.warm : HALO.cool, r * 0.24, 0.3, [x * L, py - w * 2.5, z * L], { segs: 16 });
		}
		return plumes;
	}
	return { corvette, frigate, lancer, cruiser, carrier, fighter, pirate, pirateBase, miner, platform };
}
