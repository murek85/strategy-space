/* H7 (0.160): balance simulations of act IV — chapters X–XIV on each campaign level, against a player bot that
   does what the chapter asks: X keeps its fleet together and goes for the blockade station; XI drops its pods,
   takes two relays and storms the base (strikes from orbit on enemy groups); XII walks the technician behind the
   army to the uplink, then strikes and storms the Fortress; XIII holds at home until the landing is over, then goes
   for Vok's headquarters (the truce or the rout, by --decision); XIV holds the rifts one by one, then the Gate.
   The bot's economy: workers on ore, the barracks (and a factory on the ground) producing all the time, towers
   (flak in XIII) beside the base. Decisions: VIII trust, XII garrison, XIII from --decision (truce / rout).
   node tools/act4-sim.js [--levels easy,normal,hard] [--chapters colony10,…] [--decision rout] [--minutes 30] */
const RTS = require("../engine");
const { Game, TYPES, dist } = RTS;

const args = process.argv.slice(2),
	opt = (name, fallback) => (args.includes("--" + name) ? args[args.indexOf("--" + name) + 1] : fallback);
const LEVELS = opt("levels", "easy,normal,hard").split(","),
	CHAPTERS = opt("chapters", "colony10,colony11,colony12,colony13,colony14").split(","),
	DECISION = opt("decision", "truce"),
	MINUTES = Number(opt("minutes", 30)),
	DT = 1 / 10;

const armed = (e) => e.hp > 0 && TYPES[e.type].speed > 0 && TYPES[e.type].damage > 0 && e.type !== "worker" && e.type !== "technician";
const army = (g) => g.entities.filter((e) => e.team === 0 && armed(e));

