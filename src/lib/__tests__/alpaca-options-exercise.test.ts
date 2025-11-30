/**
 * Tests for Alpaca Options Exercise API
 * 
 * Requirements: 7.3, 7.4, 7.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  exerciseOption,
  optionExerciseRequestSchema,
  optionExerciseResponseSchema
} from '../alpaca-options-contracts';

// Mock fetch globally
global.fetch = vi.fn();

describe('Alpaca Options Exercise API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should validate valid exercise request', () => {
      const validRequest = {
        symbol_or_contract_id: 'AAPL230616C00150000'
      };

      const result = optionExerciseRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject empty symbol or contract ID', () => {
      const invalidRequest = {
        symbol_or_contract_id: ''
      };

      const result = optionExerciseRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing symbol or contract ID', () => {
      const invalidRequest = {};

      const result = optionExerciseRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should validate valid exercise response', () => {
      const validResponse = {
        message: 'Option exercised successfully',
        symbol: 'AAPL230616C00150000'
      };

      const result = optionExerciseResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('exerciseOption', () => {
    it('should successfully exercise an option during market hours', async () => {
      const mockResponse = {
        message: 'Option exercised successfully',
        symbol: 'AAPL230616C00150000'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await exerciseOption('AAPL230616C00150000', 'paper');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/alpaca-options-exercise'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-trading-mode': 'paper'
          }),
          body: JSON.stringify({ symbol_or_contract_id: 'AAPL230616C00150000' })
        })
      );
    });

    it('should handle market closed error (Requirement 7.4)', async () => {
      const mockError = {
        message: 'Options can only be exercised during market hours',
        details: 'The market is currently closed. Please try again during regular trading hours.'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockError
      });

      const result = await exerciseOption('AAPL230616C00150000', 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toContain('market hours');
    });

    it('should handle account approval level error (Requirement 7.5)', async () => {
      const mockError = {
        message: 'Account does not have options trading approval',
        details: 'Please request options approval for your account'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockError
      });

      const result = await exerciseOption('AAPL230616C00150000', 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle invalid contract ID', async () => {
      const mockError = {
        message: 'Invalid contract ID or symbol',
        details: 'The specified option contract was not found'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockError
      });

      const result = await exerciseOption('INVALID', 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await exerciseOption('AAPL230616C00150000', 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should use live trading mode when specified', async () => {
      const mockResponse = {
        message: 'Option exercised successfully',
        symbol: 'AAPL230616C00150000'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await exerciseOption('AAPL230616C00150000', 'live');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-trading-mode': 'live'
          })
        })
      );
    });
  });
});
