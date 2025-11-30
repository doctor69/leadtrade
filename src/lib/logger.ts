// Comprehensive logging system for copy trading platform
import type { TradeExecution, CopiedTrade } from '../types/trading';

export enum LogCategory {
  AUTH = 'AUTH',
  COPY_TRADING = 'COPY_TRADING',
  PORTFOLIO = 'PORTFOLIO',
  TRADING = 'TRADING',
  WEBSOCKET = 'WEBSOCKET',
  SYSTEM = 'SYSTEM',
  ERROR = 'ERROR',
  DATABASE = 'DATABASE',
  API = 'API'
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogMetadata {
  userId?: string;
  requestId?: string;
  error?: Error;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  tradeId?: string;
  requestId?: string;
  error?: Error;
  metadata?: Record<string, any>;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private enableConsoleOutput: boolean;
  private enableRemoteLogging: boolean;

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv();
    // Use browser-safe environment detection
    const isServer = typeof window === 'undefined';
    const nodeEnv = isServer ? (typeof process !== 'undefined' ? process.env.NODE_ENV : 'development') : import.meta.env.MODE;
    this.enableConsoleOutput = nodeEnv !== 'production';
    this.enableRemoteLogging = nodeEnv === 'production';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    // Use browser-safe environment variable access
    const isServer = typeof window === 'undefined';
    let envLevel: string | undefined;
    
    if (isServer && typeof process !== 'undefined') {
      envLevel = process.env.LOG_LEVEL?.toUpperCase();
    } else {
      // In browser, we can't access LOG_LEVEL, so use a default
      envLevel = 'INFO';
    }
    
    switch (envLevel) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'CRITICAL': return LogLevel.CRITICAL;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level];
    const category = entry.category;

    let formatted = `[${timestamp}] ${level} [${category}]`;

    if (entry.userId) {
      formatted += ` [User: ${entry.userId}]`;
    }

    if (entry.tradeId) {
      formatted += ` [Trade: ${entry.tradeId}]`;
    }

    if (entry.requestId) {
      formatted += ` [Request: ${entry.requestId}]`;
    }

    formatted += ` ${entry.message}`;

    if (entry.error) {
      formatted += `\nError: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += `\nStack: ${entry.error.stack}`;
      }
    }

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      formatted += `\nMetadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }

