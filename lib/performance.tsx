'use client';

import NextImage from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Performance optimized image component with lazy loading
 * Uses Next.js Image component for automatic optimization
 */

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className = '',
  objectFit = 'cover',
  placeholder = 'empty',
  blurDataURL,
  onLoad,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative ${fill ? 'w-full h-full' : ''} ${className}`}>
      <NextImage
        src={src}
        alt={alt}
        width={width || (fill ? undefined : 400)}
        height={height || (fill ? undefined : 300)}
        fill={fill}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={`
          transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          ${objectFit === 'cover' ? 'object-cover' : ''}
          ${objectFit === 'contain' ? 'object-contain' : ''}
          ${objectFit === 'fill' ? 'object-fill' : ''}
          ${objectFit === 'scale-down' ? 'object-scale-down' : ''}
        `}
        onLoad={() => {
          setIsLoading(false);
          onLoad?.();
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-slate-700 animate-pulse" />
      )}
    </div>
  );
}

/**
 * Lazy load component for below-the-fold content
 * Only loads content when it comes into view
 */
interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  threshold?: number;
}

export function LazyLoad({
  children,
  fallback,
  className = '',
  threshold = 0.1,
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
}

/**
 * Virtual scroller for rendering large lists efficiently
 * Only renders visible items to improve performance
 */
interface VirtualListProps {
  items: any[];
  itemHeight: number;
  renderItem: (item: any, index: number) => ReactNode;
  containerHeight?: number;
  className?: string;
}

export function VirtualList({
  items,
  itemHeight,
  renderItem,
  containerHeight = 400,
  className = '',
}: VirtualListProps) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 1);
  const endIndex = Math.min(items.length, startIndex + visibleRange + 1);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      className={`overflow-y-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, idx) => (
            <div key={startIndex + idx} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + idx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Code splitting utility - lazy load components
 */
export async function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    img.src = src;
    img.onload = () => resolve();
    img.onerror = reject;
  });
}

/**
 * Performance monitoring helper
 */
export function reportWebVitals(metric: {
  name: string;
  value: number;
  id: string;
  label: string;
}) {
  if (typeof window !== 'undefined') {
    // Send to analytics if available
    console.log(`[Performance] ${metric.name}: ${metric.value}ms`);
  }
}

/**
 * Cache helper for API responses
 */
const cache = new Map<string, { data: any; timestamp: number }>();

export function getCachedData<T>(key: string, maxAge = 5 * 60 * 1000): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > maxAge) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

export function setCachedData<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}
