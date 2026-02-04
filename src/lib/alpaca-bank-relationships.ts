// Alpaca Bank Relationship Management Service
import { z } from 'zod'

// Validation schemas
export const BankCodeTypeSchema = z.enum(['aba', 'bic'])

export const CreateBankRelationshipSchema = z.object({
  name: z.string(),
  bank_code: z.string(),
  bank_code_type: BankCodeTypeSchema,
  account_number: z.string(),
  country: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  street_address: z.string().optional()
})

export const BankRelationshipSchema = z.object({
  id: z.string(),
  name: z.string(),
  bank_code: z.string(),
  bank_code_type: z.string().transform(val => val.toLowerCase() as 'aba' | 'bic'), // Accept uppercase from Alpaca
  account_number: z.string(),
  country: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  street_address: z.string().optional(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional()
})

// TypeScript types
export type BankCodeType = z.infer<typeof BankCodeTypeSchema>
export type CreateBankRelationshipRequest = z.infer<typeof CreateBankRelationshipSchema>
export type BankRelationship = z.infer<typeof BankRelationshipSchema>

export interface ListBankRelationshipsParams {
  status?: string
  bank_name?: string
}

/**
 * Creates a bank relationship for an account
 */
export async function createBankRelationship(
  accountId: string,
  bankData: CreateBankRelationshipRequest
): Promise<{ success: boolean; bank?: BankRelationship; error?: string }> {
  try {
    // Validate input
    const validation = CreateBankRelationshipSchema.safeParse(bankData)
    if (!validation.success) {
      return {
        success: false,
        error: `Validation error: ${validation.error.message}`
      }
    }

    // Get Supabase session for authentication
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        success: false,
        error: 'Authentication required. Please sign in.',
      };
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/alpaca-bank-relationships/${accountId}`

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(bankData),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error?.message || result.error || result.message || 'Failed to create bank relationship'
      }
    }

    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || result.error || 'Failed to create bank relationship'
      }
    }

    // Validate response
    const bankValidation = BankRelationshipSchema.safeParse(result.data)
    if (!bankValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      }
    }

    return {
      success: true,
      bank: bankValidation.data
    }
  } catch (error) {
    console.error('Error creating bank relationship:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Lists all bank relationships for an account with optional filtering
 */
export async function listBankRelationships(
  accountId: string,
  params?: ListBankRelationshipsParams
): Promise<{ success: boolean; banks?: BankRelationship[]; error?: string }> {
  try {
    // Get Supabase session for authentication
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        success: false,
        error: 'Authentication required. Please sign in.',
      };
    }

    // Build query string
    const queryParams = new URLSearchParams()
    if (params) {
      if (params.status) queryParams.append('status', params.status)
      if (params.bank_name) queryParams.append('bank_name', params.bank_name)
    }

    const queryString = queryParams.toString()
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/alpaca-bank-relationships/${accountId}${queryString ? `?${queryString}` : ''}`

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
      },
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error?.message || result.error || result.message || 'Failed to list bank relationships'
      }
    }

    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || result.error || 'Failed to list bank relationships'
      }
    }

    // Validate response
    const banksValidation = z.array(BankRelationshipSchema).safeParse(result.data)
    if (!banksValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      }
    }

    return {
      success: true,
      banks: banksValidation.data
    }
  } catch (error) {
    console.error('Error listing bank relationships:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Deletes a bank relationship
 */
export async function deleteBankRelationship(
  accountId: string,
  bankId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get Supabase session for authentication
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        success: false,
        error: 'Authentication required. Please sign in.',
      };
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/alpaca-bank-relationships/${accountId}/${bankId}`

    const response = await fetch(edgeFunctionUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
      },
    })

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: 'Failed to delete bank relationship' }))
      return {
        success: false,
        error: result.error?.message || result.error || result.message || 'Failed to delete bank relationship'
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting bank relationship:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
