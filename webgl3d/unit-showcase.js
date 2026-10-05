/* Unit showcase (prototyp-jednostka.html): one tank built to a richer standard than models-3d.js, to judge
   the look before the whole army is reworked. Standalone: its own terrain, light and particles; the
   current game model of the tank stands on the square for comparison.
   New compared with models-3d.js:
   - Detail: bevelled hull with a sloped glacis, bevelled turret, mantlet, muzzle brake, fume extractor,
     cupola and hatch, antenna, road wheels with hubs, drive sprocket and idler, side skirts, exhausts.
   - Motion: track belts scroll with speed, wheels roll; the hull lies on the slope (pitch and roll from the
     ground under the tracks) on a spring suspension that squats when accelerating and dives when braking;
     tread marks stay in the ground; dust behind the tracks, exhaust smoke with the throttle.
   - Firing: muzzle flash and light, barrel and hull recoil, smoke, a shell and an impact blast.
   - Damage: soot darkening the paint, skirts falling off, a bent antenna, engine smoke, fire and sparks.
   - Upgrades: reactive armour bricks, a roof machine gun, a longer barrel and stowage boxes.
   - Night: headlights lighting the ground, tail lights and a glowing team stripe.
   Local frame as in models-3d.js: +X the front, +Y up, +Z the right side. */
import * as THREE from "three";
import { createModels3D } from "./models-3d.js";
import { GLTFLoader } from "../vendor/three-addons/loaders/GLTFLoader.js";

const $ = (id) => document.getElementById(id);
const host = $("view");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 1, 4000);
addEventListener("resize", () => {
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
});

// ---------- terrain ----------
const smooth = (a, b, x) => {
	const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
const hills = (x, z) => 16 * Math.sin(x * 0.0085) * Math.cos(z * 0.0072) + 7 * Math.sin(x * 0.021 + z * 0.017) + 3.5 * Math.sin(z * 0.043 - x * 0.019);
const bumps = (x, z) => 0.9 * Math.sin(x * 0.13) * Math.sin(z * 0.11) + 0.5 * Math.sin(x * 0.31 + z * 0.23);
// A flat square in the middle (the comparison), hills around it.
const heightAt = (x, z) => {
	const k = smooth(110, 190, Math.hypot(x, z));
	return (hills(x, z) - hills(0, 0)) * k + bumps(x, z) * smooth(95, 140, Math.hypot(x, z));
};
{
	const g = new THREE.PlaneGeometry(2200, 2200, 260, 260).rotateX(-Math.PI / 2),
		p = g.attributes.position,
		colors = new Float32Array(p.count * 3),
		sand = new THREE.Color("#b49a6c"),
		dry = new THREE.Color("#8c7a55"),
		moss = new THREE.Color("#6f7a4c"),
		c = new THREE.Color();
	for (let i = 0; i < p.count; i++) {
		const x = p.getX(i),
			z = p.getZ(i),
			y = heightAt(x, z);
		p.setY(i, y);
		const n = 0.5 + 0.5 * Math.sin(x * 0.05 + Math.sin(z * 0.04) * 2) * Math.cos(z * 0.06);
		c.copy(sand).lerp(dry, n * 0.7).lerp(moss, smooth(4, 18, y) * 0.5);
		colors.set([c.r, c.g, c.b], i * 3);
	}
	g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	g.computeVertexNormals();
	const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
	ground.receiveShadow = true;
	scene.add(ground);
	// Square plates under the comparison.
	const slab = new THREE.Mesh(new THREE.CircleGeometry(95, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#7d7466", roughness: 0.95 }));
	slab.position.y = 0.08;
	slab.receiveShadow = true;
	scene.add(slab);
	// Boulders.
	const rock = new THREE.MeshStandardMaterial({ color: "#6d6255", roughness: 0.95, flatShading: true });
	let seed = 7;
	const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
	for (let i = 0; i < 70; i++) {
		const a = rnd() * Math.PI * 2,
			r = 200 + rnd() * 700,
			x = Math.cos(a) * r,
			z = Math.sin(a) * r,
			s = 3 + rnd() * 10;
		const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), rock);
		m.scale.set(s * (0.8 + rnd() * 0.6), s * 0.6, s);
		m.rotation.set(rnd(), rnd() * 6, rnd());
		m.position.set(x, heightAt(x, z) + s * 0.15, z);
		m.castShadow = m.receiveShadow = true;
		scene.add(m);
	}
}
// The firing target: an outcrop on the edge of the square.
const TARGET = new THREE.Vector3(75, 0, -95);
TARGET.y = heightAt(TARGET.x, TARGET.z) + 6;
{
	const rock = new THREE.MeshStandardMaterial({ color: "#5d5248", roughness: 0.95, flatShading: true });
	for (const [dx, dz, s] of [
		[0, 0, 12],
		[10, 6, 8],
		[-8, 7, 7],
		[4, -9, 6],
	]) {
		const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), rock);
		m.scale.set(s, s * 0.8, s);
		m.position.set(TARGET.x + dx, heightAt(TARGET.x + dx, TARGET.z + dz) + s * 0.3, TARGET.z + dz);
		m.castShadow = m.receiveShadow = true;
		scene.add(m);
	}
}

