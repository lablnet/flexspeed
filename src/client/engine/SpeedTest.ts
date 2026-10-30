import type { Mode } from '../../shared/types';
import { MeasurementClient } from './api-client';
import { measureIdleLatency } from './latency';
import { createMeasurementStore, type MeasurementStore } from './state';
import { measureTransfer } from './transfer';

/** Orchestrate phases only; individual measurements do not depend on React. */
export class SpeedTest {
  private controller = new AbortController();
  private client: MeasurementClient;

  constructor(
    private mode: Mode,
    private store: MeasurementStore = createMeasurementStore(),
  ) {
    this.client = new MeasurementClient(this.controller.signal);
  }

  cancel(): void {
    this.controller.abort(new DOMException('Test cancelled', 'AbortError'));
  }

  get sessionToken(): string {
    return this.client.sessionToken;
  }

  async run(): Promise<void> {
    const context = {
      client: this.client,
      store: this.store,
      signal: this.controller.signal,
      started: performance.now(),
    };

    try {
      this.store.getState().update({ phase: 'connecting', progress: 2 });
      await this.client.connect();
      await measureIdleLatency(context);
      await measureTransfer(context, 'download', this.mode);
      await measureTransfer(context, 'upload', this.mode);
      this.controller.signal.throwIfAborted();
      this.store.getState().update({ phase: 'complete', progress: 100, liveSpeed: 0 });
    } catch (error) {
      if (this.controller.signal.aborted) {
        this.store.getState().update({ phase: 'cancelled', liveSpeed: 0 });
      } else {
        this.store.getState().update({
          phase: 'error',
          liveSpeed: 0,
          error:
            error instanceof Error ? error.message : 'The test could not finish. Please try again.',
        });
      }
    }
  }
}
