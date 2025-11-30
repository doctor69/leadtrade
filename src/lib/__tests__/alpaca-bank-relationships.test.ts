import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBankRelationship,
  listBankRelationships,
  deleteBankRelationship,
  type CreateBankRelationshipRequest,
} from '../alpaca-bank-relationships';

// Mock environment variables
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');

// Mock fetch globally
global.fetch = vi.fn();

describe('Alpaca Bank Relationships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBankRelationship', () => {
    it('should create a bank relationship successfully', async () => {
      const mockBankData: CreateBankRelationshipRequest = {
        name: 'Test Bank',
        bank_code: '123456789',
        bank_code_type: 'aba',
        account_number: '9876543210',
        country: 'USA',
        city: 'New York',
        state_province: 'NY',
      };

      const mockResponse = {
        id: 'bank-123',
        ...mockBankData,
        status: 'pending',
        created_at: '2025-01-09T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createBankRelationship('account-123', mockBankData);

      expect(result.success).toBe(true);
      expect(result.bank).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-bank-relationships/account-123',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(mockBankData),
          credentials: 'include'
        })
      );
    });

    it('should reject invalid bank_code_type', async () => {
      const mockBankData = {
        name: 'Test Bank',
        bank_code: '123456789',
        bank_code_type: 'invalid' as any,
        account_number: '9876543210',
      };

      const result = await createBankRelationship('account-123', mockBankData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const mockBankData: CreateBankRelationshipRequest = {
        name: 'Test Bank',
        bank_code: '123456789',
        bank_code_type: 'aba',
        account_number: '9876543210',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid bank code' }),
      });

      const result = await createBankRelationship('account-123', mockBankData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid bank code');
    });
  });

  describe('listBankRelationships', () => {
    it('should list bank relationships without filters', async () => {
      const mockBanks = [
        {
          id: 'bank-1',
          name: 'Bank 1',
          bank_code: '123456789',
          bank_code_type: 'aba',
          account_number: '****1234',
          status: 'approved',
          created_at: '2025-01-09T00:00:00Z',
        },
        {
          id: 'bank-2',
          name: 'Bank 2',
          bank_code: 'ABCDEFGH',
          bank_code_type: 'bic',
          account_number: '****5678',
          status: 'pending',
          created_at: '2025-01-09T01:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks,
      });

      const result = await listBankRelationships('account-123', undefined);

      expect(result.success).toBe(true);
      expect(result.banks).toEqual(mockBanks);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-bank-relationships/account-123',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should list bank relationships with status filter', async () => {
      const mockBanks = [
        {
          id: 'bank-1',
          name: 'Bank 1',
          bank_code: '123456789',
          bank_code_type: 'aba',
          account_number: '****1234',
          status: 'approved',
          created_at: '2025-01-09T00:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks,
      });

      const result = await listBankRelationships(
        'account-123',
        { status: 'approved' }
      );

      expect(result.success).toBe(true);
      expect(result.banks).toEqual(mockBanks);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-bank-relationships/account-123?status=approved',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should list bank relationships with bank_name filter', async () => {
      const mockBanks = [
        {
          id: 'bank-1',
          name: 'Chase Bank',
          bank_code: '123456789',
          bank_code_type: 'aba',
          account_number: '****1234',
          status: 'approved',
          created_at: '2025-01-09T00:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks,
      });

      const result = await listBankRelationships(
        'account-123',
        { bank_name: 'Chase' }
      );

      expect(result.success).toBe(true);
      expect(result.banks).toEqual(mockBanks);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-bank-relationships/account-123?bank_name=Chase',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      });

      const result = await listBankRelationships('account-123', undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
    });
  });

  describe('deleteBankRelationship', () => {
    it('should delete a bank relationship successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Bank relationship deleted successfully' }),
      });

      const result = await deleteBankRelationship('account-123', 'bank-123');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-bank-relationships/account-123/bank-123',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include'
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Bank relationship not found' }),
      });

      const result = await deleteBankRelationship('account-123', 'bank-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bank relationship not found');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await deleteBankRelationship('account-123', 'bank-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Bank code type validation', () => {
    it('should accept aba bank code type', async () => {
      const mockBankData: CreateBankRelationshipRequest = {
        name: 'Test Bank',
        bank_code: '123456789',
        bank_code_type: 'aba',
        account_number: '9876543210',
      };

      const mockResponse = {
        id: 'bank-123',
        ...mockBankData,
        status: 'pending',
        created_at: '2025-01-09T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createBankRelationship('account-123', mockBankData);

      expect(result.success).toBe(true);
    });

    it('should accept bic bank code type', async () => {
      const mockBankData: CreateBankRelationshipRequest = {
        name: 'International Bank',
        bank_code: 'ABCDEFGH',
        bank_code_type: 'bic',
        account_number: '9876543210',
      };

      const mockResponse = {
        id: 'bank-123',
        ...mockBankData,
        status: 'pending',
        created_at: '2025-01-09T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createBankRelationship('account-123', mockBankData);

      expect(result.success).toBe(true);
    });
  });
});
