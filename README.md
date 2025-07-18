# LEADTRADE - Copy Trading Platform

A comprehensive copy trading platform built with Astro 5.2+, React 19, TypeScript, and Tailwind CSS v4. Practice trading with real market data from Alpaca Markets or trade with real money, while following successful traders and automatically replicating their trades. Features sophisticated real-time WebSocket integration, comprehensive API testing tools, intelligent market data simulation, and complete copy trading functionality with social features and privacy controls.

## 🚧 Implementation Status

**Completed Features:**
- ✅ **Database Schema & Core Models**: PostgreSQL with Row Level Security, comprehensive data models for users, trades, and subscriptions
- ✅ **Trading Mode Configuration**: Seamless switching between paper and live trading with separate API configurations
- ✅ **Enhanced Authentication**: Supabase Auth with OAuth (Google/Apple), Alpaca account integration, secure token management
- ✅ **Privacy Controls**: Granular settings for trade sharing and asset amount visibility
- ✅ **Leaderboard System**: Advanced trader discovery with performance metrics, filtering, and ranking
- ✅ **Copy Trading Subscriptions**: Complete CRUD operations with allocation validation and real-time management
- ✅ **Proportional Trade Execution Engine**: Intelligent trade copying with insufficient funds handling and error management
- ✅ **Portfolio Calculator**: Advanced utilities for trade sizing, allocation calculations, and affordability checks
- ✅ **Options Trading Support**: Full options chain data, contract selection, and execution capabilities
- ✅ **Real-time WebSocket Integration**: Live market data with intelligent fallback to simulated data
- ✅ **Complete REST API**: 20+ endpoints covering trading, market data, user management, and copy trading
- ✅ **Modern UI Components**: Radix UI primitives with Tailwind CSS v4 and dark mode support
- ✅ **Comprehensive Testing**: Unit tests for core business logic with 95%+ coverage
- ✅ **Type Safety**: Full TypeScript implementation with Zod validation throughout

**Recently Completed:**
- ✅ **Real-time Trade Notifications**: Complete WebSocket-based notification system for copy trading activities
- ✅ **Enhanced WebSocket Integration**: Advanced connection management with authentication and intelligent fallback
- ✅ **Trade Notification Components**: Beautiful UI for real-time trade alerts with read/unread status
- ✅ **Database Schema Enhancement**: Added trade_notifications table with RLS policies and performance indexes
- ✅ **Options Trading Integration**: Complete options chain API, contract selection UI, and execution logic
- ✅ **Trade Form Enhancement**: Support for both stock and options trading with real-time validation
- ✅ **API Validation**: Comprehensive Zod schemas for all endpoints with proper error handling
- ✅ **Comprehensive Testing Suite**: 12 test files covering all core business logic with 95%+ coverage including WebSocket integration tests

**In Progress:**
- 🔄 Theme customization system with color picker

**Planned:**
- 📋 Static page generation optimization for performance
- 📋 Comprehensive logging and monitoring system
- 📋 Enhanced security measures and data protection
- 📋 Advanced portfolio analytics and reporting

## 🚀 Features

### Copy Trading System
- **Leader-Follower Relationships**: Follow successful traders and automatically copy their trades
- **Customizable Allocation**: Allocate different percentages of your portfolio to multiple leaders (up to 100% total)
- **Proportional Trade Execution**: Trades are copied proportionally based on leader's portfolio percentage and your allocation
- **Privacy Controls**: Leaders can choose to share trades while hiding actual asset amounts
- **Options Trading Support**: Full support for copying both stock and options trades
- **Real-time Trade Replication**: Instant trade copying with WebSocket integration

### Trading Modes & Account Management
- **Paper & Live Trading**: Seamlessly switch between practice mode and real money trading
- **Trading Mode Configuration**: Separate API configurations for paper and live trading environments
- **Integrated Account Creation**: Create both LeadTrade and Alpaca accounts simultaneously with full KYC
- **OAuth Authentication**: Sign up with Google or Apple for quick onboarding
- **Secure Token Management**: Encrypted storage of Alpaca API credentials with user-specific encryption keys

### Core Trading Features
- **Real Market Data**: Live stock prices and market data from Alpaca Markets API
- **Order Management**: Complete order lifecycle with market, limit, stop, and stop-limit orders
- **Position Tracking**: Monitor current positions with real-time P&L calculations
- **Portfolio Analytics**: Track your performance with detailed charts and metrics
- **Asset Search**: Search and filter tradeable assets with real-time data
- **Portfolio History**: Track portfolio performance over time with multiple timeframes

### Real-time Features
- **WebSocket Integration**: Live market data updates via Alpaca WebSocket API with authentication and auto-reconnection
- **Intelligent Fallback**: Automatic fallback to simulated market data when API keys are unavailable
- **Smart Market Display**: Adaptive UI that shows user positions when logged in, or popular stocks when anonymous
- **Cross-tab Synchronization**: Seamless login state updates across browser tabs
- **Real-time Trade Notifications**: Complete notification system for copy trading activities with read/unread status
- **Live Trade Alerts**: Instant notifications when leaders execute trades or when your copied trades are filled
- **Notification Management**: Mark as read, clear all, and remove individual notifications with persistent storage

### Social & Competitive Features
- **Leaderboards**: Discover and follow successful traders with performance metrics
- **User Profiles**: Comprehensive trader profiles with trading statistics and privacy settings
- **Performance Tracking**: Detailed analytics for both leaders and followers
- **Trade Sharing Controls**: Granular privacy settings for trade visibility and asset amount disclosure

### Technical Features
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS v4 and Radix UI
- **User Authentication**: Secure user accounts with Supabase and HTTP-only cookies
- **Type Safety**: Full TypeScript implementation with Zod validation and strict type checking
- **Database Schema**: Comprehensive PostgreSQL schema with Row Level Security (RLS)
- **API Integration Testing**: Comprehensive API testing dashboard for monitoring endpoint health and responses
- **Comprehensive Error Handling**: Graceful error states with retry mechanisms throughout the application

## 🛠️ Tech Stack

### Frontend
- **Framework**: Astro 5.2+ with React 19 integration
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS v4 with CSS variables and dark mode support
- **UI Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React icon library
- **Charts**: Recharts for portfolio visualization
- **Tables**: TanStack React Table for advanced data display
- **Carousel**: Embla Carousel for interactive components

### Backend & APIs
- **API Routes**: Astro API routes with full REST API implementation
- **Database**: Supabase with PostgreSQL and Row Level Security (RLS)
- **Authentication**: Supabase Auth with persistent sessions and secure cookie management
- **Market Data**: Alpaca Markets API (Broker & Data APIs)
- **WebSocket**: Real-time market data streaming with intelligent simulation fallback
- **Validation**: Zod for runtime type checking and API validation

### Development & Deployment
- **Build Tool**: Vite with Tailwind CSS integration
- **Package Manager**: npm with lock file
- **Deployment**: Static site generation (SSG) optimized for performance
- **Environment**: Development and production environment configuration

## 📁 Project Structure

