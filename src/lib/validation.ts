// Data validation utilities for copy trading system
import type { 
  CopyTradingSubscription, 
  TradeExecution, 
  CopiedTrade, 
  TradeExecutionRequest,
  OptionDetails 
} from '../types/trading';

export class ValidationService {
  // Validate allocation percentage
  static validateAllocationPercentage(percentage: number): { isValid: boolean; error?: string } {
    if (percentage <= 0) {
      return { isValid: false, error: 'Allocation percentage must be greater than 0' };
    }
    
    if (percentage > 100) {
      return { isValid: false, error: 'Allocation percentage cannot exceed 100%' };
    }
    
    // Check for reasonable precision (2 decimal places)
    if (Math.round(percentage * 100) !== percentage * 100) {
      return { isValid: false, error: 'Allocation percentage can have at most 2 decimal places' };
    }
    
    return { isValid: true };
  }

  // Validate total allocation for a follower
  static validateTotalAllocation(subscriptions: CopyTradingSubscription[], newAllocation?: number): { isValid: boolean; error?: string } {
    const total = subscriptions.reduce((sum, sub) => sum + sub.allocation_percentage, 0);
    const finalTotal = newAllocation ? total + newAllocation : total;
    
    if (finalTotal > 100) {
      return { 
        isValid: false, 
        error: `Total allocation (${finalTotal.toFixed(2)}%) cannot exceed 100%` 
      };
    }
    
    return { isValid: true };
  }

  // Validate trade execution data
  static validateTradeExecution(trade: Partial<TradeExecution>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!trade.symbol || trade.symbol.trim().length === 0) {
      errors.push('Symbol is required');
    }

    if (!trade.side || !['buy', 'sell'].includes(trade.side)) {
      errors.push('Side must be either "buy" or "sell"');
    }

    if (!trade.quantity || trade.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (!trade.trade_type || !['stock', 'option'].includes(trade.trade_type)) {
      errors.push('Trade type must be either "stock" or "option"');
    }

    // Validate symbol format (basic check)
    if (trade.symbol && !/^[A-Z]{1,5}$/.test(trade.symbol.trim())) {
      errors.push('Symbol must be 1-5 uppercase letters');
    }

    // Validate price if provided
    if (trade.price !== undefined && trade.price < 0) {
      errors.push('Price cannot be negative');
    }

    // Validate portfolio percentage if provided
    if (trade.portfolio_percentage !== undefined) {
      if (trade.portfolio_percentage < 0 || trade.portfolio_percentage > 100) {
        errors.push('Portfolio percentage must be between 0 and 100');
      }
    }

    // Validate options details if it's an options trade
    if (trade.trade_type === 'option') {
      const optionValidation = this.validateOptionDetails(trade.option_details);
      if (!optionValidation.isValid) {
        errors.push(...optionValidation.errors);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate option details
  static validateOptionDetails(optionDetails?: OptionDetails): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!optionDetails) {
      errors.push('Option details are required for options trades');
      return { isValid: false, errors };
    }

    // Validate strike price
    if (!optionDetails.strike || optionDetails.strike <= 0) {
      errors.push('Strike price must be greater than 0');
    }

    // Validate expiration date
    if (!optionDetails.expiration) {
      errors.push('Expiration date is required');
    } else {
      const expirationDate = new Date(optionDetails.expiration);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(expirationDate.getTime())) {
        errors.push('Invalid expiration date format');
      } else if (expirationDate <= today) {
        errors.push('Expiration date must be in the future');
      }
    }

    // Validate option type
    if (!optionDetails.option_type || !['call', 'put'].includes(optionDetails.option_type)) {
      errors.push('Option type must be either "call" or "put"');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate trade execution request
  static validateTradeExecutionRequest(request: TradeExecutionRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic trade validation
    const basicValidation = this.validateTradeExecution(request);
    errors.push(...basicValidation.errors);

    // Validate order type
    if (!request.type || !['market', 'limit', 'stop', 'stop_limit'].includes(request.type)) {
      errors.push('Order type must be one of: market, limit, stop, stop_limit');
    }

    // Validate time in force
    if (!request.time_in_force || !['day', 'gtc', 'ioc', 'fok'].includes(request.time_in_force)) {
      errors.push('Time in force must be one of: day, gtc, ioc, fok');
    }

    // Validate limit price for limit orders
    if (['limit', 'stop_limit'].includes(request.type) && (!request.limit_price || request.limit_price <= 0)) {
      errors.push('Limit price is required and must be greater than 0 for limit orders');
    }

    // Validate stop price for stop orders
    if (['stop', 'stop_limit'].includes(request.type) && (!request.stop_price || request.stop_price <= 0)) {
      errors.push('Stop price is required and must be greater than 0 for stop orders');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate copied trade data
  static validateCopiedTrade(copiedTrade: Partial<CopiedTrade>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!copiedTrade.original_trade_id) {
      errors.push('Original trade ID is required');
    }

    if (!copiedTrade.follower_id) {
      errors.push('Follower ID is required');
    }

    if (!copiedTrade.symbol || copiedTrade.symbol.trim().length === 0) {
      errors.push('Symbol is required');
    }

    if (!copiedTrade.side || !['buy', 'sell'].includes(copiedTrade.side)) {
      errors.push('Side must be either "buy" or "sell"');
    }

    if (!copiedTrade.quantity || copiedTrade.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    // Validate execution status
    const validStatuses = ['pending', 'filled', 'partially_filled', 'cancelled', 'rejected', 'failed'];
    if (copiedTrade.execution_status && !validStatuses.includes(copiedTrade.execution_status)) {
      errors.push(`Execution status must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate allocated amount if provided
    if (copiedTrade.allocated_amount !== undefined && copiedTrade.allocated_amount < 0) {
      errors.push('Allocated amount cannot be negative');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate subscription data
  static validateSubscription(subscription: Partial<CopyTradingSubscription>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!subscription.follower_id) {
      errors.push('Follower ID is required');
    }

    if (!subscription.leader_id) {
      errors.push('Leader ID is required');
    }

    // Prevent self-following
    if (subscription.follower_id === subscription.leader_id) {
      errors.push('Users cannot follow themselves');
    }

    // Validate allocation percentage
    if (subscription.allocation_percentage !== undefined) {
      const allocationValidation = this.validateAllocationPercentage(subscription.allocation_percentage);
      if (!allocationValidation.isValid) {
        errors.push(allocationValidation.error!);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // Sanitize string inputs
  static sanitizeString(input: string): string {
    return input.trim().replace(/<[^>]*>/g, '');
  }

  // Validate UUID format
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Calculate proportional trade amount
  static calculateProportionalAmount(
    leaderPortfolioPercentage: number,
    followerAllocationPercentage: number,
    followerTotalPortfolioValue: number
  ): number {
    return (leaderPortfolioPercentage / 100) * (followerAllocationPercentage / 100) * followerTotalPortfolioValue;
  }

  // Validate proportional trade calculation
  static validateProportionalTrade(
    originalQuantity: number,
    originalPrice: number,
    followerCash: number,
    allocationPercentage: number
  ): { isValid: boolean; maxQuantity?: number; error?: string } {
    const totalCost = originalQuantity * originalPrice;
    const allocatedCash = (allocationPercentage / 100) * followerCash;
    
    if (allocatedCash < totalCost) {
      const maxQuantity = Math.floor(allocatedCash / originalPrice);
      return {
        isValid: false,
        maxQuantity,
        error: `Insufficient allocated funds. Can afford ${maxQuantity} shares instead of ${originalQuantity}`
      };
    }
    
    return { isValid: true };
  }
}