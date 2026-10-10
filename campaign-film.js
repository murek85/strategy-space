/* The campaign prologue (0.169): a story of about two and a half minutes leading to the start of act I, in the manner
   of a sci-fi game cinematic, drawn locally on a canvas (no video files): a slow camera push, letterboxed frame,
   nebulae and parallax stars, planets with lit atmospheres and city lights, detailed ships with running lights and
   engine trails, laser fire, lens flares, a tactical HUD, typed titles with a glitch, colour grading, vignette and
   film grain. Deterministic (the same time gives the same frame); with reduced motion the camera, flicker, shake
   and grain stand still. Fifteen shots of their own lengths (LENGTHS): the frontier; the settlers; Lira's network
   of beacons; the convoy routes; the Dominium; the blockade; the sector going dark; the ultimatum; the Silent
   Station on Eos; Lira's transmission; the muster of the last fleet; the blockade run; the descent to Eos; the
   landing; dawn and the title of act I. Lira speaks in the transmission and at the landing (lines). */
const CampaignFilm = (() => {
	const LENGTHS = [9, 10, 10, 9, 10, 10, 10, 10, 10, 11, 10, 10, 11, 10, 10];
	const duration = LENGTHS.reduce((n, l) => n + l, 0);
	const captions = [
		"Na skraju zbadanej galaktyki leży pogranicze: kilka światów, które nie należą do nikogo.",
		"Przylecieli tu osadnicy, którzy chcieli żyć z dala od Dominium. Nazwali się Wolnymi Koloniami.",
		"Inżynierka Lira zaprojektowała dla nich sieć latarni — przekaźników, które dawały energię, łączność i bezpieczne szlaki.",
		"Latarnie prowadziły konwoje między wolnymi światami. Każdy sygnał oznaczał bezpieczny powrót.",
		"Dominium patrzyło na pogranicze jak na zbuntowaną prowincję. Czekało tylko na pretekst.",
		"Flota Dominium zajęła orbitalne węzły. Jeden rozkaz — i latarnie gasły jedna po drugiej.",
		"Miasta pogrążyły się w ciemności. Bez energii Kolonie miały wytrzymać najwyżej kilka tygodni.",
		"Na wszystkich kanałach popłynęło ultimatum: kapitulacja albo cisza.",
		"Na Eos, w Stacji Ciszy, latarnia zgasła ostatnia. Lira została przy niej — i ocaliła nadajnik.",
		"Jej sygnał przebił blokadę. W szyfrze ukryła coś więcej: drogę do archiwum na Vesperze, gdzie czeka klucz do sieci.",
		"W pasie asteroid ukryła się ostatnia flota Kolonii. Na wezwanie odpowiedział jeden dowódca — Ty.",
		"Kurs na Eos: przez linię blokady, w ciszy radiowej, ze zgaszonymi światłami.",
		"Wejście w atmosferę. Pod nami kotlina Eos — i garnizon Dominium przy stacjach łączności.",
		"Lądowanie przy Stacji Ciszy. Lira czeka. Latarnia wciąż milczy.",
		"Odbuduj zasilanie. Przejmij łączność. Zapal latarnię. Odzyskany Świt zaczyna się od Twojego rozkazu.",
	];
	const titles = [
		"POGRANICZE",
		"WOLNE KOLONIE",
		"SIEĆ LATARNI",
		"SZLAKI WOLNYCH KOLONII",
		"DOMINIUM",
		"BLOKADA DOMINIUM",
		"SEKTOR BEZ ŚWIATŁA",
		"ULTIMATUM",
		"STACJA CISZY / EOS",
		"TRANSMISJA / EOS / LIRA",
		"OSTATNIA FLOTA",
		"PRZEZ BLOKADĘ",
		"KOTLINA EOS",
		"LĄDOWANIE",
		"POCZĄTEK",
	];
	const places = [
		"SEKTOR 07 · POGRANICZE",
		"KHEPRI IV · PIERWSZE OSADY",
		"PROJEKT SIECI · WARSZTAT LIRY",
		"SEKTOR 07 · KORYTARZ HELION",
		"STOLICA DOMINIUM",
		"ORBITA KHEPRI IV",
		"KHEPRI IV · STRONA NOCNA",
		"WSZYSTKIE KANAŁY · DOMINIUM",
		"EOS · STACJA CISZY",
		"KANAŁ 7.31 · SZYFR KOLONII",
		"PAS ASTEROID HELION",
		"ORBITA EOS · LINIA BLOKADY",
		"EOS · ATMOSFERA",
		"EOS · STACJA CISZY",
		"EOS · ŚWIT",
	];
	// Lira speaks (her voice and motif, as in the radio scenes) in the transmission and at the landing.
	const lines = {
		9: ["lira", "Tu Lira, Stacja Ciszy na Eos. Nadajnik ma jeszcze kilka godzin zasilania. Potrzebuję dowódcy."],
		13: ["lira", "Witaj na Eos, dowódco. Latarnia milczy — ale jeszcze nie umarła."],
	};
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
	function title(c, text, local, scene, reduced, spec, span = 5) {
		const shown = reduced ? text.length : Math.floor(clamp01((local - 0.35) / 1.1) * text.length),
			fade = reduced ? 1 : clamp01((span - 0.4 - local) / 0.4),
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
		c.fillText(`${spec.label} ${String(scene + 1).padStart(2, "0")} / ${String(spec.shots.length).padStart(2, "0")}`, x, y + 26);
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
	// A speaker as a hologram in a comm frame (x, y the top left, size the side), tinted and scanlined, a label
	// under it (0.171; Lira's own since 0.169).
	function holo(c, who, label, x, y, size, t, reduced, tint = "#3fe0d0", text = "#9ff5e8") {
		glow(c, x + size / 2, y + size / 2, size * 0.8, tint, 0.16);
		c.save();
		c.strokeStyle = text;
		c.globalAlpha = 0.6;
		c.lineWidth = 1.5;
		c.strokeRect(x - 15, y - 15, size + 30, size + 42);
		c.globalAlpha = 1;
		if (typeof Portraits !== "undefined") {
			c.globalAlpha = 0.85;
			Portraits.draw(c, who, x, y, size, t, reduced ? 0 : Portraits.mouth(t));
			c.globalAlpha = 1;
			c.globalCompositeOperation = "color";
			c.fillStyle = tint;
			c.fillRect(x, y, size, size);
			c.globalCompositeOperation = "source-over";
		} else {
			c.fillStyle = "#2a7f80";
			c.beginPath();
			c.ellipse(x + size / 2, y + size * 0.4, size * 0.19, size * 0.24, 0, 0, Math.PI * 2);
			c.fill();
		}
		c.fillStyle = "rgba(0,0,0,0.25)";
		for (let yy = y; yy < y + size; yy += 3) c.fillRect(x, yy, size, 1);
		c.font = "11px monospace";
		c.fillStyle = text;
		c.fillText(label, x, y + size + 19);
		c.restore();
	}
	function holoLira(c, x, y, size, t, reduced, tint = "#3fe0d0") {
		holo(c, "lira", "LIRA · INŻYNIERKA SIECI", x, y, size, t, reduced, tint);
	}
	// An asteroid: a lumpy rock lit from the upper left.
	function rock(c, x, y, r, seed, t = 0) {
		const pts = [],
			spin = t * (rnd(seed) - 0.5) * 0.2;
		for (let k = 0; k < 10; k++) {
			const a = (k / 10) * Math.PI * 2 + spin,
				d = r * (0.72 + rnd(seed * 7 + k) * 0.4);
			pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
		}
		poly(c, pts, "#3a3836");
		poly(c, pts.slice(5, 9).concat([[x, y]]), "#22201f");
		poly(c, pts.slice(0, 3).concat([[x, y]]), "#5c5650");
	}
	// Dunes or ridges in layers scrolling by (the flight over Eos and Vesper): a palette of four layers from far to
	// near, `speed` px a second, sharp (ice) or soft (sand) crests.
	function ridges(c, t, colors, speed, sharp, crest) {
		for (let layer = 0; layer < 4; layer++) {
			const v = speed * (0.2 + layer * 0.55),
				base = 170 + layer * 55,
				pts = [[0, H]];
			for (let x = -160; x < W + 160; x += 40) {
				const wx = x + ((t * v) % 160),
					k = x + Math.floor((t * v) / 160) * 160,
					h = sharp ? (1 - Math.abs(Math.sin(k * 0.009 + layer * 2))) * 85 + Math.abs(Math.sin(k * 0.047 + layer)) * 22 - 30 : (0.5 + 0.5 * Math.sin(k * 0.006 + layer * 2)) * 70 + Math.sin(k * 0.021 + layer) * 10 - 20;
				pts.push([wx - 160, base - h]);
			}
			pts.push([W + 160, H]);
			const ridge = pts.map(([x, y]) => [W - x, y]);
			poly(c, ridge, colors[layer]);
			c.strokeStyle = crest.replace("A", String(0.5 - layer * 0.1));
			c.lineWidth = 3 - layer * 0.5;
			c.beginPath();
			ridge.slice(1, -1).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
			c.stroke();
		}
	}
	// The beacon tower of Eos: a lattice mast on a concrete foot, the lamp on top (lit 0…1).
	function tower(c, x, y, s, lit, t) {
		c.save();
		c.translate(x, y);
		c.scale(s, s);
		poly(c, [[-26, 0], [26, 0], [16, -18], [-16, -18]], "#2a2622");
		c.strokeStyle = "#3e3a34";
		c.lineWidth = 3;
		c.beginPath();
		c.moveTo(-14, -18);
		c.lineTo(-5, -150);
		c.moveTo(14, -18);
		c.lineTo(5, -150);
		for (let k = 0; k < 7; k++) {
			const y0 = -18 - k * 19,
				w0 = 14 - k * 1.3;
			c.moveTo(-w0, y0);
			c.lineTo(w0 - 1.3, y0 - 19);
		}
		c.stroke();
		poly(c, [[-11, -150], [11, -150], [7, -164], [-7, -164]], "#4a463e");
		c.restore();
		const pulse = 0.8 + 0.2 * Math.sin(t * 3);
		if (lit > 0) {
			glow(c, x, y - 157 * s, 70 * s, "#8dffd0", lit * pulse);
			glow(c, x, y - 157 * s, 16 * s, "#ffffff", lit);
		} else glow(c, x, y - 157 * s, 6 * s, "#ff5a4a", 0.5 + 0.5 * Math.sin(t * 2));
	}
	// The Silent Station: a low dome and a block by the tower, a lit window.
	function station(c, x, y, s, light) {
		c.save();
		c.translate(x, y);
		c.scale(s, s);
		c.fillStyle = "#24211d";
		c.beginPath();
		c.ellipse(0, 0, 46, 30, 0, Math.PI, Math.PI * 2);
		c.fill();
		c.fillRect(30, -24, 60, 24);
		c.fillStyle = "#3a352e";
		c.fillRect(30, -27, 60, 4);
		if (light > 0) {
			c.fillStyle = `rgba(255,205,130,${light})`;
			c.fillRect(48, -18, 10, 7);
			glow(c, 53, -14, 26, "#ffcc80", light * 0.5);
		}
		c.restore();
	}
	// The Colonies' dropship: a broad wedge with two engine pods, seen from the side, heading right.
	function dropship(c, x, y, s, t, burn = 1) {
		c.save();
		c.translate(x, y);
		c.scale(s, s);
		if (burn > 0) {
			trail(c, -40, -6, 90 * burn, 5, "#7fdcff");
			trail(c, -40, 8, 90 * burn, 5, "#7fdcff");
		}
		poly(c, [[44, 2], [-38, -16], [-44, 2], [-38, 18]], "#4a6470");
		poly(c, [[44, 2], [-30, -12], [0, -4]], "#7a98a4");
		poly(c, [[20, -6], [36, 0], [20, 2]], "#bfefff");
		c.fillStyle = "#2a3a44";
		c.fillRect(-40, -12, 18, 7);
		c.fillRect(-40, 6, 18, 7);
		const on = Math.sin(t * 4) > 0 ? 1 : 0.2;
		glow(c, -38, -16, 7, "#7fe7ff", on);
		glow(c, 44, 2, 6, "#ffffff", 0.6);
		c.restore();
	}
	// Dark dunes under the night sky of Eos (the Silent Station, the landing): three soft layers.
	function eosNight(c, t, dawn = 0) {
		const sky = c.createLinearGradient(0, 0, 0, H);
		sky.addColorStop(0, dawn ? "#1a2638" : "#0c1628");
		sky.addColorStop(0.7, dawn ? `rgba(${120 + dawn * 90},${80 + dawn * 50},${70},1)` : "#26344a");
		sky.addColorStop(1, dawn ? "#d89a6a" : "#4a4a52");
		c.fillStyle = sky;
		c.fillRect(0, 0, W, H);
		stars(c, t, 1, 200 - dawn * 150, 41);
		if (!dawn) glow(c, 820, 80, 220, "#8fa8c8", 0.18);
		for (const [base, color, amp, k] of [[270, dawn ? "#5a4636" : "#2a3040", 30, 0.005], [310, dawn ? "#3e3026" : "#1e2230", 24, 0.008], [350, dawn ? "#2a2018" : "#12141c", 18, 0.012]]) {
			const pts = [[0, H]];
			for (let x = 0; x <= W; x += 20) pts.push([x, base - Math.sin(x * k + base) * amp - Math.sin(x * k * 3.1) * amp * 0.3]);
			pts.push([W, H]);
			poly(c, pts, color);
		}
	}

	const SHOTS = [
		// 1 · The frontier: a deep field drifting by, a galactic band, a lone sun far off.
		(c, t, local) => {
			nebula(c, t, [[300, 160, 380, "#1a3a5a", 0.5, 1.5], [700, 220, 320, "#3a2a5a", 0.4, -1], [520, 120, 260, "#14404a", 0.35, 0.5]]);
			c.save();
			c.translate(W / 2, H / 2);
			c.rotate(-0.25);
			for (let i = 0; i < 260; i++) {
				const x = (rnd(i * 3) - 0.5) * W * 1.4 - local * 6,
					y = (rnd(i * 5) - 0.5) * 60 * (1 + rnd(i));
				c.fillStyle = `rgba(220,230,255,${0.08 + rnd(i * 7) * 0.25})`;
				c.fillRect(x, y, 1.4, 1.4);
			}
			c.restore();
			glow(c, W / 2, H / 2, 300, "#3a4a7a", 0.2);
			stars(c, t, 3, 260, 51);
			flare(c, 760, 110, 0.35 + 0.1 * Math.sin(t), "#ffd8a0");
			// The worlds of the frontier, named one by one.
			[[220, 250, "KHEPRI"], [380, 150, "EOS"], [560, 270, "VESPER"], [690, 190, "NADIR"]].forEach(([x, y, name], i) => {
				const a = clamp01((local - 2 - i * 1.3) / 0.8);
				if (a <= 0) return;
				glow(c, x, y, 14, "#9fd8ff", a);
				c.globalAlpha = a;
				c.font = "10px monospace";
				c.fillStyle = "#cfe8f4";
				c.fillText(name, x + 10, y - 8);
				c.globalAlpha = 1;
			});
		},
		// 2 · The settlers: colony ships coming down to a world, cities lighting up on its night side.
		(c, t, local, reduced, span) => {
			nebula(c, t, [[240, 110, 260, "#2a4a6a", 0.45, 1]]);
			stars(c, t, 4, 200, 52);
			planet(c, 650, 380, 280, { base: "#5f8a7a", atmo: "#9fe9d0", light: -2.4, cities: 0.05 + clamp01(local / (span - 1.5)) * 0.85, t, seed: 21 });
			for (let i = 0; i < 4; i++) {
				const p = clamp01((local - i * 1.4) / 6),
					x = 80 + i * 60 + p * 420,
					y = 70 + i * 25 + p * 140;
				if (p > 0 && p < 1) freighter(c, x, y, 1.1 - p * 0.6, t, i);
			}
			capital(c, 120 + local * 14, 90, 0.6, t, false);
		},
		// 3 · The beacons: Lira's design on a holographic map, the network lighting up link by link.
		(c, t, local, reduced, span) => {
			c.fillStyle = "#04121a";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[420, 200, 360, "#0f3a44", 0.55, 0]]);
			c.strokeStyle = "rgba(127,231,220,0.08)";
			for (let x = 60; x < 600; x += 30) {
				c.beginPath();
				c.moveTo(x, 60);
				c.lineTo(x, 340);
				c.stroke();
			}
			const nodes = [[100, 270], [170, 160], [250, 230], [320, 110], [390, 260], [460, 170], [530, 300], [560, 110]],
				links = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 5], [4, 6], [5, 7]],
				grown = reduced ? links.length : clamp01((local - 0.6) / (span - 3)) * links.length;
			links.forEach(([a, b], i) => {
				const f = clamp01(grown - i);
				if (f <= 0) return;
				const [ax, ay] = nodes[a],
					[bx, by] = nodes[b];
				c.strokeStyle = "rgba(141,255,208,0.7)";
				c.lineWidth = 1.5;
				c.beginPath();
				c.moveTo(ax, ay);
				c.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
				c.stroke();
				if (f < 1) glow(c, ax + (bx - ax) * f, ay + (by - ay) * f, 14, "#c9fff0", 0.9);
			});
			nodes.forEach(([x, y], i) => beacon(c, x, y + 10, 0.7, i === 0 || links.some(([a, b], k) => b === i && grown >= k + 1) ? 1 : 0.15, t, i));
			c.font = "10px monospace";
			c.fillStyle = "rgba(160,240,230,0.85)";
			c.fillText(`SIEĆ LATARNI · PRZEKAŹNIKI ${Math.min(nodes.length, 1 + Math.floor(grown))}/${nodes.length} · ENERGIA · ŁĄCZNOŚĆ · SZLAKI`, 90, 330);
			holoLira(c, 680, 92, 190, t, reduced);
		},
		// 4 · The routes: a ringed world, a chain of beacons passing light along, a convoy and an escort cruiser.
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
		// 5 · The Dominium: its red world, the armada forming up in rows, the decree on the frontier.
		(c, t, local, reduced) => {
			nebula(c, t, [[300, 200, 320, "#4a1418", 0.55, 0.5], [760, 120, 240, "#2a1020", 0.4, -0.5]]);
			stars(c, t, 2, 180, 53, "#f0d0d0");
			planet(c, 170, 330, 230, { base: "#6a3a30", dark: "#120806", atmo: "#ff7a5a", light: -0.9, cities: 0.7, t, seed: 23 });
			// The armada: three rows of dreadnoughts in step, the nearer ones bigger, fighters along the bottom.
			for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - (row === 0 ? 1 : 0); i++) capital(c, 430 + i * 210 + row * 60 + local * 4, 90 + row * 85, 0.42 + row * 0.12, t + i + row, true);
			for (let i = 0; i < 7; i++) fighter(c, 380 + i * 70 + local * 20, 335 + (i % 3) * 8, 0.7, 0, true);
			// The decree: a red sigil and its text.
			const a = reduced ? 1 : clamp01((local - 2) / 1);
			c.save();
			c.globalAlpha = a;
			poly(c, [[860, 70], [890, 120], [830, 120]], "rgba(255,90,70,0.35)");
			c.strokeStyle = "#ff6a5a";
			c.lineWidth = 1.5;
			c.beginPath();
			c.moveTo(860, 70);
			c.lineTo(890, 120);
			c.lineTo(830, 120);
			c.closePath();
			c.stroke();
			c.font = "10px monospace";
			c.fillStyle = "#ffb4a8";
			c.fillText("DOMINIUM · DEKRET 7", 720, 145);
			c.fillText("POGRANICZE: PROWINCJA ZBUNTOWANA", 720, 160);
			c.restore();
		},
		// 6 · The blockade: a Dominium dreadnought slides in, fighters, beams putting out the beacons.
		(c, t, local) => {
			nebula(c, t, [[700, 100, 280, "#5a1f2a", 0.45, -1], [200, 300, 260, "#2a1f3a", 0.4, 1]]);
			stars(c, t, 4, 200, 2, "#f0d8d8");
			planet(c, 760, 360, 230, { base: "#5f6a7f", atmo: "#ff9a8a", light: -2.0, cities: 0.5, t, seed: 4 });
			const beacons = Array.from({ length: 5 }, (_, i) => [470 + i * 85, 225 + Math.sin(i) * 35]);
			beacons.forEach(([x, y], i) => {
				const out = local > 1.6 + i * 0.9;
				beacon(c, x, y, 0.8, out ? 0 : 1, t, i);
				if (local > 1.2 + i * 0.9 && !out) beam(c, 330, 120, x, y - 8, "#ff5a4a", 2.2, 0.9);
				if (out && local < 2.1 + i * 0.9) glow(c, x, y, 40, "#ff8a5a", 0.8);
			});
			const enter = ease(clamp01(local / 4));
			capital(c, -260 + enter * 520 + local * 6, 120, 1.55, t, true);
			for (let i = 0; i < 7; i++) fighter(c, 120 + i * 90 + local * (30 + i * 5), 280 + Math.sin(i * 2 + t) * 30, 0.9, 0.12 * Math.sin(i), true);
		},
		// 7 · The dark: the night side of Khepri IV going out city by city; a last transport waiting on its pad.
		(c, t, local, reduced, span) => {
			nebula(c, t, [[300, 90, 300, "#16283a", 0.5, 1]]);
			stars(c, t, 3, 180, 3);
			planet(c, 480, 420, 330, { base: "#3c5560", atmo: "#5fb8d8", light: 2.2, cities: Math.max(0.04, 1 - local / (span - 2)), clouds: 0.35, t, seed: 6 });
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
			const left = Math.max(0, 1 - local / (span - 2.5));
			c.font = "11px monospace";
			c.fillStyle = "rgba(255,170,120,0.85)";
			c.fillText(`SIEĆ LATARNI: ${Math.round(left * 100)}%`, 760, 104);
			c.fillStyle = "rgba(255,170,120,0.2)";
			c.fillRect(760, 110, 140, 4);
			c.fillStyle = "rgba(255,170,120,0.85)";
			c.fillRect(760, 110, 140 * left, 4);
			freighter(c, 250 + local * 3, 150, 1.25, t, 2);
			glow(c, 250, 170, 50, "#ffb35c", 0.25);
		},
		// 8 · The ultimatum: a red transmission over every channel, a countdown running.
		(c, t, local, reduced) => {
			c.fillStyle = "#0c0406";
			c.fillRect(0, 0, W, H);
			const jitter = reduced ? 0 : rnd(Math.floor(t * 10)) > 0.85 ? (rnd(t) - 0.5) * 10 : 0;
			c.save();
			c.translate(jitter, 0);
			glow(c, 300, 200, 220, "#ff3a2a", 0.15);
			c.strokeStyle = "rgba(255,110,90,0.6)";
			c.lineWidth = 1.5;
			c.strokeRect(180, 70, 240, 250);
			// The officer: a faceless silhouette behind the sigil.
			poly(c, [[300, 110], [330, 160], [270, 160]], "rgba(255,90,70,0.25)");
			c.fillStyle = "#2a0c0c";
			c.beginPath();
			c.ellipse(300, 175, 34, 42, 0, 0, Math.PI * 2);
			c.fill();
			poly(c, [[230, 320], [255, 230], [345, 230], [370, 320]], "#2a0c0c");
			c.fillStyle = "rgba(0,0,0,0.3)";
			for (let y = 70; y < 320; y += 3) c.fillRect(180, y, 240, 1);
			c.restore();
			const lines = ["DO WOLNYCH KOLONII POGRANICZA:", "SIEĆ LATARNI POZOSTANIE WYŁĄCZONA", "DO CZASU BEZWARUNKOWEJ KAPITULACJI.", "", "KAPITULACJA ALBO CISZA."],
				typed = reduced ? 999 : Math.floor(local * 28);
			c.font = "13px monospace";
			let used = 0;
			lines.forEach((line, i) => {
				const show = line.slice(0, Math.max(0, typed - used));
				used += line.length + 4;
				c.fillStyle = i === 4 ? "#ffd0c8" : "#ff9a8a";
				if (i === 4) c.font = "600 18px monospace";
				c.fillText(show, 470, 120 + i * 26);
			});
			const left = Math.max(0, 72 * 3600 - local * 3600 * 2.5);
			c.font = "600 26px monospace";
			c.fillStyle = "#ff6a5a";
			c.fillText([Math.floor(left / 3600), Math.floor((left % 3600) / 60), Math.floor(left % 60)].map((v) => String(v).padStart(2, "0")).join(":"), 470, 290);
		},
		// 9 · The Silent Station: night over the basin of Eos, the dead beacon, one lit window, sparks at the mast.
		(c, t, local, reduced) => {
			eosNight(c, t);
			planet(c, 820, 80, 26, { base: "#d8d0c0", dark: "#6a6458", atmo: "#ffffff", light: -2.6, clouds: 0, t, seed: 31 });
			tower(c, 620, 300, 1, 0, t);
			station(c, 500, 302, 1.1, 0.9);
			// Sparks: Lira at work at the foot of the mast.
			if (!reduced)
				for (let i = 0; i < 6; i++) {
					const f = (t * 1.7 + i / 6) % 1;
					if (rnd(Math.floor(t * 1.7 + i / 6) * 7 + i) > 0.5) continue;
					c.fillStyle = `rgba(255,${200 + Math.floor(f * 55)},140,${1 - f})`;
					c.fillRect(612 + Math.cos(i * 2.1) * f * 26, 252 - Math.sin(i * 1.3 + 0.6) * f * 24 + f * f * 30, 2, 2);
				}
			glow(c, 612, 254, 22, "#bfe6ff", 0.4 + 0.4 * Math.sin(t * 23));
			// Sand on the wind.
			c.strokeStyle = "rgba(210,190,160,0.25)";
			for (let i = 0; i < 40; i++) {
				const x = (((rnd(i) * W + t * 160) % W) + W) % W,
					y = 220 + rnd(i * 3) * 140;
				c.beginPath();
				c.moveTo(x, y);
				c.lineTo(x - 30, y + 2);
				c.stroke();
			}
		},
		// 10 · The transmission: Lira's hologram, her voice on the waveform, the way to Vesper's archive hidden in it.
		(c, t, local, reduced, span) => {
			c.fillStyle = "#04121a";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[480, 200, 360, "#0f3a44", 0.6, 0]]);
			const jitter = reduced ? 0 : rnd(Math.floor(t * 12)) > 0.9 ? (rnd(t) - 0.5) * 8 : 0;
			c.save();
			c.translate(jitter, 0);
			holoLira(c, 625, 77, 220, t, reduced);
			c.restore();
			c.strokeStyle = "#9ff5e8";
			c.lineWidth = 1.5;
			c.beginPath();
			for (let x = 100; x < 560; x += 4) {
				const yy = 262 + Math.sin(x * 0.07 + t * 9) * Math.sin(x * 0.013 + t) * (reduced ? 6 : 18) * (0.4 + 0.6 * Math.abs(Math.sin(t * 2.3)));
				x === 100 ? c.moveTo(x, yy) : c.lineTo(x, yy);
			}
			c.stroke();
			const route = [[140, 130, "EOS"], [260, 96, ""], [350, 160, ""], [480, 118, "VESPER"]],
				drawn = reduced ? 1 : clamp01((local - 2) / (span - 4));
			c.strokeStyle = "rgba(127,231,220,0.25)";
			for (let k = 0; k < 6; k++) {
				c.beginPath();
				c.arc(310, 140, 26 + k * 22, 0, Math.PI * 2);
				c.stroke();
			}
			c.strokeStyle = "#ffd38a";
			c.lineWidth = 2;
			c.beginPath();
			const upto = drawn * (route.length - 1);
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
			c.fillText(`KANAŁ 7.31 · ZASILANIE NADAJNIKA ${Math.max(4, Math.round(19 - local * 1.4))}% · ARCHIWUM VESPER: KLUCZ SIECI`, 100, 228);
		},
		// 11 · The muster: the Colonies' last fleet hidden in an asteroid belt, the commander's dropship cast off.
		(c, t, local, reduced, span) => {
			nebula(c, t, [[480, 160, 380, "#1a2a3a", 0.5, 0.5]]);
			stars(c, t, 2, 200, 54);
			for (let i = 0; i < 14; i++) rock(c, ((rnd(i) * 1100 - local * (6 + rnd(i * 3) * 10)) % 1100) - 70, 60 + rnd(i * 5) * 290, 14 + rnd(i * 7) * 30, i + 3, t);
			capital(c, 300, 150, 0.7, t, false);
			capital(c, 520, 230, 0.55, t + 1, false);
			for (let i = 0; i < 3; i++) freighter(c, 160 + i * 70, 280 + i * 12, 0.7, t, i);
			const go = ease(clamp01((local - 3) / (span - 4)));
			dropship(c, 420 + go * 600, 190 - go * 60, 1.2 + go * 0.6, t, 0.4 + go);
			c.font = "10px monospace";
			c.fillStyle = "rgba(170,225,235,0.85)";
			c.fillText("ZGRUPOWANIE · PAS ASTEROID HELION", 640, 300);
			c.fillStyle = "#7fe7c8";
			c.fillText("OKRĘT DESANTOWY „ŚWIT” · DOWÓDCA: TY", 640, 316);
			for (let i = 0; i < 6; i++) rock(c, ((rnd(i + 40) * 1200 - local * 40) % 1200) - 100, 330 + rnd(i * 9) * 40, 26 + rnd(i) * 20, i + 60, t);
		},
		// 12 · The blockade run: between the Dominium's dreadnoughts, lights out, fire passing wide.
		(c, t, local, reduced) => {
			nebula(c, t, [[600, 120, 300, "#3a1420", 0.4, -1]]);
			stars(c, t, 30, 220, 55);
			planet(c, 840, 420, 260, { base: "#8a8f96", dark: "#14161a", atmo: "#cfd8e0", light: -2.2, clouds: 0, t, seed: 33 });
			capital(c, 900 - local * 90, 80, 1.3, t, true);
			capital(c, 1100 - local * 140, 330, 1.7, t + 2, true);
			const x = 260 + Math.sin(t * 0.7) * 30,
				y = 210 + Math.sin(t * 1.3) * 18;
			dropship(c, x, y, 1.5, t, 1);
			for (let i = 0; i < 4; i++) {
				const at = 1.5 + i * 1.8;
				if (local > at && local < at + 0.5) beam(c, 760 - i * 40, 90 + i * 60, x + 80 + i * 30, y - 60 + i * 50, "#ff5a4a", 2.4, 0.9);
			}
			c.font = "10px monospace";
			c.fillStyle = "rgba(170,225,235,0.85)";
			c.fillText("CISZA RADIOWA · ŚWIATŁA WYŁĄCZONE · KURS: EOS", 60, 330);
		},
		// 13 · The descent: the entry burning, then the canyons of Eos rushing by at dawn.
		(c, t, local, reduced, span) => {
			const split = span * 0.45,
				fire = clamp01(1 - (local - split + 0.6) / 1.2);
			if (local > split - 0.6) {
				const sky = c.createLinearGradient(0, 0, 0, H);
				sky.addColorStop(0, "#3a3a5a");
				sky.addColorStop(0.6, "#c88a6a");
				sky.addColorStop(1, "#e8c49a");
				c.fillStyle = sky;
				c.fillRect(0, 0, W, H);
				glow(c, 760, 120, 260, "#ffd0a0", 0.5);
				ridges(c, t, ["#c49a6c", "#9a7048", "#6a4a30", "#3a2818"], 120, false, "rgba(255,230,190,A)");
				dropship(c, 380 + Math.sin(t * 1.4) * 20, 160 + Math.cos(t * 1.1) * 10, 1.4, t, 1);
			}
			if (fire > 0) {
				c.save();
				c.globalAlpha = fire;
				c.fillStyle = "#1a0a06";
				c.fillRect(0, 0, W, H);
				glow(c, 480, 200, 360, "#ff6a2a", 0.6);
				glow(c, 520, 200, 160, "#ffd080", 0.7);
				for (let i = 0; i < 40; i++) {
					const f = (t * 2 + rnd(i)) % 1;
					c.strokeStyle = `rgba(255,${150 + Math.floor(rnd(i * 3) * 100)},80,${0.6 * (1 - f)})`;
					c.lineWidth = 2;
					c.beginPath();
					c.moveTo(520 - f * 500, 200 + (rnd(i * 5) - 0.5) * 160 * f);
					c.lineTo(520 - f * 500 - 40, 200 + (rnd(i * 5) - 0.5) * 160 * f);
					c.stroke();
				}
				const shake = reduced ? 0 : (rnd(Math.floor(t * 30)) - 0.5) * 6;
				dropship(c, 520 + shake, 200 + shake * 0.5, 1.8, t, 0);
				c.restore();
			}
		},
		// 14 · The landing: dust over the pad by the Silent Station, the dark beacon, Lira waiting.
		(c, t, local, reduced, span) => {
			eosNight(c, t, 0.35);
			tower(c, 700, 300, 1, 0, t);
			station(c, 580, 302, 1.1, 0.9);
			const down = ease(clamp01(local / (span * 0.55))),
				x = 330,
				y = 60 + down * 230;
			glow(c, x, 305, 80 + down * 120, "#c9a07a", down * 0.5);
			for (let i = 0; i < 18 * down; i++) {
				const a = rnd(i) * Math.PI,
					r = (local * 30 + rnd(i * 3) * 60) % 160;
				c.fillStyle = `rgba(200,170,130,${0.25 * (1 - r / 160)})`;
				c.beginPath();
				c.arc(x + Math.cos(a) * r * (rnd(i) > 0.5 ? 1 : -1), 305 - Math.sin(a) * r * 0.25, 10 + r * 0.1, 0, Math.PI * 2);
				c.fill();
			}
			c.save();
			c.translate(x, y);
			c.rotate(-0.04 * (1 - down));
			dropship(c, 0, 0, 1.6, t, 0);
			c.restore();
			glow(c, x, y + 30, 40, "#9fd8ff", (1 - down) * 0.7);
			// Lira, small, by the station.
			if (local > span * 0.6) {
				const a = reduced ? 1 : clamp01((local - span * 0.6) / 0.6);
				c.globalAlpha = a;
				glow(c, 520, 280, 30, "#3fe0d0", 0.5);
				c.fillStyle = "#9ff5e8";
				c.fillRect(516, 266, 8, 22);
				c.beginPath();
				c.arc(520, 261, 5, 0, Math.PI * 2);
				c.fill();
				c.font = "10px monospace";
				c.fillText("LIRA: „WITAJ NA EOS, DOWÓDCO.”", 460, 240);
				c.globalAlpha = 1;
			}
		},
		// 15 · The title: dawn over the basin of Eos, the beacon still dark — the act begins.
		(c, t, local, reduced) => {
			const rise = ease(clamp01(local / 5));
			eosNight(c, t, 0.6 + rise * 0.4);
			glow(c, 480, 300 - rise * 40, 420, "#ffb46a", 0.3 + rise * 0.3);
			flare(c, 480, 300 - rise * 40, 0.5 + rise * 0.5, "#ffcf8a");
			tower(c, 760, 330, 1.2, 0, t);
			station(c, 640, 332, 1.2, 0.6);
			dropship(c, 300, 322, 1.1, t, 0);
			const show = reduced ? 1 : clamp01((local - 1.5) / 1.2);
			c.save();
			c.globalAlpha = show;
			c.textAlign = "center";
			c.font = "700 44px sans-serif";
			c.shadowColor = "rgba(255,190,110,0.9)";
			c.shadowBlur = 24;
			c.fillStyle = "#fff4e2";
			c.fillText("ODZYSKANY ŚWIT", W / 2, 130);
			c.shadowBlur = 0;
			c.font = "12px monospace";
			c.fillStyle = "rgba(255,230,190,0.85)";
			c.fillText("A K T   I   ·   P O G R A N I C Z E   G A L A K T Y K I", W / 2, 156);
			c.restore();
		},
	];
	const TINT = ["#2a4a8f", "#2a8f6a", "#2a8f80", "#2a6f8f", "#8f2a2a", "#8f2a2a", "#2a3f6f", "#8f1a1a", "#4a3a2a", "#2a8f80", "#2a4a6f", "#6f2a3a", "#a05a2a", "#8a6a3a", "#a06a2a"];

	// The director, shared with the act II prologue (act2-film.js): spec = { shots, titles, places, tints, captions,
	// label, alarm (shots with the alarm, a shake and a red flash), receive (shots of a received transmission) }.
	function render(c, time, reduced, spec) {
		time = Math.max(0, time);
		const last = spec.shots.length - 1,
			lengths = spec.lengths || spec.shots.map(() => spec.length || 5);
		let scene = 0,
			start = 0;
		while (scene < last && time >= start + lengths[scene]) start += lengths[scene++];
		const span = lengths[scene],
			local = Math.min(span, time - start),
			t = reduced ? start + span / 2 : time,
			l = reduced ? span / 2 : local;
		c.save();
		c.fillStyle = "#03070d";
		c.fillRect(0, 0, W, H);
		// The camera: a slow push in (the same over a long shot); a shake under the fire of the alarm shots.
		const zoom = 1 + (reduced ? 0.03 : (local / span) * 0.06),
			shake = !reduced && spec.alarm?.includes(scene) && local > 0.9 && local < span - 1 ? (rnd(Math.floor(time * 40)) - 0.5) * 4 : 0;
		c.translate(W / 2 + shake, H / 2 + shake * 0.6);
		c.scale(zoom, zoom);
		c.translate(-W / 2, -H / 2);
		spec.shots[scene](c, t, l, reduced, span);
		c.restore();
		hud(c, scene, l, t, reduced, spec);
		title(c, spec.titles[scene], l, scene, reduced, spec, span);
		finish(c, scene, l, t, reduced, spec.tints[scene]);
		// Cuts: fade from and to black; a red flash as the alarm shots open fire.
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
	const SPEC = { shots: SHOTS, titles, places, tints: TINT, captions, lengths: LENGTHS, label: "UJĘCIE PROLOGU", alarm: [5, 11], receive: [7, 9] };
	const draw = (c, time, reduced = false) => render(c, time, reduced, SPEC);
	// The tools for other films.
	// (0.170: the prologue's pieces too — the beacon tower and the Silent Station of Eos, the dropship, the night over the
	// basin, Lira's hologram, asteroids — for the campaign's finale.)
	const kit = { W, H, BAR, rnd, clamp01, ease, poly, glow, flare, stars, nebula, planet, trail, capital, freighter, fighter, beam, beacon, render, finish, tower, station, dropship, eosNight, holoLira, holo, rock };
	return { draw, captions, titles, duration, lengths: LENGTHS, lines, kit };
})();
