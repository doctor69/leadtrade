import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock all dependencies
const mockCreateAlpacaAccount = vi.fn();
const mockExecuteAccountRollback = vi.fn();
const mockPreSignupValidation = vi.fn();
const mockPostSignupValidation = vi.fn();

const mockSupabaseClient = {
  auth: {
    signUp: vi.fn(),
    getUser: vi.fn()
  },
  from: vi.fn()
};

const mockFrom = {
  insert: vi.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null }),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null }),
  single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
};

vi.mock('../alpaca-account', () => ({
  createAlpacaAccount: mockCreateAlpacaAccount
}));

vi.mock('../account-rollback', () => ({
  executeAccountRollback: mockExecuteAccountRollback
}));

vi.mock('../signup-validation', () => ({
  preSignupValidation: mockPreSignupValidation,
  postSignupValidation: mockPostSignupValidation
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('../encryption', () => ({
  encryptToken: vi.fn().mockResolvedValue('encrypted-token'),
  hashUserData: vi.fn().mockResolvedValue('hashed-data')
}));

describe('Enhanced Signup Service with Rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.from.mockReturnValue(mockFrom);
    mockFrom.insert.mockResolvedValue({ error: null });
    mockFrom.update.mockResolvedValue({ error: null });
    
    // Default successful validations
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
    
    mockExecuteAccountRollback.mockResolvedValue({
      success: true,
      context: { rollbackSteps: [] }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Pre-signup validation', () => {
    it('should block signup if pre-validation fails', async () => {
      mockPreSignupValidation.mockResolvedValue({
        canProceed: false,
        blockingIssues: ['System not ready'],
        warnings: []
      });

      const { createUserAccount } = await import('../signup-service');
      
      const result = await createUserAccount({
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
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('System not ready for account creation');
      expect(result.validationErrors).toContain('System not ready');
      
      // Should not attempt Alpaca account creation
      expect(mockCreateAlpacaAccount).not.toHaveBeenCalled();
    });

    it('should proceed with warnings but log them', async () => {
      mockPreSignupValidation.mockResolvedValue({
        canProceed: true,
        blockingIssues: [],
        warnings: ['Rollback system not available']
      });

      mockCreateAlpacaAccount.mockResolvedValue({
        success: true,
        account: { id: 'alpaca-123', account_number: 'ACC123', status: 'ACTIVE' },
        accountId: 'alpaca-123'
      });

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123', email_confirmed_at: null } },
        error: null
      });

      const { createUserAccount } = await import('../signup-service');
      
      const result = await createUserAccount({
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
      });

      expect(result.success).toBe(true);
      expect(mockCreateAlpacaAccount).toHaveBeenCalled();
    });
  });

  describe('Alpaca account creation failure rollback', () => {
    it('should execute rollback when Supabase creation fails after Alpaca success', async () => {
      mockCreateAlpacaAccount.mockResolvedValue({
        success: true,
        account: { id: 'alpaca-123', account_number: 'ACC123', status: 'ACTIVE' },
        accountId: 'alpaca-123'
      });

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' }
      });

      const { createUserAccount } = await import('../signup-service');
      
      const result = await createUserAccount({
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
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email already exists');
      
      // Should execute rollback for orphaned Alpaca account
      expect(mockExecuteAccountRollback).toHaveBeenCalledWith(
        undefined, // No Supabase user ID
        'alpaca-123',
        expect.stringContaining('Supabase account creation failed')
      );
    });

    it('should not create Supabase account if Alpaca creation fails', async () => {
      mockCreateAlpacaAccount.mockResolvedValue({
        success: false,
        error: 'Invalid account data'
      });

      const { createUserAccount } = await import('../signup-service');
      
      const result = await createUserAccount({
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
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Trading account creation failed');
      
      // Should not attempt Supabase creation
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
      
      // Should not execute rollback since no accounts were created
      expect(mockExecuteAccountRollback).not.toHaveBeenCalled();
    });
  });

  describe('Post-signup validation and rollback', () => {
    it('should execute rollback if post-validation fails', async () => {
      mockCreateAlpacaAccount.mockResolvedValue({
        success: true,
        account: { id: 'alpaca-123', account_number: 'ACC123', status: 'ACTIVE' },
        accountId: 'alpaca-123'
      });

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123', email_confirmed_at: null } },
        error: null
      });

      mockPostSignupValidation.mockResolvedValue({
        isValid: false,
        issues: ['Profile not created properly'],
        requiresRollback: true
      });

      const { createUserAccount } = await import('../signup-service');
      
      const result = await createUserAccount({
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
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account creation validation failed');
      expect(result.validationErrors).toContain('Profile not created properly');
      
      // Should execute rollback due to validation failure
      expect(mockExecuteAccountRollback).toHaveBeenCalledWith(
        'user-123',
        'alpaca-123',
        expect.stringContaining('Post-signup validation failed')
      );
    });

    it('should succeed if post-validation passes', async () => {
      mockCreateAlpacaAccount.mockResolvedValue({
        success: true,
        account: { id: 'alpaca-123', account_number: 'ACC123', status: 'ACTIVE' },
        accountId: 'alpaca-123'
      });

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123', email_confirmed_at: null } },
        error: null
      });

      mockPostSignupValidation.mockResolvedValue({
        isValid: true,
        issues: [],
        requiresRollback: false
      });

      const { createUserAccount } = await import('../signup-service');
      
      const result = await createUserAccount({
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
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.alpacaAccountId).toBe('alpaca-123');
      
      // Should not execute rollback for successful creation
      expect(mockExecuteAccountRollback).not.toHaveBeenCalled();
    });
  });

  describe('Account linking failure rollback', () => {
    it('should execute comprehensive rollback when account linking fails', async () => {
      mockCreateAlpacaAccount.mockResolvedValue({
        success: true,
        account: { id: 'alpaca-123', account_number: 'ACC123', status: 'ACTIVE' },
        accountId: 'alpaca-123'
      });

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123', email_confirmed_at: null } },
        error: null
      });

      // Mock linking failure
      mockFrom.insert.mockRejectedValue(new Error('Database connection failed'));

      const { createUserAccount } = await import('../signup-service');
      
      const result = await createUserAccount({
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
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account setup failed');
      
      // Should execute comprehensive rollback for both accounts
      expect(mockExecuteAccountRollback).toHaveBeenCalledWith(
        'user-123',
        'alpaca-123',
        expect.stringContaining('Account linking failed')
      );
    });
  });

  describe('Rollback failure handling', () => {
    it('should handle rollback failures gracefully', async () => {
      mockCreateAlpacaAccount.mockResolvedValue({
        success: true,
        account: { id: 'alpaca-123', account_number: 'ACC123', status: 'ACTIVE' },
        accountId: 'alpaca-123'
      });

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' }
      });

      // Mock rollback failure
      mockExecuteAccountRollback.mockRejectedValue(new Error('Rollback system unavailable'));

      const { createUserAccount } = await import('../signup-service');
      
      const result = await createUserAccount({
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
      });

      // Should still return failure for the original issue
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email already exists');
      
      // Should have attempted rollback
      expect(mockExecuteAccountRollback).toHaveBeenCalled();
    });
  });
});