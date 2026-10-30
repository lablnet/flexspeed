import { measurementStore } from '../engine/state';
import { useCallback, useState } from 'react';
import type { Mode } from '../../shared/types';
import { useNetworkInfo } from '../hooks/useNetworkInfo';
import { useSpeedTest } from '../hooks/useSpeedTest';
import { useTestHistory } from '../hooks/useTestHistory';
import { useResultPersistence } from '../hooks/useResultPersistence';
import { useAuth } from '../auth/AuthContext';
import { useCloudHistory } from '../hooks/useCloudHistory';
import { useHistorySync } from '../hooks/useHistorySync';
import type { SaveResponse } from '../../shared/results';
import { activePhases } from '../constants/test';

export function useTestModel() {
  const { user, registerBeforeSignOut } = useAuth();
  const [mode, setMode] = useState<Mode>('standard');
  const network = useNetworkInfo();
  const history = useTestHistory();
  const cloud = useCloudHistory(user?.id);
  const saved = useCallback(
    (id: string, result: SaveResponse) => {
      if (user) {
        history.removeResults([id]);
        void cloud.refresh();
      } else history.updateResult(id, result);
    },
    [user, history.removeResults, history.updateResult, cloud.refresh],
  );
  const persistence = useResultPersistence(history.addResult, saved, Boolean(user));
  const test = useSpeedTest({
    mode,
    server: network.info?.colo ?? null,
    onComplete: persistence.onComplete,
  });
  const waitForSave = useCallback(async () => {
    if (activePhases.includes(measurementStore.getState().phase))
      throw new Error('Finish or cancel the current test before signing out.');
    await persistence.waitForSave();
  }, [persistence.waitForSave]);
  const historySync = useHistorySync({
    userId: user?.id,
    entries: history.history,
    removeResults: history.removeResults,
    replaceHistory: history.replaceHistory,
    refresh: cloud.refresh,
    registerBeforeSignOut,
    waitForSave,
  });

  const start = () => {
    persistence.resetSave();
    test.start();
  };
  return {
    mode,
    setMode,
    ...network,
    ...history,
    ...test,
    ...persistence,
    ...historySync,
    cloudHistory: cloud,
    historyCount: user ? cloud.total : history.history.length,
    start,
  };
}
