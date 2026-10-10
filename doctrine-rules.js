/* Centre level III — the Fortress — and the factions' doctrines (0.147).
   - "Centrum III — Twierdza": research at the command centre after the Colony, with a laboratory standing;
     600 metal, 150 gas, 100 crystals, 45 s. The centre grows 50% sturdier and the side earns 4 metal/s more;
     the doctrines of the side's faction open. It locks nothing that was available before.
   - Doctrines: two for each faction, one to choose — the choice is final (the other locks for the rest of
     the operation; the interface warns before it starts). No doctrine is best everywhere:
       Free Colonies — Logistyka mobilna (ground units +15% speed, production +25% faster) or Fortyfikacja
         przyczółków (units near own buildings and own relays take 20% less damage, defence towers +25%);
       Dominion — Ciężki ostrzał (vehicles, ships and defence buildings +20% damage) or Silniejsze osłony (all
         units and buildings take 15% less damage);
       the Swarm — Nawała (production +30% faster, +10% speed) or Pancerz chitynowy (17% less damage, as
         +20% toughness).
     A side without a faction of a scenario (the campaign) takes the Colonies' doctrines.
   - Human sides research them; the computer commander (enemy-ai.js, since 0.150) takes the Fortress and a
     doctrine of its own on normal and hard, kept in its own upgrades (enemyAi.teams[team].upgrades) — the
     effects below read both. Saved with the side's upgrades.
   Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.doctrinesInstalled) return;
		RTS.doctrinesInstalled = true;
		const { Game, TYPES, RESEARCH, dist } = RTS;
		const FORTRESS = (RTS.FORTRESS = { hpFactor: 1.5, income: 4 });
		RESEARCH.fortress = {
			name: "Centrum III — Twierdza",
			building: "hq",
			metal: 600,
			gas: 150,
			crystals: 100,
			time: 45,
			description: "Awans Kolonii do Twierdzy: centrum o 50% wytrzymalsze, +4 metalu/s. Otwiera wybór doktryny frakcji. Wymaga laboratorium.",
			done: "Twierdza gotowa: centrum o 50% wytrzymalsze, +4 metalu/s. Wybierz doktrynę w BADANIACH.",
		};
		const WARNING = " Wybór ostateczny: druga doktryna zostanie zablokowana do końca operacji.";
		const DOCTRINES = (RTS.DOCTRINES = {
			colonies: [
				{ id: "doctrineMobility", name: "Doktryna: Logistyka mobilna", effect: "Jednostki naziemne +15% szybkości, produkcja o 25% szybsza.", speed: 1.15, groundOnly: true, production: 1.25 },
				{ id: "doctrineBridgehead", name: "Doktryna: Fortyfikacja przyczółków", effect: "Jednostki w promieniu 220 od własnych budynków i przekaźników otrzymują o 20% mniej obrażeń; wieże obronne +25% obrażeń.", hold: 0.8, holdRadius: 220, towers: 1.25 },
			],
			dominion: [
				{ id: "doctrineBarrage", name: "Doktryna: Ciężki ostrzał", effect: "Pojazdy, okręty i budynki obronne zadają o 20% więcej obrażeń.", heavy: 1.2 },
				{ id: "doctrineShields", name: "Doktryna: Silniejsze osłony", effect: "Wszystkie jednostki i budynki otrzymują o 15% mniej obrażeń.", armor: 0.85 },
			],
			swarm: [
				{ id: "doctrineTide", name: "Doktryna: Nawała", effect: "Produkcja o 30% szybsza, jednostki +10% szybkości.", speed: 1.1, production: 1.3 },
				{ id: "doctrineCarapace", name: "Doktryna: Pancerz chitynowy", effect: "Jednostki i budynki otrzymują o 17% mniej obrażeń (jak +20% wytrzymałości).", armor: 0.83 },
			],
			// The Watchers of the Abyss (watchers-rules.js, 0.154).
			watchers: [
				{ id: "doctrineGatelight", name: "Doktryna: Światło Bramy", effect: "Pojazdy, statki i budynki obronne zadają o 20% więcej obrażeń.", heavy: 1.2 },
				{ id: "doctrineAbyssWard", name: "Doktryna: Tarcze Otchłani", effect: "Wszystkie jednostki i budynki otrzymują o 15% mniej obrażeń.", armor: 0.85 },
			],
		});
		const ALL = Object.entries(DOCTRINES).flatMap(([faction, list]) => list.map((d) => ({ ...d, faction })));
		const BY_ID = Object.fromEntries(ALL.map((d) => [d.id, d]));
		for (const d of ALL)
			RESEARCH[d.id] = {
				name: d.name,
				building: "hq",
				metal: 450,
				gas: 150,
				crystals: 150,
				time: 40,
				faction: d.faction,
				doctrine: true,
				description: d.effect + WARNING,
				done: d.name + " przyjęta. " + d.effect,
			};
		const isInfantry = (e) => (RTS.INFANTRY_TYPES || ["trooper", "rocket", "raider"]).includes(e.type);
		const isHeavy = (e) => {
			const s = TYPES[e.type];
			// Vehicles and ships (not infantry, aircraft or robots) and the buildings that fire.
			return s.speed ? !s.flying && !isInfantry(e) && e.type !== "worker" : s.damage > 0;
		};

		const old = {};
		for (const k of ["centerLevel", "researchStatus", "damage", "movementFactor", "sideTick"]) old[k] = Game.prototype[k];

		Object.assign(Game.prototype, {
			// The faction whose doctrines a side may take (the Colonies' without a scenario faction).
			doctrineFaction(team = this.me) {
				const key = this.factionFor?.(team)?.key;
				return DOCTRINES[key] ? key : "colonies";
			},
			// The doctrine a side took (its data), or null.
			doctrineOf(team) {
				const ai = this.enemyAi?.teams?.[team]?.upgrades;
				for (const d of ALL) if (this.upgradeOf(team, d.id) || ai?.[d.id]) return d;
				return null;
			},
			doctrines(team = this.me) {
				return DOCTRINES[this.doctrineFaction(team)];
			},
			centerLevel() {
				return this.upgrades?.fortress ? 3 : old.centerLevel.call(this);
			},
			researchStatus(kind) {
				const base = { allowed: false, required: "hq", progress: 0, state: "locked" };
				if (kind === "fortress" && !this.upgrades.fortress && this.research?.kind !== "fortress" && !this.result) {
					if (old.centerLevel.call(this) < 2) return { ...base, reason: "Wymaga centrum II — Kolonia" };
					if (!this.ready("lab")) return { ...base, reason: "Wymaga: Laboratorium" };
				}
				const d = BY_ID[kind];
				if (d && !this.upgrades[kind] && this.research?.kind !== kind && !this.result) {
					if (d.faction !== this.doctrineFaction()) return { ...base, reason: "Doktryna innej frakcji" };
					if (!this.upgrades.fortress) return { ...base, reason: "Wymaga centrum III — Twierdza" };
					const chosen = ALL.find((o) => o.id !== kind && (this.upgrades[o.id] || this.research?.kind === o.id));
					if (chosen) return { ...base, reason: (this.upgrades[chosen.id] ? "Wybrano już: " : "Trwa przyjmowanie: ") + chosen.name.replace("Doktryna: ", "") };
				}
				return old.researchStatus.call(this, kind);
			},
			// Production speed of the acting side (engine.js sideTick).
			productionRate() {
				return this.doctrineOf(this.me)?.production || 1;
			},
			movementFactor(e) {
				let n = old.movementFactor.call(this, e);
				const d = this.doctrineOf(e.team);
				if (d?.speed && !(d.groundOnly && TYPES[e.type]?.flying)) n *= d.speed;
				return n;
			},
			damage(a, b) {
				let n = old.damage.call(this, a, b);
				if (!n || !a || !b) return n;
				const da = this.doctrineOf(a.team),
					db = this.doctrineOf(b.team);
				if (da?.heavy && isHeavy(a)) n *= da.heavy;
				if (da?.towers && !TYPES[a.type].speed && TYPES[a.type].damage > 0) n *= da.towers;
				if (db?.armor) n *= db.armor;
				if (db?.hold && TYPES[b.type].speed && this.holdingGround(b, db.holdRadius)) n *= db.hold;
				return n;
			},
			// Near one of its side's buildings or relays (Fortyfikacja przyczółków).
			holdingGround(e, radius) {
				return (
					(this.nodes || []).some((n) => n.owner != null && this.sideLeader(n.owner) === this.sideLeader(e.team) && dist(n, e) < radius) ||
					this.entities.some((o) => o.team === e.team && o.hp > 0 && !TYPES[o.type].speed && !o.constructionLeft && dist(o, e) < radius + TYPES[o.type].radius)
				);
			},
			// The Fortress: the extra income, and the centre made sturdier once.
			sideTick(dt) {
				old.sideTick.call(this, dt);
				if (!this.upgrades.fortress) return;
				this.income += FORTRESS.income;
				this.credits += FORTRESS.income * dt;
				this.recordIncome("passive", FORTRESS.income * dt);
				const hq = this.hq(this.me);
				if (hq && !hq.fortress) {
					hq.fortress = true;
					hq.hp *= FORTRESS.hpFactor;
					hq.maxHp *= FORTRESS.hpFactor;
				}
			},
		});
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
