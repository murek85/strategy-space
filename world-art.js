/* Looks of the worlds of M4 (0.165), registered into MapArt (the Canvas board; the WebGL board bakes the same
   texture, the 3D board paints the ground from it and builds the pillars and the sea surface itself):
   - "ocean" (Thalassa): green islands in a sea of waters of kind "sea" — wide sandy beaches, wet sand, light
     shallows over sandbars, deep water; tufts of grass and palms on land (2D), glints and foam on the water.
   - "crystal" (Nivalis, the crystal ridges): frost-blue ground with glinting veins; obstacles of kind
     "crystal" — clusters of tall prisms in cyan and violet that catch the light and glow at night.
   Changing in time (M5, 0.166; rules in world-rules.js): the frozen lake (waters of kind "ice") and the holes
   blasts break in it, the tide flooding the sandbars, the comets crossing the field in space. */
(() => {
	const TAU = Math.PI * 2;
	const { union, seeded, inView } = MapArt;
	const theme = (g) => RTS.MISSIONS[g.missionId]?.theme || null;
	const OURS = ["ocean", "crystal"];
	const BASE = { ocean: "#55704a", crystal: "#62798a" };
	const COLORS = { sea: "#2a7a96", crystal: "#a8e4f4", ice: "#bcd8e4" };
	const poly = (c, pts, fill, stroke) => {
		c.beginPath();
		pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.closePath();
		if (fill) {
			c.fillStyle = fill;
			c.fill();
		}
		if (stroke) {
			c.strokeStyle = stroke;
			c.stroke();
		}
	};
	const sea = (g) => (g.waters || []).filter((w) => w.kind === "sea");

	function ground(c, g, t, rand) {
		const n = (g.W * g.H) / (3360 * 2160);
		if (t === "ocean") {
			// Meadows and sandy patches.
			for (let i = 0; i < 150 * n; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					r = 80 + rand() * 200,
					gr = c.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, ["#6f8f4a40", "#3f6a3a40", "#b8a47030"][i % 3]);
				gr.addColorStop(1, "#55704a00");
				c.fillStyle = gr;
				c.fillRect(x - r, y - r, 2 * r, 2 * r);
			}
			// Tufts of grass: 2D only (the 3D board grows its own).
			c.strokeStyle = "#86a85a88";
			c.lineWidth = 1.6;
			for (let i = 0; i < (RTS.bareGround ? 0 : 1100 * n); i++) {
				const x = rand() * g.W,
					y = rand() * g.H;
				if (g.blocked(x, y, 30)) continue;
				for (let k = -1; k <= 1; k++) {
					c.beginPath();
					c.moveTo(x, y);
					c.lineTo(x + k * 5, y - 8 - rand() * 6);
					c.stroke();
				}
			}
		}
		if (t === "crystal") {
			for (let i = 0; i < 170 * n; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					r = 70 + rand() * 190,
					gr = c.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, ["#dcecf448", "#4a5a7a38", "#9ad8e830"][i % 3]);
				gr.addColorStop(1, "#62798a00");
				c.fillStyle = gr;
				c.fillRect(x - r, y - r, 2 * r, 2 * r);
			}
			// Glinting veins of crystal in the frost.
			for (let i = 0; i < 260 * n; i++) {
				let x = rand() * g.W,
					y = rand() * g.H;
				c.strokeStyle = i % 4 ? "#bfeefa66" : "#b89ae888";
				c.lineWidth = i % 4 ? 1.4 : 2.4;
				c.beginPath();
				c.moveTo(x, y);
				for (let s = 0; s < 3; s++) {
					x += (rand() - 0.5) * 60;
					y += (rand() - 0.5) * 40;
					c.lineTo(x, y);
				}
				c.stroke();
			}
		}
	}
	// The sea: beaches, wet sand, light shallows, deep water — the overlapping links read as one coast.
	function waters(c, g) {
		const s = sea(g);
		if (!s.length) return;
		union(c, s, 70, "#d6c48a40");
		union(c, s, 46, "#dcc890");
		union(c, s, 26, "#c4ae78");
		union(c, s, 10, "#8fb8a0");
		union(c, s, 0, "#5cb4b4");
		union(c, s, -26, "#3a9cb0");
		union(c, s, -60, "#2a7c98");
		union(c, s, -110, "#1d5f80");
		union(c, s, -140, "#164a6c");
		// The surf line along the beach.
		union(c, s, 4, "#e8f6f238");
		// Frozen water: a snowy rim, then ice clearer towards the middle, with cracks.
		const ice = (g.waters || []).filter((w) => w.kind === "ice");
		if (!ice.length) return;
		union(c, ice, 24, "#e6f1f4");
		union(c, ice, 8, "#cfe3ea");
		union(c, ice, -20, "#b4d2de");
		union(c, ice, -70, "#9ec2d2");
		const rand = seeded(733);
		c.lineCap = "round";
		for (const w of ice)
			for (let k = 0; k < 9; k++) {
				let x = w.x + (rand() - 0.5) * w.rx,
					y = w.y + (rand() - 0.5) * w.ry;
				c.strokeStyle = k % 3 ? "#ffffff88" : "#6f94a888";
				c.lineWidth = k % 3 ? 1.6 : 1.2;
				c.beginPath();
				c.moveTo(x, y);
				for (let s2 = 0; s2 < 5; s2++) {
					x += (rand() - 0.5) * 70;
					y += (rand() - 0.5) * 40;
					c.lineTo(x, y);
				}
				c.stroke();
			}
	}
	// A cluster of tall crystal prisms filling its field: shadow, then prisms back to front, light and dark faces.
	function crystal(c, o, rand) {
		const cx = o.x + o.w / 2,
			cy = o.y + o.h / 2,
			count = Math.max(4, Math.round((o.w * o.h) / 2600));
		c.fillStyle = "rgba(20,30,50,.35)";
		c.beginPath();
		c.ellipse(cx + 18, cy + 22, o.w * 0.55, o.h * 0.5, 0, 0, TAU);
		c.fill();
		const prisms = [];
		for (let k = 0; k < count; k++) {
			const a = rand() * TAU,
				d = Math.sqrt(rand()) * 0.8;
			prisms.push({ x: cx + Math.cos(a) * (o.w / 2) * d, y: cy + Math.sin(a) * (o.h / 2) * d, w: 12 + rand() * 14, h: 60 + rand() * Math.min(110, o.h), lean: (rand() - 0.5) * 0.5, violet: rand() < 0.3 });
		}
		prisms.sort((a, b) => a.y - b.y);
		for (const p of prisms) {
			const top = [p.x + p.lean * p.h, p.y - p.h],
				light = p.violet ? "#d8c8fa" : "#d8f6fc",
				mid = p.violet ? "#9a82e0" : "#7fd0ea",
				dark = p.violet ? "#5a4498" : "#3a86a8";
			poly(c, [[p.x - p.w, p.y], [top[0] - p.w * 0.6, top[1] + p.w * 0.8], top, [p.x, p.y + p.w * 0.4]], light);
			poly(c, [[p.x, p.y + p.w * 0.4], top, [top[0] + p.w * 0.6, top[1] + p.w * 0.8], [p.x + p.w, p.y]], dark);
			poly(c, [[p.x - p.w * 0.3, p.y], [top[0] - p.w * 0.15, top[1] + p.w * 0.9], [top[0] + p.w * 0.2, top[1] + p.w * 0.9], [p.x + p.w * 0.3, p.y + p.w * 0.2]], mid);
		}
	}
	// Palms on the islands near the beaches: 2D only.
	function palms(c, g, rand) {
		if (RTS.bareGround) return;
		const s = sea(g);
		for (let i = 0; i < 160; i++) {
			const w = s[Math.floor(rand() * s.length)];
			if (!w) return;
			const a = rand() * TAU,
				x = w.x + Math.cos(a) * (w.rx + 90 + rand() * 80),
				y = w.y + Math.sin(a) * (w.ry + 90 + rand() * 80);
			if (g.blocked(x, y, 28) || [...g.ores, ...g.gasFields, ...g.crystalFields, ...g.nodes].some((o) => Math.hypot(o.x - x, o.y - y) < 90) || g.entities.some((e) => e.type === "hq" && Math.hypot(e.x - x, e.y - y) < 300)) continue;
			c.fillStyle = "rgba(20,30,20,.3)";
			c.beginPath();
			c.ellipse(x + 14, y + 4, 22, 8, 0, 0, TAU);
			c.fill();
			c.strokeStyle = "#7a5a3a";
			c.lineWidth = 4;
			c.beginPath();
			c.moveTo(x, y);
			c.quadraticCurveTo(x + 6, y - 20, x + 2, y - 38);
			c.stroke();
			for (let k = 0; k < 6; k++) {
				const b = (k / 6) * TAU + rand() * 0.4;
				c.strokeStyle = k % 2 ? "#3f7a3a" : "#5a9a44";
				c.lineWidth = 5;
				c.beginPath();
				c.moveTo(x + 2, y - 38);
				c.quadraticCurveTo(x + 2 + Math.cos(b) * 14, y - 46 + Math.sin(b) * 6, x + 2 + Math.cos(b) * 26, y - 32 + Math.sin(b) * 12);
				c.stroke();
			}
		}
	}

	function terrain(c, g) {
		const t = theme(g),
			rand = seeded(9157);
		if (OURS.includes(t)) ground(c, g, t, rand);
		waters(c, g);
		// The 3D board builds the pillars in 3D (RTS.bareGround).
		if (RTS.bareGround) return;
		for (const o of g.obstacles) if (o.kind === "crystal") crystal(c, o, rand);
		if (t === "ocean") palms(c, g, rand);
	}
	// Changing in time: the tide over the sandbars, holes in the ice.
	function changing(c, g, view) {
		const tide = g.tide?.();
		if (tide && (tide.level > 0 || tide.rising)) {
			const bodies = g.tideBodies().filter((w) => inView(w, view, w.rx));
			c.save();
			if (tide.level > 0) {
				c.globalAlpha = tide.level;
				union(c, bodies, 8, "#8fb8a0");
				union(c, bodies, -6, "#5cb4b4");
				union(c, bodies, -50, "#3a9cb0");
				union(c, bodies, -4, "#e8f6f230");
			} else {
				// The warning: the water creeping in at the edges of the fords.
				c.globalAlpha = 0.25 + 0.2 * Math.sin(g.time * 4);
				union(c, bodies, -90, "#5cb4b4");
			}
			c.restore();
		}
		for (const h of g.iceHoles || []) {
			if (!inView(h, view, h.r)) continue;
			const fade = Math.max(0, Math.min(1, (h.until - g.time) / 10)),
				rand = seeded(Math.round(h.x * 7 + h.y)),
				pts = Array.from({ length: 14 }, (_, k) => {
					const a = (k / 14) * TAU,
						r = h.r * (0.8 + rand() * 0.3);
					return [h.x + Math.cos(a) * r, h.y + Math.sin(a) * r * 0.85];
				});
			c.save();
			c.globalAlpha = fade;
			poly(c, pts, "#f2fafc");
			poly(c, pts.map(([x, y]) => [h.x + (x - h.x) * 0.85, h.y + (y - h.y) * 0.85]), "#1d4a60");
			poly(c, pts.map(([x, y]) => [h.x + (x - h.x) * 0.6, h.y + (y - h.y) * 0.6]), "#163a4e");
			c.strokeStyle = "#ffffffaa";
			c.lineWidth = 1.5;
			for (let k = 0; k < 6; k++) {
				const a = rand() * TAU;
				c.beginPath();
				c.moveTo(h.x + Math.cos(a) * h.r * 0.9, h.y + Math.sin(a) * h.r * 0.8);
				c.lineTo(h.x + Math.cos(a) * h.r * 1.5, h.y + Math.sin(a) * h.r * 1.3);
				c.stroke();
			}
			c.restore();
		}
	}
	// Animated, unlit: glints drifting over the sea, sparkles over the crystal fields.
	function effects(c, g, view) {
		changing(c, g, view);
		const t = theme(g),
			time = g.time;
		if (!OURS.includes(t)) return;
		c.save();
		if (t === "ocean") {
			const rand = seeded(47);
			for (const w of sea(g)) {
				if (!inView(w, view, w.rx)) continue;
				for (let k = 0; k < 3; k++) {
					const a = rand() * TAU,
						d = 0.2 + rand() * 0.5,
						x = w.x + Math.cos(a) * w.rx * d + Math.sin(time * 0.4 + k) * 20,
						y = w.y + Math.sin(a) * w.ry * d,
						pulse = 0.5 + 0.5 * Math.sin(time * 1.3 + k * 2 + w.x);
					c.strokeStyle = `rgba(230,250,250,${0.12 + pulse * 0.16})`;
					c.lineWidth = 2;
					c.beginPath();
					c.moveTo(x - 24, y);
					c.quadraticCurveTo(x, y - 5, x + 24, y);
					c.stroke();
				}
			}
		}
		if (t === "crystal") {
			for (const o of g.obstacles) {
				if (o.kind !== "crystal" || !inView(o, view, 100)) continue;
				for (let k = 0; k < 3; k++) {
					const p = (time * 0.5 + k / 3 + o.x * 0.001) % 1,
						x = o.x + ((k * 37 + o.y) % o.w),
						y = o.y + ((k * 53 + o.x) % o.h) - 30,
						a = Math.sin(p * Math.PI);
					c.fillStyle = `rgba(240,252,255,${0.6 * a})`;
					c.beginPath();
					c.arc(x, y, 1.5 + a * 2.5, 0, TAU);
					c.fill();
				}
			}
		}
		c.restore();
	}
	// A comet crossing the field (space): a curved tail of dust and gas behind a blazing head.
	function comet(c, k) {
		const nx = -k.dy,
			ny = k.dx,
			len = Math.hypot(k.x - k.tail.x, k.y - k.tail.y);
		const gr = c.createLinearGradient(k.x, k.y, k.tail.x, k.tail.y);
		gr.addColorStop(0, "rgba(220,244,255,.75)");
		gr.addColorStop(0.4, "rgba(140,200,255,.35)");
		gr.addColorStop(1, "rgba(120,160,255,0)");
		c.fillStyle = gr;
		c.beginPath();
		c.moveTo(k.x + nx * 14, k.y + ny * 14);
		c.quadraticCurveTo(k.x - k.dx * len * 0.5 + nx * 70, k.y - k.dy * len * 0.5 + ny * 70, k.tail.x + nx * 90, k.tail.y + ny * 90);
		c.lineTo(k.tail.x - nx * 60, k.tail.y - ny * 60);
		c.quadraticCurveTo(k.x - k.dx * len * 0.5 - nx * 30, k.y - k.dy * len * 0.5 - ny * 30, k.x - nx * 14, k.y - ny * 14);
		c.closePath();
		c.fill();
		const head = c.createRadialGradient(k.x, k.y, 0, k.x, k.y, 70);
		head.addColorStop(0, "rgba(255,255,255,1)");
		head.addColorStop(0.25, "rgba(200,236,255,.8)");
		head.addColorStop(1, "rgba(120,180,255,0)");
		c.fillStyle = head;
		c.fillRect(k.x - 70, k.y - 70, 140, 140);
	}
	// Emissive, after night lighting: the crystal pillars glow, more at night; comets blaze.
	function glow(c, g, view) {
		const night = g.night || 0;
		c.save();
		c.globalCompositeOperation = "lighter";
		for (const k of g.comets?.() || []) if (inView(k, view, 700)) comet(c, k);
		for (const o of g.obstacles) {
			if (o.kind !== "crystal" || !inView(o, view)) continue;
			const cx = o.x + o.w / 2,
				cy = o.y + o.h / 2 - 30,
				r = Math.max(o.w, o.h) * 0.9,
				p = 0.5 + 0.5 * Math.sin(g.time * 0.8 + o.x),
				gr = c.createRadialGradient(cx, cy, 0, cx, cy, r);
			gr.addColorStop(0, `rgba(140,220,255,${0.05 + 0.03 * p + night * 0.25})`);
			gr.addColorStop(1, "rgba(140,220,255,0)");
			c.fillStyle = gr;
			c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
		}
		c.restore();
	}
	MapArt.extend({
		terrain,
		effects,
		glow,
		baseColor: (g) => BASE[theme(g)] || null,
		color: (kind) => COLORS[kind] || null,
	});
})();
