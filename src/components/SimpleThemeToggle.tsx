import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { ThemeCookieManager, ThemeApplicator } from '@/lib/theme-manager';

export default function SimpleThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get theme from cookies with fallback
    const savedTheme = ThemeCookieManager.loadTheme();
    const shouldBeDark = savedTheme === 'dark' || (savedTheme === 'system' && ThemeApplicator.getSystemTheme() === 'dark');
    
    setIsDark(shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    const newTheme = newIsDark ? 'dark' : 'light';
    
    // Save to cookies
    ThemeCookieManager.saveTheme(newTheme);
    
    // Apply theme immediately
    ThemeApplicator.applyThemeImmediate(newTheme);
    
    // Update state
    setIsDark(newIsDark);
  };

  if (!mounted) {
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
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</span>
    </Button>
  );
}