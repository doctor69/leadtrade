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

## Key Components

### Core Layout
- **AppShell**: Main application wrapper with theme provider, navigation, footer, and PWA install prompt
  - Responsive container with max-width constraints
  - Consistent padding across breakpoints (mobile: 4px, tablet: 6px, desktop: 8px)
  - Flex layout for sticky footer
  - Global CSS integration

### Navigation & Layout
- **NavigationBar**: Responsive navigation with mobile menu, theme customizer, and settings access
  - Desktop: Horizontal menu with active page indicators and underline animation
  - Mobile: Slide-down menu with touch gestures (swipe up to close)
  - Auth-aware: Shows different menu items based on login status
  - Real-time path tracking for active state highlighting
  - Integrated theme customizer dropdown (modal-like, 96rem width)
  - Session management with Supabase Auth
  - Backdrop blur overlay for mobile menu
  - Touch-optimized buttons (44px minimum)
  - Escape key support for closing mobile menu
  - Storage event listener for cross-tab login state sync
- **Footer**: Application footer with links and copyright information
- **ThemeProvider**: Global theme context provider with CSS variable management
- **ThemeCustomizer**: Advanced theme customization with color pickers and presets
- **SimpleThemeToggle**: Quick light/dark mode toggle

### Trading Components
- **TradingInterface**: Unified trading interface with responsive grid-based tab navigation
  - Responsive grid layout: 2 columns (mobile), 3 columns (tablet), 6 columns (desktop)
  - Mobile-optimized tabs with abbreviated labels (Trade, Port, Pos, Ord, Perf, Corp)
  - Desktop view shows full labels (Trade, Portfolio, Positions, Orders, Performance, Corp Actions)
  - Touch-friendly 44px minimum height for mobile accessibility
  - Grid-based layout ensures equal-width tabs and prevents overflow issues
  - Integrated account overview cards with portfolio value, buying power, cash, and day trade count
  - Real-time stock data fetching with URL parameter support (?symbol=AAPL)
  - Six main tabs: Trade (order entry + market grid), Portfolio (charts + summary), Positions, Orders, Performance, Corporate Actions
  - Consistent label display: "Trade" and "Orders" always show full text, others abbreviate on mobile
  - Security details card with symbol, price, change, and volume
  - Integrated AssetChart for price visualization
- **TradeForm**: Order entry with validation, market data, and execution
  - Support for market, limit, stop, and stop-limit orders
  - Real-time price validation
  - Buying power checks
  - Order preview and confirmation
- **Leaderboard**: Social trading discovery with search, filters, and trader profiles
  - Sortable columns (returns, win rate, trade count)
  - Trader profile modals with detailed statistics
  - Follow/unfollow functionality
  - Privacy-aware display (respects trader settings)
- **CopyTradingDashboard**: Manage copy trading subscriptions and allocations
  - Active subscription list with allocation percentages
  - Subscription management (pause, resume, cancel)
  - Performance tracking per subscription
- **OptionsExercise**: Options contract management and exercise functionality
- **OptionsSelector**: Options chain browser with strike/expiration selection
- **EventStreamFeed**: Real-time account event stream (trades, transfers, corporate actions)
  - Server-Sent Events (SSE) integration
  - Auto-reconnect on connection loss
  - Event filtering and categorization
- **SimpleMarketGrid**: Market overview grid for quick stock selection
  - Popular stocks with real-time prices
  - Click to select for trading
- **AccountPositions**: Real-time position tracking with P&L
  - Stock and options positions
  - Unrealized P&L calculations
  - Position closure actions
- **OrderHistory**: Complete order history with filtering and status tracking
  - Status badges (filled, pending, cancelled, rejected)
  - Order type and side indicators
  - Timestamp and execution details
- **PortfolioChart**: Historical portfolio performance visualization
  - Recharts integration
  - Multiple timeframes (1D, 1W, 1M, 3M, 1Y, ALL)
  - Equity curve with P&L overlay
