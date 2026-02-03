#!/usr/bin/env node

/**
 * Generate OG Image using Puppeteer
 * 
 * This script opens the OG image generator HTML and takes a screenshot
 * at the exact dimensions needed for social media previews.
 * 
 * Usage:
 *   npm install puppeteer
 *   node scripts/generate-og-image.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generateOGImage() {
  console.log('🎨 Generating OG image...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport to exact OG image dimensions
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 2 // 2x for retina displays
    });
    
    // Load the OG image generator HTML
    const htmlPath = path.join(__dirname, '../public/social/og-image-generator.html');
    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'networkidle0'
    });
    
    // Wait for fonts to load
    await page.waitForTimeout(1000);
    
    // Take screenshot of just the card
    const card = await page.$('.og-card');
    const outputPath = path.join(__dirname, '../public/social/leadtrade-preview.png');
    
    await card.screenshot({
      path: outputPath,
      type: 'png'
    });
    
    // Get file size
    const stats = fs.statSync(outputPath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    
    console.log('✅ OG image generated successfully!');
    console.log(`📁 Location: ${outputPath}`);
    console.log(`📊 Size: ${fileSizeKB} KB`);
    
    if (stats.size > 300 * 1024) {
      console.log('⚠️  Warning: Image is larger than 300 KB. Consider optimizing.');
    }
    
  } catch (error) {
    console.error('❌ Error generating OG image:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  generateOGImage()
    .then(() => {
      console.log('\n🎉 Done! You can now test your OG image:');
      console.log('   - Facebook: https://developers.facebook.com/tools/debug/');
      console.log('   - Twitter: https://cards-dev.twitter.com/validator');
      console.log('   - LinkedIn: https://www.linkedin.com/post-inspector/');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to generate OG image:', error);
      process.exit(1);
    });
}

module.exports = { generateOGImage };
