/**
 * Chat Status Utility
 * 
 * Time-based chat status calculation for CRM inbox:
 * - new: 0-5 hours since last message
 * - open: 5-12 hours since last message
 * - pending: 12-24 hours since last message
 * - overdue: >24 hours since last message
 * - closed: manually marked as completed by user
 */

export type ChatStatus = 'new' | 'open' | 'pending' | 'overdue' | 'closed';

export interface ChatStatusInfo {
  status: ChatStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
  hoursRemaining?: number;
}

// Status thresholds in hours
const STATUS_THRESHOLDS = {
  NEW_MAX: 5,      // 0-5 hours
  OPEN_MAX: 12,    // 5-12 hours
  PENDING_MAX: 24, // 12-24 hours
  // > 24 hours = overdue
} as const;

/**
 * Calculate chat status based on time elapsed since last message
 * If chatStatus is 'closed', returns 'closed' regardless of time
 */
export function calculateChatStatus(
  lastMessageAt: Date | string | null | undefined,
  manualStatus?: ChatStatus
): ChatStatus {
  // Manual closed status takes precedence
  if (manualStatus === 'closed') {
    return 'closed';
  }

  // No last message means new chat
  if (!lastMessageAt) {
    return 'new';
  }

  const lastMsgDate = typeof lastMessageAt === 'string' 
    ? new Date(lastMessageAt) 
    : lastMessageAt;
  
  const now = new Date();
  const hoursDiff = (now.getTime() - lastMsgDate.getTime()) / (1000 * 60 * 60);

  if (hoursDiff < STATUS_THRESHOLDS.NEW_MAX) {
    return 'new';
  } else if (hoursDiff < STATUS_THRESHOLDS.OPEN_MAX) {
    return 'open';
  } else if (hoursDiff < STATUS_THRESHOLDS.PENDING_MAX) {
    return 'pending';
  } else {
    return 'overdue';
  }
}

/**
 * Get detailed status information for display
 */
export function getChatStatusInfo(
  lastMessageAt: Date | string | null | undefined,
  manualStatus?: ChatStatus
): ChatStatusInfo {
  const status = calculateChatStatus(lastMessageAt, manualStatus);
  
  // Calculate hours remaining for non-overdue statuses
  let hoursRemaining: number | undefined;
  if (lastMessageAt && status !== 'closed' && status !== 'overdue') {
    const lastMsgDate = typeof lastMessageAt === 'string' 
      ? new Date(lastMessageAt) 
      : lastMessageAt;
    const now = new Date();
    const hoursDiff = (now.getTime() - lastMsgDate.getTime()) / (1000 * 60 * 60);
    
    if (status === 'new') {
      hoursRemaining = Math.max(0, STATUS_THRESHOLDS.NEW_MAX - hoursDiff);
    } else if (status === 'open') {
      hoursRemaining = Math.max(0, STATUS_THRESHOLDS.OPEN_MAX - hoursDiff);
    } else if (status === 'pending') {
      hoursRemaining = Math.max(0, STATUS_THRESHOLDS.PENDING_MAX - hoursDiff);
    }
  }

  const statusConfigs: Record<ChatStatus, Omit<ChatStatusInfo, 'status' | 'hoursRemaining'>> = {
    new: {
      label: 'New',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      icon: 'ph-sparkle',
      description: 'Fresh conversation (0-5 hours)',
    },
    open: {
      label: 'Open',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: 'ph-envelope-open',
      description: 'Active conversation (5-12 hours)',
    },
    pending: {
      label: 'Pending',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      icon: 'ph-clock',
      description: 'Awaiting response (12-24 hours)',
    },
    overdue: {
      label: 'Overdue',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: 'ph-warning',
      description: 'Needs attention (>24 hours)',
    },
    closed: {
      label: 'Closed',
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-300',
      icon: 'ph-check-circle',
      description: 'Completed',
    },
  };

  return {
    status,
    ...statusConfigs[status],
    hoursRemaining,
  };
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(hours: number | undefined): string {
  if (hours === undefined || hours <= 0) return '';
  
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m remaining`;
  }
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  if (m === 0) {
    return `${h}h remaining`;
  }
  
  return `${h}h ${m}m remaining`;
}

/**
 * Get all status options for filter/dropdown
 */
export function getChatStatusOptions(): Array<{ value: ChatStatus; label: string; icon: string }> {
  return [
    { value: 'new', label: 'New', icon: 'ph-sparkle' },
    { value: 'open', label: 'Open', icon: 'ph-envelope-open' },
    { value: 'pending', label: 'Pending', icon: 'ph-clock' },
    { value: 'overdue', label: 'Overdue', icon: 'ph-warning' },
    { value: 'closed', label: 'Closed', icon: 'ph-check-circle' },
  ];
}

/**
 * Check if a chat needs urgent attention
 */
export function isUrgent(status: ChatStatus): boolean {
  return status === 'overdue' || status === 'pending';
}

/**
 * Get status priority for sorting (lower = higher priority)
 */
export function getStatusPriority(status: ChatStatus): number {
  const priorities: Record<ChatStatus, number> = {
    overdue: 1,
    pending: 2,
    new: 3,
    open: 4,
    closed: 5,
  };
  return priorities[status] ?? 99;
}
