/* Act IV "Inwazja" (H1–H2, 0.156): chapters X–XIV against the Admiralty of the Dominium (Adm. Selen Vok) — and a
   third force from outside, the Watchers of the Abyss (watchers-rules.js). Built like act III (campaign-act3.js):
   the scenario machinery (commander AI, modes, factions, the Inwazja of invasion-rules.js) with the act II
   interface — radio lines, objectives with a secondary badge, the badge bonus, an epilogue line.
   - X · Blokada Eos: the orbit phase of an Inwazja (Orbita Kharona), 10 minutes; the player's flagship carrier;
     the pods the surviving fleet makes are kept in the campaign progress (campaignCarry → CampaignProgress.carry).
   - XI · Kapsuły nad Eos: the ground phase on Cichy Horyzont with the player holding the orbit — the pods from
     X, the strike and the scan; the Admiralty raises flak; a bridgehead of two relays first, then its base; in the
     middle of the battle rifts open and Watchers' scouts strike both sides.
   - XII–XIV: drafts (playable conquests on their maps) — their own mechanics come with H4–H6.
   The decision of chapter VIII (trust / distance towards Varn) changes X and XI. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.act4Installed) return;
		RTS.act4Installed = true;
		const { Game, TYPES, MISSIONS, dist } = RTS;

		Object.assign(RTS.ACT2_SPEAKERS, {
			vok: { name: "Adm. Selen Vok", role: "Admiralicja Dominium", color: "#ff8f7a" },
			gate: { name: "Głos Bramy", role: "Sygnał nieznany", color: "#7fe9ff" },
		});

		const CHAPTERS = (RTS.ACT4 = {
			colony10: {
				map: "orbit",
				mission: {
					name: "X · Blokada Eos",
					planet: "Eos — orbita",
					requires: "colony9",
					description:
						"Admiralicja Dominium nie uznała rozejmu Varna. Flota adm. Selen Vok zamknęła orbitę Eos i odcięła Kolonie od pogranicza. Przełam blokadę — z ocalałej floty powstaną kapsuły desantowe dla lądowania na Eos.",
					objective: "Zniszcz stację blokady albo miej silniejszą flotę i stacje po 10 minutach. Dodatkowo: nie strać lotniskowca.",
					facts: ["Start: flota Kolonii z lotniskowcem · przeciwnik: Admiralicja", "900 metalu · 10 minut na orbitę<br>Ocalała flota = kapsuły w rozdziale XI"],
					lesson: "Bitwa o orbitę — pierwsza faza Inwazji",
				},
				scenario: { mode: "conquest", difficulty: "normal", players: 2 },
				credits: 900,
				orbitTime: 600,
			},
			colony11: {
				map: "horizon",
				mission: {
					name: "XI · Kapsuły nad Eos",
					planet: "Eos — Cichy Horyzont",
					requires: "colony10",
					description:
						"Orbita należy do Kolonii. Czas zejść na powierzchnię: Admiralicja okopała się na Cichym Horyzoncie i stawia baterie przeciwlotnicze. Kapsuły z floty, uderzenie i skan z orbity — reszta zależy od Ciebie. Artefakt pod piaskiem znów zaczął odpowiadać.",
					objective: "Załóż przyczółek (2 przekaźniki), potem zniszcz bazę Admiralicji. Dodatkowo: najwyżej 1 zestrzelona kapsuła.",
					facts: ["Start: Kolonia · orbita Twoja · przeciwnik: Admiralicja", "1000 metalu · kapsuły z rozdziału X<br>Baterie przeciwlotnicze zestrzeliwują kapsuły"],
					lesson: "Desant z orbity, uderzenie i skan orbitalny",
				},
				scenario: { mode: "invasion", difficulty: "normal", players: 2 },
				credits: 1000,
				// Rifts of the Watchers: when, and the scouts that come through.
				rifts: [
					{ at: 420, units: ["spark", "spark", "prism", "spark"] },
					{ at: 840, units: ["spark", "spark", "prism", "arc", "warden"] },
				],
			},
			colony12: {
				map: "ember",
				draft: true,
				mission: {
					name: "XII · Twierdza Admiralicji",
					planet: "Nadir — Popielny Szlak",
					requires: "colony11",
					description:
						"Admiralicja wycofała się do twierdzy na Popielnym Szlaku. W ruinach pod popiołem budzą się kolejne szczeliny — Wartownicy szukają artefaktów, a każdy, kto je trzyma, jest dla nich celem.",
					objective: "Zniszcz twierdzę Admiralicji. Dodatkowo: zwycięż przed 25. minutą.",
					facts: ["Start: Kolonia · przeciwnik: Admiralicja", "1200 metalu · wersja robocza rozdziału<br>Konwój, decyzja i Wartownicy — w kolejnym kroku"],
					lesson: "Szturm na umocnioną bazę",
				},
				scenario: { mode: "conquest", difficulty: "normal", players: 2 },
				credits: 1200,
				secondaryTime: 1500,
			},
			colony13: {
				map: "glacis",
				draft: true,
				mission: {
					name: "XIII · Ostatnia orbita",
					planet: "Nivalis — Pierścienie Glacjalis",
					requires: "colony12",
					description:
						"Vok zebrała resztę floty w pierścieniach Glacjalis. Teraz to ona trzyma orbitę — a w samym środku bitwy otwierają się szczeliny.",
					objective: "Zniszcz okręt flagowy i stację Admiralicji. Dodatkowo: zwycięż przed 20. minutą.",
					facts: ["Start: flota Kolonii · przeciwnik: Admiralicja", "1100 metalu · wersja robocza rozdziału<br>Odwrócona inwazja i decyzja — w kolejnym kroku"],
					lesson: "Bitwa flot w pierścieniach",
				},
				scenario: { mode: "conquest", difficulty: "normal", players: 2 },
				credits: 1100,
				secondaryTime: 1200,
			},
			colony14: {
				map: "abyss",
				draft: true,
				enemy: "watchers",
				mission: {
					name: "XIV · Brama",
					planet: "Erebus — czarna dziura",
					requires: "colony13",
					description:
						"Szczeliny prowadzą w jedno miejsce: do Bramy przy horyzoncie zdarzeń czarnej dziury Erebus. Stąd przychodzą Wartownicy — i tu trzeba ich zatrzymać.",
					objective: "Zniszcz Rdzeń Wartowników. Dodatkowo: zwycięż przed 25. minutą.",
					facts: ["Start: flota Kolonii · przeciwnik: Wartownicy Otchłani", "1300 metalu · wersja robocza rozdziału<br>Szczeliny, Brama i epilog — w kolejnym kroku"],
					lesson: "Starcie z Wartownikami",
				},
				scenario: { mode: "conquest", difficulty: "normal", players: 2 },
				credits: 1300,
				secondaryTime: 1500,
			},
		});
		const isAct4 = (id) => Object.hasOwn(CHAPTERS, id);
		RTS.isAct4 = isAct4;

		// Missions on the terrain (and, in space, the look) of scenario maps.
		for (const [id, ch] of Object.entries(CHAPTERS)) {
			const look = MISSIONS[ch.map];
			MISSIONS[id] = { ...look, objective: undefined, ...ch.mission, campaign: true, act: 4 };
			if (RTS.FRONTIER_MAPS?.[ch.map]) RTS.FRONTIER_MAPS[id] = RTS.FRONTIER_MAPS[ch.map];
			if (RTS.THEMED_LAYOUTS?.[ch.map]) RTS.THEMED_LAYOUTS[id] = RTS.THEMED_LAYOUTS[ch.map];
		}
		// Campaign events (campaign-events.js) on the ground chapters.
		if (RTS.CAMPAIGN_EVENTS) {
			RTS.CAMPAIGN_EVENTS.colony11 = { diversion: "ai", reinforce: true };
			RTS.CAMPAIGN_EVENTS.colony12 = { intel: true, retake: "ai", diversion: "ai", reinforce: true, saboteurs: true };
		}

		// Varn after the decision of chapter VIII: an ally in the field (trust) or a neutral neighbour (distance).
		const VARN = (RTS.ACT4_VARN = {
			trust: {
				name: "Varn po naszej stronie",
				summary: "Zaufanie z rozdziału VIII procentuje: w rozdziale X dołącza do Ciebie fregata Varna, a w XI jego zwiadowcy dają jedną kapsułę desantową więcej.",
				radio: {
					colony10: ["varn", "Admiralicja nazywa mnie zdrajcą. Niech więc zdrajca przyśle wam fregatę — jest już w drodze."],
					colony11: ["varn", "Moi zwiadowcy oznaczyli lądowiska. Macie jedną kapsułę więcej — wykorzystajcie ją."],
				},
			},
			distance: {
				name: "Varn z daleka",
				summary: "Dystans z rozdziału VIII: Varn nie miesza się do wojny z Admiralicją. Kolonie liczą na własne zapasy — 250 metalu więcej w rozdziale X i 300 w XI.",
				radio: {
					colony10: ["lira", "Varn milczy — trzyma się z dala od Admiralicji. Mamy własne zapasy: 250 metalu więcej."],
					colony11: ["lira", "Bez Varna liczymy na siebie. Z magazynów floty: 300 metalu na start."],
				},
			},
		});

		const OPENING = {
			colony10: [
				["vok", "Tu admirał Selen Vok. Orbita Eos jest zamknięta. Rozejm Varna nic nie znaczy — zdrajca nie podpisuje się w imieniu Dominium."],
				["lira", "Ich stacja blokady trzyma całą orbitę. Zniszczmy ją albo wytrzymajmy dziesięć minut — i nie dajmy zatopić lotniskowca."],
			],
			colony11: [
				["lira", "Kapsuły gotowe. Najpierw przyczółek: dwa przekaźniki. Potem baza Admiralicji."],
				["vok", "Każda kapsuła, która spadnie na Eos, spłonie w powietrzu. Baterie już stoją."],
			],
			colony12: [
				["lira", "Twierdza Admiralicji na Popielnym Szlaku. Zdobądźmy ją, zanim Vok zbierze resztę floty."],
				["vok", "Popiół zatrzyma waszą kolumnę. Moje bastiony — resztę."],
			],
			colony13: [
				["vok", "Ostatnia orbita jest moja. Tu skończy się wasza inwazja."],
				["lira", "Jej okręt flagowy stoi przy stacji w pierścieniach. Uderzmy, zanim szczeliny się otworzą."],
			],
			colony14: [
				["gate", "…OGRÓD MILCZY… WY GO UCISZYLIŚCIE… BRAMA OTWARTA…"],
				["lira", "To tutaj. Rdzeń Wartowników przy horyzoncie zdarzeń — zniszczmy go, zanim przejdzie ich więcej."],
			],
		};
		const near = (g, team, type, angle, distance) => {
			const hq = g.hq(team);
			if (!hq) return null;
			for (let r = distance; r < distance + 300; r += 26)
				for (let k = 0; k < 10; k++) {
					const a = angle + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.35,
						p = { x: hq.x + Math.cos(a) * r, y: hq.y + Math.sin(a) * r },
						rad = TYPES[type].radius;
					if (p.x > 60 && p.y > 60 && p.x < g.W - 60 && p.y < g.H - 60 && !g.blocked(p.x, p.y, rad + 6) && g.entities.every((e) => e.hp <= 0 || dist(e, p) > TYPES[e.type].radius + rad + 10)) return g.spawn(type, team, p.x, p.y);
				}
			return null;
		};
		const toward = (g, team) => {
			const hq = g.hq(team);
			return hq ? Math.atan2(g.H / 2 - hq.y, g.W / 2 - hq.x) : 0;
		};
		// Radio triggers: [id, condition, speaker, line], each played once.
		const TRIGGERS = {
			colony10: [
				["contact", (g) => g.entities.some((e) => e.team === 1 && TYPES[e.type].ship && g.isVisible(e.x, e.y)), "vok", "Widzę wasze kadłuby. Eskadry — ognia."],
				["signal", (g) => g.time >= 180, "gate", "…OGRÓD ZAMILKŁ… KTO GO UCISZYŁ…"],
				["signal2", (g) => g.time >= 186, "lira", "Artefakt na orbicie odpowiada na jakiś sygnał… To nie Rój. To coś innego."],
				["half", (g) => g.time >= 300, "lira", "Połowa czasu. Jeśli stacja nie padnie, policzy się, kto ma silniejszą flotę."],
				["flagship", (g) => { const f = g.get(g.act4?.flagship); return !!f && f.hp < f.maxHp * 0.5; }, "lira", "Lotniskowiec obrywa! Osłoń go albo wycofaj za asteroidy."],
				["late", (g) => g.time >= 480, "lira", "Dwie minuty do rozstrzygnięcia orbity."],
			],
			colony11: [
				["bridgehead", (g) => g.act4?.bridgehead, "lira", "Przyczółek stoi — dwa przekaźniki nasze. Teraz baza Admiralicji."],
				["flak", (g) => g.entities.some((e) => e.team === 1 && e.type === "flak" && e.hp > 0 && !e.constructionLeft && g.isVisible(e.x, e.y)), "lira", "Bateria przeciwlotnicza! Omijaj ją kapsułami albo zniszcz uderzeniem z orbity."],
				["shot", (g) => (g.act4?.podsShot || 0) >= 1, "vok", "Pierwsza kapsuła płonie. Następne też spłoną."],
			],
			colony12: [],
			colony13: [],
			colony14: [],
		};

		const old = {};
		for (const k of ["configureMission", "factionFor", "sideName", "applyDamage", "tick", "landPod", "campaignReady", "serialize", "act2Objectives", "act2Secondary", "act2Status", "act2Epilogue", "act2Summary", "applyAct2Bonus", "applyCampaignChoices"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;

		Object.assign(Game.prototype, {
			isAct4() {
				return isAct4(this.missionId) && !!this.act2;
			},
			configureMission() {
				old.configureMission.call(this);
				if (isAct4(this.missionId)) this.setupAct4();
			},
			setupAct4() {
				const id = this.missionId,
					ch = CHAPTERS[id],
					input = { faction: "colonies", enemyFaction: ch.enemy || "dominion", enemy: "commander", seed: 0, ...ch.scenario };
				if (id === "colony10") input.invasion = { phase: "orbit", target: "colony11" };
				if (id === "colony11") input.invasion = { phase: "ground", owner: 0, pods: RTS.INVASION.minPods + 2, from: "colony10" };
				this.act4 = { podsShot: 0, bridgehead: false, rifts: 0, watchers: false, flagship: null };
				this.configureSkirmish(input);
				this.upgrades.colony = true;
				this.credits = ch.credits;
				if (id === "colony10") {
					if (this.invasion) this.invasion.ends = ch.orbitTime;
					// The flagship: a carrier of the Colonies — and the Admiralty's own.
					const mine = near(this, 0, "carrier", toward(this, 0), 170);
					if (mine) this.act4.flagship = mine.id;
					near(this, 1, "carrier", toward(this, 1), 170);
				}
				this.act2 = { mission: id, radio: [], losses: 0, lostValue: 0, bonus: 0, failReason: null, heard: {} };
				for (const [who, text] of OPENING[id]) this.say(who, text, false);
				this.explored.fill(0);
				this.updateVision();
			},
			// The pods X leaves for XI (kept in the campaign progress).
			campaignCarry() {
				if (this.missionId !== "colony10" || this.result !== "victory") return null;
				const C = this.invasionResult?.();
				return C && C.owner === 0 ? { pods: C.pods } : null;
			},
			// XI: the pods carried over from X (at the start of the chapter, once).
			applyCampaignCarry(carry = {}) {
				if (!this.isAct4() || this.missionId !== "colony11" || this.act4.carried || this.time > 1) return null;
				this.act4.carried = true;
				const pods = Number(carry.colony10?.pods);
				if (!Number.isInteger(pods) || !this.invasion?.pods) return null;
				this.invasion.pods[0] = Math.max(RTS.INVASION.minPods, Math.min(RTS.INVASION.maxPods, pods));
				this.say("lira", `Flota z blokady Eos daje nam ${this.invasion.pods[0]} kapsuł desantowych.`, false);
				return this.invasion.pods[0];
			},
			// The decision of chapter VIII in X and XI.
			applyCampaignChoices(choices = {}) {
				const r = old.applyCampaignChoices.call(this, choices);
				if (!this.isAct4() || this.act4.varn || this.time > 1) return r;
				const key = choices.colony8,
					V = VARN[key],
					line = V?.radio[this.missionId];
				if (!line) return r;
				this.act4.varn = key;
				if (key === "trust") {
					if (this.missionId === "colony10") near(this, 0, "frigate", toward(this, 0) + 0.6, 150);
					if (this.missionId === "colony11" && this.invasion?.pods) this.invasion.pods[0] = Math.min(RTS.INVASION.maxPods, (this.invasion.pods[0] || 0) + 1);
				} else this.credits += this.missionId === "colony10" ? 250 : 300;
				this.say(line[0], line[1], false);
				return key;
			},
			// The Admiralty, and the Watchers coming through the rifts (team 4 in XI).
			factionFor(team) {
				if (team === 4 && this.act4?.watchers && RTS.FACTIONS.watchers) return { key: "watchers", ...RTS.FACTIONS.watchers };
				return old.factionFor.call(this, team);
			},
			sideName(team) {
				if (this.isAct4?.() && team !== this.me) {
					if (team === 1 && CHAPTERS[this.missionId].enemy !== "watchers") return "Admiralicja";
					if (team === 4 && this.act4.watchers) return "Wartownicy";
				}
				return old.sideName.call(this, team);
			},
			applyDamage(a, b, n) {
				const alive = b.hp > 0;
				const r = old.applyDamage.call(this, a, b, n);
				if (this.isAct4() && alive && b.hp <= 0 && b.team === 0 && TYPES[b.type].speed) {
					this.act2.losses++;
					this.act2.lostValue += TYPES[b.type].cost || 0;
				}
				return r;
			},
			// XI: a pod of the player shot down by the Admiralty's defences.
			landPod(d) {
				const units = old.landPod.call(this, d);
				if (this.isAct4() && d.team === 0 && !units.length) this.act4.podsShot++;
				return units;
			},
			// A rift of the Watchers: a flash of light and scouts going for both sides' nearest buildings.
			openRift(list) {
				const relays = [...this.nodes].sort((a, b) => dist(a, { x: this.W / 2, y: this.H / 2 }) - dist(b, { x: this.W / 2, y: this.H / 2 })),
					at = relays[this.act4.rifts % Math.max(1, relays.length)] || { x: this.W / 2, y: this.H / 2 };
				this.act4.watchers = true;
				this.act4.rifts++;
				this.fx("rift", at.x, at.y, { merge: true });
				const extra = this.campaignLevel === "hard" ? ["arc"] : [];
				[...list, ...extra].forEach((type, i) => {
					if (!TYPES[type]) return;
					const a = (i / (list.length + extra.length)) * Math.PI * 2,
						p = { x: at.x + Math.cos(a) * 60, y: at.y + Math.sin(a) * 60 };
					const e = this.spawn(type, 4, p.x, p.y);
					e.modeTagged = true;
					const side = i % 2 ? 1 : 0,
						goal = this.entities.filter((o) => o.team === side && o.hp > 0 && !TYPES[o.type].speed).sort((p1, p2) => dist(p1, e) - dist(p2, e))[0];
					if (goal) {
						e.order = { kind: "attackMove", x: goal.x, y: goal.y };
						e.path = this.pathTo(e, goal);
					}
				});
			},
			tick(dt) {
				old.tick.call(this, dt);
				if (!this.isAct4()) return;
				const s = this.act2,
					A = this.act4,
					ch = CHAPTERS[this.missionId];
				if (Math.floor(this.time) === Math.floor(this.time - dt)) return;
				if (this.missionId === "colony11" && !this.result) {
					if (!A.bridgehead && this.nodes.filter((n) => n.owner === 0).length >= 2) A.bridgehead = true;
					const rift = ch.rifts[A.rifts];
					if (rift && this.time >= rift.at) {
						this.openRift(rift.units);
						if (A.rifts === 1) {
							this.say("gate", "…KTO TRZYMA LATARNIE… TEN ODPOWIE…");
							this.say("lira", "Szczelina przy przekaźniku! Nieznane maszyny — strzelają do nas i do Admiralicji!");
						} else this.say("gate", "…OGRÓD ZGASŁ… SPRAWDZIMY KAŻDEGO…");
					}
					// Victory waits for the bridgehead (the enemy base may fall first).
					if (A.bridgehead && !this.enemyBases().length && this.hq(0)) {
						this.result = "victory";
						this.notify(MISSIONS[this.missionId].name + " — misja ukończona.", "victory");
					}
				}
				for (const [id, when, who, text] of TRIGGERS[this.missionId])
					if (!s.heard[id] && when(this)) {
						s.heard[id] = true;
						this.say(who, text);
					}
				if (this.result === "defeat" && !s.failReason && this.missionId === "colony10" && this.invasion?.decided === "time")
					s.failReason = "Po 10 minutach flota Admiralicji przeważyła — orbita Eos utracona. Zbuduj silniejszą flotę i spróbuj ponownie.";
			},
			campaignReady() {
				if (!this.isAct4()) return old.campaignReady.call(this);
				if (this.missionId === "colony11") return this.act4.bridgehead && !this.enemyBases().length;
				return !this.enemyBases().length;
			},
			act2Objectives() {
				if (!this.isAct4()) return old.act2Objectives.call(this);
				const ch = CHAPTERS[this.missionId],
					won = this.result === "victory",
					A = this.act4;
				if (this.missionId === "colony10") {
					const left = Math.max(0, (this.invasion?.ends ?? ch.orbitTime) - this.time),
						f = A.flagship != null ? this.get(A.flagship) : null,
						alive = !!f && f.hp > 0;
					return [
						{ text: `Przełam blokadę: zniszcz stację albo miej przewagę po 10 min (zostało ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")})`, done: won },
						{ text: "Cel dodatkowy: lotniskowiec przetrwa", secondary: true, done: won && alive, failed: !alive },
					];
				}
				if (this.missionId === "colony11") {
					const held = this.nodes.filter((n) => n.owner === 0).length;
					return [
						{ text: `Załóż przyczółek: utrzymaj 2 przekaźniki (${Math.min(2, held)}/2)`, done: A.bridgehead || won },
						{ text: "Zniszcz bazę Admiralicji", done: won },
						{ text: `Cel dodatkowy: najwyżej 1 zestrzelona kapsuła (${A.podsShot})`, secondary: true, done: won && A.podsShot <= 1, failed: A.podsShot > 1 },
					];
				}
				return [
					{ text: this.missionId === "colony14" ? "Zniszcz Rdzeń Wartowników" : this.missionId === "colony13" ? "Zniszcz stację Admiralicji" : "Zniszcz twierdzę Admiralicji", done: won },
					{ text: `Cel dodatkowy: zwycięż przed ${Math.round(ch.secondaryTime / 60)}. minutą`, secondary: true, done: won && this.time <= ch.secondaryTime, failed: !won && this.time > ch.secondaryTime },
				];
			},
			act2Secondary() {
				if (!this.isAct4()) return old.act2Secondary.call(this);
				return !!this.act2Objectives().find((o) => o.secondary)?.done;
			},
			act2Status() {
				if (!this.isAct4()) return old.act2Status.call(this);
				const next = this.act2Objectives().find((o) => !o.done && !o.secondary);
				return (next ? next.text + "." : "Cele wykonane.") + (this.modeStatus?.() ? " " + this.modeStatus() : "");
			},
			act2Epilogue() {
				if (!this.isAct4()) return old.act2Epilogue.call(this);
				const id = this.missionId;
				if (id === "colony10") {
					const C = this.invasionResult?.();
					return `Stacja blokady milknie, a nad Eos znów przelatują statki Kolonii. Z ocalałej floty powstaje ${C?.pods ?? "kilka"} kapsuł desantowych. Tylko artefakt na orbicie wciąż nadaje — w rytmie, którego nikt nie zna.`;
				}
				if (id === "colony11")
					return "Baza Admiralicji na Cichym Horyzoncie upada. Ale to nie Vok jest największym zmartwieniem: szczeliny przy artefaktach otwierają się na całym pograniczu, a maszyny, które z nich wychodzą, nie odróżniają Kolonii od Dominium. Lira nazywa je Wartownikami.";
				if (id === "colony14") return "Rdzeń Wartowników gaśnie przy horyzoncie zdarzeń. Brama milknie — na razie.";
				return "Admiralicja traci kolejną pozycję. Vok cofa się, a szczeliny wciąż się otwierają.";
			},
			act2Summary() {
				const r = old.act2Summary.call(this);
				return this.isAct4() ? { ...r, objectives: this.act2Objectives(), secondary: this.act2Secondary() } : r;
			},
			applyAct2Bonus(badges = {}) {
				if (!this.isAct4()) return old.applyAct2Bonus.call(this, badges);
				if (this.act2.bonus) return 0;
				const previous = MISSIONS[this.missionId].requires;
				if (!badges[previous]) return 0;
				this.credits += 200;
				this.act2.bonus = 200;
				this.say("lira", "Odznaka z poprzedniego rozdziału: dodatkowe 200 metalu na start.", false);
				return 200;
			},
			serialize() {
				return { ...old.serialize.call(this), act4: this.act4 || null };
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			if (isAct4(g.missionId)) {
				const s = state.act2,
					A = state.act4;
				if (!s || s.mission !== g.missionId || !Array.isArray(s.radio) || s.radio.some((l) => typeof l?.text !== "string" || typeof l?.who !== "string") || ![s.losses, s.lostValue].every(Number.isFinite) || !A || typeof A !== "object" || ![A.podsShot, A.rifts].every(Number.isFinite))
					throw Error("Uszkodzony zapis aktu IV");
				g.act2 = JSON.parse(JSON.stringify(s));
				g.act2.heard ||= {};
				g.act4 = { ...A };
			}
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
