# LeadTrade

A modern paper/live trading platform with social copy trading capabilities, built on Alpaca Markets infrastructure.

## Overview

LeadTrade is a Progressive Web App (PWA) that enables users to trade stocks and options, follow top traders, and automatically mirror their trades with customizable portfolio allocation. The platform supports both paper trading (sandbox) and live trading modes with integrated KYC/CIP verification.

## Core Features

### Trading
- **Paper & Live Trading**: Seamless switching between sandbox and live trading modes
- **Stock Trading**: Market, limit, stop, and stop-limit orders with real-time execution
- **Options Trading**: Full options chain access, exercise management, and position tracking
- **Real-time Market Data**: WebSocket-based live quotes and trade updates
- **Portfolio Management**: Comprehensive portfolio analytics, performance tracking, and asset allocation
- **Order Management**: Advanced order types, order history, and execution tracking

### Social Trading
- **Leaderboard System**: Discover top-performing traders ranked by returns, win rate, and trade volume
- **Copy Trading**: Mirror trades from successful traders with customizable allocation (1-100%)
- **Privacy Controls**: Traders can control visibility of portfolio amounts and trade sharing
- **Follower Management**: Track followers and manage copy trading subscriptions
- **Performance Metrics**: Detailed statistics including win rate, total return, and trade count

### Account Management
- **KYC/CIP Integration**: Streamlined identity verification via Alpaca's compliance system
- **Bank Linking**: ACH and wire transfer support for funding accounts
- **Document Management**: Access account statements, trade confirmations, and tax documents
- **PDT Status**: Pattern Day Trader status monitoring and removal requests
- **Funding Wallets**: Instant funding and transfer history tracking

### Progressive Web App
- **Offline Support**: Service worker-based caching for offline functionality
- **Mobile Optimized**: Responsive design with touch-friendly interfaces
- **Install Prompt**: Native app-like experience on mobile and desktop
- **Background Sync**: Queue trades and sync when connection is restored
- **Push Notifications**: Real-time trade alerts and corporate action notifications

## Tech Stack

### Frontend
- **Framework**: Astro 5.15+ (Static Site Generation)
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4 with custom theme system
- **Components**: Radix UI primitives with shadcn/ui patterns
- **Charts**: Recharts for portfolio and asset visualization
- **Tables**: TanStack Table for data grids

### Backend
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with email/password and OAuth
- **API**: Supabase Edge Functions (Deno runtime)
- **Real-time**: WebSocket connections for market data and events
- **Storage**: Supabase Storage for document uploads

### Trading Infrastructure
- **Broker API**: Alpaca Markets Broker API
- **Market Data**: Alpaca Market Data API (stocks, options, crypto)
- **Event Streaming**: Server-Sent Events (SSE) for account updates
- **OAuth**: Alpaca OAuth for account linking

### Email & Notifications
- **Trading Emails**: Resend with custom templates (rate-limited: 2 req/sec)
- **Auth/Support**: Brevo for transactional emails
- **Queue System**: Database-backed email queue with retry logic
- **Monitoring**: Failed email tracking and automatic retry

## Project Structure

