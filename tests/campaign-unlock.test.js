const { test } = require("node:test");
const assert = require("node:assert/strict");
const { CampaignProgress, CHAPTERS } = require("../campaign");
const memory = () => {
	const data = {};
	return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => (data[k] = String(v)), removeItem: (k) => delete data[k] };
};

test("the test shortcut unlocks every chapter and a second press brings the earlier progress back", () => {
	const storage = memory(),
		progress = new CampaignProgress(storage);
	progress.completed.training = true;
	progress.choices.colony1 = "secret";
	progress.store();
	assert.equal(progress.toggleUnlockAll(), true);
	assert.ok(CHAPTERS.every((id) => progress.completed[id]));
	assert.ok(CHAPTERS.every((id) => new CampaignProgress(storage).completed[id]), "the unlock is stored");
	assert.equal(progress.toggleUnlockAll(), false);
	assert.deepEqual(progress.completed, { training: true });
	assert.equal(progress.choices.colony1, "secret");
	assert.equal(storage.getItem("pogranicze-campaign-backup-v1"), null);
});
