/**
 * LEADTRADE - Social Copy Trading Platform
 * Copyright (c) 2025 doctor
 * 
 * Licensed under the Fair Source License.
 * Non-commercial use permitted. Commercial use requires a paid license.
 * See LICENSE file for details or contact license@leadtrade.app
 */

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
  - 44px minimum touch targets for accessibility compliance
  - Grid-based tab navigation with responsive columns (2/3/6 columns)
  - Responsive breakpoints: mobile (2 cols), tablet (3 cols), desktop (6 cols)
  - Touch gesture support in navigation components
  - Smart label display: critical tabs (Trade, Orders) always show full text
  - Equal-width tabs prevent layout shifts and ensure consistent UX
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

## Tech Stack

- **Frontend**: Astro + React + TypeScript + Tailwind CSS
- **UI**: shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Trading**: Alpaca Broker API
- **Auth**: Supabase Auth
- **Real-time**: WebSocket for market data
- **Deployment**: Cloudflare Pages

## API

All API endpoints are implemented as Supabase Edge Functions. Key endpoints:

- **Trading**: Orders, positions, market data
- **Account**: Account details, activities, documents
- **Funding**: ACH/bank relationships, transfers
- **Options**: Contracts search, exercise
- **Social**: Leaderboard, copy trading subscriptions
- **Corporate Actions**: Dividends, splits, etc.

See Edge Functions in `supabase/functions/` for implementation details.

## Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your Supabase and Alpaca credentials

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy Edge Functions
npm run deploy:functions
```

## Environment Variables

### Required
```env
# Supabase
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Alpaca Broker API (Sandbox)
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=your_key
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=your_secret

# Email Services
RESEND_API_KEY=your_resend_key
BREVO_API_KEY=your_brevo_key

# App Configuration
PUBLIC_APP_URL=https://leadtrade.app
NODE_ENV=production
```

### Optional
```env
# Feature Flags
PUBLIC_ENABLE_OPTIONS_TRADING=true
PUBLIC_ENABLE_COPY_TRADING=true
PUBLIC_ENABLE_CRYPTO_TRADING=false
```

See `.env.example` for complete configuration.

## Architecture

- **Frontend**: Astro + React + TypeScript
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Trading**: Alpaca Broker API
- **Auth**: Supabase Auth with JWT
- **Real-time**: WebSocket connections for market data
- **Email**: Resend + Brevo with queue system
- **Deployment**: Cloudflare Pages

## Security

- Row Level Security (RLS) on all database tables
- Encrypted API keys and credentials
- JWT-based authentication
- Input validation with Zod schemas

## Contributing

This is a proprietary project. For internal development:

1. Create feature branch from `main`
2. Write tests for new features
3. Ensure all tests pass: `npm run test:run`
4. Submit PR with detailed description

## License

See LICENSE file for details

## Support

For issues or questions, contact the development team.
