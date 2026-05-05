/**
 * Plan-Based Access Control Guards for CRM
 *
 * Ensures that CRM features are restricted based on the user's subscription plan.
 * Basic plan users CANNOT access Meta WhatsApp.
 *
 * PLAN RESTRICTIONS:
 * ==================
 * FREE:    QR WhatsApp, Manual Upload
 * BASIC:   QR WhatsApp, Manual Upload (NO Meta)
 * COPPER+: QR WhatsApp, Meta, Manual Upload (all features)
 */

import type { PlanTier } from './planConfig';
import { PLAN_MODULES } from './planConfig';

/**
 * Check if plan can access Meta WhatsApp
 * Only Copper (starter) and above can use Meta
 */
export function canAccessMeta(plan: PlanTier): boolean {
  return PLAN_MODULES[plan]?.whatsapp === true && plan !== 'basic' && plan !== 'free';
}

/**
 * Check if plan can access a specific CRM module
 */
export function canAccessModule(plan: PlanTier, module: keyof typeof PLAN_MODULES['free']): boolean {
  return PLAN_MODULES[plan]?.[module] ?? false;
}

/**
 * Check if lead source is allowed for this plan
 * - QR source: allowed for all plans
 * - Meta source: only for copper+ plans
 * - Upload source: allowed for all plans
 */
export function isLeadSourceAllowedForPlan(plan: PlanTier, source: 'qr' | 'meta' | 'upload'): boolean {
  if (source === 'meta') {
    return canAccessMeta(plan);
  }
  if (source === 'qr' || source === 'upload') {
    return true; // All plans support QR and Upload
  }
  return false;
}

/**
 * Get error message for plan restriction
 */
export function getPlanRestrictionMessage(plan: PlanTier, feature: string): string {
  if (feature === 'meta' && !canAccessMeta(plan)) {
    return `Meta WhatsApp is not available in ${plan === 'basic' ? 'Basic' : 'Free'} plan. Upgrade to Copper or higher to use Meta.`;
  }
  return `This feature is not available in your plan.`;
}

/**
 * Get available lead sources for a plan
 */
export function getAvailableLeadSources(plan: PlanTier): ('qr' | 'meta' | 'upload')[] {
  const sources: ('qr' | 'meta' | 'upload')[] = ['qr', 'upload'];
  if (canAccessMeta(plan)) {
    sources.push('meta');
  }
  return sources;
}

/**
 * Check if user can create/manage leads from a specific source
 */
export function canManageLeadSource(plan: PlanTier, source: 'qr' | 'meta' | 'upload'): boolean {
  return isLeadSourceAllowedForPlan(plan, source);
}

/**
 * Get restricted modules for a plan
 */
export function getRestrictedModules(plan: PlanTier): string[] {
  const restricted: string[] = [];

  if (!canAccessMeta(plan)) {
    restricted.push('meta', 'meta-dashboard', 'meta-templates');
  }

  return restricted;
}

/**
 * Validate lead source against plan
 * Returns { allowed: boolean, message: string }
 */
export function validateLeadSourceForPlan(plan: PlanTier, source: string): { allowed: boolean; message: string } {
  if (source !== 'qr' && source !== 'meta' && source !== 'upload') {
    return { allowed: false, message: 'Invalid lead source' };
  }

  if (!isLeadSourceAllowedForPlan(plan, source)) {
    if (source === 'meta') {
      return {
        allowed: false,
        message: getPlanRestrictionMessage(plan, 'meta'),
      };
    }
    return { allowed: false, message: `Lead source "${source}" is not available in your plan` };
  }

  return { allowed: true, message: '' };
}
