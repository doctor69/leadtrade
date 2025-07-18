import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  calculatePortfolioPercentage,
  validateTradeSize,
  calculateFollowerTradeAmount,
  calculateMaxAffordableQuantity,
  estimateTradeExecutionCost
} from '../portfolio-calculator';
import { getAlpacaConfig } from '../trading-config';

// Mock dependencies
vi.mock('../trading-config');
vi.mock('../env', () => ({
  env: {
    PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    PUBLIC_ALPACA_PAPER_BROKER_API_KEY: 'test-key',
    PUBLIC_ALPACA_PAPER_BROKER_API_SECRET: 'test-secret',
    PUBLIC_ALPACA_PAPER_BROKER_BASE_URL: 'https://paper-api.alpaca.markets',
    PUBLIC_ALPACA_PAPER_DATA_API_KEY: 'test-data-key',
    PUBLIC_ALPACA_PAPER_DATA_API_SECRET: 'test-data-secret',
    PUBLIC_ALPACA_PAPER_DATA_BASE_URL: 'https://data.alpaca.markets',
    PUBLIC_ALPACA_PAPER_WS_URL: 'wss://stream.data.alpaca.markets',
    PUBLIC_ALPACA_LIVE_BROKER_API_KEY: 'test-live-key',
    PUBLIC_ALPACA_LIVE_BROKER_API_SECRET: 'test-live-secret',
    PUBLIC_ALPACA_LIVE_BROKER_BASE_URL: 'https://api.alpaca.markets',
    PUBLIC_ALPACA_LIVE_DATA_API_KEY: 'test-live-data-key',
    PUBLIC_ALPACA_LIVE_DATA_API_SECRET: 'test-live-data-secret',
    PUBLIC_ALPACA_LIVE_DATA_BASE_URL: 'https://data.alpaca.markets',
    PUBLIC_ALPACA_LIVE_WS_URL: 'wss://stream.data.alpaca.markets'
  }
}));
const mockGetAlpacaConfig = vi.mocked(getAlpacaConfig);

// Mock fetch globally
global.fetch = vi.fn();

describe('Portfolio Calculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGetAlpacaConfig.mockReturnValue({
      brokerApiKey: 'test-key',
      brokerApiSecret: 'test-secret',
      brokerBaseUrl: 'https://paper-api.alpaca.markets',
      dataApiKey: 'test-data-key',
      dataApiSecret: 'test-data-secret',
      dataBaseUrl: 'https://data.alpaca.markets',
      wsUrl: 'wss://stream.data.alpaca.markets'
    });
  });

  describe('calculatePortfolioPercentage', () => {
    it('should calculate correct portfolio percentage', async () => {
      // Mock Alpaca account response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          portfolio_value: '10000.00'
        })
      });

      const result = await calculatePortfolioPercentage(
        'AAPL',
        10,
        150.00,
        'test-token',
        'paper'
      );

      expect(result.success).toBe(true);
      expect(result.portfolioPercentage).toBe(15); // (10 * $150) / $10000 * 100 = 15%
      expect(result.tradeValue).toBe(1500);
      expect(result.portfolioValue).toBe(10000);
    });

    it('should handle API errors gracefully', async () => {
      // Mock failed API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const result = await calculatePortfolioPercentage(
        'AAPL',
        10,
        150.00,
        'invalid-token',
        'paper'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch account data');
    });

    it('should handle zero portfolio value', async () => {
      // Mock account with zero portfolio value
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          portfolio_value: '0.00'
        })
      });

      const result = await calculatePortfolioPercentage(
        'AAPL',
        10,
        150.00,
        'test-token',
        'paper'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid portfolio value');
    });
  });

  describe('validateTradeSize', () => {
    it('should validate reasonable trade sizes', () => {
      const result = validateTradeSize(25); // 25% of portfolio
      expect(result.valid).toBe(true);
    });

    it('should reject trades that are too large', () => {
      const result = validateTradeSize(75, 50); // 75% when max is 50%
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('exceeds maximum allowed percentage');
    });

    it('should reject zero or negative percentages', () => {
      const result = validateTradeSize(0);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Trade percentage must be positive');
    });
  });

  describe('calculateFollowerTradeAmount', () => {
    it('should calculate correct follower trade amounts', () => {
      const result = calculateFollowerTradeAmount(
        10, // Leader used 10% of portfolio
        50, // Follower allocated 50% to this leader
        10000 // Follower has $10k portfolio
      );

      expect(result.allocatedAmount).toBe(5000); // 50% of $10k
      expect(result.proportionalAmount).toBe(500); // 10% of $5k
      expect(result.tradePercentage).toBe(5); // $500 is 5% of $10k portfolio
    });

    it('should handle edge cases with small amounts', () => {
      const result = calculateFollowerTradeAmount(
        1, // Leader used 1% of portfolio
        10, // Follower allocated 10% to this leader
        1000 // Follower has $1k portfolio
      );

      expect(result.allocatedAmount).toBe(100); // 10% of $1k
      expect(result.proportionalAmount).toBe(1); // 1% of $100
      expect(result.tradePercentage).toBe(0.1); // $1 is 0.1% of $1k portfolio
    });
  });

  describe('calculateMaxAffordableQuantity', () => {
    it('should calculate maximum affordable quantity', () => {
      const result = calculateMaxAffordableQuantity(1000, 150); // $1000 buying power, $150/share
      expect(result).toBe(6); // Floor((1000 * 0.99) / 150) = 6 shares
    });

    it('should return 0 for invalid inputs', () => {
      expect(calculateMaxAffordableQuantity(0, 150)).toBe(0);
      expect(calculateMaxAffordableQuantity(1000, 0)).toBe(0);
      expect(calculateMaxAffordableQuantity(-100, 150)).toBe(0);
    });

    it('should apply buffer correctly', () => {
      const result = calculateMaxAffordableQuantity(1000, 100, 0.05); // 5% buffer
      expect(result).toBe(9); // Floor((1000 * 0.95) / 100) = 9 shares
    });
  });

  describe('estimateTradeExecutionCost', () => {
    it('should calculate costs for paper trading', () => {
      const result = estimateTradeExecutionCost(10, 150, 'buy', 'paper');
      
      expect(result.baseAmount).toBe(1500);
      expect(result.estimatedFees).toBe(0);
      expect(result.totalCost).toBe(1500);
    });

    it('should include fees for live trading sells', () => {
      const result = estimateTradeExecutionCost(100, 150, 'sell', 'live');
      
      expect(result.baseAmount).toBe(15000);
      expect(result.estimatedFees).toBeGreaterThan(0);
      expect(result.totalCost).toBeGreaterThan(15000);
    });

    it('should include minimal fees for live trading buys', () => {
      const result = estimateTradeExecutionCost(10, 150, 'buy', 'live');
      
      expect(result.baseAmount).toBe(1500);
      expect(result.estimatedFees).toBe(0.01); // Just the buffer
      expect(result.totalCost).toBe(1500.01);
    });
  });
});