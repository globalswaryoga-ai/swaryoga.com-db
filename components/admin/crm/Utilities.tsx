'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses = {
  success: 'bg-green-900/30 text-green-400 border-green-700',
  danger: 'bg-red-900/30 text-red-400 border-red-700',
  warning: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
  info: 'bg-blue-900/30 text-blue-400 border-blue-700',
  default: 'bg-slate-700 text-slate-200 border-slate-600',
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
};

/**
 * StatusBadge - Display status with color coding
 *
 * @example
 * <StatusBadge status="Active" variant="success" />
 * <StatusBadge status="Pending" variant="warning" />
 * <StatusBadge status="Inactive" variant="danger" />
 */
export function StatusBadge({
  status,
  variant = 'default',
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  // Auto-detect variant from status text if not specified
  let autoVariant = variant;
  if (variant === 'default') {
    if (status.toLowerCase().includes('active') || status.toLowerCase().includes('approved')) {
      autoVariant = 'success';
    } else if (status.toLowerCase().includes('inactive') || status.toLowerCase().includes('rejected')) {
      autoVariant = 'danger';
    } else if (status.toLowerCase().includes('pending') || status.toLowerCase().includes('draft')) {
      autoVariant = 'warning';
    } else if (status.toLowerCase().includes('sent') || status.toLowerCase().includes('completed')) {
      autoVariant = 'success';
    } else if (status.toLowerCase().includes('failed') || status.toLowerCase().includes('error')) {
      autoVariant = 'danger';
    }
  }

  return (
    <span
      className={`
        inline-block border rounded-full font-medium
        ${sizeClasses[size]}
        ${variantClasses[autoVariant]}
        ${className}
      `}
    >
      {status}
    </span>
  );
}

/**
 * StatCard - Display a stat with label, value, and optional trend
 */
export function StatCard({
  label: label,
  value,
  subtitle,
  trend,
  trendDirection,
  icon,
  color = 'purple',
  className = '',
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: string | number;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: 'purple' | 'blue' | 'green' | 'red' | 'yellow';
  className?: string;
}) {
  const colorClasses = {
    purple: 'from-purple-900/20 to-purple-800/10 border-purple-700',
    blue: 'from-blue-900/20 to-blue-800/10 border-blue-700',
    green: 'from-green-900/20 to-green-800/10 border-green-700',
    red: 'from-red-900/20 to-red-800/10 border-red-700',
    yellow: 'from-yellow-900/20 to-yellow-800/10 border-yellow-700',
  };

  const trendColor = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-slate-400',
  };

  return (
    <div
      className={`
        bg-gradient-to-br ${colorClasses[color]}
        border rounded-lg p-6 space-y-2
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-slate-400 text-sm font-medium">{label}</h3>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      {trend && (
        <div className={`text-sm font-medium ${trendColor[trendDirection || 'neutral']}`}>
          {trendDirection === 'up' && '↑ '}
          {trendDirection === 'down' && '↓ '}
          {trend}
        </div>
      )}
    </div>
  );
}

/**
 * AlertBox - Display alert/notification
 */
export function AlertBox({
  message,
  type = 'info',
  onClose,
  className = '',
}: {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
  className?: string;
}) {
  const typeClasses = {
    success: 'bg-green-900/20 border-green-700 text-green-400',
    error: 'bg-red-900/20 border-red-700 text-red-400',
    warning: 'bg-yellow-900/20 border-yellow-700 text-yellow-400',
    info: 'bg-blue-900/20 border-blue-700 text-blue-400',
  };

  return (
    <div
      className={`
        border rounded-lg p-4 flex items-center justify-between
        ${typeClasses[type]}
        ${className}
      `}
    >
      <p>{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current hover:opacity-70 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * LoadingSpinner - Display loading indicator
 */
export function LoadingSpinner({
  size = 'md',
  message,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`
          ${sizeMap[size]} border-2 border-slate-700 border-t-purple-500
          rounded-full animate-spin
        `}
      />
      {message && <p className="text-slate-400">{message}</p>}
    </div>
  );
}

/**
 * EmptyState - Display when no data
 */
export function EmptyState({
  icon,
  title,
  message,
  action,
  className = '',
}: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 gap-4 ${className}`}>
      {icon && <div className="text-4xl opacity-50">{icon}</div>}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {message && <p className="text-slate-400 mt-1">{message}</p>}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
