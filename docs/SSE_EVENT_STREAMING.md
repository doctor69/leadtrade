# SSE Event Streaming Implementation

## Overview

This document describes the Server-Sent Events (SSE) implementation for real-time event streaming from the Alpaca Broker API. The implementation provides automatic reconnection with exponential backoff and supports multiple event types.

**Requirements:** 10.1, 10.2, 10.3, 10.4, 10.5

## Architecture

```
Client (React) 
  ↓ (fetch with Authorization header)
Supabase Edge Function (/functions/v1/alpaca-events/{type})
  ↓ (SSE Stream with Basic Auth)
Alpaca Broker API (/v1/events/* or /v2beta1/events/*)
```

**Note**: Uses fetch API with ReadableStream instead of EventSource to support custom Authorization headers for Supabase authentication.

## Event Types

### 1. Trade Events (`/v1/events/trades`)

Real-time order status updates including fills, partial fills, cancellations, and rejections.

**Event Types:**
- `fill` - Order completely filled
- `partial_fill` - Order partially filled
- `canceled` - Order canceled
- `rejected` - Order rejected
- `new` - New order accepted
- `pending_new` - Order pending acceptance

**Example Event:**
```json
{
  "event": "fill",
  "order": {
    "id": "904837e3-3b76-47ec-b432-046db621571b",
    "client_order_id": "904837e3-3b76-47ec-b432-046db621571b",
    "symbol": "AAPL",
    "side": "buy",
    "qty": "10",
    "filled_qty": "10",
    "type": "market",
    "status": "filled",
    "created_at": "2024-01-09T10:30:00Z",
    "updated_at": "2024-01-09T10:30:01Z"
  },
  "timestamp": "2024-01-09T10:30:01Z",
  "execution_id": "exec-123",
  "price": "150.25",
  "qty": "10"
}
```

### 2. Transfer Events (`/v1/events/transfers`)

Real-time transfer status changes for ACH, wire, and sandbox transfers.

**Event Types:**
- `status_update` - Transfer status changed

**Example Event:**
```json
{
  "event": "status_update",
  "transfer": {
    "id": "transfer-123",
    "account_id": "account-456",
    "type": "ach",
    "status": "approved",
    "amount": "1000.00",
    "direction": "INCOMING",
    "created_at": "2024-01-09T10:00:00Z",
    "updated_at": "2024-01-09T10:30:00Z"
  },
  "timestamp": "2024-01-09T10:30:00Z"
}
```

### 3. Journal Events (`/v1/events/journals`)

Real-time journal processing updates for cash and security transfers between accounts.

**Event Types:**
- `status_update` - Journal status changed

**Example Event:**
```json
{
  "event": "status_update",
  "journal": {
    "id": "journal-123",
    "entry_type": "JNLC",
    "from_account": "account-123",
    "to_account": "account-456",
    "status": "executed",
    "created_at": "2024-01-09T10:00:00Z",
    "updated_at": "2024-01-09T10:30:00Z"
  },
  "timestamp": "2024-01-09T10:30:00Z"
}
```

### 4. Account Status Events (`/v1/events/account_status`)

Real-time account lifecycle changes including status updates and restrictions.

**Event Types:**
- `status_change` - Account status changed

**Example Event:**
```json
{
  "event": "status_change",
  "account": {
    "id": "account-123",
    "status": "ACTIVE",
    "previous_status": "APPROVAL_PENDING",
    "reason": "KYC approved"
  },
  "timestamp": "2024-01-09T10:30:00Z"
}
```

## Pagination Parameters

All event streams support the following pagination parameters:

- `since` - ISO 8601 timestamp to start from
- `until` - ISO 8601 timestamp to end at
- `since_id` - Event ID to start from
- `until_id` - Event ID to end at
- `since_ulid` - ULID to start from
- `until_ulid` - ULID to end at

**Example:**
```typescript
const stream = createTradeEventStream({
  accountId: 'account-123',
  since: '2024-01-09T00:00:00Z',
  until: '2024-01-09T23:59:59Z',
})
```

## Usage

### Using the React Hook

```typescript
import { useTradeEvents } from '@/hooks/useAlpacaEvents'

function TradingDashboard() {
  const {
    isConnected,
    isConnecting,
    error,
    events,
    connect,
    disconnect,
    clearEvents,
  } = useTradeEvents({
    accountId: 'account-123',
    enabled: true,
    onEvent: (event) => {
      console.log('Trade event:', event)
      // Handle event (e.g., update UI, show notification)
    },
  })

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {error && <div>Error: {error}</div>}
      
      <button onClick={connect} disabled={isConnected}>
        Connect
      </button>
      <button onClick={disconnect} disabled={!isConnected}>
        Disconnect
      </button>
      <button onClick={clearEvents}>
        Clear Events
      </button>

      <div>
        <h3>Recent Events ({events.length})</h3>
        {events.map((event, index) => (
          <div key={index}>
            {JSON.stringify(event, null, 2)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Using the Client Directly

```typescript
import { createTradeEventStream } from '@/lib/alpaca-events'

const stream = createTradeEventStream({
  accountId: 'account-123',
  autoReconnect: true,
  maxReconnectAttempts: 10,
  
  onOpen: () => {
    console.log('Connected to trade events')
  },
  
  onMessage: (event) => {
    const data = JSON.parse(event.data)
    console.log('Trade event:', data)
  },
  
  onError: (error) => {
    console.error('Connection error:', error)
  },
  
  onClose: () => {
    console.log('Connection closed')
  },
})

