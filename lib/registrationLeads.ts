type LeadRecord = Record<string, any>;

export function registrationPhone(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export function uniqueRegistrationSubmissions(submissions: LeadRecord[]) {
  const unique = new Map<string, LeadRecord>();
  for (const submission of submissions) {
    const google = submission.source === 'google_forms' || String(submission.id || '').startsWith('gform_');
    const responseId = submission.responseId || (google ? submission.formData : '');
    const key = `${registrationFormId(submission.formId)}\u0000${responseId || submission.id}`;
    const previous = unique.get(key);
    if (!previous || String(submission.id) < String(previous.id)) unique.set(key, submission);
  }
  return [...unique.values()];
}

export function mergeRegistrationSnapshot(previous: LeadRecord[], incoming: LeadRecord[], formId: string) {
  const normalizedForm = registrationFormId(formId);
  const otherForms = previous.filter(row => registrationFormId(row.formId) !== normalizedForm);
  return [...otherForms, ...uniqueRegistrationSubmissions(incoming)];
}

export function registrationTextFiltersMatch(lead: LeadRecord, filters: string[]) {
  const values = [lead.name, lead.email, lead.mobile, lead.city, lead.country, lead.gender,
    ...Object.values(lead.dynamicAnswers || {}), ...Object.values(lead._rawRecord || {})]
    .filter(Boolean).map(value => String(value).toLowerCase());
  return filters.filter(Boolean).every(filter => values.some(value => value.includes(filter.toLowerCase())));
}

export function registrationSnapshotBatchCount(rows: LeadRecord[], batch: LeadRecord) {
  const scoped = rows.filter(row => registrationFormId(row.formId) === registrationFormId(batch.formId));
  const language = registrationLanguage(batch.language || batch.name);
  const question = batch.metadata?.googleFormMapping?.['AI-7'] || batch.metadata?.googleFormMapping?.ai7;
  const keywords = String(batch.formFilterKeyword || batch.metadata?.mainFilter || '').toLowerCase().split('|').map(value => value.trim()).filter(Boolean);
  return scoped.filter(row => {
    if (String(batch.id).startsWith('master_') && language && registrationLanguage(row.language || row.workshopName) !== language) return false;
    const values = question ? [row._rawRecord?.[question]] : [
      row.name, row.email, row.mobile, row.city, row.country, row.gender,
      ...Object.values(row.dynamicAnswers || {}), ...Object.values(row._rawRecord || {}),
    ];
    const keywordMatches = !keywords.length || keywords.some(keyword => values.some(value => {
      const text = String(value || '').toLowerCase().trim();
      return text === keyword || (keyword.split(/\s+/).length <= 3 && text.includes(keyword));
    }));
    return keywordMatches && registrationTextFiltersMatch(row, [batch.metadata?.subFilter || '']);
  }).length;
}

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
  const byId = new Map<string, number>();
  leads.forEach((lead, index) => {
    const phone = registrationPhone(lead.phoneNumber);
    const email = String(lead.email || '').trim().toLowerCase();
    if (phone && !byPhone.has(phone)) byPhone.set(phone, index);
    if (email && !byEmail.has(email)) byEmail.set(email, index);
    for (const alias of [lead._id, ...(lead.mergedLeadIds || [])]) byId.set(String(alias), index);
    for (const alias of lead.contactPhones || []) if (!byPhone.has(alias)) byPhone.set(alias, index);
    for (const alias of lead.contactEmails || []) if (!byEmail.has(alias)) byEmail.set(alias, index);
  });
  const represented = new Set<string>();
  const submittedForms = new Set(submissions.map(submission => registrationFormId(submission.formId)));
  const rows: LeadRecord[] = uniqueRegistrationSubmissions(submissions).map(submission => {
    const form = formMap.get(submission.formId);
    const phone = registrationPhone(submission.mobile);
    const email = String(submission.email || '').trim().toLowerCase();
    // Keep the first matching record, including when phone and email match different contacts.
    const matchIndex = byId.get(String(submission.leadId)) ?? Math.min(byPhone.get(phone) ?? Infinity, byEmail.get(email) ?? Infinity);
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
    const googleForm = lead.googleFormId || metadata.googleFormId || metadata.lastGoogleFormSubmission?.formId;
    // A linked CRM contact is not an additional Google response.
    if (googleForm && submittedForms.has(registrationFormId(googleForm))) continue;
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

function registrationMappedBatchFields(row: LeadRecord, workshop: LeadRecord): LeadRecord {
  const source = row._rawRecord || row.dynamicAnswers || row.answers || {};
  const raw = source && typeof source === 'object'
    ? { ...source, ...(source.dynamicAnswers && typeof source.dynamicAnswers === 'object' ? source.dynamicAnswers : {}) }
    : {};
  const mapping = workshop.metadata?.googleFormMapping || {};
  const normalize = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const answer = (aliases: string[], fallback: unknown) => {
    const aliasSet = new Set(aliases.map(normalize));
    const mappedQuestion = Object.entries(mapping).find(([field]) => aliasSet.has(normalize(field)))?.[1];
    if (mappedQuestion && raw[String(mappedQuestion)] !== undefined && raw[String(mappedQuestion)] !== '') {
      return raw[String(mappedQuestion)];
    }
    const directKey = Object.keys(raw).find(key => aliasSet.has(normalize(key)));
    return directKey ? raw[directKey] : fallback;
  };
  const name = answer(['name', 'full name'], row.name || row.Name);
  const email = answer(['email', 'email address'], row.email || row.Email);
  const mobile = answer(['mobile', 'phone', 'phone number', 'whatsapp', 'whatsapp number', 'contact', 'contact number'],
    row.phoneNumber || row.mobile || row.phone || row.whatsapp || row.WhatsApp || row.Contact);
  return {
    ...row,
    name,
    email,
    mobile,
    phoneNumber: mobile,
    _rawRecord: raw,
  };
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
  }).map(row => registrationMappedBatchFields(row, workshop));
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
