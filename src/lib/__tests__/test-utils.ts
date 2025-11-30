// Test utilities and mock data for comprehensive testing
import { vi } from 'vitest';
import type {
  CopyTradingSubscription,
  TradeExecution,
  CopiedTrade,
  UserProfile
} from '../../types/trading';

// Mock data generators
export const createMockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-123',
  alpaca_access_token: 'mock-token',
  trading_mode: 'paper',
  share_trades: false,
  show_asset_amounts: false,
  theme_color: '#000000',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

export const createMockSubscription = (overrides: Partial<CopyTradingSubscription> = {}): CopyTradingSubscription => ({
  id: 'sub-123',
  follower_id: 'follower-123',
  leader_id: 'leader-123',
  allocation_percentage: 25,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

export const createMockTradeExecution = (overrides: Partial<TradeExecution> = {}): TradeExecution => ({
  id: 'trade-123',
  original_trade_id: 'order-123',
  leader_id: 'leader-123',
  symbol: 'AAPL',
  side: 'buy',
  quantity: 100,
  price: 150.00,
  trade_type: 'stock',
  portfolio_percentage: 10,
  executed_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

export const createMockCopiedTrade = (overrides: Partial<CopiedTrade> = {}): CopiedTrade => ({
  id: 'copied-123',
  original_trade_id: 'trade-123',
  follower_id: 'follower-123',
  alpaca_order_id: 'alpaca-order-123',
  symbol: 'AAPL',
  side: 'buy',
  quantity: 10,
  allocated_amount: 1500,
  execution_status: 'pending',
  executed_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

// Mock API responses
export const createMockAlpacaAccountResponse = (overrides: Record<string, any> = {}) => ({
  portfolio_value: '10000.00',
  buying_power: '5000.00',
  cash: '2500.00',
  equity: '10000.00',
  ...overrides
});

export const createMockAlpacaOrderResponse = (overrides: Record<string, any> = {}) => ({
  id: 'alpaca-order-123',
  status: 'accepted',
  symbol: 'AAPL',
  qty: '10',
  side: 'buy',
  order_type: 'market',
  time_in_force: 'day',
  ...overrides
});

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    from: vi.fn(() => mockChain)
  };

  return {
    from: vi.fn(() => mockChain),
    auth: {
      getUser: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    rpc: vi.fn()
  };
};

// Mock fetch responses
export const createMockFetchResponse = (data: any, options: { ok?: boolean; status?: number } = {}) => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data))
});

// Test scenarios
export const testScenarios = {
  // User with multiple subscriptions
  multipleSubscriptions: [
    createMockSubscription({
      id: 'sub-1',
      leader_id: 'leader-1',
      allocation_percentage: 30
    }),
    createMockSubscription({
      id: 'sub-2',
      leader_id: 'leader-2',
      allocation_percentage: 25
    }),
    createMockSubscription({
      id: 'sub-3',
      leader_id: 'leader-3',
      allocation_percentage: 20,
      is_active: false
    })
  ],

  // High-value trade scenario
  highValueTrade: createMockTradeExecution({
    symbol: 'TSLA',
    quantity: 50,
    price: 800.00,
    portfolio_percentage: 25
  }),

  // Options trade scenario
  optionsTrade: createMockTradeExecution({
    symbol: 'SPY',
    trade_type: 'option',
    quantity: 10,
    price: 5.50,
    portfolio_percentage: 5,
    option_details: {
      strike: 450,
      expiration: '2025-12-31',
      option_type: 'call'
    }
  }),

  // Low buying power scenario
  lowBuyingPower: createMockAlpacaAccountResponse({
    portfolio_value: '1000.00',
    buying_power: '200.00',
    cash: '200.00'
  }),

  // Paper trading user
  paperTradingUser: createMockUserProfile({
    trading_mode: 'paper',
    share_trades: true,
    show_asset_amounts: true
  }),

  // Live trading user
  liveTradingUser: createMockUserProfile({
    trading_mode: 'live',
    share_trades: true,
    show_asset_amounts: false
  })
};

// Error scenarios
export const errorScenarios = {
  networkError: new Error('Network request failed'),
  authError: new Error('Authentication failed'),
  validationError: new Error('Validation failed'),
  databaseError: new Error('Database operation failed'),
  alpacaApiError: new Error('Alpaca API error'),
  insufficientFunds: new Error('Insufficient buying power'),
  rateLimitError: new Error('Rate limit exceeded')
};

// Helper functions for test setup
export const setupMockEnvironment = () => {
  // Mock global fetch
  global.fetch = vi.fn();

  // Mock console methods to reduce test noise
  vi.spyOn(console, 'log').mockImplementation(() => { });
  vi.spyOn(console, 'error').mockImplementation(() => { });
  vi.spyOn(console, 'warn').mockImplementation(() => { });
};

export const resetMockEnvironment = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

// Assertion helpers
export const expectSuccessfulResult = (result: any) => {
  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.error).toBeUndefined();
};

export const expectFailedResult = (result: any, expectedError?: string) => {
  expect(result).toBeDefined();
  expect(result.success).toBe(false);
  if (expectedError) {
    expect(result.error).toContain(expectedError);
  }
};

export const expectValidSubscription = (subscription: CopyTradingSubscription) => {
  expect(subscription.id).toBeDefined();
  expect(subscription.follower_id).toBeDefined();
  expect(subscription.leader_id).toBeDefined();
  expect(subscription.allocation_percentage).toBeGreaterThan(0);
  expect(subscription.allocation_percentage).toBeLessThanOrEqual(100);
  expect(typeof subscription.is_active).toBe('boolean');
};

export const expectValidTradeExecution = (trade: TradeExecution) => {
  expect(trade.id).toBeDefined();
  expect(trade.symbol).toMatch(/^[A-Z]{1,5}$/);
  expect(['buy', 'sell']).toContain(trade.side);
  expect(trade.quantity).toBeGreaterThan(0);
  expect(['stock', 'option']).toContain(trade.trade_type);
};

export const expectValidCopiedTrade = (copiedTrade: CopiedTrade) => {
  expect(copiedTrade.id).toBeDefined();
  expect(copiedTrade.original_trade_id).toBeDefined();
  expect(copiedTrade.follower_id).toBeDefined();
  expect(copiedTrade.symbol).toMatch(/^[A-Z]{1,5}$/);
  expect(['buy', 'sell']).toContain(copiedTrade.side);
  expect(copiedTrade.quantity).toBeGreaterThanOrEqual(0);
  expect(['pending', 'filled', 'partially_filled', 'cancelled', 'rejected', 'failed'])
    .toContain(copiedTrade.execution_status);
};

// Performance testing helpers
export const measureExecutionTime = async (fn: () => Promise<any>): Promise<{ result: any; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

export const expectReasonableExecutionTime = (duration: number, maxMs: number = 1000) => {
  expect(duration).toBeLessThan(maxMs);
};