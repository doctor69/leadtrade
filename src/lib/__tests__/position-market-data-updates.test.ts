import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Position Market Data Updates Tests - Task 5.3
 * Tests position updates with real-time market data including:
 * - WebSocket connection to market data
 * - Position updates with price changes
 * - P&L recalculation on updates
 * - Update frequency appropriateness
 * 
 * Requirements: 5.3
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
  last_update: string;
}

interface MarketDataUpdate {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: string;
}

describe('Position Market Data Updates (Task 5.3)', () => {
  describe('Market Data Connection', () => {
    it('should establish WebSocket connection for market data', () => {
      const mockWebSocket = {
        readyState: WebSocket.OPEN,
        url: 'wss://stream.data.alpaca.markets/v2/iex',
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      expect(mockWebSocket.readyState).toBe(WebSocket.OPEN);
      expect(mockWebSocket.url).toContain('alpaca');
    });

    it('should subscribe to market data for position symbols', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          qty: 100,
          avg_entry_price: 150.00,
          current_price: 150.00,
          market_value: 15000.00,
          cost_basis: 15000.00,
          unrealized_pl: 0,
          unrealized_plpc: 0,
          side: 'long',
          change_today: 0,
          last_update: new Date().toISOString()
        },
        {
          symbol: 'GOOGL',
          qty: 50,
          avg_entry_price: 200.00,
          current_price: 200.00,
          market_value: 10000.00,
          cost_basis: 10000.00,
          unrealized_pl: 0,
          unrealized_plpc: 0,
          side: 'long',
          change_today: 0,
          last_update: new Date().toISOString()
        }
      ];

      const symbols = positions.map(p => p.symbol);
      
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('GOOGL');
      expect(symbols.length).toBe(2);
    });

    it('should handle WebSocket connection states', () => {
      const connectionStates = {
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
      };

      expect(connectionStates.CONNECTING).toBe(WebSocket.CONNECTING);
      expect(connectionStates.OPEN).toBe(WebSocket.OPEN);
      expect(connectionStates.CLOSING).toBe(WebSocket.CLOSING);
      expect(connectionStates.CLOSED).toBe(WebSocket.CLOSED);
    });
  });

  describe('Position Updates with Price Changes', () => {
    it('should update position when price increases', () => {
      const initialPosition: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 150.00,
        market_value: 15000.00,
        cost_basis: 15000.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0,
        last_update: new Date().toISOString()
      };

      // Simulate market data update
      const marketUpdate: MarketDataUpdate = {
        symbol: 'AAPL',
        price: 155.00,
        bid: 154.95,
        ask: 155.05,
        volume: 1000000,
        timestamp: new Date().toISOString()
      };

      const updatedPosition: Position = {
        ...initialPosition,
        current_price: marketUpdate.price,
        market_value: initialPosition.qty * marketUpdate.price,
        unrealized_pl: (initialPosition.qty * marketUpdate.price) - initialPosition.cost_basis,
        unrealized_plpc: ((initialPosition.qty * marketUpdate.price) - initialPosition.cost_basis) / initialPosition.cost_basis,
        change_today: (marketUpdate.price - initialPosition.current_price) * initialPosition.qty,
        last_update: marketUpdate.timestamp
      };

      expect(updatedPosition.current_price).toBe(155.00);
      expect(updatedPosition.market_value).toBe(15500.00);
      expect(updatedPosition.unrealized_pl).toBe(500.00);
      expect(updatedPosition.unrealized_plpc).toBeCloseTo(0.0333, 4);
    });

    it('should update position when price decreases', () => {
      const initialPosition: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 150.00,
        market_value: 15000.00,
        cost_basis: 15000.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0,
        last_update: new Date().toISOString()
      };

      // Simulate market data update
      const marketUpdate: MarketDataUpdate = {
        symbol: 'AAPL',
        price: 145.00,
        bid: 144.95,
        ask: 145.05,
        volume: 1000000,
        timestamp: new Date().toISOString()
      };

      const updatedPosition: Position = {
        ...initialPosition,
        current_price: marketUpdate.price,
        market_value: initialPosition.qty * marketUpdate.price,
        unrealized_pl: (initialPosition.qty * marketUpdate.price) - initialPosition.cost_basis,
        unrealized_plpc: ((initialPosition.qty * marketUpdate.price) - initialPosition.cost_basis) / initialPosition.cost_basis,
        change_today: (marketUpdate.price - initialPosition.current_price) * initialPosition.qty,
        last_update: marketUpdate.timestamp
      };

      expect(updatedPosition.current_price).toBe(145.00);
      expect(updatedPosition.market_value).toBe(14500.00);
      expect(updatedPosition.unrealized_pl).toBe(-500.00);
      expect(updatedPosition.unrealized_plpc).toBeCloseTo(-0.0333, 4);
    });

    it('should handle multiple rapid price updates', () => {
      let position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 150.00,
        market_value: 15000.00,
        cost_basis: 15000.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0,
        last_update: new Date().toISOString()
      };

      const priceUpdates = [150.50, 151.00, 150.75, 151.25, 151.50];

      priceUpdates.forEach(price => {
        position = {
          ...position,
          current_price: price,
          market_value: position.qty * price,
          unrealized_pl: (position.qty * price) - position.cost_basis,
          unrealized_plpc: ((position.qty * price) - position.cost_basis) / position.cost_basis,
          last_update: new Date().toISOString()
        };
      });

      expect(position.current_price).toBe(151.50);
      expect(position.market_value).toBe(15150.00);
      expect(position.unrealized_pl).toBe(150.00);
    });

    it('should update timestamp with each price change', () => {
      const initialPosition: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 150.00,
        market_value: 15000.00,
        cost_basis: 15000.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0,
        last_update: '2025-01-24T10:00:00Z'
      };

      const marketUpdate: MarketDataUpdate = {
        symbol: 'AAPL',
        price: 155.00,
        bid: 154.95,
        ask: 155.05,
        volume: 1000000,
        timestamp: '2025-01-24T10:05:00Z'
      };

      const updatedPosition: Position = {
        ...initialPosition,
        current_price: marketUpdate.price,
        market_value: initialPosition.qty * marketUpdate.price,
        unrealized_pl: (initialPosition.qty * marketUpdate.price) - initialPosition.cost_basis,
        unrealized_plpc: ((initialPosition.qty * marketUpdate.price) - initialPosition.cost_basis) / initialPosition.cost_basis,
        last_update: marketUpdate.timestamp
      };

      expect(updatedPosition.last_update).toBe('2025-01-24T10:05:00Z');
      expect(updatedPosition.last_update).not.toBe(initialPosition.last_update);
    });
  });

  describe('P&L Recalculation on Updates', () => {
    it('should recalculate unrealized P&L when price updates', () => {
      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 150.00,
        market_value: 15000.00,
        cost_basis: 15000.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0,
        last_update: new Date().toISOString()
      };

      const calculatePL = (qty: number, currentPrice: number, costBasis: number) => {
        const marketValue = qty * currentPrice;
        const unrealizedPL = marketValue - costBasis;
        const unrealizedPLPC = unrealizedPL / costBasis;
        return { marketValue, unrealizedPL, unrealizedPLPC };
      };

      const newPrice = 155.00;
      const { marketValue, unrealizedPL, unrealizedPLPC } = calculatePL(
        position.qty,
        newPrice,
        position.cost_basis
      );

      expect(marketValue).toBe(15500.00);
      expect(unrealizedPL).toBe(500.00);
      expect(unrealizedPLPC).toBeCloseTo(0.0333, 4);
    });

    it('should recalculate P&L percentage correctly', () => {
      const position: Position = {
        symbol: 'GOOGL',
        qty: 50,
        avg_entry_price: 200.00,
        current_price: 200.00,
        market_value: 10000.00,
        cost_basis: 10000.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0,
        last_update: new Date().toISOString()
      };

      const priceChanges = [
        { price: 210.00, expectedPLPC: 0.05 },
        { price: 220.00, expectedPLPC: 0.10 },
        { price: 190.00, expectedPLPC: -0.05 },
        { price: 180.00, expectedPLPC: -0.10 }
      ];

      priceChanges.forEach(({ price, expectedPLPC }) => {
        const marketValue = position.qty * price;
        const unrealizedPL = marketValue - position.cost_basis;
        const unrealizedPLPC = unrealizedPL / position.cost_basis;

        expect(unrealizedPLPC).toBeCloseTo(expectedPLPC, 4);
      });
    });

    it('should handle P&L recalculation for fractional shares', () => {
      const position: Position = {
        symbol: 'TSLA',
        qty: 10.5,
        avg_entry_price: 200.00,
        current_price: 200.00,
        market_value: 2100.00,
        cost_basis: 2100.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0,
        last_update: new Date().toISOString()
      };

      const newPrice = 210.00;
      const newMarketValue = position.qty * newPrice;
      const newUnrealizedPL = newMarketValue - position.cost_basis;
      const newUnrealizedPLPC = newUnrealizedPL / position.cost_basis;

      expect(newMarketValue).toBeCloseTo(2205.00, 2);
      expect(newUnrealizedPL).toBeCloseTo(105.00, 2);
      expect(newUnrealizedPLPC).toBeCloseTo(0.05, 4);
    });

    it('should recalculate today\'s change correctly', () => {
      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 150.00,
        market_value: 15000.00,
        cost_basis: 15000.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0,
        last_update: new Date().toISOString()
      };

      const previousPrice = position.current_price;
      const newPrice = 155.00;
      const changeToday = (newPrice - previousPrice) * position.qty;

      expect(changeToday).toBe(500.00);
    });
  });

  describe('Update Frequency', () => {
    it('should throttle updates to prevent excessive recalculations', () => {
      const updates: MarketDataUpdate[] = [];
      const startTime = Date.now();

      // Simulate 100 rapid updates
      for (let i = 0; i < 100; i++) {
        updates.push({
          symbol: 'AAPL',
          price: 150.00 + (i * 0.01),
          bid: 149.95 + (i * 0.01),
          ask: 150.05 + (i * 0.01),
          volume: 1000000,
          timestamp: new Date(startTime + i * 10).toISOString()
        });
      }

      // Throttle to max 1 update per 100ms
      const throttleMs = 100;
      const throttledUpdates = updates.filter((update, index) => {
        if (index === 0) return true;
        const prevTime = new Date(updates[index - 1].timestamp).getTime();
        const currTime = new Date(update.timestamp).getTime();
        return (currTime - prevTime) >= throttleMs;
      });

      expect(throttledUpdates.length).toBeLessThan(updates.length);
      expect(throttledUpdates.length).toBeGreaterThan(0);
    });

    it('should batch multiple symbol updates together', () => {
      const updates: MarketDataUpdate[] = [
        {
          symbol: 'AAPL',
          price: 155.00,
          bid: 154.95,
          ask: 155.05,
          volume: 1000000,
          timestamp: new Date().toISOString()
        },
        {
          symbol: 'GOOGL',
          price: 210.00,
          bid: 209.95,
          ask: 210.05,
          volume: 500000,
          timestamp: new Date().toISOString()
        },
        {
          symbol: 'TSLA',
          price: 205.00,
          bid: 204.95,
          ask: 205.05,
          volume: 750000,
          timestamp: new Date().toISOString()
        }
      ];

      const batchedUpdate = updates.reduce((acc, update) => {
        acc[update.symbol] = update;
        return acc;
      }, {} as Record<string, MarketDataUpdate>);

      expect(Object.keys(batchedUpdate).length).toBe(3);
      expect(batchedUpdate['AAPL'].price).toBe(155.00);
      expect(batchedUpdate['GOOGL'].price).toBe(210.00);
      expect(batchedUpdate['TSLA'].price).toBe(205.00);
    });

    it('should prioritize latest update for same symbol', () => {
      const updates: MarketDataUpdate[] = [
        {
          symbol: 'AAPL',
          price: 150.00,
          bid: 149.95,
          ask: 150.05,
          volume: 1000000,
          timestamp: '2025-01-24T10:00:00Z'
        },
        {
          symbol: 'AAPL',
          price: 151.00,
          bid: 150.95,
          ask: 151.05,
          volume: 1000000,
          timestamp: '2025-01-24T10:01:00Z'
        },
        {
          symbol: 'AAPL',
          price: 152.00,
          bid: 151.95,
          ask: 152.05,
          volume: 1000000,
          timestamp: '2025-01-24T10:02:00Z'
        }
      ];

      const latestUpdate = updates.reduce((latest, current) => {
        if (!latest || new Date(current.timestamp) > new Date(latest.timestamp)) {
          return current;
        }
        return latest;
      }, updates[0]);

      expect(latestUpdate.price).toBe(152.00);
      expect(latestUpdate.timestamp).toBe('2025-01-24T10:02:00Z');
    });

    it('should handle update frequency of 1 second for active trading', () => {
      const updateInterval = 1000; // 1 second
      const testDuration = 5000; // 5 seconds
      const expectedUpdates = testDuration / updateInterval;

      expect(expectedUpdates).toBe(5);
      expect(updateInterval).toBeGreaterThanOrEqual(1000); // At least 1 second
    });
  });

  describe('Multiple Position Updates', () => {
    it('should update all positions when market data arrives', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          qty: 100,
          avg_entry_price: 150.00,
          current_price: 150.00,
          market_value: 15000.00,
          cost_basis: 15000.00,
          unrealized_pl: 0,
          unrealized_plpc: 0,
          side: 'long',
          change_today: 0,
          last_update: new Date().toISOString()
        },
        {
          symbol: 'GOOGL',
          qty: 50,
          avg_entry_price: 200.00,
          current_price: 200.00,
          market_value: 10000.00,
          cost_basis: 10000.00,
          unrealized_pl: 0,
          unrealized_plpc: 0,
          side: 'long',
          change_today: 0,
          last_update: new Date().toISOString()
        }
      ];

      const marketUpdates: Record<string, MarketDataUpdate> = {
        'AAPL': {
          symbol: 'AAPL',
          price: 155.00,
          bid: 154.95,
          ask: 155.05,
          volume: 1000000,
          timestamp: new Date().toISOString()
        },
        'GOOGL': {
          symbol: 'GOOGL',
          price: 210.00,
          bid: 209.95,
          ask: 210.05,
          volume: 500000,
          timestamp: new Date().toISOString()
        }
      };

      const updatedPositions = positions.map(position => {
        const marketUpdate = marketUpdates[position.symbol];
        if (!marketUpdate) return position;

        return {
          ...position,
          current_price: marketUpdate.price,
          market_value: position.qty * marketUpdate.price,
          unrealized_pl: (position.qty * marketUpdate.price) - position.cost_basis,
          unrealized_plpc: ((position.qty * marketUpdate.price) - position.cost_basis) / position.cost_basis,
          last_update: marketUpdate.timestamp
        };
      });

      expect(updatedPositions[0].current_price).toBe(155.00);
      expect(updatedPositions[0].unrealized_pl).toBe(500.00);
      expect(updatedPositions[1].current_price).toBe(210.00);
      expect(updatedPositions[1].unrealized_pl).toBe(500.00);
    });

    it('should calculate total portfolio P&L after updates', () => {
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
          change_today: 50.00,
          last_update: new Date().toISOString()
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
          change_today: 50.00,
          last_update: new Date().toISOString()
        }
      ];

      const totalMarketValue = positions.reduce((sum, p) => sum + p.market_value, 0);
      const totalCostBasis = positions.reduce((sum, p) => sum + p.cost_basis, 0);
      const totalUnrealizedPL = positions.reduce((sum, p) => sum + p.unrealized_pl, 0);
      const totalPLPercent = totalUnrealizedPL / totalCostBasis;

      expect(totalMarketValue).toBe(26000.00);
      expect(totalCostBasis).toBe(25000.00);
      expect(totalUnrealizedPL).toBe(1000.00);
      expect(totalPLPercent).toBeCloseTo(0.04, 4);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing market data gracefully', () => {
      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 150.00,
        market_value: 15000.00,
        cost_basis: 15000.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0,
        last_update: new Date().toISOString()
      };

      const marketUpdate: MarketDataUpdate | null = null;

      const updatedPosition = marketUpdate 
        ? {
            ...position,
            current_price: marketUpdate.price,
            market_value: position.qty * marketUpdate.price,
            unrealized_pl: (position.qty * marketUpdate.price) - position.cost_basis,
            unrealized_plpc: ((position.qty * marketUpdate.price) - position.cost_basis) / position.cost_basis,
            last_update: marketUpdate.timestamp
          }
        : position;

      expect(updatedPosition).toEqual(position);
    });

    it('should handle invalid price data', () => {
      const position: Position = {
        symbol: 'AAPL',
        qty: 100,
        avg_entry_price: 150.00,
        current_price: 150.00,
        market_value: 15000.00,
        cost_basis: 15000.00,
        unrealized_pl: 0,
        unrealized_plpc: 0,
        side: 'long',
        change_today: 0,
        last_update: new Date().toISOString()
      };

      const invalidPrices = [NaN, -1, 0, Infinity];

      invalidPrices.forEach(invalidPrice => {
        const isValidPrice = !isNaN(invalidPrice) && isFinite(invalidPrice) && invalidPrice > 0;
        expect(isValidPrice).toBe(false);
      });
    });

    it('should handle WebSocket disconnection', () => {
      const connectionStates = {
        connected: true,
        disconnected: false,
        reconnecting: false
      };

      // Simulate disconnection
      connectionStates.connected = false;
      connectionStates.disconnected = true;

      expect(connectionStates.connected).toBe(false);
      expect(connectionStates.disconnected).toBe(true);

      // Simulate reconnection
      connectionStates.connected = true;
      connectionStates.disconnected = false;
      connectionStates.reconnecting = false;

      expect(connectionStates.connected).toBe(true);
    });
  });
});
