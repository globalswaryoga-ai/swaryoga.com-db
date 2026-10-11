/** @jest-environment node */
import { createClient, type Client } from '@libsql/client';
import { createBunnyChatbotRuntime, chatbotKeywordMatches, chatbotOptionId, type RuntimeDependencies } from '@/lib/bunnyChatbotRuntimeEngine';

describe('Bunny-only durable Meta chatbot runtime (local SQL, mock Meta)', () => {
  let db: Client;
  let clock: Date;
  let config: any;
  let flows: any[];
  let templates: any[];
  let rules: any[];
  let deps: RuntimeDependencies;
  let runtime: ReturnType<typeof createBunnyChatbotRuntime>;
  const owner = 'tenant-one';
  const phone = '919876543210';
  const event = (id = 'wamid.inbound-1', body = 'hello', extra: any = {}) => ({
    leadId: 'lead-one', phoneNumber: phone, messageBody: body, wasFirstInbound: true,
    tenantUserId: owner, messageId: id, ...extra,
  });
  const selected = (nodes: any[], extra: any = {}) => ({
    _id: 'flow-one', createdByUserId: owner, enabled: true, provider: 'meta',
    startNodeId: nodes[0].nodeId, nodes, ...extra,
  });
  const readState = async () => JSON.parse(String((await db.execute('SELECT data_json FROM chatbot_runtime_state_sql')).rows[0]?.data_json || '{}'));
  const lead = async () => JSON.parse(String((await db.execute("SELECT data_json FROM leads_sql WHERE document_id='lead-one'")).rows[0].data_json));
  async function updateLead(updates: any) {
    await db.execute({ sql: "UPDATE leads_sql SET data_json=? WHERE document_id='lead-one'", args: [JSON.stringify({ ...await lead(), ...updates })] });
  }
  beforeEach(async () => {
    db = createClient({ url: 'file::memory:' });
    clock = new Date('2026-10-11T04:00:00.000Z');
    config = { chatbotEnabled: true, welcomeEnabled: true, welcomeMessage: 'Welcome', welcomeRepeatDays: 0 };
    flows = [];
    templates = [];
    rules = [];
    await db.batch([
      'CREATE TABLE leads_sql(document_id TEXT PRIMARY KEY,data_json TEXT NOT NULL,updated_at TEXT)',
      'CREATE TABLE meta_messages_sql(document_id TEXT PRIMARY KEY,lead_id TEXT,direction TEXT,sender_number TEXT,sent_at TEXT,wa_message_id TEXT)',
      'CREATE TABLE chatbot_flows_sql(document_id TEXT PRIMARY KEY,created_by_user_id TEXT)',
      { sql: 'INSERT INTO leads_sql VALUES (?,?,?)', args: ['lead-one', JSON.stringify({ _id: 'lead-one', name: 'A Student', phoneNumber: phone, createdByUserId: owner, labels: [], metadata: {} }), clock.toISOString()] },
    ], 'write');
    deps = {
      execute: statement => db.execute(statement),
      batch: statements => db.batch(statements, 'write'),
      lead: async id => id === 'lead-one' ? lead() : null,
      settings: async () => config,
      automationRules: async () => rules,
      flows: async () => flows,
      flow: async id => flows.find(flow => flow._id === id) || null,
      template: async (id, _owner, name) => templates.find(template => id ? template._id === id : template.templateName === name) || null,
      credentials: async () => ({ phoneNumberId: 'meta-account-one', accessToken: 'mock-only', phoneNumber: '919999999999' }),
      send: jest.fn(async () => `wamid.out-${(deps.send as jest.Mock).mock.calls.length}`),
      persistMessage: jest.fn(async () => undefined),
      ai: jest.fn(async () => 'AI response'),
      recordingRequest: jest.fn(async () => ({ handled: false })),
      now: () => clock,
    };
    runtime = createBunnyChatbotRuntime(deps);
  });
  afterEach(() => db.close());
  test('office hours stop normal flows and send the configured after-hours reply', async () => {
    config.officeHoursEnabled = true;
    config.officeHoursStart = '10:00';
    config.officeHoursEnd = '18:00';
    config.officeHoursTimezone = 'Asia/Kolkata';
    config.afterHoursMessage = 'We open at 10.';
    await runtime.inbound(event('wamid.closed'));
    expect(deps.send).toHaveBeenCalledWith(phone, expect.objectContaining({ text: { body: 'We open at 10.' } }), expect.anything());
    expect(deps.ai).not.toHaveBeenCalled();
  });
  test('recording requests remain policy-controlled outside normal office hours', async () => {
    config.officeHoursEnabled = true;
    config.officeHoursStart = '10:00';
    config.officeHoursEnd = '18:00';
    config.officeHoursTimezone = 'Asia/Kolkata';
    jest.mocked(deps.recordingRequest!).mockResolvedValue({ handled: true, message: 'Recording queued.' });
    await runtime.inbound(event('wamid.recording.closed', 'recording'));
    expect(deps.send).toHaveBeenCalledWith(phone, expect.objectContaining({ text: { body: 'Recording queued.' } }), expect.anything());
  });

  test.each([
    ['hi', ['this'], false], ['hi', ['Hi!'], true], ['join', ['rejoin'], false],
    ['join', ['Please JOIN now'], true], ['योग', ['मला योग शिकायचा आहे'], true],
    ['योग', ['योगासन'], false], ['join now', ['Please join now.'], true],
  ])('keyword %s has Unicode word boundaries', (keyword, values, expected) => {
    expect(chatbotKeywordMatches(keyword as string, values as string[])).toBe(expected);
  });
  test('exact keywords match payload/title without substring matching', async () => {
    config.keywords = [{ keyword: 'enroll', matchType: 'exact', response: 'Enrolled', priority: 10 }];
    await runtime.inbound(event('wamid.button', '', { triggerValues: ['enroll', 'Enroll now'] }));
    expect(deps.send).toHaveBeenCalledWith(phone, expect.objectContaining({ text: { body: 'Enrolled' } }), expect.anything());
    expect(chatbotKeywordMatches('enroll', ['please enroll'], 'exact')).toBe(false);
  });
  test('atomic provider event dedup survives a fresh runtime instance', async () => {
    await runtime.inbound(event());
    runtime = createBunnyChatbotRuntime(deps);
    expect(await runtime.inbound(event())).toEqual({ status: 'duplicate', sentCount: 0 });
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect((await db.execute('SELECT status FROM chatbot_runtime_events_sql')).rows[0].status).toBe('completed');
  });
  test('identical text with different provider IDs is not deduplicated', async () => {
    config.keywords = [{ keyword: 'hello', response: 'Hello' }];
    await runtime.inbound(event());
    await runtime.inbound(event('wamid.inbound-2'));
    expect(deps.send).toHaveBeenCalledTimes(2);
  });
  test('two concurrent deliveries claim a provider event only once', async () => {
    const result = await Promise.all([runtime.inbound(event()), runtime.inbound(event())]);
    expect(result.map(item => item.status).sort()).toEqual(['completed', 'duplicate']);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('welcome 0 is first only; configured positive repeat respects cooldown', async () => {
    await runtime.inbound(event());
    clock = new Date(clock.getTime() + 86400_000 * 5);
    await runtime.inbound(event('wamid.two', 'hi', { wasFirstInbound: false }));
    expect(deps.send).toHaveBeenCalledTimes(1);
    config.welcomeRepeatDays = 7;
    await runtime.inbound(event('wamid.three', 'hi', { wasFirstInbound: false }));
    expect(deps.send).toHaveBeenCalledTimes(1);
    clock = new Date(clock.getTime() + 86400_000 * 2);
    await runtime.inbound(event('wamid.four', 'hi', { wasFirstInbound: false }));
    expect(deps.send).toHaveBeenCalledTimes(2);
  });
  test('an existing conversation does not receive first-only welcome', async () => {
    await runtime.inbound(event('wamid.old', 'hello', { wasFirstInbound: false }));
    expect(deps.send).not.toHaveBeenCalled();
  });
  test.each([{ isBlocked: true }, { consentStatus: 'opted-out' }, { waBlocked: true }])('blocked/opt-out lead is never sent to (%j)', async flags => {
    await updateLead(flags);
    await runtime.inbound(event());
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('STOP payload records opt-out, cancels flow, and never sends an acknowledgement', async () => {
    await runtime.inbound(event('wamid.stop', '', { triggerValues: ['STOP'] }));
    expect((await lead()).isBlocked).toBe(true);
    expect(deps.send).not.toHaveBeenCalled();
    expect((await readState()).optedOut).toBe(true);
  });
  test('preserved Bunny archive consent is enforced', async () => {
    await db.execute('CREATE TABLE mongo_documents(collection_name TEXT,document_json TEXT)');
    await db.execute({ sql: 'INSERT INTO mongo_documents VALUES (?,?)', args: ['user_consents', JSON.stringify({ phoneNumber: phone, consentStatus: 'opted-out' })] });
    await runtime.inbound(event());
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('missing message ID is an explicit error and no claim/send occurs', async () => {
    await expect(runtime.inbound(event('', 'hello'))).rejects.toMatchObject({ code: 'missing_message_id' });
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('late webhook receipt does not reopen an expired 24h window', async () => {
    const old = new Date(clock.getTime() - 25 * 3600_000).toISOString();
    await db.execute({ sql: 'INSERT INTO meta_messages_sql VALUES (?,?,?,?,?,?)',
      args: ['old-message', 'lead-one', 'inbound', '919999999999', old, 'wamid.late'] });
    await expect(runtime.inbound(event('wamid.late'))).rejects.toMatchObject({ code: 'outside_24h' });
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('keyword flows win over welcome, and active question answers persist and route by button ID', async () => {
    const choice = { label: 'Yes', value: 'yes', nextNodeId: 'finish' };
    flows = [selected([
      { nodeId: 'question', type: 'question', questionText: 'Ready?', variableName: 'ready', options: [choice] },
      { nodeId: 'finish', type: 'message', messageText: 'Thanks {{ready}}' },
    ], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.start', 'join'));
    expect((await readState()).waitingForReply).toBe(true);
    expect((await lead()).metadata.chatbotFlowState.nodeId).toBe('question');
    await runtime.inbound(event('wamid.answer', '', { triggerValues: [chatbotOptionId(choice, 0), 'Yes'] }));
    expect((await readState()).variables.ready).toBe('yes');
    expect((await readState()).flowId).toBeNull();
    expect(deps.send).toHaveBeenLastCalledWith(phone, expect.objectContaining({ text: { body: 'Thanks yes', preview_url: true } }), expect.anything());
    expect(deps.send).toHaveBeenCalledTimes(2);
  });
  test('priority keyword overrides an active flow without consuming its answer', async () => {
    flows = [selected([{ nodeId: 'q', type: 'question', questionText: 'Name?', nextNodeId: 'end' }, { nodeId: 'end', type: 'end' }], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.start', 'join'));
    config.keywords = [{ keyword: 'help', response: 'Low', priority: 0 }, { keyword: 'help', response: 'High', priority: 5 }];
    await runtime.inbound(event('wamid.help', 'help'));
    expect((await readState()).waitingForReply).toBe(true);
    expect(deps.send).toHaveBeenLastCalledWith(phone, expect.objectContaining({ text: { body: 'High' } }), expect.anything());
  });
  test('unmatched reply re-prompts; empty media does not advance/re-send a waiting question', async () => {
    flows = [selected([{ nodeId: 'q', type: 'buttons', messageText: 'Choose', options: [{ label: 'Yes', value: 'yes' }] }], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.start', 'join'));
    await runtime.inbound(event('wamid.unknown', 'yesterday'));
    await runtime.inbound(event('wamid.media', ''));
    expect(deps.send).toHaveBeenCalledTimes(2);
    expect((await readState()).waitingForReply).toBe(true);
  });
  test('no arbitrary default enabled flow and no shared cross-tenant fallback', async () => {
    config.welcomeEnabled = false;
    flows = [selected([{ nodeId: 'one', type: 'message', messageText: 'No default' }]),
      selected([{ nodeId: 'other', type: 'message', messageText: 'Other owner' }], { _id: 'other', createdByUserId: 'admincrm', triggerKeywords: ['hello'] })];
    await runtime.inbound(event());
    expect(deps.send).not.toHaveBeenCalled();
    await expect(runtime.start({ leadId: 'lead-one', flowId: 'other', phoneNumber: phone, ownerUserId: owner })).rejects.toMatchObject({ code: 'flow_not_found' });
  });
  test('wrong owner, phone or Meta account are rejected', async () => {
    await expect(runtime.inbound(event('one', 'hello', { tenantUserId: 'other' }))).rejects.toMatchObject({ code: 'ownership' });
    await expect(runtime.inbound(event('two', 'hello', { phoneNumber: '919111111111' }))).rejects.toMatchObject({ code: 'phone_mismatch' });
    await expect(runtime.inbound(event('three', 'hello', { creds: { phoneNumberId: 'other-account' } }))).rejects.toMatchObject({ code: 'account_mismatch' });
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('unsupported node is an explicit failed event, not silent success', async () => {
    flows = [selected([{ nodeId: 'api', type: 'api_call', apiUrl: 'https://example.invalid' }], { triggerKeywords: ['join'] })];
    await expect(runtime.inbound(event('wamid.bad', 'join'))).rejects.toMatchObject({ code: 'unsupported_node' });
    expect(deps.send).not.toHaveBeenCalled();
    expect((await db.execute('SELECT status FROM chatbot_runtime_events_sql')).rows[0].status).toBe('failed');
  });
  test('too many options fail explicitly rather than discard options', async () => {
    flows = [selected([{ nodeId: 'q', type: 'buttons', messageText: 'Pick', options: ['A', 'B', 'C', 'D'].map(label => ({ label })) }], { triggerKeywords: ['join'] })];
    await expect(runtime.inbound(event('wamid.four', 'join'))).rejects.toMatchObject({ code: 'unsupported_buttons' });
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('accepted provider send followed by persistence failure is blocked, never automatically resent', async () => {
    (deps.persistMessage as jest.Mock).mockRejectedValueOnce(new Error('SQL unavailable'));
    await expect(runtime.inbound(event())).rejects.toMatchObject({ code: 'accepted_persistence_failed', acceptedMessageId: 'wamid.out-1' });
    expect((await db.execute('SELECT status,wa_message_id FROM chatbot_runtime_sends_sql')).rows[0]).toMatchObject({ status: 'accepted_persistence_failed', wa_message_id: 'wamid.out-1' });
    expect(await runtime.inbound(event())).toMatchObject({ status: 'duplicate' });
    await expect(runtime.inbound(event('wamid.later'))).rejects.toMatchObject({ code: 'send_requires_reconciliation' });
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('ambiguous transport failure retains the send intent and never retries', async () => {
    (deps.send as jest.Mock).mockRejectedValueOnce(new Error('Connection reset after POST'));
    await expect(runtime.inbound(event())).rejects.toMatchObject({ code: 'provider_result_unknown' });
    expect((await db.execute('SELECT status FROM chatbot_runtime_sends_sql')).rows[0].status).toBe('unknown');
    await expect(runtime.inbound(event('wamid.later'))).rejects.toMatchObject({ code: 'send_requires_reconciliation' });
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('SQL outage after provider acceptance preserves prepared intent; next event is blocked', async () => {
    const realExecute = deps.execute;
    let failAcceptance = true;
    deps.execute = async statement => {
      if (failAcceptance && statement.sql.includes("SET status='accepted'")) {
        failAcceptance = false;
        throw new Error('SQL outage after acceptance');
      }
      return realExecute(statement);
    };
    await expect(runtime.inbound(event())).rejects.toMatchObject({ code: 'accepted_persistence_failed', acceptedMessageId: 'wamid.out-1' });
    await expect(runtime.inbound(event('wamid.later'))).rejects.toMatchObject({ code: 'send_requires_reconciliation' });
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('manual start enforces 24h text policy but permits an approved owned template', async () => {
    flows = [selected([{ nodeId: 'text', type: 'message', messageText: 'Hello' }])];
    await expect(runtime.start({ leadId: 'lead-one', flowId: 'flow-one', phoneNumber: phone, ownerUserId: owner })).rejects.toMatchObject({ code: 'outside_24h' });
    expect(deps.send).not.toHaveBeenCalled();
    templates = [{ _id: 'template-one', createdBy: owner, provider: 'meta', status: 'approved', templateName: 'approved_welcome', language: 'en' }];
    flows = [selected([{ nodeId: 'tpl', type: 'template', templateId: 'template-one' }])];
    const started = await runtime.start({ leadId: 'lead-one', flowId: 'flow-one', phoneNumber: phone, ownerUserId: owner });
    expect(started).toMatchObject({ success: true, sentCount: 1, flowCompleted: true });
    expect(deps.send).toHaveBeenCalledWith(phone, expect.objectContaining({ type: 'template' }), expect.anything());
  });
  test('unapproved or foreign template is rejected before sending', async () => {
    templates = [{ _id: 'tpl', createdBy: 'other', status: 'approved', templateName: 'foreign' }];
    flows = [selected([{ nodeId: 'tpl', type: 'template', templateId: 'tpl' }])];
    await expect(runtime.start({ leadId: 'lead-one', flowId: 'flow-one', phoneNumber: phone, ownerUserId: owner })).rejects.toMatchObject({ code: 'template_not_approved' });
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('delay persists and is claimed once by existing scheduler after restart', async () => {
    flows = [selected([{ nodeId: 'delay', type: 'delay', delaySeconds: 60, nextNodeId: 'text' }, { nodeId: 'text', type: 'message', messageText: 'Delayed' }], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.start', 'join'));
    expect(deps.send).not.toHaveBeenCalled();
    expect((await db.execute('SELECT status FROM chatbot_scheduled_actions_sql')).rows[0].status).toBe('pending');
    clock = new Date(clock.getTime() + 60_000);
    runtime = createBunnyChatbotRuntime(deps);
    const result = await runtime.runDue();
    expect(result).toMatchObject({ scannedActions: 1, executedActions: 1, delayedMessages: 1 });
    await runtime.runDue();
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('scheduled text re-checks opt-out and 24h window', async () => {
    flows = [selected([{ nodeId: 'delay', type: 'delay', delaySeconds: 86401, nextNodeId: 'text' }, { nodeId: 'text', type: 'message', messageText: 'Delayed' }], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.start', 'join'));
    clock = new Date(clock.getTime() + 86401_000);
    const result = await runtime.runDue();
    expect(result.failedActions).toBe(1);
    expect(result.actionResults[0].error).toContain('24-hour');
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('node-level delay happens once, not a second time on resume', async () => {
    flows = [selected([{ nodeId: 'text', type: 'message', messageText: 'Delayed', delaySeconds: 60 }], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.start', 'join'));
    clock = new Date(clock.getTime() + 60_000);
    expect(await runtime.runDue()).toMatchObject({ executedActions: 1, delayedMessages: 1 });
    expect((await db.execute('SELECT COUNT(*) AS count FROM chatbot_scheduled_actions_sql')).rows[0].count).toBe(1);
  });
  test('builder templateName and templateButtons contract routes payload/title replies', async () => {
    templates = [{ _id: 'tpl', createdBy: owner, provider: 'meta', status: 'approved', templateName: 'saved_welcome', buttons: [{ type: 'QUICK_REPLY', title: 'Join' }] }];
    flows = [selected([
      { nodeId: 'tpl', type: 'template', templateName: 'saved_welcome', templateButtons: [{ title: 'Join', type: 'QUICK_REPLY', nextNodeId: 'next' }] },
      { nodeId: 'next', type: 'message', messageText: 'Joined' },
    ], { triggerKeywords: ['begin'] })];
    await runtime.inbound(event('wamid.tpl', 'begin'));
    expect((await readState()).waitingForReply).toBe(true);
    await runtime.inbound(event('wamid.button', '', { triggerValues: ['Join'] }));
    expect(deps.send).toHaveBeenLastCalledWith(phone, expect.objectContaining({ text: { body: 'Joined', preview_url: true } }), expect.anything());
  });
  test('builder wait_reply persists reply-delay minutes before following its routed node', async () => {
    flows = [selected([
      { nodeId: 'wait', type: 'wait_reply', waitTimeoutMinutes: 10, replyDelayMinutes: 2, nextNodeId: 'next' },
      { nodeId: 'next', type: 'message', messageText: 'Thanks' },
    ], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.wait', 'join'));
    expect((await readState()).waitingForReply).toBe(true);
    await runtime.inbound(event('wamid.reply', 'Student'));
    expect(deps.send).not.toHaveBeenCalled();
    clock = new Date(clock.getTime() + 120_000);
    expect(await runtime.runDue()).toMatchObject({ executedActions: 1, delayedMessages: 1 });
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('builder wait_reply timeoutNodeId routes without an artificial outgoing prompt', async () => {
    flows = [selected([
      { nodeId: 'wait', type: 'wait_reply', waitTimeoutMinutes: 1, timeoutNodeId: 'timeout' },
      { nodeId: 'timeout', type: 'message', messageText: 'No reply' },
    ], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.wait', 'join'));
    expect(deps.send).not.toHaveBeenCalled();
    clock = new Date(clock.getTime() + 60_000);
    expect(await runtime.runDue()).toMatchObject({ executedActions: 1, timeoutActions: 1 });
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('legacy accepted-send guard survives failed manual restart and subsequent events', async () => {
    await updateLead({ metadata: { chatbotFlowState: { flowId: 'flow-one', pendingSendKey: 'legacy-accepted' } } });
    flows = [selected([{ nodeId: 'hello', type: 'message', messageText: 'Do not repeat' }])];
    await expect(runtime.start({ leadId: 'lead-one', flowId: 'flow-one', phoneNumber: phone, ownerUserId: owner })).rejects.toMatchObject({ code: 'send_requires_reconciliation' });
    await expect(runtime.inbound(event())).rejects.toMatchObject({ code: 'send_requires_reconciliation' });
    expect((await lead()).metadata.chatbotFlowState.pendingSendKey).toBe('legacy-accepted');
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('superseded flow delay is cancelled, not sent', async () => {
    flows = [selected([{ nodeId: 'delay', type: 'delay', delaySeconds: 60, nextNodeId: 'text' }, { nodeId: 'text', type: 'message', messageText: 'Old' }], { triggerKeywords: ['join'] }),
      selected([{ nodeId: 'end', type: 'end' }], { _id: 'new', triggerKeywords: ['new'] })];
    await runtime.inbound(event('wamid.start', 'join'));
    await runtime.inbound(event('wamid.new', 'new'));
    clock = new Date(clock.getTime() + 60_000);
    await runtime.runDue();
    expect((await db.execute('SELECT status FROM chatbot_scheduled_actions_sql')).rows[0].status).toBe('cancelled');
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('question timeout routes once, but a successful reply cancels stale timeout', async () => {
    flows = [selected([
      { nodeId: 'q', type: 'question', questionText: 'Name?', nextNodeId: 'end', timerMinutes: 1, timerAction: 'goto_node', timerTargetNodeId: 'timeout' },
      { nodeId: 'end', type: 'end' }, { nodeId: 'timeout', type: 'message', messageText: 'Timeout' },
    ], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.start', 'join'));
    await runtime.inbound(event('wamid.reply', 'Student'));
    clock = new Date(clock.getTime() + 60_000);
    await runtime.runDue();
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect((await db.execute('SELECT status FROM chatbot_scheduled_actions_sql')).rows[0].status).toBe('cancelled');
  });
  test('AI fallback is opt-in and comes after keyword and welcome', async () => {
    config.aiEnabled = false;
    config.welcomeEnabled = false;
    await runtime.inbound(event('wamid.noai', 'Question?'));
    expect(deps.ai).not.toHaveBeenCalled();
    config.aiEnabled = true;
    await runtime.inbound(event('wamid.ai', 'Question?'));
    expect(deps.ai).toHaveBeenCalledTimes(1);
    config.keywords = [{ keyword: 'question', response: 'Keyword' }];
    await runtime.inbound(event('wamid.keyword', 'Question?'));
    expect(deps.ai).toHaveBeenCalledTimes(1);
  });
  test('disabled settings do not start enabled flows or AI', async () => {
    config = { chatbotEnabled: false, aiEnabled: true, welcomeEnabled: true, welcomeMessage: 'No' };
    flows = [selected([{ nodeId: 'text', type: 'message', messageText: 'No' }], { triggerKeywords: ['hello'] })];
    await runtime.inbound(event());
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.ai).not.toHaveBeenCalled();
  });
  test('configured end-node farewell is sent and the flow completes durably', async () => {
    flows = [selected([{ nodeId: 'end', type: 'end', messageText: 'Goodbye {{name}}' }], { triggerKeywords: ['bye'] })];
    await runtime.inbound(event('wamid.end', 'bye'));
    expect(deps.send).toHaveBeenCalledWith(phone, expect.objectContaining({ text: { body: 'Goodbye A Student', preview_url: true } }), expect.anything());
    expect((await readState()).flowId).toBeNull();
    expect((await lead()).metadata._chatbot_last_reply_at).toBe(clock.toISOString());
  });
  test('manual delayed text start also enforces the existing 24h window', async () => {
    flows = [selected([{ nodeId: 'delay', type: 'delay', delaySeconds: 60, nextNodeId: 'text' }, { nodeId: 'text', type: 'message', messageText: 'Delayed' }])];
    await expect(runtime.start({ leadId: 'lead-one', flowId: 'flow-one', phoneNumber: phone, ownerUserId: owner })).rejects.toMatchObject({ code: 'outside_24h' });
    expect(deps.send).not.toHaveBeenCalled();
    expect((await db.execute('SELECT COUNT(*) AS count FROM chatbot_scheduled_actions_sql')).rows[0].count).toBe(0);
  });
  test('scheduled continuation cancels without sending when a lead opts out', async () => {
    flows = [selected([{ nodeId: 'delay', type: 'delay', delaySeconds: 60, nextNodeId: 'text' }, { nodeId: 'text', type: 'message', messageText: 'Delayed' }], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.delay', 'join'));
    await updateLead({ isBlocked: true });
    clock = new Date(clock.getTime() + 60_000);
    await runtime.runDue();
    expect(deps.send).not.toHaveBeenCalled();
    expect((await db.execute('SELECT status FROM chatbot_scheduled_actions_sql')).rows[0].status).toBe('cancelled');
  });
  test('recording access takes priority over keyword flow/welcome/AI with a durable acknowledgement', async () => {
    flows = [selected([{ nodeId: 'q', type: 'question', questionText: 'Your name?' }], { triggerKeywords: ['recording'] })];
    config.aiEnabled = true;
    config.keywords = [{ keyword: 'recording', response: 'Wrong keyword' }];
    jest.mocked(deps.recordingRequest!).mockResolvedValue({ handled: true, message: 'Recording queued' });
    await runtime.inbound(event('wamid.recording', 'recording', { triggerValues: ['recording_id', 'Recording'] }));
    expect(deps.recordingRequest).toHaveBeenCalledWith({
      leadId: 'lead-one', phoneNumber: phone, messageBody: 'recording',
      triggerValues: ['recording_id', 'Recording'], tenantUserId: owner,
      creds: expect.objectContaining({ phoneNumberId: 'meta-account-one' }),
      messageId: 'wamid.recording', now: clock,
    });
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(deps.send).toHaveBeenCalledWith(phone, expect.objectContaining({ text: { body: 'Recording queued' } }), expect.anything());
    expect(deps.ai).not.toHaveBeenCalled();
    expect((await readState()).flowId).toBeUndefined();
    await runtime.inbound(event('wamid.recording', 'recording'));
    expect(deps.recordingRequest).toHaveBeenCalledTimes(1);
    expect((await db.execute('SELECT status FROM chatbot_runtime_sends_sql')).rows[0].status).toBe('persisted');
  });
  test('handled recording without message never sends a synthetic acknowledgement or welcome', async () => {
    jest.mocked(deps.recordingRequest!).mockResolvedValue({ handled: true });
    await runtime.inbound(event('wamid.recording', 'recording'));
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('recording opt-in policy is independent from globally disabled chatbot settings', async () => {
    config.chatbotEnabled = false;
    jest.mocked(deps.recordingRequest!).mockResolvedValue({ handled: true, message: 'Queued' });
    await runtime.inbound(event('wamid.recording', 'recording'));
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('recording handler is never invoked for blocked or opted-out recipients', async () => {
    await updateLead({ isBlocked: true });
    await runtime.inbound(event('wamid.recording', 'recording'));
    expect(deps.recordingRequest).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('recording acknowledgement obeys accepted-send persistence failure protection', async () => {
    jest.mocked(deps.recordingRequest!).mockResolvedValue({ handled: true, message: 'Queued' });
    jest.mocked(deps.persistMessage).mockRejectedValueOnce(new Error('Bunny failed'));
    await expect(runtime.inbound(event('wamid.recording', 'recording'))).rejects.toMatchObject({ code: 'accepted_persistence_failed' });
    await runtime.inbound(event('wamid.recording', 'recording'));
    expect(deps.recordingRequest).toHaveBeenCalledTimes(1);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('Bunny keyword automation respects exact button values, conditions and durable throttle', async () => {
    await updateLead({ status: 'hot', workshopName: 'Yoga', labels: ['ready', 'paid'] });
    rules = [{ _id: 'rule', createdByUserId: owner, enabled: true, triggerType: 'keyword',
      keywords: ['join'], matchType: 'exact', actionType: 'send_text', actionText: 'Rule reply', throttleMinutesPerLead: 5,
      conditions: { statuses: ['hot'], workshopName: 'Yoga', labelsAny: ['ready'], labelsAll: ['ready', 'paid'] } }];
    await runtime.inbound(event('wamid.rule', '', { triggerValues: ['join'] }));
    expect(deps.send).toHaveBeenCalledWith(phone, expect.objectContaining({ text: { body: 'Rule reply' } }), expect.anything());
    await runtime.inbound(event('wamid.throttled', '', { triggerValues: ['join'] }));
    expect(deps.send).toHaveBeenCalledTimes(1);
    runtime = createBunnyChatbotRuntime(deps);
    clock = new Date(clock.getTime() + 5 * 60_000);
    await runtime.inbound(event('wamid.rule-after', 'join'));
    expect(deps.send).toHaveBeenCalledTimes(2);
  });
  test('disabled/foreign automation rules never run; failed conditions continue to normal welcome', async () => {
    rules = [
      { _id: 'foreign', createdByUserId: 'other', enabled: true, triggerType: 'keyword', keywords: ['hello'], actionType: 'send_text', actionText: 'Wrong' },
      { _id: 'disabled', createdByUserId: owner, enabled: false, triggerType: 'keyword', keywords: ['hello'], actionType: 'send_text', actionText: 'Wrong' },
      { _id: 'condition', createdByUserId: owner, enabled: true, triggerType: 'keyword', keywords: ['hello'], actionType: 'send_text', actionText: 'Wrong', conditions: { statuses: ['customer'] } },
    ];
    await runtime.inbound(event());
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(deps.send).toHaveBeenCalledWith(phone, expect.objectContaining({ text: { body: 'Welcome' } }), expect.anything());
  });
  test('lead-update automation updates allowlisted fields without sending or replacing metadata', async () => {
    rules = [{ _id: 'update', createdByUserId: owner, enabled: true, triggerType: 'keyword', keywords: ['ready'],
      actionType: 'update_lead', actionLeadUpdates: { status: 'hot', labels: ['ready'], notes: 'User replied' } }];
    await runtime.inbound(event('wamid.update', 'ready'));
    expect(await lead()).toMatchObject({ status: 'hot', labels: ['ready'], notes: 'User replied', metadata: { chatbotVariables: {} } });
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('automation cannot override contact owner or suppress consent fields', async () => {
    rules = [{ _id: 'update', createdByUserId: owner, enabled: true, triggerType: 'keyword', keywords: ['ready'],
      actionType: 'update_lead', actionLeadUpdates: { createdByUserId: 'another', isBlocked: false } }];
    await expect(runtime.inbound(event('wamid.update', 'ready'))).rejects.toMatchObject({ code: 'unsupported_lead_updates' });
    expect((await lead()).createdByUserId).toBe(owner);
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('unsupported matching automation is an explicit failure', async () => {
    rules = [{ _id: 'update', createdByUserId: owner, enabled: true, triggerType: 'keyword', keywords: ['ready'],
      actionType: 'ai_reply' }];
    await expect(runtime.inbound(event('wamid.update', 'ready'))).rejects.toMatchObject({ code: 'unsupported_automation_action' });
  });
  test('welcome automation respects first-only setting and any-message rule precedes optional AI', async () => {
    config.welcomeEnabled = false; config.aiEnabled = true;
    rules = [
      { _id: 'welcome', createdByUserId: owner, enabled: true, triggerType: 'welcome', actionType: 'send_text', actionText: 'Rule welcome' },
      { _id: 'any', createdByUserId: owner, enabled: true, triggerType: 'any_message', actionType: 'send_text', actionText: 'Any reply', throttleMinutesPerLead: 0 },
    ];
    await runtime.inbound(event('wamid.first'));
    await runtime.inbound(event('wamid.second', 'next', { wasFirstInbound: false }));
    expect(deps.send).toHaveBeenCalledTimes(2);
    expect(deps.send).toHaveBeenLastCalledWith(phone, expect.objectContaining({ text: { body: 'Any reply' } }), expect.anything());
    expect(deps.ai).not.toHaveBeenCalled();
  });
  test('enabled legacy flag without master switch cannot run flow/rules or manual starts', async () => {
    config = { enabled: true, welcomeEnabled: true, welcomeMessage: 'No' };
    flows = [selected([{ nodeId: 'text', type: 'message', messageText: 'No' }], { triggerKeywords: ['hello'] })];
    rules = [{ _id: 'any', createdByUserId: owner, enabled: true, triggerType: 'any_message', actionType: 'send_text', actionText: 'No' }];
    await runtime.inbound(event());
    expect(deps.send).not.toHaveBeenCalled();
    await expect(runtime.start({ leadId: 'lead-one', flowId: 'flow-one', phoneNumber: phone, ownerUserId: owner })).rejects.toMatchObject({ code: 'chatbot_disabled' });
  });
  test('canonical state read and cancellation atomically stop flow and pending actions', async () => {
    flows = [selected([{ nodeId: 'delay', type: 'delay', delaySeconds: 60, nextNodeId: 'text' },
      { nodeId: 'text', type: 'message', messageText: 'No resend' }], { triggerKeywords: ['join'] })];
    await runtime.inbound(event('wamid.start', 'join'));
    expect(await runtime.readState({ leadId: 'lead-one', ownerUserId: owner })).toMatchObject({
      state: { flowId: 'flow-one', nodeId: 'text' }, requiresReconciliation: false,
    });
    expect(await runtime.cancel({ leadId: 'lead-one', ownerUserId: owner })).toMatchObject({ success: true, state: null });
    expect((await lead()).metadata.chatbotFlowState).toBeNull();
    expect((await db.execute('SELECT status FROM chatbot_scheduled_actions_sql')).rows[0].status).toBe('cancelled');
    expect(await runtime.readState({ leadId: 'lead-one', ownerUserId: owner })).toMatchObject({ state: null });
    clock = new Date(clock.getTime() + 60_000);
    await runtime.runDue();
    expect(deps.send).not.toHaveBeenCalled();
  });
  test('cancel preserves uncertain send guard and does not enable another automatic send', async () => {
    jest.mocked(deps.persistMessage).mockRejectedValueOnce(new Error('SQL failed'));
    await expect(runtime.inbound(event())).rejects.toMatchObject({ code: 'accepted_persistence_failed' });
    expect(await runtime.cancel({ leadId: 'lead-one', ownerUserId: owner })).toMatchObject({ requiresReconciliation: true });
    expect(await runtime.readState({ leadId: 'lead-one', ownerUserId: owner })).toMatchObject({ state: null, requiresReconciliation: true });
    await expect(runtime.inbound(event('wamid.after-cancel'))).rejects.toMatchObject({ code: 'send_requires_reconciliation' });
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('state read/cancel rejects cross-tenant contact access', async () => {
    await expect(runtime.readState({ leadId: 'lead-one', ownerUserId: 'other' })).rejects.toMatchObject({ code: 'ownership' });
    await expect(runtime.cancel({ leadId: 'lead-one', ownerUserId: 'other' })).rejects.toMatchObject({ code: 'ownership' });
  });
  test('distinct inbound while busy is durably deferred and cron replays it once after unlock', async () => {
    config.keywords = [{ keyword: 'second', response: 'Second response' }];
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    jest.mocked(deps.send).mockImplementationOnce(async () => { entered(); await gate; return 'wamid.first'; });
    const first = runtime.inbound(event('wamid.first', 'hello'));
    await started;
    await expect(runtime.inbound(event('wamid.second', 'second', { creds: { phoneNumberId: 'meta-account-one', accessToken: 'must-not-persist' } })))
      .rejects.toMatchObject({ code: 'conversation_busy', status: 503 });
    const deferred = (await db.execute("SELECT status,payload_json FROM chatbot_runtime_events_sql WHERE message_id='wamid.second'")).rows[0];
    expect(deferred.status).toBe('deferred');
    expect(String(deferred.payload_json)).not.toContain('must-not-persist');
    expect(await runtime.runDue()).toMatchObject({ deferredEvents: 1, replayedEvents: 0 });
    release(); await first;
    runtime = createBunnyChatbotRuntime(deps);
    expect(await runtime.runDue()).toMatchObject({ deferredEvents: 1, replayedEvents: 1 });
    expect(deps.send).toHaveBeenCalledTimes(2);
    expect(deps.send).toHaveBeenLastCalledWith(phone, expect.objectContaining({ text: { body: 'Second response' } }), expect.anything());
    await runtime.runDue();
    await runtime.inbound(event('wamid.second', 'second'));
    expect(deps.send).toHaveBeenCalledTimes(2);
  });
  test('deferred inbound retains original timestamp instead of reopening 24h window at cron time', async () => {
    await runtime.inbound(event('wamid.initial'));
    await db.execute({ sql: 'UPDATE chatbot_runtime_state_sql SET lock_token=?,lock_until=?',
      args: ['other-worker', new Date(clock.getTime() + 60_000).toISOString()] });
    config.keywords = [{ keyword: 'reply', response: 'Reply' }];
    await expect(runtime.inbound(event('wamid.deferred', 'reply'))).rejects.toMatchObject({ code: 'conversation_busy', status: 503 });
    clock = new Date(clock.getTime() + 25 * 3600_000);
    const result = await runtime.runDue();
    expect(result.replayedEvents).toBe(0);
    expect(result.actionResults[0].error).toContain('24-hour');
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
  test('Meta 503 retry can atomically reclaim a deferred event without awaiting cron', async () => {
    await runtime.inbound(event('wamid.initial'));
    await db.execute({ sql: 'UPDATE chatbot_runtime_state_sql SET lock_token=?,lock_until=?',
      args: ['busy-worker', new Date(clock.getTime() + 60_000).toISOString()] });
    config.keywords = [{ keyword: 'reply', response: 'Recovered' }];
    await expect(runtime.inbound(event('wamid.retry', 'reply'))).rejects.toMatchObject({ code: 'conversation_busy', status: 503 });
    await db.execute('UPDATE chatbot_runtime_state_sql SET lock_token=NULL,lock_until=NULL');
    const results = await Promise.all([runtime.inbound(event('wamid.retry', 'reply')), runtime.inbound(event('wamid.retry', 'reply'))]);
    expect(results.map(result => result.status).sort()).toEqual(['completed', 'duplicate']);
    expect(deps.send).toHaveBeenCalledTimes(2);
    await runtime.runDue();
    expect(deps.send).toHaveBeenCalledTimes(2);
  });
});
