/**
 * Alpaca Corporate Actions Service
 * 
 * Handles corporate action announcements (dividends, mergers, spinoffs, splits)
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { getAlpacaConfig } from './trading-config';

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
    const config = getAlpacaConfig(tradingMode);
    
    const headers = {
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    };

    // Build query string
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    const url = `${config.brokerBaseUrl}/v1/corporate_actions/announcements${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
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
    
    return {
      success: true,
      data,
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
    const config = getAlpacaConfig(tradingMode);
    
    const headers = {
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    };

    const url = `${config.brokerBaseUrl}/v1/corporate_actions/announcements/${announcementId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
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
