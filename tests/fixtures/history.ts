import type { SavedResult } from '../../src/shared/types';
import type { PublicResult, ResultSubmission } from '../../src/shared/results';

export function browserResult(): SavedResult {
  return {
    id: crypto.randomUUID(),
    date: '2026-10-01T12:00:00.000Z',
    mode: 'lite',
    bytes: 12345,
    server: 'LHE',
    metrics: {
      download: 53.3,
      upload: 41.6,
      latency: 38.1,
      jitter: 7.9,
      downloadLatency: 66,
      uploadLatency: 84.7,
      downloadP95: 100,
      uploadP95: 120,
    },
  };
}

export function publicHistoryResult(): PublicResult {
  const result = browserResult();
  return {
    ...result,
    methodVersion: '1',
    samples: { download: [], upload: [], latency: [] },
    network: 'Example ISP',
    country: 'PK',
    shareUrl: `http://localhost/r/${result.id}`,
    posterUrl: `http://localhost/og/${result.id}.png`,
  };
}

export function historySubmission(result: SavedResult): ResultSubmission {
  return {
    ...result,
    samples: { download: [{ time: 1, value: 53.3 }], upload: [], latency: [] },
    client: { timezone: 'Asia/Karachi' },
  };
}
