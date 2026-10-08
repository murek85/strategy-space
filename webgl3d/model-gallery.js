/* Model gallery (prototyp-modele.html): every unit and building of one faction in rows on a flat square,
   in daylight, built by models-3d.js exactly as the game builds them (baked). Orbit camera, click a model
   to fly to it, "Ruch i ogień" animates them (driving, aiming, firing), "Noc" shows their lights. */
import * as THREE from "three";
import { createModels3D } from "./models-3d.js";
import { createScatter3D } from "./scatter-3d.js";

const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
$("view").appendChild(renderer.domElement);
const scene = new THREE.Scene(),
	camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 1, 6000);
addEventListener("resize", () => {
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
});
const hemi = new THREE.HemisphereLight("#d6e6f0", "#5d5242", 0.9),
	sun = new THREE.DirectionalLight("#fff1dc", 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -700, right: 700, top: 700, bottom: -700, near: 10, far: 2500 });
sun.shadow.bias = -0.0005;
sun.position.set(-500, 900, 400);
scene.add(hemi, sun, sun.target);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#8f8068", roughness: 1 }));
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(4000, 100, "#7a6d58", "#7a6d58");
grid.position.y = 0.05;
scene.add(grid);

const models = createModels3D(THREE),
	COLORS = ["#9ae5cb", "#ed8277", "#e4b968"];
let shown = [],
	faction = "colonies",
	animate = false,
	night = 0;
