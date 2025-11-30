/**
 * Tests for Market Data Fallback System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketDataFallbackService, type FallbackConfig } from '../market-data-fallback';

// Mock fetch
global.fetch = vi.fn();

describe('MarketDataFallbackService', () => {
  let service: MarketDataFallbackService;
  let mockConfig: FallbackConfig;

  beforeEach(() => {
    mockConfig = {
      pollInterval: 1000,
      maxRetries: 3,
      retryDelay: 500,
      symbols: ['AAPL', 'MSFT', 'GOOGL']
    };
    service = new MarketDataFallbackService(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const state = service.getState();
      expect(state.mode).toBe('disconnected');
      expect(state.isPolling).toBe(false);
      expect(state.error).toBe(null);
      expect(state.retryCount).toBe(0);
    });

    it('should return empty data initially', () => {
      const data = service.getLastKnownData();
      expect(data).toEqual([]);
    });
  });

  describe('subscription system', () => {
    it('should allow subscribing and unsubscribing', () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Should not call callback initially with no data
      expect(callback).not.toHaveBeenCalled();
      
      unsubscribe();
    });

    it('should call subscribers when data updates', async () => {
      const callback = vi.fn();
      service.subscribe(callback);

      // Mock successful API response
      const mockResponse = {
        success: true,
        data: {
          quotes: [
            {
              symbol: 'AAPL',
              bid: 150.00,
              ask: 150.10,
              latest_trade: { price: 150.05, size: 100 }
            }
          ]
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      service.startFallback();
      
      // Wait for the fetch to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalled();
      const [data, state] = callback.mock.calls[callback.mock.calls.length - 1];
      expect(data).toHaveLength(1);
      expect(data[0].symbol).toBe('AAPL');
      expect(state.mode).toBe('rest');
    });
  });

  describe('fallback mode', () => {
    it('should start fallback mode correctly', () => {
      service.startFallback();
      
      const state = service.getState();
      expect(state.mode).toBe('rest');
      expect(state.isPolling).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should stop fallback mode correctly', () => {
      service.startFallback();
      service.stopFallback();
      
      const state = service.getState();
      expect(state.mode).toBe('websocket');
      expect(state.isPolling).toBe(false);
    });

    it('should not start polling if already polling', () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      
      service.startFallback();
      service.startFallback(); // Second call should be ignored
      
      // Should only make one initial fetch call
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('API polling', () => {
    it('should make correct API calls', async () => {
      const mockResponse = {
        success: true,
        data: { quotes: [] }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      service.startFallback();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fetch).toHaveBeenCalledWith(
        '/api/market-quotes?symbols=AAPL,MSFT,GOOGL&feed=iex'
      );
    });

    it('should handle API errors with retry logic', async () => {
      const callback = vi.fn();
      service.subscribe(callback);

      // Mock API error
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      service.startFallback();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = service.getState();
      expect(state.error).toBe('Network error');
      expect(state.retryCount).toBe(1);
    });

    it('should stop retrying after max attempts', async () => {
      const callback = vi.fn();
      service.subscribe(callback);

      // Mock repeated failures
      (fetch as any).mockRejectedValue(new Error('Persistent error'));

      service.startFallback();
      
      // Wait for all retries to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const state = service.getState();
      expect(state.retryCount).toBe(mockConfig.maxRetries);
      expect(state.mode).toBe('disconnected');
      expect(state.isPolling).toBe(false);
    });
  });

  describe('data processing', () => {
    it('should process market data correctly', async () => {
      const callback = vi.fn();
      service.subscribe(callback);

      const mockResponse = {
        success: true,
        data: {
          quotes: [
            {
              symbol: 'AAPL',
              bid: 150.00,
              ask: 150.10,
              latest_trade: { price: 150.05, size: 100 }
            },
            {
              symbol: 'MSFT',
              bid: 300.00,
              ask: 300.20,
              latest_trade: { price: 300.10, size: 200 }
            }
          ]
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      service.startFallback();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const data = service.getLastKnownData();
      expect(data).toHaveLength(2);
      
      const appleData = data.find(item => item.symbol === 'AAPL');
      expect(appleData).toBeDefined();
      expect(appleData!.price).toBe(150.05);
      expect(appleData!.bid).toBe(150.00);
      expect(appleData!.ask).toBe(150.10);
      expect(appleData!.volume).toBe(100);
    });

    it('should calculate price changes correctly', async () => {
      const callback = vi.fn();
      service.subscribe(callback);

      // First update
      const firstResponse = {
        success: true,
        data: {
          quotes: [{
            symbol: 'AAPL',
            bid: 150.00,
            ask: 150.10,
            latest_trade: { price: 150.05, size: 100 }
          }]
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(firstResponse)
      });

      service.startFallback();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second update with price change
      const secondResponse = {
        success: true,
        data: {
          quotes: [{
            symbol: 'AAPL',
            bid: 151.00,
            ask: 151.10,
            latest_trade: { price: 151.05, size: 150 }
          }]
        }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(secondResponse)
      });

      // Trigger another fetch
      await service['fetchMarketData']();

      const data = service.getLastKnownData();
      const appleData = data.find(item => item.symbol === 'AAPL');
      
      expect(appleData!.price).toBe(151.05);
      expect(appleData!.change).toBe(1.00); // 151.05 - 150.05
      expect(appleData!.changePercent).toBeCloseTo(0.67, 1); // (1.00 / 150.05) * 100
    });
  });

  describe('symbol management', () => {
    it('should update symbols correctly', () => {
      const newSymbols = ['TSLA', 'NVDA'];
      service.updateSymbols(newSymbols);
      
      // Should remove old data
      const data = service.getLastKnownData();
      expect(data).toEqual([]);
    });

    it('should handle empty symbols array', async () => {
      service.updateSymbols([]);
      service.startFallback();
      
      // Should not make API calls with empty symbols
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', () => {
      const callback = vi.fn();
      service.subscribe(callback);
      service.startFallback();
      
      service.destroy();
      
      const state = service.getState();
      expect(state.isPolling).toBe(false);
      
      const data = service.getLastKnownData();
      expect(data).toEqual([]);
    });
  });
});