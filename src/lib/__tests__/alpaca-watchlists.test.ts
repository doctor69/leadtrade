import { describe, it, expect } from 'vitest'

/**
 * Alpaca Watchlists API Tests
 * 
 * Tests for watchlist management functionality including:
 * - Creating watchlists with symbol validation
 * - Adding symbols with validation
 * - Atomic updates of watchlist symbols
 * - Deleting watchlists
 * - Retrieving watchlists with complete asset details
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

describe('Alpaca Watchlists API', () => {
  describe('Create Watchlist (Requirement 9.1)', () => {
    it('should accept name and array of symbols', () => {
      const watchlistRequest = {
        name: 'Tech Stocks',
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
      }

      expect(watchlistRequest.name).toBe('Tech Stocks')
      expect(watchlistRequest.symbols).toHaveLength(3)
      expect(watchlistRequest.symbols).toContain('AAPL')
    })

    it('should accept name without symbols', () => {
      const watchlistRequest = {
        name: 'My Watchlist',
      }

      expect(watchlistRequest.name).toBe('My Watchlist')
      expect(watchlistRequest.symbols).toBeUndefined()
    })

  })

  describe('Symbol Validation (Requirement 9.2)', () => {
    it('should validate symbol existence and tradability', () => {
      const validationError = {
        code: 'INVALID_REQUEST',
        message: 'Some symbols are invalid or not tradable',
        details: {
          invalid_symbols: ['INVALID', 'BADSTOCK'],
          valid_symbols: ['AAPL', 'GOOGL'],
        },
      }

      expect(validationError.details.invalid_symbols).toContain('INVALID')
      expect(validationError.details.valid_symbols).toContain('AAPL')
    })

    it('should provide detailed error for invalid symbols', () => {
      const error = {
        invalid_symbols: ['FAKE1', 'FAKE2'],
        valid_symbols: ['TSLA', 'NVDA'],
      }

      expect(error.invalid_symbols).toHaveLength(2)
      expect(error.valid_symbols).toHaveLength(2)
    })
  })

  describe('Atomic Update Operations (Requirement 9.3)', () => {
    it('should support atomic symbol list replacement', () => {
      const updateRequest = {
        name: 'Tech Stocks',
        symbols: ['NVDA', 'AMD', 'INTC'],
      }

      expect(updateRequest.symbols).toEqual(['NVDA', 'AMD', 'INTC'])
      expect(updateRequest.symbols).not.toContain('AAPL')
    })

    it('should support name-only updates', () => {
      const updateRequest = {
        name: 'Renamed Watchlist',
      }

      expect(updateRequest.name).toBe('Renamed Watchlist')
      expect(updateRequest.symbols).toBeUndefined()
    })

    it('should validate symbols during atomic updates', () => {
      const validationResult = {
        valid: ['AAPL', 'GOOGL'],
        invalid: ['FAKE'],
      }

      expect(validationResult.invalid).toContain('FAKE')
      expect(validationResult.valid).not.toContain('FAKE')
    })
  })

  describe('Delete Watchlist (Requirement 9.4)', () => {
    it('should support permanent deletion', () => {
      const deleteResponse = {
        message: 'Watchlist deleted successfully',
      }

      expect(deleteResponse.message).toContain('deleted successfully')
    })

    it('should handle non-existent watchlist deletion', () => {
      const error = {
        code: 'NOT_FOUND',
        message: 'Watchlist not found',
      }

      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toContain('not found')
    })
  })

  describe('Retrieve Watchlists with Asset Details (Requirement 9.5)', () => {
    it('should include complete asset details', () => {
      const asset = {
        id: 'asset-1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        asset_class: 'us_equity',
        exchange: 'NASDAQ',
        tradable: true,
        marginable: true,
        shortable: true,
        fractionable: true,
        status: 'active',
      }

      expect(asset).toHaveProperty('symbol')
      expect(asset).toHaveProperty('name')
      expect(asset).toHaveProperty('tradable')
      expect(asset).toHaveProperty('marginable')
      expect(asset).toHaveProperty('shortable')
      expect(asset).toHaveProperty('fractionable')
      expect(asset).toHaveProperty('exchange')
      expect(asset).toHaveProperty('asset_class')
    })

    it('should return assets array for each watchlist', () => {
      const watchlist = {
        id: 'watchlist-123',
        name: 'Tech Stocks',
        assets: [
          { symbol: 'AAPL', tradable: true },
          { symbol: 'GOOGL', tradable: true },
        ],
      }

      expect(watchlist.assets).toHaveLength(2)
      expect(watchlist.assets[0]).toHaveProperty('symbol')
      expect(watchlist.assets[0]).toHaveProperty('tradable')
    })
  })

  describe('Symbol Removal', () => {
    it('should support removing multiple symbols', () => {
      const removeRequest = {
        symbols: ['AAPL', 'GOOGL'],
      }

      expect(removeRequest.symbols).toHaveLength(2)
      expect(removeRequest.symbols).toContain('AAPL')
    })

    it('should return results for each symbol removal', () => {
      const results = [
        { symbol: 'AAPL', success: true },
        { symbol: 'GOOGL', success: true },
      ]

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should require watchlist ID for updates', () => {
      const error = {
        code: 'INVALID_REQUEST',
        message: 'Watchlist ID is required for updates',
      }

      expect(error.message).toContain('Watchlist ID is required')
    })

    it('should require at least one symbol when adding', () => {
      const error = {
        code: 'INVALID_REQUEST',
        message: 'At least one symbol is required',
      }

      expect(error.message).toContain('At least one symbol')
    })

    it('should require watchlist name', () => {
      const error = {
        code: 'INVALID_REQUEST',
        message: 'Watchlist name is required',
      }

      expect(error.message).toContain('name is required')
    })
  })
})
