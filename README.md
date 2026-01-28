# LeadTrade Project Guide

## Product Overview

LeadTrade is a paper/live trading platform with copy trading capabilities. Users can practice with simulated funds or trade real money via Alpaca Markets, follow successful traders, and automatically replicate trades with customizable allocations.

**User Types**: Leaders (share trades), Followers (copy trades), Solo Traders (independent)

**Key Features**: Paper & live trading, copy trading with portfolio allocation, real-time market data via WebSocket, social leaderboards, options trading, integrated KYC for Alpaca accounts

**Business Logic**: Users allocate up to 100% portfolio across multiple leaders; trades copied proportionally; privacy controls for leaders; seamless mode switching

## Tech Stack

**Core**: Astro 5.2+ with React 19, TypeScript (strict), Vite, SSG output
**Frontend**: Tailwind CSS v4, Radix UI, Lucide icons, Recharts, TanStack Table
**Backend**: Supabase (PostgreSQL + Auth + Edge functions), Alpaca Markets APIs, WebSocket for real-time data
**Validation**: Zod schemas for all API I/O

## Project Structure

```
src/
├── components/
│   ├── trading/         # Trading-specific components
│   └── ui/              # Radix UI components (shadcn/ui patterns)
├── hooks/               # Custom React hooks
├── lib/                 # Core business logic & services
│   ├── __tests__/       # Vitest unit tests
│   ├── auth.ts, database.ts, validation.ts
│   ├── trading-config.ts, alpaca-account.ts
│   └── supabase.ts, encryption.ts
├── pages/
│   ├── api/             # REST endpoints (alpaca/, auth/, user/)
│   └── *.astro          # Page components
├── styles/              # Global CSS
└── types/               # TypeScript definitions
```

## Conventions

**Files**: Components (PascalCase), utilities/API routes (kebab-case)
**Code**: Functions (camelCase), constants (UPPER_SNAKE_CASE), interfaces (PascalCase)
**Imports**: External libs → internal utils → components → types
**Testing**: `*.test.ts` in `src/lib/__tests__/`, focus on business logic

## Development

```bash
npm run dev              # localhost:4321
npm run build           # Production build
npm run test:run        # Run tests once
npm run astro check     # Type checking
```

**Environment**: Copy `.env.example` to `.env` and add Supabase credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) plus Alpaca API keys (`PUBLIC_ALPACA_*`)

## Code Standards

- TypeScript strict mode, no implicit any
- Zod validation for all API inputs/outputs
- Comprehensive error handling with try-catch
- RLS policies on all database tables
- HTTP-only cookies for auth
