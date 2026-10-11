/** @jest-environment node */

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyExecute: jest.fn(),
  bunnyBatch: jest.fn(),
}));
jest.mock('@/lib/bunnyBroadcastRepository', () => ({ ensureBroadcastSchema: jest.fn() }));
jest.mock('@/lib/whatsapp', () => ({
  normalizePhone: (value: unknown) => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 10 ? `91${digits}` : digits;
  },
}));

import { assembleRegistrationLeads, filterRegistrationLeads } from '@/lib/registrationLeads';
import { evaluateMetaLead, registrationTargetMatches } from '@/lib/registrationRules';
import { queueRegistrationTemplate, registrationTriggerDue, resolveRegistrationTemplate, processRegistrationApprovals } from '@/lib/registrationAutomation';
import { readRegistrationAiConfig, registrationAiConfigKey } from '@/lib/registrationAiConfig';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

describe('Bunny-only registration repairs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retains email-only Google responses and website forms without duplicating linked leads', () => {
    const rows = assembleRegistrationLeads([
      { _id: 'crm-1', email: 'student@example.test', source: 'google_forms', metadata: { language: 'Hindi' } },
      { _id: 'crm-2', source: 'website-form', metadata: { workshopLanguage: 'Marathi' } },
    ], [
      { id: 'response-1', formId: 'form-1', email: 'student@example.test', source: 'google_forms', dynamicAnswers: { Question: 'Answer' } },
      { id: 'response-2', formId: 'form-1', email: 'email-only@example.test', source: 'google_forms', dynamicAnswers: { Question: 'Answer' } },
    ], [{ formId: 'form-1', workshopName: 'Hindi Workshop' }]);
    expect(rows).toHaveLength(3);
    expect(rows[0].leadId).toBe('crm-1');
    expect(rows[1].source).toBe('google_forms');
    expect(rows[1].email).toBe('email-only@example.test');
    expect(filterRegistrationLeads(rows, '', 'Hindi')).toHaveLength(2);
    expect(filterRegistrationLeads(rows, 'https://docs.google.com/forms/d/form-1/edit', '')).toHaveLength(2);
  });

  it('does not match male inside female and supports Marathi question text', () => {
    const config = { filters: [
      { question: 'लिंग', options: [{ answer: 'male', category: 'approved' }], fallbackCategory: 'pending' },
    ] };
    expect(evaluateMetaLead({ metadata: { rawFieldData: [{ name: 'लिंग', values: ['female'] }] } }, config, 'approved', 'pending', 'rejected')?.status).toBe('pending');
    expect(evaluateMetaLead({ metadata: { rawFieldData: [{ name: 'लिंग', values: ['male'] }] } }, config, 'approved', 'pending', 'rejected')?.status).toBe('approved');
  });

  it('ignores legacy fallback/global mismatch rules and keeps exact pending categories', () => {
    const config = {
      filters: [{ question: 'A', options: [], fallbackCategory: 'rejected' }, { question: 'B', options: [] }],
      hardRejectPairs: [{ questionA: 'A', questionB: 'B' }], maxMismatches: 1, mismatchFallback: 'rejected',
    };
    expect(evaluateMetaLead({}, config, 'approved', 'pending', 'rejected')?.status).toBe('pending');
    expect(registrationTargetMatches({ _id: 'a' }, { a: { status: 'pending_leads_2' } }, 'Pending Leads-1')).toBe(false);
    expect(registrationTargetMatches({ _id: 'a' }, { a: { status: 'pending_leads_2' } }, 'Pending Leads-2')).toBe(true);
  });

  it('evaluates one-time and recurring triggers in the configured timezone', () => {
    const trigger = { dates: ['2026-10-05'], time: '09:00', timeZone: 'Asia/Kolkata', repeat: 'none' };
    expect(registrationTriggerDue(trigger, new Date('2026-10-05T03:25:00Z'))).toEqual([]);
    expect(registrationTriggerDue(trigger, new Date('2026-10-05T03:35:00Z'))).toEqual(['2026-10-05']);
    expect(registrationTriggerDue({ ...trigger, repeat: 'weekly' }, new Date('2026-10-12T03:35:00Z'))).toEqual(['2026-10-05', '2026-10-12']);
  });

  it('rejects templates that are not approved for the current owner', async () => {
    jest.mocked(bunnyExecute).mockResolvedValue({ rows: [{ created_by: 'different-owner' }] } as never);
    await expect(resolveRegistrationTemplate('template', 'tenant', false)).rejects.toThrow('approved Meta template');
    expect(jest.mocked(bunnyExecute).mock.calls[0][0]).toEqual(expect.objectContaining({ sql: expect.stringContaining("UPPER(status) = 'APPROVED'") }));
  });

  it('groups daily registration sends into one report run and queues each recipient once', async () => {
    jest.mocked(bunnyExecute).mockResolvedValue({ rows: [] } as never);
    jest.mocked(bunnyBatch).mockResolvedValue([{ rowsAffected: 1 }, { rowsAffected: 1 }, { rowsAffected: 1 }] as never);
    const input = {
      leads: [{ _id: 'lead-1', phoneNumber: '9876543210' }, { _id: 'lead-2', phoneNumber: '+91 9876543210' }],
      template: { _id: 'approved', templateName: 'welcome' }, owner: 'admincrm',
      eventKey: 'approval', dueAt: new Date('2026-10-05T10:00:00Z'),
    };
    const first = await queueRegistrationTemplate(input);
    expect(first.queued).toBe(1);
    expect(first.runId).toMatch(/^registration_daily_/);
    const statements = jest.mocked(bunnyBatch).mock.calls[0][0] as any[];
    expect(statements).toHaveLength(3);
    expect(statements[0].args).toContain('Registration Automation');
    jest.mocked(bunnyBatch).mockResolvedValue([{ rowsAffected: 0 }, { rowsAffected: 0 }, { rowsAffected: 0 }] as never);
    const replay = await queueRegistrationTemplate(input);
    expect(replay.runId).toBe(first.runId);
    expect(replay.queued).toBe(0);
    const otherLead = await queueRegistrationTemplate({ ...input, eventKey: 'approval-2', leads: [{ _id: 'lead-3', phoneNumber: '9876500000' }], dueAt: new Date('2026-10-05T15:00:00Z') });
    expect(otherLead.runId).toBe(first.runId);
    const nextDay = await queueRegistrationTemplate({ ...input, dueAt: new Date('2026-10-05T19:00:00Z') });
    expect(nextDay.runId).not.toBe(first.runId);
  });

  it('restores saved batch-specific rules without overwriting other workers or batches', () => {
    const legacyRule = { question: 'Commitment', keyword: 'Yes' };
    const batchRule = { question: 'Education', keyword: 'Degree' };
    const state = {
      crm_ai_settings_v3: JSON.stringify({ 'AI-4': [legacyRule], 'AI-4A': [legacyRule] }),
      [registrationAiConfigKey('batch-a', 'AI-4')]: { conditions: [batchRule], copyMode: false },
      [registrationAiConfigKey('batch-b', 'AI-4')]: { conditions: [], copyMode: true },
    };
    const restored = readRegistrationAiConfig(state, 'batch-a');
    expect(restored.settings['AI-4']).toEqual([batchRule]);
    expect(restored.settings['AI-4A']).toEqual([legacyRule]);
    expect(restored.copyModes['AI-4']).toBe(false);
    expect(readRegistrationAiConfig(state, 'batch-b').settings['AI-4']).toEqual([]);
    expect(readRegistrationAiConfig(state, 'batch-a')).toEqual(restored);
    expect(() => registrationAiConfigKey('', 'AI-4')).toThrow('Select a batch');
  });

  it('stops automatic Meta sends when AI-9E is off or its question rules fail', async () => {
    const lead = {
      _id: 'meta-1', source: 'meta_instant_form', workshopId: 'batch-a', status: 'approved',
      metadata: { wtAutoEligible: true, approvedAt: '2026-10-01T10:00:00Z', rawFieldData: [{ name: 'Ready', values: ['No'] }] },
    };
    const metadata = {
      wtSettings: { approved: { template: 'welcome', delay: 5 } },
      ai9EConfig: { isActive: false, filters: [{ question: 'Ready', options: [{ answer: 'Yes', category: 'approved' }] }] },
    };
    const state = { crm_workshops: [{ id: 'batch-a', metadata }] };
    await expect(processRegistrationApprovals(state, [lead], 'admincrm', true)).resolves.toEqual([]);
    metadata.ai9EConfig.isActive = true;
    await expect(processRegistrationApprovals(state, [lead], 'admincrm', true)).resolves.toEqual([]);
    expect(bunnyBatch).not.toHaveBeenCalled();
    expect(bunnyExecute).not.toHaveBeenCalled();
  });
});
