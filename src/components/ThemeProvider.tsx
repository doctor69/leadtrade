import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultColor?: string;
  storageKey?: string;
  colorStorageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  themeColor: string;
  setTheme: (theme: Theme) => void;
  setThemeColor: (color: string) => void;
};

const initialState: ThemeProviderState = {
  theme: 'light',
  themeColor: '#ef4444',
  setTheme: () => null,
  setThemeColor: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  defaultColor = '#ef4444',
  storageKey = 'leadtrade-ui-theme',
  colorStorageKey = 'leadtrade-ui-theme-color',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('light');
  const [themeColor, setThemeColorState] = useState<string>(defaultColor);
  const [mounted, setMounted] = useState(false);

  // Helper function to convert hex to HSL
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Apply theme color to CSS custom properties
  const applyThemeColor = (color: string) => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    const hslColor = hexToHsl(color);
    
    // Update primary color
    root.style.setProperty('--primary', hslColor);
    
    // Calculate lighter/darker variants for consistency
    const [h, s, l] = hslColor.split(' ').map(v => parseFloat(v));
    const lighterL = Math.min(l + 10, 95);
    const darkerL = Math.max(l - 10, 5);
    
    // Update ring color (used for focus states)
    root.style.setProperty('--ring', hslColor);
    
    // Store the color for persistence
    localStorage.setItem(colorStorageKey, color);
  };

  useEffect(() => {
    setMounted(true);
    
    // Load theme and color from localStorage after component mounts
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(storageKey) as Theme;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setTheme(savedTheme);
      }
      
      const savedColor = localStorage.getItem(colorStorageKey);
      if (savedColor && /^#[0-9A-F]{6}$/i.test(savedColor)) {
        setThemeColorState(savedColor);
        applyThemeColor(savedColor);
      } else {
        applyThemeColor(defaultColor);
      }
    }
  }, [storageKey, colorStorageKey, defaultColor]);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, mounted]);

  const setThemeColor = (color: string) => {
    setThemeColorState(color);
    applyThemeColor(color);
  };

  const value = {
    theme,
    themeColor,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, newTheme);
      }
    },
    setThemeColor,
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