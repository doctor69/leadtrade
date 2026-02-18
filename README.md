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
- **Corporate Actions**: Dividend tracking, stock splits, and merger notifications

### Social Trading
- **Leaderboard System**: Discover top-performing traders ranked by returns, win rate, and trade volume
- **Copy Trading**: Mirror trades from successful traders with customizable allocation (1-100%)
- **Privacy Controls**: Traders can control visibility of portfolio amounts and trade sharing
- **Follower Management**: Track followers and manage copy trading subscriptions
- **Performance Metrics**: Detailed statistics including win rate, total return, and trade count
- **Trader Profiles**: View detailed trader statistics and trading history

### Account Management
- **KYC/CIP Integration**: Streamlined identity verification via Alpaca's compliance system
- **Profile Management**: Edit contact information, address, and trusted contacts
- **Bank Linking**: ACH and wire transfer support for funding accounts
- **Document Management**: Upload identity documents, access statements and confirmations
- **PDT Status**: Pattern Day Trader status monitoring and removal requests
- **Funding Wallets**: Instant funding and transfer history tracking
- **Trading Configuration**: Customize trading preferences and risk settings

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
- **Theme Customization**: Light/dark mode with customizable color schemes

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
│   │   ├── account/        # Account management components
│   │   │   ├── ACHTransferForm.tsx        # ACH bank transfer form
│   │   │   ├── BankLinking.tsx            # Bank account linking
│   │   │   ├── BankTransferModal.tsx      # Transfer modal dialog
│   │   │   ├── DocumentUpload.tsx         # Identity document upload
│   │   │   ├── DocumentsPanel.tsx         # Account documents viewer
│   │   │   ├── EditProfilePanel.tsx       # Profile editing (NEW)
│   │   │   ├── FundingPageContent.tsx     # Funding page layout
│   │   │   ├── FundingWalletManager.tsx   # Wallet management
│   │   │   ├── KYCStatus.tsx              # KYC verification status
│   │   │   ├── KYCVerificationPanel.tsx   # KYC submission form
│   │   │   ├── PDTStatusPanel.tsx         # Pattern Day Trader status
│   │   │   ├── QuickSandboxFunding.tsx    # Sandbox funding shortcuts
│   │   │   ├── SettingsPageContent.tsx    # Settings page layout
│   │   │   ├── TradingModeSwitch.tsx      # Paper/Live mode toggle
│   │   │   ├── TransferHistory.tsx        # Transfer history table
│   │   │   └── WireTransferForm.tsx       # Wire transfer form
│   │   ├── admin/          # Admin dashboards
│   │   │   ├── AuthVerificationDashboard.tsx  # User verification admin
│   │   │   ├── FundingVerificationDashboard.tsx # Funding admin
│   │   │   ├── TradingModeIndicator.tsx   # Mode display
│   │   │   └── TradingModeSwitch.tsx      # Admin mode control
│   │   ├── dashboard/      # Portfolio views
│   │   │   ├── AssetChart.tsx             # Individual asset charts
│   │   │   ├── AssetGrid.tsx              # Asset grid display
│   │   │   ├── CorporateActionImpacts.tsx # Corporate action alerts
│   │   │   ├── OptionsPositions.tsx       # Options holdings
│   │   │   ├── PortfolioSummary.tsx       # Portfolio overview
│   │   │   └── PortfolioTransferHistory.tsx # Transfer log
│   │   ├── trading/        # Trading interfaces
│   │   │   ├── AccountPositions.tsx       # Current positions
│   │   │   ├── AllCorporateActions.tsx    # Corporate actions feed
│   │   │   ├── AlpacaBrokerDashboard.tsx  # Broker integration
│   │   │   ├── CopyTradingDashboard.tsx   # Copy trading UI
│   │   │   ├── CorporateActionNotifications.tsx # Action alerts
│   │   │   ├── EventStreamFeed.tsx        # Real-time events
│   │   │   ├── Leaderboard.tsx            # Trader rankings
│   │   │   ├── OptionsExercise.tsx        # Options exercise UI
│   │   │   ├── OptionsSelector.tsx        # Options chain browser
│   │   │   ├── OrderHistory.tsx           # Order history table
│   │   │   ├── PortfolioChart.tsx         # Portfolio performance
│   │   │   ├── RealTimeMarketData.tsx     # Live market quotes
│   │   │   ├── SmartMarketData.tsx        # Market data with fallback
│   │   │   ├── TradeForm.tsx              # Order entry form
│   │   │   ├── TradeNotifications.tsx     # Trade alerts
│   │   │   ├── TraderProfileModal.tsx     # Trader detail view
│   │   │   ├── TraderSelection.tsx        # Copy trader picker
│   │   │   └── TradingInterface.tsx       # Main trading UI
│   │   ├── ui/             # Reusable UI components (shadcn/ui)
│   │   │   ├── alert.tsx, avatar.tsx, badge.tsx, button.tsx
│   │   │   ├── card.tsx, carousel.tsx, chart.tsx, checkbox.tsx
│   │   │   ├── dialog.tsx, dropdown-menu.tsx, input.tsx, label.tsx
│   │   │   ├── select.tsx, sheet.tsx, slider.tsx, switch.tsx
│   │   │   ├── table.tsx, tabs.tsx, textarea.tsx
│   │   │   ├── ErrorDisplay.tsx           # Error boundary UI
│   │   │   ├── NotificationSettings.tsx   # Notification prefs
│   │   │   ├── ThemeCustomizer.tsx        # Theme editor
│   │   │   └── UserSettings.tsx           # User preferences
│   │   ├── settings/       # Settings components
│   │   │   └── OptionsTradingSettings.tsx # Options config
│   │   ├── AppShell.tsx               # Main app layout
│   │   ├── BackgroundSyncManager.tsx  # Offline sync
│   │   ├── ErrorBoundary.tsx          # Error handling
│   │   ├── Footer.tsx                 # App footer
│   │   ├── HomePageRedirect.tsx       # Landing redirect
│   │   ├── MetaTags.astro             # SEO meta tags
│   │   ├── OfflineStatusIndicator.tsx # Offline indicator
│   │   ├── ProtectedRoute.tsx         # Auth guard
│   │   ├── PWAInstallPrompt.tsx       # PWA install banner
│   │   ├── ThemeProvider.tsx          # Theme context
│   │   └── ThemeToggle.tsx            # Light/dark toggle
│   ├── lib/                # Core business logic
│   │   ├── alpaca-account.ts          # Account management
│   │   ├── alpaca-ach-relationships.ts # ACH transfers
│   │   ├── alpaca-bank-relationships.ts # Bank linking
│   │   ├── alpaca-broker-client.ts    # Broker API client
│   │   ├── alpaca-corporate-actions.ts # Corporate actions
│   │   ├── alpaca-documents.ts        # Document management
│   │   ├── alpaca-events.ts           # Event streaming
│   │   ├── alpaca-funding-wallets.ts  # Wallet management
│   │   ├── alpaca-instant-funding.ts  # Instant deposits
│   │   ├── alpaca-journals.ts         # Journal entries
│   │   ├── alpaca-kyc-cip.ts          # KYC/CIP verification
│   │   ├── alpaca-oauth.ts            # OAuth integration
│   │   ├── alpaca-options-contracts.ts # Options data
│   │   ├── alpaca-rebalancing.ts      # Portfolio rebalancing
│   │   ├── alpaca-reports.ts          # Account reports
│   │   ├── alpaca-transfers.ts        # Transfer management
│   │   ├── alpaca.tsx                 # Main Alpaca client
│   │   ├── api-middleware.ts          # API middleware
│   │   ├── api.ts                     # API utilities
│   │   ├── apiService.ts              # Service layer
│   │   ├── auth.ts                    # Authentication
│   │   ├── cache.ts                   # Caching layer
│   │   ├── copy-trading-service.ts    # Copy trading logic
│   │   ├── database.ts                # Supabase client
│   │   ├── email/                     # Email services
│   │   │   ├── index.ts               # Email exports
│   │   │   ├── monitoring.ts          # Email monitoring
│   │   │   ├── queue.ts               # Email queue
│   │   │   ├── service.ts             # Email service
│   │   │   ├── templates/             # Email templates
│   │   │   └── types.ts               # Email types
│   │   ├── encryption.ts              # Data encryption
│   │   ├── error-handler.ts           # Error handling
│   │   ├── market-data-fallback.ts    # Market data fallback
│   │   ├── market-data-service.ts     # Market data client
│   │   ├── monitoring.ts              # Performance monitoring
│   │   ├── notification-service.ts    # Push notifications
│   │   ├── offline-storage.ts         # Offline storage
│   │   ├── offline-sync.ts            # Sync manager
│   │   ├── portfolio-calculator.ts    # Portfolio math
│   │   ├── security-middleware.ts     # Security layer
│   │   ├── signup-service.ts          # Account creation
│   │   ├── theme-manager.ts           # Theme management
│   │   ├── trade-execution-engine.ts  # Trade execution
│   │   ├── trading-config.ts          # Trading configuration
│   │   ├── validation.ts              # Input validation
│   │   ├── websocket-client.ts        # WebSocket client
│   │   ├── websocket-service.ts       # WebSocket service
│   │   └── __tests__/                 # Test suite (70+ files)
│   ├── pages/              # Astro pages and API routes
│   │   ├── api/            # API endpoints
│   │   │   ├── admin/      # Admin APIs
│   │   │   │   ├── auth-stats.ts      # Auth statistics
│   │   │   │   └── funding-stats.ts   # Funding statistics
│   │   │   ├── alpaca/     # Alpaca proxy endpoints
│   │   │   │   ├── events/ # Event streaming
│   │   │   │   └── reports/ # Report generation
│   │   │   ├── auth/       # Authentication endpoints
│   │   │   │   ├── signin.ts          # Sign in
│   │   │   │   ├── signout.ts         # Sign out
│   │   │   │   └── signup.ts          # Sign up
│   │   │   ├── test-accounts/ # Test account creation
│   │   │   │   └── create.ts
│   │   │   ├── email/      # Email endpoints (reserved)
│   │   │   ├── support/    # Support endpoints (reserved)
│   │   │   └── webhooks/   # Webhook handlers (reserved)
│   │   ├── admin/          # Admin pages
│   │   │   ├── auth-verification.astro # User verification
│   │   │   └── funding-verification.astro # Funding verification
│   │   ├── auth/           # Auth pages
│   │   │   └── callback.astro         # OAuth callback
│   │   ├── 404.astro               # Not found page
│   │   ├── dashboard.astro         # Portfolio dashboard
│   │   ├── doctor.astro            # System diagnostics
│   │   ├── forgot-password.astro   # Password reset request
│   │   ├── funding.astro           # Funding management
│   │   ├── index.astro             # Landing page
│   │   ├── leaderboard.astro       # Social leaderboard
│   │   ├── reset-password.astro    # Password reset form
│   │   ├── settings.astro          # Account settings
│   │   ├── signin.astro            # Sign in page
│   │   ├── signup.astro            # Sign up page
│   │   ├── theme-customizer.astro  # Theme editor
│   │   └── trade.astro             # Trading interface
│   ├── hooks/              # React hooks
│   │   ├── useAlpacaBroker.ts         # Broker API hook
│   │   ├── useAlpacaEvents.ts         # Event streaming hook
│   │   ├── useAlpacaWebSocket.ts      # WebSocket hook
│   │   ├── useMarketDataWithFallback.ts # Market data hook
│   │   ├── useOfflineStatus.ts        # Offline detection
│   │   ├── useOfflineSync.ts          # Sync hook
│   │   ├── useTradeNotifications.ts   # Notification hook
│   │   └── useTradingMode.ts          # Trading mode hook
│   ├── types/              # TypeScript type definitions
│   │   ├── documents.ts               # Document types
│   │   ├── kyc.ts                     # KYC types
│   │   ├── oauth.ts                   # OAuth types
│   │   └── trading.ts                 # Trading types
│   ├── layouts/            # Astro layouts
│   │   └── Layout.astro               # Base layout
│   └── styles/             # Global styles
│       └── global.css                 # Global CSS
├── supabase/
│   ├── functions/          # Edge Functions (40+ endpoints)
│   │   ├── _shared/        # Shared utilities
│   │   │   ├── alpaca-client.ts       # Alpaca client
│   │   │   ├── auth.ts                # Auth helpers
│   │   │   ├── cors.ts                # CORS handling
│   │   │   ├── email-helper.ts        # Email utilities
│   │   │   ├── email-queue-helper.ts  # Queue helpers
│   │   │   ├── error-handling.ts      # Error handling
│   │   │   ├── logging.ts             # Logging utilities
│   │   │   ├── rate-limit.ts          # Rate limiting
│   │   │   ├── response.ts            # Response helpers
│   │   │   └── websocket-manager.ts   # WebSocket manager
│   │   ├── alpaca-account/            # Account management (GET)
│   │   ├── alpaca-account-update/     # Account updates (PATCH)
│   │   ├── alpaca-account-activities/ # Account activities
│   │   ├── alpaca-ach-relationships/  # ACH relationships
│   │   ├── alpaca-assets/             # Asset data
│   │   ├── alpaca-bank-relationships/ # Bank relationships
│   │   ├── alpaca-calendar/           # Market calendar
│   │   ├── alpaca-clock/              # Market clock
│   │   ├── alpaca-corporate-actions/  # Corporate actions
│   │   ├── alpaca-documents/          # Document management
│   │   ├── alpaca-events/             # Event streaming
│   │   ├── alpaca-funding-wallets/    # Funding wallets
│   │   ├── alpaca-instant-funding/    # Instant funding
│   │   ├── alpaca-journals/           # Journal entries
│   │   ├── alpaca-kyc-cip/            # KYC/CIP
│   │   ├── alpaca-market-data-enhanced/ # Market data
│   │   ├── alpaca-oauth/              # OAuth
│   │   ├── alpaca-options-contracts/  # Options contracts
│   │   ├── alpaca-options-exercise/   # Options exercise
│   │   ├── alpaca-orders/             # Order management
│   │   ├── alpaca-pdt-removal/        # PDT removal
│   │   ├── alpaca-portfolio-history/  # Portfolio history
│   │   ├── alpaca-positions/          # Positions
│   │   ├── alpaca-rebalancing/        # Rebalancing
│   │   ├── alpaca-reports/            # Reports
│   │   ├── alpaca-transfers/          # Transfers
│   │   ├── check-user-exists/         # User lookup
│   │   ├── copy-trading-subscriptions/ # Copy trading
│   │   ├── email-queue/               # Email processing
│   │   ├── execute-copy-trades/       # Trade execution
│   │   ├── get-leaderboard/           # Leaderboard data
│   │   ├── send-email/                # Email sending
│   │   ├── streamlined-signup/        # Account creation
│   │   ├── sync-alpaca-accounts/      # Account sync
│   │   ├── test-accounts-create/      # Test accounts
│   │   └── update-leaderboard-stats/  # Stats update
│   ├── schema.sql          # Database schema
│   └── seed_data.sql       # Seed data for development
├── public/                 # Static assets
│   ├── sw.js              # Service worker
│   ├── manifest.json      # PWA manifest
│   ├── config.js          # Public config
│   ├── icons/             # App icons (72x72 to 512x512)
│   ├── screenshots/       # PWA screenshots
│   ├── social/            # Social media images
│   └── _redirects         # Cloudflare redirects
├── scripts/               # Build and deployment scripts
│   ├── cleanup-api-build.js       # Build cleanup
│   └── reset-failed-emails.js     # Email queue reset
├── .env.example           # Environment template
├── astro.config.mjs       # Astro configuration
├── components.json        # shadcn/ui config
├── package.json           # Dependencies
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
└── vitest.config.ts       # Test configuration
```

## Key Components

### Account Management (`src/components/account/`)
- **KYCVerificationPanel**: Submit identity verification documents and information
- **KYCStatus**: Display current KYC verification status and next steps
- **DocumentsPanel**: View and download account statements, confirmations, and tax documents
- **PDTStatusPanel**: Monitor Pattern Day Trader status and request removal
- **BankLinking**: Link bank accounts for ACH transfers
- **ACHTransferForm**: Initiate ACH deposits and withdrawals
- **WireTransferForm**: Generate wire transfer instructions
- **FundingWalletManager**: Manage funding wallets and instant deposits
- **TransferHistory**: View transfer history with status tracking
- **TradingModeSwitch**: Toggle between paper and live trading modes
- **SettingsPageContent**: Main settings page layout with user preferences, KYC status, and document management
- **EditProfilePanel**: Standalone profile editor for contact information, address, and trusted contacts (alternative to integrated UserSettings editor)

### Trading Components (`src/components/trading/`)
- **TradingInterface**: Main trading dashboard with order entry and positions
- **TradeForm**: Order entry form with validation (market, limit, stop orders)
- **AccountPositions**: Real-time position tracking with P&L
- **OrderHistory**: Order history table with filtering and sorting
- **OptionsSelector**: Options chain browser with strike/expiry selection
- **OptionsExercise**: Exercise options positions
- **Leaderboard**: Social trading leaderboard with trader rankings
- **CopyTradingDashboard**: Manage copy trading subscriptions
- **TraderProfileModal**: View detailed trader statistics and performance
- **RealTimeMarketData**: Live market quotes via WebSocket
- **SmartMarketData**: Market data with automatic fallback handling
- **PortfolioChart**: Portfolio performance visualization
- **CorporateActionNotifications**: Alerts for dividends, splits, etc.
- **EventStreamFeed**: Real-time account event feed

### Dashboard Components (`src/components/dashboard/`)
- **PortfolioSummary**: Portfolio overview with key metrics
- **AssetGrid**: Grid view of portfolio holdings
- **AssetChart**: Individual asset performance charts
- **OptionsPositions**: Options holdings with Greeks
- **CorporateActionImpacts**: Corporate action impact analysis
- **PortfolioTransferHistory**: Transfer log with filtering

### UI Components (`src/components/ui/`)
- **shadcn/ui primitives**: button, card, dialog, dropdown, input, select, table, tabs, etc.
- **ThemeCustomizer**: Visual theme editor with color picker
- **UserSettings**: User preferences, privacy controls, and profile editing with Alpaca account integration
- **NotificationSettings**: Configure push notification preferences
- **ErrorDisplay**: Consistent error message display
- **LazyComponent**: Code-splitting wrapper for performance

### Core Services (`src/lib/`)
- **apiService**: Centralized API client with error handling
- **alpaca-broker-client**: Main Alpaca Broker API client
- **copy-trading-service**: Copy trading logic and execution
- **trade-execution-engine**: Order execution with validation
- **market-data-service**: Market data fetching and caching
- **websocket-service**: WebSocket connection management
- **email/service**: Email sending with queue and retry
- **auth**: Authentication and session management
- **database**: Supabase client with type safety
- **encryption**: Sensitive data encryption
- **validation**: Input validation with Zod schemas

## API Endpoints

### Frontend API Routes (`src/pages/api/`)

#### Authentication (`/api/auth/`)
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in with email/password
- `POST /api/auth/signout` - Sign out current user

#### Admin (`/api/admin/`)
- `GET /api/admin/auth-stats` - User authentication statistics
- `GET /api/admin/funding-stats` - Funding verification statistics

#### Test Accounts (`/api/test-accounts/`)
- `POST /api/test-accounts/create` - Create test trading account

### Supabase Edge Functions (`supabase/functions/`)

#### Account Management
- `alpaca-account` - Get account details
- `alpaca-account-update` - Update account contact information and trusted contacts (PATCH)
- `alpaca-account-activities` - Fetch account activities
- `alpaca-kyc-cip` - KYC/CIP verification submission
- `alpaca-documents` - Upload/retrieve documents
- `alpaca-pdt-removal` - Request PDT status removal

#### Trading
- `alpaca-orders` - Create, modify, cancel orders
- `alpaca-positions` - Get current positions
- `alpaca-portfolio-history` - Portfolio performance history
- `alpaca-options-contracts` - Search options chains
- `alpaca-options-exercise` - Exercise options positions
- `alpaca-market-data-enhanced` - Real-time market data
- `alpaca-assets` - Asset search and details
- `alpaca-calendar` - Market calendar
- `alpaca-clock` - Market hours and status

#### Funding
- `alpaca-ach-relationships` - Manage ACH relationships
- `alpaca-bank-relationships` - Manage bank relationships
- `alpaca-transfers` - Create and track transfers
- `alpaca-funding-wallets` - Manage funding wallets
- `alpaca-instant-funding` - Instant deposit requests

#### Social Trading
- `get-leaderboard` - Fetch trader leaderboard
- `copy-trading-subscriptions` - Manage subscriptions
- `execute-copy-trades` - Execute copy trades
- `update-leaderboard-stats` - Update trader statistics

#### Corporate Actions
- `alpaca-corporate-actions` - Fetch corporate actions
- `alpaca-journals` - Journal entries for corporate actions

#### Reports & Analytics
- `alpaca-reports` - Generate account reports
- `alpaca-rebalancing` - Portfolio rebalancing

#### System
- `alpaca-events` - Server-sent events stream
- `alpaca-oauth` - OAuth integration
- `streamlined-signup` - Streamlined account creation
- `sync-alpaca-accounts` - Sync account data
- `email-queue` - Process email queue
- `send-email` - Send transactional emails
- `check-user-exists` - User lookup

All Edge Functions include:
- JWT authentication via Supabase Auth
- CORS handling for cross-origin requests
- Rate limiting to prevent abuse
- Comprehensive error handling and logging
- Request/response validation

## Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your Supabase and Alpaca credentials

# Start local Supabase (optional, for local development)
npm run supabase:start

# Start dev server
npm run dev

# Run tests
npm run test        # Watch mode
npm run test:run    # Single run

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy Edge Functions
npm run deploy:functions

# Database operations
npm run db:push     # Push schema changes
npm run db:reset    # Reset database
npm run db:migrate  # Run migrations
npm run db:seed     # Seed data
```

