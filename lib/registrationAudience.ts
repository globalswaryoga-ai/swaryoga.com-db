import { assembleRegistrationLeads, registrationBatchRows, registrationPhone } from '@/lib/registrationLeads';
import { readRegistrationDecisions } from '@/lib/registrationAiConfig';
import { registrationTargetMatches, type RegistrationRecord } from '@/lib/registrationRules';
import { matchesMetaBatch } from '@/lib/registrationMetaReport';
import type { RegistrationState } from '@/lib/registrationState';

export interface RegistrationAudienceRow extends RegistrationRecord {
  id: string;
  responseId: string;
  registrationBatchId: string;
  phoneNumber: string;
  leadId?: string;
}

export function registrationAudienceRows(state: RegistrationState, leads: RegistrationRecord[], submissions: RegistrationRecord[], forms: RegistrationRecord[], workshops: RegistrationRecord[]): RegistrationAudienceRow[] {
  const responses = assembleRegistrationLeads(leads, submissions, forms);
  return workshops.filter(workshop => workshop.id).flatMap(workshop => {
    const decisions = readRegistrationDecisions(state, String(workshop.id));
    const metaForm = String(workshop.metadata?.facebookFormId || workshop.metadata?.metaFormId || '');
    const meta = leads.filter(lead => matchesMetaBatch(lead, String(workshop.id), metaForm))
      .map(lead => ({ ...lead, id: String(lead._id), leadId: String(lead._id) }));
    const rows = new Map<string, RegistrationRecord>([...registrationBatchRows(responses, workshop), ...meta].map(row => [String(row.id), row]));
    return [...rows.values()].map(row => {
      const decision = decisions[row.id] || decisions[row.leadId] || {};
      return { ...row, id: `${workshop.id}:${row.id}`, responseId: String(row.id),
        registrationBatchId: String(workshop.id), workshopId: String(workshop.id), workshopName: workshop.name,
        name: row.name, email: row.email,
        language: workshop.language || row.language,
        phoneNumber: registrationPhone(row.phoneNumber || row.mobile),
        registrationDecision: decision, status: decision.status || row.status || 'new_leads' };
    });
  });
}

export function registrationAudienceMatches(row: RegistrationRecord, category: string) {
  return registrationTargetMatches({ ...row, id: row.responseId }, { [row.responseId]: row.registrationDecision || {} }, category);
}

export function registrationAudienceForBatch(rows: RegistrationRecord[], batchId: string, category: string) {
  return rows.filter(row =>
    String(row.registrationBatchId || '') === String(batchId) &&
    registrationAudienceMatches(row, category)
  );
}

export function registrationAudiencePayload(rows: RegistrationAudienceRow[], workshops: RegistrationRecord[]) {
  return {
    data: rows.map(row => ({
      id: row.id,
      responseId: row.responseId,
      registrationBatchId: row.registrationBatchId,
      leadId: row.leadId,
      name: row.name,
      email: row.email,
      phoneNumber: row.phoneNumber,
      status: row.status,
      isBlocked: row.isBlocked,
      workshopId: row.workshopId,
      workshopName: row.workshopName,
      formId: row.formId,
      language: row.language,
      assignedToUserId: row.assignedToUserId,
      labels: row.labels,
      deliveryStatus: row.deliveryStatus,
      registrationDecision: {
        status: row.registrationDecision?.status,
        copies: row.registrationDecision?.copies,
        isRejected: row.registrationDecision?.isRejected,
        isRegistered: row.registrationDecision?.isRegistered,
      },
    })),
    workshops: workshops.map(workshop => ({
      id: workshop.id,
      name: workshop.name,
      language: workshop.language,
      formId: workshop.formId,
    })),
  };
}

export function registrationRecipients(rows: RegistrationRecord[]) {
  const unique = new Map<string, RegistrationRecord>();
  for (const row of rows) {
    const phone = registrationPhone(row.phoneNumber || row.mobile);
    if (row.isBlocked || phone.length < 10 || phone.length > 15) continue;
    if (!unique.has(phone)) unique.set(phone, { ...row, _id: String(row.id || row._id), phoneNumber: phone });
  }
  return [...unique.values()];
}
