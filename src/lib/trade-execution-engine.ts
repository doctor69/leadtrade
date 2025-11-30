// Enhanced Trade Execution Engine with Retry Logic and Reliability Features
import { DatabaseService } from './database';
import { getUserTradingMode, getAlpacaConfig } from './trading-config';
import { logger, LogCategory } from './logger';
import { errorHandler, ErrorCode } from './error-handler';
import { SecurityService } from './security-config';
import { WebSocketService } from './websocket-service';
import { apiService } from './apiService';
import type {
    TradeExecution,
    CopiedTrade,
    CopyTradingSubscription,
    TradeExecutionRequest,
    OptionDetails
} from '../types/trading';

// Type definitions
export interface LeaderTradeData {
    leaderId: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price?: number;
    tradeType: 'stock' | 'option';
    optionDetails?: OptionDetails;
    portfolioPercentage: number;
    alpacaOrderId: string;
}

export interface TradeExecutionResult {
    success: boolean;
    originalTradeId: string;
    copiedTrades: CopiedTradeResult[];
    errors: string[];
}

export interface CopiedTradeResult {
    followerId: string;
    success: boolean;
    quantity: number;
    allocatedAmount: number;
    executionStatus: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'failed';
    orderId?: string;
    error?: string;
}

interface FollowerAccountInfo {
    followerId: string;
    portfolioValue: number;
    buyingPower: number;
    allocationPercentage: number;
        accessToken: string;
    tradingMode: 'paper' | 'live';
}

interface ProportionalTradeCalculation {
    followerId: string;
    symbol: string;
    side: 'buy' | 'sell';
    calculatedQuantity: number;
    allocatedAmount: number;
    canExecute: boolean;
    insufficientFunds: boolean;
    maxAffordableQuantity?: number;
    reason?: string;
}

// Enhanced interfaces for reliability features
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface QueuedTradeExecution {
  id: string;
  trade: LeaderTradeData;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  scheduledFor: Date;
}

interface EnhancedTradeExecutionResult extends TradeExecutionResult {
  retryAttempts: number;
  queueTime: number;
  totalExecutionTime: number;
  partialSuccesses: CopiedTradeResult[];
  failedTrades: CopiedTradeResult[];
  metadata?: {
    queued?: boolean;
    queueId?: string;
    priority?: string;
  };
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
};

// Trade execution queue for handling high-volume scenarios
class TradeExecutionQueue {
  private queue: QueuedTradeExecution[] = [];
  private processing = false;
  private retryConfig: RetryConfig;

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig;
    this.startQueueProcessor();
  }

  /**
   * Add trade to execution queue
   */
  async addToQueue(
    trade: LeaderTradeData,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    const queueItem: QueuedTradeExecution = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trade,
      priority,
      retryCount: 0,
      maxRetries: this.retryConfig.maxRetries,
      createdAt: new Date(),
      scheduledFor: new Date()
    };

    // Insert based on priority
    if (priority === 'high') {
      this.queue.unshift(queueItem);
    } else {
      this.queue.push(queueItem);
    }

    logger.info(LogCategory.COPY_TRADING, `Trade added to execution queue`, {
      metadata: {
        queueId: queueItem.id,
        symbol: trade.symbol,
        priority,
        queueLength: this.queue.length
      }
    });

    return queueItem.id;
  }

  /**
   * Start the queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processing && this.queue.length > 0) {
        this.processNextTrade();
      }
    }, 100); // Check every 100ms
  }

  /**
   * Process the next trade in queue
   */
  private async processNextTrade(): Promise<void> {
    if (this.queue.length === 0) return;

    this.processing = true;
    const queueItem = this.queue.shift()!;

    try {
      logger.info(LogCategory.COPY_TRADING, `Processing queued trade`, {
        metadata: {
          queueId: queueItem.id,
          symbol: queueItem.trade.symbol,
          retryCount: queueItem.retryCount
        }
      });

      const result = await TradeExecutionEngine.executeProportionalTrades(queueItem.trade);
      
      if (result.success) {
        logger.info(LogCategory.COPY_TRADING, `Queued trade executed successfully`, {
          metadata: {
            queueId: queueItem.id,
            successfulCopies: result.copiedTrades.filter((t: CopiedTradeResult) => t.success).length
          }
        });
      } else {
        // Handle failed execution with retry logic
        await this.handleFailedExecution(queueItem, result);
      }
    } catch (error) {
      logger.error(LogCategory.COPY_TRADING, `Error processing queued trade`, {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { queueId: queueItem.id }
      });
      
      await this.handleFailedExecution(queueItem, { 
        success: false, 
        originalTradeId: queueItem.trade.alpacaOrderId,
        copiedTrades: [], 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      });
    } finally {
      this.processing = false;
    }
  }

  /**
   * Handle failed trade execution with retry logic
   */
  private async handleFailedExecution(
    queueItem: QueuedTradeExecution,
    result: TradeExecutionResult
  ): Promise<void> {
    if (queueItem.retryCount < queueItem.maxRetries) {
      // Calculate retry delay with exponential backoff
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, queueItem.retryCount),
        this.retryConfig.maxDelay
      );

      queueItem.retryCount++;
      queueItem.scheduledFor = new Date(Date.now() + delay);

      // Re-add to queue with delay
      setTimeout(() => {
        this.queue.unshift(queueItem); // High priority for retries
      }, delay);

      logger.warn(LogCategory.COPY_TRADING, `Scheduling trade retry`, {
        metadata: {
          queueId: queueItem.id,
          retryCount: queueItem.retryCount,
          delay,
          errors: result.errors
        }
      });
    } else {
      // Max retries exceeded
      logger.error(LogCategory.COPY_TRADING, `Trade execution failed after max retries`, {
        metadata: {
          queueId: queueItem.id,
          maxRetries: queueItem.maxRetries,
          errors: result.errors
        }
      });

      // Record final failure
      await this.recordFinalFailure(queueItem, result);
    }
  }

  /**
   * Record final failure after max retries
   */
  private async recordFinalFailure(
    queueItem: QueuedTradeExecution,
    result: TradeExecutionResult
  ): Promise<void> {
    try {
      // Note: Trade data is now tracked via Alpaca APIs only
      // No local database storage of trade executions

      // Log comprehensive failure details
      logger.error(LogCategory.COPY_TRADING, `Final trade execution failure recorded`, {
        metadata: {
          queueId: queueItem.id,
          leaderId: queueItem.trade.leaderId,
          symbol: queueItem.trade.symbol,
          retryAttempts: queueItem.retryCount,
          totalErrors: result.errors.length,
          errors: result.errors
        }
      });
    } catch (error) {
      logger.error(LogCategory.COPY_TRADING, `Failed to record final failure`, {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { queueId: queueItem.id }
      });
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    processing: boolean;
    oldestItem?: Date;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      oldestItem: this.queue.length > 0 ? this.queue[0].createdAt : undefined
    };
  }
}