const labels = [];
function build() {
	for (const s of shown) scene.remove(s.model.root);
	for (const l of labels) l.remove();
	shown = [];
	labels.length = 0;
	if (faction === "nature") return buildNature();
	const types = Object.keys(RTS.TYPES).filter((t) => !RTS.TYPES[t].threat);
	const units = types.filter((t) => RTS.TYPES[t].speed),
		buildings = types.filter((t) => !RTS.TYPES[t].speed);
	const place = (list, z0, gap) => {
		const perRow = 8;
		list.forEach((type, n) => {
			const s = RTS.TYPES[type],
				e = { id: n + 1, type, team: faction === "colonies" ? 0 : 1, faction, x: 0, y: 0, hp: 1, maxHp: 1, angle: 0, cargo: 1 };
			if (!models.has(e)) return;
			const model = models.create(e, COLORS),
				x = ((n % perRow) - (perRow - 1) / 2) * gap,
				z = z0 + Math.floor(n / perRow) * gap;
			model.root.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
			model.root.position.set(x, s.flying ? 40 : 0, z);
			model.root.rotation.y = -0.6;
			scene.add(model.root);
			const label = document.createElement("div");
			label.className = "label";
			label.textContent = s.name || type;
			document.body.appendChild(label);
			labels.push(label);
			shown.push({ model, e, label, type });
		});
	};
	place(units, -260, 90);
	place(buildings, 120, 170);
	let meshes = 0,
		tris = 0;
	const pairs = new Set();
	for (const s of shown)
		s.model.root.traverse((o) => {
			if (!o.isMesh) return;
			meshes++;
			pairs.add(o.geometry.id + ":" + o.material.id);
			const g = o.geometry;
			tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
		});
	$("stats").textContent = `${shown.length} modeli · ${meshes} części po scaleniu · ${pairs.size} partii · ${Math.round(tris / 1000)} tys. trójkątów`;
}
// Nature: wildlife, birds, fish, the threats, deposits stage by stage, obstacles.
function buildNature() {
	const label = (text) => {
		const l = document.createElement("div");
		l.className = "label";
		l.textContent = text;
		document.body.appendChild(l);
		labels.push(l);
		return l;
	};
	const add = (name, model, x, z, e = { id: shown.length + 1 }, y = 0) => {
		model.root.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
		model.root.position.set(x, y, z);
		model.root.rotation.y = -0.6;
		scene.add(model.root);
		shown.push({ model, e, label: label(name), type: "beast" });
	};
	const row = (list, z, gap) => list.forEach(([name, make, y], n) => add(name, make(), (n - (list.length - 1) / 2) * gap, z, undefined, y));
	// Trees and plants of the ground scatter (webgl3d/scatter-3d.js), one of each.
	const plants = createScatter3D(THREE, { world: new THREE.Group(), heightAt: () => 0, fogged: (m) => m }).specimens();
	plants.forEach(([name, root], n) => add(name, { root, update() {} }, (n - (plants.length - 1) / 2) * 62, -470));
	row(
		[
			["Jeleń", () => models.scenery("animal", "deer", "dust")],
			["Lis", () => models.scenery("animal", "fox", "dust")],
			["Lis polarny", () => models.scenery("animal", "fox", "ice")],
			["Zając", () => models.scenery("animal", "hare", "dust")],
			["Jaszczurka", () => models.scenery("animal", "lizard", "dust")],
			["Ptak", () => models.scenery("bird"), 30],
			["Ryba", () => models.scenery("fish"), 6],
		],
		-300,
		70,
	);
	["beast", "frostTusk", "ashCrawler", "duneMaw"].forEach((type, n) => {
		const e = { id: n + 1, type, team: 2, x: 0, y: 0, hp: 1, maxHp: 1, angle: 0 };
		if (models.has(e)) add(RTS.TYPES[type].name || type, models.create(e, COLORS), (n - 1.5) * 130, -170, e);
	});
	["ore", "gas", "crystal"].forEach((kind, k) => [6, 3, 1, 0].forEach((n, i) => add(`${kind} · ${n}/6`, models.scenery("deposit", kind, n), (i - 1.5) * 110, -20 + k * 110)));
	["rock", "outcrop", "spire", "grove", "mesa", "ruin"].forEach((kind, i) => add(kind, models.scenery("obstacle", kind, 160, 110, ["dust", "ice", "ash"][i % 3], i + 1), (i - 2.5) * 220, 470));
	["wreck", "debris", "derelict", "resin", "eggs", "processor"].forEach((kind, i) => add(kind, models.scenery("obstacle", kind, 200, 120, "dust", i + 3), (i - 2.5) * 240, 700));
	add("wyspa · Lumeria", models.scenery("island", "lumen", 60, 1), -300, 950, undefined, 90);
	add("wyspa · Aerion", models.scenery("island", "skyfall", 70, 2), 0, 950, undefined, 90);
	[14, 24, 40].forEach((size, i) => add(`wrak · ${size}`, models.scenery("wreck", size, i + 5), 250 + i * 80, 950, { id: i, life: 20 }));
	// Space deposits (orbit): ore, gas, crystals — full and half-empty.
	["ore", "gas", "crystal"].forEach((kind, k) => [6, 3].forEach((n, i) => add(`kosmos · ${kind} · ${n}/6`, models.scenery("deposit", kind, n, true), -260 + k * 180, 2750 + i * 140)));
	// The relay in space: a relay satellite (owned and neutral).
	add("Przekaźnik · kosmos", models.scenery("relay", "#9ae5cb", false, null, true), 400, 2800, { progress: 0.5, capturing: 0 });
	// Space: hulks of warships ("Cmentarzysko Floty") — a long one broken in two, short prows and sterns.
	[[820, 100, 1], [360, 80, 2], [360, 80, 5], [300, 80, 3], [220, 90, 9]].forEach(([w, h, seed], i) => add(`kadłub · ${w}`, models.scenery("obstacle", "hulk", w, h, "hulk", seed), i ? -700 + i * 420 : 0, i ? 2450 : 2250));
	// Act III: the Heart of the Swarm (chapter IX), a nest (chapter VIII), the orbital station, the Peak.
	const gate = (id) => ({ id, type: "hq", team: 1, faction: "swarm", x: 0, y: 0, hp: 1, maxHp: 1, angle: 0 });
	models.setMission("colony9");
	add("Serce Roju", models.create(gate(91), COLORS), -420, 1250, gate(91));
	models.setMission("colony8");
	add("Gniazdo Roju", models.create(gate(92), COLORS), -140, 1250, gate(92));
	models.setMission(null);
	const station = { id: 93, type: "uplink", team: 1, faction: "dominion", x: 0, y: 0, hp: 1, maxHp: 1, angle: 0 };
	add("Stacja orbitalna", models.create(station, COLORS), 120, 1250, station);
	add("Szczyt", models.scenery("relay", "#d4bf86", true), 380, 1250, { progress: 0.4, capturing: 0 });
	// Act II: the objective sites and the machines of the Hefajstos complex.
	[
		["Lądowisko", () => models.scenery("pad")],
		["Obóz badaczy", () => models.scenery("camp")],
		["Archiwum sondy", () => models.scenery("archive"), { progress: 0.8 }],
		["Rdzeń danych", () => models.scenery("coreSite")],
		["Postój", () => models.scenery("stop")],
		["Latarnia Kestrel", () => models.scenery("lighthouse")],
		["ZAWÓR", () => models.scenery("relay", "#ed8277", false, "ZAWÓR"), { owner: 1 }],
		["TURBINA", () => models.scenery("relay", "#ed8277", false, "TURBINA"), { owner: 1 }],
		["ŁĄCZNIK", () => models.scenery("relay", "#ed8277", false, "ŁĄCZNIK"), { owner: 1 }],
	].forEach(([name, make, e], n) => add(name, make(), (n - 4) * 200, 1550, { id: n, progress: 0, capturing: -1, ...e }));
	// Act I: the relay station and the landmarks of the story.
	add("Przekaźnik", models.scenery("relay", "#9ae5cb"), -600, 1900, { progress: 0.6, capturing: -1 });
	[
		["Poligon Liry", "trainingRange"],
		["Latarnia Eos", "eosBeacon", { lit: true }],
		["Stacja Ciszy", "silentStation"],
		["Wrota archiwum", "iceArchive"],
		["Cytadela Węzła", "nadirCitadel", { progress: 0.7 }],
	].forEach(([name, piece, e], n) => add(name, models.scenery("landmark", piece, 220, 300), (n - 1) * 280, 1900, { ...e }));
	$("stats").textContent = `${shown.length} modeli przyrody i aktów I–III`;
}
for (const b of document.querySelectorAll("[data-faction]"))
	b.onclick = () => {
		faction = b.dataset.faction;
		for (const o of document.querySelectorAll("[data-faction]")) o.classList.toggle("on", o === b);
		build();
	};
