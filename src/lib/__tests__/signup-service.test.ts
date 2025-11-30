import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AlpacaAccountResponse } from '../alpaca-account';

// Mock dependencies first
vi.mock('../alpaca-account', () => ({
  createAlpacaAccount: vi.fn(),
}));

vi.mock('../encryption', () => ({
  encryptToken: vi.fn(),
  hashUserData: vi.fn(),
}));

vi.mock('../signup-validation', () => ({
  preSignupValidation: vi.fn(),
  postSignupValidation: vi.fn(),
}));

const mockSupabaseClient = {
  auth: {
    signUp: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
    insert: vi.fn(() => ({ error: null })),
    select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => ({ data: null })) })) })),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Import after mocking
import { createUserAccount, createOAuthUserAccount, type SignupData } from '../signup-service';
import { createAlpacaAccount } from '../alpaca-account';
import { encryptToken, hashUserData } from '../encryption';
import { preSignupValidation, postSignupValidation } from '../signup-validation';

const mockCreateAlpacaAccount = vi.mocked(createAlpacaAccount);
const mockEncryptToken = vi.mocked(encryptToken);
const mockHashUserData = vi.mocked(hashUserData);
const mockPreSignupValidation = vi.mocked(preSignupValidation);
const mockPostSignupValidation = vi.mocked(postSignupValidation);

// Mock fetch for rollback API
global.fetch = vi.fn();

