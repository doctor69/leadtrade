# LeadTrade Technical Architecture

**Version**: 1.8.9  
**Last Updated**: February 3, 2026

## System Overview

LeadTrade is a full-stack social trading platform built with modern web technologies, enabling paper and live trading with automated copy trading capabilities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Astro 5.2 (SSG) + React 19 + TypeScript                        │
│  - PWA with offline support                                      │
│  - Tailwind CSS v4 + Radix UI                                    │
│  - WebSocket client for real-time data                           │
│  - Service Worker for caching                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Astro API Routes (/api/*)                                       │
│  - Authentication endpoints                                       │
│  - Alpaca API proxies                                            │
│  - Email API endpoints                                           │
│  - Support system                                                │
└────────┬────────────────────────┬────────────────────────────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐    ┌──────────────────────────────────────┐
│  Supabase Edge   │    │  External Services                    │
│  Functions       │    │  - Alpaca Markets (Broker & Data)    │
│  (47 functions)  │    │  - Brevo (Email - Auth/Support)      │
│                  │    │  - Resend (Email - Trading)          │
│  - Copy Trading  │    │  - Cloudflare (Email Routing)        │
│  - Leaderboard   │    └──────────────────────────────────────┘
│  - Email Delivery│
│  - Account Sync  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL                                             │
│  - profiles (user data)                                          │
│  - alpaca_accounts (brokerage accounts)                          │
│  - copy_trading_subscriptions (leader-follower relationships)    │
│  - leaderboard_stats (cached performance metrics)                │
│  - Row Level Security (RLS) enabled                              │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

**Framework**: Astro 5.2+
- Static Site Generation (SSG) for optimal performance
- React 19 for interactive components
- TypeScript strict mode for type safety
- Vite for fast development and building

**UI Components**
- Tailwind CSS v4 for styling
- Radix UI for accessible primitives
- Lucide icons for consistent iconography
- Recharts for data visualization
- TanStack Table for complex data tables

**State Management**
- React hooks for local state
- Supabase real-time subscriptions for server state
- WebSocket connections for market data

### Backend

**Database**: Supabase PostgreSQL
- Row Level Security (RLS) for data isolation
- Real-time subscriptions via WebSocket
- Automatic backups and point-in-time recovery
- Connection pooling for performance

**Authentication**: Supabase Auth
- Email/password authentication
- OAuth providers (Google, Apple)
- HTTP-only cookies for session management
- Custom SMTP for branded emails

**Edge Functions**: Supabase Edge Runtime (Deno)
- 47 serverless functions
- Automatic scaling
- Global distribution
- TypeScript support

**Email Delivery**
- Brevo: Auth, support, marketing emails
- Resend: Trading notifications (no branding)
- Cloudflare Email Routing: Gmail forwarding
- Automatic routing based on category

### External APIs

**Alpaca Markets**
- Broker API: Account management, orders, positions
- Data API: Real-time quotes, historical data, market calendar
- WebSocket: Live market data streaming
- Paper & live trading support

**Email Providers**
- Brevo API: Multi-domain email delivery
- Resend API: Branded trading notifications (rate limited: 2 req/sec)
- SPF/DKIM/DMARC configured
- Automatic rate limiting in copy trading notifications

### Development Tools

**Build & Dev**
- Vite for fast HMR and building
- Astro CLI for development server
- TypeScript compiler for type checking

**Testing**
- Vitest for unit and integration tests
- Testing Library for component tests
- 95%+ coverage on business logic

**Code Quality**
- ESLint for linting
- Prettier for formatting
- TypeScript strict mode
- Zod for runtime validation

## Data Flow

### User Signup Flow

```
1. User submits signup form
   ↓
2. Validate input with Zod schema
   ↓
3. Create Alpaca brokerage account (FIRST)
   ↓
4. Create Supabase auth account (SECOND)
   ↓
5. Link accounts in database
   ↓
6. Send welcome email via Brevo
   ↓
7. Return success with user ID
```

**Rollback**: If any step fails, previous steps are rolled back to prevent orphaned accounts.

### Trade Execution Flow

```
1. User places order via TradeForm
   ↓
2. Validate order with Zod schema
   ↓
3. Submit order to Alpaca API
   ↓
4. Alpaca executes order
   ↓
5. Webhook notification received
   ↓
6. Check for active followers
   ↓
7. Trigger execute-copy-trades (async)
   ↓
8. Send trade confirmation email via Resend
   ↓
9. Update UI with order status
```

### Copy Trading Flow

```
1. Leader's order executed
   ↓
2. execute-copy-trades function triggered
   ↓
3. Fetch active followers with allocations
   ↓
4. Filter followers with valid Alpaca accounts
   ↓
5. Calculate proportional quantities
   ↓
6. Fetch current market price
   ↓
7. For each follower:
   - Validate position (for sells)
   - Submit order to Alpaca
   - Fetch follower profile with error handling
   - Send notification email (with graceful failure)
   - Apply 600ms delay between emails (rate limiting)
   ↓
8. Return execution results with detailed logging
```

### Email Delivery Flow

```
1. Application calls email function
   ↓
2. Determine category (auth/trading/support)
   ↓
3. Route to appropriate provider
   - Auth → Brevo
   - Trading → Resend
   - Support → Brevo
   ↓
4. Generate HTML from template
   ↓
5. Send via provider API
   ↓
6. Record metrics (success/failure)
   ↓
7. If failed, add to retry queue
   ↓
8. Return result to caller

**Error Handling & Rate Limiting (v1.8.7):**
- Explicit error checking for profile fetch operations
- Graceful degradation: continues processing if one email fails
- Missing data validation: checks for profiles and email addresses
- Detailed logging with follower IDs for debugging
- Non-blocking: email failures don't affect trade execution
- Rate limiting: 600ms delay between emails (respects Resend's 2 req/sec limit)
- Applies to both leader and follower notification emails
```

## Database Schema

### Core Tables

**profiles**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT UNIQUE,
  trading_mode TEXT DEFAULT 'paper',
  share_trades BOOLEAN DEFAULT false,
  show_asset_amounts BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**alpaca_accounts**
```sql
CREATE TABLE alpaca_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  alpaca_account_id TEXT UNIQUE NOT NULL,
  alpaca_account_number TEXT,
  account_status TEXT,
  account_type TEXT, -- 'paper' | 'live'
  kyc_status TEXT,
  kyc_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**copy_trading_subscriptions**
```sql
CREATE TABLE copy_trading_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  leader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  allocation_percentage NUMERIC(5,2) CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, leader_id)
);
```

**leaderboard_stats**
```sql
CREATE TABLE leaderboard_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  total_return NUMERIC(10,2),
  win_rate NUMERIC(5,2),
  trades_count INTEGER,
  portfolio_value NUMERIC(15,2),
  followers_count INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

### Security

**Row Level Security (RLS)**
- All tables have RLS enabled
- Users can only access their own data
- Service role key bypasses RLS for Edge Functions
- Policies enforce data isolation

**Indexes**
- Primary keys on all tables
- Foreign key indexes for joins
- Composite indexes for common queries
- Unique constraints on critical fields

## API Architecture

### REST API Endpoints

**Authentication** (`/api/auth/*`)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session

**Alpaca Proxy** (`/api/alpaca/*`)
- `GET /api/alpaca/account` - Account details
- `GET /api/alpaca/positions` - Current positions
- `POST /api/alpaca/orders` - Place order
- `GET /api/alpaca/orders` - Order history
- `DELETE /api/alpaca/orders/:id` - Cancel order

**Email** (`/api/email/*`)
- `POST /api/email/send` - Send email
- `POST /api/email/test` - Test email delivery
- `GET /api/email/metrics` - Email analytics

**Support** (`/api/support/*`)
- `POST /api/support/submit` - Submit support inquiry

### Edge Functions

**Copy Trading**
- `execute-copy-trades`: Replicate leader trades to followers
- `copy-trading-subscriptions`: Manage subscriptions
- `get-leaderboard`: Aggregate leaderboard data
- `update-leaderboard-stats`: Calculate performance metrics

**Account Management**
- `sync-alpaca-accounts`: Sync account status (batch or single-user)
- `create-alpaca-account`: Create brokerage account
- `alpaca-kyc-cip`: KYC verification

**Email**
- `send-email`: Email delivery with automatic routing

**Trading**
- `alpaca-orders`: Order management with copy trade trigger
- `alpaca-positions`: Position tracking
- `alpaca-portfolio-history`: Historical performance

## Real-Time Features

### WebSocket Connections

**Market Data**
- Alpaca Data WebSocket for live quotes
- Automatic reconnection on disconnect
- Fallback to REST API if WebSocket fails
- Subscription management per symbol

**Database Updates**
- Supabase real-time subscriptions
- Live updates for positions and orders
- Optimistic UI updates

### Server-Sent Events (SSE)

**Trade Updates**
- Real-time order status updates
- Position changes
- Account balance updates

## Security Architecture

### Authentication & Authorization

**Session Management**
- HTTP-only cookies for session tokens
- Secure flag in production
- SameSite=Lax for CSRF protection
- Automatic token refresh

**API Security**
- CORS configuration for allowed origins
- Rate limiting on Edge Functions
- Input validation with Zod schemas
- SQL injection prevention via parameterized queries

### Data Protection

**Encryption**
- TLS/SSL for all connections
- Encrypted sensitive data at rest
- Secure environment variables
- API keys never exposed to client

**Privacy Controls**
- User-controlled data sharing (share_trades flag)
- Portfolio visibility settings (show_asset_amounts)
- RLS policies for data isolation

## Performance Optimization

### Frontend

**Code Splitting**
- Dynamic imports for heavy components
- Route-based code splitting
- Lazy loading for images

**Caching**
- Service Worker for offline support
- Browser cache for static assets
- CDN caching via Cloudflare

**Bundle Optimization**
- Tree shaking for unused code
- Minification and compression
- Critical CSS inlining

### Backend

**Database**
- Connection pooling
- Indexed queries
- Materialized views for leaderboard
- Query optimization

**API**
- Response caching where appropriate
- Batch operations for bulk updates
- Parallel execution for independent operations

**Edge Functions**
- Global distribution
- Automatic scaling
- Cold start optimization

## Monitoring & Observability

### Metrics

**Application Metrics**
- API response times
- Error rates by endpoint
- User activity tracking
- Feature usage analytics

**Email Metrics**
- Delivery success rate
- Bounce rate
- Open rate (where available)
- Provider-specific metrics

**Trading Metrics**
- Order execution time
- Copy trade latency
- WebSocket connection stability
- API call success rates

### Logging

**Structured Logging**
- JSON format for easy parsing
- Log levels (debug, info, warn, error)
- Request/response logging
- Error stack traces

**Production Best Practices**
- No console.log in production code
- Structured logging with proper levels
- Error tracking with context
- Performance metrics logging
- Security-sensitive data redaction

**Log Aggregation**
- Supabase Edge Function logs
- Cloudflare Pages logs
- Email provider logs

## Deployment Architecture

### Hosting

**Frontend**: Cloudflare Pages
- Global CDN distribution
- Automatic HTTPS
- Preview deployments for PRs
- Rollback capabilities

**Backend**: Supabase
- Managed PostgreSQL database
- Edge Functions runtime
- Automatic backups
- High availability

### CI/CD Pipeline

```
1. Code pushed to GitHub
   ↓
2. Run tests (Vitest)
   ↓
3. Type checking (TypeScript)
   ↓
4. Build production bundle
   ↓
5. Deploy to Cloudflare Pages
   ↓
6. Deploy Edge Functions to Supabase
   ↓
7. Run smoke tests
   ↓
8. Update DNS if needed
```

### Environment Management

**Development**
- Local Supabase instance
- Alpaca paper trading API
- Test email providers

**Staging**
- Supabase staging project
- Alpaca paper trading API
- Production email providers

**Production**
- Supabase production project
- Alpaca live trading API
- Production email providers
- Monitoring and alerting

## Scalability Considerations

### Horizontal Scaling

**Edge Functions**
- Automatic scaling based on load
- No server management required
- Global distribution

**Database**
- Connection pooling
- Read replicas for heavy queries
- Vertical scaling available

### Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **API Response Time**: < 200ms (p95)
- **WebSocket Latency**: < 100ms
- **Copy Trade Execution**: < 200ms per follower (excluding email delays)
- **Email Rate Limit**: 600ms delay between notifications (~1.6 emails/sec)
- **Email Delivery**: < 5s

## Disaster Recovery

### Backup Strategy

**Database**
- Automatic daily backups
- Point-in-time recovery (7 days)
- Manual backup before major changes

**Code**
- Git version control
- GitHub as source of truth
- Tagged releases

### Recovery Procedures

**Database Failure**
1. Restore from latest backup
2. Replay transactions from logs
3. Verify data integrity
4. Resume operations

**Service Outage**
1. Check status pages (Supabase, Cloudflare, Alpaca)
2. Failover to backup systems if available
3. Communicate with users
4. Monitor recovery

## Future Enhancements

### Planned Features

- **Advanced Analytics**: Portfolio performance tracking, risk metrics
- **Social Features**: User profiles, trade comments, social feed
- **Mobile Apps**: Native iOS and Android applications
- **Advanced Orders**: Stop-loss, take-profit, trailing stops
- **Backtesting**: Historical strategy testing
- **API Access**: Public API for third-party integrations

### Technical Improvements

- **GraphQL API**: Replace REST with GraphQL for flexible queries
- **Redis Caching**: Add Redis for session and data caching
- **Message Queue**: RabbitMQ or SQS for async processing
- **Microservices**: Split monolith into focused services
- **Kubernetes**: Container orchestration for better scaling

---

**Document Version**: 1.8.9  
**Last Updated**: February 3, 2026  
**Maintained By**: LeadTrade Engineering Team
