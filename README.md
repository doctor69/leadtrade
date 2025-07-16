# LEADTRADE - Paper Trading Platform

A comprehensive paper trading platform built with Astro, React, TypeScript, and Tailwind CSS. Practice trading with real market data from Alpaca Markets without any financial risk.

## 🚀 Features

- **Real Market Data**: Live stock prices and market data from Alpaca Markets
- **Paper Trading**: Practice trading without real money
- **Portfolio Analytics**: Track your performance with detailed charts and metrics
- **Leaderboards**: Compete with other traders and see rankings
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS
- **Real-time Updates**: Live portfolio updates and market data
- **User Authentication**: Secure user accounts with Supabase

## 🛠️ Tech Stack

- **Frontend**: Astro + React + TypeScript
- **Styling**: Tailwind CSS + Radix UI Components
- **Backend**: Supabase (Database & Auth)
- **Market Data**: Alpaca Markets API
- **Charts**: Recharts
- **Deployment**: Static hosting compatible

## 📁 Project Structure

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── trading/           # Trading-specific components
│   │   │   ├── TradingDashboard.tsx
│   │   │   ├── StockSearch.tsx
│   │   │   ├── TradeForm.tsx
│   │   │   ├── PortfolioChart.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   └── TradingInterface.tsx
│   │   └── ui/                # Reusable UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── ...
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   ├── api.ts            # API utilities
│   │   ├── alpaca.tsx        # Alpaca integration
│   │   ├── supabase.ts       # Supabase client
│   │   └── utils.ts          # Utility functions
│   ├── pages/
│   │   ├── index.astro       # Landing page
│   │   ├── dashboard.astro   # Trading dashboard
│   │   ├── trade.astro       # Trading interface
│   │   ├── leaderboard.astro # Leaderboard
│   │   ├── signin.astro      # Sign in
│   │   └── signup.astro      # Sign up
│   ├── styles/
│   │   └── global.css        # Global styles
│   └── types/
│       └── trading.ts        # TypeScript definitions
├── .env.example              # Environment variables template
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
# Alpaca API (Sandbox)
PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY=your_alpaca_api_key
PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET=your_alpaca_secret
PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL=https://broker-api.sandbox.alpaca.markets/v1

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

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

## 🗄️ Database Schema

Create these tables in your Supabase database:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolios table
CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  total_value DECIMAL(15,2) DEFAULT 100000.00,
  cash DECIMAL(15,2) DEFAULT 100000.00,
  positions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trades table
CREATE TABLE trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,4) NOT NULL,
  order_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio history table
CREATE TABLE portfolio_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL,
  equity DECIMAL(15,2) NOT NULL,
  profit_loss DECIMAL(15,2) DEFAULT 0,
  profit_loss_pct DECIMAL(8,4) DEFAULT 0,
  timeframe TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard table
CREATE TABLE leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  username TEXT NOT NULL,
  total_return DECIMAL(15,2) NOT NULL,
  total_return_percent DECIMAL(8,4) NOT NULL,
  portfolio_value DECIMAL(15,2) NOT NULL,
  trades_count INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  rank INTEGER NOT NULL,
  timeframe TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🧞 Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`     |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |

## 🎯 Key Components

### TradingDashboard
- Portfolio overview with key metrics
- Real-time portfolio chart
- Current positions display
- Account balance information

### StockSearch
- Search for stocks by symbol or company name
- Display popular stocks
- Real-time price data
- Stock selection for trading

### TradeForm
- Place buy/sell orders
- Market and limit order types
- Order preview and confirmation
- Risk warnings and validation

### Leaderboard
- Top trader rankings
- Performance metrics
- Timeframe filtering
- User profiles and stats

### PortfolioChart
- Interactive portfolio performance chart
- Multiple timeframe views
- Profit/loss visualization
- Responsive design

## 🔧 Customization

### Adding New Components
1. Create component in appropriate folder (`src/components/trading/` or `src/components/ui/`)
2. Export from index file
3. Import and use in pages

### Styling
- Uses Tailwind CSS with custom design system
- CSS variables for theming in `src/styles/global.css`
- Dark mode support included

### API Integration
- Alpaca API functions in `src/lib/api.ts`
- Supabase queries in same file
- Type definitions in `src/types/trading.ts`

## 🚀 Deployment

### Static Hosting (Recommended)
```bash
npm run build
```

Deploy the `dist/` folder to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

### Environment Variables for Production
Make sure to set all environment variables in your hosting platform.

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