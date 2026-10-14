/* The game's icons (G3, 0.151; favicon 0.175.4): the game's mark ◈ — a diamond in a diamond, the interface's mint on
   the deck's dark blue — drawn from one shape at several sizes:
   - build/icon.png 512×512 — the installer's icon (electron-builder makes the Windows .ico from it);
   - favicon.ico (16/24/32/48/64/256, PNG entries) — the browser tab's icon and the Electron window's icon (build/ is
     left out of the packed app, the game folder is not);
   - favicon.svg — the sharp tab icon of browsers that read SVG.
   node tools/make-icon.js */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const ROOT = path.join(__dirname, ".."),
	SS = 4; // supersampling per axis
const BG = [7, 16, 22],
	PANEL = [14, 30, 38],
	EDGE = [56, 92, 98],
	MINT = [127, 231, 200];

// Rounded square of the tile, diamonds of the mark (|x| + |y| < r in the tile's centre frame), in units of a 512 tile.
// Small icons drop the tile's margin, so the mark keeps its pixels.
function colourAt(x, y, small) {
	const c = 256,
		dx = x - c,
		dy = y - c,
		r = 92,
		inset = small ? 8 : 36;
	const qx = Math.max(Math.abs(dx) - (c - inset - r), 0),
		qy = Math.max(Math.abs(dy) - (c - inset - r), 0),
		box = Math.hypot(qx, qy) - r;
	if (box > 0) return null;
	const d = Math.abs(dx) + Math.abs(dy);
	if (d < 74) return MINT;
	if (d > 140 && d < 168) return MINT;
	if (box > -9 * (small ? 2.5 : 1)) return EDGE;
	return PANEL;
}

function render(S) {
	const k = 512 / S,
		small = S <= 64,
		rgba = Buffer.alloc(S * S * 4);
	for (let y = 0; y < S; y++)
		for (let x = 0; x < S; x++) {
			let r = 0,
				g = 0,
				b = 0,
				a = 0;
			for (let j = 0; j < SS; j++)
				for (let i = 0; i < SS; i++) {
					const col = colourAt((x + (i + 0.5) / SS) * k, (y + (j + 0.5) / SS) * k, small);
					if (!col) continue;
					r += col[0];
					g += col[1];
					b += col[2];
					a++;
				}
			const o = (y * S + x) * 4;
			rgba[o] = a ? Math.round(r / a) : BG[0];
			rgba[o + 1] = a ? Math.round(g / a) : BG[1];
			rgba[o + 2] = a ? Math.round(b / a) : BG[2];
			rgba[o + 3] = Math.round((255 * a) / (SS * SS));
		}
	return rgba;
}

// PNG: signature, IHDR, IDAT (each row with filter byte 0), IEND.
const crcTable = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
const crc = (buf) => {
	let c = 0xffffffff;
	for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
	const len = Buffer.alloc(4),
		body = Buffer.concat([Buffer.from(type, "ascii"), data]),
		sum = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	sum.writeUInt32BE(crc(body));
	return Buffer.concat([len, body, sum]);
};
function png(S) {
	const rgba = render(S),
		ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(S, 0);
	ihdr.writeUInt32BE(S, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // RGBA
	const raw = Buffer.alloc(S * (S * 4 + 1));
	for (let y = 0; y < S; y++) rgba.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
	return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ICO with PNG entries: ICONDIR, one ICONDIRENTRY per size (0 means 256), the images.
function ico(sizes) {
	const images = sizes.map(png),
		head = Buffer.alloc(6 + 16 * sizes.length);
	head.writeUInt16LE(1, 2);
	head.writeUInt16LE(sizes.length, 4);
	let offset = head.length;
	sizes.forEach((S, n) => {
		const e = 6 + 16 * n;
		head[e] = head[e + 1] = S >= 256 ? 0 : S;
		head.writeUInt16LE(1, e + 4); // planes
		head.writeUInt16LE(32, e + 6); // bits per pixel
		head.writeUInt32LE(images[n].length, e + 8);
		head.writeUInt32LE(offset, e + 12);
		offset += images[n].length;
	});
	return Buffer.concat([head, ...images]);
}

// The same shape as SVG (the 512 tile without the small icons' tightening).
const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
const diamond = (r) => `M256 ${256 - r}L${256 + r} 256L256 ${256 + r}L${256 - r} 256Z`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect x="36" y="36" width="440" height="440" rx="92" fill="${hex(EDGE)}"/>
<rect x="45" y="45" width="422" height="422" rx="83" fill="${hex(PANEL)}"/>
<path fill="${hex(MINT)}" fill-rule="evenodd" d="${diamond(74)}${diamond(168)}${diamond(140)}"/>
</svg>
`;

function write(rel, data) {
	const out = path.join(ROOT, rel);
	fs.mkdirSync(path.dirname(out), { recursive: true });
	fs.writeFileSync(out, data);
	console.log(`${out}: ${data.length} B`);
}
write(path.join("build", "icon.png"), png(512));
write("favicon.ico", ico([16, 24, 32, 48, 64, 256]));
write("favicon.svg", svg);