- **AllCorporateActions**: Corporate action notifications and management
  - Dividend announcements
  - Stock splits
  - Merger/acquisition notices
- **TraderProfileModal**: Detailed trader statistics and follow button
- **TraderSelection**: Copy trading trader picker with search
- **SmartMarketData**: Intelligent market data fetching with fallback
- **RealTimeMarketData**: WebSocket-based live market data
- **SubscriptionManager**: WebSocket subscription management for market data
- **TradeNotifications**: Real-time trade execution notifications

### Account Components
- **SettingsPageContent**: Unified settings interface
  - Profile management
  - Privacy controls
  - Trading preferences
  - Notification settings
- **KYCVerificationPanel**: Identity verification with document upload
  - Supports ID, address verification, W-8BEN
  - File validation (JPEG, PNG, PDF up to 10MB)
  - Base64 encoding for secure upload
  - Upload status tracking with success/error states
  - Privacy and security notices
- **KYCCompletionForm**: Post-OAuth KYC completion flow
- **OAuthKYCForm**: OAuth-based KYC initiation
- **DocumentsPanel**: Access to statements, confirmations, and tax documents
  - Document type filtering (account statements, trade confirmations, tax documents)
  - Download functionality with progress indicators
  - Excludes internal document types (trade_confirmation_json, account_application)
  - FINRA/SEC compliance notices
- **DocumentUpload**: Reusable document upload component
- **KYCStatus**: Identity verification status display with badges
- **PDTStatusPanel**: Pattern Day Trader monitoring and removal
  - Current day trade count
  - PDT status indicator
  - Removal request functionality
- **FundingPageContent**: Bank linking, ACH/wire transfers, and funding history
  - ACH relationship management
  - Wire transfer instructions
  - Transfer history with status tracking
- **ACHTransferForm**: ACH transfer initiation
- **WireTransferForm**: Wire transfer details display
- **BankLinking**: Plaid integration for bank account linking
- **BankTransferModal**: Transfer confirmation modal
- **FundingWalletManager**: Instant funding wallet management
- **QuickSandboxFunding**: Quick funding for sandbox accounts
- **TransferHistory**: Transfer history table with filtering
- **TradingModeSwitch**: Toggle between paper and live trading
  - Confirmation dialog for mode switching
  - Account status validation

### Dashboard Components
- **PortfolioSummary**: Account overview with equity, buying power, and P&L
  - Real-time account data
  - Performance metrics
  - Asset allocation breakdown
- **AssetGrid**: Position grid with real-time prices and performance
  - Sortable columns
  - P&L calculations
  - Quick trade actions
- **AssetChart**: Individual asset price charts
  - Multiple timeframes
  - Technical indicators
  - Volume overlay
- **OptionsPositions**: Options-specific position display
  - Greeks display (delta, gamma, theta, vega)
  - Expiration tracking
  - Exercise functionality
- **CorporateActionImpacts**: Corporate action impact on portfolio
- **PortfolioTransferHistory**: Portfolio-level transfer history

### Admin Components
- **AuthVerificationDashboard**: Admin dashboard for auth verification
  - User verification queue
  - Approval/rejection workflow
  - Audit trail
- **FundingVerificationDashboard**: Admin dashboard for funding verification
  - Transfer verification queue
  - Fraud detection alerts
  - Manual review tools
- **TradingModeIndicator**: Display current trading mode (paper/live)
- **TradingModeSwitch** (Admin): Admin-level trading mode control

### Authentication Components
- **SupabaseSignInForm**: Email/password sign-in form
- **SupabaseSignUpForm**: Email/password sign-up form
- **EnhancedSupabaseSignUpForm**: Enhanced sign-up with additional fields
- **SignInForm**: Legacy sign-in form
- **ForgotPasswordForm**: Password reset request form
- **ResetPasswordForm**: Password reset completion form
- **ProtectedRoute**: Route guard for authenticated pages
- **HomePageRedirect**: Redirect logic for home page based on auth status

