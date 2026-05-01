/**
 * CRM Plan Configuration - Single Source of Truth
 * 
 * All plan tiers, limits, features, modules defined here.
 * Every component/API should import from this file.
 */

// ============================================================================
// PLAN TIERS
// ============================================================================

export type PlanTier = 'free' | 'basic' | 'starter' | 'growth' | 'professional' | 'enterprise';

export const PLAN_ORDER: PlanTier[] = ['free', 'basic', 'starter', 'growth', 'professional', 'enterprise'];

export const PLAN_NAMES: Record<PlanTier, string> = {
  free: 'Free Trial',
  basic: 'Basic',
  starter: 'Copper',
  growth: 'Silver',
  professional: 'Golden',
  enterprise: 'Diamond',
};

// ============================================================================
// PRICING
// ============================================================================

export const PLAN_PRICING: Record<PlanTier, {
  monthly: number | null;
  quarterly: number;
  sixMonth: number;
  annual: number;
  monthlyUSD: number;
}> = {
  free:         { monthly: 0,    quarterly: 0,      sixMonth: 0,       annual: 0,       monthlyUSD: 0 },
  basic:        { monthly: 499,  quarterly: 1350,   sixMonth: 2400,    annual: 4500,    monthlyUSD: 6 },
  starter:      { monthly: 999,  quarterly: 2700,   sixMonth: 4800,    annual: 9000,    monthlyUSD: 12 },
  growth:       { monthly: 1999, quarterly: 5400,   sixMonth: 9500,    annual: 18000,   monthlyUSD: 24 },
  professional: { monthly: 2999, quarterly: 7999,   sixMonth: 14100,   annual: 25999,   monthlyUSD: 36 },
  enterprise:   { monthly: 4999, quarterly: 12999,  sixMonth: 25000,   annual: 45000,   monthlyUSD: 60 },
};

// ============================================================================
// PLAN LIMITS
// ============================================================================

export interface PlanLimits {
  maxLeads: number;
  maxUsers: number;
  maxChatbotFlows: number;
  storageQuotaMB: number;
  maxBroadcastsPerDay: number;
  maxEmailsPerMonth: number;
  maxLandingPages: number;
  maxCommunities: number;
  maxAutomationWorkflows: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxLeads: 100,
    maxUsers: 1,
    maxChatbotFlows: 1,
    storageQuotaMB: 1024,
    maxBroadcastsPerDay: 1,
    maxEmailsPerMonth: 100,
    maxLandingPages: 1,
    maxCommunities: 1,
    maxAutomationWorkflows: 1,
  },
  basic: {        // Basic ₹499 - 1 user
    maxLeads: 1000,
    maxUsers: 1,
    maxChatbotFlows: 5,
    storageQuotaMB: 500,
    maxBroadcastsPerDay: 5,
    maxEmailsPerMonth: 1000,
    maxLandingPages: 3,
    maxCommunities: 2,
    maxAutomationWorkflows: 5,
  },
  starter: {      // Copper ₹999 - 3 users
    maxLeads: 3000,
    maxUsers: 3,
    maxChatbotFlows: 10,
    storageQuotaMB: 1000,
    maxBroadcastsPerDay: 20,
    maxEmailsPerMonth: 5000,
    maxLandingPages: 10,
    maxCommunities: 5,
    maxAutomationWorkflows: 15,
  },
  growth: {       // Silver ₹1999 - 10 users
    maxLeads: 7500,
    maxUsers: 10,
    maxChatbotFlows: 20,
    storageQuotaMB: 5000,
    maxBroadcastsPerDay: 100,
    maxEmailsPerMonth: 25000,
    maxLandingPages: 50,
    maxCommunities: 20,
    maxAutomationWorkflows: 50,
  },
  professional: { // Golden ₹2999 - 25 users
    maxLeads: 999999,
    maxUsers: 25,
    maxChatbotFlows: 9999,
    storageQuotaMB: 20000,
    maxBroadcastsPerDay: 500,
    maxEmailsPerMonth: 100000,
    maxLandingPages: 999,
    maxCommunities: 999,
    maxAutomationWorkflows: 999,
  },
  enterprise: {   // Diamond ₹4999 - 50 users
    maxLeads: 999999,
    maxUsers: 50,
    maxChatbotFlows: 9999,
    storageQuotaMB: 100000,
    maxBroadcastsPerDay: 9999,
    maxEmailsPerMonth: 999999,
    maxLandingPages: 9999,
    maxCommunities: 9999,
    maxAutomationWorkflows: 9999,
  },
};

