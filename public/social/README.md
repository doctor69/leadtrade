# Social Media Preview Images

This directory contains Open Graph (OG) images and social media preview assets for LEADTRADE.

## Current Images

- `leadtrade-preview.png` - Main OG image (1200x630px) for social media sharing
- `og-image-generator.html` - HTML template to generate new OG images
- Various SVG thumbnails for different pages

## Generating a New OG Image

### Method 1: Using the HTML Generator

1. Open `og-image-generator.html` in your browser
2. Take a screenshot at exactly 1200x630px resolution
3. Save as `leadtrade-preview.png`

### Method 2: Using Online Tools

Use one of these tools to create a 1200x630px image:

- [Canva](https://www.canva.com/) - Use "Facebook Post" template (1200x630)
- [Figma](https://www.figma.com/) - Create a 1200x630 frame
- [Screely](https://www.screely.com/) - Screenshot tool with custom dimensions

### Method 3: Using Browser DevTools

1. Open `og-image-generator.html` in Chrome
2. Open DevTools (F12)
3. Click the device toolbar icon (Ctrl+Shift+M)
4. Set dimensions to 1200x630
5. Take screenshot: DevTools → ⋮ → Capture screenshot

## Image Requirements

### Open Graph (Facebook, LinkedIn, WhatsApp)
- **Size**: 1200 x 630 pixels
- **Format**: PNG or JPG
- **Max file size**: 8 MB (recommended < 300 KB)
- **Aspect ratio**: 1.91:1

### Twitter Card
- **Size**: 1200 x 630 pixels (large card)
- **Format**: PNG, JPG, or WebP
- **Max file size**: 5 MB
- **Aspect ratio**: 1.91:1 or 2:1

### Discord / Slack
- **Size**: 1200 x 630 pixels
- **Format**: PNG or JPG
- **Supports**: Animated GIFs

## Testing Your OG Image

### Online Validators

1. **Facebook Sharing Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Paste: https://leadtrade.app
   - Click "Scrape Again" to refresh cache

2. **Twitter Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Paste: https://leadtrade.app
   - Preview how it looks on Twitter

3. **LinkedIn Post Inspector**
   - URL: https://www.linkedin.com/post-inspector/
   - Paste: https://leadtrade.app
   - Clear cache if needed

4. **Open Graph Check**
   - URL: https://www.opengraph.xyz/
   - Paste: https://leadtrade.app
   - See preview across multiple platforms

### Local Testing

```bash
# Serve locally to test
npx serve public

# Then visit:
# http://localhost:3000/social/og-image-generator.html
```

## Design Guidelines

### Brand Colors
- Primary Blue: `#3b82f6`
- Primary Pink: `#ec4899`
- Dark Background: `#0f172a`
- Light Text: `#f1f5f9`

### Typography
- Headings: 900 weight, tight letter-spacing
- Body: 500-600 weight
- Use system fonts for fast loading

### Content
- **Title**: Short, punchy (max 60 characters)
- **Description**: Clear value proposition (max 150 characters)
- **Logo**: Always include LEADTRADE branding
- **URL**: Show leadtrade.app for credibility

### Best Practices
- High contrast for readability
- Avoid small text (min 24px)
- Include visual hierarchy
- Use gradients sparingly
- Test on mobile preview

## Updating the OG Image

After creating a new image:

1. Save as `leadtrade-preview.png` (1200x630px)
2. Optimize the image:
   ```bash
   # Using ImageOptim (Mac)
   # Or online: https://tinypng.com/
   ```
3. Replace the file in `public/social/`
4. Clear social media caches (see Testing section)
5. Commit and deploy

## Page-Specific Images

You can create custom OG images for specific pages:

```astro
---
// In your .astro page
import Layout from '@/layouts/Layout.astro';
---

<Layout
  title="Dashboard - LEADTRADE"
  description="View your portfolio and trading activity"
  image="/social/dashboard-thumbnail.svg"
>
  <!-- Page content -->
</Layout>
```

## Troubleshooting

### Image Not Showing
- Check file size (< 8 MB)
- Verify absolute URL (https://leadtrade.app/social/...)
- Clear social media cache
- Check image dimensions (1200x630)

### Old Image Cached
- Use Facebook Debugger to scrape again
- Add query parameter: `?v=2` to image URL
- Wait 24-48 hours for natural cache expiry

### Image Looks Blurry
- Ensure 1200x630 resolution
- Use PNG for graphics, JPG for photos
- Avoid upscaling smaller images
- Export at 2x resolution if possible

## Resources

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Guide](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Facebook Sharing Best Practices](https://developers.facebook.com/docs/sharing/best-practices)
- [LinkedIn Post Inspector](https://www.linkedin.com/help/linkedin/answer/a521928)
