# Instant Funding (JIT) API

This document describes the Instant Funding (Just-In-Time) API implementation for Alpaca Broker API integration.

## Overview

Instant Funding provides immediate buying power to accounts before ACH transfers complete, enabling users to trade immediately after initiating a deposit. The system tracks funding requests, calculates interest for overdue amounts, and handles settlement reconciliation.

## Features

- Create instant funding requests for immediate buying power
- Retrieve instant funding limits and availability
- Generate reports for outstanding, settled, and interest calculations
- Create settlements for reconciliation when ACH transfers complete
- Calculate interest for overdue funding amounts

## Architecture

The instant funding implementation follows the standard LeadTrade architecture:

- **Frontend Library** (`src/lib/alpaca-instant-funding.ts`): TypeScript functions with Zod validation
- **Supabase Edge Function** (`supabase/functions/alpaca-instant-funding/index.ts`): Serverless function that calls Alpaca Broker API
- **Direct Communication**: Frontend calls Edge Function directly (no Astro API proxy layer)

## API Endpoints

### Create Instant Funding Request

Creates a new instant funding request to provide immediate buying power.

**Edge Function:** `POST /functions/v1/alpaca-instant-funding`

**Request Body:**
```json
{
  "account_id": "abc123",
  "amount": "1000.00"
}
```

**Response:** `201 Created`
```json
{
  "id": "jit_123",
  "account_id": "abc123",
  "amount": "1000.00",
  "status": "pending",
  "created_at": "2025-01-09T10:00:00Z",
  "updated_at": "2025-01-09T10:00:00Z"
}
```

**Requirements:** 12.1

---

### Get Instant Funding Limits

Retrieves the instant funding limits for the current account.

**Edge Function:** `GET /functions/v1/alpaca-instant-funding/limits`

**Response:** `200 OK`
```json
{
  "account_id": "abc123",
  "max_amount": "5000.00",
  "available_amount": "4000.00",
  "outstanding_amount": "1000.00",
  "daily_limit": "2000.00",
  "daily_used": "1000.00"
}
```

**Requirements:** 12.2

---

### Generate Instant Funding Report

Generates reports for instant funding activity.

**Edge Function:** `GET /functions/v1/alpaca-instant-funding/reports`

**Query Parameters:**
- `report_type` (required): Type of report - `outstanding`, `settled`, or `interest`
- `system_date` (required): Date for the report in YYYY-MM-DD format
- `account_no` (optional): Filter by specific account number

**Example:**
```
GET /functions/v1/alpaca-instant-funding/reports?report_type=outstanding&system_date=2025-01-09
```

**Response:** `200 OK`
```json
{
  "report_type": "outstanding",
  "system_date": "2025-01-09",
  "records": [
    {
      "account_id": "abc123",
      "account_number": "123456789",
      "funding_id": "jit_123",
      "amount": "1000.00",
      "status": "approved",
      "created_at": "2025-01-08T10:00:00Z",
      "days_overdue": 5,
      "interest_amount": "1.10"
    }
  ]
}
```

**Requirements:** 12.3

---

### Create Settlement

Creates a settlement for instant funding when ACH transfer completes.

**Edge Function:** `POST /functions/v1/alpaca-instant-funding/settlements`

**Request Body:**
```json
{
  "funding_id": "jit_123",
  "amount": "1000.00"
}
```

**Response:** `201 Created`
```json
{
  "id": "settlement_456",
  "funding_id": "jit_123",
  "amount": "1000.00",
  "created_at": "2025-01-09T10:00:00Z"
}
```

**Requirements:** 12.4

---

### Get Instant Funding Details

Retrieves details of a specific instant funding request.

**Edge Function:** `GET /functions/v1/alpaca-instant-funding/:fundingId`

**Response:** `200 OK`
```json
{
  "id": "jit_123",
  "account_id": "abc123",
  "amount": "1000.00",
  "status": "approved",
  "created_at": "2025-01-08T10:00:00Z",
  "updated_at": "2025-01-08T10:05:00Z",
  "settled_at": null,
  "interest_amount": "1.10",
  "days_overdue": 5
}
```

---

## Library Functions

### createInstantFunding

Creates an instant funding request.

```typescript
import { createInstantFunding } from '@/lib/alpaca-instant-funding';

const result = await createInstantFunding({
  account_id: 'abc123',
  amount: '1000.00'
});

if (result.success) {
  console.log('Funding created:', result.funding);
} else {
  console.error('Error:', result.error);
}
```

### getInstantFundingLimits

Retrieves instant funding limits.

```typescript
import { getInstantFundingLimits } from '@/lib/alpaca-instant-funding';

const result = await getInstantFundingLimits();

if (result.success) {
  console.log('Available:', result.limits.available_amount);
}
```

### generateInstantFundingReport

Generates instant funding reports.

```typescript
import { generateInstantFundingReport } from '@/lib/alpaca-instant-funding';

const result = await generateInstantFundingReport(
  'outstanding',
  '2025-01-09',
  undefined // optional account_no
);

if (result.success) {
  console.log('Report records:', result.report.records);
}
```

### createInstantFundingSettlement

Creates a settlement for instant funding.

```typescript
import { createInstantFundingSettlement } from '@/lib/alpaca-instant-funding';

const result = await createInstantFundingSettlement({
  funding_id: 'jit_123',
  amount: '1000.00'
});
```

### calculateInstantFundingInterest

Calculates interest for overdue instant funding.

```typescript
import { calculateInstantFundingInterest } from '@/lib/alpaca-instant-funding';

const interest = calculateInstantFundingInterest(
  1000.00,  // principal amount
  5,        // days overdue
  0.08      // annual interest rate (8% APR, optional - defaults to 8%)
);

console.log('Interest:', interest); // 1.10
```

**Requirements:** 12.5

---

## Interest Calculation

Interest is calculated using simple interest formula:

```
Interest = Principal × (Annual Rate / 365) × Days Overdue
```

Default annual interest rate is 8% (0.08), but can be customized.

**Example:**
- Principal: $1,000
- Days Overdue: 5
- Annual Rate: 8%
- Interest: $1,000 × (0.08 / 365) × 5 = $1.10

---

## Status Flow

Instant funding requests follow this status flow:

1. **pending** - Request created, awaiting approval
2. **approved** - Request approved, buying power provided
3. **settled** - ACH transfer completed, funding reconciled
4. **rejected** - Request rejected

---

## Error Handling

All functions return a consistent response format:

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
}
```

Common error scenarios:
- Missing required fields (account_id, amount)
- Invalid amount (must be positive number)
- Exceeding funding limits
- Invalid report type
- Funding request not found

---

## Trading Modes

All endpoints support both paper and live trading modes:
- **Paper Mode**: Uses sandbox Alpaca API for testing
- **Live Mode**: Uses production Alpaca API for real trading

The trading mode is determined by the user's session context in the Edge Function.

---

## Requirements Mapping

- **12.1**: Create instant funding requests
- **12.2**: Retrieve instant funding limits
- **12.3**: Generate instant funding reports
- **12.4**: Create settlements for reconciliation
- **12.5**: Calculate interest for overdue funding

---

## Implementation Files

- **Edge Function**: `supabase/functions/alpaca-instant-funding/index.ts`
- **Library**: `src/lib/alpaca-instant-funding.ts` (with Zod validation)
- **Tests**: `src/lib/__tests__/alpaca-instant-funding.test.ts`
- **Documentation**: `docs/INSTANT_FUNDING.md`
