# Supabase Edge Functions Cleanup - Ready for Deployment

## Status: ✅ Ready to Deploy

All deprecated Edge Functions have been removed from the local codebase. The Supabase project is ready for cleanup and redeployment.

## What Was Done Locally

### Removed from Local Codebase (17 functions)

✅ **Deprecated Signup Functions (4)**
- `signup/`
- `signup-with-alpaca/`
- `signup-with-alpaca-v2/`
- `signup-validation-enhanced/`

✅ **Debug/Test Functions (4)**
- `debug-profile/`
- `debug-signup/`
- `test-cors/`
- `cleanup-test-data/`

✅ **Legacy Market Data Functions (3)**
- `market-assets/`
- `market-bars/`
- `market-quotes/`

✅ **Duplicate Funding Function (1)**
- `alpaca-funding/`

✅ **User Management Utilities (5)**
- `repair-profile/`
- `restore-profile/`
- `rollback-user/`
- `setup-user-profile/`
- `fix-securities-table/`

### Retained Production Functions (45)

All production-ready Edge Functions remain in `supabase/functions/`:
- Core account management (7 functions)
- Document & compliance (3 functions)
- Funding & transfers (4 functions)
- Trading operations (11 functions)
- Options trading (4 functions)
- Market data (6 functions)
- Corporate actions & events (3 functions)
- Market information (3 functions)
- Watchlists (1 function)
- Authentication & user (3 functions)
- Copy trading (1 function)

## What Needs to Be Done on Supabase

### Current State on Supabase

Your Supabase project currently has **~62 deployed functions**, including the deprecated ones.

### Required Actions

You need to:

1. **Remove deprecated functions** from Supabase (17 functions)
2. **Deploy/update production functions** (45 functions)

## How to Deploy

### Option 1: Automated (Recommended)

Run the combined cleanup and deployment script:

```bash
./scripts/cleanup-and-deploy.sh
```

This will:
- Remove all 17 deprecated functions from Supabase
- Deploy all 45 production functions
- Show a summary of operations
- Take approximately 5-10 minutes

### Option 2: Step-by-Step

If you prefer more control:

```bash
# Step 1: Remove deprecated functions
./scripts/cleanup-supabase-functions.sh

# Step 2: Deploy production functions
./scripts/deploy-production-functions.sh
```

### Option 3: Manual

Deploy specific functions individually:

```bash
npx supabase functions deploy <function-name> --project-ref bfbqlzpbkivyrnjkvqgl --no-verify-jwt
```

## Scripts Created

Three deployment scripts have been created in `scripts/`:

1. **`cleanup-supabase-functions.sh`** - Removes deprecated functions
2. **`deploy-production-functions.sh`** - Deploys all production functions
3. **`cleanup-and-deploy.sh`** - Combined cleanup and deployment (recommended)

All scripts are executable and ready to use.

## Documentation Created

1. **`API_CLEANUP_SUMMARY.md`** - Complete cleanup summary with rationale
2. **`EDGE_FUNCTIONS_INVENTORY.md`** - Categorized list of all functions
3. **`DEPLOYMENT_GUIDE.md`** - Comprehensive deployment instructions
4. **`SUPABASE_CLEANUP_COMPLETE.md`** - This file

## Verification

After deployment, verify with:

```bash
# List all deployed functions
npx supabase functions list --project-ref bfbqlzpbkivyrnjkvqgl

# Count should be 45 production functions
```

## Safety Notes

- ✅ **Zero breaking changes** - No frontend code references deprecated functions
- ✅ **Rollback available** - Can redeploy from local code at any time
- ✅ **Production-ready** - All retained functions are tested and documented
- ✅ **Environment variables** - Already configured in Supabase dashboard

## Next Steps

1. **Review** the deployment guide: `DEPLOYMENT_GUIDE.md`
2. **Run** the cleanup and deployment script: `./scripts/cleanup-and-deploy.sh`
3. **Verify** the deployment was successful
4. **Test** critical functions (signup, trading, market data)
5. **Monitor** function performance in Supabase Dashboard

## Timeline

- **Local cleanup**: ✅ Complete
- **Documentation**: ✅ Complete
- **Scripts**: ✅ Ready
- **Supabase deployment**: ⏳ Pending (run scripts above)

## Support

If you encounter any issues during deployment:

1. Check `DEPLOYMENT_GUIDE.md` for troubleshooting
2. Review Supabase logs in the dashboard
3. Verify environment variables are set correctly
4. Try deploying functions individually if batch deployment fails

---

**Ready to deploy?** Run: `./scripts/cleanup-and-deploy.sh`

**Last Updated**: January 2025  
**Version**: v1.5.3  
**Status**: Ready for Supabase deployment
