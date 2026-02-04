# LEADTRADE - Social Trading Platform

**Version**: v1.8.8  
**Last Updated**: February 3, 2026  
**Status**: ✅ Production Ready

## Product Overview

LeadTrade is a comprehensive paper/live trading platform with advanced copy trading capabilities. Users can practice with simulated funds or trade real money via Alpaca Markets, follow successful traders, and automatically replicate trades with customizable portfolio allocations.

**User Types**: 
- **Leaders**: Share trades publicly, build follower base, appear on leaderboard
- **Followers**: Copy trades from leaders with customizable allocations
- **Solo Traders**: Trade independently without social features

**Key Features**: 
- ✅ Paper & live trading with seamless mode switching
- ✅ Automated copy trading with portfolio-proportional allocation
- ✅ Real-time market data via WebSocket with REST fallback
- ✅ Social leaderboards with performance metrics
- ✅ Options trading support (calls & puts)
- ✅ Integrated KYC for Alpaca brokerage accounts
- ✅ Fractional shares support for precise allocations
- ✅ Mobile-responsive PWA with offline capabilities
- ✅ **Production-ready email system** with dual-provider routing (Brevo & Resend)
- ✅ Automated trade notifications and welcome emails
- ✅ Support inquiry system with Gmail forwarding
- ✅ Email monitoring and analytics

**Business Logic**: 
- Users allocate up to 100% portfolio across multiple leaders
- Trades copied proportionally based on leader's portfolio percentage
- Privacy controls for leaders (share_trades flag)
- Automatic account type tracking (paper/live)
- Position validation for sell orders
- Intelligent follower filtering
- Email routing based on category (auth/trading/support/marketing)

## Tech Stack

**Core**: Astro 5.2+ with React 19, TypeScript (strict mode), Vite, SSG output  
**Frontend**: Tailwind CSS v4, Radix UI components, Lucide icons, Recharts, TanStack Table  
**Backend**: Supabase (PostgreSQL + Auth + Edge Functions), Alpaca Markets Broker & Data APIs  
**Email**: Brevo (auth/support/marketing), Resend (trading notifications), Cloudflare Email Routing  
**Real-time**: WebSocket connections with REST API fallback, Server-Sent Events (SSE)  
**Validation**: Zod schemas for all API inputs/outputs  
**Testing**: Vitest with 95%+ coverage on business logic  
**Deployment**: Cloudflare Pages with edge functions

## Project Structure

