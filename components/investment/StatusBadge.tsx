/**
 * Status Badge Component
 * Shows investment status with color coding
 */

import React from 'react';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/investment-constants';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
  const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;

  return (
    <span
      className={`
        inline-block px-3 py-1 rounded-full text-sm font-semibold
        ${color}
        ${className}
      `}
    >
      {label}
    </span>
  );
};
