import { describe, expect, it } from 'vitest';
import { GROUND } from './boundary.ts';
import { blockCliffs, isCliff, pickSurface, type SurfaceHit } from './climb.ts';
import { createController } from './controller.ts';
import { PITCH, TILES } from './layout.ts';

const tile = (n: number) => TILES[n - 1]!;
const LIMIT = 0.45;
const PROBE = 0.1;
const REST = 0.18;
/** Every tile at rest except Be (4), a tall column. */
const heights =
  (tall = 4, h = 1.2) =>
  (n: number) =>
    n === GROUND ? 0 : n === tall ? h : REST;

describe('isCliff', () => {
  it('is a cliff only where the surface rises more than the limit', () => {
    const be = tile(4);
    expect(isCliff(be.x, be.z, REST, LIMIT, heights())).toBe(true);
    expect(isCliff(be.x, be.z, 1, LIMIT, heights())).toBe(false);
    expect(isCliff(tile(3).x, tile(3).z, REST, LIMIT, heights())).toBe(false);
    // The ground is never a cliff, whatever is around.
    expect(isCliff(tile(1).x - 2, tile(1).z, REST, LIMIT, heights())).toBe(false);
  });
});

describe('blockCliffs', () => {
  it('stops a walk from Li into tall Be at its face, and drops the velocity', () => {
    const li = tile(3);
    const s = createController(li.x, li.z);
    s.vx = 2;
    let x = li.x;
    for (let i = 0; i < 60; i++) {
      const fromX = s.x;
      s.x += 2 / 60;
      blockCliffs(s, fromX, s.z, REST, LIMIT, PROBE, heights());
      x = s.x;
    }
    expect(s.vx).toBe(0);
    // Stopped short of the Be tile's support, about a body radius from its face.
    expect(x).toBeLessThan(tile(4).x - 0.5);
    expect(x).toBeGreaterThan(li.x + 0.3);
  });

  it('slides along a cliff face: the blocked axis stops, the other keeps moving', () => {
    const li = tile(3);
    const s = createController(tile(4).x - 0.5 - 0.2, li.z);
    const fromX = s.x;
    const fromZ = s.z;
    s.x += 0.05;
    s.z += 0.05;
    s.vx = 1;
    s.vz = 1;
    expect(blockCliffs(s, fromX, fromZ, REST, LIMIT, PROBE, heights())).toBe(true);
    expect(s.x).toBe(fromX);
    expect(s.z).toBeCloseTo(fromZ + 0.05);
    expect(s.vz).toBe(1);
  });

  it('lets a step up within the limit and any step down through', () => {
    const li = tile(3);
    const s = createController(li.x, li.z);
    s.x += PITCH;
    expect(blockCliffs(s, li.x, li.z, REST, LIMIT, PROBE, heights(4, REST + 0.3))).toBe(false);
    const t = createController(tile(4).x, tile(4).z);
    t.x -= PITCH;
    expect(blockCliffs(t, tile(4).x, tile(4).z, 1.2, LIMIT, PROBE, heights())).toBe(false);
  });
});

describe('pickSurface', () => {
  const hit: SurfaceHit = { x: 0, y: 0, z: 0 };

  it('hits a resting tile top from straight above', () => {
    const c = tile(26);
    expect(pickSurface(c.x, 10, c.z, 0, -1, 0, heights(), hit)).toBe(true);
    expect(hit.y).toBeCloseTo(REST);
    expect(hit.x).toBeCloseTo(c.x);
  });

  it('hits the side of a tall tile in front of the point the ray aims at', () => {
    // A ray sloping down along +x toward the ground in the notch just past tall Be (4).
    const be = tile(4);
    const ox = be.x - 3;
    const oy = 2;
    const dx = be.x + 1.5 - ox;
    const dy = -oy;
    const len = Math.hypot(dx, dy);
    expect(pickSurface(ox, oy, be.z, dx / len, dy / len, 0, heights(), hit)).toBe(true);
    expect(hit.x).toBeCloseTo(be.x - 0.5);
    expect(hit.y).toBeGreaterThan(REST);
    expect(hit.y).toBeLessThan(1.2);
  });

  it('falls back to the ground off the table, and misses a ray going up', () => {
    const h = tile(1);
    expect(pickSurface(h.x - 3, 5, h.z, 0, -1, 0, heights(), hit)).toBe(true);
    expect(hit.y).toBeCloseTo(0);
    expect(pickSurface(h.x, 5, h.z, 0, 1, 0, heights(), hit)).toBe(false);
  });
});
