// Signed distance fields for the label atlas (scripts/build-label-atlas.ts, docs/adr/0013-label-atlas.md).

const INF = 1e20;

/**
 * Felzenszwalb and Huttenlocher's 1D squared distance transform of `f` (length `n`, read and
 * written with `stride` from `offset`). `v`, `z` and `d` are scratch arrays of at least n, n + 1, n.
 */
function edt1d(
  grid: Float64Array,
  offset: number,
  stride: number,
  n: number,
  v: Int32Array,
  z: Float64Array,
  d: Float64Array,
): void {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    const fq = grid[offset + q * stride]!;
    const cut = (r: number) =>
      (fq + q * q - (grid[offset + r * stride]! + r * r)) / (2 * q - 2 * r);
    let s = cut(v[k]!);
    // z[0] is -INF, so this stops at k = 0 at the latest.
    while (s <= z[k]!) {
      k--;
      s = cut(v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    const r = v[k]!;
    d[q] = (q - r) * (q - r) + grid[offset + r * stride]!;
  }
  for (let q = 0; q < n; q++) grid[offset + q * stride] = d[q]!;
}

/**
 * Squared Euclidean distance from every pixel to the nearest pixel where `seed` is true
 * (0 on seed pixels, a huge number when there is no seed at all).
 */
export function squaredDistance(
  width: number,
  height: number,
  seed: (i: number) => boolean,
): Float64Array {
  const grid = new Float64Array(width * height);
  for (let i = 0; i < grid.length; i++) grid[i] = seed(i) ? 0 : INF;
  const n = Math.max(width, height);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const d = new Float64Array(n);
  for (let x = 0; x < width; x++) edt1d(grid, x, width, height, v, z, d);
  for (let y = 0; y < height; y++) edt1d(grid, y * width, 1, width, v, z, d);
  return grid;
}

/**
 * Signed distance, in pixels, from each pixel centre to the shape's edge: negative inside,
 * positive outside. `inside[i]` is the coverage of pixel i (0–255); 128 and up counts as inside.
 * The edge is taken to run halfway between an inside pixel and its outside neighbour.
 */
export function signedDistance(width: number, height: number, inside: Uint8Array): Float64Array {
  const isIn = (i: number) => inside[i]! >= 128;
  const toIn = squaredDistance(width, height, isIn);
  const toOut = squaredDistance(width, height, (i) => !isIn(i));
  const out = new Float64Array(width * height);
  for (let i = 0; i < out.length; i++)
    out[i] = isIn(i) ? 0.5 - Math.sqrt(toOut[i]!) : Math.sqrt(toIn[i]!) - 0.5;
  return out;
}

/**
 * Shrinks a supersampled distance field by `factor` (each output pixel averages a factor × factor
 * block) and encodes it in a byte: 128 at the edge, rising inside, `spread` output pixels to 0 or
 * 255. Returns the bytes and the output size.
 */
export function encodeField(
  field: Float64Array,
  width: number,
  height: number,
  factor: number,
  spread: number,
): { bytes: Uint8Array; width: number; height: number } {
  const w = Math.floor(width / factor);
  const h = Math.floor(height / factor);
  const bytes = new Uint8Array(w * h);
  for (let oy = 0; oy < h; oy++) {
    for (let ox = 0; ox < w; ox++) {
      let sum = 0;
      for (let dy = 0; dy < factor; dy++)
        for (let dx = 0; dx < factor; dx++)
          sum += field[(oy * factor + dy) * width + ox * factor + dx]!;
      const distance = sum / (factor * factor) / factor;
      const value = 0.5 - distance / (2 * spread);
      bytes[oy * w + ox] = Math.round(Math.min(1, Math.max(0, value)) * 255);
    }
  }
  return { bytes, width: w, height: h };
}
