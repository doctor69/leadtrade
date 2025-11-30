#!/bin/bash

# Deployment Verification Script
# Run this after building to ensure the deployment is ready

echo "🔍 Verifying deployment build..."
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
  echo "❌ Error: dist directory not found. Run 'npm run build' first."
  exit 1
fi

echo "✅ dist directory exists"

# Check if API directory was removed
if [ -d "dist/api" ]; then
  echo "❌ Error: dist/api directory should not exist (API routes handled by Supabase)"
  exit 1
fi

echo "✅ No API routes in static build"

# Check if essential files exist
REQUIRED_FILES=(
  "dist/index.html"
  "dist/404.html"
  "dist/manifest.json"
  "dist/sw.js"
  "dist/dashboard/index.html"
  "dist/trade/index.html"
  "dist/signin/index.html"
  "dist/signup/index.html"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Error: Required file missing: $file"
    exit 1
  fi
done

echo "✅ All required files present"

# Check if assets directory exists and has files
if [ ! -d "dist/assets" ] || [ -z "$(ls -A dist/assets)" ]; then
  echo "❌ Error: dist/assets directory is missing or empty"
  exit 1
fi

echo "✅ Assets directory populated"

# Count total files
TOTAL_FILES=$(find dist -type f | wc -l | tr -d ' ')
echo ""
echo "📊 Build Statistics:"
echo "   Total files: $TOTAL_FILES"
echo "   Build size: $(du -sh dist | cut -f1)"
echo ""

# Check Netlify configuration
if [ ! -f "netlify.toml" ]; then
  echo "⚠️  Warning: netlify.toml not found"
else
  echo "✅ netlify.toml present"
  
  # Verify API redirect is configured
  if grep -q "from = \"/api/\*\"" netlify.toml; then
    echo "✅ API redirect configured"
  else
    echo "❌ Error: API redirect not found in netlify.toml"
    exit 1
  fi
fi

echo ""
echo "✅ Deployment verification complete!"
echo ""
echo "📦 Ready to deploy to Netlify"
echo ""
echo "Next steps:"
echo "1. Push to your Git repository"
echo "2. Netlify will auto-deploy"
echo "3. Clear browser cache after deployment"
echo "4. Test in production"
