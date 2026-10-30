import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../utils/storage';

export function useTheme() {
  const [dark, setDark] = useState(() => readStorage('flexspeed.dark', false));

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    writeStorage('flexspeed.dark', dark);
  }, [dark]);

  return { dark, toggleTheme: () => setDark((previous) => !previous) };
}
