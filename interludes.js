/* Scenes before campaign chapters: a short radio exchange (3–4 lines, about 4.6 s each) in the frame of the
   campaign films (campaign-film.js kit: letterbox, grade, grain): the chapter's world approaching behind, the
   speaker's portrait talking in a holo panel on the left (the Colonies) or the right (the Dominium, the Swarm),
   the signal breaking up on enemy channels, the line typed out on a data panel with the voice's waveform,
   static between lines; the line is also the caption. A film for menu.js playIntro (draw → { scene, caption }),
   played once before a chapter's briefing and on request from the briefing. */
const Interludes = (() => {
	const LINE = 4.6;
	const SCENES = {
		colony1: [
			["lira", "Słyszysz mnie? Tu Lira, stacja Eos. Latarnie zgasły w całym sektorze — zostałam sama z resztką zasilania."],
			["dominium", "…garnizon Eos utrzymuje kotlinę. Żadnych transmisji Kolonii…"],
			["lira", "Przywróćmy zasilanie i łączność, zanim sygnał zamilknie. Ląduj przy stacji, czekam."],
		],
		colony2: [
			["lira", "Dane z Eos prowadzą na Vesper. Pod lodem leży archiwum dawnej sieci latarni."],
			["dominium", "…port przeładunkowy zamknięty. Konwoje Kolonii nie mają prawa przejść…"],
			["lira", "Dwa magazyny i dwa przekaźniki — potem odbierzemy port. Uważaj, tamtejszy dowódca zna swój fach."],
		],
		colony3: [
			["lira", "Archiwum otwarte. Blackout nie był awarią — Dominium chciało nas zmusić do kapitulacji."],
			["dominium", "…Cytadela Węzła ma wytrzymać. Żadnych negocjacji z Koloniami…"],
			["lira", "Klucz jest gotowy. Daj mi czas i ciężki sprzęt, a zapalę latarnie na całym pograniczu."],
		],
		colony4: [
			["tessa", "Tu doktor Mira Tessa… jeśli ktoś to słyszy — jesteśmy pod piaskiem Khepri, w starej sondzie."],
			["lira", "Mamy cię, Miro! Trzymajcie się, idziemy po was."],
			["dominium", "…wiertnie pracują dalej. Nieważne, co obudzi się w jamach…"],
			["tessa", "Archiwum mamy przy sobie. Ale jamy… one żyją. Omijajcie je, jeśli zdołacie."],
		],
		colony5: [
			["vale", "Kapitan Oren Vale, konwój Kestrel. Trzy rdzenie, jedna przełęcz i śnieżyca co kilka minut."],
			["tessa", "Archiwum potwierdza: te rdzenie zasilą całą sieć. Nie możemy stracić więcej niż jednego."],
			["vale", "Utrzymajcie postoje i łatajcie mi pojazdy. Resztę dowiozę."],
		],
		colony6: [
			["lira", "Rdzenie wskazały źródło blokady — kompleks Hefajstos na Vulkanie IX."],
			["koss", "Tu Koss, technik kompleksu… pracujemy pod przymusem. Ta instalacja wysysa energię całej planety."],
			["dominium", "…Hefajstos ma działać za wszelką cenę. Personel jest zbędny…"],
			["lira", "Przyjdzie ci zdecydować, co z nim zrobić. Najpierw jednak — węzły sterujące."],
		],
		colony7: [
			["lira", "Od wyłączenia Hefajstosa artefakty w całym pograniczu pulsują jednym rytmem."],
			["whisper", "…słyszymy was… obudziliście nas… oddajcie, co nasze…"],
			["tessa", "To coś żyje. I idzie po artefakt na Lumerii — musimy być tam pierwsi."],
		],
		colony8: [
			["varn", "Tu komandor Aris Varn. Rój zjada moich ludzi. Potrzebuję was — choć nie jest mi to w smak."],
			["lira", "Ze Szczytu przełęczy zagłuszymy ich rezonans. Trzy minuty — i nie dajmy upaść bazie Varna."],
			["whisper", "…Szczyt śpiewa dla nas…"],
		],
		colony9: [
			["lira", "Serce Roju bije pod rzekami magmy. Każde uderzenie słychać w artefaktach."],
			["varn", "Moja stacja orbitalna jest wasza. Zaznaczcie cel — orbita zrobi resztę."],
			["whisper", "…nie uciszycie nas wszystkich… jest nas więcej…"],
			["lira", "Może. Ale nie tutaj. Ruszamy."],
		],
		colony10: [
			["lira", "Rozejm z Varnem miał zakończyć wojnę. Admiralicja ma inne zdanie — orbita Eos jest zamknięta."],
			["vok", "Tu admirał Selen Vok. Varn to zdrajca, a jego rozejm to papier. Każdy statek Kolonii na tej orbicie zostanie zatopiony."],
			["lira", "Mamy lotniskowiec i dziesięć minut. Przełammy blokadę — z ocalałej floty zrobimy kapsuły na lądowanie."],
		],
		colony11: [
			["lira", "Orbita nasza. Kapsuły czekają w lukach — pora zejść na Eos."],
			["vok", "Baterie przeciwlotnicze stoją na całym Horyzoncie. Każda kapsuła spłonie, zanim dotknie piasku."],
			["gate", "…OGRÓD MILCZY… KTO TRZYMA LATARNIE…"],
			["lira", "Znowu ten sygnał. Artefakt pod piaskiem odpowiada — i to nie jest Rój."],
		],
		colony12: [
			["lira", "Vok wycofała się do twierdzy na Popielnym Szlaku. Jeśli ją zdobędziemy, Admiralicja straci ostatnią bazę na powierzchni."],
			["vok", "Moja twierdza wytrzymała już niejedno oblężenie. Wasze też przetrwa."],
			["gate", "…KAŻDY, KTO TRZYMA LATARNIE, ODPOWIE…"],
		],
		colony13: [
			["vok", "Pierścienie Glacjalis to moja ostatnia orbita. Tym razem to moje kapsuły spadną na wasze głowy."],
			["lira", "Vok trzyma orbitę nad Nivalis. Przetrwajmy desant wśród Kryształowych Grzbietów, potem uderzmy na jej kwaterę."],
			["gate", "…SZCZELINA OTWARTA… OGRÓD WZYWA…"],
		],
		colony14: [
			["gate", "…OGRÓD MILCZY… WY GO UCISZYLIŚCIE… BRAMA OTWARTA…"],
			["lira", "Wszystkie szczeliny prowadzą tutaj — do Bramy przy horyzoncie Erebusa."],
			["lira", "Rdzeń Wartowników stoi przy samej krawędzi. Zniszczmy go, zanim przejdzie ich więcej."],
		],
	};
	// The world under the scene: by the map's theme, else its biome — [surface, night, air].
	const WORLD = {
		dust: ["#c69a5c", "#2a1c12", "#ffd29a"],
		ice: ["#d9e8f0", "#3a5060", "#bfe6ff"],
		ash: ["#7a5a50", "#1a100e", "#ff9a6a"],
		lumen: ["#4f8a7f", "#0e1a1a", "#9fffd8"],
		magma: ["#8a3a24", "#1a0806", "#ff7a3a"],
		frozenhive: ["#b8d0e0", "#2a3a50", "#c9b8ff"],
		derelict: ["#6a6a66", "#141414", "#ffb08a"],
		ocean: ["#3f8aa0", "#08202a", "#a8e8ff"],
		crystal: ["#a8d8ec", "#283a50", "#d4c4ff"],
		space: ["#3a4466", "#05060c", "#9fb8ff"],
	};
	// Sides: the Colonies speak from the left in teal, the Dominium from the right in red, Varn (an officer of the
	// Dominium, an ally) in amber, the Swarm in violet.
	const SIDE = { lira: "#7fe7c8", tessa: "#f0cf8a", vale: "#9cc6f2", koss: "#f2a38c", dominium: "#ff6a5a", varn: "#e9a17a", whisper: "#c98cff", vok: "#ff8f7a", gate: "#7fe9ff" };
	const LEFT = new Set(["lira", "tessa", "vale", "koss"]);

	function film(id) {
		const lines = SCENES[id];
		if (!lines || typeof CampaignFilm === "undefined") return null;
		const K = CampaignFilm.kit,
			{ W, H, BAR, rnd, clamp01 } = K,
			m = (typeof RTS !== "undefined" && RTS.MISSIONS[id]) || {},
			[land, night, air] = WORLD[m.theme] || WORLD[m.biome] || WORLD.dust,
			speakers = (typeof RTS !== "undefined" && RTS.ACT2_SPEAKERS) || {};
		const duration = lines.length * LINE;
		// Wrapped text: lines of at most `width` pixels.
		const wrap = (c, text, width) => {
			const out = [];
			let line = "";
			for (const word of text.split(" ")) {
				const next = line ? line + " " + word : word;
				if (c.measureText(next).width > width && line) {
					out.push(line);
					line = word;
				} else line = next;
			}
			if (line) out.push(line);
			return out;
		};
		function draw(c, time, reduced = false) {
			time = Math.max(0, time);
			const scene = Math.min(lines.length - 1, Math.floor(time / LINE)),
				local = time - scene * LINE,
				[who, text] = lines[scene],
				left = LEFT.has(who),
				color = SIDE[who] || "#c5d7d9",
				enemy = ["dominium", "whisper", "vok", "gate"].includes(who),
				t = reduced ? scene * LINE + 2 : time,
				s = speakers[who] || {};
			c.save();
			c.fillStyle = "#03070d";
			c.fillRect(0, 0, W, H);
			// The camera drifts in a little over the scene.
			const zoom = 1 + (reduced ? 0.02 : (time / duration) * 0.05);
			c.translate(W / 2, H / 2);
			c.scale(zoom, zoom);
			c.translate(-W / 2, -H / 2);
			K.nebula(c, t, [[left ? 700 : 260, 120, 300, air + "55", 0.45, 1], [left ? 260 : 700, 320, 260, "#1a2a4a", 0.45, -1]]);
			K.stars(c, t, 6, 200, 31);
			// The chapter's world, on the side away from the speaker, coming closer.
			const r = 190 + time * 3;
			K.planet(c, left ? 760 : 200, 330, r, { base: land, dark: night, atmo: air, light: left ? -2.4 : -0.7, cities: 0.4, t, seed: id.length * 7 });
			c.restore();
			// The speaker's holo panel.
			const size = 210,
				px = left ? 74 : W - 74 - size,
				py = 70,
				appear = reduced ? 1 : clamp01(local / 0.3);
			c.save();
			c.globalAlpha = appear;
			K.glow(c, px + size / 2, py + size / 2, size * 0.9, color, 0.25);
			c.fillStyle = "rgba(4,12,18,0.75)";
			c.fillRect(px - 8, py - 8, size + 16, size + 64);
			const talk = reduced || typeof Portraits === "undefined" ? 0 : local < LINE - 0.6 ? Portraits.mouth(local) : 0;
			if (typeof Portraits !== "undefined") Portraits.draw(c, who, px, py, size, time, talk);
			// Holo scanlines, a flicker; the enemy's signal breaks up.
			c.fillStyle = "rgba(0,0,0,0.22)";
			for (let y = py; y < py + size; y += 3) c.fillRect(px, y, size, 1);
			if (!reduced && (enemy ? rnd(Math.floor(time * 14)) > 0.55 : rnd(Math.floor(time * 10)) > 0.93))
				for (let k = 0; k < (enemy ? 6 : 2); k++) {
					const gy = py + rnd(k + Math.floor(time * 20)) * size;
					c.fillStyle = k % 2 ? color + "66" : "rgba(0,0,0,0.6)";
					c.fillRect(px + (rnd(k * 3 + time) - 0.5) * 16, gy, size, 2 + rnd(k) * 5);
				}
			// Corner brackets of the frame.
			c.strokeStyle = color;
			c.lineWidth = 2;
			for (const [x, y, dx, dy] of [[px - 8, py - 8, 1, 1], [px + size + 8, py - 8, -1, 1], [px - 8, py + size + 56, 1, -1], [px + size + 8, py + size + 56, -1, -1]]) {
				c.beginPath();
				c.moveTo(x, y + dy * 16);
				c.lineTo(x, y);
				c.lineTo(x + dx * 16, y);
				c.stroke();
			}
			c.fillStyle = color;
			c.font = "bold 15px sans-serif";
			c.fillText(s.name || who, px, py + size + 24);
			c.fillStyle = "rgba(200,220,225,0.8)";
			c.font = "10px monospace";
			c.fillText((s.role || "").toUpperCase(), px, py + size + 42);
			// Signal bars.
			for (let k = 0; k < 5; k++) {
				const on = reduced || Math.sin(time * 6 + k) > -0.7 + k * 0.25 - (enemy ? 0.4 : 0);
				c.fillStyle = on ? color : color + "33";
				c.fillRect(px + size - 38 + k * 7, py + size + 40 - k * 5, 4, 6 + k * 5);
			}
			c.restore();
			// The data panel on the other side: the channel, the line typed out, the voice.
			const dx = left ? 380 : 90,
				dw = 470;
			c.save();
			c.globalAlpha = appear;
			c.font = "10px monospace";
			c.fillStyle = color;
			c.fillText(enemy ? (who === "whisper" ? "SYGNAŁ NIEZNANY · ŹRÓDŁO: ARTEFAKTY" : who === "gate" ? "SYGNAŁ NIEZNANY · ŹRÓDŁO: SZCZELINA" : who === "vok" ? "PRZECHWYCONO · KANAŁ ADMIRALICJI 1.01" : "PRZECHWYCONO · KANAŁ DOMINIUM 3.07") : "ŁĄCZNOŚĆ · KANAŁ 7.31 · SZYFR KOLONII", dx, 92);
			c.fillRect(dx, 98, dw * (reduced ? 1 : clamp01(local / 0.6)), 1.2);
			c.font = "15px monospace";
			const typed = reduced ? text : text.slice(0, Math.floor(clamp01(local / (LINE * 0.62)) * text.length));
			const rows = wrap(c, text, dw);
			let shown = typed.length;
			rows.forEach((row, k) => {
				const part = row.slice(0, Math.max(0, shown));
				shown -= row.length + 1;
				c.fillStyle = "#e8f2f0";
				c.shadowColor = color;
				c.shadowBlur = 8;
				c.fillText(part, dx, 130 + k * 22);
			});
			c.shadowBlur = 0;
			if (!reduced && typed.length < text.length && Math.floor(local * 6) % 2 === 0) {
				const k = Math.min(rows.length - 1, rows.findIndex((_, n) => rows.slice(0, n + 1).join(" ").length >= typed.length));
				const row = rows[Math.max(0, k)].slice(0, Math.max(0, typed.length - rows.slice(0, Math.max(0, k)).join(" ").length - (k > 0 ? 1 : 0)));
				c.fillStyle = color;
				c.fillRect(dx + c.measureText(row).width + 3, 116 + Math.max(0, k) * 22, 8, 16);
			}
			// The voice: a waveform while talking.
			c.strokeStyle = color;
			c.lineWidth = 1.5;
			c.beginPath();
			const wy = 130 + rows.length * 22 + 30;
			for (let x = 0; x <= dw; x += 4) {
				const amp = reduced ? 3 : (talk * 16 + 2) * Math.sin((x / dw) * Math.PI);
				const y = wy + Math.sin(x * 0.09 + time * 14) * amp * Math.sin(x * 0.021 + time * 3);
				x ? c.lineTo(dx + x, y) : c.moveTo(dx, y);
			}
			c.stroke();
			c.restore();
			// The frame of the film: grade, vignette, grain, letterbox; the header on the bar.
			K.finish(c, scene, local, time, reduced, enemy ? (who === "whisper" ? "#6a2a8f" : who === "gate" ? "#1f6f8f" : "#8f2a2a") : "#2a6f8f");
			c.font = "11px monospace";
			c.fillStyle = "rgba(190,215,222,0.85)";
			c.fillText(`ŁĄCZNOŚĆ · ${(m.planet || "").toUpperCase()}`, 24, BAR - 12);
			c.textAlign = "right";
			c.fillText(m.name || "", W - 24, BAR - 12);
			c.fillText(`KWESTIA ${scene + 1} / ${lines.length}`, W - 24, H - 13);
			c.textAlign = "left";
			// Cuts: a burst of static between lines, a fade at the start and the end.
			if (!reduced) {
				if (scene > 0 && local < 0.14) {
					for (let k = 0; k < 220; k++) {
						c.fillStyle = k % 2 ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.6)";
						c.fillRect(rnd(k + time * 50) * W, rnd(k * 3 + time * 70) * H, 6 + rnd(k) * 40, 2);
					}
				}
				const fade = Math.max(0, 1 - time / 0.5, (time - (duration - 0.5)) / 0.5);
				if (fade > 0) {
					c.fillStyle = `rgba(3,9,17,${Math.min(1, fade)})`;
					c.fillRect(0, 0, W, H);
				}
			}
			return { scene, caption: (s.name || who) + ": " + text };
		}
		return { draw, duration, lines };
	}
	return { film, SCENES, has: (id) => !!SCENES[id] };
})();
if (typeof window !== "undefined") window.Interludes = Interludes;
if (typeof module !== "undefined" && module.exports) module.exports = { SCENES: Interludes.SCENES };
