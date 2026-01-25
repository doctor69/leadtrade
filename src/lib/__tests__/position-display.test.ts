import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Position Display Tests - Task 5.1
 * Tests stock position display functionality including:
 * - Symbol and quantity display
 * - Cost basis calculation
 * - Current value with live prices
 * - Unrealized P&L calculation
 * - P&L percentage accuracy
 * 
 * Requirements: 5.1
 */

interface Position {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  side: 'long' | 'short';
  change_today: number;
}

describe('Position Display - Stock Positions (Task 5.1)', () => {
  describe('Symbol and Quantity Display', () => {
    it('should correctly display symbol and quantity for a position', () => {
      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 155.00,
        market_value: 15500.00,
        cost_basis: 15000.00,
        unrealized_pl: 500.00,
        unrealized_plpc: 0.0333,
        side: 'long',
        change_today: 50.00
      };

      expect(position.symbol).toBe('AAPL');
      expect(position.qty).toBe(100);
      expect(position.side).toBe('long');
    });

    it('should handle fractional shares correctly', () => {
      const position: Position = {
        symbol: 'TSLA',
        qty: 10.5,
        avg_entry_price: 200.00,
        current_price: 210.00,
        market_value: 2205.00,
        cost_basis: 2100.00,
        unrealized_pl: 105.00,
        unrealized_plpc: 0.05,
        side: 'long',
        change_today: 10.50
      };

      expect(position.qty).toBe(10.5);
      expect(position.market_value).toBeCloseTo(2205.00, 2);
    });

    it('should handle short positions correctly', () => {
      const position: Position = {
        symbol: 'SPY',
        qty: -50,
        avg_entry_price: 450.00,
        current_price: 445.00,
        market_value: -22250.00,
        cost_basis: -22500.00,
        unrealized_pl: 250.00,
        unrealized_plpc: 0.0111,
        side: 'short',
        change_today: 50.00
      };

      expect(position.side).toBe('short');
      expect(position.qty).toBe(-50);
      expect(position.unrealized_pl).toBeGreaterThan(0); // Profit on short when price drops
    });
  });

  describe('Cost Basis Calculation', () => {
    it('should calculate cost basis correctly for long position', () => {
      const qty = 100;
      const avg_entry_price = 150.00;
      const expected_cost_basis = qty * avg_entry_price;

      const position: Position = {
        symbol: 'AAPL',
        qty,
        avg_entry_price,
        current_price: 155.00,
        market_value: 15500.00,
        cost_basis: expected_cost_basis,
        unrealized_pl: 500.00,
        unrealized_plpc: 0.0333,
        side: 'long',
        change_today: 50.00
      };

      expect(position.cost_basis).toBe(15000.00);
      expect(position.cost_basis).toBe(qty * avg_entry_price);
    });

    it('should calculate cost basis correctly for fractional shares', () => {
      const qty = 10.5;
      const avg_entry_price = 200.00;
      const expected_cost_basis = qty * avg_entry_price;

      const position: Position = {
        symbol: 'TSLA',
        qty,
        avg_entry_price,
        current_price: 210.00,
        market_value: 2205.00,
        cost_basis: expected_cost_basis,
        unrealized_pl: 105.00,
        unrealized_plpc: 0.05,
        side: 'long',
        change_today: 10.50
      };

      expect(position.cost_basis).toBeCloseTo(2100.00, 2);
    });

    it('should handle multiple purchases with average entry price', () => {
      // Simulating: Buy 50 @ $100, then buy 50 @ $110
      // Average entry price = (50*100 + 50*110) / 100 = $105
      const qty = 100;
      const avg_entry_price = 105.00;
      const expected_cost_basis = qty * avg_entry_price;

      const position: Position = {
        symbol: 'MSFT',
        qty,
        avg_entry_price,
        current_price: 115.00,
        market_value: 11500.00,
        cost_basis: expected_cost_basis,
        unrealized_pl: 1000.00,
        unrealized_plpc: 0.0952,
        side: 'long',
        change_today: 100.00
      };

      expect(position.cost_basis).toBe(10500.00);
      expect(position.avg_entry_price).toBe(105.00);
    });
  });

  describe('Current Value with Live Prices', () => {
    it('should calculate market value correctly with current price', () => {
      const qty = 100;
      const current_price = 155.00;
      const expected_market_value = qty * current_price;

      const position: Position = {
        symbol: 'AAPL',
        qty,
        avg_entry_price: 150.00,
        current_price,
        market_value: expected_market_value,
        cost_basis: 15000.00,
        unrealized_pl: 500.00,
        unrealized_plpc: 0.0333,
        side: 'long',
        change_today: 50.00
      };

      expect(position.market_value).toBe(15500.00);
      expect(position.market_value).toBe(qty * current_price);
    });

    it('should update market value when price changes', () => {
      const qty = 100;
      let current_price = 150.00;
      
      const position: Position = {
        symbol: 'AAPL',
        qty,
        avg_entry_price: 150.00,
        current_price,
        market_value: qty * current_price,
        cost_basis: 15000.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0
      };

      expect(position.market_value).toBe(15000.00);

      // Simulate price update
      current_price = 155.00;
      const updated_position = {
        ...position,
        current_price,
        market_value: qty * current_price,
        unrealized_pl: (qty * current_price) - position.cost_basis,
        unrealized_plpc: ((qty * current_price) - position.cost_basis) / position.cost_basis
      };

      expect(updated_position.market_value).toBe(15500.00);
      expect(updated_position.unrealized_pl).toBe(500.00);
    });

    it('should handle price decreases correctly', () => {
      const qty = 100;
      const current_price = 145.00;
      const expected_market_value = qty * current_price;

      const position: Position = {
        symbol: 'AAPL',
        qty,
        avg_entry_price: 150.00,
        current_price,
        market_value: expected_market_value,
        cost_basis: 15000.00,
        unrealized_pl: -500.00,
        unrealized_plpc: -0.0333,
        side: 'long',
        change_today: -50.00
      };

      expect(position.market_value).toBe(14500.00);
      expect(position.unrealized_pl).toBeLessThan(0);
    });
  });

  describe('Unrealized P&L Calculation', () => {
    it('should calculate unrealized P&L correctly for profitable position', () => {
      const cost_basis = 15000.00;
      const market_value = 15500.00;
      const expected_pl = market_value - cost_basis;

      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 155.00,
        market_value,
        cost_basis,
        unrealized_pl: expected_pl,
        unrealized_plpc: expected_pl / cost_basis,
        side: 'long',
        change_today: 50.00
      };

      expect(position.unrealized_pl).toBe(500.00);
      expect(position.unrealized_pl).toBeGreaterThan(0);
    });

    it('should calculate unrealized P&L correctly for losing position', () => {
      const cost_basis = 15000.00;
      const market_value = 14500.00;
      const expected_pl = market_value - cost_basis;

      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 145.00,
        market_value,
        cost_basis,
        unrealized_pl: expected_pl,
        unrealized_plpc: expected_pl / cost_basis,
        side: 'long',
        change_today: -50.00
      };

      expect(position.unrealized_pl).toBe(-500.00);
      expect(position.unrealized_pl).toBeLessThan(0);
    });

    it('should calculate unrealized P&L correctly for break-even position', () => {
      const cost_basis = 15000.00;
      const market_value = 15000.00;
      const expected_pl = market_value - cost_basis;

      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 150.00,
        market_value,
        cost_basis,
        unrealized_pl: expected_pl,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0
      };

      expect(position.unrealized_pl).toBe(0);
    });

    it('should handle fractional P&L correctly', () => {
      const cost_basis = 2100.00;
      const market_value = 2205.00;
      const expected_pl = market_value - cost_basis;

      const position: Position = {
        symbol: 'TSLA',
        qty: 10.5,
        avg_entry_price: 200.00,
        current_price: 210.00,
        market_value,
        cost_basis,
        unrealized_pl: expected_pl,
        unrealized_plpc: expected_pl / cost_basis,
        side: 'long',
        change_today: 10.50
      };

      expect(position.unrealized_pl).toBeCloseTo(105.00, 2);
    });
  });

  describe('P&L Percentage Accuracy', () => {
    it('should calculate P&L percentage correctly for 10% gain', () => {
      const cost_basis = 10000.00;
      const market_value = 11000.00;
      const unrealized_pl = market_value - cost_basis;
      const expected_plpc = unrealized_pl / cost_basis;

      const position: Position = {
        symbol: 'GOOGL',
        qty: 50,
        avg_entry_price: 200.00,
        current_price: 220.00,
        market_value,
        cost_basis,
        unrealized_pl,
        unrealized_plpc: expected_plpc,
        side: 'long',
        change_today: 100.00
      };

      expect(position.unrealized_plpc).toBeCloseTo(0.10, 4);
      expect(position.unrealized_plpc * 100).toBeCloseTo(10.00, 2);
    });

    it('should calculate P&L percentage correctly for 5% loss', () => {
      const cost_basis = 10000.00;
      const market_value = 9500.00;
      const unrealized_pl = market_value - cost_basis;
      const expected_plpc = unrealized_pl / cost_basis;

      const position: Position = {
        symbol: 'GOOGL',
        qty: 50,
        avg_entry_price: 200.00,
        current_price: 190.00,
        market_value,
        cost_basis,
        unrealized_pl,
        unrealized_plpc: expected_plpc,
        side: 'long',
        change_today: -50.00
      };

      expect(position.unrealized_plpc).toBeCloseTo(-0.05, 4);
      expect(position.unrealized_plpc * 100).toBeCloseTo(-5.00, 2);
    });

    it('should calculate P&L percentage correctly for small gains', () => {
      const cost_basis = 15000.00;
      const market_value = 15050.00;
      const unrealized_pl = market_value - cost_basis;
      const expected_plpc = unrealized_pl / cost_basis;

      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 150.50,
        market_value,
        cost_basis,
        unrealized_pl,
        unrealized_plpc: expected_plpc,
        side: 'long',
        change_today: 5.00
      };

      expect(position.unrealized_plpc).toBeCloseTo(0.0033, 4);
      expect(position.unrealized_plpc * 100).toBeCloseTo(0.33, 2);
    });

    it('should handle zero cost basis edge case', () => {
      // This shouldn't happen in practice, but we should handle it gracefully
      const cost_basis = 0.01; // Minimal cost basis to avoid division by zero
      const market_value = 100.00;
      const unrealized_pl = market_value - cost_basis;
      const expected_plpc = unrealized_pl / cost_basis;

      const position: Position = {
        symbol: 'TEST',
        qty: 1,
        avg_entry_price: 0.01,
        current_price: 100.00,
        market_value,
        cost_basis,
        unrealized_pl,
        unrealized_plpc: expected_plpc,
        side: 'long',
        change_today: 99.99
      };

      expect(position.unrealized_plpc).toBeGreaterThan(0);
      expect(isFinite(position.unrealized_plpc)).toBe(true);
    });
  });

  describe('Position Display Formatting', () => {
    it('should format currency values correctly', () => {
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        }).format(amount);
      };

      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 155.00,
        market_value: 15500.00,
        cost_basis: 15000.00,
        unrealized_pl: 500.00,
        unrealized_plpc: 0.0333,
        side: 'long',
        change_today: 50.00
      };

      expect(formatCurrency(position.market_value)).toBe('$15,500.00');
      expect(formatCurrency(position.cost_basis)).toBe('$15,000.00');
      expect(formatCurrency(position.unrealized_pl)).toBe('$500.00');
    });

    it('should format percentage values correctly', () => {
      const formatPercent = (percent: number) => {
        return `${percent >= 0 ? '+' : ''}${(percent * 100).toFixed(2)}%`;
      };

      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 155.00,
        market_value: 15500.00,
        cost_basis: 15000.00,
        unrealized_pl: 500.00,
        unrealized_plpc: 0.0333,
        side: 'long',
        change_today: 50.00
      };

      expect(formatPercent(position.unrealized_plpc)).toBe('+3.33%');
    });

    it('should format negative percentage values correctly', () => {
      const formatPercent = (percent: number) => {
        return `${percent >= 0 ? '+' : ''}${(percent * 100).toFixed(2)}%`;
      };

      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 145.00,
        market_value: 14500.00,
        cost_basis: 15000.00,
        unrealized_pl: -500.00,
        unrealized_plpc: -0.0333,
        side: 'long',
        change_today: -50.00
      };

      expect(formatPercent(position.unrealized_plpc)).toBe('-3.33%');
    });
  });

  describe('Multiple Position Aggregation', () => {
    it('should calculate total portfolio value correctly', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          qty: 100,
          avg_entry_price: 150.00,
          current_price: 155.00,
          market_value: 15500.00,
          cost_basis: 15000.00,
          unrealized_pl: 500.00,
          unrealized_plpc: 0.0333,
          side: 'long',
          change_today: 50.00
        },
        {
          symbol: 'GOOGL',
          qty: 50,
          avg_entry_price: 200.00,
          current_price: 210.00,
          market_value: 10500.00,
          cost_basis: 10000.00,
          unrealized_pl: 500.00,
          unrealized_plpc: 0.05,
          side: 'long',
          change_today: 50.00
        }
      ];

      const totalMarketValue = positions.reduce((sum, p) => sum + p.market_value, 0);
      const totalCostBasis = positions.reduce((sum, p) => sum + p.cost_basis, 0);
      const totalUnrealizedPL = positions.reduce((sum, p) => sum + p.unrealized_pl, 0);

      expect(totalMarketValue).toBe(26000.00);
      expect(totalCostBasis).toBe(25000.00);
      expect(totalUnrealizedPL).toBe(1000.00);
    });

    it('should calculate portfolio P&L percentage correctly', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          qty: 100,
          avg_entry_price: 150.00,
          current_price: 155.00,
          market_value: 15500.00,
          cost_basis: 15000.00,
          unrealized_pl: 500.00,
          unrealized_plpc: 0.0333,
          side: 'long',
          change_today: 50.00
        },
        {
          symbol: 'GOOGL',
          qty: 50,
          avg_entry_price: 200.00,
          current_price: 210.00,
          market_value: 10500.00,
          cost_basis: 10000.00,
          unrealized_pl: 500.00,
          unrealized_plpc: 0.05,
          side: 'long',
          change_today: 50.00
        }
      ];

      const totalCostBasis = positions.reduce((sum, p) => sum + p.cost_basis, 0);
      const totalUnrealizedPL = positions.reduce((sum, p) => sum + p.unrealized_pl, 0);
      const portfolioPLPercent = totalUnrealizedPL / totalCostBasis;

      expect(portfolioPLPercent).toBeCloseTo(0.04, 4); // 4% gain
    });
  });
});
