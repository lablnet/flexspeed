export type Phase =
  'idle' | 'connecting' | 'latency' | 'download' | 'upload' | 'complete' | 'cancelled' | 'error';
export type Mode = 'standard' | 'lite';
export interface NetworkInfo {
  ip: string | null;
  network: string | null;
  asn: number | null;
  city: string | null;
  country: string | null;
  colo: string | null;
  local: boolean;
}
export interface Sample {
  time: number;
  value: number;
}
export interface Metrics {
  download: number | null;
  upload: number | null;
  latency: number | null;
  jitter: number | null;
  downloadLatency: number | null;
  uploadLatency: number | null;
  downloadP95: number | null;
  uploadP95: number | null;
}
export interface TestState {
  phase: Phase;
  progress: number;
  liveSpeed: number;
  bytes: number;
  metrics: Metrics;
  downloadSamples: Sample[];
  uploadSamples: Sample[];
  latencySamples: Sample[];
  error: string | null;
}
export interface SavedResult {
  id: string;
  date: string;
  mode: Mode;
  metrics: Metrics;
  bytes: number;
  server: string | null;
  shareId?: string;
  shareUrl?: string;
  posterUrl?: string;
  accountId?: string;
}
export const EMPTY_METRICS: Metrics = {
  download: null,
  upload: null,
  latency: null,
  jitter: null,
  downloadLatency: null,
  uploadLatency: null,
  downloadP95: null,
  uploadP95: null,
};
export const MAX_PAYLOAD = 16 * 1024 * 1024;
export const MODE_CONFIG = {
  standard: { duration: 8000, byteBudget: 400 * 1024 * 1024, connections: 4 },
  lite: { duration: 4000, byteBudget: 40 * 1024 * 1024, connections: 2 },
} as const;
