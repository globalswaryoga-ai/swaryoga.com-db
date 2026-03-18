import {
  PLAN_LIMITS,
  PLAN_MODULES,
  PLAN_NAMES,
  PLAN_PRICING,
  type CrmModule,
  type PlanLimits,
  type PlanTier,
} from '@/lib/crm-site/planConfig';
import { EMAIL_LIMITS } from '@/lib/crm-site/emailMarketingConfig';
import { LANDING_PAGE_LIMITS } from '@/lib/crm-site/landingPageConfig';
import { HELPDESK_LIMITS } from '@/lib/crm-site/helpdeskConfig';
import { AUTOMATION_LIMITS } from '@/lib/crm-site/automationConfig';

export type TenantModuleOverrides = Partial<Record<CrmModule, boolean>>;

export interface TenantChannelAccess {
  metaWhatsApp?: boolean;
  qrWhatsApp?: boolean;
  emailMarketing?: boolean;
  landingPages?: boolean;
  community?: boolean;
  automation?: boolean;
  helpdesk?: boolean;
}

export interface TenantCustomPricing {
  monthly?: number;
  quarterly?: number;
  annual?: number;
  monthlyUSD?: number;
}

export interface TenantPlanAccess {
  plan: PlanTier;
  planName: string;
  pricing: (typeof PLAN_PRICING)[PlanTier];
  limits: PlanLimits;
  modules: Record<CrmModule, boolean>;
  customPlanName: string;
  customPricing: TenantCustomPricing;
  customLimits: Partial<PlanLimits>;
  moduleOverrides: TenantModuleOverrides;
  channelAccess: TenantChannelAccess;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cleanNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

function cleanBooleanRecord<T extends string>(
  value: unknown,
  keys: readonly T[],
): Partial<Record<T, boolean>> {
  if (!isPlainObject(value)) return {};
  return keys.reduce((acc, key) => {
    if (typeof value[key] === 'boolean') {
      acc[key] = value[key];
    }
    return acc;
  }, {} as Partial<Record<T, boolean>>);
}

export function normalizePlanTier(value: unknown): PlanTier {
  const tier = String(value || '').trim().toLowerCase();
  if (tier === 'basic' || tier === 'starter' || tier === 'growth' || tier === 'professional') {
    return tier;
  }
  return 'free';
}

export function sanitizeTenantCustomLimits(value: unknown): Partial<PlanLimits> {
  if (!isPlainObject(value)) return {};

  const limitKeys: Array<keyof PlanLimits> = [
    'maxLeads',
    'maxUsers',
    'maxChatbotFlows',
    'storageQuotaMB',
    'maxBroadcastsPerDay',
    'maxEmailsPerMonth',
    'maxLandingPages',
    'maxCommunities',
    'maxAutomationWorkflows',
  ];

  return limitKeys.reduce((acc, key) => {
    const numeric = cleanNumber(value[key]);
    if (numeric !== undefined) {
      acc[key] = numeric;
    }
    return acc;
  }, {} as Partial<PlanLimits>);
}

export function sanitizeTenantCustomPricing(value: unknown): TenantCustomPricing {
  if (!isPlainObject(value)) return {};
  const pricingKeys = ['monthly', 'quarterly', 'annual', 'monthlyUSD'] as const;

  return pricingKeys.reduce((acc, key) => {
    const numeric = cleanNumber(value[key]);
    if (numeric !== undefined) {
      acc[key] = numeric;
    }
    return acc;
  }, {} as TenantCustomPricing);
}

export function sanitizeTenantModuleOverrides(value: unknown): TenantModuleOverrides {
  const keys = Object.keys(PLAN_MODULES.free) as CrmModule[];
  return cleanBooleanRecord(value, keys);
}

export function sanitizeTenantChannelAccess(value: unknown): TenantChannelAccess {
  const keys = [
    'metaWhatsApp',
    'qrWhatsApp',
    'emailMarketing',
    'landingPages',
    'community',
    'automation',
    'helpdesk',
  ] as const;
  return cleanBooleanRecord(value, keys);
}

export function resolveTenantPlanAccess(tenant: any): TenantPlanAccess {
  const plan = normalizePlanTier(tenant?.subscription?.plan || tenant?.subscriptionTier || tenant?.plan);
  const baseLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const baseModules = PLAN_MODULES[plan] || PLAN_MODULES.free;
  const basePricing = PLAN_PRICING[plan] || PLAN_PRICING.free;

  const customLimits = sanitizeTenantCustomLimits(tenant?.customLimits);
  const customPricing = sanitizeTenantCustomPricing(tenant?.customPricing);
  const moduleOverrides = sanitizeTenantModuleOverrides(tenant?.moduleOverrides);
  const channelAccess = sanitizeTenantChannelAccess(tenant?.channelAccess);

  const mergedLimits: PlanLimits = {
    ...baseLimits,
    ...customLimits,
  };

  const whatsappEnabled =
    channelAccess.metaWhatsApp === false && channelAccess.qrWhatsApp === false
      ? false
      : moduleOverrides.whatsapp ?? baseModules.whatsapp;

  const mergedModules: Record<CrmModule, boolean> = {
    ...baseModules,
    ...moduleOverrides,
    whatsapp: whatsappEnabled,
    emailMarketing: channelAccess.emailMarketing ?? (moduleOverrides.emailMarketing ?? baseModules.emailMarketing),
    landingPages: channelAccess.landingPages ?? (moduleOverrides.landingPages ?? baseModules.landingPages),
    community: channelAccess.community ?? (moduleOverrides.community ?? baseModules.community),
    automation: channelAccess.automation ?? (moduleOverrides.automation ?? baseModules.automation),
    helpdesk: channelAccess.helpdesk ?? (moduleOverrides.helpdesk ?? baseModules.helpdesk),
  };

  return {
    plan,
    planName: String(tenant?.customPlanName || PLAN_NAMES[plan] || 'Free').trim(),
    pricing: {
      ...basePricing,
      ...customPricing,
    },
    limits: mergedLimits,
    modules: mergedModules,
    customPlanName: String(tenant?.customPlanName || '').trim(),
    customPricing,
    customLimits,
    moduleOverrides,
    channelAccess,
  };
}

export function resolveLandingPagePlanAccess(tenant: any) {
  const access = resolveTenantPlanAccess(tenant);
  const base = LANDING_PAGE_LIMITS[access.plan] || LANDING_PAGE_LIMITS.free;
  return {
    ...base,
    enabled: access.modules.landingPages,
    maxPages: access.limits.maxLandingPages,
    customDomain: access.modules.customDomain && base.customDomain,
  };
}

export function resolveEmailPlanAccess(tenant: any) {
  const access = resolveTenantPlanAccess(tenant);
  const base = EMAIL_LIMITS[access.plan] || EMAIL_LIMITS.free;
  const enabled = access.modules.emailMarketing;

  return {
    ...base,
    enabled,
    monthlyEmails: enabled ? access.limits.maxEmailsPerMonth : 0,
    campaigns: enabled ? base.campaigns : 0,
    templates: enabled ? base.templates : 0,
    tracking: enabled && base.tracking,
    scheduling: enabled && base.scheduling,
    drip: enabled && base.drip,
  };
}

export function resolveWorkflowPlanAccess(tenant: any) {
  const access = resolveTenantPlanAccess(tenant);
  const base = AUTOMATION_LIMITS[access.plan] || AUTOMATION_LIMITS.free;
  return {
    ...base,
    enabled: access.modules.automation,
    workflows: access.limits.maxAutomationWorkflows,
  };
}

export function resolveHelpdeskPlanAccess(tenant: any) {
  const access = resolveTenantPlanAccess(tenant);
  const base = HELPDESK_LIMITS[access.plan] || HELPDESK_LIMITS.free;
  const enabled = access.modules.helpdesk && base.enabled;
  return {
    ...base,
    enabled,
    maxTickets: enabled ? base.maxTickets : 0,
    automation: enabled && base.automation,
    customCategories: enabled && base.customCategories,
    emailChannel: enabled && base.emailChannel,
    formChannel: enabled && base.formChannel,
    sla: enabled && base.sla,
  };
}

export function resolveUserSeatLimit(tenant: any): number {
  return resolveTenantPlanAccess(tenant).limits.maxUsers;
}