# Edge Functions Usage Analysis

## USED Functions (Keep)
1. ✅ **alpaca-account** - Used in apiService, account management
2. ✅ **alpaca-ach-relationships** - Used in BankLinking, ACH transfers
3. ✅ **alpaca-bank-relationships** - Used in BankLinking, wire transfers
4. ✅ **alpaca-documents** - Used in document upload/management
5. ✅ **alpaca-instant-funding** - Used in instant funding features
6. ✅ **alpaca-journals** - Used in journal/transfer management
7. ✅ **alpaca-options-contracts** - Used in options trading
8. ✅ **alpaca-options-exercise** - Used in options exercise
9. ✅ **alpaca-orders** - Used in order management (via apiService)
10. ✅ **alpaca-pdt-removal** - Used in PDT management
11. ✅ **alpaca-positions** - Used in position tracking
12. ✅ **alpaca-transfers** - Used in transfer management
13. ✅ **alpaca-assets** - Used in asset search
14. ✅ **alpaca-assets-search** - Used in asset search
15. ✅ **copy-trading-subscriptions** - Used in copy trading
16. ✅ **execute-copy-trades** - Used in copy trading
17. ✅ **get-leaderboard** - Used in leaderboard
18. ✅ **update-leaderboard-stats** - Used in leaderboard
19. ✅ **sync-alpaca-accounts** - Used in auth
20. ✅ **test-accounts-create** - Used in test account creation
21. ✅ **streamlined-signup** - Used in signup
22. ✅ **alpaca-kyc-cip** - Used in KYC verification
23. ✅ **alpaca-securities** - Used in apiService for asset listing
24. ✅ **alpaca-market-data-enhanced** - Used in apiService for quotes/bars
25. ✅ **alpaca-advanced-orders** - Used in alpaca-broker-client for bracket/trailing orders
26. ✅ **alpaca-calendar** - Used in alpaca-broker-client
27. ✅ **alpaca-clock** - Used in alpaca-broker-client
28. ✅ **alpaca-order-executions** - Used in alpaca-broker-client
29. ✅ **alpaca-broker-status** - Used in alpaca-broker-client
30. ✅ **alpaca-risk-management** - Used in alpaca-broker-client
31. ✅ **alpaca-rebalancing** - Used in rebalancing features
32. ✅ **alpaca-reports** - Used in reporting features
33. ✅ **alpaca-oauth** - Used in OAuth features
34. ✅ **alpaca-funding-wallets** - Used in multi-currency wallet features
35. ✅ **alpaca-events** - Used in event streaming
36. ✅ **alpaca-market-quotes** - Used in market-data-fallback
37. ✅ **alpaca-account-activities** - Used for account activity history (Alpaca requirement)
38. ✅ **alpaca-corporate-actions** - Used for corporate actions tracking (Alpaca requirement)

## UNUSED Functions (Can Delete)
1. ❌ **alpaca-trading-config** - API endpoint doesn't exist, removed from UI
2. ❌ **alpaca-options-orders** - Not used anywhere (regular orders endpoint handles options)
3. ❌ **alpaca-options-positions** - Not used anywhere (regular positions endpoint handles options)
4. ❌ **alpaca-portfolio-history** - Not used anywhere
5. ❌ **alpaca-watchlists** - Not used anywhere
6. ❌ **auth** - Not used (using Supabase auth directly)
7. ❌ **cancel-order** - Not used (handled by alpaca-orders)
8. ❌ **create-alpaca-account** - Not used (handled by streamlined-signup)
9. ❌ **get-order** - Not used (handled by alpaca-orders)
10. ❌ **modify-order** - Not used (handled by alpaca-orders)
11. ❌ **initialize-user-funding** - Not used anywhere
12. ❌ **leadtrade-funding-request** - Empty directory, not implemented
13. ❌ **market-websocket** - Not used (using different WebSocket implementation)
14. ❌ **alpaca-security** - Not used (duplicate of alpaca-securities)
15. ❌ **alpaca-funding-enhanced** - Not used (using alpaca-instant-funding instead)

## Summary
- **Total Functions**: 52
- **Used**: 38 (restored alpaca-account-activities and alpaca-corporate-actions)
- **Unused**: 15
