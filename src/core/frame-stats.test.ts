import { describe, expect, it } from 'vitest';
import { FrameStats } from './frame-stats.ts';

describe('FrameStats', () => {
  it('reports zero before any samples', () => {
    const stats = new FrameStats(4);
    expect(stats.mean()).toBe(0);
    expect(stats.percentile(0.95)).toBe(0);
  });

  it('computes mean and nearest-rank percentiles', () => {
    const stats = new FrameStats(100);
    for (let ms = 1; ms <= 100; ms++) stats.push(ms);
    expect(stats.mean()).toBe(50.5);
    expect(stats.percentile(0.95)).toBe(95);
    expect(stats.percentile(0.5)).toBe(50);
    expect(stats.percentile(1)).toBe(100);
  });

  it('keeps only the most recent samples', () => {
    const stats = new FrameStats(3);
    for (const ms of [100, 100, 1, 2, 3]) stats.push(ms);
    expect(stats.count).toBe(3);
    expect(stats.mean()).toBe(2);
    expect(stats.percentile(1)).toBe(3);
  });

  it('does not reorder the samples when reading a percentile', () => {
    const stats = new FrameStats(3);
    for (const ms of [3, 1, 2]) stats.push(ms);
    stats.percentile(0.5);
    stats.push(10);
    expect(stats.mean()).toBeCloseTo(13 / 3);
  });
});
