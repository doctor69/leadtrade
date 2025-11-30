import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listOptionsContracts, getOptionContract } from '../alpaca-options-contracts';
import type { OptionContract, OptionContractsList } from '../alpaca-options-contracts';

// Mock fetch globally
global.fetch = vi.fn();

describe('Alpaca Options Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listOptionsContracts', () => {
    it('should list option contracts successfully', async () => {
      const mockResponse: OptionContractsList = {
        option_contracts: [
          {
            id: 'contract-123',
            symbol: 'AAPL250117C00150000',
            name: 'AAPL Jan 17 2025 $150 Call',
            status: 'active',
            tradable: true,
            expiration_date: '2025-01-17',
            underlying_symbol: 'AAPL',
            underlying_asset_id: 'asset-123',
            type: 'call',
            style: 'american',
            strike_price: '150.00',
            multiplier: '100',
            size: '100',
            root_symbol: 'AAPL',
            open_interest: '1000',
            close_price: '5.50',
          },
        ],
        next_page_token: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await listOptionsContracts({ underlying_symbols: 'AAPL' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle errors when listing contracts', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'API error' }),
      });

      const result = await listOptionsContracts({});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should filter by expiration date', async () => {
      const mockResponse: OptionContractsList = {
        option_contracts: [],
        next_page_token: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await listOptionsContracts({ expiration_date: '2025-01-17' });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('expiration_date=2025-01-17'),
        expect.any(Object)
      );
    });

    it('should filter by strike price range', async () => {
      const mockResponse: OptionContractsList = {
        option_contracts: [],
        next_page_token: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await listOptionsContracts({
        strike_price_gte: '100',
        strike_price_lte: '200',
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('strike_price_gte=100'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('strike_price_lte=200'),
        expect.any(Object)
      );
    });
  });

  describe('getOptionContract', () => {
    it('should get specific contract details successfully', async () => {
      const mockContract: OptionContract = {
        id: 'contract-123',
        symbol: 'AAPL250117C00150000',
        name: 'AAPL Jan 17 2025 $150 Call',
        status: 'active',
        tradable: true,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        underlying_asset_id: 'asset-123',
        type: 'call',
        style: 'american',
        strike_price: '150.00',
        multiplier: '100',
        size: '100',
        root_symbol: 'AAPL',
        open_interest: '1000',
        close_price: '5.50',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockContract,
      });

      const result = await getOptionContract('contract-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContract);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('contract-123'),
        expect.any(Object)
      );
    });

    it('should handle errors when getting contract details', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Contract not found' }),
      });

      const result = await getOptionContract('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
