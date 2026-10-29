'use client';

import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('light');
    root.classList.remove('dark');
    try {
      localStorage.setItem('traceclear-theme', 'light');
    } catch {
      // Storage can be unavailable in private browsing.
    }
  }, []);

  return children;
}
