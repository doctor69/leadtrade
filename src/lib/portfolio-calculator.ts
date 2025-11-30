// Portfolio calculation utilities for copy trading
import { logger, LogCategory } from './logger';
import { getAlpacaConfig } from './trading-config';
import { supabase } from './supabase';

export interface PortfolioCalculationResult {
  success: boolean;
  portfolioPercentage?: number;
  tradeValue?: number;
  portfolioValue?: number;
  error?: string;
}

/**
 * Calculate portfolio percentage for a trade
 */
export async function calculatePortfolioPercentage(
  symbol: string,
  quantity: number,
  price: number,
  accessToken: string,
  tradingMode: 'paper' | 'live'
): Promise<PortfolioCalculationResult> {
  try {
    const config = getAlpacaConfig(tradingMode);
    
    // Get current portfolio value
    const accountResponse = await fetch(`${config.brokerBaseUrl}/v2/account`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!accountResponse.ok) {
      return {
        success: false,
        error: 'Failed to fetch account data'
      };
    }

    const accountData = await accountResponse.json();
    const portfolioValue = parseFloat(accountData.portfolio_value || '0');
    
    if (portfolioValue <= 0) {
      return {
        success: false,
        error: 'Invalid portfolio value'
      };
    }

    const tradeValue = quantity * price;
    const portfolioPercentage = (tradeValue / portfolioValue); // Keep as decimal

    return {
      success: true,
      portfolioPercentage,
      tradeValue,
      portfolioValue
    };

  } catch (error) {
    logger.error(LogCategory.PORTFOLIO, 'Error calculating portfolio percentage', {
      error: error instanceof Error ? error : new Error('Unknown error'),
      metadata: { symbol, quantity, price }
    });

    if (error instanceof Error && error.message.includes('timeout')) {
      return {
        success: false,
        error: 'Request timeout'
      };
    }

    return {
      success: false,
      error: 'Failed to fetch account data'
    };
  }
}

export class PortfolioCalculator {
  private async getAccountData(userId: string): Promise<{ portfolioValue: number } | null> {
    try {
      // Get user's actual trading mode from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('trading_mode')
        .eq('id', userId)
        .single();
      
      const tradingMode = profile?.trading_mode || 'paper';
      const config = getAlpacaConfig(tradingMode);
      
      // Get user's encrypted Alpaca credentials
      const { data: credentials } = await supabase
        .from('profiles')
        .select('alpaca_access_token')
        .eq('id', userId)
        .single();
      
      if (!credentials?.alpaca_access_token) {
        return null;
      }
      
      const response = await fetch(`${config.brokerBaseUrl}/v2/account`, {
        headers: {
          'Authorization': `Bearer ${credentials.alpaca_access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        portfolioValue: parseFloat(data.portfolio_value || '0')
      };
    } catch (error) {
      logger.error(LogCategory.PORTFOLIO, 'Error fetching account data', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId }
      });
      return null;
    }
  }

  /**
   * Calculate portfolio percentage for a trade
   */
  async calculatePortfolioPercentage(tradeValue: number, userId: string): Promise<PortfolioCalculationResult> {
    try {
      const accountData = await this.getAccountData(userId);
      
      if (!accountData || !accountData.portfolioValue || accountData.portfolioValue <= 0) {
        return {
          success: false,
          error: 'Invalid portfolio value'
        };
      }

      const percentage = (tradeValue / accountData.portfolioValue); // Keep as decimal
      
      return {
        success: true,
        portfolioPercentage: percentage,
        tradeValue,
        portfolioValue: accountData.portfolioValue
      };
    } catch (error) {
      logger.error(LogCategory.PORTFOLIO, 'Error calculating portfolio percentage', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId, tradeValue }
      });

      if (error instanceof Error && error.message.includes('timeout')) {
        return {
          success: false,
          error: 'Request timeout'
        };
      }

      return {
        success: false,
        error: 'Failed to fetch account data'
      };
    }
  }
}

/**
 * Validate that a trade doesn't exceed reasonable portfolio limits
 */
export function validateTradeSize(
  portfolioPercentage: number,
  maxPercentage: number = 50
): { valid: boolean; reason?: string } {
  if (portfolioPercentage <= 0) {
    return { valid: false, reason: 'Trade percentage must be positive' };
  }

  if (portfolioPercentage > maxPercentage / 100) { // Convert maxPercentage to decimal
    return { 
      valid: false, 
      reason: `Trade exceeds maximum allowed percentage of ${maxPercentage}%` 
    };
  }

  return { valid: true };
}

/**
 * Calculate the proportional trade amount for a follower
 */
export function calculateFollowerTradeAmount(
  leaderPortfolioPercentage: number,
  followerAllocationPercentage: number,
  followerPortfolioValue: number
): {
  allocatedAmount: number;
  proportionalAmount: number;
  tradePercentage: number;
} {
  // Convert percentages to decimals
  const leaderDecimal = leaderPortfolioPercentage / 100;
  const followerDecimal = followerAllocationPercentage / 100;
  
  // Calculate the amount allocated to this leader
  const allocatedAmount = followerPortfolioValue * followerDecimal;
  
  // Calculate the proportional amount based on leader's trade percentage
  const proportionalAmount = allocatedAmount * leaderDecimal;
  
  // Calculate what percentage this represents of the follower's total portfolio
  const tradePercentage = (proportionalAmount / followerPortfolioValue);

  return {
    allocatedAmount,
    proportionalAmount,
    tradePercentage: Math.round(tradePercentage * 10000) / 10000 // Round to 4 decimal places
  };
}

/**
 * Calculate maximum affordable quantity given buying power and price
 */
export function calculateMaxAffordableQuantity(
  buyingPower: number,
  price: number,
  buffer: number = 0.01 // 1% buffer for fees/slippage
): number {
  if (price <= 0 || buyingPower <= 0) {
    return 0;
  }

  const availableAmount = buyingPower * (1 - buffer);
  return Math.floor(availableAmount / price);
}

/**
 * Estimate trade execution cost including potential fees
 */
export function estimateTradeExecutionCost(
  quantity: number,
  price: number,
  side: 'buy' | 'sell',
  tradingMode: 'paper' | 'live' = 'paper'
): {
  baseAmount: number;
  estimatedFees: number;
  totalCost: number;
} {
  const baseAmount = quantity * price;
  
  // Alpaca doesn't charge commission for stock trades, but there might be regulatory fees
  let estimatedFees = 0;
  
  if (tradingMode === 'live') {
    // SEC fees for sells (very small)
    if (side === 'sell') {
      estimatedFees = Math.max(0.02, baseAmount * 0.0000278); // SEC fee rate + 0.02 buffer
    } else {
      // Add small buffer for potential other fees
      estimatedFees = 0.01;
    }
  }

  return {
    baseAmount,
    estimatedFees: Math.round(estimatedFees * 100) / 100,
    totalCost: Math.round((baseAmount + estimatedFees) * 100) / 100
  };
}