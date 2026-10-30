import type { Metrics, Sample } from './types';

export type QualityGrade = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Unavailable';
export interface QualityVerdict {
  activity: 'Streaming' | 'Gaming' | 'Video calls';
  grade: QualityGrade;
  reason: string;
}

const grades = ['Excellent', 'Good', 'Fair', 'Poor'] as const;
const valid = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

// Product heuristics, not provider requirements or a standardized QoS score.
// Each array lists the Excellent, Good and Fair boundaries; anything worse is Poor.
function bandwidthGrade(value: number, thresholds: readonly number[]): number {
  const index = thresholds.findIndex((threshold) => value >= threshold);
  return index < 0 ? 3 : index;
}

function delayGrade(value: number, thresholds: readonly number[]): number {
  const index = thresholds.findIndex((threshold) => value <= threshold);
  return index < 0 ? 3 : index;
}

function unavailable(activity: QualityVerdict['activity']): QualityVerdict {
  return {
    activity,
    grade: 'Unavailable',
    reason: 'This result is missing the measurements needed for an estimate.',
  };
}

/** Lower-tail download samples temper a fast average when repeated dips were measured. */
function streaming(metrics: Metrics, samples: Sample[]): QualityVerdict {
  if (!valid(metrics.download)) return unavailable('Streaming');
  const values = samples
    .map((sample) => sample.value)
    .filter(valid)
    .sort((a, b) => a - b);
  const sustained =
    values.length >= 3
      ? Math.min(metrics.download, values[Math.floor((values.length - 1) * 0.2)])
      : metrics.download;
  const grade = bandwidthGrade(sustained, [25, 10, 3]);
  const reasons = [
    'Download capacity suggests comfortable headroom for a 4K stream.',
    'Download capacity suggests a comfortable HD streaming experience.',
    'Lower video quality may help avoid buffering.',
    'Limited download capacity may cause buffering, even at lower quality.',
  ];
  const dips = sustained < metrics.download * 0.6;
  return {
    activity: 'Streaming',
    grade: grades[grade],
    reason: `${reasons[grade]}${dips ? ' Repeated download dips lowered this estimate.' : ''}${values.length < 3 ? ' Download consistency could not be assessed.' : ''}`,
  };
}

function gaming(metrics: Metrics): QualityVerdict {
  const { latency, jitter, downloadLatency, uploadLatency } = metrics;
  if (!valid(latency) || !valid(jitter) || !valid(downloadLatency) || !valid(uploadLatency))
    return unavailable('Gaming');
  const idle = delayGrade(latency, [30, 60, 100]);
  const variation = delayGrade(jitter, [5, 15, 30]);
  const loaded = delayGrade(Math.max(downloadLatency, uploadLatency), [60, 120, 200]);
  const grade = Math.max(idle, variation, loaded);
  const reason =
    grade === 0
      ? 'Low delay and jitter suggest responsive play, including during transfers.'
      : loaded === grade
        ? 'Delay during downloads or uploads may make games feel less responsive.'
        : variation === grade
          ? 'Latency variation may make game responsiveness inconsistent.'
          : 'Idle latency may introduce noticeable delay in fast-paced games.';
  return { activity: 'Gaming', grade: grades[grade], reason };
}

function calling(metrics: Metrics): QualityVerdict {
  const { download, upload, jitter, downloadLatency, uploadLatency } = metrics;
  if (
    !valid(download) ||
    !valid(upload) ||
    !valid(jitter) ||
    !valid(downloadLatency) ||
    !valid(uploadLatency)
  )
    return unavailable('Video calls');
  // Upload chart acknowledgements are bursty, so do not mistake zero chart ticks for packet loss.
  const bandwidth = Math.max(
    bandwidthGrade(download, [10, 5, 1.5]),
    bandwidthGrade(upload, [5, 3, 1]),
  );
  const delay = delayGrade(Math.max(downloadLatency, uploadLatency), [100, 200, 400]);
  const variation = delayGrade(jitter, [10, 20, 40]);
  const grade = Math.max(bandwidth, delay, variation);
  const reason =
    grade === 0
      ? 'Upload headroom and low delay suggest clear, responsive video calls.'
      : bandwidth === grade
        ? 'Available upload or download capacity may limit call video quality.'
        : delay === grade
          ? 'Delay under load may cause pauses or people talking over each other.'
          : 'Latency variation may make conversation less consistent.';
  return { activity: 'Video calls', grade: grades[grade], reason };
}

/** Derived on demand so old shared results need no database migration. */
export function assessQuality(metrics: Metrics, downloadSamples: Sample[] = []): QualityVerdict[] {
  return [streaming(metrics, downloadSamples), gaming(metrics), calling(metrics)];
}
