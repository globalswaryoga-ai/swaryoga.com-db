'use client';

import React from 'react';
import {
  calculateChatStatus,
  getChatStatusInfo,
  formatTimeRemaining,
  type ChatStatus,
  type ChatStatusInfo,
} from '@/lib/utils/chatStatus';

export interface ChatStatusBadgeProps {
  /** Last message timestamp */
  lastMessageAt?: Date | string | null;
  /** Manual status override (e.g., 'closed') */
  manualStatus?: ChatStatus;
  /** Show time remaining indicator */
  showTimeRemaining?: boolean;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md';
  /** Interactive - show dropdown on click */
  interactive?: boolean;
  /** Callback when status is changed */
  onStatusChange?: (newStatus: ChatStatus) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ChatStatusBadge
 * 
 * Displays a professional status badge for chat conversations with:
 * - Time-based status calculation (new, open, pending, overdue)
 * - Manual closed status support
 * - Optional time remaining indicator
 * - Optional interactive dropdown for status change
 */
export default function ChatStatusBadge({
  lastMessageAt,
  manualStatus,
  showTimeRemaining = false,
  size = 'sm',
  interactive = false,
  onStatusChange,
  className = '',
}: ChatStatusBadgeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const statusInfo = getChatStatusInfo(lastMessageAt, manualStatus);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const sizeClasses = {
    xs: 'text-[8px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-[10px] px-2 py-1 gap-1',
    md: 'text-xs px-2.5 py-1.5 gap-1.5',
  };

  const iconSizes = {
    xs: 'text-[9px]',
    sm: 'text-[11px]',
    md: 'text-sm',
  };

  const handleStatusSelect = (status: ChatStatus) => {
    setIsOpen(false);
    onStatusChange?.(status);
  };

  const allStatuses: Array<{ status: ChatStatus; info: ChatStatusInfo }> = [
    { status: 'new', info: getChatStatusInfo(null, 'new') },
    { status: 'open', info: getChatStatusInfo(null, 'open') },
    { status: 'pending', info: getChatStatusInfo(null, 'pending') },
    { status: 'overdue', info: getChatStatusInfo(null, 'overdue') },
    { status: 'closed', info: getChatStatusInfo(null, 'closed') },
  ];

  // Manually map status to info for display
  const statusDisplayInfo: Record<ChatStatus, { info: Omit<ChatStatusInfo, 'status' | 'hoursRemaining'> }> = {
    new: {
      info: {
        label: 'New',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        icon: 'ph-sparkle',
        description: 'Fresh (0-5h)',
      },
    },
    open: {
      info: {
        label: 'Open',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: 'ph-envelope-open',
        description: 'Active (5-12h)',
      },
    },
    pending: {
      info: {
        label: 'Pending',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: 'ph-clock',
        description: 'Waiting (12-24h)',
      },
    },
    overdue: {
      info: {
        label: 'Overdue',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: 'ph-warning',
        description: 'Urgent (>24h)',
      },
    },
    closed: {
      info: {
        label: 'Closed',
        color: 'text-slate-600',
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-300',
        icon: 'ph-check-circle',
        description: 'Completed',
      },
    },
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => interactive && setIsOpen(!isOpen)}
        disabled={!interactive}
        className={`
          inline-flex items-center rounded-lg font-bold uppercase tracking-wide border
          transition-all duration-200
          ${sizeClasses[size]}
          ${statusInfo.bgColor}
          ${statusInfo.color}
          ${statusInfo.borderColor}
          ${interactive ? 'cursor-pointer hover:shadow-md hover:scale-105' : 'cursor-default'}
          ${statusInfo.status === 'overdue' ? 'animate-pulse' : ''}
        `}
        title={statusInfo.description}
      >
        <i className={`ph ${statusInfo.icon} ${iconSizes[size]}`}></i>
        <span>{statusInfo.label}</span>
        {interactive && (
          <i className={`ph ph-caret-down ${iconSizes[size]} ml-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
        )}
      </button>

      {/* Time remaining indicator */}
      {showTimeRemaining && statusInfo.hoursRemaining !== undefined && statusInfo.hoursRemaining > 0 && (
        <div className="text-[8px] text-slate-500 mt-0.5 text-center font-medium">
          {formatTimeRemaining(statusInfo.hoursRemaining)}
        </div>
      )}

      {/* Dropdown menu */}
      {interactive && isOpen && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-2.5 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Update Status
          </div>
          {Object.entries(statusDisplayInfo).map(([status, { info }]) => (
            <button
              key={status}
              type="button"
              onClick={() => handleStatusSelect(status as ChatStatus)}
              className={`
                w-full px-2.5 py-2 flex items-center gap-2 text-left transition-colors
                hover:bg-slate-50
                ${statusInfo.status === status ? 'bg-slate-50' : ''}
              `}
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center ${info.bgColor} ${info.color}`}>
                <i className={`ph ${info.icon} text-[11px]`}></i>
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-[11px] font-bold ${info.color}`}>{info.label}</div>
                <div className="text-[9px] text-slate-400">{info.description}</div>
              </div>
              {statusInfo.status === status && (
                <i className="ph ph-check text-emerald-600 text-sm"></i>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline variant for chat list items
 */
export function ChatStatusDot({
  lastMessageAt,
  manualStatus,
  className = '',
}: Pick<ChatStatusBadgeProps, 'lastMessageAt' | 'manualStatus' | 'className'>) {
  const statusInfo = getChatStatusInfo(lastMessageAt, manualStatus);

  const dotColors: Record<ChatStatus, string> = {
    new: 'bg-emerald-500',
    open: 'bg-blue-500',
    pending: 'bg-amber-500',
    overdue: 'bg-red-500',
    closed: 'bg-slate-400',
  };

  return (
    <span
      className={`
        inline-block w-2 h-2 rounded-full
        ${dotColors[statusInfo.status]}
        ${statusInfo.status === 'overdue' ? 'animate-pulse' : ''}
        ${className}
      `}
      title={`${statusInfo.label}: ${statusInfo.description}`}
    />
  );
}

/**
 * Export types for external use
 */
export type { ChatStatus, ChatStatusInfo };
