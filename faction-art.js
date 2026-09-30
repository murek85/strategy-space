/* Stage F4 art: models of the new faction units and buildings, the orbital strike marker and the faction look.
   Free Colonies: rounded domes, solar slats and teal bands; Dominion: angular armour plates, spikes and red
   warning chevrons. The trim is drawn after the body (AdvancedArt.factionDetails), so Canvas and WebGL show the same. */
const FactionArt = (() => {
	const TAU = Math.PI * 2;
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
		c.ellipse(x, y, rx, ry, 0, 0, TAU);
		c.fill();
	};
	const rect = (c, x, y, w, h, fill) => {
		c.fillStyle = fill;
		c.fillRect(x, y, w, h);
	};
	// The team the screen belongs to (app.js exposes the battle; tests without it see team 0).
	const viewer = () => (typeof currentGame === "function" ? currentGame()?.viewer : undefined) ?? 0;
	const tintOf = (e) => e.tint || (e.team === viewer() ? "#b0efd0" : "#f07d78");
	const dominion = (e) => e.faction === "dominion" || (!e.faction && e.team !== viewer() && e.team !== 2);
	// Base infantry drawn by the existing art, with a type swap.
	const asInfantry = (c, e, time, like) => AdvancedArt.body(c, { ...e, type: like }, time);

	function grenadier(c, e, time) {
		asInfantry(c, e, time, "trooper");
		c.save();
		c.rotate(e.angle);
		// Stubby launcher with a round drum.
		rect(c, 2, 3, 14, 5, "#55625c");
		ellipse(c, 6, 5.5, 4, 4, "#8a7a52");
		rect(c, 15, 3.5, 3, 4, "#2a3438");
		ellipse(c, -6, -9, 3, 3, "#7f9b72");
		ellipse(c, -1, -10, 3, 3, "#7f9b72");
		c.restore();
		return true;
	}
	function flamer(c, e, time) {
		asInfantry(c, e, time, "trooper");
		c.save();
		c.rotate(e.angle);
		// Twin fuel tanks on the back and a nozzle with a pilot flame.
		for (const y of [-5, 1]) {
			rect(c, -15, y, 7, 5, "#8b3a2c");
			rect(c, -15, y, 7, 1.5, "#c7684f");
		}
		rect(c, 3, 3, 13, 3, "#3b3f45");
		ellipse(c, 17, 4.5, 2 + Math.sin(time * 20 + e.id) * 0.8, 1.6, "#ffb347");
		c.restore();
		return true;
	}
	function serviceRover(c, e, time) {
		const tint = tintOf(e),
			moving = e.path?.length > 0;
		c.save();
		c.rotate(e.angle);
		ellipse(c, 3, 5, 21, 13, "#07121d60");
		for (const y of [-14, 8]) {
			for (const x of [-14, 0, 13]) {
				ellipse(c, x, y + 3, 5, 5, "#1b2a31");
				ellipse(c, x, y + 3, 2, 2, moving ? (Math.floor(time * 8) % 2 ? "#8da3a3" : "#56696b") : "#56696b");
			}
		}
		poly(c, [[-19, -10], [14, -11], [20, -3], [20, 4], [14, 10], [-19, 9]], "#5f7a73", "#b8c7b6");
		// Rounded cab, crane arm with a hook.
		ellipse(c, 10, -1, 8, 7, "#9fc0b8");
		ellipse(c, 12, -2, 4, 3, "#dcebe5");
		c.strokeStyle = "#e0c46c";
		c.lineWidth = 3;
		c.beginPath();
		c.moveTo(-10, 0);
		c.lineTo(-4, -16);
		c.lineTo(8, -20);
		c.stroke();
		c.lineWidth = 1.5;
		c.beginPath();
		c.moveTo(8, -20);
		c.lineTo(8, -12);
		c.stroke();
		rect(c, -17, -4, 4, 8, tint);
		c.restore();
		// Rotating amber beacon while repairing.
		const on = (e.repairTargets || []).length > 0;
		ellipse(c, -2, -14, 3.5, 3.5, on && Math.floor(time * 6) % 2 ? "#ffbe4a" : "#7b6a3d");
		return true;
	}
	function destroyer(c, e, time, target) {
		const tint = tintOf(e),
			moving = e.path?.length > 0;
		c.save();
		c.rotate(e.angle);
		ellipse(c, 3, 6, 26, 15, "#07121d60");
		for (const y of [-18, 11]) {
			rect(c, -24, y, 46, 8, "#15252d");
			for (let x = -22; x < 20; x += 6) rect(c, x + (moving ? (time * 12) % 6 : 0), y + 1, 2, 6, "#607577");
		}
		// Low wedge hull.
		poly(c, [[-22, -11], [14, -12], [26, -3], [26, 4], [14, 12], [-22, 11]], "#5c4a4d", "#a58f8e");
		poly(c, [[-14, -8], [8, -8], [14, 0], [8, 8], [-14, 8]], "#7d6667", "#c3a99f");
		rect(c, 16, -11, 5, 3, tint);
		rect(c, 16, 9, 5, 3, tint);
		c.restore();
		// Long gun on a low casemate.
		c.save();
		c.rotate(target ? Math.atan2(target.y - e.y, target.x - e.x) : e.angle);
		const recoil = e.target && e.cooldown > 1.8 ? 4 : 0;
		poly(c, [[-8, -7], [6, -7], [10, 0], [6, 7], [-8, 7]], "#4a3c40", "#a58f8e");
		rect(c, 6 - recoil, -2.5, 34, 5, "#b9a79b");
		rect(c, 38 - recoil, -3.5, 6, 7, "#3d3035");
		if (recoil) ellipse(c, 46, 0, 6, 4, "#ffd6a0");
		c.restore();
		return true;
	}
	function outpost(c, e, time) {
		const tint = tintOf(e);
		// Hexagonal pad, a dome with a window band, a rotating radar and solar slats.
		poly(c, [[-30, 6], [-16, -12], [16, -12], [30, 6], [16, 24], [-16, 24]], "#07161a45", null);
		poly(c, [[-28, 2], [-14, -14], [14, -14], [28, 2], [14, 18], [-14, 18]], "#58706b", "#a9bdb0");
		ellipse(c, 0, -2, 18, 13, "#8fb1a8");
		ellipse(c, -4, -6, 11, 7, "#c9ddd4");
		c.strokeStyle = tint;
		c.lineWidth = 2;
		c.beginPath();
		c.ellipse(0, 0, 17, 5, 0, 0.1, Math.PI - 0.1);
		c.stroke();
		for (let i = 0; i < 3; i++) poly(c, [[16 + i * 5, 6], [20 + i * 5, 4], [20 + i * 5, 15], [16 + i * 5, 17]], "#3f6674", "#8fb3b8");
		c.strokeStyle = "#c3c4a5";
		c.lineWidth = 1.5;
		c.beginPath();
		c.moveTo(-12, -8);
		c.lineTo(-12, -30);
		c.stroke();
		c.save();
		c.translate(-12, -30);
		c.rotate(time * 1.5);
		poly(c, [[-9, -2], [9, -2], [7, 3], [-7, 3]], "#d7dccb", "#6a7a74");
		c.restore();
		return true;
	}
	function uplink(c, e, time) {
		const tint = tintOf(e),
			charged = !(e.strikeReady > time);
		// Angular base, a big dish aimed at the sky and a charge light.
		poly(c, [[-34, 14], [-24, -4], [24, -4], [34, 14], [24, 30], [-24, 30]], "#07161a45", null);
		poly(c, [[-32, 10], [-22, -8], [22, -8], [32, 10], [22, 26], [-22, 26]], "#6b5d5c", "#a59598");
		poly(c, [[-22, -8], [22, -8], [26, -14], [-18, -14]], "#8e7e7a", "#bfaea5");
		for (const side of [-1, 1]) poly(c, [[side * 32, 10], [side * 40, 4], [side * 38, 22], [side * 30, 24]], "#524755", "#a59598");
		rect(c, -3, -36, 6, 26, "#4a4148");
		c.save();
		c.translate(0, -40);
		c.rotate(-0.35 + Math.sin(time * 0.3 + e.id) * 0.08);
		ellipse(c, 0, 0, 24, 9, "#b8aca3");
		ellipse(c, 0, -1, 20, 6.5, "#6b5f60");
		c.strokeStyle = "#c9b8a8";
		c.lineWidth = 1.5;
		c.beginPath();
		c.moveTo(0, -1);
		c.lineTo(0, -18);
		c.stroke();
		ellipse(c, 0, -19, 3, 3, charged ? "#ff6a4a" : "#6b3a33");
		c.restore();
		rect(c, -20, 16, 10, 4, tint);
		rect(c, 10, 16, 10, 4, tint);
		return true;
	}
	const bodies = { grenadier, flamer, serviceRover, destroyer, outpost, uplink };
	function body(c, e, time, target) {
		const draw = bodies[e.type];
		return draw ? draw(c, e, time, target) : false;
	}

	// Faction look on the other buildings and on vehicles (hq, barracks, factory and lab have their own trim).
	const OWN_TRIM = new Set(["hq", "barracks", "factory", "lab", "wall", "gate", "outpost", "uplink"]);
	const VEHICLES = new Set(["tank", "heavy", "artillery", "transport", "skyguard", "sentinel", "destroyer", "serviceRover", "worker"]);
	function details(c, e) {
		const s = RTS.TYPES[e.type];
		if (!s || e.team === 2 || s.threat || OWN_TRIM.has(e.type) || !["colonies", "dominion"].includes(e.faction)) return;
		const dom = e.faction === "dominion",
			tint = tintOf(e),
			r = s.radius;
		if (VEHICLES.has(e.type)) {
			c.save();
			c.rotate(e.angle || 0);
			if (dom) {
				// Ram plate at the bow and a warning chevron.
				poly(c, [[r * 0.7, -r * 0.55], [r * 1.05, -r * 0.2], [r * 1.05, r * 0.2], [r * 0.7, r * 0.55]], "#4f4247", "#a58f8e");
				poly(c, [[-r * 0.55, -3], [-r * 0.35, 0], [-r * 0.55, 3], [-r * 0.45, 0]], "#d8573f", null);
			} else {
				// Rounded canopy bubble and a teal band.
				ellipse(c, -r * 0.25, 0, r * 0.32, r * 0.26, "#bfe0d6aa");
				rect(c, -r * 0.8, -1, r * 0.35, 2, tint);
			}
			c.restore();
			return;
		}
		if (s.speed) return;
		if (dom) {
			// Angular shoulder plates, a roof spike and red chevrons.
			for (const side of [-1, 1]) poly(c, [[side * r * 0.72, -r * 0.35], [side * r * 1.02, -r * 0.1], [side * r * 0.98, r * 0.45], [side * r * 0.74, r * 0.3]], "#6f6270", "#a59598");
			poly(c, [[-4, -r * 0.95], [0, -r * 1.35], [4, -r * 0.95]], "#4f4552", "#a59598");
			for (let i = 0; i < 3; i++) poly(c, [[-r * 0.4 + i * 7, r * 0.55], [-r * 0.4 + i * 7 + 4, r * 0.55], [-r * 0.4 + i * 7 + 7, r * 0.62], [-r * 0.4 + i * 7 + 3, r * 0.62]], "#d8573f", null);
		} else {
			// Small dome with a window and solar slats on the roof edge.
			ellipse(c, -r * 0.45, -r * 0.62, r * 0.28, r * 0.2, "#9fc3b9");
			ellipse(c, -r * 0.5, -r * 0.67, r * 0.14, r * 0.08, "#dcefe8");
			for (let i = 0; i < 3; i++) poly(c, [[r * 0.3 + i * 5, -r * 0.72], [r * 0.3 + i * 5 + 3, -r * 0.76], [r * 0.3 + i * 5 + 3, -r * 0.5], [r * 0.3 + i * 5, -r * 0.46]], "#3f6674", "#8fb3b8");
			rect(c, -r * 0.6, r * 0.52, r * 1.2, 2, tint);
		}
	}

	// Orbital strike markers: a closing red target with a countdown (own strikes and visible enemy strikes).
	function overlay(c, game) {
		for (const s of game.strikes || []) {
			if (!game.allied((game.viewer ?? 0), s.team) && !game.isVisible(s.x, s.y)) continue;
			const left = Math.max(0, s.at - game.time),
				R = RTS.FACTION_FX.strike.radius,
				k = left / RTS.FACTION_FX.strike.delay;
			c.save();
			c.strokeStyle = "#ff5a3c";
			c.lineWidth = 3;
			c.globalAlpha = 0.6 + 0.4 * Math.sin(game.time * 12);
			c.setLineDash([12, 8]);
			c.beginPath();
			c.arc(s.x, s.y, R, 0, TAU);
			c.stroke();
			c.setLineDash([]);
			c.globalAlpha = 0.9;
			c.beginPath();
			c.arc(s.x, s.y, R * (0.2 + 0.8 * k), 0, TAU);
			c.stroke();
			c.fillStyle = "#ff5a3c22";
			c.beginPath();
			c.arc(s.x, s.y, R, 0, TAU);
			c.fill();
			c.globalAlpha = 1;
			c.fillStyle = "#ffd6c8";
			c.font = "700 13px Segoe UI, sans-serif";
			c.textAlign = "center";
			c.fillText("UDERZENIE ORBITALNE · " + left.toFixed(1) + " s", s.x, s.y - R - 10);
			c.restore();
		}
	}
	return { body, details, overlay };
})();
// First in the art chain (before the Stage E models); the faction look after the existing trim.
if (typeof Act2Art !== "undefined") {
	const previousBody = Act2Art.body;
	Act2Art.body = (c, e, time) => FactionArt.body(c, e, time) || previousBody(c, e, time);
}
if (typeof AdvancedArt !== "undefined") {
	const previousDetails = AdvancedArt.factionDetails;
	AdvancedArt.factionDetails = (c, e, time) => {
		previousDetails(c, e, time);
		FactionArt.details(c, e, time);
	};
}
if (typeof window !== "undefined") window.FactionArt = FactionArt;
