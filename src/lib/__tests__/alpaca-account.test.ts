import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createAlpacaAccount, 
  updateAlpacaAccount,
  closeAlpacaAccount,
  requestOptionsApproval,
  getAlpacaAccounts,
  getAccountActivities,
  type AlpacaAccountData,
  type AccountUpdateRequest 
} from '../alpaca-account';

// Mock the trading config
vi.mock('../trading-config', () => ({
  getAlpacaConfig: vi.fn(() => ({
    brokerBaseUrl: 'https://broker-api.sandbox.alpaca.markets/v1',
    brokerApiKey: 'test-key',
    brokerApiSecret: 'test-secret',
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Alpaca Account Creation', () => {
  const mockAccountData: AlpacaAccountData = {
    given_name: 'John',
    family_name: 'Doe',
    date_of_birth: '1990-01-01',
    tax_id: '123456789',
    tax_id_type: 'USA_SSN',
    phone_number: '5551234567',
    email_address: 'john.doe@example.com',
    street_address: ['123 Main St'],
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    country: 'USA',
    annual_income_min: '50000',
    annual_income_max: '75000',
    total_net_worth_min: '50000',
    total_net_worth_max: '75000',
    liquid_net_worth_min: '25000',
    liquid_net_worth_max: '50000',
    investment_experience_with_stocks: 'limited',
    investment_objective: 'growth',
    risk_tolerance: 'moderate',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create Alpaca account successfully', async () => {
    const mockResponse = {
      id: 'test-account-id',
      account_number: '123456789',
      status: 'ACTIVE',
      currency: 'USD',
      buying_power: '0',
      regt_buying_power: '0',
      daytrading_buying_power: '0',
      non_marginable_buying_power: '0',
      cash: '0',
      accrued_fees: '0',
      pending_transfer_out: '0',
      pending_transfer_in: '0',
      portfolio_value: '0',
      pattern_day_trader: false,
      trading_blocked: false,
      transfers_blocked: false,
      account_blocked: false,
      created_at: '2024-01-01T00:00:00Z',
      trade_suspended_by_user: false,
      multiplier: '1',
      shorting_enabled: false,
      equity: '0',
      last_equity: '0',
      long_market_value: '0',
      short_market_value: '0',
      initial_margin: '0',
      maintenance_margin: '0',
      last_maintenance_margin: '0',
      sma: '0',
      daytrade_count: 0,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await createAlpacaAccount(mockAccountData, 'paper');

    expect(result.success).toBe(true);
    expect(result.account).toEqual(mockResponse);
    expect(result.accountId).toBe('test-account-id');
  });

  it('should handle Alpaca account creation failure', async () => {
    const errorMessage = 'Invalid account data';
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ message: errorMessage }),
    });

    const result = await createAlpacaAccount(mockAccountData, 'paper');

    expect(result.success).toBe(false);
    expect(result.error).toBe(errorMessage);
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const result = await createAlpacaAccount(mockAccountData, 'paper');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should use correct API endpoint for paper trading', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'test-id', account_number: '123' }),
    });

    await createAlpacaAccount(mockAccountData, 'paper');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://broker-api.sandbox.alpaca.markets/v1/accounts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'APCA-API-KEY-ID': 'test-key',
          'APCA-API-SECRET-KEY': 'test-secret',
        }),
      })
    );
  });
});


describe('Account Management Enhancements', () => {
  const mockAccountId = 'test-account-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateAlpacaAccount', () => {
    it('should update account contact information', async () => {
      const updates: AccountUpdateRequest = {
        contact: {
          email_address: 'newemail@example.com',
          phone_number: '5559876543',
        },
      };

      const mockResponse = {
        id: mockAccountId,
        account_number: '123456789',
        status: 'ACTIVE',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await updateAlpacaAccount(mockAccountId, updates, 'paper');

      expect(result.success).toBe(true);
      expect(result.account).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `https://broker-api.sandbox.alpaca.markets/v1/accounts/${mockAccountId}`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates),
        })
      );
    });

    it('should handle update failure', async () => {
      const updates: AccountUpdateRequest = {
        contact: { email_address: 'invalid' },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ message: 'Invalid email format' }),
      });

      const result = await updateAlpacaAccount(mockAccountId, updates, 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });
  });

  describe('closeAlpacaAccount', () => {
    it('should close account successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await closeAlpacaAccount(mockAccountId, 'paper');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `https://broker-api.sandbox.alpaca.markets/v1/accounts/${mockAccountId}`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle closure failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({ message: 'Account has open positions' }),
      });

      const result = await closeAlpacaAccount(mockAccountId, 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account has open positions');
    });
  });

  describe('requestOptionsApproval', () => {
    it('should request options approval successfully', async () => {
      const level = 2;
      const mockResponse = {
        status: 'pending',
        level: 2,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await requestOptionsApproval(mockAccountId, level, 'paper');

      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
      expect(result.level).toBe(2);
      expect(global.fetch).toHaveBeenCalledWith(
        `https://broker-api.sandbox.alpaca.markets/v1/accounts/${mockAccountId}/options_approval`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ level }),
        })
      );
    });

    it('should validate options approval level', async () => {
      const result = await requestOptionsApproval(mockAccountId, 5, 'paper');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Options approval level must be between 0 and 3');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('getAlpacaAccounts', () => {
    it('should retrieve all accounts with filtering', async () => {
      const mockAccounts = [
        { id: 'account-1', status: 'ACTIVE' },
        { id: 'account-2', status: 'ACTIVE' },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccounts,
      });

      const result = await getAlpacaAccounts(
        { status: 'ACTIVE', sort: 'created_at' },
        'paper'
      );

      expect(result.success).toBe(true);
      expect(result.accounts).toEqual(mockAccounts);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=ACTIVE'),
        expect.any(Object)
      );
    });
  });

  describe('getAccountActivities', () => {
    it('should retrieve account activities with pagination', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          account_id: mockAccountId,
          activity_type: 'FILL',
          date: '2024-01-01',
          net_amount: '100.00',
          description: 'Buy AAPL',
          status: 'executed',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockActivities,
      });

      const result = await getAccountActivities(
        mockAccountId,
        { activity_types: 'FILL', page_size: 10 },
        'paper'
      );

      expect(result.success).toBe(true);
      expect(result.activities).toEqual(mockActivities);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('activity_types=FILL'),
        expect.any(Object)
      );
    });
  });
});
