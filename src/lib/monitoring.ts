/**
 * System monitoring and health check utilities
 * Provides comprehensive monitoring for the copy trading platform
 */

import { logger, LogCategory } from './logger';

export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: {
        database: ServiceStatus;
        alpaca: ServiceStatus;
        websocket: ServiceStatus;
        cache: ServiceStatus;
    };
    metrics: {
        responseTime: number;
        errorRate: number;
        activeUsers: number;
        activeTrades: number;
    };
}

export interface ServiceStatus {
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    lastCheck: string;
    error?: string;
}

export interface AlertConfig {
    errorRateThreshold: number;
    responseTimeThreshold: number;
    healthCheckInterval: number;
}

class SystemMonitor {
    private static instance: SystemMonitor;
    private alertConfig: AlertConfig;
    private healthCheckInterval?: NodeJS.Timeout;
    private metrics: Map<string, number[]> = new Map();

    private constructor() {
        this.alertConfig = {
            errorRateThreshold: 0.05, // 5% error rate
            responseTimeThreshold: 2000, // 2 seconds
            healthCheckInterval: 30000, // 30 seconds
        };
    }

    public static getInstance(): SystemMonitor {
        if (!SystemMonitor.instance) {
            SystemMonitor.instance = new SystemMonitor();
        }
        return SystemMonitor.instance;
    }

    /**
     * Start continuous health monitoring
     */
    public startMonitoring(): void {
        if (this.healthCheckInterval) {
            return; // Already monitoring
        }

        logger.info(LogCategory.SYSTEM, 'Starting system monitoring');

        this.healthCheckInterval = setInterval(async () => {
            try {
                const health = await this.checkSystemHealth();
                this.processHealthCheck(health);
            } catch (error) {
                logger.error(LogCategory.SYSTEM, 'Health check failed', { error: error as Error });
            }
        }, this.alertConfig.healthCheckInterval);
    }

