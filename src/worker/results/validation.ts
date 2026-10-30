import type { ResultSubmission, ResultSamples } from '../../shared/results';
import type { Metrics, Sample } from '../../shared/types';

const METRIC_KEYS = [
  'download',
  'upload',
  'latency',
  'jitter',
  'downloadLatency',
  'uploadLatency',
  'downloadP95',
  'uploadP95',
] as const;
export const RESULT_BODY_LIMIT = 512 * 1024;

const finite = (value: unknown, max: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function parseSamples(value: unknown): Sample[] {
  if (!Array.isArray(value) || value.length > 3000) throw new Error('Invalid measurement samples.');
  return value.map((point) => {
    if (!object(point) || !finite(point.time, 3600) || !finite(point.value, 10_000_000))
      throw new Error('Invalid measurement sample.');
    return { time: point.time as number, value: point.value as number };
  });
}

/** Allowlist the stored contract; identities and IP addresses are server-derived. */
export function parseSubmission(value: unknown): ResultSubmission {
  if (!object(value)) throw new Error('Invalid result.');
  if (
    typeof value.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.id)
  )
    throw new Error('Invalid result ID.');
  if (typeof value.date !== 'string' || !Number.isFinite(Date.parse(value.date)))
    throw new Error('Invalid result date.');
  if (value.mode !== 'standard' && value.mode !== 'lite') throw new Error('Invalid test mode.');
  if (!finite(value.bytes, 1024 * 1024 * 1024)) throw new Error('Invalid data usage.');
  if (!object(value.metrics)) throw new Error('Invalid metrics.');

  const metrics = {} as Metrics;
  for (const key of METRIC_KEYS) {
    const metric = value.metrics[key];
    if (
      metric !== null &&
      !finite(metric, key === 'download' || key === 'upload' ? 1_000_000 : 120_000)
    )
      throw new Error(`Invalid ${key}.`);
    metrics[key] = metric as number | null;
  }
  if (
    metrics.download === null ||
    metrics.upload === null ||
    metrics.latency === null ||
    metrics.jitter === null
  )
    throw new Error('Only completed results can be saved.');
  if (!object(value.samples)) throw new Error('Missing measurement samples.');
  const samples: ResultSamples = {
    download: parseSamples(value.samples.download),
    upload: parseSamples(value.samples.upload),
    latency: parseSamples(value.samples.latency),
  };
  if (!object(value.client) || JSON.stringify(value.client).length > 16_384)
    throw new Error('Invalid client metadata.');

  return {
    id: value.id,
    date: value.date,
    mode: value.mode,
    metrics,
    bytes: Math.round(value.bytes as number),
    samples,
    client: value.client,
  };
}

export async function readSubmission(request: Request): Promise<ResultSubmission> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    throw new Error('JSON body required.');
  if (!request.body) throw new Error('Result body required.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > RESULT_BODY_LIMIT) {
        await reader.cancel();
        throw new Error('Result body too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return parseSubmission(JSON.parse(new TextDecoder().decode(bytes)));
}
