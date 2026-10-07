/* Campaign commander: in chosen chapters of acts I and II (CAMPAIGN_AI) the Dominium is run by the commander
   AI of enemy-ai.js — it mines, builds and rebuilds its base, pays for its army, defends, takes relays and
   plans its attacks — instead of the scripted waves, at the campaign difficulty (easy, normal, hard) and
   tuned per chapter. The campaign level (chosen in the briefing, kept with the campaign progress) also
   scales the enemy's strength in every chapter (hit points and damage, as the scenario difficulty does)
   and sets the commander of act III. The other chapters keep their scripts. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.campaignAiInstalled) return;
		RTS.campaignAiInstalled = true;
		const { Game, MISSIONS } = RTS;
		const LEVELS = ["easy", "normal", "hard"],
			SCALE = { easy: 0.85, normal: 1, hard: 1.15 };

		// Per chapter: the commander's timing and strength against its level (×, on top of the Dominium's style,
		// which already makes attacks later, rarer and bigger), its starting metal, whether it may build a hangar,
		// and the line for the briefing.
		const CHAPTERS = (RTS.CAMPAIGN_AI = {
			// II: the player needs time to raise two depots and hold two relays — a later first attack, smaller
			// waves; the commander contests the relays.
			colony2: { firstAttack: 1.15, interval: 0.95, attackSize: 0.85, army: 0.85, startMetal: 250, hangar: false, facts: "650 metalu · dowódca AI Dominium<br>buduje, zbiera rudę i walczy o przekaźniki" },
			// III: the citadel of the blockade, the finale of act I — close to the level's plan, a little gentler.
			colony3: { firstAttack: 0.9, interval: 0.85, attackSize: 0.9, army: 0.95, startMetal: 300, hangar: true, facts: "650 metalu · dowódca AI Dominium<br>rozbudowuje cytadelę i kontratakuje" },
			// VI: the complex and its fauna press the player too — a little rarer attacks.
			colony6: { firstAttack: 0.85, interval: 0.85, attackSize: 1, army: 1, startMetal: 350, hangar: false, facts: "1100 metalu · dowódca AI Dominium<br>Decyzja zmienia epilog i premię" },
		});
		for (const [id, C] of Object.entries(CHAPTERS))
			if (MISSIONS[id]) {
				MISSIONS[id].commander = true;
				if (MISSIONS[id].facts) MISSIONS[id].facts = [MISSIONS[id].facts[0], C.facts];
				else MISSIONS[id].commanderFacts = C.facts;
			}
		RTS.CAMPAIGN_LEVELS = LEVELS;

		const old = {};
		for (const k of ["aiActive", "aiLevel", "aiStyleKey", "difficultyScale", "spawn", "serialize"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;

		Object.assign(Game.prototype, {
			aiActive() {
				return old.aiActive.call(this) || (!!this.enemyAi && !!this.campaignAi);
			},
			// The campaign's enemy is the Dominium: its commander keeps the Dominium's style ("Twierdza": more
			// towers, rarer but bigger attacks, bastions and heavy machines) without the scenario faction's rules.
			aiStyleKey(team) {
				return this.campaignAi && team === 1 ? "dominion" : old.aiStyleKey.call(this, team);
			},
			aiLevel(team = null) {
				const L = old.aiLevel.call(this, team),
					C = this.campaignAi && CHAPTERS[this.missionId];
				if (!C) return L;
				return {
					...L,
					firstAttack: L.firstAttack * C.firstAttack,
					interval: L.interval * C.interval,
					attackSize: [Math.max(3, Math.round(L.attackSize[0] * C.attackSize)), L.attackSize[1] * C.attackSize, Math.max(4, Math.round(L.attackSize[2] * C.attackSize))],
					army: [L.army[0] * C.army, L.army[1] * C.army, Math.round(L.army[2] * C.army)],
					minAttack: Math.max(3, Math.round(L.minAttack * C.attackSize)),
					hangarAt: C.hangar ? L.hangarAt : null,
					// No orbital uplink in the campaign chapters (the strike belongs to Varn in act III).
					uplinkAt: null,
				};
			},
			difficultyScale() {
				return !this.scenario && this.campaignLevel ? SCALE[this.campaignLevel] : old.difficultyScale.call(this);
			},
			spawn(type, team, x, y) {
				const e = old.spawn.call(this, type, team, x, y);
				// Without a scenario (acts I and II) the faction rules do not scale the enemy: do it here.
				if (!this.scenario && this.campaignLevel && team !== 2 && !this.isHuman(team)) {
					const k = SCALE[this.campaignLevel];
					e.hp *= k;
					e.maxHp *= k;
				}
				return e;
			},
			// The campaign level, once at the start of a chapter: scales the enemy already on the map, hands the
			// Dominium to the commander in the chapters of CAMPAIGN_AI and times the act III commander by it.
			applyCampaignLevel(level) {
				const m = MISSIONS[this.missionId];
				if (!m?.campaign || this.campaignLevel || this.time > 0) return false;
				level = LEVELS.includes(level) ? level : "normal";
				const before = this.difficultyScale();
				this.campaignLevel = level;
				if (this.scenario) this.scenario.difficulty = level;
				const ratio = this.difficultyScale() / before;
				if (ratio !== 1)
					for (const e of this.entities)
						if (e.team !== 2 && !this.isHuman(e.team)) {
							e.hp *= ratio;
							e.maxHp *= ratio;
						}
				const C = CHAPTERS[this.missionId];
				if (C && !this.scenario) {
					this.campaignAi = { chapter: this.missionId };
					this.setupEnemyAi();
					for (const T of Object.values(this.enemyAi.teams)) T.metal = C.startMetal;
				} else if (this.enemyAi) {
					const pace = this.modeState?.mode === "defense" ? 0.85 : 1;
					for (const T of Object.values(this.enemyAi.teams)) T.nextAttack = this.time + this.aiLevel(T.team).firstAttack * pace;
					this.nextWave = this.aiNextAttack();
				}
				return true;
			},
			serialize() {
				return { ...old.serialize.call(this), campaignLevel: this.campaignLevel || null, campaignAi: this.campaignAi || null };
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			if (LEVELS.includes(state.campaignLevel)) g.campaignLevel = state.campaignLevel;
			if (state.campaignAi && CHAPTERS[g.missionId] && !g.scenario) {
				const s = state.enemyAi;
				if (!s || typeof s !== "object" || !s.teams || Object.values(s.teams).some((T) => ![T.team, T.metal, T.nextAttack, T.attackNo, T.think].every(Number.isFinite) || !T.rally))
					throw Error("Uszkodzony zapis przeciwnika");
				g.campaignAi = { chapter: g.missionId };
				g.enemyAi = JSON.parse(JSON.stringify(s));
				for (const T of Object.values(g.enemyAi.teams)) {
					T.upgrades ||= {};
					T.lastThreat ??= -99;
					T.raidAt ??= RTS.AI.raidFrom;
					T.mined ??= 0;
					T.spent ??= 0;
				}
				g.nextWave = g.aiNextAttack();
			}
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
