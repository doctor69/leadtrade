// Performance monitoring and optimization utilities for LeadTrade PWA

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
  loadTime: number | null;
  domContentLoaded: number | null;
}

interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    loadTime: null,
    domContentLoaded: null
  };
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  private constructor() {
    this.initializeMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeMonitoring() {
    if (typeof window === 'undefined' || this.isMonitoring) return;

    this.isMonitoring = true;

    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor navigation timing
    this.observeNavigationTiming();
    
    // Monitor resource loading
    this.observeResourceTiming();

    // Monitor long tasks
    this.observeLongTasks();

    // Monitor layout shifts
    this.observeLayoutShifts();
  }

  private observeWebVitals() {
    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            this.metrics.fcp = fcpEntry.startTime;
            this.reportMetric('fcp', fcpEntry.startTime);
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(fcpObserver);
      } catch (error) {
        console.warn('FCP observer not supported:', error);
      }

      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.metrics.lcp = lastEntry.startTime;
            this.reportMetric('lcp', lastEntry.startTime);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.processingStart && entry.startTime) {
              const fid = entry.processingStart - entry.startTime;
              this.metrics.fid = fid;
              this.reportMetric('fid', fid);
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }
    }
  }

  private observeNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            this.metrics.ttfb = navigation.responseStart - navigation.requestStart;
            this.metrics.loadTime = navigation.loadEventEnd - navigation.navigationStart;
            this.metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
            
            this.reportMetric('ttfb', this.metrics.ttfb);
            this.reportMetric('loadTime', this.metrics.loadTime);
            this.reportMetric('domContentLoaded', this.metrics.domContentLoaded);
          }
        }, 0);
      });
    }
  }

  private observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.transferSize > 100000) { // Resources larger than 100KB
              console.warn(`Large resource detected: ${entry.name} (${Math.round(entry.transferSize / 1024)}KB)`);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  private observeLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              console.warn(`Long task detected: ${entry.duration}ms`);
              this.reportMetric('longTask', entry.duration);
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  private observeLayoutShifts() {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.metrics.cls = clsValue;
          this.reportMetric('cls', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('Layout shift observer not supported:', error);
      }
    }
  }

  private reportMetric(name: string, value: number) {
    // Store metrics locally for analysis
    const metrics = JSON.parse(localStorage.getItem('performance-metrics') || '[]');
    metrics.push({
      name,
      value,
      timestamp: Date.now(),
      url: window.location.pathname,
      userAgent: navigator.userAgent
    });

    // Keep only last 100 metrics
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }

    localStorage.setItem('performance-metrics', JSON.stringify(metrics));

    // Log critical performance issues
    if (name === 'fcp' && value > 2000) {
      console.warn(`Slow FCP: ${value}ms`);
    } else if (name === 'lcp' && value > 2500) {
      console.warn(`Slow LCP: ${value}ms`);
    } else if (name === 'fid' && value > 100) {
      console.warn(`High FID: ${value}ms`);
    } else if (name === 'cls' && value > 0.1) {
      console.warn(`High CLS: ${value}`);
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getResourceTimings(): ResourceTiming[] {
    if (!('performance' in window)) return [];

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources.map(resource => ({
      name: resource.name,
      duration: resource.duration,
      size: resource.transferSize || 0,
      type: this.getResourceType(resource.name)
    }));
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  public getMemoryInfo(): MemoryInfo | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  public measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    console.log(`${name} took ${duration.toFixed(2)}ms`);
    this.reportMetric(`function-${name}`, duration);
    
    return result;
  }

  public async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    console.log(`${name} took ${duration.toFixed(2)}ms`);
    this.reportMetric(`async-function-${name}`, duration);
    
    return result;
  }

  public startMark(name: string): void {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  public endMark(name: string): number | null {
    if ('performance' in window && 'mark' in performance && 'measure' in performance) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measure = performance.getEntriesByName(name, 'measure')[0];
        if (measure) {
          this.reportMetric(`mark-${name}`, measure.duration);
          return measure.duration;
        }
      } catch (error) {
        console.warn(`Failed to measure ${name}:`, error);
      }
    }
    return null;
  }

  public getPerformanceScore(): number {
    const { fcp, lcp, fid, cls } = this.metrics;
    let score = 100;

    // FCP scoring (0-40 points)
    if (fcp !== null) {
      if (fcp > 3000) score -= 40;
      else if (fcp > 1800) score -= 20;
      else if (fcp > 1000) score -= 10;
    }

    // LCP scoring (0-30 points)
    if (lcp !== null) {
      if (lcp > 4000) score -= 30;
      else if (lcp > 2500) score -= 15;
      else if (lcp > 1500) score -= 8;
    }

    // FID scoring (0-20 points)
    if (fid !== null) {
      if (fid > 300) score -= 20;
      else if (fid > 100) score -= 10;
      else if (fid > 50) score -= 5;
    }

    // CLS scoring (0-10 points)
    if (cls !== null) {
      if (cls > 0.25) score -= 10;
      else if (cls > 0.1) score -= 5;
      else if (cls > 0.05) score -= 2;
    }

    return Math.max(0, score);
  }

  public generateReport(): string {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();
    const memory = this.getMemoryInfo();
    
    let report = `Performance Report (Score: ${score}/100)\n`;
    report += `=====================================\n`;
    
    if (metrics.fcp) report += `First Contentful Paint: ${metrics.fcp.toFixed(2)}ms\n`;
    if (metrics.lcp) report += `Largest Contentful Paint: ${metrics.lcp.toFixed(2)}ms\n`;
    if (metrics.fid) report += `First Input Delay: ${metrics.fid.toFixed(2)}ms\n`;
    if (metrics.cls) report += `Cumulative Layout Shift: ${metrics.cls.toFixed(4)}\n`;
    if (metrics.ttfb) report += `Time to First Byte: ${metrics.ttfb.toFixed(2)}ms\n`;
    if (metrics.loadTime) report += `Load Time: ${metrics.loadTime.toFixed(2)}ms\n`;
    
    if (memory) {
      report += `\nMemory Usage:\n`;
      report += `Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB\n`;
      report += `Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB\n`;
      report += `Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB\n`;
    }
    
    return report;
  }

  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isMonitoring = false;
  }
}

