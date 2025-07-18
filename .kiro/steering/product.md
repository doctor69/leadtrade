# Product Overview

LeadTrade is an advanced paper trading platform with copy trading capabilities built for both novice and experienced traders.

## Core Features

- **Paper & Live Trading**: Practice with simulated funds or trade with real money via Alpaca Markets integration
- **Copy Trading System**: Follow successful traders and automatically replicate their trades with customizable allocation percentages
- **Real-time Market Data**: Live stock prices and WebSocket integration with intelligent fallback to simulated data
- **Social Trading**: Leaderboards, user profiles, and performance tracking with privacy controls
- **Options Trading**: Full support for options trading and copying
- **Account Creation**: Integrated KYC flow for creating real Alpaca brokerage accounts

## User Types

- **Leaders**: Experienced traders who share their trades publicly for others to copy
- **Followers**: Users who copy trades from leaders with customizable portfolio allocation
- **Solo Traders**: Users who trade independently without participating in copy trading

## Key Business Logic

- Users can allocate up to 100% of their portfolio across multiple leaders
- Trades are copied proportionally based on leader's portfolio percentage and follower's allocation
- Privacy controls allow leaders to share trades while hiding asset amounts
- Both paper and live trading modes supported with seamless switching