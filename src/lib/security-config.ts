// Security configuration and utilities for the copy trading system
import { ValidationService } from './validation';

export interface SecurityConfig {
  rateLimits: {
    [key: string]: {
      maxRequests: number;
      windowMs: number;
    };
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    iterations: number;
    saltLength: number;
  };
  session: {
    maxAge: number;
    refreshThreshold: number;
    secureCookies: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  validation: {
    maxStringLength: number;
    allowedFileTypes: string[];
    maxFileSize: number;
    maxTradeAmount: number;
    maxAllocationPercentage: number;
  };
  dataProtection: {
    tokenEncryption: boolean;
    piiExclusion: boolean;
    auditLogging: boolean;
    dataRetention: {
      tradeHistory: number; // days
      userActivity: number; // days
      auditLogs: number; // days
    };
  };
  compliance: {
    kycRequired: boolean;
    tradeAuditLogging: boolean;
    suspiciousActivityDetection: boolean;
    dataExportEnabled: boolean;
    retentionPolicies: {
      tradeRecords: number; // days
      userActivity: number; // days
      auditLogs: number; // days
    };
  };
}

// Default security configuration
export const SECURITY_CONFIG: SecurityConfig = {
  rateLimits: {
    // Trading operations - more restrictive
    'trade_execution': { maxRequests: 10, windowMs: 60 * 1000 },
    'order_creation': { maxRequests: 20, windowMs: 60 * 1000 },
    'order_fetching': { maxRequests: 30, windowMs: 60 * 1000 },
    
    // Copy trading operations
    'subscription_create': { maxRequests: 10, windowMs: 60 * 1000 },
    'subscription_update': { maxRequests: 15, windowMs: 60 * 1000 },
    'subscription_delete': { maxRequests: 10, windowMs: 60 * 1000 },
    'subscription_fetch': { maxRequests: 60, windowMs: 60 * 1000 },
    
    // Authentication operations
    'login': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 15 minutes
    'logout': { maxRequests: 5, windowMs: 60 * 1000 },
    'signup': { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 1 hour
    
    // General API operations
    'api_general': { maxRequests: 100, windowMs: 60 * 1000 },
    'market_data': { maxRequests: 200, windowMs: 60 * 1000 },
    
    // Admin operations - very restrictive
    'admin': { maxRequests: 10, windowMs: 5 * 60 * 1000 } // 5 minutes
  },
  
  encryption: {
    algorithm: 'AES-GCM',
    keyLength: 256,
    iterations: 100000,
    saltLength: 32
  },
  
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    refreshThreshold: 15 * 60 * 1000, // Refresh if expires within 15 minutes
    secureCookies: (typeof window === 'undefined' ? (typeof process !== 'undefined' ? process.env.NODE_ENV : 'development') : import.meta.env.MODE) === 'production',
    httpOnly: true,
    sameSite: (typeof window === 'undefined' ? (typeof process !== 'undefined' ? process.env.NODE_ENV : 'development') : import.meta.env.MODE) === 'production' ? 'strict' : 'lax'
  },
  
  validation: {
    maxStringLength: 1000,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxTradeAmount: 1000000, // $1M max trade
    maxAllocationPercentage: 100
  },

  dataProtection: {
    tokenEncryption: true,
    piiExclusion: true,
    auditLogging: true,
    dataRetention: {
      tradeHistory: 2555, // 7 years for tax compliance
      userActivity: 365, // 1 year
      auditLogs: 2555 // 7 years for compliance
    }
  },

  compliance: {
    kycRequired: true,
    tradeAuditLogging: true,
    suspiciousActivityDetection: true,
    dataExportEnabled: true,
    retentionPolicies: {
      tradeRecords: 2555, // 7 years for regulatory compliance
      userActivity: 365, // 1 year
      auditLogs: 2555 // 7 years for compliance
    }
  }
};

// Enhanced security service with additional protection measures
export class SecurityService {
  private static blockedIPs = new Set<string>();
  private static suspiciousActivityLog = new Map<string, any[]>();
  private static config = SECURITY_CONFIG;

  /**
   * Validate request security
   */
  static validateRequestSecurity(request: Request): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';

    // Check for suspicious user agents
    if (this.isSuspiciousUserAgent(userAgent)) {
      errors.push('Suspicious user agent detected');
    }

    // Check for required headers
    if (!request.headers.get('content-type') && request.method !== 'GET') {
      errors.push('Content-Type header required for non-GET requests');
    }

    // Validate request size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > this.config.validation.maxStringLength * 10) {
      errors.push('Request body too large');
    }

