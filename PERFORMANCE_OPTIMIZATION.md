# Performance Optimization Techniques

This document outlines performance optimization strategies for LeadTrade's mobile and PWA implementation.

## Table of Contents

1. [Core Web Vitals Optimization](#core-web-vitals-optimization)
2. [Bundle Size Optimization](#bundle-size-optimization)
3. [Caching Strategies](#caching-strategies)
4. [Mobile-Specific Optimizations](#mobile-specific-optimizations)
5. [Service Worker Optimization](#service-worker-optimization)
6. [Image and Asset Optimization](#image-and-asset-optimization)
7. [Runtime Performance](#runtime-performance)
8. [Monitoring and Measurement](#monitoring-and-measurement)

## Core Web Vitals Optimization

### Largest Contentful Paint (LCP) - Target: < 2.5s

**Current Implementation:**
- Optimized bundle splitting for faster initial loads
- Critical CSS inlined for above-the-fold content
- Preloading of essential resources

**Optimization Techniques:**

1. **Resource Prioritization**
```html
<!-- Preload critical resources -->
<link rel="preload" href="/assets/critical.css" as="style">
<link rel="preload" href="/assets/hero-image.webp" as="image">
```

2. **Code Splitting**
```javascript
// astro.config.mjs - Optimized chunks
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  'vendor-charts': ['recharts'],
  'trading-components': [
    'src/components/trading/TradingDashboard.tsx',
    'src/components/trading/TradeForm.tsx'
  ]
}
```

3. **Critical Path Optimization**
```css
/* Inline critical CSS for above-the-fold content */
.hero-section {
  @apply bg-gradient-to-r from-blue-600 to-purple-600;
  @apply text-white py-20;
}
```

### First Input Delay (FID) - Target: < 100ms

**Optimization Strategies:**

1. **Reduce JavaScript Execution Time**
```javascript
// Use React.memo for expensive components
const TradingChart = React.memo(({ data }) => {
  return <Chart data={data} />;
});

// Debounce user inputs
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  [handleSearch]
);
```

2. **Web Workers for Heavy Computations**
```javascript
// Move calculations to web worker
const worker = new Worker('/workers/portfolio-calculator.js');
worker.postMessage({ portfolioData });
```

### Cumulative Layout Shift (CLS) - Target: < 0.1

**Prevention Techniques:**

1. **Reserve Space for Dynamic Content**
```css
.chart-container {
  @apply aspect-video; /* Reserve aspect ratio */
  @apply min-h-[400px]; /* Minimum height */
}

.loading-skeleton {
  @apply animate-pulse bg-gray-200;
  @apply h-[400px] w-full; /* Match final content size */
}
```

2. **Font Loading Optimization**
```css
/* Use font-display: swap for web fonts */
@font-face {
  font-family: 'Inter';
  font-display: swap;
  src: url('/fonts/inter.woff2') format('woff2');
}
```

## Bundle Size Optimization

### Current Bundle Analysis

```bash
# Analyze bundle sizes
npm run build:pwa
du -sh dist/_astro/*

# Expected output:
# vendor-react: ~130KB (gzipped: ~43KB)
# vendor-ui: ~50KB (gzipped: ~12KB)
# trading-components: ~80KB (gzipped: ~20KB)
```

### Optimization Techniques

1. **Tree Shaking**
```javascript
// Import only needed functions
import { debounce } from 'lodash-es/debounce';
// Instead of: import _ from 'lodash';

// Use specific imports for UI components
import { Button } from '@/components/ui/button';
// Instead of: import * as UI from '@/components/ui';
```

2. **Dynamic Imports**
```javascript
// Lazy load heavy components
const TradingChart = lazy(() => import('./TradingChart'));
const Leaderboard = lazy(() => import('./Leaderboard'));

// Conditional loading
if (userHasChartAccess) {
  const ChartModule = await import('./advanced-charts');
  setChartComponent(ChartModule.AdvancedChart);
}
```

3. **Bundle Analysis**
```bash
# Add to package.json scripts
"analyze": "npm run build && npx vite-bundle-analyzer dist"

# Run analysis
npm run analyze
```

## Caching Strategies

### Service Worker Caching

**Current Implementation:**
- Cache-first for static assets
- Network-first for API calls
- Stale-while-revalidate for dynamic content

**Optimization:**

1. **Intelligent Cache Invalidation**
```javascript
// sw.js - Version-based cache management
const CACHE_VERSION = '1.2.0';
const STATIC_CACHE = `leadtrade-static-v${CACHE_VERSION}`;

// Cache with expiration
const cacheWithExpiration = async (request, response, maxAge) => {
  const cache = await caches.open(STATIC_CACHE);
  const responseToCache = response.clone();
  
  // Add expiration header
  const headers = new Headers(responseToCache.headers);
  headers.set('sw-cache-expires', Date.now() + maxAge);
  
  const responseWithExpiration = new Response(responseToCache.body, {
    status: responseToCache.status,
    statusText: responseToCache.statusText,
    headers
  });
  
  cache.put(request, responseWithExpiration);
};
```

2. **Selective Caching**
```javascript
// Cache only essential resources
const ESSENTIAL_ASSETS = [
  '/',
  '/dashboard',
  '/trade',
  '/manifest.json',
  '/icons/icon-192x192.svg'
];

// Skip caching for large or rarely used assets
const shouldCache = (request) => {
  const url = new URL(request.url);
  return !url.pathname.includes('/screenshots/') &&
         !url.pathname.includes('/large-assets/');
};
```

### Browser Caching

1. **HTTP Headers Optimization**
```javascript
// astro.config.mjs - Set cache headers
vite: {
  server: {
    headers: {
      'Cache-Control': 'public, max-age=31536000', // 1 year for assets
      'Service-Worker-Allowed': '/'
    }
  }
}
```

2. **Asset Versioning**
```javascript
// Automatic asset versioning in build
build: {
  rollupOptions: {
    output: {
      assetFileNames: 'assets/[name].[hash][extname]',
      chunkFileNames: 'assets/[name].[hash].js'
    }
  }
}
```

## Mobile-Specific Optimizations

### Touch Performance

1. **Touch Event Optimization**
```css
/* Optimize touch interactions */
.touch-target {
  touch-action: manipulation; /* Prevent zoom on double-tap */
  -webkit-tap-highlight-color: transparent; /* Remove tap highlight */
}

.scrollable {
  -webkit-overflow-scrolling: touch; /* Momentum scrolling */
  overscroll-behavior: contain; /* Prevent overscroll */
}
```

2. **Passive Event Listeners**
```javascript
// Use passive listeners for better scroll performance
element.addEventListener('touchstart', handler, { passive: true });
element.addEventListener('touchmove', handler, { passive: true });
```

### Mobile Network Optimization

1. **Adaptive Loading**
```javascript
// Detect connection quality
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

if (connection) {
  const { effectiveType, downlink } = connection;
  
  // Adjust loading strategy based on connection
  if (effectiveType === '4g' && downlink > 1.5) {
    // Load high-quality assets
    loadHighQualityCharts();
  } else {
    // Load lightweight version
    loadLightweightCharts();
  }
}
```

2. **Resource Hints**
```html
<!-- Preconnect to external domains -->
<link rel="preconnect" href="https://api.alpaca.markets">
<link rel="dns-prefetch" href="https://supabase.co">

<!-- Prefetch likely next pages -->
<link rel="prefetch" href="/trade">
<link rel="prefetch" href="/dashboard">
```

## Service Worker Optimization

### Background Sync Optimization

1. **Efficient Sync Strategies**
```javascript
// sw.js - Optimized background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'portfolio-sync') {
    event.waitUntil(syncPortfolioData());
  } else if (event.tag === 'trade-sync') {
    event.waitUntil(syncTradeActions());
  }
});

// Batch sync operations
const syncPortfolioData = async () => {
  const pendingActions = await getOfflineActions();
  const batches = chunkArray(pendingActions, 10); // Process in batches
  
  for (const batch of batches) {
    await Promise.all(batch.map(processAction));
    await new Promise(resolve => setTimeout(resolve, 100)); // Throttle
  }
};
```

2. **Smart Cache Management**
```javascript
// Automatic cache cleanup
const cleanupExpiredCache = async () => {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const expires = response.headers.get('sw-cache-expires');
      
      if (expires && Date.now() > parseInt(expires)) {
        await cache.delete(request);
      }
    }
  }
};

// Run cleanup periodically
setInterval(cleanupExpiredCache, 60 * 60 * 1000); // Every hour
```

## Image and Asset Optimization

### Image Optimization

1. **Responsive Images**
```html
<!-- Use srcset for responsive images -->
<img 
  src="/images/chart-mobile.webp"
  srcset="/images/chart-mobile.webp 320w,
          /images/chart-tablet.webp 768w,
          /images/chart-desktop.webp 1200w"
  sizes="(max-width: 320px) 280px,
         (max-width: 768px) 720px,
         1200px"
  alt="Trading chart"
  loading="lazy"
/>
```

2. **Modern Image Formats**
```javascript
// Generate WebP versions of images
const generateWebP = async (imagePath) => {
  // Use sharp or similar library
  await sharp(imagePath)
    .webp({ quality: 80 })
    .toFile(imagePath.replace(/\.(jpg|png)$/, '.webp'));
};
```

### Icon Optimization

1. **SVG Optimization**
```bash
# Optimize SVG icons
npx svgo public/icons/*.svg --config svgo.config.js
```

2. **Icon Sprites**
```javascript
// Create icon sprite for better caching
const createIconSprite = () => {
  // Combine frequently used icons into sprite
  return `
    <svg style="display: none;">
      <symbol id="icon-dashboard" viewBox="0 0 24 24">
        <!-- SVG content -->
      </symbol>
    </svg>
  `;
};
```

## Runtime Performance

### React Performance

1. **Component Optimization**
```javascript
// Use React.memo for expensive components
const TradingDashboard = React.memo(({ portfolioData, marketData }) => {
  // Expensive rendering logic
  return <Dashboard data={portfolioData} market={marketData} />;
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.portfolioData.timestamp === nextProps.portfolioData.timestamp;
});

// Use useMemo for expensive calculations
const portfolioMetrics = useMemo(() => {
  return calculatePortfolioMetrics(portfolioData);
}, [portfolioData]);
```

2. **Virtual Scrolling**
```javascript
// For large lists (leaderboard, trade history)
import { FixedSizeList as List } from 'react-window';

const VirtualizedLeaderboard = ({ traders }) => (
  <List
    height={600}
    itemCount={traders.length}
    itemSize={80}
    itemData={traders}
  >
    {TraderRow}
  </List>
);
```

### Memory Management

1. **Cleanup Event Listeners**
```javascript
useEffect(() => {
  const handleResize = () => setWindowSize(window.innerWidth);
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

2. **Optimize WebSocket Connections**
```javascript
// Efficient WebSocket management
class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  connect(url, options = {}) {
    if (this.connections.has(url)) {
      return this.connections.get(url);
    }
    
    const ws = new WebSocket(url);
    this.connections.set(url, ws);
    
    ws.onclose = () => {
      this.connections.delete(url);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.connect(url, options), 1000 * Math.pow(2, this.reconnectAttempts));
        this.reconnectAttempts++;
      }
    };
    
    return ws;
  }
}
```

## Monitoring and Measurement

### Performance Metrics

1. **Core Web Vitals Monitoring**
```javascript
// src/lib/performance.ts - Already implemented
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric) => {
  // Send to your analytics service
  gtag('event', metric.name, {
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    event_category: 'Web Vitals',
    event_label: metric.id,
    non_interaction: true,
  });
};

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

2. **Custom Performance Metrics**
```javascript
// Track custom metrics
const trackCustomMetric = (name, value, unit = 'ms') => {
  performance.mark(`${name}-start`);
  // ... operation
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);
  
  const measure = performance.getEntriesByName(name)[0];
  console.log(`${name}: ${measure.duration}${unit}`);
};

// Usage
trackCustomMetric('portfolio-calculation', () => {
  calculatePortfolioMetrics(data);
});
```

### Performance Testing

1. **Automated Performance Tests**
```bash
# Run performance tests
npm run test:performance

# Lighthouse CI integration
npm install -g @lhci/cli
lhci autorun
```

2. **Real User Monitoring**
```javascript
// Monitor real user performance
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      console.log('Page load time:', entry.loadEventEnd - entry.fetchStart);
    }
  }
});

observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
```

### Performance Budget

```javascript
// Set performance budgets
const PERFORMANCE_BUDGET = {
  maxBundleSize: 500 * 1024, // 500KB
  maxImageSize: 100 * 1024,  // 100KB
  maxLCP: 2500,              // 2.5s
  maxFID: 100,               // 100ms
  maxCLS: 0.1                // 0.1
};

// Validate against budget in CI
const validatePerformanceBudget = (metrics) => {
  const violations = [];
  
  if (metrics.bundleSize > PERFORMANCE_BUDGET.maxBundleSize) {
    violations.push(`Bundle size exceeded: ${metrics.bundleSize} > ${PERFORMANCE_BUDGET.maxBundleSize}`);
  }
  
  return violations;
};
```

## Optimization Checklist

### Pre-Deployment

- [ ] Run `npm run build:pwa` and check bundle sizes
- [ ] Validate Core Web Vitals with Lighthouse
- [ ] Test on actual mobile devices
- [ ] Verify service worker caching strategies
- [ ] Check image optimization and formats
- [ ] Validate performance budget compliance

### Post-Deployment

- [ ] Monitor Core Web Vitals in production
- [ ] Track PWA installation rates
- [ ] Monitor service worker cache hit rates
- [ ] Analyze real user performance data
- [ ] Review and optimize based on usage patterns

### Continuous Optimization

- [ ] Regular bundle analysis and optimization
- [ ] Update caching strategies based on usage
- [ ] Optimize images and assets periodically
- [ ] Review and update performance budgets
- [ ] Monitor new performance APIs and techniques

---

For implementation details, refer to the [Mobile Deployment Guide](MOBILE_DEPLOYMENT_GUIDE.md) and [PWA Installation Guide](PWA_INSTALLATION_GUIDE.md).