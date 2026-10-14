/* The command deck of the battle (0.173, I4 — split out of app.js unchanged): the cards of the army, buildings and
   research with their pages and tips, the in-game confirmations (doctrines), and the orbit panel of an invasion.
   app.js hands over its state through `app` (getters for what changes) and calls what this returns. */
function createAppDeck(app) {
	"use strict";
	const { $, RESEARCH, SAVE_KEY, TYPES, act, beginBuild, buy, clamp, economyAction, focusAlert, loadGame, selectGroup, selectIdle, selectWorkers, selectedProducer, setupSidebar, timeLabel, toast, updateHud } = app;
	const deckPages = { army: 0, build: 0, research: 0 };
	// The field of each research, shown as a tag on its card.
	const RESEARCH_FIELDS = {
		colony: "KOLONIA",
		fortress: "TWIERDZA",
		doctrineMobility: "DOKTRYNA",
		doctrineBridgehead: "DOKTRYNA",
		doctrineBarrage: "DOKTRYNA",
		doctrineShields: "DOKTRYNA",
		doctrineTide: "DOKTRYNA",
		doctrineCarapace: "DOKTRYNA",
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
		// Compact cards (0.150): the slot width and the number of rows come from the stylesheet.
		const style = getComputedStyle(list),
			slot = parseFloat(style.getPropertyValue("--deck-slot")) || 180,
			rows = parseInt(style.getPropertyValue("--deck-rows")) || 1,
			columns = Math.max(1, Math.min(12, Math.floor((list.clientWidth + 8) / slot))),
			count = columns * rows,
			pages = Math.ceil(cards.length / count);
		const focused = cards.indexOf(document.activeElement);
		if (focused >= 0 && !delta)
			deckPages[app.activeTab] = Math.floor(focused / count);
		const page = clamp(deckPages[app.activeTab] + delta, 0, pages - 1);
		deckPages[app.activeTab] = page;
		// The same tile width in every tab (0.150.1): a tab with fewer cards than columns leaves the rest of the row
		// empty instead of stretching its tiles.
		list.style.setProperty("--deck-columns", columns);
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
	// A window over a production card (0.150): the compact card shows its name and cost, the rest is here — the
	// description, the unit's figures, the building or what is missing, the full cost and the key.
	let tipCard = null;
	function setupCardTip() {
		const tip = document.createElement("div");
		tip.id = "card-tip";
		tip.className = "card-tip";
		tip.setAttribute("role", "tooltip");
		tip.hidden = true;
		document.body.append(tip);
		// Hit-testing finds disabled cards too (they get no mouse events of their own).
		const pick = (card) => {
			if (card === tipCard) return;
			tipCard = card;
			renderCardTip();
		};
		document.addEventListener("pointermove", (e) => pick(document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".production .unit-card") || null));
		document.addEventListener("focusin", (e) => pick(e.target.closest?.(".production .unit-card") || null));
		document.addEventListener("pointerdown", () => pick(null), true);
	}
	function renderCardTip() {
		const tip = $("card-tip");
		if (!tip) return;
		const card = tipCard;
		if (!card || card.hidden || !card.isConnected || app.menu?.active) {
			tip.hidden = true;
			return;
		}
		const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]),
			name = card.querySelector("strong")?.textContent || "",
			description = card.dataset.description || card.querySelector(".card-description")?.textContent || "",
			status = card.querySelector(".card-status")?.textContent || "",
			extra = card.dataset.tip && card.dataset.tip !== description && card.dataset.tip !== status ? card.dataset.tip : "",
			s = card.dataset.unit ? TYPES[card.dataset.unit] : null,
			figures = s ? [`${s.hp} PW`, s.damage ? `obrażenia ${s.damage}` : "", s.range ? `zasięg ${s.range}` : "", s.speed ? `ruch ${s.speed}` : ""].filter(Boolean).join(" · ") : "",
			key = card.querySelector("kbd")?.textContent || "",
			warn = card.disabled || card.classList.contains("locked");
		tip.innerHTML =
			`<strong>${esc(name)}${key ? ` <kbd>${esc(key)}</kbd>` : ""}</strong>` +
			(description ? `<p>${esc(description)}</p>` : "") +
			(figures ? `<p class="card-tip-figures">${esc(figures)}</p>` : "") +
			(status ? `<p class="card-tip-status${warn ? " warn" : ""}">${esc(status)}</p>` : "") +
			(extra ? `<p class="card-tip-status${warn ? " warn" : ""}">${esc(extra)}</p>` : "") +
			`<p class="card-tip-cost">${card.querySelector(".unit-copy b")?.innerHTML || ""}</p>`;
		tip.hidden = false;
		const r = card.getBoundingClientRect(),
			w = tip.offsetWidth;
		tip.style.left = `${clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8)}px`;
		tip.style.bottom = `${innerHeight - r.top + 8}px`;
	}
	// The game's confirmation window (game-dialog.js); a single-player battle waits while it is open, as it did
	// under the browser's confirm().
	async function confirmInGame(options) {
		if (typeof GameDialog === "undefined") return window.confirm(`${options.title}\n\n${options.text || ""}`);
		const hold = !app.netSession && app.started && !app.paused;
		if (hold) app.paused = true;
		try {
			return await GameDialog.confirm(options);
		} finally {
			if (hold) app.paused = false;
			updateHud();
		}
	}
	// A doctrine: what it gives, which one it locks for the rest of the operation, what it costs.
	function confirmDoctrine(kind) {
		const r = RESEARCH[kind],
			list = RTS.DOCTRINES?.[app.game.doctrineFaction?.()] || [],
			d = list.find((x) => x.id === kind),
			other = list.find((x) => x.id !== kind);
		return confirmInGame({
			eyebrow: "DOKTRYNA FRAKCJI · WYBÓR OSTATECZNY",
			title: r.name.replace("Doktryna: ", ""),
			text: d?.effect || r.description,
			sections: other ? [{ label: "Zostanie zablokowana do końca operacji", text: `${other.name.replace("Doktryna: ", "")} — ${other.effect}`, tone: "warn" }] : [],
			facts: [
				["Koszt", `${r.metal} metalu${r.gas ? ` · ${r.gas} gazu` : ""}${r.crystals ? ` · ${r.crystals} kryształów` : ""}`],
				["Czas", `${r.time} s w centrum dowodzenia`],
			],
			ok: "Przyjmij doktrynę",
			cancel: "Anuluj",
		});
	}
	function deck(tabName) {
		app.activeTab = tabName;
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
		const faction = app.game.factionFor((app.game.viewer ?? 0))?.key;
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
		// Centre level III and the doctrines of the side's faction (doctrine-rules.js), after the Colony.
		if (RESEARCH.fortress)
			groups.research.splice(
				1,
				0,
				["fortress", RESEARCH.fortress.name, RESEARCH.fortress.description, "Ⅲ", ""],
				...(app.game.doctrines?.(app.game.viewer ?? 0) || []).map((d) => [d.id, d.name.replace("Doktryna: ", "Doktryna · "), d.effect, "✪", ""]),
			);
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
			watchers: {
				build: [
					["anchor", "Kotwica", "Strefa budowy, szczeliny i teleporty · wszędzie przy bazie", "⟐", ""],
					["resonator", "Rezonator", "Dochód ze złoża lub przekaźnika — zamiast górników", "◎", ""],
				],
				army: [
					["spark", "Iskra", "Szybka · Skok co 10 s (⇧Q) · kuźnia fazowa", "✦", ""],
					["prism", "Pryzmat", "Wiązka narasta na jednym celu · wielka kuźnia", "◇", ""],
					["arc", "Łuk", "Wyładowanie łańcuchowe · wielka kuźnia", "⌒", ""],
					["warden", "Strażnik", "Faza 3 s (⇧Q); dwóch scala się w konstrukt · wielka kuźnia", "⬢", ""],
				],
			},
			dominion: {
				build: [["uplink", "Stacja orbitalna", "Uderzenie orbitalne co 100 s · 40 mocy", "⊕", ""]],
				army: [
					["flamer", "Miotacze ognia", "Pali piechotę i budynki · koszary", "♨", ""],
					["destroyer", "Niszczyciel czołgów", "Daleki zasięg przeciw pojazdom · fabryka", "➹", ""],
				],
			},
		}[app.game.factionFor((app.game.viewer ?? 0))?.key];
		if (kit) {
			groups.build.push(...kit.build);
			groups.army.push(...kit.army);
		}
		// Act III after the evacuation of Hefajstos: the Dominium's tank destroyer, lent by Varn.
		if (app.game.loanedUnit?.("destroyer") && !groups.army.some(([type]) => type === "destroyer"))
			groups.army.push(["destroyer", "Niszczyciel czołgów", "Wsparcie Dominium (akt II) · fabryka", "➹", ""]);
		groups.army.push(
			["skyguard", "Wóz przeciwlotniczy", "Mobilna OPL · fabryka", "✺", ""],
			["drone", "Dron zwiadowczy", "Zwiad z powietrza · koszary", "✢", ""],
			["saboteur", "Sabotażyści", "Wyłączają wrogie budynki · koszary", "☍", ""],
		);
		// Orbital battle (space-rules.js): ships instead of ground units, orbital descriptions of the stations.
		if (app.game.space) {
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
			const rank = (kind) => ({ working: 0, paused: 0, ready: 1, poor: 1, locked: 2, done: 3 })[app.game.researchStatus(kind).state] ?? 2;
			groups.research = groups.research.map((g, i) => [g, i]).sort((a, b) => rank(a[0][0]) - rank(b[0][0]) || a[1] - b[1]).map(([g]) => g);
		}
		document.querySelector(".unit-cards").innerHTML = groups[tabName]
			.map(([type, name, desc, symbol, key]) => {
				const stats = TYPES[type],
					r = RESEARCH[type],
					cost = stats ? app.game.cost(type) : r.metal,
					duration = r ? r.time : stats.build || stats.construction;
				// A research card: a short line, the full description in the tooltip, its field and a progress bar.
				if (tabName === "research")
					return `<button class="unit-card research-card" data-research="${type}" data-description="${r.description || desc}"><span class="unit-symbol">${symbol}</span><span class="unit-copy"><i class="research-tag" data-tag="${RESEARCH_FIELDS[type] || "GOSPODARKA"}">${RESEARCH_FIELDS[type] || "GOSPODARKA"}</i><strong>${name}</strong><span class="card-description">${desc === r.description ? desc.split(/[.;]/)[0] : desc}</span><small class="card-status"></small><b>◇ ${cost}${r.gas ? ` · ⬡ ${r.gas}` : ""}${r.crystals ? ` · ✦ ${r.crystals}` : ""} <em>· ${duration} s</em></b></span><i class="research-progress" aria-hidden="true"></i>${key ? `<kbd>${key}</kbd>` : ""}</button>`;
				return `<button class="unit-card" data-${tabName === "army" ? "unit" : tabName === "build" ? "build" : "research"}="${type}" data-description="${desc}"><span class="unit-symbol">${symbol}</span><span class="unit-copy"><strong>${stats ? app.game.unitName(type) : name}</strong><span class="card-description">${r?.description || desc}</span><small class="card-status"></small><b>◇ ${cost}${r?.gas ? " + " + r.gas + " gazu" : ""}${r?.crystals ? " + " + r.crystals + " krysz." : ""} <em>· ${duration} s</em></b></span>${key ? `<kbd>${key}</kbd>` : ""}</button>`;
			})
			.join("");
		// Icons of the 3D models instead of the symbols (0.175.12, model-icons.js), in the player's faction and colour.
		if (typeof ModelIcons !== "undefined" && tabName !== "research") {
			const me = app.game.viewer ?? 0,
				tint = app.game.colorFor(me),
				faction = app.game.factionFor(me)?.key || "colonies";
			for (const b of document.querySelectorAll(".unit-cards [data-unit], .unit-cards [data-build]")) {
				const type = b.dataset.unit || b.dataset.build,
					symbol = b.querySelector(".unit-symbol");
				if (symbol && TYPES[type]) ModelIcons.icon(symbol, { id: 1, type, team: me, faction, tint, x: 0, y: 0, hp: 1, maxHp: 1, angle: 0, cargo: 0 }, { colors: [tint], space: !!app.game.space });
			}
		}
		document
			.querySelectorAll("[data-unit]")
			.forEach((b) => (b.onclick = () => buy(b.dataset.unit)));
		document
			.querySelectorAll("[data-build]")
			.forEach((b) => (b.onclick = () => beginBuild(b.dataset.build)));
		document.querySelectorAll("[data-research]").forEach(
			(b) =>
				(b.onclick = async () => {
					const kind = b.dataset.research,
						r = RESEARCH[kind];
					// A doctrine is final: say so before it starts (in the game's own window, 0.151.2).
					if (r?.doctrine && !(await confirmDoctrine(kind))) return;
					act("startResearch", kind);
					updateHud();
				}),
		);
		updateHud();
		paginateDeck();
	}
	function setupDeck() {
		document.querySelector(".production-heading").innerHTML =
			'<div class="deck-tabs"><button data-tab="army" class="active">ARMIA</button><button data-tab="build">BUDOWA</button><button data-tab="research">BADANIA</button><button id="development-open" aria-haspopup="dialog" title="Drzewo rozwoju [F2]">ROZWÓJ</button></div><div class="queue-controls"><span id="queue-icon" class="queue-icon" aria-hidden="true"></span><span id="queue-status"></span><button id="cancel-queue" title="Anuluj ostatnią jednostkę i odzyskaj metal">Anuluj ×</button></div>';
		document
			.querySelector(".queue-track")
			.insertAdjacentHTML(
				"beforebegin",
				'<nav class="deck-pagination" aria-label="Strony poleceń"><span id="deck-range"></span><div><button id="deck-prev" aria-label="Poprzednia strona poleceń">‹</button><span id="deck-page" aria-live="polite"></span><button id="deck-next" aria-label="Następna strona poleceń">›</button></div></nav>',
			);
		$("development-open").onclick = () => {
			if (app.started && !app.finished) app.development?.open();
		};
		setupCardTip();
		$("deck-prev").onclick = () => paginateDeck(-1);
		$("deck-next").onclick = () => paginateDeck(1);
		new ResizeObserver(() => paginateDeck()).observe(
			document.querySelector(".unit-cards"),
		);
		document
			.querySelectorAll("[data-tab]")
			.forEach((b) => (b.onclick = () => deck(b.dataset.tab)));
		$("cancel-queue").onclick = () => {
			if (app.activeTab === "research") act("cancelResearch");
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
		setupOrbitPanel();
		watchOverlay();
		app.economyPanel = new EconomyPanel(
			document.querySelector(".economy-card"),
			economyAction,
		);
		deck("army");
	}
	// Inwazja (G2): the orbit panel on the board — who holds the orbit, the drop and the strike from orbit.
	// While the overlay (briefing, victory / defeat report, the landing of an invasion) is up, the drawer and the
	// orbit panel step aside (0.152.1): body.overlay-open follows the overlay's hidden attribute.
	function watchOverlay() {
		const overlay = $("overlay"),
			sync = () => document.body.classList.toggle("overlay-open", !overlay.hidden);
		new MutationObserver(sync).observe(overlay, { attributes: true, attributeFilter: ["hidden"] });
		sync();
	}
	function setupOrbitPanel() {
		const panel = document.createElement("div");
		panel.id = "orbit-panel";
		panel.className = "orbit-panel";
		panel.hidden = true;
		panel.innerHTML = '<span class="orbit-owner"></span><button type="button" id="orbit-drop"></button><button type="button" id="orbit-strike"></button>';
		$("battlefield").append(panel);
		const begin = (mode, text) => {
			const why = mode === "drop" ? app.game.dropRequirement((app.game.viewer ?? 0)) : app.game.orbitStrikeRequirement((app.game.viewer ?? 0));
			if (why) return toast(why);
			app.building = app.attackMode = app.orderMode = false;
			app.strikeMode = null;
			app.orbitMode = mode;
			toast(text);
			updateHud();
		};
		$("orbit-drop").onclick = () => begin("drop", "Desant z orbity: wskaż lądowisko (LPM) w zbadanym terenie, z dala od wrogiego centrum. PPM lub Esc — anuluj.");
		$("orbit-strike").onclick = () => begin("strike", "Uderzenie z orbity: wskaż cel (LPM). PPM lub Esc — anuluj.");
	}
	function renderOrbitPanel() {
		const panel = $("orbit-panel");
		if (!panel) return;
		const I = app.game.invasion;
		panel.hidden = I?.phase !== "ground";
		if (panel.hidden) return;
		const me = app.game.viewer ?? 0,
			mine = I.owner === me;
		panel.classList.toggle("enemy", !mine);
		panel.querySelector(".orbit-owner").textContent = mine ? "ORBITA · TWOJA" : `ORBITA · WROGA — kapsuły wroga: ${app.game.podsLeft(I.owner)}`;
		const drop = $("orbit-drop"),
			strike = $("orbit-strike");
		drop.hidden = strike.hidden = !mine;
		if (!mine) return;
		const dropWhy = app.game.dropRequirement(me),
			strikeWhy = app.game.orbitStrikeRequirement(me);
		drop.textContent = app.orbitMode === "drop" ? "Wskaż lądowisko…" : `Desant · ${app.game.podsLeft(me)} kaps.${dropWhy && /za \d/.test(dropWhy) ? " · " + dropWhy.match(/\d+ s/)[0] : ""}`;
		strike.textContent = app.orbitMode === "strike" ? "Wskaż cel…" : `Uderzenie z orbity${strikeWhy && /za \d/.test(strikeWhy) ? " · " + strikeWhy.match(/\d+ s/)[0] : ""}`;
		drop.disabled = !!dropWhy && app.orbitMode !== "drop";
		strike.disabled = !!strikeWhy && app.orbitMode !== "strike";
		drop.title = dropWhy || `Zrzuć do ${RTS.INVASION.dropSize} kapsuł z oddziałami (lądowanie po ${RTS.INVASION.fall} s; baterie przeciwlotnicze mogą je zestrzelić).`;
		strike.title = strikeWhy || "Uderzenie z orbity w zbadany cel.";
		drop.classList.toggle("armed", app.orbitMode === "drop");
		strike.classList.toggle("armed", app.orbitMode === "strike");
	}
	return {
		renderCardTip,
		deck,
		setupDeck,
		renderOrbitPanel,
	};
}
