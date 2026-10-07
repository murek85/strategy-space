/* The 3D renderer in the game: the same interface as createCanvasRenderer / createPixiGameRenderer, so
   app.js keeps its camera, input and HUD. Loaded on demand (import() from app.js) when Settings →
   Renderer is "3D"; a failure (no WebGL, page opened from disk so ES modules cannot load) makes the
   game fall back to WebGL and then Canvas 2D.
   - Camera: the game camera (x, y, zoom → scale) drives the 3D camera: it looks at camera.x, camera.y
     from a fixed pitch, at the distance where the centre of the screen has the same pixels per map unit.
   - Pointer: toFlat() casts the pointer onto the terrain and returns where that map point lies on the
     flat 2D frame the game logic works on; fromFlat() goes back. Clicks, the selection box and orders in
     app.js stay unchanged (as with the 2.5D tilt).
   - Interface on the board (Canvas "overlay" phase: placement preview, rally lines, markers, ranges) is
     painted on a flat frame twice the screen and draped over the terrain; the "screen" phase (selection
     box, vignette, storm edge) is painted on a 2D canvas above the 3D board, with the box corners taken
     to the screen through fromFlat(). Selection rings and health bars are native 3D.
   - Sun from the game (game.night and the day phase, as in the WebGL renderer). */
import * as THREE from "../vendor/three.module.js";
import { createThreeRenderer } from "./three-renderer.js";