function start(id, level) {
	const g = new Game(42, id);
	g.applyCampaignLevel(level);
	g.applyAct2Bonus({});
	g.applyCampaignCarry({ colony10: { pods: 6 } });
	g.applyCampaignChoices({ colony8: "trust", colony12: "garrison", colony13: DECISION });
	return g;
}
// A free building site near the centre, towards the map's middle.
function site(g, type, angle, r0) {
	const hq = g.hq(0);
	if (!hq) return null;
	const toward = Math.atan2(g.H / 2 - hq.y, g.W / 2 - hq.x) + angle;
	for (let r = r0; r < r0 + 260; r += 30)
		for (let k = 0; k < 8; k++) {
			const a = toward + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.4,
				p = { x: Math.round(hq.x + Math.cos(a) * r), y: Math.round(hq.y + Math.sin(a) * r) };
			if (g.canBuild(p.x, p.y, type)) return p;
		}
	return null;
}
// The bot's economy, every 2 seconds.
function economy(g, space) {
	const builder = g.entities.find((e) => e.team === 0 && e.type === "worker" && e.hp > 0);
	const have = (type) => g.entities.some((e) => e.team === 0 && e.type === type && e.hp > 0);
	const count = (type) => g.entities.filter((e) => e.team === 0 && e.type === type && e.hp > 0).length;
	// More production as the metal piles up: a factory (on the ground or the heavy shipyard in space), a second barracks.
	if (!have("factory") && g.credits >= (TYPES.factory.cost || 300) + 100 && builder) {
		const p = site(g, "factory", 1.2, 200);
		if (p) g.buildStructure("factory", p.x, p.y, [builder.id]);
	} else if (count("barracks") < 2 && g.credits >= (TYPES.barracks.cost || 200) + 300 && builder) {
		const p = site(g, "barracks", -1.2, 200);
		if (p) g.buildStructure("barracks", p.x, p.y, [builder.id]);
	}
	const towers = g.entities.filter((e) => e.team === 0 && ["turret", "flak"].includes(e.type) && e.hp > 0).length;
	const tower = g.missionId === "colony13" && towers % 2 === 0 ? "flak" : "turret";
	if (!space && towers < 4 && g.time > 90 && g.credits >= (TYPES[tower].cost || 150) + 150 && builder) {
		const p = site(g, tower, (towers - 1.5) * 0.5, 230);
		if (p) g.buildStructure(tower, p.x, p.y, [builder.id]);
	}
	// Workers up to 8 (from the centre), first.
	if (count("worker") + g.queue.filter((q) => q.type === "worker").length < 8 && g.credits >= (TYPES.worker.cost || 60) + 20) g.enqueue("worker");
	// Every production building keeps a short queue.
	const pick = space ? (have("factory") ? ["corvette", "frigate", "lancer", "cruiser"] : ["corvette", "frigate"]) : have("factory") ? ["trooper", "rocket", "tank", "tank"] : ["trooper", "rocket", "trooper"];
	for (let k = 0; k < 3 && g.queue.length < 2 + count("barracks") + count("factory"); k++) {
		const type = pick[(Math.floor(g.time / 2) + k) % pick.length];
		if (!TYPES[type] || g.credits < (TYPES[type].cost || 80) + 60 || !g.enqueue(type)) break;
	}
	for (const w of g.entities.filter((e) => e.team === 0 && e.type === "worker" && e.hp > 0 && !e.order)) {
		const ore = g.ores.filter((o) => o.amount > 0).sort((a, b) => dist(a, w) - dist(b, w))[0];
		if (ore) g.gather([w.id], ore.id);
	}
}
const go = (g, units, p, attack = true) => units.length && p && g.command(units.map((e) => e.id), p.x, p.y, null, attack);
// An attack in two groups from both sides of the line (a blob would feed the strikes from orbit). Once no armed
// defender or tower is left by the target building, the units there attack it directly (0.166.2: units on an
// attack-move fight units and towers, never the building itself — the bot's armies stood idle by an untouched centre).
function assault(g, units, p) {
	if (!p || !units.length) return;
	const guarded = () => g.entities.some((e) => e.hp > 0 && e.team !== 0 && e.team !== 2 && !g.allied(0, e.team) && e !== p && TYPES[e.type].damage > 0 && e.type !== "worker" && dist(e, p) < 450);
	if (p.id != null && !guarded()) {
		const there = units.filter((e) => dist(e, p) < 500);
		if (there.length) g.command(there.map((e) => e.id), p.x, p.y, p.id);
		units = units.filter((e) => !there.includes(e));
		if (!units.length) return;
	}
	const home = g.hq(0) || p,
		a = Math.atan2(p.y - home.y, p.x - home.x),
		half = Math.ceil(units.length / 2);
	[units.slice(0, half), units.slice(half)].forEach((group, k) => {
		const side = k ? 1 : -1;
		go(g, group, { x: p.x - Math.cos(a) * 60 + Math.cos(a + Math.PI / 2) * side * 140, y: p.y - Math.sin(a) * 60 + Math.sin(a + Math.PI / 2) * side * 140 });
	});
}
// The densest group of visible enemies (for strikes from orbit).
function cluster(g) {
	const foes = g.entities.filter((e) => e.hp > 0 && e.team !== 0 && e.team !== 2 && !g.allied(0, e.team) && TYPES[e.type].speed && g.isVisible(e.x, e.y));
	let best = null;
	for (const u of foes) {
		const n = foes.filter((o) => dist(o, u) < 90).length;
		if (n >= 3 && (!best || n > best.n)) best = { x: u.x, y: u.y, n };
	}
	return best;
}
// The bot's orders for the chapter, every 2 seconds.
function orders(g, s) {
	const A = g.act4,
		all = army(g),
		enemyHq = g.hq(1),
		home = g.hq(0);
	if (!home) return;
	// A home guard: a third of the army (at least 4) always stays by the base.
	const guard = all.sort((p, q) => dist(p, home) - dist(q, home)).slice(0, Math.max(4, Math.round(all.length / 3))),
		units = all.filter((e) => !guard.includes(e));
	go(g, guard.filter((e) => dist(e, home) > 380), home);
	const strong = (n) => units.length >= n;
	if (g.missionId === "colony10") {
		if (strong(14) || g.time > 420) assault(g, units, enemyHq);
		else go(g, units.filter((e) => dist(e, home) > 500), home, false);
	} else if (g.missionId === "colony11") {
		if (!g.dropRequirement(0)) {
			for (let r = 300; r < 900; r += 60) {
				const a = Math.atan2(g.H / 2 - home.y, g.W / 2 - home.x),
					p = { x: Math.round(home.x + Math.cos(a) * r), y: Math.round(home.y + Math.sin(a) * r) };
				g.sideOf(0).explored[g.visionIndex(p.x, p.y)] = 1;
				if (!g.landingRequirement(0, p.x, p.y)) {
					g.orbitalDrop(p.x, p.y);
					break;
				}
			}
		}
		const c = cluster(g);
		if (c && !g.orbitStrikeRequirement(0)) g.orbitStrike(c.x, c.y);
		if (!A.bridgehead) {
			const relay = g.nodes.filter((n) => n.owner !== 0).sort((a, b) => dist(a, home) - dist(b, home))[0];
			go(g, units, relay);
		} else if (strong(18)) assault(g, units, enemyHq);
	} else if (g.missionId === "colony12") {
		const tech = g.get(A.technician);
		if (!A.uplink && tech) {
			const front = units.length ? { x: units.reduce((n, e) => n + e.x, 0) / units.length, y: units.reduce((n, e) => n + e.y, 0) / units.length } : home;
			if (strong(6)) go(g, units, A.site);
			// The technician walks behind the army: to its centre, or to the site once the army is there.
			const there = dist(front, A.site) < 260;
			g.command([tech.id], there ? A.site.x : front.x, there ? A.site.y : front.y, null, false);
		} else {
			if (g.campaignDecisionInfo()?.state === "pending") g.decideCampaign("garrison");
			const up = g.entities.find((e) => e.team === 0 && e.type === "uplink" && e.hp > 0);
			const c = cluster(g) || (enemyHq && g.isVisible(enemyHq.x, enemyHq.y) ? enemyHq : null);
			if (up && c) g.orbitalStrike(up.id, c.x, c.y);
			if (strong(28)) assault(g, units, enemyHq);
		}
	} else if (g.missionId === "colony13") {
		if (g.campaignDecisionInfo()?.state === "pending") g.decideCampaign(DECISION);
		if (!A.survived) go(g, units.filter((e) => dist(e, home) > 450), home);
		else if (strong(28)) assault(g, units, enemyHq);
	} else if (g.missionId === "colony14") {
		const rift = (A.rifts14 || []).filter((r) => !r.closed).sort((a, b) => dist(a, home) - dist(b, home))[0];
		if (rift) {
			if (strong(7)) go(g, units, rift);
		} else assault(g, units, enemyHq);
	}
}

