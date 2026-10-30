import { describe, expect, it } from 'vitest';
import { jitter, mbps, percentile } from '../src/shared/math';

describe('measurement statistics', () => {
  it('converts bytes and milliseconds into decimal megabits per second', () => {
    expect(mbps(12_500_000, 1000)).toBe(100);
    expect(mbps(1, 0)).toBe(0);
  });
  it('uses a sorted interpolated median without mutating samples', () => {
    const samples = [30, 10, 40, 20];
    expect(percentile(samples, 0.5)).toBe(25);
    expect(percentile(samples, 0.95)).toBeCloseTo(38.5);
    expect(samples).toEqual([30, 10, 40, 20]);
    expect(percentile([], 0.5)).toBeNull();
  });
  it('measures consecutive variation, preserving sample order', () => {
    expect(jitter([10, 30, 15])).toBe(17.5);
    expect(jitter([12])).toBeNull();
    expect(jitter([10, 10, 10])).toBe(0);
  });
});
