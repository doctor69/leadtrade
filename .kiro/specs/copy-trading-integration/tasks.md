# Copy Trading Integration - Tasks

## Phase 1: Core Copy Logic ⏱️ 4-6 hours

### Task 1.1: Database Schema
- ✅ Create `copy_trades` table migration
- ✅ Create `copy_trading_stats` table migration
- ✅ Add indexes for performance
- ✅ Run migrations on dev and prod
- ✅ Verify schema with test data

**Files:**
- `supabase/migrations/YYYYMMDD_copy_trading_tables.sql`

### Task 1.2: Copy Trade Service
- ✅ Create `src/lib/copy-trade-service.ts`
- ✅ Implement position sizing algorithm:
  ```typescript
  leaderTradeValue = leaderShares × price
  followerTradeValue = (leaderTradeValue / leaderPortfolio) × allocation × followerPortfolio
  followerShares = followerTradeValue / price
  ```
- ✅ Add fractional share handling (round down or use fractional)
- ✅ Add validation logic (buying power, market hours, minimum size)
- ✅ Add error handling and logging
- ✅ Write unit tests with multiple scenarios

**Files:**
- `src/lib/copy-trade-service.ts`
- `src/lib/__tests__/copy-trade-service.test.ts`

**Key Functions:**
```typescript
calculateFollowerShares(
  leaderShares: number,
  price: number,
  leaderPortfolio: number,
  allocation: number,
  followerPortfolio: number
): number

validateCopyTrade(
  follower: User,
  tradeValue: number,
  shares: number
): ValidationResult

executeCopyTrade(
  leaderTrade: Trade,
  follower: User,
  allocation: number
): Promise<CopyTradeResult>
```

### Task 1.3: Supabase Edge Function
- ✅ Create `supabase/functions/copy-trading-execute/`
- ✅ Implement copy trade execution logic
- ✅ Add follower lookup query
- ✅ Integrate with Alpaca API
- ✅ Add error handling and retries

**Files:**
- `supabase/functions/copy-trading-execute/index.ts`

## Phase 2: Integration ⏱️ 3-4 hours

### Task 2.1: Trade Execution Hook
- ✅ Modify existing trade execution to trigger copy trades
- ✅ Add leader detection logic
- ✅ Queue copy trades asynchronously
- ✅ Add logging for debugging

**Files:**
- `src/lib/trade-execution-engine.ts` (modify)
- `supabase/functions/alpaca-orders/index.ts` (modify)

### Task 2.2: Edge Case Handling
- ✅ Implement insufficient funds handling
- ✅ Add market hours validation
- ✅ Handle fractional shares
- ✅ Add position limit checks
- ✅ Implement minimum order size logic

**Files:**
- `src/lib/copy-trade-service.ts` (update)

### Task 2.3: Copy Trade Attribution
- ✅ Record copy trade relationships
- ✅ Update leader stats
- ✅ Update follower stats
- ✅ Add performance tracking

**Files:**
- `src/lib/copy-trade-attribution.ts`

## Phase 3: Notifications & UI ⏱️ 4-5 hours

### Task 3.1: Real-time Notifications
- ✅ Add copy trade notification types
- ✅ Implement follower notifications
- ✅ Implement leader notifications
- ✅ Add WebSocket events

**Files:**
- `src/lib/notification-service.ts` (update)
- `src/types/trading.ts` (update)

### Task 3.2: Leader Dashboard
- ✅ Add "Followers" section to dashboard
- ✅ Show copy trade stats
- ✅ Display recent copied trades
- ✅ Add follower list with allocations

**Files:**
- `src/components/trading/LeaderDashboard.tsx`
- `src/components/trading/CopyTradeStats.tsx`

### Task 3.3: Follower Dashboard
- ✅ Add "Copied Trades" section
- ✅ Show trade attribution (which leader)
- ✅ Display copy trade history
- ✅ Add performance by leader

**Files:**
- `src/components/trading/FollowerDashboard.tsx`
- `src/components/trading/CopyTradeHistory.tsx`

### Task 3.4: Trade History Updates
- ✅ Add copy trade indicators to trade list
- ✅ Show leader/follower relationship
- ✅ Add filter for copied trades
- ✅ Update trade detail view

**Files:**
- `src/components/trading/TradeHistory.tsx` (update)

## Phase 4: Testing & Optimization ⏱️ 3-4 hours

### Task 4.1: Unit Tests
- ✅ Test position sizing algorithm
- ✅ Test edge case handling
- ✅ Test validation logic
- ✅ Test error scenarios

**Files:**
- `src/lib/__tests__/copy-trade-service.test.ts`

### Task 4.2: Integration Tests
- ✅ Test end-to-end copy flow
- ✅ Test with multiple followers
- ✅ Test concurrent trades
- ✅ Test failure scenarios

**Files:**
- `src/lib/__tests__/copy-trade-integration.test.ts`

### Task 4.3: Performance Testing
- ✅ Test with 100+ followers
- ✅ Measure execution time
- ✅ Test rate limiting
- ✅ Optimize slow queries

### Task 4.4: Documentation
- ✅ Update README with copy trading docs
- ✅ Add API documentation
- ✅ Create user guide
- ✅ Add troubleshooting guide

**Files:**
- `docs/COPY_TRADING_GUIDE.md`
- `docs/COPY_TRADING_API.md`

## Bonus Tasks (If Time Permits)

### Task B.1: Advanced Features
- ✅ Add copy trade scheduling (delay execution)
- ✅ Implement partial copy (only certain symbols)
- ✅ Add copy trade limits (max per day)
- ✅ Add stop-loss copying

### Task B.2: Analytics
- ✅ Add copy trade analytics dashboard
- ✅ Show success rate by leader
- ✅ Display volume trends
- ✅ Add performance attribution charts

### Task B.3: Admin Tools
- ✅ Add admin panel for copy trades
- ✅ Implement manual copy trade trigger
- ✅ Add copy trade audit log
- ✅ Create debugging tools

## Estimated Timeline

- **Day 1 Morning:** Phase 1 (Core Logic)
- **Day 1 Afternoon:** Phase 2 (Integration)
- **Day 2 Morning:** Phase 3 (Notifications & UI)
- **Day 2 Afternoon:** Phase 4 (Testing)
- **Day 3:** Polish, optimization, and deployment

## Dependencies Checklist

- ✅ Alpaca API credentials configured
- ✅ Supabase Edge Functions deployed
- ✅ Database migrations applied
- ✅ WebSocket service running
- ✅ Notification service configured

## Testing Checklist

- ✅ Unit tests passing
- ✅ Integration tests passing
- ✅ Manual testing completed
- ✅ Edge cases verified
- ✅ Performance acceptable

## Deployment Checklist

- ✅ Database migrations applied to prod
- ✅ Edge functions deployed
- ✅ Environment variables set
- ✅ Feature flag enabled
- ✅ Monitoring configured
- ✅ Documentation updated

---

**Ready to start tomorrow! Let's build this! 🚀**
