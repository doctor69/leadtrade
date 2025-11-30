import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getTradingConfiguration,
  updateTradingConfiguration,
  enableFractionalTrading,
  disableFractionalTrading,
  suspendTrading,
  resumeTrading,
  setMarginMultiplier,
  setOptionsLevel,
  type TradingConfiguration
} from '../alpaca-trading-config'

// Mock fetch
global.fetch = vi.fn()

describe('Alpaca Trading Configuration', () => {
  const mockAccountId = 'test-account-123'
  const mockConfig: TradingConfiguration = {
    dtbp_check: 'entry',
    trade_confirm_email: 'all',
    suspend_trade: false,
    no_shorting: false,
    fractional_trading: true,
    max_margin_multiplier: '2',
    pdt_check: 'entry',
    ptp_no_exception_entry: false,
    max_options_trading_level: 2
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTradingConfiguration', () => {
    it('should fetch trading configuration successfully', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig
      })

      const result = await getTradingConfiguration(mockAccountId)

      expect(result.success).toBe(true)
      expect(result.config).toEqual(mockConfig)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/functions/v1/alpaca-trading-config/${mockAccountId}`),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      )
    })

    it('should handle fetch errors', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not found' })
      })

      const result = await getTradingConfiguration(mockAccountId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not found')
    })

    it('should validate account ID is required', async () => {
      const result = await getTradingConfiguration('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Account ID is required')
    })
  })

  describe('updateTradingConfiguration', () => {
    it('should update trading configuration successfully', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>
      const updatedConfig = { ...mockConfig, fractional_trading: false }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedConfig
      })

      const result = await updateTradingConfiguration(mockAccountId, {
        fractional_trading: false
      })

      expect(result.success).toBe(true)
      expect(result.config?.fractional_trading).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/functions/v1/alpaca-trading-config/${mockAccountId}`),
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
          body: JSON.stringify({ fractional_trading: false })
        })
      )
    })

    it('should validate margin multiplier range', async () => {
      const result = await updateTradingConfiguration(mockAccountId, {
        max_margin_multiplier: '5'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('between 1 and 4')
    })

    it('should validate at least one field is provided', async () => {
      const result = await updateTradingConfiguration(mockAccountId, {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('At least one configuration field must be provided')
    })

    it('should validate account ID is required', async () => {
      const result = await updateTradingConfiguration('', {
        fractional_trading: true
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Account ID is required')
    })
  })

  describe('Convenience methods', () => {
    beforeEach(() => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockConfig
      })
    })

    it('should enable fractional trading', async () => {
      const result = await enableFractionalTrading(mockAccountId)
      
      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ fractional_trading: true })
        })
      )
    })

    it('should disable fractional trading', async () => {
      const result = await disableFractionalTrading(mockAccountId)
      
      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ fractional_trading: false })
        })
      )
    })

    it('should suspend trading', async () => {
      const result = await suspendTrading(mockAccountId)
      
      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ suspend_trade: true })
        })
      )
    })

    it('should resume trading', async () => {
      const result = await resumeTrading(mockAccountId)
      
      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ suspend_trade: false })
        })
      )
    })

    it('should set margin multiplier', async () => {
      const result = await setMarginMultiplier(mockAccountId, 3)
      
      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ max_margin_multiplier: '3' })
        })
      )
    })

    it('should set options level', async () => {
      const result = await setOptionsLevel(mockAccountId, 2)
      
      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ max_options_trading_level: 2 })
        })
      )
    })
  })

  describe('Validation', () => {
    it('should validate dtbp_check enum values', async () => {
      const result = await updateTradingConfiguration(mockAccountId, {
        // @ts-expect-error Testing invalid value
        dtbp_check: 'invalid'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation error')
    })

    it('should validate pdt_check enum values', async () => {
      const result = await updateTradingConfiguration(mockAccountId, {
        // @ts-expect-error Testing invalid value
        pdt_check: 'invalid'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation error')
    })

    it('should validate trade_confirm_email enum values', async () => {
      const result = await updateTradingConfiguration(mockAccountId, {
        // @ts-expect-error Testing invalid value
        trade_confirm_email: 'invalid'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation error')
    })

    it('should validate max_options_trading_level range', async () => {
      const result = await updateTradingConfiguration(mockAccountId, {
        max_options_trading_level: 5
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation error')
    })
  })
})
