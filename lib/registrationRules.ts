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
  const mismatchedQuestions = new Set<string>();
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
    const category = option?.category || filter.fallbackCategory || filter.fallback || 'pending';
    if (category === 'rejected') {
      hardReject = true;
      mismatchedQuestions.add(sanitize(filter.question));
      reasons.push(`Failed on: ${filter.question}`);
    } else if (category !== 'approved') {
      mismatches++;
      mismatchedQuestions.add(sanitize(filter.question));
      reasons.push(`Pending on: ${filter.question}`);
    }
    for (const pair of config.hardRejectPairs || []) {
      const questions = (pair.questions || [pair.questionA, pair.questionB]).filter(Boolean);
      if (questions.length >= 2 && questions.every((question: string) => mismatchedQuestions.has(sanitize(question)))) {
        hardReject = true;
      }
    }
  }
  const exceeded = config.maxMismatches && mismatches >= config.maxMismatches && config.mismatchFallback === 'rejected';
  return { status: hardReject || exceeded ? rejected : mismatches ? pending : approved, reason: reasons.join(' | ') || 'Approved by AI' };
}

export function registrationTargetMatches(lead: RegistrationRecord, decisions: RegistrationRecord, category: string) {
  const decision = decisions[lead.id] || decisions[lead.leadId] || decisions[lead._id] || {};
  const status = decision.status || lead.status || 'new_leads';
  const isRejected = decision.isRejected || ['rejected', 'rejected_leads'].includes(status);
  const isRegistered = decision.isRegistered || ['registered', 'registered_leads'].includes(status);
  if (lead.isBlocked) return false;
  if (category === 'All Leads') return !isRejected;
  if (category === 'Rejected leads') return Boolean(isRejected);
  if (isRejected) return false;
  if (category === 'Registerd leads' || category === 'Registered leads') return Boolean(isRegistered);
  if (isRegistered) return false;
  if (category === 'New Leads') return ['new_leads', 'new', 'lead'].includes(status);
  if (/^Pending(?: Leads)?-\d+$/i.test(category)) return status === `pending_leads_${category.split('-').pop()}`;
  if (category === 'Pending Leads') return status.startsWith('pending');
  const approval = category.match(/^(?:Aprovel|Approvel|Approval)[ -](\d+)$/i);
  if (approval) return status === `approval_${approval[1]}`;
  if (category.startsWith('approval_')) return status === category;
  return status === category;
}
