/* npm run app:check (G3, 0.151): starts the desktop app in its self-check mode (electron/main.js, selfCheck) —
   it loads the game, starts a battle, prints a report with the page's errors and quits; the exit code says if it
   worked. Also builds the 3D bundle first, as the packed app needs it. */
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const root = path.join(__dirname, "..");
spawnSync(process.execPath, [path.join(root, "tools", "build-3d.js")], { stdio: "inherit" });
const electron = require("electron");
const r = spawnSync(electron, [root], { stdio: "inherit", env: { ...process.env, POGRANICZE_CHECK: "1" } });
process.exit(r.status ?? 1);
