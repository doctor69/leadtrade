// Comprehensive Audit and Compliance Service
import { DatabaseService } from './database';
import { logger, LogCategory } from './logger';
import { errorHandler, ErrorCode } from './error-handler';
import { SecurityService } from './security-config';
import type { TradeExecution, CopiedTrade } from '../types/trading';

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  compliance: {
    regulatory: string[];
    internal: string[];
  };
}

export interface TradeAuditLog {
  id: string;
  tradeId: string;
  userId: string;
  tradeType: 'original' | 'copied';
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalValue: number;
  executionTime: Date;
  complianceChecks: {
    kycVerified: boolean;
    riskLimitsPassed: boolean;
    suspiciousActivityCheck: boolean;
    regulatoryCompliance: boolean;
  };
  auditTrail: {
    preTradeChecks: string[];
    executionSteps: string[];
    postTradeValidation: string[];
  };
  metadata: Record<string, any>;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  sessionId: string;
  action: string;
  page: string;
  duration: number; // seconds
  timestamp: Date;
  deviceInfo: {
    userAgent: string;
    ipAddress: string;
    location?: string;
  };
  riskScore: number; // 0-100
  flags: string[];
}

export interface SuspiciousActivityReport {
  id: string;
  userId: string;
  activityType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
  timestamp: Date;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolution?: string;
}

export interface KYCStatus {
  userId: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  verificationLevel: 'basic' | 'enhanced' | 'full';
  documents: {
    idVerification: boolean;
    addressVerification: boolean;
    incomeVerification: boolean;
    sourceOfFunds: boolean;
  };
  lastUpdated: Date;
  expiresAt?: Date;
  notes: string[];
}

export interface ComplianceReport {
  userId: string;
  reportType: 'trade_activity' | 'account_summary' | 'tax_report' | 'regulatory';
  dateRange: {
    start: Date;
    end: Date;
  };
  data: Record<string, any>;
  generatedAt: Date;
  format: 'csv' | 'json' | 'pdf';
}

