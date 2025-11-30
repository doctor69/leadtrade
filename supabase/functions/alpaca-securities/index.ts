import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  corsHeaders,
  ERROR_CODES
} from '../_shared/index.ts'
import type { AlpacaAsset } from '../_shared/alpaca-client.ts'

// Cache TTL: 24 hours (securities data doesn't change frequently)
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

/**
 * Edge Function handler for Alpaca securities/assets data
 * 
 * GET: Retrieves all available securities with caching
 * 
 * Query Parameters:
 * - status: 'active' | 'inactive' (default: 'active')
 * - asset_class: 'us_equity' | 'crypto' | 'us_option'
 * - exchange: specific exchange filter
 * - force_refresh: 'true' to bypass cache
 * 
 * Features:
 * - 24-hour caching to minimize API calls
 * - Comprehensive asset information
 * - Filtering capabilities
 * - Force refresh option
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
      console.log('Processing securities data request')
      
      // Parse URL and extract query parameters
      const url = new URL(req.url)
      const queryParams: Record<string, string> = {}
      url.searchParams.forEach((value, key) => {
        queryParams[key] = value
      })

      const {
        status = 'active',
        asset_class,
        exchange,
        force_refresh
      } = queryParams

      // Check database cache first
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const now = Date.now()
      const cacheExpiry = new Date(now - CACHE_TTL)

      // Check if we have recent cached data and should use it
      if (force_refresh !== 'true') {
        console.log('🔍 Checking database cache for securities data')
        
        let query = supabase
          .from('securities_cache')
          .select('*')
          .gte('last_synced_at', cacheExpiry.toISOString())

        // Apply filters
        if (status) {
          query = query.eq('status', status)
        }
        if (asset_class) {
          query = query.eq('asset_class', asset_class)
        }
        if (exchange) {
          query = query.eq('exchange', exchange)
        }

        const { data: cachedAssets, error: cacheError } = await query

        if (!cacheError && cachedAssets && cachedAssets.length > 0) {
          console.log(`✅ Using cached securities data (${cachedAssets.length} assets)`)
          
          // Convert database format to API format
          const apiAssets: AlpacaAsset[] = cachedAssets.map(asset => ({
            id: asset.asset_id,
            class: asset.asset_class as 'us_equity' | 'crypto' | 'us_option',
            exchange: asset.exchange,
            symbol: asset.symbol,
            name: asset.name,
            status: asset.status as 'active' | 'inactive',
            tradable: asset.tradable,
            marginable: asset.marginable,
            shortable: asset.shortable,
            easy_to_borrow: asset.easy_to_borrow,
            fractionable: asset.fractionable,
            min_order_size: asset.min_order_size,
            min_trade_increment: asset.min_trade_increment,
            price_increment: asset.price_increment,
            maintenance_margin_requirement: asset.maintenance_margin_requirement,
            attributes: asset.attributes || []
          }))

          return createSuccessResponse({
            assets: apiAssets,
            total_count: apiAssets.length,
            cached: true,
            cache_timestamp: cachedAssets[0]?.last_synced_at,
            filters_applied: {
              status: status !== 'active' ? status : undefined,
              asset_class,
              exchange
            }
          })
        }
      }

      console.log('🔄 Fetching fresh securities data from Alpaca API')

      // Create Alpaca client (no auth context needed for public assets endpoint)
      const alpacaClient = new AlpacaClient(
        {
          userId: 'system',
          sessionToken: '',
          isAuthenticated: false,
          tradingMode: 'paper', // Use paper mode for assets endpoint
          alpacaAccessToken: ''
        },
        (message: string, data?: any) => {
          console.log(`[AlpacaClient] ${message}`, data ? JSON.stringify(data) : '')
        }
      )

      // Fetch all assets from Alpaca
      const startTime = Date.now()
      const response = await alpacaClient.getAssets({
        status: 'active' // Always fetch active assets for cache
      })
      const fetchTime = Date.now() - startTime

      if (!response.success) {
        console.error('Failed to fetch securities data:', response.error)
        return createErrorResponse(
          {
            code: response.error?.code || ERROR_CODES.ALPACA_API_ERROR,
            message: response.error?.message || 'Failed to fetch securities data',
            details: response.error?.details
          },
          response.error?.status || 500
        )
      }

      const allAssets = response.data || []
      
      // Update database cache
      console.log(`💾 Updating database cache with ${allAssets.length} securities`)
      
      // Clear old cache data
      await supabase.from('securities_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      
      // Insert new data in batches
      const batchSize = 1000
      for (let i = 0; i < allAssets.length; i += batchSize) {
        const batch = allAssets.slice(i, i + batchSize)
        const dbRecords = batch.map(asset => ({
          asset_id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          asset_class: asset.class,
          exchange: asset.exchange,
          status: asset.status,
          tradable: asset.tradable,
          marginable: asset.marginable,
          shortable: asset.shortable,
          easy_to_borrow: asset.easy_to_borrow,
          fractionable: asset.fractionable,
          min_order_size: asset.min_order_size,
          min_trade_increment: asset.min_trade_increment,
          price_increment: asset.price_increment,
          maintenance_margin_requirement: asset.maintenance_margin_requirement,
          attributes: asset.attributes || [],
          last_synced_at: new Date().toISOString()
        }))

        const { error: insertError } = await supabase
          .from('securities_cache')
          .insert(dbRecords)

        if (insertError) {
          console.error(`Failed to cache batch ${i / batchSize + 1}:`, insertError)
        }
      }

      console.log(`✅ Cached ${allAssets.length} securities in database (fetch time: ${fetchTime}ms)`)

      // Apply filters to the fresh data
      let filteredData = allAssets
      
      if (status !== 'active') {
        filteredData = filteredData.filter(asset => asset.status === status)
      }
      
      if (asset_class) {
        filteredData = filteredData.filter(asset => asset.class === asset_class)
      }
      
      if (exchange) {
        filteredData = filteredData.filter(asset => asset.exchange === exchange)
      }

      // Prepare response with metadata
      const responseData = {
        assets: filteredData,
        total_count: filteredData.length,
        total_available: allAssets.length,
        cached: false,
        fetch_time_ms: fetchTime,
        cache_expires_at: new Date(now + CACHE_TTL).toISOString(),
        filters_applied: {
          status: status !== 'active' ? status : undefined,
          asset_class,
          exchange
        },
        asset_classes: [...new Set(allAssets.map(asset => asset.class))],
        exchanges: [...new Set(allAssets.map(asset => asset.exchange))],
        statistics: {
          tradable: allAssets.filter(asset => asset.tradable).length,
          marginable: allAssets.filter(asset => asset.marginable).length,
          shortable: allAssets.filter(asset => asset.shortable).length,
          fractionable: allAssets.filter(asset => asset.fractionable).length,
          by_class: Object.fromEntries(
            [...new Set(allAssets.map(asset => asset.class))].map(cls => [
              cls,
              allAssets.filter(asset => asset.class === cls).length
            ])
          ),
          by_exchange: Object.fromEntries(
            [...new Set(allAssets.map(asset => asset.exchange))].map(exchange => [
              exchange,
              allAssets.filter(asset => asset.exchange === exchange).length
            ])
          )
        }
      }

      return createSuccessResponse(responseData)

    } catch (error) {
      console.error('Unexpected error in securities endpoint:', error)
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