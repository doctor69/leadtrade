import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TradeExecutionEngine } from '../trade-execution-engine';
import { DatabaseService } from '../database';
import { getUserTradingMode, getAlpacaConfig } from '../trading-config';
import type { LeaderTradeData, FollowerAccountInfo } from '../trade-execution-engine';

// Mock dependencies
vi.mock('../database');
vi.mock('../trading-config');
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));
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

const mockDatabaseService = vi.mocked(DatabaseService);
const mockGetUserTradingMode = vi.mocked(getUserTradingMode);
const mockGetAlpacaConfig = vi.mocked(getAlpacaConfig);

// Mock fetch globally
global.fetch = vi.fn();

describe('TradeExecutionEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
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

  describe('executeProportionalTrades', () => {
    it('should successfully execute proportional trades for followers', async () => {
      const leaderTrade: LeaderTradeData = {
        leaderId: 'leader-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        price: 150.00,
        tradeType: 'stock',
        portfolioPercentage: 10,
        alpacaOrderId: 'order-123'
      };

      // Mock database responses
      mockDatabaseService.createTradeExecution.mockResolvedValue({
        id: 'trade-exec-123',
        original_trade_id: 'order-123',
        leader_id: 'leader-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        price: 150.00,
        trade_type: 'stock',
        portfolio_percentage: 10,
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      mockDatabaseService.getLeaderFollowers.mockResolvedValue([
        {
          id: 'sub-123',
          follower_id: 'follower-123',
          leader_id: 'leader-123',
          allocation_percentage: 50,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

      mockDatabaseService.getUserProfile.mockResolvedValue({
        id: 'follower-123',
        alpaca_access_token: 'follower-token',
        is_paper_trading: true,
        share_trades: false,
        show_asset_amounts: false,
        theme_color: '#000000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      mockGetUserTradingMode.mockResolvedValue('paper');

      // Mock Alpaca account data fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          portfolio_value: '10000.00',
          buying_power: '5000.00'
        })
      });

      // Mock Alpaca order execution
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'copied-order-123'
        })
      });

      mockDatabaseService.createCopiedTrade.mockResolvedValue({
        id: 'copied-trade-123',
        original_trade_id: 'trade-exec-123',
        follower_id: 'follower-123',
        alpaca_order_id: 'copied-order-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 5,
        allocated_amount: 750,
        execution_status: 'pending',
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);

      expect(result.success).toBe(true);
      expect(result.copiedTrades).toHaveLength(1);
      expect(result.copiedTrades[0].success).toBe(true);
      expect(result.copiedTrades[0].quantity).toBe(3); // 50% of $10k = $5k, 10% of that = $500, $500/$150 = 3.33 -> 3 shares
      expect(result.errors).toHaveLength(0);
    });

    it('should handle insufficient funds by executing maximum possible trade', async () => {
      const leaderTrade: LeaderTradeData = {
        leaderId: 'leader-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        price: 150.00,
        tradeType: 'stock',
        portfolioPercentage: 50, // Large percentage
        alpacaOrderId: 'order-123'
      };

      // Mock database responses
      mockDatabaseService.createTradeExecution.mockResolvedValue({
        id: 'trade-exec-123',
        original_trade_id: 'order-123',
        leader_id: 'leader-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        price: 150.00,
        trade_type: 'stock',
        portfolio_percentage: 50,
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      mockDatabaseService.getLeaderFollowers.mockResolvedValue([
        {
          id: 'sub-123',
          follower_id: 'follower-123',
          leader_id: 'leader-123',
          allocation_percentage: 100,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

      mockDatabaseService.getUserProfile.mockResolvedValue({
        id: 'follower-123',
        alpaca_access_token: 'follower-token',
        is_paper_trading: true,
        share_trades: false,
        show_asset_amounts: false,
        theme_color: '#000000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      mockGetUserTradingMode.mockResolvedValue('paper');

      // Mock Alpaca account data fetch - small buying power
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          portfolio_value: '1000.00',
          buying_power: '300.00' // Only enough for 2 shares at $150
        })
      });

      // Mock Alpaca order execution
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'copied-order-123'
        })
      });

      mockDatabaseService.createCopiedTrade.mockResolvedValue({
        id: 'copied-trade-123',
        original_trade_id: 'trade-exec-123',
        follower_id: 'follower-123',
        alpaca_order_id: 'copied-order-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 2,
        allocated_amount: 500,
        execution_status: 'pending',
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);

      expect(result.success).toBe(true);
      expect(result.copiedTrades).toHaveLength(1);
      expect(result.copiedTrades[0].success).toBe(true);
      expect(result.copiedTrades[0].quantity).toBe(2); // Maximum affordable with $300 buying power
    });

    it('should skip execution when follower has no funds', async () => {
      const leaderTrade: LeaderTradeData = {
        leaderId: 'leader-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        price: 150.00,
        tradeType: 'stock',
        portfolioPercentage: 10,
        alpacaOrderId: 'order-123'
      };

      // Mock database responses
      mockDatabaseService.createTradeExecution.mockResolvedValue({
        id: 'trade-exec-123',
        original_trade_id: 'order-123',
        leader_id: 'leader-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        price: 150.00,
        trade_type: 'stock',
        portfolio_percentage: 10,
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      mockDatabaseService.getLeaderFollowers.mockResolvedValue([
        {
          id: 'sub-123',
          follower_id: 'follower-123',
          leader_id: 'leader-123',
          allocation_percentage: 50,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

      mockDatabaseService.getUserProfile.mockResolvedValue({
        id: 'follower-123',
        alpaca_access_token: 'follower-token',
        is_paper_trading: true,
        share_trades: false,
        show_asset_amounts: false,
        theme_color: '#000000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      mockGetUserTradingMode.mockResolvedValue('paper');

      // Mock Alpaca account data fetch - no buying power
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          portfolio_value: '1000.00',
          buying_power: '50.00' // Not enough for even 1 share at $150
        })
      });

      mockDatabaseService.createCopiedTrade.mockResolvedValue({
        id: 'copied-trade-123',
        original_trade_id: 'trade-exec-123',
        follower_id: 'follower-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 0,
        allocated_amount: 50,
        execution_status: 'failed',
        error_message: 'Insufficient funds to execute any shares',
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);

      expect(result.success).toBe(false);
      expect(result.copiedTrades).toHaveLength(1);
      expect(result.copiedTrades[0].success).toBe(false);
      expect(result.copiedTrades[0].quantity).toBe(0);
      expect(result.copiedTrades[0].error).toContain('Cannot execute trade');
    });

    it('should return success true when no followers exist', async () => {
      const leaderTrade: LeaderTradeData = {
        leaderId: 'leader-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        price: 150.00,
        tradeType: 'stock',
        portfolioPercentage: 10,
        alpacaOrderId: 'order-123'
      };

      // Mock database responses
      mockDatabaseService.createTradeExecution.mockResolvedValue({
        id: 'trade-exec-123',
        original_trade_id: 'order-123',
        leader_id: 'leader-123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        price: 150.00,
        trade_type: 'stock',
        portfolio_percentage: 10,
        executed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      mockDatabaseService.getLeaderFollowers.mockResolvedValue([]);

      const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);

      expect(result.success).toBe(true);
      expect(result.copiedTrades).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});