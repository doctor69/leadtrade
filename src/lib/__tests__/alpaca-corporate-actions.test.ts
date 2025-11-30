/**
 * Unit Tests: Alpaca Corporate Actions Service
 * 
 * Tests corporate action announcements functionality
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCorporateActions, getCorporateAction } from '../alpaca-corporate-actions';

// Mock the trading-config module
vi.mock('../trading-config', () => ({
  getAlpacaConfig: vi.fn(() => ({
    brokerBaseUrl: 'https://broker-api.sandbox.alpaca.markets',
    brokerApiKey: 'test-key',
    brokerApiSecret: 'test-secret',
  })),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('Alpaca Corporate Actions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listCorporateActions', () => {
    it('should list corporate actions successfully', async () => {
      const mockCorporateActions = [
        {
          id: 'ca1',
          corporate_action_id: 'DIV123',
          ca_type: 'dividend',
          initiating_symbol: 'AAPL',
          initiating_original_cusip: '037833100',
          declaration_date: '2024-01-15',
          ex_date: '2024-02-01',
          record_date: '2024-02-05',
          payable_date: '2024-02-15',
          cash: '0.25',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCorporateActions,
      });

      const result = await listCorporateActions();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCorporateActions);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://broker-api.sandbox.alpaca.markets/v1/corporate_actions/announcements',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'APCA-API-KEY-ID': 'test-key',
            'APCA-API-SECRET-KEY': 'test-secret',
          }),
        })
      );
    });

    it('should filter by ca_types', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await listCorporateActions({ ca_types: 'dividend,split' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://broker-api.sandbox.alpaca.markets/v1/corporate_actions/announcements?ca_types=dividend%2Csplit',
        expect.any(Object)
      );
    });

    it('should filter by symbol', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await listCorporateActions({ symbol: 'AAPL' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://broker-api.sandbox.alpaca.markets/v1/corporate_actions/announcements?symbol=AAPL',
        expect.any(Object)
      );
    });

    it('should filter by date_type and date range', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await listCorporateActions({
        date_type: 'ex_date',
        since: '2024-01-01',
        until: '2024-12-31',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('date_type=ex_date'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('since=2024-01-01'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('until=2024-12-31'),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ message: 'Invalid parameters' }),
      });

      const result = await listCorporateActions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid parameters');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await listCorporateActions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getCorporateAction', () => {
    it('should get a specific corporate action successfully', async () => {
      const mockCorporateAction = {
        id: 'ca1',
        corporate_action_id: 'DIV123',
        ca_type: 'dividend',
        initiating_symbol: 'AAPL',
        initiating_original_cusip: '037833100',
        declaration_date: '2024-01-15',
        ex_date: '2024-02-01',
        record_date: '2024-02-05',
        payable_date: '2024-02-15',
        cash: '0.25',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCorporateAction,
      });

      const result = await getCorporateAction('ca1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCorporateAction);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://broker-api.sandbox.alpaca.markets/v1/corporate_actions/announcements/ca1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'APCA-API-KEY-ID': 'test-key',
            'APCA-API-SECRET-KEY': 'test-secret',
          }),
        })
      );
    });

    it('should handle not found errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ message: 'Corporate action not found' }),
      });

      const result = await getCorporateAction('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Corporate action not found');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await getCorporateAction('ca1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});
