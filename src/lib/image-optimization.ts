// Image optimization utilities for mobile and PWA

interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  devicePixelRatio?: number;
}

interface ResponsiveImageConfig {
  src: string;
  alt: string;
  sizes: string;
  srcSet: string;
  placeholder?: string;
  loading?: 'lazy' | 'eager';
}

export class ImageOptimizer {
  private static readonly SUPPORTED_FORMATS = ['webp', 'avif', 'jpeg', 'png'];
  private static readonly DEFAULT_QUALITY = 80;
  private static readonly BREAKPOINTS = {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    large: 1440
  };

  // Check browser support for modern image formats
  public static async checkFormatSupport(): Promise<Record<string, boolean>> {
    const support: Record<string, boolean> = {};

    // Check WebP support
    support.webp = await this.canUseFormat('webp');
    
    // Check AVIF support
    support.avif = await this.canUseFormat('avif');
    
    // JPEG and PNG are universally supported
    support.jpeg = true;
    support.png = true;

    return support;
  }

  private static canUseFormat(format: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width === 1 && img.height === 1);
      img.onerror = () => resolve(false);
      
      // Test images for format detection
      const testImages: Record<string, string> = {
        webp: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
        avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='
      };
      
      img.src = testImages[format] || '';
    });
  }

  // Generate responsive image configuration
  public static generateResponsiveConfig(
    baseSrc: string,
    alt: string,
    options: ImageOptimizationOptions = {}
  ): ResponsiveImageConfig {
    const { quality = this.DEFAULT_QUALITY, format = 'webp' } = options;
    
    // Generate srcSet for different screen densities and sizes
    const srcSet = this.generateSrcSet(baseSrc, {
      quality,
      format,
      ...options
    });

    // Generate sizes attribute for responsive images
    const sizes = this.generateSizes(options.width);

    // Generate placeholder (low quality image placeholder)
    const placeholder = this.generatePlaceholder(baseSrc);

    return {
      src: this.optimizeImageUrl(baseSrc, { quality, format, ...options }),
      alt,
      sizes,
      srcSet,
      placeholder,
      loading: 'lazy'
    };
  }

  private static generateSrcSet(baseSrc: string, options: ImageOptimizationOptions): string {
    const densities = [1, 1.5, 2, 3]; // 1x, 1.5x, 2x, 3x pixel densities
    const breakpoints = Object.values(this.BREAKPOINTS);
    
    const srcSetEntries: string[] = [];

    // Generate entries for different breakpoints
    breakpoints.forEach(width => {
      densities.forEach(density => {
        const actualWidth = Math.round(width * density);
        const optimizedUrl = this.optimizeImageUrl(baseSrc, {
          ...options,
          width: actualWidth,
          devicePixelRatio: density
        });
        srcSetEntries.push(`${optimizedUrl} ${actualWidth}w`);
      });
    });

    return srcSetEntries.join(', ');
  }

  private static generateSizes(maxWidth?: number): string {
    if (maxWidth) {
      return `(max-width: ${this.BREAKPOINTS.mobile}px) 100vw, ` +
             `(max-width: ${this.BREAKPOINTS.tablet}px) 50vw, ` +
             `(max-width: ${this.BREAKPOINTS.desktop}px) 33vw, ` +
             `${maxWidth}px`;
    }

    return `(max-width: ${this.BREAKPOINTS.mobile}px) 100vw, ` +
           `(max-width: ${this.BREAKPOINTS.tablet}px) 50vw, ` +
           `(max-width: ${this.BREAKPOINTS.desktop}px) 33vw, ` +
           `25vw`;
  }

  private static generatePlaceholder(baseSrc: string): string {
    // Generate a low-quality placeholder (10% quality, small size)
    return this.optimizeImageUrl(baseSrc, {
      quality: 10,
      width: 40,
      format: 'jpeg'
    });
  }

  // Optimize image URL (this would integrate with your image optimization service)
  private static optimizeImageUrl(src: string, options: ImageOptimizationOptions): string {
    // If using a service like Cloudinary, Imgix, or similar
    // This is a placeholder implementation
    
    const params = new URLSearchParams();
    
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);
    
    // For local images, you might use a service worker or API endpoint
    if (src.startsWith('/') || src.startsWith('./')) {
      const queryString = params.toString();
      return queryString ? `${src}?${queryString}` : src;
    }
    
    return src;
  }

  // Preload critical images
  public static preloadImage(src: string, options: ImageOptimizationOptions = {}): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = this.optimizeImageUrl(src, options);
    
    // Add responsive preloading
    if (options.width) {
      link.media = `(max-width: ${options.width}px)`;
    }
    
    document.head.appendChild(link);
  }

  // Preload images for the next page/route
  public static preloadRouteImages(images: string[]): void {
    images.forEach(src => {
      this.preloadImage(src, { quality: 80, format: 'webp' });
    });
  }

  // Convert image to WebP format (client-side)
  public static async convertToWebP(
    imageFile: File,
    quality: number = 0.8
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(resolve, 'image/webp', quality);
        } else {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(imageFile);
    });
  }

  // Compress image for upload
  public static async compressImage(
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          // Use better image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(resolve, 'image/jpeg', quality);
        } else {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  // Get optimal image format for current browser
  public static async getOptimalFormat(): Promise<string> {
    const support = await this.checkFormatSupport();
    
    if (support.avif) return 'avif';
    if (support.webp) return 'webp';
    return 'jpeg';
  }

  // Calculate image loading priority
  public static getLoadingPriority(
    element: HTMLElement,
    viewport: { width: number; height: number }
  ): 'high' | 'low' | 'auto' {
    const rect = element.getBoundingClientRect();
    const isAboveFold = rect.top < viewport.height;
    const isLargeImage = rect.width > 300 || rect.height > 300;
    
    if (isAboveFold && isLargeImage) return 'high';
    if (isAboveFold) return 'auto';
    return 'low';
  }

  // Monitor image loading performance
  public static monitorImagePerformance(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.name.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
            const loadTime = entry.responseEnd - entry.startTime;
            const size = entry.transferSize || 0;
            
            console.log(`Image loaded: ${entry.name.split('/').pop()}`);
            console.log(`  Size: ${Math.round(size / 1024)}KB`);
            console.log(`  Load time: ${loadTime.toFixed(2)}ms`);
            
            // Log slow loading images
            if (loadTime > 1000) {
              console.warn(`Slow image load: ${entry.name} (${loadTime.toFixed(2)}ms)`);
            }
            
            // Log large images
            if (size > 500000) { // 500KB
              console.warn(`Large image: ${entry.name} (${Math.round(size / 1024)}KB)`);
            }
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
    }
  }
}

// Auto-initialize image performance monitoring
if (typeof window !== 'undefined') {
  ImageOptimizer.monitorImagePerformance();
}

// Utility function for React components
import { useState, useEffect } from 'react';

export function useOptimizedImage(src: string, alt: string, options: ImageOptimizationOptions = {}) {
  const [config, setConfig] = useState<ResponsiveImageConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateConfig = async () => {
      setIsLoading(true);
      const optimizedConfig = ImageOptimizer.generateResponsiveConfig(src, alt, options);
      setConfig(optimizedConfig);
      setIsLoading(false);
    };

    generateConfig();
  }, [src, alt, options]);

  return { config, isLoading };
}

export { ImageOptimizer };