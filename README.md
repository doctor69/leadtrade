# LeadTrade

A paper/live trading platform with copy trading capabilities.

## Features

- Paper & live trading via Alpaca Markets
- Copy trading with portfolio allocation
- Real-time market data via WebSocket
- Social leaderboards
- Options trading
- Integrated KYC for Alpaca accounts

## Tech Stack

- **Frontend**: Astro 5.2+, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Trading**: Alpaca Markets APIs
- **Email**: Resend (trading) + Brevo (auth/support)

## Development

```bash
npm install
npm run dev              # localhost:4321
npm run build           # Production build
npm run test:run        # Run tests
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- Supabase credentials
- Alpaca API keys
- Email service keys (Resend, Brevo)

## Email System

The platform uses a centralized email queue with Resend templates for trading notifications:
- Rate-limited processing (2 req/sec for Resend)
- Automatic retry on failures
- GitHub Actions cron job for queue processing
- Template support for professional emails

## License

Proprietary
