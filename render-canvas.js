/* Canvas 2D renderer: the battlefield and minimap, drawn from the game state and the current view
   (camera, selection, placement preview). Split out of app.js unchanged, so the picture is identical;
   a WebGL renderer can implement the same interface (setGame, refreshFog, render). */
function createCanvasRenderer(canvas, mini) {
	"use strict";
	const { TYPES, MISSIONS, dist } = RTS;
	// ctx is swapped temporarily while a layer is drawn for the WebGL renderer.
	let ctx = canvas.getContext("2d");
	const mc = mini.getContext("2d");
	// View of the current frame, copied into the names the drawing code has always used.
	let game = null,
		W = RTS.W,
		H = RTS.H,
		width = 1,
		height = 1,
		dpr = 1,
		scale = 1,
		camera = { x: W / 2, y: H / 2, zoom: 1 },
		selected = new Set(),
		colors = [],
		mouse = { x: 0, y: 0 },
		drag = null,
		building = false,
		wallDrag = null,
		shadeBody = null,
		underUnits = null,
		viewOutline = null,
		groundLabels = true,
		groundDeposits = true,
		objects3D = false,
		weather3D = false,
		ground3D = false,
		nativeGrains = false,
		terrain = null;
	function world(p) {
		return {
			x: (p.x - width / 2) / scale + camera.x,
			y: (p.y - height / 2) / scale + camera.y,
		};
	}
	function useView(view) {
		({ game, width, height, dpr, scale, camera, selected, colors, mouse, drag, building, wallDrag, shadeBody, underUnits } = view);
		// A renderer with a perspective camera outlines on the minimap the ground it shows (map points).
		viewOutline = view.viewOutline || null;
		// A renderer that shows the names and amounts itself (the 3D board: signs facing the camera)
		// asks for the ground without them.
		groundLabels = view.groundLabels !== false;
		// A renderer with its own deposit and relay models (the 3D board) asks for the ground without them.
		groundDeposits = view.groundDeposits !== false;
		// The 3D board shows objective objects (the artifact) as models; the overlay keeps rings and captions.
		objects3D = !!view.objects3D;
		// The 3D board draws rain, snow, sand and lightning in 3D; the screen layer keeps the sky ornaments.
		weather3D = !!view.weather3D;
		// The 3D board builds tracks, craters, wrecks, habitats, wall links and map effects itself: its
		// ground painting is only the static ground.
		ground3D = !!view.ground3D;
		nativeGrains = !!view.nativeGrains;
	}
	const fog = document.createElement("canvas");
	fog.width = W / 40;
	fog.height = H / 40;
	const fogCtx = fog.getContext("2d");
	function refreshFog() {
		const pixels = fogCtx.createImageData(fog.width, fog.height);
		for (let i = 0; i < game.explored.length; i++) {
			pixels.data[i * 4] = 8;
			pixels.data[i * 4 + 1] = 18;
			pixels.data[i * 4 + 2] = 25;
			pixels.data[i * 4 + 3] = game.visible[i]
				? 0
				: game.explored[i]
					? 155
					: 242;
		}
		fogCtx.putImageData(pixels, 0, 0);
	}
	function polygon(c, points, fill, stroke) {
		c.beginPath();
		points.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
		c.closePath();
		if (fill) {
			c.fillStyle = fill;
			c.fill();
		}
		if (stroke) {
			c.strokeStyle = stroke;
			c.stroke();
		}
	}
	function syncWorld() {
		if (W === game.W && H === game.H) return;
		W = game.W;
		H = game.H;
		fog.width = W / 40;
		fog.height = H / 40;
	}
	// Bare ground (for the 3D board, which builds rocks, plants and pebbles in 3D): the painters skip
	// decorations, obstacle bodies and their 2D shadows; ground colour, patches, water beds, roads and base
	// markings stay. The art files read RTS.bareGround while this painting runs.
	let bareGround = false;
	function terrainTexture() {
		RTS.bareGround = bareGround;
		try {
			paintTerrain();
		} finally {
			RTS.bareGround = false;
		}
	}
	function paintTerrain() {
		syncWorld();
		terrain = document.createElement("canvas");
		terrain.width = W;
		terrain.height = H;
		const c = terrain.getContext("2d");
		const biome = MISSIONS[game.missionId].biome;
		c.fillStyle = MapArt.baseColor(game) || (MISSIONS[game.missionId].sunny
			? "#766847"
			: biome === "ice"
				? "#526d78"
				: biome === "ash"
					? "#383034"
					: "#283334");
		c.fillRect(0, 0, W, H);
		let seed = 145;
		const rand = () => {
			seed = (seed * 1664525 + 1013904223) >>> 0;
			return seed / 4294967296;
		};
		for (let i = 0; i < 140; i++) {
			const x = rand() * W,
				y = rand() * H,
				r = 40 + rand() * 230;
			const g = c.createRadialGradient(x, y, 0, x, y, r);
			g.addColorStop(0, i % 3 === 0 ? "#927b4822" : "#0e25272b");
			g.addColorStop(1, "#28333400");
			c.fillStyle = g;
			c.fillRect(x - r, y - r, r * 2, r * 2);
		}
		c.lineWidth = 1;
		c.strokeStyle = "#b5c1a007";
		for (let x = 0; x < W; x += 80) {
			c.beginPath();
			c.moveTo(x, 0);
			c.lineTo(x, H);
			c.stroke();
		}
		for (let y = 0; y < H; y += 80) {
			c.beginPath();
			c.moveTo(0, y);
			c.lineTo(W, y);
			c.stroke();
		}
		// Specks of grit (the 3D board scatters real gravel instead: bareGround).
		for (let i = 0; i < (bareGround ? 0 : 7500); i++) {
			const x = rand() * W,
				y = rand() * H;
			c.fillStyle = rand() > 0.5 ? "#cfcaab12" : "#080f1920";
			c.fillRect(x, y, 1 + rand() * 3, 1 + rand() * 2);
		}
		const roads = [
			[game.hq(0), ...game.nodes, game.hq(1)]
				.filter(Boolean)
				.map((p) => [p.x, p.y]),
		];
		for (const road of roads) {
			c.beginPath();
			road.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
			c.lineWidth = 70;
			c.strokeStyle = "#af986514";
			c.lineJoin = "round";
			c.stroke();
			// The dashed track marks: only on the 2D board (the 3D board has real tread marks).
			if (bareGround) continue;
			c.lineWidth = 2;
			c.setLineDash([10, 30]);
			c.strokeStyle = "#ad9c7430";
			c.stroke();
			c.setLineDash([]);
		}
		// Bare ground: a soft rock-coloured patch where the obstacle's raised ground stands.
		if (bareGround)
			for (const r of game.obstacles) {
				const cx = r.x + r.w / 2,
					cy = r.y + r.h / 2,
					g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(r.w, r.h) * 0.75);
				g.addColorStop(0, biome === "ice" ? "#8d9ea866" : biome === "ash" ? "#2a252566" : "#6d5d4855");
				g.addColorStop(1, "#00000000");
				c.fillStyle = g;
				c.beginPath();
				c.ellipse(cx, cy, r.w * 0.75, r.h * 0.75, 0, 0, Math.PI * 2);
				c.fill();
			}
		for (const r of game.obstacles.filter((o) => !o.kind && !bareGround)) {
			c.fillStyle = "#0b131950";
			c.beginPath();
			c.ellipse(
				r.x + r.w / 2 + 20,
				r.y + r.h / 2 + 25,
				r.w * 0.68,
				r.h * 0.65,
				-0.15,
				0,
				Math.PI * 2,
			);
			c.fill();
			polygon(
				c,
				[
					[r.x - 9, r.y + r.h * 0.25],
					[r.x + r.w * 0.24, r.y - 6],
					[r.x + r.w * 0.82, r.y + 8],
					[r.x + r.w + 15, r.y + r.h * 0.53],
					[r.x + r.w * 0.79, r.y + r.h + 12],
					[r.x + r.w * 0.13, r.y + r.h],
				],
				"#444a40",
				"#6b6a5055",
			);
			polygon(
				c,
				[
					[r.x + 13, r.y + r.h * 0.25],
					[r.x + r.w * 0.25, r.y + 8],
					[r.x + r.w * 0.7, r.y + 18],
					[r.x + r.w * 0.8, r.y + r.h * 0.6],
					[r.x + r.w * 0.3, r.y + r.h * 0.8],
				],
				"#5a5c49",
				"#6c6c55",
			);
			polygon(
				c,
				[
					[r.x + r.w * 0.3, r.y + r.h * 0.8],
					[r.x + r.w * 0.8, r.y + r.h * 0.6],
					[r.x + r.w * 0.7, r.y + 18],
					[r.x + r.w * 0.95, r.y + r.h * 0.5],
					[r.x + r.w * 0.76, r.y + r.h * 0.89],
				],
				"#383f39",
			);
			for (let k = 0; k < 10; k++) {
				const x = r.x + rand() * r.w,
					y = r.y + rand() * r.h;
				c.fillStyle = "#a9a17925";
				c.fillRect(x, y, 3 + rand() * 7, 2);
			}
		}
		// The painted base pad around the HQ (the 3D HQ stands on its own foundation).
		for (const b of game.entities.filter((e) => e.type === "hq" && !bareGround)) {
			c.strokeStyle = b.team !== (game.viewer ?? 0) ? "#c0796828" : "#9acbb02b";
			c.lineWidth = 2;
			c.strokeRect(b.x - 135, b.y - 120, 270, 240);
			c.setLineDash([8, 8]);
			c.strokeRect(b.x - 150, b.y - 135, 300, 270);
			c.setLineDash([]);
			c.fillStyle = "#18212880";
			c.fillRect(b.x - 130, b.y - 115, 260, 230);
			for (let i = 0; i < 4; i++) {
				c.fillStyle = "#62717266";
				c.fillRect(b.x - 125 + i * 72, b.y + 117, 14, 5);
			}
		}
		BoardArt.terrain(c, game);
		PlanetArt.terrain(c, game);
		AdvancedArt.terrain(c, game);
		SceneFX.terrain(c, game);
		MapArt.terrain(c, game);
		if (bareGround) return;
		c.font = "13px Segoe UI";
		c.fillStyle = "#849d9b55";
		c.fillText(MISSIONS[game.missionId].planet.toUpperCase(), 70, 80);
	}
	function drawNode(n) {
		const color = n.owner === -1 ? "#d4bf86" : colors[n.owner];
		ctx.save();
		ctx.translate(n.x, n.y);
		ctx.setLineDash([5, 9]);
		ctx.strokeStyle = color + "35";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(0, 0, 95, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);
		const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
		glow.addColorStop(0, color + "16");
		glow.addColorStop(1, color + "00");
		ctx.fillStyle = glow;
		ctx.fillRect(-70, -70, 140, 140);
		polygon(
			ctx,
			[
				[-32, 0],
				[-16, -27],
				[16, -27],
				[32, 0],
				[16, 27],
				[-16, 27],
			],
			"#1a252a",
			color + "77",
		);
		polygon(
			ctx,
			[
				[-13, 7],
				[-13, -18],
				[0, -37],
				[13, -18],
				[13, 7],
				[0, 17],
			],
			"#4f6962",
			color,
		);
		polygon(
			ctx,
			[
				[0, -37],
				[13, -18],
				[13, 7],
				[0, 17],
			],
			"#2f4946",
			null,
		);
		ctx.strokeStyle = color;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(0, -29);
		ctx.lineTo(0, 4);
		ctx.stroke();
		ctx.fillStyle = color;
		ctx.shadowColor = color;
		ctx.shadowBlur = 12;
		ctx.fillRect(-3, -18, 6, 12);
		ctx.shadowBlur = 0;
		ctx.strokeStyle = "#a9bfb5";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(-19, 0);
		ctx.lineTo(0, -45);
		ctx.lineTo(19, 0);
		ctx.stroke();
		ctx.fillStyle = "#92a59a";
		ctx.beginPath();
		ctx.ellipse(0, -40, 21, 6, -0.25, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = color;
		ctx.fillRect(-4, -46, 8, 3);
		if (n.progress > 0) {
			ctx.lineWidth = 4;
			ctx.strokeStyle = colors[n.capturing];
			ctx.beginPath();
			ctx.arc(
				0,
				0,
				42,
				-Math.PI / 2,
				-Math.PI / 2 + Math.PI * 2 * n.progress,
			);
			ctx.stroke();
		}
		if (groundLabels) {
			const label = nodeLabel(n);
			ctx.font = "12px Segoe UI";
			ctx.textAlign = "center";
			ctx.fillStyle = label.color;
			ctx.fillText(label.name, 0, 55);
			ctx.font = "10px Segoe UI";
			ctx.fillStyle = "#9aaba7";
			ctx.fillText(label.status, 0, 71);
		}
		ctx.restore();
	}
	// A relay's caption: its name in the owner's colour and what it gives or who holds it.
	function nodeLabel(n) {
		return {
			name: n.name,
			color: n.owner === -1 ? "#d4bf86" : colors[n.owner],
			status:
				n.owner === (game.viewer ?? 0)
					? "+5 METALU / S"
					: n.owner >= 1 && n.owner !== 2
						? (game.sideName?.(n.owner) || "PRZECIWNIK").toUpperCase()
						: "PRZEJMIJ",
		};
	}
	function drawOre(o) {
		BoardArt.resource(
			ctx,
			o,
			false,
			game.isVisible(o.x, o.y) ? game.time : 0,
			groundLabels,
		);
	}
	// A gas field pumped by a working extractor (its gas rises faster and denser).
	function gasFlowing(o) {
		return game.entities.some((e) => e.type === "extractor" && e.gasId === o.id && e.hp > 0 && !e.constructionLeft && isWorking(e));
	}
	// Whether a worker or an extractor is busy right now (animates its tool / pump).
	function isWorking(e) {
		let working = false;
		if (e.type === "extractor") {
			const field = game.gasFields.find((o) => o.id === e.gasId);
			working =
				field?.amount > 0 &&
				game
					.units((game.viewer ?? 0))
					.some(
						(w) =>
							w.order?.kind === "gas" &&
							w.order.extractorId === e.id &&
							dist(w, e) <= TYPES.extractor.radius + 25,
					);
		}
		if (e.type === "worker") {
			const destination =
				e.order?.kind === "gather"
					? game
							.resourceFields(e.order.resource)
							.find((o) => o.id === e.order.oreId)
					: e.order?.kind === "gas"
						? game.get(e.order.extractorId)
						: ["repair", "build"].includes(e.order?.kind)
							? game.get(e.order.targetId)
							: null;
			working =
				!!destination &&
				dist(e, destination) <
					(e.order.kind === "gather"
						? 42
						: (TYPES[destination.type]?.radius || 30) + 25);
			if (working && e.order.kind === "gather")
				working =
					destination.amount > 0 &&
					!e.order.returning &&
					e.cargo < game.cargoCapacity;
			if (working && e.order.kind === "gas")
				working =
					!destination.constructionLeft &&
					game.gasFields.some(
						(o) => o.id === destination.gasId && o.amount > 0,
					);
			if (working && e.order.kind === "repair")
				working =
					destination.hp < destination.maxHp && game.credits > 0;
			if (working && e.order.kind === "build")
				working = destination.constructionLeft > 0;
		}
		return working;
	}
	function drawEntity(e) {
		const s = TYPES[e.type],
			color = game.colorFor(e.team),
			sel = selected.has(e.id);
		ctx.save();
		ctx.translate(e.x, e.y);
		if (e.type === "hq") {
			ctx.save();
			ctx.fillStyle = color;
			ctx.font = "bold 13px Segoe UI";
			ctx.textAlign = "center";
			ctx.fillText(
				e.team === (game.viewer ?? 0)
					? game.centerLevel() === 2
						? "II · KOLONIA"
						: "I · PRZYCZÓŁEK"
					: "II",
				0,
				-90,
			);
			ctx.restore();
		}
		if (e.type === "flak" && sel && e.team === (game.viewer ?? 0)) {
			ctx.save();
			ctx.strokeStyle = "#91c7dd66";
			ctx.setLineDash([6, 9]);
			ctx.beginPath();
			ctx.arc(0, 0, s.range, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
		if (e.type === "workshop" && sel && e.team === (game.viewer ?? 0)) {
			ctx.save();
			ctx.strokeStyle = "#8fdec577";
			ctx.setLineDash([6, 8]);
			ctx.beginPath();
			ctx.arc(0, 0, 190, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
		if ((e.type === "workshop" || e.type === "serviceRover") && !e.constructionLeft)
			for (const id of e.repairTargets || []) {
				const unit = game.get(id);
				if (!unit || unit.hp <= 0) continue;
				ctx.save();
				ctx.strokeStyle = "#9be6c570";
				ctx.lineWidth = 1.5;
				ctx.setLineDash([3, 7]);
				ctx.lineDashOffset = -game.time * 15;
				ctx.beginPath();
				ctx.moveTo(0, -20);
				ctx.lineTo(unit.x - e.x, unit.y - e.y);
				ctx.stroke();
				ctx.restore();
			}
		// Medical post: pulsing care lines to the soldiers being treated.
		if (e.type === "medbay" && !e.constructionLeft)
			for (const id of e.healTargets || []) {
				const unit = game.get(id);
				if (!unit || unit.hp <= 0) continue;
				ctx.save();
				ctx.strokeStyle = "#8de7b870";
				ctx.lineWidth = 1.5;
				ctx.setLineDash([2, 6]);
				ctx.lineDashOffset = -game.time * 20;
				ctx.beginPath();
				ctx.moveTo(0, -30);
				ctx.lineTo(unit.x - e.x, unit.y - e.y);
				ctx.stroke();
				ctx.restore();
			}
		ctx.fillStyle = "#07111a65";
		ctx.beginPath();
		ctx.ellipse(6, 10, s.radius * 1.3, s.radius * 0.65, 0, 0, Math.PI * 2);
		ctx.fill();
		if (sel) {
			ctx.strokeStyle = color;
			ctx.lineWidth = 1.8;
			ctx.beginPath();
			ctx.ellipse(
				0,
				2,
				s.radius + 9,
				(s.radius + 9) * 0.7,
				0,
				0,
				Math.PI * 2,
			);
			ctx.stroke();
		}
		if (e.constructionLeft) {
			ctx.globalAlpha = 0.55;
			ctx.strokeStyle = "#ddc287";
			ctx.setLineDash([5, 5]);
			ctx.strokeRect(
				-s.radius - 6,
				-s.radius - 6,
				s.radius * 2 + 12,
				s.radius * 2 + 12,
			);
			ctx.setLineDash([]);
		}
		const working = isWorking(e);
		if (
			!SceneFX.construction(ctx, e) &&
			!Act2Art.body(ctx, e, game.time) &&
			!AdvancedArt.body(ctx, e, game.time, MISSIONS[game.missionId].biome)
		)
			BoardArt.body(ctx, e, game.time, game.get(e.target), working);
		if (
			!e.constructionLeft ||
			1 - e.constructionLeft / TYPES[e.type].construction >= 0.65
		)
			AdvancedArt.factionDetails(ctx, e, game.time);
		// Optional extra shading of the model from another renderer (WebGL: volume light, damage).
		if (shadeBody) shadeBody(ctx, e);
		PlanetArt.damage(ctx, e, game.time);
		if (
			e.constructionLeft &&
			1 - e.constructionLeft / TYPES[e.type].construction >= 0.25
		)
			BoardArt.scaffold(ctx, e, game.time);
		if (["trooper", "rocket"].includes(e.type) && game.cover(e)) {
			ctx.strokeStyle = "#c8e7d077";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(0, 2, s.radius + 7, Math.PI * 0.15, Math.PI * 0.85);
			ctx.stroke();
		}
		if (!s.speed) {
			ctx.font = "10px Segoe UI";
			ctx.textAlign = "center";
			ctx.fillStyle = color;
			// An extractor stands on its gas deposit: its name goes below the deposit's amount label.
			ctx.fillText((game.entityName?.(e) || TYPES[e.type].name).toUpperCase(), 0, s.radius + (e.type === "extractor" ? 34 : 20));
		}
		ctx.restore();
		if (e.constructionLeft) {
			const r = s.radius;
			ctx.fillStyle = "#14242a";
			ctx.fillRect(e.x - r, e.y - r - 20, r * 2, 6);
			ctx.fillStyle = "#ddc287";
			ctx.fillRect(
				e.x - r,
				e.y - r - 20,
				r * 2 * (1 - e.constructionLeft / s.construction),
				6,
			);
			ctx.textAlign = "center";
			ctx.font = "11px Segoe UI";
			ctx.fillText(
				`BUDOWA · ${Math.ceil(e.constructionLeft)} s`,
				e.x,
				e.y - r - 27,
			);
		}
		if (sel || e.hp < e.maxHp || e.type === "hq") {
			const bw = e.type === "hq" ? 108 : e.type === "tank" ? 46 : 28,
				y = e.y - (e.type === "hq" ? 82 : s.radius + 16);
			ctx.fillStyle = "#0b171bdd";
			ctx.fillRect(e.x - bw / 2 - 1, y - 1, bw + 2, 5);
			ctx.fillStyle = e.hp / e.maxHp < 0.3 ? "#e7a075" : color;
			ctx.fillRect(e.x - bw / 2, y, (bw * e.hp) / e.maxHp, 3);
		}
		if (e.hit > 0) {
			ctx.globalAlpha = e.hit * 3;
			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(e.x, e.y, s.radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = 1;
		}
	}
	let visualRevision = SceneFX.revision;
	function refreshTerrainIfNeeded() {
		if (visualRevision !== SceneFX.revision) {
			terrainTexture();
			visualRevision = SceneFX.revision;
		}
	}
	// World phases (drawn in map coordinates). Kept verbatim from the single render().
	function drawTerrain() {
		ctx.drawImage(terrain, 0, 0);
	}
	// Animated ground, deposits, wrecks, relays, selected paths, habitats and walls.
	function drawGround() {
		if (!ground3D) {
			PlanetArt.ground(ctx, game, {
				x: camera.x,
				y: camera.y,
				w: width / scale,
				h: height / scale,
			});
			MapArt.effects(ctx, game, { x: camera.x, y: camera.y, w: width / scale, h: height / scale });
		}
		for (const o of game.ores)
			if (groundDeposits && game.explored[game.visionIndex(o.x, o.y)]) drawOre(o);
		for (const o of game.gasFields)
			if (groundDeposits && game.explored[game.visionIndex(o.x, o.y)])
				BoardArt.resource(
					ctx,
					o,
					true,
					game.isVisible(o.x, o.y) ? game.time : 0,
					groundLabels,
					gasFlowing(o),
				);
		for (const o of game.crystalFields)
			if (groundDeposits && game.explored[game.visionIndex(o.x, o.y)])
				BoardArt.crystal(ctx, o, groundLabels);
		if (typeof FxArt !== "undefined" && !ground3D) FxArt.craters(ctx, game, { x: camera.x, y: camera.y, w: width / scale, h: height / scale });
		for (const d of game.debris)
			if (!ground3D && game.isVisible(d.x, d.y)) {
				ctx.save();
				ctx.globalAlpha = Math.min(1, d.life / 5);
				ctx.translate(d.x, d.y);
				polygon(
					ctx,
					[
						[-d.size, 3],
						[-d.size * 0.4, -8],
						[d.size, 0],
						[d.size * 0.6, 9],
					],
					"#242a2b",
					"#635a48",
				);
				ctx.restore();
			}
		if (typeof SupportArt !== "undefined" && !ground3D) SupportArt.wrecks(ctx, game);
		for (const n of game.nodes)
			if (groundDeposits && game.explored[game.visionIndex(n.x, n.y)])
				drawNode(
					game.isVisible(n.x, n.y) || n.owner === (game.viewer ?? 0)
						? n
						: { ...n, owner: -1, progress: 0 },
				);
		// The 3D board paints this ground once; its order marks come with the overlay (drawOrderMarks).
		if (!ground3D) drawPaths(false);
		if (!ground3D) {
			AdvancedArt.habitats(ctx, game);
			AdvancedArt.walls(ctx, game);
		}
	}
	// The part of the ground the WebGL renderer keeps in Canvas when it draws the rest natively:
	// animated map effects (with plugins), habitats and walls.
	// Sky layers added by map plugins (the WebGL renderer draws wildlife and islands itself).
	function drawSkyPlugins() {
		MapArt.skyPlugins(ctx, game, { x: camera.x, y: camera.y, w: width / scale, h: height / scale });
	}
	function drawMapEffects() {
		MapArt.effects(ctx, game, { x: camera.x, y: camera.y, w: width / scale, h: height / scale });
	}
	// Dashed paths of the selected units and a ring where each is heading. strong: the 3D board's overlay,
	// painted at a lower resolution and draped over the terrain, needs wider, brighter lines.
	function drawPaths(strong) {
		for (const id of selected) {
			const e = game.get(id);
			if (!e?.path.length) continue;
			ctx.strokeStyle = strong ? "#aee5c7a0" : "#aee5c738";
			ctx.lineWidth = strong ? 3.5 : 1.5;
			ctx.setLineDash(strong ? [10, 12] : [5, 8]);
			ctx.beginPath();
			ctx.moveTo(e.x, e.y);
			e.path.forEach((p) => ctx.lineTo(p.x, p.y));
			ctx.stroke();
			ctx.setLineDash([]);
			const p = e.path[e.path.length - 1];
			ctx.strokeStyle = strong ? "#aee5c7e0" : "#aee5c780";
			ctx.lineWidth = strong ? 3 : 1.5;
			ctx.beginPath();
			ctx.arc(p.x, p.y, strong ? 10 : 6, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
	// The order marks of the 3D board (its ground is painted once, its units are models): selected paths
	// and the expanding ring where a move or attack order was given.
	function drawOrderMarks() {
		drawPaths(true);
		for (const ef of game.effects) {
			if (ef.kind !== "command") continue;
			const alpha = ef.life / ef.maxLife;
			ctx.save();
			ctx.strokeStyle = ef.attack ? "#ed8c78" : "#aee5c7";
			ctx.globalAlpha = alpha;
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.arc(ef.x, ef.y, 12 + (1 - alpha) * 28, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}
	}
	function drawGroundTop() {
		if (ground3D) return;
		MapArt.effects(ctx, game, { x: camera.x, y: camera.y, w: width / scale, h: height / scale });
		AdvancedArt.habitats(ctx, game);
		AdvancedArt.walls(ctx, game);
	}
	// Units and buildings (with selection, health bars, construction) and combat effects.
	function drawUnits() {
		// Optional layer under all models from another renderer (WebGL: sun shadows).
		if (underUnits) underUnits(ctx);
		[...game.entities]
			.filter((e) => e.team === (game.viewer ?? 0) || game.isVisible(e.x, e.y))
			.sort(
				(a, b) =>
					Number(!!TYPES[a.type].flying) -
						Number(!!TYPES[b.type].flying) || a.y - b.y,
			)
			.forEach(drawEntity);
		for (const ef of game.effects) {
			if (ef.kind !== "command" && !game.isVisible(ef.x, ef.y)) continue;
			ctx.save();
			const alpha = ef.life / ef.maxLife;
			if (ef.kind === "claw") {
				ctx.globalAlpha = alpha;
				ctx.strokeStyle = "#e7c091";
				ctx.lineWidth = 3;
				for (let i = 0; i < 3; i++) {
					ctx.beginPath();
					ctx.arc(
						ef.tx + i * 5 - 5,
						ef.ty,
						12 + (1 - alpha) * 9,
						0.7,
						2.7,
					);
					ctx.stroke();
				}
			} else if (ef.kind === "shot") {
				ctx.globalAlpha = alpha;
				ctx.strokeStyle = ef.rocket ? "#f8d999" : colors[ef.team];
				ctx.lineWidth = ef.rocket ? 4 : 2;
				ctx.shadowColor = ctx.strokeStyle;
				ctx.shadowBlur = 12;
				ctx.beginPath();
				ctx.moveTo(ef.x, ef.y);
				ctx.lineTo(ef.tx, ef.ty);
				ctx.stroke();
				ctx.fillStyle = "#fff2bd";
				ctx.beginPath();
				ctx.arc(ef.x, ef.y, ef.rocket ? 8 : 5, 0, Math.PI * 2);
				ctx.fill();
			} else if (ef.kind === "explosion") {
				ctx.globalAlpha = alpha;
				ctx.strokeStyle = "#f0c989";
				ctx.lineWidth = 4 * alpha;
				ctx.beginPath();
				ctx.arc(ef.x, ef.y, ef.size * (1 - alpha) + 4, 0, Math.PI * 2);
				ctx.stroke();
				ctx.fillStyle = "#dba76e";
				ctx.globalAlpha = alpha * 0.5;
				ctx.beginPath();
				ctx.arc(ef.x, ef.y, ef.size * alpha * 0.6, 0, Math.PI * 2);
				ctx.fill();
				for (let i = 0; i < 8; i++) {
					const a = (i * Math.PI) / 4,
						r = (1 - alpha) * ef.size;
					ctx.fillStyle = i % 2 ? "#eabc72" : "#8c7770";
					ctx.fillRect(
						ef.x + Math.cos(a) * r,
						ef.y + Math.sin(a) * r,
						3,
						3,
					);
				}
			} else if (ef.kind === "command") {
				ctx.strokeStyle = ef.attack ? "#ed8c78" : "#aee5c7";
				ctx.globalAlpha = alpha;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(ef.x, ef.y, 10 + (1 - alpha) * 25, 0, Math.PI * 2);
				ctx.stroke();
			} else if (typeof FxArt !== "undefined" && FxArt.handles(ef)) FxArt.drawShapes(ctx, FxArt.shapes(ef));
			ctx.restore();
		}
	}
	// Wildlife in the air and floating scenery above the units.
	function drawSky() {
		AdvancedArt.fauna(ctx, game);
		MapArt.sky(ctx, game, { x: camera.x, y: camera.y, w: width / scale, h: height / scale });
	}
	// Canvas night shading and unit lamps; the WebGL renderer uses its light map instead.
	function drawLighting() {
		PlanetArt.lighting(ctx, game, {
			x: camera.x,
			y: camera.y,
			w: width / scale,
			h: height / scale,
		});
	}
	// Emissive map effects and precipitation, drawn after lighting.
	function drawPost() {
		drawGlow();
		drawWeather();
	}
	function drawGlow() {
		BoardArt.depositGlow(ctx, game, { x: camera.x, y: camera.y, w: width / scale, h: height / scale });
		MapArt.glow(ctx, game, { x: camera.x, y: camera.y, w: width / scale, h: height / scale });
	}
	// Rain and snow on the ground; the WebGL renderer draws them as GPU particles instead.
	function drawWeather() {
		PlanetArt.precipitation(ctx, game, {
			x: camera.x,
			y: camera.y,
			w: width / scale,
			h: height / scale,
		});
	}
	// Fog of war.
	function drawFog() {
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(fog, 0, 0, W, H);
	}
	// Campaign markers, rally points and the placement preview, above the fog.
	// Expedition mode: the artifact is a beacon seen through fog; when carried it floats above the bearer.
	function drawArtifact() {
		const a = game.modeState?.artifact;
		if (!a) return;
		const carried = a.carrier != null,
			pulse = 0.5 + 0.5 * Math.sin(game.time * 3),
			y = carried ? a.y - 34 : a.y - 6;
		ctx.save();
		if (!carried && Math.hypot(a.x - a.site.x, a.y - a.site.y) < 1) {
			ctx.strokeStyle = "rgba(245,226,122,.55)";
			ctx.lineWidth = 2;
			ctx.setLineDash([10, 8]);
			ctx.beginPath();
			ctx.ellipse(a.x, a.y, 58, 32, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);
		}
		if (carried) {
			ctx.strokeStyle = game.colorFor(a.team);
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.ellipse(a.x, a.y + 4, 24, 13, 0, 0, Math.PI * 2);
			ctx.stroke();
		}
		const s = 1 + 0.08 * pulse;
		if (!objects3D) {
			ctx.globalAlpha = 0.22 + 0.2 * pulse;
			ctx.fillStyle = "#f5e27a";
			ctx.beginPath();
			ctx.arc(a.x, y, 24 + 8 * pulse, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = 1;
			polygon(
				ctx,
				[
					[a.x, y - 20 * s],
					[a.x + 12 * s, y],
					[a.x, y + 20 * s],
					[a.x - 12 * s, y],
				],
				"#f5e27a",
				"#5b4510",
			);
			polygon(
				ctx,
				[
					[a.x, y - 12 * s],
					[a.x + 5 * s, y],
					[a.x, y + 12 * s],
				],
				"#fffbe0",
			);
		}
		if (!carried && a.progress > 0) {
			ctx.strokeStyle = a.claimant === 0 ? "#b0efd0" : "#f07d78";
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.arc(a.x, a.y - 6, 40, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * a.progress) / RTS.EXPEDITION.pickup);
			ctx.stroke();
		}
		// The 3D board draws captions on the screen, sharp (globalThis.BoardLabels, webgl3d/three-game-renderer.js).
		if (globalThis.BoardLabels) globalThis.BoardLabels.push({ x: a.x, y: y - 30, text: carried ? "ARTEFAKT" : "ARTEFAKT OBCYCH", color: "#f5e27a" });
		else {
			ctx.fillStyle = "#f5e27a";
			ctx.font = "600 11px Segoe UI, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(carried ? "ARTEFAKT" : "ARTEFAKT OBCYCH", a.x, y - 30);
		}
		ctx.restore();
	}
	// King of the hill: the central relay is marked through the fog, with the holder's colour and score.
	function drawHill() {
		const hill = game.modeState?.mode === "hill" && game.nodes.find((n) => n.hill);
		if (!hill) return;
		const s = game.modeState,
			holder = hill.owner >= 0 && hill.owner !== 2 ? hill.owner : -1,
			color = holder >= 0 ? game.colorFor(holder) : "#f5e27a",
			spin = game.time * 0.4;
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = 3;
		ctx.setLineDash([18, 12]);
		ctx.lineDashOffset = -spin * 40;
		ctx.beginPath();
		ctx.ellipse(hill.x, hill.y + 6, 118, 66, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);
		if (holder >= 0) {
			ctx.lineWidth = 6;
			ctx.globalAlpha = 0.85;
			ctx.beginPath();
			ctx.ellipse(hill.x, hill.y + 6, 132, 76, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, (s.scores[holder] || 0) / s.target));
			ctx.stroke();
			ctx.globalAlpha = 1;
		}
		if (globalThis.BoardLabels) globalThis.BoardLabels.push({ x: hill.x, y: hill.y - 92, text: "♛ SZCZYT", color });
		else {
			ctx.fillStyle = color;
			ctx.font = "700 13px Segoe UI, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("♛ SZCZYT", hill.x, hill.y - 92);
		}
		ctx.restore();
	}
	function drawOverlay() {
		if (objects3D) drawOrderMarks();
		if (game.act2) Act2Art.markers(ctx, game);
		drawArtifact();
		drawHill();
		if (typeof FactionArt !== "undefined") FactionArt.overlay(ctx, game);
		if (typeof SupportArt !== "undefined") SupportArt.overlay(ctx, game);
		for (const id of selected) {
			const b = game.get(id);
			if (game.isProducer(b) && b.rally) {
				ctx.save();
				ctx.strokeStyle = "#e4c587";
				ctx.lineWidth = 2;
				ctx.setLineDash([7, 7]);
				ctx.beginPath();
				ctx.moveTo(b.x, b.y);
				ctx.lineTo(b.rally.x, b.rally.y);
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.translate(b.rally.x, b.rally.y);
				// The 3D board stands a real flag there (webgl3d/three-renderer.js); only the ring is painted.
				if (!objects3D) {
					ctx.beginPath();
					ctx.moveTo(0, 8);
					ctx.lineTo(0, -34);
					ctx.stroke();
					polygon(
						ctx,
						[
							[0, -34],
							[26, -27],
							[0, -18],
						],
						"#e4c587",
					);
				}
				ctx.beginPath();
				ctx.ellipse(0, objects3D ? 0 : 8, 16, objects3D ? 16 : 8, 0, 0, Math.PI * 2);
				ctx.stroke();
				ctx.restore();
			}
		}
		if (building) {
			const p = world(mouse),
				field =
					building === "extractor"
						? game.gasFields.find(
								(o) => o.amount > 0 && dist(o, p) < 55,
							)
						: null,
				base = game.hq((game.viewer ?? 0));
			if (field) {
				p.x = field.x;
				p.y = field.y;
			}
			ctx.strokeStyle = "#d5bd7660";
			ctx.setLineDash([8, 8]);
			for (const source of [
				base,
				...game.nodes.filter((n) => n.owner === (game.viewer ?? 0)),
			].filter(Boolean)) {
				ctx.beginPath();
				ctx.arc(
					source.x,
					source.y,
					source.type === "hq" ? 380 : 240,
					0,
					Math.PI * 2,
				);
				ctx.stroke();
			}
			ctx.setLineDash([]);
			const anchor = game.replacement(building, p.x, p.y);
			if (anchor) {
				p.x = anchor.x;
				p.y = anchor.y;
			}
			if (building === "wall" && wallDrag) {
				const points = game.wallPoints(wallDrag, p);
				for (const point of points) {
					ctx.fillStyle = game.canBuild(point.x, point.y, "wall")
						? "#b9efbc88"
						: "#ee847888";
					ctx.fillRect(point.x - 22, point.y - 22, 44, 44);
				}
				const wallText = points.length + " segmentów · " + points.length * game.cost("wall") + " metalu";
				if (globalThis.BoardLabels) globalThis.BoardLabels.push({ x: p.x + 110, y: p.y, text: wallText, color: "#f1e0b1" });
				else {
					ctx.fillStyle = "#f1e0b1";
					ctx.font = "15px Segoe UI";
					ctx.fillText(wallText, p.x + 28, p.y);
				}
			}
			const valid = game.canBuild(p.x, p.y, building);
			ctx.fillStyle = valid ? "#aee5c755" : "#ef817855";
			ctx.strokeStyle = valid ? "#aee5c7" : "#ef8178";
			ctx.beginPath();
			ctx.arc(p.x, p.y, TYPES[building].radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		}
	}
	// Screen-space phase: vignette, selection box, sun and moon.
	function drawScreen() {
		const shade = ctx.createRadialGradient(
			width / 2,
			height / 2,
			Math.min(width, height) * 0.3,
			width / 2,
			height / 2,
			Math.max(width, height) * 0.68,
		);
		shade.addColorStop(0, "#08172000");
		shade.addColorStop(1, "#06121d70");
		ctx.fillStyle = shade;
		ctx.fillRect(0, 0, width, height);
		if (drag && dist(drag, mouse) > 5) {
			ctx.fillStyle = "#aee5c713";
			ctx.strokeStyle = "#aee5c7aa";
			ctx.lineWidth = 1;
			ctx.fillRect(drag.x, drag.y, mouse.x - drag.x, mouse.y - drag.y);
			ctx.strokeRect(drag.x, drag.y, mouse.x - drag.x, mouse.y - drag.y);
		}
		PlanetArt.atmosphere(ctx, game, width, height, !nativeGrains, !weather3D);
		MapArt.atmosphere(ctx, game, width, height);
		if (typeof FxArt !== "undefined") FxArt.stormEdge(ctx, game, width, height);
	}
	// Minimap with the base alert.
	function drawMinimapPhase() {
		renderMini();
		if (typeof FxArt !== "undefined") FxArt.stormMinimap(mc, game);
		const hill = game.modeState?.mode === "hill" && game.nodes.find((n) => n.hill);
		if (hill) {
			mc.strokeStyle = hill.owner >= 0 && hill.owner !== 2 ? game.colorFor(hill.owner) : "#f5e27a";
			mc.lineWidth = 2;
			mc.beginPath();
			mc.arc((hill.x / W) * 220, (hill.y / H) * 135, 7 + Math.sin(game.time * 3), 0, Math.PI * 2);
			mc.stroke();
		}
		const artifact = game.modeState?.artifact;
		if (artifact) {
			const x = (artifact.x / W) * 220,
				y = (artifact.y / H) * 135,
				r = 4.5 + Math.sin(game.time * 4);
			mc.fillStyle = "#f5e27a";
			mc.strokeStyle = "#3a2a08";
			mc.lineWidth = 1;
			mc.beginPath();
			mc.moveTo(x, y - r);
			mc.lineTo(x + r * 0.7, y);
			mc.lineTo(x, y + r);
			mc.lineTo(x - r * 0.7, y);
			mc.closePath();
			mc.fill();
			mc.stroke();
		}
		if (game.baseAlert && game.baseAlert.until > game.time) {
			const a = game.baseAlert;
			mc.strokeStyle = "#ff8578";
			mc.lineWidth = 2;
			mc.beginPath();
			mc.arc(
				(a.x / W) * 220,
				(a.y / H) * 135,
				7 + Math.sin(game.time * 7) * 2,
				0,
				Math.PI * 2,
			);
			mc.stroke();
		}
	}
	const WORLD_PHASES = {
		terrain: drawTerrain,
		ground: drawGround,
		groundTop: drawGroundTop,
		mapEffects: drawMapEffects,
		skyPlugins: drawSkyPlugins,
		units: drawUnits,
		sky: drawSky,
		lighting: drawLighting,
		post: drawPost,
		glow: drawGlow,
		weather: drawWeather,
		fog: drawFog,
		overlay: drawOverlay,
	};
	function drawWorld(phases) {
		ctx.save();
		ctx.translate(width / 2, height / 2);
		ctx.scale(scale, scale);
		ctx.translate(-camera.x, -camera.y);
		for (const phase of phases) WORLD_PHASES[phase]();
		ctx.restore();
	}
	function render() {
		refreshTerrainIfNeeded();
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.fillStyle = "#111e24";
		ctx.fillRect(0, 0, width, height);
		drawWorld(["terrain", "ground", "units", "sky", "lighting", "post", "fog", "overlay"]);
		drawScreen();
		drawMinimapPhase();
	}
	// Draws selected phases into another canvas (one layer of the WebGL renderer), transparent elsewhere.
	function drawLayer(target, phases) {
		const own = ctx;
		ctx = target;
		try {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const world = phases.filter((p) => p in WORLD_PHASES);
			if (world.length) drawWorld(world);
			if (phases.includes("screen")) drawScreen();
		} finally {
			ctx = own;
		}
	}
	function renderMini() {
		mc.fillStyle = "#172429";
		mc.fillRect(0, 0, 220, 135);
		mc.save();
		mc.scale(220 / W, 135 / H);
		for (const w of game.waters || []) {
			mc.fillStyle = MapArt.color(w.kind) || "#3e7a8c";
			mc.beginPath();
			mc.ellipse(w.x, w.y, w.rx * 0.9, w.ry * 0.9, 0, 0, Math.PI * 2);
			mc.fill();
		}
		game.obstacles.forEach((r) => {
			mc.fillStyle = MapArt.color(r.kind) || "#4a5144";
			mc.fillRect(r.x, r.y, r.w, r.h);
		});
		mc.drawImage(fog, 0, 0, W, H);
		game.nodes
			.filter((n) => game.explored[game.visionIndex(n.x, n.y)])
			.forEach((n) => {
				mc.fillStyle =
					n.owner === (game.viewer ?? 0)
						? colors[0]
						: game.isVisible(n.x, n.y) && n.owner === 1
							? colors[1]
							: "#d8c08b";
				mc.fillRect(n.x - 23, n.y - 23, 46, 46);
			});
		game.ores
			.filter(
				(o) =>
					o.amount > 0 && game.explored[game.visionIndex(o.x, o.y)],
			)
			.forEach((o) => {
				mc.fillStyle = "#75d5dc";
				mc.fillRect(o.x - 16, o.y - 16, 32, 32);
			});
		for (const o of game.gasFields)
			if (o.amount > 0 && game.explored[game.visionIndex(o.x, o.y)]) {
				mc.fillStyle = "#ce9ce9";
				mc.fillRect(o.x - 18, o.y - 18, 36, 36);
			}
		for (const o of game.crystalFields)
			if (o.amount > 0 && game.explored[game.visionIndex(o.x, o.y)]) {
				mc.fillStyle = "#f2ce72";
				mc.fillRect(o.x - 17, o.y - 17, 34, 34);
			}
		for (const e of game.entities) {
			if (e.team !== (game.viewer ?? 0) && !game.isVisible(e.x, e.y)) continue;
			mc.fillStyle = colors[e.team];
			const size = e.type === "hq" ? 70 : e.type === "tank" ? 28 : 18;
			mc.fillRect(e.x - size / 2, e.y - size / 2, size, size);
		}
		mc.strokeStyle = "#b9d7d477";
		mc.lineWidth = 10;
		if (viewOutline) {
			mc.beginPath();
			viewOutline.forEach((p, i) => (i ? mc.lineTo(p.x, p.y) : mc.moveTo(p.x, p.y)));
			mc.closePath();
			mc.stroke();
		} else
			mc.strokeRect(
				camera.x - width / scale / 2,
				camera.y - height / scale / 2,
				width / scale,
				height / scale,
			);
		mc.restore();
	}
	return {
		kind: "canvas",
		fogCanvas: fog,
		// Bare ground for the 3D board (see terrainTexture); repaints the terrain when it changes.
		setBareGround(on) {
			if (bareGround === !!on) return;
			bareGround = !!on;
			if (game) terrainTexture();
		},
		// New or loaded game: follow its map size and paint the static terrain.
		setGame(nextGame) {
			game = nextGame;
			terrainTexture();
		},
		refreshFog(nextGame) {
			game = nextGame;
			refreshFog();
		},
		render(view) {
			useView(view);
			render();
		},
		// Building blocks for other renderers: the painted terrain, single phases into a layer, the minimap.
		get terrainCanvas() {
			refreshTerrainIfNeeded();
			return terrain;
		},
		drawLayer(target, view, phases) {
			useView(view);
			drawLayer(target, phases);
		},
		drawMinimap(view) {
			useView(view);
			drawMinimapPhase();
		},
		entityWorking(view, e) {
			useView(view);
			return isWorking(e);
		},
		gasFlowing(view, o) {
			useView(view);
			return gasFlowing(o);
		},
		// A relay's caption (name, colour, status) for renderers that draw captions themselves.
		nodeLabel(view, node) {
			useView(view);
			return nodeLabel(node);
		},
		// One relay drawn alone (at node.x, node.y) into another canvas, with the view's team colours.
		paintNode(target, view, node) {
			useView(view);
			const own = ctx;
			ctx = target;
			try {
				drawNode(node);
			} finally {
				ctx = own;
			}
		},
	};
}
