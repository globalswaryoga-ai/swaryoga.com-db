type LeadRecord = Record<string, any>;

export function registrationLanguage(value: unknown): string {
  const text = String(value || '').toLowerCase();
  return ['english', 'hindi', 'marathi', 'kannada'].find(language => text.includes(language)) || '';
}

export function registrationFormId(value: unknown): string {
  const text = String(value || '').trim();
  return text.match(/\/forms\/d\/(?!e\/)([\w-]+)/)?.[1] || text;
}

export function assembleRegistrationLeads(leads: LeadRecord[], submissions: LeadRecord[], forms: LeadRecord[]) {
  const formMap = new Map(forms.map(form => [form.formId, form]));
  const byPhone = new Map<string, number>();
  const byEmail = new Map<string, number>();
  leads.forEach((lead, index) => {
    const phone = String(lead.phoneNumber || '').replace(/\D/g, '');
    const email = String(lead.email || '').trim().toLowerCase();
    if (phone && !byPhone.has(phone)) byPhone.set(phone, index);
    if (email && !byEmail.has(email)) byEmail.set(email, index);
  });
  const represented = new Set<string>();
  const rows: LeadRecord[] = submissions.map(submission => {
    const form = formMap.get(submission.formId);
    const phone = String(submission.mobile || '').replace(/\D/g, '');
    const email = String(submission.email || '').trim().toLowerCase();
    // Keep the first matching record, including when phone and email match different contacts.
    const matchIndex = Math.min(byPhone.get(phone) ?? Infinity, byEmail.get(email) ?? Infinity);
    const lead = leads[matchIndex];
    if (lead) represented.add(String(lead._id));
    const metadata = lead?.metadata || {};
    return {
      ...lead,
      ...submission,
      leadId: lead?._id,
      phoneNumber: submission.mobile || lead?.phoneNumber || '',
      createdAt: submission.submittedAt,
      workshopName: form?.workshopName || lead?.workshopName || submission.formId,
      workshopId: form?.workshopId || metadata.workshopId || lead?.workshopId,
      language: metadata.workshopLanguage || metadata.language || lead?.language || registrationLanguage(form?.workshopName),
      source: submission.source === 'google_forms' || metadata.googleFormId === submission.formId ? 'google_forms' : 'crm_form',
      _rawRecord: submission.dynamicAnswers || submission.answers || {},
    };
  });
  for (const lead of leads) {
    if (represented.has(String(lead._id))) continue;
    const metadata = lead.metadata?.lastEnquiry || lead.metadata || {};
    if (!['google_forms', 'website-form', 'form-link', 'workshop-registration-url', 'google_form', 'crm_form'].includes(lead.source) &&
        !(lead.labels || []).some((label: string) => ['enquiry', 'form-submission', 'Google Form Lead', 'workshop-registration'].includes(label))) continue;
    rows.push({
      ...lead,
      id: String(lead._id),
      leadId: String(lead._id),
      mobile: lead.phoneNumber,
      formId: metadata.googleFormId || metadata.formId || metadata.workshopId || '',
      language: metadata.workshopLanguage || metadata.language || lead.language || registrationLanguage(lead.workshopName),
      dynamicAnswers: lead.dynamicAnswers || metadata.dynamicAnswers || metadata,
      _rawRecord: lead._rawRecord || metadata.rawRecord || metadata.dynamicAnswers || metadata,
    });
  }
  return rows;
}

export function filterRegistrationLeads(rows: LeadRecord[], formId: string, language: string) {
  return rows.filter(row => {
    if (formId) return registrationFormId(row.formId) === registrationFormId(formId) || row.workshopId === formId;
    const rowLanguage = registrationLanguage(row.language || row.workshopName);
    return !language || !rowLanguage || rowLanguage === registrationLanguage(language);
  });
}

export function registrationBatchRows(rows: LeadRecord[], workshop: LeadRecord) {
  if (!workshop.formId) return [];
  const language = registrationLanguage(workshop.language || workshop.name);
  const scoped = filterRegistrationLeads(rows, String(workshop.formId), language).filter(row => {
    const rowLanguage = registrationLanguage(row.language || row.workshopName);
    return !language || !rowLanguage || language === rowLanguage;
  });
  const keyword = workshop.formFilterKeyword || workshop.metadata?.formFilterKeyword;
  if (!keyword) return scoped;
  const mappedQuestion = workshop.metadata?.googleFormMapping?.['AI-7'] || workshop.metadata?.googleFormMapping?.ai7;
  const options = String(keyword).toLowerCase().split('|').map(value => value.trim()).filter(Boolean);
  return scoped.filter(row => {
    const raw = row._rawRecord || {};
    const values = mappedQuestion ? [raw[mappedQuestion]] : Object.values(raw);
    return values.some(value => options.includes(String(value ?? '').trim().toLowerCase()));
  });
}
