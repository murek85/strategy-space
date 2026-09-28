/* Looks for the reworked classic maps: dune seas, golden canyons, a biomechanical derelict and a frozen outpost. Registers into MapArt. */
(() => {
	const TAU = Math.PI * 2;
	const { shape, union, seeded, inView } = MapArt;
	const theme = (g) => RTS.MISSIONS[g.missionId]?.theme || null;
	const OURS = ["dunesea", "goldsand", "derelict", "frozenhive"];
	const BASE = { dunesea: "#a57c4a", goldsand: "#c29a5c", derelict: "#24272a", frozenhive: "#6e8894" };
	const COLORS = {
		dune: "#c49a5e",
		crevasse: "#2c5468",
		outcrop: "#8a5a3a",
		derelict: "#3d3935",
		eggs: "#5c5140",
		resin: "#2b2731",
		processor: "#4a4f55",
		ruin: "#7d8a90",
	};
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
	const blob = (o, rand, jitter = 0.16, n = 16) => {
		const cx = o.x + o.w / 2,
			cy = o.y + o.h / 2,
			pts = [];
		for (let k = 0; k < n; k++) {
			const a = (k * TAU) / n,
				sx = Math.cos(a),
				sy = Math.sin(a),
				edge = 1 / Math.max(Math.abs(sx) / (o.w / 2), Math.abs(sy) / (o.h / 2)),
				j = 1 - jitter / 2 + rand() * jitter;
			pts.push([cx + sx * edge * j, cy + sy * edge * j]);
		}
		return pts;
	};
	const area = (g) => (g.W * g.H) / (3360 * 2160);

	// Ground textures baked once into the terrain canvas.
	function ground(c, g, t, rand) {
		const n = area(g);
		if (t === "dunesea" || t === "goldsand") {
			const light = t === "goldsand" ? "#f1d299" : "#dcb57a",
				dark = t === "goldsand" ? "#8a6a3c" : "#6f5030";
			for (let i = 0; i < 70 * n; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					r = 160 + rand() * 260,
					gr = c.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, i % 2 ? light + "30" : dark + "26");
				gr.addColorStop(1, dark + "00");
				c.fillStyle = gr;
				c.fillRect(x - r, y - r, 2 * r, 2 * r);
			}
			// Long wind-swept dune waves: a lit face and a shadowed trough.
			for (let i = 0; i < 260 * n; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					w = 120 + rand() * 220,
					bend = 18 + rand() * 26;
				c.lineWidth = 6 + rand() * 6;
				c.strokeStyle = dark + "26";
				c.beginPath();
				c.moveTo(x - w, y + 6);
				c.quadraticCurveTo(x, y - bend + 6, x + w, y + 12);
				c.stroke();
				c.lineWidth = 2;
				c.strokeStyle = light + "55";
				c.beginPath();
				c.moveTo(x - w, y);
				c.quadraticCurveTo(x, y - bend, x + w, y + 6);
				c.stroke();
			}
			if (t === "dunesea")
				// Furrows left by something huge moving under the sand.
				for (let k = 0; k < 5 * n; k++) {
					let x = 500 + rand() * (g.W - 1000),
						y = 400 + rand() * (g.H - 800),
						a = rand() * TAU;
					c.lineWidth = 26;
					c.strokeStyle = dark + "30";
					c.beginPath();
					c.moveTo(x, y);
					for (let s = 0; s < 14; s++) {
						a += (rand() - 0.5) * 0.7;
						x += Math.cos(a) * 60;
						y += Math.sin(a) * 60;
						c.lineTo(x, y);
					}
					c.stroke();
					c.lineWidth = 3;
					c.strokeStyle = light + "40";
					c.stroke();
				}
			for (let i = 0; i < 220 * n; i++) {
				const x = rand() * g.W,
					y = rand() * g.H;
				if (g.blocked(x, y, 6)) continue;
				c.fillStyle = i % 5 ? "#7a603f" : "#ece2cc";
				c.beginPath();
				c.ellipse(x, y, 1.5 + rand() * 3, 1 + rand() * 1.5, rand(), 0, TAU);
				c.fill();
			}
		}
		if (t === "derelict") {
			for (let i = 0; i < 150 * n; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					r = 60 + rand() * 180,
					gr = c.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, i % 3 ? "#3c4a4a38" : "#0a0c0e55");
				gr.addColorStop(1, "#24272a00");
				c.fillStyle = gr;
				c.fillRect(x - r, y - r, 2 * r, 2 * r);
			}
			// Dark organic veins creeping over the rock.
			c.lineCap = "round";
			for (let i = 0; i < 180 * n; i++) {
				let x = rand() * g.W,
					y = rand() * g.H,
					a = rand() * TAU;
				c.strokeStyle = i % 4 ? "#141617aa" : "#3d4a3a66";
				c.lineWidth = 3 + rand() * 3;
				c.beginPath();
				c.moveTo(x, y);
				for (let s = 0; s < 6; s++) {
					a += (rand() - 0.5) * 1.2;
					const nx = x + Math.cos(a) * 26,
						ny = y + Math.sin(a) * 26;
					c.quadraticCurveTo(x + (rand() - 0.5) * 16, y + (rand() - 0.5) * 16, nx, ny);
					x = nx;
					y = ny;
				}
				c.stroke();
			}
			c.lineCap = "butt";
			for (let i = 0; i < 140 * n; i++) {
				const x = rand() * g.W,
					y = rand() * g.H;
				if (g.blocked(x, y, 10)) continue;
				c.fillStyle = "#6b8a8a22";
				c.beginPath();
				c.ellipse(x, y, 14 + rand() * 20, 5 + rand() * 6, rand(), 0, TAU);
				c.fill();
			}
		}
		if (t === "frozenhive") {
			for (let i = 0; i < 160 * n; i++) {
				const x = rand() * g.W,
					y = rand() * g.H,
					r = 70 + rand() * 180,
					gr = c.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, i % 3 ? "#e6f2f640" : "#42607030");
				gr.addColorStop(1, "#6e889400");
				c.fillStyle = gr;
				c.fillRect(x - r, y - r, 2 * r, 2 * r);
			}
			for (let i = 0; i < 240 * n; i++) {
				let x = rand() * g.W,
					y = rand() * g.H;
				c.strokeStyle = i % 6 ? "#dcebf055" : "#3b3050aa";
				c.lineWidth = i % 6 ? 1.2 : 2.6;
				c.beginPath();
				c.moveTo(x, y);
				for (let s = 0; s < 4; s++) {
					x += (rand() - 0.5) * 50;
					y += (rand() - 0.5) * 50;
					c.lineTo(x, y);
				}
				c.stroke();
			}
		}
	}

	function waters(c, g) {
		const dunes = (g.waters || []).filter((w) => w.kind === "dune"),
			cracks = (g.waters || []).filter((w) => w.kind === "crevasse"),
			gold = theme(g) === "goldsand";
		// Dune crests: collision footprint first, then one smooth wave along each chain's centre line.
		union(c, dunes, 4, gold ? "#b78e56" : "#9b7244");
		const chains = [];
		for (const w of dunes) {
			const last = chains.at(-1)?.at(-1);
			if (last && Math.hypot(w.x - last.x, w.y - last.y) < 150) chains.at(-1).push(w);
			else chains.push([w]);
		}
		// Each chain becomes a tapered, slightly wavy dune: pointed ends, lit windward face, shadowed lee.
		const rand = seeded(97);
		for (const list of chains) {
			if (list.length < 2) continue;
			const ry = list[0].ry,
				top = [],
				bottom = [],
				crest = [];
			list.forEach((p, i) => {
				const a = list[Math.max(0, i - 1)],
					b = list[Math.min(list.length - 1, i + 1)],
					len = Math.hypot(b.x - a.x, b.y - a.y) || 1,
					nx = -(b.y - a.y) / len,
					ny = (b.x - a.x) / len,
					f = Math.pow(Math.sin((Math.PI * (i + 0.5)) / list.length), 0.6),
					wave = 0.85 + rand() * 0.3,
					w = ry * 1.15 * f * wave;
				top.push([p.x - nx * w, p.y - ny * w]);
				bottom.push([p.x + nx * w * 1.2, p.y + ny * w * 1.2]);
				crest.push([p.x - nx * w * 0.25, p.y - ny * w * 0.25]);
			});
			const head = [list[0].x - (list[1].x - list[0].x) * 0.6, list[0].y - (list[1].y - list[0].y) * 0.6],
				tail = [list.at(-1).x + (list.at(-1).x - list.at(-2).x) * 0.6, list.at(-1).y + (list.at(-1).y - list.at(-2).y) * 0.6],
				outline = [head, ...top, tail, ...bottom.slice().reverse()];
			poly(c, outline.map(([x, y]) => [x + 14, y + 18]), gold ? "#8a6a3c55" : "#5e422555");
			poly(c, outline, gold ? "#d2a96a" : "#b98a54");
			poly(c, [head, ...top, tail, ...crest.slice().reverse()], gold ? "#efcd92" : "#dcb176");
			poly(c, [head, ...crest, tail, ...bottom.slice().reverse()], gold ? "#b98c55" : "#9a6f42");
			c.lineWidth = 2.5;
			c.strokeStyle = gold ? "#fff2cfdd" : "#f6dcaadd";
			c.beginPath();
			[head, ...crest, tail].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
			c.stroke();
			c.lineWidth = 1.5;
			c.strokeStyle = gold ? "#fff6dc66" : "#f2d6a466";
			for (let k = 1; k < top.length - 1; k += 2) {
				const [x, y] = top[k],
					[cx, cy] = crest[k];
				c.beginPath();
				c.moveTo(x * 0.7 + cx * 0.3, y * 0.7 + cy * 0.3);
				c.lineTo(x * 0.3 + cx * 0.7, y * 0.3 + cy * 0.7);
				c.stroke();
			}
		}
		union(c, cracks, 24, "#f2fbffcc");
		union(c, cracks, 12, "#a9cfdc");
		union(c, cracks, 2, "#4b7d93");
		union(c, cracks, -12, "#22465a");
		union(c, cracks, -28, "#0c1d2a");
		union(c, cracks, 22, "#ffffff55", -4, -6);
		// A jagged dark crack down the middle of each crevasse run gives it depth.
		const runs = [];
		for (const w of cracks) {
			const last = runs.at(-1)?.at(-1);
			if (last && Math.hypot(w.x - last.x, w.y - last.y) < 150) runs.at(-1).push(w);
			else runs.push([w]);
		}
		const jag = seeded(41);
		c.strokeStyle = "#02070b";
		c.lineWidth = 5;
		c.lineJoin = "round";
		for (const run of runs) {
			c.beginPath();
			run.forEach((w, i) => {
				const x = w.x + (jag() - 0.5) * 30,
					y = w.y + (jag() - 0.5) * 18;
				if (i) c.lineTo(x, y);
				else c.moveTo(x, y);
			});
			c.stroke();
		}
		c.lineJoin = "miter";
	}

	function outcrop(c, o, rand, gold) {
		const pts = blob(o, rand, 0.22, 18),
			cx = o.x + o.w / 2,
			cy = o.y + o.h / 2;
		c.fillStyle = "#3a2a1a4d";
		c.beginPath();
		c.ellipse(cx + 34, cy + 36, o.w * 0.62, o.h * 0.6, -0.1, 0, TAU);
		c.fill();
		poly(c, pts.map(([x, y]) => [x + 4, y + 18]), gold ? "#7a4f2e" : "#5f3d24");
		poly(c, pts, gold ? "#b27a4a" : "#8e5c38");
		poly(c, pts.map(([x, y]) => [cx + (x - cx) * 0.78, cy + (y - cy) * 0.74 - 8]), gold ? "#d19a62" : "#a87048");
		c.strokeStyle = gold ? "#8c5a34aa" : "#6a4226aa";
		c.lineWidth = 2;
		for (let k = 1; k <= 3; k++) {
			c.beginPath();
			c.moveTo(o.x + 8, cy + k * 7);
			c.quadraticCurveTo(cx, cy + k * 7 - 6, o.x + o.w - 8, cy + k * 7);
			c.stroke();
		}
		c.fillStyle = gold ? "#f0cf94cc" : "#d9b07acc";
		c.beginPath();
		c.moveTo(o.x - 16, o.y + o.h + 12);
		c.quadraticCurveTo(cx, o.y + o.h - 14, o.x + o.w + 16, o.y + o.h + 14);
		c.closePath();
		c.fill();
	}
	// The derelict is drawn as one biomechanical hull: a shared rounded outline with ribs radiating
	// from the centre of the horseshoe, like a ribcage. Collision stays on the individual segments.
	function derelictShip(c, g, rand) {
		const parts = g.obstacles.filter((o) => o.kind === "derelict");
		if (!parts.length) return;
		const cx = parts.reduce((n, o) => n + o.x + o.w / 2, 0) / parts.length,
			cy = parts.reduce((n, o) => n + o.y + o.h / 2, 0) / parts.length,
			reach = Math.max(...parts.map((o) => Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) + Math.max(o.w, o.h)));
		const outline = (pad) => {
			c.beginPath();
			for (const o of parts) c.roundRect(o.x - pad, o.y - pad, o.w + pad * 2, o.h + pad * 2, Math.min(o.w, o.h) / 2 + pad);
		};
		c.save();
		c.translate(30, 34);
		outline(8);
		c.fillStyle = "#040506aa";
		c.fill();
		c.restore();
		outline(6);
		c.fillStyle = "#23201e";
		c.fill();
		c.save();
		outline(2);
		c.clip();
		c.fillStyle = "#34302c";
		c.fillRect(cx - reach, cy - reach, reach * 2, reach * 2);
		const ribs = 46;
		for (let k = 0; k < ribs; k++) {
			const a = (k * TAU) / ribs + rand() * 0.02;
			c.lineCap = "round";
			c.lineWidth = 12;
			c.strokeStyle = "#4d463e";
			c.beginPath();
			c.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
			c.quadraticCurveTo(cx + Math.cos(a + 0.08) * reach * 0.6, cy + Math.sin(a + 0.08) * reach * 0.6, cx + Math.cos(a) * reach, cy + Math.sin(a) * reach);
			c.stroke();
			c.lineWidth = 3;
			c.strokeStyle = "#8c8272";
			c.stroke();
		}
		// Spine along the middle of the hull and tube-like sinews between the ribs.
		for (const [w, col] of [
			[16, "#1b1917"],
			[5, "#6e665a"],
		]) {
			c.lineWidth = w;
			c.strokeStyle = col;
			c.beginPath();
			for (const o of parts) {
				const vertical = o.h > o.w;
				if (vertical) {
					c.moveTo(o.x + o.w / 2, o.y + 8);
					c.lineTo(o.x + o.w / 2, o.y + o.h - 8);
				} else {
					c.moveTo(o.x + 8, o.y + o.h / 2);
					c.lineTo(o.x + o.w - 8, o.y + o.h / 2);
				}
			}
			c.stroke();
		}
		c.lineWidth = 2;
		c.strokeStyle = "#15131288";
		for (let k = 0; k < 30; k++) {
			const a = rand() * TAU,
				r = 80 + rand() * reach;
			c.beginPath();
			c.arc(cx, cy, r, a, a + 0.25 + rand() * 0.3);
			c.stroke();
		}
		c.restore();
		c.lineWidth = 3;
		c.strokeStyle = "#0e0d0c";
		outline(6);
		c.stroke();
		// Dark cavity between the arms, where the eggs lie.
		const inner = c.createRadialGradient(cx, cy + 40, 10, cx, cy + 40, reach * 0.55);
		inner.addColorStop(0, "#0a0c0c88");
		inner.addColorStop(1, "#0a0c0c00");
		c.fillStyle = inner;
		c.fillRect(cx - reach, cy - reach, reach * 2, reach * 2);
	}
	function eggs(c, o, rand, icy) {
		const n = Math.max(3, Math.round((o.w * o.h) / 900));
		c.fillStyle = icy ? "#b9d3dc88" : "#1f231d99";
		c.beginPath();
		c.ellipse(o.x + o.w / 2, o.y + o.h / 2 + 6, o.w * 0.62, o.h * 0.6, 0, 0, TAU);
		c.fill();
		for (let k = 0; k < n; k++) {
			const x = o.x + 10 + rand() * (o.w - 20),
				y = o.y + 10 + rand() * (o.h - 20),
				r = 8 + rand() * 4;
			c.fillStyle = "#0000004d";
			c.beginPath();
			c.ellipse(x + 5, y + r * 0.8, r, r * 0.45, 0, 0, TAU);
			c.fill();
			c.fillStyle = icy ? "#8fa3b0" : "#6d6150";
			c.beginPath();
			c.ellipse(x, y, r * 0.85, r * 1.1, 0, 0, TAU);
			c.fill();
			c.fillStyle = icy ? "#c6dbe4" : "#8f8166";
			c.beginPath();
			c.ellipse(x - r * 0.25, y - r * 0.3, r * 0.4, r * 0.55, 0, 0, TAU);
			c.fill();
			c.strokeStyle = icy ? "#4f6472" : "#3a3326";
			c.lineWidth = 1.5;
			c.beginPath();
			c.moveTo(x - r * 0.45, y - r * 0.75);
			c.lineTo(x + r * 0.45, y - r * 0.75);
			c.moveTo(x, y - r * 1.05);
			c.lineTo(x, y - r * 0.45);
			c.stroke();
		}
	}
	function resin(c, o, rand, icy) {
		const pts = blob(o, rand, 0.3, 22);
		c.fillStyle = "#0000005a";
		c.beginPath();
		c.ellipse(o.x + o.w / 2 + 22, o.y + o.h / 2 + 22, o.w * 0.6, o.h * 0.6, 0, 0, TAU);
		c.fill();
		poly(c, pts, icy ? "#3c3c5c" : "#1d1a22");
		const vertical = o.h > o.w;
		for (let k = 0; k < 9; k++) {
			c.lineWidth = 4 + rand() * 5;
			c.strokeStyle = icy ? (k % 2 ? "#5b5a85" : "#8fb0c8aa") : k % 2 ? "#2f2a36" : "#4a4552";
			c.beginPath();
			if (vertical) {
				const x = o.x + 6 + rand() * (o.w - 12);
				c.moveTo(x, o.y + 6);
				c.bezierCurveTo(x + 14, o.y + o.h * 0.3, x - 14, o.y + o.h * 0.7, x + (rand() - 0.5) * 10, o.y + o.h - 6);
			} else {
				const y = o.y + 6 + rand() * (o.h - 12);
				c.moveTo(o.x + 6, y);
				c.bezierCurveTo(o.x + o.w * 0.3, y + 14, o.x + o.w * 0.7, y - 14, o.x + o.w - 6, y + (rand() - 0.5) * 10);
			}
			c.stroke();
		}
		c.fillStyle = icy ? "#e9f6fbaa" : "#6f6a7a55";
		for (let k = 0; k < 6; k++) {
			c.beginPath();
			c.ellipse(o.x + rand() * o.w, o.y + rand() * o.h, 4 + rand() * 5, 2 + rand() * 2, rand(), 0, TAU);
			c.fill();
		}
	}
	function processor(c, o) {
		const cx = o.x + o.w / 2,
			cy = o.y + o.h / 2,
			r = Math.min(o.w, o.h) / 2;
		c.fillStyle = "#0000005a";
		c.beginPath();
		c.ellipse(cx + 34, cy + 40, r * 1.3, r * 0.8, -0.2, 0, TAU);
		c.fill();
		c.strokeStyle = "#2b3034";
		c.lineWidth = 10;
		for (let k = 0; k < 6; k++) {
			const a = (k * TAU) / 6 + 0.3;
			c.beginPath();
			c.moveTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8);
			c.lineTo(cx + Math.cos(a) * r * 1.45, cy + Math.sin(a) * r * 1.45);
			c.stroke();
		}
		for (const [k, col] of [
			[1, "#3c4247"],
			[0.82, "#555c62"],
			[0.62, "#3a4045"],
			[0.42, "#6b7379"],
			[0.22, "#2a2f33"],
		]) {
			c.fillStyle = col;
			c.beginPath();
			c.arc(cx, cy - (1 - k) * 18, r * k, 0, TAU);
			c.fill();
		}
		c.strokeStyle = "#20242766";
		c.lineWidth = 2;
		for (let k = 0; k < 12; k++) {
			const a = (k * TAU) / 12;
			c.beginPath();
			c.moveTo(cx + Math.cos(a) * r * 0.62, cy - 7 + Math.sin(a) * r * 0.62);
			c.lineTo(cx + Math.cos(a) * r * 0.98, cy + Math.sin(a) * r * 0.98);
			c.stroke();
		}
		c.fillStyle = "#c9a14a";
		for (let k = 0; k < 4; k++) c.fillRect(cx - r * 0.9 + k * r * 0.5, cy + r * 0.72, r * 0.22, 5);
	}
	function ruin(c, o, rand) {
		c.fillStyle = "#1c2a3244";
		c.fillRect(o.x + 18, o.y + 22, o.w, o.h);
		c.fillStyle = "#56646c";
		c.fillRect(o.x, o.y, o.w, o.h);
		c.fillStyle = "#7d8c94";
		c.fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 18);
		c.strokeStyle = "#46535a";
		c.lineWidth = 2;
		for (let x = o.x + 30; x < o.x + o.w - 10; x += 30) {
			c.beginPath();
			c.moveTo(x, o.y + 6);
			c.lineTo(x, o.y + o.h - 12);
			c.stroke();
		}
		// Broken roof panels and a collapsed corner.
		poly(c, [[o.x + o.w * 0.55, o.y + 6], [o.x + o.w - 6, o.y + 6], [o.x + o.w - 6, o.y + o.h * 0.55], [o.x + o.w * 0.7, o.y + o.h * 0.35]], "#1d282e");
		for (let k = 0; k < 5; k++) {
			const x = o.x + o.w * 0.6 + rand() * o.w * 0.35,
				y = o.y + 10 + rand() * o.h * 0.4;
			poly(c, [[x, y], [x + 10, y + 3], [x + 6, y + 9]], "#8d9aa1");
		}
		c.fillStyle = "#c9a14aaa";
		c.fillRect(o.x + 10, o.y + o.h - 12, o.w * 0.4, 5);
		c.fillStyle = "#f2f8faee";
		c.beginPath();
		c.moveTo(o.x - 6, o.y + 4);
		c.quadraticCurveTo(o.x + o.w * 0.3, o.y - 8, o.x + o.w * 0.55, o.y + 6);
		c.lineTo(o.x + o.w * 0.2, o.y + 16);
		c.closePath();
		c.fill();
		c.beginPath();
		c.moveTo(o.x - 10, o.y + o.h + 6);
		c.quadraticCurveTo(o.x + o.w * 0.4, o.y + o.h - 14, o.x + o.w + 10, o.y + o.h + 8);
		c.closePath();
		c.fill();
	}
	// Plain rocks keep their shape and collision; the theme only dresses them.
	function dressRock(c, o, t, rand) {
		if (t === "dunesea" || t === "goldsand") {
			c.fillStyle = t === "goldsand" ? "#f0cf94d0" : "#d9b07ad0";
			c.beginPath();
			c.moveTo(o.x - 18, o.y + o.h + 14);
			c.quadraticCurveTo(o.x + o.w * 0.4, o.y + o.h - 22, o.x + o.w + 20, o.y + o.h + 16);
			c.closePath();
			c.fill();
		} else if (t === "derelict") {
			c.lineCap = "round";
			for (let k = 0; k < 5; k++) {
				c.strokeStyle = k % 2 ? "#141617cc" : "#2f2a36cc";
				c.lineWidth = 3 + rand() * 3;
				const x = o.x + rand() * o.w;
				c.beginPath();
				c.moveTo(x, o.y + o.h + 10);
				c.bezierCurveTo(x + 10, o.y + o.h * 0.6, x - 12, o.y + o.h * 0.3, x + (rand() - 0.5) * 20, o.y + 4);
				c.stroke();
			}
			c.lineCap = "butt";
		} else if (t === "frozenhive") {
			c.fillStyle = "#f2f8fae0";
			c.beginPath();
			c.moveTo(o.x - 6, o.y + o.h * 0.3);
			c.quadraticCurveTo(o.x + o.w * 0.3, o.y - 12, o.x + o.w * 0.8, o.y + 2);
			c.quadraticCurveTo(o.x + o.w * 0.45, o.y + o.h * 0.25, o.x - 6, o.y + o.h * 0.3);
			c.fill();
		}
	}

	function terrain(c, g) {
		const t = theme(g),
			rand = seeded(2718);
		if (OURS.includes(t)) ground(c, g, t, rand);
		waters(c, g);
		const icy = t === "frozenhive";
		derelictShip(c, g, rand);
		for (const o of g.obstacles) {
			if (!o.kind && OURS.includes(t)) dressRock(c, o, t, rand);
			else if (o.kind === "outcrop") outcrop(c, o, rand, t === "goldsand");
			else if (o.kind === "eggs") eggs(c, o, rand, icy);
			else if (o.kind === "resin") resin(c, o, rand, icy);
			else if (o.kind === "processor") processor(c, o);
			else if (o.kind === "ruin") ruin(c, o, rand);
		}
	}
	// Animated, unlit: blowing sand, worm-sign ripples, drifting fog and processor smoke.
	function effects(c, g, view) {
		const t = theme(g),
			time = g.time;
		if (!OURS.includes(t)) return;
		c.save();
		if (t === "dunesea" || t === "goldsand") {
			const rand = seeded(61);
			c.strokeStyle = t === "goldsand" ? "rgba(255,236,190,.20)" : "rgba(245,220,170,.18)";
			c.lineWidth = 2;
			for (let i = 0; i < 70; i++) {
				const baseX = rand() * g.W,
					y = rand() * g.H,
					speed = 40 + rand() * 50,
					x = ((baseX + time * speed) % (g.W + 400)) - 200;
				if (!inView({ x, y }, view, 60)) continue;
				c.beginPath();
				c.moveTo(x, y);
				c.quadraticCurveTo(x + 40, y - 6, x + 90, y + 2);
				c.stroke();
			}
			for (const e of g.entities) {
				if (e.type !== "duneMaw" || e.hp <= 0 || !g.isVisible(e.x, e.y) || !inView(e, view)) continue;
				for (let k = 0; k < 3; k++) {
					const phase = (time * 0.35 + k / 3) % 1;
					c.strokeStyle = `rgba(110,80,45,${0.35 * (1 - phase)})`;
					c.lineWidth = 3;
					c.beginPath();
					c.ellipse(e.x, e.y, 60 + phase * 110, (60 + phase * 110) * 0.55, 0, 0, TAU);
					c.stroke();
				}
			}
		}
		if (t === "derelict" || t === "frozenhive") {
			const rand = seeded(83),
				color = t === "derelict" ? "150,170,165" : "235,245,250";
			for (let i = 0; i < 26; i++) {
				const x = ((rand() * g.W + time * (8 + rand() * 10)) % (g.W + 600)) - 300,
					y = rand() * g.H,
					r = 140 + rand() * 160;
				if (!inView({ x, y }, view, r)) continue;
				const gr = c.createRadialGradient(x, y, 0, x, y, r);
				gr.addColorStop(0, `rgba(${color},${t === "derelict" ? 0.1 : 0.08})`);
				gr.addColorStop(1, `rgba(${color},0)`);
				c.fillStyle = gr;
				c.fillRect(x - r, y - r, 2 * r, 2 * r);
			}
			for (const o of g.obstacles) {
				if (o.kind !== "processor" || !inView(o, view, 300)) continue;
				const cx = o.x + o.w / 2,
					cy = o.y + o.h / 2;
				for (let k = 0; k < 8; k++) {
					const life = (time * 0.12 + k / 8) % 1,
						r = 18 + life * 60;
					c.fillStyle = `rgba(90,96,100,${0.35 * (1 - life)})`;
					c.beginPath();
					c.arc(cx + Math.sin(k + time * 0.3) * 18 + life * 40, cy - 20 - life * 220, r, 0, TAU);
					c.fill();
				}
			}
		}
		c.restore();
	}
	// Emissive, drawn after night lighting: egg pods pulse, processor beacons blink.
	function glow(c, g, view) {
		const t = theme(g),
			time = g.time,
			night = g.night || 0;
		if (t !== "derelict" && t !== "frozenhive") return;
		c.save();
		c.globalCompositeOperation = "lighter";
		for (const o of g.obstacles) {
			if (!inView(o, view)) continue;
			const cx = o.x + o.w / 2,
				cy = o.y + o.h / 2;
			if (o.kind === "eggs") {
				const p = 0.5 + 0.5 * Math.sin(time * 1.3 + o.x),
					r = Math.max(o.w, o.h) * 1.1,
					gr = c.createRadialGradient(cx, cy, 0, cx, cy, r),
					col = t === "derelict" ? "120,220,140" : "150,200,255";
				gr.addColorStop(0, `rgba(${col},${0.05 + 0.04 * p + night * 0.22})`);
				gr.addColorStop(1, `rgba(${col},0)`);
				c.fillStyle = gr;
				c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
			}
			if (o.kind === "processor" && Math.sin(time * 3 + o.x) > 0.2) {
				const gr = c.createRadialGradient(cx, cy - 20, 0, cx, cy - 20, 40);
				gr.addColorStop(0, `rgba(255,70,60,${0.35 + night * 0.4})`);
				gr.addColorStop(1, "rgba(255,70,60,0)");
				c.fillStyle = gr;
				c.fillRect(cx - 40, cy - 60, 80, 80);
			}
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
