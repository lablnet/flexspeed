import type { SavedResult } from '../../shared/types';
import type { PublicResult } from '../../shared/results';

/** Account snapshots are tagged so another login cannot import a different user's cache. */
export function browserSnapshot(results: PublicResult[], userId: string): SavedResult[] {
  return results.slice(0, 20).map((result) => ({
    id: result.id,
    shareId: result.id,
    date: result.date,
    mode: result.mode,
    metrics: result.metrics,
    bytes: result.bytes,
    server: result.server,
    shareUrl: result.shareUrl,
    posterUrl: result.posterUrl,
    accountId: userId,
  }));
}

export function entriesForAccount(entries: SavedResult[], userId: string): SavedResult[] {
  return entries.filter((entry) => !entry.accountId || entry.accountId === userId);
}
