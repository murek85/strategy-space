(function (root) {
	const defaults = {
			terrain: "high",
			particles: "high",
			flashes: true,
			metrics: false,
			// Board renderer and the WebGL-only effects.
			renderer: "webgl",
			lights: true,
			shadows: true,
			bloom: true,
			water: true,
			volume: true,
			scars: true,
			relief: true,
			tilt: false,
		},
		RENDERERS = ["webgpu", "webgl", "canvas"],
		options = { ...defaults };
	try {
		const saved = JSON.parse(
			root.localStorage?.getItem("pogranicze-visual-v1") || "{}",
		);
		for (const key of ["terrain", "particles"])
			if (["low", "medium", "high"].includes(saved[key]))
				options[key] = saved[key];
		for (const key of ["flashes", "metrics", "lights", "shadows", "bloom", "water", "volume", "scars", "relief", "tilt"])
			if (typeof saved[key] === "boolean") options[key] = saved[key];
		if (RENDERERS.includes(saved.renderer)) options.renderer = saved.renderer;
	} catch {}
	const api = {
		options,
		revision: 0,
		samples: [],
		metrics: { mean: 0, p95: 0, count: 0 },
		set(key, value) {
			if (!(key in defaults)) return false;
			if (
				typeof defaults[key] === "boolean"
					? typeof value !== "boolean"
					: !(key === "renderer" ? RENDERERS : ["low", "medium", "high"]).includes(value)
			)
				return false;
			options[key] = value;
			if (key === "terrain") this.revision++;
			try {
				root.localStorage?.setItem(
					"pogranicze-visual-v1",
					JSON.stringify(options),
				);
			} catch {}
			return true;
		},
		stride(key) {
			return { low: 3, medium: 2, high: 1 }[options[key]] || 1;
		},
		measure(ms) {
			if (!Number.isFinite(ms) || ms < 0) return;
			this.samples.push(ms);
			if (this.samples.length > 120) this.samples.shift();
			this.frames = (this.frames || 0) + 1;
			if (this.frames % 30 === 0) {
				const a = [...this.samples].sort((a, b) => a - b);
				this.metrics = {
					mean: a.reduce((a, b) => a + b, 0) / a.length,
					p95: a[Math.floor((a.length - 1) * 0.95)],
					count: a.length,
				};
			}
		},
		terrain(c, g) {
			const biome = RTS.MISSIONS[g.missionId].biome,
				step = this.stride("terrain");
			c.save();
			for (const w of g.waters.filter((w) => !w.kind)) {
				// A bounded shoreline pass, baked into the existing terrain canvas.
				for (let i = 0; i < 90; i += step) {
					const a = (i * Math.PI * 2) / 90,
						r = RTS.waterRadius(w, a),
						x = w.x + Math.cos(a) * (w.rx * r + 6),
						y = w.y + Math.sin(a) * (w.ry * r + 6);
					c.fillStyle =
						biome === "ice"
							? "#c6d6d199"
							: biome === "ash"
								? "#85808088"
								: "#b2a47d99";
					c.beginPath();
					c.ellipse(
						x,
						y,
						3 + (i % 4),
						2 + (i % 2),
						a,
						0,
						Math.PI * 2,
					);
					c.fill();
					if (i % 5 === 0 && biome !== "ice") {
						c.strokeStyle =
							biome === "dust" ? "#687950aa" : "#697d69aa";
						c.lineWidth = 1.2;
						for (let j = -1; j <= 1; j++) {
							c.beginPath();
							c.moveTo(x + j * 3, y);
							c.quadraticCurveTo(
								x + j * 4,
								y - 8,
								x + j * 6,
								y - 13 - (i % 7),
							);
							c.stroke();
						}
					}
				}
			}
			for (const o of g.obstacles.filter((o) => !o.kind)) {
				c.strokeStyle = biome === "ice" ? "#d2e1dc55" : "#b7ad8c44";
				c.lineWidth = 2;
				c.beginPath();
				c.moveTo(o.x - 6, o.y + o.h + 4);
				c.quadraticCurveTo(
					o.x + o.w * 0.5,
					o.y + o.h + 18,
					o.x + o.w + 12,
					o.y + o.h + 3,
				);
				c.stroke();
			}
			c.restore();
		},
		construction(c, e) {
			if (!e.constructionLeft || ["wall", "gate"].includes(e.type))
				return false;
			const s = RTS.TYPES[e.type],
				p = 1 - e.constructionLeft / s.construction,
				r = s.radius;
			if (p >= 0.65) return false;
			c.save();
			c.fillStyle = "#33494bb0";
			c.strokeStyle = "#a8aa85";
			c.lineWidth = 2;
			c.beginPath();
			c.moveTo(-r, -r * 0.45);
			c.lineTo(r, -r * 0.45);
			c.lineTo(r + 9, r * 0.45);
			c.lineTo(-r + 9, r * 0.45);
			c.closePath();
			c.fill();
			c.stroke();
			if (p >= 0.25) {
				c.strokeStyle = "#b4b69e";
				for (const x of [-r + 8, 0, r - 8]) {
					c.beginPath();
					c.moveTo(x, r * 0.3);
					c.lineTo(x, -r * 0.75);
					c.lineTo(x + 9, -r * 0.95);
					c.stroke();
				}
				c.beginPath();
				c.moveTo(-r + 8, -r * 0.75);
				c.lineTo(r - 8, -r * 0.75);
				c.stroke();
			}
			c.restore();
			return true;
		},
	};
	root.SceneFX = api;
	if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
