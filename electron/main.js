/* The desktop app (G3, 0.151): the game in an Electron window, offline.
   - The game's files are served by the app:// protocol (electron/assets.js) instead of file://: ES modules of the 3D
     renderer, fetch of sounds and models and a stable origin for the saves (localStorage) work as on the dev server.
     Files are read with fs, so they work from the packed app.asar too.
   - Window without a menu bar; F11 or Alt+Enter — full screen; size, position, maximised and full screen remembered
     (userData/window.json). One instance at a time.
   - Locked down: context isolation, sandbox, no Node in the page; navigation only within app://game, web links open
     in the system browser, no new windows. The page gets a small API (electron/preload.js → window.desktop).
   - Developer tools with Ctrl+Shift+I only when not packaged.
   - The lobby server for network battles in the local network, started on request (desktop.lobby(), 0.153). */
const { app, BrowserWindow, protocol, shell, ipcMain, Menu, screen } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { resolveAsset, mimeOf } = require("./assets");

const ROOT = path.join(__dirname, ".."),
	ORIGIN = "app://game",
	STATE_FILE = () => path.join(app.getPath("userData"), "window.json");

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
Menu.setApplicationMenu(null);

if (!app.requestSingleInstanceLock()) app.quit();

function loadState() {
	try {
		const s = JSON.parse(fs.readFileSync(STATE_FILE(), "utf8"));
		return s && typeof s === "object" ? s : {};
	} catch {
		return {};
	}
}
function saveState(win) {
	if (!win || win.isDestroyed()) return;
	const bounds = win.getNormalBounds();
	try {
		fs.writeFileSync(STATE_FILE(), JSON.stringify({ ...bounds, maximized: win.isMaximized(), fullscreen: win.isFullScreen() }));
	} catch {}
}
// A remembered position only when it still lies on one of the screens.
function onScreen(s) {
	if (![s.x, s.y, s.width, s.height].every(Number.isFinite)) return false;
	return screen.getAllDisplays().some(({ workArea: a }) => s.x + 80 > a.x && s.y + 40 > a.y && s.x < a.x + a.width - 80 && s.y < a.y + a.height - 40);
}

