import { useState, useCallback, useEffect } from 'react'
import { alpacaBrokerClient, type AlpacaAccount, type AlpacaPosition, type AlpacaOrder, type AlpacaWatchlist } from '@/lib/alpaca-broker-client'
import type { EdgeFunctionResponse } from '@/lib/edgeFunctionClient'

interface UseAlpacaBrokerState {
  account: AlpacaAccount | null
  positions: AlpacaPosition[]
  orders: AlpacaOrder[]
  watchlists: AlpacaWatchlist[]
  isLoading: boolean
  error: string | null
}

interface UseAlpacaBrokerActions {
  // Account actions
  refreshAccount: () => Promise<void>
  
  // Order actions
  placeOrder: (order: Parameters<typeof alpacaBrokerClient.createOrder>[0]) => Promise<AlpacaOrder | null>
  cancelOrder: (orderId: string) => Promise<boolean>
  refreshOrders: () => Promise<void>
  
  // Position actions
  closePosition: (symbol: string, qty?: number, percentage?: number) => Promise<boolean>
  refreshPositions: () => Promise<void>
  
  // Watchlist actions
  createWatchlist: (name: string, symbols?: string[]) => Promise<AlpacaWatchlist | null>
  addToWatchlist: (watchlistId: string, symbols: string[]) => Promise<boolean>
  removeFromWatchlist: (watchlistId: string, symbols: string[]) => Promise<boolean>
  deleteWatchlist: (watchlistId: string) => Promise<boolean>
  refreshWatchlists: () => Promise<void>
  
  // Risk management actions
  getBrokerStatus: () => Promise<any>
  getRiskMetrics: () => Promise<any>
  assessTradeRisk: (assessment: Parameters<typeof alpacaBrokerClient.assessTradeRisk>[0]) => Promise<any>
  
  // Utility actions
  clearError: () => void
  setLoading: (loading: boolean) => void
}

/**
 * React hook for Alpaca broker operations
 * Provides state management and actions for all broker functionality
 */
