/* Act IV prologue "Inwazja" (H6, 0.159; retold in 0.171 as a story of about 75 seconds leading to chapter X), in
   the style of the campaign films (campaign-film.js — its kit and director). Eight shots of their own lengths
   (LENGTHS): the truce over the silent Pyrrhos (a joint command or each side its own way, as the act III decision
   made it); Adm. Selen Vok of the Admiralty refusing it; her fleet closing the orbit of Eos; an artefact on the orbit
   answering an unknown signal; a rift opening and the Watchers of the Abyss coming through; the Watchers firing on
   both sides; the Gate at the black hole Erebus; the Colonies' fleet gathering to break the blockade — the act's
   title. Act4Film.prepare(choices) sets the campaign's decisions (CampaignProgress.choices) before it plays. Its
   pieces (a Watcher, a rift, the black hole with the Gate) serve the finale and the act's epilogue too. */
const Act4Film = (() => {
	const LENGTHS = [9, 9, 10, 9, 10, 9, 10, 10];
	const duration = LENGTHS.reduce((n, l) => n + l, 0);
	let choices = {};
	const joint = () => choices.colony8 === "trust",
		apart = () => choices.colony8 === "distance";
	const titles = ["ROZEJM", "ADMIRALICJA", "BLOKADA EOS", "SYGNAŁ", "SZCZELINY", "WARTOWNICY", "BRAMA", "AKT IV · INWAZJA"];
	const captions = () => [
		joint()
			? "Serce Roju ucichło. Wspólne dowództwo z Varnem przetrwało bitwę o Pyrrhos, a Dominium podpisało rozejm z Koloniami."
			: apart()
				? "Serce Roju ucichło. Kolonie i Dominium, każde własną drogą, podpisały nad Pyrrhosem rozejm."
				: "Serce Roju ucichło. Nad Pyrrhosem komandor Varn i Kolonie podpisali rozejm.",
		"Ale Admiralicja Dominium nie uznała rozejmu. Adm. Selen Vok nazwała Varna zdrajcą, a Kolonie — celem.",
		"Jej flota zamknęła orbitę Eos, zajęła doki stoczni i odcięła Kolonie od pogranicza.",
		"Artefakty milczały od upadku Serca Roju. Teraz jeden z nich odpowiada — na sygnał, którego nikt nie zna.",
		"Nad światami pogranicza otwierają się szczeliny. Przychodzą przez nie Wartownicy Otchłani.",
		"Maszyny z białego kamienia i światła nie odróżniają Kolonii od Dominium. Strzelają do wszystkich.",
		"Wszystkie szczeliny prowadzą do Bramy przy czarnej dziurze Erebus. Tam rozstrzygnie się ta wojna.",
		"Najpierw jednak Eos. Ocalała flota Kolonii zbiera się, by przełamać blokadę.",
	];
	// Voices (0.171.9): Vok refusing the truce, Lira as the fleet gathers.
	const lines = {
		1: ["vok", "Rozejm Varna nie obowiązuje Admiralicji. Orbita Eos zostaje zamknięta."],
		7: ["lira", "Flota gotowa, dowódco. Przełammy blokadę Eos."],
	};
	const places = ["PYRRHOS · ORBITA", "KANAŁ ADMIRALICJI · SZYFR VOK", "EOS · ORBITA", "EOS · ARTEFAKT NA ORBICIE", "POGRANICZE · SZCZELINA", "NIVALIS · ORBITA", "EREBUS · HORYZONT ZDARZEŃ", "EOS · PUNKT ZBORNY FLOTY"];
	const K = CampaignFilm.kit,
		{ W, H, rnd, clamp01, ease, poly, glow, flare, stars, nebula, planet, capital, fighter, beam, trail, holo } = K;
	const CYAN = "#7fe9ff";

	// A Watcher: a white diamond hovering, a seam and a core of light.
	function watcher(c, x, y, s, t, i) {
		const bob = Math.sin(t * 2 + i) * 3 * s;
		glow(c, x, y + bob, 26 * s, CYAN, 0.35);
		poly(c, [[x, y + bob - 16 * s], [x - 11 * s, y + bob], [x, y + bob + 13 * s], [x, y + bob]], "#e9eef1");
		poly(c, [[x, y + bob - 16 * s], [x + 11 * s, y + bob], [x, y + bob + 13 * s], [x, y + bob]], "#b9c4cc");
		c.fillStyle = "#e6fcff";
		c.fillRect(x - 8 * s, y + bob - 0.6 * s, 16 * s, 1.4 * s);
	}
	// A rift: a vertical slit of light opening (open 0…1).
	function rift(c, x, y, h, open, t) {
		const w = 4 + open * 26;
		glow(c, x, y, h * 0.9 * open + 10, CYAN, 0.35 * open);
		poly(c, [[x, y - h * open], [x + w, y], [x, y + h * open], [x - w, y]], "rgba(127,233,255,0.45)");
		poly(c, [[x, y - h * open * 0.9], [x + w * 0.35, y], [x, y + h * open * 0.9], [x - w * 0.35, y]], "#f2fdff");
		for (let k = 0; k < 6; k++) {
			const a = t * 0.8 + k;
			c.strokeStyle = `rgba(127,233,255,${0.3 * open})`;
			c.beginPath();
			c.ellipse(x, y, (30 + k * 18) * open, (8 + k * 5) * open, 0, a, a + 1.2);
			c.stroke();
		}
	}
	// The black hole with its accretion disk and the Gate: a ring of white stone round a cyan core (gate 0…1, broken > 0 cracks it).
	function blackHole(c, x, y, r, t, gate = 1, broken = 0) {
		glow(c, x, y, r * 3, "#ff8a3a", 0.25);
		c.save();
		c.translate(x, y);
		for (let k = 0; k < 3; k++) {
			c.strokeStyle = k === 1 ? "rgba(255,230,180,0.9)" : "rgba(255,140,60,0.6)";
			c.lineWidth = r * (0.18 - k * 0.04);
			c.beginPath();
			c.ellipse(0, 0, r * (2.1 + k * 0.25), r * 0.28, -0.08, 0, Math.PI * 2);
			c.stroke();
		}
		c.fillStyle = "#000";
		c.beginPath();
		c.arc(0, 0, r, 0, Math.PI * 2);
		c.fill();
		c.strokeStyle = "rgba(255,220,170,0.9)";
		c.lineWidth = 2;
		c.beginPath();
		c.arc(0, 0, r * 1.03, 0, Math.PI * 2);
		c.stroke();
		// The near half of the disk in front of the shadow.
		c.strokeStyle = "rgba(255,200,140,0.85)";
		c.lineWidth = r * 0.12;
		c.beginPath();
		c.ellipse(0, 0, r * 2.1, r * 0.28, -0.08, 0, Math.PI);
		c.stroke();
		c.restore();
		if (gate <= 0) return;
		// The Gate in front of it.
		const gx = x - r * 2.4,
			gy = y + r * 0.6;
		glow(c, gx, gy, r * 0.9, CYAN, 0.45 * gate * (1 - broken));
		c.save();
		c.translate(gx, gy);
		c.rotate(broken * 0.4);
		c.globalAlpha = gate;
		for (let k = 0; k < 8; k++) {
			const a = (k / 8) * Math.PI * 2 + t * 0.2,
				d = r * 0.55 + broken * k * 9;
			c.save();
			c.translate(Math.cos(a) * d, Math.sin(a) * d * 0.8);
			c.rotate(a);
			poly(c, [[-6, -10], [6, -10], [4, 10], [-4, 10]], k % 2 ? "#e9eef1" : "#b9c4cc");
			c.restore();
		}
		glow(c, 0, 0, r * 0.3, "#f2fdff", 0.8 * (1 - broken));
		c.restore();
	}

	// The shots of the first prologue, now parts of the story.
	const PART = [
		// Eos: the Admiralty's line across the orbit, Vok's flagship in front, fighters on patrol.
		(c, t, local) => {
			nebula(c, t, [[700, 120, 300, "#4a1a1a", 0.45, 1], [200, 260, 260, "#1a2a4a", 0.4, -1]]);
			stars(c, t, 5, 200, 71);
			planet(c, 300, 500, 340, { base: "#c69a5c", dark: "#2a1c12", atmo: "#ffd29a", light: -1.2, cities: 0.5, t, seed: 71 });
			for (let i = 0; i < 4; i++) capital(c, 560 + i * 90 - local * 10, 120 + i * 50, 0.6 + i * 0.05, t, true);
			capital(c, 760 - local * 16, 260, 1.1, t, true);
			for (let i = 0; i < 6; i++) fighter(c, 420 + i * 70 - local * 30, 210 + (i % 3) * 24, 0.8, 0, true);
			c.font = "11px monospace";
			c.fillStyle = "rgba(255,170,150,0.9)";
			c.fillText("ORBITA EOS · ZAMKNIĘTA · ADM. S. VOK", 600, 92);
		},
		// The artefact on the orbit: a crystal turning, rings of an answer spreading towards an unknown source.
		(c, t, local, reduced, span = 5) => {
			c.fillStyle = "#03060c";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[480, 200, 360, "#0a2a3a", 0.5, 0]]);
			stars(c, t, 2, 220, 72, "#d6f4ff");
			const pulse = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.1)), 5);
			glow(c, 360, 220, 60 + pulse * 40, CYAN, 0.5 + pulse * 0.4);
			poly(c, [[360, 170], [384, 220], [360, 270], [336, 220]], "#bfe9f2");
			poly(c, [[360, 170], [384, 220], [360, 270], [360, 220]], "#7fb8c8");
			for (let k = 0; k < 5; k++) {
				const f = (local * 0.4 + k * 0.2) % 1;
				c.strokeStyle = `rgba(127,233,255,${0.5 * (1 - f)})`;
				c.lineWidth = 2;
				c.beginPath();
				c.arc(360, 220, 30 + f * 420, -0.5, 0.5);
				c.stroke();
			}
			c.font = "11px monospace";
			c.fillStyle = "rgba(190,240,255,0.9)";
			c.fillText(`ODPOWIEDŹ ARTEFAKTU · ŹRÓDŁO: ${local > span * 0.5 ? "EREBUS?" : "NIEZNANE"}`, 560, 92);
		},
		// A rift opening over a frontier world, the Watchers coming through.
		(c, t, local, reduced, span = 5) => {
			nebula(c, t, [[480, 160, 340, "#0a2a3a", 0.5, 0], [800, 300, 260, "#1a1a3a", 0.4, 1]]);
			stars(c, t, 4, 200, 73);
			planet(c, 140, 480, 260, { base: "#d9e8f0", dark: "#2a3a50", atmo: "#bfe6ff", light: -0.8, t, seed: 73 });
			const open = ease(clamp01(local / (span * 0.3)));
			rift(c, 560, 200, 150, open, t);
			for (let i = 0; i < 7; i++) {
				const out = clamp01((local - span * (0.28 + i * 0.06)) / (span * 0.3));
				if (out > 0) watcher(c, 560 - out * (120 + i * 40) + (i % 2) * 30, 200 + (i - 3) * 30 * out, 1 + out * 0.3, t, i);
			}
		},
		// Erebus: the black hole and the Gate (and the act's title, when asked).
		(c, t, local, reduced, span = 5, withTitle = true) => {
			c.fillStyle = "#020306";
			c.fillRect(0, 0, W, H);
			stars(c, t, 3, 220, 74, "#ffe6cc");
			blackHole(c, 600, 210, 70 + local * 2, t, 1, 0);
			if (!withTitle) return;
			const show = reduced ? 1 : clamp01((local - 2.6) / 0.9);
			c.save();
			c.globalAlpha = show;
			c.textAlign = "center";
			c.font = "700 40px sans-serif";
			c.shadowColor = "rgba(127,233,255,0.95)";
			c.shadowBlur = 26;
			c.fillStyle = "#eefcff";
			c.fillText("INWAZJA", W / 2, 110);
			c.shadowBlur = 0;
			c.font = "12px monospace";
			c.fillStyle = "rgba(200,240,255,0.85)";
			c.fillText("A K T   I V", W / 2, 134);
			c.restore();
		},
	];
	// The title of the act (the last shot).
	function title(c, local, reduced, span) {
		const show = reduced ? 1 : clamp01((local - span * 0.45) / 1);
		c.save();
		c.globalAlpha = show;
		c.textAlign = "center";
		c.font = "700 40px sans-serif";
		c.shadowColor = "rgba(127,233,255,0.95)";
		c.shadowBlur = 26;
		c.fillStyle = "#eefcff";
		c.fillText("INWAZJA", W / 2, 110);
		c.shadowBlur = 0;
		c.font = "12px monospace";
		c.fillStyle = "rgba(200,240,255,0.85)";
		c.fillText("A K T   I V", W / 2, 134);
		c.restore();
	}

	const SHOTS = [
		// 1 · The truce over Pyrrhos: the Heart gone dark under the crust, the flagships of both sides side by side,
		// a line of light between them as the truce is signed (one command, or each its own way).
		(c, t, local, reduced, span) => {
			nebula(c, t, [[300, 120, 300, "#3a1a3a", 0.4, 1], [760, 220, 280, "#4a1a10", 0.4, -1]]);
			stars(c, t, 3, 200, 401, "#ffe0e6");
			planet(c, 480, 520, 330, { base: "#5a1a10", dark: "#140604", atmo: "#ff7a4a", light: -1.6, t, seed: 401 });
			glow(c, 480, 230, 90, "#9a3aff", 0.3 * (1 - clamp01(local / 4)));
			const meet = ease(clamp01(local / (span * 0.45)));
			capital(c, 140 + meet * 120, 120, 0.75, t, false);
			capital(c, 560 + meet * 60, 220, 0.75, t, true);
			const sign = clamp01((local - span * 0.45) / 1.5);
			if (sign > 0) {
				beam(c, 330, 125, 590, 215, joint() ? "#ffe0a0" : "#bfefff", 2, sign * (0.6 + 0.2 * Math.sin(t * 4)));
				glow(c, 460, 170, 30, "#ffffff", sign * 0.6);
			}
			c.font = "11px monospace";
			c.fillStyle = "rgba(230,230,255,0.9)";
			c.textAlign = "center";
			c.fillText(sign >= 1 ? (joint() ? "ROZEJM · WSPÓLNE DOWÓDZTWO" : "ROZEJM · KOLONIE — DOMINIUM") : "SERCE ROJU: BRAK SYGNAŁU", W / 2, 92);
			c.textAlign = "left";
		},
		// 2 · Adm. Selen Vok on the Admiralty's channel refusing the truce, the order typed out.
		(c, t, local, reduced, span) => {
			c.fillStyle = "#0c0406";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[300, 200, 340, "#4a1010", 0.5, 1]]);
			stars(c, t, 1, 120, 402, "#ffd0c8");
			for (let i = 0; i < 3; i++) capital(c, 120 + i * 60 + local * 4, 120 + i * 80, 0.7, t, true);
			holo(c, "vok", "ADM. SELEN VOK · ADMIRALICJA", 660, 96, 170, t, reduced, "#c03a2a", "#ff8f7a");
			const lines = ["ROZEJM VARNA: NIEWAŻNY", "KMDR VARN: ZDRAJCA", "ROZKAZ: BLOKADA EOS"],
				typed = reduced ? 1 : clamp01((local - 1) / (span * 0.6));
			c.font = "12px monospace";
			c.fillStyle = "rgba(255,170,150,0.95)";
			lines.forEach((text, i) => {
				const own = clamp01(typed * 3 - i);
				c.fillText(text.slice(0, Math.floor(own * text.length)), 360, 250 + i * 20);
			});
			c.fillText("PRIORYTET: ALFA · ADMIRALICJA DOMINIUM", 360, 92);
		},
		// 3 · The Admiralty's fleet closing the orbit of Eos.
		PART[0],
		// 4 · The artefact on the orbit answering an unknown signal.
		PART[1],
		// 5 · A rift opening, the Watchers coming through.
		PART[2],
		// 6 · The Watchers firing on both sides: a Colonies' cruiser and a Dominium destroyer hit over Nivalis.
		(c, t, local, reduced, span) => {
			nebula(c, t, [[480, 160, 340, "#0a2a3a", 0.5, 0]]);
			stars(c, t, 4, 200, 406);
			planet(c, 820, 480, 260, { base: "#d9e8f0", dark: "#2a3a50", atmo: "#bfe6ff", light: -2.2, t, seed: 406 });
			capital(c, 170 - local * 4, 140, 0.9, t, false);
			capital(c, 230 - local * 4, 280, 0.9, t, true);
			const pts = [[560, 120], [620, 200], [580, 290], [690, 150], [700, 260]];
			pts.forEach(([x, y], i) => {
				watcher(c, x - local * 8, y, 1.2, t, i);
				const fire = Math.max(0, Math.sin(t * 2.2 + i * 1.7));
				if (fire > 0.6) {
					const [tx, ty] = i % 2 ? [230 - local * 4, 280] : [170 - local * 4, 140];
					beam(c, x - local * 8, y, tx + 40, ty, CYAN, 2, (fire - 0.6) * 2.5);
					glow(c, tx + 40, ty, 26, "#f2fdff", (fire - 0.6) * 2);
				}
			});
			c.font = "11px monospace";
			c.fillStyle = "rgba(190,240,255,0.9)";
			c.fillText("CELE WARTOWNIKÓW: KOLONIE · DOMINIUM", 600, 92);
		},
		// 7 · The Gate at the black hole Erebus.
		(c, t, local, reduced, span) => PART[3](c, t, local, reduced, span, false),
		// 8 · Over Eos: the Colonies' fleet gathering one ship after another, the blockade's red lights ahead; the title.
		(c, t, local, reduced, span) => {
			nebula(c, t, [[700, 120, 300, "#4a1a1a", 0.4, 1], [220, 220, 280, "#1a3a4a", 0.45, -1]]);
			stars(c, t, 4, 200, 408);
			planet(c, 640, 520, 330, { base: "#c69a5c", dark: "#2a1c12", atmo: "#ffd29a", light: -2.4, cities: 0.4, t, seed: 71 });
			// The blockade far ahead: red running lights in a line.
			for (let i = 0; i < 9; i++) glow(c, 640 + i * 34, 200 + Math.sin(i) * 12, 6, "#ff5a4a", 0.6 + 0.4 * Math.sin(t * 2 + i));
			// The fleet arriving out of jump, one by one.
			for (let i = 0; i < 5; i++) {
				const p = ease(clamp01((local - i * 0.9) / 2.2));
				if (p <= 0) continue;
				const x = 40 + (i % 2) * 150 + p * 80,
					y = 120 + i * 44;
				if (p < 1) trail(c, x - 60, y, 220 * (1 - p), 4, "#bfefff");
				capital(c, x, y, 0.6 + (i === 2 ? 0.2 : 0), t, false);
			}
			for (let i = 0; i < 8; i++) fighter(c, 120 + i * 40 + clamp01((local - 4) / 3) * 80, 320 + (i % 2) * 14, 0.7, 0, false);
			title(c, local, reduced, span);
		},
	];
	let SPEC = null;
	function prepare(next = {}) {
		choices = { ...next };
		SPEC = { shots: SHOTS, titles, places, captions: captions(), lengths: LENGTHS, tints: ["#6a2a6a", "#8f2a2a", "#8f2a2a", "#2a6f8f", "#1f6f8f", "#1f6f8f", "#8f5a2a", "#2a6f8f"], label: "UJĘCIE PROLOGU AKTU IV", alarm: [2, 5], receive: [1, 3] };
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
		parts: { watcher, rift, blackHole },
		lines,
	};
	return api;
})();
if (typeof window !== "undefined") window.Act4Film = Act4Film;
