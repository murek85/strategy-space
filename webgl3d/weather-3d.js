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
// How close the camera is to the ground for the weather (0.171.7, one function for weather-3d.js and the
// night lights of scene-fx-3d.js): 0 at `far` units of camera distance and further, 1 at `near` and closer,
// smooth between. Close in, the storm thins out so the board stays readable.
export function weatherCloseness(distance, far = 1500, near = 700) {
	const k = Math.max(0, Math.min(1, (far - (distance ?? far)) / (far - near)));
	return k * k * (3 - 2 * k);
}
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
			// Gusts of a blizzard (0 lull … 1 whiteout), a slow uneven pulse (update).
			gust: { value: 0 },
			// The light on the weather (0.171.7): grains, flakes, drops and veils darken at night (they
			// glowed as a pale haze in a night storm); a lightning flash lights them up.
			weatherLit: { value: 1 },
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
		uniform float time; uniform vec2 focus; uniform float span; uniform vec2 wind; uniform float intensity; uniform float gust;
		uniform sampler2D heightMap; uniform vec4 heightInfo;
		attribute vec4 seed;
		float groundAt(vec2 p) { return texture2D(heightMap, (p / heightInfo.z + 0.5) / heightInfo.xy).r; }
		// A point of the box around the focus, wrapped so the particles never run out.
		vec2 inBox(vec2 unit, vec2 drift) { return focus - span * 0.5 + mod(unit * span + drift, span); }
		float edgeFade(vec2 p) { vec2 rel = abs(p - focus) / span; return 1.0 - smoothstep(0.36, 0.5, max(rel.x, rel.y)); }
	`;
	// Soft particles (0.138.1): veils of dust, mist and rain are upright sheets — where one cuts into a slope
	// it left a hard line along the ground. A layer that places its vertices in the world (pos) hands the
	// point on to its pixels, and each pixel fades out as it nears the ground under it (the height map read
	// with bilinear filtering by hand: the texture itself is nearest, which would show steps).
	const SOFT_FRAGMENT = `
		uniform sampler2D heightMap; uniform vec4 heightInfo; varying vec3 vSoftWorld;
		float softGround(vec2 p) {
			vec2 g = p / heightInfo.z, i = floor(g), f = g - i;
			vec2 t = 1.0 / heightInfo.xy;
			float a = texture2D(heightMap, (i + 0.5) * t).r, b = texture2D(heightMap, (i + vec2(1.5, 0.5)) * t).r;
			float c = texture2D(heightMap, (i + vec2(0.5, 1.5)) * t).r, d = texture2D(heightMap, (i + 1.5) * t).r;
			return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
		}
	`;
	function softened(vertex, fragment, reach) {
		const place = "gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);";
		if (!reach || !vertex.includes(place)) return [vertex, fragment];
		return [
			"varying vec3 vSoftWorld;\n" + vertex.replace(place, "vSoftWorld = pos;\n" + place),
			SOFT_FRAGMENT + fragment.replace(/\}\s*$/, `
