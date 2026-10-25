import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to safely apply theme classes to DOM
const applyThemeToDOM = (t: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  if (t === 'dark') {
    root.classList.add('dark');
    body?.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    body?.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('gridbricks_theme');
        if (stored === 'light' || stored === 'dark') {
          applyThemeToDOM(stored);
          return stored;
        }
      } catch {
        // Local storage unavailable (private browsing / iframe sandboxing)
      }

      try {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          applyThemeToDOM('dark');
          return 'dark';
        }
      } catch {
        // matchMedia unavailable
      }
    }
    applyThemeToDOM('light');
    return 'light';
  });

  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem('gridbricks_theme', theme);
    } catch {
      // Local storage unavailable
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyThemeToDOM(next);
      return next;
    });
  };

  const setTheme = (t: Theme) => {
    applyThemeToDOM(t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
