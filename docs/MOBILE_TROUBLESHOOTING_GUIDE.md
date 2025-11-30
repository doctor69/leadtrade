# Mobile Troubleshooting Guide

This guide helps diagnose and resolve common mobile and PWA issues in LeadTrade.

## Table of Contents

1. [Mobile Responsiveness Issues](#mobile-responsiveness-issues)
2. [PWA Installation Problems](#pwa-installation-problems)
3. [Performance Issues](#performance-issues)
4. [Offline Functionality](#offline-functionality)
5. [Touch and Interaction Issues](#touch-and-interaction-issues)
6. [Service Worker Problems](#service-worker-problems)
7. [Notification Issues](#notification-issues)
8. [Debug Tools and Commands](#debug-tools-and-commands)

## Mobile Responsiveness Issues

### Layout Breaking on Small Screens

**Symptoms:**
- Content overflows horizontally
- Elements overlap or stack incorrectly
- Text is too small to read

**Diagnosis:**
```bash
# Run mobile responsiveness tests
npm run test:run -- mobile-responsiveness

# Check specific breakpoints
# Open Chrome DevTools > Toggle device toolbar
# Test at: 320px, 375px, 414px, 768px, 1024px
```

**Solutions:**

1. **Check Viewport Meta Tag**
```html
<!-- Ensure this is in your HTML head -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

2. **Verify Tailwind Breakpoints**
```css
/* Check responsive classes are applied correctly */
.container {
  @apply px-4 sm:px-6 lg:px-8;
  @apply max-w-sm sm:max-w-md lg:max-w-4xl;
}
```

3. **Fix Container Overflow**
```css
/* Add to problematic containers */
.trading-container {
  @apply overflow-x-auto;
  @apply min-w-0; /* Allows flex items to shrink */
}
```

### Navigation Menu Not Working on Mobile

**Symptoms:**
- Hamburger menu doesn't open/close
- Menu items not clickable
- Menu appears behind other content

**Diagnosis:**
```javascript
// Check in browser console
console.log('Mobile menu state:', document.querySelector('[data-mobile-menu]'));
```

**Solutions:**

1. **Check Z-Index Issues**
```css
.mobile-menu {
  @apply z-50; /* Ensure menu appears above other content */
}
```

2. **Verify Touch Events**
```javascript
// Ensure touch events are handled
button.addEventListener('touchstart', handleMenuToggle, { passive: true });
```

3. **Test Menu Component**
```bash
# Check navbar component
npm run test:run -- --grep "mobile menu"
```

## PWA Installation Problems

### Install Prompt Not Appearing

**Symptoms:**
- No "Add to Home Screen" option
- Install banner doesn't show
- PWA criteria not met

**Diagnosis:**
```bash
# Validate PWA configuration
npm run validate:pwa

# Check manifest accessibility
curl https://your-domain.com/manifest.json

# Verify HTTPS
curl -I https://your-domain.com
```

**Solutions:**

1. **Ensure HTTPS**
```bash
# For development, use ngrok
npx ngrok http 4321
```

2. **Fix Manifest Issues**
```bash
# Validate and fix manifest
npm run validate:manifest
```

3. **Check Service Worker Registration**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('SW registrations:', registrations.length);
});
```

### PWA Not Installing on iOS

**Symptoms:**
- "Add to Home Screen" option missing in Safari
- Installation fails silently

**Solutions:**

1. **Check iOS Safari Requirements**
- Must use Safari browser (not Chrome)
- Requires user interaction (can't be programmatic)
- Site must be visited multiple times

2. **Verify Manifest Icons**
```json
{
  "icons": [
    {
      "src": "/icons/icon-192x192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

3. **Test Installation Flow**
```bash
# Generate missing icons if needed
node scripts/generate-icons.js
```

## Performance Issues

### Slow Loading on Mobile

**Symptoms:**
- Long initial load times
- Laggy interactions
- High memory usage

**Diagnosis:**
```bash
# Run performance tests
npm run test:performance

# Check bundle sizes
npm run build:pwa
du -sh dist/_astro/*
```

**Solutions:**

1. **Optimize Bundle Size**
```javascript
// Check astro.config.mjs for proper chunking
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-ui': ['@radix-ui/react-dialog'],
  'trading-components': ['src/components/trading/']
}
```

2. **Enable Compression**
```javascript
// Add to astro.config.mjs
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true
    }
  }
}
```

3. **Optimize Images**
```bash
# Generate optimized screenshots
node scripts/generate-screenshots.js
```

### High Memory Usage

**Symptoms:**
- Browser crashes on mobile
- Slow scrolling and interactions
- App becomes unresponsive

**Solutions:**

1. **Clear Service Worker Caches**
```javascript
// In browser console
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

2. **Optimize Component Rendering**
```javascript
// Use React.memo for expensive components
const TradingChart = React.memo(({ data }) => {
  // Component implementation
});
```

3. **Limit Cache Size**
```javascript
// Update sw.js cache management
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
```

## Offline Functionality

### Cached Content Not Loading

**Symptoms:**
- Blank pages when offline
- "No internet" errors
- Missing data when disconnected

**Diagnosis:**
```javascript
// Check cache contents in DevTools
// Application > Cache Storage > leadtrade-static-v1.x.x
```

**Solutions:**

1. **Verify Service Worker Caching**
```javascript
// Check if resources are cached
caches.match('/dashboard').then(response => {
  console.log('Dashboard cached:', !!response);
});
```

2. **Update Cache Strategy**
```javascript
// In sw.js, ensure proper caching
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/trade',
  '/leaderboard'
];
```

3. **Test Offline Mode**
```bash
# In Chrome DevTools:
# Application > Service Workers > Offline checkbox
```

### Background Sync Not Working

**Symptoms:**
- Offline actions not syncing when online
- Data inconsistencies
- Failed API calls not retrying

**Solutions:**

1. **Check Background Sync Support**
```javascript
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
  console.log('Background sync supported');
} else {
  console.log('Background sync not supported');
}
```

2. **Register Sync Events**
```javascript
// Register sync when offline action occurs
navigator.serviceWorker.ready.then(registration => {
  return registration.sync.register('offline-actions-sync');
});
```

3. **Debug Sync Events**
```javascript
// In sw.js, add logging
self.addEventListener('sync', (event) => {
  console.log('Sync event:', event.tag);
});
```

## Touch and Interaction Issues

### Touch Targets Too Small

**Symptoms:**
- Difficulty tapping buttons on mobile
- Accidental taps on wrong elements
- Poor user experience on touch devices

**Solutions:**

1. **Ensure Minimum Touch Target Size**
```css
.touch-target {
  @apply min-h-[44px] min-w-[44px]; /* 44px minimum for accessibility */
  @apply p-2; /* Add padding for larger touch area */
}
```

2. **Add Touch Feedback**
```css
.button {
  @apply active:scale-95 transition-transform;
  @apply touch-manipulation; /* Optimize for touch */
}
```

3. **Test Touch Interactions**
```bash
# Run touch interaction tests
npm run test:run -- --grep "touch"
```

### Scroll Issues on Mobile

**Symptoms:**
- Horizontal scroll when not intended
- Sticky elements not working
- Momentum scrolling problems

**Solutions:**

1. **Fix Horizontal Overflow**
```css
.container {
  @apply overflow-x-hidden;
  @apply max-w-full;
}
```

2. **Enable Momentum Scrolling**
```css
.scrollable {
  -webkit-overflow-scrolling: touch;
  @apply overflow-y-auto;
}
```

3. **Fix Sticky Elements**
```css
.sticky-header {
  @apply sticky top-0 z-10;
  @apply bg-white/95 backdrop-blur-sm;
}
```

## Service Worker Problems

### Service Worker Not Updating

**Symptoms:**
- Old cached content persists
- New features not appearing
- Stale data being served

**Solutions:**

1. **Force Service Worker Update**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.update();
  });
});
```

2. **Update Cache Version**
```javascript
// In sw.js, increment version
const CACHE_VERSION = '1.2.0'; // Update this
```

3. **Clear All Caches**
```javascript
// In browser console
caches.keys().then(names => {
  Promise.all(names.map(name => caches.delete(name)));
});
```

### Service Worker Registration Failed

**Symptoms:**
- PWA features not working
- No offline functionality
- Console errors about SW registration

**Solutions:**

1. **Check Service Worker File**
```bash
# Verify sw.js exists and is accessible
curl https://your-domain.com/sw.js
```

2. **Debug Registration**
```javascript
// Add error handling to SW registration
navigator.serviceWorker.register('/sw.js')
  .then(registration => console.log('SW registered:', registration))
  .catch(error => console.error('SW registration failed:', error));
```

3. **Check HTTPS Requirements**
```bash
# Service workers require HTTPS in production
# Use localhost or 127.0.0.1 for development
```

## Notification Issues

### Push Notifications Not Working

**Symptoms:**
- No notification permission prompt
- Notifications not received
- Silent notifications

**Solutions:**

1. **Check Notification Permission**
```javascript
console.log('Notification permission:', Notification.permission);

// Request permission if needed
if (Notification.permission === 'default') {
  Notification.requestPermission();
}
```

2. **Test Local Notifications**
```javascript
// Test basic notification functionality
new Notification('Test', {
  body: 'Testing notifications',
  icon: '/icons/icon-192x192.svg'
});
```

3. **Verify Push Subscription**
```javascript
// Check if push subscription exists
navigator.serviceWorker.ready.then(registration => {
  return registration.pushManager.getSubscription();
}).then(subscription => {
  console.log('Push subscription:', subscription);
});
```

## Debug Tools and Commands

### Validation Commands

```bash
# Comprehensive PWA validation
npm run validate:pwa

# Manifest validation only
npm run validate:manifest

# Mobile responsiveness tests
npm run test:run -- mobile-responsiveness

# Performance tests
npm run test:performance

# PWA functionality tests
npm run test:run -- pwa-functionality
```

### Browser DevTools

#### Chrome DevTools
1. **Application Tab**
   - Service Workers: Check registration and status
   - Cache Storage: Inspect cached resources
   - Manifest: Validate PWA manifest

2. **Network Tab**
   - Throttling: Test on slow connections
   - Offline: Test offline functionality

3. **Lighthouse**
   - PWA audit: Comprehensive PWA compliance check
   - Performance: Mobile performance metrics

#### Mobile Debugging

1. **Chrome Remote Debugging**
```bash
# Enable USB debugging on Android
# Chrome > More tools > Remote devices
```

2. **Safari Web Inspector (iOS)**
```bash
# Enable Web Inspector on iOS device
# Safari > Develop > [Device Name]
```

### Console Commands

```javascript
// Check PWA installation criteria
console.log('PWA installable:', window.matchMedia('(display-mode: standalone)').matches);

// Check service worker status
navigator.serviceWorker.ready.then(registration => {
  console.log('SW active:', registration.active);
});

// Check cache contents
caches.keys().then(names => {
  console.log('Cache names:', names);
});

// Test offline detection
console.log('Online:', navigator.onLine);
window.addEventListener('online', () => console.log('Back online'));
window.addEventListener('offline', () => console.log('Gone offline'));
```

### Log Analysis

#### Service Worker Logs
```javascript
// In sw.js, add comprehensive logging
console.log('SW: Install event');
console.log('SW: Activate event');
console.log('SW: Fetch event for:', event.request.url);
```

#### Performance Monitoring
```javascript
// Monitor Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## Getting Help

### Support Resources

1. **Documentation**
   - [Mobile Deployment Guide](MOBILE_DEPLOYMENT_GUIDE.md)
   - [PWA Installation Guide](PWA_INSTALLATION_GUIDE.md)

2. **Testing Tools**
   - Chrome DevTools Lighthouse
   - PWA Builder validation
   - WebPageTest mobile testing

3. **Community Resources**
   - MDN PWA documentation
   - Google Web.dev PWA guides
   - Stack Overflow PWA tag

### Reporting Issues

When reporting mobile/PWA issues, include:

1. **Device Information**
   - Device model and OS version
   - Browser name and version
   - Screen size and resolution

2. **Error Details**
   - Console error messages
   - Network tab information
   - Service worker status

3. **Reproduction Steps**
   - Exact steps to reproduce
   - Expected vs actual behavior
   - Screenshots or screen recordings

4. **Environment**
   - Development vs production
   - HTTPS status
   - PWA installation status

---

For additional support, refer to the main documentation or create an issue with detailed reproduction steps.