gl_FragColor.a *= smoothstep(0.0, ${reach.toFixed(1)}, vSoftWorld.y - softGround(vSoftWorld.xz));
}`),
		];
	}
	function layer(count, geometry, vertex, fragment, uniforms = {}, blending = THREE.NormalBlending, soft = 26) {
		[vertex, fragment] = softened(vertex, fragment, soft);
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
			// The colours written in these shaders are sRGB: made linear and passed through the output
			// conversion, so they look the same on the plain screen and in the high-range frame of the
			// cinematic image (where raw values came out pale and the grains as white lines). The mist takes
			// its colour from the sky (already linear).
			fragmentShader: fragment.includes("mistColor") ? fragment : (blending === THREE.NormalBlending ? "uniform float weatherLit;\n" : "") + fragment.replace(/\}\s*$/, "\ngl_FragColor.rgb = pow(max(gl_FragColor.rgb, 0.0), vec3(2.2))" + (blending === THREE.NormalBlending ? " * weatherLit" : "") + ";\n#include <colorspace_fragment>\n}"),
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
	// A blizzard (0.138.2): the flakes are driven hard by the wind (slanting, many more), and above them
	// come streaks of blown snow, rolling white curtains and snow swept low along the ground; gusts
	// thicken it all now and then towards a whiteout.
	const snow = layer(10000, quad, billboard(85, 230, 460, 2.4, 1.8, 10), softDot("0.96, 0.98, 1.0", 0.85));
	// Streaks: snow racing along the wind at every height, stretched by its speed.
	const snowStreaks = layer(
		9000,
		quad,
		`varying float vAlpha; varying vec2 vUv;
		void main() {
			float s = 0.7 + 0.6 * seed.w;
			vec2 dir = normalize(wind);
			vec2 p = inBox(seed.xy, dir * time * 640.0 * s);
			float y = fract(seed.z - time * 0.18 * s);
			vec3 c = vec3(p.x, groundAt(p) + 4.0 + y * y * 300.0, p.y);
			vec3 along = normalize(vec3(dir.x, -0.18, dir.y));
			vec3 side = normalize(cross(along, normalize(cameraPosition - c)));
			vec3 pos = c + along * (position.y - 0.5) * (24.0 + 20.0 * s) + side * position.x * 1.6;
			vUv = uv;
			float dist = distance(cameraPosition, c);
			vAlpha = intensity * (0.55 + 0.45 * gust) * edgeFade(p) * smoothstep(70.0, 220.0, dist) * (1.0 - smoothstep(600.0, 1100.0, dist));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`varying float vAlpha; varying vec2 vUv;
		void main() { float a = vAlpha * (1.0 - abs(vUv.x - 0.5) * 2.0) * sin(vUv.y * 3.14159); gl_FragColor = vec4(0.94, 0.97, 1.0, a * 0.7); }`,
	);
	// Curtains of blown snow rolling across the map with the wind (and, low and fast, snow swept along
	// the ground): churning white sheets, densest in the gusts.
	const snowVeil = (count, lowness) =>
		layer(
			count,
			quad,
			`varying float vAlpha; varying vec2 vUv; varying vec2 vSeed;
			void main() {
				float s = 0.7 + 0.6 * seed.w;
				vec2 p = inBox(seed.xy, normalize(wind) * time * ${lowness > 0.5 ? "520.0" : "360.0"} * s);
				float w = ${lowness > 0.5 ? "200.0 + 160.0" : "300.0 + 260.0"} * seed.w, h = ${lowness > 0.5 ? "26.0 + 30.0" : "140.0 + 140.0"} * seed.z;
				vec3 c = vec3(p.x, groundAt(p) - h * 0.1, p.y);
				vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
				vec3 pos = c + right * position.x * w + vec3(0.0, position.y * h, 0.0);
				vUv = uv;
				vSeed = seed.xy * 40.0;
				vAlpha = intensity * (0.45 + 0.55 * gust) * edgeFade(p) * smoothstep(110.0, 380.0, distance(cameraPosition, c));
				gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
			}`,
			`uniform float time; varying float vAlpha; varying vec2 vUv; varying vec2 vSeed;
			float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
			float sNoise(vec2 p) {
				vec2 i = floor(p), f = fract(p);
				f = f * f * (3.0 - 2.0 * f);
				return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), f.x), f.y);
			}
			void main() {
				vec2 q = vUv * vec2(3.2, 1.5) + vSeed + vec2(-time * ${lowness > 0.5 ? "0.9" : "0.45"}, time * 0.1);
				float n = sNoise(q) * 0.55 + sNoise(q * 2.4 + 4.1) * 0.3 + sNoise(q * 5.3 - 2.3) * 0.15;
				float body = smoothstep(0.3, 0.72, n) * (1.0 - smoothstep(0.2, 1.0, vUv.y)) * smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.5, 1.0, abs(vUv.x - 0.5) * 2.0));
				vec3 col = mix(vec3(0.82, 0.87, 0.93), vec3(0.97, 0.98, 1.0), vUv.y + n * 0.3);
				// (0.147.2: thinner — the board stays readable in the blizzard.)
				gl_FragColor = vec4(col, vAlpha * body * ${lowness > 0.5 ? "0.4" : "0.3"});
			}`,
		);
	const snowCurtains = snowVeil(260, 0),
		snowDrift = snowVeil(260, 1);
	// Solar storm (space, 0.142): the solar wind — fine golden streaks racing across the battle from the
	// sun's side at every height, added light.
	const solarWind = layer(
		6000,
		quad,
		`varying float vAlpha; varying vec2 vUv;
		void main() {
			float s = 0.7 + 0.6 * seed.w;
			vec2 dir = normalize(vec2(0.62, -0.52));
			vec2 p = inBox(seed.xy, dir * time * 900.0 * s);
			vec3 c = vec3(p.x, -120.0 + seed.z * 360.0, p.y);
			vec3 along = normalize(vec3(dir.x, -0.35, dir.y));
			vec3 side = normalize(cross(along, normalize(cameraPosition - c)));
			vec3 pos = c + along * (position.y - 0.5) * (40.0 + 40.0 * s) + side * position.x * 1.4;
			vUv = uv;
			float dist = distance(cameraPosition, c);
			vAlpha = intensity * smoothstep(80.0, 260.0, dist) * (1.0 - smoothstep(900.0, 1600.0, dist));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`varying float vAlpha; varying vec2 vUv;
		void main() { float a = vAlpha * (1.0 - abs(vUv.x - 0.5) * 2.0) * sin(vUv.y * 3.14159) * vUv.y; gl_FragColor = vec4(vec3(1.0, 0.78, 0.4) * a * 0.9, 1.0); }`,
		{},
		THREE.AdditiveBlending,
		0,
	);
	// Asteroid shower (space, 0.142): burning fragments falling steeply from high above, a white-hot head
	// and a fiery tail behind it, each on its own fall (loops).
	const meteors = layer(
		260,
		quad,
		`varying float vAlpha; varying vec2 vUv;
		void main() {
			float s = 0.7 + 0.6 * seed.w;
			float t = fract(seed.z + time * 0.35 * s);
			vec2 base = focus + (seed.xy - 0.5) * span * 0.9;
			vec3 dir = normalize(vec3(0.55, -1.0, 0.25));
			vec3 c = vec3(base.x, 0.0, base.y) - dir * (1.0 - t) * 1400.0;
			vec3 side = normalize(cross(dir, normalize(cameraPosition - c)));
			float len = 70.0 + 60.0 * s;
			vec3 pos = c - dir * (1.0 - position.y) * len + side * position.x * (5.0 + 4.0 * s);
			vUv = uv;
			vAlpha = intensity * smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.92, 1.0, t)) * smoothstep(200.0, 500.0, distance(cameraPosition, c));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`varying float vAlpha; varying vec2 vUv;
		void main() {
			float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
			float head = smoothstep(0.75, 1.0, vUv.y);
			vec3 col = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.95, 0.8), head);
			float a = vAlpha * pow(across, 1.5 - head) * vUv.y * (0.5 + 1.5 * head);
			gl_FragColor = vec4(col * a, 1.0);
		}`,
		{},
		THREE.AdditiveBlending,
		0,
	);
	// Ion storm (space, 0.140): curtains of ionised plasma — tall rippling ribbons of green, cyan and violet,
	// streaked along their height like an aurora, flowing and flickering; they hang across the battle
	// and below it. Added light.
	const ionCurtains = layer(
		70,
		quad,
		`varying float vAlpha; varying vec2 vUv; varying vec2 vSeed;
		void main() {
			vec2 p = focus + (seed.xy - 0.5) * span * 0.9 + vec2(sin(time * 0.05 + seed.z * 9.0), cos(time * 0.04 + seed.w * 7.0)) * 120.0;
			float w = 500.0 + 500.0 * seed.w, h = 260.0 + 320.0 * seed.z;
			vec3 c = vec3(p.x, -160.0 + seed.z * 120.0, p.y);
			vec3 along = normalize(vec3(cos(seed.x * 6.28), 0.0, sin(seed.x * 6.28)));
			float wave = sin(position.x * 6.0 + time * 0.6 + seed.y * 20.0) * 40.0;
			vec3 pos = c + along * position.x * w + vec3(-along.z, 0.0, along.x) * wave + vec3(0.0, position.y * h, 0.0);
			vUv = uv;
			vSeed = seed.xy * 40.0 + seed.zw;
			vAlpha = intensity * smoothstep(200.0, 700.0, distance(cameraPosition, c));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`uniform float time; varying float vAlpha; varying vec2 vUv; varying vec2 vSeed;
		float iHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
		float iNoise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			f = f * f * (3.0 - 2.0 * f);
			return mix(mix(iHash(i), iHash(i + vec2(1.0, 0.0)), f.x), mix(iHash(i + vec2(0.0, 1.0)), iHash(i + vec2(1.0, 1.0)), f.x), f.y);
		}
		void main() {
			float rays = iNoise(vec2(vUv.x * 40.0 + vSeed.x, time * 0.8)) * 0.6 + iNoise(vec2(vUv.x * 110.0 - vSeed.y, time * 1.7)) * 0.4;
			float flow = iNoise(vec2(vUv.x * 4.0 + time * 0.15 + vSeed.x, vUv.y * 2.0 - time * 0.3));
			float body = smoothstep(0.35, 0.8, rays * 0.6 + flow * 0.6) * pow(1.0 - vUv.y, 0.6) * smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.6, 1.0, abs(vUv.x - 0.5) * 2.0));
			vec3 col = mix(vec3(0.2, 1.0, 0.65), vec3(0.65, 0.35, 1.0), smoothstep(0.25, 0.9, vUv.y + flow * 0.3));
			col = mix(col, vec3(0.3, 0.85, 1.0), smoothstep(0.6, 0.9, rays) * 0.5);
			float flicker = 0.75 + 0.25 * sin(time * 9.0 + vSeed.x * 3.0);
			gl_FragColor = vec4(col * body * vAlpha * flicker * 0.55, 1.0);
		}`,
		{},
		THREE.AdditiveBlending,
		0,
	);
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
			vec3 pos = c + along * (position.y - 0.5) * (7.0 + 6.0 * s) + side * position.x * 1.1;
			vUv = uv;
			// Only near the camera: further away the grains are thinner than a pixel and flicker as dashed
			// white lines; there the dust curtains and the haze carry the storm.
			float dist = distance(cameraPosition, c);
			vAlpha = intensity * edgeFade(p) * smoothstep(60.0, 200.0, dist) * (1.0 - smoothstep(500.0, 950.0, dist));
			gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
		}`,
		`varying float vAlpha; varying vec2 vUv;
		void main() { float a = vAlpha * (1.0 - abs(vUv.x - 0.5) * 2.0) * sin(vUv.y * 3.14159); gl_FragColor = vec4(0.86, 0.72, 0.5, a * 0.2); }`,
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
			// (0.147.1: thinner — the board stays readable in the storm.)
			gl_FragColor = vec4(col, vAlpha * body * 0.15);
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
	// The sky's flash is in the renderer's hemisphere light (three-renderer.js, weatherLight): a directional light
	// kept at zero in the scene made every lit fragment of the board count one light more (0.171.15).
	group.add(flashLight);
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
		snowCover = 0,
		sandCover = 0;
	function update(game, time, dt, { focus, span, density = 1, flashes = true, mist: mistLevel = 0, mistTint, night = 0 }) {
		const w = game.weather,
			kind = w.kind,
			k = w.intensity;
		shared.time.value = time;
		shared.focus.value.set(focus.x, focus.y);
		shared.span.value = span;
		// Gusts: two slow waves together, so the blizzard swells and slackens unevenly.
		const gust = Math.max(0, Math.min(1, 0.5 + 0.35 * Math.sin(time * 0.31) + 0.25 * Math.sin(time * 0.137 + 1.7)));
		shared.gust.value = gust;
		// Zoomed in (0.171.2): the camera close to the ground (focus.distance, the rig's) looks through the whole
		// storm at once, and the board went milky. Close in, the veils, streaks and mist thin out and the haze
		// draws back (0 at 1500 units and further, 1 at 700 and closer).
		// The veils (curtains, drifts, rain sheets, dust) thin out from further away (0.171.7: at a middle zoom the
		// blizzard's white curtains still hid the board), the particles only close in.
		const close = weatherCloseness(focus.distance),
			wide = weatherCloseness(focus.distance, 2600, 900),
			thin = 1 - 0.7 * wide,
			fewer = 1 - 0.4 * close;
		// Every particle of the weather a little paler close in, too.
		shared.intensity.value = Math.min(1, k * 1.2) * (1 - 0.4 * close);
		const show = (l, on, share = 1) => {
			l.mesh.visible = on && k > 0.02;
			l.mesh.geometry.instanceCount = l.mesh.visible ? Math.floor(l.count * k * density * share) : 0;
		};
		show(rain, kind === "rain", fewer);
		show(splashes, kind === "rain");
		show(snow, kind === "snow", fewer);
		show(snowStreaks, kind === "snow", thin * (1 - 0.5 * close));
		show(snowCurtains, kind === "snow", thin);
		show(snowDrift, kind === "snow", thin);
		show(ionCurtains, kind === "ion");
		show(solarWind, kind === "solar");
		show(meteors, kind === "meteor");
		show(sand, kind === "sand", fewer);
		show(curtains, kind === "sand", thin);
		show(sheets, kind === "rain", thin);
		// Mist: in rain and snow, and a little at night everywhere (its own amount, not the weather's).
		// Ground mist of a storm (0.147.2: lighter in rain and snow, the board stays readable).
		const mistAmount = Math.max(mistLevel, (kind === "rain" ? k * 0.6 : kind === "snow" ? k * 0.45 : 0) * thin);
		mist.mesh.visible = mistAmount > 0.03;
		mist.mesh.geometry.instanceCount = mist.mesh.visible ? Math.floor(mist.count * density) : 0;
		mistIntensity.value = mistAmount;
		if (mistTint) mistColor.value.copy(mistTint);
		// The ground gets wet in rain and white in snow, slowly, and recovers afterwards.
		wetness = kind === "rain" && k > 0.05 ? Math.min(1, wetness + (dt * k) / 12) : Math.max(0, wetness - dt / 45);
		snowCover = kind === "snow" && k > 0.05 ? Math.min(0.85, snowCover + (dt * k) / 35) : Math.max(0, snowCover - dt / 90);
		// Sand settles on everything during a sand storm (faster than snow) and blows off slowly after.
		sandCover = kind === "sand" && k > 0.05 ? Math.min(0.9, sandCover + (dt * k) / 22) : Math.max(0, sandCover - dt / 70);
		// Lightning: same rhythm as the 2D sky (every 17 s of game time in a strong rainstorm).
		// Several strokes in one strike: sharp pulses fading fast, the bolt shown during each.
		const strike = time % 17,
			on = flashes && kind === "rain" && k > 0.4 && strike < 1.3,
			// Ion storm: discharges flare through the plasma now and then (a flash, no bolt).
			ionFlash = kind === "ion" && flashes && k > 0.3 ? Math.max(0, Math.sin(time * 1.9) * Math.sin(time * 0.73 + 1.3) - 0.55) * 2.2 * k : 0,
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
		shared.weatherLit.value = Math.min(1, 0.32 + 0.68 * (1 - night) + flash * 0.7);
		flashLight.intensity = flash * 7;
		skyFlash.intensity = flash * 2.4;
		// Haze closes the distance, but a storm must not hide the units in view.
		// A blizzard's haze breathes with the gusts (towards a whiteout, never hiding the units in view).
		// Solar storm: slow surges of light (flares), handled by the renderer as a warm glow.
		const solar = kind === "solar" ? k * (0.55 + 0.45 * Math.pow(Math.max(0, Math.sin(time * 0.45)), 3)) : 0;
		return { kind, intensity: k, solar, flash: kind === "ion" ? ionFlash : kind === "solar" || kind === "meteor" ? 0 : flash, haze: (kind === "ion" || kind === "solar" || kind === "meteor" ? 0 : kind === "sand" ? k * 0.45 : kind === "snow" ? k * (0.3 + 0.12 * gust) : k * 0.25) * (1 - 0.65 * wide), wetness, snowCover, sandCover, strike: struck };
	}
	return {
		setTerrain,
		update,
		// The height map texture and its size (cols, rows, cell), for other effects that lie on the ground.
		ground: { heightMap: shared.heightMap, heightInfo: shared.heightInfo },
		reset() {
			wetness = snowCover = sandCover = 0;
			boltCycle = -1;
		},
	};
}
