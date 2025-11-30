import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  ThemeCookieManager, 
  ThemeApplicator, 
  ThemeManager, 
  initializeThemeImmediate,
  type Theme 
} from '../theme-manager';

// Mock document and localStorage
const mockDocument = {
  documentElement: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn((className: string) => {
        // Mock that the theme class is properly applied
        return className === 'light' || className === 'dark';
      })
    },
    style: {
      setProperty: vi.fn(() => {
        // Mock successful CSS property setting
        return true;
      }),
      getPropertyValue: vi.fn(() => 'test-value')
    }
  },
  cookie: ''
};

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

const mockWindow = {
  matchMedia: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    addListener: vi.fn()
  })),
  localStorage: mockLocalStorage
};

// Setup global mocks
beforeEach(() => {
  vi.stubGlobal('document', mockDocument);
  vi.stubGlobal('window', mockWindow);
  vi.stubGlobal('localStorage', mockLocalStorage);
  
  // Reset mocks
  vi.clearAllMocks();
  mockDocument.cookie = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeCookieManager', () => {
  describe('saveTheme', () => {
    it('should save valid theme to cookies', () => {
      const result = ThemeCookieManager.saveTheme('dark');
      expect(result).toBe(true);
    });

    it('should reject invalid theme', () => {
      const result = ThemeCookieManager.saveTheme('invalid' as Theme);
      expect(result).toBe(false);
    });

    it('should save to fallback storage', () => {
      ThemeCookieManager.saveTheme('dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('leadtrade-theme-fallback', 'dark');
    });
  });

  describe('loadTheme', () => {
    it('should load theme from cookies', () => {
      mockDocument.cookie = 'leadtrade-theme=dark';
      const theme = ThemeCookieManager.loadTheme();
      expect(theme).toBe('dark');
    });

    it('should fallback to localStorage when cookie fails', () => {
      mockDocument.cookie = '';
      mockLocalStorage.getItem.mockReturnValue('light');
      
      const theme = ThemeCookieManager.loadTheme();
      expect(theme).toBe('light');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('leadtrade-theme-fallback');
    });

    it('should return default theme when all storage fails', () => {
      mockDocument.cookie = '';
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const theme = ThemeCookieManager.loadTheme();
      expect(theme).toBe('light');
    });

    it('should validate theme from storage', () => {
      mockDocument.cookie = 'leadtrade-theme=invalid';
      mockLocalStorage.getItem.mockReturnValue('invalid');
      
      const theme = ThemeCookieManager.loadTheme();
      expect(theme).toBe('light'); // Should fallback to default
    });
  });

  describe('saveThemeColor', () => {
    it('should save valid hex color', () => {
      const result = ThemeCookieManager.saveThemeColor('#ff0000');
      expect(result).toBe(true);
    });

    it('should reject invalid color format', () => {
      const result = ThemeCookieManager.saveThemeColor('red');
      expect(result).toBe(false);
    });

    it('should reject short hex format', () => {
      const result = ThemeCookieManager.saveThemeColor('#f00');
      expect(result).toBe(false);
    });
  });

  describe('validateThemeConfig', () => {
    it('should validate correct configuration', () => {
      const result = ThemeCookieManager.validateThemeConfig('dark', '#ff0000');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fallbackApplied).toBe(false);
    });

    it('should detect invalid theme', () => {
      const result = ThemeCookieManager.validateThemeConfig('invalid' as Theme, '#ff0000');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid theme: invalid');
      expect(result.fallbackApplied).toBe(true);
    });

    it('should detect invalid color', () => {
      const result = ThemeCookieManager.validateThemeConfig('dark', 'red');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid theme color: red');
      expect(result.fallbackApplied).toBe(true);
    });
  });

  describe('resetToDefaults', () => {
    it('should clear cookies and storage', () => {
      ThemeCookieManager.resetToDefaults();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('leadtrade-theme-fallback');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('leadtrade-theme-color-fallback');
    });
  });
});

