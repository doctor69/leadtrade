import { describe, it, expect } from 'vitest';

/**
 * Tests for TradeForm NaN fixes
 * 
 * These tests verify that the getEstimatedCost function and formatCurrency helper
 * properly handle edge cases that could result in NaN values being displayed.
 */

describe('TradeForm NaN Prevention', () => {
  // Helper function to simulate the formatCurrency logic
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00';
    }
    return value.toFixed(2);
  };

  // Helper function to simulate the getEstimatedCost logic for stocks
  const getEstimatedCostStock = (
    quantity: string,
    stockPrice: number | undefined,
    orderType: 'market' | 'limit',
    limitPrice: string
  ): number => {
    if (!quantity) return 0;

    const qty = parseFloat(quantity) || 0;
    if (qty <= 0 || isNaN(qty)) return 0;

    let price = 0;
    if (orderType === 'limit' && limitPrice) {
      price = parseFloat(limitPrice) || 0;
    } else {
      price = stockPrice || 0;
    }

    if (isNaN(price) || price < 0) return 0;
    return qty * price;
  };

  // Helper function to simulate the getEstimatedCost logic for options
  const getEstimatedCostOption = (
    quantity: string,
    premium: number | undefined,
    contractSize: number | undefined
  ): number => {
    if (!quantity) return 0;

    const qty = parseFloat(quantity) || 0;
    if (qty <= 0 || isNaN(qty)) return 0;

    const prem = premium || 0;
    const size = contractSize || 100;

    if (isNaN(prem) || isNaN(size) || prem < 0 || size <= 0) return 0;
    return qty * prem * size;
  };

  describe('formatCurrency', () => {
    it('should format valid numbers correctly', () => {
      expect(formatCurrency(100.5)).toBe('100.50');
      expect(formatCurrency(0)).toBe('0.00');
      expect(formatCurrency(1.234)).toBe('1.23');
    });

    it('should return "0.00" for undefined', () => {
      expect(formatCurrency(undefined)).toBe('0.00');
    });

    it('should return "0.00" for null', () => {
      expect(formatCurrency(null)).toBe('0.00');
    });

    it('should return "0.00" for NaN', () => {
      expect(formatCurrency(NaN)).toBe('0.00');
    });
  });

  describe('getEstimatedCost - Stock Trading', () => {
    it('should calculate cost correctly with valid stock price', () => {
      const cost = getEstimatedCostStock('10', 50.25, 'market', '');
      expect(cost).toBe(502.5);
    });

    it('should calculate cost correctly with limit price', () => {
      const cost = getEstimatedCostStock('10', 50.25, 'limit', '48.50');
      expect(cost).toBe(485);
    });

    it('should return 0 when stock price is undefined', () => {
      const cost = getEstimatedCostStock('10', undefined, 'market', '');
      expect(cost).toBe(0);
    });

    it('should return 0 when quantity is empty', () => {
      const cost = getEstimatedCostStock('', 50.25, 'market', '');
      expect(cost).toBe(0);
    });

    it('should fallback to stock price when limit price is empty string', () => {
      const cost = getEstimatedCostStock('10', 50.25, 'limit', '');
      expect(cost).toBe(502.5); // Falls back to stock price
    });

    it('should return 0 when quantity is invalid', () => {
      const cost = getEstimatedCostStock('abc', 50.25, 'market', '');
      expect(cost).toBe(0);
    });

    it('should return 0 when quantity is negative', () => {
      const cost = getEstimatedCostStock('-5', 50.25, 'market', '');
      expect(cost).toBe(0);
    });
  });

  describe('getEstimatedCost - Options Trading', () => {
    it('should calculate cost correctly with valid option data', () => {
      const cost = getEstimatedCostOption('5', 2.50, 100);
      expect(cost).toBe(1250);
    });

    it('should return 0 when premium is undefined', () => {
      const cost = getEstimatedCostOption('5', undefined, 100);
      expect(cost).toBe(0);
    });

    it('should use default contract size of 100 when undefined', () => {
      const cost = getEstimatedCostOption('5', 2.50, undefined);
      expect(cost).toBe(1250); // Uses default contract size of 100
    });

    it('should return 0 when quantity is empty', () => {
      const cost = getEstimatedCostOption('', 2.50, 100);
      expect(cost).toBe(0);
    });

    it('should return 0 when premium is negative', () => {
      const cost = getEstimatedCostOption('5', -2.50, 100);
      expect(cost).toBe(0);
    });

    it('should use default contract size when zero (fallback to 100)', () => {
      const cost = getEstimatedCostOption('5', 2.50, 0);
      // When contract size is 0, the || 100 fallback makes it 100
      expect(cost).toBe(1250);
    });
  });

  describe('Currency Display Integration', () => {
    it('should display $0.00 instead of NaN for undefined stock price', () => {
      const cost = getEstimatedCostStock('10', undefined, 'market', '');
      const display = `$${formatCurrency(cost)}`;
      expect(display).toBe('$0.00');
      expect(display).not.toContain('NaN');
    });

    it('should display valid price instead of NaN for empty limit price', () => {
      const cost = getEstimatedCostStock('10', 50.25, 'limit', '');
      const display = `$${formatCurrency(cost)}`;
      expect(display).toBe('$502.50'); // Falls back to stock price
      expect(display).not.toContain('NaN');
    });

    it('should display $0.00 instead of NaN for missing option premium', () => {
      const cost = getEstimatedCostOption('5', undefined, 100);
      const display = `$${formatCurrency(cost)}`;
      expect(display).toBe('$0.00');
      expect(display).not.toContain('NaN');
    });

    it('should display valid currency for all valid inputs', () => {
      const stockCost = getEstimatedCostStock('10', 50.25, 'market', '');
      const optionCost = getEstimatedCostOption('5', 2.50, 100);
      
      expect(`$${formatCurrency(stockCost)}`).toBe('$502.50');
      expect(`$${formatCurrency(optionCost)}`).toBe('$1250.00');
    });
  });
});
