/* The loading screen, in the style of the campaign films (campaign-film.js kit): a jump out of hyperspace — star
   streaks shortening as the ship slows — and the mission's world growing ahead, under a card with the operation's
   name and planet, a progress bar walking through stages, and a tip. It covers the start of a mission (the map,
   units and the 3D board are built under it) and the loading of a save, and once, briefly, the start of the
   game. A click skips the wait once the work is done; with reduced motion the backdrop stands still. */
const LoadingScreen = (() => {
	const TIPS = [
		"PPM robotem na złożu — wydobycie. Bezczynne roboty wybierzesz klawiszem Z.",
		"Przekaźniki dają metal co sekundę — zajmij je wcześnie i postaw obok wieżyczkę.",
		"Rakietowcy są skuteczni przeciw pojazdom i budynkom, piechota przeciw piechocie.",
		"Spacja zatrzymuje symulację — w pauzie możesz spokojnie wydawać rozkazy.",
		"Sabotażystów wykryją tylko Twoje jednostki w pobliżu, nie budynki.",
		"Reaktor [C] i laboratorium [N] otwierają rozwój centrum do Kolonii.",
		"W trybie 3D PageUp pochyla kamerę ku horyzontowi, a przecinek i kropka ją obracają.",
		"Ctrl+1–9 zapisuje grupę jednostek, 1–9 ją wybiera.",
		"Mgła wojny skrywa wroga — zwiadowcy i drony widzą najdalej.",
		"Przed atakiem dowódcy AI nasłuch czasem przechwytuje jego rozkazy — słuchaj łączności.",
	];
	const WORLD = { dust: ["#c69a5c", "#2a1c12", "#ffd29a"], ice: ["#d9e8f0", "#3a5060", "#bfe6ff"], ash: ["#7a5a50", "#1a100e", "#ff9a6a"], space: ["#c49a6c", "#22140c", "#9cd0ff"], spaceIce: ["#cfe6f2", "#1c3446", "#bff0ff"], spaceLava: ["#3a2420", "#120806", "#ff8a3a"], spaceVoid: ["#1a0c0c", "#000000", "#ff8a4a"], ocean: ["#3f8aa0", "#08202a", "#a8e8ff"], crystal: ["#a8d8ec", "#283a50", "#d4c4ff"] };
	const STAGES = ["Wyjście z nadprzestrzeni…", "Ustalanie orbity…", "Generowanie terenu…", "Rozmieszczanie jednostek…", "Synchronizacja łączności…", "Gotowe"];

	function backdrop(c, k, t, o, arrive) {
		const { W, H, rnd, glow, nebula, planet, flare } = k;
		const [land, night, air] = WORLD[o.biome] || WORLD.dust;
		c.fillStyle = "#02050a";
		c.fillRect(0, 0, W, H);
		nebula(c, t, [[480, 200, 380, air + "40", 0.45, 0], [160, 100, 240, "#1a2a5a", 0.4, 1]]);
		// Hyperspace: streaks from the centre, long at first, short as the ship slows down.
		const speed = Math.max(0, 1 - arrive),
			cx = W / 2,
			cy = H / 2;
		for (let i = 0; i < 220; i++) {
			const a = rnd(i) * Math.PI * 2,
				d0 = ((rnd(i * 3) * 600 + t * (80 + 700 * speed)) % 600) + 10,
				len = 4 + speed * 120 * (d0 / 600);
			const x1 = cx + Math.cos(a) * d0,
				y1 = cy + Math.sin(a) * d0 * 0.6,
				x2 = cx + Math.cos(a) * (d0 + len),
				y2 = cy + Math.sin(a) * (d0 + len) * 0.6;
			c.strokeStyle = i % 4 ? `rgba(200,225,255,${0.25 + speed * 0.5})` : `rgba(140,220,255,${0.3 + speed * 0.5})`;
			c.lineWidth = 1 + (d0 / 600) * 1.5;
			c.beginPath();
			c.moveTo(x1, y1);
			c.lineTo(x2, y2);
			c.stroke();
		}
		glow(c, cx, cy, 160 * speed + 20, "#bfe6ff", 0.6 * speed);
		// The world ahead, growing as we arrive.
		// (o.world: the start screen's world, low as a horizon under the name.)
		const r = o.world ? o.world.r : 40 + arrive * 230;
		planet(c, cx, o.world ? cy + o.world.y : cy + 40 + arrive * 210, r, { base: land, dark: night, atmo: air, light: -2.2, cities: 0.5, t, seed: 91 });
		flare(c, cx + 240, cy - 120, 0.35 + arrive * 0.3, air);
		// Grain and a vignette.
		const v = c.createRadialGradient(cx, cy, H * 0.35, cx, cy, W * 0.7);
		v.addColorStop(0, "rgba(0,0,0,0)");
		v.addColorStop(1, "rgba(0,0,0,0.65)");
		c.fillStyle = v;
		c.fillRect(0, 0, W, H);
	}

	// Shows the screen: { eyebrow, title, planet, biome, reduced, minTime }. Returns { done() } — call it when the
	// work is finished; the screen then fills the bar, waits out its minimum time and fades away.
	function show(o = {}) {
		const k = typeof CampaignFilm !== "undefined" ? CampaignFilm.kit : null,
			root = document.createElement("div"),
			tip = TIPS[Math.floor(Math.random() * TIPS.length)];
		// Reduced motion: no glint along the bar (the bar itself still fills).
		root.className = "loading-screen" + (o.reduced ? " reduced" : "");
		root.setAttribute("role", "status");
		root.setAttribute("aria-live", "polite");
		root.innerHTML = `<canvas class="loading-backdrop" aria-hidden="true"></canvas><div class="loading-hud" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="loading-card"><span class="loading-eyebrow">${o.eyebrow || "OPERACJA"}</span><h1>${o.title || "Pogranicze Galaktyki"}</h1><p class="loading-planet">${o.planet || ""}</p><div class="loading-bar"><b></b></div><div class="loading-stage"><span></span><em>0%</em></div><p class="loading-tip"><b>Wskazówka</b> ${tip}</p></div>`;
		document.body.append(root);
		const canvas = root.querySelector("canvas"),
			bar = root.querySelector(".loading-bar b"),
			stage = root.querySelector(".loading-stage span"),
			pct = root.querySelector(".loading-stage em"),
			c = canvas.getContext("2d"),
			start = performance.now(),
			minTime = o.minTime ?? 1.8;
		let finished = false,
			finishedAt = 0,
			closing = false;
		const fit = () => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.width = Math.round(innerWidth * dpr);
			canvas.height = Math.round(innerHeight * dpr);
			if (!k) return;
			const s = Math.max(canvas.width / k.W, canvas.height / k.H);
			c.setTransform(s, 0, 0, s, (canvas.width - k.W * s) / 2, (canvas.height - k.H * s) / 2);
		};
		fit();
		const close = () => {
			if (closing) return;
			closing = true;
			root.classList.add("closing");
			removeEventListener("resize", fit);
			setTimeout(() => root.remove(), 450);
		};
		// The bar's own position (its CSS animation runs on the compositor, also while the page is busy).
		const shown = () => {
			const m = getComputedStyle(bar).transform.match(/matrix\(([-\d.e]+)/);
			return m ? Number(m[1]) : 0;
		};
		let completing = false;
		const frame = (now) => {
			if (!root.isConnected) return;
			const t = (now - start) / 1000;
			// Progress: the CSS animation walks towards 85% and holds there until the work is done; then the bar is
			// carried to the end from where it stands.
			let p = shown();
			if (finished && !completing) {
				completing = true;
				bar.style.animation = "none";
				bar.style.transform = `scaleX(${p})`;
				void bar.offsetWidth;
				bar.style.transition = "transform 0.4s ease-out";
				bar.style.transform = "scaleX(1)";
				root.classList.add("finished");
			}
			if (completing && now - finishedAt > 420) p = 1;
			pct.textContent = Math.round(p * 100) + "%";
			stage.textContent = STAGES[Math.min(STAGES.length - 1, Math.floor(p * (STAGES.length - 1) + (p >= 1 ? 1 : 0)))];
			if (k) backdrop(c, k, o.reduced ? 2 : t, o, o.reduced ? 0.7 : Math.min(1, t / Math.max(minTime, 1.2)));
			if (finished && p >= 0.999 && t >= minTime) return close();
			requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
		root.addEventListener("click", () => finished && close());
		addEventListener("resize", fit);
		return {
			done() {
				if (finished) return;
				finished = true;
				finishedAt = performance.now();
				// (In a background tab animation frames stop: close on a timer as well.)
				setTimeout(close, Math.max(0, minTime * 1000 - (finishedAt - start)) + 1200);
			},
			close,
		};
	}
	// The game's emblem: a hexagonal frame, a world on an orbit, the Free Colonies' chevron over it.
	const LOGO = `<svg class="boot-logo" viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="boot-world" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#d9f6ff"/><stop offset="0.45" stop-color="#5fb8c8"/><stop offset="1" stop-color="#0c2a36"/></radialGradient></defs><path d="M60 4 108 32V88L60 116 12 88V32Z" fill="#07131b" stroke="#2c4a52" stroke-width="3"/><path d="M60 14 99 37V83L60 106 21 83V37Z" fill="none" stroke="#7fe7c8" stroke-opacity="0.35" stroke-width="1.5"/><circle cx="60" cy="62" r="24" fill="url(#boot-world)"/><ellipse cx="60" cy="62" rx="40" ry="11" fill="none" stroke="#f0cf8a" stroke-width="2.5" transform="rotate(-18 60 62)"/><path d="M43 30 60 22 77 30 60 38Z" fill="#7fe7c8"/><circle cx="96" cy="49" r="3" fill="#f0cf8a"/></svg>`;

	/* The start screen (0.172, as in the train game): the jump out of hyperspace behind the game's emblem and name;
	   a bar until the page has settled ({ ready() }), then "click or press any key". The press closes it — and, being
	   the first gesture of the session, lets the sound in ({ onPress }, called inside the gesture); the key itself goes
	   no further, so it does not also press a button of the menu behind. */
	const BOOT_WORLD = { biome: "ice", world: { y: 400, r: 280 } };
	function boot(o = {}) {
		const k = typeof CampaignFilm !== "undefined" ? CampaignFilm.kit : null,
			root = document.createElement("div");
		root.className = "loading-screen boot-screen" + (o.reduced ? " reduced" : "");
		root.setAttribute("role", "dialog");
		root.setAttribute("aria-label", "Pogranicze Galaktyki — ekran startowy");
		root.innerHTML = `<canvas class="loading-backdrop" aria-hidden="true"></canvas><div class="loading-hud" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="boot-card">${LOGO}<span class="boot-eyebrow">WOLNE KOLONIE · SEKTOR 07</span><h1>POGRANICZE<small>GALAKTYKI</small></h1><p class="boot-sub">strategia czasu rzeczywistego na krańcu zbadanej przestrzeni</p><div class="loading-bar"><b></b></div><p class="boot-press" aria-live="polite">Kliknij lub naciśnij dowolny klawisz</p><p class="boot-ver">${o.version ? "wersja " + o.version : ""}</p></div>`;
		document.body.append(root);
		// It takes the page over from the cover drawn since the first paint, without a fade (no menu between).
		document.getElementById("boot-cover")?.remove();
		const canvas = root.querySelector("canvas"),
			bar = root.querySelector(".loading-bar b"),
			c = canvas.getContext("2d"),
			start = performance.now(),
			minTime = o.minTime ?? 1.2;
		let ready = false,
			closing = false;
		const fit = () => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.width = Math.round(innerWidth * dpr);
			canvas.height = Math.round(innerHeight * dpr);
			if (!k) return;
			const s = Math.max(canvas.width / k.W, canvas.height / k.H);
			c.setTransform(s, 0, 0, s, (canvas.width - k.W * s) / 2, (canvas.height - k.H * s) / 2);
		};
		fit();
		addEventListener("resize", fit);
		const close = () => {
			if (closing) return;
			closing = true;
			root.classList.add("closing");
			removeEventListener("resize", fit);
			removeEventListener("keydown", key, true);
			setTimeout(() => {
				root.remove();
				o.onEnter?.();
			}, 450);
		};
		const enter = (e) => {
			if (e) {
				e.preventDefault();
				e.stopPropagation();
			}
			if (!ready || closing) return;
			o.onPress?.();
			close();
		};
		// Until the screen goes, no key reaches the game (the menu behind would take Enter or Escape).
		const key = (e) => {
			if (e.repeat || ["Shift", "Control", "Alt", "Meta", "Tab"].includes(e.key)) return e.preventDefault();
			enter(e);
		};
		addEventListener("keydown", key, true);
		root.addEventListener("pointerdown", enter);
		const frame = (now) => {
			if (!root.isConnected || closing) return;
			const t = (now - start) / 1000;
			// The ship slows out of hyperspace and stays drifting towards the world while the screen waits.
			if (k) backdrop(c, k, o.reduced ? 2 : t, BOOT_WORLD, o.reduced ? 0.6 : Math.min(0.6, t / 3));
			requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
		const poll = () => {
			if (!root.isConnected) return;
			if ((performance.now() - start) / 1000 >= minTime && (!o.ready || o.ready())) {
				const m = getComputedStyle(bar).transform.match(/matrix\(([-\d.e]+)/);
				bar.style.animation = "none";
				bar.style.transform = `scaleX(${m ? Number(m[1]) : 0})`;
				void bar.offsetWidth;
				bar.style.transition = "transform 0.4s ease-out";
				bar.style.transform = "scaleX(1)";
				root.classList.add("finished");
				setTimeout(() => {
					ready = true;
					root.classList.add("ready");
				}, 420);
				return;
			}
			setTimeout(poll, 120);
		};
		setTimeout(poll, 120);
		return { close: () => ((ready = true), enter()), get ready() { return ready; } };
	}
	return { show, boot, TIPS };
})();
if (typeof window !== "undefined") window.LoadingScreen = LoadingScreen;