export function useAlpacaBroker(): UseAlpacaBrokerState & UseAlpacaBrokerActions {
  const [state, setState] = useState<UseAlpacaBrokerState>({
    account: null,
    positions: [],
    orders: [],
    watchlists: [],
    isLoading: false,
    error: null
  })

  // Helper function to handle API responses
  const handleResponse = useCallback(<T>(response: EdgeFunctionResponse<T>): T | null => {
    if (response.success && response.data) {
      setState(prev => ({ ...prev, error: null }))
      return response.data
    } else {
      const errorMessage = response.error?.message || 'An error occurred'
      setState(prev => ({ ...prev, error: errorMessage }))
      console.error('Alpaca API Error:', response.error)
      return null
    }
  }, [])

  // Helper function to set loading state
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Account actions
  const refreshAccount = useCallback(async () => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.getAccount()
      const account = handleResponse(response)
      if (account) {
        setState(prev => ({ ...prev, account }))
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch account' 
      }))
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  // Order actions
  const placeOrder = useCallback(async (order: Parameters<typeof alpacaBrokerClient.createOrder>[0]) => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.createOrder(order)
      const newOrder = handleResponse(response)
      if (newOrder) {
        setState(prev => ({ 
          ...prev, 
          orders: [newOrder, ...prev.orders] 
        }))
        return newOrder
      }
      return null
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to place order' 
      }))
      return null
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  const cancelOrder = useCallback(async (orderId: string) => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.cancelOrder(orderId)
      const success = handleResponse(response) !== null
      if (success) {
        setState(prev => ({
          ...prev,
          orders: prev.orders.map(order => 
            order.id === orderId 
              ? { ...order, status: 'canceled', canceled_at: new Date().toISOString() }
              : order
          )
        }))
      }
      return success
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to cancel order' 
      }))
      return false
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  const refreshOrders = useCallback(async () => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.getOrders({ status: 'all', limit: 100 })
      const orders = handleResponse(response)
      if (orders) {
        setState(prev => ({ ...prev, orders }))
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch orders' 
      }))
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  // Position actions
  const closePosition = useCallback(async (symbol: string, qty?: number, percentage?: number) => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.closePosition(symbol, qty, percentage)
      const success = handleResponse(response) !== null
      if (success) {
        // Refresh positions to get updated data
        await refreshPositions()
      }
      return success
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to close position' 
      }))
      return false
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  const refreshPositions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.getPositions()
      const positions = handleResponse(response)
      if (positions) {
        setState(prev => ({ ...prev, positions }))
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch positions' 
      }))
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  // Watchlist actions
  const createWatchlist = useCallback(async (name: string, symbols?: string[]) => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.createWatchlist({ name, symbols })
      const watchlist = handleResponse(response)
      if (watchlist) {
        setState(prev => ({ 
          ...prev, 
          watchlists: [...prev.watchlists, watchlist] 
        }))
        return watchlist
      }
      return null
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create watchlist' 
      }))
      return null
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  const addToWatchlist = useCallback(async (watchlistId: string, symbols: string[]) => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.addSymbolsToWatchlist(watchlistId, symbols)
      const success = handleResponse(response) !== null
      if (success) {
        // Refresh watchlists to get updated data
        await refreshWatchlists()
      }
      return success
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to add symbols to watchlist' 
      }))
      return false
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  const removeFromWatchlist = useCallback(async (watchlistId: string, symbols: string[]) => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.removeSymbolsFromWatchlist(watchlistId, symbols)
      const success = handleResponse(response) !== null
      if (success) {
        // Refresh watchlists to get updated data
        await refreshWatchlists()
      }
      return success
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to remove symbols from watchlist' 
      }))
      return false
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  const deleteWatchlist = useCallback(async (watchlistId: string) => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.deleteWatchlist(watchlistId)
      const success = handleResponse(response) !== null
      if (success) {
        setState(prev => ({
          ...prev,
          watchlists: prev.watchlists.filter(w => w.id !== watchlistId)
        }))
      }
      return success
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete watchlist' 
      }))
      return false
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  const refreshWatchlists = useCallback(async () => {
    setLoading(true)
    try {
      const response = await alpacaBrokerClient.getWatchlists()
      const watchlists = handleResponse(response)
      if (watchlists) {
        setState(prev => ({ ...prev, watchlists }))
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch watchlists' 
      }))
    } finally {
      setLoading(false)
    }
  }, [handleResponse])

  // Risk management actions
  const getBrokerStatus = useCallback(async () => {
    try {
      const response = await alpacaBrokerClient.getBrokerStatus()
      return handleResponse(response)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to get broker status' 
      }))
      return null
    }
  }, [handleResponse])

  const getRiskMetrics = useCallback(async () => {
    try {
      const response = await alpacaBrokerClient.getRiskMetrics()
      return handleResponse(response)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to get risk metrics' 
      }))
      return null
    }
  }, [handleResponse])

  const assessTradeRisk = useCallback(async (assessment: Parameters<typeof alpacaBrokerClient.assessTradeRisk>[0]) => {
    try {
      const response = await alpacaBrokerClient.assessTradeRisk(assessment)
      return handleResponse(response)
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to assess trade risk' 
      }))
      return null
    }
  }, [handleResponse])

  // Auto-refresh data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          refreshAccount(),
          refreshPositions(),
          refreshOrders(),
          refreshWatchlists()
        ])
      } catch (error) {
        console.error('Failed to load initial data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, []) // Empty dependency array to run only on mount

  return {
    // State
    ...state,
    
    // Actions
    refreshAccount,
    placeOrder,
    cancelOrder,
    refreshOrders,
    closePosition,
    refreshPositions,
    createWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    deleteWatchlist,
    refreshWatchlists,
    getBrokerStatus,
    getRiskMetrics,
    assessTradeRisk,
    clearError,
    setLoading
  }
}

// Additional specialized hooks for specific use cases

/**
 * Hook for account information only
 */
export function useAlpacaAccount() {
  const [account, setAccount] = useState<AlpacaAccount | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshAccount = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await alpacaBrokerClient.getAccount()
      if (response.success && response.data) {
        setAccount(response.data)
      } else {
        setError(response.error?.message || 'Failed to fetch account')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAccount()
  }, [refreshAccount])

  return { account, isLoading, error, refreshAccount }
}

/**
 * Hook for market status
 */
export function useMarketStatus() {
  const [isOpen, setIsOpen] = useState<boolean | null>(null)
  const [clock, setClock] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refreshStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await alpacaBrokerClient.getClock()
      if (response.success && response.data) {
        setClock(response.data)
        setIsOpen(response.data.is_open)
      }
    } catch (error) {
      console.error('Failed to fetch market status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
    
    // Refresh every minute
    const interval = setInterval(refreshStatus, 60000)
    return () => clearInterval(interval)
  }, [refreshStatus])

  return { isOpen, clock, isLoading, refreshStatus }
}