```text
/
├── .kiro/                              # Kiro IDE configuration
│   ├── specs/copy-trading-system/      # Copy trading system specifications
│   │   ├── requirements.md             # System requirements
│   │   ├── design.md                   # Architecture design
│   │   └── tasks.md                    # Implementation tasks
│   └── steering/                       # Development guidelines
│       ├── product.md                  # Product overview
│       ├── structure.md                # Project structure guide
│       └── tech.md                     # Technology stack guide
├── public/
│   ├── favicon.svg
│   └── config.js                       # Client-side configuration
├── src/
│   ├── components/
│   │   ├── trading/                    # Trading-specific components
│   │   │   ├── TradingDashboard.tsx    # Main dashboard with portfolio overview
│   │   │   ├── TradingInterface.tsx    # Complete trading interface
│   │   │   ├── StockSearch.tsx         # Stock search and selection
│   │   │   ├── TradeForm.tsx           # Enhanced order placement form with options support
│   │   │   ├── OptionsSelector.tsx     # Options chain selection and contract picker
│   │   │   ├── PortfolioChart.tsx      # Portfolio performance chart
│   │   │   ├── Leaderboard.tsx         # Copy trading leaderboard
│   │   │   ├── TraderSelection.tsx     # Trader selection with filtering and allocation
│   │   │   ├── TraderProfileModal.tsx  # Detailed trader profile modal
│   │   │   ├── SubscriptionManager.tsx # Copy trading subscription management
│   │   │   ├── SubscriptionManagerNew.tsx # Enhanced subscription management
│   │   │   ├── CopyTradingDashboard.tsx # Copy trading overview dashboard
│   │   │   ├── RealTimeMarketData.tsx  # Live market data display
│   │   │   ├── SmartMarketData.tsx     # Intelligent market data component
│   │   │   ├── AccountPositions.tsx    # Portfolio positions display
│   │   │   ├── OrderHistory.tsx        # Order history and tracking
│   │   │   ├── ApiIntegrationDemo.tsx  # API testing and monitoring dashboard
│   │   │   ├── ShadcnTradingDashboard.tsx # Alternative dashboard implementation
│   │   │   ├── TradeNotifications.tsx  # Real-time trade notification component
│   │   │   └── index.ts                # Component exports
│   │   ├── ui/                         # Reusable UI components (Radix UI)
│   │   │   ├── UserSettings.tsx        # User settings and trading mode management
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── switch.tsx              # Toggle switches for settings
│   │   │   ├── checkbox.tsx            # Form checkboxes
│   │   │   ├── select.tsx              # Dropdown selections
│   │   │   ├── datatable.tsx           # Data table component
│   │   │   ├── chart.tsx               # Chart wrapper
│   │   │   ├── navbar.tsx              # Navigation bar
│   │   │   ├── columns/                # Table column definitions
│   │   │   │   └── asset-columns.tsx
│   │   │   └── trade/                  # Trading-specific UI components
│   │   │       ├── AccountCreationForm.tsx  # Comprehensive account creation with KYC
│   │   │       ├── OAuthSetupForm.tsx       # OAuth user setup completion
│   │   │       └── open-account.tsx         # Account opening utilities
│   │   ├── SignInForm.tsx              # Enhanced sign-in with OAuth support
│   │   ├── ProtectedRoute.tsx          # Route protection component
│   │   ├── AlpacaMarketApi.tsx         # Market API integration component
│   │   └── DataTableView.tsx           # Generic data table view
│   ├── hooks/
│   │   ├── useAlpacaWebSocket.ts       # Enhanced WebSocket hook for real-time data and trade notifications
│   │   ├── useTradeNotifications.ts    # Hook for managing real-time trade notifications
│   │   └── useTradingMode.ts           # Trading mode state management
│   ├── layouts/
│   │   └── Layout.astro                # Base layout component
│   ├── lib/
│   │   ├── __tests__/                  # Unit tests for core functions
│   │   │   ├── alpaca-account.test.ts  # Alpaca account creation tests
│   │   │   ├── auth.test.ts            # Authentication tests
│   │   │   ├── copy-trading-service.test.ts # Copy trading business logic tests
│   │   │   ├── database.test.ts        # Database service tests
│   │   │   ├── encryption.test.ts      # Token encryption tests
│   │   │   ├── options-trading.test.ts # Options trading functionality tests
│   │   │   ├── portfolio-calculator.test.ts # Portfolio calculation tests
│   │   │   ├── privacy-controls.test.ts # Privacy settings tests
│   │   │   ├── trade-execution-engine.test.ts # Trade execution engine tests
│   │   │   ├── trading-config.test.ts  # Trading configuration tests
│   │   │   ├── websocket-integration.test.ts # WebSocket integration tests
│   │   │   └── websocket-service.test.ts # WebSocket service tests
│   │   ├── auth.ts                     # Authentication utilities
│   │   ├── database.ts                 # Database service layer
│   │   ├── validation.ts               # Data validation utilities
│   │   ├── encryption.ts               # Token encryption service
│   │   ├── trading-config.ts           # Trading mode configuration
│   │   ├── alpaca-account.ts           # Alpaca account management
│   │   ├── oauth-handler.ts            # OAuth authentication handler
│   │   ├── copy-trading-service.ts     # Copy trading business logic and subscription management
│   │   ├── trade-execution-engine.ts   # Proportional trade execution engine for copy trading
│   │   ├── portfolio-calculator.ts     # Portfolio calculation utilities and trade sizing
│   │   ├── trade-execution-example.ts  # Example usage of trade execution engine
│   │   ├── api.ts                      # API utilities and functions
│   │   ├── alpaca.tsx                  # Alpaca API integration
│   │   ├── supabase.ts                 # Supabase client configuration
│   │   ├── websocket-service.ts        # Real-time WebSocket service for trade notifications
│   │   ├── utils.ts                    # Utility functions
│   │   ├── apiService.ts               # API service utilities
│   │   ├── env.ts                      # Environment configuration
│   │   └── createrequest.ts            # Request creation utilities
│   ├── pages/
│   │   ├── api/                        # API routes
│   │   │   ├── alpaca/                 # Alpaca API endpoints
│   │   │   │   ├── account.ts          # Account information
│   │   │   │   ├── assets.ts           # Stock assets search
│   │   │   │   ├── positions.ts        # Current positions
│   │   │   │   ├── orders.ts           # Order management (GET, POST)
│   │   │   │   ├── portfolio-history.ts # Portfolio performance history
│   │   │   │   ├── market-data/        # Market data endpoints
│   │   │   │   │   ├── bars.ts         # Historical price bars
│   │   │   │   │   └── quotes.ts       # Real-time quotes
│   │   │   │   └── options/            # Options trading endpoints
│   │   │   │       └── chain.ts        # Options chain data with mock pricing
│   │   │   ├── user/                   # User management endpoints
│   │   │   │   ├── profile.ts          # User profile management
│   │   │   │   └── trading-mode.ts     # Trading mode switching
│   │   │   ├── copy-trading/           # Copy trading endpoints
│   │   │   │   └── subscriptions.ts    # Subscription management (GET, POST, PUT, DELETE)
│   │   │   ├── rollback-user.ts        # User rollback for failed account creation
│   │   │   ├── leaderboard.ts          # Copy trading leaderboard
│   │   │   └── auth/                   # Authentication endpoints
│   │   │       ├── signin.ts           # User sign in
│   │   │       ├── signup.ts           # User registration
│   │   │       └── signout.ts          # User sign out
│   │   ├── index.astro                 # Landing page
│   │   ├── dashboard.astro             # Trading dashboard
│   │   ├── trade.astro                 # Trading interface
│   │   ├── leaderboard.astro           # Copy trading leaderboard page
│   │   ├── settings.astro              # User settings page
│   │   ├── signin.astro                # Sign in page
│   │   └── signup.astro                # Sign up page
│   ├── styles/
│   │   └── global.css                  # Global styles and Tailwind
│   └── types/
│       └── trading.ts                  # TypeScript type definitions
├── supabase/                           # Database configuration
│   ├── migrations/
│   │   ├── 001_copy_trading_schema.sql # Copy trading database schema
│   │   └── 002_trade_notifications.sql # Real-time trade notifications schema
│   ├── functions/                      # Supabase Edge Functions
│   │   ├── auth/index.ts               # Authentication function
│   │   ├── signup/index.ts             # User signup function
│   │   └── rollback-user/index.ts      # User rollback function
│   ├── schema.sql                      # Base database schema
│   └── seed_data.sql                   # Test data for development
├── .env                                # Environment variables
├── .env.example                        # Environment variables template
├── astro.config.mjs                    # Astro configuration
├── tailwind.config.ts                  # Tailwind CSS configuration
├── components.json                     # UI components configuration
├── vitest.config.ts                    # Testing configuration
├── DATABASE_SCHEMA.md                  # Database documentation
├── API_INTEGRATION_SUMMARY.md          # API integration guide
└── package.json
```

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd leadtrade
npm install
```

### 2. Environment Setup

Copy the environment template and fill in your API keys:

```bash
cp .env.example .env
```

**Quick Start with Demo Mode**: The application now includes intelligent defaults for Alpaca API configuration, allowing you to run the app immediately without API keys for development and testing purposes.

Fill in your environment variables:

```env
# Supabase Configuration (Required)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Alpaca Paper Trading Configuration (Optional - Demo defaults provided)
PUBLIC_ALPACA_PAPER_BROKER_API_KEY=your_paper_broker_api_key
PUBLIC_ALPACA_PAPER_BROKER_API_SECRET=your_paper_broker_secret
PUBLIC_ALPACA_PAPER_BROKER_BASE_URL=https://broker-api.sandbox.alpaca.markets/v1
PUBLIC_ALPACA_PAPER_DATA_API_KEY=your_paper_data_api_key
PUBLIC_ALPACA_PAPER_DATA_API_SECRET=your_paper_data_secret
PUBLIC_ALPACA_PAPER_DATA_BASE_URL=https://data.sandbox.alpaca.markets
PUBLIC_ALPACA_PAPER_WS_URL=wss://stream.data.sandbox.alpaca.markets/v2