### PWA Components
- **PWAInstallPrompt**: Native app install prompt
  - Platform detection (iOS, Android, Desktop)
  - Install instructions
  - Dismissible with localStorage persistence
- **BackgroundSyncManager**: Background sync for offline trades
  - Queue management
  - Retry logic
  - Sync status indicators
- **OfflineStatusIndicator**: Network status indicator
  - Online/offline detection
  - Reconnection notifications
- **NotificationPermissionPrompt**: Push notification permission request
- **MobilePerformanceOptimizer**: Mobile-specific performance optimizations

### UI Components (shadcn/ui)
- **Alert**: Alert messages with variants
- **Avatar**: User avatar display
- **Badge**: Status badges with color variants
- **Button**: Primary UI button with variants and sizes
- **Card**: Content card container
- **Carousel**: Image/content carousel
- **Chart**: Recharts wrapper components
- **Checkbox**: Form checkbox
- **ColorPicker**: Color selection input
- **DataTable**: TanStack Table wrapper
- **Dialog**: Modal dialog
- **DropdownMenu**: Dropdown menu component
- **Input**: Text input field
- **Label**: Form label
- **Popover**: Popover overlay
- **Progress**: Progress bar
- **ScrollArea**: Scrollable container
- **Select**: Dropdown select
- **Separator**: Visual separator
- **Sheet**: Slide-out panel
- **Skeleton**: Loading skeleton
- **Slider**: Range slider
- **Switch**: Toggle switch
- **Table**: Data table
- **Tabs**: Tab navigation
- **Textarea**: Multi-line text input

### Utility Components
- **ErrorBoundary**: React error boundary for graceful error handling
- **ErrorDisplay**: Formatted error message display
- **LazyComponent**: Code-splitting wrapper
- **PerformanceDashboard**: Performance monitoring dashboard
- **UserSettings**: User preferences management
- **NotificationSettings**: Notification preferences

## API Endpoints

### Astro API Routes (src/pages/api)

