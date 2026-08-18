/**
 * Génère les icônes PNG de la PWA (docs/icons/).
 *
 * Écrit à la main plutôt qu'avec une bibliothèque d'images : l'environnement de
 * développement n'avait ni ImageMagick ni Pillow, et Node sait déjà tout faire
 * (zlib est intégré, un PNG n'est qu'une suite de blocs avec un CRC).
 *
 * Utilisation :  node tools/generate-icons.mjs
 * À relancer uniquement si tu veux changer le dessin ou les couleurs.
 *
 * Le dessin : un "A" géométrique blanc sur le vert d'Atlas. Volontairement
 * simple, pour rester lisible à 60 px sur un écran d'accueil d'iPhone.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'icons');
const SIZES = [180, 192, 512];

const BACKGROUND = [0x0a, 0x6e, 0x5c]; // --accent
const FOREGROUND = [0xff, 0xff, 0xff];

/** Le "A" : deux jambages et une barre, en coordonnées normalisées (0 → 1). */
const STROKES = [
  { from: [0.5, 0.17], to: [0.22, 0.83], width: 0.13 },
  { from: [0.5, 0.17], to: [0.78, 0.83], width: 0.13 },
  { from: [0.335, 0.63], to: [0.665, 0.63], width: 0.11 },
];

/** Distance d'un point à un segment. Donne des extrémités arrondies. */
function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}

function isInsideGlyph(nx, ny) {
  return STROKES.some((stroke) => distanceToSegment(nx, ny, stroke.from, stroke.to) <= stroke.width / 2);
}

/**
 * Rend l'icône en RGB. On calcule 4× trop grand puis on moyenne : c'est ce qui
 * lisse les diagonales du "A" (anticrénelage).
 */
function renderPixels(size) {
  const scale = 4;
  const big = size * scale;
  const pixels = Buffer.alloc(size * size * 3);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let covered = 0;

      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const nx = (x * scale + sx + 0.5) / big;
          const ny = (y * scale + sy + 0.5) / big;
          if (isInsideGlyph(nx, ny)) covered += 1;
        }
      }

      const ratio = covered / (scale * scale);
      const offset = (y * size + x) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        pixels[offset + channel] = Math.round(
          BACKGROUND[channel] * (1 - ratio) + FOREGROUND[channel] * ratio,
        );
      }
    }
  }

  return pixels;
}

// ---------- Encodage PNG ----------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));

  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(size, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits par canal
  ihdr[9] = 2; // couleur vraie (RGB)
  ihdr[10] = 0; // compression standard
  ihdr[11] = 0; // filtrage standard
  ihdr[12] = 0; // pas d'entrelacement

  // Chaque ligne est précédée d'un octet de filtre (0 = aucun).
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 3 + 1)] = 0;
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const size of SIZES) {
  const file = join(OUTPUT_DIR, `icon-${size}.png`);
  writeFileSync(file, encodePng(size, renderPixels(size)));
  console.log(`écrit ${file}`);
}
