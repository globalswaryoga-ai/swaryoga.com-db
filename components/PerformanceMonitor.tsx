'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/errorTracking';

/**
 * Initialize performance monitoring on app start
 * Monitors Core Web Vitals and reports issues
 */
export function PerformanceMonitor() {
  useEffect(() => {
    initPerformanceMonitoring();
  }, []);

  return null;
}