// ============================================================================
// CRM MODULES (feature flags per plan)
// ============================================================================

export type CrmModule =
  | 'leads'
  | 'whatsapp'
  | 'broadcasting'
  | 'chatbot'
  | 'aiCalls'
  | 'reports'
  | 'community'
  | 'templates'
  | 'callRecording'
  | 'emailMarketing'
  | 'landingPages'
  | 'automation'
  | 'helpdesk'
  | 'api'
  | 'customDomain'
  | 'accounting'
  | 'lifePlanner';

export const PLAN_MODULES: Record<PlanTier, Record<CrmModule, boolean>> = {
  free: {
    leads: true,
    whatsapp: true,        // QR WhatsApp + QR Leads + QR Groups/Contacts
    broadcasting: true,    // QR Broadcast
    chatbot: false,
    aiCalls: false,
    reports: true,         // Dashboard overview
    community: false,
    templates: true,       // For QR templates
    callRecording: false,
    emailMarketing: true,  // Email-1000/month
    landingPages: false,
    automation: false,
    helpdesk: false,
    api: false,
    customDomain: false,
    accounting: true,      // Life Planner - Accounting
    lifePlanner: true,     // Life Planner - Accounting & Goals
  },
  basic: {
    leads: true,
    whatsapp: true,        // QR WhatsApp + QR Leads + QR Groups/Contacts
    broadcasting: true,    // QR Broadcast
    chatbot: false,        // REMOVED
    aiCalls: false,        // REMOVED
    reports: true,         // Dashboard overview
    community: false,
    templates: true,       // For QR templates
    callRecording: false,  // REMOVED
    emailMarketing: true,  // Email-1000/month
    landingPages: false,   // REMOVED
    automation: false,     // REMOVED
    helpdesk: false,       // REMOVED
    api: false,            // REMOVED
    customDomain: false,   // REMOVED
    accounting: true,      // Life Planner - Accounting
    lifePlanner: true,     // Life Planner - Accounting & Goals
  },
  starter: {
    leads: true,
    whatsapp: true,
    broadcasting: true,
    chatbot: true,
    aiCalls: true,
    reports: true,
    community: true,
    templates: true,
    callRecording: true,
    emailMarketing: true,
    landingPages: true,
    automation: true,
    helpdesk: true,
    api: true,
    customDomain: true,
    accounting: true,
    lifePlanner: true,
  },
  growth: {
    leads: true,
    whatsapp: true,
    broadcasting: true,
    chatbot: true,
    aiCalls: true,
    reports: true,
    community: true,
    templates: true,
    callRecording: true,
    emailMarketing: true,
    landingPages: true,
    automation: true,
    helpdesk: true,
    api: true,
    customDomain: true,
    accounting: true,
    lifePlanner: true,
  },
  professional: {
    leads: true,
    whatsapp: true,
    broadcasting: true,
    chatbot: true,
    aiCalls: true,
    reports: true,
    community: true,
    templates: true,
    callRecording: true,
    emailMarketing: true,
    landingPages: true,
    automation: true,
    helpdesk: true,
    api: true,
    customDomain: true,
    accounting: true,
    lifePlanner: true,
  },
  enterprise: {
    leads: true,
    whatsapp: true,
    broadcasting: true,
    chatbot: true,
    aiCalls: true,
    reports: true,
    community: true,
    templates: true,
    callRecording: true,
    emailMarketing: true,
    landingPages: true,
    automation: true,
    helpdesk: true,
    api: true,
    customDomain: true,
    accounting: true,
    lifePlanner: true,
  },
};

// ============================================================================
// FEATURE DISPLAY CONFIGURATION (for UI)
// ============================================================================

export interface PlanFeatureDisplay {
  name: string;
  description: string;
  module: CrmModule;
  icon: string; // lucide icon name
  minimumPlan: PlanTier;
}

