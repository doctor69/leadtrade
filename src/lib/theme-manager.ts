/**
 * Theme Manager - Cookie-based theme persistence without database dependency
 * Fixes theme loading race conditions and provides robust fallback mechanisms
 */

export type Theme = 'dark' | 'light' | 'system';

export interface ThemeConfig {
  theme: Theme;
  themeColor: string;
}

export interface ThemeValidationResult {
  isValid: boolean;
  errors: string[];
  fallbackApplied: boolean;
}

const THEME_COOKIE_NAME = 'leadtrade-theme';
const THEME_COLOR_COOKIE_NAME = 'leadtrade-theme-color';
const DEFAULT_THEME: Theme = 'light';
const DEFAULT_THEME_COLOR = '#ef4444';

// Fallback storage keys for localStorage backup
const FALLBACK_THEME_KEY = 'leadtrade-theme-fallback';
const FALLBACK_COLOR_KEY = 'leadtrade-theme-color-fallback';

/**
 * Cookie utilities for theme persistence with fallback mechanisms
 */
export class ThemeCookieManager {
  private static setCookie(name: string, value: string, days: number = 365): boolean {
    if (typeof document === 'undefined') return false;
    
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
      const expiresString = expires.toUTCString();
      
      document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expiresString}; path=/; SameSite=Lax`;
      
      // Verify cookie was set by reading it back
      const verification = this.getCookie(name);
      return verification === value;
    } catch (error) {
      console.warn(`Failed to set cookie ${name}:`, error);
      return false;
    }
  }

  private static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    try {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
      }
    } catch (error) {
      console.warn(`Failed to get cookie ${name}:`, error);
    }
    
    return null;
  }

  private static setFallbackStorage(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to set fallback storage ${key}:`, error);
    }
  }

  private static getFallbackStorage(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get fallback storage ${key}:`, error);
      return null;
    }
  }

  static saveTheme(theme: Theme): boolean {
    if (!this.isValidTheme(theme)) {
      console.warn('Invalid theme provided:', theme);
      return false;
    }

    console.log('[ThemeCookieManager] Saving theme:', theme);
    
    // Try to save to cookie first
    const cookieSuccess = this.setCookie(THEME_COOKIE_NAME, theme);
    console.log('[ThemeCookieManager] Cookie save success:', cookieSuccess);
    
    // Always save to fallback storage as backup
    this.setFallbackStorage(FALLBACK_THEME_KEY, theme);
    
    return cookieSuccess;
  }

  static loadTheme(): Theme {
    // Try cookie first
    let savedTheme = this.getCookie(THEME_COOKIE_NAME);
    console.log('[ThemeCookieManager] Loaded theme from cookie:', savedTheme);
    
    // If cookie fails, try fallback storage
    if (!savedTheme || !this.isValidTheme(savedTheme)) {
      savedTheme = this.getFallbackStorage(FALLBACK_THEME_KEY);
      console.log('[ThemeCookieManager] Loaded theme from fallback storage:', savedTheme);
    }
    
    // Validate and return
    if (savedTheme && this.isValidTheme(savedTheme)) {
      console.log('[ThemeCookieManager] Returning valid theme:', savedTheme);
      return savedTheme as Theme;
    }
    
    // Final fallback to default
    console.log('[ThemeCookieManager] Using default theme');
    return DEFAULT_THEME;
  }

  static saveThemeColor(color: string): boolean {
    if (!this.isValidHexColor(color)) {
      console.warn('Invalid theme color provided:', color);
      return false;
    }

    // Try to save to cookie first
    const cookieSuccess = this.setCookie(THEME_COLOR_COOKIE_NAME, color);
    
    // Always save to fallback storage as backup
    this.setFallbackStorage(FALLBACK_COLOR_KEY, color);
    
    return cookieSuccess;
  }

  static loadThemeColor(): string {
    // Try cookie first
    let savedColor = this.getCookie(THEME_COLOR_COOKIE_NAME);
    
    // If cookie fails, try fallback storage
    if (!savedColor || !this.isValidHexColor(savedColor)) {
      savedColor = this.getFallbackStorage(FALLBACK_COLOR_KEY);
    }
    
    // Validate and return
    if (savedColor && this.isValidHexColor(savedColor)) {
      return savedColor;
    }
    
    // Final fallback to default
    return DEFAULT_THEME_COLOR;
  }

  static validateThemeConfig(theme: Theme, themeColor: string): ThemeValidationResult {
    const errors: string[] = [];
    let fallbackApplied = false;

    // Validate theme
    if (!this.isValidTheme(theme)) {
      errors.push(`Invalid theme: ${theme}`);
      fallbackApplied = true;
    }

    // Validate theme color
    if (!this.isValidHexColor(themeColor)) {
      errors.push(`Invalid theme color: ${themeColor}`);
      fallbackApplied = true;
    }

    return {
      isValid: errors.length === 0,
      errors,
      fallbackApplied
    };
  }

  static resetToDefaults(): void {
    console.log('Resetting theme configuration to defaults');
    
    // Clear cookies
    try {
      document.cookie = `${THEME_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${THEME_COLOR_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    } catch (error) {
      console.warn('Failed to clear theme cookies:', error);
    }
    
    // Clear fallback storage
    try {
      localStorage.removeItem(FALLBACK_THEME_KEY);
      localStorage.removeItem(FALLBACK_COLOR_KEY);
    } catch (error) {
      console.warn('Failed to clear fallback storage:', error);
    }
    
    // Apply defaults
    this.saveTheme(DEFAULT_THEME);
    this.saveThemeColor(DEFAULT_THEME_COLOR);
  }

  private static isValidTheme(theme: string): boolean {
    return ['light', 'dark', 'system'].includes(theme);
  }

  private static isValidHexColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }
}

