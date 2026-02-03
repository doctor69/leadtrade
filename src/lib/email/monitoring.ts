/**
 * Email Monitoring and Analytics
 */

import type { EmailCategory, EmailResult } from './types';

export interface EmailMetrics {
  sent: number;
  failed: number;
  successRate: number;
  byCategory: Record<EmailCategory, { sent: number; failed: number }>;
  byProvider: Record<'brevo' | 'resend', { sent: number; failed: number }>;
  errors: Array<{ timestamp: Date; category: EmailCategory; error: string }>;
}

class EmailMonitor {
  private metrics: EmailMetrics = {
    sent: 0,
    failed: 0,
    successRate: 100,
    byCategory: {
      auth: { sent: 0, failed: 0 },
      trading: { sent: 0, failed: 0 },
      support: { sent: 0, failed: 0 },
      marketing: { sent: 0, failed: 0 },
    },
    byProvider: {
      brevo: { sent: 0, failed: 0 },
      resend: { sent: 0, failed: 0 },
    },
    errors: [],
  };

  /**
   * Record email send result
   */
  record(category: EmailCategory, result: EmailResult): void {
    if (result.success) {
      this.metrics.sent++;
      this.metrics.byCategory[category].sent++;
      this.metrics.byProvider[result.provider].sent++;
    } else {
      this.metrics.failed++;
      this.metrics.byCategory[category].failed++;
      this.metrics.byProvider[result.provider].failed++;
      
      // Store error (keep last 100)
      this.metrics.errors.push({
        timestamp: new Date(),
        category,
        error: result.error || 'Unknown error',
      });
      
      if (this.metrics.errors.length > 100) {
        this.metrics.errors.shift();
      }
    }

    // Update success rate
    const total = this.metrics.sent + this.metrics.failed;
    this.metrics.successRate = total > 0 ? (this.metrics.sent / total) * 100 : 100;
  }

  /**
   * Get current metrics
   */
  getMetrics(): EmailMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics for specific category
   */
  getCategoryMetrics(category: EmailCategory): { sent: number; failed: number; successRate: number } {
    const stats = this.metrics.byCategory[category];
    const total = stats.sent + stats.failed;
    const successRate = total > 0 ? (stats.sent / total) * 100 : 100;
    
    return {
      ...stats,
      successRate,
    };
  }

  /**
   * Get metrics for specific provider
   */
  getProviderMetrics(provider: 'brevo' | 'resend'): { sent: number; failed: number; successRate: number } {
    const stats = this.metrics.byProvider[provider];
    const total = stats.sent + stats.failed;
    const successRate = total > 0 ? (stats.sent / total) * 100 : 100;
    
    return {
      ...stats,
      successRate,
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): Array<{ timestamp: Date; category: EmailCategory; error: string }> {
    return this.metrics.errors.slice(-limit);
  }

  /**
   * Check if success rate is below threshold
   */
  isHealthy(threshold = 90): boolean {
    return this.metrics.successRate >= threshold;
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      sent: 0,
      failed: 0,
      successRate: 100,
      byCategory: {
        auth: { sent: 0, failed: 0 },
        trading: { sent: 0, failed: 0 },
        support: { sent: 0, failed: 0 },
        marketing: { sent: 0, failed: 0 },
      },
      byProvider: {
        brevo: { sent: 0, failed: 0 },
        resend: { sent: 0, failed: 0 },
      },
      errors: [],
    };
  }

  /**
   * Generate report
   */
  generateReport(): string {
    const total = this.metrics.sent + this.metrics.failed;
    
    let report = '=== Email Delivery Report ===\n\n';
    report += `Total Emails: ${total}\n`;
    report += `Sent: ${this.metrics.sent}\n`;
    report += `Failed: ${this.metrics.failed}\n`;
    report += `Success Rate: ${this.metrics.successRate.toFixed(2)}%\n\n`;
    
    report += '--- By Category ---\n';
    Object.entries(this.metrics.byCategory).forEach(([category, stats]) => {
      const catTotal = stats.sent + stats.failed;
      const catRate = catTotal > 0 ? (stats.sent / catTotal) * 100 : 100;
      report += `${category}: ${stats.sent}/${catTotal} (${catRate.toFixed(1)}%)\n`;
    });
    
    report += '\n--- By Provider ---\n';
    Object.entries(this.metrics.byProvider).forEach(([provider, stats]) => {
      const provTotal = stats.sent + stats.failed;
      const provRate = provTotal > 0 ? (stats.sent / provTotal) * 100 : 100;
      report += `${provider}: ${stats.sent}/${provTotal} (${provRate.toFixed(1)}%)\n`;
    });
    
    if (this.metrics.errors.length > 0) {
      report += '\n--- Recent Errors ---\n';
      this.getRecentErrors(5).forEach(error => {
        report += `[${error.timestamp.toISOString()}] ${error.category}: ${error.error}\n`;
      });
    }
    
    return report;
  }
}

// Singleton instance
export const emailMonitor = new EmailMonitor();

/**
 * Middleware to automatically track email sends
 */
export function withMonitoring<T extends (...args: any[]) => Promise<EmailResult>>(
  category: EmailCategory,
  fn: T
): T {
  return (async (...args: any[]) => {
    const result = await fn(...args);
    emailMonitor.record(category, result);
    return result;
  }) as T;
}
