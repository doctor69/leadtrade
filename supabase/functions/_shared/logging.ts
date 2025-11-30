// Enhanced logging utility for Supabase Edge Functions

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  userId?: string;
  endpoint?: string;
  requestId?: string;
  tradingMode?: 'paper' | 'live';
  alpacaAccountId?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  error?: Error;
}

/**
 * Enhanced logger for Edge Functions
 */
export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}, minLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.minLevel = minLevel;
  }

  /**
   * Creates a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(
      { ...this.context, ...additionalContext },
      this.minLevel
    );
  }

  /**
   * Logs a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Logs an info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Logs an error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, { ...context, error });
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.minLevel) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      context: { ...this.context, ...context },
      timestamp: new Date().toISOString()
    };

    // Format the log message
    const levelName = LogLevel[level];
    const contextStr = logEntry.context ? 
      ` | ${JSON.stringify(logEntry.context)}` : '';
    
    const formattedMessage = `[${logEntry.timestamp}] ${levelName}: ${message}${contextStr}`;

    // Output to appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        if (logEntry.context?.error) {
          console.error(logEntry.context.error);
        }
        break;
    }
  }
}

/**
 * Creates a logger for an Edge Function
 */
export function createLogger(
  endpoint: string,
  userId?: string,
  additionalContext?: LogContext
): Logger {
  const requestId = crypto.randomUUID();
  
  return new Logger({
    endpoint,
    userId,
    requestId,
    ...additionalContext
  });
}

/**
 * Logs API request details
 */
export function logApiRequest(
  logger: Logger,
  method: string,
  url: string,
  headers?: Record<string, string>,
  body?: any
): void {
  logger.info('API Request', {
    method,
    url,
    headers: headers ? Object.keys(headers) : undefined,
    hasBody: !!body,
    bodySize: body ? JSON.stringify(body).length : 0
  });
}

/**
 * Logs API response details
 */
export function logApiResponse(
  logger: Logger,
  status: number,
  responseTime: number,
  success: boolean,
  error?: string
): void {
  const level = success ? LogLevel.INFO : LogLevel.ERROR;
  
  logger.log(level, 'API Response', {
    status,
    responseTime,
    success,
    error
  });
}

/**
 * Logs authentication events
 */
export function logAuthEvent(
  logger: Logger,
  event: 'login' | 'logout' | 'token_refresh' | 'auth_failed',
  details?: LogContext
): void {
  logger.info(`Authentication: ${event}`, details);
}

/**
 * Logs rate limiting events
 */
export function logRateLimit(
  logger: Logger,
  allowed: boolean,
  remaining: number,
  resetTime: number
): void {
  const level = allowed ? LogLevel.DEBUG : LogLevel.WARN;
  
  logger.log(level, 'Rate Limit Check', {
    allowed,
    remaining,
    resetTime: new Date(resetTime).toISOString()
  });
}