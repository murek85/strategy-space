/* H3c (0.154): the Watchers of the Abyss in 2D — a race of machines of pale stone and light: smooth white
   plates cut by cyan seams of light, parts hovering with no visible joints, rings and lenses. Buildings are
   pillars and floating crowns over a hexagonal pad; units hover over their shadows (no legs, no tracks).
   Drawn in Canvas; the WebGL renderer bakes the same drawings. Contrast: the Swarm is matte obsidian, the
   Dominium steel and orange. */
const WatchersArt = (() => {
	const TAU = Math.PI * 2;
	const FRONT = "#e9eef1",
		SIDE = "#b9c4cc",
		TOP = "#f8fbfc",
		DEEP = "#7d8b97",
		EDGE = "#56636e",
		LIGHT = "#6fe6ff",
		CORE = "#e6fcff",
		PAD = "#cfd7dc";
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
			c.lineWidth = 0.8;
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
	const ring = (c, x, y, rx, ry, color, w = 1.5, from = 0, to = TAU) => {
		c.strokeStyle = color;
		c.lineWidth = w;
		c.beginPath();
		c.ellipse(x, y, rx, ry, 0, from, to);
		c.stroke();
	};
	// A seam of light: a soft cyan halo under a thin bright line.
	const seam = (c, pts, w = 1.2) => {
		line(c, pts, LIGHT + "70", w + 2.2);
		line(c, pts, CORE, w);
	};
	// A polished lens with a light inside.
	const lens = (c, x, y, r) => {
		ellipse(c, x, y, r + 1, r + 1, EDGE);
		ellipse(c, x, y, r, r, LIGHT);
		ellipse(c, x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.4, CORE);
	};
	const tintOf = (e) => e.tint || (e.team === 0 ? "#b0efd0" : "#f07d78");

	// A smooth white pillar standing on y: a tapering front face, a shaded right face, a flat lit top, a seam
	// of light down the front; o.cap — a floating cap above a gap (a hovering crown, no joint).
	function pillar(c, x, y, w, h, o = {}) {
		const top = w * (o.taper ?? 0.7),
			d = o.depth ?? Math.max(5, w * 0.42),
			dx = d,
			dy = -d * 0.7,
			fall = Math.min(30, h * 0.28);
		poly(c, [[x - w, y], [x + w, y], [x + w + fall, y + fall * 0.55], [x - w + fall, y + fall * 0.55]], "#0a1a2033", null);
		poly(c, [[x + w, y], [x + w + dx, y + dy], [x + top + dx, y - h + dy], [x + top, y - h]], SIDE);
		poly(c, [[x - w, y], [x + w, y], [x + top, y - h], [x - top, y - h]], FRONT);
		poly(c, [[x - top, y - h], [x + top, y - h], [x + top + dx, y - h + dy], [x - top + dx, y - h + dy]], TOP);
		if (o.seam !== false) seam(c, [[x, y - 4], [x, y - h + 4]], o.seamWidth ?? 1.1);
		for (const k of o.bands || []) {
			const yy = y - h * k,
				half = w + (top - w) * k;
			line(c, [[x - half + 1, yy], [x + half - 1, yy]], DEEP, 1);
		}
		if (o.team) {
			c.fillStyle = o.team;
			c.fillRect(x - w + 2, y - 6, Math.min(12, w * 0.5), 3);
		}
		if (o.cap) diamond(c, x + dx * 0.4, y - h - o.cap - top * 0.9, top * 1.05, top * 1.5);
	}
	// A floating diamond (an octahedron seen from the side): a lit left half, a shaded right half, a seam.
	function diamond(c, x, y, w, h, o = {}) {
		poly(c, [[x, y - h], [x - w, y], [x, y + h * 0.8], [x, y]], FRONT);
		poly(c, [[x, y - h], [x + w, y], [x, y + h * 0.8], [x, y]], SIDE);
		seam(c, [[x - w * 0.7, y], [x + w * 0.7, y]], 1);
		if (o.core) ellipse(c, x, y, w * 0.28, w * 0.28, CORE);
	}
	// A hexagonal white pad under every building, with a seam of light round its rim.
	function pad(c, r) {
		const pts = Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * TAU) * r * 0.95, Math.sin((i / 6) * TAU) * r * 0.55]);
		poly(c, pts.map(([x, y]) => [x + 2, y + 4]), DEEP, null);
		poly(c, pts, PAD);
		c.globalAlpha = 0.8;
		line(c, [...pts.slice(1, 4)].map(([x, y]) => [x * 0.86, y * 0.86]), LIGHT, 1);
		c.globalAlpha = 1;
	}
	// A rift: a vertical slit of light between two pillars (the forges).
	function rift(c, x, y, h, w = 5) {
		poly(c, [[x, y - h], [x + w, y - h * 0.5], [x, y], [x - w, y - h * 0.5]], LIGHT + "55", null);
		line(c, [[x, y - h + 3], [x, y - 3]], CORE, 1.8);
	}

	// ---------- buildings ----------
	const B = {
		hq(c, r, team) {
			ring(c, 0, 18, r * 0.62, r * 0.25, LIGHT, 2);
			for (const s of [-1, 1]) pillar(c, s * 44, 26, 9, 34, { taper: 0.6, team: s < 0 ? team : null, cap: 6 });
			// The Core: a great diamond hovering over the pad, a ring of light round its waist.
			ellipse(c, 6, 22, 30, 10, "#0a1a2030");
			diamond(c, 0, -46, 30, 44, { core: true });
			ring(c, 0, -46, 40, 11, LIGHT, 2, Math.PI, TAU);
			ring(c, 0, -46, 40, 11, CORE, 1, 0, Math.PI);
			c.fillStyle = team;
			c.fillRect(-12, -10, 24, 3);
		},
		barracks(c, r, team) {
			pillar(c, -22, 20, 13, 60, { bands: [0.45], team, cap: 5 });
			pillar(c, 22, 20, 13, 60, { bands: [0.45], cap: 5 });
			rift(c, 0, 16, 52, 6);
		},
		factory(c, r, team) {
			for (const [x, h, t] of [[-44, 44, team], [-16, 62], [16, 62], [44, 44]]) pillar(c, x, 24, 11, h, { bands: [0.5], team: t, cap: x === -16 || x === 16 ? 0 : 4 });
			rift(c, 0, 20, 56, 8);
			ring(c, 0, -52, 30, 8, LIGHT, 2);
		},
		turret(c, r, team) {
			pillar(c, 0, 12, 9, 58, { taper: 0.45, team, bands: [0.3, 0.6] });
			diamond(c, 2, -64, 9, 14, { core: true });
			ring(c, 2, -64, 16, 5, LIGHT, 1.5);
		},
		depot(c, r, team) {
			pillar(c, -10, 18, 20, 30, { taper: 0.9, bands: [0.5], team });
			diamond(c, 18, -6, 9, 12);
		},
		extractor(c, r, team) {
			ellipse(c, 2, 16, r * 0.7, r * 0.28, "#3b4a55");
			ring(c, 2, 16, r * 0.55, r * 0.2, LIGHT, 1.5);
			pillar(c, 0, 14, 11, 50, { taper: 0.55, bands: [0.35, 0.7], team, cap: 6 });
		},
		reactor(c, r, team) {
			ring(c, 0, 18, 30, 10, LIGHT, 2);
			diamond(c, 0, -30, 18, 30, { core: true });
			for (const k of [0, 1, 2]) ring(c, 0, -30 + (k - 1) * 18, 26 - Math.abs(k - 1) * 6, 7, k === 1 ? LIGHT : DEEP, 1.4);
			c.fillStyle = team;
			c.fillRect(-8, 10, 16, 3);
		},
		lab(c, r, team) {
			pillar(c, 28, 24, 8, 22, { taper: 0.9, seam: false });
			pillar(c, -6, 20, 18, 58, { bands: [0.3, 0.6], team, cap: 8 });
		},
		battery(c, r, team) {
			for (const [x, t] of [[-24, team], [0], [24]]) pillar(c, x, 20, 9, 34, { taper: 0.6, bands: [0.5], team: t, cap: 4 });
		},
		workshop(c, r, team) {
			pillar(c, -26, 22, 12, 52, { bands: [0.5], team });
			pillar(c, 26, 22, 12, 52, { bands: [0.5] });
			// A floating lintel between them.
			poly(c, [[-22, -38], [24, -38], [28, -42], [-18, -42]], TOP);
			poly(c, [[-22, -38], [24, -38], [24, -33], [-22, -33]], FRONT);
			seam(c, [[-16, -35.5], [18, -35.5]], 1);
		},
		hangar(c, r, team) {
			poly(c, [[-40, 6], [34, 6], [44, 28], [-30, 28]], PAD);
			seam(c, [[-28, 17], [36, 17]], 1);
			pillar(c, -38, 4, 10, 52, { bands: [0.5], team, cap: 5 });
			pillar(c, 36, 4, 10, 52, { bands: [0.5], cap: 5 });
		},
		flak(c, r, team) {
			pillar(c, -16, 18, 7, 40, { taper: 0.5, team });
			pillar(c, 16, 18, 7, 40, { taper: 0.5 });
			diamond(c, 0, -38, 12, 16, { core: true });
			for (const s of [-1, 1]) line(c, [[s * 4, -40], [s * 20, -56]], CORE, 2);
		},
		medbay(c, r, team) {
			pillar(c, 0, 18, 17, 48, { bands: [0.55], team });
			ring(c, 4, -42, 18, 6, LIGHT, 2);
		},
		shieldgen(c, r, team) {
			pillar(c, 0, 18, 10, 62, { taper: 0.5, bands: [0.3, 0.6], team });
			diamond(c, 3, -60, 10, 14, { core: true });
			c.strokeStyle = LIGHT + "60";
			c.lineWidth = 1.5;
			c.beginPath();
			c.arc(3, -30, 34, Math.PI * 1.1, Math.PI * 1.9);
			c.stroke();
		},
		salvageYard(c, r, team) {
			for (const [x, y, w] of [[-30, 22, 7], [-14, 32, 5], [30, 30, 6]]) poly(c, [[x - w, y], [x + w * 0.6, y - w * 0.4], [x + w, y + w * 0.3], [x - w * 0.4, y + w * 0.6]], SIDE);
			pillar(c, 10, 20, 14, 44, { bands: [0.45], team, cap: 6 });
		},
		// The Anchor: a slender pillar threaded by three hovering rings, a crystal of light on top.
		anchor(c, r, team) {
			ring(c, 0, 14, r * 0.7, r * 0.26, LIGHT + "90", 1.5);
			pillar(c, 0, 14, 7, 64, { taper: 0.5, team, bands: [] });
			for (const [y, rx] of [[-14, 22], [-32, 18], [-50, 14]]) {
				ring(c, 2, y, rx, rx * 0.3, DEEP, 3, Math.PI, TAU);
				ring(c, 2, y, rx, rx * 0.3, LIGHT, 1.5, 0, Math.PI);
			}
			diamond(c, 2, -72, 7, 12, { core: true });
		},
		// The Resonator: a dish over the deposit, a tuning fork of two prongs and a lens between them.
		resonator(c, r, team) {
			ellipse(c, 0, 14, r * 0.75, r * 0.3, SIDE);
			ellipse(c, 0, 12, r * 0.6, r * 0.22, FRONT);
			ring(c, 0, 12, r * 0.42, r * 0.15, LIGHT, 1.5);
			for (const s of [-1, 1]) pillar(c, s * 10, 8, 4, 40, { taper: 0.6, seam: false, depth: 3, team: s < 0 ? team : null });
			lens(c, 0, -22, 5);
			ring(c, 0, -22, 12, 4, LIGHT + "90", 1);
		},
	};
	const anyBuilding = (c, r, team) => pillar(c, 0, r * 0.4, Math.max(9, r * 0.38), r * 1.4, { team, bands: [0.5], cap: 5 });
	function building(c, e, time) {
		const r = RTS.TYPES[e.type].radius,
			team = tintOf(e);
		// The Core in flight: its shadow on the ground, the whole building lifted and smaller pad.
		if (e.lifted) {
			ellipse(c, 14, 24, r * 0.8, r * 0.3, "#0a1a2045");
			c.save();
			c.translate(0, -34);
		} else pad(c, r);
		(B[e.type] || anyBuilding)(c, r, team);
		if (e.lifted) c.restore();
		// Damage: cracks of light leaking.
		if (e.hp < e.maxHp * 0.45 && !e.constructionLeft) {
			line(c, [[-10, -8], [-4, -16], [-8, -26]], LIGHT, 1.2);
			line(c, [[12, -2], [6, -12]], LIGHT, 1);
		}
		return true;
	}

	// ---------- units: everything hovers ----------
	const float = (e, time) => (e.path?.length ? Math.sin(time * 4 + (e.id || 0)) * 1.2 : 0);
	// A hovering body seen from above: a long white hexagonal lens, a shaded half, a seam of light along it,
	// a lens at the front and the team mark at the back; its shadow on the ground below, offset.
	// o: size (radius), long, plates (floating side plates), prongs, beam (a prism at the front), arc (two
	// horns and a ball of light), ring (a halo), fins.
	function drone(c, e, time, o = {}) {
		const r = o.size ?? RTS.TYPES[e.type].radius,
			k = r / 12,
			lift = 7 * Math.min(1.6, k) + float(e, time);
		ellipse(c, 5, 8, r * 1.05, r * 0.6, "#0a1a2045");
		c.save();
		c.translate(0, -lift);
		c.rotate(e.angle || 0);
		c.scale(k, k);
		const L = o.long || 0;
		poly(c, [[-12 - L, 0], [-7 - L, -7], [8, -6], [14, 0], [8, 6], [-7 - L, 7]], FRONT);
		poly(c, [[-12 - L, 0], [14, 0], [8, 6], [-7 - L, 7]], SIDE, null);
		seam(c, [[-9 - L, 0], [10, 0]], 0.9);
		if (o.plates)
			for (const s of [-1, 1]) {
				poly(c, [[-8 - L, s * 9.5], [6, s * 8.5], [3, s * 13], [-9 - L, s * 13]], s < 0 ? TOP : SIDE);
				line(c, [[-6 - L, s * 11], [2, s * 10.8]], LIGHT, 0.8);
			}
		if (o.fins) for (const s of [-1, 1]) poly(c, [[-10 - L, s * 5], [-18 - L, s * 11], [-6 - L, s * 7]], SIDE);
		if (o.prongs) for (const s of [-1, 1]) poly(c, [[6, s * 4], [17, s * 3], [6, s * 2]], DEEP);
		if (o.beam) {
			diamond(c, 15, 0, 5, 6);
			line(c, [[19, 0], [25, 0]], LIGHT, 1.4);
		}
		if (o.arc) {
			for (const s of [-1, 1]) line(c, [[4, s * 4], [12, s * 7], [17, s * 4]], DEEP, 2.2);
			ellipse(c, 17, 0, 3.4, 3.4, LIGHT);
			ellipse(c, 17, 0, 1.6, 1.6, CORE);
		}
		if (o.ring) ring(c, 0, 0, 13 + L * 0.5, 13, LIGHT, 1.2);
		lens(c, 8, 0, 2.2);
		c.fillStyle = tintOf(e);
		c.fillRect(-11 - L, -2, 3, 4);
		c.restore();
		return true;
	}
	// The Weaver (the robot): a small drone with two floating hands of light.
	function weaver(c, e, time) {
		drone(c, e, time, { size: 10, ring: true });
		const working = e.order?.kind === "build" || e.order?.kind === "repair";
		if (working) {
			c.globalAlpha = 0.5 + Math.sin(time * 9 + (e.id || 0)) * 0.3;
			line(c, [[0, -8], [Math.cos(e.angle || 0) * 26, Math.sin(e.angle || 0) * 26 - 4]], LIGHT, 1.6);
			c.globalAlpha = 1;
		}
		return true;
	}
	// The Construct: two Wardens fused — a broad body ringed by four hovering plates and a core of light.
	function construct(c, e, time) {
		const r = RTS.TYPES[e.type].radius;
		drone(c, e, time, { long: 8, plates: true, arc: true });
		c.save();
		c.translate(0, -12);
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * TAU + 0.4 + (e.path?.length ? time * 0.6 : 0);
			const x = Math.cos(a) * r * 1.05,
				y = Math.sin(a) * r * 0.62;
			poly(c, [[x - 5, y - 3], [x + 5, y - 3], [x + 3, y + 3], [x - 3, y + 3]], i % 2 ? FRONT : SIDE);
		}
		ellipse(c, 0, 0, 5, 5, LIGHT);
		ellipse(c, 0, 0, 2.4, 2.4, CORE);
		c.restore();
		return true;
	}
	// Flyers: a white blade-wing ring hovering high above its shadow.
	function flyer(c, e, time) {
		const r = RTS.TYPES[e.type].radius,
			broad = e.type === "bomber";
		ellipse(c, 18, 22, r * 1.1, r * 0.5, "#0a1a2040");
		c.save();
		c.translate(0, -26 - Math.sin(time * 2 + (e.id || 0)) * 2);
		c.rotate(e.angle || 0);
		const wing = broad ? r * 1.15 : r;
		poly(c, [[r + 8, 0], [-r * 0.6, -wing], [-r * 0.2, 0], [-r * 0.6, wing]], FRONT);
		poly(c, [[r + 8, 0], [-r * 0.2, 0], [-r * 0.6, wing]], SIDE, null);
		ring(c, -r * 0.1, 0, r * 0.75, r * 0.75, LIGHT, 1.2);
		seam(c, [[-r * 0.3, 0], [r + 2, 0]], 0.9);
		lens(c, r * 0.3, 0, 2.2);
		c.fillStyle = tintOf(e);
		c.fillRect(-r * 0.5, -2, 4, 4);
		c.restore();
		return true;
	}
	const UNITS = {
		worker: weaver,
		trooper: (c, e, t) => drone(c, e, t, { prongs: true }),
		rocket: (c, e, t) => drone(c, e, t, { beam: true }),
		saboteur(c, e, t) {
			c.save();
			if (e.stealth) c.globalAlpha = 0.5;
			drone(c, e, t, { size: 9 });
			c.restore();
			return true;
		},
		spark: (c, e, t) => drone(c, e, t, { fins: true, prongs: true }),
		prism: (c, e, t) => drone(c, e, t, { long: 4, beam: true, plates: true }),
		arc: (c, e, t) => drone(c, e, t, { long: 6, arc: true, fins: true }),
		warden: (c, e, t) => drone(c, e, t, { long: 4, plates: true, ring: true, prongs: true }),
		construct,
		tank: (c, e, t) => drone(c, e, t, { long: 4, prongs: true, plates: true }),
		heavy: (c, e, t) => drone(c, e, t, { long: 6, beam: true, plates: true, ring: true }),
		artillery: (c, e, t) => drone(c, e, t, { long: 8, arc: true }),
		transport: (c, e, t) => drone(c, e, t, { long: 10, plates: true }),
		skyguard: (c, e, t) => drone(c, e, t, { long: 2, ring: true, prongs: true }),
		hauler: (c, e, t) => drone(c, e, t, { long: 10, fins: true }),
	};
	function body(c, e, time) {
		const s = RTS.TYPES[e.type];
		if (!s || e.faction !== "watchers" || s.threat || s.ship || e.type === "wall" || e.type === "gate") return false;
		if (!s.speed) return building(c, e, time);
		if (s.flying) return flyer(c, e, time);
		return (UNITS[e.type] || ((c2, e2, t2) => drone(c2, e2, t2)))(c, e, time);
	}
	return { body, pillar, diamond, drone };
})();
// Outermost in the art chain: Watchers entities get their own models; everything else falls through.
if (typeof Act2Art !== "undefined") {
	const previousBody = Act2Art.body;
	Act2Art.body = (c, e, time) => WatchersArt.body(c, e, time) || previousBody(c, e, time);
}
// No Colonies or Dominium trim on Watchers models; module marks and the disabled mark (Stage E) stay.
if (typeof AdvancedArt !== "undefined") {
	const previousDetails = AdvancedArt.factionDetails;
	AdvancedArt.factionDetails = (c, e, time) => {
		if (e.faction !== "watchers") return previousDetails(c, e, time);
		if (typeof SupportArt !== "undefined") SupportArt.details(c, e, time);
	};
}
if (typeof window !== "undefined") window.WatchersArt = WatchersArt;
