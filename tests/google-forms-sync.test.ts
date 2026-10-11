/** @jest-environment node */

jest.mock('@/lib/bunny-forms-db', () => ({
  ensureFormTables: jest.fn().mockResolvedValue(undefined),
  listForms: jest.fn(),
}));

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyExecute: jest.fn(),
}));

jest.mock('@/lib/registrationState', () => ({
  readRegistrationState: jest.fn(),
  registrationWorkshops: jest.fn((state: Record<string, unknown>) => {
    const value = state.crm_workshops;
    return typeof value === 'string' ? JSON.parse(value) : value || [];
  }),
}));
jest.mock('@/lib/googleFormConnections', () => ({
  ...jest.requireActual('@/lib/googleFormConnections'),
  readGoogleFormConnections: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { listForms } from '@/lib/bunny-forms-db';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { readRegistrationState } from '@/lib/registrationState';
import { readGoogleFormConnections } from '@/lib/googleFormConnections';
import { GET as runGoogleFormsCron } from '@/app/api/cron/google-forms-sync/route';
import {
  collectGoogleFormTargets,
  fetchGoogleFormResponses,
  mapGoogleFormResponses,
  persistGoogleFormSubmission,
  stableGoogleResponseId,
} from '@/lib/googleFormsSync';

const executeMock = bunnyExecute as jest.MockedFunction<typeof bunnyExecute>;

describe('Google Forms ingestion helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(readGoogleFormConnections).mockResolvedValue({});
  });

  it('fetches every Google Forms response page and propagates API failures', async () => {
    const pages = [
      { responses: [{ responseId: 'r1' }], nextPageToken: 'page-2' },
      { responses: [{ responseId: 'r2' }] },
    ];
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => pages[0] })
      .mockResolvedValueOnce({ ok: true, json: async () => pages[1] });

    await expect(fetchGoogleFormResponses('form-id', 'access-token', fetcher as typeof fetch))
      .resolves.toEqual([{ responseId: 'r1' }, { responseId: 'r2' }]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1][0])).toContain('pageToken=page-2');

    await expect(fetchGoogleFormResponses('form-id', 'access-token', (async () => ({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })) as typeof fetch)).rejects.toThrow('403 Forbidden');
  });

  it('maps email-only submissions, all answers, and stable anonymous response identities', () => {
    const form = {
      items: [
        { title: 'Email address', questionItem: { question: { questionId: 'email-question' } } },
        { title: 'Languages', questionItem: { question: { questionId: 'languages-question' } } },
      ],
    };
    const response = {
      createTime: '2026-10-01T10:00:00Z',
      respondentEmail: 'only-email@example.test',
      answers: {
        a: { questionId: 'email-question', textAnswers: { answers: [{ value: 'only-email@example.test' }] } },
        b: { questionId: 'languages-question', textAnswers: { answers: [{ value: 'English' }, { value: 'Hindi' }] } },
      },
    };

    const first = mapGoogleFormResponses('form-one', form, [response]);
    const second = mapGoogleFormResponses('form-one', form, [{ ...response, answers: { ...response.answers } }]);
    const sameResponseDifferentForm = mapGoogleFormResponses('form-two', form, [response]);
    expect(first.leads).toHaveLength(1);
    expect(first.leads[0].email).toBe('only-email@example.test');
    expect(first.leads[0].mobile).toBe('');
    expect(first.leads[0].dynamicAnswers.Languages).toEqual(['English', 'Hindi']);
    expect(first.leads[0].rawAnswers.b).toBeDefined();
    expect(first.leads[0].responseId).toBe(stableGoogleResponseId(response));
    expect(first.leads[0].id).toBe(second.leads[0].id);
    expect(first.leads[0].id).toBe(sameResponseDifferentForm.leads[0].id);
    expect(sameResponseDifferentForm.leads[0].formId).toBe('form-two');
    expect(first.leads[0].id).toBe(first.leads[0].responseId);
    expect(first.leads[0].leadId).toBeNull();
    expect(first.leads[0].source).toBe('google_forms');
    expect(first.leads[0].formId).toBe('form-one');
    expect(first.leads[0].rawAnswers.b).toBeDefined();
  });

  it('persists each distinct response id without collapsing shared emails and is idempotent on retries', async () => {
    const rows = new Map<string, { id: string; data?: Record<string, unknown> }>();
    const columns = new Set(['id', 'form_id', 'name', 'mobile', 'email', 'gender', 'city', 'answers', 'form_data', 'created_at']);
    executeMock.mockImplementation(async (statement: any) => {
      const sql = String(statement.sql || statement);
      const args = statement.args || [];
      if (sql === 'PRAGMA table_info(form_submissions)') {
        return { rows: [...columns].map((name) => ({ name })), rowsAffected: 0 } as any;
      }
      if (sql.startsWith('ALTER TABLE form_submissions ADD COLUMN')) {
        columns.add(sql.includes('raw_answers') ? 'raw_answers' : 'source');
        return { rows: [], rowsAffected: 0 } as any;
      }
      if (sql.startsWith('SELECT id FROM form_submissions')) {
        const row = [...rows.values()].find((candidate) =>
          candidate.data?.formId === args[0] && candidate.data?.responseId === args[1],
        );
        return { rows: row ? [{ id: row.id }] : [], rowsAffected: 0 } as any;
      }
      if (sql.startsWith('INSERT OR IGNORE INTO form_submissions')) {
        const [id, formId, name, mobile, email, gender, city, answers, responseId, , source, rawAnswers] = args;
        const key = `${formId}:${responseId}`;
        if (rows.has(key)) return { rows: [], rowsAffected: 0 } as any;
        rows.set(key, { id, data: { formId, responseId, name, mobile, email, gender, city, answers, source, rawAnswers } });
        return { rows: [], rowsAffected: 1 } as any;
      }
      return { rows: [], rowsAffected: 1 } as any;
    });

    const common = {
      formId: 'google-form-id',
      source: 'google_forms',
      email: 'same@example.test',
      answers: { 'What is your name?': 'A person' },
      rawAnswers: { question: { questionId: 'question', answer: 'A person' } },
    };
    const first = await persistGoogleFormSubmission({ ...common, responseId: 'response-one' });
    const second = await persistGoogleFormSubmission({ ...common, responseId: 'response-two' });
    const retry = await persistGoogleFormSubmission({ ...common, responseId: 'response-one' });
    const otherForm = await persistGoogleFormSubmission({
      ...common,
      formId: 'another-form-id',
      responseId: 'response-one',
    });

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(true);
    expect(second.id).not.toBe(first.id);
    expect(retry).toEqual({ id: first.id, inserted: false });
    expect(otherForm.inserted).toBe(true);
    expect(otherForm.id).not.toBe(first.id);
    expect(rows.size).toBe(3);
    expect([...rows.values()][0].data?.mobile).toBe('');
    expect([...rows.values()][0].data?.email).toBe('same@example.test');
    expect([...rows.values()][0].data?.source).toBe('google_forms');
    expect([...rows.values()][0].data?.rawAnswers).toContain('"question"');
  });

  it('propagates Bunny persistence failures instead of reporting an ingested response', async () => {
    executeMock.mockResolvedValueOnce({ rows: [], rowsAffected: 0 } as any)
      .mockRejectedValueOnce(new Error('Bunny write unavailable'));
    await expect(persistGoogleFormSubmission({
      formId: 'google-form-id',
      responseId: 'response-failure',
      email: 'only-email@example.test',
    })).rejects.toThrow('Bunny write unavailable');
  });

  it('combines active registered Google forms with linked new-registration forms only', () => {
    const targets = collectGoogleFormTargets([
      { formId: 'short-internal-id', workshopName: 'Internal form', isActive: true },
      { formId: 'a'.repeat(35), workshopName: 'Registered Google form', isActive: true },
      { formId: 'b'.repeat(35), workshopName: 'Inactive Google form', isActive: false },
    ], {
      crm_workshops: JSON.stringify([{
        name: 'New registration workshop',
        formId: 'c'.repeat(35),
        metadata: { formSource: 'google' },
      }]),
      crm_english_google_form_url: `https://docs.google.com/forms/d/${'d'.repeat(35)}/edit`,
    });

    expect(targets.map((target) => target.formId)).toEqual([
      'a'.repeat(35),
      'c'.repeat(35),
      'd'.repeat(35),
    ]);
    expect(targets[1].name).toBe('New registration workshop');
  });

  it('rejects user-agent-only cron requests and forwards verified cron auth internally', async () => {
    const previousSecret = process.env.CRON_SECRET;
    const previousBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const originalFetch = global.fetch;
    process.env.CRON_SECRET = 'test-cron-secret';
    delete process.env.NEXT_PUBLIC_BASE_URL;
    (listForms as jest.Mock).mockResolvedValue([
      { formId: 'a'.repeat(35), workshopName: 'Registered shared form', createdBy: 'admincrm', isActive: true },
      { formId: 'b'.repeat(35), workshopName: 'Registered tenant form', createdBy: 'tenant-1', isActive: true },
    ]);
    (bunnyExecute as jest.Mock).mockResolvedValue({
      rows: [{ scope: 'shared' }, { scope: 'tenant-1' }],
      rowsAffected: 0,
    });
    (readRegistrationState as jest.Mock).mockImplementation(async (scope: string) => ({
      crm_workshops: JSON.stringify([{
        id: `${scope}-workshop`,
        name: `${scope} linked form`,
        formId: scope === 'shared' ? 'c'.repeat(35) : 'd'.repeat(35),
        metadata: { formSource: 'google' },
      }]),
    }));
    jest.mocked(readGoogleFormConnections).mockResolvedValue({
      Hindi: { workshop: `https://docs.google.com/forms/d/${'e'.repeat(35)}/edit`, offer: '' },
      English: { workshop: 'a'.repeat(35), offer: '' },
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ summary: { responseCount: 0 } }),
    }) as jest.MockedFunction<typeof fetch>;

    try {
      const spoofed = await runGoogleFormsCron(new NextRequest('https://example.test/api/cron/google-forms-sync', {
        headers: { 'user-agent': 'vercel-cron' },
      }));
      expect(spoofed.status).toBe(401);
      expect(listForms).not.toHaveBeenCalled();

      const authorized = await runGoogleFormsCron(new NextRequest('https://example.test/api/cron/google-forms-sync', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }));
      expect(authorized.status).toBe(200);
      expect(readRegistrationState).toHaveBeenCalledWith('shared');
      expect(readRegistrationState).toHaveBeenCalledWith('tenant-1');
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls).toHaveLength(5);
      expect(calls.map(([url]) => new URL(String(url)).searchParams.get('scope'))).toEqual([
        'shared', 'shared', 'shared', 'tenant-1', 'tenant-1',
      ]);
      expect(calls.map(([url]) => new URL(String(url)).searchParams.get('url'))).toContain('e'.repeat(35));
      expect(calls.every(([, init]) => init.headers.Authorization === 'Bearer test-cron-secret')).toBe(true);
      (global.fetch as jest.Mock).mockClear();
      jest.mocked(readGoogleFormConnections).mockResolvedValue({
        Hindi: { workshop: 'invalid-link' },
        Marathi: { workshop: 'f'.repeat(35) },
      });
      const partial = await runGoogleFormsCron(new NextRequest('https://example.test/api/cron/google-forms-sync', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }));
      expect(partial.status).toBe(207);
      const summary = await partial.json();
      expect(summary.optionalScopeBlockers).toEqual(expect.arrayContaining([expect.objectContaining({ error: expect.stringContaining('Hindi workshop') })]));
      const syncedIds = (global.fetch as jest.Mock).mock.calls.map(([url]) => new URL(String(url)).searchParams.get('url'));
      expect(syncedIds).toEqual(expect.arrayContaining(['a'.repeat(35), 'c'.repeat(35), 'f'.repeat(35)]));
      expect(syncedIds).not.toContain('invalid-link');
    } finally {
      global.fetch = originalFetch;
      if (previousSecret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previousSecret;
      if (previousBaseUrl === undefined) delete process.env.NEXT_PUBLIC_BASE_URL;
      else process.env.NEXT_PUBLIC_BASE_URL = previousBaseUrl;
    }
  });
});
