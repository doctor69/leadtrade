/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import { AlpacaClient } from '../_shared/alpaca-client.ts'
import { authenticateRequest, type AuthContext } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Authenticate request
    const authContext = await authenticateRequest(req)
    if (!authContext.authenticated || !authContext.user) {
      return errorResponse('Unauthorized', 401)
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const method = req.method

    // Initialize Alpaca client
    const alpacaClient = new AlpacaClient(authContext)

    // Route: POST /v1/rebalancing/portfolios - Create portfolio
    if (method === 'POST' && pathParts[pathParts.length - 1] === 'portfolios') {
      const body = await req.json()
      
      // Validate required fields
      if (!body.name || !body.weights || typeof body.cooldown_days !== 'number') {
        return errorResponse('Missing required fields: name, weights, cooldown_days', 400)
      }

      // Validate weights sum to 1.0 (100%)
      const totalWeight = Object.values(body.weights as Record<string, number>).reduce(
        (sum, weight) => sum + weight,
        0
      )
      if (Math.abs(totalWeight - 1.0) > 0.001) {
        return errorResponse('Portfolio weights must sum to 1.0 (100%)', 400)
      }

      const result = await alpacaClient.createRebalancingPortfolio(body)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to create rebalancing portfolio',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: GET /v1/rebalancing/portfolios - List portfolios
    if (method === 'GET' && pathParts[pathParts.length - 1] === 'portfolios') {
      const result = await alpacaClient.listRebalancingPortfolios()
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to list rebalancing portfolios',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: GET /v1/rebalancing/portfolios/{portfolio_id} - Get portfolio
    if (method === 'GET' && pathParts.length >= 3 && pathParts[pathParts.length - 2] === 'portfolios') {
      const portfolioId = pathParts[pathParts.length - 1]
      
      if (portfolioId === 'portfolios') {
        return errorResponse('Portfolio ID is required', 400)
      }

      const result = await alpacaClient.getRebalancingPortfolio(portfolioId)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to get rebalancing portfolio',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: PATCH /v1/rebalancing/portfolios/{portfolio_id} - Update portfolio
    if (method === 'PATCH' && pathParts.length >= 3 && pathParts[pathParts.length - 2] === 'portfolios') {
      const portfolioId = pathParts[pathParts.length - 1]
      const body = await req.json()

      // Validate weights if provided
      if (body.weights) {
        const totalWeight = Object.values(body.weights as Record<string, number>).reduce(
          (sum, weight) => sum + weight,
          0
        )
        if (Math.abs(totalWeight - 1.0) > 0.001) {
          return errorResponse('Portfolio weights must sum to 1.0 (100%)', 400)
        }
      }

      const result = await alpacaClient.updateRebalancingPortfolio(portfolioId, body)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to update rebalancing portfolio',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: DELETE /v1/rebalancing/portfolios/{portfolio_id} - Delete portfolio
    if (method === 'DELETE' && pathParts.length >= 3 && pathParts[pathParts.length - 2] === 'portfolios') {
      const portfolioId = pathParts[pathParts.length - 1]

      const result = await alpacaClient.deleteRebalancingPortfolio(portfolioId)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to delete rebalancing portfolio',
          result.error?.status || 500
        )
      }

      return successResponse({ message: 'Portfolio deleted successfully' })
    }

    // Route: POST /v1/rebalancing/portfolios/{portfolio_id}/subscriptions - Create subscription
    if (method === 'POST' && pathParts[pathParts.length - 1] === 'subscriptions') {
      const portfolioId = pathParts[pathParts.length - 2]
      const body = await req.json()

      // Validate required fields
      if (!body.account_id || typeof body.allocation_percentage !== 'number') {
        return errorResponse('Missing required fields: account_id, allocation_percentage', 400)
      }

      // Validate allocation percentage (0-100)
      if (body.allocation_percentage < 0 || body.allocation_percentage > 100) {
        return errorResponse('Allocation percentage must be between 0 and 100', 400)
      }

      const result = await alpacaClient.createRebalancingSubscription(portfolioId, body)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to create rebalancing subscription',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: GET /v1/rebalancing/portfolios/{portfolio_id}/subscriptions - List subscriptions
    if (method === 'GET' && pathParts[pathParts.length - 1] === 'subscriptions') {
      const portfolioId = pathParts[pathParts.length - 2]

      const result = await alpacaClient.listRebalancingSubscriptions(portfolioId)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to list rebalancing subscriptions',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: GET /v1/rebalancing/portfolios/{portfolio_id}/subscriptions/{subscription_id}
    if (method === 'GET' && pathParts.length >= 5 && pathParts[pathParts.length - 2] === 'subscriptions') {
      const portfolioId = pathParts[pathParts.length - 4]
      const subscriptionId = pathParts[pathParts.length - 1]

      const result = await alpacaClient.getRebalancingSubscription(portfolioId, subscriptionId)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to get rebalancing subscription',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: PATCH /v1/rebalancing/portfolios/{portfolio_id}/subscriptions/{subscription_id}
    if (method === 'PATCH' && pathParts.length >= 5 && pathParts[pathParts.length - 2] === 'subscriptions') {
      const portfolioId = pathParts[pathParts.length - 4]
      const subscriptionId = pathParts[pathParts.length - 1]
      const body = await req.json()

      // Validate allocation percentage if provided
      if (body.allocation_percentage !== undefined) {
        if (body.allocation_percentage < 0 || body.allocation_percentage > 100) {
          return errorResponse('Allocation percentage must be between 0 and 100', 400)
        }
      }

      const result = await alpacaClient.updateRebalancingSubscription(
        portfolioId,
        subscriptionId,
        body
      )
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to update rebalancing subscription',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: DELETE /v1/rebalancing/portfolios/{portfolio_id}/subscriptions/{subscription_id}
    if (method === 'DELETE' && pathParts.length >= 5 && pathParts[pathParts.length - 2] === 'subscriptions') {
      const portfolioId = pathParts[pathParts.length - 4]
      const subscriptionId = pathParts[pathParts.length - 1]

      const result = await alpacaClient.deleteRebalancingSubscription(portfolioId, subscriptionId)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to delete rebalancing subscription',
          result.error?.status || 500
        )
      }

      return successResponse({ message: 'Subscription deleted successfully' })
    }

    // Route: POST /v1/rebalancing/runs - Create rebalancing run
    if (method === 'POST' && pathParts[pathParts.length - 1] === 'runs') {
      const body = await req.json()

      // Validate required fields
      if (!body.portfolio_id) {
        return errorResponse('Missing required field: portfolio_id', 400)
      }

      const result = await alpacaClient.createRebalancingRun(body)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to create rebalancing run',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: GET /v1/rebalancing/runs - List rebalancing runs
    if (method === 'GET' && pathParts[pathParts.length - 1] === 'runs') {
      const params: Record<string, string> = {}
      
      if (url.searchParams.has('portfolio_id')) {
        params.portfolio_id = url.searchParams.get('portfolio_id')!
      }
      if (url.searchParams.has('status')) {
        params.status = url.searchParams.get('status')!
      }
      if (url.searchParams.has('limit')) {
        params.limit = url.searchParams.get('limit')!
      }
      if (url.searchParams.has('offset')) {
        params.offset = url.searchParams.get('offset')!
      }

      const result = await alpacaClient.listRebalancingRuns(
        Object.keys(params).length > 0 ? params : undefined
      )
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to list rebalancing runs',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: GET /v1/rebalancing/runs/{run_id} - Get rebalancing run
    if (method === 'GET' && pathParts.length >= 3 && pathParts[pathParts.length - 2] === 'runs') {
      const runId = pathParts[pathParts.length - 1]

      if (runId === 'runs') {
        return errorResponse('Run ID is required', 400)
      }

      const result = await alpacaClient.getRebalancingRun(runId)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to get rebalancing run',
          result.error?.status || 500
        )
      }

      return successResponse(result.data)
    }

    // Route: DELETE /v1/rebalancing/runs/{run_id} - Cancel rebalancing run
    if (method === 'DELETE' && pathParts.length >= 3 && pathParts[pathParts.length - 2] === 'runs') {
      const runId = pathParts[pathParts.length - 1]

      const result = await alpacaClient.cancelRebalancingRun(runId)
      
      if (!result.success) {
        return errorResponse(
          result.error?.message || 'Failed to cancel rebalancing run',
          result.error?.status || 500
        )
      }

      return successResponse({ message: 'Rebalancing run canceled successfully' })
    }

    return errorResponse('Not found', 404)
  } catch (error) {
    console.error('Error in alpaca-rebalancing function:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})
