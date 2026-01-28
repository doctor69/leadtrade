# Leaderboard Mirror Column Updates

## Changes Made

### 1. State Management
- Added `userSubscriptions` Map to track which traders the user is mirroring and their allocation percentages
- Added `isEditMode` boolean to differentiate between creating new subscriptions and editing existing ones

### 2. Data Fetching
- Updated `getUserData` useEffect to fetch user's active subscriptions
- Built a Map of `leader_id -> allocation_percentage` for quick lookups
- Stored in `userSubscriptions` state

### 3. Mirror/Edit Logic
- `handleMirrorTrades` now checks if user is already mirroring the trader
- If yes: sets `isEditMode = true` and pre-fills the current allocation
- If no: sets `isEditMode = false` and defaults to 10% allocation

### 4. Save Logic
- `confirmMirrorTrades` now handles both create and update operations
- In edit mode: fetches existing subscription ID and calls `updateSubscription`
- In create mode: validates and calls `createSubscription`
- After success, refreshes the subscriptions map

### 5. UI Updates
- **Mirroring Column**: Shows "Mirroring X%" for traders the user is already following
- **Button Text**: Changes from "Mirror" to "Edit" when already mirroring
- **Button Variant**: Uses "outline" variant for Edit, "default" for Mirror

## How It Works

1. User loads leaderboard → fetches their active subscriptions
2. For each trader row:
   - Checks if `userSubscriptions.has(trader.id)`
   - If yes: shows mirroring percentage and "Edit" button
   - If no: shows "Mirror" button
3. Clicking "Edit" opens modal with current allocation pre-filled
4. Clicking "Mirror" opens modal with default 10% allocation
5. Saving updates the subscription and refreshes the UI

## Visual Changes

**Before:**
```
Trader Name | Return | Portfolio | [View] [Mirror]
```

**After (not mirroring):**
```
Trader Name | Return | Portfolio | [View] [Mirror]
```

**After (mirroring 15%):**
```
Trader Name | Return | Portfolio | Mirroring 15% | [View] [Edit]
```

## Files Modified
- `src/components/trading/Leaderboard.tsx`
- `src/lib/copy-trading-service.ts` (fixed table name from `user_profiles` to `profiles`)
