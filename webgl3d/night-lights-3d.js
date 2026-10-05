/* Night lights of the 3D board, all of them at once: headlights of vehicles, flashlights of infantry,
   searchlights of aircraft, floodlights and facade lights of buildings. Not Three.js lights (a fixed few,
   handed to whatever is nearest the camera, so lights jumped from one thing to another as the camera
   moved) but a light list computed in the shaders of the terrain, the scattered props, the water and the
   models (nightLightShade()):
   - every light of the frame is a row in a small float texture (position and range, direction and
     cone, colour × power);
   - a grid of cells over the view (48 × 48 around the camera focus, cell size following the zoom) lists
     the lights reaching each cell, up to 24 (the strongest in the cell when more: only faint ones are
     left out, so no border shows);
   - a fragment finds its cell and adds the light of those lights: diffuse (Lambert), soft spot cones,
     the falloff of Three.js lights (power / distance^1.3, cut off smoothly at the range, so cell borders
     never show) — the same powers as the real lights had.
   Lights fade out towards the edge of the grid, far from the view. The beams seen in the air (haze in
   rain, snow and at night) are one instanced draw for all spot lights. */

const NIGHT_LIGHTS = { nlLights: { value: null }, nlGrid: { value: null }, nlGridInfo: { value: [0, 0, 1, 0] }, nlOn: { value: 0 } };
const NIGHT_LIGHT_GLSL = `
	uniform sampler2D nlLights; uniform sampler2D nlGrid; uniform vec4 nlGridInfo; uniform float nlOn;
	vec3 nightLightsAt(vec3 p, vec3 n) {
		vec3 sum = vec3(0.0);
		if (nlOn < 0.5) return sum;
		vec2 c = floor((p.xz - nlGridInfo.xy) / nlGridInfo.z);
		if (c.x < 0.0 || c.y < 0.0 || c.x >= nlGridInfo.w || c.y >= nlGridInfo.w) return sum;
		for (int t = 0; t < 6; t++) {
			vec4 ids = texelFetch(nlGrid, ivec2(int(c.x) * 6 + t, int(c.y)), 0);
			for (int k = 0; k < 4; k++) {
				float id = ids[k];
				if (id < 0.0) return sum;
				int i = int(id);
				vec4 P = texelFetch(nlLights, ivec2(i, 0), 0);
				vec4 D = texelFetch(nlLights, ivec2(i, 1), 0);
				vec4 C = texelFetch(nlLights, ivec2(i, 2), 0);
				vec3 d = P.xyz - p;
				float dist = length(d);
				if (dist >= P.w) continue;
				vec3 l = d / max(dist, 0.001);
				float cone = D.w < -1.5 ? 1.0 : smoothstep(D.w, C.w, dot(-l, D.xyz));
				// The falloff of Three.js lights (decay 1.3, cut off smoothly at the range).
				float edge = clamp(1.0 - pow(dist / P.w, 4.0), 0.0, 1.0);
				sum += C.rgb * edge * edge / pow(max(dist, 1.0), 1.3) * cone * max(dot(n, l), 0.0);
			}
		}
		return sum;
	}`;

// Night lights in a material: call from onBeforeCompile (lit materials; others are left as they are).
export function nightLightShade(shader) {
	if (!shader.fragmentShader.includes("#include <lights_fragment_end>")) return;
	Object.assign(shader.uniforms, NIGHT_LIGHTS);
	shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\n" + NIGHT_LIGHT_GLSL).replace(
		"#include <lights_fragment_end>",
		`#include <lights_fragment_end>
		{
			mat3 nlToWorld = transpose(mat3(viewMatrix));
			reflectedLight.directDiffuse += BRDF_Lambert(material.diffuseColor) * nightLightsAt(nlToWorld * (geometryPosition - viewMatrix[3].xyz), nlToWorld * geometryNormal);
		}`,
	);
}

