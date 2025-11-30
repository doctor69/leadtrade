// Alpaca Account Creation and Management Service
import { getAlpacaConfig } from './trading-config';

export interface AlpacaAccountData {
  given_name: string;
  family_name: string;
  date_of_birth: string;
  tax_id: string;
  tax_id_type: string;
  phone_number: string;
  email_address: string;
  street_address: string[];
  city: string;
  state: string;
  postal_code: string;
  country: string;
  annual_income_min: string;
  annual_income_max: string;
  total_net_worth_min: string;
  total_net_worth_max: string;
  liquid_net_worth_min: string;
  liquid_net_worth_max: string;
  investment_experience_with_stocks: string;
  investment_objective: string;
  risk_tolerance: string;
}

export interface AlpacaAccountResponse {
  id: string;
  account_number: string;
  status: string;
  crypto_status?: string;
  currency: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  non_marginable_buying_power: string;
  cash: string;
  accrued_fees: string;
  pending_transfer_out: string;
  pending_transfer_in: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  pdt_removed?: boolean;
  pdt_removed_at?: string;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  multiplier: string;
  shorting_enabled: boolean;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_maintenance_margin: string;
  sma: string;
  daytrade_count: number;
}

export interface CreateAlpacaAccountResult {
  success: boolean;
  account?: AlpacaAccountResponse;
  error?: string;
  accountId?: string;
}

/**
 * Creates an Alpaca trading account using the Broker API
 */
