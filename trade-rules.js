/* Resource trade: metal, gas and crystals exchanged at an unfavourable rate (a way to use a surplus, never a
   profit). Needs a finished field depot or laboratory of the player. Every trade loses 40% of the value.
   Values: 1 gas = 3 metal, 1 crystal = 2 metal. Examples: 100 crystals → 120 metal or 40 gas; 100 gas → 180
   metal or 90 crystals; 100 metal → 20 gas or 30 crystals. A network action too (network-rules.js). */
(function (root) {
	function install(RTS) {
		if (RTS.tradeInstalled) return;
		RTS.tradeInstalled = true;
		const { Game } = RTS;
		const TRADE = (RTS.TRADE = {
			// Worth of one unit, in metal.
			value: { metal: 1, gas: 3, crystals: 2 },
			// Share of the value that reaches the buyer.
			rate: 0.6,
			// Buildings that allow trade (finished, of the player).
			buildings: ["depot", "lab"],
			max: 5000,
			// State field and names (Polish forms: nominative plural and genitive plural).
			field: { metal: "credits", gas: "gas", crystals: "crystals" },
			name: { metal: "metal", gas: "gaz", crystals: "kryształy" },
			genitive: { metal: "metalu", gas: "gazu", crystals: "kryształów" },
		});
		const valid = (from, to) => from !== to && Object.hasOwn(TRADE.value, from) && Object.hasOwn(TRADE.value, to);

		Object.assign(Game.prototype, {
			// What the player gets for `amount` of `from` (0 when the trade makes no sense).
			tradeQuote(from, to, amount) {
				if (!valid(from, to) || !Number.isInteger(amount) || amount < 1) return 0;
				return Math.floor((amount * TRADE.value[from] * TRADE.rate) / TRADE.value[to]);
			},
			// Why the player cannot trade now ("" when trading is possible).
			tradeRequirement() {
				const market = this.entities.some((e) => e.team === this.me && e.hp > 0 && !e.constructionLeft && TRADE.buildings.includes(e.type));
				return market ? "" : "Handel wymaga ukończonego magazynu polowego lub laboratorium.";
			},
			trade(from, to, amount) {
				if (this.result || !valid(from, to) || !Number.isInteger(amount) || amount < 1 || amount > TRADE.max) return false;
				const reason = this.tradeRequirement();
				if (reason) {
					this.notify(reason);
					return false;
				}
				const have = this[TRADE.field[from]];
				if (have < amount) {
					this.notify(`Handel: za mało zasobu (${TRADE.name[from]}) — masz ${Math.floor(have)}.`);
					return false;
				}
				const got = this.tradeQuote(from, to, amount);
				if (got < 1) return false;
				this[TRADE.field[from]] -= amount;
				this[TRADE.field[to]] += got;
				this.notify(`Handel: ${amount} ${TRADE.genitive[from]} → ${got} ${TRADE.genitive[to]}.`);
				return got;
			},
		});
	}
	if (typeof module !== "undefined" && module.exports) module.exports = install;
	else install(root.RTS);
})(typeof window !== "undefined" ? window : globalThis);
