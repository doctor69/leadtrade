/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Supabase Configuration
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_PUBLIC_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;

  // Alpaca Broker API (Sandbox)
  readonly PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY: string;
  readonly PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET: string;
  readonly PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL: string;

  // Alpaca Broker API (Live - Optional)
  readonly PUBLIC_ALPACA_BROKER_LIVE_API_KEY?: string;
  readonly PUBLIC_ALPACA_BROKER_LIVE_API_SECRET?: string;

  // Alpaca Data API
  readonly PUBLIC_ALPACA_DATA_API_KEY: string;
  readonly PUBLIC_ALPACA_DATA_API_SECRET: string;
  readonly PUBLIC_ALPACA_DATA_BASE_URL?: string;

  // Application Configuration
  readonly PUBLIC_APP_URL?: string;
  readonly NODE_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}