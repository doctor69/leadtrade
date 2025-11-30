import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeManager, type Theme, type ThemeConfig } from '@/lib/theme-manager';

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: Theme;
  themeColor: string;
  setTheme: (theme: Theme) => void;
  setThemeColor: (color: string) => void;
  isLoaded: boolean;
};

const initialState: ThemeProviderState = {
  theme: 'light',
  themeColor: '#ef4444',
  setTheme: () => null,
  setThemeColor: () => null,
  isLoaded: false,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [config, setConfig] = useState<ThemeConfig>({ theme: 'light', themeColor: '#ef4444' });
  const [isLoaded, setIsLoaded] = useState(false);
  const [themeManager] = useState(() => {
    // Only initialize ThemeManager on client-side
    if (typeof window !== 'undefined') {
      return ThemeManager.getInstance();
    }
    return null;
  });

  useEffect(() => {
    console.log('[ThemeProvider] useEffect running, themeManager:', !!themeManager);
    
    // Skip if SSR or no theme manager
    if (!themeManager) {
      console.warn('[ThemeProvider] No theme manager in useEffect');
      return;
    }

    // Initialize with current theme manager state
    const currentConfig = themeManager.getConfig();
    console.log('[ThemeProvider] Current config from manager:', currentConfig);
    setConfig(currentConfig);
    setIsLoaded(true);

    // Subscribe to theme changes
    const unsubscribe = themeManager.subscribe((newConfig) => {
      console.log('[ThemeProvider] Received config update:', newConfig);
      setConfig(newConfig);
    });

    return unsubscribe;
  }, [themeManager]);

  const setTheme = (newTheme: Theme) => {
    console.log('[ThemeProvider] setTheme called with:', newTheme, 'themeManager exists:', !!themeManager);
    if (themeManager) {
      const success = themeManager.setTheme(newTheme);
      console.log('[ThemeProvider] setTheme result:', success);
    } else {
      console.warn('[ThemeProvider] No theme manager available');
    }
  };

  const setThemeColor = (newColor: string) => {
    console.log('[ThemeProvider] setThemeColor called with:', newColor, 'themeManager exists:', !!themeManager);
    if (themeManager) {
      const success = themeManager.setThemeColor(newColor);
      console.log('[ThemeProvider] setThemeColor result:', success);
    } else {
      console.warn('[ThemeProvider] No theme manager available');
    }
  };

  const value: ThemeProviderState = {
    theme: config.theme,
    themeColor: config.themeColor,
    setTheme,
    setThemeColor,
    isLoaded,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};