    /**
     * Stop health monitoring
     */
    public stopMonitoring(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
            logger.info(LogCategory.SYSTEM, 'Stopped system monitoring');
        }
    }

    /**
     * Perform comprehensive system health check
     */
    public async checkSystemHealth(): Promise<SystemHealth> {
        const timestamp = new Date().toISOString();

        const [database, alpaca, websocket, cache] = await Promise.all([
            this.checkDatabaseHealth(),
            this.checkAlpacaHealth(),
            this.checkWebSocketHealth(),
            this.checkCacheHealth(),
        ]);

        const metrics = this.calculateMetrics();

        // Determine overall system status
        const services = { database, alpaca, websocket, cache };
        const status = this.determineOverallStatus(services);

        return {
            status,
            timestamp,
            services,
            metrics,
        };
    }

    /**
     * Check database connectivity and performance
     */
    private async checkDatabaseHealth(): Promise<ServiceStatus> {
        const startTime = Date.now();

        try {
            // Simple database connectivity check
            const response = await fetch('/api/health/database', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            const responseTime = Date.now() - startTime;

            if (response.ok) {
                return {
                    status: responseTime > this.alertConfig.responseTimeThreshold ? 'degraded' : 'up',
                    responseTime,
                    lastCheck: new Date().toISOString(),
                };
            } else {
                return {
                    status: 'down',
                    responseTime,
                    lastCheck: new Date().toISOString(),
                    error: `HTTP ${response.status}`,
                };
            }
        } catch (error) {
            return {
                status: 'down',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check Alpaca API connectivity and performance
     */
    private async checkAlpacaHealth(): Promise<ServiceStatus> {
        const startTime = Date.now();

        try {
            // Check Alpaca account endpoint
            const response = await fetch('/api/alpaca/account', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            const responseTime = Date.now() - startTime;

            if (response.ok) {
                return {
                    status: responseTime > this.alertConfig.responseTimeThreshold ? 'degraded' : 'up',
                    responseTime,
                    lastCheck: new Date().toISOString(),
                };
            } else {
                return {
                    status: 'down',
                    responseTime,
                    lastCheck: new Date().toISOString(),
                    error: `HTTP ${response.status}`,
                };
            }
        } catch (error) {
            return {
                status: 'down',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check WebSocket connectivity
     */
    private async checkWebSocketHealth(): Promise<ServiceStatus> {
        // For WebSocket health, we'll check if the service is available
        // In a real implementation, this would test actual WebSocket connectivity
        try {
            const lastCheck = new Date().toISOString();

            // Check if WebSocket service is configured
            const wsUrl = import.meta.env.PUBLIC_ALPACA_PAPER_WS_URL;

            if (!wsUrl) {
                return {
                    status: 'down',
                    lastCheck,
                    error: 'WebSocket URL not configured',
                };
            }

            return {
                status: 'up',
                lastCheck,
            };
        } catch (error) {
            return {
                status: 'down',
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check cache system health
     */
    private async checkCacheHealth(): Promise<ServiceStatus> {
        try {
            // Simple cache health check - in a real implementation this would check Redis/cache service
            const lastCheck = new Date().toISOString();
            
            return {
                status: 'up',
                lastCheck,
            };
        } catch (error) {
            return {
                status: 'down',
                lastCheck: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Calculate system metrics
     */
    private calculateMetrics() {
        return {
            responseTime: this.getAverageResponseTime(),
            errorRate: this.calculateErrorRate(),
            activeUsers: this.getActiveUserCount(),
            activeTrades: this.getActiveTradeCount(),
        };
    }

    /**
     * Get average response time from recorded metrics
     */
    private getAverageResponseTime(): number {
        const responseTimes = this.metrics.get('response_times') || [];
        if (responseTimes.length === 0) return 0;
        
        const recent = responseTimes.slice(-50); // Last 50 requests
        return recent.reduce((sum, time) => sum + time, 0) / recent.length;
    }

    /**
     * Calculate error rate from recent logs
     */
    private calculateErrorRate(): number {
        const errorMetrics = this.metrics.get('errors') || [];
        const totalMetrics = this.metrics.get('requests') || [];

        if (totalMetrics.length === 0) return 0;

        const recentErrors = errorMetrics.slice(-100); // Last 100 entries
        const recentTotal = totalMetrics.slice(-100);

        return recentErrors.length / recentTotal.length;
    }

    /**
     * Get active user count (placeholder)
     */
    private getActiveUserCount(): number {
        // In a real implementation, this would query active sessions
        return 0;
    }

    /**
     * Get active trade count (placeholder)
     */
    private getActiveTradeCount(): number {
        // In a real implementation, this would query active trades
        return 0;
    }

    /**
     * Determine overall system status
     */
    private determineOverallStatus(services: SystemHealth['services']): SystemHealth['status'] {
        const statuses = Object.values(services).map(service => service.status);

        if (statuses.includes('down')) {
            return 'unhealthy';
        } else if (statuses.includes('degraded')) {
            return 'degraded';
        } else {
            return 'healthy';
        }
    }

    /**
     * Process health check results and trigger alerts if needed
     */
    private processHealthCheck(health: SystemHealth): void {
        logger.info(LogCategory.SYSTEM, `System health check: ${health.status}`, {
            metadata: {
                services: health.services,
                metrics: health.metrics,
            },
        });

        // Trigger alerts for unhealthy status
        if (health.status === 'unhealthy') {
            this.triggerAlert('System is unhealthy', health);
        } else if (health.status === 'degraded') {
            this.triggerAlert('System performance is degraded', health);
        }

        // Check specific thresholds
        if (health.metrics.errorRate > this.alertConfig.errorRateThreshold) {
            this.triggerAlert(`High error rate: ${(health.metrics.errorRate * 100).toFixed(2)}%`, health);
        }

        if (health.metrics.responseTime > this.alertConfig.responseTimeThreshold) {
            this.triggerAlert(`High response time: ${health.metrics.responseTime}ms`, health);
        }
    }

    /**
     * Trigger system alert
     */
    private triggerAlert(message: string, health: SystemHealth): void {
        logger.critical(LogCategory.SYSTEM, `ALERT: ${message}`, {
            metadata: {
                systemHealth: health,
                alertConfig: this.alertConfig,
            },
        });

        // In a real implementation, this would send notifications
        // via email, Slack, PagerDuty, etc.
        console.error(`🚨 SYSTEM ALERT: ${message}`);
    }

    /**
     * Record metric for monitoring
     */
    public recordMetric(key: string, value: number): void {
        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }

        const values = this.metrics.get(key)!;
        values.push(value);

        // Keep only last 1000 values
        if (values.length > 1000) {
            values.shift();
        }
    }

    /**
     * Record API request for monitoring
     */
    public recordApiRequest(success: boolean, responseTime: number): void {
        this.recordMetric('requests', 1);
        this.recordMetric('response_times', responseTime);

        if (!success) {
            this.recordMetric('errors', 1);
        }
    }

    /**
     * Get monitoring dashboard data
     */
    public getDashboardData() {
        return {
            performance: {
                score: this.calculateErrorRate() < 0.05 ? 95 : 70, // Simple performance score
                metrics: {
                    responseTime: this.getAverageResponseTime(),
                    errorRate: this.calculateErrorRate(),
                    requestCount: this.metrics.get('requests')?.length || 0
                },
                recommendations: this.getPerformanceRecommendations(),
            },
            system: {
                errorRate: this.calculateErrorRate(),
                activeUsers: this.getActiveUserCount(),
                activeTrades: this.getActiveTradeCount(),
            },
            alerts: {
                config: this.alertConfig,
                isMonitoring: !!this.healthCheckInterval,
            },
        };
    }

    /**
     * Get performance recommendations based on current metrics
     */
    private getPerformanceRecommendations(): string[] {
        const recommendations: string[] = [];
        const errorRate = this.calculateErrorRate();
        const avgResponseTime = this.getAverageResponseTime();

        if (errorRate > this.alertConfig.errorRateThreshold) {
            recommendations.push('High error rate detected. Review recent error logs and fix critical issues.');
        }

        if (avgResponseTime > this.alertConfig.responseTimeThreshold) {
            recommendations.push('Slow response times detected. Consider optimizing database queries and API calls.');
        }

        if (recommendations.length === 0) {
            recommendations.push('System performance is within acceptable limits.');
        }

        return recommendations;
    }

    /**
     * Update alert configuration
     */
    public updateAlertConfig(config: Partial<AlertConfig>): void {
        this.alertConfig = { ...this.alertConfig, ...config };
        logger.info(LogCategory.SYSTEM, 'Alert configuration updated', {
            metadata: { newConfig: this.alertConfig },
        });
    }
}

// Export singleton instance
export const systemMonitor = SystemMonitor.getInstance();

// Utility functions for monitoring
export const monitoringUtils = {
    /**
     * Create a monitoring middleware for API routes
     */
    createApiMonitoringMiddleware() {
        return (handler: Function) => {
            return async (...args: any[]) => {
                const startTime = Date.now();
                let success = true;

                try {
                    const result = await handler(...args);
                    return result;
                } catch (error) {
                    success = false;
                    throw error;
                } finally {
                    const responseTime = Date.now() - startTime;
                    systemMonitor.recordApiRequest(success, responseTime);
                }
            };
        };
    },

    /**
     * Monitor trade execution
     */
    monitorTradeExecution(tradeId: string, success: boolean, responseTime: number) {
        systemMonitor.recordMetric('trade_executions', 1);
        systemMonitor.recordMetric('trade_response_times', responseTime);

        if (!success) {
            systemMonitor.recordMetric('trade_failures', 1);
        }

        logger.info(LogCategory.TRADING, `Trade execution monitored: ${tradeId}`, {
            metadata: { success, responseTime },
        });
    },

    /**
     * Monitor WebSocket events
     */
    monitorWebSocketEvent(event: string, success: boolean) {
        systemMonitor.recordMetric('websocket_events', 1);

        if (!success) {
            systemMonitor.recordMetric('websocket_errors', 1);
        }

        logger.debug(LogCategory.WEBSOCKET, `WebSocket event monitored: ${event}`, {
            metadata: { success },
        });
    },
};

// Auto-start monitoring in production
if (typeof window === 'undefined' && (typeof process !== 'undefined' ? process.env.NODE_ENV : 'development') === 'production') {
    systemMonitor.startMonitoring();
}