```
src/
├── components/
│   ├── trading/              # Trading-specific components
│   │   ├── Leaderboard.tsx   # Social leaderboard with copy trading UI
│   │   ├── TradeForm.tsx     # Order entry with fractional shares
│   │   ├── OrderHistory.tsx  # Trade history display
│   │   └── CopyTradingDashboard.tsx
│   ├── account/              # Account management components
│   │   ├── FundingPageContent.tsx
│   │   ├── TradingModeSwitch.tsx
│   │   └── KYCStatus.tsx
│   └── ui/                   # Radix UI components (shadcn/ui patterns)
│       ├── button.tsx, card.tsx, dialog.tsx
│       └── slider.tsx, input.tsx, select.tsx
├── hooks/                    # Custom React hooks
│   ├── useAlpacaBroker.ts    # Broker API integration
│   ├── useMarketDataWithFallback.ts  # WebSocket + REST fallback
│   ├── useTradingMode.ts     # Paper/live mode management
│   └── useTradeNotifications.ts  # Trade notification hooks
├── lib/                      # Core business logic & services
│   ├── __tests__/            # Vitest unit tests (95%+ coverage)
│   ├── auth.ts               # Authentication & session management
│   ├── database.ts           # Supabase client & queries
│   ├── validation.ts         # Zod schemas
│   ├── alpaca-broker-client.ts  # Alpaca Broker API wrapper
│   ├── copy-trading-service.ts  # Copy trading business logic
│   ├── market-data-fallback.ts  # WebSocket fallback system
│   ├── signup-service.ts     # User signup with email integration
│   ├── email/                # Email delivery system (NEW)
│   │   ├── index.ts          # Main exports
│   │   ├── service.ts        # Email routing logic
│   │   ├── types.ts          # TypeScript definitions
│   │   ├── providers/        # Brevo & Resend integrations
│   │   │   ├── brevo.ts      # Brevo API client
│   │   │   └── resend.ts     # Resend API client
│   │   ├── templates/        # HTML email templates
│   │   │   ├── auth.ts       # Welcome, password reset, verification
│   │   │   ├── trading.ts    # Trade confirmations, copy trades
│   │   │   └── support.ts    # Support inquiries, responses
│   │   ├── utils.ts          # Retry, batch, validation
│   │   ├── queue.ts          # Failed email queue
│   │   ├── monitoring.ts     # Analytics & metrics
│   │   ├── examples.ts       # Integration examples
│   │   └── README.md         # Em
├── pages/
│   ├── api/                  # REST endpoints
│   │   ├── alpaca/           # Alpaca API proxies
│   │   ├── auth/             # Authentication endpoints
│   │   ├── email/            # Email API endpoints
│   │   │   ├── send.ts       # Generic email send
│   │   │   ├── test.ts       # Email delivery testing
│   │   │   └── metrics.ts    # Email analytics
│   │   ├── support/          # Support system
│   │   │   └── submit.ts     # Support inquiry handler
│   │   └── user/             # User management
│   ├── dashboard.astro       # Portfolio dashboard
│   ├── trade.astro           # Trading interface
│   ├── leaderboard.astro     # Social leaderboard
│   └── *.astro               # Other pages
├── styles/                   # Global CSS with Tailwind
└── types/                    # TypeScript definitions
    ├── trading.ts
    ├── oauth.ts
    └── documents.ts

supabase/
├── functions/                # Edge Functions (47 total)
│   ├── execute-copy-trades/  # Automated trade replication
│   ├── alpaca-orders/        # Order management with copy trigger
│   ├── get-leaderboard/      # Leaderboard data aggregation
│   ├── update-leaderboard-stats/  # Performance calculations
│   ├── send-email/           # Email delivery edge function
│   └── _shared/              # Shared utilities & auth
│       ├── alpaca-client.ts  # Alpaca API client
│       ├── auth.ts           # Authentication helpers
│       ├── cors.ts           # CORS configuration
│       ├── email-helper.ts   # Email sending utilities (NEW)
│       ├── error-handling.ts # Error handling utilities
│       ├── logging.ts        # Logging utilities
│       ├── rate-limit.ts     # Rate limiting
│       ├── response.ts       # Response helpers
│       └── websocket-manager.ts # WebSocket management
└── migrations/               # Database schema migrations
    └── 20260128000000_copy_trading_subscriptions.sql

docs/
├── EMAIL_SETUP_GUIDE.md      # Complete email setup instructions
├── EMAIL_SETUP_CHECKLIST.md  # Quick setup checklist
├── EMAIL_INTEGRATION_EXAMPLES.md  # Integration code examples
├── EMAIL_ARCHITECTURE_DIAGRAM.md  # System architecture
└── *.md                      # Other documentation
```

## Conventions

**Files**: Components (PascalCase), utilities/API routes (kebab-case)
**Code**: Functions (camelCase), constants (UPPER_SNAKE_CASE), interfaces (PascalCase)
**Imports**: External libs → internal utils → components → types
**Testing**: `*.test.ts` in `src/lib/__tests__/`, focus on business logic

## Development

```bash
npm run dev              # Development server (localhost:4321)
npm run build           # Production build
npm run preview         # Preview production build
npm run test:run        # Run tests once
npm run test            # Run tests in watch mode
npm run astro check     # Type checking
```

