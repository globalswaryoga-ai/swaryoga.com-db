import { bunnyExecute } from '@/lib/bunnyDatabase';
import type { RegistrationRecord } from '@/lib/registrationRules';
import { registrationPhone } from '@/lib/registrationLeads';

function parse(value: unknown): any | null { try { return JSON.parse(String(value)); } catch { return null; } }
function dateMs(value: any) { const raw = value?.$date || value; const time = new Date(raw || 0).getTime(); return Number.isFinite(time) ? time : 0; }
function values(value: string | null) { return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []; }
function owned(lead: any, visibleUserIds: string[] | null, viewerUserId: string) {
  if (visibleUserIds === null) return true;
  return visibleUserIds.includes(String(lead.assignedToUserId || '')) || visibleUserIds.includes(String(lead.createdByUserId || ''));
}

export async function loadBunnyLeads() {
  const result = await bunnyExecute('SELECT document_id, data_json, created_at, updated_at FROM leads_sql');
  return result.rows.map((row: any) => {
    const lead = parse(row.data_json) || {};
    return { ...lead, _id: String(lead._id?.$oid || lead._id || row.document_id), createdAt: lead.createdAt || row.created_at, updatedAt: lead.updatedAt || row.updated_at };
  }).filter(lead => !lead.mergedIntoLeadId);
}

export async function listBunnyLeads(input: { visibleUserIds: string[] | null; viewerUserId: string; status?: string | null; workshop?: string | null; label?: string | null; source?: string | null; excludeSource?: string | null; q?: string | null; userId?: string | null; skip: number; limit: number; }) {
  let leads = await loadBunnyLeads();
  const { visibleUserIds, viewerUserId } = input;
  leads = leads.filter((lead) => owned(lead, visibleUserIds, viewerUserId));
  if (input.userId) leads = leads.filter((lead) => input.userId === '__unassigned__' ? !lead.assignedToUserId : lead.assignedToUserId === input.userId || lead.createdByUserId === input.userId);
  const statuses = values(input.status || null); if (statuses.length) leads = leads.filter((lead) => statuses.includes(String(lead.status || '')));
  const workshops = values(input.workshop || null); if (workshops.length) leads = leads.filter((lead) => workshops.includes(String(lead.workshopName || '')));
  const labels = values(input.label || null); if (labels.length) leads = leads.filter((lead) => labels.some((label) => Array.isArray(lead.labels) && lead.labels.includes(label)));
  if (input.source) leads = leads.filter((lead) => lead.source === input.source);
  const excluded = values(input.excludeSource || null); if (excluded.length) leads = leads.filter((lead) => !excluded.includes(String(lead.source || '')));
  const query = String(input.q || '').trim().toLowerCase(); if (query) leads = leads.filter((lead) => [lead.name, lead.phoneNumber, lead.email].some((value) => String(value || '').toLowerCase().includes(query)));
  leads.sort((a, b) => dateMs(b.createdAt) - dateMs(a.createdAt));
  return { leads: leads.slice(input.skip, input.skip + input.limit), total: leads.length };
}

export async function getBunnyLeadMetadata(input: { visibleUserIds: string[] | null; viewerUserId: string; source?: string | null; excludeSource?: string | null; userId?: string | null; }) {
  const result = await listBunnyLeads({ ...input, skip: 0, limit: Number.MAX_SAFE_INTEGER });
  const statusCounts: Record<string, number> = { lead: 0, hot: 0, prospect: 0, customer: 0, inactive: 0 };
  const workshopCounts: Record<string, number> = {};
  const labels = new Set<string>();
  for (const lead of result.leads) { const status = String(lead.status || ''); if (status in statusCounts) statusCounts[status] += 1; const workshop = String(lead.workshopName || '').trim(); if (workshop) workshopCounts[workshop] = (workshopCounts[workshop] || 0) + 1; if (Array.isArray(lead.labels)) lead.labels.forEach((label: any) => { if (String(label).trim()) labels.add(String(label).trim()); }); }
  return { total: result.total, statusCounts, workshops: Object.keys(workshopCounts).sort(), workshopCounts, labels: [...labels].sort() };
}

export async function getBunnyLeadByPhone(phoneNumber: string, tenantUserId?: string | null) {
  const phone = registrationPhone(phoneNumber);
  if (!phone) throw new Error('Phone number is required for contact lookup');
  const leads = (await loadBunnyLeads()).filter(lead => registrationPhone(lead.phoneNumber) === phone ||
    (lead.contactPhones || []).includes(phone));
  
  if (tenantUserId) {
    return leads.find(l => l.createdByUserId === tenantUserId || l.assignedToUserId === tenantUserId) || null;
  }
  
  return leads[0] || null;
}

export async function getBunnyLeadByEmail(email: string) {
  if (!email) return null;
  const normalised = email.trim().toLowerCase();
  return (await loadBunnyLeads()).find(lead => String(lead.email || '').trim().toLowerCase() === normalised ||
    (lead.contactEmails || []).includes(normalised)) || null;
}

export async function getBunnyLeadById(id: string) {
  const visited = new Set<string>();
  return resolveBunnyLeadAlias(id, visited);
}

async function resolveBunnyLeadAlias(id: string, visited: Set<string>): Promise<any> {
  if (visited.has(id)) throw new Error('Permanent lead alias cycle requires repair');
  visited.add(id);
  const result = await bunnyExecute({
    sql: 'SELECT document_id, data_json FROM leads_sql WHERE document_id = ?',
    args: [id]
  });
  if (!result.rows[0]) return null;
  const lead = parse(result.rows[0].data_json);
  if (lead.mergedIntoLeadId) return resolveBunnyLeadAlias(String(lead.mergedIntoLeadId), visited);
  return { ...lead, _id: String(lead._id?.$oid || lead._id || result.rows[0].document_id) };
}

export async function saveBunnyLead(lead: any, documentId?: string) {
  const { persistBunnyContact } = await import('@/lib/bunnyContactIdentity');
  const requestedId = documentId || lead._id?.$oid || lead._id;
  const existing = requestedId ? await getBunnyLeadById(String(requestedId)) : null;
  return persistBunnyContact({ ...existing, ...lead, _id: existing?._id || requestedId },
    existing?.createdByUserId || lead.createdByUserId || 'system', false);
}

export async function getBunnyLeadsByPhones(phones: string[], viewerUserId: string, superAdmin: boolean = false) {
  if (!phones.length) return [];
  const inClause = phones.map(() => '?').join(',');
  const result = await bunnyExecute({
    sql: `SELECT data_json FROM leads_sql`,
    args: []
  });
  
  const leads: RegistrationRecord[] = [];
  for (const row of result.rows) {
    const lead = parse(row.data_json);
    if (!lead || lead.mergedIntoLeadId) continue;
    
    // Check if phone matches
    if (phones.includes(lead.phoneNumber)) {
      // Check ownership
      if (superAdmin || lead.createdByUserId === viewerUserId || lead.assignedToUserId === viewerUserId) {
        leads.push({ ...lead, _id: String(lead._id?.$oid || lead._id || row.document_id) });
      }
    }
  }
  return leads;
}