    return formatted;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Console output for development
    if (this.enableConsoleOutput) {
      const formatted = this.formatLogEntry(entry);

      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
        case LogLevel.CRITICAL:
          console.error(formatted);
          break;
      }
    }

    // Remote logging for production (could be extended to send to external service)
    if (this.enableRemoteLogging && entry.level >= LogLevel.ERROR) {
      try {
        // In a real implementation, this would send to a logging service
        // For now, we'll store critical logs in the database or localStorage
        await this.storeCriticalLog(entry);
      } catch (error) {
        // Fallback to console if remote logging fails
        console.error('Failed to store critical log:', error);
        console.error('Original log entry:', this.formatLogEntry(entry));
      }
    }
  }

  private async storeCriticalLog(entry: LogEntry): Promise<void> {
    // Check if we're in a browser environment
    const isServer = typeof window === 'undefined';
    
    if (isServer) {
      // Server-side: This would typically store in a dedicated logs table
      // For now, we'll use console.error as fallback
      console.error('CRITICAL LOG:', this.formatLogEntry(entry));
    } else {
      // Browser-side: Store in localStorage or send to a logging endpoint
      try {
        // Store in localStorage as a fallback
        const logs = JSON.parse(localStorage.getItem('critical-logs') || '[]');
        logs.push({
          ...entry,
          storedAt: new Date().toISOString()
        });
        
        // Keep only the last 100 critical logs
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('critical-logs', JSON.stringify(logs));
      } catch (error) {
        // Fallback to console if localStorage fails
        console.error('CRITICAL LOG:', this.formatLogEntry(entry));
      }
    }
  }

  // Public logging methods
  public debug(
    category: LogCategory,
    message: string,
    options?: {
      userId?: string;
      tradeId?: string;
      metadata?: Record<string, any>;
      requestId?: string;
    }
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      category,
      message,
      ...options
    };

    // Fire and forget - don't block the main thread
    this.writeLog(entry).catch(error => {
      console.error('Logger error:', error);
    });
  }

  public info(
    category: LogCategory,
    message: string,
    options?: {
      userId?: string;
      tradeId?: string;
      metadata?: Record<string, any>;
      requestId?: string;
    }
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      category,
      message,
      ...options
    };

    // Fire and forget - don't block the main thread
    this.writeLog(entry).catch(error => {
      console.error('Logger error:', error);
    });
  }

  public warn(
    category: LogCategory,
    message: string,
    options?: {
      userId?: string;
      tradeId?: string;
      error?: Error;
      metadata?: Record<string, any>;
      requestId?: string;
    }
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      category,
      message,
      ...options
    };

    // Fire and forget - don't block the main thread
    this.writeLog(entry).catch(error => {
      console.error('Logger error:', error);
    });
  }

  public error(
    category: LogCategory,
    message: string,
    options?: {
      userId?: string;
      tradeId?: string;
      error?: Error;
      metadata?: Record<string, any>;
      requestId?: string;
    }
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      category,
      message,
      ...options
    };

    // Fire and forget - don't block the main thread
    this.writeLog(entry).catch(error => {
      console.error('Logger error:', error);
    });
  }

  public critical(
    category: LogCategory,
    message: string,
    options?: {
      userId?: string;
      tradeId?: string;
      error?: Error;
      metadata?: Record<string, any>;
      requestId?: string;
    }
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.CRITICAL,
      category,
      message,
      ...options
    };

    // Fire and forget - don't block the main thread
    this.writeLog(entry).catch(error => {
      console.error('Logger error:', error);
    });
  }

  // Specialized logging for trade executions
  public logTradeExecution(
    tradeData: Partial<TradeExecution>,
    executionResult: {
      success: boolean;
      alpacaOrderId?: string;
      errorCode?: string;
      errorMessage?: string;
    },
    options?: {
      userId?: string;
      requestId?: string;
    }
  ): void {
    const level = executionResult.success ? LogLevel.INFO : LogLevel.ERROR;
    const message = executionResult.success
      ? `Trade executed successfully: ${tradeData.symbol} ${tradeData.side} ${tradeData.quantity}`
      : `Trade execution failed: ${tradeData.symbol} ${tradeData.side} ${tradeData.quantity} - ${executionResult.errorMessage}`;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category: LogCategory.TRADING,
      message,
      tradeId: tradeData.id,
      metadata: {
        tradeType: tradeData.trade_type,
        portfolioPercentage: tradeData.portfolio_percentage,
        optionDetails: tradeData.option_details,
        executionResult
      },
      ...options
    };

    // Fire and forget - don't block the main thread
    this.writeLog(entry).catch(error => {
      console.error('Logger error:', error);
    });
  }

  // Specialized logging for copy trading
  public logCopyTradeExecution(
    originalTrade: Partial<TradeExecution>,
    copiedTrade: Partial<CopiedTrade>,
    executionResult: {
      success: boolean;
      alpacaOrderId?: string;
      errorCode?: string;
      errorMessage?: string;
    },
    options?: {
      leaderId?: string;
      followerId?: string;
      requestId?: string;
    }
  ): void {
    const level = executionResult.success ? LogLevel.INFO : LogLevel.ERROR;
    const message = executionResult.success
      ? `Copy trade executed: Follower ${options?.followerId} copied ${originalTrade.symbol} from Leader ${options?.leaderId}`
      : `Copy trade failed: ${executionResult.errorMessage}`;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category: LogCategory.COPY_TRADING,
      message,
      tradeId: copiedTrade.id,
      metadata: {
        originalTradeId: originalTrade.id,
        copyTradeId: copiedTrade.id,
        executionResult
      },
      ...options
    };

    // Fire and forget - don't block the main thread
    this.writeLog(entry).catch(error => {
      console.error('Logger error:', error);
    });
  }
}

export const logger = Logger.getInstance();