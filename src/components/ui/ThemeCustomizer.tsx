import { Button } from './button';
import { Label } from './label';
import { ColorPicker } from './color-picker';
import { useTheme } from '@/components/ThemeProvider';
import { Palette, Sun, Moon, Monitor } from 'lucide-react';

// Preset color options
const PRESET_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Cyan', value: '#06b6d4' },
];

const DEFAULT_COLOR = '#ef4444';

export function ThemeCustomizer() {
  const { theme, themeColor, setTheme, setThemeColor } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Theme Settings</h3>
      </div>

      {/* Theme Mode */}
      <div className="space-y-2">
        <Label>Theme Mode</Label>
        <div className="flex gap-2">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('light')}
          >
            <Sun className="h-4 w-4 mr-2" />
            Light
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('dark')}
          >
            <Moon className="h-4 w-4 mr-2" />
            Dark
          </Button>
          <Button
            variant={theme === 'system' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('system')}
          >
            <Monitor className="h-4 w-4 mr-2" />
            System
          </Button>
        </div>
      </div>

      {/* Primary Color */}
      <div className="space-y-3">
        <Label>Theme Color</Label>
        <ColorPicker
          value={themeColor}
          onChange={setThemeColor}
          className="w-full"
        />
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color.value}
              className={`w-full h-8 rounded border-2 transition-all ${
                themeColor === color.value
                  ? 'border-foreground scale-105'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color.value }}
              onClick={() => setThemeColor(color.value)}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-2">
        <Button
          variant="outline"
          onClick={() => setThemeColor(DEFAULT_COLOR)}
          className="w-full"
          size="sm"
        >
          Reset to Default
        </Button>
      </div>
    </div>
  );
}