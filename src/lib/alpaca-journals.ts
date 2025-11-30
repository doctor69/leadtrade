// Alpaca Journal Operations Service
import { z } from 'zod';

// Validation schemas
export const EntryTypeSchema = z.enum(['JNLC', 'JNLS']);
export const JournalStatusSchema = z.enum(['pending', 'executed', 'canceled', 'rejected']);

export const CreateJournalSchema = z.object({
  entry_type: EntryTypeSchema,
  from_account: z.string(),
  to_account: z.string(),
  amount: z.string().optional(),
  symbol: z.string().optional(),
  qty: z.string().optional(),
  description: z.string().optional()
});

export const BatchJournalEntrySchema = z.object({
  from_account: z.string().optional(),
  to_account: z.string().optional(),
  amount: z.string()
});

export const BatchJournalSchema = z.object({
  entry_type: z.literal('JNLC'),
  from_account: z.string().optional(),
  to_account: z.string().optional(),
  entries: z.array(BatchJournalEntrySchema),
  description: z.string().optional()
});

export const JournalSchema = z.object({
  id: z.string(),
  entry_type: EntryTypeSchema,
  from_account: z.string(),
  to_account: z.string(),
  status: JournalStatusSchema,
  settle_date: z.string().optional(),
  system_date: z.string().optional(),
  net_amount: z.string().optional(),
  description: z.string().optional(),
  symbol: z.string().optional(),
  qty: z.string().optional(),
  price: z.string().optional()
});

// TypeScript types
export type EntryType = z.infer<typeof EntryTypeSchema>;
export type JournalStatus = z.infer<typeof JournalStatusSchema>;
export type CreateJournalRequest = z.infer<typeof CreateJournalSchema>;
export type BatchJournalRequest = z.infer<typeof BatchJournalSchema>;
export type Journal = z.infer<typeof JournalSchema>;

export interface ListJournalsParams {
  after?: string;
  before?: string;
  status?: JournalStatus;
  entry_type?: EntryType;
  to_account?: string;
  from_account?: string;
}

/**
 * Creates a journal entry (JNLC for cash or JNLS for securities)
 * 
 * Requirements:
 * - JNLC journals require amount
 * - JNLS journals require symbol and qty
 * - Both require from_account and to_account
 */
export async function createJournal(
  journalData: CreateJournalRequest
): Promise<{ success: boolean; journal?: Journal; error?: string }> {
  try {
    // Validate input
    const validation = CreateJournalSchema.safeParse(journalData);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation error: ${validation.error.message}`
      };
    }

    // Validate JNLC (cash) journal
    if (journalData.entry_type === 'JNLC') {
      if (!journalData.amount) {
        return {
          success: false,
          error: 'amount is required for JNLC (cash) journals'
        };
      }

      const amount = parseFloat(journalData.amount);
      if (isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: 'amount must be a positive number'
        };
      }
    }

    // Validate JNLS (securities) journal
    if (journalData.entry_type === 'JNLS') {
      if (!journalData.symbol || !journalData.qty) {
        return {
          success: false,
          error: 'symbol and qty are required for JNLS (securities) journals'
        };
      }

      const qty = parseFloat(journalData.qty);
      if (isNaN(qty) || qty <= 0) {
        return {
          success: false,
          error: 'qty must be a positive number'
        };
      }
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-journals`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(journalData),
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to create journal'
      };
    }

    // Validate response
    const journalValidation = JournalSchema.safeParse(result);
    if (!journalValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    return {
      success: true,
      journal: journalValidation.data
    };
  } catch (error) {
    console.error('Error creating journal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Creates batch journal entries (one-to-many or many-to-one)
 * 
 * Requirements:
 * - Only supports JNLC (cash) journals
 * - For one-to-many: specify from_account and entries with to_account
 * - For many-to-one: specify to_account and entries with from_account
 */
export async function createBatchJournals(
  batchData: BatchJournalRequest
): Promise<{ success: boolean; journals?: Journal[]; error?: string }> {
  try {
    // Validate input
    const validation = BatchJournalSchema.safeParse(batchData);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation error: ${validation.error.message}`
      };
    }

    if (!batchData.entries || batchData.entries.length === 0) {
      return {
        success: false,
        error: 'entries array is required and must not be empty'
      };
    }

    // Validate batch type (one-to-many or many-to-one)
    const hasFromAccount = !!batchData.from_account;
    const hasToAccount = !!batchData.to_account;

    if (hasFromAccount && hasToAccount) {
      return {
        success: false,
        error: 'Specify either from_account (one-to-many) or to_account (many-to-one), not both'
      };
    }

    if (!hasFromAccount && !hasToAccount) {
      return {
        success: false,
        error: 'Either from_account or to_account must be specified for batch journals'
      };
    }

    // Validate each entry
    for (const entry of batchData.entries) {
      if (!entry.amount) {
        return {
          success: false,
          error: 'Each entry must have an amount'
        };
      }

      const amount = parseFloat(entry.amount);
      if (isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: 'Each entry amount must be a positive number'
        };
      }

      // For one-to-many, each entry needs to_account
      if (hasFromAccount && !entry.to_account) {
        return {
          success: false,
          error: 'Each entry must have to_account for one-to-many batch'
        };
      }

      // For many-to-one, each entry needs from_account
      if (hasToAccount && !entry.from_account) {
        return {
          success: false,
          error: 'Each entry must have from_account for many-to-one batch'
        };
      }
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-journals/batch`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batchData),
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to create batch journals'
      };
    }

    // Validate response
    const journalsValidation = z.array(JournalSchema).safeParse(result);
    if (!journalsValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    return {
      success: true,
      journals: journalsValidation.data
    };
  } catch (error) {
    console.error('Error creating batch journals:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Lists all journals with optional filtering
 */
export async function listJournals(
  params?: ListJournalsParams
): Promise<{ success: boolean; journals?: Journal[]; error?: string }> {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.after) queryParams.append('after', params.after);
      if (params.before) queryParams.append('before', params.before);
      if (params.status) queryParams.append('status', params.status);
      if (params.entry_type) queryParams.append('entry_type', params.entry_type);
      if (params.to_account) queryParams.append('to_account', params.to_account);
      if (params.from_account) queryParams.append('from_account', params.from_account);
    }

    const queryString = queryParams.toString();
    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-journals${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to list journals'
      };
    }

    // Validate response
    const journalsValidation = z.array(JournalSchema).safeParse(result);
    if (!journalsValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    return {
      success: true,
      journals: journalsValidation.data
    };
  } catch (error) {
    console.error('Error listing journals:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Cancels a pending journal entry
 * Note: Only journals in 'pending' status can be canceled
 * Executed journals require a reverse journal to undo
 */
export async function cancelJournal(
  journalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!journalId) {
      return {
        success: false,
        error: 'Journal ID is required'
      };
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-journals/${journalId}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'DELETE',
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to cancel journal'
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Error canceling journal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
