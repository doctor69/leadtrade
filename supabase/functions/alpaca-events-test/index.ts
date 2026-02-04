// Minimal test version of alpaca-events to debug 503 issue
/// <reference lib="deno.ns" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  console.log('=== Test Function Called ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Returning OPTIONS response')
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  // Return a simple test response
  console.log('Returning test response')
  return new Response(
    JSON.stringify({ 
      message: 'Test function working!',
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
})
