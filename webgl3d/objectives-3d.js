/* Objectives and battlefield powers of the 3D renderer, as 3D objects over the 2D overlay (which keeps
   the rings, progress arcs and captions). Visual only; shown by the same rules as the overlay.
   - Shield domes: a hemisphere over every working shield generator, its rim glowing (fresnel) with the
     charge and flashing when hit; a dim red one while overloaded.
   - Orbital strikes: a column of light over the target that narrows and brightens to the impact.
   - Expedition artifact: a golden crystal floating and turning over its site or its carrier, with a beam
     of light while it lies on the ground.
   - King of the hill: a light pillar over the Peak in the holder's colour, a ring turning around it.
   - Mission markers of act II (Act2Art beacons, collected while the overlay is drawn): light pillars. */
export function createObjectives3D(THREE, { world, heightAt }) {
	const group = new THREE.Group();
	world.add(group);
	// Glowing materials: additive, no depth writes, alpha from a shape term in the shader.
	const fresnel = () =>
		new THREE.ShaderMaterial({
			uniforms: { color: { value: new THREE.Color() }, strength: { value: 0 } },
			vertexShader: `varying vec3 vN; varying vec3 vV;
				void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
			fragmentShader: `uniform vec3 color; uniform float strength; varying vec3 vN; varying vec3 vV;
				void main() { float rim = pow(1.0 - abs(dot(vN, vV)), 2.5); gl_FragColor = vec4(color, strength * (0.12 + rim)); }`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
		});
	// A vertical beam fading upward (uv.y of an open cylinder) and towards its sides.
	const beam = () =>
		new THREE.ShaderMaterial({
			uniforms: { color: { value: new THREE.Color() }, strength: { value: 0 } },
			// Soft sides: bright where the beam faces the camera, fading towards its silhouette.
			vertexShader: `varying float vUp; varying vec3 vN; varying vec3 vV;
				void main() { vUp = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
			fragmentShader: `uniform vec3 color; uniform float strength; varying float vUp; varying vec3 vN; varying vec3 vV;
				void main() { float core = pow(abs(dot(vN, vV)), 2.0); gl_FragColor = vec4(color, strength * core * pow(1.0 - vUp, 1.6)); }`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
		});
	const geo = {
		dome: new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2),
		column: new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0),
		crystal: new THREE.OctahedronGeometry(1),
		ring: new THREE.TorusGeometry(1, 0.03, 6, 48).rotateX(Math.PI / 2),
	};
	const gold = new THREE.MeshStandardMaterial({ color: "#f5e27a", emissive: "#c9a830", emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.4, flatShading: true });
	const pool = new Map();
	function take(key, make) {
		let o = pool.get(key);
		if (!o) {
			o = make();
			group.add(o);
			pool.set(key, o);
		}
		o.visible = true;
		o.userData.seen = true;
		return o;
	}
	const mesh = (g, m) => {
		const o = new THREE.Mesh(g, m);
		o.renderOrder = 4;
		o.frustumCulled = false;
		return o;
	};

	function update(game, time, { beacons = [], colorOf }) {
		for (const o of pool.values()) o.userData.seen = false;
		const viewer = game.viewer ?? 0;

		// Shield domes (SupportArt.overlay rules).
		const shield = RTS.SUPPORT?.shield;
		if (shield)
			for (const e of game.entities) {
				if (e.type !== "shieldgen" || e.hp <= 0 || e.constructionLeft || (e.team !== viewer && !game.isVisible(e.x, e.y))) continue;
				const over = (e.overload || 0) > 0,
					charge = Math.max(0, Math.min(1, (e.shield || 0) / shield.capacity)),
					flash = Math.min(1, (e.flash || 0) * 3);
				if (!over && charge <= 0.02) continue;
				const dome = take("dome" + e.id, () => mesh(geo.dome, fresnel()));
				dome.position.set(e.x, heightAt(e.x, e.y) - 4, e.y);
				dome.scale.set(shield.range, shield.range * 0.55, shield.range);
				dome.material.uniforms.color.value.set(over ? "#e36d5e" : flash > 0.05 ? "#d8fbff" : "#8ce6f5");
				dome.material.uniforms.strength.value = over ? 0.18 + 0.1 * Math.sin(time * 9) : 0.25 + charge * 0.45 + flash * 0.8;
			}

		// Orbital strikes (FactionArt.overlay rules).
		const strike = RTS.FACTION_FX?.strike;
		if (strike)
			for (const s of game.strikes || []) {
				if (!game.allied(viewer, s.team) && !game.isVisible(s.x, s.y)) continue;
				const k = Math.max(0, s.at - game.time) / strike.delay,
					col = take("strike" + s.x + "|" + s.y + "|" + s.at, () => mesh(geo.column, beam()));
				col.position.set(s.x, heightAt(s.x, s.y), s.y);
				const r = strike.radius * (0.12 + 0.3 * k);
				col.scale.set(r, 1400, r);
				col.material.uniforms.color.value.set(k < 0.25 ? "#ffd0a0" : "#ff5a3c");
				col.material.uniforms.strength.value = 0.25 + (1 - k) * 0.9 + Math.sin(time * 14) * 0.08;
			}

		// Expedition artifact (drawArtifact rules): floating over its site, or over its carrier.
		const a = game.modeState?.artifact;
		if (a) {
			const carried = a.carrier != null,
				ground = heightAt(a.x, a.y),
				gem = take("artifact", () => {
					const o = mesh(geo.crystal, gold);
					o.castShadow = true;
					return o;
				});
			gem.position.set(a.x, ground + (carried ? 58 : 34) + Math.sin(time * 2) * 4, a.y);
			gem.scale.set(11, 20, 11);
			gem.rotation.y = time * 1.2;
			const ray = take("artifactBeam", () => mesh(geo.column, beam()));
			ray.visible = !carried;
			ray.position.set(a.x, ground, a.y);
			ray.scale.set(14, 520, 14);
			ray.material.uniforms.color.value.set("#f5e27a");
			ray.material.uniforms.strength.value = 0.35 + 0.15 * Math.sin(time * 3);
		}

		// King of the hill: the Peak's pillar in the holder's colour.
		const hill = game.modeState?.mode === "hill" && game.nodes.find((n) => n.hill);
		if (hill) {
			const holder = hill.owner >= 0 && hill.owner !== 2 ? hill.owner : -1,
				color = holder >= 0 ? colorOf(holder) : "#f5e27a",
				ground = heightAt(hill.x, hill.y),
				pillar = take("hill", () => mesh(geo.column, beam())),
				ring = take("hillRing", () => mesh(geo.ring, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));
			pillar.position.set(hill.x, ground, hill.y);
			pillar.scale.set(26, 700, 26);
			pillar.material.uniforms.color.value.set(color);
			pillar.material.uniforms.strength.value = 0.45;
			ring.position.set(hill.x, ground + 90 + Math.sin(time) * 10, hill.y);
			ring.scale.setScalar(70);
			ring.rotation.y = time * 0.6;
			ring.material.color.set(color);
		}

		// Act II mission markers.
		beacons.forEach((b, i) => {
			const pillar = take("beacon" + i, () => mesh(geo.column, beam()));
			pillar.position.set(b.x, heightAt(b.x, b.y), b.y);
			pillar.scale.set(10, 420, 10);
			pillar.material.uniforms.color.value.set(b.color);
			pillar.material.uniforms.strength.value = 0.5 + 0.15 * Math.sin(time * 3 + i);
		});

		for (const [key, o] of pool)
			if (!o.userData.seen) {
				if (key.startsWith("strike")) {
					group.remove(o);
					o.material.dispose();
					pool.delete(key);
				} else o.visible = false;
			}
	}
	return {
		update,
		setGame() {
			for (const o of pool.values()) {
				group.remove(o);
				if (o.material !== gold) o.material.dispose();
			}
			pool.clear();
		},
	};
}
