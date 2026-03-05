/**
 * Multi-Tenant SaaS — Plan Definitions
 *
 * Static configuration for the 5 plan tiers.
 * Each plan specifies numeric limits and which modules are enabled.
 *
 * Tier overview:
 *   FREE         – 250 leads, 1 seat, basic CRM only
 *   STARTER      – 5 000 leads, 3 seats, + WhatsApp + Broadcasts
 *   GROWTH       – 25 000 leads, 10 seats, + Voice AI + Payments + Chatbot
 *   PROFESSIONAL – 50 000 leads, 25 seats, + Workshops + Custom Domain + Analytics
 *   ENTERPRISE   – 100 000 leads, unlimited seats, all modules, API access
 */

import {
  PlanTier,
  PlanDefinition,
  PlanLimits,
  TenantModule,
} from './types';

// ---------------------------------------------------------------------------
// Module sets by tier (inclusive — each tier adds to the previous)
// ---------------------------------------------------------------------------

const FREE_MODULES: TenantModule[] = [
  TenantModule.CRM,
];

const STARTER_MODULES: TenantModule[] = [
  ...FREE_MODULES,
  TenantModule.WHATSAPP,
  TenantModule.BROADCASTS,
  TenantModule.META_FORMS,
];

const GROWTH_MODULES: TenantModule[] = [
  ...STARTER_MODULES,
  TenantModule.VOICE_AI,
  TenantModule.PAYMENTS,
  TenantModule.CHATBOT,
  TenantModule.CERTIFICATES,
];

const PROFESSIONAL_MODULES: TenantModule[] = [
  ...GROWTH_MODULES,
  TenantModule.WORKSHOPS,
  TenantModule.COMMUNITY,
  TenantModule.LIFE_PLANNER,
  TenantModule.ANALYTICS,
  TenantModule.CUSTOM_DOMAIN,
];

const ENTERPRISE_MODULES: TenantModule[] = [
  ...PROFESSIONAL_MODULES,
  TenantModule.TALLY,
  TenantModule.API_ACCESS,
];

// ---------------------------------------------------------------------------
// Plan Definitions
// ---------------------------------------------------------------------------

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  [PlanTier.FREE]: {
    tier: PlanTier.FREE,
    name: 'Free',
    description: 'Get started with basic CRM — no cost.',
    limits: {
      maxLeads: 250,
      maxUsers: 1,
      maxWhatsAppTemplates: 0,
      maxBroadcastsPerDay: 0,
      maxStorageMB: 100,
      maxApiRequestsPerDay: 500,
    },
    enabledModules: FREE_MODULES,
    monthlyPriceINR: 0,
    annualPriceINR: 0,
  },

  [PlanTier.STARTER]: {
    tier: PlanTier.STARTER,
    name: 'Starter',
    description: 'WhatsApp messaging and lead management for small teams.',
    limits: {
      maxLeads: 5_000,
      maxUsers: 3,
      maxWhatsAppTemplates: 10,
      maxBroadcastsPerDay: 5,
      maxStorageMB: 500,
      maxApiRequestsPerDay: 5_000,
    },
    enabledModules: STARTER_MODULES,
    monthlyPriceINR: 1_999,
    annualPriceINR: 19_990,
  },

  [PlanTier.GROWTH]: {
    tier: PlanTier.GROWTH,
    name: 'Growth',
    description: 'Voice AI, payments, and automation for growing businesses.',
    limits: {
      maxLeads: 25_000,
      maxUsers: 10,
      maxWhatsAppTemplates: 50,
      maxBroadcastsPerDay: 20,
      maxStorageMB: 2_000,
      maxApiRequestsPerDay: 25_000,
    },
    enabledModules: GROWTH_MODULES,
    monthlyPriceINR: 4_999,
    annualPriceINR: 49_990,
  },

  [PlanTier.PROFESSIONAL]: {
    tier: PlanTier.PROFESSIONAL,
    name: 'Professional',
    description: 'Full-featured platform with workshops, analytics, and custom domain.',
    limits: {
      maxLeads: 50_000,
      maxUsers: 25,
      maxWhatsAppTemplates: 200,
      maxBroadcastsPerDay: 50,
      maxStorageMB: 10_000,
      maxApiRequestsPerDay: 100_000,
    },
    enabledModules: PROFESSIONAL_MODULES,
    monthlyPriceINR: 9_999,
    annualPriceINR: 99_990,
  },

  [PlanTier.ENTERPRISE]: {
    tier: PlanTier.ENTERPRISE,
    name: 'Enterprise',
    description: 'Unlimited scale with API access, Tally integration, and priority support.',
    limits: {
      maxLeads: 100_000,
      maxUsers: 9999, // effectively unlimited
      maxWhatsAppTemplates: 1_000,
      maxBroadcastsPerDay: 500,
      maxStorageMB: 50_000,
      maxApiRequestsPerDay: 1_000_000,
    },
    enabledModules: ENTERPRISE_MODULES,
    monthlyPriceINR: 24_999,
    annualPriceINR: 249_990,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the plan definition for a given tier.
 * Falls back to FREE if the tier string is unrecognised.
 */
export function getPlanDefinition(tier: PlanTier | string): PlanDefinition {
  return PLAN_DEFINITIONS[tier as PlanTier] ?? PLAN_DEFINITIONS[PlanTier.FREE];
}

/**
 * Merge plan-default limits with optional per-tenant custom overrides.
 */
export function resolveEffectiveLimits(
  tier: PlanTier | string,
  customLimits?: Partial<PlanLimits>,
): PlanLimits {
  const base = getPlanDefinition(tier).limits;
  if (!customLimits) return { ...base };
  return {
    maxLeads: customLimits.maxLeads ?? base.maxLeads,
    maxUsers: customLimits.maxUsers ?? base.maxUsers,
    maxWhatsAppTemplates: customLimits.maxWhatsAppTemplates ?? base.maxWhatsAppTemplates,
    maxBroadcastsPerDay: customLimits.maxBroadcastsPerDay ?? base.maxBroadcastsPerDay,
    maxStorageMB: customLimits.maxStorageMB ?? base.maxStorageMB,
    maxApiRequestsPerDay: customLimits.maxApiRequestsPerDay ?? base.maxApiRequestsPerDay,
  };
}

/**
 * Merge plan-default modules with any per-tenant overrides.
 */
export function resolveEnabledModules(
  tier: PlanTier | string,
  tenantModules?: TenantModule[],
): Set<TenantModule> {
  const planModules = getPlanDefinition(tier).enabledModules;
  const merged = new Set<TenantModule>(planModules);
  if (tenantModules) {
    for (const m of tenantModules) merged.add(m);
  }
  return merged;
}

/**
 * Quick check: is a given module available for a plan tier + tenant overrides?
 */
export function isModuleEnabled(
  mod: TenantModule,
  tier: PlanTier | string,
  tenantModules?: TenantModule[],
): boolean {
  return resolveEnabledModules(tier, tenantModules).has(mod);
}
