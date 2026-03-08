/**
 * Tenant Setup Configuration
 * Complete checklist and types for onboarding new CRM tenants
 */

// ============================================================================
// SECTION 1: BUSINESS DETAILS
// ============================================================================

export interface BusinessDetails {
  businessName: string;
  logo?: string; // URL to uploaded logo (PNG/SVG)
  logoFile?: File; // For upload
  primaryColor: string; // Hex code e.g. #3B82F6
  secondaryColor?: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  industry?: string;
  website?: string;
  address?: string;
  timezone?: string;
}

// ============================================================================
// SECTION 2: DOMAIN SETUP
// ============================================================================

export interface DomainSetup {
  useCustomDomain: boolean;
  customDomain?: string; // e.g. crm.theirbusiness.com
  subdomain: string; // e.g. theirbusiness (for theirbusiness.swaryoga.com)
  sslStatus?: 'pending' | 'active' | 'failed';
  dnsRecords?: DNSRecord[];
  verifiedAt?: Date;
}

export interface DNSRecord {
  type: 'CNAME' | 'A' | 'TXT';
  name: string;
  value: string;
  verified: boolean;
}

// ============================================================================
// SECTION 3: WHATSAPP INTEGRATION (REQUIRED)
// ============================================================================

export interface WhatsAppSetup {
  phoneNumberId: string;
  accessToken: string; // Permanent access token
  metaAppId: string;
  metaAppSecret: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
  templates: WhatsAppTemplate[];
  isConnected: boolean;
  connectedAt?: Date;
  lastSyncAt?: Date;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components?: any[];
}

// ============================================================================
// SECTION 4: LEAD ADS INTEGRATION (OPTIONAL)
// ============================================================================

export interface LeadAdsSetup {
  enabled: boolean;
  metaPageId?: string;
  metaPageAccessToken?: string;
  pageName?: string;
  adAccountId?: string;
  forms?: LeadAdForm[];
  isConnected: boolean;
  connectedAt?: Date;
}

export interface LeadAdForm {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
  leadCount?: number;
}

// ============================================================================
// SECTION 5: PAYMENTS SETUP (OPTIONAL)
// ============================================================================

export interface PaymentSetup {
  provider: 'none' | 'cashfree' | 'payu' | 'both';
  
  // Cashfree
  cashfree?: {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
    isVerified: boolean;
  };
  
  // PayU
  payu?: {
    merchantKey: string;
    merchantSalt: string;
    environment: 'sandbox' | 'production';
    isVerified: boolean;
  };
  
  currency: string;
  enabledMethods: ('upi' | 'card' | 'netbanking' | 'wallet')[];
}

// ============================================================================
// SECTION 6: AI CALLING SETUP (PLAN 2+)
// ============================================================================

export interface AICallingSetup {
  enabled: boolean;
  preferredLanguages: string[];
  retellAgents: RetellAgent[];
  callScript?: string;
  welcomeMessage?: string;
  fallbackMessage?: string;
  maxCallDuration?: number; // seconds
  callRecording: boolean;
}

export interface RetellAgent {
  id: string;
  name: string;
  language: string;
  voiceId: string;
  prompt: string;
  isActive: boolean;
  createdAt: Date;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'te-IN', name: 'Telugu' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam' },
  { code: 'mr-IN', name: 'Marathi' },
  { code: 'gu-IN', name: 'Gujarati' },
  { code: 'bn-IN', name: 'Bengali' },
  { code: 'pa-IN', name: 'Punjabi' },
];

// ============================================================================
// SECTION 7: TEAM SETUP
// ============================================================================

export interface TeamSetup {
  members: TeamMember[];
  invitePending: TeamInvite[];
  roles: TeamRole[];
}

export interface TeamMember {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt?: Date;
}

export interface TeamInvite {
  email: string;
  name?: string;
  phone?: string;
  role: string;
  invitedAt: Date;
  expiresAt: Date;
  token: string;
}

export interface TeamRole {
  id: string;
  name: string;
  permissions: string[];
  isDefault?: boolean;
}

export const DEFAULT_ROLES: TeamRole[] = [
  {
    id: 'admin',
    name: 'Admin',
    permissions: ['all'],
    isDefault: false,
  },
  {
    id: 'manager',
    name: 'Manager',
    permissions: ['leads.view', 'leads.edit', 'leads.assign', 'reports.view', 'team.view'],
    isDefault: false,
  },
  {
    id: 'agent',
    name: 'Sales Agent',
    permissions: ['leads.view', 'leads.edit', 'whatsapp.send'],
    isDefault: true,
  },
  {
    id: 'viewer',
    name: 'Viewer',
    permissions: ['leads.view', 'reports.view'],
    isDefault: false,
  },
];

