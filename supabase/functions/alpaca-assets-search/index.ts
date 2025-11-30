import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  corsHeaders,
  ERROR_CODES
} from '../_shared/index.ts'

/**
 * Edge Function handler for Alpaca assets search
 * 
 * GET: Search tradeable assets/securities with fuzzy matching
 * 
 * Query Parameters:
 * - search: Search term (symbol or company name)
 * - limit: Maximum results to return (default: 50, max: 500)
 * - asset_class: Filter by asset class (us_equity, crypto, us_option)
 * - tradable_only: Only return tradable assets (default: true)
 * 
 * Features:
 * - Fast fuzzy search on symbol and company name
 * - Database-backed for performance
 * - Optimized for trading interfaces
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      return createErrorResponse(
        {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Method not allowed. Only GET requests are supported.'
        },
        405
      )
    }

    try {
      // Parse URL and extract query parameters
      const url = new URL(req.url)
      const queryParams: Record<string, string> = {}
      url.searchParams.forEach((value, key) => {
        queryParams[key] = value
      })

      const {
        search = '',
        limit = '50',
        asset_class,
        tradable_only = 'true'
      } = queryParams

      // Validate limit
      const limitNum = Math.min(parseInt(limit, 10) || 50, 500)
      
      if (!search || search.trim().length < 1) {
        return createErrorResponse(
          {
            code: ERROR_CODES.INVALID_REQUEST,
            message: 'Search parameter is required and must be at least 1 character'
          },
          400
        )
      }

      const searchTerm = search.trim().toUpperCase()
      console.log(`🔍 Searching assets for: "${searchTerm}" (limit: ${limitNum})`)

      // Connect to database
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Build search query
      let query = supabase
        .from('securities_cache')
        .select(`
          asset_id,
          symbol,
          name,
          asset_class,
          exchange,
          tradable,
          marginable,
          shortable,
          fractionable,
          price_increment,
          min_order_size
        `)
        .eq('status', 'active')
        .limit(limitNum)

      // Apply filters
      if (tradable_only === 'true') {
        query = query.eq('tradable', true)
      }

      if (asset_class) {
        query = query.eq('asset_class', asset_class)
      }

      // Search logic: prioritize exact symbol matches, then partial matches
      const { data: exactMatches, error: exactError } = await query
        .eq('symbol', searchTerm)

      if (exactError) {
        console.error('Database search error (exact):', exactError)
        return createErrorResponse(
          {
            code: ERROR_CODES.DATABASE_ERROR,
            message: 'Failed to search securities database',
            details: exactError.message
          },
          500
        )
      }

      let results = exactMatches || []
      let remainingLimit = limitNum - results.length

      // If we need more results, do fuzzy search
      if (remainingLimit > 0) {
        const { data: fuzzyMatches, error: fuzzyError } = await supabase
          .from('securities_cache')
          .select(`
            asset_id,
            symbol,
            name,
            asset_class,
            exchange,
            tradable,
            marginable,
            shortable,
            fractionable,
            price_increment,
            min_order_size
          `)
          .eq('status', 'active')
          .eq('tradable', tradable_only === 'true')
          .neq('symbol', searchTerm) // Exclude exact matches we already have
          .or(`symbol.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
          .limit(remainingLimit)
          .order('symbol')

        if (fuzzyError) {
          console.error('Database search error (fuzzy):', fuzzyError)
        } else {
          results = [...results, ...(fuzzyMatches || [])]
        }
      }

      // Sort results: exact symbol matches first, then by symbol alphabetically
      results.sort((a, b) => {
        if (a.symbol === searchTerm && b.symbol !== searchTerm) return -1
        if (b.symbol === searchTerm && a.symbol !== searchTerm) return 1
        return a.symbol.localeCompare(b.symbol)
      })

      // Format results for trading interface
      const formattedResults = results.map(asset => ({
        id: asset.asset_id,
        symbol: asset.symbol,
        name: asset.name,
        asset_class: asset.asset_class,
        exchange: asset.exchange,
        tradable: asset.tradable,
        marginable: asset.marginable,
        shortable: asset.shortable,
        fractionable: asset.fractionable,
        price_increment: asset.price_increment,
        min_order_size: asset.min_order_size,
        // Add display-friendly fields
        display_name: `${asset.symbol} - ${asset.name}`,
        trading_info: {
          can_trade: asset.tradable,
          can_margin: asset.marginable,
          can_short: asset.shortable,
          fractional: asset.fractionable
        }
      }))

      console.log(`✅ Found ${formattedResults.length} assets matching "${searchTerm}"`)

      return createSuccessResponse({
        assets: formattedResults,
        total_count: formattedResults.length,
        search_term: searchTerm,
        filters_applied: {
          asset_class,
          tradable_only: tradable_only === 'true'
        },
        metadata: {
          exact_matches: exactMatches?.length || 0,
          fuzzy_matches: formattedResults.length - (exactMatches?.length || 0),
          limit: limitNum,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Unexpected error in assets search endpoint:', error)
      return createErrorResponse(
        {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        },
        500
      )
    }
  })
})