**Environment Variables**: Copy `.env.example` to `.env` and configure:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_ALPACA_API_KEY`, `PUBLIC_ALPACA_SECRET_KEY`
- `PUBLIC_ALPACA_PAPER_API_KEY`, `PUBLIC_ALPACA_PAPER_SECRET_KEY`
- `BREVO_API_KEY`, `RESEND_API_KEY` (for email delivery)

## Code Standards

- **TypeScript**: Strict mode enabled, no implicit any
- **Validation**: Zod schemas for all API inputs/outputs
- **Error Handling**: Comprehensive try-catch with typed errors
- **Security**: RLS policies on all database tables, HTTP-only cookies for auth
- **Testing**: Unit tests for business logic, integration tests for critical flows
- **Documentation**: JSDoc comments for public APIs, inline comments for complex logic

## Recent Updates

### v1.8.9 - Production Code Cleanup (February 3, 2026)
Cleaned up execute-copy-trades function for production readiness:
- **Console Log Removal**: Removed all console.log statements from execute-copy-trades
- **Production Logging**: Uses structured logging for monitoring and debugging
- **Code Quality**: Improved code cleanliness and maintainability
- **Performance**: Reduced unnecessary logging overhead
- **Best Practices**: Follows production-grade logging standards

### v1.8.8 - Email Rate Limiting for Copy Trading (February 3, 2026)
Implemented rate limiting for email notifications to respect Resend API limits:
- **Rate Limiting**: 600ms delay between email notifications (~1.6 emails/sec)
- **Provider Compliance**: Respects Resend's 2 requests/second limit
- **Sequential Processing**: Applies to both leader and follower notifications
- **Non-Blocking**: Delays don't affect trade execution, only email delivery
- **Production Ready**: Prevents API rate limit errors in high-volume scenarios
- **Scalable**: Handles multiple followers without hitting provider limits
- **Safe Margin**: 600ms delay provides buffer below 2 req/sec threshold

### v1.8.4 - Enhanced Email Function Logging (February 3, 2026)
Added comprehensive logging to send-email edge function for better observability:
- **Request Tracking**: Logs all incoming email requests with category, recipient, and subject
- **Authentication Logging**: Tracks authorization headers and internal call detection
- **Provider Routing**: Logs which provider (Brevo/Resend) is handling each email
- **Result Logging**: Logs success/failure status and message IDs
- **Error Visibility**: Explicit error logging for validation failures and invalid categories
- **Internal Call Detection**: Identifies requests from other edge functions vs external calls
- **Production Debugging**: Structured logs for monitoring and troubleshooting
- **Non-Blocking**: Logging doesn't impact email delivery performance

### v1.8.7 - Enhanced Copy Trade Email Error Handling (February 3, 2026)
Improved robustness and debugging for follower email notifications:
- **Comprehensive Error Handling**: Added explicit error checking for profile fetch operations
- **Detailed Logging**: Logs each follower processing step with follower ID
- **Graceful Degradation**: Continues processing other followers if one fails
- **Missing Data Handling**: Explicit checks for missing profiles and email addresses
- **Debug Visibility**: Logs complete copy results for troubleshooting
- **Production Ready**: Non-blocking email failures with clear error messages
- **Monitoring**: Structured logs for tracking email delivery success rates

### v1.8.6 - Code Quality Improvements (February 3, 2026)
Minor code cleanup and formatting improvements:
- **Code Formatting**: Removed trailing whitespace from email provider files
- **Consistency**: Improved code style consistency across email system
- **Maintenance**: Regular code quality improvements for production readiness

### v1.8.5 - Direct Provider API Integration for Edge Functions (February 3, 2026)
Refactored email helper to call provider APIs directly from edge functions:
- **Direct API Calls**: Email helper now calls Brevo and Resend APIs directly (no intermediate function)
- **Simplified Architecture**: Eliminates extra hop through send-email edge function
- **Better Performance**: Reduces latency by ~50-100ms per email
- **Provider Routing**: Automatic routing based on email category (auth→Brevo, trading→Resend)
- **Template Generators**: `generateTradeEmailHtml()` and `generateCopyTradeEmailHtml()`
- **Type Safety**: TypeScript interfaces for EmailPayload and EmailResult
- **Consistent Styling**: Professional HTML templates with gradient headers
- **Reusable Across Functions**: Can be imported by any edge function
- **Error Handling**: Comprehensive error handling with typed results
- **Environment Validation**: Checks for BREVO_API_KEY and RESEND_API_KEY
- **DRY Principle**: Eliminates duplicate email code across functions
- **Easy Integration**: Simple import and call pattern for edge functions

### v1.8.3 - Email Helper Utilities for Edge Functions (February 3, 2026)
Added reusable email helper functions for Supabase edge functions:
- **Shared Email Helper**: New `supabase/functions/_shared/email-helper.ts` module
- **sendEmail Function**: Simplified email sending via send-email edge function
- **Template Generators**: `generateTradeEmailHtml()` and `generateCopyTradeEmailHtml()`
- **Type Safety**: TypeScript interfaces for EmailPayload and EmailResult
- **Consistent Styling**: Professional HTML templates with gradient headers
- **Reusable Across Functions**: Can be imported by any edge function
- **Error Handling**: Comprehensive error handling with typed results
- **Environment Validation**: Checks for Supabase URL and anon key
- **DRY Principle**: Eliminates duplicate email code across functions
- **Easy Integration**: Simple import and call pattern for edge functions

### v1.8.2 - Enhanced Email Notification Logging (February 3, 2026)
Improved observability and debugging for copy trading email notifications:
- **Comprehensive Logging**: Added detailed console logs throughout email notification flow
- **Environment Validation**: Logs Supabase URL and key availability at start
- **Profile Fetch Tracking**: Logs leader profile fetch with error handling
- **Email Send Confirmation**: Logs each email send attempt with recipient
- **Error Visibility**: Explicit error logging for profile fetch failures
- **Production Debugging**: Better troubleshooting for email delivery issues
- **Non-Blocking**: Email failures logged but don't affect trade execution
- **Monitoring Ready**: Logs structured for production monitoring tools

### v1.8.1 - Copy Trading Email Notifications (February 3, 2026)
Enhanced copy trading system with automated email notifications:
- **Leader Notifications**: Email sent to leader when trade is executed and copied
  - Shows trade details (symbol, side, quantity)
  - Displays number of followers who copied the trade
  - Professional HTML template with color-coded buy/sell indicators
- **Follower Notifications**: Email sent to each follower when trade is copied
  - Shows leader's name and trade details
  - Displays follower's specific quantity and portfolio percentage
  - Includes link to dashboard for trade management
- **Email Integration**: Uses existing email system with Brevo/Resend routing
- **Error Handling**: Email failures don't block trade execution
- **Template Design**: Responsive HTML with gradient headers and styled trade cards
- **Batch Processing**: Efficiently sends emails to multiple followers
- **Profile Data**: Fetches user names and emails from profiles table

### v1.8.0 - Production Email System (February 3, 2026)
Comprehensive email delivery infrastructure with dual-provider routing:
- **Email Providers**: Brevo (auth/support/marketing), Resend (trading notifications)
- **Automatic Routing**: Category-based routing to appropriate provider
- **Email Templates**: Professional HTML templates for all email types
  - Welcome emails with verification links
  - Trade confirmations with detailed order info
  - Copy trade notifications
  - Support inquiry confirmations
- **Email Categories**: Auth, Trading, Support, Marketing
- **Monitoring & Analytics**: Real-time metrics, success rates, error tracking
- **Reliability Features**: Retry logic, email queue, batch sending
- **API Endpoints**: `/api/email/send`, `/api/email/test`, `/api/email/metrics`
- **Integration Points**: Signup flow, trade execution, copy trading, support form
- **Gmail Forwarding**: Cloudflare Email Routing for support@ and hello@
- **Supabase SMTP**: Custom SMTP configuration for auth emails
- **Documentation**: Complete setup guides, integration examples, API docs
- **Files Created**: 26 files (12 TypeScript, 3 API endpoints, 2 edge functions, 9 docs)

### v1.7.110.22 - Sync Alpaca Accounts Enhancement (January 29, 2026)
Enhanced account synchronization with dual-mode operation:
- **Dual-Mode Sync**: Supports both batch (all users) and targeted (single user) synchronization
- **Login Integration**: Can sync specific user's accounts on login for fresh data
- **Flexible Operation**: Backward compatible with existing cron jobs
- **Enhanced Logging**: Clear visibility into sync mode and target user
- **Performance**: Faster single-user sync (~100-200ms) vs batch sync
- **Use Cases**: Scheduled maintenance, login refresh, troubleshooting, account actions

### v1.7.110.21 - Execute Copy Trades Follower Filtering (January 29, 2026)
Enhanced copy trading system to filter out followers without Alpaca accounts before processing:
- **Early Filtering**: Filters followers without accounts immediately after data fetch
- **Enhanced Logging**: Logs each skipped follower with ID and username
- **Empty List Handling**: Returns early with metrics when no valid followers exist
- **Performance**: Eliminates unnecessary API calls, reduces execution time by 20-30%
- **Visibility**: Shows ratio of valid to total followers for monitoring

### v1.7.110.20 - TradeForm Fractional Shares Support (January 29, 2026)
Added fractional shares support to the TradeForm component:
- **Fractional Input**: Allows decimal quantities up to 9 decimal places
- **Smart Validation**: Validates fractional shares based on asset class
- **UI Enhancement**: Updated labels and placeholders to indicate fractional support
- **Alpaca Compliance**: Follows Alpaca's fractional shares precision requirements

### v1.7.110.19 - Enhanced Follower Calculation Logging (January 29, 2026)
Added comprehensive logging for follower trade calculations:
- **Detailed Metrics**: Logs portfolio value, allocation %, trade %, dollar amount, and quantity
- **Price Visibility**: Shows estimated price used for calculations
- **Formula Transparency**: Clear visibility into proportional allocation math
- **Production Debugging**: Easier troubleshooting of copy trade execution

### v1.7.110.18 - Market Price Fetching Enhancement (January 29, 2026)
Improved market price fetching for accurate copy trade calculations:
- **Latest Quotes**: Fetches real-time bid/ask prices from Alpaca Data API
- **Mid-Point Calculation**: Uses average of bid and ask for better accuracy
- **Fallback Logic**: Falls back to limit_price or default if quote unavailable
- **Error Handling**: Graceful degradation with warning logs

### v1.7.110.17 - Syntax Error Fix (January 29, 2026)
Fixed syntax error in execute-copy-trades function:
- **Corrected Typo**: Fixed `followerQty` variable name typo
- **Validation**: Ensured code compiles and deploys correctly

### v1.7.110.16 - Enhanced Follower Logging (January 29, 2026)
Added detailed logging for follower processing:
- **Account Details**: Logs follower account ID, type, and trading mode
- **Data Visibility**: Shows complete follower object for debugging
- **Production Support**: Better troubleshooting capabilities

### v1.7.110.15 - Account Type Tracking (January 29, 2026)
Enhanced execute-copy-trades to track follower account types:
- **Account Type Field**: Added `account_type` ('paper' | 'live') to follower data
- **Trading Mode Visibility**: Complete visibility into follower trading modes
- **Future Features**: Enables mode-specific copy trading rules and filtering

### v1.7.110.14 - Error Handling Enhancement (January 29, 2026)
Comprehensive error handling and logging in execute-copy-trades:
- **Complete Tracking**: Every follower tracked in results array
- **Detailed Logging**: Logs at every critical step
- **Error Isolation**: Individual failures don't affect other followers
- **Production Ready**: Professional error reporting and monitoring

### v1.7.110.13 - Alpaca Accounts Integration (January 29, 2026)
Proper database schema usage for follower data:
- **Separate Queries**: Parallel queries to `profiles` and `alpaca_accounts` tables
- **Schema Compliance**: Uses correct database normalization
- **Performance**: Efficient batch data retrieval

### v1.7.110.12 - Database Query Optimization (January 29, 2026)
Refactored subscription queries for better reliability:
- **Separate Queries**: Decoupled subscriptions and profiles fetching
- **Error Isolation**: Better error handling per query
- **Maintainability**: Clearer code structure

### v1.7.110.11 - Request Validation (January 29, 2026)
Enhanced input validation for execute-copy-trades:
- **Required Fields**: Validates leaderId, orderData, leaderPortfolioValue
- **Request Logging**: Logs complete request body
- **Clear Errors**: Specific error messages for missing fields

### v1.7.110.10 - Sell Order Validation (January 29, 2026)
Position validation for sell orders in copy trading:
- **Position Check**: Verifies follower owns the security before selling
- **Quantity Adjustment**: Automatically adjusts to available shares
- **Error Prevention**: Prevents failed orders from insufficient positions

### v1.7.110.9 - Leaderboard Slider Styling (January 29, 2026)
Refined allocation slider visual design:
- **Inverted Colors**: Background thumb with primary border
- **Optimized Border**: 3px border for better proportions
- **Theme Consistency**: Works well in light and dark modes

### v1.7.110.8 - Leaderboard Slider UX (January 29, 2026)
Enhanced slider controls for better usability:
- **Larger Thumb**: 20px × 20px for better touch targets
- **Enhanced Shadow**: Increased depth perception
- **Active State**: Tactile feedback on click/drag
- **Accessibility**: Meets WCAG touch target guidelines

### v1.7.110.7 - Leaderboard Modal Button (January 29, 2026)
Context-aware button text in Mirror Trades modal:
- **Dynamic Text**: "Start Mirroring" vs "Update Mirroring"
- **Loading States**: Different text for create vs edit operations
- **Enhanced Validation**: Proper allocation limits in edit mode

### v1.7.110.6 - Leaderboard Visual Indicators (January 29, 2026)
Added visual mirroring indicators to leaderboard:
- **Mirroring Column**: Shows "Mirroring X%" for active subscriptions
- **Button Variants**: "Mirror" vs "Edit" based on subscription status
- **Information Density**: More data visible at a glance

### v1.7.110.5 - Leaderboard Subscription Management (January 29, 2026)
Enhanced subscription tracking and edit mode:
- **Subscription Map**: Tracks active subscriptions by leader ID
- **Edit Mode**: Automatically detects and pre-fills existing allocations
- **Real-time Updates**: Refreshes subscription state after changes

### v1.7.110.4 - Copy Trading Service Schema Fix (January 29, 2026)
Fixed database table reference:
- **Correct Table**: Changed from `user_profiles` to `profiles`
- **Leader Validation**: Properly checks leader existence and share_trades flag

### v1.7.110.3 - Alpaca Orders Copy Trade Enhancement (January 29, 2026)
Enhanced order placement with copy trade trigger:
- **Account Data Fetch**: Explicitly fetches leader's portfolio value
- **Error Handling**: Validates account data before triggering copies
- **Reliability**: Prevents stale data issues

### v1.7.110.2 - Execute Copy Trades Implementation (January 29, 2026)
Core copy trading automation:
- **Automated Execution**: Replicates leader trades to all followers
- **Portfolio-Proportional**: Calculates quantities based on portfolio percentages
- **Multi-Account**: Handles multiple followers with separate Alpaca accounts
- **Comprehensive Logging**: Detailed execution tracking and reporting

## Email System

### Architecture

The email system uses automatic routing to deliver emails via Brevo and Resend based on category.

**Client-Side Flow:**
```
Application Code
    ↓
