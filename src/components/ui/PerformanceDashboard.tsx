import React, { useState, useEffect } from 'react';
import { Activity, Zap, Clock, Eye, MemoryStick, HardDrive, Wifi } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { performanceMonitor, BundleAnalyzer } from '@/lib/performance';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  loadTime: number | null;
  domContentLoaded: number | null;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    loadTime: null,
    domContentLoaded: null
  });
  
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [resourceTimings, setResourceTimings] = useState<ResourceTiming[]>([]);
  const [performanceScore, setPerformanceScore] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    
    try {
      // Get current metrics
      const currentMetrics = performanceMonitor.getMetrics();
      setMetrics(currentMetrics);
      
      // Get memory info
      const memory = performanceMonitor.getMemoryInfo();
      setMemoryInfo(memory);
      
      // Get resource timings
      const resources = performanceMonitor.getResourceTimings();
      setResourceTimings(resources);
      
      // Calculate performance score
      const score = performanceMonitor.getPerformanceScore();
      setPerformanceScore(score);
      
    } catch (error) {
      console.error('Failed to refresh performance metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(refreshMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (time: number | null): string => {
    if (time === null) return 'N/A';
    return `${time.toFixed(2)}ms`;
  };

  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)}MB`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMetricStatus = (value: number | null, good: number, poor: number): 'good' | 'needs-improvement' | 'poor' => {
    if (value === null) return 'needs-improvement';
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const analyzeBundle = () => {
    BundleAnalyzer.analyzeChunks();
    const unusedCSS = BundleAnalyzer.getUnusedCSS();
    console.log('Unused CSS rules:', unusedCSS.length);
  };

  const generateReport = () => {
    const report = performanceMonitor.generateReport();
    console.log(report);
    
    // Create downloadable report
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Performance Score */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Score
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={refreshMetrics}
                disabled={isRefreshing}
                size="sm"
                variant="outline"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                onClick={generateReport}
                size="sm"
                variant="outline"
              >
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold ${getScoreColor(performanceScore)}`}>
              {performanceScore}
            </div>
            <div className="flex-1">
              <Progress value={performanceScore} className="h-3" />
              <p className="text-sm text-gray-600 mt-1">
                {performanceScore >= 90 ? 'Excellent' :
                 performanceScore >= 70 ? 'Good' :
                 performanceScore >= 50 ? 'Needs Improvement' : 'Poor'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              First Contentful Paint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(metrics.fcp)}</div>
            <Badge className={getStatusColor(getMetricStatus(metrics.fcp, 1800, 3000))}>
              {getMetricStatus(metrics.fcp, 1800, 3000)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Largest Contentful Paint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(metrics.lcp)}</div>
            <Badge className={getStatusColor(getMetricStatus(metrics.lcp, 2500, 4000))}>
              {getMetricStatus(metrics.lcp, 2500, 4000)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              First Input Delay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(metrics.fid)}</div>
            <Badge className={getStatusColor(getMetricStatus(metrics.fid, 100, 300))}>
              {getMetricStatus(metrics.fid, 100, 300)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Cumulative Layout Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.cls !== null ? metrics.cls.toFixed(4) : 'N/A'}
            </div>
            <Badge className={getStatusColor(getMetricStatus(metrics.cls, 0.1, 0.25))}>
              {getMetricStatus(metrics.cls, 0.1, 0.25)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Time to First Byte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatTime(metrics.ttfb)}</div>
            <p className="text-sm text-gray-600">Server response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Load Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatTime(metrics.loadTime)}</div>
            <p className="text-sm text-gray-600">Complete page load</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              DOM Content Loaded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatTime(metrics.domContentLoaded)}</div>
            <p className="text-sm text-gray-600">DOM ready time</p>
          </CardContent>
        </Card>
      </div>

      {/* Memory Usage */}
      {memoryInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MemoryStick className="h-5 w-5" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Used Heap</div>
                <div className="text-xl font-bold">{formatBytes(memoryInfo.usedJSHeapSize)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Heap</div>
                <div className="text-xl font-bold">{formatBytes(memoryInfo.totalJSHeapSize)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Heap Limit</div>
                <div className="text-xl font-bold">{formatBytes(memoryInfo.jsHeapSizeLimit)}</div>
              </div>
            </div>
            <div className="mt-4">
              <Progress 
                value={(memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100} 
                className="h-2"
              />
              <p className="text-sm text-gray-600 mt-1">
                Memory usage: {((memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Resource Analysis
            </CardTitle>
            <Button onClick={analyzeBundle} size="sm" variant="outline">
              Analyze Bundle
            </Button>
          </div>
          <CardDescription>
            Analysis of loaded resources and their performance impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Resource type breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['script', 'stylesheet', 'image', 'api'].map(type => {
                const resources = resourceTimings.filter(r => r.type === type);
                const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
                const avgDuration = resources.length > 0 
                  ? resources.reduce((sum, r) => sum + r.duration, 0) / resources.length 
                  : 0;

                return (
                  <div key={type} className="text-center">
                    <div className="text-sm text-gray-600 capitalize">{type}s</div>
                    <div className="text-lg font-bold">{resources.length}</div>
                    <div className="text-xs text-gray-500">
                      {Math.round(totalSize / 1024)}KB
                    </div>
                    <div className="text-xs text-gray-500">
                      {avgDuration.toFixed(0)}ms avg
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Largest resources */}
            <div>
              <h4 className="font-medium mb-2">Largest Resources</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {resourceTimings
                  .sort((a, b) => b.size - a.size)
                  .slice(0, 10)
                  .map((resource, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex-1 truncate">
                        {resource.name.split('/').pop()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {resource.type}
                        </Badge>
                        <span className="text-gray-600">
                          {Math.round(resource.size / 1024)}KB
                        </span>
                        <span className="text-gray-600">
                          {resource.duration.toFixed(0)}ms
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}