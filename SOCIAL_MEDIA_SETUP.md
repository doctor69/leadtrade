# Social Media Preview Setup Guide

## Current Status

✅ **Metadata Configured** - All Open Graph and Twitter Card tags are in place
⏳ **Image Needed** - The OG image file needs to be created (currently 91 bytes)

## What Works Now

The metadata is configured for:
- ✅ Facebook
- ✅ Twitter
- ✅ LinkedIn
- ✅ WhatsApp
- ✅ iMessage
- ✅ Discord
- ✅ Slack
- ✅ Telegram

## What You Need to Do

### Step 1: Generate the OG Image

Choose one of these methods:

#### Method A: Automated (Recommended)
```bash
# Install puppeteer (one-time)
npm install --save-dev puppeteer

# Generate the image
npm run generate:og-image
```

This will create `public/social/leadtrade-preview.png` at 1200x630px.

#### Method B: Manual Screenshot
1. Start your dev server: `npm run dev`
2. Open: `http://localhost:4321/social/og-image-generator.html`
3. Take a screenshot at 1200x630px
4. Save as `public/social/leadtrade-preview.png`

#### Method C: Use Figma/Canva
1. Create a 1200x630px design
2. Use brand colors:
   - Blue: `#3b82f6`
   - Pink: `#ec4899`
   - Dark: `#0f172a`
3. Export as PNG
4. Save as `public/social/leadtrade-preview.png`

### Step 2: Optimize the Image

```bash
# Using ImageOptim (Mac)
# Or online: https://tinypng.com/

# Target: < 300 KB for best compatibility
```

### Step 3: Deploy

```bash
# Commit and push
git add public/social/leadtrade-preview.png
git commit -m "Add OG preview image for social media"
git push

# Deploy to production
# (your deployment process)
```

### Step 4: Test

Test your link on these platforms:

1. **Facebook Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Paste: https://leadtrade.app
   - Click "Scrape Again"

2. **Twitter Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Paste: https://leadtrade.app

3. **LinkedIn Post Inspector**
   - URL: https://www.linkedin.com/post-inspector/
   - Paste: https://leadtrade.app

4. **WhatsApp**
   - Send the link to yourself
   - Preview should appear in 1-2 minutes

5. **iMessage**
   - Send the link to yourself
   - Preview should appear immediately

## Platform-Specific Notes

### WhatsApp
- ✅ Uses Open Graph tags
- ⏱️ Caches for 24-48 hours
- 📏 Best size: < 300 KB
- 🔒 Requires HTTPS (you have this)

### iMessage
- ✅ Uses Open Graph tags (iOS 10+)
- ⚡ Updates quickly
- 📏 Max size: 5 MB
- 🎨 Supports PNG, JPG, GIF

### Facebook
- ✅ Rich preview with image
- 🔄 Cache can be cleared with debugger
- 📏 Recommended: 1200x630px
- 💾 Max: 8 MB

### Twitter
- ✅ Large card with image
- 📏 Recommended: 1200x630px
- 💾 Max: 5 MB
- 🎨 Supports PNG, JPG, WebP

### LinkedIn
- ✅ Professional preview
- 📏 Recommended: 1200x627px
- 💾 Max: 5 MB

## Troubleshooting

### Preview Not Showing

**Problem**: Link doesn't show preview
**Solutions**:
1. Check image exists at: `https://leadtrade.app/social/leadtrade-preview.png`
2. Verify image is < 300 KB
3. Ensure image is 1200x630px
4. Clear platform cache (use debuggers above)

### Old Image Showing

**Problem**: Updated image but old one still shows
**Solutions**:
1. Use Facebook Debugger to scrape again
2. Add version query: `?v=2` to image URL in metadata
3. Wait 24-48 hours for natural cache expiry
4. Clear WhatsApp cache: Settings → Storage → Clear Cache

### Image Looks Blurry

**Problem**: Preview image is low quality
**Solutions**:
1. Ensure source is 1200x630px (not upscaled)
2. Use PNG for graphics (not JPG)
3. Export at 2x resolution if possible
4. Avoid compression artifacts

### WhatsApp Not Working

**Problem**: WhatsApp doesn't show preview
**Solutions**:
1. Verify HTTPS (required)
2. Check image is publicly accessible
3. Ensure image < 300 KB
4. Wait 1-2 minutes after sending
5. Try in a different chat

### iMessage Not Working

**Problem**: iMessage doesn't show preview
**Solutions**:
1. Ensure iOS 10+ or macOS Sierra+
2. Check "Show Link Previews" is enabled
3. Verify image is accessible
4. Try sending in a different conversation

## Current Metadata

Your site already has:
- ✅ Open Graph title, description, image
- ✅ Twitter Card with large image
- ✅ Structured data (JSON-LD) for SEO
- ✅ Platform-specific optimizations
- ✅ Proper image dimensions (1200x630)
- ✅ Absolute URLs for all assets

## What Happens When You Share

### Before Image Creation
```
leadtrade.app
LEADTRADE - Trade Smarter, Follow Leaders
Paper & live trading platform with copy trading...
[No image - just text]
```

### After Image Creation
```
┌─────────────────────────────────────┐
│                                     │
│  [Beautiful gradient card with]    │
│  [LEADTRADE logo and branding]     │
│  [Features and value proposition]  │
│                                     │
└─────────────────────────────────────┘
LEADTRADE - Trade Smarter, Follow Leaders
Paper & live trading platform with copy trading...
leadtrade.app
```

## Next Steps

1. ✅ Metadata is configured (done)
2. ⏳ Generate OG image (you need to do this)
3. ⏳ Deploy image to production
4. ⏳ Test on all platforms
5. ⏳ Share and enjoy rich previews!

## Questions?

- Check `public/social/README.md` for detailed image guidelines
- View `public/social/og-image-generator.html` for design reference
- Test with validators before sharing widely
