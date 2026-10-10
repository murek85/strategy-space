/* Act III prologue "Przebudzenie Roju" (retold in 0.171 as a story of about 75 seconds leading to chapter VII), in
   the style of the campaign films (campaign-film.js — its kit and director). Eight shots of their own lengths
   (LENGTHS): the fall of Hefajstos as the act II decision made it (blown up, or switched off with the technicians
   flying out); the artefacts of the frontier beating as one; Dr Tessa's lab — the pattern in the crystal is alive;
   the Swarm spreading over the tactical map; Varn's call (grateful or bitter, by the same decision); the fleets of
   the Colonies and of the Dominium over Nivalis; the Heart of the Swarm under the magma of Pyrrhos; the landing on
   Lumeria V among the crawlers, the act's title. Act3Film.prepare(choices) sets the campaign's decisions
   (CampaignProgress.choices) before it plays. */
const Act3Film = (() => {
	const LENGTHS = [9, 9, 10, 9, 10, 9, 10, 10];
	const duration = LENGTHS.reduce((n, l) => n + l, 0);
	let choices = {};
	const burnt = () => choices.colony6 === "destroy",
		saved = () => choices.colony6 === "evacuate";
	const titles = ["UPADEK HEFAJSTOSA", "RYTM ARTEFAKTÓW", "ŻYWY KRYSZTAŁ", "MAPA ROJU", "WEZWANIE VARNA", "SOJUSZ Z KONIECZNOŚCI", "SERCE ROJU", "AKT III · PRZEBUDZENIE ROJU"];
	const captions = () => [
		burnt()
			? "Hefajstos runął w ogniu. Blokada pogranicza upadła razem z nim, a ruiny kompleksu płonęły jeszcze przez wiele dni."
			: saved()
				? "Hefajstos zgasł. Technicy Dominium odlecieli wahadłowcami, a blokada pogranicza upadła razem z kompleksem."
				: "Hefajstos zgasł, a blokada pogranicza upadła razem z nim. Na Vulkanie IX zapadła cisza.",
		"Tej samej nocy artefakty obcych w całym pograniczu zaczęły bić jednym rytmem. Coś odpowiadało na ich wezwanie.",
		"Dr Tessa zbadała odłamek z Khepri. Wzór w krysztale nie był maszyną. Był żywy — i rósł.",
		"Na mapach sektora pojawiły się fioletowe plamy. Rój budził się świat po świecie, zaczynając od Lumerii V.",
		burnt()
			? "Komandor Varn nie wybaczył Hefajstosa. Ale Rój pożerał jego światy — a wróg mojego wroga to jeszcze nie przyjaciel."
			: saved()
				? "Komandor Varn pamiętał o uratowanych technikach. Pierwszy raz Dominium nie żądało — prosiło o pomoc."
				: "Komandor Varn wywołał Kolonie. Dominium traciło kolejne światy i proponowało to, co wczoraj było nie do pomyślenia.",
		"Nad Nivalis floty, które jeszcze niedawno do siebie strzelały, mogą stanąć ramię w ramię.",
		"A pod rzekami magmy Pyrrhosa bije Serce Roju. Uciszysz je — albo pogranicze stanie się jego gniazdem.",
		"Najpierw Lumeria V, gdzie sygnał jest najsilniejszy. Zdobądź artefakt, zanim zabierze go Rój.",
	];
	const places = ["VULKAN IX · ORBITA", "SEKTOR 07 · SIEĆ ARTEFAKTÓW", "STACJA CISZY · LABORATORIUM", "SEKTOR 07 · MAPA TAKTYCZNA", "KANAŁ DOMINIUM · SZYFR VARNA", "NIVALIS · ORBITA", "PYRRHOS · SERCE ROJU", "LUMERIA V · GĄSZCZ SZEPTÓW"];
	const K = CampaignFilm.kit,
		{ W, H, rnd, clamp01, ease, poly, glow, flare, stars, nebula, planet, capital, fighter, freighter, beam, dropship, holo } = K;
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

	// The shots of the first prologue, now parts of the story.
	const PART = [
		// The artefacts beating as one: a holo star map of the frontier, five artefacts pulsing in step,
		// lines of light joining them, "RYTM: ZSYNCHRONIZOWANY".
		(c, t, local, reduced, span = 5) => {
			c.fillStyle = "#05030c";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[480, 200, 380, "#3a1a5a", 0.6, 0], [200, 120, 220, "#1a2a5a", 0.4, 1]]);
			stars(c, t, 2, 220, 41, "#e6d6ff");
			const pts = [[180, 150], [340, 260], [480, 120], [640, 240], [800, 150]];
			const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.2)), 6),
				sync = clamp01(local / (span * 0.45));
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
		// strike from Varn's station falls (and the act's title, when asked).
		(c, t, local, reduced, span = 5, withTitle = true) => {
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
			const strike = clamp01((local - span * 0.32) / 0.4) * (1 - clamp01((local - span * 0.52) / 0.6));
			if (strike > 0) {
				beam(c, 600, 0, 560, 300, "#ffd28a", 4, strike);
				glow(c, 560, 300, 160 * strike, "#fff0c0", strike);
			}
			capital(c, 100 + local * 12, 70, 0.55, t, true);
			if (!withTitle) return;
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
	// The frontier on the tactical map (shots 4 and 5): the worlds, by name.
	const WORLDS = [[230, 250, "LUMERIA V"], [380, 150, "NIVALIS"], [520, 290, "PYRRHOS"], [650, 170, "KHEPRI IV"], [790, 260, "EOS"], [470, 90, "VULKAN IX"]];

	const SHOTS = [
		// 1 · The fall of Hefajstos: Vulkan IX from orbit, the complex's beams of energy failing — then a blast and a
		// burning scar (destroy), or its lights going out one by one and shuttles flying away (evacuate).
		(c, t, local, reduced, span) => {
			nebula(c, t, [[700, 120, 300, "#4a1a10", 0.5, 1]]);
			stars(c, t, 3, 200, 301, "#ffe0d0");
			const fall = clamp01((local - 1.5) / (span * 0.35));
			planet(c, 480, 470, 300, { base: "#6a2a1a", dark: "#1a0806", atmo: "#ff8a4a", light: -2.2, cities: burnt() ? 0 : 0.6 * (1 - fall), t, seed: 301 });
			// The beams pulled out of the planet, dying.
			for (let k = 0; k < 4; k++) beam(c, 400 + k * 50, 190, 380 + k * 70, 0, "#ff9a4a", 3, (1 - fall) * (0.5 + 0.3 * Math.sin(t * 5 + k)));
			// The complex on the limb.
			for (let k = 0; k < 9; k++) {
				const out = clamp01(fall * 1.4 - k * 0.06);
				glow(c, 420 + k * 15, 186 + Math.abs(k - 4) * 2, 9, "#ffd28a", burnt() ? 1 - fall : 1 - out);
			}
			if (burnt()) {
				const blast = clamp01((local - span * 0.4) / 1.2),
					fade = 1 - clamp01((local - span * 0.6) / 2);
				if (blast > 0) {
					glow(c, 480, 186, 40 + blast * 260, "#fff0c0", fade * 0.9 + 0.1);
					glow(c, 480, 186, 30 + blast * 90, "#ff7a2a", 0.8);
					c.strokeStyle = `rgba(255,200,140,${0.6 * fade})`;
					c.lineWidth = 3;
					c.beginPath();
					c.ellipse(480, 186, blast * 340, blast * 90, 0, 0, Math.PI * 2);
					c.stroke();
				}
			} else
				for (let i = 0; i < 4; i++) {
					const p = clamp01((local - span * 0.35 - i * 0.7) / 4);
					if (p > 0 && p < 1) freighter(c, 470 + i * 12 + p * 420, 186 + i * 14 - p * 30, 0.5 + p * 0.4, t, i);
				}
			c.font = "10px monospace";
			c.fillStyle = "rgba(255,210,170,0.9)";
			c.fillText(`HEFAJSTOS · ${burnt() ? (local > span * 0.4 ? "SYGNAŁ UTRACONY" : "PRZECIĄŻENIE RDZENIA") : `ODŁĄCZANIE ${Math.round(fall * 100)}%`}`, 620, 92);
			c.fillText(`BLOKADA SEKTORA: ${fall >= 1 ? "UPADŁA" : "AKTYWNA"}`, 620, 106);
		},
		// 2 · The artefacts of the frontier beating as one.
		PART[0],
		// 3 · Dr Tessa's lab: a crystal shard under the scanner, its pattern growing like a living thing.
		(c, t, local, reduced, span) => {
			c.fillStyle = "#0a0712";
			c.fillRect(0, 0, W, H);
			glow(c, 300, 260, 260, "#4a2a6a", 0.4);
			holo(c, "tessa", "DR MIRA TESSA · EKIPA BADAWCZA", 690, 96, 170, t, reduced, "#c9a060", "#f0cf8a");
			// The pedestal and the shard, the scanner's ring going up and down.
			poly(c, [[230, 330], [370, 330], [350, 300], [250, 300]], "#2a2236");
			crystal(c, 300, 300, 90, 22, 0, 0.4 + 0.2 * Math.sin(t * 2.4));
			const ring = 300 - (0.5 + 0.5 * Math.sin(t * 1.6)) * 90;
			c.strokeStyle = "rgba(127,231,220,0.7)";
			c.lineWidth = 2;
			c.beginPath();
			c.ellipse(300, ring, 46, 10, 0, 0, Math.PI * 2);
			c.stroke();
			// The pattern: a branching growth, deeper each second.
			const grow = reduced ? 1 : clamp01(local / (span - 2));
			c.save();
			c.strokeStyle = "#e0b0ff";
			c.globalAlpha = 0.8;
			c.lineWidth = 1.2;
			const branch = (x, y, a, len, depth) => {
				if (depth > grow * 6 || len < 4) return;
				const x2 = x + Math.cos(a) * len,
					y2 = y + Math.sin(a) * len;
				c.beginPath();
				c.moveTo(x, y);
				c.lineTo(x2, y2);
				c.stroke();
				branch(x2, y2, a - 0.5, len * 0.72, depth + 1);
				branch(x2, y2, a + 0.45, len * 0.68, depth + 1);
			};
			branch(500, 330, -Math.PI / 2, 52, 0);
			c.restore();
			c.font = "10px monospace";
			c.fillStyle = "rgba(240,210,160,0.9)";
			c.fillText("ODŁAMEK · KHEPRI IV", 240, 110);
			c.fillText(`WZROST STRUKTURY +${Math.round(grow * 340)}%`, 440, 110);
			if (grow > 0.7) {
				c.fillStyle = "#ff9aff";
				c.fillText("KLASYFIKACJA: ORGANIZM", 440, 124);
			}
		},
		// 4 · The tactical map: the Swarm's violet stains spreading from Lumeria V world after world.
		(c, t, local, reduced, span) => {
			c.fillStyle = "#04060c";
			c.fillRect(0, 0, W, H);
			c.fillStyle = "rgba(127,231,220,0.08)";
			for (let x = 0; x < W; x += 40) c.fillRect(x, 0, 1, H);
			for (let y = 0; y < H; y += 40) c.fillRect(0, y, W, 1);
			const spread = reduced ? 0.8 : clamp01(local / (span - 1.5));
			let lost = 0;
			WORLDS.forEach(([x, y, name], i) => {
				const d = Math.hypot(x - 230, y - 250) / 600,
					hit = clamp01((spread - d) * 3);
				if (hit > 0) glow(c, x, y, 30 + hit * 70, "#9a3aff", 0.5 * hit);
				if (hit > 0.5) lost++;
				glow(c, x, y, 8, hit > 0.5 ? "#ff7aff" : "#7fe7ff", 0.9);
				c.font = "10px monospace";
				c.fillStyle = hit > 0.5 ? "rgba(255,170,255,0.9)" : "rgba(170,240,230,0.85)";
				c.fillText(name, x + 12, y - 8);
			});
			swarm(c, 230 + spread * 300, 250 - spread * 40, 60 + spread * 140, t, 260);
			c.font = "11px monospace";
			c.fillStyle = "rgba(255,170,255,0.95)";
			c.fillText(`ŚWIATY ZARAŻONE: ${lost}/${WORLDS.length}`, 620, 92);
		},
		// 5 · Varn's call: the commander on the Dominium channel, his flagship behind, the offer typed out.
		(c, t, local, reduced, span) => {
			nebula(c, t, [[700, 200, 340, "#4a1410", 0.5, -1]]);
			stars(c, t, 2, 160, 305, "#ffd6c8");
			capital(c, 560 + local * 6, 260, 1.3, t, true);
			holo(c, "varn", "KMDR ARIS VARN · DOMINIUM", 120, 96, 170, t, reduced, "#c0503a", "#e9a17a");
			const text = burnt() ? "ZAWIESZENIE BRONI · CEL: RÓJ · BEZ POSIŁKÓW" : saved() ? "DŁUG ZA HEFAJSTOS · SOJUSZ · CEL: RÓJ" : "PROPOZYCJA: SOJUSZ · CEL: SERCE ROJU",
				typed = reduced ? 1 : clamp01((local - 1) / (span * 0.5));
			c.font = "11px monospace";
			c.fillStyle = "rgba(255,200,180,0.95)";
			c.fillText(text.slice(0, Math.floor(typed * text.length)), 360, 330);
			c.fillText("KANAŁ SZYFROWANY · DOMINIUM → KOLONIE", 360, 92);
		},
		// 6 · The fleets of both sides over Nivalis, the Swarm closing in.
		PART[2],
		// 7 · The Heart of the Swarm under Pyrrhos, the orbital strike.
		(c, t, local, reduced, span) => PART[3](c, t, local, reduced, span, false),
		// 8 · Lumeria V: the dropship coming down into the glowing thicket among the crawlers, the act's title.
		(c, t, local, reduced, span) => {
			PART[1](c, t, local, reduced, span);
			const down = ease(clamp01(local / (span * 0.5)));
			dropship(c, 250 + down * 20, 40 + down * 250, 1.3, t, 1 - down * 0.8);
			glow(c, 270, 320, 40 + down * 80, "#7fe7ff", down * 0.35);
			const show = reduced ? 1 : clamp01((local - span * 0.45) / 1);
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
	let SPEC = null;
	function prepare(next = {}) {
		choices = { ...next };
		SPEC = { shots: SHOTS, titles, places, captions: captions(), lengths: LENGTHS, tints: [burnt() ? "#a0301a" : "#a0582a", "#6a2a8f", "#6a4a8f", "#8f2a8f", "#a0402a", "#4f6f9f", "#8f2a6a", "#2a8f80"], label: "UJĘCIE PROLOGU AKTU III", alarm: [3, 6], receive: [1, 4] };
		return api;
	}
	function draw(c, time, reduced = false) {
		if (!SPEC) prepare(choices);
		return K.render(c, time, reduced, SPEC);
	}
	const api = {
		draw,
		prepare,
		duration,
		lengths: LENGTHS,
		titles,
		get captions() {
			return SPEC ? SPEC.captions : captions();
		},
	};
	return api;
})();