function play(id, level) {
	const g = start(id, level),
		space = !!RTS.MISSIONS[id].space,
		s = { firstContact: null };
	let lastSecond = -1;
	for (let i = 0; i < (MINUTES * 60) / DT && !g.result; i++) {
		g.tick(DT);
		const sec = Math.floor(g.time);
		if (sec !== lastSecond && sec % 2 === 0) {
			lastSecond = sec;
			economy(g, space);
			orders(g, s);
			if (args.includes("--trace") && sec % 10 === 0) console.log("  t", sec, "wróg", g.hq(1) ? Math.round(g.hq(1).hp) + "/" + Math.round(g.hq(1).maxHp) : "—", "nasze", g.hq(0) ? Math.round(g.hq(0).hp) + "/" + Math.round(g.hq(0).maxHp) : "—", "armia", army(g).length, "kredyty", Math.round(g.credits), "wróg-jedn.", g.entities.filter((e) => e.team !== 0 && e.team !== 2 && armed(e)).length, "kapsuły wroga", g.podsLeft ? g.podsLeft(1) : "", "budynki", g.entities.filter((e) => e.team === 0 && !TYPES[e.type].speed && e.hp > 0).map((e) => e.type).join("+"), "kolejka", g.queue.length);
		}
	}
	const A = g.act4,
		hq = g.hq(0);
	return {
		id,
		level,
		result: g.result || "—",
		time: Math.round(g.time),
		why: g.result === "defeat" ? g.act2.failReason || "centrum zniszczone" : "",
		hq: hq ? Math.round((100 * hq.hp) / hq.maxHp) + "%" : "—",
		army: army(g).length,
		losses: g.act2.losses,
		secondary: g.act2Secondary() ? "◆" : "—",
		detail:
			id === "colony10"
				? `kapsuły ${g.invasionResult?.()?.pods ?? "—"}`
				: id === "colony11"
					? `przyczółek ${A.bridgehead ? "tak" : "nie"}, zestrzelone ${A.podsShot}, kapsuły ${g.podsLeft(0)}`
					: id === "colony12"
						? `uplink ${A.uplink ? "tak" : "nie"}, zasadzka ${A.ambushed ? "tak" : "nie"}, decyzja ${g.campaignChoice() || "—"}`
						: id === "colony13"
							? `desant ${A.survived ? "odparty" : "trwa"}, zestrzelone ${A.enemyShot || 0}, decyzja ${g.campaignChoice() || "—"}`
							: `szczeliny ${A.closed || 0}/${A.rifts14?.length || 3}`,
	};
}

console.log(`H7 — symulacje aktu IV (bot gracza, do ${MINUTES} min, decyzja XIII: ${DECISION})\n`);
console.log("rozdział  poziom   wynik     czas    centrum  armia  straty  ◆  szczegóły");
const clock = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
for (const id of CHAPTERS)
	for (const level of LEVELS) {
		const r = play(id, level);
		console.log(`${id.padEnd(9)} ${level.padEnd(8)} ${r.result.padEnd(9)} ${clock(r.time).padEnd(7)} ${r.hq.padEnd(8)} ${String(r.army).padEnd(6)} ${String(r.losses).padEnd(7)} ${r.secondary}  ${r.detail}${r.why ? " · " + r.why : ""}`);
	}