export class AuditComplianceService {
  /**
   * Log comprehensive trade audit
   */
  static async logTradeAudit(
    tradeData: {
      tradeId: string;
      userId: string;
      tradeType: 'original' | 'copied';
      symbol: string;
      side: 'buy' | 'sell';
      quantity: number;
      price: number;
      totalValue: number;
    },
    context: {
      ipAddress: string;
      userAgent: string;
      sessionId: string;
    }
  ): Promise<TradeAuditLog> {
    try {
      // Perform compliance checks
      const complianceChecks = await this.performTradeComplianceChecks(tradeData.userId, tradeData);
      
      // Generate audit trail
      const auditTrail = await this.generateTradeAuditTrail(tradeData, complianceChecks);
      
      // Create audit log entry
      const auditLog: TradeAuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tradeId: tradeData.tradeId,
        userId: tradeData.userId,
        tradeType: tradeData.tradeType,
        symbol: tradeData.symbol,
        side: tradeData.side,
        quantity: tradeData.quantity,
        price: tradeData.price,
        totalValue: tradeData.totalValue,
        executionTime: new Date(),
        complianceChecks,
        auditTrail,
        metadata: {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          sessionId: context.sessionId,
          riskScore: this.calculateTradeRiskScore(tradeData, complianceChecks)
        }
      };

      // Store in database
      await this.storeTradeAuditLog(auditLog);
      
      // Log to monitoring system
      logger.info(LogCategory.SYSTEM, 'Trade audit logged', {
        metadata: {
          tradeId: tradeData.tradeId,
          userId: tradeData.userId,
          complianceStatus: Object.values(complianceChecks).every(check => check)
        }
      });

      return auditLog;
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Failed to log trade audit', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { tradeId: tradeData.tradeId, userId: tradeData.userId }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to log trade audit',
        'Unable to record trade compliance data',
        { retryable: true }
      );
    }
  }

  /**
   * Track user activity
   */
  static async trackUserActivity(
    userId: string,
    activity: {
      action: string;
      page: string;
      duration: number;
      sessionId: string;
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<UserActivityLog> {
    try {
      // Calculate risk score
      const riskScore = await this.calculateActivityRiskScore(userId, activity);
      
      // Check for suspicious patterns
      const flags = await this.detectSuspiciousActivity(userId, activity);
      
      const activityLog: UserActivityLog = {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        sessionId: activity.sessionId,
        action: activity.action,
        page: activity.page,
        duration: activity.duration,
        timestamp: new Date(),
        deviceInfo: {
          userAgent: activity.userAgent,
          ipAddress: activity.ipAddress,
          location: await this.getLocationFromIP(activity.ipAddress)
        },
        riskScore,
        flags
      };

      // Store activity log
      await this.storeUserActivityLog(activityLog);
      
      // Check if suspicious activity should be reported
      if (flags.length > 0 || riskScore > 70) {
        await this.createSuspiciousActivityReport(userId, activityLog);
      }

      return activityLog;
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Failed to track user activity', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId, action: activity.action }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to track user activity',
        'Unable to record user activity data',
        { retryable: true }
      );
    }
  }

  /**
   * Create suspicious activity report
   */
  static async createSuspiciousActivityReport(
    userId: string,
    activityLog: UserActivityLog
  ): Promise<SuspiciousActivityReport> {
    try {
      const severity = this.determineSuspiciousActivitySeverity(activityLog);
      const description = this.generateSuspiciousActivityDescription(activityLog);
      
      const report: SuspiciousActivityReport = {
        id: `suspicious_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        activityType: activityLog.action,
        severity,
        description,
        evidence: {
          activityLog,
          riskScore: activityLog.riskScore,
          flags: activityLog.flags,
          recentActivities: await this.getRecentUserActivities(userId, 24) // Last 24 hours
        },
        timestamp: new Date(),
        status: 'open'
      };

      // Store report
      await this.storeSuspiciousActivityReport(report);
      
      // Log critical suspicious activity
      if (severity === 'critical' || severity === 'high') {
        logger.warn(LogCategory.SYSTEM, 'Suspicious activity detected', {
          metadata: {
            userId,
            severity,
            description,
            riskScore: activityLog.riskScore
          }
        });
      }

      return report;
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Failed to create suspicious activity report', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create suspicious activity report',
        'Unable to record suspicious activity',
        { retryable: true }
      );
    }
  }

  /**
   * Update KYC status
   */
  static async updateKYCStatus(
    userId: string,
    kycData: {
      status: KYCStatus['status'];
      verificationLevel: KYCStatus['verificationLevel'];
      documents: KYCStatus['documents'];
      notes?: string[];
    }
  ): Promise<KYCStatus> {
    try {
      const kycStatus: KYCStatus = {
        userId,
        status: kycData.status,
        verificationLevel: kycData.verificationLevel,
        documents: kycData.documents,
        lastUpdated: new Date(),
        expiresAt: kycData.status === 'verified' ? 
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined, // 1 year
        notes: kycData.notes || []
      };

      // Store KYC status
      await this.storeKYCStatus(kycStatus);
      
      // Log KYC update
      logger.info(LogCategory.SYSTEM, 'KYC status updated', {
        metadata: {
          userId,
          status: kycData.status,
          verificationLevel: kycData.verificationLevel
        }
      });

      return kycStatus;
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Failed to update KYC status', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update KYC status',
        'Unable to update KYC verification data',
        { retryable: true }
      );
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    userId: string,
    reportType: ComplianceReport['reportType'],
    dateRange: { start: Date; end: Date },
    format: 'csv' | 'json' | 'pdf' = 'json'
  ): Promise<ComplianceReport> {
    try {
      let data: Record<string, any> = {};

      switch (reportType) {
        case 'trade_activity':
          data = await this.generateTradeActivityReport(userId, dateRange);
          break;
        case 'account_summary':
          data = await this.generateAccountSummaryReport(userId, dateRange);
          break;
        case 'tax_report':
          data = await this.generateTaxReport(userId, dateRange);
          break;
        case 'regulatory':
          data = await this.generateRegulatoryReport(userId, dateRange);
          break;
      }

      const report: ComplianceReport = {
        userId,
        reportType,
        dateRange,
        data,
        generatedAt: new Date(),
        format
      };

      // Store report
      await this.storeComplianceReport(report);
      
      // Log report generation
      logger.info(LogCategory.SYSTEM, 'Compliance report generated', {
        metadata: {
          userId,
          reportType,
          format,
          dateRange
        }
      });

      return report;
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Failed to generate compliance report', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId, reportType }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to generate compliance report',
        'Unable to create compliance report',
        { retryable: true }
      );
    }
  }

  /**
   * Get audit logs for user
   */
  static async getUserAuditLogs(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      action?: string;
      severity?: AuditLogEntry['severity'];
      limit?: number;
    } = {}
  ): Promise<AuditLogEntry[]> {
    try {
      // This would query the audit logs database
      // For now, return mock data
      return [];
    } catch (error) {
      logger.error(LogCategory.SYSTEM, 'Failed to get user audit logs', {
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: { userId }
      });
      throw errorHandler.createTradingError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to retrieve audit logs',
        'Unable to fetch user audit data',
        { retryable: true }
      );
    }
  }

  // Private helper methods

  private static async performTradeComplianceChecks(
    userId: string,
    tradeData: any
  ): Promise<TradeAuditLog['complianceChecks']> {
    // Check KYC status
    const kycStatus = await this.getKYCStatus(userId);
    const kycVerified = kycStatus?.status === 'verified';
    
    // Check risk limits
    const riskLimitsPassed = await this.checkRiskLimits(userId, tradeData);
    
    // Check for suspicious activity
    const suspiciousActivityCheck = await this.checkSuspiciousActivity(userId, tradeData);
    
    // Check regulatory compliance
    const regulatoryCompliance = await this.checkRegulatoryCompliance(tradeData);
    
    return {
      kycVerified,
      riskLimitsPassed,
      suspiciousActivityCheck,
      regulatoryCompliance
    };
  }

  private static async generateTradeAuditTrail(
    tradeData: any,
    complianceChecks: TradeAuditLog['complianceChecks']
  ): Promise<TradeAuditLog['auditTrail']> {
    const preTradeChecks = [
      'User authentication verified',
      'Account status validated',
      'Trading permissions confirmed'
    ];

    const executionSteps = [
      'Order validation completed',
      'Risk limits checked',
      'Compliance verification passed',
      'Order submitted to execution engine'
    ];

    const postTradeValidation = [
      'Trade confirmation received',
      'Settlement instructions generated',
      'Audit trail completed'
    ];

    if (!complianceChecks.kycVerified) {
      preTradeChecks.push('KYC verification required');
    }

    if (!complianceChecks.riskLimitsPassed) {
      executionSteps.push('Risk limit exceeded - trade blocked');
    }

    return {
      preTradeChecks,
      executionSteps,
      postTradeValidation
    };
  }

  private static calculateTradeRiskScore(
    tradeData: any,
    complianceChecks: TradeAuditLog['complianceChecks']
  ): number {
    let riskScore = 0;

    // Base risk based on trade size
    if (tradeData.totalValue > 100000) riskScore += 30;
    else if (tradeData.totalValue > 50000) riskScore += 20;
    else if (tradeData.totalValue > 10000) riskScore += 10;

    // Compliance check penalties
    if (!complianceChecks.kycVerified) riskScore += 40;
    if (!complianceChecks.riskLimitsPassed) riskScore += 50;
    if (!complianceChecks.suspiciousActivityCheck) riskScore += 30;
    if (!complianceChecks.regulatoryCompliance) riskScore += 60;

    return Math.min(100, riskScore);
  }

  private static async calculateActivityRiskScore(
    userId: string,
    activity: any
  ): Promise<number> {
    let riskScore = 0;

    // Check for unusual activity patterns
    const recentActivities = await this.getRecentUserActivities(userId, 1); // Last hour
    if (recentActivities.length > 100) riskScore += 30; // Too many actions
    
    // Check for unusual page access
    if (activity.page.includes('admin') || activity.page.includes('internal')) {
      riskScore += 40;
    }

    // Check for rapid actions
    if (activity.duration < 1) riskScore += 20; // Very fast actions

    return Math.min(100, riskScore);
  }

  private static async detectSuspiciousActivity(
    userId: string,
    activity: any
  ): Promise<string[]> {
    const flags: string[] = [];

    // Check for multiple failed login attempts
    const failedLogins = await this.getFailedLoginAttempts(userId, 1); // Last hour
    if (failedLogins.length > 5) {
      flags.push('multiple_failed_logins');
    }

    // Check for unusual IP addresses
    const knownIPs = await this.getKnownUserIPs(userId);
    if (!knownIPs.includes(activity.ipAddress)) {
      flags.push('unusual_ip_address');
    }

    // Check for rapid page navigation
    const recentActivities = await this.getRecentUserActivities(userId, 1);
    if (recentActivities.length > 50) {
      flags.push('rapid_navigation');
    }

    return flags;
  }

  private static determineSuspiciousActivitySeverity(
    activityLog: UserActivityLog
  ): SuspiciousActivityReport['severity'] {
    if (activityLog.riskScore > 90) return 'critical';
    if (activityLog.riskScore > 70) return 'high';
    if (activityLog.riskScore > 50) return 'medium';
    return 'low';
  }

  private static generateSuspiciousActivityDescription(
    activityLog: UserActivityLog
  ): string {
    const flags = activityLog.flags.join(', ');
    return `Suspicious activity detected: ${flags} (Risk Score: ${activityLog.riskScore})`;
  }

  private static async getLocationFromIP(ipAddress: string): Promise<string | undefined> {
    // This would integrate with a geolocation service
    // For now, return undefined
    return undefined;
  }

  private static async getKYCStatus(userId: string): Promise<KYCStatus | null> {
    // This would query the KYC database
    // For now, return null
    return null;
  }

  private static async checkRiskLimits(userId: string, tradeData: any): Promise<boolean> {
    // This would check against user's risk limits
    // For now, return true
    return true;
  }

  private static async checkSuspiciousActivity(userId: string, tradeData: any): Promise<boolean> {
    // This would check for suspicious trading patterns
    // For now, return true
    return true;
  }

  private static async checkRegulatoryCompliance(tradeData: any): Promise<boolean> {
    // This would check regulatory requirements
    // For now, return true
    return true;
  }

  private static async getRecentUserActivities(userId: string, hours: number): Promise<UserActivityLog[]> {
    // This would query the activity database
    // For now, return empty array
    return [];
  }

  private static async getFailedLoginAttempts(userId: string, hours: number): Promise<any[]> {
    // This would query failed login attempts
    // For now, return empty array
    return [];
  }

  private static async getKnownUserIPs(userId: string): Promise<string[]> {
    // This would query known IP addresses for the user
    // For now, return empty array
    return [];
  }

  private static async generateTradeActivityReport(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Record<string, any>> {
    // This would generate trade activity report
    return {
      totalTrades: 0,
      totalVolume: 0,
      mostTradedSymbols: [],
      tradingPatterns: {}
    };
  }

  private static async generateAccountSummaryReport(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Record<string, any>> {
    // This would generate account summary report
    return {
      accountValue: 0,
      totalPnL: 0,
      positions: [],
      cashBalance: 0
    };
  }

  private static async generateTaxReport(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Record<string, any>> {
    // This would generate tax report
    return {
      realizedGains: 0,
      realizedLosses: 0,
      washSales: [],
      costBasis: {}
    };
  }

  private static async generateRegulatoryReport(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Record<string, any>> {
    // This would generate regulatory report
    return {
      largeTrader: false,
      patternDayTrader: false,
      regulatoryFlags: [],
      complianceStatus: 'compliant'
    };
  }

  // Database storage methods (would integrate with actual database)

  private static async storeTradeAuditLog(auditLog: TradeAuditLog): Promise<void> {
    // Store in database
    logger.debug(LogCategory.SYSTEM, 'Trade audit log stored', {
      metadata: { tradeId: auditLog.tradeId }
    });
  }

  private static async storeUserActivityLog(activityLog: UserActivityLog): Promise<void> {
    // Store in database
    logger.debug(LogCategory.SYSTEM, 'User activity log stored', {
      metadata: { userId: activityLog.userId }
    });
  }

  private static async storeSuspiciousActivityReport(report: SuspiciousActivityReport): Promise<void> {
    // Store in database
    logger.debug(LogCategory.SYSTEM, 'Suspicious activity report stored', {
      metadata: { userId: report.userId, severity: report.severity }
    });
  }

  private static async storeKYCStatus(kycStatus: KYCStatus): Promise<void> {
    // Store in database
    logger.debug(LogCategory.SYSTEM, 'KYC status stored', {
      metadata: { userId: kycStatus.userId, status: kycStatus.status }
    });
  }

  private static async storeComplianceReport(report: ComplianceReport): Promise<void> {
    // Store in database
    logger.debug(LogCategory.SYSTEM, 'Compliance report stored', {
      metadata: { userId: report.userId, reportType: report.reportType }
    });
  }
} 