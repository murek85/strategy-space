/* Deep space under and around the orbital battle (0.133, maps with space: true). The plane of the battle is
   see-through there (three-renderer.js keeps only the fog of war and the interface on it), and below it:
   - the gas giant Kharon far beneath the battle: a shader of turbulent cloud bands, storm vortices and a
     great storm, a soft terminator with a dark night side, a glowing limb, and an atmosphere halo shell;
   - its rings: bands and gaps of ice and dust, lit by the sun, with the planet's shadow across them;
   - a cratered moon;
   - the sky all round (also below the horizon): three layers of stars with twinkling, the band of the
     Milky Way with dust lanes, coloured nebulae, the sun's disc and corona;
   - an anamorphic lens streak through the sun when it is in view.
   Everything is parallax: the planet is thousands of units below the battle, so it slides slowly under
   it as the camera moves. All procedural (no textures).
   Readability (0.156): the scenery is kept quieter than the battle — CALM dims the planet, its halo and
   rings, the black hole, the Milky Way, the nebulae and the sun's glow; the rocks of the deep field lie
   deeper and half see-through; a dark veil with soft edges lies just under the plane of the battle, so ships
   and stations stand out against any backdrop. */
const SPACE_NOISE = `
	float sHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
	float sNoise(vec3 x) {
		vec3 i = floor(x), f = fract(x);
		f = f * f * (3.0 - 2.0 * f);
		return mix(mix(mix(sHash(i), sHash(i + vec3(1, 0, 0)), f.x), mix(sHash(i + vec3(0, 1, 0)), sHash(i + vec3(1, 1, 0)), f.x), f.y),
			mix(mix(sHash(i + vec3(0, 0, 1)), sHash(i + vec3(1, 0, 1)), f.x), mix(sHash(i + vec3(0, 1, 1)), sHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
	}
	float sFbm(vec3 p) {
		float v = 0.0, a = 0.5;
		for (int i = 0; i < 5; i++) { v += a * sNoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
		return v;
	}
`;

