# Corporate Actions API

This document describes the corporate actions endpoints for retrieving dividend, merger, spinoff, and split announcements.

## Overview

Corporate actions are significant events that affect a company's stock and shareholders. The API provides access to announcements for:

- **Dividends**: Cash or stock distributions to shareholders
- **Mergers**: Combination of two or more companies
- **Spinoffs**: Creation of new independent company from parent
- **Splits**: Division of existing shares into multiple shares

## Requirements

- **8.1**: Support filtering by corporate action types (dividend, merger, spinoff, split)
- **8.2**: Support filtering by symbol and CUSIP
- **8.3**: Support date-based filtering with multiple date types
- **8.4**: Provide detailed announcement information including dates and terms

## API Endpoints

### List Corporate Actions

```
GET /api/alpaca/corporate-actions
```

Lists corporate action announcements with optional filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `ca_types` | string | Comma-separated list of types: `dividend`, `merger`, `spinoff`, `split` |
| `symbol` | string | Filter by stock symbol |
| `cusip` | string | Filter by CUSIP identifier |
| `date_type` | string | Date field to filter on: `declaration_date`, `ex_date`, `record_date`, `payable_date` |
| `since` | string | Start date (ISO format: YYYY-MM-DD) |
| `until` | string | End date (ISO format: YYYY-MM-DD) |
| `page_token` | string | Pagination token for next page |
| `page_size` | number | Number of results per page |

**Example Request:**

```bash
curl -X GET "https://yourdomain.com/api/alpaca/corporate-actions?ca_types=dividend&symbol=AAPL&date_type=ex_date&since=2024-01-01" \
  -H "X-Trading-Mode: paper"
```

**Example Response:**

```json
[
  {
    "id": "ca_123",
    "corporate_action_id": "DIV_AAPL_2024Q1",
    "ca_type": "dividend",
    "ca_sub_type": "cash",
    "initiating_symbol": "AAPL",
    "initiating_original_cusip": "037833100",
    "declaration_date": "2024-01-15",
    "ex_date": "2024-02-01",
    "record_date": "2024-02-05",
    "payable_date": "2024-02-15",
    "cash": "0.25"
  }
]
```

### Get Corporate Action by ID

```
GET /api/alpaca/corporate-actions/{announcementId}
```

Retrieves a specific corporate action announcement.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `announcementId` | string | Unique identifier for the announcement |

**Example Request:**

```bash
curl -X GET "https://yourdomain.com/api/alpaca/corporate-actions/ca_123" \
  -H "X-Trading-Mode: paper"
```

**Example Response:**

```json
{
  "id": "ca_123",
  "corporate_action_id": "DIV_AAPL_2024Q1",
  "ca_type": "dividend",
  "ca_sub_type": "cash",
  "initiating_symbol": "AAPL",
  "initiating_original_cusip": "037833100",
  "declaration_date": "2024-01-15",
  "ex_date": "2024-02-01",
  "record_date": "2024-02-05",
  "payable_date": "2024-02-15",
  "cash": "0.25"
}
```

## Corporate Action Types

### Dividend

Cash or stock distributions to shareholders.

**Fields:**
- `cash`: Amount per share (for cash dividends)
- `old_rate`: Original shares (for stock dividends)
- `new_rate`: New shares (for stock dividends)

### Merger

Combination of two or more companies.

**Fields:**
- `target_symbol`: Symbol of the acquiring/merged company
- `target_original_cusip`: CUSIP of target company
- `old_rate`: Exchange ratio (initiating shares)
- `new_rate`: Exchange ratio (target shares)

### Spinoff

Creation of new independent company from parent.

**Fields:**
- `target_symbol`: Symbol of the new spun-off company
- `target_original_cusip`: CUSIP of new company
- `old_rate`: Parent shares
- `new_rate`: Spinoff shares received

### Split

Division of existing shares into multiple shares.

**Fields:**
- `old_rate`: Original share count
- `new_rate`: New share count (e.g., 2-for-1 split: old_rate=1, new_rate=2)

## Date Types

Corporate actions have multiple important dates:

- **declaration_date**: Date the action was announced
- **ex_date**: First trading day without the entitlement
- **record_date**: Date to be on record to receive the action
- **payable_date**: Date the action is executed/paid

## Usage Examples

### Get All Dividends for a Symbol

```typescript
import { listCorporateActions } from '@/lib/alpaca-corporate-actions';

const result = await listCorporateActions({
  ca_types: 'dividend',
  symbol: 'AAPL',
  date_type: 'payable_date',
  since: '2024-01-01',
  until: '2024-12-31'
}, 'paper');

if (result.success) {
  console.log('Dividends:', result.data);
}
```

### Get Upcoming Corporate Actions

```typescript
import { listCorporateActions } from '@/lib/alpaca-corporate-actions';

const today = new Date().toISOString().split('T')[0];

const result = await listCorporateActions({
  date_type: 'ex_date',
  since: today
}, 'paper');

if (result.success) {
  console.log('Upcoming actions:', result.data);
}
```

### Get Specific Announcement Details

```typescript
import { getCorporateAction } from '@/lib/alpaca-corporate-actions';

const result = await getCorporateAction('ca_123', 'paper');

if (result.success) {
  console.log('Action details:', result.data);
}
```

## Error Handling

All endpoints return a consistent error format:

```json
{
  "error": "Error message description"
}
```

Common error codes:
- `400`: Invalid parameters
- `404`: Corporate action not found
- `500`: Internal server error

## Testing

Run the test suite:

```bash
npm run test src/lib/__tests__/alpaca-corporate-actions.test.ts
```

## Implementation Files

- **Edge Function**: `supabase/functions/alpaca-corporate-actions/index.ts`
- **Frontend Library**: `src/lib/alpaca-corporate-actions.ts`
- **API Routes**: 
  - `src/pages/api/alpaca/corporate-actions/index.ts`
  - `src/pages/api/alpaca/corporate-actions/[announcementId].ts`
- **Tests**: `src/lib/__tests__/alpaca-corporate-actions.test.ts`
- **Shared Client**: `supabase/functions/_shared/alpaca-client.ts`

## Notes

- Corporate actions data is read-only
- Historical data availability depends on Alpaca's data retention
- Some corporate actions may have partial information if not all dates are known
- Use appropriate date_type filter based on your use case (ex_date is most common for trading decisions)
