/* Objective sites of act II in 3D (on the 2D board they are only beacons and captions): the evacuation
   pad, the researchers' camp and the probe archive (IV), the data core in its wreck, the convoy's stops
   and the Kestrel lighthouse (V), and the Hefajstos complex (VI): machines on its three control nodes
   (VALVE, TURBINE, LINK) and conduits from the Heart of Ash to them. Built with the shape kit of
   models-detail-3d.js; same contract as models-3d.js ({ root, update(e, info) }). Placed and shown by
   webgl3d/scene-life-3d.js from game.act2. */
export function createAct2(THREE, { tools, group, std }) {
	const { mesh, box, cyl, ball, pipe, loftGeo, latheGeo, cylGeo, torusGeo, profileGeo, cached } = tools,
		n2 = (v) => Math.round(v * 100) / 100,
		m = (key, color, o = {}) => cached("a2" + key, () => std(color, o));
	const M = {
		concrete: m("concrete", "#7d8582", { roughness: 0.95, metalness: 0.05 }),
		dark: m("dark", "#2e3437", { roughness: 0.7, metalness: 0.4 }),
		metal: m("metal", "#9aa6a2", { roughness: 0.5, metalness: 0.6 }),
		rust: m("rust", "#7a4e32", { roughness: 0.85, metalness: 0.35 }),
		paint: m("paint", "#e8e2cf", { roughness: 0.8, metalness: 0 }),
		hazard: m("hazard", "#e2b33c", { roughness: 0.6, metalness: 0.2 }),
		canvas: m("canvas", "#b9ab86", { roughness: 1, metalness: 0 }),
		canvasDark: m("canvasDark", "#7f7558", { roughness: 1, metalness: 0 }),
		crate: m("crate", "#6e6248", { roughness: 0.9, metalness: 0.1 }),
		team: m("team", "#3fd39a", { roughness: 0.5, emissive: "#1f8f64", emissiveIntensity: 0.25 }),
		lamp: m("lamp", "#ffe2a8", { emissive: "#ffcf7a", emissiveIntensity: 1.3 }),
		red: m("red", "#ff5a4a", { emissive: "#ff3020", emissiveIntensity: 1.2 }),
		green: m("green", "#8fe3c4", { emissive: "#4fd8a0", emissiveIntensity: 1.1 }),
		data: m("data", "#9fe6ff", { emissive: "#5fd8ff", emissiveIntensity: 1.3 }),
		probe: m("probe", "#4a4f5a", { roughness: 0.35, metalness: 0.7 }),
		glass: m("glass", "#22323b", { roughness: 0.15, metalness: 0.6, emissive: "#ffd89a", emissiveIntensity: 0.6 }),
		energy: m("energy", "#ffb04a", { emissive: "#ff8a2a", emissiveIntensity: 1.4 }),
	};
	const blink = (i, rate, phase = 0) => Math.sin(i.time * rate + phase) > 0;
	// The lighthouse beam: faint by day, bright at night (setNight).
	const beamMaterial = new THREE.MeshBasicMaterial({ color: "#fff1c4", transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

	// ---------- the evacuation pad ----------
	function pad() {
		const root = new THREE.Group(),
			lights = [];
		mesh(root, cylGeo(70, 74, 3, 24), M.concrete, [0, 1.5, 0]);
		mesh(root, torusGeo(64, 1.6, 40), M.hazard, [0, 3.2, 0]);
		mesh(root, torusGeo(40, 1, 32), M.paint, [0, 3.1, 0]);
		// The letter H.
		for (const x of [-12, 12]) box(root, M.paint, [5, 0.4, 30], [x, 3.2, 0], null, 0.1);
		box(root, M.paint, [24, 0.4, 5], [0, 3.2, 0], null, 0.1);
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI * 2;
			lights.push(box(root, M.green, [2.4, 1.4, 2.4], [Math.cos(a) * 68, 3.8, Math.sin(a) * 68], null, 0.4));
		}
		// A control hut with a window, a lamp post, a windsock.
		box(root, M.paint, [16, 11, 12], [86, 5.5, -40], null, 1);
		box(root, M.team, [16.4, 1.4, 12.4], [86, 10, -40], null, 0.2);
		box(root, M.glass, [0.5, 3, 7], [94.2, 6.5, -40], null, 0.1);
		cyl(root, M.metal, 0.6, 22, [80, 11, 40], { segs: 6 });
		box(root, M.lamp, [3, 1.4, 3], [80, 22.5, 40], null, 0.3);
		cyl(root, M.metal, 0.4, 26, [-82, 13, -50], { segs: 5 });
		const sock = group(root, [-82, 25, -50]);
		mesh(sock, cylGeo(0.6, 2.2, 10, 8, "x"), M.hazard, [5, 0, 0]);
		return {
			root,
			update(e, i) {
				const step = Math.floor(i.time * 6) % 12;
				lights.forEach((l, n) => (l.visible = n === step || n === (step + 6) % 12 || blink(i, 1.5)));
				sock.rotation.y = 0.8 + Math.sin(i.time * 0.7) * 0.4;
				sock.rotation.z = Math.sin(i.time * 3.1) * 0.08;
			},
		};
	}

	// ---------- the researchers' camp ----------
	function tent(parent, [x, z], w, d, h, turn, mat) {
		const t = group(parent, [x, 0, z]);
		t.rotation.y = turn;
		mesh(t, profileGeo([[-w / 2, 0], [w / 2, 0], [w * 0.12, h], [-w * 0.12, h]].map(([a, b]) => [n2(a), n2(b)]), d, 0.3), mat, [0, 0, 0]);
		box(t, M.dark, [0.5, h * 0.6, w * 0.25], [w * 0.0 + d * 0, h * 0.3, d / 2 + 0.1], [0, Math.PI / 2, 0], 0.1); // door
		pipe(t, M.metal, [-w * 0.12, h, -d / 2 - 1], [-w * 0.12, h, d / 2 + 1], 0.25);
		pipe(t, M.metal, [w * 0.12, h, -d / 2 - 1], [w * 0.12, h, d / 2 + 1], 0.25);
		return t;
	}
	function camp() {
		const root = new THREE.Group();
		tent(root, [-24, -10], 22, 30, 14, 0.3, M.canvas);
		tent(root, [20, -22], 18, 24, 11, -0.4, M.canvasDark);
		tent(root, [8, 24], 26, 34, 16, 1.4, M.canvas);
		for (const [x, z, s] of [[-6, -38, 7], [0, -40, 6], [-3, -34, 5], [34, 6, 8], [40, 12, 6]]) box(root, M.crate, [s, s * 0.7, s * 0.8], [x, s * 0.35, z], [0, x * 0.1, 0], 0.4);
		// Generator with a stack, a mast with a dish and a blinking light, lamps, a table with screens.
		box(root, M.hazard, [12, 8, 8], [-34, 4, 22], null, 0.8);
		cyl(root, M.dark, 1, 8, [-30, 12, 22], { segs: 8 });
		cyl(root, M.metal, 0.8, 36, [36, 18, -30], { top: 0.5, segs: 6 });
		const dish = group(root, [36, 34, -30]);
		dish.rotation.z = 0.6;
		mesh(dish, tools.shellGeo([[0.5, 0], [4, 1.5], [6, 4]], 0.3, 12), M.paint, [0, 0, 0]);
		const beacon = ball(root, M.red, 1.2, [36, 37, -30]);
		for (const [x, z] of [[-10, 2], [26, 30]]) {
			cyl(root, M.metal, 0.4, 14, [x, 7, z], { segs: 5 });
			box(root, M.lamp, [2, 1.2, 2], [x, 14.5, z], null, 0.3);
		}
		box(root, M.dark, [10, 1, 5], [4, 6, 0], null, 0.2);
		for (const x of [1, 7]) box(root, M.data, [3, 2.4, 0.4], [x, 8, -1.5], [0.2, 0, 0], 0.1);
		return { root, update: (e, i) => ((beacon.visible = blink(i, 3)), (dish.rotation.y = Math.sin(i.time * 0.3) * 0.8)) };
	}

	// ---------- the probe archive ----------
	function archive() {
		const root = new THREE.Group(),
			probe = group(root, [0, 8, 0]);
		probe.rotation.set(0.35, 0.4, 0.2);
		// A half-buried alien probe: a long lofted body, fins, a cracked dome; data rings around it.
		mesh(probe, loftGeo("probe", [[-22, 2, 2], [-14, 9, 9], [6, 11, 11], [18, 7, 7], [26, 1, 1]].map(([x, r, h]) => Array.from({ length: 10 }, (_, i) => [x, n2(Math.sin((i / 10) * Math.PI * 2) * h), n2(Math.cos((i / 10) * Math.PI * 2) * r)]))), M.probe);
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2;
			mesh(probe, profileGeo([[0, 0], [10, 0], [2, 9], [-4, 9]], 1, 0.2), M.probe, [-16, Math.sin(a) * 8, Math.cos(a) * 8], [a, 0, 0]);
		}
		ball(probe, M.data, 4, [10, 8, 0], [1.6, 0.7, 1]);
		for (let i = 0; i < 5; i++) box(probe, M.data, [8, 0.5, 0.5], [-10 + i * 6, 0, 11.2], null, 0.1); // light seams
		// Sand piled round it.
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2;
			mesh(root, latheGeo([[0, 0], [10, 1.5], [12, 0]], 10), M.canvasDark, [Math.cos(a) * 18, -0.5, Math.sin(a) * 14]);
		}
		const rings = [0, 1, 2].map((k) => {
			const g = group(root, [0, 26 + k * 7, 0]);
			mesh(g, torusGeo(16 + k * 5, 0.5, 32), M.data, [0, 0, 0]);
			g.rotation.x = 0.3 + k * 0.4;
			return g;
		});
		return {
			root,
			// e.progress: the reading, 0…1 (rings appear and spin faster as the reading goes on).
			update(e, i) {
				const p = e.progress ?? 0;
				rings.forEach((g, k) => {
					g.visible = p > 0 && p >= k / 3;
					g.rotation.y = i.time * (0.5 + p * 2 + k * 0.3);
				});
			},
		};
	}
	// ---------- the data core in a wreck (where it lies to be picked up) ----------
	function coreSite() {
		const root = new THREE.Group(),
			core = group(root, [0, 10, 0]);
		for (const [x, z, a] of [[-14, -8, 0.4], [12, 10, 1.7], [4, -16, 2.6]]) box(root, M.rust, [16, 3, 9], [x, 1.5, z], [0.15, a, 0.2], 0.6);
		pipe(root, M.dark, [-18, 1, 10], [6, 6, 4], 1.2);
		cyl(core, M.dark, 4, 3, [0, -5, 0], { segs: 8 });
		cyl(core, M.data, 2.6, 10, [0, 1.5, 0], { segs: 8 });
		for (const y of [-2, 2, 6]) mesh(core, torusGeo(3, 0.5, 12), M.metal, [0, y, 0]);
		return { root, update: (e, i) => ((core.rotation.y = i.time * 0.8), (core.position.y = 10 + Math.sin(i.time * 2) * 1.2)) };
	}

	// ---------- the convoy's stops and the lighthouse ----------
	function stop() {
		const root = new THREE.Group(),
			lamps = [];
		mesh(root, cylGeo(40, 42, 1.2, 20), M.concrete, [0, 0.6, 0]);
		// Barriers at both ends, floodlight masts, a sign.
		for (const x of [-34, 34]) {
			box(root, M.dark, [2, 8, 2], [x, 4, -18], null, 0.3);
			const bar = group(root, [x, 7, -18]);
			for (let s = 0; s < 6; s++) box(bar, s % 2 ? M.red : M.paint, [1, 1, 6], [0, 0, 3 + s * 6], null, 0.1);
		}
		for (const [x, z] of [[-30, 26], [30, 26]]) {
			cyl(root, M.metal, 0.7, 30, [x, 15, z], { segs: 6 });
			box(root, M.dark, [6, 2, 3], [x, 30, z], null, 0.3);
			lamps.push(box(root, M.lamp, [5, 0.6, 2.4], [x, 28.8, z], null, 0.1));
		}
		box(root, M.dark, [1, 8, 1], [0, 4, 30], null, 0.2);
		box(root, M.hazard, [14, 6, 0.6], [0, 10, 30], null, 0.2);
		box(root, M.dark, [10, 1.4, 0.7], [0, 10, 30.1], null, 0.1);
		return { root, update: (e, i) => lamps.forEach((l) => (l.visible = true)) };
	}
	function lighthouse() {
		const root = new THREE.Group(),
			H = 120;
		mesh(root, cylGeo(26, 30, 6, 12), M.concrete, [0, 3, 0]);
		box(root, M.paint, [22, 12, 18], [26, 6, 0], null, 1); // keeper's house
		box(root, M.glass, [0.5, 4, 8], [37.2, 7, 0], null, 0.1);
		mesh(root, latheGeo([[12, 0], [10, H * 0.5], [8, H]], 14), M.paint, [0, 6, 0]);
		for (let k = 0; k < 4; k++) mesh(root, cylGeo(n2(11.6 - k * 1.1), n2(11.8 - k * 1.1), 6, 14), M.red, [0, 18 + k * 26, 0]); // stripes
		mesh(root, cylGeo(11, 11, 2, 14), M.dark, [0, H + 7, 0]); // gallery
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI * 2;
			cyl(root, M.metal, 0.3, 5, [Math.cos(a) * 11, H + 10, Math.sin(a) * 11], { segs: 4 });
		}
		mesh(root, cylGeo(7, 7, 10, 10), M.glass, [0, H + 13, 0]); // lantern room
		mesh(root, latheGeo([[8, 0], [5, 4], [0, 7]], 12), M.red, [0, H + 18, 0]);
		const head = group(root, [0, H + 13, 0]);
		ball(head, M.lamp, 3.5, [0, 0, 0]);
		// The turning beam: two long cones of light.
		const beam = beamMaterial;
		mesh(head, cylGeo(18, 0.5, 160, 12, "x", true), beam, [82, 0, 0]);
		mesh(head, cylGeo(0.5, 18, 160, 12, "x", true), beam, [-82, 0, 0]);
		return { root, update: (e, i) => (head.rotation.y = i.time * 0.9) };
	}

	// ---------- the Hefajstos complex: machines on the control nodes, conduits ----------
	// VALVE: a great pipe with a hand wheel; TURBINE: a housing with a spinning rotor; LINK: pylons with
	// arcs. Added to the relay of the node (models-3d.js relay()).
	function machine(root, name) {
		const g = group(root, [0, 6, 0]);
		if (name === "ZAWÓR") {
			pipe(g, M.rust, [-40, 8, 0], [40, 8, 0], 6);
			for (const x of [-30, 30]) mesh(g, torusGeo(7, 1.4, 16, "x"), M.dark, [x, 8, 0]);
			box(g, M.dark, [14, 16, 16], [0, 8, 0], null, 1.2);
			const wheel = group(g, [0, 26, 0]);
			mesh(wheel, torusGeo(8, 1, 20), M.hazard, [0, 0, 0]);
			for (let i = 0; i < 3; i++) box(wheel, M.hazard, [16, 0.8, 0.8], [0, 0, 0], [0, (i * Math.PI) / 3, 0], 0.1);
			cyl(g, M.dark, 1.2, 10, [0, 20, 0], { segs: 8 });
			return (e, i) => (wheel.rotation.y = (e.progress || 0) * Math.PI * 4 + (e.owner === 0 ? i.time * 0.3 : 0));
		}
		if (name === "TURBINA") {
			mesh(g, latheGeo([[16, 0], [18, 6], [18, 22], [14, 28], [6, 30]], 16), M.rust, [0, 0, 0]);
			for (let k = 0; k < 3; k++) mesh(g, torusGeo(18.2, 0.8, 18), M.dark, [0, 6 + k * 8, 0]);
			const rotor = group(g, [0, 31, 0]);
			cyl(rotor, M.dark, 3, 3, [0, 0, 0], { segs: 8 });
			for (let i = 0; i < 5; i++) box(rotor, M.metal, [14, 0.6, 3], [7, 0.5, 0], [0, (i / 5) * Math.PI * 2, 0.25], 0.1);
			return (e, i) => (rotor.rotation.y = i.time * (e.owner === 1 ? 6 : 1.5));
		}
		if (name === "ŁĄCZNIK") {
			const arcs = [];
			for (let i = 0; i < 3; i++) {
				const a = (i / 3) * Math.PI * 2;
				pipe(g, M.dark, [Math.cos(a) * 24, 0, Math.sin(a) * 24], [Math.cos(a) * 18, 40, Math.sin(a) * 18], 1.6);
				ball(g, M.metal, 3, [Math.cos(a) * 18, 42, Math.sin(a) * 18]);
				const b = (((i + 1) % 3) / 3) * Math.PI * 2;
				arcs.push(pipe(g, M.energy, [Math.cos(a) * 18, 42, Math.sin(a) * 18], [Math.cos(b) * 18, 42, Math.sin(b) * 18], 0.5));
			}
			return (e, i) => arcs.forEach((arc, n) => (arc.visible = e.owner === 1 ? Math.sin(i.time * 17 + n * 2.1) > -0.2 : Math.sin(i.time * 3 + n) > 0.7));
		}
		return null;
	}
	// A conduit along points [x, y, z] (heights of the ground under them): pipe segments on supports.
	function conduit(points) {
		const root = new THREE.Group();
		for (let k = 1; k < points.length; k++) {
			const [x0, y0, z0] = points[k - 1],
				[x1, y1, z1] = points[k];
			pipe(root, M.rust, [x0, y0 + 9, z0], [x1, y1 + 9, z1], 3.2);
			box(root, M.dark, [4, 9, 8], [x1, y1 + 4.5, z1], [0, -Math.atan2(z1 - z0, x1 - x0), 0], 0.4);
			if (k % 3 === 0) mesh(root, torusGeo(3.8, 0.7, 10, "x"), M.dark, [(x0 + x1) / 2, (y0 + y1) / 2 + 9, (z0 + z1) / 2], [0, -Math.atan2(z1 - z0, x1 - x0), 0]);
		}
		return { root, update() {} };
	}

	return { pad, camp, archive, coreSite, stop, lighthouse, machine, conduit, setNight: (n) => (beamMaterial.opacity = 0.03 + 0.22 * n) };
}
