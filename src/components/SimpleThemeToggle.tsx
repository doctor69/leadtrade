import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export default function SimpleThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get theme from localStorage or default to light
    const savedTheme = localStorage.getItem('leadtrade-ui-theme');
    const shouldBeDark = savedTheme === 'dark';
    
    // Apply theme immediately
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(shouldBeDark ? 'dark' : 'light');
    
    setIsDark(shouldBeDark);
    
    // Save to localStorage if not set
    if (!savedTheme) {
      localStorage.setItem('leadtrade-ui-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    const root = document.documentElement;
    
    // Remove both classes first
    root.classList.remove('light', 'dark');
    
    // Add the new theme class
    root.classList.add(newIsDark ? 'dark' : 'light');
    
    // Save to localStorage
    localStorage.setItem('leadtrade-ui-theme', newIsDark ? 'dark' : 'light');
    
    // Update state
    setIsDark(newIsDark);
    
    console.log('Theme toggled to:', newIsDark ? 'dark' : 'light');
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