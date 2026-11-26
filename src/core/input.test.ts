import { describe, expect, it } from 'vitest';
import {
  applyKey,
  clearInput,
  createInput,
  createIntent,
  KEY_MAP,
  moveIntent,
  zoomStepsForKey,
} from './input.ts';

function intentFor(...codes: string[]) {
  const s = createInput();
  for (const c of codes) applyKey(s, c, true);
  return moveIntent(s, createIntent());
}

describe('input', () => {
  it('maps WASD and arrows to the same actions', () => {
    expect(KEY_MAP.KeyW).toBe(KEY_MAP.ArrowUp);
    expect(KEY_MAP.KeyS).toBe(KEY_MAP.ArrowDown);
    expect(KEY_MAP.KeyA).toBe(KEY_MAP.ArrowLeft);
    expect(KEY_MAP.KeyD).toBe(KEY_MAP.ArrowRight);
    expect(KEY_MAP.ShiftLeft).toBe('slow');
    expect(KEY_MAP.ShiftRight).toBe('slow');
  });

  it('ignores keys that are not movement keys', () => {
    const s = createInput();
    expect(applyKey(s, 'KeyQ', true)).toBe(false);
    expect(s.held.size).toBe(0);
  });

  it('walks forward away from the camera and right toward +x', () => {
    expect(intentFor('KeyW')).toEqual({ x: 0, z: -1, slow: false });
    expect(intentFor('ArrowRight')).toEqual({ x: 1, z: 0, slow: false });
  });

  it('normalises diagonals and cancels opposite keys', () => {
    const d = intentFor('KeyW', 'KeyD');
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1, 10);
    expect(intentFor('KeyA', 'ArrowRight')).toEqual({ x: 0, z: 0, slow: false });
  });

  it('keeps walking while a second key for the same action is held', () => {
    const s = createInput();
    applyKey(s, 'KeyW', true);
    applyKey(s, 'ArrowUp', true);
    applyKey(s, 'KeyW', false);
    expect(moveIntent(s, createIntent()).z).toBe(-1);
  });

  it('flags Shift as slow and clears everything on blur', () => {
    const s = createInput();
    applyKey(s, 'KeyW', true);
    applyKey(s, 'ShiftRight', true);
    expect(moveIntent(s, createIntent()).slow).toBe(true);
    clearInput(s);
    expect(moveIntent(s, createIntent())).toEqual({ x: 0, z: 0, slow: false });
  });
});

describe('zoom keys', () => {
  it('zooms in on + and =, out on - and _, and ignores other keys', () => {
    expect(zoomStepsForKey('+')).toBe(-1);
    expect(zoomStepsForKey('=')).toBe(-1);
    expect(zoomStepsForKey('-')).toBe(1);
    expect(zoomStepsForKey('_')).toBe(1);
    expect(zoomStepsForKey('w')).toBe(0);
  });
});
