// Proportional Trade Execution Engine for Copy Trading
import { DatabaseService } from './database';
import { getAlpacaConfig, getUserTradingMode } from './trading-config';
import { WebSocketService } from './websocket-service';
import type {
    TradeExecution,
    CopiedTrade,
    CopyTradingSubscription,
    TradeExecutionRequest,
    OptionDetails
} from '../types/trading';

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

export interface FollowerAccountInfo {
    userId: string;
    portfolioValue: number;
    buyingPower: number;
    allocationPercentage: number;
    tradingMode: 'paper' | 'live';
    alpacaTokens: {
        accessToken: string;
        refreshToken?: string;
    };
}

export interface ProportionalTradeCalculation {
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

export interface TradeExecutionResult {
    success: boolean;
    originalTradeId: string;
    copiedTrades: CopiedTradeResult[];
    errors: string[];
}

export interface CopiedTradeResult {
    followerId: string;
    success: boolean;
    alpacaOrderId?: string;
    quantity: number;
    allocatedAmount: number;
    executionStatus: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'failed';
    error?: string;
}

export class TradeExecutionEngine {
    /**
     * Main entry point for executing proportional trades
     */
    static async executeProportionalTrades(
        leaderTrade: LeaderTradeData
    ): Promise<TradeExecutionResult> {
        const result: TradeExecutionResult = {
            success: false,
            originalTradeId: leaderTrade.alpacaOrderId,
            copiedTrades: [],
            errors: []
        };

        try {
            // 1. Record the leader's trade execution
            const tradeExecution = await this.recordLeaderTrade(leaderTrade);
            if (!tradeExecution) {
                result.errors.push('Failed to record leader trade');
                return result;
            }

            // 2. Get all active followers for this leader
            const followers = await DatabaseService.getLeaderFollowers(leaderTrade.leaderId);
            if (followers.length === 0) {
                result.success = true; // No followers to copy to
                return result;
            }

            // 3. Get follower account information
            const followerAccounts = await this.getFollowerAccountInfo(followers);

            // 4. Calculate proportional trades for each follower
            const tradeCalculations = await this.calculateProportionalTrades(
                leaderTrade,
                followerAccounts
            );

            // 5. Execute trades for each follower
            const copiedTradeResults = await this.executeCopiedTrades(
                tradeExecution.id,
                tradeCalculations
            );

            result.copiedTrades = copiedTradeResults;
            result.success = copiedTradeResults.some(trade => trade.success);

            // 6. Send real-time notifications to followers (Requirement 6.4)
            await this.notifyFollowersOfLeaderTrade(leaderTrade, followers);

            return result;
        } catch (error) {
            console.error('Error in executeProportionalTrades:', error);
            result.errors.push(error instanceof Error ? error.message : 'Unknown error');
            return result;
        }
    }  /**
 
  * Record the leader's trade execution in the database
   */
    private static async recordLeaderTrade(
        leaderTrade: LeaderTradeData
    ): Promise<TradeExecution | null> {
        try {
            const tradeExecution = await DatabaseService.createTradeExecution({
                original_trade_id: leaderTrade.alpacaOrderId,
                leader_id: leaderTrade.leaderId,
                symbol: leaderTrade.symbol,
                side: leaderTrade.side,
                quantity: leaderTrade.quantity,
                price: leaderTrade.price,
                trade_type: leaderTrade.tradeType,
                option_details: leaderTrade.optionDetails,
                portfolio_percentage: leaderTrade.portfolioPercentage,
                executed_at: new Date().toISOString()
            });

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
                // Get user profile with Alpaca tokens
                const profile = await DatabaseService.getUserProfile(follower.follower_id);
                if (!profile || !profile.alpaca_access_token) {
                    console.warn(`Follower ${follower.follower_id} has no Alpaca tokens`);
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
                    userId: follower.follower_id,
                    portfolioValue: accountData.portfolioValue,
                    buyingPower: accountData.buyingPower,
                    allocationPercentage: follower.allocation_percentage,
                    tradingMode,
                    alpacaTokens: {
                        accessToken: profile.alpaca_access_token,
                        refreshToken: profile.alpaca_refresh_token
                    }
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
                    const premium = leaderTrade.price || leaderTrade.optionDetails.premium || 0;
                    const contractSize = leaderTrade.optionDetails.contract_size || 100;
                    
                    if (premium > 0) {
                        // Calculate number of contracts based on proportional amount
                        // For options: cost = contracts × premium × contract_size
                        const costPerContract = premium * contractSize;
                        calculatedQuantity = Math.floor(proportionalAmount / costPerContract);
                        
                        const requiredAmount = calculatedQuantity * costPerContract;
                        
                        if (requiredAmount <= follower.buyingPower) {
                            canExecute = true;
                        } else {
                            // Calculate maximum affordable contracts
                            maxAffordableQuantity = Math.floor(follower.buyingPower / costPerContract);
                            
                            if (maxAffordableQuantity > 0) {
                                calculatedQuantity = maxAffordableQuantity;
                                canExecute = true;
                                insufficientFunds = true;
                                reason = `Insufficient funds: executing ${maxAffordableQuantity} contracts instead of ${Math.floor(proportionalAmount / costPerContract)}`;
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
                    followerId: follower.userId,
                    symbol: leaderTrade.symbol,
                    side: leaderTrade.side,
                    calculatedQuantity,
                    allocatedAmount: proportionalAmount,
                    canExecute,
                    insufficientFunds,
                    maxAffordableQuantity,
                    reason
                });

            } catch (error) {
                console.error(`Error calculating trade for follower ${follower.userId}:`, error);
                calculations.push({
                    followerId: follower.userId,
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
                // Get follower's trading mode and tokens
                const followerProfile = await DatabaseService.getUserProfile(calculation.followerId);
                if (!followerProfile || !followerProfile.alpaca_access_token) {
                    throw new Error('Follower profile or tokens not found');
                }

                const tradingMode = await getUserTradingMode(calculation.followerId);

                // Get the original trade data to determine trade type
                const originalTrade = await DatabaseService.getTradeExecution(originalTradeId);
                
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

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Alpaca order execution failed:', errorText);
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }

            const orderData = await response.json();

            return {
                success: true,
                orderId: orderData.id
            };

        } catch (error) {
            console.error('Error executing Alpaca order:', error);
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
            return await DatabaseService.createCopiedTrade(copiedTradeData);
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
                leaderName,
                {
                    symbol: leaderTrade.symbol,
                    side: leaderTrade.side,
                    quantity: leaderTrade.quantity,
                    price: leaderTrade.price,
                }
            );

            console.log(`Sent trade notifications to ${followers.length} followers for ${leaderName}'s ${leaderTrade.side} order of ${leaderTrade.quantity} ${leaderTrade.symbol}`);
        } catch (error) {
            console.error('Error notifying followers of leader trade:', error);
        }
    }
}