// Lazy loading utilities
export class LazyLoader {
  private static intersectionObserver: IntersectionObserver | null = null;
  private static imageObserver: IntersectionObserver | null = null;

  public static initializeImageLazyLoading(): void {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported, lazy loading disabled');
      return;
    }

    this.imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            this.imageObserver?.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
      this.imageObserver?.observe(img);
    });
  }

  public static observeElement(element: Element, callback: () => void): void {
    if (!this.intersectionObserver) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const callback = (entry.target as any).__lazyCallback;
            if (callback) {
              callback();
              this.intersectionObserver?.unobserve(entry.target);
            }
          }
        });
      }, {
        rootMargin: '100px 0px',
        threshold: 0.01
      });
    }

    (element as any).__lazyCallback = callback;
    this.intersectionObserver.observe(element);
  }
}

// Bundle size analyzer
export class BundleAnalyzer {
  public static analyzeChunks(): void {
    if ('performance' in window) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(r => r.name.includes('.js'));
      
      console.group('Bundle Analysis');
      jsResources.forEach(resource => {
        const size = resource.transferSize || 0;
        const sizeKB = Math.round(size / 1024);
        console.log(`${resource.name.split('/').pop()}: ${sizeKB}KB (${resource.duration.toFixed(2)}ms)`);
      });
      console.groupEnd();
    }
  }

  public static getUnusedCSS(): string[] {
    const unusedRules: string[] = [];
    
    if ('CSS' in window && 'supports' in CSS) {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules || []).forEach(rule => {
            if (rule.type === CSSRule.STYLE_RULE) {
              const styleRule = rule as CSSStyleRule;
              if (!document.querySelector(styleRule.selectorText)) {
                unusedRules.push(styleRule.selectorText);
              }
            }
          });
        } catch (error) {
          // Cross-origin stylesheets can't be accessed
        }
      });
    }
    
    return unusedRules;
  }
}

// Mobile-specific performance optimizations
export class MobilePerformanceOptimizer {
  private static instance: MobilePerformanceOptimizer;
  private isMobile: boolean;
  private connectionType: string = 'unknown';
  private deviceMemory: number = 4; // Default to 4GB

