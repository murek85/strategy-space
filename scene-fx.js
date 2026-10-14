(function (root) {
	const defaults = {
			terrain: "high",
			particles: "high",
			flashes: true,
			metrics: false,
			// The frames-per-second counter over the board (0.171.18).
			fps: false,
			// Board renderer and the WebGL-only effects. 3D (Three.js) by default since 0.172.7 — where it cannot start,
			// app.js falls back to WebGL (PixiJS), then Canvas 2D; a choice saved in the settings stays.
			renderer: "three",
			lights: true,
			shadows: true,
			// Shadows of the drifting clouds over the 3D board (0.171.18: in the code since 0.118, never in the settings).
			clouds: true,
			bloom: true,
			water: true,
			volume: true,
			scars: true,
			relief: true,
			tilt: false,
			// The 3D board's cinematic image (tone mapping, grade, sky reflections) and its ambient occlusion.
			cinema: true,
			ao: true,
			// The 3D board's terrain materials (stone on slopes, the planet's fine ground, its relief).
			pbr: true,
			// Reflections in the water and the atmosphere (height fog, light shafts) of the 3D board.
			reflect: true,
			atmo: true,
			// Surface detail of the 3D models (armour plates, worn edges, dust).
			surface: true,
			// Depth of field (tilt-shift) of the 3D board in space.
			dof: true,
			// Heat haze over fires, blasts, lava and engines; the camera shaking at big blasts (0.144).
			haze: true,
			shake: true,
			// Automatic quality (0.175.8): the 3D board steps its costliest effects down while the frame rate stays low
			// and back up when it has room — for the battle only, the settings themselves stay as chosen.
			autoQuality: true,
		},
		RENDERERS = ["three", "webgpu", "webgl", "canvas"],
		options = { ...defaults };
	try {
		const saved = JSON.parse(
			root.localStorage?.getItem("pogranicze-visual-v1") || "{}",
		);
		for (const key of ["terrain", "particles"])
			if (["low", "medium", "high"].includes(saved[key]))
				options[key] = saved[key];
		for (const key of ["flashes", "metrics", "fps", "lights", "shadows", "clouds", "bloom", "water", "volume", "scars", "relief", "tilt", "cinema", "ao", "pbr", "reflect", "atmo", "surface", "dof", "haze", "shake", "autoQuality"])
			if (typeof saved[key] === "boolean") options[key] = saved[key];
		if (RENDERERS.includes(saved.renderer)) options.renderer = saved.renderer;
		// 0.173 (I4): PixiJS is frozen as a fallback. "webgl" was the default until 0.172.7 and SceneFX.set saves every
		// option at once, so almost every player has it saved without having chosen it: moved to 3D once (WebGPU and
		// Canvas 2D were chosen on purpose and stay). The settings take it back for good.
		if (saved.renderer === "webgl" && !saved.moved3d) options.renderer = "three";
		options.moved3d = true;
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
			if (key === "autoQuality" && !value) this.resetAuto(true);
			try {
				root.localStorage?.setItem(
					"pogranicze-visual-v1",
					JSON.stringify(options),
				);
			} catch {}
			return true;
		},
		// Automatic quality: 0 — the settings as chosen; 1–AUTO_MAX — ever more of the board's costliest work left out
		// (webgl3d/three-renderer.js applyQuality). Fed the frame rate twice a second while a battle runs on the 3D
		// board (app.js); a gap in the samples (a pause, a hidden window, a loading screen) starts the watch again.
		AUTO_MAX: 4,
		autoLevel: 0,
		auto: { samples: [], changed: -Infinity, upWait: 20000, raisedAt: -Infinity },
		resetAuto(level = false) {
			this.auto.samples = [];
			if (level) {
				this.autoLevel = 0;
				this.auto.changed = -Infinity;
				this.auto.upWait = 20000;
				this.auto.raisedAt = -Infinity;
			}
		},
		// Returns the new level when it changes, otherwise null.
		autoTune(fps, now) {
			const a = this.auto;
			if (!options.autoQuality || !Number.isFinite(fps)) return null;
			const last = a.samples.at(-1);
			if (last && now - last.t > 1500) a.samples = [];
			a.samples.push({ t: now, fps });
			while (a.samples.length && now - a.samples[0].t > 170000) a.samples.shift();
			if (now - a.changed < 8000) return null;
			const within = (ms) => a.samples.filter((x) => now - x.t <= ms),
				rank = (xs, p) => {
					const v = xs.map((x) => x.fps).sort((p, q) => p - q);
					return v[Math.floor((v.length - 1) * p)];
				},
				median = (xs) => rank(xs, 0.5);
			// Down: three quarters of the last 6 s below 40 frames (so a hitch, a loading spike, does not count).
			const recent = within(6000);
			if (this.autoLevel < this.AUTO_MAX && recent.length >= 11 && rank(recent, 0.75) < 40) {
				// Lowered again soon after a raise: the raise did not hold — wait twice as long before the next one.
				if (now - a.raisedAt < 20000) a.upWait = Math.min(a.upWait * 2, 160000);
				this.autoLevel++;
				a.changed = now;
				a.samples = [];
				return this.autoLevel;
			}
			// Up: 55 frames or more (the median, no sample under 50) for the whole wait.
			const long = within(a.upWait);
			if (this.autoLevel > 0 && now - a.samples[0].t >= a.upWait - 600 && long.length >= (a.upWait / 500) * 0.9 && median(long) >= 55 && long.every((x) => x.fps >= 50)) {
				this.autoLevel--;
				a.changed = now;
				a.raisedAt = now;
				a.samples = [];
				return this.autoLevel;
			}
			return null;
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
			// Shore pebbles and grass (the 3D board scatters real reeds and pebbles: RTS.bareGround).
			for (const w of g.waters.filter((w) => !w.kind && !RTS.bareGround)) {
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
			for (const o of g.obstacles.filter((o) => !o.kind && !RTS.bareGround)) {
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
