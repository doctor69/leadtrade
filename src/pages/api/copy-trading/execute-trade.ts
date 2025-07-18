import type { APIRoute } from 'astro';
import { z } from 'zod';
import { TradeExecutionEngine } from '../../../lib/trade-execution-engine';
import type { LeaderTradeData } from '../../../lib/trade-execution-engine';

// Schema for trade execution request
const executeTradeSchema = z.object({
  leaderId: z.string().min(1, 'Leader ID is required'),
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['buy', 'sell'], { required_error: 'Side must be buy or sell' }),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive().optional(),
  tradeType: z.enum(['stock', 'option']).default('stock'),
  optionDetails: z.object({
    strike: z.number().positive(),
    expiration: z.string(),
    option_type: z.enum(['call', 'put'])
  }).optional(),
  portfolioPercentage: z.number().min(0.01).max(100, 'Portfolio percentage must be between 0.01 and 100'),
  alpacaOrderId: z.string().min(1, 'Alpaca order ID is required')
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const validatedTrade = executeTradeSchema.parse(body);

    // Convert validated data to LeaderTradeData
    const leaderTrade: LeaderTradeData = {
      leaderId: validatedTrade.leaderId,
      symbol: validatedTrade.symbol,
      side: validatedTrade.side,
      quantity: validatedTrade.quantity,
      price: validatedTrade.price,
      tradeType: validatedTrade.tradeType,
      optionDetails: validatedTrade.optionDetails,
      portfolioPercentage: validatedTrade.portfolioPercentage,
      alpacaOrderId: validatedTrade.alpacaOrderId
    };

    // Execute proportional trades for all followers
    const result = await TradeExecutionEngine.executeProportionalTrades(leaderTrade);

    if (result.success || result.copiedTrades.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Trade execution completed',
        data: {
          originalTradeId: result.originalTradeId,
          copiedTrades: result.copiedTrades,
          totalFollowers: result.copiedTrades.length,
          successfulCopies: result.copiedTrades.filter(trade => trade.success).length,
          failedCopies: result.copiedTrades.filter(trade => !trade.success).length
        },
        errors: result.errors
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: 'Trade execution failed',
        errors: result.errors
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid trade data',
        details: error.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error('Trade execution API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};