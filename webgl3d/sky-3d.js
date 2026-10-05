/* Sky of the 3D board: a dome around the camera with the colours of the time of day (blue noon, golden
   hour, orange sunset, blue hour, moonlit night), the sun's disk and glow, the moon (a gibbous phase,
   faint maria, a halo), twinkling stars and the band of the galaxy at night, and drifting clouds. The
   same clouds cast soft shadows drifting over the terrain and the models: cloudShade() puts them into
   the sun (moon) light of a material's shader.
   The game camera looks down steeply, so the dome mostly shows when the camera is tilted (prototype)
   and in reflections; its horizon colour is also the colour of the distance haze. */

// Cloud cover shared by the sky and the shadows on the ground: offset (drift) and amount of shadow.
const SKY_CLOUDS = { cloudAmount: { value: 0 }, cloudOffset: { value: [0, 0] } };
const SKY_CLOUD_GLSL = `
	uniform float cloudAmount; uniform vec2 cloudOffset;
	float cloudHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
	float cloudNoise(vec2 p) {
		vec2 i = floor(p), f = fract(p);
		f = f * f * (3.0 - 2.0 * f);
		return mix(mix(cloudHash(i), cloudHash(i + vec2(1.0, 0.0)), f.x), mix(cloudHash(i + vec2(0.0, 1.0)), cloudHash(i + vec2(1.0, 1.0)), f.x), f.y);
	}
	float cloudCover(vec2 p) { return cloudNoise(p) * 0.55 + cloudNoise(p * 2.3 + 5.2) * 0.3 + cloudNoise(p * 5.1 - 1.7) * 0.15; }
	// Light let through the clouds at a point of the view space (1 clear … 1 - cloudAmount in shadow).
	float cloudShadow(vec3 viewPos) {
		if (cloudAmount <= 0.0) return 1.0;
		vec3 world = transpose(mat3(viewMatrix)) * (viewPos - viewMatrix[3].xyz);
		return 1.0 - cloudAmount * smoothstep(0.47, 0.7, cloudCover(world.xz / 1300.0 + cloudOffset));
	}`;

// Cloud shadows in a material: the directional lights (sun or moon) dimmed under the clouds. Call from
// onBeforeCompile; the uniforms are shared, so every material follows the same clouds.
export function cloudShade(THREE, shader) {
	Object.assign(shader.uniforms, SKY_CLOUDS);
	shader.fragmentShader = shader.fragmentShader
		.replace("#include <common>", "#include <common>\n" + SKY_CLOUD_GLSL)
		.replace(
			"#include <lights_fragment_begin>",
			THREE.ShaderChunk.lights_fragment_begin.replace(
				"getDirectionalLightInfo( directionalLight, directLight );",
				"getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= cloudShadow( geometryPosition );",
			),
		);
}

