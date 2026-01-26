# Leaderboard Testing Guide

## ✅ Setup Complete

The leaderboard system is now fully implemented and ready to test!

## How to Test

### Step 1: Enable Trade Sharing
1. Go to **Settings** page (`/settings`)
2. Scroll to **Privacy & Sharing** section
3. Toggle **"Share Trades"** to ON
4. Optionally toggle **"Show Portfolio Values"** to ON (to display dollar amounts)

### Step 2: Update Your Stats
1. Still in Settings, you'll see a new **"Leaderboard Stats"** section appear
2. Click the **"Update Stats"** button
3. Wait for the success message

**What happens:**
- Fetches your account data from Alpaca
- Calculates your performance metrics:
  - Total return ($ and %)
  - Win rate
  - Number of trades
  - Average hold time
  - Risk level
  - Trading style
- Stores in the database

### Step 3: View Leaderboard
1. Navigate to **Leaderboard** page (`/leaderboard`)
2. You should see yourself ranked!
3. Try different filters and sorting options

## Privacy Controls

### Share Trades = OFF
- You don't appear on leaderboard
- Others cannot see your trades
- Cannot update stats

### Share Trades = ON, Show Portfolio Values = OFF
- You appear on leaderboard
- Others see your percentage returns
- Dollar amounts are hidden (shows $0)
- Others can still copy your trades

### Share Trades = ON, Show Portfolio Values = ON
- You appear on leaderboard
- Others see your percentage returns
- Others see your actual portfolio value
- Full transparency

## Leaderboard Features

### Sorting Options
- **Total Return** - Highest percentage gains
- **Win Rate** - Best win/loss ratio
- **Trade Count** - Most active traders
- **Followers** - Most followed leaders

### Filters
- **All Traders** - Everyone
- **Profitable** - Only positive returns
- **High Volume** - 20+ trades
- **Consistent** - 60%+ win rate

### Timeframes
- **Daily** - Today's performance
- **Weekly** - Last 7 days
- **Monthly** - Last 30 days
- **All** - All-time performance

## Testing Checklist

- [ ] Enable "Share Trades" in settings
- [ ] Click "Update Stats" button
- [ ] See success message
- [ ] Navigate to `/leaderboard`
- [ ] See yourself in the list
- [ ] Test sorting by different metrics
- [ ] Test filters
- [ ] Disable "Show Portfolio Values" and verify $ amounts are hidden
- [ ] Disable "Share Trades" and verify you disappear from leaderboard

## API Methods Available

### In Browser Console:
```javascript
// Update your stats
await apiService.updateLeaderboardStats()

// Get leaderboard
await apiService.getLeaderboard({
  timeframe: 'weekly',
  limit: 50,
  sort_by: 'return'
})
```

## Troubleshooting

### "Sharing Disabled" Error
- Make sure "Share Trades" is enabled in Settings

### "No Account" Error
- Make sure you have an Alpaca account linked
- Check that you have trading activity

### Stats Show Zero
- You might not have any trades yet
- Try making a test trade first
- Portfolio history might not be available yet (new accounts)

### Not Appearing on Leaderboard
- Make sure you clicked "Update Stats"
- Check that "Share Trades" is enabled
- Refresh the leaderboard page

## Next Steps

Once you've tested:
1. Make some trades to get real performance data
2. Update stats regularly (or set up automated updates)
3. Compete with other traders!
4. Build a following as a leader

## Copy Trading (Coming Next)

The leaderboard is the foundation for copy trading:
- Followers can see leader performance
- Followers can allocate % of portfolio to leaders
- Trades are automatically copied based on allocation
- Privacy controls respected throughout
