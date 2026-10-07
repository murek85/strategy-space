/* Portraits of the campaign's speakers, drawn in code on a canvas (no image files): a comm-screen bust with
   the speaker's colour, blinking and moving the mouth while talking. Lira (network engineer), Dr Mira Tessa
   (research lead), Cpt. Oren Vale (convoy), Adrian Koss (complex technician), Cdr Aris Varn (Dominium), the
   intercepted Dominium channel (an emblem in static) and the Swarm's Whisper (a pulsing crystal).
   Used by the radio box in the game (app.js), the radio log of acts II–III and the scenes before chapters
   (interludes.js). */
const Portraits = (() => {
	const FACES = {
		lira: { skin: "#d9a98a", hair: "#2f6f68", style: "undercut", outfit: "#2c5a52", trim: "#9fe3cf", headset: true, goggles: true },
		tessa: { skin: "#e3bfa2", hair: "#b9b3ab", style: "bun", outfit: "#d8cdb6", trim: "#f0cf8a", glasses: true, collar: true, age: true },
		vale: { skin: "#b98466", hair: "#3a332e", style: "buzz", outfit: "#45596e", trim: "#9cc6f2", stubble: true, scar: true, pads: true },
		koss: { skin: "#c99a7c", hair: null, style: "bald", outfit: "#b8662f", trim: "#f2a38c", welding: true, tired: true },
		varn: { skin: "#d6b29a", hair: "#2b2421", style: "slick", outfit: "#5a1f1c", trim: "#e9a17a", highCollar: true, temples: true, insignia: true },
	};
	const COLORS = { lira: "#9fe3cf", tessa: "#f0cf8a", vale: "#9cc6f2", koss: "#f2a38c", varn: "#e9a17a", dominium: "#e98883", whisper: "#d59cf0" };
	const ell = (c, x, y, rx, ry, color, rot = 0) => {
		c.fillStyle = color;
		c.beginPath();
		c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
		c.fill();
	};
	const poly = (c, pts, color) => {
		c.fillStyle = color;
		c.beginPath();
		pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.closePath();
		c.fill();
	};
	const shade = (hex, k) => {
		const n = parseInt(hex.slice(1), 16),
			f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
		return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("");
	};
	function backdrop(c, color, t) {
		const g = c.createRadialGradient(50, 40, 5, 50, 50, 75);
		g.addColorStop(0, shade(color, 0.32));
		g.addColorStop(1, "#050b12");
		c.fillStyle = g;
		c.fillRect(0, 0, 100, 100);
		// Grid of the comm screen.
		c.strokeStyle = color + "22";
		c.lineWidth = 0.4;
		for (let x = 10; x < 100; x += 15) {
			c.beginPath();
			c.moveTo(x, 0);
			c.lineTo(x, 100);
			c.stroke();
		}
	}
	function overlay(c, color, t) {
		// Scanlines, a slow bright band rolling down, the frame.
		c.fillStyle = "#00000030";
		for (let y = 0; y < 100; y += 2) c.fillRect(0, y, 100, 0.7);
		const band = ((t * 22) % 140) - 20;
		const g = c.createLinearGradient(0, band - 8, 0, band + 8);
		g.addColorStop(0, "#ffffff00");
		g.addColorStop(0.5, "#ffffff10");
		g.addColorStop(1, "#ffffff00");
		c.fillStyle = g;
		c.fillRect(0, band - 8, 100, 16);
		c.strokeStyle = color;
		c.lineWidth = 2;
		c.strokeRect(1, 1, 98, 98);
		c.fillStyle = color;
		for (const [x, y] of [[1, 1], [93, 1], [1, 93], [93, 93]]) c.fillRect(x, y, 6, 6);
	}
	function human(c, f, t, talk) {
		const blink = (t * 0.9 + (f.skin.length % 3)) % 4 < 0.12 ? 0.15 : 1,
			sway = Math.sin(t * 1.1) * 0.8;
		c.save();
		c.translate(sway, 0);
		// Shoulders and outfit.
		poly(c, [[8, 100], [14, 78], [32, 70], [68, 70], [86, 78], [92, 100]], f.outfit);
		poly(c, [[32, 70], [50, 84], [68, 70], [62, 69], [50, 78], [38, 69]], shade(f.outfit, 0.7));
		if (f.pads) {
			ell(c, 18, 76, 10, 6, shade(f.outfit, 1.25), -0.3);
			ell(c, 82, 76, 10, 6, shade(f.outfit, 1.25), 0.3);
		}
		if (f.collar) poly(c, [[34, 70], [44, 80], [50, 72], [56, 80], [66, 70], [60, 68], [50, 74], [40, 68]], "#f1ece2");
		if (f.highCollar) poly(c, [[36, 72], [38, 60], [62, 60], [64, 72], [50, 78]], shade(f.outfit, 0.8));
		if (f.insignia) {
			poly(c, [[22, 84], [27, 80], [32, 84], [27, 88]], f.trim);
			c.fillStyle = f.trim;
			c.fillRect(66, 82, 12, 2);
			c.fillRect(66, 86, 12, 2);
		}
		c.fillStyle = f.trim;
		c.fillRect(48, 84, 4, 16);
		// Neck, head, ears.
		c.fillStyle = shade(f.skin, 0.85);
		c.fillRect(43, 58, 14, 14);
		ell(c, 30, 46, 3.5, 6, shade(f.skin, 0.9));
		ell(c, 70, 46, 3.5, 6, shade(f.skin, 0.9));
		ell(c, 50, 42, 19, 23, f.skin);
		ell(c, 50, 54, 14, 10, shade(f.skin, 0.95));
		// Hair.
		if (f.style === "undercut") {
			poly(c, [[30, 36], [33, 22], [45, 16], [62, 18], [71, 30], [70, 38], [62, 28], [48, 30], [36, 30]], f.hair);
			poly(c, [[44, 17], [72, 22], [76, 34], [66, 26]], shade(f.hair, 1.25));
		} else if (f.style === "bun") {
			ell(c, 50, 28, 20, 12, f.hair);
			ell(c, 50, 15, 9, 7, f.hair);
			poly(c, [[30, 36], [32, 28], [40, 26], [36, 40]], f.hair);
			poly(c, [[70, 36], [68, 28], [60, 26], [64, 40]], f.hair);
		} else if (f.style === "buzz") {
			c.globalAlpha = 0.85;
			ell(c, 50, 27, 19, 10, f.hair);
			c.globalAlpha = 1;
		} else if (f.style === "slick") {
			poly(c, [[31, 38], [32, 24], [44, 17], [60, 17], [69, 25], [69, 36], [64, 26], [40, 25]], f.hair);
			if (f.temples) {
				ell(c, 32, 34, 2.5, 5, "#9a9590");
				ell(c, 68, 34, 2.5, 5, "#9a9590");
			}
		} else ell(c, 50, 25, 16, 6, shade(f.skin, 1.08));
		// Eyes, brows, nose, mouth.
		for (const x of [42, 58]) {
			ell(c, x, 42, 3.4, 2.4 * blink, "#f4f1ea");
			ell(c, x, 42, 1.6, 1.6 * blink, "#24313a");
		}
		c.strokeStyle = f.hair || shade(f.skin, 0.6);
		c.lineWidth = 1.4;
		for (const [x, d] of [[42, -1], [58, 1]]) {
			c.beginPath();
			c.moveTo(x - 4, 37 + (f.tired ? d * 0.8 : 0));
			c.lineTo(x + 4, 37 - (f.tired ? d * 0.8 : 0) - (f.highCollar ? d * 1 : 0));
			c.stroke();
		}
		c.strokeStyle = shade(f.skin, 0.7);
		c.lineWidth = 1;
		c.beginPath();
		c.moveTo(50, 43);
		c.lineTo(48, 51);
		c.lineTo(51, 52);
		c.stroke();
		if (f.age) {
			c.beginPath();
			c.moveTo(36, 46);
			c.lineTo(38, 48);
			c.moveTo(64, 46);
			c.lineTo(62, 48);
			c.stroke();
		}
		if (f.stubble) {
			c.globalAlpha = 0.35;
			ell(c, 50, 58, 13, 7, f.hair);
			c.globalAlpha = 1;
		}
		if (f.scar) {
			c.strokeStyle = "#e7b9a0";
			c.lineWidth = 1;
			c.beginPath();
			c.moveTo(60, 34);
			c.lineTo(64, 47);
			c.stroke();
		}
		ell(c, 50, 57, 5, 0.8 + talk * 2.6, "#5b2e2c");
		// Accessories.
		if (f.glasses) {
			c.strokeStyle = "#3b3a36";
			c.lineWidth = 1.2;
			for (const x of [42, 58]) {
				c.beginPath();
				c.arc(x, 42, 5.2, 0, Math.PI * 2);
				c.stroke();
			}
			c.beginPath();
			c.moveTo(47, 42);
			c.lineTo(53, 42);
			c.stroke();
		}
		if (f.goggles) {
			c.fillStyle = "#28343a";
			c.fillRect(31, 25, 38, 4);
			ell(c, 42, 26, 5, 3.5, "#9fe3cf");
			ell(c, 58, 26, 5, 3.5, "#9fe3cf");
		}
		if (f.welding) {
			c.fillStyle = "#2f2a25";
			c.fillRect(30, 28, 40, 4);
			ell(c, 42, 29, 6, 4, "#1d4a3c");
			ell(c, 58, 29, 6, 4, "#1d4a3c");
			c.globalAlpha = 0.5;
			ell(c, 40, 28, 2, 1, "#9fffd0");
			c.globalAlpha = 1;
		}
		if (f.headset) {
			c.strokeStyle = "#1c2629";
			c.lineWidth = 2.4;
			c.beginPath();
			c.arc(50, 40, 22, Math.PI * 1.05, Math.PI * 1.95);
			c.stroke();
			ell(c, 29, 46, 3.5, 6, "#1c2629");
			c.lineWidth = 1.4;
			c.beginPath();
			c.moveTo(29, 50);
			c.quadraticCurveTo(32, 60, 43, 58);
			c.stroke();
			ell(c, 43, 58, 1.8, 1.4, f.trim);
		}
		c.restore();
	}
	function dominium(c, t) {
		// The intercepted channel: the Dominium emblem breaking up in static.
		const color = COLORS.dominium;
		c.save();
		c.translate(50, 50);
		c.rotate(Math.sin(t * 0.7) * 0.03);
		poly(c, [[0, -30], [26, -15], [26, 15], [0, 30], [-26, 15], [-26, -15]], "#3a1517");
		poly(c, [[0, -22], [8, -6], [22, -4], [10, 6], [14, 22], [0, 13], [-14, 22], [-10, 6], [-22, -4], [-8, -6]], color);
		c.restore();
		for (let i = 0; i < 70; i++) {
			const x = (Math.sin(i * 12.9898 + Math.floor(t * 12) * 3.1) * 43758.5453) % 1,
				y = (Math.sin(i * 78.233 + Math.floor(t * 12) * 1.7) * 12345.678) % 1;
			c.fillStyle = i % 3 ? "#ffffff30" : color + "50";
			c.fillRect(Math.abs(x) * 100, Math.abs(y) * 100, 2.5, 0.8);
		}
	}
	function whisper(c, t, talk) {
		// The Swarm: crystal shards turning round a pulsing core.
		const color = COLORS.whisper,
			pulse = 1 + 0.15 * Math.sin(t * 3) + talk * 0.25;
		const g = c.createRadialGradient(50, 50, 2, 50, 50, 30 * pulse);
		g.addColorStop(0, "#fbe6ff");
		g.addColorStop(0.4, color + "aa");
		g.addColorStop(1, "#d59cf000");
		c.fillStyle = g;
		c.fillRect(0, 0, 100, 100);
		for (let i = 0; i < 7; i++) {
			const a = i * 0.9 + t * 0.35 * (i % 2 ? 1 : -1),
				r = 22 + (i % 3) * 6;
			c.save();
			c.translate(50 + Math.cos(a) * r, 50 + Math.sin(a) * r * 0.8);
			c.rotate(a);
			poly(c, [[0, -9], [3, 0], [0, 9], [-3, 0]], i % 2 ? "#b77fdc" : "#e8c4ff");
			c.restore();
		}
	}
	// Draws a portrait into a square: c, who, x, y, size; t time in seconds, talk 0…1 (mouth).
	function draw(c, who, x, y, size, t = 0, talk = 0) {
		const color = COLORS[who] || "#c5d7d9";
		c.save();
		c.translate(x, y);
		c.scale(size / 100, size / 100);
		c.beginPath();
		c.rect(0, 0, 100, 100);
		c.clip();
		backdrop(c, color, t);
		if (FACES[who]) human(c, FACES[who], t, talk);
		else if (who === "whisper") whisper(c, t, talk);
		else dominium(c, t);
		overlay(c, color, t);
		c.restore();
	}
	// The mouth while talking: syllable-like pulses.
	const mouth = (t) => Math.max(0, Math.sin(t * 14) * 0.6 + Math.sin(t * 23) * 0.4);
	// A canvas element with the portrait (HiDPI).
	function canvas(who, size = 64) {
		const el = document.createElement("canvas"),
			dpr = Math.min(2, window.devicePixelRatio || 1);
		el.width = el.height = Math.round(size * dpr);
		el.style.width = el.style.height = size + "px";
		el.className = "portrait";
		el.setAttribute("role", "img");
		el.setAttribute("aria-label", "Portret: " + (RTS.ACT2_SPEAKERS?.[who]?.name || who));
		const c = el.getContext("2d");
		c.scale(dpr, dpr);
		draw(c, who, 0, 0, size, 0, 0);
		el.dataset.who = who;
		return el;
	}
	// Animates a portrait canvas: talking for `seconds`, then idle (blinking) while it is on the page.
	function talk(el, who, seconds = 2.5) {
		const start = performance.now(),
			size = parseFloat(el.style.width) || el.width,
			c = el.getContext("2d");
		const frame = (now) => {
			if (!el.isConnected) return;
			const t = (now - start) / 1000;
			c.clearRect(0, 0, size, size);
			draw(c, who, 0, 0, size, t, t < seconds ? mouth(t) : 0);
			if (t < seconds + 8) requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
	}
	// "Name: text" of a radio line → { who, name, color, text } (null for other notices).
	function speakerOf(line) {
		const speakers = (typeof RTS !== "undefined" && RTS.ACT2_SPEAKERS) || {};
		for (const [who, s] of Object.entries(speakers))
			if (String(line).startsWith(s.name + ": ")) return { who, name: s.name, color: s.color || COLORS[who], text: String(line).slice(s.name.length + 2) };
		return null;
	}
	const cache = {};
	// A small still as an image URL (for lists).
	function still(who, size = 28) {
		const key = who + "|" + size;
		if (!cache[key]) cache[key] = canvas(who, size).toDataURL();
		return cache[key];
	}
	return { draw, canvas, talk, speakerOf, still, mouth, COLORS, known: (who) => !!COLORS[who] };
})();
if (typeof window !== "undefined") window.Portraits = Portraits;
