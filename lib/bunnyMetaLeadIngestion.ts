import { createHash } from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getBunnyLeadById } from '@/lib/bunnyLeadsRepository';
import { normalizePhone } from '@/lib/whatsapp';
import type { RegistrationRecord } from '@/lib/registrationRules';
import { leadDateIso } from '@/lib/leadDate';
import { persistBunnyContact } from '@/lib/bunnyContactIdentity';

export async function persistMetaFormLead(input: RegistrationRecord) {
  const metadata = input.metadata || {};
  const eventId = String(metadata.metaLeadId || metadata.leadgen_id || metadata.metaLeadgenId || '').replace(/^meta_/, '');
  const formId = String(metadata.metaFormId || input.formSource?.match(/^form_(.+)$/)?.[1] || '');
  if (!eventId || !formId) throw new Error('Meta lead event ID and form ID are required');
  const phone = normalizePhone(input.phoneNumber || '');
  const email = String(input.email || '').trim().toLowerCase();
  if (!phone && !email) throw new Error('Meta lead requires a phone number or email');
  const findExisting = async (): Promise<RegistrationRecord | undefined> => {
    const storedPhone = `replace(replace(replace(replace(replace(replace(
      COALESCE(json_extract(data_json, '$.phoneNumber'), ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', '')`;
    const result = await bunnyExecute({
      sql: `SELECT document_id, data_json, created_at FROM leads_sql
        WHERE COALESCE(json_extract(data_json, '$.createdByUserId'), owner_user_id) IN ('system', 'admin', 'admincrm')
        AND (json_extract(data_json, '$.metadata.metaLeadId') = ?
          OR json_extract(data_json, '$.metadata.leadgen_id') = ?
          OR json_extract(data_json, '$.metadata.metaLeadgenId') = ?
          OR (? != '' AND CASE WHEN length(${storedPhone}) = 10 THEN '91' || ${storedPhone} ELSE ${storedPhone} END = ?)
          OR (? != '' AND lower(trim(json_extract(data_json, '$.email'))) = ?))
        ORDER BY CASE WHEN json_extract(data_json, '$.metadata.metaLeadId') = ? THEN 0 ELSE 1 END, created_at, document_id LIMIT 1`,
      args: [eventId, eventId, `meta_${eventId}`, phone, phone, email, email, eventId],
    });
    const row = result.rows[0];
    if (!row) return undefined;
    const lead = JSON.parse(String(row.data_json));
    return { ...lead, _id: String(row.document_id), createdAt: leadDateIso(lead.createdAt) || leadDateIso(row.created_at) || lead.createdAt || row.created_at };
  };
  let existing = await findExisting();
  const now = new Date().toISOString();
  const id = existing?._id || `meta_${createHash('sha256').update(eventId).digest('hex')}`;
  const canonicalMetadata = { rawFieldData: metadata.rawFieldData || [], metaLeadId: eventId, leadgen_id: eventId,
    metaLeadgenId: `meta_${eventId}`, metaFormId: formId };
  const lead = { ...input, _id: id, phoneNumber: phone, email, metadata: canonicalMetadata,
    createdByUserId: 'system', status: 'new', createdAt: input.createdAt || now, updatedAt: now };
  existing = await persistBunnyContact(lead, 'system');
  const patch: RegistrationRecord = { metadata: canonicalMetadata, updatedAt: now };
  for (const field of ['name', 'email', 'phoneNumber', 'workshopId', 'workshopName']) {
    const value = field === 'phoneNumber' ? phone : field === 'email' ? email : input[field];
    if (value && value !== 'Unknown Workshop' && value !== 'Unknown') patch[field] = value;
  }
  patch.labels = [...new Set([...(existing.labels || []), ...(input.labels || []), 'meta_instant_form'])];
  await bunnyExecute({
    sql: 'UPDATE leads_sql SET data_json = json_patch(data_json, ?), updated_at = ? WHERE document_id = ?',
    args: [JSON.stringify(patch), now, String(existing._id)],
  });
  const saved = await getBunnyLeadById(String(existing._id));
  if (!saved) throw new Error('Saved Meta lead is unavailable');
  return saved;
}
