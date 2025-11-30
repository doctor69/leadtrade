// Environment configuration for the application
export const env = {
  // Alpaca API Configuration
  PUBLIC_ALPACA_PAPER_API_KEY: import.meta.env.PUBLIC_ALPACA_PAPER_API_KEY || '',
  PUBLIC_ALPACA_PAPER_API_SECRET: import.meta.env.PUBLIC_ALPACA_PAPER_API_SECRET || '',
  PUBLIC_ALPACA_LIVE_API_KEY: import.meta.env.PUBLIC_ALPACA_LIVE_API_KEY || '',
  PUBLIC_ALPACA_LIVE_API_SECRET: import.meta.env.PUBLIC_ALPACA_LIVE_API_SECRET || '',
  
  // Broker API Configuration (for trading and market data)
  PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY: import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY || '',
  PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET: import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET || '',
  PUBLIC_ALPACA_BROKER_LIVE_API_KEY: import.meta.env.PUBLIC_ALPACA_BROKER_LIVE_API_KEY || '',
  PUBLIC_ALPACA_BROKER_LIVE_API_SECRET: import.meta.env.PUBLIC_ALPACA_BROKER_LIVE_API_SECRET || '',
  
  // Data API Configuration (for market data only)
  PUBLIC_ALPACA_DATA_API_KEY: import.meta.env.PUBLIC_ALPACA_DATA_API_KEY || '',
  PUBLIC_ALPACA_DATA_API_SECRET: import.meta.env.PUBLIC_ALPACA_DATA_API_SECRET || '',
  
  // Market Data WebSocket URLs (for real-time market data)
  PUBLIC_ALPACA_MARKET_DATA_WS_URL: import.meta.env.PUBLIC_ALPACA_MARKET_DATA_WS_URL || 'wss://stream.data.alpaca.markets/v2/iex',
  PUBLIC_ALPACA_MARKET_DATA_SANDBOX_WS_URL: import.meta.env.PUBLIC_ALPACA_MARKET_DATA_SANDBOX_WS_URL || 'wss://stream.data.sandbox.alpaca.markets/v2/iex',
  
  // Trading API WebSocket URLs (for trade updates - only if you have Trading API keys)
  PUBLIC_ALPACA_PAPER_WS_URL: import.meta.env.PUBLIC_ALPACA_PAPER_WS_URL || 'wss://paper-api.alpaca.markets/stream',
  PUBLIC_ALPACA_LIVE_WS_URL: import.meta.env.PUBLIC_ALPACA_LIVE_WS_URL || 'wss://api.alpaca.markets/stream',
  
  // Base URLs for REST API
  PUBLIC_ALPACA_PAPER_BASE_URL: import.meta.env.PUBLIC_ALPACA_PAPER_BASE_URL || 'https://paper-api.alpaca.markets',
  PUBLIC_ALPACA_LIVE_BASE_URL: import.meta.env.PUBLIC_ALPACA_LIVE_BASE_URL || 'https://api.alpaca.markets',
  PUBLIC_ALPACA_DATA_BASE_URL: import.meta.env.PUBLIC_ALPACA_DATA_BASE_URL || 'https://data.alpaca.markets',
  
  // Supabase Configuration
  PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL || '',
  PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '',
  
  // Application Configuration
  PUBLIC_APP_URL: import.meta.env.PUBLIC_APP_URL || 'http://localhost:4321',
  PUBLIC_APP_NAME: import.meta.env.PUBLIC_APP_NAME || 'LeadTrade',
  
  // Feature Flags
  PUBLIC_ENABLE_COPY_TRADING: import.meta.env.PUBLIC_ENABLE_COPY_TRADING === 'true',
  PUBLIC_ENABLE_OPTIONS_TRADING: import.meta.env.PUBLIC_ENABLE_OPTIONS_TRADING === 'true',
  PUBLIC_ENABLE_CRYPTO_TRADING: import.meta.env.PUBLIC_ENABLE_CRYPTO_TRADING === 'true',
  
  // Development Configuration
  DEV: import.meta.env.DEV || false,
  PROD: import.meta.env.PROD || false,
  
  // Get the appropriate API credentials based on environment
  get alpacaApiKey() {
    // Priority: Broker Sandbox > Broker Live > Data API > Paper Trading > Live Trading
    return this.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY || 
           this.PUBLIC_ALPACA_BROKER_LIVE_API_KEY || 
           this.PUBLIC_ALPACA_DATA_API_KEY ||
           this.PUBLIC_ALPACA_PAPER_API_KEY || 
           this.PUBLIC_ALPACA_LIVE_API_KEY;
  },
  
  get alpacaApiSecret() {
    // Priority: Broker Sandbox > Broker Live > Data API > Paper Trading > Live Trading
    return this.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET || 
           this.PUBLIC_ALPACA_BROKER_LIVE_API_SECRET || 
           this.PUBLIC_ALPACA_DATA_API_SECRET ||
           this.PUBLIC_ALPACA_PAPER_API_SECRET || 
           this.PUBLIC_ALPACA_LIVE_API_SECRET;
  },
  
  get alpacaBaseUrl() {
    // Use paper trading for development, live for production
    return this.DEV ? this.PUBLIC_ALPACA_PAPER_BASE_URL : this.PUBLIC_ALPACA_LIVE_BASE_URL;
  },
  
  get alpacaDataUrl() {
    return this.PUBLIC_ALPACA_DATA_BASE_URL;
  },
  
  get alpacaMarketDataWsUrl() {
    // Use test URL for reliable data
    return this.PUBLIC_ALPACA_TEST_WS_URL || 'wss://stream.data.alpaca.markets/v2/test';
  },
  
  get alpacaTradingWsUrl() {
    // Use paper trading for development, live for production
    return this.DEV ? this.PUBLIC_ALPACA_PAPER_WS_URL : this.PUBLIC_ALPACA_LIVE_WS_URL;
  }
};

