// Alpaca Reporting API Client Library
// Provides platform-wide reporting capabilities for positions and analytics
// Requirements: 17.1, 17.2, 17.3, 17.4, 17.5

import { z } from 'zod';

// =============================================================================
// SCHEMAS
// =============================================================================

const AggregatePositionAccountSchema = z.object({
  account_id: z.string(),
  qty: z.string(),
  market_value: z.string(),
  cost_basis: z.string(),
  unrealized_pl: z.string(),
});

const AggregatePositionSchema = z.object({
  symbol: z.string(),
  asset_id: z.string(),
  asset_class: z.string(),
  total_qty: z.string(),
  total_market_value: z.string(),
  total_cost_basis: z.string(),
  total_unrealized_pl: z.string(),
  total_unrealized_plpc: z.string(),
  account_count: z.number(),
  accounts: z.array(AggregatePositionAccountSchema),
});

const AggregatePositionsResponseSchema = z.object({
  positions: z.array(AggregatePositionSchema),
  next_page_token: z.string().optional(),
});

const EODPositionSchema = z.object({
  account_id: z.string(),
  account_number: z.string(),
  symbol: z.string(),
  asset_id: z.string(),
  asset_class: z.string(),
  qty: z.string(),
  market_value: z.string(),
  cost_basis: z.string(),
  unrealized_pl: z.string(),
  unrealized_plpc: z.string(),
  avg_entry_price: z.string(),
  side: z.enum(['long', 'short']),
  exchange: z.string(),
});

const EODPositionsResponseSchema = z.object({
  date: z.string(),
  positions: z.array(EODPositionSchema),
  next_page_token: z.string().optional(),
});

// =============================================================================
// TYPES
// =============================================================================

export type AggregatePositionAccount = z.infer<typeof AggregatePositionAccountSchema>;
export type AggregatePosition = z.infer<typeof AggregatePositionSchema>;
export type AggregatePositionsResponse = z.infer<typeof AggregatePositionsResponseSchema>;
export type EODPosition = z.infer<typeof EODPositionSchema>;
export type EODPositionsResponse = z.infer<typeof EODPositionsResponseSchema>;

export interface GetAggregatePositionsParams {
  date?: string; // YYYY-MM-DD format
  symbols?: string[]; // Array of symbols
  accountIds?: string[]; // Array of account IDs
  includeFirmAccounts?: boolean;
  pageToken?: string;
  limit?: number;
}

export interface GetEODPositionsParams {
  date: string; // YYYY-MM-DD format (required)
  symbols?: string[]; // Array of symbols
  accountIds?: string[]; // Array of account IDs
  includeFirmAccounts?: boolean;
  pageToken?: string;
  limit?: number;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get aggregate positions across all accounts
 * Requirements: 17.1, 17.3, 17.4, 17.5
 * 
 * @param params - Query parameters for filtering
 * @returns Promise with aggregate positions data
 */
export async function getAggregatePositions(
  params?: GetAggregatePositionsParams
): Promise<{ success: boolean; data?: AggregatePositionsResponse; error?: string }> {
  try {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.date) queryParams.append('date', params.date);
      if (params.symbols && params.symbols.length > 0) {
        queryParams.append('symbols', params.symbols.join(','));
      }
      if (params.accountIds && params.accountIds.length > 0) {
        queryParams.append('account_ids', params.accountIds.join(','));
      }
      if (params.includeFirmAccounts !== undefined) {
        queryParams.append('include_firm_accounts', params.includeFirmAccounts.toString());
      }
      if (params.pageToken) queryParams.append('page_token', params.pageToken);
      if (params.limit) queryParams.append('limit', params.limit.toString());
    }

    const queryString = queryParams.toString();
    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-reports/aggregate_positions${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to retrieve aggregate positions',
      };
    }

    // Validate response
    const validation = AggregatePositionsResponseSchema.safeParse(result);

    if (!validation.success) {
      console.error('Invalid aggregate positions response:', validation.error);
      return {
        success: false,
        error: 'Invalid response format from server',
      };
    }

    return {
      success: true,
      data: validation.data,
    };
  } catch (error) {
    console.error('Error retrieving aggregate positions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get end-of-day positions for all accounts
 * Requirements: 17.2, 17.3, 17.4, 17.5
 * 
 * @param params - Query parameters (date is required)
 * @returns Promise with EOD positions data
 */
export async function getEODPositions(
  params: GetEODPositionsParams
): Promise<{ success: boolean; data?: EODPositionsResponse; error?: string }> {
  try {
    if (!params.date) {
      return {
        success: false,
        error: 'Date parameter is required (format: YYYY-MM-DD)',
      };
    }

    const queryParams = new URLSearchParams();
    queryParams.append('date', params.date);

    if (params.symbols && params.symbols.length > 0) {
      queryParams.append('symbols', params.symbols.join(','));
    }
    if (params.accountIds && params.accountIds.length > 0) {
      queryParams.append('account_ids', params.accountIds.join(','));
    }
    if (params.includeFirmAccounts !== undefined) {
      queryParams.append('include_firm_accounts', params.includeFirmAccounts.toString());
    }
    if (params.pageToken) queryParams.append('page_token', params.pageToken);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-reports/eod_positions?${queryString}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to retrieve EOD positions',
      };
    }

    // Validate response
    const validation = EODPositionsResponseSchema.safeParse(result);

    if (!validation.success) {
      console.error('Invalid EOD positions response:', validation.error);
      return {
        success: false,
        error: 'Invalid response format from server',
      };
    }

    return {
      success: true,
      data: validation.data,
    };
  } catch (error) {
    console.error('Error retrieving EOD positions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Helper function to format date for API calls
 * @param date - Date object or string
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatReportDate(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Helper function to calculate total portfolio metrics from aggregate positions
 * @param positions - Array of aggregate positions
 * @returns Portfolio summary metrics
 */
export function calculatePortfolioMetrics(positions: AggregatePosition[]) {
  let totalMarketValue = 0;
  let totalCostBasis = 0;
  let totalUnrealizedPL = 0;

  positions.forEach((position) => {
    totalMarketValue += parseFloat(position.total_market_value);
    totalCostBasis += parseFloat(position.total_cost_basis);
    totalUnrealizedPL += parseFloat(position.total_unrealized_pl);
  });

  const totalUnrealizedPLPC = totalCostBasis > 0 
    ? ((totalUnrealizedPL / totalCostBasis) * 100).toFixed(2)
    : '0.00';

  return {
    totalMarketValue: totalMarketValue.toFixed(2),
    totalCostBasis: totalCostBasis.toFixed(2),
    totalUnrealizedPL: totalUnrealizedPL.toFixed(2),
    totalUnrealizedPLPC,
    positionCount: positions.length,
  };
}
