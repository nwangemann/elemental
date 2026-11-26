import { describe, expect, it } from 'vitest';
import { CONFIG_DEFAULTS } from './config.ts';
import { createController, speedOf, stepController, tableBounds } from './controller.ts';
import { createIntent } from './input.ts';
import { LAYOUT, PITCH, TABLE_SIZE, TILES } from './layout.ts';
import {
  clampKnob,
  createStick,
  createWalkTarget,
  isTap,
  setWalkTarget,
  steer,
  stickFromOffset,
} from './steering.ts';

const P = CONFIG_DEFAULTS.character;
const H = TILES[0]!;
const FE = TILES[25]!;

describe('setWalkTarget', () => {
  it('snaps a point on a tile to its centre and reports the element', () => {
    const t = createWalkTarget();
    expect(setWalkTarget(t, FE.x + 0.3, FE.z - 0.2)).toBe(26);
    expect(t).toEqual({ active: true, x: FE.x, z: FE.z });
  });

  it('keeps a point over a gap as it is', () => {
    const t = createWalkTarget();
    const x = H.x + LAYOUT.tileSize / 2 + LAYOUT.gap / 2;
    expect(setWalkTarget(t, x, H.z)).toBeNull();
    expect(t).toEqual({ active: true, x, z: H.z });
  });
});

describe('stickFromOffset', () => {
  it('is zero inside the dead zone', () => {
    const s = stickFromOffset(P.stickRadius * P.stickDeadZone * 0.5, 0, P, createStick());
    expect(s).toEqual({ x: 0, z: 0 });
  });

  it('maps screen right to +x and screen up to -z, full at the radius and capped', () => {
    const right = stickFromOffset(P.stickRadius, 0, P, createStick());
    expect(right.x).toBeCloseTo(1);
    expect(right.z).toBeCloseTo(0);
    const up = stickFromOffset(0, -P.stickRadius * 3, P, createStick());
    expect(up.x).toBeCloseTo(0);
    expect(up.z).toBeCloseTo(-1);
  });

  it('rises smoothly from the dead zone edge', () => {
    const half = stickFromOffset(P.stickRadius * ((1 + P.stickDeadZone) / 2), 0, P, createStick());
    expect(half.x).toBeCloseTo(0.5);
  });
});

describe('clampKnob', () => {
  it('keeps the knob inside the ring', () => {
    expect(clampKnob(30, 40, 100, createStick())).toEqual({ x: 30, z: 40 });
    const k = clampKnob(300, 400, 100, createStick());
    expect(Math.hypot(k.x, k.z)).toBeCloseTo(100);
  });
});

describe('steer', () => {
  it('lets the keyboard win and cancel a walk target', () => {
    const t = createWalkTarget();
    setWalkTarget(t, FE.x, FE.z);
    const stick = { x: 1, z: 0 };
    const intent = { x: 0, z: -1, slow: false };
    expect(steer(intent, stick, t, H.x, H.z, P)).toEqual({ x: 0, z: -1, slow: false });
    expect(t.active).toBe(false);
  });

  it('uses the joystick over a walk target and cancels the target', () => {
    const t = createWalkTarget();
    setWalkTarget(t, FE.x, FE.z);
    const intent = steer(createIntent(), { x: 0.5, z: 0 }, t, H.x, H.z, P);
    expect(intent.x).toBe(0.5);
    expect(t.active).toBe(false);
  });

  it('heads straight for the target and slows inside the slow radius', () => {
    const t = createWalkTarget();
    setWalkTarget(t, H.x + PITCH * 3, H.z);
    const far = steer(createIntent(), createStick(), t, H.x, H.z, P);
    expect(far.x).toBeCloseTo(1);
    expect(far.z).toBeCloseTo(0);
    const near = steer(createIntent(), createStick(), t, t.x - P.slowRadius / 2, t.z, P);
    expect(near.x).toBeCloseTo(0.5);
  });

  it('does nothing without a target', () => {
    expect(steer(createIntent(), createStick(), createWalkTarget(), 0, 0, P)).toEqual(
      createIntent(),
    );
  });

  it('walks the controller onto the target tile and stops there', () => {
    const t = createWalkTarget();
    setWalkTarget(t, FE.x, FE.z);
    const c = createController(H.x, H.z);
    const bounds = tableBounds(TABLE_SIZE.width, TABLE_SIZE.depth, P.radius);
    const intent = createIntent();
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 20 && t.active; i++) {
      intent.x = 0;
      intent.z = 0;
      stepController(c, steer(intent, createStick(), t, c.x, c.z, P), dt, P, bounds);
    }
    expect(t.active).toBe(false);
    // Let the remaining velocity bleed off.
    for (let i = 0; i < 60; i++) {
      stepController(c, createIntent(), dt, P, bounds);
    }
    expect(Math.hypot(c.x - FE.x, c.z - FE.z)).toBeLessThan(0.15);
    expect(speedOf(c)).toBeLessThan(0.01);
  });
});

describe('isTap', () => {
  it('accepts short, still presses and rejects drags and long holds', () => {
    expect(isTap(120, 3)).toBe(true);
    expect(isTap(120, 40)).toBe(false);
    expect(isTap(2000, 0)).toBe(false);
  });
});