  private constructor() {
    this.isMobile = this.detectMobile();
    this.detectConnection();
    this.detectDeviceCapabilities();
    this.initializeMobileOptimizations();
  }

  public static getInstance(): MobilePerformanceOptimizer {
    if (!MobilePerformanceOptimizer.instance) {
      MobilePerformanceOptimizer.instance = new MobilePerformanceOptimizer();
    }
    return MobilePerformanceOptimizer.instance;
  }

  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  private detectConnection(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.connectionType = connection.effectiveType || 'unknown';
      
      // Monitor connection changes
      connection.addEventListener('change', () => {
        this.connectionType = connection.effectiveType || 'unknown';
        this.adjustForConnection();
      });
    }
  }

  private detectDeviceCapabilities(): void {
    if ('deviceMemory' in navigator) {
      this.deviceMemory = (navigator as any).deviceMemory || 4;
    }

    // Detect hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 4;
    console.log(`Device capabilities: ${this.deviceMemory}GB RAM, ${cores} cores`);
  }

  private initializeMobileOptimizations(): void {
    if (!this.isMobile) return;

    // Reduce animation complexity on low-end devices
    if (this.deviceMemory < 4) {
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
      document.documentElement.classList.add('reduced-motion');
    }

    // Optimize for slow connections
    if (this.connectionType === 'slow-2g' || this.connectionType === '2g') {
      this.enableDataSaverMode();
    }

    // Optimize touch interactions
    this.optimizeTouchInteractions();

    // Reduce bundle size for mobile
    this.optimizeBundleForMobile();
  }

  private adjustForConnection(): void {
    console.log(`Connection changed to: ${this.connectionType}`);
    
    if (this.connectionType === 'slow-2g' || this.connectionType === '2g') {
      this.enableDataSaverMode();
    } else {
      this.disableDataSaverMode();
    }
  }

  private enableDataSaverMode(): void {
    console.log('Enabling data saver mode');
    
    // Disable non-essential animations
    document.documentElement.classList.add('data-saver');
    
    // Reduce image quality
    document.querySelectorAll('img').forEach(img => {
      if (img.dataset.lowQualitySrc) {
        img.src = img.dataset.lowQualitySrc;
      }
    });

    // Disable auto-playing videos
    document.querySelectorAll('video[autoplay]').forEach(video => {
      (video as HTMLVideoElement).pause();
    });
  }

  private disableDataSaverMode(): void {
    console.log('Disabling data saver mode');
    document.documentElement.classList.remove('data-saver');
  }

  private optimizeTouchInteractions(): void {
    // Add touch-action optimization
    document.documentElement.style.touchAction = 'manipulation';
    
    // Optimize scroll performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
    
    // Reduce touch delay
    const style = document.createElement('style');
    style.textContent = `
      * {
        touch-action: manipulation;
      }
      
      button, [role="button"], input[type="submit"], input[type="button"] {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
    `;
    document.head.appendChild(style);
  }

  private optimizeBundleForMobile(): void {
    // Lazy load non-critical modules
    if (this.isMobile && this.deviceMemory < 4) {
      // Defer loading of heavy components
      this.deferHeavyComponents();
    }
  }

  private deferHeavyComponents(): void {
    // This would typically be handled by your bundler configuration
    // For runtime optimization, we can defer certain features
    console.log('Deferring heavy components for low-end device');
  }

  public getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.isMobile) {
      recommendations.push('Mobile device detected - optimizations applied');
      
      if (this.deviceMemory < 4) {
        recommendations.push('Low memory device - reduced animations and deferred loading');
      }
      
      if (this.connectionType === 'slow-2g' || this.connectionType === '2g') {
        recommendations.push('Slow connection - data saver mode enabled');
      }
    }

    return recommendations;
  }

  public measureTouchLatency(): Promise<number> {
    return new Promise((resolve) => {
      let startTime: number;
      
      const handleTouchStart = (e: TouchEvent) => {
        startTime = performance.now();
      };
      
      const handleTouchEnd = () => {
        const latency = performance.now() - startTime;
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
        resolve(latency);
      };
      
      document.addEventListener('touchstart', handleTouchStart, { once: true });
      document.addEventListener('touchend', handleTouchEnd, { once: true });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
        resolve(-1);
      }, 5000);
    });
  }
}

