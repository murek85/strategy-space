(function (root) {
	const CHAPTERS = [
		"training",
		"colony1",
		"colony2",
		"colony3",
		"colony4",
		"colony5",
		"colony6",
		"colony7",
		"colony8",
		"colony9",
	];
	class CampaignProgress {
		constructor(storage) {
			this.storage = storage;
			this.completed = {};
			// Badges mark completed secondary objectives; choices keep story decisions (act II).
			this.badges = {};
			this.choices = {};
			try {
				const s = JSON.parse(
					storage?.getItem("pogranicze-campaign-v1") || "{}",
				);
				for (const id of CHAPTERS) {
					if (s[id] === true) this.completed[id] = true;
					if (s.badges?.[id] === true) this.badges[id] = true;
					if (["destroy", "evacuate"].includes(s.choices?.[id]))
						this.choices[id] = s.choices[id];
				}
			} catch {}
		}
		record(game) {
			if (!CHAPTERS.includes(game.missionId) || game.result !== "victory")
				return false;
			this.completed[game.missionId] = true;
			if (game.act2Secondary?.()) this.badges[game.missionId] = true;
			if (game.act2?.choice)
				this.choices[game.missionId] = game.act2.choice;
			try {
				this.storage.setItem(
					"pogranicze-campaign-v1",
					JSON.stringify({
						...this.completed,
						badges: this.badges,
						choices: this.choices,
					}),
				);
				return true;
			} catch {
				return false;
			}
		}
	}
	root.CampaignProgress = CampaignProgress;
	if (typeof module !== "undefined")
		module.exports = { CampaignProgress, CHAPTERS };
})(typeof window !== "undefined" ? window : globalThis);
