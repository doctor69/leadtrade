# Static CDN Deployment Guide for leadtrade.app

## Good News! 🎉

Your app is **already configured** to work with a static CDN. You have `edgeFunctionClient.ts` that calls Supabase Edge Functions directly - **no server-side proxy needed**.

## How It Works

```
Browser → Supabase Edge Functions (Direct)
   ↓
No /api/ proxy needed!
```

Your code uses:
- ✅ `edgeFunctionClient.request('function-name')` - Calls Supabase directly
- ✅ Supabase client - Handles auth and database
- ✅ Static files - Served from CDN

## Deployment Steps

### 1. Build
```bash
npm run build
```

### 2. Upload to CDN
Upload the entire `dist/` folder to your CDN provider:
- **Cloudflare Pages**: Connect to Git or upload via dashboard
- **AWS S3 + CloudFront**: `aws s3 sync dist/ s3://your-bucket/`
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy --prod`
- **Any CDN**: Just upload the `dist/` folder

### 3. Configure CDN (Important!)

Your CDN needs to serve `index.html` for all routes (SPA routing):

#### Cloudflare Pages
Create `public/_redirects`:
```
/*    /index.html   200
```

#### AWS CloudFront
Add CloudFront Function or Lambda@Edge to rewrite all paths to `/index.html`

#### Vercel
Create `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Netlify
Already configured in `netlify.toml` ✅

### 4. Set Environment Variables

Make sure your CDN has these environment variables:
```
PUBLIC_SUPABASE_URL=https://bfbqlzpbkivyrnjkvqgl.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PUBLIC_ALPACA_API_KEY=your-alpaca-key
PUBLIC_ALPACA_API_SECRET=your-alpaca-secret
PUBLIC_APP_URL=https://leadtrade.app
NODE_ENV=production
```

## No Server Configuration Needed!

Since you're using a static CDN:
- ❌ No Apache `.htaccess` needed
- ❌ No Nginx config needed
- ❌ No API proxy needed
- ✅ Just upload `dist/` and configure SPA routing

## After Deployment

### Clear Browser Cache
Users need to clear cache to see the fix:

**Chrome:**
1. F12 → Application → Clear storage → Clear site data
2. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)

**Safari:**
1. Develop → Empty Caches
2. Or use Private Browsing

**Automatic:** The new code will automatically unregister service workers and clear caches on page load.

## Testing

After deploying, test these URLs:
- https://leadtrade.app/ ✓
- https://leadtrade.app/dashboard ✓
- https://leadtrade.app/trade ✓
- https://leadtrade.app/signin ✓

All should load without errors.

## Common CDN Providers

### Cloudflare Pages (Recommended)
```bash
# Connect to Git repo or upload manually
# Automatic builds on push
# Free SSL, global CDN
```

### AWS S3 + CloudFront
```bash
# Upload to S3
aws s3 sync dist/ s3://leadtrade-app/

# Configure CloudFront distribution
# Point to S3 bucket
# Set default root object: index.html
```

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod
```

### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

## Troubleshooting

### "Page Not Found" on refresh
**Problem:** CDN not configured for SPA routing  
**Solution:** Add redirect rule to serve `index.html` for all routes

### API calls failing
**Problem:** Environment variables not set  
**Solution:** Add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` to CDN

### Still seeing cache errors
**Problem:** Old service worker cached  
**Solution:** Clear browser cache or wait for automatic clearing

## Summary

✅ **No server configuration needed**  
✅ **No API proxy needed**  
✅ **Just upload dist/ folder**  
✅ **Configure SPA routing on CDN**  
✅ **Set environment variables**  
✅ **Done!**

---

**Your app is ready for static CDN deployment! 🚀**
