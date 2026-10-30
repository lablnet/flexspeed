import { requestJson as request } from './request';
import type {
  CloudHistoryPage,
  PublicResult,
  ResultSubmission,
  SaveResponse,
  HistorySyncResponse,
} from '../../shared/results';
import type { SavedResult } from '../../shared/types';

export function saveCloudResult(result: ResultSubmission, token: string): Promise<SaveResponse> {
  return request('results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(result),
    signal: AbortSignal.timeout(20_000),
  });
}

export const getPublicResult = (id: string, signal?: AbortSignal) =>
  request<PublicResult>(`results/${encodeURIComponent(id)}`, { signal });
export const getCloudHistory = (cursor?: string, signal?: AbortSignal) =>
  request<CloudHistoryPage>(`history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
    signal,
  });

export const deleteCloudResult = (id: string) =>
  request<{ deleted: boolean }>(`results/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const syncCloudHistory = (entries: SavedResult[]) =>
  request<HistorySyncResponse>('history/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries),
    signal: AbortSignal.timeout(20_000),
  });