describe('ThemeApplicator', () => {
  describe('applyThemeImmediate', () => {
    it('should apply light theme', () => {
      const result = ThemeApplicator.applyThemeImmediate('light');
      
      expect(mockDocument.documentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('light');
      expect(result).toBe(true);
    });

    it('should apply dark theme', () => {
      const result = ThemeApplicator.applyThemeImmediate('dark');
      
      expect(mockDocument.documentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(result).toBe(true);
    });

    it('should handle system theme', () => {
      mockWindow.matchMedia.mockReturnValue({
        matches: true, // Dark mode
        addEventListener: vi.fn(),
        addListener: vi.fn()
      });

      const result = ThemeApplicator.applyThemeImmediate('system');
      
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(result).toBe(true);
    });

    it('should reject invalid theme', () => {
      const result = ThemeApplicator.applyThemeImmediate('invalid' as Theme);
      
      // Should apply default theme as fallback
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('light');
      expect(result).toBe(true);
    });

    it('should handle DOM errors gracefully', () => {
      mockDocument.documentElement.classList.add.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = ThemeApplicator.applyThemeImmediate('dark');
      expect(result).toBe(true); // Should still return true due to fallback
    });
  });

  describe('applyThemeColor', () => {
    it('should apply valid hex color', () => {
      const result = ThemeApplicator.applyThemeColor('#ff0000');
      
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--primary', 
        expect.stringContaining('0 100% 50%') // Red in HSL
      );
      expect(result).toBe(true);
    });

    it('should handle invalid color format', () => {
      const result = ThemeApplicator.applyThemeColor('red');
      
      // Should apply default color
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle CSS property errors', () => {
      mockDocument.documentElement.style.setProperty.mockImplementation(() => {
        throw new Error('CSS error');
      });

      const result = ThemeApplicator.applyThemeColor('#ff0000');
      expect(result).toBe(true); // Should fallback to default
    });
  });

  describe('getSystemTheme', () => {
    it('should detect dark system theme', () => {
      mockWindow.matchMedia.mockReturnValue({ matches: true });
      
      const theme = ThemeApplicator.getSystemTheme();
      expect(theme).toBe('dark');
    });

    it('should detect light system theme', () => {
      mockWindow.matchMedia.mockReturnValue({ matches: false });
      
      const theme = ThemeApplicator.getSystemTheme();
      expect(theme).toBe('light');
    });

    it('should handle matchMedia errors', () => {
      mockWindow.matchMedia.mockImplementation(() => {
        throw new Error('matchMedia error');
      });

      const theme = ThemeApplicator.getSystemTheme();
      expect(theme).toBe('light'); // Should fallback to light
    });
  });
});

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    // Reset singleton
    (ThemeManager as any).instance = undefined;
    themeManager = ThemeManager.getInstance();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(themeManager.getTheme()).toBe('light');
      expect(themeManager.getThemeColor()).toBe('#ef4444');
      expect(themeManager.isReady()).toBe(true);
    });

    it('should load saved configuration', () => {
      mockDocument.cookie = 'leadtrade-theme=dark; leadtrade-theme-color=%23ff0000';
      
      const manager = ThemeManager.getInstance();
      expect(manager.getTheme()).toBe('dark');
      expect(manager.getThemeColor()).toBe('#ff0000');
    });
  });

  describe('setTheme', () => {
    it('should set valid theme', () => {
      const result = themeManager.setTheme('dark');
      
      expect(result).toBe(true);
      expect(themeManager.getTheme()).toBe('dark');
    });

    it('should reject invalid theme', () => {
      const result = themeManager.setTheme('invalid' as Theme);
      
      expect(result).toBe(false);
      expect(themeManager.getTheme()).toBe('light'); // Should remain unchanged
    });
  });

  describe('setThemeColor', () => {
    it('should set valid color', () => {
      const result = themeManager.setThemeColor('#ff0000');
      
      expect(result).toBe(true);
      expect(themeManager.getThemeColor()).toBe('#ff0000');
    });

    it('should reject invalid color', () => {
      const result = themeManager.setThemeColor('red');
      
      expect(result).toBe(false);
      expect(themeManager.getThemeColor()).toBe('#ef4444'); // Should remain unchanged
    });
  });

  describe('resetToDefaults', () => {
    it('should reset to default configuration', () => {
      themeManager.setTheme('dark');
      themeManager.setThemeColor('#ff0000');
      
      const result = themeManager.resetToDefaults();
      
      expect(result).toBe(true);
      expect(themeManager.getTheme()).toBe('light');
      expect(themeManager.getThemeColor()).toBe('#ef4444');
    });
  });

  describe('validateConfiguration', () => {
    it('should validate current configuration', () => {
      const validation = themeManager.validateConfiguration();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('subscription', () => {
    it('should notify listeners on theme change', () => {
      const listener = vi.fn();
      const unsubscribe = themeManager.subscribe(listener);
      
      themeManager.setTheme('dark');
      
      expect(listener).toHaveBeenCalledWith({
        theme: 'dark',
        themeColor: '#ef4444'
      });
      
      unsubscribe();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      
      themeManager.subscribe(errorListener);
      
      // Should not throw
      expect(() => themeManager.setTheme('dark')).not.toThrow();
    });
  });
});

describe('initializeThemeImmediate', () => {
  it('should initialize theme immediately', () => {
    const config = initializeThemeImmediate();
    
    expect(config.theme).toBe('light');
    expect(config.themeColor).toBe('#ef4444');
    expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('light');
  });

  it('should load saved configuration', () => {
    mockDocument.cookie = 'leadtrade-theme=dark; leadtrade-theme-color=%23ff0000';
    
    const config = initializeThemeImmediate();
    
    expect(config.theme).toBe('dark');
    expect(config.themeColor).toBe('#ff0000');
  });
});