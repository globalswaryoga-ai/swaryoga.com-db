// Help Desk & Support Tickets Configuration for CRM SaaS

export interface Ticket {
  id: string;
  tenantId: string;
  ticketNumber: string; // e.g., TKT-000123
  
  // Basic info
  subject: string;
  description: string;
  status: 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  
  // People
  customerId?: string; // Lead ID
  customerName: string;
  customerEmail: string;
  assignedTo?: string;
  
  // Tracking
  tags: string[];
  source: 'email' | 'form' | 'chat' | 'phone' | 'manual';
  
  // SLA
  slaDeadline?: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  
  // Messages/replies
  messages: TicketMessage[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketMessage {
  id: string;
  type: 'customer' | 'agent' | 'system';
  content: string;
  attachments?: { name: string; url: string; type: string }[];
  authorId?: string;
  authorName: string;
  isInternal: boolean; // Internal notes
  createdAt: Date;
}

export interface TicketCategory {
  id: string;
  name: string;
  description?: string;
  defaultPriority: string;
  defaultAssignee?: string;
  slaHours?: number;
}

// Default categories
export const DEFAULT_CATEGORIES: TicketCategory[] = [
  { id: 'general', name: 'General Inquiry', defaultPriority: 'medium' },
  { id: 'billing', name: 'Billing & Payments', defaultPriority: 'high', slaHours: 24 },
  { id: 'technical', name: 'Technical Support', defaultPriority: 'high', slaHours: 12 },
  { id: 'feature', name: 'Feature Request', defaultPriority: 'low' },
  { id: 'bug', name: 'Bug Report', defaultPriority: 'high', slaHours: 8 },
  { id: 'sales', name: 'Sales Question', defaultPriority: 'medium', slaHours: 24 },
];

// Priority config
export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'gray', slaMultiplier: 2 },
  medium: { label: 'Medium', color: 'blue', slaMultiplier: 1 },
  high: { label: 'High', color: 'orange', slaMultiplier: 0.5 },
  urgent: { label: 'Urgent', color: 'red', slaMultiplier: 0.25 },
};

// Status config
export const STATUS_CONFIG = {
  open: { label: 'Open', color: 'blue' },
  pending: { label: 'Pending', color: 'yellow' },
  in_progress: { label: 'In Progress', color: 'purple' },
  resolved: { label: 'Resolved', color: 'green' },
  closed: { label: 'Closed', color: 'gray' },
};

// Plan limits
export const HELPDESK_LIMITS: Record<string, { enabled: boolean; maxTickets: number; sla: boolean; automation: boolean; customCategories: boolean; emailChannel: boolean; formChannel: boolean }> = {
  free: {
    enabled: false,
    maxTickets: 0,
    sla: false,
    automation: false,
    customCategories: false,
    emailChannel: false,
    formChannel: false,
  },
  basic: {
    enabled: true,
    maxTickets: 100,
    sla: false,
    automation: false,
    customCategories: false,
    emailChannel: false,
    formChannel: true,
  },
  starter: {
    enabled: true,
    maxTickets: 500,
    sla: true,
    automation: false,
    customCategories: true,
    emailChannel: true,
    formChannel: true,
  },
  growth: {
    enabled: true,
    maxTickets: 5000,
    sla: true,
    automation: true,
    customCategories: true,
    emailChannel: true,
    formChannel: true,
  },
  professional: {
    enabled: true,
    maxTickets: 999999,
    sla: true,
    automation: true,
    customCategories: true,
    emailChannel: true,
    formChannel: true,
  },
};

// Generate ticket number
export function generateTicketNumber(sequence: number): string {
  return `TKT-${sequence.toString().padStart(6, '0')}`;
}

// Calculate SLA deadline
export function calculateSLADeadline(priority: string, category: TicketCategory, createdAt: Date): Date {
  const baseSLA = category.slaHours || 48; // Default 48 hours
  const multiplier = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.slaMultiplier || 1;
  const slaHours = baseSLA * multiplier;
  
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
}

// Check if SLA is breached
export function isSLABreached(ticket: Ticket): boolean {
  if (!ticket.slaDeadline) return false;
  if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
  return new Date() > new Date(ticket.slaDeadline);
}

// Get time until SLA
export function getTimeUntilSLA(ticket: Ticket): string {
  if (!ticket.slaDeadline) return 'No SLA';
  
  const now = new Date();
  const deadline = new Date(ticket.slaDeadline);
  const diff = deadline.getTime() - now.getTime();
  
  if (diff < 0) {
    const hours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
    return `${hours}h overdue`;
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m left`;
  }
  return `${hours}h left`;
}

// Canned responses
export const CANNED_RESPONSES = [
  {
    id: 'greeting',
    name: 'Greeting',
    content: 'Hi {{customer_name}},\n\nThank you for contacting us. We have received your request and will get back to you shortly.\n\nBest regards,\n{{agent_name}}',
  },
  {
    id: 'need_info',
    name: 'Need More Information',
    content: 'Hi {{customer_name}},\n\nThank you for reaching out. To better assist you, could you please provide:\n\n- [Additional details needed]\n\nLooking forward to your response.\n\nBest regards,\n{{agent_name}}',
  },
  {
    id: 'resolved',
    name: 'Issue Resolved',
    content: 'Hi {{customer_name}},\n\nI\'m happy to inform you that your issue has been resolved.\n\nIf you have any further questions, please don\'t hesitate to reach out.\n\nBest regards,\n{{agent_name}}',
  },
  {
    id: 'escalated',
    name: 'Escalated',
    content: 'Hi {{customer_name}},\n\nI have escalated your request to our senior team for further investigation. You will hear back within 24 hours.\n\nThank you for your patience.\n\nBest regards,\n{{agent_name}}',
  },
];