export function createSpace3D(THREE) {
	// How bright the scenery is next to the battle (1 = as painted before 0.156).
	const CALM = { planet: 0.55, halo: 0.45, rings: 0.5, blackHole: 0.6, milkyWay: 0.55, nebula: 0.5, sunGlow: 0.4, veil: 0.5 };
	const group = new THREE.Group();
	group.visible = false;
	const sunDir = new THREE.Vector3(-0.6, 0.6, 0.5).normalize(),
		// The planet, its rings and the moon are lit from behind (artistic licence, the planet is far): the
		// face towards the battle lies in night, a bright crescent burns along the far limb — the board
		// floats over a dark world and stays readable.
		backLight = new THREE.Vector3(0.5, -0.2, -0.84).normalize();

	// ---- the sky sphere: stars, Milky Way, nebulae, the sun (follows the camera, behind everything) ----
	const skyUniforms = { sunDir: { value: sunDir }, time: { value: 0 }, neb1a: { value: new THREE.Color(0.4, 0.07, 0.3) }, neb1b: { value: new THREE.Color(0.85, 0.3, 0.42) }, neb2a: { value: new THREE.Color(0.04, 0.18, 0.38) }, neb2b: { value: new THREE.Color(0.18, 0.65, 0.8) } };
	const sky = new THREE.Mesh(
		new THREE.SphereGeometry(1, 64, 32),
		new THREE.ShaderMaterial({
			uniforms: skyUniforms,
			vertexShader: `varying vec3 vDir;
				void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
			fragmentShader: `varying vec3 vDir; uniform vec3 sunDir; uniform float time; uniform vec3 neb1a; uniform vec3 neb1b; uniform vec3 neb2a; uniform vec3 neb2b;
				${SPACE_NOISE}
				vec3 hash3(vec3 p) { return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }
				// A layer of stars: one candidate per cell of a 3D grid on the direction.
				float stars(vec3 d, float scale, float density, float size) {
					vec3 p = d * scale, c = floor(p), f = fract(p);
					vec3 h = hash3(c);
					float on = step(1.0 - density, h.x);
					float r = length(f - (0.2 + h * 0.6));
					float tw = 0.75 + 0.25 * sin(time * (1.0 + h.y * 3.0) + h.z * 40.0);
					return on * smoothstep(size, 0.0, r) * (0.4 + h.y * 0.9) * tw;
				}
				void main() {
					vec3 d = normalize(vDir);
					vec3 col = vec3(0.004, 0.006, 0.014);
					// The Milky Way: a band round a tilted great circle, bright knots and dark dust lanes.
					vec3 axis = normalize(vec3(0.35, 0.82, -0.45));
					float lat = dot(d, axis);
					float band = exp(-lat * lat / 0.028);
					float glow = sFbm(d * 3.5) , lanes = smoothstep(0.45, 0.75, sFbm(d * 7.0 + 4.0));
					col += band * (vec3(0.16, 0.15, 0.2) * (0.5 + glow) + vec3(0.12, 0.09, 0.07) * pow(glow, 3.0) * 2.0) * (1.0 - 0.75 * lanes * band) * ${CALM.milkyWay.toFixed(2)};
					col += exp(-lat * lat / 0.2) * vec3(0.02, 0.025, 0.04);
					// Nebulae: two coloured clouds in their own parts of the sky.
					float n1 = smoothstep(0.5, 0.85, sFbm(d * 2.2 + vec3(3.0, 1.0, 7.0))) * smoothstep(0.2, 0.9, dot(d, normalize(vec3(-0.6, -0.3, -0.75))));
					float n2 = smoothstep(0.52, 0.86, sFbm(d * 2.6 + vec3(9.0, 4.0, 2.0))) * smoothstep(0.1, 0.9, dot(d, normalize(vec3(0.7, -0.2, 0.68))));
					float fil = sFbm(d * 9.0);
					col += n1 * mix(neb1a, neb1b, fil) * ${(0.28 * CALM.nebula).toFixed(3)};
					col += n2 * mix(neb2a, neb2b, fil) * ${(0.28 * CALM.nebula).toFixed(3)};
					// Stars: many faint, fewer bright, a few big; tinted by a hash.
					float s = stars(d, 180.0, 0.35, 0.09) * 0.5 + stars(d, 90.0, 0.18, 0.08) + stars(d, 34.0, 0.08, 0.06) * 2.2;
					s *= 1.0 + band * 1.5;
					vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.86, 0.7), sHash(floor(d * 90.0)));
					col += s * tint;
					// The sun: a white disc, a corona and a wide glow.
					float sd = max(0.0, dot(d, sunDir));
					col += vec3(1.0, 0.96, 0.9) * smoothstep(0.99955, 0.9997, sd) * 30.0;
					col += (vec3(1.0, 0.82, 0.6) * pow(sd, 900.0) * 3.0 + vec3(0.9, 0.7, 0.5) * pow(sd, 40.0) * 0.18) * ${CALM.sunGlow.toFixed(2)};
					gl_FragColor = vec4(col, 1.0);
					#include <colorspace_fragment>
				}`,
			side: THREE.BackSide,
			depthWrite: false,
			fog: false,
		}),
	);
	sky.renderOrder = -1000;
	sky.frustumCulled = false;
	group.add(sky);

	// ---- the gas giant ----
	// The light on the planet, its rings and moon (backLight by default; per map in setGame).
	const planetLight = backLight.clone(),
		ICE_LIGHT = new THREE.Vector3(-0.65, 0.2, 0.45).normalize();
	const planetUniforms = {
		sunDir: { value: planetLight },
		time: { value: 0 },
		radius: { value: 1 },
		// Kind (0 gas giant, 1 ice giant, 2 volcanic moon), its four colours, the contrast of its bands and
		// the colour of its limb (0.143).
		kind: { value: 0 },
		c0: { value: new THREE.Color(0.33, 0.2, 0.14) },
		c1: { value: new THREE.Color(0.55, 0.3, 0.18) },
		c2: { value: new THREE.Color(0.78, 0.55, 0.33) },
		c3: { value: new THREE.Color(0.93, 0.83, 0.66) },
		bandAmp: { value: 1 },
		atmo: { value: new THREE.Color(0.45, 0.7, 1.0) },
	};
	const planet = new THREE.Mesh(
		new THREE.SphereGeometry(1, 160, 96),
		new THREE.ShaderMaterial({
			uniforms: planetUniforms,
			vertexShader: `varying vec3 vObj; varying vec3 vNormal; varying vec3 vWorld;
				void main() {
					vObj = position;
					vNormal = normalize(mat3(modelMatrix) * normal);
					vec4 w = modelMatrix * vec4(position, 1.0);
					vWorld = w.xyz;
					gl_Position = projectionMatrix * viewMatrix * w;
				}`,
			fragmentShader: `varying vec3 vObj; varying vec3 vNormal; varying vec3 vWorld; uniform vec3 sunDir; uniform float time;
				uniform float kind; uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform float bandAmp; uniform vec3 atmo;
				${SPACE_NOISE}
				void main() {
					vec3 p = normalize(vObj);
					float lat = p.y;
					// Jets (0.144.1): each band of the gas giant drifts at its own speed, its neighbours the other
					// way, so the eddies and the great storm travel along them and shear at the band edges.
					if (kind < 0.5) {
						float ang = time * ((smoothstep(-0.35, 0.35, sin(lat * 7.0)) - 0.5) * 0.02 + 0.006);
						p = vec3(cos(ang) * p.x - sin(ang) * p.z, p.y, sin(ang) * p.x + cos(ang) * p.z);
					}
					// Bands warped by turbulence; slow drift of the jets.
					float turb = sFbm(p * 6.0 + vec3(0.0, 0.0, time * 0.004));
					float wob = sFbm(vec3(p.x * 2.0, lat * 18.0, p.z * 2.0) + time * 0.002);
					float b = lat * 9.0 + turb * 1.4 + wob * 0.8;
					float bands = 0.5 + (0.5 * sin(b * 3.1) * 0.7 + 0.5 * sin(b * 7.3 + 1.3) * 0.3) * bandAmp;
					vec3 cream = c3, ochre = c2, rust = c1, umber = c0;
					vec3 col = mix(mix(umber, rust, smoothstep(0.1, 0.4, bands)), mix(ochre, cream, smoothstep(0.6, 0.9, bands)), smoothstep(0.3, 0.7, bands));
					// Fine streaks along the bands.
					col *= 0.85 + 0.3 * sFbm(vec3(p.x * 30.0, lat * 160.0, p.z * 30.0));
					// Small storm eddies, and the great storm: a red oval with a swirl.
					float eddies = smoothstep(0.72, 0.9, sFbm(p * 14.0 + 3.0)) * (0.5 + 0.5 * sin(lat * 40.0));
					col = mix(col, vec3(0.98, 0.93, 0.85), eddies * 0.5);
					vec3 c = normalize(vec3(0.55, -0.22, 0.8));
					vec3 q = p - c;
					float spot = length(vec2(dot(q, normalize(cross(c, vec3(0, 1, 0)))) * 0.75, q.y * 1.6));
					float swirl = sin(atan(q.y, dot(q, normalize(cross(c, vec3(0, 1, 0))))) * 3.0 + spot * 40.0 - time * 0.05);
					if (kind < 0.5) col = mix(col, mix(vec3(0.72, 0.28, 0.16), vec3(0.95, 0.6, 0.42), 0.5 + 0.5 * swirl), smoothstep(0.16, 0.06, spot) * step(0.0, dot(p, c)));
					// Ice giant: soft bands under high white haze, bright polar caps.
					// Ice giant (0.143.3, Uranus and Neptune): its pole turned towards the battle — soft haze bands
					// round it, a bright polar hood with a collar of cloud, white methane clouds drawn out along
					// the bands, a dark storm with bright clouds riding its edge.
					if (kind > 0.5 && kind < 1.5) {
						col = mix(col, vec3(0.82, 0.95, 1.0), smoothstep(0.62, 0.92, lat) * 0.55);
						col = mix(col, vec3(0.9, 0.98, 1.0), exp(-pow((lat - 0.55) / 0.035, 2.0)) * 0.4);
						float lon = atan(p.z, p.x);
						float streaks = smoothstep(0.68, 0.84, sFbm(vec3(lon * 3.0 + time * 0.01, lat * 46.0, 1.0)));
						col = mix(col, vec3(0.96, 1.0, 1.0), streaks * 0.65 * smoothstep(0.75, 0.1, abs(lat)));
						// The dark storm drifts round the planet with its band (0.144.1).
						float ia = time * 0.012;
						vec3 sc = normalize(vec3(0.75 * cos(ia) - 0.6 * sin(ia), 0.25, 0.75 * sin(ia) + 0.6 * cos(ia))), sq = p - sc;
						float sd = length(vec2(dot(sq, normalize(cross(sc, vec3(0, 1, 0)))) * 0.7, sq.y * 1.5));
						float side = step(0.0, dot(p, sc));
						col = mix(col, vec3(0.06, 0.2, 0.42), smoothstep(0.11, 0.05, sd) * side);
						col = mix(col, vec3(0.95, 1.0, 1.0), exp(-pow((sd - 0.125) / 0.012, 2.0)) * smoothstep(0.0, 0.05, sq.y) * side * 0.8);
					}
					// Volcanic moon: dark crust in plates, no bands.
					float cracks = 0.0;
					if (kind > 1.5) {
						// Volcanic moon (0.143.4, like Io): dark basalt and plains of sulphur, yellow and ochre, pale
						// patches of frost; calderas — black rims round glowing lakes of lava; a few long lava flows
						// in some regions only. The lava glows on the day side too, brightest at night.
						float crust = sFbm(p * 4.0);
						float sulphur = smoothstep(0.42, 0.62, sFbm(p * 2.6 + 5.0));
						col = mix(c0, c1, smoothstep(0.3, 0.7, crust));
						col = mix(col, mix(vec3(0.5, 0.24, 0.04), vec3(0.78, 0.55, 0.1), sFbm(p * 9.0)), sulphur * 0.85);
						col = mix(col, vec3(0.7, 0.66, 0.55), smoothstep(0.72, 0.86, sFbm(p * 6.0 + 2.0)) * 0.3);
						col *= (0.75 + 0.5 * sFbm(p * 24.0)) * 0.32;
						float lakeN = sFbm(p * 3.2 + 17.0);
						float lake = smoothstep(0.65, 0.69, lakeN);
						float rim = smoothstep(0.58, 0.65, lakeN) * (1.0 - lake);
						col = mix(col, vec3(0.05, 0.03, 0.03), clamp(rim * 0.85 + lake, 0.0, 1.0));
						float vein = abs(sFbm(p * 5.0 + 11.0) - 0.5);
						float region = smoothstep(0.5, 0.62, sFbm(p * 1.8 + 3.0));
						col = mix(col, vec3(0.08, 0.04, 0.03), smoothstep(0.03, 0.0, vein) * region * 0.7);
						cracks = lake * (0.7 + 0.3 * sFbm(p * 30.0 + time * 0.05)) + smoothstep(0.012, 0.0, vein) * region * 0.7;
						cracks *= 0.85 + 0.15 * sin(time * 0.7 + lakeN * 30.0);
						// Eruptions (0.144.1): lake after lake flares up white-hot for a moment, the ground round it
						// glowing too.
						float erupt = pow(max(0.0, sin(time * 0.45 + lakeN * 53.0)), 14.0);
						cracks += (lake * 2.2 + rim * 0.6) * erupt;
					}
					// Light: a soft terminator, a dim blue night side; the limb glows and scatters the light.
					vec3 n = normalize(vNormal), v = normalize(cameraPosition - vWorld);
					float ndl = dot(n, sunDir);
					float day = smoothstep(-0.18, 0.45, ndl);
					// The night side keeps a faint trace of its bands (light from the rings and the moon).
					vec3 lit = col * (0.07 + 1.3 * day) + vec3(0.012, 0.018, 0.04) * (1.0 - day);
					// Lightning deep in the night side's storms: brief flashes in a few cells.
					vec3 cell = floor(p * 26.0);
					float flash = step(0.996, sHash(cell + floor(time * 2.5))) * (0.5 + 0.5 * sin(time * 40.0 + sHash(cell) * 9.0));
					float spotL = smoothstep(0.5, 0.0, length(fract(p * 26.0) - 0.5));
					lit += vec3(0.55, 0.65, 1.0) * flash * spotL * (1.0 - day) * 0.8 * (1.0 - step(1.5, kind));
					// Aurorae: curtains of green and violet round the poles, rippling, on the night side.
					float polar = smoothstep(0.72, 0.84, abs(lat)) * smoothstep(0.97, 0.88, abs(lat));
					float curtain = 0.5 + 0.5 * sin(atan(p.z, p.x) * 22.0 + sFbm(p * 8.0 + time * 0.03) * 6.0 + time * 0.2);
					// Seen only edge-on, near the limb (the curtains rise above the clouds).
					float edgeOn = pow(1.0 - max(0.0, dot(normalize(vNormal), normalize(cameraPosition - vWorld))), 3.0);
					lit += mix(vec3(0.15, 1.0, 0.55), vec3(0.6, 0.3, 1.0), smoothstep(0.82, 0.93, abs(lat))) * polar * curtain * (1.0 - day) * edgeOn * 0.35 * (1.0 - step(1.5, kind));
					// Lava glowing in the cracks of the volcanic moon, brightest on its night side.
					lit += mix(c3, c2, 0.5) * cracks * (1.2 - day * 0.75);
					float fres = pow(1.0 - max(0.0, dot(n, v)), 3.0);
					lit += atmo * fres * (0.05 + 1.2 * smoothstep(-0.25, 0.4, ndl));
					// Twilight band: warm scattering along the terminator.
					lit += vec3(1.0, 0.45, 0.2) * exp(-ndl * ndl / 0.01) * 0.25;
					gl_FragColor = vec4(lit * ${CALM.planet.toFixed(2)}, 1.0);
					#include <colorspace_fragment>
				}`,
			fog: false,
		}),
	);
	group.add(planet);
	// The atmosphere halo: a slightly bigger shell, seen from inside out, glowing at the edge on the day side.
	const halo = new THREE.Mesh(
		new THREE.SphereGeometry(1.045, 96, 64),
		new THREE.ShaderMaterial({
			uniforms: { sunDir: { value: planetLight }, haloColor: planetUniforms.atmo },
			vertexShader: `varying vec3 vNormal; varying vec3 vWorld;
				void main() { vNormal = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
			fragmentShader: `varying vec3 vNormal; varying vec3 vWorld; uniform vec3 sunDir; uniform vec3 haloColor;
				void main() {
					vec3 n = normalize(vNormal), v = normalize(cameraPosition - vWorld);
					float rim = pow(1.0 - abs(dot(n, v)), 5.0);
					float lit = smoothstep(-0.35, 0.5, dot(n, sunDir));
					gl_FragColor = vec4(haloColor * ${(0.8 * CALM.halo).toFixed(2)} * rim * (0.2 + 1.6 * lit), rim);
				}`,
			side: THREE.BackSide,
			transparent: true,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			fog: false,
		}),
	);
	planet.add(halo);

	// ---- the rings ----
	const RING_IN = 1.3,
		RING_OUT = 2.05;
	const ringGeo = new THREE.RingGeometry(RING_IN, RING_OUT, 256, 1);
	ringGeo.rotateX(-Math.PI / 2);
	const ringUniforms = { sunDir: { value: planetLight }, planetCentre: { value: new THREE.Vector3() }, planetRadius: { value: 1 }, ringA: { value: new THREE.Color(0.62, 0.55, 0.47) }, ringB: { value: new THREE.Color(0.95, 0.9, 0.82) }, ringAlpha: { value: 0.6 } };
	const rings = new THREE.Mesh(
		ringGeo,
		new THREE.ShaderMaterial({
			uniforms: ringUniforms,
			vertexShader: `varying vec3 vLocal; varying vec3 vWorld;
				void main() { vLocal = position; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
			fragmentShader: `varying vec3 vLocal; varying vec3 vWorld; uniform vec3 sunDir; uniform vec3 planetCentre; uniform float planetRadius; uniform vec3 ringA; uniform vec3 ringB; uniform float ringAlpha;
				${SPACE_NOISE}
				void main() {
					float r = length(vLocal.xz);
					float t = (r - ${RING_IN.toFixed(2)}) / ${(RING_OUT - RING_IN).toFixed(2)};
					// Bands and gaps: layered ripples, a wide dark gap, thin bright ringlets.
					// Ripples finer than a pixel fade out (no shimmer when the rings are small on screen).
					float px = fwidth(r);
					float fine = 1.0 - smoothstep(0.004, 0.012, px), mid = 1.0 - smoothstep(0.01, 0.03, px);
					float d = 0.55 + 0.25 * sin(r * 160.0) * fine + 0.2 * sin(r * 61.0 + 1.0) * mid + 0.25 * (sNoise(vec3(r * 90.0, 0.0, 0.0)) - 0.5) * fine;
					d *= smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.85, t);
					d *= 1.0 - 0.9 * smoothstep(0.035, 0.0, abs(t - 0.58));
					d *= 1.0 - 0.6 * smoothstep(0.02, 0.0, abs(t - 0.22));
					d += smoothstep(0.006, 0.0, abs(t - 0.74)) * 0.6;
					vec3 col = mix(ringA, ringB, sNoise(vec3(r * 40.0, 2.0, 0.0)));
					// The planet's shadow: does the way to the sun pass through the planet?
					vec3 o = vWorld - planetCentre;
					float bb = dot(o, sunDir), cc = dot(o, o) - planetRadius * planetRadius;
					float shadow = (bb < 0.0 && bb * bb - cc > 0.0) ? 0.08 : 1.0;
					gl_FragColor = vec4(col * (0.25 + 1.0 * shadow) * ${CALM.rings.toFixed(2)}, clamp(d, 0.0, 1.0) * ringAlpha * ${(0.5 + CALM.rings * 0.5).toFixed(2)});
					#include <colorspace_fragment>
				}`,
			side: THREE.DoubleSide,
			transparent: true,
			depthWrite: false,
			fog: false,
		}),
	);
	group.add(rings);

	// ---- the black hole (0.143, the map "Wrota Pustki"; 0.143.2 Gargantua as in Interstellar): one
	// picture facing the camera, drawn whole in a shader so it reads right from every angle — the black
	// shadow of the horizon, a thin photon ring hugging it, the accretion disk seen almost edge-on as a
	// bright band across the shadow, and the image of the disk's far side bent by gravity into a halo
	// over the top (wide) and under the bottom (thin). The disk swirls, white-hot inside, deep red outside,
	// brighter on the side turning towards the camera (Doppler); the stars behind are lensed into a ring.
	// Units: the horizon's shadow has radius 1, the picture spans ±7. ----
	let openRings = false,
		ringsAligned = false;
	const blackHole = new THREE.Group();
	blackHole.visible = false;
	const holeUniforms = { time: skyUniforms.time };
	{
		const picture = new THREE.Mesh(
			new THREE.PlaneGeometry(14, 14),
			new THREE.ShaderMaterial({
				uniforms: holeUniforms,
				vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
				fragmentShader: `varying vec2 vP; uniform float time;
					${SPACE_NOISE}
					// Colour of the gas by heat: deep red, orange, gold, white.
					vec3 heatCol(float h) {
						vec3 c = mix(vec3(0.28, 0.02, 0.0), vec3(0.95, 0.28, 0.04), smoothstep(0.0, 0.5, h));
						c = mix(c, vec3(1.0, 0.62, 0.22), smoothstep(0.5, 0.85, h));
						return mix(c, vec3(1.0, 0.9, 0.7), smoothstep(0.93, 1.0, h));
					}
					// The disk at radius rd (horizon radii) and angle a: brightness, and its heat.
					float diskAt(float rd, float a, out float heat) {
						float t = (rd - 1.55) / (5.8 - 1.55);
						float spin = a - time * 0.25 / max(rd, 1.0);
						float sw = sFbm(vec3(cos(spin) * rd * 1.7, sin(spin) * rd * 1.7, rd * 2.4));
						float lanes = 0.78 + 0.22 * sin(rd * 13.0 + sw * 7.0);
						heat = clamp(0.95 - t * 1.1 + (sw - 0.5) * 0.4, 0.0, 1.0);
						return smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.4, t) * (0.5 + 0.5 * sw) * lanes;
					}
					void main() {
						vec2 p = vP;
						float r = length(p);
						float shadow = 1.0 - smoothstep(0.97, 1.0, r);
						vec3 col = vec3(0.0);
						// The far side of the disk, bent over the top and under the bottom of the shadow.
						float up = p.y / max(r, 0.001);
						float band = mix(0.16, 1.0, smoothstep(-0.5, 0.9, up));
						float u = (r - 1.05) / band;
						if (u > 0.0 && u < 1.0) {
							float h;
							float d = diskAt(1.55 + u * 4.2, atan(p.y, p.x) * 1.3 + 2.0, h);
							float dop = 1.0 + 0.5 * (-p.x / r);
							col += heatCol(h) * d * (0.45 + 1.5 * h * h) * dop * smoothstep(0.0, 0.1, u) * (1.0 - u * 0.6);
						}
						// The photon ring: a thin, sharp line of light just outside the shadow.
						col += vec3(1.0, 0.78, 0.5) * exp(-pow((r - 1.025) / 0.014, 2.0)) * 1.3;
						// The disk itself, almost edge-on; its far half (above the middle) hides behind the shadow,
						// its near half crosses in front of it.
						vec2 q = vec2(p.x, p.y / 0.075);
						float rd = length(q), hd;
						float dd = diskAt(rd, atan(q.y, q.x), hd);
						float front = step(p.y, 0.0);
						float seen = max(front, 1.0 - shadow);
						float dopD = 1.0 + 0.6 * (-q.x / max(rd, 0.001));
						vec3 disk = heatCol(hd) * dd * (0.45 + 1.7 * hd * hd) * dopD * seen;
						float cover = clamp(dd * 1.6, 0.0, 1.0) * front;
						col = col * (1.0 - cover * shadow) + disk;
						// A warm haze round it all, and the stars behind bent into a faint ring (the Einstein ring).
						col += vec3(1.0, 0.36, 0.1) * 0.08 * exp(-max(r - 1.0, 0.0) * 0.8) * (1.0 - shadow);
						float ring = exp(-pow((r - 2.6) / 0.5, 2.0)) * step(0.985, sHash(vec3(floor(vec2(atan(p.y, p.x) * 60.0, r * 18.0)), 3.0)));
						col += vec3(0.75, 0.82, 1.0) * ring * 0.6;
						// Fade the edge of the picture.
						col *= smoothstep(7.0, 5.5, r);
						// Premultiplied: the shadow blocks what lies behind, the light adds.
						gl_FragColor = vec4(col * ${CALM.blackHole.toFixed(2)}, shadow * (1.0 - cover));
					}`,
				transparent: true,
				blending: THREE.CustomBlending,
				blendSrc: THREE.OneFactor,
				blendDst: THREE.OneMinusSrcAlphaFactor,
				depthWrite: false,
				fog: false,
			}),
		);
		blackHole.add(picture);
		blackHole.userData.picture = picture;
	}
	group.add(blackHole);

	// ---- a moon: grey, cratered, lit like the planet ----
	const moon = new THREE.Mesh(
		new THREE.SphereGeometry(1, 64, 48),
		new THREE.ShaderMaterial({
			uniforms: { sunDir: { value: backLight } },
			vertexShader: `varying vec3 vObj; varying vec3 vNormal;
				void main() { vObj = position; vNormal = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
			fragmentShader: `varying vec3 vObj; varying vec3 vNormal; uniform vec3 sunDir;
				${SPACE_NOISE}
				void main() {
					vec3 p = normalize(vObj);
					float g = sFbm(p * 5.0), craters = smoothstep(0.62, 0.7, sNoise(p * 18.0)) - smoothstep(0.7, 0.78, sNoise(p * 18.0));
					vec3 col = vec3(0.55, 0.53, 0.5) * (0.7 + 0.5 * g) - craters * 0.12;
					float day = smoothstep(-0.05, 0.35, dot(normalize(vNormal), sunDir));
					gl_FragColor = vec4(col * (0.02 + 1.1 * day), 1.0);
					#include <colorspace_fragment>
				}`,
			fog: false,
		}),
	);
	group.add(moon);

	// ---- the lens streak through the sun (screen-aligned sprite, additive) ----
	const streakCanvas = document.createElement("canvas");
	streakCanvas.width = 256;
	streakCanvas.height = 32;
	{
		const c = streakCanvas.getContext("2d"),
			g = c.createLinearGradient(0, 0, 256, 0);
		g.addColorStop(0, "rgba(120,170,255,0)");
		g.addColorStop(0.5, "rgba(200,225,255,1)");
		g.addColorStop(1, "rgba(120,170,255,0)");
		c.fillStyle = g;
		c.fillRect(0, 0, 256, 32);
		const v = c.createLinearGradient(0, 0, 0, 32);
		v.addColorStop(0, "rgba(0,0,0,1)");
		v.addColorStop(0.5, "rgba(0,0,0,0)");
		v.addColorStop(1, "rgba(0,0,0,1)");
		c.globalCompositeOperation = "destination-out";
		c.fillStyle = v;
		c.fillRect(0, 0, 256, 32);
	}
	const streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(streakCanvas), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, opacity: 0.55 }));
	streak.renderOrder = 2000;
	group.add(streak);

	// ---- depth and scale (0.134): what lies between the battle and the planet ----
	// Depth haze: things below the plane of the battle turn bluer and dimmer the deeper they are.
	const HAZE = new THREE.Color("#0a1430");
	const hazed = (material) => {
		material.onBeforeCompile = (shader) => {
			shader.uniforms.hazeColor = { value: HAZE };
			shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying float vDepthY;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvec4 hazeWorld = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nhazeWorld = instanceMatrix * hazeWorld;\n#endif\nvDepthY = (modelMatrix * hazeWorld).y;");
			shader.fragmentShader = shader.fragmentShader
				.replace("#include <common>", "#include <common>\nvarying float vDepthY;\nuniform vec3 hazeColor;")
				.replace("#include <dithering_fragment>", "#include <dithering_fragment>\nfloat hz = clamp(0.25 - vDepthY / 3200.0, 0.0, 0.88);\ngl_FragColor.rgb = mix(gl_FragColor.rgb, hazeColor, hz);");
		};
		return material;
	};
	let seed = 1;
	const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
	// A rough rock: an icosphere with its vertices pushed in and out.
	const rockGeo = (() => {
		const g = new THREE.IcosahedronGeometry(1, 2),
			p = g.attributes.position,
			v = new THREE.Vector3();
		for (let i = 0; i < p.count; i++) {
			v.fromBufferAttribute(p, i);
			const k = 0.75 + 0.35 * (Math.sin(v.x * 3.1 + 1.7) * Math.sin(v.y * 2.7 + 0.4) * Math.sin(v.z * 3.7 + 2.2) * 0.5 + 0.5) + 0.12 * Math.sin(v.x * 9 + v.z * 7);
			v.multiplyScalar(k);
			v.y *= 0.8;
			p.setXYZ(i, v.x, v.y, v.z);
		}
		g.computeVertexNormals();
		return g;
	})();
	const deep = new THREE.Group();
	group.add(deep);
	// The deep asteroid field: rocks at many depths under the battle, tumbling slowly.
	const DEBRIS = 420;
	// (Half see-through: dark rocks seen past the units read as obstacles on the board — 0.156.)
	const debris = new THREE.InstancedMesh(rockGeo, hazed(new THREE.MeshStandardMaterial({ color: "#77706a", roughness: 0.95, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.5, depthWrite: false })), DEBRIS);
	debris.frustumCulled = false;
	deep.add(debris);
	const rocks = [];
	// Ice and dust specks between them.
	const specksGeo = new THREE.BufferGeometry(),
		specks = new THREE.Points(specksGeo, new THREE.PointsMaterial({ color: "#a9bcd6", size: 5, sizeAttenuation: true, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
	deep.add(specks);
	// Distant convoys: lines of small ships low over the planet, with engine glows and blinking lights.
	const CONVOY_SHIPS = 18;
	const hullGeo = new THREE.CylinderGeometry(0.25, 1, 6, 6).rotateZ(-Math.PI / 2);
	const convoyShips = new THREE.InstancedMesh(hullGeo, hazed(new THREE.MeshStandardMaterial({ color: "#8f979c", roughness: 0.5, metalness: 0.6, flatShading: true })), CONVOY_SHIPS);
	convoyShips.frustumCulled = false;
	deep.add(convoyShips);
	const glowGeo = new THREE.BufferGeometry(),
		glowPos = new Float32Array(CONVOY_SHIPS * 2 * 3),
		glowCol = new Float32Array(CONVOY_SHIPS * 2 * 3);
	glowGeo.setAttribute("position", new THREE.BufferAttribute(glowPos, 3));
	glowGeo.setAttribute("color", new THREE.BufferAttribute(glowCol, 3));
	const glowDot = (() => {
		const c = document.createElement("canvas");
		c.width = c.height = 64;
		const x = c.getContext("2d"),
			g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
		g.addColorStop(0, "rgba(255,255,255,1)");
		g.addColorStop(0.3, "rgba(255,255,255,.5)");
		g.addColorStop(1, "rgba(255,255,255,0)");
		x.fillStyle = g;
		x.fillRect(0, 0, 64, 64);
		return new THREE.CanvasTexture(c);
	})();
	const glows = new THREE.Points(glowGeo, new THREE.PointsMaterial({ map: glowDot, size: 16, vertexColors: true, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
	glows.frustumCulled = false;
	deep.add(glows);
	let convoys = [];
	const m4 = new THREE.Matrix4(),
		q4 = new THREE.Quaternion(),
		e4 = new THREE.Euler(),
		s4 = new THREE.Vector3(),
		p4 = new THREE.Vector3();
	function buildDeep(game) {
		seed = 90210;
		const W = game.W,
			H = game.H;
		rocks.length = 0;
		for (let i = 0; i < DEBRIS; i++) {
			// Deep enough not to be mistaken for the asteroid fields of the battle; the deeper the bigger
			// (so they still show), a few big ones.
			const depth = 1400 + Math.pow(rnd(), 1.2) * 3600,
				size = (3 + rnd() * 9) * (1 + depth / 600) * (rnd() < 0.05 ? 2.5 : 1);
			rocks.push({ x: -W * 0.6 + rnd() * W * 2.2, y: -depth, z: -H * 0.9 + rnd() * H * 2.8, s: size, sy: 0.6 + rnd() * 0.5, rx: rnd() * 6, ry: rnd() * 6, spin: (rnd() - 0.5) * 0.12 });
		}
		const count = 1800,
			pos = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) pos.set([-W * 0.5 + rnd() * W * 2, -(300 + Math.pow(rnd(), 1.3) * 2800), -H * 0.8 + rnd() * H * 2.6], i * 3);
		specksGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
		// Three convoys on long straight lanes, each a file of ships.
		convoys = [
			{ from: [-W * 1.2, -1700, -H * 0.4], to: [W * 2.2, -1900, H * 0.3], n: 7, speed: 70, size: 7, gap: 90 },
			{ from: [W * 2.4, -2600, H * 1.6], to: [-W * 1.4, -2300, H * 0.6], n: 6, speed: 55, size: 9, gap: 120 },
			{ from: [W * 0.2, -1100, H * 2.8], to: [W * 0.9, -1300, -H * 1.6], n: 5, speed: 85, size: 5, gap: 70 },
		].map((c, i) => {
			const a = new THREE.Vector3(...c.from),
				b = new THREE.Vector3(...c.to),
				dir = b.clone().sub(a);
			return { ...c, a, len: dir.length(), dir: dir.normalize(), phase: i * 0.37 };
		});
	}
	function updateDeep(time) {
		for (let i = 0; i < rocks.length; i++) {
			const r = rocks[i];
			e4.set(r.rx + time * r.spin, r.ry + time * r.spin * 0.7, 0);
			q4.setFromEuler(e4);
			debris.setMatrixAt(i, m4.compose(p4.set(r.x, r.y, r.z), q4, s4.set(r.s, r.s * r.sy, r.s)));
		}
		debris.instanceMatrix.needsUpdate = true;
		let k = 0;
		for (const c of convoys) {
			const yaw = Math.atan2(-c.dir.z, c.dir.x);
			for (let j = 0; j < c.n && k < CONVOY_SHIPS; j++, k++) {
				const t = ((time * c.speed - j * c.gap) / c.len + c.phase) % 1,
					u = t < 0 ? t + 1 : t;
				p4.copy(c.a).addScaledVector(c.dir, u * c.len);
				p4.z += Math.sin(j * 2.1) * c.gap * 0.4;
				q4.setFromEuler(e4.set(0, yaw, Math.sin(time * 0.5 + j) * 0.05));
				convoyShips.setMatrixAt(k, m4.compose(p4, q4, s4.setScalar(c.size)));
				// Engine glow behind, a blinking light on top.
				const tail = p4.clone().addScaledVector(c.dir, -c.size * 3.4);
				glowPos.set([tail.x, tail.y, tail.z], k * 6);
				glowCol.set([0.3, 0.5, 0.7], k * 6);
				glowPos.set([p4.x, p4.y + c.size, p4.z], k * 6 + 3);
				const blink = (time * 0.9 + j * 0.31 + c.phase) % 1 < 0.12 ? 1 : 0;
				glowCol.set([blink, blink * 0.25, blink * 0.2], k * 6 + 3);
			}
		}
		convoyShips.count = k;
		convoyShips.instanceMatrix.needsUpdate = true;
		glowGeo.setDrawRange(0, k * 2);
		glowGeo.attributes.position.needsUpdate = true;
		glowGeo.attributes.color.needsUpdate = true;
	}

	// ---- ring particles (0.137): ice and dust glinting in the ring plane ----
	const ringDust = (() => {
		const n = 6000,
			pos = new Float32Array(n * 3);
		let sd = 31337;
		const r = () => (sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296;
		for (let i = 0; i < n; i++) {
			const a = r() * Math.PI * 2,
				d = RING_IN + r() * (RING_OUT - RING_IN);
			pos.set([Math.cos(a) * d, (r() - 0.5) * 0.01, Math.sin(a) * d], i * 3);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
		return new THREE.Points(g, new THREE.PointsMaterial({ color: "#d8d0c4", size: 45, sizeAttenuation: true, transparent: true, opacity: 0.6 * CALM.rings, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
	})();
	rings.add(ringDust);

	// ---- the derelict station (0.137): a vast dead ring station drifting deep below the battle, a
	// landmark — a ring on spokes round a hub, broken in places, a few lights still blinking ----
	const derelict = new THREE.Group(),
		hullMat = hazed(new THREE.MeshStandardMaterial({ color: "#7d8288", roughness: 0.6, metalness: 0.55, flatShading: true })),
		darkMat = hazed(new THREE.MeshStandardMaterial({ color: "#3a3e44", roughness: 0.8, metalness: 0.4, flatShading: true })),
		lampMat = new THREE.MeshBasicMaterial({ color: "#ffcf8a", fog: false });
	{
		const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 10, 72, Math.PI * 1.7), hullMat);
		ring.rotation.x = Math.PI / 2;
		derelict.add(ring);
		const inner = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.025, 6, 72), darkMat);
		inner.rotation.x = Math.PI / 2;
		derelict.add(inner);
		const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 12), hullMat);
		derelict.add(hub);
		const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), darkMat);
		derelict.add(mast);
		for (let i = 0; i < 6; i++) {
			if (i === 4) continue; // a broken spoke
			const a = (i / 6) * Math.PI * 2,
				spoke = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.05, 0.05), darkMat);
			spoke.position.set(Math.cos(a) * 0.54, 0, Math.sin(a) * 0.54);
			spoke.rotation.y = -a;
			derelict.add(spoke);
		}
		for (let i = 0; i < 14; i++) {
			const a = (i / 14) * Math.PI * 1.7,
				mod = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.18), i % 3 ? hullMat : darkMat);
			mod.position.set(Math.cos(a) * 1.0, 0.07, Math.sin(a) * 1.0);
			mod.rotation.y = -a;
			derelict.add(mod);
		}
		// Debris floating off the broken end.
		for (let i = 0; i < 8; i++) {
			const chunk = new THREE.Mesh(new THREE.BoxGeometry(0.05 + i * 0.006, 0.04, 0.07), darkMat);
			const a = Math.PI * 1.72 + i * 0.03;
			chunk.position.set(Math.cos(a) * (1 + i * 0.02), (i % 3) * 0.04 - 0.04, Math.sin(a) * (1 + i * 0.025));
			chunk.rotation.set(i, i * 2, i * 0.5);
			derelict.add(chunk);
		}
	}
	const derelictLamps = [];
	for (let i = 0; i < 5; i++) {
		const l = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), lampMat);
		const a = (i / 5) * Math.PI * 1.6 + 0.2;
		l.position.set(Math.cos(a) * 1.0, 0.13, Math.sin(a) * 1.0);
		derelict.add(l);
		derelictLamps.push(l);
	}
	deep.add(derelict);

	// ---- 0.139: more of the surroundings ----
	// A soft cloud texture (many blobs) for the nebulae, and a small round dot.
	const cloudTex = (() => {
		const c = document.createElement("canvas");
		c.width = c.height = 128;
		const x = c.getContext("2d");
		let sd = 4242;
		const r = () => (sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296;
		for (let i = 0; i < 60; i++) {
			const a = r() * Math.PI * 2,
				d = Math.pow(r(), 0.7) * 44,
				cx = 64 + Math.cos(a) * d,
				cy = 64 + Math.sin(a) * d,
				rr = 8 + r() * 26,
				g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
			g.addColorStop(0, `rgba(255,255,255,${(0.1 + r() * 0.15).toFixed(3)})`);
			g.addColorStop(1, "rgba(255,255,255,0)");
			x.fillStyle = g;
			x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
		}
		return new THREE.CanvasTexture(c);
	})();
	// The volumetric nebulae: two great clouds — one beyond the planet, one deep below the battle — each
	// built of glowing layers at many depths (they slide apart as the camera moves, so the cloud has
	// volume), dark lanes of dust in front of them, and young stars burning inside.
	const nebulae = new THREE.Group();
	group.add(nebulae);
	function buildNebula(centre, radii, colours, seed) {
		let sd = seed;
		const r = () => (sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296;
		const glowMats = colours.map((c) => new THREE.SpriteMaterial({ map: cloudTex, color: c, transparent: true, opacity: 0.16 * CALM.nebula, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
		const dustMat = new THREE.SpriteMaterial({ map: cloudTex, color: "#05060a", transparent: true, opacity: 0.55, depthWrite: false, fog: false });
		for (let i = 0; i < 90; i++) {
			const u = r() * 2 - 1,
				v = r() * 2 - 1,
				w = r() * 2 - 1,
				k = Math.cbrt(r());
			const s = new THREE.Sprite(glowMats[i % glowMats.length]);
			s.position.set(centre.x + u * radii.x * k, centre.y + v * radii.y * k, centre.z + w * radii.z * k);
			const size = (0.25 + r() * 0.5) * radii.x;
			s.scale.set(size, size * (0.6 + r() * 0.5), 1);
			s.material.rotation = r() * 6.28;
			nebulae.add(s);
		}
		for (let i = 0; i < 26; i++) {
			const s = new THREE.Sprite(dustMat);
			const t = r() * 2 - 1;
			s.position.set(centre.x + t * radii.x * 0.8, centre.y + (r() - 0.5) * radii.y * 0.5, centre.z + (r() - 0.5) * radii.z + radii.z * 0.3);
			const size = (0.12 + r() * 0.25) * radii.x;
			s.scale.set(size * 1.8, size * 0.5, 1);
			nebulae.add(s);
		}
		const n = 140,
			pos = new Float32Array(n * 3);
		for (let i = 0; i < n; i++) pos.set([centre.x + (r() * 2 - 1) * radii.x * 0.7, centre.y + (r() * 2 - 1) * radii.y * 0.7, centre.z + (r() * 2 - 1) * radii.z * 0.7], i * 3);
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
		nebulae.add(new THREE.Points(g, new THREE.PointsMaterial({ color: "#e8f0ff", size: 120, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, map: glowDot })));
	}

	// Ice from the rings drifting through the battle: a few dozen tumbling chunks, slow, at many heights
	// (some between the ships), wrapping round the map. Scenery only — nothing collides with them.
	const ICE = 46;
	const iceChunks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: "#b9cad8", roughness: 0.45, metalness: 0.05, flatShading: true }), ICE);
	iceChunks.frustumCulled = false;
	group.add(iceChunks);
	let ice = [];

	// The comet: a bright nucleus in a glowing coma, a curved dust tail and a straight blue ion tail, both
	// pointing away from the sun; it crosses the sky slowly during the battle.
	const comet = new THREE.Group();
	const cometParts = [];
	{
		const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowDot, color: "#f4fbff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
		head.scale.setScalar(900);
		comet.add(head);
		const coma = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowDot, color: "#9fd6ff", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
		coma.scale.setScalar(3200);
		comet.add(coma);
		const dustMat = new THREE.SpriteMaterial({ map: cloudTex, color: "#ffe9c8", transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
			ionMat = new THREE.SpriteMaterial({ map: glowDot, color: "#7fb8ff", transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
		for (let i = 1; i <= 40; i++) {
			const d = new THREE.Sprite(dustMat);
			const ion = new THREE.Sprite(ionMat);
			comet.add(d, ion);
			cometParts.push({ d, ion, t: i / 40 });
		}
	}
	group.add(comet);
	const cometAway = new THREE.Vector3(),
		cometSide = new THREE.Vector3();

	// Repair drones round the derelict station: small craft circling it, their lights blinking, and
	// welding sparks flaring on its hull here and there.
	const DRONES = 36;
	const droneGeo = new THREE.BufferGeometry(),
		dronePos = new Float32Array(DRONES * 3),
		droneCol = new Float32Array(DRONES * 3);
	droneGeo.setAttribute("position", new THREE.BufferAttribute(dronePos, 3));
	droneGeo.setAttribute("color", new THREE.BufferAttribute(droneCol, 3));
	const drones = new THREE.Points(droneGeo, new THREE.PointsMaterial({ map: glowDot, size: 26, vertexColors: true, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
	drones.frustumCulled = false;
	group.add(drones);
	const welds = Array.from({ length: 6 }, () => {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowDot, color: "#cfe8ff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
		group.add(s);
		return s;
	});
	const tmpV = new THREE.Vector3();
	function updateSurroundings(time) {
		// Ice drifting through the battle.
		for (let i = 0; i < ice.length; i++) {
			const c = ice[i];
			const x = ((c.x + time * c.vx) % c.W + c.W) % c.W - c.W * 0.1,
				z = ((c.z + time * c.vz) % c.H + c.H) % c.H - c.H * 0.1;
			e4.set(c.rx + time * c.spin, c.ry + time * c.spin * 0.6, 0);
			q4.setFromEuler(e4);
			iceChunks.setMatrixAt(i, m4.compose(p4.set(x, c.y + Math.sin(time * 0.2 + i) * 6, z), q4, s4.set(c.s, c.s * 0.8, c.s)));
		}
		iceChunks.instanceMatrix.needsUpdate = true;
		// The comet's path: across the sky once every 12 minutes, its tails away from the sun.
		const u = (time / 720) % 1,
			ang = -0.9 + u * 1.8;
		comet.position.set(Math.cos(ang) * 30000 + cometBase.x, cometBase.y + Math.sin(u * Math.PI) * 6000, cometBase.z + Math.sin(ang) * 8000);
		cometAway.copy(sunDir).multiplyScalar(-1);
		cometSide.set(-cometAway.z, 0, cometAway.x).normalize();
		for (const p of cometParts) {
			const len = 26000;
			p.d.position.copy(cometAway).multiplyScalar(p.t * len).addScaledVector(cometSide, p.t * p.t * len * 0.25);
			const ds = 1600 + p.t * 5200;
			p.d.scale.set(ds, ds, 1);
			p.d.material.opacity = 0.2;
			p.ion.position.copy(cometAway).multiplyScalar(p.t * len * 1.2);
			const is = 700 + p.t * 1400;
			p.ion.scale.set(is, is, 1);
		}
		// Drones round the derelict.
		derelict.updateMatrixWorld();
		for (let i = 0; i < DRONES; i++) {
			const a = time * (0.08 + (i % 5) * 0.02) * (i % 2 ? 1 : -1) + i * 1.7,
				rr = 1.08 + (i % 4) * 0.09,
				h = Math.sin(time * 0.3 + i) * 0.15;
			tmpV.set(Math.cos(a) * rr, h, Math.sin(a) * rr).applyMatrix4(derelict.matrixWorld);
			dronePos.set([tmpV.x, tmpV.y, tmpV.z], i * 3);
			const blink = (time * 1.3 + i * 0.37) % 1 < 0.2;
			droneCol.set(blink ? [1, 0.55, 0.25] : [0.35, 0.55, 0.75], i * 3);
		}
		droneGeo.attributes.position.needsUpdate = true;
		droneGeo.attributes.color.needsUpdate = true;
		welds.forEach((w, i) => {
			const cycle = Math.floor(time * 0.7 + i * 0.41),
				on = (time * 0.7 + i * 0.41) % 1 < 0.45,
				h = Math.sin(cycle * 12.9 + i * 7.1) * 43758.5,
				a = (h - Math.floor(h)) * Math.PI * 1.7;
			w.visible = on;
			if (!on) return;
			tmpV.set(Math.cos(a), 0.1, Math.sin(a)).applyMatrix4(derelict.matrixWorld);
			w.position.copy(tmpV);
			w.scale.setScalar(90 + Math.random() * 60);
		});
	}
	const cometBase = new THREE.Vector3();

	// ---- lens flare (0.135): ghosts — rings, hexagons, a soft disc — along the line from the sun through
	// the centre of the view, when the sun is in the frame ----
	const ghostTexture = (kind) => {
		const c = document.createElement("canvas");
		c.width = c.height = 128;
		const x = c.getContext("2d");
		if (kind === "hex") {
			x.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
				x.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58);
			}
			x.closePath();
			const g = x.createRadialGradient(64, 64, 10, 64, 64, 60);
			g.addColorStop(0, "rgba(255,255,255,.15)");
			g.addColorStop(1, "rgba(255,255,255,.6)");
			x.fillStyle = g;
			x.fill();
		} else if (kind === "ring") {
			const g = x.createRadialGradient(64, 64, 40, 64, 64, 62);
			g.addColorStop(0, "rgba(255,255,255,0)");
			g.addColorStop(0.8, "rgba(255,255,255,.7)");
			g.addColorStop(1, "rgba(255,255,255,0)");
			x.fillStyle = g;
			x.fillRect(0, 0, 128, 128);
		} else {
			const g = x.createRadialGradient(64, 64, 0, 64, 64, 62);
			g.addColorStop(0, "rgba(255,255,255,.8)");
			g.addColorStop(1, "rgba(255,255,255,0)");
			x.fillStyle = g;
			x.fillRect(0, 0, 128, 128);
		}
		return new THREE.CanvasTexture(c);
	};
	const GHOSTS = [
		[0.35, 0.05, "disc", "#ffd9a0"],
		[0.62, 0.035, "hex", "#9fd4ff"],
		[0.9, 0.08, "ring", "#a0ffcf"],
		[1.25, 0.03, "hex", "#ffb0d0"],
		[1.6, 0.12, "ring", "#8fb8ff"],
		[1.9, 0.045, "disc", "#ffe6b0"],
	].map(([at, size, kind, color]) => {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ghostTexture(kind), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, opacity: 0 }));
		s.renderOrder = 2001;
		group.add(s);
		return { s, at, size };
	});
	const sunNdc = new THREE.Vector3(),
		ghostAt = new THREE.Vector3();
	function updateFlare(camera, front) {
		sunNdc.copy(camera.position).addScaledVector(sunDir, 1000).project(camera);
		const onScreen = front > 0 && Math.abs(sunNdc.x) < 1.1 && Math.abs(sunNdc.y) < 1.1,
			strength = onScreen ? Math.max(0, 1 - Math.hypot(sunNdc.x, sunNdc.y) / 1.6) : 0;
		for (const g of GHOSTS) {
			g.s.visible = strength > 0.01;
			if (!g.s.visible) continue;
			// A point on the line sun → centre → beyond, 400 units in front of the camera.
			ghostAt.set(sunNdc.x * (1 - g.at * 2), sunNdc.y * (1 - g.at * 2), 0.5).unproject(camera).sub(camera.position).normalize();
			g.s.position.copy(camera.position).addScaledVector(ghostAt, 400);
			g.s.scale.setScalar(400 * g.size * 2);
			g.s.material.opacity = strength * 0.35 * CALM.sunGlow;
		}
	}

	const view = new THREE.Vector3();
	// ---- the veil (0.156): a dark layer just under the plane of the battle, fading out past the map's edge ----
	const veilUniforms = { size: { value: new THREE.Vector2(1, 1) }, margin: { value: 700 }, strength: { value: CALM.veil } };
	const veil = new THREE.Mesh(
		new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
		new THREE.ShaderMaterial({
			uniforms: veilUniforms,
			vertexShader: `varying vec2 vXY;
				void main() { vec4 w = modelMatrix * vec4(position, 1.0); vXY = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
			fragmentShader: `varying vec2 vXY; uniform vec2 size; uniform float margin; uniform float strength;
				void main() {
					// Distance outside the board (0 inside it), soft to the edge of the veil.
					vec2 out2 = max(max(-vXY, vXY - size), 0.0);
					float k = 1.0 - smoothstep(0.0, margin, length(out2));
					gl_FragColor = vec4(0.008, 0.012, 0.025, strength * k);
				}`,
			transparent: true,
			depthWrite: false,
			fog: false,
		}),
	);
	veil.frustumCulled = false;
	group.add(veil);

	return {
		group,
		// Placement for a map: the planet far below the battle, south of it (towards the default camera),
		// so its limb curves under the board; rings round it, the moon off to the north-east.
		setGame(game) {
			const space = !!RTS.MISSIONS[game?.missionId]?.space;
			group.visible = space;
			if (!space) return;
			// Ahead of the default camera (north) and far below: the planet rises over the far edge of the
			// view while the battle itself floats over dark space; the rings arc steeply behind it.
			// The map's world (0.143): `look` from the mission — gas giant (default), ice giant with rings near
			// the battle, volcanic moon, or a black hole instead of a planet; colours of sky, nebulae, rings.
			const look = RTS.MISSIONS[game.missionId].look || {},
				kind = look.planet || "gas";
			const M = veilUniforms.margin.value;
			veil.position.set(game.W / 2, -30, game.H / 2);
			veil.scale.set(game.W + M * 2, 1, game.H + M * 2);
			veilUniforms.size.value.set(game.W, game.H);
			const PAL = {
				gas: { c: ["#54331f", "#8c4d2e", "#c78c54", "#edd4a8"], amp: 1, atmo: "#73b3ff", rings: ["#9e8c78", "#f2e6d1"], ringAlpha: 0.6 },
				ice: { c: ["#24607e", "#3a88a8", "#68b8cf", "#b4e4ee"], amp: 0.35, atmo: "#8fe0ff", rings: ["#8aa6b8", "#eef8ff"], ringAlpha: 0.75 },
				lava: { c: ["#1c1614", "#4a3a2c", "#ff7a1e", "#ffd070"], amp: 0, atmo: "#a8481e", rings: ["#000000", "#000000"], ringAlpha: 0 },
			}[kind === "none" ? "gas" : kind];
			planet.visible = kind !== "none";
			planetUniforms.kind.value = kind === "ice" ? 1 : kind === "lava" ? 2 : 0;
			["c0", "c1", "c2", "c3"].forEach((k, i) => planetUniforms[k].value.set(PAL.c[i]));
			planetUniforms.bandAmp.value = PAL.amp;
			planetUniforms.atmo.value.set(PAL.atmo);
			ringUniforms.ringA.value.set(PAL.rings[0]);
			ringUniforms.ringB.value.set(PAL.rings[1]);
			ringUniforms.ringAlpha.value = PAL.ringAlpha;
			// The ice giant (0.143.3) sits far off beyond the board's corner, tipped over like Uranus: its pole
			// and its rings turned almost towards the battle, the rings open round it like a target (set on the
			// first frame, from the camera, in update).
			const R = kind === "ice" ? 1450 : kind === "lava" ? 4200 : 6500,
				centre = kind === "ice" ? new THREE.Vector3(game.W * 0.2, -9800, -11000) : kind === "lava" ? new THREE.Vector3(game.W * 0.15, -9000, -10500) : new THREE.Vector3(game.W * 0.3, -9500, -8500);
			// The ice giant is lit from the side (a bright half-disc of ice); the others from behind.
			planetLight.copy(kind === "ice" || kind === "lava" ? ICE_LIGHT : backLight);
			planet.position.copy(centre);
			planet.scale.setScalar(R);
			planet.rotation.set(0.08, 0.6, -0.12);
			planetUniforms.radius.value = R;
			rings.visible = !!look.rings && kind !== "none";
			rings.position.copy(centre);
			rings.scale.setScalar(R);
			// Far rings: tilted so the half towards the battle dives down and the far half rises behind the
			// planet; open rings (the ice giant): turned towards the camera in update.
			rings.rotation.set(1.0, 0.35, 0.2);
			openRings = look.rings === "near";
			ringsAligned = false;
			ringUniforms.planetCentre.value.copy(centre);
			ringUniforms.planetRadius.value = R;
			moon.visible = kind === "gas" || kind === "ice";
			moon.position.set(game.W * 1.35, -2500, -15000);
			moon.scale.setScalar(650);
			blackHole.visible = !!look.blackHole;
			blackHole.position.set(game.W * 0.76, -9500, -8000);
			blackHole.scale.setScalar(1150);
			// Sky nebulae in the map's colours.
			const sky2 = look.sky || [["#661230", "#d94d6b"], ["#0a2e61", "#2ea6cc"]];
			skyUniforms.neb1a.value.set(sky2[0][0]);
			skyUniforms.neb1b.value.set(sky2[0][1]);
			skyUniforms.neb2a.value.set(sky2[1][0]);
			skyUniforms.neb2b.value.set(sky2[1][1]);
			// What else floats about.
			derelict.visible = drones.visible = look.derelict !== false;
			for (const w of welds) w.userData.off = look.derelict === false;
			comet.visible = look.comet !== false;
			convoyShips.visible = glows.visible = look.convoys !== false;
			iceChunks.visible = look.ice !== false;
			// The rocks of the deep field take the map's stone: ice, dark basalt, or the default.
			debris.material.color.set(look.rocks === "ice" ? "#a9bccb" : look.rocks === "dark" ? "#3a3634" : look.rocks === "hulk" ? "#5a4e48" : "#77706a");
			buildDeep(game);
			derelict.position.set(game.W * 0.9, -2300, game.H * 0.15);
			derelict.scale.setScalar(620);
			derelict.rotation.set(0.35, 0.5, 0.18);
			// 0.139: the nebulae, the ice of the rings, the comet's sky.
			while (nebulae.children.length) {
				const c = nebulae.children.pop();
				c.material?.dispose();
				if (c.isPoints) c.geometry.dispose();
			}
			const neb = look.nebula || [["#c050d8", "#6a4ae0", "#e0607a"], ["#3fa0d8", "#2f6ad0", "#58d0c0"]];
			buildNebula(new THREE.Vector3(game.W * 1.6, -2000, -26000), new THREE.Vector3(9000, 4500, 5000), neb[0], 777);
			buildNebula(new THREE.Vector3(game.W * 0.7, -21000, game.H * 2.2), new THREE.Vector3(12000, 3500, 9000), neb[1], 991);
			let sd = 5151;
			const r = () => (sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296;
			ice = Array.from({ length: ICE }, () => ({ x: r() * game.W * 1.2, z: r() * game.H * 1.2, W: game.W * 1.2, H: game.H * 1.2, y: -140 + r() * 260, vx: 4 + r() * 8, vz: (r() - 0.5) * 5, s: 3 + r() * 7, rx: r() * 6, ry: r() * 6, spin: (r() - 0.5) * 0.4 }));
			iceChunks.count = ICE;
			cometBase.set(game.W * 0.5, 9000, -30000);
		},
		update({ camera, time, sun }) {
			if (!group.visible) return;
			if (sun) sunDir.copy(sun).normalize();
			skyUniforms.time.value = time;
			planetUniforms.time.value = time;
			updateDeep(time);
			derelict.rotation.y = 0.5 + time * 0.006;
			// The volcanic moon turns slowly, its lava lakes coming round (0.144.1).
			if (planetUniforms.kind.value > 1.5) planet.rotation.y = 0.6 + time * 0.008;
			derelictLamps.forEach((l, i) => (l.visible = (time * 0.7 + i * 0.37) % 1 < 0.15));
			updateSurroundings(time);
			if (blackHole.visible) blackHole.userData.picture.quaternion.copy(camera.quaternion);
			if (openRings && !ringsAligned) {
				// The axis towards the camera, tipped 0.6 rad aside so the rings open as a slightly flat ellipse.
				ringsAligned = true;
				const axis = camera.position.clone().sub(planet.position).normalize(),
					side = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize();
				axis.applyAxisAngle(side, 0.6);
				const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
				planet.quaternion.copy(q);
				rings.quaternion.copy(q);
			}
			if (welds[0]?.userData.off) for (const w of welds) w.visible = false;
			sky.position.copy(camera.position);
			sky.scale.setScalar(camera.far * 0.9);
			// The streak sits on the sun, fades out as it leaves the view.
			streak.position.copy(camera.position).addScaledVector(sunDir, camera.far * 0.8);
			streak.scale.set(camera.far * 0.7, camera.far * 0.012, 1);
			const inFront = camera.getWorldDirection(view).dot(sunDir);
			streak.material.opacity = Math.max(0, (inFront - 0.75) / 0.25) * 0.55 * CALM.sunGlow;
			streak.visible = streak.material.opacity > 0.01;
			updateFlare(camera, inFront);
		},
	};
}
