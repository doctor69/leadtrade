# PWA Installation and Setup Guide

This guide provides comprehensive instructions for setting up, configuring, and installing the LeadTrade Progressive Web App (PWA).

## Table of Contents

1. [PWA Overview](#pwa-overview)
2. [Installation for Users](#installation-for-users)
3. [Developer Setup](#developer-setup)
4. [Configuration](#configuration)
5. [Features and Capabilities](#features-and-capabilities)
6. [Troubleshooting](#troubleshooting)

## PWA Overview

LeadTrade PWA provides native app-like experience with:

- **Offline Functionality**: Access portfolio data without internet
- **Push Notifications**: Real-time trading alerts
- **App-like Interface**: Standalone mode without browser UI
- **Background Sync**: Automatic data synchronization
- **Fast Loading**: Cached resources for instant access
- **Mobile Optimized**: Touch-friendly interface for all devices

### System Requirements

- **iOS**: Safari 11.1+ or Chrome 67+
- **Android**: Chrome 67+ or Firefox 68+
- **Desktop**: Chrome 67+, Firefox 68+, Safari 11.1+, Edge 79+
- **HTTPS**: Required for all PWA features

## Installation for Users

### Mobile Installation (iOS)

1. **Open Safari** and navigate to LeadTrade
2. **Tap the Share button** (square with arrow up)
3. **Scroll down** and tap "Add to Home Screen"
4. **Customize the name** if desired
5. **Tap "Add"** to install

**Alternative for iOS Chrome:**
1. Open Chrome and visit LeadTrade
2. Tap the **three dots menu**
3. Select **"Add to Home Screen"**
4. Tap **"Add"** to confirm

### Mobile Installation (Android)

1. **Open Chrome** and navigate to LeadTrade
2. **Tap the install prompt** that appears at the bottom
3. **Tap "Install"** to confirm

**Manual Installation:**
1. Tap the **three dots menu** in Chrome
2. Select **"Add to Home Screen"** or **"Install App"**
3. Tap **"Install"** to confirm

### Desktop Installation

#### Chrome/Edge
1. **Visit LeadTrade** in Chrome or Edge
2. **Click the install icon** in the address bar (computer with arrow)
3. **Click "Install"** in the popup dialog

#### Manual Installation
1. **Click the three dots menu**
2. **Select "Install LeadTrade..."**
3. **Click "Install"** to confirm

### Verification

After installation, verify the PWA is working:

- **App Icon**: Should appear on home screen/app drawer
- **Standalone Mode**: Opens without browser UI
- **Offline Access**: Works without internet connection
- **Push Notifications**: Prompts for permission (if enabled)

## Developer Setup

### Prerequisites

```bash
# Node.js 18+ required
node --version

# Install dependencies
npm install

# Verify PWA configuration
npm run validate:pwa
```

### Development Environment

```bash
# Start development server
npm run dev

# The PWA features work in development but require HTTPS for full functionality
# Use ngrok or similar for HTTPS testing:
npx ngrok http 4321
```

### Build and Test

```bash
# Build PWA for production
npm run build:pwa

# Preview production build
npm run preview

# Validate PWA compliance
npm run validate:pwa
```

## Configuration

### PWA Manifest (public/manifest.json)

The PWA manifest defines app metadata:

```json
{
  "name": "LEADTRADE - Trading Platform for Leaders",
  "short_name": "LEADTRADE",
  "description": "The ultimate trading platform with real market data and follow trading features",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "en",
  "categories": ["finance", "business", "productivity"]
}
```

### Service Worker (public/sw.js)

The service worker handles:

- **Caching Strategies**: Cache-first, network-first, stale-while-revalidate
- **Background Sync**: Offline action queuing
- **Push Notifications**: Real-time alerts
- **Offline Support**: Cached content access

### Icons and Assets

Required PWA icons in `public/icons/`:

- `icon-72x72.svg` - Small icon
- `icon-96x96.svg` - Standard icon
- `icon-128x128.svg` - Medium icon
- `icon-144x144.svg` - Large icon
- `icon-152x152.svg` - iOS icon
- `icon-192x192.svg` - Android icon (required)
- `icon-384x384.svg` - Large Android icon
- `icon-512x512.svg` - Splash screen icon (required)

### App Shortcuts

Pre-configured shortcuts for quick access:

```json
{
  "shortcuts": [
    {
      "name": "Dashboard",
      "url": "/dashboard",
      "description": "View your trading dashboard"
    },
    {
      "name": "Trade",
      "url": "/trade", 
      "description": "Execute trades"
    },
    {
      "name": "Leaderboard",
      "url": "/leaderboard",
      "description": "View top traders"
    }
  ]
}
```

## Features and Capabilities

### Offline Functionality

The PWA works offline with:

- **Cached Portfolio Data**: View recent portfolio information
- **Offline Navigation**: Browse cached pages
- **Action Queuing**: Queue trades and actions for when online
- **Background Sync**: Automatic synchronization when connection returns

#### Testing Offline Mode

```bash
# In Chrome DevTools:
# 1. Open Application tab
# 2. Select "Service Workers"
# 3. Check "Offline" checkbox
# 4. Refresh page to test offline functionality
```

### Push Notifications

Enable push notifications for:

- **Trade Alerts**: Order fills and trade updates
- **Portfolio Updates**: Significant portfolio changes
- **Copy Trading**: Leader trade notifications
- **Market Alerts**: Important market news

#### Notification Setup

```javascript
// Request notification permission
if ('Notification' in window && 'serviceWorker' in navigator) {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      console.log('Notifications enabled');
    }
  });
}
```

### Background Sync

Automatic synchronization handles:

- **Offline Trades**: Execute when connection returns
- **Portfolio Updates**: Sync latest data
- **Settings Changes**: Apply queued preference updates
- **Copy Trading Actions**: Follow/unfollow actions

### Performance Features

- **Code Splitting**: Optimized bundle loading
- **Lazy Loading**: Load components as needed
- **Image Optimization**: Responsive images for all devices
- **Caching**: Intelligent resource caching

## Troubleshooting

### Installation Issues

#### PWA Install Prompt Not Appearing

**Possible Causes:**
- Site not served over HTTPS
- Manifest.json not accessible
- Service worker not registered
- Browser doesn't support PWA installation

**Solutions:**
```bash
# 1. Verify HTTPS
curl -I https://your-domain.com

# 2. Check manifest accessibility
curl https://your-domain.com/manifest.json

# 3. Validate PWA configuration
npm run validate:pwa

# 4. Clear browser cache and revisit site
```

#### Service Worker Registration Failed

**Check in Browser DevTools:**
1. Open **Application** tab
2. Select **Service Workers**
3. Look for registration errors

**Common Fixes:**
```javascript
// Check service worker registration
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registered SWs:', registrations.length);
});

// Unregister and re-register if needed
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
```

### Offline Issues

#### Cached Content Not Loading

**Debug Steps:**
1. Check **Application > Storage** in DevTools
2. Verify **Cache Storage** contains expected resources
3. Check **Service Worker** logs for errors

**Solutions:**
```bash
# Update cache version in sw.js
const CACHE_VERSION = '1.2.0'; // Increment version

# Clear all caches
# In DevTools: Application > Storage > Clear storage
```

#### Background Sync Not Working

**Verify Background Sync:**
```javascript
// Check if background sync is supported
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
  console.log('Background sync supported');
}

// Register sync event
navigator.serviceWorker.ready.then(registration => {
  return registration.sync.register('offline-actions-sync');
});
```

### Performance Issues

#### Slow Loading

**Optimization Steps:**
1. **Check Bundle Size**: Run `npm run build:pwa` and review output
2. **Analyze Network**: Use DevTools Network tab
3. **Cache Efficiency**: Check cache hit rates in Application tab

**Performance Commands:**
```bash
# Run performance tests
npm run test:performance

# Analyze bundle size
npm run build:pwa
# Check dist/ folder size and chunk distribution
```

#### High Memory Usage

**Memory Optimization:**
- Clear unused caches periodically
- Limit IndexedDB storage size
- Optimize image sizes and formats

### Notification Issues

#### Push Notifications Not Working

**Requirements Check:**
- HTTPS enabled
- Notification permission granted
- Service worker registered
- Push subscription active

**Debug Notifications:**
```javascript
// Check notification permission
console.log('Notification permission:', Notification.permission);

// Test local notification
new Notification('Test', {
  body: 'PWA notifications working',
  icon: '/icons/icon-192x192.svg'
});
```

### Development Issues

#### PWA Features Not Working in Development

**Development Limitations:**
- Some PWA features require HTTPS
- Service worker may not update immediately
- Push notifications need production setup

**Development Solutions:**
```bash
# Use HTTPS in development
npx ngrok http 4321

# Force service worker update
# In DevTools: Application > Service Workers > Update
```

## Advanced Configuration

### Custom Service Worker

Modify `public/sw.js` for custom caching:

```javascript
// Add custom cache strategies
const CUSTOM_CACHE = 'leadtrade-custom-v1';

// Custom fetch handler
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/custom/')) {
    event.respondWith(customCacheStrategy(event.request));
  }
});
```

### Manifest Customization

Update `public/manifest.json` for branding:

```json
{
  "theme_color": "#your-brand-color",
  "background_color": "#your-background-color",
  "icons": [
    {
      "src": "/icons/custom-icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Analytics Integration

Track PWA usage:

```javascript
// Track PWA installation
window.addEventListener('beforeinstallprompt', (e) => {
  // Analytics: PWA install prompt shown
  gtag('event', 'pwa_install_prompt_shown');
});

// Track PWA usage
if (window.matchMedia('(display-mode: standalone)').matches) {
  // Analytics: PWA launched in standalone mode
  gtag('event', 'pwa_standalone_launch');
}
```

## Best Practices

### Development
- Test PWA features on actual devices
- Use HTTPS in development when testing PWA features
- Validate PWA configuration before deployment
- Monitor service worker updates and cache strategies

### Deployment
- Always run `npm run validate:pwa` before deployment
- Test installation flow on multiple browsers/devices
- Monitor PWA installation rates and user engagement
- Keep service worker cache version updated

### Maintenance
- Regular PWA compliance audits
- Update icons and screenshots as UI evolves
- Monitor offline usage patterns
- Optimize caching strategies based on usage data

## Resources

### Tools
- **Chrome DevTools**: PWA debugging and auditing
- **Lighthouse**: PWA compliance testing
- **PWABuilder**: Microsoft's PWA packaging tool
- **Workbox**: Google's PWA toolkit

### Documentation
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google PWA Documentation](https://web.dev/progressive-web-apps/)
- [Apple PWA Support](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)

### Testing
- [PWA Testing Checklist](https://web.dev/pwa-checklist/)
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)

---

For deployment-specific instructions, see the [Mobile Deployment Guide](MOBILE_DEPLOYMENT_GUIDE.md).