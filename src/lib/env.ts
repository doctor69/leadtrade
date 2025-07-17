// Environment variable validation and access utility

interface EnvConfig {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Alpaca Broker API
  PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY: string;
  PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET: string;
  PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL: string;
  
  // Alpaca Data API
  PUBLIC_ALPACA_DATA_API_KEY: string;
  PUBLIC_ALPACA_DATA_API_SECRET: string;
  PUBLIC_ALPACA_DATA_BASE_URL: string;
}

function getEnvVar(key: keyof EnvConfig, required = true): string {
  const value = import.meta.env[key];
  
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value || '';
}

// Validate and export environment configuration
export const env: EnvConfig = {
  // Supabase
  SUPABASE_URL: getEnvVar('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  
  // Alpaca Broker API
  PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY: getEnvVar('PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY'),
  PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET: getEnvVar('PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET'),
  PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL: getEnvVar('PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL'),
  
  // Alpaca Data API
  PUBLIC_ALPACA_DATA_API_KEY: getEnvVar('PUBLIC_ALPACA_DATA_API_KEY'),
  PUBLIC_ALPACA_DATA_API_SECRET: getEnvVar('PUBLIC_ALPACA_DATA_API_SECRET'),
  PUBLIC_ALPACA_DATA_BASE_URL: getEnvVar('PUBLIC_ALPACA_DATA_BASE_URL'),
};

// Validation function to check all required environment variables
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  const requiredVars: (keyof EnvConfig)[] = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY',
    'PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET',
    'PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL',
    'PUBLIC_ALPACA_DATA_API_KEY',
    'PUBLIC_ALPACA_DATA_API_SECRET',
  ];
  
  for (const varName of requiredVars) {
    if (!import.meta.env[varName]) {
      missing.push(varName);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
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
  console.log(`- ALPACA_BROKER_API: ${env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- ALPACA_DATA_API: ${env.PUBLIC_ALPACA_DATA_API_KEY ? '✅ Set' : '❌ Missing'}`);
}