import { createHash } from 'node:crypto';
import { persistBunnyContact } from '@/lib/bunnyContactIdentity';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { bunnyBatch } from '@/lib/bunnyDatabase';
import { ensureFormTables } from '@/lib/bunny-forms-db';
import { parseRegistrationValue } from '@/lib/registrationValues';

export type GoogleFormTarget = {
  formId: string;
  name?: string;
};

export type GoogleFormLead = {
  id: string;
  leadId: string | null;
  responseId: string;
  source: 'google_forms';
  formId: string;
  name: string;
  email: string;
  mobile: string;
  phoneNumber: string;
  country: string;
  city: string;
  gender: string;
  createdAt: string;
  dynamicAnswers: Record<string, string | string[]>;
  rawAnswers: Record<string, unknown>;
  _rawRecord: Record<string, string>;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function extractGoogleFormId(value: unknown): string | null {
  const input = String(value ?? '').trim();
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.hostname !== 'docs.google.com') return null;
    const match = url.pathname.match(/^\/forms\/d\/([^/]+)(?:\/|$)/);
    if (!match || match[1] === 'e') return null;
    return match[1];
  } catch {
    return /^[a-zA-Z0-9_-]{20,}$/.test(input) ? input : null;
  }
}

export function isGoogleFormId(value: unknown): boolean {
  return extractGoogleFormId(value) !== null;
}

export function stableGoogleResponseId(response: Record<string, unknown>): string {
  const responseId = String(response.responseId ?? '').trim();
  if (responseId) return responseId;
  return `anonymous-${createHash('sha256').update(stableJson(response)).digest('hex')}`;
}

