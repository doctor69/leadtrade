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
    PUBLIC_ALPACA_PAPER_BROKER_API_KEY: 'paper_broker_key',
    PUBLIC_ALPACA_PAPER_BROKER_API_SECRET: 'paper_broker_secret',
    PUBLIC_ALPACA_PAPER_BROKER_BASE_URL: 'https://broker-api.sandbox.alpaca.markets/v1',
    PUBLIC_ALPACA_PAPER_DATA_API_KEY: 'paper_data_key',
    PUBLIC_ALPACA_PAPER_DATA_API_SECRET: 'paper_data_secret',
    PUBLIC_ALPACA_PAPER_DATA_BASE_URL: 'https://data.sandbox.alpaca.markets',
    PUBLIC_ALPACA_PAPER_WS_URL: 'wss://stream.data.sandbox.alpaca.markets/v2',
    PUBLIC_ALPACA_LIVE_BROKER_API_KEY: 'live_broker_key',
    PUBLIC_ALPACA_LIVE_BROKER_API_SECRET: 'live_broker_secret',
    PUBLIC_ALPACA_LIVE_BROKER_BASE_URL: 'https://broker-api.alpaca.markets/v1',
    PUBLIC_ALPACA_LIVE_DATA_API_KEY: 'live_data_key',
    PUBLIC_ALPACA_LIVE_DATA_API_SECRET: 'live_data_secret',
    PUBLIC_ALPACA_LIVE_DATA_BASE_URL: 'https://data.alpaca.markets',
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
        brokerBaseUrl: 'https://broker-api.sandbox.alpaca.markets/v1',
        dataApiKey: 'paper_data_key',
        dataApiSecret: 'paper_data_secret',
        dataBaseUrl: 'https://data.sandbox.alpaca.markets',
        wsUrl: 'wss://stream.data.sandbox.alpaca.markets/v2',
      });
    });

    it('should return live trading configuration', () => {
      const config = getAlpacaConfig('live');
      
      expect(config).toEqual({
        brokerApiKey: 'live_broker_key',
        brokerApiSecret: 'live_broker_secret',
        brokerBaseUrl: 'https://broker-api.alpaca.markets/v1',
        dataApiKey: 'live_data_key',
        dataApiSecret: 'live_data_secret',
        dataBaseUrl: 'https://data.alpaca.markets',
        wsUrl: 'wss://stream.data.alpaca.markets/v2',
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
      const expected = btoa('paper_data_key:paper_data_secret');
      
      expect(authHeader).toBe(expected);
    });

    it('should create correct data auth header for live trading', () => {
      const authHeader = getAlpacaDataAuthHeader('live');
      const expected = btoa('live_data_key:live_data_secret');
      
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
      expect(headers.get('Authorization')).toBe(`Basic ${btoa('live_data_key:live_data_secret')}`);
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