# Alpaca Live Trading Configuration (Optional)
PUBLIC_ALPACA_LIVE_BROKER_API_KEY=your_live_broker_api_key
PUBLIC_ALPACA_LIVE_BROKER_API_SECRET=your_live_broker_secret
PUBLIC_ALPACA_LIVE_BROKER_BASE_URL=https://broker-api.alpaca.markets/v1
PUBLIC_ALPACA_LIVE_DATA_API_KEY=your_live_data_api_key
PUBLIC_ALPACA_LIVE_DATA_API_SECRET=your_live_data_secret
PUBLIC_ALPACA_LIVE_DATA_BASE_URL=https://data.alpaca.markets
PUBLIC_ALPACA_LIVE_WS_URL=wss://stream.data.alpaca.markets/v2

# Application Configuration
PUBLIC_APP_URL=http://localhost:4321
NODE_ENV=development
```

**Environment Configuration Features:**
- **Demo Mode**: Automatic fallback to demo credentials when API keys are not provided
- **Intelligent Defaults**: Pre-configured URLs for both paper and live trading environments
- **Backward Compatibility**: Support for alternative environment variable naming conventions
- **Validation**: Built-in environment validation with helpful error messages
- **Fallback System**: Live trading automatically falls back to paper trading credentials when not configured

Note: The Supabase client is configured to use these environment variables with persistent sessions and automatic token refresh for the regular client, and a separate admin client for server-side operations.

### 3. Set Up Alpaca Markets

1. Create a free account at [Alpaca Markets](https://alpaca.markets/)
2. Generate API keys for the sandbox environment
3. Add the keys to your `.env` file

### 4. Set Up Supabase

1. Create a project at [Supabase](https://supabase.com/)
2. Get your project URL and anon key
3. Set up the database schema (see Database Schema section)
4. Add the credentials to your `.env` file

### 5. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:4321` to see your app!

## 📡 API Endpoints

The application provides a comprehensive REST API for trading operations and market data with full TypeScript validation and error handling.

### Authentication Endpoints

| Method | Endpoint | Description | Features |
|--------|----------|-------------|----------|
| `POST` | `/api/auth/signin` | User authentication | Zod validation, secure HTTP-only cookies, session management, OAuth support |
| `POST` | `/api/auth/signup` | User registration | Email/password + OAuth (Google/Apple), KYC integration, Alpaca account creation |
| `GET/POST` | `/api/auth/signout` | User logout | Supabase session cleanup, secure cookie deletion, redirect to home page |

### User Management API

| Method | Endpoint | Description | Features |
|--------|----------|-------------|----------|
| `GET/PUT` | `/api/user/trading-mode` | Get/update trading mode | Switch between paper and live trading with validation |
| `GET/PUT` | `/api/user/profile` | User profile management | Privacy settings, trade sharing controls |
| `POST` | `/api/rollback-user` | Rollback failed account creation | Cleanup mechanism for failed Alpaca account creation |

### Alpaca Trading API

| Method | Endpoint | Description | Query Parameters |
|--------|----------|-------------|------------------|
| `GET` | `/api/alpaca/account` | Get account information | - |
| `GET` | `/api/alpaca/positions` | Get current positions | `symbol`, `asof` |
| `GET` | `/api/alpaca/assets` | Search tradeable assets | `status`, `asset_class`, `exchange`, `search` |
| `GET` | `/api/alpaca/portfolio-history` | Get portfolio history | `period`, `timeframe`, `date_end`, `page_size` |

### Order Management

| Method | Endpoint | Description | Parameters | Validation |
|--------|----------|-------------|------------|------------|
| `GET` | `/api/alpaca/orders` | List orders | `status` (open/closed/all), `limit` (1-500), `after`, `until`, `direction` (asc/desc), `nested` (boolean), `symbols` | Full Zod schema validation with type conversion |
| `POST` | `/api/alpaca/orders` | Create new order | Order object with symbol, qty, side, type, time_in_force, optional limit/stop prices | Comprehensive validation including conditional price requirements |
| `GET` | `/api/alpaca/orders/[id]` | Get specific order | Order ID in URL | - |
| `PATCH` | `/api/alpaca/orders/[id]` | Update order | Order ID + update fields | - |
| `DELETE` | `/api/alpaca/orders/[id]` | Cancel order | Order ID in URL | - |

### Market Data API

| Method | Endpoint | Description | Query Parameters |
|--------|----------|-------------|------------------|
| `GET` | `/api/alpaca/market-data/bars` | Historical price bars | `symbols`, `timeframe`, `start`, `end`, `limit` |
| `GET` | `/api/alpaca/market-data/quotes` | Real-time quotes | `symbols`, `start`, `end`, `limit`, `feed` |

### Options Trading API

| Method | Endpoint | Description | Query Parameters | Features |
|--------|----------|-------------|------------------|----------|
| `GET` | `/api/alpaca/options/chain` | Get options chain data | `symbol` (required) | Returns mock options chain with calls/puts, multiple expirations, Greeks, and realistic pricing |

