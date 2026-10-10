/* Look of the orbital battle (0.130, space-rules.js): deep space under the battle — stars, nebula clouds
   over the gas, the gas giant Kharon below with its bands and the glow of its atmosphere — the asteroid
   fields, and the ships seen from above (hull in the side's colours, engine glow, the shield shimmering
   where it was hit). Registers into MapArt and the art chain (Act2Art.body). */
const SpaceArt = (() => {
	const TAU = Math.PI * 2;
	const { seeded, inView } = MapArt;
	const space = (g) => !!RTS.MISSIONS[g.missionId]?.space;
	const viewer = () => (typeof currentGame === "function" ? currentGame()?.viewer : undefined) ?? 0;
	const tintOf = (e) => e.tint || (e.team === viewer() ? "#b0efd0" : "#f07d78");
	const poly = (c, pts, fill, stroke) => {
		c.beginPath();
		pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.closePath();
		if (fill) {
			c.fillStyle = fill;
			c.fill();
		}
		if (stroke) {
			c.strokeStyle = stroke;
			c.lineWidth = 1;
			c.stroke();
		}
	};
	const glowDot = (c, x, y, r, color, alpha = 1) => {
		const g = c.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, color);
		g.addColorStop(1, "rgba(0,0,0,0)");
		c.globalAlpha = alpha;
		c.fillStyle = g;
		c.fillRect(x - r, y - r, 2 * r, 2 * r);
		c.globalAlpha = 1;
	};
	// The planet below: a circle far under the south edge, so its limb crosses the lower part of the map.
	const planetOf = (g) => ({ x: g.W * 0.38, y: g.H * 2.05, r: g.H * 1.32 });

	// ---- the ground: deep space, painted once into the terrain ----
	// The map's world (0.143): planet kind, rocks, colours (RTS.MISSIONS[id].look, space-rules.js).
	const lookOf = (g) => RTS.MISSIONS[g.missionId]?.look || {};
	const hexA = (hex, a) => {
		const v = parseInt(hex.slice(1), 16);
		return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
	};
	function ground(c, g) {
		const rand = seeded(9091),
			n = (g.W * g.H) / (3360 * 2160),
			look = lookOf(g),
			kind = look.planet || "gas",
			tint = { desert: ["#0a0705", "#120d09", "#1a120c"], ice: ["#04090f", "#08131e", "#0c1c2a"], lava: ["#0c0605", "#170b08", "#221009"], none: ["#070407", "#100810", "#180a12"] }[look.blackHole ? "none" : kind] || ["#05070f", "#090d1c", "#0c1226"];
		const sky = c.createLinearGradient(0, 0, g.W * 0.3, g.H);
		sky.addColorStop(0, tint[0]);
		sky.addColorStop(0.55, tint[1]);
		sky.addColorStop(1, tint[2]);
		c.fillStyle = sky;
		c.fillRect(0, 0, g.W, g.H);
		// Faint galactic band and dust.
		for (let i = 0; i < 26 * n; i++) {
			const t = rand(),
				x = t * g.W,
				y = g.H * (0.15 + 0.35 * t) + (rand() - 0.5) * 420,
				r = 180 + rand() * 320;
			glowDot(c, x, y, r, i % 3 ? "rgba(80,96,150,.10)" : "rgba(150,110,160,.08)");
		}
		// Nebula clouds where the gas is, and the map's own clouds (0.164). Since 0.171.5 not six big round
		// smudges but three lobes of smaller puffs round a glowing heart, crossed by dark lanes of dust, so the
		// cloud has a shape and depth.
		const nebulaColor = (k, a) => (look.nebula ? hexA(look.nebula[0][k % 3], a) : ["rgba(168,84,214,A)", "rgba(80,150,230,A)", "rgba(192,90,216,A)"][k % 3].replace("A", a));
		for (const f of g.nebulaClouds?.() || g.gasFields || []) {
			const s = (f.r || 230) / 230;
			glowDot(c, f.x, f.y, 150 * s, nebulaColor(2, 0.16));
			for (let lobe = 0; lobe < 3; lobe++) {
				const la = rand() * TAU,
					ld = (60 + rand() * 80) * s;
				for (let k = 0; k < 6; k++) {
					const a = la + (rand() - 0.5) * 1.3,
						d = ld * (0.35 + rand() * 0.9);
					glowDot(c, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, (60 + rand() * 120) * s, nebulaColor(k + lobe, (0.1 + rand() * 0.07).toFixed(3)));
				}
			}
			c.save();
			c.lineCap = "round";
			for (let k = 0; k < 2; k++) {
				let x = f.x + (rand() - 0.5) * 160 * s,
					y = f.y + (rand() - 0.5) * 160 * s,
					a = rand() * TAU;
				c.strokeStyle = "rgba(3,3,10,.3)";
				c.lineWidth = (10 + rand() * 14) * s;
				c.filter = "blur(6px)";
				c.beginPath();
				c.moveTo(x, y);
				for (let j = 0; j < 9; j++) {
					a += (rand() - 0.5) * 0.7;
					x += Math.cos(a) * 24 * s;
					y += Math.sin(a) * 24 * s;
					c.lineTo(x, y);
				}
				c.stroke();
			}
			c.restore();
		}
		// Stars: many dim ones, some bright with a halo.
		for (let i = 0; i < 2600 * n; i++) {
			const x = rand() * g.W,
				y = rand() * g.H,
				b = rand(),
				s = b > 0.985 ? 2.4 : b > 0.9 ? 1.6 : 1;
			c.fillStyle = b > 0.95 ? (rand() > 0.5 ? "#fff3dc" : "#d8e6ff") : `rgba(200,214,255,${0.25 + b * 0.45})`;
			c.fillRect(x, y, s, s);
			if (b > 0.992) glowDot(c, x + 1, y + 1, 9, "rgba(220,230,255,.45)");
		}
		// Distant galaxies: tilted spirals of faint light with a bright core.
		for (let i = 0; i < 5 * n; i++) {
			const x = 150 + rand() * (g.W - 300),
				y = 120 + rand() * (g.H * 0.55),
				size = 26 + rand() * 40,
				tilt = rand() * TAU,
				hue = rand() > 0.5 ? "255,226,200" : "200,215,255";
			c.save();
			c.translate(x, y);
			c.rotate(tilt);
			c.scale(1, 0.38 + rand() * 0.3);
			for (let arm = 0; arm < 2; arm++)
				for (let k = 0; k < 26; k++) {
					const t = k / 26,
						a = arm * Math.PI + t * 4.2,
						d = t * size;
					c.fillStyle = `rgba(${hue},${(0.22 * (1 - t)).toFixed(3)})`;
					c.beginPath();
					c.arc(Math.cos(a) * d, Math.sin(a) * d, 2.2 + 3 * (1 - t), 0, TAU);
					c.fill();
				}
			glowDot(c, 0, 0, size * 0.45, `rgba(${hue},.55)`);
			c.restore();
		}
		// Nebula filaments: thin glowing wisps curling through the clouds.
		c.save();
		c.lineCap = "round";
		for (const f of g.nebulaClouds?.() || g.gasFields || [])
			for (let k = 0; k < 5; k++) {
				let x = f.x + (rand() - 0.5) * 260,
					y = f.y + (rand() - 0.5) * 260,
					a = rand() * TAU;
				c.strokeStyle = k % 2 ? "rgba(190,120,255,.18)" : "rgba(120,180,255,.14)";
				c.lineWidth = 3 + rand() * 6;
				c.beginPath();
				c.moveTo(x, y);
				for (let s = 0; s < 14; s++) {
					a += (rand() - 0.5) * 0.9;
					x += Math.cos(a) * 26;
					y += Math.sin(a) * 26;
					c.lineTo(x, y);
				}
				c.stroke();
			}
		c.restore();
		// A black hole instead of a planet: its glow, the accretion disk (an ellipse, hot inside), the dark
		// horizon and the photon ring.
		if (look.blackHole) {
			const b = { x: g.W * 0.68, y: g.H * 0.3, r: Math.min(g.W, g.H) * 0.09 };
			glowDot(c, b.x, b.y, b.r * 7, "rgba(255,110,50,.22)");
			c.save();
			c.translate(b.x, b.y);
			c.scale(1, 0.32);
			for (let i = 12; i >= 0; i--) {
				const t = i / 12;
				c.strokeStyle = t < 0.3 ? `rgba(255,240,210,${(0.5 - t).toFixed(2)})` : `rgba(255,${Math.round(150 - t * 100)},${Math.round(60 - t * 40)},${(0.45 * (1 - t)).toFixed(2)})`;
				c.lineWidth = b.r * 0.32;
				c.beginPath();
				c.arc(0, 0, b.r * (1.6 + t * 4), 0, TAU);
				c.stroke();
			}
			c.restore();
			c.fillStyle = "#000";
			c.beginPath();
			c.arc(b.x, b.y, b.r, 0, TAU);
			c.fill();
			c.strokeStyle = "rgba(255,225,190,.9)";
			c.lineWidth = 3;
			c.beginPath();
			c.arc(b.x, b.y, b.r * 1.08, 0, TAU);
			c.stroke();
			// The far side of the disk bent over the horizon.
			c.strokeStyle = "rgba(255,170,90,.55)";
			c.lineWidth = b.r * 0.25;
			c.beginPath();
			c.arc(b.x, b.y, b.r * 1.5, Math.PI * 1.08, Math.PI * 1.92);
			c.stroke();
			return;
		}
		// The planet: banded gas giant, pale ice giant, or a volcanic moon with glowing cracks; a dark night
		// side and a rim of atmosphere in the world's colour.
		const p = planetOf(g),
			PAL = {
				gas: { body: ["#c49a6c", "#7a5a44"], bands: ["#d9b384", "#a8784e", "#e6caa0", "#8c6248", "#c79a6a", "#b5865a"], rim: [140, 200, 255], ring: [214, 196, 170] },
				ice: { body: ["#cfe6f2", "#86b2c8"], bands: ["#e6f4fb", "#a8cfe0", "#f2fbff", "#90bcd2", "#d0e8f4", "#b6d8e8"], rim: [170, 230, 255], ring: [220, 238, 250] },
				lava: { body: ["#3a2420", "#161010"], bands: [], rim: [255, 130, 60], ring: [0, 0, 0] },
				// A desert world (0.164, Eos): sand and rust, faint dust bands, a warm haze.
				desert: { body: ["#d4a46a", "#8a5a34"], bands: ["#e0b47a", "#b8844e", "#ecca94", "#9c6a40", "#d0a066", "#c08c58"], rim: [255, 200, 140], ring: [0, 0, 0] },
			}[kind];
		c.save();
		c.beginPath();
		c.arc(p.x, p.y, p.r, 0, TAU);
		c.clip();
		const body = c.createLinearGradient(0, p.y - p.r, 0, p.y - p.r * 0.6);
		body.addColorStop(0, PAL.body[0]);
		body.addColorStop(1, PAL.body[1]);
		c.fillStyle = body;
		c.fillRect(p.x - p.r, p.y - p.r, 2 * p.r, 2 * p.r);
		const bands = PAL.bands;
		for (let i = 0; i < (bands.length ? 26 : 0); i++) {
			const y = p.y - p.r + i * 46 + rand() * 20,
				h = 14 + rand() * 30;
			c.globalAlpha = 0.35 + rand() * 0.3;
			c.fillStyle = bands[i % bands.length];
			c.beginPath();
			c.moveTo(p.x - p.r, y);
			for (let x = -p.r; x <= p.r; x += 60) c.lineTo(p.x + x, y + Math.sin(x * 0.004 + i) * 10);
			for (let x = p.r; x >= -p.r; x -= 60) c.lineTo(p.x + x, y + h + Math.sin(x * 0.005 + i * 1.7) * 8);
			c.closePath();
			c.fill();
		}
		c.globalAlpha = 1;
		// A storm eye (gas giant only).
		if (kind === "gas") glowDot(c, p.x + p.r * 0.3, p.y - p.r + 260, 90, "rgba(214,120,80,.5)");
		// The volcanic moon: cracks of lava across the crust, glowing.
		if (kind === "lava") {
			c.lineCap = "round";
			for (let i = 0; i < 40; i++) {
				let x = p.x + (rand() - 0.5) * p.r * 1.6,
					y = p.y - p.r + rand() * 700,
					a = rand() * TAU;
				c.strokeStyle = `rgba(255,${Math.round(110 + rand() * 80)},40,${(0.5 + rand() * 0.4).toFixed(2)})`;
				c.lineWidth = 1.5 + rand() * 3;
				c.beginPath();
				c.moveTo(x, y);
				for (let k = 0; k < 8; k++) {
					a += (rand() - 0.5) * 1.4;
					x += Math.cos(a) * 28;
					y += Math.sin(a) * 28;
					c.lineTo(x, y);
				}
				c.stroke();
				glowDot(c, x, y, 18, "rgba(255,120,40,.35)");
			}
		}
		// Swirls: spiral storms and eddies along the band edges.
		c.lineCap = "round";
		for (let i = 0; i < (kind === "lava" ? 0 : 14); i++) {
			const sx = p.x + (rand() - 0.5) * p.r * 1.4,
				sy = p.y - p.r + 60 + rand() * 520,
				R = 18 + rand() * (i ? 40 : 70);
			c.strokeStyle = kind === "ice" ? (i % 3 ? "rgba(245,252,255,.35)" : "rgba(110,150,180,.35)") : i % 3 ? "rgba(240,214,170,.35)" : "rgba(120,74,52,.4)";
			c.lineWidth = 2 + rand() * 3;
			c.beginPath();
			for (let k = 0; k <= 30; k++) {
				const t = k / 30,
					a = t * 9 + i,
					d = R * (1 - t);
				const px = sx + Math.cos(a) * d * 1.8,
					py = sy + Math.sin(a) * d * 0.7;
				k ? c.lineTo(px, py) : c.moveTo(px, py);
			}
			c.stroke();
		}
		// Terminator: the night side towards the east.
		const night = c.createLinearGradient(p.x - p.r * 0.2, 0, p.x + p.r * 0.75, 0);
		night.addColorStop(0, "rgba(4,6,14,0)");
		night.addColorStop(1, "rgba(4,6,14,.92)");
		c.fillStyle = night;
		c.fillRect(p.x - p.r, p.y - p.r, 2 * p.r, 2 * p.r);
		c.restore();
		// Atmosphere rim: a ring only (inside its inner edge a radial gradient would take the first colour).
		const rim = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.05),
			at = (k) => k / 1.05;
		const [rr, rg, rb] = PAL.rim;
		rim.addColorStop(0, `rgba(${rr},${rg},${rb},0)`);
		rim.addColorStop(at(0.97), `rgba(${rr},${rg},${rb},0)`);
		rim.addColorStop(at(1), `rgba(${rr},${rg},${rb},.55)`);
		rim.addColorStop(at(1.015), `rgba(${rr},${rg},${rb},.22)`);
		rim.addColorStop(1, `rgba(${rr},${rg},${rb},0)`);
		c.fillStyle = rim;
		c.beginPath();
		c.arc(p.x, p.y, p.r * 1.05, 0, TAU);
		c.fill();
		// Rings: bands of ice and dust round the planet with gaps between them; the planet's shadow falls
		// across them on its night side (east).
		if (!look.rings && kind !== "gas") return;
		const [qr, qg, qb] = PAL.ring,
			near = look.rings === "near" ? 1.6 : 1,
			RINGS = [[1.12, 0.035 * near, `rgba(${qr},${qg},${qb},${0.16 * near})`], [1.16, 0.02 * near, `rgba(${qr},${qg},${qb},${0.22 * near})`], [1.19, 0.045 * near, `rgba(${qr},${qg},${qb},${0.14 * near})`], [1.255, 0.012 * near, `rgba(${qr},${qg},${qb},${0.18 * near})`]];
		for (const [k, w, color] of RINGS) {
			c.strokeStyle = color;
			c.lineWidth = p.r * w;
			c.beginPath();
			c.arc(p.x, p.y, p.r * k, 0, TAU);
			c.stroke();
		}
		for (let i = 0; i < 900 * n; i++) {
			const a = Math.PI + rand() * Math.PI,
				d = p.r * (1.1 + rand() * 0.17),
				x = p.x + Math.cos(a) * d,
				y = p.y + Math.sin(a) * d;
			c.fillStyle = `rgba(235,225,210,${(0.15 + rand() * 0.35).toFixed(2)})`;
			c.fillRect(x, y, 1.5, 1.5);
		}
		const shade = c.createLinearGradient(p.x + p.r * 0.2, 0, p.x + p.r * 0.9, 0);
		shade.addColorStop(0, "rgba(3,5,12,0)");
		shade.addColorStop(1, "rgba(3,5,12,.75)");
		c.save();
		c.beginPath();
		c.arc(p.x, p.y, p.r * 1.3, 0, TAU);
		c.arc(p.x, p.y, p.r * 1.06, 0, TAU, true);
		c.clip();
		c.fillStyle = shade;
		c.fillRect(p.x, p.y - p.r * 1.3, p.r * 1.3, p.r * 2.6);
		c.restore();
	}
	// ---- asteroid fields: a cluster of tumbling rocks (the 3D board builds them in 3D) ----
	// Stone of the asteroids by the map's look: mixed rock, ice, dark basalt (the 2D board, set per terrain).
	const STONE = { rock: ["#4a4846", "#6b6660", "#2e2c2c", "#6c665e"], ice: ["#8fa6b6", "#c4d6e2", "#5f7484", "#d8e8f2"], dark: ["#2c2928", "#4a4542", "#1a1817", "#46403c"], hulk: ["#3e3836", "#5a524e", "#241f1d", "#5e5650"] };
	let stone = "rock";
	// A dead warship's hulk along the long side of its field: hull, torn ribs, plates, red lights.
	function hulk(c, o, rand, time = 0) {
		const long = o.w >= o.h,
			L = (long ? o.w : o.h) * 0.95,
			B = (long ? o.h : o.w) * 0.8;
		c.save();
		c.translate(o.x + o.w / 2, o.y + o.h / 2);
		if (!long) c.rotate(Math.PI / 2);
		c.fillStyle = "rgba(0,0,0,.35)";
		c.fillRect(-L / 2 + 12, -B / 2 + 16, L, B);
		poly(c, [[L * 0.5, -B * 0.25], [L * 0.42, -B * 0.5], [-L * 0.3, -B * 0.5], [-L * 0.36, -B * 0.3], [-L * 0.33, B * 0.4], [-L * 0.25, B * 0.5], [L * 0.42, B * 0.5], [L * 0.5, B * 0.25]], "#4a4440", "#2a2624");
		c.strokeStyle = "#3e3834";
		c.lineWidth = 3;
		for (let i = 0; i < 6; i++) {
			const x = -L * 0.36 - i * 10;
			c.beginPath();
			c.moveTo(x, -B * 0.45);
			c.lineTo(x - 3, B * 0.45);
			c.stroke();
		}
		for (let i = 0; i < 8; i++) {
			c.fillStyle = i % 3 ? "#5c5652" : "#2a1e1a";
			c.fillRect(-L * 0.25 + i * L * 0.08, -B * 0.3 + rand() * B * 0.3, L * 0.06, B * 0.25);
		}
		c.fillStyle = "#2e2a28";
		c.fillRect(L * 0.02, -B * 0.15, B * 0.6, B * 0.3);
		for (let i = 0; i < 4; i++) glowDot(c, (-0.3 + i * 0.2) * L, (i % 2 ? 1 : -1) * B * 0.38, 7, "rgba(255,60,40,.8)");
		c.restore();
	}
	function asteroid(c, x, y, r, rand) {
		const pts = [];
		for (let k = 0; k < 9; k++) {
			const a = (k / 9) * TAU,
				d = r * (0.72 + rand() * 0.4);
			pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
		}
		c.fillStyle = "rgba(0,0,0,.35)";
		c.beginPath();
		c.ellipse(x + r * 0.35, y + r * 0.45, r, r * 0.8, 0, 0, TAU);
		c.fill();
		const [mid, edge, dark, lit] = STONE[stone] || STONE.rock;
		poly(c, pts, mid, edge);
		// Lit side (the sun from the north-west) and craters.
		poly(c, pts.slice(3, 8).map(([px, py]) => [px + (x - px) * 0.25, py + (y - py) * 0.25]).concat([[x, y]]), dark);
		poly(c, pts.slice(0, 2).concat(pts.slice(7)).map(([px, py]) => [px + (x - px) * 0.2, py + (y - py) * 0.2]).concat([[x, y]]), lit);
		for (let k = 0; k < 3; k++) {
			c.fillStyle = "rgba(20,18,18,.5)";
			c.beginPath();
			c.arc(x + (rand() - 0.5) * r, y + (rand() - 0.5) * r, r * (0.08 + rand() * 0.12), 0, TAU);
			c.fill();
		}
	}
	// A gantry of an orbital shipyard (0.164): two lattice girders along the long side, cross braces, beacons at
	// the ends, work lights; over long berths a crane and the ribs of a hull being built.
	function dock(c, o, rand) {
		const long = o.w >= o.h,
			L = (long ? o.w : o.h) * 0.96,
			B = Math.min((long ? o.h : o.w) * 0.9, 90);
		c.save();
		c.translate(o.x + o.w / 2, o.y + o.h / 2);
		if (!long) c.rotate(Math.PI / 2);
		c.fillStyle = "rgba(0,0,0,.35)";
		c.fillRect(-L / 2 + 14, -B / 2 + 18, L, B);
		if (L > 320) {
			c.strokeStyle = "#6c767c";
			c.lineWidth = 3;
			c.beginPath();
			c.moveTo(-L * 0.31, 0);
			c.lineTo(L * 0.31, 0);
			c.stroke();
			for (let x = -L * 0.3; x <= L * 0.3; x += 24) {
				const s = 1 - (Math.abs(x) / (L * 0.34)) ** 2;
				if (s <= 0.1) continue;
				c.beginPath();
				c.moveTo(x, -B * 0.3 * s);
				c.lineTo(x, B * 0.3 * s);
				c.stroke();
			}
			glowDot(c, L * 0.12, 0, 14, "rgba(120,220,255,.85)");
		}
		const bays = Math.max(2, Math.round(L / 24));
		for (const z of [-B / 2, B / 2]) {
			c.fillStyle = "#8c969c";
			c.fillRect(-L / 2, z - 4, L, 8);
			c.strokeStyle = "#454d53";
			c.lineWidth = 1.5;
			c.beginPath();
			for (let k = 0; k < bays; k++) {
				const x = -L / 2 + (k * L) / bays;
				c.moveTo(x, z - 4);
				c.lineTo(x + L / bays, z + 4);
			}
			c.stroke();
		}
		c.fillStyle = "#5a6268";
		const spans = Math.max(2, Math.round(L / 110));
		for (let k = 0; k <= spans; k++) c.fillRect(-L / 2 + (k * L) / spans - 2, -B / 2, 4, B);
		if (L > 220) {
			c.fillStyle = "#d8a838";
			c.fillRect((rand() - 0.5) * L * 0.5 - 6, -B / 2 - 8, 12, B + 16);
		}
		for (const x of [-L / 2 + 4, L / 2 - 4]) for (const z of [-B / 2, B / 2]) glowDot(c, x, z, 8, "rgba(255,80,50,.9)");
		for (let x = -L / 2 + 30, k = 0; x < L / 2 - 20; x += 60, k++) glowDot(c, x, (k % 2 ? -1 : 1) * B / 2, 6, "rgba(255,230,170,.85)");
		c.restore();
	}
	function field(c, o, rand) {
		if (o.kind === "hulk") return hulk(c, o, rand);
		if (o.kind === "dock") return dock(c, o, rand);
		const cx = o.x + o.w / 2,
			cy = o.y + o.h / 2,
			count = Math.max(4, Math.round((o.w * o.h) / 3200));
		glowDot(c, cx, cy, Math.max(o.w, o.h) * 0.8, "rgba(120,110,100,.12)");
		const rocks = [];
		for (let k = 0; k < count; k++) {
			const a = rand() * TAU,
				d = Math.sqrt(rand()) * 0.85;
			rocks.push([cx + Math.cos(a) * (o.w / 2) * d, cy + Math.sin(a) * (o.h / 2) * d, 8 + rand() * Math.min(o.w, o.h) * 0.22]);
		}
		rocks.sort((a, b) => a[2] - b[2]);
		for (const [x, y, r] of rocks) asteroid(c, x, y, r, rand);
	}
	function terrain(c, g) {
		if (!space(g)) return;
		ground(c, g);
		if (RTS.bareGround) return;
		stone = lookOf(g).rocks === "hulk" ? "dark" : lookOf(g).rocks || "rock";
		const rand = seeded(5150);
		for (const o of g.obstacles) field(c, o, rand);
	}
	// Twinkling bright stars above the painted ground (animated, unlit).
	function effects(c, g, view) {
		if (!space(g)) return;
		const rand = seeded(77),
			n = (g.W * g.H) / (3360 * 2160);
		for (let i = 0; i < 60 * n; i++) {
			const p = { x: rand() * g.W, y: rand() * g.H },
				phase = rand() * TAU;
			if (!inView(p, view)) continue;
			const a = 0.25 + 0.25 * Math.sin(g.time * (1.2 + rand()) + phase);
			glowDot(c, p.x, p.y, 6, `rgba(230,238,255,${a.toFixed(3)})`);
		}
		// Solar storm (0.142): a warm wash from the sun's side and golden streaks of the solar wind.
		const solar = g.weather?.kind === "solar" ? g.weather.intensity : 0;
		if (solar > 0.03) {
			c.save();
			c.globalCompositeOperation = "lighter";
			const wash = c.createLinearGradient(view.x, view.y, view.x + view.w, view.y + view.h);
			wash.addColorStop(0, `rgba(255,190,110,${(0.12 * solar).toFixed(3)})`);
			wash.addColorStop(1, "rgba(255,190,110,0)");
			c.fillStyle = wash;
			c.fillRect(view.x, view.y, view.w, view.h);
			const rs = seeded(91);
			c.strokeStyle = `rgba(255,210,140,${(0.35 * solar).toFixed(3)})`;
			c.lineWidth = 1.2;
			for (let i = 0; i < 120; i++) {
				const span = view.w + view.h,
					u = (rs() * span + g.time * (400 + rs() * 300)) % span,
					x = view.x + u * 0.62 - view.h * 0.2,
					y = view.y + rs() * view.h + u * 0.3 - view.h * 0.2,
					len = 30 + rs() * 40;
				c.beginPath();
				c.moveTo(x, y);
				c.lineTo(x - len * 0.77, y - len * 0.64);
				c.stroke();
			}
			c.restore();
		}
		// Asteroid shower (0.142): burning fragments streaking down across the view.
		const shower = g.weather?.kind === "meteor" ? g.weather.intensity : 0;
		if (shower > 0.03) {
			c.save();
			c.globalCompositeOperation = "lighter";
			const rm = seeded(17);
			for (let i = 0; i < 40 * shower; i++) {
				const period = 1.5 + rm() * 2,
					t = ((g.time + rm() * period) % period) / period,
					x0 = view.x + rm() * view.w,
					y0 = view.y + rm() * view.h * 0.6,
					x = x0 + t * 160,
					y = y0 + t * 260,
					tail = c.createLinearGradient(x, y, x - 40, y - 65);
				tail.addColorStop(0, `rgba(255,240,200,${(0.8 * shower).toFixed(3)})`);
				tail.addColorStop(1, "rgba(255,90,30,0)");
				c.strokeStyle = tail;
				c.lineWidth = 2.2;
				c.beginPath();
				c.moveTo(x, y);
				c.lineTo(x - 40, y - 65);
				c.stroke();
			}
			c.restore();
		}
		// Ion storm (0.140): rippling bands of plasma light (green below, violet above) drifting over the view.
		const k = g.weather?.kind === "ion" ? g.weather.intensity : 0;
		if (k > 0.03) {
			c.save();
			c.globalCompositeOperation = "lighter";
			for (let b = 0; b < 4; b++) {
				const y0 = view.y + view.h * (0.15 + b * 0.22) + Math.sin(g.time * 0.2 + b) * 60;
				for (let x = view.x; x < view.x + view.w; x += 18) {
					const wave = Math.sin(x * 0.004 + g.time * 0.5 + b * 1.7) * 50 + Math.sin(x * 0.011 - g.time * 0.9) * 18,
						ray = 0.5 + 0.5 * Math.sin(x * 0.09 + g.time * 2 + b * 3),
						h = 60 + ray * 80,
						grad = c.createLinearGradient(0, y0 + wave + h, 0, y0 + wave - h);
					grad.addColorStop(0, "rgba(60,255,170,0)");
					grad.addColorStop(0.4, `rgba(60,255,170,${(0.06 * k * ray).toFixed(3)})`);
					grad.addColorStop(1, `rgba(170,90,255,${(0.05 * k).toFixed(3)})`);
					c.fillStyle = grad;
					c.fillRect(x, y0 + wave - h, 16, h * 2);
				}
			}
			c.restore();
		}
	}

	// ---- ships, seen from above, nose along +X ----
	const HULLS = {
		corvette: { len: 15, beam: 7, shape: [[1, 0], [0.2, 0.45], [-0.6, 0.6], [-0.85, 0.25], [-0.85, -0.25], [-0.6, -0.6], [0.2, -0.45]], engines: [[-0.85, 0.3], [-0.85, -0.3]] },
		frigate: { len: 21, beam: 9, shape: [[1, 0], [0.55, 0.3], [0.1, 0.38], [-0.2, 0.75], [-0.75, 0.75], [-0.9, 0.35], [-0.9, -0.35], [-0.75, -0.75], [-0.2, -0.75], [0.1, -0.38], [0.55, -0.3]], engines: [[-0.9, 0.5], [-0.9, 0], [-0.9, -0.5]] },
		lancer: { len: 27, beam: 9, shape: [[1, 0], [0.75, 0.12], [0.2, 0.3], [-0.3, 0.75], [-0.85, 0.65], [-0.95, 0.3], [-0.95, -0.3], [-0.85, -0.65], [-0.3, -0.75], [0.2, -0.3], [0.75, -0.12]], engines: [[-0.95, 0.42], [-0.95, -0.42]], spine: true },
		carrier: { len: 38, beam: 16, shape: [[1, 0.25], [0.95, 0.5], [-0.85, 0.55], [-0.95, 0.3], [-0.95, -0.3], [-0.85, -0.55], [0.95, -0.5], [1, -0.25]], engines: [[-0.95, 0.4], [-0.95, 0.12], [-0.95, -0.12], [-0.95, -0.4]], deck: true },
		pirate: { len: 16, beam: 8, shape: [[1, 0.15], [0.7, 0.5], [-0.2, 0.55], [-0.4, 0.9], [-0.8, 0.6], [-0.85, -0.4], [-0.3, -0.7], [0.6, -0.4], [1, -0.15]], engines: [[-0.85, 0.3], [-0.85, -0.2]], paint: "#4a2a26", band: "#d8a028" },
		fighter: { len: 7, beam: 5, shape: [[1, 0], [-0.4, 0.9], [-0.8, 0.5], [-0.6, 0], [-0.8, -0.5], [-0.4, -0.9]], engines: [[-0.6, 0]] },
		cruiser: { len: 35, beam: 15, shape: [[1, 0], [0.7, 0.35], [0.3, 0.5], [0.1, 0.8], [-0.4, 0.85], [-0.6, 0.55], [-0.95, 0.5], [-0.95, -0.5], [-0.6, -0.55], [-0.4, -0.85], [0.1, -0.8], [0.3, -0.5], [0.7, -0.35]], engines: [[-0.95, 0.32], [-0.95, 0], [-0.95, -0.32]], turrets: [[0.45, 0], [-0.05, 0.4], [-0.05, -0.4]] },
	};
	// The pirates' hideout: a hollowed asteroid with bolted-on modules, a turning docking ring, red beacons.
	function hideout(c, e, time) {
		const R = RTS.TYPES.pirateBase.radius,
			rand = seeded(e.id * 7 + 3);
		c.save();
		c.fillStyle = "rgba(0,0,0,.35)";
		c.beginPath();
		c.ellipse(14, 20, R * 1.1, R * 0.85, 0, 0, TAU);
		c.fill();
		asteroid(c, 0, 0, R * 0.75, rand);
		asteroid(c, R * 0.5, R * 0.25, R * 0.35, rand);
		poly(c, [[-R * 0.45, -R * 0.35], [R * 0.1, -R * 0.45], [R * 0.2, -R * 0.1], [-R * 0.35, 0]], "#4a2a26", "#1b1b1b");
		c.fillStyle = "#d8a028";
		for (let i = 0; i < 4; i++) c.fillRect(-R * 0.35 + i * 7, -R * 0.42, 4, 3);
		c.strokeStyle = "#2a2626";
		c.lineWidth = 3;
		c.beginPath();
		c.arc(0, 0, R * 1.05, 0, TAU);
		c.stroke();
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * TAU + time * 0.25,
				on = (time * 1.1 + i * 0.25) % 1 < 0.35;
			if (on) glowDot(c, Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05, 9, "rgba(255,70,40,.9)");
		}
		c.restore();
		return true;
	}
	// The mining drone (the worker in space): a pod with four thrusters on arms, grabbers at the nose, a
	// cargo light when loaded, a mining beam while it works.
	function drone(c, e, time, game) {
		const tint = tintOf(e),
			dom = e.faction === "dominion" || (!e.faction && e.team !== viewer()),
			hot = dom ? "rgba(255,170,90," : "rgba(140,230,255,",
			moving = e.path?.length > 0,
			bob = Math.sin(time * 2.2 + e.id) * 1;
		c.save();
		c.fillStyle = "rgba(0,0,0,.28)";
		c.beginPath();
		c.ellipse(7, 10, 11, 8, 0, 0, TAU);
		c.fill();
		c.translate(0, bob - 4);
		c.rotate(e.angle);
		// Thrusters on arms, glowing (brighter while moving).
		for (const [x, y] of [[5, 7], [5, -7], [-6, 7], [-6, -7]]) {
			c.strokeStyle = "#59666a";
			c.lineWidth = 1.5;
			c.beginPath();
			c.moveTo(x * 0.3, y * 0.4);
			c.lineTo(x, y);
			c.stroke();
			glowDot(c, x, y, moving ? 6 : 4, hot + (moving ? ".8)" : ".5)"));
			c.fillStyle = "#2c3437";
			c.beginPath();
			c.arc(x, y, 2.2, 0, TAU);
			c.fill();
		}
		poly(c, [[9, 0], [5, 4.5], [-6, 5], [-8, 0], [-6, -5], [5, -4.5]], dom ? "#6b5552" : "#7d918c", "#1b2326");
		c.fillStyle = tint;
		c.fillRect(-5, -2, 3, 4);
		c.fillStyle = (e.cargo || 0) > 0 ? "#e8c56a" : "#3a4448";
		c.fillRect(-1.5, -2.5, 4, 5);
		c.fillStyle = dom ? "#ffb070" : "#8ff0e4";
		c.beginPath();
		c.ellipse(5, 0, 2.2, 1.6, 0, 0, TAU);
		c.fill();
		// Grabbers.
		c.strokeStyle = "#a9bfb5";
		c.lineWidth = 1.2;
		for (const side of [-1, 1]) {
			c.beginPath();
			c.moveTo(8, side * 2);
			c.lineTo(12, side * 2.6);
			c.lineTo(13, side * 1);
			c.stroke();
		}
		c.restore();
		// Mining beam to the deposit it works on.
		const working = e.order?.kind === "gather" && !moving && (e.work || 0) > 0;
		if (working) {
			const o = [...(game.ores || []), ...(game.gasFields || []), ...(game.crystalFields || [])].sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
			if (o && Math.hypot(o.x - e.x, o.y - e.y) < 90) {
				c.save();
				c.strokeStyle = hot + (0.55 + 0.3 * Math.sin(time * 25)).toFixed(2) + ")";
				c.lineWidth = 2;
				c.beginPath();
				c.moveTo(0, bob - 4);
				c.lineTo(o.x - e.x, o.y - e.y);
				c.stroke();
				glowDot(c, o.x - e.x, o.y - e.y, 8, hot + ".7)");
				c.restore();
			}
		}
		return true;
	}
	// A station's platform under a building in space (the building is drawn over it by the rest of the chain).
	function platform(c, e, time) {
		const s = RTS.TYPES[e.type],
			R = s.radius * 1.3,
			dom = e.faction === "dominion" || (!e.faction && e.team !== viewer()),
			pts = Array.from({ length: 8 }, (_, i) => {
				const a = ((i + 0.5) / 8) * TAU;
				return [Math.cos(a) * R, Math.sin(a) * R * 0.92];
			});
		c.fillStyle = "rgba(0,0,0,.35)";
		c.beginPath();
		c.ellipse(14, 20, R, R * 0.85, 0, 0, TAU);
		c.fill();
		poly(c, pts, "#2c3437", "#56636a");
		poly(c, pts.map(([x, y]) => [x * 0.86, y * 0.86]), "#3a4448");
		for (let i = 0; i < 8; i++) {
			const [x, y] = pts[i],
				on = (Math.floor(time * 1.5) + i) % 4 !== 0;
			c.fillStyle = on ? (i % 2 ? "#fff1c8" : dom ? "#ffb070" : "#8ff0e4") : "#46524f";
			c.fillRect(x * 0.94 - 1.5, y * 0.94 - 1.5, 3, 3);
		}
	}
	function body(c, e, time) {
		const game = typeof currentGame === "function" ? currentGame() : null;
		if (game?.space && !RTS.TYPES[e.type]?.speed && !["wall", "gate"].includes(e.type) && !RTS.TYPES[e.type]?.threat && !RTS.TYPES[e.type]?.pirate) {
			platform(c, e, time);
			return false;
		}
		if (game?.space && e.type === "worker") return drone(c, e, time, game);
		if (e.type === "pirateBase") return hideout(c, e, time);
		const h = HULLS[e.type];
		if (!h) return false;
		// Inside a nebula the ship shows through the haze.
		const hazy = !!game?.inNebula?.(e);
		const tint = tintOf(e),
			dom = e.faction === "dominion" || (!e.faction && e.team !== viewer()),
			moving = e.path?.length > 0,
			bob = Math.sin(time * 2 + e.id) * 1.2,
			pts = h.shape.map(([x, y]) => [x * h.len, y * h.beam]);
		c.save();
		if (hazy) c.globalAlpha = 0.72;
		// Shadow far below on the plane of the battle.
		c.fillStyle = "rgba(0,0,0,.28)";
		c.beginPath();
		c.ellipse(10, 14, h.len * 0.8, h.beam * 0.6, e.angle, 0, TAU);
		c.fill();
		c.translate(0, bob);
		c.rotate(e.angle);
		// Engine plumes.
		for (const [x, y] of h.engines) {
			const len = (moving ? 14 : 6) + Math.sin(time * 30 + e.id + y) * 2;
			const g = c.createLinearGradient(x * h.len, 0, x * h.len - len, 0);
			g.addColorStop(0, dom ? "rgba(255,170,90,.95)" : "rgba(140,230,255,.95)");
			g.addColorStop(1, "rgba(0,0,0,0)");
			c.fillStyle = g;
			c.beginPath();
			c.moveTo(x * h.len, y * h.beam - 2.2);
			c.lineTo(x * h.len - len, y * h.beam);
			c.lineTo(x * h.len, y * h.beam + 2.2);
			c.fill();
		}
		poly(c, pts, h.paint || (dom ? "#6b5552" : "#7d918c"), "#1b2326");
		// Darker plating along the keel, the side's colour band, the bridge.
		poly(c, pts.map(([x, y]) => [x * 0.75 - h.len * 0.05, y * 0.45]), dom ? "#4d3b3c" : "#4f6662");
		c.fillStyle = h.band || tint;
		c.fillRect(-h.len * 0.55, -h.beam * 0.62, h.len * 0.22, h.beam * 1.24);
		// The carrier's flight deck: a dark strip with a dashed runway and edge lights, the island aside.
		if (h.deck) {
			c.fillStyle = "#2a3135";
			c.fillRect(-h.len * 0.8, -h.beam * 0.32, h.len * 1.7, h.beam * 0.64);
			c.fillStyle = "#cfd6d4";
			for (let x = -h.len * 0.75; x < h.len * 0.85; x += 5) c.fillRect(x, -0.5, 2.6, 1);
			for (let x = -h.len * 0.75, n = 0; x < h.len * 0.9; x += 4, n++) {
				c.fillStyle = (n + Math.floor(time * 6)) % 6 === 0 ? (dom ? "#ffb070" : "#8ff0e4") : "#3c4a4c";
				c.fillRect(x, -h.beam * 0.34, 1.6, 1.4);
				c.fillRect(x, h.beam * 0.34 - 1.4, 1.6, 1.4);
			}
			c.fillStyle = dom ? "#6b5552" : "#7d918c";
			c.fillRect(-h.len * 0.2, h.beam * 0.36, h.len * 0.28, h.beam * 0.2);
		}
		if (h.spine) {
			c.fillStyle = "#2a3135";
			c.fillRect(-h.len * 0.2, -1.6, h.len * 1.15, 3.2);
			c.fillStyle = dom ? "#ffb070" : "#9ff7ff";
			c.fillRect(h.len * 0.85, -1, 3, 2);
		}
		for (const [x, y] of h.turrets || []) {
			c.fillStyle = "#2c3437";
			c.beginPath();
			c.arc(x * h.len, y * h.beam, 3.2, 0, TAU);
			c.fill();
			c.fillStyle = "#59666a";
			c.fillRect(x * h.len, y * h.beam - 0.8, 6, 1.6);
		}
		c.fillStyle = dom ? "#ffb070" : "#8ff0e4";
		c.beginPath();
		c.ellipse(h.len * 0.28, 0, h.len * 0.09, h.beam * 0.16, 0, 0, TAU);
		c.fill();
		c.restore();
		// Shield shimmer: bright for a moment after a hit, faint while it is charging back.
		const cap = RTS.TYPES[e.type].shield,
			since = time - (e.shieldHit ?? -1e9),
			flash = since < 0.4 ? 1 - since / 0.4 : 0;
		if (cap && (flash > 0 || (e.shield ?? cap) > 0)) {
			const level = (e.shield ?? cap) / cap,
				a = flash * 0.55 * Math.max(0.3, level);
			if (a > 0.01) {
				c.save();
				c.translate(0, bob);
				c.strokeStyle = `rgba(140,220,255,${a.toFixed(3)})`;
				c.lineWidth = 2;
				c.beginPath();
				c.ellipse(0, 0, h.len * 1.15, h.beam * 1.6 + 4, e.angle, 0, TAU);
				c.stroke();
				c.fillStyle = `rgba(120,200,255,${(a * 0.25).toFixed(3)})`;
				c.fill();
				c.restore();
			}
		}
		return true;
	}
	// ---- relays: a buoy floating over the plane (render-canvas.js drawNode keeps the zone and capture) ----
	function relay(c, g, color, time) {
		if (!g?.space) return false;
		const bob = Math.sin(time * 1.4) * 2,
			spin = time * 0.5;
		c.save();
		c.fillStyle = "rgba(0,0,0,.3)";
		c.beginPath();
		c.ellipse(10, 16, 26, 20, 0, 0, TAU);
		c.fill();
		c.translate(0, -8 + bob);
		// Solar panels on two arms, turning slowly.
		c.save();
		c.rotate(spin * 0.3);
		for (const side of [-1, 1]) {
			c.fillStyle = "#59666a";
			c.fillRect(side * 12 - (side < 0 ? 8 : 0), -1.5, 8, 3);
			poly(c, [[side * 20, -9], [side * 40, -9], [side * 40, 9], [side * 20, 9]], "#1f3a5c", "#6d8fb0");
			c.strokeStyle = "rgba(160,200,240,.35)";
			c.lineWidth = 1;
			for (let k = 1; k < 4; k++) {
				c.beginPath();
				c.moveTo(side * (20 + k * 5), -9);
				c.lineTo(side * (20 + k * 5), 9);
				c.stroke();
			}
		}
		c.restore();
		// The ring in the owner's colour and the core.
		c.strokeStyle = "#3a4448";
		c.lineWidth = 6;
		c.beginPath();
		c.arc(0, 0, 17, 0, TAU);
		c.stroke();
		c.strokeStyle = color;
		c.lineWidth = 2.5;
		c.shadowColor = color;
		c.shadowBlur = 10;
		c.beginPath();
		c.arc(0, 0, 17, spin, spin + TAU * 0.8);
		c.stroke();
		c.shadowBlur = 0;
		poly(c, Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * TAU) * 10, Math.sin((i / 6) * TAU) * 10]), "#4f6962", "#a9bfb5");
		glowDot(c, 0, 0, 14, color);
		c.fillStyle = "#fff";
		c.fillRect(-2, -2, 4, 4);
		// Antennae and a blinking beacon.
		c.strokeStyle = "#a9bfb5";
		c.lineWidth = 1.5;
		for (const a of [-2.3, -0.85]) {
			c.beginPath();
			c.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
			c.lineTo(Math.cos(a) * 30, Math.sin(a) * 30);
			c.stroke();
		}
		if (Math.floor(time * 1.5) % 2) glowDot(c, Math.cos(-0.85) * 31, Math.sin(-0.85) * 31, 7, color);
		c.restore();
		return true;
	}

	// ---- deposits in space: ore asteroids, nebula gas pockets, crystal shards ----
	function oreAsteroid(c, n, time) {
		const rand = seeded(31),
			k = 0.55 + (n / 6) * 0.45;
		c.fillStyle = "rgba(0,0,0,.3)";
		c.beginPath();
		c.ellipse(12, 18, 34 * k, 22 * k, 0, 0, TAU);
		c.fill();
		if (!n) {
			for (let i = 0; i < 5; i++) asteroid(c, (rand() - 0.5) * 40, (rand() - 0.5) * 26, 4 + rand() * 4, rand);
			return;
		}
		const rocks = [[0, 0, 24], [-26, 8, 12], [24, 10, 10], [10, -20, 8], [-16, -18, 7]].slice(0, 1 + Math.ceil(n * 0.7));
		for (const [x, y, r] of rocks) {
			asteroid(c, x * k, y * k, r * k, rand);
			// Metal veins and nuggets breaking through the rock.
			c.strokeStyle = "rgba(170,230,240,.75)";
			c.lineWidth = 1.6;
			c.beginPath();
			c.moveTo(x * k - r * k * 0.5, y * k - r * k * 0.1);
			c.lineTo(x * k - r * k * 0.1, y * k + r * k * 0.2);
			c.lineTo(x * k + r * k * 0.45, y * k - r * k * 0.15);
			c.stroke();
			c.fillStyle = "#c9f2f6";
			c.fillRect(x * k + r * k * 0.1, y * k - r * k * 0.35, 3, 3);
		}
		const tw = 0.5 + 0.5 * Math.sin(time * 2.2);
		glowDot(c, 4 * k, -8 * k, 8, `rgba(200,250,255,${(0.35 + tw * 0.4).toFixed(2)})`);
	}
	function gasPocket(c, n, time, flow) {
		const k = n ? 0.45 + (n / 6) * 0.55 : 0.25,
			pulse = 1 + Math.sin(time * 1.3) * 0.06;
		glowDot(c, 0, 0, 62 * k * pulse, "rgba(170,90,230,.45)");
		glowDot(c, -14 * k, 8 * k, 40 * k, "rgba(90,150,240,.35)");
		glowDot(c, 0, 0, 22 * k, "rgba(235,200,255,.8)");
		// Curling wisps.
		c.save();
		c.rotate(time * 0.15);
		c.strokeStyle = "rgba(220,170,255,.45)";
		c.lineWidth = 2;
		for (let i = 0; i < 3; i++) {
			c.beginPath();
			c.arc(0, 0, (18 + i * 10) * k * 1.6, i * 2, i * 2 + 2.2);
			c.stroke();
		}
		c.restore();
		if (flow)
			for (let i = 0; i < 6; i++) {
				const t = (time * 0.8 + i / 6) % 1;
				glowDot(c, 0, -t * 46, 6 * (1 - t), `rgba(230,190,255,${(0.7 * (1 - t)).toFixed(2)})`);
			}
	}
	function crystalShards(c, n, time) {
		const rand = seeded(57);
		c.fillStyle = "rgba(0,0,0,.3)";
		c.beginPath();
		c.ellipse(10, 16, 26, 16, 0, 0, TAU);
		c.fill();
		asteroid(c, 0, 4, 15, rand);
		const k = 0.6 + (n / 6) * 0.4,
			shards = [[-8, -2, 22, -0.4], [4, -4, 28, 0.15], [12, 2, 18, 0.55], [-2, 6, 14, -0.1], [-14, 6, 12, -0.8], [16, 8, 11, 0.9], [6, 10, 9, 0.3]].slice(0, n ? n + 1 : 0);
		for (const [x, y, h, lean] of shards) {
			c.save();
			c.translate(x, y);
			c.rotate(lean);
			const H = h * k;
			poly(c, [[0, -H], [4, -H * 0.55], [3, 0], [-3, 0], [-4, -H * 0.55]], "rgba(255,214,120,.85)", "#fff2c4");
			poly(c, [[0, -H], [4, -H * 0.55], [3, 0], [0, 0]], "rgba(200,150,60,.7)");
			c.restore();
		}
		if (n) glowDot(c, 4, -18 * k, 10, `rgba(255,236,170,${(0.4 + 0.3 * Math.sin(time * 3)).toFixed(2)})`);
	}
	const label = (c, l, y) => {
		c.fillStyle = l.color;
		c.font = "11px Segoe UI";
		c.textAlign = "center";
		c.fillText(l.text, 0, y);
	};
	if (typeof BoardArt !== "undefined") {
		const resource = BoardArt.resource,
			crystal = BoardArt.crystal,
			now = () => (typeof currentGame === "function" ? currentGame() : null);
		BoardArt.resource = (c, o, gas, time, withLabel = true, flow = false) => {
			if (!now()?.space) return resource(c, o, gas, time, withLabel, flow);
			c.save();
			c.translate(o.x, o.y);
			const n = BoardArt.resourceLook(o, gas);
			if (gas) gasPocket(c, n, time, flow);
			else oreAsteroid(c, n, time);
			if (withLabel) label(c, BoardArt.resourceLabel(o, gas), 48);
			c.restore();
		};
		BoardArt.crystal = (c, o, withLabel = true) => {
			const g = now();
			if (!g?.space) return crystal(c, o, withLabel);
			c.save();
			c.translate(o.x, o.y);
			crystalShards(c, BoardArt.crystalLook(o), g.time || 0);
			if (withLabel) label(c, BoardArt.crystalLabel(o), 44);
			c.restore();
		};
	}

	MapArt.extend({
		terrain,
		effects,
		baseColor: (g) => (space(g) ? "#070a14" : null),
		color: (kind) => (kind === "asteroids" ? "#4a4846" : null),
	});
	return { body, terrain, planetOf, relay };
})();
// First in the art chain: ships.
if (typeof Act2Art !== "undefined") {
	const previousBody = Act2Art.body;
	Act2Art.body = (c, e, time) => SpaceArt.body(c, e, time) || previousBody(c, e, time);
}
