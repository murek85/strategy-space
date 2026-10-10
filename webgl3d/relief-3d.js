/* Relief of the 3D board (visual only: movement, vision and saves do not change; the 2D boards keep
   webgl/terrain-height.js). A height map twice as fine as the 2D one (6 units a cell) built from the
   map itself:
   - hills: warped swells, ridges and hollows from seeded noise (gentler on ice, rougher on ash);
   - mesas: steep cliffs with a ragged edge, a flat top, ledges of rock strata on the walls and a talus
     apron of scree at the foot; outcrops and rocks: rugged knolls with steep sides;
   - spires: sharp peaks with ridges and gullies running down;
   - groves, wrecks, ruins and the like: soft mounds (as before); waters: lake beds, chasms, lava
     channels sunk in, dunes raised (with a sharp crest);
   - rock: how much of each cell is bare rock (steep slopes, cliffs, peaks), for the terrain shader.
   Heights in world units. */
export function createRelief3D({ RISE }) {
	const CELL = 6;
	const sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
	function noiseOf(seedText) {
		let seed = [...String(seedText)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
		const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296,
			grid = Float32Array.from({ length: 128 * 128 }, rand);
		// Value noise 0…1 on a tiling 128 grid, size = world units per cell.
		return (x, y, size) => {
			const gx = x / size,
				gy = y / size,
				i = Math.floor(gx),
				j = Math.floor(gy),
				tx = sm(gx - i),
				ty = sm(gy - j),
				at = (a, b) => grid[((b & 127) << 7) | (a & 127)],
				top = at(i, j) + (at(i + 1, j) - at(i, j)) * tx,
				bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
			return top + (bottom - top) * ty;
		};
	}
	// Plateau-shaped obstacles: [height (× RISE), profile]; cliff: mesa walls, knoll: rugged rock, mound: soft.
	const RAISED = { mesa: [1, "cliff"], outcrop: [0.7, "knoll"], rock: [0.75, "knoll"], spire: [1.4, "peak"], grove: [0.3, "soft"], eggs: [0.18, "soft"], wreck: [0.55, "mound"], derelict: [0.6, "mound"], ruin: [0.4, "mound"], debris: [0.3, "mound"], resin: [0.3, "mound"], processor: [0.2, "mound"], crystal: [0.5, "knoll"] };
	const WATER = { lake: -0.35, glow: -0.35, chasm: -1.3, crevasse: -1, lava: -0.25, dune: 0.5, sea: -0.45, ice: -0.08 };
	const ROUGH = { ice: 0.75, dust: 1, ash: 1.25 };

	function build(game, { relief = true } = {}) {
		const cols = Math.ceil(game.W / CELL) + 1,
			rows = Math.ceil(game.H / CELL) + 1,
			n = cols * rows,
			hills = new Float32Array(n),
			up = new Float32Array(n),
			down = new Float32Array(n),
			crag = new Float32Array(n),
			noise = noiseOf(game.missionId + ":" + game.W + "x" + game.H),
			rough = ROUGH[RTS.MISSIONS[game.missionId]?.biome] ?? 1;
		// Space (the orbital battle): a flat plane; the asteroid fields float above it (models-3d.js).
		if (RTS.MISSIONS[game.missionId]?.space) return { cols, rows, cell: CELL, data: new Float32Array(n), rock: new Float32Array(n) };
		const fbm = (x, y, size) => noise(x, y, size) * 0.55 + noise(x + 71, y - 33, size / 2.1) * 0.3 + noise(x - 19, y + 57, size / 4.4) * 0.15;
		// Ridged noise: sharp crests where the noise crosses its middle (ridges, gullies).
		const ridge = (x, y, size) => 1 - Math.abs(fbm(x, y, size) - 0.5) * 2;

		// Hills: domain-warped swells (no grid look), ridges on some of them, small bumps everywhere.
		if (relief)
			for (let j = 0; j < rows; j++)
				for (let i = 0; i < cols; i++) {
					const x = i * CELL,
						y = j * CELL,
						wx = x + (noise(x, y, 900) - 0.5) * 500,
						wy = y + (noise(x + 400, y - 300, 900) - 0.5) * 500,
						swell = (fbm(wx, wy, 760) - 0.5) * 2,
						ridges = Math.pow(ridge(wx + 200, wy, 520), 3) * sm((fbm(wx, wy, 1500) - 0.42) / 0.3),
						bumps = (noise(x, y, 70) - 0.5) * 2;
					hills[j * cols + i] = (swell * 20 + ridges * 18 * rough + bumps * 1.6) * (0.8 + 0.2 * rough);
				}

		const box = (x0, y0, x1, y1, fn) => {
			for (let j = Math.max(0, Math.floor(y0 / CELL)); j <= Math.min(rows - 1, Math.ceil(y1 / CELL)); j++)
				for (let i = Math.max(0, Math.floor(x0 / CELL)); i <= Math.min(cols - 1, Math.ceil(x1 / CELL)); i++) fn(j * cols + i, i * CELL, j * CELL);
		};
		for (const o of game.obstacles || []) {
			const [amp, shape] = RAISED[o.kind || "rock"] || RAISED.rock,
				H = amp * RISE,
				cx = o.x + o.w / 2,
				cy = o.y + o.h / 2,
				small = Math.min(o.w, o.h),
				hx = o.w / 2,
				hy = o.h / 2;
			if (shape === "peak" || shape === "soft") {
				const r = Math.max(o.w, o.h) * (shape === "peak" ? 0.8 : 0.75);
				box(cx - r, cy - r, cx + r, cy + r, (k, px, py) => {
					// A ragged outline, a sharp top; ridges and gullies on the flanks of a peak.
					const a = Math.atan2(py - cy, px - cx),
						edge = r * (0.85 + noise(Math.cos(a) * 60 + cx, Math.sin(a) * 60 + cy, 40) * 0.3),
						t = Math.max(0, 1 - Math.hypot(px - cx, py - cy) / edge);
					if (t <= 0) return;
					let h = H * Math.pow(t, shape === "peak" ? 1.15 : 1.4);
					if (shape === "peak") {
						h *= 0.82 + 0.3 * ridge(px * 1.3, py * 1.3, 90) * t;
						crag[k] = Math.max(crag[k], sm(t * 1.6));
					}
					up[k] = Math.max(up[k], h);
				});
				continue;
			}
			// Distance outside the obstacle's rectangle (rounded corners), negative inside, with a ragged edge.
			const round = small * 0.28,
				wob = small * 0.09 + 10,
				reach = shape === "cliff" ? 16 + H * 0.35 : shape === "knoll" ? small * 0.22 + 18 : small * 0.3 + 22,
				apron = shape === "cliff" ? 46 : shape === "knoll" ? 26 : 0;
			box(o.x - reach - apron - wob, o.y - reach - apron - wob, o.x + o.w + reach + apron + wob, o.y + o.h + reach + apron + wob, (k, px, py) => {
				const qx = Math.abs(px - cx) - (hx - round),
					qy = Math.abs(py - cy) - (hy - round),
					d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - round + (noise(px, py, 34) - 0.5) * 2 * wob;
				let h;
				if (shape === "cliff") {
					// The wall from a little inside the edge to `reach` outside it, in three ledges of strata;
					// a flat top with a gentle swell; scree piled at the foot.
					const t = sm((d + reach * 0.35) / reach),
						steps = 3,
						s = (1 - t) * steps,
						ledge = (Math.floor(s) + sm((s - Math.floor(s) - 0.3) / 0.4)) / steps,
						top = 1 + (fbm(px, py, 120) - 0.5) * 0.08,
						scree = 0.24 * (1 - sm((d - reach * 0.4) / apron)) * (0.8 + 0.4 * noise(px, py, 22));
					h = H * Math.max(Math.min(ledge, 1) * (t <= 0 ? top : 1), d > 0 ? scree : 0);
					crag[k] = Math.max(crag[k], t > 0.02 && t < 0.98 ? 1 : 0);
				} else if (shape === "knoll") {
					// A rugged rock knoll: steep sides, a lumpy top.
					const t = 1 - sm((d + reach * 0.5) / reach),
						lumps = 0.75 + 0.45 * ridge(px * 1.4, py * 1.4, 70);
					h = H * Math.pow(t, 0.7) * lumps + (d > 0 ? H * 0.12 * (1 - sm(d / apron)) * noise(px, py, 18) : 0);
					crag[k] = Math.max(crag[k], sm(t * 2) * 0.8);
				} else h = H * sm(1 - Math.max(0, d) / reach);
				up[k] = Math.max(up[k], h);
			});
		}
		for (const w of game.waters || []) {
			const amp = (WATER[w.kind || "lake"] ?? WATER.lake) * RISE,
				r = Math.max(w.rx, w.ry) * 1.35,
				dune = w.kind === "dune";
			// Standing water lies level: the hills under a lake are flattened to the lowest point of its
			// shore, blending back into them past the rim, so the surface is flat and the bowl even.
			if (!dune && w.kind !== "lava" && w.kind !== "chasm") {
				let rimMin = Infinity;
				for (let n = 0; n < 32; n++) {
					const a = (n / 32) * Math.PI * 2,
						e = RTS.waterRadius ? RTS.waterRadius(w, a) : 1,
						i = Math.round((w.x + Math.cos(a) * w.rx * e) / CELL),
						j = Math.round((w.y + Math.sin(a) * w.ry * e) / CELL);
					if (i >= 0 && j >= 0 && i < cols && j < rows) rimMin = Math.min(rimMin, hills[j * cols + i]);
				}
				if (rimMin < Infinity)
					box(w.x - r, w.y - r, w.x + r, w.y + r, (k, px, py) => {
						const a = Math.atan2(py - w.y, px - w.x),
							e = RTS.waterRadius ? RTS.waterRadius(w, a) : 1,
							q = Math.hypot((px - w.x) / (w.rx * e), (py - w.y) / (w.ry * e)),
							flat = 1 - sm((q - 0.95) / 0.35);
						hills[k] += (rimMin - hills[k]) * flat;
					});
			}
			box(w.x - r, w.y - r, w.x + r, w.y + r, (k, px, py) => {
				const a = Math.atan2(py - w.y, px - w.x),
					edge = RTS.waterRadius ? RTS.waterRadius(w, a) : 1,
					q = Math.hypot((px - w.x) / (w.rx * edge), (py - w.y) / (w.ry * edge));
				// Dunes: a crest, steeper on the lee side; beds: a bowl.
				let h = amp * (1 - sm((q - 0.55) / 0.75));
				if (dune) h = amp * Math.pow(Math.max(0, 1 - q / 1.3), 1.6) * (0.85 + 0.3 * noise(px, py, 60));
				if (amp > 0) up[k] = Math.max(up[k], h);
				else down[k] = Math.min(down[k], h);
			});
		}
		const data = new Float32Array(n);
		for (let k = 0; k < n; k++) data[k] = hills[k] + up[k] + down[k];
		// Bare rock: steep ground, cliffs and peaks.
		const rock = new Float32Array(n);
		for (let j = 0; j < rows; j++)
			for (let i = 0; i < cols; i++) {
				const k = j * cols + i,
					dx = (data[j * cols + Math.min(cols - 1, i + 1)] - data[j * cols + Math.max(0, i - 1)]) / (2 * CELL),
					dy = (data[Math.min(rows - 1, j + 1) * cols + i] - data[Math.max(0, j - 1) * cols + i]) / (2 * CELL),
					slope = Math.hypot(dx, dy);
				rock[k] = Math.max(sm((slope - 0.65) / 0.6), crag[k] * sm((slope - 0.15) / 0.35));
			}
		return { cols, rows, cell: CELL, data, rock };
	}
	return { cell: CELL, build };
}
