/* Weather of the 3D renderer, animated on the graphics card: every drop, flake and grain knows where it
   is from the time and its own seed (no per-particle work on the CPU), and reads the ground height from
   a texture of the height map, so rain ends exactly on the terrain. Visual only (game.weather: kind and
   intensity; the same lightning rhythm as the 2D sky).
   - Rain: slanted streaks falling with the wind, small crowns of droplets where they hit the ground; the ground gets
     wet (darker, glossy in the sun) and dries afterwards.
   - Snow: flakes drifting and swaying; snow settles on the upward faces of the ground and of the stones
     while it falls, and melts away afterwards.
   - Sandstorm: grains racing low over the ground and wide curtains of dust.
   - Thunderstorm: a branching bolt strikes the ground near the view, lighting the scene for a moment.
   The ground's wetness and snow cover are returned to the renderer, whose ground shader uses them. */
export function createWeather3D(THREE, { world, heightAt }) {
	const group = new THREE.Group();
	world.add(group);
	const heightInfo = new THREE.Vector4(1, 1, 12, 0),
		shared = {
			time: { value: 0 },
			focus: { value: new THREE.Vector2() },
			span: { value: 2000 },
			wind: { value: new THREE.Vector2(0.35, 0.12) },
			intensity: { value: 0 },
			heightMap: { value: null },
			heightInfo: { value: heightInfo },
		};
	// The map's height as a float texture: ground under any point, in the vertex shaders.
	function setTerrain(heights) {
		shared.heightMap.value?.dispose();
		const t = new THREE.DataTexture(heights.data, heights.cols, heights.rows, THREE.RedFormat, THREE.FloatType);
		t.magFilter = t.minFilter = THREE.NearestFilter;
		t.needsUpdate = true;
		shared.heightMap.value = t;
		heightInfo.set(heights.cols, heights.rows, heights.cell, 0);
	}
	const COMMON = `
		uniform float time; uniform vec2 focus; uniform float span; uniform vec2 wind; uniform float intensity;
		uniform sampler2D heightMap; uniform vec4 heightInfo;
		attribute vec4 seed;
		float groundAt(vec2 p) { return texture2D(heightMap, (p / heightInfo.z + 0.5) / heightInfo.xy).r; }
		// A point of the box around the focus, wrapped so the particles never run out.
		vec2 inBox(vec2 unit, vec2 drift) { return focus - span * 0.5 + mod(unit * span + drift, span); }
		float edgeFade(vec2 p) { vec2 rel = abs(p - focus) / span; return 1.0 - smoothstep(0.36, 0.5, max(rel.x, rel.y)); }
	`;
	function layer(count, geometry, vertex, fragment, uniforms = {}, blending = THREE.NormalBlending) {
		const g = new THREE.InstancedBufferGeometry();
		g.index = geometry.index;
		g.setAttribute("position", geometry.attributes.position);
		g.setAttribute("uv", geometry.attributes.uv);
		const seeds = new Float32Array(count * 4);
		for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
		g.setAttribute("seed", new THREE.InstancedBufferAttribute(seeds, 4));
		g.instanceCount = 0;
		const material = new THREE.ShaderMaterial({
			uniforms: { ...shared, ...uniforms },
			vertexShader: COMMON + vertex,
			fragmentShader: fragment,
			transparent: true,
			depthWrite: false,
			blending,
			side: THREE.DoubleSide,
		});
		const mesh = new THREE.Mesh(g, material);
		mesh.frustumCulled = false;
		mesh.renderOrder = 5;
		mesh.visible = false;
		group.add(mesh);
		return { mesh, count };
	}
	// A unit quad: x in [-0.5, 0.5], y in [0, 1].
	const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
	const flatQuad = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

	const rain = layer(
		9000,
		quad,
		`varying float vAlpha; varying vec2 vUv;
		void main() {
			float speed = 900.0 * (0.8 + 0.4 * seed.w), fallH = 560.0;
			float fall = fract(seed.z - time * speed / fallH);
			vec2 p = inBox(seed.xy, wind * time * speed * 0.25);
			vec3 head = vec3(p.x, groundAt(p) + fall * fallH, p.y);
			vec3 dir = normalize(vec3(wind.x * 0.25, -1.0, wind.y * 0.25));
			vec3 side = normalize(cross(dir, normalize(cameraPosition - head)));
			vec3 pos = head - dir * position.y * (24.0 + intensity * 16.0) + side * position.x * 0.55;
			vUv = uv;
			// Drops right in front of the lens fade out, so they do not cross the view as bars.
			vAlpha = intensity * edgeFade(p) * smoothstep(0.0, 0.04, fall) * smoothstep(120.0, 320.0, distance(cameraPosition, head));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`varying float vAlpha; varying vec2 vUv;
		void main() { float a = vAlpha * vUv.y * (1.0 - abs(vUv.x - 0.5) * 2.0); gl_FragColor = vec4(0.78, 0.85, 0.92, a * 0.42); }`,
	);
	// Rain sheets: tall veils of streaks drifting in the distance, so a downpour has depth.
	const sheets = layer(
		240,
		quad,
		`varying float vAlpha; varying vec2 vUv; varying float vSeed;
		void main() {
			vec2 p = inBox(seed.xy, wind * time * 120.0);
			vec3 c = vec3(p.x, groundAt(p), p.y);
			vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
			vec3 pos = c + right * position.x * 260.0 + vec3(0.0, position.y * 320.0, 0.0);
			vUv = uv;
			vSeed = seed.w;
			vAlpha = intensity * edgeFade(p) * smoothstep(350.0, 900.0, distance(cameraPosition, c));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`uniform float time; varying float vAlpha; varying vec2 vUv; varying float vSeed;
		void main() {
			float lane = floor(vUv.x * 60.0);
			float streak = smoothstep(0.55, 1.0, fract(sin(lane * 12.9898 + vSeed * 78.2) * 43758.5)) * (0.4 + 0.6 * fract(vUv.y * 3.0 + time * 2.6 + fract(lane * 0.37)));
			float edge = (1.0 - abs(vUv.x - 0.5) * 2.0) * smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.65, 1.0, vUv.y));
			gl_FragColor = vec4(0.72, 0.78, 0.86, vAlpha * edge * (0.25 + streak) * 0.09);
		}`,
	);
	// Ground mist: low banks of churning fog drifting slowly with the wind, in the colour of the sky;
	// thicker in hollows (where the ground lies below its surroundings), thinning at the edges and near
	// the camera (rain, snow, night, dawn and dusk).
	const mistColor = { value: new THREE.Color("#a9b6bf") },
		mistIntensity = { value: 0 };
	const mist = layer(
		220,
		quad,
		`varying float vAlpha; varying vec2 vUv; varying vec2 vSeed;
		void main() {
			vec2 p = inBox(seed.xy, wind * time * 18.0 + vec2(sin(time * 0.05 + seed.z * 9.0), cos(time * 0.04 + seed.x * 7.0)) * 40.0);
			float g = groundAt(p),
				around = (groundAt(p + vec2(160.0, 0.0)) + groundAt(p - vec2(160.0, 0.0)) + groundAt(p + vec2(0.0, 160.0)) + groundAt(p - vec2(0.0, 160.0))) * 0.25,
				hollow = smoothstep(-6.0, 22.0, around - g);
			float w = 260.0 + 240.0 * seed.w, h = 40.0 + 50.0 * seed.z;
			vec3 c = vec3(p.x, g - 4.0, p.y);
			vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
			vec3 pos = c + right * position.x * w + vec3(0.0, position.y * h * (1.0 + hollow * 0.6), 0.0);
			vUv = uv;
			vSeed = seed.xy * 30.0;
			vAlpha = intensity * edgeFade(p) * (0.45 + 0.75 * hollow) * smoothstep(140.0, 420.0, distance(cameraPosition, c));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`uniform vec3 mistColor; uniform float time; varying float vAlpha; varying vec2 vUv; varying vec2 vSeed;
		float mHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
		float mNoise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			f = f * f * (3.0 - 2.0 * f);
			return mix(mix(mHash(i), mHash(i + vec2(1.0, 0.0)), f.x), mix(mHash(i + vec2(0.0, 1.0)), mHash(i + vec2(1.0, 1.0)), f.x), f.y);
		}
		void main() {
			vec2 q = vUv * vec2(2.6, 1.1) + vSeed + vec2(time * 0.03, time * 0.012);
			float n = mNoise(q) * 0.55 + mNoise(q * 2.2 + 3.7) * 0.3 + mNoise(q * 4.7 - 1.3) * 0.15;
			float body = smoothstep(0.3, 0.7, n) * (1.0 - smoothstep(0.35, 1.0, vUv.y)) * smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.5, 1.0, abs(vUv.x - 0.5) * 2.0));
			gl_FragColor = vec4(mistColor * (0.92 + 0.12 * vUv.y), vAlpha * body * 0.2);
		}`,
		{ mistColor, intensity: mistIntensity },
	);
	// Splashes: where a drop hits, a tiny crown of droplets thrown up and out for a fraction of a second
	// and a thin flick along the ground — upright, facing the camera; each splash lands somewhere else
	// (a new random point each time, fixed on the ground, not following the camera).
	const splashes = layer(
		2400,
		quad,
		`varying float vAlpha; varying vec2 vUv; varying float vT;
		float sHash(vec2 v) { return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }
		void main() {
			float cyc = time * 2.4 * (0.7 + 0.6 * seed.w) + seed.z,
				n = floor(cyc),
				tt = fract(cyc) / 0.28;
			float region = span * 0.75;
			vec2 base = focus - region * 0.5,
				u = vec2(sHash(seed.xy + n * 0.137), sHash(seed.yx + n * 0.311)),
				p = base + mod(u * region - base, region);
			vec3 c = vec3(p.x, groundAt(p) + 0.2, p.y);
			vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
			float size = 3.2 * (0.7 + 0.6 * seed.w);
			vUv = uv;
			vT = min(tt, 1.0);
			vAlpha = tt < 1.0 ? intensity * edgeFade(p) * (1.0 - tt) : 0.0;
			vec3 pos = tt < 1.0 ? c + right * position.x * size * 1.4 + vec3(0.0, position.y * size, 0.0) : c;
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`varying float vAlpha; varying vec2 vUv; varying float vT;
		void main() {
			if (vAlpha <= 0.0) discard;
			float a = 0.0;
			for (int k = 0; k < 5; k++) {
				float f = float(k) - 2.0;
				vec2 d = vec2(0.5 + f * 0.11 * (0.3 + vT), 0.06 + sin(3.14159 * min(1.0, vT * 1.1)) * (0.55 - abs(f) * 0.12) * (1.0 - vT * 0.3));
				a += smoothstep(0.055, 0.0, length((vUv - d) * vec2(1.4, 1.0)));
			}
			a += smoothstep(0.08, 0.0, abs(vUv.y - 0.04)) * smoothstep(0.1 + vT * 0.35, 0.0, abs(vUv.x - 0.5)) * 0.6;
			gl_FragColor = vec4(0.85, 0.9, 0.96, min(1.0, a) * vAlpha * 0.45);
		}`,
	);
	// Camera-facing billboards (flakes, grains, dust curtains): size, stretch along the wind, speeds.
	const billboard = (fallSpeed, windSpeed, height, size, stretch, sway) => `varying float vAlpha; varying vec2 vUv;
		void main() {
			float s = 0.7 + 0.6 * seed.w;
			vec2 p = inBox(seed.xy, wind * time * ${windSpeed.toFixed(1)} * s);
			float g = groundAt(p);
			float y = ${fallSpeed > 0 ? `g + fract(seed.z - time * ${fallSpeed.toFixed(1)} * s / ${height.toFixed(1)}) * ${height.toFixed(1)}` : `g + 3.0 + seed.z * ${height.toFixed(1)} + sin(time * 2.0 + seed.x * 40.0) * 5.0`};
			vec3 c = vec3(p.x + sin(time * 0.9 + seed.z * 31.0) * ${sway.toFixed(1)}, y, p.y + cos(time * 0.7 + seed.x * 17.0) * ${sway.toFixed(1)});
			vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
			vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
			float size = ${size.toFixed(1)} * (0.6 + 0.8 * seed.w);
			vec3 pos = c + right * (position.x * size * ${stretch.toFixed(1)}) + up * ((position.y - 0.5) * size);
			vUv = uv;
			// Close to the lens they fade out instead of crossing the view as big blobs.
			vAlpha = intensity * edgeFade(p) * smoothstep(90.0, 260.0, distance(cameraPosition, c));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`;
	const softDot = (color, strength) => `varying float vAlpha; varying vec2 vUv;
		void main() { float d = length((vUv - 0.5) * 2.0); gl_FragColor = vec4(${color}, vAlpha * ${strength.toFixed(2)} * (1.0 - smoothstep(0.35, 1.0, d))); }`;
	const snow = layer(7000, quad, billboard(65, 60, 460, 3.6, 1, 14), softDot("0.96, 0.98, 1.0", 0.9));
	// Sand: thin streaks of grains blown along the wind, low over the ground, hopping (saltation).
	const sand = layer(
		7000,
		quad,
		`varying float vAlpha; varying vec2 vUv;
		void main() {
			float s = 0.7 + 0.6 * seed.w;
			vec2 dir = normalize(wind);
			vec2 p = inBox(seed.xy, dir * time * 520.0 * s);
			float hop = fract(seed.z * 7.0 + time * 1.3 * s);
			vec3 c = vec3(p.x, groundAt(p) + 1.5 + seed.z * seed.z * 34.0 + sin(hop * 3.14159) * 6.0, p.y);
			vec3 along = normalize(vec3(dir.x, 0.0, dir.y));
			vec3 side = normalize(cross(along, normalize(cameraPosition - c)));
			vec3 pos = c + along * (position.y - 0.5) * (10.0 + 10.0 * s) + side * position.x * 0.55;
			vUv = uv;
			vAlpha = intensity * edgeFade(p) * smoothstep(60.0, 200.0, distance(cameraPosition, c));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`varying float vAlpha; varying vec2 vUv;
		void main() { float a = vAlpha * (1.0 - abs(vUv.x - 0.5) * 2.0) * sin(vUv.y * 3.14159); gl_FragColor = vec4(0.86, 0.72, 0.5, a * 0.38); }`,
	);
	// Dust: rolling billows of fine sand along the ground — wide sheets of churning noise drifting with
	// the wind, denser and darker low down, lighter on top, thinning at their edges.
	const curtains = layer(
		240,
		quad,
		`varying float vAlpha; varying vec2 vUv; varying vec2 vSeed;
		void main() {
			float s = 0.7 + 0.6 * seed.w;
			vec2 p = inBox(seed.xy, normalize(wind) * time * 300.0 * s);
			float w = 260.0 + 220.0 * seed.w, h = 110.0 + 100.0 * seed.z;
			vec3 c = vec3(p.x, groundAt(p) - h * 0.12, p.y);
			vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
			vec3 pos = c + right * position.x * w + vec3(0.0, position.y * h, 0.0);
			vUv = uv;
			vSeed = seed.xy * 40.0;
			vAlpha = intensity * edgeFade(p) * smoothstep(120.0, 420.0, distance(cameraPosition, c));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`uniform float time; varying float vAlpha; varying vec2 vUv; varying vec2 vSeed;
		float dHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
		float dNoise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			f = f * f * (3.0 - 2.0 * f);
			return mix(mix(dHash(i), dHash(i + vec2(1.0, 0.0)), f.x), mix(dHash(i + vec2(0.0, 1.0)), dHash(i + vec2(1.0, 1.0)), f.x), f.y);
		}
		void main() {
			vec2 q = vUv * vec2(3.0, 1.6) + vSeed + vec2(-time * 0.35, time * 0.08);
			float n = dNoise(q) * 0.55 + dNoise(q * 2.3 + 4.1) * 0.3 + dNoise(q * 5.1 - 2.3) * 0.15;
			float body = smoothstep(0.32, 0.72, n) * (1.0 - smoothstep(0.25, 1.0, vUv.y)) * smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.55, 1.0, abs(vUv.x - 0.5) * 2.0));
			vec3 col = mix(vec3(0.76, 0.62, 0.44), vec3(0.92, 0.82, 0.64), vUv.y + n * 0.3);
			gl_FragColor = vec4(col, vAlpha * body * 0.22);
		}`,
	);

	// Lightning: a branching bolt of thin glowing boxes, rebuilt for each strike, and a light at its foot.
	const bolt = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: "#dfe8ff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 160);
	bolt.frustumCulled = false;
	bolt.count = 0;
	group.add(bolt);
	// A wide bluish glow sheath around the white core.
	const boltGlow = new THREE.InstancedMesh(bolt.geometry, new THREE.MeshBasicMaterial({ color: "#7f9cff", transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }), 160);
	boltGlow.frustumCulled = false;
	boltGlow.count = 0;
	group.add(boltGlow);
	const flashLight = new THREE.PointLight("#c9d8ff", 0, 2200, 1);
	// The whole storm lit from above for an instant (no shadows).
	const skyFlash = new THREE.DirectionalLight("#bcd0ff", 0);
	skyFlash.position.set(0, 1, 0.3);
	group.add(flashLight, skyFlash, skyFlash.target);
	let boltCycle = -1,
		strikeAt = null;
	function buildBolt(x, z, seed) {
		let s = seed;
		const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296,
			m = new THREE.Matrix4(),
			q = new THREE.Quaternion(),
			a = new THREE.Vector3(),
			b = new THREE.Vector3(),
			d = new THREE.Vector3(),
			X = new THREE.Vector3(1, 0, 0);
		let n = 0;
		const segment = (from, to, width) => {
			if (n >= 160) return;
			d.subVectors(to, from);
			const len = d.length();
			q.setFromUnitVectors(X, d.normalize());
			a.copy(from).lerp(to, 0.5);
			boltGlow.setMatrixAt(n, m.compose(a, q, b.set(len, width * 4, width * 4)));
			bolt.setMatrixAt(n++, m.compose(a, q, b.set(len, width, width)));
		};
		const branch = (from, to, width, depth) => {
			let prev = from.clone();
			const steps = depth ? 8 : 14;
			for (let i = 1; i <= steps; i++) {
				const t = i / steps,
					next = from.clone().lerp(to, t);
				if (i < steps) next.add(new THREE.Vector3((rnd() - 0.5) * 70, (rnd() - 0.5) * 20, (rnd() - 0.5) * 70));
				segment(prev, next, width);
				if (!depth && i > 2 && i < steps - 2 && rnd() < 0.3) branch(next.clone(), next.clone().add(new THREE.Vector3((rnd() - 0.5) * 300, -150 - rnd() * 200, (rnd() - 0.5) * 300)), width * 0.5, 1);
				prev = next;
			}
		};
		const ground = heightAt(x, z);
		branch(new THREE.Vector3(x + (rnd() - 0.5) * 200, ground + 1100, z + (rnd() - 0.5) * 200), new THREE.Vector3(x, ground, z), 4.5, 0);
		bolt.count = boltGlow.count = n;
		bolt.instanceMatrix.needsUpdate = boltGlow.instanceMatrix.needsUpdate = true;
		flashLight.position.set(x, ground + 120, z);
		skyFlash.position.set(x, ground + 900, z + 300);
		skyFlash.target.position.set(x, ground, z);
		strikeAt = { x, y: z, ground };
	}

	let wetness = 0,
		snowCover = 0;
	function update(game, time, dt, { focus, span, density = 1, flashes = true, mist: mistLevel = 0, mistTint }) {
		const w = game.weather,
			kind = w.kind,
			k = w.intensity;
		shared.time.value = time;
		shared.focus.value.set(focus.x, focus.y);
		shared.span.value = span;
		shared.intensity.value = Math.min(1, k * 1.2);
		const show = (l, on, share = 1) => {
			l.mesh.visible = on && k > 0.02;
			l.mesh.geometry.instanceCount = l.mesh.visible ? Math.floor(l.count * k * density * share) : 0;
		};
		show(rain, kind === "rain");
		show(splashes, kind === "rain");
		show(snow, kind === "snow");
		show(sand, kind === "sand");
		show(curtains, kind === "sand", 1);
		show(sheets, kind === "rain");
		// Mist: in rain and snow, and a little at night everywhere (its own amount, not the weather's).
		const mistAmount = Math.max(mistLevel, kind === "rain" ? k * 0.8 : kind === "snow" ? k * 0.6 : 0);
		mist.mesh.visible = mistAmount > 0.03;
		mist.mesh.geometry.instanceCount = mist.mesh.visible ? Math.floor(mist.count * density) : 0;
		mistIntensity.value = mistAmount;
		if (mistTint) mistColor.value.copy(mistTint);
		// The ground gets wet in rain and white in snow, slowly, and recovers afterwards.
		wetness = kind === "rain" && k > 0.05 ? Math.min(1, wetness + (dt * k) / 12) : Math.max(0, wetness - dt / 45);
		snowCover = kind === "snow" && k > 0.05 ? Math.min(0.85, snowCover + (dt * k) / 35) : Math.max(0, snowCover - dt / 90);
		// Lightning: same rhythm as the 2D sky (every 17 s of game time in a strong rainstorm).
		// Several strokes in one strike: sharp pulses fading fast, the bolt shown during each.
		const strike = time % 17,
			on = flashes && kind === "rain" && k > 0.4 && strike < 1.3,
			pulse = (t0, peak) => (strike >= t0 ? peak * Math.exp(-(strike - t0) * 14) : 0),
			flash = on ? Math.min(1, pulse(0, 1) + pulse(0.09, 0.7) + pulse(0.2, 0.45) + pulse(0.48, 0.9) + pulse(0.58, 0.5)) : 0,
			cycle = Math.floor(time / 17);
		let struck = null;
		if (on && cycle !== boltCycle) {
			boltCycle = cycle;
			const r = Math.abs(Math.sin(cycle * 12.9898) * 43758.5453) % 1,
				r2 = Math.abs(Math.sin(cycle * 78.233) * 12543.123) % 1;
			buildBolt(focus.x + (r - 0.5) * span * 0.6, focus.y + (r2 - 0.5) * span * 0.6, cycle * 7919 + 13);
			struck = strikeAt;
		}
		bolt.visible = boltGlow.visible = on && flash > 0.12;
		bolt.material.opacity = bolt.visible ? Math.min(1, 0.4 + flash) : 0;
		boltGlow.material.opacity = bolt.visible ? 0.05 + flash * 0.12 : 0;
		flashLight.intensity = flash * 7;
		skyFlash.intensity = flash * 2.4;
		// Haze closes the distance, but a storm must not hide the units in view.
		return { kind, intensity: k, flash, haze: kind === "sand" ? k * 0.7 : kind === "snow" ? k * 0.5 : k * 0.35, wetness, snowCover, strike: struck };
	}
	return {
		setTerrain,
		update,
		// The height map texture and its size (cols, rows, cell), for other effects that lie on the ground.
		ground: { heightMap: shared.heightMap, heightInfo: shared.heightInfo },
		reset() {
			wetness = snowCover = 0;
			boltCycle = -1;
		},
	};
}
