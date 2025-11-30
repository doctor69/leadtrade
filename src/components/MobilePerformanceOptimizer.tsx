import React, { useState, useEffect } from 'react';
import { Smartphone, Zap, Wifi, Battery, Clock, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  mobileOptimizer, 
  pwaOptimizer, 
  BundleSizeOptimizer,
  performanceMonitor 
} from '@/lib/performance';

interface MobileOptimizationSettings {
  dataSaverMode: boolean;
  reducedAnimations: boolean;
  lazyLoadImages: boolean;
  preloadCriticalResources: boolean;
  optimizeTouchInteractions: boolean;
}

interface DeviceInfo {
  isMobile: boolean;
  deviceMemory: number;
  connectionType: string;
  isStandalone: boolean;
  canInstall: boolean;
}

export function MobilePerformanceOptimizer() {
  const [settings, setSettings] = useState<MobileOptimizationSettings>({
    dataSaverMode: false,
    reducedAnimations: false,
    lazyLoadImages: true,
    preloadCriticalResources: true,
    optimizeTouchInteractions: true
  });

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    deviceMemory: 4,
    connectionType: 'unknown',
    isStandalone: false,
    canInstall: false
  });

  const [touchLatency, setTouchLatency] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loadedModules, setLoadedModules] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    initializeDeviceInfo();
    loadRecommendations();
    loadModuleInfo();
  }, []);

  const initializeDeviceInfo = () => {
    const info: DeviceInfo = {
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                window.innerWidth <= 768,
      deviceMemory: (navigator as any).deviceMemory || 4,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      isStandalone: window.matchMedia('(display-mode: standalone)').matches ||
                   (window.navigator as any).standalone === true,
      canInstall: pwaOptimizer.canInstall()
    };

    setDeviceInfo(info);
  };

  const loadRecommendations = () => {
    const recs = mobileOptimizer.getOptimizationRecommendations();
    setRecommendations(recs);
  };

  const loadModuleInfo = () => {
    const modules = BundleSizeOptimizer.getLoadedModules();
    setLoadedModules(modules);
  };

  const measureTouchLatency = async () => {
    try {
      const latency = await mobileOptimizer.measureTouchLatency();
      setTouchLatency(latency);
    } catch (error) {
      console.error('Failed to measure touch latency:', error);
    }
  };

  const handleSettingChange = (key: keyof MobileOptimizationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply optimization immediately
    applyOptimization(key, value);
  };

  const applyOptimization = (key: keyof MobileOptimizationSettings, enabled: boolean) => {
    switch (key) {
      case 'dataSaverMode':
        if (enabled) {
          document.documentElement.classList.add('data-saver');
        } else {
          document.documentElement.classList.remove('data-saver');
        }
        break;
        
      case 'reducedAnimations':
        if (enabled) {
          document.documentElement.classList.add('reduced-motion');
        } else {
          document.documentElement.classList.remove('reduced-motion');
        }
        break;
        
      case 'optimizeTouchInteractions':
        if (enabled) {
          document.documentElement.style.touchAction = 'manipulation';
        }
        break;
    }
  };

  const runFullOptimization = async () => {
    setIsOptimizing(true);
    
    try {
      // Apply all enabled optimizations
      Object.entries(settings).forEach(([key, enabled]) => {
        if (enabled) {
          applyOptimization(key as keyof MobileOptimizationSettings, enabled);
        }
      });

      // Measure performance improvements
      await measureTouchLatency();
      
      // Update recommendations
      loadRecommendations();
      
      console.log('Mobile optimization completed');
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const installPWA = async () => {
    const installed = await pwaOptimizer.showInstallPrompt();
    if (installed) {
      setDeviceInfo(prev => ({ ...prev, canInstall: false, isStandalone: true }));
    }
  };

  const getConnectionQuality = (type: string): { color: string; label: string } => {
    switch (type) {
      case '4g': return { color: 'text-green-600', label: 'Excellent' };
      case '3g': return { color: 'text-yellow-600', label: 'Good' };
      case '2g': return { color: 'text-orange-600', label: 'Fair' };
      case 'slow-2g': return { color: 'text-red-600', label: 'Poor' };
      default: return { color: 'text-gray-600', label: 'Unknown' };
    }
  };

  const getMemoryStatus = (memory: number): { color: string; label: string } => {
    if (memory >= 8) return { color: 'text-green-600', label: 'High' };
    if (memory >= 4) return { color: 'text-yellow-600', label: 'Medium' };
    return { color: 'text-red-600', label: 'Low' };
  };

  const connectionQuality = getConnectionQuality(deviceInfo.connectionType);
  const memoryStatus = getMemoryStatus(deviceInfo.deviceMemory);

  return (
    <div className="space-y-6">
      {/* Device Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Device Information
          </CardTitle>
          <CardDescription>
            Current device capabilities and optimization status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="text-sm font-medium">Device Type</span>
              </div>
              <Badge variant={deviceInfo.isMobile ? 'default' : 'outline'}>
                {deviceInfo.isMobile ? 'Mobile' : 'Desktop'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Battery className="h-4 w-4" />
                <span className="text-sm font-medium">Memory</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{deviceInfo.deviceMemory}GB</span>
                <Badge className={memoryStatus.color}>
                  {memoryStatus.label}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <span className="text-sm font-medium">Connection</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium uppercase">{deviceInfo.connectionType}</span>
                <Badge className={connectionQuality.color}>
                  {connectionQuality.label}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">PWA Status</span>
              </div>
              <Badge variant={deviceInfo.isStandalone ? 'default' : 'outline'}>
                {deviceInfo.isStandalone ? 'Installed' : 'Browser'}
              </Badge>
            </div>
          </div>

          {/* PWA Install Button */}
          {deviceInfo.canInstall && (
            <div className="mt-4 pt-4 border-t">
              <Button onClick={installPWA} className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Install as PWA for Better Performance
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Touch Latency</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">
                  {touchLatency !== null ? `${touchLatency.toFixed(2)}ms` : 'N/A'}
                </span>
                <Button onClick={measureTouchLatency} size="sm" variant="outline">
                  Test
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Loaded Modules</span>
              <div className="text-xl font-bold">{loadedModules.length}</div>
              <p className="text-xs text-gray-600">Dynamic imports</p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Optimization Score</span>
              <div className="text-xl font-bold">
                {performanceMonitor.getPerformanceScore()}
              </div>
              <Progress value={performanceMonitor.getPerformanceScore()} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Optimization Settings
              </CardTitle>
              <CardDescription>
                Configure mobile-specific performance optimizations
              </CardDescription>
            </div>
            <Button 
              onClick={runFullOptimization}
              disabled={isOptimizing}
              className="ml-4"
            >
              {isOptimizing ? 'Optimizing...' : 'Apply All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Data Saver Mode</div>
                <div className="text-xs text-gray-600">
                  Reduce data usage by optimizing images and disabling animations
                </div>
              </div>
              <Switch
                checked={settings.dataSaverMode}
                onCheckedChange={(checked) => handleSettingChange('dataSaverMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Reduced Animations</div>
                <div className="text-xs text-gray-600">
                  Minimize animations for better performance on low-end devices
                </div>
              </div>
              <Switch
                checked={settings.reducedAnimations}
                onCheckedChange={(checked) => handleSettingChange('reducedAnimations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Lazy Load Images</div>
                <div className="text-xs text-gray-600">
                  Load images only when they're about to be visible
                </div>
              </div>
              <Switch
                checked={settings.lazyLoadImages}
                onCheckedChange={(checked) => handleSettingChange('lazyLoadImages', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Preload Critical Resources</div>
                <div className="text-xs text-gray-600">
                  Preload essential resources for faster initial load
                </div>
              </div>
              <Switch
                checked={settings.preloadCriticalResources}
                onCheckedChange={(checked) => handleSettingChange('preloadCriticalResources', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Optimize Touch Interactions</div>
                <div className="text-xs text-gray-600">
                  Improve touch responsiveness and reduce input delay
                </div>
              </div>
              <Switch
                checked={settings.optimizeTouchInteractions}
                onCheckedChange={(checked) => handleSettingChange('optimizeTouchInteractions', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Recommendations</CardTitle>
            <CardDescription>
              Suggestions based on your device capabilities and current settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <Zap className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-800">{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Loading Information */}
      {loadedModules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dynamic Module Loading</CardTitle>
            <CardDescription>
              Modules loaded on-demand to optimize bundle size
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loadedModules.map((module, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{module}</span>
                  <Badge variant="outline">Loaded</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}