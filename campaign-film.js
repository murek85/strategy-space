/* Six deterministic shots, rendered locally without network or video dependencies. */
const CampaignFilm = (() => {
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
	function poly(c, p, color) {
		c.fillStyle = color;
		c.beginPath();
		p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.closePath();
		c.fill();
	}
	function glow(c, x, y, r, color) {
		const g = c.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, color);
		g.addColorStop(1, "#00000000");
		c.fillStyle = g;
		c.fillRect(x - r, y - r, 2 * r, 2 * r);
	}
	function ship(c, x, y, size, enemy = false) {
		c.save();
		c.translate(x, y);
		c.scale(size, size);
		poly(
			c,
			[
				[48, 0],
				[-35, -17],
				[-17, 0],
				[-35, 17],
			],
			enemy ? "#74808c" : "#b4c8cd",
		);
		poly(
			c,
			[
				[48, 0],
				[-17, 0],
				[-35, 17],
			],
			"#344857",
		);
		c.fillStyle = enemy ? "#cf787e" : "#80d7ec";
		for (const j of [-1, 1]) {
			c.fillRect(-25, j * 8 - 2, 14, 4);
			glow(c, -28, j * 8, 12, enemy ? "#f6826750" : "#8cdfff70");
		}
		c.strokeStyle = "#e0edf055";
		c.beginPath();
		c.moveTo(-10, -6);
		c.lineTo(22, 0);
		c.stroke();
		c.restore();
	}
	function planet(c, x, y, r, color) {
		glow(c, x, y, r * 1.25, color + "35");
		const g = c.createRadialGradient(x - r * 0.5, y - r * 0.55, 0, x, y, r);
		g.addColorStop(0, color);
		g.addColorStop(1, "#101b2b");
		c.fillStyle = g;
		c.beginPath();
		c.arc(x, y, r, 0, Math.PI * 2);
		c.fill();
		c.save();
		c.clip();
		c.strokeStyle = "#d6edf21c";
		c.lineWidth = 8;
		for (let i = 0; i < 6; i++) {
			c.beginPath();
			c.ellipse(
				x - 15,
				y - r * 0.65 + i * r * 0.25,
				r,
				r * 0.16,
				-0.25,
				0,
				Math.PI * 2,
			);
			c.stroke();
		}
		c.restore();
	}
	function draw(c, time, reduced = false) {
		const scene = Math.min(5, Math.floor(time / 5)),
			local = time % 5,
			motion = reduced ? 2.5 : local;
		c.clearRect(0, 0, 960, 400);
		c.fillStyle = "#06101c";
		c.fillRect(0, 0, 960, 400);
		for (let i = 0; i < 160; i++) {
			c.globalAlpha = 0.25 + (i % 5) * 0.13;
			c.fillStyle = "#bdd9e7";
			c.fillRect(
				(i * 173.3 - motion * (1 + (i % 3)) + 960) % 960,
				(i * 81.7) % 400,
				1.4,
				1.4,
			);
		}
		c.globalAlpha = 1;
		if (scene === 0) {
			planet(c, 740 - motion * 5, 310, 235, "#58848e");
			c.strokeStyle = "#8bc8c14a";
			c.lineWidth = 2;
			c.beginPath();
			c.ellipse(665, 250, 320, 95, -0.3, 0, Math.PI * 2);
			c.stroke();
			for (let i = 0; i < 5; i++) {
				const x = 370 + i * 105,
					y = 210 + Math.sin(i) * 65;
				glow(c, x, y, 25, "#8defc660");
				c.fillStyle = "#c5f5dc";
				c.fillRect(x - 3, y - 3, 6, 6);
			}
			for (let i = 0; i < 4; i++)
				ship(c, 100 + i * 95 + motion * 15, 115 + (i % 2) * 32, 0.38);
		} else if (scene === 1) {
			planet(c, 700, 340, 240, "#626c83");
			ship(c, 420 + motion * 18, 145, 4, true);
			for (let i = 0; i < 4; i++)
				ship(
					c,
					190 + i * 130 + motion * 9,
					300 + (i % 2) * 25,
					0.5,
					true,
				);
			for (let i = 0; i < 5; i++) {
				const x = 500 + i * 68,
					y = 220 + Math.sin(i) * 60;
				glow(c, x, y, Math.max(1, 18 - motion * 3), "#dc827c40");
			}
			c.fillStyle = "#08111c99";
			c.fillRect(0, 0, 960, 400);
		} else if (scene === 2) {
			c.fillStyle = "#1c2a37";
			c.fillRect(0, 230, 960, 170);
			for (let i = 0; i < 18; i++) {
				const x = i * 62 - motion * 4,
					h = 55 + ((i * 47) % 115);
				poly(
					c,
					[
						[x, 320],
						[x, 320 - h],
						[x + 37, 312 - h],
						[x + 48, 320],
						[x + 48, 370],
					],
					"#293c47",
				);
				for (let j = 0; j < 4; j++)
					for (let k = 0; k < 3; k++) {
						c.fillStyle =
							(i + j + k) % 7 === 0 ? "#d0a266" : "#3c5360";
						c.fillRect(x + 6 + k * 9, 327 - h + j * 15, 4, 5);
					}
			}
			c.strokeStyle = "#75818a";
			c.lineWidth = 5;
			c.beginPath();
			c.moveTo(740, 330);
			c.lineTo(740, 85);
			c.lineTo(810, 160);
			c.stroke();
			glow(c, 740, 85, 28, "#d8726630");
			ship(c, 330, 346, 1.1);
		} else if (scene === 3) {
			c.fillStyle = "#152b38";
			c.fillRect(355, 65, 490, 275);
			c.strokeStyle = "#79b5b9";
			c.lineWidth = 2;
			c.strokeRect(365, 75, 470, 255);
			for (let i = 0; i < 5; i++) {
				c.strokeStyle = "#75a9ba30";
				c.beginPath();
				c.arc(615, 190, 25 + i * 22, 0, Math.PI * 2);
				c.stroke();
			}
			c.strokeStyle = "#9de4d2";
			c.beginPath();
			for (let x = 390; x < 815; x += 5) {
				const y =
					205 +
					Math.sin(x * 0.06 + motion * 4) * Math.sin(x * 0.023) * 30;
				x === 390 ? c.moveTo(x, y) : c.lineTo(x, y);
			}
			c.stroke();
			c.fillStyle = "#aecdd3";
			c.font = "13px monospace";
			c.fillText("ARCHIWUM VESPER / KLUCZ SIECI", 403, 303);
			c.fillStyle = "#0c1822";
			c.beginPath();
			c.ellipse(223, 160, 41, 49, 0, 0, Math.PI * 2);
			c.fill();
			poly(
				c,
				[
					[175, 215],
					[260, 210],
					[300, 360],
					[115, 360],
				],
				"#12232d",
			);
			c.strokeStyle = "#7194a0";
			c.beginPath();
			c.moveTo(260, 160);
			c.lineTo(273, 170);
			c.lineTo(253, 182);
			c.stroke();
			glow(c, 270, 170, 20, "#86d6db30");
		} else if (scene === 4) {
			c.fillStyle = "#586f83";
			c.fillRect(0, 0, 960, 400);
			planet(c, 810, 88, 43, "#c7d7df");
			for (let layer = 0; layer < 3; layer++) {
				const pts = [[0, 400]];
				for (let x = -100; x < 1100; x += 90)
					pts.push([
						x - motion * (8 + layer * 9),
						150 + layer * 65 + Math.sin(x * 0.02 + layer) * 65,
					]);
				pts.push([1100, 400]);
				poly(c, pts, ["#879ba7", "#526a7a", "#253c50"][layer]);
			}
			for (let i = 0; i < 3; i++)
				ship(c, 180 + i * 185 + motion * 17, 150 + (i % 2) * 45, 0.58);
		} else {
			planet(c, 695, 355, 250, "#92a7ac");
			glow(c, 555, 110, 220, "#e8b16c55");
			for (let i = 0; i < 6; i++)
				ship(
					c,
					110 + i * 118 + motion * 12,
					210 + (i % 3) * 32,
					0.6 + i * 0.05,
				);
			for (let i = 0; i < 6; i++) {
				const x = 520 + i * 60,
					y = 255 + Math.sin(i) * 50;
				glow(c, x, y, 22, "#b0f5d26a");
			}
			c.fillStyle = "#e5ece4";
			c.font = "26px sans-serif";
			c.fillText("ODZYSKANY ŚWIT", 60, 115);
		}
		c.fillStyle = "#030a1299";
		c.fillRect(0, 0, 960, 30);
		c.fillRect(0, 374, 960, 26);
		c.fillStyle = "#c1d9df";
		c.font = "12px monospace";
		c.fillText(titles[scene], 28, 20);
		const fade = Math.max(0, 1 - local / 0.5, (local - 4.5) / 0.5);
		if (!reduced && fade > 0) {
			c.fillStyle = "rgba(3,9,17," + Math.min(1, fade) + ")";
			c.fillRect(0, 0, 960, 400);
		}
		return { scene, caption: captions[scene] };
	}
	return { draw, captions };
})();
