(() => {
	"use strict";
	const { Game, TYPES, RESEARCH, MISSIONS, dist, clamp } = RTS;
	// Map size follows the active game (scenarios offer small, medium and large maps).
	let W = RTS.W,
		H = RTS.H;
	let audioStorage;
	try {
		audioStorage = window.localStorage;
	} catch {}
	const sound = new GameAudio({ storage: audioStorage });
	// Reachable from the browser console for diagnostics (gameAudio.diagnostics()).
	window.gameAudio = sound;
	const campaign = new CampaignProgress(audioStorage);
	const $ = (id) => document.getElementById(id),
		canvas = $("game"),
		mini = $("minimap");
	let game = new Game(),
		selected = new Set(
			game
				.units((game.viewer ?? 0))
				.filter((e) => e.type !== "worker")
				.map((e) => e.id),
		),
		started = false,
		paused = false,
		building = false,
		attackMode = false,
		strikeMode = null,
		finished = false;
	// Network play (netplay.js): the lockstep session, or null in a single-player battle.
	let netSession = null;
	// A player's action: run at once in a single-player battle; in a network battle sent to both computers and run
	// there a few turns later (the answer is optimistic: counts for the selection, true otherwise).
	const COUNTED = new Set(["hold", "demolish", "salvage", "sabotage", "board", "setRally"]);
	function act(name, ...args) {
		if (!netSession) return game[name](...args);
		netSession.issue(name, args);
		return COUNTED.has(name) && Array.isArray(args[0]) ? args[0].length : true;
	}
	window.gameAct = act;
	// The current battle, reachable from the browser console (diagnostics, tests).
	window.currentGame = () => game;
	window.currentNetwork = () => netSession;
	window.currentMenu = () => menu;
	let choiceOpen = false,
		act2Signature = "";
	let width = 1,
		height = 1,
		dpr = 1,
		scale = 1,
		camera = { x: W / 2, y: H / 2, zoom: 1 },
		mouse = { x: 0, y: 0 },
		drag = null,
		pan = null,
		keys = new Set(),
		toastTimer = 0,
		hudTimer = 0;
	const colors = ["#b0efd0", "#f07d78", "#e4b968", "#819dff", "#d2a1ef"];
	let wallDrag = null;
	let economyPanel = null,
		development = null;
	let activeTab = "army",
		autosaveClock = 0,
		lastGroupKey = null,
		lastGroupAt = 0,
		productionSignature = "";
	const SAVE_KEY = "pogranicze-save-v2";
	let menu = null;
	function fit() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		width = canvas.clientWidth;
		height = canvas.clientHeight;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		scale = Math.min(width / W, height / H) * camera.zoom;
	}
	function world(p) {
		return {
			x: (p.x - width / 2) / scale + camera.x,
			y: (p.y - height / 2) / scale + camera.y,
		};
	}
	function screen(e) {
		return {
			x: (e.x - camera.x) * scale + width / 2,
			y: (e.y - camera.y) * scale + height / 2,
		};
	}
	// 3D board, middle-button drag: move the camera so the grabbed ground point is under the pointer again,
	// measured on the frame last drawn (one correction per frame, so fast pointers do not overshoot).
	function panTowardsPointer() {
		if (!pan || pan.turn || rendererMode !== "three") return;
		const now = world(pointer({ clientX: pan.client.x, clientY: pan.client.y }));
		camera.x = clamp(camera.x + pan.ground.x - now.x, 0, W);
		camera.y = clamp(camera.y + pan.ground.y - now.y, 0, H);
	}
	function pointer(e) {
		const r = canvas.getBoundingClientRect(),
			p = { x: e.clientX - r.left, y: e.clientY - r.top };
		// With the 2.5D tilt the board is drawn in perspective; the game works on the flat frame.
		return renderer.toFlat ? renderer.toFlat(p) : p;
	}
	// The music of a battle: the Swarm as the enemy — "Ul"; dead ships — "Wrak"; alien jungles and floating islands —
	// "Gąszcz"; magma and the Hefajstos complex — "Kuźnia"; otherwise by the world (desert, dawn, ice, ash).
	function musicModeFor(g) {
		const m = MISSIONS[g.missionId] || {},
			me = g.humans?.[0] ?? 0;
		if (g.entities.some((e) => e.type === "hq" && e.hp > 0 && e.team !== me && e.team !== 2 && !g.allied?.(me, e.team) && g.factionFor?.(e.team)?.key === "swarm")) return "game:hive";
		if (m.theme === "derelict") return "game:wreck";
		if (m.theme === "lumen" || m.theme === "skyfall" || m.theme === "space") return "game:lumen";
		if (m.theme === "magma" || g.missionId === "colony6") return "game:forge";
		return "game:" + (m.sunny ? "sun" : m.biome);
	}
	function toast(text) {
		const el = $("toast"),
			line = typeof Portraits !== "undefined" && Portraits.speakerOf(text);
		el.classList.toggle("comms", !!line);
		if (line) {
			// A radio line: the speaker's portrait (talking), the name in their colour and the text.
			const face = Portraits.canvas(line.who, 56),
				box = document.createElement("span"),
				name = document.createElement("b");
			box.className = "comms-text";
			name.textContent = line.name;
			name.style.color = line.color;
			box.append(name, document.createTextNode(" " + line.text));
			el.replaceChildren(face, box);
			Portraits.talk(face, line.who, Math.min(5, 1.2 + line.text.length / 28));
			// The speaker's radio voice (audio-radio.js).
			sound.speak?.(line.who, line.text);
			toastTimer = 6.5;
		} else {
			el.textContent = text;
			toastTimer = 4;
		}
		el.classList.add("visible");
	}
	function updateAudioControls() {
		const button = $("sound-toggle");
		button.textContent = sound.muted ? "♫̸" : "♪";
		button.setAttribute("aria-pressed", String(!sound.muted));
		button.setAttribute(
			"aria-label",
			sound.muted ? "Włącz dźwięk" : "Wycisz dźwięk",
		);
		button.title = sound.failed
			? "Dźwięk niedostępny w tej przeglądarce"
			: `${sound.muted ? "Włącz" : "Wycisz"} dźwięk [M]`;
		button.disabled = sound.failed;
		$("sound-volume").disabled = sound.failed;
		$("sound-volume").value = Math.round(sound.volume * 100);
		menu?.syncAudio();
	}
	async function toggleSound() {
		sound.setMuted(!sound.muted);
		await sound.unlock();
		updateAudioControls();
		if (!sound.muted) sound.play("ready", { force: true });
	}
	const unlockSound = () => {
		sound.unlock().then(updateAudioControls);
	};
	document.addEventListener("pointerdown", unlockSound, { capture: true });
	document.addEventListener("keydown", unlockSound, { capture: true });
	document.addEventListener("click", (e) => {
		const button = e.target.closest("button");
		if (
			button &&
			!button.disabled &&
			!["sound-toggle", "start", "resume-game", "play-again"].includes(
				button.id,
			)
		)
			sound.play("click");
	});
	window.addEventListener("blur", () => sound.silence());
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) sound.silence();
	});
	// Drawing lives in render-canvas.js; app.js keeps the camera, input and HUD and hands over a view each frame.
	const canvasRenderer = createCanvasRenderer(canvas, mini);
	let renderer = canvasRenderer,
		rendererMode = "canvas",
		rendererRequested = null,
		rendererNote = "";
	async function load3D() {
		if (location.protocol !== "file:")
			try {
				return await import("./webgl3d/three-game-renderer.js");
			} catch (error) {
				console.warn(error);
			}
		if (!window.Board3D)
			await new Promise((resolve, reject) => {
				const script = document.createElement("script");
				script.src = "webgl3d/bundle-3d.js";
				script.onload = resolve;
				script.onerror = () => reject(Error("Brak webgl3d/bundle-3d.js"));
				document.head.appendChild(script);
			});
		return window.Board3D;
	}
	// 3D or WebGL when chosen and available; 3D falls back to WebGL, and Canvas 2D stays the fallback at every step.
	async function applyRenderer() {
		const wanted = SceneFX.options.renderer;
		if (wanted === rendererRequested) return;
		rendererRequested = wanted;
		if (wanted === "canvas") {
			useCanvasRenderer("");
			return;
		}
		const lost = () => useCanvasRenderer("Utracono kontekst grafiki — gra przełączyła się na renderer Canvas 2D.");
		let board = null,
			note = "";
		if (wanted === "three") {
			// Loaded on demand: the ES modules of webgl3d/ when served over http, else (page opened from
			// disk, where modules cannot load) the same code built into one classic script (npm run build:3d).
			try {
				board = (await load3D()).createThreeGameRenderer({ gameCanvas: canvas, canvasRenderer, onContextLost: lost });
			} catch (error) {
				console.warn(error);
				note = "Tryb 3D nie uruchomił się w tej przeglądarce — działa WebGL (PixiJS).";
			}
		}
		try {
			if (!board) {
				if (typeof createPixiGameRenderer !== "function" || typeof PIXI === "undefined")
					throw Error("Brak biblioteki PixiJS");
				board = await createPixiGameRenderer({
					gameCanvas: canvas,
					canvasRenderer,
					preference: wanted === "webgpu" ? "webgpu" : "webgl",
					onContextLost: lost,
				});
			}
			if (SceneFX.options.renderer !== wanted) {
				board.destroy();
				return;
			}
			board.setGame(game);
			const old = renderer;
			renderer = board;
			if (old !== canvasRenderer) old.destroy?.();
			rendererMode = board.kind;
			rendererNote = note || (wanted === "webgpu" && board.kind !== "webgpu" ? "WebGPU jest niedostępny w tej przeglądarce — działa WebGL (PixiJS) z tymi samymi efektami." : "");
			if (note) toast(note);
		} catch (error) {
			console.warn(error);
			board?.destroy?.();
			useCanvasRenderer("WebGL jest niedostępny w tej przeglądarce — gra używa renderera Canvas 2D.");
		}
	}
	function useCanvasRenderer(note) {
		if (renderer !== canvasRenderer) {
			const old = renderer;
			renderer = canvasRenderer;
			old.destroy?.();
		}
		rendererMode = "canvas";
		canvasRenderer.setGame(game);
		rendererNote = note;
		if (note) toast(note);
	}
	function syncWorld() {
		if (W === game.W && H === game.H) return;
		W = game.W;
		H = game.H;
		camera.x = clamp(camera.x, 0, W);
		camera.y = clamp(camera.y, 0, H);
		fit();
	}
	function terrainTexture() {
		syncWorld();
		renderer.setGame(game);
	}
	function refreshFog() {
		renderer.refreshFog(game);
	}
	function view() {
		return { game, width, height, dpr, scale, camera, selected, colors, mouse, drag, building, wallDrag };
	}
	function render() {
		renderer.render(view());
	}
	const timeLabel = (n) =>
		`${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
	function selectedProducer() {
		const es = [...selected].map((id) => game.get(id));
		return es.length === 1 && game.isProducer(es[0]) ? es[0] : null;
	}
	function preferredProducer(type) {
		const b = selectedProducer();
		return b?.type === game.productionType(type) ? b.id : null;
	}
	function selectGroup(number, assign = false, append = false) {
		if (!started || finished) return;
		if (assign) {
			const members = game.assignGroup(number, [...selected], append);
			toast(
				members.length
					? `Grupa ${number}: ${members.length} jednostek.`
					: `Grupa ${number} wyczyszczona.`,
			);
		} else {
			const ids = game.recallGroup(number);
			if (!ids.length) {
				toast(
					`Grupa ${number} pusta. Zaznacz jednostki i naciśnij Ctrl+${number}.`,
				);
				return;
			}
			selected = new Set(ids);
			const now = performance.now();
			if (lastGroupKey === number && now - lastGroupAt < 400) {
				const es = ids.map((id) => game.get(id));
				camera.x = es.reduce((n, e) => n + e.x, 0) / es.length;
				camera.y = es.reduce((n, e) => n + e.y, 0) / es.length;
				fit();
			}
			lastGroupKey = number;
			lastGroupAt = now;
		}
		updateHud();
	}
	function focusAlert() {
		const a = game.baseAlert;
		if (!a) return;
		camera.x = a.x;
		camera.y = a.y;
		camera.zoom = Math.max(camera.zoom, 1.6);
		fit();
	}
	function updateCommandHud() {
		const b = selectedProducer();
		$("rally-hint").hidden = !b;
		$("rally-hint").textContent = b
			? `${game.entityName(b)} #${b.id} · PPM na mapie ustawia punkt zbiórki`
			: "";
		document.querySelectorAll("[data-group]").forEach((button) => {
			const ids = game.recallGroup(button.dataset.group);
			button.querySelector("small").textContent = ids.length || "—";
			button.classList.toggle("assigned", !!ids.length);
			button.classList.toggle(
				"selected",
				ids.length > 0 &&
					ids.length === selected.size &&
					ids.every((id) => selected.has(id)),
			);
		});
		const alarm = game.baseAlert && game.baseAlert.until > game.time;
		$("base-alert").hidden = !alarm;
		if (alarm)
			$("base-alert").textContent =
				`⚠ BAZA ATAKOWANA · ${game.baseAlert.name} · pokaż [J]`;
		const factories = game.entities.filter((e) => game.isProducer(e));
		const model = factories.map((e) => {
			const queue = game.buildingQueue(e.id),
				q = queue[0];
			return {
				id: e.id,
				type: e.type,
				construction: Math.ceil(e.constructionLeft),
				count: queue.length,
				unit: q?.type,
				left: q ? Math.ceil(q.left) : 0,
				selected: selected.has(e.id),
			};
		});
		const orphanCount = game.queue.filter(
			(q) => q.producerId == null,
		).length;
		const signature = JSON.stringify([model, orphanCount]);
		if (signature !== productionSignature) {
			productionSignature = signature;
			$("building-queues").innerHTML =
				model
					.map(
						(e) =>
							`<button class="building-queue ${e.selected ? "selected" : ""}" data-producer="${e.id}"><span>${game.unitName(e.type)} #${e.id}<b>${e.count}/10</b></span><small>${e.construction ? "Budowa · " + e.construction + " s" : e.unit ? game.unitName(e.unit) + " · " + e.left + " s" : "Wolna kolejka · wybierz budynek"}</small></button>`,
					)
					.join("") +
				(orphanCount
					? `<p class="orphan-queue">${orphanCount} zadań czeka na odbudowę.</p>`
					: "");
			document.querySelectorAll("[data-producer]").forEach(
				(button) =>
					(button.onclick = () => {
						selected = new Set([Number(button.dataset.producer)]);
						deck("army");
					}),
			);
		}
	}
	function workersForExtractor(id) {
		return game
			.units((game.viewer ?? 0))
			.filter(
				(e) => e.order?.kind === "gas" && e.order.extractorId === id,
			).length;
	}
	function updateHud() {
		const weather = game.weather,
			forecast = game.forecast;
		// Space (the orbital battle): no weather and no night.
		if ($("weather-status") && game.space)
			$("weather-status").textContent =
				"✦ ORBITA · " +
				(weather.intensity > 0.05
					? weather.name +
						(weather.kind === "ion"
							? " · celność −" + Math.round(weather.intensity * 30 * (game.upgrades.guidance ? 0.25 : 1)) + "%" + (game.ionStorm?.() ? " · osłony nie odnawiają się" : "")
							: weather.kind === "solar"
								? " · promieniowanie wyczerpuje osłony, nie odnawiają się"
								: " · uderzenia odłamków" + (game.upgrades.meteorShield ? " (osłony −80%)" : " · zbadaj osłony przeciwmeteorytowe"))
					: "Spokojnie") +
				(forecast ? " · " + (weather.remaining > 0 ? "Koniec za " + Math.ceil(weather.remaining) + " s" : weather.name + " za " + Math.ceil(weather.until) + " s") : game.stormOutlook?.near ? " · " + weather.name + " nadciąga · ok. " + Math.ceil(game.stormOutlook.until) + " s" : " · Prognoza: zbadaj monitoring w laboratorium");
		else if ($("weather-status"))
			$("weather-status").textContent =
				`${game.night > 0.5 ? "☾ NOC" : "☀ DZIEŃ"} · ${weather.intensity > 0.05 ? weather.name + " · ruch −" + Math.round(weather.intensity * 35 * (game.upgrades.mobility ? 0.25 : 1)) + "% · celność −" + Math.round(weather.intensity * 30 * (game.upgrades.guidance ? 0.25 : 1)) + "%" : "Spokojna pogoda"}${forecast ? " · " + (weather.remaining > 0 ? "Koniec za " + Math.ceil(weather.remaining) + " s" : weather.name + " " + (game.stormOutlook?.from || "") + " za " + Math.ceil(weather.until) + " s") : game.stormOutlook?.near ? " · " + weather.name + " nadciąga " + game.stormOutlook.from + " · ok. " + Math.ceil(game.stormOutlook.until) + " s" : " · Prognoza: zbadaj monitoring w laboratorium"}`;

		if ($("toggle-gate")) {
			const gate = game.get([...selected][0]);
			$("toggle-gate").hidden =
				selected.size !== 1 || gate?.type !== "gate";
			$("toggle-gate").textContent = gate?.open
				? "Zamknij bramę"
				: "Otwórz bramę";
		}
		if ($("development-open"))
			$("development-open").disabled = !started || finished;
		economyPanel?.update(game, started);
		refreshFog();
		for (const id of selected) if (!game.get(id)) selected.delete(id);
		$("credits").textContent = Math.floor(game.credits).toLocaleString(
			"pl-PL",
		);
		$("income").textContent = `+${game.income}/s`;
		$("income").title =
			"Dochód pasywny centrum i przekaźników. Pełny dochód: Logistyka → Bilans.";
		$("population").textContent = `${game.population(0)} / 60`;
		$("clock").textContent = timeLabel(game.time);
		if (game.network) networkIntel();
		else {
			const waves = Number.isFinite(game.nextWave) && (game.enemyBases().length || game.modeState?.mode === "survival");
			$("wave").previousElementSibling.textContent = game.aiActive?.()
				? "Planowany atak"
				: "Następny desant";
			$("wave").textContent = waves ? timeLabel(Math.max(0, game.nextWave - game.time)) : "—";
			$("wave-progress").style.width = waves
				? `${100 * (1 - (game.nextWave - game.time) / Math.max(35, 65 - game.wave * 3))}%`
				: "0%";
		}
		$("obj-capture").classList.toggle("done", game.captured);
		$("obj-army").classList.toggle("done", game.population(0) >= 12);
		$("obj-hq").classList.toggle("done", (game.resultFor?.() ?? game.result) === "victory");
		const es = [...selected].map((id) => game.get(id)).filter(Boolean);
		$("selection-title").textContent =
			es.length === 1
				? TYPES[es[0].type].name
				: es.length
					? `Oddział · ${es.length} jednostek`
					: "Brak zaznaczenia";
		$("selection-detail").textContent = es.length
			? `${Math.ceil(es.reduce((a, e) => a + e.hp, 0))} PW · ${es.some((e) => e.order?.kind === "build") ? "buduje" : es.some((e) => e.order?.kind === "gas") ? "wydobywa gaz" : es.some((e) => e.order?.kind === "gather") ? "wydobywa rudę" : es.some((e) => e.order?.kind === "repair") ? "naprawia" : es.some((e) => e.order?.kind === "hold") ? "utrzymuje pozycję" : es.some((e) => e.target) ? "w walce" : es.some((e) => ["trooper", "rocket"].includes(e.type) && game.cover(e)) ? "w osłonie" : "gotowość"}`
			: "LPM lub przeciągnij ramkę";
		if (es.length === 1 && es[0].type === "extractor") {
			const b = es[0],
				field = game.gasFields.find((o) => o.id === b.gasId),
				assigned = workersForExtractor(b.id);
			$("selection-detail").textContent =
				`${assigned}/1 robot · ${Math.floor(field?.amount || 0)} gazu · ${b.constructionLeft ? "budowa" : assigned ? "operator przydzielony" : "PPM robotem"}`;
		} else if (es.length === 1 && es[0].type === "depot")
			$("selection-detail").textContent = es[0].constructionLeft
				? "Magazyn w budowie"
				: "Punkt rozładunku rudy · badanie [L]";
		if (es.length === 1 && es[0].type === "workshop")
			$("selection-detail").textContent = es[0].constructionLeft
				? "Warsztat w budowie"
				: `${(es[0].repairTargets || []).length}/2 stanowiska · ${game.credits <= 0 ? "brak metalu" : `${Math.round(16 * game.power.factor)} PW/s na pojazd`} · 1 metal / 5 PW · pod ostrzałem ×¼`;
		if (es.length === 1 && es[0].type === "battery")
			$("selection-detail").textContent = es[0].constructionLeft
				? "Akumulator w budowie"
				: `${Math.floor(es[0].energy || 0)}/900 energii · ładowanie do 15/s · oddawanie do 30 mocy`;
		// Stage E: status of support buildings, units and modules.
		const one = es.length === 1 ? es[0] : null,
			support = RTS.SUPPORT;
		if (one?.type === "medbay")
			$("selection-detail").textContent = one.constructionLeft
				? "Punkt medyczny w budowie"
				: `${(one.healTargets || []).length}/${support.medbay.slots} stanowiska · ${support.medbay.rate} PW/s · zasięg ${support.medbay.range} · 1 metal / 8 PW`;
		if (one?.type === "shieldgen")
			$("selection-detail").textContent = one.constructionLeft
				? "Generator w budowie"
				: one.overload > 0
					? `Przeciążenie · tarcza wróci za ${Math.ceil(one.overload)} s`
					: `Tarcza ${Math.floor(one.shield || 0)}/${support.shield.capacity} · pochłania 70% w promieniu ${support.shield.range}`;
		if (one?.type === "salvageYard")
			$("selection-detail").textContent = one.constructionLeft
				? "Plac w budowie"
				: `${(game.wrecks || []).length} wraków na mapie · PPM robotem na wraku`;
		if (one?.type === "saboteur")
			$("selection-detail").textContent = `${one.stealth ? "Ukryci" : "WYKRYCI"} · ${(one.chargeReady || 0) > game.time ? "ładunek za " + Math.ceil(one.chargeReady - game.time) + " s" : "ładunek gotowy"} · PPM na wrogim budynku`;
		if (one?.type === "drone") $("selection-detail").textContent = `${Math.ceil(one.hp)} PW · zwiad z powietrza, widzi na ${support.drone.sight}`;
		if (one?.module && one.team === (game.viewer ?? 0))
			$("selection-detail").textContent += ` · ${RTS.MODULES[one.module].name}${one.moduleLeft > 0 ? " (montaż " + Math.ceil(one.moduleLeft) + " s)" : ""}`;
		if ($("orbital-strike")) {
			const uplink = one?.type === "uplink" && one.team === (game.viewer ?? 0) ? one : null;
			$("orbital-strike").hidden = !uplink;
			if (uplink) {
				const why = game.strikeRequirement(uplink.id);
				$("orbital-strike").disabled = !!why;
				$("orbital-strike").textContent = strikeMode ? "Wskaż cel (Esc — anuluj)" : why && /gotowe za/.test(why) ? why.replace("Uderzenie gotowe", "Uderzenie") : "Uderzenie orbitalne";
				$("orbital-strike").title = why || "Wskaż zbadany punkt na mapie. Po 3 s: do 420 obrażeń w promieniu 110 — tylko wrogom. Odnowienie 100 s.";
			}
		}
		if ($("module-a")) {
			const options = one && one.team === (game.viewer ?? 0) && !one.constructionLeft && !one.module ? game.moduleOptions(one) : [];
			[$("module-a"), $("module-b")].forEach((button, i) => {
				const option = options[i];
				button.hidden = !option;
				if (!option) return;
				button.textContent = "Moduł: " + option.name;
				button.title = `${option.effect} Koszt ${support.module.metal} metalu + ${support.module.gas} gazu, montaż ${support.module.install} s. Jeden moduł na budynek. ${game.moduleRequirement(one)}`;
				button.disabled = !!game.moduleRequirement(one);
			});
		}
		if (es.length === 1 && es[0].type === "hq" && es[0].team === (game.viewer ?? 0))
			$("selection-detail").textContent =
				`Centrum ${game.centerLevel()} — ${game.centerLevel() === 2 ? "Kolonia" : "Przyczółek · rozbudowa w BADANIA / F2"}${game.research?.kind === "colony" ? " · rozbudowa " + Math.floor(100 * (1 - game.research.left / game.research.total)) + "%" : ""}`;
		if ($("army-formation")) {
			for (const button of $("army-formation").querySelectorAll("button"))
				button.setAttribute("aria-checked", String(button.dataset.formation === (game.formation || "line")));
			const carrier = es.find(
				(e) => e.type === "transport" && e.team === (game.viewer ?? 0),
			);
			$("load-transport").hidden = !carrier;
			$("unload-transport").hidden = !carrier;
			$("load-transport").disabled =
				!carrier || (carrier.passengers || []).length >= 4;
			$("unload-transport").disabled =
				!carrier ||
				!es.some((e) => e.type === "transport" && e.passengers?.length);
			if (carrier && es.length === 1)
				$("selection-detail").textContent =
					`${Math.ceil(carrier.hp)} PW · załoga ${(carrier.passengers || []).length}/4 · PPM piechotą: załaduj`;
			const rows = game.combatReport([...selected]);
			$("army-inspector").innerHTML =
				'<h3>Wybrany oddział</h3><p class="eco-note">Parametry w obecnej pogodzie. Obrażenia przed premiami przeciw typom celów i ich osłonom; premie badań i frakcji uwzględnione. Porównaj typy, zaznaczając kilka jednostek.</p>' +
				rows
					.map(
						(r) =>
							`<article class="army-stat"><strong>${r.name} × ${r.count}</strong><p>${r.role}</p><dl><dt>Wytrzymałość</dt><dd>${r.hp} / ${r.maxHp}</dd><dt>Zasięg / trafienie</dt><dd>${r.range} / ${r.damage}</dd><dt>Odstęp strzałów</dt><dd>${r.cooldown} s</dd><dt>Ruch / celność</dt><dd>${r.speed} / ${r.accuracy}%</dd><dt>Cena jednostkowa</dt><dd>${r.cost || 0} metalu</dd>${r.type === "transport" ? `<dt>Załoga</dt><dd>${r.passengers} / ${r.count * 4}</dd>` : ""}${r.cover ? `<dt>W osłonie</dt><dd>${r.cover}</dd>` : ""}</dl></article>`,
					)
					.join("");
		}
		if ($("demolish"))
			$("demolish").hidden = !es.some(
				(e) => e.team === (game.viewer ?? 0) && !TYPES[e.type].speed && e.type !== "hq",
			);
		const chosen = selectedProducer(),
			displayQueue = chosen ? game.buildingQueue(chosen.id) : game.queue;
		const construction =
			game.entities.find(
				(e) => e.team === (game.viewer ?? 0) && e.constructionLeft && selected.has(e.id),
			) || game.entities.find((e) => e.team === (game.viewer ?? 0) && e.constructionLeft);
		const q =
			activeTab === "research"
				? game.research
				: activeTab === "build"
					? construction
						? {
								type: construction.type,
								left: construction.constructionLeft,
								total: TYPES[construction.type].construction,
							}
						: null
					: displayQueue[0];
		const productionBlocked =
			activeTab === "army" && q?.type && !game.get(q.producerId);
		$("queue-status").textContent = q
			? `${q.kind ? RESEARCH[q.kind].name.toUpperCase() : game.unitName(q.type).toUpperCase()} · ${productionBlocked ? "BRAK BUDYNKU" : Math.ceil(q.left) + " S"}${activeTab === "army" ? " · " + displayQueue.length : ""}`
			: "BRAK ZADAŃ";
		$("queue-progress").style.width = q
			? `${100 * (1 - q.left / q.total)}%`
			: "0%";
		const track = document.querySelector(".queue-track");
		track.setAttribute("role", "progressbar");
		track.setAttribute(
			"aria-label",
			activeTab === "build"
				? "Postęp budowy"
				: activeTab === "research"
					? "Postęp badań"
					: "Postęp produkcji",
		);
		track.setAttribute("aria-valuemin", "0");
		track.setAttribute("aria-valuemax", "100");
		track.setAttribute(
			"aria-valuenow",
			String(q ? Math.round(100 * (1 - q.left / q.total)) : 0),
		);
		document.querySelectorAll("[data-unit]").forEach((b) => {
			const type = b.dataset.unit,
				p = game.producer(type, preferredProducer(type)),
				requirement = game.developmentRequirement(type),
				locked = !p || !!requirement,
				full = p && game.buildingQueue(p.id).length >= 10;
			b.disabled =
				!started ||
				!!game.result ||
				game.credits < game.cost(type) ||
				locked ||
				full ||
				game.population(0) + game.queue.length >= 60;
			b.classList.toggle("locked", locked);
			b.querySelector("small").textContent = requirement
				? requirement
				: full
					? "Kolejka pełna"
					: !p
						? "Brak wolnego budynku"
						: `${game.entityName(p)} #${p.id}${p.module ? " · " + RTS.MODULES[p.module].name : ""}`;
		});
		document.querySelectorAll("[data-build]").forEach((b) => {
			b.disabled =
				!started ||
				!!game.result ||
				!!game.developmentRequirement(b.dataset.build) ||
				game.credits < game.cost(b.dataset.build) ||
				!game.units((game.viewer ?? 0)).some((e) => e.type === "worker");
			b.title =
				b.disabled && !game.units((game.viewer ?? 0)).some((e) => e.type === "worker")
					? "Potrzebny robot budowlany"
					: game.developmentRequirement(b.dataset.build) ||
						b.dataset.description;
			const status = b.querySelector(".card-status");
			if (status)
				status.textContent = game.developmentRequirement(
					b.dataset.build,
				);
		});
		document.querySelectorAll("[data-research]").forEach((b) => {
			const kind = b.dataset.research,
				availability = game.researchStatus(kind),
				status = availability.reason;
			const working = game.research?.kind === kind,
				done = working ? 1 - game.research.left / game.research.total : 0;
			b.disabled = !started || !availability.allowed;
			b.querySelector("small").textContent = working ? `${Math.floor(done * 100)}% · zostało ${Math.ceil(game.research.left)} s${game.power.factor < 1 ? " · tempo " + Math.round(game.power.factor * 100) + "%" : ""}` : status;
			b.title = b.dataset.description + " · " + status;
			b.dataset.state = availability.state;
			b.classList.toggle("is-complete", !!game.upgrades[kind]);
			b.classList.toggle("is-working", working);
			const bar = b.querySelector(".research-progress");
			if (bar) bar.style.width = `${working ? done * 100 : availability.state === "done" ? 100 : 0}%`;
		});
		// With no research under way, the research tab counts what has been researched.
		if (activeTab === "research" && !game.research) {
			const all = [...document.querySelectorAll("[data-research]")];
			$("queue-status").textContent = `ZBADANE ${all.filter((b) => b.dataset.state === "done").length} / ${all.length} · BRAK BADANIA`;
		}
		const workers = game.units((game.viewer ?? 0)).filter((e) => e.type === "worker");
		$("workers-status").textContent =
			`${workers.filter((e) => ["gather", "gas", "repair", "build", "salvage"].includes(e.order?.kind)).length} / ${workers.length}`;
		$("mined-status").textContent = Math.floor(game.mined);
		$("explored-status").textContent =
			`${Math.round((game.explored.filter(Boolean).length / game.explored.length) * 100)}%`;
		$("cancel-queue").title =
			activeTab === "research"
				? "Anuluj badanie — pełny zwrot wszystkich surowców"
				: "Anuluj ostatnią jednostkę i odzyskaj metal";
		$("gas").textContent = Math.floor(game.gas);
		$("crystals").textContent = Math.floor(game.crystals);
		const power = game.power;
		$("power").textContent =
			`${power.demand}/${power.supply}${power.discharge > 0 ? " +" + Math.round(power.discharge) : ""}`;
		$("power").classList.toggle("power-shortage", power.factor < 1);
		$("power").parentElement.title =
			`Zapotrzebowanie / moc. Tempo produkcji wojska i badań: ${Math.round(power.factor * 100)}%.`;
		$("power-warning").hidden = power.factor >= 1;
		$("power-warning").textContent =
			`NIEDOBÓR MOCY · tempo ${Math.round(power.factor * 100)}% · zbuduj reaktor [C]`;
		const modeText = game.modeStatus?.() || "";
		$("campaign-objectives").hidden =
			!MISSIONS[game.missionId].campaign && !modeText;
		if (game.act2) renderAct2Objectives();
		else
			$("campaign-objectives").textContent = modeText || campaignStatus();
		for (const id of ["obj-capture", "obj-army", "obj-hq"])
			$(id).hidden = game.missionId === "training" || !!game.act2;
		document.querySelector(".intel").hidden =
			game.missionId === "training" ||
			(!!game.act2 && !game.enemyBases().length);
		if (
			game.act2?.decision === "pending" &&
			started &&
			!finished &&
			!choiceOpen &&
			!menu?.active
		)
			showChoice();
		if (game.campaignDecision?.state === "pending" && started && !finished && !choiceOpen && !menu?.active) showDecision();
		$("idle-workers").textContent =
			`Bezczynne roboty: ${game.idleWorkers().length} [Z]`;
		$("idle-workers").disabled = !started || !game.idleWorkers().length;
		$("economy-tip").textContent =
			`Ładunek: ${game.cargoCapacity} rudy lub kryształów. PPM na ekstraktorze: przydziel jednego robota. Gaz: 2/s podczas pracy.`;
		$("cancel-queue").disabled =
			activeTab === "build"
				? true
				: activeTab === "research"
					? !game.research
					: !displayQueue.length;
		$("save-game").disabled = !started;
		updateCommandHud();
		$("pause").textContent = paused ? "▶" : "Ⅱ";
		$("pause").setAttribute("aria-label", "Otwórz menu pauzy");
		$("pause").title = "Menu pauzy [Esc]";
		if (game.network);
		else if (game.aiActive?.())
			$("intel-text").textContent = game.wave
				? `Atak ${game.wave} wykryty. Przeciwnik ma własne roboty i koszary — zniszczenie jego robotów i fabryk osłabi kolejne ataki.`
				: "Przeciwnik rozbudowuje bazę i wydobywa rudę. Atak nastąpi, gdy zbierze wystarczające siły.";
		else if (game.wave)
			$("intel-text").textContent =
				`Desant ${game.wave} wykryty. Rakietowcy są skuteczni przeciw pancerzowi i wrogim budynkom.`;
		if (game.events.length) toast(game.events.splice(0).at(-1));
		if (game.result && !finished) {
			finished = true;
			showEnd();
		}
	}
	// The victory / defeat screen: the banner, the styling of the report, numbers counting up and the animated
	// backdrop (end-screen.js) under it.
	function decorateEnd(victory) {
		const box = $("overlay").querySelector(".briefing");
		if (!box) return;
		box.classList.add("end-report", victory ? "victory" : "defeat");
		$("overlay").classList.add("end-overlay");
		const banner = document.createElement("div");
		banner.className = "end-banner";
		banner.innerHTML = `<span>${victory ? "ZWYCIĘSTWO" : "PORAŻKA"}</span>`;
		box.prepend(banner);
		if (typeof EndScreen === "undefined") return;
		EndScreen.countUp(box, !!menu?.reduced);
		const m = MISSIONS[game.missionId] || {};
		EndScreen.mount($("overlay"), { victory, biome: m.biome, reduced: !!menu?.reduced });
	}
	// The epilogue of an act (epilogue-films.js) at the top of the report: it plays once and stops on its last
	// shot (the title), with a button to play it again.
	function showEpilogue() {
		const f = Epilogues.film(game.missionId, game),
			box = $("overlay").querySelector(".briefing");
		if (!f || !box) return;
		box.classList.add("with-epilogue");
		const wrap = document.createElement("div");
		wrap.className = "epilogue-film";
		wrap.innerHTML = `<span class="eyebrow">${f.title.toUpperCase()}</span><canvas width="960" height="400" aria-label="${f.title}"></canvas><p class="epilogue-caption" aria-live="polite"></p><button type="button" class="epilogue-replay">Odtwórz epilog ponownie ↺</button>`;
		box.insertBefore(wrap, box.firstChild);
		const canvas = wrap.querySelector("canvas"),
			caption = wrap.querySelector("p"),
			c = canvas.getContext("2d"),
			reduced = !!menu?.reduced,
			end = f.duration - 0.5;
		canvas.width = 1920;
		canvas.height = 800;
		c.scale(2, 2);
		let start = performance.now(),
			last = -1,
			running = false;
		const frame = (now) => {
			if (!canvas.isConnected) return (running = false);
			const t = Math.min(end, (now - start) / 1000),
				shot = f.draw(c, t, reduced);
			if (shot.scene !== last) {
				caption.textContent = shot.caption;
				last = shot.scene;
			}
			if (t < end) requestAnimationFrame(frame);
			else running = false;
		};
		const play = () => {
			start = performance.now();
			last = -1;
			if (!running) {
				running = true;
				requestAnimationFrame(frame);
			}
		};
		wrap.querySelector("button").onclick = play;
		play();
		sound.setMusicMode("intro");
	}
	function showChoice() {
		choiceOpen = true;
		paused = true;
		$("overlay").hidden = false;
		$("overlay").innerHTML =
			`<div class="briefing act2-choice"><span class="eyebrow">DECYZJA DOWÓDCY / SERCE POPIOŁU</span><h2>Zniszczyć<br>czy odłączyć?</h2><p>Węzły sterujące są w twoich rękach. Tej decyzji nie można cofnąć; zmienia przebieg misji, premię i epilog.</p><button id="choose-destroy" class="primary-button"><b>ZNISZCZ INSTALACJĘ</b><small>Przeciążenie za 20 s niszczy wszystko w promieniu 380. Wieże Dominium tracą 50% PW, odzysk 400 metalu. Cel dodatkowy: bez strat od wybuchu.</small></button><button id="choose-evacuate" class="primary-button"><b>ODŁĄCZ I EWAKUUJ PERSONEL</b><small>Sześcioro techników musi dotrzeć na lądowisko — co najmniej czworo. Pajęczaki wpadną w szał. Premia: plany pancerza kompozytowego. Cel dodatkowy: ocal wszystkich.</small></button></div>`;
		for (const kind of ["destroy", "evacuate"])
			$("choose-" + kind).onclick = () => {
				game.act2Choose(kind);
				choiceOpen = false;
				$("overlay").hidden = true;
				paused = false;
				updateHud();
			};
		$("choose-destroy").focus();
	}
	// A story decision of the campaign (campaign-choices.js): two options, the game paused until one is taken.
	function showDecision() {
		const D = game.campaignDecisionInfo();
		if (!D) return;
		choiceOpen = true;
		paused = true;
		$("overlay").hidden = false;
		const keys = Object.keys(D.options);
		$("overlay").innerHTML = `<div class="briefing act2-choice"><span class="eyebrow">${D.eyebrow}</span><h2>${D.title}</h2><p>${D.prompt} Tej decyzji nie można cofnąć.</p>${keys.map((k) => `<button id="decide-${k}" class="primary-button"><b>${D.options[k].label}</b><small>${D.options[k].text}</small></button>`).join("")}</div>`;
		for (const k of keys)
			$("decide-" + k).onclick = () => {
				game.decideCampaign(k);
				choiceOpen = false;
				$("overlay").hidden = true;
				paused = false;
				updateHud();
			};
		$("decide-" + keys[0]).focus();
	}
	function renderAct2Objectives() {
		const speakers = RTS.ACT2_SPEAKERS,
			line = game.act2.radio.at(-1),
			key = JSON.stringify([
				game.act2Objectives(),
				line,
				game.missionId === "colony5" && game.convoyStatus(),
			]);
		if (key === act2Signature) return;
		act2Signature = key;
		$("campaign-objectives").innerHTML =
			`<ul class="act2-objectives">${game
				.act2Objectives()
				.map(
					(o) =>
						`<li class="${o.done ? "done" : o.failed ? "failed" : ""}${o.secondary ? " secondary" : ""}">${o.text}</li>`,
				)
				.join("")}</ul>` +
			(game.missionId === "colony5"
				? `<p class="act2-status">${game.convoyStatus()}</p>`
				: "") +
			(line
				? `<p class="act2-line">${typeof Portraits !== "undefined" && Portraits.known(line.who) ? `<img class="act2-face" src="${Portraits.still(line.who, 34)}" alt="">` : ""}<b style="color:${speakers[line.who]?.color || "#c5d7d9"}">${speakers[line.who]?.name || line.who}:</b> ${line.text}</p>`
				: "");
	}
	function act2Report(victory) {
		const r = game.act2Summary(),
			speakers = RTS.ACT2_SPEAKERS;
		return `<ul class="act2-objectives">${r.objectives.map((o) => `<li class="${o.done ? "done" : o.failed ? "failed" : ""}${o.secondary ? " secondary" : ""}">${o.text}</li>`).join("")}</ul><div class="briefing-controls act2-summary"><span><b>${timeLabel(r.time)}</b>Czas operacji</span><span><b>${r.kills}</b>Zniszczonych celów</span><span><b>${r.losses}</b>Utraconych jednostek</span><span><b>${Math.round(r.lostValue)}</b>Metalu w stratach</span><span><b>${r.secondary ? "◆ zdobyta" : "—"}</b>Odznaka celu dodatkowego</span><span><b>${r.bonus === 200 ? "+200 metalu" : r.bonus === "salvage" ? "odzysk 400 metalu" : r.bonus === "armor" ? "pancerz kompozytowy" : r.bonus === "weapons" ? "broń plazmowa" : r.bonus === "metal" ? "300 metalu" : "—"}</b>Premia</span></div>${victory && r.secondary && !["colony6", "colony9"].includes(game.missionId) ? "<p>Odznaka da +200 metalu na start następnego rozdziału.</p>" : ""}`;
	}
	// Battle chat (network): recent lines over the battlefield, a line opened with Enter.
	const CHAT_SHOW = 15;
	let chatLog = [],
		chatBox = null;
	function chatHud() {
		if (chatBox) return chatBox;
		chatBox = document.createElement("div");
		chatBox.className = "battle-chat";
		chatBox.innerHTML = '<ol class="battle-chat-log" aria-live="polite" aria-label="Czat"></ol><input class="battle-chat-input" maxlength="200" autocomplete="off" aria-label="Wiadomość" hidden>';
		$("battlefield").append(chatBox);
		const input = chatBox.querySelector("input");
		input.addEventListener("keydown", (e) => {
			// The game's own shortcuts never see the keys typed here.
			e.stopPropagation();
			if (e.key === "Enter") {
				e.preventDefault();
				const text = NetPlay.sendChat(netSession?.link, input.value);
				if (text) addChat(game.players[game.viewer], text, true);
				closeChat();
			} else if (e.key === "Escape") {
				e.preventDefault();
				closeChat();
			}
		});
		input.addEventListener("blur", () => closeChat(false));
		return chatBox;
	}
	function addChat(player, text, mine = false) {
		chatLog.push({ name: player?.name || "Gracz", color: player?.color || "#cfe6df", text, mine, at: performance.now() });
		if (chatLog.length > 50) chatLog.shift();
		renderChat();
	}
	function openChat() {
		const input = chatHud().querySelector("input");
		input.hidden = false;
		input.placeholder = `Wiadomość do: ${game.players[1 - game.viewer].name} · Enter wysyła, Esc zamyka`;
		input.focus();
		renderChat();
	}
	function closeChat(blur = true) {
		const input = chatBox?.querySelector("input");
		if (!input || input.hidden) return;
		input.value = "";
		input.hidden = true;
		if (blur) input.blur();
		renderChat();
	}
	// The last lines: those of the last 15 s, or all recent ones while typing.
	function renderChat() {
		if (!chatBox) return;
		const typing = !chatBox.querySelector("input").hidden,
			now = performance.now(),
			shown = chatLog.filter((e) => typing || now - e.at < CHAT_SHOW * 1000).slice(-6),
			log = chatBox.querySelector("ol"),
			key = shown.map((e) => e.at).join() + typing;
		chatBox.hidden = !netSession && !typing;
		if (log.dataset.key === key) return;
		log.dataset.key = key;
		log.replaceChildren(
			...shown.map((e) => {
				const li = document.createElement("li"),
					who = document.createElement("b");
				who.textContent = e.name + ": ";
				who.style.color = e.color;
				li.append(who, document.createTextNode(e.text));
				if (e.mine) li.className = "mine";
				return li;
			}),
		);
	}
	// Tactical intel in a network battle: the opponent, the relays, the connection and the pauses left.
	function networkIntel() {
		const me = game.viewer,
			other = game.players[1 - me],
			ping = netSession?.ping,
			nodes = game.nodes.length,
			mine = game.nodes.filter((n) => n.owner === me).length,
			theirs = game.nodes.filter((n) => n.owner === 1 - me).length;
		$("wave").previousElementSibling.textContent = "Opóźnienie sieci";
		$("wave").textContent = ping != null ? ping + " ms" : "—";
		// The bar: the share of relays held (yours against the opponent's).
		$("wave-progress").style.width = `${nodes ? (100 * mine) / nodes : 0}%`;
		$("intel-text").textContent =
			`Przeciwnik: ${other.name} (${game.factionFor(1 - me)?.name || "frakcja nieznana"}). Przekaźniki: Twoje ${mine}, przeciwnika ${theirs} z ${nodes}. ` +
			`Zniszcz jego centrum dowodzenia. Wspólna pauza [Spacja]: zostało ${game.pausesLeft?.[me] ?? 0} z ${RTS.NET_PAUSE.count}.`;
	}
	// Shared pause (network): a request goes to both players as an ordinary action.
	function sharedPause() {
		if (!netSession || !started || finished) return;
		const pause = game.netPause,
			me = game.viewer;
		if (pause) {
			if (pause.resumeIn === null) {
				act("resumeGame");
				toast("Wznawiam grę…");
			}
			return;
		}
		if ((game.pausesLeft?.[me] ?? 0) <= 0) {
			toast(`Wykorzystano wszystkie pauzy (${RTS.NET_PAUSE.count}).`);
			return;
		}
		act("pauseGame");
	}
	let pauseBox = null,
		pauseSeen = null;
	function renderSharedPause() {
		const pause = netSession && started && !finished ? game.netPause : null;
		if (!pause && !pauseBox) return;
		if (!pauseBox) {
			pauseBox = document.createElement("div");
			pauseBox.className = "net-pause";
			pauseBox.setAttribute("role", "status");
			pauseBox.innerHTML = '<span class="eyebrow">WSPÓLNA PAUZA</span><strong></strong><p></p><button type="button" class="net-pause-resume">Wznów grę [Spacja]</button>';
			pauseBox.querySelector("button").onclick = sharedPause;
			$("battlefield").append(pauseBox);
		}
		// A pause began or ended: say who did it.
		const key = pause ? pause.by + ":" + (pause.resumeIn === null) : null;
		if (key !== pauseSeen) {
			if (pause && pause.resumeIn === null) {
				toast(`${game.players[pause.by].name} zatrzymuje grę.`);
				sound.play("radio");
			} else if (pause && pauseSeen) toast(pause.resumedBy != null ? `${game.players[pause.resumedBy].name} wznawia grę.` : "Koniec czasu pauzy.");
			pauseSeen = key;
		}
		pauseBox.hidden = !pause;
		if (!pause) return;
		const me = game.viewer,
			counting = pause.resumeIn !== null;
		pauseBox.classList.toggle("counting", counting);
		pauseBox.querySelector("strong").textContent = counting ? `Wznowienie za ${Math.max(1, Math.ceil(pause.resumeIn))}…` : pause.by === me ? "Twoja pauza" : `Pauza gracza ${game.players[pause.by].name}`;
		pauseBox.querySelector("p").textContent = counting
			? "Przygotuj się — bitwa zaraz rusza."
			: `Gra ruszy sama za ${Math.ceil(pause.left)} s. Rozkazy wydane teraz wykonają się po wznowieniu. Twoje pauzy: ${game.pausesLeft[me]} z ${RTS.NET_PAUSE.count}.`;
		pauseBox.querySelector("button").hidden = counting;
	}
	// Network battle: start, end of the session (leave, lost connection, desync), rematch.
	// netLink: the connection to the other player; it outlives a battle (the end screen offers a rematch on it).
	let netLink = null,
		netLast = null,
		rematch = null;
	const hookedLinks = new WeakSet();
	// Listeners of the application on a link, once per connection: chat, rematch, the other player leaving.
	function hookLink(link) {
		if (hookedLinks.has(link)) return;
		hookedLinks.add(link);
		link.on("message", (msg) => {
			if (link !== netLink) return;
			if (msg.k === "chat") {
				const text = NetPlay.chatText(msg.text);
				if (!text || !netSession) return;
				addChat(game.players[1 - game.viewer], text);
				sound.play("radio");
			} else if (msg.k === "rematch" && rematch) {
				rematch.theirs = true;
				if (!rematch.mine) {
					toast(`${game.players[1 - game.viewer].name} proponuje rewanż.`);
					sound.play("radio");
				}
				tryRematch();
			} else if (msg.k === "rematch-start" && rematch && netLast.team === 1 && Number.isInteger(msg.seed) && msg.seed > 0 && msg.seed < 2 ** 32)
				// The guest takes the host's new seed; everything else stays as agreed in the lobby.
				startNetwork({ link, team: 1, settings: { ...netLast.settings, seed: msg.seed } });
		});
		link.on("close", () => {
			if (link !== netLink || !rematch) return;
			rematch.gone = true;
			renderRematch();
		});
	}
	// Both players asked for a rematch: the host picks a new map seed and starts; the guest follows its message.
	function tryRematch() {
		renderRematch();
		if (!rematch?.mine || !rematch.theirs || netLast.team !== 0 || !netLink?.open) return;
		const seed = RTS.randomSeed();
		netLink.send({ k: "rematch-start", seed });
		startNetwork({ link: netLink, team: 0, settings: { ...netLast.settings, seed } });
	}
	function askRematch() {
		if (!rematch || rematch.mine || rematch.gone || !netLink?.open) return;
		rematch.mine = true;
		netLink.send({ k: "rematch" });
		tryRematch();
	}
	function renderRematch() {
		const button = $("rematch"),
			status = $("rematch-status");
		if (!button || !rematch) return;
		const other = game.players[1 - game.viewer].name;
		button.disabled = rematch.gone || rematch.mine;
		button.firstChild.textContent = rematch.gone ? "REWANŻ NIEMOŻLIWY " : rematch.mine ? "CZEKAM NA ZGODĘ… " : rematch.theirs ? "PRZYJMIJ REWANŻ " : "REWANŻ ";
		status.textContent = rematch.gone
			? `${other} opuszcza grę — rewanż jest niemożliwy.`
			: rematch.mine
				? `Propozycja wysłana. Czekam na odpowiedź gracza ${other}.`
				: rematch.theirs
					? `${other} proponuje rewanż — te same zasady i frakcje, nowy układ mapy.`
					: "Rewanż: te same zasady i frakcje, nowy układ mapy. Obaj gracze muszą się zgodzić.";
		status.classList.toggle("rematch-offer", !!rematch.theirs && !rematch.mine && !rematch.gone);
	}
	function startNetwork({ link, team, settings }) {
		// A rematch reuses the connection: only the finished battle ends.
		const again = link === netLink;
		endNetwork(again);
		netLink = link;
		netLast = { team, settings };
		rematch = null;
		hookLink(link);
		const prepared = RTS.createNetworkGame(settings);
		prepared.viewer = team;
		netSession = new NetPlay.Lockstep(prepared, team, link, {
			onDesync: () => networkOver("Rozsynchronizowanie gry", "Symulacje obu graczy przestały się zgadzać — bitwa została przerwana. Zgłoś to twórcy gry (mapa, frakcje, co działo się tuż przed)."),
			onClose: () => networkOver("Połączenie zerwane", "Drugi gracz opuścił bitwę albo połączenie zostało przerwane."),
			pump: advanceHidden,
		});
		// The lobby conversation continues in the battle (and from one battle to its rematch).
		if (!again) chatLog = (menu.net?.chat || []).slice(-6).map((e) => ({ ...e, at: performance.now() }));
		chatHud().hidden = false;
		menu.hide();
		restart(prepared.missionId, null, prepared);
		toast(`${again ? "Rewanż" : "Bitwa sieciowa"}: ${game.players[0].name} kontra ${game.players[1].name}. Zniszcz centrum dowodzenia przeciwnika.`);
	}
	// keepLink: the battle ends but the connection stays (end screen with a rematch, or the rematch itself).
	function endNetwork(keepLink = false) {
		closeChat();
		if (chatBox) chatBox.hidden = true;
		if (pauseBox) pauseBox.hidden = true;
		pauseSeen = null;
		if (netSession) {
			netSession.stop();
			netSession = null;
		}
		if (keepLink) return;
		rematch = null;
		if (netLink) {
			netLink.close();
			netLink = null;
		}
		if (menu?.net) menu.net = null;
	}
	function networkOver(title, text) {
		if (!netSession || finished) {
			endNetwork();
			return;
		}
		finished = true;
		endNetwork();
		$("overlay").hidden = false;
		$("overlay").innerHTML = `<div class="briefing"><span class="eyebrow">GRA WIELOOSOBOWA / ${timeLabel(game.time)}</span><div class="briefing-symbol">⌁</div><h2>${title}</h2><p>${text}</p><button id="end-menu" class="primary-button">MENU GŁÓWNE <span>↗</span></button></div>`;
		$("end-menu").onclick = () => {
			started = false;
			menu.show("home");
		};
	}
	function showEnd() {
		const victory = (game.resultFor?.() ?? game.result) === "victory";
		if (netSession) {
			const me = game.viewer,
				other = game.players[1 - me];
			$("overlay").hidden = false;
			$("overlay").innerHTML = `<div class="briefing"><span class="eyebrow">GRA WIELOOSOBOWA / ${timeLabel(game.time)}</span><div class="briefing-symbol">${victory ? "◈" : "⌁"}</div><h2>${victory ? "Zwycięstwo." : "Porażka."}</h2><p>${victory ? `Centrum dowodzenia gracza ${other.name} zniszczone.` : `${other.name} zniszczył Twoje centrum dowodzenia.`}</p><div class="briefing-controls"><span><b>${game.sideOf(me).kills}</b>Twoje zniszczone cele</span><span><b>${game.sideOf(1 - me).kills}</b>Cele zniszczone przez przeciwnika</span><span><b>${game.nodes.filter((n) => n.owner === me).length} / ${game.nodes.length}</b>Twoje przekaźniki</span></div><p id="rematch-status" class="rematch-status" role="status"></p><button id="rematch" class="primary-button">REWANŻ <span>↻</span></button><button id="end-menu" class="primary-button end-secondary">MENU GŁÓWNE <span>↗</span></button></div>`;
			// The connection stays for a rematch; the lockstep stops a moment later (the other computer still gets
			// the last turn).
			const ended = netSession;
			setTimeout(() => {
				if (netSession === ended) endNetwork(true);
			}, 1500);
			decorateEnd(victory);
			rematch = { mine: false, theirs: false, gone: !netLink?.open };
			renderRematch();
			$("rematch").onclick = askRematch;
			$("end-menu").onclick = () => {
				endNetwork();
				started = false;
				menu.show("home");
			};
			return;
		}
		// Survival keeps the best time per map and level.
		let modeText = game.modeResult?.() || null;
		if (modeText && game.modeState?.mode === "survival" && RTS.recordSurvival) {
			const r = RTS.recordSurvival(audioStorage, game);
			modeText += r.isNew ? " Nowy rekord!" : ` Rekord: ${timeLabel(r.best.time)}, fala ${r.best.wave}.`;
		}
		const campaignSaved =
			MISSIONS[game.missionId].campaign && victory
				? campaign.record(game)
				: true;
		saveGame(true);
		$("overlay").hidden = false;
		if (game.act2) {
			$("overlay").innerHTML =
				`<div class="briefing act2-report"><span class="eyebrow">RAPORT Z OPERACJI / ${MISSIONS[game.missionId].name}</span><div class="briefing-symbol">${victory ? "◈" : "⌁"}</div><h2>${victory ? (game.missionId === "colony6" ? "Koniec<br>aktu II." : game.missionId === "colony9" ? "Koniec<br>aktu III." : "Rozdział<br>ukończony.") : "Misja<br>nieudana."}</h2><p>${victory ? game.act2Epilogue() + " " + (campaignSaved ? "Postęp kampanii zapisano." : "Nie można zapisać postępu kampanii na tym urządzeniu.") : game.act2.failReason || "Centrum dowodzenia zostało zniszczone. Odbuduj siły i spróbuj ponownie."}</p>${act2Report(victory)}<button id="play-again" class="primary-button">NOWA OPERACJA <span>↗</span></button></div>`;
			if (!victory) {
				const retry = document.createElement("button");
				retry.className = "primary-button";
				retry.textContent = "SPRÓBUJ PONOWNIE →";
				retry.onclick = () => {
					menu.selectedMission = game.missionId;
					menu.missionOrigin = "campaign";
					menu.show("briefing");
				};
				$("overlay").querySelector(".briefing").append(retry);
			}
		} else
			$("overlay").innerHTML =
				`<div class="briefing"><span class="eyebrow">RAPORT Z OPERACJI / ${timeLabel(game.time)}</span><div class="briefing-symbol">${victory ? "◈" : "⌁"}</div><h2>${victory ? "Sektor<br>odzyskany." : "Utraciliśmy<br>przyczółek."}</h2><p>${victory ? (MISSIONS[game.missionId].campaign ? { training: "Poligon zaliczony. Załoga potrafi rozwijać kolonię, podtrzymać sieć i naprawić pojazdy. ", colony1: "Latarnia Eos znów nadaje. Lira odczytała współrzędne archiwum na Vesperze. Konwój wyrusza po klucz do sieci. ", colony2: "Archiwum ujawniło plan blokady. Klucz jest bezpieczny; teraz flota może dotrzeć do centralnego węzła na Nadirze. ", colony3: "Węzeł Nadir odzyskany. Lira uruchamia sieć, latarnie rozbłyskują jedna po drugiej, a transporty pomocy ruszają ku Koloniom. Nadszedł Odzyskany Świt. " }[game.missionId] + (campaignSaved ? "Postęp kampanii zapisano." : "Nie można zapisać postępu kampanii na tym urządzeniu.") : modeText || "Operacja " + MISSIONS[game.missionId].name + " zakończona zwycięstwem.") : modeText || "Centrum dowodzenia zostało zniszczone. Odbuduj siły i spróbuj ponownie."}</p><div class="briefing-controls"><span><b>${timeLabel(game.time)}</b>Czas operacji</span><span><b>${game.kills}</b>Zniszczonych celów</span><span><b>${game.nodes.filter((n) => n.owner === (game.viewer ?? 0)).length} / ${game.nodes.length}</b>Przekaźników pod kontrolą</span><span><b>${Math.round(game.mined || 0)}</b>Wydobytego metalu</span><span><b>${game.units(game.viewer ?? 0).filter((e) => e.type !== "worker").length}</b>Jednostek na koniec</span></div><button id="play-again" class="primary-button">NOWA OPERACJA <span>↗</span></button></div>`;
		// The end of an act: its epilogue film over the report.
		if (victory && typeof Epilogues !== "undefined" && Epilogues.has(game.missionId)) showEpilogue();
		decorateEnd(victory);
		const nextChapter = {
			training: "colony1",
			colony1: "colony2",
			colony2: "colony3",
			colony3: "colony4",
			colony4: "colony5",
			colony5: "colony6",
		}[game.missionId];
		if (victory && MISSIONS[game.missionId].campaign && nextChapter) {
			const button = document.createElement("button");
			button.className = "primary-button";
			button.textContent =
				nextChapter === "colony4"
					? "AKT II: CENA ŚWITU →"
					: "NASTĘPNY ROZDZIAŁ →";
			button.onclick = () => {
				menu.selectedMission = nextChapter;
				menu.missionOrigin = "campaign";
				if (nextChapter === "colony4" && !campaign.completed.colony4) {
					menu.afterIntro2 = "briefing";
					menu.act2IntroSeen = true;
					menu.show("intro2");
				} else menu.show("briefing");
			};
			$("overlay").querySelector(".briefing").append(button);
		}
		$("play-again").onclick = () => {
			menu.origin = "home";
			menu.show("single");
		};
		$("overlay")
			.querySelector(".briefing")
			.insertAdjacentHTML(
				"beforeend",
				'<button id="end-menu" class="resume-button">MENU GŁÓWNE</button>',
			);
		$("end-menu").onclick = () => {
			saveGame(true);
			started = false;
			menu.show("home");
		};
	}
	function campaignStatus() {
		if (game.missionId === "training") return game.trainingStatus();
		const nodes = game.nodes.filter((n) => n.owner === (game.viewer ?? 0)).length;
		const detail =
			game.missionId === "colony2"
				? `Magazyny ${game.entities.filter((e) => e.team === (game.viewer ?? 0) && e.type === "depot" && e.hp > 0 && !e.constructionLeft).length}/2`
				: game.missionId === "colony3"
					? `Ciężka maszyna ${game.ready("heavy") ? "✓" : "—"} · artyleria ${game.ready("artillery") ? "✓" : "—"}`
					: `Reaktor ${game.ready("reactor") ? "✓" : "—"} · laboratorium ${game.ready("lab") ? "✓" : "—"}`;
		return `Przekaźniki ${nodes}/${game.missionId === "colony3" ? game.nodes.length : 2} · ${detail} · Centrum wroga ${game.hq(1) ? "pozostaje" : "zniszczone"}`;
	}
	function missionLabels() {
		const m = MISSIONS[game.missionId];
		document.querySelector(".mission-heading").innerHTML =
			`<span class="live-dot"></span><span>${m.name.toUpperCase()}<small>${m.planet} · ${m.campaign ? "Kampania Wolnych Kolonii" : "Operacja niezależna"}</small></span>`;
		document.querySelector(".operation-card h1").textContent = m.training
			? "Próba kolonii"
			: m.act === 2
				? "Cena świtu"
				: m.act === 3
					? "Przebudzenie Roju"
					: m.campaign
					? "Odzyskany Świt"
					: "Przejmij pogranicze.";
		document.querySelector(".planet-tag").textContent =
			m.planet + " · RTS / 2D";
		document.querySelector(".map-heading>span:nth-child(2)").textContent =
			m.name + " / " + m.planet;
		document.querySelector(".operation-card p").textContent =
			(game.scenario && !m.campaign ? game.modeObjective() : m.objective) +
			(game.scenario && !m.campaign
				? " · " +
					game.scenario.name +
					" / " +
					RTS.FACTIONS[game.scenario.faction].name +
					" · " +
					(game.scenario.teams === "duo"
						? "2 na 2 z sojusznikiem"
						: game.scenario.players + " graczy") +
					" · " +
					RTS.MODES[game.mode()].name +
					" · mapa " +
					RTS.MAP_SIZES[game.mapSize()].name.toLowerCase()
				: "");
	}
	function start() {
		started = true;
		paused = false;
		$("overlay").hidden = true;
		sound.setMusicMode(musicModeFor(game));
		toast(
			game.act2
				? game.act2Status()
				: game.missionId === "training"
					? game.trainingStatus()
					: "Roboty wydobywają rudę. Rozwiń centrum do Kolonii, zbuduj fabrykę i wyślij zwiad do AUREK.",
		);
		sound.play("start");
		updateHud();
		saveGame(true);
	}
	function restart(missionId = "horizon", scenario = null, prepared = null) {
		if (!prepared) endNetwork();
		game = prepared || new Game(42, missionId);
		if (scenario && !prepared) game.configureSkirmish(scenario);
		// The campaign difficulty: the commander AI in its chapters and the enemy's strength.
		if (!prepared) game.applyCampaignLevel?.(campaign.difficulty);
		game.applyAct2Bonus?.(campaign.badges);
		// Act III: the consequences of the act II decision (Hefajstos).
		game.applyCampaignChoices?.(campaign.choices);
		choiceOpen = false;
		$("overlay").classList.remove("end-overlay");
		act2Signature = "";
		for (let t = 0; t < colors.length; t++) colors[t] = game.colorFor(t);
		productionSignature = "";
		deck(activeTab);
		selected = new Set(
			game
				.units((game.viewer ?? 0))
				.filter((e) => e.type !== "worker")
				.map((e) => e.id),
		);
		finished = false;
		building = false;
		wallDrag = null;
		attackMode = false;
		autosaveClock = 0;
		$("placement").hidden = true;
		camera = {
			x: game.hq((game.viewer ?? 0)).x + (game.hq((game.viewer ?? 0)).x < W / 2 ? 150 : -150),
			y: game.hq((game.viewer ?? 0)).y,
			zoom: 3.8,
		};
		missionLabels();
		terrainTexture();
		fit();
		start();
	}
	// The loading screen (loading-screen.js) over the start of a mission: shown first, the mission built two frames
	// later (so the screen is painted), held until the board has drawn its first frames.
	function launchWithScreen(missionId = "horizon", scenario = null, prepared = null) {
		if (typeof LoadingScreen === "undefined" || prepared) return restart(missionId, scenario, prepared);
		const m = MISSIONS[missionId] || {},
			screen = LoadingScreen.show({
				eyebrow: m.training ? "SZKOLENIE WOLNYCH KOLONII" : m.campaign ? "KAMPANIA · ODZYSKANY ŚWIT" : "OPERACJA NIEZALEŻNA",
				title: m.name,
				planet: m.planet,
				// The orbital battle arrives at the gas giant (loading-screen.js "space").
				biome: m.space ? "space" : m.biome,
				reduced: !!menu?.reduced,
			});
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				try {
					restart(missionId, scenario, prepared);
				} finally {
					afterFrames(3, () => screen.done());
				}
			}),
		);
	}
	// Loading a save: the screen covers the board being rebuilt.
	function loadWithScreen(key) {
		const ok = loadGame(key);
		if (ok && typeof LoadingScreen !== "undefined") {
			const m = MISSIONS[game.missionId] || {},
				screen = LoadingScreen.show({ eyebrow: "WCZYTANY ZAPIS · " + timeLabel(game.time), title: m.name, planet: m.planet, biome: m.space ? "space" : m.biome, reduced: !!menu?.reduced, minTime: 1.2 });
			afterFrames(3, () => screen.done());
		}
		return ok;
	}
	function afterFrames(n, fn) {
		if (n <= 0) return fn();
		requestAnimationFrame(() => afterFrames(n - 1, fn));
	}
	function togglePause() {
		if (!started || finished) return;
		if (netSession) {
			sharedPause();
			return;
		}
		paused = !paused;
		if (paused) sound.silence();
		toast(
			paused
				? "Pauza taktyczna — możesz wydawać rozkazy."
				: "Operacja wznowiona.",
		);
		updateHud();
	}
	function selectAll() {
		selected = new Set(
			game
				.units((game.viewer ?? 0))
				.filter((e) => e.type !== "worker")
				.map((e) => e.id),
		);
		updateHud();
	}
	function economyAction(action) {
		if (!started) return;
		if (action.trade) {
			act("trade", ...action.trade);
			economyPanel.lastRefresh = -Infinity;
			updateHud();
			return;
		}
		if (action.role) {
			const ids = game.economyReport().roles[action.role] || [];
			selected = new Set(ids);
			const first = game.get(ids[0]);
			if (first) {
				camera.x = first.x;
				camera.y = first.y;
				camera.zoom = Math.max(1.8, camera.zoom);
				fit();
			}
		} else if (game.isVisible(action.x, action.y)) {
			camera.x = action.x;
			camera.y = action.y;
			camera.zoom = Math.max(1.8, camera.zoom);
			fit();
		} else toast("Złoże jest obecnie poza widocznym terenem.");
		updateHud();
	}
	function selectIdle() {
		const workers = game.idleWorkers();
		selected = new Set(workers.map((e) => e.id));
		if (workers[0]) {
			camera.x = workers[0].x;
			camera.y = workers[0].y;
			camera.zoom = Math.max(1.8, camera.zoom);
			fit();
		}
		updateHud();
	}
	function selectWorkers() {
		selected = new Set(
			game
				.units((game.viewer ?? 0))
				.filter((e) => e.type === "worker")
				.map((e) => e.id),
		);
		toast(
			"Roboty: PPM na rudzie — wydobycie; na uszkodzonym sojuszniku — naprawa.",
		);
		updateHud();
	}
	function buy(type) {
		if (!started || finished) return;
		// In space the keys of the ground classes order the ships of the same class (space-rules.js).
		if (game.space) type = { trooper: "corvette", rocket: "frigate", tank: "lancer", heavy: "cruiser" }[type] || type;
		act("enqueue", type, preferredProducer(type));
		updateHud();
	}
	function zoom(factor) {
		camera.zoom = clamp(camera.zoom * factor, 1, 5.5);
		fit();
	}
	// team: 0 = the viewer's own entities, 1 = hostile ones.
	function at(p, team) {
		return game.entities
			.filter(
				(e) =>
					(team === 1
						? e.team !== (game.viewer ?? 0) && !game.allied?.((game.viewer ?? 0), e.team)
						: e.team === (game.viewer ?? 0)) &&
					(team === 0 || game.isVisible(e.x, e.y)) &&
					dist(p, e) <
						Math.max(TYPES[e.type].radius + 10, 16 / scale),
			)
			.sort((a, b) => dist(a, p) - dist(b, p))[0];
	}
	function saveGame(silent = false, key = SAVE_KEY) {
		if (!started) return false;
		// A network battle is never saved — also after it ended or the connection dropped (then netSession is gone,
		// but leaving the page would otherwise overwrite the single-player save with it).
		if (netSession || game.network) return true;
		try {
			localStorage.setItem(
				key,
				JSON.stringify({
					state: game.serialize(),
					camera,
					savedAt: Date.now(),
				}),
			);
			$("save-game").title = `Zapisano ${timeLabel(game.time)} · Ctrl+S`;
			if (!silent) toast("Zapisano rozgrywkę na tym urządzeniu.");
			return true;
		} catch {
			if (!silent)
				toast(
					"Zapis niedostępny — przeglądarka blokuje pamięć lokalną.",
				);
			return false;
		}
	}
	function loadGame(key = SAVE_KEY) {
		try {
			const saved = JSON.parse(localStorage.getItem(key));
			const restored = Game.fromSave(saved?.state);
			game = restored;
			colors[0] = game.colorFor((game.viewer ?? 0));
			productionSignature = "";
			deck(activeTab);
			camera =
				saved.camera &&
				[saved.camera.x, saved.camera.y, saved.camera.zoom].every(
					Number.isFinite,
				)
					? {
							x: clamp(saved.camera.x, 0, W),
							y: clamp(saved.camera.y, 0, H),
							zoom: clamp(saved.camera.zoom, 1, 5.5),
							// The 3D board's turn (0 = looking north; ignored by the flat renderers).
							yaw: Number.isFinite(saved.camera.yaw) ? saved.camera.yaw : 0,
							// Its tilt towards the horizon (0 = from above … 1 = the sky in view).
							tilt: Number.isFinite(saved.camera.tilt) ? clamp(saved.camera.tilt, 0, 1) : 0,
						}
					: { x: W / 2, y: H / 2, zoom: 1 };
			selected = new Set(
				game
					.units((game.viewer ?? 0))
					.filter((e) => e.type !== "worker")
					.map((e) => e.id),
			);
			started = true;
			paused = true;
			finished = false;
			choiceOpen = false;
			act2Signature = "";
			building = false;
			wallDrag = null;
			attackMode = false;
			$("placement").hidden = true;
			$("overlay").hidden = true;
			missionLabels();
			terrainTexture();
			fit();
			sound.setMusicMode(musicModeFor(game));
			updateHud();
			toast("Wczytano zapis operacji.");
			autosaveClock = 0;
			return true;
		} catch {
			toast(
				"Nie udało się wczytać zapisu. Możesz rozpocząć nową operację.",
			);
			return false;
		}
	}
	const deckPages = { army: 0, build: 0, research: 0 };
	// The field of each research, shown as a tag on its card.
	const RESEARCH_FIELDS = {
		colony: "KOLONIA",
		meteorology: "POGODA",
		meteorShield: "ORBITA",
		guidance: "POGODA",
		mobility: "POGODA",
		weapons: "WALKA",
		armor: "WALKA",
		precision: "WALKA",
		infantryTraining: "WALKA",
		cargo: "GOSPODARKA",
		efficiency: "GOSPODARKA",
		extraction: "GOSPODARKA",
		assembly: "GOSPODARKA",
	};
	function paginateDeck(delta = 0) {
		const list = document.querySelector(".unit-cards"),
			cards = [...list.children];
		if (!list.clientWidth || !cards.length || !$("deck-page")) return;
		const count = Math.max(
				1,
				Math.min(7, Math.floor((list.clientWidth + 8) / 180)),
			),
			pages = Math.ceil(cards.length / count);
		const focused = cards.indexOf(document.activeElement);
		if (focused >= 0 && !delta)
			deckPages[activeTab] = Math.floor(focused / count);
		const page = clamp(deckPages[activeTab] + delta, 0, pages - 1);
		deckPages[activeTab] = page;
		list.style.setProperty("--deck-columns", Math.min(count, cards.length));
		cards.forEach(
			(card, i) =>
				(card.hidden = i < page * count || i >= (page + 1) * count),
		);
		$("deck-page").textContent = `${page + 1} / ${pages}`;
		$("deck-range").textContent =
			`${page * count + 1}–${Math.min(cards.length, (page + 1) * count)} z ${cards.length}`;
		$("deck-prev").disabled = page === 0;
		$("deck-next").disabled = page === pages - 1;
	}
	function deck(tabName) {
		activeTab = tabName;
		document
			.querySelector(".unit-cards")
			.classList.toggle(
				"expanded-build",
				tabName === "build" || tabName === "research",
			);
		document.querySelectorAll(".deck-tabs button").forEach((b) => {
			b.classList.toggle("active", b.dataset.tab === tabName);
			b.setAttribute("aria-pressed", String(b.dataset.tab === tabName));
		});
		const groups = {
			army: [
				["trooper", "Piechota", "Przeciw piechocie", "♟", "Q"],
				["rocket", "Rakietowiec", "Przeciw pojazdom", "⌁", "W"],
				["tank", "Czołg", "Pancerz i siła ognia", "⬡", "E"],
				["worker", "Robot", "Budowa, wydobycie i obrona", "⚙", "D"],
				["heavy", "Ciężka maszyna", "950 PW · fabryka", "▣", "Y"],
				[
					"artillery",
					"Artyleria",
					"Zasięg 420 · ostrzał obszaru",
					"⌁",
					"O",
				],
			],
			build: [
				["turret", "Wieżyczka", "Obrona przyczółka", "⌖", "T"],
				["barracks", "Koszary", "Produkcja piechoty", "▤", "B"],
				["factory", "Fabryka", "Czołgi i badania", "▥", "V"],
				["depot", "Magazyn polowy", "Rozładunek rudy", "▦", "G"],
				[
					"extractor",
					"Ekstraktor gazu",
					"Na złożu · wymaga robota",
					"♧",
					"X",
				],
				["reactor", "Reaktor", "+60 mocy", "ϟ", "C"],
				["lab", "Laboratorium", "Nowe technologie · 30 mocy", "⌬", "N"],
				["wall", "Mur", "Przeciągnij LPM — odcinek muru", "▰", "K"],
				["gate", "Brama", "Przejście otwierane ręcznie", "Π", "P"],
			],
			research: [
				[
					"meteorology",
					"Monitoring pogody",
					"Prognoza i alarm 30 s wcześniej",
					"☁",
					"",
				],
				[
					"guidance",
					"Celowanie adaptacyjne",
					"−75% kary celności przy złej pogodzie",
					"⌖",
					"",
				],
				[
					"mobility",
					"Napędy terenowe",
					"−75% spowolnienia przez pogodę",
					"➤",
					"",
				],
				["weapons", "Broń plazmowa", "+25% obrażeń", "✧", "U"],
				[
					"armor",
					"Pancerz kompozytowy",
					"−20% obrażeń od wroga",
					"⬡",
					"I",
				],
				[
					"cargo",
					"Powiększone ładownie",
					"30 → 60 ładunku · magazyn",
					"▦",
					"L",
				],
				[
					"efficiency",
					"Stabilizacja reaktorów",
					"60 → 90 mocy · laboratorium",
					"ϟ",
					"",
				],
				[
					"precision",
					"Optyka kryształowa",
					"+15% obrażeń · laboratorium",
					"⌬",
					"",
				],
			],
		};
		groups.army.push([
			"transport",
			"Transporter opancerzony",
			"4 pasażerów · fabryka",
			"▰",
			"",
		]);
		groups.build.push([
			"flak",
			"Bateria przeciwlotnicza",
			"Tylko lotnictwo · 15 mocy",
			"⌖",
			"",
		]);
		groups.army.push(
			[
				"interceptor",
				"Myśliwiec",
				"Szybki · atakuje cele w powietrzu i na ziemi",
				"✦",
				"",
			],
			[
				"bomber",
				"Bombowiec",
				"Wolny · +50% obrażeń przeciw budynkom",
				"✥",
				"",
			],
		);
		const faction = game.factionFor((game.viewer ?? 0))?.key;
		if (faction === "colonies" || faction === "dominion")
			groups.army.push(
				faction === "colonies"
					? [
							"raider",
							"Zwiadowca Kolonii",
							"Szybki zwiad i ostrzał · koszary",
							"➤",
							"",
						]
					: [
							"sentinel",
							"Bastion Dominium",
							"Ciężki obrońca · fabryka",
							"▣",
							"",
						],
			);
		for (const id of ["extraction", "assembly", "infantryTraining"])
			groups.research.push([
				id,
				RESEARCH[id].name,
				RESEARCH[id].description,
				"⌬",
				"",
			]);
		groups.research.unshift([
			"colony",
			"Centrum II — Kolonia",
			RESEARCH.colony.description,
			"Ⅱ",
			"",
		]);
		groups.build.push([
			"battery",
			"Akumulator energii",
			"900 energii · do 30 mocy rezerwowej",
			"▥",
			"",
		]);
		groups.build.push([
			"workshop",
			"Warsztat polowy",
			"Naprawa 2 pojazdów · 20 mocy",
			"⚒",
			"",
		]);
		groups.build.push([
			"hangar",
			"Hangar lotniczy",
			"Myśliwce i bombowce · 25 mocy",
			"✈",
			"",
		]);
		// Stage E: support buildings and units.
		groups.build.push(
			["medbay", "Punkt medyczny", "Leczy 3 piechurów · 10 mocy", "✚", ""],
			["shieldgen", "Generator osłon", "Tarcza nad budynkami · 35 mocy", "◎", ""],
			["salvageYard", "Plac odzysku", "Metal z wraków · 5 mocy", "♻", ""],
		);
		// Faction units and buildings (Stage F4).
		const kit = {
			colonies: {
				build: [["outpost", "Placówka polowa", "Rozładunek, strefa budowy, widzenie · wszędzie", "⬡", ""]],
				army: [
					["grenadier", "Grenadierzy", "Granaty ranią grupy piechoty · koszary", "✹", ""],
					["serviceRover", "Łazik serwisowy", "Naprawia pojazdy i budynki · fabryka", "⚙", ""],
				],
			},
			swarm: {
				build: [["monolith", "Monolit rezonansowy", "Spowalnia wrogów w promieniu 260 · 20 mocy", "◈", ""]],
				army: [
					["crawler", "Pełzacz", "Tani, szybki, wybucha po śmierci · koszary", "✳", ""],
					["spitter", "Pluwacz", "Kwas i korozja, silny przeciw budynkom · koszary", "❂", ""],
					["colossus", "Kolos", "Regenerujący się tytan · fabryka", "⬢", ""],
				],
			},
			dominion: {
				build: [["uplink", "Stacja orbitalna", "Uderzenie orbitalne co 100 s · 40 mocy", "⊕", ""]],
				army: [
					["flamer", "Miotacze ognia", "Pali piechotę i budynki · koszary", "♨", ""],
					["destroyer", "Niszczyciel czołgów", "Daleki zasięg przeciw pojazdom · fabryka", "➹", ""],
				],
			},
		}[game.factionFor((game.viewer ?? 0))?.key];
		if (kit) {
			groups.build.push(...kit.build);
			groups.army.push(...kit.army);
		}
		// Act III after the evacuation of Hefajstos: the Dominium's tank destroyer, lent by Varn.
		if (game.loanedUnit?.("destroyer") && !groups.army.some(([type]) => type === "destroyer"))
			groups.army.push(["destroyer", "Niszczyciel czołgów", "Wsparcie Dominium (akt II) · fabryka", "➹", ""]);
		groups.army.push(
			["skyguard", "Wóz przeciwlotniczy", "Mobilna OPL · fabryka", "✺", ""],
			["drone", "Dron zwiadowczy", "Zwiad z powietrza · koszary", "✢", ""],
			["saboteur", "Sabotażyści", "Wyłączają wrogie budynki · koszary", "☍", ""],
		);
		// Orbital battle (space-rules.js): ships instead of ground units, orbital descriptions of the stations.
		if (game.space) {
			const ground = new Set(["trooper", "rocket", "tank", "heavy", "artillery", "raider", "grenadier", "flamer", "destroyer", "sentinel", "skyguard", "saboteur", "crawler", "spitter", "colossus", "transport", "serviceRover"]);
			groups.army = [
				["corvette", "Korweta", "Szybka · roje na niszczyciele i krążowniki · stocznia lekka", "➤", "Q"],
				["frigate", "Fregata", "Łowca korwet i myśliwców · stocznia lekka", "◆", "W"],
				["lancer", "Niszczyciel", "Działo liniowe na duże okręty · stocznia ciężka", "➹", "E"],
				["cruiser", "Krążownik", "Silne osłony, burzy stacje · wymaga laboratorium", "⬢", "Y"],
				["carrier", "Lotniskowiec", "Wypuszcza do 4 myśliwców · wymaga laboratorium", "✈", ""],
				...groups.army.filter(([type]) => !ground.has(type)),
			];
			groups.research.push(["meteorShield", "Osłony przeciwmeteorytowe", "−80% obrażeń od deszczu asteroid", "☄", ""]);
			const SPACE_DESC = { barracks: "Korwety i fregaty", factory: "Niszczyciele i krążowniki", turret: "Obrona stacji", depot: "Rozładunek rudy z asteroid", extractor: "Na obłoku mgławicy · wymaga drona" };
			groups.build = groups.build.map((g) => (SPACE_DESC[g[0]] ? [g[0], g[1], SPACE_DESC[g[0]], g[3], g[4]] : g));
		}
		// Research: the one under way first, then what can be started, what is locked, and what is done.
		if (tabName === "research") {
			const rank = (kind) => ({ working: 0, paused: 0, ready: 1, poor: 1, locked: 2, done: 3 })[game.researchStatus(kind).state] ?? 2;
			groups.research = groups.research.map((g, i) => [g, i]).sort((a, b) => rank(a[0][0]) - rank(b[0][0]) || a[1] - b[1]).map(([g]) => g);
		}
		document.querySelector(".unit-cards").innerHTML = groups[tabName]
			.map(([type, name, desc, symbol, key]) => {
				const stats = TYPES[type],
					r = RESEARCH[type],
					cost = stats ? game.cost(type) : r.metal,
					duration = r ? r.time : stats.build || stats.construction;
				// A research card: a short line, the full description in the tooltip, its field and a progress bar.
				if (tabName === "research")
					return `<button class="unit-card research-card" data-research="${type}" data-description="${r.description || desc}"><span class="unit-symbol">${symbol}</span><span class="unit-copy"><i class="research-tag" data-tag="${RESEARCH_FIELDS[type] || "GOSPODARKA"}">${RESEARCH_FIELDS[type] || "GOSPODARKA"}</i><strong>${name}</strong><span class="card-description">${desc === r.description ? desc.split(/[.;]/)[0] : desc}</span><small class="card-status"></small><b>◇ ${cost}${r.gas ? ` · ⬡ ${r.gas}` : ""}${r.crystals ? ` · ✦ ${r.crystals}` : ""} <em>· ${duration} s</em></b></span><i class="research-progress" aria-hidden="true"></i>${key ? `<kbd>${key}</kbd>` : ""}</button>`;
				return `<button class="unit-card" data-${tabName === "army" ? "unit" : tabName === "build" ? "build" : "research"}="${type}" data-description="${desc}"><span class="unit-symbol">${symbol}</span><span class="unit-copy"><strong>${stats ? game.unitName(type) : name}</strong><span class="card-description">${r?.description || desc}</span><small class="card-status"></small><b>◇ ${cost}${r?.gas ? " + " + r.gas + " gazu" : ""}${r?.crystals ? " + " + r.crystals + " krysz." : ""} <em>· ${duration} s</em></b></span>${key ? `<kbd>${key}</kbd>` : ""}</button>`;
			})
			.join("");
		document
			.querySelectorAll("[data-unit]")
			.forEach((b) => (b.onclick = () => buy(b.dataset.unit)));
		document
			.querySelectorAll("[data-build]")
			.forEach((b) => (b.onclick = () => beginBuild(b.dataset.build)));
		document.querySelectorAll("[data-research]").forEach(
			(b) =>
				(b.onclick = () => {
					act("startResearch", b.dataset.research);
					updateHud();
				}),
		);
		updateHud();
		paginateDeck();
	}
	function setupDeck() {
		document.querySelector(".production-heading").innerHTML =
			'<div class="deck-tabs"><button data-tab="army" class="active">ARMIA</button><button data-tab="build">BUDOWA</button><button data-tab="research">BADANIA</button><button id="development-open" aria-haspopup="dialog" title="Drzewo rozwoju [F2]">ROZWÓJ</button></div><div class="queue-controls"><span id="queue-status"></span><button id="cancel-queue" title="Anuluj ostatnią jednostkę i odzyskaj metal">Anuluj ×</button></div>';
		document
			.querySelector(".queue-track")
			.insertAdjacentHTML(
				"beforebegin",
				'<nav class="deck-pagination" aria-label="Strony poleceń"><span id="deck-range"></span><div><button id="deck-prev" aria-label="Poprzednia strona poleceń">‹</button><span id="deck-page" aria-live="polite"></span><button id="deck-next" aria-label="Następna strona poleceń">›</button></div></nav>',
			);
		$("development-open").onclick = () => {
			if (started && !finished) development?.open();
		};
		$("deck-prev").onclick = () => paginateDeck(-1);
		$("deck-next").onclick = () => paginateDeck(1);
		new ResizeObserver(() => paginateDeck()).observe(
			document.querySelector(".unit-cards"),
		);
		document
			.querySelectorAll("[data-tab]")
			.forEach((b) => (b.onclick = () => deck(b.dataset.tab)));
		$("cancel-queue").onclick = () => {
			if (activeTab === "research") act("cancelResearch");
			else act("cancelQueue", selectedProducer()?.id ?? null);
			updateHud();
		};
		$("battlefield").insertAdjacentHTML(
			"beforeend",
			'<div class="group-dock" aria-label="Grupy jednostek">' +
				Array.from(
					{ length: 9 },
					(_, i) =>
						`<button data-group="${i + 1}" title="${i + 1}: wybierz · Ctrl+${i + 1}: przypisz · dwukrotnie: kamera"><b>${i + 1}</b><small>—</small></button>`,
				).join("") +
				'</div><div id="rally-hint" hidden></div><button id="base-alert" hidden></button>',
		);
		document
			.querySelectorAll("[data-group]")
			.forEach(
				(button) =>
					(button.onclick = (e) =>
						selectGroup(
							button.dataset.group,
							e.ctrlKey || e.metaKey,
							e.shiftKey,
						)),
			);
		$("base-alert").onclick = focusAlert;
		document
			.querySelector(".economy-card")
			.insertAdjacentHTML(
				"beforebegin",
				'<div class="production-roster"><span class="eyebrow">KOLEJKI BUDYNKÓW</span><div id="building-queues"></div></div>',
			);
		document
			.querySelector(".selection-actions")
			.insertAdjacentHTML(
				"beforeend",
				'<button id="select-workers">Roboty <kbd>R</kbd></button>',
			);
		$("select-workers").onclick = selectWorkers;
		document
			.querySelector(".map-heading")
			.insertAdjacentHTML(
				"beforeend",
				'<span id="weather-status" class="weather-status"></span>',
			);
		document
			.querySelector(".map-heading")
			.insertAdjacentHTML(
				"beforeend",
				'<span class="fog-note">MGŁA WOJNY AKTYWNA · ZWIAD ODSŁANIA TEREN</span>',
			);
		document.querySelector(".briefing p").textContent =
			"Roboty przewożą rudę do bazy. Zbuduj fabrykę, ulepsz armię i odkrywaj teren. Przejmuj przekaźniki, aby tworzyć nowe przyczółki.";
		document.querySelector(".briefing>small").textContent =
			"Wersja 0.11 · proceduralna muzyka i dźwięk · M: wyciszenie";
		document.querySelector(".briefing-controls").innerHTML =
			"<span><b>Ctrl+1–9 / 1–9</b>Zapisz / wybierz grupę</span><span><b>Wybierz budynek → PPM</b>Ustaw punkt zbiórki</span><span><b>Kilka koszar / fabryk</b>Produkuj równolegle</span><span><b>J / kliknij alarm</b>Pokaż atakowaną bazę</span>";
		document.querySelector(".controls-note p").innerHTML =
			"<b>Ctrl+1–9</b> przypisz · <b>1–9</b> grupa<br><b>Shift+S</b> utrzymaj pozycję<br><b>J</b> alarm · <b>Ctrl+S</b> zapis<br><b>, / .</b> lub <b>Alt+ŚPM</b> obrót kamery 3D · <b>PgUp / PgDn</b> pochylenie (niebo) · <b>/</b> od południa";
		try {
			const save = JSON.parse(localStorage.getItem(SAVE_KEY));
			if ([2, 3, 4, 5, 6].includes(save?.state?.version)) {
				$("start").insertAdjacentHTML(
					"afterend",
					`<button id="resume-game" class="resume-button">WZNÓW ZAPIS · ${timeLabel(Number(save.state.time) || 0)}</button>`,
				);
				$("resume-game").onclick = () => loadGame();
			}
		} catch {}
		$("sound-toggle").parentElement.insertAdjacentHTML(
			"beforebegin",
			'<div class="resource gas-resource"><div><strong id="gas">0</strong><small>GAZ</small></div></div><div class="resource crystal-resource"><div><strong id="crystals">0</strong><small>KRYSZTAŁY</small></div></div><div class="resource army"><span class="resource-icon">⌁</span><div><strong id="population">0 / 60</strong><small>JEDNOSTKI</small></div></div><div class="resource power-resource"><div><strong id="power">0/40</strong><small>MOC</small></div></div>',
		);
		document
			.querySelector(".economy-card")
			.insertAdjacentHTML(
				"beforeend",
				'<button id="idle-workers">Bezczynne roboty [Z]</button>',
			);
		$("idle-workers").onclick = selectIdle;
		document
			.querySelector(".economy-card")
			.insertAdjacentHTML(
				"afterbegin",
				'<p id="power-warning" hidden></p><p id="campaign-objectives" hidden></p>',
			);
		setupSidebar();
		economyPanel = new EconomyPanel(
			document.querySelector(".economy-card"),
			economyAction,
		);
		deck("army");
	}
	function setupSidebar() {
		const meter = document.createElement("div");
		meter.id = "render-meter";
		meter.hidden = true;
		meter.setAttribute("aria-label", "Czas renderowania");
		document.body.append(meter);
		const sidebar = document.querySelector(".sidebar");
		sidebar.insertAdjacentHTML(
			"beforeend",
			'<div id="army-inspector"></div>',
		);
		const nav = document.createElement("div");
		nav.className = "intel-tabs";
		const panels = [];
		for (const [name, selectors] of [
			[
				"Cele",
				[
					".operation-card",
					"#obj-capture",
					"#obj-army",
					"#obj-hq",
					"#campaign-objectives",
					".intel",
				],
			],
			["Logistyka", [".economy-card"]],
			["Kolejki", [".production-roster"]],
			["Oddział", ["#army-inspector"]],
		]) {
			const panel = document.createElement("section");
			panel.className = "intel-panel";
			panel.hidden = panels.length > 0;
			for (const selector of selectors) {
				const node = sidebar.querySelector(selector);
				if (node) panel.append(node);
			}
			const button = document.createElement("button");
			button.textContent = name;
			button.setAttribute("aria-pressed", String(!panel.hidden));
			button.onclick = () => {
				panels.forEach((p) => (p.hidden = p !== panel));
				[...nav.children].forEach((b) =>
					b.setAttribute("aria-pressed", String(b === button)),
				);
			};
			nav.append(button);
			panels.push(panel);
		}
		sidebar
			.querySelectorAll(":scope > .section-label")
			.forEach((n) => n.remove());
		sidebar.prepend(nav, ...panels);
		document
			.querySelector(".selection-actions")
			.insertAdjacentHTML(
				"beforeend",
				'<button id="inspect-army">Statystyki</button><div class="formation-control" id="army-formation" role="radiogroup" aria-label="Formacja oddziału"><span class="formation-label">Formacja</span><div class="formation-options"><button type="button" role="radio" data-formation="line" title="Linia — jeden szereg w poprzek kierunku marszu: cały oddział strzela naraz"><svg viewBox="0 0 16 10" aria-hidden="true"><circle cx="2" cy="5" r="1.5"/><circle cx="6" cy="5" r="1.5"/><circle cx="10" cy="5" r="1.5"/><circle cx="14" cy="5" r="1.5"/></svg>Linia</button><button type="button" role="radio" data-formation="column" title="Kolumna — dwójkami, wąski szyk na przejścia i mosty"><svg viewBox="0 0 16 10" aria-hidden="true"><circle cx="6" cy="1.6" r="1.3"/><circle cx="10" cy="1.6" r="1.3"/><circle cx="6" cy="5" r="1.3"/><circle cx="10" cy="5" r="1.3"/><circle cx="6" cy="8.4" r="1.3"/><circle cx="10" cy="8.4" r="1.3"/></svg>Kolumna</button><button type="button" role="radio" data-formation="spread" title="Rozproszenie — siatka z dużymi odstępami"><svg viewBox="0 0 16 10" aria-hidden="true"><circle cx="2" cy="1.6" r="1.3"/><circle cx="8" cy="1.6" r="1.3"/><circle cx="14" cy="1.6" r="1.3"/><circle cx="2" cy="8.4" r="1.3"/><circle cx="8" cy="8.4" r="1.3"/><circle cx="14" cy="8.4" r="1.3"/></svg>Rozprosz.</button></div></div><button id="load-transport" hidden>Załaduj</button><button id="unload-transport" hidden>Wyładuj</button><button id="hold-position">Pozycja <kbd>⇧S</kbd></button><button id=toggle-gate hidden>Otwórz / zamknij</button><button id="module-a" hidden></button><button id="module-b" hidden></button><button id="orbital-strike" hidden>Uderzenie orbitalne</button><button id="demolish" hidden title="Zwrot: do 50% za budowlę, 100% za fundament. Centrum nie można rozebrać.">Rozbierz</button>',
			);
		// The shortcut also in the tooltip (a narrow panel hides the key badges).
		for (const button of document.querySelectorAll(".selection-actions button"))
			if (!button.title && button.querySelector("kbd"))
				button.title = `${button.firstChild.textContent.trim()} [${button.querySelector("kbd").textContent}]`;
		const statsDialog = document.createElement("dialog");
		statsDialog.id = "army-stats-dialog";
		statsDialog.setAttribute("aria-label", "Parametry oddziału");
		statsDialog.innerHTML =
			'<button id="close-army-stats">Zamknij</button><div id="army-stats-content"></div>';
		document.body.append(statsDialog);
		$("inspect-army").onclick = () => {
			const wasPaused = paused;
			paused = true;
			$("army-stats-content").innerHTML = $("army-inspector").innerHTML;
			statsDialog.onclose = () => {
				paused = wasPaused;
			};
			statsDialog.showModal();
		};
		$("close-army-stats").onclick = () => statsDialog.close();
		for (const button of $("army-formation").querySelectorAll("button"))
			button.onclick = () => {
				act("setFormation", button.dataset.formation);
				updateHud();
			};
		$("load-transport").onclick = () => {
			const c = [...selected]
				.map((id) => game.get(id))
				.find((e) => e?.type === "transport" && e.team === (game.viewer ?? 0));
			if (!c) return;
			const nearby = game
				.units((game.viewer ?? 0))
				.filter(
					(e) =>
						["trooper", "rocket"].includes(e.type) &&
						dist(e, c) < 240,
				)
				.sort((a, b) => dist(a, c) - dist(b, c));
			toast(
				act("board", 
					nearby.map((e) => e.id),
					c.id,
				)
					? "Załadunek rozpoczęty."
					: "Brak wolnych miejsc lub pobliskiej piechoty.",
			);
			updateHud();
		};
		$("unload-transport").onclick = () => {
			for (const id of selected) act("unload", id);
			updateHud();
		};
		$("demolish").onclick = () => {
			act("demolish", [...selected]);
			selected = new Set([...selected].filter((id) => game.get(id)));
			updateHud();
		};
		$("hold-position").onclick = () => {
			const count = act("hold", [...selected]);
			toast(
				count
					? `${count} jednostek utrzymuje pozycję.`
					: "Wybierz jednostki bojowe.",
			);
			updateHud();
		};
		$("orbital-strike").onclick = () => {
			const b = game.get([...selected][0]);
			if (!b || b.type !== "uplink") return;
			const why = game.strikeRequirement(b.id);
			if (why) return toast(why);
			strikeMode = b.id;
			building = false;
			attackMode = false;
			toast("Wskaż cel uderzenia orbitalnego (LPM). PPM lub Esc — anuluj.");
		};
		for (const [id, index] of [
			["module-a", 0],
			["module-b", 1],
		])
			$(id).onclick = () => {
				const b = game.get([...selected][0]),
					option = game.moduleOptions?.(b)[index];
				if (!b || !option) return;
				toast(
					act("installModule", b.id, option.key)
						? `${option.name} — montaż rozpoczęty.`
						: game.moduleRequirement(b) || "Nie można zamontować modułu.",
				);
				updateHud();
			};
		$("toggle-gate").onclick = () => {
			const gate = game.get([...selected][0]);
			toast(
				act("toggleGate", gate?.id)
					? gate.open
						? "Brama otwarta."
						: "Brama zamknięta."
					: "Brama zajęta przez jednostkę lub w budowie.",
			);
			updateHud();
		};
	}
	canvas.addEventListener("contextmenu", (e) => e.preventDefault());
	// The middle button pans the map; stop the browser's own autoscroll from moving the page meanwhile.
	canvas.addEventListener("mousedown", (e) => {
		if (e.button === 1) e.preventDefault();
	});
	canvas.addEventListener("pointerdown", (e) => {
		if (!started || finished) return;
		canvas.focus();
		mouse = pointer(e);
		const p = world(mouse);
		if (e.button === 1) {
			e.preventDefault();
			// On the 3D board: Alt + middle button turns (sideways) and tilts (up and down) the camera; a plain drag keeps the grabbed ground
			// point under the pointer (the board is in perspective, so flat-frame deltas are not enough).
			pan = { ...mouse, cx: camera.x, cy: camera.y, ground: p, turn: e.altKey && rendererMode === "three", sx: e.clientX, sy: e.clientY, client: { x: e.clientX, y: e.clientY }, yaw: camera.yaw || 0, tilt: camera.tilt || 0 };
			canvas.setPointerCapture(e.pointerId);
			return;
		}
		if (e.button === 2) {
			e.preventDefault();
			if (strikeMode) {
				strikeMode = null;
				toast("Uderzenie orbitalne anulowane.");
				return;
			}
			if (building) {
				building = false;
				wallDrag = null;
				$("placement").hidden = true;
				return;
			}
			if (!selected.size) {
				toast("Najpierw zaznacz oddział (LPM lub F).");
				return;
			}
			const ore = game.ores.find(
				(o) =>
					o.amount > 0 && game.isVisible(o.x, o.y) && dist(o, p) < 55,
			);
			const friendly = at(p, 0);
			const ids = [...selected];
			if (
				friendly?.type === "transport" &&
				ids.some((id) =>
					["trooper", "rocket"].includes(game.get(id)?.type),
				)
			) {
				toast(
					act("board", ids, friendly.id)
						? "Piechota idzie do transportera."
						: "Transporter pełny lub brak piechoty.",
				);
				return;
			}
			if (ids.every((id) => game.isProducer(game.get(id)))) {
				const count = act("setRally", ids, p.x, p.y);
				toast(
					count
						? "Ustawiono punkt zbiórki nowych jednostek."
						: "Nie można wyznaczyć drogi do punktu.",
				);
				return;
			}
			// Stage E: workers on a wreck recover metal; saboteurs on an enemy building plant a charge.
			const wreck = (game.wrecks || []).find(
				(w) => game.explored[game.visionIndex(w.x, w.y)] && dist(w, p) < w.size + 22,
			);
			if (wreck && ids.some((id) => game.get(id)?.type === "worker")) {
				toast(
					act("salvage", ids, wreck.id)
						? `Odzysk wraku: ${wreck.value} metalu po dowiezieniu na plac.`
						: "Odzysk wymaga ukończonego placu odzysku.",
				);
				return;
			}
			const enemyBuilding = at(p, 1);
			if (
				enemyBuilding &&
				!TYPES[enemyBuilding.type].speed &&
				ids.some((id) => game.get(id)?.type === "saboteur")
			) {
				const saboteurs = ids.filter((id) => game.get(id)?.type === "saboteur");
				if (act("sabotage", saboteurs, enemyBuilding.id)) {
					toast(`Sabotaż: ${TYPES[enemyBuilding.type].name} zostanie wyłączony.`);
					const rest = ids.filter((id) => !saboteurs.includes(id));
					if (rest.length) act("command", rest, p.x, p.y, enemyBuilding.id, true);
					return;
				}
			}
			if (friendly?.type === "extractor") {
				toast(
					act("assignGas", ids, friendly.id)
						? "Robot skierowany do ekstraktora."
						: "Ekstraktor wymaga ukończenia, wolnego stanowiska, gazu w złożu i zaznaczonego robota.",
				);
				return;
			}
			const crystal = game.crystalFields.find(
				(o) =>
					o.amount > 0 && game.isVisible(o.x, o.y) && dist(o, p) < 50,
			);
			if (crystal && act("gatherCrystal", ids, crystal.id)) {
				toast("Roboty przewożą kryształy do centrum lub magazynu.");
				return;
			}
			if (ore && act("gather", ids, ore.id)) {
				toast("Roboty rozpoczynają wydobycie.");
				return;
			}
			if (
				friendly?.constructionLeft &&
				act("buildWith", ids, friendly.id)
			) {
				toast("Roboty dołączają do budowy.");
				return;
			}
			if (friendly && act("repair", ids, friendly.id)) {
				toast("Naprawa rozpoczęta: 1 metal za 5 PW.");
				return;
			}
			const target = at(p, 1);
			act("command", 
				ids,
				p.x,
				p.y,
				target?.id,
				attackMode || keys.has("a"),
			);
			game.effects.push({
				kind: "command",
				x: p.x,
				y: p.y,
				attack: !!target || attackMode,
				life: 0.7,
				maxLife: 0.7,
			});
			attackMode = false;
			return;
		}
		if (e.button === 0) {
			if (strikeMode) {
				const id = strikeMode;
				strikeMode = null;
				act("orbitalStrike", id, p.x, p.y);
				return;
			}
			if (building) {
				if (building === "wall") {
					wallDrag = { ...p, circle: e.altKey };
					canvas.setPointerCapture(e.pointerId);
					return;
				}
				if (act("buildStructure", building, p.x, p.y, [...selected])) {
					building = false;
					wallDrag = null;
					$("placement").hidden = true;
				}
				updateHud();
				return;
			}
			drag = { ...mouse, shift: e.shiftKey };
			canvas.setPointerCapture(e.pointerId);
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		mouse = pointer(e);
		if (pan?.turn) {
			camera.yaw = pan.yaw + (e.clientX - pan.sx) * 0.008;
			camera.tilt = clamp(pan.tilt + (pan.sy - e.clientY) * 0.004, 0, 1);
		}
		// 3D: only remember where the pointer is; the camera follows once per frame (panTowardsPointer),
		// because the 3D view (and so the ground under the pointer) changes only when a frame is drawn.
		else if (pan && rendererMode === "three") pan.client = { x: e.clientX, y: e.clientY };
		else if (pan) {
			camera.x = clamp(pan.cx - (mouse.x - pan.x) / scale, 0, W);
			camera.y = clamp(pan.cy - (mouse.y - pan.y) / scale, 0, H);
		}
	});
	canvas.addEventListener("pointerup", (e) => {
		if (wallDrag && e.button === 0) {
			mouse = pointer(e);
			if (act("buildWallLine", wallDrag, world(mouse), [...selected])) {
				building = false;
				$("placement").hidden = true;
			}
			wallDrag = null;
			updateHud();
			return;
		}

		if (e.button === 1) {
			pan = null;
			return;
		}
		if (!drag || e.button !== 0) return;
		mouse = pointer(e);
		if (!drag.shift) selected.clear();
		if (dist(drag, mouse) > 5) {
			// The box is a rectangle on the screen; with the 2.5D tilt the board is in perspective beneath it.
			const onScreen = (p) => (renderer.fromFlat ? renderer.fromFlat(p) : p),
				a = onScreen(drag),
				b = onScreen(mouse);
			game.units((game.viewer ?? 0))
				.filter((u) => {
					const q = onScreen(screen(u));
					return (
						q.x >= Math.min(a.x, b.x) &&
						q.x <= Math.max(a.x, b.x) &&
						q.y >= Math.min(a.y, b.y) &&
						q.y <= Math.max(a.y, b.y)
					);
				})
				.forEach((u) => selected.add(u.id));
		} else {
			const unit = at(world(mouse), 0);
			if (unit) {
				if (drag.shift && selected.has(unit.id))
					selected.delete(unit.id);
				else selected.add(unit.id);
			}
		}
		drag = null;
		if (selected.size) sound.play("radio");
		updateHud();
	});
	canvas.addEventListener("pointercancel", () => {
		wallDrag = null;
		drag = null;
		pan = null;
	});
	canvas.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
			zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12);
		},
		{ passive: false },
	);
	mini.addEventListener("pointerdown", (e) => {
		const r = mini.getBoundingClientRect();
		camera.x = ((e.clientX - r.left) / r.width) * W;
		camera.y = ((e.clientY - r.top) / r.height) * H;
		if (camera.zoom === 1) camera.zoom = 1.65;
		fit();
	});
	window.addEventListener("keydown", (e) => {
		if (development?.active) {
			if (e.key === "Escape") {
				e.preventDefault();
				development.close();
			}
			return;
		}
		// Tests: Ctrl+Shift+L in the menu unlocks the whole campaign, pressed again brings back the earlier progress.
		if (menu?.active && e.ctrlKey && e.shiftKey && e.code === "KeyL") {
			e.preventDefault();
			if (e.repeat) return;
			const unlocked = campaign.toggleUnlockAll();
			if (["home", "single", "campaign"].includes(menu.screen)) menu.show(menu.screen);
			menu.notice?.(unlocked ? "Tryb testowy: cała kampania odblokowana (Ctrl+Shift+L przywraca postęp)." : "Przywrócono wcześniejszy postęp kampanii.");
			return;
		}
		if (e.key === "F2" && !menu?.active && started && !finished) {
			e.preventDefault();
			if (!e.repeat) development?.open();
			return;
		}
		if (e.key === "Escape") {
			e.preventDefault();
			if (e.repeat) return;
			if (menu?.active) menu.escape();
			else if (building || attackMode || strikeMode) {
				building = false;
				wallDrag = null;
				attackMode = false;
				strikeMode = null;
				$("placement").hidden = true;
			} else if (started && !finished) menu.show("pause");
			return;
		}
		if (menu?.active) {
			if (
				e.key.toLowerCase() === "m" &&
				!e.ctrlKey &&
				!e.metaKey &&
				!e.target.closest("input")
			) {
				e.preventDefault();
				if (!e.repeat) toggleSound();
			}
			return;
		}
		if (document.querySelector("#army-stats-dialog")?.open) return;
		if (e.target.closest("input,select,textarea")) return;
		if (e.key === "Enter" && netSession && started && !finished) {
			e.preventDefault();
			openChat();
			return;
		}
		if (e.key.toLowerCase() === "m" && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			if (!e.repeat) toggleSound();
			return;
		}
		const key = e.key.toLowerCase(),
			groupKey = /^(Digit|Numpad)[1-9]$/.test(e.code)
				? e.code.at(-1)
				: key;
		if (/^[1-9]$/.test(groupKey) && started) {
			e.preventDefault();
			if (!e.repeat)
				selectGroup(groupKey, e.ctrlKey || e.metaKey, e.shiftKey);
			return;
		}
		if (e.ctrlKey || e.metaKey) {
			if (key === "s") {
				e.preventDefault();
				saveGame();
			}
			return;
		}
		if (
			[
				" ",
				"arrowup",
				"arrowdown",
				"arrowleft",
				"arrowright",
				"home",
				"pageup",
				"pagedown",
			].includes(key)
		)
			e.preventDefault();
		keys.add(key);
		if (e.repeat || !started) return;
		if (key === " ") togglePause();
		else if (key === "/") {
			camera.yaw = 0;
			camera.tilt = 0;
		}
		else if (key === "j") focusAlert();
		else if (key === "f") selectAll();
		else if (key === "r") selectWorkers();
		else if (key === "z") selectIdle();
		else if (key === "g") beginBuild("depot");
		else if (key === "c") beginBuild("reactor");
		else if (key === "n") beginBuild("lab");
		else if (key === "x") beginBuild("extractor");
		else if (key === "l") {
			act("startResearch", "cargo");
			updateHud();
		} else if (key === "s") {
			if (e.shiftKey) {
				const count = act("hold", [...selected]);
				toast(
					count
						? `${count} jednostek utrzymuje pozycję.`
						: "Wybierz jednostki bojowe.",
				);
			} else act("stop", [...selected]);
			updateHud();
		} else if (key === "q") buy("trooper");
		else if (key === "w") buy("rocket");
		else if (key === "e") buy("tank");
		else if (key === "d") buy("worker");
		else if (key === "y") buy("heavy");
		else if (key === "o") buy("artillery");
		else if (key === "k") beginBuild("wall");
		else if (key === "p") beginBuild("gate");
		else if (key === "t") beginBuild("turret");
		else if (key === "b") beginBuild("barracks");
		else if (key === "v") beginBuild("factory");
		else if (key === "u" || key === "i") {
			act("startResearch", key === "u" ? "weapons" : "armor");
			updateHud();
		} else if (key === "a") {
			attackMode = true;
			toast("Atak w marszu: wskaż cel prawym przyciskiem myszy.");
		} else if (key === "escape") {
			building = false;
			wallDrag = null;
			attackMode = false;
			$("placement").hidden = true;
		} else if (key === "h") {
			const b = game.hq((game.viewer ?? 0));
			if (b) {
				camera.x = b.x + 150;
				camera.y = b.y - 150;
				camera.zoom = 1.8;
				fit();
			}
		} else if (key === "home") {
			camera = { x: W / 2, y: H / 2, zoom: 1 };
			fit();
		}
	});
	window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
	window.addEventListener("blur", () => {
		keys.clear();
		drag = null;
		pan = null;
		// A network battle never pauses (the other player keeps playing).
		if (started && !finished && !paused && !netSession) togglePause();
	});
	function beginBuild(type = "turret") {
		if (game.developmentRequirement(type)) {
			toast(game.developmentRequirement(type));
			return;
		}
		if (!started || finished) return;
		if (!game.units((game.viewer ?? 0)).some((e) => e.type === "worker")) {
			toast("Budowa wymaga żywego robota.");
			return;
		}
		if (game.credits < game.cost(type)) {
			toast(`${game.unitName(type)}: potrzeba ${game.cost(type)} metalu.`);
			return;
		}
		building = building === type ? false : type;
		$("placement").textContent =
			`${game.unitName(type)} · robot zbuduje obiekt · ${type === "wall" ? "przeciągnij LPM: odcinek · Alt + przeciągnij: okrąg" : type === "gate" || type === "turret" ? "LPM na murze lub wolnym terenie" : type === "extractor" ? "LPM na fioletowym złożu gazu" : "LPM przy bazie / przekaźniku"} · Esc anuluje`;
		$("placement").hidden = !building;
	}
	setupDeck();
	development = new DevelopmentTree.View({
		game: () => game,
		freeze: () => {
			const previous = paused;
			paused = true;
			keys.clear();
			drag = null;
			pan = null;
			building = false;
			wallDrag = null;
			attackMode = false;
			$("placement").hidden = true;
			sound.silenceEffects();
			return previous;
		},
		resume: (previous) => {
			paused = previous;
			updateHud();
		},
		build: (type) => {
			beginBuild(type);
			updateHud();
		},
		changed: () => updateHud(),
	});
	$("sound-toggle").onclick = toggleSound;
	$("sound-volume").oninput = (e) => {
		sound.setVolume(Number(e.target.value) / 100);
		updateAudioControls();
	};
	updateAudioControls();
	$("start").onclick = start;
	$("pause").onclick = () => menu.show("pause");
	$("select-all").onclick = selectAll;
	$("stop").onclick = () => act("stop", [...selected]);
	$("restart").textContent = "☰ Menu operacji";
	$("restart").onclick = () => menu.show("pause");
	$("save-game").onclick = () => saveGame();
	window.addEventListener("pagehide", () => saveGame(true));
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) saveGame(true);
	});
	document
		.querySelectorAll("[data-unit]")
		.forEach((b) => (b.onclick = () => buy(b.dataset.unit)));
	$("zoom-in").onclick = () => zoom(1.2);
	$("zoom-out").onclick = () => zoom(1 / 1.2);
	$("center").onclick = () => {
		camera = { x: W / 2, y: H / 2, zoom: 1 };
		fit();
	};
	window.addEventListener("resize", fit);
	terrainTexture();
	fit();
	updateHud();
	function inspectSave(key = SAVE_KEY) {
		let raw;
		try {
			raw = localStorage.getItem(key);
		} catch {
			return {
				exists: false,
				valid: false,
				error: "Pamięć lokalna jest niedostępna. Postęp może nie zostać zapisany.",
			};
		}
		if (!raw) return { exists: false, valid: false };
		try {
			const saved = JSON.parse(raw),
				restored = Game.fromSave(saved?.state);
			if (restored.result)
				return {
					exists: true,
					valid: false,
					error: "Ostatnia operacja jest zakończona. Możesz rozpocząć kolejną.",
				};
			return {
				exists: true,
				valid: true,
				missionId: restored.missionId,
				time: timeLabel(restored.time),
				date: Number.isFinite(saved.savedAt)
					? new Date(saved.savedAt).toLocaleString("pl-PL")
					: "brak daty",
			};
		} catch (e) {
			return {
				exists: true,
				valid: false,
				label: e?.outdated ? "Starsza wersja mapy" : null,
				error:
					e?.userMessage ||
					"Zapis jest uszkodzony lub niezgodny. Możesz rozpocząć nową operację.",
			};
		}
	}
	menu = new CommandMenu({
		slots: () =>
			Array.from({ length: 5 }, (_, i) =>
				inspectSave("pogranicze-slot-" + (i + 1)),
			),
		saveSlot: (n) => saveGame(true, "pogranicze-slot-" + n),
		loadSlot: (n) => loadWithScreen("pogranicze-slot-" + n),
		// The situation report of the pause screen.
		situation: () => {
			if (!started || !game) return null;
			const me = game.viewer ?? 0,
				m = MISSIONS[game.missionId] || {},
				own = game.units(me),
				objectives = game.act2Objectives?.()?.length ? game.act2Objectives() : [{ text: m.campaign ? m.objective : (game.scenario && RTS.describeScenario?.(game.scenario)?.objective) || m.objective || "Zniszcz wszystkie wrogie centra dowodzenia.", done: false }],
				nextAttack = Number.isFinite(game.nextWave) && game.enemyBases?.().length ? game.nextWave - game.time : null,
				weather = game.weather;
			return {
				mission: m.name,
				planet: m.planet,
				time: timeLabel(game.time),
				metal: Math.floor(game.credits),
				gas: Math.floor(game.gas || 0),
				crystals: Math.floor(game.crystals || 0),
				army: own.filter((e) => e.type !== "worker" && RTS.TYPES[e.type]?.damage > 0).length,
				workers: own.filter((e) => e.type === "worker").length,
				buildings: game.entities.filter((e) => e.team === me && e.hp > 0 && !RTS.TYPES[e.type]?.speed).length,
				relays: `${game.nodes.filter((n) => n.owner === me).length} / ${game.nodes.length}`,
				objectives: objectives.slice(0, 5).map((o) => ({ text: o.text, done: !!o.done, failed: !!o.failed, secondary: !!o.secondary })),
				attack: nextAttack != null && nextAttack > 0 && nextAttack < 3600 ? timeLabel(nextAttack) : null,
				sky: game.space ? "✦ Orbita · " + (weather?.intensity > 0.05 ? weather.name.toLowerCase() : "spokojnie") : `${game.night > 0.5 ? "☾ Noc" : "☀ Dzień"} · ${weather?.intensity > 0.05 ? weather.name : "spokojna pogoda"}`,
				line: game.act2?.radio?.at(-1) || null,
			};
		},
		inspectSave,
		campaign: () => campaign.completed,
		rendererStatus: () => ({ mode: rendererMode, note: rendererNote }),
		campaignDetails: () => ({
			badges: campaign.badges,
			choices: campaign.choices,
			difficulty: campaign.difficulty,
		}),
		setCampaignDifficulty: (level) => campaign.setDifficulty(level),
		review: () =>
			started && game.act2 && !game.result
				? {
						missionId: game.missionId,
						objectives: game.act2Objectives(),
						radio: game.act2.radio,
					}
				: null,
		freeze: () => {
			paused = true;
			keys.clear();
			drag = null;
			pan = null;
			sound.silenceEffects();
		},
		start: launchWithScreen,
		load: () => loadWithScreen(),
		save: () => saveGame(true),
		leave: () => {
			endNetwork();
			started = false;
		},
		startNetwork,
		isNetwork: () => !!netSession,
		networkInfo: () =>
			netSession
				? { ping: netSession.ping, waiting: netSession.waiting, players: game.players, viewer: game.viewer, pause: game.netPause, pausesLeft: game.pausesLeft?.[game.viewer] ?? 0 }
				: null,
		sharedPause,
		surrender: () => act("surrender"),
		resume: () => {
			paused = false;
			sound.setMusicMode(musicModeFor(game));
			fit();
			updateHud();
		},
		music: (mode) => sound.setMusicMode(mode),
		speak: (who, text, opts) => sound.speak?.(who, text, opts),
		audio: () => sound,
		toggleSound,
		volume: (value) => {
			sound.setVolume(value);
			updateAudioControls();
		},
		mute: (value) => {
			sound.setMuted(value);
			updateAudioControls();
		},
	});
	document.querySelector(".brand").onclick = (e) => {
		e.preventDefault();
		menu.show(started && !finished ? "pause" : "home");
	};
	let last = performance.now(),
		accumulator = 0;
	// A hidden page gets no animation frames: a network battle then advances on a timer, so the other player
	// is not kept waiting (background timers are slowed down; the lockstep catches up to a few seconds at once).
	let hiddenLast = performance.now();
	function advanceHidden() {
		const now = performance.now();
		if (document.hidden && netSession && started && !finished) {
			netSession.advance(Math.min((now - hiddenLast) / 1000, 3));
			renderSharedPause();
			// The end screen (and its rematch offer) is ready when the player comes back.
			if (game.result && !finished) updateHud();
		}
		hiddenLast = now;
	}
	setInterval(advanceHidden, 100);
	function frame(now) {
		if (menu?.active) {
			// A network battle does not stop for a menu: the turns keep running.
			if (netSession && started && !finished) netSession.advance(Math.min((now - last) / 1000, 0.1));
			last = now;
			accumulator = 0;
			requestAnimationFrame(frame);
			return;
		}
		const dt = Math.min((now - last) / 1000, 0.1);
		last = now;
		if (netSession && started && !finished) {
			netSession.advance(dt);
			// The other player is late: say so (the battle waits).
			if (netSession.waiting > 1) toast("Czekam na drugiego gracza…");
		} else if (started && !paused && !finished) {
			accumulator += dt;
			let steps = 0;
			while (accumulator >= 1 / 30 && steps++ < 4) {
				game.tick(1 / 30);
				accumulator -= 1 / 30;
			}
			autosaveClock += dt;
			if (autosaveClock >= 10) {
				saveGame(true);
				autosaveClock = 0;
			}
		} else accumulator = 0;
		const speed = 650 / camera.zoom;
		// The 3D board turns around the view centre (, and . hold to turn, / faces north again); the
		// arrows then move along the screen, not the map axes.
		if (rendererMode === "three") {
			if (keys.has(",")) camera.yaw = (camera.yaw || 0) - 1.5 * dt;
			if (keys.has(".")) camera.yaw = (camera.yaw || 0) + 1.5 * dt;
			// PageUp raises the view towards the horizon and the sky, PageDown looks down again.
			if (keys.has("pageup")) camera.tilt = clamp((camera.tilt || 0) + 0.8 * dt, 0, 1);
			if (keys.has("pagedown")) camera.tilt = clamp((camera.tilt || 0) - 0.8 * dt, 0, 1);
		} else {
			camera.yaw = 0;
			camera.tilt = 0;
		}
		const yaw = camera.yaw || 0,
			ahead = (keys.has("arrowup") ? 1 : 0) - (keys.has("arrowdown") ? 1 : 0),
			side = (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0);
		camera.x += (side * Math.cos(yaw) - ahead * Math.sin(yaw)) * speed * dt;
		camera.y += (-side * Math.sin(yaw) - ahead * Math.cos(yaw)) * speed * dt;
		camera.x = clamp(camera.x, 0, W);
		camera.y = clamp(camera.y, 0, H);
		sound.update(game, {
			paused: paused || !!(netSession && game.netPause),
			hidden: document.hidden,
			cameraX: camera.x,
			cameraY: camera.y,
			viewWidth: width / scale,
			viewHeight: height / scale,
		});
		if (toastTimer > 0) {
			toastTimer -= dt;
			if (toastTimer <= 0) $("toast").classList.remove("visible");
		}
		hudTimer += dt;
		if (hudTimer > 0.12) {
			updateHud();
			renderChat();
			renderSharedPause();
			hudTimer = 0;
		}
		applyRenderer();
		panTowardsPointer();
		const renderStart = performance.now();
		render();
		SceneFX.measure(performance.now() - renderStart);
		const meter = document.querySelector("#render-meter");
		if (meter) {
			meter.hidden = !SceneFX.options.metrics;
			meter.textContent = `Rysowanie: ${SceneFX.metrics.mean.toFixed(1)} ms · p95 ${SceneFX.metrics.p95.toFixed(1)} ms · ${game.entities.length} obiektów`;
		}
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
	// A short boot screen while the page settles (once per load).
	if (typeof LoadingScreen !== "undefined") {
		const boot = LoadingScreen.show({ eyebrow: "WOLNE KOLONIE / SEKTOR 07", title: "Pogranicze Galaktyki", planet: "Pokład dowodzenia · uruchamianie systemów", biome: "ice", reduced: !!menu?.reduced, minTime: 1.4 });
		if (document.readyState === "complete") afterFrames(2, () => boot.done());
		else addEventListener("load", () => boot.done(), { once: true });
	}
})();