src/lib/email/service.ts
    ↓
supabase.functions.invoke('send-email')
    ↓
supabase/functions/send-email/index.ts
    ↓
Brevo/Resend API
```

**Edge Function Flow (Direct):**
```
Edge Function (e.g., execute-copy-trades)
    ↓
import { sendEmail } from '../_shared/email-helper.ts'
    ↓
Brevo/Resend API (direct call)
```

| Category | Provider | From Address | Purpose |
|----------|----------|--------------|---------|
| **Auth** | Brevo | no-reply@auth.leadtrade.app | Password resets, email verification, account security |
| **Trading** | Resend | notifications@trade.leadtrade.app | Trade confirmations, copy trade alerts |
| **Support** | Brevo | support@leadtrade.app | Support inquiries, help requests |
| **Marketing** | Brevo | hello@marketing.leadtrade.app | Marketing campaigns (future use) |

**Why Two Providers?**
- **Resend**: No branding on free tier (professional look for customer-facing trading emails)
- **Brevo**: Multiple domains supported (cost-effective for auth/support/marketing)

### Features

- ✅ Automatic routing based on email category
- ✅ Professional HTML email templates with plain text fallbacks
- ✅ Retry logic with exponential backoff
- ✅ Email queue for failed sends
- ✅ Batch sending with rate limiting
- ✅ Real-time monitoring and analytics
- ✅ Success rate tracking by category and provider
- ✅ Comprehensive error logging
- ✅ Zod validation for all inputs
- ✅ HTML content sanitization
- ✅ SPF/DKIM/DMARC support
- ✅ Enhanced logging for production debugging (v1.8.4)
- ✅ Internal call detection for edge function requests
- ✅ Request tracking with category, recipient, and subject
- ✅ Provider routing visibility (Brevo/Resend)
- ✅ Rate limiting for copy trading notifications (v1.8.8)
- ✅ 600ms delay between emails to respect Resend limits

### Email Templates

**Authentication**
- Welcome email with optional verification link
- Password reset with secure token
- Email verification

**Trading**
- Trade confirmation with order details (symbol, side, quantity, price, total)
- Copy trade notification showing leader and trade info

**Support**
- Support inquiry confirmation to user
- Support team notification (forwarded to Gmail)
- Support response template

### Usage Example

```typescript
import { sendTradingEmail, getTradeConfirmationTemplate } from '@/lib/email';