#### Authentication
- `POST /api/auth/signin` - User sign-in with email/password
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signout` - User sign-out

#### Admin
- `GET /api/admin/auth-stats` - Authentication statistics dashboard
- `GET /api/admin/funding-stats` - Funding verification statistics

#### Test Accounts
- `POST /api/test-accounts/create` - Create test/sandbox accounts

### Supabase Edge Functions

#### Account Management
- `GET /alpaca-account` - Get account details
- `GET /alpaca-account-activities` - Get account activity history
- `POST /sync-alpaca-accounts` - Sync Alpaca account data

#### Trading
- `GET /alpaca-orders` - List orders
- `POST /alpaca-orders` - Create new order
- `PATCH /alpaca-orders/:id` - Modify order
- `DELETE /alpaca-orders/:id` - Cancel order
- `GET /alpaca-positions` - List positions
- `DELETE /alpaca-positions/:symbol` - Close position
- `POST /alpaca-advanced-orders` - Create advanced order types (bracket, OCO, OTO)
- `GET /alpaca-order-executions` - Get order execution details

#### Market Data
- `GET /alpaca-market-data-enhanced` - Enhanced market data with fallback
- `GET /alpaca-market-quotes` - Real-time quotes
- `GET /alpaca-assets` - List tradable assets
- `GET /alpaca-assets-search` - Search assets by symbol/name
- `GET /alpaca-calendar` - Market calendar (holidays, early closes)
- `GET /alpaca-clock` - Market clock (open/closed status)
- `GET /alpaca-portfolio-history` - Historical portfolio performance

#### Options Trading
- `GET /alpaca-options-contracts` - Search options contracts
- `POST /alpaca-options-exercise` - Exercise options contract
- `GET /alpaca-securities` - Get security details

#### Funding & Transfers
- `GET /alpaca-ach-relationships` - List ACH relationships
- `POST /alpaca-ach-relationships` - Create ACH relationship
- `DELETE /alpaca-ach-relationships/:id` - Remove ACH relationship
- `GET /alpaca-bank-relationships` - List bank relationships
- `POST /alpaca-bank-relationships` - Create bank relationship
- `DELETE /alpaca-bank-relationships/:id` - Remove bank relationship
- `GET /alpaca-transfers` - List transfers
- `POST /alpaca-transfers` - Create transfer
- `DELETE /alpaca-transfers/:id` - Cancel transfer
- `GET /alpaca-funding-wallets` - Get funding wallet details
- `POST /alpaca-instant-funding` - Request instant funding

#### Documents & KYC
- `GET /alpaca-documents` - List account documents
- `POST /alpaca-documents` - Upload document
- `GET /alpaca-kyc-cip` - Get KYC/CIP status
- `POST /alpaca-kyc-cip` - Submit KYC information
- `GET /alpaca-oauth` - OAuth flow initiation
- `POST /alpaca-oauth` - OAuth callback handling

#### Corporate Actions
- `GET /alpaca-corporate-actions` - List corporate actions
- `GET /alpaca-corporate-actions/:id` - Get corporate action details

#### Events & Streaming
- `GET /alpaca-events` - Server-Sent Events stream for account updates
- `GET /alpaca-events-test` - Test event stream endpoint

#### Portfolio Management
- `GET /alpaca-journals` - List journal entries
- `POST /alpaca-journals` - Create journal entry (transfer between accounts)
- `POST /alpaca-rebalancing` - Rebalance portfolio
- `GET /alpaca-reports` - Generate account reports
- `GET /alpaca-risk-management` - Risk metrics and analysis

#### Pattern Day Trading
- `POST /alpaca-pdt-removal` - Request PDT flag removal

#### Social Trading
- `GET /get-leaderboard` - Get ranked trader leaderboard
- `GET /copy-trading-subscriptions` - List copy trading subscriptions
- `POST /copy-trading-subscriptions` - Create subscription
- `PATCH /copy-trading-subscriptions/:id` - Update subscription
- `DELETE /copy-trading-subscriptions/:id` - Cancel subscription
- `POST /execute-copy-trades` - Execute copy trades for followers
- `POST /update-leaderboard-stats` - Update leaderboard statistics

#### Email System
- `POST /send-email` - Send email via Resend/Brevo
- `POST /email-queue` - Process email queue
- `GET /email-queue` - Get email queue status

#### Utilities
- `GET /alpaca-broker-status` - Broker API status check
- `POST /check-user-exists` - Check if user exists
- `POST /streamlined-signup` - Streamlined account creation flow
- `POST /test-accounts-create` - Create test accounts (Edge Function version)

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
# Development build
npm run build            # Standard build, outputs to dist/

# Environment-specific builds
npm run build:test       # Build for test environment
npm run build:prod       # Build for production environment

# Build PWA
npm run build:pwa        # Optimized PWA build

# Preview builds
npm run preview          # Preview standard build
npm run preview:test     # Preview test build
npm run preview:prod     # Preview production build

# Deploy Edge Functions
npm run deploy:functions              # Deploy to default project
npm run deploy:functions:test         # Deploy to test project
npm run deploy:functions:prod         # Deploy to production project

# Deploy to production
npm run deploy:full                   # Functions + static assets (default)
npm run deploy:full:prod              # Functions + static assets (production)
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
- **Mobile Performance**: 
  - Responsive breakpoints (xs: 475px, sm: 640px, md: 768px, lg: 1024px)
  - Conditional rendering for mobile vs desktop layouts
  - Grid-based tab navigation with responsive columns for optimal mobile UX
  - Touch-optimized UI elements (44px minimum height)
  - Equal-width tabs prevent layout shifts and ensure consistent experience

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

See LICENSE file for details

## Support

For issues or questions, contact the development team.