export function createNightLights(THREE, { world }) {
	const MAX = 128,
		G = 48,
		PER = 24,
		ROW = PER / 4;
	const lightData = new Float32Array(MAX * 3 * 4),
		lightTex = new THREE.DataTexture(lightData, MAX, 3, THREE.RGBAFormat, THREE.FloatType),
		gridData = new Float32Array(G * ROW * G * 4).fill(-1),
		gridTex = new THREE.DataTexture(gridData, G * ROW, G, THREE.RGBAFormat, THREE.FloatType);
	for (const t of [lightTex, gridTex]) {
		t.minFilter = t.magFilter = THREE.NearestFilter;
		t.generateMipmaps = false;
		t.needsUpdate = true;
	}
	NIGHT_LIGHTS.nlLights.value = lightTex;
	NIGHT_LIGHTS.nlGrid.value = gridTex;

	// Visible beams: an open cone along +X from the lamp, fading with length and towards its rim; the
	// instance colour is the tint × the haze.
	const beams = new THREE.InstancedMesh(
		new THREE.ConeGeometry(1, 1, 18, 1, true).translate(0, -0.5, 0).rotateZ(Math.PI / 2),
		new THREE.ShaderMaterial({
			vertexShader: `varying float vAlong; varying vec3 vNormal; varying vec3 vView; varying vec3 vTint;
				void main() {
					vAlong = position.x;
					vTint = instanceColor;
					vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
					vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
					vView = normalize(-mv.xyz);
					gl_Position = projectionMatrix * mv;
				}`,
			fragmentShader: `varying float vAlong; varying vec3 vNormal; varying vec3 vView; varying vec3 vTint;
				void main() {
					float core = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.4);
					float a = core * pow(1.0 - clamp(vAlong, 0.0, 1.0), 1.6) * smoothstep(0.0, 0.08, vAlong);
					gl_FragColor = vec4(vTint * a, 1.0);
				}`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
		}),
		MAX,
	);
	beams.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
	beams.frustumCulled = false;
	beams.renderOrder = 6;
	beams.count = 0;
	world.add(beams);

	const list = [],
		color = new THREE.Color(),
		dir = new THREE.Vector3(),
		X = new THREE.Vector3(1, 0, 0),
		matrix = new THREE.Matrix4(),
		quat = new THREE.Quaternion(),
		at = new THREE.Vector3(),
		scale = new THREE.Vector3(),
		cells = Array.from({ length: G * G }, () => []);
	let pool = [];
	const take = () => pool.pop() || {};
	return {
		beams,
		begin() {
			pool = pool.concat(list);
			list.length = 0;
		},
		// A spot light at (x, y) h high (world height), aimed at (tx, ty) on the ground th high; angle the
		// half angle of the cone, soft its soft share; power × colour; range; haze the strength of the
		// visible beam (0 none).
		spot(x, y, h, tx, ty, th, { angle, soft = 0.6, color: c, power, range, haze = 0 }) {
			const l = take();
			dir.set(tx - x, th - h, ty - y).normalize();
			Object.assign(l, { x, y, h, dx: dir.x, dy: dir.y, dz: dir.z, cosOut: Math.cos(angle), cosIn: Math.cos(angle * (1 - soft)), range, haze, angle, len: Math.hypot(tx - x, th - h, ty - y) });
			color.set(c).multiplyScalar(power);
			l.r = color.r;
			l.g = color.g;
			l.b = color.b;
			// The ground it reaches: around a point ahead of the lamp.
			l.cx = x + (tx - x) * 0.6;
			l.cy = y + (ty - y) * 0.6;
			l.cr = range * 0.8;
			list.push(l);
		},
		point(x, y, h, { color: c, power, range }) {
			const l = take();
			Object.assign(l, { x, y, h, dx: 0, dy: -1, dz: 0, cosOut: -2, cosIn: 0, range, haze: 0, cx: x, cy: y, cr: range });
			color.set(c).multiplyScalar(power);
			l.r = color.r;
			l.g = color.g;
			l.b = color.b;
			list.push(l);
		},
		// After the lights of a frame: the nearest to the focus (up to 128), faded out towards the edge of
		// the grid; textures and beams.
		end(focus, span, on) {
			const cell = Math.max(60, Math.min(220, (span * 2.4) / G)),
				half = (cell * G) / 2,
				ox = focus.x - half,
				oy = focus.y - half;
			NIGHT_LIGHTS.nlOn.value = on && list.length ? 1 : 0;
			NIGHT_LIGHTS.nlGridInfo.value = [ox, oy, cell, G];
			for (const l of list) {
				const d = Math.hypot(l.cx - focus.x, l.cy - focus.y);
				l.d = d;
				l.fade = Math.max(0, Math.min(1, (half * 0.95 - d) / (half * 0.25)));
			}
			const used = list.filter((l) => l.fade > 0).sort((a, b) => a.d - b.d).slice(0, MAX);
			for (const c of cells) c.length = 0;
			let beam = 0;
			used.forEach((l, i) => {
				const f = l.fade;
				lightData.set([l.x, l.h, l.y, l.range], i * 4);
				lightData.set([l.dx, l.dy, l.dz, l.cosOut], (MAX + i) * 4);
				lightData.set([l.r * f, l.g * f, l.b * f, l.cosIn], (MAX * 2 + i) * 4);
				// Cells within its range (nearest point of the cell), not behind a spot light; the weight is
				// its strongest light in the cell, so when a cell is full only the faint ones are left out.
				const x0 = Math.max(0, Math.floor((l.x - l.range - ox) / cell)),
					x1 = Math.min(G - 1, Math.floor((l.x + l.range - ox) / cell)),
					y0 = Math.max(0, Math.floor((l.y - l.range - oy) / cell)),
					y1 = Math.min(G - 1, Math.floor((l.y + l.range - oy) / cell)),
					strength = (l.r + l.g + l.b) * f,
					flat = Math.hypot(l.dx, l.dz),
					fx = flat > 0.01 ? l.dx / flat : 0,
					fz = flat > 0.01 ? l.dz / flat : 0;
				for (let cy = y0; cy <= y1; cy++)
					for (let cx = x0; cx <= x1; cx++) {
						const left = ox + cx * cell,
							top = oy + cy * cell,
							nx = Math.max(left, Math.min(l.x, left + cell)) - l.x,
							ny = Math.max(top, Math.min(l.y, top + cell)) - l.y,
							near = Math.hypot(nx, ny, Math.min(l.h, 30));
						if (near >= l.range) continue;
						if (l.cosOut > -1.5 && (left + cell * 0.5 - l.x) * fx + (top + cell * 0.5 - l.y) * fz < -cell) continue;
						const edge = Math.max(0, 1 - (near / l.range) ** 4);
						cells[cy * G + cx].push({ i, w: (strength * edge * edge) / Math.max(20, near) ** 1.3 });
					}
				if (l.haze > 0.003 && beam < MAX) {
					const length = l.len * 0.9,
						width = Math.tan(l.angle) * length * 0.8;
					beams.setMatrixAt(beam, matrix.compose(at.set(l.x, l.h, l.y), quat.setFromUnitVectors(X, dir.set(l.dx, l.dy, l.dz)), scale.set(length, width, width)));
					beams.setColorAt(beam, color.setRGB(l.r, l.g, l.b).multiplyScalar(l.haze * f / Math.max(0.001, Math.max(l.r, l.g, l.b))));
					beam++;
				}
			});
			gridData.fill(-1);
			for (let k = 0; k < cells.length; k++) {
				let c = cells[k];
				if (!c.length) continue;
				if (c.length > PER) c = c.sort((a, b) => b.w - a.w).slice(0, PER);
				const cy = Math.floor(k / G),
					cx = k % G,
					base = (cy * G * ROW + cx * ROW) * 4;
				c.forEach((e, n) => (gridData[base + n] = e.i));
			}
			lightTex.needsUpdate = true;
			gridTex.needsUpdate = true;
			beams.count = beam;
			beams.visible = beam > 0;
			beams.instanceMatrix.needsUpdate = true;
			if (beams.instanceColor) beams.instanceColor.needsUpdate = true;
		},
	};
}
