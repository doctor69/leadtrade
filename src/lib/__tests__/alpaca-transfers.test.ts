import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransfer, listTransfers, cancelTransfer } from '../alpaca-transfers';
import type { Transfer, CreateTransferRequest } from '../alpaca-transfers';

// Mock environment variables
vi.stubGlobal('import.meta', {
  env: {
    PUBLIC_SUPABASE_URL: 'https://test.supabase.co'
  }
});

// Mock fetch globally
global.fetch = vi.fn();

describe('Alpaca Transfer Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTransfer', () => {
    it('should create an ACH transfer successfully', async () => {
      const mockTransfer: Transfer = {
        id: 'transfer-123',
        account_id: 'account-123',
        type: 'ach',
        status: 'queued',
        amount: '1000.00',
        direction: 'INCOMING',
        created_at: '2025-01-09T12:00:00Z',
        updated_at: '2025-01-09T12:00:00Z',
        relationship_id: 'ach-rel-123',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfer,
      });

      const transferData: CreateTransferRequest = {
        transfer_type: 'ach',
        amount: '1000.00',
        direction: 'INCOMING',
        relationship_id: 'ach-rel-123',
      };

      const result = await createTransfer('account-123', transferData);

      expect(result.success).toBe(true);
      expect(result.transfer).toEqual(mockTransfer);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-transfers/account-123',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(transferData),
          credentials: 'include'
        })
      );
    });

    it('should create a wire transfer successfully', async () => {
      const mockTransfer: Transfer = {
        id: 'transfer-456',
        account_id: 'account-123',
        type: 'wire',
        status: 'queued',
        amount: '5000.00',
        direction: 'OUTGOING',
        created_at: '2025-01-09T12:00:00Z',
        updated_at: '2025-01-09T12:00:00Z',
        bank_id: 'bank-123',
        additional_information: 'Wire transfer for investment',
        fee_payment_method: 'user',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfer,
      });

      const transferData: CreateTransferRequest = {
        transfer_type: 'wire',
        amount: '5000.00',
        direction: 'OUTGOING',
        bank_id: 'bank-123',
        additional_information: 'Wire transfer for investment',
        fee_payment_method: 'user',
      };

      const result = await createTransfer('account-123', transferData);

      expect(result.success).toBe(true);
      expect(result.transfer).toEqual(mockTransfer);
    });

    it('should create a sandbox transfer successfully', async () => {
      const mockTransfer: Transfer = {
        id: 'transfer-789',
        account_id: 'account-123',
        type: 'sandbox',
        status: 'approved',
        amount: '10000.00',
        direction: 'INCOMING',
        created_at: '2025-01-09T12:00:00Z',
        updated_at: '2025-01-09T12:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfer,
      });

      const transferData: CreateTransferRequest = {
        transfer_type: 'sandbox',
        amount: '10000.00',
        direction: 'INCOMING',
      };

      const result = await createTransfer('account-123', transferData);

      expect(result.success).toBe(true);
      expect(result.transfer).toEqual(mockTransfer);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        transfer_type: 'ach',
        amount: '1000.00',
        // Missing direction
      } as CreateTransferRequest;

      const result = await createTransfer('account-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation');
    });

    it('should validate transfer_type', async () => {
      const invalidData = {
        transfer_type: 'invalid' as any,
        amount: '1000.00',
        direction: 'INCOMING',
      } as CreateTransferRequest;

      const result = await createTransfer('account-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation');
    });

    it('should validate direction', async () => {
      const invalidData = {
        transfer_type: 'ach',
        amount: '1000.00',
        direction: 'INVALID' as any,
        relationship_id: 'ach-rel-123',
      } as CreateTransferRequest;

      const result = await createTransfer('account-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation');
    });

    it('should validate amount is positive', async () => {
      const invalidData: CreateTransferRequest = {
        transfer_type: 'ach',
        amount: '-100.00',
        direction: 'INCOMING',
        relationship_id: 'ach-rel-123',
      };

      const result = await createTransfer('account-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should require relationship_id for ACH transfers', async () => {
      const invalidData = {
        transfer_type: 'ach',
        amount: '1000.00',
        direction: 'INCOMING',
        // Missing relationship_id
      } as CreateTransferRequest;

      const result = await createTransfer('account-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('relationship_id');
    });

    it('should require bank_id for wire transfers', async () => {
      const invalidData = {
        transfer_type: 'wire',
        amount: '5000.00',
        direction: 'OUTGOING',
        additional_information: 'Wire transfer',
        fee_payment_method: 'user',
        // Missing bank_id
      } as CreateTransferRequest;

      const result = await createTransfer('account-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('bank_id');
    });

    it('should require additional_information for wire transfers', async () => {
      const invalidData = {
        transfer_type: 'wire',
        amount: '5000.00',
        direction: 'OUTGOING',
        bank_id: 'bank-123',
        fee_payment_method: 'user',
        // Missing additional_information
      } as CreateTransferRequest;

      const result = await createTransfer('account-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('additional_information');
    });

    it('should require fee_payment_method for wire transfers', async () => {
      const invalidData = {
        transfer_type: 'wire',
        amount: '5000.00',
        direction: 'OUTGOING',
        bank_id: 'bank-123',
        additional_information: 'Wire transfer',
        // Missing fee_payment_method
      } as CreateTransferRequest;

      const result = await createTransfer('account-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('fee_payment_method');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Insufficient funds' }),
      });

      const transferData: CreateTransferRequest = {
        transfer_type: 'ach',
        amount: '1000.00',
        direction: 'OUTGOING',
        relationship_id: 'ach-rel-123',
      };

      const result = await createTransfer('account-123', transferData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient funds');
    });
  });

  describe('listTransfers', () => {
    it('should list all transfers', async () => {
      const mockTransfers: Transfer[] = [
        {
          id: 'transfer-1',
          account_id: 'account-123',
          type: 'ach',
          status: 'approved',
          amount: '1000.00',
          direction: 'INCOMING',
          created_at: '2025-01-09T12:00:00Z',
          updated_at: '2025-01-09T12:00:00Z',
        },
        {
          id: 'transfer-2',
          account_id: 'account-123',
          type: 'wire',
          status: 'pending',
          amount: '5000.00',
          direction: 'OUTGOING',
          created_at: '2025-01-09T13:00:00Z',
          updated_at: '2025-01-09T13:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfers,
      });

      const result = await listTransfers('account-123');

      expect(result.success).toBe(true);
      expect(result.transfers).toEqual(mockTransfers);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-transfers/account-123',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should filter transfers by direction', async () => {
      const mockTransfers: Transfer[] = [
        {
          id: 'transfer-1',
          account_id: 'account-123',
          type: 'ach',
          status: 'approved',
          amount: '1000.00',
          direction: 'INCOMING',
          created_at: '2025-01-09T12:00:00Z',
          updated_at: '2025-01-09T12:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfers,
      });

      const result = await listTransfers('account-123', { direction: 'INCOMING' });

      expect(result.success).toBe(true);
      expect(result.transfers).toEqual(mockTransfers);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-transfers/account-123?direction=INCOMING',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should support pagination', async () => {
      const mockTransfers: Transfer[] = [];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfers,
      });

      const result = await listTransfers('account-123', { limit: 10, offset: 20 });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-transfers/account-123?limit=10&offset=20',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });
  });

  describe('cancelTransfer', () => {
    it('should cancel a pending transfer successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Transfer canceled successfully' }),
      });

      const result = await cancelTransfer('account-123', 'transfer-123');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-transfers/account-123/transfer-123',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include'
        })
      );
    });

    it('should handle errors when transfer cannot be canceled', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Transfer cannot be canceled' }),
      });

      const result = await cancelTransfer('account-123', 'transfer-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('canceled');
    });
  });
});
