/* Painted 2D volumes, faction architecture and decorative wildlife. */
const AdvancedArt = (() => {
	const cache = new Map();
	const poly = (c, pts, fill, stroke = "#202c30") => {
		c.beginPath();
		pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.closePath();
		c.fillStyle = fill;
		c.fill();
		if (stroke) {
			c.strokeStyle = stroke;
			c.lineWidth = 1;
			c.stroke();
		}
	};
	const ellipse = (c, x, y, rx, ry, fill) => {
		c.fillStyle = fill;
		c.beginPath();
		c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
		c.fill();
	};
	function block(c, x, y, w, d, h, tint, dom) {
		// Every roof and wall uses the same projection and upper-left light source.
		poly(
			c,
			[
				[x, y],
				[x + w, y],
				[x + w + 22, y + 19],
				[x + 22, y + 19],
			],
			"#07161a45",
			null,
		);
		poly(
			c,
			[
				[x, y - h],
				[x + w, y - h],
				[x + w, y + d],
				[x, y + d],
			],
			dom ? "#776c69" : "#677769",
		);
		poly(
			c,
			[
				[x + w, y - h],
				[x + w + 12, y - h - 9],
				[x + w + 12, y + d - 9],
				[x + w, y + d],
			],
			dom ? "#443e48" : "#384e4a",
		);
		const roof = c.createLinearGradient(x, y - h - 9, x + w, y + d - h);
		roof.addColorStop(0, dom ? "#c6b8a4" : "#c4c8ac");
		roof.addColorStop(1, dom ? "#8b8589" : "#8b9c85");
		poly(
			c,
			[
				[x, y - h],
				[x + 12, y - h - 9],
				[x + w + 12, y - h - 9],
				[x + w, y - h],
			],
			roof,
			"#e0d7bb",
		);
		// Rooftop platform with raised edging, tile seams and vents.
		poly(
			c,
			[
				[x, y - h],
				[x + w, y - h],
				[x + w, y + d - h],
				[x, y + d - h],
			],
			roof,
			"#d4d1b8",
		);
		c.strokeStyle = "#65726988";
		c.lineWidth = 0.7;
		for (let xx = x + 8; xx < x + w; xx += 10) {
			c.beginPath();
			c.moveTo(xx, y - h + 2);
			c.lineTo(xx, y + d - h - 2);
			c.stroke();
		}
		c.fillStyle = dom ? "#bba084" : "#a8b998";
		c.fillRect(x, y + d - h, w, 3);
		for (let row = 0; row < Math.floor(h / 9); row++) {
			c.strokeStyle = "#36444840";
			c.beginPath();
			c.moveTo(x, y + d - h + row * 9 + 3);
			c.lineTo(x + w, y + d - h + row * 9 + 3);
			c.stroke();
		}
		for (let xx = x + 6; xx < x + w - 4; xx += 12) {
			c.fillStyle = "#20343c";
			c.fillRect(xx, y + d - h + 7, 5, 7);
			c.fillStyle = "#b5c8b680";
			c.fillRect(xx + 1, y + d - h + 7, 3, 2);
		}
		c.fillStyle = tint;
		c.fillRect(x + 3, y + d - h + 2, 3, Math.max(8, h - 4));
	}
	function structure(c, e, time) {
		const key = e.type + (e.faction || e.team) + (e.tint || ""),
			r = RTS.TYPES[e.type].radius;
		if (!cache.has(key)) {
			const img = document.createElement("canvas");
			img.width = 320;
			img.height = 320;
			const p = img.getContext("2d");
			p.translate(150, 175);
			const tint = e.tint || (e.team === 0 ? "#b0efd0" : "#f07d78"),
				dom = e.faction === "dominion" || (!e.faction && e.team === 1);
			poly(
				p,
				[
					[-r - 8, -r * 0.6],
					[r + 10, -r * 0.6],
					[r + 35, r * 0.65 + 20],
					[-r + 14, r * 0.65 + 20],
				],
				"#08131b60",
				null,
			);
			poly(
				p,
				[
					[-r - 5, -r * 0.6],
					[r + 12, -r * 0.6],
					[r + 12, r * 0.65],
					[-r - 5, r * 0.65],
				],
				"#57615b",
				"#9e9c84",
			);
			for (let x = -r; x < r; x += 12) {
				p.strokeStyle = "#c4c6ae22";
				p.beginPath();
				p.moveTo(x, -r * 0.6);
				p.lineTo(x, r * 0.65);
				p.stroke();
			}
			if (e.type === "hq") {
				block(p, -54, -24, 100, 45, 28, tint, dom);
				block(p, -26, -28, 44, 24, 54, tint, dom);
				block(p, -62, 13, 24, 20, 20, tint, dom);
				p.fillStyle = "#253942";
				p.fillRect(-13, 14, 22, 25);
				p.strokeStyle = "#ddd3ad";
				p.lineWidth = 2;
				p.strokeRect(-13, 14, 22, 25);
			} else if (["factory", "hangar"].includes(e.type)) {
				block(p, -44, -22, 78, 47, 35, tint, dom);
				block(p, 25, -20, 17, 23, 53, tint, dom);
				p.fillStyle = "#1b2c36";
				p.fillRect(-31, -1, 49, 26);
				p.strokeStyle = "#879c91";
				for (let y = 3; y < 25; y += 5) {
					p.beginPath();
					p.moveTo(-30, y);
					p.lineTo(17, y);
					p.stroke();
				}
				if (e.type === "hangar") {
					p.strokeStyle = tint;
					p.lineWidth = 3;
					p.strokeRect(-23, -48, 35, 18);
					p.fillStyle = tint;
					p.font = "bold 15px sans-serif";
					p.fillText("H", -12, -34);
				}
			} else if (e.type === "barracks") {
				block(p, -38, -15, 31, 42, 27, tint, dom);
				block(p, 2, -23, 30, 42, 32, tint, dom);
				poly(
					p,
					[
						[-40, -42],
						[-20, -53],
						[-5, -42],
					],
					dom ? "#9f8a7b" : "#71876b",
				);
			} else if (e.type === "lab") {
				block(p, -32, -15, 58, 35, 28, tint, dom);
				const dome = p.createRadialGradient(-9, -51, 2, 0, -40, 24);
				dome.addColorStop(0, "#d2f3e7");
				dome.addColorStop(1, dom ? "#576681" : "#477978");
				ellipse(p, 0, -37, 24, 17, dome);
				p.strokeStyle = "#cbded3";
				p.beginPath();
				p.ellipse(0, -37, 13, 17, 0, 0, Math.PI * 2);
				p.stroke();
			} else if (e.type === "reactor") {
				block(p, -28, -15, 49, 32, 28, tint, dom);
				for (const x of [-16, 9]) {
					block(p, x, -5, 12, 16, 53, tint, dom);
					ellipse(p, x + 6, -55, 6, 3, tint);
				}
			} else if (e.type === "turret") {
				block(p, -19, -12, 32, 23, 37, tint, dom);
				ellipse(p, 0, -39, 16, 11, dom ? "#baa399" : "#b8c7af");
			} else {
				block(
					p,
					-r * 0.8,
					-r * 0.45,
					r * 1.45,
					r * 0.9,
					e.type === "extractor" ? 34 : 23,
					tint,
					dom,
				);
				if (e.type === "extractor") {
					p.strokeStyle = "#c5bad0";
					p.lineWidth = 4;
					p.beginPath();
					p.moveTo(-6, -20);
					p.lineTo(-6, -64);
					p.lineTo(16, -45);
					p.stroke();
				}
			}
			// Faction silhouette: banners and solar fins vs fortified roof turrets.
			if (dom) {
				for (const x of [-r * 0.7, r * 0.6])
					block(p, x, -r * 0.25, 9, 9, 40, tint, true);
			} else {
				p.strokeStyle = "#c6c8af";
				p.lineWidth = 2;
				p.beginPath();
				p.moveTo(r * 0.65, -10);
				p.lineTo(r * 0.65, -62);
				p.stroke();
				poly(
					p,
					[
						[r * 0.65, -62],
						[r * 0.65 + 18, -58],
						[r * 0.65, -49],
					],
					tint,
					null,
				);
			}
			cache.set(key, img);
		}
		c.drawImage(cache.get(key), -150, -175);
		if (e.type === "turret") {
			c.save();
			c.translate(0, -40);
			c.rotate(e.angle);
			c.fillStyle = "#c7cdb7";
			c.fillRect(0, -3, 28, 6);
			c.restore();
		}
		if (e.type === "reactor" || e.type === "factory")
			for (let i = 0; i < 3; i++) {
				const age = (time * 0.3 + i * 0.33 + e.id) % 1;
				c.globalAlpha = (1 - age) * 0.15;
				ellipse(
					c,
					25 + age * 14,
					-55 - age * 30,
					3 + age * 8,
					5 + age * 8,
					"#c4c6ba",
				);
			}
		c.globalAlpha = 1;
	}

	function threat(c, e, time) {
		const active = !!e.target,
			pulse = Math.sin(time * 2 + e.id);
		if (e.type === "duneMaw") {
			for (let i = 0; i < 4; i++)
				ellipse(
					c,
					0,
					0,
					63 - i * 9,
					44 - i * 6,
					["#aa82434a", "#82643fa0", "#64452f", "#241d21"][i],
				);
			ellipse(c, 0, 0, 29, 23, "#0c1017");
			for (let i = 0; i < 16; i++) {
				const a = (i * Math.PI) / 8,
					r = 32,
					inner = active ? 16 : 23;
				poly(
					c,
					[
						[Math.cos(a - 0.08) * r, Math.sin(a - 0.08) * r * 0.72],
						[Math.cos(a + 0.08) * r, Math.sin(a + 0.08) * r * 0.72],
						[Math.cos(a) * inner, Math.sin(a) * inner * 0.72],
					],
					"#ded1aa",
				);
			}
			c.strokeStyle = "#a58262";
			c.lineWidth = 5;
			for (let i = 0; i < 5; i++) {
				const a = i * Math.PI * 0.4 + time * 0.04;
				c.beginPath();
				c.moveTo(Math.cos(a) * 21, Math.sin(a) * 14);
				c.quadraticCurveTo(
					Math.cos(a + 0.4) * (45 + pulse * 3),
					Math.sin(a + 0.4) * 30,
					Math.cos(a + 0.1) * (active ? 69 : 49),
					Math.sin(a + 0.1) * 35,
				);
				c.stroke();
			}
		} else {
			c.save();
			c.rotate(e.angle);
			ellipse(c, 6, 9, 31, 17, "#07121d60");
			if (e.type === "frostTusk") {
				for (const x of [-15, 14])
					for (const side of [-1, 1]) {
						ellipse(c, x, side * 15, 6, 9, "#688388");
						ellipse(c, x, side * 19, 5, 3, "#dbe7dc");
					}
				ellipse(c, 0, -2, 26, 17, "#809d9f");
				ellipse(c, -5, -7, 22, 12, "#bdd2ce");
				ellipse(c, 24, 0, 12, 12, "#9bb5b8");
				for (const side of [-1, 1])
					poly(
						c,
						[
							[27, side * 6],
							[42, side * 17],
							[34, side * 2],
						],
						"#edf5df",
					);
				ellipse(c, 29, -5, 2, 2, "#e8bf80");
			} else {
				c.strokeStyle = "#8d6b79";
				c.lineWidth = 4;
				for (let i = 0; i < 4; i++)
					for (const side of [-1, 1]) {
						const x = -18 + i * 11;
						c.beginPath();
						c.moveTo(x, side * 7);
						c.lineTo(x - 8, side * (23 + pulse));
						c.lineTo(x + 5, side * 32);
						c.stroke();
					}
				ellipse(c, -5, 0, 24, 15, "#403d4d");
				ellipse(c, -8, -4, 18, 10, "#796578");
				for (let i = 0; i < 4; i++)
					ellipse(c, -18 + i * 9, -4, 3, 6, "#c58969");
				ellipse(c, 22, 0, 10, 9, "#6c4c56");
				for (const side of [-1, 1])
					poly(
						c,
						[
							[26, side * 4],
							[37, side * 13],
							[32, side * 2],
						],
						"#d8b293",
					);
			}
			c.restore();
		}
	}
	function habitats(c, g) {
		for (const e of g.entities.filter(
			(e) => RTS.TYPES[e.type].threat && e.hp > 0,
		)) {
			const h = e.home || e;
			if (!g.isVisible(h.x, h.y)) continue;
			c.save();
			c.translate(h.x, h.y);
			ellipse(
				c,
				0,
				0,
				135,
				100,
				e.type === "duneMaw"
					? "#98673c22"
					: e.type === "frostTusk"
						? "#588b9c22"
						: "#b2615122",
			);
			c.strokeStyle = "#ddaa6b70";
			c.lineWidth = 1.5;
			c.setLineDash([5, 10]);
			c.beginPath();
			c.ellipse(0, 0, 135, 100, 0, 0, Math.PI * 2);
			c.stroke();
			c.setLineDash([]);
			for (let i = 0; i < 7; i++) {
				const a = i * 2.4;
				ellipse(
					c,
					Math.cos(a) * (74 + i * 5),
					Math.sin(a) * (58 + i * 3),
					7,
					3,
					"#d1bc8b88",
				);
			}
			c.fillStyle = "#e1c493";
			c.font = "10px Segoe UI";
			c.textAlign = "center";
			c.fillText("⚠ " + RTS.TYPES[e.type].name.toUpperCase(), 0, 119);
			c.restore();
		}
	}
	function body(c, e, time, biome) {
		if (RTS.TYPES[e.type].threat) {
			threat(c, e, time);
			return true;
		}
		const s = RTS.TYPES[e.type],
			tint = e.tint || (e.team === 0 ? "#b0efd0" : "#f07d78");
		if (["trooper", "rocket"].includes(e.type)) {
			const dom =
					e.faction === "dominion" || (!e.faction && e.team !== 0),
				moving = !!e.path?.length,
				step = moving ? Math.sin(time * 11 + e.id) * 3 : 0;
			const fired = e.cooldown > s.cooldown - 0.12 && e.target,
				rocket = e.type === "rocket";
			c.save();
			c.rotate(e.angle);
			ellipse(c, 2, 4, 12, 7, "#06141a60");
			// Separated boots, angular shoulders and a compact helmet replace the oval body.
			for (const side of [-1, 1]) {
				c.fillStyle = "#22343b";
				c.fillRect(-13 + step * side, side < 0 ? -8 : 4, 11, 4);
				c.fillStyle = "#61716c";
				c.fillRect(-12 + step * side, side < 0 ? -8 : 4, 4, 4);
			}
			c.fillStyle = rocket ? "#8d7959" : "#435856";
			c.fillRect(-9, -8, 5, 16);
			poly(
				c,
				[
					[-5, -6],
					[2, -6],
					[5, -3],
					[5, 3],
					[2, 6],
					[-5, 6],
				],
				dom ? "#999297" : "#a4b49c",
			);
			for (const side of [-1, 1]) {
				c.fillStyle = dom ? "#b5acaa" : "#c1c9ae";
				c.fillRect(-3, side < 0 ? -11 : 7, 7, 4);
				c.fillStyle = "#34494c";
				c.fillRect(3, side < 0 ? -9 : 6, 7, 3);
			}
			c.fillStyle = tint;
			c.fillRect(-2, -11, 4, 2);
			c.fillRect(-2, 9, 4, 2);
			poly(
				c,
				[
					[0, -4],
					[5, -4],
					[8, -2],
					[8, 2],
					[5, 4],
					[0, 4],
				],
				dom ? "#d0c4b1" : "#d8d8ba",
			);
			c.fillStyle = "#193740";
			c.fillRect(6, -3, 2, 6);
			c.fillStyle = dom ? "#544955" : "#3d5658";
			c.fillRect(
				3 - (fired ? 2 : 0),
				rocket ? 3 : 2,
				rocket ? 17 : 15,
				rocket ? 5 : 3,
			);
			if (rocket) {
				c.fillStyle = "#c7b17b";
				c.fillRect(16, 2, 5, 7);
			}
			if (fired)
				poly(
					c,
					[
						[21, 2],
						[30, 4],
						[22, 6],
					],
					"#e9d998",
					null,
				);
			if (e.hit > 0) ellipse(c, 0, 0, 9, 7, "#fff1ca66");
			c.restore();
			return true;
		}
		if (e.type === "transport") {
			const dom = e.faction === "dominion",
				moving = !!e.path?.length;
			c.save();
			c.rotate(e.angle);
			ellipse(c, 4, 10, 31, 17, "#07141a60");
			for (const side of [-1, 1]) {
				c.fillStyle = "#1b292d";
				c.fillRect(-26, side * 17 - 5, 50, 10);
				c.strokeStyle = "#74817c";
				c.lineWidth = 2;
				for (let i = 0; i < 8; i++) {
					const x = -24 + i * 6 + (moving ? (time * 23) % 6 : 0);
					c.beginPath();
					c.moveTo(x, side * 17 - 4);
					c.lineTo(x, side * 17 + 4);
					c.stroke();
				}
			}
			poly(
				c,
				dom
					? [
							[-24, -14],
							[19, -14],
							[29, -7],
							[29, 8],
							[19, 14],
							[-24, 14],
						]
					: [
							[-23, -13],
							[19, -11],
							[28, -5],
							[28, 6],
							[18, 12],
							[-23, 13],
						],
				dom ? "#8e8387" : "#9bad9c",
			);
			poly(
				c,
				[
					[-23, 13],
					[18, 12],
					[28, 6],
					[28, 11],
					[18, 17],
					[-23, 18],
				],
				"#3c5153",
			);
			c.fillStyle = "#253c45";
			c.fillRect(11, -8, 9, 16);
			c.fillStyle = tint;
			c.fillRect(-20, -11, 25, 3);
			for (let i = 0; i < 4; i++) {
				c.fillStyle =
					i < (e.passengers || []).length ? "#b7edc5" : "#4b6062";
				c.fillRect(-18 + i * 7, -3, 5, 6);
			}
			ellipse(c, 4, 3, 7, 6, dom ? "#615865" : "#677f78");
			c.fillStyle = "#d4d4b4";
			c.fillRect(5, 1, 19, 3);
			if (e.target && e.cooldown > s.cooldown - 0.1)
				poly(
					c,
					[
						[24, 0],
						[32, 3],
						[24, 5],
					],
					"#f6dfa4",
					null,
				);
			if (e.hit > 0)
				poly(
					c,
					[
						[-23, -13],
						[19, -11],
						[28, -5],
						[28, 6],
						[18, 12],
						[-23, 13],
					],
					"#fff3cd55",
					null,
				);
			c.restore();
			return true;
		}
		if (e.type === "flak") {
			const dom = e.faction === "dominion";
			block(c, -28, -10, 46, 36, 16, tint, dom);
			ellipse(c, 0, -16, 23, 14, dom ? "#706778" : "#758e85");
			c.save();
			c.translate(0, -19);
			c.rotate(e.angle);
			const recoil = e.target && e.cooldown > s.cooldown - 0.13 ? 3 : 0;
			poly(
				c,
				[
					[-11, -10],
					[10, -10],
					[15, 0],
					[10, 10],
					[-11, 10],
				],
				dom ? "#aba0ac" : "#a9b9a2",
			);
			for (const side of [-1, 1]) {
				c.fillStyle = "#2f424a";
				c.fillRect(4 - recoil, side * 7 - 3, 27, 6);
				c.fillStyle = "#d2cfb5";
				c.fillRect(26 - recoil, side * 7 - 3, 5, 6);
				if (recoil) ellipse(c, 33, side * 7, 5, 3, "#ffd6a0");
			}
			c.restore();
			c.strokeStyle = "#c3c4a5";
			c.lineWidth = 2;
			c.beginPath();
			c.moveTo(-18, -25);
			c.lineTo(-18, -51);
			c.stroke();
			c.save();
			c.translate(-18, -51);
			c.rotate(e.constructionLeft ? 0 : time * 1.5);
			c.strokeStyle = tint;
			c.beginPath();
			c.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2);
			c.stroke();
			c.restore();
			return true;
		}
		if (e.type === "battery") {
			ellipse(c, 8, 15, 46, 24, "#07141a55");
			block(c, -34, -13, 58, 35, 15, tint, e.faction === "dominion");
			for (let i = 0; i < 3; i++) {
				const x = -25 + i * 18;
				block(c, x, -10, 12, 22, 30, tint, e.faction === "dominion");
				c.fillStyle = "#19323a";
				c.fillRect(x + 3, -28, 6, 18);
				const charge = Math.max(0, Math.min(1, (e.energy || 0) / 900));
				c.fillStyle = "#8de7cb";
				c.fillRect(x + 3, -10 - charge * 18, 6, charge * 18);
				c.strokeStyle = "#d8bd7a";
				c.lineWidth = 2;
				c.beginPath();
				c.moveTo(x + 6, -40);
				c.lineTo(x + 6, -45);
				c.lineTo(30, -45);
				c.stroke();
			}
			c.fillStyle = tint;
			c.fillRect(-24, 22, 40, 3);
			return true;
		}
		if (e.type === "workshop") {
			ellipse(c, 10, 20, 61, 31, "#07141a55");
			poly(
				c,
				[
					[-53, -18],
					[43, -18],
					[61, 36],
					[-43, 36],
				],
				"#495b5b",
			);
			block(c, -43, -23, 75, 30, 29, tint, e.faction === "dominion");
			for (let i = 0; i < 2; i++) {
				const x = -33 + i * 38;
				c.fillStyle = "#172a30";
				c.fillRect(x, -13, 28, 30);
				c.fillStyle = "#6b8384";
				c.fillRect(x, -13, 28, 4);
				c.fillStyle = "#abb28c";
				for (let y = 20; y < 34; y += 6) c.fillRect(x, y, 28, 2);
				c.fillStyle =
					(e.repairTargets || []).length > i ? "#a7efce" : "#cdad69";
				c.fillRect(x + 3, -9, 22, 2);
				if ((e.repairTargets || []).length > i) {
					ellipse(
						c,
						x + 14,
						7,
						8 + Math.sin(time * 5) * 2,
						4,
						"#85e6c833",
					);
				}
			}
			block(c, 35, -10, 12, 28, 21, tint, false);
			c.strokeStyle = "#d1bd81";
			c.lineWidth = 4;
			c.beginPath();
			c.moveTo(43, 8);
			c.lineTo(43, -42);
			c.lineTo(8, -42);
			c.stroke();
			c.strokeStyle = "#34484d";
			c.lineWidth = 1.5;
			c.beginPath();
			c.moveTo(10, -42);
			c.lineTo(10, -26);
			c.stroke();
			c.fillStyle = tint;
			c.font = "bold 16px Segoe UI";
			c.textAlign = "center";
			c.fillText("⚒", -4, -29);
			return true;
		}
		if (s.flying) {
			ellipse(c, 18, 22, s.radius * 1.2, s.radius * 0.55, "#06141b55");
			c.save();
			c.translate(0, -25 - Math.sin(time * 2 + e.id) * 2);
			c.rotate(e.angle);
			const bomber = e.type === "bomber",
				r = s.radius;
			poly(
				c,
				[
					[r + 12, 0],
					[-r, -r],
					[-r * 0.5, -3],
					[-r, r],
					[-r + 10, 0],
				],
				bomber ? "#a99f8b" : "#aabfc4",
			);
			poly(
				c,
				[
					[r + 12, 0],
					[-r + 10, 0],
					[-r, r],
				],
				"#586a75",
			);
			poly(
				c,
				[
					[r, 0],
					[0, -4],
					[0, 4],
				],
				tint,
			);
			ellipse(c, -r + 5, 0, 5, 3, "#8be4ff");
			if (bomber) {
				poly(
					c,
					[
						[r + 5, -6],
						[r + 5, 6],
						[-r + 2, 10],
						[-r + 2, -10],
					],
					"#918c83",
				);
				for (const side of [-1, 1]) {
					poly(
						c,
						[
							[-r, side * 18],
							[-r - 6, side * 18],
							[-r - 6, side * 10],
							[2, side * 10],
							[7, side * 15],
						],
						"#536878",
					);
					ellipse(c, -r - 5, side * 14, 5, 3, "#85dcff");
				}
				poly(
					c,
					[
						[r + 5, -4],
						[r + 10, 0],
						[r + 5, 4],
						[r - 7, 3],
						[r - 7, -3],
					],
					tint,
				);
			}
			c.restore();
			return true;
		}
		// Preserve the detailed original machinery and its working animations.
		if (e.type === "wall" || e.type === "gate") {
			c.save();
			c.rotate(e.wallAngle || 0);
			PlanetArt.body(c, e, time, biome);
			c.restore();
			return true;
		}
		if (!s.speed && e.type !== "hangar") return false;
		if (e.type === "hangar") {
			structure(c, e, time);
			return true;
		}
		if (["raider", "sentinel"].includes(e.type)) {
			const heavy = e.type === "sentinel",
				moving = !!e.path?.length,
				recoil = e.target && e.cooldown > s.cooldown - 0.13 ? 2 : 0;
			c.save();
			c.rotate(e.angle);
			ellipse(c, 3, 6, heavy ? 28 : 22, heavy ? 19 : 13, "#07121d60");
			if (heavy) {
				// Exposed track pods and a sloped glacis give the Bastion a broad, armored stance.
				for (const side of [-1, 1]) {
					const y = side * 16;
					poly(
						c,
						[
							[-25, y - 5],
							[18, y - 5],
							[24, y],
							[18, y + 5],
							[-25, y + 5],
							[-28, y],
						],
						"#243139",
					);
					c.strokeStyle = "#88918c";
					c.lineWidth = 2;
					for (let i = 0; i < 8; i++) {
						const x = -23 + i * 5 + (moving ? (time * 18) % 5 : 0);
						c.beginPath();
						c.moveTo(x, y - 3);
						c.lineTo(x, y + 3);
						c.stroke();
					}
				}
				poly(
					c,
					[
						[-23, -11],
						[12, -12],
						[24, -6],
						[24, 7],
						[12, 13],
						[-23, 11],
					],
					"#655e69",
				);
				poly(
					c,
					[
						[-19, -10],
						[7, -10],
						[17, -5],
						[17, 6],
						[7, 10],
						[-19, 9],
					],
					"#aaa0a2",
				);
				c.fillStyle = "#3e424c";
				for (let i = 0; i < 4; i++) c.fillRect(-19 + i * 3, -7, 2, 14);
				poly(
					c,
					[
						[-7, -9],
						[6, -10],
						[13, -5],
						[13, 5],
						[6, 10],
						[-7, 8],
						[-11, 0],
					],
					"#bcb1a3",
				);
				poly(
					c,
					[
						[-7, 8],
						[6, 10],
						[13, 5],
						[13, 8],
						[6, 13],
						[-7, 11],
					],
					"#534e5a",
				);
				c.fillStyle = "#303c47";
				c.fillRect(6 - recoil, -3, 24, 6);
				c.fillStyle = "#c8c3ad";
				c.fillRect(26 - recoil, -4, 7, 8);
				c.fillStyle = tint;
				c.fillRect(-5, -7, 8, 2);
				c.fillRect(15, -10, 5, 3);
			} else {
				// Lightweight four-wheel scout: open wheel gaps, pointed nose and glazed cockpit.
				for (const x of [-13, 11])
					for (const side of [-1, 1]) {
						ellipse(c, x, side * 10, 6, 3.5, "#172c32");
						c.fillStyle = "#7c8980";
						c.fillRect(x - 3, side * 10 - 1, 6, 2);
					}
				poly(
					c,
					[
						[-19, -5],
						[-7, -8],
						[10, -6],
						[22, -2],
						[22, 3],
						[10, 7],
						[-7, 8],
						[-19, 5],
					],
					"#80998b",
				);
				poly(
					c,
					[
						[-16, 5],
						[-6, 8],
						[10, 7],
						[22, 3],
						[20, 6],
						[9, 10],
						[-7, 11],
					],
					"#354f50",
				);
				poly(
					c,
					[
						[-8, -6],
						[3, -5],
						[9, -2],
						[9, 3],
						[2, 5],
						[-8, 5],
					],
					"#c4cbb0",
				);
				poly(
					c,
					[
						[-4, -4],
						[3, -3],
						[7, -1],
						[7, 2],
						[2, 3],
						[-4, 3],
					],
					"#234854",
				);
				c.fillStyle = "#85b4b7";
				c.fillRect(0, -3, 2, 5);
				c.fillStyle = tint;
				c.fillRect(11, -4, 7, 2);
				c.fillStyle = "#263b42";
				c.fillRect(-3 - recoil, 7, 24, 3);
				c.fillStyle = "#c5cab5";
				c.fillRect(17 - recoil, 7, 5, 3);
				c.strokeStyle = "#8da99c";
				c.lineWidth = 1;
				c.beginPath();
				c.moveTo(-13, -5);
				c.lineTo(-20, -15);
				c.stroke();
			}
			if (recoil)
				poly(
					c,
					heavy
						? [
								[34, -3],
								[42, 0],
								[34, 3],
							]
						: [
								[23, 6],
								[30, 8],
								[23, 10],
							],
					"#ffe1a1",
					null,
				);
			if (e.hit > 0)
				ellipse(c, 0, 0, heavy ? 20 : 14, heavy ? 10 : 6, "#fff1cd55");
			c.restore();
			return true;
		}
		return PlanetArt.body(c, e, time, biome);
	}
	function walls(c, g) {
		const nodes = g.entities.filter(
			(e) => e.hp > 0 && ["wall", "gate", "turret"].includes(e.type),
		);
		for (let i = 0; i < nodes.length; i++)
			for (let j = i + 1; j < nodes.length; j++) {
				const a = nodes[i],
					b = nodes[j],
					d = RTS.dist(a, b);
				if (
					a.team !== b.team ||
					d > 70 ||
					d < 30 ||
					(!g.isVisible(a.x, a.y) && !g.isVisible(b.x, b.y))
				)
					continue;
				if (a.open || b.open) continue;
				if (a.type === "wall" && b.type === "wall" && d > 70) continue;
				const dx = (b.x - a.x) / d,
					dy = (b.y - a.y) / d,
					nx = -dy * 9,
					ny = dx * 9;
				c.save();
				c.globalAlpha =
					a.constructionLeft || b.constructionLeft ? 0.35 : 1;
				poly(
					c,
					[
						[a.x + nx, a.y + ny],
						[b.x + nx, b.y + ny],
						[b.x + nx, b.y + ny - 20],
						[a.x + nx, a.y + ny - 20],
					],
					"#526b70",
				);
				poly(
					c,
					[
						[a.x + nx, a.y + ny - 20],
						[b.x + nx, b.y + ny - 20],
						[b.x - nx, b.y - ny - 20],
						[a.x - nx, a.y - ny - 20],
					],
					"#849a9a",
				);
				c.restore();
			}
	}
	function fauna(c, g) {
		PlanetArt.fauna(c, g);
		for (const a of g
			.wildlife()
			.filter((a) => !["bird", "fish"].includes(a.kind))) {
			if (!g.isVisible(a.x, a.y)) continue;
			c.save();
			c.translate(a.x, a.y);
			animal(c, a, g.time);
			c.restore();
		}
	}
	// One land animal at the origin: shadow, legs in step, body, head and its kind's trim.
	// turn: the slow sway of the body (the WebGL renderer turns its sprite instead).
	function animal(c, a, time, turn = true) {
		if (turn) c.rotate(Math.sin(time * 0.08 + a.id) * 0.3);
		ellipse(c, 3, 5, 10, 4, "#09182340");
		const col =
			a.kind === "fox"
				? "#d2c6b3"
				: a.kind === "lizard"
					? "#8d996a"
					: a.kind === "deer"
						? "#b6a082"
						: "#858e91";
		c.strokeStyle = col;
		c.lineWidth = 2;
		for (const x of [-5, 5])
			for (const side of [-1, 1]) {
				c.beginPath();
				c.moveTo(x, side * 3);
				c.lineTo(x + Math.sin(time * 3 + a.id + x) * 2, side * 7);
				c.stroke();
			}
		ellipse(c, 0, 0, 9, 4, col);
		ellipse(c, 10, -1, 4, 3, col);
		if (a.kind === "deer") {
			for (const side of [-1, 1]) {
				c.beginPath();
				c.moveTo(11, side * 2);
				c.lineTo(15, side * 8);
				c.lineTo(18, side * 6);
				c.stroke();
			}
		} else if (a.kind === "hare") {
			ellipse(c, 12, -4, 2, 5, col);
			ellipse(c, 8, -4, 2, 5, col);
		} else {
			c.beginPath();
			c.moveTo(-7, 0);
			c.quadraticCurveTo(-17, 7, -22, 1);
			c.stroke();
		}
	}
	function terrain(c, g) {
		for (const r of g.obstacles.filter((r) => !r.kind)) {
			poly(
				c,
				[
					[r.x + r.w * 0.13, r.y + r.h],
					[r.x + r.w * 0.79, r.y + r.h],
					[r.x + r.w * 0.79 + 13, r.y + r.h + 20],
					[r.x + r.w * 0.13 + 13, r.y + r.h + 20],
				],
				"#343d36",
				"#54604d",
			);
			for (let i = 0; i < 6; i++) {
				c.strokeStyle = "#a29e7040";
				c.beginPath();
				c.moveTo(r.x + r.w * 0.2 + i * 14, r.y + r.h);
				c.lineTo(r.x + r.w * 0.2 + i * 14 + 10, r.y + r.h + 17);
				c.stroke();
			}
		}
	}
	function factionDetails(c, e, time) {
		if (!["hq", "barracks", "factory", "lab"].includes(e.type)) return;
		const dom = e.faction === "dominion" || (!e.faction && e.team !== 0),
			tint = e.tint || (e.team === 0 ? "#b0efd0" : "#f07d78");
		if (dom) {
			for (const side of [-1, 1])
				poly(
					c,
					[
						[side * 27, -12],
						[side * 39, -5],
						[side * 38, 22],
						[side * 29, 16],
					],
					"#746675",
					"#a59598",
				);
			poly(
				c,
				[
					[-9, -47],
					[9, -47],
					[14, -39],
					[0, -30],
					[-14, -39],
				],
				"#524755",
				tint,
			);
		} else {
			for (let i = 0; i < 3; i++)
				poly(
					c,
					[
						[17 + i * 6, -37],
						[21 + i * 6, -39],
						[21 + i * 6, -28],
						[17 + i * 6, -26],
					],
					"#486c76",
					"#9fbbb4",
				);
			c.strokeStyle = "#abbcad";
			c.lineWidth = 2;
			c.beginPath();
			c.moveTo(-27, -23);
			c.lineTo(-27, -53);
			c.stroke();
			ellipse(
				c,
				-27,
				-54,
				2,
				2,
				e.constructionLeft
					? "#a3af97"
					: Math.sin(time * 2) > 0
						? tint
						: "#577f7a",
			);
		}
	}
	return { body, walls, fauna, animal, terrain, habitats, factionDetails };
})();
