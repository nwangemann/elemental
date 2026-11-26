/**
 * Rolling frame-time statistics over the last `capacity` frames.
 * `push` is allocation-free, so it can run every frame; read `mean` and `p95` a few times a second.
 */
export class FrameStats {
  readonly #samples: Float64Array;
  readonly #scratch: Float64Array;
  #next = 0;
  #count = 0;

  constructor(capacity = 240) {
    this.#samples = new Float64Array(capacity);
    this.#scratch = new Float64Array(capacity);
  }

  /** Number of samples held, up to the capacity. */
  get count(): number {
    return this.#count;
  }

  /** Records one frame time in milliseconds. */
  push(ms: number): void {
    this.#samples[this.#next] = ms;
    this.#next = (this.#next + 1) % this.#samples.length;
    if (this.#count < this.#samples.length) this.#count++;
  }

  mean(): number {
    if (this.#count === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.#count; i++) sum += this.#samples[i]!;
    return sum / this.#count;
  }

  /** The `q` quantile (0–1) by nearest rank; `percentile(0.95)` is p95. */
  percentile(q: number): number {
    if (this.#count === 0) return 0;
    const sorted = this.#scratch.subarray(0, this.#count);
    sorted.set(this.#samples.subarray(0, this.#count));
    sorted.sort();
    const rank = Math.min(this.#count, Math.max(1, Math.ceil(q * this.#count)));
    return sorted[rank - 1]!;
  }
}
