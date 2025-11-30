import { describe, it, expect, vi, beforeEach } from 'vitest';
import { removePDTFlag } from '../alpaca-account';

// Mock environment variables
vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://test.supabase.co');

describe('PDT Removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('removePDTFlag', () => {
    it('should successfully remove PDT flag', async () => {
      const mockResponse = {
        message: 'PDT flag removed successfully',
        pdt_removed: true,
        pdt_removed_at: '2025-01-10T12:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await removePDTFlag('test-account-id');

      expect(result.success).toBe(true);
      expect(result.message).toBe('PDT flag removed successfully');
      expect(result.pdt_removed).toBe(true);
      expect(result.pdt_removed_at).toBe('2025-01-10T12:00:00Z');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/alpaca-pdt-removal/test-account-id',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('should return error when account is not PDT', async () => {
      const mockError = {
        error: 'Account is not currently flagged as a Pattern Day Trader',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => mockError,
      });

      const result = await removePDTFlag('test-account-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not currently flagged');
    });

    it('should return error when PDT removal already used', async () => {
      const mockError = {
        error: 'PDT removal was already used on 2024-12-01T10:00:00Z. This is a one-time only operation.',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => mockError,
      });

      const result = await removePDTFlag('test-account-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already used');
      expect(result.error).toContain('one-time only');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await removePDTFlag('test-account-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle invalid JSON responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Invalid JSON'); },
      });

      const result = await removePDTFlag('test-account-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON');
    });

    it('should validate account ID is required', async () => {
      const result = await removePDTFlag('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account ID is required');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