export const FEATURE_CATALOG: PlanFeatureDisplay[] = [
  { name: 'Lead Management', description: 'Track and manage your contacts', module: 'leads', icon: 'Users', minimumPlan: 'free' },
  { name: 'Basic Chatbot', description: 'Auto-respond to incoming messages', module: 'chatbot', icon: 'Bot', minimumPlan: 'free' },
  { name: 'WhatsApp API', description: 'Send & receive via Meta Business API', module: 'whatsapp', icon: 'MessageCircle', minimumPlan: 'free' },
  { name: 'Broadcast Messages', description: 'Send bulk WhatsApp campaigns', module: 'broadcasting', icon: 'Megaphone', minimumPlan: 'free' },
  { name: 'Message Templates', description: 'Pre-approved WhatsApp templates', module: 'templates', icon: 'FileText', minimumPlan: 'free' },
  { name: 'Help Desk', description: 'Ticket-based customer support', module: 'helpdesk', icon: 'LifeBuoy', minimumPlan: 'free' },
  { name: 'Reports & Analytics', description: 'Performance dashboards and insights', module: 'reports', icon: 'BarChart3', minimumPlan: 'free' },
  { name: 'Email Marketing', description: 'Email campaigns and drip sequences', module: 'emailMarketing', icon: 'Mail', minimumPlan: 'free' },
  { name: 'Landing Pages', description: 'Build lead capture pages', module: 'landingPages', icon: 'Layout', minimumPlan: 'free' },
  { name: 'AI Voice Calls', description: 'AI-powered outbound calling', module: 'aiCalls', icon: 'Phone', minimumPlan: 'free' },
  { name: 'Community', description: 'Course and community management', module: 'community', icon: 'GraduationCap', minimumPlan: 'free' },
  { name: 'Call Recording', description: 'Record and review calls', module: 'callRecording', icon: 'Mic', minimumPlan: 'free' },
  { name: 'Automation', description: 'Workflow automations and triggers', module: 'automation', icon: 'Workflow', minimumPlan: 'free' },
  { name: 'API Access', description: 'REST API and webhook integrations', module: 'api', icon: 'Code', minimumPlan: 'free' },
  { name: 'Custom Domain', description: 'Use your own domain (₹999 add-on)', module: 'customDomain', icon: 'Globe', minimumPlan: 'free' },
];

// ============================================================================
// PLAN DISPLAY METADATA (colors, labels)
// ============================================================================

export interface PlanDisplayInfo {
  name: string;
  tagline: string;
  color: string;        // Tailwind bg class
  textColor: string;     // Tailwind text class
  borderColor: string;   // Tailwind border class
  gradientFrom: string;  // Gradient start
  gradientTo: string;    // Gradient end
  badge: string;         // Short label
  popular: boolean;      // Show "Popular" badge
}

export const PLAN_DISPLAY: Record<PlanTier, PlanDisplayInfo> = {
  free: {
    name: 'Free',
    tagline: 'Get started with basics',
    color: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    gradientFrom: 'from-gray-400',
    gradientTo: 'to-gray-600',
    badge: 'FREE',
    popular: false,
  },
  basic: {
    name: 'Basic',
    tagline: 'For small businesses',
    color: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-blue-700',
    badge: 'BASIC',
    popular: false,
  },
  starter: {
    name: 'Starter',
    tagline: 'Growing teams',
    color: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-emerald-700',
    badge: 'STARTER',
    popular: false,
  },
  growth: {
    name: 'Growth',
    tagline: 'Scale your business',
    color: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-purple-700',
    badge: 'GROWTH',
    popular: true,
  },
  professional: {
    name: 'Professional',
    tagline: 'Enterprise-grade power',
    color: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-amber-700',
    badge: 'PRO',
    popular: false,
  },
  enterprise: {
    name: 'Diamond',
    tagline: 'Maximum unlimited access',
    color: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-red-700',
    badge: 'DIAMOND',
    popular: false,
  },
};

// ============================================================================
// ADD-ON PRICING
// ============================================================================

export const ADDON_PRICING = {
  customDomain: {
    price: 999,        // ₹999 one-time for custom domain
    currency: 'INR',
    description: 'Use your own domain for CRM',
    availableFor: ['free', 'basic', 'starter', 'growth', 'professional', 'enterprise'] as PlanTier[],
  },
};

