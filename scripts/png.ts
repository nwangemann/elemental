import { crc32, deflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/**
 * An 8-bit greyscale PNG of `pixels` (row-major, one byte each). Each row takes whichever of the
 * five PNG filters gives the smallest sum of absolute residuals, the usual heuristic.
 */
export function encodeGreyPng(pixels: Uint8Array, width: number, height: number): Buffer {
  const raw = Buffer.alloc((width + 1) * height);
  const candidate = Buffer.alloc(width);
  for (let y = 0; y < height; y++) {
    const row = pixels.subarray(y * width, (y + 1) * width);
    const up = y > 0 ? pixels.subarray((y - 1) * width, y * width) : new Uint8Array(width);
    let bestScore = Infinity;
    for (let filter = 0; filter < 5; filter++) {
      let score = 0;
      for (let x = 0; x < width; x++) {
        const a = x > 0 ? row[x - 1]! : 0;
        const b = up[x]!;
        const c = x > 0 ? up[x - 1]! : 0;
        const predict = [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter]!;
        const v = (row[x]! - predict) & 0xff;
        candidate[x] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        raw[y * (width + 1)] = filter;
        candidate.copy(raw, y * (width + 1) + 1);
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // greyscale
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
