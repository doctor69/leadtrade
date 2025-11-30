// Alpaca Transfer Management Service
import { z } from 'zod';

// Validation schemas
export const TransferTypeSchema = z.enum(['ach', 'wire', 'sandbox']);
export const DirectionSchema = z.enum(['INCOMING', 'OUTGOING']);
export const FeePaymentMethodSchema = z.enum(['user', 'invoice']);

export const CreateTransferSchema = z.object({
  transfer_type: TransferTypeSchema,
  amount: z.string(),
  direction: DirectionSchema,
  timing: z.enum(['immediate', 'next_day']).optional(),
  relationship_id: z.string().optional(),
  bank_id: z.string().optional(),
  additional_information: z.string().optional(),
  fee_payment_method: FeePaymentMethodSchema.optional()
});

export const TransferSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  type: TransferTypeSchema,
  status: z.enum(['queued', 'pending', 'sent_to_clearing', 'approved', 'canceled', 'rejected']),
  amount: z.string(),
  direction: DirectionSchema,
  created_at: z.string(),
  updated_at: z.string(),
  expires_at: z.string().optional(),
  relationship_id: z.string().optional(),
  bank_id: z.string().optional(),
  additional_information: z.string().optional(),
  fee_payment_method: FeePaymentMethodSchema.optional()
});

// TypeScript types
export type TransferType = z.infer<typeof TransferTypeSchema>;
export type Direction = z.infer<typeof DirectionSchema>;
export type FeePaymentMethod = z.infer<typeof FeePaymentMethodSchema>;
export type CreateTransferRequest = z.infer<typeof CreateTransferSchema>;
export type Transfer = z.infer<typeof TransferSchema>;

export interface ListTransfersParams {
  direction?: Direction;
  limit?: number;
  offset?: number;
}

/**
 * Creates a transfer (ACH, wire, or sandbox)
 * 
 * Requirements:
 * - ACH transfers require relationship_id
 * - Wire transfers require bank_id, additional_information, and fee_payment_method
 * - Sandbox transfers allow instant virtual deposits/withdrawals
 */
export async function createTransfer(
  accountId: string,
  transferData: CreateTransferRequest
): Promise<{ success: boolean; transfer?: Transfer; error?: string }> {
  try {
    // Validate input
    const validation = CreateTransferSchema.safeParse(transferData);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation error: ${validation.error.message}`
      };
    }

    // Validate amount
    const amount = parseFloat(transferData.amount);
    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        error: 'amount must be a positive number'
      };
    }

    // Validate wire transfer specific fields
    if (transferData.transfer_type === 'wire') {
      if (!transferData.additional_information) {
        return {
          success: false,
          error: 'additional_information is required for wire transfers'
        };
      }
      if (!transferData.fee_payment_method) {
        return {
          success: false,
          error: 'fee_payment_method is required for wire transfers'
        };
      }
      if (!transferData.bank_id) {
        return {
          success: false,
          error: 'bank_id is required for wire transfers'
        };
      }
    }

    // Validate ACH transfer requires relationship_id
    if (transferData.transfer_type === 'ach' && !transferData.relationship_id) {
      return {
        success: false,
        error: 'relationship_id is required for ACH transfers'
      };
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-transfers/${accountId}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transferData),
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to create transfer'
      };
    }

    // Validate response
    const transferValidation = TransferSchema.safeParse(result);
    if (!transferValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    return {
      success: true,
      transfer: transferValidation.data
    };
  } catch (error) {
    console.error('Error creating transfer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Lists all transfers for an account with optional filtering
 */
export async function listTransfers(
  accountId: string,
  params?: ListTransfersParams
): Promise<{ success: boolean; transfers?: Transfer[]; error?: string }> {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.direction) queryParams.append('direction', params.direction);
      if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
      if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
    }

    const queryString = queryParams.toString();
    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-transfers/${accountId}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      // Include status code in error for better handling
      const errorMessage = response.status === 401 
        ? '401: Unauthorized - Alpaca account not linked'
        : result.error || 'Failed to list transfers';
      
      return {
        success: false,
        error: errorMessage
      };
    }

    // Validate response
    const transfersValidation = z.array(TransferSchema).safeParse(result);
    if (!transfersValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    return {
      success: true,
      transfers: transfersValidation.data
    };
  } catch (error) {
    console.error('Error listing transfers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Cancels a pending transfer
 * Note: Only transfers in 'pending' status can be canceled
 */
export async function cancelTransfer(
  accountId: string,
  transferId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!accountId || !transferId) {
      return {
        success: false,
        error: 'Account ID and Transfer ID are required'
      };
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-transfers/${accountId}/${transferId}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'DELETE',
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to cancel transfer'
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Error canceling transfer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