    // Check for suspicious patterns in URL
    if (this.containsSuspiciousPatterns(url.pathname)) {
      errors.push('Suspicious URL pattern detected');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if user agent is suspicious
   */
  private static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /perl/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check for suspicious URL patterns
   */
  private static containsSuspiciousPatterns(pathname: string): boolean {
    const suspiciousPatterns = [
      /\.\./,
      /\/etc\/passwd/,
      /\/proc\/self/,
      /\/sys\/class/,
      /\/dev\/null/,
      /\/tmp\/.*\.php/,
      /\/wp-admin/,
      /\/phpmyadmin/,
      /\/admin\/.*\.php/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(pathname));
  }

  /**
   * Sanitize request body
   */
  static async sanitizeRequestBody(request: Request): Promise<any> {
    try {
      const body = await request.json();
      return this.sanitizeObject(body);
    } catch (error) {
      return null;
    }
  }

  /**
   * Recursively sanitize object properties
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  /**
   * Sanitize individual values
   */
  private static sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remove potential XSS vectors
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }

    return value;
  }

  /**
   * Check if IP is blocked
   */
  static isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Block an IP address
   */
  static blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    
    // Log the blocking action
    this.logSuspiciousActivity(ip, {
      type: 'ip_blocked',
      details: { reason },
      timestamp: new Date(),
      severity: 'high'
    });
  }

  /**
   * Unblock an IP address
   */
  static unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
  }

  /**
   * Log suspicious activity
   */
  static logSuspiciousActivity(
    identifier: string,
    activity: {
      type: string;
      details: any;
      timestamp: Date;
      severity: 'low' | 'medium' | 'high';
    }
  ): void {
    if (!this.suspiciousActivityLog.has(identifier)) {
      this.suspiciousActivityLog.set(identifier, []);
    }
    
    const activities = this.suspiciousActivityLog.get(identifier)!;
    activities.push(activity);
    
    // Keep only recent activities (last 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivities = activities.filter(a => a.timestamp > cutoff);
    this.suspiciousActivityLog.set(identifier, recentActivities);
    
    // Check if this identifier should be flagged
    this.checkForSuspiciousPatterns(identifier, recentActivities);
  }

  /**
   * Check for suspicious activity patterns
   */
  private static checkForSuspiciousPatterns(identifier: string, activities: any[]): void {
    const highSeverityCount = activities.filter(a => a.severity === 'high').length;
    const totalCount = activities.length;

    // Block if too many high severity activities
    if (highSeverityCount >= 3) {
      this.blockIP(identifier, 'Multiple high severity suspicious activities');
    }

    // Block if too many total activities
    if (totalCount >= 10) {
      this.blockIP(identifier, 'Excessive suspicious activities');
    }
  }

  /**
   * Get suspicious activity for an identifier
   */
  static getSuspiciousActivity(identifier: string): any[] {
    return this.suspiciousActivityLog.get(identifier) || [];
  }

  /**
   * Validate trade amount against limits
   */
  static validateTradeAmount(amount: number): { isValid: boolean; error?: string } {
    if (amount <= 0) {
      return { isValid: false, error: 'Trade amount must be positive' };
    }

    if (amount > this.config.validation.maxTradeAmount) {
      return { 
        isValid: false, 
        error: `Trade amount exceeds maximum allowed ($${this.config.validation.maxTradeAmount.toLocaleString()})` 
      };
    }

    return { isValid: true };
  }

  /**
   * Validate allocation percentage
   */
  static validateAllocationPercentage(percentage: number): { isValid: boolean; error?: string } {
    if (percentage <= 0) {
      return { isValid: false, error: 'Allocation percentage must be positive' };
    }

    if (percentage > this.config.validation.maxAllocationPercentage) {
      return { 
        isValid: false, 
        error: `Allocation percentage cannot exceed ${this.config.validation.maxAllocationPercentage}%` 
      };
    }

    return { isValid: true };
  }

  /**
   * Check if KYC is required for user
   */
  static isKYCRequired(userId: string): boolean {
    return this.config.compliance.kycRequired;
  }

  /**
   * Check if trade audit logging is enabled
   */
  static isTradeAuditLoggingEnabled(): boolean {
    return this.config.compliance.tradeAuditLogging;
  }

  /**
   * Check if suspicious activity detection is enabled
   */
  static isSuspiciousActivityDetectionEnabled(): boolean {
    return this.config.compliance.suspiciousActivityDetection;
  }

  /**
   * Get data retention policy
   */
  static getDataRetentionPolicy(): SecurityConfig['compliance']['retentionPolicies'] {
    return this.config.compliance.retentionPolicies;
  }
}

// Export rate limits for middleware
export const RATE_LIMITS = SECURITY_CONFIG.rateLimits;

// Export suspicious patterns for validation
export const SUSPICIOUS_PATTERNS = {
  USER_AGENTS: [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /perl/i
  ],
  URL_PATTERNS: [
    /\.\./,
    /\/etc\/passwd/,
    /\/proc\/self/,
    /\/sys\/class/,
    /\/dev\/null/,
    /\/tmp\/.*\.php/,
    /\/wp-admin/,
    /\/phpmyadmin/,
    /\/admin\/.*\.php/
  ]
};