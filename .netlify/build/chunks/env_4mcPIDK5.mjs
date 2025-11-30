const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "PUBLIC_ALPACA_BROKER_LIVE_API_KEY": "", "PUBLIC_ALPACA_BROKER_LIVE_API_SECRET": "", "PUBLIC_ALPACA_BROKER_LIVE_BASE_URL": "https://broker-api.alpaca.markets/v1", "PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY": "CKUDQ5ZT874IB5UPWOV5", "PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET": "wWvoDfaV8FH7BYrDq9lHcHL3fWQoHBFdlsV4U2N9", "PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL": "https://broker-api.sandbox.alpaca.markets/v1", "PUBLIC_ALPACA_DATA_API_KEY": "CKUDQ5ZT874IB5UPWOV5", "PUBLIC_ALPACA_DATA_API_SECRET": "wWvoDfaV8FH7BYrDq9lHcHL3fWQoHBFdlsV4U2N9", "PUBLIC_ALPACA_DATA_BASE_URL": "https://data.sandbox.alpaca.markets", "PUBLIC_ALPACA_LIVE_WS_URL": "wss://stream.data.alpaca.markets/v2", "PUBLIC_ALPACA_PAPER_WS_URL": "wss://stream.data.sandbox.alpaca.markets/v2", "PUBLIC_APP_URL": "http://localhost:4321", "PUBLIC_SUPABASE_ANON_KEY": "sb_secret_QWlPDMh0CGGGIh1gh1oErw_c_jgK1fJ", "PUBLIC_SUPABASE_URL": "https://bfbqlzpbkivyrnjkvqgl.supabase.co", "SITE": undefined, "SSR": true};
function getEnvVar(key, required = true) {
  let value = Object.assign(__vite_import_meta_env__, { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_QWlPDMh0CGGGIh1gh1oErw_c_jgK1fJ", _: process.env._ })[key];
  if (!value) {
    const alternativeKeys = {
      "PUBLIC_ALPACA_PAPER_BROKER_API_KEY": "PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY",
      "PUBLIC_ALPACA_PAPER_BROKER_API_SECRET": "PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET",
      "PUBLIC_ALPACA_PAPER_BROKER_BASE_URL": "PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL",
      "PUBLIC_ALPACA_LIVE_BROKER_API_KEY": "PUBLIC_ALPACA_BROKER_LIVE_API_KEY",
      "PUBLIC_ALPACA_LIVE_BROKER_API_SECRET": "PUBLIC_ALPACA_BROKER_LIVE_API_SECRET",
      "PUBLIC_ALPACA_LIVE_BROKER_BASE_URL": "PUBLIC_ALPACA_BROKER_LIVE_BASE_URL",
      "PUBLIC_ALPACA_PAPER_DATA_API_KEY": "PUBLIC_ALPACA_DATA_API_KEY",
      "PUBLIC_ALPACA_PAPER_DATA_API_SECRET": "PUBLIC_ALPACA_DATA_API_SECRET",
      "PUBLIC_ALPACA_PAPER_DATA_BASE_URL": "PUBLIC_ALPACA_DATA_BASE_URL",
      "PUBLIC_ALPACA_LIVE_DATA_API_KEY": "PUBLIC_ALPACA_DATA_API_KEY",
      "PUBLIC_ALPACA_LIVE_DATA_API_SECRET": "PUBLIC_ALPACA_DATA_API_SECRET",
      "PUBLIC_ALPACA_LIVE_DATA_BASE_URL": "PUBLIC_ALPACA_DATA_BASE_URL",
      "SUPABASE_URL": "PUBLIC_SUPABASE_URL",
      "SUPABASE_ANON_KEY": "PUBLIC_SUPABASE_ANON_KEY"
    };
    const alternativeKey = alternativeKeys[key];
    if (alternativeKey) {
      value = Object.assign(__vite_import_meta_env__, { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_QWlPDMh0CGGGIh1gh1oErw_c_jgK1fJ", _: process.env._ })[alternativeKey];
    }
  }
  if (!value && key.includes("LIVE")) {
    const paperKey = key.replace("LIVE", "PAPER");
    const paperValue = Object.assign(__vite_import_meta_env__, { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_QWlPDMh0CGGGIh1gh1oErw_c_jgK1fJ", _: process.env._ })[paperKey];
    if (paperValue) {
      console.warn(`Using paper trading credentials for live trading mode: ${key}`);
      value = paperValue;
    } else {
      paperKey.replace("PUBLIC_ALPACA_PAPER_", "");
      console.warn(`No paper trading fallback found for ${key}, will use default URLs`);
    }
  }
  if (!value) {
    const defaults = {
      "PUBLIC_ALPACA_PAPER_BROKER_BASE_URL": "https://broker-api.sandbox.alpaca.markets/v1",
      "PUBLIC_ALPACA_PAPER_DATA_BASE_URL": "https://data.sandbox.alpaca.markets",
      "PUBLIC_ALPACA_PAPER_WS_URL": "wss://stream.data.sandbox.alpaca.markets/v2",
      "PUBLIC_ALPACA_LIVE_BROKER_BASE_URL": "https://broker-api.alpaca.markets/v1",
      "PUBLIC_ALPACA_LIVE_DATA_BASE_URL": "https://data.alpaca.markets",
      "PUBLIC_ALPACA_LIVE_WS_URL": "wss://stream.data.alpaca.markets/v2"
    };
    value = defaults[key] || "";
  }
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || "";
}
const paperConfig = {
  BROKER_API_KEY: getEnvVar("PUBLIC_ALPACA_PAPER_BROKER_API_KEY", false) || "demo-paper-key",
  BROKER_API_SECRET: getEnvVar("PUBLIC_ALPACA_PAPER_BROKER_API_SECRET", false) || "demo-paper-secret",
  BROKER_BASE_URL: getEnvVar("PUBLIC_ALPACA_PAPER_BROKER_BASE_URL", false) || "https://broker-api.sandbox.alpaca.markets/v1",
  DATA_API_KEY: getEnvVar("PUBLIC_ALPACA_PAPER_DATA_API_KEY", false) || "demo-data-key",
  DATA_API_SECRET: getEnvVar("PUBLIC_ALPACA_PAPER_DATA_API_SECRET", false) || "demo-data-secret",
  DATA_BASE_URL: getEnvVar("PUBLIC_ALPACA_PAPER_DATA_BASE_URL", false) || "https://data.sandbox.alpaca.markets",
  WS_URL: getEnvVar("PUBLIC_ALPACA_PAPER_WS_URL", false) || "wss://stream.data.sandbox.alpaca.markets/v2"
};
const env = {
  // Supabase (with demo defaults)
  SUPABASE_URL: getEnvVar("SUPABASE_URL", false) || "https://demo.supabase.co",
  SUPABASE_ANON_KEY: getEnvVar("SUPABASE_ANON_KEY", false) || "demo-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar("SUPABASE_SERVICE_ROLE_KEY", false) || "demo-service-key",
  // Alpaca Paper Trading API
  PUBLIC_ALPACA_PAPER_BROKER_API_KEY: paperConfig.BROKER_API_KEY,
  PUBLIC_ALPACA_PAPER_BROKER_API_SECRET: paperConfig.BROKER_API_SECRET,
  PUBLIC_ALPACA_PAPER_BROKER_BASE_URL: paperConfig.BROKER_BASE_URL,
  PUBLIC_ALPACA_PAPER_DATA_API_KEY: paperConfig.DATA_API_KEY,
  PUBLIC_ALPACA_PAPER_DATA_API_SECRET: paperConfig.DATA_API_SECRET,
  PUBLIC_ALPACA_PAPER_DATA_BASE_URL: paperConfig.DATA_BASE_URL,
  PUBLIC_ALPACA_PAPER_WS_URL: paperConfig.WS_URL,
  // Alpaca Live Trading API (optional - will fallback to paper trading keys)
  PUBLIC_ALPACA_LIVE_BROKER_API_KEY: getEnvVar("PUBLIC_ALPACA_LIVE_BROKER_API_KEY", false) || paperConfig.BROKER_API_KEY,
  PUBLIC_ALPACA_LIVE_BROKER_API_SECRET: getEnvVar("PUBLIC_ALPACA_LIVE_BROKER_API_SECRET", false) || paperConfig.BROKER_API_SECRET,
  PUBLIC_ALPACA_LIVE_BROKER_BASE_URL: getEnvVar("PUBLIC_ALPACA_LIVE_BROKER_BASE_URL", false) || "https://broker-api.alpaca.markets/v1",
  PUBLIC_ALPACA_LIVE_DATA_API_KEY: getEnvVar("PUBLIC_ALPACA_LIVE_DATA_API_KEY", false) || paperConfig.DATA_API_KEY,
  PUBLIC_ALPACA_LIVE_DATA_API_SECRET: getEnvVar("PUBLIC_ALPACA_LIVE_DATA_API_SECRET", false) || paperConfig.DATA_API_SECRET,
  PUBLIC_ALPACA_LIVE_DATA_BASE_URL: getEnvVar("PUBLIC_ALPACA_LIVE_DATA_BASE_URL", false) || "https://data.alpaca.markets",
  PUBLIC_ALPACA_LIVE_WS_URL: getEnvVar("PUBLIC_ALPACA_LIVE_WS_URL", false) || "wss://stream.data.alpaca.markets/v2"
};

export { env as e };
