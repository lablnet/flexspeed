import { jitter, percentile } from '../../shared/math';
import type { MeasurementClient } from './api-client';
import { pause } from './timing';
import type { MeasurementContext } from './types';

export async function measurePing(
  client: MeasurementClient,
  signal?: AbortSignal,
): Promise<number> {
  const start = performance.now();
  await client.request(`ping?t=${crypto.randomUUID()}`, { signal }, 4000);
  return performance.now() - start;
}

function recordLatency(context: MeasurementContext, value: number): void {
  context.store.getState().addSample('latencySamples', {
    time: (performance.now() - context.started) / 1000,
    value,
  });
}

export async function measureIdleLatency(context: MeasurementContext): Promise<void> {
  const { client, store, signal } = context;
  const samples: number[] = [];

  // Connection setup must not inflate the reported idle latency.
  await measurePing(client);
  store.getState().update({ phase: 'latency', progress: 5 });

  for (let i = 0; i < 12; i++) {
    const value = await measurePing(client);
    samples.push(value);
    recordLatency(context, value);
    store.getState().update({ progress: 5 + ((i + 1) / 12) * 15 });
    await pause(70, signal);
  }

  store.getState().updateMetrics({ latency: percentile(samples, 0.5), jitter: jitter(samples) });
}

/** Probe concurrently with traffic; HTTP failures are not called packet loss. */
export async function collectLoadedLatency(
  context: MeasurementContext,
  signal: AbortSignal,
  samples: number[],
): Promise<void> {
  while (!signal.aborted) {
    try {
      const value = await measurePing(context.client, signal);
      samples.push(value);
      recordLatency(context, value);
      await pause(250, signal);
    } catch (error) {
      if (signal.aborted) return;
      throw error;
    }
  }
}
