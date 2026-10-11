import { persistBunnyContact } from '@/lib/bunnyContactIdentity';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { listForms, listSubmissions } from '@/lib/bunny-forms-db';
import { registrationLeadOwned, type registrationViewer } from '@/lib/registrationAuth';
import { readRegistrationState, registrationWorkshops } from '@/lib/registrationState';
import { registrationAudienceRows, registrationRecipients } from '@/lib/registrationAudience';
import { registrationPhone } from '@/lib/registrationLeads';
import type { RegistrationRecord } from '@/lib/registrationRules';

type Viewer = NonNullable<ReturnType<typeof registrationViewer>>;

export async function loadRegistrationAudience(viewer: Viewer) {
  const [state, allLeads, allForms, submissions] = await Promise.all([
    readRegistrationState(viewer.superAdmin ? 'shared' : viewer.userId), loadBunnyLeads(), listForms(), listSubmissions(),
  ]);
  const leads = allLeads.filter(lead => registrationLeadOwned(lead, viewer));
  const forms = allForms.filter(form => viewer.superAdmin || form.createdBy === viewer.userId);
  const formIds = new Set(forms.map(form => form.formId));
  return { state, leads, rows: registrationAudienceRows(state, leads,
    submissions.filter(row => viewer.superAdmin || formIds.has(row.formId)), forms, registrationWorkshops(state)) };
}

export async function mapRegistrationRecipients(rows: RegistrationRecord[], viewer: Viewer) {
  const contacts = registrationRecipients(rows);
  if (!contacts.length) throw new Error('No selected responses have a valid, unblocked WhatsApp number.');
  const owner = viewer.superAdmin ? 'admincrm' : viewer.userId;
  const mapped: RegistrationRecord[] = [];
  const phoneContacts = new Map<string, RegistrationRecord>();
  const refreshContacts = async () => {
    for (const lead of await loadBunnyLeads()) {
      if (!registrationLeadOwned(lead, viewer)) continue;
      const phone = registrationPhone(lead.phoneNumber);
      if (phone && (!phoneContacts.has(phone) || lead.isBlocked)) phoneContacts.set(phone, lead);
    }
  };
  await refreshContacts();
  for (const row of contacts) {
    const phone = registrationPhone(row.phoneNumber);
    let contact = phoneContacts.get(phone);
    if (!contact) {
      contact = await persistBunnyContact({ name: row.name || '', email: row.email || '', phoneNumber: phone,
        source: 'form-submission', status: 'lead', labels: ['form-submission'],
        metadata: { formId: row.formId, registrationResponseId: row.responseId } }, owner);
      phoneContacts.set(phone, contact);
    }
    if (contact.isBlocked) throw new Error('A selected response belongs to a blocked CRM contact. Remove it before sending.');
    mapped.push({ ...row, leadId: String(contact._id), phoneNumber: phone });
  }
  return mapped;
}