// ---------- light ----------
const hemi = new THREE.HemisphereLight("#cfe3f0", "#6b5a40", 0.9);
const sun = new THREE.DirectionalLight("#fff1dc", 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 10, far: 900 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.4;
scene.add(hemi, sun, sun.target);
scene.fog = new THREE.Fog("#a9b8bf", 600, 1900);

// ---------- particles (soft round points, size and colour per particle) ----------
function particles(max, additive) {
	const g = new THREE.BufferGeometry(),
		pos = new Float32Array(max * 3),
		col = new Float32Array(max * 4),
		size = new Float32Array(max);
	g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
	g.setAttribute("aColor", new THREE.BufferAttribute(col, 4));
	g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
	const material = new THREE.ShaderMaterial({
		uniforms: { uScale: { value: 1 } },
		vertexShader: `attribute float aSize; attribute vec4 aColor; uniform float uScale; varying vec4 vColor;
			void main() { vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / -mv.z; }`,
		fragmentShader: `varying vec4 vColor;
			void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.12, d) * vColor.a; if (a < 0.01) discard; gl_FragColor = vec4(vColor.rgb, a); }`,
		transparent: true,
		depthWrite: false,
		blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
	});
	const points = new THREE.Points(g, material);
	points.frustumCulled = false;
	scene.add(points);
	const list = [];
	return {
		material,
		emit(o) {
			if (list.length >= max) list.shift();
			list.push({ p: o.p.clone(), v: o.v ? o.v.clone() : new THREE.Vector3(), age: 0, life: o.life, s0: o.size[0], s1: o.size[1], c: new THREE.Color(o.color), a: o.alpha ?? 1, g: o.gravity ?? 0, drag: o.drag ?? 1 });
		},
		update(dt) {
			let n = 0;
			for (let i = list.length - 1; i >= 0; i--) {
				const q = list[i];
				q.age += dt;
				if (q.age >= q.life) list.splice(i, 1);
			}
			for (const q of list) {
				q.v.multiplyScalar(Math.exp(-q.drag * dt));
				q.v.y += q.g * dt;
				q.p.addScaledVector(q.v, dt);
				const k = q.age / q.life;
				pos.set([q.p.x, q.p.y, q.p.z], n * 3);
				col.set([q.c.r, q.c.g, q.c.b, q.a * (1 - k) * Math.min(1, q.age * 12)], n * 4);
				size[n] = q.s0 + (q.s1 - q.s0) * k;
				n++;
			}
			g.setDrawRange(0, n);
			for (const a of ["position", "aColor", "aSize"]) g.attributes[a].needsUpdate = true;
		},
	};
}
const smoke = particles(1400, false),
	glow = particles(700, true);

// ---------- the tank ----------
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.35, ...o });
const PAINT = { plate: "#8a9e96", metal: "#aab8ab", dark: "#3f5654" };
const mat = {
	plate: std(PAINT.plate, { flatShading: true }),
	metal: std(PAINT.metal, { flatShading: true }),
	dark: std(PAINT.dark, { flatShading: true }),
	black: std("#1b2123", { roughness: 0.85, metalness: 0.4 }),
	rubber: std("#141718", { roughness: 0.95, metalness: 0 }),
	hub: std("#c9d2c8", { roughness: 0.35, metalness: 0.8 }),
	team: std("#3fd39a", { emissive: "#3fd39a", emissiveIntensity: 0.15 }),
	glass: std("#8ff0e4", { emissive: "#5fe0cf", emissiveIntensity: 0.7, roughness: 0.2 }),
	lamp: std("#fff6dd", { emissive: "#fff1c4", emissiveIntensity: 0.2 }),
	tail: std("#ff4a3a", { emissive: "#ff3020", emissiveIntensity: 0.3 }),
	era: std("#7e8a74", { flatShading: true, roughness: 0.7 }),
	crate: std("#6e6248", { flatShading: true, roughness: 0.9, metalness: 0.1 }),
	steel: std("#2a3134", { roughness: 0.5, metalness: 0.8 }),
};
const paints = [mat.plate, mat.metal, mat.dark, mat.era, mat.crate];

// A box with bevelled edges (centre at the origin).
function bevelBox(w, h, d, r = 0.8) {
	const s = new THREE.Shape(),
		x = w / 2 - r,
		y = h / 2 - r;
	s.moveTo(-x, -h / 2 + r);
	s.lineTo(-x, y);
	s.lineTo(x, y);
	s.lineTo(x, -y);
	s.lineTo(-x, -y);
	const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2 });
	g.translate(0, 0, -(d - 2 * r) / 2);
	return g;
}
// A side profile (x, y points) extruded across the width, bevelled.
function profile(points, width, r = 0.8) {
	const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
	const g = new THREE.ExtrudeGeometry(s, { depth: width - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2 });
	g.translate(0, 0, -(width - 2 * r) / 2);
	return g;
}
function mesh(g, m, [x, y, z] = [0, 0, 0], parent) {
	const o = new THREE.Mesh(g, m);
	o.position.set(x, y, z);
	o.castShadow = o.receiveShadow = true;
	parent?.add(o);
	return o;
}
const group = (parent, [x, y, z] = [0, 0, 0]) => {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	parent.add(g);
	return g;
};

