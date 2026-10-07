/* Act II prologue "Cena świtu": four 5-second shots in the style of the campaign intro (campaign-film.js — its
   kit and director: letterbox, camera push, HUD, typed titles, grade, grain): the beacons alight again and a
   repeated signal from Khepri IV; Dominium drills on the dunes at dusk and the burrowers waking under the sand;
   three convoy haulers on a mountain road in a blizzard; the Hefajstos complex draining Vulkan IX. */
const Act2Film = (() => {
	const duration = 20;
	const titles = ["AKT II / CENA ŚWITU", "SYGNAŁ SPOD PIASKU", "OSTATNI KONWÓJ", "SERCE POPIOŁU"];
	const captions = [
		"Latarnie znów świecą. W ich paśmie pojawił się cichy, powtarzany sygnał z odciętej ekipy badawczej.",
		"Na Khepri IV Dominium kopie w dawnych instalacjach sondy. Hałas wiertni obudził paszczaki w skalnych jamach.",
		"Archiwum wskaże drogę do rdzeni energetycznych. Trzy konwojowce muszą przejść przez lodową przełęcz Vesperu.",
		"Na końcu szlaku czeka kompleks Hefajstos — źródło blokady. Świt ma swoją cenę. Ty zdecydujesz, kto ją zapłaci.",
	];
	const places = ["SEKTOR 07 · SIEĆ LATARNI: 100%", "KHEPRI IV · POLA JAM", "VESPER · PRZEŁĘCZ SZRONU", "VULKAN IX · KOMPLEKS HEFAJSTOS"];
	const K = CampaignFilm.kit,
		{ W, H, rnd, clamp01, ease, poly, glow, flare, stars, nebula, planet, freighter, capital, fighter, beam, beacon } = K;

	// Sand dunes in layers (moving left by the parallax), lit from the low sun on the right.
	function dunes(c, t, layers) {
		layers.forEach(([base, amp, speed, color, crest], k) => {
			const pts = [[0, H]];
			for (let x = -80; x <= W + 80; x += 20) {
				const wx = x + ((t * speed) % 80),
					k2 = x + Math.floor((t * speed) / 80) * 80;
				pts.push([wx - 80, base - Math.sin(k2 * 0.008 + k * 2) * amp - Math.sin(k2 * 0.021 + k) * amp * 0.35]);
			}
			pts.push([W, H]);
			const rows = pts.map(([x, y]) => [W - x, y]);
			poly(c, rows, color);
			c.strokeStyle = crest;
			c.lineWidth = 1.4;
			c.beginPath();
			rows.slice(1, -1).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
			c.stroke();
		});
	}
	// A drilling rig: a lattice tower, its lamps, the bit glowing in the dust it throws up.
	function rig(c, x, y, s, t, i) {
		c.save();
		c.translate(x, y);
		c.scale(s, s);
		c.strokeStyle = "#2a2522";
		c.lineWidth = 2.2;
		c.beginPath();
		c.moveTo(-14, 0);
		c.lineTo(0, -90);
		c.lineTo(14, 0);
		for (let k = 0; k < 6; k++) {
			c.moveTo(-14 + k * 2.3, -k * 15);
			c.lineTo(14 - (k + 1) * 2.3, -(k + 1) * 15);
		}
		c.stroke();
		poly(c, [[-26, 0], [26, 0], [20, -10], [-20, -10]], "#3a302a");
		c.restore();
		const on = Math.sin(t * 4 + i) > 0 ? 1 : 0.25;
		glow(c, x, y - 90 * s, 10 * s, "#ff6a4a", on);
		glow(c, x, y, 40 * s, "#ffb06a", 0.6 + 0.3 * Math.sin(t * 9 + i));
		// Dust thrown up by the bit.
		for (let k = 0; k < 10; k++) {
			const a = rnd(k + i * 10),
				life = (t * 0.6 + a) % 1;
			c.fillStyle = `rgba(200,160,110,${0.35 * (1 - life)})`;
			c.beginPath();
			c.arc(x + (rnd(k * 3 + i) - 0.5) * 60 * s * life, y - life * 60 * s, (6 + life * 22) * s, 0, Math.PI * 2);
			c.fill();
		}
	}
	// A burrower's back breaking the sand: plates rising and sinking along its path.
	function burrower(c, x, y, s, t, phase) {
		for (let k = 0; k < 7; k++) {
			const u = (t * 0.5 + phase) % 1,
				lift = Math.max(0, Math.sin((u * 2 - k * 0.12) * Math.PI));
			if (lift <= 0) continue;
			c.save();
			c.translate(x + k * 26 * s, y);
			c.scale(s, s);
			poly(c, [[-12, 0], [-4, -18 * lift], [6, -22 * lift], [13, 0]], "#4a3a32");
			poly(c, [[-4, -18 * lift], [6, -22 * lift], [2, -8 * lift]], "#6a5444");
			c.restore();
			c.fillStyle = "rgba(210,170,120,0.35)";
			c.fillRect(x + k * 26 * s - 16 * s, y - 2, 32 * s, 4);
		}
	}
	// A convoy hauler on a road heading right: a cab, the core container glowing, headlights cutting the snow.
	function hauler(c, x, y, s, t, i) {
		c.save();
		c.translate(x, y);
		c.scale(s, s);
		poly(c, [[-60, 0], [30, 0], [44, -16], [44, -28], [24, -34], [-60, -34]], "#3f4f5a");
		poly(c, [[24, -34], [44, -28], [44, -16], [26, -18]], "#8fb2c0");
		c.fillStyle = "#1d2830";
		c.fillRect(-58, -30, 70, 24);
		c.fillStyle = "#2a3a44";
		for (const wx of [-48, -22, 4, 30]) {
			c.beginPath();
			c.arc(wx, 2, 8, 0, Math.PI * 2);
			c.fill();
		}
		c.restore();
		glow(c, x - 23 * s, y - 18 * s, 34 * s, "#ffb04a", 0.5 + 0.2 * Math.sin(t * 3 + i));
		// Headlights.
		c.save();
		c.globalCompositeOperation = "lighter";
		const beamG = c.createLinearGradient(x + 44 * s, y, x + 300 * s, y);
		beamG.addColorStop(0, "rgba(230,245,255,0.45)");
		beamG.addColorStop(1, "rgba(230,245,255,0)");
		c.fillStyle = beamG;
		c.beginPath();
		c.moveTo(x + 44 * s, y - 14 * s);
		c.lineTo(x + 300 * s, y - 50 * s);
		c.lineTo(x + 300 * s, y + 30 * s);
		c.closePath();
		c.fill();
		c.restore();
		glow(c, x + 45 * s, y - 14 * s, 9 * s, "#ffffff", 1);
	}

	const SHOTS = [
		// The beacons again: the chain lit across the sector, a planet at dawn, the signal pulsing from Khepri IV.
		(c, t, local) => {
			nebula(c, t, [[300, 100, 280, "#1f4a5a", 0.5, 1], [760, 300, 300, "#3a3a6a", 0.35, -1]]);
			stars(c, t, 5, 220, 21);
			planet(c, 690, 300, 190, { base: "#c69a5c", dark: "#2a1c12", atmo: "#ffd29a", light: -2.6, cities: 0.5, t, seed: 21 });
			const chain = Array.from({ length: 8 }, (_, i) => [90 + i * 92, 120 + Math.sin(i * 0.9) * 30]);
			chain.forEach(([x, y], i) => beacon(c, x, y, 0.8, clamp01((local - i * 0.12) * 3), t, i));
			// The signal: rings spreading from a point on the planet, a waveform in the HUD.
			const sx = 640,
				sy = 260;
			for (let k = 0; k < 4; k++) {
				const r = ((t * 40 + k * 45) % 180) + 4;
				c.strokeStyle = `rgba(255,214,140,${0.6 * (1 - r / 184)})`;
				c.lineWidth = 1.5;
				c.beginPath();
				c.arc(sx, sy, r, 0, Math.PI * 2);
				c.stroke();
			}
			glow(c, sx, sy, 16, "#ffe0a0", 0.8 + 0.2 * Math.sin(t * 6));
			c.strokeStyle = "#ffd28a";
			c.lineWidth = 1.2;
			c.beginPath();
			for (let x = 0; x < 180; x += 3) {
				const y = 212 + (Math.floor((x + t * 60) / 40) % 3 === 0 ? Math.sin(x * 0.9) * 8 : 0);
				x ? c.lineTo(760 + x, y) : c.moveTo(760, y);
			}
			c.stroke();
			c.font = "10px monospace";
			c.fillStyle = "rgba(255,220,160,0.85)";
			c.fillText("SYGNAŁ · 0.3 Hz · POWTARZANY", 760, 196);
			for (let i = 0; i < 4; i++) freighter(c, 100 + i * 140 + local * 24, 300 + (i % 2) * 20, 0.75, t, i);
		},
		// The dunes of Khepri IV at dusk: Dominium drills throwing up dust, burrowers breaking the sand.
		(c, t, local) => {
			const sky = c.createLinearGradient(0, 0, 0, H);
			sky.addColorStop(0, "#1d1a2e");
			sky.addColorStop(0.55, "#a8553a");
			sky.addColorStop(0.75, "#e3a060");
			c.fillStyle = sky;
			c.fillRect(0, 0, W, H);
			glow(c, 820, 250, 260, "#ffb060", 0.6);
			flare(c, 820, 250, 0.45, "#ffc080");
			stars(c, t, 0, 60, 22);
			dunes(c, t, [[250, 26, 10, "#7a4a32", "rgba(255,200,140,0.35)"]]);
			rig(c, 640, 248, 0.9, t, 0);
			rig(c, 760, 252, 0.6, t, 1);
			dunes(c, t, [[300, 30, 30, "#5a3424", "rgba(255,190,130,0.4)"]]);
			burrower(c, 160 + local * 18, 312, 1, t, 0.2);
			dunes(c, t, [[360, 22, 70, "#3a2018", "rgba(255,170,110,0.45)"]]);
			freighter(c, 120 + local * 60, 150, 1, t, 3);
			// Blowing sand.
			c.fillStyle = "rgba(230,180,120,0.12)";
			for (let i = 0; i < 40; i++) c.fillRect(((rnd(i) * W - t * 300) % W + W) % W, rnd(i * 3) * H, 30, 1);
		},
		// The pass of Vesper in a blizzard: three haulers crawl up a mountain road, headlights in the snow.
		(c, t, local) => {
			const sky = c.createLinearGradient(0, 0, 0, H);
			sky.addColorStop(0, "#1c2836");
			sky.addColorStop(1, "#6f8597");
			c.fillStyle = sky;
			c.fillRect(0, 0, W, H);
			for (let layer = 0; layer < 3; layer++) {
				const pts = [[0, H]];
				for (let x = 0; x <= W; x += 30) pts.push([x - local * (4 + layer * 6), 120 + layer * 70 - (1 - Math.abs(Math.sin(x * 0.007 + layer * 1.7))) * 90]);
				pts.push([W, H]);
				poly(c, pts, ["#4c6070", "#33465a", "#1f2d3c"][layer]);
			}
			// The road climbing to the right.
			poly(c, [[0, 330], [W, 250], [W, 270], [0, 360]], "#2a3540");
			for (let i = 0; i < 3; i++) {
				const x = 140 + i * 230 + local * 20,
					y = 330 - x * (80 / W) + 2;
				hauler(c, x, y, 0.9, t, i);
			}
			// Blizzard: driven snow in two depths and a white-out breathing.
			c.strokeStyle = "rgba(240,248,255,0.55)";
			c.lineWidth = 1.2;
			for (let i = 0; i < 160; i++) {
				const z = rnd(i * 5) * 0.8 + 0.2,
					x = ((rnd(i) * W - t * 500 * z) % W + W) % W,
					y = ((rnd(i * 3) * H + t * 160 * z) % H + H) % H;
				c.globalAlpha = z;
				c.beginPath();
				c.moveTo(x, y);
				c.lineTo(x - 12 * z, y + 4 * z);
				c.stroke();
			}
			c.globalAlpha = 1;
			c.fillStyle = `rgba(210,225,235,${0.12 + 0.08 * Math.sin(t * 1.3)})`;
			c.fillRect(0, 0, W, H);
		},
		// Vulkan IX: the Hefajstos complex on its crater, beams of energy pulled out of the planet, lava, ash,
		// Dominium ships circling; the act's title at the end.
		(c, t, local, reduced) => {
			const sky = c.createLinearGradient(0, 0, 0, H);
			sky.addColorStop(0, "#120808");
			sky.addColorStop(0.7, "#4a1a10");
			sky.addColorStop(1, "#8a2a10");
			c.fillStyle = sky;
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[480, 330, 360, "#ff5a20", 0.25, 0]]);
			// Ground and lava rivers.
			poly(c, [[0, 300], [W, 285], [W, H], [0, H]], "#1a0f0c");
			c.save();
			c.globalCompositeOperation = "lighter";
			for (let k = 0; k < 3; k++) {
				c.strokeStyle = ["#ff5a1a", "#ff8a2a", "#ffc060"][k];
				c.lineWidth = [7, 3.5, 1.2][k];
				c.globalAlpha = [0.4, 0.7, 0.9][k];
				for (const [sx, dir] of [[480, -1], [480, 1]]) {
					c.beginPath();
					for (let x = 0; x < 480; x += 12) {
						const px = sx + dir * x,
							py = 300 + x * 0.18 + Math.sin(x * 0.04 + dir) * 10;
						x ? c.lineTo(px, py) : c.moveTo(px, py);
					}
					c.stroke();
				}
			}
			c.restore();
			// The complex: a stepped tower over the crater, backlit by the furnace, its edges glowing, rows of
			// lit windows, the glowing core.
			glow(c, 480, 210, 300, "#ff5a20", 0.35);
			const tiers = [
				[[340, 300], [380, 200], [420, 160], [540, 160], [580, 200], [620, 300]],
				[[400, 160], [430, 90], [530, 90], [560, 160]],
				[[455, 90], [470, 40], [490, 40], [505, 90]],
			];
			tiers.forEach((pts, k) => {
				poly(c, pts, ["#3a2620", "#4a3028", "#5a3a30"][k]);
				c.save();
				c.globalCompositeOperation = "lighter";
				c.strokeStyle = "#ff8a3a";
				c.globalAlpha = 0.55;
				c.lineWidth = 1.5;
				c.beginPath();
				pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
				c.stroke();
				c.restore();
			});
			c.fillStyle = "#ffc080";
			for (let k = 0; k < 40; k++) if (rnd(k + 3) > 0.3) c.fillRect(372 + (k % 20) * 11, 200 + Math.floor(k / 20) * 36 + (k % 3), 5, 2.5);
			for (let k = 0; k < 12; k++) if (rnd(k + 9) > 0.3) c.fillRect(436 + (k % 6) * 16, 110 + Math.floor(k / 6) * 22, 5, 2.5);
			const pulse = 0.75 + 0.25 * Math.sin(t * 5);
			glow(c, 480, 150, 120, "#ff7a2a", 0.6 * pulse);
			glow(c, 480, 150, 30, "#fff0c0", pulse);
			// Energy pulled up from the planet into the core.
			for (const [x, y] of [[150, 360], [300, 330], [700, 330], [840, 360], [480, 390]]) beam(c, x, y, 480, 150, "#ff8a3a", 1.4, 0.35 + 0.25 * Math.sin(t * 7 + x));
			beam(c, 480, 40, 480, 0, "#ffb070", 3, 0.6);
			// Ash falling, embers rising.
			for (let i = 0; i < 90; i++) {
				const x = ((rnd(i) * W + t * 10) % W + W) % W,
					y = ((rnd(i * 3) * H + t * 25 * (0.5 + rnd(i * 7))) % H + H) % H;
				c.fillStyle = i % 5 ? "rgba(120,110,105,0.5)" : "rgba(255,150,70,0.8)";
				c.fillRect(x, i % 5 ? y : H - y, 2, 2);
			}
			// Dominium ships circling the complex.
			for (let i = 0; i < 3; i++) {
				const a = t * 0.4 + i * 2.1;
				fighter(c, 480 + Math.cos(a) * 260, 130 + Math.sin(a) * 50, 1.1, a + Math.PI / 2, true);
			}
			capital(c, 120 + local * 10, 70, 0.6, t, true);
			const show = reduced ? 1 : clamp01((local - 2.4) / 1);
			c.save();
			c.globalAlpha = show;
			c.textAlign = "center";
			c.font = "700 40px sans-serif";
			c.shadowColor = "rgba(255,120,60,0.9)";
			c.shadowBlur = 24;
			c.fillStyle = "#ffe8d6";
			c.fillText("CENA ŚWITU", W / 2, 236);
			c.shadowBlur = 0;
			c.font = "12px monospace";
			c.fillStyle = "rgba(255,210,180,0.85)";
			c.fillText("A K T   I I", W / 2, 260);
			c.restore();
		},
	];
	const SPEC = { shots: SHOTS, titles, places, captions, tints: ["#2a6f8f", "#a0582a", "#4f7f9f", "#a0301a"], label: "UJĘCIE PROLOGU AKTU II", alarm: [3], receive: [0] };
	function draw(c, time, reduced = false) {
		return K.render(c, time, reduced, SPEC);
	}
	return { draw, captions, titles, duration };
})();
