# LEADTRADE - Advanced Paper Trading Platform

A comprehensive paper trading platform built with Astro 5.2+, React 19, TypeScript, and Tailwind CSS v4. Practice trading with real market data from Alpaca Markets without any financial risk, or create real brokerage accounts with full KYC integration. Features sophisticated real-time WebSocket integration, comprehensive API testing tools, intelligent market data simulation, and complete trading functionality with social features.

## 🚀 Features

### Core Trading Features
- **Real Market Data**: Live stock prices and market data from Alpaca Markets API
- **Paper Trading**: Practice trading without real money using sandbox environment
- **Order Management**: Complete order lifecycle with market, limit, stop, and stop-limit orders
- **Position Tracking**: Monitor current positions with real-time P&L calculations
- **Portfolio Analytics**: Track your performance with detailed charts and metrics
- **Asset Search**: Search and filter tradeable assets with real-time data
- **Portfolio History**: Track portfolio performance over time with multiple timeframes

### Real-time Features
- **WebSocket Integration**: Live market data updates via Alpaca WebSocket API
- **Intelligent Fallback**: Automatic fallback to simulated market data when API keys are unavailable
- **Smart Market Display**: Adaptive UI that shows user positions when logged in, or popular stocks when anonymous
- **Cross-tab Synchronization**: Seamless login state updates across browser tabs

### Social & Competitive Features
- **Leaderboards**: Compete with other traders and see rankings with real-time portfolio values
- **User Profiles**: Comprehensive user management with trading statistics
- **Performance Tracking**: Detailed analytics and performance metrics

### Technical Features
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS v4 and Radix UI
- **User Authentication**: Secure user accounts with Supabase and HTTP-only cookies
- **Type Safety**: Full TypeScript implementation with Zod validation and strict type checking
- **Account Creation**: Full KYC integration with Alpaca Broker API for creating real trading accounts
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
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── trading/           # Trading-specific components
│   │   │   ├── TradingDashboard.tsx    # Main dashboard with portfolio overview
│   │   │   ├── TradingInterface.tsx    # Complete trading interface
│   │   │   ├── StockSearch.tsx         # Stock search and selection
│   │   │   ├── TradeForm.tsx           # Order placement form
│   │   │   ├── PortfolioChart.tsx      # Portfolio performance chart
│   │   │   ├── Leaderboard.tsx         # Trading leaderboard
│   │   │   ├── RealTimeMarketData.tsx  # Live market data display
│   │   │   ├── SmartMarketData.tsx     # Intelligent market data component
│   │   │   ├── AccountPositions.tsx    # Portfolio positions display
│   │   │   ├── OrderHistory.tsx        # Order history and tracking
│   │   │   ├── ApiIntegrationDemo.tsx  # API testing and monitoring dashboard
│   │   │   └── index.ts                # Component exports
│   │   ├── ui/                # Reusable UI components (Radix UI)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── datatable.tsx           # Data table component
│   │   │   ├── chart.tsx               # Chart wrapper
│   │   │   ├── navbar.tsx              # Navigation bar
│   │   │   ├── columns/                # Table column definitions
│   │   │   │   └── asset-columns.tsx
│   │   │   └── trade/                  # Trading-specific UI components
│   │   │       ├── AccountCreationForm.tsx  # Comprehensive account creation form
│   │   │       └── open-account.tsx         # Account opening utilities
│   │   ├── AlpacaMarketApi.tsx         # Market API integration component
│   │   └── DataTableView.tsx           # Generic data table view
│   ├── hooks/
│   │   └── useAlpacaWebSocket.ts       # WebSocket hook for real-time data
│   ├── layouts/
│   │   └── Layout.astro                # Base layout component
│   ├── lib/
│   │   ├── api.ts                      # API utilities and functions
│   │   ├── alpaca.tsx                  # Alpaca API integration
│   │   ├── supabase.ts                 # Supabase client configuration
│   │   ├── utils.ts                    # Utility functions
│   │   └── createrequest.ts            # Request creation utilities
│   ├── pages/
│   │   ├── api/                        # API routes
│   │   │   ├── alpaca/                 # Alpaca API endpoints
│   │   │   │   ├── account.ts          # Account information
│   │   │   │   ├── assets.ts           # Stock assets search
│   │   │   │   ├── positions.ts        # Current positions
│   │   │   │   ├── orders.ts           # Order management (GET, POST)
│   │   │   │   ├── orders/[id].ts      # Individual order (GET, PATCH, DELETE)
│   │   │   │   ├── portfolio-history.ts # Portfolio performance history
│   │   │   │   └── market-data/        # Market data endpoints
│   │   │   │       ├── bars.ts         # Historical price bars
│   │   │   │       └── quotes.ts       # Real-time quotes
│   │   │   └── auth/                   # Authentication endpoints
│   │   │       ├── signin.ts           # User sign in
│   │   │       ├── signup.ts           # User registration
│   │   │       └── signout.ts          # User sign out
│   │   ├── index.astro                 # Landing page
│   │   ├── dashboard.astro             # Trading dashboard
│   │   ├── trade.astro                 # Trading interface
│   │   ├── leaderboard.astro           # Leaderboard page
│   │   ├── signin.astro                # Sign in page
│   │   └── signup.astro                # Sign up page
│   ├── styles/
│   │   └── global.css                  # Global styles and Tailwind
│   └── types/
│       └── trading.ts                  # TypeScript type definitions
├── .env                                # Environment variables
├── .env.example                        # Environment variables template
├── astro.config.mjs                    # Astro configuration
├── tailwind.config.ts                  # Tailwind CSS configuration
├── components.json                     # UI components configuration
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

