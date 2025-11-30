// OAuth Client Management Types
// Based on Alpaca Broker API OAuth specification

export interface OAuthClient {
  id: string
  name: string
  redirect_uris: string[]
  logo_uri?: string
  policy_uri?: string
  tos_uri?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface OAuthAuthorizeRequest {
  client_id: string
  redirect_uri: string
  response_type: 'code'
  scope: string
  state?: string
  account_id?: string
}

export interface OAuthAuthorizeResponse {
  code: string
  state?: string
}

export interface OAuthTokenRequest {
  grant_type: 'authorization_code' | 'refresh_token'
  code?: string // Required for authorization_code
  refresh_token?: string // Required for refresh_token
  client_id: string
  client_secret: string
  redirect_uri?: string // Required for authorization_code
}

export interface OAuthTokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token?: string
  scope: string
}

export interface OAuthError {
  error: string
  error_description?: string
  error_uri?: string
}

export type OAuthScope = 
  | 'account:read'
  | 'account:write'
  | 'trading:read'
  | 'trading:write'
  | 'data:read'
  | 'funding:read'
  | 'funding:write'

export interface OAuthScopePermissions {
  scope: OAuthScope
  description: string
  required: boolean
}

// Database schema types
export interface OAuthAuthorization {
  id: string
  user_id: string
  client_id: string
  code: string
  scope: string
  redirect_uri: string
  expires_at: string
  used: boolean
  created_at: string
}

export interface OAuthAccessToken {
  id: string
  user_id: string
  client_id: string
  access_token: string
  refresh_token?: string
  scope: string
  expires_at: string
  created_at: string
  revoked: boolean
}