// Track belt texture: one link per repeat — a plate with a grouser bar and a guide horn.
const trackTexture = (() => {
	const c = document.createElement("canvas");
	c.width = 32;
	c.height = 64;
	const x = c.getContext("2d");
	x.fillStyle = "#24292b";
	x.fillRect(0, 0, 32, 64);
	x.fillStyle = "#0c0f10";
	x.fillRect(0, 0, 4, 64);
	x.fillStyle = "#454c4f";
	x.fillRect(9, 4, 9, 56);
	x.fillStyle = "#5b6366";
	x.fillRect(14, 26, 6, 12);
	const t = new THREE.CanvasTexture(c);
	t.wrapS = THREE.RepeatWrapping;
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	return t;
})();
const LINK = 2.2;
// The belt around a stadium (bottom and top runs, arcs at the sprocket and idler), u along the belt in links.
function beltGeometry(halfLen, radius, cy, width) {
	const pts = [],
		N = 16;
	for (let i = 0; i <= 10; i++) pts.push([-halfLen + (2 * halfLen * i) / 10, cy - radius]);
	for (let i = 1; i <= N; i++) {
		const a = -Math.PI / 2 + (Math.PI * i) / N;
		pts.push([halfLen + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
	}
	for (let i = 1; i <= 10; i++) pts.push([halfLen - (2 * halfLen * i) / 10, cy + radius]);
	for (let i = 1; i <= N; i++) {
		const a = Math.PI / 2 + (Math.PI * i) / N;
		pts.push([-halfLen + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
	}
	const pos = [],
		uv = [],
		idx = [];
	let s = 0;
	pts.forEach(([x, y], i) => {
		if (i) s += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
		pos.push(x, y, -width / 2, x, y, width / 2);
		uv.push(s / LINK, 0, s / LINK, 1);
		if (i) {
			const a = (i - 1) * 2;
			idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
		}
	});
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}

let tank = { root: new THREE.Group(), wheels: [], skirts: [], lights: [], mats: mat, paints };
scene.add(tank.root);
{
	const hull = (tank.hull = group(tank.root)); // pitch, roll and bob live here
	const ROAD = 3.2;
	for (const side of [-1, 1]) {
		const z = side * 11;
		const beltMat = new THREE.MeshStandardMaterial({ map: trackTexture, roughness: 0.9, metalness: 0.3, side: THREE.DoubleSide });
		tank.belts = tank.belts || [];
		tank.belts.push(beltMat);
		mesh(beltGeometry(18, 4.8, 5.1, 7), beltMat, [0, 0, z], hull);
		// Road wheels, sprocket (front) and idler (rear): a wheel group rolls around its local Z.
		const wheel = (x, y, r, sprocket) => {
			const w = group(hull, [x, y, z]);
			mesh(new THREE.CylinderGeometry(r, r, 6.2, sprocket ? 10 : 16).rotateX(Math.PI / 2), sprocket ? mat.dark : mat.rubber, [0, 0, 0], w);
			mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 6.6, 8).rotateX(Math.PI / 2), mat.hub, [0, 0, 0], w);
			for (let i = 0; i < (sprocket ? 5 : 3); i++) mesh(new THREE.BoxGeometry(r * 1.6, 0.6, 6.8), mat.steel, [0, 0, 0], w).rotation.z = (i * Math.PI) / (sprocket ? 5 : 3);
			tank.wheels.push({ w, r });
		};
		for (let i = 0; i < 5; i++) wheel(-13 + i * 6.5, ROAD + 0.5, ROAD, false);
		wheel(18, 5.4, 3.7, true);
		wheel(-18, 5.4, 3.4, false);
		// Return rollers.
		for (const x of [-7, 7]) mesh(new THREE.CylinderGeometry(1.1, 1.1, 3, 10).rotateX(Math.PI / 2), mat.black, [x, 9.2, z], hull);
		// Side skirts: four plates per side (they fall off with damage).
		for (let i = 0; i < 4; i++) {
			const sk = mesh(bevelBox(9.4, 5, 0.9, 0.35), mat.plate, [-14.4 + i * 9.6, 8.2, side * 15], hull);
			tank.skirts.push(sk);
		}
		// Fender over the track.
		mesh(bevelBox(42, 1, 8.8, 0.4), mat.dark, [0, 10.7, z], hull);
	}
	// Hull: sloped glacis in front, a short slope at the rear.
	mesh(
		profile(
			[
				[-19, 4],
				[16, 4],
				[22, 8],
				[22, 9.5],
				[11, 15.5],
				[-17, 15.5],
				[-21, 12],
				[-21, 6],
			],
			17,
			1,
		),
		mat.plate,
		[0, 0, 0],
		hull,
	);
	// Engine deck: grilles and two exhausts.
	mesh(bevelBox(11, 1.2, 13, 0.4), mat.dark, [-12, 16.6, 0], hull);
	for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(9.5, 0.5, 0.7), mat.black, [-12, 17.3, -4.8 + i * 2.4], hull);
	tank.exhausts = [];
	for (const z of [-5.5, 5.5]) {
		mesh(new THREE.CylinderGeometry(1, 1.1, 4, 10).rotateZ(Math.PI / 2), mat.steel, [-22, 12.5, z], hull);
		tank.exhausts.push(new THREE.Vector3(-24.5, 12.5, z));
	}
	// Team stripe across the rear deck and along the sides.
	mesh(new THREE.BoxGeometry(3, 0.4, 17.5), mat.team, [-4, 15.75, 0], hull);
	for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(18, 1.2, 0.3), mat.team, [-6, 13, side * 9.9], hull);
	// Headlights and tail lights.
	for (const z of [-7.5, 7.5]) {
		mesh(new THREE.CylinderGeometry(1, 1.2, 1.4, 12).rotateZ(Math.PI / 2), mat.steel, [20.6, 11.6, z], hull);
		mesh(new THREE.CircleGeometry(0.85, 12).rotateY(Math.PI / 2), mat.lamp, [21.35, 11.6, z], hull);
		mesh(new THREE.BoxGeometry(0.4, 1, 1.8), mat.tail, [-21.1, 13.4, z * 1.05], hull);
		const spot = new THREE.SpotLight("#fff1cc", 0, 260, 0.42, 0.55, 1.1);
		spot.position.set(21.5, 11.6, z);
		spot.target.position.set(90, -6, z * 1.4);
		hull.add(spot, spot.target);
		tank.lights.push(spot);
	}
	// Tow hooks.
	for (const z of [-5, 5]) mesh(new THREE.TorusGeometry(1, 0.35, 6, 12), mat.steel, [22.2, 7.5, z], hull).rotation.y = Math.PI / 2;

	// Turret: bevelled six-sided plan, mantlet, barrel with a fume extractor and a muzzle brake.
	const turret = (tank.turret = group(hull, [1, 15.5, 0]));
	{
		const s = new THREE.Shape(
			[
				[12, 0],
				[7, 7.5],
				[-8, 8],
				[-12, 4.5],
				[-12, -4.5],
				[-8, -8],
				[7, -7.5],
			].map(([x, y]) => new THREE.Vector2(x, y)),
		);
		const g = new THREE.ExtrudeGeometry(s, { depth: 5.4, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 1.2, bevelSegments: 2 }).rotateX(-Math.PI / 2);
		g.translate(0, 1.1, 0);
		mesh(g, mat.metal, [0, 0, 0], turret);
		mesh(new THREE.BoxGeometry(3, 0.4, 16.5), mat.team, [-6, 7.65, 0], turret);
		for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(9, 1.6, 0.3), mat.team, [-3, 4.4, side * 8.9], turret);
		mesh(bevelBox(2.4, 1.6, 4.4, 0.4), mat.glass, [7, 7.3, -4], turret); // gunner sight
	}
	// Cupola with a hatch.
	mesh(new THREE.CylinderGeometry(3, 3.3, 2.2, 14), mat.dark, [-4, 8.5, 3.6], turret);
	const hatch = mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.6, 14), mat.metal, [-4, 9.9, 3.6], turret);
	for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat.glass, [-4 + Math.cos(i * 1.25 + 1) * 3.1, 8.7, 3.6 + Math.sin(i * 1.25 + 1) * 3.1], turret);
	// Antenna on a spring mount: sways with acceleration.
	tank.antenna = group(turret, [-9, 7.6, -5]);
	mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.2, 8), mat.steel, [0, 0.6, 0], tank.antenna);
	mesh(new THREE.CylinderGeometry(0.12, 0.18, 22, 5), mat.black, [0, 12, 0], tank.antenna);
	// Gun: pivot at the mantlet (elevation), recoiling barrel inside it.
	const gun = (tank.gun = group(turret, [11, 4.2, 0]));
	mesh(bevelBox(4, 5, 7.5, 0.8), mat.dark, [0.5, 0, 0], gun);
	const barrel = (tank.barrel = group(gun, [0, 0, 0]));
	mesh(new THREE.CylinderGeometry(1.15, 1.35, 26, 14).rotateZ(-Math.PI / 2), mat.dark, [15, 0, 0], barrel);
	mesh(new THREE.CylinderGeometry(1.9, 1.9, 4.2, 14).rotateZ(-Math.PI / 2), mat.dark, [16, 0, 0], barrel);
	tank.brake = mesh(bevelBox(4.2, 2.6, 3.6, 0.5), mat.black, [29.5, 0, 0], barrel);
	tank.muzzle = group(barrel, [32, 0, 0]);
	tank.barrelParts = barrel.children.slice();
	addFlash(tank);

	// Upgrade 1: reactive armour bricks on the glacis and the turret cheeks.
	tank.era = group(hull);
	for (let row = 0; row < 2; row++)
		for (let i = 0; i < 5; i++) {
			// On the glacis (from (22, 9.5) up to (11, 15.5)), lifted along its normal.
			const x = 19.5 - row * 4.2,
				y = 9.5 + ((22 - x) / 11) * 6;
			const b = mesh(bevelBox(3.8, 1.2, 3, 0.3), mat.era, [x + 0.5, y + 0.9, -6.4 + i * 3.2], tank.era);
			b.rotation.z = -0.5;
		}
	for (const side of [-1, 1])
		for (let i = 0; i < 3; i++) {
			const b = mesh(bevelBox(3.2, 3, 1.2, 0.3), mat.era, [6 - i * 3.4, 3.6, side * 8.6], turret);
			tank.era.userData[side + "_" + i] = b;
		}
	tank.eraTurret = turret.children.filter((o) => o.material === mat.era);
	// Upgrade 2: roof machine gun, stowage boxes, longer barrel.
	tank.mg = group(turret, [-4, 10.3, 3.6]);
	mesh(new THREE.BoxGeometry(1.2, 2.4, 1.2), mat.steel, [0, 1.2, 0], tank.mg);
	mesh(new THREE.BoxGeometry(4, 1.4, 1.4), mat.black, [1.4, 2.6, 0], tank.mg);
	mesh(new THREE.CylinderGeometry(0.3, 0.3, 7, 6).rotateZ(Math.PI / 2), mat.black, [5.5, 2.6, 0], tank.mg);
	tank.stowage = group(turret);
	mesh(bevelBox(7, 3.4, 4, 0.4), mat.crate, [-14.6, 3.6, 0], tank.stowage);
	for (const side of [-1, 1]) mesh(bevelBox(8, 2.4, 2.6, 0.4), mat.crate, [-12, 12.2, side * 5], tank.stowage).position.set(-12, 12.4, side * 12.5);
	// Boxes on the turret bustle belong to the turret; the deck boxes move to the hull.
	for (const o of tank.stowage.children.slice(1)) {
		tank.stowage.remove(o);
		hull.add(o);
		o.userData.deck = true;
	}
	tank.deckBoxes = hull.children.filter((o) => o.userData.deck);
}