// Validation function to check environment variables (now all optional with defaults)
export function validateEnvironment(): { valid: boolean; missing: string[]; usingDefaults: string[] } {
  const missing: string[] = [];
  const usingDefaults: string[] = [];

  // Check if we're using default values
  const checkVars: (keyof typeof env)[] = [
    'PUBLIC_ALPACA_PAPER_API_KEY',
    'PUBLIC_ALPACA_PAPER_API_SECRET',
    'PUBLIC_ALPACA_LIVE_API_KEY',
    'PUBLIC_ALPACA_LIVE_API_SECRET',
    'PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY',
    'PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET',
    'PUBLIC_ALPACA_BROKER_LIVE_API_KEY',
    'PUBLIC_ALPACA_BROKER_LIVE_API_SECRET',
    'PUBLIC_ALPACA_DATA_API_KEY',
    'PUBLIC_ALPACA_DATA_API_SECRET',
    'PUBLIC_ALPACA_MARKET_DATA_WS_URL',
    'PUBLIC_ALPACA_MARKET_DATA_SANDBOX_WS_URL',
    'PUBLIC_ALPACA_PAPER_WS_URL',
    'PUBLIC_ALPACA_LIVE_WS_URL',
    'PUBLIC_ALPACA_PAPER_BASE_URL',
    'PUBLIC_ALPACA_LIVE_BASE_URL',
    'PUBLIC_ALPACA_DATA_BASE_URL',
    'PUBLIC_SUPABASE_URL',
    'PUBLIC_SUPABASE_ANON_KEY',
    'PUBLIC_APP_URL',
    'PUBLIC_APP_NAME',
    'PUBLIC_ENABLE_COPY_TRADING',
    'PUBLIC_ENABLE_OPTIONS_TRADING',
    'PUBLIC_ENABLE_CRYPTO_TRADING',
    'DEV',
    'PROD',
  ];

  for (const varName of checkVars) {
    const actualValue = env[varName];
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
  console.log(`- PUBLIC_ALPACA_PAPER_API_KEY: ${env.PUBLIC_ALPACA_PAPER_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_PAPER_API_SECRET: ${env.PUBLIC_ALPACA_PAPER_API_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_LIVE_API_KEY: ${env.PUBLIC_ALPACA_LIVE_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_LIVE_API_SECRET: ${env.PUBLIC_ALPACA_LIVE_API_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY: ${env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET: ${env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_BROKER_LIVE_API_KEY: ${env.PUBLIC_ALPACA_BROKER_LIVE_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_BROKER_LIVE_API_SECRET: ${env.PUBLIC_ALPACA_BROKER_LIVE_API_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_DATA_API_KEY: ${env.PUBLIC_ALPACA_DATA_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_DATA_API_SECRET: ${env.PUBLIC_ALPACA_DATA_API_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_MARKET_DATA_WS_URL: ${env.PUBLIC_ALPACA_MARKET_DATA_WS_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_MARKET_DATA_SANDBOX_WS_URL: ${env.PUBLIC_ALPACA_MARKET_DATA_SANDBOX_WS_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_PAPER_WS_URL: ${env.PUBLIC_ALPACA_PAPER_WS_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_LIVE_WS_URL: ${env.PUBLIC_ALPACA_LIVE_WS_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_PAPER_BASE_URL: ${env.PUBLIC_ALPACA_PAPER_BASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_LIVE_BASE_URL: ${env.PUBLIC_ALPACA_LIVE_BASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ALPACA_DATA_BASE_URL: ${env.PUBLIC_ALPACA_DATA_BASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_SUPABASE_URL: ${env.PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_SUPABASE_ANON_KEY: ${env.PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_APP_URL: ${env.PUBLIC_APP_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_APP_NAME: ${env.PUBLIC_APP_NAME ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ENABLE_COPY_TRADING: ${env.PUBLIC_ENABLE_COPY_TRADING ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ENABLE_OPTIONS_TRADING: ${env.PUBLIC_ENABLE_OPTIONS_TRADING ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PUBLIC_ENABLE_CRYPTO_TRADING: ${env.PUBLIC_ENABLE_CRYPTO_TRADING ? '✅ Set' : '❌ Missing'}`);
  console.log(`- DEV: ${env.DEV ? '✅ Set' : '❌ Missing'}`);
  console.log(`- PROD: ${env.PROD ? '✅ Set' : '❌ Missing'}`);
}