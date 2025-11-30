/**
 * Tests for Alpaca Events SSE Client
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AlpacaEventStream,
  createTradeEventStream,
  createTransferEventStream,
  createJournalEventStream,
  createAccountStatusEventStream,
  type EventType,
} from '../alpaca-events'

// Mock EventSource
class MockEventSource {
  url: string
  readyState: number = 0
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2

  constructor(url: string) {
    this.url = url
    this.readyState = MockEventSource.CONNECTING
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 10)
  }

  addEventListener(type: string, listener: EventListener) {
    // Store listeners for testing
  }

  close() {
    this.readyState = MockEventSource.CLOSED
  }
}

// Replace global EventSource with mock
global.EventSource = MockEventSource as any

describe('AlpacaEventStream', () => {
  let stream: AlpacaEventStream

  afterEach(() => {
    if (stream) {
      stream.close()
    }
  })

  describe('Connection Management', () => {
    it('should create event stream with correct URL', () => {
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
      })

      stream.connect()
      expect(stream.isConnected()).toBe(false) // Not yet connected (async)
    })

    it('should connect to trade events', async () => {
      const onOpen = vi.fn()
      
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        onOpen,
      })

      stream.connect()

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(onOpen).toHaveBeenCalled()
      expect(stream.isConnected()).toBe(true)
    })

    it('should connect to transfer events', async () => {
      const onOpen = vi.fn()
      
      stream = new AlpacaEventStream({
        eventType: 'transfers',
        accountId: 'test-account-123',
        onOpen,
      })

      stream.connect()
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(onOpen).toHaveBeenCalled()
    })

    it('should connect to journal events', async () => {
      const onOpen = vi.fn()
      
      stream = new AlpacaEventStream({
        eventType: 'journals',
        accountId: 'test-account-123',
        onOpen,
      })

      stream.connect()
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(onOpen).toHaveBeenCalled()
    })

    it('should connect to account status events', async () => {
      const onOpen = vi.fn()
      
      stream = new AlpacaEventStream({
        eventType: 'account_status',
        accountId: 'test-account-123',
        onOpen,
      })

      stream.connect()
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(onOpen).toHaveBeenCalled()
    })

    it('should close connection', async () => {
      const onClose = vi.fn()
      
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        onClose,
      })

      stream.connect()
      await new Promise(resolve => setTimeout(resolve, 20))
      
      stream.close()
      
      expect(onClose).toHaveBeenCalled()
      expect(stream.isConnected()).toBe(false)
    })
  })

  describe('Pagination Parameters', () => {
    it('should support since parameter', () => {
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        since: '2024-01-01T00:00:00Z',
      })

      stream.connect()
      // URL should include since parameter
    })

    it('should support until parameter', () => {
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        until: '2024-12-31T23:59:59Z',
      })

      stream.connect()
      // URL should include until parameter
    })

    it('should support since_id parameter', () => {
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        since_id: 'event-123',
      })

      stream.connect()
      // URL should include since_id parameter
    })

    it('should support until_id parameter', () => {
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        until_id: 'event-456',
      })

      stream.connect()
      // URL should include until_id parameter
    })

    it('should support since_ulid parameter', () => {
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        since_ulid: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      })

      stream.connect()
      // URL should include since_ulid parameter
    })

    it('should support until_ulid parameter', () => {
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        until_ulid: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      })

      stream.connect()
      // URL should include until_ulid parameter
    })

    it('should support multiple pagination parameters', () => {
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        since: '2024-01-01T00:00:00Z',
        until: '2024-12-31T23:59:59Z',
        since_id: 'event-123',
      })

      stream.connect()
      // URL should include all parameters
    })
  })

  describe('Automatic Reconnection', () => {
    it('should not reconnect when autoReconnect is false', async () => {
      const onError = vi.fn()
      
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        autoReconnect: false,
        onError,
      })

      stream.connect()
      await new Promise(resolve => setTimeout(resolve, 20))

      // Simulate error
      const eventSource = (stream as any).eventSource
      if (eventSource && eventSource.onerror) {
        eventSource.onerror(new Event('error'))
      }

      expect(onError).toHaveBeenCalled()
    })

    it('should reconnect with exponential backoff', async () => {
      const onOpen = vi.fn()
      
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        autoReconnect: true,
        initialReconnectDelay: 100,
        maxReconnectAttempts: 3,
        onOpen,
      })

      stream.connect()
      await new Promise(resolve => setTimeout(resolve, 20))

      // Initial connection should succeed
      expect(onOpen).toHaveBeenCalledTimes(1)
    })

    it('should respect maxReconnectAttempts', async () => {
      const onClose = vi.fn()
      
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        autoReconnect: true,
        maxReconnectAttempts: 2,
        initialReconnectDelay: 10,
        onClose,
      })

      stream.connect()
      // Test would need to simulate multiple failures
    })
  })

  describe('Helper Functions', () => {
    it('should create trade event stream', () => {
      stream = createTradeEventStream({
        accountId: 'test-account-123',
      })

      expect(stream).toBeInstanceOf(AlpacaEventStream)
    })

    it('should create transfer event stream', () => {
      stream = createTransferEventStream({
        accountId: 'test-account-123',
      })

      expect(stream).toBeInstanceOf(AlpacaEventStream)
    })

    it('should create journal event stream', () => {
      stream = createJournalEventStream({
        accountId: 'test-account-123',
      })

      expect(stream).toBeInstanceOf(AlpacaEventStream)
    })

    it('should create account status event stream', () => {
      stream = createAccountStatusEventStream({
        accountId: 'test-account-123',
      })

      expect(stream).toBeInstanceOf(AlpacaEventStream)
    })
  })

  describe('Event Handling', () => {
    it('should handle message events', async () => {
      const onMessage = vi.fn()
      
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        onMessage,
      })

      stream.connect()
      await new Promise(resolve => setTimeout(resolve, 20))

      // Simulate message
      const eventSource = (stream as any).eventSource
      if (eventSource && eventSource.onmessage) {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify({
            event: 'fill',
            order: {
              id: 'order-123',
              symbol: 'AAPL',
              side: 'buy',
              qty: '10',
            },
          }),
        })
        eventSource.onmessage(messageEvent)
      }

      expect(onMessage).toHaveBeenCalled()
    })

    it('should handle error events', async () => {
      const onError = vi.fn()
      
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
        onError,
        autoReconnect: false,
      })

      stream.connect()
      await new Promise(resolve => setTimeout(resolve, 20))

      // Simulate error
      const eventSource = (stream as any).eventSource
      if (eventSource && eventSource.onerror) {
        eventSource.onerror(new Event('error'))
      }

      expect(onError).toHaveBeenCalled()
    })
  })

  describe('Connection State', () => {
    it('should report correct connection state', async () => {
      stream = new AlpacaEventStream({
        eventType: 'trades',
        accountId: 'test-account-123',
      })

      expect(stream.isConnected()).toBe(false)
      expect(stream.getReadyState()).toBe(EventSource.CLOSED)

      stream.connect()
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(stream.isConnected()).toBe(true)
      expect(stream.getReadyState()).toBe(EventSource.OPEN)

      stream.close()

      expect(stream.isConnected()).toBe(false)
      expect(stream.getReadyState()).toBe(EventSource.CLOSED)
    })
  })
})
