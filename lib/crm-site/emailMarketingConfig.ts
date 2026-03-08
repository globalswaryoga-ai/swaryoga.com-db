/**
 * Email Marketing Configuration
 * Phase 5: Campaign management, templates, tracking
 */

// ============ CAMPAIGN TYPES ============
export const CAMPAIGN_TYPES = {
  broadcast: {
    id: 'broadcast',
    name: 'Broadcast',
    description: 'Send to all selected leads at once',
    icon: 'Send',
  },
  drip: {
    id: 'drip',
    name: 'Drip Campaign',
    description: 'Automated sequence of emails over time',
    icon: 'Droplets',
  },
  scheduled: {
    id: 'scheduled',
    name: 'Scheduled',
    description: 'Send at a specific date and time',
    icon: 'Calendar',
  },
  triggered: {
    id: 'triggered',
    name: 'Triggered',
    description: 'Send when workflow condition is met',
    icon: 'Zap',
  },
} as const;

// ============ CAMPAIGN STATUS ============
export const CAMPAIGN_STATUS = {
  draft: { id: 'draft', label: 'Draft', color: 'gray' },
  scheduled: { id: 'scheduled', label: 'Scheduled', color: 'blue' },
  sending: { id: 'sending', label: 'Sending', color: 'yellow' },
  sent: { id: 'sent', label: 'Sent', color: 'green' },
  paused: { id: 'paused', label: 'Paused', color: 'orange' },
  cancelled: { id: 'cancelled', label: 'Cancelled', color: 'red' },
} as const;

// ============ EMAIL TEMPLATES ============
export const DEFAULT_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'onboarding',
    subject: 'Welcome to {{company_name}}!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a2e;">Welcome, {{lead_name}}! 👋</h1>
  <p>Thank you for joining us. We're excited to have you on board!</p>
  <p>Here's what you can expect:</p>
  <ul>
    <li>Personalized support</li>
    <li>Regular updates</li>
    <li>Exclusive offers</li>
  </ul>
  <p>If you have any questions, feel free to reply to this email.</p>
  <p>Best regards,<br>{{company_name}} Team</p>
</div>`,
  },
  {
    id: 'follow_up',
    name: 'Follow Up',
    category: 'sales',
    subject: 'Quick follow-up - {{company_name}}',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Hi {{lead_name}},</p>
  <p>I wanted to follow up on our recent conversation.</p>
  <p>Is there anything I can help you with or any questions I can answer?</p>
  <p>Looking forward to hearing from you!</p>
  <p>Best regards,<br>{{sender_name}}</p>
</div>`,
  },
  {
    id: 'promotion',
    name: 'Promotional Offer',
    category: 'marketing',
    subject: '🎉 Special Offer Just for You!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #e63946; text-align: center;">Special Offer!</h1>
  <p style="text-align: center; font-size: 18px;">Hi {{lead_name}},</p>
  <p style="text-align: center;">We have an exclusive offer just for you!</p>
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
    <p style="font-size: 24px; font-weight: bold; color: #2d3436; margin: 0;">{{offer_details}}</p>
  </div>
  <p style="text-align: center;">
    <a href="{{cta_link}}" style="background: #e63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">{{cta_text}}</a>
  </p>
  <p style="text-align: center; color: #666; font-size: 12px;">Offer valid until {{expiry_date}}</p>
</div>`,
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    category: 'content',
    subject: '📬 Your Weekly Update from {{company_name}}',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a2e; border-bottom: 2px solid #e63946; padding-bottom: 10px;">Weekly Newsletter</h1>
  <p>Hi {{lead_name}},</p>
  <p>Here's what's new this week:</p>
  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <h3 style="margin-top: 0;">📰 Latest News</h3>
    <p>{{news_content}}</p>
  </div>
  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
    <h3 style="margin-top: 0;">💡 Tips & Tricks</h3>
    <p>{{tips_content}}</p>
  </div>
  <p>Stay tuned for more updates!</p>
  <p>Best,<br>{{company_name}} Team</p>
</div>`,
  },
  {
    id: 'reminder',
    name: 'Event Reminder',
    category: 'notifications',
    subject: '⏰ Reminder: {{event_name}}',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1a1a2e;">Reminder</h1>
  <p>Hi {{lead_name}},</p>
  <p>This is a friendly reminder about:</p>
  <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; border-left: 4px solid #0077b6; margin: 15px 0;">
    <h2 style="margin: 0 0 10px 0; color: #0077b6;">{{event_name}}</h2>
    <p style="margin: 5px 0;"><strong>Date:</strong> {{event_date}}</p>
    <p style="margin: 5px 0;"><strong>Time:</strong> {{event_time}}</p>
  </div>
  <p>We look forward to seeing you there!</p>
  <p>Best regards,<br>{{company_name}}</p>
</div>`,
  },
  {
    id: 'blank',
    name: 'Blank Template',
    category: 'custom',
    subject: '',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Hi {{lead_name}},</p>
  <p></p>
  <p>Best regards,<br>{{sender_name}}</p>
</div>`,
  },
];

// ============ TEMPLATE CATEGORIES ============
export const TEMPLATE_CATEGORIES = [
  { id: 'onboarding', name: 'Onboarding', icon: 'UserPlus' },
  { id: 'sales', name: 'Sales', icon: 'TrendingUp' },
  { id: 'marketing', name: 'Marketing', icon: 'Megaphone' },
  { id: 'content', name: 'Content', icon: 'FileText' },
  { id: 'notifications', name: 'Notifications', icon: 'Bell' },
  { id: 'custom', name: 'Custom', icon: 'Edit' },
];