let win = null;
function createWindow() {
	const state = loadState(),
		placed = onScreen(state);
	win = new BrowserWindow({
		width: Math.max(1024, state.width || 1600),
		height: Math.max(640, state.height || 900),
		...(placed ? { x: state.x, y: state.y } : {}),
		minWidth: 1024,
		minHeight: 640,
		show: false,
		backgroundColor: "#071016",
		title: "Pogranicze Galaktyki",
		icon: path.join(ROOT, "build", "icon.png"),
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			spellcheck: false,
			backgroundThrottling: false,
		},
	});
	if (state.maximized) win.maximize();
	if (state.fullscreen) win.setFullScreen(true);
	win.once("ready-to-show", () => win.show());

	const wc = win.webContents;
	wc.on("will-navigate", (e, url) => {
		if (url.startsWith(ORIGIN + "/")) return;
		e.preventDefault();
		if (/^https?:\/\//.test(url)) shell.openExternal(url);
	});
	wc.setWindowOpenHandler(({ url }) => {
		if (/^https?:\/\//.test(url)) shell.openExternal(url);
		return { action: "deny" };
	});
	wc.on("before-input-event", (e, input) => {
		if (input.type !== "keyDown") return;
		if (input.key === "F11" || (input.alt && input.key === "Enter")) {
			win.setFullScreen(!win.isFullScreen());
			e.preventDefault();
		} else if (!app.isPackaged && input.control && input.shift && input.key.toLowerCase() === "i") {
			wc.toggleDevTools();
			e.preventDefault();
		}
	});
	for (const event of ["enter-full-screen", "leave-full-screen"]) win.on(event, () => wc.send("desktop:fullscreen", win.isFullScreen()));
	win.on("close", () => saveState(win));
	win.on("closed", () => (win = null));
	if (process.env.POGRANICZE_CHECK) selfCheck(win);
	win.loadURL(ORIGIN + "/index.html");
}

// npm run app:check — the app starts, loads the game, starts a battle with the 3D renderer (its ES modules are what
// app:// is for; the player's renderer choice is restored after), reports what it found and the page's errors, and
// quits (exit code 1 on a problem).
function selfCheck(w) {
	const errors = [];
	w.webContents.on("console-message", (e) => {
		if (e.level === "error") errors.push(e.message);
	});
	w.webContents.on("did-fail-load", (_, code, text, url) => errors.push(`load ${url}: ${text}`));
	w.webContents.once("did-finish-load", async () => {
		await new Promise((r) => setTimeout(r, 3000));
		let report;
		try {
			report = await w.webContents.executeJavaScript(`(async () => {
				const before = SceneFX.options.renderer;
				SceneFX.set("renderer", "three");
				// The main thread's long blocks while the map loads (ms) — the loading bar runs on the compositor.
				const blocks = [],
					watch = new PerformanceObserver((l) => l.getEntries().forEach((e) => blocks.push(Math.round(e.duration))));
				watch.observe({ type: "longtask" });
				const m = currentMenu();
				m.selectedMission = "horizon";
				m.scenario = { ...(m.scenario || {}), size: "medium", players: 2, difficulty: "normal", mode: "conquest" };
				m.launch();
				for (let i = 0; i < 30 && currentGame()?.missionId !== "horizon"; i++) await new Promise((r) => setTimeout(r, 500));
				// The 3D board takes a while to build: wait for it (and for the battle clock to run).
				for (let i = 0; i < 50 && !(currentRendererMode() === "three" && currentGame()?.time > 1); i++) await new Promise((r) => setTimeout(r, 500));
				const g = currentGame(),
					three = currentRendererMode() === "three";
				watch.disconnect();
				SceneFX.set("renderer", before);
				return { origin: location.origin, desktop: !!window.desktop?.app, renderer3d: three, blocks, mission: g?.missionId, time: Math.round(g?.time || 0), storage: (() => { try { localStorage.setItem("pogranicze-check", "1"); localStorage.removeItem("pogranicze-check"); return true; } catch { return false; } })() };
			})()`);
		} catch (err) {
			errors.push(String(err));
		}
		// POGRANICZE_SHOT=<file.png>: a picture of the window with the battle.
		if (process.env.POGRANICZE_SHOT)
			try {
				await new Promise((r) => setTimeout(r, 3000));
				fs.writeFileSync(process.env.POGRANICZE_SHOT, (await w.webContents.capturePage()).toPNG());
			} catch {}
		const out = JSON.stringify({ report, errors }, null, 1);
		console.log(out);
		// A packed Windows app has no console: POGRANICZE_CHECK=<file> writes the report there.
		if (process.env.POGRANICZE_CHECK !== "1")
			try {
				fs.writeFileSync(process.env.POGRANICZE_CHECK, out);
			} catch {}
		app.exit(errors.length || !report?.mission || !report?.renderer3d ? 1 : 0);
	});
}

ipcMain.handle("desktop:fullscreen:get", () => !!win?.isFullScreen());
ipcMain.handle("desktop:fullscreen:set", (_, on) => {
	win?.setFullScreen(!!on);
	return !!win?.isFullScreen();
});
ipcMain.handle("desktop:quit", () => app.quit());
// The lobby server for the local network (G4, 0.153): started on demand, port 4174 (another one if taken).
let localLobby = null;
ipcMain.handle("desktop:lobby", async () => {
	const { startLobbyServer } = require("../lobby-server.js");
	if (!localLobby) localLobby = await startLobbyServer(4174).catch(() => startLobbyServer(0));
	const addresses = Object.values(require("node:os").networkInterfaces())
		.flat()
		.filter((n) => n && n.family === "IPv4" && !n.internal)
		.map((n) => n.address);
	return { port: localLobby.port, addresses };
});

app.on("second-instance", () => {
	if (!win) return;
	if (win.isMinimized()) win.restore();
	win.focus();
});

app.whenReady().then(() => {
	protocol.handle("app", async (request) => {
		const url = new URL(request.url),
			file = url.host === "game" ? resolveAsset(ROOT, url.pathname) : null;
		if (!file) return new Response("Not found", { status: 404 });
		try {
			return new Response(await fs.promises.readFile(file), { headers: { "content-type": mimeOf(file) } });
		} catch {
			return new Response("Not found", { status: 404 });
		}
	});
	createWindow();
	app.on("activate", () => {
		if (!BrowserWindow.getAllWindows().length) createWindow();
	});
});
app.on("window-all-closed", () => app.quit());