```
leadtrade/
├── src/
│   ├── components/          # React components
│   │   ├── account/        # Account management (KYC, funding, documents)
│   │   ├── admin/          # Admin dashboards (verification, stats)
│   │   ├── dashboard/      # Portfolio views (summary, charts, positions)
│   │   ├── trading/        # Trading interfaces (orders, leaderboard, copy trading)
│   │   ├── ui/             # Reusable UI components (shadcn/ui)
│   │   └── settings/       # User settings and preferences
│   ├── lib/                # Core business logic
│   │   ├── alpaca-*.ts     # Alpaca API clients (accounts, orders, options, etc.)
│   │   ├── auth.ts         # Authentication utilities
│   │   ├── database.ts     # Supabase database client
│   │   ├── copy-trading-service.ts  # Copy trading logic
│   │   ├── email/          # Email service and templates
│   │   ├── websocket-*.ts  # WebSocket clients for real-time data
│   │   └── __tests__/      # Comprehensive test suite (70+ test files)
│   ├── pages/              # Astro pages and API routes
│   │   ├── api/            # API endpoints
│   │   │   ├── admin/      # Admin APIs
│   │   │   ├── alpaca/     # Alpaca proxy endpoints
│   │   │   ├── auth/       # Authentication endpoints
│   │   │   └── webhooks/   # Webhook handlers
│   │   ├── dashboard.astro # Portfolio dashboard
│   │   ├── trade.astro     # Trading interface
│   │   ├── leaderboard.astro # Social leaderboard
│   │   ├── settings.astro  # Account settings
│   │   └── funding.astro   # Funding management
│   ├── hooks/              # React hooks
│   ├── types/              # TypeScript type definitions
│   └── styles/             # Global styles
├── supabase/
│   ├── functions/          # Edge Functions (40+ endpoints)
│   │   ├── _shared/        # Shared utilities (auth, CORS, logging)
│   │   ├── alpaca-*/       # Alpaca API proxies
│   │   ├── email-queue/    # Email processing
│   │   ├── get-leaderboard/ # Leaderboard data
│   │   ├── execute-copy-trades/ # Copy trading execution
│   │   └── streamlined-signup/ # Account creation
│   ├── schema.sql          # Database schema
│   └── seed_data.sql       # Seed data for development
├── public/                 # Static assets
│   ├── sw.js              # Service worker
│   ├── manifest.json      # PWA manifest
│   └── icons/             # App icons
└── scripts/               # Build and deployment scripts

```

## Key Components

### Navigation & Layout
- **NavigationBar**: Responsive navigation with mobile menu, theme customizer, and settings access
  - Desktop: Horizontal menu with active page indicators
  - Mobile: Slide-down menu with touch gestures (swipe up to close)
  - Auth-aware: Shows different menu items based on login status
  - Real-time path tracking for active state highlighting
  - Integrated theme customizer dropdown
  - Session management with Supabase Auth

### Trading Components
- **TradingDashboard**: Main trading interface with tabs for overview, assets, performance, events, corporate actions, and options
- **TradeForm**: Order entry with validation, market data, and execution
- **Leaderboard**: Social trading discovery with search, filters, and trader profiles
- **CopyTradingDashboard**: Manage copy trading subscriptions and allocations
- **OptionsExercise**: Options contract management and exercise functionality
- **EventStreamFeed**: Real-time account event stream (trades, transfers, corporate actions)

### Account Components
- **SettingsPageContent**: Unified settings interface
- **KYCVerificationPanel**: Identity verification with document upload (supports ID, address verification, W-8BEN)
  - File validation (JPEG, PNG, PDF up to 10MB)
  - Base64 encoding for secure upload
  - Upload status tracking with success/error states
  - Privacy and security notices
- **DocumentsPanel**: Access to statements, confirmations, and tax documents
  - Document type filtering (account statements, trade confirmations, tax documents)
  - Download functionality with progress indicators
  - Excludes internal document types (trade_confirmation_json, account_application)
  - FINRA/SEC compliance notices
- **KYCStatus**: Identity verification status display
- **PDTStatusPanel**: Pattern Day Trader monitoring and removal
- **FundingPageContent**: Bank linking, ACH/wire transfers, and funding history
- **TradingModeSwitch**: Toggle between paper and live trading

### Dashboard Components
- **PortfolioSummary**: Account overview with equity, buying power, and P&L
- **AssetGrid**: Position grid with real-time prices and performance
- **PortfolioChart**: Historical portfolio value visualization
- **AssetChart**: Individual asset price charts

## API Endpoints

### Supabase Edge Functions
- **Account Management**: `alpaca-account`, `alpaca-account-activities`
- **Trading**: `alpaca-orders`, `alpaca-positions`, `alpaca-advanced-orders`
- **Market Data**: `alpaca-market-data-enhanced`, `alpaca-market-quotes`
- **Options**: `alpaca-options-contracts`, `alpaca-options-exercise`
- **Funding**: `alpaca-ach-relationships`, `alpaca-bank-relationships`, `alpaca-transfers`
- **Documents**: `alpaca-documents`
- **KYC**: `alpaca-kyc-cip`, `alpaca-oauth`
- **Corporate Actions**: `alpaca-corporate-actions`
- **Events**: `alpaca-events` (SSE streaming)
- **Social**: `get-leaderboard`, `copy-trading-subscriptions`, `execute-copy-trades`
- **Email**: `email-queue`, `send-email`
- **Admin**: Auth and funding verification dashboards

