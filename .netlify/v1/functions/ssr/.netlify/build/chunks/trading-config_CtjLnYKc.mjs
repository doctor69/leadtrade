import { e as env } from './env_4mcPIDK5.mjs';

const tradingModeConfig = {
  paper: {
    brokerApiKey: env.PUBLIC_ALPACA_PAPER_BROKER_API_KEY,
    brokerApiSecret: env.PUBLIC_ALPACA_PAPER_BROKER_API_SECRET,
    brokerBaseUrl: env.PUBLIC_ALPACA_PAPER_BROKER_BASE_URL,
    dataApiKey: env.PUBLIC_ALPACA_PAPER_DATA_API_KEY,
    dataApiSecret: env.PUBLIC_ALPACA_PAPER_DATA_API_SECRET,
    dataBaseUrl: env.PUBLIC_ALPACA_PAPER_DATA_BASE_URL,
    wsUrl: env.PUBLIC_ALPACA_PAPER_WS_URL
  },
  live: {
    brokerApiKey: env.PUBLIC_ALPACA_LIVE_BROKER_API_KEY,
    brokerApiSecret: env.PUBLIC_ALPACA_LIVE_BROKER_API_SECRET,
    brokerBaseUrl: env.PUBLIC_ALPACA_LIVE_BROKER_BASE_URL,
    dataApiKey: env.PUBLIC_ALPACA_LIVE_DATA_API_KEY,
    dataApiSecret: env.PUBLIC_ALPACA_LIVE_DATA_API_SECRET,
    dataBaseUrl: env.PUBLIC_ALPACA_LIVE_DATA_BASE_URL,
    wsUrl: env.PUBLIC_ALPACA_LIVE_WS_URL
  }
};
function getAlpacaConfig(mode) {
  const config = tradingModeConfig[mode];
  if (!config) {
    throw new Error(`Invalid trading mode: ${mode}`);
  }
  const requiredFields = [
    "brokerApiKey",
    "brokerApiSecret",
    "brokerBaseUrl",
    "dataApiKey",
    "dataApiSecret",
    "dataBaseUrl",
    "wsUrl"
  ];
  const missingFields = requiredFields.filter((field) => !config[field]);
  if (missingFields.length > 0) {
    throw new Error(
      `Missing required ${mode} trading configuration: ${missingFields.join(", ")}`
    );
  }
  return config;
}
function validateTradingModeConfig(mode) {
  try {
    getAlpacaConfig(mode);
    return { valid: true, missing: [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const missing = errorMessage.includes("Missing required") ? errorMessage.split(": ")[1]?.split(", ") || [] : [];
    return { valid: false, missing };
  }
}
function validateAllTradingModes() {
  return {
    paper: validateTradingModeConfig("paper"),
    live: validateTradingModeConfig("live")
  };
}
async function getUserTradingMode(userId) {
  try {
    const { supabase } = await import('./supabase_DAMM5TbE.mjs');
    const { data, error } = await supabase.from("profiles").select("is_paper_trading").eq("id", userId).single();
    if (error) {
      console.warn("Failed to fetch user trading mode, defaulting to paper:", error);
      return "paper";
    }
    return data?.is_paper_trading !== false ? "paper" : "live";
  } catch (error) {
    console.warn("Error fetching user trading mode, defaulting to paper:", error);
    return "paper";
  }
}
async function getCurrentUserTradingMode() {
  try {
    const { supabase } = await import('./supabase_DAMM5TbE.mjs');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("No authenticated user found, defaulting to paper trading");
      return "paper";
    }
    return getUserTradingMode(user.id);
  } catch (error) {
    console.warn("Error fetching current user trading mode, defaulting to paper:", error);
    return "paper";
  }
}
function debugTradingConfig(mode) {
  {
    const allValidation = validateAllTradingModes();
    console.log("🔧 Trading Mode Configuration Status:");
    console.log(`📄 Paper Trading: ${allValidation.paper.valid ? "✅ Valid" : "❌ Invalid"}`);
    console.log(`💰 Live Trading: ${allValidation.live.valid ? "✅ Valid" : "❌ Invalid"}`);
    if (!allValidation.paper.valid) {
      console.log(`❌ Paper missing: ${allValidation.paper.missing.join(", ")}`);
    }
    if (!allValidation.live.valid) {
      console.log(`❌ Live missing: ${allValidation.live.missing.join(", ")}`);
    }
  }
}

export { getAlpacaConfig as a, validateAllTradingModes as b, getCurrentUserTradingMode as c, debugTradingConfig as d, getUserTradingMode as g, validateTradingModeConfig as v };
