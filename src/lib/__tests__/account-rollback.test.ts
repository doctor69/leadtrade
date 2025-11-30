import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccountRollbackManager, executeAccountRollback } from '../account-rollback';

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    admin: {
      deleteUser: vi.fn()
    }
  }
};

const mockFrom = {
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null }),
  // Add the missing methods that return promises
  then: vi.fn().mockResolvedValue({ data: null, error: null })
};

// Create a proper chain mock
const createMockChain = () => ({
  delete: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null })
  }),
  insert: vi.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null })
});

// Mock fetch for API calls
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true })
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

describe('AccountRollbackManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.from.mockReturnValue(createMockChain());
    mockFrom.delete.mockReturnValue({ error: null });
    mockFrom.insert.mockReturnValue({ error: null });
    mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeRollback', () => {
    it('should execute comprehensive rollback for failed signup', async () => {
      const rollbackManager = new AccountRollbackManager();
      
      const result = await rollbackManager.executeRollback({
        userId: 'test-user-123',
        alpacaAccountId: 'alpaca-123',
        reason: 'Test rollback'
      });

      expect(result.success).toBe(true);
      expect(result.context.userId).toBe('test-user-123');
      expect(result.context.alpacaAccountId).toBe('alpaca-123');
      expect(result.context.reason).toBe('Test rollback');
      expect(result.context.rollbackSteps.length).toBeGreaterThan(0);
    });

    it('should handle Supabase cleanup failures gracefully', async () => {
      // Mock some failures
      mockFrom.delete.mockReturnValueOnce({ error: { message: 'Delete failed' } });
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValueOnce({ 
        error: { message: 'User deletion failed' } 
      });

      const rollbackManager = new AccountRollbackManager();
      
      const result = await rollbackManager.executeRollback({
        userId: 'test-user-123',
        reason: 'Test rollback with failures'
      });

      expect(result.success).toBe(false);
      expect(result.context.rollbackSteps.some(step => !step.success)).toBe(true);
    });

    it('should log Alpaca account for manual cleanup', async () => {
      const rollbackManager = new AccountRollbackManager();
      
      const result = await rollbackManager.executeRollback({
        alpacaAccountId: 'alpaca-123',
        alpacaAccountNumber: 'ACC123',
        reason: 'Alpaca cleanup test'
      });

      // Should attempt to insert into alpaca_cleanup_log
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alpaca_cleanup_log');
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          alpaca_account_id: 'alpaca-123',
          alpaca_account_number: 'ACC123',
          reason: 'Alpaca cleanup test',
          cleanup_status: 'pending_manual_cleanup'
        })
      );
    });

    it('should call rollback API when available', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(new Response(
        JSON.stringify({ success: true }),
        { status: 200 }
      ));

      const rollbackManager = new AccountRollbackManager();
      
      await rollbackManager.executeRollback({
        userId: 'test-user-123',
        reason: 'API test'
      });

      expect(fetch).toHaveBeenCalledWith('/api/rollback-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-123',
          reason: 'API test'
        })
      });
    });

    it('should handle rollback API failures gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const rollbackManager = new AccountRollbackManager();
      
      const result = await rollbackManager.executeRollback({
        userId: 'test-user-123',
        reason: 'API failure test'
      });

      // Should still succeed overall even if API call fails
      const apiStep = result.context.rollbackSteps.find(step => step.step === 'rollback_api_call');
      expect(apiStep?.success).toBe(false);
      expect(apiStep?.error).toContain('Network error');
    });

    it('should create audit log entry', async () => {
      const rollbackManager = new AccountRollbackManager();
      
      await rollbackManager.executeRollback({
        userId: 'test-user-123',
        alpacaAccountId: 'alpaca-123',
        reason: 'Audit test'
      });

      // Should attempt to insert into rollback_audit_log
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rollback_audit_log');
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          alpaca_account_id: 'alpaca-123',
          reason: 'Audit test',
          rollback_steps: expect.any(Array)
        })
      );
    });
  });

  describe('executeAccountRollback convenience function', () => {
    it('should execute rollback with minimal parameters', async () => {
      const result = await executeAccountRollback(
        'test-user-123',
        'alpaca-123',
        'Convenience function test'
      );

      expect(result.success).toBe(true);
      expect(result.context.userId).toBe('test-user-123');
      expect(result.context.alpacaAccountId).toBe('alpaca-123');
      expect(result.context.reason).toBe('Convenience function test');
    });

    it('should work with only user ID', async () => {
      const result = await executeAccountRollback(
        'test-user-123',
        undefined,
        'User only test'
      );

      expect(result.success).toBe(true);
      expect(result.context.userId).toBe('test-user-123');
      expect(result.context.alpacaAccountId).toBeUndefined();
    });

    it('should work with only Alpaca account ID', async () => {
      const result = await executeAccountRollback(
        undefined,
        'alpaca-123',
        'Alpaca only test'
      );

      expect(result.success).toBe(true);
      expect(result.context.userId).toBeUndefined();
      expect(result.context.alpacaAccountId).toBe('alpaca-123');
    });
  });

  describe('rollback step tracking', () => {
    it('should track all rollback steps with timestamps', async () => {
      const rollbackManager = new AccountRollbackManager();
      
      const result = await rollbackManager.executeRollback({
        userId: 'test-user-123',
        alpacaAccountId: 'alpaca-123',
        reason: 'Step tracking test'
      });

      expect(result.context.rollbackSteps.length).toBeGreaterThan(0);
      
      result.context.rollbackSteps.forEach(step => {
        expect(step).toHaveProperty('step');
        expect(step).toHaveProperty('success');
        expect(step).toHaveProperty('timestamp');
        expect(typeof step.success).toBe('boolean');
        expect(new Date(step.timestamp)).toBeInstanceOf(Date);
      });
    });

    it('should include error messages for failed steps', async () => {
      // Mock a failure
      mockFrom.delete.mockReturnValueOnce({ error: { message: 'Deletion failed' } });

      const rollbackManager = new AccountRollbackManager();
      
      const result = await rollbackManager.executeRollback({
        userId: 'test-user-123',
        reason: 'Error tracking test'
      });

      const failedStep = result.context.rollbackSteps.find(step => !step.success);
      expect(failedStep).toBeDefined();
      expect(failedStep?.error).toBe('Deletion failed');
    });
  });

  describe('error handling', () => {
    it('should handle complete rollback failure', async () => {
      // Mock Supabase client creation failure
      vi.mocked(mockSupabaseClient.from).mockImplementation(() => {
        throw new Error('Supabase connection failed');
      });

      const rollbackManager = new AccountRollbackManager();
      
      const result = await rollbackManager.executeRollback({
        userId: 'test-user-123',
        reason: 'Complete failure test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Supabase connection failed');
    });

    it('should continue rollback even if some steps fail', async () => {
      // Mock partial failures
      mockFrom.delete
        .mockReturnValueOnce({ error: { message: 'First delete failed' } })
        .mockReturnValueOnce({ error: null })
        .mockReturnValueOnce({ error: null });

      const rollbackManager = new AccountRollbackManager();
      
      const result = await rollbackManager.executeRollback({
        userId: 'test-user-123',
        reason: 'Partial failure test'
      });

      // Should have both successful and failed steps
      const hasSuccess = result.context.rollbackSteps.some(step => step.success);
      const hasFailure = result.context.rollbackSteps.some(step => !step.success);
      
      expect(hasSuccess).toBe(true);
      expect(hasFailure).toBe(true);
    });
  });
});