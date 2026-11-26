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