const codeTank = tank;

// Muzzle flash: a star of crossed cones and a light, on the muzzle node of a tank.
function addFlash(t) {
	t.flash = group(t.muzzle);
	const flashMat = new THREE.MeshBasicMaterial({ color: "#ffd38a", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
	for (const r of [0, Math.PI / 2]) {
		const c = new THREE.Mesh(new THREE.ConeGeometry(2.4, 9, 8, 1, true).rotateZ(-Math.PI / 2).translate(4.5, 0, 0), flashMat);
		c.rotation.x = r;
		t.flash.add(c);
	}
	for (const side of [-1, 1]) {
		const c = new THREE.Mesh(new THREE.ConeGeometry(1.4, 5, 6, 1, true).translate(0, 2.5, 0), flashMat);
		c.rotation.x = (side * Math.PI) / 2;
		t.flash.add(c);
	}
	t.flashMat = flashMat;
	t.flashLight = new THREE.PointLight("#ffb860", 0, 140, 1.6);
	t.muzzle.add(t.flashLight);
}

// The tank modelled in Blender (tools/blender/tank.py → assets/models/tank.glb): the same parts by node
// name, so the same motion code drives it.
function blenderTank(gltf) {
	const root = gltf.scene,
		node = (n) => root.getObjectByName(n),
		byMaterial = new Map();
	root.traverse((o) => {
		if (!o.isMesh) return;
		o.castShadow = o.receiveShadow = true;
		// One material per name (the loader may copy them per primitive).
		const name = o.material.name;
		if (!byMaterial.has(name)) byMaterial.set(name, o.material);
		o.material = byMaterial.get(name);
	});
	const m = (n) => byMaterial.get(n) || new THREE.MeshStandardMaterial();
	const track = m("Track");
	track.map = trackTexture;
	track.color.set("#ffffff");
	track.side = THREE.DoubleSide;
	track.needsUpdate = true;
	const t = {
		root,
		hull: node("Hull"),
		turret: node("Turret"),
		gun: node("Gun"),
		barrel: node("Barrel"),
		brake: node("Brake"),
		muzzle: node("Muzzle"),
		antenna: node("Antenna"),
		belts: [track],
		wheels: [],
		skirts: Array.from({ length: 8 }, (_, i) => node("Skirt_" + i)),
		lights: [],
		exhausts: ["Exhaust_0", "Exhaust_1"].map((n) => node(n).position.clone()),
		era: node("ERA"),
		eraTurret: [node("ERA_Turret")],
		mg: node("MG"),
		stowage: node("Stowage"),
		deckBoxes: [node("DeckBoxes")],
		mats: { lamp: m("Lamp"), tail: m("Tail"), team: m("Team"), glass: m("Glass") },
		paints: ["Plate", "Metal", "Dark", "ERA", "Crate"].map(m),
	};
	root.traverse((o) => {
		if (o.name.startsWith("Wheel_")) t.wheels.push({ w: o, r: o.userData.radius || 3.2 });
	});
	for (const n of ["Headlight_0", "Headlight_1"]) {
		const h = node(n),
			spot = new THREE.SpotLight("#fff1cc", 0, 260, 0.42, 0.55, 1.1);
		spot.target.position.set(70, -17, h.position.z * 0.4);
		h.add(spot, spot.target);
		t.lights.push(spot);
	}
	addFlash(t);
	return t;
}
let blender = null;
function useModel(which) {
	const next = which === "blender" && blender ? blender : codeTank;
	codeTank.root.visible = next === codeTank;
	if (blender) blender.root.visible = next === blender;
	tank = next;
	for (const l of codeTank.lights.concat(blender ? blender.lights : [])) l.intensity = 0;
	applyDamage();
	applyLevel();
	for (const b of document.querySelectorAll("[data-model]")) b.classList.toggle("on", b.dataset.model === (next === blender ? "blender" : "code"));
}
new GLTFLoader().load(
	"assets/models/tank.glb",
	(gltf) => {
		blender = blenderTank(gltf);
		scene.add(blender.root);
		useModel("blender");
	},
	undefined,
	(error) => {
		console.error("tank.glb", error);
		$("modelNote").textContent = "Nie udało się wczytać assets/models/tank.glb — pokazuję model z kodu.";
	},
);

// The current game model, for comparison.
const models = createModels3D(THREE);
const oldTank = models.create({ id: 1, type: "tank", team: 0 }, ["#3fa078"]);
oldTank.root.traverse((o) => {
	if (o.isMesh) o.castShadow = o.receiveShadow = true;
});
oldTank.root.position.set(0, 0, -34);
scene.add(oldTank.root);

// ---------- tread marks ----------
const MARKS = 600;
const marks = new THREE.InstancedMesh(
	new THREE.PlaneGeometry(4, 6.6).rotateX(-Math.PI / 2),
	new THREE.MeshBasicMaterial({ color: "#3a2c1e", transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
	MARKS,
);
marks.count = 0;
marks.frustumCulled = false;
scene.add(marks);
let markNext = 0,
	markDistance = 0;
const markM = new THREE.Matrix4(),
	markQ = new THREE.Quaternion(),
	markS = new THREE.Vector3(1, 1, 1),
	markN = new THREE.Vector3(),
	UP = new THREE.Vector3(0, 1, 0),
	markYaw = new THREE.Quaternion();
function treadMark(x, z, heading) {
	const e = 2,
		dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e),
		dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
	markN.set(-dx, 1, -dz).normalize();
	markQ.setFromUnitVectors(UP, markN).multiply(markYaw.setFromAxisAngle(UP, -heading + Math.PI / 2));
	marks.setMatrixAt(markNext, markM.compose(new THREE.Vector3(x, heightAt(x, z) + 0.2, z), markQ, markS));
	markNext = (markNext + 1) % MARKS;
	marks.count = Math.min(MARKS, marks.count + 1);
	marks.instanceMatrix.needsUpdate = true;
}

// ---------- state ----------
const state = {
	mode: "drive",
	stopped: false,
	t: 0,
	x: 0,
	z: 0,
	heading: 0,
	v: 0,
	distance: 0,
	pitch: 0,
	pitchV: 0,
	roll: 0,
	rollV: 0,
	bob: 0,
	bobV: 0,
	sway: 0,
	swayV: 0,
	aim: 0,
	elevation: 0,
	recoil: 0,
	flash: 0,
	reload: 0,
	auto: false,
	hp: 100,
	hitFlash: 0,
	level: 0,
	night: 0,
	nightTarget: 0,
	follow: true,
	shells: [],
	sparkTimer: 0,
};
const MAX_SPEED = 42;
const pathAt = (t) => new THREE.Vector2(330 * Math.cos(t) + 40 * Math.sin(2 * t), 250 * Math.sin(t) + 30 * Math.cos(3 * t));
{
	const p = pathAt(0),
		q = pathAt(0.01);
	Object.assign(state, { x: p.x, z: p.y, heading: Math.atan2(q.y - p.y, q.x - p.x) });
}

const local = (x, y, z) => tank.hull.localToWorld(new THREE.Vector3(x, y, z));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function fire() {
	if (state.reload > 0) return;
	state.reload = 2.2;
	state.recoil = 1;
	state.flash = 1;
	state.pitchV += 0.9; // the hull rocks back
	const muzzle = tank.muzzle.getWorldPosition(new THREE.Vector3()),
		dir = local(1, 0, 0).sub(local(0, 0, 0));
	tank.barrel.updateWorldMatrix(true, false);
	const fwd = new THREE.Vector3(1, 0, 0).transformDirection(tank.barrel.matrixWorld);
	for (let i = 0; i < 14; i++)
		smoke.emit({
			p: muzzle,
			v: fwd.clone().multiplyScalar(20 + Math.random() * 30).add(new THREE.Vector3((Math.random() - 0.5) * 14, Math.random() * 8, (Math.random() - 0.5) * 14)),
			life: 1.6 + Math.random(),
			size: [5, 18],
			color: "#cfc8bb",
			alpha: 0.5,
			drag: 2.2,
			gravity: 3,
		});
	for (let i = 0; i < 6; i++) glow.emit({ p: muzzle, v: fwd.clone().multiplyScalar(60 + Math.random() * 60).add(new THREE.Vector3((Math.random() - 0.5) * 20, Math.random() * 10, (Math.random() - 0.5) * 20)), life: 0.25, size: [2, 0.5], color: "#ffcf7a", drag: 3 });
	// Dust kicked up around the hull by the blast.
	for (let i = 0; i < 10; i++) {
		const a = Math.random() * Math.PI * 2,
			p = local(Math.cos(a) * 20 + 10, 0, Math.sin(a) * 14);
		p.y = heightAt(p.x, p.z) + 1;
		smoke.emit({ p, v: new THREE.Vector3(Math.cos(a) * 12, 4, Math.sin(a) * 12), life: 1.2, size: [6, 14], color: "#b49a6c", alpha: 0.35, drag: 2 });
	}
	const to = TARGET.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 4, (Math.random() - 0.5) * 10));
	state.shells.push({ from: muzzle, to, t: 0, time: muzzle.distanceTo(to) / 700 });
	void dir;
}
const shellMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 9, 6).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#ffe9b0", transparent: true, blending: THREE.AdditiveBlending }));
shellMesh.visible = false;
scene.add(shellMesh);
const blastLight = new THREE.PointLight("#ff9a4a", 0, 220, 1.5);
scene.add(blastLight);
let blast = 0;
function impact(p) {
	blast = 1;
	blastLight.position.copy(p).add(new THREE.Vector3(0, 10, 0));
	for (let i = 0; i < 26; i++) {
		const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(30 + Math.random() * 60);
		glow.emit({ p, v, life: 0.35 + Math.random() * 0.3, size: [10, 4], color: i % 3 ? "#ffb347" : "#fff2c0", drag: 3 });
	}
	for (let i = 0; i < 18; i++) {
		const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6 + 0.4, Math.random() - 0.5).multiplyScalar(40);
		smoke.emit({ p, v, life: 2.2 + Math.random(), size: [10, 30], color: i % 2 ? "#4a4038" : "#8b7a62", alpha: 0.6, drag: 1.8, gravity: 6 });
	}
	for (let i = 0; i < 14; i++) glow.emit({ p, v: new THREE.Vector3((Math.random() - 0.5) * 120, 40 + Math.random() * 60, (Math.random() - 0.5) * 120), life: 0.9, size: [1.5, 1], color: "#ffd890", gravity: -120, drag: 0.5 });
}
function hit() {
	state.hp = Math.max(1, state.hp - 15);
	state.hitFlash = 1;
	state.rollV += (Math.random() < 0.5 ? -1 : 1) * 0.5;
	const p = local(4 + Math.random() * 10, 12, (Math.random() < 0.5 ? -1 : 1) * 9);
	for (let i = 0; i < 16; i++) glow.emit({ p, v: new THREE.Vector3((Math.random() - 0.5) * 90, 20 + Math.random() * 60, (Math.random() - 0.5) * 90), life: 0.6, size: [1.6, 0.8], color: "#ffe0a0", gravity: -140, drag: 0.6 });
	for (let i = 0; i < 6; i++) smoke.emit({ p, v: new THREE.Vector3((Math.random() - 0.5) * 20, 10, (Math.random() - 0.5) * 20), life: 1.4, size: [4, 14], color: "#3b3631", alpha: 0.6, drag: 1.5 });
	syncHp();
}

