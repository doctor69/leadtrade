// LEADTRADE Service Worker with Advanced Caching
const CACHE_VERSION = '1.2.0'; // Updated for Safari compatibility
const STATIC_CACHE = `leadtrade-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `leadtrade-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `leadtrade-api-v${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/trade',
  '/leaderboard',
  '/settings',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/icons/icon-144x144.svg',
  '/icons/icon-72x72.svg',
  '/icons/dashboard-96x96.svg',
  '/icons/trade-96x96.svg',
  '/icons/leaderboard-96x96.svg'
];

// API endpoints for network-first caching
const API_ENDPOINTS = [
  '/api/market-data',
  '/api/alpaca/',
  '/api/auth/',
  '/api/user/'
];

// Cache duration settings (in milliseconds)
const CACHE_DURATIONS = {
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  DYNAMIC: 24 * 60 * 60 * 1000,    // 1 day
  API: 5 * 60 * 1000,              // 5 minutes
  MARKET_DATA: 30 * 1000           // 30 seconds
};

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Fetch event - advanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip cross-origin requests to avoid CORS issues
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (isAPIRequest(request)) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
  } else if (isMarketDataRequest(request)) {
    event.respondWith(staleWhileRevalidateStrategy(request, API_CACHE));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
  }
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request, { redirect: 'follow' });
    
    // Don't cache redirects (Safari compatibility)
    if (networkResponse.type === 'opaqueredirect' || networkResponse.redirected) {
      return networkResponse;
    }
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first strategy for API calls
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request, { redirect: 'follow' });
    
    // Don't cache redirects (Safari compatibility)
    if (networkResponse.type === 'opaqueredirect' || networkResponse.redirected) {
      return networkResponse;
    }
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale-while-revalidate strategy for dynamic content
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request, { redirect: 'follow' }).then((networkResponse) => {
    // Don't cache redirects (Safari compatibility)
    if (networkResponse.type === 'opaqueredirect' || networkResponse.redirected) {
      return networkResponse;
    }
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, return cached response if available
    return cachedResponse;
  });

  // Return cached response immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Helper functions to identify request types
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/) ||
    STATIC_ASSETS.includes(url.pathname);
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint));
}

function isMarketDataRequest(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/market-data') ||
    url.pathname.includes('/quotes') ||
    url.pathname.includes('/bars');
}

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker activated successfully');
    })
  );
});

// Enhanced Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);

  switch (event.tag) {
    case 'offline-actions-sync':
      event.waitUntil(syncOfflineActions());
      break;
    case 'portfolio-sync':
      event.waitUntil(syncPortfolioData());
      break;
    case 'market-data-sync':
      event.waitUntil(syncMarketData());
      break;
    case 'trade-sync':
      event.waitUntil(syncTradeActions());
      break;
    case 'copy-trading-sync':
      event.waitUntil(syncCopyTradingActions());
      break;
    case 'settings-sync':
      event.waitUntil(syncSettingsActions());
      break;
    case 'periodic-sync':
      event.waitUntil(performPeriodicSync());
      break;
    default:
      console.log('Unknown sync tag:', event.tag);
      break;
  }
});

async function syncOfflineActions() {
  try {
    console.log('Syncing offline actions...');

    const clients = await self.clients.matchAll();
    const syncStartTime = Date.now();

    // Notify clients that sync is starting
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_START',
        data: {
          syncType: 'offline-actions',
          timestamp: syncStartTime
        }
      });
    });

    // Get offline actions from IndexedDB
    const offlineActions = await getOfflineActionsFromDB();
    let syncedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const action of offlineActions) {
      try {
        const success = await executeOfflineAction(action);
        if (success) {
          await removeOfflineActionFromDB(action.id);
          syncedCount++;
        } else {
          failedCount++;
          await incrementActionRetryCount(action.id);
        }
      } catch (error) {
        console.error('Failed to sync action:', action.id, error);
        failedCount++;
        errors.push({ actionId: action.id, error: error.message });
        await incrementActionRetryCount(action.id);
      }
    }

    // Notify clients that sync is complete
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: {
          syncType: 'offline-actions',
          success: errors.length === 0,
          syncedCount,
          failedCount,
          errors,
          duration: Date.now() - syncStartTime
        }
      });
    });

    console.log(`Offline actions sync completed: ${syncedCount} synced, ${failedCount} failed`);
  } catch (error) {
    console.error('Offline actions sync failed:', error);

    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_ERROR',
        data: {
          syncType: 'offline-actions',
          error: error.message,
          timestamp: Date.now()
        }
      });
    });
  }
}

async function syncTradeActions() {
  try {
    console.log('Syncing trade actions...');

    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_START',
        data: { syncType: 'trade-actions' }
      });
    });

    const tradeActions = await getOfflineActionsByType('trade');
    let syncedCount = 0;

    for (const action of tradeActions) {
      try {
        const success = await executeTradeAction(action);
        if (success) {
          await removeOfflineActionFromDB(action.id);
          syncedCount++;

          // Notify about successful trade execution
          clients.forEach(client => {
            client.postMessage({
              type: 'TRADE_EXECUTED',
              data: {
                action: action.payload,
                timestamp: Date.now()
              }
            });
          });
        }
      } catch (error) {
        console.error('Failed to sync trade action:', error);
        await incrementActionRetryCount(action.id);
      }
    }

    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: {
          syncType: 'trade-actions',
          syncedCount
        }
      });
    });

  } catch (error) {
    console.error('Trade actions sync failed:', error);
  }
}

async function syncCopyTradingActions() {
  try {
    console.log('Syncing copy trading actions...');

    const clients = await self.clients.matchAll();
    const copyTradingActions = await getOfflineActionsByType(['follow', 'unfollow']);
    let syncedCount = 0;

    for (const action of copyTradingActions) {
      try {
        const success = await executeCopyTradingAction(action);
        if (success) {
          await removeOfflineActionFromDB(action.id);
          syncedCount++;
        }
      } catch (error) {
        console.error('Failed to sync copy trading action:', error);
        await incrementActionRetryCount(action.id);
      }
    }

    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: {
          syncType: 'copy-trading-actions',
          syncedCount
        }
      });
    });

  } catch (error) {
    console.error('Copy trading actions sync failed:', error);
  }
}

async function syncSettingsActions() {
  try {
    console.log('Syncing settings actions...');

    const settingsActions = await getOfflineActionsByType('settings');
    let syncedCount = 0;

    for (const action of settingsActions) {
      try {
        const success = await executeSettingsAction(action);
        if (success) {
          await removeOfflineActionFromDB(action.id);
          syncedCount++;
        }
      } catch (error) {
        console.error('Failed to sync settings action:', error);
        await incrementActionRetryCount(action.id);
      }
    }

    console.log(`Settings sync completed: ${syncedCount} actions synced`);
  } catch (error) {
    console.error('Settings actions sync failed:', error);
  }
}

async function syncPortfolioData() {
  try {
    console.log('Syncing portfolio data...');

    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_START',
        data: { syncType: 'portfolio' }
      });
    });

    // Trigger portfolio data refresh in clients
    clients.forEach(client => {
      client.postMessage({
        type: 'REFRESH_PORTFOLIO',
        data: { timestamp: Date.now() }
      });
    });

    console.log('Portfolio data sync completed');
  } catch (error) {
    console.error('Portfolio data sync failed:', error);
  }
}

async function syncMarketData() {
  try {
    console.log('Syncing market data...');

    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'REFRESH_MARKET_DATA',
        data: { timestamp: Date.now() }
      });
    });

    console.log('Market data sync completed');
  } catch (error) {
    console.error('Market data sync failed:', error);
  }
}

async function performPeriodicSync() {
  try {
    console.log('Performing periodic sync...');

    // Sync all pending actions
    await syncOfflineActions();

    // Refresh cached data
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'PERIODIC_SYNC',
        data: { timestamp: Date.now() }
      });
    });

    console.log('Periodic sync completed');
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}

// IndexedDB helper functions for background sync
async function getOfflineActionsFromDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LeadTradeOffline', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

async function getOfflineActionsByType(types) {
  const allActions = await getOfflineActionsFromDB();
  const typeArray = Array.isArray(types) ? types : [types];
  return allActions.filter(action => typeArray.includes(action.type));
}

async function removeOfflineActionFromDB(actionId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LeadTradeOffline', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const deleteRequest = store.delete(actionId);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

async function incrementActionRetryCount(actionId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LeadTradeOffline', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.retryCount = (action.retryCount || 0) + 1;
          action.lastRetry = Date.now();

          const putRequest = store.put(action);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Action not found, probably already processed
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

// Action execution functions
async function executeOfflineAction(action) {
  switch (action.type) {
    case 'trade':
      return await executeTradeAction(action);
    case 'follow':
    case 'unfollow':
      return await executeCopyTradingAction(action);
    case 'settings':
      return await executeSettingsAction(action);
    default:
      console.warn('Unknown action type:', action.type);
      return false;
  }
}

async function executeTradeAction(action) {
  try {
    const response = await fetch('/api/alpaca/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action.payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Trade action execution failed:', error);
    return false;
  }
}

async function executeCopyTradingAction(action) {
  try {
    const response = await fetch('/api/copy-trading/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: action.type,
        ...action.payload
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Copy trading action execution failed:', error);
    return false;
  }
}

async function executeSettingsAction(action) {
  try {
    const response = await fetch('/api/user/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action.payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Settings action execution failed:', error);
    return false;
  }
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'REGISTER_SYNC') {
    // Register background sync
    self.registration.sync.register(event.data.tag).catch((error) => {
      console.error('Failed to register sync:', error);
    });
  }
});

// Enhanced Push Notification Handler with Advanced Features
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'LeadTrade',
    body: 'New update available!',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    tag: 'default',
    data: {
      url: '/dashboard',
      timestamp: Date.now()
    }
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
    } catch (error) {
      console.error('Failed to parse push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Check notification preferences and quiet hours
  event.waitUntil(
    checkNotificationPermissions(notificationData).then(shouldShow => {
      if (!shouldShow) {
        console.log('Notification suppressed due to user preferences');
        return;
      }

      // Create notification options with enhanced features
      const options = {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        data: {
          ...notificationData.data,
          receivedAt: Date.now(),
          notificationId: generateNotificationId()
        },
        vibrate: notificationData.vibrate || getVibrationPattern(notificationData.tag),
        requireInteraction: notificationData.requireInteraction || isHighPriorityNotification(notificationData.tag),
        silent: notificationData.silent || false,
        actions: notificationData.actions || getDefaultNotificationActions(notificationData.tag),
        image: notificationData.image, // Support for rich notifications
        timestamp: notificationData.timestamp || Date.now()
      };

      // Track notification for analytics
      trackPushNotification(notificationData);

      // Show the notification
      return self.registration.showNotification(notificationData.title, options);
    })
  );
});

// Enhanced Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  let targetUrl = notificationData.url || '/dashboard';

  // Handle different actions
  switch (action) {
    case 'view-trade':
      targetUrl = '/trade';
      break;
    case 'view-portfolio':
      targetUrl = '/dashboard';
      break;
    case 'view-leader':
      targetUrl = '/leaderboard';
      break;
    case 'manage-copy':
      targetUrl = '/trade?tab=copy-trading';
      break;
    case 'dismiss':
      // Just close the notification, no navigation
      return;
    default:
      // Default action or no action - use the URL from data
      break;
  }

  // Track notification interaction
  trackNotificationInteraction(event.notification.tag, action);

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            // Focus existing window and navigate
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: { url: targetUrl, action, notificationData }
            });
            return;
          }
        }

        // Open new window if app is not open
        return clients.openWindow(targetUrl);
      })
  );
});

// Get default actions based on notification type
function getDefaultNotificationActions(tag) {
  const baseActions = [
    {
      action: 'dismiss',
      title: 'Dismiss',
      icon: '/icons/icon-72x72.svg'
    }
  ];

  switch (tag) {
    case 'trade-alert':
      return [
        {
          action: 'view-trade',
          title: 'View Trade',
          icon: '/icons/trade-96x96.svg'
        },
        ...baseActions
      ];

    case 'portfolio-update':
      return [
        {
          action: 'view-portfolio',
          title: 'View Portfolio',
          icon: '/icons/dashboard-96x96.svg'
        },
        ...baseActions
      ];

    case 'copy-trading-update':
      return [
        {
          action: 'view-leader',
          title: 'View Leader',
          icon: '/icons/leaderboard-96x96.svg'
        },
        {
          action: 'manage-copy',
          title: 'Manage Copy',
          icon: '/icons/trade-96x96.svg'
        }
      ];

    default:
      return [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/dashboard-96x96.svg'
        },
        ...baseActions
      ];
  }
}

// Enhanced notification permission and preference checking
async function checkNotificationPermissions(notificationData) {
  try {
    // Get stored preferences from IndexedDB
    const preferences = await getNotificationPreferences();

    if (!preferences) {
      return true; // Default to showing notifications if no preferences set
    }

    // Check notification type preferences
    const tag = notificationData.tag || '';
    if (tag.includes('trade') && !preferences.tradeAlerts) return false;
    if (tag.includes('portfolio') && !preferences.portfolioUpdates) return false;
    if (tag.includes('market') && !preferences.marketNews) return false;
    if (tag.includes('copy-trading') && !preferences.copyTradingUpdates) return false;
    if (tag.includes('system') && !preferences.systemNotifications) return false;

    // Check quiet hours
    if (preferences.quietHours && preferences.quietHours.enabled) {
      if (isInQuietHours(preferences.quietHours)) {
        // Only show high-priority notifications during quiet hours
        return isHighPriorityNotification(tag);
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return true; // Default to showing notifications on error
  }
}

// Get notification preferences from IndexedDB
async function getNotificationPreferences() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('LeadTradeOffline', 1);

      request.onerror = () => resolve(null);

      request.onsuccess = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains('preferences')) {
          resolve(null);
          return;
        }

        const transaction = db.transaction(['preferences'], 'readonly');
        const store = transaction.objectStore('preferences');
        const getRequest = store.get('notifications');

        getRequest.onsuccess = () => resolve(getRequest.result?.value || null);
        getRequest.onerror = () => resolve(null);
      };
    } catch (error) {
      console.error('Error accessing notification preferences:', error);
      resolve(null);
    }
  });
}

// Check if current time is within quiet hours
function isInQuietHours(quietHours) {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = quietHours.start.split(':').map(Number);
  const [endHour, endMin] = quietHours.end.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  if (startTime <= endTime) {
    // Same day quiet hours (e.g., 14:00 to 18:00)
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Overnight quiet hours (e.g., 22:00 to 08:00)
    return currentTime >= startTime || currentTime <= endTime;
  }
}

// Determine if notification is high priority
function isHighPriorityNotification(tag) {
  const highPriorityTags = [
    'trade-alert',
    'order-fill',
    'system-error',
    'security-alert',
    'account-alert'
  ];

  return highPriorityTags.some(priorityTag => tag.includes(priorityTag));
}

// Get vibration pattern based on notification type
function getVibrationPattern(tag) {
  const patterns = {
    'trade-alert': [200, 100, 200],
    'portfolio-update': [100, 50, 100],
    'copy-trading-update': [150, 75, 150, 75, 150],
    'market-alert': [300, 100, 300],
    'system': [100, 50, 100, 50, 100],
    'default': [100, 50, 100]
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    if (tag.includes(key)) {
      return pattern;
    }
  }

  return patterns.default;
}

// Generate unique notification ID
function generateNotificationId() {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Track push notification for analytics
function trackPushNotification(notificationData) {
  try {
    const trackingData = {
      tag: notificationData.tag,
      title: notificationData.title,
      timestamp: Date.now(),
      type: 'push_received'
    };

    // Send to clients for analytics
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'PUSH_NOTIFICATION_RECEIVED',
          data: trackingData
        });
      });
    });

    // Store locally for offline analytics
    storeNotificationAnalytics(trackingData);
  } catch (error) {
    console.error('Failed to track push notification:', error);
  }
}

// Store notification analytics in IndexedDB
async function storeNotificationAnalytics(data) {
  try {
    const request = indexedDB.open('LeadTradeOffline', 1);

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('analytics')) {
        return; // Analytics store not available
      }

      const transaction = db.transaction(['analytics'], 'readwrite');
      const store = transaction.objectStore('analytics');

      store.add({
        id: generateNotificationId(),
        type: 'notification',
        data,
        timestamp: Date.now()
      });
    };
  } catch (error) {
    console.error('Failed to store notification analytics:', error);
  }
}

// Track notification interactions for analytics
function trackNotificationInteraction(tag, action) {
  try {
    const interaction = {
      tag,
      action,
      timestamp: Date.now(),
      type: 'notification_interaction'
    };

    // Store interaction data
    storeNotificationAnalytics(interaction);

    // Send to clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_INTERACTION',
          data: interaction
        });
      });
    });
  } catch (error) {
    console.error('Failed to track notification interaction:', error);
  }
}

// Cache management utilities
async function cleanupExpiredCache() {
  try {
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const cachedDate = new Date(response.headers.get('date') || Date.now());
          const now = new Date();
          const age = now.getTime() - cachedDate.getTime();

          // Determine max age based on cache type
          let maxAge = CACHE_DURATIONS.DYNAMIC;
          if (cacheName.includes('static')) {
            maxAge = CACHE_DURATIONS.STATIC;
          } else if (cacheName.includes('api')) {
            maxAge = CACHE_DURATIONS.API;
          }

          if (age > maxAge) {
            console.log('Removing expired cache entry:', request.url);
            await cache.delete(request);
          }
        }
      }
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}

// Periodic cache cleanup
setInterval(cleanupExpiredCache, 60 * 60 * 1000); // Run every hour

// Enhanced cache size management with performance optimization
async function manageCacheSize(cacheName, maxEntries = 100, maxSize = 50 * 1024 * 1024) { // 50MB default
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    if (requests.length === 0) return;

    // Calculate current cache size and collect entries with metadata
    const entries = [];
    let totalSize = 0;

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const size = parseInt(response.headers.get('content-length') || '0');
        const date = new Date(response.headers.get('date') || 0);
        const lastAccessed = parseInt(response.headers.get('x-last-accessed') || '0');

        entries.push({
          request,
          response,
          size,
          date,
          lastAccessed: lastAccessed || date.getTime(),
          url: request.url
        });
        totalSize += size;
      }
    }

    // Sort by last accessed time (LRU - Least Recently Used)
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    let deletedCount = 0;
    let freedSize = 0;

    // Remove entries if over limits
    while ((entries.length > maxEntries || totalSize > maxSize) && entries.length > 0) {
      const entry = entries.shift();
      if (entry) {
        await cache.delete(entry.request);
        deletedCount++;
        freedSize += entry.size;
        totalSize -= entry.size;
      }
    }

    if (deletedCount > 0) {
      console.log(`Cache cleanup for ${cacheName}:`);
      console.log(`  Removed ${deletedCount} entries`);
      console.log(`  Freed ${Math.round(freedSize / 1024)}KB`);
      console.log(`  Current size: ${Math.round(totalSize / 1024)}KB`);
    }

    // Update access times for remaining entries
    await updateCacheAccessTimes(cache, entries);

  } catch (error) {
    console.error('Cache size management failed:', error);
  }
}

// Update cache access times for LRU tracking
async function updateCacheAccessTimes(cache, entries) {
  const now = Date.now();

  for (const entry of entries.slice(0, 10)) { // Update only recent entries to avoid performance impact
    try {
      const response = entry.response.clone();
      const headers = new Headers(response.headers);
      headers.set('x-last-accessed', now.toString());

      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });

      await cache.put(entry.request, newResponse);
    } catch (error) {
      // Ignore errors in access time updates
    }
  }
}

// Intelligent cache preloading based on usage patterns
async function preloadCriticalResources() {
  try {
    const criticalResources = [
      '/',
      '/dashboard',
      '/trade',
      '/manifest.json',
      '/icons/icon-192x192.svg'
    ];

    const cache = await caches.open(STATIC_CACHE);

    for (const resource of criticalResources) {
      try {
        const cachedResponse = await cache.match(resource);
        if (!cachedResponse) {
          const response = await fetch(resource);
          if (response.ok) {
            await cache.put(resource, response);
            console.log(`Preloaded critical resource: ${resource}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to preload ${resource}:`, error);
      }
    }
  } catch (error) {
    console.error('Critical resource preloading failed:', error);
  }
}

// Performance-optimized cache management
setInterval(() => {
  // Stagger cache management to avoid performance impact
  setTimeout(() => manageCacheSize(STATIC_CACHE, 100, 20 * 1024 * 1024), 0); // 20MB
  setTimeout(() => manageCacheSize(DYNAMIC_CACHE, 50, 15 * 1024 * 1024), 5000); // 15MB
  setTimeout(() => manageCacheSize(API_CACHE, 100, 10 * 1024 * 1024), 10000); // 10MB
}, 30 * 60 * 1000); // Run every 30 minutes

// Preload critical resources on service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Existing activation logic
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim(),
      // New: Preload critical resources
      preloadCriticalResources()
    ]).then(() => {
      console.log('Service Worker activated with performance optimizations');
    })
  );
});

// Performance monitoring in service worker
function trackCachePerformance(cacheName, operation, startTime) {
  const duration = performance.now() - startTime;

  if (duration > 100) { // Log slow cache operations
    console.warn(`Slow cache operation: ${operation} on ${cacheName} took ${duration.toFixed(2)}ms`);
  }

  // Send performance data to clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_PERFORMANCE',
        data: {
          cacheName,
          operation,
          duration,
          timestamp: Date.now()
        }
      });
    });
  });
}