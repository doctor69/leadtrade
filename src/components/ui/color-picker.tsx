import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#ef4444', // red-500 (default)
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#eab308', // yellow-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#0ea5e9', // sky-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#d946ef', // fuchsia-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
  '#64748b', // slate-500
];

export function ColorPicker({ value, onChange, className, disabled }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomColor(value);
  }, [value]);

  const handlePresetClick = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
  };

  const handleCustomColorApply = () => {
    if (customColor && /^#[0-9A-F]{6}$/i.test(customColor)) {
      onChange(customColor);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomColorApply();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded border border-border"
              style={{ backgroundColor: value }}
            />
            <Palette className="h-4 w-4" />
            <span>Theme Color</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Preset Colors</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "h-8 w-8 rounded border-2 border-transparent hover:border-border transition-colors",
                    value === color && "border-primary"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => handlePresetClick(color)}
                  title={color}
                >
                  {value === color && (
                    <Check className="h-4 w-4 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Custom Color</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="#000000"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleCustomColorApply}
                disabled={!customColor || !/^#[0-9A-F]{6}$/i.test(customColor)}
              >
                Apply
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a hex color code (e.g., #ff0000)
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}