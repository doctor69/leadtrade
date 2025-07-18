# Project Structure

## Directory Organization

```
src/
├── components/           # React components
│   ├── trading/         # Trading-specific components
│   ├── ui/              # Reusable UI components (Radix-based)
│   └── *.tsx            # General components
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries and services
│   ├── __tests__/       # Unit tests for lib functions
│   └── *.ts             # Core business logic
├── pages/               # Astro pages and API routes
│   ├── api/             # API endpoints
│   │   ├── alpaca/      # Alpaca API integration
│   │   ├── auth/        # Authentication endpoints
│   │   └── user/        # User-related endpoints
│   └── *.astro          # Page components
├── styles/              # Global CSS and Tailwind
└── types/               # TypeScript type definitions
```

## Component Architecture

### UI Components (`src/components/ui/`)
- Built with Radix UI primitives
- Styled with Tailwind CSS and CSS variables
- Exported from `index.ts` for clean imports
- Follow shadcn/ui patterns

### Trading Components (`src/components/trading/`)
- Domain-specific trading functionality
- Real-time data integration via WebSocket hooks
- Exported from `index.ts` for organization

### Page Components (`src/pages/`)
- Astro components for static generation
- API routes follow REST conventions
- Authentication middleware integration

## Library Organization (`src/lib/`)

### Core Services
- `auth.ts` - Authentication utilities
- `database.ts` - Supabase database operations
- `validation.ts` - Zod schemas and validation logic
- `encryption.ts` - Secure token handling
- `trading-config.ts` - Trading mode configuration

### API Integration
- `alpaca-account.ts` - Alpaca account management
- `oauth-handler.ts` - OAuth flow handling
- `supabase.ts` - Database client configuration

## Naming Conventions

### Files
- **Components**: PascalCase (e.g., `TradingDashboard.tsx`)
- **Utilities**: kebab-case (e.g., `trading-config.ts`)
- **API Routes**: kebab-case (e.g., `trading-mode.ts`)
- **Types**: kebab-case (e.g., `trading.ts`)

### Functions & Variables
- **Functions**: camelCase with descriptive names
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase with descriptive prefixes

## Import Patterns

```typescript
// External libraries first
import { useState } from 'react';
import { z } from 'zod';

// Internal utilities
import { cn } from '@/lib/utils';
import { ValidationService } from '@/lib/validation';

// Components
import { Button } from '@/components/ui/button';
import { TradingDashboard } from '@/components/trading';

// Types
import type { UserProfile } from '@/types/trading';
```

## Database Integration

### Supabase Structure
- `supabase/migrations/` - Database schema migrations
- `supabase/seed_data.sql` - Development seed data
- Row Level Security (RLS) policies for data protection

### Type Safety
- Database types generated from Supabase schema
- Zod validation for all API inputs/outputs
- TypeScript interfaces in `src/types/trading.ts`

## Testing Structure

- Unit tests in `src/lib/__tests__/`
- Test files follow `*.test.ts` naming convention
- Vitest configuration in `vitest.config.ts`
- Focus on business logic and validation functions