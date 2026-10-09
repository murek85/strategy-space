/* H3d (0.154): balance of the factions — two armies of equal worth (3000 metal at each faction's prices) fight
   in an empty arena, every pair of factions, 20 rounds with shuffled positions and unit mixes. The units are
   what each faction's commander builds; the Watchers' computer uses its abilities (blink, phase, merging).
   node tools/faction-sim.js [rounds=20] */
const RTS = require("../engine");
const { Game, TYPES } = RTS;

const N = Number(process.argv[2]) || 20;
const POOL = {
	colonies: ["trooper", "rocket", "tank", "raider", "grenadier", "heavy"],
	dominion: ["trooper", "rocket", "tank", "sentinel", "destroyer", "flamer", "heavy"],
	swarm: ["crawler", "spitter", "colossus", "tank"],
	watchers: ["spark", "prism", "arc", "warden", "trooper"],
};
const FACTIONS = Object.keys(POOL);

function battle(a, b, seed) {
	const g = new Game(seed, "horizon");
	g.configureSkirmish({ difficulty: "normal", faction: a, enemyFaction: b === a ? "auto" : b });
	g.entities = [];
	g.obstacles = [];
	g.waters = [];
	g.nodes = [];
	g.ores = [];
	g.gasFields = [];
	g.crystalFields = [];
	g.nextWave = 1e12;
	if (g.enemyAi) g.enemyAi.teams = {};
	g.players = { 0: { faction: a }, 1: { faction: b } };
	g.spawn("hq", 0, 150, 150).hp = 1e12;
	g.spawn("hq", 1, 2700, 1900).hp = 1e12;
	const armies = { 0: [], 1: [] },
		start = { 0: 0, 1: 0 };
	for (const [team, f] of [[0, a], [1, b]]) {
		const pool = POOL[f].filter((t) => TYPES[t]),
			k = RTS.FACTIONS[f]?.cost ?? 1;
		let spent = 0,
			i = 0;
		while (spent < 3000) {
			const type = pool[(i * 7 + seed * (team + 3)) % pool.length],
				x = team ? 1640 + (i % 4) * 30 : 1040 - (i % 4) * 30,
				y = 700 + Math.floor(i / 4) * 34 + ((seed * 13) % 40),
				e = g.spawn(type, team, x, y);
			armies[team].push(e);
			spent += (TYPES[type].cost || 60) * k;
			i++;
		}
		start[team] = spent;
	}
	// The Watchers' computer: both sides count as computers here (no humans), so its abilities run.
	g.isHuman = () => false;
	for (const t of [0, 1])
		for (const e of armies[t]) {
			e.order = { kind: "attackMove", x: t ? 1040 : 1660, y: 840 };
			e.path = g.pathTo(e, e.order);
		}
	for (let i = 0; i < 240 * 15; i++) {
		g.tick(1 / 15);
		const alive = [0, 1].map((t) => g.entities.filter((e) => e.team === t && e.hp > 0 && TYPES[e.type].speed).length);
		if (!alive[0] || !alive[1]) break;
		if (i % 150 === 149) for (const e of g.entities) if (e.hp > 0 && TYPES[e.type].speed && !e.target && e.team < 2) (e.order = { kind: "attackMove", x: 1350, y: 840 }), (e.path = g.pathTo(e, e.order));
	}
	const left = (t) => g.entities.filter((e) => e.team === t && e.hp > 0 && TYPES[e.type].speed).reduce((n, e) => n + ((TYPES[e.type].cost || 60) * (RTS.FACTIONS[t ? b : a]?.cost ?? 1) * e.hp) / e.maxHp, 0);
	return { win: left(0) > left(1), keep0: left(0) / start[0], keep1: left(1) / start[1] };
}

console.log(`H3d — frakcja przeciw frakcji (armie po 3000 metalu w cenach frakcji, ${N} rund)\n`);
console.log("frakcja A   frakcja B   wygrane A   zostaje A / B");
for (let i = 0; i < FACTIONS.length; i++)
	for (let j = i + 1; j < FACTIONS.length; j++) {
		const a = FACTIONS[i],
			b = FACTIONS[j];
		let wins = 0,
			k0 = 0,
			k1 = 0;
		for (let s = 1; s <= N; s++) {
			// Sides swapped every other round (the arena is not quite symmetric).
			const flip = s % 2 === 0,
				r = flip ? battle(b, a, s) : battle(a, b, s);
			wins += (flip ? !r.win : r.win) ? 1 : 0;
			k0 += flip ? r.keep1 : r.keep0;
			k1 += flip ? r.keep0 : r.keep1;
		}
		console.log(`${a.padEnd(11)} ${b.padEnd(11)} ${String(wins).padStart(2)}/${N}       ${Math.round((k0 / N) * 100)}% / ${Math.round((k1 / N) * 100)}%`);
	}
