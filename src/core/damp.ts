/**
 * Frame-rate independent exponential smoothing: moves `current` toward `target`
 * so that the same `lambda` feels the same at 30, 60 or 120 fps.
 * Used for camera follow and character acceleration.
 *
 * @param lambda Responsiveness in 1/seconds. Higher is snappier.
 * @param dt Seconds since the last frame.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

/** Position and velocity of one critically damped spring axis. */
export interface Spring {
  value: number;
  velocity: number;
}

/**
 * Advances a critically damped spring toward `target` by `dt` seconds, in place. Exact for a
 * target held still over the step, so it is frame-rate independent; it eases in and out (unlike
 * `damp`, whose speed jumps when the target starts moving) and never overshoots a still target.
 *
 * @param omega Natural frequency in 1/seconds. Higher is snappier; it settles in about 4/omega.
 */
export function stepSpring(s: Spring, target: number, omega: number, dt: number): void {
  if (dt <= 0) return;
  const x = s.value - target;
  const c = s.velocity + omega * x;
  const e = Math.exp(-omega * dt);
  s.value = target + (x + c * dt) * e;
  s.velocity = (s.velocity - omega * c * dt) * e;
}
