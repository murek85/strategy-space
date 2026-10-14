/* The app of the battle: the game's state, the camera, the renderer, saves, the menu and the frame loop. Since 0.173
   (I4) its parts live in modules created here with one context each (getters for the state that changes):
   app-hud.js (the HUD), app-network.js (a network battle), app-story.js (decisions, epilogues, the end of a battle),
   app-deck.js (the command deck), app-controls.js (the side panel, mouse and keys) — docs/ARCHITEKTURA.md. */
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
	// The nearest element matching `selector` from an event's target (0.171.8): the target is not always an
	// element — a key event sent to the document or the window, or a text node — and had no closest().
	const closestTo = (target, selector) => (target?.nodeType === 1 ? target : target?.parentElement)?.closest?.(selector) || null;
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
		// DOW-01 (0.148): "patrol" or "escort" — the next right click gives that order.
		orderMode = false,
		strikeMode = null,
		// G2 (0.152): "drop" or "strike" — the next left click lands pods or calls the strike from orbit.
		orbitMode = null,
		finished = false;
	// Network play (netplay.js): the lockstep session, or null in a single-player battle.
	let netSession = null;
	// A player's action: run at once in a single-player battle; in a network battle sent to both computers and run
	// there a few turns later (the answer is optimistic: counts for the selection, true otherwise).
	const COUNTED = new Set(["hold", "demolish", "salvage", "sabotage", "board", "setRally", "patrol", "escort", "ability", "anchorJump", "mergeWardens"]);
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
	// The board's renderer in use: "three", "webgl", "webgpu" or "canvas" (diagnostics, the desktop app's self-check).
	window.currentRendererMode = () => rendererMode;
	// The render meter (found once) and what the army inspector shows (rebuilt only when it changes).
	let renderMeter = null,
		fpsMeter = null,
		armyInspectorSignature = null;
	const fpsCount = { frames: 0, since: performance.now(), value: 0 };
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
		// The map under a chapter (campaign-maps.js, act IV), so the chapters share its music (0.167).
		const map = RTS.CAMPAIGN_MAPS?.[g.missionId]?.map || RTS.ACT4?.[g.missionId]?.map || RTS.ACT3?.[g.missionId]?.map || g.missionId;
		// Space (0.145): themes in the manner of "Interstellar", one for each world.
		if (m.space) return { glacis: "game:glacis", abyss: "game:void", graveyard: "game:requiem", eosdocks: "game:docks", crimson: "game:nebula", comets: "game:comets" }[map] || "game:orbit";
		// The new worlds and maps (0.167).
		const own = {
			thalassa: "game:tide",
			crystals: "game:crystal",
			nadir: "game:ruins",
			bastion: "game:bastion",
			vesper: "game:archive",
			lanterns: "game:beacons",
			ashvalley: "game:ashes",
			// The remaining maps (0.168); the training range is on Eos too.
			training: "game:beacons",
			horizon: "game:dunes",
			frost: "game:frost",
			skyfall: "game:skyfall",
			solar: "game:oasis",
			colony4: "game:signal",
			colony5: "game:convoy",
		}[map];
		if (own) return own;
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
		// Longer messages for whoever needs the time (Ustawienia → Dostępność, 0.175.3).
		if (typeof Access !== "undefined") toastTimer *= Access.toastFactor;
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
		$("sound-volume").style.setProperty("--fill", Math.round(sound.volume * 100) + "%");
		menu?.syncAudio();
	}
	async function toggleSound() {
		sound.setMuted(!sound.muted);
		await sound.unlock();
		updateAudioControls();
		if (!sound.muted) sound.play("ready", { force: true });
		// Said aloud (0.172.8): M sits by N and the comma (laboratory, camera), the mute is remembered across sessions,
		// and it went by with only the icon on the top bar changing — the sound seemed lost.
		const note = sound.muted ? "Dźwięk wyłączony — M włącza go z powrotem." : "Dźwięk włączony.";
		if (menu?.active) menu.notice?.(note);
		else toast(note);
	}
	// The first press unlocks the sound; then the listeners go (0.171.13: every click and key of the session went
	// through the audio and its controls). Coming back to the window brings the music back without a press.
	const unlockSound = () => {
		sound.unlock().then((on) => {
			updateAudioControls();
			if (on) {
				document.removeEventListener("pointerdown", unlockSound, { capture: true });
				document.removeEventListener("keydown", unlockSound, { capture: true });
			}
		});
	};
	document.addEventListener("pointerdown", unlockSound, { capture: true });
	document.addEventListener("keydown", unlockSound, { capture: true });
	const soundBack = () => {
		if (sound.context && !document.hidden) sound.unlock().then(updateAudioControls);
	};
	window.addEventListener("focus", soundBack);
	// Any press brings the held sound back too (0.172.8): after a blur only the window's focus event did, and it does
	// not always come — an overlay, a screenshot tool or a dialog closed — so the battle went on silent while the
	// player clicked and pressed. Only a suspended context goes through the audio.
	const pressBack = () => {
		if (sound.context?.state === "suspended" && !sound.muted && !document.hidden) sound.unlock().then(updateAudioControls);
	};
	document.addEventListener("pointerdown", pressBack, { capture: true, passive: true });
	document.addEventListener("keydown", pressBack, { capture: true });
	document.addEventListener("click", (e) => {
		const button = closestTo(e.target, "button");
		if (
			button &&
			!button.disabled &&
			!["sound-toggle", "start", "resume-game", "play-again"].includes(
				button.id,
			)
		)
			sound.play("click");
	});
	// Leaving the window holds the whole sound where it is (and the films wait: menu.js); coming back goes on.
	window.addEventListener("blur", () => sound.suspend());
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) sound.suspend();
		else soundBack();
	});
	// Drawing lives in render-canvas.js; app.js keeps the camera, input and HUD and hands over a view each frame.
	const canvasRenderer = createCanvasRenderer(canvas, mini);
	let renderer = canvasRenderer,
		rendererMode = "canvas",
		rendererRequested = null,
		rendererNote = "";
	// The interface's pictures of the 3D models (model-icons.js) come from the same 3D code.
	if (typeof ModelIcons !== "undefined") ModelIcons.loader = () => load3D();
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
		// The board in use goes first (0.175.2): for a moment two of them held the GPU — two contexts, two worlds
		// in its memory — while the new one was built; meanwhile the Canvas 2D board stands in.
		if (renderer !== canvasRenderer) {
			const old = renderer;
			renderer = canvasRenderer;
			rendererMode = "canvas";
			canvasRenderer.setGame(game);
			old.destroy?.();
		}
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
	// Another board chosen in the settings during a battle (0.175.2): built at once behind a loading screen, not on
	// the first frame back on the map — there it froze the page for a second or more (the 3D world, its shaders)
	// with no word of what was happening.
	let switching = null;
	function switchRenderer() {
		if (switching || !started || finished || SceneFX.options.renderer === rendererRequested) return switching;
		const names = { three: "3D (Three.js)", webgl: "WebGL (PixiJS)", webgpu: "WebGPU (PixiJS)", canvas: "Canvas 2D" },
			m = MISSIONS[game.missionId] || {},
			screen = typeof LoadingScreen !== "undefined" ? LoadingScreen.show({ eyebrow: "GRAFIKA / SILNIK PLANSZY", title: "Zmiana silnika grafiki", planet: names[SceneFX.options.renderer] || SceneFX.options.renderer, biome: m.space ? spaceWorld(m) : m.biome, reduced: !!menu?.reduced, minTime: 0.8 }) : null;
		// Two frames for the screen to show, then the work; the new board draws once before the screen goes.
		const frames = (n) => new Promise((resolve) => {
			afterFrames(n, resolve);
			setTimeout(resolve, 400);
		});
		switching = frames(2)
			.then(() => applyRenderer())
			.then(() => {
				render();
				return frames(2);
			})
			.finally(() => {
				switching = null;
				screen?.done();
			});
		return switching;
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
	// The sides' colours of the view (accessibility.js: the palette for colour-blind players) — in the renderers'
	// table and on each unit and building.
	function repaint() {
		for (let t = 0; t < colors.length; t++) colors[t] = game.colorFor(t);
		if (typeof Access !== "undefined") Access.retint(game);
	}
	function terrainTexture() {
		syncWorld();
		repaint();
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
	// HUD (app-hud.js, 0.173): resources, the selection and its commands, alerts, the side panel's figures.
	const hud = createAppHud({
		$,
		MISSIONS,
		RESEARCH,
		TYPES,
		campaignStatus,
		fit,
		refreshFog,
		renderAct2Objectives: (...args) => story.renderAct2Objectives(...args),
		showChoice: (...args) => story.showChoice(...args),
		showDecision: (...args) => story.showDecision(...args),
		showEnd: (...args) => story.showEnd(...args),
		timeLabel,
		toast,
		get activeTab() {
			return activeTab;
		},
		set activeTab(value) {
			activeTab = value;
		},
		get armyInspectorSignature() {
			return armyInspectorSignature;
		},
		set armyInspectorSignature(value) {
			armyInspectorSignature = value;
		},
		get camera() {
			return camera;
		},
		set camera(value) {
			camera = value;
		},
		get choiceOpen() {
			return choiceOpen;
		},
		set choiceOpen(value) {
			choiceOpen = value;
		},
		get deckUi() {
			return deckUi;
		},
		get economyPanel() {
			return economyPanel;
		},
		set economyPanel(value) {
			economyPanel = value;
		},
		get finished() {
			return finished;
		},
		set finished(value) {
			finished = value;
		},
		get game() {
			return game;
		},
		set game(value) {
			game = value;
		},
		get lastGroupAt() {
			return lastGroupAt;
		},
		set lastGroupAt(value) {
			lastGroupAt = value;
		},
		get lastGroupKey() {
			return lastGroupKey;
		},
		set lastGroupKey(value) {
			lastGroupKey = value;
		},
		get menu() {
			return menu;
		},
		set menu(value) {
			menu = value;
		},
		get network() {
			return network;
		},
		get paused() {
			return paused;
		},
		set paused(value) {
			paused = value;
		},
		get productionSignature() {
			return productionSignature;
		},
		set productionSignature(value) {
			productionSignature = value;
		},
		get selected() {
			return selected;
		},
		set selected(value) {
			selected = value;
		},
		get started() {
			return started;
		},
		set started(value) {
			started = value;
		},
		get strikeMode() {
			return strikeMode;
		},
		set strikeMode(value) {
			strikeMode = value;
		},
	});
	// Network battle (app-network.js, 0.173): chat, shared pause, rematch, the session's start and end.
	const network = createAppNetwork({
		boardScreen,
		$,
		act,
		advanceHidden,
		decorateEnd: (...args) => story.decorateEnd(...args),
		restart,
		sound,
		timeLabel,
		toast,
		get finished() {
			return finished;
		},
		set finished(value) {
			finished = value;
		},
		get game() {
			return game;
		},
		set game(value) {
			game = value;
		},
		get menu() {
			return menu;
		},
		set menu(value) {
			menu = value;
		},
		get netSession() {
			return netSession;
		},
		set netSession(value) {
			netSession = value;
		},
		get paused() {
			return paused;
		},
		set paused(value) {
			paused = value;
		},
		get started() {
			return started;
		},
		set started(value) {
			started = value;
		},
	});
	// Story and end screens (app-story.js, 0.173): decisions, act II objectives, epilogues, the end of a battle.
	const story = createAppStory({
		$,
		MISSIONS,
		campaign,
		hud,
		launchWithScreen,
		network,
		saveGame,
		sound,
		timeLabel,
		get act2Signature() {
			return act2Signature;
		},
		set act2Signature(value) {
			act2Signature = value;
		},
		get audioStorage() {
			return audioStorage;
		},
		set audioStorage(value) {
			audioStorage = value;
		},
		get choiceOpen() {
			return choiceOpen;
		},
		set choiceOpen(value) {
			choiceOpen = value;
		},
		get game() {
			return game;
		},
		set game(value) {
			game = value;
		},
		get menu() {
			return menu;
		},
		set menu(value) {
			menu = value;
		},
		get netSession() {
			return netSession;
		},
		set netSession(value) {
			netSession = value;
		},
		get paused() {
			return paused;
		},
		set paused(value) {
			paused = value;
		},
		get started() {
			return started;
		},
		set started(value) {
			started = value;
		},
	});
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
					: m.act === 4
					? "Inwazja"
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
		hud.updateHud();
		saveGame(true);
	}
	function restart(missionId = "horizon", scenario = null, prepared = null) {
		if (!prepared) network.endNetwork();
		game = prepared || new Game(42, missionId);
		if (scenario && !prepared) game.configureSkirmish(scenario);
		// The campaign difficulty: the commander AI in its chapters and the enemy's strength.
		if (!prepared) game.applyCampaignLevel?.(campaign.difficulty);
		game.applyAct2Bonus?.(campaign.badges);
		// Act III: the consequences of the act II decision (Hefajstos).
		// Act IV: what the previous chapter left (the pods of X for XI).
		game.applyCampaignCarry?.(campaign.carry);
		game.applyCampaignChoices?.(campaign.choices);
		choiceOpen = false;
		$("overlay").classList.remove("end-overlay");
		act2Signature = "";
		for (let t = 0; t < colors.length; t++) colors[t] = game.colorFor(t);
		productionSignature = "";
		deckUi.deck(activeTab);
		selected = new Set(
			game
				.units((game.viewer ?? 0))
				.filter((e) => e.type !== "worker")
				.map((e) => e.id),
		);
		finished = false;
		building = false;
		wallDrag = null;
		attackMode = orderMode = false;
			orbitMode = null;
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
	// The world the loading screen arrives at, for a map in space (its look, space-rules.js).
	const spaceWorld = (m) => (m.look?.blackHole ? "spaceVoid" : m.look?.planet === "ice" ? "spaceIce" : m.look?.planet === "lava" ? "spaceLava" : "space");
	function launchWithScreen(missionId = "horizon", scenario = null, prepared = null) {
		// Inwazja (G2): the operation starts with the battle in orbit above the chosen planet.
		if (scenario?.mode === "invasion" && !scenario.invasion && !prepared && RTS.INVASION && !MISSIONS[missionId]?.space && !MISSIONS[missionId]?.campaign) {
			const orbit = RTS.INVASION.orbitFor[MISSIONS[missionId].biome] || "orbit";
			scenario = { ...scenario, mode: "conquest", invasion: { phase: "orbit", target: missionId } };
			missionId = orbit;
		}
		if (typeof LoadingScreen === "undefined" || prepared) return restart(missionId, scenario, prepared);
		const m = MISSIONS[missionId] || {},
			screen = LoadingScreen.show({
				eyebrow: scenario?.invasion ? (scenario.invasion.phase === "orbit" ? `INWAZJA · FAZA 1 — ORBITA NAD ${(MISSIONS[scenario.invasion.target]?.planet || "").toUpperCase()}` : "INWAZJA · FAZA 2 — LĄDOWANIE") : m.training ? "SZKOLENIE WOLNYCH KOLONII" : m.campaign ? "KAMPANIA · ODZYSKANY ŚWIT" : "OPERACJA NIEZALEŻNA",
				title: m.name,
				planet: m.planet,
				// The orbital battle arrives at the gas giant (loading-screen.js "space").
				biome: m.space ? spaceWorld(m) : m.theme === "ocean" || m.theme === "crystal" ? m.theme : m.biome,
				reduced: !!menu?.reduced,
			});
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				try {
					restart(missionId, scenario, prepared);
				} finally {
					boardReady(screen);
				}
			}),
		);
	}
	// The loading screen goes once the chosen board is up and has drawn (0.175.5): it went three frames after the
	// battle was built, but the board starts only on the first frame without the menu and the 3D one builds
	// asynchronously (its code, then its world) — so the battle showed first on the Canvas 2D board for a moment and
	// then jumped to 3D.
	// A battle that starts without a loading screen of its own (a network battle, its rematch): one while the chosen
	// board is not up yet.
	function boardScreen(eyebrow) {
		if (typeof LoadingScreen === "undefined" || SceneFX.options.renderer === rendererRequested) return;
		const m = MISSIONS[game.missionId] || {};
		boardReady(LoadingScreen.show({ eyebrow, title: m.name, planet: m.planet, biome: m.space ? spaceWorld(m) : m.theme === "ocean" || m.theme === "crystal" ? m.theme : m.biome, reduced: !!menu?.reduced, minTime: 0.6 }));
	}
	function boardReady(screen) {
		let gone = false;
		const done = () => {
			if (gone) return;
			gone = true;
			afterFrames(3, () => screen.done());
		};
		// (Should the board never come, the screen still goes: the battle is there on Canvas 2D.)
		setTimeout(done, 15000);
		Promise.resolve(applyRenderer())
			.then(() => render())
			.catch((error) => console.warn(error))
			.finally(done);
	}
	// Loading a save: the screen covers the board being rebuilt.
	function loadWithScreen(key) {
		const ok = loadGame(key);
		if (ok && typeof LoadingScreen !== "undefined") {
			const m = MISSIONS[game.missionId] || {},
				screen = LoadingScreen.show({ eyebrow: "WCZYTANY ZAPIS · " + timeLabel(game.time), title: m.name, planet: m.planet, biome: m.space ? spaceWorld(m) : m.theme === "ocean" || m.theme === "crystal" ? m.theme : m.biome, reduced: !!menu?.reduced, minTime: 1.2 });
			boardReady(screen);
		}
		return ok;
	}
	function afterFrames(n, fn) {
		if (n <= 0) return fn();
		requestAnimationFrame(() => afterFrames(n - 1, fn));
	}
	// The pause and why (0.175.3): "player" (Space, the button) or "blur" (the window lost focus). A bar over the board
	// says it for as long as the pause lasts — the message alone went in a few seconds, and whoever came back to the
	// window later saw a still board and a ▶ on the top bar.
	let pauseInfo = null,
		pauseBarShown = null;
	function togglePause(reason = "player") {
		// Not while a story decision waits (0.171.10): it holds the battle until one is taken.
		if (!started || finished || choiceOpen) return;
		if (netSession) {
			network.sharedPause();
			return;
		}
		paused = !paused;
		pauseInfo = paused ? { reason, since: performance.now(), at: game.time } : null;
		updatePauseBar();
		if (paused) sound.silence();
		// The music again after the pause (0.172.8): silence() stops its scheduler, and only a change of theme (the
		// menu, a loaded save) started it — after Space, Space the battle went on without music.
		else sound.setMusicMode(musicModeFor(game));
		// The bar says the pause; the message only the way back (0.175.3).
		if (!paused) toast("Operacja wznowiona.");
		hud.updateHud();
	}
	function pauseBar() {
		let bar = $("pause-bar");
		if (!bar) {
			bar = document.createElement("div");
			bar.id = "pause-bar";
			bar.className = "pause-bar";
			bar.setAttribute("role", "status");
			bar.hidden = true;
			bar.innerHTML = '<b class="pause-bar-title">Ⅱ PAUZA TAKTYCZNA</b><span class="pause-bar-why"></span><span class="pause-bar-time"></span><button type="button" id="pause-bar-resume" class="net-small">Wznów <kbd>Spacja</kbd></button>';
			$("battlefield").append(bar);
			$("pause-bar-resume").onclick = () => paused && togglePause();
		}
		return bar;
	}
	const clockOf = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
	// Shown while a battle with the computer is paused (not under a menu, not a network battle's shared pause);
	// written only when what it says changes.
	function updatePauseBar() {
		if (paused && !pauseInfo && started) pauseInfo = { reason: "player", since: performance.now(), at: game.time };
		if (!paused) pauseInfo = null;
		const show = !!(pauseInfo && started && !finished && !netSession && !choiceOpen);
		$("battlefield").classList.toggle("battle-paused", show);
		const bar = pauseBar();
		if (!show) {
			if (!bar.hidden) bar.hidden = true;
			pauseBarShown = null;
			return;
		}
		const away = Math.floor((performance.now() - pauseInfo.since) / 1000),
			why = pauseInfo.reason === "blur" ? "Gra wstrzymana, bo okno straciło fokus" : "Wstrzymana przez Ciebie — możesz wydawać rozkazy",
			time = `T+${clockOf(pauseInfo.at)} · pauza trwa ${away < 60 ? away + " s" : clockOf(away)}`,
			key = why + time;
		if (key === pauseBarShown) return;
		pauseBarShown = key;
		bar.hidden = false;
		bar.querySelector(".pause-bar-why").textContent = why;
		bar.querySelector(".pause-bar-time").textContent = time;
	}
	// Coming back to a battle that paused when the window was left: the bar flashes once.
	window.addEventListener("focus", () => {
		if (!pauseInfo || pauseInfo.reason !== "blur") return;
		updatePauseBar();
		const bar = $("pause-bar");
		if (!bar || bar.hidden) return;
		bar.classList.remove("flash");
		void bar.offsetWidth;
		bar.classList.add("flash");
	});
	function selectAll() {
		selected = new Set(
			game
				.units((game.viewer ?? 0))
				.filter((e) => e.type !== "worker")
				.map((e) => e.id),
		);
		hud.updateHud();
	}
	function economyAction(action) {
		if (!started) return;
		if (action.trade) {
			act("trade", ...action.trade);
			economyPanel.lastRefresh = -Infinity;
			hud.updateHud();
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
		hud.updateHud();
	}
	// Watchers (0.154): the ability of the selection — Sparks need a point (the next left click), Wardens phase at once.
	function watcherAbility() {
		const ids = [...selected].filter((id) => game.get(id)?.team === (game.viewer ?? 0));
		if (ids.some((id) => game.get(id)?.type === "spark")) return beginTarget("blink", "Skok: wskaż LPM punkt (do 260). PPM lub Esc — anuluj.");
		const n = act("ability", ids);
		toast(n ? `Faza: ${n} ${n === 1 ? "strażnik" : "strażników"} bez obrażeń przez 3 s.` : "Umiejętność jeszcze się odnawia.");
	}
	// A pointed order (the next left click): pods, strikes, blinks, jumps, the Core's flight.
	function beginTarget(mode, text) {
		building = attackMode = orderMode = false;
		strikeMode = null;
		orbitMode = mode;
		toast(text);
		hud.updateHud();
	}
	// DOW-01: the next right click patrols to a point or escorts a unit.
	function beginOrder(mode) {
		if (![...selected].some((id) => { const e = game.get(id); return e?.team === (game.viewer ?? 0) && TYPES[e.type].speed && TYPES[e.type].damage; })) {
			toast("Wybierz jednostki bojowe.");
			return;
		}
		building = false;
		attackMode = false;
		strikeMode = null;
		orderMode = mode;
		toast(mode === "patrol" ? "Patrol: wskaż PPM drugi koniec trasy. Esc — anuluj." : "Eskorta: wskaż PPM jednostkę lub budynek do ochrony. Esc — anuluj.");
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
		hud.updateHud();
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
		hud.updateHud();
	}
	function buy(type) {
		if (!started || finished) return;
		// In space the keys of the ground classes order the ships of the same class (space-rules.js).
		if (game.space) type = { trooper: "corvette", rocket: "frigate", tank: "lancer", heavy: "cruiser" }[type] || type;
		act("enqueue", type, hud.preferredProducer(type));
		hud.updateHud();
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
	// Saves imported from a file wait for the reload (0.171.13: leaving the page saved the running battle over the
	// imported autosave).
	let savesHeld = false;
	function saveGame(silent = false, key = SAVE_KEY) {
		if (!started || savesHeld) return false;
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
			deckUi.deck(activeTab);
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
			attackMode = orderMode = false;
			orbitMode = null;
			$("placement").hidden = true;
			$("overlay").hidden = true;
			missionLabels();
			terrainTexture();
			fit();
			sound.setMusicMode(musicModeFor(game));
			hud.updateHud();
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
	// The command deck (app-deck.js, 0.173): production, building and research cards, their tip, confirmations, the orbit panel.
	const deckUi = createAppDeck({
		$,
		RESEARCH,
		SAVE_KEY,
		TYPES,
		act,
		beginBuild,
		buy,
		clamp,
		economyAction,
		focusAlert: hud.focusAlert,
		loadGame,
		selectGroup: hud.selectGroup,
		selectIdle,
		selectWorkers,
		selectedProducer: hud.selectedProducer,
		// (Created after the deck: called when the deck is set up.)
		setupSidebar: () => controls.setupSidebar(),
		timeLabel,
		toast,
		updateHud: hud.updateHud,
		get activeTab() {
			return activeTab;
		},
		set activeTab(value) {
			activeTab = value;
		},
		get attackMode() {
			return attackMode;
		},
		set attackMode(value) {
			attackMode = value;
		},
		get building() {
			return building;
		},
		set building(value) {
			building = value;
		},
		get development() {
			return development;
		},
		set development(value) {
			development = value;
		},
		get economyPanel() {
			return economyPanel;
		},
		set economyPanel(value) {
			economyPanel = value;
		},
		get finished() {
			return finished;
		},
		set finished(value) {
			finished = value;
		},
		get game() {
			return game;
		},
		set game(value) {
			game = value;
		},
		get menu() {
			return menu;
		},
		set menu(value) {
			menu = value;
		},
		get netSession() {
			return netSession;
		},
		set netSession(value) {
			netSession = value;
		},
		get orbitMode() {
			return orbitMode;
		},
		set orbitMode(value) {
			orbitMode = value;
		},
		get orderMode() {
			return orderMode;
		},
		set orderMode(value) {
			orderMode = value;
		},
		get paused() {
			return paused;
		},
		set paused(value) {
			paused = value;
		},
		get started() {
			return started;
		},
		set started(value) {
			started = value;
		},
		get strikeMode() {
			return strikeMode;
		},
		set strikeMode(value) {
			strikeMode = value;
		},
	});
	// Controls (app-controls.js, 0.173): the side panel, the mouse and keys on the board and the minimap.
	const controls = createAppControls({
		$,
		TYPES,
		act,
		at,
		beginBuild,
		beginOrder,
		beginTarget,
		buy,
		campaign,
		canvas,
		clamp,
		closestTo,
		dist,
		fit,
		focusAlert: hud.focusAlert,
		keys,
		mini,
		network,
		pointer,
		saveGame,
		screen,
		selectAll,
		selectGroup: hud.selectGroup,
		selectIdle,
		selectWorkers,
		sound,
		toast,
		togglePause,
		toggleSound,
		updateHud: hud.updateHud,
		watcherAbility,
		world,
		zoom,
		get H() {
			return H;
		},
		set H(value) {
			H = value;
		},
		get W() {
			return W;
		},
		set W(value) {
			W = value;
		},
		get attackMode() {
			return attackMode;
		},
		set attackMode(value) {
			attackMode = value;
		},
		get building() {
			return building;
		},
		set building(value) {
			building = value;
		},
		get camera() {
			return camera;
		},
		set camera(value) {
			camera = value;
		},
		get choiceOpen() {
			return choiceOpen;
		},
		set choiceOpen(value) {
			choiceOpen = value;
		},
		get development() {
			return development;
		},
		set development(value) {
			development = value;
		},
		get drag() {
			return drag;
		},
		set drag(value) {
			drag = value;
		},
		get finished() {
			return finished;
		},
		set finished(value) {
			finished = value;
		},
		get game() {
			return game;
		},
		set game(value) {
			game = value;
		},
		get menu() {
			return menu;
		},
		set menu(value) {
			menu = value;
		},
		get mouse() {
			return mouse;
		},
		set mouse(value) {
			mouse = value;
		},
		get netSession() {
			return netSession;
		},
		set netSession(value) {
			netSession = value;
		},
		get orbitMode() {
			return orbitMode;
		},
		set orbitMode(value) {
			orbitMode = value;
		},
		get orderMode() {
			return orderMode;
		},
		set orderMode(value) {
			orderMode = value;
		},
		get pan() {
			return pan;
		},
		set pan(value) {
			pan = value;
		},
		get paused() {
			return paused;
		},
		set paused(value) {
			paused = value;
		},
		get renderer() {
			return renderer;
		},
		set renderer(value) {
			renderer = value;
		},
		get rendererMode() {
			return rendererMode;
		},
		set rendererMode(value) {
			rendererMode = value;
		},
		get scale() {
			return scale;
		},
		set scale(value) {
			scale = value;
		},
		get selected() {
			return selected;
		},
		set selected(value) {
			selected = value;
		},
		get started() {
			return started;
		},
		set started(value) {
			started = value;
		},
		get strikeMode() {
			return strikeMode;
		},
		set strikeMode(value) {
			strikeMode = value;
		},
		get wallDrag() {
			return wallDrag;
		},
		set wallDrag(value) {
			wallDrag = value;
		},
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
	deckUi.setupDeck();
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
			attackMode = orderMode = false;
			orbitMode = null;
			$("placement").hidden = true;
			sound.silenceEffects();
			return previous;
		},
		resume: (previous) => {
			paused = previous;
			hud.updateHud();
		},
		build: (type) => {
			beginBuild(type);
			hud.updateHud();
		},
		changed: () => hud.updateHud(),
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
	hud.updateHud();
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
		repaint,
		rendererChanged: switchRenderer,
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
			carry: campaign.carry,
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
			network.endNetwork();
			started = false;
		},
		startNetwork: network.startNetwork,
		isNetwork: () => !!netSession,
		networkInfo: () =>
			netSession
				? { ping: netSession.ping, waiting: netSession.waiting, players: game.players, viewer: game.viewer, foes: network.foes().map((p) => p.name).join(" i "), pause: game.netPause, pausesLeft: game.pausesLeft?.[game.viewer] ?? 0 }
				: null,
		sharedPause: network.sharedPause,
		surrender: () => act("surrender"),
		holdSaves: () => {
			savesHeld = true;
		},
		resume: () => {
			// A story decision still on screen keeps the battle held (0.171.10).
			paused = choiceOpen;
			sound.setMusicMode(musicModeFor(game));
			fit();
			hud.updateHud();
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
			network.renderSharedPause();
			// The end screen (and its rematch offer) is ready when the player comes back.
			if (game.result && !finished) hud.updateHud();
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
			hud.updateHud();
			updatePauseBar();
			network.renderChat();
			network.renderSharedPause();
			hudTimer = 0;
		}
		applyRenderer();
		panTowardsPointer();
		const renderStart = performance.now();
		render();
		SceneFX.measure(performance.now() - renderStart);
		// The frames per second: counted always (cheap), shown twice a second while the setting is on and the
		// board is in view (0.171.18). Green from 55, amber from 30, red below.
		fpsCount.frames++;
		const clockNow = performance.now(),
			fpsOn = !!SceneFX.options.fps && !menu?.active,
			fpsEl = (fpsMeter ||= document.getElementById("fps-meter"));
		if (clockNow - fpsCount.since >= 500) {
			fpsCount.value = (fpsCount.frames * 1000) / (clockNow - fpsCount.since);
			fpsCount.frames = 0;
			fpsCount.since = clockNow;
			if (fpsEl && fpsOn) {
				const v = Math.round(fpsCount.value);
				fpsEl.textContent = `${v} FPS`;
				fpsEl.dataset.level = v >= 55 ? "good" : v >= 30 ? "fair" : "poor";
			}
			// Automatic quality (0.175.8): only a running battle on the 3D board counts — a pause, the menu, a hidden
			// window or a loading screen leaves a gap, and the watch starts again (scene-fx.js autoTune).
			if (started && !paused && !menu?.active && rendererMode === "three" && document.visibilityState === "visible" && !document.querySelector(".loading-screen")) {
				const before = SceneFX.autoLevel,
					level = SceneFX.autoTune(fpsCount.value, clockNow);
				if (level !== null && level > before) toast(`Automatyczna jakość: grafika uproszczona (stopień ${level} z ${SceneFX.AUTO_MAX}), bo liczba klatek spadła. Wróci sama, gdy będzie zapas — Ustawienia → Grafika.`);
			}
		}
		if (fpsEl && fpsEl.hidden === fpsOn) fpsEl.hidden = !fpsOn;
		// The render meter: found once, written only while it is shown (0.171.13: a query and a text every frame).
		const meter = (renderMeter ||= document.getElementById("render-meter"));
		if (meter) {
			const on = !!SceneFX.options.metrics;
			if (meter.hidden === on) meter.hidden = !on;
			if (on) meter.textContent = `Rysowanie: ${SceneFX.metrics.mean.toFixed(1)} ms · p95 ${SceneFX.metrics.p95.toFixed(1)} ms · ${game.entities.length} obiektów`;
		}
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
	// The start screen (once per load): the emblem and a bar while the page settles, then a click or a key — which
	// also lets the sound in, so the menu's music starts at once.
	if (typeof LoadingScreen !== "undefined") {
		// Settled: loaded and two frames drawn — or half a second after the load (frames stop in a hidden window).
		let settled = false;
		const settle = () => {
			afterFrames(2, () => (settled = true));
			setTimeout(() => (settled = true), 500);
		};
		if (document.readyState === "complete") settle();
		else addEventListener("load", settle, { once: true });
		LoadingScreen.boot({ version: typeof GAME_VERSION !== "undefined" ? GAME_VERSION : "", reduced: !!menu?.reduced, ready: () => settled, onPress: unlockSound });
		// The 3D board's code loads while the menu is up (only the code: no GPU context, no world), so a battle's
		// loading screen waits for less (0.175.5).
		if (SceneFX.options.renderer === "three") {
			const warm = () => setTimeout(() => load3D().catch(() => {}), 1500);
			if (document.readyState === "complete") warm();
			else addEventListener("load", warm, { once: true });
		}
	} else document.getElementById("boot-cover")?.remove();
})();
