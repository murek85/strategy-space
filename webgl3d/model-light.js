/* A model painted by the 2D art code, alone on its own canvas (0.176: moved from webgl/, only what the 3D board
   uses; the normal maps, the volume light and the scars served the PixiJS board, gone). The 3D board
   (webgl3d/three-renderer.js, look()) textures a plane with it for what has no 3D model of its own. */
function createModelLight() {
	"use strict";
	const { TYPES, MISSIONS } = RTS;
	const bodies = new Map();

	function paint(e, game, frame = 0, moving = false) {
		const s = TYPES[e.type],
			key = [e.type, e.team, e.faction || "", e.tint || "", frame, moving ? 1 : 0].join("|");
		if (bodies.has(key)) return bodies.get(key);
		const building = !s.speed,
			box = building ? 240 : Math.max(96, Math.ceil(s.radius * 5)),
			ox = box / 2,
			oy = building ? box / 2 + 12 : box / 2,
			probe = { ...e, x: 0, y: 0, angle: 0, path: moving ? [{ x: 10, y: 0 }] : [], hit: 0, cooldown: 0, constructionLeft: 0, hp: e.maxHp, order: moving ? { kind: "move", x: 10, y: 0 } : null },
			biome = MISSIONS[game.missionId].biome,
			canvas = document.createElement("canvas");
		canvas.width = canvas.height = box;
		const c = canvas.getContext("2d");
		c.translate(ox, oy);
		if (!Act2Art.body(c, probe, frame * 0.12) && !AdvancedArt.body(c, probe, frame * 0.12, biome)) BoardArt.body(c, probe, frame * 0.12, null, false);
		const entry = { key, canvas, ox, oy };
		bodies.set(key, entry);
		return entry;
	}
	return { paint };
}
