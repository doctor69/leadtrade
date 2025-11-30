// Enhanced validation service with comprehensive input validation
import { z } from 'zod';
import { decode } from 'html-entities';
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

  /**
   * Validate option details
   */
  static validateOptionDetails(option: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!option) {
      errors.push('Option details are required for options trades');
      return { isValid: false, errors };
    }

    // Validate strike price
    if (typeof option.strike !== 'number' || option.strike <= 0) {
      errors.push('Strike price must be greater than 0');
    }

    // Validate expiration date
    if (!option.expiration) {
      errors.push('Expiration date is required');
    } else {
      const expiration = new Date(option.expiration);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Compare dates only
      if (isNaN(expiration.getTime())) {
        errors.push('Invalid expiration date format');
      } else if (expiration <= now) {
        errors.push('Expiration date must be in the future');
      }
    }

    // Validate option type
    const optionType = option.optionType || option.option_type;
    if (!optionType || !['call', 'put'].includes(optionType.toLowerCase())) {
      errors.push('Option type must be either "call" or "put"');
    }

    // Optional fields validation with more lenient checks
    if (option.contractSize !== undefined) {
      if (typeof option.contractSize !== 'number' || option.contractSize <= 0) {
        errors.push('Contract size must be a positive number');
      }
    }

    if (option.premium !== undefined) {
      if (typeof option.premium !== 'number' || option.premium < 0) {
        errors.push('Premium cannot be negative');
      }
    }

    if (option.multiplier !== undefined) {
      if (typeof option.multiplier !== 'number' || option.multiplier <= 0) {
        errors.push('Option multiplier must be greater than 0');
      }
    }

    if (option.style !== undefined) {
      if (!['american', 'european'].includes(option.style.toLowerCase())) {
        errors.push('Option style must be either "american" or "european"');
      }
    }

    if (option.underlyingPrice !== undefined) {
      if (typeof option.underlyingPrice !== 'number' || option.underlyingPrice < 0) {
        errors.push('Underlying price cannot be negative');
      }
    }

    // Greeks validation (optional) with more lenient checks
    if (option.delta !== undefined) {
      if (typeof option.delta !== 'number') {
        errors.push('Delta must be a number');
      }
    }

    if (option.gamma !== undefined) {
      if (typeof option.gamma !== 'number') {
        errors.push('Gamma must be a number');
      }
    }

    if (option.theta !== undefined) {
      if (typeof option.theta !== 'number') {
        errors.push('Theta must be a number');
      }
    }

    if (option.vega !== undefined) {
      if (typeof option.vega !== 'number') {
        errors.push('Vega must be a number');
      }
    }

    if (option.impliedVolatility !== undefined) {
      if (typeof option.impliedVolatility !== 'number' || option.impliedVolatility < 0) {
        errors.push('Implied volatility cannot be negative');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate trade execution request
   */
  static validateTradeExecutionRequest(request: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!request.symbol) {
      errors.push('Symbol is required');
    } else if (!/^[A-Z]{1,5}$/.test(request.symbol.trim())) {
      errors.push('Symbol must be 1-5 uppercase letters');
    }

    if (!request.side || !['buy', 'sell'].includes(request.side)) {
      errors.push('Side must be either "buy" or "sell"');
    }

    if (typeof request.quantity !== 'number' || request.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (!request.type || !['market', 'limit', 'stop', 'stop_limit'].includes(request.type)) {
      errors.push('Invalid order type');
    }

    if (!request.time_in_force || !['day', 'gtc', 'ioc', 'fok'].includes(request.time_in_force)) {
      errors.push('Invalid time in force');
    }

    if (!request.trade_type || !['stock', 'option'].includes(request.trade_type)) {
      errors.push('Trade type must be either "stock" or "option"');
    }

    // Validate option details for options trades
    if (request.trade_type === 'option') {
      if (!request.option_details) {
        errors.push('Option details are required for options trades');
      } else {
        const optionValidation = this.validateOptionDetails(request.option_details);
        errors.push(...optionValidation.errors);
      }
    }

    // Validate limit price for limit orders
    if ((request.type === 'limit' || request.type === 'stop_limit') && (typeof request.limit_price !== 'number' || request.limit_price <= 0)) {
      errors.push('Limit price must be a positive number');
    }

    // Validate stop price for stop orders
    if ((request.type === 'stop' || request.type === 'stop_limit') && (typeof request.stop_price !== 'number' || request.stop_price <= 0)) {
      errors.push('Stop price must be a positive number');
    }

    // Validate price if provided
    if (request.price !== undefined && request.price < 0) {
      errors.push('Price cannot be negative');
    }

    // Validate portfolio percentage if provided
    if (request.portfolio_percentage !== undefined) {
      if (request.portfolio_percentage < 0 || request.portfolio_percentage > 100) {
        errors.push('Portfolio percentage must be between 0 and 100');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate trade execution
   */
  static validateTradeExecution(trade: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!trade.symbol || trade.symbol.trim().length === 0) {
      errors.push('Symbol is required');
    } else if (!/^[A-Z]{1,5}$/.test(trade.symbol.trim())) {
      errors.push('Symbol must be 1-5 uppercase letters');
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

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    if (!input) return '';
    
    // Trim whitespace
    let sanitized = input.trim();
    
    // Extract content from script tags before removing them
    const scriptContent = sanitized.match(/<script[^>]*>(.*?)<\/script>/i);
    
    // Remove HTML tags but keep their content
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // If we had script content, combine it with the remaining content
    if (scriptContent && scriptContent[1]) {
      const scriptText = scriptContent[1];
      sanitized = sanitized.replace(scriptText, ''); // Remove duplicate script content
      sanitized = scriptText + sanitized; // Add script content at the beginning
    }
    
    // Decode HTML entities
    sanitized = decode(sanitized);
    
    return sanitized;
  }

  // Sanitize object with string properties
  static sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized = { ...obj };
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        (sanitized as Record<string, unknown>)[key] = this.sanitizeString(value);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        (sanitized as Record<string, unknown>)[key] = this.sanitizeObject(value as Record<string, unknown>);
      }
    }
    return sanitized;
  }

  // Validate and sanitize email
  static sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeString(email).toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    return sanitized;
  }

  // Validate and sanitize username
  static sanitizeUsername(username: string): string {
    const sanitized = this.sanitizeString(username);
    
    // Username should only contain alphanumeric characters, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
    }
    
    if (sanitized.length < 3 || sanitized.length > 30) {
      throw new Error('Username must be between 3 and 30 characters');
    }
    
    return sanitized;
  }

  // Validate and sanitize symbol
  static sanitizeSymbol(symbol: string): string {
    const sanitized = this.sanitizeString(symbol).toUpperCase();
    
    // Stock symbols should only contain letters
    if (!/^[A-Z]{1,5}$/.test(sanitized)) {
      throw new Error('Symbol must be 1-5 uppercase letters');
    }
    
    return sanitized;
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
    // Convert percentages to decimals for calculation
    const leaderDecimal = leaderPortfolioPercentage / 100;
    const followerDecimal = followerAllocationPercentage / 100;
    
    // Calculate proportional amount
    return followerTotalPortfolioValue * leaderDecimal * followerDecimal;
  }

  // Validate proportional trade calculation
  static validateProportionalTrade(
    originalQuantity: number,
    originalPrice: number,
    followerCash: number,
    allocationPercentage: number
  ): { isValid: boolean; maxQuantity?: number; error?: string } {
    // Convert allocation percentage to decimal
    const allocationDecimal = allocationPercentage / 100;
    
    // Calculate total cost
    const totalCost = originalQuantity * originalPrice;
    const allocatedCash = followerCash * allocationDecimal;
    
    if (totalCost > allocatedCash) {
      const maxQuantity = Math.floor(allocatedCash / originalPrice);
      return {
        isValid: false,
        maxQuantity,
        error: `Insufficient allocated funds. Can afford ${maxQuantity} shares instead of ${originalQuantity}`
      };
    }
    
    return { isValid: true, maxQuantity: originalQuantity };
  }
}