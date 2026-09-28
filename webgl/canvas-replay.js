/* Canvas drawing replayed as native PixiJS objects (WebGL/WebGPU renderer).
   Map glow, map effects and the interface on the board (markers, rally flags, placement preview,
   selection box, vignette, sun, moon, stars, snow, lightning, sandstorm) are drawn by the same code
   as the Canvas board, but into a recording context instead of a canvas. The recording is turned
   into Pixi objects every frame — nothing is uploaded as a whole layer any more:
   - the transform (translate/scale/rotate/setTransform) is tracked; points are recorded already
     transformed, like a canvas does;
   - filled circles and ellipses → a sprite of a round texture; filled rectangles → a tinted sprite;
   - gradients: a soft round sprite for the simple radial glow; any other gradient (linear, several
     stops, inner radius, clipped) is painted once into a small cached texture;
   - other paths → PIXI.Graphics, filled or stroked, with dashes (and their offset) and an
     approximate shadow blur (a wider faint stroke underneath);
   - text → PIXI.Text objects shared by content and style; measureText uses a real canvas;
   - images (canvases) → sprites of cached textures;
   - "lighter" → additive blending; inside a group (the map glow, which the Canvas renderer drew into
     its own layer laid over the board) ordinary blending: identical where shapes do not overlap and
     a second-order difference where they do, without an extra full-screen pass.
   Anything the recorder cannot reproduce marks the frame as unsupported; the renderer then keeps
   drawing that phase through its Canvas layer for that frame. */
