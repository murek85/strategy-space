/* Act I in 3D: the relay station (the communication stations and network nodes the act is fought over;
   used on every map) and the landmarks of the act's story, standing on the rock outcrops of its maps:
   Lira's training range (Eos), the Eos beacon and the ruins of the Silent Station (I), the gate of the
   archive under the ice (II), the obelisk of the Node Citadel (III). Built with the shape kit of
   models-detail-3d.js and the stones of nature-detail-3d.js; same contract as models-3d.js.
   Landmark state (from webgl3d/scene-life-3d.js): e.lit — the mission's goals are met (the beacon shines,
   the archive gate opens); e.progress — share of the network nodes held (the obelisk wakes up). */
export function createAct1(THREE, { tools, nature, group, std }) {
	const { mesh, box, cyl, ball, pipe, latheGeo, cylGeo, torusGeo, shellGeo, loftGeo, cached } = tools,
		{ stone, limb } = nature,
		n2 = (v) => Math.round(v * 100) / 100,
		m = (key, color, o = {}) => cached("a1" + key, () => std(color, o));
	const M = {
		concrete: m("concrete", "#8a8f8a", { roughness: 0.95, metalness: 0.05 }),
		concreteDark: m("concreteDark", "#5f6563", { roughness: 0.95, metalness: 0.05 }),
		metal: m("metal", "#a7b1ad", { roughness: 0.45, metalness: 0.65 }),
		steel: m("steel", "#3a4245", { roughness: 0.5, metalness: 0.7 }),
		cabinet: m("cabinet", "#d7d9cf", { roughness: 0.7, metalness: 0.2 }),
		rust: m("rust", "#7a4e32", { roughness: 0.85, metalness: 0.35 }),
		sand: m("sand", "#b49a6c", { roughness: 1, metalness: 0 }),
		rock: m("rock", "#7d6a57", { roughness: 1, metalness: 0 }),
		ice: m("ice", "#bcd8e4", { roughness: 0.25, metalness: 0.1 }),
		iceDark: m("iceDark", "#86a8b8", { roughness: 0.4, metalness: 0.1 }),
		obsidian: m("obsidian", "#2e3138", { roughness: 0.35, metalness: 0.2 }),
		glyph: m("glyph", "#9fe6ff", { emissive: "#5fd8ff", emissiveIntensity: 1.2 }),
		lamp: m("lamp", "#ffe2a8", { emissive: "#ffcf7a", emissiveIntensity: 1.6 }),
		lampOff: m("lampOff", "#4a4e52", { roughness: 0.3, metalness: 0.6 }),
		energy: m("energy", "#9ff7ff", { emissive: "#6fe8ff", emissiveIntensity: 1.3 }),
		wood: m("wood", "#8a6a44", { roughness: 0.9, metalness: 0 }),
		red: m("red", "#d8453c", { roughness: 0.6, metalness: 0 }),
		white: m("white", "#efece2", { roughness: 0.8, metalness: 0 }),
		hazard: m("hazard", "#e2b33c", { roughness: 0.6, metalness: 0.2 }),
		solar: m("solar", "#1f3550", { roughness: 0.2, metalness: 0.6 }),
	};

	// ---------- the relay station ----------
	// Adds the station to a relay's root (models-3d.js relay(): the capture rings stay there); `light` is
	// the owner's colour material. Returns the turning dish.
	function relayStation(root, light) {
		mesh(root, cylGeo(26, 28, 3, 6), M.concreteDark, [0, 1.5, 0]);
		mesh(root, cylGeo(19, 21, 3, 6), M.concrete, [0, 4.5, 0], [0, Math.PI / 6, 0]);
		// Equipment cabinets with a status light, cables to the mast.
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2 + Math.PI / 3,
				x = Math.cos(a) * 15,
				z = Math.sin(a) * 15;
			box(root, M.cabinet, [6, 8, 4], [x, 10, z], [0, -a, 0], 0.5);
			box(root, light, [1.4, 1.4, 1.4], [x * 1.18, 12, z * 1.18], null, 0.3);
			pipe(root, M.steel, [x * 0.8, 6.5, z * 0.8], [Math.cos(a) * 3, 6.5, Math.sin(a) * 3], 0.5);
		}
		// A three-legged lattice mast with braces at four levels.
		const legs = [0, 1, 2].map((i) => (i / 3) * Math.PI * 2);
		for (const a of legs) pipe(root, M.metal, [Math.cos(a) * 10, 6, Math.sin(a) * 10], [Math.cos(a) * 2.5, 50, Math.sin(a) * 2.5], 0.8);
		for (let k = 0; k < 4; k++) {
			const y = 14 + k * 10,
				r = 10 - ((y - 6) / 44) * 7.5;
			legs.forEach((a, i) => {
				const b = legs[(i + 1) % 3];
				pipe(root, M.metal, [Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(b) * r, y, Math.sin(b) * r], 0.35);
				if (k < 3) {
					const r2 = 10 - ((y + 10 - 6) / 44) * 7.5;
					pipe(root, M.metal, [Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(b) * r2, y + 10, Math.sin(b) * r2], 0.25);
				}
			});
		}
		cyl(root, M.steel, 1.2, 12, [0, 56, 0], { segs: 8 });
		box(root, light, [3, 4, 3], [0, 64, 0], null, 0.5); // owner's beacon
		for (const s of [-1, 1]) cyl(root, M.steel, 0.15, 16, [s * 2.5, 70, 0], { top: 0.08, segs: 4 }); // whips
		// The dish, turning: a shell bowl on a yoke, a feed horn, a counterweight.
		const dish = group(root, [0, 46, 0]);
		box(dish, M.steel, [3, 3, 6], [0, 0, 0], null, 0.4);
		const bowl = group(dish, [3, 1, 0]);
		bowl.rotation.z = -1.1;
		mesh(bowl, shellGeo([[0.6, 0], [5, 1.4], [9, 4], [11, 6.5]], 0.4, 18), M.cabinet, [0, 0, 0]);
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2;
			pipe(bowl, M.steel, [Math.cos(a) * 10, 6, Math.sin(a) * 10], [0, 12, 0], 0.25);
		}
		ball(bowl, M.steel, 1, [0, 12, 0]);
		box(dish, M.steel, [4, 3, 3], [-4, 0, 0], null, 0.4);
		return dish;
	}

	// ---------- landmarks of act I ----------
	// Stones round a landmark, on the raised ground of the outcrop.
	function outcrop(root, w, h, mat, n = 7, seed = 1) {
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2 + seed,
				d = 0.8 + ((i * 37) % 10) / 60,
				s = Math.min(w, h) * (0.06 + ((i * 13) % 5) / 100);
			stone(root, mat, [Math.cos(a) * w * 0.5 * d, -2, Math.sin(a) * h * 0.5 * d], [s, s * 0.7, s * 0.9], i + seed);
		}
	}
	// The Eos beacon (I): a lattice tower on the rock with solar panels; its lantern lights up when the
	// mission's goals are met.
	function eosBeacon(w, h) {
		const root = new THREE.Group(),
			H = 150;
		outcrop(root, w, h, M.rock, 8, 2);
		mesh(root, cylGeo(18, 22, 6, 8), M.concrete, [0, 3, 0]);
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
			pipe(root, M.metal, [Math.cos(a) * 14, 6, Math.sin(a) * 14], [Math.cos(a) * 4, H, Math.sin(a) * 4], 1);
		}
		for (let y = 20; y < H; y += 18) {
			const r = 14 - ((y - 6) / (H - 6)) * 10;
			mesh(root, torusGeo(n2(r * 1.41), 0.4, 4), M.metal, [0, y, 0], [0, Math.PI / 4, 0]);
		}
		mesh(root, cylGeo(7, 7, 2, 8), M.steel, [0, H + 1, 0]);
		const lantern = group(root, [0, H + 7, 0]);
		const lit = mesh(lantern, latheGeo([[0, -5], [4.5, -4], [5, 0], [4.5, 4], [0, 5]], 10), M.lamp, [0, 0, 0]),
			off = mesh(lantern, latheGeo([[0, -5], [4.5, -4], [5, 0], [4.5, 4], [0, 5]], 10), M.lampOff, [0, 0, 0]);
		mesh(root, latheGeo([[7, 0], [3, 5], [0, 8]], 10), M.red, [0, H + 12, 0]);
		for (const s of [-1, 1]) {
			const panel = group(root, [s * 26, 4, 18]);
			box(panel, M.steel, [1, 8, 1], [0, 4, 0], null, 0.2);
			box(panel, M.solar, [14, 0.6, 9], [0, 8.5, 0], [0.5, 0, 0], 0.15);
		}
		return {
			root,
			update(e, i) {
				lit.visible = !!e.lit || Math.sin(i.time * 1.2) > 0.97; // a faint flicker before it wakes
				off.visible = !lit.visible;
				lantern.rotation.y = i.time * 0.8;
			},
		};
	}
	// The Silent Station (I): an abandoned colony post — a broken dome, half-buried modules, a bent mast.
	function silentStation(w, h) {
		const root = new THREE.Group();
		outcrop(root, w, h, M.sand, 6, 4);
		mesh(root, cylGeo(n2(w * 0.3), n2(w * 0.32), 3, 10), M.concreteDark, [0, 1.5, 0]);
		// The dome, a third of it caved in.
		const R = Math.min(w, h) * 0.24,
			dome = new THREE.Mesh(cached("a1dome" + n2(R), () => new THREE.LatheGeometry([[R, 0], [R * 0.95, R * 0.35], [R * 0.7, R * 0.72], [0.1, R * 0.9]].map(([a, b]) => new THREE.Vector2(a, b)), 14, 0, Math.PI * 1.35)), M.white);
		dome.position.set(-R * 0.3, 3, 0);
		dome.material = M.white;
		dome.castShadow = dome.receiveShadow = true;
		root.add(dome);
		for (let i = 0; i < 4; i++) box(root, M.white, [R * 0.4, 1.2, R * 0.25], [R * 0.4 + i * 4, 4 + i, -R * 0.5 + i * 3], [0.4, i, 0.7], 0.3); // fallen panels
		// Modules half buried in sand, crates, a bent antenna mast.
		box(root, M.cabinet, [R * 0.9, R * 0.45, R * 0.5], [R * 1.1, R * 0.12, R * 0.6], [0.12, 0.3, 0.08], 1);
		box(root, M.cabinet, [R * 0.7, R * 0.4, R * 0.45], [-R * 1.2, R * 0.08, R * 0.9], [-0.1, 1.2, 0.15], 1);
		for (const [x, z, s] of [[R * 0.2, R * 1.2, 5], [R * 0.6, R * 1.4, 4], [-R * 0.6, -R * 1.1, 6]]) box(root, M.rust, [s, s * 0.7, s], [x, s * 0.3, z], [0, x * 0.1, 0.2], 0.4);
		limb(root, M.metal, [R * 0.9, 3, -R * 0.9], [R * 1, 30, -R * 1], 1, 0.8, 6);
		limb(root, M.metal, [R * 1, 30, -R * 1], [R * 1.6, 38, -R * 0.6], 0.8, 0.4, 6);
		for (let i = 0; i < 5; i++) {
			const a = i * 1.3;
			stone(root, M.sand, [Math.cos(a) * R * 1.3, -1, Math.sin(a) * R * 1.3], [R * 0.5, R * 0.18, R * 0.3], i + 9); // drifts
		}
		return { root, update() {} };
	}
	// The gate of the archive under the ice (II): an ice cliff with a vault door and glowing glyphs; the
	// door rises when the goals are met.
	function iceArchive(w, h) {
		const root = new THREE.Group(),
			S = Math.min(w, h);
		// The ice cliff behind (west of) the gate: a crescent of tall ice blocks.
		for (let i = 0; i < 9; i++) {
			const a = Math.PI * (0.55 + (i / 8) * 0.9),
				d = S * (0.22 + (i % 2) * 0.08);
			stone(root, i % 3 ? M.ice : M.iceDark, [Math.cos(a) * d, -4, Math.sin(a) * d * (h / w + 0.4)], [S * (0.1 + (i % 3) * 0.025), S * (0.22 + (i % 4) * 0.06), S * 0.1], i + 20);
		}
		// The gate on the east face of the cliff: frame, glyph strips, the door panel, steps.
		const gate = group(root, [S * 0.02, 0, 0]);
		box(gate, M.steel, [6, 44, 4], [0, 22, -15], null, 0.6);
		box(gate, M.steel, [6, 44, 4], [0, 22, 15], null, 0.6);
		box(gate, M.steel, [8, 6, 36], [0, 46, 0], null, 0.8);
		for (const z of [-15, 15]) for (let k = 0; k < 4; k++) box(gate, M.glyph, [0.6, 3, 1.4], [3.2, 10 + k * 9, z], null, 0.1);
		box(gate, M.glyph, [0.6, 1.4, 20], [4.2, 46, 0], null, 0.1);
		const door = group(gate, [0, 21, 0]);
		box(door, M.metal, [3, 40, 26], [0, 0, 0], null, 0.5);
		for (let k = 0; k < 4; k++) box(door, M.steel, [3.4, 1, 26], [0, -15 + k * 10, 0], null, 0.1);
		box(door, M.glyph, [3.6, 6, 6], [0, 4, 0], [Math.PI / 4, 0, 0], 0.3);
		for (let k = 0; k < 3; k++) box(gate, M.concreteDark, [8 + k * 4, 2, 34], [6 + k * 4, 1 - k * 2, 0], null, 0.3);
		return { root, update: (e, i) => (door.position.y += ((e.lit ? 58 : 21) - door.position.y) * 0.05) };
	}
	// The obelisk of the Node Citadel (III): a stepped dark platform, an obelisk, cables, energy rings
	// waking up with every network node held.
	function nadirCitadel(w, h) {
		const root = new THREE.Group(),
			S = Math.min(w, h),
			H = 160;
		outcrop(root, w, h, M.obsidian, 7, 6);
		mesh(root, cylGeo(n2(S * 0.36), n2(S * 0.4), 6, 8), M.concreteDark, [0, 3, 0], [0, Math.PI / 8, 0]);
		mesh(root, cylGeo(n2(S * 0.26), n2(S * 0.3), 6, 8), M.concrete, [0, 9, 0], [0, Math.PI / 8, 0]);
		mesh(root, loftGeo("obelisk", [0, 0.8, 0.93, 1].map((y, k) => [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([x, z]) => {
			const r = [12, 7, 5, 0.3][k];
			return [x * r, y * H, z * r];
		}))), M.obsidian, [0, 12, 0]);
		for (let k = 0; k < 6; k++) box(root, M.glyph, [0.6, 10, 4], [9.5 - k * 0.6, 30 + k * 18, 0], null, 0.1); // glyph seams
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
			pipe(root, M.steel, [Math.cos(a) * 9, 14, Math.sin(a) * 9], [Math.cos(a) * S * 0.38, 2, Math.sin(a) * S * 0.38], 1.4); // cables
		}
		const rings = [0, 1, 2].map((k) => {
			const g = group(root, [0, 50 + k * 34, 0]);
			mesh(g, torusGeo(18 - k * 3, 1, 28), M.energy, [0, 0, 0]);
			g.rotation.x = 0.2 + k * 0.15;
			return g;
		});
		const crown = ball(root, M.energy, 3, [0, H + 14, 0]);
		return {
			root,
			update(e, i) {
				const p = e.progress ?? 0;
				rings.forEach((g, k) => {
					g.visible = p > k / 3;
					g.rotation.y = i.time * (0.4 + k * 0.25);
				});
				crown.visible = p >= 1;
			},
		};
	}
	// Lira's training range (training): target boards, barrels, sandbags, a watchtower, cones.
	function trainingRange(w, h) {
		const root = new THREE.Group(),
			S = Math.min(w, h);
		outcrop(root, w, h, M.sand, 5, 7);
		for (let i = 0; i < 4; i++) {
			const t = group(root, [-S * 0.25 + i * S * 0.17, 0, -S * 0.2]);
			for (const z of [-4, 4]) box(t, M.wood, [1.2, 14, 1.2], [0, 7, z], null, 0.2);
			box(t, M.white, [1, 11, 11], [0, 14, 0], null, 0.3);
			for (const [r, mat] of [[4.4, M.red], [2.8, M.white], [1.2, M.red]]) mesh(t, cylGeo(r, r, 1.2, 16, "x"), mat, [0.3, 14, 0]);
		}
		for (let i = 0; i < 6; i++) cyl(root, i % 2 ? M.rust : M.hazard, 2.4, 6, [S * 0.2 + (i % 3) * 5.5, 3, S * 0.15 + Math.floor(i / 3) * 5.5], { segs: 10 });
		for (let i = 0; i < 7; i++) box(root, M.sand, [6, 3, 3.4], [-S * 0.3 + i * 5.6, 1.5 + (i % 2) * 2.8, S * 0.25], [0, 0, 0], 1.2);
		// Watchtower.
		const T = group(root, [S * 0.28, 0, -S * 0.25]);
		for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pipe(T, M.wood, [x * 6, 0, z * 6], [x * 4, 26, z * 4], 0.7);
		box(T, M.wood, [11, 1.2, 11], [0, 26, 0], null, 0.3);
		for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(T, M.wood, [0.8, 6, 0.8], [x * 5, 29, z * 5], null, 0.1);
		mesh(T, latheGeo([[8, 0], [0, 5]], 4), M.rust, [0, 32, 0], [0, Math.PI / 4, 0]);
		for (let i = 0; i < 5; i++) mesh(root, cylGeo(0.2, 1.6, 4, 8), M.hazard, [-S * 0.1 + i * 8, 2, 0]); // cones
		return { root, update() {} };
	}
	const LANDMARKS = { eosBeacon, silentStation, iceArchive, nadirCitadel, trainingRange };
	return { relayStation, landmark: (piece, w, h) => LANDMARKS[piece](w, h) };
}
