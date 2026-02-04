/**
 * Alpaca Corporate Actions Service
 * 
 * Handles corporate action announcements (dividends, mergers, spinoffs, splits)
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { createClient } from '@supabase/supabase-js';

export interface CorporateAction {
  id: string;
  corporate_action_id: string;
  ca_type: 'dividend' | 'merger' | 'spinoff' | 'split';
  ca_sub_type?: string;
  initiating_symbol: string;
  initiating_original_cusip: string;
  target_symbol?: string;
  target_original_cusip?: string;
  declaration_date?: string;
  ex_date?: string;
  record_date?: string;
  payable_date?: string;
  cash?: string;
  old_rate?: string;
  new_rate?: string;
}

export interface GetCorporateActionsParams {
  ca_types?: string; // Comma-separated list: dividend,merger,spinoff,split
  symbol?: string;
  cusip?: string;
  date_type?: 'declaration_date' | 'ex_date' | 'record_date' | 'payable_date';
  since?: string; // ISO date format
  until?: string; // ISO date format
  page_token?: string;
  page_size?: number;
}

/**
 * List corporate action announcements with filtering
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export async function listCorporateActions(
  params?: GetCorporateActionsParams,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; data?: CorporateAction[]; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        error: 'Supabase configuration missing',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Build query string
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    queryParams.append('trading_mode', tradingMode);

    const queryString = queryParams.toString();
    const url = `${supabaseUrl}/functions/v1/alpaca-corporate-actions/announcements${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to list corporate actions';
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

    const data: CorporateAction[] = await response.json();
    
    // Handle nested response structure from Edge Function
    // Edge Function wraps response in { success: true, data: [...], timestamp: ... }
    let actions: CorporateAction[] = [];
    if (Array.isArray(data)) {
      actions = data;
    } else if ((data as any).data && Array.isArray((data as any).data)) {
      actions = (data as any).data;
    }
    
    return {
      success: true,
      data: actions,
    };

  } catch (error) {
    console.error('Error listing corporate actions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get a specific corporate action announcement by ID
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export async function getCorporateAction(
  announcementId: string,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; data?: CorporateAction; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        error: 'Supabase configuration missing',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const url = `${supabaseUrl}/functions/v1/alpaca-corporate-actions/announcements/${announcementId}?trading_mode=${tradingMode}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to get corporate action';
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

    const data: CorporateAction = await response.json();
    
    return {
      success: true,
      data,
    };

  } catch (error) {
    console.error('Error getting corporate action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
