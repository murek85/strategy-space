/* The desktop app's icon (G3, 0.151): the game's mark ◈ — a diamond in a diamond, the interface's mint on the
   deck's dark blue — drawn as a 512×512 PNG (build/icon.png; electron-builder makes the Windows .ico from it).
   node tools/make-icon.js */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const S = 512,
	SS = 4; // supersampling per axis
const BG = [7, 16, 22],
	PANEL = [14, 30, 38],
	EDGE = [56, 92, 98],
	MINT = [127, 231, 200];

// Rounded square of the tile, diamonds of the mark (|x| + |y| < r in the tile's centre frame).
function colourAt(x, y) {
	const c = S / 2,
		dx = x - c,
		dy = y - c,
		r = 92,
		inset = 36;
	const qx = Math.max(Math.abs(dx) - (c - inset - r), 0),
		qy = Math.max(Math.abs(dy) - (c - inset - r), 0),
		box = Math.hypot(qx, qy) - r;
	if (box > 0) return null;
	const d = Math.abs(dx) + Math.abs(dy);
	if (d < 74) return MINT;
	if (d > 140 && d < 168) return MINT;
	if (box > -9) return EDGE;
	return PANEL;
}

const rgba = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++)
	for (let x = 0; x < S; x++) {
		let r = 0,
			g = 0,
			b = 0,
			a = 0;
		for (let j = 0; j < SS; j++)
			for (let i = 0; i < SS; i++) {
				const col = colourAt(x + (i + 0.5) / SS, y + (j + 0.5) / SS);
				if (!col) continue;
				r += col[0];
				g += col[1];
				b += col[2];
				a++;
			}
		const o = (y * S + x) * 4,
			n = SS * SS;
		rgba[o] = a ? Math.round(r / a) : BG[0];
		rgba[o + 1] = a ? Math.round(g / a) : BG[1];
		rgba[o + 2] = a ? Math.round(b / a) : BG[2];
		rgba[o + 3] = Math.round((255 * a) / n);
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
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const raw = Buffer.alloc(S * (S * 4 + 1));
for (let y = 0; y < S; y++) rgba.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
const out = path.join(__dirname, "..", "build", "icon.png");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`${out}: ${png.length} B`);
