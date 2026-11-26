import { describe, expect, it } from 'vitest';
import { CONFIG_DEFAULTS } from './config.ts';
import {
  createController,
  speedOf,
  stepController,
  tableBounds,
  teleport,
  wrapAngle,
  type ControllerParams,
} from './controller.ts';
import { TABLE_SIZE } from './layout.ts';
import type { MoveIntent } from './input.ts';

const P: ControllerParams = CONFIG_DEFAULTS.character;
const BIG = tableBounds(1000, 1000, 0);
const STILL: MoveIntent = { x: 0, z: 0, slow: false };

function run(s = createController(0, 0), intent: MoveIntent, seconds: number, fps = 60, b = BIG) {
  for (let i = 0; i < Math.round(seconds * fps); i++) stepController(s, intent, 1 / fps, P, b);
  return s;
}

describe('controller', () => {
  it('stands still without input', () => {
    const s = run(undefined, STILL, 2);
    expect(s).toMatchObject({ x: 0, z: 0, vx: 0, vz: 0, heading: 0, lean: 0 });
  });

  it('accelerates smoothly to top speed, and Shift walks slowly', () => {
    const fwd = { x: 1, z: 0, slow: false };
    const early = run(undefined, fwd, 0.05);
    expect(speedOf(early)).toBeGreaterThan(0);
    expect(speedOf(early)).toBeLessThan(P.moveSpeed / 2);
    expect(speedOf(run(undefined, fwd, 2))).toBeCloseTo(P.moveSpeed, 3);
    expect(speedOf(run(undefined, { ...fwd, slow: true }, 2))).toBeCloseTo(
      P.moveSpeed * P.slowFactor,
      3,
    );
  });

  it('decelerates to a stop after keys are released', () => {
    const s = run(undefined, { x: 0, z: -1, slow: false }, 2);
    const z = s.z;
    run(s, STILL, 2);
    expect(speedOf(s)).toBeLessThan(1e-4);
    expect(s.z).toBeLessThan(z);
    expect(s.z - z).toBeGreaterThan(-P.moveSpeed / P.decelRate - 0.01);
  });

  it('covers the same distance at 30 and 120 fps', () => {
    const fwd = { x: 0, z: 1, slow: false };
    const a = run(undefined, fwd, 1, 30);
    const b = run(undefined, fwd, 1, 120);
    expect(a.z).toBeCloseTo(b.z, 1);
  });

  it('turns to face its travel direction (0 is +z, π/2 is +x)', () => {
    expect(run(undefined, { x: 1, z: 0, slow: false }, 1).heading).toBeCloseTo(Math.PI / 2, 3);
    expect(Math.abs(run(undefined, { x: 0, z: -1, slow: false }, 1).heading)).toBeCloseTo(
      Math.PI,
      3,
    );
  });

  it('leans into a turn and straightens up afterwards', () => {
    const s = run(undefined, { x: 0, z: 1, slow: false }, 1);
    // From facing +z, turning toward +x increases heading: a positive lean.
    let peak = 0;
    for (let i = 0; i < 20; i++) {
      stepController(s, { x: 1, z: 0, slow: false }, 1 / 60, P, BIG);
      peak = Math.max(peak, s.lean);
    }
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(P.maxLean);
    run(s, { x: 1, z: 0, slow: false }, 2);
    expect(Math.abs(s.lean)).toBeLessThan(1e-3);
  });

  it('turns the short way across ±π', () => {
    const s = createController(0, 0, Math.PI - 0.1);
    stepController(s, { x: -0.2, z: -1, slow: false }, 1 / 60, P, BIG);
    run(s, { x: -0.2, z: -1, slow: false }, 1);
    expect(Math.abs(wrapAngle(s.heading - Math.atan2(-0.2, -1)))).toBeLessThan(1e-3);
  });

  it('stops hard at the edge when there is no soft band', () => {
    const b = tableBounds(TABLE_SIZE.width, TABLE_SIZE.depth, CONFIG_DEFAULTS.character.radius);
    const hard = { ...P, edgeBand: 0 };
    const s = createController(0, 0);
    const diagonal = { x: Math.SQRT1_2, z: Math.SQRT1_2, slow: false };
    for (let i = 0; i < 30 * 60; i++) stepController(s, diagonal, 1 / 60, hard, b);
    expect(s.x).toBe(b.maxX);
    expect(s.z).toBe(b.maxZ);
    expect(s.vx).toBe(0);
    expect(s.vz).toBe(0);
    expect(b.maxX).toBeCloseTo(TABLE_SIZE.width / 2 - CONFIG_DEFAULTS.character.radius, 10);
  });

  it('wraps angles into (-π, π]', () => {
    expect(wrapAngle(Math.PI)).toBeCloseTo(Math.PI, 10);
    expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI, 10);
    expect(wrapAngle(3 * Math.PI + 0.5)).toBeCloseTo(-Math.PI + 0.5, 10);
  });

  it('teleports to rest, keeping the heading', () => {
    const s = createController(0, 0, 1.2);
    s.vx = 3;
    s.vz = -2;
    s.lean = 0.2;
    teleport(s, 4, -5);
    expect(s).toEqual({ x: 4, z: -5, vx: 0, vz: 0, heading: 1.2, lean: 0 });
  });

  describe('soft outer limit', () => {
    const LIMIT = tableBounds(10, 10, 0); // ±5
    const OUT = { x: 1, z: 0, slow: false };

    it('never lets the body past the limit, at any frame rate', () => {
      for (const fps of [20, 30, 60, 144]) {
        const s = run(createController(0, 0), OUT, 6, fps, LIMIT);
        expect(s.x).toBeLessThanOrEqual(LIMIT.maxX);
        const d = run(createController(0, 0), { x: -1, z: -1, slow: false }, 6, fps, LIMIT);
        expect(d.x).toBeGreaterThanOrEqual(LIMIT.minX);
        expect(d.z).toBeGreaterThanOrEqual(LIMIT.minZ);
      }
    });

    it('slows the walk inside the band and holds it short of the limit', () => {
      const s = run(createController(0, 0), OUT, 6, 60, LIMIT);
      expect(s.x).toBeGreaterThan(LIMIT.maxX - P.edgeBand);
      expect(s.x).toBeLessThan(LIMIT.maxX);
      expect(Math.abs(s.vx)).toBeLessThan(0.01);
    });

    it('pushes a body standing in the band back toward the inside', () => {
      const s = createController(LIMIT.maxX - 0.05, 0);
      run(s, STILL, 2, 60, LIMIT);
      expect(s.x).toBeLessThan(LIMIT.maxX - 0.1);
      expect(s.x).toBeGreaterThan(LIMIT.maxX - P.edgeBand - 0.2);
    });

    it('leaves walking inward and along the edge at full speed', () => {
      const s = createController(LIMIT.maxX - 0.3, 0);
      run(s, { x: 0, z: 1, slow: false }, 1, 60, LIMIT);
      expect(Math.abs(s.vz)).toBeCloseTo(P.moveSpeed, 1);
      const back = run(createController(LIMIT.maxX - 0.3, 0), { x: -1, z: 0, slow: false }, 0.5);
      expect(back.vx).toBeLessThan(-P.moveSpeed * 0.9);
    });
  });
});
