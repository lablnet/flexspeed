import { useEffect, useState } from 'react';
import type { NetworkInfo } from '../../shared/types';

export function useNetworkInfo() {
  const [info, setInfo] = useState<NetworkInfo | null>(null);
  const [infoError, setInfoError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/info', { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Network details unavailable');
        return response.json() as Promise<NetworkInfo>;
      })
      .then(setInfo)
      .catch(() => {
        if (!controller.signal.aborted) setInfoError(true);
      });

    return () => controller.abort();
  }, []);

  return { info, infoError };
}
