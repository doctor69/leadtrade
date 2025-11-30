#!/bin/bash

# Script to remove deprecated Edge Functions from Supabase
# Run this script to clean up the remote Supabase project

PROJECT_REF="bfbqlzpbkivyrnjkvqgl"

echo "🧹 Starting Supabase Edge Functions cleanup..."
echo ""

# Array of deprecated functions to remove
DEPRECATED_FUNCTIONS=(
    # Deprecated Signup Functions
    "signup"
    "signup-with-alpaca"
    "signup-with-alpaca-v2"
    "signup-validation-enhanced"
    
    # Debug/Test Functions
    "debug-profile"
    "debug-signup"
    "test-cors"
    "cleanup-test-data"
    
    # Legacy Market Data Functions
    "market-assets"
    "market-bars"
    "market-quotes"
    
    # Duplicate Funding Function
    "alpaca-funding"
    
    # User Management Utilities
    "repair-profile"
    "restore-profile"
    "rollback-user"
    "setup-user-profile"
    "fix-securities-table"
    
    # Test Functions (if they exist)
    "test-env"
    "test-simple"
)

echo "📋 Functions to be removed:"
for func in "${DEPRECATED_FUNCTIONS[@]}"; do
    echo "  - $func"
done
echo ""

read -p "⚠️  Are you sure you want to delete these ${#DEPRECATED_FUNCTIONS[@]} functions? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

echo ""
echo "🗑️  Deleting deprecated functions..."
echo ""

# Counter for tracking
SUCCESS_COUNT=0
FAIL_COUNT=0
NOT_FOUND_COUNT=0

# Delete each function
for func in "${DEPRECATED_FUNCTIONS[@]}"; do
    echo "Deleting: $func"
    
    # Try to delete the function
    OUTPUT=$(npx supabase functions delete "$func" --project-ref "$PROJECT_REF" 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "  ✅ Deleted successfully"
        ((SUCCESS_COUNT++))
    elif echo "$OUTPUT" | grep -q "not found\|does not exist"; then
        echo "  ⚠️  Not found (already deleted)"
        ((NOT_FOUND_COUNT++))
    else
        echo "  ❌ Failed to delete"
        echo "  Error: $OUTPUT"
        ((FAIL_COUNT++))
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Cleanup Summary:"
echo "  ✅ Successfully deleted: $SUCCESS_COUNT"
echo "  ⚠️  Not found: $NOT_FOUND_COUNT"
echo "  ❌ Failed: $FAIL_COUNT"
echo "  📝 Total processed: ${#DEPRECATED_FUNCTIONS[@]}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✨ Cleanup completed successfully!"
else
    echo "⚠️  Cleanup completed with some failures. Please review the errors above."
fi
