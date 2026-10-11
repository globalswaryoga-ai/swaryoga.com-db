import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { registrationViewer, registrationLeadOwned } from '@/lib/registrationAuth';
import { saveBunnyLead, loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { registrationPhone } from '@/lib/registrationLeads';
import { resolveGoogleAccounts, getGoogleAccessToken, refreshGoogleAccessToken, type GoogleAccount } from '@/lib/googleFormsAccounts';
import {
  createForm,
  createQuestion,
  ensureFormTables,
  getFormById,
} from '@/lib/bunny-forms-db';
import {
  extractGoogleFormId,
  fetchGoogleFormResponses,
  mapGoogleFormResponses,
  persistGoogleFormSubmission,
} from '@/lib/googleFormsSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorizedCron(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization') || '';
  if (!expected || !provided.startsWith('Bearer ')) return false;
  const token = provided.slice(7);
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);
  return expectedBuffer.length === tokenBuffer.length && timingSafeEqual(expectedBuffer, tokenBuffer);
}

async function fetchFormUsingAccount(formId: string, entry: GoogleAccount) {
  let accessToken = await getGoogleAccessToken(entry);
  let formResponse = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (formResponse.status === 401 && entry.account.refreshToken) {
    accessToken = await refreshGoogleAccessToken(entry);
    formResponse = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30_000),
    });
  }
  if (!formResponse.ok) {
    return { error: `Google Form access failed (${formResponse.status} ${formResponse.statusText}).` };
  }
  return { formData: await formResponse.json() as Record<string, any>, accessToken };
}

