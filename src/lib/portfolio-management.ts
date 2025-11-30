// Advanced Portfolio Management Service
import { DatabaseService } from './database';
import { getUserTradingMode, getAlpacaConfig } from './trading-config';
import { logger, LogCategory } from './logger';
import { errorHandler, ErrorCode } from './error-handler';
import { SecurityService } from './security-config';
import type { TradeExecution, CopiedTrade } from '../types/trading';

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  allocation: number; // Percentage of total portfolio
}

export interface PortfolioAnalytics {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
  averageTradeSize: number;
  sectorAllocation: Record<string, number>;
  assetAllocation: Record<string, number>;
}

export interface RebalancingPlan {
  symbol: string;
  currentAllocation: number;
  targetAllocation: number;
  requiredAction: 'buy' | 'sell' | 'hold';
  quantity: number;
  estimatedValue: number;
  priority: 'high' | 'medium' | 'low';
}

export interface RiskMetrics {
  var95: number; // Value at Risk (95% confidence)
  var99: number; // Value at Risk (99% confidence)
  maxPositionSize: number;
  maxSectorExposure: number;
  correlationMatrix: Record<string, Record<string, number>>;
  beta: number;
  alpha: number;
  trackingError: number;
}

export interface DiversificationAnalysis {
  sectorDiversification: number; // 0-100 score
  assetDiversification: number; // 0-100 score
  geographicDiversification: number; // 0-100 score
  concentrationRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
  riskScore: number; // 0-100
}

export class PortfolioManagementService {
  /**
   * Get comprehensive portfolio analytics
   */
  static async getPortfolioAnalytics(userId: string): Promise<PortfolioAnalytics> {
    try {
      // Get current positions
      const positions = await this.getCurrentPositions(userId);
      
      // Get historical trade data
      const tradeHistory = await this.getTradeHistory(userId);
      
      // Calculate basic metrics
      const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
      const totalCost = positions.reduce((sum, pos) => sum + pos.costBasis, 0);
      const totalPnL = totalValue - totalCost;
      const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
      
      // Calculate daily P&L
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const dailyTrades = tradeHistory.filter(trade => 
        new Date(trade.executed_at) >= yesterday
      );
      const dailyPnL = dailyTrades.reduce((sum, trade) => {
        // This is a simplified calculation - in reality you'd need more complex logic
        return sum + (trade.quantity * (trade.price || 0));
      }, 0);
      
      // Calculate volatility (simplified)
      const returns = this.calculateReturns(tradeHistory);
      const volatility = this.calculateVolatility(returns);
      
      // Calculate Sharpe ratio (simplified)
      const averageReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
      const riskFreeRate = 0.02; // 2% annual risk-free rate
      const sharpeRatio = volatility > 0 ? (averageReturn - riskFreeRate) / volatility : 0;
      
      // Calculate win rate
      const profitableTrades = tradeHistory.filter(trade => {
        // Simplified logic - in reality you'd need to track actual P&L per trade
        return trade.side === 'sell' && trade.quantity > 0;
      }).length;
      const winRate = tradeHistory.length > 0 ? (profitableTrades / tradeHistory.length) * 100 : 0;
      
      // Calculate sector allocation
      const sectorAllocation = this.calculateSectorAllocation(positions);
      
      // Calculate asset allocation
      const assetAllocation = this.calculateAssetAllocation(positions);
      
      return {
        totalValue,
        totalPnL,
        totalPnLPercent,
        dailyPnL,
        dailyPnLPercent: totalValue > 0 ? (dailyPnL / totalValue) * 100 : 0,
        volatility,
        sharpeRatio,
        maxDrawdown: this.calculateMaxDrawdown(returns),
        winRate,
        totalTrades: tradeHistory.length,
        profitableTrades,
        averageTradeSize: tradeHistory.length > 0 ? 
          tradeHistory.reduce((sum, trade) => sum + (trade.quantity * (trade.price || 0)), 0) / tradeHistory.length : 0,
        sectorAllocation,
        assetAllocation
      };
    } catch (error) {
      logger.error(LogCategory.TRADING, 'Failed to get portfolio analytics', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to calculate portfolio analytics',
        'Unable to retrieve portfolio performance data',
        { retryable: true }
      );
    }
  }

