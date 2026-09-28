/* Stage F5 art, redrawn in the "obsidian guardians" style (variant C-A, matte): every Swarm building is a set of
   tall tapering black monoliths with pointed crowns and seams cut into the stone; units are angular obsidian
   sentries and four-legged walkers. No glow: the only colour is the team stripe. Drawn in Canvas; the WebGL
   renderer bakes the same drawings. */
const SwarmArt = (() => {
	const TAU = Math.PI * 2;
	const FRONT = "#1b2027",
		SIDE = "#0e1216",
		ROOF = "#3a434e",
		LIT = "#4d5866",
		EDGE = "#06090c",
		GROOVE = "#05080b",
		LIP = "#6a7581",
		LEG = "#10151a",
		PLINTH = "#303336";
	const poly = (c, pts, fill, stroke = EDGE) => {
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
	const line = (c, pts, color, w = 1.5) => {
		c.strokeStyle = color;
		c.lineWidth = w;
		c.beginPath();
		pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.stroke();
	};
	const ellipse = (c, x, y, rx, ry, fill) => {
		c.fillStyle = fill;
		c.beginPath();
		c.ellipse(x, y, rx, ry, 0, 0, TAU);
		c.fill();
	};
	// A seam cut into the stone: a dark groove with a thin lit lip below it.
	const groove = (c, pts, w = 1.5) => {
		line(c, pts, GROOVE, w + 0.4);
		line(c, pts.map(([x, y]) => [x + 0.8, y + 1.1]), LIP, 0.8);
	};
	// A polished lens instead of a glowing core.
	const lens = (c, x, y, r) => {
		ellipse(c, x, y, r, r, "#2b333d");
		ellipse(c, x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.35, "#9aa6b0");
	};
	const tintOf = (e) => e.tint || (e.team === 0 ? "#b0efd0" : "#f07d78");
	const swarm = (e) => e.faction === "swarm";

	// A monolith standing on the ground line y: a tapering front face, a darker right face, a pointed crown lit
	// on the left, a vertical seam and horizontal seams; its shadow falls to the lower right, as in the game.
	function monolith(c, x, y, w, h, o = {}) {
		const top = w * (o.taper ?? 0.62),
			d = o.depth ?? Math.max(6, w * 0.45),
			dx = d,
			dy = -d * 0.75,
			tip = o.tip ?? w * 0.6,
			fall = Math.min(34, h * 0.3);
		poly(c, [[x - w, y], [x + w, y], [x + w + fall, y + fall * 0.6], [x - w + fall, y + fall * 0.6]], "#07161a45", null);
		poly(c, [[x + w, y], [x + w + dx, y + dy], [x + top + dx, y - h + dy], [x + top, y - h]], SIDE);
		poly(c, [[x - w, y], [x + w, y], [x + top, y - h], [x - top, y - h]], FRONT);
		if (tip) {
			poly(c, [[x - top, y - h], [x + top, y - h], [x + top + dx, y - h + dy], [x + dx * 0.5, y - h - tip + dy * 0.5]], ROOF);
			poly(c, [[x - top, y - h], [x + dx * 0.5, y - h - tip + dy * 0.5], [x, y - h]], LIT, null);
		} else poly(c, [[x - top, y - h], [x + top, y - h], [x + top + dx, y - h + dy], [x - top + dx, y - h + dy]], LIT);
		if (o.seam !== false) groove(c, [[x, y - 3], [x, y - h + 2]], o.seamWidth ?? 1.6);
		for (const k of o.rings || [0.38, 0.7]) {
			const yy = y - h * k,
				half = w + (top - w) * k;
			groove(c, [[x - half + 2, yy], [x + half - 2, yy]], 1);
		}
		if (o.slot) {
			c.fillStyle = GROOVE;
			c.fillRect(x - w * 0.45, y - 12, w * 0.9, 4);
			c.fillStyle = LIP;
			c.fillRect(x - w * 0.45, y - 8, w * 0.9, 1);
		}
		if (o.team) {
			c.fillStyle = o.team;
			c.fillRect(x - w + 3, y - 5, Math.min(14, w * 0.5), 3);
		}
	}
	// A low basalt block with a flat top.
	const block = (c, x, y, w, h) => monolith(c, x, y, w, h, { taper: 0.95, tip: 0, rings: [], seam: false, depth: w * 0.5 });
	// Broken slabs lying flat on the ground.
	const rubble = (c, pts) => {
		for (const [x, y, w] of pts) poly(c, [[x - w, y], [x + w * 0.6, y - w * 0.4], [x + w, y + w * 0.3], [x - w * 0.4, y + w * 0.6]], "#262d35");
	};
	// A basalt plinth over the building's footprint (the same outline as the game's building pads).
	function plinth(c, r) {
		poly(c, [[-r, -r * 0.5], [r * 0.9, -r * 0.5], [r, r * 0.55], [-r * 0.9, r * 0.55]], PLINTH, "#1a1d20");
		for (const k of [-0.1, 0.25]) groove(c, [[-r * 0.85, r * k], [r * 0.85, r * k]], 0.8);
	}
	// A flat stone lintel between two monoliths.
	const slab = (c, x1, x2, y, h = 7) => {
		poly(c, [[x1, y], [x2, y], [x2 + 5, y - 4], [x1 + 5, y - 4]], LIT);
		poly(c, [[x1, y], [x2, y], [x2, y + h], [x1, y + h]], "#262d35");
	};

	// ---------- buildings (variant C-A: pure monolith sets) ----------
	const B = {
		hq(c, r, team) {
			block(c, -46, 30, 12, 14);
			block(c, 48, 30, 12, 14);
			monolith(c, 0, 24, 30, 104, { slot: true, team, tip: 20 });
		},
		barracks(c, r, team) {
			monolith(c, -26, 20, 17, 72, { rings: [0.35, 0.65], team });
			monolith(c, 24, 20, 17, 72, { rings: [0.35, 0.65] });
			groove(c, [[-10, 8], [8, 8]], 2);
			groove(c, [[-10, -4], [8, -4]], 1);
		},
		factory(c, r, team) {
			for (const [x, h, t] of [[-42, 50, team], [-14, 66], [14, 66], [42, 50]]) monolith(c, x, 24, 14, h, { rings: [0.45], team: t });
			c.fillStyle = GROOVE;
			c.fillRect(-34, 18, 70, 4);
		},
		turret(c, r, team) {
			monolith(c, 2, 10, 10, 66, { rings: [0.5], team, tip: 10 });
		},
		depot(c, r, team) {
			monolith(c, -8, 18, 20, 34, { taper: 0.85, rings: [0.5], team, tip: 6 });
			monolith(c, 18, 22, 9, 20, { taper: 0.8, rings: [], seam: false, tip: 4 });
		},
		extractor(c, r, team) {
			ellipse(c, 2, 16, r * 0.75, r * 0.3, "#15181b");
			ellipse(c, 2, 16, r * 0.55, r * 0.2, "#07090b");
			monolith(c, 0, 16, 13, 58, { rings: [0.3, 0.55, 0.8], team });
		},
		reactor(c, r, team) {
			ellipse(c, 2, 20, 30, 10, "#15181b");
			monolith(c, 0, 20, 14, 82, { rings: [0.25, 0.5, 0.75], team, tip: 14 });
		},
		lab(c, r, team) {
			block(c, 30, 24, 9, 16);
			monolith(c, -4, 20, 20, 76, { rings: [0.2, 0.4, 0.6, 0.8], team });
		},
		battery(c, r, team) {
			for (const [x, t] of [[-26, team], [0], [26]]) monolith(c, x, 20, 11, 40, { taper: 0.75, rings: [0.35, 0.7], team: t, tip: 6 });
		},
		workshop(c, r, team) {
			monolith(c, -28, 22, 14, 60, { rings: [0.5], team });
			monolith(c, 28, 22, 14, 60, { rings: [0.5] });
			slab(c, -18, 20, -30, 8);
		},
		hangar(c, r, team) {
			poly(c, [[-40, 4], [34, 4], [44, 28], [-30, 28]], "#262d35");
			groove(c, [[-30, 16], [36, 16]], 1);
			monolith(c, -38, 2, 12, 64, { rings: [0.5], team });
			monolith(c, 36, 2, 12, 64, { rings: [0.5] });
		},
		flak(c, r, team) {
			monolith(c, -16, 18, 8, 50, { rings: [0.5], team, tip: 12 });
			monolith(c, 2, 12, 9, 62, { rings: [0.5], tip: 14 });
			monolith(c, 20, 20, 8, 44, { rings: [0.5], tip: 12 });
		},
		medbay(c, r, team) {
			monolith(c, 0, 18, 18, 62, { rings: [0.55], team });
			groove(c, [[-8, -18], [8, -18]], 2.5);
		},
		shieldgen(c, r, team) {
			monolith(c, 0, 18, 13, 78, { rings: [0.3, 0.6], team, tip: 12 });
			// A stone collar around the spire.
			c.strokeStyle = "#262d35";
			c.lineWidth = 4;
			c.beginPath();
			c.ellipse(4, -24, 22, 7, 0, 0, TAU);
			c.stroke();
			c.strokeStyle = LIT;
			c.lineWidth = 1;
			c.beginPath();
			c.ellipse(4, -26, 22, 7, 0, Math.PI, TAU);
			c.stroke();
		},
		salvageYard(c, r, team) {
			rubble(c, [[-30, 22, 8], [-14, 32, 6], [30, 30, 7], [36, 12, 5]]);
			poly(c, [[-20, 8], [4, 2], [12, 12], [-12, 18]], "#262d35");
			monolith(c, 10, 20, 15, 52, { rings: [0.45], team });
		},
		monolith(c, r, team) {
			ellipse(c, 2, 24, 30, 10, "#15181b");
			monolith(c, 0, 22, 17, 104, { rings: [0.25, 0.5, 0.75], team, tip: 18 });
			// Resonance: faint stone-grey rings (static, so WebGL does not repaint the model every frame).
			c.strokeStyle = "#8a96a040";
			c.lineWidth = 1.5;
			for (let i = 0; i < 3; i++) {
				c.beginPath();
				c.ellipse(4, -8 - i * 26, 30 - i * 6, 9 - i * 2, 0, 0, TAU);
				c.stroke();
			}
		},
	};
	// Any other building: one monolith sized to the footprint.
	const anyBuilding = (c, r, team) => monolith(c, 0, r * 0.4, Math.max(10, r * 0.4), r * 1.6, { team });
	function building(c, e, time) {
		const r = RTS.TYPES[e.type].radius,
			team = tintOf(e);
		plinth(c, r);
		(B[e.type] || anyBuilding)(c, r, team);
		if (e.hp < e.maxHp * 0.45 && !e.constructionLeft)
			for (let i = 0; i < 3; i++) {
				const rise = (time * 10 + i * 11) % 32;
				ellipse(c, 12 + rise * 0.23, -22 - rise, 4 + rise * 0.13, 6 + rise * 0.12, "#10191a65");
			}
		return true;
	}

	// ---------- units ----------
	const shadow = (c, r) => ellipse(c, 3, 5, r * 1.1, r * 0.7, "#06141a60");
	const swing = (e, time, phase) => (e.path?.length ? Math.sin(time * 13 + (e.id || 0) + phase) * 3 : 0);
	// A small obsidian sentry (infantry): a wedge body on two pairs of legs, a groove and a lens at the front.
	function sentry(c, e, time, o = {}) {
		const k = (o.size ?? RTS.TYPES[e.type].radius) / 10;
		shadow(c, 10 * k);
		c.save();
		c.rotate(e.angle || 0);
		c.scale(k, k);
		for (const side of [-1, 1]) {
			line(c, [[-3, side * 5], [-10 + swing(e, time, side), side * 10]], LEG, 3);
			line(c, [[3, side * 5], [8 - swing(e, time, side), side * 10]], LEG, 3);
		}
		poly(c, [[-9, -6], [4, -8], [12, 0], [4, 8], [-9, 6]], FRONT);
		poly(c, [[4, -8], [12, 0], [2, 0]], ROOF, null);
		groove(c, [[-7, 0], [9, 0]], 1);
		if (o.prongs) for (const side of [-1, 1]) poly(c, [[4, side * 4], [16, side * 3], [4, side * 1.5]], ROOF);
		if (o.spine) poly(c, [[0, -2], [20, 0], [0, 2]], LIT);
		lens(c, 7, 0, 2.5);
		c.fillStyle = tintOf(e);
		c.fillRect(-9, -2, 3, 4);
		c.restore();
		return true;
	}
	// The four-legged walker from the C sketch, seen from above (vehicles), scaled to the unit's radius.
	function walker(c, e, time, o = {}) {
		const r = RTS.TYPES[e.type].radius,
			k = r / 22,
			legs = o.legs || 2;
		shadow(c, 22 * k);
		c.save();
		c.rotate(e.angle || 0);
		c.scale(k, k);
		for (let i = 0; i < legs; i++) {
			const x = legs === 2 ? (i ? 10 : -10) : -14 + (28 / (legs - 1)) * i;
			for (const side of [-1, 1]) line(c, [[x * 0.6, side * 8], [x * 1.4 + swing(e, time, i * 2 + side) * 1.5, side * 22]], LEG, 5);
		}
		const L = o.long || 0;
		poly(c, [[-18 - L, -14], [-4, -20], [16, -12], [22, 0], [16, 12], [-4, 20], [-18 - L, 14], [-22 - L, 0]], FRONT);
		poly(c, [[-4, -20], [16, -12], [22, 0], [2, 0]], "#2b333d", null);
		groove(c, [[-16 - L, 0], [18, 0]], 1.4);
		if (o.prong) poly(c, [[16, -4], [34, 0], [16, 4]], ROOF);
		if (o.twin) for (const side of [-1, 1]) poly(c, [[14, side * 9], [32, side * 6], [14, side * 3]], ROOF);
		if (o.spike) poly(c, [[-10, -3], [46, 0], [-10, 3]], LIT);
		if (o.plates) for (const side of [-1, 1]) poly(c, [[-16, side * 16], [14, side * 14], [12, side * 22], [-14, side * 24]], "#262d35");
		if (o.hump) poly(c, [[-12, -8], [4, -10], [10, 0], [4, 10], [-12, 8], [-15, 0]], "#262d35");
		if (o.sensors) for (const side of [-1, 1]) lens(c, -8, side * 8, 3.5);
		lens(c, 4, 0, 4.5);
		c.fillStyle = tintOf(e);
		c.fillRect(-20 - L, -3, 5, 6);
		c.restore();
		return true;
	}
	// Flying shards: an obsidian arrowhead hovering above its shadow.
	function flyer(c, e, time) {
		const r = RTS.TYPES[e.type].radius,
			broad = e.type === "bomber";
		ellipse(c, 18, 22, r * 1.2, r * 0.55, "#06141b55");
		c.save();
		c.translate(0, -25 - Math.sin(time * 2 + (e.id || 0)) * 2);
		c.rotate(e.angle || 0);
		const wing = broad ? r * 1.1 : r;
		poly(c, [[r + 10, 0], [-r, -wing], [-r * 0.45, 0], [-r, wing]], FRONT);
		poly(c, [[r + 10, 0], [-r * 0.45, 0], [-r, wing]], SIDE, null);
		groove(c, [[-r * 0.4, 0], [r + 4, 0]], 1);
		if (broad) for (const side of [-1, 1]) groove(c, [[-r * 0.7, side * wing * 0.55], [r * 0.3, side * wing * 0.15]], 1);
		lens(c, r * 0.35, 0, 2.5);
		c.fillStyle = tintOf(e);
		c.fillRect(-r * 0.8, -2, 5, 4);
		c.restore();
		return true;
	}
	// The six-legged crawler: a low flat wedge scuttling fast.
	function crawler(c, e, time) {
		const t = time * 14 + (e.id || 0),
			moving = e.path?.length > 0;
		shadow(c, 11);
		c.save();
		c.rotate(e.angle || 0);
		for (let i = 0; i < 3; i++)
			for (const side of [-1, 1]) {
				const s = moving ? Math.sin(t + i * 2 + (side > 0 ? Math.PI : 0)) * 3 : 0;
				line(c, [[-4 + i * 5, side * 3], [-6 + i * 6 + s, side * 11]], LEG, 2);
			}
		poly(c, [[-10, -6], [6, -6], [13, 0], [6, 6], [-10, 6]], FRONT);
		poly(c, [[6, -6], [13, 0], [4, 0]], ROOF, null);
		groove(c, [[-8, 0], [10, 0]], 1);
		c.fillStyle = tintOf(e);
		c.fillRect(-9, -2, 3, 4);
		c.restore();
		return true;
	}
	const UNITS = {
		worker: (c, e, t) => sentry(c, e, t, { size: 11, prongs: true }),
		trooper: (c, e, t) => sentry(c, e, t),
		rocket: (c, e, t) => sentry(c, e, t, { prongs: true }),
		spitter: (c, e, t) => sentry(c, e, t, { size: 12, spine: true }),
		saboteur(c, e, t) {
			// Own hidden saboteurs are drawn faintly, as in the Stage E model.
			c.save();
			if (e.stealth) c.globalAlpha = 0.5;
			sentry(c, e, t, { size: 9 });
			c.restore();
			return true;
		},
		crawler,
		tank: (c, e, t) => walker(c, e, t, { prong: true }),
		heavy: (c, e, t) => walker(c, e, t, { twin: true, plates: true }),
		artillery: (c, e, t) => walker(c, e, t, { spike: true }),
		transport: (c, e, t) => walker(c, e, t, { legs: 3, long: 8, plates: true }),
		skyguard: (c, e, t) => walker(c, e, t, { sensors: true }),
		hauler: (c, e, t) => walker(c, e, t, { legs: 3, long: 8 }),
		colossus: (c, e, t) => walker(c, e, t, { legs: 2, plates: true, twin: true, hump: true }),
	};
	function body(c, e, time) {
		const s = RTS.TYPES[e.type];
		if (!s || !swarm(e) || s.threat || e.type === "wall" || e.type === "gate") return false;
		if (!s.speed) return building(c, e, time);
		if (s.flying) return flyer(c, e, time);
		const draw = UNITS[e.type];
		if (draw) return draw(c, e, time);
		return RTS.INFANTRY_TYPES.includes(e.type) || s.radius < 14 ? sentry(c, e, time) : walker(c, e, time);
	}
	return { body, monolith, walker, sentry };
})();
// Outermost in the art chain: Swarm entities get their own models; everything else falls through.
if (typeof Act2Art !== "undefined") {
	const previousBody = Act2Art.body;
	Act2Art.body = (c, e, time) => SwarmArt.body(c, e, time) || previousBody(c, e, time);
}
// No Colonies or Dominium trim on Swarm models; module marks and the disabled mark (Stage E) stay.
if (typeof AdvancedArt !== "undefined") {
	const previousDetails = AdvancedArt.factionDetails;
	AdvancedArt.factionDetails = (c, e, time) => {
		if (e.faction !== "swarm") return previousDetails(c, e, time);
		if (typeof SupportArt !== "undefined") SupportArt.details(c, e, time);
	};
}
if (typeof window !== "undefined") window.SwarmArt = SwarmArt;
