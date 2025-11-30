/**
 * TypeScript type definitions for KYC/CIP operations
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

// =============================================================================
// CIP TYPES
// =============================================================================

export interface CIPUploadRequest {
  provider_name: string
  kyc?: {
    given_name?: string
    family_name?: string
    date_of_birth?: string
    tax_id?: string
    tax_id_type?: 'USA_SSN' | 'ARG_AR_CUIT' | 'BRA_BR_CPF'
    country_of_citizenship?: string
    country_of_birth?: string
    country_of_tax_residence?: string
    funding_source?: string[]
    annual_income_min?: string
    annual_income_max?: string
    liquid_net_worth_min?: string
    liquid_net_worth_max?: string
    total_net_worth_min?: string
    total_net_worth_max?: string
  }
  document?: {
    document_type?: 'passport' | 'drivers_license' | 'identity_card'
    document_sub_type?: string
    document_number?: string
    document_country?: string
    document_issued_date?: string
    document_expiration_date?: string
    document_front?: string // base64 encoded
    document_back?: string // base64 encoded
  }
  photo?: {
    photo_type?: 'selfie' | 'video'
    content?: string // base64 encoded
  }
  identity?: {
    given_name?: string
    middle_name?: string
    family_name?: string
    date_of_birth?: string
    country_of_citizenship?: string
    country_of_birth?: string
    country_of_tax_residence?: string
    visa_type?: string
    visa_expiration_date?: string
    permanent_resident?: boolean
  }
  watchlist?: {
    politically_exposed_names?: string[]
    family_member_names?: string[]
  }
}

export interface CIPResponse {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'review'
  provider_name: string
  risk_level?: 'low' | 'medium' | 'high'
  verification_results?: {
    kyc?: CIPVerificationResult
    document?: CIPVerificationResult
    photo?: CIPVerificationResult
    identity?: CIPVerificationResult
    watchlist?: CIPVerificationResult
  }
  failure_reasons?: string[]
  created_at: string
  completed_at?: string
}

export interface CIPVerificationResult {
  status: 'clear' | 'consider' | 'rejected'
  result?: string
  sub_result?: string
  breakdown?: Record<string, any>
  properties?: Record<string, any>
}

// =============================================================================
// ONFIDO TYPES
// =============================================================================

export interface OnfidoSDKTokenRequest {
  referrer?: string
}

export interface OnfidoSDKTokenResponse {
  sdk_token: string
  applicant_id: string
  expires_at: string
}

export interface OnfidoOutcomeRequest {
  applicant_id: string
  check_id: string
  result: 'clear' | 'consider' | 'rejected'
  sub_result?: string
  breakdown?: {
    document?: OnfidoCheckBreakdown
    facial_similarity_photo?: OnfidoCheckBreakdown
    facial_similarity_video?: OnfidoCheckBreakdown
    watchlist?: OnfidoCheckBreakdown
  }
}

export interface OnfidoCheckBreakdown {
  result: 'clear' | 'consider' | 'rejected'
  breakdown?: Record<string, {
    result: 'clear' | 'consider' | 'rejected'
    properties?: Record<string, any>
  }>
}

export interface OnfidoOutcomeResponse {
  status: string
  message: string
}

// =============================================================================
// KYC SUBMISSION TYPES
// =============================================================================

export interface KYCSubmission {
  id: string
  account_id: string
  alpaca_account_id: string
  provider_name: string
  submission_type: 'cip' | 'kyc' | 'document' | 'photo' | 'identity' | 'watchlist'
  status: 'pending' | 'approved' | 'rejected' | 'review'
  risk_level?: 'low' | 'medium' | 'high'
  verification_results?: Record<string, any>
  failure_reasons?: string[]
  submitted_at: string
  completed_at?: string
  expires_at?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface OnfidoSDKToken {
  id: string
  account_id: string
  alpaca_account_id: string
  sdk_token: string
  applicant_id: string
  expires_at: string
  used: boolean
  created_at: string
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export type KYCStatus = 'pending' | 'approved' | 'rejected' | 'review'
export type RiskLevel = 'low' | 'medium' | 'high'
export type VerificationProvider = 'onfido' | 'manual' | 'alpaca'
export type SubmissionType = 'cip' | 'kyc' | 'document' | 'photo' | 'identity' | 'watchlist'

export interface KYCStatusSummary {
  hasSubmission: boolean
  latestStatus?: KYCStatus
  latestSubmission?: KYCSubmission
  isVerified: boolean
  requiresAction: boolean
  failureReasons?: string[]
}
