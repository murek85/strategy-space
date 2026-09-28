/* Themed scenario maps: glowing rivers, chasms, lava, giant trees, mesas, a crashed cruiser, floating islands and a second sun. */
const MapArt = (() => {
	const TAU = Math.PI * 2;
	const theme = (g) => RTS.MISSIONS[g.missionId]?.theme || null;
	const seeded = (seed) => () =>
		(seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
	const poly = (c, pts, fill) => {
		c.beginPath();
		pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.closePath();
		if (fill) {
			c.fillStyle = fill;
			c.fill();
		}
	};
	// Same outline as the collision test (RTS.waterContains), added as a sub-path so chains fill as one shape.
	function shape(c, w, pad = 0, dx = 0, dy = 0) {
		for (let i = 0; i <= 72; i++) {
			const a = (i * TAU) / 72,
				r = RTS.waterRadius(w, a),
				x = w.x + dx + Math.cos(a) * (w.rx + pad) * r,
				y = w.y + dy + Math.sin(a) * (w.ry + pad) * r;
			if (i === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.closePath();
	}
	function union(c, list, pad, fill, dx = 0, dy = 0) {
		if (!list.length) return;
		c.beginPath();
		for (const w of list) shape(c, w, pad, dx, dy);
		c.fillStyle = fill;
		c.fill();
	}
	const inView = (p, view, m = 250) =>
		!view ||
		(Math.abs(p.x - view.x) < view.w / 2 + m &&
			Math.abs(p.y - view.y) < view.h / 2 + m);
	const COLORS = {
		glow: "#3fb7c7",
		chasm: "#0b0f18",
		lava: "#e0612e",
		grove: "#2f5a3e",
		spire: "#3a3440",
		mesa: "#9a7048",
		wreck: "#5b6368",
		debris: "#5b6368",
	};
	const BASE = {
		lumen: "#15291f",
		skyfall: "#3a4642",
		twinsun: "#9a7a4c",
		magma: "#221716",
	};
	function baseColor(g) {
		return BASE[theme(g)] || null;
	}
	function color(kind) {
		return COLORS[kind] || null;
	}

	function ground(c, g, rand, t) {
		const area = (g.W * g.H) / (3360 * 2160);
		if (t === "lumen") {
			for (let i = 0; i < 320 * area; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					r = 50 + rand() * 140,
					gr = c.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(
					0,
					["#2e6b4466", "#1f5a4d55", "#3a2f5a40"][i % 3],
				);
				gr.addColorStop(1, "#15291f00");
				c.fillStyle = gr;
				c.fillRect(x - r, y - r, 2 * r, 2 * r);
			}
			c.strokeStyle = "#3f8a5a88";
			c.lineWidth = 2;
			for (let i = 0; i < 900 * area; i++) {
				const x = rand() * g.W,
					y = rand() * g.H;
				if (g.blocked(x, y, 6)) continue;
				for (let k = -1; k <= 1; k++) {
					c.beginPath();
					c.moveTo(x, y);
					c.quadraticCurveTo(
						x + k * 6,
						y - 8,
						x + k * 10,
						y - 14 - rand() * 6,
					);
					c.stroke();
				}
			}
		}
		if (t === "skyfall") {
			for (let i = 0; i < 170 * area; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					w = 30 + rand() * 90;
				c.fillStyle = i % 3 ? "#5a6a5a38" : "#7f8f7a30";
				c.beginPath();
				c.ellipse(x, y, w, w * 0.45, rand() * 3, 0, TAU);
				c.fill();
			}
			c.strokeStyle = "#8fb07a99";
			c.lineWidth = 1.8;
			for (let i = 0; i < 1300 * area; i++) {
				const x = rand() * g.W,
					y = rand() * g.H;
				if (g.blocked(x, y, 6)) continue;
				for (let k = -1; k <= 1; k++) {
					c.beginPath();
					c.moveTo(x, y);
					c.lineTo(x + k * 5, y - 9 - rand() * 6);
					c.stroke();
				}
			}
		}
		if (t === "twinsun") {
			for (let i = 0; i < 90 * area; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					r = 120 + rand() * 220,
					gr = c.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, i % 2 ? "#c9a4663a" : "#6d4f2a2a");
				gr.addColorStop(1, "#9a7a4c00");
				c.fillStyle = gr;
				c.fillRect(x - r, y - r, 2 * r, 2 * r);
			}
			c.lineWidth = 2;
			for (let i = 0; i < 620 * area; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					w = 40 + rand() * 90;
				c.strokeStyle = i % 2 ? "#e2c28a40" : "#5a452a30";
				c.beginPath();
				c.moveTo(x - w, y);
				c.quadraticCurveTo(x, y - 10 - rand() * 8, x + w, y + 3);
				c.stroke();
			}
			for (let i = 0; i < 260 * area; i++) {
				const x = rand() * g.W,
					y = rand() * g.H;
				if (g.blocked(x, y, 6)) continue;
				c.fillStyle = i % 3 ? "#6b5a44" : "#4e4336";
				c.beginPath();
				c.ellipse(x, y, 2 + rand() * 4, 1.5 + rand() * 2, 0, 0, TAU);
				c.fill();
			}
		}
		if (t === "magma") {
			for (let i = 0; i < 120 * area; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					r = 60 + rand() * 160,
					gr = c.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, i % 3 ? "#0d09094d" : "#3b1c1330");
				gr.addColorStop(1, "#22171600");
				c.fillStyle = gr;
				c.fillRect(x - r, y - r, 2 * r, 2 * r);
			}
			for (let i = 0; i < 320 * area; i++) {
				let x = rand() * g.W,
					y = rand() * g.H;
				const hot = i % 4 === 0;
				c.strokeStyle = hot ? "#e0571e70" : "#0a0606bb";
				c.lineWidth = hot ? 2.2 : 2;
				c.beginPath();
				c.moveTo(x, y);
				for (let k = 0; k < 4; k++) {
					x += (rand() - 0.5) * 60;
					y += (rand() - 0.5) * 60;
					c.lineTo(x, y);
				}
				c.stroke();
			}
			for (let i = 0; i < 500 * area; i++) {
				const x = rand() * g.W,
					y = rand() * g.H;
				if (g.blocked(x, y, 6)) continue;
				c.fillStyle = i % 4 ? "#141012" : "#2a2230";
				poly(c, [
					[x - 4, y + 2],
					[x - 1, y - 4],
					[x + 4, y - 1],
					[x + 2, y + 3],
				]);
				c.fill();
			}
		}
	}
	function waters(c, g) {
		const by = (k) => (g.waters || []).filter((w) => w.kind === k);
		const glow = by("glow"),
			chasm = by("chasm"),
			lava = by("lava"),
			rand = seeded(77);
		// Banks first, then the surface: overlapping links read as one river.
		union(c, glow, 26, "#0f2a2466");
		union(c, glow, 12, "#2a5a3c");
		union(c, glow, 0, "#0f3a4a");
		union(c, glow, -18, "#16606e");
		union(c, glow, -40, "#1f8a93aa");
		union(c, chasm, 30, "#b8c2bf1c");
		union(c, chasm, 16, "#6d7a7d");
		union(c, chasm, 8, "#4a555a");
		union(c, chasm, 2, "#262e35");
		union(c, chasm, -12, "#10161d");
		union(c, chasm, -30, "#070a10");
		union(c, chasm, -52, "#020306");
		union(c, chasm, 18, "#e1ece822", -3, -5);
		union(c, lava, 24, "#1a0f0c99");
		union(c, lava, 10, "#2d1612");
		union(c, lava, 0, "#7a1c0c");
		union(c, lava, -10, "#c23a14");
		union(c, lava, -26, "#e8641f");
		union(c, lava, -44, "#ffb347");
		for (const w of lava) {
			for (let k = 0; k < 3; k++) {
				const a = rand() * TAU,
					d = rand() * 0.5,
					x = w.x + Math.cos(a) * w.rx * d,
					y = w.y + Math.sin(a) * w.ry * d,
					s = 10 + rand() * 16,
					pts = Array.from({ length: 7 }, (_, j) => {
						const b = (j * TAU) / 7 + rand() * 0.4,
							r = s * (0.6 + rand() * 0.5);
						return [x + Math.cos(b) * r, y + Math.sin(b) * r * 0.7];
					});
				poly(c, pts, "#3a160ecc");
				c.strokeStyle = "#ff9a3a88";
				c.lineWidth = 1.2;
				c.stroke();
			}
			c.strokeStyle = "#fff0a066";
			c.lineWidth = 2;
			c.beginPath();
			c.moveTo(w.x - w.rx * 0.4, w.y + rand() * 10 - 5);
			c.quadraticCurveTo(
				w.x,
				w.y - w.ry * 0.3,
				w.x + w.rx * 0.4,
				w.y + rand() * 10 - 5,
			);
			c.stroke();
		}
	}
	function tree(c, o, rand) {
		const cx = o.x + o.w / 2,
			cy = o.y + o.h / 2,
			r = Math.max(o.w, o.h) * 0.72;
		c.fillStyle = "#050d0a77";
		c.beginPath();
		c.ellipse(cx + 30, cy + 36, r * 1.1, r * 0.62, -0.2, 0, TAU);
		c.fill();
		c.strokeStyle = "#3d2f2a";
		c.lineWidth = 8;
		for (let k = 0; k < 7; k++) {
			const a = (k * TAU) / 7 + rand();
			c.beginPath();
			c.moveTo(cx, cy);
			c.quadraticCurveTo(
				cx + Math.cos(a) * r * 0.5,
				cy + Math.sin(a) * r * 0.5 + 8,
				cx + Math.cos(a) * r * 1.02,
				cy + Math.sin(a) * r * 0.82 + 10,
			);
			c.stroke();
		}
		c.fillStyle = "#4a3a32";
		c.beginPath();
		c.ellipse(cx, cy + 4, r * 0.26, r * 0.18, 0, 0, TAU);
		c.fill();
		for (const [k, col] of [
			[1, "#12352c"],
			[0.84, "#1a4a3c"],
			[0.66, "#23604c"],
			[0.46, "#2e7760"],
			[0.26, "#3d8f73"],
		]) {
			c.fillStyle = col;
			c.beginPath();
			for (let j = 0; j < 8; j++) {
				const a = (j * TAU) / 8 + k * 2,
					rr = r * k * (0.8 + rand() * 0.3),
					x = cx + Math.cos(a) * rr * 0.38,
					y = cy + Math.sin(a) * rr * 0.3 - r * 0.2;
				c.moveTo(x + r * k * 0.46, y);
				c.arc(x, y, r * k * 0.46, 0, TAU);
			}
			c.fill();
		}
		for (let j = 0; j < 22; j++) {
			const a = rand() * TAU,
				d = rand() * r * 0.85;
			c.fillStyle = j % 3 ? "#6ff2e0cc" : "#c68cffbb";
			c.beginPath();
			c.arc(
				cx + Math.cos(a) * d,
				cy + Math.sin(a) * d * 0.8 - r * 0.2,
				1.5 + rand() * 2.5,
				0,
				TAU,
			);
			c.fill();
		}
		c.lineWidth = 1.5;
		for (let j = 0; j < 9; j++) {
			const x = cx + (rand() - 0.5) * r * 1.5,
				y = cy + (rand() - 0.2) * r * 0.5;
			c.strokeStyle = j % 2 ? "#6ff2e066" : "#4fbf9a55";
			c.beginPath();
			c.moveTo(x, y);
			c.quadraticCurveTo(x + 4, y + 20, x - 2, y + 36 + rand() * 24);
			c.stroke();
			c.fillStyle = "#9ffff0aa";
			c.beginPath();
			c.arc(x - 2, y + 38 + rand() * 20, 1.6, 0, TAU);
			c.fill();
		}
	}
	function spire(c, o, rand, t) {
		const cx = o.x + o.w / 2,
			base = o.y + o.h,
			top = o.y - o.h * 0.9,
			hw = o.w / 2,
			obs = t === "magma";
		c.fillStyle = "#05040566";
		c.beginPath();
		c.ellipse(cx + 30, base + 6, hw * 1.6, hw * 0.55, -0.2, 0, TAU);
		c.fill();
		const main = [
			[cx - hw, base],
			[cx - hw * 0.7, o.y + o.h * 0.45],
			[cx - hw * 0.45, o.y + o.h * 0.1],
			[cx - hw * 0.15, top],
			[cx + hw * 0.2, o.y + o.h * 0.05],
			[cx + hw * 0.5, o.y + o.h * 0.5],
			[cx + hw, base],
		];
		poly(c, main, obs ? "#15121a" : "#5d6760");
		poly(
			c,
			[
				[cx - hw * 0.7, o.y + o.h * 0.45],
				[cx - hw * 0.45, o.y + o.h * 0.1],
				[cx - hw * 0.15, top],
				[cx - hw * 0.05, base],
				[cx - hw, base],
			],
			obs ? "#2e2740" : "#89938a",
		);
		c.strokeStyle = obs ? "#a58cff77" : "#c4cec955";
		c.lineWidth = 2;
		c.beginPath();
		c.moveTo(cx - hw * 0.15, top);
		c.lineTo(cx - hw * 0.05, base - 4);
		c.stroke();
		if (obs) {
			c.strokeStyle = "#ff7a3070";
			c.lineWidth = 1.8;
			c.beginPath();
			c.moveTo(cx - hw * 0.8, base);
			c.lineTo(cx - hw * 0.45, base - o.h * 0.5);
			c.lineTo(cx - hw * 0.3, base - o.h * 0.7);
			c.stroke();
		} else {
			c.fillStyle = "#7c9a5e";
			c.beginPath();
			c.ellipse(cx - hw * 0.1, top + 8, hw * 0.4, 6, 0, 0, TAU);
			c.fill();
			c.strokeStyle = "#6c8a5088";
			c.lineWidth = 1.5;
			for (let k = 0; k < 3; k++) {
				const x = cx - hw * 0.3 + k * hw * 0.2;
				c.beginPath();
				c.moveTo(x, top + 10);
				c.quadraticCurveTo(
					x + 3,
					top + 30,
					x - 1,
					top + 44 + rand() * 18,
				);
				c.stroke();
			}
		}
	}
	function mesa(c, o, rand) {
		const cx = o.x + o.w / 2,
			cy = o.y + o.h / 2,
			n = 18,
			outline = [],
			top = [];
		for (let k = 0; k < n; k++) {
			const a = (k * TAU) / n,
				sx = Math.cos(a),
				sy = Math.sin(a),
				edge =
					1 /
					Math.max(
						Math.abs(sx) / (o.w / 2),
						Math.abs(sy) / (o.h / 2),
					),
				j = 0.9 + rand() * 0.18;
			outline.push([cx + sx * edge * j, cy + sy * edge * j + 8]);
			top.push([
				cx + sx * edge * j * 0.86,
				cy + sy * edge * j * 0.84 - 6,
			]);
		}
		c.fillStyle = "#3a2a1a55";
		c.beginPath();
		c.ellipse(cx + 46, cy + 44, o.w * 0.6, o.h * 0.58, -0.15, 0, TAU);
		c.fill();
		poly(
			c,
			outline.map(([x, y]) => [x + 6, y + 16]),
			"#5b3d24",
		);
		poly(c, outline, "#8e6440");
		poly(c, top, "#c29460");
		c.strokeStyle = "#6d4a2caa";
		c.lineWidth = 2;
		for (let k = 0; k < n; k++) {
			const [x, y] = outline[k];
			if (y < cy) continue;
			c.beginPath();
			c.moveTo(x, y);
			c.lineTo(x + (rand() - 0.5) * 8, y + 14);
			c.stroke();
		}
		c.strokeStyle = "#e0b67e77";
		c.lineWidth = 1.5;
		for (let k = 0; k < 7; k++) {
			const x = cx + (rand() - 0.5) * o.w * 0.6,
				y = cy + (rand() - 0.5) * o.h * 0.55;
			c.beginPath();
			c.moveTo(x - 22, y);
			c.quadraticCurveTo(x, y - 7, x + 24, y + 2);
			c.stroke();
		}
		c.fillStyle = "#a57a4c";
		for (let k = 0; k < 4; k++) {
			const x = cx + (rand() - 0.5) * o.w * 0.5,
				y = cy + (rand() - 0.5) * o.h * 0.45;
			c.beginPath();
			c.ellipse(x, y, 10 + rand() * 14, 5 + rand() * 5, 0, 0, TAU);
			c.fill();
		}
	}
	// The wreck sections form one cruiser: nose on the left, bridge in the middle, engines on the right.
	function wreck(c, g, rand) {
		const parts = g.obstacles
			.filter((o) => o.kind === "wreck")
			.sort((a, b) => a.x - b.x);
		if (!parts.length) return;
		const first = parts[0],
			last = parts.at(-1),
			cy = parts.reduce((n, o) => n + o.y + o.h / 2, 0) / parts.length;
		c.fillStyle = "#4a3a2455";
		c.beginPath();
		c.ellipse(
			(first.x + last.x + last.w) / 2 + 30,
			cy + 60,
			(last.x + last.w - first.x) * 0.58,
			70,
			0,
			0,
			TAU,
		);
		c.fill();
		for (let i = 0; i < parts.length - 1; i++) {
			const a = parts[i],
				b = parts[i + 1],
				gx = (a.x + a.w + b.x) / 2;
			for (let k = 0; k < 7; k++) {
				const x = gx + (rand() - 0.5) * (b.x - a.x - a.w) * 0.9,
					y = cy + (rand() - 0.5) * 120,
					s = 5 + rand() * 9;
				poly(
					c,
					[
						[x - s, y],
						[x, y - s * 0.6],
						[x + s, y + s * 0.2],
						[x, y + s * 0.5],
					],
					k % 2 ? "#6b7479" : "#434a4f",
				);
			}
		}
		parts.forEach((o, i) => {
			const nose = i === 0,
				tail = i === parts.length - 1,
				x0 = o.x + (nose ? -70 : 0),
				x1 = o.x + o.w + (tail ? 20 : 0),
				t = o.y,
				b = o.y + o.h,
				m = o.y + o.h / 2;
			const hull = nose
				? [
						[x0, m],
						[o.x + 40, t],
						[x1, t + 6],
						[x1, b - 6],
						[o.x + 40, b],
					]
				: [
						[x0 + 10, t + 10],
						[x0 + 22, t],
						[x1 - (tail ? 0 : 14), t + 4],
						[x1, m - o.h * 0.25],
						[x1, m + o.h * 0.25],
						[x1 - (tail ? 0 : 14), b - 4],
						[x0 + 22, b],
						[x0 + 10, b - 12],
						[x0 + 2, m + 8],
						[x0 + 12, m - 6],
					];
			poly(c, hull, "#4b5358");
			poly(
				c,
				hull.map(([x, y]) => [x, y < m ? y + 8 : m - 2]),
				"#8d959a",
			);
			c.strokeStyle = "#5f676c";
			c.lineWidth = 2;
			for (let y = t + 16; y < m - 6; y += 12) {
				c.beginPath();
				c.moveTo(Math.max(x0 + 30, o.x + 8), y);
				c.lineTo(x1 - 18, y);
				c.stroke();
			}
			c.strokeStyle = "#3b4247";
			for (let x = o.x + 20; x < x1 - 10; x += 34) {
				c.beginPath();
				c.moveTo(x, t + 10);
				c.lineTo(x, b - 8);
				c.stroke();
			}
			for (let k = 0; k < 5; k++) {
				c.fillStyle = "#b3bbbf";
				c.fillRect(
					o.x + 14 + rand() * (o.w - 30),
					t + 14 + rand() * (o.h * 0.3),
					8 + rand() * 14,
					3,
				);
			}
			if (!nose && !tail) {
				poly(
					c,
					[
						[o.x + o.w * 0.3, t + 4],
						[o.x + o.w * 0.34, t - 38],
						[o.x + o.w * 0.66, t - 38],
						[o.x + o.w * 0.7, t + 4],
					],
					"#6e777c",
				);
				c.fillStyle = "#9edcff88";
				for (let k = 0; k < 5; k++)
					c.fillRect(
						o.x + o.w * 0.36 + k * o.w * 0.058,
						t - 30,
						o.w * 0.035,
						7,
					);
				c.fillStyle = "#565e63";
				c.beginPath();
				c.arc(o.x + o.w * 0.5, t - 40, 12, Math.PI, 0);
				c.fill();
			}
			for (let k = 0; k < 2; k++) {
				const tx = o.x + o.w * (0.25 + k * 0.5),
					ty = m + o.h * 0.18;
				c.fillStyle = "#394045";
				c.beginPath();
				c.arc(tx, ty, 9, 0, TAU);
				c.fill();
				c.strokeStyle = "#23282c";
				c.lineWidth = 4;
				c.beginPath();
				c.moveTo(tx, ty);
				c.lineTo(tx - 22, ty - 6);
				c.stroke();
			}
			if (tail)
				for (let k = 0; k < 3; k++) {
					const ey = t + o.h * (0.22 + k * 0.28);
					c.fillStyle = "#262b2e";
					c.beginPath();
					c.ellipse(x1 + 10, ey, 14, 17, 0, 0, TAU);
					c.fill();
					c.fillStyle = "#4a2c1c";
					c.beginPath();
					c.ellipse(x1 + 12, ey, 8, 10, 0, 0, TAU);
					c.fill();
				}
			if (!nose)
				poly(
					c,
					[
						[o.x, t + 8],
						[o.x + 16, t + 20],
						[o.x + 6, m - 4],
						[o.x + 18, m + 10],
						[o.x + 4, b - 10],
						[o.x - 6, m],
					],
					"#2c3236",
				);
			if (!tail)
				poly(
					c,
					[
						[o.x + o.w, t + 8],
						[o.x + o.w - 14, t + 26],
						[o.x + o.w - 4, m],
						[o.x + o.w - 16, b - 16],
						[o.x + o.w, b - 6],
					],
					"#2c3236",
				);
			c.fillStyle = "#1a1d1f66";
			c.beginPath();
			c.ellipse(
				o.x + o.w * (0.4 + rand() * 0.3),
				m + 6,
				o.w * 0.14,
				o.h * 0.2,
				0.4,
				0,
				TAU,
			);
			c.fill();
			c.fillStyle = "#c9a86ad0";
			c.beginPath();
			c.moveTo(x0 + 10, b + 6);
			c.quadraticCurveTo(
				o.x + o.w * 0.35,
				b - 24,
				o.x + o.w * 0.75,
				b + 8,
			);
			c.closePath();
			c.fill();
		});
		for (const o of g.obstacles.filter((o) => o.kind === "debris")) {
			const cx = o.x + o.w / 2,
				cy2 = o.y + o.h / 2;
			poly(
				c,
				[
					[o.x, cy2],
					[o.x + o.w * 0.3, o.y],
					[o.x + o.w, o.y + o.h * 0.3],
					[o.x + o.w * 0.8, o.y + o.h],
					[o.x + o.w * 0.2, o.y + o.h],
				],
				"#565e63",
			);
			poly(
				c,
				[
					[o.x + o.w * 0.3, o.y],
					[o.x + o.w, o.y + o.h * 0.3],
					[cx, cy2],
				],
				"#8d959a",
			);
			c.fillStyle = "#c9a86ab0";
			c.beginPath();
			c.ellipse(cx, o.y + o.h, o.w * 0.6, 8, 0, 0, TAU);
			c.fill();
		}
	}
	function obstacles(c, g, t) {
		const rand = seeded(313);
		for (const o of g.obstacles) {
			if (o.kind === "grove") tree(c, o, rand);
			else if (o.kind === "spire") spire(c, o, rand, t);
			else if (o.kind === "mesa") mesa(c, o, rand);
		}
		wreck(c, g, rand);
	}
	// Static layer baked into the terrain texture.
	function terrain(c, g) {
		const t = theme(g);
		if (
			!t &&
			!(g.waters || []).some((w) => w.kind) &&
			!g.obstacles.some((o) => o.kind)
		)
			return;
		if (t) ground(c, g, seeded(4242), t);
		waters(c, g);
		obstacles(c, g, t);
	}
	// Animated, unlit effects under units: drifting mist over chasms.
	function effects(c, g, view) {
		if (theme(g) !== "skyfall") return;
		// Chain links overlap heavily, so every third one is enough for the mist.
		c.save();
		for (const [i, w] of (g.waters || [])
			.filter((w) => w.kind === "chasm")
			.entries()) {
			if (i % 3 || !inView(w, view)) continue;
			const off = Math.sin(g.time * 0.25 + w.x * 0.01) * 30,
				gr = c.createRadialGradient(
					w.x + off,
					w.y,
					0,
					w.x + off,
					w.y,
					w.rx * 1.3,
				);
			gr.addColorStop(0, "rgba(210,225,235,.14)");
			gr.addColorStop(1, "rgba(210,225,235,0)");
			c.fillStyle = gr;
			c.fillRect(
				w.x + off - w.rx * 1.3,
				w.y - w.rx * 1.3,
				w.rx * 2.6,
				w.rx * 2.6,
			);
		}
		c.restore();
	}
	// Emissive layer drawn after night lighting: bioluminescence, glowing water, lava and embers stay bright.
	function glow(c, g, view) {
		const t = theme(g),
			time = g.time,
			night = g.night || 0;
		if (t !== "lumen" && t !== "magma") return;
		c.save();
		c.globalCompositeOperation = "lighter";
		for (const [i, w] of (g.waters || []).entries()) {
			// Thin out narrow chain links only; standalone pools and the caldera always glow.
			if ((i % 2 && w.rx < 140) || !inView(w, view)) continue;
			if (w.kind === "lava") {
				const p = 0.5 + 0.5 * Math.sin(time * 1.7 + w.x * 0.01),
					r = Math.max(w.rx, w.ry) * 1.6,
					gr = c.createRadialGradient(w.x, w.y, 0, w.x, w.y, r);
				gr.addColorStop(
					0,
					`rgba(255,110,40,${0.1 + 0.08 * p + night * 0.25})`,
				);
				gr.addColorStop(1, "rgba(255,90,30,0)");
				c.fillStyle = gr;
				c.fillRect(w.x - r, w.y - r, 2 * r, 2 * r);
			}
			if (w.kind === "glow") {
				const p = 0.5 + 0.5 * Math.sin(time * 1.2 + w.y * 0.01),
					r = Math.max(w.rx, w.ry) * 1.3,
					gr = c.createRadialGradient(w.x, w.y, 0, w.x, w.y, r);
				gr.addColorStop(
					0,
					`rgba(70,230,215,${0.03 + 0.03 * p + night * 0.3})`,
				);
				gr.addColorStop(1, "rgba(70,230,215,0)");
				c.fillStyle = gr;
				c.fillRect(w.x - r, w.y - r, 2 * r, 2 * r);
			}
		}
		if (t === "lumen") {
			for (const o of g.obstacles) {
				if (o.kind !== "grove" || !inView(o, view)) continue;
				const cx = o.x + o.w / 2,
					cy = o.y + o.h / 2 - o.h * 0.2,
					r = Math.max(o.w, o.h) * 0.9,
					p = 0.5 + 0.5 * Math.sin(time * 0.9 + o.x),
					gr = c.createRadialGradient(cx, cy, 0, cx, cy, r);
				gr.addColorStop(
					0,
					`rgba(90,240,210,${night * (0.22 + 0.1 * p)})`,
				);
				gr.addColorStop(1, "rgba(90,240,210,0)");
				c.fillStyle = gr;
				c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
			}
			for (const [i, { x, y, ph }] of specks(g).entries()) {
				if (!inView({ x, y }, view, 30)) continue;
				const a =
					(0.06 + 0.75 * night) *
					(0.5 + 0.5 * Math.sin(time * 1.5 + ph));
				c.fillStyle =
					i % 3 ? `rgba(110,242,224,${a})` : `rgba(198,140,255,${a})`;
				c.beginPath();
				c.arc(x, y, 1.6 + (i % 3), 0, TAU);
				c.fill();
			}
		}
		if (t === "magma") {
			const lava = (g.waters || []).filter((w) => w.kind === "lava"),
				rand = seeded(515);
			for (let i = 0; i < 140 && lava.length; i++) {
				const s = lava[i % lava.length];
				// Draw the random numbers before culling, so every spark keeps its place when the camera moves.
				const start = rand(),
					dx = rand() - 0.5,
					dy = rand() - 0.5,
					heat = rand();
				if (!inView(s, view)) continue;
				const life = (time * 0.35 + start) % 1,
					x = s.x + dx * s.rx * 1.6 + Math.sin(time + i) * 6,
					y = s.y + dy * s.ry - life * 130;
				c.fillStyle = `rgba(255,${150 + Math.round(heat * 80)},60,${(1 - life) * 0.75})`;
				c.fillRect(x, y, 2.5, 2.5);
			}
		}
		c.restore();
	}
	// Firefly positions depend only on the map, so they are computed once per game.
	const speckCache = new WeakMap();
	function specks(g) {
		const key =
			g.W +
			"x" +
			g.H +
			":" +
			g.obstacles.length +
			":" +
			(g.waters || []).length;
		let hit = speckCache.get(g);
		if (hit?.key === key) return hit.list;
		const rand = seeded(909),
			n = Math.round((520 * g.W * g.H) / (3360 * 2160)),
			list = [];
		for (let i = 0; i < n; i++) {
			const x = rand() * g.W,
				y = rand() * g.H,
				ph = rand() * TAU;
			if (!g.blocked(x, y, 4)) list.push({ x, y, ph });
		}
		speckCache.set(g, { key, list });
		return list;
	}
	// Floating islands hang over impassable ground only, so they never hide units on foot.
	function islands(g) {
		const t = theme(g);
		if (t !== "lumen" && t !== "skyfall") return [];
		const kind = t === "lumen" ? "glow" : "chasm",
			spacing = t === "lumen" ? 650 : 520,
			picked = [];
		for (const w of (g.waters || []).filter(
			(w) => w.kind === kind && w.rx < 140,
		))
			if (picked.every((p) => Math.hypot(p.x - w.x, p.y - w.y) > spacing))
				picked.push(w);
		return picked
			.slice(1, t === "lumen" ? 5 : 9)
			.map((w, i) => ({
				x: w.x,
				y: w.y,
				size:
					Math.min(w.rx, w.ry) *
					(t === "skyfall"
						? 0.8 + (i % 3) * 0.18
						: 0.7 + (i % 2) * 0.15),
				seed: i,
			}));
	}
	function sky(c, g, view) {
		const t = theme(g);
		if (t !== "lumen" && t !== "skyfall") return;
		for (const s of islands(g)) {
			if (!inView(s, view, 300)) continue;
			island(c, s, t, g.time);
		}
	}
	// One floating island s (from islands()) of theme t, bobbing with time, with its shadow below
	// (shadow = false leaves the shadow out, for renderers that keep it still while the island moves).
	function island(c, s, t, time, shadow = true) {
		const bob = Math.sin(time * 0.6 + s.seed) * 6,
			x = s.x + (s.seed % 2 ? 18 : -12),
			y = s.y - 100 + bob,
			r = s.size,
			rand = seeded(900 + s.seed),
			depth = r * (1.3 + rand() * 0.5);
		const rock =
			t === "lumen"
				? ["#3b3440", "#2b2530", "#4a4150"]
				: ["#626a6e", "#474e52", "#7a8286"];
		c.save();
		if (shadow) {
			c.fillStyle = "#00000030";
			c.beginPath();
			c.ellipse(s.x + 30, s.y + 30, r * 0.9, r * 0.38, 0, 0, TAU);
			c.fill();
		}
		const under = [[x - r, y]];
		for (let k = 1; k < 8; k++) {
			const f = k / 8,
				px = x - r + f * 2 * r,
				py =
					y +
					depth * Math.sin(f * Math.PI) * (0.75 + rand() * 0.35);
			under.push([px, py]);
		}
		under.push([x + r, y]);
		under.splice(4, 0, [
			x + (rand() - 0.5) * r * 0.2,
			y + depth * 1.15,
		]);
		poly(c, under, rock[0]);
		poly(c, under.slice(0, 5).concat([[x, y]]), rock[2]);
		c.strokeStyle = rock[1];
		c.lineWidth = 2;
		for (let k = 1; k < 4; k++) {
			c.beginPath();
			c.moveTo(x - r * (1 - k * 0.18), y + depth * k * 0.18);
			c.lineTo(x + r * (1 - k * 0.2), y + depth * k * 0.17);
			c.stroke();
		}
		c.fillStyle = t === "lumen" ? "#23604c" : "#6f8a5a";
		c.beginPath();
		c.ellipse(x, y, r * 1.02, r * 0.34, 0, 0, TAU);
		c.fill();
		c.fillStyle = t === "lumen" ? "#2e7760" : "#88a66e";
		c.beginPath();
		c.ellipse(x - r * 0.12, y - 3, r * 0.76, r * 0.22, 0, 0, TAU);
		c.fill();
		for (let k = 0; k < 4; k++) {
			const tx = x + (rand() - 0.5) * r * 1.3,
				tr = 5 + rand() * 9;
			c.fillStyle =
				t === "lumen"
					? k % 2
						? "#1a4a3c"
						: "#2e7760"
					: k % 2
						? "#4c6b44"
						: "#5f8054";
			c.beginPath();
			c.arc(tx, y - tr * 0.8, tr, 0, TAU);
			c.fill();
		}
		c.lineWidth = 1.5;
		for (let k = 0; k < 6; k++) {
			const vx = x + (rand() - 0.5) * r * 1.6;
			c.strokeStyle = t === "lumen" ? "#6ff2e088" : "#9fb58a66";
			c.beginPath();
			c.moveTo(vx, y + 4);
			c.quadraticCurveTo(
				vx + 5,
				y + 24,
				vx - 2,
				y + 36 + rand() * 30,
			);
			c.stroke();
		}
		if (t === "skyfall" && s.seed % 2 === 0) {
			const gr = c.createLinearGradient(0, y, 0, y + 170);
			gr.addColorStop(0, "rgba(225,238,245,.55)");
			gr.addColorStop(1, "rgba(225,238,245,0)");
			c.fillStyle = gr;
			c.fillRect(x + r * 0.35, y + 2, 7, 170);
		}
		c.restore();
	}
	// Screen-space second sun for the twin-sun desert.
	function atmosphere(c, g, width) {
		if (!RTS.MISSIONS[g.missionId]?.twinSun) return;
		const x = width - 215,
			y = 150;
		c.save();
		c.globalAlpha = (1 - g.weather.intensity * 0.8) * (1 - g.night);
		const halo = c.createRadialGradient(x, y, 6, x, y, 80);
		halo.addColorStop(0, "#ffd39aaa");
		halo.addColorStop(0.45, "#ffb46a33");
		halo.addColorStop(1, "#ff9a5000");
		c.fillStyle = halo;
		c.fillRect(x - 80, y - 80, 160, 160);
		c.fillStyle = "#ffd8a0";
		c.beginPath();
		c.arc(x, y, 14, 0, TAU);
		c.fill();
		c.fillStyle = "#fff0d6";
		c.beginPath();
		c.arc(x - 3, y - 3, 9, 0, TAU);
		c.fill();
		c.restore();
	}
	// Extensions (e.g. themed-art.js) add layers for their own themes and terrain kinds.
	const plugins = [];
	const run = (name, ...args) => {
		for (const p of plugins) p[name]?.(...args);
	};
	return {
		terrain(c, g) {
			terrain(c, g);
			run("terrain", c, g);
		},
		effects(c, g, view) {
			effects(c, g, view);
			run("effects", c, g, view);
		},
		glow(c, g, view) {
			glow(c, g, view);
			run("glow", c, g, view);
		},
		sky(c, g, view) {
			sky(c, g, view);
			run("sky", c, g, view);
		},
		// Pieces for renderers that draw the sky themselves (WebGL): the islands one by one, plugin skies.
		islands,
		island,
		skyPlugins(c, g, view) {
			run("sky", c, g, view);
		},
		atmosphere,
		baseColor: (g) =>
			plugins.map((p) => p.baseColor?.(g)).find(Boolean) || baseColor(g),
		color: (kind) =>
			plugins.map((p) => p.color?.(kind)).find(Boolean) || color(kind),
		islands,
		extend: (plugin) => plugins.push(plugin),
		shape,
		union,
		seeded,
		inView,
	};
})();
