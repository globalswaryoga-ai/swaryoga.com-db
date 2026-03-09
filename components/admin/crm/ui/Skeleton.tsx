'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  /** Number of lines to render */
  lines?: number;
}

/** Reusable skeleton placeholder for loading states */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
  );
}

/** Card-shaped skeleton */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      <Skeleton className="h-10 w-10 rounded-xl mb-4" />
      <Skeleton className="h-6 w-20 rounded mb-2" />
      <Skeleton className="h-4 w-32 rounded" />
    </div>
  );
}

/** Table row skeleton */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 rounded ${i === 0 ? 'w-8' : i === 1 ? 'w-40' : 'w-24 flex-1'}`}
        />
      ))}
    </div>
  );
}

/** Full table skeleton */
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-3 rounded ${i === 0 ? 'w-8' : 'w-20 flex-1'}`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}

/** Page-level skeleton: header + stat cards + table */
export function SkeletonPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* Table */}
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