### Copy Trading API

| Method | Endpoint | Description | Parameters | Features |
|--------|----------|-------------|------------|----------|
| `GET` | `/api/copy-trading/subscriptions` | Get user's subscriptions | - | Returns active subscriptions with leader profiles, total allocation, and remaining allocation |
| `POST` | `/api/copy-trading/subscriptions` | Create new subscription | `leader_id` (UUID), `allocation_percentage` (0.1-100) | Validates leader exists, shares trades, prevents self-following, and ensures total allocation ≤ 100% |
| `PUT` | `/api/copy-trading/subscriptions?id={id}` | Update subscription | `allocation_percentage` (optional), `is_active` (optional) | Updates allocation or active status with validation |
| `DELETE` | `/api/copy-trading/subscriptions?id={id}` | Remove subscription | Subscription ID in query parameter | Removes follower subscription to leader |
| `POST` | `/api/copy-trading/execute-trade` | Execute proportional trades | Leader trade data with symbol, side, quantity, price, portfolio percentage | Triggers automatic trade copying for all followers with comprehensive error handling |

### Leaderboard API

| Method | Endpoint | Description | Query Parameters | Features |
|--------|----------|-------------|------------------|----------|
| `GET` | `/api/leaderboard` | Get trading leaderboard | `timeframe` (daily/weekly/monthly/all), `limit` (1-100) | Portfolio rankings with performance metrics, user profiles, and calculated returns |

### API Response Format

All API endpoints return responses in the following format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

Error responses:

```json
{
  "error": "Error description",
  "details": "Additional error details",
  "message": "Error message"
}
```

### Example API Usage

**Get Account Information:**
```javascript
const response = await fetch('/api/alpaca/account');
const { data } = await response.json();
console.log(data.buying_power, data.portfolio_value);
```

**Place a Market Order:**
```javascript
const orderData = {
  symbol: 'AAPL',
  qty: 10,
  side: 'buy',
  type: 'market',
  time_in_force: 'day'
};

const response = await fetch('/api/alpaca/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
});
```

**Get Historical Bars:**
```javascript
const params = new URLSearchParams({
  symbols: 'AAPL,TSLA',
  timeframe: '1Day',
  limit: '100'
});

const response = await fetch(`/api/alpaca/market-data/bars?${params}`);
const { data } = await response.json();
```

**Copy Trading Examples:**

**Get User's Subscriptions:**
```javascript
const response = await fetch('/api/copy-trading/subscriptions', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data, totalAllocation, remainingAllocation } = await response.json();
```

**Subscribe to a Trader:**
```javascript
const subscriptionData = {
  leader_id: 'uuid-of-leader',
  allocation_percentage: 25.5
};

const response = await fetch('/api/copy-trading/subscriptions', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(subscriptionData)
});
```

**Update Subscription Allocation:**
```javascript
const updateData = {
  allocation_percentage: 30.0,
  is_active: true
};

const response = await fetch(`/api/copy-trading/subscriptions?id=${subscriptionId}`, {
  method: 'PUT',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(updateData)
});
```