/**
 * Theme application utilities with robust error recovery
 */
export class ThemeApplicator {
  /**
   * Apply theme to document root immediately (prevents flashing)
   */
  static applyThemeImmediate(theme: Theme): boolean {
    if (typeof document === 'undefined') return false;
    
    try {
      // Validate theme before applying
      if (!['light', 'dark', 'system'].includes(theme)) {
        console.warn('Invalid theme provided, falling back to default:', theme);
        return this.applyDefaultTheme();
      }

      const root = document.documentElement;
      root.classList.remove('light', 'dark');

      if (theme === 'system') {
        const systemTheme = this.getSystemTheme();
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }

      // Verify theme was applied
      const hasThemeClass = root.classList.contains('light') || root.classList.contains('dark');
      if (!hasThemeClass) {
        console.warn('Theme class not found after application, applying fallback');
        return this.applyDefaultTheme();
      }

      return true;
    } catch (error) {
      console.warn('Failed to apply theme:', error);
      // Fallback to default theme
      return this.applyDefaultTheme();
    }
  }

  /**
   * Apply theme color to CSS custom properties with validation and fallback
   */
  static applyThemeColor(color: string): boolean {
    if (typeof document === 'undefined') return false;
    
    try {
      // Validate color format
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        console.warn('Invalid color format, using default:', color);
        color = DEFAULT_THEME_COLOR;
      }

      const root = document.documentElement;
      const hslColor = this.hexToHsl(color);
      
      // Validate HSL conversion
      if (!hslColor || hslColor === '0 0% 50%') {
        console.warn('HSL conversion failed, using default color');
        color = DEFAULT_THEME_COLOR;
        const fallbackHslColor = this.hexToHsl(color);
        return this.applyThemeColorWithHsl(root, fallbackHslColor);
      }
      
      return this.applyThemeColorWithHsl(root, hslColor);
      
    } catch (error) {
      console.warn('Failed to apply theme color:', error);
      // Apply default color as fallback
      return this.applyDefaultThemeColor();
    }
  }

  /**
   * Apply theme color with validated HSL string
   */
  private static applyThemeColorWithHsl(root: HTMLElement, hslColor: string): boolean {
    try {
      // Parse HSL components with validation
      const parts = hslColor.split(' ');
      if (parts.length !== 3) {
        console.warn('Invalid HSL format, applying default');
        return this.applyDefaultThemeColor();
      }

      const h = parseFloat(parts[0]);
      const s = parseFloat(parts[1]);
      const l = parseFloat(parts[2]);
      
      // Validate HSL values
      if (isNaN(h) || isNaN(s) || isNaN(l)) {
        console.warn('Invalid HSL values, applying default');
        return this.applyDefaultThemeColor();
      }
      
      // Calculate variants for different states
      const lighterL = Math.min(l + 10, 95);
      const darkerL = Math.max(l - 10, 5);
      const hoverL = Math.max(l - 5, 5);
      
      // Update CSS custom properties safely
      const properties = [
        ['--primary', hslColor],
        ['--ring', hslColor],
        ['--primary-light', `${h} ${s}% ${lighterL}%`],
        ['--primary-dark', `${h} ${s}% ${darkerL}%`],
        ['--primary-hover', `${h} ${s}% ${hoverL}%`],
      ];

      // Update accent and chart colors
      const accentL = Math.min(l + 40, 95);
      const accentS = Math.max(s - 20, 10);
      properties.push(
        ['--accent', `${h} ${accentS}% ${accentL}%`],
        ['--accent-foreground', l > 50 ? '0 0% 9%' : '0 0% 98%']
      );
      
      // Chart colors
      const complementaryH1 = (h + 120) % 360;
      const complementaryH2 = (h + 240) % 360;
      properties.push(
        ['--chart-1', `${h} ${s}% ${l}%`],
        ['--chart-2', `${complementaryH1} ${Math.min(s, 70)}% ${Math.min(l + 5, 60)}%`],
        ['--chart-3', `${complementaryH2} ${Math.min(s, 70)}% ${Math.min(l + 5, 60)}%`]
      );

      // Apply all properties
      let successCount = 0;
      for (const [property, value] of properties) {
        if (this.setPropertySafely(root, property, value)) {
          successCount++;
        }
      }

      // Check if most properties were applied successfully
      const successRate = successCount / properties.length;
      if (successRate < 0.8) {
        console.warn(`Low success rate applying theme color properties: ${successRate}`);
        return this.applyDefaultThemeColor();
      }

      return true;
      
    } catch (error) {
      console.warn('Failed to apply theme color with HSL:', error);
      return this.applyDefaultThemeColor();
    }
  }

  /**
   * Get system theme preference
   */
  static getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (error) {
      console.warn('Failed to detect system theme:', error);
      return 'light';
    }
  }

  /**
   * Apply default theme as fallback
   */
  private static applyDefaultTheme(): boolean {
    try {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(DEFAULT_THEME);
      
      // Verify default theme was applied
      return root.classList.contains(DEFAULT_THEME);
    } catch (error) {
      console.error('Failed to apply default theme:', error);
      return false;
    }
  }

  /**
   * Apply default theme color as fallback
   */
  private static applyDefaultThemeColor(): boolean {
    try {
      const root = document.documentElement;
      const defaultHsl = this.hexToHsl(DEFAULT_THEME_COLOR);
      
      // Apply minimal set of critical properties
      const criticalProperties = [
        ['--primary', defaultHsl],
        ['--ring', defaultHsl],
        ['--accent', '210 40% 90%'], // Safe light blue
        ['--accent-foreground', '222.2 84% 4.9%'] // Dark text
      ];

      let successCount = 0;
      for (const [property, value] of criticalProperties) {
        if (this.setPropertySafely(root, property, value)) {
          successCount++;
        }
      }

      return successCount === criticalProperties.length;
    } catch (error) {
      console.error('Failed to apply default theme color:', error);
      return false;
    }
  }

  /**
   * Convert hex color to HSL
   */
  private static hexToHsl(hex: string): string {
    try {
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
    } catch (error) {
      console.warn('Failed to convert hex to HSL:', error);
      return '0 0% 50%'; // Fallback gray
    }
  }

  /**
   * Safely set CSS custom property with validation
   */
  private static setPropertySafely(root: HTMLElement, property: string, value: string): boolean {
    try {
      if (!root || !root.style) {
        console.warn('Invalid root element for CSS property setting');
        return false;
      }

      // Validate property name
      if (!property.startsWith('--')) {
        console.warn('Invalid CSS custom property name:', property);
        return false;
      }

      // Validate value is not empty
      if (!value || value.trim() === '') {
        console.warn('Empty value for CSS property:', property);
        return false;
      }

      root.style.setProperty(property, value);
      
      // Verify property was set
      const appliedValue = root.style.getPropertyValue(property);
      return appliedValue.trim() !== '';
    } catch (error) {
      console.warn(`Failed to set CSS property ${property}:`, error);
      return false;
    }
  }
}

