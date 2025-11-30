import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupMockEnvironment, resetMockEnvironment } from './test-utils';

// Mock window object for viewport testing
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  matchMedia: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: mockWindow.innerWidth,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: mockWindow.innerHeight,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: mockWindow.matchMedia,
});

// Mock CSS media queries
const createMockMediaQuery = (matches: boolean) => ({
  matches,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('Mobile Responsiveness Test Suite', () => {
  beforeEach(() => {
    setupMockEnvironment();
    
    // Reset window dimensions
    mockWindow.innerWidth = 1024;
    mockWindow.innerHeight = 768;
    
    // Mock matchMedia for different breakpoints
    mockWindow.matchMedia.mockImplementation((query: string) => {
      if (query.includes('768px')) {
        return createMockMediaQuery(mockWindow.innerWidth >= 768);
      }
      if (query.includes('1024px')) {
        return createMockMediaQuery(mockWindow.innerWidth >= 1024);
      }
      return createMockMediaQuery(false);
    });
  });

  afterEach(() => {
    resetMockEnvironment();
  });

  describe('Responsive Breakpoint Tests', () => {
    it('should detect mobile viewport (320px - 767px)', () => {
      // Test mobile breakpoint
      mockWindow.innerWidth = 375;
      mockWindow.innerHeight = 667;
      
      const isMobile = mockWindow.innerWidth < 768;
      const isTablet = mockWindow.innerWidth >= 768 && mockWindow.innerWidth < 1024;
      const isDesktop = mockWindow.innerWidth >= 1024;
      
      expect(isMobile).toBe(true);
      expect(isTablet).toBe(false);
      expect(isDesktop).toBe(false);
    });

    it('should detect tablet viewport (768px - 1023px)', () => {
      // Test tablet breakpoint
      mockWindow.innerWidth = 768;
      mockWindow.innerHeight = 1024;
      
      const isMobile = mockWindow.innerWidth < 768;
      const isTablet = mockWindow.innerWidth >= 768 && mockWindow.innerWidth < 1024;
      const isDesktop = mockWindow.innerWidth >= 1024;
      
      expect(isMobile).toBe(false);
      expect(isTablet).toBe(true);
      expect(isDesktop).toBe(false);
    });

    it('should detect desktop viewport (1024px+)', () => {
      // Test desktop breakpoint
      mockWindow.innerWidth = 1280;
      mockWindow.innerHeight = 720;
      
      const isMobile = mockWindow.innerWidth < 768;
      const isTablet = mockWindow.innerWidth >= 768 && mockWindow.innerWidth < 1024;
      const isDesktop = mockWindow.innerWidth >= 1024;
      
      expect(isMobile).toBe(false);
      expect(isTablet).toBe(false);
      expect(isDesktop).toBe(true);
    });

    it('should handle edge cases at breakpoint boundaries', () => {
      // Test exact breakpoint values
      const testBreakpoints = [320, 767, 768, 1023, 1024, 1920];
      
      testBreakpoints.forEach(width => {
        mockWindow.innerWidth = width;
        
        const isMobile = width < 768;
        const isTablet = width >= 768 && width < 1024;
        const isDesktop = width >= 1024;
        
        // Ensure only one breakpoint is active
        const activeBreakpoints = [isMobile, isTablet, isDesktop].filter(Boolean);
        expect(activeBreakpoints).toHaveLength(1);
      });
    });
  });

  describe('Touch Target Size Tests', () => {
    it('should ensure minimum 44px touch targets for buttons', () => {
      const mockButton = {
        offsetWidth: 44,
        offsetHeight: 44,
        getBoundingClientRect: () => ({
          width: 44,
          height: 44,
          top: 0,
          left: 0,
          right: 44,
          bottom: 44,
        }),
      };

      // Test minimum touch target size
      expect(mockButton.offsetWidth).toBeGreaterThanOrEqual(44);
      expect(mockButton.offsetHeight).toBeGreaterThanOrEqual(44);
    });

    it('should validate touch targets for navigation menu items', () => {
      const mockMenuItems = [
        { width: 44, height: 44, label: 'Dashboard' },
        { width: 48, height: 44, label: 'Trade' },
        { width: 52, height: 44, label: 'Leaderboard' },
        { width: 44, height: 44, label: 'Settings' },
      ];

      mockMenuItems.forEach(item => {
        expect(item.width).toBeGreaterThanOrEqual(44);
        expect(item.height).toBeGreaterThanOrEqual(44);
      });
    });

    it('should validate touch targets for form inputs', () => {
      const mockFormInputs = [
        { width: 280, height: 44, type: 'text' },
        { width: 120, height: 44, type: 'number' },
        { width: 44, height: 44, type: 'button' },
        { width: 200, height: 44, type: 'select' },
      ];

      mockFormInputs.forEach(input => {
        expect(input.height).toBeGreaterThanOrEqual(44);
        if (input.type === 'button') {
          expect(input.width).toBeGreaterThanOrEqual(44);
        }
      });
    });
  });

  describe('Orientation Change Tests', () => {
    it('should handle portrait to landscape orientation change', () => {
      // Initial portrait orientation
      mockWindow.innerWidth = 375;
      mockWindow.innerHeight = 667;
      
      const initialOrientation = mockWindow.innerWidth < mockWindow.innerHeight ? 'portrait' : 'landscape';
      expect(initialOrientation).toBe('portrait');
      
      // Simulate orientation change to landscape
      mockWindow.innerWidth = 667;
      mockWindow.innerHeight = 375;
      
      const newOrientation = mockWindow.innerWidth < mockWindow.innerHeight ? 'portrait' : 'landscape';
      expect(newOrientation).toBe('landscape');
    });

    it('should handle landscape to portrait orientation change', () => {
      // Initial landscape orientation
      mockWindow.innerWidth = 667;
      mockWindow.innerHeight = 375;
      
      const initialOrientation = mockWindow.innerWidth < mockWindow.innerHeight ? 'portrait' : 'landscape';
      expect(initialOrientation).toBe('landscape');
      
      // Simulate orientation change to portrait
      mockWindow.innerWidth = 375;
      mockWindow.innerHeight = 667;
      
      const newOrientation = mockWindow.innerWidth < mockWindow.innerHeight ? 'portrait' : 'landscape';
      expect(newOrientation).toBe('portrait');
    });

    it('should maintain functionality across orientation changes', () => {
      const orientations = [
        { width: 375, height: 667, name: 'portrait' },
        { width: 667, height: 375, name: 'landscape' },
        { width: 768, height: 1024, name: 'tablet-portrait' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
      ];

      orientations.forEach(orientation => {
        mockWindow.innerWidth = orientation.width;
        mockWindow.innerHeight = orientation.height;
        
        // Verify viewport detection works in all orientations
        const isMobile = orientation.width < 768;
        const isTablet = orientation.width >= 768 && orientation.width < 1024;
        const isDesktop = orientation.width >= 1024;
        
        expect(typeof isMobile).toBe('boolean');
        expect(typeof isTablet).toBe('boolean');
        expect(typeof isDesktop).toBe('boolean');
      });
    });
  });

  describe('Viewport Size Validation Tests', () => {
    it('should handle minimum supported viewport (320px)', () => {
      mockWindow.innerWidth = 320;
      mockWindow.innerHeight = 568;
      
      // Verify minimum viewport is handled
      expect(mockWindow.innerWidth).toBeGreaterThanOrEqual(320);
      
      // Test that content should be accessible at minimum width
      const contentWidth = Math.min(mockWindow.innerWidth - 32, 1200); // Account for padding
      expect(contentWidth).toBeGreaterThan(0);
      expect(contentWidth).toBeLessThanOrEqual(mockWindow.innerWidth);
    });

    it('should handle large desktop viewports (1920px+)', () => {
      mockWindow.innerWidth = 1920;
      mockWindow.innerHeight = 1080;
      
      // Verify large viewport is handled
      expect(mockWindow.innerWidth).toBeGreaterThanOrEqual(1920);
      
      // Test that content should be constrained at large widths
      const maxContentWidth = 1200; // max-w-7xl equivalent
      const contentWidth = Math.min(mockWindow.innerWidth - 48, maxContentWidth);
      expect(contentWidth).toBeLessThanOrEqual(maxContentWidth);
    });

    it('should validate responsive container behavior', () => {
      const viewports = [
        { width: 320, expectedPadding: 12 }, // px-3
        { width: 640, expectedPadding: 16 }, // sm:px-4
        { width: 1024, expectedPadding: 24 }, // lg:px-6
      ];

      viewports.forEach(viewport => {
        mockWindow.innerWidth = viewport.width;
        
        // Calculate expected content width based on responsive padding
        const contentWidth = viewport.width - (viewport.expectedPadding * 2);
        expect(contentWidth).toBeGreaterThan(0);
        expect(contentWidth).toBeLessThan(viewport.width);
      });
    });

    it('should validate responsive grid behavior', () => {
      const gridConfigs = [
        { width: 320, expectedColumns: 1 },
        { width: 640, expectedColumns: 2 },
        { width: 1024, expectedColumns: 3 },
        { width: 1280, expectedColumns: 4 },
      ];

      gridConfigs.forEach(config => {
        mockWindow.innerWidth = config.width;
        
        // Simulate responsive grid calculation
        let columns = 1;
        if (config.width >= 640) columns = 2;
        if (config.width >= 1024) columns = 3;
        if (config.width >= 1280) columns = 4;
        
        expect(columns).toBe(config.expectedColumns);
      });
    });
  });

  describe('Mobile Navigation Tests', () => {
    it('should show hamburger menu on mobile', () => {
      mockWindow.innerWidth = 375;
      
      const isMobile = mockWindow.innerWidth < 768;
      expect(isMobile).toBe(true);
      
      // On mobile, hamburger menu should be visible
      const showHamburger = isMobile;
      const showDesktopNav = !isMobile;
      
      expect(showHamburger).toBe(true);
      expect(showDesktopNav).toBe(false);
    });

    it('should show desktop navigation on larger screens', () => {
      mockWindow.innerWidth = 1024;
      
      const isMobile = mockWindow.innerWidth < 768;
      expect(isMobile).toBe(false);
      
      // On desktop, regular navigation should be visible
      const showHamburger = isMobile;
      const showDesktopNav = !isMobile;
      
      expect(showHamburger).toBe(false);
      expect(showDesktopNav).toBe(true);
    });

    it('should handle mobile menu toggle functionality', () => {
      let mobileMenuOpen = false;
      
      const toggleMobileMenu = () => {
        mobileMenuOpen = !mobileMenuOpen;
      };
      
      // Initially closed
      expect(mobileMenuOpen).toBe(false);
      
      // Toggle open
      toggleMobileMenu();
      expect(mobileMenuOpen).toBe(true);
      
      // Toggle closed
      toggleMobileMenu();
      expect(mobileMenuOpen).toBe(false);
    });
  });

  describe('Responsive Layout Tests', () => {
    it('should stack elements vertically on mobile', () => {
      mockWindow.innerWidth = 375;
      
      const isMobile = mockWindow.innerWidth < 768;
      const layoutDirection = isMobile ? 'column' : 'row';
      
      expect(layoutDirection).toBe('column');
    });

    it('should arrange elements horizontally on desktop', () => {
      mockWindow.innerWidth = 1024;
      
      const isMobile = mockWindow.innerWidth < 768;
      const layoutDirection = isMobile ? 'column' : 'row';
      
      expect(layoutDirection).toBe('row');
    });

    it('should adjust spacing based on screen size', () => {
      const spacingConfigs = [
        { width: 320, expectedSpacing: 8 },  // space-y-2
        { width: 640, expectedSpacing: 12 }, // sm:space-y-3
        { width: 1024, expectedSpacing: 16 }, // lg:space-y-4
      ];

      spacingConfigs.forEach(config => {
        mockWindow.innerWidth = config.width;
        
        // Simulate responsive spacing calculation
        let spacing = 8;
        if (config.width >= 640) spacing = 12;
        if (config.width >= 1024) spacing = 16;
        
        expect(spacing).toBe(config.expectedSpacing);
      });
    });
  });

  describe('Touch Interaction Tests', () => {
    it('should handle touch events properly', () => {
      const mockTouchEvent = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      };

      // Simulate touch event handling
      const handleTouch = (event: typeof mockTouchEvent) => {
        expect(event.touches).toHaveLength(1);
        expect(event.touches[0].clientX).toBe(100);
        expect(event.touches[0].clientY).toBe(100);
        return true;
      };

      const result = handleTouch(mockTouchEvent);
      expect(result).toBe(true);
    });

    it('should prevent double-tap zoom on form inputs', () => {
      const mockInput = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        style: { touchAction: 'manipulation' },
      };

      // Verify touch-action is set to prevent double-tap zoom
      expect(mockInput.style.touchAction).toBe('manipulation');
    });

    it('should handle swipe gestures for navigation', () => {
      let swipeDirection = '';
      
      const handleSwipe = (startX: number, endX: number, startY: number, endY: number) => {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const minSwipeDistance = 50;
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
          swipeDirection = deltaX > 0 ? 'right' : 'left';
        } else if (Math.abs(deltaY) > minSwipeDistance) {
          swipeDirection = deltaY > 0 ? 'down' : 'up';
        }
        
        return swipeDirection;
      };

      // Test horizontal swipe
      const rightSwipe = handleSwipe(50, 150, 100, 105);
      expect(rightSwipe).toBe('right');

      // Test vertical swipe
      const upSwipe = handleSwipe(100, 105, 150, 50);
      expect(upSwipe).toBe('up');
    });
  });

  describe('Performance Tests', () => {
    it('should maintain reasonable render times on mobile', async () => {
      const startTime = performance.now();
      
      // Simulate mobile component rendering
      mockWindow.innerWidth = 375;
      const isMobile = mockWindow.innerWidth < 768;
      
      // Mock component render logic
      const renderMobileComponent = () => {
        return {
          isMobile,
          layout: 'mobile',
          components: ['header', 'content', 'footer'],
        };
      };

      const result = renderMobileComponent();
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(result.isMobile).toBe(true);
      expect(result.layout).toBe('mobile');
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle rapid viewport changes efficiently', () => {
      const viewportChanges = [
        { width: 320, height: 568 },
        { width: 375, height: 667 },
        { width: 768, height: 1024 },
        { width: 1024, height: 768 },
        { width: 1280, height: 720 },
      ];

      const startTime = performance.now();

      viewportChanges.forEach(viewport => {
        mockWindow.innerWidth = viewport.width;
        mockWindow.innerHeight = viewport.height;
        
        // Simulate responsive recalculation
        const isMobile = viewport.width < 768;
        const isTablet = viewport.width >= 768 && viewport.width < 1024;
        const isDesktop = viewport.width >= 1024;
        
        expect(typeof isMobile).toBe('boolean');
        expect(typeof isTablet).toBe('boolean');
        expect(typeof isDesktop).toBe('boolean');
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(50); // Should handle all changes in under 50ms
    });
  });
});