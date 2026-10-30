import { useCallback, useEffect, useRef } from 'react';
import type { Mode, SavedResult, TestState } from '../../shared/types';
import { SpeedTest } from '../engine/SpeedTest';
import { measurementStore } from '../engine/state';

interface SpeedTestOptions {
  mode: Mode;
  server: string | null;
  onComplete: (result: SavedResult, state: TestState, token: string) => void;
}

/** Own the engine lifecycle without coupling timing to React rendering. */
export function useSpeedTest({ mode, server, onComplete }: SpeedTestOptions) {
  const test = useRef<SpeedTest | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      test.current?.cancel();
    };
  }, []);

  const start = useCallback(() => {
    if (test.current) return;

    measurementStore.getState().reset();
    const engine = new SpeedTest(mode, measurementStore);
    test.current = engine;

    void engine
      .run()
      .then(() => {
        if (!mounted.current) return;
        const next = measurementStore.getState();
        if (next.phase === 'complete') {
          onComplete(
            {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              mode,
              metrics: next.metrics,
              bytes: next.bytes,
              server,
            },
            next,
            engine.sessionToken,
          );
        }
      })
      .finally(() => {
        test.current = null;
      });
  }, [mode, server, onComplete]);

  const cancel = useCallback(() => test.current?.cancel(), []);

  return { start, cancel };
}
