/**
 * React Hook for Alpaca SSE Events
 * 
 * Provides easy integration of SSE event streams in React components
 * with automatic cleanup and reconnection.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  AlpacaEventStream,
  type EventType,
  type SSEConnectionOptions,
  type TradeEvent,
  type TransferEvent,
  type JournalEvent,
  type AccountStatusEvent,
} from '../lib/alpaca-events'

export interface UseAlpacaEventsOptions {
  eventType: EventType
  accountId?: string
  since?: string
  until?: string
  since_id?: string
  until_id?: string
  since_ulid?: string
  until_ulid?: string
  enabled?: boolean
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  onEvent?: (event: TradeEvent | TransferEvent | JournalEvent | AccountStatusEvent) => void
}

export interface UseAlpacaEventsReturn {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  events: Array<TradeEvent | TransferEvent | JournalEvent | AccountStatusEvent>
  connect: () => void
  disconnect: () => void
  clearEvents: () => void
}

/**
 * Hook for subscribing to Alpaca SSE events
 */
export function useAlpacaEvents(
  options: UseAlpacaEventsOptions
): UseAlpacaEventsReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<Array<TradeEvent | TransferEvent | JournalEvent | AccountStatusEvent>>([])
  
  const streamRef = useRef<AlpacaEventStream | null>(null)
  const optionsRef = useRef(options)

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Connect to event stream
  const connect = useCallback(() => {
    if (streamRef.current) {
      console.warn('Already connected to event stream')
      return
    }

    setIsConnecting(true)
    setError(null)

    const streamOptions: SSEConnectionOptions = {
      eventType: optionsRef.current.eventType,
      accountId: optionsRef.current.accountId,
      since: optionsRef.current.since,
      until: optionsRef.current.until,
      since_id: optionsRef.current.since_id,
      until_id: optionsRef.current.until_id,
      since_ulid: optionsRef.current.since_ulid,
      until_ulid: optionsRef.current.until_ulid,
      autoReconnect: optionsRef.current.autoReconnect !== false,
      maxReconnectAttempts: optionsRef.current.maxReconnectAttempts,
      
      onOpen: () => {
        console.log('Event stream connected')
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
      },

      onMessage: (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          
          // Add event to list
          setEvents((prev) => [...prev, data])

          // Call custom event handler if provided
          if (optionsRef.current.onEvent) {
            optionsRef.current.onEvent(data)
          }
        } catch (err) {
          console.error('Error parsing event data:', err)
        }
      },

      onError: (err: Event) => {
        console.error('Event stream error:', err)
        setError('Connection error occurred')
        setIsConnecting(false)
      },

      onClose: () => {
        console.log('Event stream closed')
        setIsConnected(false)
        setIsConnecting(false)
      },
    }

    streamRef.current = new AlpacaEventStream(streamOptions)
    streamRef.current.connect()
  }, [])

  // Disconnect from event stream
  const disconnect = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.close()
      streamRef.current = null
      setIsConnected(false)
      setIsConnecting(false)
    }
  }, [])

  // Clear events list
  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  // Auto-connect when enabled
  useEffect(() => {
    if (options.enabled !== false) {
      connect()
    }

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [options.enabled, connect, disconnect])

  return {
    isConnected,
    isConnecting,
    error,
    events,
    connect,
    disconnect,
    clearEvents,
  }
}

/**
 * Hook for subscribing to trade events
 */
export function useTradeEvents(
  options: Omit<UseAlpacaEventsOptions, 'eventType'>
): UseAlpacaEventsReturn {
  return useAlpacaEvents({
    ...options,
    eventType: 'trades',
  })
}

/**
 * Hook for subscribing to transfer events
 */
export function useTransferEvents(
  options: Omit<UseAlpacaEventsOptions, 'eventType'>
): UseAlpacaEventsReturn {
  return useAlpacaEvents({
    ...options,
    eventType: 'transfers',
  })
}

/**
 * Hook for subscribing to journal events
 */
export function useJournalEvents(
  options: Omit<UseAlpacaEventsOptions, 'eventType'>
): UseAlpacaEventsReturn {
  return useAlpacaEvents({
    ...options,
    eventType: 'journals',
  })
}

/**
 * Hook for subscribing to account status events
 */
export function useAccountStatusEvents(
  options: Omit<UseAlpacaEventsOptions, 'eventType'>
): UseAlpacaEventsReturn {
  return useAlpacaEvents({
    ...options,
    eventType: 'account_status',
  })
}
