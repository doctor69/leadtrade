# Edge Functions Deployment Guide

This guide explains how to clean up deprecated Edge Functions and deploy the production functions to your Supabase project.

## Overview

After the API cleanup (Phase 17), we have:
- **17 deprecated functions** to remove from Supabase
- **45 production functions** to deploy/update

## Prerequisites

1. **Supabase CLI** installed (you have v2.40.7)
2. **Logged in** to Supabase CLI
3. **Project linked** (bfbqlzpbkivyrnjkvqgl)
4. **Environment variables** configured in Supabase dashboard

## Quick Start (Recommended)

Run the combined cleanup and deployment script:

```bash
./scripts/cleanup-and-deploy.sh
```

This script will:
1. Remove all 17 deprecated functions from Supabase
2. Deploy all 45 production functions
3. Show a summary of operations

**Expected time**: 5-10 minutes

## Step-by-Step Approach

If you prefer to run cleanup and deployment separately:

### Step 1: Remove Deprecated Functions

```bash
./scripts/cleanup-supabase-functions.sh
```

This removes:
- 4 deprecated signup functions
- 4 debug/test functions
- 3 legacy market data functions
- 1 duplicate funding function
- 5 user management utilities

### Step 2: Deploy Production Functions

```bash
./scripts/deploy-production-functions.sh
```

This deploys all 45 production functions to ensure they're up-to-date.

## Manual Deployment

If you prefer manual control, you can deploy specific functions:

```bash
# Deploy a single function
npx supabase functions deploy <function-name> --project-ref bfbqlzpbkivyrnjkvqgl --no-verify-jwt

# Example: Deploy streamlined-signup
npx supabase functions deploy streamlined-signup --project-ref bfbqlzpbkivyrnjkvqgl --no-verify-jwt
```

## Verification

After deployment, verify the functions:

```bash
# List all deployed functions
npx supabase functions list --project-ref bfbqlzpbkivyrnjkvqgl

# Should show 45 production functions
```

## Environment Variables

Ensure these environment variables are set in your Supabase dashboard:

### Required for Edge Functions

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET
PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL
PUBLIC_ALPACA_DATA_API_KEY
PUBLIC_ALPACA_DATA_API_SECRET
PUBLIC_ALPACA_DATA_BASE_URL
```

### Setting Environment Variables

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (Lead Trade)
3. Navigate to **Settings** → **Edge Functions**
4. Add/update environment variables

## Troubleshooting

### Function Deployment Fails

**Error**: "Failed to deploy function"

**Solution**: 
1. Check that the function exists locally in `supabase/functions/`
2. Verify the function has an `index.ts` file
3. Check for syntax errors in the function code

### Authentication Errors

**Error**: "Authentication failed"

**Solution**:
```bash
# Re-login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref bfbqlzpbkivyrnjkvqgl
```

### Function Not Found During Cleanup

**Warning**: "Function not found"

**Solution**: This is normal if the function was already deleted. The script will continue.

### Deployment Takes Too Long

**Issue**: Deployment seems stuck

**Solution**:
1. Wait at least 2-3 minutes per function
2. Check your internet connection
3. Try deploying functions individually

## Post-Deployment Checklist

After successful deployment:

- [ ] Verify function count: `npx supabase functions list --project-ref bfbqlzpbkivyrnjkvqgl | wc -l` (should be ~45)
- [ ] Test critical functions:
  - [ ] `streamlined-signup` - Account creation
  - [ ] `auth` - Authentication
  - [ ] `alpaca-orders` - Order placement
  - [ ] `alpaca-market-data-enhanced` - Market data
- [ ] Check Supabase logs for errors
- [ ] Update frontend if needed (no changes required for this cleanup)

## Production Functions List

### Core Account Management (7)
- alpaca-account
- alpaca-account-activities
- alpaca-ach-relationships
- alpaca-bank-relationships
- alpaca-pdt-removal
- alpaca-trading-config
- create-alpaca-account

### Document & Compliance (3)
- alpaca-documents
- alpaca-kyc-cip
- alpaca-oauth

### Funding & Transfers (4)
- alpaca-funding-enhanced
- alpaca-funding-wallets
- alpaca-instant-funding
- alpaca-transfers

### Trading Operations (11)
- alpaca-orders
- alpaca-positions
- alpaca-portfolio-history
- alpaca-advanced-orders
- alpaca-order-executions
- cancel-order
- get-order
- modify-order
- alpaca-risk-management
- alpaca-rebalancing
- alpaca-reports

### Options Trading (4)
- alpaca-options-contracts
- alpaca-options-exercise
- alpaca-options-orders
- alpaca-options-positions

### Market Data (6)
- alpaca-market-data-enhanced
- alpaca-assets
- alpaca-assets-search
- alpaca-securities
- alpaca-security
- market-websocket

### Corporate Actions & Events (3)
- alpaca-corporate-actions
- alpaca-events
- alpaca-journals

### Market Information (3)
- alpaca-calendar
- alpaca-clock
- alpaca-broker-status

### Watchlists (1)
- alpaca-watchlists

### Authentication & User (3)
- auth
- streamlined-signup
- initialize-user-funding

### Copy Trading (1)
- copy-trading-subscriptions

## Rollback Plan

If something goes wrong, you can redeploy from the previous state:

```bash
# Redeploy all functions from local code
./scripts/deploy-production-functions.sh
```

The local code in `supabase/functions/` is the source of truth.

## Support

If you encounter issues:

1. Check Supabase logs: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl/logs
2. Review function logs in Supabase Dashboard
3. Check the `API_CLEANUP_SUMMARY.md` for details on what was removed
4. Verify environment variables are set correctly

## Next Steps

After successful deployment:

1. Monitor function performance in Supabase Dashboard
2. Check error rates and response times
3. Test critical user flows (signup, trading, market data)
4. Update API documentation if needed
5. Communicate changes to team members

---

**Last Updated**: January 2025  
**Version**: v1.5.3  
**Project**: LeadTrade - Advanced Trading Platform
