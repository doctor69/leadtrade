# Apply Leaderboard Migration Manually

Since there are migration conflicts, please apply the leaderboard migration manually through the Supabase Dashboard:

## Steps:

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl/sql/new

2. **Copy the SQL from:**
   - File: `supabase/migrations/20250126_leaderboard_stats.sql`

3. **Paste and Run:**
   - Paste the entire SQL content into the SQL Editor
   - Click "Run" button

4. **Verify:**
   - Check that the `leaderboard_stats` table was created
   - No errors should appear

## What This Migration Does:

✅ Creates `leaderboard_stats` table for storing performance metrics
✅ Adds helper functions for leaderboard queries  
✅ Sets up RLS policies for privacy
✅ **DOES NOT delete or modify any existing data**

## After Migration is Applied:

1. Enable "Share trades" in your Settings page
2. Call `apiService.updateLeaderboardStats()` from browser console to calculate your stats
3. Visit `/leaderboard` to see the leaderboard

## Alternative: Use Supabase CLI (if you want to fix migrations)

If you want to clean up the migration history:

```bash
cd supabase

# Pull current remote schema
npx supabase db pull

# This will create a new migration with current state
# Then you can apply just the leaderboard migration
```

But the manual SQL approach above is simpler and safer for now.
