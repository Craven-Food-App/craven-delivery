import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
}

export const usePerformanceMonitoring = (componentName: string) => {
  const startTime = useRef<number>(Date.now());
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    try {
      // Track component load time
      const loadTime = Date.now() - startTime.current;
      const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
      const memoryUsage = perf?.memory?.usedJSHeapSize ?? 0;
      const renderTime = Date.now() - renderStartTime.current;

      const metrics: PerformanceMetrics = {
        loadTime,
        renderTime,
        memoryUsage,
        networkLatency: 0
      };

      if (process.env.NODE_ENV === 'production') {
        console.log(`Performance metrics for ${componentName}:`, metrics);
      }

      // longtask is not supported in all WebViews (e.g. Android) - guard to avoid throw
      if (typeof PerformanceObserver !== 'undefined') {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) {
                console.warn(`Long task in ${componentName}:`, entry.duration);
              }
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
          return () => observer.disconnect();
        } catch {
          // longtask unsupported in this environment
        }
      }
    } catch (e) {
      console.warn('usePerformanceMonitoring:', e);
    }
  }, [componentName]);

  // Track render start
  renderStartTime.current = Date.now();

  return {
    trackApiCall: (apiName: string, startTime: number, endTime: number) => {
      const duration = endTime - startTime;
      console.log(`API call ${apiName} took ${duration}ms`);
      
      if (duration > 1000) { // API calls longer than 1 second
        console.warn(`Slow API call detected: ${apiName} took ${duration}ms`);
      }
    },
    
    trackUserAction: (action: string, startTime: number, endTime: number) => {
      const duration = endTime - startTime;
      console.log(`User action ${action} took ${duration}ms`);
    }
  };
};
