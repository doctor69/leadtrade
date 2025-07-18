// Tests for database service and data models
import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationService } from '../validation';
import type { 
  CopyTradingSubscription, 
  TradeExecution, 
  CopiedTrade, 
  TradeExecutionRequest,
  OptionDetails 
} from '../../types/trading';

describe('ValidationService', () => {
  describe('validateAllocationPercentage', () => {
    it('should validate correct allocation percentages', () => {
      expect(ValidationService.validateAllocationPercentage(50.5).isValid).toBe(true);
      expect(ValidationService.validateAllocationPercentage(100).isValid).toBe(true);
      expect(ValidationService.validateAllocationPercentage(0.01).isValid).toBe(true);
    });

    it('should reject invalid allocation percentages', () => {
      expect(ValidationService.validateAllocationPercentage(0).isValid).toBe(false);
      expect(ValidationService.validateAllocationPercentage(-10).isValid).toBe(false);
      expect(ValidationService.validateAllocationPercentage(101).isValid).toBe(false);
      expect(ValidationService.validateAllocationPercentage(50.555).isValid).toBe(false);
    });
  });

  describe('validateTotalAllocation', () => {
    it('should validate total allocation under 100%', () => {
      const subscriptions: CopyTradingSubscription[] = [
        {
          id: '1',
          follower_id: 'user1',
          leader_id: 'leader1',
          allocation_percentage: 60,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        {
          id: '2',
          follower_id: 'user1',
          leader_id: 'leader2',
          allocation_percentage: 30,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        }
      ];

      expect(ValidationService.validateTotalAllocation(subscriptions, 10).isValid).toBe(true);
      expect(ValidationService.validateTotalAllocation(subscriptions, 11).isValid).toBe(false);
    });
  });

  describe('validateTradeExecution', () => {
    it('should validate correct trade execution', () => {
      const trade: Partial<TradeExecution> = {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        price: 150.25,
        trade_type: 'stock',
        portfolio_percentage: 5.5
      };

      const result = ValidationService.validateTradeExecution(trade);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid trade execution', () => {
      const trade: Partial<TradeExecution> = {
        symbol: '',
        side: 'invalid' as any,
        quantity: -10,
        trade_type: 'invalid' as any
      };

      const result = ValidationService.validateTradeExecution(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateOptionDetails', () => {
    it('should validate correct option details', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      const optionDetails: OptionDetails = {
        strike: 155,
        expiration: futureDate.toISOString().split('T')[0],
        option_type: 'call'
      };

      const result = ValidationService.validateOptionDetails(optionDetails);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid option details', () => {
      const optionDetails: OptionDetails = {
        strike: -155,
        expiration: '2020-01-01', // Past date
        option_type: 'invalid' as any
      };

      const result = ValidationService.validateOptionDetails(optionDetails);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateTradeExecutionRequest', () => {
    it('should validate correct trade execution request', () => {
      const request: TradeExecutionRequest = {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        type: 'limit',
        time_in_force: 'day',
        limit_price: 150.00,
        trade_type: 'stock'
      };

      const result = ValidationService.validateTradeExecutionRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require limit price for limit orders', () => {
      const request: TradeExecutionRequest = {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        type: 'limit',
        time_in_force: 'day',
        trade_type: 'stock'
        // Missing limit_price
      };

      const result = ValidationService.validateTradeExecutionRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Limit price'))).toBe(true);
    });
  });

  describe('validateCopiedTrade', () => {
    it('should validate correct copied trade', () => {
      const copiedTrade: Partial<CopiedTrade> = {
        original_trade_id: 'trade123',
        follower_id: 'user123',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 5,
        execution_status: 'filled',
        allocated_amount: 750.00
      };

      const result = ValidationService.validateCopiedTrade(copiedTrade);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSubscription', () => {
    it('should validate correct subscription', () => {
      const subscription: Partial<CopyTradingSubscription> = {
        follower_id: 'user1',
        leader_id: 'user2',
        allocation_percentage: 50
      };

      const result = ValidationService.validateSubscription(subscription);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should prevent self-following', () => {
      const subscription: Partial<CopyTradingSubscription> = {
        follower_id: 'user1',
        leader_id: 'user1',
        allocation_percentage: 50
      };

      const result = ValidationService.validateSubscription(subscription);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('cannot follow themselves'))).toBe(true);
    });
  });

  describe('calculateProportionalAmount', () => {
    it('should calculate proportional amounts correctly', () => {
      const result = ValidationService.calculateProportionalAmount(10, 50, 10000);
      expect(result).toBe(500); // 10% of 50% of $10,000 = $500
    });
  });

  describe('validateProportionalTrade', () => {
    it('should validate sufficient funds', () => {
      const result = ValidationService.validateProportionalTrade(10, 100, 10000, 50);
      expect(result.isValid).toBe(true);
    });

    it('should detect insufficient funds', () => {
      const result = ValidationService.validateProportionalTrade(10, 100, 1000, 50);
      expect(result.isValid).toBe(false);
      expect(result.maxQuantity).toBe(5); // Can afford 5 shares at $100 each with $500 allocated
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(ValidationService.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(ValidationService.isValidUUID('invalid-uuid')).toBe(false);
      expect(ValidationService.isValidUUID('')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize strings correctly', () => {
      expect(ValidationService.sanitizeString('  <script>alert("xss")</script>  ')).toBe('alert("xss")');
      expect(ValidationService.sanitizeString('Normal text')).toBe('Normal text');
    });
  });
});

// Mock data for testing
export const mockUserProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'test_user',
  full_name: 'Test User',
  is_paper_trading: true,
  share_trades: true,
  show_asset_amounts: false,
  theme_color: '#ef4444',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

export const mockTradeExecution = {
  id: 'trade123',
  original_trade_id: 'alpaca_order_001',
  leader_id: '11111111-1111-1111-1111-111111111111',
  symbol: 'AAPL',
  side: 'buy' as const,
  quantity: 10,
  price: 150.25,
  trade_type: 'stock' as const,
  portfolio_percentage: 5.0,
  executed_at: '2024-01-01T12:00:00Z',
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-01-01T12:00:00Z'
};

export const mockCopyTradingSubscription = {
  id: 'sub123',
  follower_id: '22222222-2222-2222-2222-222222222222',
  leader_id: '11111111-1111-1111-1111-111111111111',
  allocation_percentage: 60,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};