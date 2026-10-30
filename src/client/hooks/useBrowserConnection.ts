import { useEffect, useState } from 'react';
import { browserConnectionSnapshot, getBrowserConnection } from '../utils/browser-connection';

export function useBrowserConnection() {
  const [connection, setConnection] = useState(browserConnectionSnapshot);
  useEffect(() => {
    const source = getBrowserConnection();
    const update = () => setConnection(browserConnectionSnapshot());
    source?.addEventListener('change', update);
    return () => source?.removeEventListener('change', update);
  }, []);
  return connection;
}
