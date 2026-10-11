import type { RegistrationRecord } from '@/lib/registrationRules';

export const META_APPROVAL_STAGES = ['ai9AConfig', 'ai9BConfig', 'ai9CConfig', 'ai9DConfig'] as const;

export function metaApprovalConfigurationError(metadata: RegistrationRecord): string | null {
  for (const [index, key] of META_APPROVAL_STAGES.entries()) {
    const config = metadata[key];
    if (!config?.isActive) return `Save and start AI-9${'ABCD'[index]} before enabling automatic WhatsApp.`;
    if (!Array.isArray(config.filters) || !config.filters.length ||
        config.filters.some((filter: RegistrationRecord) => !String(filter.question || '').trim() ||
          !Array.isArray(filter.options) || !filter.options.some((option: RegistrationRecord) =>
            String(option.answer || '').trim() && option.category === 'approved'))) {
      return `Configure a question and an approved answer for every AI-9${'ABCD'[index]} rule.`;
    }
  }
  if (!metadata.facebookFormId && !metadata.metaFormId) return 'Connect a Meta form before enabling automatic WhatsApp.';
  if (!metadata.wtSettings?.approved?.template) return 'Select an approved WhatsApp template.';
  const delay = Number(metadata.wtSettings.approved.delay ?? 0);
  if (!Number.isFinite(delay) || delay < 0) return 'WhatsApp delay must be a non-negative number.';
  return null;
}

export function isFutureMetaAutomationLead(lead: RegistrationRecord, metadata: RegistrationRecord): boolean {
  const policy = metadata.metaAutomation;
  if (!policy?.enabled || policy.approvalOnly !== true || metaApprovalConfigurationError(metadata)) return false;
  const startsAt = Date.parse(policy.startsAt);
  const createdAt = Date.parse(lead.createdAt);
  return !lead.isBlocked && Number.isFinite(startsAt) && Number.isFinite(createdAt) && createdAt > startsAt;
}

/**
 * An administrator manually approved this lead after automation was enabled. Manual approval is the
 * approval decision, so AI-9A–D proof is not required; the form, template and activation must still exist.
 */
export function isManualApprovalAutomationLead(lead: RegistrationRecord, metadata: RegistrationRecord): boolean {
  const policy = metadata.metaAutomation;
  if (!policy?.enabled || lead.isBlocked || lead.status !== 'approved') return false;
  if (lead.metadata?.approvalSource !== 'manual') return false;
  if (!metadata.facebookFormId && !metadata.metaFormId) return false;
  if (!metadata.wtSettings?.approved?.template) return false;
  const startsAt = Date.parse(policy.startsAt);
  const approvedAt = Date.parse(lead.metadata?.manualApprovedAt || lead.metadata?.approvedAt);
  return Number.isFinite(startsAt) && Number.isFinite(approvedAt) && approvedAt >= startsAt;
}
