import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('leadtrade-ui-theme') as 'light' | 'dark' | 'system';
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      setTheme('light');
      applyTheme('light');
    }
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark');
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
    
    // Force a repaint to ensure styles are applied
    root.style.colorScheme = newTheme === 'dark' ? 'dark' : 'light';
  };

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
    localStorage.setItem('leadtrade-ui-theme', newTheme);
    applyTheme(newTheme);
    
    // Debug log
    console.log('Theme changed to:', newTheme);
  };

  const getIcon = () => {
    if (theme === 'light') return <Moon className="h-4 w-4" />;
    if (theme === 'dark') return <Sun className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="h-9 w-9 px-0" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 px-0"
      title={`Current theme: ${theme}`}
    >
      {getIcon()}
      <span className="sr-only">Toggle theme (current: {theme})</span>
    </Button>
  );
}