/* Stage F6: campaign act III "Przebudzenie Roju" — chapters VII–IX against the Crystal Swarm.
   Built on the scenario machinery (commander AI, modes, teams, factions) with the act II interface:
   radio lines, objectives with a secondary badge, the badge bonus from the previous chapter and an epilogue.
   The terrain is borrowed from scenario maps (layout aliases). Shared by browser and tests.
   The act II decision about the Hefajstos complex (campaign choice for colony6) changes act III — see LEGACY. */
(function (root) {
	function install(RTS) {
		if (RTS.act3Installed) return;
		RTS.act3Installed = true;
		const { Game, TYPES, MISSIONS, dist } = RTS;

		Object.assign(RTS.ACT2_SPEAKERS, {
			varn: { name: "Kmdr Aris Varn", role: "Dowódca Dominium", color: "#e9a17a" },
			whisper: { name: "Szept Roju", role: "Nieznany sygnał", color: "#d59cf0" },
		});

		const CHAPTERS = (RTS.ACT3 = {
			colony7: {
				map: "lumen",
				mission: {
					name: "VII · Przebudzenie",
					planet: "Lumeria V — Gąszcz Szeptów",
					requires: "colony6",
					description:
						"Od wyłączenia Hefajstosa artefakty obcych w całym pograniczu świecą jednym rytmem. Na Lumerii V sygnał jest najsilniejszy — i właśnie tam z kryształowych grot wyszło coś żywego. Zdobądź artefakt, zanim zabierze go Rój, i dowieź go do bazy, by Lira mogła go zbadać.",
					objective: "Przejmij artefakt obcych i dostarcz go do centrum dowodzenia. Dodatkowo: zrób to przed 12. minutą.",
					facts: ["Start: Kolonia · przeciwnik: Rój Kryształowy", "900 metalu · strażnicy przy artefakcie<br>Rój również poluje na artefakt"],
					lesson: "Ekspedycja pod presją nowego wroga",
				},
				scenario: { mode: "expedition", difficulty: "normal", players: 2 },
				credits: 900,
				secondaryTime: 720,
			},
			colony8: {
				map: "frost",
				mission: {
					name: "VIII · Sojusz z konieczności",
					planet: "Nivalis — Biały Przesmyk",
					requires: "colony7",
					description:
						"Rój rozlał się po Nivalis i odciął garnizon Dominium. Kmdr Varn prosi o pomoc — dawny wróg, dziś jedyny sojusznik. Na środku przełęczy stoi Szczyt: z niego zagłuszycie rezonans, którym Rój się porozumiewa.",
					objective: "Utrzymaj Szczyt łącznie przez 3 min albo zniszcz oba gniazda Roju. Dodatkowo: nie dopuść do upadku bazy Varna.",
					facts: ["Start: Kolonia · sojusznik: Dominium (Varn)", "1000 metalu · dwa gniazda Roju<br>Szczyt w centrum przełęczy"],
					lesson: "Współpraca z sojusznikiem i walka o punkt",
				},
				scenario: { mode: "hill", hillTime: 180, teams: "duo", difficulty: "normal" },
				credits: 1000,
				allyFaction: "dominion",
			},
			colony9: {
				map: "magma",
				mission: {
					name: "IX · Serce Roju",
					planet: "Pyrrhos — Rzeki Magmy",
					requires: "colony8",
					description:
						"Zagłuszony Rój cofnął się do źródła: Serca bijącego pod rzekami magmy Pyrrhosa. Varn przekazuje Koloniom dostęp do stacji orbitalnej. To ostatnia bitwa aktu — zniszcz Serce, zanim Rój obudzi się na dobre.",
					objective: "Zniszcz Serce Roju. Dodatkowo: zwycięż przed 20. minutą.",
					facts: ["Start: Kolonia, stacja orbitalna Dominium, reaktory", "1200 metalu · Rój na poziomie średnim<br>Serce wytrzymalsze o 50%"],
					lesson: "Uderzenie orbitalne i szturm na umocnioną bazę",
				},
				scenario: { mode: "conquest", difficulty: "normal", players: 2 },
				credits: 1200,
				heart: 1.5,
				secondaryTime: 1200,
			},
		});
		// Consequences of the act II decision (the fate of the Hefajstos complex), applied at the start of each chapter.
		// evacuate: the rescued technicians were Dominium staff — Varn repays the debt with arms and soldiers.
		// destroy: the Swarm fed on the complex's energy — its nests are weaker, and the ruins gave up metal; Varn,
		// who lost his power plant, helps only as much as he must.
		const LEGACY = (RTS.ACT3_LEGACY = {
			evacuate: {
				name: "Wdzięczność Dominium",
				summary: "Uratowani technicy byli ludźmi Dominium. Varn spłaca dług: Twoja fabryka buduje niszczyciele czołgów Dominium, w rozdziale VIII jego baza ma posiłki (2 niszczyciele i bastion), a w IX dołącza do Ciebie eskorta 2 niszczycieli.",
				units: ["destroyer"],
				radio: {
					colony7: ["tessa", "Technicy uratowani z Hefajstosa przekazali nam plany niszczyciela czołgów Dominium. Fabryka może je budować."],
					colony8: ["varn", "Moi technicy żyją dzięki wam. Garnizon dostał dwa niszczyciele i bastion — nie zawiedziemy was."],
					colony9: ["varn", "Dług za Hefajstos spłacam osobiście: dwa niszczyciele czołgów dołączają do waszej kolumny."],
				},
			},
			destroy: {
				name: "Popiół Hefajstosa",
				summary: "Rój czerpał energię z kompleksu — bez niej gniazda i Serce Roju mają o 25% mniej wytrzymałości, a rdzenie z ruin dają 250 metalu na start każdego rozdziału. Varn stracił elektrownię i nie przyśle posiłków ani planów.",
				units: [],
				swarmHp: 0.75,
				credits: 250,
				radio: {
					colony7: ["lira", "Odkąd Hefajstos nie istnieje, Rój stracił źródło energii — jego gniazda są słabsze. Rdzenie z ruin dały nam 250 metalu."],
					colony8: ["varn", "Zniszczyliście naszą elektrownię. Pomogę, bo muszę — ale posiłków ode mnie nie będzie."],
					colony9: ["lira", "Serce Roju karmiło się energią Hefajstosa. Bez niej bije słabiej — wykorzystajmy to."],
				},
			},
		});
		const isAct3 = (id) => Object.hasOwn(CHAPTERS, id);
		RTS.isAct3 = isAct3;

		// Missions, borrowing the look and terrain of scenario maps.
		for (const [id, ch] of Object.entries(CHAPTERS)) {
			const look = MISSIONS[ch.map];
			MISSIONS[id] = {
				biome: look.biome,
				theme: look.theme,
				barren: look.barren,
				mirror: look.mirror,
				weatherName: look.weatherName,
				...ch.mission,
				campaign: true,
				act: 3,
			};
			if (RTS.FRONTIER_MAPS?.[ch.map]) RTS.FRONTIER_MAPS[id] = RTS.FRONTIER_MAPS[ch.map];
			if (RTS.THEMED_LAYOUTS?.[ch.map]) RTS.THEMED_LAYOUTS[id] = RTS.THEMED_LAYOUTS[ch.map];
		}

		const OPENING = {
			colony7: [
				["lira", "Artefakty od tygodnia pulsują w jednym rytmie. Ten na Lumerii jest najbliżej — i coś go pilnuje."],
				["tessa", "To nie jest technologia Dominium ani nasza. Kryształy rosną tu jak żywe tkanki. Uważajcie na siebie."],
			],
			colony8: [
				["varn", "Tu Varn. Nie przepadam za Koloniami, ale Rój zjada moich ludzi. Ze Szczytu w centrum przełęczy zagłuszymy ich rezonans."],
				["lira", "Utrzymajmy Szczyt przez trzy minuty. Baza Varna jest na naszej flance — nie dajmy jej upaść."],
			],
			colony9: [
				["lira", "Serce Roju bije pod rzekami magmy. Każde uderzenie odbija się echem w artefaktach."],
				["varn", "Przekazuję wam dostęp do naszej stacji orbitalnej. Zaznaczcie cel — resztę zrobi orbita."],
			],
		};
		// Radio triggers: [id, condition, speaker, line], each played once.
		const TRIGGERS = {
			colony7: [
				["contact", (g) => g.entities.some((e) => e.team === 1 && TYPES[e.type].speed && g.isVisible(e.x, e.y)), "whisper", "…obudziliście nas… oddajcie, co nasze…"],
				["ours", (g) => g.modeState?.artifact?.team === 0, "lira", "Artefakt w naszych rękach! Prowadź niosącego do centrum."],
				["theirs", (g) => g.modeState?.artifact?.carrier != null && g.modeState.artifact.team === 1, "tessa", "Rój go zabiera! Przechwyćcie niosącego, zanim zniknie w grotach!"],
				["late", (g) => g.time > 600, "lira", "Zostały dwie minuty do okna badawczego — pospieszmy się."],
			],
			colony8: [
				["hill", (g) => g.hillNode?.()?.owner === 0, "lira", "Szczyt nasz — zagłuszacz działa. Trzymajmy go."],
				["lost", (g) => g.hillNode?.()?.owner === 1, "whisper", "…Szczyt śpiewa dla nas…"],
				["ally", (g) => (g.hq(3)?.hp ?? 0) < (g.hq(3)?.maxHp ?? 0) * 0.5, "varn", "Moja baza płonie! Przyślijcie wsparcie, szybko!"],
				["allyLost", (g) => !g.hq(3), "varn", "…straciłem bazę. Walczcie dalej — dla nas wszystkich."],
			],
			colony9: [
				["strike", (g) => (g.strikes || []).some((s) => s.team === 0), "varn", "Namiar przyjęty. Uderzenie w drodze."],
				["heart", (g) => (g.hq(1)?.hp ?? 1) < (g.hq(1)?.maxHp ?? 1) * 0.5, "whisper", "…nie uciszycie nas wszystkich… jest nas więcej…"],
			],
		};

		const old = {};
		for (const k of ["configureMission", "factionFor", "applyDamage", "tick", "campaignReady", "serialize", "act2Objectives", "act2Secondary", "act2Status", "act2Epilogue", "act2Summary", "applyAct2Bonus", "spawn"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;

		Object.assign(Game.prototype, {
			isAct3() {
				return isAct3(this.missionId) && !!this.act2;
			},
			configureMission() {
				old.configureMission.call(this);
				if (isAct3(this.missionId)) this.setupAct3();
			},
			setupAct3() {
				const ch = CHAPTERS[this.missionId];
				this.act3Ally = ch.allyFaction || null;
				this.configureSkirmish({ faction: "colonies", enemyFaction: "swarm", enemy: "commander", seed: 0, ...ch.scenario });
				this.upgrades.colony = true;
				this.credits = ch.credits;
				const hq = this.hq(0);
				if (this.missionId === "colony9" && hq) {
					// Varn's orbital uplink and the power to run it.
					const toward = Math.atan2(this.H / 2 - hq.y, this.W / 2 - hq.x);
					for (const [type, a, d] of [["uplink", -0.9, 240], ["reactor", 0.9, 230], ["reactor", 2.4, 200]]) {
						for (let r = d; r < d + 240; r += 30) {
							const p = { x: hq.x + Math.cos(toward + a) * r, y: hq.y + Math.sin(toward + a) * r },
								rad = TYPES[type].radius;
							if (!this.blocked(p.x, p.y, rad + 10) && this.entities.every((e) => e.hp <= 0 || dist(e, p) > TYPES[e.type].radius + rad + 16) && [...this.ores, ...this.gasFields, ...this.crystalFields].every((o) => dist(o, p) > rad + 50)) {
								const b = this.spawn(type, 0, p.x, p.y);
								if (type === "uplink") b.faction = "dominion";
								break;
							}
						}
					}
					const heart = this.hq(1);
					if (heart) {
						heart.maxHp *= ch.heart;
						heart.hp = heart.maxHp;
					}
				}
				this.act2 = { mission: this.missionId, radio: [], losses: 0, lostValue: 0, bonus: 0, failReason: null, heard: {} };
				for (const [who, text] of OPENING[this.missionId]) this.say(who, text, false);
				this.explored.fill(0);
				this.updateVision();
			},
			// The act II decision: choices = the campaign's choices ({ colony6: "evacuate" | "destroy" }). Once per
			// chapter (kept in the save with the rest of the chapter state).
			applyCampaignChoices(choices = {}) {
				if (!this.isAct3() || this.act2.legacy) return null;
				const key = choices.colony6,
					legacy = LEGACY[key];
				if (!legacy) return null;
				this.act2.legacy = key;
				const near = (anchor, type, team, angle, distance) => {
					for (let r = distance; r < distance + 260; r += 26)
						for (let k = 0; k < 8; k++) {
							const a = angle + (k * Math.PI) / 4,
								p = { x: anchor.x + Math.cos(a) * r, y: anchor.y + Math.sin(a) * r },
								rad = TYPES[type].radius;
							if (p.x > 40 && p.y > 40 && p.x < this.W - 40 && p.y < this.H - 40 && !this.blocked(p.x, p.y, rad + 6) && this.entities.every((e) => e.hp <= 0 || dist(e, p) > TYPES[e.type].radius + rad + 10))
								return this.spawn(type, team, p.x, p.y);
						}
					return null;
				};
				if (key === "evacuate") {
					const ally = this.hq(3),
						hq = this.hq(0);
					if (this.missionId === "colony8" && ally)
						for (const [type, a] of [["destroyer", 0], ["destroyer", 2.1], ["sentinel", 4.2]]) near(ally, type, 3, a, 150);
					if (this.missionId === "colony9" && hq) {
						const toward = Math.atan2(this.H / 2 - hq.y, this.W / 2 - hq.x);
						for (const a of [-0.35, 0.35]) near(hq, "destroyer", 0, toward + a, 170);
					}
				} else {
					this.credits += legacy.credits;
					// The Swarm's bases (enemy command centres of the Swarm faction) lose a quarter of their durability.
					for (const e of this.entities)
						if (e.type === "hq" && e.hp > 0 && e.team !== 0 && !this.allied(0, e.team) && this.factionFor(e.team)?.key === "swarm") {
							e.maxHp *= legacy.swarmHp;
							e.hp = Math.min(e.hp, e.maxHp);
						}
				}
				const [who, text] = legacy.radio[this.missionId];
				this.say(who, text, false);
				return key;
			},
			// A unit of another faction the player may build (the Dominium's tank destroyer after the evacuation).
			loanedUnit(type) {
				return this.me === 0 && this.isAct3() && !!LEGACY[this.act2.legacy]?.units.includes(type);
			},
			spawn(type, team, x, y) {
				const e = old.spawn.call(this, type, team, x, y);
				// Lent units keep the Dominium's look (and its bonuses per unit, none so far), in the player's colour.
				if (team === 0 && this.act2?.legacy && this.loanedUnit(type)) e.faction = TYPES[type].faction;
				return e;
			},
			// Chapter VIII: the ally is the Dominium.
			factionFor(team) {
				if (team === 3 && this.act3Ally && RTS.FACTIONS[this.act3Ally]) return { key: this.act3Ally, ...RTS.FACTIONS[this.act3Ally] };
				return old.factionFor.call(this, team);
			},
			applyDamage(a, b, n) {
				const alive = b.hp > 0;
				const r = old.applyDamage.call(this, a, b, n);
				if (this.isAct3() && alive && b.hp <= 0 && b.team === 0 && TYPES[b.type].speed) {
					this.act2.losses++;
					this.act2.lostValue += TYPES[b.type].cost || 0;
				}
				return r;
			},
			tick(dt) {
				old.tick.call(this, dt);
				if (!this.isAct3()) return;
				const s = this.act2;
				if (Math.floor(this.time) !== Math.floor(this.time - dt))
					for (const [id, when, who, text] of TRIGGERS[this.missionId])
						if (!s.heard[id] && when(this)) {
							s.heard[id] = true;
							this.say(who, text);
						}
				// Chapter VIII can also be won by destroying both nests.
				if (!this.result && this.missionId === "colony8" && this.hq(0) && !this.enemyBases().length) {
					this.result = "victory";
					this.notify(MISSIONS[this.missionId].name + " — misja ukończona.", "victory");
				}
			},
			campaignReady() {
				if (!this.isAct3()) return old.campaignReady.call(this);
				return !this.enemyBases().length || ["artifact-won", "hill-won"].includes(this.modeState?.outcome);
			},
			act2Objectives() {
				if (!this.isAct3()) return old.act2Objectives.call(this);
				const ch = CHAPTERS[this.missionId],
					won = this.result === "victory",
					mode = this.modeState;
				if (this.missionId === "colony7")
					return [
						{ text: "Przejmij artefakt obcych", done: mode?.artifact?.team === 0 || won },
						{ text: "Dostarcz artefakt do centrum dowodzenia", done: won },
						{ text: "Cel dodatkowy: dostarcz go przed 12. minutą", secondary: true, done: won && this.time <= ch.secondaryTime, failed: !won && this.time > ch.secondaryTime },
					];
				if (this.missionId === "colony8")
					return [
						{ text: `Utrzymaj Szczyt łącznie przez 3 min (${Math.floor(mode?.scores?.[0] || 0)} / ${mode?.target || 180} s) albo zniszcz oba gniazda Roju`, done: won },
						{ text: "Cel dodatkowy: baza Varna przetrwa", secondary: true, done: won && !!this.hq(3), failed: !this.hq(3) },
					];
				return [
					{ text: "Zniszcz Serce Roju", done: won },
					{ text: "Cel dodatkowy: zwycięż przed 20. minutą", secondary: true, done: won && this.time <= ch.secondaryTime, failed: !won && this.time > ch.secondaryTime },
				];
			},
			act2Secondary() {
				if (!this.isAct3()) return old.act2Secondary.call(this);
				return !!this.act2Objectives().find((o) => o.secondary)?.done;
			},
			act2Status() {
				if (!this.isAct3()) return old.act2Status.call(this);
				const next = this.act2Objectives().find((o) => !o.done && !o.secondary);
				return (next ? next.text + "." : "Cele wykonane.") + (this.modeStatus?.() ? " " + this.modeStatus() : "");
			},
			act2Epilogue() {
				if (!this.isAct3()) return old.act2Epilogue.call(this);
				if (this.missionId === "colony7")
					return "Lira rozkłada artefakt na stole laboratorium. W jego wnętrzu pulsuje mapa — trasa z Lumerii przez Nivalis aż do Pyrrhosa. Rój nie jest wojskiem. Jest siecią, a artefakty to jej węzły.";
				if (this.missionId === "colony8")
					return (this.hq(3)
						? "Varn ściska dłoń Liry nad dymiącymi ruinami gniazda. Wrogowie sprzed miesiąca patrzą teraz w tę samą stronę. "
						: "Baza Varna nie przetrwała, ale jego ludzie ewakuowali się pod osłoną Szczytu. ") + "Zagłuszony rezonans pokazał, skąd Rój czerpie siłę: z Serca pod magmą Pyrrhosa.";
				return (
					"Serce Roju gaśnie, a wraz z nim milkną artefakty w całym pograniczu. " +
					(this.act2.legacy === "evacuate"
						? "Technicy z Hefajstosa i żołnierze Varna świętują razem z Kolonistami — dług został spłacony z nawiązką. "
						: this.act2.legacy === "destroy"
							? "Popiół Hefajstosa osłabił Rój, ale Varn długo nie zapomni utraconej elektrowni. "
							: "") +
					"Kolonie i Dominium po raz pierwszy od lat nie liczą strat, lecz ocalałych. Na horyzoncie wstaje świt — tym razem wspólny."
				);
			},
			act2Summary() {
				const r = old.act2Summary.call(this);
				return this.isAct3() ? { ...r, objectives: this.act2Objectives(), secondary: this.act2Secondary() } : r;
			},
			applyAct2Bonus(badges = {}) {
				if (!this.isAct3()) return old.applyAct2Bonus.call(this, badges);
				if (this.act2.bonus) return 0;
				const previous = MISSIONS[this.missionId].requires;
				if (!badges[previous]) return 0;
				this.credits += 200;
				this.act2.bonus = 200;
				this.say("lira", "Odznaka z poprzedniego rozdziału: dodatkowe 200 metalu na start.", false);
				return 200;
			},
			serialize() {
				return { ...old.serialize.call(this), act3Ally: this.act3Ally || null };
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			if (isAct3(g.missionId)) {
				const s = state.act2;
				if (!s || s.mission !== g.missionId || !Array.isArray(s.radio) || s.radio.some((l) => typeof l?.text !== "string" || typeof l?.who !== "string") || ![s.losses, s.lostValue].every(Number.isFinite))
					throw Error("Uszkodzony zapis aktu III");
				g.act2 = JSON.parse(JSON.stringify(s));
				g.act2.heard ||= {};
				if (g.act2.legacy && !LEGACY[g.act2.legacy]) delete g.act2.legacy;
				g.act3Ally = state.act3Ally || null;
			}
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
