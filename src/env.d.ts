interface ImportMetaEnv {
    readonly SUPABASE_URL: string
    readonly SUPABASE_ANON_KEY: string
    readonly PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY : string,
    readonly PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET : string,
    readonly PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL : string,
    readonly PUBLIC_ALPACA_BROKER_LIVE_API_KEY : string,
    readonly PUBLIC_ALPACA_BROKER_LIVE_API_SECRET : string,
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }