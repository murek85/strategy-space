/* The game's scripts for a test page, in the order index.html loads them (0.171.17): one list — the game's own —
   instead of a copy in every page, which went stale when a rules file was added. `skip`: the interface scripts the
   page does without (menus, films, the app). */
window.loadGameScripts = async (skip = []) => {
	const html = await (await fetch("../index.html", { cache: "no-store" })).text(),
		sources = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((src) => !skip.includes(src));
	for (const src of sources)
		await new Promise((resolve, reject) => {
			const el = document.createElement("script");
			el.src = "../" + src;
			el.onload = resolve;
			el.onerror = () => reject(Error("Nie udało się wczytać " + src));
			document.head.append(el);
		});
	return sources;
};
