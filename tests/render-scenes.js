/* Deterministic scenes shared by the renderer browser tests (render-browser.html, render-webgl-browser.html). */
// Deterministic scenes; the same kinds of views the game produces while playing.
function renderScenes() {
	const list = [];
	const add = (name, g, extra) => list.push({ name, game: g, ...extra });
	let g = new RTS.Game(42, "horizon");
	g.configureSkirmish({ players: 2 });
	g.explored.fill(1);
	const army = g.units(0).filter((e) => e.type !== "worker").map((e) => e.id);
	g.command(army, 1680, 1080);
	g.tick(0.1);
	add("Morze Wydm · zaznaczenie i ścieżki", g, { camera: { x: 1500, y: 1100, zoom: 1.4 }, selected: army, mouse: { x: 700, y: 500 }, drag: { x: 500, y: 300 } });
	g = new RTS.Game(42, "lumen");
	g.configureSkirmish({ players: 2 });
	g.explored.fill(1);
	g.time = 190;
	g.tick(0.1);
	g.effects.push(
		{ kind: "shot", x: 1500, y: 1000, tx: 1650, ty: 1050, team: 0, life: 0.1, maxLife: 0.2 },
		{ kind: "explosion", x: 1700, y: 1100, size: 40, life: 0.3, maxLife: 0.65 },
		{ kind: "command", x: 1600, y: 1000, life: 0.5, maxLife: 1 },
	);
	add("Świetlisty Gąszcz · noc, ulewa, walka", g, { camera: { x: 1650, y: 1050, zoom: 1.2 } });
	g = new RTS.Game(42, "magma");
	g.configureSkirmish({ players: 2 });
	g.explored.fill(1);
	const barracks = g.entities.find((e) => e.team === 0 && e.type === "barracks");
	barracks.rally = { x: barracks.x + 300, y: barracks.y + 120 };
	g.tick(0.1);
	add("Rzeki Magmy · budowa i punkt zbiórki", g, { camera: { x: barracks.x + 150, y: barracks.y + 60, zoom: 1.3 }, selected: [barracks.id], mouse: { x: 760, y: 420 }, building: "turret" });
	g = new RTS.Game(42, "colony5");
	for (let t = 0; t < 30; t += 0.1) g.tick(0.1);
	g.explored.fill(1);
	add("Ostatni konwój · znaczniki i mur", g, { camera: { x: 1100, y: 1400, zoom: 1.1 }, mouse: { x: 900, y: 500 }, building: "wall", wallDrag: { x: 900, y: 1300 } });
	g = new RTS.Game(42, "twinsun");
	g.configureSkirmish({ players: 3, size: "large" });
	g.tick(0.1);
	add("Wydmy Bliźniaczych Słońc · duża mapa, mgła", g, { camera: { x: 2240, y: 1440, zoom: 1 } });
	g = new RTS.Game(42, "ember");
	g.configureSkirmish({ players: 4 });
	g.explored.fill(1);
	g.time = 40;
	g.tick(0.1);
	add("Martwy Statek · 4 graczy", g, { camera: { x: 1680, y: 1000, zoom: 1.6 } });
	g = new RTS.Game(42, "colony3");
	g.explored.fill(1);
	g.tick(0.1);
	add("Świt nad Nadir · kampania", g, { camera: { x: 1400, y: 1000, zoom: 1.2 } });
	// The Swarm's obsidian base: monolith buildings, sentries and walkers.
	g = new RTS.Game(42, "horizon");
	g.configureSkirmish({ faction: "swarm", players: 2 });
	g.explored.fill(1);
	const hq = g.entities.find((e) => e.team === 0 && e.type === "hq");
	for (const [type, dx, dy] of [["turret", -170, 150], ["reactor", 180, 170], ["lab", 330, 20], ["monolith", -300, 10]]) g.spawn(type, 0, hq.x + dx, hq.y + dy);
	for (const [type, dx, dy] of [["tank", 60, 230], ["heavy", 120, 260], ["artillery", -60, 250], ["colossus", 10, 330], ["crawler", -120, 200], ["spitter", -150, 230], ["rocket", 250, 280], ["interceptor", 300, 200]])
		g.spawn(type, 0, hq.x + dx, hq.y + dy);
	g.tick(0.1);
	add("Rój · obsydianowa baza", g, { camera: { x: hq.x + 20, y: hq.y + 120, zoom: 1.5 } });
	return list;
}
