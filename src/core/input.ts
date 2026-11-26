/**
 * Keyboard movement as data. `KEY_MAP` maps `KeyboardEvent.code` (the physical key, so WASD works
 * on any layout) to an action. The scene feeds key events into an `InputState` with `applyKey`
 * and reads `moveIntent` each frame; nothing here touches the DOM.
 */

export type MoveAction = 'forward' | 'back' | 'left' | 'right' | 'slow';

/** WASD and the arrow keys are both always on; either Shift walks slowly. */
export const KEY_MAP: Readonly<Record<string, MoveAction>> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'slow',
  ShiftRight: 'slow',
};

/** Keys held right now. A set of codes, so holding W and ArrowUp then releasing one keeps walking. */
export interface InputState {
  held: Set<string>;
}

export interface MoveIntent {
  /** Direction in world x/z, length 0 or 1 (diagonals are normalised). */
  x: number;
  z: number;
  slow: boolean;
}

export function createInput(): InputState {
  return { held: new Set() };
}

export function createIntent(): MoveIntent {
  return { x: 0, z: 0, slow: false };
}

/** Records a key press or release. Returns true when the key is a movement key. */
export function applyKey(state: InputState, code: string, down: boolean): boolean {
  if (!(code in KEY_MAP)) return false;
  if (down) state.held.add(code);
  else state.held.delete(code);
  return true;
}

/** Releases every key, e.g. when the window loses focus and key-up events would be missed. */
export function clearInput(state: InputState): void {
  state.held.clear();
}

function isHeld(state: InputState, action: MoveAction): boolean {
  for (const code of state.held) if (KEY_MAP[code] === action) return true;
  return false;
}

/**
 * Writes the current movement direction into `out` and returns it. The overview camera looks
 * toward -z, so "forward" walks away from the viewer (-z) and "right" walks toward +x.
 * Opposite keys cancel.
 */
export function moveIntent(state: InputState, out: MoveIntent): MoveIntent {
  const x = (isHeld(state, 'right') ? 1 : 0) - (isHeld(state, 'left') ? 1 : 0);
  const z = (isHeld(state, 'back') ? 1 : 0) - (isHeld(state, 'forward') ? 1 : 0);
  const len = Math.hypot(x, z);
  out.x = len > 0 ? x / len : 0;
  out.z = len > 0 ? z / len : 0;
  out.slow = isHeld(state, 'slow');
  return out;
}

/**
 * Zoom keys by `KeyboardEvent.key` (the character typed, since `+` and `-` sit on different
 * physical keys across layouts). Values are zoom steps: negative zooms in, positive out.
 */
export const ZOOM_KEYS: Readonly<Record<string, number>> = {
  '+': -1,
  '=': -1,
  '-': 1,
  _: 1,
};

/** Zoom steps for a key, or 0 when the key does not zoom. */
export function zoomStepsForKey(key: string): number {
  return ZOOM_KEYS[key] ?? 0;
}
