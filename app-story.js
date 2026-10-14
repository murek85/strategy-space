/* The story and the end of a battle (0.173, I4 — split out of app.js unchanged): the story decisions and choices
   that hold the battle, the objectives of act II, the epilogue films, the landing of an invasion and the victory /
   defeat report with its styling. app.js hands over its state through `app` (getters for what changes). */
function createAppStory(app) {
	"use strict";
	const { $, MISSIONS, campaign, hud, launchWithScreen, network, saveGame, sound, timeLabel } = app;
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
		EndScreen.countUp(box, !!app.menu?.reduced);
		const m = MISSIONS[app.game.missionId] || {};
		EndScreen.mount($("overlay"), { victory, biome: m.biome, reduced: !!app.menu?.reduced });
	}
	// The epilogue of an act (epilogue-films.js) at the top of the report: it plays once and stops on its last
	// shot (the title), with a button to play it again.
	function showEpilogue() {
		const f = Epilogues.film(app.game.missionId, app.game),
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
			reduced = !!app.menu?.reduced,
			end = f.duration - 0.5;
		canvas.width = 1920;
		canvas.height = 800;
		c.scale(2, 2);
		// The film's clock runs only while the window is in front (0.171.14): the sound waits when it is left
		// (sound.suspend), and the picture waits with it.
		let t = 0,
			prev = null,
			last = -1,
			running = false;
		const frame = (now) => {
			if (!canvas.isConnected) return (running = false);
			const dt = prev == null ? 0 : (now - prev) / 1000;
			prev = now;
			if (document.hasFocus() && !document.hidden) t = Math.min(end, t + Math.min(dt, 0.1));
			const shot = f.draw(c, t, reduced);
			if (shot.scene !== last) {
				caption.textContent = shot.caption;
				last = shot.scene;
			}
			if (t < end) requestAnimationFrame(frame);
			else running = false;
		};
		const play = (again) => {
			t = 0;
			prev = null;
			last = -1;
			if (!running) {
				running = true;
				requestAnimationFrame(frame);
			}
			// A replay starts the music over too (0.171.14: the mode did not change, and the replay was silent).
			if (again) sound.restartMusic("intro");
		};
		wrap.querySelector("button").onclick = () => play(true);
		play(false);
		sound.setMusicMode("intro");
	}
	function showChoice() {
		app.choiceOpen = true;
		app.paused = true;
		$("overlay").hidden = false;
		$("overlay").innerHTML =
			`<div class="briefing act2-choice"><span class="eyebrow">DECYZJA DOWÓDCY / SERCE POPIOŁU</span><h2>Zniszczyć<br>czy odłączyć?</h2><p>Węzły sterujące są w Twoich rękach. Tej decyzji nie można cofnąć; zmienia przebieg misji, premię i epilog.</p><button id="choose-destroy" class="primary-button"><b>ZNISZCZ INSTALACJĘ</b><small>Przeciążenie za 20 s niszczy wszystko w promieniu 380. Wieże Dominium tracą 50% PW, odzysk 400 metalu. Cel dodatkowy: bez strat od wybuchu.</small></button><button id="choose-evacuate" class="primary-button"><b>ODŁĄCZ I EWAKUUJ PERSONEL</b><small>Sześcioro techników musi dotrzeć na lądowisko — co najmniej czworo. Pajęczaki wpadną w szał. Premia: plany od techników — pancerz kompozytowy (gdy już go masz: broń plazmowa, a gdy i ją — 300 metalu). Cel dodatkowy: ocal wszystkich.</small></button></div>`;
		for (const kind of ["destroy", "evacuate"])
			$("choose-" + kind).onclick = () => {
				app.game.act2Choose(kind);
				app.choiceOpen = false;
				$("overlay").hidden = true;
				app.paused = false;
				hud.updateHud();
			};
		$("choose-destroy").focus();
	}
	// A story decision of the campaign (campaign-choices.js): two options, the game paused until one is taken.
	function showDecision() {
		const D = app.game.campaignDecisionInfo();
		if (!D) return;
		app.choiceOpen = true;
		app.paused = true;
		$("overlay").hidden = false;
		const keys = Object.keys(D.options);
		$("overlay").innerHTML = `<div class="briefing act2-choice"><span class="eyebrow">${D.eyebrow}</span><h2>${D.title}</h2><p>${D.prompt} Tej decyzji nie można cofnąć.</p>${keys.map((k) => `<button id="decide-${k}" class="primary-button"><b>${D.options[k].label}</b><small>${D.options[k].text}</small></button>`).join("")}</div>`;
		for (const k of keys)
			$("decide-" + k).onclick = () => {
				app.game.decideCampaign(k);
				app.choiceOpen = false;
				$("overlay").hidden = true;
				app.paused = false;
				hud.updateHud();
			};
		$("decide-" + keys[0]).focus();
	}
	function renderAct2Objectives() {
		const speakers = RTS.ACT2_SPEAKERS,
			line = app.game.act2.radio.at(-1),
			key = JSON.stringify([
				app.game.act2Objectives(),
				line,
				app.game.missionId === "colony5" && app.game.convoyStatus(),
			]);
		if (key === app.act2Signature) return;
		app.act2Signature = key;
		$("campaign-objectives").innerHTML =
			`<ul class="act2-objectives">${app.game
				.act2Objectives()
				.map(
					(o) =>
						`<li class="${o.done ? "done" : o.failed ? "failed" : ""}${o.secondary ? " secondary" : ""}">${o.text}</li>`,
				)
				.join("")}</ul>` +
			(app.game.missionId === "colony5"
				? `<p class="act2-status">${app.game.convoyStatus()}</p>`
				: "") +
			(line
				? `<p class="act2-line">${typeof Portraits !== "undefined" && Portraits.known(line.who) ? `<img class="act2-face" src="${Portraits.still(line.who, 34)}" alt="">` : ""}<b style="color:${speakers[line.who]?.color || "#c5d7d9"}">${speakers[line.who]?.name || line.who}:</b> ${line.text}</p>`
				: "");
	}
	function act2Report(victory) {
		const r = app.game.act2Summary(),
			speakers = RTS.ACT2_SPEAKERS;
		return `<ul class="act2-objectives">${r.objectives.map((o) => `<li class="${o.done ? "done" : o.failed ? "failed" : ""}${o.secondary ? " secondary" : ""}">${o.text}</li>`).join("")}</ul><div class="briefing-controls act2-summary"><span><b>${timeLabel(r.time)}</b>Czas operacji</span><span><b>${r.kills}</b>Zniszczonych celów</span><span><b>${r.losses}</b>Utraconych jednostek</span><span><b>${Math.round(r.lostValue)}</b>Metalu w stratach</span><span><b>${r.secondary ? "◆ zdobyta" : "—"}</b>Odznaka celu dodatkowego</span><span><b>${r.bonus === 200 ? "+200 metalu" : r.bonus === "salvage" ? "odzysk 400 metalu" : r.bonus === "armor" ? "pancerz kompozytowy" : r.bonus === "weapons" ? "broń plazmowa" : r.bonus === "metal" ? "300 metalu" : "—"}</b>Premia</span></div>${victory && r.secondary && !["colony6", "colony9", "colony14"].includes(app.game.missionId) ? "<p>Odznaka da +200 metalu na start następnego rozdziału.</p>" : ""}`;
	}
	// Inwazja (G2): the orbit is decided — who holds it and with how many drop pods; then the landing.
	function showInvasionLanding() {
		const I = app.game.invasion,
			C = I.carry,
			mine = C.owner === (app.game.viewer ?? 0),
			target = MISSIONS[I.target] || {},
			how = I.decided === "time" ? "Po 8 minutach walki o orbitę zdecydowała siła flot i stacji." : mine ? "Stacja dowodzenia wroga na orbicie zniszczona." : "Twoja stacja dowodzenia na orbicie zniszczona.";
		$("overlay").hidden = false;
		$("overlay").innerHTML = `<div class="briefing invasion-landing ${mine ? "victory" : "defeat"}"><span class="eyebrow">INWAZJA · FAZA 1 ZAKOŃCZONA / ${timeLabel(app.game.time)}</span><div class="briefing-symbol">${mine ? "◈" : "⌁"}</div><h2>${mine ? "Orbita zdobyta." : "Orbita utracona."}</h2><p>${how} ${mine ? `Twoja flota osłania ${C.pods} kapsuł desantowych; na planecie masz też uderzenie z orbity i skan orbitalny.` : `Wróg ma ${C.pods} kapsuł desantowych, uderzenie z orbity i skan — buduj baterie przeciwlotnicze, by zestrzeliwać kapsuły.`}</p><div class="briefing-controls"><span><b>${C.mine}</b>Twoje siły na orbicie</span><span><b>${C.theirs}</b>Siły wroga na orbicie</span><span><b>${C.pods}</b>Kapsuły ${mine ? "Twoje" : "wroga"}</span></div><button id="invasion-land" class="primary-button">LĄDOWANIE — ${(target.name || "").toUpperCase()} <span>↓</span></button><button id="end-menu" class="primary-button end-secondary">MENU GŁÓWNE <span>↗</span></button></div>`;
		$("invasion-land").onclick = () => {
			$("overlay").hidden = true;
			launchWithScreen(I.target, { ...app.game.scenario, mode: "invasion", invasion: { phase: "ground", owner: C.owner, pods: C.pods, from: app.game.missionId } });
		};
		$("end-menu").onclick = () => {
			app.started = false;
			app.menu.show("home");
		};
	}
	function showEnd() {
		const victory = (app.game.resultFor?.() ?? app.game.result) === "victory";
		if (app.netSession) return network.networkEnd(victory);
		// (A campaign chapter in orbit ends with its report; its pods go to the next chapter.)
		if (app.game.invasion?.phase === "orbit" && app.game.invasionResult?.() && !MISSIONS[app.game.missionId].campaign) return showInvasionLanding();
		// Survival keeps the best time per map and level.
		let modeText = app.game.modeResult?.() || null;
		if (modeText && app.game.modeState?.mode === "survival" && RTS.recordSurvival) {
			const r = RTS.recordSurvival(app.audioStorage, app.game);
			modeText += r.isNew ? " Nowy rekord!" : ` Rekord: ${timeLabel(r.best.time)}, fala ${r.best.wave}.`;
		}
		const campaignSaved =
			MISSIONS[app.game.missionId].campaign && victory
				? campaign.record(app.game)
				: true;
		saveGame(true);
		$("overlay").hidden = false;
		if (app.game.act2) {
			$("overlay").innerHTML =
				`<div class="briefing act2-report"><span class="eyebrow">RAPORT Z OPERACJI / ${MISSIONS[app.game.missionId].name}</span><div class="briefing-symbol">${victory ? "◈" : "⌁"}</div><h2>${victory ? (app.game.missionId === "colony6" ? "Koniec aktu II." : app.game.missionId === "colony9" ? "Koniec aktu III." : app.game.missionId === "colony14" ? "Koniec aktu IV." : "Rozdział ukończony.") : "Misja nieudana."}</h2><p>${victory ? app.game.act2Epilogue() + " " + (campaignSaved ? "Postęp kampanii zapisano." : "Nie można zapisać postępu kampanii na tym urządzeniu.") : app.game.act2.failReason || "Centrum dowodzenia zostało zniszczone. Odbuduj siły i spróbuj ponownie."}</p>${act2Report(victory)}<button id="play-again" class="primary-button">NOWA OPERACJA <span>↗</span></button></div>`;
			if (!victory) {
				const retry = document.createElement("button");
				retry.className = "primary-button";
				retry.textContent = "SPRÓBUJ PONOWNIE →";
				retry.onclick = () => {
					app.menu.selectedMission = app.game.missionId;
					app.menu.missionOrigin = "campaign";
					app.menu.show("briefing");
				};
				$("overlay").querySelector(".briefing").append(retry);
			}
		} else
			$("overlay").innerHTML =
				`<div class="briefing"><span class="eyebrow">RAPORT Z OPERACJI / ${timeLabel(app.game.time)}</span><div class="briefing-symbol">${victory ? "◈" : "⌁"}</div><h2>${victory ? "Sektor odzyskany." : "Utraciliśmy przyczółek."}</h2><p>${victory ? (MISSIONS[app.game.missionId].campaign ? { training: "Poligon zaliczony. Załoga potrafi rozwijać kolonię, podtrzymać sieć i naprawić pojazdy. ", colony1: "Latarnia Eos znów nadaje. Lira odczytała współrzędne archiwum na Vesperze. Konwój wyrusza po klucz do sieci. ", colony2: "Archiwum ujawniło plan blokady. Klucz jest bezpieczny; teraz flota może dotrzeć do centralnego węzła na Nadirze. ", colony3: "Węzeł Nadir odzyskany. Lira uruchamia sieć, latarnie rozbłyskują jedna po drugiej, a transporty pomocy ruszają ku Koloniom. Nadszedł Odzyskany Świt. " }[app.game.missionId] + (campaignSaved ? "Postęp kampanii zapisano." : "Nie można zapisać postępu kampanii na tym urządzeniu.") : modeText || "Operacja " + MISSIONS[app.game.missionId].name + " zakończona zwycięstwem.") : modeText || "Centrum dowodzenia zostało zniszczone. Odbuduj siły i spróbuj ponownie."}</p><div class="briefing-controls"><span><b>${timeLabel(app.game.time)}</b>Czas operacji</span><span><b>${app.game.kills}</b>Zniszczonych celów</span><span><b>${app.game.nodes.filter((n) => n.owner === (app.game.viewer ?? 0)).length} / ${app.game.nodes.length}</b>Przekaźników pod kontrolą</span><span><b>${Math.round(app.game.mined || 0)}</b>Wydobytego metalu</span><span><b>${app.game.units(app.game.viewer ?? 0).filter((e) => e.type !== "worker").length}</b>Jednostek na koniec</span></div><button id="play-again" class="primary-button">NOWA OPERACJA <span>↗</span></button></div>`;
		// The end of an act: its epilogue film over the report.
		if (victory && typeof Epilogues !== "undefined" && Epilogues.has(app.game.missionId)) showEpilogue();
		decorateEnd(victory);
		const nextChapter = {
			training: "colony1",
			colony1: "colony2",
			colony2: "colony3",
			colony3: "colony4",
			colony4: "colony5",
			colony5: "colony6",
			colony9: "colony10",
			colony10: "colony11",
			colony11: "colony12",
			colony12: "colony13",
			colony13: "colony14",
		}[app.game.missionId];
		// The end of the campaign: its finale film (campaign-finale.js), full screen.
		if (victory && app.game.missionId === "colony14" && typeof FinaleFilm !== "undefined") {
			const button = document.createElement("button");
			button.className = "primary-button";
			button.textContent = "FINAŁ KAMPANII ▶";
			button.onclick = () => {
				app.started = false;
				app.menu.afterFinale = "campaign";
				app.menu.show("finale");
			};
			$("overlay").querySelector(".briefing").append(button);
		}
		if (victory && MISSIONS[app.game.missionId].campaign && nextChapter) {
			const button = document.createElement("button");
			button.className = "primary-button";
			button.textContent =
				nextChapter === "colony4"
					? "AKT II: CENA ŚWITU →"
					: nextChapter === "colony10"
						? "AKT IV: INWAZJA →"
						: "NASTĘPNY ROZDZIAŁ →";
			button.onclick = () => {
				app.menu.selectedMission = nextChapter;
				app.menu.missionOrigin = "campaign";
				if (nextChapter === "colony4" && !campaign.completed.colony4) {
					app.menu.afterIntro2 = "briefing";
					app.menu.act2IntroSeen = true;
					app.menu.show("intro2");
				} else if (nextChapter === "colony10" && !campaign.completed.colony10 && typeof Act4Film !== "undefined") {
					app.menu.afterIntro4 = "briefing";
					app.menu.act4IntroSeen = true;
					app.menu.show("intro4");
				} else app.menu.show("briefing");
			};
			$("overlay").querySelector(".briefing").append(button);
		}
		$("play-again").onclick = () => {
			app.menu.origin = "home";
			app.menu.show("single");
		};
		$("overlay")
			.querySelector(".briefing")
			.insertAdjacentHTML(
				"beforeend",
				'<button id="end-menu" class="resume-button">MENU GŁÓWNE</button>',
			);
		$("end-menu").onclick = () => {
			saveGame(true);
			app.started = false;
			app.menu.show("home");
		};
	}
	return {
		decorateEnd,
		showChoice,
		showDecision,
		renderAct2Objectives,
		showEnd,
	};
}
