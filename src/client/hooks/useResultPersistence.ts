import { useCallback, useRef, useState } from 'react';
import type { SavedResult, TestState } from '../../shared/types';
import type { ResultSubmission, SaveResponse } from '../../shared/results';
import { saveCloudResult } from '../api/results';
import { clientMetadata } from '../utils/client-metadata';

export interface CloudSaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  result: SaveResponse | null;
  error: string | null;
}

interface PendingSave {
  submission: ResultSubmission;
  token: string;
  saved?: boolean;
  promise?: Promise<void>;
}
const initialSave: CloudSaveState = { status: 'idle', result: null, error: null };

export function useResultPersistence(
  addResult: (result: SavedResult) => void,
  updateResult: (id: string, saved: SaveResponse) => void,
  signedIn = false,
) {
  const [cloudSave, setCloudSave] = useState(initialSave);
  const pending = useRef<PendingSave | null>(null);

  const persist = useCallback(
    async (attempt: PendingSave) => {
      setCloudSave({ status: 'saving', result: null, error: null });
      try {
        const saved = await saveCloudResult(attempt.submission, attempt.token);
        attempt.saved = true;
        updateResult(attempt.submission.id, saved);
        if (pending.current === attempt)
          setCloudSave({ status: 'saved', result: saved, error: null });
      } catch (cause) {
        if (pending.current === attempt)
          setCloudSave({
            status: 'error',
            result: null,
            error: cause instanceof Error ? cause.message : 'Cloud save failed.',
          });
      }
    },
    [updateResult],
  );

  const onComplete = useCallback(
    (result: SavedResult, state: TestState, token: string) => {
      // Signed-in results go straight to the account; guest results stay local
      // until login sync acknowledges them. Neither path affects timed phases.
      if (!signedIn) addResult(result);
      const attempt: PendingSave = {
        token,
        submission: {
          id: result.id,
          date: result.date,
          mode: result.mode,
          metrics: result.metrics,
          bytes: result.bytes,
          samples: {
            download: state.downloadSamples,
            upload: state.uploadSamples,
            latency: state.latencySamples,
          },
          client: clientMetadata(),
        },
      };
      pending.current = attempt;
      attempt.promise = persist(attempt);
    },
    [addResult, persist, signedIn],
  );

  const retrySave = useCallback(() => {
    if (pending.current) pending.current.promise = persist(pending.current);
  }, [persist]);
  const resetSave = useCallback(() => {
    pending.current = null;
    setCloudSave(initialSave);
  }, []);

  const waitForSave = useCallback(async () => {
    const attempt = pending.current;
    if (!attempt) return;
    await attempt.promise;
    if (!attempt.saved)
      throw new Error(
        'Your latest test has not been saved. Retry cloud saving before signing out.',
      );
  }, []);

  return { cloudSave, onComplete, retrySave, resetSave, waitForSave };
}
