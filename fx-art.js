/* Effects of the newer mechanics and the storm outlook, shared by both renderers.
   An effect is described once as simple shapes (FxArt.shapes); Canvas and the WebGL models draw the same shapes.
   Craters, the storm band at the screen edge and the storm front on the minimap are drawn here for Canvas;
   WebGL replays the screen band (interface layer), bakes craters into ground sprites and shares the minimap. */
const FxArt = (() => {
	const TAU = Math.PI * 2;
	const hex = (color) => parseInt(color.slice(1), 16);
	// Shapes: ring (circle outline), disc, line, cross (plus sign), arc.
	function shapes(ef) {
		const a = Math.max(0, ef.life / ef.maxLife),
			t = 1 - a,
			out = [];
		if (ef.kind === "shieldHit") {
			// A ripple on the dome where the shot landed, and a short flash.
			out.push({ t: "ring", x: ef.x, y: ef.y, r: 8 + t * 26, w: 3 * a, color: "#8fe6ff", alpha: a });
			out.push({ t: "disc", x: ef.x, y: ef.y, r: 9 * a + 2, color: "#d8f8ff", alpha: a * 0.7 });
			if (ef.gx !== undefined) {
				const ang = Math.atan2(ef.y - ef.gy, ef.x - ef.gx),
					r = Math.hypot(ef.x - ef.gx, ef.y - ef.gy);
				out.push({ t: "arc", x: ef.gx, y: ef.gy, r, a0: ang - 0.35, a1: ang + 0.35, w: 4 * a, color: "#8fe6ff", alpha: a * 0.8 });
			}
		} else if (ef.kind === "heal") {
			out.push({ t: "cross", x: ef.x + (ef.dx || 0), y: ef.y - 14 - t * 22, s: 5, w: 3, color: "#8cf0a8", alpha: a });
			out.push({ t: "ring", x: ef.x, y: ef.y, r: 10 + t * 8, w: 2 * a, color: "#8cf0a8", alpha: a * 0.5 });
		} else if (ef.kind === "sparks") {
			for (let i = 0; i < 6; i++) {
				const ang = (i * 1.9 + (ef.seed || 0)) % TAU,
					r0 = 3 + t * 6,
					r1 = r0 + 6 + t * 10;
				out.push({ t: "line", x: ef.x + Math.cos(ang) * r0, y: ef.y + Math.sin(ang) * r0 - t * 6, x2: ef.x + Math.cos(ang) * r1, y2: ef.y + Math.sin(ang) * r1 - t * 10, w: 2, color: i % 2 ? "#ffd27a" : "#fff3c4", alpha: a });
			}
		} else if (ef.kind === "dust") {
			for (let i = 0; i < 3; i++)
				out.push({ t: "disc", x: ef.x + (i - 1) * 8 + (ef.dx || 0) * t, y: ef.y - t * 12 - i * 2, r: 4 + t * 7, color: ef.color || "#b8a98a", alpha: a * 0.35 });
			// Mining: chips of rock or crystal thrown up in short arcs.
			if (ef.chips)
				for (let i = 0; i < 4; i++) {
					const dir = (i - 1.5) * 0.9 + (ef.dx || 0) * 0.02,
						x = ef.x + Math.sin(dir) * t * 22,
						y = ef.y - 4 - Math.sin(t * Math.PI) * (10 + i * 3) + t * 6;
					out.push({ t: "line", x, y, x2: x + Math.sin(dir) * 3, y2: y - 2, w: 2, color: i % 2 ? ef.chips : ef.color || "#b8a98a", alpha: a });
				}
		} else if (ef.kind === "emp") {
			out.push({ t: "ring", x: ef.x, y: ef.y, r: 12 + t * 70, w: 4 * a, color: "#9cc8ff", alpha: a });
			out.push({ t: "ring", x: ef.x, y: ef.y, r: 6 + t * 40, w: 2 * a, color: "#e6f0ff", alpha: a * 0.8 });
		} else if (ef.kind === "flame") {
			// A short cone of fire from the thrower to the target.
			const dx = ef.x - (ef.fx ?? ef.x),
				dy = ef.y - (ef.fy ?? ef.y);
			for (let i = 0; i < 5; i++) {
				const k = 0.35 + i * 0.16 + t * 0.1;
				out.push({ t: "disc", x: (ef.fx ?? ef.x) + dx * k + Math.sin(i * 2.1 + t * 9) * 4, y: (ef.fy ?? ef.y) + dy * k + Math.cos(i * 1.7 + t * 9) * 4, r: 4 + i * 2 + t * 4, color: i % 2 ? "#ffb347" : "#ff7a2e", alpha: a * (0.8 - i * 0.08) });
			}
		} else if (ef.kind === "rift") {
			// The Watchers (0.154): a rift of light — a vertical slit opening and closing, rings spreading
			// (a small one for a Spark's blink, a bright burst when two Wardens merge).
			const s = ef.small ? 0.55 : ef.merge ? 1.4 : 1,
				open = Math.sin(Math.min(1, t * 1.6) * Math.PI);
			out.push({ t: "line", x: ef.x, y: ef.y + 10 * s, x2: ef.x, y2: ef.y - 46 * s * open - 6, w: 7 * s * open + 1, color: "#7fe9ff", alpha: a * 0.55 });
			out.push({ t: "line", x: ef.x, y: ef.y + 6 * s, x2: ef.x, y2: ef.y - 40 * s * open - 4, w: 2.5 * s * open + 0.5, color: "#f2fdff", alpha: a });
			out.push({ t: "ring", x: ef.x, y: ef.y, r: (8 + t * 34) * s, w: 3 * a, color: "#7fe9ff", alpha: a * 0.8 });
			if (ef.merge) out.push({ t: "disc", x: ef.x, y: ef.y, r: 22 * a, color: "#dffaff", alpha: a * 0.5 });
		} else if (ef.kind === "phase") {
			// A Warden in phase: a pale shell shimmering round it.
			out.push({ t: "ring", x: ef.x, y: ef.y, r: 20 + t * 4, w: 2.5, color: "#bdf4ff", alpha: a * 0.7 });
			out.push({ t: "arc", x: ef.x, y: ef.y, r: 15, a0: t * 6, a1: t * 6 + 2.2, w: 1.5, color: "#ffffff", alpha: a * 0.6 });
		} else if (ef.kind === "artifact") {
			out.push({ t: "ring", x: ef.x, y: ef.y, r: 14 + t * 60, w: 5 * a, color: "#f5e27a", alpha: a });
			out.push({ t: "line", x: ef.x, y: ef.y, x2: ef.x, y2: ef.y - 40 - t * 80, w: 6 * a, color: "#fff7c4", alpha: a * 0.8 });
		}
		return out;
	}
	function drawShapes(c, list) {
		for (const s of list) {
			if (s.alpha <= 0) continue;
			c.globalAlpha = s.alpha;
			c.strokeStyle = c.fillStyle = s.color;
			c.lineWidth = Math.max(0.5, s.w || 1);
			c.beginPath();
			if (s.t === "ring") {
				c.arc(s.x, s.y, s.r, 0, TAU);
				c.stroke();
			} else if (s.t === "arc") {
				c.arc(s.x, s.y, s.r, s.a0, s.a1);
				c.stroke();
			} else if (s.t === "disc") {
				c.arc(s.x, s.y, s.r, 0, TAU);
				c.fill();
			} else if (s.t === "line") {
				c.moveTo(s.x, s.y);
				c.lineTo(s.x2, s.y2);
				c.stroke();
			} else if (s.t === "cross") {
				c.moveTo(s.x - s.s, s.y);
				c.lineTo(s.x + s.s, s.y);
				c.moveTo(s.x, s.y - s.s);
				c.lineTo(s.x, s.y + s.s);
				c.stroke();
			}
		}
		c.globalAlpha = 1;
	}
	// The same shapes on a PIXI.Graphics (WebGL models layer).
	function drawPixi(g, list) {
		for (const s of list) {
			if (s.alpha <= 0) continue;
			const stroke = { width: Math.max(0.5, s.w || 1), color: hex(s.color), alpha: s.alpha };
			if (s.t === "ring") g.circle(s.x, s.y, s.r).stroke(stroke);
			else if (s.t === "arc") g.moveTo(s.x + Math.cos(s.a0) * s.r, s.y + Math.sin(s.a0) * s.r).arc(s.x, s.y, s.r, s.a0, s.a1).stroke(stroke);
			else if (s.t === "disc") g.circle(s.x, s.y, s.r).fill({ color: hex(s.color), alpha: s.alpha });
			else if (s.t === "line") g.moveTo(s.x, s.y).lineTo(s.x2, s.y2).stroke(stroke);
			else if (s.t === "cross") g.moveTo(s.x - s.s, s.y).lineTo(s.x + s.s, s.y).moveTo(s.x, s.y - s.s).lineTo(s.x, s.y + s.s).stroke(stroke);
		}
	}
	const KINDS = new Set(["shieldHit", "heal", "sparks", "dust", "emp", "artifact", "flame", "rift", "phase"]);
	const handles = (ef) => KINDS.has(ef.kind);

	// A crater left by heavy fire: dark bowl, lighter rim, thrown soil; fades in its last minute.
	function crater(c, k, alpha = 1) {
		const r = k.size;
		c.save();
		c.translate(k.x, k.y);
		c.globalAlpha = alpha;
		c.fillStyle = "#1a14104d";
		c.beginPath();
		c.ellipse(0, 0, r * 1.25, r * 0.8, 0, 0, TAU);
		c.fill();
		c.fillStyle = "#2a201870";
		c.beginPath();
		c.ellipse(0, 1, r * 0.8, r * 0.5, 0, 0, TAU);
		c.fill();
		c.strokeStyle = "#d8c3a04d";
		c.lineWidth = Math.max(1.5, r * 0.08);
		c.beginPath();
		c.ellipse(0, -1, r * 0.95, r * 0.6, 0, Math.PI * 1.05, Math.PI * 1.95);
		c.stroke();
		for (let i = 0; i < 7; i++) {
			const a = i * 0.9 + (k.seed || 0),
				d = r * (1.15 + (i % 3) * 0.12);
			c.fillStyle = i % 2 ? "#3a2c2255" : "#8a765c55";
			c.fillRect(Math.cos(a) * d - 2, Math.sin(a) * d * 0.65 - 1.5, 4, 3);
		}
		c.restore();
	}
	const craterAlpha = (game, k) => Math.max(0, Math.min(1, (RTS.CRATER_LIFE - (game.time - k.born)) / 60));
	function craters(c, game, seen) {
		for (const k of game.craters || []) {
			if (seen && (Math.abs(k.x - seen.x) > seen.w / 2 + 80 || Math.abs(k.y - seen.y) > seen.h / 2 + 80)) continue;
			if (!game.explored[game.visionIndex(k.x, k.y)]) continue;
			crater(c, k, craterAlpha(game, k));
		}
	}

	// Storm outlook (variant B): nothing tints the battlefield. A thin line on the edge the storm comes from
	// (an L in the corner for diagonal directions), chevrons flowing inward, a round clock and a label.
	const TINT = { sand: [214, 170, 104], snow: [226, 238, 248], rain: [120, 160, 205] };
	// Brighter accents for the dark clock and label.
	const ACCENT = { sand: [236, 192, 120], snow: [210, 232, 250], rain: [140, 185, 232] };
	// Room left for the HUD over the battlefield: heading and zoom buttons at the top, legend and minimap at the bottom.
	const HUD = { top: 66, bottom: 46, minimap: 214 };
	const SHADE = "rgba(11,20,28,";
	function pill(c, x, y, w, h) {
		const r = h / 2;
		c.beginPath();
		c.moveTo(x + r, y);
		c.lineTo(x + w - r, y);
		c.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
		c.lineTo(x + r, y + h);
		c.arc(x + r, y + r, r, Math.PI / 2, (Math.PI * 3) / 2);
		c.closePath();
	}
	// Weather icon: wind lines for sand, a snowflake, raindrops.
	function stormIcon(c, x, y, s, kind, color) {
		c.save();
		c.translate(x, y);
		c.strokeStyle = color;
		c.fillStyle = color;
		c.lineWidth = 1.8;
		c.lineCap = "round";
		if (kind === "snow")
			for (let i = 0; i < 3; i++) {
				c.rotate(Math.PI / 3);
				c.beginPath();
				c.moveTo(-s, 0);
				c.lineTo(s, 0);
				c.stroke();
			}
		else if (kind === "rain")
			for (const [px, py] of [[-s * 0.5, -s * 0.2], [s * 0.4, -s * 0.5], [0, s * 0.5]]) {
				c.beginPath();
				c.moveTo(px, py - s * 0.45);
				c.quadraticCurveTo(px + s * 0.3, py + s * 0.1, px, py + s * 0.25);
				c.quadraticCurveTo(px - s * 0.3, py + s * 0.1, px, py - s * 0.45);
				c.fill();
			}
		else
			for (const [x0, x1, yy] of [[-s, s * 0.5, -s * 0.45], [-s, s * 0.85, s * 0.1], [-s * 0.6, s * 0.3, s * 0.65]]) {
				c.beginPath();
				c.moveTo(x0, yy);
				c.lineTo(x1, yy);
				c.stroke();
			}
		c.restore();
	}
	// A line fading out at both ends (along an edge), over a dark underlay so it shows on any ground. Drawn as a
	// gradient-filled rectangle: the WebGL replay supports gradient fills, not gradient strokes.
	function edgeLine(c, x1, y1, x2, y2, [r, g, b], fromCorner) {
		const vertical = x1 === x2;
		for (const [w, color, a] of [[9, SHADE, 0.6], [4.5, `rgba(${r},${g},${b},`, 1]]) {
			const grad = c.createLinearGradient(x1, y1, x2, y2);
			grad.addColorStop(0, color + (fromCorner ? a : 0) + ")");
			if (!fromCorner) grad.addColorStop(0.5, color + a + ")");
			grad.addColorStop(1, color + "0)");
			c.fillStyle = grad;
			if (vertical) c.fillRect(x1 - w / 2, Math.min(y1, y2), w, Math.abs(y2 - y1));
			else c.fillRect(Math.min(x1, x2), y1 - w / 2, Math.abs(x2 - x1), w);
		}
	}
	function stormEdge(c, game, width, height) {
		const o = game.stormOutlook;
		if (!o || !(o.near || o.arriving)) return;
		const accent = ACCENT[o.kind] || ACCENT.rain,
			[r, g, b] = accent,
			rgb = `rgb(${r},${g},${b})`,
			alpha = o.near ? 1 : 1 - o.arrived,
			dx = Math.cos(o.angle),
			dy = Math.sin(o.angle),
			sx = Math.abs(dx) > 0.3 ? Math.sign(dx) : 0,
			sy = Math.abs(dy) > 0.3 ? Math.sign(dy) : 0,
			corner = sx && sy,
			// Where the marker starts: the middle of the edge, or the corner for diagonal directions (clear of the HUD).
			ax = sx < 0 ? 16 : sx > 0 ? width - 16 : width / 2,
			ay = sy < 0 ? HUD.top : sy > 0 ? height - (sx > 0 ? HUD.minimap : HUD.bottom) : height / 2,
			// Inward: straight in from an edge, diagonally from a corner.
			len = Math.hypot(sx, sy) || 1,
			ix = -sx / len,
			iy = -sy / len;
		c.save();
		c.globalAlpha = alpha;
		// The edge line: along the whole middle of an edge, or both edges out of the corner.
		if (corner) {
			const cx = sx < 0 ? 3 : width - 3,
				cy = sy < 0 ? 3 : height - 3;
			edgeLine(c, cx, cy, cx, cy - sy * Math.min(320, height * 0.45), accent, true);
			edgeLine(c, cx, cy, cx - sx * Math.min(420, width * 0.4), cy, accent, true);
		} else if (sx) {
			const x = sx < 0 ? 3 : width - 3;
			edgeLine(c, x, height / 2 - 240, x, height / 2 + 240, accent, false);
		} else {
			const y = sy < 0 ? 3 : height - 3;
			edgeLine(c, width / 2 - 340, y, width / 2 + 340, y, accent, false);
		}
		// Chevrons flowing inward.
		const ang = Math.atan2(iy, ix);
		c.lineCap = "round";
		c.lineJoin = "round";
		for (let i = 0; i < 3; i++) {
			const t = (game.time * 1.2 + i / 3) % 1,
				d = 14 + t * 56,
				px = ax + ix * d,
				py = ay + iy * d,
				cos = Math.cos(ang),
				sin = Math.sin(ang),
				at = (u, v) => [px + u * cos - v * sin, py + u * sin + v * cos];
			c.globalAlpha = alpha * Math.sin(t * Math.PI);
			for (const [w, color] of [[7, SHADE + "0.75)"], [3.5, rgb]]) {
				c.strokeStyle = color;
				c.lineWidth = w;
				c.beginPath();
				c.moveTo(...at(-6, -10));
				c.lineTo(...at(5, 0));
				c.lineTo(...at(-6, 10));
				c.stroke();
			}
		}
		c.globalAlpha = alpha;
		// The clock: seconds left and a ring of the warning time left; the weather icon once the storm is here.
		const x = ax + ix * 108,
			y = ay + iy * 108;
		c.fillStyle = SHADE + "0.9)";
		c.beginPath();
		c.arc(x, y, 24, 0, Math.PI * 2);
		c.fill();
		c.lineWidth = 3;
		c.strokeStyle = "rgba(255,255,255,0.12)";
		c.beginPath();
		c.arc(x, y, 21, 0, Math.PI * 2);
		c.stroke();
		if (o.near) {
			c.strokeStyle = rgb;
			c.beginPath();
			c.arc(x, y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (o.until / o.lead));
			c.stroke();
		}
		c.textAlign = "center";
		if (o.near) {
			c.fillStyle = "#eef5f2";
			c.font = "700 15px Segoe UI, sans-serif";
			c.fillText(String(Math.ceil(o.until)), x, y + 3);
			c.fillStyle = "#9fb6bf";
			c.font = "9px Segoe UI, sans-serif";
			c.fillText("s", x, y + 13);
		} else stormIcon(c, x, y, 8, o.kind, rgb);
		// The label on a dark pill, below the clock (above it in the lower half), kept on the screen.
		c.font = "600 10px Segoe UI, sans-serif";
		const text = `${o.name.toUpperCase()} · ${o.from.toUpperCase()}`,
			w = c.measureText(text).width + 18,
			lx = Math.max(w / 2 + 8, Math.min(width - w / 2 - 8, x)),
			ly = y < height / 2 ? y + 31 : y - 49;
		c.fillStyle = SHADE + "0.9)";
		pill(c, lx - w / 2, ly, w, 18);
		c.fill();
		c.fillStyle = rgb;
		c.fillText(text, lx, ly + 12.5);
		c.restore();
	}
	// The storm front on the minimap: a band growing from the storm's edge, sweeping over the map as it arrives.
	function stormMinimap(mc, game, w = 220, h = 135) {
		const o = game.stormOutlook;
		if (!o || !(o.near || o.arriving || o.active)) return;
		const [r, g, b] = TINT[o.kind] || TINT.rain,
			reach = o.near ? 0.12 * (1 - o.until / o.lead) + 0.03 : o.arriving ? 0.15 + 0.85 * o.arrived : 1,
			dx = Math.cos(o.angle),
			dy = Math.sin(o.angle),
			// Project the map corners on the storm direction to find where the band starts and ends.
			proj = [
				[0, 0],
				[w, 0],
				[0, h],
				[w, h],
			].map(([x, y]) => (x - w / 2) * dx + (y - h / 2) * dy),
			far = Math.max(...proj),
			near = Math.min(...proj),
			edge = far - (far - near) * reach;
		mc.save();
		const grad = mc.createLinearGradient(w / 2 + dx * far, h / 2 + dy * far, w / 2 + dx * edge, h / 2 + dy * edge);
		grad.addColorStop(0, `rgba(${r},${g},${b},${o.active && !o.arriving ? 0.16 : 0.45})`);
		grad.addColorStop(1, `rgba(${r},${g},${b},0.05)`);
		mc.fillStyle = grad;
		mc.beginPath();
		// Half-plane beyond the front line, clipped to the minimap.
		const px = -dy,
			py = dx,
			fx = w / 2 + dx * edge,
			fy = h / 2 + dy * edge;
		mc.moveTo(fx + px * 400, fy + py * 400);
		mc.lineTo(fx - px * 400, fy - py * 400);
		mc.lineTo(fx - px * 400 + dx * 400, fy - py * 400 + dy * 400);
		mc.lineTo(fx + px * 400 + dx * 400, fy + py * 400 + dy * 400);
		mc.closePath();
		mc.fill();
		if (o.near || o.arriving) {
			mc.strokeStyle = `rgba(${r},${g},${b},0.9)`;
			mc.setLineDash([4, 3]);
			mc.lineWidth = 1.5;
			mc.beginPath();
			mc.moveTo(fx + px * 400, fy + py * 400);
			mc.lineTo(fx - px * 400, fy - py * 400);
			mc.stroke();
		}
		mc.restore();
	}
	return { shapes, drawShapes, drawPixi, handles, crater, craters, craterAlpha, stormEdge, stormMinimap };
})();
if (typeof window !== "undefined") window.FxArt = FxArt;
