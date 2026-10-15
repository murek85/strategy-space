#!/usr/bin/env node
/* npm run web (0.177.6, as in the train game's tools/web.js): the browser version to put on a server — the folder
   web/pogranicze/ with the game's files and the archive web/pogranicze-<version>.zip (the same files). Only what the
   page needs:
   - everything index.html names (scripts, styles, icons — lang/en.js, webgl3d/model-light.js among them);
   - the 3D board's ES modules app.js imports while the game runs (webgl3d/three-game-renderer.js and what it imports,
     followed through the imports, so the list keeps up with the code), and webgl3d/bundle-3d.js — the same code in one
     script for the page opened from disk;
   - vendor/three.module.js (imported by the 3D modules), vendor/tone.min.js (loaded after the first gesture),
     vendor/README.md (the libraries' licences);
   - assets/: the menu's pictures and assets/sfx (the samples and their licences).
   Left out: the prototypes (prototyp-*.html, the model gallery, the Blender tank and its loader), the Node servers
   (server.js, lobby-server.js — without them the lobby game on a server does not work; the direct network game, with
   connection codes, does), tests, tools, docs. The ZIP is put together in Node (zlib, no extra packages). */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const ROOT = path.join(__dirname, "..");
const WEB = path.join(ROOT, "web"),
	NAME = "pogranicze",
	OUT = path.join(WEB, NAME);

// The 3D modules reached from an entry by its `import … from "./…"` lines (relative to the project).
function moduleGraph(entry) {
	const seen = new Set(),
		todo = [entry];
	while (todo.length) {
		const rel = todo.pop();
		if (seen.has(rel)) continue;
		seen.add(rel);
		const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
		for (const m of src.matchAll(/^\s*import\s[^;]*?from\s+"(\.{1,2}\/[^"]+)"/gm)) todo.push(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
	}
	return [...seen];
}

function files() {
	const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"),
		named = [...html.matchAll(/(?:src|href)="([^"#?:]+)"/g)].map((m) => m[1]).filter((f) => !f.endsWith("/") && fs.existsSync(path.join(ROOT, f))),
		list = new Set(["index.html", ...named, ...moduleGraph("webgl3d/three-game-renderer.js"), "webgl3d/bundle-3d.js", "vendor/tone.min.js", "vendor/README.md"]);
	for (const f of fs.readdirSync(path.join(ROOT, "assets"))) if (/\.(svg|png|webp)$/i.test(f)) list.add("assets/" + f);
	for (const f of fs.readdirSync(path.join(ROOT, "assets", "sfx"))) if (!f.startsWith(".")) list.add("assets/sfx/" + f);
	return [...list].sort();
}

// A ZIP of files under a folder name (deflate, CRC-32, the central directory; UTF-8 names).
function zip(list, name) {
	const CRC = new Int32Array(256).map((_, n) => {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		return c;
	});
	const crc32 = (b) => {
		let c = -1;
		for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
		return (c ^ -1) >>> 0;
	};
	const now = new Date(),
		dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1),
		dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
	const parts = [],
		central = [];
	let offset = 0;
	for (const rel of list) {
		const data = fs.readFileSync(path.join(ROOT, rel)),
			packed = zlib.deflateRawSync(data, { level: 9 }),
			store = packed.length >= data.length,
			body = store ? data : packed,
			file = Buffer.from(name + "/" + rel, "utf8"),
			crc = crc32(data);
		const head = Buffer.alloc(30);
		head.writeUInt32LE(0x04034b50, 0);
		head.writeUInt16LE(20, 4);
		head.writeUInt16LE(0x0800, 6);
		head.writeUInt16LE(store ? 0 : 8, 8);
		head.writeUInt16LE(dosTime, 10);
		head.writeUInt16LE(dosDate, 12);
		head.writeUInt32LE(crc, 14);
		head.writeUInt32LE(body.length, 18);
		head.writeUInt32LE(data.length, 22);
		head.writeUInt16LE(file.length, 26);
		parts.push(head, file, body);
		const cd = Buffer.alloc(46);
		cd.writeUInt32LE(0x02014b50, 0);
		cd.writeUInt16LE(20, 4);
		cd.writeUInt16LE(20, 6);
		cd.writeUInt16LE(0x0800, 8);
		cd.writeUInt16LE(store ? 0 : 8, 10);
		cd.writeUInt16LE(dosTime, 12);
		cd.writeUInt16LE(dosDate, 14);
		cd.writeUInt32LE(crc, 16);
		cd.writeUInt32LE(body.length, 20);
		cd.writeUInt32LE(data.length, 24);
		cd.writeUInt16LE(file.length, 28);
		cd.writeUInt32LE(offset, 42);
		central.push(cd, file);
		offset += 30 + file.length + body.length;
	}
	const cdSize = central.reduce((a, b) => a + b.length, 0),
		end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(list.length, 8);
	end.writeUInt16LE(list.length, 10);
	end.writeUInt32LE(cdSize, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...parts, ...central, end]);
}

module.exports = { files, moduleGraph };

if (require.main === module) {
	const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")),
		list = files();
	// The folder web/ from scratch.
	fs.rmSync(WEB, { recursive: true, force: true });
	for (const rel of list) {
		const dst = path.join(OUT, rel);
		fs.mkdirSync(path.dirname(dst), { recursive: true });
		fs.copyFileSync(path.join(ROOT, rel), dst);
	}
	const zipName = `${NAME}-${version}.zip`;
	fs.writeFileSync(path.join(WEB, zipName), zip(list, NAME));
	const size = list.reduce((a, rel) => a + fs.statSync(path.join(ROOT, rel)).size, 0),
		zsize = fs.statSync(path.join(WEB, zipName)).size,
		mb = (n) => (n / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";
	console.log(`Wersja przeglądarkowa ${version}: ${list.length} plików, ${mb(size)}`);
	console.log(`  folder:   web/${NAME}/  (zawartość wgraj do katalogu strony, np. public_html; wystarczy zwykły hosting statyczny)`);
	console.log(`  archiwum: web/${zipName}  (${mb(zsize)} – to samo w jednym pliku)`);
	console.log("Bez serwera Node (server.js) nie działa gra na serwerze z poczekalnią; gra sieciowa bezpośrednia (kody połączenia) działa.");
}