  /**
   * Generate rebalancing plan
   */
  static async generateRebalancingPlan(
    userId: string,
    targetAllocations: Record<string, number>
  ): Promise<RebalancingPlan[]> {
    try {
      const positions = await this.getCurrentPositions(userId);
      const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
      
      const rebalancingPlan: RebalancingPlan[] = [];
      
      for (const [symbol, targetAllocation] of Object.entries(targetAllocations)) {
        const currentPosition = positions.find(pos => pos.symbol === symbol);
        const currentAllocation = currentPosition ? currentPosition.allocation : 0;
        
        const targetValue = totalValue * (targetAllocation / 100);
        const currentValue = currentPosition ? currentPosition.marketValue : 0;
        const difference = targetValue - currentValue;
        
                 if (Math.abs(difference) > totalValue * 0.01) { // 1% threshold
           const action = difference > 0 ? 'buy' : 'sell';
           const quantity = Math.abs(difference) / ((currentPosition?.marketValue || 0) / (currentPosition?.quantity || 1) || 1);
          
          rebalancingPlan.push({
            symbol,
            currentAllocation,
            targetAllocation,
            requiredAction: action,
            quantity: Math.round(quantity * 100) / 100, // Round to 2 decimal places
            estimatedValue: Math.abs(difference),
            priority: Math.abs(difference) > totalValue * 0.05 ? 'high' : 
                     Math.abs(difference) > totalValue * 0.02 ? 'medium' : 'low'
          });
        }
      }
      
      // Sort by priority and estimated value
      return rebalancingPlan.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        return priorityDiff !== 0 ? priorityDiff : b.estimatedValue - a.estimatedValue;
      });
    } catch (error) {
      logger.error(LogCategory.TRADING, 'Failed to generate rebalancing plan', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to generate rebalancing plan',
        'Unable to calculate optimal portfolio allocation',
        { retryable: true }
      );
    }
  }

  /**
   * Execute rebalancing trades
   */
  static async executeRebalancingTrades(
    userId: string,
    rebalancingPlan: RebalancingPlan[]
  ): Promise<{ success: boolean; executedTrades: number; errors: string[] }> {
    const errors: string[] = [];
    let executedTrades = 0;
    
    try {
      for (const plan of rebalancingPlan) {
        if (plan.priority === 'high' || plan.priority === 'medium') {
          try {
            // Execute the rebalancing trade
            const result = await this.executeRebalancingTrade(userId, plan);
            if (result.success) {
              executedTrades++;
            } else {
              errors.push(`Failed to execute ${plan.symbol} rebalancing: ${result.error}`);
            }
          } catch (error) {
            errors.push(`Error executing ${plan.symbol} rebalancing: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
      
      return {
        success: executedTrades > 0,
        executedTrades,
        errors
      };
    } catch (error) {
      logger.error(LogCategory.TRADING, 'Failed to execute rebalancing trades', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId, planCount: rebalancingPlan.length }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to execute rebalancing trades',
        'Unable to complete portfolio rebalancing',
        { retryable: true }
      );
    }
  }

  /**
   * Calculate risk metrics
   */
  static async calculateRiskMetrics(userId: string): Promise<RiskMetrics> {
    try {
      const positions = await this.getCurrentPositions(userId);
      const tradeHistory = await this.getTradeHistory(userId);
      const returns = this.calculateReturns(tradeHistory);
      
      // Calculate Value at Risk (simplified)
      const sortedReturns = returns.sort((a, b) => a - b);
      const var95Index = Math.floor(sortedReturns.length * 0.05);
      const var99Index = Math.floor(sortedReturns.length * 0.01);
      const var95 = sortedReturns[var95Index] || 0;
      const var99 = sortedReturns[var99Index] || 0;
      
      // Calculate correlation matrix (simplified)
      const correlationMatrix = this.calculateCorrelationMatrix(positions);
      
      // Calculate beta (simplified - would need market data)
      const beta = this.calculateBeta(returns);
      
      // Calculate alpha (simplified)
      const alpha = this.calculateAlpha(returns, beta);
      
      return {
        var95,
        var99,
        maxPositionSize: Math.max(...positions.map(p => p.allocation)),
        maxSectorExposure: this.calculateMaxSectorExposure(positions),
        correlationMatrix,
        beta,
        alpha,
        trackingError: this.calculateTrackingError(returns)
      };
    } catch (error) {
      logger.error(LogCategory.TRADING, 'Failed to calculate risk metrics', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to calculate risk metrics',
        'Unable to compute portfolio risk analysis',
        { retryable: true }
      );
    }
  }

  /**
   * Analyze portfolio diversification
   */
  static async analyzeDiversification(userId: string): Promise<DiversificationAnalysis> {
    try {
      const positions = await this.getCurrentPositions(userId);
      
      // Calculate sector diversification
      const sectorAllocation = this.calculateSectorAllocation(positions);
      const sectorDiversification = this.calculateDiversificationScore(sectorAllocation);
      
      // Calculate asset diversification
      const assetAllocation = this.calculateAssetAllocation(positions);
      const assetDiversification = this.calculateDiversificationScore(assetAllocation);
      
      // Calculate geographic diversification (simplified)
      const geographicDiversification = 70; // Placeholder - would need geographic data
      
      // Determine concentration risk
      const maxAllocation = Math.max(...positions.map(p => p.allocation));
      const concentrationRisk = maxAllocation > 20 ? 'high' : 
                               maxAllocation > 10 ? 'medium' : 'low';
      
      // Generate recommendations
      const recommendations = this.generateDiversificationRecommendations(
        positions, sectorAllocation, assetAllocation
      );
      
      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(
        sectorDiversification, assetDiversification, geographicDiversification, concentrationRisk
      );
      
      return {
        sectorDiversification,
        assetDiversification,
        geographicDiversification,
        concentrationRisk,
        recommendations,
        riskScore
      };
    } catch (error) {
      logger.error(LogCategory.TRADING, 'Failed to analyze diversification', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to analyze portfolio diversification',
        'Unable to compute diversification analysis',
        { retryable: true }
      );
    }
  }

  // Private helper methods

  private static async getCurrentPositions(userId: string): Promise<PortfolioPosition[]> {
    // This would integrate with Alpaca API to get real positions
    // For now, return mock data
    return [
      {
        symbol: 'AAPL',
        quantity: 100,
        marketValue: 15000,
        costBasis: 14000,
        unrealizedPnL: 1000,
        unrealizedPnLPercent: 7.14,
        allocation: 30
      },
      {
        symbol: 'TSLA',
        quantity: 50,
        marketValue: 10000,
        costBasis: 12000,
        unrealizedPnL: -2000,
        unrealizedPnLPercent: -16.67,
        allocation: 20
      }
    ];
  }

  private static async getTradeHistory(userId: string): Promise<TradeExecution[]> {
    // This would get from database
    return [];
  }

  private static calculateReturns(tradeHistory: TradeExecution[]): number[] {
    // Simplified return calculation
    return [0.02, -0.01, 0.03, -0.02, 0.01];
  }

  private static calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private static calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    let peak = 1;
    let maxDrawdown = 0;
    let cumulative = 1;
    
    for (const ret of returns) {
      cumulative *= (1 + ret);
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = (peak - cumulative) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  private static calculateSectorAllocation(positions: PortfolioPosition[]): Record<string, number> {
    // Simplified sector mapping
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'TSLA': 'Automotive',
      'MSFT': 'Technology',
      'GOOGL': 'Technology'
    };
    
    const sectorAllocation: Record<string, number> = {};
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    
    for (const position of positions) {
      const sector = sectorMap[position.symbol] || 'Other';
      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + position.marketValue;
    }
    
    // Convert to percentages
    for (const sector in sectorAllocation) {
      sectorAllocation[sector] = (sectorAllocation[sector] / totalValue) * 100;
    }
    
    return sectorAllocation;
  }

  private static calculateAssetAllocation(positions: PortfolioPosition[]): Record<string, number> {
    // Simplified asset classification
    const assetAllocation: Record<string, number> = {
      'Stocks': 100 // All positions are stocks for now
    };
    
    return assetAllocation;
  }

  private static calculateCorrelationMatrix(positions: PortfolioPosition[]): Record<string, Record<string, number>> {
    // Simplified correlation matrix
    const matrix: Record<string, Record<string, number>> = {};
    
    for (const pos1 of positions) {
      matrix[pos1.symbol] = {};
      for (const pos2 of positions) {
        matrix[pos1.symbol][pos2.symbol] = pos1.symbol === pos2.symbol ? 1 : 0.3; // Simplified
      }
    }
    
    return matrix;
  }

  private static calculateBeta(returns: number[]): number {
    // Simplified beta calculation
    return 1.0; // Market beta
  }

  private static calculateAlpha(returns: number[], beta: number): number {
    // Simplified alpha calculation
    const averageReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const marketReturn = 0.08; // 8% annual market return
    return averageReturn - (0.02 + beta * (marketReturn - 0.02)); // CAPM
  }

  private static calculateTrackingError(returns: number[]): number {
    // Simplified tracking error
    return this.calculateVolatility(returns);
  }

  private static calculateMaxSectorExposure(positions: PortfolioPosition[]): number {
    const sectorAllocation = this.calculateSectorAllocation(positions);
    return Math.max(...Object.values(sectorAllocation));
  }

  private static calculateDiversificationScore(allocation: Record<string, number>): number {
    const values = Object.values(allocation);
    if (values.length === 0) return 0;
    
    // Herfindahl-Hirschman Index (HHI) - lower is more diversified
    const hhi = values.reduce((sum, value) => sum + Math.pow(value / 100, 2), 0);
    
    // Convert to diversification score (0-100)
    return Math.max(0, 100 - (hhi * 100));
  }

  private static generateDiversificationRecommendations(
    positions: PortfolioPosition[],
    sectorAllocation: Record<string, number>,
    assetAllocation: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];
    
    // Check for over-concentration
    const maxSector = Math.max(...Object.values(sectorAllocation));
    if (maxSector > 30) {
      recommendations.push(`Consider reducing exposure to the largest sector (${maxSector.toFixed(1)}%)`);
    }
    
    // Check for too few positions
    if (positions.length < 5) {
      recommendations.push('Consider adding more positions to improve diversification');
    }
    
    // Check for large individual positions
    const maxPosition = Math.max(...positions.map(p => p.allocation));
    if (maxPosition > 20) {
      recommendations.push(`Consider reducing your largest position (${maxPosition.toFixed(1)}%)`);
    }
    
    return recommendations;
  }

  private static calculateRiskScore(
    sectorDiversification: number,
    assetDiversification: number,
    geographicDiversification: number,
    concentrationRisk: 'low' | 'medium' | 'high'
  ): number {
    const concentrationScore = concentrationRisk === 'low' ? 20 : 
                              concentrationRisk === 'medium' ? 50 : 80;
    
    return (sectorDiversification + assetDiversification + geographicDiversification + concentrationScore) / 4;
  }

  private static async executeRebalancingTrade(
    userId: string,
    plan: RebalancingPlan
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // This would integrate with the trade execution engine
      // For now, just log the intended trade
      logger.info(LogCategory.TRADING, 'Rebalancing trade executed', {
        metadata: {
          userId,
          symbol: plan.symbol,
          action: plan.requiredAction,
          quantity: plan.quantity,
          estimatedValue: plan.estimatedValue
        }
      });
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 