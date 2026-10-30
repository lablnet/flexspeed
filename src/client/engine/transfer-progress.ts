import { mbps } from '../../shared/math';
import type { MeasurementStore } from './state';
import type { Direction } from './types';

/** Sample UI progress independently of transfer completion callbacks. */
export function createTransferProgress(
  store: MeasurementStore,
  direction: Direction,
  duration: number,
  start: number,
) {
  let bytes = 0;
  let lastBytes = 0;
  let lastTick = start;
  const baseProgress = direction === 'download' ? 20 : 60;

  return {
    addBytes(value: number) {
      bytes += value;
    },
    get bytes() {
      return bytes;
    },
    tick() {
      const now = performance.now();
      const speed = mbps(bytes - lastBytes, now - lastTick);
      const key = direction === 'download' ? 'downloadSamples' : 'uploadSamples';
      store.getState().addSample(key, { time: (now - start) / 1000, value: speed });
      lastBytes = bytes;
      lastTick = now;
      store.getState().update({
        liveSpeed: speed,
        progress: baseProgress + Math.min(1, (now - start) / duration) * 40,
      });
    },
  };
}
