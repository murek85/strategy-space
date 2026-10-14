/* I1 (0.174): the balance simulator — whole matches of the computer commander against the computer commander, with
   the economy, building, research and attacks of both sides, no graphics. Each pair of factions plays on each map
   from both sides (the map's start positions are not equal), with the same start for both: the command centre, the
   commander's workers and metal (the map's player kit — barracks, a tank, more workers — is taken away, it would
   favour side 0). Up to a time limit; a match still on then is a draw, scored by what each side has.
   Matches run in parallel worker threads (one per core). The report: docs/BALANS_RAPORT.md, the data beside it.
   node tools/balance.js [--maps horizon,frost,…|all] [--factions colonies,dominion,…] [--seeds 2] [--level normal]
                         [--minutes 30] [--threads 11] [--out docs/BALANS_RAPORT.md] [--quick]
   --quick: 2 maps, 1 seed, 20 minutes — a check of the tool in a few minutes. */
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");

const ROOT = path.join(__dirname, "..");
const FACTIONS = ["colonies", "dominion", "swarm", "watchers"];
const NAMES = { colonies: "Wolne Kolonie", dominion: "Dominium", swarm: "Rój", watchers: "Wartownicy" };
const DT = 1 / 15;
const SAMPLE = 30; // seconds between samples of the economy and the army

