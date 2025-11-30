/**
 * Alpaca Options Contracts API Client
 * 
 * Provides functions for interacting with Alpaca's options contracts endpoints
 * to list and retrieve option contract details.
 * 
 * Requirements: 7.1, 7.2
 */

import { z } from 'zod';

// Zod schemas for validation
export const optionContractSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  status: z.enum(['active', 'inactive']),
  tradable: z.boolean(),
  expiration_date: z.string(),
  underlying_symbol: z.string(),
  underlying_asset_id: z.string(),
  type: z.enum(['call', 'put']),
  style: z.enum(['american', 'european']),
  strike_price: z.string(),
  multiplier: z.string(),
  size: z.string(),
  open_interest: z.string().optional(),
  open_interest_date: z.string().optional(),
  close_price: z.string().optional(),
  close_price_date: z.string().optional(),
  root_symbol: z.string(),
  deliverable: z.string().optional(),
});

export const optionContractsListSchema = z.object({
  option_contracts: z.array(optionContractSchema),
  next_page_token: z.string().nullable().optional(),
});

export type OptionContract = z.infer<typeof optionContractSchema>;
export type OptionContractsList = z.infer<typeof optionContractsListSchema>;

export interface ListOptionsContractsParams {
  underlying_symbols?: string; // comma-separated
  status?: 'active' | 'inactive';
  expiration_date?: string; // YYYY-MM-DD
  expiration_date_gte?: string; // Greater than or equal
  expiration_date_lte?: string; // Less than or equal
  root_symbol?: string;
  type?: 'call' | 'put';
  style?: 'american' | 'european';
  strike_price_gte?: string; // Greater than or equal
  strike_price_lte?: string; // Less than or equal
  limit?: number;
  page_token?: string;
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: ListOptionsContractsParams): string {
  const queryParams = new URLSearchParams();
  
  if (params.underlying_symbols) queryParams.append('underlying_symbols', params.underlying_symbols);
  if (params.status) queryParams.append('status', params.status);
  if (params.expiration_date) queryParams.append('expiration_date', params.expiration_date);
  if (params.expiration_date_gte) queryParams.append('expiration_date_gte', params.expiration_date_gte);
  if (params.expiration_date_lte) queryParams.append('expiration_date_lte', params.expiration_date_lte);
  if (params.root_symbol) queryParams.append('root_symbol', params.root_symbol);
  if (params.type) queryParams.append('type', params.type);
  if (params.style) queryParams.append('style', params.style);
  if (params.strike_price_gte) queryParams.append('strike_price_gte', params.strike_price_gte);
  if (params.strike_price_lte) queryParams.append('strike_price_lte', params.strike_price_lte);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.page_token) queryParams.append('page_token', params.page_token);

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * List option contracts with filtering
 * 
 * @param params - Query parameters for filtering contracts
 * @returns Promise with result containing list of option contracts
 * 
 * Requirements: 7.1
 */
