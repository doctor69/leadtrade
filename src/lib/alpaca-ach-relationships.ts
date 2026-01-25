// Alpaca ACH Relationship Management Service

export interface ACHRelationship {
  id: string;
  account_id: string;
  status: 'queued' | 'approved' | 'pending' | 'sent_to_clearing' | 'rejected' | 'canceled';
  account_owner_name: string;
  bank_account_type: 'checking' | 'savings';
  bank_account_number: string;
  bank_routing_number: string;
  nickname?: string;
  processor_token?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateACHRelationshipRequest {
  account_owner_name: string;
  bank_account_type: 'checking' | 'savings';
  bank_account_number?: string; // Required for manual entry
  bank_routing_number?: string; // Required for manual entry
  nickname?: string;
  processor_token?: string; // For Plaid integration
}

export interface ListACHRelationshipsParams {
  status?: string;
}

/**
 * Validates routing number format (9 digits)
 */
function validateRoutingNumber(routingNumber: string): boolean {
  return /^\d{9}$/.test(routingNumber);
}

/**
 * Creates an ACH relationship for an account
 * Supports both manual entry (routing number, account number) and Plaid processor token
 */
export async function createACHRelationship(
  accountId: string,
  achData: CreateACHRelationshipRequest,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; ach?: ACHRelationship; error?: string }> {
  try {
    // Validate bank_account_type
    if (achData.bank_account_type !== 'checking' && achData.bank_account_type !== 'savings') {
      return {
        success: false,
        error: 'bank_account_type must be either "checking" or "savings"',
      };
    }

    // Validate based on entry method
    if (!achData.processor_token) {
      // Manual entry validation
      if (!achData.bank_account_number || !achData.bank_routing_number) {
        return {
          success: false,
          error: 'For manual entry: bank_account_number and bank_routing_number are required',
        };
      }

      // Validate routing number format
      if (!validateRoutingNumber(achData.bank_routing_number)) {
        return {
          success: false,
          error: 'bank_routing_number must be exactly 9 digits',
        };
      }
    }

    console.log(`Creating ACH relationship for account ${accountId} in ${tradingMode} mode`);

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-ach-relationships/${accountId}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(achData),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create ACH relationship' }));
      console.error('ACH relationship creation failed:', errorData);
      
      return {
        success: false,
        error: errorData.error || errorData.message || 'Failed to create ACH relationship',
      };
    }

    const ach: ACHRelationship = await response.json();
    
    console.log('ACH relationship created successfully:', ach.id);

    return {
      success: true,
      ach,
    };

  } catch (error) {
    console.error('Error creating ACH relationship:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Lists all ACH relationships for an account with optional filtering
 */
export async function listACHRelationships(
  accountId: string,
  params?: ListACHRelationshipsParams,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; relationships?: ACHRelationship[]; error?: string }> {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.status) {
      queryParams.append('status', params.status);
    }

    const queryString = queryParams.toString();
    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-ach-relationships/${accountId}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to list ACH relationships' }));
      return {
        success: false,
        error: errorData.error || errorData.message || 'Failed to list ACH relationships',
      };
    }

    const relationships: ACHRelationship[] = await response.json();
    
    return {
      success: true,
      relationships,
    };

  } catch (error) {
    console.error('Error listing ACH relationships:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Deletes an ACH relationship
 * Note: Alpaca API will validate that no pending transfers exist
 */
export async function deleteACHRelationship(
  accountId: string,
  achRelationshipId: string,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; error?: string }> {
  try {
    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-ach-relationships/${accountId}/${achRelationshipId}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete ACH relationship' }));
      let errorMessage = errorData.error || errorData.message || 'Failed to delete ACH relationship';
      
      // Check if error is due to pending transfers
      if (errorMessage.toLowerCase().includes('pending transfer')) {
        errorMessage = 'Cannot delete ACH relationship with pending transfers. Please wait for transfers to complete or cancel them first.';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
    };

  } catch (error) {
    console.error('Error deleting ACH relationship:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
