/* G1.4 (0.150.3): simulations of the computer commander with the Fortress, doctrines, patrols and escorts.
   node tools/ai-sim.js [minutes=15] [--maps all|horizon,frost,…]
   1. Build-up: each difficulty × each AI faction × maps — the commander against an idle player whose command
      centre cannot fall (attacks off), measured: when the Fortress and the doctrine come, which doctrine, the army,
      patrols and escorts at the end.
   2. Doctrine duels: for each faction, two equal armies of its units (same cost) fight in an empty arena — one with a
      doctrine, one without — 20 rounds with shuffled positions, beside a baseline without any doctrine (the bias of
      the arena). Reported: rounds won by the doctrine side and how much of its own army each side keeps (in value).
      The fight happens by a building of the doctrine side, so Fortyfikacja przyczółków works there. Logistyka
      mobilna and Nawała are mostly economic (production) — a duel shows only their speed. */
const RTS = require("../engine");
const { Game, TYPES } = RTS;

const args = process.argv.slice(2),
	minutes = Number(args.find((a) => /^\d+$/.test(a)) || 15),
	mapsArg = args[args.indexOf("--maps") + 1],
	MAPS = args.includes("--maps") ? (mapsArg === "all" ? Object.keys(RTS.MISSIONS).filter((k) => !RTS.MISSIONS[k].campaign && !RTS.MISSIONS[k].space) : mapsArg.split(",")) : ["horizon", "frost", "ember"];
const FACTIONS = ["colonies", "dominion", "swarm"],
	LEVELS = ["easy", "normal", "hard"];

function buildUp(map, difficulty, faction) {
	const g = new Game(7, map);
	g.configureSkirmish({ difficulty, faction: faction === "colonies" ? "dominion" : "colonies" });
	(g.players ||= {})[1] = { ...(g.players[1] || {}), faction };
	const T = g.enemyAi.teams[1],
		hq0 = g.hq(0);
	hq0.maxHp = hq0.hp = 1e12;
	let fortressAt = null,
		doctrineAt = null,
		samples = 0,
		patrols = 0,
		escorts = 0;
	const dt = 1 / 15;
	for (let i = 0; i < (minutes * 60) / dt && !g.result; i++) {
		T.nextAttack = 1e12;
		g.tick(dt);
		hq0.hp = hq0.maxHp;
		if (fortressAt == null && T.upgrades.fortress) fortressAt = g.time;
		if (doctrineAt == null && g.doctrineOf(1)) doctrineAt = g.time;
		// Patrols and escorts on average over the battle (after the first three minutes).
		if (i % 150 === 0 && g.time > 180) {
			const r = g.aiReport()[0];
			samples++;
			patrols += r.patrols;
			escorts += r.escorts;
		}
	}
	const army = g.entities.filter((e) => e.team === 1 && e.hp > 0 && TYPES[e.type].speed && TYPES[e.type].damage && e.type !== "worker");
	return { map, difficulty, faction, fortressAt, doctrineAt, doctrine: g.doctrineOf(1)?.id || "—", army: army.length, value: Math.round(army.reduce((n, e) => n + (TYPES[e.type].cost || 0), 0)), patrols: (patrols / (samples || 1)).toFixed(1), escorts: (escorts / (samples || 1)).toFixed(1) };
}

