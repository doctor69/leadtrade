// Trading mode configuration management
import { env } from './env';

export type TradingMode = 'paper' | 'live';

export interface AlpacaConfig {
  brokerApiKey: string;
  brokerApiSecret: string;
  brokerBaseUrl: string;
  dataApiKey: string;
  dataApiSecret: string;
  dataBaseUrl: string;
  wsUrl: string;
}

export interface TradingModeConfig {
  paper: AlpacaConfig;
  live: AlpacaConfig;
}

// Trading mode configuration object
export const tradingModeConfig: TradingModeConfig = {
  paper: {
    brokerApiKey: env.PUBLIC_ALPACA_PAPER_API_KEY,
    brokerApiSecret: env.PUBLIC_ALPACA_PAPER_API_SECRET,
    brokerBaseUrl: env.PUBLIC_ALPACA_PAPER_BASE_URL,
    dataApiKey: env.PUBLIC_ALPACA_DATA_API_KEY,
    dataApiSecret: env.PUBLIC_ALPACA_DATA_API_SECRET,
    dataBaseUrl: env.PUBLIC_ALPACA_DATA_BASE_URL,
    wsUrl: env.PUBLIC_ALPACA_PAPER_WS_URL,
  },
  live: {
    brokerApiKey: env.PUBLIC_ALPACA_LIVE_API_KEY,
    brokerApiSecret: env.PUBLIC_ALPACA_LIVE_API_SECRET,
    brokerBaseUrl: env.PUBLIC_ALPACA_LIVE_BASE_URL,
    dataApiKey: env.PUBLIC_ALPACA_DATA_API_KEY,
    dataApiSecret: env.PUBLIC_ALPACA_DATA_API_SECRET,
    dataBaseUrl: env.PUBLIC_ALPACA_DATA_BASE_URL,
    wsUrl: env.PUBLIC_ALPACA_LIVE_WS_URL,
  },
};

/**
 * Get Alpaca configuration for the specified trading mode
 * @param mode - Trading mode ('paper' or 'live')
 * @returns AlpacaConfig object with appropriate API endpoints and credentials
 */
export function getAlpacaConfig(mode: TradingMode): AlpacaConfig {
  const config = tradingModeConfig[mode];
  
  if (!config) {
    throw new Error(`Invalid trading mode: ${mode}`);
  }
  
  // Validate that required configuration is present
  const requiredFields: (keyof AlpacaConfig)[] = [
    'brokerApiKey',
    'brokerApiSecret',
    'brokerBaseUrl',
    'dataApiKey',
    'dataApiSecret',
    'dataBaseUrl',
    'wsUrl',
  ];
  
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    throw new Error(
      `Missing required ${mode} trading configuration: ${missingFields.join(', ')}`
    );
  }
  
  return config;
}

/**
 * Get basic authentication header for Alpaca API
 * @param mode - Trading mode ('paper' or 'live')
 * @returns Base64 encoded credentials for Basic auth
 */
export function getAlpacaAuthHeader(mode: TradingMode): string {
  const config = getAlpacaConfig(mode);
  return btoa(`${config.brokerApiKey}:${config.brokerApiSecret}`);
}

/**
 * Get data API authentication header for Alpaca Data API
 * @param mode - Trading mode ('paper' or 'live')
 * @returns Base64 encoded credentials for Basic auth
 */
export function getAlpacaDataAuthHeader(mode: TradingMode): string {
  const config = getAlpacaConfig(mode);
  return btoa(`${config.dataApiKey}:${config.dataApiSecret}`);
}

/**
 * Create HTTP headers for Alpaca Broker API requests
 * @param mode - Trading mode ('paper' or 'live')
 * @returns Headers object ready for fetch requests
 */
export function createAlpacaBrokerHeaders(mode: TradingMode): Headers {
  const headers = new Headers();
  headers.append('Accept', 'application/json');
  headers.append('Content-Type', 'application/json');
  headers.append('Authorization', `Basic ${getAlpacaAuthHeader(mode)}`);
  return headers;
}

/**
 * Create HTTP headers for Alpaca Data API requests
 * @param mode - Trading mode ('paper' or 'live')
 * @returns Headers object ready for fetch requests
 */
export function createAlpacaDataHeaders(mode: TradingMode): Headers {
  const headers = new Headers();
  headers.append('Accept', 'application/json');
  headers.append('Content-Type', 'application/json');
  headers.append('Authorization', `Basic ${getAlpacaDataAuthHeader(mode)}`);
  return headers;
}

/**
 * Validate that all required environment variables are set for a trading mode
 * @param mode - Trading mode to validate
 * @returns Object with validation status and missing variables
 */
