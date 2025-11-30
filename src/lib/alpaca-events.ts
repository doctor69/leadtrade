/**
 * Alpaca Events SSE Client
 * 
 * Provides real-time event streaming for trades, transfers, journals, and account status
 * with automatic reconnection and exponential backoff.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

export type EventType = 'trades' | 'transfers' | 'journals' | 'account_status'

export interface SSEConnectionOptions {
  eventType: EventType
  accountId?: string
  since?: string
  until?: string
  since_id?: string
  until_id?: string
  since_ulid?: string
  until_ulid?: string
  onMessage?: (event: MessageEvent) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  onClose?: () => void
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  initialReconnectDelay?: number
  maxReconnectDelay?: number
}

export interface TradeEvent {
  event: 'fill' | 'partial_fill' | 'canceled' | 'rejected' | 'new' | 'pending_new' | 'accepted'
  order: {
    id: string
    client_order_id: string
    symbol: string
    side: 'buy' | 'sell'
    qty: string
    filled_qty: string
    type: string
    status: string
    created_at: string
    updated_at: string
  }
  timestamp: string
  execution_id?: string
  price?: string
  qty?: string
}

export interface TransferEvent {
  event: 'status_update'
  transfer: {
    id: string
    account_id: string
    type: 'ach' | 'wire' | 'sandbox'
    status: 'queued' | 'pending' | 'sent_to_clearing' | 'approved' | 'canceled' | 'rejected'
    amount: string
    direction: 'INCOMING' | 'OUTGOING'
    created_at: string
    updated_at: string
  }
  timestamp: string
}

export interface JournalEvent {
  event: 'status_update'
  journal: {
    id: string
    entry_type: 'JNLC' | 'JNLS'
    from_account: string
    to_account: string
    status: 'pending' | 'executed' | 'canceled' | 'rejected'
    created_at: string
    updated_at: string
  }
  timestamp: string
}

export interface AccountStatusEvent {
  event: 'status_change'
  account: {
    id: string
    status: string
    previous_status: string
    reason?: string
  }
  timestamp: string
}

/**
 * SSE Event Stream Client with automatic reconnection
 */
export class AlpacaEventStream {
  private eventSource: EventSource | null = null
  private options: Required<SSEConnectionOptions>
  private reconnectAttempts = 0
  private reconnectTimer: number | null = null
  private isManualClose = false
  private currentReconnectDelay: number

  constructor(options: SSEConnectionOptions) {
    this.options = {
      eventType: options.eventType,
      accountId: options.accountId || '',
      since: options.since || '',
      until: options.until || '',
      since_id: options.since_id || '',
      until_id: options.until_id || '',
      since_ulid: options.since_ulid || '',
      until_ulid: options.until_ulid || '',
      onMessage: options.onMessage || (() => {}),
      onError: options.onError || (() => {}),
      onOpen: options.onOpen || (() => {}),
      onClose: options.onClose || (() => {}),
      autoReconnect: options.autoReconnect !== false,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      initialReconnectDelay: options.initialReconnectDelay || 1000,
      maxReconnectDelay: options.maxReconnectDelay || 30000,
    }

    this.currentReconnectDelay = this.options.initialReconnectDelay
  }

  /**
   * Connect to the SSE event stream
   */
  connect(): void {
    if (this.eventSource) {
      console.warn('EventSource already connected')
      return
    }

    this.isManualClose = false

    // Build URL with query parameters
    const params = new URLSearchParams()
    
    if (this.options.accountId) params.append('account_id', this.options.accountId)
    if (this.options.since) params.append('since', this.options.since)
    if (this.options.until) params.append('until', this.options.until)
    if (this.options.since_id) params.append('since_id', this.options.since_id)
    if (this.options.until_id) params.append('until_id', this.options.until_id)
    if (this.options.since_ulid) params.append('since_ulid', this.options.since_ulid)
    if (this.options.until_ulid) params.append('until_ulid', this.options.until_ulid)

    const queryString = params.toString()
    const url = `/api/alpaca/events/${this.options.eventType}${queryString ? '?' + queryString : ''}`

    console.log('Connecting to SSE:', url)

    try {
      this.eventSource = new EventSource(url)

      // Handle connection open
      this.eventSource.onopen = () => {
        console.log('SSE connection opened')
        this.reconnectAttempts = 0
        this.currentReconnectDelay = this.options.initialReconnectDelay
        this.options.onOpen()
      }

      // Handle messages
      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          this.options.onMessage(event)
        } catch (error) {
          console.error('Error handling SSE message:', error)
        }
      }

