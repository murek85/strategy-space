/* The controls of the battle (0.173, I4 — split out of app.js unchanged): the side panel (meters, tools, groups,
   formations), the mouse on the board and the minimap (selection, orders, building, the camera) and the keys.
   Created once by app.js, which hands over its state through `app` (getters for what changes); the listeners are
   attached when it is created, where they were before. */
function createAppControls(app) {
	"use strict";
	const { $, TYPES, act, at, beginBuild, beginOrder, beginTarget, buy, campaign, canvas, clamp, closestTo, dist, fit, focusAlert, keys, mini, network, pointer, saveGame, screen, selectAll, selectGroup, selectIdle, selectWorkers, sound, toast, togglePause, toggleSound, updateHud, watcherAbility, world, zoom } = app;
	function setupSidebar() {
		const meter = document.createElement("div");
		meter.id = "render-meter";
		meter.hidden = true;
		meter.setAttribute("aria-label", "Czas renderowania");
		document.body.append(meter);
		// The frames-per-second counter (settings: "Licznik FPS", 0.171.18): the first item of the board's tool strip,
		// in line with the zoom buttons (0.171.19: it stood over them at the edge of the board).
		const fpsMeter = document.createElement("div");
		fpsMeter.id = "fps-meter";
		fpsMeter.hidden = true;
		fpsMeter.setAttribute("aria-label", "Klatki na sekundę");
		const tools = document.querySelector(".map-tools");
		if (tools) tools.prepend(fpsMeter);
		else document.body.append(fpsMeter);
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
			button.title = `${name} — ponowne kliknięcie zwija panel`;
			button.onclick = () => {
				// The drawer over the board (0.149): the open tab clicked again folds it, any tab unfolds it.
				const fold = button.getAttribute("aria-pressed") === "true" && !sidebar.classList.contains("collapsed");
				sidebar.classList.toggle("collapsed", fold);
				try {
					localStorage.setItem("hud.drawerCollapsed", fold ? "1" : "0");
				} catch {}
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
		try {
			sidebar.classList.toggle("collapsed", localStorage.getItem("hud.drawerCollapsed") === "1");
		} catch {}
		document
			.querySelector(".selection-actions")
			.insertAdjacentHTML(
				"beforeend",
				'<button id="inspect-army">Statystyki</button><div class="formation-control" id="army-formation" role="radiogroup" aria-label="Formacja oddziału"><span class="formation-label">Formacja</span><div class="formation-options"><button type="button" role="radio" data-formation="line" title="Linia — jeden szereg w poprzek kierunku marszu: cały oddział strzela naraz"><svg viewBox="0 0 16 10" aria-hidden="true"><circle cx="2" cy="5" r="1.5"/><circle cx="6" cy="5" r="1.5"/><circle cx="10" cy="5" r="1.5"/><circle cx="14" cy="5" r="1.5"/></svg>Linia</button><button type="button" role="radio" data-formation="column" title="Kolumna — dwójkami, wąski szyk na przejścia i mosty"><svg viewBox="0 0 16 10" aria-hidden="true"><circle cx="6" cy="1.6" r="1.3"/><circle cx="10" cy="1.6" r="1.3"/><circle cx="6" cy="5" r="1.3"/><circle cx="10" cy="5" r="1.3"/><circle cx="6" cy="8.4" r="1.3"/><circle cx="10" cy="8.4" r="1.3"/></svg>Kolumna</button><button type="button" role="radio" data-formation="spread" title="Rozproszenie — siatka z dużymi odstępami"><svg viewBox="0 0 16 10" aria-hidden="true"><circle cx="2" cy="1.6" r="1.3"/><circle cx="8" cy="1.6" r="1.3"/><circle cx="14" cy="1.6" r="1.3"/><circle cx="2" cy="8.4" r="1.3"/><circle cx="8" cy="8.4" r="1.3"/><circle cx="14" cy="8.4" r="1.3"/></svg>Rozprosz.</button></div></div><button id="load-transport" hidden>Załaduj</button><button id="unload-transport" hidden>Wyładuj</button><button id="hold-position">Pozycja <kbd>⇧S</kbd></button><button id="watcher-ability" hidden title="Umiejętność: iskry skaczą we wskazany punkt (LPM), strażnicy wchodzą w fazę.">Umiejętność <kbd>⇧Q</kbd></button><button id="watcher-merge" hidden title="Dwaj strażnicy obok siebie scalają się w konstrukt.">Scal</button><button id="watcher-jump" hidden title="Jednostki przy kotwicy przeskakują do wskazanej kotwicy (LPM).">Do kotwicy</button><button id="core-relocate" hidden title="Rdzeń wznosi się i leci na wskazane miejsce (LPM), co 120 s.">Przenieś rdzeń</button><button id="patrol-order" title="Patrol: PPM wskazuje drugi koniec trasy — oddział krąży między nim a obecną pozycją, walcząc po drodze.">Patrol <kbd>⇧P</kbd></button><button id="escort-order" title="Eskorta: PPM na własnej jednostce lub budynku — oddział trzyma się przy nim i go broni.">Eskorta <kbd>⇧E</kbd></button><button id=toggle-gate hidden>Otwórz / zamknij</button><button id="module-a" hidden></button><button id="module-b" hidden></button><button id="orbital-strike" hidden>Uderzenie orbitalne</button><button id="demolish" hidden title="Zwrot: do 50% za budowlę, 100% za fundament. Centrum nie można rozebrać.">Rozbierz</button>',
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
			const wasPaused = app.paused;
			app.paused = true;
			$("army-stats-content").innerHTML = $("army-inspector").innerHTML;
			statsDialog.onclose = () => {
				app.paused = wasPaused;
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
			const c = [...app.selected]
				.map((id) => app.game.get(id))
				.find((e) => e?.type === "transport" && e.team === (app.game.viewer ?? 0));
			if (!c) return;
			const nearby = app.game
				.units((app.game.viewer ?? 0))
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
			for (const id of app.selected) act("unload", id);
			updateHud();
		};
		$("demolish").onclick = () => {
			act("demolish", [...app.selected]);
			app.selected = new Set([...app.selected].filter((id) => app.game.get(id)));
			updateHud();
		};
		$("watcher-ability").onclick = () => watcherAbility();
		$("watcher-merge").onclick = () => {
			const n = act("mergeWardens", [...app.selected]);
			if (!n) toast("Strażnicy muszą stać obok siebie (do 140).");
		};
		$("watcher-jump").onclick = () => beginTarget("jump", "Do kotwicy: wskaż LPM kotwicę docelową. PPM lub Esc — anuluj.");
		$("core-relocate").onclick = () => beginTarget("core", "Przenieś rdzeń: wskaż LPM miejsce lądowania (widoczny, wolny teren, do 1100). PPM lub Esc — anuluj.");
		$("patrol-order").onclick = () => beginOrder("patrol");
		$("escort-order").onclick = () => beginOrder("escort");
		$("hold-position").onclick = () => {
			const count = act("hold", [...app.selected]);
			toast(
				count
					? `${count} jednostek utrzymuje pozycję.`
					: "Wybierz jednostki bojowe.",
			);
			updateHud();
		};
		$("orbital-strike").onclick = () => {
			const b = app.game.get([...app.selected][0]);
			if (!b || b.type !== "uplink") return;
			const why = app.game.strikeRequirement(b.id);
			if (why) return toast(why);
			app.strikeMode = b.id;
			app.building = false;
			app.attackMode = app.orderMode = false;
			app.orbitMode = null;
			toast("Wskaż cel uderzenia orbitalnego (LPM). PPM lub Esc — anuluj.");
		};
		for (const [id, index] of [
			["module-a", 0],
			["module-b", 1],
		])
			$(id).onclick = () => {
				const b = app.game.get([...app.selected][0]),
					option = app.game.moduleOptions?.(b)[index];
				if (!b || !option) return;
				toast(
					act("installModule", b.id, option.key)
						? `${option.name} — montaż rozpoczęty.`
						: app.game.moduleRequirement(b) || "Nie można zamontować modułu.",
				);
				updateHud();
			};
		$("toggle-gate").onclick = () => {
			const gate = app.game.get([...app.selected][0]);
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
		if (!app.started || app.finished) return;
		canvas.focus();
		app.mouse = pointer(e);
		const p = world(app.mouse);
		if (e.button === 1) {
			e.preventDefault();
			// On the 3D board: Alt + middle button turns (sideways) and tilts (up and down) the camera; a plain drag keeps the grabbed ground
			// point under the pointer (the board is in perspective, so flat-frame deltas are not enough).
			app.pan = { ...app.mouse, cx: app.camera.x, cy: app.camera.y, ground: p, turn: e.altKey && app.rendererMode === "three", sx: e.clientX, sy: e.clientY, client: { x: e.clientX, y: e.clientY }, yaw: app.camera.yaw || 0, tilt: app.camera.tilt || 0 };
			canvas.setPointerCapture(e.pointerId);
			return;
		}
		if (e.button === 2) {
			e.preventDefault();
			if (app.strikeMode) {
				app.strikeMode = null;
				toast("Uderzenie orbitalne anulowane.");
				return;
			}
			if (app.orbitMode) {
				app.orbitMode = null;
				toast(app.game.invasion ? "Rozkaz z orbity anulowany." : "Anulowano.");
				updateHud();
				return;
			}
			if (app.building) {
				app.building = false;
				app.wallDrag = null;
				$("placement").hidden = true;
				return;
			}
			if (!app.selected.size) {
				toast("Najpierw zaznacz oddział (LPM lub F).");
				return;
			}
			const ore = app.game.ores.find(
				(o) =>
					o.amount > 0 && app.game.isVisible(o.x, o.y) && dist(o, p) < 55,
			);
			const friendly = at(p, 0);
			const ids = [...app.selected];
			// DOW-01: patrol to the point, or escort the own (or allied) unit or building under the cursor.
			if (app.orderMode) {
				const mode = app.orderMode;
				app.orderMode = false;
				if (mode === "patrol") {
					const count = act("patrol", ids, p.x, p.y);
					toast(count ? `${count} jednostek patroluje trasę.` : "Patrol: wybierz jednostki bojowe i dalszy punkt trasy.");
					if (count) app.game.effects.push({ kind: "command", x: p.x, y: p.y, attack: true, life: 0.7, maxLife: 0.7 });
				} else {
					const viewer = app.game.viewer ?? 0,
						guarded =
							friendly ||
							app.game.entities
								.filter((u) => u.hp > 0 && app.game.allied?.(viewer, u.team) && app.game.isVisible(u.x, u.y) && dist(p, u) < Math.max(TYPES[u.type].radius + 10, 16 / app.scale))
								.sort((a, b) => dist(a, p) - dist(b, p))[0];
					const count = guarded ? act("escort", ids, guarded.id) : 0;
					toast(count ? `${count} jednostek eskortuje: ${TYPES[guarded.type].name}.` : "Eskorta: wskaż PPM własną jednostkę lub budynek.");
				}
				updateHud();
				return;
			}
			if (
				friendly?.type === "transport" &&
				ids.some((id) =>
					["trooper", "rocket"].includes(app.game.get(id)?.type),
				)
			) {
				toast(
					act("board", ids, friendly.id)
						? "Piechota idzie do transportera."
						: "Transporter pełny lub brak piechoty.",
				);
				return;
			}
			if (ids.every((id) => app.game.isProducer(app.game.get(id)))) {
				const count = act("setRally", ids, p.x, p.y);
				toast(
					count
						? "Ustawiono punkt zbiórki nowych jednostek."
						: "Nie można wyznaczyć drogi do punktu.",
				);
				return;
			}
			// Stage E: workers on a wreck recover metal; saboteurs on an enemy building plant a charge.
			const wreck = (app.game.wrecks || []).find(
				(w) => app.game.explored[app.game.visionIndex(w.x, w.y)] && dist(w, p) < w.size + 22,
			);
			if (wreck && ids.some((id) => app.game.get(id)?.type === "worker")) {
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
				ids.some((id) => app.game.get(id)?.type === "saboteur")
			) {
				const saboteurs = ids.filter((id) => app.game.get(id)?.type === "saboteur");
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
			const crystal = app.game.crystalFields.find(
				(o) =>
					o.amount > 0 && app.game.isVisible(o.x, o.y) && dist(o, p) < 50,
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
				app.attackMode || keys.has("a"),
			);
			app.game.effects.push({
				kind: "command",
				x: p.x,
				y: p.y,
				attack: !!target || app.attackMode,
				life: 0.7,
				maxLife: 0.7,
			});
			app.attackMode = app.orderMode = false;
			app.orbitMode = null;
			return;
		}
		if (e.button === 0) {
			if (app.orbitMode) {
				const mode = app.orbitMode;
				app.orbitMode = null;
				const ids = [...app.selected];
				if (mode === "blink") {
					const n = act("ability", ids, p.x, p.y);
					if (!n) toast("Skok jeszcze się odnawia.");
				} else if (mode === "jump") {
					const anchor = app.game.entities.filter((e) => e.type === "anchor" && e.team === (app.game.viewer ?? 0) && e.hp > 0).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
					const n = anchor && Math.hypot(anchor.x - p.x, anchor.y - p.y) < 90 ? act("anchorJump", ids, anchor.id) : 0;
					if (!n) toast("Wskaż kotwicę docelową; skaczą jednostki stojące przy innej kotwicy (co 8 s).");
				} else if (mode === "core") act("relocateCore", ids[0], p.x, p.y);
				else act(mode === "drop" ? "orbitalDrop" : "orbitStrike", p.x, p.y);
				updateHud();
				return;
			}
			if (app.strikeMode) {
				const id = app.strikeMode;
				app.strikeMode = null;
				act("orbitalStrike", id, p.x, p.y);
				return;
			}
			if (app.building) {
				if (app.building === "wall") {
					app.wallDrag = { ...p, circle: e.altKey };
					canvas.setPointerCapture(e.pointerId);
					return;
				}
				if (act("buildStructure", app.building, p.x, p.y, [...app.selected])) {
					app.building = false;
					app.wallDrag = null;
					$("placement").hidden = true;
				}
				updateHud();
				return;
			}
			app.drag = { ...app.mouse, shift: e.shiftKey };
			canvas.setPointerCapture(e.pointerId);
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		app.mouse = pointer(e);
		if (app.pan?.turn) {
			app.camera.yaw = app.pan.yaw + (e.clientX - app.pan.sx) * 0.008;
			app.camera.tilt = clamp(app.pan.tilt + (app.pan.sy - e.clientY) * 0.004, 0, 1);
		}
		// 3D: only remember where the pointer is; the camera follows once per frame (panTowardsPointer),
		// because the 3D view (and so the ground under the pointer) changes only when a frame is drawn.
		else if (app.pan && app.rendererMode === "three") app.pan.client = { x: e.clientX, y: e.clientY };
		else if (app.pan) {
			app.camera.x = clamp(app.pan.cx - (app.mouse.x - app.pan.x) / app.scale, 0, app.W);
			app.camera.y = clamp(app.pan.cy - (app.mouse.y - app.pan.y) / app.scale, 0, app.H);
		}
	});
	canvas.addEventListener("pointerup", (e) => {
		if (app.wallDrag && e.button === 0) {
			app.mouse = pointer(e);
			if (act("buildWallLine", app.wallDrag, world(app.mouse), [...app.selected])) {
				app.building = false;
				$("placement").hidden = true;
			}
			app.wallDrag = null;
			updateHud();
			return;
		}

		if (e.button === 1) {
			app.pan = null;
			return;
		}
		if (!app.drag || e.button !== 0) return;
		app.mouse = pointer(e);
		if (!app.drag.shift) app.selected.clear();
		if (dist(app.drag, app.mouse) > 5) {
			// The box is a rectangle on the screen; with the 2.5D tilt the board is in perspective beneath it.
			const onScreen = (p) => (app.renderer.fromFlat ? app.renderer.fromFlat(p) : p),
				a = onScreen(app.drag),
				b = onScreen(app.mouse);
			app.game.units((app.game.viewer ?? 0))
				.filter((u) => {
					const q = onScreen(screen(u));
					return (
						q.x >= Math.min(a.x, b.x) &&
						q.x <= Math.max(a.x, b.x) &&
						q.y >= Math.min(a.y, b.y) &&
						q.y <= Math.max(a.y, b.y)
					);
				})
				.forEach((u) => app.selected.add(u.id));
		} else {
			const unit = at(world(app.mouse), 0);
			if (unit) {
				if (app.drag.shift && app.selected.has(unit.id))
					app.selected.delete(unit.id);
				else app.selected.add(unit.id);
			}
		}
		app.drag = null;
		if (app.selected.size) sound.play("radio");
		updateHud();
	});
	canvas.addEventListener("pointercancel", () => {
		app.wallDrag = null;
		app.drag = null;
		app.pan = null;
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
		app.camera.x = ((e.clientX - r.left) / r.width) * app.W;
		app.camera.y = ((e.clientY - r.top) / r.height) * app.H;
		if (app.camera.zoom === 1) app.camera.zoom = 1.65;
		fit();
	});
	window.addEventListener("keydown", (e) => {
		if (app.development?.active) {
			if (e.key === "Escape") {
				e.preventDefault();
				app.development.close();
			}
			return;
		}
		// Tests: Ctrl+Shift+L in the menu unlocks the whole campaign, pressed again brings back the earlier progress.
		if (app.menu?.active && e.ctrlKey && e.shiftKey && e.code === "KeyL") {
			e.preventDefault();
			if (e.repeat) return;
			const unlocked = campaign.toggleUnlockAll();
			if (["home", "single", "campaign"].includes(app.menu.screen)) app.menu.show(app.menu.screen);
			app.menu.notice?.(unlocked ? "Tryb testowy: cała kampania odblokowana (Ctrl+Shift+L przywraca postęp)." : "Przywrócono wcześniejszy postęp kampanii.");
			return;
		}
		if (e.key === "F2" && !app.menu?.active && app.started && !app.finished) {
			e.preventDefault();
			if (!e.repeat) app.development?.open();
			return;
		}
		// A story decision on screen holds the battle (0.171.10): Space and Escape resumed it behind the choice. Only
		// Tab, Enter and Space on its buttons get through (to move between them and take one).
		if (app.choiceOpen && !app.menu?.active) {
			if (!(["Tab", "Enter", " "].includes(e.key) && closestTo(e.target, "#overlay button"))) e.preventDefault();
			return;
		}
		// An open dialog (army statistics, a confirmation) has the keys first: Escape closes it, not the battle
		// (0.171.13: Escape opened the pause menu behind the army statistics).
		if (!app.menu?.active && (document.querySelector("#army-stats-dialog")?.open || (typeof GameDialog !== "undefined" && GameDialog.isOpen()))) return;
		if (e.key === "Escape") {
			e.preventDefault();
			if (e.repeat) return;
			if (app.menu?.active) app.menu.escape();
			else if (app.building || app.attackMode || app.orderMode || app.strikeMode || app.orbitMode) {
				app.building = false;
				app.wallDrag = null;
				app.attackMode = app.orderMode = false;
				app.strikeMode = null;
				app.orbitMode = null;
				$("placement").hidden = true;
			} else if (app.started && !app.finished) app.menu.show("pause");
			return;
		}
		if (app.menu?.active) {
			if (
				e.key.toLowerCase() === "m" &&
				!e.ctrlKey &&
				!e.metaKey &&
				!closestTo(e.target, "input,select,textarea")
			) {
				e.preventDefault();
				if (!e.repeat) toggleSound();
			}
			return;
		}
		if (closestTo(e.target, "input,select,textarea")) return;
		// Space and Enter press a focused button (0.171.13: Space paused the battle instead).
		if ((e.key === " " || e.key === "Enter") && closestTo(e.target, "button")) return;
		if (e.key === "Enter" && app.netSession && app.started && !app.finished) {
			e.preventDefault();
			network.openChat();
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
		if (/^[1-9]$/.test(groupKey) && app.started) {
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
		if (e.repeat || !app.started) return;
		if (e.shiftKey && (key === "p" || key === "e")) beginOrder(key === "p" ? "patrol" : "escort");
		else if (e.shiftKey && key === "q" && app.selected.size) watcherAbility();
		else if (key === " ") togglePause();
		else if (key === "/") {
			app.camera.yaw = 0;
			app.camera.tilt = 0;
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
				const count = act("hold", [...app.selected]);
				toast(
					count
						? `${count} jednostek utrzymuje pozycję.`
						: "Wybierz jednostki bojowe.",
				);
			} else act("stop", [...app.selected]);
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
			app.attackMode = true;
			toast("Atak w marszu: wskaż cel prawym przyciskiem myszy.");
		} else if (key === "h") {
			const b = app.game.hq((app.game.viewer ?? 0));
			if (b) {
				app.camera.x = b.x + 150;
				app.camera.y = b.y - 150;
				app.camera.zoom = 1.8;
				fit();
			}
		} else if (key === "home") {
			app.camera = { x: app.W / 2, y: app.H / 2, zoom: 1 };
			fit();
		}
	});
	window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
	window.addEventListener("blur", () => {
		keys.clear();
		app.drag = null;
		app.pan = null;
		// A network battle never pauses (the other player keeps playing); the player may turn it off (Dostępność).
		if (app.started && !app.finished && !app.paused && !app.netSession && (typeof Access === "undefined" || Access.autoPause)) togglePause("blur");
	});
	return {
		setupSidebar,
	};
}