export function validateTradingModeConfig(mode: TradingMode): {
  valid: boolean;
  missing: string[];
} {
  try {
    getAlpacaConfig(mode);
    return { valid: true, missing: [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const missing = errorMessage.includes('Missing required')
      ? errorMessage.split(': ')[1]?.split(', ') || []
      : [];
    
    return { valid: false, missing };
  }
}

/**
 * Check if both paper and live trading configurations are valid
 * @returns Object with validation status for both modes
 */
export function validateAllTradingModes(): {
  paper: { valid: boolean; missing: string[] };
  live: { valid: boolean; missing: string[] };
} {
  return {
    paper: validateTradingModeConfig('paper'),
    live: validateTradingModeConfig('live'),
  };
}

/**
 * Get app-level trading mode (not user-specific)
 * All users use the same trading mode set at the app level
 * @returns Promise resolving to the app's trading mode
 */
export async function getAppTradingMode(): Promise<TradingMode> {
  try {
    // Import app settings to avoid circular dependencies
    const { getAppTradingMode } = await import('./app-settings');
    return await getAppTradingMode();
  } catch (error) {
    console.warn('Error fetching app trading mode, defaulting to paper:', error);
    return 'paper';
  }
}

/**
 * Get current trading mode (app-level, not user-specific)
 * @returns Promise resolving to the app's trading mode
 */
export async function getCurrentTradingMode(): Promise<TradingMode> {
  return await getAppTradingMode();
}

/**
 * Update app-level trading mode (admin only)
 * @param mode - New trading mode to set for the entire app
 * @returns Promise resolving to success status
 */
export async function updateAppTradingMode(mode: TradingMode): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate that the requested trading mode is properly configured
    const configValidation = validateTradingModeConfig(mode);
    if (!configValidation.valid) {
      return {
        success: false,
        error: `${mode} trading is not properly configured. Missing: ${configValidation.missing.join(', ')}`,
      };
    }

    // Import app settings to avoid circular dependencies
    const { updateAppTradingMode } = await import('./app-settings');
    return await updateAppTradingMode(mode);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get trading mode configuration summary for display
 * @returns Object with configuration status and details
 */
export function getTradingModeConfigSummary(): {
  paper: { valid: boolean; missing: string[]; config?: AlpacaConfig };
  live: { valid: boolean; missing: string[]; config?: AlpacaConfig };
} {
  const validation = validateAllTradingModes();
  
  const result = {
    paper: { ...validation.paper, config: undefined as AlpacaConfig | undefined },
    live: { ...validation.live, config: undefined as AlpacaConfig | undefined },
  };

  // Include config if valid
  if (validation.paper.valid) {
    try {
      result.paper.config = getAlpacaConfig('paper');
    } catch (error) {
      // Config not available
    }
  }

  if (validation.live.valid) {
    try {
      result.live.config = getAlpacaConfig('live');
    } catch (error) {
      // Config not available
    }
  }

  return result;
}

/**
 * Check if a specific trading mode is available and configured
 * @param mode - Trading mode to check
 * @returns Boolean indicating if the mode is ready to use
 */
export function isTradingModeAvailable(mode: TradingMode): boolean {
  const validation = validateTradingModeConfig(mode);
  return validation.valid;
}

/**
 * Get available trading modes based on configuration
 * @returns Array of available trading modes
 */
export function getAvailableTradingModes(): TradingMode[] {
  const modes: TradingMode[] = [];
  
  if (isTradingModeAvailable('paper')) {
    modes.push('paper');
  }
  
  if (isTradingModeAvailable('live')) {
    modes.push('live');
  }
  
  return modes;
}

/**
 * Debug function to log trading mode configuration status
 * @param mode - Optional specific mode to debug, or all modes if not specified
 */
export function debugTradingConfig(mode?: TradingMode): void {
  if (mode) {
    const validation = validateTradingModeConfig(mode);
    console.log(`🔧 ${mode.toUpperCase()} Trading Configuration:`);
    console.log(`✅ Valid: ${validation.valid}`);
    
    if (!validation.valid) {
      console.log(`❌ Missing: ${validation.missing.join(', ')}`);
    }
  } else {
    const allValidation = validateAllTradingModes();
    console.log('🔧 Trading Mode Configuration Status:');
    console.log(`📄 Paper Trading: ${allValidation.paper.valid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`💰 Live Trading: ${allValidation.live.valid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (!allValidation.paper.valid) {
      console.log(`❌ Paper missing: ${allValidation.paper.missing.join(', ')}`);
    }
    
    if (!allValidation.live.valid) {
      console.log(`❌ Live missing: ${allValidation.live.missing.join(', ')}`);
    }
  }
}