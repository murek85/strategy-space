/* Act III prologue "Przebudzenie Roju": four 5-second shots in the style of the campaign films (campaign-film.js
   kit and director): the artefacts of the frontier pulsing as one on a holographic star map; the glowing thicket
   of Lumeria V, the Swarm crawling out of the crystal caves; the fleets of the Colonies and of the Dominium side by
   side over Nivalis, a cloud of the Swarm coming; the Heart of the Swarm beating under the magma of Pyrrhos, an
   orbital strike falling. */
const Act3Film = (() => {
	const duration = 20;
	const titles = ["AKT III / PRZEBUDZENIE ROJU", "LUMERIA V", "SOJUSZ Z KONIECZNOŚCI", "SERCE ROJU"];
	const captions = [
		"Od wyłączenia Hefajstosa artefakty w całym pograniczu biją jednym rytmem. Coś odpowiada na ich wezwanie.",
		"Na Lumerii V z kryształowych grot wyszło coś żywego. Rój nie zna litości ani strachu.",
		"Dominium traci kolejne światy. Komandor Varn proponuje to, co wczoraj byłoby nie do pomyślenia: sojusz.",
		"Serce Roju bije pod rzekami magmy Pyrrhosa. Uciszysz je — albo pogranicze stanie się jego gniazdem.",
	];
	const places = ["SEKTOR 07 · SIEĆ ARTEFAKTÓW", "LUMERIA V · GĄSZCZ SZEPTÓW", "NIVALIS · ORBITA", "PYRRHOS · SERCE ROJU"];
	const K = CampaignFilm.kit,
		{ W, H, rnd, clamp01, ease, poly, glow, flare, stars, nebula, planet, capital, fighter, beam } = K;
	const VIOLET = "#c98cff";

	// A crystal shard: a faceted prism, lit from inside.
	function crystal(c, x, y, h, w, tilt, glowAmount) {
		c.save();
		c.translate(x, y);
		c.rotate(tilt);
		poly(c, [[-w, 0], [-w * 0.6, -h * 0.8], [0, -h], [w * 0.6, -h * 0.8], [w, 0]], "#5a3a8a");
		poly(c, [[0, -h], [w * 0.6, -h * 0.8], [w, 0], [0, 0]], "#8a5ac0");
		c.restore();
		glow(c, x, y - h * 0.5, h * 0.9, VIOLET, glowAmount);
	}
	// A crawler of the Swarm: a crystalline body, legs, glowing eyes.
	function crawler(c, x, y, s, t, i) {
		c.save();
		c.translate(x, y);
		c.scale(s, s);
		c.strokeStyle = "#2a1a3a";
		c.lineWidth = 2;
		for (let k = 0; k < 4; k++) {
			const ph = Math.sin(t * 9 + k * 1.6 + i) * 4;
			for (const side of [-1, 1]) {
				c.beginPath();
				c.moveTo(-8 + k * 6, 0);
				c.lineTo(-10 + k * 6 + side * 4, -10 + ph * side);
				c.lineTo(-12 + k * 6 + side * 8, 8);
				c.stroke();
			}
		}
		poly(c, [[-16, 0], [-6, -12], [14, -10], [20, -2], [10, 4], [-12, 4]], "#3a2550");
		poly(c, [[-6, -12], [4, -20], [10, -10]], "#6a3a9a");
		c.restore();
		glow(c, x + 18 * s, y - 4 * s, 6 * s, "#ff7aff", 0.9);
	}
	// Glowing plants of the thicket: a stalk with a luminous cap.
	function mushroom(c, x, y, h, color, t, i) {
		c.fillStyle = "#14201e";
		c.fillRect(x - 3, y - h, 6, h);
		c.beginPath();
		c.ellipse(x, y - h, h * 0.42, h * 0.16, 0, Math.PI, 0);
		c.fill();
		glow(c, x, y - h + 4, h * 0.6, color, 0.45 + 0.2 * Math.sin(t * 2 + i));
		for (let k = 0; k < 5; k++) {
			c.fillStyle = color;
			c.globalAlpha = 0.8;
			c.fillRect(x - h * 0.3 + k * h * 0.15, y - h + 2, 2, 2);
			c.globalAlpha = 1;
		}
	}
	// A cloud of the Swarm: many dark motes with violet sparks, moving as one.
	function swarm(c, x, y, r, t, n) {
		for (let k = 0; k < n; k++) {
			const a = rnd(k) * Math.PI * 2 + t * (0.3 + rnd(k * 3) * 0.6),
				d = Math.sqrt(rnd(k * 5)) * r;
			const px = x + Math.cos(a) * d * 1.4,
				py = y + Math.sin(a) * d * 0.7;
			c.fillStyle = k % 6 ? "rgba(40,20,60,0.85)" : VIOLET;
			c.fillRect(px, py, k % 6 ? 3 : 2, k % 6 ? 2 : 2);
		}
		glow(c, x, y, r * 1.2, "#7a3aaa", 0.25);
	}

	const SHOTS = [
		// The artefacts beating as one: a holo star map of the frontier, five artefacts pulsing in step,
		// lines of light joining them, "RYTM: ZSYNCHRONIZOWANY".
		(c, t, local) => {
			c.fillStyle = "#05030c";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[480, 200, 380, "#3a1a5a", 0.6, 0], [200, 120, 220, "#1a2a5a", 0.4, 1]]);
			stars(c, t, 2, 220, 41, "#e6d6ff");
			const pts = [[180, 150], [340, 260], [480, 120], [640, 240], [800, 150]];
			const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.2)), 6),
				sync = clamp01(local / 2.5);
			// Rings of the map.
			c.strokeStyle = "rgba(201,140,255,0.15)";
			for (let k = 0; k < 6; k++) {
				c.beginPath();
				c.ellipse(480, 200, 80 + k * 60, 30 + k * 22, 0, 0, Math.PI * 2);
				c.stroke();
			}
			pts.forEach(([x, y], i) => {
				const own = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.2 + (1 - sync) * i * 1.3)), 6);
				glow(c, x, y, 26 + own * 30, VIOLET, 0.5 + own * 0.5);
				crystal(c, x, y + 8, 22, 6, 0, 0.3);
				if (i) {
					const [px, py] = pts[i - 1];
					beam(c, px, py, x, y, VIOLET, 0.8, sync * (0.3 + beat * 0.7));
				}
			});
			c.font = "11px monospace";
			c.fillStyle = "rgba(220,190,255,0.9)";
			c.fillText(`RYTM ARTEFAKTÓW: ${sync >= 1 ? "ZSYNCHRONIZOWANY" : Math.round(sync * 100) + "%"}`, 640, 92);
			c.fillRect(640, 98, 200 * sync, 2);
		},
		// Lumeria V: the glowing thicket at night, crystal caves breathing light, crawlers coming out.
		(c, t, local) => {
			const sky = c.createLinearGradient(0, 0, 0, H);
			sky.addColorStop(0, "#050a14");
			sky.addColorStop(1, "#10282a");
			c.fillStyle = sky;
			c.fillRect(0, 0, W, H);
			stars(c, t, 1, 120, 42);
			planet(c, 820, 80, 30, { base: "#9fd0e0", atmo: "#bfefff", light: -2.4, clouds: 0.2, t, seed: 42 });
			// The cave mouth: crystals round a glowing opening.
			glow(c, 600, 300, 200, VIOLET, 0.35 + 0.15 * Math.sin(t * 2));
			poly(c, [[440, 360], [500, 230], [600, 200], [720, 240], [780, 360]], "#160c22");
			for (let k = 0; k < 9; k++) crystal(c, 470 + k * 36, 300 + Math.abs(k - 4) * 10, 30 + rnd(k) * 50, 9, (rnd(k * 3) - 0.5) * 0.6, 0.35);
			// Crawlers pouring out of the cave.
			for (let i = 0; i < 6; i++) {
				const p = (local * 0.25 + i * 0.16) % 1;
				crawler(c, 600 - p * 520, 330 + Math.sin(i) * 14, 1.2 + p * 0.6, t, i);
			}
			// The thicket in front.
			for (let i = 0; i < 8; i++) mushroom(c, 40 + i * 120 + (i % 2) * 30, 380, 60 + rnd(i) * 70, i % 2 ? "#5fffd0" : "#7ad0ff", t, i);
			// Spores drifting.
			for (let i = 0; i < 60; i++) {
				c.fillStyle = i % 3 ? "rgba(140,255,220,0.6)" : "rgba(201,140,255,0.7)";
				c.fillRect((rnd(i) * W + Math.sin(t * 0.5 + i) * 20) % W, ((rnd(i * 3) * H - t * 12) % H + H) % H, 2, 2);
			}
		},
		// Nivalis: the Colonies' cruiser and Varn's flagship side by side over the ice world; fighters of both;
		// a cloud of the Swarm closing in from the right.
		(c, t, local) => {
			nebula(c, t, [[300, 120, 300, "#1a3a5a", 0.5, 1], [800, 250, 280, "#3a1a5a", 0.45, -1]]);
			stars(c, t, 5, 200, 43);
			planet(c, 480, 470, 300, { base: "#d9e8f0", dark: "#2a3a50", atmo: "#bfe6ff", light: -1.9, cities: 0.4, t, seed: 43 });
			capital(c, 200 + local * 14, 150, 1, t, false);
			capital(c, 230 + local * 14, 245, 1.05, t, true);
			for (let i = 0; i < 6; i++) fighter(c, 120 + i * 70 + local * 30, 190 + (i % 3) * 20, 0.9, 0, i % 2 === 1);
			swarm(c, 860 - local * 18, 190, 110, t, 380);
			flare(c, 90, 60, 0.4, "#bfe6ff");
		},
		// Pyrrhos: the Heart of the Swarm glowing through cracks in the magma, beating; the Swarm rising; an orbital
		// strike from Varn's station falls; the act's title.
		(c, t, local, reduced) => {
			const sky = c.createLinearGradient(0, 0, 0, H);
			sky.addColorStop(0, "#0c0612");
			sky.addColorStop(0.7, "#3a1020");
			sky.addColorStop(1, "#6a2010");
			c.fillStyle = sky;
			c.fillRect(0, 0, W, H);
			stars(c, t, 1, 90, 44, "#ffd6e6");
			poly(c, [[0, 290], [W, 275], [W, H], [0, H]], "#160a0c");
			// The heart: a violet core under the crust, its veins and the beat.
			const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.4)), 4);
			glow(c, 480, 330, 220 + beat * 60, "#9a3aff", 0.45 + beat * 0.3);
			glow(c, 480, 330, 60 + beat * 20, "#ffd6ff", 0.6 + beat * 0.4);
			c.save();
			c.globalCompositeOperation = "lighter";
			for (let k = 0; k < 12; k++) {
				const a = (k / 12) * Math.PI * 2,
					len = 120 + rnd(k) * 260;
				c.strokeStyle = k % 3 ? "#ff6a2a" : VIOLET;
				c.globalAlpha = 0.35 + beat * 0.4;
				c.lineWidth = 2 + rnd(k * 3) * 3;
				c.beginPath();
				c.moveTo(480, 330);
				let x = 480,
					y = 330;
				for (let s = 0; s < 6; s++) {
					x += Math.cos(a + (rnd(k * 7 + s) - 0.5) * 0.8) * (len / 6);
					y += Math.sin(a + (rnd(k * 9 + s) - 0.5) * 0.8) * (len / 6) * 0.25;
					c.lineTo(x, Math.max(290, y));
				}
				c.stroke();
			}
			c.restore();
			for (let k = 0; k < 7; k++) crystal(c, 380 + k * 34, 300 - Math.abs(k - 3) * 6, 50 + (3 - Math.abs(k - 3)) * 30, 12, (k - 3) * 0.12, 0.3 + beat * 0.3);
			// The Swarm rising from the heart.
			swarm(c, 480, 150 - local * 6, 150, t, 300);
			// The orbital strike: a beam from above, the hit flaring.
			const strike = clamp01((local - 1.6) / 0.4) * (1 - clamp01((local - 2.6) / 0.6));
			if (strike > 0) {
				beam(c, 600, 0, 560, 300, "#ffd28a", 4, strike);
				glow(c, 560, 300, 160 * strike, "#fff0c0", strike);
			}
			capital(c, 100 + local * 12, 70, 0.55, t, true);
			const show = reduced ? 1 : clamp01((local - 2.8) / 0.9);
			c.save();
			c.globalAlpha = show;
			c.textAlign = "center";
			c.font = "700 38px sans-serif";
			c.shadowColor = "rgba(201,140,255,0.95)";
			c.shadowBlur = 26;
			c.fillStyle = "#f4e6ff";
			c.fillText("PRZEBUDZENIE ROJU", W / 2, 120);
			c.shadowBlur = 0;
			c.font = "12px monospace";
			c.fillStyle = "rgba(230,200,255,0.85)";
			c.fillText("A K T   I I I", W / 2, 144);
			c.restore();
		},
	];
	const SPEC = { shots: SHOTS, titles, places, captions, tints: ["#6a2a8f", "#2a8f80", "#4f6f9f", "#8f2a6a"], label: "UJĘCIE PROLOGU AKTU III", alarm: [3], receive: [0] };
	function draw(c, time, reduced = false) {
		return K.render(c, time, reduced, SPEC);
	}
	return { draw, captions, titles, duration };
})();
