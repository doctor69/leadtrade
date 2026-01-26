/**
 * Conditional logging utility that only logs in paper/sandbox mode
 * In live mode, logs are suppressed to avoid exposing sensitive data
 */

let tradingMode: 'paper' | 'live' | null = null;

/**
 * Log categories for structured logging
 */
export enum LogCategory {
  AUTH = 'AUTH',
  TRADING = 'TRADING',
  COPY_TRADING = 'COPY_TRADING',
  API = 'API',
  DATABASE = 'DATABASE',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
  PERFORMANCE = 'PERFORMANCE',
  AUDIT = 'AUDIT'
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Initialize the logger with the current trading mode
 * This should be called when the app loads or when trading mode changes
 */
export function initLogger(mode: 'paper' | 'live') {
  tradingMode = mode;
}

/**
 * Get the current trading mode
 */
export function getTradingModeFromLogger(): 'paper' | 'live' | null {
  return tradingMode;
}

/**
 * Conditional console.log - only logs in paper mode
 */
function log(...args: any[]) {
  if (tradingMode === 'paper') {
    console.log(...args);
  }
}

/**
 * Conditional console.error - always logs errors regardless of mode
 */
function error(...args: any[]) {
  console.error(...args);
}

/**
 * Conditional console.warn - only logs in paper mode
 */
function warn(...args: any[]) {
  if (tradingMode === 'paper') {
    console.warn(...args);
  }
}

/**
 * Conditional console.info - only logs in paper mode
 */
function info(...args: any[]) {
  if (tradingMode === 'paper') {
    console.info(...args);
  }
}

/**
 * Conditional console.debug - only logs in paper mode
 */
function debug(...args: any[]) {
  if (tradingMode === 'paper') {
    console.debug(...args);
  }
}

/**
 * Force log - always logs regardless of mode (use sparingly)
 */
function forceLog(...args: any[]) {
  console.log(...args);
}

/**
 * Structured logger object for backward compatibility
 */
export const logger = {
  log,
  error,
  warn,
  info,
  debug,
  forceLog,
  initLogger,
  getTradingMode: getTradingModeFromLogger
};

export default logger;
