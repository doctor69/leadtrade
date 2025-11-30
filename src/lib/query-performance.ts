/**
 * Query performance monitoring and optimization utilities
 */

interface QueryMetrics {
  queryName: string;
  executionTime: number;
  cacheHit: boolean;
  timestamp: number;
  userId?: string;
}

class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 queries

  /**
   * Track query performance
   */
  trackQuery(queryName: string, executionTime: number, cacheHit = false, userId?: string) {
    const metric: QueryMetrics = {
      queryName,
      executionTime,
      cacheHit,
      timestamp: Date.now(),
      userId
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (executionTime > 1000 && !cacheHit) {
      console.warn(`Slow query detected: ${queryName} took ${executionTime}ms`);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindowMs = 5 * 60 * 1000) { // Default: last 5 minutes
    const cutoff = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageTime: 0,
        cacheHitRate: 0,
        slowQueries: 0,
        queryBreakdown: {}
      };
    }

    const totalQueries = recentMetrics.length;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const slowQueries = recentMetrics.filter(m => m.executionTime > 1000).length;
    const averageTime = recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;

    // Query breakdown by type
    const queryBreakdown = recentMetrics.reduce((acc, metric) => {
      if (!acc[metric.queryName]) {
        acc[metric.queryName] = {
          count: 0,
          totalTime: 0,
          cacheHits: 0
        };
      }
      acc[metric.queryName].count++;
      acc[metric.queryName].totalTime += metric.executionTime;
      if (metric.cacheHit) acc[metric.queryName].cacheHits++;
      return acc;
    }, {} as Record<string, { count: number; totalTime: number; cacheHits: number }>);

    return {
      totalQueries,
      averageTime: Math.round(averageTime),
      cacheHitRate: Math.round((cacheHits / totalQueries) * 100),
      slowQueries,
      queryBreakdown: Object.entries(queryBreakdown).map(([name, stats]) => ({
        name,
        count: stats.count,
        averageTime: Math.round(stats.totalTime / stats.count),
        cacheHitRate: Math.round((stats.cacheHits / stats.count) * 100)
      }))
    };
  }

  /**
   * Clear metrics
   */
  clear() {
    this.metrics = [];
  }
}

// Singleton instance
export const queryPerformanceMonitor = new QueryPerformanceMonitor();

/**
 * Decorator to automatically track query performance
 */
export function trackQueryPerformance(queryName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let cacheHit = false;

      try {
        const result = await method.apply(this, args);
        
        // Check if result came from cache (simple heuristic)
        if (Date.now() - startTime < 10) {
          cacheHit = true;
        }

        queryPerformanceMonitor.trackQuery(
          queryName,
          Date.now() - startTime,
          cacheHit
        );

        return result;
      } catch (error) {
        queryPerformanceMonitor.trackQuery(
          queryName,
          Date.now() - startTime,
          false
        );
        throw error;
      }
    };
  };
}

/**
 * Utility to measure and track async operations
 */
export async function measureQuery<T>(
  queryName: string,
  operation: () => Promise<T>,
  userId?: string
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const executionTime = Date.now() - startTime;
    
    queryPerformanceMonitor.trackQuery(queryName, executionTime, false, userId);
    
    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    queryPerformanceMonitor.trackQuery(queryName, executionTime, false, userId);
    throw error;
  }
}

/**
 * Get query performance report for debugging
 */
export function getPerformanceReport() {
  const stats = queryPerformanceMonitor.getStats();
  
  console.group('Query Performance Report');
  console.log(`Total Queries: ${stats.totalQueries}`);
  console.log(`Average Time: ${stats.averageTime}ms`);
  console.log(`Cache Hit Rate: ${stats.cacheHitRate}%`);
  console.log(`Slow Queries: ${stats.slowQueries}`);
  
  if (stats.queryBreakdown.length > 0) {
    console.table(stats.queryBreakdown);
  }
  
  console.groupEnd();
  
  return stats;
}