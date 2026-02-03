/**
 * Alpaca Events SSE Client
 * 
 * Provides real-time event streaming for trades, transfers, journals, and account status
 * with automatic reconnection and exponential backoff.
 * 
 * Uses fetch API with ReadableStream instead of EventSource to support custom headers.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { supabase } from './supabase'

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
 * Uses fetch API with ReadableStream to support custom headers (for auth)
 */
export class AlpacaEventStream {
  private abortController: AbortController | null = null
  private options: Required<SSEConnectionOptions>
  private reconnectAttempts = 0
  private reconnectTimer: number | null = null
  private isManualClose = false
  private currentReconnectDelay: number
  private isConnected = false

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
   * Connect to the SSE event stream using fetch API
   */
  async connect(): Promise<void> {
    if (this.abortController) {
      console.warn('Already connected to event stream')
      return
    }

    this.isManualClose = false
    this.abortController = new AbortController()

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
    
    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      console.error('SUPABASE_URL not configured')
      this.options.onError(new Event('error'))
      return
    }

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      console.error('No auth session')
      this.options.onError(new Event('error'))
      return
    }

    // Connect directly to Supabase edge function
    const url = `${supabaseUrl}/functions/v1/alpaca-events/${this.options.eventType}${queryString ? '?' + queryString : ''}`

    console.log('Connecting to SSE:', url)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'text/event-stream',
        },
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Connection successful
      this.isConnected = true
      this.reconnectAttempts = 0
      this.currentReconnectDelay = this.options.initialReconnectDelay
      this.options.onOpen()

      // Read the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('SSE stream ended')
          this.isConnected = false
          break
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6) // Remove 'data: ' prefix
            
            // Create a MessageEvent-like object
            const event = new MessageEvent('message', {
              data: data,
            })
            
            this.options.onMessage(event)
          }
        }
      }

      // Stream ended normally
      if (!this.isManualClose && this.options.autoReconnect) {
        this.handleReconnect()
      } else {
        this.options.onClose()
      }

    } catch (error) {
      console.error('SSE connection error:', error)
      this.isConnected = false
      
      if (error instanceof Error && error.name === 'AbortError') {
        // Manual close
        this.options.onClose()
        return
      }

      this.options.onError(new Event('error'))

      // Attempt reconnection if enabled and not manually closed
      if (this.options.autoReconnect && !this.isManualClose) {
        this.handleReconnect()
      } else {
        this.options.onClose()
      }
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
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
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
    }, this.currentReconnectDelay) as unknown as number
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

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
      console.log('SSE connection closed')
    }

    this.isConnected = false
    this.options.onClose()
  }

  /**
   * Check if the connection is open
   */
  getIsConnected(): boolean {
    return this.isConnected
  }

  /**
   * Get the current connection state
   */
  getReadyState(): number {
    return this.isConnected ? 1 : 3 // OPEN : CLOSED
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
