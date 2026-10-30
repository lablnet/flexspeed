import { describe, expect, it } from 'vitest';
import { assessQuality } from '../src/shared/quality';
import { EMPTY_METRICS, type Metrics } from '../src/shared/types';

const fast: Metrics = {
  download: 100,
  upload: 30,
  latency: 20,
  jitter: 3,
  downloadLatency: 40,
  uploadLatency: 50,
  downloadP95: 60,
  uploadP95: 70,
};
const grades = (metrics: Metrics) => assessQuality(metrics).map((result) => result.grade);

describe('estimated experience verdicts', () => {
  it('rates a fast responsive connection highly', () => {
    expect(grades(fast)).toEqual(['Excellent', 'Excellent', 'Excellent']);
  });
  it('does not let bandwidth hide poor responsiveness under load', () => {
    expect(grades({ ...fast, uploadLatency: 500 })).toEqual(['Excellent', 'Poor', 'Poor']);
  });
  it('uses the weaker direction for calling and high jitter for gaming', () => {
    expect(grades({ ...fast, upload: 0.5, jitter: 35 })).toEqual(['Excellent', 'Poor', 'Poor']);
  });
  it('accounts for repeated download dips without mutating samples', () => {
    const samples = [40, 0, 50, 0, 60].map((value, time) => ({ time, value }));
    const original = structuredClone(samples);
    const [result] = assessQuality(fast, samples);
    expect(result.grade).toBe('Poor');
    expect(result.reason).toContain('Repeated download dips');
    expect(samples).toEqual(original);
  });
  it('treats missing and invalid measurements as unavailable, not zero or excellent', () => {
    expect(grades(EMPTY_METRICS)).toEqual(['Unavailable', 'Unavailable', 'Unavailable']);
    expect(grades({ ...fast, download: NaN, jitter: -1 })).toEqual([
      'Unavailable',
      'Unavailable',
      'Unavailable',
    ]);
    expect(grades({ ...fast, uploadLatency: null })).toEqual([
      'Excellent',
      'Unavailable',
      'Unavailable',
    ]);
    expect(grades({ ...fast, latency: Infinity })[1]).toBe('Unavailable');
  });
  it('handles exact thresholds and measured zero bandwidth', () => {
    expect(
      grades({
        ...fast,
        download: 25,
        upload: 5,
        latency: 30,
        jitter: 5,
        downloadLatency: 60,
        uploadLatency: 60,
      }),
    ).toEqual(['Excellent', 'Excellent', 'Excellent']);
    expect(grades({ ...fast, download: 10 })[0]).toBe('Good');
    expect(grades({ ...fast, download: 3 })[0]).toBe('Fair');
    expect(grades({ ...fast, download: 0 })[0]).toBe('Poor');
  });
  it('provides a limited estimate for legacy results without samples', () => {
    expect(assessQuality(fast)[0].reason).toContain('consistency could not be assessed');
  });
});
