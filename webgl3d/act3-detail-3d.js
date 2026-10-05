/* Special buildings of act III in 3D (and the orbital uplink everywhere): the Heart of the Swarm (the Swarm's
   gate in chapter IX), the Swarm's nests (its gates in chapter VIII), the Dominium's orbital station, and
   the resonance jammer on the Peak (the relay of the king-of-the-hill mode). Built with the shape kit of
   models-detail-3d.js and the shards of swarm-detail-3d.js; same contract as models-3d.js.
   - Heart: a faceted crystal core beating (a double thump) inside a cage of great obsidian shards meeting
     over it, glowing seams in the cracked plinth, veins running from the core into the ground, shards
     circling. The one Swarm building that glows — in the team colour.
   - Nest: a mound of obsidian lumps with dark openings, a ring of spikes, pods and antenna shards.
   - Orbital station: a stepped platform, a control block with windows, a lattice mast with targeting rings,
     a dish on a turning mount, capacitor banks charging (info.charge, 0…1, set by the renderer from
     e.strikeReady) and an emitter that flares when the strike is ready.
   - Peak: a jammer tower over a relay — a mast with stacked discs and a resonator crystal turning. */
export function createAct3(THREE, { tools, swarm, group, std }) {
	const { mesh, box, cyl, ball, pipe, loftGeo, latheGeo, cylGeo, torusGeo, cached } = tools,
		{ shard, limb } = swarm,
		n2 = (v) => Math.round(v * 100) / 100;
	// A glowing material in a team colour (the Heart's seams and core).
	const glowOf = (color, k = 1.2) => cached("glowmat" + color + k, () => std(color, { emissive: color, emissiveIntensity: k, roughness: 0.3 }));
	// A faceted crystal (unit radius): an icosphere with its corners pushed in and out.
	const crystalGeo = () =>
		cached("heartcrystal", () => {
			let s = 4242;
			const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
			const g = new THREE.IcosahedronGeometry(1, 1),
				p = g.attributes.position,
				moved = new Map();
			for (let i = 0; i < p.count; i++) {
				const key = [p.getX(i), p.getY(i), p.getZ(i)].map((v) => Math.round(v * 1000)).join(",");
				if (!moved.has(key)) moved.set(key, 0.8 + rnd() * 0.4);
				const k = moved.get(key);
				p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 1.25, p.getZ(i) * k);
			}
			g.computeVertexNormals();
			return g;
		});

	// ---------- the Heart of the Swarm ----------
	function heart(k, r, color) {
		const root = new THREE.Group(),
			glow = glowOf(color),
			H = r * 1.9;
		// Cracked plinth: two tiers, glowing seams radiating out.
		mesh(root, cylGeo(n2(r * 0.95), n2(r * 1.05), 4, 7), k.warn, [0, 2, 0]);
		mesh(root, cylGeo(n2(r * 0.7), n2(r * 0.8), 3, 7), k.dark, [0, 5.5, 0], [0, 0.45, 0]);
		for (let i = 0; i < 7; i++) {
			const a = (i / 7) * Math.PI * 2 + 0.2;
			box(root, glow, [r * 0.42, 0.7, 1.4], [Math.cos(a) * r * 0.62, 4.2, Math.sin(a) * r * 0.62], [0, -a, 0], 0.2);
		}
		// The cage: great shards leaning in, their tips meeting over the core.
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2,
				d = r * 0.72;
			shard(root, i % 2 ? k.plate : k.metal, [Math.cos(a) * d, 6, Math.sin(a) * d], r * 0.16, H * (0.85 + (i % 3) * 0.08), i, [Math.sin(a) * 0.32, a, -Math.cos(a) * 0.32]);
			box(root, k.team, [r * 0.18, 2, r * 0.2], [Math.cos(a) * d * 0.95, 6 + H * 0.2, Math.sin(a) * d * 0.95], [0, -a, 0], 0.4);
		}
		// Veins from the core down to the ground.
		const core = group(root, [0, H * 0.48, 0]);
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2 + 0.5,
				mid = [Math.cos(a) * r * 0.3, H * 0.25, Math.sin(a) * r * 0.3],
				end = [Math.cos(a) * r * 0.6, 6, Math.sin(a) * r * 0.6];
			limb(root, k.dark, [0, H * 0.42, 0], mid, 3.4, 2.4, 6);
			limb(root, k.dark, mid, end, 2.4, 1.4, 6);
			limb(root, glow, [mid[0] * 1.02, mid[1] + 1, mid[2] * 1.02], [end[0] * 0.98, end[1] + 3, end[2] * 0.98], 0.7, 0.4, 4); // the glowing thread in the vein
		}
		// The core: an inner glowing crystal in a shell of obsidian plates.
		mesh(core, crystalGeo(), glow, [0, 0, 0]).scale.setScalar(r * 0.22);
		for (let i = 0; i < 5; i++) {
			const a = (i / 5) * Math.PI * 2;
			shard(core, k.plate, [Math.cos(a) * r * 0.2, -r * 0.12, Math.sin(a) * r * 0.2], r * 0.06, r * 0.38, i, [Math.sin(a) * 0.5, a, -Math.cos(a) * 0.5]);
		}
		// Shards circling the cage.
		const orbit = group(root, [0, H * 0.6, 0]);
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2;
			shard(orbit, k.metal, [Math.cos(a) * r * 1.05, (i % 2) * 10, Math.sin(a) * r * 1.05], 3, 14, i, [0.5, a, 0.3]);
		}
		return {
			root,
			update(e, i) {
				// A heartbeat: two quick thumps, then rest.
				const t = (i.time * 0.85) % 1,
					beat = Math.exp(-((t - 0.05) ** 2) / 0.002) + 0.6 * Math.exp(-((t - 0.25) ** 2) / 0.002);
				core.scale.setScalar(1 + beat * 0.14);
				core.rotation.y = i.time * 0.2;
				orbit.rotation.y = -i.time * 0.18;
			},
		};
	}

	// ---------- a nest of the Swarm ----------
	function nest(k, r) {
		const root = new THREE.Group(),
			lumps = [
				[0, 0, 1.0, 0.75],
				[0.42, 0.1, 0.55, 0.5],
				[-0.38, 0.2, 0.6, 0.55],
				[0.1, -0.45, 0.5, 0.45],
				[-0.15, 0.45, 0.5, 0.42],
			];
		mesh(root, cylGeo(n2(r * 0.9), n2(r), 3, 7), k.warn, [0, 1.5, 0]);
		// The mound: lumps of obsidian (shards on their sides, flattened), openings between them.
		lumps.forEach(([x, z, s, h], i) => {
			const o = mesh(root, loftGeo("nestlump", [0, 0.5, 0.9, 1].map((y, j) => Array.from({ length: 7 }, (_, a) => {
				const an = (a / 7) * Math.PI * 2,
					rr = [1, 0.85, 0.45, 0.05][j] * (0.85 + ((a * 37 + j * 11) % 7) / 23);
				return [n2(Math.cos(an) * rr), y, n2(Math.sin(an) * rr)];
			}))), i % 2 ? k.metal : k.plate, [x * r, 3, z * r], [0, i * 1.3, 0]);
			o.scale.set(r * 0.5 * s, r * h, r * 0.5 * s);
		});
		// Openings: dark mouths with a raised rim, facing out from the foot of the mound.
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2 + 0.4,
				x = Math.cos(a) * r * 0.5,
				z = Math.sin(a) * r * 0.5,
				tilt = [Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25];
			mesh(root, torusGeo(n2(r * 0.14), n2(r * 0.04), 10, "y"), k.metal, [x, r * 0.2, z], tilt);
			mesh(root, cylGeo(n2(r * 0.13), n2(r * 0.13), 1.5, 10), k.black, [x * 0.98, r * 0.2, z * 0.98], tilt);
		}
		mesh(root, torusGeo(n2(r * 0.72), 2.2, 28), k.team, [0, 4.5, 0]); // the team ring at the foot of the mound
		// A ring of spikes leaning out, pods, antenna shards on top.
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI * 2;
			shard(root, k.plate, [Math.cos(a) * r * 0.85, 2, Math.sin(a) * r * 0.85], r * 0.06, r * (0.3 + (i % 3) * 0.12), i, [Math.sin(a) * 0.5, a, -Math.cos(a) * 0.5]);
		}
		for (let i = 0; i < 6; i++) {
			const a = i * 1.7;
			ball(root, k.glass, r * 0.07, [Math.cos(a) * r * 0.62, r * 0.06, Math.sin(a) * r * 0.62], [1, 1.3, 1]);
		}
		const antennas = group(root, [0, r * 0.75, 0]);
		for (let i = 0; i < 3; i++) shard(antennas, k.metal, [(i - 1) * r * 0.12, 0, (i % 2) * r * 0.1], r * 0.04, r * (0.5 + i * 0.12), i, [(i - 1) * 0.2, i, 0]);
		return { root, update: (e, i) => (antennas.rotation.y = Math.sin(i.time * 0.4) * 0.3) };
	}

	// ---------- the orbital station ----------
	function orbital(k, r) {
		const root = new THREE.Group(),
			w = r * 1.6;
		// Stepped octagonal platform with a hazard edge.
		mesh(root, cylGeo(n2(w * 0.55), n2(w * 0.6), 4, 8), k.dark, [0, 2, 0], [0, Math.PI / 8, 0]);
		mesh(root, cylGeo(n2(w * 0.42), n2(w * 0.46), 3, 8), k.plate, [0, 5.5, 0], [0, Math.PI / 8, 0]);
		for (let i = 0; i < 16; i++) {
			const a = (i / 16) * Math.PI * 2;
			box(root, i % 2 ? k.warn : k.black, [w * 0.2, 0.5, 1.4], [Math.cos(a) * w * 0.57, 4.2, Math.sin(a) * w * 0.57], [0, -a + Math.PI / 2, 0], 0.1);
		}
		// Control block with windows and a team band.
		box(root, k.plate, [w * 0.3, 12, w * 0.24], [w * 0.22, 13, -w * 0.18], null, 0.8);
		box(root, k.team, [w * 0.31, 1.6, w * 0.25], [w * 0.22, 17.6, -w * 0.18], null, 0.3);
		for (let i = 0; i < 4; i++) box(root, k.window, [0.5, 2.4, 2.6], [w * 0.37 + 0.2, 13, -w * 0.28 + i * w * 0.065], null, 0.1);
		// Capacitor banks: cylinders with caps that fill with light as the strike charges.
		const caps = [];
		for (let i = 0; i < 4; i++) {
			const a = Math.PI * 0.75 + i * 0.35,
				x = Math.cos(a) * w * 0.32,
				z = Math.sin(a) * w * 0.32;
			cyl(root, k.metal, 3.4, 12, [x, 13, z], { segs: 10 });
			for (const y of [9, 15]) mesh(root, torusGeo(3.6, 0.4, 12), k.dark, [x, y, z]);
			caps.push(cyl(root, k.energy, 2.6, 2, [x, 20, z], { segs: 10 }));
			pipe(root, k.black, [x, 8, z], [0, 8, 0], 0.6);
		}
		// The lattice mast with targeting rings, the emitter on top.
		const mastH = r * 1.6;
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
			pipe(root, k.metal, [Math.cos(a) * 7, 7, Math.sin(a) * 7], [Math.cos(a) * 2, 7 + mastH, Math.sin(a) * 2], 0.7);
		}
		for (let y = 14; y < mastH; y += 12) mesh(root, torusGeo(n2(7 - (y / mastH) * 5), 0.35, 4), k.metal, [0, 7 + y, 0], [0, Math.PI / 4, 0]);
		const rings = [0.45, 0.65].map((t, i) => {
			const g = group(root, [0, 7 + mastH * t, 0]);
			mesh(g, torusGeo(n2(10 - i * 2), 0.8, 24), k.team, [0, 0, 0]);
			for (let j = 0; j < 3; j++) box(g, k.dark, [2, 2, 2], [Math.cos((j / 3) * Math.PI * 2) * (10 - i * 2), 0, Math.sin((j / 3) * Math.PI * 2) * (10 - i * 2)], null, 0.3);
			return g;
		});
		const emitter = group(root, [0, 7 + mastH, 0]);
		mesh(emitter, cylGeo(1.2, 3, 5, 10), k.dark, [0, 2.5, 0]);
		const flare = ball(emitter, k.energy, 2.4, [0, 6.5, 0]);
		// The dish on a turning mount.
		const dish = group(root, [-w * 0.22, 6, w * 0.16]);
		cyl(dish, k.metal, 3, 10, [0, 5, 0], { segs: 10 });
		const bowl = group(dish, [0, 12, 0]);
		bowl.rotation.z = 0.6;
		mesh(bowl, tools.shellGeo([[1, 0], [r * 0.25, 2], [r * 0.4, 5.5], [r * 0.48, 8.5]].map(([a, b]) => [n2(a), n2(b)]), 0.6, 18), k.metal, [0, 0, 0]);
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2;
			pipe(bowl, k.steel, [Math.cos(a) * r * 0.44, 7.5, Math.sin(a) * r * 0.44], [0, 15, 0], 0.3);
		}
		ball(bowl, k.glass, 1.6, [0, 15, 0]);
		return {
			root,
			update(e, i) {
				const charge = i.charge ?? 1;
				caps.forEach((c, n) => (c.visible = i.built >= 1 && charge > (n + 0.5) / caps.length));
				rings[0].rotation.y = i.time * (0.4 + (1 - charge) * 2);
				rings[1].rotation.y = -i.time * (0.6 + (1 - charge) * 2.5);
				flare.visible = i.built >= 1 && charge >= 1;
				flare.scale.setScalar(1 + Math.sin(i.time * 6) * 0.15);
				dish.rotation.y = i.time * 0.25;
			},
		};
	}

	// ---------- the Peak's resonance jammer (on the relay of the hill mode) ----------
	function peak(root, color) {
		const g = group(root, [0, 6, 0]),
			light = glowOf(color, 0.9);
		mesh(g, cylGeo(14, 17, 4, 6), tools.cached("peakstone", () => std("#4a4e52", { roughness: 0.8, metalness: 0.3 })), [0, 2, 0]);
		for (let i = 0; i < 6; i++) {
			const a = (i / 6) * Math.PI * 2;
			pipe(g, tools.cached("peakmetal", () => std("#6d6f72", { roughness: 0.6, metalness: 0.5 })), [Math.cos(a) * 12, 4, Math.sin(a) * 12], [Math.cos(a) * 3, 78, Math.sin(a) * 3], 0.9);
		}
		for (let i = 0; i < 4; i++) mesh(g, cylGeo(n2(10 - i * 1.8), n2(10 - i * 1.8), 1.2, 16), light, [0, 26 + i * 14, 0]); // stacked discs
		const top = group(g, [0, 84, 0]);
		mesh(top, crystalGeo(), light, [0, 0, 0]).scale.set(5, 6, 5);
		return top;
	}

	return { heart, nest, orbital, peak };
}
