/* Economy dashboard. Reports simulation data; buttons select units, move the camera or trade resources
   (the trade itself goes through the application's action, like every order). */
class EconomyPanel {
	constructor(root, action) {
		this.action = action;
		this.tab = "balance";
		this.tradeAmount = 100;
		this.lastRefresh = -Infinity;
		const legacy = document.createElement("div");
		legacy.hidden = true;
		for (const child of [...root.children])
			if (child.id !== "idle-workers") legacy.append(child);
		root.prepend(legacy);
		this.host = document.createElement("section");
		this.host.className = "economy-dashboard";
		this.host.innerHTML = `<header><span class="eyebrow">GOSPODARKA</span><span id="economy-window"></span></header><div class="economy-tabs" role="tablist" aria-label="Szczegóły gospodarki">${[
			["balance", "Bilans"],
			["workers", "Roboty"],
			["deposits", "Złoża"],
			["trade", "Handel"],
		]
			.map(
				([id, name], i) =>
					`<button id="eco-tab-${id}" type="button" role="tab" data-eco-tab="${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" aria-controls="economy-detail">${name}</button>`,
			)
			.join(
				"",
			)}</div><div id="economy-detail" role="tabpanel" aria-labelledby="eco-tab-balance" tabindex="0"></div>`;
		root.prepend(this.host);
		this.content = this.host.querySelector("#economy-detail");
		const buttons = [...this.host.querySelectorAll("[data-eco-tab]")];
		buttons.forEach((button, i) => {
			button.onclick = () => {
				this.tab = button.dataset.ecoTab;
				this.content.scrollTop = 0;
				for (const b of buttons) {
					const active = b === button;
					b.setAttribute("aria-selected", String(active));
					b.tabIndex = active ? 0 : -1;
				}
				this.content.setAttribute("aria-labelledby", button.id);
				this.signature = null;
				if (this.report) this.render();
			};
			button.onkeydown = (event) => {
				const n = buttons.length,
					index =
						event.key === "ArrowRight"
							? (i + 1) % n
							: event.key === "ArrowLeft"
								? (i + n - 1) % n
								: event.key === "Home"
									? 0
									: event.key === "End"
										? n - 1
										: null;
				if (index !== null) {
					event.preventDefault();
					buttons[index].click();
					buttons[index].focus();
				}
			};
		});
		this.content.onclick = (event) => {
			const b = event.target.closest("button");
			if (!b || b.disabled) return;
			if (b.dataset.amount) {
				this.tradeAmount = Number(b.dataset.amount);
				this.signature = null;
				this.render();
			} else if (b.dataset.from) this.action({ trade: [b.dataset.from, b.dataset.to, this.tradeAmount] });
			else if (b.dataset.role) this.action({ role: b.dataset.role });
			else if (b.dataset.x)
				this.action({ x: Number(b.dataset.x), y: Number(b.dataset.y) });
		};
	}
	update(game, enabled) {
		const now = performance.now();
		if (
			this.game === game &&
			now - this.lastRefresh < 400 &&
			this.enabled === enabled
		)
			return;
		this.lastRefresh = now;
		this.game = game;
		this.enabled = enabled;
		this.report = game.economyReport();
		// Trade: what the player has, and whether a depot or laboratory allows trading.
		this.stock = { metal: Math.floor(game.credits), gas: Math.floor(game.gas), crystals: Math.floor(game.crystals) };
		this.market = game.tradeRequirement?.() ?? "Handel niedostępny.";
		this.render();
	}
	render() {
		const r = this.report,
			fmt = (n) => Math.round(n).toLocaleString("pl-PL"),
			signature = JSON.stringify([r, this.tab, this.enabled, this.tab === "trade" ? [this.stock, this.market, this.tradeAmount] : 0]);
		if (signature === this.signature) return;
		this.signature = signature;
		this.host.querySelector("#economy-window").textContent = r.seconds
			? "Pomiar: " + r.seconds + " s"
			: "Zbieranie danych…";
		const disabled = this.enabled ? "" : " disabled";
		const alertHTML = (a) => {
			const action = a.role
				? `data-role="${a.role}"`
				: a.x !== undefined
					? `data-x="${a.x}" data-y="${a.y}"`
					: "";
			return action
				? `<button class="eco-alert ${a.severity || ""}" ${action}${disabled}>${a.text} <span aria-hidden="true">↗</span></button>`
				: `<p class="eco-alert ${a.severity || ""}">${a.text}</p>`;
		};
		let html;
		if (this.tab === "balance") {
			html = `<h3>Dochód / minutę</h3><dl class="eco-rates">${[
				["metal", "Metal"],
				["gas", "Gaz"],
				["crystals", "Kryształy"],
			]
				.map(
					([key, label]) =>
						`<div><dt>${label}</dt><dd>${r.seconds ? "+" + fmt(r.rates[key]) : "—"}</dd></div>`,
				)
				.join(
					"",
				)}</dl><p class="eco-note" title="Dostawy i dochód pasywny z ostatnich maksymalnie 60 sekund aktywnej gry. Bez zwrotów i wydatków. Pomiar co sekundę.">Średnia brutto · ostatnie maks. 60 s</p><p class="eco-breakdown">Metal: wydobycie <b>${r.seconds ? fmt(r.rates.metal - r.rates.passive) : "—"}</b> / pasywny <b>${r.seconds ? fmt(r.rates.passive) : "—"}</b> na min.</p><h3>Bilans mocy</h3><div class="eco-power ${r.reserve < 0 ? "danger" : ""}"><strong>${r.reserve >= 0 ? "+" : ""}${r.reserve}</strong><span>${r.reserve < 0 ? "Niedobór" : "Rezerwa"} mocy</span></div><p class="eco-note">Produkcja ${r.power.supply} · pobór ${r.power.demand}<br>Tempo wojska i badań: ${Math.round(r.power.factor * 100)}%</p>${r.power.capacity ? `<h3>Magazyn energii</h3><progress value="${r.power.energy}" max="${r.power.capacity}" aria-label="Zapas energii"></progress><p class="eco-note">${fmt(r.power.energy)} / ${r.power.capacity} energii · wsparcie ${fmt(r.power.discharge)} mocy<br>Ładowanie z nadwyżki, do 15/s na akumulator.</p>` : ""}<h3>Wymaga uwagi <span>${r.alerts.length}</span></h3><div class="eco-alerts">${r.alerts.length ? r.alerts.map(alertHTML).join("") : '<p class="eco-ok">Brak ostrzeżeń gospodarczych.</p>'}</div>`;
		} else if (this.tab === "workers") {
			const labels = {
				ore: "Wydobycie rudy",
				crystal: "Wydobycie kryształów",
				gas: "Obsługa gazu",
				build: "Budowa",
				repair: "Naprawa",
				other: "Ruch / pozostałe",
				idle: "Bezczynne",
			};
			html = `<h3>Przydziały robotów <span>${r.workers}</span></h3><p class="eco-note">Kliknij kategorię, aby zaznaczyć roboty. Przydział obejmuje też dojazd i transport ładunku.</p><div class="eco-workers">${Object.entries(
				r.roles,
			)
				.map(
					([role, ids]) =>
						`<button data-role="${role}" ${!ids.length ? "disabled" : disabled}><span>${labels[role]}</span><b>${ids.length}</b></button>`,
				)
				.join("")}</div>`;
		} else if (this.tab === "trade") {
			const T = RTS.TRADE,
				g = this.game,
				names = { metal: "Metal", gas: "Gaz", crystals: "Kryształy" },
				pairs = [
					["crystals", "metal"],
					["crystals", "gas"],
					["gas", "metal"],
					["gas", "crystals"],
					["metal", "gas"],
					["metal", "crystals"],
				];
			html = `<h3>Wymiana zasobów</h3><p class="eco-note">Niekorzystny kurs: tracisz ${Math.round((1 - T.rate) * 100)}% wartości. Dobre na nadmiar, którego nie wykorzystasz — zwłaszcza kryształy.</p>${this.market ? `<p class="eco-alert warning">${this.market}</p>` : ""}<div class="eco-trade-amount" role="group" aria-label="Ilość na wymianę">${[50, 100, 250]
				.map((n) => `<button data-amount="${n}" aria-pressed="${n === this.tradeAmount}">${n}</button>`)
				.join("")}</div><div class="eco-trade">${pairs
				.map(([from, to]) => {
					const amount = this.tradeAmount,
						got = g.tradeQuote(from, to, amount),
						off = !this.enabled || !!this.market || this.stock[from] < amount;
					return `<button data-from="${from}" data-to="${to}"${off ? " disabled" : ""} title="${names[from]}: masz ${fmt(this.stock[from])}"><span class="trade-${from}">${amount} ${T.genitive[from]}</span><span aria-hidden="true">→</span><b class="trade-${to}">${got} ${T.genitive[to]}</b></button>`;
				})
				.join("")}</div><p class="eco-note">Masz: ${fmt(this.stock.metal)} metalu · ${fmt(this.stock.gas)} gazu · ${fmt(this.stock.crystals)} kryształów.<br>Wartość: 1 gaz = ${T.value.gas} metalu, 1 kryształ = ${T.value.crystals} metalu. Wymaga magazynu polowego lub laboratorium.</p>`;
		} else {
			html = `<h3>Obsługiwane i pobliskie złoża</h3><p class="eco-note">Tylko widoczne złoża przy bazie lub obsługiwane przez roboty. Kliknij, aby pokazać na mapie.</p><div class="eco-deposits">${r.deposits.map((d) => `<button data-x="${d.x}" data-y="${d.y}" class="${d.low ? "low" : ""}"${disabled}><span><b>${{ ore: "Ruda", gas: "Gaz", crystal: "Kryształy" }[d.kind]} #${d.id}</b><strong>${fmt(d.amount)}</strong></span><small>${d.assigned} robotów${d.unmanned ? " · brak operatora" : ""}${d.distance !== null ? " · rozładunek ~" + fmt(d.distance) + " m w linii prostej" : ""}${d.low ? (d.amount ? " · niski zapas" : " · wyczerpane") : ""}</small></button>`).join("") || '<p class="eco-ok">Brak widocznych złóż w tej kategorii.</p>'}</div>`;
		}
		// Preserve focus across periodic updates to make keyboard actions reliable.
		const focused = this.content.contains(document.activeElement)
			? document.activeElement
			: null;
		const key = focused?.dataset.role
			? ["role", focused.dataset.role]
			: focused?.dataset.x
				? ["x", focused.dataset.x]
				: null;
		const scroll = this.content.scrollTop;
		this.content.innerHTML = html;
		this.content.scrollTop = scroll;
		if (key) {
			const replacement = [
				...this.content.querySelectorAll("button"),
			].find((b) => b.dataset[key[0]] === key[1]);
			if (replacement && !replacement.disabled)
				replacement.focus({ preventScroll: true });
			else this.content.focus({ preventScroll: true });
		}
	}
}
