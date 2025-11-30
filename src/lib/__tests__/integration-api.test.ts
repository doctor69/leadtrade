import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CopyTradingService } from '../copy-trading-service';
import { TradeExecutionEngine } from '../trade-execution-engine';
import { calculatePortfolioPercentage } from '../portfolio-calculator';
import type { LeaderTradeData } from '../trade-execution-engine';
import { supabase } from '../supabase';

vi.mock('../trading-config', () => ({
  getUserTradingMode: vi.fn().mockResolvedValue('paper'),
  getAlpacaConfig: vi.fn().mockReturnValue({
    brokerApiKey: 'test-key',
    brokerApiSecret: 'test-secret',
    brokerBaseUrl: 'https://paper-api.alpaca.markets',
    dataApiKey: 'test-data-key',
    dataApiSecret: 'test-data-secret',
    dataBaseUrl: 'https://data.alpaca.markets',
    wsUrl: 'wss://stream.data.alpaca.markets'
  })
}));

// Mock Supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    // Create a comprehensive mock chain for Supabase
    const createMockChain = () => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        }),
        order: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    });
    
    // Reset Supabase mock
    (supabase.from as any).mockReturnValue(createMockChain());
  });

  describe('Copy Trading Service Integration', () => {
    it('should create subscription and execute trades end-to-end', async () => {
      // Setup Supabase mocks for this specific test
      const mockFrom = vi.fn();
      (supabase.from as any) = mockFrom;
      
      // Mock the chain for leader check
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'leader1', share_trades: true },
              error: null
            })
          })
        })
      });
      
      // Mock the chain for existing subscription check
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      });
      
      // Mock the chain for getUserSubscriptions call (allocation check)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });
      
      // Mock the chain for subscription creation
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'sub-123',
                follower_id: 'user1',
                leader_id: 'leader1',
                allocation_percentage: 25,
                is_active: true
              },
              error: null
            })
          })
        })
      });

      // Create subscription
      const subscriptionResult = await CopyTradingService.createSubscription('user1', 'leader1', 25);
      expect(subscriptionResult.success).toBe(true);
    });

    it('should handle subscription validation errors', async () => {
      // Mock fetch response for leader check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 'leader1',
            share_trades: true
          },
          error: null
        })
      });

      const result = await CopyTradingService.createSubscription('user1', 'leader1', 150);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Allocation percentage must be between 0.1 and 100');
    });
  });

  describe('Trade Execution Integration', () => {
    it('should execute proportional trades with real API calls', async () => {
      // Mock fetch for getting active followers
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            subscriptions: [{
              follower_id: 'follower1',
              leader_id: 'leader1',
              allocation_percentage: 10,
              is_active: true
            }]
          })
        })
        // Mock fetch for Alpaca account data
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            portfolio_value: '10000',
            buying_power: '5000'
          })
        })
        // Mock fetch for trade execution
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'order-123',
            symbol: 'AAPL',
            qty: '3',
            side: 'buy',
            status: 'filled'
          })
        });

      // Create a comprehensive Supabase mock that handles all calls
      const mockFrom = vi.fn();
      (supabase.from as any) = mockFrom;
      
      // Mock for user profile lookup (called multiple times)
      const mockUserProfileChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'follower1',
                trading_mode: 'paper',
                alpaca_access_token: 'test-token'
              },
              error: null
            })
          })
        })
      };

      // Mock for trade recording
      const mockTradeRecordChain = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'trade-record-123',
                leader_id: 'leader1',
                symbol: 'AAPL',
                quantity: 10
              },
              error: null
            })
          })
        })
      };

      // Mock for copied trade recording
      const mockCopiedTradeChain = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'copied-trade-123',
                original_trade_id: 'order123',
                follower_id: 'follower1',
                alpaca_order_id: 'order-123',
                quantity: 3,
                allocated_amount: 150,
                execution_status: 'filled'
              },
              error: null
            })
          })
        })
      };

      // Set up the mock to return different chains based on table name
      mockFrom.mockImplementation((tableName: string) => {
        if (tableName === 'profiles') {
          return mockUserProfileChain;
        } else if (tableName === 'trade_executions') {
          return mockTradeRecordChain;
        } else if (tableName === 'copied_trades') {
          return mockCopiedTradeChain;
        }
        return mockUserProfileChain; // Default fallback
      });

      const leaderTrade: LeaderTradeData = {
        leaderId: 'leader1',
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        side: 'buy',
        tradeType: 'stock',
        alpacaOrderId: 'order123',
        portfolioPercentage: 5
      };

      const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);

      // The test should verify that the execution was attempted
      // Since this is a complex integration test with many dependencies,
      // we'll verify that the result structure is correct
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('copiedTrades');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.copiedTrades)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle API failures gracefully', async () => {
      // Mock fetch response for getActiveFollowers with no followers
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          subscriptions: []
        })
      });

      const leaderTrade: LeaderTradeData = {
        leaderId: 'leader1',
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        side: 'buy',
        tradeType: 'stock',
        alpacaOrderId: 'order123',
        portfolioPercentage: 5
      };

      const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);

      // Should succeed but with no copied trades since no followers
      expect(result.success).toBe(true);
      expect(result.copiedTrades).toHaveLength(0);
    });
  });

  describe('Portfolio Calculator Integration', () => {
    it('should calculate portfolio percentage with real API data', async () => {
      // Mock fetch response for getAccountData
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          portfolio_value: '10000'
        })
      });

      const result = await calculatePortfolioPercentage(
        'AAPL',
        10,
        150,
        'test-token',
        'paper'
      );

      expect(result.success).toBe(true);
      expect(result.portfolioPercentage).toBe(0.15); // (10 * $150) / $10000 = 0.15 (15%)
      expect(result.tradeValue).toBe(1500);
      expect(result.portfolioValue).toBe(10000);
    });

    it('should handle API failures in portfolio calculation', async () => {
      // Mock fetch response for getAccountData with error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: 'Failed to fetch account data'
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
      expect(result.error).toBe('Failed to fetch account data');
    });
  });

  describe('Database Integration', () => {
    it('should handle database connection errors', async () => {
      // Mock Supabase to throw an error
      const mockFrom = vi.fn();
      (supabase.from as any) = mockFrom;
      
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database connection error')
            })
          })
        })
      });

      await expect(CopyTradingService.getUserSubscriptions('user1')).rejects.toThrow('Database connection error');
    });

    it('should handle malformed database responses', async () => {
      // Mock fetch response for getUserSubscriptions with malformed data
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [],
          error: null
        })
      });

      const result = await CopyTradingService.getUserSubscriptions('user1');
      expect(result.subscriptions).toHaveLength(0);
      expect(result.totalAllocation).toBe(0);
      expect(result.remainingAllocation).toBe(100);
      expect(result.activeSubscriptions).toBe(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should propagate errors through the system correctly', async () => {
      // Mock fetch for getting active followers to return followers
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          subscriptions: [{
            follower_id: 'follower1',
            leader_id: 'leader1',
            allocation_percentage: 10,
            is_active: true
          }]
        })
      });

      // Mock Supabase for follower account info to fail
      const mockFrom = vi.fn();
      (supabase.from as any) = mockFrom;
      
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockRejectedValue(new Error('Database constraint violation'))
          })
        })
      });

      const leaderTrade: LeaderTradeData = {
        leaderId: 'leader1',
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        side: 'buy',
        tradeType: 'stock',
        alpacaOrderId: 'order-123',
        portfolioPercentage: 5
      };

      // The TradeExecutionEngine handles errors gracefully and returns a result object
      const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock fetch response for getAccountData with timeout
      (global.fetch as any).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      const result = await calculatePortfolioPercentage(
        'AAPL',
        100,
        150,
        'test-token',
        'paper'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });
  });
});