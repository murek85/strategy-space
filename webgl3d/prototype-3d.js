/* 3D prototype page: one scenario map rendered by the Three.js renderer with the real simulation running
   underneath. Selection and orders go through the renderer's screenToMap()/mapToScreen(). */
import * as THREE from "three";
import { createThreeRenderer } from "./three-renderer.js";

const $ = (id) => document.getElementById(id),
	host = $("view");
const { TYPES } = RTS;

// ?map=<mission id> picks another map (e.g. frost, magma, horizon); Świetlisty Gąszcz by default.
const MAP = RTS.MISSIONS[new URLSearchParams(location.search).get("map")] ? new URLSearchParams(location.search).get("map") : "lumen";
let game = new RTS.Game(42, MAP);
game.configureSkirmish({ players: 2, mode: "conquest" });
game.explored.fill(1);
game.nextWave = 40;

let view;
try {
	const canvasRenderer = createCanvasRenderer(document.createElement("canvas"), document.createElement("canvas"));
	view = createThreeRenderer(THREE, host, { canvasRenderer });
	view.setGame(game);
} catch (error) {
	$("fallback").style.display = "flex";
	$("panel").hidden = true;
	throw error;
}
window.prototype3d = {
	view,
	get game() {
		return game;
	},
	THREE,
	select: (ids) => select(ids),
	gallery: () => gallery(),
};

const base = game.hq(0);
const home = () => {
	const b = game.hq(0) || base;
	Object.assign(view.rig, { x: b.x + (b.x < game.W / 2 ? 350 : -350), y: b.y + (b.y < game.H / 2 ? 200 : -200) });
};
home();
view.rig.yaw = base.y < game.H / 2 ? Math.PI : 0;

let paused = false,
	selected = [];
const attack = () => {
	const enemy = game.enemyBases()[0];
	if (enemy) game.command(game.units(0).filter((e) => e.type !== "worker").map((e) => e.id), enemy.x, enemy.y, null, true);
};

// Controls: camera.
const keys = new Set();
addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
function moveCamera(dt) {
	const rig = view.rig,
		speed = rig.distance * 1.1 * dt;
	let fx = 0,
		fy = 0;
	if (keys.has("w") || keys.has("arrowup")) fy -= 1;
	if (keys.has("s") || keys.has("arrowdown")) fy += 1;
	if (keys.has("a") || keys.has("arrowleft")) fx -= 1;
	if (keys.has("d") || keys.has("arrowright")) fx += 1;
	// Screen-relative: "up" is away from the camera.
	const c = Math.cos(rig.yaw),
		s = Math.sin(rig.yaw);
	rig.x = clampX(rig.x + (fx * c + fy * s) * speed);
	rig.y = clampY(rig.y + (-fx * s + fy * c) * speed);
	if (keys.has("q")) rig.yaw -= 1.6 * dt;
	if (keys.has("e")) rig.yaw += 1.6 * dt;
	if (keys.has("r")) rig.pitch = Math.min(1.45, rig.pitch + dt);
	if (keys.has("f")) rig.pitch = Math.max(0.45, rig.pitch - dt);
}
const clampX = (x) => Math.max(0, Math.min(game.W, x)),
	clampY = (y) => Math.max(0, Math.min(game.H, y));

host.addEventListener(
	"wheel",
	(e) => {
		e.preventDefault();
		view.rig.distance = Math.max(260, Math.min(3200, view.rig.distance * (e.deltaY < 0 ? 0.88 : 1.13)));
	},
	{ passive: false },
);
host.addEventListener("contextmenu", (e) => e.preventDefault());

