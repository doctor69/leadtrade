import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock environment variables
vi.mock('import.meta.env', () => ({
  PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

// Mock Supabase client
const mockSupabaseAuth = {
  auth: {
    signUp: vi.fn(),
    getUser: vi.fn()
  }
};

const mockSupabaseAdmin = {
  from: vi.fn()
};

const mockFrom = {
  insert: vi.fn(),
  update: vi.fn(),
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn()
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key) => {
    // Return different mocks based on the key used
    if (key === 'test-service-role-key') {
      return mockSupabaseAdmin;
    }
    return mockSupabaseAuth;
  })
}));

// Mock other dependencies
vi.mock('../alpaca-account', () => ({
  createAlpacaAccount: vi.fn()
}));

vi.mock('../encryption', () => ({
  encryptToken: vi.fn().mockResolvedValue('encrypted-token'),
  hashUserData: vi.fn().mockResolvedValue('hashed-data')
}));

vi.mock('../account-rollback', () => ({
  executeAccountRollback: vi.fn()
}));

vi.mock('../signup-validation', () => ({
  preSignupValidation: vi.fn().mockResolvedValue({
    canProceed: true,
    blockingIssues: [],
    warnings: []
  }),
  postSignupValidation: vi.fn().mockResolvedValue({
    isValid: true,
    issues: [],
    requiresRollback: false
  })
}));

describe('Database Insertion Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseAdmin.from.mockReturnValue(mockFrom);
    mockFrom.insert.mockResolvedValue({ error: null });
    mockFrom.update.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use service role key for database operations', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const { createAlpacaAccount } = await import('../alpaca-account');
    
    // Mock successful Alpaca account creation
    vi.mocked(createAlpacaAccount).mockResolvedValue({
      success: true,
      account: { 
        id: 'alpaca-123', 
        account_number: 'ACC123', 
        status: 'ACTIVE' 
      },
      accountId: 'alpaca-123'
    });

    // Mock successful Supabase auth signup
    mockSupabaseAuth.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-123', email_confirmed_at: null } },
      error: null
    });

    const { createUserAccount } = await import('../signup-service');
    
    const signupData = {
      email: 'test@example.com',
      password: 'password123',
      given_name: 'John',
      family_name: 'Doe',
      date_of_birth: '1990-01-01',
      tax_id: '123456789',
      tax_id_type: 'USA_SSN',
      phone_number: '1234567890',
      street_address: ['123 Main St'],
      city: 'Anytown',
      state: 'CA',
      postal_code: '12345',
      annual_income_min: '25000',
      annual_income_max: '50000',
      total_net_worth_min: '25000',
      total_net_worth_max: '50000',
      liquid_net_worth_min: '10000',
      liquid_net_worth_max: '25000',
      investment_experience_with_stocks: 'limited',
      investment_objective: 'growth',
      risk_tolerance: 'moderate',
      share_trades: false,
      show_asset_amounts: false
    };

    await createUserAccount(signupData);

    // Verify that createClient was called with service role key for database operations
    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-service-role-key'
    );

    // Verify that createClient was called with anon key for auth operations
    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    );

    // Verify database operations used the admin client
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('alpaca_accounts');
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('profiles');
    
    // Verify the insert was called with correct data
    expect(mockFrom.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        alpaca_account_id: 'alpaca-123',
        account_type: 'paper',
        kyc_status: 'approved'
      })
    );
  });

  it('should handle database insertion errors properly', async () => {
    const { createAlpacaAccount } = await import('../alpaca-account');
    
    // Mock successful Alpaca account creation
    vi.mocked(createAlpacaAccount).mockResolvedValue({
      success: true,
      account: { 
        id: 'alpaca-123', 
        account_number: 'ACC123', 
        status: 'ACTIVE' 
      },
      accountId: 'alpaca-123'
    });

    // Mock successful Supabase auth signup
    mockSupabaseAuth.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-123', email_confirmed_at: null } },
      error: null
    });

    // Mock database insertion failure
    mockFrom.insert.mockResolvedValue({ 
      error: { message: 'RLS policy violation' } 
    });

    const { createUserAccount } = await import('../signup-service');
    
    const signupData = {
      email: 'test@example.com',
      password: 'password123',
      given_name: 'John',
      family_name: 'Doe',
      date_of_birth: '1990-01-01',
      tax_id: '123456789',
      tax_id_type: 'USA_SSN',
      phone_number: '1234567890',
      street_address: ['123 Main St'],
      city: 'Anytown',
      state: 'CA',
      postal_code: '12345',
      annual_income_min: '25000',
      annual_income_max: '50000',
      total_net_worth_min: '25000',
      total_net_worth_max: '50000',
      liquid_net_worth_min: '10000',
      liquid_net_worth_max: '25000',
      investment_experience_with_stocks: 'limited',
      investment_objective: 'growth',
      risk_tolerance: 'moderate',
      share_trades: false,
      show_asset_amounts: false
    };

    const result = await createUserAccount(signupData);

    // Should fail due to database insertion error
    expect(result.success).toBe(false);
    expect(result.error).toContain('Account setup failed');
  });

  it('should verify environment variables are properly configured', () => {
    // This test ensures the environment variables are properly set up
    expect(import.meta.env.PUBLIC_SUPABASE_URL).toBeDefined();
    expect(import.meta.env.PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    expect(import.meta.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
  });
});