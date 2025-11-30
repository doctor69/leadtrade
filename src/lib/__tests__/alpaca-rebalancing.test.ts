import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validatePortfolioWeights,
  calculatePortfolioDrift,
  shouldRebalance
} from '../alpaca-rebalancing'

// Mock supabase
const mockGetSession = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession
    }
  }
}))

// Mock fetch
global.fetch = vi.fn()

describe('Alpaca Rebalancing API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful authentication
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-token'
        }
      }
    })
  })



  describe('Helper Functions', () => {
    describe('validatePortfolioWeights', () => {
      it('should validate correct weights', () => {
        const weights = {
          SPY: 0.6,
          AGG: 0.4
        }

        const result = validatePortfolioWeights(weights)

        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })

      it('should reject weights that do not sum to 1.0', () => {
        const weights = {
          SPY: 0.5,
          AGG: 0.3
        }

        const result = validatePortfolioWeights(weights)

        expect(result.valid).toBe(false)
        expect(result.error).toContain('must sum to 1.0')
      })

      it('should reject negative weights', () => {
        const weights = {
          SPY: 1.2,
          AGG: -0.2
        }

        const result = validatePortfolioWeights(weights)

        expect(result.valid).toBe(false)
        expect(result.error).toContain('cannot be negative')
      })

      it('should handle floating point precision', () => {
        const weights = {
          SPY: 0.333333,
          AGG: 0.333333,
          GLD: 0.333334
        }

        const result = validatePortfolioWeights(weights)

        expect(result.valid).toBe(true)
      })
    })

    describe('calculatePortfolioDrift', () => {
      it('should calculate drift correctly', () => {
        const currentWeights = {
          SPY: 0.65,
          AGG: 0.35
        }

        const targetWeights = {
          SPY: 0.60,
          AGG: 0.40
        }

        const drift = calculatePortfolioDrift(currentWeights, targetWeights)

        expect(drift).toBeCloseTo(0.10, 2) // 5% + 5% = 10% total drift
      })

      it('should handle missing assets in current weights', () => {
        const currentWeights = {
          SPY: 1.0
        }

        const targetWeights = {
          SPY: 0.6,
          AGG: 0.4
        }

        const drift = calculatePortfolioDrift(currentWeights, targetWeights)

        expect(drift).toBeCloseTo(0.80, 2) // 40% + 40% = 80% drift
      })

      it('should return zero for identical weights', () => {
        const weights = {
          SPY: 0.6,
          AGG: 0.4
        }

        const drift = calculatePortfolioDrift(weights, weights)

        expect(drift).toBe(0)
      })
    })

    describe('shouldRebalance', () => {
      it('should return true when drift exceeds threshold', () => {
        const currentWeights = {
          SPY: 0.70,
          AGG: 0.30
        }

        const targetWeights = {
          SPY: 0.60,
          AGG: 0.40
        }

        const result = shouldRebalance(currentWeights, targetWeights, 0.05)

        expect(result).toBe(true)
      })

      it('should return false when drift is below threshold', () => {
        const currentWeights = {
          SPY: 0.62,
          AGG: 0.38
        }

        const targetWeights = {
          SPY: 0.60,
          AGG: 0.40
        }

        const result = shouldRebalance(currentWeights, targetWeights, 0.05)

        expect(result).toBe(false)
      })

      it('should handle edge case at exact threshold', () => {
        const currentWeights = {
          SPY: 0.65,
          AGG: 0.35
        }

        const targetWeights = {
          SPY: 0.60,
          AGG: 0.40
        }

        // Drift is exactly 0.10 (10%)
        const result = shouldRebalance(currentWeights, targetWeights, 0.10)

        expect(result).toBe(true) // Should rebalance at threshold
      })
    })
  })

})
