/**
 * Performance Monitoring Setup for Vercel
 * Add this to your page.tsx files to track Web Vitals
 */

export function reportWebVitals(metric: any) {
  if (metric.value < 0) return; // Ignore invalid metrics

  // Send to analytics
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    unit: metric.unit,
    timestamp: new Date().toISOString(),
  });

  // Only send in production
  if (process.env.NODE_ENV === 'production') {
    navigator.sendBeacon('/api/analytics/web-vitals', body);
  }
}

/**
 * Web Vitals Metrics to Monitor:
 * 
 * CLS (Cumulative Layout Shift) - <0.1
 * FID (First Input Delay) - <100ms
 * LCP (Largest Contentful Paint) - <2.5s
 * FCP (First Contentful Paint) - <1.8s
 * TTFB (Time to First Byte) - <600ms
 */

// Usage in page.tsx:
// import { reportWebVitals } from '@/lib/performance';
// export function reportWebVitals(metric: any) {
//   reportWebVitals(metric);
// }
