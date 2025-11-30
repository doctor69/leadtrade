import { describe, it, expect } from 'vitest';
import { ValidationService } from '../validation';
import type { CopyTradingSubscription, TradeExecution, CopiedTrade } from '../../types/trading';

describe('ValidationService', () => {
  describe('validateAllocationPercentage', () => {
    it('should accept valid allocation percentages', () => {
      expect(ValidationService.validateAllocationPercentage(25.5)).toEqual({ isValid: true });
      expect(ValidationService.validateAllocationPercentage(100)).toEqual({ isValid: true });
      expect(ValidationService.validateAllocationPercentage(0.01)).toEqual({ isValid: true });
    });

    it('should reject zero or negative percentages', () => {
      expect(ValidationService.validateAllocationPercentage(0)).toEqual({
        isValid: false,
        error: 'Allocation percentage must be greater than 0'
      });
      expect(ValidationService.validateAllocationPercentage(-5)).toEqual({
        isValid: false,
        error: 'Allocation percentage must be greater than 0'
      });
    });

    it('should reject percentages over 100', () => {
      expect(ValidationService.validateAllocationPercentage(101)).toEqual({
        isValid: false,
        error: 'Allocation percentage cannot exceed 100%'
      });
    });

    it('should reject percentages with more than 2 decimal places', () => {
      expect(ValidationService.validateAllocationPercentage(25.123)).toEqual({
        isValid: false,
        error: 'Allocation percentage can have at most 2 decimal places'
      });
    });
  });

  describe('validateTotalAllocation', () => {
    const mockSubscriptions: CopyTradingSubscription[] = [
      {
        id: '1',
        follower_id: 'user1',
        leader_id: 'leader1',
        allocation_percentage: 30,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: '2',
        follower_id: 'user1',
        leader_id: 'leader2',
        allocation_percentage: 25,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
    ];

    it('should accept valid total allocation', () => {
      expect(ValidationService.validateTotalAllocation(mockSubscriptions)).toEqual({ isValid: true });
    });

    it('should accept valid total allocation with new allocation', () => {
      expect(ValidationService.validateTotalAllocation(mockSubscriptions, 40)).toEqual({ isValid: true });
    });

    it('should reject total allocation over 100%', () => {
      expect(ValidationService.validateTotalAllocation(mockSubscriptions, 50)).toEqual({
        isValid: false,
        error: 'Total allocation (105.00%) cannot exceed 100%'
      });
    });
  });

  describe('validateTradeExecution', () => {
    const validTrade: Partial<TradeExecution> = {
      symbol: 'AAPL',
      side: 'buy',
      quantity: 100,
      price: 150.50,
      trade_type: 'stock',
      portfolio_percentage: 10
    };

    it('should accept valid trade execution', () => {
      const result = ValidationService.validateTradeExecution(validTrade);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject trade without symbol', () => {
      const trade = { ...validTrade, symbol: '' };
      const result = ValidationService.validateTradeExecution(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Symbol is required');
    });

    it('should reject invalid side', () => {
      const trade = { ...validTrade, side: 'invalid' as any };
      const result = ValidationService.validateTradeExecution(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Side must be either "buy" or "sell"');
    });

    it('should reject zero or negative quantity', () => {
      const trade = { ...validTrade, quantity: 0 };
      const result = ValidationService.validateTradeExecution(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be greater than 0');
    });

    it('should reject invalid symbol format', () => {
      const trade = { ...validTrade, symbol: 'TOOLONG' };
      const result = ValidationService.validateTradeExecution(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Symbol must be 1-5 uppercase letters');
    });

    it('should reject negative price', () => {
      const trade = { ...validTrade, price: -10 };
      const result = ValidationService.validateTradeExecution(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Price cannot be negative');
    });

    it('should reject invalid portfolio percentage', () => {
      const trade = { ...validTrade, portfolio_percentage: 150 };
      const result = ValidationService.validateTradeExecution(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Portfolio percentage must be between 0 and 100');
    });
  });

  describe('validateOptionDetails', () => {
    const validOption = {
      symbol: 'AAPL',
      strike: 150,
      expiration: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      option_type: 'call',
      contractSize: 100,
      premium: 5.50,
      chain: { id: 'chain123' },
      multiplier: 100,
      style: 'american',
      underlyingPrice: 149.50,
      delta: 0.65,
      gamma: 0.03,
      theta: -0.45,
      vega: 0.30,
      impliedVolatility: 0.25,
      openInterest: 1000,
      volume: 500,
      bid: 5.45,
      ask: 5.55
    };

    it('should accept valid option details', () => {
      const result = ValidationService.validateOptionDetails(validOption);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing option details', () => {
      const result = ValidationService.validateOptionDetails(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option details are required for options trades');
    });

    it('should reject invalid strike price', () => {
      const option = { ...validOption, strike: 0 };
      const result = ValidationService.validateOptionDetails(option);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Strike price must be greater than 0');
    });

    it('should reject past expiration date', () => {
      const option = { ...validOption, expiration: '2020-01-01' };
      const result = ValidationService.validateOptionDetails(option);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expiration date must be in the future');
    });

    it('should reject invalid option type', () => {
      const option = { ...validOption, option_type: 'invalid' as any };
      const result = ValidationService.validateOptionDetails(option);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Option type must be either "call" or "put"');
    });
  });

  describe('validateCopiedTrade', () => {
    const validCopiedTrade: Partial<CopiedTrade> = {
      original_trade_id: 'trade-123',
      follower_id: 'user-123',
      symbol: 'AAPL',
      side: 'buy',
      quantity: 10,
      allocated_amount: 1500,
      execution_status: 'pending'
    };

    it('should accept valid copied trade', () => {
      const result = ValidationService.validateCopiedTrade(validCopiedTrade);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const trade = { ...validCopiedTrade, original_trade_id: undefined };
      const result = ValidationService.validateCopiedTrade(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Original trade ID is required');
    });

    it('should reject invalid execution status', () => {
      const trade = { ...validCopiedTrade, execution_status: 'invalid' as any };
      const result = ValidationService.validateCopiedTrade(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Execution status must be one of: pending, filled, partially_filled, cancelled, rejected, failed');
    });

    it('should reject negative allocated amount', () => {
      const trade = { ...validCopiedTrade, allocated_amount: -100 };
      const result = ValidationService.validateCopiedTrade(trade);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Allocated amount cannot be negative');
    });
  });

  describe('validateSubscription', () => {
    const validSubscription: Partial<CopyTradingSubscription> = {
      follower_id: 'user1',
      leader_id: 'leader1',
      allocation_percentage: 25
    };

    it('should accept valid subscription', () => {
      const result = ValidationService.validateSubscription(validSubscription);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject self-following', () => {
      const subscription = { ...validSubscription, leader_id: 'user1' };
      const result = ValidationService.validateSubscription(subscription);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Users cannot follow themselves');
    });

    it('should reject missing required fields', () => {
      const subscription = { ...validSubscription, follower_id: undefined };
      const result = ValidationService.validateSubscription(subscription);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Follower ID is required');
    });
  });

  describe('utility functions', () => {
    it('should sanitize string inputs', () => {
      expect(ValidationService.sanitizeString('  <script>alert("xss")</script>  ')).toBe('alert("xss")');
      expect(ValidationService.sanitizeString('normal text')).toBe('normal text');
    });

    it('should validate UUID format', () => {
      expect(ValidationService.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(ValidationService.isValidUUID('invalid-uuid')).toBe(false);
      expect(ValidationService.isValidUUID('')).toBe(false);
    });

    it('should calculate proportional amount correctly', () => {
      const result = ValidationService.calculateProportionalAmount(10, 50, 10000);
      expect(result).toBe(500); // 10% of 50% of $10,000 = $500
    });

    it('should validate proportional trade calculations', () => {
      const result = ValidationService.validateProportionalTrade(100, 10, 5000, 50);
      expect(result.isValid).toBe(true);

      const insufficientResult = ValidationService.validateProportionalTrade(100, 10, 500, 50);
      expect(insufficientResult.isValid).toBe(false);
      expect(insufficientResult.maxQuantity).toBe(25); // $250 / $10 = 25 shares
    });
  });
});