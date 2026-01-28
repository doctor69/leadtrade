# Design Document

## Overview

This design document outlines the verification and implementation approach for meeting Alpaca's Limited Live Tech Requirements. The platform has already implemented 45 production Edge Functions covering comprehensive Alpaca Broker API integration. This design focuses on:

1. **Verification**: Confirming existing implementations meet all 12 tech requirements
2. **Gap Analysis**: Identifying any missing functionality
3. **Enhancement**: Adding any required features for tech sign-off
4. **Testing**: Creating comprehensive test scenarios for Alpaca's review

## Architecture

### Current System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Astro + React)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Trading    │  │   Account    │  │   Funding    │      │
│  │  Components  │  │  Management  │  │  Components  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              API Service Layer (apiService.ts)               │
│  • Intelligent caching (30s market data, 5min user data)    │
│  • Authentication checks                                     │
│  • Error handling with fallbacks                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Supabase Edge Functions (45 endpoints)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Account    │  │   Trading    │  │   Funding    │      │
│  │     APIs     │  │     APIs     │  │     APIs     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Alpaca Broker API                         │
│  • Paper Trading (Sandbox)                                   │
│  • Live Trading (Production)                                 │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
User Signup
    │
    ├─► Supabase Auth (create user)
    │       │
    │       ├─► Success
    │       │     │
    │       │     └─► Create Alpaca Account
    │       │             │
    │       │             ├─► Success: Link accounts
    │       │             │
    │       │             └─► Failure: Rollback Supabase user
    │       │
    │       └─► Failure: Return error
    │
    └─► Return result

User Login
    │
    ├─► Supabase Auth (validate credentials)
    │       │
    │       └─► Success: Retrieve Alpaca account ID
    │
    └─► Load user profile with Alpaca data
