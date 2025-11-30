#!/bin/bash

# Script to deploy all production Edge Functions to Supabase
# This ensures all 45 production functions are up-to-date

PROJECT_REF="bfbqlzpbkivyrnjkvqgl"

echo "🚀 Starting deployment of production Edge Functions..."
echo ""

# Get list of all local functions (excluding _shared)
FUNCTIONS=($(ls -1 supabase/functions | grep -v "^_"))

echo "📦 Found ${#FUNCTIONS[@]} functions to deploy:"
for func in "${FUNCTIONS[@]}"; do
    echo "  - $func"
done
echo ""

read -p "🔄 Deploy all ${#FUNCTIONS[@]} functions? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "📤 Deploying functions..."
echo ""

# Counter for tracking
SUCCESS_COUNT=0
FAIL_COUNT=0

# Deploy each function
for func in "${FUNCTIONS[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Deploying: $func"
    echo ""
    
    # Deploy the function
    if npx supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt; then
        echo "  ✅ Deployed successfully"
        ((SUCCESS_COUNT++))
    else
        echo "  ❌ Failed to deploy"
        ((FAIL_COUNT++))
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Deployment Summary:"
echo "  ✅ Successfully deployed: $SUCCESS_COUNT"
echo "  ❌ Failed: $FAIL_COUNT"
echo "  📝 Total functions: ${#FUNCTIONS[@]}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✨ All functions deployed successfully!"
    echo ""
    echo "🔍 Verify deployment with:"
    echo "  npx supabase functions list --project-ref $PROJECT_REF"
else
    echo "⚠️  Deployment completed with some failures. Please review the errors above."
fi
