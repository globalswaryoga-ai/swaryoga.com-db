export type RegistrationRecord = Record<string, any>;

export function evaluateMetaLead(lead: RegistrationRecord, config: RegistrationRecord, approved: string, pending: string, rejected: string) {
  const sanitize = (value: unknown) => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const answers: Record<string, string> = {};
  for (const field of lead.metadata?.rawFieldData || []) {
    const answer = Array.isArray(field.values) ? field.values.join(', ') : String(field.values ?? field.response ?? '');
    for (const key of [field.name, field.question_text]) if (key) answers[sanitize(key)] = answer;
  }
  let mismatches = 0;
  let hardReject = false;
  const reasons: string[] = [];
  const filters = (config.filters || []).filter((filter: RegistrationRecord) => filter.question);
  if (!filters.length) return null;
  for (const filter of filters) {
    const answer = answers[sanitize(filter.question)] || '';
    const option = (filter.options || []).find((candidate: RegistrationRecord) => {
      const expected = String(candidate.answer || '').trim().toLowerCase();
      const actual = answer.trim().toLowerCase();
      if (!expected || !actual) return false;
      if (sanitize(expected) === sanitize(actual)) return true;
      const escaped = expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'iu').test(actual);
    });
    const category = option?.category || 'pending';
    if (category === 'rejected') {
      hardReject = true;
      reasons.push(`Failed on: ${filter.question}`);
    } else if (category !== 'approved') {
      mismatches++;
      reasons.push(`Pending on: ${filter.question}`);
    }
  }
  return { status: hardReject ? rejected : mismatches ? pending : approved, reason: reasons.join(' | ') || 'Approved by AI' };
}

export function registrationTargetMatches(lead: RegistrationRecord, decisions: RegistrationRecord, category: string) {
  const decision = decisions[lead.id] || decisions[lead.leadId] || decisions[lead._id] || {};
  const status = decision.status || lead.status || 'new_leads';
  const isRejected = decision.isRejected || ['rejected', 'rejected_leads'].includes(status);
  const isRegistered = decision.isRegistered || ['registered', 'registered_leads'].includes(status);
  if (lead.isBlocked) return false;
  const copies: string[] = Array.isArray(decision.copies) ? decision.copies : [];
  if (category === 'Rejected leads' || category === 'rejected_leads') return Boolean(isRejected || copies.includes(category));
  if (category === 'Registerd leads' || category === 'Registered leads' || category === 'registered_leads') {
    return Boolean(isRegistered || copies.includes(category));
  }
  if (category === 'All Leads') return !isRejected;
  if (isRejected) return false;
  if (isRegistered) return false;
  if (copies.includes(category)) return true;
  if (category === 'New Leads' || category === 'new_leads') return ['new_leads', 'new', 'lead'].includes(status);
  if (/^pending_leads_\d+$/i.test(category)) return status.toLowerCase() === category.toLowerCase();
  const pendingStage = category.match(/^Pending(?: Leads)?[- ](\d+)$/i);
  if (pendingStage) return status === `pending_leads_${pendingStage[1]}`;
  if (category === 'Pending Leads' || category === 'pending_leads') {
    return status.startsWith('pending') || copies.some(copy => copy.startsWith('pending'));
  }
  const approval = category.match(/^(?:Aprovel|Approvel|Approval)[ -](\d+)$/i);
  if (approval) return status === `approval_${approval[1]}`;
  if (/^approval_\d+$/i.test(category)) return status.toLowerCase() === category.toLowerCase();
  return status === category;
}
