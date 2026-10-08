/* The game's files for the app:// protocol of the desktop app (G3, 0.151): a request path mapped onto a file of the
   game folder — never outside it — and its media type. Pure, shared by electron/main.js and the tests. */
const path = require("node:path");

const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif",
	".ico": "image/x-icon",
	".ogg": "audio/ogg",
	".mp3": "audio/mpeg",
	".wav": "audio/wav",
	".glb": "model/gltf-binary",
	".gltf": "model/gltf+json",
	".bin": "application/octet-stream",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
};

// The file for a URL path ("/" → index.html), or null for a path leaving the game folder or a bad encoding.
function resolveAsset(root, pathname) {
	let rel;
	try {
		rel = decodeURIComponent(pathname || "/");
	} catch {
		return null;
	}
	if (rel.includes("\0")) return null;
	if (rel === "/" || rel === "") rel = "/index.html";
	const base = path.resolve(root),
		file = path.resolve(base, "." + rel.replace(/\\/g, "/"));
	return file.startsWith(base + path.sep) ? file : null;
}

function mimeOf(file) {
	return MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
}

module.exports = { resolveAsset, mimeOf, MIME };