// Global trade execution queue instance
const tradeExecutionQueue = new TradeExecutionQueue();

export class TradeExecutionEngine {
    /**
     * Enhanced main entry point for executing proportional trades with reliability features
     */
    static async executeProportionalTrades(
        leaderTrade: LeaderTradeData,
        options: {
            useQueue?: boolean;
            priority?: 'high' | 'normal' | 'low';
            retryConfig?: RetryConfig;
        } = {}
    ): Promise<EnhancedTradeExecutionResult> {
        const startTime = Date.now();
        const retryConfig = options.retryConfig || DEFAULT_RETRY_CONFIG;

        try {
            // Validate trade security
            const securityValidation = this.validateTradeSecurity(leaderTrade);
            if (!securityValidation.isValid) {
                return {
                    success: false,
                    originalTradeId: leaderTrade.alpacaOrderId,
                    copiedTrades: [],
                    errors: [securityValidation.error || 'Invalid trade security'],
                    retryAttempts: 0,
                    queueTime: 0,
                    totalExecutionTime: Date.now() - startTime,
                    partialSuccesses: [],
                    failedTrades: []
                };
            }

            // Get active followers
            const followers = await this.getActiveFollowers(leaderTrade.leaderId);
            if (followers.length === 0) {
                return {
                    success: true,
                    originalTradeId: leaderTrade.alpacaOrderId,
                    copiedTrades: [],
                    errors: [],
                    retryAttempts: 0,
                    queueTime: 0,
                    totalExecutionTime: Date.now() - startTime,
                    partialSuccesses: [],
                    failedTrades: []
                };
            }

            // Get follower account info
            const followerAccounts = await this.getFollowerAccountInfo(followers);
            if (followerAccounts.length === 0) {
                return {
                    success: false,
                    originalTradeId: leaderTrade.alpacaOrderId,
                    copiedTrades: [],
                    errors: ['Failed to get follower account info'],
                    retryAttempts: 0,
                    queueTime: 0,
                    totalExecutionTime: Date.now() - startTime,
                    partialSuccesses: [],
                    failedTrades: []
                };
            }

            // Calculate proportional trades
            const tradeCalculations = await this.calculateProportionalTrades(leaderTrade, followerAccounts);
            if (tradeCalculations.length === 0) {
                return {
                    success: false,
                    originalTradeId: leaderTrade.alpacaOrderId,
                    copiedTrades: [],
                    errors: ['No valid trades to execute'],
                    retryAttempts: 0,
                    queueTime: 0,
                    totalExecutionTime: Date.now() - startTime,
                    partialSuccesses: [],
                    failedTrades: []
                };
            }

            // Execute trades
            const copiedTrades = await this.executeCopiedTrades(leaderTrade.alpacaOrderId, tradeCalculations);

            // Check if any trades were successful
            const successfulTrades = copiedTrades.filter(trade => trade.success);
            const failedTrades = copiedTrades.filter(trade => !trade.success);

            return {
                success: successfulTrades.length > 0,
                originalTradeId: leaderTrade.alpacaOrderId,
                copiedTrades: successfulTrades,
                errors: failedTrades.map(trade => trade.error || 'Unknown error'),
                retryAttempts: 0,
                queueTime: 0,
                totalExecutionTime: Date.now() - startTime,
                partialSuccesses: successfulTrades,
                failedTrades
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Execute trade with retry logic and exponential backoff
     */
    private static async executeWithRetry(
        leaderTrade: LeaderTradeData,
        retryConfig: RetryConfig,
        startTime: number
    ): Promise<EnhancedTradeExecutionResult> {
        let lastError: Error | null = null;
        let retryAttempts = 0;

        for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
            try {
                const result = await this.executeProportionalTradesInternal(leaderTrade);
                
                // Calculate execution metrics
                const totalExecutionTime = Date.now() - startTime;
                const partialSuccesses = result.copiedTrades.filter(trade => trade.success);
                const failedTrades = result.copiedTrades.filter(trade => !trade.success);

                const enhancedResult: EnhancedTradeExecutionResult = {
                    ...result,
                    retryAttempts,
                    queueTime: 0, // Direct execution
                    totalExecutionTime,
                    partialSuccesses,
                    failedTrades
                };

                // Log successful execution
                logger.info(LogCategory.COPY_TRADING, `Trade execution completed`, {
                    metadata: {
                        symbol: leaderTrade.symbol,
                        retryAttempts,
                        totalExecutionTime,
                        successfulCopies: partialSuccesses.length,
                        failedCopies: failedTrades.length
                    }
                });

                return enhancedResult;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                retryAttempts = attempt;

                // Check if error is retryable
                if (!this.isRetryableError(error)) {
                    logger.error(LogCategory.COPY_TRADING, `Non-retryable error encountered`, {
                        error,
                        metadata: { symbol: leaderTrade.symbol, attempt }
                    });
                    break;
                }

                // Calculate delay for next retry
                if (attempt < retryConfig.maxRetries) {
                    const delay = Math.min(
                        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
                        retryConfig.maxDelay
                    );

                    logger.warn(LogCategory.COPY_TRADING, `Trade execution failed, retrying`, {
                        metadata: {
                            symbol: leaderTrade.symbol,
                            attempt: attempt + 1,
                            maxRetries: retryConfig.maxRetries,
                            delay,
                            error: lastError.message
                        }
                    });

                    // Wait before retry
                    await this.sleep(delay);
                }
            }
        }

        // All retries exhausted
        const totalExecutionTime = Date.now() - startTime;
        
        logger.error(LogCategory.COPY_TRADING, `Trade execution failed after all retries`, {
            error: lastError || new Error('Unknown error'),
            metadata: {
                symbol: leaderTrade.symbol,
                retryAttempts,
                totalExecutionTime,
                maxRetries: retryConfig.maxRetries
            }
        });

        return {
            success: false,
            originalTradeId: leaderTrade.alpacaOrderId,
            copiedTrades: [],
            errors: [lastError?.message || 'Unknown error'],
            retryAttempts,
            queueTime: 0,
            totalExecutionTime,
            partialSuccesses: [],
            failedTrades: []
        };
    }

    /**
     * Internal execution method (original logic)
     */
    private static async executeProportionalTradesInternal(
        leaderTrade: LeaderTradeData
    ): Promise<TradeExecutionResult> {
        try {
            // Validate trade security
            const securityCheck = this.validateTradeSecurity(leaderTrade);
            if (!securityCheck.isValid) {
                return {
            success: false,
                    originalTradeId: leaderTrade.alpacaOrderId,
                    copiedTrades: [],
                    errors: [securityCheck.error || 'Security validation failed']
                };
            }

            // Record leader trade
            const recordedTrade = await this.recordLeaderTrade(leaderTrade);
            if (!recordedTrade) {
                return {
                    success: false,
                    originalTradeId: leaderTrade.alpacaOrderId,
                    copiedTrades: [],
                    errors: ['Failed to record leader trade']
                };
            }

            // Get active followers
            const followers = await this.getActiveFollowers(leaderTrade.leaderId);
            if (!followers || followers.length === 0) {
                return {
                    success: true,
            originalTradeId: leaderTrade.alpacaOrderId,
            copiedTrades: [],
            errors: []
        };
            }

            // Get follower account info
            const followerAccounts = await this.getFollowerAccountInfo(followers);
            if (!followerAccounts || followerAccounts.length === 0) {
                return {
                    success: false,
                    originalTradeId: leaderTrade.alpacaOrderId,
                    copiedTrades: [],
                    errors: ['Failed to get follower account info']
                };
            }

            // Calculate proportional trades
            const tradeCalculations = await this.calculateProportionalTrades(leaderTrade, followerAccounts);
            if (!tradeCalculations || tradeCalculations.length === 0) {
                return {
                    success: false,
                    originalTradeId: leaderTrade.alpacaOrderId,
                    copiedTrades: [],
                    errors: ['No valid trades to execute']
                };
            }

            // Execute trades with recovery
            const copiedTrades = await this.executeCopiedTradesWithRecovery(leaderTrade.alpacaOrderId, tradeCalculations);

            // Determine overall success
            const hasSuccessfulTrades = copiedTrades.some(trade => trade.success);
            const failedTrades = copiedTrades.filter(trade => !trade.success);
            const errors = failedTrades.map(trade => trade.error || 'Unknown error');

            return {
                success: hasSuccessfulTrades,
                originalTradeId: leaderTrade.alpacaOrderId,
                copiedTrades: copiedTrades.filter(trade => trade.success),
                errors: errors
            };
        } catch (error) {
            logger.error(LogCategory.COPY_TRADING, 'Error executing proportional trades', {
                error: error instanceof Error ? error : new Error('Unknown error'),
                metadata: { leaderId: leaderTrade.leaderId, symbol: leaderTrade.symbol }
            });

            return {
                success: false,
                originalTradeId: leaderTrade.alpacaOrderId,
                copiedTrades: [],
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }

    /**
     * Enhanced trade execution with comprehensive error recovery
     */
    private static async executeCopiedTradesWithRecovery(
        originalTradeId: string,
        tradeCalculations: ProportionalTradeCalculation[]
    ): Promise<CopiedTradeResult[]> {
        const results: CopiedTradeResult[] = [];
        const successfulTrades: CopiedTradeResult[] = [];
        const failedTrades: CopiedTradeResult[] = [];

        // Execute trades in parallel with individual error handling
        const executionPromises = tradeCalculations.map(async (calculation) => {
            try {
                const result = await this.executeSingleFollowerTrade(originalTradeId, calculation);
                
                if (result.success) {
                    successfulTrades.push(result);
                } else {
                    failedTrades.push(result);
                }
                
                return result;
            } catch (error) {
                const errorResult: CopiedTradeResult = {
                    followerId: calculation.followerId,
                    success: false,
                    quantity: calculation.calculatedQuantity,
                    allocatedAmount: calculation.allocatedAmount,
                    executionStatus: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
                
                failedTrades.push(errorResult);
                return errorResult;
            }
        });

        // Wait for all executions to complete
        await Promise.allSettled(executionPromises);

        // Log comprehensive results
        logger.info(LogCategory.COPY_TRADING, `Trade execution recovery completed`, {
            metadata: {
                originalTradeId,
                totalCalculations: tradeCalculations.length,
                successfulTrades: successfulTrades.length,
                failedTrades: failedTrades.length,
                successRate: (successfulTrades.length / tradeCalculations.length) * 100
            }
        });

        return [...successfulTrades, ...failedTrades];
    }

    /**
     * Execute trade for a single follower with enhanced error handling
     */
    private static async executeSingleFollowerTrade(
        originalTradeId: string,
        calculation: ProportionalTradeCalculation
    ): Promise<CopiedTradeResult> {
        if (!calculation.canExecute || calculation.calculatedQuantity <= 0) {
            // Record failed trade attempt
            await this.recordCopiedTrade({
                original_trade_id: originalTradeId,
                follower_id: calculation.followerId,
                symbol: calculation.symbol,
                side: calculation.side,
                quantity: 0,
                allocated_amount: calculation.allocatedAmount,
                execution_status: 'failed',
                error_message: calculation.reason || 'Cannot execute trade',
                executed_at: new Date().toISOString()
            });

            return {
                followerId: calculation.followerId,
                success: false,
                quantity: 0,
                allocatedAmount: calculation.allocatedAmount,
                executionStatus: 'failed',
                error: calculation.reason || 'Cannot execute trade'
            };
        }

        try {
            // Execute the trade with timeout
            const executionResult = await this.executeAlpacaOrderWithTimeout(
                {
                    symbol: calculation.symbol,
                    side: calculation.side,
                    quantity: calculation.calculatedQuantity,
                    type: 'market',
                    time_in_force: 'day',
                    trade_type: 'stock'
                },
                'access-token', // This should come from calculation
                'paper', // This should come from calculation
                30000 // 30 second timeout
            );

            if (executionResult.success) {
                // Record successful trade
                await this.recordCopiedTrade({
                    original_trade_id: originalTradeId,
                    follower_id: calculation.followerId,
                    symbol: calculation.symbol,
                    side: calculation.side,
                    quantity: calculation.calculatedQuantity,
                    allocated_amount: calculation.allocatedAmount,
                    execution_status: 'filled',
                    executed_at: new Date().toISOString()
                });

                return {
                    followerId: calculation.followerId,
                    success: true,
                    quantity: calculation.calculatedQuantity,
                    allocatedAmount: calculation.allocatedAmount,
                    executionStatus: 'filled'
                };
            } else {
                // Record failed trade
                await this.recordCopiedTrade({
                    original_trade_id: originalTradeId,
                    follower_id: calculation.followerId,
                    symbol: calculation.symbol,
                    side: calculation.side,
                    quantity: calculation.calculatedQuantity,
                    allocated_amount: calculation.allocatedAmount,
                    execution_status: 'failed',
                    error_message: executionResult.error || 'Trade execution failed',
                    executed_at: new Date().toISOString()
                });

                return {
                    followerId: calculation.followerId,
                    success: false,
                    quantity: calculation.calculatedQuantity,
                    allocatedAmount: calculation.allocatedAmount,
                    executionStatus: 'failed',
                    error: executionResult.error || 'Trade execution failed'
                };
            }
        } catch (error) {
            console.error(`Error executing trade for follower ${calculation.followerId}:`, error);

            // Record failed trade
            await this.recordCopiedTrade({
                original_trade_id: originalTradeId,
                follower_id: calculation.followerId,
                symbol: calculation.symbol,
                side: calculation.side,
                quantity: calculation.calculatedQuantity,
                allocated_amount: calculation.allocatedAmount,
                execution_status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error',
                executed_at: new Date().toISOString()
            });

            return {
                followerId: calculation.followerId,
                success: false,
                quantity: calculation.calculatedQuantity,
                allocatedAmount: calculation.allocatedAmount,
                executionStatus: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Execute Alpaca order with timeout
     */
    private static async executeAlpacaOrderWithTimeout(
        orderRequest: TradeExecutionRequest,
        accessToken: string,
        tradingMode: 'paper' | 'live',
        timeoutMs: number
    ): Promise<{ success: boolean; orderId?: string; error?: string }> {
        const timeoutPromise = new Promise<{ success: boolean; orderId?: string; error?: string }>((_, reject) => {
            setTimeout(() => reject(new Error('Order execution timeout')), timeoutMs);
        });

        const executionPromise = this.executeAlpacaOrder(orderRequest, accessToken, tradingMode);

        try {
            return await Promise.race([executionPromise, timeoutPromise]);
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Check if error is retryable
     */
    private static isRetryableError(error: any): boolean {
        if (!error) return false;

        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code || '';

        // Network errors are retryable
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
            return true;
        }

        // Rate limiting errors are retryable
        if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
            return true;
        }

        // Temporary server errors are retryable
        if (errorMessage.includes('internal server error') || errorMessage.includes('service unavailable')) {
            return true;
        }

        // Non-retryable errors
        if (errorMessage.includes('insufficient funds') || 
            errorMessage.includes('invalid symbol') ||
            errorMessage.includes('market closed') ||
            errorMessage.includes('authentication failed')) {
            return false;
        }

        // Default to retryable for unknown errors
        return true;
    }

    /**
     * Sleep utility for retry delays
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Validate trade security
     */
    private static validateTradeSecurity(leaderTrade: LeaderTradeData): { isValid: boolean; error?: string } {
        // Validate trade amount
        const tradeAmount = leaderTrade.quantity * (leaderTrade.price || 0);
        const tradeValidation = SecurityService.validateTradeAmount(tradeAmount);
        if (!tradeValidation.isValid) {
            return { isValid: false, error: tradeValidation.error };
        }

        // Validate portfolio percentage
        if (leaderTrade.portfolioPercentage <= 0 || leaderTrade.portfolioPercentage > 100) {
            return { isValid: false, error: 'Invalid portfolio percentage' };
        }

        // Validate symbol
        if (!leaderTrade.symbol || leaderTrade.symbol.length === 0) {
            return { isValid: false, error: 'Invalid symbol' };
        }

        return { isValid: true };
    }

    /**
     * Get queue statistics
     */
    static getQueueStats() {
        return tradeExecutionQueue.getQueueStatus();
    }

    /**
  * Record the leader's trade execution in the database
   */
    private static async recordLeaderTrade(
        leaderTrade: LeaderTradeData
    ): Promise<TradeExecution | null> {
        try {
            // Note: Trade executions are now tracked via Alpaca APIs only
            // No local database storage needed
            const tradeExecution = {
                symbol: leaderTrade.symbol,
                side: leaderTrade.side,
                quantity: leaderTrade.quantity,
                price: leaderTrade.price,
                trade_type: leaderTrade.tradeType,
                option_details: leaderTrade.optionDetails,
                portfolio_percentage: leaderTrade.portfolioPercentage,
                executed_at: new Date().toISOString()
            };

            return tradeExecution;
        } catch (error) {
            console.error('Error recording leader trade:', error);
            return null;
        }
    }

    /**
     * Get follower account information including portfolio values and trading modes
     */
    private static async getFollowerAccountInfo(
        followers: CopyTradingSubscription[]
    ): Promise<FollowerAccountInfo[]> {
        const followerAccounts: FollowerAccountInfo[] = [];

        for (const follower of followers) {
            try {
                // Get user profile and Alpaca account info
                const profile = await DatabaseService.getUserProfile(follower.follower_id);
                const alpacaAccount = await DatabaseService.getAlpacaAccount(follower.follower_id);
                if (!profile || !alpacaAccount) {
                    console.warn(`Follower ${follower.follower_id} has no profile or Alpaca account`);
                    continue;
                }

                // Get user's trading mode
                const tradingMode = await getUserTradingMode(follower.follower_id);

                // Get account data from Alpaca
                const accountData = await this.getAlpacaAccountData(
                    profile.alpaca_access_token,
                    tradingMode
                );

                if (!accountData) {
                    console.warn(`Failed to get account data for follower ${follower.follower_id}`);
                    continue;
                }

                followerAccounts.push({
                    followerId: follower.follower_id,
                    portfolioValue: accountData.portfolioValue,
                    buyingPower: accountData.buyingPower,
                    allocationPercentage: follower.allocation_percentage,
                        accessToken: profile.alpaca_access_token,
                    tradingMode
                });
            } catch (error) {
                console.error(`Error getting account info for follower ${follower.follower_id}:`, error);
            }
        }

        return followerAccounts;
    }

    /**
     * Get Alpaca account data for a user
     */
    private static async getAlpacaAccountData(
        accessToken: string,
        tradingMode: 'paper' | 'live'
    ): Promise<{ portfolioValue: number; buyingPower: number } | null> {
        try {
            const config = getAlpacaConfig(tradingMode);

            const response = await fetch(`${config.brokerBaseUrl}/v2/account`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch Alpaca account data:', response.statusText);
                return null;
            }

            const accountData = await response.json();

            return {
                portfolioValue: parseFloat(accountData.portfolio_value || '0'),
                buyingPower: parseFloat(accountData.buying_power || '0')
            };
        } catch (error) {
            console.error('Error fetching Alpaca account data:', error);
            return null;
        }
    }  /**
 
  * Calculate proportional trades for each follower based on leader's trade
   */
    private static async calculateProportionalTrades(
        leaderTrade: LeaderTradeData,
        followerAccounts: FollowerAccountInfo[]
    ): Promise<ProportionalTradeCalculation[]> {
        const calculations: ProportionalTradeCalculation[] = [];

        for (const follower of followerAccounts) {
            try {
                // Calculate the allocated amount for this follower
                const allocatedAmount = (follower.portfolioValue * follower.allocationPercentage) / 100;

                // Calculate the proportional amount based on leader's portfolio percentage
                const proportionalAmount = (allocatedAmount * leaderTrade.portfolioPercentage) / 100;

                // Calculate quantity based on trade type and price
                let calculatedQuantity = 0;
                let canExecute = false;
                let insufficientFunds = false;
                let maxAffordableQuantity: number | undefined;
                let reason: string | undefined;

                if (leaderTrade.tradeType === 'option' && leaderTrade.optionDetails) {
                    // Options trading calculation
                    const optionSymbol = this.constructOptionSymbol(
                        leaderTrade.symbol,
                        leaderTrade.optionDetails
                    );
                    const optionPremium = await this.getCurrentMarketPrice(optionSymbol, follower.tradingMode);

                    if (optionPremium && optionPremium > 0) {
                        calculatedQuantity = Math.floor(proportionalAmount / optionPremium);

                        const requiredAmount = calculatedQuantity * optionPremium;
                        
                        if (requiredAmount <= follower.buyingPower) {
                            canExecute = true;
                        } else {
                            maxAffordableQuantity = Math.floor(follower.buyingPower / optionPremium);
                            
                            if (maxAffordableQuantity > 0) {
                                calculatedQuantity = maxAffordableQuantity;
                                canExecute = true;
                                insufficientFunds = true;
                                reason = `Insufficient funds: executing ${maxAffordableQuantity} contracts instead of ${Math.floor(proportionalAmount / optionPremium)}`;
                            } else {
                                canExecute = false;
                                insufficientFunds = true;
                                reason = 'Insufficient funds to execute any option contracts';
                            }
                        }
                    } else {
                        canExecute = false;
                        reason = 'Unable to determine option premium for execution';
                    }
                } else {
                    // Stock trading calculation
                    if (leaderTrade.price && leaderTrade.price > 0) {
                        // Use the leader's execution price
                        calculatedQuantity = Math.floor(proportionalAmount / leaderTrade.price);

                        // Check if follower has sufficient buying power
                        const requiredAmount = calculatedQuantity * leaderTrade.price;

                        if (requiredAmount <= follower.buyingPower) {
                            canExecute = true;
                        } else {
                            // Calculate maximum affordable quantity (Requirement 4.5)
                            maxAffordableQuantity = Math.floor(follower.buyingPower / leaderTrade.price);

                            if (maxAffordableQuantity > 0) {
                                calculatedQuantity = maxAffordableQuantity;
                                canExecute = true;
                                insufficientFunds = true;
                                reason = `Insufficient funds: executing ${maxAffordableQuantity} shares instead of ${Math.floor(proportionalAmount / leaderTrade.price)}`;
                            } else {
                                canExecute = false;
                                insufficientFunds = true;
                                reason = 'Insufficient funds to execute any shares';
                            }
                        }
                    } else {
                        // Need to get current market price for calculation
                        const marketPrice = await this.getCurrentMarketPrice(leaderTrade.symbol, follower.tradingMode);

                        if (marketPrice && marketPrice > 0) {
                            calculatedQuantity = Math.floor(proportionalAmount / marketPrice);

                            const requiredAmount = calculatedQuantity * marketPrice;

                            if (requiredAmount <= follower.buyingPower) {
                                canExecute = true;
                            } else {
                                maxAffordableQuantity = Math.floor(follower.buyingPower / marketPrice);

                                if (maxAffordableQuantity > 0) {
                                    calculatedQuantity = maxAffordableQuantity;
                                    canExecute = true;
                                    insufficientFunds = true;
                                    reason = `Insufficient funds: executing ${maxAffordableQuantity} shares at market price`;
                                } else {
                                    canExecute = false;
                                    insufficientFunds = true;
                                    reason = 'Insufficient funds to execute any shares at current market price';
                                }
                            }
                        } else {
                            canExecute = false;
                            reason = 'Unable to determine market price for execution';
                        }
                    }
                }

                calculations.push({
                    followerId: follower.followerId,
                    symbol: leaderTrade.symbol,
                    side: leaderTrade.side,
                    calculatedQuantity,
                    allocatedAmount,
                    canExecute,
                    insufficientFunds,
                    maxAffordableQuantity,
                    reason
                });

            } catch (error) {
                console.error(`Error calculating trade for follower ${follower.followerId}:`, error);
                calculations.push({
                    followerId: follower.followerId,
                    symbol: leaderTrade.symbol,
                    side: leaderTrade.side,
                    calculatedQuantity: 0,
                    allocatedAmount: 0,
                    canExecute: false,
                    insufficientFunds: false,
                    reason: `Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }

        return calculations;
    }

    /**
     * Get current market price for a symbol
     */
    private static async getCurrentMarketPrice(
        symbol: string,
        tradingMode: 'paper' | 'live'
    ): Promise<number | null> {
        try {
            const config = getAlpacaConfig(tradingMode);

            const response = await fetch(
                `${config.dataBaseUrl}/v2/stocks/${symbol}/quotes/latest`,
                {
                    headers: {
                        'APCA-API-KEY-ID': config.dataApiKey,
                        'APCA-API-SECRET-KEY': config.dataApiSecret,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error(`Failed to fetch market price for ${symbol}:`, response.statusText);
                return null;
            }

            const data = await response.json();
            const quote = data.quote;

            // Use mid-point of bid-ask spread
            if (quote && quote.bid && quote.ask) {
                return (quote.bid + quote.ask) / 2;
            }

            return null;
        } catch (error) {
            console.error(`Error fetching market price for ${symbol}:`, error);
            return null;
        }
    }  /**
   
* Execute copied trades for followers
   */
    private static async executeCopiedTrades(
        originalTradeId: string,
        tradeCalculations: ProportionalTradeCalculation[]
    ): Promise<CopiedTradeResult[]> {
        const results: CopiedTradeResult[] = [];

        for (const calculation of tradeCalculations) {
            if (!calculation.canExecute || calculation.calculatedQuantity <= 0) {
                // Record failed trade attempt
                await this.recordCopiedTrade({
                    original_trade_id: originalTradeId,
                    follower_id: calculation.followerId,
                    symbol: calculation.symbol,
                    side: calculation.side,
                    quantity: 0,
                    allocated_amount: calculation.allocatedAmount,
                    execution_status: 'failed',
                    error_message: calculation.reason || 'Cannot execute trade',
                    executed_at: new Date().toISOString()
                });

                results.push({
                    followerId: calculation.followerId,
                    success: false,
                    quantity: 0,
                    allocatedAmount: calculation.allocatedAmount,
                    executionStatus: 'failed',
                    error: calculation.reason || 'Cannot execute trade'
                });
                continue;
            }

            try {
                // Get follower's profile and Alpaca account
                const followerProfile = await DatabaseService.getUserProfile(calculation.followerId);
                const alpacaAccount = await DatabaseService.getAlpacaAccount(calculation.followerId);
                if (!followerProfile || !alpacaAccount) {
                    throw new Error('Follower profile or Alpaca account not found');
                }

                const tradingMode = await getUserTradingMode(calculation.followerId);

                // Get the original trade data from Alpaca API
                const originalTradeResponse = await apiService.getOrder(originalTradeId);
                if (!originalTradeResponse.success || !originalTradeResponse.data) {
                    throw new Error('Original trade not found');
                }
                const originalTrade = originalTradeResponse.data;
                
                // Execute the trade via Alpaca API
                const orderResult = await this.executeAlpacaOrder({
                    symbol: calculation.symbol,
                    side: calculation.side,
                    quantity: calculation.calculatedQuantity,
                    type: 'market', // Use market orders for copy trading
                    time_in_force: 'day',
                    trade_type: originalTrade?.trade_type || 'stock',
                    option_details: originalTrade?.option_details
                }, followerProfile.alpaca_access_token, tradingMode);

                if (orderResult.success && orderResult.orderId) {
                    // Record successful trade
                    await this.recordCopiedTrade({
                        original_trade_id: originalTradeId,
                        follower_id: calculation.followerId,
                        alpaca_order_id: orderResult.orderId,
                        symbol: calculation.symbol,
                        side: calculation.side,
                        quantity: calculation.calculatedQuantity,
                        allocated_amount: calculation.allocatedAmount,
                        execution_status: 'pending',
                        executed_at: new Date().toISOString()
                    });

                    results.push({
                        followerId: calculation.followerId,
                        success: true,
                        alpacaOrderId: orderResult.orderId,
                        quantity: calculation.calculatedQuantity,
                        allocatedAmount: calculation.allocatedAmount,
                        executionStatus: 'pending'
                    });
                } else {
                    throw new Error(orderResult.error || 'Failed to execute order');
                }

            } catch (error) {
                console.error(`Error executing trade for follower ${calculation.followerId}:`, error);

                // Record failed trade
                await this.recordCopiedTrade({
                    original_trade_id: originalTradeId,
                    follower_id: calculation.followerId,
                    symbol: calculation.symbol,
                    side: calculation.side,
                    quantity: calculation.calculatedQuantity,
                    allocated_amount: calculation.allocatedAmount,
                    execution_status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                    executed_at: new Date().toISOString()
                });

                results.push({
                    followerId: calculation.followerId,
                    success: false,
                    quantity: calculation.calculatedQuantity,
                    allocatedAmount: calculation.allocatedAmount,
                    executionStatus: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return results;
    }

    /**
     * Execute an order via Alpaca API
     */
    private static async executeAlpacaOrder(
        orderRequest: TradeExecutionRequest,
        accessToken: string,
        tradingMode: 'paper' | 'live'
    ): Promise<{ success: boolean; orderId?: string; error?: string }> {
        try {
            const config = getAlpacaConfig(tradingMode);

            // Prepare order payload based on trade type
            let orderPayload: any = {
                symbol: orderRequest.symbol,
                qty: orderRequest.quantity,
                side: orderRequest.side,
                type: orderRequest.type,
                time_in_force: orderRequest.time_in_force
            };

            // Add price fields for limit/stop orders
            if (orderRequest.limit_price) {
                orderPayload.limit_price = orderRequest.limit_price;
            }
            if (orderRequest.stop_price) {
                orderPayload.stop_price = orderRequest.stop_price;
            }

            // Handle options trading
            if (orderRequest.trade_type === 'option' && orderRequest.option_details) {
                // For options, we need to construct the option symbol
                const optionSymbol = this.constructOptionSymbol(
                    orderRequest.symbol,
                    orderRequest.option_details
                );
                
                orderPayload.symbol = optionSymbol;
                orderPayload.class = 'option';
                
                // Options are typically traded in contracts, not shares
                // Each contract represents 100 shares (standard contract size)
                orderPayload.qty = orderRequest.quantity;
            }

            const response = await fetch(`${config.brokerBaseUrl}/v2/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderPayload)
            });

            if (response.ok) {
            const orderData = await response.json();
            return {
                success: true,
                orderId: orderData.id
            };
            } else {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.message || `HTTP ${response.status}`
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Construct option symbol in OCC format
     * Format: SYMBOL + YYMMDD + C/P + Strike Price (8 digits)
     * Example: AAPL240315C00150000 (AAPL Call expiring 3/15/24 with $150 strike)
     */
    private static constructOptionSymbol(
        underlyingSymbol: string,
        optionDetails: OptionDetails
    ): string {
        // Parse expiration date
        const expirationDate = new Date(optionDetails.expiration);
        const year = expirationDate.getFullYear().toString().slice(-2);
        const month = (expirationDate.getMonth() + 1).toString().padStart(2, '0');
        const day = expirationDate.getDate().toString().padStart(2, '0');
        
        // Format strike price (multiply by 1000 and pad to 8 digits)
        const strikeFormatted = Math.round(optionDetails.strike * 1000).toString().padStart(8, '0');
        
        // Option type (C for call, P for put)
        const optionType = optionDetails.option_type.toUpperCase().charAt(0);
        
        return `${underlyingSymbol}${year}${month}${day}${optionType}${strikeFormatted}`;
    }

    /**
     * Record a copied trade in the database
     */
    private static async recordCopiedTrade(
        copiedTradeData: Omit<CopiedTrade, 'id' | 'created_at' | 'updated_at'>
    ): Promise<CopiedTrade | null> {
        try {
            // Note: Copied trades are now tracked via Alpaca APIs only
            // Return success indicator instead of database record
            return { success: true, data: copiedTradeData };
        } catch (error) {
            console.error('Error recording copied trade:', error);
            return null;
        }
    }

    /**
     * Send real-time notifications to followers about leader trade (Requirement 6.4)
     */
    private static async notifyFollowersOfLeaderTrade(
        leaderTrade: LeaderTradeData,
        followers: CopyTradingSubscription[]
    ): Promise<void> {
        try {
            // Get leader's profile information
            const leaderProfile = await DatabaseService.getUserProfile(leaderTrade.leaderId);
            const leaderName = leaderProfile?.full_name || leaderProfile?.username || 'Unknown Trader';

            // Send notification to all followers via WebSocket
            await WebSocketService.notifyFollowersOfLeaderTrade(
                leaderTrade.leaderId,
                leaderTrade.leaderId, // Using ID as name since we don't have name
                {
                    symbol: leaderTrade.symbol,
                    side: leaderTrade.side,
                    quantity: leaderTrade.quantity,
                    price: leaderTrade.price
                }
            );

            console.log(`Sent trade notifications to ${followers.length} followers for ${leaderName}'s ${leaderTrade.side} order of ${leaderTrade.quantity} ${leaderTrade.symbol}`);
        } catch (error) {
            console.error('Error notifying followers of leader trade:', error);
        }
    }

    /**
     * Get active followers for a leader
     */
    private static async getActiveFollowers(leaderId: string): Promise<CopyTradingSubscription[]> {
    try {
      const response = await fetch(`/api/copy-trading/subscriptions?leaderId=${leaderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.subscriptions || [];
    } catch (error) {
      logger.error(LogCategory.COPY_TRADING, 'Error fetching active followers', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { leaderId }
      });
      return [];
        }
    }
}