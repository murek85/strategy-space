/* Model portraits (0.175.12): pictures of the game's own 3D models for the interface — the knowledge base cards,
   the development tree's preview and the icons of the production deck (model-icons.js asks for them). One
   hidden renderer for all of them (one more WebGL context), a small studio: daylight as in the model gallery
   (webgl3d/model-gallery.js), a sky for the reflections, a ground that only catches the shadow (the picture is
   transparent, it lies on the panel), the camera at three quarters, framed to the model. Each look (type, side,
   faction, colour, a space station or not) is built and rendered once by the caller's cache; the model is built
   by models-3d.js exactly as the board builds it. */
import * as THREE from "../vendor/three.module.js";
import { createModels3D } from "./models-3d.js";

export function createModelPortraits() {
	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
	renderer.setPixelRatio(1);
	renderer.setClearColor(0x000000, 0);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	const scene = new THREE.Scene(),
		camera = new THREE.PerspectiveCamera(26, 1, 1, 8000),
		hemi = new THREE.HemisphereLight("#d6e6f0", "#5d5242", 0.95),
		sun = new THREE.DirectionalLight("#fff1dc", 2.7),
		rim = new THREE.DirectionalLight("#9fc8ff", 0.6);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	sun.shadow.bias = -0.0006;
	sun.shadow.normalBias = 0.6;
	scene.add(hemi, sun, sun.target, rim, rim.target);
	// The sky the metal reflects: a gradient sphere, filtered once.
	{
		const pmrem = new THREE.PMREMGenerator(renderer),
			sky = new THREE.Scene(),
			geo = new THREE.SphereGeometry(100, 24, 12),
			colors = [],
			top = new THREE.Color("#b9d2e6"),
			low = new THREE.Color("#6d6250"),
			c = new THREE.Color();
		for (let i = 0; i < geo.attributes.position.count; i++) {
			const y = geo.attributes.position.getY(i) / 100;
			c.copy(low).lerp(top, Math.max(0, Math.min(1, y * 0.8 + 0.5)));
			colors.push(c.r, c.g, c.b);
		}
		geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
		sky.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
		scene.environment = pmrem.fromScene(sky, 0.04).texture;
		scene.environmentIntensity = 0.55;
		geo.dispose();
		pmrem.dispose();
	}
	const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.32 }));
	ground.receiveShadow = true;
	scene.add(ground);
	const models = createModels3D(THREE),
		box = new THREE.Box3(),
		sphere = new THREE.Sphere(),
		dir = new THREE.Vector3();
	models.setNight(0);
	return {
		has: (e) => models.has(e),
		// A picture of entity e (type, team, faction, tint) at width × height pixels, as a 2D canvas, or null when
		// the type has no model. colors: the sides' colours (the board's); space: a station on its platform.
		render(e, { width, height, colors = [e.tint || "#9ae5cb"], space = false, yaw = -0.6, pitch = 0.5, fill = 0.82 } = {}) {
			if (!models.has(e)) return null;
			models.setMission(space ? "orbit" : null);
			const s = RTS.TYPES[e.type] || {},
				model = models.create(e, colors);
			models.setMission(null);
			model.update?.(e, { time: 1, moving: false, aim: 0, recoil: 0, built: 1, working: false });
			const root = model.root;
			root.rotation.y = yaw;
			root.position.set(0, s.flying ? Math.max(18, (s.radius || 20) * 0.9) : 0, 0);
			root.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
			scene.add(root);
			root.updateMatrixWorld(true);
			box.setFromObject(root);
			box.getBoundingSphere(sphere);
			const r = Math.max(4, sphere.radius),
				aspect = width / height,
				half = THREE.MathUtils.degToRad(camera.fov / 2),
				// The distance at which the sphere fills the narrower side.
				fit = Math.min(Math.tan(half), Math.tan(half) * aspect),
				distance = r / fit;
			camera.aspect = aspect;
			camera.near = Math.max(1, distance - r * 3);
			camera.far = distance + r * 4;
			camera.updateProjectionMatrix();
			// Three quarters from the front (the model's +X), looking down a little.
			dir.set(Math.cos(pitch) * Math.cos(0.75), Math.sin(pitch), Math.cos(pitch) * Math.sin(0.75));
			const view = dir.clone();
			camera.position.copy(sphere.center).addScaledVector(view, distance);
			camera.lookAt(sphere.center);
			camera.near = Math.max(0.5, distance - r * 3);
			camera.far = distance + r * 4;
			camera.clearViewOffset();
			camera.updateProjectionMatrix();
			ground.scale.set(r * 12, 1, r * 12);
			ground.position.set(sphere.center.x, 0, sphere.center.z);
			sun.position.copy(sphere.center).add(dir.set(-0.55, 1, 0.35).normalize().multiplyScalar(r * 6));
			sun.target.position.copy(sphere.center);
			const shadow = sun.shadow.camera;
			Object.assign(shadow, { left: -r * 2.2, right: r * 2.2, top: r * 2.2, bottom: -r * 2.2, near: 1, far: r * 14 });
			shadow.updateProjectionMatrix();
			rim.position.copy(sphere.center).add(dir.set(0.6, 0.5, -0.9).multiplyScalar(r * 5));
			rim.target.position.copy(sphere.center);
			renderer.setSize(width, height, false);
			// Framed on what is really there (0.175.12): a first picture with the sphere's cautious frame, the drawn
			// pixels measured (the model and the dark of its shadow), then the camera's view cut to them — centred and
			// filling `fill` of the narrower side — and the picture taken again.
			renderer.render(scene, camera);
			const out = document.createElement("canvas");
			out.width = width;
			out.height = height;
			const c = out.getContext("2d", { willReadFrequently: true });
			c.drawImage(renderer.domElement, 0, 0);
			const px = c.getImageData(0, 0, width, height).data;
			let x0 = width,
				x1 = -1,
				y0 = height,
				y1 = -1;
			for (let y = 0; y < height; y++)
				for (let x = 0; x < width; x++)
					if (px[(y * width + x) * 4 + 3] > 40) {
						if (x < x0) x0 = x;
						if (x > x1) x1 = x;
						if (y < y0) y0 = y;
						if (y > y1) y1 = y;
					}
			if (x1 >= x0) {
				const bw = x1 - x0 + 1,
					bh = y1 - y0 + 1,
					k = Math.min((width * fill) / bw, (height * fill) / bh, 6),
					w = width / k,
					h = height / k;
				camera.setViewOffset(width, height, (x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h);
				renderer.render(scene, camera);
				camera.clearViewOffset();
				c.clearRect(0, 0, width, height);
				c.drawImage(renderer.domElement, 0, 0);
			}
			scene.remove(root);
			return out;
		},
		dispose: () => renderer.dispose(),
	};
}