## Testing

The project includes a comprehensive test suite with 70+ test files covering:

- **Unit Tests**: Individual functions and utilities
- **Integration Tests**: API endpoints and services
- **Component Tests**: React component behavior
- **E2E Tests**: Complete user flows (signup, trading, copy trading)
- **Performance Tests**: Load testing and optimization

Key test files:
- `src/lib/__tests__/` - Core business logic tests
- `supabase/functions/_shared/__tests__/` - Edge function tests
- Test utilities in `src/lib/__tests__/test-utils.ts`

Run specific test suites:
```bash
npm run test:signup          # Signup flow tests
npm run test:functions       # Edge function tests
npm run test:performance     # Performance tests
npm run test:database-setup  # Database tests
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

### Frontend Architecture
- **Framework**: Astro 5.15+ for static site generation with islands architecture
- **UI Library**: React 19 with TypeScript for interactive components
- **Styling**: Tailwind CSS v4 with custom design system
- **State Management**: React hooks and context for local state
- **Routing**: Astro file-based routing with dynamic routes
- **Code Splitting**: Automatic code splitting via Astro islands

### Backend Architecture
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **API Layer**: Supabase Edge Functions (Deno runtime)
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: WebSocket connections for market data and events
- **Caching**: Multi-layer caching (browser, service worker, API)
- **Queue System**: Database-backed queue for email and background jobs

### Trading Infrastructure
- **Broker Integration**: Alpaca Markets Broker API
- **Market Data**: Alpaca Market Data API with WebSocket streaming
- **Order Execution**: Trade execution engine with validation
- **Copy Trading**: Event-driven copy trading system
- **Risk Management**: Position limits and validation

### Security Architecture
- **Authentication**: JWT-based with secure httpOnly cookies
- **Authorization**: Row Level Security on all database tables
- **Encryption**: AES-256 encryption for sensitive data
- **API Security**: Rate limiting, CORS, input validation
- **Compliance**: KYC/CIP integration with Alpaca

### Data Flow
1. **User Action** → React Component
2. **Component** → API Service Layer (`apiService.ts`)
3. **API Service** → Supabase Edge Function
4. **Edge Function** → Alpaca Broker API
5. **Response** → Edge Function → API Service → Component
6. **Real-time Updates** → WebSocket → Component State

### Deployment Architecture
- **Frontend**: Cloudflare Pages (CDN + Edge)
- **Backend**: Supabase (managed PostgreSQL + Edge Functions)
- **Assets**: Cloudflare CDN with aggressive caching
- **Service Worker**: Offline-first PWA with background sync

## Security

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication via Supabase Auth
- **Row Level Security**: PostgreSQL RLS policies on all tables
- **Session Management**: Secure session handling with automatic refresh
- **OAuth Integration**: Alpaca OAuth for account linking

### Data Protection
- **Encryption at Rest**: AES-256 encryption for sensitive data (API keys, credentials)
- **Encryption in Transit**: TLS 1.3 for all API communications
- **PII Handling**: Secure handling of personally identifiable information
- **Credential Storage**: Encrypted storage in Supabase with service role access only

### API Security
- **Rate Limiting**: Request throttling to prevent abuse
- **CORS Configuration**: Strict CORS policies for API endpoints
- **Input Validation**: Zod schema validation on all inputs
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Protection**: Content Security Policy and input sanitization

### Compliance
- **KYC/CIP**: Identity verification via Alpaca's compliance system
- **Audit Logging**: Comprehensive audit trail for all transactions
- **Data Privacy**: GDPR-compliant data handling
- **Financial Regulations**: SEC and FINRA compliance via Alpaca

### Best Practices
- **Principle of Least Privilege**: Minimal permissions for all operations
- **Secure Defaults**: Security-first configuration
- **Regular Updates**: Dependency updates and security patches
- **Error Handling**: Secure error messages without sensitive data exposure

## Contributing

This is a proprietary project under the Fair Source License. For internal development:

### Development Workflow
1. Create feature branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes and write tests
   - Add unit tests for new functions
   - Add integration tests for API endpoints
   - Add component tests for UI changes

3. Run test suite
   ```bash
   npm run test:run
   ```

4. Check for type errors
   ```bash
   npm run astro check
   ```

5. Build and verify
   ```bash
   npm run build
   npm run preview
   ```

6. Submit PR with detailed description
   - Describe the changes and motivation
   - Include screenshots for UI changes
   - Reference any related issues

### Code Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS utility classes
- **Testing**: Vitest for unit/integration tests
- **Linting**: Follow existing code style
- **Comments**: Document complex logic and business rules

### Commit Messages
Follow conventional commits format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or tooling changes

### Pull Request Guidelines
- Keep PRs focused and reasonably sized
- Update documentation for new features
- Ensure all tests pass
- Add migration scripts for database changes
- Update environment variable documentation if needed

## License

See LICENSE file for details

## Recent Updates

### Profile Editing Integration (Latest)
✅ Enhanced UserSettings component with profile editing
- Integrated Alpaca account profile editing directly into UserSettings
- Edit contact information (email, phone, address)
- Update trusted contact details
- Real-time sync with Alpaca Broker API via `alpaca-account-update` Edge Function
- Form validation and error handling
- Cancel/save functionality with state management
- Standalone `EditProfilePanel` component available as alternative implementation

### Settings Page Refinement
✅ Streamlined settings page layout
- Focused on core account management features
- KYC verification status and submission
- Document management and viewing
- PDT status monitoring
- User preferences and privacy controls

### Enhanced 404 Page
✅ Improved 404 error page with better UX
- Clear error messaging
- Quick navigation to home and dashboard
- SEO-optimized meta tags
- Responsive design

### Account Management Features
✅ Comprehensive account settings interface
- KYC verification status tracking
- Document upload and management
- PDT status monitoring
- Bank account linking
- Transfer history tracking
- Trading mode switching (paper/live)

### Social Trading Features
✅ Copy trading system with leaderboard
- Real-time trader rankings
- Customizable copy trading allocations
- Privacy controls for traders
- Performance metrics and analytics

### Progressive Web App
✅ Full PWA implementation
- Offline support with service worker
- Install prompts for mobile and desktop
- Background sync for queued operations
- Push notifications for trade alerts

## Support

For issues or questions, contact the development team at support@leadtrade.app
