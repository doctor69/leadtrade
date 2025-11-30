import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createACHRelationship,
  listACHRelationships,
  deleteACHRelationship,
  type CreateACHRelationshipRequest,
  type ACHRelationship,
} from '../alpaca-ach-relationships';

// Mock the trading-config module
vi.mock('../trading-config', () => ({
  getAlpacaConfig: vi.fn(() => ({
    brokerBaseUrl: 'https://broker-api.sandbox.alpaca.markets/v1',
    brokerApiKey: 'test-key',
    brokerApiSecret: 'test-secret',
  })),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('ACH Relationship Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createACHRelationship', () => {
    it('should create ACH relationship with manual entry', async () => {
      const mockACH: ACHRelationship = {
        id: 'ach_123',
        account_id: 'acc_123',
        status: 'queued',
        account_owner_name: 'John Doe',
        bank_account_type: 'checking',
        bank_account_number: '****1234',
        bank_routing_number: '123456789',
        created_at: '2025-01-09T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockACH,
      });

      const achData: CreateACHRelationshipRequest = {
        account_owner_name: 'John Doe',
        bank_account_type: 'checking',
        bank_account_number: '1234567890',
        bank_routing_number: '123456789',
        nickname: 'My Checking',
      };

      const result = await createACHRelationship('acc_123', achData, 'paper');

      expect(result.success).toBe(true);
      expect(result.ach).toEqual(mockACH);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://broker-api.sandbox.alpaca.markets/v1/accounts/acc_123/ach_relationships',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(achData),
        })
      );
    });

    it('should create ACH relationship with Plaid processor token', async () => {
      const mockACH: ACHRelationship = {
        id: 'ach_456',
        account_id: 'acc_123',
        status: 'queued',
        account_owner_name: 'Jane Smith',
        bank_account_type: 'savings',
        bank_account_number: '****5678',
        bank_routing_number: '987654321',
        processor_token: 'processor-sandbox-token',
        created_at: '2025-01-09T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockACH,
      });

      const achData: CreateACHRelationshipRequest = {
        account_owner_name: 'Jane Smith',
        bank_account_type: 'savings',
        processor_token: 'processor-sandbox-token',
      };

      const result = await createACHRelationship('acc_123', achData, 'paper');

      expect(result.success).toBe(true);
      expect(result.ach).toEqual(mockACH);
    });

    it('should validate bank_account_type', async () => {
      const achData: any = {
        account_owner_name: 'John Doe',
        bank_account_type: 'invalid',
        bank_account_number: '1234567890',
        bank_routing_number: '123456789',
      };

      const result = await createACHRelationship('acc_123', achData, 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toContain('bank_account_type must be either "checking" or "savings"');
    });

    it('should validate required fields for manual entry', async () => {
      const achData: any = {
        account_owner_name: 'John Doe',
        bank_account_type: 'checking',
        // Missing bank_account_number and bank_routing_number
      };

      const result = await createACHRelationship('acc_123', achData, 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toContain('bank_account_number and bank_routing_number are required');
    });

    it('should validate routing number format', async () => {
      const achData: CreateACHRelationshipRequest = {
        account_owner_name: 'John Doe',
        bank_account_type: 'checking',
        bank_account_number: '1234567890',
        bank_routing_number: '12345', // Invalid: not 9 digits
      };

      const result = await createACHRelationship('acc_123', achData, 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toContain('bank_routing_number must be exactly 9 digits');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ message: 'Invalid routing number' }),
      });

      const achData: CreateACHRelationshipRequest = {
        account_owner_name: 'John Doe',
        bank_account_type: 'checking',
        bank_account_number: '1234567890',
        bank_routing_number: '123456789',
      };

      const result = await createACHRelationship('acc_123', achData, 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid routing number');
    });
  });

  describe('listACHRelationships', () => {
    it('should list all ACH relationships', async () => {
      const mockRelationships: ACHRelationship[] = [
        {
          id: 'ach_123',
          account_id: 'acc_123',
          status: 'approved',
          account_owner_name: 'John Doe',
          bank_account_type: 'checking',
          bank_account_number: '****1234',
          bank_routing_number: '123456789',
          created_at: '2025-01-09T00:00:00Z',
        },
        {
          id: 'ach_456',
          account_id: 'acc_123',
          status: 'queued',
          account_owner_name: 'Jane Smith',
          bank_account_type: 'savings',
          bank_account_number: '****5678',
          bank_routing_number: '987654321',
          created_at: '2025-01-09T01:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelationships,
      });

      const result = await listACHRelationships('acc_123', undefined, 'paper');

      expect(result.success).toBe(true);
      expect(result.relationships).toEqual(mockRelationships);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://broker-api.sandbox.alpaca.markets/v1/accounts/acc_123/ach_relationships',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should filter ACH relationships by status', async () => {
      const mockRelationships: ACHRelationship[] = [
        {
          id: 'ach_123',
          account_id: 'acc_123',
          status: 'approved',
          account_owner_name: 'John Doe',
          bank_account_type: 'checking',
          bank_account_number: '****1234',
          bank_routing_number: '123456789',
          created_at: '2025-01-09T00:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelationships,
      });

      const result = await listACHRelationships('acc_123', { status: 'approved' }, 'paper');

      expect(result.success).toBe(true);
      expect(result.relationships).toEqual(mockRelationships);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://broker-api.sandbox.alpaca.markets/v1/accounts/acc_123/ach_relationships?status=approved',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Account not found',
      });

      const result = await listACHRelationships('acc_invalid', undefined, 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deleteACHRelationship', () => {
    it('should delete ACH relationship successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const result = await deleteACHRelationship('acc_123', 'ach_123', 'paper');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://broker-api.sandbox.alpaca.markets/v1/accounts/acc_123/ach_relationships/ach_123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle pending transfer validation error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ 
          message: 'Cannot delete ACH relationship with pending transfer' 
        }),
      });

      const result = await deleteACHRelationship('acc_123', 'ach_123', 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toContain('pending transfer');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ message: 'ACH relationship not found' }),
      });

      const result = await deleteACHRelationship('acc_123', 'ach_invalid', 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ACH relationship not found');
    });
  });
});