// ---------- damage and upgrades on the model ----------
const SOOT = new THREE.Color("#262220");
const basePaint = new Map();
const baseOf = (m) => basePaint.get(m) || basePaint.set(m, m.color.clone()).get(m);
function applyDamage() {
	const hp = state.hp / 100,
		soot = Math.max(0, Math.min(0.75, (0.8 - hp) / 0.7));
	for (const m of tank.paints) m.color.copy(baseOf(m)).lerp(SOOT, soot);
	// Skirts fall off: two below 60 %, four below 35 %.
	const lost = hp < 0.35 ? [1, 3, 4, 6] : hp < 0.6 ? [1, 6] : [];
	tank.skirts.forEach((s, i) => (s.visible = !lost.includes(i)));
	// The antenna bends below 35 %.
	tank.antennaBent = hp < 0.35 ? 0.9 : 0;
}
function applyLevel() {
	tank.era.visible = state.level >= 1;
	for (const b of tank.eraTurret) b.visible = state.level >= 1;
	tank.mg.visible = tank.stowage.visible = state.level >= 2;
	for (const b of tank.deckBoxes) b.visible = state.level >= 2;
	// Longer barrel at level 2: stretch the barrel parts along X.
	tank.barrel.scale.x = state.level >= 2 ? 1.18 : 1;
	tank.brake.scale.x = 1 / tank.barrel.scale.x;
}
applyDamage();
applyLevel();

