/* Procedural low-poly models for the 3D renderer: built in code from boxes and cylinders, no asset files.
   Local frame: +X is the front of a unit (its 2D angle 0), +Y up, +Z the unit's right (map y).
   Every model: build(kit, radius) → { root, update(e, info) } where
   info = { time, moving, aim (relative to the facing), recoil 0..1, built 0..1, working }.
   A kit holds the materials of one side: team colour (stripes, lights), metal, dark metal, glass.
   Colonies read rounded and pale (cylinders, domes); the Dominium angular and rust-red (wedges, plates);
   the Swarm matte obsidian monoliths, sentries and walkers with the team stripe as the only colour
   (as swarm-art.js). Wildlife and monsters use natural materials. Types without a model stay as painted
   decals (three-renderer.js). */
import { createDetail3D, createBaker, windowCurve } from "./models-detail-3d.js";
import { createNature3D } from "./nature-detail-3d.js";
import { createProps3D } from "./props-detail-3d.js";
import { createSwarm3D } from "./swarm-detail-3d.js";
import { createAct3 } from "./act3-detail-3d.js";
import { createAct2 } from "./act2-detail-3d.js";
import { createAct1 } from "./act1-detail-3d.js";
import { createShips3D } from "./ships-3d.js";

export function createModels3D(THREE) {
	const geo = {
		box: new THREE.BoxGeometry(1, 1, 1),
		cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
		cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
		cone: new THREE.ConeGeometry(1, 1, 12),
		sphere: new THREE.SphereGeometry(1, 12, 8),
		dome: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
		wedge: (() => {
			// Sloped front: a box whose top-front edge is pulled back.
			const g = new THREE.BoxGeometry(1, 1, 1),
				p = g.attributes.position;
			for (let i = 0; i < p.count; i++) if (p.getY(i) > 0 && p.getX(i) > 0) p.setX(i, 0.1);
			g.computeVertexNormals();
			return g;
		})(),
		// Tapering four-sided stone (Swarm monoliths), its pointed crown, an octahedron (Swarm flyers).
		prism: new THREE.CylinderGeometry(0.62, 1, 1, 4, 1).rotateY(Math.PI / 4),
		pyramid: new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4),
		octa: new THREE.OctahedronGeometry(1),
		// A boulder, a tapering rock spike, a half ring (ribs of wrecks).
		ico: new THREE.IcosahedronGeometry(1, 0),
		spike: new THREE.CylinderGeometry(0.22, 1, 1, 7),
		arc: new THREE.TorusGeometry(1, 0.07, 6, 18, Math.PI),
		halfCyl: new THREE.CylinderGeometry(1, 1, 1, 14, 1, false, 0, Math.PI),
		torus: new THREE.TorusGeometry(1, 0.22, 8, 24).rotateX(Math.PI / 2),
		// A cooling tower: narrow waist, wider top and base.
		tower: new THREE.LatheGeometry([0, 0.5, 1].map((t) => new THREE.Vector2(1 - Math.sin(t * Math.PI) * 0.32 - t * 0.1, t - 0.5)), 16),
	};
	const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, metalness: 0.35, flatShading: true, ...o });
	const kits = new Map();
	function kit(team, faction, tint, teamColors) {
		const swarm = faction === "swarm",
			dominion = !swarm && (faction === "dominion" || (!faction && team === 1)),
			color = tint || teamColors[team] || "#bbc1e2",
			key = [color, faction || team].join("|");
		if (kits.has(key)) return kits.get(key);
		// Swarm: matte obsidian, no glow — the team stripe is the only colour (as in swarm-art.js).
		const k = swarm
			? {
					swarm,
					team: std(color, { roughness: 0.5 }),
					glow: std(color, { roughness: 0.5 }),
					metal: std("#55606e", { roughness: 0.5, metalness: 0.1 }),
					// Sheen on the obsidian, so the light shows the cut faces of the stones.
					plate: std("#3e4856", { roughness: 0.3, metalness: 0.1 }),
					dark: std("#1c232b", { roughness: 0.7, metalness: 0.2 }),
					black: std("#06090c", { roughness: 0.9 }),
					glass: std("#6a7581", { roughness: 0.4, metalness: 0.5 }),
					warn: std("#303336", { roughness: 0.9 }),
				}
			: {
					dominion,
					team: std(color, { roughness: 0.5 }),
					glow: std(color, { emissive: color, emissiveIntensity: 0.8 }),
					metal: std(dominion ? "#9c8578" : "#b9c4b3"),
					plate: std(dominion ? "#7a5f58" : "#8fa39c"),
					dark: std(dominion ? "#4d3b3c" : "#3f5654"),
					black: std("#1d2426", { metalness: 0.6 }),
					glass: std(dominion ? "#ffb070" : "#8ff0e4", { emissive: dominion ? "#ff8a3c" : "#5fe0cf", emissiveIntensity: 0.9 }),
					warn: std("#e2b33c"),
				};
		k.white = std("#dfe6e4", { roughness: 0.5, metalness: 0.1 });
		k.red = std("#d8453c", { emissive: "#d8453c", emissiveIntensity: 0.5 });
		k.fire = std("#ff9a3c", { emissive: "#ff7a1c", emissiveIntensity: 1.4 });
		k.energy = std("#9ff7ff", { emissive: "#6fe8ff", emissiveIntensity: 1.3 });
		// Detailed models: lamps (glow at night), tyres and tracks, polished hubs, dark steel fittings.
		k.lamp = std("#fff3d6", { emissive: "#ffe6b0", emissiveIntensity: 0.35, roughness: 0.3 });
		k.rubber = std("#1a1e20", { roughness: 0.95, metalness: 0.05 });
		k.hub = std(swarm ? "#4a525c" : "#c9d2c8", { roughness: 0.35, metalness: 0.8 });
		k.steel = std("#2c3437", { roughness: 0.5, metalness: 0.75 });
		// Windows of buildings: dark reflecting glass by day, lit from inside at night (nightOnly: see
		// setNight), warm rooms, cool screens, and dark ones.
		const pane = dominion ? "#2a2830" : "#22323b";
		k.window = std(pane, { emissive: dominion ? "#ffa860" : "#ffc878", emissiveIntensity: 1.5, roughness: 0.12, metalness: 0.65 });
		k.windowCool = std(pane, { emissive: "#bfe6ff", emissiveIntensity: 1.1, roughness: 0.12, metalness: 0.65 });
		k.windowOff = std("#1b252b", { roughness: 0.12, metalness: 0.75 });
		k.window.userData.nightOnly = k.windowCool.userData.nightOnly = true;
		// Cockpit glass of aircraft: dark tinted, glossy, a faint glow of the instruments.
		k.canopy = std(dominion ? "#3a2b27" : "#1f3d47", { roughness: 0.1, metalness: 0.45, emissive: dominion ? "#ff9a50" : "#5fd8e0", emissiveIntensity: 0.05 });
		// Navigation lights of aircraft: red (left), green (right), a white strobe.
		k.navRed = std("#ff3b30", { emissive: "#ff2a1a", emissiveIntensity: 1.6 });
		k.navGreen = std("#3bff6a", { emissive: "#22e04a", emissiveIntensity: 1.6 });
		k.strobe = std("#ffffff", { emissive: "#ffffff", emissiveIntensity: 2 });
		// Crystal in a robot's hopper (the colour of the crystal deposits).
		k.crystal = std("#f4d989", { roughness: 0.15, metalness: 0.1, emissive: "#c9962a", emissiveIntensity: 0.35 });
		for (const m of Object.values(k)) if (m.isMaterial && m.emissiveIntensity && m.emissive.getHex()) glowing.push([m, m.emissiveIntensity]);
		kits.set(key, k);
		return k;
	}
	// Lights of the models (windows, lamps, cores) glow brighter at night.
	const glowing = [];
	let nightLevel = 0;
	function setNight(n) {
		if (Math.abs(n - nightLevel) < 0.01) return;
		nightLevel = n;
		for (const [m, base] of glowing) {
			m.userData.baseGlow = base; // merged models bake the base glow (models-detail-3d.js)
			m.emissiveIntensity = base * (m.userData.nightOnly ? windowCurve(n) : 0.6 + 1.6 * n);
		}
		bake.setNight(n);
		act2.setNight(n);
	}
	// Wildlife and monsters: natural materials, no team colour.
	const nature = {
		hide: std("#7c6a52", { roughness: 0.95, metalness: 0 }),
		belly: std("#b3a07e", { roughness: 0.95, metalness: 0 }),
		fur: std("#d7e3ea", { roughness: 1, metalness: 0 }),
		bone: std("#efe6cf", { roughness: 0.6, metalness: 0 }),
		basalt: std("#2a2526", { roughness: 0.9, metalness: 0.1 }),
		ember: std("#ff7a2e", { emissive: "#ff5a12", emissiveIntensity: 1.6 }),
		sand: std("#b89b68", { roughness: 1, metalness: 0 }),
		maw: std("#3a1618", { roughness: 0.8, metalness: 0 }),
		eye: std("#ffe07a", { emissive: "#ffc23a", emissiveIntensity: 1.2 }),
	};
	for (const m of [nature.ember, nature.eye]) glowing.push([m, m.emissiveIntensity]);

	// A mesh from a shared geometry: size (sx, sy, sz), position of its centre, optional rotation.
	function part(parent, g, material, [sx, sy, sz], [x, y, z], rot) {
		const m = new THREE.Mesh(geo[g], material);
		m.scale.set(sx, sy, sz);
		m.position.set(x, y, z);
		if (rot) m.rotation.set(...rot);
		m.castShadow = true;
		m.receiveShadow = true;
		parent.add(m);
		return m;
	}
	const group = (parent, [x, y, z] = [0, 0, 0]) => {
		const g = new THREE.Group();
		g.position.set(x, y, z);
		parent.add(g);
		return g;
	};

	// ---- Units and buildings of the Colonies and the Dominium: webgl3d/models-detail-3d.js ----
	const detail = createDetail3D(THREE, { group });
	detail.setEmber(nature.ember);

	// ---- Wildlife and monsters: webgl3d/nature-detail-3d.js (natureKit, made with the scenery materials) ----

	// ---- Swarm: obsidian guardians, webgl3d/swarm-detail-3d.js ----
	const swarmKit = createSwarm3D(THREE, { tools: detail.tools, group }),
		swarmBuilding = (k, r, type) => swarmKit.building(k, r, type),
		swarmSentry = (k, size, o) => swarmKit.sentry(k, size, o),
		crawler = (k, r) => swarmKit.crawler(k, r),
		swarmWalker = (k, r, o) => swarmKit.walker(k, r, o),
		swarmFlyer = (k, r) => swarmKit.flyer(k, r);
	// ---- Special buildings of act III and the orbital station: webgl3d/act3-detail-3d.js ----
	const act3 = createAct3(THREE, { tools: detail.tools, swarm: swarmKit, group, std });
	// ---- Objective sites of act II: webgl3d/act2-detail-3d.js ----
	const act2 = createAct2(THREE, { tools: detail.tools, group, std });
	// The mission on the board (setMission): chapter VIII's Swarm gates are nests, chapter IX's the Heart.
	let mission = null;
	const swarmGate = (e) => (e.type === "hq" && e.faction === "swarm" ? { colony8: "nest", colony9: "heart" }[mission] || null : null);
	const SWARM_UNITS = {
		worker: (k) => swarmSentry(k, 11, { prongs: true }),
		trooper: (k) => swarmSentry(k, 10),
		rocket: (k) => swarmSentry(k, 10, { prongs: true }),
		spitter: (k) => swarmSentry(k, 12, { spine: true }),
		saboteur: (k) => swarmSentry(k, 9),
		crawler,
		tank: (k, r) => swarmWalker(k, r, { prong: true }),
		heavy: (k, r) => swarmWalker(k, r, { twin: true, plates: true }),
		artillery: (k, r) => swarmWalker(k, r, { spike: true }),
		transport: (k, r) => swarmWalker(k, r, { legs: 3, long: true, plates: true }),
		skyguard: (k, r) => swarmWalker(k, r, { sensors: true }),
		hauler: (k, r) => swarmWalker(k, r, { legs: 3, long: true }),
		colossus: (k, r) => swarmWalker(k, r, { legs: 2, plates: true, twin: true, hump: true }),
	};

	// ---- Ships of the orbital battle: webgl3d/ships-3d.js ----
	const ships = createShips3D(THREE, { tools: detail.tools, group });
	const BUILDERS = {
		...detail.builders,
		corvette: ships.corvette,
		frigate: ships.frigate,
		lancer: ships.lancer,
		cruiser: ships.cruiser,
		carrier: ships.carrier,
		fighter: ships.fighter,
		pirate: ships.pirate,
		pirateBase: ships.pirateBase,
		uplink: (k, r) => act3.orbital(k, r),
		beast: (k, r) => natureKit.beast(k, r),
		frostTusk: (k, r) => natureKit.frostTusk(k, r),
		ashCrawler: (k, r) => natureKit.ashCrawler(k, r),
		duneMaw: (k, r) => natureKit.duneMaw(k, r),
		// Swarm-only types outside the Swarm dispatch (e.g. a crawler without a faction tag).
		crawler: (k, r) => crawler(kit(2, "swarm", "#8a94a3", []), r),
		spitter: (k) => swarmSentry(kit(2, "swarm", "#8a94a3", []), 12, { spine: true }),
		colossus: (k, r) => swarmWalker(kit(2, "swarm", "#8a94a3", []), r, { legs: 2, plates: true, twin: true, hump: true }),
		monolith: (k, r) => swarmBuilding(kit(2, "swarm", "#8a94a3", []), r, "monolith"),
	};

	// ---- Scenery: wildlife (game.wildlife(), not entities), birds, fish, floating islands, wrecks ----
	const scenery = {
		deer: std("#8a6a48", { roughness: 0.95, metalness: 0 }),
		hare: std("#b5a587", { roughness: 0.95, metalness: 0 }),
		fox: std("#c4672a", { roughness: 0.95, metalness: 0 }),
		snowfox: std("#e6e1d6", { roughness: 0.95, metalness: 0 }),
		lizard: std("#6f7d4a", { roughness: 0.8, metalness: 0 }),
		bird: std("#3b3631", { roughness: 0.9, metalness: 0 }),
		fish: std("#d0a24a", { roughness: 0.5, metalness: 0.2 }),
		rock: std("#7d6a57", { roughness: 1, metalness: 0 }),
		rockDark: std("#56493e", { roughness: 1, metalness: 0 }),
		moss: std("#2f6b5a", { roughness: 1, metalness: 0 }),
		grass: std("#7c8a63", { roughness: 1, metalness: 0 }),
		shroom: std("#58cdbd", { emissive: "#1f8f84", emissiveIntensity: 0.45, roughness: 0.6 }),
		gills: std("#2c4f4a", { roughness: 0.9, metalness: 0 }),
		violet: std("#ad7ee6", { emissive: "#6a3aa8", emissiveIntensity: 0.45, roughness: 0.6 }),
		scrap: std("#2b2725", { roughness: 0.85, metalness: 0.5 }),
		ember: std("#ff7a2e", { emissive: "#ff5a12", emissiveIntensity: 1.2 }),
	};
	for (const m of [scenery.shroom, scenery.violet, scenery.ember]) glowing.push([m, m.emissiveIntensity]);
	scenery.bone = nature.bone;
	const natureKit = createNature3D(THREE, { tools: detail.tools, group, materials: { nature, scenery, std } });
	// ---- Act I: the relay station and the landmarks of the act's story: webgl3d/act1-detail-3d.js ----
	const act1 = createAct1(THREE, { tools: detail.tools, nature: natureKit, group, std });
	// A stone of the shared irregular shapes (nature-detail-3d.js) in place of a plain icosahedron.
	function rockPart(parent, m, [sx, sy, sz], [x, y, z], i) {
		const o = new THREE.Mesh(natureKit.rockGeo(i % natureKit.ROCKS), m);
		o.scale.set(sx, sy, sz);
		o.position.set(x, y, z);
		o.rotation.set((((i * 1.3) % 0.6) - 0.3) * 0.8, i * 2.3, (((i * 0.7) % 0.4) - 0.2) * 0.8);
		o.castShadow = o.receiveShadow = true;
		parent.add(o);
		return o;
	}
	// Obstacles of the map (game.obstacles: a w × h rectangle of impassable ground, already raised by the
	// height map): props standing on it, kept inside an ellipse of the rectangle so nothing hangs over
	// passable ground. Rock tints follow the biome.
	const ROCK = { dust: std("#8a7356", { roughness: 1, metalness: 0 }), ice: std("#9aa9b2", { roughness: 0.9, metalness: 0 }), ash: std("#4c4442", { roughness: 1, metalness: 0 }) },
		ROCK_DARK = { dust: std("#6c5a44", { roughness: 1, metalness: 0 }), ice: std("#76868f", { roughness: 0.9, metalness: 0 }), ash: std("#3a3433", { roughness: 1, metalness: 0 }) },
		prop = {
			metal: std("#6d6f72", { roughness: 0.7, metalness: 0.5 }),
			rust: std("#7a4e32", { roughness: 0.9, metalness: 0.3 }),
			alien: std("#3c4642", { roughness: 0.6, metalness: 0.4 }),
			stone: std("#8e9aa0", { roughness: 1, metalness: 0 }),
			resin: std("#b07a34", { roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.85 }),
			egg: std("#d9d2b8", { roughness: 0.5, metalness: 0, emissive: "#6f8f4a", emissiveIntensity: 0.15 }),
			stem: std("#cfc6b0", { roughness: 0.8, metalness: 0 }),
		};
	glowing.push([prop.egg, prop.egg.emissiveIntensity]);
	const HULK = {
		plate: std("#8a827a", { roughness: 0.62, metalness: 0.2 }),
		plate2: std("#a49a90", { roughness: 0.55, metalness: 0.22 }),
		dark: std("#4a4440", { roughness: 0.6, metalness: 0.25 }),
		rib: std("#625a54", { roughness: 0.75, metalness: 0.25 }),
		burnt: std("#2a1e1a", { roughness: 0.95, metalness: 0.1 }),
		light: std("#ff3a22", { emissive: "#ff2a12", emissiveIntensity: 1.4 }),
		ember: std("#3a1408", { emissive: "#ff5a12", emissiveIntensity: 1.8, roughness: 1 }),
		window: std("#40301c", { emissive: "#ffc878", emissiveIntensity: 1.1 }),
	};
	for (const m of [HULK.light, HULK.ember, HULK.window]) glowing.push([m, m.emissiveIntensity]);
	const ASTEROID = std("#5e5853", { roughness: 0.95, metalness: 0.05 }),
		ASTEROID_DARK = std("#3b3734", { roughness: 1, metalness: 0.05 }),
		ASTEROID_ICE = std("#9fb0bc", { roughness: 0.55, metalness: 0.05 });
	// Detailed props: the crashed ship, debris, carcass, ruins, resin, eggs, plant, islands, unit wrecks.
	const props = createProps3D(THREE, { tools: detail.tools, nature: natureKit, group, materials: { prop, scenery, std } });
	function obstacle(kind, w, h, biome, seed) {
		const root = new THREE.Group(),
			rnd = (n) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1,
			rx = w / 2,
			rz = h / 2,
			small = Math.min(w, h),
			rock = ROCK[biome] || ROCK.dust,
			// A point inside the rectangle's ellipse (scale 0…1 of it).
			spot = (n, reach = 0.6) => {
				const a = rnd(n) * Math.PI * 2,
					d = Math.sqrt(rnd(n + 50)) * reach;
				return [Math.cos(a) * rx * d, Math.sin(a) * rz * d];
			};
		// A rock spire of one of the shared ringed shapes.
		const spire = (parent, m, scale, pos, rot, v) => {
			const o = new THREE.Mesh(natureKit.spireGeo(v % 3), m);
			o.scale.set(...scale);
			o.position.set(...pos);
			o.rotation.set(...rot);
			o.castShadow = o.receiveShadow = true;
			parent.add(o);
		};
		if (kind === "spire") {
			const H = 130 + rnd(1) * 90;
			spire(root, rock, [small * 0.34, H, small * 0.34], [0, H / 2 - 25, 0], [0, rnd(2) * 3, 0.06], seed);
			for (let n = 0; n < 3; n++) {
				const [x, z] = spot(n + 3, 0.7),
					h2 = H * (0.3 + rnd(n + 9) * 0.3);
				spire(root, rock, [small * 0.16, h2, small * 0.16], [x, h2 / 2 - 15, z], [rnd(n) * 0.3 - 0.15, rnd(n + 1) * 3, rnd(n + 2) * 0.3 - 0.15], seed + n + 1);
			}
		} else if (kind === "grove") {
			// Giant glowing mushrooms (Lumeria).
			for (let n = 0; n < 4; n++) {
				const [x, z] = n ? spot(n, 0.55) : [0, 0],
					H = (n ? 35 : 60) + rnd(n + 20) * 30,
					cap = (n ? 16 : 30) + rnd(n + 30) * 12;
				const glow = n % 3 === 2 ? scenery.violet : scenery.shroom;
				natureKit.mushroom(root, { stem: prop.stem, cap: glow, gills: scenery.gills, spot: glow === scenery.violet ? scenery.shroom : scenery.violet }, [x, z], H - 12, cap, seed + n);
			}
		} else if (kind === "wreck") props.wreck(root, w, h, rnd, rock);
		else if (kind === "debris") props.debris(root, w, h, rnd);
		else if (kind === "derelict") props.derelict(root, w, h, rnd);
		else if (kind === "ruin") props.ruin(root, w, h, rnd);
		else if (kind === "resin") props.resin(root, w, h, rnd);
		else if (kind === "eggs") props.eggs(root, w, h, rnd, biome === "ice");
		else if (kind === "processor") props.processor(root, w, h, rnd);
		else if (kind === "asteroids") {
			// Space (the orbital battle): a field of rocks floating at different heights over the plane of the
			// battle, big ones in the middle, a halo of small ones; dark, cratered stone with a few ice-bright faces.
			const count = Math.max(8, Math.min(26, Math.round((w * h) / 2600)));
			for (let n = 0; n < count; n++) {
				const [x, z] = n ? spot(n, 0.85) : [0, 0],
					edge = Math.hypot(x / rx, z / rz),
					s = small * (n ? 0.07 + rnd(n + 9) * 0.13 : 0.24) * (1 - edge * 0.4),
					y = 26 + rnd(n + 40) * 70 + (1 - edge) * 20;
				// The map's stone (biome holds the look's rocks in space): ice fields, dark basalt, or mixed rock.
				const m = biome === "ice" ? (n % 3 ? ASTEROID_ICE : ASTEROID) : biome === "dark" ? (n % 3 ? ASTEROID_DARK : ASTEROID) : n % 4 === 3 ? ASTEROID_ICE : n % 2 ? ASTEROID : ASTEROID_DARK;
				rockPart(root, m, [s * (1 + rnd(n + 3) * 0.6), s * (0.8 + rnd(n + 4) * 0.5), s * (0.9 + rnd(n + 5) * 0.4)], [x, y, z], n * 7 + seed);
			}
		} else if (kind === "hulk") {
			// The hulk of a dead warship (0.143, "Cmentarzysko Floty"), floating along the long side of its
			// field. A shaped hull (a faceted section, a long tapering prow); long wrecks broken in two with the
			// prow bent away, short ones a prow or a stern torn off. On the stern the engine block with dead
			// nozzles and the stepped tower with its bridge; turrets turned every which way, armour seams, holes
			// torn in the plating, bare frames and glowing breaches at the torn ends, a few windows and red
			// lights still lit, debris drifting from the break.
			const { box, cyl, pipe, mesh, loftGeo } = detail.tools,
				long = w >= h,
				L = (long ? w : h) * 0.98,
				W = Math.min((long ? h : w) * 0.85, L * 0.17, 82),
				H = W * 0.6,
				ship = group(root, [0, 34 + rnd(3) * 14, 0]);
			ship.rotation.order = "YXZ";
			ship.rotation.y = (long ? 0 : Math.PI / 2) + (rnd(4) > 0.5 ? Math.PI : 0);
			ship.rotation.x = (rnd(2) - 0.5) * 0.35;
			ship.rotation.z = (rnd(1) - 0.5) * 0.1;
			const key = `${Math.round(L)}x${Math.round(W)}`;
			// The hull's section at x: a narrow deck, wide shoulders, sloping sides, a keel; `s` scales it,
			// `top` lowers the deck (the prow).
			const ring = (x, s, top = 1) => [
				[x, H * 0.5 * s * top, W * 0.2 * s],
				[x, H * 0.3 * s * top, W * 0.5 * s],
				[x, -H * 0.12 * s, W * 0.44 * s],
				[x, -H * 0.5 * s, W * 0.14 * s],
				[x, -H * 0.5 * s, -W * 0.14 * s],
				[x, -H * 0.12 * s, -W * 0.44 * s],
				[x, H * 0.3 * s * top, -W * 0.5 * s],
				[x, H * 0.5 * s * top, -W * 0.2 * s],
			];
			const hullOf = (parent, name, rings) => mesh(parent, loftGeo(`hulk-${name}-${key}`, rings), HULK.plate);
			let n = 10;
			// Armour seams across the deck and along the sides, scorched holes torn in the plating.
			const plating = (parent, x0, x1) => {
				for (let x = x0 + W * 0.3; x < x1 - W * 0.2; x += W * 0.55) box(parent, HULK.dark, [W * 0.03, H * 0.03, W * 0.42], [x, H * 0.5, 0], null, 0);
				for (const z of [-1, 1]) box(parent, HULK.dark, [x1 - x0, H * 0.04, W * 0.04], [(x0 + x1) / 2, H * 0.1, z * W * 0.47], [z * 0.25, 0, 0], 0);
				// Big armour panels along the sides, in two shades, a few missing (dark hollows).
				for (let x = x0 + W * 0.1, k = 0; x < x1 - W * 0.6; x += W * 0.62, k++)
					for (const z of [-1, 1]) {
						const gone = rnd(n++) > 0.85;
						box(parent, gone ? HULK.burnt : k % 2 ? HULK.plate2 : HULK.plate, [W * 0.56, H * 0.36, W * 0.03], [x + W * 0.28, H * 0.09, z * (W * 0.48 - (gone ? W * 0.02 : 0))], [z * 0.24, 0, 0], 0);
					}
				for (let i = 0; i < 3; i++) {
					const x = x0 + (x1 - x0) * (0.2 + rnd(n++) * 0.6),
						side = rnd(n++) > 0.5 ? 1 : -1;
					box(parent, HULK.burnt, [W * (0.25 + rnd(n++) * 0.25), H * 0.3, W * 0.05], [x, H * 0.05, side * W * 0.465], [side * 0.25, 0, 0], 0);
					box(parent, HULK.ember, [W * 0.1, H * 0.08, W * 0.03], [x, H * 0.02, side * W * 0.48], [side * 0.25, 0, 0], 0);
				}
				box(parent, HULK.burnt, [W * 0.35, H * 0.03, W * 0.3], [x0 + (x1 - x0) * (0.3 + rnd(n++) * 0.4), H * 0.505, 0], null, 0);
			};
			const turret = (parent, x, r) => {
				const t = group(parent, [x, H * 0.5, 0]);
				t.rotation.y = rnd(n++) * Math.PI * 2;
				t.rotation.z = (rnd(n++) - 0.5) * 0.3;
				cyl(t, HULK.dark, r, r * 0.4, [0, r * 0.2, 0], { segs: 10, top: r * 0.85 });
				box(t, HULK.plate, [r * 1.4, r * 0.5, r * 1.1], [0, r * 0.62, 0], null, r * 0.12);
				for (const z of [-1, 1]) box(t, HULK.rib, [r * 1.8, r * 0.14, r * 0.14], [r * 1.45, r * 0.68, z * r * 0.28], [0, 0, rnd(n++) * 0.25], 0);
			};
			// A torn end at x (`dir` pointing out of the hull): bare frames, pipes sticking out, a breach glowing.
			const torn = (parent, x, dir) => {
				box(parent, HULK.ember, [W * 0.04, H * 0.62, W * 0.72], [x - dir * W * 0.03, -H * 0.02, 0], null, 0);
				for (let i = 0; i < 5; i++) {
					const s2 = 0.92 - i * 0.1,
						fx = x + dir * W * (0.1 + i * 0.14),
						frame = [
							[[W * 0.04, H * 0.06, W * 0.8 * s2], H * 0.42 * s2, 0],
							[[W * 0.04, H * 0.06, W * 0.4 * s2], -H * 0.45 * s2, 0],
							[[W * 0.04, H * 0.8 * s2, W * 0.06], 0, W * 0.42 * s2],
							[[W * 0.04, H * 0.8 * s2, W * 0.06], 0, -W * 0.42 * s2],
						];
					for (const [size, py, pz] of frame) if (rnd(n++) > 0.18 * i) box(parent, HULK.rib, size, [fx, py, pz], [(rnd(n++) - 0.5) * 0.3, 0, 0], 0);
				}
				pipe(parent, HULK.rib, [x, H * 0.3, W * 0.3], [x + dir * W * 0.9, H * 0.4, W * 0.42], W * 0.025, 5);
				pipe(parent, HULK.rib, [x, -H * 0.25, -W * 0.25], [x + dir * W * 0.75, -H * 0.4, -W * 0.38], W * 0.025, 5);
				for (let i = 0; i < 6; i++) {
					const f = i % 2 ? box(parent, HULK.plate, [W * 0.18, H * 0.03, W * 0.14], [0, 0, 0], null, 0) : rockPart(parent, HULK.burnt, [W * 0.07, W * 0.04, W * 0.06], [0, 0, 0], i + seed);
					f.position.set(x + dir * W * (0.6 + rnd(n++) * 1.4), (rnd(n++) - 0.5) * H * 1.6, (rnd(n++) - 0.5) * W * 1.4);
					f.rotation.set(rnd(n++) * 3, rnd(n++) * 3, rnd(n++) * 3);
				}
			};
			// The prow: from x0, `len` long, pointing +x.
			const prow = (parent, x0, len, name) => {
				hullOf(parent, name, [ring(x0, 1), ring(x0 + len * 0.5, 1), ring(x0 + len * 0.82, 0.74, 0.85), ring(x0 + len, 0.16, 0.5)]);
				box(parent, HULK.dark, [len * 0.5, H * 0.08, W * 0.08], [x0 + len * 0.62, -H * 0.42, 0], null, 0);
				plating(parent, x0, x0 + len * 0.6);
				if (len > W * 2.2) turret(parent, x0 + len * 0.3, W * 0.17);
				if (len > W * 3.5) turret(parent, x0 + len * 0.12, W * 0.13);
			};
			// The stern: from x0 (its end, the engines) to x1, pointing +x.
			const stern = (parent, x0, x1, name) => {
				const len = x1 - x0;
				hullOf(parent, name, [ring(x0, 0.84, 0.9), ring(x0 + W * 0.35, 1), ring(x1, 1)]);
				// Engine block and nozzles, cold and dark, a last glow deep inside the big one.
				box(parent, HULK.dark, [W * 0.25, H * 0.7, W * 0.85], [x0 - W * 0.08, 0, 0], null, W * 0.03);
				for (const [z, y, r] of [[0, 0, 0.2], [W * 0.27, -H * 0.05, 0.13], [-W * 0.27, -H * 0.05, 0.13]]) {
					cyl(parent, HULK.rib, W * r * 0.8, W * 0.3, [x0 - W * 0.33, y, z], { axis: "x", segs: 12, top: W * r });
					cyl(parent, r > 0.15 ? HULK.ember : HULK.burnt, W * r * 0.62, W * 0.02, [x0 - W * 0.48, y, z], { axis: "x", segs: 12 });
				}
				// The tower: stepped blocks, the bridge with a few windows lit, a mast with a red light.
				const tx = x0 + Math.min(len * 0.32, W * 1.4),
					tilt = (rnd(n++) - 0.5) * 0.12;
				box(parent, HULK.plate, [W * 0.85, H * 0.28, W * 0.5], [tx, H * 0.62, 0], [tilt, 0, 0], W * 0.04);
				box(parent, HULK.dark, [W * 0.55, H * 0.26, W * 0.4], [tx - W * 0.08, H * 0.88, 0], [tilt, 0, 0], W * 0.04);
				box(parent, HULK.plate2, [W * 0.32, H * 0.16, W * 0.62], [tx + W * 0.04, H * 1.07, 0], [tilt, 0, 0], W * 0.03);
				for (let i = 0; i < 5; i++) if (rnd(n++) > 0.4) box(parent, HULK.window, [W * 0.02, H * 0.05, W * 0.07], [tx + W * 0.205, H * 1.08, (i - 2) * W * 0.11], null, 0);
				const mast = [tx - W * 0.22 + tilt * W, H * 1.6, (rnd(n++) - 0.5) * W * 0.3];
				pipe(parent, HULK.rib, [tx - W * 0.16, H * 1.12, 0], mast, W * 0.02, 5);
				box(parent, HULK.light, [W * 0.04, W * 0.04, W * 0.04], mast, null, 0);
				plating(parent, x0 + W * 0.3, x1);
				if (len > W * 2.6) turret(parent, tx + W * 1.1, W * 0.17);
				if (len > W * 3.6) turret(parent, x1 - W * 0.5, W * 0.15);
				for (const z of [-1, 1]) box(parent, HULK.light, [W * 0.035, W * 0.035, W * 0.035], [x0 + W * 0.4, H * 0.3, z * W * 0.5], null, 0);
			};
			if (L > W * 7) {
				// Broken in two: the stern as it was, the prow bent away past a gap full of debris.
				const brk = -L * 0.08 + (rnd(5) - 0.5) * L * 0.1,
					gap = W * 0.9;
				stern(ship, -L / 2, brk - gap / 2, "s");
				torn(ship, brk - gap / 2, 1);
				const front = group(ship, [brk + gap / 2, (rnd(6) - 0.5) * H * 0.6, 0]);
				front.rotation.set((rnd(7) - 0.5) * 0.5, (rnd(8) - 0.5) * 0.3, (rnd(9) - 0.5) * 0.2);
				prow(front, 0, L / 2 - brk - gap / 2, "p");
				torn(front, 0, -1);
			} else if (rnd(5) > 0.5) {
				prow(ship, -L / 2 + W * 0.3, L - W * 0.3, "p");
				torn(ship, -L / 2 + W * 0.3, -1);
			} else {
				stern(ship, -L / 2 + W * 0.3, L / 2 - W * 0.3, "s");
				torn(ship, L / 2 - W * 0.3, 1);
			}
		} else {
			// Mesa: a few boulders on the plateau. Rock and outcrop: a tight pile of big boulders over most of
			// the raised ground, the biggest in the middle, so the rock reads as rock, not as a smooth mound.
			if (kind === "mesa")
				for (let n = 0; n < 5; n++) {
					const [x, z] = spot(n, 0.75),
						s = small * (0.08 + rnd(n + 9) * 0.06);
					rockPart(root, rock, [s * (1 + rnd(n + 3) * 0.4), s * (0.7 + rnd(n + 4) * 0.5), s], [x, s * 0.3, z], n + seed);
				}
			else {
				// More boulders on long rock walls: about five per square of the short side.
				const count = Math.max(7, Math.min(30, Math.round(((w * h) / (small * small)) * 5 + rnd(1) * 3)));
				// Long walls: boulders spread evenly along the long axis; round rocks: around the middle.
				const long = Math.max(w, h) / small > 1.6,
					along = (n) => {
						const t = ((n + rnd(n + 70) * 0.6) / count) * 1.6 - 0.8,
							side = (rnd(n + 80) - 0.5) * 0.5;
						return w > h ? [t * rx, side * rz] : [side * rx, t * rz];
					};
				for (let n = 0; n < count; n++) {
					const [x, z] = long ? along(n) : n ? spot(n, 0.62) : [0, 0],
						edge = Math.hypot(x / rx, z / rz),
						s = small * (n ? 0.2 + rnd(n + 9) * 0.14 : 0.34) * (1 - edge * 0.35);
					rockPart(root, n % 3 ? rock : ROCK_DARK[biome] || ROCK_DARK.dust, [s * (1.1 + rnd(n + 3) * 0.5), s * (0.75 + rnd(n + 4) * 0.45), s], [x, s * 0.2 - edge * 6, z], n + seed);
				}
			}
		}
		return { root, update() {} };
	}
	// ---- Deposits and relays (the 2D board's art.js layouts, stage by stage) ----
	// Stage n: 0 = exhausted … 6 = full (BoardArt.resourceLook / crystalLook). Map y is the model's +Z.
	const DEP = {
		ore: std("#6f7a7c", { roughness: 0.9, metalness: 0.05 }),
		oreDark: std("#4c5658", { roughness: 1, metalness: 0 }),
		vein: std("#b8ecf6", { roughness: 0.2, metalness: 0.85, emissive: "#4f95a3", emissiveIntensity: 0.45 }),
		gasRock: std("#4f4655", { roughness: 0.95, metalness: 0 }),
		crater: std("#2a2230", { roughness: 1, metalness: 0 }),
		throat: std("#0f0b12", { roughness: 1, metalness: 0 }),
		groove: std("#19131e", { roughness: 1, metalness: 0 }),
		crystal: std("#f4d989", { roughness: 0.15, metalness: 0.1, emissive: "#c9962a", emissiveIntensity: 0.35, transparent: true, opacity: 0.88 }),
		stump: std("#a08a55", { roughness: 0.6, metalness: 0 }),
		mound: std("#3d4442", { roughness: 1, metalness: 0 }),
		oreMound: std("#454d4b", { roughness: 1, metalness: 0 }),
		gasMound: std("#3d3644", { roughness: 1, metalness: 0 }),
		pit: std("#191e20", { roughness: 1, metalness: 0 }),
	};
	// Gas fissures glow less as the field empties: one material per stage.
	const FISSURE = Array.from({ length: 7 }, (_, n) => std("#d08cf0", { emissive: "#b060e0", emissiveIntensity: 0.25 + (n / 6) * 1.1, roughness: 0.6 }));
	for (const m of [DEP.vein, DEP.crystal, ...FISSURE]) glowing.push([m, m.emissiveIntensity]);
	const ORE_ROCKS = [[0, -4, 16], [-18, 2, 13], [17, 3, 13], [-4, 12, 12], [-30, 10, 9], [28, 12, 9], [10, -14, 10], [-14, -12, 9], [-20, 18, 7], [22, -6, 8]],
		ORE_COUNT = [0, 2, 3, 5, 6, 8, 10],
		FISSURES = [
			[[-10, 3], [-22, 6], [-30, 2], [-38, 7]],
			[[9, 4], [20, 1], [28, 6], [37, 3]],
			[[-4, 8], [-9, 15], [-16, 19]],
			[[5, 8], [11, 15], [9, 21]],
			[[-2, -4], [-6, -11], [-1, -16]],
		],
		PRISMS = [[0, 2, 34, 7, 1], [-15, 5, 26, 6, -3], [14, 6, 24, 6, 3], [-6, 12, 18, 5, -1], [8, 13, 16, 5, 2], [-24, 12, 13, 4, -3], [23, 13, 12, 4, 3]],
		PRISM_COUNT = [0, 2, 3, 4, 5, 6, 7];
	// A rough rock: a squashed icosahedron, turned by its index so no two look alike.
	const boulder = (root, m, [x, z, s], i) => rockPart(root, m, [s, s * 0.75, s * 0.9], [x, s * 0.35, z], i);
	// Surface of the deposit mound (an ellipsoid 42 × 24 around (0, 3), its top 1 unit above the ground).
	const moundTop = (x, z) => Math.max(0, -2.5 + 3.5 * Math.sqrt(Math.max(0, 1 - (x / 42) ** 2 - ((z - 3) / 24) ** 2)));
	// A crack along a 2D polyline: flat thin boxes from point to point, lying on the mound.
	function groove(root, m, pts, width) {
		for (let i = 1; i < pts.length; i++) {
			const [x0, z0] = pts[i - 1],
				[x1, z1] = pts[i],
				len = Math.hypot(x1 - x0, z1 - z0),
				x = (x0 + x1) / 2,
				z = (z0 + z1) / 2;
			part(root, "box", m, [len + width * 0.5, 0.5, width], [x, moundTop(x, z) + 0.15, z], [0, -Math.atan2(z1 - z0, x1 - x0), 0]);
		}
	}
	function deposit(kind, n) {
		const root = new THREE.Group();
		// A little above the ground point: the terrain triangles can rise over its bilinear height.
		root.position.y = 1.5;
		// The low mound under every deposit, in the rock's own tint; its top is 1 unit above the ground.
		part(root, "sphere", kind === "gas" ? DEP.gasMound : kind === "ore" ? DEP.oreMound : DEP.mound, [42, 3.5, 24], [0, -2.5, 3]);
		if (kind === "ore") {
			if (!n) {
				part(root, "cyl", DEP.pit, [22, 1.5, 13], [-2, 0.8, 6]);
				[[-26, 10, 4], [22, 12, 5], [8, 20, 3], [-12, -8, 3]].forEach((r, i) => boulder(root, DEP.oreDark, r, i));
			} else {
				// Pits where rock has already been dug out.
				for (let i = 0; i < Math.min(3, 6 - n); i++) part(root, "cyl", DEP.pit, [9 - i, 1.4, 6 - i * 0.6], [[26, -26, 4][i], 0.8, [6, 14, 22][i]]);
				const k = 0.72 + (n / 6) * 0.28;
				ORE_ROCKS.slice(0, ORE_COUNT[n]).forEach(([x, z, s], i) => {
					boulder(root, i % 3 ? DEP.ore : DEP.oreDark, [x, z, s * k], i);
					// Metal: shiny nuggets breaking out of the top of every bigger rock.
					if (s >= 9)
						for (let j = 0; j < (s >= 13 ? 3 : 2); j++)
							part(root, "octa", DEP.vein, [s * k * 0.22, s * k * 0.3, s * k * 0.18], [x + (j - 1) * s * k * 0.35, s * k * 0.95, z + ((i + j) % 2 ? 1 : -1) * s * k * 0.2], [j, i + j, 0.4]);
				});
			}
		} else if (kind === "gas") {
			const live = n / 6;
			FISSURES.forEach((pts, i) => groove(root, i < n ? FISSURE[n] : DEP.groove, pts, i < n ? 1.5 : 2));
			[[-22, -6, 8], [20, -7, 7], [-28, 14, 6], [26, 14, 6]].forEach(([x, z, s], i) => boulder(root, DEP.gasRock, [x, z, s * (0.8 + live * 0.2)], i + 3));
			part(root, "torus", DEP.crater, [17, 9, 9.5], [0, 2.4, 3]); // rim
			part(root, "cyl", DEP.throat, [12, 1, 6.5], [0, 1.6, 4]);
			if (n) part(root, "sphere", FISSURE[n], [7 * (0.5 + live * 0.5), 2.5, 4 * (0.5 + live * 0.5)], [0, 2, 4]);
		} else {
			// Crystals: translucent golden prisms leaning out, shorter as the field empties; stumps at the end.
			if (!n)
				[[-6, 4, 5], [6, 8, 4], [-2, 12, 3]].forEach(([x, z, h], i) => part(root, "cyl6", DEP.stump, [3, h, 3], [x, h / 2, z], [0, i, 0.2 * (i - 1)]));
			else {
				const k = 0.62 + (n / 6) * 0.38;
				// Clusters of six-sided crystals with pointed tips, smaller ones at their foot.
				PRISMS.slice(0, PRISM_COUNT[n]).forEach(([x, z, h, w, lean], i) => {
					const g = natureKit.crystals(root, DEP.crystal, [x, z], h * k + w * 1.2, w * 1.15, lean, i + 1);
					g.rotation.x = (z - 6) * 0.012;
				});
			}
		}
		return { root, update() {} };
	}
	// ---- Space (the orbital battle, 0.132; 0.143.7 richer): deposits float over the plane of the battle ----
	const SPACE_DEP = {
		gasCore: std("#f2dcff", { emissive: "#e0b8ff", emissiveIntensity: 2.2, roughness: 0.3 }),
		gasHalo: std("#e0c0ff", { emissive: "#c890ff", emissiveIntensity: 1.4, roughness: 1, transparent: true, opacity: 0.2, flatShading: false, depthWrite: false }),
		gasPuff: std("#b27aee", { emissive: "#8a48d8", emissiveIntensity: 1.0, roughness: 1, transparent: true, opacity: 0.15, flatShading: false, depthWrite: false }),
		gasPuffBlue: std("#7aa8f0", { emissive: "#3f70d8", emissiveIntensity: 0.9, roughness: 1, transparent: true, opacity: 0.13, flatShading: false, depthWrite: false }),
		spark: std("#ffffff", { emissive: "#f0e0ff", emissiveIntensity: 2.4 }),
		ice: std("#c6d6e2", { roughness: 0.45, metalness: 0.05 }),
		oreRock: std("#4c4540", { roughness: 0.92, metalness: 0.08 }),
		oreDark: std("#2f2a27", { roughness: 0.95, metalness: 0.05 }),
		metal: std("#c98a42", { roughness: 0.28, metalness: 0.95, emissive: "#5a3010", emissiveIntensity: 0.3 }),
		vein: std("#ffc060", { roughness: 0.3, metalness: 0.7, emissive: "#ff9a2a", emissiveIntensity: 0.9 }),
		crystal: std("#ffd060", { emissive: "#ff9a1a", emissiveIntensity: 1.1, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9 }),
		buoy: std("#c4ccd0", { roughness: 0.45, metalness: 0.3 }),
		panel: std("#24476e", { roughness: 0.25, metalness: 0.4, emissive: "#0c2240", emissiveIntensity: 0.5 }),
		strut: std("#4a5458", { roughness: 0.5, metalness: 0.4 }),
	};
	for (const m of ["gasCore", "gasHalo", "gasPuff", "gasPuffBlue", "spark", "metal", "vein", "crystal"]) glowing.push([SPACE_DEP[m], SPACE_DEP[m].emissiveIntensity]);
	// Ore: a big asteroid of dark stone set with nuggets of copper-gold metal and glowing veins, a train of
	// smaller chunks round it; gas: a pocket of nebula — a bright knot with a halo and two spiral arms of
	// soft glowing gas round it, sparks and ice caught in the swirl (the wider cloud: buildNebula,
	// three-renderer.js); crystals: a geode asteroid split open, clusters of glowing amber crystal bursting
	// out of it on every side, a soft glow round them. Fewer and smaller as the deposit empties (stage n:
	// 0 exhausted … 6 full).
	function spaceDeposit(kind, n) {
		const root = new THREE.Group(),
			k = n ? 0.55 + (n / 6) * 0.45 : 0.35,
			H = 30,
			{ mesh, sphereGeo } = detail.tools;
		if (kind === "ore") {
			const rocks = [[0, 0, 0, 15], [-22, 6, 8, 8], [20, -4, 10, 7], [8, 14, -18, 6], [-12, -6, -16, 5], [26, 10, -10, 4]].slice(0, n ? 1 + Math.ceil(n * 0.8) : 4);
			rocks.forEach(([x, y, z, s], i) => {
				const r = s * (n ? k : 0.5),
					c = [x * k, H + y, z * k];
				rockPart(root, i % 2 ? SPACE_DEP.oreDark : SPACE_DEP.oreRock, [r * 1.25, r, r * 1.05], c, i * 5 + 2);
				if (!n) return;
				// Nuggets of metal breaking the surface, spread over the rock, more on the big ones.
				const count = s >= 12 ? 10 : s >= 7 ? 4 : 2;
				for (let j = 0; j < count; j++) {
					const a = j * 2.39 + i,
						b = Math.acos(1 - (2 * (j + 0.5)) / count),
						ns = r * (0.16 + ((j * 7) % 5) * 0.035);
					rockPart(root, j % 3 ? SPACE_DEP.metal : SPACE_DEP.vein, [ns * 1.3, ns, ns * 1.1], [c[0] + Math.sin(b) * Math.cos(a) * r * 1.1, c[1] + Math.cos(b) * r * 0.9, c[2] + Math.sin(b) * Math.sin(a) * r * 0.98], j + i * 11);
				}
			});
			// Gravel and flakes of metal trailing round the big rock.
			if (n)
				for (let i = 0; i < 10; i++) {
					const a = i * 0.63,
						d = 25 + (i % 3) * 5;
					rockPart(root, i % 4 ? SPACE_DEP.oreDark : SPACE_DEP.metal, [1.3 + (i % 2), 1, 1.2], [Math.cos(a) * d * k, H - 4 + Math.sin(i * 1.7) * 5, Math.sin(a) * d * k * 0.6], i + 31);
				}
		} else if (kind === "gas") {
			if (n) {
				mesh(root, sphereGeo(1, 16, 12), SPACE_DEP.gasCore, [0, H, 0]).scale.setScalar(4.5 * k);
				mesh(root, sphereGeo(1, 20, 14), SPACE_DEP.gasHalo, [0, H, 0]).scale.setScalar(8 * k);
				// Two spiral arms of soft puffs, larger and fainter outwards.
				for (const arm of [0, Math.PI])
					for (let j = 0; j < 12; j++) {
						const t = j / 11,
							a = arm + t * 3.4,
							d = (7 + t * 36) * k,
							s = (4 + t * 10) * k;
						mesh(root, sphereGeo(1, 14, 10), j % 3 === 2 ? SPACE_DEP.gasPuffBlue : SPACE_DEP.gasPuff, [Math.cos(a) * d, H + Math.sin(t * 6 + arm) * 3, Math.sin(a) * d * 0.85]).scale.set(s * 1.3, s * 0.6, s);
					}
				// Sparks: new stars lighting up in the cloud.
				for (let i = 0; i < 8; i++) {
					const a = i * 2.1,
						d = (10 + (i % 4) * 8) * k;
					mesh(root, sphereGeo(1, 6, 4), SPACE_DEP.spark, [Math.cos(a) * d, H + ((i * 5) % 7) - 3, Math.sin(a) * d]).scale.setScalar(0.5 + (i % 3) * 0.25);
				}
			}
			// Ice and dust caught in the cloud.
			for (let i = 0; i < 7; i++) {
				const a = i * 2.3,
					d = 22 + (i % 3) * 8;
				rockPart(root, SPACE_DEP.ice, [1.6 + (i % 2), 1.3, 1.5], [Math.cos(a) * d, H - 8 + (i % 4) * 5, Math.sin(a) * d], i + 11);
			}
		} else {
			rockPart(root, SPACE_DEP.oreDark, [14, 10, 13], [0, H - 2, 0], 7);
			if (n) {
				// [tilt from up, turn round, height, width]: the biggest on top, the rest round the sides.
				const clusters = [[0, 0, 14, 4], [0.9, 0.4, 11, 3.2], [0.85, 2.5, 10, 3], [1.2, 4.3, 9, 2.6], [1.0, 1.5, 8, 2.4], [1.35, 3.4, 7, 2.2], [1.5, 5.4, 6, 2], [0.7, 5.9, 6, 2]];
				clusters.slice(0, n + 2).forEach(([tilt, turn, h, w], i) => {
					const pivot = group(root, [0, H - 2, 0]);
					pivot.rotation.set(0, turn, tilt);
					const g = natureKit.crystals(pivot, SPACE_DEP.crystal, [0, 0], (h * k + w) * 1.5, w * 1.5, 0, i + 1);
					g.position.y = 7.5;
				});
			}
		}
		return { root, update() {} };
	}
	// The relay in space (0.143.8): a relay satellite over the plane — a hexagonal core with radiator fins
	// and a band of the owner's colour, an outer ring on four spokes with a light strip and pods, long wings
	// of solar panels with their cells, a mast with a dish that sweeps round, whip antennae, a beacon on top
	// and a light underneath. The ring and the dish turn (returned as the "dish"); the wings stay.
	function buoy(root, light) {
		const b = group(root, [0, 50, 0]),
			turn = group(b);
		const { mesh, cyl, ball, box, pipe, torusGeo, latheGeo } = detail.tools;
		// Core: the hex body, collars, the cone underneath with its light.
		cyl(b, SPACE_DEP.buoy, 8, 16, [0, 0, 0], { segs: 6 });
		cyl(b, SPACE_DEP.strut, 9.6, 2.4, [0, 8.6, 0], { segs: 6 });
		cyl(b, SPACE_DEP.strut, 9.6, 2.4, [0, -8.6, 0], { segs: 6 });
		cyl(b, SPACE_DEP.buoy, 4, 8, [0, -13.5, 0], { segs: 6, top: 7 });
		ball(b, light, 3, [0, -18.5, 0]);
		mesh(b, torusGeo(8.6, 1, 24, "y"), light, [0, 2.5, 0]);
		// Radiator fins between the wings.
		for (const a of [Math.PI / 2, -Math.PI / 2]) {
			const fin = group(b, [Math.cos(a) * 8, 0, Math.sin(a) * 8]);
			fin.rotation.y = -a;
			box(fin, SPACE_DEP.panel, [12, 12, 0.5], [6, 0, 0], null, 0.1);
			for (let k = -2; k <= 2; k++) box(fin, SPACE_DEP.strut, [12, 0.5, 0.7], [6, k * 2.5, 0], null, 0.05);
		}
		// Wings: a truss out each side, two panels with frames and cells.
		for (const side of [-1, 1]) {
			pipe(b, SPACE_DEP.strut, [side * 8, 0, 0], [side * 66, 0, 0], 0.9, 6);
			pipe(b, SPACE_DEP.strut, [side * 8, 1.6, 0], [side * 30, 0, 0], 0.4, 5);
			for (const x of [37, 57]) {
				box(b, SPACE_DEP.panel, [18, 0.6, 14], [side * x, 0, 0], null, 0.2);
				box(b, SPACE_DEP.strut, [18.6, 0.8, 0.6], [side * x, 0, 7], null, 0.05);
				box(b, SPACE_DEP.strut, [18.6, 0.8, 0.6], [side * x, 0, -7], null, 0.05);
				for (let k = -2; k <= 2; k++) box(b, SPACE_DEP.strut, [0.35, 0.75, 14], [side * x + k * 3.6, 0, 0], null, 0.05);
				box(b, SPACE_DEP.strut, [18, 0.75, 0.3], [side * x, 0, 0], null, 0.05);
			}
		}
		// The outer ring on four spokes, its light strip, pods.
		mesh(turn, torusGeo(24, 2.2, 40, "y"), SPACE_DEP.buoy);
		mesh(turn, torusGeo(24, 0.9, 40, "y"), light, [0, 1.6, 0]);
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
			pipe(turn, SPACE_DEP.strut, [Math.cos(a) * 9, 0, Math.sin(a) * 9], [Math.cos(a) * 22.5, 0, Math.sin(a) * 22.5], 0.8, 6);
			const pod = group(turn, [Math.cos(a) * 24, 0, Math.sin(a) * 24]);
			pod.rotation.y = -a;
			box(pod, SPACE_DEP.buoy, [5, 4.4, 6], [0, 0, 0], null, 0.6);
			ball(pod, light, 0.9, [2.6, 0, 0]);
		}
		// The mast and the dish sweeping round, the feed horn at its focus.
		pipe(turn, SPACE_DEP.strut, [0, 9.8, 0], [0, 20, 0], 1.1, 6);
		const dish = group(turn, [0, 22, 0]);
		dish.rotation.z = -0.9;
		mesh(dish, latheGeo([[0, 0], [3, 0.35], [6, 1.4], [9, 3.3], [9.6, 3.9], [9.2, 4.1], [6, 2.0], [3, 0.95], [0, 0.6]], 24), SPACE_DEP.buoy);
		pipe(dish, SPACE_DEP.strut, [0, 0.6, 0], [0, 7, 0], 0.4, 5);
		for (const a of [0, 2.1, 4.2]) pipe(dish, SPACE_DEP.strut, [Math.cos(a) * 8.5, 3.4, Math.sin(a) * 8.5], [0, 7, 0], 0.25, 4);
		ball(dish, light, 0.9, [0, 7.4, 0]);
		// Whip antennae and the beacon on top.
		pipe(b, SPACE_DEP.strut, [4, 9.8, 3], [6, 24, 5], 0.3, 4);
		pipe(b, SPACE_DEP.strut, [-4, 9.8, -3], [-5, 20, -6], 0.3, 4);
		ball(b, light, 1.4, [6, 24.5, 5]);
		return turn;
	}
	// Relay: a hexagonal plinth, a tripod mast with a dish, a light in the owner's colour and a capture
	// ring that fills with the capturing side's colour.
	const ringColors = new Map(),
		ringOf = (color) => {
			if (!ringColors.has(color)) ringColors.set(color, std(color, { emissive: color, emissiveIntensity: 0.6 }));
			return ringColors.get(color);
		};
	function relay(color, hill = false, name = null, space = false) {
		const root = new THREE.Group(),
			light = ringOf(color),
			SEGMENTS = 24,
			ring = [],
			ground = [];
		// The station: base, cabinets, lattice mast, the owner's beacon, a turning dish (act1-detail-3d.js).
		const dish = space ? buoy(root, light) : act1.relayStation(root, light);
		// The capture zone (radius 95): a dashed circle in the owner's colour, flat on the ground.
		for (let i = 0; i < 36; i++) {
			const a = (i / 36) * Math.PI * 2;
			ground.push(part(root, "box", light, [8, 0.6, 1.4], [Math.cos(a) * 95, 0.5, Math.sin(a) * 95], [0, -a + Math.PI / 2, 0]));
		}
		for (let i = 0; i < SEGMENTS; i++) {
			const a = (i / SEGMENTS) * Math.PI * 2 - Math.PI / 2,
				seg = part(root, "box", light, [10, 1.5, 4], [Math.cos(a) * 40, 1.2, Math.sin(a) * 40], [0, -a + Math.PI / 2, 0]);
			seg.visible = false;
			ring.push(seg);
			ground.push(seg);
		}
		// The ground parts are laid on the terrain one by one (scene-life-3d.js): never merged.
		for (const g of ground) g.userData.keep = true;
		// The Peak (king of the hill): the resonance jammer tower over the relay.
		const jammer = hill ? act3.peak(root, color) : null,
			// The Hefajstos complex (act II, chapter VI): a machine on each control node, by its name.
			machine = name ? act2.machine(root, name) : null;
		return {
			root,
			// Parts lying on the ground: the renderer sets their height to the terrain under them.
			ground,
			update(node, i) {
				dish.rotation.y = i.time * (space ? 0.25 : 0.6);
				if (jammer) jammer.rotation.y = i.time * 0.7;
				machine?.(node, i);
				const shown = Math.round((node.progress || 0) * SEGMENTS),
					m = node.capturing >= 0 && i.colors ? ringOf(i.colors[node.capturing] || color) : light;
				ring.forEach((s, k) => {
					s.visible = k < shown;
					if (s.material !== m) {
						s.material = m;
						s.userData.batch = undefined; // the renderer batches parts by geometry and material
					}
				});
			},
		};
	}
	// Construction scaffold around a building site: poles at the corners and along the sides, rails at
	// three levels, a warning light blinking on top (shown while the building rises, see three-renderer).
	const SCAFFOLD = { pole: std("#9a8a5a", { roughness: 0.8, metalness: 0.3 }), rail: std("#c9a640", { roughness: 0.6, metalness: 0.3 }), lamp: std("#ffb13a", { emissive: "#ff9a1a", emissiveIntensity: 1.4 }) };
	glowing.push([SCAFFOLD.lamp, SCAFFOLD.lamp.emissiveIntensity]);
	function scaffold(radius) {
		const root = new THREE.Group(),
			w = radius * 1.7,
			H = Math.max(36, Math.min(80, radius * 1.2));
		for (const x of [-1, 0, 1])
			for (const z of [-1, 0, 1]) if (x || z) part(root, "box", SCAFFOLD.pole, [1.8, H, 1.8], [(x * w) / 2, H / 2, (z * w) / 2]);
		for (const y of [H * 0.3, H * 0.65, H])
			for (const side of [-1, 1]) {
				part(root, "box", SCAFFOLD.rail, [w, 1.4, 1.4], [0, y, (side * w) / 2]);
				part(root, "box", SCAFFOLD.rail, [1.4, 1.4, w], [(side * w) / 2, y, 0]);
			}
		const lamp = part(root, "box", SCAFFOLD.lamp, [3.5, 3.5, 3.5], [w / 2, H + 2.5, w / 2]);
		return { root, update: (e, i) => (lamp.visible = Math.sin(i.time * 5 + (e.id || 0)) > 0) };
	}
	// Scenery baked like the entities (static parts merged, see models-detail-3d.js): animals, birds and
	// fish share one look per kind; deposits one per kind and stage; the tall obstacles (spires, giant
	// mushrooms), drawn one by one so they can fade, get their own merged geometry. Relays are left as
	// they are (the renderer lays their ground ring on the terrain part by part).
	const baked = (key, model) => bake(model, "scenery|" + key, { id: 1 });
	const SCENERY = {
		animal: (kind, biome) => baked("animal|" + kind + "|" + (kind === "fox" && biome === "ice" ? "ice" : ""), natureKit.animal(kind, biome)),
		bird: () => baked("bird", natureKit.bird()),
		fish: () => baked("fish", natureKit.fish()),
		// Islands are drawn one by one (they fade): merged per island.
		island: (theme, size, seed) => baked(["island", theme, size, seed].join("|"), props.island(theme, size, seed)),
		wreck: (size, seed) => props.unitWreck(size, seed),
		// Plain rocks share the stone shapes in the instanced batches; every other obstacle is a few of a
		// kind on a map, merged per obstacle.
		obstacle: (kind, w, h, biome, seed) => {
			const model = obstacle(kind, w, h, biome, seed);
			return ["rock", "outcrop", "mesa"].includes(kind) ? model : baked(["obstacle", kind, w, h, biome, seed].join("|"), model);
		},
		deposit: (kind, n, space = false) => (space ? baked("spaceDeposit|" + kind + "|" + n, spaceDeposit(kind, n)) : baked("deposit|" + kind + "|" + n, deposit(kind, n))),
		relay: (color, hill, name, space = false) => baked(["relay", color, !!hill, name || "", space ? "space" : ""].join("|"), relay(color, hill, name, space)),
		scaffold,
		// Act I landmarks on the rock outcrops of its maps (webgl3d/scene-life-3d.js picks the outcrop).
		landmark: (piece, w, h) => baked(["landmark", piece, w, h].join("|"), act1.landmark(piece, w, h)),
		// Act II objective sites (webgl3d/scene-life-3d.js places them from game.act2).
		pad: () => baked("a2pad", act2.pad()),
		camp: () => baked("a2camp", act2.camp()),
		archive: () => baked("a2archive", act2.archive()),
		coreSite: () => baked("a2core", act2.coreSite()),
		stop: () => baked("a2stop", act2.stop()),
		lighthouse: () => baked("a2lighthouse", act2.lighthouse()),
		conduit: (points) => baked("a2conduit|" + points.map((p) => p.map(Math.round).join(",")).join(";"), act2.conduit(points)),
	};

	// Which builder draws an entity: Swarm faction first (its own look for every shared type), then the type.
	function builderOf(e) {
		const s = RTS.TYPES[e.type];
		if (!s) return null;
		// Space (the orbital battle): the worker is a mining drone, whatever its faction.
		if (e.type === "worker" && RTS.MISSIONS[mission]?.space) return ships.miner;
		if (e.faction === "swarm" && !s.threat && e.type !== "wall" && e.type !== "gate") {
			const gate = swarmGate(e);
			if (gate === "heart") return (k, r) => act3.heart(k, r, "#" + k.team.color.getHexString());
			if (gate === "nest") return (k, r) => act3.nest(k, r);
			if (!s.speed) return (k, r) => swarmBuilding(k, r, e.type);
			if (s.flying) return swarmFlyer;
			return SWARM_UNITS[e.type] || (s.radius < 14 ? (k) => swarmSentry(k, s.radius) : (k, r) => swarmWalker(k, r, { prong: true }));
		}
		return BUILDERS[e.type] || null;
	}

	const bake = createBaker(THREE);

	return {
		has: (e) => !!builderOf(e),
		// A fresh model for an entity; its look depends on type, side and faction only.
		create(e, teamColors) {
			const s = RTS.TYPES[e.type],
				k = kit(e.team, e.faction, e.tint, teamColors),
				model = builderOf(e)(k, s.radius),
				// Space (the orbital battle): buildings stand on a floating platform (webgl3d/ships-3d.js).
				station = !s.speed && !s.threat && !s.pirate && RTS.MISSIONS[mission]?.space && !["wall", "gate"].includes(e.type);
			if (station) {
				// The platform's thruster flames flicker with the building's own animation.
				const plumes = ships.platform(model.root, k, s.radius, e.type),
					own = model.update;
				model.update = (en, info) => {
					own?.call(model, en, info);
					plumes.update(info.time);
				};
			}
			model.key = [e.type, e.team, e.faction || "", e.tint || ""].join("|");
			const miner = e.type === "worker" && RTS.MISSIONS[mission]?.space;
			// Static parts merged per group and material (models-detail-3d.js), shared by every entity of the look.
			return bake(model, model.key + "|" + (swarmGate(e) || "") + (station ? "|station" : "") + (miner ? "|miner" : ""), e);
		},
		types: () => Object.keys(BUILDERS),
		// The mission on the board (act III's special Swarm gates); the renderer sets it with the game.
		setMission: (id) => (mission = id),
		// Weather on the models: snow cover, wetness and settled sand, 0…1, and the clock (rivulets).
		setWeather: (snow, wet, sand = 0, time = 0) => bake.setWeather(snow, wet, sand, time),
		// Surface detail (plates, worn edges, dust) on or off, and the planet's dust colour (THREE.Color).
		setSurface: (on, soil) => bake.setSurface(on, soil),
		setNight,
		// Scenery models: scenery("animal", kind, biome), ("bird"), ("fish"), ("island", theme, size, seed),
		// ("wreck", size, seed); same { root, update(e, info) } shape as the entity models.
		scenery: (what, ...args) => SCENERY[what](...args),
	};
}
