import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAlpacaConfig,
  getAlpacaAuthHeader,
  getAlpacaDataAuthHeader,
  createAlpacaBrokerHeaders,
  createAlpacaDataHeaders,
  validateTradingModeConfig,
  validateAllTradingModes,
  debugTradingConfig,
  type TradingMode,
  type AlpacaConfig,
} from '../trading-config';

// Mock environment variables
vi.mock('../env', () => ({
  env: {
    PUBLIC_ALPACA_PAPER_API_KEY: 'paper_broker_key',
    PUBLIC_ALPACA_PAPER_API_SECRET: 'paper_broker_secret',
    PUBLIC_ALPACA_PAPER_BASE_URL: 'https://paper-api.alpaca.markets',
    PUBLIC_ALPACA_LIVE_API_KEY: 'live_broker_key',
    PUBLIC_ALPACA_LIVE_API_SECRET: 'live_broker_secret',
    PUBLIC_ALPACA_LIVE_BASE_URL: 'https://api.alpaca.markets',
    PUBLIC_ALPACA_DATA_API_KEY: 'data_api_key',
    PUBLIC_ALPACA_DATA_API_SECRET: 'data_api_secret',
    PUBLIC_ALPACA_DATA_BASE_URL: 'https://data.alpaca.markets',
    PUBLIC_ALPACA_PAPER_WS_URL: 'wss://paper-api.alpaca.markets/stream',
    PUBLIC_ALPACA_LIVE_WS_URL: 'wss://api.alpaca.markets/stream',
    PUBLIC_ALPACA_LIVE_WS_URL: 'wss://stream.data.alpaca.markets/v2',
  },
}));

describe('Trading Configuration System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAlpacaConfig', () => {
    it('should return paper trading configuration', () => {
      const config = getAlpacaConfig('paper');
      
      expect(config).toEqual({
        brokerApiKey: 'paper_broker_key',
        brokerApiSecret: 'paper_broker_secret',
        brokerBaseUrl: 'https://paper-api.alpaca.markets',
        dataApiKey: 'data_api_key',
        dataApiSecret: 'data_api_secret',
        dataBaseUrl: 'https://data.alpaca.markets',
        wsUrl: 'wss://paper-api.alpaca.markets/stream',
      });
    });

    it('should return live trading configuration', () => {
      const config = getAlpacaConfig('live');
      
      expect(config).toEqual({
        brokerApiKey: 'live_broker_key',
        brokerApiSecret: 'live_broker_secret',
        brokerBaseUrl: 'https://api.alpaca.markets',
        dataApiKey: 'data_api_key',
        dataApiSecret: 'data_api_secret',
        dataBaseUrl: 'https://data.alpaca.markets',
        wsUrl: 'wss://api.alpaca.markets/stream',
      });
    });

    it('should throw error for invalid trading mode', () => {
      expect(() => getAlpacaConfig('invalid' as TradingMode)).toThrow('Invalid trading mode: invalid');
    });
  });

  describe('Authentication Headers', () => {
    it('should create correct broker auth header for paper trading', () => {
      const authHeader = getAlpacaAuthHeader('paper');
      const expected = btoa('paper_broker_key:paper_broker_secret');
      
      expect(authHeader).toBe(expected);
    });

    it('should create correct broker auth header for live trading', () => {
      const authHeader = getAlpacaAuthHeader('live');
      const expected = btoa('live_broker_key:live_broker_secret');
      
      expect(authHeader).toBe(expected);
    });

    it('should create correct data auth header for paper trading', () => {
      const authHeader = getAlpacaDataAuthHeader('paper');
      const expected = btoa('data_api_key:data_api_secret');
      
      expect(authHeader).toBe(expected);
    });

    it('should create correct data auth header for live trading', () => {
      const authHeader = getAlpacaDataAuthHeader('live');
      const expected = btoa('data_api_key:data_api_secret');
      
      expect(authHeader).toBe(expected);
    });
  });

  describe('HTTP Headers Creation', () => {
    it('should create broker headers with correct authorization', () => {
      const headers = createAlpacaBrokerHeaders('paper');
      
      expect(headers.get('Accept')).toBe('application/json');
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Authorization')).toBe(`Basic ${btoa('paper_broker_key:paper_broker_secret')}`);
    });

    it('should create data headers with correct authorization', () => {
      const headers = createAlpacaDataHeaders('live');
      
      expect(headers.get('Accept')).toBe('application/json');
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Authorization')).toBe(`Basic ${btoa('data_api_key:data_api_secret')}`);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate paper trading configuration as valid', () => {
      const validation = validateTradingModeConfig('paper');
      
      expect(validation.valid).toBe(true);
      expect(validation.missing).toEqual([]);
    });

    it('should validate live trading configuration as valid', () => {
      const validation = validateTradingModeConfig('live');
      
      expect(validation.valid).toBe(true);
      expect(validation.missing).toEqual([]);
    });

    it('should validate all trading modes', () => {
      const validation = validateAllTradingModes();
      
      expect(validation.paper.valid).toBe(true);
      expect(validation.live.valid).toBe(true);
      expect(validation.paper.missing).toEqual([]);
      expect(validation.live.missing).toEqual([]);
    });
  });

  describe('Debug Functions', () => {
    it('should debug specific trading mode without errors', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      debugTradingConfig('paper');
      
      expect(consoleSpy).toHaveBeenCalledWith('🔧 PAPER Trading Configuration:');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Valid: true');
      
      consoleSpy.mockRestore();
    });

    it('should debug all trading modes without errors', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      debugTradingConfig();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔧 Trading Mode Configuration Status:');
      expect(consoleSpy).toHaveBeenCalledWith('📄 Paper Trading: ✅ Valid');
      expect(consoleSpy).toHaveBeenCalledWith('💰 Live Trading: ✅ Valid');
      
      consoleSpy.mockRestore();
    });
  });
});