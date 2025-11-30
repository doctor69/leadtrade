#!/bin/bash

# Combined script to cleanup deprecated functions and deploy production functions
# This is the recommended way to update your Supabase Edge Functions

PROJECT_REF="bfbqlzpbkivyrnjkvqgl"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Supabase Edge Functions - Cleanup & Deployment              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Cleanup deprecated functions
echo "📋 STEP 1: Remove deprecated functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DEPRECATED_FUNCTIONS=(
    "signup"
    "signup-with-alpaca"
    "signup-with-alpaca-v2"
    "signup-validation-enhanced"
    "debug-profile"
    "debug-signup"
    "test-cors"
    "cleanup-test-data"
    "market-assets"
    "market-bars"
    "market-quotes"
    "alpaca-funding"
    "repair-profile"
    "restore-profile"
    "rollback-user"
    "setup-user-profile"
    "fix-securities-table"
    "test-env"
    "test-simple"
)

echo "Functions to be removed (${#DEPRECATED_FUNCTIONS[@]} total):"
for func in "${DEPRECATED_FUNCTIONS[@]}"; do
    echo "  ❌ $func"
done
echo ""

read -p "⚠️  Proceed with cleanup? (yes/no): " confirm_cleanup

if [ "$confirm_cleanup" != "yes" ]; then
    echo "❌ Cleanup cancelled. Exiting..."
    exit 0
fi

echo ""
echo "🗑️  Deleting deprecated functions..."
echo ""

CLEANUP_SUCCESS=0
CLEANUP_NOT_FOUND=0
CLEANUP_FAIL=0

for func in "${DEPRECATED_FUNCTIONS[@]}"; do
    echo -n "  Deleting $func... "
    
    OUTPUT=$(npx supabase functions delete "$func" --project-ref "$PROJECT_REF" 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅"
        ((CLEANUP_SUCCESS++))
    elif echo "$OUTPUT" | grep -q "not found\|does not exist"; then
        echo "⚠️  (not found)"
        ((CLEANUP_NOT_FOUND++))
    else
        echo "❌"
        ((CLEANUP_FAIL++))
    fi
done

echo ""
echo "Cleanup Summary:"
echo "  ✅ Deleted: $CLEANUP_SUCCESS"
echo "  ⚠️  Not found: $CLEANUP_NOT_FOUND"
echo "  ❌ Failed: $CLEANUP_FAIL"
echo ""

# Step 2: Deploy production functions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STEP 2: Deploy production functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FUNCTIONS=($(ls -1 supabase/functions | grep -v "^_"))

echo "Production functions to deploy (${#FUNCTIONS[@]} total):"
for func in "${FUNCTIONS[@]}"; do
    echo "  ✅ $func"
done
echo ""

read -p "🚀 Proceed with deployment? (yes/no): " confirm_deploy

if [ "$confirm_deploy" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "📤 Deploying functions (this may take a few minutes)..."
echo ""

DEPLOY_SUCCESS=0
DEPLOY_FAIL=0

for func in "${FUNCTIONS[@]}"; do
    echo -n "  Deploying $func... "
    
    if npx supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt > /dev/null 2>&1; then
        echo "✅"
        ((DEPLOY_SUCCESS++))
    else
        echo "❌"
        ((DEPLOY_FAIL++))
    fi
done

echo ""
echo "Deployment Summary:"
echo "  ✅ Deployed: $DEPLOY_SUCCESS"
echo "  ❌ Failed: $DEPLOY_FAIL"
echo ""

# Final Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   FINAL SUMMARY                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Cleanup:"
echo "  ✅ Deleted: $CLEANUP_SUCCESS"
echo "  ⚠️  Not found: $CLEANUP_NOT_FOUND"
echo "  ❌ Failed: $CLEANUP_FAIL"
echo ""
echo "Deployment:"
echo "  ✅ Deployed: $DEPLOY_SUCCESS"
echo "  ❌ Failed: $DEPLOY_FAIL"
echo ""

if [ $CLEANUP_FAIL -eq 0 ] && [ $DEPLOY_FAIL -eq 0 ]; then
    echo "✨ All operations completed successfully!"
    echo ""
    echo "📊 Your Supabase project now has $DEPLOY_SUCCESS production functions"
    echo ""
    echo "🔍 Verify with:"
    echo "  npx supabase functions list --project-ref $PROJECT_REF"
else
    echo "⚠️  Some operations failed. Please review the output above."
fi
