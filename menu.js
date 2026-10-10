/* Navigation owns screens; the application retains a single simulation loop. */
// The game's version: the menu's footer and the saves' export (0.171.13: one place; it was written twice by hand).
const GAME_VERSION = "0.171.17";
// Listening to the music in the settings: themes (audio.js music modes) and the game's moods.
const MUSIC_THEMES = [
	["menu", "Menu — Odległe światło"],
	["prologue", "Prolog kampanii — historia pogranicza"],
	["prologue2", "Prolog aktu II — cena świtu"],
	["prologue3", "Prolog aktu III — przebudzenie Roju"],
	["prologue4", "Prolog aktu IV — inwazja"],
	["intro", "Intro — wyruszenie"],
	["finale", "Finał kampanii — zwycięstwo"],
	["game:dust", "Pustynia"],
	["game:sun", "Świt bliźniaczych słońc"],
	["game:ice", "Lód"],
	["game:ash", "Front popiołu"],
	["game:wreck", "Wrak"],
	["game:hive", "Ul"],
	["game:lumen", "Gąszcz"],
	["game:forge", "Kuźnia"],
	["game:tide", "Przypływ — Thalassa"],
	["game:crystal", "Kryształ — Grzbiety Nivalis"],
	["game:ruins", "Ruiny — Nadir"],
	["game:bastion", "Bastion Admiralicji"],
	["game:archive", "Archiwum pod lodem"],
	["game:beacons", "Latarnie — Dolina Latarni"],
	["game:ashes", "Popioły — Wypalona Dolina"],
	["game:dunes", "Wydmy — Cichy Horyzont"],
	["game:frost", "Szron — Biały Przesmyk"],
	["game:skyfall", "Szczyty — Wiszące Szczyty"],
	["game:oasis", "Oaza — Słoneczna Dolina"],
	["game:signal", "Sygnał spod piasku"],
	["game:convoy", "Ostatni konwój"],
	["game:orbit", "Kosmos — Orbita"],
	["game:glacis", "Kosmos — Pierścienie"],
	["game:void", "Kosmos — Horyzont zdarzeń"],
	["game:requiem", "Kosmos — Requiem floty"],
	["game:docks", "Kosmos — Doki Eos"],
	["game:nebula", "Kosmos — Szkarłatna Mgławica"],
	["game:comets", "Kosmos — Szlak Komet"],
];
const MUSIC_MOODS = [
	["explore", "Eksploracja"],
	["develop", "Rozbudowa"],
	["tension", "Napięcie"],
	["battle", "Bitwa"],
	["recovery", "Wytchnienie"],
];
const WINDOW_SCREENS = [
	"news",
	"campaign",
	"settings",
	"briefing",
	"slots",
	"review",
	"scenarios",
];
// The line over each screen's title, like the channel of a console.
const EYEBROWS = {
	single: "WYBÓR OPERACJI / SEKTOR 07",
	campaign: "MAPA OPERACYJNA / AKTY I–IV",
	scenarios: "SYMULATOR BITEW / KONFIGURACJA",
	briefing: "ODPRAWA / KANAŁ SZYFROWANY",
	review: "ODPRAWA / DZIENNIK ŁĄCZNOŚCI",
	slots: "ARCHIWUM ZAPISÓW / PAMIĘĆ LOKALNA",
	"slot-confirm": "ARCHIWUM ZAPISÓW / POTWIERDZENIE",
	replace: "AUTOSAVE / POTWIERDZENIE",
	"save-error": "BŁĄD PAMIĘCI / ZAPIS NIEUDANY",
	settings: "KONFIGURACJA POKŁADU",
	knowledge: "BAZA WIEDZY / ARCHIWUM KOLONII",
	news: "DZIENNIK ZMIAN / PLANY",
	pause: "SYMULACJA ZATRZYMANA",
};
class CommandMenu {
	constructor(api) {
		this.api = api;
		this.screen = "home";
		this.origin = "home";
		this.focusReturn = null;
		this.selectedMission = "horizon";
		this.missionOrigin = "single";
		this.scenario = {
			name: "Dowódca",
			color: "#b0efd0",
			faction: "colonies",
			difficulty: "normal",
			players: 2,
			mode: "conquest",
			size: "medium",
			seed: 0,
			defenseTime: 600,
			pointsPerRelay: 90,
			resources: "normal",
			fauna: "normal",
			weather: "normal",
			enemy: "commander",
			teams: "ffa",
			enemyFaction: "auto",
		};
		this.root = document.createElement("section");
		this.root.id = "command-menu";
		this.root.setAttribute("aria-label", "Menu główne");
		document.body.append(this.root);
		this.gameElements = [
			...document.querySelectorAll(
				"body > header,body > main,body > footer",
			),
		];
		try {
			this.reduced =
				JSON.parse(localStorage.getItem("pogranicze-menu-v1"))
					?.reduced ??
				matchMedia("(prefers-reduced-motion: reduce)").matches;
		} catch {
			this.reduced = true;
		}
		this.show("home");
	}
	get active() {
		return !this.root.hidden;
	}
	button(id, label, primary = false) {
		return `<button id="menu-${id}" class="menu-action ${primary ? "prominent" : ""}">${label}<span aria-hidden="true">↗</span></button>`;
	}
	show(screen, focusId) {
		this.galaxy?.destroy();
		this.galaxy = null;
		if (this.fitGalaxy) window.removeEventListener("resize", this.fitGalaxy);
		if (this.introFrame) cancelAnimationFrame(this.introFrame);
		this.introFrame = null;
		this.screen = screen;
		this.root.dataset.screen = screen;
		this.root.hidden = false;
		this.api.freeze();
		if (screen !== "settings") this.api.audio?.()?.stopPreview?.();
		this.api.music?.(
			// The campaign's finale has its own victory cue (audio.js, finaleStep).
			// The prologues of acts II-IV (about 75 s) have their own scores (audio.js, STORIES).
			screen === "intro" ? "prologue" : screen === "finale" ? "finale" : ["intro2", "intro3", "intro4"].includes(screen) ? "prologue" + screen.slice(-1) : screen === "interlude" ? "intro" : "menu",
		);
		this.gameElements.forEach((e) => (e.inert = true));
		document.body.classList.add("in-menu");
		// The pause screen lies over the frozen battlefield.
		document.body.classList.toggle("menu-over-game", screen === "pause");
		const save = this.api.inspectSave();
		let title = "",
			body = "";
		if (screen === "home") {
			title = "Dowództwo<br>pogranicza.";
			body = `<p class="menu-lead">Sektor zewnętrzny. Nowy front.<br>Twoje rozkazy wyznaczają granice.</p><nav aria-label="Główna nawigacja">${save.valid ? this.button("continue", "Kontynuuj", true) : ""}${this.button("single", "Gra jednoosobowa", !save.valid)}${this.button("slots", "Wczytaj grę — sloty")}${this.button("knowledge", "Baza wiedzy")}${this.button("settings", "Ustawienia")}${typeof window !== "undefined" && window.desktop?.app ? this.button("quit", "Wyjdź z gry") : ""}</nav><p class="menu-message">${save.error || ""}</p>`;
		} else if (screen === "single") {
			title = "Gra jednoosobowa";
			body = `<p>Wybierz samodzielną bitwę lub kontynuuj historię Wolnych Kolonii.</p>${this.button("training", "Szkolenie: Próba kolonii")}${this.button("scenarios", "Scenariusze")}${this.button("campaign", "Kampania: Odzyskany Świt", true)}${this.button("back", "Wróć")}`;
		} else if (screen === "intro") {
			title = "Odzyskany Świt";
			body =
				'<div class="campaign-film"><canvas id="campaign-film" width="960" height="400" aria-label="Film wprowadzający do kampanii"></canvas><p id="film-caption" aria-live="polite"></p><progress id="film-progress" max="' + (typeof CampaignFilm !== "undefined" ? CampaignFilm.duration : 150) + '" value="0" aria-label="Czas intro"></progress></div>' +
				this.button("skip-intro", "Pomiń intro") +
				"<small>Prolog · ok. 2,5 minuty</small>";
		} else if (screen === "interlude") {
			// A radio scene before a campaign chapter (interludes.js).
			const m = RTS.MISSIONS[this.selectedMission],
				film = Interludes.film(this.selectedMission);
			title = m.name;
			body =
				`<div class="campaign-film"><canvas id="campaign-film" width="960" height="400" aria-label="Scena łączności przed rozdziałem"></canvas><p id="film-caption" aria-live="polite"></p><progress id="film-progress" max="${film.duration}" value="0" aria-label="Czas sceny"></progress></div>` +
				this.button("skip-interlude", "Pomiń scenę") +
				`<small>Łączność przed rozdziałem · ${Math.round(film.duration)} sekund</small>`;
		} else if (screen === "finale") {
			title = "Finał kampanii";
			body =
				'<div class="campaign-film"><canvas id="campaign-film" width="960" height="400" aria-label="Film finałowy kampanii"></canvas><p id="film-caption" aria-live="polite"></p><progress id="film-progress" max="' + (typeof FinaleFilm !== "undefined" ? FinaleFilm.duration : 122) + '" value="0" aria-label="Czas filmu"></progress></div>' +
				this.button("skip-finale", "Zakończ film") +
				"<small>Finał kampanii · ok. 2 minuty</small>";
		} else if (screen === "intro4") {
			title = "Akt IV · Inwazja";
			body =
				'<div class="campaign-film"><canvas id="campaign-film" width="960" height="400" aria-label="Prolog czwartego aktu kampanii"></canvas><p id="film-caption" aria-live="polite"></p><progress id="film-progress" max="' + (typeof Act4Film !== "undefined" ? Act4Film.duration : 76) + '" value="0" aria-label="Czas prologu"></progress></div>' +
				this.button("skip-intro4", "Pomiń prolog") +
				"<small>Prolog aktu IV · ok. 75 sekund</small>";
		} else if (screen === "intro3") {
			title = "Akt III · Przebudzenie Roju";
			body =
				'<div class="campaign-film"><canvas id="campaign-film" width="960" height="400" aria-label="Prolog trzeciego aktu kampanii"></canvas><p id="film-caption" aria-live="polite"></p><progress id="film-progress" max="' + (typeof Act3Film !== "undefined" ? Act3Film.duration : 76) + '" value="0" aria-label="Czas prologu"></progress></div>' +
				this.button("skip-intro3", "Pomiń prolog") +
				"<small>Prolog aktu III · ok. 75 sekund</small>";
		} else if (screen === "intro2") {
			title = "Akt II · Cena świtu";
			body =
				'<div class="campaign-film"><canvas id="campaign-film" width="960" height="400" aria-label="Prolog drugiego aktu kampanii"></canvas><p id="film-caption" aria-live="polite"></p><progress id="film-progress" max="' + (typeof Act2Film !== "undefined" ? Act2Film.duration : 76) + '" value="0" aria-label="Czas prologu"></progress></div>' +
				this.button("skip-intro2", "Pomiń prolog") +
				"<small>Prolog aktu II · ok. 75 sekund</small>";
		} else if (screen === "review") {
			const m = RTS.MISSIONS[this.selectedMission],
				review = this.api.review?.() || { objectives: [], radio: [] },
				speakers = RTS.ACT2_SPEAKERS || {};
			title = m.name;
			body = `<span class="menu-tag">ODPRAWA · ${m.planet}</span><p>${m.description}</p><h2>Cele</h2><ul class="act2-objectives">${review.objectives.map((o) => `<li class="${o.done ? "done" : o.failed ? "failed" : ""}${o.secondary ? " secondary" : ""}">${o.text}</li>`).join("")}</ul><h2>Dziennik łączności</h2><ol class="act2-radio">${review.radio.map((l) => `<li><b style="color:${speakers[l.who]?.color || "#c5d7d9"}">${speakers[l.who]?.name || l.who}</b> <small>${Math.floor(l.time / 60)}:${String(l.time % 60).padStart(2, "0")}</small><br>${l.text}</li>`).join("") || "<li>Brak wiadomości.</li>"}</ol>${this.button("pause", "Wróć do pauzy", true)}`;
		} else if (screen === "scenarios") {
			if (RTS.MISSIONS[this.selectedMission].campaign)
				this.selectedMission = "horizon";
			this.missionOrigin = "scenarios";
			title = "Scenariusze";
			body =
				'<h2>Cele operacji</h2><div class="scenario-map"><label>Mapa<select id="scenario-map" aria-label="Mapa">' +
				Object.entries(RTS.MISSIONS)
					.filter(([, m]) => !m.campaign)
					.map(
						([id, m]) =>
							'<option value="' +
							id +
							'">' +
							m.name +
							" / " +
							m.planet +
							"</option>",
					)
					.join("") +
				'</select></label><canvas id="map-preview" width="480" height="190" aria-label="Podgląd terenu wybranej mapy"></canvas><p id="map-description"></p><small id="mode-objective">Zniszcz wszystkie wrogie centra dowodzenia.</small></div>' +
				this.button("launch", "Rozpocznij operację", true) +
				this.button("campaign-back", "Wróć do wyboru gry");
		} else if (screen === "campaign") {
			const isCampaign = screen === "campaign",
				progress = this.api.campaign?.() || {};
			title = isCampaign ? "Odzyskany Świt" : "Scenariusze";
			const details = this.api.campaignDetails?.() || {
					badges: {},
					choices: {},
				},
				card = ([id, m]) =>
					`<button class="menu-action mission-card" data-mission="${id}" ${m.requires && !progress[m.requires] ? "disabled" : ""}><span><b>${m.name}${details.badges[id] ? ' <i class="act2-badge" title="Cel dodatkowy wykonany">◆</i>' : ""}</b><small>${m.planet} · ${progress[id] ? "Ukończono" + (details.choices[id] ? (details.choices[id] === "destroy" ? " · kompleks zniszczony" : details.choices[id] === "evacuate" ? " · personel ewakuowany" : " · " + (RTS.CAMPAIGN_DECISIONS?.[id]?.options?.[details.choices[id]]?.name || "").replace(/^./, (c) => c.toLowerCase())) : "") : m.requires && !progress[m.requires] ? "Ukończ: " + RTS.MISSIONS[m.requires].name : "Gotowa do rozpoczęcia"}</small></span><span>↗</span></button>`,
				missions = Object.entries(RTS.MISSIONS)
					.filter(([, m]) => !!m.campaign === isCampaign)
					.sort(([a], [b]) => a.localeCompare(b));
			body = `<div class="campaign-select"><nav class="mission-list campaign-list" aria-label="Akty i rozdziały kampanii"><h2 class="act-heading">Akt I · Odzyskany Świt</h2>${typeof CampaignFilm !== "undefined" ? this.button("intro", "Intro kampanii") : ""}${missions
				.filter(([, m]) => !m.act)
				// The training first, right after the intro, then chapters I–III.
				.sort(([a], [b]) => (b === "training") - (a === "training"))
				.map(card)
				.join(
					"",
				)}<h2 class="act-heading">Akt II · Cena świtu</h2>${progress.colony3 ? this.button("intro2", "Prolog aktu II") : ""}${missions
				.filter(([, m]) => m.act === 2)
				.map(card)
				.join(
					"",
				)}${missions.some(([, m]) => m.act === 3) ? `<h2 class="act-heading">Akt III · Przebudzenie Roju</h2>${progress.colony6 && typeof Act3Film !== "undefined" ? this.button("intro3", "Prolog aktu III") : ""}${missions
				.filter(([, m]) => m.act === 3)
				.map(card)
				.join("")}` : ""}${missions.some(([, m]) => m.act === 4) ? `<h2 class="act-heading">Akt IV · Inwazja</h2>${progress.colony9 && typeof Act4Film !== "undefined" ? this.button("intro4", "Prolog aktu IV") : ""}${missions
				.filter(([, m]) => m.act === 4)
				.sort(([a], [b]) => Number(a.slice(6)) - Number(b.slice(6)))
				.map(card)
				.join("")}${progress.colony14 && typeof FinaleFilm !== "undefined" ? this.button("finale", "Finał kampanii") : ""}` : ""}</nav><aside id="mission-preview" class="galaxy-info mission-preview" aria-live="polite" aria-label="Podgląd wybranego rozdziału"></aside></div>${this.button("campaign-back", "Wróć do wyboru gry")}`;
		} else if (screen === "slots") {
			title =
				this.slotMode === "save" ? "Zapisz w slocie" : "Wczytaj grę";
			body = `<p>Pięć ręcznych zapisów na tym urządzeniu. Autosave pozostaje niezależny.</p><div class="mission-list">${(this.api.slots?.() || []).map((slot, i) => `<button class="menu-action slot-card ${slot.valid ? "" : slot.exists ? "broken" : "empty"}" data-slot="${i + 1}" ${this.slotMode !== "save" && !slot.valid ? "disabled" : ""}><i class="slot-world" data-world="${slot.valid ? RTS.MISSIONS[slot.missionId].theme || RTS.MISSIONS[slot.missionId].biome || "" : ""}"><small>SLOT</small> 0${i + 1}</i><span><b>${slot.valid ? RTS.MISSIONS[slot.missionId].name : slot.exists ? slot.label || "Uszkodzony zapis" : "Wolny slot"}</b><small>${slot.valid ? `${RTS.MISSIONS[slot.missionId].planet} · <em>T+${slot.time}</em> · ${slot.date}` : slot.exists ? "Zapis nieczytelny" : "— brak danych —"}</small></span><span>${this.slotMode === "save" ? "Zapisz" : "Wczytaj"}</span></button>`).join("")}</div><p id="menu-feedback" role="status"></p>${this.button("slots-back", "Wróć")}`;
		} else if (screen === "slot-confirm") {
			title = "Nadpisać slot " + this.slotNumber + "?";
			body = `<p>Dotychczasowy ręczny zapis w tym slocie zostanie zastąpiony bieżącą operacją.</p>${this.button("slot-confirm", "Zapisz w tym slocie", true)}${this.button("slot-cancel", "Anuluj")}`;
		} else if (screen === "briefing") {
			const m = RTS.MISSIONS[this.selectedMission];
			title = m.name;
			body = `<span class="menu-tag">${m.training ? "SZKOLENIE WOLNYCH KOLONII" : m.campaign ? (m.act === 2 ? "KAMPANIA · AKT II · " : m.act === 4 ? "KAMPANIA · AKT IV · " : "KAMPANIA · ROZDZIAŁ ") + m.name : "OPERACJA NIEZALEŻNA"} / ${m.planet}</span><p>${m.description}</p><h2>Cele operacji</h2><p class="menu-objective">${m.campaign ? m.objective : (RTS.describeScenario?.(this.scenario) || RTS.MODES?.[this.scenario.mode])?.objective || "Zniszcz wszystkie wrogie centra dowodzenia."}</p>${this.legacyHtml(m)}${m.facts ? `<div class="menu-facts"><span>${m.facts[0]}</span><span>${m.facts[1]}</span></div><p>Nowa umiejętność: ${m.lesson}. Wskazówki i dziennik łączności w panelu celów; odprawę można powtórzyć z menu pauzy.</p>` : `<div class="menu-facts"><span>Metal · gaz · kryształy<br>${m.training || !m.campaign ? "Start: Przyczółek → rozbudowa w BADANIA" : "Start: Kolonia"}</span><span>${m.commanderFacts || (m.training ? "1800" : m.campaign ? "650" : "400") + " metalu na start<br>" + (m.training ? "Bez wrogich desantów" : "Pierwszy desant po " + (m.campaign ? "100" : "65") + " s")}</span></div><p>PPM robotem na złożu — wydobycie. Reaktor [C], laboratorium [N]. Home — cała mapa.</p>`}${m.campaign ? this.campaignLevelHtml(m) : ""}${this.button("launch", "Rozpocznij operację", true)}${typeof Interludes !== "undefined" && Interludes.has(this.selectedMission) ? this.button("replay-interlude", "Scena łączności") : ""}${this.button("mission-back", "Wróć do wyboru misji")}`;
		} else if (screen === "replace") {
			title = "Rozpocząć od nowa?";
			body = `<p>Rozpoczęcie operacji zastąpi dotychczasowy autosave na tym urządzeniu; ręczne sloty pozostaną zachowane. Powrót do odprawy zachowa postęp.</p>${this.button("confirm", "Rozpocznij i zastąp zapis", true)}${this.button("cancel", "Wróć do odprawy")}`;
		} else if (screen === "pause") {
			title = "Pauza taktyczna";
			const sit = this.api.situation?.();
			body = `<p class="pause-lead">${sit ? `${sit.mission} · ${sit.planet}<br><b>T+${sit.time}</b> · symulacja zatrzymana, oddziały czekają na rozkazy.` : "Symulacja zatrzymana. Twoje oddziały czekają na rozkazy."}</p>${this.button("resume", "Wznów", true)}${this.api.review?.() ? this.button("review", "Odprawa i dziennik") : ""}${this.button("save", "Zapisz w slocie")}${this.button("slots", "Wczytaj grę — sloty")}${this.button("settings", "Ustawienia")}${this.button("knowledge", "Baza wiedzy")}${this.button("home", "Menu główne")}<p id="menu-feedback" role="status"></p>`;
		} else if (screen === "save-error") {
			title = "Nie zapisano postępu";
			body = `<p>Pamięć lokalna jest niedostępna. Możesz wrócić do gry lub opuścić bitwę bez zapisania ostatnich zmian.</p>${this.button("pause", "Wróć do pauzy", true)}${this.button("leave", "Opuść bez zapisu")}`;
		} else if (screen === "settings") {
			title = "Ustawienia";
			body = `<p>Dźwięk i wygląd pokładu dowodzenia.</p><label class="menu-setting">Głośność efektów <output id="menu-volume-value"></output><input id="menu-volume" aria-label="Głośność efektów" type="range" min="0" max="100"></label><label class="menu-setting">Głośność muzyki <output id="menu-music-value"></output><input id="menu-music-volume" aria-label="Głośność muzyki" type="range" min="0" max="100"></label><label class="menu-setting">Jakość dźwięku <select id="menu-audio-quality" aria-label="Jakość dźwięku"><option value="high">Wysoka (próbki, Tone.js, otoczenie)</option><option value="classic">Klasyczna (synteza)</option></select></label><p id="menu-audio-status" class="menu-audio-status" aria-live="off"></p>${[
				["combat", "Walka"],
				["units", "Jednostki i praca"],
				["ambient", "Otoczenie"],
				["alerts", "Komunikaty i rozkazy"],
			]
				.map(
					([key, label]) =>
						`<label class="menu-setting">${label}<output id="mix-${key}-value"></output><input type="range" id="mix-${key}" aria-label="${label}" min="0" max="100"></label>`,
				)
				.join(
					"",
				)}<label class="menu-setting"><input type="checkbox" id="menu-muted"> Wycisz dźwięk</label><label class="menu-setting"><input type="checkbox" id="menu-reduced" ${this.reduced ? "checked" : ""}> Ogranicz animacje menu</label><h2>Odsłuch muzyki</h2><label class="menu-setting">Motyw<select id="music-theme" aria-label="Motyw muzyki">${MUSIC_THEMES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label><label class="menu-setting">Nastrój<select id="music-mood" aria-label="Nastrój muzyki">${MUSIC_MOODS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label><div class="music-preview"><button type="button" id="music-play" class="menu-action"><span>Odtwórz</span><span>▶</span></button><p id="music-now" role="status"></p></div>${
				typeof SceneFX !== "undefined"
					? `<h2>Grafika planszy</h2>${[
							["terrain", "Detale terenu i roślinność"],
							["particles", "Cząsteczki pogody"],
						]
							.map(
								([key, label]) =>
									`<label class="menu-setting">${label}<select id="visual-${key}" aria-label="${label}"><option value="high">Wysokie</option><option value="medium">Średnie</option><option value="low">Niskie</option></select></label>`,
							)
							.join(
								"",
							)}<label class="menu-setting"><input type="checkbox" id="visual-flashes"> Błyski burzy</label><label class="menu-setting"><input type="checkbox" id="visual-metrics"> Pokaż czas renderowania planszy</label><h2>Renderer</h2><label class="menu-setting">Silnik grafiki<select id="visual-renderer" aria-label="Silnik grafiki"><option value="three">3D (Three.js) — teren, modele i kamera 3D</option><option value="webgl">WebGL (PixiJS) — oświetlenie i efekty</option><option value="webgpu">WebGPU (PixiJS) — nowszy interfejs grafiki</option><option value="canvas">Canvas 2D — tryb awaryjny</option></select></label><p id="renderer-status" role="status"></p>${[
								["lights", "Oświetlenie dnia i nocy, światła"],
								["shadows", "Cienie od słońca"],
								["bloom", "Poświata"],
								["water", "Połysk wody"],
								["volume", "Objętość budynków i jednostek (światło z kierunku słońca)"],
								["scars", "Ślady zniszczeń i pożarów"],
								["relief", "Wysokość terenu: rzeźba i cienie gór"],
								["tilt", "Perspektywa 2,5D (lekko pochylona kamera)"],
								["cinema", "Kinowy obraz 3D: tony filmowe, gradacja, odbicia nieba"],
								["ao", "Okluzja otoczenia 3D (cień w zakamarkach)"],
								["pbr", "Teren PBR 3D: skała na zboczach, faktura i rzeźba gruntu"],
								["reflect", "Odbicia w wodzie 3D (brzegi, budynki, niebo)"],
								["atmo", "Atmosfera 3D: mgła w dolinach, smugi słońca"],
								["surface", "Detale modeli 3D: płyty pancerza, starte krawędzie, kurz"],
								["dof", "Głębia ostrości 3D w kosmosie (ostry środek, miękkie brzegi kadru)"],
								["haze", "Falowanie gorącego powietrza 3D (wybuchy, pożary, lawa, silniki)"],
								["shake", "Wstrząs kamery przy dużych wybuchach"],
							]
								.map(([key, label]) => `<label class="menu-setting"><input type="checkbox" id="visual-${key}" class="webgl-effect"> ${label}</label>`)
								.join("")}`
					: ""
			}<h2>Aplikacja i zapisy</h2>${
				typeof window !== "undefined" && window.desktop?.app
					? `<label class="menu-setting"><input type="checkbox" id="app-fullscreen"> Pełny ekran <kbd>F11</kbd></label>`
					: ""
			}<p>Kopia zapasowa wszystkiego, co gra trzyma na tym urządzeniu: zapisy bitew i slotów, postęp kampanii, rekordy i ustawienia — do jednego pliku, który wczytasz na innym komputerze lub po ponownej instalacji.</p><div class="save-transfer"><button type="button" id="saves-export" class="menu-action"><span>Eksportuj zapisy do pliku</span><span aria-hidden="true">↓</span></button><button type="button" id="saves-import" class="menu-action"><span>Importuj zapisy z pliku</span><span aria-hidden="true">↑</span></button><input type="file" id="saves-file" accept=".json,application/json" hidden></div><p id="saves-status" role="status"></p><p id="menu-preferences" role="status">Ustawienia zapamiętujemy na tym urządzeniu.</p>${this.button("back", "Wróć")}`;
		} else if (screen === "knowledge") {
			title = "Baza wiedzy";
			body = KnowledgeBase.template() + this.button("back", "Wróć");
		} else {
			title = "Co nowego";
			body = `<h2>0.11 / Pogoda i doba</h2><p>Śnieżyce, burze piaskowe i ulewy spowalniają ruch i obniżają celność. Cykl dnia i nocy, badania pogodowe w laboratorium, ptaki i ryby oraz pięć aranżacji muzycznych.</p><h2>0.10 / Budowa przez roboty</h2><p>Robot musi dotrzeć na plac budowy. Osłona piechoty przy skałach i murach, rozkaz utrzymania pozycji, opady osiadające na planszy, pożary uszkodzonych maszyn i proceduralna muzyka.</p><h2>0.9 / Rozległe pogranicze</h2><p>Pięć ręcznych slotów, osobne scenariusze i trzy rozdziały kampanii. Ciężka maszyna [Y], artyleria [O], mur [K] i brama [P]. Mapy 3360 × 2160, cztery przekaźniki, nowe złoża, jeziora i drapieżniki. Pogoda i ślady ruchu. Dolny pasek postępu i lewy panel z zakładkami.</p><h2>0.8 / Nowe światy</h2><p>Reaktory, moc, laboratoria i kryształy. Trzy mapy operacji, kampania Wolnych Kolonii z pierwszą misją, różne biomy i rozbudowana oprawa 2D.</p><h2>0.6 / Gospodarka</h2><p>Magazyny polowe, gaz i ekstraktory, bezczynne roboty oraz badanie większych ładowni. Starsze zapisy otrzymują złoża gazu, a zapas gazu zaczyna od zera.</p><h2>0.5 / Pokład dowodzenia</h2><p>Menu główne, gra jednoosobowa z odprawą, kontynuowanie zapisu, baza wiedzy, ustawienia i menu pauzy.</p><h2>0.4 / Dźwięk</h2><p>Broń, eksplozje, rozkazy, powiadomienia i regulacja głośności.</p><h2>Rozważane kierunki</h2><p>Trzeci poziom centrum (Twierdza) i doktryny frakcji, budynki wsparcia i moduły dla dowódcy AI, skały blokujące ostrzał, patrol i eskorta, bohaterowie, edytor map i tabele wyników, nagrane głosy, balans frakcji na podstawie rozgrywek, a później bitwy kosmiczne. To propozycje bez ustalonego terminu.</p>${this.button("back", "Wróć")}`;
		}
		if (screen === "news")
			body =
				"<h2>0.10 / Żywa planeta</h2><p>Deszcz tworzy kałuże, śnieg osiada na terenie, a jeziora drobno falują. Uszkodzone obiekty płoną. Roboty fizycznie budują fundamenty; piechota korzysta z osłon, a Shift+S utrzymuje pozycję. Menu i każdy biom mają własną proceduralną muzykę.</p>" +
				body.replace("Budowa przez roboty, ", "");
		if (screen === "news")
			body =
				"<h2>0.11 / Pogoda i rytm planet</h2><p>Dzień i noc, reflektory, śnieżyce, burze piaskowe i ulewy z piorunami. Pogoda wpływa na ruch i celność. Laboratorium bada monitoring, celowanie adaptacyjne i napędy terenowe. Ptaki, ryby oraz pięć odmiennych aranżacji muzycznych.</p>" +
				body;
		if (screen === "news")
			body =
				"<h2>0.15 / Armia i baza — etap B</h2><p>Transporter przewozi czterech piechurów: PPM na pojazd, potem Wyładuj. Bateria przeciwlotnicza osłania bazę. Formacje Linia, Kolumna i Rozproszenie zmieniają rozkaz ruchu. Nowe sylwetki i animacje piechoty, detale frakcji, radiowe sygnały rozkazów oraz porównanie parametrów: Oddział / Statystyki.</p>" +
				"<h2>0.15 / Rozwój kolonii — etap A</h2><p>Drzewo rozwoju F2, panel ekonomii, awans Przyczółek → Kolonia, akumulator i warsztat. Nowe badania: Narzędzia wydobywcze (+25% pobrania), Montaż modułowy (+25% tempa budowy), Szkolenie manewrowe (+10% ruchu piechoty). Gra jednoosobowa → Szkolenie: Próba kolonii uczy tych zasad na bezpiecznym poligonie.</p>" +
				"<h2>0.14 / Światło i dźwięk</h2><p>Okrągły księżyc, światła nawigacyjne samolotów, pełnoekranowy prolog z sześcioma scenami i osobną muzyką. Bazy w rogach, więcej przekaźników przy złożach oraz dźwięki pracujących robotów.</p>" +
				"<h2>0.13 / Odzyskany Świt</h2><p>Przywrócone detale budowli, swobodne i okrągłe mury, rozbiórka, łagodniejsza ulewa. Zwarte kafle i konfiguracja scenariusza z podglądem. Osobne mapy kampanii oraz animowany prolog.</p>" +
				"<h2>0.12 / Frakcje i lotnictwo</h2><p>Dwie frakcje, konfiguracja bitwy dla 2–4 uczestników, myśliwce, bombowce i hangar. Przeciągane mury, bramy i wieże. Bryły budynków, dachy, cienie i nowa fauna. Osobny regulator muzyki.</p>" +
				body;
		if (screen === "news")
			body =
				"<h2>0.171.17 / Testy i narzędzia</h2><p>Pewniejsze testy grafiki i serwera — zmiany pod spodem, bez wpływu na rozgrywkę.</p>" +
				"<h2>0.171.16 / Poprawki gry sieciowej</h2><p>Zerwane połączenie nie zatrzymuje już bitwy innym, powrót do długiej bitwy nikogo nie zamraża, a gracze z różnymi wersjami gry nie trafią do jednej bitwy.</p>" +
				"<h2>0.171.15 / Poprawki grafiki</h2><p>Plansza 3D płynniej znosi stawianie i niszczenie budynków, nie zamraża podglądu budowy po zmianie rozmiaru okna i nie zostawia śmieci w pamięci przy zmianie mapy.</p>" +
				"<h2>0.171.14 / Poprawki dźwięku</h2><p>Radio nie zagłusza już bitwy, Vok i Brama mają własne głosy, muzyka zmienia się płynnie i czeka razem z filmem, gdy wyjdziesz z okna, a motyw bitwy po pauzie gra dalej.</p>" +
				"<h2>0.171.13 / Poprawki interfejsu</h2><p>Esc, Spacja i M działają tam, gdzie powinny, HUD w grze sieciowej pokazuje Twoją armię, import zapisów nie ginie, a wąskie okna mieszczą pasek dowodzenia.</p>" +
				"<h2>0.171.12 / Poprawki kampanii</h2><p>Spójna historia techników z Hefajstosa, uczciwe liczby kapsuł i skutków decyzji, odprawa XIV z sojusznikami, poprawione teksty aktu IV i prologu aktu II.</p>" +
				"<h2>0.171.11 / Poprawki rozgrywki</h2><p>Atak z marszem nie urywa się po pościgu, rakiety skutecznie niszczą wszystkie pojazdy i budynki, komputer odbudowuje robotników i szuka rudy, a sojusznik w 2 na 2 korzysta z przekaźników strony.</p>" +
				"<h2>0.171.10 / Poprawki z przeglądu</h2><p>Bezpieczniejszy serwer lobby, decyzje fabularne naprawdę wstrzymują bitwę, a plansza 3D płynniej reaguje na kursor.</p>" +
				"<h2>0.171.9 / Głosy w prologach</h2><p>W prologach aktów II–IV mówią Lira, dr Tessa, komandor Varn i adm. Vok, a muzyka płynniej przechodzi między scenami.</p>" +
				"<h2>0.171.8 / Testy i odporność</h2><p>Testy grafiki sprawdzają burze, kosmos i niebo; gra nie wyrzuca błędu przy zdarzeniach spoza elementów strony.</p>" +
				"<h2>0.171.7 / Kosmos i pogoda</h2><p>Wyraźniejsze mgławice, Szkarłatna Mgławica z przerwami między obłokami, siatka gaśnie pod chmurami. Burze nie zacierają planszy przy średnim przybliżeniu, a nocą nie świecą bladą mgłą.</p>" +
				"<h2>0.171.6 / Mgławice nieba</h2><p>Niebo w kosmosie ma kłębiaste mgławice z jasnym sercem i pasmami pyłu — pochyl kamerę (PageUp), by zobaczyć je nad bitwą.</p>" +
				"<h2>0.171.5 / Chmury mgławicy</h2><p>Mgławice wokół złóż gazu w kosmosie mają miękkie brzegi, włókna i powoli dryfują — bez prostych krawędzi i płaskich plam.</p>" +
				"<h2>0.171.4 / Chmury gazu</h2><p>Złoża gazu w kosmosie to teraz miękka, świecąca spirala zamiast płaskich krążków.</p>" +
				"<h2>0.171.3 / Deszcz i piasek na przybliżeniu</h2><p>W ulewie i burzy piaskowej światła reflektorów nie rysują już płaskich, jasnych klinów na planszy przy przybliżeniu.</p>" +
				"<h2>0.171.2 / Burze na przybliżeniu</h2><p>Na przybliżeniu burza nie zaciera już planszy: zasłony śniegu, smugi i mgła rzedną, gdy kamera jest blisko ziemi. Z daleka zamieć wygląda jak dawniej.</p>" +
				"<h2>0.171.1 / Zaznaczenie budynków</h2><p>Zaznaczony budynek na planszy 3D nie ma już białej, kropkowanej obwódki nad sobą — tylko delikatny pierścień u podstawy, jak jednostki.</p>" +
				"<h2>0.171 / Nowe prologi aktów II–IV</h2><p>Prologi aktów II, III i IV opowiadają dłuższe historie prowadzące do pierwszego rozdziału aktu — po około 75 sekund, z własną muzyką. Prologi aktów III i IV zmieniają się zależnie od Twoich decyzji.</p>" +
				"<h2>0.170 / Nowy finał kampanii</h2><p>Film finału pokazuje, co stało się na koniec przygody — od pęknięcia Bramy po świt nad Eos z zapaloną latarnią. Około 2 minut, zależnie od Twoich decyzji, z nową muzyką.</p>" +
				"<h2>0.169 / Nowy prolog kampanii</h2><p>Intro opowiada historię pogranicza w 15 ujęciach (ok. 2,5 minuty) — od pierwszych osad i sieci latarni, przez blokadę Dominium, po lądowanie przy Stacji Ciszy na Eos. Z nową muzyką i głosem Liry.</p>" +
				"<h2>0.168.6 / Szkolenie na początku aktu I</h2><p>Na ekranie kampanii szkolenie stoi zaraz po intro, przed rozdziałami I–III.</p>" +
				"<h2>0.168.5 / Intro kampanii z przycisku</h2><p>Intro odtwarza się tylko przy pierwszym wejściu w kampanię; potem obejrzysz je przyciskiem „Intro kampanii” przy akcie I.</p>" +
				"<h2>0.168.4 / Nowa muzyka intro</h2><p>Prologi aktów mają nową muzykę w stylu finału: zegar, fortepian, organy i pytający dźwięk na końcu.</p>" +
				"<h2>0.168.3 / Muzyka finału kampanii</h2><p>Film końcowy ma własną muzykę zwycięstwa — od zegara i fortepianu po pełne organy i nagłą ciszę na koniec.</p>" +
				"<h2>0.168.2 / Jednolite listy wyboru</h2><p>Wszystkie listy w menu — ustawienia, scenariusze, odprawa i gra sieciowa — wyglądają tak samo, z własną strzałką i ciemną listą opcji.</p>" +
				"<h2>0.168.1 / Pole poziomu trudności</h2><p>Lista poziomu trudności w odprawie wygląda jak pozostałe pola menu.</p>" +
				"<h2>0.168 / Muzyka pozostałych map</h2><p>Wydmy, Szron, Szczyty, Oaza, Sygnał i Konwój — każda mapa gra teraz muzykę dla siebie.</p>" +
				"<h2>0.167.4 / Muzyka Bastionu Admiralicji</h2><p>Sygnał trąbki garnizonu, smyczki w takt marszu i dalekie działa z murów.</p>" +
				"<h2>0.167.3 / Muzyka Ruin Nadiru</h2><p>Flet odbija się echem od murów, gong cytadeli budzi się co kilka taktów, a w tle gra rytualny bęben.</p>" +
				"<h2>0.167.2 / Muzyka Lodowego Archiwum</h2><p>Archiwum gra teraz pozytywkę spod lodu, a lód pęka i jęczy — częściej, gdy robi się gorąco.</p>" +
				"<h2>0.167.1 / Muzyka doliny Eos</h2><p>Latarnie dla Doliny Latarni i Popioły dla Wypalonej Doliny — ta sama melodia przed desantem i po nim.</p>" +
				"<h2>0.167 / Muzyka nowych map</h2><p>Osiem nowych motywów — morze, kryształ, ruiny, bastion, archiwum, doki, mgławica i komety; do odsłuchania w ustawieniach.</p>" +
				"<h2>0.166.2 / Balans rozdziału XIII</h2><p>Na łatwym i średnim kwatera Vok jest słabiej umocniona, a po odparciu desantu uderzenia z orbity ustają.</p>" +
				"<h2>0.166.1 / Pasek przewijania w panelu bocznym</h2><p>Zakładki panelu bocznego przewijają się takim samym paskiem jak okna menu.</p>" +
				"<h2>0.166 / Przypływy, lód i komety</h2><p>Przypływy zalewają mielizny Thalassy, lód Archiwum pęka pod wybuchami, a nowa mapa Szlak Komet ma komety, których warkocze ranią statki i odnawiają gaz.</p>" +
				"<h2>0.165 / Archipelag Thalassy i Kryształowe Grzbiety</h2><p>Dwa nowe światy: morze z wyspami i mieliznami oraz grzbiety świecących kryształów — tam toczy się teraz rozdział XIII.</p>" +
				"<h2>0.164 / Doki Eos i Szkarłatna Mgławica</h2><p>Rozdział X w stoczni orbitalnej nad Eos; nowa mapa kosmiczna, w której większość pola zalega mgławica.</p>" +
				"<h2>0.163 / Wypalona Dolina i Bastion Admiralicji</h2><p>Nowe mapy rozdziałów XI i XII: dolina z rozdziału I po desancie i twierdza za murami z bramami — także w scenariuszach i sieci.</p>" +
				"<h2>0.162 / Nowe mapy kampanii</h2><p>Rozdziały I–III na własnych mapach: Dolina Latarni, Lodowe Archiwum i Ruiny Nadiru — do zagrania także w scenariuszach i sieci.</p>" +
				"<h2>0.161 / Film finału kampanii</h2><p>Po zwycięstwie w rozdziale XIV — film końcowy kampanii zależny od Twoich decyzji; do obejrzenia ponownie z ekranu kampanii.</p>" +
				"<h2>0.160.1 / Bez zwierząt w kosmosie</h2><p>Na mapach kosmicznych w trybach Canvas i WebGL nie pojawiają się już zwierzęta.</p>" +
				"<h2>0.160 / Akt IV: balans rozdziałów</h2><p>Rozdziały X–XIV dostroiły się do poziomu trudności: garnizony i wieże przeciwnika, tempo desantu w XI i XIII, straż szczelin i wytrzymałość Bramy w XIV. Akt IV jest ukończony.</p>" +
				"<h2>0.159 / Akt IV: XIV · Brama — finał aktu</h2><p>Zamknij trzy szczeliny Wartowników przy czarnej dziurze Erebus i zniszcz Bramę — z flotą Vok i okrętami Varna, jeśli tak zdecydowałeś. Nowy prolog i epilog aktu IV zależny od Twoich decyzji.</p>" +
				"<h2>0.158 / Akt IV: XIII · Ostatnia orbita</h2><p>Odwrócona inwazja: Vok trzyma orbitę i zrzuca kapsuły na Biały Przesmyk. Przetrwaj desant pod osłoną baterii przeciwlotniczych, potem uderz na jej kwaterę — i zdecyduj: rozejm z Vok przeciw Wartownikom czy klęska Admiralicji.</p>" +
				"<h2>0.157.2 / Pole adresu serwera</h2><p>Pole „Adres serwera” wygląda jak pozostałe pola tekstowe menu.</p>" +
				"<h2>0.157.1 / Kafelki miejsc w pokoju gry</h2><p>Przyciski miejsca w pokoju gry sieciowej są pod nazwą gracza i nie wychodzą poza kafelek.</p>" +
				"<h2>0.157 / Akt IV: XII · Twierdza Admiralicji</h2><p>Doprowadź technika do stacji uplink przez zasadzkę Admiralicji, potem zdobądź Twierdzę — pod ogniem szczelin Wartowników. Decyzja: garnizon Varna albo stocznia Admiralicji zmienia rozdział XIII. Dowódca AI Admiralicji działa teraz we wszystkich rozdziałach aktu IV.</p>" +
				"<h2>0.156.2 / Przewijanie raportu końca</h2><p>Długi raport z operacji ma widoczny pasek przewijania.</p>" +
				"<h2>0.156.1 / Kursor nad oknami dialogowymi</h2><p>Kursor myszy nie znika już nad oknem wyboru doktryny, statystykami i drzewem rozwoju.</p>" +
				"<h2>0.156 / Akt IV: Inwazja — rozdziały X i XI</h2><p>Nowy akt kampanii po rozdziale IX. Przełam blokadę orbity Eos flotą z lotniskowcem — ocalałe statki to kapsuły desantowe na rozdział XI, w którym lądujesz na Cichym Horyzoncie pod ogniem baterii Admiralicji. Adm. Selen Vok, tajemniczy Głos Bramy i pierwsze szczeliny Wartowników. Rozdziały XII–XIV w wersji roboczej.</p>" +
				"<h2>0.155.1 / Czytelność map w kosmosie</h2><p>Planeta, pierścienie, czarna dziura, mgławice i słońce przygaszone, skały pod polem bitwy nie udają już przeszkód, a pod planszą leży ciemne tło. Statki mają świecące paski w kolorze strony.</p>" +
				"<h2>0.155 / Inwazja i tryby w grze sieciowej</h2><p>Gra wieloosobowa: nowe pole Tryb — przekaźniki, król wzgórza, ekspedycja i Inwazja (orbita, potem lądowanie, kapsuły i uderzenia z orbity przez sieć). Przez serwer, przeciw samym komputerom: Obrona i Przetrwanie w kooperacji.</p>" +
				"<h2>0.154 / Wartownicy Otchłani</h2><p>Czwarta frakcja: rasa maszyn z białego kamienia i światła. Tarcze na wszystkim, lewitacja, Rezonatory zamiast górników. Iskra skacze (⇧Q), Strażnik wchodzi w fazę, dwaj strażnicy scalają się w Konstrukt, Pryzmat i Łuk biją wiązką i łańcuchem. Kotwice otwierają szczeliny i teleporty, a Rdzeń potrafi przelecieć. Wybierz ich w scenariuszu albo w grze sieciowej.</p>" +
				"<h2>0.153 / Lobby i 2 na 2 przez sieć</h2><p>Gra wieloosobowa przez serwer: lista gier, 1 na 1 i 2 na 2, komputer na wolnym miejscu, czat. Po zerwaniu połączenia gra łączy się sama i wraca do bitwy; w tym czasie Twoją stronę prowadzi komputer.</p>" +
				"<h2>0.152.1 / Szuflada celów</h2><p>Bez poziomego przewijania w szufladzie celów; szuflada chowa się pod raportem zwycięstwa lub porażki.</p>" +
				"<h2>0.152 / Inwazja — desant z orbity</h2><p>Nowy tryb scenariusza: najpierw zdobądź orbitę nad planetą, potem wyląduj. Kto panuje na orbicie, ma kapsuły desantowe, uderzenie z orbity i skan; baterie przeciwlotnicze zestrzeliwują kapsuły.</p>" +
				"<h2>0.151.3 / Złoża do wykorzystania</h2><p>Mgławice i złoża gazu nie leżą już w asteroidach ani tuż przy innych złożach — na każdym da się postawić ekstraktor.</p>" +
				"<h2>0.151.2 / Okna w stylu gry</h2><p>Wybór doktryny i import zapisów potwierdzasz we własnym oknie gry — z efektem doktryny, tą, która zostanie zablokowana, kosztem i czasem.</p>" +
				"<h2>0.151.1 / Płynny pasek ładowania</h2><p>Pasek postępu przy wczytywaniu mapy rusza się przez cały czas, także gdy gra buduje planszę.</p>" +
				"<h2>0.151 / Aplikacja na Windows</h2><p>Gra jako aplikacja z instalatorem, działająca bez internetu: pełny ekran (F11), zapamiętane okno, przycisk wyjścia. W Ustawieniach → Aplikacja i zapisy eksport i import wszystkich zapisów do pliku.</p>" +
				"<h2>0.150.2 / Szersze kafle</h2><p>Kafle produkcji są szersze — nazwy mieszczą się swobodniej.</p>" +
				"<h2>0.150.1 / Jednakowe kafle</h2><p>Kafle produkcji mają ten sam rozmiar we wszystkich zakładkach.</p>" +
				"<h2>0.150 / Przeciwnik z doktryną</h2><p>Dowódca AI (średni i trudny poziom) buduje Twierdzę i przyjmuje doktrynę dobraną do sytuacji, patroluje drogi do przekaźników, osłania dalekie wydobycie i eskortuje artylerię w natarciu.</p>" +
				"<h2>0.149.4 / Równe strzałki</h2><p>Strzałki stronicowania kafli produkcji są na środku przycisków.</p>" +
				"<h2>0.149.3 / Odstęp przy stronicowaniu</h2><p>Stronicowanie kafli produkcji nie nachodzi już na pasek postępu kolejki.</p>" +
				"<h2>0.149.2 / Kafle w jednym rzędzie</h2><p>Kafle produkcji w jednym, wyższym rzędzie — pełniejsze nazwy, koszt i czas pod spodem; zakładki na wspólnej linii.</p>" +
				"<h2>0.149.1 / Małe kafle produkcji</h2><p>Karty produkcji to małe kafle w dwóch rzędach; opis, parametry, wymagania i pełny koszt w oknie po najechaniu myszką.</p>" +
				"<h2>0.149 / Zwarty interfejs bitwy</h2><p>Plansza na całą szerokość, panel celów jako zwijana szuflada nad mapą, niższy pasek zasobów i dolna konsola.</p>" +
				"<h2>0.148 / Patrol i eskorta</h2><p>Nowe rozkazy: patrol (⇧P) — oddział krąży po trasie i walczy po drodze; eskorta (⇧E) — oddział chroni wskazaną jednostkę lub budynek i trzyma się przy nim.</p>" +
				"<h2>0.147.9 / Delikatniejsze paski życia</h2><p>Paski życia nad jednostkami są cieńsze i półprzezroczyste — nie zasłaniają jednostek.</p>" +
				"<h2>0.147.8 / Dyskretne zaznaczenie</h2><p>Bez białego okręgu nad zaznaczonymi jednostkami, delikatniejszy pierścień pod nimi — jednostki są lepiej widoczne.</p>" +
				"<h2>0.147.7 / Noce w kampanii</h2><p>Świetlisty Gąszcz jest nocą czytelny — mech ma fakturę, a świecące rośliny nadal się odcinają.</p>" +
				"<h2>0.147.6 / Noce na magmie</h2><p>Na mapach magmowych czarna lawa jest nocą czytelna w świetle księżyca.</p>" +
				"<h2>0.147.5 / Noce na pustyni</h2><p>Na mapach pustynnych piasek odbija światło księżyca — noce są tam jaśniejsze.</p>" +
				"<h2>0.147.4 / Noce na popiele</h2><p>Na mapach popielnych ciemny bazalt jest nocą czytelny; cienie chmur nie kładą się w świetle księżyca.</p>" +
				"<h2>0.147.3 / Jasne noce na lodzie</h2><p>Na mapach lodowych śnieg odbija światło księżyca — noce są tam jaśniejsze.</p>" +
				"<h2>0.147.2 / Przejrzystsze burze</h2><p>Śnieżyca i ulewa mniej zasłaniają planszę — mniej mgły, cieńsze ściany śniegu; burze nadal widać i czuć.</p>" +
				"<h2>0.147.1 / Jaśniejsze noce</h2><p>Mapy nocą są czytelniejsze w świetle księżyca, a burze piaskowe mniej zasłaniają planszę.</p>" +
				"<h2>0.147 / Twierdza i doktryny</h2><p>Trzeci poziom centrum — Twierdza: wytrzymalsze centrum, +4 metalu/s i wybór jednej z dwóch doktryn frakcji (ostateczny). Kolonie: mobilność albo fortyfikacja przyczółków; Dominium: ciężki ostrzał albo silniejsze osłony; Rój: nawała albo pancerz chitynowy.</p>" +
				"<h2>0.146 / Skały blokują ostrzał</h2><p>Skała między strzelcem a celem zatrzymuje broń bezpośrednią obu stron. Jednostki wybierają cele na czystej linii, a z rozkazem ataku obchodzą skałę. Artyleria, granatnicy i lotnictwo strzelają ponad nią.</p>" +
				"<h2>0.145 / Muzyka kosmosu</h2><p>Cztery motywy dla map w kosmosie w duchu „Interstellar”: Orbita, Pierścienie, Horyzont zdarzeń i Requiem floty — organy, tykający zegar, fortepian, narastające warstwy i nagła cisza; w bitwie gnające ostinato organów. Posłuchasz ich w Ustawieniach.</p>" +
				"<h2>0.144.3 / Hologramy dowodzenia</h2><p>Holograficzne zaznaczenie, płynące linie rozkazów ze znacznikami celu, czerwony celownik ataku, wiązki energii przy przejmowaniu przekaźnika i rozbłysk po przejęciu.</p>" +
				"<h2>0.144.2 / Żywe planety</h2><p>Trawa kładzie się pod pojazdami, wybuchy przewracają drzewa, pojazdy wzbijają kurz, błoto i śnieg, mgła wojny kłębi się nad nieznanym terenem, a świt i zmierzch mają złote światło i długie cienie.</p>" +
				"<h2>0.144.1 / Kosmos w ruchu</h2><p>Dopalacze przy ruszaniu i skrętach, pył rozstępujący się przed statkami, iskry i odpryski przy trafieniach w kadłub, płynące pasy gazowego olbrzyma i wybuchające jeziora lawy.</p>" +
				"<h2>0.144 / Efekty walki</h2><p>Falowanie gorącego powietrza nad ogniem i wybuchami, wstrząs kamery i fala pyłu przy dużych wybuchach, biały błysk na początku wybuchu, iskry i ulatujący gaz z uszkodzonych maszyn, przylot statków z nadprzestrzeni. Falowanie i wstrząs wyłączysz w ustawieniach grafiki.</p>" +
				"<h2>0.143.8 / Przekaźniki w kosmosie</h2><p>Przekaźnik na orbicie to duży satelita: obracający się pierścień, skrzydła paneli słonecznych, antena paraboliczna i światła w kolorze właściciela.</p>" +
				"<h2>0.143.7 / Surowce w kosmosie</h2><p>Mgławica to wir świecącego gazu z jasnym jądrem, asteroida rudy ma bryłki metalu i świecące żyły, kryształy wyrastają z rozłupanej asteroidy na wszystkie strony.</p>" +
				"<h2>0.143.6 / Pyros</h2><p>Wulkaniczny księżyc wrócił do pierwotnej wielkości; pióropusze wulkanów usunięte.</p>" +
				"<h2>0.143.5 / Większy Pyros</h2><p>Wulkaniczny księżyc na Cmentarzysku Floty jest większy, a pióropusze wulkanów delikatniejsze.</p>" +
				"<h2>0.143.4 / Wulkaniczny księżyc</h2><p>Pyros jak Io: siarkowe równiny, kaldery z jeziorami lawy, potoki lawy i pióropusze wulkanów na krawędzi tarczy.</p>" +
				"<h2>0.143.3 / Lodowy olbrzym</h2><p>Glacjalis przewrócony na bok jak Uran, z pierścieniami otwartymi wokół niego, chmurami metanowymi i ciemną burzą — nie zasłania już planszy.</p>" +
				"<h2>0.143.2 / Gargantua</h2><p>Czarna dziura na Wrotach Pustki jak w „Interstellar”: cień, pierścień fotonowy, dysk przecinający horyzont i jego obraz zagięty nad i pod nim.</p>" +
				"<h2>0.143.1 / Wraki okrętów</h2><p>Wraki na Cmentarzysku Floty to teraz prawdziwe okręty: przełamane kadłuby, nadbudówki, wieże, dysze i żarzące się przełomy. Nie obracają się już jak asteroidy.</p>" +
				"<h2>0.143 / Trzy nowe mapy w kosmosie</h2><p>Pierścienie Glacjalis (lodowy olbrzym), Wrota Pustki (czarna dziura) i Cmentarzysko Floty (wulkaniczny księżyc i wraki okrętów) — każda z własnym niebem, światłem, przeszkodami i burzami.</p>" +
				"<h2>0.142.2 / Łagodniejsza głębia</h2><p>Głębia ostrości w kosmosie mniej rozmywa dalsze partie planszy.</p>" +
				"<h2>0.142.1 / Ostrzeżenia burz</h2><p>Ostrzeżenia przed burzami w kosmosie opisują ich prawdziwe skutki zamiast ograniczenia ruchu.</p>" +
				"<h2>0.142 / Burze kosmiczne</h2><p>Na orbicie po burzy jonowej przychodzą burza słoneczna (wyczerpuje osłony) i deszcz asteroid (uderzenia odłamków, gdy trwa dłużej). Nowe badanie: osłony przeciwmeteorytowe.</p>" +
				"<h2>0.141.2 / Silniki w ramionach</h2><p>Gondole na końcach ramion dokujących stacji świecą od spodu płomieniami małych silników.</p>" +
				"<h2>0.141.1 / Napędy stacji</h2><p>Stacje w kosmosie mają pod platformą migoczące płomienie dysz i poświatę napędów.</p>" +
				"<h2>0.141 / Piraci</h2><p>Na orbicie z kryjówek w asteroidach najeżdżają piraci — na gracza i na AI na zmianę. Nagrody w metalu za zniszczone okręty i kryjówki; liczba piratów z ustawienia fauny.</p>" +
				"<h2>0.140 / Burza jonowa</h2><p>Na orbicie przechodzą burze jonowe: celność spada, osłony się nie odnawiają, statki nie zwalniają; kurtyny plazmy jak zorza, wyładowania i migocząca siatka. Prognoza z monitoringu pogody.</p>" +
				"<h2>0.139 / Otoczenie orbity</h2><p>Wolumetryczne mgławice, lód z pierścieni dryfujący przez bitwę, kometa z warkoczami i drony naprawcze przy wraku stacji.</p>" +
				"<h2>0.138.3 / Pogoda na modelach</h2><p>Śnieg, piasek i deszcz osiadają na pojazdach, piechocie, budynkach i zwierzętach: zaspy, pył w kolorze gruntu, mokre błyszczące kadłuby ze strużkami wody.</p>" +
				"<h2>0.138.2 / Zamieć</h2><p>Śnieżyca to teraz zamieć: płatki i smugi śniegu pędzą z wiatrem, białe kurtyny zadymki, śnieg zmiatany przy ziemi i porywy aż ku białej ścianie.</p>" +
				"<h2>0.138.1 / Miękka mgła burzy</h2><p>Pył, mgła i deszcz płynnie znikają przy gruncie — bez ostrych linii na zboczach.</p>" +
				"<h2>0.138 / Płonące budynki</h2><p>Budynki płoną w stałych ogniskach: falujące języki ognia od żółtej podstawy po czerwony czubek, iskry i dym; ogień świeci także w dzień. W kosmosie z modułów tryskają strugi ognia i iskry.</p>" +
				"<h2>0.137 / Ogień i wybuchy</h2><p>Kłębiaste kule ognia w barwach żaru przechodzące w sadzę, grona wybuchów, iskry-smugi, płonące odłamki z warkoczami dymu i dym podświetlony ogniem.</p>" +
				"<h2>0.136 / Lotniskowiec</h2><p>Stocznia ciężka buduje lotniskowiec, który wypuszcza do 4 myśliwców atakujących wrogów wokół niego. Statki mogą już strzelać do celów latających.</p>" +
				"<h2>0.135.3 / Rozpad stacji</h2><p>Zniszczone stacje w kosmosie pękają na pół razem z platformą i rozsypują się na odłamki — wolniej i ciężej niż statki.</p>" +
				"<h2>0.135.2 / Rozpad statków</h2><p>Zniszczony statek pęka na pół — dziób i rufa odlatują, wirując, z żarem na krawędziach — a odłamki kadłuba rozlatują się w kosmos.</p>" +
				"<h2>0.135.1 / Cienkie linie wysokości</h2><p>Linie od statków do płaszczyzny taktycznej to cienkie, przygaszone kreski zamiast białych kołków przy oddaleniu.</p>" +
				"<h2>0.135 / Głębia ostrości</h2><p>W kosmosie ostry środek kadru i miękko rozmyte brzegi, mocniej przy zbliżeniu; anamorficzne smugi przy wybuchach. Głębię ostrości wyłączysz w ustawieniach grafiki.</p>" +
				"<h2>0.134 / Głębia kosmosu</h2><p>Pod bitwą na orbicie: dalekie asteroidy, konwoje i wrak stacji; ciepłe światło planety na kadłubach, iluminatory, flara; bąble osłon, wybuchy w próżni, dryfujące wraki; zorze, pierścienie z drobin, linie wysokości statków.</p>" +
				"<h2>0.133.1 / Gładkie smugi</h2><p>Smugi silników statków to teraz ciągła, miękka wstęga gasnąca za statkiem zamiast przerywanych kresek.</p>" +
				"<h2>0.133 / Kosmos jak z filmu</h2><p>Na orbicie w 3D bitwa unosi się nad nocną stroną gazowego olbrzyma z pierścieniami i sierpem atmosfery, wśród gwiazd, Drogi Mlecznej i mgławic; płaszczyzna bitwy jest przezroczysta, z siatką taktyczną i ramką mapy.</p>" +
				"<h2>0.132.1 / Dron górniczy</h2><p>Na orbicie robot to unoszący się dron górniczy z dyszami, chwytakami i wiązką górniczą; bez śladów gąsienic w kosmosie.</p>" +
				"<h2>0.132 / Boje i kosmiczne surowce</h2><p>Na orbicie: przekaźniki jako unoszące się boje, asteroidy rudy, kieszenie mgławicy i odłamki kryształu; smugi silników, lasery, pył kosmiczny, pierścienie planety i odległe galaktyki.</p>" +
				"<h2>0.131.1 / Raport bez pasków</h2><p>Okno zwycięstwa i porażki mieści się w całości — bez pasków przewijania, liczby w jednym rzędzie.</p>" +
				"<h2>0.131 / Stacje i mgławice</h2><p>Budynki na orbicie stoją na unoszących się platformach. Mgławica chroni przed trafieniami, ale blokuje odnawianie osłon; asteroidy dają osłonę statkom tuż przy nich.</p>" +
				"<h2>0.130 / Bitwa na orbicie</h2><p>Nowa mapa „Orbita Kharona”: walka w kosmosie nad gazowym olbrzymem, pas asteroid i statki z regenerującymi się osłonami — korwety, fregaty, niszczyciele i krążowniki ze stoczni.</p>" +
				"<h2>0.129.5 / Karty dowodzenia</h2><p>Efekt najechania na kartę jednostki, budynku i badania nie wychodzi poza kartę, a jej podświetlona krawędź idzie po zaokrągleniach.</p>" +
				"<h2>0.129.4 / Ostre napisy planszy</h2><p>Artefakt, Szczyt, odliczanie uderzenia orbitalnego i koszt muru w 3D — ostre karty nad miejscem zamiast rozmytych napisów na ziemi.</p>" +
				"<h2>0.129.3 / Flaga zbiórki w 3D</h2><p>Punkt zbiórki na planszy 3D to stojący maszt z falującą flagą zamiast płaskiego rysunku na ziemi.</p>" +
				"<h2>0.129.2 / Ostre napisy celów</h2><p>Etykiety celów misji kampanii w 3D są ostre i poziome, na karcie nad celem, zamiast rozmytych napisów na terenie.</p>" +
				"<h2>0.129.1 / Czysty zmierzch</h2><p>O świcie i zmierzchu nad planszą 3D nie pojawiają się już białe kreski — smugi słońca widać pod słońce, przy widoku ku horyzontowi.</p>" +
				"<h2>0.129 / Mgła wojny dla AI</h2><p>Przeciwnik widzi tylko to, co jego jednostki: pamięta zobaczone budynki i armię, wysyła zwiadowców, a ukryta rozbudowa może go zaskoczyć.</p>" +
				"<h2>0.128 / Modele z życiem</h2><p>Jednostki i budynki w 3D z płytami pancerza, startymi krawędziami, kurzem planety u dołu i na dachach oraz zaciekami brudu.</p>" +
				"<h2>0.127.1 / Czystsze burze</h2><p>Burza piaskowa i śnieżyca w 3D bez mlecznego zamglenia i białych kresek: właściwe kolory pyłu i śniegu, delikatniejsze ziarna piasku.</p>" +
				"<h2>0.127 / Atmosfera i woda w 3D</h2><p>Jeziora odbijają brzegi, budynki i niebo, mgła leży w dolinach i świeci pod słońce, dal blednie, a od słońca rozchodzą się smugi światła.</p>" +
				"<h2>0.126 / Teren PBR w 3D</h2><p>Grunt z prawdziwymi materiałami: kamień na zboczach bez rozciągania, zmarszczki piasku, pęknięcia lodu, żwir na popiele, rzeźba w świetle i płaty, przez które mapa się nie powtarza.</p>" +
				"<h2>0.125 / Kinowy obraz 3D</h2><p>Plansza 3D w jakości filmowej: okluzja otoczenia, poświata świateł i ognia, tony jak w kinie, gradacja kolorów według planety i pory dnia, odbicia nieba i ostrzejsze cienie. Przełączniki w Ustawieniach → Renderer.</p>" +
				"<h2>0.124 / Wieczna noc</h2><p>Nowa długość doby w scenariuszach i grze sieciowej: cała bitwa toczy się nocą, przy księżycu i reflektorach.</p>" +
				"<h2>0.123 / Płynna gra sieciowa</h2><p>Gospodarz bitwy wieloosobowej nie ma już przycięć: czekanie na ruchy drugiego gracza nie jest potem nadrabiane skokami.</p>" +
				"<h2>0.122 / Wybór rozdziału z podglądem</h2><p>Zamiast mapy galaktyki: lista rozdziałów i podgląd wskazanego — obracająca się planeta, stan, dane, opis, cel i przycisk odprawy.</p>" +
				"<h2>0.121 / Mapa galaktyki na pełnym ekranie</h2><p>Ekran kampanii to sama mapa galaktyki na całym ekranie; lista rozdziałów, karta planety i powrót leżą na niej jak w grze.</p>" +
				"<h2>0.120 / Prologi i sceny na pełnym ekranie</h2><p>Prologi aktów II i III oraz sceny łączności przed rozdziałami wyświetlają się na całym ekranie, tak jak intro kampanii.</p>" +
				"<h2>0.119 / Odblokowanie kampanii do testów</h2><p>W menu Ctrl+Shift+L odblokowuje wszystkie rozdziały kampanii; ponowne naciśnięcie przywraca wcześniejszy postęp.</p>" +
				"<h2>0.118 / Nowa mapa galaktyki</h2><p>Mapa kampanii na całe okno ze zwijaną listą, kamera najeżdżająca na planetę, głębia i paralaksa, żywa trasa z sondą, numery rozdziałów, regiony aktów i karta planety z obracającym się podglądem.</p>" +
				"<h2>0.117 / Nowy panel badań</h2><p>Karty badań z dziedziną, stanem w kolorze, krótkim opisem i kosztem; trwające badanie na początku z procentem, czasem i paskiem postępu, licznik zbadanych.</p>" +
				"<h2>0.116 / Nowe drzewo rozwoju</h2><p>Drzewo F2 w stylu pokładu: stany węzłów w kolorach i odznakach, koszty, świecące połączenia, podświetlone wymagania i to, co węzeł odblokowuje, liczniki w zakładkach i legenda.</p>" +
				"<h2>0.115 / Interfejs gry jak pokład dowodzenia</h2><p>Szklane panele ze świecącymi krawędziami, pas skanowania, cyfry jak na konsoli, zakładki i karty jednostek jak w menu, narożniki celownika na polu bitwy.</p>" +
				"<h2>0.114 / Ekrany menu jak panele taktyczne</h2><p>Okna z narożnikami i linią skanu, planeta misji z celownikiem w tle odprawy, ustawienia w zakładkach, karty zapisów z miniaturą planety, oś czasu zmian i bursztynowe ostrzeżenia.</p>" +
				"<h2>0.113 / Pauza taktyczna</h2><p>Pauza nad zamrożoną bitwą z raportem sytuacyjnym: surowce, siły, przekaźniki, cele, planowany atak wroga, pogoda i ostatnia łączność.</p>" +
				"<h2>0.112 / Nowe menu główne</h2><p>Za pokładem dowodzenia żyje układ planetarny — planeta z księżycem, latarnie, przelatujący konwój — a przyciski i karty mają filmowy, taktyczny wygląd.</p>" +
				"<h2>0.111 / Ekran ładowania</h2><p>Start misji i wczytanie zapisu jak w filmie: wyjście z nadprzestrzeni nad planetę misji, pasek postępu z etapami i wskazówka.</p>" +
				"<h2>0.110 / Ekrany zwycięstwa i porażki</h2><p>Animowane tło — świt i przelatująca flota albo płonąca baza i utracony sygnał — oraz nowy raport z banerem i statystykami w kafelkach.</p>" +
				"<h2>0.109 / Zakończenia aktów</h2><p>Filmowe epilogi po każdym akcie — upadek cytadeli i powrót światła, los Hefajstosa według Twojej decyzji, gasnące Serce Roju i wspólny świt.</p>" +
				"<h2>0.108 / Sceny łączności i prolog aktu III</h2><p>Sceny łączności przed rozdziałami jak w filmie — hologramy rozmówców, kwestie pisane na żywo — oraz prolog aktu III „Przebudzenie Roju”.</p>" +
				"<h2>0.107 / Nowy prolog aktu II</h2><p>Prolog „Cena świtu” w stylu intro: sygnał spod piasku, wiertnie i paszczaki na Khepri, konwój w śnieżycy i kompleks Hefajstos wysysający energię planety.</p>" +
				"<h2>0.106 / Nowe intro kampanii</h2><p>Prolog kampanii jak przerywnik z gry sci-fi: ruch kamery, krążowniki i lasery, gasnące miasta, hologram Liry, przelot przez lodowe kaniony i wschód słońca nad flotą.</p>" +
				"<h2>0.105 / Cztery niepokojące motywy</h2><p>Nowa muzyka z nutą „Obcego”: Wrak, Ul (Rój), Gąszcz i Kuźnia — echo fletu, jęki metalu, syki, bicie serca i kowadło. Do odsłuchu w Ustawieniach.</p>" +
				"<h2>0.104 / Odsłuch muzyki</h2><p>W Ustawieniach możesz posłuchać każdego motywu muzyki — menu, intro, pustyni, świtu, lodu i frontu popiołu — w wybranym nastroju gry.</p>" +
				"<h2>0.103 / Nowa muzyka</h2><p>Ścieżka w duchu „Diuny” i „Interstellara”: organy i tykający zegar, dron, bębny wojenne, potężne dęte i zawodzący głos — własne motywy dla menu, lodu, pustyni, świtu i frontu popiołu.</p>" +
				"<h2>0.102 / Styl Dominium w kampanii</h2><p>W rozdziałach z dowódcą AI Dominium gra jak twierdza: więcej wieżyczek, rzadsze, ale cięższe ataki bastionów i ciężkich maszyn.</p>" +
				"<h2>0.101 / Głos łączności</h2><p>Syntezowane głosy rozmówców przy każdej linii łączności — inna barwa, rytm i radio dla każdej postaci — oraz motywy postaci w scenach przed rozdziałami.</p>" +
				"<h2>0.100 / Wybory i rozgałęzienia</h2><p>Trzy nowe decyzje fabularne w rozdziałach I, III i VIII — kody Dominium, upadek cytadeli, propozycja Varna — zmieniają kolejne rozdziały i epilog kampanii.</p>" +
				"<h2>0.99 / Portrety i sceny łączności</h2><p>Mówiące portrety rozmówców w okienku łączności i dzienniku, sceny łączności przed każdym rozdziałem kampanii (do pominięcia i powtórzenia z odprawy).</p>" +
				"<h2>0.98 / Żywsze misje kampanii</h2><p>Przechwycone rozkazy przed atakiem, kontrataki o przekaźniki, uderzenia na tyły podczas natarcia, jednorazowe posiłki w kryzysie i sabotażyści dowódcy AI.</p>" +
				"<h2>0.97 / Dowódca AI w kampanii</h2><p>W rozdziałach II, III i VI Dominium buduje, zbiera surowce i reaguje zamiast zaplanowanych desantów. Nowy poziom trudności kampanii w odprawie (także dla aktu III i siły wroga w każdym rozdziale).</p>" +
				"<h2>0.96 / Zachowania zwierząt</h2><p>Zwierzęta pasą się i wędrują daleko, omijając przeszkody; jelenie chodzą stadami, zające i jaszczurki zrywami, a jednostki i wybuchy płoszą je do ucieczki.</p>" +
				"<h2>0.95 / Pochylanie kamery</h2><p>W trybie 3D PageUp / PageDown albo Alt + środkowy przycisk (w górę i w dół) pochylają kamerę ku horyzontowi — widać niebo. / przywraca widok z góry.</p>" +
				"<h2>0.94 / Chmury, zmierzch i obce niebo</h2><p>Cirrusy, chmury podświetlone o zachodzie i srebrne przy księżycu, cień planety i pas Wenus o zmierzchu, drugie słońce, planety i księżyce na niebie map.</p>" +
				"<h2>0.93 / Gwiazdy, Droga Mleczna i zorza</h2><p>Kolorowe gwiazdy różnej jasności i obracające się niebo, Droga Mleczna z pasmami pyłu, meteory i satelity, zorza nad mapami lodowymi.</p>" +
				"<h2>0.92 / Słońce i księżyc</h2><p>Snopy słońca przez prześwity w chmurach, refleksy obiektywu, fazy księżyca zmieniające się co noc, jaśniejsze noce przy pełni.</p>" +
				"<h2>0.91 / Pociski i trafienia</h2><p>Świecące smugi pocisków, gwiazdy płomienia z luf i ich nocny błysk, iskry i pył przy trafieniach, ogniste wybuchy rakiet.</p>" +
				"<h2>0.90 / Kratery i ślady wybuchów</h2><p>Kratery z lejem, wałem ziemi, promieniami wyrzutu, kamieniami i tlącym się dnem; mniejsze wybuchy zostawiają ślady sadzy.</p>" +
				"<h2>0.89 / Lawa i świecące jeziora</h2><p>Lawa ze skorupą z płyt, świecącymi pęknięciami, płynnymi plamami i pękającymi bąblami, oświetlająca okolicę; świecące jeziora z wirującą bioluminescencją.</p>" +
				"<h2>0.88 / Woda i ryby</h2><p>Płaska tafla jezior (koniec z piaszczystą wyspą w środku), głębsza barwa w środku, iskry słońca na falach i piana obmywająca brzeg; ryby pływają ławicami pod powierzchnią i wyskakują z pluskiem.</p>" +
				"<h2>0.87 / Dym i ogień</h2><p>Kłębiasty dym jaśniejszy od góry, gęste słupy dymu nad pożarami niesione wiatrem; migoczące języki ognia przechodzące od żółci do czerwieni, iskry i nocny blask pożaru.</p>" +
				"<h2>0.86 / Mgła</h2><p>Ławice mgły w zagłębieniach, blady welon mgły na nizinach o świcie, zmierzchu, w nocy i w deszczu; mgła wojny z poszarpaną granicą i dryfującą, ciemną zasłoną nad nieznanym.</p>" +
				"<h2>0.85.4 / Burza piaskowa</h2><p>Piasek leci smugami z wiatrem, przy ziemi toczą się kłęby pyłu, a po terenie suną strugi piasku.</p>" +
				"<h2>0.85.3 / Śnieg na terenie</h2><p>Śnieg z niebieskawymi zagłębieniami, zmarszczkami wiatru i cienkimi brzegami płatów; śnieżne czapy na kamieniach.</p>" +
				"<h2>0.85.2 / Krople deszczu na ziemi</h2><p>Zamiast kółek na terenie — drobne rozbryzgi kropelek w coraz to innych miejscach; delikatniejsze kręgi w kałużach i na wodzie.</p>" +
				"<h2>0.85.1 / Kosz robota górniczego</h2><p>Robot ma zawsze otwarty kosz, a ładunek rudy albo kryształów rośnie w nim w miarę zapełniania.</p>" +
				"<h2>0.85 / Efekty wydobycia</h2><p>Iskry, kurz i odłamki rudy spod wierteł robotów, odpryski kryształów, para z pomp gazu, migoczące światło wiertła nocą; drobiny i złote iskierki unoszące się nad złożami.</p>" +
				"<h2>0.84.1 / Tylne nogi zająca</h2><p>Zając ma udo przy boku i długie tylne stopy na ziemi zamiast nóg jelenia.</p>" +
				"<h2>0.84 / Zwierzęta i ptaki</h2><p>Jelenie, lisy i zające z prawdziwą budową nóg, uginającymi się w chodzie, kufą i ubarwieniem; zające kicają, jaszczurki się wiją, ptaki machają skrzydłami z lotkami i szybują.</p>" +
				"<h2>0.83 / Drzewa i roślinność</h2><p>Postrzępione sosny, liściaste drzewa z bujną koroną, akacje z parasolem, rozgałęzione martwe drzewa; trawa z jasnymi końcami i kłosami, pierzaste paprocie, gęste krzewy i kwiaty na łąkach.</p>" +
				"<h2>0.82 / Ukształtowanie terenu</h2><p>Mesy z urwiskami, półkami skalnymi i piargiem, strome skaliste pagóry, ostre szczyty iglic, pagórki z grzbietami i obniżeniami; strome zbocza w kolorze skały z warstwami.</p>" +
				"<h2>0.81 / Wybuchy</h2><p>Skłębiona kula ognia przechodząca w dym, rozbłysk i światło wybuchu na otoczeniu, fala uderzeniowa i pył, odłamki, iskry, żar i słup dymu; samoloty wybuchają w powietrzu.</p>" +
				"<h2>0.80.1 / Strzały samolotów w powietrzu</h2><p>Myśliwce strzelają z powietrza dwiema smugami z nosa, bombowce zrzucają bomby, a ogień z ziemi do samolotów leci w górę.</p>" +
				"<h2>0.80 / Wszystkie światła nocy naraz</h2><p>Reflektory pojazdów i budynków, latarki i reflektory samolotów świecą wszystkie jednocześnie i oświetlają teren oraz modele — światła nie przeskakują już przy ruchu kamery.</p>" +
				"<h2>0.79.1 / Bez ostrych snopów światła</h2><p>Dalsze budynki rzucają miękką plamę zamiast ostrego klina, wachlarze świateł pojazdów mają miękkie brzegi; księżyc świeci z wyższego kąta.</p>" +
				"<h2>0.79 / Reflektory budynków</h2><p>Budynki świecą nocą jak pojazdy: reflektory na narożnikach rzucają plamy światła na teren, światło przed fasadą oświetla ściany i jednostki; zamiast kwadratowej poświaty — miękka poświata okien.</p>" +
				"<h2>0.78 / Słońce, księżyc i noc</h2><p>Niebo w barwach pory dnia ze słońcem, księżycem, gwiazdami i chmurami; płynne przejście przez złotą godzinę, zachód i niebieską godzinę do chłodnego światła księżyca; cienie chmur płynące po planszy.</p>" +
				"<h2>0.77 / Dokładniejsze pojazdy naziemne</h2><p>Gąsienice z ogniwami dookoła i rolkami, osłony boczne, skrzynie, kanistry, włazy z peryskopami, wyrzutnie dymne; opony z bieżnikiem, nadkola, przyciemniane szyby z wycieraczkami, atrapy chłodnic, lusterka i zderzaki.</p>" +
				"<h2>0.76 / Nowe modele samolotów</h2><p>Myśliwiec, bombowiec i dron od nowa: profilowane skrzydła, kabiny, wloty i dysze, rakiety, silniki w gondolach, wieżyczka bombowca, dron z osłoniętymi wirnikami i kamerą. Samoloty Dominium są kanciaste.</p>" +
				"<h2>0.75.2 / Samoloty: reflektory i smugi</h2><p>Samoloty nie zostawiają śladów na ziemi. Nocą ich reflektory dają smugę światła w powietrzu i plamę na ziemi; mają światła pozycyjne, migający stroboskop oraz żar i smugę pary za silnikami.</p>" +
				"<h2>0.75.1 / Znaczniki rozkazów w 3D</h2><p>Na planszy 3D wróciły przerywane trasy zaznaczonych jednostek z kółkiem celu i pierścień w miejscu wydanego rozkazu.</p>" +
				"<h2>0.75 / Woda, mgła i pogoda</h2><p>Falująca woda z pianą przy brzegu i kręgami od kropel, kałuże zbierające się w ulewie, śnieg osiadający płatami i na dachach, mgiełka przy ziemi, zasłony deszczu i pioruny z wieloma rozbłyskami, poświatą i iskrami w miejscu uderzenia.</p>" +
				"<h2>0.74 / Akt I w 3D</h2><p>Nowe przekaźniki z masztem kratownicowym i anteną talerzową. Na mapach aktu I: poligon Liry, Latarnia Eos zapalająca się po wykonaniu celów, ruiny Stacji Ciszy, wrota archiwum w lodzie i obelisk Cytadeli Węzła budzący się z każdym przejętym węzłem.</p>" +
				"<h2>0.73 / Obiekty aktu II</h2><p>Lądowisko ewakuacyjne, obóz badaczy, archiwum sondy z pierścieniami danych, rdzeń we wraku, postoje konwoju, latarnia Kestrel z obracającym się snopem oraz maszyny i rurociągi kompleksu Hefajstos — w 3D.</p>" +
				"<h2>0.72 / Budynki specjalne aktu III</h2><p>Bijące Serce Roju w klatce obsydianowych odłamków, kopce gniazd Roju, stacja orbitalna z ładującymi się kondensatorami i pierścieniami celowniczymi oraz wieża zagłuszacza na Szczycie.</p>" +
				"<h2>0.71 / Rój w 3D</h2><p>Nowe modele Obsydianowych Strażników: ciosane monolity z rowkami i odłamkami, przypory rdzenia, krążące odłamki monolitu, korony ostrzy wieżyczek, jednostki z płytami, soczewkami i nogami z kolanami.</p>" +
				"<h2>0.70 / Okna budynków</h2><p>Okna mają ramy, parapety i szprosy. W dzień to ciemne szkło, a od zmierzchu zapalają się ciepłym światłem wnętrza; część świeci chłodno jak ekrany, część zostaje ciemna.</p>" +
				"<h2>0.69 / Światło budynków</h2><p>Nocą światło okien otacza ściany budynków, przed wejściem świeci lampa, a kolor światła zależy od budynku: ciepły w bazie, chłodny w laboratorium, turkusowy przy reaktorze, pomarańczowy przy kuźni.</p>" +
				"<h2>0.68 / Wraki, ruiny i wyspy 3D</h2><p>Rozbity statek z wyrwaną rufą i silnikiem obok, pola szczątków, truchło obcego z czaszką i żebrami, ruiny z murami, kolumnami i łukiem, bursztynowa żywica, gniazda jaj, przetwórnia, latające wyspy na skałach z korzeniami i dokładniejsze wraki zniszczonych jednostek.</p>" +
				"<h2>0.67 / Przyroda 3D</h2><p>Dokładniejsze zwierzęta, ptaki i ryby, nowe bestie: drapieżnik, mamut, bazaltowy pająk i wydmowa paszcza. Nieregularne głazy i iglice, skupiska kryształów, olbrzymie grzyby z blaszkami. Na mapach rosną drzewa zależne od planety.</p>" +
				"<h2>0.66 / Trawa i kamienie 3D</h2><p>Na planszy 3D trawa rośnie łąkami i kołysze się na wietrze, a na gruncie leżą kamienie, płyty skalne, żwir, krzaki i kości. Przy jeziorach jest trzcina. Zniknęły namalowane źdźbła, kamyki i rysy.</p>" +
				"<h2>0.65 / Reflektory i latarki 3D</h2><p>Nocą pojazdy w pobliżu kamery świecą prawdziwymi reflektorami, a żołnierze latarkami, które oświetlają teren, budynki i inne jednostki, a w deszczu, śniegu i burzy piaskowej widać snop światła w powietrzu. Światła pozostałych jednostek i budynków układają się na zboczach.</p>" +
				"<h2>0.64 / Szczegółowe modele 3D</h2><p>Jednostki i budynki Kolonii i Dominium mają dokładniejsze modele: fazowany pancerz, gąsienice z kołami jezdnymi, lufy z hamulcem wylotowym, reflektory, anteny, włazy, okna świecące nocą, kominy i dźwigi. Koła toczą się w jeździe, a pojazdy przechylają się na stokach.</p>" +
				"<h2>0.63 / Plansza 3D bez płaskich elementów</h2><p>Mury, ślady gąsienic, kratery, siedliska stworzeń i wraki do odzysku są w 3D. Gaje, świecące jeziora i lawa rozświetlają noc, budynki oświetlają modele obok, wybuchy mają kulę ognia i falę uderzeniową, a podgląd budowy pokazuje model budynku pod kursorem.</p>" +
				"<h2>0.62 / Pogoda 3D</h2><p>Deszcz pada ukośnie z wiatrem i moczy ziemię, śnieg osiada na terenie i topnieje, burza piaskowa niesie pył nisko nad ziemią, a w ulewie biją rozgałęzione pioruny.</p>" +
				"<h2>0.61 / Czytelna bitwa w 3D</h2><p>Pod każdą jednostką krąg w kolorze jej strony. Trafione jednostki i budynki rozbłyskują, a zniszczone ciemnieją i zapadają się.</p>" +
				"<h2>0.60 / Cele i zniszczenia w 3D</h2><p>Kopuły osłon, kolumna światła przed uderzeniem orbitalnym, złoty artefakt i słupy światła nad celami misji. Budynki rosną w rusztowaniu, a zniszczone zapadają się i przechylają.</p>" +
				"<h2>0.59 / Kamera i jakość w 3D</h2><p>Ustawienia grafiki planszy działają w trybie 3D. Kamerę obrócisz też myszą (Alt + środkowy przycisk), przesuwanie trzyma teren pod kursorem, a kąt kamery zapisuje się w zapisie gry.</p>" +
				"<h2>0.58 / Złoża i teren w 3D</h2><p>Złoża rudy, gazu i kryształów oraz przekaźniki są modelami 3D, teren ma pagórki i fakturę biomu, a na ziemi leżą kamienie, kępy trawy, zaspy i świecące grzybki.</p>" +
				"<h2>0.57 / Obrót kamery</h2><p>W trybie 3D przecinek i kropka obracają kamerę, a ukośnik wraca do widoku od południa. Wyspy, iglice i wielkie grzyby prześwitują, gdy zasłaniają twoje jednostki.</p>" +
				"<h2>0.56 / Krajobraz 3D</h2><p>Iglice skalne, olbrzymie grzyby, rozbity statek, ruiny, gniazda jaj i głazy w kolorze planety. Nad wydmami wiatr niesie piasek.</p>" +
				"<h2>0.55 / 3D także z dysku</h2><p>Tryb 3D działa również w grze otwartej z pliku. Nazwy złóż i przekaźników stoją nad nimi jako tabliczki, a pociski lecą wyraźnymi smugami.</p>" +
				"<h2>0.54 / Żywa planeta w 3D</h2><p>Zwierzęta, ptaki, ryby i latające wyspy w 3D, wraki zniszczonych jednostek, zarodniki, iskry nad lawą i mgła z przepaści. Pociski i rakiety lecą od lufy do celu.</p>" +
				"<h2>0.53 / Woda, noc i pogoda w 3D</h2><p>Jeziora z odbiciem słońca, płynąca lawa, światła budynków i reflektory nocą, deszcz, śnieżyce i burze piaskowe, dym i ogień uszkodzonych obiektów.</p>" +
				"<h2>0.52 / Plansza 3D</h2><p>Nowy renderer w Ustawieniach: „3D (Three.js)” — teren z wysokością, modele 3D wszystkich jednostek i budynków, prawdziwe cienie i kamera 3D. Sterowanie bez zmian.</p>" +
				"<h2>0.51 / Styl gry AI</h2><p>Dowódca AI gra inaczej każdą frakcją: Dominium buduje twierdzę i uderza rzadko, ale mocno, a Kolonie często nękają małymi grupami i walczą o przekaźniki.</p>" +
				"<h2>0.50 / Wybory z konsekwencjami</h2><p>Decyzja o losie kompleksu Hefajstos w akcie II zmienia akt III: posiłki i eskorta Dominium albo słabszy Rój i więcej metalu na start.</p>" +
				"<h2>0.49 / Handel</h2><p>Logistyka → Handel: wymiana metalu, gazu i kryształów po niekorzystnym kursie. Wymaga magazynu polowego lub laboratorium.</p>" +
				"<h2>0.48 / Rewanż</h2><p>Po bitwie wieloosobowej przycisk Rewanż rozpoczyna nową bitwę z tym samym graczem na nowym układzie mapy.</p>" +
				"<h2>0.47.2 / Czat obok lobby</h2><p>Czat lobby ma własny panel obok okna lobby, z dłuższą historią rozmowy.</p>" +
				"<h2>0.47.1 / Panel oddziału</h2><p>Rozkazy w równej siatce ze skrótami, a formacja jako przełącznik z ikonami szyku.</p>" +
				"<h2>0.47 / Wspólna pauza</h2><p>W grze wieloosobowej Spacja zatrzymuje bitwę u obu graczy: 3 pauzy po najwyżej 60 s i odliczanie przed wznowieniem.</p>" +
				"<h2>0.46.2 / Płynna gra sieciowa</h2><p>Bitwa sieciowa rusza się tak płynnie jak jednoosobowa.</p>" +
				"<h2>0.46.1 / Czat</h2><p>Gracze rozmawiają w lobby i w bitwie: Enter otwiera linię wiadomości.</p>" +
				"<h2>0.46 / Gra wieloosobowa</h2><p>Bitwa jeden na jeden z drugim człowiekiem przez przeglądarkę, bez serwera gry: wystarczy wymienić kody zaproszenia i odpowiedzi.</p>" +
				"<h2>0.45 / Dźwięk</h2><p>Nowe efekty z próbek, dźwięk cichszy z daleka, pogłos, tło otoczenia narastające przed burzą i muzyka grana przez instrumenty.</p>" +
				"<h2>0.44 / Złoża</h2><p>Ruda, gaz i kryształy mają nowy wygląd, maleją w sześciu etapach, a wyczerpane złoże wygląda inaczej. Przy kopaniu lecą odpryski, nocą gaz i kryształy świecą.</p>" +
				"<h2>0.43 / Światło na jednostkach</h2><p>W trybie WebGL jednostki są oświetlone od strony słońca lub księżyca, a uszkodzone pojazdy pokrywa sadza.</p>" +
				"<h2>0.42.1 / Wskaźnik burzy</h2><p>Nadciągającą burzę pokazuje linia na krawędzi ekranu, z której nadchodzi, z zegarem odliczającym sekundy.</p>" +
				"<h2>0.42 / Obsydianowi Strażnicy</h2><p>Rój ma nowy wygląd: czarne monolity ze spiczastymi czubkami i kanciaste strażniki, a jedynym kolorem jest pasek drużyny.</p>" +
				"<h2>0.41 / Mapa galaktyki</h2><p>Kampania ma teraz mapę galaktyki: układy z własnymi słońcami, planety o różnych klimatach z pierścieniami, księżycami i pasami asteroid, a także trasę przez wszystkie trzy akty. Kliknij świat, żeby zobaczyć jego rozdziały i scenariusze.</p>" +
				"<h2>0.40 / Akt III — Przebudzenie Roju</h2><p>Trzy nowe rozdziały kampanii przeciw Rojowi Kryształowemu: wyścig po artefakt na Lumerii V, sojusz z Dominium na Nivalis i szturm na Serce Roju z pomocą stacji orbitalnej. Kampania ma teraz mapę — gwiezdny szlak przez planety wszystkich trzech aktów.</p>" +
				"<h2>0.39 / Rój Kryształowy</h2><p>Trzecia frakcja: obce, krystaliczne organizmy przebudzone przez artefakty. Tanie i szybkie jednostki, które się regenerują, wybuchające pełzacze, żrące pluwacze, kolosy i monolit spowalniający wrogów. Rój można wybrać dla siebie albo dla przeciwnika.</p>" +
				"<h2>0.38 / Oblicza frakcji</h2><p>Kolonie dostają grenadierów, łazik serwisowy i placówkę polową, a budują szybciej. Dominium — miotacze ognia, niszczyciel czołgów i stację orbitalną z uderzeniem z orbity, a jego budynki są wytrzymalsze. Obie frakcje wyglądają teraz wyraźnie inaczej.</p>" +
				"<h2>0.37 / Drużyny 2 na 2</h2><p>Zagraj z sojusznikiem AI przeciwko dwóm przeciwnikom. Sojusznicy widzą to samo, nie strzelają do siebie, wspólnie zdobywają przekaźniki i wygrywają razem.</p>" +
				"<h2>0.36 / Król wzgórza i Przetrwanie</h2><p>Dwa nowe tryby scenariuszy: walka o centralny Szczyt oraz Przetrwanie — coraz większe fale bez końca, z rekordem na każdej mapie. Nowe ustawienia: długość doby (także wieczny dzień) i start od razu z Kolonią.</p>" +
				"<h2>0.35 / Efekty i zapowiedź burzy</h2><p>Kopuła osłony rozbłyska przy trafieniu, punkt medyczny pokazuje leczenie, przy rozbiórce wraków i montażu modułów lecą iskry, a wydobycie wzbija pył. Ciężki ostrzał zostawia kratery. Burze nadciągają z konkretnego kierunku: widać je na krawędzi ekranu i na minimapie, a monitoring pogody daje minutę ostrzeżenia.</p>" +
				"<h2>0.34.2 / Koniec zwalniania</h2><p>Naprawiona właściwa przyczyna zwalniania gry: robot, który miał budować tuż przy skale, bez końca szukał trasy. Teraz dociera na miejsce, a gdy celu naprawdę nie da się osiągnąć, przerywa zadanie z komunikatem.</p>" +
				"<h2>0.34.1 / Płynność w dłuższej grze</h2><p>Naprawione zwalnianie gry po kilku minutach w trybach WebGL i WebGPU: wydobycie rudy nie tworzy już nowych obrazów złóż, a burza piaskowa rysuje ziarna jako lekkie cząstki.</p>" +
				"<h2>0.34 / Dowódca AI</h2><p>Przeciwnik w scenariuszach prowadzi własną gospodarkę: roboty wydobywają rudę, baza rośnie i jest odbudowywana, a każda jednostka kosztuje. Broni bazy i robotów, zajmuje przekaźniki i planuje ataki. Trzy poziomy — łatwy, średni i trudny — różnią się tempem rozwoju, doborem jednostek i taktyką. Dawne darmowe desanty można nadal wybrać w ustawieniach.</p>" +
				"<h2>0.33 / Ekspedycja i ziarno mapy</h2><p>Nowy tryb scenariuszy: Ekspedycja po artefakt — przejmij strzeżone znalezisko obcych i dowieź je do bazy, zanim zrobi to przeciwnik. Ziarno mapy daje nowy, sprawdzony układ złóż, skał i siedlisk, a kod operacji pozwala podzielić się całymi ustawieniami. Gotowe zestawy (Spokojna ekspansja, Niebezpieczna planeta, Wojna o zasoby), wybór czasu obrony, puli punktów, zasobności złóż, liczebności fauny i surowości pogody.</p>" +
				"<h2>0.32 / Wsparcie i moduły</h2><p>Nowe budynki: punkt medyczny leczy piechotę, generator osłon chroni bazę kopułą, a plac odzysku pozwala robotom zbierać metal z wraków. Nowe jednostki: wóz przeciwlotniczy, dron zwiadowczy i niewidoczni sabotażyści, którzy na chwilę wyłączają wrogie budynki. Koszary, fabryka i wieżyczki mogą dostać jeden z dwóch modułów.</p>" +
				"<h2>0.31 / Poprawka map kampanii</h2><p>Naprawiona szara plansza na mapach kampanii (np. Szkolenie, Iskra na Eos) w trybach WebGL i WebGPU. Renderer jest też odporniejszy: gdyby któraś jego część zawiodła, dana część rysuje się dalej zwykłą metodą, zamiast zostawiać pustą planszę.</p>" +
				"<h2>0.30 / Płynniejsze bitwy</h2><p>Równiejsze klatki w dużych bitwach w trybie WebGL, cień latającej wyspy zostaje na ziemi, iskry nad lawą nie przeskakują przy przesuwaniu kamery, a tryb WebGPU nie jest już eksperymentalny. Nowa strona do pomiaru płynności na dowolnym komputerze.</p>" +
				"<h2>0.29 / Latarki i reflektory</h2><p>W trybie WebGL piechota znowu świeci latarkami, a pojazdy reflektorami — wąskim stożkiem przed sobą, jak w trybie Canvas — i teraz ten stożek naprawdę oświetla teren przed jednostką. Samoloty mają wyraźne światła nawigacyjne na skrzydłach zamiast plamy światła na ziemi.</p>" +
				"<h2>0.28 / Cała plansza na karcie graficznej</h2><p>W trybie WebGL także interfejs na planszy — znaczniki misji, punkty zbiórki, podgląd budowy, prostokąt zaznaczenia, słońce, księżyc, gwiazdy i pogoda na niebie — jest rysowany bezpośrednio przez kartę graficzną. Plansza nie przesyła już żadnych warstw rysowanych przez Canvas; wygląd bez zmian.</p>" +
				"<h2>0.27 / Poświata i efekty map na karcie graficznej</h2><p>Świecące zarodniki, blask lawy, iskry, mgła nad przepaściami, wiejący piasek, dym przetwórni i inne efekty map są w trybie WebGL rysowane bezpośrednio przez kartę graficzną — tym samym kodem co wcześniej, odtwarzanym jako obiekty PixiJS. Wygląd bez zmian; przez Canvas rysowany jest już tylko interfejs na planszy.</p>" +
				"<h2>0.26 / Żywa przyroda na karcie graficznej</h2><p>W trybie WebGL zwierzęta, ptaki, ryby w jeziorach i latające wyspy są rysowane bezpośrednio przez kartę graficzną, tak samo jak grunt i modele. Wygląd bez zmian; na wielu mapach przez Canvas rysowany jest już tylko interfejs na planszy.</p>" +
				"<h2>0.25 / Szybsze bitwy</h2><p>W trybie WebGL jednostki i budynki są rysowane bezpośrednio przez kartę graficzną: wygląd modelu powstaje raz i odświeża się tylko przy zmianie stanu, a ruch, obrót, cienie, zaznaczenia, paski życia i efekty walki są liczone w każdej klatce. Wygląd bez zmian, a duża bitwa rysuje się prawie dwa razy szybciej.</p>" +
				"<h2>0.24 / Szybszy grunt</h2><p>W trybie WebGL grunt — złoża, przekaźniki, kałuże, szron, jeziora, ślady i ścieżki jednostek — jest rysowany bezpośrednio przez kartę graficzną zamiast przez Canvas w każdej klatce. Wygląd bez zmian, a plansza rysuje się około dwa razy szybciej.</p>" +
				"<h2>0.23 / Wysokość terenu i perspektywa</h2><p>Teren ma wysokość: płaskowyże, iglice i wydmy są oświetlone od strony słońca i o świcie oraz zmierzchu kładą długie cienie, a przepaście i jeziora leżą niżej. Nowa opcja Perspektywa 2,5D lekko pochyla kamerę — dalsza część mapy maleje, a klikanie i zaznaczanie działają jak dotąd. Eksperymentalny renderer WebGPU w Ustawieniach. Mniej migotania przy przesuwaniu mapy, miękkie krawędzie mgły wojny i szybsze rysowanie map bez świecących efektów.</p>" +
				"<h2>0.22 / Światło, pogoda i ślady walki</h2><p>Budynki mają objętość: ich krawędzie i dachy są oświetlone z kierunku słońca, które w ciągu doby wędruje ze wschodu na zachód, a w nocy delikatnie z kierunku księżyca. Uszkodzone budowle pokrywają się sadzą i pęknięciami, a pożary świecą w nocy. Wybuchy zostawiają wypalony grunt. Deszcz i śnieg są rysowane przez kartę graficzną — gęstsze, z rozpryskami kropli — a piorun rozświetla na chwilę całą planszę. Szybsze rysowanie w trybie WebGL.</p>" +
				"<h2>0.21 / Nowy silnik grafiki</h2><p>Plansza rysowana przez WebGL (PixiJS): prawdziwa noc z mapą świateł, światła budynków, reflektory jednostek, świecące gaje i lawa, cienie od słońca zmieniające się w ciągu doby, poświata, połysk wody i miękka mgła wojny. W Ustawieniach → Renderer można wyłączyć poszczególne efekty lub wrócić do rysowania Canvas 2D; bez WebGL gra przełącza się na nie sama.</p>" +
				"<h2>0.20 / Wydmy i wrak obcych</h2><p>Klasyczne mapy scenariuszy w nowym klimacie i z nowym terenem: morze wydm Khepri, złoty kanion Helionu, żebrowany wrak obcego statku na Vulkanie i zamarznięta placówka na Nivalis. Kampania aktu I dostała pasujący wygląd bez zmian w układzie. Zapisy scenariuszy na tych mapach sprzed zmiany nie są już wczytywane.</p>" +
				"<h2>0.19 / Nowe światy pogranicza</h2><p>Cztery mapy scenariuszy: świecąca dżungla Świetlisty Gąszcz, Wiszące Szczyty z przepaściami i latającymi górami, Wydmy Bliźniaczych Słońc z wrakiem krążownika oraz Rzeki Magmy. Rzeki, rozpadliny i lawa z brodami i mostami, nocna bioluminescencja, drugie słońce, woda i lawa na minimapie.</p>" +
				"<h2>0.18 / Tryby i rozmiary map</h2><p>Scenariusze: tryby Podbój, Utrzymanie przekaźników i Obrona oraz mapy małe, średnie i duże. Duże mapy mają dodatkowe złoża, skały, jeziora, siedliska i więcej przekaźników. Szybsze wyszukiwanie tras.</p>" +
				"<h2>0.17 / Akt II — Cena świtu</h2><p>Trzy nowe rozdziały kampanii: ratunek badaczy przez obszar jam, konwój przez lodową przełęcz i decyzja o losie kompleksu Hefajstos. Dialogi radiowe, dziennik celów, cele dodatkowe z odznakami i podsumowanie misji.</p>" +
				"<h2>0.16 / Oprawa reagująca na rozgrywkę — etap D</h2><p>Muzyka reaguje na rozwój i walkę. Osobne suwaki kategorii dźwięków, priorytet komunikatów, detale brzegów, etapy budowy i ustawienia jakości grafiki.</p>" +
				body;
		if (
			screen === "scenarios" ||
			(screen === "briefing" &&
				!RTS.MISSIONS[this.selectedMission].campaign)
		) {
			body = body.replace(
				"<h2>Cele operacji</h2>",
				`<div class="scenario-config"><label class="wide-field">Gotowe ustawienia<select id="scenario-preset" aria-label="Gotowe ustawienia">${Object.entries(RTS.SCENARIO_PRESETS || {})
					.map(([id, p]) => `<option value="${id}">${p.name}</option>`)
					.join("")}<option value="custom">Własne</option></select></label><p id="preset-description"></p><label>Nazwa gracza<input id="scenario-name" maxlength="24" aria-label="Nazwa gracza"></label><label>Kolor<select id="scenario-color" aria-label="Kolor gracza">${(RTS.PLAYER_COLORS || []).map((c, i) => `<option value="${c}">${["Miętowy", "Niebieski", "Fioletowy", "Złoty", "Różowy"][i]}</option>`).join("")}</select></label><label>Poziom trudności<select id="scenario-difficulty" aria-label="Poziom trudności"><option value="easy">Łatwy</option><option value="normal">Średni</option><option value="hard">Trudny</option></select></label><label>Liczba graczy<select id="scenario-players" aria-label="Liczba graczy"><option value="2">2 — Ty + 1 AI</option><option value="3">3 — Ty + 2 AI</option><option value="4">4 — Ty + 3 AI</option></select></label><label>Tryb<select id="scenario-mode" aria-label="Tryb scenariusza">${Object.entries(
					RTS.MODES || {},
				)
					.map(
						([id, m]) => `<option value="${id}">${m.name}</option>`,
					)
					.join(
						"",
					)}</select></label><label>Rozmiar mapy<select id="scenario-size" aria-label="Rozmiar mapy">${Object.entries(
					RTS.MAP_SIZES || {},
				)
					.map(
						([id, s]) => `<option value="${id}">${s.name}</option>`,
					)
					.join(
						"",
					)}</select></label><label>Frakcja<select id="scenario-faction" aria-label="Frakcja"><option value="colonies">Wolne Kolonie</option><option value="dominion">Dominium</option>${RTS.FACTIONS?.swarm ? '<option value="swarm">Rój Kryształowy</option>' : ""}${RTS.FACTIONS?.watchers ? '<option value="watchers">Wartownicy Otchłani</option>' : ""}</select></label>${this.settingFields()}<p id="faction-description"></p><p id="mode-description"></p></div><h2>Cele operacji</h2>`,
			);
		}
		this.root.classList.toggle("reduced-motion", this.reduced);
		// Films (the intro, the prologues, the radio scenes) take the whole screen.
		this.root.classList.toggle("film-screen", ["intro", "intro2", "intro3", "intro4", "finale", "interlude"].includes(screen));
		this.root.innerHTML = `<div class="menu-stars" aria-hidden="true"></div><div class="menu-orbit" aria-hidden="true"><div class="menu-planet"><div class="planet-surface"></div><div class="planet-clouds"></div><div class="planet-shade"></div></div></div><header class="menu-brand"><span>◈</span> POGRANICZE <small>GALAKTYKI / POKŁAD DOWODZENIA</small></header><div class="menu-layout"><section class="menu-content ${["knowledge", "scenarios", "intro", "intro2", "intro3", "intro4", "finale", "interlude", "campaign"].includes(screen) ? "wide" : ""}"><span class="eyebrow">${EYEBROWS[screen] || "WOLNE KOLONIE / SEKTOR 07"}</span><h1 tabindex="-1">${title}</h1>${body}</section>${screen === "pause" ? this.situationHtml() : ""}${screen === "home" ? `<aside class="menu-mission"><span class="eyebrow">${save.valid ? "OSTATNIA OPERACJA" : "SYGNAŁ Z POWIERZCHNI"}</span><h2>${save.valid ? RTS.MISSIONS[save.missionId]?.planet || "Khepri IV" : "Khepri IV"}</h2><p>${save.valid ? RTS.MISSIONS[save.missionId]?.name || "Cichy Horyzont" : "Ekspedycja Wolnych Kolonii"}</p><p>${save.valid ? `Czas bitwy: ${save.time}<br>Zapis: ${save.date}` : "Dominium zajęło północny kompleks.<br>Przywróć kontrolę nad sektorem."}</p><span class="menu-tag">${save.valid ? "ZAPIS GOTOWY DO WZNOWIENIA" : "OCZEKIWANIE NA ROZKAZY"}</span></aside>` : ""}</div><footer class="menu-footer"><span>PROTOTYP ${GAME_VERSION} · ZAPIS LOKALNY</span><button id="menu-news">Co nowego i plany</button><button id="menu-sound">Dźwięk</button></footer>`;
		// The living backdrop (menu-backdrop.js), one canvas kept across the screens.
		if (this.backdrop === undefined) this.backdrop = typeof MenuBackdrop !== "undefined" ? MenuBackdrop.create(this) : null;
		if (this.backdrop) {
			this.root.prepend(this.backdrop);
			this.root.classList.add("has-backdrop");
			// On a briefing the world in the backdrop becomes the mission's planet.
			this.backdrop.setWorld?.(["briefing", "scenarios", "review", "replace"].includes(screen) ? RTS.MISSIONS[this.selectedMission] : null);
		}
		if (WINDOW_SCREENS.includes(screen)) this.windowed();
		if (screen === "settings") this.tabbed();
		// Confirmations and the save error are warning cards.
		this.root.querySelector(".menu-content").classList.toggle("menu-dialog", ["slot-confirm", "replace", "save-error"].includes(screen));
		// Sliders filled up to their value (the settings set the values a moment later).
		const ranges = [...this.root.querySelectorAll(".menu-setting input[type=range]")],
			fill = (r) => r.style.setProperty("--fill", ((r.value - r.min) / (r.max - r.min)) * 100 + "%");
		ranges.forEach((r) => r.addEventListener("input", () => fill(r)));
		queueMicrotask(() => ranges.forEach(fill));
		if (screen === "knowledge") KnowledgeBase.mount(this.root);
		if (
			screen === "scenarios" ||
			(screen === "briefing" &&
				!RTS.MISSIONS[this.selectedMission].campaign)
		) {
			const s = this.scenario,
				described = () =>
					RTS.describeScenario?.(s) || RTS.MODES?.[s.mode] || {};
			const updateFaction = () => {
				this.root.querySelector("#faction-description").textContent =
					RTS.FACTIONS?.[s.faction]?.description || "";
				const size = RTS.MAP_SIZES?.[s.size];
				this.root.querySelector("#mode-description").textContent =
					(described().description || "") +
					(size ? " Mapa: " + size.description + "." : "") +
					(s.seed
						? " Ziarno " +
							s.seed +
							": przesunięte złoża, nowe skały i siedliska, inny przydział narożników."
						: "");
				const goal = this.root.querySelector("#mode-objective");
				if (goal) goal.textContent = described().objective || "";
				if (!RTS.SCENARIO_OPTIONS) return;
				const preset = RTS.presetFor(s);
				this.root.querySelector("#scenario-preset").value = preset;
				this.root.querySelector("#preset-description").textContent =
					RTS.SCENARIO_PRESETS[preset]?.description ||
					"Własny zestaw ustawień.";
				this.root.querySelector("#field-defenseTime").hidden =
					s.mode !== "defense";
				this.root.querySelector("#field-pointsPerRelay").hidden =
					s.mode !== "relays";
				// 2 vs 2 always has four players.
				const playersField = this.root.querySelector("#scenario-players");
				if (s.teams === "duo") {
					s.players = 4;
					playersField.value = "4";
				}
				playersField.disabled = s.teams === "duo";
				const hillField = this.root.querySelector("#field-hillTime");
				if (hillField) hillField.hidden = s.mode !== "hill";
				// Survival: the best time on this map and level.
				const best = s.mode === "survival" && RTS.survivalBest?.((() => {
						try {
							return localStorage;
						} catch {
							return null;
						}
					})(), this.selectedMission, s.difficulty);
				if (best)
					this.root.querySelector("#mode-description").textContent +=
						` Rekord na tej mapie (${RTS.AI_LEVELS?.[s.difficulty]?.name || s.difficulty}): ${Math.floor(best.time / 60)}:${String(best.time % 60).padStart(2, "0")}, fala ${best.wave}.`;
				const enemy = this.root.querySelector("#enemy-description");
				if (enemy)
					enemy.textContent =
						s.enemy === "waves"
							? RTS.ENEMY_MODES.waves.description
							: RTS.ENEMY_MODES.commander.description +
								" " +
								(RTS.AI_LEVELS[s.difficulty]?.name || "") +
								": " +
								(RTS.AI_LEVELS[s.difficulty]?.description || "") +
								(RTS.AI_STYLES
									? " Styl frakcji: " +
										(RTS.AI_STYLES[s.enemyFaction]
											? RTS.AI_STYLES[s.enemyFaction].name + " — " + RTS.AI_STYLES[s.enemyFaction].description
											: "Dominium — twierdza, rzadkie i silne ataki; Kolonie — nękanie robotów i przekaźniki; Rój — stała presja.")
									: "");
				const code = this.root.querySelector("#scenario-code");
				if (document.activeElement !== code)
					code.value = RTS.scenarioCode(this.selectedMission, s);
			};
			const refresh = () => {
				updateFaction();
				if (screen === "scenarios") this.drawMapPreview();
			};
			const fields = [
				"name",
				"color",
				"difficulty",
				"players",
				"faction",
				"mode",
				"size",
				...(RTS.SCENARIO_OPTIONS
					? [
							"defenseTime",
							"pointsPerRelay",
							"resources",
							"fauna",
							"weather",
							"seed",
							...(RTS.SCENARIO_OPTIONS.dayLength ? ["dayLength", "startLevel", "hillTime"] : []),
						]
					: []),
				...(RTS.ENEMY_MODES ? ["enemy"] : []),
				...(RTS.TEAM_MODES ? ["teams"] : []),
				...(RTS.ENEMY_FACTIONS ? ["enemyFaction"] : []),
			];
			const numeric = ["players", "defenseTime", "pointsPerRelay", "hillTime"];
			const fill = () => {
				for (const field of fields)
					this.root.querySelector("#scenario-" + field).value =
						field === "seed" ? s.seed || "" : s[field];
			};
			for (const field of fields) {
				const input = this.root.querySelector("#scenario-" + field);
				input.oninput = () => {
					s[field] =
						field === "seed"
							? RTS.normalizeScenarioSettings({
									seed: input.value.replace(/\D/g, ""),
								}).seed
							: numeric.includes(field)
								? Number(input.value)
								: input.value;
					refresh();
				};
			}
			if (RTS.SCENARIO_OPTIONS) {
				// Ready-made settings replace the rule fields; name, colour, faction, map and seed stay.
				this.root.querySelector("#scenario-preset").oninput = (
					event,
				) => {
					RTS.applyPreset(s, event.target.value);
					fill();
					refresh();
				};
				this.root.querySelector("#scenario-seed-random").onclick =
					() => {
						s.seed = RTS.randomSeed();
						fill();
						refresh();
					};
				this.root.querySelector("#scenario-code-apply").onclick =
					() => {
						const parsed = RTS.parseScenarioCode(
								this.root.querySelector("#scenario-code").value,
							),
							feedback = this.root.querySelector(
								"#scenario-code-feedback",
							);
						if (!parsed) {
							feedback.textContent =
								"Nieprawidłowy kod operacji. Wzór: mapa-M2N-C-NNN-ziarno, np. horizon-M2N-X-NNN-4242.";
							return;
						}
						Object.assign(s, parsed.scenario);
						const otherMap =
							screen !== "scenarios" &&
							parsed.missionId !== this.selectedMission;
						if (screen === "scenarios") {
							this.selectedMission = parsed.missionId;
							this.root.querySelector("#scenario-map").value =
								parsed.missionId;
						}
						feedback.textContent =
							"Wczytano ustawienia operacji: " +
							RTS.MISSIONS[parsed.missionId].name +
							(otherMap ? " (mapę wybierz w Scenariuszach)" : "") +
							".";
						this.root.querySelector("#scenario-code").blur();
						fill();
						refresh();
					};
			}
			fill();
			updateFaction();
		}
		const on = (id, fn) => {
			const b = this.root.querySelector("#menu-" + id);
			if (b) b.onclick = fn;
		};
		on("single", () => this.show("single"));
		on("quit", () => window.desktop?.quit());
		on("scenarios", () => this.show("scenarios"));
		on("slots", () => {
			this.slotOrigin = this.screen;
			this.slotMode = "load";
			this.show("slots");
		});
		on("slots-back", () => this.show(this.slotOrigin || "home"));
		on("slot-cancel", () => this.show("slots"));
		on("slot-confirm", () => this.writeSlot());
		this.root.querySelectorAll("[data-slot]").forEach(
			(b) =>
				(b.onclick = () => {
					this.slotNumber = Number(b.dataset.slot);
					if (this.slotMode === "save") {
						if (this.api.slots()[this.slotNumber - 1].exists)
							this.show("slot-confirm");
						else this.writeSlot();
					} else if (this.api.loadSlot(this.slotNumber))
						this.show("pause");
					else {
						this.show("slots");
						this.root.querySelector("#menu-feedback").textContent =
							"Nie udało się wczytać zapisu.";
					}
				}),
		);
		on("training", () => {
			this.selectedMission = "training";
			this.missionOrigin = "campaign";
			this.show("briefing");
		});
		// The campaign's intro plays on the first entry only (remembered on this device); the button by act I replays it.
		on("campaign", () => this.show(this.firstIntro() ? "intro" : "campaign"));
		on("intro", () => this.show("intro"));
		on("skip-intro", () => this.show("campaign"));
		on("intro2", () => {
			this.afterIntro2 = "campaign";
			this.show("intro2");
		});
		on("skip-intro2", () => this.show(this.afterIntro2 || "campaign"));
		on("intro3", () => {
			this.afterIntro3 = "campaign";
			this.show("intro3");
		});
		on("skip-intro3", () => this.show(this.afterIntro3 || "campaign"));
		if (screen === "intro3") this.playIntro(Act3Film.prepare(this.api.campaignDetails?.()?.choices || {}), this.afterIntro3 || "campaign");
		on("intro4", () => {
			this.afterIntro4 = "campaign";
			this.show("intro4");
		});
		on("skip-intro4", () => this.show(this.afterIntro4 || "campaign"));
		if (screen === "intro4") this.playIntro(Act4Film.prepare(this.api.campaignDetails?.()?.choices || {}), this.afterIntro4 || "campaign");
		// The finale of the campaign (campaign-finale.js), with the campaign's decisions.
		on("finale", () => {
			this.afterFinale = "campaign";
			this.show("finale");
		});
		on("skip-finale", () => this.show(this.afterFinale || "campaign"));
		if (screen === "finale" && typeof FinaleFilm !== "undefined") this.playIntro(FinaleFilm.prepare(this.api.campaignDetails?.()?.choices || {}), this.afterFinale || "campaign");
		on("review", () => {
			this.selectedMission = this.api.review().missionId;
			this.show("review");
		});
		if (screen === "intro") this.playIntro();
		if (screen === "interlude") this.playIntro(Interludes.film(this.selectedMission), "briefing");
		on("skip-interlude", () => this.show("briefing"));
		on("replay-interlude", () => this.show("interlude"));
		if (screen === "intro2")
			this.playIntro(Act2Film, this.afterIntro2 || "campaign");
		if (screen === "scenarios") {
			this.root.querySelector("h2").remove();
			const select = this.root.querySelector("#scenario-map");
			select.value = this.selectedMission;
			select.onchange = () => {
				this.selectedMission = select.value;
				this.backdrop?.setWorld?.(RTS.MISSIONS[this.selectedMission]);
				const code = this.root.querySelector("#scenario-code");
				if (code)
					code.value = RTS.scenarioCode(
						this.selectedMission,
						this.scenario,
					);
				this.drawMapPreview();
			};
			this.drawMapPreview();
		}
		on("campaign-back", () => this.show("single"));
		if (screen === "campaign") this.mountGalaxy();
		on("mission-back", () => this.show(this.missionOrigin));
		const levelSelect = this.root.querySelector("#campaign-difficulty");
		if (levelSelect)
			levelSelect.onchange = () => {
				this.api.setCampaignDifficulty?.(levelSelect.value);
				this.show("briefing", "campaign-difficulty");
			};
		this.root.querySelectorAll("[data-mission]").forEach(
			(b) =>
				(b.onclick = () => {
					this.selectedMission = b.dataset.mission;
					this.missionOrigin = RTS.MISSIONS[this.selectedMission]
						.campaign
						? "campaign"
						: "scenarios";
					// The act IV prologue, before chapter X (until it is completed).
					if (this.selectedMission === "colony10" && typeof Act4Film !== "undefined" && !(this.api.campaign?.() || {}).colony10 && !this.act4IntroSeen) {
						this.act4IntroSeen = true;
						this.afterIntro4 = this.firstInterlude(this.selectedMission) ? "interlude" : "briefing";
						this.show("intro4");
						return;
					}
					// The act III prologue likewise, before chapter VII.
					if (this.selectedMission === "colony7" && typeof Act3Film !== "undefined" && !(this.api.campaign?.() || {}).colony7 && !this.act3IntroSeen) {
						this.act3IntroSeen = true;
						this.afterIntro3 = this.firstInterlude(this.selectedMission) ? "interlude" : "briefing";
						this.show("intro3");
						return;
					}
					// The act II prologue plays once before its first chapter is completed.
					if (
						this.selectedMission === "colony4" &&
						!(this.api.campaign?.() || {}).colony4 &&
						!this.act2IntroSeen
					) {
						this.act2IntroSeen = true;
						this.afterIntro2 = this.firstInterlude(this.selectedMission) ? "interlude" : "briefing";
						this.show("intro2");
					} else this.show(this.firstInterlude(this.selectedMission) ? "interlude" : "briefing");
				}),
		);
		on("back", () =>
			this.show(
				this.screen === "single" ? "home" : this.origin,
				this.screen === "single" ? "menu-single" : this.focusReturn,
			),
		);
		on("cancel", () =>
			this.show(
				RTS.MISSIONS[this.selectedMission].campaign
					? "briefing"
					: "scenarios",
				"menu-launch",
			),
		);
		on("launch", () => {
			if (save.exists) this.show("replace");
			else this.launch();
		});
		on("confirm", () => this.launch());
		on("continue", () => {
			if (this.api.load()) {
				this.show("pause");
			} else this.show("home");
		});
		on("resume", () => {
			this.hide();
			this.api.resume();
		});
		on("pause", () => this.show("pause"));
		on("save", () => {
			this.slotOrigin = "pause";
			this.slotMode = "save";
			this.show("slots");
		});
		on("home", () => {
			if (this.api.save()) {
				this.api.leave();
				this.show("home");
			} else this.show("save-error");
		});
		on("leave", () => {
			this.api.leave();
			this.show("home");
		});
		for (const id of ["settings", "knowledge", "news"])
			on(id, () => {
				if (!["settings", "knowledge", "news"].includes(this.screen)) {
					this.origin = this.screen;
					this.focusReturn = "menu-" + id;
				}
				this.show(id);
			});
		on("sound", () => this.api.toggleSound());
		if (screen === "settings") {
			if (typeof SceneFX !== "undefined") {
				for (const key of ["terrain", "particles"]) {
					const el = this.root.querySelector("#visual-" + key);
					el.value = SceneFX.options[key];
					el.onchange = () => SceneFX.set(key, el.value);
				}
				for (const key of ["flashes", "metrics", "lights", "shadows", "bloom", "water", "volume", "scars", "relief", "tilt", "cinema", "ao", "pbr", "reflect", "atmo", "surface", "dof", "haze", "shake"]) {
					const el = this.root.querySelector("#visual-" + key);
					el.checked = SceneFX.options[key];
					el.onchange = () => SceneFX.set(key, el.checked);
				}
				const rendererSelect = this.root.querySelector("#visual-renderer"),
					status = this.root.querySelector("#renderer-status"),
					showStatus = () => {
						const s = this.api.rendererStatus?.() || { mode: "canvas", note: "" };
						const gpu = SceneFX.options.renderer !== "canvas",
							name = { webgl: "WebGL (PixiJS)", webgpu: "WebGPU (PixiJS)", three: "3D (Three.js)" };
						// The effects stay available when WebGPU fell back to WebGL, not when the board fell back to Canvas 2D.
						// The 3D board uses lights, shadows, water, scars and relief (webgl3d/three-renderer.js applyQuality);
						// volume light and the 2.5D tilt belong to the PixiJS renderer only, the cinematic image and the ambient
						// occlusion to the 3D board; bloom serves both.
						const only2d = ["visual-volume", "visual-tilt"],
							only3d = ["visual-cinema", "visual-ao", "visual-pbr", "visual-reflect", "visual-atmo", "visual-surface", "visual-dof", "visual-haze", "visual-shake"];
						for (const box of this.root.querySelectorAll(".webgl-effect")) box.disabled = !gpu || (s.mode === "three" && only2d.includes(box.id)) || (SceneFX.options.renderer !== "three" && only3d.includes(box.id)) || (s.mode === "canvas" && !!s.note);
						status.textContent = s.note || (name[s.mode] ? `Aktywny: ${name[s.mode]}.` : gpu ? `${name[SceneFX.options.renderer]} uruchomi się razem z planszą.` : "Aktywny: Canvas 2D.");
					};
				rendererSelect.value = SceneFX.options.renderer;
				rendererSelect.onchange = () => {
					SceneFX.set("renderer", rendererSelect.value);
					showStatus();
					setTimeout(showStatus, 600);
				};
				showStatus();
			}
			// Listening to the score: a theme and a mood, until stopped or the screen is left.
			const theme = this.root.querySelector("#music-theme"),
				mood = this.root.querySelector("#music-mood"),
				playButton = this.root.querySelector("#music-play"),
				now = this.root.querySelector("#music-now");
			const audio = this.api.audio();
			const showPreview = () => {
				const p = audio.musicPreview,
					// The film cues and the menu have no moods.
					fixed = ["menu", "intro", "prologue", "prologue2", "prologue3", "prologue4", "finale"].includes(theme.value);
				mood.disabled = fixed;
				playButton.firstChild.textContent = p ? "Zatrzymaj" : "Odtwórz";
				playButton.lastChild.textContent = p ? "■" : "▶";
				const name = (list, v) => list.find(([k]) => k === v)?.[1] || v;
				now.textContent = p
					? `Teraz gra: ${name(MUSIC_THEMES, p.mode)}${["menu", "intro", "prologue", "prologue2", "prologue3", "prologue4", "finale"].includes(p.mode) ? "" : " · " + name(MUSIC_MOODS, p.mood).toLowerCase()}.${audio.muted ? " Dźwięk jest wyciszony." : audio.musicVolume === 0 ? " Głośność muzyki: 0." : ""}`
					: "Wybierz motyw i nastrój. Po wyjściu z ustawień wraca zwykła muzyka.";
			};
			const start = () => {
				audio.unlock?.();
				audio.previewMusic(theme.value, mood.value);
				showPreview();
			};
			if (audio.musicPreview) {
				theme.value = audio.musicPreview.mode;
				mood.value = audio.musicPreview.mood;
			}
			playButton.onclick = () => {
				if (audio.musicPreview) {
					audio.stopPreview();
					this.api.music?.("menu");
					showPreview();
				} else start();
			};
			theme.onchange = mood.onchange = () => {
				if (audio.musicPreview) start();
				else showPreview();
			};
			showPreview();
			for (const key of ["combat", "units", "ambient", "alerts"])
				this.root.querySelector("#mix-" + key).oninput = (e) => {
					this.api
						.audio()
						.setChannelVolume(key, Number(e.target.value) / 100);
					this.syncAudio();
				};
			const quality = this.root.querySelector("#menu-audio-quality"),
				audioStatus = this.root.querySelector("#menu-audio-status");
			if (quality) {
				quality.value = this.api.audio().quality || "high";
				quality.onchange = () => this.api.audio().setQuality?.(quality.value);
			}
			// Live diagnostics: context state, what plays and the output level (refreshed while the screen is open).
			clearInterval(this.audioTimer);
			const showAudio = () => {
				if (!audioStatus?.isConnected) return clearInterval(this.audioTimer);
				const d = this.api.audio().diagnostics?.();
				if (!d) return;
				const bars = d.level === undefined ? "—" : "▮".repeat(Math.min(10, Math.round(Math.sqrt(d.level / 0.02) * 10))).padEnd(10, "▯");
				audioStatus.textContent = `Stan: ${d.state}${d.muted ? " · wyciszony" : ""} · motyw ${d.mode} · próbki ${d.samples}/14 · Tone.js ${d.tone} · wyjście ${bars}${d.invalid ? " · błędny sygnał!" : ""}`;
			};
			showAudio();
			this.audioTimer = setInterval(showAudio, 400);
			this.root.querySelector("#menu-music-volume").oninput = (e) => {
				this.api.audio().setMusicVolume(Number(e.target.value) / 100);
				this.syncAudio();
			};
			this.root.querySelector("#menu-volume").oninput = (e) => {
				this.api.volume(Number(e.target.value) / 100);
				this.syncAudio();
			};
			this.root.querySelector("#menu-muted").onchange = (e) => {
				this.api.mute(e.target.checked);
				this.syncAudio();
			};
			this.root.querySelector("#menu-reduced").onchange = (e) => {
				this.reduced = e.target.checked;
				this.root.classList.toggle("reduced-motion", this.reduced);
				try {
					localStorage.setItem(
						"pogranicze-menu-v1",
						JSON.stringify({ reduced: this.reduced }),
					);
				} catch {
					this.root.querySelector("#menu-preferences").textContent =
						"Ustawienie działa teraz, ale nie można go zapamiętać.";
				}
			};
			this.mountAppSettings();
		}
		this.syncAudio();
		(
			this.root.querySelector("#" + focusId) ||
			this.root.querySelector("h1")
		).focus();
	}
	syncAudio() {
		if (!this.active) return;
		const s = this.api.audio();
		const b = this.root.querySelector("#menu-sound");
		if (b) {
			b.textContent = s.muted
				? "Dźwięk wyłączony [M]"
				: "Dźwięk włączony [M]";
			b.disabled = s.failed;
		}
		for (const key of ["combat", "units", "ambient", "alerts"]) {
			const slider = this.root.querySelector("#mix-" + key);
			if (slider) {
				slider.value = Math.round((s.channels?.[key] ?? 1) * 100);
				this.root.querySelector("#mix-" + key + "-value").textContent =
					slider.value + "%";
			}
		}
		const musicSlider = this.root.querySelector("#menu-music-volume");
		if (musicSlider) {
			musicSlider.value = Math.round((s.musicVolume ?? 0.35) * 100);
			this.root.querySelector("#menu-music-value").textContent =
				musicSlider.value + "%";
		}
		const slider = this.root.querySelector("#menu-volume");
		if (slider) {
			slider.value = Math.round(s.volume * 100);
			slider.disabled = s.failed;
			this.root.querySelector("#menu-volume-value").textContent =
				slider.value + "%";
			this.root.querySelector("#menu-muted").checked = s.muted;
			this.root.querySelector("#menu-muted").disabled = s.failed;
		}
	}
	writeSlot() {
		const ok = this.api.saveSlot(this.slotNumber);
		this.show("slots");
		this.root.querySelector("#menu-feedback").textContent = ok
			? "Zapisano slot " + this.slotNumber + "."
			: "Nie zapisano: pamięć lokalna niedostępna lub pełna.";
	}
	// The situation report on the pause screen: the battle at a glance.
	situationHtml() {
		const s = this.api.situation?.();
		if (!s) return "";
		const tile = (value, label) => `<span><b>${value}</b>${label}</span>`;
		return `<aside class="pause-report" aria-label="Raport sytuacyjny"><span class="eyebrow">RAPORT SYTUACYJNY</span><div class="pause-tiles">${tile(s.metal, "metal")}${tile(s.gas, "gaz")}${tile(s.crystals, "kryształy")}${tile(s.army, "jednostki bojowe")}${tile(s.workers, "roboty")}${tile(s.relays, "przekaźniki")}</div><h3>Cele</h3><ul class="pause-objectives">${s.objectives.map((o) => `<li class="${o.done ? "done" : o.failed ? "failed" : ""}${o.secondary ? " secondary" : ""}">${o.text}</li>`).join("")}</ul><div class="pause-intel">${s.attack ? `<p class="pause-alert">⚠ Planowany atak wroga za <b>${s.attack}</b></p>` : ""}<p>${s.sky} · budynki: ${s.buildings}</p>${s.line ? `<p class="pause-radio"><b>${RTS.ACT2_SPEAKERS?.[s.line.who]?.name || s.line.who}:</b> ${s.line.text}</p>` : ""}</div></aside>`;
	}
	// The campaign's intro plays once, on the first entry into the campaign (remembered on this device).
	firstIntro() {
		if (typeof CampaignFilm === "undefined") return false;
		try {
			if (localStorage.getItem("pogranicze-intro-v1")) return false;
			localStorage.setItem("pogranicze-intro-v1", "1");
		} catch {}
		return true;
	}
	// The radio scene of a chapter plays once before its first briefing (remembered on this device).
	firstInterlude(id) {
		if (typeof Interludes === "undefined" || !Interludes.has(id)) return false;
		let seen = {};
		try {
			seen = JSON.parse(localStorage.getItem("pogranicze-interludes-v1") || "{}");
		} catch {}
		if (seen[id]) return false;
		seen[id] = true;
		try {
			localStorage.setItem("pogranicze-interludes-v1", JSON.stringify(seen));
		} catch {}
		return true;
	}
	// Campaign briefing: the difficulty of the whole campaign and what it means in this chapter.
	campaignLevelHtml(m) {
		const level = this.api.campaignDetails?.()?.difficulty || "normal",
			info = {
				easy: "Słabszy przeciwnik (−15% wytrzymałości i obrażeń).",
				normal: "Przeciwnik w pełnej sile.",
				hard: "Silniejszy przeciwnik (+15% wytrzymałości i obrażeń).",
			}[level],
			ai = m.commander || m.act >= 3 ? " " + (RTS.AI_LEVELS?.[level]?.description || "") + (RTS.CAMPAIGN_AI?.[this.selectedMission]?.hangar === false && RTS.AI_LEVELS?.[level]?.hangarAt != null ? " W tym rozdziale bez hangaru i lotnictwa." : "") : "";
		return `<label class="campaign-level">Poziom trudności kampanii<select id="campaign-difficulty" aria-label="Poziom trudności kampanii">${["easy", "normal", "hard"].map((k) => `<option value="${k}" ${k === level ? "selected" : ""}>${RTS.AI_LEVELS?.[k]?.name || k}</option>`).join("")}</select></label><p class="campaign-level-info">${m.commander ? "<b>Przeciwnik: dowódca AI</b> — zamiast zaplanowanych desantów Dominium buduje bazę, zbiera surowce, broni się i atakuje według poziomu. " + (RTS.AI_STYLES?.dominion ? `Styl „${RTS.AI_STYLES.dominion.name}”: ${RTS.AI_STYLES.dominion.description} ` : "") : m.act >= 3 ? "<b>Przeciwnik: dowódca AI.</b> " : ""}${info}${ai}</p>`;
	}
	launch() {
		this.hide();
		this.api.start(
			this.selectedMission,
			RTS.MISSIONS[this.selectedMission].campaign ? null : this.scenario,
		);
	}
	// The campaign screen: the chapter list and a preview of the chapter under the pointer or focus (the next one
	// at first) — its world turning under a sight, the data, the story and the way to its briefing.
	mountGalaxy() {
		const preview = this.root.querySelector("#mission-preview");
		if (!preview) return;
		const grid = this.root.querySelector(".campaign-select"),
			scroll = this.root.querySelector(".menu-scroll");
		// The list and the preview take the room left in the menu window.
		this.fitGalaxy = () => {
			if (!grid || !scroll || window.innerWidth <= 980) return grid && (grid.style.height = "");
			const top = grid.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
			grid.style.height = Math.max(320, Math.min(780, scroll.clientHeight - top - 6)) + "px";
		};
		this.fitGalaxy();
		window.addEventListener("resize", this.fitGalaxy);
		const progress = this.api.campaign?.() || {},
			order = ["training", "colony1", "colony2", "colony3", "colony4", "colony5", "colony6", "colony7", "colony8", "colony9", "colony10", "colony11", "colony12", "colony13", "colony14"].filter((id) => RTS.MISSIONS[id]),
			status = (id) => (progress[id] ? "done" : !RTS.MISSIONS[id].requires || progress[RTS.MISSIONS[id].requires] ? "open" : "locked");
		if (typeof GalaxyMap !== "undefined") this.galaxy = GalaxyMap.portrait(null, { reduced: this.reduced });
		const show = (id) => this.showMission(id, order, status);
		this.root.querySelectorAll("[data-mission]").forEach((b) => {
			b.addEventListener("mouseenter", () => show(b.dataset.mission));
			b.addEventListener("focus", () => show(b.dataset.mission));
		});
		show(this.previewMission && RTS.MISSIONS[this.previewMission] ? this.previewMission : order.find((id) => status(id) === "open") || order.at(-1));
	}
	showMission(id, order, status) {
		const preview = this.root.querySelector("#mission-preview"),
			m = RTS.MISSIONS[id];
		if (!preview || !m) return;
		if (this.previewMission === id && preview.childElementCount) return;
		this.previewMission = id;
		const ROMAN = ["S", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"],
			num = ROMAN[order.indexOf(id)] || "",
			state = status(id),
			details = this.api.campaignDetails?.() || { badges: {}, choices: {} },
			planet = m.planet.split(" — ")[0],
			world = typeof GalaxyMap !== "undefined" ? GalaxyMap.WORLDS[planet] : null,
			label = { done: "◉ Ukończony", open: "● Do rozegrania", locked: "⊘ Zablokowany" }[state],
			act = ["", "I · Odzyskany Świt", "II · Cena świtu", "III · Przebudzenie Roju", "IV · Inwazja"][m.act || 1];
		preview.innerHTML =
			`<span class="eyebrow">AKT ${act}</span><h3><i class="world-num ${state}">${num}</i>${m.name.replace(/^[IVX]+ · /, "")}</h3>` +
			(world ? `<canvas class="world-portrait" role="img" aria-label="Podgląd planety ${planet}"></canvas>` : "") +
			`<dl class="world-data"><div><dt>Stan</dt><dd class="state-${state}">${label}${details.badges[id] ? " · ◆" : ""}</dd></div><div><dt>Planeta</dt><dd>${m.planet}</dd></div>${world ? `<div><dt>Klimat</dt><dd>${GalaxyMap.CLIMATE[world.climate].name}</dd></div><div><dt>Księżyce</dt><dd>${world.moons || 0}${world.rings ? " · pierścienie" : ""}${world.belt ? " · pas asteroid" : ""}</dd></div>` : ""}${state === "locked" && m.requires ? `<div><dt>Wymaga</dt><dd>${RTS.MISSIONS[m.requires].name}</dd></div>` : ""}</dl>` +
			`<p>${m.description}</p>${m.objective ? `<p class="menu-objective">${m.objective}</p>` : ""}` +
			(state === "locked" ? "" : `<button type="button" class="preview-open">Odprawa ↗</button>`);
		const canvas = preview.querySelector(".world-portrait");
		if (canvas && this.galaxy) {
			this.galaxy.portrait = canvas;
			this.galaxy.show(planet);
		}
		const open = preview.querySelector(".preview-open");
		if (open) open.onclick = () => this.root.querySelector(`[data-mission="${id}"]`)?.click();
		this.root.querySelectorAll("[data-mission]").forEach((b) => b.classList.toggle("on-world", b.dataset.mission === id));
	}
	// Rule settings, map seed and the shareable operation code.
	settingFields() {
		const o = RTS.SCENARIO_OPTIONS;
		if (!o) return "";
		const options = (table) =>
			Object.entries(table)
				.map(([id, v]) => `<option value="${id}">${v.name}</option>`)
				.join("");
		return (
			(RTS.ENEMY_FACTIONS
				? `<label>Frakcja przeciwnika<select id="scenario-enemyFaction" aria-label="Frakcja przeciwnika">${Object.entries(RTS.ENEMY_FACTIONS)
						.map(([id, name]) => `<option value="${id}">${name}</option>`)
						.join("")}</select></label>`
				: "") +
			(RTS.TEAM_MODES
				? `<label>Drużyny<select id="scenario-teams" aria-label="Drużyny">${options(RTS.TEAM_MODES)}</select></label>`
				: "") +
			(RTS.ENEMY_MODES
				? `<label>Przeciwnik<select id="scenario-enemy" aria-label="Rodzaj przeciwnika">${options(RTS.ENEMY_MODES)}</select></label><p id="enemy-description"></p>`
				: "") +
			`<label id="field-defenseTime">Czas obrony<select id="scenario-defenseTime" aria-label="Czas obrony">${o.defenseTime.map((t) => `<option value="${t}">${t / 60} min</option>`).join("")}</select></label>` +
			`<label id="field-pointsPerRelay">Pula punktów<select id="scenario-pointsPerRelay" aria-label="Pula punktów">${o.pointsPerRelay.map((n) => `<option value="${n}">${n} pkt na przekaźnik</option>`).join("")}</select></label>` +
			`<label>Złoża<select id="scenario-resources" aria-label="Złoża">${options(o.resources)}</select></label>` +
			`<label>Fauna<select id="scenario-fauna" aria-label="Fauna">${options(o.fauna)}</select></label>` +
			`<label>Pogoda<select id="scenario-weather" aria-label="Pogoda">${options(o.weather)}</select></label>` +
			(o.dayLength ? `<label>Długość doby<select id="scenario-dayLength" aria-label="Długość doby">${options(o.dayLength)}</select></label>` : "") +
			(o.startLevel ? `<label>Poziom startowy<select id="scenario-startLevel" aria-label="Poziom startowy">${options(o.startLevel)}</select></label>` : "") +
			(o.hillTime ? `<label id="field-hillTime">Czas na Szczycie<select id="scenario-hillTime" aria-label="Czas utrzymania Szczytu">${o.hillTime.map((t) => `<option value="${t}">${t / 60} min</option>`).join("")}</select></label>` : "") +
			`<label>Ziarno mapy<span class="inline-field"><input id="scenario-seed" inputmode="numeric" maxlength="6" placeholder="układ klasyczny" aria-label="Ziarno mapy"><button type="button" id="scenario-seed-random">Losuj</button></span></label>` +
			`<label class="wide-field">Kod operacji — do udostępnienia<span class="inline-field"><input id="scenario-code" maxlength="48" spellcheck="false" autocomplete="off" aria-label="Kod operacji"><button type="button" id="scenario-code-apply">Wczytaj kod</button></span></label><p id="scenario-code-feedback" role="status"></p>`
		);
	}
	drawMapPreview() {
		const canvas = this.root.querySelector("#map-preview"),
			c = canvas.getContext("2d"),
			g = new RTS.Game(42, this.selectedMission),
			m = RTS.MISSIONS[this.selectedMission];
		g.configureSkirmish(this.scenario);
		c.fillStyle =
			m.biome === "ice"
				? "#b4c5cb"
				: m.biome === "ash"
					? "#615962"
					: "#b9a579";
		c.fillRect(0, 0, 480, 190);
		c.save();
		c.scale(480 / g.W, 190 / g.H);
		if (typeof BoardArt !== "undefined") BoardArt.terrain(c, g);
		if (typeof PlanetArt !== "undefined") PlanetArt.terrain(c, g);
		for (const w of g.waters) {
			c.fillStyle =
				(typeof MapArt !== "undefined" && MapArt.color(w.kind)) ||
				"#467b8e";
			c.beginPath();
			if (typeof PlanetArt !== "undefined") PlanetArt.lakePath(c, w);
			else {
				for (let i = 0; i <= 80; i++) {
					const a = (i * Math.PI) / 40,
						r = RTS.waterRadius(w, a),
						x = w.x + Math.cos(a) * w.rx * r,
						y = w.y + Math.sin(a) * w.ry * r;
					if (!i) c.moveTo(x, y);
					else c.lineTo(x, y);
				}
				c.closePath();
			}
			c.fill();
		}
		for (const r of g.obstacles) {
			c.fillStyle =
				(typeof MapArt !== "undefined" && MapArt.color(r.kind)) ||
				"#454f4b";
			c.fillRect(r.x, r.y, r.w, r.h);
		}
		for (const o of g.ores) {
			c.fillStyle = "#82b5be";
			c.fillRect(o.x - 28, o.y - 28, 56, 56);
		}
		for (const n of g.nodes) {
			c.fillStyle = "#efd17e";
			c.beginPath();
			c.arc(n.x, n.y, 36, 0, Math.PI * 2);
			c.fill();
		}
		for (const e of g.entities.filter((e) => e.type === "hq")) {
			c.fillStyle = g.colorFor(e.team);
			c.fillRect(e.x - 55, e.y - 55, 110, 110);
		}
		const artifact = g.modeState?.artifact;
		if (artifact) {
			c.fillStyle = "#f5e27a";
			c.strokeStyle = "#3a2a08";
			c.lineWidth = 14;
			c.beginPath();
			c.moveTo(artifact.x, artifact.y - 90);
			c.lineTo(artifact.x + 60, artifact.y);
			c.lineTo(artifact.x, artifact.y + 90);
			c.lineTo(artifact.x - 60, artifact.y);
			c.closePath();
			c.fill();
			c.stroke();
		}
		c.restore();
		this.root.querySelector("#map-description").textContent = m.description;
	}
	// Long screens get the knowledge-base layout: fixed title and actions, scrolled content between them.
	// Act III briefing: the consequences of the act II decision about the Hefajstos complex.
	legacyHtml(m) {
		return this.decisionsHtml() + this.act3LegacyHtml(m) + this.act4LegacyHtml();
	}
	// Act IV: Varn after the decision of chapter VIII (X and XI), and the pods the fleet of X left for XI.
	act4LegacyHtml() {
		const id = this.selectedMission;
		// XIV: who flies with the Colonies to the Gate (0.171.12: Varn's ships, from VIII or XII, were never announced).
		if (id === "colony14") {
			const c = this.api.campaignDetails?.()?.choices || {},
				varn = c.colony12 === "garrison" || c.colony8 === "trust",
				vok = c.colony13 === "truce";
			return `<div class="menu-legacy"><span class="menu-tag">SOJUSZNICY PRZY BRAMIE</span><p>${varn ? `Okręty Varna (fregata i korweta) lecą z Tobą — ${c.colony12 === "garrison" ? "za ocalony garnizon" : "za wspólne dowództwo"}.` : "Varn zostaje na Nivalis: jego okrętów przy Bramie nie będzie."} ${vok ? "Flota Vok (2 fregaty i krążownik) walczy po Twojej stronie." : c.colony13 === "rout" ? "Admiralicja nie istnieje — zamiast jej floty masz 600 metalu z jej magazynów." : ""}</p><p>Na poziomie trudnym ci sojusznicy mogą przesądzić o bitwie.</p></div>`;
		}
		if (!["colony10", "colony11"].includes(id) || !RTS.ACT4_VARN) return "";
		const details = this.api.campaignDetails?.() || {},
			V = RTS.ACT4_VARN[details.choices?.colony8],
			pods = details.carry?.colony10?.pods;
		const varn = V
			? `<div class="menu-legacy"><span class="menu-tag">SKUTKI DECYZJI · PROPOZYCJA VARNA</span><h3>${V.name}</h3><p>${V.summary}</p></div>`
			: `<div class="menu-legacy"><span class="menu-tag">SKUTKI DECYZJI · PROPOZYCJA VARNA</span><p>Brak zapisanej decyzji z rozdziału VIII — Varn nie bierze udziału w wojnie z Admiralicją.</p></div>`;
		const fleet =
			id === "colony11"
				? `<div class="menu-legacy"><span class="menu-tag">WYNIK ROZDZIAŁU X · FLOTA</span><p>${Number.isInteger(pods) ? `Kapsuły desantowe z ocalałej floty blokady Eos: <b>${Math.min(pods, RTS.ACT4_POD_CAP ?? pods)}</b>.` : `Brak zapisanego wyniku rozdziału X — kapsuły desantowe na start: ${RTS.INVASION?.minPods + 2 || 4}.`}</p></div>`
				: "";
		return varn + fleet;
	}
	// Briefing: what earlier story decisions (campaign-choices.js) change in this chapter.
	decisionsHtml() {
		const ids = RTS.CAMPAIGN_DECISION_EFFECTS?.[this.selectedMission];
		if (!ids) return "";
		const choices = this.api.campaignDetails?.()?.choices || {};
		return ids
			.map((id) => {
				const D = RTS.CAMPAIGN_DECISIONS[id],
					O = D.options[choices[id]],
					tag = "SKUTKI DECYZJI · " + D.eyebrow.split(" / ")[1];
				return O
					? `<div class="menu-legacy"><span class="menu-tag">${tag}</span><h3>${O.name}</h3><p>${O.text}</p></div>`
					: `<div class="menu-legacy"><span class="menu-tag">${tag}</span><p>Brak zapisanej decyzji — podejmiesz ją w rozdziale ${RTS.MISSIONS[id].name.split(" · ")[0]}, a jej skutki trafią tutaj.</p></div>`;
			})
			.join("");
	}
	act3LegacyHtml(m) {
		if (m.act !== 3 || !RTS.ACT3_LEGACY) return "";
		const choice = this.api.campaignDetails?.()?.choices?.colony6,
			legacy = RTS.ACT3_LEGACY[choice];
		if (!legacy)
			return `<div class="menu-legacy"><span class="menu-tag">SKUTKI AKTU II</span><p>Brak zapisanej decyzji o losie kompleksu Hefajstos — ukończ rozdział VI, by jego skutki przeszły do aktu III.</p></div>`;
		return `<div class="menu-legacy ${choice}"><span class="menu-tag">SKUTKI AKTU II · ${choice === "destroy" ? "KOMPLEKS ZNISZCZONY" : "PERSONEL EWAKUOWANY"}</span><h3>${legacy.name}</h3><p>${legacy.summary}</p></div>`;
	}
	windowed() {
		const content = this.root.querySelector(".menu-content"),
			scroll = document.createElement("div"),
			actions = document.createElement("div"),
			parts = [...content.children].filter(
				(el) => !el.matches(".eyebrow, h1"),
			);
		let split = parts.length;
		while (
			split > 0 &&
			parts[split - 1].matches(".menu-action, [role=status]")
		)
			split--;
		content.classList.add("menu-window");
		scroll.className = "menu-scroll";
		scroll.tabIndex = 0;
		scroll.setAttribute("role", "region");
		scroll.setAttribute(
			"aria-label",
			content.querySelector("h1")?.textContent || "Treść",
		);
		actions.className = "menu-window-actions";
		scroll.append(...parts.slice(0, split));
		actions.append(...parts.slice(split));
		content.append(scroll);
		if (actions.children.length) content.append(actions);
	}
	// A short notice at the bottom of the menu (e.g. the test unlock of the campaign).
	notice(text) {
		document.querySelector(".menu-notice")?.remove();
		const el = document.createElement("div");
		el.className = "menu-notice";
		el.setAttribute("role", "status");
		el.textContent = text;
		document.body.append(el);
		setTimeout(() => el.remove(), 3500);
	}
	// Settings in tabs: each section (a heading in the scroll) becomes a panel; the first one is the sound.
	// Ustawienia → Aplikacja i zapisy (G3, 0.151): full screen in the desktop app; saves to a file and back
	// (save-transfer.js) — in the browser too.
	mountAppSettings() {
		const fullscreen = this.root.querySelector("#app-fullscreen"),
			status = this.root.querySelector("#saves-status"),
			file = this.root.querySelector("#saves-file"),
			desktop = window.desktop;
		if (fullscreen && desktop) {
			desktop.isFullScreen().then((on) => (fullscreen.checked = on));
			fullscreen.onchange = () => desktop.setFullScreen(fullscreen.checked).then((on) => (fullscreen.checked = on));
			if (!this.fullscreenWatch) {
				this.fullscreenWatch = true;
				desktop.onFullScreen((on) => {
					const box = this.root.querySelector("#app-fullscreen");
					if (box) box.checked = on;
				});
			}
		}
		const exporter = this.root.querySelector("#saves-export");
		if (!exporter || typeof SaveTransfer === "undefined") return;
		const version = GAME_VERSION;
		exporter.onclick = () => {
			try {
				const text = SaveTransfer.exportSaves(localStorage, version),
					link = document.createElement("a");
				link.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
				link.download = `pogranicze-zapisy-${new Date().toISOString().slice(0, 10)}.json`;
				document.body.append(link);
				link.click();
				link.remove();
				setTimeout(() => URL.revokeObjectURL(link.href), 10000);
				status.textContent = `Wyeksportowano ${SaveTransfer.keysOf(localStorage).length} wpisów do pliku ${link.download}.`;
			} catch {
				status.textContent = "Nie udało się wyeksportować zapisów.";
			}
		};
		this.root.querySelector("#saves-import").onclick = () => file.click();
		file.onchange = async () => {
			const chosen = file.files?.[0];
			file.value = "";
			if (!chosen) return;
			const text = await chosen.text(),
				check = SaveTransfer.readSaves(text);
			if (!check.ok) {
				status.textContent = check.error;
				return;
			}
			const from = [check.game && `wersja ${check.game}`, check.exported && check.exported.slice(0, 10)].filter(Boolean).join(", ");
			const question = {
				eyebrow: "ZAPISY · IMPORT Z PLIKU",
				title: "Zastąpić zapisy z tego urządzenia?",
				text: "Import zastąpi wszystkie obecne zapisy bitew i slotów, postęp kampanii, rekordy i ustawienia danymi z pliku. Gra uruchomi się potem ponownie.",
				facts: [["Plik", chosen.name], ["Wpisów", String(check.keys.length)], ...(from ? [["Pochodzenie", from]] : [])],
				ok: "Importuj zapisy",
				cancel: "Anuluj",
				tone: "warn",
			};
			if (!(await (typeof GameDialog !== "undefined" ? GameDialog.confirm(question) : Promise.resolve(window.confirm(question.text))))) return;
			try {
				SaveTransfer.importSaves(localStorage, text);
				// The running battle must not be saved over the imported saves before the reload.
				this.api.holdSaves?.();
				status.textContent = "Zapisy wczytane. Gra uruchomi się ponownie…";
				setTimeout(() => location.reload(), 900);
			} catch {
				status.textContent = "Nie udało się zapisać danych na tym urządzeniu.";
			}
		};
	}
	tabbed() {
		const scroll = this.root.querySelector(".menu-scroll");
		if (!scroll) return;
		const groups = [{ label: "Dźwięk", nodes: [] }];
		for (const el of [...scroll.children]) {
			if (el.tagName === "H2") {
				groups.push({ label: el.textContent, nodes: [] });
				el.remove();
			} else if (el.id !== "menu-preferences") groups.at(-1).nodes.push(el);
		}
		const tabs = document.createElement("div");
		tabs.className = "menu-tabs";
		tabs.setAttribute("role", "tablist");
		const active = Math.min(this.settingsTab || 0, groups.length - 1);
		groups.forEach((g, i) => {
			const panel = document.createElement("div"),
				tab = document.createElement("button");
			panel.className = "menu-tab-panel";
			panel.id = "settings-panel-" + i;
			panel.setAttribute("role", "tabpanel");
			panel.hidden = i !== active;
			panel.append(...g.nodes);
			scroll.append(panel);
			tab.type = "button";
			tab.id = "settings-tab-" + i;
			tab.setAttribute("role", "tab");
			tab.setAttribute("aria-controls", panel.id);
			tab.setAttribute("aria-selected", String(i === active));
			tab.innerHTML = `<small>0${i + 1}</small>${g.label}`;
			tab.onclick = () => {
				this.settingsTab = i;
				tabs.querySelectorAll("[role=tab]").forEach((t, j) => t.setAttribute("aria-selected", String(j === i)));
				scroll.querySelectorAll(".menu-tab-panel").forEach((p, j) => (p.hidden = j !== i));
				scroll.scrollTop = 0;
			};
			tabs.append(tab);
		});
		const pref = scroll.querySelector("#menu-preferences");
		if (pref) scroll.append(pref);
		scroll.before(tabs);
	}
	playIntro(film = CampaignFilm, next = "campaign") {
		const duration = film.duration || 30,
			screen = this.screen;
		const canvas = this.root.querySelector("#campaign-film"),
			caption = this.root.querySelector("#film-caption"),
			progress = this.root.querySelector("#film-progress"),
			c = canvas.getContext("2d");
		canvas.width = 1920;
		canvas.height = 800;
		c.scale(2, 2);
		let last = -1,
			// The film's clock runs only while the window is in front (0.171.14): leaving it holds the sound (app.js,
			// sound.suspend), and the film waits with it — the score and the shots stay together.
			t = 0,
			prev = null;
		const heard = new Set();
		const frame = (now) => {
			if (this.screen !== screen) return;
			const dt = prev == null ? 0 : (now - prev) / 1000;
			prev = now;
			if (document.hasFocus() && !document.hidden) t = Math.min(duration, t + Math.min(dt, 0.1));
			const shot = film.draw(c, t, this.reduced);
			if (last !== shot.scene) {
				caption.textContent = shot.caption;
				last = shot.scene;
				// Radio scenes: the speaker's voice, with their motif when they speak for the first time.
				const line = film.lines?.[shot.scene];
				if (line) {
					this.api.speak?.(line[0], line[1], { motif: !heard.has(line[0]) });
					heard.add(line[0]);
				}
			}
			progress.value = t;
			if (t >= duration) {
				this.show(next);
				return;
			}
			this.introFrame = requestAnimationFrame(frame);
		};
		this.introFrame = requestAnimationFrame(frame);
	}

	hide() {
		this.api.audio?.()?.stopPreview?.();
		this.galaxy?.destroy();
		this.galaxy = null;
		if (this.fitGalaxy) window.removeEventListener("resize", this.fitGalaxy);
		this.root.hidden = true;
		document.body.classList.remove("in-menu", "menu-over-game");
		this.gameElements.forEach((e) => (e.inert = false));
		document.getElementById("game").focus();
	}
	escape() {
		if (this.screen === "slots") {
			this.show(this.slotOrigin || "home");
		} else if (this.screen === "slot-confirm") {
			this.show("slots");
		} else if (this.screen === "scenarios") {
			this.show("single");
		} else if (this.screen === "pause") {
			this.hide();
			this.api.resume();
		} else if (this.screen === "single") this.show("home", "menu-single");
		else if (this.screen === "replace")
			this.show(
				RTS.MISSIONS[this.selectedMission].campaign
					? "briefing"
					: "scenarios",
				"menu-launch",
			);
		else if (this.screen === "briefing") this.show(this.missionOrigin);
		else if (this.screen === "intro") this.show("campaign");
		else if (this.screen === "interlude") this.show("briefing");
		else if (this.screen === "intro3") this.show(this.afterIntro3 || "campaign");
		else if (this.screen === "intro4") this.show(this.afterIntro4 || "campaign");
		else if (this.screen === "finale") this.show(this.afterFinale || "campaign");
		else if (this.screen === "intro2")
			this.show(this.afterIntro2 || "campaign");
		else if (this.screen === "review") this.show("pause");
		else if (this.screen === "campaign") this.show("single");
		else if (this.screen === "save-error") this.show("pause");
		else if (this.screen !== "home")
			this.show(this.origin, this.focusReturn);
	}
}