$("move").onclick = () => $("move").classList.toggle("on", (animate = !animate));
$("night").onclick = () => $("night").classList.toggle("on", (night = night ? 0 : 1));

// Orbit camera; click a model to fly to it.
const cam = { yaw: 2.2, pitch: 0.5, distance: 1100, target: new THREE.Vector3(0, 0, 0), goal: new THREE.Vector3(0, 0, 0), goalDistance: 1100 };
let drag = null;
// For a quick look from the console: galleryCam.goal.set(x, y, z), galleryCam.goalDistance = d.
window.galleryCam = cam;
renderer.domElement.addEventListener("pointerdown", (e) => (drag = { x: e.clientX, y: e.clientY, moved: 0 }));
renderer.domElement.addEventListener("pointermove", (e) => {
	if (!drag) return;
	cam.yaw -= (e.clientX - drag.x) * 0.006;
	cam.pitch = Math.max(0.08, Math.min(1.4, cam.pitch + (e.clientY - drag.y) * 0.005));
	drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
	drag.x = e.clientX;
	drag.y = e.clientY;
});
renderer.domElement.addEventListener("pointerup", (e) => {
	if (drag && drag.moved < 4) {
		const ray = new THREE.Raycaster();
		ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
		const hit = ray.intersectObjects(shown.map((s) => s.model.root), true)[0];
		if (hit) {
			const s = shown.find((s) => s.model.root === hit.object || s.model.root.getObjectById(hit.object.id));
			if (s) {
				cam.goal.copy(s.model.root.position).add(new THREE.Vector3(0, 12, 0));
				cam.goalDistance = 40 + RTS.TYPES[s.type].radius * 5;
			}
		}
	}
	drag = null;
});
renderer.domElement.addEventListener(
	"wheel",
	(e) => {
		e.preventDefault();
		cam.goalDistance = Math.max(30, Math.min(2500, cam.goalDistance * Math.exp(e.deltaY * 0.001)));
	},
	{ passive: false },
);

const v = new THREE.Vector3();
let last = performance.now(),
	time = 0;
function frame(now) {
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	time += dt;
	for (const s of shown)
		s.model.update(s.e, {
			time,
			moving: animate,
			aim: animate ? Math.sin(time * 0.7 + s.e.id) * 1.2 : 0,
			recoil: animate ? Math.max(0, 1 - ((time + s.e.id * 0.37) % 2.5) * 4) : 0,
			built: 1,
			working: animate,
		});
	models.setNight(night);
	sun.intensity = night ? 0.25 : 2.6;
	hemi.intensity = night ? 0.25 : 0.9;
	scene.background = new THREE.Color(night ? "#0b1220" : "#a9b8bf");
	cam.target.lerp(cam.goal, Math.min(1, dt * 4));
	cam.distance += (cam.goalDistance - cam.distance) * Math.min(1, dt * 4);
	camera.position.set(cam.target.x + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.distance, cam.target.y + Math.sin(cam.pitch) * cam.distance, cam.target.z + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.distance);
	camera.lookAt(cam.target);
	renderer.render(scene, camera);
	for (const s of shown) {
		v.copy(s.model.root.position);
		v.y -= 6;
		v.project(camera);
		const visible = v.z < 1 && cam.distance < 1600;
		s.label.style.display = visible ? "block" : "none";
		if (visible) {
			s.label.style.left = ((v.x + 1) / 2) * innerWidth + "px";
			s.label.style.top = ((1 - v.y) / 2) * innerHeight + 8 + "px";
		}
	}
	requestAnimationFrame(frame);
}
build();
requestAnimationFrame(frame);
window.modelGallery = { cam, shown, scene, camera };
