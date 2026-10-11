type MetaLead = {
  _id?: string;
  id?: string;
  status?: string;
  source?: string;
  labels?: string[];
  workshopId?: string;
  metadata?: { workshopId?: string; metaFormId?: string; wtStatus?: string };
};

export function metaLeadBucket(lead: MetaLead): 'approved' | 'pending' | 'rejected' | 'processing' | 'other' {
  const status = String(lead.status || 'new').toLowerCase();
  if (status === 'approved') return 'approved';
  if (status.includes('rejected')) return 'rejected';
  if (['pending', 'new', 'lead'].includes(status) || status.endsWith('_pending')) return 'pending';
  if (/^stage_[123]_new$/.test(status)) return 'processing';
  return 'other';
}

export function metaLeadCounts(leads: MetaLead[]) {
  const counts = { total: leads.length, approved: 0, pending: 0, rejected: 0, processing: 0, other: 0 };
  for (const lead of leads) counts[metaLeadBucket(lead)]++;
  return counts;
}

export function matchesMetaBatch(lead: MetaLead, workshopId: string, formId: string) {
  const meta = ['meta_instant_form', 'meta_leadgen'].includes(lead.source || '') ||
    (lead.labels || []).some(label => ['meta_instant_form', 'meta_leadgen'].includes(label));
  return meta && Boolean(
    (workshopId && (lead.workshopId === workshopId || lead.metadata?.workshopId === workshopId)) ||
    (formId && lead.metadata?.metaFormId === formId),
  );
}

export type TriggerMessage = {
  leadId: string;
  status: string;
  waMessageId?: string | null;
  reason?: string;
};

export function triggerWrongNumber(message: TriggerMessage) {
  return message.status === 'wrong_number' ||
    (message.status === 'failed' && /wrong number|invalid (phone|whatsapp|recipient|number)|not (a )?(registered|valid) whatsapp/i.test(message.reason || ''));
}

export function triggerMessageStats(messages: TriggerMessage[]) {
  const stats = { total: messages.length, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0, wrongNumber: 0, cancelled: 0, unverified: 0 };
  const triggered = new Set<string>();
  const queued = new Set<string>();
  const failed = new Set<string>();
  for (const message of messages) {
    const status = message.status.toLowerCase();
    if (triggerWrongNumber(message)) stats.wrongNumber++;
    if (['sent', 'delivered', 'read'].includes(status) && message.waMessageId) {
      stats.sent++;
      if (['delivered', 'read'].includes(status)) stats.delivered++;
      if (status === 'read') stats.read++;
      if (message.leadId) triggered.add(message.leadId);
    } else if (['pending', 'sending', 'queued'].includes(status)) {
      stats.pending++;
      if (message.leadId) queued.add(message.leadId);
    } else if (['failed', 'blocked', 'wrong_number'].includes(status)) {
      stats.failed++;
      if (message.leadId) failed.add(message.leadId);
    } else if (['cancelled', 'skipped'].includes(status)) {
      stats.cancelled++;
    } else {
      stats.unverified++;
    }
  }
  return { stats, triggeredLeads: triggered.size, queuedLeads: queued.size, failedLeads: failed.size };
}