export async function fetchGoogleFormResponses(
  formId: string,
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, unknown>[]> {
  const responses: Record<string, unknown>[] = [];
  const pageTokens = new Set<string>();
  let pageToken = '';

  do {
    if (pageTokens.has(pageToken)) throw new Error('Google Forms returned a repeated page token; sync stopped without deleting saved data.');
    pageTokens.add(pageToken);
    const url = new URL(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses`);
    url.searchParams.set('pageSize', '5000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetcher(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`Google Forms responses request failed (${response.status} ${response.statusText})`);
    }
    const page = await response.json() as { responses?: Record<string, unknown>[]; nextPageToken?: string };
    if (page.responses !== undefined && !Array.isArray(page.responses)) {
      throw new Error('Google Forms returned an invalid responses page.');
    }
    responses.push(...(page.responses || []));
    pageToken = String(page.nextPageToken ?? '');
  } while (pageToken);

  return [...new Map(responses.map(response => [stableGoogleResponseId(response), response])).values()];
}

function responseValue(answer: Record<string, any>): string | string[] {
  const textValues = answer.textAnswers?.answers;
  if (Array.isArray(textValues)) {
    const values = textValues.map((item: any) => String(item?.value ?? ''));
    return values.length === 1 ? values[0] : values;
  }
  if (Array.isArray(answer.fileUploadAnswers?.answers)) {
    return answer.fileUploadAnswers.answers.map((item: any) =>
      String(item?.fileName || item?.fileId || ''),
    );
  }
  return '';
}

function asText(value: string | string[]): string {
  return Array.isArray(value) ? value.join(', ') : value;
}

export function mapGoogleFormResponses(
  formId: string,
  formData: Record<string, any>,
  responses: Record<string, any>[],
): { leads: GoogleFormLead[]; questionMap: Record<string, string> } {
  const questionMap: Record<string, string> = {};
  for (const item of formData.items ?? []) {
    const questionId = item?.questionItem?.question?.questionId;
    if (questionId) questionMap[String(questionId)] = String(item.title || `Question ${questionId}`);
  }

  const leads = responses.map((response): GoogleFormLead => {
    const responseId = stableGoogleResponseId(response);
    const record: Record<string, string> = {};
    const dynamicAnswers: Record<string, string | string[]> = {};
    const rawAnswers: Record<string, unknown> = {};
    const answers = response.answers && typeof response.answers === 'object' ? response.answers : {};

    for (const [questionId, answer] of Object.entries(answers) as [string, Record<string, any>][]) {
      const title = questionMap[String(answer.questionId || questionId)] || `Question ${answer.questionId || questionId}`;
      const value = responseValue(answer);
      rawAnswers[questionId] = { questionId: answer.questionId || questionId, title, answer };
      if (value === '' || (Array.isArray(value) && value.every((item) => !item))) continue;
      const answerKey = Object.prototype.hasOwnProperty.call(dynamicAnswers, title)
        ? `${title} (${answer.questionId || questionId})`
        : title;
      dynamicAnswers[answerKey] = value;
      record[answerKey] = asText(value);
    }

    if (response.respondentEmail) record.email = String(response.respondentEmail);

    const findValue = (keywords: string[]): string => {
      for (const keyword of keywords) {
        const key = Object.keys(record).find((candidate) => candidate.toLowerCase().includes(keyword));
        if (key && record[key]) return record[key];
      }
      return '';
    };

    const name = findValue(['full name', 'your name', 'name', 'first', 'pura naam', 'poora naam', 'नाव', 'नाम', 'naam']);
    const email = findValue(['email', 'mail', 'ईमेल']);
    const mobile = findValue(['mobile', 'phone', 'whatsapp', 'contact', 'number', 'नंबर', 'नम्बर']);
    const country = findValue(['country', 'nation', 'देश']);
    const city = findValue(['city', 'town', 'location', 'शहर']);
    const gender = findValue(['gender', 'sex', 'लिंग']);
    const createdAt = String(response.createTime || '');

    return {
      id: responseId,
      leadId: null,
      responseId,
      source: 'google_forms',
      formId,
      name,
      email,
      mobile,
      phoneNumber: mobile,
      country,
      city,
      gender,
      createdAt,
      dynamicAnswers,
      rawAnswers,
      _rawRecord: record,
    };
  });

  return { leads, questionMap };
}

export async function persistGoogleFormSubmission(input: {
  formId: string;
  responseId: string;
  source?: string;
  name?: string;
  email?: string;
  mobile?: string;
  gender?: string;
  city?: string;
  answers?: Record<string, unknown>;
  rawAnswers?: Record<string, unknown>;
  createdAt?: string;
}): Promise<{ id: string; inserted: boolean }> {
  await ensureFormTables();
  const id = `gform_${createHash('sha256').update(`${input.formId}\u0000${input.responseId}`).digest('hex').slice(0, 40)}`;
  const results = await bunnyBatch([{
    sql: `INSERT INTO form_submissions
      (id, form_id, name, mobile, email, gender, city, answers, form_data, created_at, source, raw_answers)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM form_submissions WHERE form_id = ? AND form_data = ?)`,
    args: [
      id,
      input.formId,
      input.name || '',
      input.mobile || '',
      input.email || '',
      input.gender || '',
      input.city || '',
      JSON.stringify(input.answers || {}),
      input.responseId,
      input.createdAt || null,
      input.source || 'google_forms',
      JSON.stringify(input.rawAnswers || {}),
      input.formId,
      input.responseId,
    ],
  }, {
    sql: `UPDATE form_submissions
      SET name = ?, mobile = ?, email = ?, gender = ?, city = ?, answers = ?,
          source = ?, raw_answers = ?, created_at = COALESCE(?, created_at)
      WHERE form_id = ? AND form_data = ?`,
    args: [
      input.name || '', input.mobile || '', input.email || '', input.gender || '', input.city || '',
      JSON.stringify(input.answers || {}), input.source || 'google_forms',
      JSON.stringify(input.rawAnswers || {}), input.createdAt || null, input.formId, input.responseId,
    ],
  }, {
      sql: `UPDATE enquiry_forms SET submission_count = (
        SELECT COUNT(DISTINCT CASE WHEN (source = 'google_forms' OR id LIKE 'gform_%') AND form_data != ''
          THEN 'google:' || form_data ELSE 'crm:' || id END)
        FROM form_submissions WHERE form_id = ?) WHERE form_id = ?`,
      args: [input.formId, input.formId],
  }, {
      sql: 'SELECT id FROM form_submissions WHERE form_id = ? AND form_data = ? ORDER BY id LIMIT 1',
      args: [input.formId, input.responseId],
  }]);
  const savedId = results[3].rows[0]?.id;
  if (!savedId) throw new Error(`Could not persist Google Form response ${input.responseId}.`);
  const form = await bunnyExecute({ sql: 'SELECT created_by FROM enquiry_forms WHERE form_id=?', args: [input.formId] });
  if (input.email || input.mobile) {
    const contact = await persistBunnyContact({
      name: input.name, email: input.email, phoneNumber: input.mobile, source: 'google_forms',
      labels: ['form-submission', 'google_forms'], metadata: { formId: input.formId }, createdAt: input.createdAt,
    }, String(form.rows[0]?.created_by || 'system'));
    await bunnyExecute({ sql: 'UPDATE form_submissions SET lead_id=? WHERE id=?', args: [contact._id, String(savedId)] });
  }
  return { id: String(savedId), inserted: Number(results[0].rowsAffected) > 0 };
}

/**
 * Saved responses for a form, keyed by response ID → linked CRM lead ID.
 *
 * A sync that re-writes every response on every run spends its whole execution
 * budget on records that are already saved, so it never reaches the newest
 * responses. Reading what is already stored first lets a run process only the
 * delta — and repair responses that were saved but never linked to a lead.
 */
export async function savedGoogleResponseLeadIds(formId: string): Promise<Map<string, string>> {
  await ensureFormTables();
  const result = await bunnyExecute({
    sql: `SELECT form_data, lead_id FROM form_submissions
      WHERE form_id = ? AND form_data != '' AND (source = 'google_forms' OR id LIKE 'gform_%')`,
    args: [formId],
  });
  return new Map(result.rows.map(row => [String(row.form_data || ''), String(row.lead_id || '')]));
}

/**
 * Responses that still need work on this run.
 *
 * A response needs work when it was never saved, or when it was saved but never
 * linked to a CRM lead (an earlier run that was cut off mid-write). Re-wrapping
 * the saved-and-linked ones is what previously burned the whole execution
 * budget, so the tail of the response list was never imported. `refreshAll`
 * re-processes everything, e.g. after the form's questions changed.
 */
export function pendingGoogleFormLeads<
  T extends { responseId: string; email?: string; mobile?: string },
>(leads: T[], savedLeadIds: Map<string, string>, refreshAll = false): { pending: T[]; alreadySaved: number } {
  if (refreshAll) return { pending: [...leads], alreadySaved: 0 };
  const pending = leads.filter(lead => {
    if (!savedLeadIds.has(lead.responseId)) return true;
    return !savedLeadIds.get(lead.responseId) && Boolean(lead.email || lead.mobile);
  });
  return { pending, alreadySaved: leads.length - pending.length };
}

export function collectGoogleFormTargets(
  registeredForms: Array<{ formId?: string; workshopName?: string; isActive?: boolean }>,
  savedState: Record<string, unknown> | null,
): GoogleFormTarget[] {
  const targets = new Map<string, GoogleFormTarget>();
  const add = (value: unknown, name?: unknown, explicit = false) => {
    const formId = extractGoogleFormId(value);
    if (!formId || (!explicit && !isGoogleFormId(value))) return;
    const previous = targets.get(formId);
    targets.set(formId, { formId, name: String(name || previous?.name || '').trim() || undefined });
  };

  for (const form of registeredForms) {
    if (form.isActive === false) continue;
    add(form.formId, form.workshopName);
  }

  if (!savedState) return [...targets.values()];
  for (const key of ['crm_workshops', ...['english', 'hindi', 'marathi', 'kannada'].map(language => `crm_${language}_workshops`)]) {
    let workshops: unknown = savedState[key] ?? [];
    for (let depth = 0; depth < 4 && typeof workshops === 'string'; depth++) {
      workshops = parseRegistrationValue<unknown>(workshops, []);
    }
    if (!Array.isArray(workshops)) throw new Error(`Invalid saved Google workshop list: ${key}`);
    for (const workshop of workshops as Record<string, any>[]) {
      if (!workshop || workshop.isActive === false) continue;
      const metadata = workshop.metadata || {};
      const isGoogle = String(metadata.formSource || '').toLowerCase() === 'google';
      add(workshop.formId, workshop.name, isGoogle);
      for (const link of [
        workshop.googleFormUrl,
        workshop.googleFormLink,
        metadata.googleFormId,
        metadata.googleFormUrl,
        metadata.googleFormLink,
      ]) add(link, workshop.name, true);
    }
  }

  for (const [key, value] of Object.entries(savedState)) {
    if (/^crm_(english|hindi|marathi|kannada)_google_form_url(?:_|$)/i.test(key)) {
      add(value, key, true);
    }
  }
  return [...targets.values()];
}