## Development

### Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Configure Supabase, Alpaca, and email service credentials

# Start development server
npm run dev              # Runs on localhost:4321

# Start Supabase locally (optional)
npm run supabase:start
```

### Build & Deploy
```bash
# Production build
npm run build            # Outputs to dist/

# Build PWA
npm run build:pwa        # Optimized PWA build

# Deploy Edge Functions
npm run deploy:functions

# Deploy to production
npm run deploy:full      # Functions + static assets
```

### Testing
```bash
# Run all tests
npm run test:run

# Run tests in watch mode
npm test

# Run specific test suites
npm run test:signup
npm run test:functions
npm run test:performance
```

## Environment Variables

### Required
```env
# Supabase
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Alpaca Markets
ALPACA_API_KEY=your_alpaca_key
ALPACA_API_SECRET=your_alpaca_secret
ALPACA_BROKER_API_URL=https://broker-api.sandbox.alpaca.markets

# Email Services
RESEND_API_KEY=your_resend_key
BREVO_API_KEY=your_brevo_key

# App Configuration
PUBLIC_APP_URL=https://leadtrade.app
NODE_ENV=production
```

### Optional
```env
# OAuth
ALPACA_OAUTH_CLIENT_ID=your_oauth_client_id
ALPACA_OAUTH_CLIENT_SECRET=your_oauth_secret

# Encryption
ENCRYPTION_KEY=your_encryption_key

# Feature Flags
ENABLE_LIVE_TRADING=true
ENABLE_OPTIONS_TRADING=true
```

## Email System

The platform uses a sophisticated email queue system:

### Architecture
- **Queue Table**: `email_queue` with status tracking (pending, sent, failed)
- **Rate Limiting**: 2 requests/second for Resend API compliance
- **Retry Logic**: Automatic retry with exponential backoff (max 3 attempts)
- **Template Support**: Resend templates for professional emails
- **Monitoring**: Failed email tracking and admin dashboard

### Email Categories
- **Trading**: Order confirmations, execution alerts (via Resend)
- **Auth**: Welcome emails, password resets (via Brevo)
- **Support**: Customer support communications (via Brevo)

### Processing
- **Cron Job**: GitHub Actions workflow processes queue every 5 minutes
- **Edge Function**: `email-queue` function handles batch processing
- **Filtering**: Column comparison done in code (PostgREST limitation workaround)

## Database Schema

### Core Tables
- **profiles**: User profiles with privacy settings
- **alpaca_accounts**: Linked Alpaca brokerage accounts
- **copy_trading_subscriptions**: Copy trading relationships and allocations
- **leaderboard_stats**: Cached trader performance metrics
- **email_queue**: Email queue with retry logic
- **offline_trades**: Queued trades for offline sync

### Key Features
- **Row Level Security**: Enforced data access policies
- **Triggers**: Automatic leaderboard updates on trade execution
- **Functions**: `get_leaderboard_data()` for ranked trader list
- **Indexes**: Optimized queries for real-time performance

## Security

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Row Level Security (RLS) policies
- **API Keys**: Encrypted storage for sensitive credentials
- **CORS**: Configured for production domains
- **Rate Limiting**: API endpoint throttling
- **Input Validation**: Zod schemas for all user inputs
- **Audit Logging**: Comprehensive activity tracking

## Performance Optimizations

- **Code Splitting**: Manual chunks for vendor libraries
- **Asset Optimization**: Terser minification with tree shaking
- **Image Optimization**: Lazy loading and responsive images
- **Service Worker**: Aggressive caching strategy
- **Database Indexes**: Optimized query performance
- **WebSocket Pooling**: Efficient real-time connections
- **Edge Functions**: Global CDN distribution

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

This is a proprietary project. For internal development:

1. Create feature branch from `main`
2. Write tests for new features
3. Ensure all tests pass: `npm run test:run`
4. Submit PR with detailed description

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.
