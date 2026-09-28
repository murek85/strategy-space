/* Act II prologue: four deterministic 5-second shots, drawn locally like the act I film. */
const Act2Film = (() => {
	const duration = 20;
	const titles = [
		"AKT II / CENA ŚWITU",
		"SYGNAŁ SPOD PIASKU",
		"OSTATNI KONWÓJ",
		"SERCE POPIOŁU",
	];
	const captions = [
		"Latarnie znów świecą. W ich paśmie pojawił się cichy, powtarzany sygnał z odciętej ekipy badawczej.",
		"Na Khepri IV Dominium kopie w dawnych instalacjach sondy. Hałas wiertni obudził paszczaki w skalnych jamach.",
		"Archiwum wskaże drogę do rdzeni energetycznych. Trzy konwojowce muszą przejść przez lodową przełęcz Vesperu.",
		"Na końcu szlaku czeka kompleks Hefajstos — źródło blokady. Świt ma swoją cenę. Ty zdecydujesz, kto ją zapłaci.",
	];
	const poly = (c, p, color) => {
		c.fillStyle = color;
		c.beginPath();
		p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.closePath();
		c.fill();
	};
	const glow = (c, x, y, r, color) => {
		const g = c.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, color);
		g.addColorStop(1, "#00000000");
		c.fillStyle = g;
		c.fillRect(x - r, y - r, 2 * r, 2 * r);
	};
	function truck(c, x, y, s) {
		c.save();
		c.translate(x, y);
		c.scale(s, s);
		poly(
			c,
			[
				[-40, -12],
				[22, -12],
				[36, -4],
				[36, 10],
				[-40, 10],
			],
			"#5d6d74",
		);
		c.fillStyle = "#232b30";
		c.fillRect(-38, 10, 70, 7);
		glow(c, -10, -2, 26, "#8fe6ff66");
		c.fillStyle = "#9ae8ff";
		c.fillRect(-26, -8, 28, 12);
		c.fillStyle = "#f0c86a";
		c.fillRect(33, -2, 3, 3);
		c.restore();
	}
	function draw(c, time, reduced = false) {
		const scene = Math.min(3, Math.floor(time / 5)),
			local = time % 5,
			motion = reduced ? 2.5 : local;
		c.clearRect(0, 0, 960, 400);
		c.fillStyle = "#06101c";
		c.fillRect(0, 0, 960, 400);
		for (let i = 0; i < 120; i++) {
			c.globalAlpha = 0.2 + (i % 5) * 0.12;
			c.fillStyle = "#bdd9e7";
			c.fillRect(
				(i * 211.7 - motion * (1 + (i % 3)) + 960) % 960,
				(i * 97.3) % 220,
				1.4,
				1.4,
			);
		}
		c.globalAlpha = 1;
		if (scene === 0) {
			for (let i = 0; i < 7; i++) {
				const x = 130 + i * 120,
					y = 250 + Math.sin(i * 1.7) * 40;
				glow(c, x, y, 34, "#8defc660");
				c.fillStyle = "#c5f5dc";
				c.fillRect(x - 3, y - 3, 6, 6);
			}
			c.strokeStyle = "#f0cf8a";
			c.lineWidth = 2;
			c.beginPath();
			for (let x = 60; x < 900; x += 4) {
				const y =
					120 +
					Math.sin(x * 0.05 + motion * 5) *
						Math.max(0, Math.sin(x * 0.012 + motion)) *
						26;
				x === 60 ? c.moveTo(x, y) : c.lineTo(x, y);
			}
			c.stroke();
			c.fillStyle = "#e5ece4";
			c.font = "26px sans-serif";
			c.fillText("CENA ŚWITU", 60, 82);
		} else if (scene === 1) {
			c.fillStyle = "#8f7550";
			c.fillRect(0, 260, 960, 140);
			for (let i = 0; i < 9; i++) {
				const x = i * 120 - motion * 6;
				poly(
					c,
					[
						[x, 262],
						[x + 40, 170 + (i % 3) * 25],
						[x + 85, 190],
						[x + 120, 262],
					],
					"#5b4a36",
				);
			}
			for (let i = 0; i < 3; i++) {
				const x = 260 + i * 230,
					y = 330;
				c.fillStyle = "#2b2118";
				c.beginPath();
				c.ellipse(x, y, 46, 16, 0, 0, Math.PI * 2);
				c.fill();
				const open = Math.max(0, Math.sin(motion * 2 + i * 2));
				c.fillStyle = "#d98f6b";
				for (let k = -2; k <= 2; k++)
					poly(
						c,
						[
							[x + k * 14 - 5, y - 4],
							[x + k * 14, y - 4 - 18 * open],
							[x + k * 14 + 5, y - 4],
						],
						"#e7c091",
					);
			}
			glow(c, 820, 110, 60, "#f0cf8a55");
			c.fillStyle = "#f0cf8a";
			c.fillRect(816, 96, 8, 28);
		} else if (scene === 2) {
			c.fillStyle = "#8aa0ad";
			c.fillRect(0, 0, 960, 400);
			for (let layer = 0; layer < 3; layer++) {
				const pts = [[0, 400]];
				for (let x = -100; x < 1100; x += 90)
					pts.push([
						x - motion * (6 + layer * 8),
						170 + layer * 60 + Math.sin(x * 0.018 + layer) * 50,
					]);
				pts.push([1100, 400]);
				poly(c, pts, ["#b7c7cf", "#7b909c", "#3e5566"][layer]);
			}
			for (let i = 0; i < 3; i++)
				truck(c, 160 + i * 150 + motion * 28, 318 + (i % 2) * 10, 0.9);
			c.fillStyle = "#ffffff";
			for (let i = 0; i < 140; i++) {
				c.globalAlpha = 0.35;
				c.fillRect(
					(i * 83.1 + motion * 60 * (1 + (i % 3))) % 960,
					(i * 47.3 + motion * 90) % 400,
					2,
					2,
				);
			}
			c.globalAlpha = 1;
		} else {
			c.fillStyle = "#1d1614";
			c.fillRect(0, 250, 960, 150);
			for (let i = 0; i < 10; i++) {
				const x = i * 105 - motion * 3;
				poly(
					c,
					[
						[x, 252],
						[x + 30, 200 + (i % 4) * 12],
						[x + 80, 214],
						[x + 105, 252],
					],
					"#2c2220",
				);
			}
			const pulse = 0.6 + 0.4 * Math.sin(motion * 3);
			glow(
				c,
				560,
				230,
				170,
				"rgba(255,120,70," + (0.45 * pulse).toFixed(2) + ")",
			);
			poly(
				c,
				[
					[450, 260],
					[480, 170],
					[640, 170],
					[670, 260],
				],
				"#3a3230",
			);
			poly(
				c,
				[
					[505, 170],
					[525, 110],
					[595, 110],
					[615, 170],
				],
				"#4d403b",
			);
			glow(c, 560, 150, 40, "#ffcf8acc");
			c.fillStyle = "#fff3d6";
			c.beginPath();
			c.arc(560, 150, 9, 0, Math.PI * 2);
			c.fill();
			c.strokeStyle = "#ff9a6a88";
			c.lineWidth = 2;
			for (let i = 0; i < 5; i++) {
				c.beginPath();
				c.moveTo(560, 150);
				c.lineTo(
					560 + Math.cos(i * 1.3 + motion) * 260,
					150 + Math.sin(i * 1.3 + motion) * 120,
				);
				c.stroke();
			}
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
	return { draw, captions, duration };
})();
