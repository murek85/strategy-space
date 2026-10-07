/* The campaign prologue: six 5-second shots in the manner of a sci-fi game cinematic, drawn locally on a canvas
   (no video files): a slow camera push, letterboxed frame, nebulae and parallax stars, planets with lit
   atmospheres and city lights, detailed ships with running lights and engine trails, laser fire, lens flares,
   a tactical HUD, typed titles with a glitch, colour grading, vignette and film grain. Deterministic (the same
   time gives the same frame); with reduced motion the camera, flicker, shake and grain stand still.
   Shots: the convoy routes and the beacons; the Dominium blockade; the sector going dark; Lira's holographic
   transmission from Eos; the run through the ice canyons of Vesper; dawn over the fleet. */
const CampaignFilm = (() => {
	const duration = 30;
	const captions = [
		"Latarnie pogranicza prowadziły konwoje między wolnymi światami. Każdy sygnał oznaczał bezpieczny powrót.",
		"Flota Dominium zajęła orbitalne węzły. Jeden rozkaz odciął Kolonie od energii i dostaw.",
		"Miasta pogrążyły się w ciemności. Ostatni transport pomocy czekał na szlak, który przestał istnieć.",
		"Lira ocaliła nadajnik na Eos. Jej wiadomość ujawniła drogę do klucza ukrytego w lodowym archiwum.",
		"Mała ekspedycja ruszyła ku Vesperowi. W cieniu lodowych grzbietów rodził się plan przełamania blokady.",
		"Odzyskaj Eos. Zdobądź klucz. Przywróć latarnie. Odzyskany Świt zaczyna się od twojego rozkazu.",
	];
	const titles = [
		"SZLAKI WOLNYCH KOLONII",
		"BLOKADA DOMINIUM",
		"SEKTOR BEZ ŚWIATŁA",
		"TRANSMISJA / EOS / LIRA",
		"KURS NA VESPER",
		"OPERACJA ODZYSKANY ŚWIT",
	];
	const places = ["SEKTOR 07 · KORYTARZ HELION", "ORBITA KHEPRI IV", "KHEPRI IV · STRONA NOCNA", "KANAŁ 7.31 · SZYFR KOLONII", "VESPER · LODOWE WROTA", "SEKTOR 07 · ŚWIT"];
	const W = 960,
		H = 400,
		BAR = 34;
	const rnd = (n) => {
		const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
		return x - Math.floor(x);
	};
	const clamp01 = (x) => Math.max(0, Math.min(1, x));
	const ease = (x) => x * x * (3 - 2 * x);

	// ---------- drawing helpers ----------
	function poly(c, p, color) {
		c.fillStyle = color;
		c.beginPath();
		p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.closePath();
		c.fill();
	}
	// A soft light (added on top).
	function glow(c, x, y, r, color, alpha = 1) {
		if (r <= 0) return;
		const g = c.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, color);
		g.addColorStop(1, "rgba(0,0,0,0)");
		c.save();
		c.globalCompositeOperation = "lighter";
		c.globalAlpha = alpha;
		c.fillStyle = g;
		c.fillRect(x - r, y - r, 2 * r, 2 * r);
		c.restore();
	}
	// Anamorphic lens flare: a long horizontal streak, a core and a few ghosts across the centre.
	function flare(c, x, y, strength, tint = "#9fd8ff") {
		if (strength <= 0) return;
		c.save();
		c.globalCompositeOperation = "lighter";
		const g = c.createLinearGradient(x - 520, y, x + 520, y);
		g.addColorStop(0, "rgba(0,0,0,0)");
		g.addColorStop(0.5, tint);
		g.addColorStop(1, "rgba(0,0,0,0)");
		c.globalAlpha = 0.55 * strength;
		c.fillStyle = g;
		c.fillRect(x - 520, y - 1.5, 1040, 3);
		c.globalAlpha = 0.25 * strength;
		c.fillRect(x - 380, y - 6, 760, 12);
		c.restore();
		glow(c, x, y, 70 * strength, "#ffffff", 0.9);
		glow(c, x, y, 160 * strength, tint, 0.35);
		for (const [k, r, col] of [[-0.35, 18, "#7fd0ff"], [-0.7, 9, "#b48cff"], [-1.1, 26, "#ffc98a"]]) {
			const gx = x + (W / 2 - x) * -k * 2,
				gy = y + (H / 2 - y) * -k * 2;
			glow(c, gx, gy, r * 2 * strength, col, 0.35);
		}
	}
	function stars(c, t, speed, count, seed, tint = "#d6e8f5") {
		for (let i = 0; i < count; i++) {
			const z = rnd(i + seed) * 0.8 + 0.2,
				x = (((rnd(i * 3 + seed) * W - t * speed * z) % W) + W) % W,
				y = rnd(i * 7 + seed) * H,
				tw = 0.55 + 0.45 * Math.sin(t * (1.5 + rnd(i) * 3) + i);
			c.globalAlpha = (0.25 + z * 0.75) * tw;
			c.fillStyle = tint;
			const s = z > 0.85 ? 2 : z > 0.55 ? 1.4 : 1;
			c.fillRect(x, y, s, s);
			if (z > 0.95) glow(c, x + 1, y + 1, 6, "#bfe6ff", 0.25 * tw);
		}
		c.globalAlpha = 1;
	}
	// Nebula: soft drifting clouds of colour.
	function nebula(c, t, clouds) {
		c.save();
		c.globalCompositeOperation = "lighter";
		for (const [x, y, r, col, a, drift] of clouds) {
			const g = c.createRadialGradient(x + t * drift, y, 0, x + t * drift, y, r);
			g.addColorStop(0, col);
			g.addColorStop(1, "rgba(0,0,0,0)");
			c.globalAlpha = a;
			c.fillStyle = g;
			c.beginPath();
			c.ellipse(x + t * drift, y, r * 1.6, r, 0.3, 0, Math.PI * 2);
			c.fill();
		}
		c.restore();
	}
	// A planet: lit side towards the light, a dark night side, city lights (share alive), clouds, a rim of
	// atmosphere, optional rings.
	function planet(c, x, y, r, o) {
		const { base, dark = "#060b12", atmo = "#7fd6ff", light = -0.8, cities = 0, clouds = 0.5, rings = null, t = 0, seed = 1 } = o;
		const lx = Math.cos(light),
			ly = Math.sin(light);
		if (rings) {
			c.save();
			c.translate(x, y);
			c.rotate(-0.28);
			c.strokeStyle = rings;
			for (let k = 0; k < 4; k++) {
				c.globalAlpha = 0.25 - k * 0.04;
				c.lineWidth = 10 - k * 2;
				c.beginPath();
				c.ellipse(0, 0, r * (1.55 + k * 0.12), r * (0.32 + k * 0.025), 0, Math.PI, Math.PI * 2);
				c.stroke();
			}
			c.restore();
		}
		glow(c, x, y, r * 1.18, atmo, 0.35);
		c.save();
		c.beginPath();
		c.arc(x, y, r, 0, Math.PI * 2);
		c.clip();
		const g = c.createRadialGradient(x + lx * r * 0.55, y + ly * r * 0.55, r * 0.05, x, y, r * 1.05);
		g.addColorStop(0, base);
		g.addColorStop(0.55, base);
		g.addColorStop(1, dark);
		c.fillStyle = g;
		c.fillRect(x - r, y - r, 2 * r, 2 * r);
		// Continents (darker patches) and streaks of cloud, scattered, drifting slowly.
		for (let i = 0; i < 14; i++) {
			c.globalAlpha = 0.18;
			c.fillStyle = dark;
			c.beginPath();
			c.ellipse(x + (rnd(i * 2 + seed) - 0.5) * r * 1.7, y + (rnd(i * 4 + seed) - 0.5) * r * 1.7, r * (0.1 + rnd(i + seed) * 0.22), r * (0.05 + rnd(i * 9 + seed) * 0.12), rnd(i * 6) * 3, 0, Math.PI * 2);
			c.fill();
		}
		c.fillStyle = "#eef6f8";
		for (let i = 0; i < 46; i++) {
			c.globalAlpha = clouds * (0.08 + rnd(i * 3 + seed) * 0.16);
			c.beginPath();
			c.ellipse(x + (rnd(i * 7 + seed) - 0.5) * r * 1.9 + t * 0.6, y + (rnd(i * 11 + seed) - 0.5) * r * 1.9, r * (0.06 + rnd(i * 5 + seed) * 0.2), r * (0.012 + rnd(i * 13 + seed) * 0.02), -0.15 + rnd(i) * 0.2, 0, Math.PI * 2);
			c.fill();
		}
		c.globalAlpha = 1;
		// The night side.
		const n = c.createLinearGradient(x + lx * r, y + ly * r, x - lx * r, y - ly * r);
		n.addColorStop(0, "rgba(0,0,0,0)");
		n.addColorStop(0.45, "rgba(2,5,10,0.15)");
		n.addColorStop(0.62, "rgba(2,5,10,0.85)");
		n.addColorStop(1, "rgba(2,5,10,0.97)");
		c.fillStyle = n;
		c.fillRect(x - r, y - r, 2 * r, 2 * r);
		// City lights on the night side.
		if (cities > 0)
			for (let i = 0, count = Math.round(r * 2.2); i < count; i++) {
				const a = rnd(i + seed * 7) * Math.PI * 2,
					d = Math.sqrt(rnd(i * 3 + seed)) * r * 0.97,
					px = x + Math.cos(a) * d,
					py = y + Math.sin(a) * d,
					side = (px - x) * lx + (py - y) * ly;
				if (side > -r * 0.1 || rnd(i * 11) > cities) continue;
				const c2 = rnd(i * 13) > 0.8 ? "#ffd38a" : "#ffb35c";
				c.fillStyle = c2;
				c.globalAlpha = 0.6 + 0.4 * rnd(i * 17);
				c.fillRect(px, py, 1.6, 1.6);
				if (rnd(i * 19) > 0.85) glow(c, px, py, 5, "#ffb35c", 0.35);
			}
		c.globalAlpha = 1;
		c.restore();
		// The lit rim of the atmosphere.
		c.save();
		c.globalCompositeOperation = "lighter";
		c.strokeStyle = atmo;
		c.lineWidth = 3;
		c.globalAlpha = 0.6;
		c.beginPath();
		c.arc(x, y, r + 1, light - 1.3, light + 1.3);
		c.stroke();
		c.restore();
	}
	// An engine trail behind a ship heading right (dx < 0 behind).
	function trail(c, x, y, len, width, color) {
		c.save();
		c.globalCompositeOperation = "lighter";
		const g = c.createLinearGradient(x, y, x - len, y);
		g.addColorStop(0, color);
		g.addColorStop(1, "rgba(0,0,0,0)");
		c.fillStyle = g;
		c.beginPath();
		c.moveTo(x, y - width);
		c.lineTo(x - len, y);
		c.lineTo(x, y + width);
		c.closePath();
		c.fill();
		c.restore();
		glow(c, x, y, width * 3.5, color, 0.9);
	}
	// A capital ship heading right: a long wedge hull in layers, panel lines, a bridge, rows of windows, blinking
	// running lights, a bank of engines.
	function capital(c, x, y, s, t, enemy) {
		const hull = enemy ? ["#2b2f36", "#3b4049", "#555b66"] : ["#2a3a44", "#3c5361", "#6a8794"],
			lights = enemy ? "#ff5a4a" : "#7fe7ff";
		c.save();
		c.translate(x, y);
		c.scale(s, s);
		trail(c, -120, -8, 160, 6, enemy ? "#ff7a4a" : "#6fd8ff");
		trail(c, -120, 10, 160, 6, enemy ? "#ff7a4a" : "#6fd8ff");
		poly(c, [[150, 4], [-118, -34], [-126, 0], [-118, 40]], hull[0]);
		poly(c, [[150, 4], [-110, -30], [-60, -10], [40, -6]], hull[1]);
		poly(c, [[-40, -24], [-10, -44], [40, -44], [52, -20]], hull[1]);
		poly(c, [[-26, -44], [-4, -58], [24, -58], [30, -44]], hull[2]);
		poly(c, [[150, 4], [-60, 14], [-118, 40]], "#14191f");
		c.strokeStyle = "rgba(255,255,255,0.08)";
		c.lineWidth = 1;
		for (let k = -100; k < 130; k += 22) {
			c.beginPath();
			c.moveTo(k, -28 + (k + 100) * 0.12);
			c.lineTo(k + 6, 18 - (k + 100) * 0.05);
			c.stroke();
		}
		for (let k = 0; k < 26; k++) {
			c.fillStyle = rnd(k + (enemy ? 50 : 0)) > 0.4 ? (enemy ? "#ffb08a" : "#bfefff") : "#22303a";
			c.fillRect(-96 + k * 8, -14 + (k % 3), 3, 1.6);
		}
		for (const [lx, ly, ph] of [[148, 4, 0], [-118, -34, 1.7], [-118, 40, 3.1], [22, -58, 0.8]]) {
			const on = Math.sin(t * 3 + ph) > 0.2 ? 1 : 0.15;
			glow(c, lx, ly, 10, lights, on);
			c.fillStyle = lights;
			c.globalAlpha = on;
			c.fillRect(lx - 1, ly - 1, 2.5, 2.5);
			c.globalAlpha = 1;
		}
		c.restore();
	}
	// A convoy freighter heading right: a cab, a spine with containers, engines.
	function freighter(c, x, y, s, t, i) {
		c.save();
		c.translate(x, y);
		c.scale(s, s);
		trail(c, -46, 0, 80, 4, "#7fdcff");
		c.fillStyle = "#4a5d68";
		c.fillRect(-44, -3, 70, 6);
		for (let k = 0; k < 4; k++) {
			c.fillStyle = ["#9a7f52", "#5f7f8a", "#a5654c", "#6f8f6a"][(k + i) % 4];
			c.fillRect(-38 + k * 15, -11, 13, 9);
			c.fillRect(-38 + k * 15, 3, 13, 8);
		}
		poly(c, [[26, -8], [46, -2], [46, 4], [26, 9]], "#8aa6b1");
		c.fillStyle = "#cfefff";
		c.fillRect(38, -2, 5, 2);
		glow(c, 46, 1, 6, "#e9fbff", 0.5 + 0.5 * Math.sin(t * 4 + i));
		c.restore();
	}
	// A fighter heading along `a` (radians).
	function fighter(c, x, y, s, a, enemy) {
		c.save();
		c.translate(x, y);
		c.rotate(a);
		c.scale(s, s);
		trail(c, -12, 0, 40, 2.5, enemy ? "#ff7a4a" : "#7fdcff");
		poly(c, [[16, 0], [-10, -9], [-6, 0], [-10, 9]], enemy ? "#5b6069" : "#8fb2bd");
		poly(c, [[16, 0], [-6, 0], [-10, 9]], "#1c2228");
		c.restore();
	}
	function beam(c, x1, y1, x2, y2, color, w, alpha = 1) {
		c.save();
		c.globalCompositeOperation = "lighter";
		c.globalAlpha = alpha;
		c.lineCap = "round";
		for (const [lw, a, col] of [[w * 5, 0.18, color], [w * 2, 0.5, color], [w * 0.6, 1, "#ffffff"]]) {
			c.globalAlpha = alpha * a;
			c.strokeStyle = col;
			c.lineWidth = lw;
			c.beginPath();
			c.moveTo(x1, y1);
			c.lineTo(x2, y2);
			c.stroke();
		}
		c.restore();
	}
	// A beacon: a small station with a lamp (on, flickering or dead).
	function beacon(c, x, y, s, state, t, i) {
		c.save();
		c.translate(x, y);
		c.scale(s, s);
		c.fillStyle = "#56656e";
		c.fillRect(-2, -10, 4, 20);
		c.fillRect(-9, -2, 18, 4);
		c.restore();
		if (state > 0) {
			const pulse = 0.75 + 0.25 * Math.sin(t * 3 + i);
			glow(c, x, y - 10 * s, 26 * s, "#8dffd0", state * pulse);
			glow(c, x, y - 10 * s, 8 * s, "#ffffff", state);
		}
	}

	// ---------- frame ----------
	function hud(c, scene, local, time, reduced, spec) {
		c.save();
		c.strokeStyle = "rgba(160,220,230,0.55)";
		c.lineWidth = 1.2;
		const m = 18,
			top = BAR + 10,
			bot = H - BAR - 10;
		for (const [x, y, dx, dy] of [[m, top, 1, 1], [W - m, top, -1, 1], [m, bot, 1, -1], [W - m, bot, -1, -1]]) {
			c.beginPath();
			c.moveTo(x, y + dy * 14);
			c.lineTo(x, y);
			c.lineTo(x + dx * 14, y);
			c.stroke();
		}
		c.font = "10px monospace";
		c.fillStyle = "rgba(170,225,235,0.75)";
		const tc = 7 * 3600 + 41 * 60 + Math.floor(time * 24) / 24;
		const hh = Math.floor(tc / 3600),
			mm = Math.floor((tc % 3600) / 60),
			ss = Math.floor(tc % 60),
			ff = Math.floor((tc % 1) * 24);
		c.fillText(`T+${[hh, mm, ss, ff].map((v) => String(v).padStart(2, "0")).join(":")}`, W - m - 92, top + 26);
		c.fillText(spec.places[scene], m + 8, top + 42);
		c.fillText(`${(48.2 + scene * 7.3).toFixed(1)}° / ${(12.7 + time * 0.4).toFixed(2)} AU`, W - m - 120, bot - 8);
		// A blinking record mark.
		if (reduced || Math.floor(time * 2) % 2 === 0) {
			c.fillStyle = spec.alarm?.includes(scene) ? "#ff6a5a" : "#7fe7c8";
			c.beginPath();
			c.arc(m + 14, top + 22, 3, 0, Math.PI * 2);
			c.fill();
		}
		c.fillStyle = "rgba(170,225,235,0.75)";
		c.fillText(spec.alarm?.includes(scene) ? "ALARM" : spec.receive?.includes(scene) ? "ODBIÓR" : "NAGR.", m + 22, top + 26);
		c.restore();
	}
	// A title typed letter by letter with a short glitch, a line drawing under it.
	function title(c, text, local, scene, reduced, spec) {
		const shown = reduced ? text.length : Math.floor(clamp01((local - 0.35) / 1.1) * text.length),
			fade = reduced ? 1 : clamp01((4.6 - local) / 0.4),
			x = 46,
			y = H - BAR - 46;
		if (shown <= 0) return;
		c.save();
		c.globalAlpha = fade;
		c.font = "600 22px sans-serif";
		const str = text.slice(0, shown);
		const glitch = !reduced && local < 1.6 && rnd(Math.floor(local * 30) + scene) > 0.7;
		if (glitch) {
			c.fillStyle = "rgba(255,80,90,0.7)";
			c.fillText(str, x + 2, y);
			c.fillStyle = "rgba(80,220,255,0.7)";
			c.fillText(str, x - 2, y);
		}
		c.fillStyle = "#eaf6f8";
		c.shadowColor = "rgba(127,231,200,0.8)";
		c.shadowBlur = 12;
		c.fillText(str, x, y);
		c.shadowBlur = 0;
		const typed = c.measureText(str).width;
		const lw = (reduced ? 1 : clamp01((local - 0.3) / 1.4)) * 260;
		c.fillStyle = "#7fe7c8";
		c.fillRect(x, y + 10, lw, 1.5);
		c.font = "10px monospace";
		c.fillStyle = "rgba(170,225,235,0.8)";
		c.fillText(`${spec.label} 0${scene + 1} / 0${spec.shots.length}`, x, y + 26);
		if (!reduced && shown < text.length && Math.floor(local * 6) % 2 === 0) c.fillRect(x + typed + 4, y - 16, 10, 18);
		c.restore();
	}
	// Colour grade, vignette, grain, scan band and the letterbox.
	function finish(c, scene, local, time, reduced, tint) {
		c.save();
		c.globalCompositeOperation = "soft-light";
		c.fillStyle = tint;
		c.fillRect(0, 0, W, H);
		c.restore();
		const v = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
		v.addColorStop(0, "rgba(0,0,0,0)");
		v.addColorStop(1, "rgba(0,0,0,0.72)");
		c.fillStyle = v;
		c.fillRect(0, 0, W, H);
		if (!reduced) {
			const seed = Math.floor(time * 24);
			for (let i = 0; i < 420; i++) {
				c.fillStyle = rnd(i + seed * 0.37) > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.09)";
				c.fillRect(rnd(i * 3.1 + seed) * W, rnd(i * 5.7 + seed) * H, 1.5, 1.5);
			}
			const band = ((time * 70) % (H + 60)) - 30;
			c.fillStyle = "rgba(180,230,255,0.025)";
			c.fillRect(0, band, W, 18);
		}
		c.fillStyle = "#000";
		c.fillRect(0, 0, W, BAR);
		c.fillRect(0, H - BAR, W, BAR);
	}

	// ---------- shots ----------
	const SHOTS = [
		// The routes: a ringed world, a chain of beacons passing light along, a convoy and an escort cruiser.
		(c, t, local) => {
			nebula(c, t, [[220, 120, 260, "#2a5a7a", 0.5, 2], [760, 90, 220, "#3b2e6a", 0.35, -1.5], [520, 330, 300, "#14404a", 0.4, 1]]);
			stars(c, t, 6, 220, 1);
			planet(c, 720, 330, 210, { base: "#4f8a93", atmo: "#8fe9ff", light: -2.3, cities: 0.6, rings: "#bfe3e8", t, seed: 3 });
			const chain = Array.from({ length: 6 }, (_, i) => [300 + i * 95, 175 + Math.sin(i * 1.1) * 40]);
			c.save();
			c.strokeStyle = "rgba(141,255,208,0.18)";
			c.setLineDash([4, 6]);
			c.beginPath();
			chain.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
			c.stroke();
			c.restore();
			chain.forEach(([x, y], i) => beacon(c, x, y, 0.9, 1, t, i));
			// A pulse of light running down the chain.
			const k = (t * 1.6) % (chain.length - 1),
				i0 = Math.floor(k),
				f = k - i0,
				[ax, ay] = chain[i0],
				[bx, by] = chain[i0 + 1];
			glow(c, ax + (bx - ax) * f, ay + (by - ay) * f, 18, "#c9fff0", 0.9);
			for (let i = 0; i < 5; i++) freighter(c, 60 + i * 120 + local * 26, 270 + (i % 2) * 26 - i * 6, 0.85 - i * 0.05, t, i);
			capital(c, 230 + local * 12, 110, 0.75, t, false);
			flare(c, 140, 70, 0.55, "#9fd8ff");
		},
		// The blockade: a Dominium dreadnought slides in, fighters, beams putting out the beacons.
		(c, t, local, reduced) => {
			nebula(c, t, [[700, 100, 280, "#5a1f2a", 0.45, -1], [200, 300, 260, "#2a1f3a", 0.4, 1]]);
			stars(c, t, 4, 200, 2, "#f0d8d8");
			planet(c, 760, 360, 230, { base: "#5f6a7f", atmo: "#ff9a8a", light: -2.0, cities: 0.5, t, seed: 4 });
			const beacons = Array.from({ length: 5 }, (_, i) => [470 + i * 85, 225 + Math.sin(i) * 35]);
			beacons.forEach(([x, y], i) => {
				const out = local > 1.2 + i * 0.55;
				beacon(c, x, y, 0.8, out ? 0 : 1, t, i);
				if (local > 0.9 + i * 0.55 && !out) beam(c, 330, 120, x, y - 8, "#ff5a4a", 2.2, 0.9);
				if (out && local < 1.5 + i * 0.55) glow(c, x, y, 40, "#ff8a5a", 0.8);
			});
			const enter = ease(clamp01(local / 3.2));
			capital(c, -260 + enter * 520 + local * 6, 120, 1.55, t, true);
			for (let i = 0; i < 7; i++) fighter(c, 120 + i * 90 + local * (40 + i * 6), 280 + Math.sin(i * 2 + t) * 30, 0.9, 0.12 * Math.sin(i), true);
		},
		// The dark: the night side of Khepri IV going out city by city; a last transport waiting on its pad.
		(c, t, local) => {
			nebula(c, t, [[300, 90, 300, "#16283a", 0.5, 1]]);
			stars(c, t, 3, 180, 3);
			// (The light comes from below the horizon: the visible face is the night side, its cities going out.)
			planet(c, 480, 420, 330, { base: "#3c5560", atmo: "#5fb8d8", light: 2.2, cities: Math.max(0.04, 1 - local / 4), clouds: 0.35, t, seed: 6 });
			// The night limb: a thin line of air lit from behind.
			c.save();
			c.globalCompositeOperation = "lighter";
			c.strokeStyle = "#4fa8d8";
			for (const [lw, a] of [[10, 0.08], [3, 0.35], [1.2, 0.8]]) {
				c.lineWidth = lw;
				c.globalAlpha = a;
				c.beginPath();
				c.arc(480, 420, 331, Math.PI * 1.08, Math.PI * 1.92);
				c.stroke();
			}
			c.restore();
			// The network readout falling.
			c.font = "11px monospace";
			c.fillStyle = "rgba(255,170,120,0.85)";
			c.fillText(`SIEĆ LATARNI: ${Math.max(0, Math.round(100 - local * 32))}%`, 760, 104);
			c.fillStyle = "rgba(255,170,120,0.2)";
			c.fillRect(760, 110, 140, 4);
			c.fillStyle = "rgba(255,170,120,0.85)";
			c.fillRect(760, 110, 140 * Math.max(0, 1 - local / 3.1), 4);
			// The last transport: lights on its pad on the horizon.
			freighter(c, 250 + local * 3, 150, 1.25, t, 2);
			glow(c, 250, 170, 50, "#ffb35c", 0.25);
		},
		// The transmission: a hologram of Lira in a comm frame, the route Eos → Vesper on a star map, a waveform.
		(c, t, local, reduced) => {
			c.fillStyle = "#04121a";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[480, 200, 360, "#0f3a44", 0.6, 0]]);
			// Holo panel.
			const jitter = reduced ? 0 : rnd(Math.floor(t * 12)) > 0.9 ? (rnd(t) - 0.5) * 8 : 0;
			c.save();
			c.translate(jitter, 0);
			c.strokeStyle = "rgba(127,231,220,0.6)";
			c.lineWidth = 1.5;
			c.strokeRect(610, 62, 250, 262);
			glow(c, 735, 193, 180, "#3fd6c8", 0.18);
			if (typeof Portraits !== "undefined") {
				c.save();
				c.globalAlpha = 0.85;
				Portraits.draw(c, "lira", 625, 77, 220, t, reduced ? 0 : Portraits.mouth(t));
				c.restore();
				c.save();
				c.globalCompositeOperation = "color";
				c.fillStyle = "#3fe0d0";
				c.fillRect(625, 77, 220, 220);
				c.restore();
			} else {
				c.fillStyle = "#2a7f80";
				c.beginPath();
				c.ellipse(735, 162, 42, 52, 0, 0, Math.PI * 2);
				c.fill();
				poly(c, [[670, 292], [700, 222], [770, 222], [800, 292]], "#2a7f80");
			}
			c.fillStyle = "rgba(0,0,0,0.25)";
			for (let y = 77; y < 297; y += 3) c.fillRect(625, y, 220, 1);
			c.font = "11px monospace";
			c.fillStyle = "#9ff5e8";
			c.fillText("LIRA · INŻYNIERKA SIECI", 625, 316);
			c.restore();
			// Waveform of the voice.
			c.strokeStyle = "#9ff5e8";
			c.lineWidth = 1.5;
			c.beginPath();
			for (let x = 100; x < 560; x += 4) {
				const yy = 262 + Math.sin(x * 0.07 + t * 9) * Math.sin(x * 0.013 + t) * (reduced ? 6 : 18) * (0.4 + 0.6 * Math.abs(Math.sin(t * 2.3)));
				x === 100 ? c.moveTo(x, yy) : c.lineTo(x, yy);
			}
			c.stroke();
			// The star map: Eos → Vesper, the route drawing itself.
			const route = [[140, 130, "EOS"], [260, 96, ""], [350, 160, ""], [480, 118, "VESPER"]],
				drawn = reduced ? 1 : clamp01((local - 0.6) / 2.6);
			c.strokeStyle = "rgba(127,231,220,0.25)";
			for (let k = 0; k < 6; k++) {
				c.beginPath();
				c.arc(310, 140, 26 + k * 22, 0, Math.PI * 2);
				c.stroke();
			}
			c.strokeStyle = "#ffd38a";
			c.lineWidth = 2;
			c.beginPath();
			const total = route.length - 1,
				upto = drawn * total;
			route.forEach(([x, y], i) => {
				if (i > Math.ceil(upto)) return;
				const [px, py] = route[Math.max(0, i - 1)],
					f = i === Math.ceil(upto) ? upto - (i - 1) : 1;
				i ? c.lineTo(px + (x - px) * f, py + (y - py) * f) : c.moveTo(x, y);
			});
			c.stroke();
			for (const [x, y, name] of route) {
				glow(c, x, y, 12, name ? "#ffd38a" : "#7fe7dc", 0.8);
				if (name) {
					c.fillStyle = "#ffe6b8";
					c.font = "11px monospace";
					c.fillText(name, x - 18, y - 14);
				}
			}
			c.fillStyle = "rgba(160,240,230,0.8)";
			c.font = "10px monospace";
			c.fillText("ARCHIWUM VESPER / KLUCZ SIECI · ODSZYFROWANO 63%", 100, 228);
		},
		// The run: through the ice canyons of Vesper, fog, snow streaks, the expedition at speed.
		(c, t, local) => {
			const sky = c.createLinearGradient(0, 0, 0, H);
			sky.addColorStop(0, "#2b4258");
			sky.addColorStop(0.6, "#7f9db2");
			sky.addColorStop(1, "#c9dbe4");
			c.fillStyle = sky;
			c.fillRect(0, 0, W, H);
			planet(c, 800, 90, 40, { base: "#eef5f8", dark: "#8fa3b0", atmo: "#ffffff", light: -2.3, clouds: 0.2, t, seed: 9 });
			for (let layer = 0; layer < 4; layer++) {
				const speed = 20 + layer * 55,
					base = 170 + layer * 55,
					color = ["#9fb4c2", "#6f889a", "#3d566a", "#1b2a38"][layer],
					pts = [[0, H]];
				for (let x = -160; x < W + 160; x += 40) {
					const wx = x + ((t * speed) % 160),
						k = x + Math.floor((t * speed) / 160) * 160,
						// Sharp peaks: a folded sine and a jagged term.
						h = (1 - Math.abs(Math.sin(k * 0.009 + layer * 2))) * 85 + Math.abs(Math.sin(k * 0.047 + layer)) * 22 - 30;
					pts.push([wx - 160, base - h]);
				}
				pts.push([W + 160, H]);
				const ridge = pts.map(([x, y]) => [W - x, y]);
				poly(c, ridge, color);
				// Snow along the ridge, fog between the layers.
				c.strokeStyle = `rgba(245,250,255,${0.55 - layer * 0.1})`;
				c.lineWidth = 3 - layer * 0.5;
				c.beginPath();
				ridge.slice(1, -1).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
				c.stroke();
				const fog = c.createLinearGradient(0, base - 30, 0, base + 40);
				fog.addColorStop(0, "rgba(220,235,245,0)");
				fog.addColorStop(1, `rgba(220,235,245,${0.18 + layer * 0.04})`);
				c.fillStyle = fog;
				c.fillRect(0, base - 30, W, 70);
			}
			// The expedition.
			for (let i = 0; i < 3; i++) fighter(c, 260 + i * 150 + Math.sin(t * 1.3 + i) * 12, 190 + i * 28 + Math.cos(t * 1.7 + i) * 8, 1.8 - i * 0.2, Math.sin(t + i) * 0.05, false);
			// Snow streaks rushing past.
			c.strokeStyle = "rgba(240,248,255,0.5)";
			c.lineWidth = 1;
			for (let i = 0; i < 70; i++) {
				const x = (((rnd(i) * W - t * 900) % W) + W) % W,
					y = rnd(i * 3) * H;
				c.beginPath();
				c.moveTo(x, y);
				c.lineTo(x + 24, y - 3);
				c.stroke();
			}
		},
		// Dawn: the sun rises over the planet's limb, the fleet heads into the light, the beacons light again.
		(c, t, local, reduced) => {
			nebula(c, t, [[480, 120, 360, "#5a3a2a", 0.4, 0], [200, 80, 260, "#2a4a6a", 0.35, 1]]);
			stars(c, t, 4, 160, 5);
			const rise = ease(clamp01(local / 3)),
				sx = 520,
				sy = 300 - rise * 70;
			glow(c, sx, sy, 520, "#ffb46a", 0.35 + rise * 0.25);
			planet(c, 480, 820, 560, { base: "#6f8f94", atmo: "#ffd7a0", light: -1.57, cities: 0.4, t, seed: 11 });
			flare(c, sx, sy, 0.6 + rise * 0.6, "#ffcf8a");
			for (let i = 0; i < 8; i++) {
				const on = local > 1.2 + i * 0.3;
				beacon(c, 120 + i * 100, 300 - Math.sin(i * 0.8) * 25 - i * 4, 0.7, on ? clamp01((local - 1.2 - i * 0.3) * 3) : 0, t, i);
			}
			for (let i = 0; i < 6; i++) freighter(c, 80 + i * 110 + local * 30, 228 + (i % 3) * 22, 0.9 + i * 0.05, t, i);
			capital(c, 150 + local * 18, 196, 0.8, t, false);
			const show = reduced ? 1 : clamp01((local - 2.2) / 1);
			c.save();
			c.globalAlpha = show;
			c.textAlign = "center";
			c.font = "700 44px sans-serif";
			c.shadowColor = "rgba(255,190,110,0.9)";
			c.shadowBlur = 24;
			c.fillStyle = "#fff4e2";
			c.fillText("ODZYSKANY ŚWIT", W / 2, 140);
			c.shadowBlur = 0;
			c.font = "12px monospace";
			c.fillStyle = "rgba(255,230,190,0.85)";
			c.fillText("P O G R A N I C Z E   G A L A K T Y K I", W / 2, 166);
			c.restore();
		},
	];
	const TINT = ["#2a6f8f", "#8f2a2a", "#2a3f6f", "#2a8f80", "#4f7f9f", "#a06a2a"];

	// The director, shared with the act II prologue (act2-film.js): spec = { shots, titles, places, tints, captions,
	// label, alarm (shots with the alarm, a shake and a red flash), receive (shots of a received transmission) }.
	function render(c, time, reduced, spec) {
		time = Math.max(0, time);
		const last = spec.shots.length - 1,
			span = spec.length || 5,
			scene = Math.min(last, Math.floor(time / span)),
			local = Math.min(span, time - scene * span),
			t = reduced ? scene * 5 + 2.5 : time,
			l = reduced ? 2.5 : local;
		c.save();
		c.fillStyle = "#03070d";
		c.fillRect(0, 0, W, H);
		// The camera: a slow push in; a shake under the blockade's fire.
		const zoom = 1 + (reduced ? 0.03 : local * 0.012),
			shake = !reduced && spec.alarm?.includes(scene) && local > 0.9 && local < 4 ? (rnd(Math.floor(time * 40)) - 0.5) * 4 : 0;
		c.translate(W / 2 + shake, H / 2 + shake * 0.6);
		c.scale(zoom, zoom);
		c.translate(-W / 2, -H / 2);
		spec.shots[scene](c, t, l, reduced);
		c.restore();
		hud(c, scene, l, t, reduced, spec);
		title(c, spec.titles[scene], l, scene, reduced, spec);
		finish(c, scene, l, t, reduced, spec.tints[scene]);
		// Cuts: fade from and to black; a red flash as the blockade opens fire.
		if (!reduced) {
			const fade = Math.max(0, 1 - local / 0.45, (local - (span - 0.45)) / 0.45);
			if (fade > 0) {
				c.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`;
				c.fillRect(0, 0, W, H);
			}
			if (spec.alarm?.includes(scene) && local > 1.15 && local < 1.35) {
				c.fillStyle = "rgba(255,90,70,0.18)";
				c.fillRect(0, 0, W, H);
			}
		}
		return { scene, caption: spec.captions[scene] };
	}
	const SPEC = { shots: SHOTS, titles, places, tints: TINT, captions, label: "ROZDZIAŁ PROLOGU", alarm: [1], receive: [3] };
	const draw = (c, time, reduced = false) => render(c, time, reduced, SPEC);
	// The tools for other films.
	const kit = { W, H, BAR, rnd, clamp01, ease, poly, glow, flare, stars, nebula, planet, trail, capital, freighter, fighter, beam, beacon, render, finish };
	return { draw, captions, titles, duration, kit };
})();
