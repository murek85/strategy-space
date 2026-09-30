/* Stage F4: clearer faction differences. Each faction gets two more unique units, one unique building and
   a stronger passive trait. Free Colonies: grenadiers, service rover, field outpost, faster construction.
   Dominion: flamethrowers, tank destroyer, orbital uplink with an orbital strike, sturdier buildings.
   Faction data lives in RTS.FACTION_KIT so later factions can add their own. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.factionsInstalled) return;
		RTS.factionsInstalled = true;
		const { Game, TYPES, dist } = RTS;

		Object.assign(TYPES, {
			grenadier: { name: "Grenadierzy", hp: 95, speed: 100, range: 170, damage: 22, cooldown: 1.6, cost: 110, build: 6, radius: 10, faction: "colonies" },
			serviceRover: { name: "Łazik serwisowy", hp: 320, speed: 95, range: 0, damage: 0, cooldown: 1, cost: 170, build: 9, radius: 16, faction: "colonies" },
			flamer: { name: "Miotacze ognia", hp: 130, speed: 90, range: 85, damage: 16, cooldown: 0.35, cost: 120, build: 6, radius: 11, faction: "dominion" },
			destroyer: { name: "Niszczyciel czołgów", hp: 420, speed: 70, range: 300, damage: 60, cooldown: 2.2, cost: 260, build: 12, radius: 20, faction: "dominion" },
			outpost: { name: "Placówka polowa", hp: 600, speed: 0, range: 0, damage: 0, cooldown: 1, cost: 150, radius: 30, construction: 10, faction: "colonies", sight: 420 },
			uplink: { name: "Stacja orbitalna", hp: 1100, speed: 0, range: 0, damage: 0, cooldown: 1, cost: 400, radius: 38, construction: 25, faction: "dominion" },
		});
		RTS.INFANTRY_TYPES ??= ["trooper", "rocket", "raider"];
		for (const t of ["grenadier", "flamer"]) if (!RTS.INFANTRY_TYPES.includes(t)) RTS.INFANTRY_TYPES.push(t);
		RTS.PASSENGER_TYPES ??= ["trooper", "rocket"];
		for (const t of ["grenadier", "flamer"]) if (!RTS.PASSENGER_TYPES.includes(t)) RTS.PASSENGER_TYPES.push(t);

		// What each faction brings; the unique units' producers are in productionType below.
		RTS.FACTIONS.colonies.description =
			"Mobilność +12%, koszt −10%, wytrzymałość −8%, budowa o 20% szybsza, regeneracja poza walką. Unikalne: zwiadowca, grenadierzy, łazik serwisowy i placówka polowa.";
		RTS.FACTIONS.dominion.description =
			"Wytrzymałość +18%, obrażenia +8%, koszt +12%, ruch −12%; budynki o 25% wytrzymalsze, mniejsze obrażenia w bezruchu. Unikalne: bastion, miotacze ognia, niszczyciel czołgów i stacja orbitalna.";
		const KIT = (RTS.FACTION_KIT = {
			colonies: {
				units: ["raider", "grenadier", "serviceRover"],
				building: "outpost",
				trait: "Budowa o 20% szybsza; regeneracja jednostek poza walką.",
				build: 1.2,
			},
			dominion: {
				units: ["sentinel", "flamer", "destroyer"],
				building: "uplink",
				trait: "Budynki o 25% wytrzymalsze; mniejsze obrażenia jednostek w bezruchu.",
				buildingHp: 1.25,
			},
		});
		const FX = (RTS.FACTION_FX = {
			grenadier: { splash: 45, share: 0.4 },
			flamer: { splash: 35, share: 0.5, infantry: 1.5, buildings: 1.3, vehicles: 0.6 },
			destroyer: { vehicles: 1.6, infantry: 0.5 },
			rover: { range: 150, slots: 2, rate: 18, metalPerHp: 1 / 6 },
			outpost: { zone: 300 },
			strike: { delay: 3, radius: 110, damage: 420, cooldown: 100 },
		});
		const isInfantry = (e) => RTS.INFANTRY_TYPES.includes(e.type);
		const isVehicle = (e) => TYPES[e.type].speed > 0 && !TYPES[e.type].flying && !isInfantry(e) && e.type !== "worker";
		const ready = (e) => e && e.hp > 0 && !e.constructionLeft;
		const disabled = (g, e) => (e.disabledUntil || 0) > g.time || (e.moduleLeft || 0) > 0;
		const kitOf = (g, team) => KIT[g.factionFor(team)?.key] || null;

		const old = {};
		for (const k of ["productionType", "developmentRequirement", "canTarget", "damage", "applyDamage", "spawn", "configureSkirmish", "canBuild", "buildStructure", "tick", "serialize"]) old[k] = Game.prototype[k];
		const baseFromSave = Game.fromSave;

		Object.assign(Game.prototype, {
			productionType(type) {
				if (type === "grenadier" || type === "flamer") return "barracks";
				if (type === "serviceRover" || type === "destroyer") return "factory";
				return old.productionType.call(this, type);
			},
			developmentRequirement(type) {
				const f = TYPES[type]?.faction;
				if (f && this.scenario && f !== this.factionFor(this.me)?.key && !this.loanedUnit?.(type)) return "Jednostka innej frakcji";
				if (type === "uplink" && this.centerLevel() < 2) return "Wymaga centrum II — Kolonia (BADANIA lub ROZWÓJ / F2)";
				return old.developmentRequirement.call(this, type);
			},
			buildingFactor(team) {
				return kitOf(this, team)?.build || 1;
			},
			canTarget(a, b) {
				// The tank destroyer cannot fire at aircraft.
				if (a?.type === "destroyer" && TYPES[b.type]?.flying) return false;
				return old.canTarget.call(this, a, b);
			},
			damage(a, b) {
				let n = old.damage.call(this, a, b);
				if (!n) return n;
				if (a.type === "flamer") n *= isInfantry(b) ? FX.flamer.infantry : !TYPES[b.type].speed ? FX.flamer.buildings : isVehicle(b) ? FX.flamer.vehicles : 1;
				if (a.type === "destroyer") n *= isVehicle(b) ? FX.destroyer.vehicles : isInfantry(b) ? FX.destroyer.infantry : 1;
				return n;
			},
			// Grenades and flames also hit those standing next to the target (ground units only).
			applyDamage(attacker, target, amount) {
				const r = old.applyDamage.call(this, attacker, target, amount);
				const splash = attacker && !attacker.splashing && FX[attacker.type]?.splash ? FX[attacker.type] : null;
				if (splash && Number.isFinite(amount) && amount > 0) {
					attacker.splashing = true;
					try {
						for (const o of this.entities)
							if (o !== target && o.hp > 0 && TYPES[o.type].speed && !TYPES[o.type].flying && !this.allied(attacker.team, o.team) && o.team !== 2 && dist(o, target) < splash.splash)
								old.applyDamage.call(this, attacker, o, amount * splash.share);
					} finally {
						attacker.splashing = false;
					}
					if (attacker.type === "flamer") this.fx("flame", target.x, target.y, { fx: attacker.x, fy: attacker.y });
					else this.effects.push({ kind: "explosion", x: target.x, y: target.y, size: 28, life: 0.35, maxLife: 0.35 });
				}
				return r;
			},
			spawn(type, team, x, y) {
				const e = old.spawn.call(this, type, team, x, y);
				this.fortify(e);
				return e;
			},
			// Dominion buildings are sturdier (applied once per building).
			fortify(e) {
				const k = kitOf(this, e.team);
				if (!e.fortified && k?.buildingHp && !TYPES[e.type].speed && e.team !== 2) {
					e.hp *= k.buildingHp;
					e.maxHp *= k.buildingHp;
					e.fortified = true;
				}
			},
			configureSkirmish(input = {}) {
				const result = old.configureSkirmish.call(this, input);
				for (const e of this.entities) this.fortify(e);
				return result;
			},
			// Free ground for a building (the engine's checks without the base zone).
			freeSite(x, y, type) {
				const r = TYPES[type]?.radius || 22,
					p = { x, y };
				return (
					this.isVisible(x, y) &&
					!this.blocked(x, y, r + 8) &&
					!this.entities.some((e) => e.hp > 0 && dist(e, p) < TYPES[e.type].radius + r + 16) &&
					!this.nodes.some((n) => dist(n, p) < r + 55) &&
					![...this.ores, ...this.crystalFields].some((o) => dist(o, p) < r + 50) &&
					!this.gasFields.some((o) => dist(o, p) < r + 45)
				);
			},
			// The field outpost can stand anywhere the player sees; other buildings may also go up around outposts.
			canBuild(x, y, type = "turret") {
				const f = TYPES[type]?.faction;
				if (f && this.scenario && f !== this.factionFor(this.me)?.key) return false;
				if (type === "outpost") return !this.developmentRequirement(type) && this.freeSite(x, y, type);
				if (old.canBuild.call(this, x, y, type)) return true;
				if (["wall", "gate", "extractor"].includes(type) || this.developmentRequirement(type)) return false;
				const near = this.entities.some((e) => e.team === this.me && e.type === "outpost" && ready(e) && dist(e, { x, y }) < FX.outpost.zone);
				return near && this.freeSite(x, y, type);
			},
			buildStructure(type, x, y, ids = []) {
				const f = TYPES[type]?.faction;
				if (f && this.scenario && f !== this.factionFor(this.me)?.key) return false;
				return old.buildStructure.call(this, type, x, y, ids);
			},
			// Orbital strike from a ready uplink: a marked target, a hit after a short delay.
			strikeRequirement(id) {
				const e = this.get(id);
				if (!e || e.type !== "uplink") return "Wybierz stację orbitalną.";
				if (!ready(e)) return "Stacja w budowie.";
				if (disabled(this, e)) return "Stacja wyłączona.";
				if (this.isHuman(e.team) && this.as(e.team, () => this.power.factor) < 0.99) return "Za mało mocy.";
				const left = Math.ceil((e.strikeReady || 0) - this.time);
				if (left > 0) return `Uderzenie gotowe za ${left} s.`;
				return "";
			},
			orbitalStrike(id, x, y) {
				const e = this.get(id),
					why = this.strikeRequirement(id);
				if (why) {
					if (e && this.isHuman(e.team)) this.as(e.team, () => this.notify(why));
					return false;
				}
				if (this.isHuman(e.team) && !this.sideOf(e.team).explored[this.visionIndex(x, y)]) {
					this.as(e.team, () => this.notify("Cel uderzenia musi leżeć w zbadanym terenie."));
					return false;
				}
				e.strikeReady = this.time + FX.strike.cooldown;
				(this.strikes ||= []).push({ x: Math.round(x), y: Math.round(y), at: this.time + FX.strike.delay, team: e.team });
				if (this.isHuman(e.team)) this.as(e.team, () => this.notify("Uderzenie orbitalne — trafienie za " + FX.strike.delay + " s.", "order-move"));
				for (const h of this.humans)
					if (!this.allied(h, e.team) && this.isVisibleTo(h, x, y)) this.as(h, () => this.notify("UWAGA: namierzanie orbitalne! Uciekaj z oznaczonego obszaru.", "alarm"));
				return true;
			},
			tick(dt) {
				old.tick.call(this, dt);
				if (this.result) return;
				this.factionTick(dt);
			},
			factionTick(dt) {
				// Strikes land.
				if (this.strikes?.length) {
					const S = FX.strike;
					for (const s of this.strikes.filter((s) => this.time >= s.at)) {
						for (const o of [...this.entities])
							if (o.hp > 0 && o.team !== 2 && !this.allied(s.team, o.team) && dist(o, s) < S.radius + TYPES[o.type].radius * 0.5)
								this.applyDamage(null, o, S.damage * (1 - 0.6 * Math.min(1, dist(o, s) / S.radius)));
						this.effects.push({ kind: "explosion", x: s.x, y: s.y, size: S.radius, life: 0.9, maxLife: 0.9 });
						this.fx("emp", s.x, s.y);
					}
					this.strikes = this.strikes.filter((s) => this.time < s.at);
				}
				// Service rovers repair vehicles and buildings of their side nearby.
				const R = FX.rover;
				for (const r of this.entities) {
					if (r.type !== "serviceRover" || r.hp <= 0) continue;
					r.repairTargets = [];
					const targets = this.entities
						.filter((o) => o !== r && o.hp > 0 && o.hp < o.maxHp && !o.constructionLeft && this.allied(r.team, o.team) && (isVehicle(o) || !TYPES[o.type].speed) && dist(o, r) <= R.range)
						.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
						.slice(0, R.slots);
					for (const o of targets) {
						let amount = Math.min(o.maxHp - o.hp, R.rate * dt);
						if (this.isHuman(r.team)) {
							const side = this.sideOf(r.team);
							amount = Math.min(amount, Math.max(0, side.credits) / R.metalPerHp);
							side.credits -= amount * R.metalPerHp;
						}
						if (amount <= 0) continue;
						o.hp += amount;
						r.repairTargets.push(o.id);
						if (!(o.healFxAt > this.time - 0.8)) {
							o.healFxAt = this.time;
							this.fx("sparks", o.x, o.y - TYPES[o.type].radius * 0.4, { seed: o.id });
						}
					}
				}
			},
			serialize() {
				return { ...old.serialize.call(this), strikes: this.strikes || [] };
			},
		});

		Game.fromSave = function (state) {
			const g = baseFromSave.call(this, state);
			const strikes = state.strikes;
			if (strikes !== undefined && (!Array.isArray(strikes) || strikes.some((s) => ![s.x, s.y, s.at, s.team].every(Number.isFinite)))) throw Error("Uszkodzony zapis uderzeń orbitalnych");
			g.strikes = strikes ? JSON.parse(JSON.stringify(strikes)) : [];
			return g;
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
