/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import { AlpacaClient } from '../_shared/alpaca-client.ts'
import { authenticateRequest } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the request
    const authContext = await authenticateRequest(req)
    if (!authContext) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Alpaca client
    const alpacaClient = new AlpacaClient(authContext)
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)

    // Route handling
    if (req.method === 'POST') {
      // POST / - Create instant funding request
      if (pathParts.length === 2 && pathParts[1] === 'alpaca-instant-funding') {
        const body = await req.json()
        
        const response = await alpacaClient.brokerRequest('/v1/instant_funding', {
          method: 'POST',
          body
        })

        if (!response.success) {
          return new Response(
            JSON.stringify({ error: response.error?.message || 'Failed to create instant funding request' }),
            { status: response.error?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(response.data),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // POST /settlements - Create settlement
      if (pathParts.length === 3 && pathParts[1] === 'alpaca-instant-funding' && pathParts[2] === 'settlements') {
        const body = await req.json()
        
        const response = await alpacaClient.brokerRequest('/v1/instant_funding/settlements', {
          method: 'POST',
          body
        })

        if (!response.success) {
          return new Response(
            JSON.stringify({ error: response.error?.message || 'Failed to create settlement' }),
            { status: response.error?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(response.data),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (req.method === 'GET') {
      // GET /limits - Get instant funding limits
      if (pathParts.length === 3 && pathParts[1] === 'alpaca-instant-funding' && pathParts[2] === 'limits') {
        const response = await alpacaClient.brokerRequest('/v1/instant_funding/limits')

        if (!response.success) {
          return new Response(
            JSON.stringify({ error: response.error?.message || 'Failed to retrieve instant funding limits' }),
            { status: response.error?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(response.data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // GET /reports - Generate instant funding reports
      if (pathParts.length === 3 && pathParts[1] === 'alpaca-instant-funding' && pathParts[2] === 'reports') {
        const params: Record<string, string> = {}
        
        // Extract query parameters
        const reportType = url.searchParams.get('report_type')
        const systemDate = url.searchParams.get('system_date')
        const accountNo = url.searchParams.get('account_no')
        
        if (reportType) params.report_type = reportType
        if (systemDate) params.system_date = systemDate
        if (accountNo) params.account_no = accountNo

        const response = await alpacaClient.brokerRequest('/v1/instant_funding/reports', {
          params
        })

        if (!response.success) {
          return new Response(
            JSON.stringify({ error: response.error?.message || 'Failed to generate instant funding report' }),
            { status: response.error?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(response.data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // GET /:id - Get specific instant funding details
      if (pathParts.length === 3 && pathParts[1] === 'alpaca-instant-funding') {
        const fundingId = pathParts[2]
        
        // Skip if it's a known sub-route
        if (fundingId === 'limits' || fundingId === 'reports' || fundingId === 'settlements') {
          return new Response(
            JSON.stringify({ error: 'Not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        const response = await alpacaClient.brokerRequest(`/v1/instant_funding/${fundingId}`)

        if (!response.success) {
          return new Response(
            JSON.stringify({ error: response.error?.message || 'Failed to retrieve instant funding details' }),
            { status: response.error?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(response.data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in instant funding function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