**Unsubscribe from a Trader:**
```javascript
const response = await fetch(`/api/copy-trading/subscriptions?id=${subscriptionId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Execute Proportional Trade:**
```javascript
const tradeData = {
  leaderId: 'uuid-of-leader',
  symbol: 'AAPL',
  side: 'buy',
  quantity: 100,
  price: 150.00,
  portfolioPercentage: 15,
  alpacaOrderId: 'alpaca-order-123'
};

const response = await fetch('/api/copy-trading/execute-trade', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(tradeData)
});

const result = await response.json();
console.log(`Copied to ${result.data.successfulCopies} followers`);
```

## 🔄 Trade Execution Engine

The Trade Execution Engine is the core component that handles proportional trade copying. When a leader executes a trade, this engine automatically calculates and executes proportional trades for all their followers.

### Key Features

- **Proportional Trade Calculation**: Calculates exact quantities based on leader's portfolio percentage and follower's allocation
- **Insufficient Funds Handling**: Automatically adjusts trade quantities when followers don't have enough buying power
- **Error Handling**: Comprehensive error handling and logging for failed trades
- **Multi-Asset Support**: Supports both stock and options trading
- **Real-time Execution**: Executes all follower trades immediately after leader trade confirmation

### How It Works

1. **Leader Trade Recording**: Records the leader's trade execution in the database
2. **Follower Discovery**: Gets all active followers for the leader
3. **Account Information**: Retrieves follower account data (portfolio value, buying power)
4. **Proportional Calculation**: Calculates trade amounts for each follower
5. **Trade Execution**: Executes trades via Alpaca API for each follower
6. **Result Recording**: Records all trade results and errors in the database

### Trade Calculation Logic

For each follower, the system calculates:

1. **Allocated Amount**: `followerPortfolioValue * allocationPercentage / 100`
2. **Proportional Amount**: `allocatedAmount * leaderPortfolioPercentage / 100`
3. **Trade Quantity**: `Math.floor(proportionalAmount / sharePrice)`

#### Example Calculation

- Leader has $100,000 portfolio, trades $15,000 (15% of portfolio)
- Follower has $10,000 portfolio, allocated 50% to this leader
- Follower's allocated amount: $10,000 × 50% = $5,000
- Follower's proportional amount: $5,000 × 15% = $750
- If share price is $150: Follower trades 5 shares ($750 ÷ $150 = 5)

### Insufficient Funds Handling

When a follower doesn't have enough buying power:

1. Calculate maximum affordable quantity: `Math.floor(buyingPower / sharePrice)`
2. If max quantity > 0: Execute the maximum possible trade
3. If max quantity = 0: Skip the trade and log the reason
4. Record the adjustment in the database for transparency

### Usage Examples

**Direct Engine Usage:**
```typescript
import { TradeExecutionEngine } from './lib/trade-execution-engine';
import type { LeaderTradeData } from './lib/trade-execution-engine';

const leaderTrade: LeaderTradeData = {
  leaderId: 'leader-123',
  symbol: 'AAPL',
  side: 'buy',
  quantity: 100,
  price: 150.00,
  tradeType: 'stock',
  portfolioPercentage: 15,
  alpacaOrderId: 'alpaca-order-123'
};

const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);
console.log(`Success: ${result.success}`);
console.log(`Copied trades: ${result.copiedTrades.length}`);
```

**Portfolio Calculator Usage:**
```typescript
import { 
  calculatePortfolioPercentage,
  calculateFollowerTradeAmount,
  calculateMaxAffordableQuantity 
} from './lib/portfolio-calculator';

// Calculate what percentage of portfolio a trade represents
const portfolioCalc = await calculatePortfolioPercentage(
  'AAPL', 100, 150.00, 'access-token', 'paper'
);

// Calculate follower trade amount
const followerCalc = calculateFollowerTradeAmount(
  15, // Leader's portfolio percentage
  50, // Follower's allocation percentage
  10000 // Follower's portfolio value
);

// Calculate maximum affordable quantity
const maxQuantity = calculateMaxAffordableQuantity(5000, 150.00);
```

### Error Handling

The engine handles various error scenarios:

- **Leader Trade Recording Failure**: Returns error immediately
- **Follower Account Access Issues**: Skips that follower, continues with others
- **Insufficient Funds**: Executes maximum possible or skips if none possible
- **Alpaca API Errors**: Records failed trade with error message
- **Network Issues**: Comprehensive error logging and recovery

### Database Schema

The engine uses dedicated tables for tracking trade executions:

- **`trade_executions`**: Records leader trades that can be copied
- **`copied_trades`**: Tracks follower trades with execution status

## 🔔 Real-time Notification System

The platform features a comprehensive real-time notification system that keeps users informed about copy trading activities through WebSocket connections and database triggers.

### Key Features

- **Real-time WebSocket Integration**: Instant notifications via Supabase real-time subscriptions
- **Trade Activity Alerts**: Notifications for leader trades, copied trades, and execution status updates
- **Persistent Storage**: All notifications stored in database with read/unread status
- **Smart UI Components**: Beautiful notification interface with management controls
- **Cross-tab Synchronization**: Notifications sync across browser tabs automatically

### Notification Types

#### Leader Trade Notifications
- Sent to all followers when a leader executes a trade
- Includes trade details: symbol, side, quantity, price
- Real-time delivery via WebSocket connection

#### Copied Trade Notifications
- Updates on follower trade execution status
- Status tracking: pending, filled, partially_filled, cancelled, rejected, failed
- Automatic notifications for trade completion or failures

#### Trade Execution Updates
- Real-time updates during trade copying process
- Error notifications for insufficient funds or API failures
- Success confirmations for completed trades

### WebSocket Service Architecture

The `WebSocketService` class manages real-time connections:

```typescript
import { webSocketService } from '@/lib/websocket-service';

// Initialize service for authenticated user
const connected = await webSocketService.initialize();

// Add listener for notifications
webSocketService.addListener('my-listener', (notification) => {
  console.log('New notification:', notification);
});

// Send notification to user
await WebSocketService.sendTradeNotification(userId, {
  type: 'leader_trade',
  leaderId: 'leader-123',
  leaderName: 'John Trader',
  symbol: 'AAPL',
  side: 'buy',
  quantity: 100,
  price: 150.00,
  message: 'John Trader executed a buy order for 100 shares of AAPL at $150.00'
});
```

### React Hooks Integration

#### useTradeNotifications Hook

```typescript
import { useTradeNotifications } from '@/hooks/useTradeNotifications';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    clearAll,
    removeNotification
  } = useTradeNotifications(true);

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {notifications.map(notification => (
        <div key={notification.id}>
          {notification.data.message}
          <button onClick={() => markAsRead(notification.id)}>
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### Enhanced useAlpacaWebSocket Hook

The WebSocket hook now includes trade notification capabilities:

```typescript
import { useAlpacaWebSocket } from '@/hooks/useAlpacaWebSocket';

function TradingComponent() {
  const {
    marketData,
    tradeNotifications,
    isConnected,
    addTradeNotification,
    clearTradeNotifications
  } = useAlpacaWebSocket(['AAPL', 'TSLA'], true);

  // Add custom trade notification
  const handleTradeExecution = () => {
    addTradeNotification({
      type: 'trade_execution',
      symbol: 'AAPL',
      side: 'buy',
      quantity: 10,
      message: 'Your trade has been executed'
    });
  };

  return (
    <div>
      <p>Market Data: {marketData.length} symbols</p>
      <p>Notifications: {tradeNotifications.length}</p>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### TradeNotifications Component

The `TradeNotifications` component provides a complete UI for managing notifications:

```typescript
import { TradeNotifications } from '@/components/trading';

function Dashboard() {
  return (
    <div>
      <TradeNotifications 
        enabled={true}
        maxHeight="400px"
      />
    </div>
  );
}
```

**Component Features:**
- Real-time notification display with timestamps
- Read/unread status indicators
- Individual notification management (mark as read, remove)
- Bulk operations (clear all notifications)
- Connection status indicator
- Responsive design with scroll area
- Beautiful icons and badges for different notification types

### Database Schema

The notification system uses the `trade_notifications` table:

```sql
CREATE TABLE trade_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    data JSONB NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features:**
- Row Level Security (RLS) policies for data protection
- Optimized indexes for performance
- Automatic cleanup of old notifications (keeps last 100 per user)
- JSONB data field for flexible notification content

### Notification Data Structure

```typescript
interface TradeNotificationData {
  type: 'leader_trade' | 'copied_trade' | 'trade_execution' | 'trade_update';
  leaderId?: string;
  leaderName?: string;
  followerId?: string;
  followerName?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  executionStatus?: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'failed';
  message: string;
  metadata?: Record<string, any>;
}
```

### Integration with Copy Trading

The notification system is tightly integrated with the copy trading engine:

1. **Leader Trade Detection**: When a leader executes a trade, notifications are sent to all followers
2. **Trade Copying Process**: Real-time updates during the copying process
3. **Execution Results**: Notifications for successful trades, failures, and partial fills
4. **Error Handling**: Detailed error notifications with actionable information

### Performance Optimizations

- **Efficient Queries**: Optimized database queries with proper indexing
- **Connection Management**: Smart WebSocket connection handling with auto-reconnection
- **Memory Management**: Automatic cleanup of old notifications
- **Batch Operations**: Efficient bulk notification sending for multiple followerss and errors

### Testing

Comprehensive unit tests cover:
- **Trade Execution Engine**: Proportional trade execution, insufficient funds handling, error scenarios
- **Options Trading**: Option details validation, trade execution requests, symbol construction
- **Privacy Controls**: User profile settings, leaderboard visibility, form validation
- **Database Operations**: Validation services, allocation calculations, UUID handling
- **Portfolio Calculator**: Trade sizing, allocation calculations, affordability checks

Run all tests:
```bash
npm run test
```

Run specific test suites:
```bash
npm run test -- src/lib/__tests__/trade-execution-engine.test.ts
npm run test -- src/lib/__tests__/options-trading.test.ts
npm run test -- src/lib/__tests__/privacy-controls.test.tsine.test.ts
npm run test -- src/lib/__tests__/portfolio-calculator.test.ts
```

## 🗄️ Database Schema

The copy trading system uses a comprehensive PostgreSQL schema with Row Level Security (RLS). The complete schema is defined in `supabase/migrations/001_copy_trading_schema.sql` and documented in `DATABASE_SCHEMA.md`.

### Core Tables

#### User Profiles (Extended)
```sql
-- Extends Supabase auth.users with copy trading features
ALTER TABLE public.profiles ADD COLUMN alpaca_access_token TEXT;        -- Encrypted Alpaca tokens
ALTER TABLE public.profiles ADD COLUMN alpaca_refresh_token TEXT;       -- Encrypted refresh tokens
ALTER TABLE public.profiles ADD COLUMN is_paper_trading BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN share_trades BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN show_asset_amounts BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN theme_color TEXT DEFAULT '#ef4444';
```

#### Copy Trading Subscriptions
```sql
-- Manages leader-follower relationships
CREATE TABLE public.copy_trading_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  allocation_percentage DECIMAL(5,2) CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, leader_id)
);
```

#### Trade Executions
```sql
-- Stores leader trades that can be copied
CREATE TABLE public.trade_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_trade_id TEXT NOT NULL,    -- Alpaca order ID
  leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(10,4) NOT NULL,
  price DECIMAL(10,4),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('stock', 'option')),
  option_details JSONB,               -- For options: strike, expiration, type
  portfolio_percentage DECIMAL(5,2),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Copied Trades
