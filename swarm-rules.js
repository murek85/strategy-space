/* Stage F5: the third faction — the Crystal Swarm, alien organisms woken by the artifacts.
   Cheaper, lighter, faster units that regenerate; buildings heal after a calm moment; faster hatching.
   Unique: crawler (explodes on death), spitter (corroding acid), colossus (regenerating titan, splash),
   resonance monolith (slows enemy ground units, reveals saboteurs). Also: the "enemy faction" setting
   for computer opponents. Loaded after factions-rules.js. Shared by browser and tests. */
(function (root) {
	function install(RTS) {
		if (RTS.swarmInstalled) return;
		RTS.swarmInstalled = true;
		const { Game, TYPES, dist } = RTS;

		RTS.FACTIONS.swarm = {
			name: "Rój Kryształowy",
			cost: 0.85,
			hp: 0.9,
			speed: 1.08,
			damage: 1,
			description:
				"Koszt −15%, wytrzymałość −10%, ruch +8%. Wszystko się regeneruje (jednostki stale, budynki po 6 s spokoju), wylęganie o 15% szybsze. Unikalne: pełzacz, pluwacz, kolos i monolit rezonansowy.",
		};
		Object.assign(TYPES, {
			crawler: { name: "Pełzacz", hp: 70, speed: 150, range: 30, damage: 14, cooldown: 0.5, cost: 45, build: 2.5, radius: 9, faction: "swarm" },
			spitter: { name: "Pluwacz", hp: 110, speed: 95, range: 200, damage: 20, cooldown: 1.2, cost: 95, build: 5, radius: 12, faction: "swarm" },
			colossus: { name: "Kolos", hp: 1400, speed: 45, range: 150, damage: 45, cooldown: 1.8, cost: 480, build: 20, radius: 28, faction: "swarm" },
			monolith: { name: "Monolit rezonansowy", hp: 1200, speed: 0, range: 0, damage: 0, cooldown: 1, cost: 300, radius: 34, construction: 20, faction: "swarm" },
		});
		for (const t of ["crawler", "spitter"]) if (!RTS.INFANTRY_TYPES.includes(t)) RTS.INFANTRY_TYPES.push(t);
		RTS.FACTION_KIT.swarm = {
			units: ["crawler", "spitter", "colossus"],
			building: "monolith",
			trait: "Regeneracja jednostek i budynków; wylęganie o 15% szybsze; tańsze, lżejsze i szybsze jednostki.",
			production: 0.85,
		};
		const SW = (RTS.SWARM = {
			unitRegen: 1.5,
			buildingRegen: 3,
			buildingCalm: 6,
			colossusRegen: 6,
			burst: { radius: 50, damage: 40 },
			corrosion: { time: 4, extra: 1.15, buildings: 1.4 },
			colossus: { splash: 50, share: 0.4 },
			monolith: { range: 260, slow: 0.65 },
		});
		// Swarm names of the shared buildings and units (the obsidian guardians look); the rules keep one type list.
		RTS.SWARM_NAMES = {
			hq: "Brama Roju",
			barracks: "Para strażnic",
			factory: "Ściana odlewni",
			turret: "Obelisk",
			depot: "Skarbiec",
			extractor: "Studnia gazu",
			reactor: "Iglica mocy",
			lab: "Archiwum",
			battery: "Kamienie mocy",
			workshop: "Łuk naprawczy",
			hangar: "Gniazdo lotu",
			flak: "Iglice przeciwlotnicze",
			medbay: "Menhir odnowy",
			shieldgen: "Kołnierz osłon",
			salvageYard: "Rumowisko",
			worker: "Kamieniarz",
			trooper: "Strażnik",
			rocket: "Grotownik",
			saboteur: "Cienie",
			tank: "Kroczący",
			heavy: "Ciężki kroczący",
			artillery: "Kroczący z iglicą",
			transport: "Nosiciel",
			skyguard: "Kroczący przeciwlotniczy",
			interceptor: "Grot lotny",
			bomber: "Płyta lotna",
			drone: "Odłamek zwiadu",
		};
		RTS.FACTION_FX.colossus = { splash: SW.colossus.splash, share: SW.colossus.share };
		// Computer opponents' faction (scenarios): automatic (the opposite of the player's) or a chosen one.
		RTS.ENEMY_FACTIONS = { auto: "Przeciwna do Twojej", colonies: "Wolne Kolonie", dominion: "Dominium", swarm: "Rój Kryształowy" };

		const old = {};
		for (const k of ["factionFor", "configureSkirmish", "productionType", "damage", "applyDamage", "movementFactor", "enqueue", "tick", "canTarget", "unitName"]) old[k] = Game.prototype[k];
		const swarmOf = (g, team) => g.factionFor(team)?.key === "swarm";

		Object.assign(Game.prototype, {
			factionFor(team) {
				const f = old.factionFor.call(this, team);
				// A network game: every player chose a faction.
				if (!f || !this.scenario || this.players) return f;
				const choice = this.scenario.enemyFaction;
				// Enemy sides get the chosen faction; a Swarm player meets the Dominium by default.
				if (team !== 0 && team !== 2 && !this.allied(0, team)) {
					const key = choice && choice !== "auto" && RTS.FACTIONS[choice] ? choice : this.scenario.faction === "swarm" ? "dominion" : null;
					if (key) return { key, ...RTS.FACTIONS[key] };
				}
				return f;
			},
			configureSkirmish(input = {}) {
				// The enemy faction must be known before the bases are spawned (hit points, looks).
				const choice = RTS.ENEMY_FACTIONS[input.enemyFaction] ? input.enemyFaction : "auto";
				this.pendingEnemyFaction = choice;
				const result = old.configureSkirmish.call(this, input);
				this.scenario.enemyFaction = choice;
				delete this.pendingEnemyFaction;
				return result;
			},
			// Names follow the side's faction: the player's cards by default, a map entity by its own faction.
			unitName(type, team = this.me) {
				return (swarmOf(this, team) && RTS.SWARM_NAMES[type]) || old.unitName.call(this, type);
			},
			entityName(e) {
				return (e.faction === "swarm" && RTS.SWARM_NAMES[e.type]) || TYPES[e.type].name;
			},
			productionType(type) {
				if (type === "crawler" || type === "spitter") return "barracks";
				if (type === "colossus") return "factory";
				return old.productionType.call(this, type);
			},
			// Faster hatching for the Swarm player (the commander applies it to its own queue).
			enqueue(type, preferredId = null) {
				const ok = old.enqueue.call(this, type, preferredId);
				if (ok && swarmOf(this, this.me) && TYPES[type]?.build) this.queue.at(-1).left *= RTS.FACTION_KIT.swarm.production;
				return ok;
			},
			damage(a, b) {
				let n = old.damage.call(this, a, b);
				if (!n) return n;
				if (a.type === "spitter" && !TYPES[b.type].speed) n *= SW.corrosion.buildings;
				if ((b.corrodedUntil || 0) > this.time) n *= SW.corrosion.extra;
				return n;
			},
			applyDamage(attacker, target, amount) {
				const alive = target.hp > 0;
				const r = old.applyDamage.call(this, attacker, target, amount);
				if (attacker?.type === "spitter" && target.hp > 0) target.corrodedUntil = this.time + SW.corrosion.time;
				// A crawler bursts when it dies, hurting enemy ground units around it.
				if (alive && target.hp <= 0 && target.type === "crawler" && !target.burst) {
					target.burst = true;
					for (const o of this.entities)
						if (o !== target && o.hp > 0 && TYPES[o.type].speed && !TYPES[o.type].flying && o.team !== 2 && !this.allied(target.team, o.team) && dist(o, target) < SW.burst.radius)
							old.applyDamage.call(this, null, o, SW.burst.damage);
					this.effects.push({ kind: "explosion", x: target.x, y: target.y, size: 34, life: 0.4, maxLife: 0.4 });
					this.fx("dust", target.x, target.y, { color: "#c77ae0" });
				}
				return r;
			},
			// The monolith's resonance slows enemy ground units nearby.
			movementFactor(e) {
				let n = old.movementFactor.call(this, e);
				if (TYPES[e.type].speed && !TYPES[e.type].flying && this.monoliths?.length)
					for (const m of this.monoliths)
						if (!this.allied(m.team, e.team) && e.team !== 2 && dist(m, e) < SW.monolith.range) {
							n *= SW.monolith.slow;
							break;
						}
				return n;
			},
			tick(dt) {
				// Active monoliths, once per step (read by movementFactor).
				this.monoliths = this.entities.filter((e) => e.type === "monolith" && e.hp > 0 && !e.constructionLeft && !((e.disabledUntil || 0) > this.time));
				old.tick.call(this, dt);
				if (this.result) return;
				for (const e of this.entities) {
					if (e.hp <= 0 || e.hp >= e.maxHp || e.constructionLeft || !swarmOf(this, e.team)) continue;
					const calm = this.time - (e.lastDamaged ?? -99);
					if (e.type === "colossus") e.hp = Math.min(e.maxHp, e.hp + SW.colossusRegen * dt);
					else if (TYPES[e.type].speed) {
						if (calm > 2) e.hp = Math.min(e.maxHp, e.hp + SW.unitRegen * dt);
					} else if (calm > SW.buildingCalm) e.hp = Math.min(e.maxHp, e.hp + SW.buildingRegen * dt);
				}
				// Saboteurs cannot hide near a monolith.
				for (const m of this.monoliths)
					for (const e of this.entities)
						if (e.type === "saboteur" && e.stealth && !this.allied(m.team, e.team) && dist(m, e) < SW.monolith.range) {
							e.stealth = false;
							e.revealedUntil = this.time + 1;
						}
			},
		});
		// The advanced rules decide the enemy faction inside configureSkirmish; the pending choice is read there too.
		const factionFor = Game.prototype.factionFor;
		Game.prototype.factionFor = function (team) {
			if (this.pendingEnemyFaction && this.scenario && !this.scenario.enemyFaction) this.scenario.enemyFaction = this.pendingEnemyFaction;
			return factionFor.call(this, team);
		};
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
