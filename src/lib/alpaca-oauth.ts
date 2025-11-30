// OAuth Client Management Library
// Frontend client for OAuth authorization flow via Supabase Edge Functions
// Requirements: 14.1, 14.2, 14.3, 14.4, 14.5

import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import type {
  OAuthClient,
  OAuthAuthorizeRequest,
  OAuthAuthorizeResponse,
  OAuthTokenRequest,
  OAuthTokenResponse,
  OAuthError,
  OAuthScope
} from '../types/oauth'

// Zod validation schemas
export const OAuthClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  redirect_uris: z.array(z.string().url()),
  logo_uri: z.string().url().optional(),
  policy_uri: z.string().url().optional(),
  tos_uri: z.string().url().optional(),
  description: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
})

export const OAuthAuthorizeRequestSchema = z.object({
  client_id: z.string(),
  redirect_uri: z.string().url(),
  response_type: z.literal('code'),
  scope: z.string(),
  state: z.string().optional(),
  account_id: z.string().optional()
})

export const OAuthAuthorizeResponseSchema = z.object({
  code: z.string(),
  state: z.string().optional()
})

export const OAuthTokenRequestSchema = z.object({
  grant_type: z.enum(['authorization_code', 'refresh_token']),
  code: z.string().optional(),
  refresh_token: z.string().optional(),
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uri: z.string().url().optional()
}).refine(
  (data) => {
    if (data.grant_type === 'authorization_code') {
      return !!data.code && !!data.redirect_uri
    }
    if (data.grant_type === 'refresh_token') {
      return !!data.refresh_token
    }
    return false
  },
  {
    message: 'Invalid token request: missing required fields for grant type'
  }
)

export const OAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string()
})

export const OAuthErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
  error_uri: z.string().url().optional()
})

// OAuth scope descriptions
export const OAUTH_SCOPE_DESCRIPTIONS: Record<OAuthScope, string> = {
  'account:read': 'View account information and balances',
  'account:write': 'Modify account settings and configurations',
  'trading:read': 'View trading positions and order history',
  'trading:write': 'Place and manage trades',
  'data:read': 'Access market data and quotes',
  'funding:read': 'View funding sources and transfer history',
  'funding:write': 'Initiate deposits and withdrawals'
}

/**
 * Get Supabase client with auth
 */
function getSupabaseClient() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Call Supabase Edge Function
 */
