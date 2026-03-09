/**
 * CRM Plan Configuration - Single Source of Truth
 * 
 * All plan tiers, limits, features, modules defined here.
 * Every component/API should import from this file.
 */

// ============================================================================
// PLAN TIERS
// ============================================================================

export type PlanTier = 'free' | 'basic' | 'starter' | 'growth' | 'professional';

export const PLAN_ORDER: PlanTier[] = ['free', 'basic', 'starter', 'growth', 'professional'];

export const PLAN_NAMES: Record<PlanTier, string> = {
  free: 'Free',
  basic: 'Basic',
  starter: 'Starter',
  growth: 'Growth',
  professional: 'Professional',
};

// ============================================================================
// PRICING
// ============================================================================

export const PLAN_PRICING: Record<PlanTier, {
  monthly: number;
  quarterly: number;
  annual: number;
  monthlyUSD: number;
}> = {
  free:         { monthly: 0,    quarterly: 0,     annual: 0,     monthlyUSD: 0 },
  basic:        { monthly: 999,  quarterly: 2697,  annual: 9590,  monthlyUSD: 12 },
  starter:      { monthly: 1999, quarterly: 5397,  annual: 19190, monthlyUSD: 25 },
  growth:       { monthly: 4999, quarterly: 13497, annual: 47990, monthlyUSD: 59 },
  professional: { monthly: 9999, quarterly: 26997, annual: 95990, monthlyUSD: 119 },
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
    maxLeads: 250,
    maxUsers: 1,
    maxChatbotFlows: 1,
    storageQuotaMB: 100,
    maxBroadcastsPerDay: 1,
    maxEmailsPerMonth: 100,
    maxLandingPages: 1,
    maxCommunities: 1,
    maxAutomationWorkflows: 1,
  },
  basic: {
    maxLeads: 2000,
    maxUsers: 2,
    maxChatbotFlows: 5,
    storageQuotaMB: 500,
    maxBroadcastsPerDay: 5,
    maxEmailsPerMonth: 1000,
    maxLandingPages: 3,
    maxCommunities: 2,
    maxAutomationWorkflows: 5,
  },
  starter: {
    maxLeads: 5000,
    maxUsers: 3,
    maxChatbotFlows: 10,
    storageQuotaMB: 1000,
    maxBroadcastsPerDay: 20,
    maxEmailsPerMonth: 5000,
    maxLandingPages: 10,
    maxCommunities: 5,
    maxAutomationWorkflows: 15,
  },
  growth: {
    maxLeads: 25000,
    maxUsers: 10,
    maxChatbotFlows: 9999,
    storageQuotaMB: 5000,
    maxBroadcastsPerDay: 100,
    maxEmailsPerMonth: 25000,
    maxLandingPages: 50,
    maxCommunities: 20,
    maxAutomationWorkflows: 50,
  },
  professional: {
    maxLeads: 999999,
    maxUsers: 999,
    maxChatbotFlows: 9999,
    storageQuotaMB: 50000,
    maxBroadcastsPerDay: 999,
    maxEmailsPerMonth: 100000,
    maxLandingPages: 999,
    maxCommunities: 999,
    maxAutomationWorkflows: 999,
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
  | 'customDomain';

export const PLAN_MODULES: Record<PlanTier, Record<CrmModule, boolean>> = {
  free: {
    leads: true,
    whatsapp: false,
    broadcasting: false,
    chatbot: true,
    aiCalls: false,
    reports: false,
    community: true,
    templates: false,
    callRecording: false,
    emailMarketing: false,
    landingPages: true,
    automation: false,
    helpdesk: false,
    api: false,
    customDomain: false,
  },
  basic: {
    leads: true,
    whatsapp: true,
    broadcasting: true,
    chatbot: true,
    aiCalls: false,
    reports: false,
    community: false,
    templates: true,
    callRecording: false,
    emailMarketing: false,
    landingPages: false,
    automation: false,
    helpdesk: true,
    api: false,
    customDomain: false,
  },
  starter: {
    leads: true,
    whatsapp: true,
    broadcasting: true,
    chatbot: true,
    aiCalls: false,
    reports: true,
    community: false,
    templates: true,
    callRecording: false,
    emailMarketing: true,
    landingPages: true,
    automation: false,
    helpdesk: true,
    api: false,
    customDomain: false,
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
    customDomain: false,
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
  { name: 'WhatsApp API', description: 'Send & receive via Meta Business API', module: 'whatsapp', icon: 'MessageCircle', minimumPlan: 'basic' },
  { name: 'Broadcast Messages', description: 'Send bulk WhatsApp campaigns', module: 'broadcasting', icon: 'Megaphone', minimumPlan: 'basic' },
  { name: 'Message Templates', description: 'Pre-approved WhatsApp templates', module: 'templates', icon: 'FileText', minimumPlan: 'basic' },
  { name: 'Help Desk', description: 'Ticket-based customer support', module: 'helpdesk', icon: 'LifeBuoy', minimumPlan: 'basic' },
  { name: 'Reports & Analytics', description: 'Performance dashboards and insights', module: 'reports', icon: 'BarChart3', minimumPlan: 'starter' },
  { name: 'Email Marketing', description: 'Email campaigns and drip sequences', module: 'emailMarketing', icon: 'Mail', minimumPlan: 'starter' },
  { name: 'Landing Pages', description: 'Build lead capture pages', module: 'landingPages', icon: 'Layout', minimumPlan: 'free' },
  { name: 'AI Voice Calls', description: 'AI-powered outbound calling', module: 'aiCalls', icon: 'Phone', minimumPlan: 'growth' },
  { name: 'Community', description: 'Course and community management', module: 'community', icon: 'GraduationCap', minimumPlan: 'free' },
  { name: 'Call Recording', description: 'Record and review calls', module: 'callRecording', icon: 'Mic', minimumPlan: 'growth' },
  { name: 'Automation', description: 'Workflow automations and triggers', module: 'automation', icon: 'Workflow', minimumPlan: 'growth' },
  { name: 'API Access', description: 'REST API and webhook integrations', module: 'api', icon: 'Code', minimumPlan: 'growth' },
  { name: 'Custom Domain', description: 'Use your own domain for CRM', module: 'customDomain', icon: 'Globe', minimumPlan: 'professional' },
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
};

// ============================================================================
// TRIAL CONFIGURATION
// ============================================================================

export const TRIAL_CONFIG = {
  durationDays: 14,
  eligiblePlans: ['free', 'basic'] as PlanTier[],
  trialFeatures: ['leads', 'whatsapp', 'broadcasting', 'chatbot', 'templates'] as CrmModule[],
  // During trial, free users get basic-level access to these modules
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
};
