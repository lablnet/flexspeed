import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeedTest } from '../src/client/engine/SpeedTest';
import { createMeasurementStore } from '../src/client/engine/state';
import { MeasurementClient } from '../src/client/engine/api-client';
import { download, upload } from '../src/client/engine/transfer-io';
import type { TestState } from '../src/shared/types';

afterEach(() => vi.unstubAllGlobals());

describe('measurement engine boundaries', () => {
  it('resets a repeated test without affecting another engine store', () => {
    const store = createMeasurementStore();
    const other = createMeasurementStore();
    store.getState().addBytes(500);
    store.getState().addSample('downloadSamples', { time: 1, value: 42 });
    store.getState().updateMetrics({ download: 42 });
    store.getState().update({ phase: 'complete', progress: 100 });

    expect(other.getState().phase).toBe('idle');
    expect(other.getState().downloadSamples).toEqual([]);

    store.getState().reset();
    store.getState().addBytes(10);
    store.getState().update({ phase: 'connecting' });
    expect(store.getState().bytes).toBe(10);
    expect(store.getState().downloadSamples).toEqual([]);
    expect(store.getState().metrics.download).toBeNull();
    expect(store.getState().progress).toBe(0);
  });

  it('keeps emitted snapshots independent of subsequent measurement updates', () => {
    const states: TestState[] = [];
    const store = createMeasurementStore();
    states.push(store.getState());
    store.getState().addBytes(100);
    store.getState().addSample('downloadSamples', { time: 1, value: 42 });
    store.getState().updateMetrics({ download: 42 });
    store.getState().update({});
    states.push(store.getState());

    expect(states[0].bytes).toBe(0);
    expect(states[0].downloadSamples).toEqual([]);
    expect(states[0].metrics.download).toBeNull();
    expect(states[1].metrics.download).toBe(42);
  });

  it('rejects incomplete download bodies and incorrect upload acknowledgements', async () => {
    const controller = new AbortController();
    const client = new MeasurementClient(controller.signal);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array(3))));
    await expect(download(client, 4, controller.signal, () => {})).rejects.toThrow(
      'Download byte count',
    );

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ bytes: 3 })));
    await expect(upload(client, 4, controller.signal, () => {})).rejects.toThrow(
      'Upload byte count',
    );
  });

  it('cancels an in-flight session request without reporting a completed result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
              once: true,
            });
          }),
      ),
    );

    const states: TestState[] = [];
    const store = createMeasurementStore();
    store.subscribe((state) => states.push(state));
    const engine = new SpeedTest('lite', store);
    const running = engine.run();
    engine.cancel();
    await running;

    expect(states.at(-1)?.phase).toBe('cancelled');
    expect(states.some((state) => state.phase === 'complete')).toBe(false);
  });

  it('completes all phases through the shared API contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init: RequestInit) => {
        const url = new URL(path, 'http://localhost');
        if (url.pathname.endsWith('/session')) return Response.json({ token: 'test-token' });
        expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-token');
        if (url.pathname.endsWith('/ping')) return new Response(null, { status: 204 });
        if (url.pathname.endsWith('/download'))
          return new Response(new Uint8Array(Number(url.searchParams.get('bytes'))));
        if (url.pathname.endsWith('/upload'))
          return Response.json({ bytes: (init.body as Uint8Array).byteLength });
        throw new Error('Unexpected request');
      }),
    );

    const states: TestState[] = [];
    const store = createMeasurementStore();
    store.subscribe((state) => states.push(state));
    await new SpeedTest('lite', store).run();
    const result = states.at(-1)!;

    expect(result.phase).toBe('complete');
    expect(result.progress).toBe(100);
    expect(result.metrics.download).toBeGreaterThan(0);
    expect(result.metrics.upload).toBeGreaterThan(0);
    expect(result.metrics.latency).not.toBeNull();
    expect(result.metrics.downloadLatency).not.toBeNull();
    expect(result.metrics.uploadLatency).not.toBeNull();
    expect(result.bytes).toBeLessThanOrEqual(81 * 1024 * 1024);
    expect(new Set(states.map((state) => state.phase))).toEqual(
      new Set(['connecting', 'latency', 'download', 'upload', 'complete']),
    );
  });
});
