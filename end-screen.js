/* The backdrop of the victory and defeat screens: a canvas under the report (filling the battlefield), drawn with
   the campaign films' kit (campaign-film.js). Victory — dawn over the map's world, the fleet passing, beacons
   lit, motes of light rising, a lens flare. Defeat — the base burning on the horizon under a dark red sky, smoke
   columns, embers, the alarm pulsing, the signal breaking up ("SYGNAŁ UTRACONY"). It runs while the report is on
   screen; with reduced motion it draws one still frame. */
const EndScreen = (() => {
	// Colours of the world by biome: [surface, night, air].
	const WORLD = { dust: ["#c69a5c", "#2a1c12", "#ffd29a"], ice: ["#d9e8f0", "#3a5060", "#bfe6ff"], ash: ["#7a5a50", "#1a100e", "#ff9a6a"] };

	function draw(c, k, t, o) {
		const { W, H, rnd, glow, flare, stars, nebula, planet, freighter, capital, beacon, poly } = k;
		const [land, night, air] = WORLD[o.biome] || WORLD.dust;
		if (o.victory) {
			const sky = c.createLinearGradient(0, 0, 0, H);
			sky.addColorStop(0, "#071322");
			sky.addColorStop(0.6, "#2a3048");
			sky.addColorStop(1, "#8a5a3a");
			c.fillStyle = sky;
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[240, 110, 300, "#2a4a6a", 0.45, 1], [760, 90, 260, "#4a3a6a", 0.3, -1]]);
			stars(c, t, 3, 180, 71);
			const sy = 300 - Math.min(1, t / 6) * 40;
			glow(c, 520, sy, 560, "#ffb46a", 0.45);
			planet(c, 480, 820, 560, { base: land, dark: night, atmo: air, light: -1.57, cities: 0.6, t, seed: 71 });
			flare(c, 520, sy, 0.9, "#ffcf8a");
			for (let i = 0; i < 7; i++) beacon(c, 90 + i * 130, 330 - Math.sin(i * 0.8) * 22 - i * 3, 0.7, 1, t, i);
			for (let i = 0; i < 5; i++) freighter(c, ((60 + i * 170 + t * 22) % (W + 200)) - 100, 210 + (i % 3) * 24, 0.85, t, i);
			capital(c, ((t * 14 + 200) % (W + 500)) - 250, 150, 0.8, t, false);
			// Motes of light rising.
			for (let i = 0; i < 70; i++) {
				const x = rnd(i) * W + Math.sin(t * 0.7 + i) * 14,
					y = H - ((t * (14 + rnd(i * 3) * 26) + rnd(i * 5) * H) % H);
				c.fillStyle = i % 3 ? "rgba(255,226,170,0.7)" : "rgba(160,255,220,0.7)";
				c.fillRect(x, y, 2, 2);
			}
		} else {
			const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
			const sky = c.createLinearGradient(0, 0, 0, H);
			sky.addColorStop(0, "#07040a");
			sky.addColorStop(0.65, "#2a0c0c");
			sky.addColorStop(1, "#5a1a0c");
			c.fillStyle = sky;
			c.fillRect(0, 0, W, H);
			stars(c, t, 0.5, 70, 72, "#ffd0c0");
			// The base on the horizon: a broken skyline, burning.
			poly(c, [[0, 320], [W, 310], [W, H], [0, H]], "#120808");
			for (let i = 0; i < 9; i++) {
				const x = 120 + i * 85,
					h = 30 + rnd(i) * 70,
					tilt = (rnd(i * 3) - 0.5) * 0.25;
				c.save();
				c.translate(x, 318);
				c.rotate(tilt);
				poly(c, [[-22, 0], [-22, -h], [-6, -h - 10], [10, -h + 6], [22, -h * 0.6], [22, 0]], "#1c1010");
				c.restore();
				const f = 0.7 + 0.3 * Math.sin(t * 7 + i * 2);
				glow(c, x, 318 - h * 0.6, 50 * f, "#ff7a2a", 0.55);
				glow(c, x, 318 - h * 0.6, 14 * f, "#ffd08a", 0.8);
			}
			// Smoke columns leaning in the wind.
			for (let i = 0; i < 7; i++)
				for (let k2 = 0; k2 < 6; k2++) {
					const u = (t * 0.12 + k2 / 6 + rnd(i)) % 1;
					c.fillStyle = `rgba(30,22,22,${0.45 * (1 - u)})`;
					c.beginPath();
					c.arc(150 + i * 110 + u * 120, 300 - u * 260, 20 + u * 70, 0, Math.PI * 2);
					c.fill();
				}
			// Embers rising.
			for (let i = 0; i < 80; i++) {
				const x = rnd(i) * W + Math.sin(t + i) * 20,
					y = 330 - ((t * (30 + rnd(i * 3) * 40) + rnd(i * 5) * 330) % 330);
				c.fillStyle = `rgba(255,${120 + Math.floor(rnd(i * 7) * 100)},60,0.8)`;
				c.fillRect(x, y, 2, 2);
			}
			// The alarm: a red pulse from the edges.
			const v = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
			v.addColorStop(0, "rgba(0,0,0,0)");
			v.addColorStop(1, `rgba(140,10,10,${0.25 + pulse * 0.25})`);
			c.fillStyle = v;
			c.fillRect(0, 0, W, H);
			// The signal breaking up.
			c.save();
			c.globalAlpha = 0.07 + 0.05 * pulse;
			c.font = "700 90px sans-serif";
			c.textAlign = "center";
			c.fillStyle = "#ff6a5a";
			c.fillText("SYGNAŁ UTRACONY", W / 2 + (o.reduced ? 0 : (rnd(Math.floor(t * 8)) - 0.5) * 10), 150);
			c.restore();
			if (!o.reduced && rnd(Math.floor(t * 12)) > 0.85)
				for (let i = 0; i < 12; i++) {
					c.fillStyle = i % 2 ? "rgba(255,90,80,0.25)" : "rgba(0,0,0,0.5)";
					c.fillRect(0, rnd(i + Math.floor(t * 30)) * H, W, 2 + rnd(i) * 6);
				}
		}
		// Grain and a vignette.
		if (!o.reduced) {
			const seed = Math.floor(t * 24);
			for (let i = 0; i < 300; i++) {
				c.fillStyle = rnd(i + seed * 0.37) > 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.08)";
				c.fillRect(rnd(i * 3.1 + seed) * W, rnd(i * 5.7 + seed) * H, 1.5, 1.5);
			}
		}
		const vg = c.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7);
		vg.addColorStop(0, "rgba(0,0,0,0)");
		vg.addColorStop(1, "rgba(0,0,0,0.6)");
		c.fillStyle = vg;
		c.fillRect(0, 0, W, H);
	}

	// Puts the backdrop under the report in `overlay` and runs it while it is there.
	function mount(overlay, o) {
		if (typeof CampaignFilm === "undefined" || !overlay) return null;
		const k = CampaignFilm.kit,
			canvas = document.createElement("canvas");
		canvas.className = "end-backdrop";
		canvas.setAttribute("aria-hidden", "true");
		overlay.prepend(canvas);
		const c = canvas.getContext("2d"),
			start = performance.now();
		// The scene is drawn at 960 × 400 and stretched to cover the battlefield (cropped, not squashed).
		const fit = () => {
			const r = overlay.getBoundingClientRect(),
				dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.width = Math.max(1, Math.round(r.width * dpr));
			canvas.height = Math.max(1, Math.round(r.height * dpr));
			const s = Math.max(canvas.width / k.W, canvas.height / k.H);
			c.setTransform(s, 0, 0, s, (canvas.width - k.W * s) / 2, (canvas.height - k.H * s) / 2);
		};
		fit();
		const frame = (now) => {
			if (!canvas.isConnected || overlay.hidden) return;
			if (canvas.width !== Math.round(overlay.getBoundingClientRect().width * Math.min(2, window.devicePixelRatio || 1))) fit();
			draw(c, k, o.reduced ? 3 : (now - start) / 1000, o);
			if (!o.reduced) requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
		return canvas;
	}
	// Numbers in the report count up from zero.
	function countUp(root, reduced) {
		for (const b of root.querySelectorAll(".briefing-controls b")) {
			const m = b.textContent.match(/^(\d+)(.*)$/s);
			if (!m || reduced || m[2].includes(":")) continue;
			const target = Number(m[1]),
				rest = m[2],
				start = performance.now();
			const step = (now) => {
				if (!b.isConnected) return;
				const f = Math.min(1, (now - start) / 1200),
					e = 1 - (1 - f) ** 3;
				b.textContent = Math.round(target * e) + rest;
				if (f < 1) requestAnimationFrame(step);
			};
			b.textContent = "0" + rest;
			requestAnimationFrame(step);
		}
	}
	return { mount, countUp, draw };
})();
if (typeof window !== "undefined") window.EndScreen = EndScreen;
