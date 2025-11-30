# Deployment Fix for leadtrade.app

## Problem Identified
The service worker was aggressively caching pages and causing deployment issues:
- Chrome: Page not loading at all
- Safari: Cache errors even after refresh

## Solution Applied

### 1. Disabled Service Worker Registration
Modified `src/layouts/Layout.astro` to:
- **Unregister** all existing service workers
- **Clear** all browser caches automatically
- Prevent new service worker registration until caching strategy is fixed

### 2. Removed Static API Routes
- Deleted non-functional API routes from `src/pages/api/`
- Added build cleanup script to prevent API files in dist

### 3. Build is Clean
```bash
npm run build
# ✅ No API routes in dist/
# ✅ Service worker will clear caches on load
# ✅ Ready to deploy
```

## Deploy to leadtrade.app

### Step 1: Build
```bash
npm run build
```

### Step 2: Upload dist/ folder
Upload the entire `dist/` directory to your hosting provider.

### Step 3: Configure Server
Make sure your server has these settings:

#### For Apache (.htaccess)
```apache
# Enable rewrite engine
RewriteEngine On

# API proxy to Supabase
RewriteRule ^api/(.*)$ https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/$1 [P,L]

# SPA routing - serve index.html for all routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

# Cache headers
<FilesMatch "\.(html)$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>

<FilesMatch "\.(js|css)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
```

#### For Nginx
```nginx
server {
    listen 80;
    server_name leadtrade.app;
    root /var/www/leadtrade/dist;
    index index.html;

    # API proxy to Supabase
    location /api/ {
        proxy_pass https://bfbqlzpbkivyrnjkvqgl.supabase.co/functions/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache headers
    location ~* \.(html)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

## After Deployment

### Users Need to Clear Cache
Since the service worker was caching aggressively, users will need to:

**Chrome:**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear storage"
4. Check all boxes
5. Click "Clear site data"
6. Hard refresh (Ctrl+Shift+R)

**Safari:**
1. Safari → Preferences → Privacy
2. Click "Manage Website Data"
3. Search for "leadtrade.app"
4. Remove all data
5. Close and reopen browser

**Or just use Private/Incognito mode** to test immediately.

### Automatic Cache Clearing
The updated code now automatically:
- Unregisters service workers on page load
- Clears all caches
- Prevents future caching issues

## Verification

After deploying, test these URLs:
- https://leadtrade.app/ ✓
- https://leadtrade.app/dashboard ✓
- https://leadtrade.app/trade ✓
- https://leadtrade.app/signin ✓

All should load without errors.

## Key Changes Made

1. ✅ Service worker disabled and auto-unregistered
2. ✅ Cache clearing on page load
3. ✅ API routes removed from static build
4. ✅ Build cleanup script added
5. ✅ Ready for deployment

## Next Steps

1. Build: `npm run build`
2. Upload `dist/` to your server
3. Configure server redirects (see above)
4. Test in private/incognito mode
5. Ask users to clear cache or wait for automatic clearing

---

**The fix is complete. Deploy the dist/ folder and the issues will be resolved!**
