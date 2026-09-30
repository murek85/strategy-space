/* Stage E models: medical post, shield generator, salvage yard, anti-aircraft vehicle, recon drone,
   saboteurs, wrecks, module fittings, the sabotage mark and the shield dome. Same volumes and
   upper-left light as the other buildings (AdvancedArt). Hooked in front of the existing art chain. */
const SupportArt = (() => {
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
	// A box with the shared projection: front wall, side wall and a lit roof.
	function block(c, x, y, w, d, h, dom) {
		poly(c, [[x, y], [x + w, y], [x + w + 22, y + 19], [x + 22, y + 19]], "#07161a45", null);
		poly(c, [[x, y - h], [x + w, y - h], [x + w, y + d], [x, y + d]], dom ? "#776c69" : "#677769");
		poly(c, [[x + w, y - h], [x + w + 12, y - h - 9], [x + w + 12, y + d - 9], [x + w, y + d]], dom ? "#443e48" : "#384e4a");
		const roof = c.createLinearGradient(x, y - h - 9, x + w, y + d - h);
		roof.addColorStop(0, dom ? "#c6b8a4" : "#c4c8ac");
		roof.addColorStop(1, dom ? "#8b8589" : "#8b9c85");
		poly(c, [[x, y - h], [x + w, y - h], [x + w + 12, y - h - 9], [x + 12, y - h - 9]], roof);
	}
	// The team the screen belongs to (app.js exposes the battle; tests without it see team 0).
	const viewer = () => (typeof currentGame === "function" ? currentGame()?.viewer : undefined) ?? 0;
	const tintOf = (e) => e.tint || (e.team === viewer() ? "#b0efd0" : "#f07d78");
	const dominion = (e) => e.faction === "dominion" || (!e.faction && e.team !== viewer() && e.team !== 2);

	function medbay(c, e, time) {
		const dom = dominion(e),
			tint = tintOf(e);
		ellipse(c, 8, 16, 46, 24, "#07141a55");
		block(c, -36, -12, 62, 34, 20, dom);
		// Tent roof with the medical cross.
		poly(c, [[-38, -32], [4, -52], [40, -32], [28, -22], [-26, -22]], dom ? "#d8cfc4" : "#e1e6d6");
		poly(c, [[4, -52], [40, -32], [28, -22]], dom ? "#aaa19b" : "#b2bfae", null);
		rect(c, -4, -44, 8, 20, "#d9534f");
		rect(c, -10, -38, 20, 8, "#d9534f");
		// Stretchers at the front, lit green while someone is being treated.
		const busy = (e.healTargets || []).length;
		for (let i = 0; i < 3; i++) {
			const x = -30 + i * 20;
			rect(c, x, 8, 16, 7, "#2c4146");
			rect(c, x + 1, 9, 14, 4, i < busy ? "#8de7b8" : "#c7c7b5");
			if (i < busy) ellipse(c, x + 8, 11, 9 + Math.sin(time * 5 + i) * 2, 4, "#8de7b833");
		}
		rect(c, -24, 22, 40, 3, tint);
		return true;
	}
	function shieldgen(c, e, time) {
		const dom = dominion(e),
			tint = tintOf(e),
			charge = Math.max(0, Math.min(1, (e.shield || 0) / 700)),
			over = (e.overload || 0) > 0;
		ellipse(c, 8, 16, 44, 22, "#07141a55");
		block(c, -32, -8, 54, 30, 14, dom);
		// Pylon with three emitter rings and a core that shows the stored charge.
		poly(c, [[-9, -18], [9, -18], [6, -58], [-6, -58]], dom ? "#8a8185" : "#869a8c");
		for (let i = 0; i < 3; i++) {
			c.strokeStyle = over ? "#e36d5e" : "#8fe6ef";
			c.globalAlpha = over ? 0.4 + 0.4 * Math.abs(Math.sin(time * 9)) : 0.35 + charge * 0.6;
			c.lineWidth = 2;
			c.beginPath();
			c.ellipse(0, -30 - i * 11, 14 - i * 2, 5 - i, 0, 0, TAU);
			c.stroke();
		}
		c.globalAlpha = 1;
		ellipse(c, 0, -64, 9, 9, "#23363d");
		ellipse(c, 0, -64, 6, 6, over ? "#e36d5e" : charge > 0.05 ? "#bff6ff" : "#46626a");
		if (!over && charge > 0.05) ellipse(c, 0, -64, 12 + Math.sin(time * 3) * 2, 12 + Math.sin(time * 3) * 2, "#9ff0ff33");
		// Charge gauge on the front.
		rect(c, -26, 4, 36, 5, "#16292e");
		rect(c, -26, 4, 36 * charge, 5, over ? "#e36d5e" : "#8fe6ef");
		rect(c, -24, 18, 40, 3, tint);
		return true;
	}
	function salvageYard(c, e, time) {
		const dom = dominion(e),
			tint = tintOf(e);
		ellipse(c, 8, 18, 54, 26, "#07141a55");
		// Fenced ground with scrap heaps.
		poly(c, [[-50, -14], [40, -14], [56, 30], [-34, 30]], "#4d5552");
		c.strokeStyle = "#8f9a8d";
		c.lineWidth = 1.5;
		c.setLineDash([3, 4]);
		c.beginPath();
		c.moveTo(-50, -14);
		c.lineTo(40, -14);
		c.lineTo(56, 30);
		c.lineTo(-34, 30);
		c.closePath();
		c.stroke();
		c.setLineDash([]);
		for (const [x, y, s] of [[-28, 14, 10], [-10, 20, 8], [22, 16, 11]]) {
			poly(c, [[x - s, y + 4], [x - s * 0.4, y - s], [x + s * 0.5, y - s * 0.6], [x + s, y + 4]], "#6d625a", "#3a3430");
			rect(c, x - 3, y - s * 0.4, 6, 2, "#b8a078");
		}
		block(c, -44, -18, 34, 20, 18, dom);
		// Crane arm with a magnet swinging slowly.
		c.strokeStyle = "#d1bd81";
		c.lineWidth = 4;
		c.beginPath();
		c.moveTo(30, 10);
		c.lineTo(30, -44);
		const swing = Math.sin(time * 0.8) * 10;
		c.lineTo(-4 + swing, -44);
		c.stroke();
		c.strokeStyle = "#34484d";
		c.lineWidth = 1.5;
		c.beginPath();
		c.moveTo(-2 + swing, -44);
		c.lineTo(-2 + swing, -22);
		c.stroke();
		ellipse(c, -2 + swing, -20, 6, 3, "#556a6e");
		rect(c, -40, 24, 40, 3, tint);
		return true;
	}
	function skyguard(c, e, time, target) {
		const dom = dominion(e),
			tint = tintOf(e),
			moving = e.path?.length > 0;
		c.save();
		c.rotate(e.angle);
		ellipse(c, 3, 6, 24, 15, "#07121d60");
		for (const y of [-17, 10]) {
			rect(c, -22, y, 42, 8, "#15252d");
			for (let x = -20; x < 18; x += 6) rect(c, x + (moving ? (time * 12) % 6 : 0), y + 1, 2, 6, "#607577");
		}
		poly(c, [[-20, -10], [16, -12], [22, -4], [22, 5], [16, 11], [-20, 10]], dom ? "#685455" : "#536f6d", "#b0bbae");
		rect(c, -16, -7, 22, 14, dom ? "#b09a8c" : "#c0cbb7");
		rect(c, 12, -10, 5, 3, tint);
		rect(c, 12, 8, 5, 3, tint);
		c.restore();
		// Twin-barrel mount aimed at the target (or along the hull), with a radar mast.
		c.save();
		c.rotate(target ? Math.atan2(target.y - e.y, target.x - e.x) : e.target && Number.isFinite(e.aim) ? e.aim : e.angle);
		ellipse(c, -2, 0, 10, 9, "#324b53");
		const recoil = e.target && e.cooldown > 0.5 ? 3 : 0;
		for (const side of [-1, 1]) {
			rect(c, 2 - recoil, side * 5 - 2, 22, 4, "#b5c5bb");
			rect(c, 22 - recoil, side * 5 - 2, 4, 4, "#435b64");
			if (recoil) ellipse(c, 27, side * 5, 4, 2.5, "#ffd6a0");
		}
		c.restore();
		c.strokeStyle = "#c3c4a5";
		c.lineWidth = 1.5;
		c.beginPath();
		c.moveTo(-10, -6);
		c.lineTo(-10, -20);
		c.stroke();
		c.save();
		c.translate(-10, -20);
		c.rotate(time * 3);
		c.strokeStyle = tint;
		c.beginPath();
		c.ellipse(0, 0, 7, 2, 0, 0, TAU);
		c.stroke();
		c.restore();
		return true;
	}
	function drone(c, e, time) {
		const tint = tintOf(e),
			r = 11;
		ellipse(c, 16, 20, r * 1.1, r * 0.5, "#06141b55");
		c.save();
		c.translate(0, -22 - Math.sin(time * 3 + e.id) * 2);
		c.rotate(e.angle);
		for (const [x, y] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
			c.strokeStyle = "#39484d";
			c.lineWidth = 2;
			c.beginPath();
			c.moveTo(0, 0);
			c.lineTo(x, y);
			c.stroke();
			ellipse(c, x, y, 6, 6, "#9fb3b433");
			c.save();
			c.translate(x, y);
			c.rotate(time * 30 + x);
			rect(c, -6, -0.8, 12, 1.6, "#cfd8d2");
			c.restore();
		}
		ellipse(c, 0, 0, 6, 5, "#56696c");
		ellipse(c, 2, 0, 3, 3, "#9ae6f0");
		rect(c, -5, -1, 3, 2, tint);
		c.restore();
		return true;
	}
	function saboteur(c, e, time) {
		const tint = tintOf(e),
			moving = e.path?.length > 0,
			step = moving ? Math.sin(time * 11 + e.id) * 3 : 0;
		c.save();
		// Own hidden saboteurs are drawn faintly; enemies never see them hidden (not drawn by the game).
		if (e.stealth) c.globalAlpha = 0.5;
		c.rotate(e.angle);
		ellipse(c, 2, 4, 11, 6, "#06141a60");
		for (const side of [-1, 1]) rect(c, -11 + step * side, side < 0 ? -7 : 3, 9, 4, "#1d2a2e");
		// Dark cloak and a pack with the charge.
		poly(c, [[-6, -8], [4, -7], [8, -2], [8, 3], [4, 7], [-6, 8]], "#3a4540");
		rect(c, -10, -5, 5, 10, "#5b4a3a");
		rect(c, -9, -2, 3, 4, (e.chargeReady || 0) > time ? "#6b6056" : "#e8b04c");
		ellipse(c, 2, 0, 4.5, 4.5, "#2d3634");
		rect(c, 5, -1, 3, 2, tint);
		if (e.planting > 0) ellipse(c, 10, 0, 3 + Math.sin(time * 12) * 1.5, 3, "#ffcf7a");
		c.restore();
		return true;
	}
	const bodies = { medbay, shieldgen, salvageYard, skyguard, drone, saboteur };
	function body(c, e, time, target) {
		const draw = bodies[e.type];
		if (!draw) return false;
		return draw(c, e, time, target);
	}

	// Module fittings on the buildings that carry them, and the sabotage / fitting marks.
	function details(c, e, time) {
		if (e.module) {
			const tint = tintOf(e);
			if (e.module === "veterans") {
				rect(c, 26, -64, 2, 26, "#c3c4a5");
				poly(c, [[28, -64], [44, -60], [28, -54]], tint);
				ellipse(c, 36, -44, 5, 5, "#e8c56a");
			} else if (e.module === "rapid") {
				for (let i = 0; i < 3; i++) rect(c, 30 + i * 7, 14, 5, 12, i === Math.floor(time * 4) % 3 ? "#9fe6c7" : "#5b7470");
				rect(c, 28, 26, 24, 3, tint);
			} else if (e.module === "heavyArms") {
				block(c, 22, -40, 22, 14, 10, false);
				rect(c, 30, -52, 28, 5, "#b5c5bb");
				rect(c, 56, -53, 6, 7, "#435b64");
			} else if (e.module === "logistics") {
				poly(c, [[-66, 20], [-38, 20], [-30, 36], [-58, 36]], "#4d5d5c");
				c.strokeStyle = "#e8c56a";
				c.lineWidth = 1.5;
				c.strokeRect(-58, 24, 20, 9);
				rect(c, -52, 27, 8, 3, tint);
			} else if (e.module === "antiArmor") {
				for (const side of [-1, 1]) poly(c, [[side * 14, 6], [side * 24, 0], [side * 24, 14], [side * 14, 18]], "#6f7d74", "#2c3a3c");
			} else if (e.module === "antiAir") {
				rect(c, 16, -26, 3, 16, "#c3c4a5");
				c.save();
				c.translate(18, -28);
				c.rotate(time * 2);
				c.strokeStyle = "#9ae6f0";
				c.lineWidth = 2;
				c.beginPath();
				c.arc(0, 0, 7, Math.PI * 0.1, Math.PI * 0.9);
				c.stroke();
				c.restore();
			}
		}
		disabledMark(c, e, time, time);
		if ((e.moduleLeft || 0) > 0) {
			// Fitting in progress: scaffold mark and a spinning wrench light.
			c.fillStyle = "#e8c56a";
			c.font = "bold 16px Segoe UI";
			c.textAlign = "center";
			c.fillText("⚙", 0, -70);
		}
	}
	function disabledMark(c, e, time, now) {
		if (!((e.disabledUntil || 0) > now)) return;
		const r = RTS.TYPES[e.type].radius;
		for (let i = 0; i < 3; i++) {
			const a = time * 7 + i * 2.1,
				x = Math.cos(a) * r * 0.6,
				y = -r * 0.4 + Math.sin(a * 1.3) * r * 0.3;
			c.strokeStyle = "#9fdcff";
			c.lineWidth = 1.5;
			c.beginPath();
			c.moveTo(x, y);
			c.lineTo(x + 5, y - 6);
			c.lineTo(x + 1, y - 7);
			c.lineTo(x + 6, y - 13);
			c.stroke();
		}
		c.fillStyle = "#9fdcff";
		c.font = "bold 14px Segoe UI";
		c.textAlign = "center";
		c.fillText("⚡ " + Math.ceil(e.disabledUntil - now) + " s", 0, -r - 26);
	}

	// Wreck on the ground (salvage): a charred heap, larger for bigger objects.
	function wreck(c, w) {
		const s = Math.max(10, Math.min(46, w.size)),
			seed = w.id * 7.3;
		c.save();
		c.translate(w.x, w.y);
		ellipse(c, 3, 5, s * 1.1, s * 0.55, "#0a0d0e66");
		for (let i = 0; i < 5; i++) {
			const a = seed + i * 1.37,
				x = Math.cos(a) * s * 0.45,
				y = Math.sin(a) * s * 0.25,
				k = s * (0.28 + (i % 3) * 0.08);
			poly(c, [[x - k, y + 3], [x - k * 0.3, y - k * 0.8], [x + k * 0.6, y - k * 0.4], [x + k, y + 4]], i % 2 ? "#3b3533" : "#56504a", "#1b1a19");
		}
		rect(c, -s * 0.2, -s * 0.15, s * 0.5, 2, "#8a7b62");
		c.fillStyle = "#c9b98f";
		c.font = "10px Segoe UI";
		c.textAlign = "center";
		c.fillText("WRAK · " + w.value, 0, s * 0.55 + 12);
		c.restore();
	}
	function wrecks(c, g) {
		for (const w of g.wrecks || []) if (g.explored[g.visionIndex(w.x, w.y)]) wreck(c, w);
	}
	// Shield domes over protected bases (interface layer, above the fog).
	function overlay(c, g) {
		for (const e of g.entities) {
			if (e.type !== "shieldgen" || e.hp <= 0 || e.constructionLeft || (e.team !== (g.viewer ?? 0) && !g.isVisible(e.x, e.y))) continue;
			const r = RTS.SUPPORT.shield.range,
				over = (e.overload || 0) > 0,
				charge = Math.max(0, Math.min(1, (e.shield || 0) / RTS.SUPPORT.shield.capacity));
			c.save();
			if (over) {
				c.strokeStyle = "rgba(227,109,94,.45)";
				c.setLineDash([10, 12]);
				c.lineWidth = 2;
				c.beginPath();
				c.arc(e.x, e.y, r, 0, TAU);
				c.stroke();
			} else if (charge > 0.02) {
				// A faint fill and a rim (both drawn natively by the WebGL renderer, no painted texture).
				const flash = Math.min(1, (e.flash || 0) * 3);
				c.fillStyle = `rgba(140,230,245,${(0.035 + charge * 0.04 + flash * 0.1).toFixed(3)})`;
				c.beginPath();
				c.arc(e.x, e.y, r, 0, TAU);
				c.fill();
				c.strokeStyle = `rgba(160,236,248,${(0.18 + charge * 0.25 + flash * 0.4).toFixed(3)})`;
				c.lineWidth = 1.5;
				c.beginPath();
				c.arc(e.x, e.y, r, 0, TAU);
				c.stroke();
			}
			c.restore();
		}
	}
	return { body, details, disabledMark, wreck, wrecks, overlay };
})();
// First in the art chain: the new models, then the existing ones; details and marks after the faction trim.
if (typeof Act2Art !== "undefined") {
	const act2Body = Act2Art.body;
	Act2Art.body = (c, e, time) => SupportArt.body(c, e, time) || act2Body(c, e, time);
}
if (typeof AdvancedArt !== "undefined") {
	const factionDetails = AdvancedArt.factionDetails;
	AdvancedArt.factionDetails = (c, e, time) => {
		factionDetails(c, e, time);
		SupportArt.details(c, e, time);
	};
}