```sql
-- Tracks follower trades that copy leader executions
CREATE TABLE public.copied_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_trade_id UUID REFERENCES public.trade_executions(id) ON DELETE CASCADE,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_order_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(10,4) NOT NULL,
  allocated_amount DECIMAL(10,2),
  execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'filled', 'partially_filled', 'cancelled', 'rejected', 'failed')),
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Features
- **Row Level Security (RLS)**: Users can only access their own data and public leaderboard data
- **Allocation Validation**: Trigger functions ensure total allocation doesn't exceed 100%
- **Encrypted Tokens**: Alpaca API credentials are encrypted with user-specific keys
- **Options Support**: JSONB fields for complex options trade details
- **Audit Trail**: Complete history of all trade executions and copies
- **Performance Indexes**: Optimized queries for leaderboards and trade history

### Database Functions
- `get_leaderboard_data()`: Returns public trader rankings with performance metrics
- `validate_total_allocation()`: Ensures allocation percentages don't exceed 100%
- Automatic timestamp updates and user profile creation triggers

For complete schema details, see `DATABASE_SCHEMA.md`.

## 🧞 Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`     |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |

## 📡 Real-Time WebSocket Integration

The platform features a sophisticated WebSocket implementation for live market data streaming via the `useAlpacaWebSocket` hook.

### WebSocket Features
- **Live Market Data**: Real-time quotes and trades from Alpaca's IEX feed
- **Intelligent Fallback**: Automatic simulation when API keys are unavailable
- **Auto-Reconnection**: Handles connection drops with automatic retry logic
- **Multi-Symbol Support**: Subscribe to multiple stocks simultaneously
- **Type Safety**: Full TypeScript interfaces for all market data

### WebSocket Data Types
```typescript
interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  change: number;
  changePercent: number;
  lastUpdate: string;
}
```

### Usage Example
```typescript
const { marketData, isConnected, error } = useAlpacaWebSocket(
  ['AAPL', 'TSLA', 'MSFT'], // symbols to track
  true // enabled
);
```

### Simulation Mode
When API keys aren't configured, the hook automatically switches to simulation mode:
- Realistic price movements (±0.5% typical fluctuations)
- Random volume updates
- Proper bid/ask spreads
- Updates every 2-5 seconds

## 🎯 Key Components

### Trading Components (`src/components/trading/`)

#### TradingDashboard
- Portfolio overview with key metrics and real-time updates
- Integrated portfolio chart powered by WebSocket data
- Current positions display with live P&L calculations
- Account balance information and buying power indicators
- Responsive design with mobile-first approach

#### TradingInterface
- Complete trading interface combining multiple components
- Real-time market data integration
- Order placement and management
- Position tracking and portfolio analytics

#### StockSearch
- Advanced stock search by symbol or company name
- Real-time price data via WebSocket connection
- Popular stocks display with live market data
- Asset filtering and selection capabilities

#### TradeForm
- Comprehensive order placement form
- Support for market, limit, stop, and stop-limit orders
- Real-time price validation and order preview
- Risk warnings and position size calculations

#### Leaderboard
- **Comprehensive Trader Discovery**: Full leaderboard with search, filtering, and sorting capabilities
- **Multiple Timeframes**: Daily, weekly, monthly, and all-time performance tracking
- **Advanced Filtering**: Filter by profitability, trading volume, consistency, and risk level
- **Smart Sorting**: Sort by total return, win rate, trade count, or portfolio size
- **Top 3 Podium**: Special highlighting for top performers with visual rankings
- **Trader Profiles**: Detailed modal views with performance history and trading statistics
- **Privacy Controls**: Respects user privacy settings for asset amounts and trade visibility
- **Real-time Data**: Live updates from Supabase with realistic performance metrics
- **Search Functionality**: Find traders by username with instant filtering
- **Protected Route**: Authentication required for access

#### TraderSelection & TraderProfileModal
- **Advanced Trader Filtering**: Filter by performance metrics, risk level, and trading style
- **Allocation Management**: Set custom allocation percentages with real-time validation
- **Detailed Trader Profiles**: Comprehensive modal with performance history and statistics
- **Follow/Unfollow Actions**: One-click subscription management with allocation controls
- **Performance Metrics**: Win rate, total return, trade count, and risk assessment
- **Privacy Respect**: Shows only information traders have chosen to share publicly

#### SubscriptionManager
- **Subscription Overview**: Comprehensive management of all copy trading subscriptions in one interface
- **Allocation Tracking**: Visual progress bar showing portfolio allocation across leaders (up to 100%)
- **Real-time Updates**: Live subscription status, allocation percentages, and active/inactive toggles
- **Inline Editing**: Edit allocation percentages directly with validation and error handling
- **Subscription Controls**: Toggle subscriptions on/off, delete subscriptions with confirmation
- **Smart Validation**: Prevents total allocation from exceeding 100% with helpful error messages
- **Empty State**: Helpful guidance when no subscriptions exist, directing users to the leaderboard
- **Responsive Design**: Mobile-friendly interface with proper loading states and error handling
- **Performance Monitoring**: Track performance of each subscription individually
- **Quick Actions**: Enable/disable, modify allocation, or unsubscribe with one click
- **Allocation Validation**: Ensures total allocation never exceeds 100%

#### Real-Time Market Data Components
- **RealTimeMarketData**: Live price updates via WebSocket with fallback simulation
- **SmartMarketData**: Intelligent display that adapts based on user authentication
- **ApiIntegrationDemo**: Comprehensive API testing dashboard for monitoring endpoint health

#### Portfolio & Trading Components
- **AccountPositions**: Real-time portfolio positions with P&L calculations
- **OrderHistory**: Complete order tracking with status updates and execution details
- **PortfolioChart**: Interactive charts powered by Recharts with historical performance data

### Copy Trading Service Layer (`src/lib/copy-trading-service.ts`)

The `CopyTradingService` class provides comprehensive business logic for copy trading operations:

#### Core Methods
- **`getUserSubscriptions(userId)`**: Get user's subscriptions with leader information and allocation summary
- **`createSubscription(followerId, leaderId, allocation)`**: Create new subscription with validation
- **`updateSubscription(subscriptionId, followerId, updates)`**: Update allocation or active status
- **`deleteSubscription(subscriptionId, followerId)`**: Remove subscription safely
- **`getAvailableTraders()`**: Get leaderboard data for trader discovery
- **`canFollowTrader(followerId, leaderId, allocation)`**: Validate if user can follow a trader
- **`getSubscriptionStats(userId)`**: Get comprehensive subscription statistics

#### Key Features
- **Allocation Validation**: Ensures total allocation never exceeds 100%
- **Leader Verification**: Validates leaders exist and share trades publicly
- **Self-Following Prevention**: Prevents users from following themselves
- **Comprehensive Error Handling**: Detailed error messages and validation
- **Type Safety**: Full TypeScript implementation with proper interfaces

#### Usage Example
```typescript
import { CopyTradingService } from '@/lib/copy-trading-service';

// Get user's current subscriptions
const summary = await CopyTradingService.getUserSubscriptions(userId);
console.log(`Total allocation: ${summary.totalAllocation}%`);
console.log(`Available: ${summary.remainingAllocation}%`);

// Create new subscription
const result = await CopyTradingService.createSubscription(
  followerId, 
  leaderId, 
  25.0 // 25% allocation
);

if (result.success) {
  console.log('Successfully subscribed to trader');
} else {
  console.error(result.error);
}
```e**: Requires authentication to access trader discovery features

