/**
 * Theme Persistence Tests
 * Verifies theme persistence across page navigation and browser sessions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeCookieManager, ThemeApplicator, ThemeManager } from '../theme-manager';

// Mock document and window for testing
const mockDocument = {
  documentElement: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(() => true),
    },
    style: {
      setProperty: vi.fn(),
      getPropertyValue: vi.fn(() => ''),
    },
  },
  cookie: '',
};

const mockWindow = {
  matchMedia: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    addListener: vi.fn(),
  })),
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
};

describe('Theme Persistence', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup global mocks
    global.document = mockDocument as any;
    global.window = mockWindow as any;
    
    // Reset cookie
    mockDocument.cookie = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ThemeCookieManager', () => {
    it('should save theme to cookie', () => {
      const result = ThemeCookieManager.saveTheme('dark');
      expect(result).toBe(true);
    });

    it('should load theme from cookie', () => {
      // Simulate cookie being set
      mockDocument.cookie = 'leadtrade-theme=dark';
      const theme = ThemeCookieManager.loadTheme();
      expect(theme).toBe('dark');
    });

    it('should fallback to localStorage when cookie fails', () => {
      mockWindow.localStorage.getItem.mockReturnValue('dark');
      const theme = ThemeCookieManager.loadTheme();
      expect(theme).toBe('dark');
    });

    it('should return default theme when no storage available', () => {
      const theme = ThemeCookieManager.loadTheme();
      expect(theme).toBe('light');
    });

    it('should validate theme values', () => {
      expect(ThemeCookieManager.saveTheme('light')).toBe(true);
      expect(ThemeCookieManager.saveTheme('dark')).toBe(true);
      expect(ThemeCookieManager.saveTheme('system')).toBe(true);
      expect(ThemeCookieManager.saveTheme('invalid' as any)).toBe(false);
    });

    it('should save and load theme color', () => {
      ThemeCookieManager.saveThemeColor('#ef4444');
      mockDocument.cookie = 'leadtrade-theme-color=%23ef4444';
      const color = ThemeCookieManager.loadThemeColor();
      expect(color).toBe('#ef4444');
    });

    it('should validate hex color format', () => {
      expect(ThemeCookieManager.saveThemeColor('#ef4444')).toBe(true);
      expect(ThemeCookieManager.saveThemeColor('#FFFFFF')).toBe(true);
      expect(ThemeCookieManager.saveThemeColor('invalid')).toBe(false);
      expect(ThemeCookieManager.saveThemeColor('#fff')).toBe(false);
    });

    it('should validate theme configuration', () => {
      const result = ThemeCookieManager.validateThemeConfig('dark', '#ef4444');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fallbackApplied).toBe(false);
    });

    it('should detect invalid theme configuration', () => {
      const result = ThemeCookieManager.validateThemeConfig('invalid' as any, 'notacolor');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.fallbackApplied).toBe(true);
    });
  });

  describe('ThemeApplicator', () => {
    it('should apply light theme', () => {
      const result = ThemeApplicator.applyThemeImmediate('light');
      expect(result).toBe(true);
      expect(mockDocument.documentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('light');
    });

    it('should apply dark theme', () => {
      const result = ThemeApplicator.applyThemeImmediate('dark');
      expect(result).toBe(true);
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should apply system theme based on media query', () => {
      mockWindow.matchMedia.mockReturnValue({
        matches: true, // Dark mode
        addEventListener: vi.fn(),
        addListener: vi.fn(),
      });
      
      const result = ThemeApplicator.applyThemeImmediate('system');
      expect(result).toBe(true);
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should apply theme color', () => {
      const result = ThemeApplicator.applyThemeColor('#ef4444');
      expect(result).toBe(true);
      expect(mockDocument.documentElement.style.setProperty).toHaveBeenCalled();
    });

    it('should handle invalid theme gracefully', () => {
      const result = ThemeApplicator.applyThemeImmediate('invalid' as any);
      expect(result).toBe(true); // Should fallback to default
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalled();
    });

    it('should detect system theme preference', () => {
      mockWindow.matchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        addListener: vi.fn(),
      });
      
      const systemTheme = ThemeApplicator.getSystemTheme();
      expect(systemTheme).toBe('dark');
    });
  });

  describe('ThemeManager', () => {
    it('should initialize with default theme', () => {
      const manager = ThemeManager.getInstance();
      expect(manager.getTheme()).toBeDefined();
    });

    it('should get current theme configuration', () => {
      const manager = ThemeManager.getInstance();
      const config = manager.getConfig();
      expect(config).toHaveProperty('theme');
      expect(config).toHaveProperty('themeColor');
    });

    it('should set theme and notify listeners', () => {
      const manager = ThemeManager.getInstance();
      const listener = vi.fn();
      
      manager.subscribe(listener);
      manager.setTheme('dark');
      
      expect(listener).toHaveBeenCalled();
    });

    it('should set theme color and notify listeners', () => {
      const manager = ThemeManager.getInstance();
      const listener = vi.fn();
      
      manager.subscribe(listener);
      manager.setThemeColor('#3b82f6');
      
      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing from theme changes', () => {
      const manager = ThemeManager.getInstance();
      const listener = vi.fn();
      
      const unsubscribe = manager.subscribe(listener);
      unsubscribe();
      
      manager.setTheme('dark');
      expect(listener).not.toHaveBeenCalled();
    });

    it('should validate configuration', () => {
      const manager = ThemeManager.getInstance();
      const validation = manager.validateConfiguration();
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
    });

    it('should reset to defaults', () => {
      const manager = ThemeManager.getInstance();
      const result = manager.resetToDefaults();
      expect(result).toBe(true);
      expect(manager.getTheme()).toBe('light');
    });

    it('should report initialization status', () => {
      const manager = ThemeManager.getInstance();
      const isReady = manager.isReady();
      expect(typeof isReady).toBe('boolean');
    });
  });

  describe('Theme Persistence Across Navigation', () => {
    it('should persist theme when navigating between pages', () => {
      // Set theme on "page 1"
      ThemeCookieManager.saveTheme('dark');
      mockDocument.cookie = 'leadtrade-theme=dark';
      
      // Simulate navigation to "page 2"
      const loadedTheme = ThemeCookieManager.loadTheme();
      expect(loadedTheme).toBe('dark');
    });

    it('should persist theme color when navigating between pages', () => {
      // Set theme color on "page 1"
      ThemeCookieManager.saveThemeColor('#3b82f6');
      mockDocument.cookie = 'leadtrade-theme-color=%233b82f6';
      
      // Simulate navigation to "page 2"
      const loadedColor = ThemeCookieManager.loadThemeColor();
      expect(loadedColor).toBe('#3b82f6');
    });

    it('should maintain theme across browser refresh', () => {
      // Set theme
      ThemeCookieManager.saveTheme('dark');
      mockDocument.cookie = 'leadtrade-theme=dark';
      mockWindow.localStorage.setItem('leadtrade-theme-fallback', 'dark');
      
      // Simulate browser refresh (reload theme)
      const loadedTheme = ThemeCookieManager.loadTheme();
      expect(loadedTheme).toBe('dark');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from cookie read errors', () => {
      // Simulate cookie error by returning null
      mockDocument.cookie = '';
      mockWindow.localStorage.getItem.mockReturnValue('dark');
      
      const theme = ThemeCookieManager.loadTheme();
      expect(theme).toBe('dark'); // Should fallback to localStorage
    });

    it('should recover from localStorage errors', () => {
      mockWindow.localStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const theme = ThemeCookieManager.loadTheme();
      expect(theme).toBe('light'); // Should fallback to default
    });

    it('should handle theme application errors gracefully', () => {
      mockDocument.documentElement.classList.add.mockImplementation(() => {
        throw new Error('DOM error');
      });
      
      // Should not throw, should handle error internally
      expect(() => ThemeApplicator.applyThemeImmediate('dark')).not.toThrow();
    });
  });

  describe('System Theme Detection', () => {
    it('should detect dark system theme', () => {
      mockWindow.matchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        addListener: vi.fn(),
      });
      
      const systemTheme = ThemeApplicator.getSystemTheme();
      expect(systemTheme).toBe('dark');
    });

    it('should detect light system theme', () => {
      mockWindow.matchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        addListener: vi.fn(),
      });
      
      const systemTheme = ThemeApplicator.getSystemTheme();
      expect(systemTheme).toBe('light');
    });

    it('should handle matchMedia errors', () => {
      mockWindow.matchMedia.mockImplementation(() => {
        throw new Error('matchMedia error');
      });
      
      const systemTheme = ThemeApplicator.getSystemTheme();
      expect(systemTheme).toBe('light'); // Should fallback to light
    });
  });
});
