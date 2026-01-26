# Leaderboard Implementation Summary

## What Was Created

### 1. Database Migration (NOT YET APPLIED)
**File:** `supabase/migrations/20250126_leaderboard_stats.sql`

**What it does:**
- ✅ Creates NEW table `leaderboard_stats` to store calculated performance metrics
- ✅ Adds helper functions for leaderboard queries
- ✅ **DOES NOT delete or modify any existing data**
- ✅ **DOES NOT touch profiles, alpaca_accounts, or copy_trading_subscriptions tables**

**Safety:** 100% safe - only adds new functionality, no data loss risk

### 2. Edge Functions (DEPLOYED)
- ✅ `get-leaderboard` - Fetches leaderboard data with privacy controls
- ✅ `update-leaderboard-stats` - Calculates and updates user performance stats

### 3. Frontend Updates (COMPLETED)
- ✅ Added `getLeaderboard()` method to apiService
- ✅ Added `updateLeaderboardStats()` method to apiService
- ✅ Leaderboard component already exists and will work once migration is applied

## How It Works

### Privacy Controls
1. **Only users with `share_trades = true` appear on leaderboard**
2. **Portfolio amounts respect `show_asset_amounts` setting:**
   - If `true`: Shows actual dollar amounts
   - If `false`: Shows only percentages, hides dollar values

### Performance Calculation
The `update-leaderboard-stats` function:
1. Fetches account data from Alpaca API
2. Calculates:
   - Total return ($ and %)
   - Win rate
   - Trade count
   - Average hold time
   - Risk level
   - Trading style
3. Stores in `leaderboard_stats` table
4. Respects privacy settings when displaying

### Copy Trading Logic
- Followers can see leader performance metrics
- Allocation percentages are tracked in `copy_trading_subscriptions`
- Trades are copied proportionally based on:
  - Leader's position size as % of their portfolio
  - Follower's allocation % to that leader
  - Follower's available capital

## Next Steps

### To Enable Leaderboard:

1. **Apply the migration** (when ready):
   ```bash
   cd supabase
   npx supabase db push
   ```

2. **Users must enable sharing** in Settings:
   - Toggle "Share my trades publicly"
   - Optionally toggle "Show asset amounts"

3. **Update stats** (can be called manually or on schedule):
   - User calls `apiService.updateLeaderboardStats()`
   - Or set up a cron job to update all users periodically

4. **View leaderboard:**
   - Navigate to `/leaderboard` page
   - See ranked traders based on performance

## Testing Checklist

- [ ] Apply migration: `npx supabase db push`
- [ ] Enable "Share trades" in your profile settings
- [ ] Call `apiService.updateLeaderboardStats()` to calculate your stats
- [ ] Visit `/leaderboard` to see yourself ranked
- [ ] Test privacy: disable "Show asset amounts" and verify $ amounts are hidden
- [ ] Test with another user to verify leaderboard ranking

## API Endpoints

### Get Leaderboard
```typescript
const result = await apiService.getLeaderboard({
  timeframe: 'weekly', // 'daily' | 'weekly' | 'monthly' | 'all'
  limit: 50,
  sort_by: 'return' // 'return' | 'win_rate' | 'trades' | 'followers'
});
```

### Update Your Stats
```typescript
const result = await apiService.updateLeaderboardStats();
```

## Database Schema

### leaderboard_stats Table
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- portfolio_value: DECIMAL
- total_return: DECIMAL
- total_return_percent: DECIMAL
- trades_count: INTEGER
- winning_trades: INTEGER
- losing_trades: INTEGER
- win_rate: DECIMAL
- avg_hold_time_hours: DECIMAL
- risk_level: TEXT ('low' | 'medium' | 'high')
- trading_style: TEXT ('conservative' | 'moderate' | 'active')
- followers_count: INTEGER
- last_calculated_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Important Notes

1. **No data loss risk** - Migration only adds new table
2. **Privacy first** - Users control what's shared
3. **Real-time data** - Stats calculated from Alpaca API
4. **Opt-in system** - Users must enable sharing to appear
5. **Percentage always shown** - Dollar amounts optional based on privacy setting
