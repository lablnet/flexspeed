import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/': 'Meet your connection',
  '/history': 'Your test history',
  '/about': 'How it works',
  '/login': 'Sign in',
  '/privacy': 'Data & privacy',
};

export function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Shared results retain their server-rendered title until their data loads.
    if (!pathname.startsWith('/r/')) {
      document.title = `${titles[pathname] ?? 'Page not found'} | Flexspeed`;
    }
  }, [pathname]);
}
