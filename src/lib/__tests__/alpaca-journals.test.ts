import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createJournal, createBatchJournals, listJournals, cancelJournal } from '../alpaca-journals';
import type { Journal, CreateJournalRequest, BatchJournalRequest } from '../alpaca-journals';

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      PUBLIC_SUPABASE_URL: 'https://test.supabase.co'
    }
  }
});

// Mock fetch globally
global.fetch = vi.fn();

describe('Alpaca Journal Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createJournal', () => {
    it('should create a JNLC (cash) journal successfully', async () => {
      const mockJournal: Journal = {
        id: 'journal-123',
        entry_type: 'JNLC',
        from_account: 'account-123',
        to_account: 'account-456',
        status: 'pending',
        net_amount: '1000.00',
        description: 'Internal cash transfer',
        system_date: '2025-01-09',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJournal,
      });

      const journalData: CreateJournalRequest = {
        entry_type: 'JNLC',
        from_account: 'account-123',
        to_account: 'account-456',
        amount: '1000.00',
        description: 'Internal cash transfer',
      };

      const result = await createJournal(journalData);

      expect(result.success).toBe(true);
      expect(result.journal).toEqual(mockJournal);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-journals',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(journalData),
          credentials: 'include'
        })
      );
    });

    it('should create a JNLS (securities) journal successfully', async () => {
      const mockJournal: Journal = {
        id: 'journal-456',
        entry_type: 'JNLS',
        from_account: 'account-123',
        to_account: 'account-456',
        status: 'pending',
        symbol: 'AAPL',
        qty: '10',
        description: 'Transfer AAPL shares',
        system_date: '2025-01-09',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJournal,
      });

      const journalData: CreateJournalRequest = {
        entry_type: 'JNLS',
        from_account: 'account-123',
        to_account: 'account-456',
        symbol: 'AAPL',
        qty: '10',
        description: 'Transfer AAPL shares',
      };

      const result = await createJournal(journalData);

      expect(result.success).toBe(true);
      expect(result.journal).toEqual(mockJournal);
    });

    it('should validate JNLC requires amount', async () => {
      const result = await createJournal({
        entry_type: 'JNLC',
        from_account: 'account-123',
        to_account: 'account-456',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount is required for JNLC');
    });

    it('should validate amount is positive', async () => {
      const result = await createJournal({
        entry_type: 'JNLC',
        from_account: 'account-123',
        to_account: 'account-456',
        amount: '-100.00',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive number');
    });

    it('should validate JNLS requires symbol and qty', async () => {
      const result = await createJournal({
        entry_type: 'JNLS',
        from_account: 'account-123',
        to_account: 'account-456',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('symbol and qty are required for JNLS');
    });

    it('should validate qty is positive', async () => {
      const result = await createJournal({
        entry_type: 'JNLS',
        from_account: 'account-123',
        to_account: 'account-456',
        symbol: 'AAPL',
        qty: '0',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive number');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Insufficient funds' }),
      });

      const result = await createJournal({
        entry_type: 'JNLC',
        from_account: 'account-123',
        to_account: 'account-456',
        amount: '1000.00',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient funds');
    });
  });

  describe('createBatchJournals', () => {
    it('should create one-to-many batch journals successfully', async () => {
      const mockJournals: Journal[] = [
        {
          id: 'journal-1',
          entry_type: 'JNLC',
          from_account: 'master-account',
          to_account: 'account-1',
          status: 'pending',
          net_amount: '500.00',
          system_date: '2025-01-09',
        },
        {
          id: 'journal-2',
          entry_type: 'JNLC',
          from_account: 'master-account',
          to_account: 'account-2',
          status: 'pending',
          net_amount: '750.00',
          system_date: '2025-01-09',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJournals,
      });

      const batchData: BatchJournalRequest = {
        entry_type: 'JNLC',
        from_account: 'master-account',
        entries: [
          { to_account: 'account-1', amount: '500.00' },
          { to_account: 'account-2', amount: '750.00' },
        ],
        description: 'Distribute funds',
      };

      const result = await createBatchJournals(batchData);

      expect(result.success).toBe(true);
      expect(result.journals).toEqual(mockJournals);
      expect(result.journals).toHaveLength(2);
    });

    it('should create many-to-one batch journals successfully', async () => {
      const mockJournals: Journal[] = [
        {
          id: 'journal-3',
          entry_type: 'JNLC',
          from_account: 'account-1',
          to_account: 'master-account',
          status: 'pending',
          net_amount: '100.00',
          system_date: '2025-01-09',
        },
        {
          id: 'journal-4',
          entry_type: 'JNLC',
          from_account: 'account-2',
          to_account: 'master-account',
          status: 'pending',
          net_amount: '200.00',
          system_date: '2025-01-09',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJournals,
      });

      const batchData: BatchJournalRequest = {
        entry_type: 'JNLC',
        to_account: 'master-account',
        entries: [
          { from_account: 'account-1', amount: '100.00' },
          { from_account: 'account-2', amount: '200.00' },
        ],
        description: 'Collect funds',
      };

      const result = await createBatchJournals(batchData);

      expect(result.success).toBe(true);
      expect(result.journals).toEqual(mockJournals);
    });

    it('should validate entries array is not empty', async () => {
      const result = await createBatchJournals({
        entry_type: 'JNLC',
        from_account: 'master-account',
        entries: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must not be empty');
    });

    it('should validate either from_account or to_account, not both', async () => {
      const result = await createBatchJournals({
        entry_type: 'JNLC',
        from_account: 'master-account',
        to_account: 'master-account',
        entries: [{ amount: '100.00' }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not both');
    });

    it('should validate at least one account is specified', async () => {
      const result = await createBatchJournals({
        entry_type: 'JNLC',
        entries: [{ amount: '100.00' }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be specified');
    });

    it('should validate each entry has amount', async () => {
      const result = await createBatchJournals({
        entry_type: 'JNLC',
        from_account: 'master-account',
        entries: [{ to_account: 'account-1' } as any],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should validate each entry amount is positive', async () => {
      const result = await createBatchJournals({
        entry_type: 'JNLC',
        from_account: 'master-account',
        entries: [{ to_account: 'account-1', amount: '-100.00' }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive number');
    });

    it('should validate one-to-many entries have to_account', async () => {
      const result = await createBatchJournals({
        entry_type: 'JNLC',
        from_account: 'master-account',
        entries: [{ amount: '100.00' } as any],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must have to_account');
    });

    it('should validate many-to-one entries have from_account', async () => {
      const result = await createBatchJournals({
        entry_type: 'JNLC',
        to_account: 'master-account',
        entries: [{ amount: '100.00' } as any],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must have from_account');
    });
  });

  describe('listJournals', () => {
    it('should list all journals successfully', async () => {
      const mockJournals: Journal[] = [
        {
          id: 'journal-1',
          entry_type: 'JNLC',
          from_account: 'account-123',
          to_account: 'account-456',
          status: 'executed',
          net_amount: '1000.00',
          system_date: '2025-01-09',
        },
        {
          id: 'journal-2',
          entry_type: 'JNLS',
          from_account: 'account-123',
          to_account: 'account-789',
          status: 'pending',
          symbol: 'AAPL',
          qty: '10',
          system_date: '2025-01-09',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJournals,
      });

      const result = await listJournals();

      expect(result.success).toBe(true);
      expect(result.journals).toEqual(mockJournals);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-journals',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should filter journals by status', async () => {
      const mockJournals: Journal[] = [
        {
          id: 'journal-1',
          entry_type: 'JNLC',
          from_account: 'account-123',
          to_account: 'account-456',
          status: 'pending',
          net_amount: '1000.00',
          system_date: '2025-01-09',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJournals,
      });

      const result = await listJournals({ status: 'pending' });

      expect(result.success).toBe(true);
      expect(result.journals).toEqual(mockJournals);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=pending'),
        expect.any(Object)
      );
    });

    it('should filter journals by entry_type', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await listJournals({ entry_type: 'JNLC' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('entry_type=JNLC'),
        expect.any(Object)
      );
    });

    it('should filter journals by accounts', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await listJournals({
        from_account: 'account-123',
        to_account: 'account-456',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('from_account=account-123'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('to_account=account-456'),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      const result = await listJournals();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Server error');
    });
  });

  describe('cancelJournal', () => {
    it('should cancel a pending journal successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Journal canceled successfully' }),
      });

      const result = await cancelJournal('journal-123');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-journals/journal-123',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include'
        })
      );
    });

    it('should handle error when journal cannot be canceled', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Journal has already been executed' }),
      });

      const result = await cancelJournal('journal-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('executed');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await cancelJournal('journal-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should validate journal ID is provided', async () => {
      const result = await cancelJournal('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Journal ID is required');
    });
  });
});
