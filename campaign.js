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
		"colony10",
		"colony11",
		"colony12",
		"colony13",
		"colony14",
	];
	// Story decisions kept between chapters (campaign-act2.js, campaign-choices.js).
	const CHOICES = {
		colony1: ["appeal", "secret"],
		colony3: ["arsenal", "prisoners"],
		colony6: ["destroy", "evacuate"],
		colony8: ["trust", "distance"],
		colony12: ["garrison", "shipyard"],
		colony13: ["truce", "rout"],
	};
	class CampaignProgress {
		constructor(storage) {
			this.storage = storage;
			this.completed = {};
			// Badges mark completed secondary objectives; choices keep story decisions (act II).
			this.badges = {};
			this.choices = {};
			// What a chapter leaves for the next one (act IV: the drop pods the fleet of X makes for XI).
			this.carry = {};
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
				const pods = s.carry?.colony10?.pods;
				if (Number.isInteger(pods) && pods >= 0 && pods <= 8) this.carry.colony10 = { pods };
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
			const carry = game.campaignCarry?.();
			if (carry) this.carry[game.missionId] = carry;
			return this.store();
		}
		setDifficulty(level) {
			if (!["easy", "normal", "hard"].includes(level)) return false;
			this.difficulty = level;
			return this.store();
		}
		// For tests: every chapter completed at once; the earlier progress is kept aside and comes back with a
		// second call. Returns true when the campaign is now unlocked, false when the earlier progress is back.
		toggleUnlockAll() {
			const BACKUP = "pogranicze-campaign-backup-v1";
			let saved = null;
			try {
				saved = this.storage?.getItem(BACKUP);
			} catch {}
			if (saved) {
				try {
					this.storage.setItem("pogranicze-campaign-v1", saved);
					this.storage.removeItem(BACKUP);
				} catch {}
				Object.assign(this, new CampaignProgress(this.storage));
				return false;
			}
			try {
				this.storage?.setItem(BACKUP, this.storage.getItem("pogranicze-campaign-v1") || "{}");
			} catch {}
			for (const id of CHAPTERS) this.completed[id] = true;
			this.store();
			return true;
		}
		store() {
			try {
				this.storage.setItem(
					"pogranicze-campaign-v1",
					JSON.stringify({
						...this.completed,
						badges: this.badges,
						choices: this.choices,
						carry: this.carry,
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
