import { createStore } from 'zustand/vanilla';
import { EMPTY_METRICS, type Metrics, type Sample, type TestState } from '../../shared/types';

type SampleKey = 'downloadSamples' | 'uploadSamples' | 'latencySamples';

export function initialState(): TestState {
  return {
    phase: 'idle',
    progress: 0,
    liveSpeed: 0,
    bytes: 0,
    metrics: { ...EMPTY_METRICS },
    downloadSamples: [],
    uploadSamples: [],
    latencySamples: [],
    error: null,
  };
}

interface MeasurementActions {
  addBytes: (bytes: number) => void;
  addSample: (key: SampleKey, sample: Sample) => void;
  updateMetrics: (metrics: Partial<Metrics>) => void;
  update: (patch: Partial<TestState>) => void;
  reset: () => void;
}

/** Each engine can use an isolated store; the browser shares one instance. */
export function createMeasurementStore() {
  // Byte callbacks can run thousands of times per second. Publish usage on progress ticks.
  let bytes = 0;
  return createStore<TestState & MeasurementActions>()((set) => ({
    ...initialState(),
    addBytes: (value) => {
      bytes += value;
    },
    addSample: (key, sample) => set((state) => ({ [key]: [...state[key], sample] })),
    updateMetrics: (metrics) => set((state) => ({ metrics: { ...state.metrics, ...metrics } })),
    update: (patch) => set({ ...patch, bytes }),
    reset: () => {
      bytes = 0;
      set(initialState());
    },
  }));
}

export type MeasurementStore = ReturnType<typeof createMeasurementStore>;
export const measurementStore = createMeasurementStore();
