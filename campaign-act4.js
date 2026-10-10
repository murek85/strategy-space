/* Act IV "Inwazja" (H1–H2, 0.156): chapters X–XIV against the Admiralty of the Dominium (Adm. Selen Vok) — and a
   third force from outside, the Watchers of the Abyss (watchers-rules.js). Built like act III (campaign-act3.js):
   the scenario machinery (commander AI, modes, factions, the Inwazja of invasion-rules.js) with the act II
   interface — radio lines, objectives with a secondary badge, the badge bonus, an epilogue line.
   - X · Blokada Eos: the orbit phase of an Inwazja (Orbita Kharona), 10 minutes; the player's flagship carrier;
     the pods the surviving fleet makes are kept in the campaign progress (campaignCarry → CampaignProgress.carry).
   - XI · Kapsuły nad Eos: the ground phase in the Burnt Valley (campaign-maps.js) with the player holding the orbit — the pods from
     X, the strike and the scan; the Admiralty raises flak; a bridgehead of two relays first, then its base; in the
     middle of the battle rifts open and Watchers' scouts strike both sides.
   - XII · Twierdza Admiralicji (H4, 0.157): the Admiralty with a Fortress, a doctrine, extra towers, patrols and
     escorts; a technician to lead to an abandoned uplink station (an ambush half way) — delivered, the station and a
     reactor are the player's; then the Fortress; the Watchers' rifts strike both sides; a decision (campaign-
     choices.js): save Varn's garrison (allies in XIII) or strike the Admiralty's shipyard (a weaker fleet in XIII).
   - XIII · Ostatnia orbita (H5, 0.158): the Inwazja turned round — Vok holds the orbit over the crystal ridges of Nivalis and
     drops her pods, strikes and scans; the player starts with a flak battery; first survive the landing (her pods
     spent, or 10 minutes), then destroy her headquarters; rifts in the middle of the battle; secondary — shoot down
     3 of her pods. A decision when her headquarters is broken: a truce (the chapter is won, her fleet comes to XIV)
     or her rout (fight on; 600 metal in XIV). The decision of XII: Varn's garrison (destroyers, a bastion
     and a second flak battery) or the burnt shipyard (3 pods fewer, a slower strike, a weaker headquarters).
   - XIV · Brama (H6, 0.159): the finale at the black hole Erebus against the Watchers. Three rifts guarded by their
     ships, each sending waves while open; a rift closes when the player's ships hold it (no enemy near) for 20 s.
     The Gate (the Watchers' centre) is shielded while any rift is open. Allies by the decisions: Vok's fleet (truce
     in XIII), Varn's ships (trust in VIII or his garrison saved in XII); 600 metal after her rout. Secondary —
     before the 25th minute. The act's epilogue film (epilogue-films.js) follows the decisions VIII, XII and XIII.
   The decision of chapter VIII (trust / distance towards Varn) changes X and XI.
   Balance (H7, 0.160 — tools/act4-sim.js): every chapter's enemy starts with a garrison by the campaign level (TUNE,
   applied with the level), X's blockade station is sturdier, XI's pods come later and slower (and at most 6 from
   the fleet), XIII's landing is paced by the level, XIV's rifts are guarded by the level and the Gate is sturdier.
   Shared by browser and tests. */
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
				map: "eosdocks",
				mission: {
					name: "X · Blokada Eos",
					planet: "Eos — orbita",
					requires: "colony9",
					description:
						"Admiralicja Dominium nie uznała rozejmu Varna. Flota adm. Selen Vok zamknęła orbitę Eos, zajęła doki naszej stoczni i odcięła Kolonie od pogranicza. Przełam blokadę — z ocalałej floty powstaną kapsuły desantowe dla lądowania na Eos.",
					objective: "Zniszcz stację blokady albo miej silniejszą flotę i stacje po 10 minutach. Dodatkowo: nie strać lotniskowca.",
					facts: ["Start: flota Kolonii z lotniskowcem · przeciwnik: Admiralicja", "900 metalu · 10 minut na orbitę<br>Ocalała flota = kapsuły w rozdziale XI"],
					lesson: "Bitwa o orbitę — pierwsza faza Inwazji",
				},
				scenario: { mode: "conquest", difficulty: "normal", players: 2 },
				credits: 900,
				orbitTime: 600,
			},
			colony11: {
				map: "ashvalley",
				mission: {
					name: "XI · Kapsuły nad Eos",
					planet: "Eos — Wypalona Dolina",
					requires: "colony10",
					description:
						"Orbita należy do Kolonii. Czas zejść na powierzchnię: Admiralicja okopała się w Dolinie Latarni — tam, gdzie zaczęła się kampania — i stawia baterie przeciwlotnicze. Kapsuły z floty, uderzenie i skan z orbity — reszta zależy od Ciebie. Artefakt pod piaskiem znów zaczął odpowiadać.",
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
				map: "bastion",
				mission: {
					name: "XII · Twierdza Admiralicji",
					planet: "Nadir — Bastion Admiralicji",
					requires: "colony11",
					description:
						"Admiralicja wycofała się do Twierdzy — bastionu za murem z dwiema bramami na końcu Popielnego Szlaku: wieże, patrole i eskorty. Kolonie zajęły opuszczony bastion po drugiej stronie. Na szlaku stoi opuszczona stacja uplink — technik z Eos uruchomi ją, jeśli dotrze żywy. W ruinach pod popiołem otwierają się szczeliny, a Wartownicy biją we wszystkich.",
					objective: "Doprowadź technika do stacji uplink, potem zdobądź Twierdzę Admiralicji. Dodatkowo: zwycięż przed 25. minutą.",
					facts: ["Start: Kolonia, technik z eskortą · przeciwnik: Admiralicja z Twierdzą", "1200 metalu · zasadzka na szlaku, Wartownicy<br>Decyzja: garnizon Varna czy stocznia Admiralicji"],
					lesson: "Eskorta konwoju i szturm na Twierdzę",
				},
				scenario: { mode: "conquest", difficulty: "normal", players: 2 },
				credits: 1200,
				secondaryTime: 1500,
				// The uplink site: this far along the way from the player's centre to the Fortress.
				uplinkAlong: 0.42,
				deliver: 90,
				ambushAt: 0.5,
				ambush: ["tank", "trooper", "trooper", "rocket"],
				rifts: [
					{ at: 300, units: ["spark", "spark", "prism"] },
					{ at: 720, units: ["spark", "spark", "prism", "arc"] },
					{ at: 1140, units: ["spark", "prism", "arc", "warden"] },
				],
			},
			colony13: {
				map: "crystals",
				mission: {
					name: "XIII · Ostatnia orbita",
					planet: "Nivalis — Kryształowe Grzbiety",
					requires: "colony12",
					description:
						"Vok zebrała resztę floty pod pierścieniami Glacjalis i teraz to ona trzyma orbitę nad Nivalis. Jej kapsuły spadną między Kryształowe Grzbiety, a uderzenia z orbity będą szukać Twoich oddziałów. Przetrwaj desant, potem uderz na jej kwaterę — zanim szczeliny Wartowników otworzą się w środku bitwy.",
					objective: "Przetrwaj desant Admiralicji, potem pokonaj Vok — zniszcz jej kwaterę. Dodatkowo: zestrzel kapsuły Vok (2, na trudnym 3).",
					facts: ["Start: Kolonia z baterią przeciwlotniczą · orbita: Vok", "1200 metalu · kapsuły, uderzenia i skan wroga<br>Decyzja: rozejm z Vok czy jej klęska"],
					lesson: "Obrona przed desantem z orbity i kontratak",
				},
				scenario: { mode: "invasion", difficulty: "normal", players: 2 },
				credits: 1200,
				enemyPods: 8,
				// The landing is over when her pods are spent — or after this long.
				surviveTime: 600,
				// The secondary goal by the level, never more than her pods less one (the burnt shipyard of XII takes 3).
				podsGoal: { easy: 2, normal: 2, hard: 3 },
				rifts: [
					{ at: 330, units: ["spark", "spark", "prism", "arc"] },
					{ at: 690, units: ["spark", "prism", "arc", "warden"] },
				],
			},
			colony14: {
				map: "abyss",
				enemy: "watchers",
				mission: {
					name: "XIV · Brama",
					planet: "Erebus — czarna dziura",
					requires: "colony13",
					description:
						"Wszystkie szczeliny prowadzą w jedno miejsce: do Bramy przy horyzoncie zdarzeń czarnej dziury Erebus. Trzy szczeliny osłaniają ją i wypuszczają kolejne okręty Wartowników. Zamknij je — a potem zniszcz Bramę, zanim przejdzie przez nią więcej maszyn. Kto poleci z Tobą, zależy od decyzji podjętych w tym akcie.",
					objective: "Zamknij trzy szczeliny, potem zniszcz Bramę. Dodatkowo: zwycięż przed 25. minutą.",
					facts: ["Start: flota Kolonii · przeciwnik: Wartownicy Otchłani", "1300 metalu · szczeliny wypuszczają fale<br>Sojusznicy zależą od decyzji VIII, XII i XIII"],
					lesson: "Utrzymanie punktów w kosmosie i finał aktu",
				},
				scenario: { mode: "conquest", difficulty: "normal", players: 2 },
				credits: 1300,
				secondaryTime: 1500,
				// The rifts: where (angle from the Gate towards the player, and how far along the way), guards, waves.
				rifts: null,
				riftSpots: [-0.75, 0, 0.75],
				riftAlong: 0.42,
				seal: { reach: 170, clear: 260, time: 30 },
				wave: { first: 100, every: 120, units: ["corvette", "corvette"], later: ["frigate"], laterAt: 480 },
			},
		});
		const isAct4 = (id) => Object.hasOwn(CHAPTERS, id);
		RTS.isAct4 = isAct4;
		// Balance by the campaign level (H7): the enemy's garrison beside its centre and the chapters' pace.
		const TUNE = (RTS.ACT4_TUNE = {
			colony10: {
				garrison: { easy: ["corvette", "corvette", "frigate"], normal: ["corvette", "corvette", "corvette", "corvette", "frigate", "frigate", "frigate", "frigate", "lancer", "lancer"], hard: ["corvette", "corvette", "corvette", "corvette", "frigate", "frigate", "frigate", "frigate", "lancer", "lancer", "cruiser", "cruiser"] },
				stationHp: 2.2,
			},
			colony11: {
				garrison: { easy: ["tank", "trooper", "trooper", "rocket"], normal: ["tank", "tank", "tank", "tank", "tank", "trooper", "trooper", "trooper", "trooper", "trooper", "trooper", "rocket", "rocket", "rocket", "rocket", "sentinel"], hard: ["heavy", "heavy", "heavy", "tank", "tank", "tank", "tank", "tank", "trooper", "trooper", "trooper", "trooper", "trooper", "trooper", "rocket", "rocket", "rocket", "rocket", "sentinel", "sentinel"] },
				towers: { easy: ["turret", "turret"], normal: ["turret", "turret", "turret", "turret", "flak"], hard: ["turret", "turret", "turret", "turret", "turret", "flak"] },
				stationHp: 2.2,
				drop: { first: 90, every: 55, cap: 6 },
			},
			colony12: {
				// The Fortress's commander keeps a smaller army (it has the towers and the doctrine).
				pace: { interval: 1, attackSize: 1, army: 0.7 },
				doctrine: { hard: "doctrineShields" },
				// The Fortress's towers (besides its own): fewer on the easier levels.
				towers: { easy: ["turret", "flak"], normal: ["turret", "turret", "flak"], hard: ["turret", "turret", "turret", "turret", "flak"] },
				garrison: { easy: ["tank", "trooper", "trooper", "rocket"], normal: ["sentinel", "tank", "trooper", "trooper", "rocket"], hard: ["sentinel", "sentinel", "heavy", "tank", "tank", "trooper", "trooper", "trooper", "rocket", "rocket"] },
			},
			colony13: {
				garrison: { easy: ["trooper", "trooper"], normal: ["tank", "trooper", "rocket"], hard: ["tank", "tank", "trooper", "trooper", "rocket", "rocket"] },
				pods: { easy: 4, normal: 4, hard: 7 },
				// Vok presses from orbit: her commander on the ground attacks less.
				pace: { interval: 1.2, attackSize: 0.85, army: 0.62 },
				firstDrop: 150,
				dropEvery: 100,
				strikeEvery: 180,
				// 0.166.2: a forward headquarters — on easy and normal her commander raises at most two towers and no
				// uplink of its own, and once the landing is over (her fleet spent) the strikes from orbit stop; on hard
				// they go on every 300 s.
				aiTurrets: { easy: 2, normal: 2 },
				strikesAfter: { hard: 300 },
			},
			colony14: {
				guards: { easy: ["corvette", "frigate"], normal: ["corvette", "frigate", "lancer"], hard: ["corvette", "corvette", "frigate", "lancer", "cruiser"] },
				gateHp: 3,
				garrison: { easy: ["frigate", "frigate"], normal: ["frigate", "frigate", "lancer"], hard: ["frigate", "frigate", "frigate", "frigate", "lancer", "lancer", "cruiser", "cruiser"] },
			},
		});
		// The decision of chapter XII (shown and kept by campaign-choices.js): when the uplink works, Varn's garrison
		// calls for help — and the uplink could instead strike the Admiralty's shipyard.
		if (RTS.CAMPAIGN_DECISIONS) {
			RTS.CAMPAIGN_DECISIONS.colony12 = {
				eyebrow: "DECYZJA DOWÓDCY / GARNIZON CZY STOCZNIA",
				title: "Garnizon Varna<br>czy stocznia?",
				prompt: "Uplink działa. Varn wzywa pomocy: jego garnizon na wschodnim grzbiecie otoczyli Wartownicy. Ten sam uplink może jednak uderzyć w stocznię Admiralicji, zanim Vok zwoduje nowe okręty. Decyzja zmienia rozdział XIII.",
				when: (g) => !!g.act4?.uplink,
				radio: ["varn", "Kolonie! Mój garnizon na grzbiecie jest otoczony przez te maszyny. Bez was nie wyjdziemy."],
				affects: ["colony13"],
				options: {
					garrison: {
						label: "RATUJ GARNIZON VARNA",
						text: "Ludzie Varna wychodzą z okrążenia: od razu dołączają 2 niszczyciele i bastion, a w rozdziale XIII Varn przyprowadzi 2 niszczyciele, bastion i drugą baterię przeciwlotniczą.",
						name: "Garnizon ocalony",
						radio: { colony13: ["varn", "Dług za Popielny Szlak spłacam na Nivalis: moi ludzie i bateria przeciwlotnicza są z wami."] },
					},
					shipyard: {
						label: "UDERZ NA STOCZNIĘ",
						text: "Uderzenie z uplinku pali zapasy Admiralicji (500 metalu mniej), a w rozdziale XIII Vok ma 3 kapsuły mniej, wolniejsze uderzenie z orbity i kwaterę o 25% słabszą. Garnizon Varna zostaje sam.",
						name: "Stocznia w ogniu",
						radio: { colony13: ["lira", "Stocznia Admiralicji wciąż płonie — Vok ma mniej kapsuł i jej orbita ładuje się wolniej."] },
					},
				},
			};
			(RTS.CAMPAIGN_DECISION_EFFECTS.colony13 ||= []).push("colony12");
			// The decision of chapter XIII: her headquarters is broken — Vok offers a truce against the Watchers.
			RTS.CAMPAIGN_DECISIONS.colony13 = {
				eyebrow: "DECYZJA DOWÓDCY / ROZEJM Z VOK",
				title: "Rozejm<br>czy klęska?",
				prompt: "Kwatera Vok się sypie. Admirał nadaje na otwartym kanale: wycofa się z Nivalis i poprowadzi swoją flotę przeciw Wartownikom — jeśli Kolonie przerwą ogień. Odmowa oznacza walkę do końca. Decyzja zmienia rozdział XIV i epilog.",
				when: (g) => {
					const hq = g.hq(1);
					return !!hq && hq.hp < hq.maxHp * 0.35;
				},
				radio: ["vok", "Tu Vok. Dość. Mam dla was propozycję — wysłuchajcie jej, zanim strzelicie."],
				affects: ["colony14"],
				options: {
					truce: {
						label: "PRZYJMIJ ROZEJM",
						text: "Vok oddaje Nivalis — rozdział kończy się zwycięstwem. W rozdziale XIV jej flota (2 fregaty i krążownik) walczy po Twojej stronie.",
						name: "Rozejm z Vok",
						radio: { colony14: ["vok", "Admiralicja dotrzymuje słowa. Moje okręty lecą z wami do Bramy."] },
					},
					rout: {
						label: "WALCZ DO KOŃCA",
						text: "Bez rozejmu: zniszcz kwaterę Vok. W rozdziale XIV zaczynasz z 600 metalu więcej z magazynów Admiralicji — sam przeciw Wartownikom.",
						name: "Klęska Admiralicji",
						radio: { colony14: ["lira", "Admiralicja przestała istnieć. Jej magazyny są nasze — ale do Bramy lecimy sami."] },
					},
				},
			};
			(RTS.CAMPAIGN_DECISION_EFFECTS.colony14 ||= []).push("colony13");
		}

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
				["lira", "Technik z Eos uruchomi starą stację uplink na szlaku — doprowadźmy go żywego. Z orbitą łatwiej będzie zdobyć Twierdzę."],
				["vok", "Popiół zatrzyma waszą kolumnę. Moje bastiony i patrole — resztę."],
			],
			colony13: [
				["vok", "Ostatnia orbita jest moja. Tym razem to moje kapsuły spadną na wasze głowy."],
				["lira", "Vok trzyma orbitę nad Nivalis. Bateria przeciwlotnicza stoi — budujmy kolejne i przetrwajmy desant. Potem jej kwatera."],
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
			colony12: [
				["fortress", (g) => { const hq = g.hq(1); return !!hq && g.isVisible(hq.x, hq.y); }, "lira", "Twierdza Admiralicji w zasięgu wzroku. Wieże, bateria przeciwlotnicza i osłony doktryny — nie atakujmy jej bez uplinku."],
				["halfway", (g) => g.act4?.ambushed, "vok", "Konwój na szlaku. Oddział — zatrzymać go."],
				["uplink", (g) => g.act4?.uplink, "lira", "Stacja uplink działa! Mamy uderzenie orbitalne — zaznacz cel przy stacji."],
				["techHurt", (g) => { const t = g.get(g.act4?.technician); return !!t && !g.act4.uplink && t.hp < t.maxHp * 0.5; }, "lira", "Technik jest ranny! Osłoń go, zanim go stracimy."],
				["fortressHurt", (g) => { const hq = g.hq(1); return !!hq && hq.hp < hq.maxHp * 0.5; }, "vok", "Twierdza nie upadnie, póki ja dowodzę. Wszystkie oddziały — do obrony."],
			],
			colony13: [
				["drop", (g) => (g.invasion?.dropNo || 0) > 0, "lira", "Kapsuły Vok spadają! Baterie przeciwlotnicze — ognia, reszta do obrony lądowiska."],
				["shot", (g) => (g.act4?.enemyShot || 0) >= 1, "lira", "Bateria zestrzeliła kapsułę Vok! Stawiajmy je tam, gdzie spada desant."],
				["scan", (g) => g.time >= 32, "lira", "Skan z orbity — Vok widzi nasze oddziały. Uważaj na uderzenia: rozprosz skupione grupy."],
				["survived", (g) => g.act4?.survived, "lira", "Desant odparty! Teraz kontratak — kwatera Vok jest po drugiej stronie przełęczy."],
				["vokHurt", (g) => { const hq = g.hq(1); return !!hq && hq.hp < hq.maxHp * 0.6; }, "vok", "Moja kwatera nie upadnie. Wszystkie kapsuły rezerwowe — na nich."],
			],
			colony14: [
				["first", (g) => (g.act4?.closed || 0) >= 1, "lira", "Pierwsza szczelina zamknięta! Brama traci osłonę — jeszcze dwie."],
				["second", (g) => (g.act4?.closed || 0) >= 2, "gate", "…OGRÓD SIĘ ZAMYKA… KTO ZAMYKA OGRÓD…"],
				["open", (g) => (g.act4?.closed || 0) >= 3, "lira", "Wszystkie szczeliny zamknięte — Brama odsłonięta! Cała flota: ognia!"],
				["gateHurt", (g) => { const hq = g.hq(1); return (g.act4?.closed || 0) >= 3 && !!hq && hq.hp < hq.maxHp * 0.5; }, "gate", "…MILKNIEMY… ALE OGRÓD PAMIĘTA…"],
				["late", (g) => g.time >= 1320, "lira", "Trzy minuty do 25. minuty — przyspieszmy."],
			],
		};

		const old = {};
		for (const k of ["configureMission", "factionFor", "sideName", "applyDamage", "tick", "landPod", "campaignReady", "serialize", "act2Objectives", "act2Secondary", "act2Status", "act2Epilogue", "act2Summary", "applyAct2Bonus", "applyCampaignChoices", "aiLevel", "decideCampaign", "canTarget", "entityName", "applyCampaignLevel"]) old[k] = Game.prototype[k];
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
				if (id === "colony13") input.invasion = { phase: "ground", owner: 1, pods: ch.enemyPods, from: "glacis" };
				this.act4 = { podsShot: 0, bridgehead: false, rifts: 0, watchers: false, flagship: null };
				this.configureSkirmish(input);
				this.upgrades.colony = true;
				this.credits = ch.credits;
				if (id === "colony12") this.setupFortress();
				if (id === "colony11" && this.invasion) {
					this.invasion.dropReady = TUNE.colony11.drop.first;
					this.invasion.dropCooldown = TUNE.colony11.drop.every;
				}
				if (id === "colony13") {
					const f = near(this, 0, "flak", toward(this, 0), 170);
					if (f) f.constructionLeft = 0;
				}
				if (id === "colony14") this.setupGate();
				if (id === "colony10") {
					if (this.invasion) this.invasion.ends = ch.orbitTime;
					// The flagship: a carrier of the Colonies — and the Admiralty's own.
					const mine = near(this, 0, "carrier", toward(this, 0), 170);
					if (mine) this.act4.flagship = mine.id;
					near(this, 1, "carrier", toward(this, 1), 170);
				}
				this.act2 = { mission: id, radio: [], losses: 0, lostValue: 0, bonus: 0, failReason: null, heard: {}, beacons: [] };
				for (const [who, text] of OPENING[id]) this.say(who, text, false);
				this.act4Beacons();
				this.explored.fill(0);
				this.updateVision();
			},
			// XII: the Fortress of the Admiralty (a doctrine, extra towers, a flak battery), the technician and his escort,
			// the site of the uplink station along the way.
			setupFortress() {
				const ch = CHAPTERS.colony12,
					hq = this.hq(1),
					home = this.hq(0),
					T = this.enemyAi?.teams?.[1];
				if (hq && !hq.fortress) {
					hq.fortress = true;
					hq.maxHp *= RTS.FORTRESS?.hpFactor ?? 1.5;
					hq.hp = hq.maxHp;
				}
				// (The doctrine comes with the campaign level: on hard — TUNE.colony12.doctrine.)
				if (T) T.upgrades.fortress = true;
				if (!home || !hq) return;
				const along = { x: home.x + (hq.x - home.x) * ch.uplinkAlong, y: home.y + (hq.y - home.y) * ch.uplinkAlong };
				// The station stands on free ground near that point (a reachable spot).
				let site = along;
				for (let r = 0; r < 400; r += 30) {
					const k = [0, 1, 2, 3, 4, 5, 6, 7].map((a) => ({ x: along.x + Math.cos(a * 0.785) * r, y: along.y + Math.sin(a * 0.785) * r })).find((p) => !this.blocked(p.x, p.y, 50) && this.entities.every((e) => e.hp <= 0 || dist(e, p) > TYPES[e.type].radius + 60));
					if (k) {
						site = k;
						break;
					}
				}
				this.act4.site = { x: Math.round(site.x), y: Math.round(site.y) };
				const tech = near(this, 0, "technician", toward(this, 0), 120);
				if (tech) this.act4.technician = tech.id;
				for (const [type, a] of [["tank", 0.5], ["tank", -0.5]]) near(this, 0, type, toward(this, 0) + a, 150);
			},
			// XIV: three rifts between the Gate and the player, each with its guards.
			setupGate() {
				const ch = CHAPTERS.colony14,
					gate = this.hq(1),
					home = this.hq(0);
				this.act4.rifts14 = [];
				this.act4.closed = 0;
				if (!gate || !home) return;
				const d = dist(gate, home),
					a0 = Math.atan2(home.y - gate.y, home.x - gate.x);
				for (const off of ch.riftSpots) {
					const want = { x: gate.x + Math.cos(a0 + off) * d * ch.riftAlong, y: gate.y + Math.sin(a0 + off) * d * ch.riftAlong };
					let spot = null;
					for (let r = 0; r < 500 && !spot; r += 30)
						for (let k = 0; k < 8 && !spot; k++) {
							const p = { x: Math.round(want.x + Math.cos(k * 0.785) * r), y: Math.round(want.y + Math.sin(k * 0.785) * r) };
							if (p.x > 120 && p.y > 120 && p.x < this.W - 120 && p.y < this.H - 120 && !this.blocked(p.x, p.y, 60) && this.entities.every((e) => e.hp <= 0 || dist(e, p) > TYPES[e.type].radius + 90)) spot = p;
						}
					if (!spot) continue;
					const rift = { x: spot.x, y: spot.y, progress: 0, closed: false, next: ch.wave.first + this.act4.rifts14.length * 25 };
					this.act4.rifts14.push(rift);
				}
			},
			// XIV: the Gate is shielded while a rift is open.
			gateShielded(e) {
				return this.missionId === "colony14" && !!this.act4?.rifts14 && e?.type === "hq" && e.team === 1 && this.act4.closed < this.act4.rifts14.length;
			},
			canTarget(a, b) {
				if (this.isAct4?.() && this.gateShielded(b)) return false;
				return old.canTarget.call(this, a, b);
			},
			entityName(e) {
				if (this.missionId === "colony14" && e?.type === "hq" && e.team === 1) return "Brama";
				return old.entityName.call(this, e);
			},
			// XIV, once a second: waves out of the open rifts, sealing by the player's ships.
			gateTick() {
				const ch = CHAPTERS.colony14,
					A = this.act4,
					S = ch.seal,
					foe = (e) => e.hp > 0 && (e.team === 1 || e.team === 4) && TYPES[e.type].speed,
					mine = (e) => e.hp > 0 && (e.team === 0 || this.allied(0, e.team)) && TYPES[e.type].speed && e.type !== "worker";
				for (const r of A.rifts14) {
					if (r.closed) continue;
					if (this.time % 2 < 1) this.fx("rift", r.x, r.y);
					if (this.time >= r.next) {
						r.next = this.time + ch.wave.every;
						const target = this.entities.filter((e) => e.team === 0 && e.hp > 0 && !TYPES[e.type].speed).sort((p, q) => dist(p, r) - dist(q, r))[0];
						[...ch.wave.units, ...(this.time >= ch.wave.laterAt ? ch.wave.later : [])].forEach((type, i) => {
							const e = this.spawn(type, 1, r.x + ((i % 3) - 1) * 40, r.y + Math.floor(i / 3) * 40);
							e.modeTagged = true;
							if (target) {
								e.order = { kind: "attackMove", x: target.x, y: target.y };
								e.path = this.pathTo(e, target);
							}
						});
						this.fx("rift", r.x, r.y, { merge: true });
					}
					const held = this.entities.some((e) => mine(e) && dist(e, r) < S.reach),
						contested = this.entities.some((e) => foe(e) && dist(e, r) < S.clear);
					r.progress = held && !contested ? r.progress + 1 : Math.max(0, r.progress - 0.5);
					if (r.progress >= S.time) {
						r.closed = true;
						A.closed++;
						this.fx("rift", r.x, r.y, { merge: true });
						this.notify(`Szczelina zamknięta (${A.closed}/${A.rifts14.length}).`, "ready");
					}
				}
			},
			// The markers on the board (act2-art.js beacons).
			act4Beacons() {
				const A = this.act4,
					beacons = [];
				if (this.missionId === "colony14")
					for (const r of A.rifts14 || [])
						if (!r.closed) beacons.push({ x: r.x, y: r.y, color: "#7fe9ff", radius: CHAPTERS.colony14.seal.reach, text: "SZCZELINA", sub: `zamykanie ${Math.floor(r.progress)}/${CHAPTERS.colony14.seal.time} s`, progress: r.progress / CHAPTERS.colony14.seal.time });
				if (this.missionId === "colony12" && A.site && !A.uplink) {
					const t = this.get(A.technician),
						d = t ? Math.round(dist(t, A.site)) : null;
					beacons.push({ x: A.site.x, y: A.site.y, color: "#8fe6ff", radius: CHAPTERS.colony12.deliver + 20, text: "STACJA UPLINK", sub: d != null ? `technik: ${d}` : "technik stracony" });
				}
				this.act2.beacons = beacons;
			},
			// XII: the technician reached the station — the uplink and a reactor are the player's.
			deliverUplink() {
				const A = this.act4,
					s = A.site;
				A.uplink = true;
				const free = (type, a, r0) => {
					for (let r = r0; r < r0 + 200; r += 20)
						for (let k = 0; k < 8; k++) {
							const p = { x: s.x + Math.cos(a + k * 0.785) * r, y: s.y + Math.sin(a + k * 0.785) * r },
								rad = TYPES[type].radius;
							if (!this.blocked(p.x, p.y, rad + 8) && this.entities.every((e) => e.hp <= 0 || dist(e, p) > TYPES[e.type].radius + rad + 12)) return this.spawn(type, 0, p.x, p.y);
						}
					return null;
				};
				const up = free("uplink", 0, 0);
				if (up) {
					up.faction = "dominion";
					up.constructionLeft = 0;
				}
				const re = free("reactor", 2.4, 90);
				if (re) re.constructionLeft = 0;
				this.fx("artifact", s.x, s.y);
				this.notify("Stacja uplink uruchomiona — uderzenie orbitalne dostępne.", "ready");
			},
			// XII: the Admiralty's ambush on the convoy, from the Fortress's side of the way.
			ambushConvoy(tech) {
				const ch = CHAPTERS.colony12,
					hq = this.hq(1);
				if (!hq) return;
				this.act4.ambushed = true;
				const d = dist(hq, tech) || 1,
					from = { x: tech.x + ((hq.x - tech.x) / d) * 420, y: tech.y + ((hq.y - tech.y) / d) * 420 },
					extra = this.campaignLevel === "hard" ? ["tank"] : this.campaignLevel === "easy" ? [] : ["trooper"];
				[...ch.ambush, ...extra].forEach((type, i) => {
					const p = { x: from.x + ((i % 3) - 1) * 34, y: from.y + Math.floor(i / 3) * 34 };
					if (this.blocked(p.x, p.y, 14)) return;
					const e = this.spawn(type, 1, p.x, p.y);
					e.modeTagged = true;
					e.order = { kind: "attackMove", x: tech.x, y: tech.y };
					e.path = this.pathTo(e, tech);
				});
			},
			// XII: the Fortress keeps patrols and escorts on every level.
			aiLevel(team = null) {
				let L = old.aiLevel.call(this, team);
				if (!this.isAct4?.()) return L;
				const P = TUNE[this.missionId]?.pace;
				if (P && Array.isArray(L.attackSize))
					L = { ...L, interval: L.interval * P.interval, attackSize: [Math.max(3, Math.round(L.attackSize[0] * P.attackSize)), L.attackSize[1] * P.attackSize, Math.max(4, Math.round(L.attackSize[2] * P.attackSize))] };
				if (P?.army && Array.isArray(L.army)) L = { ...L, army: [L.army[0] * P.army, L.army[1] * P.army, Math.max(6, Math.round(L.army[2] * P.army))] };
				// XIII below hard: few towers, no uplink (TUNE.colony13.aiTurrets).
				const cap = TUNE[this.missionId]?.aiTurrets?.[this.campaignLevel];
				if (cap != null && Array.isArray(L.turrets)) L = { ...L, turrets: L.turrets.slice(0, cap), uplinkAt: null };
				if (this.missionId !== "colony12") return L;
				return { ...L, patrols: Math.max(1, L.patrols || 0), escorts: Math.max(1, L.escorts || 0) };
			},
			// The campaign level is known: the enemy's garrison and the chapter's pace (TUNE), once.
			applyCampaignLevel(level) {
				const done = old.applyCampaignLevel.call(this, level);
				if (!done || !this.isAct4() || this.act4.tuned) return done;
				this.act4.tuned = true;
				const T = TUNE[this.missionId],
					L = ["easy", "normal", "hard"].includes(this.campaignLevel) ? this.campaignLevel : "normal",
					hq = this.hq(1);
				(T.garrison?.[L] || []).forEach((type, i) => {
					// "guard": the commander never drafts them (relays, attacks) — they hold by the centre.
					const e = near(this, 1, type, toward(this, 1) + ((i % 5) - 2) * 0.35, 150 + Math.floor(i / 5) * 60);
					if (e) e.aiRole = "guard";
				});
				(T.towers?.[L] || []).forEach((type, i) => {
					const e = near(this, 1, type, toward(this, 1) + (i - (T.towers[L].length - 1) / 2) * 0.6, 230);
					if (e) e.constructionLeft = 0;
				});
				if (hq && (T.stationHp || T.gateHp)) {
					hq.maxHp *= T.stationHp || T.gateHp;
					hq.hp = hq.maxHp;
				}
				const AI = this.enemyAi?.teams?.[1];
				if (T.doctrine?.[L] && AI) AI.upgrades[T.doctrine[L]] = true;
				const I = this.invasion;
				if (this.missionId === "colony13" && I?.pods) {
					I.pods[1] = T.pods[L];
					this.act4.vokPods = T.pods[L];
					I.aiDropAt = T.firstDrop;
					I.aiDropEvery = T.dropEvery;
					I.strikeCooldown = T.strikeEvery;
					I.strikeReady = Math.max(I.strikeReady || 0, T.firstDrop);
				}
				if (this.missionId === "colony14")
					for (const r of this.act4.rifts14 || [])
						T.guards[L].forEach((type, i) => {
							const e = this.spawn(type, 1, r.x + Math.cos(i * 1.6) * 75, r.y + Math.sin(i * 1.6) * 75);
							e.modeTagged = true;
							e.aiRole = "guard";
						});
				return done;
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
				this.invasion.pods[0] = Math.max(RTS.INVASION.minPods, Math.min(TUNE.colony11.drop.cap, pods));
				this.say("lira", `Flota z blokady Eos daje nam ${this.invasion.pods[0]} kapsuł desantowych.`, false);
				return this.invasion.pods[0];
			},
			// The decision of chapter VIII in X and XI.
			applyCampaignChoices(choices = {}) {
				const r = old.applyCampaignChoices.call(this, choices);
				if (!this.isAct4() || this.act4.varn || this.time > 1) return r;
				// XIII: the decision of XII (the radio line comes from campaign-choices.js).
				if (this.missionId === "colony13" && !this.act4.decision12) {
					const d = choices.colony12;
					if (d === "garrison") {
						this.act4.decision12 = d;
						for (const [type, a] of [["destroyer", 0.5], ["destroyer", -0.5], ["sentinel", 0.9]]) {
							const e = near(this, 0, type, toward(this, 0) + a, 180);
							if (e) e.faction = "dominion";
						}
						const f = near(this, 0, "flak", toward(this, 0) - 1.1, 200);
						if (f) {
							f.constructionLeft = 0;
							f.faction = "dominion";
						}
					} else if (d === "shipyard") {
						this.act4.decision12 = d;
						const I = this.invasion;
						if (I?.pods) {
							I.pods[1] = Math.max(0, (I.pods[1] || 0) - 3);
							this.act4.vokPods = I.pods[1];
							I.strikeReady += 60;
						}
						const hq = this.hq(1);
						if (hq) {
							hq.maxHp *= 0.75;
							hq.hp = Math.min(hq.hp, hq.maxHp);
						}
					}
				}
				// XIV: the decision of XIII.
				if (this.missionId === "colony14" && !this.act4.decision13) {
					const d = choices.colony13;
					if (d === "truce") {
						this.act4.decision13 = d;
						for (const [type, a] of [["frigate", 0.5], ["frigate", -0.5], ["cruiser", 0]]) {
							const e = near(this, 0, type, toward(this, 0) + a, 190);
							if (e) e.faction = "dominion";
						}
					} else if (d === "rout") {
						this.act4.decision13 = d;
						this.credits += 600;
					}
					if (choices.colony12 === "garrison" || choices.colony8 === "trust") {
						this.act4.varn14 = true;
						for (const [type, a] of [["frigate", 1.1], ["corvette", -1.1]]) {
							const e = near(this, 0, type, toward(this, 0) + a, 200);
							if (e) e.faction = "dominion";
						}
						this.say("varn", choices.colony12 === "garrison" ? "Garnizon z Popielnego Szlaku pamięta. Moje okręty lecą z wami do końca." : "Obiecałem wam wspólne dowództwo. Lecę z wami do Bramy.", false);
					}
				}
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
			// XII's decision takes effect at once: Varn's garrison breaks out and joins (garrison), or the strike on the
			// shipyard costs the Admiralty its reserves (shipyard).
			decideCampaign(choice) {
				const done = old.decideCampaign.call(this, choice);
				if (done && this.missionId === "colony13" && this.isAct4()) {
					if (choice === "truce" && !this.result) {
						this.act4.truce = true;
						this.say("vok", "Admiralicja opuszcza Nivalis. Do zobaczenia przy Bramie, Kolonie.");
						this.result = "victory";
						this.notify(MISSIONS[this.missionId].name + " — rozejm z Admiralicją.", "victory");
					} else if (choice === "rout") this.say("lira", "Żadnych układów. Kończymy to tutaj.");
					return done;
				}
				if (!done || this.missionId !== "colony12" || !this.isAct4()) return done;
				if (choice === "garrison") {
					for (const [type, a] of [["destroyer", 0.3], ["destroyer", -0.3], ["sentinel", 0]]) {
						const e = near(this, 0, type, toward(this, 0) + a, 260);
						if (e) e.faction = "dominion";
					}
					this.say("varn", "Wyszliśmy z okrążenia! Moi ludzie dołączają do waszej kolumny — i zapamiętają to.");
				} else {
					const T = this.enemyAi?.teams?.[1];
					if (T) T.metal = Math.max(0, T.metal - 500);
					this.say("lira", "Uplink trafił w stocznię Admiralicji. Ich zapasy płoną — a flota Vok straci okręty, zanim zdąży je zwodować.");
				}
				return done;
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
				// XIV: nothing reaches the shielded Gate (splash and strikes included).
				if (this.isAct4() && this.gateShielded(b)) return;
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
				if (this.isAct4() && d.team === 1 && !units.length) this.act4.enemyShot = (this.act4.enemyShot || 0) + 1;
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
				// Once a second (the last second is kept: floor(time - dt) can round past the boundary and skip it).
				const second = Math.floor(this.time);
				if (second === A.second) return;
				A.second = second;
				const rift = !this.result && ch.rifts?.[A.rifts];
				if (rift && this.time >= rift.at) {
					this.openRift(rift.units);
					if (A.rifts === 1) {
						this.say("gate", this.missionId === "colony12" ? "…POPIÓŁ PAMIĘTA OGRÓD… ODDAJCIE LATARNIE…" : "…KTO TRZYMA LATARNIE… TEN ODPOWIE…");
						this.say("lira", this.missionId === "colony12" ? "Szczelina w ruinach! Wartownicy — biją w nas i w Twierdzę." : "Szczelina przy przekaźniku! Nieznane maszyny — strzelają do nas i do Admiralicji!");
					} else this.say("gate", "…OGRÓD ZGASŁ… SPRAWDZIMY KAŻDEGO…");
				}
				if (this.missionId === "colony12" && !this.result) {
					const tech = A.technician != null ? this.get(A.technician) : null;
					if (!A.uplink) {
						if (!tech || tech.hp <= 0) {
							this.result = "defeat";
							s.failReason = "Technik zginął na Popielnym Szlaku — stacja uplink nie zostanie uruchomiona. Spróbuj ponownie i osłaniaj konwój.";
							this.notify("Technik zginął. Misja nieudana.", "defeat");
							return;
						}
						const home = this.hq(0);
						if (!A.ambushed && home && dist(home, tech) >= dist(home, A.site) * ch.ambushAt) this.ambushConvoy(tech);
						if (dist(tech, A.site) <= ch.deliver) this.deliverUplink();
					}
					if (A.uplink && !this.enemyBases().length && this.hq(0)) {
						this.result = "victory";
						this.notify(MISSIONS[this.missionId].name + " — misja ukończona.", "victory");
					}
					this.act4Beacons();
				}
				if (this.missionId === "colony14" && !this.result) {
					this.gateTick();
					this.act4Beacons();
				}
				if (this.missionId === "colony13" && !this.result && !A.survived) {
					const left = this.podsLeft(1) + (this.drops || []).filter((d) => d.team === 1).length;
					if (left <= 0 || this.time >= ch.surviveTime) {
						A.survived = true;
						// Her fleet spent on the landing: strikes from orbit only now and then on hard, none below.
						const I = this.invasion,
							every = TUNE.colony13.strikesAfter[this.campaignLevel];
						if (I && every) {
							I.strikeCooldown = every;
							I.strikeReady = Math.max(I.strikeReady || 0, this.time + 120);
						} else if (I) {
							I.strikeReady = 1e9;
							this.say("lira", "Flota Vok wyczerpana na desant — z orbity już nie uderzy. Kwatera jest odsłonięta.");
						}
					}
				}
				if (this.missionId === "colony11" && !this.result) {
					if (!A.bridgehead && this.nodes.filter((n) => n.owner === 0).length >= 2) A.bridgehead = true;
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
				if (this.missionId === "colony12") return !!this.act4.uplink && !this.enemyBases().length;
				if (this.missionId === "colony14") return this.act4.closed >= (this.act4.rifts14?.length || 0) && !this.enemyBases().length;
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
				if (this.missionId === "colony12") {
					const t = A.technician != null ? this.get(A.technician) : null;
					return [
						{ text: A.uplink ? "Doprowadź technika do stacji uplink" : `Doprowadź technika do stacji uplink (${t ? Math.round(dist(t, A.site)) : "—"})`, done: !!A.uplink, failed: !A.uplink && !t },
						{ text: "Zdobądź Twierdzę Admiralicji", done: won },
						{ text: `Cel dodatkowy: zwycięż przed ${Math.round(ch.secondaryTime / 60)}. minutą`, secondary: true, done: won && this.time <= ch.secondaryTime, failed: !won && this.time > ch.secondaryTime },
					];
				}
				if (this.missionId === "colony13") {
					const left = this.podsLeft(1),
						shot = A.enemyShot || 0,
						goal = Math.min(ch.podsGoal[this.campaignLevel] ?? 3, Math.max(1, (A.vokPods ?? 4) - 1));
					return [
						{ text: A.survived || won ? "Przetrwaj desant Admiralicji" : `Przetrwaj desant Admiralicji (kapsuły Vok: ${left})`, done: !!A.survived || won },
						{ text: A.truce ? "Pokonaj Vok — rozejm" : "Pokonaj Vok: zniszcz jej kwaterę", done: won },
						{ text: `Cel dodatkowy: zestrzel ${goal} ${goal === 1 ? "kapsułę" : "kapsuły"} Vok (${Math.min(shot, goal)}/${goal})`, secondary: true, done: shot >= goal, failed: shot < goal && (won || (left <= 0 && !(this.drops || []).some((d) => d.team === 1))) },
					];
				}
				if (this.missionId === "colony14") {
					const n = A.rifts14?.length || 3;
					return [
						{ text: `Zamknij szczeliny (${Math.min(A.closed || 0, n)}/${n}) — utrzymaj przy nich okręty bez wrogów w pobliżu`, done: (A.closed || 0) >= n || won },
						{ text: (A.closed || 0) >= n ? "Zniszcz Bramę" : "Zniszcz Bramę (osłonięta, dopóki szczeliny są otwarte)", done: won },
						{ text: `Cel dodatkowy: zwycięż przed ${Math.round(ch.secondaryTime / 60)}. minutą`, secondary: true, done: won && this.time <= ch.secondaryTime, failed: !won && this.time > ch.secondaryTime },
					];
				}
				return [
					{ text: "Zniszcz Rdzeń Wartowników", done: won },
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
					return "Baza Admiralicji w Dolinie Latarni upada. Ale to nie Vok jest największym zmartwieniem: szczeliny przy artefaktach otwierają się na całym pograniczu, a maszyny, które z nich wychodzą, nie odróżniają Kolonii od Dominium. Lira nazywa je Wartownikami.";
				if (id === "colony14") {
					const truce = this.act4.decision13 === "truce",
						varn = this.act4.varn14;
					return (
						"Brama gaśnie przy horyzoncie zdarzeń, a szczeliny na całym pograniczu zamykają się jedna po drugiej. Głos Bramy milknie w pół słowa. " +
						(truce ? "Okręty Vok i Kolonii wracają z Erebusa razem — Admiralicja podpisuje rozejm, którego kiedyś nie uznała. " : "Admiralicja nie istnieje; Kolonie wracają z Erebusa jako jedyna siła pogranicza. ") +
						(varn ? "Varn, który zaufał Koloniom, leci obok Liry." : "Varn czeka na nich na Nivalis — wciąż z dystansem.")
					);
				}
				if (id === "colony13") {
					return this.act4.truce || this.campaignChoice?.() === "truce"
						? "Vok wycofuje się z Nivalis. Na otwartym kanale Kolonie i Admiralicja po raz pierwszy mówią o wspólnym wrogu — szczeliny prowadzą do Bramy przy czarnej dziurze Erebus, a flota Vok poleci tam razem z Wami."
						: "Kwatera Vok płonie, a Admiralicja przestaje istnieć. Jej magazyny i plany należą do Kolonii — ale do Bramy przy czarnej dziurze Erebus polecicie sami.";
				}
				if (id === "colony12") {
					const choice = this.campaignChoice?.();
					return (
						"Twierdza Admiralicji pada, a Vok ucieka na orbitę z resztą floty. " +
						(choice === "garrison"
							? "Garnizon Varna wyszedł z okrążenia Wartowników — jego okręty dołączą do Kolonii nad Glacjalis."
							: choice === "shipyard"
								? "Uderzenie z uplinku spaliło stocznię Admiralicji: flota Vok nad Glacjalis będzie słabsza. Garnizon Varna milczy."
								: "Nad Glacjalis czeka ją ostatnia bitwa — a szczeliny otwierają się coraz bliżej.")
					);
				}
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
