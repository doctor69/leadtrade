import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, setTheme, isLoaded } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    let newTheme: 'light' | 'dark' | 'system';
    
    if (theme === 'light') {
      newTheme = 'dark';
    } else if (theme === 'dark') {
      newTheme = 'system';
    } else {
      newTheme = 'light';
    }

    setTheme(newTheme);
  };

  const getIcon = () => {
    if (theme === 'light') return <Moon className="h-4 w-4" />;
    if (theme === 'dark') return <Sun className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Switch to dark mode';
      case 'dark': return 'Switch to system mode';
      case 'system': return 'Switch to light mode';
      default: return 'Toggle theme';
    }
  };

  // Show loading state until both mounted and theme is loaded
  if (!mounted || !isLoaded) {
    return (
      <Button variant="outline" size="sm" className="h-9 w-9 px-0" disabled>
        <Sun className="h-4 w-4 opacity-50" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 px-0"
      title={getThemeLabel()}
    >
      {getIcon()}
      <span className="sr-only">{getThemeLabel()}</span>
    </Button>
  );
}