export function createThreeGameRenderer({ gameCanvas, canvasRenderer, onContextLost }) {
	const FOV = 38,
		// Overlay frame: twice the screen (the far part of the board shows more map), at this resolution.
		OVERLAY_SPAN = 2,
		OVERLAY_RES = 0.4;
	const host = document.createElement("div");
	host.className = "three-board";
	Object.assign(host.style, { position: "absolute", inset: "0", pointerEvents: "none" });
	gameCanvas.after(host);
	let base;
	try {
		base = createThreeRenderer(THREE, host, { canvasRenderer });
	} catch (error) {
		host.remove();
		throw error;
	}
	base.canvas.style.position = "absolute";
	const screenCanvas = document.createElement("canvas");
	Object.assign(screenCanvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
	host.appendChild(screenCanvas);
	const overlayCanvas = document.createElement("canvas"),
		overlayCtx = overlayCanvas.getContext("2d");
	// Whether the overlay phase drew anything: its context reports every painting call. An empty
	// overlay is neither uploaded nor sampled.
	let overlayInk = false,
		overlayShown = false;
	for (const name of ["fill", "stroke", "fillRect", "strokeRect", "fillText", "strokeText", "drawImage", "putImageData"]) {
		const own = overlayCtx[name];
		overlayCtx[name] = function (...args) {
			overlayInk = true;
			return own.apply(this, args);
		};
	}
	let destroyed = false,
		game = null,
		view = null,
		last = performance.now();
	base.canvas.addEventListener("webglcontextlost", (event) => {
		event.preventDefault();
		if (!destroyed) onContextLost?.();
	});

	const mapOf = (p, v = view) => ({ x: (p.x - v.width / 2) / v.scale + v.camera.x, y: (p.y - v.height / 2) / v.scale + v.camera.y });
	const flatOf = (m, v = view) => ({ x: (m.x - v.camera.x) * v.scale + v.width / 2, y: (m.y - v.camera.y) * v.scale + v.height / 2 });
	const fromFlat = (p) => (view ? base.mapToScreen(mapOf(p)) : p);

	// Where the building being placed would stand (the overlay's rules in render-canvas.js: an extractor
	// snaps to a gas field, a rebuild to the old foundation; a dragged wall is a row of segments).
	function placementsOf(v) {
		if (!v.building || !v.mouse) return [];
		const p = mapOf(v.mouse),
			field = v.building === "extractor" ? game.gasFields.find((o) => o.amount > 0 && Math.hypot(o.x - p.x, o.y - p.y) < 55) : null;
		if (field) Object.assign(p, { x: field.x, y: field.y });
		const anchor = game.replacement?.(v.building, p.x, p.y);
		if (anchor) Object.assign(p, { x: anchor.x, y: anchor.y });
		const points = v.building === "wall" && v.wallDrag ? game.wallPoints(v.wallDrag, p) : [p];
		return points.map((q) => ({ type: v.building, x: q.x, y: q.y, valid: game.canBuild(q.x, q.y, v.building) }));
	}
	function size(canvas, w, h) {
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
		}
	}

	function render(v) {
		view = v;
		const now = performance.now(),
			dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		const rig = base.rig;
		rig.x = v.camera.x;
		rig.y = v.camera.y;
		rig.distance = v.height / 2 / (v.scale * Math.tan((FOV * Math.PI) / 360));
		rig.yaw = v.camera.yaw || 0;
		// Far out the camera looks down steeply (overview); close in it lowers for a more cinematic view.
		const zoom = Math.max(1, Math.min(5.5, v.camera.zoom || 1));
		const pitch = 1.05 - ((zoom - 1) / 4.5) * 0.35,
			// The player's tilt (PageUp / PageDown, Alt + middle drag) lowers it to just over the ground:
			// the horizon and the sky come into view.
			tilt = Math.max(0, Math.min(1, v.camera.tilt || 0));
		rig.pitch = pitch - tilt * (pitch - 0.1);
		base.setSelection(v.selected);
		// Tall things (floating islands, spires, giant mushrooms) fade in front of the pointer.
		base.setPointer(v.mouse ? fromFlat(v.mouse) : null);
		const phase = (game.time / 360) % 1;
		base.setSun({ elevation: 1 - 2 * game.night, across: Math.sin(phase * Math.PI * 2), night: game.night });

		// Interface on the board, draped over the terrain.
		const ow = v.width * OVERLAY_SPAN,
			oh = v.height * OVERLAY_SPAN,
			shift = (p) => p && { ...p, x: p.x + (ow - v.width) / 2, y: p.y + (oh - v.height) / 2 };
		size(overlayCanvas, Math.round(ow * OVERLAY_RES), Math.round(oh * OVERLAY_RES));
		overlayInk = false;
		// Mission markers of act II become light pillars: collect where the overlay draws them.
		const beacons = [],
			labels = [];
		if (typeof Act2Art !== "undefined") {
			Act2Art.onBeacon = (p, color, radius) => beacons.push({ x: p.x, y: p.y, color, radius });
			// Their captions go on the screen layer instead (sharp, upright).
			Act2Art.onLabel = (l) => labels.push(l);
		}
		// So do the other captions of the overlay (artifact, hill, orbital strike, wall cost).
		globalThis.BoardLabels = labels;
		try {
			canvasRenderer.drawLayer(overlayCtx, { ...v, width: ow, height: oh, dpr: OVERLAY_RES, mouse: shift(v.mouse), drag: null, objects3D: true }, ["overlay"]);
		} finally {
			if (typeof Act2Art !== "undefined") Act2Art.onBeacon = Act2Art.onLabel = null;
			globalThis.BoardLabels = null;
		}
		base.setBeacons(beacons);
		base.setPlacements(placementsOf(v));
		if (overlayInk) base.setOverlay(overlayCanvas, { x: v.camera.x, y: v.camera.y, scale: v.scale, width: ow, height: oh });
		else if (overlayShown) base.setOverlay(null);
		overlayShown = overlayInk;

		base.render(dt);
		// The minimap outlines the ground the 3D camera sees (a trapezoid), not the flat 2D frame.
		const corners = [
			[0, 0],
			[v.width, 0],
			[v.width, v.height],
			[0, v.height],
		].map(([x, y]) => base.screenToMap({ x, y }));

		// Screen layer: the selection box corners go to where their map points are on the 3D board.
		size(screenCanvas, Math.round(v.width * v.dpr), Math.round(v.height * v.dpr));
		const screenCtx = screenCanvas.getContext("2d");
		canvasRenderer.drawLayer(screenCtx, { ...v, mouse: v.mouse && fromFlat(v.mouse), drag: v.drag && { ...v.drag, ...fromFlat(v.drag) }, weather3D: true, nativeGrains: true }, ["screen"]);
		drawLabels(screenCtx, labels, v);
		canvasRenderer.drawMinimap({ ...v, viewOutline: corners });
	}

	// Captions of the campaign's mission markers on the screen: a small glass card with a lit edge in the
	// marker's colour, over the map point (a little above the ground), skipped off screen or behind the camera.
	function drawLabels(c, labels, v) {
		if (!labels.length) return;
		c.save();
		c.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
		c.textAlign = "center";
		c.textBaseline = "alphabetic";
		for (const l of labels) {
			const p = base.mapToScreen({ x: l.x, y: l.y }, 30);
			if (p.behind || p.x < -100 || p.y < -40 || p.x > v.width + 100 || p.y > v.height + 40) continue;
			c.font = "600 12px Segoe UI, sans-serif";
			const title = l.text,
				tw = c.measureText(title).width;
			c.font = "11px Segoe UI, sans-serif";
			const sw = l.sub ? c.measureText(l.sub).width : 0,
				w = Math.max(tw, sw) + 22,
				h = l.sub ? 36 : 22,
				x = Math.round(p.x - w / 2),
				y = Math.round(p.y - h);
			c.fillStyle = "rgba(6, 14, 20, 0.82)";
			c.fillRect(x, y, w, h);
			c.strokeStyle = "rgba(160, 220, 210, 0.22)";
			c.lineWidth = 1;
			c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
			c.fillStyle = l.color;
			c.fillRect(x, y, 3, h);
			c.font = "600 12px Segoe UI, sans-serif";
			c.fillText(title, p.x + 1, y + 15);
			if (l.sub) {
				c.font = "11px Segoe UI, sans-serif";
				c.fillStyle = "#c9d8db";
				c.fillText(l.sub, p.x + 1, y + 29);
			}
		}
		c.restore();
	}

	return {
		kind: "three",
		get fogCanvas() {
			return canvasRenderer.fogCanvas;
		},
		canvas: base.canvas,
		setGame(nextGame) {
			game = nextGame;
			base.setGame(nextGame);
		},
		refreshFog(nextGame) {
			canvasRenderer.refreshFog(nextGame);
		},
		render,
		// Pointer (CSS px on the board) → the flat frame of the game logic, and back.
		toFlat(p) {
			if (!view) return p;
			return flatOf(base.screenToMap(p));
		},
		fromFlat,
		heightAt: (x, y) => base.heightAt(x, y) / 70,
		// The Three.js renderer underneath (tests and debugging).
		three: base,
		stats: () => base.stats(),
		destroy() {
			destroyed = true;
			base.destroy();
			host.remove();
		},
	};
}