// Controls: select (click or box), order (right click), pan (middle drag).
let press = null;
const local = (e) => {
	const r = host.getBoundingClientRect();
	return { x: e.clientX - r.left, y: e.clientY - r.top };
};
function entityAt(p) {
	let best = null,
		bestD = Infinity;
	for (const e of game.entities) {
		if (e.hp <= 0) continue;
		const s = TYPES[e.type],
			d = Math.hypot(e.x - p.x, e.y - p.y);
		if (d < s.radius + 14 && d < bestD) {
			best = e;
			bestD = d;
		}
	}
	return best;
}
function select(ids) {
	selected = ids;
	view.setSelection(ids);
}
host.addEventListener("pointerdown", (e) => {
	host.setPointerCapture(e.pointerId);
	press = { button: e.button, start: local(e), rig: { x: view.rig.x, y: view.rig.y }, ground: view.screenToMap(local(e)) };
});
host.addEventListener("pointermove", (e) => {
	if (!press) return;
	const p = local(e);
	if (press.button === 1) {
		// Keep the grabbed ground point under the cursor.
		const now = view.screenToMap(p);
		view.rig.x = clampX(view.rig.x - (now.x - press.ground.x));
		view.rig.y = clampY(view.rig.y - (now.y - press.ground.y));
	} else if (press.button === 0) {
		const box = $("box"),
			x = Math.min(p.x, press.start.x),
			y = Math.min(p.y, press.start.y),
			w = Math.abs(p.x - press.start.x),
			h = Math.abs(p.y - press.start.y);
		Object.assign(box.style, { display: w + h > 6 ? "block" : "none", left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
	}
});
host.addEventListener("pointerup", (e) => {
	if (!press) return;
	const p = local(e),
		ground = view.screenToMap(p);
	if (press.button === 0) {
		$("box").style.display = "none";
		const x0 = Math.min(p.x, press.start.x),
			x1 = Math.max(p.x, press.start.x),
			y0 = Math.min(p.y, press.start.y),
			y1 = Math.max(p.y, press.start.y);
		if (x1 - x0 + y1 - y0 > 6) {
			// Box: own units whose foot is inside the rectangle on screen.
			select(
				game.units(0).filter((u) => {
					const s = view.mapToScreen(u);
					return !s.behind && s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1;
				}).map((u) => u.id),
			);
		} else {
			const hit = entityAt(ground);
			select(hit && hit.team === 0 ? [hit.id] : []);
		}
	} else if (press.button === 2 && selected.length) {
		const target = entityAt(ground);
		const enemy = target && target.team !== 0 ? target.id : null;
		game.command(selected, ground.x, ground.y, enemy, false);
	}
	press = null;
});

// Model gallery: every type side by side for each look (Colonies, Dominium, Swarm, wildlife), walking in
// place, with names; the simulation stays paused.
const labels = [];
function gallery() {
	game = new RTS.Game(7, MAP);
	game.configureSkirmish({ players: 2, mode: "conquest" });
	game.entities = [];
	game.explored.fill(1);
	game.visible.fill(1);
	const animal = (t) => TYPES[t].threat || t === "beast";
	const rows = [
		{ team: 0, faction: "colonies", types: Object.keys(TYPES).filter((t) => !animal(t) && (!TYPES[t].faction || TYPES[t].faction === "colonies")) },
		{ team: 1, faction: "dominion", types: Object.keys(TYPES).filter((t) => !animal(t) && (!TYPES[t].faction || TYPES[t].faction === "dominion")) },
		{ team: 1, faction: "swarm", types: Object.keys(TYPES).filter((t) => !animal(t) && (!TYPES[t].faction || TYPES[t].faction === "swarm")) },
		{ team: 2, faction: null, types: Object.keys(TYPES).filter(animal) },
	];
	const PER_ROW = 14,
		STEP = 150;
	let y = 180;
	for (const labelEl of labels.splice(0)) labelEl.el.remove();
	for (const row of rows) {
		row.types.forEach((type, n) => {
			const x = 260 + (n % PER_ROW) * STEP;
			if (n && n % PER_ROW === 0) y += STEP;
			const e = game.spawn(type, row.team, x, y);
			if (row.faction) e.faction = row.faction;
			else delete e.faction;
			e.angle = Math.PI / 2;
			if (TYPES[type].speed) e.path = [{ x, y: y + 1 }];
			const el = document.createElement("div");
			el.className = "tag";
			el.textContent = (row.faction === "swarm" && RTS.SWARM_NAMES?.[type]) || TYPES[type].name;
			document.body.appendChild(el);
			labels.push({ el, e });
		});
		y += STEP * 1.3;
	}
	paused = true;
	$("pause").setAttribute("aria-pressed", "true");
	for (const box of document.querySelectorAll("[data-option=fog]")) box.checked = view.options.fog = false;
	view.setGame(game);
	select([]);
	Object.assign(view.rig, { x: 800, y: 420, distance: 900, pitch: 0.95, yaw: 0 });
}
function placeLabels() {
	for (const { el, e } of labels) {
		const p = view.mapToScreen(e, TYPES[e.type].flying ? 80 : 4);
		el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y + 14)}px) translateX(-50%)`;
		el.hidden = p.behind || view.rig.distance > 1500;
	}
}

// Panel.
const timeButtons = [...document.querySelectorAll("[data-time]")];
const setTime = (value) => {
	view.timeOfDay = value === "auto" ? null : Number(value);
	if (value !== "auto") $("tod").value = value;
	for (const b of timeButtons) b.setAttribute("aria-pressed", String(b.dataset.time === String(value)));
};
for (const b of timeButtons) b.onclick = () => setTime(b.dataset.time);
$("tod").oninput = () => setTime($("tod").value);
$("pause").onclick = () => {
	paused = !paused;
	$("pause").setAttribute("aria-pressed", String(paused));
};
$("battle").onclick = attack;
$("gallery").onclick = gallery;
for (const box of document.querySelectorAll("[data-option]")) box.onchange = () => (view.options[box.dataset.option] = box.checked);
$("home").onclick = home;
$("center").onclick = () => Object.assign(view.rig, { x: game.W / 2, y: game.H / 2 });

// Loop: simulation at 30 steps per second, rendering every frame.
let last = performance.now(),
	accumulator = 0,
	frames = 0,
	frameClock = 0,
	worst = 0;
function loop(now) {
	const ms = now - last,
		dt = Math.min(ms / 1000, 0.1);
	last = now;
	if (!paused && !game.result) {
		accumulator += dt;
		let steps = 0;
		while (accumulator >= 1 / 30 && steps++ < 4) {
			game.tick(1 / 30);
			accumulator -= 1 / 30;
		}
	}
	selected = selected.filter((id) => game.get(id));
	view.setSelection(selected);
	moveCamera(dt);
	view.render(dt);
	if (labels.length) placeLabels();
	frames++;
	frameClock += ms;
	worst = Math.max(worst, ms);
	if (frameClock >= 1000) {
		const s = view.stats();
		$("stats").textContent =
			`${Math.round((frames * 1000) / frameClock)} kl./s · najgorsza ${Math.round(worst)} ms\n` +
			`klatka ${s.ms.toFixed(1)} ms (CPU) · wywołania ${s.calls}\n` +
			`trójkąty ${s.triangles} · modele ${s.models}\n` +
			`wyglądy ${s.looks} · tekstury ${s.textures}\n` +
			`czas bitwy ${Math.floor(game.time / 60)}:${String(Math.floor(game.time % 60)).padStart(2, "0")} · pora ${view.dayPhase().toFixed(2)}`;
		if (view.timeOfDay === null) $("tod").value = view.dayPhase();
		frames = frameClock = worst = 0;
	}
	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
setTimeout(attack, 6000);
