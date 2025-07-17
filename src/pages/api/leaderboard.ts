import type { APIRoute } from 'astro';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';

const leaderboardQuerySchema = z.object({
  timeframe: z.enum(['daily', 'weekly', 'monthly', 'all']).default('weekly'),
  limit: z.number().min(1).max(100).default(50),
});

export const GET: APIRoute = async ({ url }) => {
  try {
    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Convert string numbers to actual numbers
    if (queryParams.limit) queryParams.limit = parseInt(queryParams.limit as string);

    const validatedQuery = leaderboardQuerySchema.parse(queryParams);

    // Calculate date range based on timeframe
    let dateFilter = '';
    const now = new Date();
    
    switch (validatedQuery.timeframe) {
      case 'daily':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = `AND p.updated_at >= '${today.toISOString()}'`;
        break;
      case 'weekly':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = `AND p.updated_at >= '${weekAgo.toISOString()}'`;
        break;
      case 'monthly':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = `AND p.updated_at >= '${monthAgo.toISOString()}'`;
        break;
      case 'all':
      default:
        dateFilter = '';
        break;
    }

    // Query to get leaderboard data
    const { data: leaderboardData, error } = await supabase
      .from('portfolios')
      .select(`
        user_id,
        total_value,
        cash,
        updated_at,
        profiles!inner(username, full_name)
      `)
      .gte('total_value', 0)
      .order('total_value', { ascending: false })
      .limit(validatedQuery.limit);

    if (error) {
      console.error('Leaderboard query error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch leaderboard data',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Transform data to match the expected format
    const transformedData = leaderboardData.map((entry, index) => {
      const startingValue = 100000; // Default starting portfolio value
      const currentValue = entry.total_value || startingValue;
      const totalReturn = currentValue - startingValue;
      const totalReturnPercent = (totalReturn / startingValue) * 100;
      const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;

      return {
        id: entry.user_id,
        username: profile?.username || profile?.full_name || 'Anonymous',
        totalReturn: totalReturn,
        totalReturnPercent: totalReturnPercent,
        portfolioValue: currentValue,
        tradesCount: Math.floor(Math.random() * 50) + 10, // TODO: Calculate from actual trades
        winRate: Math.random() * 40 + 50, // TODO: Calculate from actual trades
        rank: index + 1,
      };
    });

    return new Response(JSON.stringify({
      success: true,
      data: transformedData,
      timeframe: validatedQuery.timeframe,
      total: transformedData.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid query parameters',
        details: error.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error('Leaderboard API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};