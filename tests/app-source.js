// The app's source for the tests that read it (0.173, I4): app.js and the modules split out of it (app-*.js, in
// index.html's order) — what was in app.js is found wherever it moved.
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
module.exports = function appSource() {
	const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"),
		files = [...html.matchAll(/<script src="(app(?:-[a-z]+)?\.js)"/g)].map((m) => m[1]);
	return files.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
};
