// Add Deno types reference
/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import {
  validateAuth,
  createAuthErrorResponse,
  type AuthContext
} from '../_shared/auth.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { webSocketManager } from '../_shared/websocket-manager.ts'

/**
 * Edge Function handler for WebSocket market data streaming
 * 
 * Creates streaming endpoint for WebSocket data with session-based connection management
 * Implements symbol subscription management and session validation
 * Tests real-time data streaming
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow GET for WebSocket upgrade
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Method not allowed. Only GET and OPTIONS supported for WebSocket upgrade.',
        code: 'METHOD_NOT_ALLOWED'
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Authenticate user before WebSocket upgrade
    const authResult = await validateAuth(req)
    if ('status' in authResult) {
      return createAuthErrorResponse(authResult)
    }
    const authContext = authResult

    console.log(`WebSocket connection request from user ${authContext.userId} in ${authContext.tradingMode} mode`)

    // Validate Alpaca credentials are available
    const alpacaApiKey = authContext.tradingMode === 'paper'
      ? Deno.env.get('PUBLIC_ALPACA_DATA_API_KEY')
      : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_API_KEY')
    
    const alpacaApiSecret = authContext.tradingMode === 'paper'
      ? Deno.env.get('PUBLIC_ALPACA_DATA_API_SECRET')
      : Deno.env.get('PUBLIC_ALPACA_BROKER_LIVE_API_SECRET')

    if (!alpacaApiKey || !alpacaApiSecret) {
      console.error('Alpaca API credentials not configured')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Alpaca API credentials not configured',
          code: 'MISSING_CREDENTIALS'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Upgrade to WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req)

    // Create WebSocket session using the manager
    const sessionId = await webSocketManager.createSession(authContext, socket)

    // Add session ID to response headers for debugging
    response.headers.set('X-Session-ID', sessionId)

    console.log(`WebSocket session ${sessionId} created for user ${authContext.userId}`)

    return response

  } catch (error) {
    console.error('Error in WebSocket handler:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'WEBSOCKET_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})