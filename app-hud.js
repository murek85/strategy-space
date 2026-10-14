/* The battle's HUD (0.173, I4 — split out of app.js unchanged): the top bar of resources and power, the card of
   the selection with its commands, groups and producers, the base alerts, the logistics and objectives panels,
   updated by updateHud(). app.js hands over its state through `app` (getters for what changes). */
function createAppHud(app) {
	"use strict";
	const { $, MISSIONS, RESEARCH, TYPES, campaignStatus, fit, refreshFog, renderAct2Objectives, showChoice, showDecision, showEnd, timeLabel, toast } = app;
	function selectedProducer() {
		const es = [...app.selected].map((id) => app.game.get(id));
		return es.length === 1 && app.game.isProducer(es[0]) ? es[0] : null;
	}
	function preferredProducer(type) {
		const b = selectedProducer();
		return b?.type === app.game.productionType(type) ? b.id : null;
	}
	function selectGroup(number, assign = false, append = false) {
		if (!app.started || app.finished) return;
		if (assign) {
			const members = app.game.assignGroup(number, [...app.selected], append);
			toast(
				members.length
					? `Grupa ${number}: ${members.length} jednostek.`
					: `Grupa ${number} wyczyszczona.`,
			);
		} else {
			const ids = app.game.recallGroup(number);
			if (!ids.length) {
				toast(
					`Grupa ${number} pusta. Zaznacz jednostki i naciśnij Ctrl+${number}.`,
				);
				return;
			}
			app.selected = new Set(ids);
			const now = performance.now();
			if (app.lastGroupKey === number && now - app.lastGroupAt < 400) {
				const es = ids.map((id) => app.game.get(id));
				app.camera.x = es.reduce((n, e) => n + e.x, 0) / es.length;
				app.camera.y = es.reduce((n, e) => n + e.y, 0) / es.length;
				fit();
			}
			app.lastGroupKey = number;
			app.lastGroupAt = now;
		}
		updateHud();
	}
	function focusAlert() {
		const a = app.game.baseAlert;
		if (!a) return;
		app.camera.x = a.x;
		app.camera.y = a.y;
		app.camera.zoom = Math.max(app.camera.zoom, 1.6);
		fit();
	}
	function updateCommandHud() {
		const b = selectedProducer();
		$("rally-hint").hidden = !b;
		$("rally-hint").textContent = b
			? `${app.game.entityName(b)} #${b.id} · PPM na mapie ustawia punkt zbiórki`
			: "";
		document.querySelectorAll("[data-group]").forEach((button) => {
			const ids = app.game.recallGroup(button.dataset.group);
			button.querySelector("small").textContent = ids.length || "—";
			button.classList.toggle("assigned", !!ids.length);
			button.classList.toggle(
				"selected",
				ids.length > 0 &&
					ids.length === app.selected.size &&
					ids.every((id) => app.selected.has(id)),
			);
		});
		const alarm = app.game.baseAlert && app.game.baseAlert.until > app.game.time;
		$("base-alert").hidden = !alarm;
		if (alarm)
			$("base-alert").textContent =
				`⚠ BAZA ATAKOWANA · ${app.game.baseAlert.name} · pokaż [J]`;
		const factories = app.game.entities.filter((e) => app.game.isProducer(e));
		const model = factories.map((e) => {
			const queue = app.game.buildingQueue(e.id),
				q = queue[0];
			return {
				id: e.id,
				type: e.type,
				construction: Math.ceil(e.constructionLeft),
				count: queue.length,
				unit: q?.type,
				left: q ? Math.ceil(q.left) : 0,
				selected: app.selected.has(e.id),
			};
		});
		const orphanCount = app.game.queue.filter(
			(q) => q.producerId == null,
		).length;
		// (The icons' version too: a model's picture that has just come in writes the list again.)
		const signature = JSON.stringify([model, orphanCount, typeof ModelIcons !== "undefined" ? ModelIcons.version : 0]);
		if (signature !== app.productionSignature) {
			app.productionSignature = signature;
			$("building-queues").innerHTML =
				model
					.map(
						(e) =>
							`<button class="building-queue ${e.selected ? "selected" : ""}" data-producer="${e.id}">${modelIcon(e.type, "queue-icon")}<span class="building-queue-copy"><span>${app.game.unitName(e.type)} #${e.id}<b>${e.count}/10</b></span><small>${e.unit && !e.construction ? modelIcon(e.unit, "queue-unit-icon") : ""}${e.construction ? "Budowa · " + e.construction + " s" : e.unit ? app.game.unitName(e.unit) + " · " + e.left + " s" : "Wolna kolejka · wybierz budynek"}</small></span></button>`,
					)
					.join("") +
				(orphanCount
					? `<p class="orphan-queue">${orphanCount} zadań czeka na odbudowę.</p>`
					: "");
			document.querySelectorAll("[data-producer]").forEach(
				(button) =>
					(button.onclick = () => {
						app.selected = new Set([Number(button.dataset.producer)]);
						app.deckUi.deck("army");
					}),
			);
		}
	}
	// A 3D model's icon in the player's faction and colour (0.175.14, model-icons.js), or nothing until it is rendered.
	function iconEntity(type, team = app.game.viewer ?? 0) {
		return { id: 1, type, team, faction: app.game.factionFor(team)?.key || "colonies", tint: app.game.colorFor(team), x: 0, y: 0, hp: 1, maxHp: 1, angle: 0, cargo: 0 };
	}
	function iconUrl(type, team) {
		if (typeof ModelIcons === "undefined" || !TYPES[type]) return null;
		const e = iconEntity(type, team);
		return ModelIcons.url(e, { colors: [e.tint], space: !!app.game.space });
	}
	function modelIcon(type, cls) {
		const url = iconUrl(type);
		return url ? `<img class="model-icon ${cls}" src="${url}" alt="">` : "";
	}
	// An icon element shown only when its picture is there; written only when it changes.
	function setIcon(el, type, team, fallback = "") {
		if (!el) return;
		const url = type ? iconUrl(type, team) : null,
			key = url ? type + "|" + team + "|" + url.length : "glyph";
		if (el.dataset.iconKey === key) return;
		el.dataset.iconKey = key;
		if (url) el.innerHTML = `<img class="model-icon" src="${url}" alt="">`;
		else el.textContent = fallback;
		el.classList.toggle("has-model", !!url);
	}
	function workersForExtractor(id) {
		return app.game
			.units((app.game.viewer ?? 0))
			.filter(
				(e) => e.order?.kind === "gas" && e.order.extractorId === id,
			).length;
	}
	function updateHud() {
		const weather = app.game.weather,
			forecast = app.game.forecast;
		// Space (the orbital battle): no weather and no night.
		if ($("weather-status") && app.game.space)
			$("weather-status").textContent =
				"✦ ORBITA · " +
				(weather.intensity > 0.05
					? weather.name +
						(weather.kind === "ion"
							? " · celność −" + Math.round(weather.intensity * 30 * (app.game.upgrades.guidance ? 0.25 : 1)) + "%" + (app.game.ionStorm?.() ? " · osłony nie odnawiają się" : "")
							: weather.kind === "solar"
								? " · promieniowanie wyczerpuje osłony, nie odnawiają się"
								: " · uderzenia odłamków" + (app.game.upgrades.meteorShield ? " (osłony −80%)" : " · zbadaj osłony przeciwmeteorytowe"))
					: "Spokojnie") +
				(forecast ? " · " + (weather.remaining > 0 ? "Koniec za " + Math.ceil(weather.remaining) + " s" : weather.name + " za " + Math.ceil(weather.until) + " s") : app.game.stormOutlook?.near ? " · " + weather.name + " nadciąga · ok. " + Math.ceil(app.game.stormOutlook.until) + " s" : " · Prognoza: zbadaj monitoring w laboratorium");
		else if ($("weather-status"))
			$("weather-status").textContent =
				`${app.game.night > 0.5 ? "☾ NOC" : "☀ DZIEŃ"} · ${weather.intensity > 0.05 ? weather.name + " · ruch −" + Math.round(weather.intensity * 35 * (app.game.upgrades.mobility ? 0.25 : 1)) + "% · celność −" + Math.round(weather.intensity * 30 * (app.game.upgrades.guidance ? 0.25 : 1)) + "%" : "Spokojna pogoda"}${forecast ? " · " + (weather.remaining > 0 ? "Koniec za " + Math.ceil(weather.remaining) + " s" : weather.name + " " + (app.game.stormOutlook?.from || "") + " za " + Math.ceil(weather.until) + " s") : app.game.stormOutlook?.near ? " · " + weather.name + " nadciąga " + app.game.stormOutlook.from + " · ok. " + Math.ceil(app.game.stormOutlook.until) + " s" : " · Prognoza: zbadaj monitoring w laboratorium"}`;

		if ($("toggle-gate")) {
			const gate = app.game.get([...app.selected][0]);
			$("toggle-gate").hidden =
				app.selected.size !== 1 || gate?.type !== "gate";
			$("toggle-gate").textContent = gate?.open
				? "Zamknij bramę"
				: "Otwórz bramę";
		}
		if ($("development-open"))
			$("development-open").disabled = !app.started || app.finished;
		app.economyPanel?.update(app.game, app.started);
		refreshFog();
		for (const id of app.selected) if (!app.game.get(id)) app.selected.delete(id);
		$("credits").textContent = Math.floor(app.game.credits).toLocaleString(
			"pl-PL",
		);
		$("income").textContent = `+${app.game.income}/s`;
		$("income").title =
			"Dochód pasywny centrum i przekaźników. Pełny dochód: Logistyka → Bilans.";
		// The viewer's army (0.171.13: team 0's — a network guest saw the host's).
		$("population").textContent = `${app.game.population(app.game.viewer ?? 0)} / ${RTS.POP_CAP}`;
		$("clock").textContent = timeLabel(app.game.time);
		if (app.game.network) app.network.networkIntel();
		else {
			const waves = Number.isFinite(app.game.nextWave) && (app.game.enemyBases().length || app.game.modeState?.mode === "survival");
			$("wave").previousElementSibling.textContent = app.game.aiActive?.()
				? "Planowany atak"
				: "Następny desant";
			$("wave").textContent = waves ? timeLabel(Math.max(0, app.game.nextWave - app.game.time)) : "—";
			// Clamped (0.152.1): an attack overdue or far off gave widths beyond the track (a long sideways scroll).
			$("wave-progress").style.width = waves
				? `${Math.max(0, Math.min(100, 100 * (1 - (app.game.nextWave - app.game.time) / Math.max(35, 65 - app.game.wave * 3))))}%`
				: "0%";
		}
		$("obj-capture").classList.toggle("done", app.game.captured);
		$("obj-army").classList.toggle("done", app.game.population(app.game.viewer ?? 0) >= 12);
		$("obj-hq").classList.toggle("done", (app.game.resultFor?.() ?? app.game.result) === "victory");
		const es = [...app.selected].map((id) => app.game.get(id)).filter(Boolean);
		{
			const count = new Map();
			for (const e of es) count.set(e.type + "|" + e.team, (count.get(e.type + "|" + e.team) || 0) + 1);
			const top = [...count].sort((a, b) => b[1] - a[1])[0]?.[0].split("|");
			setIcon($("selection-icon"), top?.[0], top ? Number(top[1]) : 0, "⌁");
		}
		$("selection-title").textContent =
			es.length === 1
				? TYPES[es[0].type].name
				: es.length
					? `Oddział · ${es.length} jednostek`
					: "Brak zaznaczenia";
		$("selection-detail").textContent = es.length
			? `${Math.ceil(es.reduce((a, e) => a + e.hp, 0))} PW · ${es.some((e) => e.order?.kind === "build") ? "buduje" : es.some((e) => e.order?.kind === "gas") ? "wydobywa gaz" : es.some((e) => e.order?.kind === "gather") ? "wydobywa rudę" : es.some((e) => e.order?.kind === "repair") ? "naprawia" : es.some((e) => e.order?.kind === "hold") ? "utrzymuje pozycję" : es.some((e) => e.order?.kind === "escort") ? "eskortuje" : es.some((e) => e.patrol) ? "patroluje" : es.some((e) => e.target) ? "w walce" : es.some((e) => ["trooper", "rocket"].includes(e.type) && app.game.cover(e)) ? "w osłonie" : "gotowość"}`
			: "LPM lub przeciągnij ramkę";
		if (es.length === 1 && es[0].type === "extractor") {
			const b = es[0],
				field = app.game.gasFields.find((o) => o.id === b.gasId),
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
				: `${(es[0].repairTargets || []).length}/2 stanowiska · ${app.game.credits <= 0 ? "brak metalu" : `${Math.round(16 * app.game.power.factor)} PW/s na pojazd`} · 1 metal / 5 PW · pod ostrzałem ×¼`;
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
				: `${(app.game.wrecks || []).length} wraków na mapie · PPM robotem na wraku`;
		if (one?.type === "saboteur")
			$("selection-detail").textContent = `${one.stealth ? "Ukryci" : "WYKRYCI"} · ${(one.chargeReady || 0) > app.game.time ? "ładunek za " + Math.ceil(one.chargeReady - app.game.time) + " s" : "ładunek gotowy"} · PPM na wrogim budynku`;
		if (one?.type === "drone") $("selection-detail").textContent = `${Math.ceil(one.hp)} PW · zwiad z powietrza, widzi na ${support.drone.sight}`;
		if (one?.module && one.team === (app.game.viewer ?? 0))
			$("selection-detail").textContent += ` · ${RTS.MODULES[one.module].name}${one.moduleLeft > 0 ? " (montaż " + Math.ceil(one.moduleLeft) + " s)" : ""}`;
		if ($("orbital-strike")) {
			const uplink = one?.type === "uplink" && one.team === (app.game.viewer ?? 0) ? one : null;
			$("orbital-strike").hidden = !uplink;
			if (uplink) {
				const why = app.game.strikeRequirement(uplink.id);
				$("orbital-strike").disabled = !!why;
				$("orbital-strike").textContent = app.strikeMode ? "Wskaż cel (Esc — anuluj)" : why && /gotowe za/.test(why) ? why.replace("Uderzenie gotowe", "Uderzenie") : "Uderzenie orbitalne";
				$("orbital-strike").title = why || "Wskaż zbadany punkt na mapie. Po 3 s: do 420 obrażeń w promieniu 110 — tylko wrogom. Odnowienie 100 s.";
			}
		}
		if ($("module-a")) {
			const options = one && one.team === (app.game.viewer ?? 0) && !one.constructionLeft && !one.module ? app.game.moduleOptions(one) : [];
			[$("module-a"), $("module-b")].forEach((button, i) => {
				const option = options[i];
				button.hidden = !option;
				if (!option) return;
				button.textContent = "Moduł: " + option.name;
				button.title = `${option.effect} Koszt ${support.module.metal} metalu + ${support.module.gas} gazu, montaż ${support.module.install} s. Jeden moduł na budynek. ${app.game.moduleRequirement(one)}`;
				button.disabled = !!app.game.moduleRequirement(one);
			});
		}
		if (es.length === 1 && es[0].type === "hq" && es[0].team === (app.game.viewer ?? 0))
			$("selection-detail").textContent =
				`Centrum ${app.game.centerLevel()} — ${["", "Przyczółek · rozbudowa w BADANIA / F2", "Kolonia", "Twierdza"][app.game.centerLevel()]}${app.game.doctrineOf?.(app.game.viewer ?? 0) ? " · " + app.game.doctrineOf(app.game.viewer ?? 0).name.replace("Doktryna: ", "doktryna ") : ""}${["colony", "fortress"].includes(app.game.research?.kind) ? " · rozbudowa " + Math.floor(100 * (1 - app.game.research.left / app.game.research.total)) + "%" : ""}`;
		if ($("army-formation")) {
			for (const button of $("army-formation").querySelectorAll("button"))
				button.setAttribute("aria-checked", String(button.dataset.formation === (app.game.formation || "line")));
			const carrier = es.find(
				(e) => e.type === "transport" && e.team === (app.game.viewer ?? 0),
			);
			$("load-transport").hidden = !carrier;
			// Watchers (0.154): abilities, merging, jumps between Anchors, the flying Core.
			const mine = es.filter((e) => e.team === (app.game.viewer ?? 0) && e.hp > 0),
				anchors = app.game.entities.filter((e) => e.type === "anchor" && e.team === (app.game.viewer ?? 0) && e.hp > 0 && !e.constructionLeft);
			$("watcher-ability").hidden = !mine.some((e) => e.type === "spark" || e.type === "warden");
			$("watcher-merge").hidden = mine.filter((e) => e.type === "warden").length < 2;
			$("watcher-jump").hidden = anchors.length < 2 || !mine.some((e) => RTS.TYPES[e.type].speed && anchors.some((a) => Math.hypot(a.x - e.x, a.y - e.y) < RTS.WATCHERS.anchor.jumpReach));
			$("core-relocate").hidden = !(mine.length === 1 && mine[0].type === "hq" && mine[0].faction === "watchers");
			$("unload-transport").hidden = !carrier;
			$("load-transport").disabled =
				!carrier || (carrier.passengers || []).length >= 4;
			$("unload-transport").disabled =
				!carrier ||
				!es.some((e) => e.type === "transport" && e.passengers?.length);
			if (carrier && es.length === 1)
				$("selection-detail").textContent =
					`${Math.ceil(carrier.hp)} PW · załoga ${(carrier.passengers || []).length}/4 · PPM piechotą: załaduj`;
			// Rebuilt only when what it shows changes (0.171.13: about 8 times a second, also hidden).
			const rows = app.game.combatReport([...app.selected]),
				inspectorSignature = JSON.stringify(rows);
			if (inspectorSignature !== app.armyInspectorSignature) {
			app.armyInspectorSignature = inspectorSignature;
			$("army-inspector").innerHTML =
				'<h3>Wybrany oddział</h3><p class="eco-note">Parametry w obecnej pogodzie. Obrażenia przed premiami przeciw typom celów i ich osłonom; premie badań i frakcji uwzględnione. Porównaj typy, zaznaczając kilka jednostek.</p>' +
				rows
					.map(
						(r) =>
							`<article class="army-stat"><strong>${r.name} × ${r.count}</strong><p>${r.role}</p><dl><dt>Wytrzymałość</dt><dd>${r.hp} / ${r.maxHp}</dd><dt>Zasięg / trafienie</dt><dd>${r.range} / ${r.damage}</dd><dt>Odstęp strzałów</dt><dd>${r.cooldown} s</dd><dt>Ruch / celność</dt><dd>${r.speed} / ${r.accuracy}%</dd><dt>Cena jednostkowa</dt><dd>${r.cost || 0} metalu</dd>${r.type === "transport" ? `<dt>Załoga</dt><dd>${r.passengers} / ${r.count * 4}</dd>` : ""}${r.cover ? `<dt>W osłonie</dt><dd>${r.cover}</dd>` : ""}</dl></article>`,
					)
					.join("");
			}
		}
		if ($("demolish"))
			$("demolish").hidden = !es.some(
				(e) => e.team === (app.game.viewer ?? 0) && !TYPES[e.type].speed && e.type !== "hq",
			);
		const chosen = selectedProducer(),
			displayQueue = chosen ? app.game.buildingQueue(chosen.id) : app.game.queue;
		const construction =
			app.game.entities.find(
				(e) => e.team === (app.game.viewer ?? 0) && e.constructionLeft && app.selected.has(e.id),
			) || app.game.entities.find((e) => e.team === (app.game.viewer ?? 0) && e.constructionLeft);
		const q =
			app.activeTab === "research"
				? app.game.research
				: app.activeTab === "build"
					? construction
						? {
								type: construction.type,
								left: construction.constructionLeft,
								total: TYPES[construction.type].construction,
							}
						: null
					: displayQueue[0];
		const productionBlocked =
			app.activeTab === "army" && q?.type && !app.game.get(q.producerId);
		setIcon($("queue-icon"), q?.type && !q.kind ? q.type : null, app.game.viewer ?? 0, "");
		$("queue-status").textContent = q
			? `${q.kind ? RESEARCH[q.kind].name.toUpperCase() : app.game.unitName(q.type).toUpperCase()} · ${productionBlocked ? "BRAK BUDYNKU" : Math.ceil(q.left) + " S"}${app.activeTab === "army" ? " · " + displayQueue.length : ""}`
			: "BRAK ZADAŃ";
		$("queue-progress").style.width = q
			? `${100 * (1 - q.left / q.total)}%`
			: "0%";
		const track = document.querySelector(".queue-track");
		track.setAttribute("role", "progressbar");
		track.setAttribute(
			"aria-label",
			app.activeTab === "build"
				? "Postęp budowy"
				: app.activeTab === "research"
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
				p = app.game.producer(type, preferredProducer(type)),
				requirement = app.game.developmentRequirement(type),
				locked = !p || !!requirement,
				full = p && app.game.buildingQueue(p.id).length >= 10;
			b.disabled =
				!app.started ||
				!!app.game.result ||
				app.game.credits < app.game.cost(type) ||
				locked ||
				full ||
				app.game.population(app.game.viewer ?? 0) + app.game.queue.length >= RTS.POP_CAP;
			b.classList.toggle("locked", locked);
			b.querySelector("small").textContent = requirement
				? requirement
				: full
					? "Kolejka pełna"
					: !p
						? "Brak wolnego budynku"
						: `${app.game.entityName(p)} #${p.id}${p.module ? " · " + RTS.MODULES[p.module].name : ""}`;
		});
		document.querySelectorAll("[data-build]").forEach((b) => {
			b.disabled =
				!app.started ||
				!!app.game.result ||
				!!app.game.developmentRequirement(b.dataset.build) ||
				app.game.credits < app.game.cost(b.dataset.build) ||
				!app.game.units((app.game.viewer ?? 0)).some((e) => e.type === "worker");
			b.dataset.tip =
				b.disabled && !app.game.units((app.game.viewer ?? 0)).some((e) => e.type === "worker")
					? "Potrzebny robot budowlany"
					: app.game.developmentRequirement(b.dataset.build) ||
						b.dataset.description;
			const status = b.querySelector(".card-status");
			if (status)
				status.textContent = app.game.developmentRequirement(
					b.dataset.build,
				);
		});
		document.querySelectorAll("[data-research]").forEach((b) => {
			const kind = b.dataset.research,
				availability = app.game.researchStatus(kind),
				status = availability.reason;
			const working = app.game.research?.kind === kind,
				done = working ? 1 - app.game.research.left / app.game.research.total : 0;
			b.disabled = !app.started || !availability.allowed;
			b.querySelector("small").textContent = working ? `${Math.floor(done * 100)}% · zostało ${Math.ceil(app.game.research.left)} s${app.game.power.factor < 1 ? " · tempo " + Math.round(app.game.power.factor * 100) + "%" : ""}` : status;
			b.dataset.state = availability.state;
			b.classList.toggle("is-complete", !!app.game.upgrades[kind]);
			b.classList.toggle("is-working", working);
			const bar = b.querySelector(".research-progress");
			if (bar) bar.style.width = `${working ? done * 100 : availability.state === "done" ? 100 : 0}%`;
		});
		app.deckUi.renderCardTip();
		app.deckUi.renderOrbitPanel();
		// With no research under way, the research tab counts what has been researched.
		if (app.activeTab === "research" && !app.game.research) {
			const all = [...document.querySelectorAll("[data-research]")];
			$("queue-status").textContent = `ZBADANE ${all.filter((b) => b.dataset.state === "done").length} / ${all.length} · BRAK BADANIA`;
		}
		const workers = app.game.units((app.game.viewer ?? 0)).filter((e) => e.type === "worker");
		$("workers-status").textContent =
			`${workers.filter((e) => ["gather", "gas", "repair", "build", "salvage"].includes(e.order?.kind)).length} / ${workers.length}`;
		$("mined-status").textContent = Math.floor(app.game.mined);
		$("explored-status").textContent =
			`${Math.round((app.game.explored.filter(Boolean).length / app.game.explored.length) * 100)}%`;
		$("cancel-queue").title =
			app.activeTab === "research"
				? "Anuluj badanie — pełny zwrot wszystkich surowców"
				: "Anuluj ostatnią jednostkę i odzyskaj metal";
		$("gas").textContent = Math.floor(app.game.gas);
		$("crystals").textContent = Math.floor(app.game.crystals);
		const power = app.game.power;
		$("power").textContent =
			`${power.demand}/${power.supply}${power.discharge > 0 ? " +" + Math.round(power.discharge) : ""}`;
		$("power").classList.toggle("power-shortage", power.factor < 1);
		$("power").parentElement.title =
			`Zapotrzebowanie / moc. Tempo produkcji wojska i badań: ${Math.round(power.factor * 100)}%.`;
		$("power-warning").hidden = power.factor >= 1;
		$("power-warning").textContent =
			`NIEDOBÓR MOCY · tempo ${Math.round(power.factor * 100)}% · zbuduj reaktor [C]`;
		const modeText = app.game.modeStatus?.() || "";
		$("campaign-objectives").hidden =
			!MISSIONS[app.game.missionId].campaign && !modeText;
		if (app.game.act2) renderAct2Objectives();
		else
			$("campaign-objectives").textContent = modeText || campaignStatus();
		for (const id of ["obj-capture", "obj-army", "obj-hq"])
			$(id).hidden = app.game.missionId === "training" || !!app.game.act2;
		document.querySelector(".intel").hidden =
			app.game.missionId === "training" ||
			(!!app.game.act2 && !app.game.enemyBases().length);
		if (
			app.game.act2?.decision === "pending" &&
			app.started &&
			!app.finished &&
			!app.choiceOpen &&
			!app.menu?.active
		)
			showChoice();
		if (app.game.campaignDecision?.state === "pending" && app.started && !app.finished && !app.choiceOpen && !app.menu?.active) showDecision();
		$("idle-workers").textContent =
			`Bezczynne roboty: ${app.game.idleWorkers().length} [Z]`;
		$("idle-workers").disabled = !app.started || !app.game.idleWorkers().length;
		$("economy-tip").textContent =
			`Ładunek: ${app.game.cargoCapacity} rudy lub kryształów. PPM na ekstraktorze: przydziel jednego robota. Gaz: 2/s podczas pracy.`;
		$("cancel-queue").disabled =
			app.activeTab === "build"
				? true
				: app.activeTab === "research"
					? !app.game.research
					: !displayQueue.length;
		$("save-game").disabled = !app.started;
		updateCommandHud();
		$("pause").textContent = app.paused ? "▶" : "Ⅱ";
		$("pause").setAttribute("aria-label", "Otwórz menu pauzy");
		$("pause").title = "Menu pauzy [Esc]";
		if (app.game.network);
		else if (app.game.aiActive?.())
			$("intel-text").textContent = app.game.wave
				? `Atak ${app.game.wave} wykryty. Przeciwnik ma własne roboty i koszary — zniszczenie jego robotów i fabryk osłabi kolejne ataki.`
				: "Przeciwnik rozbudowuje bazę i wydobywa rudę. Atak nastąpi, gdy zbierze wystarczające siły.";
		else if (app.game.wave)
			$("intel-text").textContent =
				`Desant ${app.game.wave} wykryty. Rakietowcy są skuteczni przeciw pancerzowi i wrogim budynkom.`;
		if (app.game.events.length) toast(app.game.events.splice(0).at(-1));
		if (app.game.result && !app.finished) {
			app.finished = true;
			showEnd();
		}
	}
	return {
		selectedProducer,
		preferredProducer,
		selectGroup,
		focusAlert,
		updateHud,
	};
}