      // Handle errors
      this.eventSource.onerror = (error: Event) => {
        console.error('SSE error:', error)
        this.options.onError(error)

        // Attempt reconnection if enabled and not manually closed
        if (this.options.autoReconnect && !this.isManualClose) {
          this.handleReconnect()
        }
      }

      // Add custom event listeners for specific event types
      this.addCustomEventListeners()

    } catch (error) {
      console.error('Error creating EventSource:', error)
      if (this.options.autoReconnect && !this.isManualClose) {
        this.handleReconnect()
      }
    }
  }

  /**
   * Add custom event listeners for specific event types
   */
  private addCustomEventListeners(): void {
    if (!this.eventSource) return

    // Listen for heartbeat events to keep connection alive
    this.eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
      console.log('Received heartbeat:', event.data)
    })

    // Listen for specific event types based on stream type
    switch (this.options.eventType) {
      case 'trades':
        this.eventSource.addEventListener('fill', this.options.onMessage)
        this.eventSource.addEventListener('partial_fill', this.options.onMessage)
        this.eventSource.addEventListener('canceled', this.options.onMessage)
        this.eventSource.addEventListener('rejected', this.options.onMessage)
        break
      
      case 'transfers':
      case 'journals':
      case 'account_status':
        this.eventSource.addEventListener('status_update', this.options.onMessage)
        break
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.options.onClose()
      return
    }

    // Close existing connection
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    // Clear any existing reconnect timer
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    console.log(
      `Reconnecting in ${this.currentReconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`
    )

    // Schedule reconnection
    this.reconnectTimer = setTimeout(() => {
      this.connect()
      
      // Exponential backoff with jitter
      this.currentReconnectDelay = Math.min(
        this.currentReconnectDelay * 2 + Math.random() * 1000,
        this.options.maxReconnectDelay
      )
    }, this.currentReconnectDelay)
  }

  /**
   * Close the SSE connection
   */
  close(): void {
    this.isManualClose = true

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      console.log('SSE connection closed')
    }

    this.options.onClose()
  }

  /**
   * Check if the connection is open
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN
  }

  /**
   * Get the current connection state
   */
  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED
  }
}

/**
 * Create a trade event stream
 */
export function createTradeEventStream(
  options: Omit<SSEConnectionOptions, 'eventType'>
): AlpacaEventStream {
  return new AlpacaEventStream({
    ...options,
    eventType: 'trades',
  })
}

/**
 * Create a transfer event stream
 */
export function createTransferEventStream(
  options: Omit<SSEConnectionOptions, 'eventType'>
): AlpacaEventStream {
  return new AlpacaEventStream({
    ...options,
    eventType: 'transfers',
  })
}

/**
 * Create a journal event stream
 */
export function createJournalEventStream(
  options: Omit<SSEConnectionOptions, 'eventType'>
): AlpacaEventStream {
  return new AlpacaEventStream({
    ...options,
    eventType: 'journals',
  })
}

/**
 * Create an account status event stream
 */
export function createAccountStatusEventStream(
  options: Omit<SSEConnectionOptions, 'eventType'>
): AlpacaEventStream {
  return new AlpacaEventStream({
    ...options,
    eventType: 'account_status',
  })
}
