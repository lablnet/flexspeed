import { MAX_PAYLOAD } from '../../shared/types';
import type { MeasurementClient } from './api-client';

export const WARMUP_BYTES = 64 * 1024;

/** Aim for frequent acknowledgements without creating tiny-request overhead. */
export function nextPayloadSize(bytes: number, elapsed: number): number {
  return Math.min(
    MAX_PAYLOAD,
    Math.max(WARMUP_BYTES, Math.round((bytes / Math.max(elapsed, 1)) * 400)),
  );
}

function randomPayload(bytes: number): Uint8Array<ArrayBuffer> {
  const body = new Uint8Array(bytes);

  // Web Crypto limits each getRandomValues call to 65,536 bytes.
  for (let offset = 0; offset < bytes; offset += 65536) {
    crypto.getRandomValues(body.subarray(offset, Math.min(bytes, offset + 65536)));
  }

  return body;
}

export async function download(
  client: MeasurementClient,
  bytes: number,
  signal: AbortSignal,
  onBytes: (bytes: number) => void,
): Promise<void> {
  const response = await client.request(`download?bytes=${bytes}&t=${crypto.randomUUID()}`, {
    signal,
  });
  if (!response.body) throw new Error('Download response has no body.');

  const reader = response.body.getReader();
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      onBytes(value.byteLength);
    }
  } finally {
    reader.releaseLock();
  }

  if (received !== bytes) throw new Error('Download byte count did not match.');
}

export async function upload(
  client: MeasurementClient,
  bytes: number,
  signal: AbortSignal,
  onAttempt: (bytes: number) => void,
): Promise<number> {
  const body = randomPayload(bytes);
  onAttempt(bytes);
  const response = await client.request('upload', { method: 'POST', body, signal });
  const result = (await response.json()) as { bytes: number };

  // Headers alone do not prove that the server received the complete upload.
  if (result.bytes !== bytes) throw new Error('Upload byte count did not match.');
  return result.bytes;
}
