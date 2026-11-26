/**
 * Adaptive resolution: watches frame intervals and steps the device pixel ratio down when frames
 * run slow and back up when they have room, so a weak GPU keeps a steady frame rate at a slightly
 * softer image. Pure state and maths; the scene applies the ratio.
 */

export interface QualityParams {
  /** Lowest and highest pixel ratio the governor may choose. */
  minDpr: number;
  maxDpr: number;
  /** How far one change moves the pixel ratio. */
  step: number;
  /** Seconds ignored after start (loading, shader compiles), then the length of each window. */
  warmup: number;
  window: number;
  /** A window whose mean frame interval is above `slowMs` steps down, below `fastMs` steps up. */
  slowMs: number;
  fastMs: number;
  /** Frame intervals above this are pauses (a background tab, a debugger), not slow frames. */
  pauseMs: number;
  /** After this many changes of direction the governor settles where it is. */
  maxFlips: number;
}

/** Defaults: below about 45 fps steps down, above about 57 fps steps up. */
export const QUALITY: Readonly<QualityParams> = {
  minDpr: 0.75,
  maxDpr: 2,
  step: 0.25,
  warmup: 2,
  window: 1,
  slowMs: 1000 / 45,
  fastMs: 1000 / 57,
  pauseMs: 250,
  maxFlips: 3,
};

export interface QualityState {
  dpr: number;
  /** The highest ratio for this display: its own ratio, capped at `maxDpr`. */
  ceiling: number;
  elapsed: number;
  windowTime: number;
  windowFrames: number;
  /** Direction of the last change: −1 down, 1 up, 0 none yet. */
  lastDir: number;
  flips: number;
}

const round = (v: number) => Math.round(v * 100) / 100;

/** Starts at the display's own pixel ratio, capped at `maxDpr`. */
export function createQuality(deviceDpr: number, p: QualityParams = QUALITY): QualityState {
  const ceiling = round(Math.max(p.minDpr, Math.min(deviceDpr, p.maxDpr)));
  return {
    dpr: ceiling,
    ceiling,
    elapsed: 0,
    windowTime: 0,
    windowFrames: 0,
    lastDir: 0,
    flips: 0,
  };
}

/** True once the governor has changed direction `maxFlips` times and stopped adjusting. */
export function isSettled(s: QualityState, p: QualityParams = QUALITY): boolean {
  return s.flips >= p.maxFlips;
}

/**
 * Feeds one frame interval in milliseconds. Returns true when `dpr` changed this call, so the
 * caller applies it only then. Allocation-free.
 */
export function stepQuality(s: QualityState, frameMs: number, p: QualityParams = QUALITY): boolean {
  if (!(frameMs > 0) || frameMs > p.pauseMs) return false;
  const seconds = frameMs / 1000;
  s.elapsed += seconds;
  if (s.elapsed < p.warmup || isSettled(s, p)) return false;
  s.windowTime += seconds;
  s.windowFrames += 1;
  if (s.windowTime < p.window) return false;

  const mean = (s.windowTime * 1000) / s.windowFrames;
  s.windowTime = 0;
  s.windowFrames = 0;

  let dir = 0;
  if (mean > p.slowMs && s.dpr > p.minDpr) dir = -1;
  else if (mean < p.fastMs && s.dpr < s.ceiling) dir = 1;
  if (dir === 0) return false;

  if (s.lastDir !== 0 && dir !== s.lastDir) s.flips += 1;
  s.lastDir = dir;
  s.dpr = round(Math.min(s.ceiling, Math.max(p.minDpr, s.dpr + dir * p.step)));
  // Settling after a step up would leave it where it just proved too slow: step back down.
  if (isSettled(s, p) && dir === 1) s.dpr = round(Math.max(p.minDpr, s.dpr - p.step));
  return true;
}
