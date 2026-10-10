/* Campaign decisions: besides the fate of the Hefajstos complex (chapter VI, campaign-act2/act3), three more
   story choices taken during a chapter change the chapters after it and the final epilogue
   (CAMPAIGN_DECISIONS):
   - I "Kody Dominium" (when two relays are held): an appeal to the colonists (volunteers in II–III, but the
     Dominium is warned) or keeping the codes secret (earlier intercepts, the enemy base on the map);
   - III "Upadek cytadeli" (the citadel's centre below 40%): its arsenal (metal and a tank in IV–VI) or its
     prisoners (their intelligence: weaker enemy buildings and reinforcements twice in IV–VI);
   - VIII "Propozycja Varna" (the hill held for a minute, or from the 5th minute): trust (Varn's escort and a
     faster orbital strike in IX) or distance (metal and artillery of one's own in IX).
   The choice is kept in the save and, on victory, in the campaign progress (choices); applied once at the
   start of an affected chapter (with the campaign level and the badge bonus). Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.campaignChoicesInstalled) return;
		RTS.campaignChoicesInstalled = true;
		const { Game, TYPES, dist } = RTS;

		const DECISIONS = (RTS.CAMPAIGN_DECISIONS = {
			colony1: {
				eyebrow: "DECYZJA DOWÓDCY / KODY DOMINIUM",
				title: "Nadać apel<br>czy milczeć?",
				prompt: "Lira odczytała z przekaźników kody łączności Dominium. Możemy nimi nadać apel do kolonistów całego sektora — albo zachować je w tajemnicy i podsłuchiwać wroga. Decyzja zmienia rozdziały II i III.",
				when: (g) => g.nodes.filter((n) => n.owner === g.me).length >= 2,
				radio: ["lira", "Mam kody łączności Dominium. Co z nimi zrobimy?"],
				affects: ["colony2", "colony3"],
				options: {
					appeal: {
						label: "NADAJ APEL DO KOLONISTÓW",
						text: "Ochotnicy dołączą do Ciebie: 2 piechurów i rakietowiec na start rozdziałów II i III. Dominium usłyszy apel — jego dowódca zacznie z 150 metalu więcej.",
						name: "Głos pogranicza",
						radio: { colony2: ["lira", "Na apel odpowiedzieli ochotnicy z Vesperu — trzech czeka już przy bazie. Dominium też słuchało: szykuj się na mocniejszy opór."], colony3: ["lira", "Kolejni ochotnicy z Nadiru dołączają do nas. Dominium wie, że nadchodzimy."] },
					},
					secret: {
						label: "ZACHOWAJ KODY W TAJEMNICY",
						text: "Nasłuch: rozkazy ataków przechwycisz 45 s wcześniej zamiast 25 s, a baza wroga będzie od startu zaznaczona na mapie w rozdziałach II i III.",
						name: "Cichy nasłuch",
						radio: { colony2: ["lira", "Kody wciąż działają — widzę bazę Dominium na mapie i słyszę ich rozkazy z wyprzedzeniem."], colony3: ["lira", "Nasłuch cytadeli działa. Każdy ich rozkaz usłyszymy dużo wcześniej."] },
					},
				},
			},
			colony3: {
				eyebrow: "DECYZJA DOWÓDCY / UPADEK CYTADELI",
				title: "Arsenał<br>czy jeńcy?",
				prompt: "Cytadela Węzła pada. Zanim się zawali, zdążymy zabezpieczyć tylko jedno: magazyny broni albo celę z oficerami Dominium. Decyzja zmienia rozdziały IV–VI.",
				when: (g) => {
					const hq = g.hq(1);
					return !!hq && hq.hp < hq.maxHp * 0.4;
				},
				radio: ["lira", "Cytadela się sypie! Zdążymy wynieść tylko jedno — decyduj!"],
				affects: ["colony4", "colony5", "colony6"],
				options: {
					arsenal: {
						label: "ZABEZPIECZ ARSENAŁ",
						text: "Na start rozdziałów IV–VI: 250 metalu więcej i dodatkowy czołg.",
						name: "Arsenał cytadeli",
						radio: { colony4: ["lira", "Zapasy z arsenału cytadeli: 250 metalu i czołg gotowy do drogi."], colony5: ["vale", "Czołg z arsenału Nadiru jedzie z konwojem — i 250 metalu na naprawy."], colony6: ["lira", "Ostatnie zapasy z arsenału: metal i czołg. Wykorzystaj je dobrze."] },
					},
					prisoners: {
						label: "OCAL JEŃCÓW",
						text: "Oficerowie zdradzą słabe punkty: wieże i budynki Dominium w rozdziałach IV–VI mają o 10% mniej wytrzymałości (najwięcej znaczy to w kompleksie Hefajstos), a posiłki z orbity mogą nadejść dwa razy.",
						name: "Rozmowy z jeńcami",
						radio: { colony4: ["tessa", "Jeńcy z Nadiru wskazali słabe punkty budowli Dominium. I obiecali, że ich ludzie nie strzelą do ewakuacji."], colony5: ["vale", "Wiemy od jeńców, gdzie Dominium oszczędza na pancerzu. A orbita ma dla nas dwa zrzuty posiłków."], colony6: ["koss", "Słyszałem, że oszczędziliście oficerów z Nadiru. Może jednak można wam ufać."] },
					},
				},
			},
			colony8: {
				eyebrow: "DECYZJA DOWÓDCY / PROPOZYCJA VARNA",
				title: "Zaufać<br>Varnowi?",
				prompt: "Varn proponuje wspólne dowództwo w ostatnim natarciu: jego bastiony i pierwszeństwo przy stacji orbitalnej (uderzenie ładuje się szybciej) — w zamian za kody Liry. Decyzja zmienia rozdział IX i epilog kampanii.",
				// The side's best time on the hill: the player's or Varn's (0.171.12; his time wins the chapter too).
				when: (g) => Math.max(0, ...Object.entries(g.modeState?.scores || {}).filter(([t]) => g.allied(0, Number(t))).map(([, v]) => v)) >= 60 || g.time >= 300,
				radio: ["varn", "Kolonie… mam propozycję, zanim pójdziemy na Pyrrhos."],
				affects: ["colony9"],
				options: {
					trust: {
						label: "PRZYJMIJ PROPOZYCJĘ",
						text: "W rozdziale IX dołączają do Ciebie 2 bastiony Dominium, a uderzenie orbitalne ładuje się o 30% szybciej.",
						name: "Wspólne dowództwo",
						radio: { colony9: ["varn", "Moje bastiony są wasze, a stacja orbitalna ładuje się dla was w pierwszej kolejności."] },
					},
					distance: {
						label: "ZACHOWAJ DYSTANS",
						text: "Kody zostają u Liry. W rozdziale IX zaczynasz z 400 metalu więcej i własną artylerią.",
						name: "Własną drogą",
						radio: { colony9: ["lira", "Zostajemy przy swoim. Mamy własną artylerię i zapasy — Varn musi wystarczyć jako sąsiad."] },
					},
				},
			},
		});
		// Chapters each decision changes: [chapter] → decision ids.
		const AFFECTED = {};
		for (const [id, D] of Object.entries(DECISIONS)) for (const ch of D.affects) (AFFECTED[ch] ||= []).push(id);
		RTS.CAMPAIGN_DECISION_EFFECTS = AFFECTED;

		const old = {};
		for (const k of ["tick", "applyCampaignChoices", "act2Epilogue", "orbitalStrike", "serialize"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;

		Object.assign(Game.prototype, {
			tick(dt) {
				old.tick.call(this, dt);
				const D = DECISIONS[this.missionId];
				if (!D || this.result || !this.campaignLevel || this.campaignDecision) return;
				if (D.when(this)) {
					this.campaignDecision = { state: "pending", choice: null };
					this.campaignSay?.(...D.radio);
				}
			},
			// The decision of this chapter (null before it comes up).
			campaignDecisionInfo() {
				const D = DECISIONS[this.missionId];
				return D && this.campaignDecision ? { ...D, ...this.campaignDecision } : null;
			},
			decideCampaign(choice) {
				const D = DECISIONS[this.missionId];
				if (!D || this.campaignDecision?.state !== "pending" || !D.options[choice]) return false;
				this.campaignDecision = { state: "done", choice };
				this.notify(`Decyzja: ${D.options[choice].name}. Skutki w kolejnych rozdziałach.`, "ready");
				return true;
			},
			// The choice to keep in the campaign progress on victory.
			campaignChoice() {
				return this.campaignDecision?.state === "done" ? this.campaignDecision.choice : this.act2?.choice || null;
			},
			// Consequences of earlier decisions for this chapter, once.
			applyCampaignChoices(choices = {}) {
				const r = old.applyCampaignChoices.call(this, choices);
				const ids = AFFECTED[this.missionId];
				if (!ids || this.campaignLegacy) return r;
				this.campaignLegacy = {};
				// Only at the start of a chapter (an older save keeps what it had).
				if (this.time > 1) return r;
				const me = this.humans[0],
					hq = this.hq(me);
				const near = (type) => {
					if (!hq) return null;
					const toward = Math.atan2(this.H / 2 - hq.y, this.W / 2 - hq.x);
					for (let k = 0; k < 16; k++) {
						const a = toward + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.4,
							p = this.pathTo(hq, { x: hq.x + Math.cos(a) * 160, y: hq.y + Math.sin(a) * 160 }).at(-1);
						if (p && this.entities.every((e) => e.hp <= 0 || dist(e, p) > TYPES[e.type].radius + TYPES[type].radius + 8)) return this.spawn(type, me, p.x, p.y);
					}
					return this.spawn(type, me, hq.x + 120, hq.y);
				};
				for (const id of ids) {
					const choice = choices[id],
						O = DECISIONS[id].options[choice];
					if (!O) continue;
					this.campaignLegacy[id] = choice;
					if (choice === "appeal") {
						for (const type of ["trooper", "trooper", "rocket"]) near(type);
						const T = this.enemyAi?.teams?.[1];
						if (T) T.metal += 150;
					} else if (choice === "secret") {
						this.intelAhead = 45;
						const foe = this.hq(1);
						if (foe)
							for (let y = foe.y - 500; y <= foe.y + 500; y += 40)
								for (let x = foe.x - 500; x <= foe.x + 500; x += 40)
									if (x > 0 && y > 0 && x < this.W && y < this.H && Math.hypot(x - foe.x, y - foe.y) < 500) this.explored[this.visionIndex(x, y)] = 1;
					} else if (choice === "arsenal") {
						this.credits += 250;
						near("tank");
					} else if (choice === "prisoners") {
						for (const e of this.entities)
							if (e.team !== 2 && e.hp > 0 && !this.isHuman(e.team) && !TYPES[e.type].speed) {
								e.maxHp *= 0.9;
								e.hp = Math.min(e.hp, e.maxHp);
							}
						if (this.campaignEvents) this.campaignEvents.reinforceLeft = 2;
					} else if (choice === "trust") {
						// Varn's bastions, in the Dominium's colours (0.171.12).
						for (const e of [near("sentinel"), near("sentinel")]) if (e) e.faction = "dominion";
						this.strikeBoost = 0.7;
					} else if (choice === "distance") {
						this.credits += 400;
						near("artillery");
					}
					const line = O.radio[this.missionId];
					if (line) this.campaignSay?.(line[0], line[1], false);
				}
				return r;
			},
			orbitalStrike(id, x, y) {
				const done = old.orbitalStrike.call(this, id, x, y);
				const e = this.get(id);
				if (done && this.strikeBoost && e && this.isHuman(e.team)) e.strikeReady = this.time + (e.strikeReady - this.time) * this.strikeBoost;
				return done;
			},
			// The final epilogue also tells of Varn and of the codes.
			act2Epilogue() {
				const text = old.act2Epilogue.call(this);
				if (this.missionId !== "colony9" || !this.campaignLegacy) return text;
				const extra = { trust: "Wspólne dowództwo przetrwało bitwę: Varn i Lira podpisują rozejm na całym pograniczu. ", distance: "Kolonie odchodzą z Pyrrhosa własną drogą — Varn salutuje z daleka, ale rozejm pozostaje kruchy. " }[this.campaignLegacy.colony8];
				return text + (extra ? " " + extra : "");
			},
			serialize() {
				return { ...old.serialize.call(this), campaignDecision: this.campaignDecision || null, campaignLegacy: this.campaignLegacy || null, intelAhead: this.intelAhead || null, strikeBoost: this.strikeBoost || null };
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			const D = DECISIONS[g.missionId],
				d = state.campaignDecision;
			if (D && d && ["pending", "done"].includes(d.state) && (d.state === "pending" || D.options[d.choice])) g.campaignDecision = { state: d.state, choice: d.state === "done" ? d.choice : null };
			if (state.campaignLegacy && typeof state.campaignLegacy === "object") g.campaignLegacy = { ...state.campaignLegacy };
			if (Number.isFinite(state.intelAhead)) g.intelAhead = state.intelAhead;
			if (Number.isFinite(state.strikeBoost)) g.strikeBoost = state.strikeBoost;
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
