/* Pictures of the 3D models for the interface (0.175.12): the knowledge base cards, the development tree's preview
   and the icons of the production deck show the game's own 3D models instead of the old 2D drawings. The pictures
   come from webgl3d/model-portraits.js, through the 3D code app.js loads anyway (ModelIcons.loader); each look is
   rendered once — one a frame, so a screen of cards does not stall — and kept for the page.
   Without WebGL or when the 3D code does not load, the 2D drawing already in place stays. */
const ModelIcons = (() => {
	const cache = new Map(), // key -> canvas (null: no model for it)
		waiting = new Map(), // key -> [callbacks]
		queue = [];
	let studio = null,
		failed = false,
		pumping = false;
	const api = {
		// app.js: () => the 3D module (load3D).
		loader: null,
		enabled() {
			return !failed && typeof api.loader === "function";
		},
		key(e, o = {}) {
			return [e.type, e.team ?? 0, e.faction || "", e.tint || "", (o.colors || []).join(","), o.space ? "space" : "", o.width, o.height, o.fill ?? "", o.pitch ?? ""].join("|");
		},
		// The picture of entity e at o.width × o.height, to `done(canvas)` — at once when kept, later when rendered;
		// not at all when it cannot be (no model, no 3D).
		picture(e, o, done) {
			if (!api.enabled()) return false;
			const key = api.key(e, o);
			if (cache.has(key)) {
				if (cache.get(key)) done(cache.get(key));
				return true;
			}
			if (waiting.has(key)) waiting.get(key).push(done);
			else {
				waiting.set(key, [done]);
				queue.push({ key, e: { ...e }, o: { ...o } });
				pump();
			}
			return true;
		},
		// Paints the picture over a canvas (its 2D drawing stays until the model is ready).
		paint(canvas, e, o = {}) {
			const opts = { width: canvas.width, height: canvas.height, ...o },
				key = api.key(e, opts);
			// (One canvas may show another model meanwhile — the development tree's preview: the last asked wins.)
			canvas.dataset.modelKey = key;
			return api.picture(e, opts, (pic) => {
				if (!canvas.isConnected || canvas.dataset.modelKey !== key) return;
				const c = canvas.getContext("2d");
				c.setTransform(1, 0, 0, 1, 0, 0);
				c.clearRect(0, 0, canvas.width, canvas.height);
				c.drawImage(pic, 0, 0, canvas.width, canvas.height);
				canvas.dataset.model3d = "1";
			});
		},
		// An icon in `el` (the deck's symbol): an image of the model, the symbol hidden once it is there.
		icon(el, e, o = {}) {
			const opts = { ...ICON, ...o },
				key = api.key(e, opts);
			el.dataset.modelKey = key;
			return api.picture(e, opts, (pic) => {
				if (!el.isConnected || el.dataset.modelKey !== key) return;
				let img = el.querySelector("img.model-icon");
				if (!img) {
					img = document.createElement("img");
					img.className = "model-icon";
					img.alt = "";
					img.decoding = "async";
					el.append(img);
				}
				img.src = pic.dataURL ||= pic.toDataURL("image/png");
				el.classList.add("has-model");
			});
		},
		// For HTML written as a string (the HUD, rebuilt often, 0.175.14): the icon's image address when it is
		// rendered — asked for, and null, until then; `version` grows with every new picture, so the HUD knows
		// to write itself again.
		url(e, o = {}) {
			const opts = { ...ICON, ...o },
				key = api.key(e, opts);
			if (!cache.has(key)) {
				api.picture(e, opts, () => {});
				return null;
			}
			const pic = cache.get(key);
			return pic ? (pic.dataURL ||= pic.toDataURL("image/png")) : null;
		},
		version: 0,
	};
	// The icons' shared look: one picture serves the deck, the queues and the selection.
	const ICON = { width: 96, height: 96, fill: 0.96, pitch: 0.42 };
	async function pump() {
		if (pumping) return;
		pumping = true;
		try {
			if (!studio) {
				const mod = await api.loader();
				studio = mod?.modelPortraits?.();
				if (!studio) throw Error("no model portraits in the 3D code");
			}
			while (queue.length) {
				await new Promise((r) => (document.hidden ? setTimeout(r, 30) : requestAnimationFrame(() => r())));
				const job = queue.shift();
				let pic = null;
				try {
					pic = studio.render(job.e, job.o);
				} catch (error) {
					console.warn("ModelIcons:", job.e.type, error);
				}
				cache.set(job.key, pic);
				if (pic) api.version++;
				const done = waiting.get(job.key) || [];
				waiting.delete(job.key);
				if (pic) for (const f of done) f(pic);
			}
		} catch (error) {
			// No WebGL, or the 3D code did not load: the 2D drawings stay.
			console.warn("ModelIcons:", error);
			failed = true;
			queue.length = 0;
			waiting.clear();
		} finally {
			pumping = false;
		}
	}
	return api;
})();
if (typeof window !== "undefined") window.ModelIcons = ModelIcons;
