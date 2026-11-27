/**
 * Idle frame pacing: the scene renders every display frame while anything moves, and once it has
 * been still for `settle` seconds it drops to `idleFps`, enough for the figure's breathing and
 * the active tile's glow to read while the GPU mostly sleeps. Input and app changes wake it at
 * once (`wakePacer`). Pure state and maths; `scene/FramePacer.tsx` schedules the frames.
 */

export interface PacerParams {
  /** Frames per second while idle; 0 stops rendering until something wakes the scene. */
  idleFps: number;
  /** Seconds of stillness before the idle rate starts. */
  settle: number;
}

export interface Pacer {
  /** Seconds since the scene was last busy or woken. */
  quiet: number;
  /** True when the frame now running came after an idle wait, so its interval is no frame-time signal. */
  paced: boolean;
  /** The display's frame interval, ms, smoothed from full-rate frames. */
  displayMs: number;
}

/** Weight of each full-rate frame in `displayMs`. */
const DISPLAY_SMOOTHING = 0.1;
/** Longer intervals are pauses (a hidden tab, a debugger), not the display's refresh. */
const DISPLAY_MAX_MS = 100;

export function createPacer(): Pacer {
  return { quiet: 0, paced: false, displayMs: 1000 / 60 };
}

/** Something changed outside the frame loop (input, the app's state): full rate again. */
export function wakePacer(p: Pacer): void {
  p.quiet = 0;
}

/**
 * Feeds one frame. Returns how long to wait before asking for the next one, in milliseconds: 0
 * for the next display frame, `Infinity` for none until woken. A requested frame lands on the
 * display's next refresh, half a display frame later on average, so the wait is shortened by
 * that much to keep the idle rate near `idleFps`. Also records whether the next frame is paced.
 */
export function stepPacer(p: Pacer, dt: number, busy: boolean, params: PacerParams): number {
  if (!p.paced && dt > 0 && dt * 1000 < DISPLAY_MAX_MS)
    p.displayMs += (dt * 1000 - p.displayMs) * DISPLAY_SMOOTHING;
  p.quiet = busy ? 0 : p.quiet + dt;
  let wait = 0;
  if (p.quiet >= params.settle)
    wait =
      params.idleFps > 0
        ? Math.max(1, 1000 / params.idleFps - p.displayMs / 2)
        : Number.POSITIVE_INFINITY;
  p.paced = wait > 0;
  return wait;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}
interface Quat extends Vec3 {
  w: number;
}

/**
 * True when a pose (position and rotation) differs from its copy in `last` (7 numbers) by more
 * than `eps` in any component; `last` is then updated. Reads the camera each frame without
 * keeping a history or allocating.
 */
export function poseMoved(last: Float64Array, p: Vec3, q: Quat, eps: number): boolean {
  let changed = false;
  const at = (i: number, v: number) => {
    if (Math.abs(v - last[i]!) > eps) changed = true;
    last[i] = v;
  };
  at(0, p.x);
  at(1, p.y);
  at(2, p.z);
  at(3, q.x);
  at(4, q.y);
  at(5, q.z);
  at(6, q.w);
  return changed;
}