// ---------------------------------------------------------------- one match (in a worker thread)
function match({ map, a, b, seed, level, minutes }) {
	const RTS = require(path.join(ROOT, "engine.js"));
	const { Game, TYPES } = RTS;
	const g = new Game(seed, map);
	// Both sides are computers: the commander takes every side with a command centre. Its enemy is the other side —
	// without alliances aiFoes() answers "the player" (side 0) for every commander, and side 0's own commander then
	// raided its own workers and marched on its own base (the first run: side 2 won 84–100% on every map).
	g.isHuman = () => false;
	g.aiFoes = (team) => [1 - team];
	g.configureSkirmish({ difficulty: level, faction: a, enemyFaction: b, players: 2, seed });
	g.players = { 0: { faction: a }, 1: { faction: b } };
	const teams = [0, 1];
	// The same start for both: the command centre, the commander's workers, its metal.
	g.entities = g.entities.filter((e) => !teams.includes(e.team) || e.type === "hq");
	g.setupEnemyAi();
	const T = g.enemyAi.teams;
	if (!T[0] || !T[1]) throw Error(`${map}: no commander for both sides`);
	const value = (e) => (TYPES[e.type]?.cost || 0) * (RTS.FACTIONS[g.players[e.team]?.faction]?.cost ?? 1);
	const mobile = (e) => TYPES[e.type]?.speed && e.type !== "worker";
	const built = { 0: {}, 1: {} },
		lost = { 0: {}, 1: {} },
		lostValue = { 0: 0, 1: 0 },
		known = new Map();
	for (const e of g.entities) known.set(e.id, e);
	const series = [];
	// The special units at work (0.174.1): infantry carried and set down, buildings disabled by saboteurs (credited to
	// the other side), aircraft in the air at most.
	const use = { 0: { boarded: 0, unloads: 0, sabotages: 0, air: 0 }, 1: { boarded: 0, unloads: 0, sabotages: 0, air: 0 } },
		riders = new Map(),
		disabled = new Map();
	let firstAttack = { 0: null, 1: null };
	const steps = Math.round((minutes * 60) / DT);
	const started = Date.now();
	for (let i = 0; i < steps && !g.result && g.hq(0) && g.hq(1); i++) {
		g.tick(DT);
		for (const t of teams) if (firstAttack[t] == null && T[t]?.attackNo > 0) firstAttack[t] = Math.round(g.time);
		if (i % 15 === 0) {
			// New entities (built), and the ones gone (lost).
			const alive = new Set();
			for (const e of g.entities) {
				if (e.hp <= 0) continue;
				alive.add(e.id);
				if (!known.has(e.id)) {
					known.set(e.id, e);
					if (teams.includes(e.team)) built[e.team][e.type] = (built[e.team][e.type] || 0) + 1;
				}
			}
			const air = { 0: 0, 1: 0 };
			for (const e of g.entities) {
				if (e.hp <= 0 || !teams.includes(e.team)) continue;
				if (TYPES[e.type].flying) air[e.team]++;
				if (e.type === "transport") {
					const n = (e.passengers || []).length,
						was = riders.get(e.id) || 0;
					if (n > was) use[e.team].boarded += n - was;
					if (n < was) use[e.team].unloads++;
					riders.set(e.id, n);
				}
				if (e.disabledUntil && e.disabledUntil !== disabled.get(e.id) && !TYPES[e.type].speed) {
					disabled.set(e.id, e.disabledUntil);
					use[1 - e.team].sabotages++;
				}
			}
			for (const t of teams) use[t].air = Math.max(use[t].air, air[t]);
			for (const [id, e] of known)
				if (!alive.has(id)) {
					known.delete(id);
					if (teams.includes(e.team)) {
						lost[e.team][e.type] = (lost[e.team][e.type] || 0) + 1;
						lostValue[e.team] += value(e);
					}
				}
		}
		if (i % Math.round(SAMPLE / DT) === 0) series.push(teams.map((t) => sample(g, T[t], t, value, mobile)));
	}
	series.push(teams.map((t) => sample(g, T[t], t, value, mobile)));
	const hq = teams.map((t) => !!g.hq(t));
	const end = series.at(-1);
	let winner = hq[0] && !hq[1] ? 0 : hq[1] && !hq[0] ? 1 : null;
	const reason = winner != null ? "centrum" : "czas";
	// A draw at the limit is scored by what each side has (army and buildings) — reported apart from wins.
	const lead = end[0].worth === end[1].worth ? null : end[0].worth > end[1].worth ? 0 : 1;
	return {
		map,
		seed,
		level,
		factions: [a, b],
		foes: [g.aiFoes(0), g.aiFoes(1)],
		winner,
		reason,
		lead,
		time: Math.round(g.time),
		firstAttack,
		doctrine: teams.map((t) => g.doctrineOf?.(t)?.id || null),
		fortress: teams.map((t) => !!T[t]?.upgrades?.fortress),
		mined: teams.map((t) => Math.round(T[t]?.mined || 0)),
		spent: teams.map((t) => Math.round(T[t]?.spent || 0)),
		built,
		lost,
		lostValue,
		use,
		series,
		ms: Date.now() - started,
	};
}
function sample(g, T, team, value, mobile) {
	let army = 0,
		armyValue = 0,
		workers = 0,
		buildings = 0,
		buildingValue = 0;
	for (const e of g.entities) {
		if (e.team !== team || e.hp <= 0) continue;
		if (e.type === "worker") workers++;
		else if (mobile(e)) {
			army++;
			armyValue += value(e);
		} else {
			buildings++;
			buildingValue += value(e);
		}
	}
	return { t: Math.round(g.time), metal: Math.round(T?.metal || 0), mined: Math.round(T?.mined || 0), army, armyValue: Math.round(armyValue), workers, buildings, worth: Math.round(armyValue + buildingValue + (T?.metal || 0)) };
}

if (!isMainThread) {
	for (const job of workerData.jobs) {
		try {
			parentPort.postMessage({ ok: true, result: match(job) });
		} catch (error) {
			parentPort.postMessage({ ok: false, job, error: String(error?.stack || error) });
		}
	}
	return;
}

