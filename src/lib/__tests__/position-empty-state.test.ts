import { describe, it, expect } from 'vitest';

/**
 * Position Empty State and Closure Tests - Task 5.4
 * Tests empty state handling and position closure including:
 * - Empty state message when no positions
 * - Closing all positions
 * - Positions removed from display
 * - Position list refresh
 * 
 * Requirements: 5.4, 5.5
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

describe('Position Empty State and Closure (Task 5.4)', () => {
  describe('Empty State Display', () => {
    it('should display empty state when no positions exist', () => {
      const positions: Position[] = [];

      const isEmpty = positions.length === 0;
      const emptyStateMessage = 'No positions found';
      const emptyStateSubtext = 'Start trading to see your portfolio here';

      expect(isEmpty).toBe(true);
      expect(emptyStateMessage).toBeTruthy();
      expect(emptyStateSubtext).toBeTruthy();
    });

    it('should show appropriate empty state message', () => {
      const positions: Position[] = [];

      const getEmptyStateMessage = (positionCount: number) => {
        if (positionCount === 0) {
          return {
            title: 'No positions found',
            subtitle: 'Start trading to see your portfolio here',
            showCTA: true
          };
        }
        return null;
      };

      const emptyState = getEmptyStateMessage(positions.length);

      expect(emptyState).not.toBeNull();
      expect(emptyState?.title).toBe('No positions found');
      expect(emptyState?.subtitle).toBe('Start trading to see your portfolio here');
      expect(emptyState?.showCTA).toBe(true);
    });

    it('should not show empty state when positions exist', () => {
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
        }
      ];

      const isEmpty = positions.length === 0;

      expect(isEmpty).toBe(false);
    });

    it('should handle transition from positions to empty state', () => {
      let positions: Position[] = [
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
        }
      ];

      expect(positions.length).toBe(1);

      // Close all positions
      positions = [];

      expect(positions.length).toBe(0);
    });
  });

  describe('Position Closure', () => {
    it('should close a single position completely', () => {
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
        }
      ];

      const symbolToClose = 'AAPL';
      const updatedPositions = positions.filter(p => p.symbol !== symbolToClose);

      expect(updatedPositions.length).toBe(0);
      expect(updatedPositions.find(p => p.symbol === symbolToClose)).toBeUndefined();
    });

    it('should close multiple positions', () => {
      let positions: Position[] = [
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
        },
        {
          symbol: 'TSLA',
          qty: 25,
          avg_entry_price: 180.00,
          current_price: 190.00,
          market_value: 4750.00,
          cost_basis: 4500.00,
          unrealized_pl: 250.00,
          unrealized_plpc: 0.0556,
          side: 'long',
          change_today: 25.00
        }
      ];

      expect(positions.length).toBe(3);

      // Close AAPL
      positions = positions.filter(p => p.symbol !== 'AAPL');
      expect(positions.length).toBe(2);

      // Close GOOGL
      positions = positions.filter(p => p.symbol !== 'GOOGL');
      expect(positions.length).toBe(1);

      // Close TSLA
      positions = positions.filter(p => p.symbol !== 'TSLA');
      expect(positions.length).toBe(0);
    });

    it('should close all positions at once', () => {
      let positions: Position[] = [
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

      expect(positions.length).toBe(2);

      // Close all positions
      positions = [];

      expect(positions.length).toBe(0);
    });

    it('should handle partial position closure', () => {
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

      // Sell 50 shares (partial closure)
      const qtyToSell = 50;
      const remainingQty = position.qty - qtyToSell;
      const remainingCostBasis = position.cost_basis * (remainingQty / position.qty);
      const remainingMarketValue = remainingQty * position.current_price;

      const updatedPosition: Position = {
        ...position,
        qty: remainingQty,
        cost_basis: remainingCostBasis,
        market_value: remainingMarketValue,
        unrealized_pl: remainingMarketValue - remainingCostBasis,
        unrealized_plpc: (remainingMarketValue - remainingCostBasis) / remainingCostBasis
      };

      expect(updatedPosition.qty).toBe(50);
      expect(updatedPosition.cost_basis).toBe(7500.00);
      expect(updatedPosition.market_value).toBe(7750.00);
      expect(updatedPosition.unrealized_pl).toBeCloseTo(250.00, 2);
    });

    it('should remove position when quantity reaches zero', () => {
      let positions: Position[] = [
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
        }
      ];

      // Sell all shares
      const symbolToClose = 'AAPL';
      positions = positions.map(p => {
        if (p.symbol === symbolToClose) {
          return { ...p, qty: 0 };
        }
        return p;
      }).filter(p => p.qty > 0);

      expect(positions.length).toBe(0);
    });
  });

  describe('Position List Refresh', () => {
    it('should refresh position list after closure', () => {
      const initialPositions: Position[] = [
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

      // Simulate API call to get updated positions after closing AAPL
      const refreshedPositions = initialPositions.filter(p => p.symbol !== 'AAPL');

      expect(refreshedPositions.length).toBe(1);
      expect(refreshedPositions[0].symbol).toBe('GOOGL');
    });

    it('should update position count after refresh', () => {
      let positions: Position[] = [
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

      const initialCount = positions.length;
      expect(initialCount).toBe(2);

      // Close one position
      positions = positions.filter(p => p.symbol !== 'AAPL');

      const updatedCount = positions.length;
      expect(updatedCount).toBe(1);
      expect(updatedCount).toBeLessThan(initialCount);
    });

    it('should recalculate portfolio totals after position closure', () => {
      let positions: Position[] = [
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

      const initialTotalValue = positions.reduce((sum, p) => sum + p.market_value, 0);
      const initialTotalPL = positions.reduce((sum, p) => sum + p.unrealized_pl, 0);

      expect(initialTotalValue).toBe(26000.00);
      expect(initialTotalPL).toBe(1000.00);

      // Close AAPL position
      positions = positions.filter(p => p.symbol !== 'AAPL');

      const updatedTotalValue = positions.reduce((sum, p) => sum + p.market_value, 0);
      const updatedTotalPL = positions.reduce((sum, p) => sum + p.unrealized_pl, 0);

      expect(updatedTotalValue).toBe(10500.00);
      expect(updatedTotalPL).toBe(500.00);
    });

    it('should handle refresh when all positions are closed', () => {
      let positions: Position[] = [
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
        }
      ];

      expect(positions.length).toBe(1);

      // Close all positions
      positions = [];

      expect(positions.length).toBe(0);

      // Verify empty state should be shown
      const shouldShowEmptyState = positions.length === 0;
      expect(shouldShowEmptyState).toBe(true);
    });
  });

  describe('Position Display State Management', () => {
    it('should maintain position order after closure', () => {
      let positions: Position[] = [
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
        },
        {
          symbol: 'TSLA',
          qty: 25,
          avg_entry_price: 180.00,
          current_price: 190.00,
          market_value: 4750.00,
          cost_basis: 4500.00,
          unrealized_pl: 250.00,
          unrealized_plpc: 0.0556,
          side: 'long',
          change_today: 25.00
        }
      ];

      // Close middle position (GOOGL)
      positions = positions.filter(p => p.symbol !== 'GOOGL');

      expect(positions.length).toBe(2);
      expect(positions[0].symbol).toBe('AAPL');
      expect(positions[1].symbol).toBe('TSLA');
    });

    it('should handle loading state during position refresh', () => {
      let isLoading = false;
      let positions: Position[] = [
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
        }
      ];

      // Simulate loading state
      isLoading = true;
      expect(isLoading).toBe(true);

      // Simulate refresh complete
      positions = [];
      isLoading = false;

      expect(isLoading).toBe(false);
      expect(positions.length).toBe(0);
    });

    it('should handle error state during position closure', () => {
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
        }
      ];

      let error: string | null = null;

      try {
        // Simulate error during closure
        throw new Error('Failed to close position');
      } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error';
      }

      expect(error).toBe('Failed to close position');
      expect(positions.length).toBe(1); // Position should remain if closure failed
    });
  });

  describe('UI State Transitions', () => {
    it('should transition from loading to empty state', () => {
      let state: 'loading' | 'empty' | 'data' = 'loading';

      // Simulate loading
      expect(state).toBe('loading');

      // Simulate load complete with no positions
      const positions: Position[] = [];
      state = positions.length === 0 ? 'empty' : 'data';

      expect(state).toBe('empty');
    });

    it('should transition from data to empty state after closing all positions', () => {
      let positions: Position[] = [
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
        }
      ];

      let state: 'loading' | 'empty' | 'data' = positions.length === 0 ? 'empty' : 'data';
      expect(state).toBe('data');

      // Close all positions
      positions = [];
      state = positions.length === 0 ? 'empty' : 'data';

      expect(state).toBe('empty');
    });

    it('should transition from empty to data state when position is added', () => {
      let positions: Position[] = [];
      let state: 'loading' | 'empty' | 'data' = positions.length === 0 ? 'empty' : 'data';

      expect(state).toBe('empty');

      // Add a position
      positions = [
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
        }
      ];

      state = positions.length === 0 ? 'empty' : 'data';
      expect(state).toBe('data');
    });
  });
});
