/* The finale of the campaign (0.161; retold in 0.170): a full-screen film of about two minutes after the last chapter
   (XIV) that shows what came after the war, in the style of the campaign films (campaign-film.js kit and director),
   shown from the report of chapter XIV and from the campaign menu once XIV is won. Thirteen shots of their own
   lengths (LENGTHS): the Gate breaking at Erebus; the rifts closing over the frontier; the fleet coming home from
   Erebus (with Vok's ships after the truce, past the Admiralty's wrecks after the rout, Varn's frigate if he was
   trusted); Eos from orbit, the docks at work; Lira lighting the beacon of the Silent Station (the dark tower of the
   prologue, lit); Hefajstos (in ashes, or rebuilt by Koss's technicians); the Heart of the Swarm asleep under
   Tessa's watch; the council of the truce (Varn at the table or away, Vok's signature); the frontier's network; the
   people and their fates; the commander's decisions; the convoys under the beacons again; dawn over Eos and the end.
   FinaleFilm.prepare(choices) sets the campaign's decisions (CampaignProgress.choices) before it plays. */
const FinaleFilm = (() => {
	const LENGTHS = [10, 9, 9, 10, 9, 9, 10, 9, 9, 9, 10, 9, 10];
	const duration = LENGTHS.reduce((n, l) => n + l, 0);
	const K = CampaignFilm.kit,
		{ W, H, rnd, clamp01, ease, poly, glow, flare, stars, nebula, planet, capital, freighter, fighter, beam, beacon, tower, station, dropship, eosNight, holoLira } = K;
	const CYAN = "#7fe9ff",
		VIOLET = "#c98cff";
	let choices = {};
	const truce = () => choices.colony13 === "truce",
		rout = () => choices.colony13 === "rout",
		varnTrusted = () => choices.colony8 === "trust" || choices.colony12 === "garrison",
		burnt = () => choices.colony6 === "destroy",
		saved = () => choices.colony6 === "evacuate";

	// The decisions of the campaign, by name (campaign-choices.js, the act III legacy, act IV).
	function decisions() {
		const out = [];
		const named = (id) => {
			const c = choices[id];
			if (!c) return null;
			if (id === "colony6") return RTS.ACT3_LEGACY?.[c]?.name || null;
			return RTS.CAMPAIGN_DECISIONS?.[id]?.options?.[c]?.name || null;
		};
		for (const [id, chapter] of [["colony1", "I"], ["colony3", "III"], ["colony6", "VI"], ["colony8", "VIII"], ["colony12", "XII"], ["colony13", "XIII"]]) {
			const n = named(id);
			if (n) out.push([chapter, n]);
		}
		return out;
	}
	// Who is where after the war, by the decisions.
	function fates() {
		const parts = ["Lira prowadzi sieć latarni pogranicza, dr Tessa bada uśpione artefakty, a kpt. Vale wozi konwoje między światami."];
		if (saved()) parts.push("Koss i technicy z Hefajstosa pracują dla Kolonii.");
		else if (burnt()) parts.push("Koss, który przeżył wybuch Hefajstosa, został z Koloniami — i nie zapomniał tych, którzy nie zdążyli uciec.");
		if (varnTrusted()) parts.push("Varn zasiada w radzie rozejmu.");
		else parts.push("Varn strzeże Nivalis z daleka.");
		if (truce()) parts.push("Adm. Vok dowodzi flotą rozejmu.");
		else if (rout()) parts.push("Admiralicja przeszła do historii.");
		return parts.join(" ");
	}
	const WORLDS = [
		["EOS", 120, 280, "#c69a5c"],
		["VESPER", 230, 140, "#bfe3ff"],
		["NADIR", 330, 300, "#9a8a86"],
		["KHEPRI IV", 450, 130, "#f0c07a"],
		["VULKAN IX", 560, 290, "#ff9a6a"],
		["LUMERIA V", 660, 130, "#8ff0d0"],
		["NIVALIS", 760, 280, "#d5ecff"],
		["PYRRHOS", 860, 150, "#ff7a52"],
	];
	const bigTitle = (c, text, sub, local, reduced, glowColor, y = 120, from = 1.2) => {
		const show = reduced ? 1 : clamp01((local - from) / 1);
		c.save();
		c.globalAlpha = show;
		c.textAlign = "center";
		c.font = "700 40px sans-serif";
		c.shadowColor = glowColor;
		c.shadowBlur = 26;
		c.fillStyle = "#fff6ea";
		c.fillText(text, W / 2, y);
		c.shadowBlur = 0;
		c.font = "12px monospace";
		c.fillStyle = "rgba(255,240,220,0.85)";
		c.fillText(sub, W / 2, y + 26);
		c.restore();
	};
	const label = (c, text, x, y, color = "rgba(160,240,220,0.9)") => {
		c.font = "10px monospace";
		c.fillStyle = color;
		c.fillText(text, x, y);
	};
	// A sigil on the council's table: the Colonies' beacon (a diamond) or the Dominium's triangle.
	function sigil(c, x, y, s, kind, a) {
		c.save();
		c.globalAlpha = a;
		if (kind === "colonies") poly(c, [[x, y - s], [x + s * 0.7, y], [x, y + s], [x - s * 0.7, y]], "rgba(127,231,200,0.6)");
		else poly(c, [[x, y - s], [x + s, y + s * 0.8], [x - s, y + s * 0.8]], "rgba(255,110,90,0.6)");
		glow(c, x, y, s * 2.5, kind === "colonies" ? "#7fe7c8" : "#ff6a5a", 0.4);
		c.restore();
	}

	const SHOTS = [
		// 1 · Erebus: the Gate cracking open and falling into the black hole, the Watchers' light going out.
		(c, t, local, reduced, span) => {
			c.fillStyle = "#020306";
			c.fillRect(0, 0, W, H);
			stars(c, t, 2, 220, 101, "#ffe6cc");
			const crack = reduced ? 0.8 : ease(clamp01((local - 1.5) / (span - 3)));
			if (typeof Act4Film !== "undefined") {
				Act4Film.parts.blackHole(c, 600, 210, 72, t, 1 - crack * 0.85, crack);
				for (let i = 0; i < 5; i++) {
					const fade = 1 - clamp01(crack * 1.6 - i * 0.12);
					if (fade > 0) {
						c.globalAlpha = fade;
						Act4Film.parts.watcher(c, 260 + i * 60, 120 + (i % 2) * 120 + crack * 40, 0.8, t, i);
						c.globalAlpha = 1;
					}
				}
			}
			if (crack > 0.55 && crack < 0.75) glow(c, 420, 250, 260, "#f2fdff", (0.75 - crack) * 4);
			label(c, `BRAMA · INTEGRALNOŚĆ ${Math.max(0, Math.round(100 - crack * 100))}%`, 720, 90, "rgba(190,240,255,0.9)");
		},
		// 2 · The frontier: the rifts closing one after another over its worlds.
		(c, t, local, reduced, span) => {
			c.fillStyle = "#03060c";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[480, 200, 400, "#0a2a3a", 0.45, 0]]);
			stars(c, t, 2, 200, 102, "#d6f4ff");
			const spots = [[160, 200], [330, 120], [480, 260], [640, 150], [800, 240]];
			spots.forEach(([x, y], i) => {
				const open = reduced ? 0.3 : 1 - clamp01((local - 1 - i * ((span - 3) / spots.length)) / 1.2);
				if (open > 0.02 && typeof Act4Film !== "undefined") Act4Film.parts.rift(c, x, y, 70, open, t);
				else {
					glow(c, x, y, 14, "#7fe7c8", 0.6);
					label(c, "ZAMKNIĘTA", x - 26, y + 26);
				}
			});
			label(c, "SZCZELINY NA POGRANICZU · OTWARTE: " + spots.filter((_, i) => !reduced && local < 1 + i * ((span - 3) / spots.length) + 1.2).length, 90, 330, "rgba(190,240,255,0.9)");
		},
		// 3 · Home from Erebus: the fleet at speed, Vok's ships beside it after the truce or the Admiralty's wrecks after the rout.
		(c, t, local) => {
			nebula(c, t, [[600, 120, 300, "#2a2a4a", 0.4, -1], [200, 280, 260, "#1a3a4a", 0.4, 1]]);
			stars(c, t, 26, 220, 103);
			if (rout())
				// The Admiralty's wrecks drifting past, still smouldering.
				for (let i = 0; i < 4; i++) {
					c.save();
					c.translate(980 - ((local * 50 + i * 290) % 1160), 70 + i * 85);
					c.rotate(0.4 + i);
					poly(c, [[-70, 0], [46, -12], [70, 0], [46, 16]], "#5a5450");
					poly(c, [[-70, 0], [46, 16], [70, 0]], "#2a2626");
					glow(c, 10, 0, 34, "#ff6a3a", 0.45 + 0.2 * Math.sin(t * 3 + i));
					c.restore();
				}
			capital(c, 240 + Math.sin(t * 0.4) * 10, 150, 1, t, false);
			capital(c, 120, 250, 0.7, t + 1, false);
			if (truce()) {
				capital(c, 520 + Math.sin(t * 0.4 + 1) * 10, 110, 0.85, t + 2, true);
				capital(c, 470, 300, 0.6, t + 3, true);
			}
			if (varnTrusted()) fighter(c, 400, 200, 1.6, 0, true);
			for (let i = 0; i < 6; i++) fighter(c, 300 + i * 55, 330 - (i % 2) * 14, 0.8, 0, false);
			label(c, truce() ? "FLOTA KOLONII I FLOTA VOK · KURS: EOS" : "FLOTA KOLONII · KURS: EOS", 600, 340, "rgba(190,240,255,0.9)");
		},
		// 4 · Eos from orbit: the fleet over the planet, the docks working, shuttles going down.
		(c, t, local) => {
			nebula(c, t, [[300, 100, 280, "#2a3a5a", 0.4, 1]]);
			stars(c, t, 3, 200, 104);
			planet(c, 480, 560, 400, { base: "#c69a5c", dark: "#2a1c12", atmo: "#ffd29a", light: -1.9, cities: 0.85, t, seed: 104 });
			// The docks: two gantries with a ship in the berth.
			for (const y of [120, 170]) {
				c.fillStyle = "#8c969c";
				c.fillRect(600, y, 260, 5);
				for (let x = 600; x < 860; x += 24) {
					c.fillStyle = "#454d53";
					c.fillRect(x, y - 3, 2, 11);
				}
				glow(c, 600, y, 8, "#ff5a3a", 0.8);
				glow(c, 860, y, 8, "#ff5a3a", 0.8);
			}
			capital(c, 720, 146, 0.55, t, false);
			glow(c, 650, 160, 16, "#9ae8ff", 0.5 + 0.5 * Math.sin(t * 9));
			capital(c, 200 + local * 10, 110, 0.8, t + 1, false);
			for (let i = 0; i < 4; i++) {
				const p = ((local * 0.12 + i * 0.25) % 1);
				dropship(c, 300 + i * 60 + p * 40, 160 + p * 180, 0.5 * (1 - p * 0.5), t, 1 - p);
			}
			label(c, "DOKI EOS · PRACUJĄ PEŁNĄ PARĄ", 600, 210, "rgba(190,240,255,0.9)");
		},
		// 5 · The beacon of Eos: Lira at the Silent Station, the lamp lighting, the light running along the horizon.
		(c, t, local, reduced, span) => {
			eosNight(c, t);
			const lit = reduced ? 1 : ease(clamp01((local - 2.5) / 1.5));
			tower(c, 600, 300, 1.15, lit, t);
			station(c, 470, 302, 1.1, 0.9);
			// Lira, small, by the mast.
			glow(c, 560, 286, 20, "#3fe0d0", 0.4);
			c.fillStyle = "#9ff5e8";
			c.fillRect(556, 272, 7, 18);
			c.beginPath();
			c.arc(559.5, 267, 4.5, 0, Math.PI * 2);
			c.fill();
			// The light passed along the horizon, beacon after beacon.
			for (let i = 0; i < 7; i++) {
				const on = clamp01((local - 4 - i * 0.55) * 2);
				beacon(c, 760 + i * 30 - i * i * 2, 262 - i * 4, 0.4, on, t, i);
				beacon(c, 380 - i * 48, 268 - i * 3, 0.4, on, t, i + 7);
			}
			if (lit > 0.6) flare(c, 600, 300 - 157 * 1.15, (lit - 0.6) * 1.4, "#8dffd0");
		},
		// 6 · Hefajstos: in ashes, a cold ruin, or rebuilt by Koss's technicians, its lights working for the Colonies.
		(c, t, local) => {
			const g = c.createLinearGradient(0, 0, 0, H);
			g.addColorStop(0, "#120808");
			g.addColorStop(1, burnt() ? "#5a3020" : "#4a2a14");
			c.fillStyle = g;
			c.fillRect(0, 0, W, H);
			stars(c, t, 1, 90, 106, "#ffd6c6");
			poly(c, [[0, 300], [W, 290], [W, H], [0, H]], "#1a0c08");
			if (burnt()) {
				// The ruin: broken towers against the glow of the embers, smoke rising, ash falling.
				glow(c, 500, 300, 260, "#ff7a3a", 0.3);
				for (const [x, h, lean] of [[400, 90, -0.1], [470, 60, 0.2], [540, 110, 0.05], [610, 40, -0.3]]) {
					c.save();
					c.translate(x, 300);
					c.rotate(lean);
					poly(c, [[-14, 0], [14, 0], [10, -h], [-8, -h * 0.85]], "#3e302a");
					c.restore();
				}
				for (let i = 0; i < 8; i++) glow(c, 380 + i * 34, 300 - (i % 3) * 4, 10, "#ff8a3a", 0.5 + 0.4 * Math.sin(t * 2 + i));
				for (let i = 0; i < 10; i++) {
					const f = (local * 0.1 + i / 10) % 1;
					c.fillStyle = `rgba(80,70,66,${0.35 * (1 - f)})`;
					c.beginPath();
					c.arc(500 + Math.sin(i * 3 + t * 0.3) * 40 + f * 60, 260 - f * 200, 20 + f * 40, 0, Math.PI * 2);
					c.fill();
				}
				label(c, "HEFAJSTOS · POPIÓŁ", 700, 90, "rgba(255,190,160,0.9)");
			} else {
				// Rebuilt: the complex lit, cranes, shuttles of technicians, a power line going out to the Colonies.
				poly(c, [[380, 300], [420, 200], [540, 200], [580, 300]], "#3a2a26");
				for (let k = 0; k < 8; k++) {
					c.fillStyle = Math.sin(t * 2 + k) > -0.3 ? "#ffd38a" : "#3a2a20";
					c.fillRect(404 + k * 18, 230 + (k % 2) * 30, 7, 5);
				}
				glow(c, 480, 220, 140, "#ffb060", 0.25);
				beam(c, 580, 250, 900, 180, "#8ff0d0", 1.4, 0.5 + 0.3 * Math.sin(t * 3));
				for (let i = 0; i < 3; i++) fighter(c, 300 + ((local * 50 + i * 200) % 600), 150 - i * 20, 0.9, -0.1, false);
				label(c, "HEFAJSTOS · ENERGIA DLA KOLONII", 680, 90, "rgba(255,220,170,0.9)");
			}
		},
		// 7 · The Heart of the Swarm asleep under Pyrrhos, its crystals grey; Tessa's station keeping watch.
		(c, t, local) => {
			const g = c.createLinearGradient(0, 0, 0, H);
			g.addColorStop(0, "#0c0612");
			g.addColorStop(1, "#3a1020");
			c.fillStyle = g;
			c.fillRect(0, 0, W, H);
			stars(c, t, 2, 120, 107, "#ffd6e6");
			poly(c, [[0, 290], [W, 275], [W, H], [0, H]], "#160a0c");
			glow(c, 480, 330, 140, VIOLET, 0.08 + 0.05 * Math.sin(t * 0.8));
			for (let k = 0; k < 7; k++) {
				const x = 380 + k * 34,
					h = 50 + (3 - Math.abs(k - 3)) * 30;
				poly(c, [[x - 12, 300], [x - 7, 300 - h * 0.8], [x, 300 - h], [x + 7, 300 - h * 0.8], [x + 12, 300]], "#3a3440");
			}
			// The research station on the ridge: a dome, a dish turning, a lit window.
			c.fillStyle = "#2a2430";
			c.beginPath();
			c.ellipse(760, 284, 40, 24, 0, Math.PI, Math.PI * 2);
			c.fill();
			c.fillStyle = "#ffd38a";
			c.fillRect(752, 274, 8, 5);
			glow(c, 756, 276, 20, "#ffcc80", 0.5);
			c.save();
			c.translate(790, 252);
			c.rotate(Math.sin(t * 0.5) * 0.5);
			c.strokeStyle = "#8a8090";
			c.lineWidth = 3;
			c.beginPath();
			c.arc(0, 0, 14, Math.PI * 1.1, Math.PI * 1.9);
			c.stroke();
			c.restore();
			const pulse = Math.max(0, Math.sin(t * 0.7)) ** 6;
			label(c, `SERCE ROJU · AKTYWNOŚĆ ${(0.3 + pulse * 1.2).toFixed(1)}% · STACJA DR TESSY`, 90, 90, "rgba(220,190,255,0.9)");
		},
		// 8 · The council of the truce: a holo table with the sigils of the Colonies and the Dominium, the signatures.
		(c, t, local, reduced, span) => {
			c.fillStyle = "#05080e";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[480, 200, 360, "#14243a", 0.5, 0]]);
			c.save();
			c.strokeStyle = "rgba(127,231,220,0.35)";
			c.lineWidth = 1.5;
			c.beginPath();
			c.ellipse(480, 250, 300, 70, 0, 0, Math.PI * 2);
			c.stroke();
			c.restore();
			glow(c, 480, 250, 260, "#3fe0d0", 0.08);
			const seats = [
				["colonies", "WOLNE KOLONIE · LIRA", true],
				["dominion", varnTrusted() ? "DOMINIUM · VARN" : "DOMINIUM · MIEJSCE PUSTE", varnTrusted()],
				["dominion", truce() ? "ADMIRALICJA · VOK" : "ADMIRALICJA · NIE ISTNIEJE", truce()],
			];
			seats.forEach(([kind, name, here], i) => {
				const x = 260 + i * 220,
					a = clamp01((local - 0.8 - i * 1.2) * 1.5);
				sigil(c, x, 230, 22, kind, a * (here ? 1 : 0.25));
				c.globalAlpha = a;
				label(c, name, x - 60, 290, here ? "rgba(220,240,240,0.9)" : "rgba(160,170,170,0.6)");
				c.globalAlpha = 1;
			});
			const signed = reduced ? 1 : clamp01((local - 5) / 2);
			label(c, `ROZEJM POGRANICZA · PODPISY ${Math.round(signed * (1 + (varnTrusted() ? 1 : 0) + (truce() ? 1 : 0)))}/${1 + (varnTrusted() ? 1 : 0) + (truce() ? 1 : 0)}`, 380, 110, "rgba(160,240,220,0.9)");
		},
		// 9 · The frontier at peace: the holo map, the worlds joined by lit routes.
		(c, t, local, reduced, span) => {
			c.fillStyle = "#03060c";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[480, 200, 400, "#0a2a3a", 0.45, 0]]);
			stars(c, t, 2, 200, 109, "#d6f4ff");
			const lit = reduced ? 1 : clamp01(local / (span - 3));
			WORLDS.forEach(([name, x, y, color], i) => {
				if (i) {
					const [, px, py] = WORLDS[i - 1];
					beam(c, px, py, x, y, "#8ff0d0", 1.2, lit > i / WORLDS.length ? 0.7 : 0.08);
				}
				glow(c, x, y, 26, color, 0.6);
				c.fillStyle = color;
				c.beginPath();
				c.arc(x, y, 9, 0, Math.PI * 2);
				c.fill();
				label(c, name, x - 24, y + 26, "rgba(220,240,240,0.85)");
			});
			label(c, "SIEĆ POGRANICZA · WSZYSTKIE ŚWIATY NA ŁĄCZACH", 560, 60);
		},
		// 10 · The people of the frontier.
		(c, t, local) => {
			c.fillStyle = "#050a10";
			c.fillRect(0, 0, W, H);
			nebula(c, t, [[480, 200, 400, "#14243a", 0.5, 0]]);
			const who = ["lira", "tessa", "vale", "koss", "varn"].concat(truce() ? ["vok"] : []),
				size = 120,
				gap = 18,
				x0 = (W - who.length * size - (who.length - 1) * gap) / 2;
			who.forEach((w, i) => {
				const appear = clamp01((local - i * 0.6) * 2);
				if (appear <= 0) return;
				c.save();
				c.globalAlpha = appear;
				if (typeof Portraits !== "undefined") Portraits.draw(c, w, x0 + i * (size + gap), 110, size, t, 0);
				c.font = "11px monospace";
				c.fillStyle = "rgba(220,240,240,0.9)";
				c.textAlign = "center";
				c.fillText((RTS.ACT2_SPEAKERS?.[w]?.name || w).toUpperCase(), x0 + i * (size + gap) + size / 2, 110 + size + 20);
				c.restore();
			});
		},
		// 11 · The commander's log: the decisions of the campaign, typed out.
		(c, t, local) => {
			c.fillStyle = "#04080c";
			c.fillRect(0, 0, W, H);
			stars(c, t, 2, 120, 111, "#d6f4ff");
			const list = decisions();
			label(c, "DZIENNIK DOWÓDCY · DECYZJE KAMPANII", 300, 92);
			c.font = "15px monospace";
			(list.length ? list : [["—", "Bez zapisanych decyzji"]]).forEach(([chapter, name], i) => {
				const show = clamp01((local - 0.6 - i * 0.9) * 3);
				if (show <= 0) return;
				c.globalAlpha = show;
				c.fillStyle = "#8ff0d0";
				c.fillText(`ROZDZIAŁ ${chapter}`, 300, 130 + i * 28);
				c.fillStyle = "#e8f2f0";
				c.fillText(name, 460, 130 + i * 28);
				c.globalAlpha = 1;
			});
		},
		// 12 · The routes again: Vale's convoy under the lit beacons, as in the prologue.
		(c, t, local) => {
			nebula(c, t, [[220, 120, 260, "#2a5a7a", 0.5, 2], [760, 90, 220, "#3b2e6a", 0.35, -1.5]]);
			stars(c, t, 6, 220, 112);
			planet(c, 720, 330, 210, { base: "#4f8a93", atmo: "#8fe9ff", light: -2.3, cities: 0.8, rings: "#bfe3e8", t, seed: 3 });
			const chain = Array.from({ length: 7 }, (_, i) => [200 + i * 100, 170 + Math.sin(i * 1.1) * 40]);
			chain.forEach(([x, y], i) => beacon(c, x, y, 0.9, 1, t, i));
			const k = (t * 1.6) % (chain.length - 1),
				i0 = Math.floor(k),
				f = k - i0,
				[ax, ay] = chain[i0],
				[bx, by] = chain[i0 + 1];
			glow(c, ax + (bx - ax) * f, ay + (by - ay) * f, 18, "#c9fff0", 0.9);
			for (let i = 0; i < 7; i++) freighter(c, 40 + i * 110 + local * 30, 270 + (i % 2) * 26 - i * 4, 0.85 - i * 0.04, t, i);
			capital(c, 230 + local * 12, 100, 0.7, t, false);
			label(c, "KPT. VALE · KONWÓJ 112 · SZLAK OTWARTY", 90, 330, "rgba(190,240,255,0.9)");
		},
		// 13 · The end: dawn over the basin of Eos, the beacon lit, the fleets home, the title.
		(c, t, local, reduced) => {
			const rise = ease(clamp01(local / 4));
			eosNight(c, t, 0.6 + rise * 0.4);
			glow(c, 480, 300 - rise * 40, 420, "#ffb46a", 0.3 + rise * 0.3);
			flare(c, 480, 300 - rise * 40, 0.5 + rise * 0.5, "#ffcf8a");
			tower(c, 760, 330, 1.2, 1, t);
			station(c, 640, 332, 1.2, 0.8);
			capital(c, 120 + local * 14, 90, 0.6, t, false);
			if (truce() || varnTrusted()) capital(c, 330 + local * 14, 70, 0.5, t + 1, true);
			bigTitle(c, "POGRANICZE GALAKTYKI", "K O N I E C   K A M P A N I I", local, reduced, "rgba(255,200,130,0.9)", 130, 1.5);
			if (local > 4 || reduced) {
				c.save();
				c.textAlign = "center";
				c.font = "12px monospace";
				c.fillStyle = "rgba(255,240,220,0.8)";
				c.fillText("Dziękujemy za grę, dowódco.", W / 2, 186);
				c.restore();
			}
		},
	];
	const titles = ["BRAMA GAŚNIE", "SZCZELINY SIĘ ZAMYKAJĄ", "POWRÓT Z EREBUSA", "EOS", "LATARNIA", "HEFAJSTOS", "SERCE ROJU", "RADA ROZEJMU", "SIEĆ POGRANICZA", "LUDZIE POGRANICZA", "TWOJE DECYZJE", "SZLAKI", "KONIEC KAMPANII"];
	const places = ["EREBUS · HORYZONT ZDARZEŃ", "POGRANICZE · SIEĆ SZCZELIN", "PRZESTRZEŃ MIĘDZY ŚWIATAMI", "EOS · ORBITA", "EOS · STACJA CISZY", "VULKAN IX · HEFAJSTOS", "PYRRHOS · SERCE ROJU", "NIVALIS · RADA ROZEJMU", "SEKTOR 07 · SIEĆ LATARNI", "SEKTOR 07", "DZIENNIK DOWÓDCY", "SEKTOR 07 · KORYTARZ HELION", "EOS · ŚWIT"];
	function captions() {
		return [
			"Przy horyzoncie zdarzeń Erebusa Brama pękła i runęła w ciemność. Światło Wartowników zgasło, a Głos Bramy umilkł w pół słowa.",
			"Na całym pograniczu szczeliny zamykały się jedna po drugiej. Artefakty, które odpowiadały na nieznany sygnał, zamilkły na dobre.",
			(truce() ? "Flota Kolonii wracała z Erebusa razem z okrętami Vok — Admiralicja dotrzymała rozejmu." : rout() ? "Flota Kolonii wracała z Erebusa między wrakami Admiralicji. Nikt już nie zamykał jej drogi." : "Flota Kolonii wracała z Erebusa do domu.") +
				(varnTrusted() ? " Fregata Varna leciała obok." : ""),
			"Nad Eos, gdzie wszystko się zaczęło, flota wróciła do domu. Doki Kolonii znów pracowały pełną parą.",
			"Lira wróciła do Stacji Ciszy i zapaliła latarnię. Od niej światło pobiegło dalej — latarnia po latarni, przez całe pogranicze.",
			burnt()
				? "Hefajstos został popiołem na Vulkanie IX. Cena świtu nie zniknęła z pamięci — ale na popiele nikt już nie budował blokady."
				: saved()
					? "Technicy Kossa odbudowali Hefajstos. Kompleks, który wysysał energię planety, dziś zasila Kolonie."
					: "Na Vulkanie IX dymiły ruiny kompleksu Hefajstos — cena świtu, której nikt nie zapomniał.",
			"Serce Roju spało pod magmą Pyrrhosa. Dr Tessa została na jego skraju, by pilnować, żeby już się nie obudziło.",
			(varnTrusted() ? "Na Nivalis zebrała się rada rozejmu. Varn usiadł przy jednym stole z Lirą." : "Na Nivalis zebrała się rada rozejmu. Miejsce Varna zostało puste — patrzył z daleka.") +
				(truce() ? " Adm. Vok podpisała pokój, którego kiedyś nie uznała." : rout() ? " Admiralicji nie było już przy stole." : ""),
			"Osiem światów, jedna sieć. Pogranicze, które miało zostać odcięte, łączy się dziś po raz pierwszy od pokoleń.",
			fates(),
			"Każdy rozkaz miał swoją cenę. Oto decyzje, które ukształtowały pogranicze.",
			"Kpt. Vale znów prowadzi konwoje między wolnymi światami. Każdy sygnał latarni oznacza bezpieczny powrót.",
			"Nad Eos wstaje świt, a latarnia Stacji Ciszy świeci. Pogranicze Galaktyki należy do tych, którzy go bronili. Koniec kampanii.",
		];
	}
	let SPEC = null;
	function prepare(next = {}) {
		choices = { ...next };
		SPEC = {
			shots: SHOTS,
			titles,
			places,
			captions: captions(),
			lengths: LENGTHS,
			tints: ["#1f6f8f", "#2a6f8f", "#2a4a6f", "#a06a2a", "#2a8f80", burnt() ? "#6f3a2a" : "#a0602a", "#6a2a8f", "#2a6f8f", "#2a8f80", "#4f6f9f", "#2a6f8f", "#2a6f8f", "#a06a2a"],
			label: "FINAŁ KAMPANII",
			alarm: [],
			receive: [7, 8],
		};
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
			if (!SPEC) prepare(choices);
			return SPEC.captions;
		},
	};
	return api;
})();
if (typeof window !== "undefined") window.FinaleFilm = FinaleFilm;