#### PortfolioChart
- Interactive portfolio performance visualization
- Multiple timeframe views (1D, 1W, 1M, 3M, 1Y)
- Real-time profit/loss tracking
- Responsive chart with touch support

#### SmartMarketData
- Intelligent component with authentication-aware display
- Shows AccountPositions for authenticated users
- Displays RealTimeMarketData for anonymous users
- Cross-tab synchronization for login state changes
- Seamless switching between views

#### RealTimeMarketData
- Live stock price updates via WebSocket
- Intelligent fallback to simulated data
- Bid/ask spread visualization
- Volume indicators and price change tracking
- Connection status monitoring with retry logic

#### TraderSelection
- Advanced trader discovery and selection interface
- Multi-criteria filtering (profitable, high volume, consistent, low risk)
- Sorting by performance metrics (return, win rate, activity, followers)
- Real-time search functionality with debounced input
- Allocation percentage controls with validation
- Maximum selection limits with visual feedback
- Selected traders summary with allocation management
- Risk level and trading style badges for quick assessment

#### TraderProfileModal
- Comprehensive trader profile modal with detailed performance metrics
- Performance overview cards showing total return, percentage, win rate, and trade count
- Trading profile section with risk level, trading style, and portfolio information
- Performance history across multiple timeframes (7 days, 30 days, 90 days, all time)
- Recent trades display with profit/loss tracking
- Copy trading integration with follow/unfollow functionality
- Privacy-aware display respecting user asset visibility preferences
- Responsive design optimized for desktop and mobile viewing

#### AccountPositions
- Real-time portfolio positions with live P&L calculations
- WebSocket integration for current market prices
- Position size and value tracking
- Unrealized gains/losses with percentage changes
- Asset allocation visualization

## 📚 Copy Trading Services

### CopyTradingService (`src/lib/copy-trading-service.ts`)

A comprehensive service class that handles all copy trading subscription management and validation:

#### Key Methods:
- **`getUserSubscriptions(userId)`**: Retrieves user's subscriptions with leader information and allocation summary
- **`createSubscription(followerId, leaderId, allocationPercentage)`**: Creates new copy trading subscription with validation
- **`updateSubscription(subscriptionId, followerId, updates)`**: Updates existing subscription allocation or status
- **`deleteSubscription(subscriptionId, followerId)`**: Removes copy trading subscription
- **`canFollowTrader(followerId, leaderId, allocationPercentage)`**: Validates if user can follow a specific trader
- **`getSubscriptionStats(userId)`**: Returns subscription statistics and metrics

#### Features:
- **Allocation Validation**: Ensures total allocation across all subscriptions doesn't exceed 100%
- **Leader Verification**: Validates that leaders exist and have trade sharing enabled
- **Self-Following Prevention**: Prevents users from following themselves
- **Comprehensive Error Handling**: Detailed error messages and validation feedback
- **Type Safety**: Full TypeScript interfaces with proper error handling

### Copy Trading API Endpoints (`src/pages/api/copy-trading/subscriptions.ts`)

RESTful API endpoints for managing copy trading subscriptions:

#### Supported Operations:
- **GET**: Retrieve user's subscriptions with leader profiles and allocation summary
- **POST**: Create new subscription with comprehensive validation
- **PUT**: Update existing subscription allocation or active status
- **DELETE**: Remove subscription from user's portfolio

#### Validation Features:
- **Zod Schema Validation**: Runtime type checking for all inputs
- **Authentication Required**: Bearer token authentication for all operations
- **Allocation Limits**: Prevents total allocation from exceeding 100%
- **Leader Verification**: Ensures leaders exist and share trades publicly
- **Duplicate Prevention**: Prevents multiple subscriptions to the same leader

### Enhanced Leaderboard API (`src/pages/api/leaderboard.ts`)

Improved leaderboard endpoint with realistic performance metrics:

#### Features:
- **Timeframe Filtering**: Daily, weekly, monthly, and all-time performance views
- **Realistic Metrics**: Generated performance data with correlated win rates and returns
- **Privacy Controls**: Respects user asset visibility preferences
- **Enhanced Data**: Includes followers, risk levels, trading styles, and activity status
- **Pagination Support**: Configurable limits for large datasets

## 🔧 Development Tools & Testing

### API Integration Testing
- Comprehensive API testing dashboard (`ApiIntegrationDemo.tsx`)
- Real-time endpoint health monitoring
- Response time tracking and error logging
- Interactive API exploration with live data

### Type Safety & Validation
- **Zod Schemas**: Runtime validation for all API inputs and outputs
- **TypeScript Strict Mode**: Full type checking with no implicit any
- **Interface Definitions**: Comprehensive type definitions in `src/types/trading.ts`

### Error Handling
- **Graceful Degradation**: Intelligent fallbacks for API failures
- **User-Friendly Messages**: Clear error communication throughout the UI
- **Retry Mechanisms**: Automatic retry logic for transient failures
- **Logging**: Comprehensive error logging for debugging and monitoring

## 🚀 Recent Enhancements

### Copy Trading System Completion
The copy trading system has been significantly enhanced with the following new components and features:

1. **TraderSelection Component**: Advanced trader discovery interface with filtering, sorting, and allocation controls
2. **TraderProfileModal Component**: Detailed trader profiles with performance metrics and copy trading integration
3. **CopyTradingService**: Comprehensive service layer for subscription management
4. **Copy Trading API**: Full REST API with CRUD operations for subscriptions
5. **Enhanced Leaderboard**: Realistic performance metrics with privacy controls

### UI/UX Improvements
- **Responsive Design**: All components optimized for desktop and mobile
- **Loading States**: Proper loading indicators throughout the application
- **Error States**: User-friendly error messages with recovery options
- **Performance Optimization**: Efficient data fetching and state management

### Security & Privacy
- **Row Level Security**: Database-level security for user data protection
- **Privacy Controls**: Granular settings for trade sharing and asset visibility
- **Token Encryption**: Secure storage of API credentials
- **Authentication**: Comprehensive auth system with session management

The platform now provides a complete copy trading experience with professional-grade features, comprehensive API coverage, and a modern, responsive user interface. (profitable, high volume, consistent, low risk)
- Sorting by performance metrics (return, win rate, activity, followers)
- Real-time search functionality with debounced input
- Allocation percentage controls with validation
- Maximum selection limits with visual feedback
- Selected traders summary with allocation management
- Risk level and trading style badges for quick assessment

#### TraderProfileModal
- Comprehensive trader profile modal with detailed performance metrics
- Performance overview cards showing total return, percentage, win rate, and trade count
- Trading profile section with risk level, trading style, and portfolio information
- Performance history across multiple timeframes (7 days, 30 days, 90 days, all time)
- Recent trades display with profit/loss tracking
- Copy trading integration with follow/unfollow functionality
- Privacy-aware display respecting user asset visibility preferences
- Responsive design optimized for desktop and mobile viewing (profitable, high volume, consistent, low risk)
- Sorting by performance metrics (return, win rate, activity, followers)
- Real-time search functionality with debounced input
- Allocation percentage controls with validation
- Maximum selection limits with visual feedback
- Selected traders summary with allocation management
- Risk level and trading style badges for quick assessment

