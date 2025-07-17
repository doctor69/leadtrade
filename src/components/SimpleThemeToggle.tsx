import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export default function SimpleThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check current theme from DOM
    const currentTheme = document.documentElement.classList.contains('dark');
    setIsDark(currentTheme);
    
    // If no theme is set, default to light
    if (!localStorage.getItem('leadtrade-ui-theme')) {
      localStorage.setItem('leadtrade-ui-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    const root = document.documentElement;
    
    // Remove both classes first
    root.classList.remove('light', 'dark');
    
    // Add the new theme class
    if (newTheme) {
      root.classList.add('dark');
      localStorage.setItem('leadtrade-ui-theme', 'dark');
    } else {
      root.classList.add('light');
      localStorage.setItem('leadtrade-ui-theme', 'light');
    }
    
    setIsDark(newTheme);
    
    // Force a re-render of the page to update components
    setTimeout(() => {
      window.dispatchEvent(new Event('storage'));
    }, 0);
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
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</span>
    </Button>
  );
}