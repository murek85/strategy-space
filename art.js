/* Procedural 2D artwork. Reads simulation state without changing it. */
const BoardArt = (() => {
	const cache = new Map(),
		teams = ["#9ae5cb", "#ed8277"];
	function poly(c, p, fill, stroke = "#111f27") {
		c.beginPath();
		p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.closePath();
		c.fillStyle = fill;
		c.fill();
		if (stroke) {
			c.strokeStyle = stroke;
			c.lineWidth = 1;
			c.stroke();
		}
	}
	function rect(c, x, y, w, h, color) {
		c.fillStyle = color;
		c.fillRect(x, y, w, h);
	}
	function line(c, p, color, width = 1) {
		c.strokeStyle = color;
		c.lineWidth = width;
		c.beginPath();
		p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.stroke();
	}
	function ellipse(c, x, y, rx, ry, color) {
		c.fillStyle = color;
		c.beginPath();
		c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
		c.fill();
	}
	function box(c, x, y, w, h, z, color = "#697d79") {
		poly(
			c,
			[
				[x, y],
				[x + w, y],
				[x + w, y + h],
				[x, y + h],
			],
			"#273c43",
		);
		poly(
			c,
			[
				[x + w, y - z],
				[x + w + 7, y + 4 - z],
				[x + w + 7, y + h],
				[x + w, y + h - z],
			],
			"#30474c",
		);
		poly(
			c,
			[
				[x, y - z],
				[x + w, y - z],
				[x + w, y + h - z],
				[x, y + h - z],
			],
			color,
			"#a4aaa080",
		);
		poly(
			c,
			[
				[x, y + h - z],
				[x + w, y + h - z],
				[x + w, y + h],
				[x, y + h],
			],
			"#3e5559",
		);
		line(
			c,
			[
				[x + 2, y - z + 2],
				[x + w - 2, y - z + 2],
			],
			"#c9d0b37a",
		);
	}
	function vent(c, x, y, w, h) {
		rect(c, x, y, w, h, "#172a31");
		for (let i = 3; i < h; i += 4)
			line(
				c,
				[
					[x + 2, y + i],
					[x + w - 2, y + i],
				],
				"#6a8080",
			);
	}
	function hazard(c, x, y, w) {
		rect(c, x, y, w, 5, "#323e3d");
		for (let i = 0; i < w - 4; i += 9)
			poly(
				c,
				[
					[x + i, y],
					[x + i + 5, y],
					[x + i + 1, y + 5],
					[x + i - 3, y + 5],
				],
				"#d1b774",
				null,
			);
	}
	function pad(c, r) {
		poly(
			c,
			[
				[-r, -r * 0.65],
				[r * 0.8, -r * 0.65],
				[r, r * 0.55],
				[r * 0.8, r * 0.85],
				[-r, r * 0.85],
			],
			"#38474a",
			"#657171",
		);
		for (let i = -r + 8; i < r; i += 16)
			line(
				c,
				[
					[i, -r * 0.6],
					[i, r * 0.8],
				],
				"#1a30333d",
			);
		hazard(c, -r + 4, r * 0.7, r * 1.65);
	}
	function building(type, team, tint) {
		const key = type + team + (tint || "");
		if (cache.has(key)) return cache.get(key);
		const img = document.createElement("canvas");
		img.width = 320;
		img.height = 320;
		const c = img.getContext("2d");
		c.scale(2, 2);
		c.translate(80, 90);
		const color = tint || teams[team] || "#b2cad0",
			metal = team ? "#8a7770" : "#7d9288";
		if (type === "hq") {
			pad(c, 68);
			box(c, -57, -35, 110, 65, 20, metal);
			box(c, -35, -44, 59, 34, 26, "#a0aaa0");
			box(c, -58, 9, 23, 29, 10, "#667d7c");
			vent(c, 30, -42, 18, 27);
			vent(c, -29, -64, 42, 12);
			rect(c, -27, -33, 49, 7, "#192d39");
			rect(c, -25, -32, 45, 2, color);
			box(c, -24, 13, 45, 20, 8, "#586b6b");
			rect(c, -19, 19, 35, 17, "#15272e");
			for (let i = 0; i < 4; i++)
				line(
					c,
					[
						[-17, 22 + i * 4],
						[13, 22 + i * 4],
					],
					"#50676c",
				);
			hazard(c, -25, 39, 49);
			line(
				c,
				[
					[42, -35],
					[42, -82],
				],
				"#bec6b1",
				3,
			);
			ellipse(c, 42, -78, 13, 5, "#bcc9b4");
			line(
				c,
				[
					[29, -78],
					[42, -68],
					[55, -78],
				],
				"#778c86",
				2,
			);
			ellipse(c, 42, -83, 2, 2, color);
			for (let i = 0; i < 4; i++) rect(c, -49 + i * 17, 3, 9, 3, color);
			rect(c, -56, 36, 15, 4, color);
		} else if (type === "barracks") {
			pad(c, 45);
			box(c, -36, -27, 30, 53, 15, metal);
			box(c, 4, -27, 30, 53, 15, metal);
			box(c, -8, -8, 14, 27, 9, "#546c69");
			for (const x of [-32, 8]) {
				vent(c, x, -37, 21, 11);
				for (let y = -15; y < 20; y += 12) rect(c, x, y, 21, 3, color);
				rect(c, x + 4, 16, 13, 11, "#152830");
			}
			hazard(c, -33, 34, 60);
			line(
				c,
				[
					[36, -22],
					[36, -57],
				],
				"#aeb9aa",
				2,
			);
			poly(
				c,
				[
					[36, -55],
					[55, -51],
					[36, -44],
				],
				color,
				null,
			);
		} else if (type === "factory") {
			pad(c, 57);
			box(c, -46, -34, 82, 67, 24, metal);
			box(c, -33, -40, 58, 24, 25, "#99a59a");
			vent(c, -25, -60, 43, 12);
			rect(c, -32, -5, 58, 33, "#182830");
			for (let y = -3; y < 27; y += 6)
				line(
					c,
					[
						[-30, y],
						[24, y],
					],
					"#5b7475",
					3,
				);
			rect(c, -33, -9, 59, 4, color);
			hazard(c, -36, 33, 69);
			box(c, 40, -16, 12, 44, 10, "#6d837c");
			for (let i = 0; i < 3; i++)
				ellipse(c, 46, -32 + i * 16, 6, 4, "#b3b7a1");
			line(
				c,
				[
					[-51, -19],
					[-51, -57],
					[-37, -57],
				],
				"#a9ad91",
				4,
			);
		} else if (type === "depot") {
			pad(c, 35);
			box(c, -27, -20, 22, 34, 10, "#ab9771");
			box(c, 0, -26, 25, 39, 12, metal);
			for (let x = -23; x < 23; x += 6)
				line(
					c,
					[
						[x, -21],
						[x, 4],
					],
					"#283c4166",
				);
			box(c, -21, 17, 17, 12, 5, "#bdac7b");
			box(c, 3, 15, 17, 13, 5, "#839b91");
			rect(c, -24, -27, 16, 3, color);
			rect(c, 4, -36, 17, 3, color);
			line(
				c,
				[
					[-30, 35],
					[27, 35],
				],
				"#d3c9a0",
				2,
			);
		} else if (type === "extractor") {
			pad(c, 34);
			ellipse(c, -20, 0, 10, 22, "#384554");
			box(c, -28, -16, 14, 32, 11, "#aca6ae");
			ellipse(c, -21, -28, 7, 4, "#d6b7e3");
			line(
				c,
				[
					[-15, 10],
					[0, 10],
					[0, -4],
				],
				"#b8a8c5",
				4,
			);
			poly(
				c,
				[
					[-8, 15],
					[1, -53],
					[23, 15],
				],
				"#526671",
				"#96aaa5",
			);
			for (let y = -36; y < 16; y += 12)
				line(
					c,
					[
						[0, y],
						[17, y + 10],
						[-4, y + 10],
					],
					"#b7b7a7",
					2,
				);
			rect(c, 1, -20, 8, 37, "#1b2c39");
			rect(c, 3, -18, 4, 34, "#b39abc");
			box(c, 17, 7, 13, 18, 7, "#7e9090");
			rect(c, 20, 3, 7, 4, color);
			hazard(c, -11, 24, 35);
		} else if (type === "reactor") {
			pad(c, 37);
			box(c, -29, -17, 53, 40, 13, "#647b7b");
			ellipse(c, 0, -13, 22, 17, "#30444f");
			ellipse(c, 0, -21, 18, 14, "#b3bbaa");
			ellipse(c, 0, -23, 12, 9, "#345765");
			ellipse(c, 0, -25, 7, 5, "#a4eacb");
			for (const x of [-29, 22]) {
				box(c, x, -22, 8, 42, 10, "#798d89");
				vent(c, x, -28, 8, 22);
			}
			hazard(c, -25, 29, 52);
			rect(c, -18, 15, 35, 3, color);
		} else if (type === "lab") {
			pad(c, 41);
			box(c, -33, -20, 62, 43, 15, metal);
			ellipse(c, 0, -26, 23, 18, "#375e6a");
			ellipse(c, -3, -30, 18, 13, "#91c4ca");
			line(
				c,
				[
					[-22, -27],
					[20, -27],
				],
				"#d6eee3",
				2,
			);
			line(
				c,
				[
					[0, -44],
					[0, -12],
				],
				"#d6eee3",
				2,
			);
			box(c, -28, 13, 18, 15, 7, "#8a9690");
			rect(c, -25, 11, 11, 3, color);
			vent(c, 17, -4, 12, 16);
			line(
				c,
				[
					[29, -19],
					[29, -57],
				],
				"#b5c5b9",
				2,
			);
			ellipse(c, 29, -55, 9, 4, "#d5dcb9");
		} else if (type === "turret") {
			pad(c, 27);
			ellipse(c, 0, -2, 23, 18, "#283f45");
			ellipse(c, 0, -6, 18, 14, metal);
			ellipse(c, 0, -6, 11, 8, "#233941");
			for (const [x, y] of [
				[-20, 13],
				[16, 13],
				[-20, -17],
				[16, -17],
			])
				rect(c, x, y, 5, 4, color);
		}
		// Fasteners and bright edges share one top-left light source.
		cache.set(key, img);
		return img;
	}
	function body(c, e, time, target, working) {
		const s = RTS.TYPES[e.type],
			color = e.tint || teams[e.team] || "#bbc1e2",
			metal = e.team ? "#b09a8c" : "#c0cbb7",
			dark = e.team ? "#685455" : "#536f6d";
		if (!s.speed) {
			c.drawImage(building(e.type, e.faction ? (e.faction === "dominion" ? 1 : 0) : e.team, e.tint), -80, -90, 160, 160);
			if (e.type === "reactor" && !e.constructionLeft) {
				ellipse(c, 0, -25, 4 + Math.sin(time * 3) * 1.3, 3, "#b9ffd1");
			}
			if (e.type === "lab" && !e.constructionLeft) {
				ellipse(
					c,
					Math.sin(time) * 12,
					-27 + Math.cos(time) * 5,
					2,
					2,
					"#d9faf5",
				);
			}
			if (e.type === "extractor" && working && !e.constructionLeft) {
				rect(c, 3, -15 + Math.sin(time * 12) * 4, 4, 12, "#edc5ff");
				for (let i = 0; i < 3; i++)
					ellipse(
						c,
						11 + i * 5,
						-42 - ((time * 13 + i * 9) % 22),
						3,
						5,
						"#d3a0ef30",
					);
			}
			if (e.type === "turret") {
				c.save();
				c.translate(0, -7);
				c.rotate(e.angle);
				box(c, -12, -10, 24, 20, 3, dark);
				for (const y of [-6, 5]) {
					rect(c, 8, y, 24, 4, "#bdc7ba");
					rect(c, 28, y - 1, 7, 6, "#455c64");
				}
				rect(c, -9, -7, 4, 15, color);
				c.restore();
			}
			if (e.hp < e.maxHp * 0.45 && !e.constructionLeft) {
				for (let i = 0; i < 3; i++) {
					const rise = (time * 10 + i * 11) % 32;
					ellipse(
						c,
						12 + rise * 0.23,
						-22 - rise,
						4 + rise * 0.13,
						6 + rise * 0.12,
						"#10191a65",
					);
				}
			}
			return;
		}
		let direction = e.angle;
		if (e.type === "tank" && e.path.length) {
			const p = e.path[0];
			direction = Math.atan2(p.y - e.y, p.x - e.x);
		}
		c.save();
		c.rotate(direction);
		const moving = e.path.length > 0,
			step = moving ? Math.sin(time * 13 + e.id) * 3 : 0;
		if (e.type === "tank") {
			for (const y of [-21, 12]) {
				rect(c, -26, y, 48, 10, "#15252d");
				for (let x = -23; x < 22; x += 7) {
					rect(
						c,
						x + (moving ? (time * 12) % 6 : 0),
						y + 1,
						3,
						8,
						"#607577",
					);
				}
				line(
					c,
					[
						[-25, y],
						[22, y],
					],
					"#a5aaa0",
				);
			}
			poly(
				c,
				[
					[-25, -12],
					[15, -15],
					[28, -7],
					[28, 8],
					[15, 15],
					[-25, 12],
				],
				dark,
				"#b0bbae",
			);
			poly(
				c,
				[
					[-20, -10],
					[11, -12],
					[19, -6],
					[19, 7],
					[11, 12],
					[-20, 10],
				],
				metal,
			);
			vent(c, -21, -8, 12, 16);
			rect(c, 14, -12, 6, 3, color);
			rect(c, 14, 10, 6, 3, color);
			rect(c, -23, -13, 7, 3, "#ed966b");
			c.restore();
			c.save();
			c.rotate(
				target ? Math.atan2(target.y - e.y, target.x - e.x) : e.angle,
			);
			c.translate(-Math.max(0, e.cooldown - (s.cooldown - 0.12)) * 22, 0);
			ellipse(c, 0, 0, 13, 12, "#324b53");
			poly(
				c,
				[
					[-10, -8],
					[8, -10],
					[15, -4],
					[15, 6],
					[7, 11],
					[-11, 8],
				],
				dark,
				"#aabbaa",
			);
			rect(c, -7, -6, 10, 12, metal);
			rect(c, 6, -3, 27, 6, "#b5c5bb");
			rect(c, 29, -4, 8, 8, "#435b64");
			rect(c, -8, -9, 11, 3, color);
			ellipse(c, -3, 0, 4, 4, "#4b656c");
			c.restore();
			return;
		} else if (e.type === "worker") {
			// Keep both tracks outside the raised hull and cargo silhouette.
			const treadOffset = e.path.length ? (time * 18) % 6 : 0;
			for (const y of [-19, 11]) {
				rect(c, -17, y, 32, 8, "#14232b");
				rect(c, -16, y, 30, 1, "#b5c0ba");
				rect(c, -16, y + 7, 30, 1, "#7b9295");
				for (let x = -16 + treadOffset; x < 13; x += 6)
					rect(c, x, y + 1, 2, 6, "#8c9d9c");
			}
			box(c, -13, -7, 24, 15, 3, "#baa26d");
			vent(c, -10, -10, 9, 9);
			rect(c, 0, -8, 10, 3, color);
			rect(c, -10, 2, 14, 7, "#273f49");
			if (e.cargo > 0)
				for (let i = 0; i < Math.min(5, Math.ceil(e.cargo / 12)); i++)
					poly(
						c,
						[
							[-10 + i * 3, 6],
							[-9 + i * 3, 0],
							[-6 + i * 3, 4],
						],
						e.cargoKind === "crystal" ? "#edcf79" : "#8bdadf",
						null,
					);
			const pulse = working ? Math.sin(time * 18) * 2 : 0;
			line(
				c,
				[
					[8, -6],
					[17, -10],
					[24 + pulse, -6],
				],
				"#d4c48b",
				3,
			);
			line(
				c,
				[
					[8, 6],
					[17, 10],
					[24 + pulse, 6],
				],
				"#d4c48b",
				3,
			);
			rect(c, 19 + pulse, -4, 6, 8, "#a6b3aa");
			rect(c, 22 + pulse, -3, 4, 6, "#5cc6d7");
		} else {
			rect(c, -10 + step, -8, 12, 5, "#26383e");
			rect(c, -10 - step, 4, 12, 5, "#26383e");
			rect(c, -9, -10, 10, 20, dark);
			poly(
				c,
				[
					[-6, -7],
					[5, -8],
					[10, -3],
					[10, 4],
					[4, 8],
					[-6, 7],
				],
				metal,
			);
			ellipse(c, 2, -1, 6, 6, dark);
			ellipse(c, 3, -2, 5, 4, metal);
			rect(c, 5, -5, 3, 6, "#142b3b");
			rect(c, 6, -4, 2, 4, color);
			rect(c, -3, -11, 7, 4, metal);
			rect(c, -3, 8, 7, 4, color);
			rect(c, 3, 5, 9, 4, dark);
			if (e.type === "rocket") {
				rect(c, -8, -8, 6, 16, "#b49e70");
				rect(c, -3, 8, 26, 7, "#c5bb91");
				rect(c, 19, 7, 6, 9, "#455968");
				rect(c, -6, 7, 5, 9, "#554f41");
				rect(c, 6, 9, 8, 2, color);
			} else {
				rect(c, 8, 5, 16, 3, "#263e4a");
				rect(c, 9, 5, 6, 2, "#9aafad");
				rect(c, 22, 4, 3, 5, "#70978e");
			}
		}
		c.restore();
	}
	// label = false leaves out the amount (the WebGL renderer draws it as separate text).
	// Deposits: ore is a layered rock outcrop with metal veins that glint, gas a vent crater with glowing
	// fissures and rising mist, crystals translucent golden prisms. Each shrinks over six stages as it is
	// mined; an exhausted deposit has its own look (a dug pit, a dead vent, broken stumps). The look
	// depends only on the kind and the stage, so the WebGL ground can share one texture per stage.
	const STAGES = { ore: [300, 900, 1800, 3000, 4500], gas: [200, 500, 1000, 1600, 2300], crystal: [100, 300, 600, 1000, 1500] };
	function stage(amount, kind) {
		if (amount <= 0) return 0;
		let n = 1;
		for (const t of STAGES[kind]) if (amount >= t) n++;
		return n;
	}
	const ROCK = { ore: ["#4c5557", "#30393c", "#6b7577"], gas: ["#4a4250", "#2f2936", "#655a6d"] };
	// A four-pointed glint.
	function glint(c, x, y, r, color) {
		line(c, [[x - r, y], [x + r, y]], color, 1);
		line(c, [[x, y - r], [x, y + r]], color, 1);
		ellipse(c, x, y, 1.3, 1.3, color);
	}
	// A rock with a lit top facet, a shaded side and strata; with metal, a vein that catches the light.
	function boulder(c, x, y, s, palette, metal, shine = false) {
		const [body, shade, lit] = palette;
		poly(c, [[x - s, y + s * 0.35], [x - s * 0.85, y - s * 0.35], [x - s * 0.3, y - s * 0.75], [x + s * 0.45, y - s * 0.65], [x + s, y - s * 0.1], [x + s * 0.8, y + s * 0.45], [x - s * 0.2, y + s * 0.6]], body, "#1a2226");
		poly(c, [[x + s * 0.45, y - s * 0.65], [x + s, y - s * 0.1], [x + s * 0.8, y + s * 0.45], [x - s * 0.2, y + s * 0.6], [x + s * 0.1, y + s * 0.1]], shade, null);
		poly(c, [[x - s * 0.85, y - s * 0.35], [x - s * 0.3, y - s * 0.75], [x + s * 0.45, y - s * 0.65], [x + s * 0.1, y - s * 0.2], [x - s * 0.5, y - s * 0.1]], lit, null);
		line(c, [[x - s * 0.9, y + s * 0.12], [x - s * 0.2, y + s * 0.22], [x + s * 0.6, y + s * 0.06]], "#1d25284d", 1);
		if (metal) {
			line(c, [[x - s * 0.55, y + s * 0.32], [x - s * 0.15, y - s * 0.04], [x + s * 0.25, y + s * 0.12], [x + s * 0.55, y - s * 0.24]], "#7fa3ae", 2);
			line(c, [[x - s * 0.15, y - s * 0.04], [x + s * 0.25, y + s * 0.12]], "#dff2f6", 1);
			if (shine) glint(c, x + s * 0.25, y + s * 0.1, 2.5, "#f4fcffcc");
		}
	}
	// A dug pit: a dark bowl with a lighter rim.
	function pit(c, x, y, rx) {
		ellipse(c, x, y, rx, rx * 0.5, "#1c2224");
		ellipse(c, x + 1, y + 1.5, rx * 0.7, rx * 0.32, "#12171a");
		c.strokeStyle = "#5f6a6566";
		c.lineWidth = 1;
		c.beginPath();
		c.ellipse(x, y, rx, rx * 0.5, 0, Math.PI * 1.05, Math.PI * 1.95);
		c.stroke();
	}
	// Outcrop rocks, back to front: [x, y, size]. The first ones stay longest.
	const ORE_ROCKS = [
		[0, -4, 16],
		[-18, 2, 13],
		[17, 3, 13],
		[-4, 12, 12],
		[-30, 10, 9],
		[28, 12, 9],
		[10, -14, 10],
		[-14, -12, 9],
		[-20, 18, 7],
		[20, 20, 7],
	];
	const ORE_COUNT = [0, 2, 3, 5, 6, 8, 10];
	function ore(c, n) {
		ellipse(c, 8, 11, 46, 25, "#101b2355");
		ellipse(c, 0, 4, 43, 24, "#2e363599");
		ellipse(c, -3, 1, 34, 17, "#3a423faa");
		if (!n) {
			pit(c, -2, 6, 22);
			for (const [x, y, sz] of [[-26, 10, 4], [22, 12, 5], [8, 20, 3], [-12, -8, 3]]) boulder(c, x, y, sz, ROCK.ore, false);
			return;
		}
		// Pits where rock has already been dug out.
		for (let i = 0; i < Math.min(3, 6 - n); i++) pit(c, [[26, 6], [-26, 14], [4, 22]][i][0], [[26, 6], [-26, 14], [4, 22]][i][1], 9 - i);
		const k = 0.72 + (n / 6) * 0.28,
			rocks = ORE_ROCKS.slice(0, ORE_COUNT[n]).sort((a, b) => a[1] - b[1]);
		rocks.forEach(([x, y, sz]) => boulder(c, x, y, sz * k, ROCK.ore, true, sz >= 13));
	}
	// Fissures out of the vent: [points].
	const FISSURES = [
		[[-10, 3], [-22, 6], [-30, 2], [-38, 7]],
		[[9, 4], [20, 1], [28, 6], [37, 3]],
		[[-4, 8], [-9, 15], [-16, 19]],
		[[5, 8], [11, 15], [9, 21]],
		[[-2, -4], [-6, -11], [-1, -16]],
	];
	function gasVent(c, n, time, flow) {
		ellipse(c, 8, 11, 46, 25, "#101b2355");
		ellipse(c, 0, 4, 43, 24, "#352f3b99");
		ellipse(c, -2, 2, 34, 17, "#3d3644bb");
		const live = n / 6;
		// Fissures: a dark groove, lit from inside while the field lasts.
		FISSURES.forEach((pts, i) => {
			line(c, pts, "#19131e", 3);
			if (i < n) line(c, pts, `rgba(205,140,232,${(0.35 + live * 0.55).toFixed(3)})`, 1.4);
		});
		// Rocks around the rim.
		for (const [x, y, sz] of [[-22, -6, 8], [20, -7, 7], [-28, 14, 6], [26, 14, 6]]) boulder(c, x, y, sz * (0.8 + live * 0.2), ROCK.gas, false);
		// The vent: a crater with a lit upper rim and a glow in its throat.
		ellipse(c, 0, 3, 17, 9, "#221b28");
		ellipse(c, 0, 4, 12, 6, "#120d16");
		if (n) {
			const g = c.createRadialGradient(0, 4, 0, 0, 4, 13);
			g.addColorStop(0, `rgba(226,160,248,${(0.3 + live * 0.5).toFixed(3)})`);
			g.addColorStop(1, "rgba(226,160,248,0)");
			c.fillStyle = g;
			c.beginPath();
			c.ellipse(0, 4, 13, 7, 0, 0, Math.PI * 2);
			c.fill();
		}
		c.strokeStyle = "#76678080";
		c.lineWidth = 1.5;
		c.beginPath();
		c.ellipse(0, 3, 17, 9, 0, Math.PI * 1.05, Math.PI * 1.95);
		c.stroke();
		// time === null: the rising gas is drawn elsewhere (WebGL renderer).
		if (n && time !== null) gasPlume(c, 0, 0, time, flow);
	}
	// Rising gas above the vent; stronger while an extractor pumps it.
	function plumeParts(time, flow) {
		const out = [],
			count = flow ? 7 : 4,
			speed = flow ? 14 : 8;
		for (let i = 0; i < count; i++) {
			const rise = (time * speed + i * (35 / count)) % 35;
			out.push({ x: -12 + (i % 4) * 8 + Math.sin(time + i) * 3, y: 2 - rise, rx: 4 + rise * 0.12, ry: 6 + rise * 0.18, alpha: flow ? 0x26 / 255 : 0x19 / 255 });
		}
		return out;
	}
	function gasPlume(c, x, y, time, flow) {
		for (const p of plumeParts(time, flow)) ellipse(c, x + p.x, y + p.y, p.rx, p.ry, `rgba(200,158,229,${p.alpha.toFixed(3)})`);
	}
	function resource(c, o, gas, time, label = true, flow = false) {
		c.save();
		c.translate(o.x, o.y);
		if (gas) gasVent(c, stage(o.amount, "gas"), time, flow);
		else ore(c, stage(o.amount, "ore"));
		if (label) {
			c.fillStyle = resourceLabel(o, gas).color;
			c.font = "11px Segoe UI";
			c.textAlign = "center";
			c.fillText(resourceLabel(o, gas).text, 0, 48);
		}
		c.restore();
	}
	function resourceLabel(o, gas) {
		return {
			text: o.amount ? `${gas ? "GAZ" : "RUDA"} · ${Math.floor(o.amount)}` : "WYCZERPANE",
			color: o.amount ? (gas ? "#e1b6f4" : "#a1dfe4") : "#95a3a2",
		};
	}
	// What the deposit drawing depends on, without the amount label: the stage (0 = exhausted … 6 = full).
	function resourceLook(o, gas = false) {
		return stage(o.amount, gas ? "gas" : "ore");
	}
	function crystalLabel(o) {
		return { text: o.amount ? "KRYSZTAŁY · " + Math.floor(o.amount) : "WYCZERPANE", color: "#f4d989" };
	}
	function crystalLook(o) {
		return stage(o.amount, "crystal");
	}
	// Night glow of the deposits (gas fissures, crystals), drawn in the emissive phase after the lighting.
	function depositGlow(c, game, seen) {
		const night = game.night;
		if (night < 0.05) return;
		const near = (o) => !seen || (Math.abs(o.x - seen.x) < seen.w / 2 + 80 && Math.abs(o.y - seen.y) < seen.h / 2 + 80);
		const halo = (x, y, rx, ry, rgb, a) => {
			const g = c.createRadialGradient(x, y, 0, x, y, rx);
			g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
			g.addColorStop(1, `rgba(${rgb},0)`);
			c.fillStyle = g;
			c.beginPath();
			c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
			c.fill();
		};
		c.save();
		for (const o of game.gasFields) {
			const n = stage(o.amount, "gas");
			if (n && game.explored[game.visionIndex(o.x, o.y)] && near(o)) halo(o.x, o.y + 4, 42, 26, "214,150,240", night * 0.55 * (0.4 + (n / 6) * 0.6));
		}
		for (const o of game.crystalFields || []) {
			const n = stage(o.amount, "crystal");
			if (n && game.explored[game.visionIndex(o.x, o.y)] && near(o)) halo(o.x, o.y - 10, 34, 26, "246,214,120", night * 0.3 * (0.4 + (n / 6) * 0.6));
		}
		c.restore();
	}
	function terrain(c, game) {
		let seed = 881;
		const rand = () =>
			(seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
		const biome = RTS.MISSIONS[game.missionId].biome,
			// Decoration density stays constant on larger maps.
			area = (game.W * game.H) / (3360 * 2160);
		if (biome !== "dust") {
			c.fillStyle = biome === "ice" ? "#90bad04a" : "#552f3544";
			c.fillRect(0, 0, game.W, game.H);
		}
		for (let i = 0; i < 90 * area; i++) {
			const x = rand() * game.W,
				y = rand() * game.H,
				r = 15 + rand() * 45;
			ellipse(
				c,
				x,
				y,
				r,
				r * 0.45,
				biome === "ice"
					? "#bdd3d61c"
					: biome === "ash"
						? "#090e1429"
						: "#bc9a5c12",
			);
		}
		// Ice cracks: 2D only (RTS.bareGround).
		if (biome === "ice" && !RTS.bareGround)
			for (let i = 0; i < 65 * area; i++) {
				const x = rand() * game.W,
					y = rand() * game.H;
				line(
					c,
					[
						[x, y],
						[x + 15, y + 10],
						[x + 7, y + 22],
						[x + 35, y + 38],
					],
					"#c2e3e52a",
					1,
				);
			}
		// Cinders (the 3D board scatters real ones: RTS.bareGround).
		if (biome === "ash" && !RTS.bareGround)
			for (let i = 0; i < 80 * area; i++) {
				const x = rand() * game.W,
					y = rand() * game.H;
				ellipse(c, x, y, 7, 3, "#b1794233");
			}
		// Pebbles (the 3D board scatters real stones instead: RTS.bareGround).
		for (let i = 0; i < (RTS.bareGround ? 0 : 1700 * area); i++) {
			const x = rand() * game.W,
				y = rand() * game.H,
				r = 1 + rand() * 4;
			ellipse(c, x + 2, y + 3, r * 1.4, r * 0.6, "#10242a28");
			poly(
				c,
				[
					[x - r, y],
					[x, y - r * 0.6],
					[x + r, y],
					[x, y + r * 0.5],
				],
				i % 3 ? "#a29c7833" : "#899c9540",
				null,
			);
		}
		// Cracks over rock ground (the 3D board builds the rocks: RTS.bareGround).
		for (const o of game.obstacles.filter((o) => !o.kind && !RTS.bareGround)) {
			c.save();
			c.beginPath();
			c.rect(o.x, o.y, o.w, o.h);
			c.clip();
			for (let i = 0; i < 15; i++) {
				const x = o.x + rand() * o.w,
					y = o.y + rand() * o.h;
				line(
					c,
					[
						[x, y],
						[x + 12, y + 8],
						[x + 7, y + 24],
						[x + 20, y + 31],
					],
					"#232f2d80",
					2,
				);
				line(
					c,
					[
						[x + 2, y],
						[x + 14, y + 7],
					],
					"#a9a38965",
					1,
				);
			}
			c.restore();
		}
		// Base pad tiles around the HQ (the 3D HQ stands on its own foundation).
		for (const b of game.entities.filter((e) => e.type === "hq" && !RTS.bareGround)) {
			for (let x = -110; x < 130; x += 40)
				for (let y = -95; y < 120; y += 40) {
					rect(c, b.x + x, b.y + y, 37, 37, "#82938b0b");
					line(
						c,
						[
							[b.x + x, b.y + y],
							[b.x + x + 37, b.y + y],
						],
						"#a3b2a21a",
					);
				}
			for (let i = 0; i < 2; i++) {
				line(
					c,
					[
						[b.x + 70, b.y + 100 + i * 12],
						[b.x + 180, b.y + 155 + i * 12],
						[b.x + 260, b.y + 130 + i * 12],
					],
					"#1c292d45",
					5,
				);
			}
		}
	}
	// Crystal prisms, back to front: [x, y, height, width, lean]. The first ones stay longest.
	const PRISMS = [
		[0, 2, 34, 7, 1],
		[-15, 5, 26, 6, -3],
		[14, 6, 24, 6, 3],
		[-6, 12, 18, 5, -1],
		[8, 13, 16, 5, 2],
		[-24, 12, 13, 4, -3],
		[23, 13, 12, 4, 3],
	];
	const PRISM_COUNT = [0, 2, 3, 4, 5, 6, 7];
	// A translucent golden prism: a lit face, a shaded face, a bright edge and faint inner facets.
	function prism(c, x, y, h, w, lean) {
		const top = [x + lean, y - h - w * 0.9],
			tl = [x - w * 0.6 + lean, y - h],
			tr = [x + w * 0.6 + lean, y - h + 2];
		poly(c, [[x - w, y], tl, top, [x + lean * 0.3, y + w * 0.4]], "rgba(242,216,128,0.9)", "rgba(255,240,190,0.55)");
		poly(c, [top, tr, [x + w, y], [x + lean * 0.3, y + w * 0.4]], "rgba(176,134,64,0.9)", "rgba(255,240,190,0.35)");
		line(c, [top, [x + lean * 0.3, y + w * 0.4]], "rgba(255,247,210,0.9)", 1);
		line(c, [[x - w * 0.55, y - h * 0.2], [x - w * 0.2 + lean * 0.5, y - h * 0.7]], "rgba(255,250,225,0.45)", 1);
		line(c, [[x + w * 0.5, y - h * 0.35], [x + w * 0.2 + lean * 0.5, y - h * 0.8]], "rgba(90,64,28,0.45)", 1);
	}
	function crystal(c, o, label = true) {
		const n = stage(o.amount, "crystal");
		c.save();
		c.translate(o.x, o.y);
		ellipse(c, 6, 12, 38, 18, "#161b2466");
		ellipse(c, 0, 10, 30, 12, "#3d383099");
		// Chips of rock and crystal at the foot.
		for (const [x, y, r] of [[-20, 16, 3], [18, 17, 2.5], [-4, 19, 2], [27, 9, 2]]) ellipse(c, x, y, r * 1.4, r * 0.8, "#5c554a");
		if (!n) {
			// Broken stumps.
			for (const [x, y, w] of [[-10, 8, 6], [7, 10, 5], [-1, 15, 4]]) {
				poly(c, [[x - w, y], [x - w * 0.6, y - 7], [x + w * 0.2, y - 4], [x + w * 0.6, y - 8], [x + w, y], [x, y + w * 0.4]], "#5a5652", "#2a2724");
				poly(c, [[x + w * 0.6, y - 8], [x + w, y], [x, y + w * 0.4], [x + w * 0.2, y - 4]], "#413c38", null);
			}
		} else {
			const k = 0.62 + (n / 6) * 0.38,
				list = PRISMS.slice(0, PRISM_COUNT[n]).sort((a, b) => a[1] - b[1]);
			for (const [x, y, h, w, lean] of list) prism(c, x, y, h * k, w, lean);
			glint(c, PRISMS[0][0] + 2, PRISMS[0][1] - PRISMS[0][2] * k * 0.7, 4.5, "#fffbe6");
		}
		if (label) {
			c.fillStyle = crystalLabel(o).color;
			c.textAlign = "center";
			c.font = "11px Segoe UI";
			c.fillText(crystalLabel(o).text, 0, 44);
		}
		c.restore();
	}
	function scaffold(c, e, time) {
		const r = RTS.TYPES[e.type].radius,
			progress = 1 - e.constructionLeft / RTS.TYPES[e.type].construction;
		c.save();
		c.globalAlpha = 1;
		for (const x of [-r, r]) {
			line(
				c,
				[
					[x, r * 0.5],
					[x, -r - 15],
				],
				"#bdab7f",
				2,
			);
			line(
				c,
				[
					[x - 4, -r],
					[x + 4, r * 0.4],
				],
				"#6b867c",
				1,
			);
		}
		for (let y = -r; y < r * 0.5; y += 15)
			line(
				c,
				[
					[-r, y],
					[r, y],
				],
				"#c4b88566",
			);
		line(
			c,
			[
				[-r, -r - 15],
				[r, -r - 15],
				[r + 8, -r - 10],
			],
			"#c6b989",
			3,
		);
		const x = -r + progress * r * 2;
		ellipse(c, x, -r + Math.sin(time * 8) * 6, 2, 2, "#f8e6a4");
		c.restore();
	}
	return {
		body,
		resource,
		resourceLabel,
		resourceLook,
		plumeParts,
		depositGlow,
		terrain,
		crystal,
		crystalLabel,
		crystalLook,
		scaffold,
		cacheSize: () => cache.size,
	};
})();
