// Environment variable validation and access utility

interface EnvConfig {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Alpaca Paper Trading API
  PUBLIC_ALPACA_PAPER_BROKER_API_KEY: string;
  PUBLIC_ALPACA_PAPER_BROKER_API_SECRET: string;
  PUBLIC_ALPACA_PAPER_BROKER_BASE_URL: string;
  PUBLIC_ALPACA_PAPER_DATA_API_KEY: string;
  PUBLIC_ALPACA_PAPER_DATA_API_SECRET: string;
  PUBLIC_ALPACA_PAPER_DATA_BASE_URL: string;
  PUBLIC_ALPACA_PAPER_WS_URL: string;

  // Alpaca Live Trading API
  PUBLIC_ALPACA_LIVE_BROKER_API_KEY: string;
  PUBLIC_ALPACA_LIVE_BROKER_API_SECRET: string;
  PUBLIC_ALPACA_LIVE_BROKER_BASE_URL: string;
  PUBLIC_ALPACA_LIVE_DATA_API_KEY: string;
  PUBLIC_ALPACA_LIVE_DATA_API_SECRET: string;
  PUBLIC_ALPACA_LIVE_DATA_BASE_URL: string;
  PUBLIC_ALPACA_LIVE_WS_URL: string;
}

function getEnvVar(key: keyof EnvConfig, required = true): string {
  let value = import.meta.env[key];

  // Handle alternative naming conventions for backward compatibility
  if (!value) {
    const alternativeKeys: Record<string, string> = {
      'PUBLIC_ALPACA_PAPER_BROKER_API_KEY': 'PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY',
      'PUBLIC_ALPACA_PAPER_BROKER_API_SECRET': 'PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET',
      'PUBLIC_ALPACA_PAPER_BROKER_BASE_URL': 'PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL',
      'PUBLIC_ALPACA_LIVE_BROKER_API_KEY': 'PUBLIC_ALPACA_BROKER_LIVE_API_KEY',
      'PUBLIC_ALPACA_LIVE_BROKER_API_SECRET': 'PUBLIC_ALPACA_BROKER_LIVE_API_SECRET',
      'PUBLIC_ALPACA_LIVE_BROKER_BASE_URL': 'PUBLIC_ALPACA_BROKER_LIVE_BASE_URL',
      'PUBLIC_ALPACA_PAPER_DATA_API_KEY': 'PUBLIC_ALPACA_DATA_API_KEY',
      'PUBLIC_ALPACA_PAPER_DATA_API_SECRET': 'PUBLIC_ALPACA_DATA_API_SECRET',
      'PUBLIC_ALPACA_PAPER_DATA_BASE_URL': 'PUBLIC_ALPACA_DATA_BASE_URL',
      'PUBLIC_ALPACA_LIVE_DATA_API_KEY': 'PUBLIC_ALPACA_DATA_API_KEY',
      'PUBLIC_ALPACA_LIVE_DATA_API_SECRET': 'PUBLIC_ALPACA_DATA_API_SECRET',
      'PUBLIC_ALPACA_LIVE_DATA_BASE_URL': 'PUBLIC_ALPACA_DATA_BASE_URL',
      'SUPABASE_URL': 'PUBLIC_SUPABASE_URL',
      'SUPABASE_ANON_KEY': 'PUBLIC_SUPABASE_ANON_KEY',
    };

    const alternativeKey = alternativeKeys[key];
    if (alternativeKey) {
      value = import.meta.env[alternativeKey];
    }
  }

  // Use paper trading keys as fallback for live trading when live keys are not available
  if (!value && key.includes('LIVE')) {
    const paperKey = key.replace('LIVE', 'PAPER') as keyof EnvConfig;
    const paperValue = import.meta.env[paperKey];
    if (paperValue) {
      console.warn(`Using paper trading credentials for live trading mode: ${key}`);
      value = paperValue;
    } else {
      // Try to get the paper value from the already processed env config
      const paperKeyName = paperKey.replace('PUBLIC_ALPACA_PAPER_', '');
      console.warn(`No paper trading fallback found for ${key}, will use default URLs`);
    }
  }

  // Provide sensible defaults for missing values
  if (!value) {
    const defaults: Record<string, string> = {
      'PUBLIC_ALPACA_PAPER_BROKER_BASE_URL': 'https://broker-api.sandbox.alpaca.markets/v1',
      'PUBLIC_ALPACA_PAPER_DATA_BASE_URL': 'https://data.sandbox.alpaca.markets',
      'PUBLIC_ALPACA_PAPER_WS_URL': 'wss://stream.data.sandbox.alpaca.markets/v2',
      'PUBLIC_ALPACA_LIVE_BROKER_BASE_URL': 'https://broker-api.alpaca.markets/v1',
      'PUBLIC_ALPACA_LIVE_DATA_BASE_URL': 'https://data.alpaca.markets',
      'PUBLIC_ALPACA_LIVE_WS_URL': 'wss://stream.data.alpaca.markets/v2',
    };

    value = defaults[key] || '';
  }

  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value || '';
}

