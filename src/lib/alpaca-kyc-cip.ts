/**
 * Alpaca KYC/CIP Integration Library
 * 
 * Provides functions for managing KYC (Know Your Customer) and CIP (Customer Identification Program)
 * verification processes through the Alpaca Broker API.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { supabase } from './supabase'

// =============================================================================
// TYPES
// =============================================================================

export interface CIPUploadRequest {
  provider_name: string
  kyc?: Record<string, any>
  document?: Record<string, any>
  photo?: Record<string, any>
  identity?: Record<string, any>
  watchlist?: Record<string, any>
}

export interface CIPResponse {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'review'
  provider_name: string
  risk_level?: 'low' | 'medium' | 'high'
  verification_results?: Record<string, any>
  failure_reasons?: string[]
  created_at: string
  completed_at?: string
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
  breakdown?: Record<string, any>
}

export interface OnfidoOutcomeResponse {
  status: string
  message: string
}

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

// =============================================================================
// CIP OPERATIONS
// =============================================================================

/**
 * Upload CIP (Customer Identification Program) information
 * 
 * @param cipData - CIP information including provider name and verification data
 * @returns Promise with CIP response or error
 * 
 * Requirements: 15.1
 */
export async function uploadCIP(cipData: CIPUploadRequest): Promise<{
  success: boolean
  data?: CIPResponse
  error?: string
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-kyc-cip/cip`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(cipData)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'Failed to upload CIP' }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Upload CIP error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload CIP'
    }
  }
}

/**
 * Get CIP verification results for the current user's account
 * 
 * @returns Promise with CIP verification results or error
 * 
 * Requirements: 15.2, 15.4
 */
export async function getCIP(): Promise<{
  success: boolean
  data?: CIPResponse
  error?: string
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-kyc-cip/cip`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'Failed to get CIP' }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get CIP error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get CIP'
    }
  }
}

// =============================================================================
// ONFIDO INTEGRATION
// =============================================================================

/**
 * Generate Onfido SDK token for identity verification
 * 
 * @param referrer - Optional referrer URL for the SDK
 * @returns Promise with SDK token and applicant ID or error
 * 
 * Requirements: 15.3
 */
export async function generateOnfidoSDKToken(referrer?: string): Promise<{
  success: boolean
  data?: OnfidoSDKTokenResponse
  error?: string
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-kyc-cip/onfido/sdk-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(referrer ? { referrer } : {})
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'Failed to generate SDK token' }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Generate Onfido SDK token error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate SDK token'
    }
  }
}

/**
 * Submit Onfido verification outcome
 * 
 * @param outcomeData - Verification outcome data from Onfido
 * @returns Promise with submission result or error
 * 
 * Requirements: 15.3, 15.4
 */
export async function submitOnfidoOutcome(outcomeData: OnfidoOutcomeRequest): Promise<{
  success: boolean
  data?: OnfidoOutcomeResponse
  error?: string
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-kyc-cip/onfido/outcome`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(outcomeData)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'Failed to submit outcome' }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Submit Onfido outcome error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit outcome'
    }
  }
}

// =============================================================================
// KYC SUBMISSIONS MANAGEMENT
// =============================================================================

/**
 * Get all KYC submissions for the current user
 * 
 * @returns Promise with array of KYC submissions or error
 * 
 * Requirements: 15.2, 15.5
 */
export async function getKYCSubmissions(): Promise<{
  success: boolean
  data?: KYCSubmission[]
  error?: string
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-kyc-cip/submissions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error || 'Failed to get submissions' }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Get KYC submissions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get submissions'
    }
  }
}

/**
 * Get the latest KYC submission status for the current user
 * 
 * @returns Promise with latest submission or error
 * 
 * Requirements: 15.2, 15.5
 */
export async function getLatestKYCStatus(): Promise<{
  success: boolean
  data?: KYCSubmission
  error?: string
}> {
  try {
    const result = await getKYCSubmissions()
    if (!result.success || !result.data || result.data.length === 0) {
      return { success: false, error: 'No KYC submissions found' }
    }

    // Return the most recent submission
    return { success: true, data: result.data[0] }
  } catch (error) {
    console.error('Get latest KYC status error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get latest status'
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if KYC verification is required for the account
 * 
 * @returns Promise with boolean indicating if KYC is required
 */
export async function isKYCRequired(): Promise<boolean> {
  try {
    const result = await getLatestKYCStatus()
    if (!result.success || !result.data) {
      return true // Assume KYC is required if we can't determine status
    }

    // KYC is not required if the latest submission is approved
    return result.data.status !== 'approved'
  } catch (error) {
    console.error('Check KYC required error:', error)
    return true // Assume KYC is required on error
  }
}

/**
 * Get user-friendly status message for KYC submission
 * 
 * @param status - KYC submission status
 * @returns User-friendly status message
 */
export function getKYCStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'Your verification is being processed'
    case 'approved':
      return 'Your identity has been verified'
    case 'rejected':
      return 'Verification failed. Please contact support'
    case 'review':
      return 'Your verification requires manual review'
    default:
      return 'Unknown verification status'
  }
}

/**
 * Get CSS class for KYC status badge
 * 
 * @param status - KYC submission status
 * @returns CSS class name for status badge
 */
export function getKYCStatusClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'approved':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'review':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}
