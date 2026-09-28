/* Prototype page: one scenario map rendered by PixiRenderer with the real simulation running underneath. */
(async () => {
	const $ = (id) => document.getElementById(id),
		host = $("view");
	const app = new PIXI.Application();
	try {
		await app.init({ resizeTo: host, background: "#0b141c", antialias: true, preference: "webgl", autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
	} catch (error) {
		$("fallback").style.display = "flex";
		$("panel").hidden = true;
		console.error(error);
		return;
	}
	host.appendChild(app.canvas);

	const game = new RTS.Game(42, "lumen");
	game.configureSkirmish({ players: 2, mode: "conquest" });
	game.explored.fill(1);
	game.nextWave = 40;
	const renderer = new PixiRenderer(app, game);
	window.prototypeRenderer = renderer;
	const base = game.hq(0);
	renderer.camera = { x: base.x + (base.x < game.W / 2 ? 700 : -700), y: base.y + (base.y < game.H / 2 ? 420 : -420), zoom: 0.9 };

	let paused = false,
		accumulator = 0,
		frames = 0,
		frameClock = 0,
		fps = 0,
		worst = 0;
	const attack = () => {
		const enemy = game.enemyBases()[0];
		if (!enemy) return;
		game.command(game.units(0).filter((e) => e.type !== "worker").map((e) => e.id), enemy.x, enemy.y, null, true);
	};
	app.ticker.add((ticker) => {
		const dt = Math.min(ticker.deltaMS / 1000, 0.1);
		if (!paused) {
			accumulator += dt;
			let steps = 0;
			while (accumulator >= 1 / 30 && steps++ < 4) {
				game.tick(1 / 30);
				accumulator -= 1 / 30;
			}
			if (game.result) paused = true;
		}
		renderer.update(ticker.deltaMS);
		frames++;
		frameClock += ticker.deltaMS;
		worst = Math.max(worst, ticker.deltaMS);
		if (frameClock >= 1000) {
			fps = Math.round((frames * 1000) / frameClock);
			const s = renderer.stats(),
				phase = renderer.dayPhase();
			$("stats").textContent =
				`${fps} kl./s · najgorsza ${Math.round(worst)} ms\n` +
				`sprite'y ${s.sprites} · światła ${s.lights} · poświaty ${s.glows}\n` +
				`tekstury modeli ${s.textures} · noc ${Math.round(renderer.night() * 100)}%\n` +
				`czas bitwy ${Math.floor(game.time / 60)}:${String(Math.floor(game.time % 60)).padStart(2, "0")} · pora ${phase.toFixed(2)}`;
			if (renderer.timeOfDay === null) $("tod").value = phase;
			frames = 0;
			frameClock = 0;
			worst = 0;
		}
	});

	// Controls.
	const timeButtons = [...document.querySelectorAll("[data-time]")];
	const setTime = (value) => {
		renderer.timeOfDay = value === "auto" ? null : Number(value);
		if (value !== "auto") $("tod").value = value;
		for (const b of timeButtons) b.setAttribute("aria-pressed", String(b.dataset.time === String(value)));
	};
	for (const b of timeButtons) b.onclick = () => setTime(b.dataset.time);
	$("tod").oninput = () => setTime($("tod").value);
	$("storm").onclick = () => {
		renderer.forceStorm = !renderer.forceStorm;
		$("storm").setAttribute("aria-pressed", String(renderer.forceStorm));
	};
	$("pause").onclick = () => {
		paused = !paused;
		$("pause").setAttribute("aria-pressed", String(paused));
	};
	$("battle").onclick = attack;
	$("center").onclick = () => Object.assign(renderer.camera, { x: game.W / 2, y: game.H / 2 });
	for (const box of document.querySelectorAll("[data-option]")) box.onchange = () => (renderer.options[box.dataset.option] = box.checked);

	// Camera: drag to pan, wheel to zoom around the cursor.
	let drag = null;
	host.addEventListener("pointerdown", (e) => {
		drag = { x: e.clientX, y: e.clientY, cx: renderer.camera.x, cy: renderer.camera.y };
		host.setPointerCapture(e.pointerId);
		host.style.cursor = "grabbing";
	});
	host.addEventListener("pointermove", (e) => {
		if (!drag) return;
		renderer.camera.x = Math.max(0, Math.min(game.W, drag.cx - (e.clientX - drag.x) / renderer.camera.zoom));
		renderer.camera.y = Math.max(0, Math.min(game.H, drag.cy - (e.clientY - drag.y) / renderer.camera.zoom));
	});
	host.addEventListener("pointerup", () => {
		drag = null;
		host.style.cursor = "grab";
	});
	host.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
			const cam = renderer.camera,
				before = cam.zoom;
			cam.zoom = Math.max(0.3, Math.min(3, cam.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
			const rect = host.getBoundingClientRect(),
				mx = e.clientX - rect.left - rect.width / 2,
				my = e.clientY - rect.top - rect.height / 2;
			cam.x += mx / before - mx / cam.zoom;
			cam.y += my / before - my / cam.zoom;
		},
		{ passive: false },
	);
	setTimeout(attack, 4000);
})();