Fill in your environment variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_PUBLIC_KEY=your_supabase_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Alpaca Broker API (Sandbox)
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=your_alpaca_broker_api_key
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=your_alpaca_broker_secret
PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL=https://broker-api.sandbox.alpaca.markets/v1

# Alpaca Broker API (Live - Optional)
PUBLIC_ALPACA_BROKER_LIVE_API_KEY=your_live_broker_key
PUBLIC_ALPACA_BROKER_LIVE_API_SECRET=your_live_broker_secret

# Alpaca Data API (Required for real-time WebSocket data)
PUBLIC_ALPACA_DATA_API_KEY=your_alpaca_data_api_key
PUBLIC_ALPACA_DATA_API_SECRET=your_alpaca_data_api_secret
PUBLIC_ALPACA_DATA_BASE_URL=https://data.sandbox.alpaca.markets

# Application Configuration
PUBLIC_APP_URL=http://localhost:4321
NODE_ENV=development
```

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
| `POST` | `/api/auth/signin` | User authentication | Zod validation, secure HTTP-only cookies, session management, error handling |
| `POST` | `/api/auth/signup` | User registration | Basic email/password registration with Supabase |
| `POST` | `/api/auth/create-account` | Create user + Alpaca account | Full KYC, Alpaca integration, portfolio setup, comprehensive validation |
| `GET/POST` | `/api/auth/signout` | User logout | Supabase session cleanup, secure cookie deletion, redirect to home page |

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

## 🗄️ Database Schema

The Supabase database schema is defined in `supabase/schema.sql`:

```sql
-- Create profiles table that extends Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alpaca_accounts table to store Alpaca account information
CREATE TABLE IF NOT EXISTS public.alpaca_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  alpaca_account_id TEXT UNIQUE,
  alpaca_account_number TEXT UNIQUE,
  alpaca_account_status TEXT,
  alpaca_api_key TEXT,
  alpaca_api_secret TEXT,
  account_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_details table for storing additional user information
CREATE TABLE IF NOT EXISTS public.user_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  given_name TEXT,
  family_name TEXT,
  date_of_birth DATE,
  tax_id TEXT,
  tax_id_type TEXT,
  country_of_citizenship TEXT,
  country_of_birth TEXT,
  country_of_tax_residence TEXT,
  funding_source TEXT[],
  phone_number TEXT,
  street_address TEXT[],
  city TEXT,
  state TEXT,
  postal_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portfolios table for tracking user portfolios
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  alpaca_account_id TEXT REFERENCES alpaca_accounts(alpaca_account_id),
  total_value DECIMAL(15,2) DEFAULT 0,
  cash DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

The schema includes Row Level Security (RLS) policies to ensure users can only access their own data, and triggers for handling updated timestamps and new user creation.

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

### TradingDashboard
- Portfolio overview with key metrics
- Real-time portfolio chart powered by WebSocket data
- Current positions display with live P&L updates
- Account balance information
- Cash and buying power indicators

### StockSearch
- Search for stocks by symbol or company name
- Display popular stocks with live prices
- Real-time price data via WebSocket connection
- Stock selection for trading

### TradeForm
- Place buy/sell orders with current market prices
- Market and limit order types
- Order preview with real-time pricing
- Risk warnings and validation

### Leaderboard
- Top trader rankings with live portfolio values
- Performance metrics updated in real-time
- Timeframe filtering
- User profiles and stats

### PortfolioChart
- Interactive portfolio performance chart
- Multiple timeframe views
- Real-time profit/loss visualization
- Responsive design with live data updates

### SmartMarketData
- Intelligent component that adapts based on user authentication status
- Shows AccountPositions for logged-in users with their portfolio holdings
- Displays RealTimeMarketData for anonymous users with popular stocks
- Automatic authentication detection via cookies and storage events
- Seamless switching between views without page refresh
- Cross-tab synchronization for login state changes

### RealTimeMarketData
- Live stock price updates via WebSocket connection
- Automatic fallback to simulated data when API keys aren't available
- Bid/ask spread visualization with real-time updates
- Volume and price change indicators
- Connection status monitoring

### AccountPositions
- Real-time portfolio positions display with live P&L calculations
- WebSocket integration for current market prices
- Comprehensive position details including quantity, entry price, and market value
- Color-coded profit/loss indicators with trending arrows
- Refresh functionality and connection status monitoring
- Responsive table layout with formatted currency and percentage displays

### AccountCreationForm
- Open new Alpaca brokerage accounts
- KYC information collection
- Account status tracking
- Seamless integration with Alpaca Broker API

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

### Vercel Serverless (Recommended)
The project is configured for Vercel serverless deployment with SSR support:

```bash
npm run build
```

Deploy to Vercel:
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Alternative Hosting
You can also deploy to:
- Netlify (with serverless functions)
- Railway
- Any Node.js hosting service

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