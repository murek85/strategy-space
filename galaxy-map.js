/* Campaign galaxy map: a spiral galaxy with the frontier's star systems. Every world orbits its own sun and is
   drawn procedurally from its climate (a rotating surface texture, shading, atmosphere), with rings, moons or
   asteroid belts where they belong. The campaign route links the chapters; the menu lists them beside the map.
   Usage: const map = new GalaxyMap(canvas, { chapters, onSelect, reduced }); map.focus(name); map.select(name); map.destroy(). */
const GalaxyMap = (() => {
	const TAU = Math.PI * 2;
	// Worlds of the frontier: position in the frame (0..1), climate, size and features.
	const WORLDS = {
		Eos: { x: 0.09, y: 0.7, climate: "dust", size: 1, sun: "#ffd98a", moons: 1, text: "Pustynny świat pierwszych kolonistów: wydmy, kratery i poligon Liry." },
		Vesper: { x: 0.23, y: 0.34, climate: "ice", size: 1.15, sun: "#cfe4ff", rings: true, text: "Skuty lodem świat z pierścieniami; pod lodem archiwum dawnej sieci." },
		Nadir: { x: 0.35, y: 0.74, climate: "ash", size: 0.95, sun: "#ffb27a", text: "Szary, wulkaniczny świat Cytadeli Węzła." },
		"Khepri IV": { x: 0.46, y: 0.3, climate: "dune", size: 1.05, sun: "#ffe0a0", moons: 2, text: "Morze wydm i pola jam paszczaków." },
		"Vulkan IX": { x: 0.585, y: 0.7, climate: "lava", size: 1.1, sun: "#ff9a6a", belt: true, text: "Ognisty świat kompleksu Hefajstos, otoczony pasem asteroid." },
		"Lumeria V": { x: 0.7, y: 0.3, climate: "jungle", size: 1.05, sun: "#bff5ff", moons: 1, text: "Świecąca dżungla — tu Rój przebudził się po raz pierwszy." },
		Nivalis: { x: 0.8, y: 0.66, climate: "frost", size: 0.95, sun: "#d8ecff", moons: 2, text: "Biały Przesmyk: lodowa przełęcz i garnizon Dominium." },
		Pyrrhos: { x: 0.915, y: 0.3, climate: "magma", size: 1.1, sun: "#ff7a52", belt: true, text: "Rzeki magmy — i bijące pod nimi Serce Roju." },
		"Helion II": { x: 0.14, y: 0.14, climate: "gold", size: 0.9, sun: "#fff0b0", text: "Słoneczna dolina złotych piasków." },
		Aerion: { x: 0.58, y: 0.15, climate: "sky", size: 1, sun: "#e0f0ff", rings: true, text: "Świat chmur i wiszących szczytów." },
		Kessar: { x: 0.45, y: 0.83, climate: "twin", size: 0.95, sun: "#ffd0a0", twin: true, text: "Wydmy pod dwoma słońcami i wrak krążownika." },
	};
	const CLIMATE = {
		dust: { name: "pustynny", atmo: "#f6c982" },
		dune: { name: "pustynny, morze wydm", atmo: "#f0c07a" },
		gold: { name: "słoneczny, złote piaski", atmo: "#ffe19a" },
		twin: { name: "pustynny, dwa słońca", atmo: "#ffb98a" },
		ice: { name: "lodowy", atmo: "#bfe3ff" },
		frost: { name: "mroźny", atmo: "#d5ecff" },
		ash: { name: "wulkaniczny, popiół", atmo: "#c9a39a" },
		lava: { name: "wulkaniczny, lawa", atmo: "#ff9a6a" },
		magma: { name: "rzeki magmy", atmo: "#ff7a52" },
		jungle: { name: "dżungla, bioluminescencja", atmo: "#8ff0d0" },
		sky: { name: "chmury, wiszące szczyty", atmo: "#cfe6ff" },
	};
	const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
	const hash = (s) => Array.from(s).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

	// Surface texture (equirectangular strip, 2:1), drawn once per world.
	function surface(name, w) {
		const W = 256,
			H = 128,
			c = document.createElement("canvas");
		c.width = W;
		c.height = H;
		const g = c.getContext("2d"),
			rand = seeded(hash(name)),
			fill = (color) => {
				g.fillStyle = color;
				g.fillRect(0, 0, W, H);
			},
			blob = (x, y, r, color) => {
				for (const dx of [-W, 0, W]) {
					g.fillStyle = color;
					g.beginPath();
					g.ellipse(x + dx, y, r, r * 0.7, 0, 0, TAU);
					g.fill();
				}
			},
			band = (y, h, color, wave = 4) => {
				g.fillStyle = color;
				g.beginPath();
				g.moveTo(0, y);
				for (let x = 0; x <= W; x += 8) g.lineTo(x, y + Math.sin((x / W) * TAU * 2 + y) * wave);
				for (let x = W; x >= 0; x -= 8) g.lineTo(x, y + h + Math.sin((x / W) * TAU * 3 + y) * wave);
				g.fill();
			},
			crack = (color, width, n, len) => {
				g.strokeStyle = color;
				g.lineWidth = width;
				g.lineCap = "round";
				for (let i = 0; i < n; i++) {
					let x = rand() * W,
						y = 15 + rand() * (H - 30);
					g.beginPath();
					g.moveTo(x, y);
					for (let k = 0; k < len; k++) {
						x += (rand() - 0.3) * 16;
						y += (rand() - 0.5) * 10;
						g.lineTo(x, y);
					}
					g.stroke();
				}
			},
			vertical = (top, bottom) => {
				const grad = g.createLinearGradient(0, 0, 0, H);
				grad.addColorStop(0, top);
				grad.addColorStop(1, bottom);
				g.fillStyle = grad;
				g.fillRect(0, 0, W, H);
			};
		const k = w.climate;
		if (k === "dust" || k === "dune" || k === "gold" || k === "twin") {
			const pal = { dust: ["#d8a864", "#a8723e", "#e9c48a"], dune: ["#e2b070", "#b98548", "#f2cf94"], gold: ["#f0cf7a", "#c9a24e", "#fff0b8"], twin: ["#e6a47a", "#b36c4a", "#f5cfae"] }[k];
			vertical(pal[0], pal[1]);
			for (let i = 0; i < 9; i++) band(8 + i * 13 + rand() * 4, 3 + rand() * 4, i % 2 ? pal[2] + "55" : pal[1] + "66", 3 + rand() * 4);
			for (let i = 0; i < 14; i++) {
				const x = rand() * W,
					y = 12 + rand() * (H - 24),
					r = 2 + rand() * 6;
				blob(x, y, r, pal[1] + "aa");
				blob(x - r * 0.3, y - r * 0.3, r * 0.6, pal[2] + "66");
			}
			if (k === "twin") for (let i = 0; i < 4; i++) blob(rand() * W, 30 + rand() * 70, 10 + rand() * 12, "#fff1e080");
		} else if (k === "ice" || k === "frost") {
			vertical(k === "ice" ? "#e8f2fa" : "#f2f8ff", k === "ice" ? "#9fbfd8" : "#b8cfe2");
			for (let i = 0; i < 18; i++) blob(rand() * W, 10 + rand() * (H - 20), 4 + rand() * 12, k === "ice" ? "#b5d2e866" : "#cfe0f066");
			crack(k === "ice" ? "#7aa8c8" : "#8fb5d3", 1.2, 14, 7);
			if (k === "frost") for (let i = 0; i < 8; i++) blob(rand() * W, 30 + rand() * 60, 2 + rand() * 3, "#9a86d8aa");
			g.fillStyle = "#ffffff";
			g.fillRect(0, 0, W, 10);
			g.fillRect(0, H - 10, W, 10);
		} else if (k === "ash" || k === "lava" || k === "magma") {
			vertical(k === "magma" ? "#2a1a1a" : "#5a4a50", k === "magma" ? "#140c0e" : "#2e252b");
			for (let i = 0; i < 16; i++) blob(rand() * W, 10 + rand() * (H - 20), 5 + rand() * 12, k === "ash" ? "#6b5e6488" : "#1a121488");
			if (k !== "ash") {
				g.shadowColor = "#ff7a2a";
				g.shadowBlur = 6;
			}
			crack(k === "magma" ? "#ffb347" : k === "lava" ? "#ff7a3a" : "#c07050", k === "magma" ? 3 : 1.6, k === "magma" ? 12 : 9, 8);
			if (k === "magma") crack("#fff0a0", 1, 8, 6);
			g.shadowBlur = 0;
		} else if (k === "jungle") {
			vertical("#1d5a4a", "#123c34");
			for (let i = 0; i < 40; i++) blob(rand() * W, 8 + rand() * (H - 16), 3 + rand() * 9, ["#2c7a5a88", "#1a4a3a88", "#3a8a6a66"][i % 3]);
			for (let i = 0; i < 60; i++) blob(rand() * W, 8 + rand() * (H - 16), 0.8 + rand() * 1.2, "#8ffcf0");
		} else if (k === "sky") {
			vertical("#9cc8f0", "#5a8ac0");
			for (let i = 0; i < 10; i++) blob(rand() * W, 20 + rand() * 90, 3 + rand() * 5, "#6a8a5a");
			for (let i = 0; i < 8; i++) band(6 + i * 15 + rand() * 5, 4 + rand() * 5, "#ffffff88", 5);
		}
		return c;
	}
	// A separate cloud layer for worlds with weather, drifting faster than the ground.
	function clouds(name, w) {
		if (!["jungle", "sky", "ice", "dune", "frost"].includes(w.climate)) return null;
		const c = document.createElement("canvas");
		c.width = 256;
		c.height = 128;
		const g = c.getContext("2d"),
			rand = seeded(hash(name) + 99);
		g.fillStyle = w.climate === "dune" ? "#f7e2bd" : "#ffffff";
		for (let i = 0; i < (w.climate === "sky" ? 26 : 14); i++) {
			const x = rand() * 256,
				y = 14 + rand() * 100,
				r = 4 + rand() * 10;
			g.globalAlpha = 0.25 + rand() * 0.3;
			for (const dx of [-256, 0, 256]) {
				g.beginPath();
				g.ellipse(x + dx, y, r * 2.2, r * 0.6, 0, 0, TAU);
				g.fill();
			}
		}
		return c;
	}

	class Map {
		constructor(canvas, options = {}) {
			this.canvas = canvas;
			this.c = canvas.getContext("2d");
			this.chapters = options.chapters || [];
			this.onSelect = options.onSelect || (() => {});
			this.reduced = !!options.reduced;
			this.hover = null;
			this.focused = null;
			this.selected = null;
			this.time = 0;
			// The camera (focus point as a fraction of the map, zoom) eases towards the chosen world; the pointer
			// shifts the deeper layers a little (parallax). Insets keep the worlds clear of the cards over the map.
			this.cam = { x: 0.5, y: 0.5, z: 1 };
			this.goal = { x: 0.5, y: 0.5, z: 1 };
			this.tilt = { x: 0, y: 0, tx: 0, ty: 0 };
			this.insets = { l: 0, r: 0 };
			this.portrait = null;
			this.worlds = Object.entries(WORLDS).map(([name, w]) => {
				const r = seeded(hash(name) + 3);
				return { name, ...w, phase: r() * TAU, orbit: 0.05 + r() * 0.012, speed: 0.02 + r() * 0.03, spin: 6 + r() * 6, tilt: -0.35 + r() * 0.7, tex: surface(name, w), sky: clouds(name, w) };
			});
			this.resize();
			this.onResize = () => this.resize();
			window.addEventListener("resize", this.onResize);
			if (typeof ResizeObserver !== "undefined") {
				this.observer = new ResizeObserver(() => this.canvas.clientWidth && Math.abs(this.canvas.clientWidth - this.w) + Math.abs(this.canvas.clientHeight - this.h) > 2 && this.resize());
				this.observer.observe(this.canvas);
			}
			canvas.addEventListener("pointermove", (this.onMove = (e) => this.pointer(e, false)));
			canvas.addEventListener("pointerleave", (this.onLeave = () => ((this.hover = null), this.draw())));
			canvas.addEventListener("click", (this.onClick = (e) => this.pointer(e, true)));
			this.last = performance.now();
			const loop = (now) => {
				const dt = Math.min(0.05, (now - this.last) / 1000);
				this.time += dt;
				this.last = now;
				const k = 1 - Math.exp(-dt * 3);
				for (const a of ["x", "y", "z"]) this.cam[a] += (this.goal[a] - this.cam[a]) * k;
				this.tilt.x += (this.tilt.tx - this.tilt.x) * k;
				this.tilt.y += (this.tilt.ty - this.tilt.y) * k;
				this.draw();
				this.frame = requestAnimationFrame(loop);
			};
			if (this.reduced) this.draw();
			else this.frame = requestAnimationFrame(loop);
		}
		destroy() {
			cancelAnimationFrame(this.frame);
			this.observer?.disconnect();
			window.removeEventListener("resize", this.onResize);
			this.canvas.removeEventListener("pointermove", this.onMove);
			this.canvas.removeEventListener("pointerleave", this.onLeave);
			this.canvas.removeEventListener("click", this.onClick);
		}
		resize() {
			// The map fills its box (any proportions); worlds are placed relative to it.
			const dpr = Math.min(window.devicePixelRatio || 1, 2),
				w = Math.max(320, this.canvas.clientWidth || 760),
				h = Math.max(200, this.canvas.clientHeight || Math.round(w * 0.5));
			this.canvas.width = Math.round(w * dpr);
			this.canvas.height = Math.round(h * dpr);
			this.w = w;
			this.h = h;
			this.dpr = dpr;
			this.backdrop = this.paintBackdrop();
			this.dust = this.paintDust();
			this.aim();
			this.draw();
		}
		// The nearer layer: dark dust lanes, bright wisps and the brightest stars (moves more with the camera).
		paintDust() {
			const c = document.createElement("canvas");
			c.width = this.canvas.width;
			c.height = this.canvas.height;
			const g = c.getContext("2d"),
				W = c.width,
				H = c.height,
				rand = seeded(20261007);
			g.filter = `blur(${Math.round(14 * this.dpr)}px)`;
			for (let i = 0; i < 90; i++) {
				const t = i / 90,
					a = Math.PI * 0.5 + t * 4.2,
					r = t * W * 0.6,
					x = W * 0.5 + Math.cos(a) * r + (rand() - 0.5) * W * 0.05,
					y = H * 0.5 + Math.sin(a) * r * 0.55 + (rand() - 0.5) * H * 0.06,
					s = (14 + rand() * 30) * (W / 1500);
				g.fillStyle = i % 3 ? "rgba(2,4,10,0.35)" : "rgba(120,180,255,0.07)";
				g.beginPath();
				g.ellipse(x, y, s * 2.2, s, a, 0, TAU);
				g.fill();
			}
			g.filter = "none";
			for (let i = 0; i < 120; i++) {
				const x = rand() * W,
					y = rand() * H,
					s = (0.8 + rand() * 1.4) * this.dpr,
					glow = g.createRadialGradient(x, y, 0, x, y, s * 4);
				glow.addColorStop(0, "rgba(255,255,255,0.9)");
				glow.addColorStop(0.3, `rgba(${180 + rand() * 75},${200 + rand() * 55},255,0.35)`);
				glow.addColorStop(1, "rgba(0,0,0,0)");
				g.fillStyle = glow;
				g.fillRect(x - s * 4, y - s * 4, s * 8, s * 8);
			}
			return c;
		}
		// The worlds stay clear of the cards laid over the map (CSS pixels on the left and right).
		setInsets(l, r) {
			if (Math.abs(l - this.insets.l) + Math.abs(r - this.insets.r) < 1) return;
			this.insets = { l, r };
			this.aim();
			this.draw();
		}
		// The camera's target: the middle of the free band, or a step towards the chosen world, zoomed in.
		aim() {
			const W = this.canvas.width,
				l = this.insets.l * this.dpr,
				r = this.insets.r * this.dpr,
				mid = (l + (W - r)) / 2 / W,
				w = this.worlds.find((x) => x.name === this.selected);
			if (!w) this.goal = { x: mid, y: 0.5, z: 1 };
			else {
				// A step towards the world, but never so far that the camera leaves the map.
				const p = this.place(w),
					H = this.canvas.height,
					// A narrow free band (cards over the map) zooms in less, so the outer worlds stay in view.
					z = 1 + 0.14 * Math.min(1, Math.max(0, ((W - l - r) / this.dpr - 520) / 700)),
					half = (W - l - r) / 2 / z,
					fx = Math.min(W - r - half, Math.max(l + half, mid * W + (p.sx - mid * W) * 0.5)),
					fy = Math.min(H - H / 2 / z, Math.max(H / 2 / z, H / 2 + (p.sy - H / 2) * 0.5));
				this.goal = { x: fx / W, y: fy / H, z };
			}
			if (this.reduced) Object.assign(this.cam, this.goal);
		}
		// Screen offset of the camera (canvas pixels): world point → screen = (p − focus) · z + centre of the band.
		view() {
			const W = this.canvas.width,
				H = this.canvas.height,
				cx = (this.insets.l * this.dpr + (W - this.insets.r * this.dpr)) / 2,
				z = this.cam.z;
			return { z, ox: cx - this.cam.x * W * z, oy: H / 2 - this.cam.y * H * z };
		}
		// The chosen world, turning slowly in the dossier card, under a sight.
		setPortrait(canvas) {
			this.portrait = canvas;
			this.draw();
		}
		drawPortrait() {
			const cv = this.portrait,
				w = this.worlds.find((x) => x.name === this.selected);
			if (!cv || !cv.isConnected || !w) return;
			const dpr = this.dpr,
				W = Math.round((cv.clientWidth || 240) * dpr),
				H = Math.round((cv.clientHeight || 150) * dpr);
			if (cv.width !== W || cv.height !== H) {
				cv.width = W;
				cv.height = H;
			}
			const c = cv.getContext("2d"),
				t = this.time,
				r = Math.min(W, H) * 0.3,
				p = { px: W / 2, py: H / 2, r, sx: W / 2 - r * 3, sy: H / 2 - r * 1.6 };
			const bg = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
			bg.addColorStop(0, "#0c1c2c");
			bg.addColorStop(1, "#02050b");
			c.fillStyle = bg;
			c.fillRect(0, 0, W, H);
			c.strokeStyle = "rgba(160,220,210,0.06)";
			c.lineWidth = 1;
			for (let x = (t * 6 * dpr) % (16 * dpr); x < W; x += 16 * dpr) {
				c.beginPath();
				c.moveTo(x, 0);
				c.lineTo(x, H);
				c.stroke();
			}
			for (let y = 0; y < H; y += 16 * dpr) {
				c.beginPath();
				c.moveTo(0, y);
				c.lineTo(W, y);
				c.stroke();
			}
			if (w.rings) this.ring(w, p, true, c);
			this.world(w, p, c);
			if (w.rings) this.ring(w, p, false, c);
			for (let i = 0; i < (w.moons || 0); i++) {
				const a = t * (0.5 + i * 0.3) + i * 2.4;
				if (Math.sin(a) < 0 && !w.rings) continue;
				c.fillStyle = "#b8bcc4";
				c.beginPath();
				c.arc(p.px + Math.cos(a) * r * (1.7 + i * 0.4), p.py + Math.sin(a) * r * 0.45, r * (0.12 - i * 0.02), 0, TAU);
				c.fill();
			}
			// The sight: a turning dashed ring and corner brackets.
			c.strokeStyle = "rgba(240,207,138,0.75)";
			c.lineWidth = 1.2 * dpr;
			c.setLineDash([4 * dpr, 5 * dpr]);
			c.lineDashOffset = -t * 10 * dpr;
			c.beginPath();
			c.arc(p.px, p.py, r * 1.32, 0, TAU);
			c.stroke();
			c.setLineDash([]);
			const s = r * 1.55,
				arm = r * 0.3;
			for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
				c.beginPath();
				c.moveTo(p.px + dx * s, p.py + dy * (s - arm));
				c.lineTo(p.px + dx * s, p.py + dy * s);
				c.lineTo(p.px + dx * (s - arm), p.py + dy * s);
				c.stroke();
			}
			c.fillStyle = "rgba(240,207,138,0.85)";
			c.font = `600 ${Math.round(9 * dpr)}px Consolas, monospace`;
			c.textAlign = "left";
			c.fillText(`SKAN ${Math.floor((t * 9) % 100)}%`, 8 * dpr, H - 8 * dpr);
			c.textAlign = "right";
			c.fillText(`${(Math.abs(Math.sin(hash(w.name))) * 9 + 1).toFixed(2)} AU`, W - 8 * dpr, H - 8 * dpr);
		}
		// The galaxy: deep space, a spiral arm of nebulae, a glowing core and a star field.
		paintBackdrop() {
			const c = document.createElement("canvas");
			c.width = this.canvas.width;
			c.height = this.canvas.height;
			const g = c.getContext("2d"),
				W = c.width,
				H = c.height,
				rand = seeded(20260927);
			const space = g.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.7);
			space.addColorStop(0, "#0d1a3a");
			space.addColorStop(1, "#03060e");
			g.fillStyle = space;
			g.fillRect(0, 0, W, H);
			// Two spiral arms of soft, bluish and violet clouds (blurred, so no blob edges show).
			g.filter = `blur(${Math.round(10 * this.dpr)}px)`;
			for (let arm = 0; arm < 2; arm++)
				for (let i = 0; i < 260; i++) {
					const t = i / 260,
						a = arm * Math.PI + t * 4.2,
						r = t * W * 0.62,
						x = W * 0.5 + Math.cos(a) * r + (rand() - 0.5) * W * 0.06,
						y = H * 0.5 + Math.sin(a) * r * 0.55 + (rand() - 0.5) * H * 0.08,
						size = (20 + rand() * 50) * (W / 1500);
					const neb = g.createRadialGradient(x, y, 0, x, y, size);
					neb.addColorStop(0, i % 5 ? "rgba(90,130,230,0.13)" : "rgba(170,110,220,0.13)");
					neb.addColorStop(1, "rgba(40,60,140,0)");
					g.fillStyle = neb;
					g.beginPath();
					g.arc(x, y, size, 0, TAU);
					g.fill();
				}
			g.filter = "none";
			const core = g.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.16);
			core.addColorStop(0, "rgba(255,245,220,0.55)");
			core.addColorStop(0.3, "rgba(200,190,255,0.18)");
			core.addColorStop(1, "rgba(80,90,200,0)");
			g.fillStyle = core;
			g.beginPath();
			g.ellipse(W * 0.5, H * 0.5, W * 0.18, H * 0.16, 0, 0, TAU);
			g.fill();
			for (let i = 0; i < 700; i++) {
				const x = rand() * W,
					y = rand() * H,
					s = rand() < 0.93 ? 1 : 2;
				g.fillStyle = `rgba(${210 + rand() * 45},${215 + rand() * 40},255,${0.25 + rand() * 0.6})`;
				g.fillRect(x, y, s * this.dpr * 0.8, s * this.dpr * 0.8);
			}
			return c;
		}
		// Where the sun and the world are now (canvas pixels).
		place(w) {
			const L = this.insets.l * this.dpr,
				W = this.canvas.width - L - this.insets.r * this.dpr,
				H = this.canvas.height,
				S = Math.min(W, H * 2),
				R = w.orbit * S,
				r = w.size * S * 0.026,
				// The whole system stays on the map: orbit, the world with its rings, the name above and the dots below.
				mx = R + r * (w.rings ? 2.1 : 1.4),
				top = R * 0.42 + r * 1.5 + 18 * this.dpr,
				bottom = R * 0.42 + r + 30 * this.dpr,
				sx = L + Math.min(W - mx, Math.max(mx, w.x * W)),
				sy = Math.min(H - bottom, Math.max(top, w.y * H)),
				a = w.phase + this.time * w.speed;
			return { sx, sy, R, px: sx + Math.cos(a) * R, py: sy + Math.sin(a) * R * 0.42, r, a };
		}
		pointer(e, click) {
			const rect = this.canvas.getBoundingClientRect(),
				v = this.view(),
				x = (((e.clientX - rect.left) / rect.width) * this.canvas.width - v.ox) / v.z,
				y = (((e.clientY - rect.top) / rect.height) * this.canvas.height - v.oy) / v.z;
			this.tilt.tx = (e.clientX - rect.left) / rect.width - 0.5;
			this.tilt.ty = (e.clientY - rect.top) / rect.height - 0.5;
			const hit = this.worlds.find((w) => {
				const p = this.place(w);
				return Math.hypot(p.px - x, p.py - y) < p.r + 14 * this.dpr || Math.hypot(p.sx - x, p.sy - y) < p.R * 0.6;
			});
			this.hover = hit?.name || null;
			this.canvas.style.cursor = hit ? "pointer" : "default";
			if (click && hit) this.select(hit.name, true);
			if (this.reduced) this.draw();
		}
		focus(name) {
			this.focused = name;
			if (this.reduced) this.draw();
		}
		select(name, fromMap = false) {
			this.selected = name;
			this.aim();
			this.onSelect(name, fromMap);
			this.draw();
		}
		chaptersOf(name) {
			return this.chapters.filter((ch) => ch.planet === name);
		}
		draw() {
			const c = this.c,
				dpr = this.dpr,
				t = this.time;
			if (!this.backdrop) return;
			const W = this.canvas.width,
				H = this.canvas.height,
				v = this.view();
			// Layers at three depths: the far galaxy, the near dust and stars, the systems (with the camera).
			const layer = (img, depth, grow) => {
				const z = 1 + (v.z - 1) * depth,
					m = grow * W,
					dx = (0.5 - this.cam.x) * W * depth * 0.6 - this.tilt.x * 14 * dpr * depth,
					dy = (0.5 - this.cam.y) * H * depth * 0.6 - this.tilt.y * 9 * dpr * depth;
				c.drawImage(img, W / 2 - (W / 2 + m) * z + dx, H / 2 - (H / 2 + m * 0.5) * z + dy, (W + 2 * m) * z, (H + m) * z);
			};
			c.setTransform(1, 0, 0, 1, 0, 0);
			c.fillStyle = "#03060e";
			c.fillRect(0, 0, W, H);
			layer(this.backdrop, 0.25, 0.04);
			// Slowly breathing nebulae.
			c.save();
			c.globalCompositeOperation = "lighter";
			for (const [fx, fy, fr, col, ph] of [[0.3, 0.35, 0.22, "90,140,255", 0], [0.7, 0.62, 0.2, "190,110,230", 2], [0.52, 0.2, 0.16, "90,220,200", 4]]) {
				const a = 0.05 + 0.035 * Math.sin(t * 0.25 + ph),
					x = fx * W - this.tilt.x * 8 * dpr,
					y = fy * H - this.tilt.y * 6 * dpr,
					g = c.createRadialGradient(x, y, 0, x, y, fr * W);
				g.addColorStop(0, `rgba(${col},${a.toFixed(3)})`);
				g.addColorStop(1, `rgba(${col},0)`);
				c.fillStyle = g;
				c.fillRect(0, 0, W, H);
			}
			c.restore();
			layer(this.dust, 0.6, 0.06);
			// Twinkling brighter stars.
			const rand = seeded(77);
			for (let i = 0; i < 40; i++) {
				const x = rand() * W - this.tilt.x * 10 * dpr,
					y = rand() * H - this.tilt.y * 7 * dpr,
					a = 0.35 + 0.35 * Math.sin(t * (1 + rand() * 2) + i);
				c.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
				c.beginPath();
				c.arc(x, y, 1.2 * dpr, 0, TAU);
				c.fill();
			}
			c.setTransform(v.z, 0, 0, v.z, v.ox, v.oy);
			this.drawActs();
			this.drawRoute();
			for (const w of this.worlds) this.drawSystem(w);
			c.setTransform(1, 0, 0, 1, 0, 0);
			// A vignette, darker under the cards at the sides.
			const vg = c.createLinearGradient(0, 0, W, 0),
				l = Math.min(0.45, (this.insets.l * dpr) / W),
				r = Math.min(0.45, (this.insets.r * dpr) / W);
			vg.addColorStop(0, "rgba(2,5,10,0.55)");
			vg.addColorStop(l, "rgba(2,5,10,0)");
			vg.addColorStop(1 - r, "rgba(2,5,10,0)");
			vg.addColorStop(1, "rgba(2,5,10,0.55)");
			c.fillStyle = vg;
			c.fillRect(0, 0, W, H);
			this.drawPortrait();
		}
		// The acts as faint regions around their worlds, each with its name.
		drawActs() {
			const c = this.c,
				dpr = this.dpr,
				NAMES = { 1: "AKT I · ODZYSKANY ŚWIT", 2: "AKT II · CENA ŚWITU", 3: "AKT III · PRZEBUDZENIE ROJU" },
				COLORS = { 1: "127,231,200", 2: "240,207,138", 3: "201,140,255" };
			for (const act of [1, 2, 3]) {
				const worlds = [...new Set(this.chapters.filter((ch) => (ch.act || 1) === act).map((ch) => ch.planet))]
					.map((name) => this.worlds.find((w) => w.name === name))
					.filter(Boolean)
					.map((w) => this.place(w));
				if (!worlds.length) continue;
				const pad = 46 * dpr,
					x0 = Math.min(...worlds.map((p) => p.sx - p.R)) - pad,
					x1 = Math.max(...worlds.map((p) => p.sx + p.R)) + pad,
					y0 = Math.min(...worlds.map((p) => p.sy - p.R * 0.42)) - pad,
					y1 = Math.max(...worlds.map((p) => p.sy + p.R * 0.42)) + pad,
					open = this.chapters.some((ch) => (ch.act || 1) === act && ch.status !== "locked"),
					col = COLORS[act];
				const g = c.createRadialGradient((x0 + x1) / 2, (y0 + y1) / 2, 0, (x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) * 0.6);
				g.addColorStop(0, `rgba(${col},${open ? 0.07 : 0.03})`);
				g.addColorStop(1, `rgba(${col},0)`);
				c.fillStyle = g;
				c.beginPath();
				c.ellipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, 0, 0, TAU);
				c.fill();
				c.strokeStyle = `rgba(${col},${open ? 0.3 : 0.14})`;
				c.lineWidth = 1 * dpr;
				c.setLineDash([2 * dpr, 6 * dpr]);
				c.stroke();
				c.setLineDash([]);
				c.font = `600 ${Math.round(9 * dpr)}px Consolas, monospace`;
				c.textAlign = "center";
				c.fillStyle = `rgba(${col},${open ? 0.75 : 0.35})`;
				c.fillText(NAMES[act] + (open ? "" : " · ZABLOKOWANY"), (x0 + x1) / 2, y0 + 4 * dpr);
			}
		}
		// The campaign route through the chapters' worlds.
		drawRoute() {
			const c = this.c,
				dpr = this.dpr,
				order = this.chapters.filter((ch) => ch.planet);
			for (let i = 1; i < order.length; i++) {
				const a = this.worlds.find((w) => w.name === order[i - 1].planet),
					b = this.worlds.find((w) => w.name === order[i].planet);
				if (!a || !b || a === b) continue;
				const p = this.place(a),
					q = this.place(b),
					st = order[i].status,
					mx = (p.sx + q.sx) / 2,
					my = Math.min(p.sy, q.sy) - 40 * dpr,
					curve = () => {
						c.beginPath();
						c.moveTo(p.sx, p.sy);
						c.quadraticCurveTo(mx, my, q.sx, q.sy);
					};
				// Done: a solid teal line with a glow; next: amber, dashed and running, with a probe flying along;
				// locked: dark and dotted.
				c.save();
				if (st !== "locked") {
					c.strokeStyle = st === "done" ? "rgba(127,231,200,0.18)" : "rgba(240,207,138,0.2)";
					c.lineWidth = 7 * dpr;
					curve();
					c.stroke();
				}
				c.strokeStyle = st === "done" ? "rgba(127,231,200,0.85)" : st === "open" ? "rgba(240,207,138,0.95)" : "rgba(120,140,160,0.28)";
				c.lineWidth = (st === "locked" ? 1.1 : 2) * dpr;
				c.setLineDash(st === "done" ? [] : st === "open" ? [10 * dpr, 6 * dpr] : [2 * dpr, 6 * dpr]);
				c.lineDashOffset = st === "open" ? -this.time * 30 * dpr : 0;
				curve();
				c.stroke();
				c.restore();
				if (st === "open") {
					const k = (this.time * 0.22) % 1,
						x = (1 - k) * (1 - k) * p.sx + 2 * (1 - k) * k * mx + k * k * q.sx,
						y = (1 - k) * (1 - k) * p.sy + 2 * (1 - k) * k * my + k * k * q.sy,
						g = c.createRadialGradient(x, y, 0, x, y, 10 * dpr);
					g.addColorStop(0, "rgba(255,240,200,1)");
					g.addColorStop(0.3, "rgba(240,207,138,0.6)");
					g.addColorStop(1, "rgba(240,207,138,0)");
					c.fillStyle = g;
					c.beginPath();
					c.arc(x, y, 10 * dpr, 0, TAU);
					c.fill();
				}
			}
		}
		drawSystem(w) {
			const c = this.c,
				dpr = this.dpr,
				p = this.place(w),
				chapters = this.chaptersOf(w.name),
				campaign = chapters.length > 0,
				open = chapters.some((ch) => ch.status !== "locked"),
				lit = !campaign || open,
				mark = this.selected === w.name || this.focused === w.name || this.hover === w.name;
			c.globalAlpha = campaign ? (open ? 1 : 0.55) : 0.7;
			// Orbit.
			c.strokeStyle = mark ? "rgba(240,210,140,0.55)" : "rgba(160,190,230,0.22)";
			c.lineWidth = 1 * dpr;
			c.beginPath();
			c.ellipse(p.sx, p.sy, p.R, p.R * 0.42, 0, 0, TAU);
			c.stroke();
			// Asteroid belt around the sun.
			if (w.belt) {
				const rand = seeded(hash(w.name) + 11);
				for (let i = 0; i < 70; i++) {
					const a = rand() * TAU + this.time * 0.05,
						rr = p.R * (0.55 + rand() * 0.18);
					c.fillStyle = `rgba(190,170,150,${(0.35 + rand() * 0.4).toFixed(2)})`;
					c.fillRect(p.sx + Math.cos(a) * rr, p.sy + Math.sin(a) * rr * 0.42, (1 + rand() * 1.6) * dpr, (1 + rand() * 1.2) * dpr);
				}
			}
			// The sun (two for Kessar).
			const suns = w.twin
				? [
						[p.sx + Math.cos(this.time * 0.6) * 7 * dpr, p.sy + Math.sin(this.time * 0.6) * 3 * dpr, 0.8],
						[p.sx - Math.cos(this.time * 0.6) * 7 * dpr, p.sy - Math.sin(this.time * 0.6) * 3 * dpr, 0.6],
					]
				: [[p.sx, p.sy, 1]];
			for (const [x, y, k] of suns) {
				const s = 7 * dpr * k,
					glow = c.createRadialGradient(x, y, 0, x, y, s * 4);
				glow.addColorStop(0, "#ffffff");
				glow.addColorStop(0.2, w.sun);
				glow.addColorStop(1, "rgba(0,0,0,0)");
				c.fillStyle = glow;
				c.beginPath();
				c.arc(x, y, s * 4, 0, TAU);
				c.fill();
			}
			// Moons behind the world, the world with its rings, then moons in front.
			const moons = Array.from({ length: w.moons || 0 }, (_, i) => {
				const a = this.time * (0.6 + i * 0.35) + i * 2.4 + w.phase;
				return { a, x: p.px + Math.cos(a) * p.r * (2 + i * 0.7), y: p.py + Math.sin(a) * p.r * 0.7 * (1 + i * 0.3), r: p.r * (0.22 - i * 0.04) };
			});
			const moon = (m) => {
				c.fillStyle = "#b8bcc4";
				c.beginPath();
				c.arc(m.x, m.y, Math.max(1.2 * dpr, m.r), 0, TAU);
				c.fill();
				c.fillStyle = "rgba(0,0,0,0.45)";
				c.beginPath();
				c.arc(m.x + m.r * 0.35, m.y + m.r * 0.25, Math.max(1.2 * dpr, m.r) * 0.85, 0, TAU);
				c.fill();
			};
			for (const m of moons) if (Math.sin(m.a) < 0) moon(m);
			if (w.rings) this.ring(w, p, true);
			this.world(w, p);
			if (w.rings) this.ring(w, p, false);
			for (const m of moons) if (Math.sin(m.a) >= 0) moon(m);
			c.globalAlpha = 1;
			// Selection mark.
			if (mark) {
				c.strokeStyle = this.selected === w.name ? "#f0cb70" : "rgba(240,203,112,0.7)";
				c.lineWidth = 1.6 * dpr;
				c.setLineDash([5 * dpr, 4 * dpr]);
				c.lineDashOffset = -this.time * 12 * dpr;
				c.beginPath();
				c.arc(p.px, p.py, p.r + 9 * dpr, 0, TAU);
				c.stroke();
				c.setLineDash([]);
				// The chosen world: corner brackets of a sight closing on it.
				if (this.selected === w.name) {
					const s = p.r + 20 * dpr + Math.sin(this.time * 2) * 2 * dpr,
						arm = 7 * dpr;
					c.strokeStyle = "#f0cf8a";
					c.lineWidth = 1.5 * dpr;
					for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
						c.beginPath();
						c.moveTo(p.px + dx * s, p.py + dy * (s - arm));
						c.lineTo(p.px + dx * s, p.py + dy * s);
						c.lineTo(p.px + dx * (s - arm), p.py + dy * s);
						c.stroke();
					}
				}
			}
			// Name, chapter dots and badges.
			c.font = `600 ${Math.round(11 * dpr)}px Segoe UI, sans-serif`;
			c.textAlign = "center";
			c.fillStyle = campaign ? (lit ? "#e6f1ee" : "#7d8b94") : "#9fb0c8";
			c.fillText(w.name.toUpperCase(), p.px, p.py - p.r - 10 * dpr);
			if (!campaign) {
				c.font = `${Math.round(9 * dpr)}px Segoe UI, sans-serif`;
				c.fillStyle = "#6f82a0";
				c.fillText("świat scenariuszy", p.px, p.py + p.r + 14 * dpr);
			}
			// Chapter numbers under the world: teal when done, amber and pulsing for the next one, dark when locked.
			chapters.forEach((ch, i) => {
				const x = p.px - (chapters.length - 1) * 11 * dpr + i * 22 * dpr,
					y = p.py + p.r + 15 * dpr,
					s = 9 * dpr,
					color = ch.status === "done" ? "#7fe7c8" : ch.status === "open" ? "#f0cf8a" : "#44525c";
				if (ch.status === "open") {
					c.strokeStyle = `rgba(240,207,138,${(0.6 - ((this.time * 0.8) % 1) * 0.6).toFixed(3)})`;
					c.lineWidth = 1.5 * dpr;
					c.beginPath();
					c.arc(x, y, s * (1 + ((this.time * 0.8) % 1) * 0.9), 0, TAU);
					c.stroke();
				}
				c.fillStyle = ch.status === "locked" ? "rgba(10,16,22,0.9)" : color;
				c.strokeStyle = color;
				c.lineWidth = 1.2 * dpr;
				c.beginPath();
				c.arc(x, y, s, 0, TAU);
				c.fill();
				c.stroke();
				c.fillStyle = ch.status === "locked" ? "#6c7c86" : "#06121a";
				c.font = `700 ${Math.round((ch.num?.length > 2 ? 7 : 8.5) * dpr)}px Consolas, monospace`;
				c.textBaseline = "middle";
				c.fillText(ch.num || String(i + 1), x, y + 0.5 * dpr);
				c.textBaseline = "alphabetic";
				if (ch.badge) {
					c.fillStyle = "#f5e27a";
					c.font = `${Math.round(9 * dpr)}px Segoe UI, sans-serif`;
					c.fillText("◆", x, y + 19 * dpr);
				}
			});
		}
		world(w, p, c = this.c) {
			const r = p.r,
				spin = (this.time * w.spin) % 256,
				atmo = CLIMATE[w.climate].atmo;
			// Atmosphere.
			const halo = c.createRadialGradient(p.px, p.py, r * 0.9, p.px, p.py, r * 1.45);
			halo.addColorStop(0, atmo + "88");
			halo.addColorStop(1, atmo + "00");
			c.fillStyle = halo;
			c.beginPath();
			c.arc(p.px, p.py, r * 1.45, 0, TAU);
			c.fill();
			c.save();
			c.beginPath();
			c.arc(p.px, p.py, r, 0, TAU);
			c.clip();
			// Surface strip scrolled by the rotation (drawn twice to wrap), then clouds, then shading.
			const h = r * 2,
				wTex = h * 2,
				x0 = p.px - r - (spin / 256) * wTex;
			c.drawImage(w.tex, x0, p.py - r, wTex, h);
			c.drawImage(w.tex, x0 + wTex, p.py - r, wTex, h);
			if (w.sky) {
				const x1 = p.px - r - (((this.time * w.spin * 1.6) % 256) / 256) * wTex;
				c.drawImage(w.sky, x1, p.py - r, wTex, h);
				c.drawImage(w.sky, x1 + wTex, p.py - r, wTex, h);
			}
			// Lit from its sun: the side facing it is bright.
			const lx = p.sx - p.px,
				ly = p.sy - p.py,
				ll = Math.hypot(lx, ly) || 1,
				shade = c.createRadialGradient(p.px + (lx / ll) * r * 0.45, p.py + (ly / ll) * r * 0.45, r * 0.1, p.px, p.py, r * 1.05);
			shade.addColorStop(0, "rgba(255,255,255,0.12)");
			shade.addColorStop(0.55, "rgba(0,0,0,0)");
			shade.addColorStop(1, "rgba(0,0,10,0.78)");
			c.fillStyle = shade;
			c.fillRect(p.px - r, p.py - r, r * 2, r * 2);
			c.restore();
		}
		ring(w, p, back, c = this.c) {
			c.save();
			c.translate(p.px, p.py);
			c.rotate(w.tilt);
			c.lineWidth = p.r * 0.14;
			for (let i = 0; i < 3; i++) {
				c.strokeStyle = ["rgba(230,215,190,0.55)", "rgba(200,190,170,0.35)", "rgba(240,230,210,0.45)"][i];
				c.beginPath();
				c.ellipse(0, 0, p.r * (1.55 + i * 0.22), p.r * (0.34 + i * 0.05), 0, back ? Math.PI : 0, back ? TAU : Math.PI);
				c.stroke();
			}
			c.restore();
		}
	}
	// Only the turning view of one world under a sight, without the map (the campaign's chapter preview).
	// Returns { show(name), destroy() }.
	function portrait(canvas, options = {}) {
		const view = Object.create(Map.prototype),
			textures = {};
		Object.assign(view, { portrait: canvas, time: 0, dpr: Math.min(window.devicePixelRatio || 1, 2), selected: null, worlds: [] });
		view.show = (name) => {
			const w = WORLDS[name];
			if (!w) return;
			textures[name] ||= { name, ...w, phase: 0, spin: 6 + (hash(name) % 6), tilt: -0.35 + ((hash(name) % 70) / 100), tex: surface(name, w), sky: clouds(name, w) };
			view.worlds = [textures[name]];
			view.selected = name;
			view.drawPortrait();
		};
		let last = performance.now(),
			frame = 0;
		const loop = (now) => {
			view.time += Math.min(0.05, (now - last) / 1000);
			last = now;
			view.drawPortrait();
			frame = requestAnimationFrame(loop);
		};
		if (!options.reduced) frame = requestAnimationFrame(loop);
		view.destroy = () => cancelAnimationFrame(frame);
		return view;
	}
	return { Map, WORLDS, CLIMATE, portrait };
})();
if (typeof window !== "undefined") window.GalaxyMap = GalaxyMap;
