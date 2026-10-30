import { MODE_CONFIG, type Mode } from '../../shared/types';
import { mbps, percentile } from '../../shared/math';
import { collectLoadedLatency } from './latency';
import { download, nextPayloadSize, upload, WARMUP_BYTES } from './transfer-io';
import { createTransferProgress } from './transfer-progress';
import type { Direction, MeasurementContext } from './types';

/** Schedule a bounded phase, while transport and sampling live in their own modules. */
export async function measureTransfer(
  context: MeasurementContext,
  direction: Direction,
  mode: Mode,
): Promise<void> {
  const { client, store, signal: globalSignal } = context;
  const config = MODE_CONFIG[mode];
  store.getState().update({ phase: direction, liveSpeed: 0 });

  const warmStart = performance.now();
  const addUsage = (bytes: number) => store.getState().addBytes(bytes);

  // Count warm-up data usage, but exclude it from measured throughput.
  if (direction === 'download') await download(client, WARMUP_BYTES, globalSignal, addUsage);
  else await upload(client, WARMUP_BYTES, globalSignal, addUsage);

  let size = nextPayloadSize(WARMUP_BYTES, performance.now() - warmStart);
  let reservedBytes = 0;
  const phaseController = new AbortController();
  const signal = AbortSignal.any([globalSignal, phaseController.signal]);
  const start = performance.now();
  const progress = createTransferProgress(store, direction, config.duration, start);
  const loaded: number[] = [];

  // Handle probe rejection immediately, then inspect it after all traffic stops.
  const probes = collectLoadedLatency(context, signal, loaded).then(
    () => null,
    (error) => error,
  );
  const interval = setInterval(() => progress.tick(), 350);
  const deadline = setTimeout(() => phaseController.abort(), config.duration);

  const runConnection = async () => {
    while (!signal.aborted && performance.now() - start < config.duration) {
      const available = config.byteBudget - reservedBytes;
      if (available <= 0) return;

      const bytes = Math.min(size, available);
      // Synchronous reservation prevents concurrent streams exceeding the budget.
      reservedBytes += bytes;
      const transferStart = performance.now();

      try {
        if (direction === 'download') {
          await download(client, bytes, signal, (received) => {
            progress.addBytes(received);
            addUsage(received);
          });
        } else {
          // Attempted upload usage is an upper estimate when cancelled mid-body.
          progress.addBytes(await upload(client, bytes, signal, addUsage));
        }

        size = nextPayloadSize(bytes, performance.now() - transferStart);
      } catch (error) {
        if (signal.aborted) return;
        // Stop sibling requests immediately when one connection fails.
        phaseController.abort();
        throw error;
      }
    }
  };

  try {
    const results = await Promise.allSettled(
      Array.from({ length: config.connections }, runConnection),
    );
    globalSignal.throwIfAborted();

    const failure = results.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    if (!progress.bytes)
      throw new Error(
        'The connection is too slow or interrupted. No complete measurement was received.',
      );

    const loadedMetrics =
      direction === 'download'
        ? { downloadLatency: percentile(loaded, 0.5), downloadP95: percentile(loaded, 0.95) }
        : { uploadLatency: percentile(loaded, 0.5), uploadP95: percentile(loaded, 0.95) };

    store.getState().updateMetrics({
      [direction]: mbps(progress.bytes, performance.now() - start),
      ...loadedMetrics,
    });
    progress.tick();
  } finally {
    clearInterval(interval);
    clearTimeout(deadline);
    phaseController.abort();

    const probeError = await probes;
    if (probeError && !globalSignal.aborted)
      throw new Error('Latency probes failed under load. Please retry.');
  }
}
