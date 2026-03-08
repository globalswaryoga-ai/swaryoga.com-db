// Integrations & Webhooks Configuration for CRM SaaS

export interface Integration {
  id: string;
  tenantId: string;
  provider: string;
  name: string;
  description: string;
  icon: string;
  category: 'communication' | 'marketing' | 'payment' | 'storage' | 'analytics' | 'other';
  
  // Configuration
  config: Record<string, any>;
  credentials: Record<string, string>;
  
  // Status
  isActive: boolean;
  isConnected: boolean;
  lastSync?: Date;
  syncError?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Webhook {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  secret?: string;
  
  // Events
  events: string[];
  
  // Settings
  isActive: boolean;
  retryCount: number;
  retryDelayMs: number;
  timeout: number;
  headers: Record<string, string>;
  
  // Stats
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  lastTriggered?: Date;
  lastStatus?: number;
  lastError?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  tenantId: string;
  event: string;
  payload: any;
  response?: any;
  statusCode?: number;
  duration?: number;
  success: boolean;
  error?: string;
  retryAttempt: number;
  createdAt: Date;
}

// Available integrations catalog
export const INTEGRATION_CATALOG: Omit<Integration, 'id' | 'tenantId' | 'config' | 'credentials' | 'isActive' | 'isConnected' | 'createdAt' | 'updatedAt'>[] = [
  {
    provider: 'google_sheets',
    name: 'Google Sheets',
    description: 'Sync leads and contacts with Google Sheets',
    icon: 'sheets',
    category: 'storage',
  },
  {
    provider: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync events and appointments',
    icon: 'calendar',
    category: 'other',
  },
  {
    provider: 'mailchimp',
    name: 'Mailchimp',
    description: 'Sync contacts to Mailchimp audiences',
    icon: 'mailchimp',
    category: 'marketing',
  },
  {
    provider: 'slack',
    name: 'Slack',
    description: 'Get notifications in Slack channels',
    icon: 'slack',
    category: 'communication',
  },
  {
    provider: 'zoom',
    name: 'Zoom',
    description: 'Schedule and manage Zoom meetings',
    icon: 'zoom',
    category: 'communication',
  },
  {
    provider: 'razorpay',
    name: 'Razorpay',
    description: 'Payment processing with Razorpay',
    icon: 'razorpay',
    category: 'payment',
  },
  {
    provider: 'cashfree',
    name: 'Cashfree',
    description: 'Payment gateway integration',
    icon: 'cashfree',
    category: 'payment',
  },
  {
    provider: 'google_analytics',
    name: 'Google Analytics',
    description: 'Track website and conversion analytics',
    icon: 'analytics',
    category: 'analytics',
  },
  {
    provider: 'facebook_pixel',
    name: 'Facebook Pixel',
    description: 'Track conversions and retarget users',
    icon: 'facebook',
    category: 'analytics',
  },
  {
    provider: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5000+ apps via Zapier',
    icon: 'zapier',
    category: 'other',
  },
];

// Webhook events
export const WEBHOOK_EVENTS = [
  // Lead events
  { id: 'lead.created', name: 'Lead Created', category: 'leads' },
  { id: 'lead.updated', name: 'Lead Updated', category: 'leads' },
  { id: 'lead.deleted', name: 'Lead Deleted', category: 'leads' },
  { id: 'lead.status_changed', name: 'Lead Status Changed', category: 'leads' },
  { id: 'lead.assigned', name: 'Lead Assigned', category: 'leads' },
  
  // Deal events
  { id: 'deal.created', name: 'Deal Created', category: 'deals' },
  { id: 'deal.updated', name: 'Deal Updated', category: 'deals' },
  { id: 'deal.won', name: 'Deal Won', category: 'deals' },
  { id: 'deal.lost', name: 'Deal Lost', category: 'deals' },
  { id: 'deal.stage_changed', name: 'Deal Stage Changed', category: 'deals' },
  
  // Contact events
  { id: 'contact.created', name: 'Contact Created', category: 'contacts' },
  { id: 'contact.updated', name: 'Contact Updated', category: 'contacts' },
  { id: 'contact.deleted', name: 'Contact Deleted', category: 'contacts' },
  
  // Campaign events
  { id: 'campaign.sent', name: 'Campaign Sent', category: 'campaigns' },
  { id: 'email.opened', name: 'Email Opened', category: 'campaigns' },
  { id: 'email.clicked', name: 'Email Link Clicked', category: 'campaigns' },
  { id: 'email.bounced', name: 'Email Bounced', category: 'campaigns' },
  
  // Form events
  { id: 'form.submitted', name: 'Form Submitted', category: 'forms' },
  
  // Ticket events
  { id: 'ticket.created', name: 'Ticket Created', category: 'tickets' },
  { id: 'ticket.updated', name: 'Ticket Updated', category: 'tickets' },
  { id: 'ticket.resolved', name: 'Ticket Resolved', category: 'tickets' },
  
  // Payment events
  { id: 'payment.success', name: 'Payment Success', category: 'payments' },
  { id: 'payment.failed', name: 'Payment Failed', category: 'payments' },
];

// Plan limits for integrations
export const INTEGRATION_LIMITS: Record<string, { 
  maxIntegrations: number; 
  maxWebhooks: number;
  webhookLogs: number;
  allowedProviders: string[];
  customHeaders: boolean;
  retryConfig: boolean;
}> = {
  free: {
    maxIntegrations: 0,
    maxWebhooks: 1,
    webhookLogs: 100,
    allowedProviders: [],
    customHeaders: false,
    retryConfig: false,
  },
  basic: {
    maxIntegrations: 2,
    maxWebhooks: 3,
    webhookLogs: 500,
    allowedProviders: ['google_sheets', 'slack'],
    customHeaders: false,
    retryConfig: false,
  },
  starter: {
    maxIntegrations: 5,
    maxWebhooks: 10,
    webhookLogs: 2000,
    allowedProviders: ['google_sheets', 'google_calendar', 'slack', 'mailchimp', 'zapier'],
    customHeaders: true,
    retryConfig: false,
  },
  growth: {
    maxIntegrations: 15,
    maxWebhooks: 25,
    webhookLogs: 10000,
    allowedProviders: ['google_sheets', 'google_calendar', 'slack', 'mailchimp', 'zoom', 'razorpay', 'cashfree', 'zapier', 'facebook_pixel', 'google_analytics'],
    customHeaders: true,
    retryConfig: true,
  },
  professional: {
    maxIntegrations: 999,
    maxWebhooks: 999,
    webhookLogs: 100000,
    allowedProviders: INTEGRATION_CATALOG.map(i => i.provider),
    customHeaders: true,
    retryConfig: true,
  },
};

// Generate webhook signature
export function generateWebhookSignature(payload: string, secret: string): string {
  const crypto = require('crypto');
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

// Verify webhook signature
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = generateWebhookSignature(payload, secret);
  return signature === expected;
}

// Format webhook event name
export function formatEventName(eventId: string): string {
  const event = WEBHOOK_EVENTS.find(e => e.id === eventId);
  return event?.name || eventId;
}

// Get events by category
export function getEventsByCategory(): Record<string, typeof WEBHOOK_EVENTS> {
  return WEBHOOK_EVENTS.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, typeof WEBHOOK_EVENTS>);
}