// Units of a faction for the duels (what the commander builds of it on hard).
const POOL = {
	colonies: ["trooper", "rocket", "tank", "raider", "grenadier", "heavy"],
	dominion: ["trooper", "rocket", "tank", "sentinel", "destroyer", "flamer", "heavy"],
	swarm: ["crawler", "spitter", "colossus"],
};
function duel(faction, doctrine, seed) {
	const g = new Game(seed, "horizon");
	g.entities = [];
	g.obstacles = [];
	g.waters = [];
	g.nodes = [];
	g.ores = [];
	g.gasFields = [];
	g.crystalFields = [];
	g.nextWave = 1e12;
	g.spawn("hq", 0, 150, 150).hp = 1e12;
	g.spawn("hq", 1, 2700, 1900).hp = 1e12;
	g.enemyAi = { teams: { 0: { upgrades: {} }, 1: { upgrades: doctrine ? { [doctrine]: true } : {} } } };
	g.spawn("barracks", 1, 1440, 980);
	const pool = POOL[faction].filter((t) => TYPES[t]),
		budget = 3000,
		armies = { 0: [], 1: [] };
	for (const team of [0, 1]) {
		let spent = 0,
			i = 0;
		while (spent < budget) {
			const type = pool[(i * 7 + seed) % pool.length];
			const x = team ? 1640 + (i % 4) * 30 : 1040 - (i % 4) * 30,
				y = 760 + Math.floor(i / 4) * 34 + ((seed * 13) % 40);
			const e = g.spawn(type, team, x, y);
			armies[team].push(e);
			spent += TYPES[type].cost || 60;
			i++;
		}
	}
	for (const team of [0, 1])
		for (const e of armies[team]) {
			e.order = { kind: "attackMove", x: team ? 1040 : 1660, y: 840 };
			e.path = g.pathTo(e, e.order);
		}
	for (let i = 0; i < 180 * 15; i++) {
		g.tick(1 / 15);
		const alive = [0, 1].map((t) => armies[t].filter((e) => e.hp > 0).length);
		if (!alive[0] || !alive[1]) break;
		// Nobody in range: both sides close in.
		if (i % 150 === 149) for (const t of [0, 1]) for (const e of armies[t]) if (e.hp > 0 && !e.target) (e.order = { kind: "attackMove", x: 1350, y: 840 }), (e.path = g.pathTo(e, e.order));
	}
	const left = (t) => armies[t].filter((e) => e.hp > 0).reduce((n, e) => n + ((TYPES[e.type].cost || 60) * e.hp) / e.maxHp, 0),
		start = (t) => armies[t].reduce((n, e) => n + (TYPES[e.type].cost || 60), 0);
	return { doctrineWins: left(1) > left(0), keep1: left(1) / start(1), keep0: left(0) / start(0) };
}

console.log(`G1.4 — rozbudowa (${minutes} min, mapy: ${MAPS.join(", ")})\n`);
console.log("poziom  frakcja   mapa       Twierdza  doktryna  wybrana             armia  wartość  patrole  eskorty");
const rows = [];
for (const difficulty of LEVELS)
	for (const faction of FACTIONS)
		for (const map of MAPS) {
			const r = buildUp(map, difficulty, faction);
			rows.push(r);
			const t = (s) => (s == null ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
			console.log(`${difficulty.padEnd(7)} ${faction.padEnd(9)} ${map.padEnd(10)} ${t(r.fortressAt).padEnd(9)} ${t(r.doctrineAt).padEnd(9)} ${r.doctrine.padEnd(19)} ${String(r.army).padEnd(6)} ${String(r.value).padEnd(8)} ${String(r.patrols).padEnd(8)} ${r.escorts}`);
		}

console.log("\nG1.4 — pojedynki doktryn (armie po 3000 metalu, ta sama frakcja, 20 rund)\n");
console.log("frakcja   doktryna             wygrane  zostaje z doktryną / bez");
for (const faction of FACTIONS)
	for (const id of [null, ...RTS.DOCTRINES[faction].map((d) => d.id)]) {
		let wins = 0,
			keep1 = 0,
			keep0 = 0;
		const N = 20;
		for (let s = 1; s <= N; s++) {
			const r = duel(faction, id, s);
			wins += r.doctrineWins ? 1 : 0;
			keep1 += r.keep1;
			keep0 += r.keep0;
		}
		console.log(`${faction.padEnd(9)} ${(id || "(bez — tło)").padEnd(20)} ${String(wins).padStart(2)}/${N}    ${Math.round((keep1 / N) * 100)}% / ${Math.round((keep0 / N) * 100)}%`);
	}
