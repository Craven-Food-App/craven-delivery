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
    // Track component load time
    const loadTime = Date.now() - startTime.current;
    
    // Track memory usage if available
    const memoryUsage = (performance as any).memory ? 
      (performance as any).memory.usedJSHeapSize : 0;

    // Track render time
    const renderTime = Date.now() - renderStartTime.current;

    // Log performance metrics
    const metrics: PerformanceMetrics = {
      loadTime,
      renderTime,
      memoryUsage,
      networkLatency: 0 // Would be measured from API calls
    };

    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to analytics
      console.log(`Performance metrics for ${componentName}:`, metrics);
    }

    // Track long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn(`Long task detected in ${componentName}:`, {
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      
      return () => observer.disconnect();
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