// ---------------------------------------------------------------- the run (main thread)
// Required (tests): one match, no run.
if (require.main !== module) {
	module.exports = { match };
	return;
}
const args = process.argv.slice(2);
const opt = (name, fallback) => {
	const i = args.indexOf("--" + name);
	return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const quick = args.includes("--quick");
const RTS0 = require(path.join(ROOT, "engine.js"));
const allMaps = Object.keys(RTS0.MISSIONS).filter((k) => !RTS0.MISSIONS[k].campaign && !RTS0.MISSIONS[k].space);
const mapsArg = opt("maps", quick ? "horizon,frost" : "horizon,frost,ember,lumen,magma,bastion");
const MAPS = mapsArg === "all" ? allMaps : mapsArg.split(",");
const FAC = opt("factions", FACTIONS.join(",")).split(",");
const SEEDS = Number(opt("seeds", quick ? 1 : 2));
const LEVEL = opt("level", "normal");
const MINUTES = Number(opt("minutes", quick ? 20 : 30));
const THREADS = Math.max(1, Number(opt("threads", Math.max(1, os.cpus().length - 1))));
const OUT = path.resolve(ROOT, opt("out", "docs/BALANS_RAPORT.md"));
for (const m of MAPS) if (!RTS0.MISSIONS[m]) throw Error("Nieznana mapa: " + m);
for (const f of FAC) if (!FACTIONS.includes(f)) throw Error("Nieznana frakcja: " + f);

const jobs = [];
for (const map of MAPS)
	for (let s = 0; s < SEEDS; s++)
		for (let i = 0; i < FAC.length; i++)
			for (let j = i; j < FAC.length; j++) {
				const seed = 101 + s * 7919;
				// Both sides of the map (a mirror match too: it measures the map itself).
				jobs.push({ map, a: FAC[i], b: FAC[j], seed, level: LEVEL, minutes: MINUTES });
				if (i !== j) jobs.push({ map, a: FAC[j], b: FAC[i], seed, level: LEVEL, minutes: MINUTES });
				else jobs.push({ map, a: FAC[i], b: FAC[j], seed: seed + 1, level: LEVEL, minutes: MINUTES });
			}
console.log(`Symulacja balansu: ${jobs.length} meczów (${MAPS.length} map × ${SEEDS} ziarno × ${FAC.length} frakcje, obie strony), poziom ${LEVEL}, do ${MINUTES} min gry, wątki: ${THREADS}`);
const t0 = Date.now();
const results = [],
	errors = [];
const shares = Array.from({ length: Math.min(THREADS, jobs.length) }, () => []);
jobs.forEach((j, i) => shares[i % shares.length].push(j));
let done = 0;
Promise.all(
	shares.map(
		(share) =>
			new Promise((resolve) => {
				const w = new Worker(__filename, { workerData: { jobs: share } });
				w.on("message", (m) => {
					done++;
					if (m.ok) results.push(m.result);
					else errors.push(m);
					const r = m.result;
					process.stdout.write(`\r  ${done}/${jobs.length} ${r ? `${r.map} ${NAMES[r.factions[0]]} – ${NAMES[r.factions[1]]}: ${r.winner == null ? "remis" : NAMES[r.factions[r.winner]]} (${Math.round(r.time / 60)} min)` : "błąd"}`.padEnd(90));
				});
				w.on("error", (e) => {
					errors.push({ error: String(e?.stack || e) });
					resolve();
				});
				w.on("exit", resolve);
			}),
	),
).then(() => {
	process.stdout.write("\n");
	const seconds = Math.round((Date.now() - t0) / 1000);
	const report = write(results, errors, seconds);
	console.log(`Gotowe w ${seconds} s. Raport: ${path.relative(ROOT, OUT)}${errors.length ? ` — błędy: ${errors.length}` : ""}`);
	for (const line of report.flags) console.log("  ! " + line);
	if (errors.length) {
		console.error(errors[0].error);
		process.exitCode = 1;
	}
});

// ---------------------------------------------------------------- the report
function write(results, errors, seconds) {
	const { TYPES } = RTS0;
	const pct = (n, d) => (d ? Math.round((100 * n) / d) + "%" : "—");
	const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
	const min = (s) => (s == null ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
	const flags = [];
	// Faction against faction: wins of the row's faction (both sides counted), mirrors left out.
	const vs = {};
	for (const f of FAC) vs[f] = Object.fromEntries(FAC.map((o) => [o, { w: 0, l: 0, d: 0 }]));
	const per = Object.fromEntries(FAC.map((f) => [f, { w: 0, l: 0, d: 0, lead: 0, winTimes: [], mined: [], peak: [], attack: [], kills: 0, losses: 0, built: {}, doctrines: {}, fortress: 0, games: 0 }]));
	const side = {};
	for (const r of results) {
		const [a, b] = r.factions;
		(side[r.map] ||= { 0: 0, 1: 0, d: 0, n: 0 }).n++;
		if (r.winner == null) side[r.map].d++;
		else side[r.map][r.winner]++;
		for (const t of [0, 1]) {
			const f = r.factions[t],
				o = r.factions[1 - t],
				P = per[f];
			P.games++;
			P.mined.push((r.mined[t] / Math.max(1, r.time)) * 60);
			P.peak.push(Math.max(...r.series.map((s) => s[t].armyValue)));
			if (r.firstAttack[t] != null) P.attack.push(r.firstAttack[t]);
			P.kills += r.lostValue[1 - t];
			P.losses += r.lostValue[t];
			for (const [type, n] of Object.entries(r.built[t])) if (TYPES[type]?.speed && type !== "worker") P.built[type] = (P.built[type] || 0) + n;
			if (r.doctrine[t]) P.doctrines[r.doctrine[t]] = (P.doctrines[r.doctrine[t]] || 0) + 1;
			if (r.fortress[t]) P.fortress++;
			if (a === b) continue;
			const cell = vs[f][o];
			if (r.winner == null) {
				cell.d++;
				P.d++;
				if (r.lead === t) P.lead++;
			} else if (r.winner === t) {
				cell.w++;
				P.w++;
				P.winTimes.push(r.time);
			} else {
				cell.l++;
				P.l++;
			}
		}
	}
	const L = [];
	L.push("# Raport balansu — mecze AI kontra AI");
	L.push("");
	L.push(`Wygenerowano: ${new Date().toISOString().slice(0, 16).replace("T", " ")} narzędziem \`node tools/balance.js\` (I1), wersja gry ${JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version}. Plik nadpisywany przy każdym uruchomieniu; dane: \`${path.basename(OUT, ".md")}.json\`.`);
	L.push("");
	L.push(`**Ustawienia:** ${results.length} meczów${errors.length ? ` (błędy: ${errors.length})` : ""}, poziom dowódców „${LEVEL}”, mapy: ${MAPS.map((m) => RTS0.MISSIONS[m].name).join(", ")}; ziaren: ${SEEDS}; limit ${MINUTES} min gry; czas obliczeń ${Math.round(seconds / 60)} min. Obie strony prowadzi dowódca AI. Start równy (centrum, ${2} roboty, 300 metalu), każda para frakcji gra z obu stron mapy.`);
	L.push("");
	L.push("> Uwaga: to balans **dowódców AI**, nie graczy — wynik zależy też od tego, jak AI gra daną frakcją (styl frakcji, plan poziomu). Silna różnica to sygnał do sprawdzenia, nie wyrok.");
	L.push("");
	L.push("## 1. Frakcje — bilans");
	L.push("");
	L.push("| Frakcja | Mecze (bez lustrzanych) | Wygrane | Przegrane | Remisy (limit czasu) | Wygrane z rozstrzygniętych | Średni czas wygranej | Metal/min (wydobycie) | Szczyt armii (metal) | Pierwszy atak | Zniszczone / stracone (metal) |");
	L.push("|---|---|---|---|---|---|---|---|---|---|---|");
	for (const f of FAC) {
		const P = per[f],
			n = P.w + P.l + P.d;
		L.push(`| ${NAMES[f]} | ${n} | ${P.w} | ${P.l} | ${P.d} | **${pct(P.w, P.w + P.l)}** | ${min(mean(P.winTimes) || null)} | ${Math.round(mean(P.mined))} | ${Math.round(mean(P.peak))} | ${min(P.attack.length ? mean(P.attack) : null)} | ${(P.kills / Math.max(1, P.losses)).toFixed(2)} |`);
		// From the decided matches (a draw at the limit says nothing of who is stronger).
		const decided = P.w + P.l;
		if (decided >= 6 && P.w / decided >= 0.65) flags.push(`${NAMES[f]} wygrywa ${pct(P.w, decided)} rozstrzygniętych meczów — możliwa przewaga frakcji (albo jej AI).`);
		if (decided >= 6 && P.w / decided <= 0.35) flags.push(`${NAMES[f]} wygrywa tylko ${pct(P.w, decided)} rozstrzygniętych meczów — możliwa słabość frakcji (albo jej AI).`);
	}
	L.push("");
	L.push("## 2. Frakcja przeciw frakcji");
	L.push("");
	L.push("Wygrane frakcji z wiersza przeciw frakcji z kolumny (obie strony mapy razem; w nawiasie remisy).");
	L.push("");
	L.push(`| | ${FAC.map((f) => NAMES[f]).join(" | ")} |`);
	L.push(`|---|${FAC.map(() => "---").join("|")}|`);
	for (const f of FAC) L.push(`| **${NAMES[f]}** | ${FAC.map((o) => (o === f ? "—" : (() => { const c = vs[f][o], n = c.w + c.l + c.d; return `${c.w}/${n}${c.d ? ` (${c.d})` : ""}`; })())).join(" | ")} |`);
	for (const f of FAC)
		for (const o of FAC) {
			const c = vs[f][o],
				n = c.w + c.l + c.d;
			if (f < o && n >= 4 && (c.w / n >= 0.75 || c.l / n >= 0.75)) flags.push(`${NAMES[f]} – ${NAMES[o]}: ${c.w}:${c.l} — jednostronne starcie.`);
		}
	L.push("");
	L.push("## 3. Mapy — przewaga strony");
	L.push("");
	L.push("Wszystkie mecze na mapie (także lustrzane); równe mapy dają strony blisko 50%.");
	L.push("");
	L.push("| Mapa | Mecze | Strona 1 (gracza) | Strona 2 | Remisy |");
	L.push("|---|---|---|---|---|");
	for (const m of MAPS) {
		const s = side[m];
		if (!s) continue;
		const dec = s[0] + s[1];
		L.push(`| ${RTS0.MISSIONS[m].name} | ${s.n} | ${pct(s[0], dec)} | ${pct(s[1], dec)} | ${s.d} |`);
		if (dec >= 6 && Math.max(s[0], s[1]) / dec >= 0.7) flags.push(`${RTS0.MISSIONS[m].name}: strona ${s[0] > s[1] ? 1 : 2} wygrywa ${pct(Math.max(s[0], s[1]), dec)} rozstrzygniętych meczów — nierówne pozycje startowe.`);
		if (s.d / s.n >= 0.5) flags.push(`${RTS0.MISSIONS[m].name}: ${pct(s.d, s.n)} meczów kończy limit czasu — dowódcy nie potrafią się tam przełamać.`);
	}
	L.push("");
	L.push("## 4. Jednostki — co budują dowódcy");
	L.push("");
	L.push("| Frakcja | Jednostki bojowe (udział w zbudowanych) | Doktryna | Twierdza |");
	L.push("|---|---|---|---|");
	const everBuilt = new Set();
	for (const f of FAC) {
		const P = per[f],
			total = Object.values(P.built).reduce((a, b) => a + b, 0);
		for (const t of Object.keys(P.built)) everBuilt.add(t);
		const list = Object.entries(P.built)
			.sort((x, y) => y[1] - x[1])
			.map(([t, n]) => `${RTS0.TYPES[t]?.name || t} ${pct(n, total)}`)
			.join(", ");
		const doctrines = Object.entries(P.doctrines).map(([d, n]) => `${d} ×${n}`).join(", ") || "—";
		L.push(`| ${NAMES[f]} | ${list || "—"} | ${doctrines} | ${pct(P.fortress, P.games)} meczów |`);
	}
	// Combat units the commanders of this run could build: not workers, not ships unless a space map was played, not
	// a merged form (the Watchers' construct), and of a faction in the run.
	const space = MAPS.some((m) => RTS0.MISSIONS[m].space);
	const combat = Object.keys(TYPES).filter((t) => TYPES[t].speed && TYPES[t].damage && TYPES[t].cost && t !== "worker" && !TYPES[t].merged && (space || !TYPES[t].ship) && (!TYPES[t].faction || FAC.includes(TYPES[t].faction)));
	const never = combat.filter((t) => !everBuilt.has(t));
	L.push("");
	L.push(`Jednostki bojowe, których **żaden** dowódca nie zbudował: ${never.length ? never.map((t) => `${TYPES[t].name || t} (\`${t}\`)`).join(", ") : "brak"}. Jednostki wspólne mogą też być niedostępne którejś frakcji — do przejrzenia.`);
	if (never.length) flags.push(`Dowódcy nie budują ${never.length} typów jednostek bojowych (lista w raporcie, rozdz. 4).`);
	L.push("");
	L.push("### Jednostki specjalne w użyciu");
	L.push("");
	L.push("Na mecz (średnio): piechota przewieziona transporterem, desanty, budynki wyłączone przez sabotażystów, najwięcej maszyn w powietrzu naraz; w nawiasie — w ilu meczach choć raz.");
	L.push("");
	L.push("| Frakcja | Przewiezieni | Desanty | Sabotaże | Lotnictwo (szczyt) | Artyleria zbudowana | Wozy przeciwlotnicze |");
	L.push("|---|---|---|---|---|---|---|");
	for (const f of FAC) {
		const sides = results.flatMap((r) => [0, 1].filter((t) => r.factions[t] === f).map((t) => ({ u: r.use?.[t] || {}, b: r.built[t] || {} })));
		const n = sides.length || 1,
			cell = (get) => {
				const xs = sides.map(get);
				return `${(xs.reduce((a, b) => a + b, 0) / n).toFixed(1)} (${xs.filter((x) => x > 0).length})`;
			};
		L.push(`| ${NAMES[f]} | ${cell((s) => s.u.boarded || 0)} | ${cell((s) => s.u.unloads || 0)} | ${cell((s) => s.u.sabotages || 0)} | ${cell((s) => s.u.air || 0)} | ${cell((s) => s.b.artillery || 0)} | ${cell((s) => s.b.skyguard || 0)} |`);
	}
	L.push("");
	L.push("## 5. Przebieg (średnio, co 5 minut)");
	L.push("");
	L.push("| Frakcja | " + [5, 10, 15, 20, 25, 30].filter((m) => m <= MINUTES).map((m) => `${m} min: wartość armii / roboty`).join(" | ") + " |");
	L.push("|---|" + [5, 10, 15, 20, 25, 30].filter((m) => m <= MINUTES).map(() => "---").join("|") + "|");
	for (const f of FAC) {
		const cells = [5, 10, 15, 20, 25, 30]
			.filter((m) => m <= MINUTES)
			.map((m) => {
				const at = [];
				for (const r of results)
					for (const t of [0, 1]) {
						if (r.factions[t] !== f) continue;
						const s = r.series.find((x) => x[t].t >= m * 60 - 1);
						if (s) at.push(s[t]);
					}
				return at.length ? `${Math.round(mean(at.map((s) => s.armyValue)))} / ${mean(at.map((s) => s.workers)).toFixed(1)} (${at.length})` : "—";
			});
		L.push(`| ${NAMES[f]} | ${cells.join(" | ")} |`);
	}
	L.push("");
	L.push("W nawiasie: ile stron trwało jeszcze w tej minucie (mecze kończą się wcześniej).");
	L.push("");
	L.push("## 6. Sygnały do sprawdzenia");
	L.push("");
	L.push(flags.length ? flags.map((f) => "- " + f).join("\n") : "- Brak wyraźnych odchyleń przy tych ustawieniach.");
	L.push("");
	L.push("## Jak uruchomić");
	L.push("");
	L.push("```");
	L.push("node tools/balance.js                 # 6 map × 2 ziarna × 4 frakcje, obie strony (240 meczów, ok. 20 min na 12 rdzeniach)");
	L.push("node tools/balance.js --quick         # sprawdzenie narzędzia: 2 mapy, 1 ziarno, 20 min");
	L.push("node tools/balance.js --maps all --seeds 3 --level hard --minutes 40");
	L.push("```");
	L.push("");
	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, L.join("\n"));
	fs.writeFileSync(OUT.replace(/\.md$/, ".json"), JSON.stringify({ settings: { maps: MAPS, factions: FAC, seeds: SEEDS, level: LEVEL, minutes: MINUTES, seconds }, results: results.map((r) => ({ ...r, series: r.series.filter((_, i) => i % 2 === 0) })), errors }, null, 1));
	return { flags };
}