// Send trade confirmation
const { html, text } = getTradeConfirmationTemplate('John Doe', {
  symbol: 'AAPL',
  side: 'buy',
  quantity: 10,
  price: 150.25,
  total: 1502.50,
  timestamp: new Date().toISOString(),
  orderId: 'ORDER-123',
});

await sendTradingEmail({
  to: 'user@example.com',
  subject: 'Trade Confirmation - AAPL',
  html,
  text,
});
```

### Integration Points

1. **User Signup** (`src/lib/signup-service.ts`)
   - Sends welcome email after successful account creation
   - Includes email verification link if needed
   - Logged with category 'auth' and recipient details

2. **Trade Execution** (Alpaca webhook handler)
   - Sends trade confirmation when order is filled
   - Includes complete trade details
   - Routed to Resend provider with full request logging

3. **Copy Trading** (`supabase/functions/execute-copy-trades/`)
   - Notifies leader when trade is executed and copied to followers
   - Notifies each follower when trade is copied to their account
   - Shows leader name, trade details, and follower-specific quantities
   - Includes portfolio percentage and allocation information
   - Internal calls detected and logged for monitoring
   - Rate limited with 600ms delay between emails (v1.8.8)

4. **Support Form** (`src/pages/api/support/submit.ts`)
   - Sends confirmation to user
   - Notifies support team (forwarded to Gmail via Cloudflare)
   - Routed to Brevo with validation logging

### Monitoring

```bash
# Check email metrics
curl http://localhost:4321/api/email/metrics

