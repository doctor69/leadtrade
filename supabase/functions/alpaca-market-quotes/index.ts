import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'

/**
 * Alpaca Market Quotes - Free Market Data API
 * No authentication required - uses Alpaca's free data feed
 */
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const symbols = url.searchParams.get('symbols')
    const feed = url.searchParams.get('feed') || 'iex' // Default to IEX (free)

    if (!symbols) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'symbols parameter is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Use Alpaca's free market data API (no auth required for IEX feed)
    const alpacaDataUrl = `https://data.alpaca.markets/v2/stocks/quotes/latest?symbols=${symbols}&feed=${feed}`
    
    const response = await fetch(alpacaDataUrl, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Alpaca API error:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Alpaca API error: ${response.status} ${response.statusText}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    
    // Transform the data to a more usable format
    const quotes = Object.entries(data.quotes || {}).map(([symbol, quote]: [string, any]) => ({
      symbol,
      bid: quote.bp || 0,
      ask: quote.ap || 0,
      bid_size: quote.bs || 0,
      ask_size: quote.as || 0,
      latest_trade: {
        price: quote.ap || quote.bp || 0, // Use ask price as latest trade price
        size: quote.as || 0,
        timestamp: quote.t || new Date().toISOString()
      },
      timestamp: quote.t || new Date().toISOString()
    }))

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          quotes,
          feed,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Market quotes error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
