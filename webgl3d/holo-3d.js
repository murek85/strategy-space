/* Holograms of the interface on the 3D board (0.144.3):
   - Selection: a subtle holographic ring at the foot of every selected unit or building (a thin outer
     line, dashes running round inside it, four brackets turning); over buildings also a short column of
     light rising from it, with a scan line climbing up (units have none since 0.147.8).
   - Orders of the selected units: dashes flowing along the ground from each unit to where it goes, a
     hologram diamond bobbing over the spot with a ring pulsing under it (mint for a move, amber for an
     attack move); an attack: red dashes to the target and a red reticle turning round it, pulsing.
   - Relays: beams of energy from the units taking a relay to its top, pulses running up them in the
     colour of the side taking it; when a relay changes hands, a burst — a ring racing out over the ground
     and a pillar of light in the new owner's colour.
   Visual only; drawn additively, over the scene, without writing depth. */
export function createHolo3D(THREE, { world, heightAt }) {
	const group = new THREE.Group();
	group.renderOrder = 9;
	world.add(group);
	const time = { value: 0 };
	const VS = `varying vec3 vP; varying vec2 vUv; void main() { vP = position; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
	const shader = (fragmentShader, side = THREE.FrontSide) =>
		new THREE.ShaderMaterial({
			uniforms: { time, color: { value: new THREE.Color() }, alpha: { value: 1 } },
			vertexShader: VS,
			fragmentShader: `uniform float time; uniform vec3 color; uniform float alpha; varying vec3 vP; varying vec2 vUv;
				${fragmentShader}`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side,
			fog: false,
		});
	const basic = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });

	// ---------- selection ----------
	const ringGeometry = new THREE.RingGeometry(0.76, 1.02, 72, 1).rotateX(-Math.PI / 2),
		columnGeometry = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true).translate(0, 0.5, 0);
	const RING_FS = `void main() {
			float r = length(vP.xz), a = atan(vP.z, vP.x) / 6.28318 + 0.5;
			float outer = smoothstep(0.95, 0.975, r) * (1.0 - smoothstep(0.995, 1.02, r));
			float dash = step(0.45, fract(a * 16.0 - time * 0.35)) * smoothstep(0.78, 0.8, r) * (1.0 - smoothstep(0.85, 0.87, r));
			float corner = step(0.9, abs(cos(a * 6.28318 * 2.0 + time * 0.6))) * smoothstep(0.88, 0.9, r) * (1.0 - smoothstep(0.93, 0.95, r));
			// Subtle (0.147.8): it marks the unit without outshining it.
			gl_FragColor = vec4(color * (outer * 0.8 + dash * 0.35 + corner * 0.6) * alpha * 0.6, 1.0);
			#include <colorspace_fragment>
		}`,
		COLUMN_FS = `void main() {
			float v = vUv.y;
			float base = pow(1.0 - v, 2.5) * 0.2;
			float scan = exp(-pow((v - fract(time * 0.5)) / 0.04, 2.0)) * 0.35 * (1.0 - v);
			float lines = 0.7 + 0.3 * step(0.5, fract(v * 16.0 - time * 1.4));
			gl_FragColor = vec4(color * (base + scan) * lines * alpha, 1.0);
			#include <colorspace_fragment>
		}`;
	const selections = [];
	function selection(i) {
		if (!selections[i]) {
			const ring = new THREE.Mesh(ringGeometry, shader(RING_FS)),
				column = new THREE.Mesh(columnGeometry, shader(COLUMN_FS, THREE.DoubleSide)),
				root = new THREE.Group();
			ring.renderOrder = column.renderOrder = 9;
			root.add(ring, column);
			group.add(root);
			selections[i] = { root, ring, column };
		}
		return selections[i];
	}

	// ---------- orders ----------
	const MAX_DASHES = 700,
		dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), basic("#ffffff", 0.7), MAX_DASHES);
	dashes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_DASHES * 3), 3);
	dashes.frustumCulled = false;
	dashes.renderOrder = 9;
	group.add(dashes);
	const diamondGeometry = new THREE.OctahedronGeometry(1, 0),
		pulseGeometry = new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2),
		markers = [];
	function marker(i) {
		if (!markers[i]) {
			const root = new THREE.Group(),
				diamond = new THREE.Mesh(diamondGeometry, basic("#ffffff", 0.55)),
				edges = new THREE.LineSegments(new THREE.EdgesGeometry(diamondGeometry), new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })),
				pulse = new THREE.Mesh(pulseGeometry, basic("#ffffff", 0.8));
			diamond.add(edges);
			root.add(diamond, pulse);
			group.add(root);
			markers[i] = { root, diamond, edges, pulse };
		}
		return markers[i];
	}
	const reticleGeometry = new THREE.BoxGeometry(1, 1, 1),
		reticles = [];
	function reticle(i) {
		if (!reticles[i]) {
			const root = new THREE.Group(),
				turn = new THREE.Group(),
				material = basic("#ff5a4a", 0.95);
			for (let k = 0; k < 4; k++) {
				const corner = new THREE.Group();
				corner.rotation.y = (k / 4) * Math.PI * 2;
				const a = new THREE.Mesh(reticleGeometry, material),
					b = new THREE.Mesh(reticleGeometry, material);
				a.scale.set(0.34, 0.04, 0.06);
				a.position.set(0.83, 0, 0.42);
				b.scale.set(0.06, 0.04, 0.34);
				b.position.set(1, 0, 0.25);
				corner.add(a, b);
				turn.add(corner);
			}
			root.add(turn);
			group.add(root);
			reticles[i] = { root, turn, material };
		}
		return reticles[i];
	}

	// ---------- relays ----------
	const beamGeometry = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0),
		BEAM_FS = `void main() {
			float v = vUv.y;
			float pulse = pow(fract(v * 5.0 - time * 1.6), 8.0);
			float ends = smoothstep(0.0, 0.08, v) * smoothstep(1.0, 0.92, v);
			gl_FragColor = vec4(color * (0.35 + 1.4 * pulse) * ends * alpha, 1.0);
			#include <colorspace_fragment>
		}`,
		beams = [];
	function beam(i) {
		if (!beams[i]) {
			const m = new THREE.Mesh(beamGeometry, shader(BEAM_FS, THREE.DoubleSide));
			m.renderOrder = 9;
			group.add(m);
			beams[i] = m;
		}
		return beams[i];
	}
	const bursts = [],
		burstMeshes = [],
		owners = new Map(),
		pillarGeometry = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true).translate(0, 0.5, 0),
		PILLAR_FS = `void main() {
			gl_FragColor = vec4(color * pow(1.0 - vUv.y, 1.6) * alpha, 1.0);
			#include <colorspace_fragment>
		}`;
	function burstMesh(i) {
		if (!burstMeshes[i]) {
			const ring = new THREE.Mesh(pulseGeometry, basic("#ffffff", 1)),
				pillar = new THREE.Mesh(pillarGeometry, shader(PILLAR_FS, THREE.DoubleSide));
			group.add(ring, pillar);
			burstMeshes[i] = { ring, pillar };
		}
		return burstMeshes[i];
	}

	const Y = new THREE.Vector3(0, 1, 0),
		from = new THREE.Vector3(),
		to = new THREE.Vector3(),
		dir = new THREE.Vector3(),
		matrix = new THREE.Matrix4(),
		quat = new THREE.Quaternion(),
		scale = new THREE.Vector3(),
		at = new THREE.Vector3(),
		tint = new THREE.Color();
	const COLORS = { move: new THREE.Color("#8dffc8"), attackMove: new THREE.Color("#ffb070"), attack: new THREE.Color("#ff5a4a") };

	return {
		group,
		// One frame: selected (a Set of ids), hidden(e), colorOf(team), space (the orbital battle), hover
		// (the ships' height), viewer.
		update(game, { clock, selected, hidden, colorOf, space, hover = 34, types }) {
			time.value = clock;
			const ground = (x, y) => (space ? 2 : heightAt(x, y));
			let si = 0,
				di = 0,
				mi = 0,
				ri = 0;
			const targets = new Map();
			for (const id of selected) {
				const e = game.entities.find((u) => u.id === id);
				if (!e || e.hp <= 0 || hidden(e)) continue;
				const s = types[e.type];
				if (!s) continue;
				const g = ground(e.x, e.y),
					r = s.radius + 6,
					sel = selection(si++),
					c = colorOf(e.team);
				sel.root.visible = true;
				sel.root.position.set(e.x, g + 2.5, e.y);
				sel.ring.scale.setScalar(r);
				sel.ring.material.uniforms.color.value.set(c);
				sel.column.material.uniforms.color.value.set(c);
				// The column of light only over buildings (0.147.8): over vehicles, infantry and ships its rim
				// read as a white ring over the unit and hid it.
				sel.column.visible = !s.speed;
				if (!s.speed) sel.column.scale.set(r * 0.98, Math.min(70, r * 0.9), r * 0.98);
				// Orders: where it goes (the end of its path, or the order's point), or its target.
				const o = e.order;
				if (!o || !s.speed) continue;
				let kind = null,
					tx,
					ty,
					target = null;
				if (o.kind === "attack" && o.targetId) {
					target = game.entities.find((u) => u.id === o.targetId && u.hp > 0);
					if (!target || hidden(target)) continue;
					kind = "attack";
					tx = target.x;
					ty = target.y;
				} else if ((o.kind === "move" || o.kind === "attackMove") && Number.isFinite(o.x)) {
					kind = o.kind;
					tx = o.x;
					ty = o.y;
				} else continue;
				const dx = tx - e.x,
					dy = ty - e.y,
					L = Math.hypot(dx, dy);
				if (L < 20) continue;
				const ux = dx / L,
					uy = dy / L,
					color = COLORS[kind],
					ang = -Math.atan2(uy, ux),
					end = L - (target ? types[target.type].radius + 14 : 14);
				// Dashes flowing towards the goal.
				for (let d = r + ((clock * 40) % 24); d < end && di < MAX_DASHES; d += 24) {
					const x = e.x + ux * d,
						y = e.y + uy * d;
					matrix.compose(at.set(x, ground(x, y) + 3, y), quat.setFromAxisAngle(Y, ang), scale.set(11, 1, 2.2));
					dashes.setMatrixAt(di, matrix);
					dashes.setColorAt(di++, color);
				}
				const key = kind === "attack" ? "t" + target.id : `${kind}|${Math.round(tx / 20)}|${Math.round(ty / 20)}`;
				if (!targets.has(key)) targets.set(key, { kind, x: tx, y: ty, target });
			}
			for (let i = si; i < selections.length; i++) selections[i].root.visible = false;
			dashes.count = di;
			dashes.instanceMatrix.needsUpdate = true;
			if (dashes.instanceColor) dashes.instanceColor.needsUpdate = true;
			// Markers at the goals, reticles round the targets.
			for (const t of targets.values()) {
				if (t.kind === "attack") {
					const rt = reticle(ri++),
						R = types[t.target.type].radius + 12,
						pulse = 1 + 0.12 * Math.sin(clock * 6);
					rt.root.visible = true;
					rt.root.position.set(t.x, ground(t.x, t.y) + (types[t.target.type].ship ? hover : 4), t.y);
					rt.root.scale.setScalar(R * pulse);
					rt.turn.rotation.y = clock * 1.2;
					continue;
				}
				const mk = marker(mi++),
					g = ground(t.x, t.y),
					color = COLORS[t.kind],
					k = (clock * 1.1) % 1;
				mk.root.visible = true;
				mk.root.position.set(t.x, g, t.y);
				mk.diamond.position.y = 20 + Math.sin(clock * 3) * 3;
				mk.diamond.rotation.y = clock * 1.5;
				mk.diamond.scale.set(5, 8, 5);
				mk.diamond.material.color.copy(color);
				mk.edges.material.color.copy(color);
				mk.pulse.position.y = 3;
				mk.pulse.scale.setScalar(8 + k * 22);
				mk.pulse.material.color.copy(color);
				mk.pulse.material.opacity = (1 - k) * 0.8;
			}
			for (let i = mi; i < markers.length; i++) markers[i].root.visible = false;
			for (let i = ri; i < reticles.length; i++) reticles[i].root.visible = false;

			// Relays: beams from the units taking one to its top; a burst when it changes hands.
			let bi = 0;
			for (const n of game.nodes || []) {
				const prev = owners.get(n);
				owners.set(n, n.owner);
				if (prev !== undefined && prev !== n.owner && n.owner >= 0) bursts.push({ x: n.x, y: n.y, t: clock, color: colorOf(n.owner) });
				if (!(n.capturing >= 0) || !(n.progress > 0) || hidden({ x: n.x, y: n.y, team: -1 })) continue;
				const top = space ? 2 + 72 : heightAt(n.x, n.y) + 46,
					c = colorOf(n.capturing);
				for (const e of game.entities) {
					const s = types[e.type];
					if (bi >= 24 || !s?.speed || e.hp <= 0 || Math.hypot(e.x - n.x, e.y - n.y) > 100) continue;
					if (!(e.team === n.capturing || game.allied?.(n.capturing, e.team)) || hidden(e)) continue;
					from.set(e.x, ground(e.x, e.y) + (s.ship ? hover : s.flying ? 90 : 12), e.y);
					to.set(n.x, top, n.y);
					dir.subVectors(to, from);
					const len = dir.length();
					if (len < 5) continue;
					const b = beam(bi++);
					b.visible = true;
					b.position.copy(from);
					b.quaternion.setFromUnitVectors(Y, dir.normalize());
					b.scale.set(1.3, len, 1.3);
					b.material.uniforms.color.value.set(c);
					b.material.uniforms.alpha.value = 0.6 + 0.4 * n.progress;
				}
			}
			for (let i = bi; i < beams.length; i++) beams[i].visible = false;
			for (let i = bursts.length - 1; i >= 0; i--) if (clock - bursts[i].t > 1.6) bursts.splice(i, 1);
			bursts.forEach((b, i) => {
				const m = burstMesh(i),
					k = (clock - b.t) / 1.6,
					g = ground(b.x, b.y);
				m.ring.visible = m.pillar.visible = true;
				m.ring.position.set(b.x, g + 4, b.y);
				m.ring.scale.setScalar(20 + k * 220);
				m.ring.material.color.set(b.color);
				m.ring.material.opacity = Math.pow(1 - k, 1.5);
				m.pillar.position.set(b.x, g, b.y);
				m.pillar.scale.set(16 + k * 10, 320, 16 + k * 10);
				m.pillar.material.uniforms.color.value.set(b.color);
				m.pillar.material.uniforms.alpha.value = Math.pow(1 - k, 2) * 0.9;
			});
			for (let i = bursts.length; i < burstMeshes.length; i++) burstMeshes[i].ring.visible = burstMeshes[i].pillar.visible = false;
		},
	};
}
