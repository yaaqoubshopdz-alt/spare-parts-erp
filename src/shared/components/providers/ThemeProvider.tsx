/**
 * ThemeProvider — manages dark theme and glassmorphism styles.
 * Currently single-theme (dark professional). Can be extended later.
 */
import React, { useEffect } from 'react';
import { useAppStore } from '../../../store/app.store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    // Apply the initial theme from the store
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return <>{children}</>;
}
