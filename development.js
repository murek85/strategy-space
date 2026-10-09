/* Existing development dependencies, shared by the browser UI and model tests. */
(function (root) {
	const descriptions = {
		medbay:
			"Leczy do 3 rannych piechurów (także rakietowców, zwiadowców i sabotażystów) w promieniu 170: 12 PW/s na stanowisko, 1 metal za 8 PW. Pod ostrzałem ×¼. Nie naprawia maszyn. Pobór 10 mocy. Wymaga koszar.",
		shieldgen:
			"Tarcza nad budynkami w promieniu 230 pochłania 70% obrażeń (pojemność 700). Odnawia się 25/s po 4 s spokoju. Wyczerpana — przeciążenie na 12 s, potem start od 25%. Nie chroni jednostek. Pobór 35 mocy. Wymaga Kolonii.",
		salvageYard:
			"Zniszczone pojazdy i budynki zostawiają wraki warte 25% kosztu (15–140 metalu, znikają po 4 min). PPM robotem na wraku: rozbiórka 3 s i dowóz złomu na plac. Po dostawie robot sam szuka kolejnego wraku w pobliżu placu. Pobór 5 mocy.",
		skyguard:
			"Mobilna obrona przeciwlotnicza: zasięg 330, 28 obrażeń co 0,6 s przeciw lotnictwu; przeciw celom naziemnym tylko 35%. Towarzyszy armii. Fabryka.",
		drone:
			"Bezzałogowy zwiad z powietrza: bardzo szybki, widzi na 520, bez broni. Odsłania siedliska i ruchy wroga; strącają go myśliwce, piechota, wieżyczki i obrona przeciwlotnicza. Koszary.",
		saboteur:
			"Ukryci, dopóki w promieniu 150 nie ma wrogiej jednostki (budynki ich nie wykrywają). PPM na wrogim budynku: podłożenie ładunku (4 s) wyłącza go na 25 s; centrum — także opóźnia desant o 15 s. Ładunek odnawia się 45 s. Słabi w walce: strzelają tylko na rozkaz. Wymaga Kolonii.",
		battery:
			"Gromadzi nadwyżkę mocy: do 900 energii, ładowanie do 15/s. Przy niedoborze oddaje do 30 mocy (30 s przy pełnym obciążeniu). Powstaje pusty; nie zastępuje reaktora.",
		transport:
			"Przewozi 4 piechurów lub rakietowców. PPM piechotą na transporterze: załadunek; przycisk Wyładuj: desant. Załoga liczy się do limitu armii. Po zniszczeniu wysiada z 50% pozostałych PW, jeśli jest wolny teren.",
		flak: "Obrona wyłącznie przeciwlotnicza: zasięg 360, 40 obrażeń co 0,8 s. Zużywa 15 mocy. Wymaga Kolonii i eskorty przeciw wojskom naziemnym.",
		workshop:
			"Automatycznie naprawia 2 pobliskie pojazdy naziemne i roboty. Zasięg 190; 16 PW/s na stanowisko; 1 metal za 5 PW. Pobór 20 mocy. Przez 3 s po trafieniu naprawa działa z 25% prędkości; niedobór mocy także ją spowalnia.",
		hq: "Centrum rozładunku i produkcji robotów. Budynek startowy; nie można wznieść kolejnego.",
		worker: "Buduje, naprawia, wydobywa i obsługuje ekstraktory. Chroni się lekką bronią.",
		depot: "Skraca transport rudy i kryształów. Odblokowuje badanie większych ładowni.",
		extractor:
			"Budowa na złożu gazu. Wymaga przydzielenia robota jako operatora; wydobywa 2 gazu/s.",
		reactor: "Dostarcza 60 mocy; po stabilizacji reaktorów 90.",
		lab: "Udostępnia badania pogody, napędów, celowania i energetyki. Pobór: 30 mocy.",
		barracks: "Produkcja piechoty i rakietowców. Pobór: 10 mocy.",
		factory:
			"Produkcja pojazdów i artylerii oraz badania broni i pancerza. Pobór: 25 mocy.",
		hangar: "Produkcja myśliwców i bombowców. Pobór: 25 mocy.",
		turret: "Osłona bazy i przyczółków. Pobór: 5 mocy.",
		wall: "Przeciągnij mur pod dowolnym kątem. Alt + przeciągnięcie tworzy okrąg.",
		gate: "Otwierane przejście w fortyfikacji. Otwarta brama przepuszcza obie strony.",
		trooper:
			"Podstawowa piechota. Korzysta z osłon przy skałach i fortyfikacjach.",
		rocket: "Wsparcie przeciw pojazdom i budynkom. Korzysta z osłon.",
		tank: "Mobilny pojazd do wsparcia natarcia.",
		heavy: "Ciężki pojazd szturmowy z dwoma działami.",
		artillery:
			"Daleki ostrzał obszarowy. Potrzebuje eskorty i dystansu do przeciwnika.",
		interceptor: "Szybki myśliwiec zwalczający cele powietrzne i naziemne.",
		bomber: "Bombowiec przeciw celom naziemnym; zwiększone obrażenia budynków.",
		raider: "Szybki zwiadowca dostępny dla Wolnych Kolonii.",
		sentinel: "Ciężki Bastion Dominium; zwalcza również lotnictwo.",
		grenadier: "Grenadierzy Kolonii: granaty ranią także piechotę stojącą obok celu.",
		serviceRover: "Łazik serwisowy Kolonii: naprawia 2 pobliskie pojazdy lub budynki.",
		flamer: "Miotacze ognia Dominium: krótki zasięg, ogień obejmuje grupę; groźni dla piechoty i budynków.",
		destroyer: "Niszczyciel czołgów Dominium: daleki zasięg, +60% obrażeń pojazdom, słaby przeciw piechocie.",
		outpost: "Placówka polowa Kolonii: rozładunek rudy, strefa budowy i szerokie widzenie; stawiana w dowolnym widocznym miejscu.",
		uplink: "Stacja orbitalna Dominium: uderzenie orbitalne w wybrany obszar co 100 s. Wymaga Kolonii; 40 mocy.",
		crawler: "Pełzacz Roju: tani i szybki, walczy wręcz; po śmierci wybucha, raniąc pobliskich wrogów.",
		spitter: "Pluwacz Roju: kwas ×1,4 przeciw budynkom; trafiony cel przez 4 s otrzymuje o 15% więcej obrażeń.",
		colossus: "Kolos Roju: 1400 PW, stała regeneracja 6 PW/s, uderzenie rani też sąsiadów celu.",
		monolith: "Monolit rezonansowy Roju: wrogie jednostki naziemne w promieniu 260 poruszają się o 35% wolniej; odsłania sabotażystów. 20 mocy.",
		spark: "Iskra Wartowników: szybka i lekka; umiejętność Skok — teleport do 260 w stronę wskazanego punktu, co 10 s.",
		prism: "Pryzmat Wartowników: wiązka, której obrażenia rosną o 25% z każdym kolejnym trafieniem tego samego celu (do +150%).",
		arc: "Łuk Wartowników: artyleria; wyładowanie przeskakuje na 2 kolejnych wrogów w pobliżu (60% i 36% siły).",
		warden: "Strażnik Wartowników: ciężki; umiejętność Faza — 3 s bez otrzymywania obrażeń (bez strzelania), co 18 s. Dwaj strażnicy scalają się w konstrukt.",
		anchor: "Kotwica Wartowników: poszerza strefę budowy (320); jednostki z kuźni wychodzą ze szczeliny przy kotwicy najbliższej punktu zbiórki; jednostki przy kotwicy przeskakują do innej.",
		resonator: "Rezonator Wartowników: przy złożu rudy (5 metalu/s), kryształów (3 metalu i 0,4 kryształu/s) albo własnym przekaźniku (5 metalu/s) — zamiast robotów górniczych.",
	};
	const icons = { building: "▤", unit: "➤", research: "⌬" };
	// The badge of a node's state and the names of the tabs.
	const STATES = { done: "◉ Gotowe", ready: "● Dostępne", poor: "◐ Brak zasobów", working: "◷ W toku", paused: "◷ Wstrzymane", locked: "⊘ Zablokowane" };
	const TAB_NAMES = { economy: "Gospodarka", infrastructure: "Infrastruktura", army: "Armia" };
	function groups(game, tab) {
		const b = (id) => "building:" + id,
			u = (id) => "unit:" + id,
			r = (id) => "research:" + id;
		if (tab === "economy")
			return [
				// Centre levels II and III, and the doctrines of the side's faction (doctrine-rules.js).
				{ root: b("hq"), leaves: [u("worker"), r("colony"), ...(root.RTS?.RESEARCH?.fortress ? [r("fortress"), ...(game.doctrines?.(game.viewer ?? 0) || []).map((d) => r(d.id))] : [])] },
				{ root: b("depot"), leaves: [r("cargo"), r("extraction")] },
				{ root: b("extractor"), leaves: [] },
				{ root: b("workshop"), leaves: [] },
				{ root: b("salvageYard"), leaves: [] },
				{ root: b("reactor"), leaves: [] },
				{ root: b("battery"), leaves: [] },
				{ root: b("lab"), leaves: [r("efficiency"), r("assembly")] },
			];
		if (tab === "infrastructure")
			return [
				{
					root: u("worker"),
					leaves: [
						"barracks",
						"factory",
						"hangar",
						"battery",
						"workshop",
						"medbay",
						"shieldgen",
						"salvageYard",
						...(game.factionFor?.(0)?.key === "colonies" ? ["outpost"] : []),
						...(game.factionFor?.(0)?.key === "dominion" ? ["uplink"] : []),
						...(game.factionFor?.(0)?.key === "swarm" ? ["monolith"] : []),
						...(game.factionFor?.(0)?.key === "watchers" ? ["anchor", "resonator"] : []),
						"lab",
						"depot",
						"reactor",
						"extractor",
						"turret",
						"flak",
						"wall",
						"gate",
					].map(b),
				},
			];
		const faction = game.factionFor((game.viewer ?? 0))?.key;
		return [
			{ root: b("flak"), leaves: [] },
			{ root: b("shieldgen"), leaves: [] },
			{
				root: b("barracks"),
				leaves: [
					"trooper",
					"rocket",
					...(faction === "colonies" ? ["raider", "grenadier"] : []),
					...(faction === "dominion" ? ["flamer"] : []),
					...(faction === "swarm" ? ["crawler", "spitter"] : []),
					...(faction === "watchers" ? ["spark"] : []),
					"drone",
					"saboteur",
				]
					.map(u)
					.concat(r("infantryTraining"), b("medbay")),
			},
			{
				root: b("factory"),
				leaves: [
					...[
						"tank",
						"heavy",
						"artillery",
						"transport",
						"skyguard",
						...(faction === "dominion" ? ["sentinel", "destroyer"] : []),
						...(faction === "colonies" ? ["serviceRover"] : []),
						...(faction === "swarm" ? ["colossus"] : []),
						...(faction === "watchers" ? ["prism", "arc", "warden"] : []),
						// Act III: the Dominium's destroyer lent after the evacuation of Hefajstos.
						...(faction !== "dominion" && game.loanedUnit?.("destroyer") ? ["destroyer"] : []),
					].map(u),
					r("weapons"),
					r("armor"),
				],
			},
			{ root: b("hangar"), leaves: [u("interceptor"), u("bomber")] },
			{
				root: b("lab"),
				leaves: [
					"meteorology",
					"guidance",
					"mobility",
					"precision",
					// Orbit only (space-rules.js); locked elsewhere.
					...(root.RTS?.RESEARCH?.meteorShield ? ["meteorShield"] : []),
				].map(r),
			},
		];
	}
	function node(game, key, RTS) {
		const [kind, id] = key.split(":"),
			s = kind === "research" ? RTS.RESEARCH[id] : RTS.TYPES[id];
		if (!s) return null;
		const data = {
			key,
			kind,
			id,
			name: kind === "research" ? s.name : game.unitName?.(id) || s.name,
			description: s.description || descriptions[id] || "",
			metal: kind === "research" ? s.metal : game.cost(id),
			gas: s.gas || 0,
			crystals: s.crystals || 0,
			time: s.time || s.build || s.construction || 0,
			allowed: false,
			state: "locked",
			reason: "",
			progress: 0,
		};
		if (kind === "research")
			return {
				...data,
				...game.researchStatus(id),
				requires:
					["extraction", "assembly", "infantryTraining", "fortress"].includes(
						id,
					) && game.centerLevel() < 2
						? "research:colony"
						: s.doctrine && game.centerLevel() < 3
							? "research:fortress"
							: "building:" + game.researchStatus(id).required,
			};
		if (kind === "unit") {
			data.requires = "building:" + game.productionType(id);
			data.count =
				game.units((game.viewer ?? 0)).filter((e) => e.type === id).length +
				game.entities
					.filter((e) => e.team === (game.viewer ?? 0) && e.hp > 0)
					.reduce(
						(n, e) =>
							n +
							(e.passengers || []).filter((p) => p.type === id)
								.length,
						0,
					);
			data.queued = game.queue.filter((q) => q.type === id).length;
			if (s.faction && s.faction !== game.factionFor((game.viewer ?? 0))?.key && !game.loanedUnit?.(id))
				data.reason =
					"Jednostka frakcji: " + RTS.FACTIONS[s.faction].name;
			else if (!game.ready(game.productionType(id)))
				data.reason =
					"Wymaga: " + RTS.TYPES[game.productionType(id)].name;
			else if (game.population(0) + game.queue.length >= 60)
				data.reason = "Limit 60 jednostek (z kolejką)";
			else if (!game.producer(id))
				data.reason = "Wszystkie kolejki produkcyjne są pełne";
			else if (game.credits < data.metal) {
				data.state = "poor";
				data.reason =
					"Brakuje " +
					Math.ceil(data.metal - game.credits) +
					" metalu";
			} else {
				data.allowed = true;
				data.state = "ready";
				data.reason = "Produkcja dostępna";
			}
		} else {
			data.count = game.entities.filter(
				(e) =>
					e.team === (game.viewer ?? 0) &&
					e.hp > 0 &&
					e.type === id &&
					!e.constructionLeft,
			).length;
			data.constructing = game.entities.filter(
				(e) =>
					e.team === (game.viewer ?? 0) &&
					e.hp > 0 &&
					e.type === id &&
					e.constructionLeft,
			).length;
			data.requires = id === "hq" ? null : "unit:worker";
			if (id === "hq") {
				data.state = data.count ? "done" : "locked";
				data.reason =
					"Poziom " +
					game.centerLevel() +
					" — " +
					(["", "Przyczółek", "Kolonia", "Twierdza"][game.centerLevel()] || "Przyczółek") +
					(game.doctrineOf?.(game.viewer ?? 0) ? " · " + game.doctrineOf(game.viewer ?? 0).name.replace("Doktryna: ", "doktryna ") : "");
			} else if (game.developmentRequirement(id)) {
				data.requires = "research:colony";
				data.reason = game.developmentRequirement(id);
			} else if (!game.hq((game.viewer ?? 0))) data.reason = "Brak centrum dowodzenia";
			else if (!game.units((game.viewer ?? 0)).some((e) => e.type === "worker"))
				data.reason = "Wymaga robota budowlanego";
			else if (game.credits < data.metal) {
				data.state = "poor";
				data.reason =
					"Brakuje " +
					Math.ceil(data.metal - game.credits) +
					" metalu";
			} else {
				data.allowed = true;
				data.state = "ready";
				data.reason = "Można wybrać miejsce budowy";
			}
		}
		if (game.result) {
			data.allowed = false;
			data.state = "locked";
			data.reason = "Operacja zakończona";
		}
		return data;
	}
	class View {
		constructor(api) {
			this.api = api;
			this.tab = "economy";
			this.selected = "building:depot";
			this.dialog = document.createElement("dialog");
			this.dialog.className = "development-dialog";
			this.dialog.setAttribute("aria-labelledby", "development-title");
			this.dialog.innerHTML = `<header><div><span class="eyebrow">ROZWÓJ KOLONII · SYMULACJA WSTRZYMANA</span><h2 id="development-title">Drzewo rozwoju</h2></div><button id="development-close" aria-label="Zamknij drzewo rozwoju">Zamknij</button></header><p class="development-intro">Wybierz obiekt, aby sprawdzić wymagania. Strzałki pokazują, co produkuje budynek lub co pozwala wykonać robot.</p><div class="development-tabs" role="tablist" aria-label="Gałęzie rozwoju">${[
				["economy", "Gospodarka"],
				["infrastructure", "Infrastruktura"],
				["army", "Armia"],
			]
				.map(
					([id, name], i) =>
						`<button id="dev-tab-${id}" role="tab" data-dev-tab="${id}" aria-controls="development-branches" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${name}</button>`,
				)
				.join(
					"",
				)}</div><div class="development-layout"><section id="development-branches" role="tabpanel" aria-labelledby="dev-tab-economy" tabindex="0"></section><aside id="development-detail" aria-label="Szczegóły wybranego obiektu"></aside></div><footer><span id="development-resources"></span><span class="dev-legend" aria-hidden="true"><i class="done">◉ gotowe</i><i class="ready">● dostępne</i><i class="poor">◐ brak zasobów</i><i class="locked">⊘ zablokowane</i><i class="req">wymagane</i><i class="unl">odblokowuje</i></span><span id="development-message" role="status"></span></footer>`;
			document.body.append(this.dialog);
			this.dialog.querySelector("#development-close").onclick = () =>
				this.close();
			this.dialog.addEventListener("cancel", (e) => {
				e.preventDefault();
				this.close();
			});
			// Closed some other way (the browser): restore the pause state once.
			this.dialog.addEventListener("close", () => this.restore());
			const tabs = [...this.dialog.querySelectorAll("[data-dev-tab]")];
			tabs.forEach((b, i) => {
				b.onclick = () => this.selectTab(b.dataset.devTab);
				b.onkeydown = (e) => {
					const n =
						e.key === "ArrowRight"
							? (i + 1) % 3
							: e.key === "ArrowLeft"
								? (i + 2) % 3
								: e.key === "Home"
									? 0
									: e.key === "End"
										? 2
										: null;
					if (n !== null) {
						e.preventDefault();
						tabs[n].click();
						tabs[n].focus();
					}
				};
			});
			this.dialog.addEventListener("click", (e) => {
				const b = e.target.closest("button");
				if (!b) return;
				if (b.dataset.devNode) {
					this.selected = b.dataset.devNode;
					this.render();
				}
				if (b.dataset.devRequirement)
					this.navigate(b.dataset.devRequirement);
				if (b.dataset.devAction) this.execute(b.dataset.devAction);
			});
		}
		get active() {
			return this.dialog.open;
		}
		open() {
			if (this.active) return;
			this.returnFocus = document.activeElement;
			this.wasPaused = this.api.freeze();
			this.restored = false;
			this.render();
			this.message("");
			this.dialog.showModal();
			this.dialog.querySelector("#development-close").focus();
		}
		// The pause state is restored at once (a hidden page may never get the dialog's close event).
		close() {
			if (!this.active) return;
			this.dialog.close();
			this.restore();
		}
		restore() {
			if (this.restored) return;
			this.restored = true;
			this.api.resume(this.wasPaused);
			this.returnFocus?.focus();
		}
		selectTab(tab) {
			this.tab = tab;
			this.selected = groups(this.api.game(), tab)[0].root;
			this.render();
			this.dialog.querySelector("#development-branches").scrollTop = 0;
		}
		navigate(key) {
			const game = this.api.game();
			if (
				!groups(game, this.tab).some((g) =>
					[g.root, ...g.leaves].includes(key),
				)
			)
				this.tab =
					["economy", "infrastructure", "army"].find((tab) =>
						groups(game, tab).some((g) =>
							[g.root, ...g.leaves].includes(key),
						),
					) || "economy";
			this.selected = key;
			this.render();
			const target = [
				...this.dialog.querySelectorAll("[data-dev-node]"),
			].find((b) => b.dataset.devNode === key);
			target?.focus();
		}
		execute(action) {
			const game = this.api.game(),
				data = node(game, this.selected, root.RTS),
				// A network battle sends actions to both computers (app.js); otherwise they run at once.
				act = (name, ...args) => (root.gameAct ? root.gameAct(name, ...args) : game[name](...args));
			if (action === "cancel") {
				if (
					data.kind === "research" &&
					game.research?.kind === data.id &&
					!game.result
				) {
					act("cancelResearch");
					this.render();
					this.message("Badanie anulowane. Zasoby zwrócone.");
				}
				return;
			}
			if (!data.allowed) {
				this.render();
				this.message(data.reason);
				return;
			}
			if (data.kind === "building") {
				this.close();
				this.api.build(data.id);
				return;
			}
			const ok =
				data.kind === "research"
					? act("startResearch", data.id)
					: act("enqueue", data.id);
			this.render();
			this.api.changed();
			this.message(
				ok
					? (data.kind === "research"
							? "Rozpoczęto badanie: "
							: "Zlecono produkcję: ") + data.name
					: "Nie można wykonać zlecenia. Sprawdź wymagania.",
			);
		}
		message(text) {
			this.dialog.querySelector("#development-message").textContent =
				text;
		}
		render() {
			const focusAction = document.activeElement?.dataset.devAction;
			const game = this.api.game(),
				RTS = root.RTS,
				branches = groups(game, this.tab),
				fmt = (n) => Math.floor(n).toLocaleString("pl-PL");
			for (const b of this.dialog.querySelectorAll("[data-dev-tab]")) {
				const active = b.dataset.devTab === this.tab;
				b.setAttribute("aria-selected", String(active));
				b.tabIndex = active ? 0 : -1;
			}
			const panel = this.dialog.querySelector("#development-branches");
			panel.setAttribute("aria-labelledby", "dev-tab-" + this.tab);
			const scroll = panel.scrollTop,
				focus = document.activeElement?.dataset.devNode;
			// The selected node's requirement and what it opens are marked in the tree.
			const chosen = node(game, this.selected, RTS);
			const card = (key) => {
				const d = node(game, key, RTS),
					link = key === chosen?.requires ? "is-required" : d.requires === this.selected ? "is-unlocked" : "",
					cost = d.id === "hq" || (d.kind === "research" && d.state === "done") ? "" : `<span class="dev-cost">◇ ${fmt(d.metal)}${d.gas ? ` · ⬡ ${d.gas}` : ""}${d.crystals ? ` · ✦ ${d.crystals}` : ""}${d.time ? ` · ${d.time} s` : ""}</span>`;
				return `<button class="development-node ${d.state} ${key === this.selected ? "selected" : ""} ${link}" data-dev-node="${key}" aria-pressed="${key === this.selected}"><span class="dev-kind">${icons[d.kind]} ${{ building: "Budynek", unit: "Jednostka", research: "Badanie" }[d.kind]}<i class="dev-badge">${STATES[d.state] || ""}</i></span><strong>${d.name}</strong><small>${d.reason}</small>${cost}${d.kind === "research" && ["working", "paused"].includes(d.state) ? `<progress value="${d.progress}" max="1" aria-label="Postęp: ${d.name}"></progress>` : ""}${link ? `<em class="dev-link">${link === "is-required" ? "Wymagane" : "Odblokowuje"}</em>` : ""}</button>`;
			};
			panel.innerHTML = branches
				.map(
					(g) =>
						`<div class="development-branch"><div class="dev-source">${card(g.root)}</div>${g.leaves.length ? `<span class="dev-arrow" aria-hidden="true"></span><div class="dev-leaves">${g.leaves.map(card).join("")}</div>` : '<p class="dev-leaf-note">Wsparcie gospodarki. Szczegóły i wymagania po prawej.</p>'}</div>`,
				)
				.join("");
			// Each tab counts what is already open (built, researched or ready to order) out of all its nodes.
			for (const b of this.dialog.querySelectorAll("[data-dev-tab]")) {
				const keys = groups(game, b.dataset.devTab).flatMap((g) => [g.root, ...g.leaves]),
					open = keys.filter((k) => ["done", "ready", "working", "paused", "poor"].includes(node(game, k, RTS)?.state)).length;
				b.innerHTML = `${TAB_NAMES[b.dataset.devTab]}<small>${open}/${keys.length}</small>`;
			}
			panel.scrollTop = scroll;
			if (focus)
				[...panel.querySelectorAll("button")]
					.find((b) => b.dataset.devNode === focus)
					?.focus({ preventScroll: true });
			const d = node(game, this.selected, RTS),
				research = d.kind === "research",
				activeResearch = research && game.research?.kind === d.id,
				required = d.requires ? node(game, d.requires, RTS) : null;
			const baseStats = research ? null : RTS.TYPES[d.id],
				modifier = game.factionFor((game.viewer ?? 0)),
				hp = baseStats
					? Math.round(baseStats.hp * (modifier?.hp || 1))
					: 0;
			this.dialog.querySelector("#development-detail").innerHTML =
				`<span class="eyebrow">${{ building: "INFRASTRUKTURA", unit: "ARMIA", research: "TECHNOLOGIA" }[d.kind]}</span><h3>${d.name}</h3><canvas id="development-preview" width="360" height="200" role="img" aria-label="${research ? "Budynek badawczy: " + RTS.TYPES[d.required].name : "Podgląd: " + d.name}"></canvas><p>${d.description}</p><dl><div><dt>Koszt</dt><dd>${d.id === "hq" ? "Budynek startowy" : fmt(d.metal) + " metalu" + (d.gas ? " · " + d.gas + " gazu" : "") + (d.crystals ? " · " + d.crystals + " kryształów" : "")}</dd></div>${d.time ? `<div><dt>Czas bazowy</dt><dd>${d.time} s</dd></div>` : ""}${baseStats ? `<div><dt>Wytrzymałość</dt><dd>${hp} PW</dd></div><div><dt>Zasięg / obrażenia bazowe</dt><dd>${baseStats.range || 0} / ${baseStats.damage || 0}</dd></div><div><dt>Ruch bazowy</dt><dd>${baseStats.speed || 0}</dd></div><div><dt>${d.kind === "unit" ? "W armii / w kolejce" : "Ukończone / w budowie"}</dt><dd>${d.count || 0} / ${d.queued || d.constructing || 0}</dd></div>` : ""}</dl>${required ? `<div class="dev-requires"><small>WYMAGANIE</small><button data-dev-requirement="${d.requires}">${required.name} ↗</button></div>` : ""}${d.kind === "building" && d.id !== "hq" ? '<p class="dev-hint">Wybierz wolne, widoczne miejsce przy centrum lub własnym przekaźniku. Ekstraktor wymaga złoża gazu. Robot musi dotrzeć do fundamentu.</p>' : ""}<p class="dev-state ${d.state}">${d.reason}</p>${activeResearch ? `<progress value="${d.progress}" max="1" aria-label="Postęp badania"></progress><p class="dev-hint">Pozostała praca: ${Math.ceil(game.research.left)} s przy pełnej mocy. Tempo: ${Math.round(game.power.factor * 100)}%. Badanie ruszy po wznowieniu symulacji.</p><button class="dev-main-action" data-dev-action="cancel">Anuluj badanie — zwrot zasobów</button>` : `<button class="dev-main-action" data-dev-action="start" ${d.allowed ? "" : "disabled"}>${research ? "Rozpocznij badanie" : d.kind === "unit" ? "Zleć produkcję" : "Wybierz miejsce budowy"}</button>`}<p class="dev-hint">Okno wstrzymuje bitwę. Koszty budowy i jednostek uwzględniają frakcję.</p>`;
			this.dialog.querySelector("#development-resources").innerHTML = [
				["◇", fmt(game.credits), "metal"],
				["⬡", fmt(game.gas), "gaz"],
				["✦", fmt(game.crystals), "kryształy"],
				["ϟ", `${game.power.demand}/${game.power.supply}`, "moc"],
			]
				.map(([icon, value, label]) => `<span><b>${icon} ${value}</b>${label}</span>`)
				.join("");
			const detail = this.dialog.querySelector("#development-detail"),
				body = document.createElement("div"),
				actions = document.createElement("div");
			body.className = "dev-detail-body";
			actions.className = "dev-detail-actions";
			const action = detail.querySelector(".dev-main-action"),
				hint = detail.lastElementChild;
			if (action) actions.append(action);
			actions.append(hint);
			body.append(...detail.childNodes);
			detail.append(body, actions);
			if (focusAction) {
				const next = detail.querySelector(
					'[data-dev-action="' + focusAction + '"]',
				);
				if (next && !next.disabled) next.focus({ preventScroll: true });
				else {
					detail.tabIndex = 0;
					detail.focus({ preventScroll: true });
				}
			}
			this.draw(research ? d.required : d.id, game);
		}
		draw(type, game) {
			const canvas = this.dialog.querySelector("canvas"),
				c = canvas.getContext("2d"),
				s = root.RTS.TYPES[type],
				faction = game.factionFor((game.viewer ?? 0))?.key || "colonies";
			const e = {
				id: 1,
				type,
				team: 0,
				faction,
				tint: game.colorFor((game.viewer ?? 0)),
				hp: s.hp,
				maxHp: s.hp,
				angle: -0.3,
				path: [],
				x: 0,
				y: 0,
				cargo: 0,
				cooldown: 0,
				constructionLeft: 0,
			};
			c.translate(180, 125);
			const scale = s.speed ? 2 : 1.1;
			c.scale(scale, scale);
			if (!root.AdvancedArt && typeof AdvancedArt === "undefined") return;
			if ((typeof Act2Art === "undefined" || !Act2Art.body(c, e, 1.4)) && !AdvancedArt.body(c, e, 1.4, "dust"))
				BoardArt.body(c, e, 1.4, null, false);
			AdvancedArt.factionDetails(c, e, 1.4);
		}
	}
	const api = { groups, node, View };
	if (typeof module !== "undefined" && module.exports) module.exports = api;
	else root.DevelopmentTree = api;
})(typeof window !== "undefined" ? window : globalThis);