export async function createAlpacaAccount(
  accountData: AlpacaAccountData,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<CreateAlpacaAccountResult> {
  try {
    const config = getAlpacaConfig(tradingMode);
    
    // Prepare the account creation payload
    const payload = {
      contact: {
        email_address: accountData.email_address,
        phone_number: accountData.phone_number,
        street_address: accountData.street_address,
        city: accountData.city,
        state: accountData.state,
        postal_code: accountData.postal_code,
        country: accountData.country || 'USA',
      },
      identity: {
        given_name: accountData.given_name,
        family_name: accountData.family_name,
        date_of_birth: accountData.date_of_birth,
        tax_id: accountData.tax_id,
        tax_id_type: accountData.tax_id_type,
        country_of_citizenship: 'USA',
        country_of_birth: 'USA',
        country_of_tax_residence: 'USA',
        funding_source: ['employment_income'],
      },
      disclosures: {
        is_control_person: false,
        is_affiliated_exchange_or_finra: false,
        is_politically_exposed: false,
        immediate_family_exposed: false,
        employment_status: 'employed',
        employer_name: 'Self Employed',
        employer_address: {
          street_address: accountData.street_address,
          city: accountData.city,
          state: accountData.state,
          postal_code: accountData.postal_code,
          country: 'USA',
        },
        employment_position: 'Other',
      },
      agreements: [
        {
          agreement: 'margin_agreement',
          signed_at: new Date().toISOString(),
          ip_address: '127.0.0.1', // This should be the actual client IP in production
        },
        {
          agreement: 'account_agreement',
          signed_at: new Date().toISOString(),
          ip_address: '127.0.0.1',
        },
        {
          agreement: 'customer_agreement',
          signed_at: new Date().toISOString(),
          ip_address: '127.0.0.1',
        },
      ],
      documents: [
        {
          document_type: 'identity_verification',
          document_sub_type: 'passport',
          content: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8H//2Q==', // Placeholder base64 image
          mime_type: 'image/jpeg',
        },
      ],
      trusted_contact: {
        given_name: accountData.given_name,
        family_name: accountData.family_name,
        email_address: accountData.email_address,
      },
    };

    // Add financial profile
    const financialProfile = {
      annual_income_min: parseInt(accountData.annual_income_min),
      annual_income_max: parseInt(accountData.annual_income_max),
      total_net_worth_min: parseInt(accountData.total_net_worth_min),
      total_net_worth_max: parseInt(accountData.total_net_worth_max),
      liquid_net_worth_min: parseInt(accountData.liquid_net_worth_min),
      liquid_net_worth_max: parseInt(accountData.liquid_net_worth_max),
      investment_experience: accountData.investment_experience_with_stocks,
      investment_objective: accountData.investment_objective,
      risk_tolerance: accountData.risk_tolerance,
    };

    const headers = {
      'Content-Type': 'application/json',
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    };

    console.log(`Creating Alpaca account in ${tradingMode} mode`);

    const response = await fetch(`${config.brokerBaseUrl}/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        ...financialProfile,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Alpaca account creation failed:', errorText);
      
      let errorMessage = 'Failed to create Alpaca account';
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

    const accountResponse: AlpacaAccountResponse = await response.json();
    
    console.log('Alpaca account created successfully:', accountResponse.id);

    return {
      success: true,
      account: accountResponse,
      accountId: accountResponse.id,
    };

  } catch (error) {
    console.error('Error creating Alpaca account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Retrieves Alpaca account information
 */
export async function getAlpacaAccount(
  accountId: string,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; account?: AlpacaAccountResponse; error?: string }> {
  try {
    const config = getAlpacaConfig(tradingMode);
    
    const headers = {
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    };

    const response = await fetch(`${config.brokerBaseUrl}/accounts/${accountId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to retrieve account: ${response.status} ${response.statusText}`,
      };
    }

    const account: AlpacaAccountResponse = await response.json();
    
    return {
      success: true,
      account,
    };

  } catch (error) {
    console.error('Error retrieving Alpaca account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export interface AccountUpdateRequest {
  contact?: {
    email_address?: string;
    phone_number?: string;
    street_address?: string[];
    city?: string;
    state?: string;
    postal_code?: string;
  };
  identity?: {
    given_name?: string;
    family_name?: string;
    date_of_birth?: string;
    country_of_citizenship?: string;
    funding_source?: string[];
  };
  disclosures?: {
    is_control_person?: boolean;
    is_affiliated_exchange_or_finra?: boolean;
    is_politically_exposed?: boolean;
    immediate_family_exposed?: boolean;
  };
  trusted_contact?: {
    given_name?: string;
    family_name?: string;
    email_address?: string;
  };
}

/**
 * Updates Alpaca account information
 */
export async function updateAlpacaAccount(
  accountId: string,
  updates: AccountUpdateRequest,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; account?: AlpacaAccountResponse; error?: string }> {
  try {
    const config = getAlpacaConfig(tradingMode);
    
    const headers = {
      'Content-Type': 'application/json',
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    };

    const response = await fetch(`${config.brokerBaseUrl}/accounts/${accountId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to update account';
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

    const account: AlpacaAccountResponse = await response.json();
    
    return {
      success: true,
      account,
    };

  } catch (error) {
    console.error('Error updating Alpaca account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Closes an Alpaca account
 */
export async function closeAlpacaAccount(
  accountId: string,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getAlpacaConfig(tradingMode);
    
    const headers = {
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    };

    const response = await fetch(`${config.brokerBaseUrl}/accounts/${accountId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to close account';
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

    return {
      success: true,
    };

  } catch (error) {
    console.error('Error closing Alpaca account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Requests options approval for an account
 */
export async function requestOptionsApproval(
  accountId: string,
  level: number,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; status?: string; level?: number; error?: string }> {
  try {
    if (level < 0 || level > 3) {
      return {
        success: false,
        error: 'Options approval level must be between 0 and 3',
      };
    }

    const config = getAlpacaConfig(tradingMode);
    
    const headers = {
      'Content-Type': 'application/json',
      'APCA-API-KEY-ID': config.brokerApiKey,
      'APCA-API-SECRET-KEY': config.brokerApiSecret,
    };

    const response = await fetch(`${config.brokerBaseUrl}/accounts/${accountId}/options_approval`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ level }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to request options approval';
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

    const result = await response.json();
    
    return {
      success: true,
      status: result.status,
      level: result.level,
    };

  } catch (error) {
    console.error('Error requesting options approval:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export interface GetAccountsParams {
  query?: string;
  created_after?: string;
  created_before?: string;
  status?: string;
  sort?: string;
  entities?: string;
}

/**
 * Retrieves all Alpaca accounts with optional filtering
 */
export async function getAlpacaAccounts(
  params?: GetAccountsParams,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; accounts?: AlpacaAccountResponse[]; error?: string }> {
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
        if (value) queryParams.append(key, value);
      });
    }

    const queryString = queryParams.toString();
    const url = `${config.brokerBaseUrl}/accounts${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to retrieve accounts: ${response.status} ${response.statusText}`,
      };
    }

    const accounts: AlpacaAccountResponse[] = await response.json();
    
    return {
      success: true,
      accounts,
    };

  } catch (error) {
    console.error('Error retrieving Alpaca accounts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export interface AccountActivity {
  id: string;
  account_id: string;
  activity_type: string;
  date: string;
  net_amount: string;
  description: string;
  status: string;
}

export interface GetActivitiesParams {
  activity_types?: string;
  date?: string;
  until?: string;
  after?: string;
  direction?: 'asc' | 'desc';
  page_size?: number;
  page_token?: string;
}

/**
 * Retrieves account activities with pagination support
 */
export async function getAccountActivities(
  accountId: string,
  params?: GetActivitiesParams,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<{ success: boolean; activities?: AccountActivity[]; error?: string }> {
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
    const url = `${config.brokerBaseUrl}/accounts/${accountId}/activities${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to retrieve account activities: ${response.status} ${response.statusText}`,
      };
    }

    const activities: AccountActivity[] = await response.json();
    
    return {
      success: true,
      activities,
    };

  } catch (error) {
    console.error('Error retrieving account activities:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
/**

 * Removes the Pattern Day Trader (PDT) flag from an account (one-time only)
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export async function removePDTFlag(
  accountId: string
): Promise<{ success: boolean; message?: string; pdt_removed?: boolean; pdt_removed_at?: string; error?: string }> {
  try {
    if (!accountId) {
      return {
        success: false,
        error: 'Account ID is required'
      };
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-pdt-removal/${accountId}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to remove PDT flag'
      };
    }

    return {
      success: true,
      message: result.message || 'PDT flag removed successfully',
      pdt_removed: result.pdt_removed,
      pdt_removed_at: result.pdt_removed_at
    };

  } catch (error) {
    console.error('Error removing PDT flag:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