export function createSky3D(THREE) {
	const C = (hex) => new THREE.Color(hex);
	// Colours by the sun's height: [elevation, zenith, horizon, sunlight].
	const KEYS = [
		[-1, "#03060e", "#0b1424", "#ff6a3a"],
		[-0.25, "#050a17", "#111c31", "#ff6a3a"],
		[-0.1, "#111d3c", "#2f3659", "#ff6a3a"],
		[-0.02, "#24305e", "#8c5a68", "#ff7444"],
		[0.03, "#2f4374", "#e0784c", "#ff8a50"],
		[0.12, "#3b5f93", "#e8a874", "#ffc184"],
		[0.3, "#3c70a6", "#a8c2d2", "#fff0d8"],
		[1, "#3874b0", "#b2cada", "#fff4e4"],
	].map(([e, z, h, s]) => [e, C(z), C(h), C(s)]);
	function palette(e, zenith, horizon, sunlight) {
		let i = 0;
		while (i < KEYS.length - 2 && e > KEYS[i + 1][0]) i++;
		const [e0, z0, h0, s0] = KEYS[i],
			[e1, z1, h1, s1] = KEYS[i + 1],
			t = Math.max(0, Math.min(1, (e - e0) / (e1 - e0)));
		zenith.copy(z0).lerp(z1, t);
		horizon.copy(h0).lerp(h1, t);
		sunlight.copy(s0).lerp(s1, t);
	}

	const uniforms = {
		zenith: { value: C("#3874b0") },
		horizon: { value: C("#b2cada") },
		sunColor: { value: C("#fff4e4") },
		sunDir: { value: new THREE.Vector3(0, 1, 0) },
		moonDir: { value: new THREE.Vector3(0.55, 0.42, -0.7).normalize() },
		sunVis: { value: 1 },
		moonVis: { value: 0 },
		starVis: { value: 0 },
		cover: { value: 0.4 },
		cloudLight: { value: C("#ffffff") },
		skyTime: { value: 0 },
		cloudOffset: SKY_CLOUDS.cloudOffset,
	};
	const material = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: `
			varying vec3 vDir;
			void main() {
				vDir = position;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}`,
		fragmentShader: `
			uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir; uniform vec3 moonDir;
			uniform float sunVis; uniform float moonVis; uniform float starVis; uniform float cover; uniform vec3 cloudLight;
			uniform float skyTime; uniform vec2 cloudOffset;
			varying vec3 vDir;
			float skyHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
			float skyNoise(vec2 p) {
				vec2 i = floor(p), f = fract(p);
				f = f * f * (3.0 - 2.0 * f);
				float a = skyHash(vec3(i, 0.0)), b = skyHash(vec3(i + vec2(1.0, 0.0), 0.0)), c = skyHash(vec3(i + vec2(0.0, 1.0), 0.0)), d = skyHash(vec3(i + vec2(1.0, 1.0), 0.0));
				return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
			}
			float skyFbm(vec2 p) { return skyNoise(p) * 0.55 + skyNoise(p * 2.3 + 5.2) * 0.3 + skyNoise(p * 5.1 - 1.7) * 0.15; }
			void main() {
				vec3 d = normalize(vDir);
				float h = d.y;
				// Gradient: horizon → zenith; below the horizon the haze darkens a little.
				vec3 col = mix(horizon, zenith, pow(smoothstep(-0.02, 0.65, h), 0.55));
				col = mix(col, horizon * 0.7, smoothstep(0.0, -0.4, h));
				// The sun: a wide warm glow (stronger along the horizon at sunset), the corona and the disk.
				float s = max(dot(d, sunDir), 0.0);
				col += sunColor * (pow(s, 6.0) * 0.22 * (1.0 + 1.5 * (1.0 - smoothstep(0.0, 0.25, abs(h)))) + pow(s, 90.0) * 0.6) * sunVis;
				col += sunColor * smoothstep(0.99955, 0.9998, s) * 5.0 * sunVis;
				// Stars: one in some cells of a grid on the sphere, twinkling; the band of the galaxy.
				if (starVis > 0.0) {
					vec3 g = d * 220.0, cell = floor(g);
					float r = skyHash(cell);
					vec3 at = cell + 0.5 + (vec3(skyHash(cell + 1.3), skyHash(cell + 2.7), skyHash(cell + 4.1)) - 0.5) * 0.7;
					float star = step(0.965, r) * smoothstep(0.16, 0.0, length(g - at)) * (0.55 + 0.45 * sin(skyTime * (2.0 + r * 5.0) + r * 60.0));
					float band = exp(-pow(dot(d, normalize(vec3(0.35, 0.55, 0.75))), 2.0) * 22.0);
					vec3 sky = vec3(0.95, 0.97, 1.0) * star * (0.6 + 1.4 * fract(r * 97.0)) + vec3(0.55, 0.6, 0.78) * band * (0.25 + 0.75 * skyFbm(d.xz * 9.0 + d.y * 4.0)) * 0.09;
					col += sky * starVis * smoothstep(-0.02, 0.12, h);
				}
				// The moon: a disk lit from one side (gibbous), darker maria, a soft halo.
				if (moonVis > 0.0) {
					float m = dot(d, moonDir);
					vec3 right = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0))), up = cross(right, moonDir);
					vec2 p = vec2(dot(d, right), dot(d, up)) / 0.022;
					float r2 = dot(p, p);
					if (m > 0.0 && r2 < 1.0) {
						vec3 n = vec3(p, sqrt(1.0 - r2));
						float lit = smoothstep(-0.08, 0.12, dot(n, normalize(vec3(-0.75, 0.25, 0.62))));
						float maria = 0.78 + 0.22 * smoothstep(0.35, 0.65, skyNoise(p * 2.2 + 3.0));
						col = mix(col, vec3(0.93, 0.95, 1.0) * (0.06 + 1.3 * lit * maria), moonVis * smoothstep(1.0, 0.85, r2));
					}
					col += vec3(0.55, 0.65, 0.9) * (pow(max(m, 0.0), 300.0) * 0.12 + pow(max(m, 0.0), 3000.0) * 0.25) * moonVis;
				}
				// Clouds: a layer seen in perspective, lit by the sun or the moon, thinning to the horizon.
				if (h > 0.0 && cover > 0.0) {
					vec2 q = d.xz / (h + 0.12) * 0.9 + cloudOffset * 2.0;
					float c = smoothstep(0.62 - cover * 0.3, 0.9 - cover * 0.2, skyFbm(q)) * smoothstep(0.0, 0.18, h);
					vec3 tone = mix(horizon, cloudLight, 0.55) + sunColor * pow(s, 4.0) * 0.35 * sunVis;
					col = mix(col, tone, c * 0.85);
				}
				gl_FragColor = vec4(col, 1.0);
				#include <tonemapping_fragment>
				#include <colorspace_fragment>
			}`,
		side: THREE.BackSide,
		depthWrite: false,
		fog: false,
	});
	const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
	mesh.frustumCulled = false;
	// Drawn after the opaque board, behind it (depth test on): the sky is shaded only where it shows.
	mesh.renderOrder = 1000;

	const zenith = C("#000"),
		horizon = C("#000"),
		sunlight = C("#000"),
		WHITE = C("#f2f5f8"),
		MOONLIT = C("#3b4a6a");
	return {
		mesh,
		uniforms,
		// Colours at a sun height: { zenith, horizon, sunlight } (shared objects, copy them to keep).
		palette(e) {
			palette(e, zenith, horizon, sunlight);
			return { zenith, horizon, sunlight };
		},
		// Every frame, after the light and the weather: e the sun's height (-1…1), sunDir the true
		// direction to the sun (below the horizon too), moonDir, haze 0…1 (weather), hazeColor, cover 0…1.
		update({ camera, time, e, sunDir, moonDir, zenith: z, horizon: h, sunlight: sl, haze = 0, hazeColor, cover = 0.4, flash = 0, flashColor }) {
			mesh.position.copy(camera.position);
			mesh.scale.setScalar(camera.far * 0.9);
			uniforms.zenith.value.copy(z);
			uniforms.horizon.value.copy(h);
			if (hazeColor && haze > 0) {
				uniforms.zenith.value.lerp(hazeColor, haze * 0.7);
				uniforms.horizon.value.lerp(hazeColor, haze * 0.8);
			}
			if (flash > 0 && flashColor) {
				uniforms.zenith.value.lerp(flashColor, flash * 0.45);
				uniforms.horizon.value.lerp(flashColor, flash * 0.45);
			}
			uniforms.sunColor.value.copy(sl);
			uniforms.sunDir.value.copy(sunDir);
			uniforms.moonDir.value.copy(moonDir);
			const clear = 1 - Math.min(1, haze * 1.2);
			uniforms.sunVis.value = Math.max(0, Math.min(1, (e + 0.06) / 0.08)) * (1 - haze * 0.8);
			uniforms.moonVis.value = Math.max(0, Math.min(1, -e / 0.12)) * clear;
			uniforms.starVis.value = Math.max(0, Math.min(1, (-e - 0.05) / 0.2)) * clear;
			uniforms.cover.value = Math.min(1, cover + haze * 0.6);
			uniforms.cloudLight.value.copy(MOONLIT).lerp(WHITE, Math.max(0, Math.min(1, (e + 0.1) / 0.3)));
			uniforms.skyTime.value = time;
		},
		// Cloud drift and the shadow they cast (0 none … 1 dark).
		clouds(time, shadow) {
			SKY_CLOUDS.cloudOffset.value[0] = time * 0.0042;
			SKY_CLOUDS.cloudOffset.value[1] = time * 0.0017;
			SKY_CLOUDS.cloudAmount.value = shadow;
		},
	};
}
