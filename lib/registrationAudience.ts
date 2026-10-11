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
      const raw = row._rawRecord || row.dynamicAnswers || {};
      const mapping = workshop.metadata?.googleFormMapping || {};
      const value = (keys: string[], fallback: unknown) => {
        const column = keys.map(key => mapping[key]).find(Boolean);
        return column ? raw[column] || fallback : fallback;
      };
      return { ...row, id: `${workshop.id}:${row.id}`, responseId: String(row.id),
        registrationBatchId: String(workshop.id), workshopId: String(workshop.id), workshopName: workshop.name,
        name: value(['Name', 'NAME'], row.name), email: value(['Email', 'EMAIL'], row.email),
        language: workshop.language || row.language,
        phoneNumber: registrationPhone(value(['Mobile', 'MOBILE', 'WhatsApp Number'], row.phoneNumber || row.mobile)),
        registrationDecision: decision, status: decision.status || row.status || 'new_leads' };
    });
  });
}

export function registrationAudienceMatches(row: RegistrationRecord, category: string) {
  return registrationTargetMatches({ ...row, id: row.responseId }, { [row.responseId]: row.registrationDecision || {} }, category);
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
