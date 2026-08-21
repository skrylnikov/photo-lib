import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const fixtureDirectory = dirname(fileURLToPath(import.meta.url));

const createSource = async (name, columns, rows, tileSize) => {
  const width = columns * tileSize;
  const height = rows * tileSize;
  const pixels = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);
      const offset = (y * width + x) * 3;
      pixels[offset] = (tileX * 37 + x) % 256;
      pixels[offset + 1] = (tileY * 29 + y) % 256;
      pixels[offset + 2] = ((tileX + tileY) * 19 + x + y) % 256;
    }
  }

  const path = join(fixtureDirectory, `${name}-source.png`);
  await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toFile(path);
  return { path, width, height };
};

const encodeGrid = async ({ name, columns, rows, tileSize }) => {
  const source = await createSource(name, columns, rows, tileSize);
  const output = join(fixtureDirectory, `${name}.heic`);
  const tileDirectory = await mkdtemp(join(tmpdir(), 'photo-library-heif-grid-'));
  const tilePath = (y, x) => join(tileDirectory, `tile-${String(y).padStart(2, '0')}-${String(x).padStart(2, '0')}.png`);
  try {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        await sharp(source.path)
          .extract({ left: x * tileSize, top: y * tileSize, width: tileSize, height: tileSize })
          .png()
          .toFile(tilePath(y, x));
      }
    }
    await execFileAsync('heif-enc', [
      '--quality',
      '50',
      '--tiled-input',
      '--output',
      output,
      tilePath(0, 0),
    ]);
  } finally {
    await rm(tileDirectory, { recursive: true, force: true });
    await rm(source.path, { force: true });
  }
  return { ...source, output, references: columns * rows };
};

await mkdir(fixtureDirectory, { recursive: true });
const fixtures = await Promise.all([
  encodeGrid({ name: 'tiled-6x8', columns: 6, rows: 8, tileSize: 64 }),
  encodeGrid({ name: 'tiled-17x16-over-budget', columns: 17, rows: 16, tileSize: 64 }),
]);

for (const fixture of fixtures) {
  console.log(JSON.stringify({
    output: fixture.output,
    width: fixture.width,
    height: fixture.height,
    references: fixture.references,
    orientation: 1,
  }));
}
