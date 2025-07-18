# Technology Stack

## Framework & Build System

- **Framework**: Astro 5.2+ with React 19 integration for static site generation
- **Language**: TypeScript with strict type checking and Zod validation
- **Build Tool**: Vite with optimized bundling
- **Output**: Static site generation (SSG) for optimal performance

## Frontend Stack

- **UI Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4 with CSS variables and dark mode support
- **UI Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React
- **Charts**: Recharts for portfolio visualization
- **Tables**: TanStack React Table
- **State Management**: React hooks and context

## Backend & APIs

- **API Routes**: Astro API routes with REST endpoints
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with HTTP-only cookies
- **External APIs**: Alpaca Markets (Broker & Data APIs)
- **Real-time**: WebSocket connections for live market data
- **Validation**: Zod schemas for runtime type checking

## Development Commands

```bash
# Development
npm run dev              # Start dev server at localhost:4321
npm run build           # Build for production (static)
npm run preview         # Preview production build locally

# Testing
npm run test            # Run Vitest tests
npm run test:run        # Run tests once without watch mode

# Type Checking
npm run astro check     # TypeScript and Astro validation
```

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no implicit any
- **Validation**: Zod schemas for all API inputs/outputs
- **Error Handling**: Comprehensive try-catch with proper error responses
- **Testing**: Vitest for unit tests with @vitest/ui
- **Formatting**: Consistent code style across the project

## Environment Configuration

Required environment variables:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_ALPACA_*` variables for API keys and endpoints
- `PUBLIC_APP_URL` for application URL
- `NODE_ENV` for environment detection