// ---------- UI ----------
function syncHp() {
	$("hp").value = state.hp;
	$("hpValue").textContent = Math.round(state.hp) + "%";
	applyDamage();
}
const setOn = (ids, on) => ids.forEach((id) => $(id).classList.toggle("on", id === on));
for (const b of document.querySelectorAll("[data-model]")) b.onclick = () => useModel(b.dataset.model);
$("drive").onclick = () => {
	state.mode = "drive";
	state.stopped = false;
	setOn(["drive", "parade"], "drive");
	$("stop").textContent = "Stój";
};
$("parade").onclick = () => {
	state.mode = "parade";
	Object.assign(state, { x: 0, z: 34, heading: 0, v: 0 });
	setOn(["drive", "parade"], "parade");
	if (!state.follow) return;
	cam.yaw = 0.6;
	cam.distance = 150;
};
$("stop").onclick = () => {
	state.stopped = !state.stopped;
	$("stop").textContent = state.stopped ? "Jedź" : "Stój";
};
$("fire").onclick = fire;
$("auto").onclick = () => {
	state.auto = !state.auto;
	$("auto").classList.toggle("on", state.auto);
};
$("hit").onclick = hit;
$("repair").onclick = () => {
	state.hp = 100;
	syncHp();
};
$("hp").oninput = (e) => {
	state.hp = +e.target.value;
	syncHp();
};
for (const b of document.querySelectorAll("[data-level]"))
	b.onclick = () => {
		state.level = +b.dataset.level;
		for (const o of document.querySelectorAll("[data-level]")) o.classList.toggle("on", o === b);
		applyLevel();
	};