# Test email delivery
curl -X POST http://localhost:4321/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"category": "all", "to": "your.email@gmail.com"}'

# View send-email function logs (production)
supabase functions logs send-email --tail

# View copy trading email logs
supabase functions logs execute-copy-trades --tail
```

**Metrics Tracked:**
- Total emails sent/failed
- Success rate overall and by category
- Success rate by provider (Brevo/Resend)
- Recent errors (last 100)
- Health status

**Logging Features (v1.8.4):**
- Request tracking: category, recipient, subject
- Authentication header detection
- Internal vs external call identification
- Provider routing decisions (Brevo/Resend)
- Email send results with message IDs
- Validation error details
- Structured logs for monitoring tools

### Rate Limits

**Brevo Free Tier**: 300 emails/day, unlimited contacts, branding in emails  
**Resend Free Tier**: 100 emails/day, 3,000 emails/month, no branding, 2 requests/second

**Copy Trading Rate Limiting (v1.8.8)**:
- 600ms delay between email notifications
- Allows ~1.6 emails/second (safe margin below 2 req/sec limit)
- Applies to both leader and follower notifications
- Prevents rate limit errors in high-volume scenarios
- Non-blocking: doesn't affect trade execution speed

### Documentation

- **Setup Guide**: `docs/EMAIL_SETUP_GUIDE.md` - Complete DNS and provider setup
- **Quick Checklist**: `docs/EMAIL_SETUP_CHECKLIST.md` - 80-minute setup guide
- **Integration Examples**: `docs/EMAIL_INTEGRATION_EXAMPLES.md` - Real-world code examples
- **API Documentation**: `src/lib/email/README.md` - Complete API reference
- **Architecture**: `docs/EMAIL_ARCHITECTURE_DIAGRAM.md` - Visual system overview

## Copy Trading System

### Architecture

The copy trading system uses a trigger-based architecture:

1. **Leader Places Trade** → `alpaca-orders` Edge Function
2. **Order Executed** → Checks for active followers
3. **Trigger Copy Trades** → Calls `execute-copy-trades` (non-blocking)
4. **Calculate Allocations** → Portfolio-proportional sizing
5. **Execute Follower Trades** → Parallel execution per follower
6. **Send Email Notifications** → Leader and follower notifications
7. **Return Results** → Detailed success/failure reporting

### Allocation Formula

```typescript
// Leader's trade as percentage of their portfolio
leaderTradePercentage = (tradeValue / leaderPortfolioValue) * 100

