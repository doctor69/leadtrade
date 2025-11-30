/// <reference types="vitest" />
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TradeExecutionEngine } from '../trade-execution-engine';
import type { LeaderTradeData } from '../trade-execution-engine';
import * as DatabaseServiceModule from '../database';
import * as TradingConfig from '../trading-config';

vi.mock('../trading-config');

let mockAlpacaAccount = { portfolio_value: '10000', buying_power: '5000' };

describe('TradeExecutionEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(DatabaseServiceModule.DatabaseService, 'getUserProfile').mockImplementation(async (userId: string) => ({
      id: userId,
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: '',
      alpaca_access_token: 'test-token',
      alpaca_refresh_token: 'test-refresh',
      trading_mode: 'paper',
      share_trades: true,
      show_asset_amounts: true,
      theme_color: 'blue',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    vi.spyOn(TradingConfig, 'getUserTradingMode').mockResolvedValue('paper');
    vi.spyOn(TradingConfig, 'getAlpacaConfig').mockReturnValue({
      brokerApiKey: 'mock-broker-key',
      brokerApiSecret: 'mock-broker-secret',
      brokerBaseUrl: 'https://mock-broker-url',
      dataApiKey: 'mock-data-key',
      dataApiSecret: 'mock-data-secret',
      dataBaseUrl: 'https://mock-data-url',
      wsUrl: 'wss://mock-ws-url',
    });
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (typeof url === 'string' && url.includes('/v2/account')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAlpacaAccount,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
    vi.spyOn(TradeExecutionEngine as any, 'executeAlpacaOrder').mockResolvedValue({
      success: true,
      orderId: 'mock-order-id',
    });
  });

  describe('executeProportionalTrades', () => {
    it('should successfully execute proportional trades for followers', async () => {
      mockAlpacaAccount = { portfolio_value: '10000', buying_power: '5000' };
      const getActiveFollowersSpy = vi
        .spyOn(TradeExecutionEngine as any, 'getActiveFollowers')
        .mockResolvedValue([{ followerId: 'follower1', leaderId: 'leader1', allocationPercentage: 10 }]);
      const recordCopiedTradeSpy = vi
        .spyOn(TradeExecutionEngine as any, 'recordCopiedTrade')
        .mockResolvedValue({} as any);

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

      expect(result.success).toBe(true);
      expect(result.copiedTrades).toHaveLength(1);
      expect(result.copiedTrades[0].success).toBe(true);

      getActiveFollowersSpy.mockRestore();
      recordCopiedTradeSpy.mockRestore();
    });

    it('should handle insufficient funds by executing maximum possible trade', async () => {
      mockAlpacaAccount = { portfolio_value: '1000', buying_power: '300' };
      const getActiveFollowersSpy = vi
        .spyOn(TradeExecutionEngine as any, 'getActiveFollowers')
        .mockResolvedValue([{ followerId: 'follower1', leaderId: 'leader1', allocationPercentage: 10 }]);
      const recordCopiedTradeSpy = vi
        .spyOn(TradeExecutionEngine as any, 'recordCopiedTrade')
        .mockResolvedValue({} as any);

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

      expect(result.success).toBe(true);
      expect(result.copiedTrades).toHaveLength(1);
      expect(result.copiedTrades[0].quantity).toBe(2);

      getActiveFollowersSpy.mockRestore();
      recordCopiedTradeSpy.mockRestore();
    });

    it('should skip execution when follower has no funds', async () => {
      mockAlpacaAccount = { portfolio_value: '0', buying_power: '0' };
      const getActiveFollowersSpy = vi
        .spyOn(TradeExecutionEngine as any, 'getActiveFollowers')
        .mockResolvedValue([{ followerId: 'follower1', leaderId: 'leader1', allocationPercentage: 10 }]);
      const recordCopiedTradeSpy = vi
        .spyOn(TradeExecutionEngine as any, 'recordCopiedTrade')
        .mockResolvedValue({} as any);

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

      expect(result.success).toBe(false);
      expect(result.failedTrades).toHaveLength(1);

      getActiveFollowersSpy.mockRestore();
      recordCopiedTradeSpy.mockRestore();
    });

    it('should return success true when no followers exist', async () => {
      mockAlpacaAccount = { portfolio_value: '10000', buying_power: '5000' };
      const getActiveFollowersSpy = vi
        .spyOn(TradeExecutionEngine as any, 'getActiveFollowers')
        .mockResolvedValue([]);

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

      expect(result.success).toBe(true);
      expect(result.copiedTrades).toHaveLength(0);

      getActiveFollowersSpy.mockRestore();
    });
  });
});