// ============================================================================
// STORAGE BILLING
// ============================================================================

export const STORAGE_BILLING = {
  /** Everyone must purchase storage — minimum 500MB at ₹30/month */
  required: true,
  minStorageMB: 500,
  minPriceINR: 30,
  /** Paid users: unused balance rolls over to next month */
  balanceRollover: true,
  /** Billing is calculated monthly */
  billingCycle: 'monthly' as const,
};

// ============================================================================
// TRIAL CONFIGURATION
// ============================================================================

export const TRIAL_CONFIG = {
  durationDays: 14,
  eligiblePlans: ['basic'] as PlanTier[],
  trialFeatures: ['leads', 'whatsapp', 'broadcasting', 'chatbot', 'templates'] as CrmModule[],
  // Free plan never expires. Only paid plans get a trial period.
};

// ============================================================================
// HELPERS
// ============================================================================

/** Check if a module is available for a given plan */
export function hasModule(plan: PlanTier, module: CrmModule): boolean {
  return PLAN_MODULES[plan]?.[module] ?? false;
}

/** Get the minimum plan required for a module */
export function getMinimumPlan(module: CrmModule): PlanTier {
  for (const plan of PLAN_ORDER) {
    if (PLAN_MODULES[plan][module]) return plan;
  }
  return 'professional';
}

/** Check if plan A is higher or equal to plan B */
export function isPlanAtLeast(current: PlanTier, required: PlanTier): boolean {
  return PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(required);
}

/** Get the next upgrade plan */
export function getUpgradePlan(current: PlanTier): PlanTier | null {
  const idx = PLAN_ORDER.indexOf(current);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[idx + 1];
}

/** Get limits for a plan */
export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

/** Get display info for a plan */
export function getPlanDisplay(plan: PlanTier): PlanDisplayInfo {
  return PLAN_DISPLAY[plan] || PLAN_DISPLAY.free;
}

/** Check if user is in trial period */
export function isInTrial(trialStartDate: Date | string | null, trialDays: number = TRIAL_CONFIG.durationDays): boolean {
  if (!trialStartDate) return false;
  const start = new Date(trialStartDate);
  const now = new Date();
  const diffDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= trialDays;
}

/** Get remaining trial days */
export function getTrialDaysRemaining(trialStartDate: Date | string | null, trialDays: number = TRIAL_CONFIG.durationDays): number {
  if (!trialStartDate) return 0;
  const start = new Date(trialStartDate);
  const now = new Date();
  const diffDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(trialDays - diffDays));
}

/** Format a limit number for display */
export function formatLimit(n: number): string {
  if (n >= 999999) return 'Unlimited';
  if (n >= 9999) return 'Unlimited';
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

/** Map sidebar paths to modules */
export const PATH_TO_MODULE: Record<string, CrmModule> = {
  '/admin/crm/messages': 'whatsapp',
  '/admin/crm/meta': 'whatsapp',
  '/admin/crm/whatsapp-meta': 'whatsapp',
  '/admin/crm/qr': 'whatsapp',
  '/admin/crm/telegram': 'whatsapp',
  '/admin/crm/broadcast': 'broadcasting',
  '/admin/crm/broadcast-dashboard': 'broadcasting',
  '/admin/crm/scheduled-messages': 'broadcasting',
  '/admin/crm/calls': 'aiCalls',
  '/admin/crm/templates': 'templates',
  '/admin/crm/chatbot': 'chatbot',
  '/admin/crm/chatbots': 'chatbot',
  '/admin/crm/settings/chatbot': 'chatbot',
  '/admin/crm/community': 'community',
  '/admin/crm/email': 'emailMarketing',
  '/admin/crm/reports': 'reports',
  '/admin/crm/analytics': 'reports',
  '/admin/crm/landing-pages': 'landingPages',
  '/admin/landing-pages': 'landingPages',
  '/admin/crm/helpdesk': 'helpdesk',
  '/admin/crm/funnel': 'leads',
  '/admin/crm/leads': 'leads',
  '/admin/crm/accounting': 'accounting',
  '/admin/crm/life-planner': 'lifePlanner',
};
