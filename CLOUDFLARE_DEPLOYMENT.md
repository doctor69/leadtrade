# Cloudflare Pages Deployment Guide

## Environment Variables Setup

You need to add these environment variables in Cloudflare Pages dashboard:

### Required Variables

Go to: **Cloudflare Dashboard → Pages → Your Project → Settings → Environment Variables**

Add the following variables for **Production**:

```
PUBLIC_SUPABASE_URL=https://bfbqlzpbkivyrnjkvqgl.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmYnFsenBia2l2eXJuamt2cWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MDEwNDIsImV4cCI6MjA2ODI3NzA0Mn0.MZrDGOG-S9mVrcQGBHPWzCf3vm-9eZ2GvE122Glb748

PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=CK7RW6V4AXVA1K0IX1X3
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=7OUtdbK617dHqRDiOAHYVg797fF7OCC2AVuZwKzQ
PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL=https://broker-api.sandbox.alpaca.markets
PUBLIC_ALPACA_DATA_SANDBOX_BASE_URL=https://data.sandbox.alpaca.markets
PUBLIC_ALPACA_TRADING_SANDBOX_BASE_URL=https://paper-api.alpaca.markets

PUBLIC_ALPACA_BROKER_LIVE_API_KEY=
PUBLIC_ALPACA_BROKER_LIVE_API_SECRET=
PUBLIC_ALPACA_BROKER_LIVE_BASE_URL=https://broker-api.alpaca.markets
PUBLIC_ALPACA_DATA_LIVE_BASE_URL=https://data.alpaca.markets
PUBLIC_ALPACA_TRADING_LIVE_BASE_URL=https://api.alpaca.markets

PUBLIC_APP_URL=https://your-domain.pages.dev
NODE_ENV=production
```

### Optional (for instant funding when configured)
```
PUBLIC_ALPACA_FIRM_SWEEP_ACCOUNT_SANDBOX=your_sweep_account_id
```

## Build Configuration

In Cloudflare Pages settings:

**Build command:**
```bash
npm run build
```

**Build output directory:**
```
dist
```

**Root directory:**
```
/
```

**Node version:**
```
22
```

## Branch Configuration

- **Production branch:** `main` or `master`
- **Preview branch:** `kiro` (or any other branch)

## Deployment Steps

1. **Add Environment Variables** (see above)
2. **Commit and push** your code to the branch
3. **Cloudflare will automatically build and deploy**

## Troubleshooting

### Build fails with "Missing Supabase environment variables"
- Make sure you've added all environment variables in Cloudflare dashboard
- Check that variable names match exactly (case-sensitive)
- Redeploy after adding variables

### Build fails with package-lock.json errors
- Run `npm install` locally
- Commit the updated `package-lock.json`
- Push to your branch

### Static site doesn't connect to Supabase
- Verify `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are set
- Check browser console for errors
- Ensure variables are set for the correct environment (Production/Preview)

## Post-Deployment Checklist

- [ ] Site loads successfully
- [ ] Can sign in/sign up
- [ ] Can view dashboard
- [ ] Trading functionality works
- [ ] Market data loads
- [ ] Check browser console for errors

## Custom Domain Setup

1. Go to **Cloudflare Pages → Your Project → Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `leadtrade.app`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning (usually < 5 minutes)

## Performance Optimization

Cloudflare Pages automatically provides:
- ✅ Global CDN distribution
- ✅ Automatic HTTPS
- ✅ HTTP/2 and HTTP/3
- ✅ Brotli compression
- ✅ Smart caching
- ✅ DDoS protection

## Monitoring

View deployment logs:
1. Go to **Cloudflare Pages → Your Project**
2. Click on a deployment
3. View build logs and deployment status

## Rollback

To rollback to a previous deployment:
1. Go to **Cloudflare Pages → Your Project → Deployments**
2. Find the working deployment
3. Click **...** → **Rollback to this deployment**
