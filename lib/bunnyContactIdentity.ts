import { createHash } from 'node:crypto';
import { getBunnyDatabase } from '@/lib/bunnyDatabase';
import { registrationPhone } from '@/lib/registrationLeads';
import type { RegistrationRecord } from '@/lib/registrationRules';
import type { Client } from '@libsql/client';

const contactWrites = new WeakMap<Client, Promise<void>>();

export function contactScope(owner: string) {
  return ['system', 'admin', 'admincrm'].includes(owner) ? 'shared' : owner;
}

/** Preserve one permanent contact while retaining merged records as historical aliases. */
export async function persistBunnyContact(input: RegistrationRecord, owner = 'system', preserveState = true) {
  const client = getBunnyDatabase();
  const previous = contactWrites.get(client) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(resolve => { release = resolve; });
  contactWrites.set(client, current);
  await previous;
  try {
    const res = await writeBunnyContact(client, input, owner, preserveState);
    const { invalidateBunnyLeadsCache } = await import('@/lib/bunnyLeadsRepository');
    invalidateBunnyLeadsCache();
    return res;
  } finally {
    release();
    if (contactWrites.get(client) === current) contactWrites.delete(client);
  }
}

async function writeBunnyContact(client: Client, input: RegistrationRecord, owner: string, preserveState: boolean) {
  const rawPhone = registrationPhone(input.phoneNumber || input.mobile);
  const email = String(input.email || '').trim().toLowerCase();
  const invalidPhone = rawPhone && (rawPhone.length < 10 || rawPhone.length > 15);
  const phone = invalidPhone ? '' : rawPhone;
  if (!phone && !email) throw new Error('A contact requires an email or WhatsApp number.');
  if (invalidPhone) console.warn('Incoming contact has an invalid WhatsApp number; saved by email with a validation warning.');
  const scope = contactScope(owner);
  await client.execute(`CREATE TABLE IF NOT EXISTS lead_contact_identities_sql (
    scope TEXT NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL, lead_id TEXT NOT NULL,
    PRIMARY KEY(scope,kind,value))`);
  await client.execute(`CREATE TABLE IF NOT EXISTS lead_contact_sequences_sql (
    scope TEXT PRIMARY KEY, value INTEGER NOT NULL)`);
  const storedPhone = `replace(replace(replace(replace(replace(replace(
    COALESCE(json_extract(data_json, '$.phoneNumber'), ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', '')`;
  const found = await client.execute({
    sql: `SELECT document_id, data_json, created_at FROM leads_sql
      WHERE (CASE WHEN COALESCE(json_extract(data_json,'$.createdByUserId'),owner_user_id,'system')
        IN ('system','admin','admincrm') THEN 'shared'
        ELSE COALESCE(json_extract(data_json,'$.createdByUserId'),owner_user_id,'system') END) = ?
      AND (document_id = ? OR document_id IN (SELECT lead_id FROM lead_contact_identities_sql WHERE scope = ?
        AND ((kind = 'phone' AND value = ?) OR (kind = 'email' AND value = ?)))
        OR (? != '' AND CASE WHEN length(${storedPhone}) = 10 THEN '91' || ${storedPhone} ELSE ${storedPhone} END = ?)
        OR (? != '' AND lower(trim(json_extract(data_json,'$.email'))) = ?))
      ORDER BY created_at, CAST(lead_number AS INTEGER), document_id`,
    args: [scope, String(input._id || ''), scope, phone, email, phone, phone, email, email],
  });
  const contacts: RegistrationRecord[] = [];
  for (const row of found.rows) {
    let contact = { ...JSON.parse(String(row.data_json)), _id: String(row.document_id) };
    const visited = new Set<string>();
    while (contact.mergedIntoLeadId) {
      if (visited.has(contact._id)) throw new Error('Contact alias cycle requires repair.');
      visited.add(contact._id);
      const parent = await client.execute({ sql: 'SELECT data_json,document_id FROM leads_sql WHERE document_id = ?', args: [contact.mergedIntoLeadId] });
      if (!parent.rows[0]) throw new Error('Permanent merged contact is missing.');
      contact = { ...JSON.parse(String(parent.rows[0].data_json)), _id: String(parent.rows[0].document_id) };
    }
    if (!contacts.some(existing => existing._id === contact._id)) contacts.push(contact);
  }
  const existing = contacts[0];
  const now = new Date().toISOString();
  const id = existing?._id || createHash('sha256').update(`${scope}:${phone || email}`).digest('hex').slice(0, 24);
  let leadNumber = existing?.leadNumber;
  if (!leadNumber) {
    await client.execute({
      sql: `INSERT INTO lead_contact_sequences_sql(scope,value)
        SELECT ?, COALESCE(MAX(CAST(lead_number AS INTEGER)),0) FROM leads_sql WHERE 1=1
        ON CONFLICT(scope) DO UPDATE SET value = MAX(value,excluded.value)`,
      args: [scope],
    });
    const sequence = await client.execute({ sql: 'UPDATE lead_contact_sequences_sql SET value=value+1 WHERE scope=? RETURNING value', args: [scope] });
    leadNumber = String(sequence.rows[0].value).padStart(6, '0');
  }
  const aliases = [...new Set(contacts.flatMap(contact => [contact._id, ...(contact.mergedLeadIds || [])]).filter(alias => alias !== id))];
  const data: RegistrationRecord = {
    ...(existing || {}), ...input, _id: id, leadNumber,
    createdByUserId: existing?.createdByUserId || owner,
    assignedToUserId: existing?.assignedToUserId || owner,
    createdAt: existing?.createdAt || input.createdAt || now, updatedAt: now,
    phoneNumber: phone || existing?.phoneNumber || '', email: email || existing?.email || '',
    name: input.name || existing?.name || '',
    status: (preserveState ? existing?.status : input.status) || existing?.status || input.status || 'lead',
    labels: [...new Set(contacts.flatMap(contact => contact.labels || []).concat(input.labels || []))],
    isBlocked: contacts.some(contact => contact.isBlocked) || Boolean(input.isBlocked),
    metadata: { ...(existing?.metadata || {}), ...(input.metadata || {}) },
    mergedLeadIds: aliases,
    contactPhones: [...new Set([phone, ...contacts.flatMap(contact => [registrationPhone(contact.phoneNumber), ...(contact.contactPhones || [])])].filter(Boolean))],
    contactEmails: [...new Set([email, ...contacts.flatMap(contact => [String(contact.email || '').trim().toLowerCase(), ...(contact.contactEmails || [])])].filter(Boolean))],
  };
  delete data.mergedIntoLeadId;
  delete data.mergedAt;
  if (invalidPhone) data.contactValidationError = 'Submitted WhatsApp number is invalid; review the original form response before messaging.';
  const accepted = contacts.find(contact => ['sent', 'delivered', 'read'].includes(contact.metadata?.wtStatus));
  if (accepted) data.metadata.wtStatus = accepted.metadata.wtStatus;
  const templateHistory = contacts.flatMap(contact => Array.isArray(contact.metadata?.wtLastTemplates) ? contact.metadata.wtLastTemplates : []);
  if (templateHistory.length) data.metadata.wtLastTemplates = [...new Set(templateHistory)];

  const batchWrites: Array<{ sql: string; args: any[] }> = [];
  for (const contact of contacts.slice(1)) {
    batchWrites.push({
      sql: "UPDATE leads_sql SET lead_key=?,data_json=json_set(data_json,'$.mergedIntoLeadId',?,'$.mergedAt',?),updated_at=? WHERE document_id=?",
      args: [`merged#${contact._id}`, id, now, now, contact._id],
    });
    batchWrites.push({
      sql: 'UPDATE lead_contact_identities_sql SET lead_id=? WHERE scope=? AND lead_id=?',
      args: [id, scope, contact._id],
    });
  }
  batchWrites.push({
    sql: `INSERT INTO leads_sql(document_id,lead_key,owner_user_id,lead_number,data_json,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT(document_id) DO UPDATE SET
      data_json=excluded.data_json,lead_key=excluded.lead_key,lead_number=excluded.lead_number,updated_at=excluded.updated_at`,
    args: [id, `${data.createdByUserId}#${data.phoneNumber || data.email}`, data.createdByUserId, leadNumber, JSON.stringify(data), data.createdAt, now],
  });
  const identities = [{ kind: 'phone', value: phone }, { kind: 'email', value: email },
    ...contacts.flatMap(contact => [{ kind: 'phone', value: registrationPhone(contact.phoneNumber) },
      { kind: 'email', value: String(contact.email || '').trim().toLowerCase() }])];
  for (const identity of identities.filter(identity => identity.value)) {
    batchWrites.push({
      sql: `INSERT INTO lead_contact_identities_sql(scope,kind,value,lead_id) VALUES(?,?,?,?)
        ON CONFLICT(scope,kind,value) DO UPDATE SET lead_id=excluded.lead_id`,
      args: [scope, identity.kind, identity.value, id],
    });
  }

  if (batchWrites.length > 0) {
    await client.batch(batchWrites, 'write');
  }

  return data;
}
