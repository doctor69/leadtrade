#!/bin/bash

# Script to manually trigger leaderboard stats update for a user
# Usage: ./trigger-leaderboard-update.sh YOUR_JWT_TOKEN

if [ -z "$1" ]; then
  echo "Error: JWT token required"
  echo "Usage: ./trigger-leaderboard-update.sh YOUR_JWT_TOKEN"
  echo ""
  echo "To get your JWT token:"
  echo "1. Open browser DevTools (F12)"
  echo "2. Go to Application/Storage > Local Storage"
  echo "3. Find 'supabase.auth.token' and copy the access_token value"
  exit 1
fi

JWT_TOKEN="$1"
SUPABASE_URL="https://bfbqlzpbkivyrnjkvqgl.supabase.co"

echo "Triggering leaderboard stats update..."
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/update-leaderboard-stats" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

if [ "$http_code" = "200" ]; then
  echo ""
  echo "✅ Success! Leaderboard stats updated."
else
  echo ""
  echo "❌ Failed to update stats. Check the error message above."
fi
