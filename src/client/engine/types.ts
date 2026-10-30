import type { MeasurementClient } from './api-client';
import type { MeasurementStore } from './state';

export type Direction = 'download' | 'upload';

export interface MeasurementContext {
  client: MeasurementClient;
  store: MeasurementStore;
  signal: AbortSignal;
  started: number;
}
