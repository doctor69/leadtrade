// Portfolio calculation utilities for copy trading
import { getAlpacaConfig } from './trading-config';

export interface PortfolioCalculationResult {
  portfolioPercentage: number;
  tradeValue: number;
  portfolioValue: number;
  success: boolean;
  error?: string;
}

/**
 * Calculate what percentage of a portfolio a trade represents
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
        portfolioPercentage: 0,
        tradeValue: 0,
        portfolioValue: 0,
        success: false,
        error: 'Failed to fetch account data'
      };
    }

    const accountData = await accountResponse.json();
    const portfolioValue = parseFloat(accountData.portfolio_value || '0');
    
    if (portfolioValue <= 0) {
      return {
        portfolioPercentage: 0,
        tradeValue: 0,
        portfolioValue: 0,
        success: false,
        error: 'Invalid portfolio value'
      };
    }

    const tradeValue = quantity * price;
    const portfolioPercentage = (tradeValue / portfolioValue) * 100;

    return {
      portfolioPercentage: Math.round(portfolioPercentage * 100) / 100, // Round to 2 decimal places
      tradeValue,
      portfolioValue,
      success: true
    };

  } catch (error) {
    console.error('Error calculating portfolio percentage:', error);
    return {
      portfolioPercentage: 0,
      tradeValue: 0,
      portfolioValue: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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

  if (portfolioPercentage > maxPercentage) {
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
  // Calculate the amount allocated to this leader
  const allocatedAmount = (followerPortfolioValue * followerAllocationPercentage) / 100;
  
  // Calculate the proportional amount based on leader's trade percentage
  const proportionalAmount = (allocatedAmount * leaderPortfolioPercentage) / 100;
  
  // Calculate what percentage this represents of the follower's total portfolio
  const tradePercentage = (proportionalAmount / followerPortfolioValue) * 100;

  return {
    allocatedAmount,
    proportionalAmount,
    tradePercentage: Math.round(tradePercentage * 100) / 100
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
      estimatedFees = Math.max(0.01, baseAmount * 0.0000278); // SEC fee rate
    }
    
    // Add small buffer for potential other fees
    estimatedFees += 0.01;
  }

  return {
    baseAmount,
    estimatedFees: Math.round(estimatedFees * 100) / 100,
    totalCost: Math.round((baseAmount + estimatedFees) * 100) / 100
  };
}