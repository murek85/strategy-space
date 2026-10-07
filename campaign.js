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
	// Story decisions kept between chapters (campaign-act2.js, campaign-choices.js).
	const CHOICES = {
		colony1: ["appeal", "secret"],
		colony3: ["arsenal", "prisoners"],
		colony6: ["destroy", "evacuate"],
		colony8: ["trust", "distance"],
	};
	class CampaignProgress {
		constructor(storage) {
			this.storage = storage;
			this.completed = {};
			// Badges mark completed secondary objectives; choices keep story decisions (act II).
			this.badges = {};
			this.choices = {};
			// The campaign difficulty (easy, normal, hard): the commander AI and the enemy's strength.
			this.difficulty = "normal";
			try {
				const s = JSON.parse(
					storage?.getItem("pogranicze-campaign-v1") || "{}",
				);
				for (const id of CHAPTERS) {
					if (s[id] === true) this.completed[id] = true;
					if (s.badges?.[id] === true) this.badges[id] = true;
					if (CHOICES[id]?.includes(s.choices?.[id]))
						this.choices[id] = s.choices[id];
				}
				if (["easy", "normal", "hard"].includes(s.difficulty))
					this.difficulty = s.difficulty;
			} catch {}
		}
		record(game) {
			if (!CHAPTERS.includes(game.missionId) || game.result !== "victory")
				return false;
			this.completed[game.missionId] = true;
			if (game.act2Secondary?.()) this.badges[game.missionId] = true;
			const choice = game.campaignChoice?.() ?? game.act2?.choice;
			if (CHOICES[game.missionId]?.includes(choice))
				this.choices[game.missionId] = choice;
			return this.store();
		}
		setDifficulty(level) {
			if (!["easy", "normal", "hard"].includes(level)) return false;
			this.difficulty = level;
			return this.store();
		}
		store() {
			try {
				this.storage.setItem(
					"pogranicze-campaign-v1",
					JSON.stringify({
						...this.completed,
						badges: this.badges,
						choices: this.choices,
						difficulty: this.difficulty,
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
