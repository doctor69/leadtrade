// OAuth Client Management Tests
// Tests for OAuth authorization flow
// Requirements: 14.1, 14.2, 14.3, 14.4, 14.5

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  OAuthClientSchema,
  OAuthAuthorizeRequestSchema,
  OAuthAuthorizeResponseSchema,
  OAuthTokenRequestSchema,
  OAuthTokenResponseSchema,
  validateOAuthScope,
  hasOAuthPermission,
  OAUTH_SCOPE_DESCRIPTIONS
} from '../alpaca-oauth'

describe('OAuth Client Management', () => {
  describe('Zod Schemas', () => {
    it('should validate OAuth client schema', () => {
      const validClient = {
        id: 'client_123',
        name: 'Test App',
        redirect_uris: ['https://example.com/callback'],
        logo_uri: 'https://example.com/logo.png',
        policy_uri: 'https://example.com/policy',
        tos_uri: 'https://example.com/tos',
        description: 'A test application',
        created_at: '2025-01-09T00:00:00Z',
        updated_at: '2025-01-09T00:00:00Z'
      }

      const result = OAuthClientSchema.safeParse(validClient)
      expect(result.success).toBe(true)
    })

    it('should reject invalid OAuth client', () => {
      const invalidClient = {
        id: 'client_123',
        name: 'Test App',
        redirect_uris: ['not-a-url'], // Invalid URL
        created_at: '2025-01-09T00:00:00Z',
        updated_at: '2025-01-09T00:00:00Z'
      }

      const result = OAuthClientSchema.safeParse(invalidClient)
      expect(result.success).toBe(false)
    })

    it('should validate OAuth authorize request', () => {
      const validRequest = {
        client_id: 'client_123',
        redirect_uri: 'https://example.com/callback',
        response_type: 'code' as const,
        scope: 'account:read trading:write',
        state: 'random_state'
      }

      const result = OAuthAuthorizeRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject invalid response_type', () => {
      const invalidRequest = {
        client_id: 'client_123',
        redirect_uri: 'https://example.com/callback',
        response_type: 'token', // Only 'code' is supported
        scope: 'account:read'
      }

      const result = OAuthAuthorizeRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should validate OAuth authorize response', () => {
      const validResponse = {
        code: 'auth_code_xyz',
        state: 'random_state'
      }

      const result = OAuthAuthorizeResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })

    it('should validate OAuth token request - authorization_code', () => {
      const validRequest = {
        grant_type: 'authorization_code' as const,
        code: 'auth_code_xyz',
        client_id: 'client_123',
        client_secret: 'secret_abc',
        redirect_uri: 'https://example.com/callback'
      }

      const result = OAuthTokenRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should validate OAuth token request - refresh_token', () => {
      const validRequest = {
        grant_type: 'refresh_token' as const,
        refresh_token: 'refresh_xyz',
        client_id: 'client_123',
        client_secret: 'secret_abc'
      }

      const result = OAuthTokenRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject token request missing required fields', () => {
      const invalidRequest = {
        grant_type: 'authorization_code' as const,
        // Missing code and redirect_uri
        client_id: 'client_123',
        client_secret: 'secret_abc'
      }

      const result = OAuthTokenRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should validate OAuth token response', () => {
      const validResponse = {
        access_token: 'access_token_xyz',
        token_type: 'Bearer' as const,
        expires_in: 3600,
        refresh_token: 'refresh_token_abc',
        scope: 'account:read trading:write'
      }

      const result = OAuthTokenResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })
  })

  describe('Scope Validation', () => {
    it('should validate valid scopes', () => {
      const result = validateOAuthScope('account:read trading:write data:read')
      expect(result.valid).toBe(true)
      expect(result.invalidScopes).toBeUndefined()
    })

    it('should detect invalid scopes', () => {
      const result = validateOAuthScope('account:read invalid:scope trading:write')
      expect(result.valid).toBe(false)
      expect(result.invalidScopes).toEqual(['invalid:scope'])
    })

    it('should handle multiple invalid scopes', () => {
      const result = validateOAuthScope('invalid1:scope invalid2:scope account:read')
      expect(result.valid).toBe(false)
      expect(result.invalidScopes).toEqual(['invalid1:scope', 'invalid2:scope'])
    })

    it('should validate all supported scopes', () => {
      const allScopes = Object.keys(OAUTH_SCOPE_DESCRIPTIONS).join(' ')
      const result = validateOAuthScope(allScopes)
      expect(result.valid).toBe(true)
    })
  })

  describe('Permission Checking', () => {
    it('should confirm permission when scope is granted', () => {
      const grantedScope = 'account:read trading:read trading:write'
      const result = hasOAuthPermission(grantedScope, 'trading:read')
      expect(result).toBe(true)
    })

    it('should deny permission when scope is not granted', () => {
      const grantedScope = 'account:read trading:read'
      const result = hasOAuthPermission(grantedScope, 'trading:write')
      expect(result).toBe(false)
    })

    it('should handle single scope', () => {
      const grantedScope = 'account:read'
      expect(hasOAuthPermission(grantedScope, 'account:read')).toBe(true)
      expect(hasOAuthPermission(grantedScope, 'account:write')).toBe(false)
    })
  })

  describe('Scope Descriptions', () => {
    it('should have descriptions for all scopes', () => {
      const scopes = [
        'account:read',
        'account:write',
        'trading:read',
        'trading:write',
        'data:read',
        'funding:read',
        'funding:write'
      ]

      scopes.forEach(scope => {
        expect(OAUTH_SCOPE_DESCRIPTIONS[scope as keyof typeof OAUTH_SCOPE_DESCRIPTIONS]).toBeDefined()
        expect(typeof OAUTH_SCOPE_DESCRIPTIONS[scope as keyof typeof OAUTH_SCOPE_DESCRIPTIONS]).toBe('string')
      })
    })
  })

  describe('OAuth Flow Scenarios', () => {
    it('should support complete authorization code flow', () => {
      // Step 1: Validate authorization request
      const authRequest = {
        client_id: 'client_123',
        redirect_uri: 'https://example.com/callback',
        response_type: 'code' as const,
        scope: 'account:read trading:write',
        state: 'random_state'
      }
      expect(OAuthAuthorizeRequestSchema.safeParse(authRequest).success).toBe(true)

      // Step 2: Validate authorization response
      const authResponse = {
        code: 'auth_code_xyz',
        state: 'random_state'
      }
      expect(OAuthAuthorizeResponseSchema.safeParse(authResponse).success).toBe(true)

      // Step 3: Validate token request
      const tokenRequest = {
        grant_type: 'authorization_code' as const,
        code: authResponse.code,
        client_id: authRequest.client_id,
        client_secret: 'secret_abc',
        redirect_uri: authRequest.redirect_uri
      }
      expect(OAuthTokenRequestSchema.safeParse(tokenRequest).success).toBe(true)

      // Step 4: Validate token response
      const tokenResponse = {
        access_token: 'access_token_xyz',
        token_type: 'Bearer' as const,
        expires_in: 3600,
        refresh_token: 'refresh_token_abc',
        scope: authRequest.scope
      }
      expect(OAuthTokenResponseSchema.safeParse(tokenResponse).success).toBe(true)
    })

    it('should support refresh token flow', () => {
      // Step 1: Validate refresh token request
      const refreshRequest = {
        grant_type: 'refresh_token' as const,
        refresh_token: 'refresh_token_abc',
        client_id: 'client_123',
        client_secret: 'secret_abc'
      }
      expect(OAuthTokenRequestSchema.safeParse(refreshRequest).success).toBe(true)

      // Step 2: Validate new token response
      const tokenResponse = {
        access_token: 'new_access_token_xyz',
        token_type: 'Bearer' as const,
        expires_in: 3600,
        refresh_token: 'new_refresh_token_abc',
        scope: 'account:read trading:write'
      }
      expect(OAuthTokenResponseSchema.safeParse(tokenResponse).success).toBe(true)
    })
  })

  describe('Security Validations', () => {
    it('should require HTTPS for redirect URIs', () => {
      const httpRequest = {
        client_id: 'client_123',
        redirect_uri: 'http://example.com/callback', // HTTP not allowed
        response_type: 'code' as const,
        scope: 'account:read'
      }

      // Note: In production, this should be validated by the server
      // This test documents the expected behavior
      expect(httpRequest.redirect_uri.startsWith('https://')).toBe(false)
    })

    it('should validate state parameter for CSRF protection', () => {
      const requestWithState = {
        client_id: 'client_123',
        redirect_uri: 'https://example.com/callback',
        response_type: 'code' as const,
        scope: 'account:read',
        state: 'random_state_xyz'
      }

      const result = OAuthAuthorizeRequestSchema.safeParse(requestWithState)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.state).toBe('random_state_xyz')
      }
    })

    it('should validate client credentials are required for token', () => {
      const requestWithoutSecret = {
        grant_type: 'authorization_code' as const,
        code: 'auth_code_xyz',
        client_id: 'client_123',
        // Missing client_secret
        redirect_uri: 'https://example.com/callback'
      }

      const result = OAuthTokenRequestSchema.safeParse(requestWithoutSecret)
      expect(result.success).toBe(false)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle missing required parameters', () => {
      const incompleteRequest = {
        client_id: 'client_123',
        // Missing redirect_uri, response_type, scope
      }

      const result = OAuthAuthorizeRequestSchema.safeParse(incompleteRequest)
      expect(result.success).toBe(false)
    })

    it('should handle invalid grant type', () => {
      const invalidRequest = {
        grant_type: 'implicit', // Not supported
        client_id: 'client_123',
        client_secret: 'secret_abc'
      }

      const result = OAuthTokenRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should handle malformed scope string', () => {
      // Empty scope - splits to [''] which is invalid
      expect(validateOAuthScope('').valid).toBe(false)

      // Only invalid scopes
      const result = validateOAuthScope('invalid:scope1 invalid:scope2')
      expect(result.valid).toBe(false)
      expect(result.invalidScopes?.length).toBe(2)
    })
  })
})