// ============================================================================
// COMPLETE TENANT SETUP
// ============================================================================

export interface TenantSetup {
  tenantId: string;
  tenantSlug: string;
  plan: string;
  
  // Sections
  business: BusinessDetails;
  domain: DomainSetup;
  whatsapp: WhatsAppSetup;
  leadAds?: LeadAdsSetup;
  payments?: PaymentSetup;
  aiCalling?: AICallingSetup;
  team: TeamSetup;
  
  // Progress
  setupProgress: SetupProgress;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface SetupProgress {
  business: SetupSectionStatus;
  domain: SetupSectionStatus;
  whatsapp: SetupSectionStatus;
  leadAds: SetupSectionStatus;
  payments: SetupSectionStatus;
  aiCalling: SetupSectionStatus;
  team: SetupSectionStatus;
}

export interface SetupSectionStatus {
  completed: boolean;
  required: boolean;
  availableInPlan: boolean;
  completedAt?: Date;
  errors?: string[];
}

// ============================================================================
// SETUP CHECKLIST BY PLAN
// ============================================================================

export const SETUP_SECTIONS_BY_PLAN: Record<string, {
  required: string[];
  optional: string[];
  locked: string[];
}> = {
  free: {
    required: ['business', 'domain'],
    optional: ['team'],
    locked: ['whatsapp', 'leadAds', 'payments', 'aiCalling'],
  },
  basic: {
    required: ['business', 'domain', 'whatsapp'],
    optional: ['team', 'payments'],
    locked: ['leadAds', 'aiCalling'],
  },
  starter: {
    required: ['business', 'domain', 'whatsapp'],
    optional: ['team', 'payments', 'leadAds'],
    locked: ['aiCalling'],
  },
  growth: {
    required: ['business', 'domain', 'whatsapp'],
    optional: ['team', 'payments', 'leadAds', 'aiCalling'],
    locked: [],
  },
  professional: {
    required: ['business', 'domain', 'whatsapp'],
    optional: ['team', 'payments', 'leadAds', 'aiCalling'],
    locked: [],
  },
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validateBusinessDetails(data: Partial<BusinessDetails>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.businessName?.trim()) errors.push('Business name is required');
  if (!data.adminName?.trim()) errors.push('Admin name is required');
  if (!data.adminEmail?.trim()) errors.push('Admin email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail)) errors.push('Invalid email format');
  if (!data.adminPhone?.trim()) errors.push('Admin phone is required');
  else if (!/^\d{10}$/.test(data.adminPhone.replace(/\D/g, '').slice(-10))) errors.push('Invalid phone number');
  if (data.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(data.primaryColor)) errors.push('Invalid color format');
  
  return { valid: errors.length === 0, errors };
}

export function validateDomainSetup(data: Partial<DomainSetup>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.subdomain?.trim()) {
    errors.push('Subdomain is required');
  } else if (!/^[a-z0-9-]+$/.test(data.subdomain)) {
    errors.push('Subdomain can only contain lowercase letters, numbers, and hyphens');
  } else if (data.subdomain.length < 3) {
    errors.push('Subdomain must be at least 3 characters');
  }
  
  if (data.useCustomDomain && data.customDomain) {
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(data.customDomain.toLowerCase())) {
      errors.push('Invalid custom domain format');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateWhatsAppSetup(data: Partial<WhatsAppSetup>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.phoneNumberId?.trim()) errors.push('WhatsApp Phone Number ID is required');
  if (!data.accessToken?.trim()) errors.push('WhatsApp Access Token is required');
  if (!data.metaAppId?.trim()) errors.push('Meta App ID is required');
  if (!data.metaAppSecret?.trim()) errors.push('Meta App Secret is required');
  
  return { valid: errors.length === 0, errors };
}

export function validatePaymentSetup(data: Partial<PaymentSetup>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.provider === 'cashfree' || data.provider === 'both') {
    if (!data.cashfree?.clientId?.trim()) errors.push('Cashfree Client ID is required');
    if (!data.cashfree?.clientSecret?.trim()) errors.push('Cashfree Client Secret is required');
  }
  
  if (data.provider === 'payu' || data.provider === 'both') {
    if (!data.payu?.merchantKey?.trim()) errors.push('PayU Merchant Key is required');
    if (!data.payu?.merchantSalt?.trim()) errors.push('PayU Merchant Salt is required');
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateTeamMember(data: Partial<TeamMember>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.name?.trim()) errors.push('Name is required');
  if (!data.email?.trim()) errors.push('Email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email format');
  if (!data.phone?.trim()) errors.push('Phone is required');
  if (!data.role?.trim()) errors.push('Role is required');
  
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// PROGRESS CALCULATION
// ============================================================================

export function calculateSetupProgress(setup: Partial<TenantSetup>, plan: string): {
  percentage: number;
  completed: string[];
  pending: string[];
  locked: string[];
} {
  const planConfig = SETUP_SECTIONS_BY_PLAN[plan] || SETUP_SECTIONS_BY_PLAN.free;
  const allSections = [...planConfig.required, ...planConfig.optional];
  
  const completed: string[] = [];
  const pending: string[] = [];
  
  for (const section of allSections) {
    const status = setup.setupProgress?.[section as keyof SetupProgress];
    if (status?.completed) {
      completed.push(section);
    } else {
      pending.push(section);
    }
  }
  
  // Calculate percentage (required sections have more weight)
  const requiredWeight = 0.7;
  const optionalWeight = 0.3;
  
  const requiredCompleted = completed.filter(s => planConfig.required.includes(s)).length;
  const requiredTotal = planConfig.required.length;
  const optionalCompleted = completed.filter(s => planConfig.optional.includes(s)).length;
  const optionalTotal = planConfig.optional.length;
  
  const requiredPct = requiredTotal > 0 ? (requiredCompleted / requiredTotal) * requiredWeight : requiredWeight;
  const optionalPct = optionalTotal > 0 ? (optionalCompleted / optionalTotal) * optionalWeight : 0;
  
  const percentage = Math.round((requiredPct + optionalPct) * 100);
  
  return {
    percentage,
    completed,
    pending,
    locked: planConfig.locked,
  };
}

// ============================================================================
// DEFAULT SETUP TEMPLATE
// ============================================================================

export function createDefaultSetup(tenantSlug: string, plan: string): TenantSetup {
  const planConfig = SETUP_SECTIONS_BY_PLAN[plan] || SETUP_SECTIONS_BY_PLAN.free;
  
  return {
    tenantId: '',
    tenantSlug,
    plan,
    
    business: {
      businessName: '',
      primaryColor: '#3B82F6',
      adminName: '',
      adminEmail: '',
      adminPhone: '',
    },
    
    domain: {
      useCustomDomain: false,
      subdomain: tenantSlug,
    },
    
    whatsapp: {
      phoneNumberId: '',
      accessToken: '',
      metaAppId: '',
      metaAppSecret: '',
      templates: [],
      isConnected: false,
    },
    
    leadAds: {
      enabled: false,
      isConnected: false,
    },
    
    payments: {
      provider: 'none',
      currency: 'INR',
      enabledMethods: ['upi', 'card', 'netbanking'],
    },
    
    aiCalling: {
      enabled: false,
      preferredLanguages: ['en-IN', 'hi-IN'],
      retellAgents: [],
      callRecording: true,
    },
    
    team: {
      members: [],
      invitePending: [],
      roles: DEFAULT_ROLES,
    },
    
    setupProgress: {
      business: { completed: false, required: planConfig.required.includes('business'), availableInPlan: !planConfig.locked.includes('business') },
      domain: { completed: false, required: planConfig.required.includes('domain'), availableInPlan: !planConfig.locked.includes('domain') },
      whatsapp: { completed: false, required: planConfig.required.includes('whatsapp'), availableInPlan: !planConfig.locked.includes('whatsapp') },
      leadAds: { completed: false, required: planConfig.required.includes('leadAds'), availableInPlan: !planConfig.locked.includes('leadAds') },
      payments: { completed: false, required: planConfig.required.includes('payments'), availableInPlan: !planConfig.locked.includes('payments') },
      aiCalling: { completed: false, required: planConfig.required.includes('aiCalling'), availableInPlan: !planConfig.locked.includes('aiCalling') },
      team: { completed: false, required: planConfig.required.includes('team'), availableInPlan: !planConfig.locked.includes('team') },
    },
    
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
