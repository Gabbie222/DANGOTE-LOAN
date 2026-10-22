import React, { createContext, useContext, useMemo, useState } from 'react';
import { themes } from './theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, initial = 'dark' }) {
  const [mode, setMode] = useState(initial);

  const value = useMemo(
    () => ({
      mode,
      colors: themes[mode],
      toggleTheme: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within a ThemeProvider');
  return ctx;
}