export async function listOptionsContracts(
  params: ListOptionsContractsParams = {}
): Promise<{ success: boolean; data?: OptionContractsList; error?: string }> {
  try {
    const queryString = buildQueryString(params);
    const edgeFunctionUrl = `${import.meta.env.SUPABASE_URL}/functions/v1/alpaca-options-contracts${queryString}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Failed to list options contracts'
      };
    }

    const data = await response.json();
    
    // Validate response
    const validation = optionContractsListSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }
    
    return {
      success: true,
      data: validation.data
    };
  } catch (error) {
    console.error('Error listing options contracts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get specific option contract details by ID or symbol
 * 
 * @param contractId - The contract ID or symbol
 * @returns Promise with result containing option contract details
 * 
 * Requirements: 7.2
 */
export async function getOptionContract(
  contractId: string
): Promise<{ success: boolean; data?: OptionContract; error?: string }> {
  try {
    const edgeFunctionUrl = `${import.meta.env.SUPABASE_URL}/functions/v1/alpaca-options-contracts/${contractId}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || `Failed to get option contract ${contractId}`
      };
    }

    const data = await response.json();
    
    // Validate response
    const validation = optionContractSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }
    
    return {
      success: true,
      data: validation.data
    };
  } catch (error) {
    console.error(`Error getting option contract ${contractId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get option contracts for a specific underlying symbol
 * 
 * @param underlyingSymbol - The underlying stock symbol (e.g., 'AAPL')
 * @param params - Additional filtering parameters
 * @returns Promise with result containing list of option contracts
 * 
 * Requirements: 7.1
 */
export async function getOptionsChain(
  underlyingSymbol: string,
  params: Omit<ListOptionsContractsParams, 'underlying_symbols'> = {}
): Promise<{ success: boolean; data?: OptionContractsList; error?: string }> {
  return listOptionsContracts({
    ...params,
    underlying_symbols: underlyingSymbol,
  });
}

/**
 * Get option contracts expiring on a specific date
 * 
 * @param expirationDate - The expiration date (YYYY-MM-DD)
 * @param params - Additional filtering parameters
 * @returns Promise with result containing list of option contracts
 * 
 * Requirements: 7.1
 */
export async function getOptionsByExpiration(
  expirationDate: string,
  params: Omit<ListOptionsContractsParams, 'expiration_date'> = {}
): Promise<{ success: boolean; data?: OptionContractsList; error?: string }> {
  return listOptionsContracts({
    ...params,
    expiration_date: expirationDate,
  });
}

/**
 * Get option contracts within a strike price range
 * 
 * @param minStrike - Minimum strike price
 * @param maxStrike - Maximum strike price
 * @param params - Additional filtering parameters
 * @returns Promise with result containing list of option contracts
 * 
 * Requirements: 7.1
 */
export async function getOptionsByStrikeRange(
  minStrike: number,
  maxStrike: number,
  params: Omit<ListOptionsContractsParams, 'strike_price_gte' | 'strike_price_lte'> = {}
): Promise<{ success: boolean; data?: OptionContractsList; error?: string }> {
  return listOptionsContracts({
    ...params,
    strike_price_gte: minStrike.toString(),
    strike_price_lte: maxStrike.toString(),
  });
}

// =============================================================================
// OPTIONS EXERCISE
// =============================================================================

export const optionExerciseRequestSchema = z.object({
  symbol_or_contract_id: z.string().min(1, 'Symbol or contract ID is required')
});

export const optionExerciseResponseSchema = z.object({
  message: z.string(),
  symbol: z.string()
});

export type OptionExerciseRequest = z.infer<typeof optionExerciseRequestSchema>;
export type OptionExerciseResponse = z.infer<typeof optionExerciseResponseSchema>;

/**
 * Exercise an option position (server-side)
 * 
 * @param symbolOrContractId - The option symbol or contract ID to exercise
 * @param tradingMode - Trading mode (paper or live)
 * @returns Promise with result containing exercise confirmation
 * 
 * Requirements: 7.3, 7.4, 7.5
 */
export async function exerciseOption(
  symbolOrContractId: string,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; data?: OptionExerciseResponse; error?: string }> {
  try {
    const edgeFunctionUrl = `${import.meta.env.SUPABASE_URL}/functions/v1/alpaca-options-exercise`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trading-mode': tradingMode,
      },
      body: JSON.stringify({ symbol_or_contract_id: symbolOrContractId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Failed to exercise option'
      };
    }

    const data = await response.json();
    const validated = optionExerciseResponseSchema.parse(data);
    
    return {
      success: true,
      data: validated
    };
  } catch (error) {
    console.error('Error exercising option:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Exercise an option position (client-side)
 * 
 * @param symbolOrContractId - The option symbol or contract ID to exercise
 * @returns Promise with exercise confirmation
 * 
 * Requirements: 7.3, 7.4, 7.5
 */
export async function exerciseOptionClient(symbolOrContractId: string): Promise<OptionExerciseResponse> {
  try {
    const response = await fetch('/api/alpaca/options/exercise', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ symbol_or_contract_id: symbolOrContractId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to exercise option');
    }

    const data = await response.json();
    return optionExerciseResponseSchema.parse(data);
  } catch (error) {
    console.error('Error exercising option:', error);
    throw error;
  }
}