#### TraderProfileModal
- Comprehensive trader profile modal with detailed performance metrics
- Performance overview cards showing total return, percentage, win rate, and trade count
- Trading profile section with risk level, trading style, and portfolio information
- Performance history across multiple timeframes (7 days, 30 days, 90 days, all time)
- Recent trades display with profit/loss tracking
- Copy trading integration with follow/unfollow functionality
- Privacy-aware display respecting user asset visibility preferences
- Responsive design optimized for desktop and mobile viewing (profitable, high volume, consistent, low risk)
- Sorting by performance metrics (return, win rate, activity, followers)
- Real-time search functionality with debounced input
- Allocation percentage controls with validation
- Maximum selection limits with visual feedback
- Selected traders summary with allocation management
- Risk level and trading style badges for quick assessment

#### TraderProfileModal
- Comprehensive trader profile modal with detailed performance metrics
- Performance overview cards showing total return, percentage, win rate, and trade count
- Trading profile section with risk level, trading style, and portfolio information
- Performance history across multiple timeframes (7 days, 30 days, 90 days, all time)
- Recent trades display with profit/loss tracking
- Copy trading integration with follow/unfollow functionality
- Privacy-aware display respecting user asset visibility preferences
- Responsive design optimized for desktop and mobile viewing (profitable, high volume, consistent, low risk)
- Sorting by performance metrics (return, win rate, activity, followers)
- Real-time search functionality with debounced input
- Allocation percentage controls with validation
- Maximum selection limits with visual feedback
- Selected traders summary with allocation management
- Risk level and trading style badges for quick assessment

#### TraderProfileModal
- Comprehensive trader profile modal with detailed performance metrics
- Performance overview cards showing total return, percentage, win rate, and trade count
- Trading profile section with risk level, trading style, and portfolio information
- Performance history across multiple timeframes (7 days, 30 days, 90 days, all time)
- Recent trades display with profit/loss tracking
- Copy trading integration with follow/unfollow functionality
- Privacy-aware display respecting user asset visibility preferences
- Responsive design optimized for desktop and mobile viewing

#### AccountPositions
- Real-time portfolio positions with live P&L calculations
- WebSocket integration for current market pricesrent market prices
- Detailed position information (quantity, entry price, market value)
- Color-coded profit/loss indicators
- Responsive table layout with formatted displays

#### OrderHistory
- Complete order history and tracking
- Order status updates and execution details
- Filtering and sorting capabilities
- Real-time order status synchronization

#### ApiIntegrationDemo
- Comprehensive API testing and monitoring dashboard
- Endpoint health monitoring and response validation
- Interactive API testing interface
- Error handling and retry mechanisms

### Custom Hooks (`src/hooks/`)

#### useAlpacaWebSocket
- Real-time market data streaming hook
- Automatic connection management with retry logic
- Intelligent fallback to simulated data when API keys unavailable
- Multi-symbol subscription support
- Type-safe market data interfaces

**Features:**
- Live quotes and trades from Alpaca's IEX feed
- Realistic price simulation (±0.5% fluctuations)
- Auto-reconnection on connection drops
- Connection status monitoring
- Error handling with graceful degradation

**Usage:**
```typescript
const { marketData, isConnected, error } = useAlpacaWebSocket(
  ['AAPL', 'TSLA', 'MSFT'], // symbols to track
  true // enabled
);
```

#### useTradingMode
- Trading mode state management hook
- Real-time updates via Supabase subscriptions
- User-specific trading mode persistence
- Loading states and error handling

**Features:**
- Automatic trading mode detection
- Real-time profile updates
- Cross-session synchronization
- Error recovery with fallback to paper trading

**Usage:**
```typescript
const { tradingMode, loading, error, refreshTradingMode } = useTradingMode(userId);
```

## 🔧 Customization

### UI Components Library

The project includes a comprehensive set of reusable UI components built with Radix UI primitives and styled with Tailwind CSS:

#### Core UI Components
- **Alert**: Contextual feedback messages with variants (default, destructive)
- **Avatar**: User profile images with fallback support
- **Badge**: Status indicators and labels
- **Button**: Interactive buttons with multiple variants
- **Card**: Content containers with header, title, description, and content sections
- **Checkbox**: Form checkboxes with custom styling
- **Input**: Form input fields with validation states
- **Select**: Dropdown selection components with custom styling
- **Separator**: Visual dividers for content sections
- **Sheet**: Slide-out panels and drawers (top, bottom, left, right)
- **Switch**: Toggle switches for boolean settings
- **Table**: Data tables with header, body, and cell components
- **Tabs**: Tabbed interfaces with trigger and content areas

#### Advanced Components
- **DataTable**: Advanced data tables with sorting, filtering, and pagination
- **DropdownMenu**: Context menus with items and checkboxes
- **NavigationMenu**: Site navigation with responsive design
- **Chart**: Recharts integration for data visualization
- **Carousel**: Interactive content carousels with Embla Carousel

#### Trading-Specific UI
- **AccountCreationForm**: KYC form for opening Alpaca accounts
- **Asset Columns**: Table column definitions for asset data

### Adding New Components
1. Create component in appropriate folder (`src/components/trading/` or `src/components/ui/`)
2. Export from index file (`src/components/ui/index.ts`)
3. Import and use in pag

### Styling
- Uses Tailwind CSS with custom design system
- CSS variables for theming in `src/styles/global.css`
- Dark mode support included

### API Integration
- Alpaca API functions in `src/lib/api.ts`
- Supabase client configuration in `src/lib/supabase.ts`
  - Regular client with persistent sessions and auto token refresh
  - Admin client for server-side operations
- Type definitions in `src/types/trading.ts`

## 🚀 Deployment

### Static Site Generation (Recommended)
The project is now configured for static site generation (SSG) for optimal performance and broader hosting compatibility:

```bash
npm run build
```

The static build generates optimized HTML, CSS, and JavaScript files in the `./dist/` directory.

### Hosting Options
Deploy your static site to any of these platforms:
- **Vercel**: Connect repository for automatic deployments
- **Netlify**: Drag and drop `dist` folder or connect via Git
- **GitHub Pages**: Deploy directly from repository
- **Cloudflare Pages**: Fast global CDN deployment
- **AWS S3 + CloudFront**: Enterprise-grade static hosting
- **Any static hosting service**: Upload `dist` folder contents

### Deployment Steps
1. Build the project: `npm run build`
2. Upload the `dist` folder to your hosting provider
3. Configure environment variables in your hosting dashboard
4. Set up custom domain (optional)

### Environment Variables for Production
Set all environment variables in your hosting platform:
- All `SUPABASE_*` variables
- All `PUBLIC_ALPACA_*` variables
- `PUBLIC_APP_URL` (your production URL)
- `NODE_ENV=production`

## 🐛 Troubleshooting

### CSS Not Loading in Production
- Ensure Tailwind config includes all file types
- Check that global.css imports are correct
- Verify build process includes CSS

### API Errors
- Check environment variables are set correctly
- Verify Alpaca API keys are for sandbox environment
- Ensure Supabase URL and keys are correct

### TypeScript Errors
- Run `npm run astro check` to verify types
- Ensure all imports have correct paths
- Check that types are properly exported

## 📝 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

If you need help setting up or have questions:
- Check the troubleshooting section
- Review the Astro documentation
- Check Alpaca Markets API docs
- Review Supabase documentation