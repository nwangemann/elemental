import type { WalkTarget } from './steering.ts';

/**
 * The marker a tap leaves on its walk target, so a far tap reads as heard. A tap places it; it
 * pulses once (lands from a larger, brighter square onto the target) and then holds, faint,
 * until the character arrives, or the walk is taken over (keys, joystick, a step key, another
 * tap, a fly-to). Pure state and maths; `scene/TapMarker.tsx` draws it.
 */
export interface TapMarker {
  live: boolean;
  x: number;
  z: number;
  /** Index of the tile the target sits on, or -1 for a point in a gap or on the ground. */
  tile: number;
  /** Seconds since the tap. */
  age: number;
}

export interface MarkerLook {
  scale: number;
  opacity: number;
}

export interface MarkerParams {
  markerPulse: number;
  markerOpacity: number;
}

/** How much larger than its resting size the marker starts its pulse. */
export const PULSE_GROWTH = 0.6;

export function createTapMarker(): TapMarker {
  return { live: false, x: 0, z: 0, tile: -1, age: 0 };
}

/** Starts the marker on a walk target just set by a tap; `tile` is its index or -1. */
export function placeTapMarker(m: TapMarker, target: WalkTarget, tile: number): void {
  m.live = target.active;
  m.x = target.x;
  m.z = target.z;
  m.tile = tile;
  m.age = 0;
}

/**
 * Advances the marker by dt seconds. It stays live only while the walk target it marks is still
 * the active one; anything that clears or moves the target ends it. Returns whether it is live.
 */
export function stepTapMarker(m: TapMarker, target: WalkTarget, dt: number): boolean {
  if (!m.live) return false;
  if (!target.active || target.x !== m.x || target.z !== m.z) {
    m.live = false;
    return false;
  }
  m.age += dt;
  return true;
}

/**
 * Scale (1 = resting size) and opacity at a given age, written into `out`. The pulse eases out
 * over `markerPulse` seconds from 1 + PULSE_GROWTH and full opacity to 1 and `markerOpacity`.
 * Under reduced motion the size stays put and only the opacity settles.
 */
export function tapMarkerLook(
  age: number,
  p: MarkerParams,
  reducedMotion: boolean,
  out: MarkerLook,
): MarkerLook {
  const t = p.markerPulse > 0 ? Math.min(1, Math.max(0, age / p.markerPulse)) : 1;
  const ease = 1 - (1 - t) * (1 - t);
  out.scale = reducedMotion ? 1 : 1 + PULSE_GROWTH * (1 - ease);
  out.opacity = p.markerOpacity + (1 - p.markerOpacity) * (1 - ease);
  return out;
}