async function syncGoogleForm(request: NextRequest, scope: string) {
  const url = new URL(request.url);
  const rawFormUrl = url.searchParams.get('url');
  const customName = url.searchParams.get('name')?.trim();
  const formId = extractGoogleFormId(rawFormUrl);
  if (!formId) {
    return NextResponse.json({
      error: 'Provide a Google Forms edit URL or Google Form ID. Public response URLs are not supported.',
    }, { status: 400 });
  }

  const accounts = await resolveGoogleAccounts(scope);
  if (!accounts.length) {
    return NextResponse.json({ error: 'Google Account not connected. Reconnect Google Forms.', needsAuth: true }, { status: 401 });
  }

  let formData: Record<string, any> | null = null;
  let accessToken = '';
  const accountUserId = scope === 'shared' ? 'admincrm' : scope;
  const accountErrors: string[] = [];

  for (const accountEntry of accounts) {
    try {
      const result = await fetchFormUsingAccount(formId, accountEntry);
      if (!result.formData) {
        accountErrors.push(result.error);
        continue;
      }
      formData = result.formData;
      accessToken = result.accessToken;
      break;
    } catch (error) {
      accountErrors.push(error instanceof Error ? error.message : 'Google account lookup failed.');
    }
  }

  if (!formData) {
    return NextResponse.json({
      error: `Could not access the Google Form. Ensure a connected account has edit access. ${accountErrors.join('; ')}`.trim(),
      needsAuth: true,
    }, { status: 403 });
  }

  const responses = await fetchGoogleFormResponses(formId, accessToken);
  const { leads, questionMap } = mapGoogleFormResponses(formId, formData, responses);
  const formTitle = customName || String(formData.info?.title || 'Google Form');

  await ensureFormTables();
  const existingForm = await getFormById(formId);
  const formOwner = String(existingForm?.createdBy || '').trim();
  const allowedFormOwner = scope === 'shared'
    ? ['', 'admin', 'admincrm', 'system'].includes(formOwner)
    : formOwner === scope;
  if (existingForm && !allowedFormOwner) {
    return NextResponse.json({ error: 'This Google Form is registered under a different CRM account.' }, { status: 403 });
  }
  if (!existingForm) {
    await createForm({
      formId,
      workshopName: formTitle,
      description: String(formData.info?.description || ''),
      workshopMode: 'online',
      price: 0,
    });
    await bunnyExecute({
      sql: 'UPDATE enquiry_forms SET created_by = ? WHERE form_id = ?',
      args: [scope === 'shared' ? 'admincrm' : scope, formId],
    });
    let sortOrder = 1;
    for (const item of formData.items || []) {
      const question = item?.questionItem?.question;
      if (!question) continue;
      let questionType = 'text';
      let options: Array<{ value: string; label: { en: string } }> = [];
      if (question.choiceQuestion) {
        if (question.choiceQuestion.type === 'RADIO') questionType = 'radio';
        else if (question.choiceQuestion.type === 'CHECKBOX') questionType = 'checkbox';
        else if (question.choiceQuestion.type === 'DROP_DOWN') questionType = 'dropdown';
        options = (question.choiceQuestion.options || []).map((option: any) => ({
          value: String(option.value || ''),
          label: { en: String(option.value || '') },
        }));
      } else if (question.textQuestion?.paragraph) {
        questionType = 'paragraph';
      }
      await createQuestion({
        formId,
        fieldKey: `q_${question.questionId}`,
        questionType,
        label_en: String(item.title || 'Question'),
        options: options.length ? options : undefined,
        required: Boolean(question.required),
        sortOrder: sortOrder++,
      });
    }
  } else if (customName) {
    await bunnyExecute({
      sql: 'UPDATE enquiry_forms SET workshop_name = ? WHERE form_id = ?',
      args: [customName, formId],
    });
  }

  const existingLeads = (await loadBunnyLeads()).filter((lead: any) =>
    registrationLeadOwned(lead, {
      userId: accountUserId,
      superAdmin: scope === 'shared',
    }),
  );
  const errors: Array<{ responseId: string; stage: 'submission' | 'lead'; error: string }> = [];
  let persistedSubmissions = 0;
  let insertedSubmissions = 0;
  let syncedLeads = 0;

  for (const lead of leads) {
    try {
      const saved = await persistGoogleFormSubmission({
        formId,
        responseId: lead.responseId,
        source: lead.source,
        name: lead.name,
        email: lead.email,
        mobile: lead.mobile,
        gender: lead.gender,
        city: lead.city,
        answers: lead.dynamicAnswers,
        rawAnswers: lead.rawAnswers,
        createdAt: lead.createdAt,
      });
      lead.id = saved.id;
      persistedSubmissions += 1;
      if (saved.inserted) insertedSubmissions += 1;
    } catch (error) {
      errors.push({
        responseId: lead.responseId,
        stage: 'submission',
        error: error instanceof Error ? error.message : 'Bunny submission write failed.',
      });
      continue;
    }

    const phone = registrationPhone(lead.phoneNumber);

    try {
      const matchingIndex = existingLeads.findIndex((candidate: any) => {
        const existingPhone = registrationPhone(candidate.phoneNumber);
        const phoneMatches = phone.length >= 10 && existingPhone === phone;
        const emailMatches = Boolean(lead.email) &&
          String(candidate.email || '').trim().toLowerCase() === lead.email.toLowerCase();
        return phoneMatches || Boolean(emailMatches);
      });
      const submissionMetadata = {
        formId,
        responseId: lead.responseId,
        formTitle,
        submittedAt: lead.createdAt || new Date().toISOString(),
        dynamicAnswers: lead.dynamicAnswers,
        rawAnswers: lead.rawAnswers,
      };

      if (matchingIndex >= 0) {
        const existing = existingLeads[matchingIndex] as Record<string, any>;
        const updatedLead = {
          ...existing,
          email: existing.email || lead.email,
          city: existing.city || lead.city,
          country: existing.country || lead.country,
          dynamicAnswers: lead.dynamicAnswers,
          googleFormId: formId,
          metadata: {
            ...(existing.metadata || {}),
            googleFormId: formId,
            lastGoogleFormSubmission: submissionMetadata,
          },
          labels: Array.from(new Set([...(existing.labels || []), 'Google Form Lead', formTitle])),
        };
        const savedLead = await saveBunnyLead(updatedLead);
        existingLeads[matchingIndex] = savedLead;
        lead.leadId = String(savedLead._id || savedLead.id || '') || null;
      } else {
        if (phone.length < 10) continue;
        const newLead = await saveBunnyLead({
          name: lead.name || 'Unknown User',
          phoneNumber: phone,
          email: lead.email,
          city: lead.city,
          country: lead.country,
          source: 'google_forms',
          workshopName: formTitle,
          status: 'new',
          labels: ['Google Form Lead', formTitle].filter(Boolean),
          createdByUserId: accountUserId,
          assignedToUserId: accountUserId,
          googleFormId: formId,
          dynamicAnswers: lead.dynamicAnswers,
          metadata: {
            formType: 'google_forms',
            googleFormId: formId,
            lastGoogleFormSubmission: submissionMetadata,
          },
        }, `google_contact_${accountUserId}_${phone}`);
        existingLeads.push(newLead);
        lead.leadId = String(newLead._id || newLead.id || '') || null;
      }
      syncedLeads += 1;
    } catch (error) {
      errors.push({
        responseId: lead.responseId,
        stage: 'lead',
        error: error instanceof Error ? error.message : 'CRM lead write failed.',
      });
    }
  }

  await bunnyExecute({
    sql: `UPDATE enquiry_forms SET submission_count = (
      SELECT COUNT(DISTINCT CASE WHEN (source = 'google_forms' OR id LIKE 'gform_%') AND form_data != ''
        THEN 'google:' || form_data ELSE 'crm:' || id END)
      FROM form_submissions WHERE form_id = ?) WHERE form_id = ?`,
    args: [formId, formId],
  });

  const summary = {
    responseCount: responses.length,
    persistedSubmissions,
    insertedSubmissions,
    syncedLeads,
    failures: errors,
  };
  if (errors.length) {
    return NextResponse.json({
      error: 'Google Forms sync completed with persistence failures; retry the sync after correcting the reported writes.',
      summary,
    }, { status: 500 });
  }

  return NextResponse.json({
    data: leads,
    questionMap,
    rawResponses: responses,
    linkedSheetId: formData.linkedSheetId || null,
    summary,
  });
}

export async function GET(request: NextRequest) {
  const cronAuthorized = isAuthorizedCron(request);
  let scope: string;
  if (!cronAuthorized) {
    const viewer = registrationViewer(request);
    if (!viewer) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    scope = viewer.superAdmin ? 'shared' : viewer.userId;
  } else {
    scope = request.nextUrl.searchParams.get('scope')?.trim() || '';
    if (!scope || scope.length > 128 || /[\u0000-\u001f]/.test(scope)) {
      return NextResponse.json({ error: 'A valid registration scope is required for cron sync.' }, { status: 400 });
    }
  }

  try {
    return await syncGoogleForm(request, scope);
  } catch (error) {
    console.error('[Google Forms Sync] Failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Google Forms sync failed.',
    }, { status: 500 });
  }
}