// PWA-specific performance optimizations
export class PWAPerformanceOptimizer {
  private static instance: PWAPerformanceOptimizer;
  private isStandalone: boolean;
  private installPromptEvent: any = null;

  private constructor() {
    this.isStandalone = this.detectStandaloneMode();
    this.initializePWAOptimizations();
    this.setupInstallPrompt();
  }

  public static getInstance(): PWAPerformanceOptimizer {
    if (!PWAPerformanceOptimizer.instance) {
      PWAPerformanceOptimizer.instance = new PWAPerformanceOptimizer();
    }
    return PWAPerformanceOptimizer.instance;
  }

  private detectStandaloneMode(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  private initializePWAOptimizations(): void {
    if (this.isStandalone) {
      // Optimize for standalone PWA mode
      this.optimizeForStandalone();
    }

    // Preload critical resources
    this.preloadCriticalResources();

    // Optimize service worker caching
    this.optimizeServiceWorkerCaching();
  }

  private optimizeForStandalone(): void {
    console.log('PWA running in standalone mode - applying optimizations');
    
    // Hide browser-specific UI elements
    document.documentElement.classList.add('pwa-standalone');
    
    // Optimize viewport for standalone
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      );
    }
  }

  private preloadCriticalResources(): void {
    const criticalResources = [
      '/icons/icon-192x192.svg',
      '/icons/icon-512x512.svg',
      '/manifest.json'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.svg') ? 'image' : 'fetch';
      document.head.appendChild(link);
    });
  }

  private optimizeServiceWorkerCaching(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Send optimization preferences to service worker
        registration.active?.postMessage({
          type: 'OPTIMIZE_CACHING',
          data: {
            isStandalone: this.isStandalone,
            deviceMemory: (navigator as any).deviceMemory || 4,
            connectionType: (navigator as any).connection?.effectiveType || 'unknown'
          }
        });
      });
    }
  }

  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPromptEvent = e;
      console.log('PWA install prompt available');
    });
  }

  public async showInstallPrompt(): Promise<boolean> {
    if (!this.installPromptEvent) {
      return false;
    }

    try {
      this.installPromptEvent.prompt();
      const result = await this.installPromptEvent.userChoice;
      this.installPromptEvent = null;
      
      return result.outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  public canInstall(): boolean {
    return this.installPromptEvent !== null;
  }
}

// Bundle size optimizer
export class BundleSizeOptimizer {
  private static loadedModules = new Set<string>();
  private static moduleLoadTimes = new Map<string, number>();

  public static async loadModuleOnDemand<T>(
    moduleLoader: () => Promise<T>,
    moduleName: string
  ): Promise<T> {
    if (this.loadedModules.has(moduleName)) {
      console.log(`Module ${moduleName} already loaded`);
      return moduleLoader();
    }

    const startTime = performance.now();
    
    try {
      const module = await moduleLoader();
      const loadTime = performance.now() - startTime;
      
      this.loadedModules.add(moduleName);
      this.moduleLoadTimes.set(moduleName, loadTime);
      
      console.log(`Module ${moduleName} loaded in ${loadTime.toFixed(2)}ms`);
      return module;
    } catch (error) {
      console.error(`Failed to load module ${moduleName}:`, error);
      throw error;
    }
  }

  public static getLoadedModules(): string[] {
    return Array.from(this.loadedModules);
  }

  public static getModuleLoadTimes(): Record<string, number> {
    return Object.fromEntries(this.moduleLoadTimes);
  }

  public static preloadModule(moduleLoader: () => Promise<any>, moduleName: string): void {
    // Preload module in the background
    setTimeout(() => {
      this.loadModuleOnDemand(moduleLoader, moduleName).catch(console.error);
    }, 100);
  }
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const mobileOptimizer = MobilePerformanceOptimizer.getInstance();
export const pwaOptimizer = PWAPerformanceOptimizer.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  LazyLoader.initializeImageLazyLoading();
}