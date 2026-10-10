const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mime = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".svg": "image/svg+xml",
};
// The lobby of network battles (G4, 0.153) at ws://…/lobby on the same port.
const { mountLobby } = require("./lobby-server.js");
const server = http.createServer((req, res) => {
	let pathname;
	try {
		pathname = decodeURIComponent(
			new URL(req.url, "http://localhost").pathname,
		);
	} catch {
		res.writeHead(400).end();
		return;
	}
	const file = path.resolve(
		root,
		"." + (pathname === "/" ? "/index.html" : pathname),
	);
	// Inside the folder, and not its hidden folders (.git: the remote's address may hold a password) nor the
	// packages (0.171.16: the whole repository was served).
	const parts = path.relative(root, file).split(path.sep);
	if (!file.startsWith(root + path.sep) || parts.some((p) => p.startsWith(".") || p === "node_modules")) {
		res.writeHead(403).end();
		return;
	}
	fs.readFile(file, (err, data) => {
		if (err) {
			res.writeHead(404).end("Not found");
			return;
		}
		res.writeHead(200, {
			"Content-Type":
				mime[path.extname(file)] || "application/octet-stream",
			"Cache-Control": "no-store",
		});
		res.end(data);
	});
});
mountLobby(server);
// (The port it really got: PORT=0 lets the system choose one — the tests do.)
server.listen(port, process.env.HOST || "127.0.0.1", () =>
	console.log(`Pogranicze Galaktyki: http://127.0.0.1:${server.address().port}`),
);
