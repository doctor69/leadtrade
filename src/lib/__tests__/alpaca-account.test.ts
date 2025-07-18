import { describe, it, expect, vi } from 'vitest';
import { createAlpacaAccount, type AlpacaAccountData } from '../alpaca-account';

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