// Connect
stream.connect()

// Later, disconnect
stream.close()
```

### Transfer Events

```typescript
import { useTransferEvents } from '@/hooks/useAlpacaEvents'

function FundingPage() {
  const { events } = useTransferEvents({
    accountId: 'account-123',
    onEvent: (event) => {
      if (event.transfer.status === 'approved') {
        showNotification('Transfer approved!')
      }
    },
  })

  return (
    <div>
      {events.map((event) => (
        <div key={event.transfer.id}>
          Transfer {event.transfer.id}: {event.transfer.status}
        </div>
      ))}
    </div>
  )
}
```

### Journal Events

```typescript
import { useJournalEvents } from '@/hooks/useAlpacaEvents'

function AdminDashboard() {
  const { events } = useJournalEvents({
    accountId: 'admin-account',
    onEvent: (event) => {
      console.log('Journal update:', event.journal)
    },
  })

  return (
    <div>
      {events.map((event) => (
        <div key={event.journal.id}>
          Journal {event.journal.id}: {event.journal.status}
        </div>
      ))}
    </div>
  )
}
```

### Account Status Events

```typescript
import { useAccountStatusEvents } from '@/hooks/useAlpacaEvents'

function AccountSettings() {
  const { events } = useAccountStatusEvents({
    accountId: 'account-123',
    onEvent: (event) => {
      if (event.account.status === 'ACTIVE') {
        showNotification('Account activated!')
      }
    },
  })

  return (
    <div>
      {events.map((event) => (
        <div key={event.account.id}>
          Status changed: {event.account.previous_status} → {event.account.status}
        </div>
      ))}
    </div>
  )
}
```

## Automatic Reconnection

The SSE client implements automatic reconnection with exponential backoff:

1. **Initial Delay:** 1 second (configurable)
2. **Max Delay:** 30 seconds (configurable)
3. **Backoff Strategy:** Exponential with jitter
4. **Max Attempts:** 10 (configurable)

**Configuration:**
```typescript
const stream = createTradeEventStream({
  accountId: 'account-123',
  autoReconnect: true,
  maxReconnectAttempts: 10,
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
})
```

**Reconnection Flow:**
1. Connection fails or closes unexpectedly
2. Wait for initial delay (1s)
3. Attempt reconnection
4. If fails, double the delay (2s, 4s, 8s, etc.)
5. Add random jitter to prevent thundering herd
6. Cap delay at max delay (30s)
7. Repeat until max attempts reached or connection succeeds

## Heartbeat

The SSE connection includes heartbeat events to keep the connection alive and detect stale connections:

```typescript
// Heartbeat events are automatically handled
// Custom handling can be added:
stream.addEventListener('heartbeat', (event) => {
  console.log('Heartbeat received:', event.data)
})
```

## Error Handling

### Connection Errors

```typescript
const stream = createTradeEventStream({
  accountId: 'account-123',
  onError: (error) => {
    console.error('Connection error:', error)
    // Handle error (e.g., show notification, log to monitoring)
  },
})
```

### Message Parsing Errors

```typescript
const stream = createTradeEventStream({
  accountId: 'account-123',
  onMessage: (event) => {
    try {
      const data = JSON.parse(event.data)
      // Process data
    } catch (error) {
      console.error('Failed to parse event:', error)
    }
  },
})
```

## Testing

Run the test suite:

```bash
npm run test src/lib/__tests__/alpaca-events.test.ts
```

**Test Coverage:**
- Connection management
- Pagination parameters
- Automatic reconnection
- Event handling
- Helper functions
- Connection state

## API Endpoints

### Edge Function (Direct Connection)

**URL:** `{SUPABASE_URL}/functions/v1/alpaca-events/{event_type}`

**Event Types:**
- `trades`
- `transfers`
- `journals`
- `account_status`

**Query Parameters:**
- `account_id` - Alpaca account ID (optional if in auth context)
- `since` - ISO 8601 timestamp
- `until` - ISO 8601 timestamp
- `since_id` - Event ID
- `until_id` - Event ID
- `since_ulid` - ULID
- `until_ulid` - ULID

**Headers:**
- `Authorization: Bearer {token}` - Supabase auth token (required)
- `Accept: text/event-stream`

**Implementation Note**: The client uses fetch API with ReadableStream instead of EventSource to support custom Authorization headers.

## Performance Considerations

1. **Connection Pooling:** Reuse connections when possible
2. **Event Buffering:** Buffer events during reconnection
3. **Memory Management:** Clear old events periodically
4. **Bandwidth:** Use pagination to limit event volume

## Security

1. **Authentication:** All requests require valid Supabase auth token
2. **Authorization:** Users can only access their own account events
3. **Rate Limiting:** Implement rate limiting to prevent abuse
4. **CORS:** Properly configured CORS headers

## Troubleshooting

### Connection Fails Immediately

- Check Alpaca API credentials
- Verify account ID is correct
- Check network connectivity

### Events Not Received

- Verify event type is correct
- Check pagination parameters
- Ensure account has activity

### Frequent Reconnections

- Check network stability
- Verify Alpaca API status
- Review error logs

### Memory Issues

- Clear old events periodically
- Limit event buffer size
- Disconnect when not needed

## Related Documentation

- [Deployment Guide](./SSE_DEPLOYMENT.md) - How to deploy and configure the edge function
- [Quick Start Guide](./SSE_QUICK_START.md) - Quick examples and common patterns
- [Alpaca Broker API - Events](https://alpaca.markets/docs/broker/api-references/events/)
- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MDN - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