```

## Components and Interfaces

### 1. User Authentication System

**Existing Implementation:**
- Edge Function: `streamlined-signup` (atomic signup with rollback)
- Frontend: `src/lib/signup-service.ts`
- Database: `user_profiles` table with `alpaca_account_id`

**Design Enhancements:**
- Add comprehensive logging for signup flow
- Create test account creation endpoint for Alpaca consultants
- Add signup status tracking for debugging

**Key Interfaces:**

```typescript
interface SignupRequest {
  email: string;
  password: string;
  given_name: string;
  family_name: string;
  date_of_birth: string;
  tax_id: string;
  phone_number: string;
  street_address: string[];
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface SignupResponse {
  success: boolean;
  userId?: string;
  alpacaAccountId?: string;
  error?: string;
  needsEmailVerification?: boolean;
}
```

### 2. Account Funding System

**Existing Implementation:**
- Edge Functions: `alpaca-ach-relationships`, `alpaca-bank-relationships`, `alpaca-transfers`
- Frontend Components: `ACHTransferForm.tsx`, `WireTransferForm.tsx`, `TransferHistory.tsx`
- Database: `ach_relationships`, `bank_relationships`, `transfers` tables

**Design Enhancements:**
- Add funding verification dashboard for admins
- Create funding test scenarios for Alpaca review
- Add transfer status webhook handling

**Key Interfaces:**

```typescript
interface ACHTransferRequest {
  relationship_id: string;
  amount: number;
  direction: 'INCOMING' | 'OUTGOING';
}

interface WireTransferRequest {
  bank_id: string;
  amount: number;
  direction: 'INCOMING' | 'OUTGOING';
  additional_information: string;
  fee_payment_method: 'user' | 'invoice';
}

interface TransferStatus {
  id: string;
  status: 'queued' | 'pending' | 'sent_to_clearing' | 'approved' | 'canceled' | 'rejected';
  amount: number;
  direction: string;
  created_at: string;
  updated_at: string;
}
```

### 3. Trading System (Buy/Sell Orders)

**Existing Implementation:**
- Edge Functions: `alpaca-orders`, `alpaca-options-orders`
- Frontend Components: `TradeForm.tsx`, `OrderHistory.tsx`
- Database: Order tracking via Alpaca API

**Design Enhancements:**
- Add order validation dashboard
- Create comprehensive order test scenarios
- Add order execution logging for audit trail

**Key Interfaces:**

```typescript
interface OrderRequest {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
}

interface OrderResponse {
  id: string;
  client_order_id: string;
  status: 'new' | 'partially_filled' | 'filled' | 'canceled' | 'rejected';
  filled_qty: number;
  filled_avg_price?: number;
  created_at: string;
}
```

### 4. Position Display System

**Existing Implementation:**
- Edge Functions: `alpaca-positions`, `alpaca-options-positions`
- Frontend Components: `AccountPositions.tsx`, `PortfolioChart.tsx`
- Real-time updates via WebSocket

**Design Enhancements:**
- Add position reconciliation checks
- Create position snapshot for testing
- Add P&L calculation verification

**Key Interfaces:**

```typescript
interface Position {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  side: 'long' | 'short';
}

interface OptionPosition extends Position {
  option_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string;
  underlying_symbol: string;
}
```

### 5. Transaction History System

**Existing Implementation:**
- Edge Functions: `alpaca-orders`, `alpaca-account-activities`
- Frontend Components: `OrderHistory.tsx`, `TransactionHistory.tsx`
- Filtering and pagination support

**Design Enhancements:**
- Add comprehensive activity filtering
- Create transaction export functionality
- Add activity type categorization

**Key Interfaces:**

```typescript
interface Activity {
  id: string;
  activity_type: 'FILL' | 'TRANS' | 'DIV' | 'INT' | 'FEE' | 'JNLC' | 'JNLS';
  date: string;
  net_amount: number;
  symbol?: string;
  qty?: number;
  price?: number;
  description: string;
}

interface ActivityFilter {
  activity_types?: string[];
  date?: string;
  until?: string;
  after?: string;
  direction?: 'asc' | 'desc';
  page_size?: number;
  page_token?: string;
}
```

### 6. Statements and Trade Confirmations

**Existing Implementation:**
- Edge Function: `alpaca-documents`
- Trading Config: `trade_confirm_email` setting
- Document management system

**Design Enhancements:**
- Add statement generation verification
- Create trade confirmation email template
- Add document delivery tracking

**Key Interfaces:**

```typescript
interface TradeConfirmation {
  order_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  filled_avg_price: number;
  commission: number;
  executed_at: string;
  settlement_date: string;
}

interface MonthlyStatement {
  account_id: string;
  period: string; // YYYY-MM
  beginning_balance: number;
  ending_balance: number;
  deposits: number;
  withdrawals: number;
  realized_pl: number;
  unrealized_pl: number;
  document_url: string;
}
```

### 7. Events and Notifications System

**Existing Implementation:**
- Edge Function: `alpaca-events` (SSE streaming)
- Frontend Hook: `useAlpacaEvents.ts`
- WebSocket service for real-time updates

**Design Enhancements:**
- Add event replay capability for testing
- Create event monitoring dashboard
- Add event delivery verification

**Key Interfaces:**

```typescript
interface TradeEvent {
  event: 'fill' | 'partial_fill' | 'canceled' | 'rejected';
  order: OrderResponse;
  timestamp: string;
  execution_id?: string;
}

interface TransferEvent {
  event: 'approved' | 'canceled' | 'rejected';
  transfer: TransferStatus;
  timestamp: string;
}

interface AccountStatusEvent {
  event: 'APPROVED' | 'REJECTED' | 'ACTION_REQUIRED';
  account_id: string;
  status: string;
  reason?: string;
  timestamp: string;
}
```

### 8. Internal Operations Testing

**Existing Implementation:**
- Edge Functions: `alpaca-journals`, `alpaca-instant-funding`, `alpaca-rebalancing`
- Admin interfaces for testing

**Design Enhancements:**
- Create comprehensive test suite for internal operations
- Add operation logging and monitoring
- Create test data generation utilities

**Key Interfaces:**

```typescript
interface JournalRequest {
  entry_type: 'JNLC' | 'JNLS';
  from_account: string;
  to_account: string;
  amount?: number; // for JNLC
  symbol?: string; // for JNLS
  qty?: number; // for JNLS
}

interface InstantFundingRequest {
  account_id: string;
  amount: number;
  ach_relationship_id: string;
}

interface RebalancingRun {
  portfolio_id: string;
  type: 'full_rebalance' | 'target_weight';
  reason?: string;
}
```

### 9. Account Status Monitoring

**Existing Implementation:**
- SSE Events API integration
- Account status tracking in database
- Real-time status updates

**Design Enhancements:**
- Add automated re-submission workflow
- Create status change notification system
- Add compliance status dashboard

**Key Interfaces:**

```typescript
interface AccountStatus {
  account_id: string;
  status: 'SUBMITTED' | 'ACTION_REQUIRED' | 'APPROVED' | 'REJECTED';
  kyc_status: 'pending' | 'approved' | 'rejected';
  documents_required: string[];
  last_updated: string;
}

interface ResubmissionRequest {
  account_id: string;
  document_type: string;
  content: string; // base64
  mime_type: string;
}
```

### 10. Personal Information Updates

**Existing Implementation:**
- Edge Function: `alpaca-account` (PATCH operations)
- Frontend: Account settings page
- Support for contact, identity, disclosures, trusted_contact

**Design Enhancements:**
- Add change history tracking
- Create verification workflow for sensitive changes
- Add audit logging for compliance

**Key Interfaces:**

```typescript
interface ContactUpdate {
  email_address?: string;
  phone_number?: string;
  street_address?: string[];
  city?: string;
  state?: string;
  postal_code?: string;
}

interface IdentityUpdate {
  given_name?: string;
  family_name?: string;
  date_of_birth?: string;
  tax_id?: string;
  country_of_citizenship?: string;
}

interface TrustedContactUpdate {
  given_name: string;
  family_name: string;
  email_address: string;
}
```

### 11. Balance Verification System

**Existing Implementation:**
- Edge Function: `alpaca-account`
- Real-time balance display
- Portfolio value calculation

**Design Enhancements:**
- Add balance reconciliation checks
- Create discrepancy detection system
- Add balance audit logging

**Key Interfaces:**

```typescript
interface AccountBalance {
  cash: number;
  buying_power: number;
  portfolio_value: number;
  equity: number;
  last_equity: number;
  long_market_value: number;
  short_market_value: number;
}

interface BalanceVerification {
  account_id: string;
  local_balance: AccountBalance;
  alpaca_balance: AccountBalance;
  discrepancies: string[];
  verified_at: string;
}
```

## Data Models

### Database Schema Enhancements

```sql
-- Add Limited Live tracking table
CREATE TABLE limited_live_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES user_profiles(id),
  alpaca_account_id TEXT NOT NULL,
  requirement_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  test_data JSONB,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add test account tracking
CREATE TABLE test_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  alpaca_account_id TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL,
  created_for TEXT, -- 'alpaca_consultant' or 'internal_testing'
  funded_amount NUMERIC(10, 2),
  test_scenarios_completed JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add audit log for compliance
CREATE TABLE compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES user_profiles(id),
  action_type TEXT NOT NULL,
  action_details JSONB NOT NULL,
  performed_by TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Error Handling

### Error Categories

1. **Authentication Errors**
   - Invalid credentials
   - Expired session
   - Account not found
   - Alpaca account link failure

2. **Funding Errors**
   - Insufficient funds
   - Invalid bank relationship
   - Transfer limit exceeded
   - ACH relationship not approved

3. **Trading Errors**
   - Insufficient buying power
   - Invalid symbol
   - Market closed
   - Position not found
   - Options approval level insufficient

4. **System Errors**
   - API timeout
   - Network failure
   - Database error
   - External service unavailable

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retry_after?: number;
  };
  timestamp: string;
  request_id: string;
}
```

## Testing Strategy

### 1. Pre-funded Test Account Creation

Create a dedicated endpoint for Alpaca consultants:

```typescript
POST /api/test-accounts/create
{
  email: "devsuccess-test@alpaca.markets",
  password: "provided_by_alpaca",
  initial_funding: 5000.00,
  enable_options: true
}
```

### 2. Comprehensive Test Scenarios

**Scenario 1: Complete User Journey**
1. Sign up new account
2. Link bank account
3. Initiate ACH transfer
4. Wait for funds to clear
5. Place buy order
6. View position
7. Place sell order
8. View transaction history

**Scenario 2: Options Trading**
1. Request options approval
2. Search for option contracts
3. Place option buy order
4. View option position
5. Exercise option (if ITM)
6. Close option position

**Scenario 3: Funding Methods**
1. ACH transfer (incoming)
2. Wire transfer (incoming)
3. Verify balance updates
4. ACH withdrawal (outgoing)
5. Verify balance updates

**Scenario 4: Event Streaming**
1. Connect to SSE endpoint
2. Place order
3. Verify trade event received
4. Initiate transfer
5. Verify transfer event received

**Scenario 5: Account Management**
1. Update contact information
2. Upload document
3. Update trusted contact
4. Verify changes reflected

### 3. Automated Test Suite

Create comprehensive test scripts:

```bash
# Run all Limited Live verification tests
npm run test:limited-live