function createCanvasReplay(settings) {
	"use strict";
	const options = settings || {};
	const TAU = Math.PI * 2;
	const container = new PIXI.Container();
	let frame = 0;

	const mipmapped = (c) => new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: c, autoGenerateMipmaps: true, scaleMode: "linear", mipmapFilter: "linear" }) });
	const round = (() => {
		const c = document.createElement("canvas");
		c.width = c.height = 256;
		const x = c.getContext("2d");
		x.fillStyle = "#fff";
		x.beginPath();
		x.arc(128, 128, 127, 0, TAU);
		x.fill();
		return mipmapped(c);
	})();
	const soft = (() => {
		const c = document.createElement("canvas");
		c.width = c.height = 256;
		const x = c.getContext("2d"),
			g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
		g.addColorStop(0, "rgba(255,255,255,1)");
		g.addColorStop(1, "rgba(255,255,255,0)");
		x.fillStyle = g;
		x.fillRect(0, 0, 256, 256);
		return mipmapped(c);
	})();
	const measure = document.createElement("canvas").getContext("2d");

	// Colours: "#rgb", "#rrggbb", "#rrggbbaa", "rgb()", "rgba()" → { color, alpha }.
	// rgb()/rgba() are parsed directly (the art builds new ones every frame, e.g. pulsing alpha) and are not
	// cached; the cache of the rest is bounded, so a long game cannot grow it without limit.
	const colours = new Map();
	function colour(value) {
		if (typeof value !== "string") return null;
		if (value.charCodeAt(0) === 114 /* r */) {
			const open = value.indexOf("("),
				parts = value.slice(open + 1, value.lastIndexOf(")")).split(",");
			if (open < 0 || parts.length < 3 || parts.length > 4) return null;
			const [r, g, b] = parts.map((p) => Math.round(+p)),
				alpha = parts.length === 4 ? +parts[3] : 1;
			if ([r, g, b, alpha].some((n) => !Number.isFinite(n))) return null;
			return { color: (r << 16) | (g << 8) | b, alpha };
		}
		let hit = colours.get(value);
		if (hit !== undefined) return hit;
		hit = null;
		const s = value.trim();
		let m;
		if ((m = /^#([0-9a-f]{3})$/i.exec(s))) {
			const [r, g, b] = [...m[1]].map((h) => parseInt(h + h, 16));
			hit = { color: (r << 16) | (g << 8) | b, alpha: 1 };
		} else if ((m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s))) hit = { color: parseInt(m[1], 16), alpha: m[2] ? parseInt(m[2], 16) / 255 : 1 };
		if (colours.size > 2000) colours.clear();
		colours.set(value, hit);
		return hit;
	}

	// ——— Recording ———
	let items = [],
		unsupported = "",
		path = [],
		state = null,
		stack = [];
	const canvasSize = { width: 1, height: 1 };
	const fresh = () => ({
		fillStyle: "#000",
		strokeStyle: "#000",
		lineWidth: 1,
		globalAlpha: 1,
		globalCompositeOperation: "source-over",
		font: "10px sans-serif",
		textAlign: "start",
		textBaseline: "alphabetic",
		lineDash: [],
		lineDashOffset: 0,
		shadowBlur: 0,
		shadowColor: "rgba(0,0,0,0)",
		lineCap: "butt",
		lineJoin: "miter",
		m: [1, 0, 0, 1, 0, 0],
		clip: null,
	});
	const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
	const multiply = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
	const plain = (m) => Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9;
	const spread = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
	function arcPoints(x, y, rx, ry, rot, a0, a1, ccw) {
		if (!ccw && a1 < a0) a1 += TAU * Math.ceil((a0 - a1) / TAU);
		if (ccw && a0 < a1) a0 += TAU * Math.ceil((a1 - a0) / TAU);
		const span = Math.min(TAU, Math.abs(a1 - a0)),
			dir = ccw ? -1 : 1,
			size = Math.max(rx, ry) * spread(state.m),
			n = Math.max(8, Math.ceil((span / TAU) * Math.min(128, 12 + size * 0.8))),
			cos = Math.cos(rot),
			sin = Math.sin(rot),
			out = [];
		for (let i = 0; i <= n; i++) {
			const a = a0 + dir * span * (i / n),
				px = Math.cos(a) * rx,
				py = Math.sin(a) * ry;
			out.push(apply(state.m, x + px * cos - py * sin, y + px * sin + py * cos));
		}
		return out;
	}
	function arcSegment(x, y, rx, ry, rot, a0, a1, ccw) {
		const seg = { t: "pts", pts: arcPoints(x, y, rx, ry, rot, a0, a1, ccw) };
		// A whole circle or axis-aligned ellipse under a plain transform can become one sprite.
		if (!rot && Math.abs(a1 - a0) >= TAU - 1e-6 && plain(state.m)) {
			const [cx, cy] = apply(state.m, x, y);
			seg.round = { x: cx, y: cy, rx: Math.abs(rx * state.m[0]), ry: Math.abs(ry * state.m[3]) };
		}
		return seg;
	}
	const known = {
		save() {
			stack.push({ ...state, m: state.m.slice(), lineDash: state.lineDash.slice() });
		},
		restore() {
			if (stack.length) state = stack.pop();
		},
		setTransform(a, b, c, d, e, f) {
			state.m = typeof a === "object" ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b, c, d, e, f];
		},
		resetTransform() {
			state.m = [1, 0, 0, 1, 0, 0];
		},
		transform(a, b, c, d, e, f) {
			state.m = multiply(state.m, [a, b, c, d, e, f]);
		},
		translate(x, y) {
			state.m = multiply(state.m, [1, 0, 0, 1, x, y]);
		},
		scale(x, y) {
			state.m = multiply(state.m, [x, 0, 0, y, 0, 0]);
		},
		rotate(a) {
			state.m = multiply(state.m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
		},
		beginPath() {
			path = [];
		},
		closePath() {
			path.push({ t: "close" });
		},
		moveTo(x, y) {
			path.push({ t: "move", p: apply(state.m, x, y) });
		},
		lineTo(x, y) {
			path.push({ t: "line", p: apply(state.m, x, y) });
		},
		quadraticCurveTo(cx, cy, x, y) {
			path.push({ t: "quad", c: apply(state.m, cx, cy), p: apply(state.m, x, y) });
		},
		bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
			path.push({ t: "bez", c1: apply(state.m, c1x, c1y), c2: apply(state.m, c2x, c2y), p: apply(state.m, x, y) });
		},
		arc(x, y, r, a0, a1, ccw) {
			path.push(arcSegment(x, y, r, r, 0, a0, a1, !!ccw));
		},
		ellipse(x, y, rx, ry, rot, a0, a1, ccw) {
			path.push(arcSegment(x, y, rx, ry, rot || 0, a0, a1, !!ccw));
		},
		rect(x, y, w, h) {
			path.push({ t: "move", p: apply(state.m, x, y) }, { t: "line", p: apply(state.m, x + w, y) }, { t: "line", p: apply(state.m, x + w, y + h) }, { t: "line", p: apply(state.m, x, y + h) }, { t: "close" });
		},
		fill() {
			items.push({ k: "fill", path: path.slice(), style: state.fillStyle, alpha: state.globalAlpha, op: state.globalCompositeOperation, m: state.m, clip: state.clip });
		},
		stroke() {
			const k = spread(state.m);
			items.push({
				k: "stroke",
				path: path.slice(),
				style: state.strokeStyle,
				width: state.lineWidth * k,
				dash: state.lineDash.map((d) => d * k),
				dashOffset: state.lineDashOffset * k,
				shadow: state.shadowBlur > 0 ? { blur: state.shadowBlur, color: state.shadowColor } : null,
				alpha: state.globalAlpha,
				op: state.globalCompositeOperation,
				clip: state.clip,
			});
		},
		fillRect(x, y, w, h) {
			if (plain(state.m)) {
				const [ax, ay] = apply(state.m, x, y),
					[bx, by] = apply(state.m, x + w, y + h);
				items.push({ k: "rect", x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay), style: state.fillStyle, alpha: state.globalAlpha, op: state.globalCompositeOperation, m: state.m, clip: state.clip });
			} else {
				const keep = path;
				path = [];
				known.rect(x, y, w, h);
				known.fill();
				path = keep;
			}
		},
		strokeRect(x, y, w, h) {
			const keep = path;
			path = [];
			known.rect(x, y, w, h);
			known.stroke();
			path = keep;
		},
		clearRect() {},
		clip() {
			state.clip = path.slice();
		},
		fillText(text, x, y) {
			if (!plain(state.m)) return void (unsupported ||= "rotated text");
			const [px, py] = apply(state.m, x, y);
			items.push({ k: "text", text: String(text), x: px, y: py, scale: Math.abs(state.m[0]), font: state.font, align: state.textAlign, baseline: state.textBaseline, style: state.fillStyle, alpha: state.globalAlpha, op: state.globalCompositeOperation });
		},
		measureText(text) {
			measure.font = state.font;
			return measure.measureText(text);
		},
		drawImage(image, ...args) {
			if (args.length !== 2 && args.length !== 4) return void (unsupported ||= "drawImage (9)");
			if (!plain(state.m)) return void (unsupported ||= "rotated drawImage");
			const [x, y] = args,
				w = args.length === 4 ? args[2] : image.width,
				h = args.length === 4 ? args[3] : image.height,
				[ax, ay] = apply(state.m, x, y),
				[bx, by] = apply(state.m, x + w, y + h);
			items.push({ k: "image", image, x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay), alpha: state.globalAlpha, op: state.globalCompositeOperation, clip: state.clip });
		},
		createRadialGradient(x0, y0, r0, x1, y1, r1) {
			const gradient = { radial: true, x0, y0, r0, x1, y1, r1, stops: [] };
			gradient.addColorStop = (at, value) => gradient.stops.push([at, value]);
			return gradient;
		},
		createLinearGradient(x0, y0, x1, y1) {
			const gradient = { linear: true, x0, y0, x1, y1, stops: [] };
			gradient.addColorStop = (at, value) => gradient.stops.push([at, value]);
			return gradient;
		},
		setLineDash(list) {
			state.lineDash = (list || []).slice();
		},
		getLineDash() {
			return state.lineDash.slice();
		},
	};
	const properties = new Set(["fillStyle", "strokeStyle", "lineWidth", "globalAlpha", "globalCompositeOperation", "font", "textAlign", "textBaseline", "lineDashOffset", "shadowBlur", "shadowColor", "lineCap", "lineJoin"]),
		ignored = new Set(["imageSmoothingEnabled", "imageSmoothingQuality", "miterLimit", "shadowOffsetX", "shadowOffsetY", "filter"]);
	// Known methods and properties are the context's own fields (fast); only names it does not know reach
	// the proxy behind it, which marks the frame as unsupported (reading as well as assigning them).
	const trap = new Proxy(
		{},
		{
			get(_, name) {
				if (typeof name === "symbol") return undefined;
				// Anything else (putImageData, isPointInPath, createPattern, strokeText…) is not replayable.
				unsupported ||= String(name);
				return () => ({ addColorStop() {} });
			},
			set(_, name) {
				if (!ignored.has(name)) unsupported ||= String(name);
				return true;
			},
		},
	);
	const ctx = Object.create(trap);
	// Defined, not assigned: an assignment would go to the trap behind the context.
	for (const [name, fn] of Object.entries(known)) Object.defineProperty(ctx, name, { value: fn });
	for (const name of properties)
		Object.defineProperty(ctx, name, {
			get: () => state[name],
			set: (value) => (state[name] = value),
		});
	for (const name of ignored) Object.defineProperty(ctx, name, { get: () => undefined, set() {} });
	Object.defineProperty(ctx, "canvas", { value: canvasSize });

	// ——— Replay ———
	const sprites = [],
		graphics = [];
	let usedSprites = 0,
		usedGraphics = 0,
		current = null,
		order = [];
	function sprite(texture, blend) {
		let sp = sprites[usedSprites++];
		if (!sp) sprites.push((sp = new PIXI.Sprite(texture)));
		if (sp.texture !== texture) sp.texture = texture;
		if (sp.blendMode !== blend) sp.blendMode = blend;
		order.push(sp);
		current = null;
		return sp;
	}
	function pen(blend) {
		if (current && current.blendMode === blend) return current;
		let g = graphics[usedGraphics++];
		if (!g) graphics.push((g = new PIXI.Graphics()));
		g.clear();
		g.blendMode = blend;
		order.push(g);
		current = g;
		return g;
	}
	// Path → polylines (curves flattened), for dashes, clip tests and painted fills.
	function polylines(list) {
		const out = [];
		let line = null,
			start = null,
			last = null;
		const begin = (p) => {
			line = [p[0], p[1]];
			out.push(line);
			start = last = p;
		};
		for (const s of list) {
			if (s.t === "move") begin(s.p);
			else if (s.t === "line") {
				if (!line) begin(s.p);
				else line.push(s.p[0], s.p[1]), (last = s.p);
			} else if (s.t === "quad" || s.t === "bez") {
				if (!line) begin(last || s.p);
				const from = last || s.p;
				for (let i = 1; i <= 12; i++) {
					const t = i / 12,
						u = 1 - t;
					if (s.t === "quad") line.push(u * u * from[0] + 2 * u * t * s.c[0] + t * t * s.p[0], u * u * from[1] + 2 * u * t * s.c[1] + t * t * s.p[1]);
					else
						line.push(
							u * u * u * from[0] + 3 * u * u * t * s.c1[0] + 3 * u * t * t * s.c2[0] + t * t * t * s.p[0],
							u * u * u * from[1] + 3 * u * u * t * s.c1[1] + 3 * u * t * t * s.c2[1] + t * t * t * s.p[1],
						);
				}
				last = s.p;
			} else if (s.t === "pts") {
				if (!line) begin(s.pts[0]);
				else line.push(s.pts[0][0], s.pts[0][1]);
				for (let i = 1; i < s.pts.length; i++) line.push(s.pts[i][0], s.pts[i][1]);
				last = s.pts[s.pts.length - 1];
			} else if (s.t === "close" && line && start) {
				line.push(start[0], start[1]);
				last = start;
				line = null;
			}
		}
		return out;
	}
	function trace(g, list) {
		let open = false,
			last = null;
		for (const s of list) {
			if (s.t === "move") {
				g.moveTo(s.p[0], s.p[1]);
				open = true;
				last = s.p;
			} else if (s.t === "line") {
				if (open) g.lineTo(s.p[0], s.p[1]);
				else g.moveTo(s.p[0], s.p[1]), (open = true);
				last = s.p;
			} else if (s.t === "quad" || s.t === "bez") {
				if (!open) g.moveTo((last || s.p)[0], (last || s.p)[1]), (open = true);
				if (s.t === "quad") g.quadraticCurveTo(s.c[0], s.c[1], s.p[0], s.p[1]);
				else g.bezierCurveTo(s.c1[0], s.c1[1], s.c2[0], s.c2[1], s.p[0], s.p[1]);
				last = s.p;
			} else if (s.t === "pts") {
				if (!open) g.moveTo(s.pts[0][0], s.pts[0][1]), (open = true);
				else g.lineTo(s.pts[0][0], s.pts[0][1]);
				for (let i = 1; i < s.pts.length; i++) g.lineTo(s.pts[i][0], s.pts[i][1]);
				last = s.pts[s.pts.length - 1];
			} else if (s.t === "close" && open) {
				g.closePath();
				open = false;
			}
		}
	}
	function dashes(g, lines, pattern, offset) {
		const total = pattern.reduce((a, b) => a + b, 0);
		if (!(total > 0)) return;
		for (const line of lines) {
			let pos = ((offset % total) + total) % total,
				index = 0;
			while (pos >= pattern[index]) {
				pos -= pattern[index];
				index = (index + 1) % pattern.length;
			}
			let left = pattern[index] - pos;
			for (let i = 2; i < line.length; i += 2) {
				let ax = line[i - 2],
					ay = line[i - 1];
				const bx = line[i],
					by = line[i + 1];
				let len = Math.hypot(bx - ax, by - ay);
				while (len > 1e-9) {
					const step = Math.min(len, left),
						nx = ax + ((bx - ax) * step) / len,
						ny = ay + ((by - ay) * step) / len;
					if (index % 2 === 0) g.moveTo(ax, ay).lineTo(nx, ny);
					ax = nx;
					ay = ny;
					len -= step;
					left -= step;
					if (left <= 1e-9) {
						index = (index + 1) % pattern.length;
						left = pattern[index];
					}
				}
			}
		}
	}
	const boxOf = (lines) => {
		const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
		for (const l of lines)
			for (let i = 0; i < l.length; i += 2) {
				b.x0 = Math.min(b.x0, l[i]);
				b.y0 = Math.min(b.y0, l[i + 1]);
				b.x1 = Math.max(b.x1, l[i]);
				b.y1 = Math.max(b.y1, l[i + 1]);
			}
		return b;
	};
	// A clip is honoured by painting it (gradients), or accepted when the shape lies inside it.
	const inside = (box, clip) => {
		const c = boxOf(polylines(clip));
		return box.x0 >= c.x0 - 1 && box.y0 >= c.y0 - 1 && box.x1 <= c.x1 + 1 && box.y1 <= c.y1 + 1;
	};

	// Gradient fills painted once into a small texture and kept while in use.
	const painted = new Map();
	function paintedFill(key, box, draw) {
		let entry = painted.get(key);
		if (!entry) {
			const w = Math.max(1, box.x1 - box.x0),
				h = Math.max(1, box.y1 - box.y0),
				k = Math.min(1, 512 / Math.max(w, h)),
				c = document.createElement("canvas");
			c.width = Math.max(1, Math.ceil(w * k));
			c.height = Math.max(1, Math.ceil(h * k));
			const x = c.getContext("2d");
			x.setTransform(k, 0, 0, k, -box.x0 * k, -box.y0 * k);
			draw(x);
			entry = { texture: mipmapped(c) };
			painted.set(key, entry);
		}
		entry.used = frame;
		return entry.texture;
	}
	function gradientOf(x, g, m) {
		const p0 = apply(m, g.x0, g.y0),
			p1 = apply(m, g.x1, g.y1),
			k = spread(m),
			out = g.radial ? x.createRadialGradient(p0[0], p0[1], g.r0 * k, p1[0], p1[1], g.r1 * k) : x.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
		for (const [at, value] of g.stops) out.addColorStop(at, value);
		return out;
	}
	function traceCanvas(x, list) {
		x.beginPath();
		for (const line of polylines(list)) {
			x.moveTo(line[0], line[1]);
			for (let i = 2; i < line.length; i += 2) x.lineTo(line[i], line[i + 1]);
		}
	}
	// Cache key of a painted fill, relative to its box: the same look anywhere on screen shares a texture.
	function keyOf(g, m, box, shape, clip) {
		const r = (v) => Math.round(v * 2) / 2,
			p0 = apply(m, g.x0, g.y0),
			p1 = apply(m, g.x1, g.y1),
			k = spread(m),
			rel = (lines) => lines.map((l) => l.map((v, i) => r(v - (i % 2 ? box.y0 : box.x0))).join(",")).join(";");
		return [
			g.radial ? "r" : "l",
			r(p0[0] - box.x0),
			r(p0[1] - box.y0),
			r(p1[0] - box.x0),
			r(p1[1] - box.y0),
			g.radial ? r(g.r0 * k) + "," + r(g.r1 * k) : "",
			g.stops.map((s) => s.join(":")).join(","),
			r(box.x1 - box.x0),
			r(box.y1 - box.y0),
			shape ? rel(polylines(shape)) : "",
			clip ? rel(polylines(clip)) : "",
		].join("|");
	}

	// Text objects, shared by content and style; drawn at the size they appear, so they stay sharp.
	const texts = new Map();
	function text(it, blend) {
		const c = colour(it.style),
			m = /(bold\s+)?(\d+(?:\.\d+)?)px\s+(.+)$/.exec(it.font || "");
		if (!c || !m) return false;
		const size = Math.max(1, Math.round(+m[2] * it.scale * 2) / 2),
			key = [it.text, m[1] ? "b" : "", size, m[3], c.color].join("|");
		let entry = texts.get(key);
		if (!entry) {
			const family = m[3].replace(/["']/g, ""),
				t = new PIXI.Text({ text: it.text, style: { fontFamily: family.split(",").map((f) => f.trim()), fontSize: size, fontWeight: m[1] ? "bold" : "normal", fill: c.color }, resolution: 1 });
			let ascent = size * 0.8;
			try {
				ascent = PIXI.CanvasTextMetrics.measureFont(`${m[1] ? "bold " : ""}${size}px ${family}`).ascent;
			} catch {}
			entry = { t, ascent };
			texts.set(key, entry);
		}
		entry.used = frame;
		const t = entry.t,
			anchorX = it.align === "center" ? 0.5 : it.align === "right" || it.align === "end" ? 1 : 0,
			top = it.baseline === "top" ? it.y : it.baseline === "middle" ? it.y - t.height / 2 : it.baseline === "bottom" ? it.y - t.height : it.y - entry.ascent;
		t.anchor.set(anchorX, 0);
		t.position.set(it.x, top);
		t.alpha = c.alpha * it.alpha;
		if (t.blendMode !== blend) t.blendMode = blend;
		order.push(t);
		current = null;
		return true;
	}

	const images = new WeakMap();
	const imageTexture = (image) => {
		let t = images.get(image);
		if (!t) images.set(image, (t = PIXI.Texture.from(image)));
		return t;
	};
	function placeSprite(texture, blend, box, tint, alpha) {
		const sp = sprite(texture, blend);
		sp.position.set(box.x0, box.y0);
		sp.width = box.x1 - box.x0;
		sp.height = box.y1 - box.y0;
		sp.tint = tint;
		sp.alpha = alpha;
		return sp;
	}

	function replay() {
		order = [];
		usedSprites = 0;
		usedGraphics = 0;
		current = null;
		for (const it of items) {
			const blend = it.op === "lighter" ? (options.group ? "normal" : "add") : it.op === "source-over" ? "normal" : null;
			if (!blend) return (unsupported ||= "globalCompositeOperation " + it.op), false;
			if (it.k === "text") {
				if (!text(it, blend)) return (unsupported ||= "font " + it.font), false;
				continue;
			}
			if (it.k === "image") {
				const box = { x0: it.x, y0: it.y, x1: it.x + it.w, y1: it.y + it.h };
				if (it.clip && !inside(box, it.clip)) return (unsupported ||= "clipped image"), false;
				placeSprite(imageTexture(it.image), blend, box, 0xffffff, it.alpha);
				continue;
			}
			if (it.k === "rect") {
				const g = it.style,
					box = { x0: it.x, y0: it.y, x1: it.x + it.w, y1: it.y + it.h };
				if (g && typeof g === "object") {
					const stops = g.stops.slice().sort((a, b) => a[0] - b[0]),
						a = colour(stops[0]?.[1]),
						b = colour(stops[1]?.[1]);
					// The common soft glow: one radial gradient from a colour to nothing, filling its square.
					if (g.radial && !it.clip && stops.length === 2 && !g.r0 && g.x0 === g.x1 && g.y0 === g.y1 && a && b && stops[0][0] === 0 && stops[1][0] === 1 && b.alpha <= 0.002 && Math.abs(it.m[0] - it.m[3]) < 1e-9) {
						const [cx, cy] = apply(it.m, g.x1, g.y1),
							r = g.r1 * Math.abs(it.m[0]);
						if (it.x <= cx - r + 0.5 && it.y <= cy - r + 0.5 && it.x + it.w >= cx + r - 0.5 && it.y + it.h >= cy + r - 0.5) {
							placeSprite(soft, blend, { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }, a.color, a.alpha * it.alpha);
							continue;
						}
					}
					// Any other gradient: painted once (with its clip) into a cached texture.
					const texture = paintedFill(keyOf(g, it.m, box, null, it.clip), box, (x) => {
						if (it.clip) traceCanvas(x, it.clip), x.clip();
						x.fillStyle = gradientOf(x, g, it.m);
						x.fillRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
					});
					placeSprite(texture, blend, box, 0xffffff, it.alpha);
					continue;
				}
				const c = colour(g);
				if (!c) return (unsupported ||= "fillStyle"), false;
				if (it.clip && !inside(box, it.clip)) return (unsupported ||= "clipped rectangle"), false;
				placeSprite(PIXI.Texture.WHITE, blend, box, c.color, c.alpha * it.alpha);
				continue;
			}
			const lines = polylines(it.path);
			if (!lines.length) continue;
			if (it.clip && !inside(boxOf(lines), it.clip)) return (unsupported ||= "clipped path"), false;
			if (it.k === "fill" && it.style && typeof it.style === "object") {
				const box = boxOf(lines),
					texture = paintedFill(keyOf(it.style, it.m, box, it.path, null), box, (x) => {
						traceCanvas(x, it.path);
						x.fillStyle = gradientOf(x, it.style, it.m);
						x.fill();
					});
				placeSprite(texture, blend, box, 0xffffff, it.alpha);
				continue;
			}
			const c = colour(it.style);
			if (!c) return (unsupported ||= it.k + "Style"), false;
			const alpha = c.alpha * it.alpha;
			if (it.k === "fill" && it.path.length <= 2 && it.path[0].round && (!it.path[1] || it.path[1].t === "close")) {
				const s = it.path[0].round;
				placeSprite(round, blend, { x0: s.x - s.rx, y0: s.y - s.ry, x1: s.x + s.rx, y1: s.y + s.ry }, c.color, alpha);
				continue;
			}
			if (it.k === "fill") {
				const g = pen(blend);
				trace(g, it.path);
				g.fill({ color: c.color, alpha });
				continue;
			}
			// Stroke: optional shadow blur (a wider faint stroke underneath), then dashes or the path.
			if (it.shadow) {
				const s = colour(it.shadow.color);
				if (s && s.alpha > 0) {
					const g = pen(blend);
					trace(g, it.path);
					g.stroke({ width: it.width + it.shadow.blur, color: s.color, alpha: s.alpha * it.alpha * 0.35, cap: "round", join: "round" });
				}
			}
			const g = pen(blend);
			if (it.dash.length && it.dash.some((d) => d > 0)) dashes(g, lines, it.dash.length % 2 ? it.dash.concat(it.dash) : it.dash, it.dashOffset);
			else trace(g, it.path);
			g.stroke({ width: it.width, color: c.color, alpha });
		}
		// Re-attach only when the sequence of objects changed (the pools keep it stable frame to frame).
		const kids = container.children;
		if (kids.length !== order.length || order.some((o, i) => kids[i] !== o)) {
			container.removeChildren();
			if (order.length) container.addChild(...order);
		}
		return true;
	}
	function release() {
		if (frame % 120) return;
		for (const [key, entry] of painted)
			if (frame - entry.used > 300) {
				entry.texture.destroy(true);
				painted.delete(key);
			}
		for (const [key, entry] of texts)
			if (frame - entry.used > 300) {
				if (entry.t.parent) entry.t.parent.removeChild(entry.t);
				entry.t.destroy(true);
				texts.delete(key);
			}
	}

	return {
		container,
		// Runs a Canvas drawing function against the recorder and shows the result natively.
		// size: the canvas size the drawing expects (ctx.canvas.width / height).
		// false: something could not be replayed (the reason is in .unsupported) and nothing is shown.
		run(draw, size) {
			frame++;
			items = [];
			unsupported = "";
			path = [];
			state = fresh();
			stack = [];
			if (size) Object.assign(canvasSize, size);
			let ok = false;
			try {
				draw(ctx);
				ok = !unsupported && replay();
			} catch (error) {
				// A drawing or replay error counts like an unsupported operation: the phase uses its Canvas layer.
				unsupported ||= "error: " + (error?.message || error);
				ok = false;
			}
			container.visible = ok;
			release();
			return ok;
		},
		get unsupported() {
			return unsupported;
		},
		stats: () => ({ items: items.length, sprites: usedSprites, graphics: usedGraphics, texts: texts.size, painted: painted.size }),
	};
}
