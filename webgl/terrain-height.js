/* Terrain height for the WebGL renderer (visual only: movement, vision and saves do not change).
   A coarse height map is derived from the map itself — gentle hills from seeded noise, raised rock
   (mesas, spires, outcrops, wrecks, groves, dunes) and sunken water (lakes, rivers, chasms, lava) —
   and lit for a sun direction: slopes facing the sun get warm light, slopes turned away get shade,
   and high ground casts shadows that grow long at dawn and dusk. Lighting for each baked sun
   direction is computed a few rows per frame, so it never stalls the game. */
function createTerrainHeight() {
	"use strict";
	const CELL = 12,
		// World units per 1.0 of height; decides how steep the slopes look and how long shadows get.
		RISE = 70;
	const RAISED = { mesa: [1, "plateau"], spire: [1.35, "peak"], outcrop: [0.65, "plateau"], rock: [0.7, "plateau"], wreck: [0.55, "plateau"], derelict: [0.6, "plateau"], ruin: [0.4, "plateau"], debris: [0.3, "plateau"], grove: [0.3, "peak"], resin: [0.3, "plateau"], eggs: [0.18, "peak"], processor: [0.2, "plateau"], crystal: [0.5, "peak"] };
	const WATER = { lake: -0.35, glow: -0.35, chasm: -1.3, crevasse: -1, lava: -0.25, dune: 0.5, sea: -0.45, ice: -0.08 };
	let map = null,
		queue = [],
		lights = new Map();

	const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

	function build(game) {
		const cols = Math.ceil(game.W / CELL) + 1,
			rows = Math.ceil(game.H / CELL) + 1,
			hills = new Float32Array(cols * rows),
			up = new Float32Array(cols * rows),
			down = new Float32Array(cols * rows);
		// Space (the orbital battle): a flat plane, the asteroids float above it.
		if (RTS.MISSIONS[game.missionId]?.space) return { cols, rows, height: new Float32Array(cols * rows), key: [game.missionId, game.W, game.H, "space"].join("|") };
		// Seeded value noise, two octaves.
		let seed = [...String(game.missionId)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
		const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
		for (const [size, amp] of [
			[34, 0.22],
			[11, 0.08],
		]) {
			const gw = Math.ceil(cols / size) + 2,
				gh = Math.ceil(rows / size) + 2,
				grid = Array.from({ length: gw * gh }, rand);
			for (let y = 0; y < rows; y++)
				for (let x = 0; x < cols; x++) {
					const gx = x / size,
						gy = y / size,
						x0 = Math.floor(gx),
						y0 = Math.floor(gy),
						tx = smooth(gx - x0),
						ty = smooth(gy - y0),
						v = (i, j) => grid[(y0 + j) * gw + x0 + i],
						top = v(0, 0) + (v(1, 0) - v(0, 0)) * tx,
						bottom = v(0, 1) + (v(1, 1) - v(0, 1)) * tx;
					hills[y * cols + x] += (top + (bottom - top) * ty - 0.5) * amp * 2;
				}
		}
		const cells = (x0, y0, x1, y1, fn) => {
			for (let y = Math.max(0, Math.floor(y0 / CELL)); y <= Math.min(rows - 1, Math.ceil(y1 / CELL)); y++)
				for (let x = Math.max(0, Math.floor(x0 / CELL)); x <= Math.min(cols - 1, Math.ceil(x1 / CELL)); x++) fn(x, y, x * CELL, y * CELL);
		};
		for (const o of game.obstacles || []) {
			const [amp, shape] = RAISED[o.kind || "rock"] || RAISED.rock;
			if (shape === "peak") {
				const cx = o.x + o.w / 2,
					cy = o.y + o.h / 2,
					r = Math.max(o.w, o.h) * 0.75;
				cells(cx - r, cy - r, cx + r, cy + r, (x, y, px, py) => {
					const h = amp * Math.pow(Math.max(0, 1 - Math.hypot(px - cx, py - cy) / r), 1.4);
					up[y * cols + x] = Math.max(up[y * cols + x], h);
				});
			} else {
				const edge = Math.min(o.w, o.h) * 0.3 + 22;
				cells(o.x - edge, o.y - edge, o.x + o.w + edge, o.y + o.h + edge, (x, y, px, py) => {
					const dx = Math.max(o.x - px, 0, px - o.x - o.w),
						dy = Math.max(o.y - py, 0, py - o.y - o.h),
						h = amp * smooth(1 - Math.hypot(dx, dy) / edge);
					up[y * cols + x] = Math.max(up[y * cols + x], h);
				});
			}
		}
		for (const w of game.waters || []) {
			const amp = WATER[w.kind || "lake"] ?? WATER.lake,
				r = Math.max(w.rx, w.ry) * 1.35;
			cells(w.x - r, w.y - r, w.x + r, w.y + r, (x, y, px, py) => {
				const a = Math.atan2(py - w.y, px - w.x),
					edge = RTS.waterRadius ? RTS.waterRadius(w, a) : 1,
					rx = w.rx * edge,
					ry = w.ry * edge,
					q = Math.hypot((px - w.x) / rx, (py - w.y) / ry),
					h = amp * (1 - smooth((q - 0.55) / 0.75)),
					i = y * cols + x;
				if (amp > 0) up[i] = Math.max(up[i], h);
				else down[i] = Math.min(down[i], h);
			});
		}
		const height = new Float32Array(cols * rows);
		for (let i = 0; i < height.length; i++) height[i] = hills[i] + up[i] + down[i];
		// One light blur pass softens the coarse cells.
		const soft = new Float32Array(height.length);
		for (let y = 0; y < rows; y++)
			for (let x = 0; x < cols; x++) {
				let sum = 0,
					n = 0;
				for (let j = -1; j <= 1; j++)
					for (let i = -1; i <= 1; i++) {
						const xx = x + i,
							yy = y + j;
						if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
						sum += height[yy * cols + xx];
						n++;
					}
				soft[y * cols + x] = sum / n;
			}
		return { cols, rows, height: soft, key: [game.missionId, game.W, game.H, (game.obstacles || []).length, (game.waters || []).length].join("|") };
	}

	// light: { key, x, y, z (towards the light), color, shade, gain }
	function startBake(light) {
		const canvas = document.createElement("canvas");
		canvas.width = map.cols;
		canvas.height = map.rows;
		const job = { light, canvas, img: canvas.getContext("2d").createImageData(map.cols, map.rows), row: 0, done: false };
		lights.set(light.key, job);
		queue.push(job);
		return job;
	}
	function bakeRows(job, deadline) {
		const { cols, rows, height } = map,
			l = job.light,
			len = Math.hypot(l.x, l.y, l.z),
			lx = l.x / len,
			ly = l.y / len,
			lz = l.z / len,
			flat = Math.hypot(lx, ly) || 1,
			// Per cell stepped towards the sun, the ray climbs this much (in height units).
			climb = ((lz / flat) * CELL) / RISE,
			sx = lx / flat,
			sy = ly / flat,
			px = job.img.data;
		while (job.row < rows && performance.now() < deadline) {
			const y = job.row++;
			for (let x = 0; x < cols; x++) {
				const i = y * cols + x,
					h = height[i],
					hx = (height[y * cols + Math.min(cols - 1, x + 1)] - height[y * cols + Math.max(0, x - 1)]) * (RISE / (2 * CELL)),
					hy = (height[Math.min(rows - 1, y + 1) * cols + x] - height[Math.max(0, y - 1) * cols + x]) * (RISE / (2 * CELL)),
					n = Math.hypot(hx, hy, 1),
					d = (-hx * lx - hy * ly + lz) / n - lz;
				// Cast shadow: march towards the sun while the terrain could still be above the ray.
				let shadow = 0;
				for (let s = 1, rise = climb; s < 60; s++, rise += climb) {
					const tx = Math.round(x + sx * s),
						ty = Math.round(y + sy * s);
					if (tx < 0 || ty < 0 || tx >= cols || ty >= rows || rise > 2.2) break;
					const over = height[ty * cols + tx] - (h + rise);
					if (over > 0) {
						shadow = Math.max(shadow, Math.min(1, over * 6));
						if (shadow >= 1) break;
					}
				}
				let r, g, b, a;
				if (d > 0 && shadow < 0.5) {
					[r, g, b] = l.color;
					a = Math.min(0.32, d * l.gain) * (1 - shadow * 2);
				} else {
					[r, g, b] = l.shade;
					a = Math.min(0.55, Math.max(0, -d) * l.gain * 1.2 + shadow * 0.42);
				}
				px[i * 4] = r;
				px[i * 4 + 1] = g;
				px[i * 4 + 2] = b;
				px[i * 4 + 3] = Math.round(a * 255);
			}
		}
		if (job.row >= rows) {
			job.canvas.getContext("2d").putImageData(job.img, 0, 0);
			job.img = null;
			job.done = true;
		}
	}

	return {
		cell: CELL,
		setGame(game) {
			const next = build(game);
			if (map?.key === next.key) return;
			map = next;
			queue = [];
			lights = new Map();
		},
		// The baked overlay for a light, or null while it is still being computed.
		overlay(light) {
			if (!map) return null;
			const job = lights.get(light.key) || startBake(light);
			return job.done ? job.canvas : null;
		},
		// Spends up to `budget` ms on pending lighting, most recently requested first.
		step(budget = 2) {
			const deadline = performance.now() + budget;
			while (queue.length && performance.now() < deadline) {
				const job = queue[queue.length - 1];
				bakeRows(job, deadline);
				if (job.done) queue.pop();
			}
		},
		// Height (0 = plain) at a map point, for tests and future effects.
		heightAt(x, y) {
			if (!map) return 0;
			const cx = Math.max(0, Math.min(map.cols - 1, Math.round(x / CELL))),
				cy = Math.max(0, Math.min(map.rows - 1, Math.round(y / CELL)));
			return map.height[cy * map.cols + cx];
		},
		stats: () => ({ cols: map?.cols || 0, rows: map?.rows || 0, baked: [...lights.values()].filter((j) => j.done).length, pending: queue.length }),
	};
}
