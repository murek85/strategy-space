/* Planet-specific 2D scenery. Visual randomness is independent from simulation. */
const PlanetArt = (() => {
	const palettes = {
		dust: { plant: "#767c43", water: "#397977", beast: "#b99b65" },
		ice: { plant: "#70959c", water: "#739da9", beast: "#d7e5df" },
		ash: { plant: "#705367", water: "#35475b", beast: "#a76453" },
	};
	function ellipse(c, x, y, rx, ry, color) {
		c.fillStyle = color;
		c.beginPath();
		c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
		c.fill();
	}
	function lakePath(c, w, pad = 0, dx = 0, dy = 0) {
		c.beginPath();
		for (let i = 0; i <= 120; i++) {
			const a = (i * Math.PI * 2) / 120,
				r = RTS.waterRadius(w, a),
				x = w.x + dx + Math.cos(a) * (w.rx + pad) * r,
				y = w.y + dy + Math.sin(a) * (w.ry + pad) * r;
			if (i === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.closePath();
	}
	function terrain(c, g) {
		const biome = RTS.MISSIONS[g.missionId].biome,
			p = palettes[biome];
		let seed = 1337;
		const rand = () => {
			seed = (seed * 1664525 + 1013904223) >>> 0;
			return seed / 4294967296;
		};
		for (let i = 0; i < (85 * (g.W * g.H)) / (3360 * 2160); i++) {
			const x = rand() * g.W,
				y = rand() * g.H,
				r = 45 + rand() * 90;
			if (g.entities.some((e) => Math.hypot(x - e.x, y - e.y) < 150))
				continue;
			const gradient = c.createRadialGradient(
				x - r * 0.25,
				y - r * 0.25,
				0,
				x,
				y,
				r,
			);
			gradient.addColorStop(
				0,
				biome === "ice" ? "#c2e1df20" : "#c4ad7020",
			);
			gradient.addColorStop(0.65, "#0b192118");
			gradient.addColorStop(1, "#07111600");
			c.fillStyle = gradient;
			c.fillRect(x - r, y - r, 2 * r, 2 * r);
			c.strokeStyle = biome === "ice" ? "#c9e2e21c" : "#ac9c6520";
			c.lineWidth = 2;
			c.beginPath();
			c.ellipse(x, y, r * 0.8, r * 0.3, -0.3, 0.2, 2.7);
			c.stroke();
		}
		for (const w of (g.waters || []).filter((w) => !w.kind)) {
			lakePath(c, w, 18, 8, 10);
			c.fillStyle = "#0c202870";
			c.fill();
			lakePath(c, w, 10);
			c.fillStyle = biome === "ice" ? "#c9e4de" : "#7a807088";
			c.fill();
			const gradient = c.createRadialGradient(
				w.x,
				w.y,
				10,
				w.x,
				w.y,
				w.rx,
			);
			gradient.addColorStop(0, "#162f43");
			gradient.addColorStop(1, p.water);
			c.fillStyle = gradient;
			c.beginPath();
			lakePath(c, w);
			c.fill();
		}
		// Barren worlds (lava, bare rock, open desert) skip the biome flora.
		for (
			let i = 0;
			i <
			((RTS.MISSIONS[g.missionId].barren ? 0 : 1650) * (g.W * g.H)) /
				(3360 * 2160);
			i += typeof SceneFX !== "undefined" ? SceneFX.stride("terrain") : 1
		) {
			const x = 40 + rand() * (g.W - 80),
				y = 40 + rand() * (g.H - 80),
				r = 4 + rand() * 10;
			if (
				g.blocked(x, y, 20) ||
				[
					...g.entities,
					...g.nodes,
					...g.ores,
					...g.crystalFields,
					...g.gasFields,
				].some((e) => Math.hypot(e.x - x, e.y - y) < 80)
			)
				continue;
			c.save();
			c.translate(x, y);
			for (let j = 0; j < 5; j++) {
				const dx = Math.sin(i * 7 + j * 3) * r * 2,
					dy = Math.cos(i * 3 + j * 5) * r;
				ellipse(
					c,
					dx,
					dy,
					3 + (j % 3),
					1.8,
					biome === "ice"
						? "#a4c1ad70"
						: biome === "ash"
							? "#aa727a65"
							: "#88955280",
				);
			}
			if (i % 5 === 0) {
				for (let j = 0; j < 4; j++) {
					const dx = (j - 1.5) * r * 0.55,
						h = r * (0.6 + (j % 2) * 0.6);
					c.strokeStyle =
						biome === "ash"
							? "#826580"
							: biome === "ice"
								? "#839d98"
								: "#788450";
					c.lineWidth = 2;
					c.beginPath();
					c.moveTo(dx, 4);
					c.quadraticCurveTo(dx - 5, -h * 0.5, dx + 3, -h);
					c.stroke();
					ellipse(
						c,
						dx + 3,
						-h,
						biome === "ash" ? 6 : 3,
						2,
						biome === "ash"
							? "#bf8ea0"
							: biome === "ice"
								? "#dcebe2"
								: "#bfad71",
					);
				}
			}
			ellipse(c, 4, 5, r * 1.2, r * 0.5, "#07121e45");
			c.strokeStyle = biome === "ice" ? "#71898c" : "#6a654f";
			c.lineWidth = 2;
			c.beginPath();
			c.moveTo(0, 4);
			c.lineTo(0, -r);
			c.stroke();
			if (biome === "ice") {
				for (let j = 0; j < 3; j++) {
					c.fillStyle = j === 2 ? "#c9e3dc" : p.plant;
					c.beginPath();
					c.moveTo(0, -r * 2 + j * 5);
					c.lineTo(-r + j * 2, j * 4);
					c.lineTo(r - j * 2, j * 4);
					c.fill();
				}
			} else if (biome === "dust" && i % 4 !== 0) {
				const tree = i % 3 !== 0;
				if (tree) {
					ellipse(c, 12, 9, r * 1.8, r * 0.55, "#302c2860");
					c.strokeStyle = "#68503a";
					c.lineWidth = 4;
					c.beginPath();
					c.moveTo(0, 5);
					c.lineTo(-2, -r * 1.5);
					c.moveTo(-1, -r * 0.8);
					c.lineTo(r * 0.7, -r * 1.6);
					c.stroke();
					ellipse(c, -2, -r * 1.65, r * 1.5, r * 0.72, "#405543");
					ellipse(c, -r * 0.8, -r * 1.9, r, r * 0.65, "#637b4c");
					ellipse(
						c,
						r * 0.65,
						-r * 1.7,
						r * 0.95,
						r * 0.6,
						"#7b8e54",
					);
					ellipse(
						c,
						-r * 0.25,
						-r * 2.1,
						r * 0.75,
						r * 0.4,
						"#9ba868",
					);
				} else {
					for (let j = 0; j < 4; j++) {
						const dx = (j - 1.5) * r * 0.45;
						ellipse(
							c,
							dx,
							-3 - Math.sin(j) * r * 0.3,
							r * 0.65,
							r * 0.52,
							j % 2 ? "#8b995b" : "#596d45",
						);
					}
					ellipse(
						c,
						-r * 0.3,
						-r * 0.5,
						r * 0.45,
						r * 0.22,
						"#b4b778",
					);
				}
			} else if (biome === "dust") {
				for (let j = 0; j < 4; j++) {
					const a = (j * Math.PI) / 2;
					c.strokeStyle = p.plant;
					c.lineWidth = 3;
					c.beginPath();
					c.moveTo(0, 0);
					c.quadraticCurveTo(
						Math.cos(a) * r,
						Math.sin(a) * r,
						Math.cos(a) * r * 0.5,
						Math.sin(a) * r - 7,
					);
					c.stroke();
				}
			} else {
				ellipse(c, 0, -r, r, r * 0.5, p.plant);
				ellipse(c, -r * 0.3, -r - 2, r * 0.5, r * 0.25, "#bb8e7555");
			}
			c.restore();
		}
	}
	function ground(c, g, view) {
		const biome = RTS.MISSIONS[g.missionId].biome;
		c.save();
		for (const t of g.tracks || []) {
			if (!g.isVisible(t.x, t.y)) continue;
			c.save();
			c.translate(t.x, t.y);
			c.rotate(t.angle);
			c.globalAlpha = Math.min(0.35, t.life / 45);
			c.fillStyle = biome === "ice" ? "#162c40" : "#090f16";
			if (t.vehicle) {
				for (const y of [-12, 9]) {
					c.fillRect(-5, y, 10, 3);
				}
			} else {
				c.fillRect(-3, -5, 5, 3);
				c.fillRect(1, 4, 5, 3);
			}
			if (t.vehicle && t.life > 21.3) {
				c.globalAlpha = (t.life - 21.3) * 0.1;
				ellipse(
					c,
					-12,
					0,
					15,
					8,
					biome === "ice"
						? "#dbe6e5"
						: biome === "ash"
							? "#a8b3ba"
							: "#d8b995",
				);
			}
			c.restore();
		}
		const accumulation = Math.min(1, 0.12 + g.time / 100);
		if (biome === "ash")
			for (
				let i = 0;
				i < (350 * (g.W * g.H)) / (3360 * 2160);
				i +=
					typeof SceneFX !== "undefined"
						? SceneFX.stride("particles")
						: 1
			) {
				const x = (i * 347.17 + 91) % g.W,
					y = (i * 193.31 + 230) % g.H,
					rx = (12 + (i % 7) * 4) * accumulation,
					ry = (5 + (i % 5) * 2) * accumulation;
				if (
					view &&
					(Math.abs(x - view.x) > view.w / 2 + 70 ||
						Math.abs(y - view.y) > view.h / 2 + 70)
				)
					continue;
				if (!g.blocked(x, y, 4)) {
					c.fillStyle = "#52778470";
					c.strokeStyle = "#172e3944";
					c.lineWidth = 2;
					c.beginPath();
					for (let j = 0; j <= 20; j++) {
						const a = (j / 20) * Math.PI * 2,
							k =
								1 +
								0.16 * Math.sin(a * 3 + i) +
								0.1 * Math.cos(a * 5 + i * 0.7),
							px = x + Math.cos(a) * rx * k,
							py = y + Math.sin(a) * ry * k;
						if (j === 0) c.moveTo(px, py);
						else c.lineTo(px, py);
					}
					c.closePath();
					c.fill();
					c.stroke();
					c.strokeStyle = "#a6c4c33c";
					c.lineWidth = 1;
					c.beginPath();
					c.ellipse(
						x - rx * 0.18,
						y - ry * 0.2,
						rx * 0.58,
						ry * 0.42,
						-0.12,
						0.2,
						2.7,
					);
					c.stroke();
				}
			}
		if (biome === "ice")
			for (
				let i = 0;
				i < (850 * (g.W * g.H)) / (3360 * 2160);
				i +=
					typeof SceneFX !== "undefined"
						? SceneFX.stride("particles")
						: 1
			) {
				const x = (i * 281.71 + 75) % g.W,
					y = (i * 149.43 + 140) % g.H,
					r = (15 + (i % 9) * 5) * accumulation;
				if (
					view &&
					(Math.abs(x - view.x) > view.w / 2 + 70 ||
						Math.abs(y - view.y) > view.h / 2 + 70)
				)
					continue;
				if (!g.blocked(x, y, 8)) {
					const grad = c.createRadialGradient(
						x - r * 0.25,
						y - r * 0.2,
						0,
						x,
						y,
						r,
					);
					grad.addColorStop(
						0,
						`rgba(225,239,236,${0.48 * accumulation})`,
					);
					grad.addColorStop(1, "rgba(185,213,216,0)");
					c.fillStyle = grad;
					c.fillRect(x - r, y - r, r * 2, r * 2);
				}
			}
		for (const w of (g.waters || []).filter((w) => !w.kind)) {
			if (!g.isVisible(w.x, w.y)) continue;
			c.save();
			c.beginPath();
			lakePath(c, w);
			c.clip();
			const shine = c.createLinearGradient(
				w.x - w.rx,
				w.y - w.ry,
				w.x + w.rx,
				w.y + w.ry,
			);
			shine.addColorStop(0, "#bde4e016");
			shine.addColorStop(0.45, "#2e72801e");
			shine.addColorStop(1, "#071c2b28");
			c.fillStyle = shine;
			c.fillRect(w.x - w.rx, w.y - w.ry, w.rx * 2, w.ry * 2);
			for (let i = 0; i < 16; i++) {
				const yy = w.y - w.ry + (i * w.ry * 2) / 15,
					span =
						w.rx *
						Math.sqrt(Math.max(0, 1 - ((yy - w.y) / w.ry) ** 2)),
					phase = g.time * (0.35 + (i % 3) * 0.11) + i * 0.9;
				c.strokeStyle = i % 3 ? "#9bc8c92c" : "#e0f0df3b";
				c.lineWidth = i % 4 === 0 ? 1.4 : 0.7;
				c.beginPath();
				for (let x = -span; x <= span; x += 7) {
					const py =
						yy +
						Math.sin(x * 0.045 + phase) * 2.1 +
						Math.sin(x * 0.018 - phase * 0.7) * 1.2;
					if (x === -span) c.moveTo(w.x + x, py);
					else c.lineTo(w.x + x, py);
				}
				c.stroke();
			}
			c.restore();
		}
		c.restore();
	}
	function body(c, e, time, biome) {
		const color =
			e.tint ||
			(e.team === 0
				? "#aee5c7"
				: e.team === 1
					? "#ed8c78"
					: palettes[biome].beast);
		if (e.type === "wall" || e.type === "gate") {
			const r = RTS.TYPES[e.type].radius;
			c.save();
			ellipse(c, 4, 10, r + 4, 15, "#06151b60");
			for (const x of [-r, r - 8]) {
				c.fillStyle = "#526b70";
				c.fillRect(x, -17, 8, 34);
				c.fillStyle = color;
				c.fillRect(x + 2, -14, 4, 4);
			}
			c.fillStyle = e.open ? "#547d7560" : "#849a9a";
			c.fillRect(-r + 8, e.open ? 8 : -11, r * 2 - 16, e.open ? 3 : 22);
			if (!e.open) {
				c.strokeStyle = "#243c48";
				c.lineWidth = 3;
				for (let x = -r + 12; x < r - 8; x += 12) {
					c.beginPath();
					c.moveTo(x, -9);
					c.lineTo(x, 9);
					c.stroke();
				}
				c.fillStyle = color;
				c.fillRect(-r + 8, -12, r * 2 - 16, 3);
			}
			if (e.type === "gate") {
				c.fillStyle = color;
				c.font = "11px Segoe UI";
				c.textAlign = "center";
				c.fillText(e.open ? "↔" : "×", 0, 4);
			}
			c.restore();
			return true;
		}
		if (!["heavy", "artillery", "beast"].includes(e.type)) return false;
		c.save();
		c.rotate(e.angle);
		if (e.type === "beast") {
			c.scale(0.46, 0.46);
			const step = e.path.length ? Math.sin(time * 13 + e.id) * 5 : 0;
			c.strokeStyle = color;
			c.lineWidth = 5;
			for (const side of [-1, 1])
				for (const x of [-9, 9]) {
					c.beginPath();
					c.moveTo(x, side * 6);
					c.lineTo(x + step * side, side * 16);
					c.stroke();
				}
			ellipse(c, 0, 0, 18, 10, color);
			ellipse(c, 17, 0, 9, 8, color);
			if (biome === "dust") {
				c.lineWidth = 4;
				for (const side of [-1, 1]) {
					c.beginPath();
					c.moveTo(15, side * 7);
					c.lineTo(25, side * 15);
					c.lineTo(31, side * 11);
					c.stroke();
				}
			} else if (biome === "ice") {
				c.fillStyle = "#f1eee0";
				for (const side of [-1, 1]) {
					c.beginPath();
					c.moveTo(16, side * 5);
					c.lineTo(11, side * 14);
					c.lineTo(22, side * 7);
					c.fill();
				}
			} else {
				c.fillStyle = "#dba776";
				for (let x = -15; x < 12; x += 6) {
					c.beginPath();
					c.moveTo(x, -5);
					c.lineTo(x - 4, -16);
					c.lineTo(x + 5, -5);
					c.fill();
				}
			}
			c.strokeStyle = color;
			c.lineWidth = 3;
			c.beginPath();
			c.moveTo(-13, 0);
			c.quadraticCurveTo(-28, 12, -33, 4 + step);
			c.stroke();
			c.fillStyle = "#f8df98";
			c.fillRect(21, -6, 3, 3);
			c.fillRect(21, 3, 3, 3);
			c.fillStyle = "#263d42";
			for (let x = -11; x < 15; x += 8) c.fillRect(x, -8, 3, 16);
		} else {
			const heavy = e.type === "heavy",
				length = heavy ? 30 : 25;
			c.fillStyle = "#142530";
			for (const y of [-24, 15]) c.fillRect(-length, y, length * 2, 9);
			for (let x = -length + 2; x < length; x += 7) {
				c.fillStyle = "#52676c";
				c.fillRect(x, -23, 4, 7);
				c.fillRect(x, 16, 4, 7);
			}
			c.fillStyle = heavy ? "#718c85" : "#9b967b";
			c.fillRect(-length + 4, -15, length * 2 - 8, 30);
			c.strokeStyle = "#bbccc0";
			c.strokeRect(-length + 4, -15, length * 2 - 8, 30);
			c.fillStyle = "#334e57";
			c.fillRect(-14, -10, 26, 20);
			c.fillStyle = color;
			c.fillRect(-20, -13, 5, 26);
			c.fillStyle = "#b9c8be";
			if (heavy) {
				c.fillRect(4, -8, 31, 5);
				c.fillRect(4, 3, 31, 5);
			} else {
				c.fillRect(0, -4, 49, 8);
				c.fillStyle = "#415b65";
				c.fillRect(40, -6, 12, 12);
			}
			c.fillStyle = "#172e36";
			c.fillRect(-9, -7, 12, 14);
			c.fillStyle = color;
			c.fillRect(-5, -4, 5, 8);
		}
		c.restore();
		return true;
	}
	// Landing points stay attached to the world while the camera moves.
	function precipitation(c, g, view) {
		const biome = RTS.MISSIONS[g.missionId].biome;
		if (!["ash", "ice"].includes(biome)) return;
		const rain = biome === "ash",
			storm = g.weather.intensity,
			cell = (rain ? 115 : 100) / (1 + storm * (rain ? 0.7 : 1.8)),
			mod = (n, m) => ((n % m) + m) % m;
		c.save();
		for (
			let ix = Math.floor((view.x - view.w / 2 - 100) / cell);
			ix <= (view.x + view.w / 2 + 100) / cell;
			ix++
		)
			for (
				let iy = Math.floor((view.y - view.h / 2 - 100) / cell);
				iy <= (view.y + view.h / 2 + 100) / cell;
				iy++
			) {
				const seed = mod(ix * 127.1 + iy * 311.7, 997),
					x = ix * cell + mod(seed * 17.3, cell),
					y = iy * cell + mod(seed * 9.7, cell);
				if (x < 0 || y < 0 || x > g.W || y > g.H) continue;
				const phase = mod(g.time * (rain ? 1.15 : 0.42) + seed, 1);
				if (rain) {
					if (phase < 0.78) {
						const h = (1 - phase / 0.78) * 85;
						c.strokeStyle = "rgba(160,191,205,.22)";
						c.lineWidth = 0.8;
						c.beginPath();
						c.moveTo(x + h * (0.22 + storm * 0.65) + 4, y - h - 10);
						c.lineTo(x + h * (0.22 + storm * 0.65), y - h);
						c.stroke();
					} else {
						const age = (phase - 0.78) / 0.22;
						c.strokeStyle = `rgba(186,222,235,${(1 - age) * 0.22})`;
						c.lineWidth = 1;
						c.beginPath();
						c.ellipse(
							x,
							y,
							2 + age * 9,
							1 + age * 3,
							0,
							0,
							Math.PI * 2,
						);
						c.stroke();
					}
				} else {
					const h = (1 - phase) * 90;
					c.globalAlpha =
						phase < 0.85 ? 0.85 : ((1 - phase) / 0.15) * 0.85;
					ellipse(
						c,
						x +
							Math.sin(g.time * (0.9 + storm) + seed) *
								(12 + storm * 35) +
							h * storm,
						y - h,
						2.1 + mod(seed, 2),
						1.7 + mod(seed, 2),
						"#f7ffff",
					);
				}
			}
		c.restore();
	}
	function damage(c, e, time) {
		if (
			e.constructionLeft ||
			["beast", "trooper", "rocket"].includes(e.type) ||
			e.hp / e.maxHp > 0.55
		)
			return;
		const severity = 1 - e.hp / e.maxHp,
			r = RTS.TYPES[e.type].radius,
			count = e.hp / e.maxHp < 0.28 ? 3 : 1;
		c.save();
		for (
			let i = 0;
			i < count;
			i +=
				typeof SceneFX !== "undefined" ? SceneFX.stride("particles") : 1
		) {
			const x = (i - (count - 1) / 2) * r * 0.52,
				y = -r * 0.15,
				seed = e.id * 1.7 + i * 2.3;
			for (let j = 0; j < 4; j++) {
				const age = (((time * 0.48 + seed + j * 0.25) % 1) + 1) % 1;
				c.globalAlpha = Math.sin(age * Math.PI) * 0.28;
				ellipse(
					c,
					x + age * 18 + Math.sin(seed + j) * 4,
					y - 12 - age * 48,
					5 + age * 14,
					7 + age * 13,
					"#303337",
				);
			}
			c.globalAlpha = 1;
			const glow = c.createRadialGradient(x, y, 0, x, y, 18);
			glow.addColorStop(0, "#ff9a354d");
			glow.addColorStop(1, "#ff641000");
			c.fillStyle = glow;
			c.fillRect(x - 18, y - 18, 36, 36);
			for (let j = 0; j < 3; j++) {
				const flicker =
						Math.sin(time * 12 + seed + j * 2) * 0.15 +
						Math.sin(time * 19 + seed) * 0.08,
					h = (15 + severity * 13) * (1 + flicker) * (1 - j * 0.2),
					w = 6 - j * 1.6,
					lean = Math.sin(time * 7 + seed + j) * 4;
				c.fillStyle = ["#ef5724", "#ffa52f", "#fff1a2"][j];
				c.beginPath();
				c.moveTo(x - w, y);
				c.bezierCurveTo(
					x - w * 1.6,
					y - h * 0.35,
					x + lean - w,
					y - h * 0.65,
					x + lean,
					y - h,
				);
				c.bezierCurveTo(
					x + lean + w * 0.5,
					y - h * 0.4,
					x + w * 1.4,
					y - h * 0.3,
					x + w,
					y,
				);
				c.quadraticCurveTo(x, y + 4, x - w, y);
				c.fill();
			}
			const spark = (time * 1.3 + seed) % 1;
			c.globalAlpha = 1 - spark;
			ellipse(
				c,
				x + Math.sin(seed + spark * 4) * 7,
				y - 12 - spark * 35,
				1,
				1.7,
				"#ffd486",
			);
		}
		c.restore();
	}
	// Simulation time makes weather pause and survive save/load with the battle.
	function stormStrength(g) {
		return g.weather.kind === "sand" ? g.weather.intensity : 0;
	}
	let sandGrain = null;
	// Cache a softly shaded grain instead of creating gradients for every particle.
	function sandGrainCanvas() {
		if (!sandGrain) {
			sandGrain = document.createElement("canvas");
			sandGrain.width = 16;
			sandGrain.height = 16;
			const grain = sandGrain.getContext("2d"),
				shade = grain.createRadialGradient(6, 5, 0, 8, 8, 8);
			shade.addColorStop(0, "#e6c997");
			shade.addColorStop(0.3, "#cbb083cc");
			shade.addColorStop(0.65, "#92774b66");
			shade.addColorStop(1, "#92774b00");
			grain.fillStyle = shade;
			grain.fillRect(0, 0, 16, 16);
		}
		return sandGrain;
	}
	// Sand grains of the storm in screen pixels: each(x, y, size, alpha). Shared by Canvas and the WebGL particle pool.
	function sandGrains(g, width, height, each) {
		const strength = stormStrength(g),
			t = g.time;
		if (!strength) return;
		const grains = Math.min(9000, Math.max(1800, Math.round((width * height) / 120)));
		for (let layer = 0; layer < 3; layer++) {
			const alpha = strength * (0.24 + layer * 0.06);
			for (let i = layer; i < grains; i += 3 * (typeof SceneFX !== "undefined" ? SceneFX.stride("particles") : 1)) {
				const x = ((i * 173.317 + t * (180 + layer * 65 + (i % 7) * 5)) % (width + 20)) - 10,
					y = ((i * 79.713 + t * (14 + layer * 8) + Math.sin(t * 1.4 + i) * 5) % (height + 20)) - 10,
					size = (0.45 + (i % 4) * 0.18) * 4.2;
				each(x, y, size, alpha);
			}
		}
	}
	function sandstorm(c, g, width, height, grains = true) {
		const strength = stormStrength(g);
		if (!strength) return;
		const t = g.time;
		c.save();
		c.fillStyle = `rgba(182,139,77,${strength * 0.34})`;
		c.fillRect(0, 0, width, height);
		for (let i = 0; i < 14; i++) {
			const x =
					((i * 197 + t * (70 + (i % 3) * 15)) % (width + 600)) - 300,
				y =
					((i * 131.7) % (height + 100)) -
					50 +
					Math.sin(t * 0.25 + i) * 25;
			c.save();
			c.translate(x, y);
			c.scale(1, 0.2);
			c.globalAlpha = strength * (0.16 + (i % 3) * 0.025);
			const haze = c.createRadialGradient(0, 0, 0, 0, 0, 280);
			haze.addColorStop(0, "#ead0a0");
			haze.addColorStop(1, "#ead0a000");
			c.fillStyle = haze;
			// A disc, not a square: the gradient ends at its edge, and the WebGL replay keeps the flattened band smooth.
			c.beginPath();
			c.arc(0, 0, 280, 0, Math.PI * 2);
			c.fill();
			c.restore();
		}
		if (grains) {
			const grain = sandGrainCanvas();
			sandGrains(g, width, height, (x, y, size, alpha) => {
				c.globalAlpha = alpha;
				c.drawImage(grain, x - size / 2, y - size / 2, size, size);
			});
		}
		c.restore();
	}
	function fauna(c, g) {
		c.save();
		for (const [wi, w] of (g.waters || [])
			.filter((w) => !w.kind)
			.entries()) {
			c.save();
			c.beginPath();
			lakePath(c, w);
			c.clip();
			for (let i = 0; i < 7; i++) {
				const a = g.time * 0.13 + i * 0.9 + wi,
					x = w.x + Math.cos(a) * w.rx * 0.65,
					y = w.y + Math.sin(a * 1.3) * w.ry * 0.6;
				if (!g.isVisible(x, y)) continue;
				c.save();
				c.translate(x, y);
				c.rotate(
					Math.atan2(
						Math.cos(a * 1.3) * w.ry * 1.3,
						-Math.sin(a) * w.rx,
					),
				);
				fish(c);
				c.restore();
			}
			c.restore();
		}
		for (let i = 0; i < 18; i++) {
			const x = (i * 317 + g.time * (20 + (i % 3) * 4)) % g.W,
				y =
					100 +
					((i * 197) % (g.H - 200)) +
					Math.sin(g.time * 0.12 + i) * 35;
			if (!g.isVisible(x, y)) continue;
			bird(c, x, y, 3 + Math.sin(g.time * 7 + i) * 4);
		}
		c.restore();
	}
	// One fish at the origin, heading along +x, faint under the water.
	function fish(c) {
		c.globalAlpha = 0.4;
		ellipse(c, 0, 0, 5, 2, "#b7d2af");
		c.fillStyle = "#8baeb1";
		c.beginPath();
		c.moveTo(-4, 0);
		c.lineTo(-8, -3);
		c.lineTo(-8, 3);
		c.fill();
	}
	// One bird in flight at (x, y); wing: how far the wing tips are raised.
	function bird(c, x, y, wing) {
		c.strokeStyle = "#18242bcc";
		c.lineWidth = 1.6;
		c.beginPath();
		c.moveTo(x - 7, y - wing);
		c.quadraticCurveTo(x - 3, y - 3, x, y);
		c.quadraticCurveTo(x + 3, y - 3, x + 7, y - wing);
		c.stroke();
	}
	function lighting(c, g, view) {
		const night = g.night;
		if (night <= 0) return;
		c.save();
		c.fillStyle = `rgba(6,14,38,${night * 0.62})`;
		c.fillRect(view.x - view.w / 2, view.y - view.h / 2, view.w, view.h);
		c.globalCompositeOperation = "screen";
		for (const e of g.entities) {
			if (
				e.hp <= 0 ||
				e.constructionLeft ||
				e.type === "beast" ||
				e.stealth ||
				RTS.TYPES[e.type].threat ||
				!g.isVisible(e.x, e.y) ||
				Math.abs(e.x - view.x) > view.w / 2 + 130 ||
				Math.abs(e.y - view.y) > view.h / 2 + 130
			)
				continue;
			const mobile = RTS.TYPES[e.type].speed > 0,
				r = RTS.TYPES[e.type].radius;
			c.save();
			c.translate(e.x, e.y);
			c.globalAlpha = night;
			if (RTS.TYPES[e.type].flying) {
				// Navigation lamps share the aircraft's exact rendered altitude; no ground cone.
				c.translate(0, -25 - Math.sin(g.time * 2 + e.id) * 2);
				c.rotate(e.angle);
				for (const [px, py, color] of [
					[-r * 0.65, -r, "#ff8f91"],
					[-r * 0.65, r, "#91e1bc"],
					[r, 0, "#d9ecff"],
				]) {
					const glow = c.createRadialGradient(px, py, 0, px, py, 10);
					glow.addColorStop(0, color + "88");
					glow.addColorStop(1, color + "00");
					c.fillStyle = glow;
					c.fillRect(px - 10, py - 10, 20, 20);
					ellipse(c, px, py, 1.5, 1.5, color);
				}
			} else if (mobile) {
				c.rotate(e.angle);
				const reach = ["trooper", "rocket"].includes(e.type) ? 75 : 115,
					beam = c.createRadialGradient(r, 0, 0, r, 0, reach);
				beam.addColorStop(0, "#fff1b16b");
				beam.addColorStop(1, "#fff1b100");
				c.fillStyle = beam;
				c.beginPath();
				c.moveTo(r, 0);
				c.arc(r, 0, reach, -0.3, 0.3);
				c.closePath();
				c.fill();
				ellipse(c, r, 0, 2.5, 2, "#fff4c0");
			} else {
				for (const x of [-r * 0.65, r * 0.65]) {
					const glow = c.createRadialGradient(x, 3, 0, x, 3, 26);
					glow.addColorStop(0, "#f5d58b66");
					glow.addColorStop(1, "#f5d58b00");
					c.fillStyle = glow;
					c.fillRect(x - 26, -23, 52, 52);
					c.fillStyle = "#ffe8a8";
					c.fillRect(x - 2, 0, 4, 3);
				}
			}
			c.restore();
		}
		c.restore();
	}
	// grains = false: the storm grains are drawn by the WebGL renderer as native particles.
	function atmosphere(c, g, width, height, grains = true) {
		const t = g.time,
			night = g.night,
			weather = g.weather,
			strength = weather.intensity,
			x = width - 115,
			y = 90;
		c.save();
		c.globalAlpha = (1 - strength * 0.8) * (1 - night);
		const halo = c.createRadialGradient(x, y, 12, x, y, 110);
		halo.addColorStop(0, "#fff0bbaa");
		halo.addColorStop(0.4, "#ffd4833a");
		halo.addColorStop(1, "#ffc65300");
		c.fillStyle = halo;
		c.fillRect(x - 110, y - 110, 220, 220);
		ellipse(c, x, y, 23, 23, "#fff1bb");
		ellipse(c, x - 4, y - 4, 16, 16, "#fff8d9");
		c.globalAlpha = night * (1 - strength * 0.85);
		const moonHalo = c.createRadialGradient(x, y, 10, x, y, 90);
		moonHalo.addColorStop(0, "#c7ddff66");
		moonHalo.addColorStop(1, "#accfff00");
		c.fillStyle = moonHalo;
		c.fillRect(x - 90, y - 90, 180, 180);
		ellipse(c, x, y, 19, 19, "#d4e2f0");
		c.save();
		c.beginPath();
		c.arc(x, y, 19, 0, Math.PI * 2);
		c.clip();
		const lunarShade = c.createLinearGradient(x - 19, y, x + 19, y);
		lunarShade.addColorStop(0, "#dbe9f5");
		lunarShade.addColorStop(0.58, "#a9bfd3");
		lunarShade.addColorStop(1, "#526b86");
		c.fillStyle = lunarShade;
		c.fillRect(x - 19, y - 19, 38, 38);
		ellipse(c, x - 7, y - 5, 4, 3, "#8fa7bc55");
		ellipse(c, x + 3, y + 8, 5, 4, "#647f9855");
		ellipse(c, x - 7, y + 9, 2, 2, "#9db2c955");
		c.restore();
		for (let i = 0; i < 60; i++) {
			c.globalAlpha =
				night *
				(1 - strength) *
				(0.25 + 0.25 * (1 + Math.sin(t * 0.4 + i)));
			c.fillStyle = "#dceaff";
			c.fillRect(
				((((Math.sin(i * 78.233) * 43758.5453) % 1) + 1) % 1) * width,
				15 +
					((((Math.sin(i * 39.425 + 7) * 19642.37) % 1) + 1) % 1) *
						height *
						0.55,
				1.3,
				1.3,
			);
		}
		c.restore();
		if (weather.kind === "sand") {
			sandstorm(c, g, width, height, grains);
			return;
		}
		if (strength <= 0) return;
		c.save();
		if (weather.kind === "snow") {
			c.fillStyle = `rgba(185,209,226,${strength * 0.2})`;
			c.fillRect(0, 0, width, height);
			for (
				let i = 0;
				i < 420;
				i +=
					typeof SceneFX !== "undefined"
						? SceneFX.stride("particles")
						: 1
			) {
				const px =
						((i * 173.7 + t * (130 + (i % 5) * 15)) %
							(width + 40)) -
						20,
					py = ((i * 97.3 + t * 80) % (height + 40)) - 20;
				c.globalAlpha = strength * (0.2 + (i % 4) * 0.13);
				ellipse(
					c,
					px,
					py,
					1 + (i % 3) * 0.55,
					1 + (i % 3) * 0.4,
					"#eef6fa",
				);
			}
		} else {
			c.fillStyle = `rgba(15,25,42,${strength * 0.2})`;
			c.fillRect(0, 0, width, height);
			// Soft cloud illumination and a branching discharge; no white-screen strobe.
			const phase = t % 17,
				cycle = Math.floor(t / 17);
			if (
				strength > 0.4 &&
				phase < 1.3 &&
				(typeof SceneFX === "undefined" || SceneFX.options.flashes)
			) {
				const fade =
						Math.sin(Math.PI * Math.min(1, phase / 1.3)) * 0.32,
					bx = width * (0.3 + 0.2 * Math.sin(cycle * 13)),
					by = height * 0.1;
				const glow = c.createRadialGradient(
					bx,
					by,
					5,
					bx,
					by,
					width * 0.35,
				);
				glow.addColorStop(0, "rgba(167,194,231," + fade + ")");
				glow.addColorStop(1, "rgba(130,158,200,0)");
				c.fillStyle = glow;
				c.fillRect(0, 0, width, height * 0.7);
				c.globalAlpha = fade;
				c.strokeStyle = "#afc5df";
				c.lineWidth = 1.2;
				c.shadowColor = "#98b5de";
				c.shadowBlur = 8;
				let x = bx,
					y = 0;
				c.beginPath();
				c.moveTo(x, y);
				for (let i = 1; i < 9; i++) {
					const nx = bx + Math.sin(cycle + i * 4.1) * 25,
						ny = i * height * 0.031;
					c.lineTo(nx, ny);
					if (i === 3 || i === 5) {
						c.moveTo(nx, ny);
						c.lineTo(nx + 35, ny + 14);
						c.lineTo(nx + 45, ny + 35);
						c.moveTo(nx, ny);
					}
					x = nx;
					y = ny;
				}
				c.stroke();
			}
		}
		c.restore();
	}
	return {
		lakePath,
		terrain,
		ground,
		precipitation,
		body,
		damage,
		stormStrength,
		sandstorm,
		fauna,
		fish,
		bird,
		lighting,
		atmosphere,
		sandGrains,
		sandGrainCanvas,
	};
})();
