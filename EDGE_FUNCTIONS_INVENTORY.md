# Edge Functions Inventory

## Production Functions (45 Total)

### Core Account Management (7)
1. `alpaca-account` - Account CRUD operations
2. `alpaca-account-activities` - Account activity history
3. `alpaca-ach-relationships` - ACH relationship management
4. `alpaca-bank-relationships` - Bank account linking
5. `alpaca-pdt-removal` - Pattern Day Trader removal
6. `alpaca-trading-config` - Trading configuration
7. `create-alpaca-account` - Direct account creation

### Document & Compliance (3)
8. `alpaca-documents` - Document upload/download
9. `alpaca-kyc-cip` - KYC/CIP verification
10. `alpaca-oauth` - OAuth client management

### Funding & Transfers (4)
11. `alpaca-funding-enhanced` - Funding operations with history
12. `alpaca-funding-wallets` - Multi-currency wallets
13. `alpaca-instant-funding` - JIT funding
14. `alpaca-transfers` - Transfer operations

### Trading Operations (11)
15. `alpaca-orders` - Order management
16. `alpaca-positions` - Position tracking
17. `alpaca-portfolio-history` - Portfolio history
18. `alpaca-advanced-orders` - Advanced order types
19. `alpaca-order-executions` - Execution details
20. `cancel-order` - Order cancellation
21. `get-order` - Order retrieval
22. `modify-order` - Order modification
23. `alpaca-risk-management` - Risk controls
24. `alpaca-rebalancing` - Portfolio rebalancing
25. `alpaca-reports` - Reporting API

### Options Trading (4)
26. `alpaca-options-contracts` - Options contract lookup
27. `alpaca-options-exercise` - Options exercise
28. `alpaca-options-orders` - Options order management
29. `alpaca-options-positions` - Options position tracking

### Market Data (6)
30. `alpaca-market-data-enhanced` - Unified market data
31. `alpaca-assets` - Asset information
32. `alpaca-assets-search` - Asset search
33. `alpaca-securities` - Securities data
34. `alpaca-security` - Individual security lookup
35. `market-websocket` - WebSocket market data

### Corporate Actions & Events (3)
36. `alpaca-corporate-actions` - Corporate action announcements
37. `alpaca-events` - SSE event streaming
38. `alpaca-journals` - Journal operations

### Market Information (3)
39. `alpaca-calendar` - Market calendar
40. `alpaca-clock` - Market clock/status
41. `alpaca-broker-status` - Broker status

### Watchlists (1)
42. `alpaca-watchlists` - Watchlist management

### Authentication & User (3)
43. `auth` - Authentication operations
44. `streamlined-signup` - Production signup
45. `initialize-user-funding` - Initial funding setup

### Copy Trading (1)
46. `copy-trading-subscriptions` - Copy trading management

---

## Shared Utilities (1)
- `_shared/` - Shared utilities and comprehensive Alpaca client

---

## Removed Functions (17 Total)

### Deprecated Signup (4)
- ❌ `signup` - Legacy signup
- ❌ `signup-with-alpaca` - V1 signup
- ❌ `signup-with-alpaca-v2` - V2 signup
- ❌ `signup-validation-enhanced` - Validation only

### Debug/Test (4)
- ❌ `debug-profile` - Profile debugging
- ❌ `debug-signup` - Signup debugging
- ❌ `test-cors` - CORS testing
- ❌ `cleanup-test-data` - Test data cleanup

### Legacy Market Data (3)
- ❌ `market-assets` - Legacy asset lookup
- ❌ `market-bars` - Legacy bar data
- ❌ `market-quotes` - Legacy quote retrieval

### Duplicate Funding (1)
- ❌ `alpaca-funding` - Basic funding

### User Management Utilities (5)
- ❌ `repair-profile` - Profile repair
- ❌ `restore-profile` - Profile restoration
- ❌ `rollback-user` - User rollback
- ❌ `setup-user-profile` - Profile setup
- ❌ `fix-securities-table` - Securities fix

---

## Summary

**Total Production Functions**: 45  
**Total Removed Functions**: 17  
**Cleanup Date**: January 2025  
**Breaking Changes**: None (zero frontend references)

All production functions are documented, tested, and actively used in the application.