/**
 * Theme initialization for immediate application (prevents flashing)
 */
export function initializeThemeImmediate(): ThemeConfig {
  const theme = ThemeCookieManager.loadTheme();
  const themeColor = ThemeCookieManager.loadThemeColor();
  
  // Apply theme immediately
  ThemeApplicator.applyThemeImmediate(theme);
  ThemeApplicator.applyThemeColor(themeColor);
  
  return { theme, themeColor };
}

/**
 * Theme manager for React components with comprehensive error recovery
 */
export class ThemeManager {
  private static instance: ThemeManager;
  private theme: Theme = DEFAULT_THEME;
  private themeColor: string = DEFAULT_THEME_COLOR;
  private listeners: Set<(config: ThemeConfig) => void> = new Set();
  private isInitialized: boolean = false;
  private initializationAttempts: number = 0;
  private maxInitializationAttempts: number = 3;

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  constructor() {
    // Skip initialization during SSR
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize(): void {
    // Guard against SSR
    if (typeof window === 'undefined') {
      return;
    }
    
    this.initializationAttempts++;
    
    try {
      // Load from cookies with validation
      const loadedTheme = ThemeCookieManager.loadTheme();
      const loadedColor = ThemeCookieManager.loadThemeColor();
      
      // Validate loaded configuration
      const validation = ThemeCookieManager.validateThemeConfig(loadedTheme, loadedColor);
      
      if (validation.isValid) {
        this.theme = loadedTheme;
        this.themeColor = loadedColor;
      } else {
        console.warn('Invalid theme configuration loaded:', validation.errors);
        
        if (validation.fallbackApplied) {
          console.log('Applying fallback theme configuration');
          this.theme = DEFAULT_THEME;
          this.themeColor = DEFAULT_THEME_COLOR;
          
          // Save corrected values
          ThemeCookieManager.saveTheme(this.theme);
          ThemeCookieManager.saveThemeColor(this.themeColor);
        }
      }
      
      // Apply theme with error checking
      const themeApplied = ThemeApplicator.applyThemeImmediate(this.theme);
      const colorApplied = ThemeApplicator.applyThemeColor(this.themeColor);
      
      if (!themeApplied || !colorApplied) {
        throw new Error('Failed to apply theme configuration');
      }
      
      // Set up system theme listener
      this.setupSystemThemeListener();
      
      this.isInitialized = true;
      console.log('Theme manager initialized successfully');
      
    } catch (error) {
      console.error('Theme manager initialization failed:', error);
      
      if (this.initializationAttempts < this.maxInitializationAttempts) {
        console.log(`Retrying initialization (attempt ${this.initializationAttempts + 1}/${this.maxInitializationAttempts})`);
        setTimeout(() => this.initialize(), 100);
      } else {
        console.error('Max initialization attempts reached, using emergency fallback');
        this.emergencyFallback();
      }
    }
  }

  private setupSystemThemeListener(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (this.theme === 'system') {
          const success = ThemeApplicator.applyThemeImmediate(this.theme);
          if (success) {
            this.notifyListeners();
          } else {
            console.warn('Failed to apply system theme change');
          }
        }
      };

      // Use both addEventListener and addListener for compatibility
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleChange);
      }
    } catch (error) {
      console.warn('Failed to set up system theme listener:', error);
    }
  }

  private emergencyFallback(): void {
    console.log('Applying emergency theme fallback');
    
    try {
      // Reset to absolute defaults
      this.theme = DEFAULT_THEME;
      this.themeColor = DEFAULT_THEME_COLOR;
      
      // Clear all stored data
      ThemeCookieManager.resetToDefaults();
      
      // Apply basic theme
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(DEFAULT_THEME);
      
      // Apply basic color
      root.style.setProperty('--primary', '0 0% 50%');
      root.style.setProperty('--accent', '210 40% 90%');
      
      this.isInitialized = true;
      console.log('Emergency fallback applied successfully');
      
    } catch (error) {
      console.error('Emergency fallback failed:', error);
      // At this point, we can't do much more
    }
  }

  getTheme(): Theme {
    return this.theme;
  }

  getThemeColor(): string {
    return this.themeColor;
  }

  getConfig(): ThemeConfig {
    return {
      theme: this.theme,
      themeColor: this.themeColor
    };
  }

  setTheme(newTheme: Theme): boolean {
    if (!this.isInitialized) {
      console.warn('[ThemeManager] Theme manager not initialized, cannot set theme');
      return false;
    }

    if (!['light', 'dark', 'system'].includes(newTheme)) {
      console.warn('[ThemeManager] Invalid theme:', newTheme);
      return false;
    }

    console.log('[ThemeManager] Setting theme to:', newTheme);

    try {
      // Save to storage first
      const saveSuccess = ThemeCookieManager.saveTheme(newTheme);
      if (!saveSuccess) {
        console.warn('[ThemeManager] Failed to save theme to storage');
      }

      // Apply theme
      const applySuccess = ThemeApplicator.applyThemeImmediate(newTheme);
      if (!applySuccess) {
        console.warn('[ThemeManager] Failed to apply theme');
        return false;
      }

      // Update state only if successful
      this.theme = newTheme;
      console.log('[ThemeManager] Theme updated successfully, notifying listeners');
      this.notifyListeners();
      
      return true;
    } catch (error) {
      console.error('[ThemeManager] Error setting theme:', error);
      return false;
    }
  }

  setThemeColor(newColor: string): boolean {
    if (!this.isInitialized) {
      console.warn('Theme manager not initialized, cannot set theme color');
      return false;
    }

    if (!/^#[0-9A-F]{6}$/i.test(newColor)) {
      console.warn('Invalid theme color:', newColor);
      return false;
    }

    try {
      // Save to storage first
      const saveSuccess = ThemeCookieManager.saveThemeColor(newColor);
      if (!saveSuccess) {
        console.warn('Failed to save theme color to storage');
      }

      // Apply color
      const applySuccess = ThemeApplicator.applyThemeColor(newColor);
      if (!applySuccess) {
        console.warn('Failed to apply theme color');
        return false;
      }

      // Update state only if successful
      this.themeColor = newColor;
      this.notifyListeners();
      
      return true;
    } catch (error) {
      console.error('Error setting theme color:', error);
      return false;
    }
  }

  /**
   * Reset theme configuration to defaults (error recovery)
   */
  resetToDefaults(): boolean {
    try {
      console.log('Resetting theme to defaults');
      
      ThemeCookieManager.resetToDefaults();
      
      this.theme = DEFAULT_THEME;
      this.themeColor = DEFAULT_THEME_COLOR;
      
      const themeSuccess = ThemeApplicator.applyThemeImmediate(this.theme);
      const colorSuccess = ThemeApplicator.applyThemeColor(this.themeColor);
      
      if (themeSuccess && colorSuccess) {
        this.notifyListeners();
        return true;
      } else {
        console.warn('Failed to apply default theme configuration');
        return false;
      }
    } catch (error) {
      console.error('Error resetting theme to defaults:', error);
      return false;
    }
  }

  /**
   * Get initialization status
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Validate current theme configuration
   */
  validateConfiguration(): ThemeValidationResult {
    return ThemeCookieManager.validateThemeConfig(this.theme, this.themeColor);
  }

  subscribe(listener: (config: ThemeConfig) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const config = this.getConfig();
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.warn('Theme listener error:', error);
      }
    });
  }
}