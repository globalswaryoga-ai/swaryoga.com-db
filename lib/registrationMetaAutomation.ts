import type { RegistrationRecord } from '@/lib/registrationRules';

export const META_APPROVAL_STAGES = ['ai9AConfig', 'ai9BConfig'] as const;

export function metaApprovalConfigurationError(metadata: RegistrationRecord): string | null {
  for (const [index, key] of META_APPROVAL_STAGES.entries()) {
    const config = metadata[key];
    if (!config?.isActive) return `Save and start AI-9${'AB'[index]} before enabling automatic WhatsApp.`;
    if (!Array.isArray(config.filters) || !config.filters.length ||
        config.filters.some((filter: RegistrationRecord) => !String(filter.question || '').trim() ||
          !Array.isArray(filter.options) || !filter.options.some((option: RegistrationRecord) =>
            String(option.answer || '').trim() && option.category === 'approved'))) {
      return `Configure a question and an approved answer for every AI-9${'AB'[index]} rule.`;
    }
  }
  if (!metadata.facebookFormId && !metadata.metaFormId) return 'Connect a Meta form before enabling automatic WhatsApp.';
  if (!metadata.wtSettings?.approved?.template) return 'Select an approved WhatsApp template.';
  const delay = Number(metadata.wtSettings.approved.delay ?? 0);
  if (!Number.isFinite(delay) || delay < 0) return 'WhatsApp delay must be a non-negative number.';
  return null;
}

/** Approvals made shortly before automation was switched on still belong to the activated batch. */
export const APPROVAL_ACTIVATION_GRACE_MS = 6 * 60 * 60 * 1000;

/** Parses ISO strings, epoch numbers and legacy Mongo `{ $date: { $numberLong } }` values. */
export function parseLeadTime(value: unknown): number {
  if (value && typeof value === 'object') {
    const date = (value as RegistrationRecord).$date;
    return parseLeadTime(date && typeof date === 'object' ? date.$numberLong : date);
  }
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d{10,}$/.test(value)) return Number(value);
  return typeof value === 'string' ? Date.parse(value) : NaN;
}

export function leadApprovedAt(lead: RegistrationRecord): number {
  return parseLeadTime(lead.metadata?.manualApprovedAt || lead.metadata?.approvedAt);
}

export function isFutureMetaAutomationLead(lead: RegistrationRecord, metadata: RegistrationRecord): boolean {
  const policy = metadata.metaAutomation;
  if (!policy?.enabled || policy.approvalOnly !== true || metaApprovalConfigurationError(metadata)) return false;
  const startsAt = parseLeadTime(policy.startsAt);
  const createdAt = parseLeadTime(lead.createdAt);
  return !lead.isBlocked && Number.isFinite(startsAt) && Number.isFinite(createdAt) && createdAt > startsAt;
}

/** Lead was approved before automation was activated, but within the activation grace window. */
export function isApprovedJustBeforeActivation(lead: RegistrationRecord, metadata: RegistrationRecord): boolean {
  const policy = metadata.metaAutomation;
  if (!policy?.enabled || lead.isBlocked || lead.status !== 'approved') return false;
  if (!metadata.facebookFormId && !metadata.metaFormId) return false;
  if (!metadata.wtSettings?.approved?.template) return false;
  const startsAt = parseLeadTime(policy.startsAt);
  const approvedAt = leadApprovedAt(lead);
  return Number.isFinite(startsAt) && Number.isFinite(approvedAt) &&
    approvedAt < startsAt && approvedAt >= startsAt - APPROVAL_ACTIVATION_GRACE_MS;
}

/**
 * An administrator approved this lead (explicitly, or without AI-9A/AI-9B proof) after automation was enabled,
 * or just before enabling it. Manual approval is the approval decision, so AI-9A/AI-9B proof is not required;
 * the form, template and activation must still exist.
 */
export function isManualApprovalAutomationLead(lead: RegistrationRecord, metadata: RegistrationRecord): boolean {
  const policy = metadata.metaAutomation;
  if (!policy?.enabled || lead.isBlocked || lead.status !== 'approved') return false;
  const passedAi = META_APPROVAL_STAGES.every(key => lead.metadata?.ai9PassedStages?.[key] === true);
  if (lead.metadata?.approvalSource !== 'manual' && passedAi) return false;
  if (!metadata.facebookFormId && !metadata.metaFormId) return false;
  if (!metadata.wtSettings?.approved?.template) return false;
  const startsAt = parseLeadTime(policy.startsAt);
  const approvedAt = leadApprovedAt(lead);
  return Number.isFinite(startsAt) && Number.isFinite(approvedAt) && approvedAt >= startsAt - APPROVAL_ACTIVATION_GRACE_MS;
}
