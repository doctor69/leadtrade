import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  calculatePortfolioPercentage,
  validateTradeSize,
  calculateFollowerTradeAmount,
  calculateMaxAffordableQuantity,
  estimateTradeExecutionCost
} from '../portfolio-calculator';

// Mock trading config
vi.mock('../trading-config', () => ({
  getAlpacaConfig: vi.fn(() => ({
    brokerApiKey: 'test-key',
    brokerApiSecret: 'test-secret',
    brokerBaseUrl: 'https://paper-api.alpaca.markets',
    dataApiKey: 'test-data-key',
    dataApiSecret: 'test-data-secret',
    dataBaseUrl: 'https://data.alpaca.markets',
    wsUrl: 'wss://paper-api.alpaca.markets/stream'
  }))
}));

describe('Portfolio Calculator', () => {
  describe('calculatePortfolioPercentage', () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    beforeEach(() => {
      mockFetch.mockReset();
    });

    it('should calculate correct portfolio percentage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          portfolio_value: '10000'
        })
      });

      const result = await calculatePortfolioPercentage(
        'AAPL',
        10,
        150,
        'test-access-token',
        'paper'
      );

      expect(result.success).toBe(true);
      expect(result.portfolioPercentage).toBe(0.15); // (10 * $150) / $10000 = 0.15 (15%)
      expect(result.tradeValue).toBe(1500);
      expect(result.portfolioValue).toBe(10000);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      const result = await calculatePortfolioPercentage(
        'AAPL',
        10,
        150,
        'test-token',
        'paper'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch account data');
    });

    it('should handle zero portfolio value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          portfolio_value: '0'
        })
      });

      const result = await calculatePortfolioPercentage(
        'AAPL',
        10,
        150,
        'test-token',
        'paper'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid portfolio value');
    });
  });

  describe('validateTradeSize', () => {
    it('should validate reasonable trade sizes', () => {
      const result = validateTradeSize(0.25); // 25% of portfolio
      expect(result.valid).toBe(true);
    });

    it('should reject trades that are too large', () => {
      const result = validateTradeSize(0.75); // 75% of portfolio
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Trade exceeds maximum allowed percentage of 50%');
    });

    it('should reject zero or negative percentages', () => {
      expect(validateTradeSize(0).valid).toBe(false);
      expect(validateTradeSize(-0.1).valid).toBe(false);
    });
  });

  describe('calculateFollowerTradeAmount', () => {
    it('should calculate correct follower trade amounts', () => {
      const result = calculateFollowerTradeAmount(10, 50, 10000);

      expect(result.allocatedAmount).toBe(5000); // 50% of $10k
      expect(result.proportionalAmount).toBe(500); // 10% of $5k
      expect(result.tradePercentage).toBe(0.05); // $500 is 5% of $10k portfolio
    });

    it('should handle edge cases with small amounts', () => {
      const result = calculateFollowerTradeAmount(1, 10, 1000);

      expect(result.allocatedAmount).toBe(100); // 10% of $1k
      expect(result.proportionalAmount).toBe(1); // 1% of $100
      expect(result.tradePercentage).toBe(0.001); // $1 is 0.1% of $1k portfolio
    });
  });

  describe('calculateMaxAffordableQuantity', () => {
    it('should calculate maximum affordable quantity', () => {
      const result = calculateMaxAffordableQuantity(10000, 100);
      expect(result).toBe(99); // 10000 / 100 = 100, minus 1% buffer = 99
    });

    it('should return 0 for invalid inputs', () => {
      expect(calculateMaxAffordableQuantity(0, 100)).toBe(0);
      expect(calculateMaxAffordableQuantity(10000, 0)).toBe(0);
      expect(calculateMaxAffordableQuantity(-1000, 100)).toBe(0);
    });

    it('should apply buffer correctly', () => {
      const result = calculateMaxAffordableQuantity(10000, 100, 0.05); // 5% buffer
      expect(result).toBe(95); // 10000 * 0.95 / 100 = 95
    });
  });

  describe('estimateTradeExecutionCost', () => {
    it('should calculate costs for paper trading', () => {
      const result = estimateTradeExecutionCost(10, 100, 'buy', 'paper');
      expect(result.baseAmount).toBe(1000);
      expect(result.estimatedFees).toBe(0);
      expect(result.totalCost).toBe(1000);
    });

    it('should include fees for live trading sells', () => {
      const result = estimateTradeExecutionCost(10, 100, 'sell', 'live');
      expect(result.baseAmount).toBe(1000);
      expect(result.estimatedFees).toBe(0.03); // SEC fee + buffer
      expect(result.totalCost).toBe(1000.03);
    });

    it('should include minimal fees for live trading buys', () => {
      const result = estimateTradeExecutionCost(10, 100, 'buy', 'live');
      expect(result.baseAmount).toBe(1000);
      expect(result.estimatedFees).toBe(0.01); // Just buffer
      expect(result.totalCost).toBe(1000.01);
    });
  });
});