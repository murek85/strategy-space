/* The main menu's backdrop, in the style of the campaign films (campaign-film.js kit): a living star system behind
   the command deck — a large world on the right with drifting clouds, city lights on its night side and a moon on
   its orbit, nebulae, stars in three depths moving a little with the pointer, a chain of beacons in the distance,
   a sun flare, now and then a convoy passing; corner brackets and a scan band. On a briefing (and while choosing a
   scenario's map) the world takes the colours of the mission's planet and a target lock closes in on it
   (`setWorld`). One canvas kept across the menu's
   screens (menu.js puts it back after every render); it rests while the menu is hidden or a film plays, and with
   reduced motion it draws a still frame. */
const MenuBackdrop = (() => {
	// The worlds of the missions (land, night side, atmosphere); the command deck's own world by default.
	const WORLDS = {
		deck: ["#5f9690", "#07121a", "#8fe6d8"],
		dust: ["#c69a5c", "#2a1c12", "#ffd29a"],
		ice: ["#d9e8f0", "#3a5060", "#bfe6ff"],
		ash: ["#7a5a50", "#1a100e", "#ff9a6a"],
		lumen: ["#4f8a7f", "#0e1a1a", "#9fffd8"],
		magma: ["#8a3a24", "#1a0806", "#ff7a3a"],
		frozenhive: ["#b8d0e0", "#2a3a50", "#c9b8ff"],
		derelict: ["#6a6a66", "#141414", "#ffb08a"],
	};
	const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	const css = (v) => `rgb(${v.map(Math.round).join(",")})`;
	// The target lock around the world of a briefing: brackets closing in, a ring and the planet's name.
	function lock(c, cx, cy, r, t, label, amount) {
		if (amount <= 0.01) return;
		const s = r * (1.15 + (1 - amount) * 0.4),
			arm = r * 0.28;
		c.save();
		c.globalAlpha = amount;
		c.strokeStyle = "#f0cf8a";
		c.lineWidth = 1.5;
		for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
			c.beginPath();
			c.moveTo(cx + dx * s, cy + dy * (s - arm));
			c.lineTo(cx + dx * s, cy + dy * s);
			c.lineTo(cx + dx * (s - arm), cy + dy * s);
			c.stroke();
		}
		c.globalAlpha = amount * 0.5;
		c.setLineDash([2, 6]);
		c.lineDashOffset = -t * 8;
		c.beginPath();
		c.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
		c.stroke();
		c.setLineDash([]);
		c.globalAlpha = amount * 0.85;
		c.fillStyle = "#f0cf8a";
		c.font = "600 9px Consolas, monospace";
		c.textAlign = "left";
		c.fillText(`◎ CEL · ${label.toUpperCase()}`, cx - s + arm + 8, cy - s + 4);
		c.globalAlpha = amount * 0.55;
		c.fillText(`ORBITA ${(r * 3.1 + Math.sin(t * 0.3) * 4).toFixed(1)} KM · SKAN ${Math.floor((t * 7) % 100)}%`, cx - s + arm + 8, cy - s + 18);
		c.restore();
	}
	function scene(c, k, t, px, py, world = { colors: WORLDS.deck.map(rgb), lock: 0, label: "" }) {
		const { W, H, rnd, glow, flare, stars, nebula, planet, freighter, capital, beacon } = k;
		c.fillStyle = "#03070d";
		c.fillRect(0, 0, W, H);
		nebula(c, t, [[300, 120, 340, "#16405a", 0.55, 0.6], [760, 300, 300, "#2a2a5a", 0.4, -0.4], [520, 60, 220, "#18404a", 0.3, 0.3]]);
		// Stars in three depths, shifted by the pointer (parallax).
		for (const [depth, n, seed] of [[0.2, 140, 81], [0.5, 90, 82], [1, 50, 83]]) {
			c.save();
			c.translate(-px * 14 * depth, -py * 8 * depth);
			stars(c, t, 1.2 * depth, n, seed);
			c.restore();
		}
		// The sun beyond the world.
		flare(c, 905 - px * 4, 48 - py * 3, 0.55, "#ffd8a8");
		// The world, its orbits and moon.
		const cx = 800 - px * 24,
			cy = 235 - py * 14,
			r = 132;
		c.save();
		c.strokeStyle = "rgba(155,199,190,0.16)";
		c.lineWidth = 1;
		c.beginPath();
		c.ellipse(cx, cy, r * 1.75, r * 0.55, -0.32, 0, Math.PI * 2);
		c.stroke();
		c.setLineDash([3, 7]);
		c.strokeStyle = "rgba(155,199,190,0.12)";
		c.beginPath();
		c.ellipse(cx, cy, r * 2.1, r * 0.7, -0.32, 0, Math.PI * 2);
		c.stroke();
		c.restore();
		const ma = t * 0.05,
			mx = cx + Math.cos(ma) * r * 1.75 * Math.cos(-0.32) - Math.sin(ma) * r * 0.55 * Math.sin(-0.32),
			my = cy + Math.cos(ma) * r * 1.75 * Math.sin(-0.32) + Math.sin(ma) * r * 0.55 * Math.cos(-0.32),
			behind = Math.sin(ma) < 0;
		const moon = () => planet(c, mx, my, 12, { base: "#c9ccd2", dark: "#2a2e36", atmo: "#dfe8f0", light: -0.6, clouds: 0, t, seed: 85 });
		if (behind) moon();
		const [land, night, air] = world.colors.map(css);
		planet(c, cx, cy, r, { base: land, dark: night, atmo: air, light: -2.5, cities: 0.7, clouds: 0.55, t: t * 6, seed: 84 });
		if (!behind) moon();
		lock(c, cx, cy, r, t, world.label, world.lock);
		// A chain of beacons far off, a slow pulse running down it.
		const chain = Array.from({ length: 6 }, (_, i) => [90 + i * 70 - px * 10, 330 - i * 26 - py * 6]);
		chain.forEach(([x, y], i) => beacon(c, x, y, 0.45, 0.8, t, i));
		const kk = (t * 0.5) % (chain.length - 1),
			i0 = Math.floor(kk),
			f = kk - i0;
		glow(c, chain[i0][0] + (chain[i0 + 1][0] - chain[i0][0]) * f, chain[i0][1] - 4 + (chain[i0 + 1][1] - chain[i0][1]) * f, 10, "#c9fff0", 0.8);
		// A convoy crossing every half a minute, a cruiser drifting far behind it.
		const pass = (t % 32) / 32;
		if (pass < 0.6)
			for (let i = 0; i < 4; i++) freighter(c, -120 + pass * 1900 - i * 70, 44 + i * 10 + Math.sin(i) * 4, 0.4 - i * 0.04, t, i);
		capital(c, ((t * 3 + 300) % 1400) - 200, 360, 0.3, t, false);
		// A vignette darker on the left, where the menu's text is.
		const v = c.createLinearGradient(0, 0, W, 0);
		v.addColorStop(0, "rgba(3,7,13,0.75)");
		v.addColorStop(0.45, "rgba(3,7,13,0.25)");
		v.addColorStop(1, "rgba(3,7,13,0)");
		c.fillStyle = v;
		c.fillRect(0, 0, W, H);
		const g = c.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7);
		g.addColorStop(0, "rgba(0,0,0,0)");
		g.addColorStop(1, "rgba(0,0,0,0.55)");
		c.fillStyle = g;
		c.fillRect(0, 0, W, H);
	}

	// The backdrop for the menu: a canvas (with the HUD frame) that the menu puts back after every render.
	function create(menu) {
		if (typeof CampaignFilm === "undefined") return null;
		const k = CampaignFilm.kit,
			wrap = document.createElement("div"),
			canvas = document.createElement("canvas");
		wrap.className = "menu-backdrop";
		wrap.setAttribute("aria-hidden", "true");
		wrap.innerHTML = '<div class="menu-hud"><i></i><i></i><i></i><i></i><b></b></div>';
		wrap.prepend(canvas);
		const c = canvas.getContext("2d"),
			start = performance.now();
		let px = 0,
			py = 0,
			tx = 0,
			ty = 0,
			last = 0,
			drawnStill = false;
		// The world shown: its colours ease towards the chosen mission's world, the target lock closes in on it.
		const world = { colors: WORLDS.deck.map(rgb), lock: 0, label: "" };
		let target = { colors: world.colors, lock: 0 };
		wrap.setWorld = (mission) => {
			const key = mission && (WORLDS[mission.theme] ? mission.theme : WORLDS[mission.biome] ? mission.biome : "dust");
			target = { colors: (mission ? WORLDS[key] : WORLDS.deck).map(rgb), lock: mission ? 1 : 0 };
			if (mission) world.label = (mission.planet || "").split(" — ")[0];
			drawnStill = false;
			if (menu.reduced) Object.assign(world, target);
		};
		const ease = (f) => {
			world.colors = world.colors.map((v, i) => v.map((x, j) => x + (target.colors[i][j] - x) * f));
			world.lock += (target.lock - world.lock) * f;
		};
		const fit = () => {
			const dpr = Math.min(1.5, window.devicePixelRatio || 1);
			canvas.width = Math.round(innerWidth * dpr);
			canvas.height = Math.round(innerHeight * dpr);
			const s = Math.max(canvas.width / k.W, canvas.height / k.H);
			c.setTransform(s, 0, 0, s, (canvas.width - k.W * s) / 2, (canvas.height - k.H * s) / 2);
			drawnStill = false;
		};
		fit();
		addEventListener("resize", fit);
		addEventListener("pointermove", (e) => {
			tx = e.clientX / innerWidth - 0.5;
			ty = e.clientY / innerHeight - 0.5;
		});
		const frame = (now) => {
			requestAnimationFrame(frame);
			// Rest while the menu is hidden, a film is on, or nothing changes (reduced motion).
			if (!wrap.isConnected || menu.root.hidden || getComputedStyle(wrap).display === "none") return;
			if (menu.reduced) {
				if (!drawnStill) scene(c, k, 20, 0, 0, world);
				drawnStill = true;
				return;
			}
			drawnStill = false;
			// About 30 frames a second is enough for a slow backdrop.
			if (now - last < 32) return;
			last = now;
			px += (tx - px) * 0.05;
			py += (ty - py) * 0.05;
			ease(0.06);
			scene(c, k, (now - start) / 1000, px, py, world);
		};
		requestAnimationFrame(frame);
		return wrap;
	}
	return { create, scene };
})();
if (typeof window !== "undefined") window.MenuBackdrop = MenuBackdrop;
