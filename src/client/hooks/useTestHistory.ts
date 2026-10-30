import { useCallback, useEffect, useState } from 'react';
import type { SavedResult } from '../../shared/types';
import { readStorage, writeStorage } from '../utils/storage';
import type { SaveResponse } from '../../shared/results';

const HISTORY_KEY = 'flexspeed.history';
const HISTORY_LIMIT = 20;

function loadHistory(): SavedResult[] {
  const value = readStorage<unknown>(HISTORY_KEY, []);
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.date === 'string' &&
        item.metrics &&
        typeof item.bytes === 'number',
    )
    .slice(0, HISTORY_LIMIT);
}

export function useTestHistory() {
  const [history, setHistory] = useState(loadHistory);

  // Keep persistence outside state updaters, which StrictMode can invoke twice.
  useEffect(() => writeStorage(HISTORY_KEY, history), [history]);

  const addResult = useCallback((result: SavedResult) => {
    setHistory((previous) =>
      [result, ...previous.filter((entry) => entry.id !== result.id)].slice(0, HISTORY_LIMIT),
    );
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const removeResults = useCallback((ids: string[]) => {
    if (!ids.length) return;
    const removed = new Set(ids);
    setHistory((previous) => {
      const next = previous.filter((entry) => !removed.has(entry.id));
      return next.length === previous.length ? previous : next;
    });
  }, []);

  const replaceHistory = useCallback((entries: SavedResult[]) => {
    const next = entries.slice(0, HISTORY_LIMIT);
    // Commit the logout snapshot before the auth state changes or navigation occurs.
    writeStorage(HISTORY_KEY, next);
    setHistory(next);
  }, []);

  const updateResult = useCallback((id: string, saved: SaveResponse) => {
    setHistory((previous) =>
      previous.map((result) =>
        result.id === id
          ? { ...result, shareId: saved.id, shareUrl: saved.shareUrl, posterUrl: saved.posterUrl }
          : result,
      ),
    );
  }, []);

  return { history, addResult, updateResult, clearHistory, removeResults, replaceHistory };
}
