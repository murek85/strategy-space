/* Endings of the campaign's acts: a 20-second epilogue film on the report after the act's last chapter, in the
   style of the prologues (campaign-film.js kit and director). The story's decisions change the shots:
   - act I (chapter III): the citadel of Nadir falls, Lira restarts the network and the beacons light one by
     one, the cities of Khepri IV light up again, the relief convoys fly into the dawn;
   - act II (chapter VI): the Hefajstos complex blows up (destroy) or powers down as the technicians are flown
     out (evacuate), Vulkan IX afterwards, the first pulse of an artefact in Lira's lab, the end of the act;
   - act III (chapter IX): the Heart of the Swarm cracks and goes dark, the artefacts fall silent, the fleets of
     the Colonies and the Dominium fly together (trust) or part their ways (distance), a common dawn. */
const Epilogues = (() => {
	const K = () => CampaignFilm.kit;
	const VIOLET = "#c98cff";

	// ---------- pieces ----------
	function citadel(c, k, x, y, s, t, fall) {
		const { poly, glow, rnd } = k;
		c.save();
		c.translate(x, y + fall * 60 * s);
		c.rotate(fall * 0.08);
		c.scale(s, s);
		poly(c, [[-120, 0], [-90, -110], [-40, -150], [40, -150], [90, -110], [120, 0]], "#2e2a2c");
		poly(c, [[-40, -150], [-20, -230], [20, -230], [40, -150]], "#3c3638");
		c.fillStyle = "#ff9a6a";
		for (let i = 0; i < 24; i++) if (rnd(i + 7) > 0.4 + fall * 0.5) c.fillRect(-90 + (i % 12) * 15, -100 + Math.floor(i / 12) * 40, 5, 2.5);
		c.restore();
		// Fires and blasts on the falling citadel.
		for (let i = 0; i < 5; i++) {
			const f = (t * 0.9 + rnd(i)) % 1;
			glow(c, x + (rnd(i * 3) - 0.5) * 200 * s, y - rnd(i * 5) * 180 * s, (30 + f * 50) * s, "#ffb060", (1 - f) * fall);
		}
	}
	function crystal(c, k, x, y, h, w, tilt, light) {
		const { poly, glow } = k;
		c.save();
		c.translate(x, y);
		c.rotate(tilt);
		poly(c, [[-w, 0], [-w * 0.6, -h * 0.8], [0, -h], [w * 0.6, -h * 0.8], [w, 0]], "#5a3a8a");
		poly(c, [[0, -h], [w * 0.6, -h * 0.8], [w, 0], [0, 0]], "#8a5ac0");
		c.restore();
		glow(c, x, y - h * 0.5, h, VIOLET, light);
	}
	// The complex of Hefajstos (as in the act II prologue): power 0…1 lights it.
	function complex(c, k, power, t) {
		const { poly, glow, rnd } = k;
		glow(c, 480, 210, 300, "#ff5a20", 0.35 * power);
		const tiers = [
			[[340, 300], [380, 200], [420, 160], [540, 160], [580, 200], [620, 300]],
			[[400, 160], [430, 90], [530, 90], [560, 160]],
			[[455, 90], [470, 40], [490, 40], [505, 90]],
		];
		tiers.forEach((pts, i) => poly(c, pts, ["#3a2620", "#4a3028", "#5a3a30"][i]));
		c.fillStyle = "#ffc080";
		for (let i = 0; i < 40; i++) if (rnd(i + 3) > 1 - power * 0.7) c.fillRect(372 + (i % 20) * 11, 200 + Math.floor(i / 20) * 36 + (i % 3), 5, 2.5);
		glow(c, 480, 150, 100 * power + 10, "#ff7a2a", 0.6 * power);
		glow(c, 480, 150, 26 * power + 4, "#fff0c0", power);
	}
	function lavaGround(c, k, heat) {
		const { poly } = k;
		poly(c, [[0, 300], [960, 285], [960, 400], [0, 400]], "#1a0f0c");
		c.save();
		c.globalCompositeOperation = "lighter";
		for (let i = 0; i < 3; i++) {
			c.strokeStyle = ["#ff5a1a", "#ff8a2a", "#ffc060"][i];
			c.lineWidth = [7, 3.5, 1.2][i];
			c.globalAlpha = [0.4, 0.7, 0.9][i] * heat;
			for (const dir of [-1, 1]) {
				c.beginPath();
				for (let x = 0; x < 480; x += 12) {
					const px = 480 + dir * x,
						py = 300 + x * 0.18 + Math.sin(x * 0.04 + dir) * 10;
					x ? c.lineTo(px, py) : c.moveTo(px, py);
				}
				c.stroke();
			}
		}
		c.restore();
	}
	function sky(c, k, top, mid, bottom) {
		const g = c.createLinearGradient(0, 0, 0, k.H);
		g.addColorStop(0, top);
		g.addColorStop(0.65, mid);
		g.addColorStop(1, bottom);
		c.fillStyle = g;
		c.fillRect(0, 0, k.W, k.H);
	}
	function bigTitle(c, k, text, sub, local, reduced, glowColor, y = 130) {
		const show = reduced ? 1 : k.clamp01((local - 1.8) / 1);
		c.save();
		c.globalAlpha = show;
		c.textAlign = "center";
		c.font = "700 40px sans-serif";
		c.shadowColor = glowColor;
		c.shadowBlur = 26;
		c.fillStyle = "#fff6ea";
		c.fillText(text, k.W / 2, y);
		c.shadowBlur = 0;
		c.font = "12px monospace";
		c.fillStyle = "rgba(255,240,220,0.85)";
		c.fillText(sub, k.W / 2, y + 26);
		c.restore();
	}

	// ---------- the films ----------
	const FILMS = {
		// Act I: Odzyskany Świt.
		colony3: () => {
			const k = K();
			const { W, H, rnd, clamp01, ease, stars, nebula, planet, beacon, freighter, capital, flare, glow } = k;
			return {
				titles: ["CYTADELA PADA", "SIEĆ LATARNI", "ŚWIATŁA WRACAJĄ", "KONIEC AKTU I"],
				places: ["NADIR · CYTADELA WĘZŁA", "SEKTOR 07 · SIEĆ: URUCHAMIANIE", "KHEPRI IV · STRONA NOCNA", "SEKTOR 07 · ŚWIT"],
				captions: [
					"Cytadela Węzła pada. Ostatni bastion blokady milknie nad Nadirem.",
					"Lira wprowadza klucz z Vesperu. Latarnie zapalają się jedna po drugiej, od Nadiru po Eos.",
					"Na Khepri IV wraca prąd. Miasta, które przez miesiące tonęły w ciemności, znów świecą.",
					"Transporty pomocy ruszają ku Koloniom. Nadszedł Odzyskany Świt.",
				],
				tints: ["#8f4a2a", "#2a8f80", "#2a5f8f", "#a06a2a"],
				shots: [
					(c, t, local) => {
						sky(c, k, "#120c10", "#3a2018", "#6a3018");
						stars(c, t, 1, 80, 51);
						citadel(c, k, 480, 320, 1, t, ease(clamp01((local - 0.8) / 3)));
						for (let i = 0; i < 4; i++) {
							const f = (t * 0.7 + i * 0.3) % 1;
							glow(c, 300 + i * 120, 300 - f * 40, 40 + f * 60, "#ffb060", (1 - f) * 0.8);
						}
						for (let i = 0; i < 5; i++) k.fighter(c, 80 + i * 60 + local * 50, 120 + i * 18, 1, -0.05, false);
					},
					(c, t, local) => {
						nebula(c, t, [[300, 160, 320, "#1f4a5a", 0.5, 1], [760, 240, 280, "#2a3a6a", 0.4, -1]]);
						stars(c, t, 3, 220, 52);
						const pts = Array.from({ length: 9 }, (_, i) => [80 + i * 100, 200 + Math.sin(i * 0.9) * 70]);
						pts.forEach(([x, y], i) => {
							const on = clamp01((local - 0.4 - i * 0.35) * 3);
							beacon(c, x, y, 1, on, t, i);
							if (i && on > 0) k.beam(c, pts[i - 1][0], pts[i - 1][1] - 10, x, y - 10, "#8dffd0", 1, on * 0.6);
						});
						c.font = "11px monospace";
						c.fillStyle = "rgba(160,255,220,0.9)";
						c.fillText(`SIEĆ LATARNI: ${Math.round(clamp01((local - 0.4) / 3.2) * 100)}%`, 740, 96);
					},
					(c, t, local) => {
						nebula(c, t, [[300, 90, 300, "#16283a", 0.5, 1]]);
						stars(c, t, 3, 180, 53);
						planet(c, 480, 420, 330, { base: "#3c5560", atmo: "#5fb8d8", light: 2.2, cities: Math.min(1, 0.05 + local / 3.5), clouds: 0.35, t, seed: 6 });
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
						freighter(c, 160 + local * 40, 150, 1.2, t, 1);
					},
					(c, t, local, reduced) => {
						nebula(c, t, [[480, 120, 360, "#5a3a2a", 0.4, 0]]);
						stars(c, t, 4, 160, 54);
						const rise = ease(clamp01(local / 3)),
							sy = 300 - rise * 70;
						glow(c, 520, sy, 520, "#ffb46a", 0.35 + rise * 0.25);
						planet(c, 480, 820, 560, { base: "#6f8f94", atmo: "#ffd7a0", light: -1.57, cities: 0.6, t, seed: 11 });
						flare(c, 520, sy, 0.6 + rise * 0.6, "#ffcf8a");
						for (let i = 0; i < 7; i++) freighter(c, 60 + i * 110 + local * 34, 230 + (i % 3) * 22, 0.9, t, i);
						capital(c, 160 + local * 18, 196, 0.8, t, false);
						bigTitle(c, k, "ODZYSKANY ŚWIT", "K O N I E C   A K T U   I", local, reduced, "rgba(255,190,110,0.9)");
					},
				],
				label: "EPILOG AKTU I",
				alarm: [0],
			};
		},
		// Act II: Cena świtu — the decision about Hefajstos.
		colony6: (game) => {
			const k = K();
			const { W, H, rnd, clamp01, ease, stars, nebula, glow, flare, capital, freighter } = k;
			const destroy = game?.act2?.choice === "destroy" || game?.campaignChoice?.() === "destroy";
			return {
				titles: destroy ? ["PRZECIĄŻENIE", "POPIÓŁ HEFAJSTOSA", "PIERWSZY PULS", "KONIEC AKTU II"] : ["ODŁĄCZENIE", "CISZA NAD KOMPLEKSEM", "PIERWSZY PULS", "KONIEC AKTU II"],
				places: ["VULKAN IX · KOMPLEKS HEFAJSTOS", "VULKAN IX · PO BITWIE", "LABORATORIUM LIRY · EOS", "SEKTOR 07"],
				captions: destroy
					? [
							"Rdzeń Hefajstosa przeciążony. Kompleks, który wysysał energię planety, znika w ogniu.",
							"Z kompleksu zostaje krater i opadający popiół. Planeta oddycha — ale Dominium straciło elektrownię i nie zapomni.",
							"W laboratorium Liry artefakt z ruin po raz pierwszy rozbłyska. A potem drugi, na innym świecie.",
							"Blokada złamana. Świt ma swoją cenę — a coś w głębi pogranicza właśnie się obudziło.",
						]
					: [
							"Rdzeń Hefajstosa gaśnie. Transporter wywozi techników kompleksu — ludzi, którzy pracowali pod przymusem.",
							"Kompleks stoi ciemny i cichy. Planeta oddycha, a uratowani technicy Dominium nie zapomną, kto po nich przyleciał.",
							"W laboratorium Liry artefakt z kompleksu po raz pierwszy rozbłyska. A potem drugi, na innym świecie.",
							"Blokada złamana. Świt ma swoją cenę — a coś w głębi pogranicza właśnie się obudziło.",
						],
				tints: ["#a0301a", "#5a3a3a", "#6a2a8f", "#4a5a8f"],
				shots: [
					(c, t, local, reduced) => {
						sky(c, k, "#120808", "#4a1a10", "#8a2a10");
						lavaGround(c, k, 1);
						if (destroy) {
							const blast = clamp01((local - 1.6) / 0.5);
							complex(c, k, 1 - blast * 0.9, t);
							if (blast > 0) {
								glow(c, 480, 150, 600 * blast, "#ffffff", (1 - clamp01((local - 2.6) / 1.5)) * 0.9);
								c.strokeStyle = `rgba(255,220,180,${1 - clamp01((local - 1.6) / 2)})`;
								c.lineWidth = 6;
								c.beginPath();
								c.ellipse(480, 280, 40 + (local - 1.6) * 260, 10 + (local - 1.6) * 60, 0, 0, Math.PI * 2);
								c.stroke();
							}
						} else {
							complex(c, k, 1 - clamp01((local - 0.8) / 2.6), t);
							// The transporter lifting off with the technicians.
							const lift = ease(clamp01((local - 1.2) / 3));
							freighter(c, 640 + lift * 200, 290 - lift * 200, 1.4, t, 2);
							glow(c, 640 + lift * 200, 300 - lift * 200, 40, "#9fe8ff", 0.5);
						}
					},
					(c, t, local) => {
						sky(c, k, "#0c0a0c", "#2a1a18", "#3a2016");
						if (destroy) {
							lavaGround(c, k, 0.5);
							k.poly(c, [[340, 300], [420, 270], [540, 270], [620, 300]], "#0a0606");
							for (let i = 0; i < 6; i++) {
								const f = (t * 0.2 + i / 6) % 1;
								c.fillStyle = `rgba(60,55,55,${0.5 * (1 - f)})`;
								c.beginPath();
								c.arc(480 + Math.sin(i) * 40, 280 - f * 220, 40 + f * 90, 0, Math.PI * 2);
								c.fill();
							}
						} else {
							lavaGround(c, k, 0.35);
							complex(c, k, 0.05, t);
						}
						for (let i = 0; i < 70; i++) {
							c.fillStyle = "rgba(140,130,125,0.5)";
							c.fillRect(((rnd(i) * W + t * 10) % W + W) % W, ((rnd(i * 3) * H + t * 20) % H + H) % H, 2, 2);
						}
					},
					(c, t, local) => {
						c.fillStyle = "#06080e";
						c.fillRect(0, 0, W, H);
						nebula(c, t, [[480, 220, 300, "#2a1a4a", 0.5, 0]]);
						// A lab bench: the artefact under a glass dome, its pulse growing.
						k.poly(c, [[180, 330], [780, 330], [820, 360], [140, 360]], "#1c2630");
						const pulse = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.1)), 6) * clamp01((local - 0.8) / 1.5);
						crystal(c, k, 480, 320, 70, 18, 0, 0.25 + pulse * 0.8);
						c.strokeStyle = "rgba(200,230,255,0.35)";
						c.lineWidth = 2;
						c.beginPath();
						c.arc(480, 320, 110, Math.PI, 0);
						c.stroke();
						// A second light on the star map behind: another artefact answering.
						const second = clamp01((local - 2.8) * 2);
						glow(c, 760, 110, 30, VIOLET, second * (0.4 + pulse * 0.6));
						c.font = "11px monospace";
						c.fillStyle = "rgba(220,190,255,0.85)";
						if (second > 0) c.fillText("ODPOWIEDŹ · LUMERIA V", 680, 150);
					},
					(c, t, local, reduced) => {
						nebula(c, t, [[300, 120, 300, "#2a3a6a", 0.5, 1], [760, 250, 260, "#3a1a5a", 0.4, -1]]);
						stars(c, t, 5, 200, 61);
						for (let i = 0; i < 5; i++) freighter(c, 80 + i * 140 + local * 26, 260 + (i % 2) * 24, 0.85, t, i);
						capital(c, 200 + local * 16, 300, 0.9, t, false);
						bigTitle(c, k, "CENA ŚWITU", destroy ? "K O N I E C   A K T U   I I  ·  P O P I Ó Ł   H E F A J S T O S A" : "K O N I E C   A K T U   I I  ·  W D Z I Ę C Z N O Ś Ć   D O M I N I U M", local, reduced, "rgba(255,140,80,0.9)");
					},
				],
				label: "EPILOG AKTU II",
				alarm: destroy ? [0] : [],
			};
		},
		// Act III: Przebudzenie Roju — the finale; Varn trusted or kept at a distance.
		colony9: (game) => {
			const k = K();
			const { W, H, rnd, clamp01, ease, stars, nebula, glow, flare, capital, fighter, planet, beam } = k;
			const trust = game?.campaignLegacy?.colony8 === "trust";
			const distance = game?.campaignLegacy?.colony8 === "distance";
			return {
				titles: ["SERCE GAŚNIE", "CISZA ARTEFAKTÓW", trust ? "WSPÓLNE DOWÓDZTWO" : distance ? "KAŻDY SWOJĄ DROGĄ" : "SOJUSZ Z KONIECZNOŚCI", "ŚWIT"],
				places: ["PYRRHOS · SERCE ROJU", "SEKTOR 07 · SIEĆ ARTEFAKTÓW", "PYRRHOS · ORBITA", "SEKTOR 07 · ŚWIT"],
				captions: [
					"Serce Roju pęka. Fiolet gaśnie pod rzekami magmy, a Rój rozpada się w pył.",
					"W całym pograniczu artefakty milkną jeden po drugim. Sieć, którą Rój budował od wieków, przestaje śpiewać.",
					trust
						? "Varn i Lira lecą ramię w ramię. Wspólne dowództwo przetrwało bitwę — na pograniczu zapada rozejm."
						: distance
							? "Kolonie odlatują z Pyrrhosa własną drogą. Varn salutuje z daleka; rozejm pozostaje kruchy."
							: "Kolonie i Dominium po raz pierwszy od lat nie liczą strat, lecz ocalałych.",
					"Nad pograniczem wstaje świt — tym razem wspólny. Koniec kampanii.",
				],
				tints: ["#8f2a6a", "#6a2a8f", "#4f6f9f", "#a06a2a"],
				shots: [
					(c, t, local) => {
						sky(c, k, "#0c0612", "#3a1020", "#6a2010");
						k.poly(c, [[0, 290], [W, 275], [W, H], [0, H]], "#160a0c");
						const fade = 1 - clamp01((local - 0.8) / 3);
						const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.4)), 4) * fade;
						glow(c, 480, 330, (220 + beat * 60) * fade + 20, "#9a3aff", 0.5 * fade + 0.05);
						for (let i = 0; i < 7; i++) {
							const fall = clamp01((local - 1.2 - i * 0.15) / 1.2);
							crystal(c, k, 380 + i * 34 + (i - 3) * fall * 20, 300 - Math.abs(i - 3) * 6 + fall * 40, (50 + (3 - Math.abs(i - 3)) * 30) * (1 - fall * 0.4), 12, (i - 3) * (0.12 + fall * 0.5), 0.3 * fade);
						}
						// The Swarm falling apart into dust.
						for (let i = 0; i < 260; i++) {
							const a = rnd(i) * Math.PI * 2,
								d = (rnd(i * 3) * 120 + local * 40) * (1 + rnd(i * 5));
							c.fillStyle = `rgba(80,50,110,${0.7 * fade})`;
							c.fillRect(480 + Math.cos(a) * d * 1.4, 160 + Math.sin(a) * d * 0.6 + local * 10, 2, 2);
						}
					},
					(c, t, local) => {
						c.fillStyle = "#05030c";
						c.fillRect(0, 0, W, H);
						nebula(c, t, [[480, 200, 380, "#2a1a4a", 0.5, 0]]);
						stars(c, t, 2, 220, 62, "#e6d6ff");
						const pts = [[180, 150], [340, 260], [480, 120], [640, 240], [800, 150]];
						pts.forEach(([x, y], i) => {
							const off = clamp01((local - 0.6 - i * 0.55) * 2);
							glow(c, x, y, 30, VIOLET, 0.8 * (1 - off));
							crystal(c, k, x, y + 8, 22, 6, 0, 0.3 * (1 - off));
						});
						c.font = "11px monospace";
						c.fillStyle = "rgba(220,190,255,0.9)";
						c.fillText(`RYTM ARTEFAKTÓW: ${local > 3.4 ? "BRAK SYGNAŁU" : "ZANIKA"}`, 640, 92);
					},
					(c, t, local) => {
						nebula(c, t, [[300, 120, 300, "#1a3a5a", 0.5, 1]]);
						stars(c, t, 5, 200, 63);
						planet(c, 480, 470, 300, { base: "#8a3a24", dark: "#1a0806", atmo: "#ff9a6a", light: -1.9, t, seed: 63 });
						if (distance) {
							capital(c, 300 - local * 30, 140 - local * 8, 0.9, t, false);
							c.save();
							c.translate(W, 0);
							c.scale(-1, 1);
							capital(c, 300 - local * 30, 250 - local * 8, 0.95, t, true);
							c.restore();
						} else {
							capital(c, 200 + local * 18, 150, 1, t, false);
							capital(c, 230 + local * 18, 240, 1.05, t, true);
							for (let i = 0; i < 6; i++) fighter(c, 120 + i * 70 + local * 34, 195 + (i % 3) * 20, 0.9, 0, i % 2 === 1);
						}
						flare(c, 860, 70, 0.5, "#ffd0a0");
					},
					(c, t, local, reduced) => {
						nebula(c, t, [[480, 120, 360, "#5a3a2a", 0.45, 0], [200, 80, 260, "#2a4a6a", 0.35, 1]]);
						stars(c, t, 4, 160, 64);
						const rise = ease(clamp01(local / 3)),
							sy = 300 - rise * 80;
						glow(c, 480, sy, 560, "#ffb46a", 0.4 + rise * 0.25);
						planet(c, 480, 820, 560, { base: "#6f8f94", atmo: "#ffd7a0", light: -1.57, cities: 0.7, t, seed: 11 });
						flare(c, 480, sy, 0.7 + rise * 0.6, "#ffcf8a");
						capital(c, 150 + local * 16, 210, 0.8, t, false);
						capital(c, 620 + local * 16, 230, 0.75, t, true);
						bigTitle(c, k, "ŚWIT — TYM RAZEM WSPÓLNY", "K O N I E C   K A M P A N I I", local, reduced, "rgba(255,200,130,0.9)", 120);
					},
				],
				label: "EPILOG AKTU III",
				alarm: [],
			};
		},
	};
	const ACT = { colony3: "Epilog aktu I · Odzyskany Świt", colony6: "Epilog aktu II · Cena świtu", colony9: "Epilog aktu III · Przebudzenie Roju" };
	// The film of a chapter's ending (null if the chapter does not end an act).
	function film(id, game = null) {
		if (!FILMS[id] || typeof CampaignFilm === "undefined") return null;
		const spec = FILMS[id](game);
		return {
			title: ACT[id],
			duration: spec.shots.length * 5,
			captions: spec.captions,
			draw: (c, time, reduced = false) => K().render(c, time, reduced, spec),
		};
	}
	return { film, has: (id) => !!FILMS[id] };
})();
if (typeof window !== "undefined") window.Epilogues = Epilogues;
