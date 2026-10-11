import { loadBunnyLeads } from './bunnyLeadsRepository';
import { listForms, listSubmissions } from './bunny-forms-db';
import { registrationViewer, registrationLeadOwned } from './registrationAuth';
import { assembleRegistrationLeads } from './registrationLeads';

export async function offerContact(id: string, viewer: NonNullable<ReturnType<typeof registrationViewer>>) {
  const [leads, forms, submissions] = await Promise.all([loadBunnyLeads(), listForms(), listSubmissions()]);
  const visibleForms = forms.filter(form => viewer.superAdmin || form.createdBy === viewer.userId);
  const formIds = new Set(visibleForms.map(form => form.formId));
  return assembleRegistrationLeads(
    leads.filter(lead => registrationLeadOwned(lead, viewer)),
    submissions.filter(row => viewer.superAdmin || formIds.has(row.formId)),
    visibleForms,
  ).find(row => String(row.id) === id);
}
