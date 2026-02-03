/**
 * Get CORS headers with proper origin handling for credentials
 * When credentials are used, we can't use wildcard '*'
 */
export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || '*'
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// Legacy export - DO NOT USE with credentials
// Use getCorsHeaders(req) instead for proper origin handling
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

export function handleCors(req: Request): Response {
  return new Response('ok', { headers: getCorsHeaders(req) })
}
