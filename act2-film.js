/* Act II prologue "Cena świtu" (0.106; retold in 0.171 as a story of about 75 seconds leading to chapter IV), in the
   style of the campaign films (campaign-film.js — its kit and director: letterbox, camera push, HUD, typed titles,
   grade, grain). Eight shots of their own lengths (LENGTHS): after the dawn — the beacons lit again, the aid convoys going on into the frontier;
   a repeated signal in the band of the beacons; Lira decoding it — a research team cut off on Khepri; the Dominium's
   drills on the dunes at dusk and the burrowers waking; under the sand — a drill reaching an ancient probe; the trace in its archive
   of the blockade — something draining a whole planet (not named yet: chapter V finds Vulkan IX); the convoy that will have to cross the pass of Vesper;
   the commander's dropship landing on Khepri IV by the research station, the act's title. */
const Act2Film = (() => {
	const LENGTHS = [9, 9, 10, 10, 9, 10, 9, 10];
	const duration = LENGTHS.reduce((n, l) => n + l, 0);
	const titles = ["PO ŚWICIE", "SYGNAŁ", "ZAGINIONA EKIPA", "KHEPRI IV", "POD PIASKIEM", "ŹRÓDŁO BLOKADY", "SZLAK PRZEZ LÓD", "AKT II · CENA ŚWITU"];
	const captions = [
		"Latarnie znów świeciły nad Eos, Vesperem i Nadirem, a konwoje pomocy ruszyły dalej w pogranicze.",
		"Ale w paśmie latarni pojawił się cichy, powtarzany sygnał — za słaby na wezwanie, za regularny na przypadek.",
		"Lira odszyfrowała go po trzech dniach: ekipa badawcza z Khepri IV, odcięta od czterdziestu dni, wciąż żyje.",
		"Na wydmach Khepri Dominium postawiło wiertnie. Ich hałas obudził paszczaki w skalnych jamach.",
		"Dominium kopało w ruinach dawnej sondy — a w jej archiwum zapisano, skąd naprawdę płynie energia blokady.",
		"Archiwum sondy kryło ślad: blokadę zasila coś daleko w pograniczu — coś, co wysysa energię całej planety.",
		"Droga tam wiedzie przez rdzenie energetyczne ukryte za lodową przełęczą Vesperu. Ktoś będzie musiał je przewieźć.",
		"Najpierw jednak Khepri IV: badacze, ich archiwum i rdzeń danych. Świt ma swoją cenę. Ty zdecydujesz, kto ją zapłaci.",
	];
	// Voices (0.171.9, as in the campaign's prologue): Lira when she has decoded the call, and at the landing.
	const lines = {
		2: ["lira", "Odszyfrowałam sygnał z Khepri IV. Ekipa badawcza dr Tessy żyje — i wzywa pomocy."],
		7: ["lira", "Lądujemy przy stacji badawczej. Znajdź ich, zanim zrobi to Dominium."],
	};
	const places = ["SEKTOR 07 · SZLAKI POMOCY", "SEKTOR 07 · SIEĆ LATARNI: 100%", "STACJA CISZY · EOS", "KHEPRI IV · POLA JAM", "KHEPRI IV · POD WYDMAMI", "SEKTOR 07 · ŚLAD Z ARCHIWUM", "VESPER · PRZEŁĘCZ SZRONU", "KHEPRI IV · STACJA BADAWCZA"];
	const K = CampaignFilm.kit,
		{ W, H, rnd, clamp01, ease, poly, glow, flare, stars, nebula, planet, freighter, capital, fighter, beam, beacon, dropship, holoLira } = K;

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

	// The shots of 0.106, now parts of the story.
	const PART = [
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
		// Dominium ships circling (and the act's title, when asked).
		(c, t, local, reduced, span, withTitle = false) => {
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
			if (!withTitle) return;
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
	const SHOTS = [
		// 1 · After the dawn: a world of the frontier lit again on its night side, the aid convoys coming down to it.
		(c, t, local, reduced, span) => {
			nebula(c, t, [[260, 110, 260, "#1f4a5a", 0.45, 1]]);
			stars(c, t, 4, 200, 201);
			// (0.171.9: higher and smaller, the whole lit limb in the frame.)
			planet(c, 600, 330, 220, { base: "#c69a5c", dark: "#2a1c12", atmo: "#ffd29a", light: 2.3, cities: 0.2 + clamp01(local / (span - 2)) * 0.8, clouds: 0.3, t, seed: 201 });
			for (let i = 0; i < 5; i++) {
				const p = clamp01((local - i * 0.9) / 6);
				if (p > 0 && p < 1) freighter(c, 80 + i * 50 + p * 420, 80 + i * 22 + p * 150, 1 - p * 0.5, t, i);
			}
			c.font = "10px monospace";
			c.fillStyle = "rgba(255,220,160,0.85)";
			c.fillText(`SIEĆ LATARNI · ZASILANIE KOLONII ${Math.round(20 + clamp01(local / (span - 2)) * 80)}%`, 90, 330);
		},
		// 2 · The signal in the band of the beacons.
		PART[0],
		// 3 · Lira decoding it at the Silent Station: the waveform, the map of Khepri IV, the research station marked.
		(c, t, local, reduced, span) => {
			c.fillStyle = "#04121a";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[420, 200, 360, "#0f3a44", 0.55, 0]]);
			holoLira(c, 680, 92, 190, t, reduced);
			const decoded = reduced ? 1 : clamp01((local - 0.8) / (span - 3));
			c.strokeStyle = "#ffd28a";
			c.lineWidth = 1.4;
			c.beginPath();
			for (let x = 0; x < 460; x += 3) {
				const y = 120 + (Math.floor((x + t * 60) / 40) % 3 === 0 ? Math.sin(x * 0.9) * 10 : 0) * (1 - decoded * 0.7);
				x ? c.lineTo(90 + x, y) : c.moveTo(90, y);
			}
			c.stroke();
			// The map of Khepri IV: a disc with the research station marked, the line of the last contact.
			c.strokeStyle = "rgba(255,210,140,0.35)";
			c.beginPath();
			c.arc(250, 250, 70, 0, Math.PI * 2);
			c.stroke();
			glow(c, 286, 232, 12 + 6 * Math.sin(t * 4), "#ffd38a", decoded);
			c.font = "10px monospace";
			c.fillStyle = "rgba(255,230,180,0.9)";
			const text = "EKIPA BADAWCZA · OSTATNI KONTAKT: 41 DNI · ŻYJĄ: 4";
			c.fillText(text.slice(0, Math.floor(decoded * text.length)), 340, 250);
			c.fillText(`ODSZYFROWANO ${Math.round(decoded * 100)}%`, 90, 160);
		},
		// 4 · The dunes of Khepri IV at dusk: the drills, the burrowers.
		PART[1],
		// 5 · Under the sand: a cross-section, a drill reaching the ancient probe in a cave, the burrowers' tunnels.
		(c, t, local, reduced, span) => {
			const g = c.createLinearGradient(0, 0, 0, H);
			// (0.171.9: lighter strata, the cave lit by the drill and the waking probe — it read as black.)
			g.addColorStop(0, "#b8653f");
			g.addColorStop(0.18, "#6e4430");
			g.addColorStop(1, "#33201a");
			c.fillStyle = g;
			c.fillRect(0, 0, W, H);
			for (let k = 0; k < 5; k++) {
				c.fillStyle = `rgba(0,0,0,${0.08 + k * 0.03})`;
				c.beginPath();
				c.moveTo(0, 90 + k * 60);
				for (let x = 0; x <= W; x += 40) c.lineTo(x, 90 + k * 60 + Math.sin(x * 0.01 + k) * 12);
				c.lineTo(W, H);
				c.lineTo(0, H);
				c.fill();
			}
			// The drill coming down.
			const depth = 60 + ease(clamp01(local / (span - 3))) * 190;
			c.fillStyle = "#3a302a";
			c.fillRect(470, 40, 20, depth - 40);
			glow(c, 480, depth, 30, "#ffb06a", 0.6 + 0.3 * Math.sin(t * 9));
			// The probe: an ancient pod in a cave, its lights waking as the drill comes near.
			c.fillStyle = "#24160f";
			c.beginPath();
			c.ellipse(480, 300, 150, 50, 0, 0, Math.PI * 2);
			c.fill();
			glow(c, 480, 300, 170, "#ffb070", 0.18 + 0.3 * clamp01((depth - 150) / 100));
			poly(c, [[420, 310], [450, 270], [510, 270], [540, 310], [510, 330], [450, 330]], "#5a5650");
			const wake = clamp01((depth - 180) / 60);
			for (let i = 0; i < 5; i++) glow(c, 445 + i * 18, 300, 8, "#ffe0a0", wake * (0.5 + 0.5 * Math.sin(t * 3 + i)));
			// Burrowers' tunnels and a body moving in them.
			c.strokeStyle = "rgba(60,40,30,0.8)";
			c.lineWidth = 16;
			c.beginPath();
			c.moveTo(0, 220);
			c.bezierCurveTo(200, 180, 260, 300, 380, 260);
			c.stroke();
			const u = (t * 0.15) % 1;
			glow(c, u * 380, 220 + Math.sin(u * 3) * 40, 14, "#c08a5a", 0.6);
			c.font = "10px monospace";
			c.fillStyle = "rgba(255,220,160,0.85)";
			c.fillText(`ODWIERT · ${Math.round(depth * 1.6)} M · SONDA: ${wake > 0.5 ? "AKTYWNA" : "UŚPIONA"}`, 620, 90);
		},
		// 6 · The source: Hefajstos on Vulkan IX.
		(c, t, local, reduced, span) => PART[3](c, t, local, reduced, span, false),
		// 7 · The convoy that will have to cross the pass of Vesper.
		PART[2],
		// 8 · Khepri IV at dusk: the commander's dropship coming down by the research station, the act's title.
		(c, t, local, reduced, span) => {
			const sky = c.createLinearGradient(0, 0, 0, H);
			sky.addColorStop(0, "#1d1a2e");
			sky.addColorStop(0.55, "#a8553a");
			sky.addColorStop(0.8, "#e3a060");
			c.fillStyle = sky;
			c.fillRect(0, 0, W, H);
			glow(c, 820, 250, 260, "#ffb060", 0.6);
			flare(c, 820, 250, 0.45, "#ffc080");
			dunes(c, t * 0.3, [[280, 24, 6, "#7a4a32", "rgba(255,200,140,0.35)"]]);
			// The research station: domes, a mast with the signal lamp blinking.
			c.fillStyle = "#3a2a22";
			for (const [x, r] of [[600, 26], [650, 18]]) {
				c.beginPath();
				c.ellipse(x, 300, r, r * 0.7, 0, Math.PI, Math.PI * 2);
				c.fill();
			}
			c.fillRect(676, 230, 4, 70);
			glow(c, 678, 228, 10, "#ffd38a", Math.pow(Math.max(0, Math.sin(t * Math.PI * 0.6)), 4));
			dunes(c, t * 0.3, [[340, 20, 12, "#4a2a1c", "rgba(255,180,120,0.4)"]]);
			const down = ease(clamp01(local / (span * 0.5)));
			dropship(c, 300, 60 + down * 230, 1.4, t, 1 - down);
			glow(c, 300, 300, 60 + down * 80, "#c9a07a", down * 0.4);
			const show = reduced ? 1 : clamp01((local - span * 0.45) / 1);
			c.save();
			c.globalAlpha = show;
			c.textAlign = "center";
			c.font = "700 40px sans-serif";
			c.shadowColor = "rgba(255,120,60,0.9)";
			c.shadowBlur = 24;
			c.fillStyle = "#ffe8d6";
			c.fillText("CENA ŚWITU", W / 2, 130);
			c.shadowBlur = 0;
			c.font = "12px monospace";
			c.fillStyle = "rgba(255,210,180,0.85)";
			c.fillText("A K T   I I", W / 2, 154);
			c.restore();
		},
	];
	const SPEC = { shots: SHOTS, titles, places, captions, lengths: LENGTHS, tints: ["#a0602a", "#2a6f8f", "#2a8f80", "#a0582a", "#7a3a1a", "#a0301a", "#4f7f9f", "#a0582a"], label: "UJĘCIE PROLOGU AKTU II", alarm: [5], receive: [1, 2] };
	function draw(c, time, reduced = false) {
		return K.render(c, time, reduced, SPEC);
	}
	return { draw, captions, titles, duration, lengths: LENGTHS, lines };
})();
