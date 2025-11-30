/**
 * Alpaca Rebalancing API Client
 * 
 * Provides functions for managing portfolio rebalancing, subscriptions, and runs.
 * All operations are proxied through Supabase Edge Functions for security.
 */

import { supabase } from './supabase'
import type {
  RebalancingPortfolio,
  CreateRebalancingPortfolioRequest,
  RebalancingSubscription,
  CreateRebalancingSubscriptionRequest,
  RebalancingRun,
  CreateRebalancingRunRequest,
  ListRebalancingRunsParams
} from '../types/trading'

const EDGE_FUNCTION_URL = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-rebalancing`

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    status: number
    message: string
    code?: string
  }
}

/**
 * Make authenticated request to rebalancing Edge Function
 */
async function makeRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return {
        success: false,
        error: {
          status: 401,
          message: 'Not authenticated'
        }
      }
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: {
          status: response.status,
          message: data.error || data.message || 'Request failed'
        }
      }
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Rebalancing API request failed:', error)
    return {
      success: false,
      error: {
        status: 500,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// ============================================================================
// Portfolio Management
// ============================================================================

/**
 * Create a new rebalancing portfolio
 */
export async function createRebalancingPortfolio(
  request: CreateRebalancingPortfolioRequest
): Promise<ApiResponse<RebalancingPortfolio>> {
  return makeRequest<RebalancingPortfolio>('/v1/rebalancing/portfolios', {
    method: 'POST',
    body: JSON.stringify(request)
  })
}

/**
 * Get rebalancing portfolio details
 */
export async function getRebalancingPortfolio(
  portfolioId: string
): Promise<ApiResponse<RebalancingPortfolio>> {
  return makeRequest<RebalancingPortfolio>(`/v1/rebalancing/portfolios/${portfolioId}`)
}

/**
 * List all rebalancing portfolios
 */
export async function listRebalancingPortfolios(): Promise<ApiResponse<RebalancingPortfolio[]>> {
  return makeRequest<RebalancingPortfolio[]>('/v1/rebalancing/portfolios')
}

/**
 * Update a rebalancing portfolio
 */
export async function updateRebalancingPortfolio(
  portfolioId: string,
  updates: Partial<CreateRebalancingPortfolioRequest>
): Promise<ApiResponse<RebalancingPortfolio>> {
  return makeRequest<RebalancingPortfolio>(`/v1/rebalancing/portfolios/${portfolioId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  })
}

/**
 * Delete a rebalancing portfolio
 */
export async function deleteRebalancingPortfolio(
  portfolioId: string
): Promise<ApiResponse<{ message: string }>> {
  return makeRequest<{ message: string }>(`/v1/rebalancing/portfolios/${portfolioId}`, {
    method: 'DELETE'
  })
}

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Create a subscription to a rebalancing portfolio
 */
export async function createRebalancingSubscription(
  portfolioId: string,
  request: CreateRebalancingSubscriptionRequest
): Promise<ApiResponse<RebalancingSubscription>> {
  return makeRequest<RebalancingSubscription>(
    `/v1/rebalancing/portfolios/${portfolioId}/subscriptions`,
    {
      method: 'POST',
      body: JSON.stringify(request)
    }
  )
}

/**
 * List subscriptions for a portfolio
 */
export async function listRebalancingSubscriptions(
  portfolioId: string
): Promise<ApiResponse<RebalancingSubscription[]>> {
  return makeRequest<RebalancingSubscription[]>(
    `/v1/rebalancing/portfolios/${portfolioId}/subscriptions`
  )
}

/**
 * Get subscription details
 */
export async function getRebalancingSubscription(
  portfolioId: string,
  subscriptionId: string
): Promise<ApiResponse<RebalancingSubscription>> {
  return makeRequest<RebalancingSubscription>(
    `/v1/rebalancing/portfolios/${portfolioId}/subscriptions/${subscriptionId}`
  )
}

/**
 * Update a subscription
 */
export async function updateRebalancingSubscription(
  portfolioId: string,
  subscriptionId: string,
  updates: {
    allocation_percentage?: number
    is_active?: boolean
  }
): Promise<ApiResponse<RebalancingSubscription>> {
  return makeRequest<RebalancingSubscription>(
    `/v1/rebalancing/portfolios/${portfolioId}/subscriptions/${subscriptionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }
  )
}

/**
 * Delete a subscription
 */
export async function deleteRebalancingSubscription(
  portfolioId: string,
  subscriptionId: string
): Promise<ApiResponse<{ message: string }>> {
  return makeRequest<{ message: string }>(
    `/v1/rebalancing/portfolios/${portfolioId}/subscriptions/${subscriptionId}`,
    {
      method: 'DELETE'
    }
  )
}

// ============================================================================
// Rebalancing Run Management
// ============================================================================

/**
 * Create a rebalancing run
 */
export async function createRebalancingRun(
  request: CreateRebalancingRunRequest
): Promise<ApiResponse<RebalancingRun>> {
  return makeRequest<RebalancingRun>('/v1/rebalancing/runs', {
    method: 'POST',
    body: JSON.stringify(request)
  })
}

/**
 * Get rebalancing run details
 */
export async function getRebalancingRun(
  runId: string
): Promise<ApiResponse<RebalancingRun>> {
  return makeRequest<RebalancingRun>(`/v1/rebalancing/runs/${runId}`)
}

/**
 * List rebalancing runs
 */
export async function listRebalancingRuns(
  params?: ListRebalancingRunsParams
): Promise<ApiResponse<RebalancingRun[]>> {
  const queryParams = new URLSearchParams()
  
  if (params?.portfolio_id) queryParams.append('portfolio_id', params.portfolio_id)
  if (params?.status) queryParams.append('status', params.status)
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())

  const queryString = queryParams.toString()
  const path = `/v1/rebalancing/runs${queryString ? `?${queryString}` : ''}`

  return makeRequest<RebalancingRun[]>(path)
}

/**
 * Cancel a rebalancing run
 */
export async function cancelRebalancingRun(
  runId: string
): Promise<ApiResponse<{ message: string }>> {
  return makeRequest<{ message: string }>(`/v1/rebalancing/runs/${runId}`, {
    method: 'DELETE'
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate portfolio weights sum to 1.0 (100%)
 */
export function validatePortfolioWeights(weights: Record<string, number>): {
  valid: boolean
  error?: string
} {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    return {
      valid: false,
      error: `Portfolio weights must sum to 1.0 (100%). Current sum: ${totalWeight.toFixed(4)}`
    }
  }

  // Check for negative weights
  const hasNegative = Object.values(weights).some(weight => weight < 0)
  if (hasNegative) {
    return {
      valid: false,
      error: 'Portfolio weights cannot be negative'
    }
  }

  return { valid: true }
}

/**
 * Calculate portfolio drift from target weights
 */
export function calculatePortfolioDrift(
  currentWeights: Record<string, number>,
  targetWeights: Record<string, number>
): number {
  let totalDrift = 0
  
  for (const symbol in targetWeights) {
    const currentWeight = currentWeights[symbol] || 0
    const targetWeight = targetWeights[symbol]
    totalDrift += Math.abs(currentWeight - targetWeight)
  }

  return totalDrift
}

/**
 * Check if rebalancing is needed based on drift threshold
 */
export function shouldRebalance(
  currentWeights: Record<string, number>,
  targetWeights: Record<string, number>,
  driftThreshold: number
): boolean {
  const drift = calculatePortfolioDrift(currentWeights, targetWeights)
  return drift >= driftThreshold
}