// ============ VARIABLE PLACEHOLDERS ============
export const EMAIL_VARIABLES = [
  { key: '{{lead_name}}', description: 'Lead\'s full name' },
  { key: '{{lead_email}}', description: 'Lead\'s email address' },
  { key: '{{lead_phone}}', description: 'Lead\'s phone number' },
  { key: '{{lead_first_name}}', description: 'Lead\'s first name' },
  { key: '{{company_name}}', description: 'Your company name' },
  { key: '{{sender_name}}', description: 'Sender\'s name' },
  { key: '{{sender_email}}', description: 'Sender\'s email' },
  { key: '{{date}}', description: 'Current date' },
  { key: '{{unsubscribe_link}}', description: 'Unsubscribe link' },
];

// ============ PLAN LIMITS ============
export const EMAIL_LIMITS: Record<string, { 
  monthlyEmails: number; 
  campaigns: number;
  templates: number;
  tracking: boolean;
  scheduling: boolean;
  drip: boolean;
}> = {
  free: { 
    monthlyEmails: 100, 
    campaigns: 2, 
    templates: 3,
    tracking: false,
    scheduling: false,
    drip: false,
  },
  basic: { 
    monthlyEmails: 1000, 
    campaigns: 10, 
    templates: 10,
    tracking: true,
    scheduling: true,
    drip: false,
  },
  starter: { 
    monthlyEmails: 5000, 
    campaigns: 25, 
    templates: 25,
    tracking: true,
    scheduling: true,
    drip: true,
  },
  growth: { 
    monthlyEmails: 25000, 
    campaigns: 100, 
    templates: 100,
    tracking: true,
    scheduling: true,
    drip: true,
  },
  professional: { 
    monthlyEmails: 100000, 
    campaigns: 999, 
    templates: 999,
    tracking: true,
    scheduling: true,
    drip: true,
  },
};

// ============ INTERFACES ============
export interface EmailTemplate {
  _id?: string;
  id: string;
  tenantSlug: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  previewText?: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EmailCampaign {
  _id?: string;
  id: string;
  tenantSlug: string;
  name: string;
  type: keyof typeof CAMPAIGN_TYPES;
  status: keyof typeof CAMPAIGN_STATUS;
  templateId?: string;
  subject: string;
  body: string;
  previewText?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  
  // Targeting
  targetAudience: {
    type: 'all' | 'filtered' | 'list';
    filters?: {
      status?: string[];
      tags?: string[];
      source?: string[];
      assignedTo?: string[];
    };
    leadIds?: string[];
  };
  
  // Scheduling
  scheduledAt?: Date;
  sentAt?: Date;
  
  // Drip settings (for drip campaigns)
  dripSettings?: {
    steps: {
      id: string;
      delayDays: number;
      subject: string;
      body: string;
    }[];
  };
  
  // Stats
  stats: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EmailEvent {
  _id?: string;
  campaignId: string;
  tenantSlug: string;
  leadId: string;
  email: string;
  event: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  link?: string; // for click events
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

// ============ HELPER FUNCTIONS ============
export function replaceEmailVariables(
  content: string, 
  lead: Record<string, any>,
  tenant: Record<string, any>,
  sender: Record<string, any>
): string {
  return content
    .replace(/\{\{lead_name\}\}/gi, lead.name || '')
    .replace(/\{\{lead_email\}\}/gi, lead.email || '')
    .replace(/\{\{lead_phone\}\}/gi, lead.phone || '')
    .replace(/\{\{lead_first_name\}\}/gi, (lead.name || '').split(' ')[0] || '')
    .replace(/\{\{company_name\}\}/gi, tenant.name || tenant.companyName || '')
    .replace(/\{\{sender_name\}\}/gi, sender.name || '')
    .replace(/\{\{sender_email\}\}/gi, sender.email || '')
    .replace(/\{\{date\}\}/gi, new Date().toLocaleDateString())
    .replace(/\{\{unsubscribe_link\}\}/gi, `{{UNSUBSCRIBE_URL}}`); // Will be replaced during send
}

export function generateTrackingPixel(campaignId: string, leadId: string, baseUrl: string): string {
  const trackingUrl = `${baseUrl}/api/crm-site/email/track?c=${campaignId}&l=${leadId}&e=open`;
  return `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
}

export function wrapLinksForTracking(
  html: string, 
  campaignId: string, 
  leadId: string, 
  baseUrl: string
): string {
  // Replace href links with tracking URLs
  return html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (match, url) => {
      const trackingUrl = `${baseUrl}/api/crm-site/email/track?c=${campaignId}&l=${leadId}&e=click&url=${encodeURIComponent(url)}`;
      return `href="${trackingUrl}"`;
    }
  );
}

export function getMonthlyEmailUsage(emailsSent: number, limit: number): {
  used: number;
  remaining: number;
  percentage: number;
  isOverLimit: boolean;
} {
  return {
    used: emailsSent,
    remaining: Math.max(0, limit - emailsSent),
    percentage: Math.min(100, (emailsSent / limit) * 100),
    isOverLimit: emailsSent >= limit,
  };
}
