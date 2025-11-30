import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
  })),
  auth: {
    admin: {
      deleteUser: vi.fn(() => ({ error: null })),
    },
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Import the API route handler
import { POST } from '../../pages/api/rollback-user';

describe('Rollback User API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully rollback user account', async () => {
    const mockRequest = {
      json: () => Promise.resolve({
        userId: 'test-user-123',
        reason: 'Alpaca account creation failed',
      }),
    };

    // Mock successful deletions
    const mockDelete = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
    mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });
    mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({ error: null });

    const response = await POST({ request: mockRequest as any });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.message).toBe('User account rollback completed successfully');
    expect(responseData.reason).toBe('Alpaca account creation failed');

    // Verify all deletion operations were called
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('alpaca_accounts');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_details');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith('test-user-123');
  });

  it('should return error if userId is missing', async () => {
    const mockRequest = {
      json: () => Promise.resolve({
        reason: 'Test rollback',
      }),
    };

    const response = await POST({ request: mockRequest as any });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe('User ID is required');
  });

  it('should handle auth user deletion failure', async () => {
    const mockRequest = {
      json: () => Promise.resolve({
        userId: 'test-user-123',
        reason: 'Test rollback',
      }),
    };

    // Mock successful table deletions but failed auth deletion
    const mockDelete = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
    mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });
    mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({ 
      error: { message: 'User not found' } 
    });

    const response = await POST({ request: mockRequest as any });
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.error).toBe('Failed to delete user account');
    expect(responseData.details).toBe('User not found');
  });

  it('should continue rollback even if some table deletions fail', async () => {
    const mockRequest = {
      json: () => Promise.resolve({
        userId: 'test-user-123',
        reason: 'Test rollback',
      }),
    };

    // Mock some table deletion failures
    let callCount = 0;
    const mockDelete = vi.fn(() => ({ 
      eq: vi.fn(() => ({ 
        error: callCount++ === 0 ? { message: 'Table deletion failed' } : null 
      })) 
    }));
    
    mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });
    mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({ error: null });

    const response = await POST({ request: mockRequest as any });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    
    // Check that rollback operations include both successes and failures
    expect(responseData.rollbackOperations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'alpaca_accounts', error: 'Table deletion failed' }),
        expect.objectContaining({ table: 'user_details', success: true }),
        expect.objectContaining({ table: 'profiles', success: true }),
        expect.objectContaining({ table: 'auth.users', success: true }),
      ])
    );
  });

  it('should handle JSON parsing errors', async () => {
    const mockRequest = {
      json: () => Promise.reject(new Error('Invalid JSON')),
    };

    const response = await POST({ request: mockRequest as any });
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.error).toBe('Internal server error during rollback');
    expect(responseData.details).toBe('Invalid JSON');
  });
});