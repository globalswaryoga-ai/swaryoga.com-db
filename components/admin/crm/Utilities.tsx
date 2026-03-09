'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses = {
  success: 'bg-green-100 text-green-800 border-green-300',
  danger: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-yellow-300 text-black border-yellow-500',
  info: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  default: 'bg-slate-100 text-slate-700 border-slate-300',
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
  color?: 'purple' | 'blue' | 'green' | 'red' | 'yellow' | 'teal' | 'orange' | 'pink' | 'indigo' | 'slate';
  className?: string;
}) {
  const colorClasses = {
    purple: 'from-[#0f3a4d]/30 via-[#E8A645]/10 to-[#F5EBE0]/20 border-[#E8A645]/50',
    blue: 'from-[#0f3a4d]/35 via-[#E8A645]/15 to-[#F5EBE0]/25 border-[#E8A645]/50',
    green: 'from-[#0f3a4d]/30 via-[#E8A645]/10 to-[#F5EBE0]/20 border-emerald-500/50',
    red: 'from-[#0f3a4d]/30 via-rose-900/15 to-[#F5EBE0]/20 border-rose-500/50',
    yellow: 'from-[#0f3a4d]/30 via-amber-900/15 to-[#F5EBE0]/20 border-amber-500/50',
    teal: 'from-[#0f3a4d]/35 via-[#E8A645]/10 to-[#F5EBE0]/20 border-[#E8A645]/50',
    orange: 'from-[#0f3a4d]/30 via-[#E8A645]/15 to-[#F5EBE0]/25 border-[#E8A645]/60',
    pink: 'from-[#0f3a4d]/30 via-pink-900/15 to-[#F5EBE0]/20 border-pink-400/50',
    indigo: 'from-[#0f3a4d]/35 via-[#E8A645]/10 to-[#F5EBE0]/25 border-[#E8A645]/50',
    slate: 'from-[#F5EBE0]/60 via-[#E8DFD5]/40 to-[#F5EBE0]/50 border-[#E8DFD5]/60',
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
        border rounded-xl p-6 space-y-2 shadow-sm
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[#0f3a4d] text-sm font-semibold tracking-wide">{label}</h3>
        {icon && (
          <div className="text-2xl drop-shadow" aria-hidden>
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-extrabold text-[#0f3a4d] drop-shadow-sm">{value}</p>
        {subtitle && <p className="text-xs text-[#0f3a4d]/70">{subtitle}</p>}
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
    info: 'bg-indigo-900/20 border-indigo-700 text-indigo-400',
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
