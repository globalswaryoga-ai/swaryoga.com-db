import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';
import { decryptCredential, encryptCredential } from '@/lib/auth';
import { registrationViewer, registrationLeadOwned } from '@/lib/registrationAuth';
import { saveBunnyLead, loadBunnyLeads } from '@/lib/bunnyLeadsRepository';
import {
  createForm,
  createQuestion,
  ensureFormTables,
  getFormById,
} from '@/lib/bunny-forms-db';
import { listBunnySocialAccounts, updateBunnySocialAccount } from '@/lib/bunnySocialInboxRepository';
import {
  extractGoogleFormId,
  fetchGoogleFormResponses,
  mapGoogleFormResponses,
  persistGoogleFormSubmission,
} from '@/lib/googleFormsSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type GoogleAccount = {
  account: Record<string, any>;
  source: 'canonical' | 'bunny_archive';
  documentId: string;
};

function isAuthorizedCron(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization') || '';
  if (!expected || !provided.startsWith('Bearer ')) return false;
  const token = provided.slice(7);
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);
  return expectedBuffer.length === tokenBuffer.length && timingSafeEqual(expectedBuffer, tokenBuffer);
}

function accountIsInScope(account: Record<string, any>, scope: string): boolean {
  const ownerUserId = String(account.ownerUserId || account.userId || '').trim();
  if (scope === 'shared') {
    return ownerUserId === '' || ownerUserId === 'admin' || ownerUserId === 'admincrm' ||
      (account.scopeType === 'super_admin' && account.scopeKey === 'super_admin');
  }
  return ownerUserId === scope;
}

async function resolveGoogleAccounts(scope: string): Promise<GoogleAccount[]> {
  const accounts: GoogleAccount[] = [];
  const failures: string[] = [];
  let canonicalReadSucceeded = false;
  let archiveReadSucceeded = false;

  try {
    const canonicalAccounts = await listBunnySocialAccounts({ connectedOnly: false });
    canonicalReadSucceeded = true;
    for (const account of canonicalAccounts) {
      if (!['google_forms', 'google'].includes(String(account.platform || '').toLowerCase())) continue;
      if (account.isConnected === false || !account.accessToken || !account._id) continue;
      if (!accountIsInScope(account, scope)) continue;
      accounts.push({ account, source: 'canonical', documentId: String(account._id) });
    }
  } catch (error) {
    failures.push(`Bunny canonical account repository: ${error instanceof Error ? error.message : 'unavailable'}`);
  }

  try {
    // Compatibility fallback only: mongo_documents is the preserved Bunny SQL archive, not a live MongoDB read.
    const legacy = await bunnyExecute({
      sql: "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts' ORDER BY updated_at DESC",
    });
    archiveReadSucceeded = true;
    for (const row of legacy.rows) {
      try {
        const account = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
        if (!['google_forms', 'google'].includes(String(account?.platform || '').toLowerCase())) continue;
        if (!account.accessToken) continue;
        if (!accountIsInScope(account, scope)) continue;
        const documentId = String(row.document_id || account._id || account.document_id || '');
        if (documentId) accounts.push({ account, source: 'bunny_archive', documentId });
      } catch {
        // Ignore malformed account documents while continuing to inspect the stored accounts.
      }
    }
  } catch (error) {
    failures.push(`Bunny archived account records: ${error instanceof Error ? error.message : 'unavailable'}`);
  }

  if (!canonicalReadSucceeded && !archiveReadSucceeded) {
    throw new Error(`Could not resolve Google accounts (${failures.join('; ')}).`);
  }

  const seen = new Set<string>();
  return accounts.filter(({ account }) => {
    const key = `${account.platform}:${account.userId || account.ownerUserId || ''}:${account.accessToken}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function saveRefreshedAccessToken(entry: GoogleAccount, accessToken: string, expiresIn: number) {
  const updated = {
    ...entry.account,
    accessToken: encryptCredential(accessToken),
    tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (entry.source === 'canonical') {
    const saved = await updateBunnySocialAccount(entry.documentId, {
      accessToken: updated.accessToken,
      tokenExpiresAt: updated.tokenExpiresAt,
      updatedAt: updated.updatedAt,
    });
    if (!saved) throw new Error('Refreshed Google token could not be saved to the canonical account repository.');
    entry.account = { ...entry.account, ...updated };
    return;
  }

  const result = await bunnyExecute({
    sql: "UPDATE mongo_documents SET document_json = ?, updated_at = datetime('now') WHERE collection_name = 'socialmediaaccounts' AND document_id = ?",
    args: [JSON.stringify(updated), entry.documentId],
  });
  if (Number(result.rowsAffected || 0) < 1) {
    throw new Error('Refreshed Google token could not be saved to the Bunny archive.');
  }
  entry.account = updated;
}

async function getGoogleAccessToken(entry: GoogleAccount): Promise<string> {
  let accessToken: string;
  try {
    accessToken = decryptCredential(String(entry.account.accessToken));
  } catch {
    throw new Error('Stored Google access token could not be decrypted; reconnect the Google account.');
  }
  return accessToken;
}

async function refreshGoogleAccessToken(entry: GoogleAccount): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Google access token expired and GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured.');
  }

  let refreshToken: string;
  try {
    refreshToken = decryptCredential(String(entry.account.refreshToken || ''));
  } catch {
    throw new Error('Stored Google refresh token could not be decrypted; reconnect the Google account.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(30_000),
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const tokenData = await response.json() as { access_token?: string; expires_in?: number };
  if (!response.ok || !tokenData.access_token) {
    throw new Error(`Google token refresh failed (${response.status} ${response.statusText}).`);
  }
  await saveRefreshedAccessToken(entry, tokenData.access_token, Number(tokenData.expires_in) || 3600);
  return tokenData.access_token;
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

    const phone = String(lead.phoneNumber || '').replace(/\D/g, '');

    try {
      const matchingIndex = existingLeads.findIndex((candidate: any) => {
        const existingPhone = String(candidate.phoneNumber || '').replace(/\D/g, '');
        const phoneMatches = existingPhone.length >= 10 && existingPhone.slice(-10) === phone.slice(-10);
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
        });
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
    sql: 'UPDATE enquiry_forms SET submission_count = (SELECT COUNT(*) FROM form_submissions WHERE form_id = ?) WHERE form_id = ?',
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
