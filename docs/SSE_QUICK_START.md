# SSE Event Streaming - Quick Start Guide

## Installation

No installation required - the SSE event streaming is already integrated into the LeadTrade platform.

## Quick Examples

### 1. Monitor Trade Events in Trading Dashboard

```typescript
import { useTradeEvents } from '@/hooks/useAlpacaEvents'

function TradingDashboard() {
  const { isConnected, events } = useTradeEvents({
    accountId: 'your-account-id',
    onEvent: (event) => {
      // Show notification when order is filled
      if (event.event === 'fill') {
        showNotification(`Order filled: ${event.order.symbol}`)
      }
    },
  })

  return (
    <div>
      <div className="status">
        {isConnected ? '🟢 Live' : '🔴 Disconnected'}
      </div>
      <div className="events">
        {events.slice(-5).map((event, i) => (
          <div key={i}>
            {event.event}: {event.order.symbol} - {event.order.status}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 2. Track Transfer Status in Funding Page

```typescript
import { useTransferEvents } from '@/hooks/useAlpacaEvents'

function FundingPage() {
  const { events } = useTransferEvents({
    accountId: 'your-account-id',
    onEvent: (event) => {
      if (event.transfer.status === 'approved') {
        showNotification('Transfer approved! Funds will arrive soon.')
      }
    },
  })

  return (
    <div>
      <h2>Recent Transfers</h2>
      {events.map((event) => (
        <div key={event.transfer.id}>
          {event.transfer.direction} ${event.transfer.amount} - {event.transfer.status}
        </div>
      ))}
    </div>
  )
}
```

### 3. Monitor Account Status Changes

```typescript
import { useAccountStatusEvents } from '@/hooks/useAlpacaEvents'

function AccountSettings() {
  const { events } = useAccountStatusEvents({
    accountId: 'your-account-id',
    onEvent: (event) => {
      if (event.account.status === 'ACTIVE') {
        showNotification('Your account is now active!')
      }
    },
  })

  return (
    <div>
      {events.length > 0 && (
        <div className="status-change">
          Status: {events[events.length - 1].account.status}
        </div>
      )}
    </div>
  )
}
```

### 4. Filter Events by Time Range

```typescript
import { useTradeEvents } from '@/hooks/useAlpacaEvents'

function TradeHistory() {
  const { events } = useTradeEvents({
    accountId: 'your-account-id',
    since: '2024-01-09T00:00:00Z',
    until: '2024-01-09T23:59:59Z',
  })

  return (
    <div>
      <h2>Today's Trades</h2>
      {events.map((event, i) => (
        <div key={i}>
          {event.timestamp}: {event.order.symbol} - {event.event}
        </div>
      ))}
    </div>
  )
}
```

### 5. Manual Connection Control

```typescript
import { useTradeEvents } from '@/hooks/useAlpacaEvents'

function AdvancedTrading() {
  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    clearEvents,
  } = useTradeEvents({
    accountId: 'your-account-id',
    enabled: false, // Don't auto-connect
  })

  return (
    <div>
      <button onClick={connect} disabled={isConnected || isConnecting}>
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
      <button onClick={disconnect} disabled={!isConnected}>
        Disconnect
      </button>
      <button onClick={clearEvents}>
        Clear History
      </button>
    </div>
  )
}
```

## Event Types

### Trade Events
- `fill` - Order completely filled
- `partial_fill` - Order partially filled
- `canceled` - Order canceled
- `rejected` - Order rejected
- `new` - New order accepted

### Transfer Events
- `status_update` - Transfer status changed
  - Status values: `queued`, `pending`, `approved`, `canceled`, `rejected`

### Journal Events
- `status_update` - Journal status changed
  - Status values: `pending`, `executed`, `canceled`, `rejected`

### Account Status Events
- `status_change` - Account status changed
  - Status values: `ACTIVE`, `APPROVAL_PENDING`, `SUSPENDED`, etc.

## Configuration Options

```typescript
useTradeEvents({
  accountId: 'your-account-id',        // Required
  since: '2024-01-09T00:00:00Z',       // Optional: Start time
  until: '2024-01-09T23:59:59Z',       // Optional: End time
  enabled: true,                        // Optional: Auto-connect (default: true)
  autoReconnect: true,                  // Optional: Auto-reconnect (default: true)
  maxReconnectAttempts: 10,            // Optional: Max reconnect attempts (default: 10)
  onEvent: (event) => {                // Optional: Event handler
    console.log('Event:', event)
  },
})
```

## Common Patterns

### Show Real-time Notifications

```typescript
const { events } = useTradeEvents({
  accountId: 'your-account-id',
  onEvent: (event) => {
    toast.success(`${event.event}: ${event.order.symbol}`)
  },
})
```

### Update UI State

```typescript
const [orders, setOrders] = useState([])

useTradeEvents({
  accountId: 'your-account-id',
  onEvent: (event) => {
    setOrders(prev => [...prev, event.order])
  },
})
```

### Log Events

```typescript
useTradeEvents({
  accountId: 'your-account-id',
  onEvent: (event) => {
    console.log('Trade event:', {
      type: event.event,
      symbol: event.order.symbol,
      status: event.order.status,
      timestamp: event.timestamp,
    })
  },
})
```

## Troubleshooting

### Connection Not Opening
- Check that account ID is correct
- Verify Alpaca API credentials are configured
- Check browser console for errors

### Events Not Received
- Verify account has activity (trades, transfers, etc.)
- Check pagination parameters aren't filtering out events
- Ensure connection is open (`isConnected === true`)

### Frequent Reconnections
- Check network stability
- Verify Alpaca API status
- Review error logs for specific issues

## Best Practices

1. **Use specific hooks** - Use `useTradeEvents()` instead of `useAlpacaEvents({ eventType: 'trades' })`
2. **Handle errors** - Always check `error` state and show user-friendly messages
3. **Clean up events** - Call `clearEvents()` periodically to prevent memory issues
4. **Disable when not needed** - Set `enabled: false` when component is not visible
5. **Limit event buffer** - Keep only recent events in state

## Performance Tips

1. **Pagination** - Use `since` and `until` to limit event volume
2. **Conditional rendering** - Only render visible events
3. **Debounce updates** - Batch UI updates for high-frequency events
4. **Cleanup** - Disconnect when component unmounts (automatic with hooks)

## Need More Help?

See the full documentation: [SSE Event Streaming Guide](./SSE_EVENT_STREAMING.md)
