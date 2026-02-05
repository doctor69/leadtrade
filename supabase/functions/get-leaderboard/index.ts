import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { corsHeaders } from '../_shared/cors.ts';

interface LeaderboardEntry {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
    portfolio_value: number;
    total_return: number;
    total_return_percent: number;
    trades_count: number;
    win_rate: number;
    show_asset_amounts: boolean;
    followers_count: number;
    avg_hold_time_hours: number | null;
    risk_level: string | null;
    trading_style: string | null;
    last_active: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        );

        // Parse query parameters
        const url = new URL(req.url);
        const timeframe = url.searchParams.get('timeframe') || 'all';
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);

        // Call the database function to get leaderboard data
        const { data, error } = await supabaseClient.rpc('get_leaderboard_with_stats', {
            p_timeframe: timeframe,
            p_limit: limit
        });

        if (error) {
            console.error('Error fetching leaderboard:', error);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: { message: error.message }
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        // Transform data to match the expected format
        const leaderboardData: LeaderboardEntry[] = (data || []).map((entry: any, index: number) => {
            // Prefer full_name if username looks like an email
            const displayName = entry.full_name ||
                (entry.username && !entry.username.includes('@') ? entry.username : null) ||
                entry.username ||
                'Anonymous';

            return {
                id: entry.user_id,  // Use user_id instead of leaderboard_stats.id
                username: displayName,
                totalReturn: parseFloat(entry.total_return || 0),
                totalReturnPercent: parseFloat(entry.total_return_percent || 0),
                portfolioValue: parseFloat(entry.portfolio_value || 0),
                tradesCount: entry.trades_count || 0,
                winRate: parseFloat(entry.win_rate || 0),
                rank: index + 1,
                showAssetAmounts: entry.show_asset_amounts || false,
                followers: entry.followers_count || 0,
                avgHoldTime: entry.avg_hold_time_hours || null,
                riskLevel: entry.risk_level || null,
                tradingStyle: entry.trading_style || null,
                lastActive: entry.last_active || null
            };
        });

        return new Response(
            JSON.stringify({
                success: true,
                data: leaderboardData
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: { message: error.message || 'Internal server error' }
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