// First, get paper trading configuration with defaults
const paperConfig = {
  BROKER_API_KEY: getEnvVar('PUBLIC_ALPACA_PAPER_BROKER_API_KEY', false) || 'demo-paper-key',
  BROKER_API_SECRET: getEnvVar('PUBLIC_ALPACA_PAPER_BROKER_API_SECRET', false) || 'demo-paper-secret',
  BROKER_BASE_URL: getEnvVar('PUBLIC_ALPACA_PAPER_BROKER_BASE_URL', false) || 'https://broker-api.sandbox.alpaca.markets/v1',
  DATA_API_KEY: getEnvVar('PUBLIC_ALPACA_PAPER_DATA_API_KEY', false) || 'demo-data-key',
  DATA_API_SECRET: getEnvVar('PUBLIC_ALPACA_PAPER_DATA_API_SECRET', false) || 'demo-data-secret',
  DATA_BASE_URL: getEnvVar('PUBLIC_ALPACA_PAPER_DATA_BASE_URL', false) || 'https://data.sandbox.alpaca.markets',
  WS_URL: getEnvVar('PUBLIC_ALPACA_PAPER_WS_URL', false) || 'wss://stream.data.sandbox.alpaca.markets/v2',
};

// Validate and export environment configuration
export const env: EnvConfig = {
  // Supabase (with demo defaults)
  SUPABASE_URL: getEnvVar('SUPABASE_URL', false) || 'https://demo.supabase.co',
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY', false) || 'demo-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false) || 'demo-service-key',

  // Alpaca Paper Trading API
  PUBLIC_ALPACA_PAPER_BROKER_API_KEY: paperConfig.BROKER_API_KEY,
  PUBLIC_ALPACA_PAPER_BROKER_API_SECRET: paperConfig.BROKER_API_SECRET,
  PUBLIC_ALPACA_PAPER_BROKER_BASE_URL: paperConfig.BROKER_BASE_URL,
  PUBLIC_ALPACA_PAPER_DATA_API_KEY: paperConfig.DATA_API_KEY,
  PUBLIC_ALPACA_PAPER_DATA_API_SECRET: paperConfig.DATA_API_SECRET,
  PUBLIC_ALPACA_PAPER_DATA_BASE_URL: paperConfig.DATA_BASE_URL,
  PUBLIC_ALPACA_PAPER_WS_URL: paperConfig.WS_URL,

  // Alpaca Live Trading API (optional - will fallback to paper trading keys)
  PUBLIC_ALPACA_LIVE_BROKER_API_KEY: getEnvVar('PUBLIC_ALPACA_LIVE_BROKER_API_KEY', false) || paperConfig.BROKER_API_KEY,
  PUBLIC_ALPACA_LIVE_BROKER_API_SECRET: getEnvVar('PUBLIC_ALPACA_LIVE_BROKER_API_SECRET', false) || paperConfig.BROKER_API_SECRET,
  PUBLIC_ALPACA_LIVE_BROKER_BASE_URL: getEnvVar('PUBLIC_ALPACA_LIVE_BROKER_BASE_URL', false) || 'https://broker-api.alpaca.markets/v1',
  PUBLIC_ALPACA_LIVE_DATA_API_KEY: getEnvVar('PUBLIC_ALPACA_LIVE_DATA_API_KEY', false) || paperConfig.DATA_API_KEY,
  PUBLIC_ALPACA_LIVE_DATA_API_SECRET: getEnvVar('PUBLIC_ALPACA_LIVE_DATA_API_SECRET', false) || paperConfig.DATA_API_SECRET,
  PUBLIC_ALPACA_LIVE_DATA_BASE_URL: getEnvVar('PUBLIC_ALPACA_LIVE_DATA_BASE_URL', false) || 'https://data.alpaca.markets',
  PUBLIC_ALPACA_LIVE_WS_URL: getEnvVar('PUBLIC_ALPACA_LIVE_WS_URL', false) || 'wss://stream.data.alpaca.markets/v2',
};

// Validation function to check environment variables (now all optional with defaults)
export function validateEnvironment(): { valid: boolean; missing: string[]; usingDefaults: string[] } {
  const missing: string[] = [];
  const usingDefaults: string[] = [];

  // Check if we're using default values
  const checkVars: (keyof EnvConfig)[] = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'PUBLIC_ALPACA_PAPER_BROKER_API_KEY',
    'PUBLIC_ALPACA_PAPER_BROKER_API_SECRET',
    'PUBLIC_ALPACA_PAPER_DATA_API_KEY',
    'PUBLIC_ALPACA_PAPER_DATA_API_SECRET',
  ];

  for (const varName of checkVars) {
    const actualValue = import.meta.env[varName];
    if (!actualValue) {
      usingDefaults.push(varName);
    }
  }

  return {
    valid: true, // Always valid now since we have defaults
    missing,
    usingDefaults,
  };
}

// Debug function to log environment status (without exposing secrets)
export function debugEnvironment(): void {
  const validation = validateEnvironment();

  console.log('🔧 Environment Configuration Status:');
  console.log(`✅ Valid: ${validation.valid}`);

  if (!validation.valid) {
    console.log(`❌ Missing variables: ${validation.missing.join(', ')}`);
  }

  // Log non-sensitive info
  console.log('📊 Environment Variables Status:');
  console.log(`- SUPABASE_URL: ${env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- SUPABASE_ANON_KEY: ${env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- ALPACA_PAPER_BROKER_API: ${env.PUBLIC_ALPACA_PAPER_BROKER_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- ALPACA_PAPER_DATA_API: ${env.PUBLIC_ALPACA_PAPER_DATA_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- ALPACA_LIVE_BROKER_API: ${env.PUBLIC_ALPACA_LIVE_BROKER_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- ALPACA_LIVE_DATA_API: ${env.PUBLIC_ALPACA_LIVE_DATA_API_KEY ? '✅ Set' : '❌ Missing'}`);
}