describe('Signup Service', () => {
  const mockSignupData: SignupData = {
    email: 'test@example.com',
    password: 'password123',
    given_name: 'John',
    family_name: 'Doe',
    date_of_birth: '1990-01-01',
    tax_id: '123-45-6789',
    tax_id_type: 'USA_SSN',
    phone_number: '555-123-4567',
    street_address: ['123 Main St'],
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
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
    show_asset_amounts: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEncryptToken.mockResolvedValue('encrypted_token');
    mockHashUserData.mockResolvedValue('hashed_data');
    
    // Mock validation functions to pass by default
    mockPreSignupValidation.mockResolvedValue({
      canProceed: true,
      blockingIssues: [],
      warnings: []
    });
    
    mockPostSignupValidation.mockResolvedValue({
      isValid: true,
      issues: [],
      requiresRollback: false
    });
  });

  describe('createUserAccount', () => {
    it('should create Alpaca account first and only create Supabase account if Alpaca succeeds', async () => {
      // Create a complete mock Alpaca account response
      const mockAlpacaAccount: AlpacaAccountResponse = {
        id: 'alpaca-123',
        account_number: 'ACC123',
        status: 'ACTIVE',
        currency: 'USD',
        buying_power: '1000.00',
        regt_buying_power: '1000.00',
        daytrading_buying_power: '0.00',
        non_marginable_buying_power: '1000.00',
        cash: '1000.00',
        accrued_fees: '0.00',
        pending_transfer_out: '0.00',
        pending_transfer_in: '0.00',
        portfolio_value: '1000.00',
        pattern_day_trader: false,
        trading_blocked: false,
        transfers_blocked: false,
        account_blocked: false,
        created_at: '2025-01-01T00:00:00Z',
        trade_suspended_by_user: false,
        multiplier: '1',
        shorting_enabled: false,
        equity: '1000.00',
        last_equity: '1000.00',
        long_market_value: '0.00',
        short_market_value: '0.00',
        initial_margin: '0.00',
        maintenance_margin: '0.00',
        last_maintenance_margin: '0.00',
        sma: '0.00',
        daytrade_count: 0,
      };

      // Mock successful Alpaca account creation
      mockCreateAlpacaAccount.mockResolvedValue({
        success: true,
        account: mockAlpacaAccount,
        accountId: 'alpaca-123',
      });

      // Mock successful Supabase signup
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-123', email_confirmed_at: null },
        },
        error: null,
      });

      const result = await createUserAccount(mockSignupData, 'paper');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.alpacaAccountId).toBe('alpaca-123');
      expect(result.needsEmailVerification).toBe(true);

      // Verify Alpaca account was created first
      expect(mockCreateAlpacaAccount).toHaveBeenCalledBefore(mockSupabaseClient.auth.signUp as any);
    });

    it('should fail early if Alpaca account creation fails', async () => {
      // Mock failed Alpaca account creation
      mockCreateAlpacaAccount.mockResolvedValue({
        success: false,
        error: 'Invalid SSN format',
      });

      const result = await createUserAccount(mockSignupData, 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Trading account creation failed: Invalid SSN format');

      // Verify Supabase signup was never called
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it('should rollback Supabase account if linking fails', async () => {
      // Create a complete mock Alpaca account response
      const mockAlpacaAccount: AlpacaAccountResponse = {
        id: 'alpaca-123',
        account_number: 'ACC123',
        status: 'ACTIVE',
        currency: 'USD',
        buying_power: '1000.00',
        regt_buying_power: '1000.00',
        daytrading_buying_power: '0.00',
        non_marginable_buying_power: '1000.00',
        cash: '1000.00',
        accrued_fees: '0.00',
        pending_transfer_out: '0.00',
        pending_transfer_in: '0.00',
        portfolio_value: '1000.00',
        pattern_day_trader: false,
        trading_blocked: false,
        transfers_blocked: false,
        account_blocked: false,
        created_at: '2025-01-01T00:00:00Z',
        trade_suspended_by_user: false,
        multiplier: '1',
        shorting_enabled: false,
        equity: '1000.00',
        last_equity: '1000.00',
        long_market_value: '0.00',
        short_market_value: '0.00',
        initial_margin: '0.00',
        maintenance_margin: '0.00',
        last_maintenance_margin: '0.00',
        sma: '0.00',
        daytrade_count: 0,
      };

      // Mock successful Alpaca account creation
      mockCreateAlpacaAccount.mockResolvedValue({
        success: true,
        account: mockAlpacaAccount,
        accountId: 'alpaca-123',
      });

      // Mock successful Supabase signup
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-123', email_confirmed_at: null },
        },
        error: null,
      });

      // Mock profile update failure to trigger rollback - throw an error to trigger catch block
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => {
          throw new Error('Profile update failed');
        })
      }));
      const mockInsert = vi.fn(() => ({ error: null }));

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
        insert: mockInsert,
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => ({ data: null })) })) })),
        delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
      });

      // Mock successful rollback API call
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await createUserAccount(mockSignupData, 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account setup failed');

      // Verify rollback API was called
      expect(global.fetch).toHaveBeenCalledWith('/api/rollback-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-123',
          reason: 'Account linking failed after successful creation',
        }),
      });
    });
  });

  describe('createOAuthUserAccount', () => {
    const mockOAuthUserData = {
      email: 'test@example.com',
      full_name: 'John Doe',
      given_name: 'John',
      family_name: 'Doe',
      provider: 'google' as const,
    };

    const mockAdditionalData = {
      date_of_birth: '1990-01-01',
      tax_id: '123-45-6789',
      phone_number: '555-123-4567',
      street_address: '123 Main St',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      share_trades: false,
      show_asset_amounts: false,
    };

    it('should create Alpaca account first for OAuth users', async () => {
      // Mock authenticated OAuth user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'oauth-user-123', email: 'test@example.com' } },
        error: null,
      });

      // Mock no existing profile
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null }))
        }))
      }));
      const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
      const mockInsert = vi.fn(() => ({ error: null }));
      const mockDelete = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
        insert: mockInsert,
        delete: mockDelete,
      });

      // Create a complete mock Alpaca account response
      const mockAlpacaAccount: AlpacaAccountResponse = {
        id: 'alpaca-oauth-123',
        account_number: 'ACC456',
        status: 'ACTIVE',
        currency: 'USD',
        buying_power: '1000.00',
        regt_buying_power: '1000.00',
        daytrading_buying_power: '0.00',
        non_marginable_buying_power: '1000.00',
        cash: '1000.00',
        accrued_fees: '0.00',
        pending_transfer_out: '0.00',
        pending_transfer_in: '0.00',
        portfolio_value: '1000.00',
        pattern_day_trader: false,
        trading_blocked: false,
        transfers_blocked: false,
        account_blocked: false,
        created_at: '2025-01-01T00:00:00Z',
        trade_suspended_by_user: false,
        multiplier: '1',
        shorting_enabled: false,
        equity: '1000.00',
        last_equity: '1000.00',
        long_market_value: '0.00',
        short_market_value: '0.00',
        initial_margin: '0.00',
        maintenance_margin: '0.00',
        last_maintenance_margin: '0.00',
        sma: '0.00',
        daytrade_count: 0,
      };

      // Mock successful Alpaca account creation
      mockCreateAlpacaAccount.mockResolvedValue({
        success: true,
        account: mockAlpacaAccount,
        accountId: 'alpaca-oauth-123',
      });

      const result = await createOAuthUserAccount(
        mockOAuthUserData,
        mockAdditionalData,
        'paper'
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe('oauth-user-123');
      expect(result.alpacaAccountId).toBe('alpaca-oauth-123');

      // Verify Alpaca account was created
      expect(mockCreateAlpacaAccount).toHaveBeenCalled();
    });

    it('should fail if Alpaca account creation fails for OAuth users', async () => {
      // Mock authenticated OAuth user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'oauth-user-123', email: 'test@example.com' } },
        error: null,
      });

      // Mock no existing profile
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null }))
        }))
      }));
      const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
      const mockInsert = vi.fn(() => ({ error: null }));
      const mockDelete = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
        insert: mockInsert,
        delete: mockDelete,
      });

      // Mock failed Alpaca account creation
      mockCreateAlpacaAccount.mockResolvedValue({
        success: false,
        error: 'SSN verification failed',
      });

      const result = await createOAuthUserAccount(
        mockOAuthUserData,
        mockAdditionalData,
        'paper'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Trading account creation failed: SSN verification failed');
    });

    it('should clean up partial data if OAuth account linking fails', async () => {
      // Mock authenticated OAuth user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'oauth-user-123', email: 'test@example.com' } },
        error: null,
      });

      // Mock no existing profile
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null }))
        }))
      }));

      // Create a complete mock Alpaca account response
      const mockAlpacaAccount: AlpacaAccountResponse = {
        id: 'alpaca-oauth-123-2',
        account_number: 'ACC789',
        status: 'ACTIVE',
        currency: 'USD',
        buying_power: '1000.00',
        regt_buying_power: '1000.00',
        daytrading_buying_power: '0.00',
        non_marginable_buying_power: '1000.00',
        cash: '1000.00',
        accrued_fees: '0.00',
        pending_transfer_out: '0.00',
        pending_transfer_in: '0.00',
        portfolio_value: '1000.00',
        pattern_day_trader: false,
        trading_blocked: false,
        transfers_blocked: false,
        account_blocked: false,
        created_at: '2025-01-01T00:00:00Z',
        trade_suspended_by_user: false,
        multiplier: '1',
        shorting_enabled: false,
        equity: '1000.00',
        last_equity: '1000.00',
        long_market_value: '0.00',
        short_market_value: '0.00',
        initial_margin: '0.00',
        maintenance_margin: '0.00',
        last_maintenance_margin: '0.00',
        sma: '0.00',
        daytrade_count: 0,
      };

      // Mock successful Alpaca account creation
      mockCreateAlpacaAccount.mockResolvedValue({
        success: true,
        account: mockAlpacaAccount,
        accountId: 'alpaca-oauth-123-2',
      });

      // Mock profile update failure
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({ error: { message: 'Profile update failed' } }))
      }));
      const mockInsert = vi.fn(() => ({ error: null }));
      const mockDelete = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
        insert: mockInsert,
        delete: mockDelete,
      });

      const result = await createOAuthUserAccount(
        mockOAuthUserData,
        mockAdditionalData,
        'paper'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account setup failed');

      // Verify cleanup was attempted
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});