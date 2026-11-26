import { afterEach, describe, expect, it } from 'vitest';
import {
  CONFIG,
  CONFIG_DEFAULTS,
  CONFIG_RANGES,
  configVersion,
  resetConfig,
  setConfig,
  subscribeConfig,
} from './config.ts';

afterEach(resetConfig);

describe('config', () => {
  it('starts as a copy of the defaults', () => {
    expect(CONFIG).toEqual(CONFIG_DEFAULTS);
    expect(CONFIG.camera.position).not.toBe(CONFIG_DEFAULTS.camera.position);
  });

  it('sets a value, bumps the version and notifies', () => {
    const before = configVersion();
    let calls = 0;
    const off = subscribeConfig(() => calls++);
    setConfig('tiles', 'height', 0.5);
    off();
    setConfig('tiles', 'height', 0.6);
    expect(CONFIG.tiles.height).toBe(0.6);
    expect(CONFIG_DEFAULTS.tiles.height).toBe(0.18);
    expect(calls).toBe(1);
    expect(configVersion()).toBe(before + 2);
  });

  it('skips unchanged values', () => {
    const before = configVersion();
    setConfig('camera', 'fov', CONFIG.camera.fov);
    expect(configVersion()).toBe(before);
  });

  it('copies arrays it is given', () => {
    const position: [number, number, number] = [1, 2, 3];
    setConfig('camera', 'position', position);
    position[0] = 9;
    expect(CONFIG.camera.position).toEqual([1, 2, 3]);
  });

  it('resets to the defaults', () => {
    setConfig('labels', 'lift', 0.01);
    resetConfig();
    expect(CONFIG).toEqual(CONFIG_DEFAULTS);
  });

  it('has a range that contains every default', () => {
    for (const [group, values] of Object.entries(CONFIG_DEFAULTS)) {
      for (const [key, value] of Object.entries(values)) {
        const range = (
          CONFIG_RANGES as Record<string, Record<string, { min: number; max: number }>>
        )[group]![key]!;
        for (const v of Array.isArray(value) ? value : [value]) {
          expect(v).toBeGreaterThanOrEqual(range.min);
          expect(v).toBeLessThanOrEqual(range.max);
        }
      }
    }
  });
});
