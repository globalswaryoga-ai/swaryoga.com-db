/** @jest-environment node */

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyExecute: jest.fn(),
  bunnyBatch: jest.fn(),
  getBunnyDatabase: jest.fn(),
}));
jest.mock('@/lib/bunny-storage', () => ({ fetchFromStorage: jest.fn() }));

import { createClient, type Client } from '@libsql/client';
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bunnyExecute, bunnyBatch, getBunnyDatabase } from '@/lib/bunnyDatabase';
import { fetchFromStorage } from '@/lib/bunny-storage';
import { mergeRegistrationState, readRegistrationDecisionState, readRegistrationState, replaceRegistrationStateIfUnchanged, saveRegistrationGate, writeRegistrationState, saveRegistrationSnapshotIfUnchanged } from '@/lib/registrationState';
import { readRegistrationAiConfig, registrationAiConfigKey, registrationDecisionKey } from '@/lib/registrationAiConfig';
import { processRegistrationFunnel } from '@/lib/registrationFunnel';

describe('Durable registration configuration in SQL', () => {
  let client: Client;
  let directory: string;
  let databasePath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    directory = mkdtempSync(join(tmpdir(), 'registration-state-test-'));
    databasePath = join(directory, 'state.db');
    client = createClient({ url: `file:${databasePath}` });
    jest.mocked(getBunnyDatabase).mockImplementation(() => client);
    jest.mocked(bunnyExecute).mockImplementation(statement => client.execute(statement));
    jest.mocked(bunnyBatch).mockImplementation(statements => client.batch(statements, 'write'));
    jest.mocked(fetchFromStorage).mockResolvedValue({
      buffer: Buffer.from(JSON.stringify({ crm_ai_settings_v3: JSON.stringify({ 'AI-4': [{ question: 'Ready', keyword: 'Yes' }] }) })),
      contentType: 'application/json',
    });
  });

  afterEach(() => {
    client.close();
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${databasePath}${suffix}`, { force: true });
    rmdirSync(directory);
  });

  it('keeps saved questions and answers after reopening the database and unrelated saves', async () => {
    const key = registrationAiConfigKey('batch-1', 'AI-4A');
    const conditions = [{ question: 'Education', keyword: 'Degree', successCategory: 'approval_2' }];
    await writeRegistrationState({ [key]: { conditions, copyMode: false } });
    await writeRegistrationState({ crm_unrelated_setting: 'changed' });
    client.close();
    client = createClient({ url: `file:${databasePath}` });
    const saved = readRegistrationAiConfig(await readRegistrationState(), 'batch-1');
    expect(saved.settings['AI-4A']).toEqual(conditions);
    expect(saved.settings['AI-4']).toEqual([{ question: 'Ready', keyword: 'Yes' }]);
    expect(saved.copyModes['AI-4A']).toBe(false);
    expect(fetchFromStorage).toHaveBeenCalledTimes(1);
  });
  it('rejects a stale browser snapshot atomically and keeps all saved batch data after reopening', async () => {
    const old = { crm_hindi_workshops: '[{"id":"batch","formId":"old"}]', crm_hindi_approved_ids_batch: '["one"]' };
    const newer = { crm_hindi_workshops: '[{"id":"batch","formId":"saved","metadata":{"ai9DConfig":{"isActive":true}}}]',
      crm_hindi_approved_ids_batch: '["one","two"]' };
    await writeRegistrationState(old);
    await writeRegistrationState(newer);
    await expect(saveRegistrationSnapshotIfUnchanged({
      crm_hindi_approved_ids_batch: '[]', crm_hindi_workshops: '[]',
    }, old)).rejects.toThrow('saved data has been preserved');
    client.close();
    client = createClient({ url: `file:${databasePath}` });
    expect(await readRegistrationState()).toMatchObject(newer);
  });
  it('persists an explicit version-checked change without replacing unrelated settings', async () => {
    await writeRegistrationState({ crm_hindi_workshops: '[]', crm_meta_rules: { active: true } });
    await saveRegistrationSnapshotIfUnchanged({ crm_hindi_workshops: '[{"id":"new"}]' }, { crm_hindi_workshops: '[]' });
    expect(await readRegistrationState()).toMatchObject({
      crm_hindi_workshops: '[{"id":"new"}]', crm_meta_rules: { active: true },
    });
  });
  it('accepts an already-saved batch regardless of string versus object serialization', async () => {
    const old = '[{"id":"batch"}]';
    const current = [{ id: 'batch', metadata: { ai9DConfig: { isActive: true } } }];
    await writeRegistrationState({ crm_hindi_workshops: current });
    await saveRegistrationSnapshotIfUnchanged({ crm_hindi_workshops: JSON.stringify(current) }, { crm_hindi_workshops: old });
    expect(JSON.parse(String((await readRegistrationState()).crm_hindi_workshops))).toEqual(current);
  });

  it('does not copy shared configuration into a tenant scope', async () => {
    await writeRegistrationState({ crm_setting: 'shared' });
    expect(await readRegistrationState('tenant-1')).toEqual({});
    await writeRegistrationState({ crm_setting: 'tenant' }, 'tenant-1');
    expect((await readRegistrationState()).crm_setting).toBe('shared');
    expect((await readRegistrationState('tenant-1')).crm_setting).toBe('tenant');
  });

  it('keeps the chosen batch form across reopening and preserves other batch rules and decisions', async () => {
    const key = registrationDecisionKey('hindi-batch', 'response');
    const workshop = { id: 'hindi-batch', formId: 'connected-google-form', metadata: { formSource: 'internal', mainFilter: 'Pune' } };
    await writeRegistrationState({ crm_hindi_workshops: JSON.stringify([workshop]), [key]: { zoomStatus: 'meeting_done', status: 'approval_1' } });
    await writeRegistrationState({ crm_unrelated_setting: 'changed' });
    client.close();
    client = createClient({ url: `file:${databasePath}` });
    const restored = await readRegistrationState();
    expect(JSON.parse(String(restored.crm_hindi_workshops))).toEqual([workshop]);
    expect(restored[key]).toEqual({ zoomStatus: 'meeting_done', status: 'approval_1' });
  });

  it('rejects stale schedule updates without losing a concurrently saved schedule', async () => {
    const first = JSON.stringify([{ id: 'first' }]);
    const second = JSON.stringify([{ id: 'first' }, { id: 'second' }]);
    expect(await replaceRegistrationStateIfUnchanged('crm_ai_triggers', first, undefined)).toBe(true);
    expect(await replaceRegistrationStateIfUnchanged('crm_ai_triggers', second, first)).toBe(true);
    expect(await replaceRegistrationStateIfUnchanged('crm_ai_triggers', '[]', first)).toBe(false);
    expect((await readRegistrationState()).crm_ai_triggers).toBe(second);
  });

  it('preserves manual gates while SQL merges funnel decisions, including after reopening', async () => {
    const key = registrationDecisionKey('batch-1', 'response-1');
    await writeRegistrationState({ [key]: { status: 'new_leads' } });
    await mergeRegistrationState({ [key]: { zoomStatus: 'skipped', zoomGateAudit: { userId: 'admin', action: 'skip_zoom' } } });
    await mergeRegistrationState({ [key]: { status: 'approval_1', screeningPassed: true } });
    await mergeRegistrationState({ [key]: { isRegistered: true, groupStatus: 'skipped' } });
    client.close();
    client = createClient({ url: `file:${databasePath}` });
    expect((await readRegistrationState())[key]).toMatchObject({
      status: 'approval_1', screeningPassed: true, zoomStatus: 'skipped', isRegistered: true, groupStatus: 'skipped',
    });

    expect((await readRegistrationState('tenant-1'))[key]).toBeUndefined();
  });

  it('reads only the active batch decision keys without unrelated configuration', async () => {
    const key = registrationDecisionKey('batch_1', 'response');
    await writeRegistrationState({
      [key]: { zoomStatus: 'skipped' },
      [registrationDecisionKey('batchX1', 'response')]: { zoomStatus: 'meeting_done' },
      crm_workshops: [{ id: 'batch_1' }],
    });

    expect(await readRegistrationDecisionState('batch_1')).toEqual({ [key]: { zoomStatus: 'skipped' } });
  });

  it('does not overwrite a newer gate with a stale admin action', async () => {
    const key = registrationDecisionKey('batch', 'response');
    const previous = { zoomStatus: 'pending' };
    await writeRegistrationState({ [key]: previous });
    expect(await saveRegistrationGate(key, { zoomStatus: 'skipped' }, previous)).toBe(true);
    expect(await saveRegistrationGate(key, { zoomStatus: 'meeting_done' }, previous)).toBe(false);
    expect((await readRegistrationState())[key]).toEqual({ zoomStatus: 'skipped' });
  });

  it('runs configured scrutiny on the server, persists once, and never completes Zoom or group admission', async () => {
    await writeRegistrationState({
      crm_hindi_workshops: [{ id: 'batch', formId: 'form', language: 'Hindi' }],
      [registrationAiConfigKey('batch', 'AI-4')]: {
        autoEnabled: true, conditions: [{ question: 'Ready', keyword: 'Yes', successCategory: 'approval_1' }],
      },
    });
    const input = {
      leads: [], forms: [{ formId: 'form', workshopName: 'Hindi' }],
      submissions: [{ id: 'response', formId: 'form', dynamicAnswers: { Ready: 'Yes' } }], scope: 'shared',
    };
    expect(await processRegistrationFunnel({ ...input, state: await readRegistrationState() })).toMatchObject({ processed: 1, passed: 1, errors: [] });
    const key = registrationDecisionKey('batch', 'response');
    const state = await readRegistrationState();
    expect(state[key]).toMatchObject({ status: 'approval_1', screeningPassed: true });
    expect(state[key]).not.toHaveProperty('zoomStatus');
    expect(state[key]).not.toHaveProperty('isRegistered');
    expect(state[key]).not.toHaveProperty('groupStatus');
    expect(await processRegistrationFunnel({ ...input, state })).toMatchObject({ processed: 0 });
  });

  it('keeps source-stage membership in copy mode and removes it in move mode', async () => {
    const copyKey = registrationDecisionKey('copy-batch', 'copy-response');
    const moveKey = registrationDecisionKey('move-batch', 'move-response');
    const conditions = [{ question: 'Ready', keyword: 'Yes', successCategory: 'approval_1' }];
    const state = {
      crm_hindi_workshops: [
        { id: 'copy-batch', formId: 'copy-form', language: 'Hindi' },
        { id: 'move-batch', formId: 'move-form', language: 'Hindi' },
      ],
      [registrationAiConfigKey('copy-batch', 'AI-4A')]: { conditions, copyMode: true },
      [registrationAiConfigKey('move-batch', 'AI-4A')]: { conditions, copyMode: false },
      [copyKey]: { status: 'pending_leads_1', copies: ['pending_leads_2'], history: ['new_leads'] },
      [moveKey]: { status: 'pending_leads_1', copies: ['pending_leads_1', 'pending_leads_2'], history: ['new_leads'] },
    };
    await writeRegistrationState(state);
    const submissions = [
      { id: 'copy-response', formId: 'copy-form', dynamicAnswers: { Ready: 'Yes' } },
      { id: 'move-response', formId: 'move-form', dynamicAnswers: { Ready: 'Yes' } },
    ];
    const forms = [
      { formId: 'copy-form', workshopName: 'Hindi' },
      { formId: 'move-form', workshopName: 'Hindi' },
    ];
    const common = { state, leads: [], forms, submissions, scope: 'shared', worker: 'AI-4A' };

    const copied = await processRegistrationFunnel({ ...common, batchId: 'copy-batch' });
    expect(copied.decisionPatch[copyKey]).toMatchObject({
      status: 'approval_1',
      copies: ['pending_leads_2', 'pending_leads_1', 'approval_1'],
    });
    const moved = await processRegistrationFunnel({ ...common, batchId: 'move-batch' });
    expect(moved.decisionPatch[moveKey]).toMatchObject({
      status: 'approval_1',
      copies: ['pending_leads_2'],
    });
    expect(moved.decisionPatch[moveKey].history).toContain('pending_leads_1');
  });

  it('does not initialize empty shared state when preserved configuration cannot be read', async () => {
    jest.mocked(fetchFromStorage).mockRejectedValue(new Error('Storage unavailable'));
    await expect(readRegistrationState()).rejects.toThrow('Storage unavailable');
    const result = await client.execute('SELECT COUNT(*) AS count FROM registration_state_sql');
    expect(Number(result.rows[0].count)).toBe(0);
  });

  it('rechecks only this worker previous decisions on explicit rerun and preserves manual gates', async () => {
    const key = registrationDecisionKey('batch', 'response');
    const state = {
      crm_hindi_workshops: [{ id: 'batch', formId: 'form', language: 'Hindi' }],
      [registrationAiConfigKey('batch', 'AI-4')]: {
        autoEnabled: true, conditions: [{ question: 'Ready', keyword: 'Yes', successCategory: 'approval_1' }],
      },
      [key]: { status: 'pending_leads_1', processedBy: 'AI-4', zoomStatus: 'skipped' },
    };
    await writeRegistrationState(state);
    const input = {
      state, leads: [], forms: [{ formId: 'form', workshopName: 'Hindi' }],
      submissions: [{ id: 'response', formId: 'form', dynamicAnswers: { Ready: 'Yes' } }], scope: 'shared',
    };
    expect(await processRegistrationFunnel(input)).toMatchObject({ processed: 0 });
    expect(await processRegistrationFunnel({ ...input, worker: 'AI-4' })).toMatchObject({ processed: 1, passed: 1 });
    expect((await readRegistrationState())[key]).toMatchObject({ status: 'approval_1', zoomStatus: 'skipped' });
  });
});
