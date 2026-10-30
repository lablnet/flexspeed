import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicResult } from '../../shared/results';
import { deleteCloudResult, getCloudHistory } from '../api/results';

export function useCloudHistory(userId: string | undefined) {
  const [results, setResults] = useState<PublicResult[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(
    async (next?: string) => {
      if (!userId) return;
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setLoading(true);
      setError(null);
      try {
        const page = await getCloudHistory(next, current.signal);
        if (current.signal.aborted) return;
        setResults((previous) => (next ? [...previous, ...page.results] : page.results));
        setCursor(page.nextCursor);
        setTotal(page.total ?? page.results.length);
      } catch (cause) {
        if (!current.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'History could not be loaded.');
      } finally {
        if (!current.signal.aborted) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    setResults([]);
    setTotal(0);
    setCursor(null);
    setError(null);
    setLoading(false);
    void load();
    return () => controller.current?.abort();
  }, [load]);

  const remove = async (id: string) => {
    try {
      await deleteCloudResult(id);
      setResults((previous) => previous.filter((result) => result.id !== id));
      setTotal((previous) => Math.max(0, previous - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove this result.');
    }
  };

  const refresh = useCallback(() => load(), [load]);

  return {
    results,
    loading,
    error,
    cursor,
    total,
    loadMore: () => void load(cursor ?? undefined),
    refresh,
    remove,
  };
}
