import { useCallback, useEffect, useRef, useState } from 'react';
import type { SavedResult } from '../../shared/types';
import type { BeforeSignOut } from '../auth/AuthContext';
import { getCloudHistory, syncCloudHistory } from '../api/results';
import { browserSnapshot, entriesForAccount } from '../history/sync';

interface HistorySyncOptions {
  userId: string | undefined;
  entries: SavedResult[];
  removeResults: (ids: string[]) => void;
  replaceHistory: (entries: SavedResult[]) => void;
  refresh: () => Promise<void>;
  registerBeforeSignOut: (handler: BeforeSignOut) => () => void;
  waitForSave: () => Promise<void>;
}

export function useHistorySync({
  userId,
  entries,
  removeResults,
  replaceHistory,
  refresh,
  registerBeforeSignOut,
  waitForSave,
}: HistorySyncOptions) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const latest = useRef({ entries, userId });
  latest.current = { entries, userId };
  const inFlight = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  const sync = useCallback(async () => {
    if (!userId) return;
    if (inFlight.current?.userId === userId) return inFlight.current.promise;
    const pending = entriesForAccount(latest.current.entries, userId);
    const foreignCache = latest.current.entries.filter(
      (entry) => entry.accountId && entry.accountId !== userId,
    );
    if (foreignCache.length) removeResults(foreignCache.map((entry) => entry.id));
    if (!pending.length) return;

    const run = async () => {
      setSyncing(true);
      setSyncError(null);
      try {
        const result = await syncCloudHistory(pending);
        if (latest.current.userId !== userId) return;
        // Never clear unacknowledged local records after a failed or partial import.
        removeResults([...result.syncedIds, ...(result.discardedIds ?? [])]);
        await refresh();
        if (result.remaining)
          throw new Error('Some browser results could not be synced. They remain in this browser.');
      } finally {
        if (latest.current.userId === userId) setSyncing(false);
        if (inFlight.current?.userId === userId) inFlight.current = null;
      }
    };
    const promise = run();
    inFlight.current = { userId, promise };
    return promise;
  }, [userId, removeResults, refresh]);

  const retrySync = useCallback(() => {
    void sync().catch((cause) =>
      setSyncError(cause instanceof Error ? cause.message : 'History sync failed. Please retry.'),
    );
  }, [sync]);

  useEffect(() => {
    if (!userId) {
      setSyncError(null);
      return;
    }
    if (entries.length) retrySync();
  }, [userId, entries, retrySync]);

  useEffect(() => {
    if (!userId) return;
    return registerBeforeSignOut(async () => {
      await waitForSave();
      await sync();
      const snapshot = await getCloudHistory();
      return () => replaceHistory(browserSnapshot(snapshot.results, userId));
    });
  }, [userId, sync, replaceHistory, registerBeforeSignOut, waitForSave]);

  return { syncing, syncError, retrySync };
}
