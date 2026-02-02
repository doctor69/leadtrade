#!/bin/bash

# Script to delete unused Edge Functions from Supabase
# Run this to clean up functions that have been removed from the codebase

PROJECT_REF="bfbqlzpbkivyrnjkvqgl"

echo "🗑️  Deleting unused Edge Functions from Supabase..."
echo ""

# List of functions to delete
FUNCTIONS_TO_DELETE=(
    "alpaca-funding-enhanced"
    "alpaca-options-orders"
    "alpaca-options-positions"
    "alpaca-portfolio-history"
    "alpaca-security"
    "alpaca-trading-config"
    "alpaca-watchlists"
    "auth"
    "cancel-order"
    "create-alpaca-account"
    "get-order"
    "initialize-user-funding"
    "market-websocket"
    "modify-order"
)

echo "📋 Functions to delete:"
for func in "${FUNCTIONS_TO_DELETE[@]}"; do
    echo "  - $func"
done
echo ""

read -p "⚠️  Are you sure you want to delete these ${#FUNCTIONS_TO_DELETE[@]} functions? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deletion cancelled"
    exit 0
fi

echo ""
echo "🔄 Deleting functions..."
echo ""

# Counter for tracking
SUCCESS_COUNT=0
FAIL_COUNT=0
NOT_FOUND_COUNT=0

# Delete each function
for func in "${FUNCTIONS_TO_DELETE[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Deleting: $func"
    echo ""
    
    # Delete the function
    output=$(npx supabase functions delete "$func" --project-ref "$PROJECT_REF" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "  ✅ Deleted successfully"
        ((SUCCESS_COUNT++))
    elif echo "$output" | grep -q "not found\|does not exist"; then
        echo "  ℹ️  Function not found (already deleted)"
        ((NOT_FOUND_COUNT++))
    else
        echo "  ❌ Failed to delete"
        echo "  Error: $output"
        ((FAIL_COUNT++))
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Deletion Summary:"
echo "  ✅ Successfully deleted: $SUCCESS_COUNT"
echo "  ℹ️  Not found (already deleted): $NOT_FOUND_COUNT"
echo "  ❌ Failed: $FAIL_COUNT"
echo "  📝 Total attempted: ${#FUNCTIONS_TO_DELETE[@]}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✨ All functions processed successfully!"
else
    echo "⚠️  Some deletions failed. Please review the errors above."
fi
