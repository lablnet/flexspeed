import type { Metrics, Mode, Sample, SavedResult } from './types';

export interface ResultSamples {
  download: Sample[];
  upload: Sample[];
  latency: Sample[];
}

export interface ResultSubmission {
  id: string;
  date: string;
  mode: Mode;
  metrics: Metrics;
  bytes: number;
  samples: ResultSamples;
  client: Record<string, unknown>;
}

export interface PublicResult extends SavedResult {
  methodVersion: string;
  samples: ResultSamples;
  network: string | null;
  country: string | null;
  shareUrl: string;
  posterUrl: string;
}

export interface CloudHistoryPage {
  results: PublicResult[];
  nextCursor: string | null;
  total: number;
}

export interface HistorySyncResponse {
  syncedIds: string[];
  discardedIds: string[];
  remaining: number;
}

export interface SaveResponse {
  id: string;
  shareUrl: string;
  posterUrl: string;
}
