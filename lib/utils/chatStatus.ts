/**
 * Chat Status Utility
 * 
 * WhatsApp 24-hour window based status calculation:
 * - new: Broadcast/outbound sent, user has NOT replied yet
 * - open: User replied, within 0-12 hours (24h window active)
 * - pending: User replied, 12-23 hours (window closing soon)
 * - overdue: User replied, 23-24 hours (window about to expire)
 * - closed: Admin replied to user (auto-closed after admin sends)
 * 
 * After 24 hours with no admin reply, status resets to 'new' (window expired).
 * Admin can send multiple messages within the 24h window; after sending, status = closed.
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

// Status thresholds in hours (based on last inbound message)
const STATUS_THRESHOLDS = {
  OPEN_MAX: 12,     // 0-12 hours since user reply → open
  PENDING_MAX: 23,  // 12-23 hours since user reply → pending
  OVERDUE_MAX: 24,  // 23-24 hours since user reply → overdue
  // > 24 hours = window expired, back to 'new'
} as const;

/**
 * Calculate chat status based on last inbound (user reply) time and last direction.
 * 
 * @param lastMessageAt - Timestamp of the last message (any direction)
 * @param manualStatus - Manual override (e.g., 'closed')
 * @param lastInboundAt - Timestamp of the last INBOUND (user) message
 * @param lastDirection - Direction of the most recent message ('inbound' | 'outbound')
 */
export function calculateChatStatus(
  lastMessageAt: Date | string | null | undefined,
  manualStatus?: ChatStatus,
  lastInboundAt?: Date | string | null,
  lastDirection?: 'inbound' | 'outbound' | string,
): ChatStatus {
  // Manual closed status takes precedence
  if (manualStatus === 'closed') {
    return 'closed';
  }

  // No messages at all → new
  if (!lastMessageAt) {
    return 'new';
  }

  // If there's no inbound message (user never replied), it's a new/broadcast-only conversation
  if (!lastInboundAt) {
    return 'new';
  }

  const inboundDate = typeof lastInboundAt === 'string'
    ? new Date(lastInboundAt)
    : lastInboundAt;

  const now = new Date();
  const hoursSinceInbound = (now.getTime() - inboundDate.getTime()) / (1000 * 60 * 60);

  // If the 24h window has fully expired, reset to 'new' (no active window)
  if (hoursSinceInbound >= STATUS_THRESHOLDS.OVERDUE_MAX) {
    return 'new';
  }

  // Within the 24h window — classify based on time elapsed
  if (hoursSinceInbound < STATUS_THRESHOLDS.OPEN_MAX) {
    return 'open';     // 0-12 hours
  } else if (hoursSinceInbound < STATUS_THRESHOLDS.PENDING_MAX) {
    return 'pending';  // 12-23 hours
  } else {
    return 'overdue';  // 23-24 hours
  }
}

/**
 * Get detailed status information for display
 */
export function getChatStatusInfo(
  lastMessageAt: Date | string | null | undefined,
  manualStatus?: ChatStatus,
  lastInboundAt?: Date | string | null,
  lastDirection?: 'inbound' | 'outbound' | string,
): ChatStatusInfo {
  const status = calculateChatStatus(lastMessageAt, manualStatus, lastInboundAt, lastDirection);
  
  // Calculate hours remaining for non-closed/non-new statuses
  let hoursRemaining: number | undefined;
  if (lastInboundAt && status !== 'closed' && status !== 'new') {
    const inboundDate = typeof lastInboundAt === 'string'
      ? new Date(lastInboundAt)
      : lastInboundAt;
    const now = new Date();
    const hoursDiff = (now.getTime() - inboundDate.getTime()) / (1000 * 60 * 60);
    
    if (status === 'open') {
      hoursRemaining = Math.max(0, STATUS_THRESHOLDS.OPEN_MAX - hoursDiff);
    } else if (status === 'pending') {
      hoursRemaining = Math.max(0, STATUS_THRESHOLDS.PENDING_MAX - hoursDiff);
    } else if (status === 'overdue') {
      hoursRemaining = Math.max(0, STATUS_THRESHOLDS.OVERDUE_MAX - hoursDiff);
    }
  }

  const statusConfigs: Record<ChatStatus, Omit<ChatStatusInfo, 'status' | 'hoursRemaining'>> = {
    new: {
      label: 'New',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      icon: 'ph-sparkle',
      description: 'Broadcast sent, awaiting user reply',
    },
    open: {
      label: 'Open',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: 'ph-envelope-open',
      description: 'User replied (0-12h window)',
    },
    pending: {
      label: 'Pending',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      icon: 'ph-clock',
      description: 'Window closing (12-23h)',
    },
    overdue: {
      label: 'Overdue',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: 'ph-warning',
      description: 'Window expiring (23-24h)!',
    },
    closed: {
      label: 'Closed',
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-300',
      icon: 'ph-check-circle',
      description: 'Admin replied, chat closed',
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
    open: 3,
    new: 4,
    closed: 5,
  };
  return priorities[status] ?? 99;
}
