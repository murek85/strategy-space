/* Code-generated lighting data for the board models, used by the WebGL renderer.
   - paint(): a model drawn alone on its own canvas by the same art code as the board (silhouettes for shadows).
   - volume(): a building lit from a direction. A height field is derived from the model itself (soft
     silhouette = walls and roof edges, brightness = panels and details), turned into a normal map and
     lit per light direction; the result is a translucent highlight/shade overlay drawn over the model.
   - scars(): soot and cracks clipped to the model's silhouette, shown on damaged buildings.
   Everything is baked lazily and cached per model and light direction. */
function createModelLight() {
	"use strict";
	const { TYPES, MISSIONS } = RTS;
	const bodies = new Map(),
		normals = new Map(),
		overlays = new Map(),
		scarred = new Map();

	function paint(e, game, frame = 0, moving = false) {
		const s = TYPES[e.type],
			key = [e.type, e.team, e.faction || "", e.tint || "", frame, moving ? 1 : 0].join("|");
		if (bodies.has(key)) return bodies.get(key);
		const building = !s.speed,
			box = building ? 240 : Math.max(96, Math.ceil(s.radius * 5)),
			ox = box / 2,
			oy = building ? box / 2 + 12 : box / 2,
			probe = { ...e, x: 0, y: 0, angle: 0, path: moving ? [{ x: 10, y: 0 }] : [], hit: 0, cooldown: 0, constructionLeft: 0, hp: e.maxHp, order: moving ? { kind: "move", x: 10, y: 0 } : null },
			biome = MISSIONS[game.missionId].biome,
			canvas = document.createElement("canvas");
		canvas.width = canvas.height = box;
		const c = canvas.getContext("2d");
		c.translate(ox, oy);
		if (!Act2Art.body(c, probe, frame * 0.12) && !AdvancedArt.body(c, probe, frame * 0.12, biome)) BoardArt.body(c, probe, frame * 0.12, null, false);
		const entry = { key, canvas, ox, oy };
		bodies.set(key, entry);
		return entry;
	}

	// Separable box blur, run twice (close to a gaussian).
	function blur(src, w, h, r, box) {
		const tmp = new Float32Array(src.length),
			out = new Float32Array(src.length);
		let a = src;
		for (let pass = 0; pass < 2; pass++) {
			for (let y = box.y0; y <= box.y1; y++) {
				let sum = 0;
				for (let x = box.x0 - r; x <= box.x0 + r; x++) sum += x >= 0 && x < w ? a[y * w + x] : 0;
				for (let x = box.x0; x <= box.x1; x++) {
					tmp[y * w + x] = sum / (2 * r + 1);
					const add = x + r + 1,
						sub = x - r;
					sum += (add < w ? a[y * w + add] : 0) - (sub >= 0 ? a[y * w + sub] : 0);
				}
			}
			for (let x = box.x0; x <= box.x1; x++) {
				let sum = 0;
				for (let y = box.y0 - r; y <= box.y0 + r; y++) sum += y >= 0 && y < h ? tmp[y * w + x] : 0;
				for (let y = box.y0; y <= box.y1; y++) {
					out[y * w + x] = sum / (2 * r + 1);
					const add = y + r + 1,
						sub = y - r;
					sum += (add < h ? tmp[add * w + x] : 0) - (sub >= 0 ? tmp[sub * w + x] : 0);
				}
			}
			a = out.slice();
		}
		return a;
	}

	function normalMap(e, game) {
		const key = [e.type, e.faction || ""].join("|");
		if (normals.has(key)) return normals.get(key);
		const body = paint({ ...e, team: 0, tint: "" }, game),
			w = body.canvas.width,
			h = body.canvas.height,
			data = body.canvas.getContext("2d").getImageData(0, 0, w, h).data,
			mask = new Float32Array(w * h),
			detail = new Float32Array(w * h);
		const box = { x0: w, y0: h, x1: 0, y1: 0 };
		for (let i = 0; i < w * h; i++) {
			const alpha = data[i * 4 + 3] / 255,
				// Translucent drop shadows painted by the art are not part of the solid model.
				solid = Math.max(0, Math.min(1, (alpha - 0.45) / 0.4));
			mask[i] = solid;
			detail[i] = ((data[i * 4] * 0.3 + data[i * 4 + 1] * 0.55 + data[i * 4 + 2] * 0.15) / 255) * solid;
			if (solid > 0) {
				const x = i % w,
					y = (i / w) | 0;
				box.x0 = Math.min(box.x0, x);
				box.x1 = Math.max(box.x1, x);
				box.y0 = Math.min(box.y0, y);
				box.y1 = Math.max(box.y1, y);
			}
		}
		const entry = { w, h, ox: body.ox, oy: body.oy, mask, box: null, n: null };
		if (box.x1 >= box.x0) {
			const pad = 12;
			entry.box = { x0: Math.max(1, box.x0 - pad), y0: Math.max(1, box.y0 - pad), x1: Math.min(w - 2, box.x1 + pad), y1: Math.min(h - 2, box.y1 + pad) };
			const rim = blur(mask, w, h, 5, entry.box),
				fine = blur(detail, w, h, 1, entry.box),
				height = new Float32Array(w * h);
			for (let i = 0; i < w * h; i++) height[i] = rim[i] * 1.0 + fine[i] * 0.55;
			const n = new Float32Array(w * h * 3),
				k = 5.5;
			for (let y = entry.box.y0; y <= entry.box.y1; y++)
				for (let x = entry.box.x0; x <= entry.box.x1; x++) {
					const i = y * w + x,
						nx = (height[i - 1] - height[i + 1]) * k,
						ny = (height[i - w] - height[i + w]) * k,
						len = Math.hypot(nx, ny, 1);
					n[i * 3] = nx / len;
					n[i * 3 + 1] = ny / len;
					n[i * 3 + 2] = 1 / len;
				}
			entry.n = n;
		}
		normals.set(key, entry);
		return entry;
	}

	// light: { key, x, y, z (direction towards the light), color [r,g,b], shade [r,g,b], gain }
	function volume(e, game, light) {
		const map = normalMap(e, game),
			key = [e.type, e.faction || "", light.key].join("|");
		if (overlays.has(key)) return overlays.get(key);
		let entry = null;
		if (map.n) {
			const canvas = document.createElement("canvas");
			canvas.width = map.w;
			canvas.height = map.h;
			const c = canvas.getContext("2d"),
				img = c.createImageData(map.w, map.h),
				px = img.data,
				len = Math.hypot(light.x, light.y, light.z),
				lx = light.x / len,
				ly = light.y / len,
				lz = light.z / len;
			for (let y = map.box.y0; y <= map.box.y1; y++)
				for (let x = map.box.x0; x <= map.box.x1; x++) {
					const i = y * map.w + x,
						m = map.mask[i];
					if (m <= 0) continue;
					const d = map.n[i * 3] * lx + map.n[i * 3 + 1] * ly + map.n[i * 3 + 2] * lz - lz,
						col = d > 0 ? light.color : light.shade,
						a = Math.min(d > 0 ? 0.5 : 0.58, Math.abs(d) * light.gain * (d > 0 ? 1 : 1.15)) * m;
					px[i * 4] = col[0];
					px[i * 4 + 1] = col[1];
					px[i * 4 + 2] = col[2];
					px[i * 4 + 3] = Math.round(a * 255);
				}
			c.putImageData(img, 0, 0);
			entry = { canvas, ox: map.ox, oy: map.oy };
		}
		overlays.set(key, entry);
		return entry;
	}

	function scars(e, game) {
		const key = [e.type, e.faction || ""].join("|");
		if (scarred.has(key)) return scarred.get(key);
		const body = paint({ ...e, team: 0, tint: "" }, game),
			r = TYPES[e.type].radius,
			canvas = document.createElement("canvas");
		canvas.width = body.canvas.width;
		canvas.height = body.canvas.height;
		const c = canvas.getContext("2d");
		let seed = [...key].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
		const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
		c.translate(body.ox, body.oy);
		// Soot.
		for (let i = 0; i < 8; i++) {
			const x = (rand() - 0.5) * r * 1.7,
				y = (rand() - 0.6) * r * 1.5,
				s = r * (0.25 + rand() * 0.35),
				g = c.createRadialGradient(x, y, 0, x, y, s);
			g.addColorStop(0, "rgba(16,12,10,.72)");
			g.addColorStop(0.6, "rgba(22,17,14,.35)");
			g.addColorStop(1, "rgba(22,17,14,0)");
			c.fillStyle = g;
			c.fillRect(x - s, y - s, s * 2, s * 2);
		}
		// Cracks with a thin lit edge.
		for (let i = 0; i < 5; i++) {
			let x = (rand() - 0.5) * r * 1.4,
				y = (rand() - 0.6) * r * 1.2,
				a = rand() * Math.PI * 2;
			const pts = [[x, y]];
			for (let j = 0; j < 5; j++) {
				a += (rand() - 0.5) * 1.3;
				x += Math.cos(a) * r * 0.14;
				y += Math.sin(a) * r * 0.14;
				pts.push([x, y]);
			}
			for (const [color, width, dy] of [
				["rgba(190,180,160,.28)", 1, 1],
				["rgba(8,6,6,.85)", 1.6, 0],
			]) {
				c.strokeStyle = color;
				c.lineWidth = width;
				c.beginPath();
				pts.forEach(([px, py], k) => (k ? c.lineTo(px, py + dy) : c.moveTo(px, py + dy)));
				c.stroke();
			}
		}
		// Keep only what lies on the model.
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.globalCompositeOperation = "destination-in";
		c.drawImage(body.canvas, 0, 0);
		const entry = { canvas, ox: body.ox, oy: body.oy };
		scarred.set(key, entry);
		return entry;
	}

	// ---------- units ----------
	// Units turn, and a tank's turret aims on its own, so their light is made from the look actually shown
	// (direction, turret aim and state included): the normals are in map space and the sun stays put while the
	// unit turns. Looks are many, so the normal maps are small (cropped to the model), made within a per-frame
	// budget and released when unused. Styles: vehicles use the model's details; infantry only a soft dome
	// (its models are too small for detail), which reads as a lit rim towards the light.
	const looks = new Map(),
		STYLES = { vehicle: { rim: 4, detail: 0.5, gain: 1 }, infantry: { rim: 3, detail: 0, gain: 0.8 }, deposit: { rim: 4, detail: 0.6, gain: 0.9 } };
	let tick = 0,
		lookBudget = 0;
	function unitMap(key, box, draw, style) {
		let entry = looks.get(key);
		if (entry) return entry;
		if (lookBudget <= 0) return null;
		lookBudget--;
		const st = STYLES[style],
			{ w, h, ox, oy } = box,
			canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const c = canvas.getContext("2d", { willReadFrequently: true });
		c.translate(ox, oy);
		draw(c, 0);
		const data = c.getImageData(0, 0, w, h).data,
			mask = new Float32Array(w * h),
			detail = new Float32Array(w * h),
			box2 = { x0: w, y0: h, x1: 0, y1: 0 };
		for (let i = 0; i < w * h; i++) {
			const solid = Math.max(0, Math.min(1, (data[i * 4 + 3] / 255 - 0.45) / 0.4));
			mask[i] = solid;
			detail[i] = ((data[i * 4] * 0.3 + data[i * 4 + 1] * 0.55 + data[i * 4 + 2] * 0.15) / 255) * solid;
			if (solid > 0) {
				const x = i % w,
					y = (i / w) | 0;
				box2.x0 = Math.min(box2.x0, x);
				box2.x1 = Math.max(box2.x1, x);
				box2.y0 = Math.min(box2.y0, y);
				box2.y1 = Math.max(box2.y1, y);
			}
		}
		entry = { used: tick, lit: new Map(), scar: null, n: null };
		if (box2.x1 >= box2.x0) {
			const pad = 2,
				b = { x0: Math.max(1, box2.x0 - pad), y0: Math.max(1, box2.y0 - pad), x1: Math.min(w - 2, box2.x1 + pad), y1: Math.min(h - 2, box2.y1 + pad) },
				rim = blur(mask, w, h, st.rim, b),
				fine = st.detail ? blur(detail, w, h, 1, b) : null,
				bw = b.x1 - b.x0 + 1,
				bh = b.y1 - b.y0 + 1,
				n = new Int8Array(bw * bh * 3),
				m = new Uint8Array(bw * bh),
				height = (i) => rim[i] + (fine ? fine[i] * st.detail : 0),
				k = 5.5;
			for (let y = b.y0; y <= b.y1; y++)
				for (let x = b.x0; x <= b.x1; x++) {
					const i = y * w + x,
						j = (y - b.y0) * bw + (x - b.x0),
						nx = (height(i - 1) - height(i + 1)) * k,
						ny = (height(i - w) - height(i + w)) * k,
						len = Math.hypot(nx, ny, 1);
					n[j * 3] = Math.round((nx / len) * 127);
					n[j * 3 + 1] = Math.round((ny / len) * 127);
					n[j * 3 + 2] = Math.round((1 / len) * 127);
					m[j] = Math.round(mask[i] * 255);
				}
			Object.assign(entry, { n, m, bw, bh, ox: ox - b.x0, oy: oy - b.y0, gain: st.gain });
		}
		looks.set(key, entry);
		return entry;
	}
	// The unit's look lit from a direction: { canvas, ox, oy } (or null for an empty look).
	function unitVolume(entry, light) {
		if (!entry.n) return null;
		if (entry.lit.has(light.key)) return entry.lit.get(light.key);
		const canvas = document.createElement("canvas");
		canvas.width = entry.bw;
		canvas.height = entry.bh;
		const c = canvas.getContext("2d"),
			img = c.createImageData(entry.bw, entry.bh),
			px = img.data,
			len = Math.hypot(light.x, light.y, light.z),
			lx = light.x / len,
			ly = light.y / len,
			lz = light.z / len,
			gain = light.gain * entry.gain;
		for (let j = 0; j < entry.bw * entry.bh; j++) {
			const mm = entry.m[j] / 255;
			if (mm <= 0) continue;
			const d = (entry.n[j * 3] * lx + entry.n[j * 3 + 1] * ly + entry.n[j * 3 + 2] * lz) / 127 - lz,
				col = d > 0 ? light.color : light.shade,
				a = Math.min(d > 0 ? 0.5 : 0.58, Math.abs(d) * gain * (d > 0 ? 1 : 1.15)) * mm;
			px[j * 4] = col[0];
			px[j * 4 + 1] = col[1];
			px[j * 4 + 2] = col[2];
			px[j * 4 + 3] = Math.round(a * 255);
		}
		c.putImageData(img, 0, 0);
		const lit = { canvas, ox: entry.ox, oy: entry.oy };
		entry.lit.set(light.key, lit);
		return lit;
	}
	// Soot and scratches on a damaged vehicle: a fixed pattern per type, turned with the unit, kept on the model.
	function unitScars(entry, type, radius, angle) {
		if (!entry.n) return null;
		if (entry.scar) return entry.scar;
		const canvas = document.createElement("canvas");
		canvas.width = entry.bw;
		canvas.height = entry.bh;
		const c = canvas.getContext("2d");
		let seed = [...type].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
		const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
		c.translate(entry.ox, entry.oy);
		c.rotate(angle);
		for (let i = 0; i < 5; i++) {
			const x = (rand() - 0.5) * radius * 1.4,
				y = (rand() - 0.5) * radius * 1.1,
				s = radius * (0.25 + rand() * 0.3),
				g = c.createRadialGradient(x, y, 0, x, y, s);
			g.addColorStop(0, "rgba(16,12,10,.7)");
			g.addColorStop(1, "rgba(22,17,14,0)");
			c.fillStyle = g;
			c.fillRect(x - s, y - s, s * 2, s * 2);
		}
		for (let i = 0; i < 3; i++) {
			let x = (rand() - 0.5) * radius,
				y = (rand() - 0.5) * radius * 0.8,
				a = rand() * Math.PI * 2;
			c.strokeStyle = "rgba(8,6,6,.8)";
			c.lineWidth = 1.2;
			c.beginPath();
			c.moveTo(x, y);
			for (let j = 0; j < 3; j++) {
				a += (rand() - 0.5) * 1.2;
				x += Math.cos(a) * radius * 0.16;
				y += Math.sin(a) * radius * 0.16;
				c.lineTo(x, y);
			}
			c.stroke();
		}
		// Keep only what lies on the model.
		c.setTransform(1, 0, 0, 1, 0, 0);
		const img = c.getImageData(0, 0, entry.bw, entry.bh),
			px = img.data;
		for (let j = 0; j < entry.bw * entry.bh; j++) px[j * 4 + 3] = Math.round((px[j * 4 + 3] * entry.m[j]) / 255);
		c.putImageData(img, 0, 0);
		entry.scar = { canvas, ox: entry.ox, oy: entry.oy };
		return entry.scar;
	}
	// Once per frame: a new budget of unit normal maps, and looks unused for about 10 s are dropped.
	function frameLooks(budget = 6) {
		tick++;
		lookBudget = budget;
		if (tick % 120) return;
		for (const [key, entry] of looks) if (tick - entry.used > 600) looks.delete(key);
	}
	function unitLook(key, box, draw, style) {
		const entry = unitMap(key, box, draw, style);
		if (entry) entry.used = tick;
		return entry;
	}

	return {
		paint,
		volume,
		scars,
		unitLook,
		unitVolume,
		unitScars,
		frameLooks,
		stats: () => ({ bodies: bodies.size, normals: normals.size, overlays: overlays.size, scars: scarred.size, looks: looks.size }),
	};
}
