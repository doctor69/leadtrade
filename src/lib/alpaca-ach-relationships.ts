// Alpaca ACH Relationship Management Service
import { getAlpacaConfig } from './trading-config';

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

    const config = getAlpacaConfig(tradingMode);
    
    const headers = {
      'Content-Type': 'application/json',
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    };

    console.log(`Creating ACH relationship for account ${accountId} in ${tradingMode} mode`);

    const response = await fetch(`${config.brokerBaseUrl}/accounts/${accountId}/ach_relationships`, {
      method: 'POST',
      headers,
      body: JSON.stringify(achData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ACH relationship creation failed:', errorText);
      
      let errorMessage = 'Failed to create ACH relationship';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      return {
        success: false,
        error: errorMessage,
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
    const config = getAlpacaConfig(tradingMode);
    
    const headers = {
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    };

    // Build query string
    const queryParams = new URLSearchParams();
    if (params?.status) {
      queryParams.append('status', params.status);
    }

    const queryString = queryParams.toString();
    const url = `${config.brokerBaseUrl}/accounts/${accountId}/ach_relationships${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to list ACH relationships: ${response.status} ${response.statusText}`,
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
    const config = getAlpacaConfig(tradingMode);
    
    const headers = {
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    };

    const response = await fetch(`${config.brokerBaseUrl}/accounts/${accountId}/ach_relationships/${achRelationshipId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to delete ACH relationship';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        // Check if error is due to pending transfers
        if (errorMessage.toLowerCase().includes('pending transfer')) {
          errorMessage = 'Cannot delete ACH relationship with pending transfers. Please wait for transfers to complete or cancel them first.';
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
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
