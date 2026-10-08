/* npm run dist / dist:dir (G3, 0.151): electron-builder for Windows. The game's versions have two parts for a
   release (0.151) and three for a fix (0.150.2), but electron-builder reads package.json from disk and needs three
   (semver): for the build package.json carries 0.151.0, and the original file is put back afterwards — also on an
   error or Ctrl+C. --dir builds only the unpacked app (dist/win-unpacked). */
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, ".."),
	file = path.join(root, "package.json"),
	original = fs.readFileSync(file, "utf8"),
	pkg = JSON.parse(original),
	version = pkg.version.split(".").length === 2 ? pkg.version + ".0" : pkg.version;
let restored = false;
const restore = () => {
	if (restored) return;
	restored = true;
	fs.writeFileSync(file, original);
};
process.on("exit", restore);
process.on("SIGINT", () => process.exit(130));
if (version !== pkg.version) fs.writeFileSync(file, original.replace(`"version": "${pkg.version}"`, `"version": "${version}"`));
const builder = require("electron-builder");
builder
	.build({ projectDir: root, targets: builder.Platform.WINDOWS.createTarget(process.argv.includes("--dir") ? "dir" : null) })
	.then((files) => console.log(files.filter((f) => f.endsWith(".exe")).join("\n")))
	.catch((err) => {
		console.error(err.message || err);
		process.exitCode = 1;
	})
	.finally(restore);