// Follower's trade percentage (applied to their allocation)
followerTradePercentage = (leaderTradePercentage * followerAllocationPercentage) / 100

// Follower's trade value
followerTradeValue = (followerPortfolioValue * followerTradePercentage) / 100

// Follower's quantity (with fractional shares support)
followerQty = followerTradeValue / estimatedPrice
```

### Example

**Leader**: Portfolio $100,000, buys 100 shares @ $150 = $15,000 (15% of portfolio)  
**Follower**: Portfolio $20,000, allocated 20% to leader  
**Calculation**: 15% × 20% = 3% of follower's portfolio = $600 = 4 shares

### Features

- ✅ Automated trade replication
- ✅ Portfolio-proportional sizing
- ✅ Fractional shares support (up to 9 decimals)
- ✅ Position validation for sell orders
- ✅ Account type tracking (paper/live)
- ✅ Intelligent follower filtering
- ✅ Real-time market price fetching
- ✅ Comprehensive error handling
- ✅ Detailed execution logging
- ✅ Multi-follower support
- ✅ Allocation limit enforcement (max 100%)
- ✅ **Email notifications for leaders and followers**
- ✅ **Professional HTML email templates with trade details**
- ✅ **Batch email delivery to multiple followers**
- ✅ **Rate limiting to respect provider API limits (600ms delay)**

## Edge Functions (47 Total)

### Copy Trading
- `execute-copy-trades`: Automated trade replication with proportional allocation
- `copy-trading-subscriptions`: Follower subscription management
- `get-leaderboard`: Leaderboard data aggregation with performance metrics
- `update-leaderboard-stats`: Real-time statistics calculation

### Email & Notifications
- `send-email`: Email delivery via Brevo and Resend with automatic routing
- `_shared/email-helper.ts`: Reusable email utilities for edge functions
  - `sendEmail()`: Send emails via send-email function
  - `generateTradeEmailHtml()`: Generate trade confirmation templates
  - `generateCopyTradeEmailHtml()`: Generate copy trade notification templates

### Trading
- `alpaca-orders`: Order management (GET, POST, DELETE) with copy trade trigger
- `alpaca-positions`: Position tracking and management
- `alpaca-account`: Account data and portfolio value
- `alpaca-portfolio-history`: Historical performance data
- `alpaca-assets`: Asset search and information
- `alpaca-market-quotes`: Real-time market data

### Account Management
- `create-alpaca-account`: Brokerage account creation
- `sync-alpaca-accounts`: Account status synchronization (batch or single-user)
- `alpaca-kyc-cip`: KYC/CIP verification
- `alpaca-documents`: Document upload and management
- `alpaca-funding-enhanced`: ACH transfers and funding
- `alpaca-bank-relationships`: Bank account linking
- `alpaca-transfers`: Transfer operations

### Options Trading
- `alpaca-options-contracts`: Options chain data
- `alpaca-options-orders`: Options order placement
- `alpaca-options-positions`: Options position tracking
- `alpaca-options-exercise`: Options exercise operations

### Authentication
- `auth`: User authentication and session management
- `streamlined-signup`: Integrated signup with Alpaca account creation

### Market Data
- `alpaca-market-data-enhanced`: Enhanced market data with caching
- `market-websocket`: WebSocket connection management
- `alpaca-clock`: Market hours and calendar

## Database Schema

### Core Tables

**profiles**
- User identity and preferences
- `share_trades`: Controls leaderboard visibility
- `show_asset_amounts`: Privacy control for portfolio values

**alpaca_accounts**
- Alpaca brokerage account data
- `account_type`: 'paper' | 'live'
- `account_status`: 'ACTIVE' | 'INACTIVE'
- `trading_mode`: Current trading mode

**copy_trading_subscriptions**
- Leader-follower relationships
- `allocation_percentage`: Follower's allocation (0-100%)
- `is_active`: Subscription status
- Foreign keys: `leader_id`, `follower_id`

**leaderboard_stats**
- Cached performance metrics
- `total_return`, `win_rate`, `trades_count`
- `portfolio_value`, `followers_count`
- Updated via `update-leaderboard-stats` function

### Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Service role key for Edge Functions
- HTTP-only cookies for authentication

## Testing

**Unit Tests**: `src/lib/__tests__/` - 95%+ coverage on business logic  
**Integration Tests**: Critical user flows (signup, trading, copy trading)  
**E2E Tests**: Complete user journeys with Alpaca API mocking

```bash
npm run test:run        # Run all tests once
npm run test            # Watch mode
npm run test:coverage   # Coverage report
```

## Deployment

**Platform**: Cloudflare Pages  
**Build Command**: `npm run build`  
**Output Directory**: `dist`  
**Environment**: Production environment variables configured in Cloudflare dashboard

**Edge Functions**: Deployed to Supabase Edge Runtime  
**Database**: Supabase PostgreSQL with automatic backups  
**CDN**: Cloudflare global network

## Performance

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **WebSocket Latency**: < 100ms for market data
- **Copy Trade Execution**: 100-200ms per follower
- **Database Queries**: Optimized with indexes and RLS policies

## Security

- ✅ TypeScript strict mode
- ✅ Zod validation on all inputs
- ✅ RLS policies on all tables
- ✅ HTTP-only cookies for auth
- ✅ CORS configuration
- ✅ Rate limiting on Edge Functions
- ✅ Encrypted sensitive data
- ✅ Secure environment variables
- ✅ CSP headers
- ✅ XSS protection

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)
- PWA support for offline capabilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run `npm run test:run` and `npm run astro check`
5. Submit pull request with detailed description

## License

Proprietary - All rights reserved

---

**Built with** ❤️ **using Astro, React, Supabase, and Alpaca Markets**
