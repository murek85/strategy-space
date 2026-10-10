/* Stage C visuals: civilians, convoy haulers, the Hefajstos core and act II objective markers. */
const Act2Art = (() => {
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
			c.lineWidth = 1.2;
			c.stroke();
		}
	};
	const glow = (c, x, y, r, color) => {
		const g = c.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, color);
		g.addColorStop(1, "#00000000");
		c.fillStyle = g;
		c.fillRect(x - r, y - r, 2 * r, 2 * r);
	};

	function civilian(c, e, time, coat) {
		const moving = e.path?.length > 0,
			step = moving ? Math.sin(time * 11 + e.id) * 3 : 0;
		c.rotate((e.angle || 0) + Math.PI / 2);
		c.fillStyle = "#2b3438";
		c.fillRect(-5, 2 + step, 3, 7);
		c.fillRect(2, 2 - step, 3, 7);
		poly(
			c,
			[
				[-6, -5],
				[6, -5],
				[7, 5],
				[-7, 5],
			],
			coat,
			"#1b2326",
		);
		c.fillStyle = "#46535a";
		c.fillRect(-4, -9, 8, 5);
		c.fillStyle = "#d9c7a8";
		c.beginPath();
		c.arc(0, -10, 3.6, 0, Math.PI * 2);
		c.fill();
		c.strokeStyle = "#9fd8ea";
		c.lineWidth = 1;
		c.beginPath();
		c.moveTo(4, -7);
		c.lineTo(7, -15);
		c.stroke();
		c.fillStyle = "#bff1ff";
		c.fillRect(6, -17, 2, 2);
	}
	function hauler(c, e, time) {
		c.rotate(e.angle || 0);
		c.fillStyle = "#262d31";
		c.fillRect(-24, -15, 48, 5);
		c.fillRect(-24, 10, 48, 5);
		for (let i = -20; i <= 20; i += 8) {
			c.fillStyle = "#3d474b";
			c.fillRect(
				i + ((time * 20) % 8) * (e.path?.length ? 1 : 0) - 2,
				-15,
				3,
				5,
			);
			c.fillRect(i - 2, 10, 3, 5);
		}
		poly(
			c,
			[
				[-22, -11],
				[12, -11],
				[22, -6],
				[22, 6],
				[12, 11],
				[-22, 11],
			],
			"#5f6f75",
			"#253036",
		);
		poly(
			c,
			[
				[12, -11],
				[22, -6],
				[22, 6],
				[12, 11],
			],
			"#465459",
		);
		c.fillStyle = "#1d2a30";
		c.fillRect(-18, -8, 26, 16);
		const pulse = 0.6 + 0.4 * Math.sin(time * 3 + e.id);
		glow(
			c,
			-5,
			0,
			20,
			"rgba(128,226,255," + (0.35 * pulse).toFixed(2) + ")",
		);
		c.fillStyle = "#8fe6ff";
		c.fillRect(-14, -5, 18, 10);
		c.fillStyle = "#e6fbff";
		c.fillRect(-9, -2, 8, 4);
		c.fillStyle = "#f0c86a";
		c.fillRect(19, -8, 3, 3);
		c.fillRect(19, 5, 3, 3);
	}
	function forge(c, e, time) {
		const pulse = 0.55 + 0.45 * Math.sin(time * 2.2);
		glow(
			c,
			0,
			0,
			110,
			"rgba(255,120,70," + (0.28 * pulse).toFixed(2) + ")",
		);
		poly(
			c,
			[
				[-58, -20],
				[-30, -50],
				[30, -50],
				[58, -20],
				[58, 26],
				[30, 48],
				[-30, 48],
				[-58, 26],
			],
			"#3a3230",
			"#1d1716",
		);
		poly(
			c,
			[
				[-40, -14],
				[-20, -34],
				[20, -34],
				[40, -14],
				[40, 18],
				[20, 34],
				[-20, 34],
				[-40, 18],
			],
			"#4d403b",
			"#211a18",
		);
		for (const [x, y] of [
			[-48, -30],
			[48, -30],
			[-48, 34],
			[48, 34],
		]) {
			c.fillStyle = "#2a2322";
			c.fillRect(x - 7, y - 7, 14, 14);
			c.fillStyle = "#7c5b4c";
			c.fillRect(x - 3, y - 3, 6, 6);
		}
		c.strokeStyle = "#8a6a58";
		c.lineWidth = 3;
		for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
			c.beginPath();
			c.moveTo(Math.cos(a) * 22, Math.sin(a) * 22);
			c.lineTo(Math.cos(a) * 52, Math.sin(a) * 52);
			c.stroke();
		}
		glow(c, 0, 0, 34, "rgba(255,170,90," + (0.8 * pulse).toFixed(2) + ")");
		c.fillStyle = "#ffcf8a";
		c.beginPath();
		c.arc(0, 0, 11 + pulse * 3, 0, Math.PI * 2);
		c.fill();
		c.fillStyle = "#fff3d6";
		c.beginPath();
		c.arc(0, 0, 5, 0, Math.PI * 2);
		c.fill();
	}
	function body(c, e, time) {
		if (e.type === "scientist") {
			civilian(c, e, time, "#dfe6e2");
			return true;
		}
		if (e.type === "technician") {
			civilian(c, e, time, "#e39a5f");
			return true;
		}
		if (e.type === "hauler") {
			hauler(c, e, time);
			return true;
		}
		if (e.type === "forge") {
			forge(c, e, time);
			return true;
		}
		return false;
	}

	function label(c, x, y, text, color, sub) {
		// The 3D board draws these on the screen, sharp, over the map point (webgl3d/three-game-renderer.js):
		// painted on the ground they came out blurred and slanted.
		if (typeof Act2Art !== "undefined" && Act2Art.onLabel) {
			Act2Art.onLabel({ x, y, text, color, sub });
			return;
		}
		c.font = "bold 12px Segoe UI";
		c.textAlign = "center";
		const w =
			Math.max(
				c.measureText(text).width,
				sub ? c.measureText(sub).width * 0.85 : 0,
			) + 16;
		c.fillStyle = "#08121acc";
		c.fillRect(x - w / 2, y - 12, w, sub ? 31 : 18);
		c.fillStyle = color;
		c.fillText(text, x, y + 2);
		if (sub) {
			c.font = "10px Segoe UI";
			c.fillStyle = "#b8c8cc";
			c.fillText(sub, x, y + 15);
		}
	}
	function beacon(c, p, time, color, radius, text, sub, progress = null) {
		// A renderer with its own 3D markers (webgl3d/objectives-3d.js) listens here for where they stand.
		if (typeof Act2Art !== "undefined") Act2Art.onBeacon?.(p, color, radius, progress);
		c.save();
		c.strokeStyle = color;
		c.globalAlpha = 0.8;
		c.lineWidth = 2;
		c.setLineDash([8, 8]);
		c.lineDashOffset = -time * 18;
		c.beginPath();
		c.arc(p.x, p.y, radius, 0, Math.PI * 2);
		c.stroke();
		c.setLineDash([]);
		const r = 12 + Math.sin(time * 3) * 3;
		c.globalAlpha = 0.9;
		c.beginPath();
		c.moveTo(p.x, p.y - r - 10);
		c.lineTo(p.x + 8, p.y - 10);
		c.lineTo(p.x, p.y - 4);
		c.lineTo(p.x - 8, p.y - 10);
		c.closePath();
		c.fillStyle = color;
		c.fill();
		if (progress != null && progress > 0) {
			c.lineWidth = 5;
			c.beginPath();
			c.arc(
				p.x,
				p.y,
				radius - 8,
				-Math.PI / 2,
				-Math.PI / 2 + Math.PI * 2 * Math.min(1, progress),
			);
			c.stroke();
		}
		c.globalAlpha = 1;
		label(c, p.x, p.y - radius - 18, text, color, sub);
		c.restore();
	}
	function markers(c, game) {
		const s = game.act2;
		if (!s) return;
		const t = game.time;
		// Markers set by later chapters (act IV): { x, y, color, radius, text, sub, progress }.
		for (const b of s.beacons || []) beacon(c, b, t, b.color, b.radius, b.text, b.sub, b.progress ?? null);
		if (s.pad)
			beacon(
				c,
				s.pad,
				t,
				"#8fe3c4",
				200,
				"LĄDOWISKO EWAKUACYJNE",
				s.evacuated != null
					? "ewakuowano " + s.evacuated + "/" + s.staff
					: null,
			);
		if (game.missionId === "colony4") {
			if (!s.discovered)
				beacon(
					c,
					s.camp,
					t,
					"#f0cf8a",
					120,
					"OBÓZ BADACZY",
					"sygnał Tessy",
				);
			if (s.discovered && s.phase < 2)
				beacon(
					c,
					s.archive,
					t,
					"#9fd8ea",
					120,
					"ARCHIWUM SONDY",
					"odczyt " + Math.floor(s.reading) + "/12 s",
					s.reading / 12,
				);
			if (s.phase >= 2 && s.core !== "loaded" && s.core !== "delivered")
				beacon(
					c,
					s.coreSite,
					t,
					"#8fe6ff",
					110,
					s.core === "dropped" ? "RDZEŃ WE WRAKU" : "RDZEŃ DANYCH",
					"podjedź transporterem",
				);
			for (const e of game.entities)
				if (e.type === "transport" && e.archive && e.hp > 0) {
					c.save();
					glow(c, e.x, e.y - 26, 24, "rgba(128,226,255,.55)");
					c.fillStyle = "#bff4ff";
					c.fillRect(e.x - 5, e.y - 31, 10, 10);
					c.restore();
				}
		}
		if (game.missionId === "colony5") {
			c.save();
			c.strokeStyle = "#9cc6f2";
			c.globalAlpha = 0.45;
			c.lineWidth = 3;
			c.setLineDash([14, 12]);
			c.lineDashOffset = -t * 10;
			c.beginPath();
			const lead = game.haulers()[0];
			const from = lead || s.stops[s.leg];
			c.moveTo(from.x, from.y);
			for (const st of s.stops.slice(s.leg)) c.lineTo(st.x, st.y);
			c.stroke();
			c.restore();
			s.stops.forEach((st, i) => {
				if (i < s.leg && !st.final) return;
				const current = i === s.leg,
					sub = st.final
						? s.mode === "arrived"
							? "dostarczono " + s.delivered + "/3"
							: "cel konwoju"
						: current && s.mode === "halt"
							? "przeładunek " + Math.ceil(s.haltLeft) + " s"
							: "postój";
				beacon(
					c,
					st,
					t,
					st.final ? "#f0cf8a" : "#9cc6f2",
					170,
					(st.final ? "LATARNIA " : "POSTÓJ ") + st.name,
					sub,
					current && s.mode === "halt" ? 1 - s.haltLeft / 30 : null,
				);
				if (st.depot && !game.stopDepot(st) && i >= s.leg) {
					c.save();
					c.strokeStyle = "#f09b72";
					c.setLineDash([5, 6]);
					c.strokeRect(st.depot.x - 36, st.depot.y - 36, 72, 72);
					c.restore();
					label(
						c,
						st.depot.x,
						st.depot.y + 52,
						"ODBUDUJ STACJĘ",
						"#f09b72",
					);
				}
			});
		}
		if (game.missionId === "colony6") {
			const f = game.forge();
			if (f && s.choice === "destroy" && s.phase === 2) {
				c.save();
				c.strokeStyle = "#ff8a5c";
				c.globalAlpha = 0.55 + 0.35 * Math.sin(t * 8);
				c.lineWidth = 4;
				c.beginPath();
				c.arc(f.x, f.y, 380, 0, Math.PI * 2);
				c.stroke();
				c.restore();
				label(
					c,
					f.x,
					f.y - 400,
					"PRZECIĄŻENIE ZA " + Math.ceil(s.overload) + " s",
					"#ff8a5c",
					"wycofaj jednostki z kręgu",
				);
			} else if (f && s.phase < 2)
				label(
					c,
					f.x,
					f.y - 80,
					"SERCE POPIOŁU",
					s.phase === 1 ? "#f0cf8a" : "#e98883",
					s.phase === 1 ? "czeka na decyzję" : "przejmij 3 węzły",
				);
		}
	}
	return { body, markers };
})();