$("day").onclick = () => {
	state.nightTarget = 0;
	setOn(["day", "night"], "day");
};
$("night").onclick = () => {
	state.nightTarget = 1;
	setOn(["day", "night"], "night");
};
$("follow").onclick = () => {
	state.follow = !state.follow;
	$("follow").classList.toggle("on", state.follow);
};

// ---------- camera: orbit around the tank ----------
const cam = { yaw: 2.4, pitch: 0.42, distance: 170, target: new THREE.Vector3() };
let drag = null;
renderer.domElement.addEventListener("pointerdown", (e) => {
	drag = { x: e.clientX, y: e.clientY };
	renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener("pointermove", (e) => {
	if (!drag) return;
	cam.yaw -= (e.clientX - drag.x) * 0.006;
	cam.pitch = Math.max(0.08, Math.min(1.35, cam.pitch + (e.clientY - drag.y) * 0.005));
	drag = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener("pointerup", () => (drag = null));
renderer.domElement.addEventListener(
	"wheel",
	(e) => {
		e.preventDefault();
		cam.distance = Math.max(45, Math.min(700, cam.distance * Math.exp(e.deltaY * 0.001)));
	},
	{ passive: false },
);

// ---------- frame ----------
const SKY_DAY = new THREE.Color("#a9b8bf"),
	SKY_NIGHT = new THREE.Color("#0b1220");
let last = performance.now(),
	time = 0;
function frame(now) {
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	time += dt;

	// Drive: speed towards the target with a tank's acceleration and braking.
	const want = state.mode === "drive" && !state.stopped ? MAX_SPEED : 0,
		v0 = state.v;
	state.v += Math.sign(want - state.v) * Math.min(Math.abs(want - state.v), (want > state.v ? 14 : 34) * dt);
	const accel = (state.v - v0) / Math.max(dt, 1e-4);
	if (state.mode === "drive" && state.v > 0) {
		const p = pathAt(state.t),
			q = pathAt(state.t + 0.001),
			speed = p.distanceTo(q) / 0.001;
		state.t += (state.v * dt) / speed;
		const n = pathAt(state.t),
			ahead = pathAt(state.t + 0.02);
		state.x = n.x;
		state.z = n.y;
		const target = Math.atan2(ahead.y - n.y, ahead.x - n.x);
		state.heading += wrapAngle(target - state.heading) * Math.min(1, dt * 4);
	}
	const step = state.v * dt;
	state.distance += step;

	// Lie on the ground: pitch from front/back, roll from left/right under the tracks.
	const c = Math.cos(state.heading),
		s = Math.sin(state.heading),
		at = (fx, fz) => heightAt(state.x + c * fx - s * fz, state.z + s * fx + c * fz),
		hf = at(17, 0),
		hb = at(-17, 0),
		hr = at(0, 11),
		hl = at(0, -11),
		groundPitch = Math.atan2(hf - hb, 34),
		groundRoll = -Math.atan2(hr - hl, 22),
		groundY = Math.max((hf + hb) / 2, (hr + hl) / 2, at(0, 0));
	// Spring suspension: squat when accelerating, dive when braking; bumps shake the hull.
	const K = 70,
		D = 11;
	state.pitchV += ((groundPitch + accel * 0.0028 - state.pitch) * K - state.pitchV * D) * dt;
	state.pitch += state.pitchV * dt;
	state.rollV += ((groundRoll - state.roll) * K - state.rollV * D) * dt;
	state.roll += state.rollV * dt;
	const rumble = state.v > 1 ? (Math.sin(state.distance * 1.7) * 0.12 + Math.sin(state.distance * 4.3) * 0.06) * Math.min(1, state.v / 20) : 0;
	state.bobV += ((rumble - state.bob) * 140 - state.bobV * 14) * dt;
	state.bob += state.bobV * dt;
	state.swayV += ((-accel * 0.03 - state.pitch * 0 - state.sway) * 30 - state.swayV * 3) * dt + (state.v > 1 ? (Math.random() - 0.5) * 0.4 * dt * state.v : 0);
	state.sway += state.swayV * dt;

	tank.root.position.set(state.x, groundY, state.z);
	tank.root.rotation.y = -state.heading;
	tank.hull.position.y = state.bob;
	tank.hull.rotation.set(state.roll, 0, state.pitch);

	// Tracks scroll and wheels roll with the distance.
	for (const b of tank.belts) b.map.offset.x = state.distance / LINK;
	for (const { w, r } of tank.wheels) w.rotation.z = -state.distance / r;

	// Turret aims at the outcrop; the gun elevates.
	tank.hull.updateWorldMatrix(true, true);
	const tp = tank.turret.getWorldPosition(new THREE.Vector3()),
		rel = wrapAngle(Math.atan2(TARGET.z - tp.z, TARGET.x - tp.x) - state.heading);
	state.aim += Math.sign(wrapAngle(rel - state.aim)) * Math.min(Math.abs(wrapAngle(rel - state.aim)), 1.1 * dt);
	tank.turret.rotation.y = -state.aim;
	const flat = Math.hypot(TARGET.x - tp.x, TARGET.z - tp.z);
	state.elevation += (Math.atan2(TARGET.y - tp.y - 4, flat) - state.pitch * Math.cos(state.aim) - state.elevation) * Math.min(1, dt * 3);
	tank.gun.rotation.z = Math.max(-0.12, Math.min(0.35, state.elevation));
	const aimed = Math.abs(wrapAngle(rel - state.aim)) < 0.03;

	// Firing.
	state.reload = Math.max(0, state.reload - dt);
	if (state.auto && aimed && state.reload === 0) fire();
	state.recoil = Math.max(0, state.recoil - dt * 2.2);
	tank.barrel.position.x = -Math.pow(state.recoil, 0.5) * 7 * (state.recoil > 0.85 ? 1 : 1);
	state.flash = Math.max(0, state.flash - dt * 9);
	tank.flash.visible = state.flash > 0;
	tank.flash.scale.setScalar(0.6 + state.flash * 0.8);
	tank.flash.rotation.x = time * 40;
	tank.flashMat.opacity = state.flash;
	tank.flashLight.intensity = state.flash * 600;
	for (let i = state.shells.length - 1; i >= 0; i--) {
		const sh = state.shells[i];
		sh.t += dt / sh.time;
		if (sh.t >= 1) {
			impact(sh.to);
			state.shells.splice(i, 1);
			continue;
		}
		shellMesh.position.lerpVectors(sh.from, sh.to, sh.t);
		shellMesh.lookAt(sh.to);
		shellMesh.rotateY(Math.PI / 2);
	}
	shellMesh.visible = state.shells.length > 0;
	blast = Math.max(0, blast - dt * 3);
	blastLight.intensity = blast * blast * 900;

	// Antenna: sways with acceleration and bumps; bent when damaged.
	tank.antenna.rotation.z = state.sway * 0.4 - (tank.antennaBent || 0);
	tank.antenna.rotation.x = state.roll * -1.5 + Math.sin(time * 7) * 0.02 * Math.min(1, state.v / 10);

	// Tread marks every few units, dust behind the tracks, exhaust with the throttle.
	markDistance += step;
	if (markDistance > 5.5) {
		markDistance = 0;
		for (const z of [-11, 11]) {
			const p = local(-19, 0, z);
			treadMark(p.x, p.z, state.heading);
		}
	}
	if (state.v > 4)
		for (const z of [-11, 11])
			if (Math.random() < state.v * dt * 0.5) {
				const p = local(-20, 1, z);
				smoke.emit({ p, v: new THREE.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 6, (Math.random() - 0.5) * 8), life: 1.8, size: [5, 20], color: "#b8a27a", alpha: 0.35, drag: 1.2 });
			}
	const throttle = Math.max(0.15, Math.min(1, accel / 10 + state.v / MAX_SPEED));
	for (const e of tank.exhausts)
		if (Math.random() < dt * 14 * throttle) {
			const p = tank.hull.localToWorld(e.clone());
			smoke.emit({ p, v: local(-1, 0.6, 0).sub(local(0, 0, 0)).multiplyScalar(10), life: 1.4, size: [2, 9], color: "#4b4844", alpha: 0.45 * throttle + 0.1, drag: 1.4, gravity: 4 });
		}

	// Damage: engine smoke, fire and sparks.
	const hp = state.hp / 100;
	if (hp < 0.6 && Math.random() < dt * (hp < 0.35 ? 30 : 12)) smoke.emit({ p: local(-12 + Math.random() * 4, 17.5, (Math.random() - 0.5) * 8), v: new THREE.Vector3((Math.random() - 0.5) * 4, 14, (Math.random() - 0.5) * 4), life: 2.6, size: [4, 22], color: hp < 0.35 ? "#2a2522" : "#4a4642", alpha: 0.38, drag: 0.6 });
	if (hp < 0.35) {
		if (Math.random() < dt * 40) glow.emit({ p: local(-12 + Math.random() * 6, 17.5, (Math.random() - 0.5) * 9), v: new THREE.Vector3((Math.random() - 0.5) * 3, 14 + Math.random() * 10, (Math.random() - 0.5) * 3), life: 0.6, size: [4, 1.5], color: Math.random() < 0.5 ? "#ff7a2a" : "#ffb347", drag: 0.8 });
		state.sparkTimer -= dt;
		if (state.sparkTimer <= 0) {
			state.sparkTimer = 0.6 + Math.random() * 1.6;
			const p = local((Math.random() - 0.5) * 30, 10, (Math.random() < 0.5 ? -1 : 1) * 10);
			for (let i = 0; i < 8; i++) glow.emit({ p, v: new THREE.Vector3((Math.random() - 0.5) * 60, 20 + Math.random() * 40, (Math.random() - 0.5) * 60), life: 0.5, size: [1.2, 0.6], color: "#ffe6a0", gravity: -150, drag: 0.5 });
		}
	}
	state.hitFlash = Math.max(0, state.hitFlash - dt * 5);
	for (const m of tank.paints) m.emissive.setRGB(state.hitFlash * 0.8, state.hitFlash * 0.7, state.hitFlash * 0.6);

	// Day and night.
	state.night += (state.nightTarget - state.night) * Math.min(1, dt * 2);
	const n = state.night;
	sun.intensity = 2.6 * (1 - n) + 0.35 * n;
	sun.color.set(n > 0.5 ? "#9fb6ff" : "#fff1dc");
	hemi.intensity = 0.9 * (1 - n) + 0.3 * n;
	scene.background = SKY_DAY.clone().lerp(SKY_NIGHT, n);
	scene.fog.color.copy(scene.background);
	for (const l of tank.lights) l.intensity = n * 2200;
	tank.mats.lamp.emissiveIntensity = 0.2 + n * 3;
	tank.mats.tail.emissiveIntensity = 0.3 + n * 2.5;
	tank.mats.team.emissiveIntensity = 0.15 + n * 1.2;
	tank.mats.glass.emissiveIntensity = 0.7 + n * 1.2;
	models.setNight(n);

	// The old model idles on the square.
	oldTank.update({ id: 1 }, { time, moving: false, aim: Math.sin(time * 0.4) * 0.6, recoil: 0, built: 1 });

	smoke.update(dt);
	glow.update(dt);

	// Camera.
	const focus = state.follow ? new THREE.Vector3(state.x, groundY + 10, state.z) : state.mode === "parade" ? new THREE.Vector3(0, 8, 0) : cam.target;
	if (!state.follow && state.mode === "parade") focus.set(0, 8, 0);
	cam.target.lerp(focus, Math.min(1, dt * 5));
	camera.position.set(
		cam.target.x + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.distance,
		cam.target.y + Math.sin(cam.pitch) * cam.distance,
		cam.target.z + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.distance,
	);
	camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 6);
	camera.lookAt(cam.target);
	sun.position.copy(cam.target).add(new THREE.Vector3(-220, 320, 140));
	sun.target.position.copy(cam.target);

	const scale = renderer.getDrawingBufferSize(new THREE.Vector2()).y * 0.5 * camera.projectionMatrix.elements[5];
	smoke.material.uniforms.uScale.value = glow.material.uniforms.uScale.value = scale;

	renderer.render(scene, camera);
	requestAnimationFrame(frame);
}
cam.target.set(state.x, 10, state.z);
requestAnimationFrame(frame);
window.unitShowcase = { state, tank, fire, hit, scene, camera };
