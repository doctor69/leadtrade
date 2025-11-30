/**
 * Alpaca Corporate Actions Edge Function
 * 
 * Handles corporate action announcements (dividends, mergers, spinoffs, splits)
 * 
 * Endpoints:
 * - GET /alpaca-corporate-actions - List corporate action announcements
 * - GET /alpaca-corporate-actions?id={id} - Get specific announcement
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

/// <reference lib="deno.ns" />

import { createCorsHeaders, handleCors } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import { AlpacaClient } from '../_shared/alpaca-client.ts'
import { createErrorResponse, createSuccessResponse } from '../_shared/response.ts'
import { logInfo, logError } from '../_shared/logging.ts'

Deno.serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(req)
    if (!authResult.authenticated || !authResult.context) {
      return createErrorResponse('Unauthorized', 401, corsHeaders)
    }

    const { context } = authResult
    const url = new URL(req.url)
    const announcementId = url.searchParams.get('id')

    // Initialize Alpaca client
    const alpacaClient = new AlpacaClient(context, (message, data) => {
      logInfo(message, data)
    })

    // Handle GET requests
    if (req.method === 'GET') {
      // Get specific announcement by ID
      if (announcementId) {
        logInfo('Getting corporate action announcement', { announcementId, userId: context.userId })

        const result = await alpacaClient.getCorporateAction(announcementId)

        if (!result.success) {
          logError('Failed to get corporate action announcement', result.error)
          return createErrorResponse(
            result.error?.message || 'Failed to get corporate action announcement',
            result.error?.status || 500,
            corsHeaders
          )
        }

        return createSuccessResponse(result.data, corsHeaders)
      }

      // List corporate action announcements with filtering
      const params: any = {}
      
      if (url.searchParams.get('ca_types')) params.ca_types = url.searchParams.get('ca_types')!
      if (url.searchParams.get('symbol')) params.symbol = url.searchParams.get('symbol')!
      if (url.searchParams.get('cusip')) params.cusip = url.searchParams.get('cusip')!
      if (url.searchParams.get('date_type')) params.date_type = url.searchParams.get('date_type')!
      if (url.searchParams.get('since')) params.since = url.searchParams.get('since')!
      if (url.searchParams.get('until')) params.until = url.searchParams.get('until')!
      if (url.searchParams.get('page_token')) params.page_token = url.searchParams.get('page_token')!
      if (url.searchParams.get('page_size')) params.page_size = url.searchParams.get('page_size')!

      logInfo('Listing corporate action announcements', { params, userId: context.userId })

      const result = await alpacaClient.getCorporateActions(params)

      if (!result.success) {
        logError('Failed to list corporate action announcements', result.error)
        return createErrorResponse(
          result.error?.message || 'Failed to list corporate action announcements',
          result.error?.status || 500,
          corsHeaders
        )
      }

      return createSuccessResponse(result.data, corsHeaders)
    }

    // Method not allowed
    return createErrorResponse('Method not allowed', 405, corsHeaders)

  } catch (error) {
    logError('Unexpected error in corporate actions function', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      corsHeaders
    )
  }
})