async function callEdgeFunction<T>(
  functionName: string,
  path: string,
  options: {
    method?: string
    body?: any
  } = {}
): Promise<{ success: boolean; data?: T; error?: any }> {
  try {
    const supabase = getSupabaseClient()
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return {
        success: false,
        error: 'Not authenticated'
      }
    }

    const url = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/${functionName}${path}`
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || result
      }
    }

    return result
  } catch (error) {
    console.error('Edge function call error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get OAuth client details
 * GET /v1/oauth/clients/{client_id}
 * 
 * Requirements: 14.1
 */
export async function getOAuthClient(
  clientId: string
): Promise<{ success: boolean; client?: OAuthClient; error?: string }> {
  try {
    const result = await callEdgeFunction<OAuthClient>(
      'alpaca-oauth',
      `/clients/${clientId}`,
      { method: 'GET' }
    )

    if (!result.success || !result.data) {
      return {
        success: false,
        error: typeof result.error === 'string' ? result.error : result.error?.message || 'Failed to get OAuth client'
      }
    }

    // Validate response
    const validatedClient = OAuthClientSchema.parse(result.data)

    return {
      success: true,
      client: validatedClient
    }
  } catch (error) {
    console.error('Get OAuth client error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Authorize OAuth request and generate authorization code
 * POST /v1/oauth/authorize
 * 
 * Requirements: 14.2
 */
export async function authorizeOAuth(
  request: OAuthAuthorizeRequest
): Promise<{ success: boolean; authorization?: OAuthAuthorizeResponse; error?: OAuthError | string }> {
  try {
    // Validate request
    const validatedRequest = OAuthAuthorizeRequestSchema.parse(request)

    const result = await callEdgeFunction<OAuthAuthorizeResponse>(
      'alpaca-oauth',
      '/authorize',
      {
        method: 'POST',
        body: validatedRequest
      }
    )

    if (!result.success || !result.data) {
      // Check if it's an OAuth error
      if (result.error && typeof result.error === 'object' && 'error' in result.error) {
        return {
          success: false,
          error: {
            error: result.error.error,
            error_description: result.error.error_description
          }
        }
      }

      return {
        success: false,
        error: typeof result.error === 'string' ? result.error : result.error?.message || 'Failed to authorize OAuth request'
      }
    }

    // Validate response
    const validatedResponse = OAuthAuthorizeResponseSchema.parse(result.data)

    return {
      success: true,
      authorization: validatedResponse
    }
  } catch (error) {
    console.error('Authorize OAuth error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Issue OAuth access token
 * POST /v1/oauth/token
 * 
 * Requirements: 14.3, 14.4
 */
export async function issueOAuthToken(
  request: OAuthTokenRequest
): Promise<{ success: boolean; token?: OAuthTokenResponse; error?: OAuthError | string }> {
  try {
    // Validate request
    const validatedRequest = OAuthTokenRequestSchema.parse(request)

    const result = await callEdgeFunction<OAuthTokenResponse>(
      'alpaca-oauth',
      '/token',
      {
        method: 'POST',
        body: validatedRequest
      }
    )

    if (!result.success || !result.data) {
      // Check if it's an OAuth error
      if (result.error && typeof result.error === 'object' && 'error' in result.error) {
        return {
          success: false,
          error: {
            error: result.error.error,
            error_description: result.error.error_description
          }
        }
      }

      return {
        success: false,
        error: typeof result.error === 'string' ? result.error : result.error?.message || 'Failed to issue OAuth token'
      }
    }

    // Validate response
    const validatedResponse = OAuthTokenResponseSchema.parse(result.data)

    return {
      success: true,
      token: validatedResponse
    }
  } catch (error) {
    console.error('Issue OAuth token error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Refresh OAuth access token using refresh token
 * POST /v1/oauth/token with grant_type=refresh_token
 * 
 * Requirements: 14.4
 */
export async function refreshOAuthToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ success: boolean; token?: OAuthTokenResponse; error?: OAuthError | string }> {
  return issueOAuthToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  })
}

/**
 * Revoke OAuth access token
 * POST /v1/oauth/revoke
 * 
 * Requirements: 14.5
 */
export async function revokeOAuthToken(
  token: string,
  tokenTypeHint?: 'access_token' | 'refresh_token'
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction(
      'alpaca-oauth',
      '/revoke',
      {
        method: 'POST',
        body: {
          token,
          token_type_hint: tokenTypeHint
        }
      }
    )

    if (!result.success) {
      return {
        success: false,
        error: typeof result.error === 'string' ? result.error : result.error?.message || 'Failed to revoke OAuth token'
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Revoke OAuth token error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Validate OAuth scope string
 */
export function validateOAuthScope(scope: string): { valid: boolean; invalidScopes?: string[] } {
  const validScopes: OAuthScope[] = [
    'account:read',
    'account:write',
    'trading:read',
    'trading:write',
    'data:read',
    'funding:read',
    'funding:write'
  ]

  const requestedScopes = scope.split(' ')
  const invalidScopes = requestedScopes.filter(s => !validScopes.includes(s as OAuthScope))

  return {
    valid: invalidScopes.length === 0,
    invalidScopes: invalidScopes.length > 0 ? invalidScopes : undefined
  }
}

/**
 * Check if a scope has sufficient permissions for an operation
 * 
 * Requirements: 14.5
 */
export function hasOAuthPermission(
  grantedScope: string,
  requiredScope: OAuthScope
): boolean {
  const grantedScopes = grantedScope.split(' ')
  return grantedScopes.includes(requiredScope)
}

/**
 * Parse OAuth error from response
 */
export function parseOAuthError(error: any): OAuthError {
  if (typeof error === 'object' && error.error) {
    return OAuthErrorSchema.parse(error)
  }

  return {
    error: 'unknown_error',
    error_description: typeof error === 'string' ? error : 'An unknown error occurred'
  }
}