# Run specific requirement tests
npm run test:limited-live -- --requirement=authentication
npm run test:limited-live -- --requirement=funding
npm run test:limited-live -- --requirement=trading
```

## Security Considerations

1. **API Key Management**
   - Use environment variables for all API keys
   - Separate paper and live credentials
   - Rotate keys regularly

2. **Data Protection**
   - Encrypt sensitive PII in database
   - Use HTTPS for all communications
   - Implement rate limiting

3. **Access Control**
   - Row Level Security (RLS) on all tables
   - User can only access their own data
   - Admin role for internal operations

4. **Audit Trail**
   - Log all account changes
   - Track all financial transactions
   - Monitor API usage

## Performance Optimization

1. **Caching Strategy**
   - Market data: 30 seconds TTL
   - User data: 5 minutes TTL
   - Account balance: 1 minute TTL

2. **Connection Pooling**
   - Reuse Alpaca API connections
   - Implement connection retry logic
   - Handle rate limits gracefully

3. **Real-time Updates**
   - WebSocket for market data
   - SSE for account events
   - Polling fallback for compatibility

## Deployment Considerations

### Environment Configuration

```bash
# Limited Live Environment Variables
PUBLIC_ALPACA_LIVE_BROKER_BASE_URL=https://api.alpaca.markets
PUBLIC_ALPACA_BROKER_LIVE_API_KEY=your_limited_live_key
PUBLIC_ALPACA_BROKER_LIVE_API_SECRET=your_limited_live_secret

# Enable Limited Live mode
PUBLIC_TRADING_MODE=live
PUBLIC_LIMITED_LIVE_ENABLED=true
```

### Monitoring and Alerting

1. **Key Metrics**
   - Signup success rate
   - Order execution time
   - Transfer completion rate
   - API error rate
   - Balance discrepancies

2. **Alerts**
   - Failed signups
   - Order rejections
   - Transfer failures
   - API errors > 5%
   - Balance mismatches

## Documentation Requirements

1. **API Documentation**
   - Complete endpoint reference
   - Request/response examples
   - Error code reference

2. **User Guides**
   - Account setup guide
   - Funding guide
   - Trading guide
   - Options trading guide

3. **Admin Guides**
   - Test account creation
   - Verification checklist
   - Troubleshooting guide

4. **Compliance Documentation**
   - Trade confirmation delivery
   - Statement generation process
   - Audit trail access
   - Data retention policy

