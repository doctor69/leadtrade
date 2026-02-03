#!/bin/bash

# Test script for alpaca-events edge function
# This will help verify if the function is deployed and responding

echo "Testing Alpaca Events Edge Function..."
echo "======================================="
echo ""

# Get Supabase URL from .env or prompt
if [ -f .env ]; then
    source .env
fi

if [ -z "$PUBLIC_SUPABASE_URL" ]; then
    echo "Error: PUBLIC_SUPABASE_URL not found in .env"
    echo "Please set it or provide it as an argument"
    exit 1
fi

# Test OPTIONS request (CORS preflight)
echo "1. Testing CORS preflight (OPTIONS)..."
curl -X OPTIONS \
  "${PUBLIC_SUPABASE_URL}/functions/v1/alpaca-events/trades" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -v 2>&1 | grep -E "(HTTP|Access-Control)"

echo ""
echo ""

# Test GET request without auth (should return 401)
echo "2. Testing GET without auth (should return 401)..."
curl -X GET \
  "${PUBLIC_SUPABASE_URL}/functions/v1/alpaca-events/trades" \
  -H "Accept: text/event-stream" \
  -v 2>&1 | grep -E "(HTTP|error)"

echo ""
echo ""

# Check if function is listed
echo "3. Checking if function is deployed..."
echo "Run: supabase functions list"
echo ""

echo "======================================="
echo "If you see 503 errors, the function is not deployed."
echo "Deploy with: supabase functions deploy alpaca-events"
echo ""
echo "If you see 401 errors, the function is deployed but needs auth."
echo "This is expected and correct behavior."
