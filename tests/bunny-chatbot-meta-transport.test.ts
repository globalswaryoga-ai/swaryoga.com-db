/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), bunnyBatch: jest.fn() }));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ getBunnyLeadById: jest.fn() }));
jest.mock('@/lib/bunnyChatbotSettingsRepository', () => ({ getBunnyChatbotSettings: jest.fn() }));
jest.mock('@/lib/bunnyChatbotRepository', () => ({ ensureBunnyChatbotSchema: jest.fn() }));
jest.mock('@/lib/bunnyWhatsAppAccounts', () => ({ getBunnyMetaCredentialsForTenant: jest.fn() }));
jest.mock('@/lib/bunnyTemplatesRepository', () => ({ getTemplateById: jest.fn() }));
jest.mock('@/lib/bunnyMetaWhatsAppRepository', () => ({
  initBunnyMetaWhatsAppSchema: jest.fn(), upsertBunnyMetaMessage: jest.fn(), listBunnyMetaMessages: jest.fn(),
}));
jest.mock('@/lib/ai/generateWithFallback', () => ({ generateAIText: jest.fn() }));
jest.mock('@/lib/workshopRecordingAccess', () => ({ handleWorkshopRecordingRequest: jest.fn() }));
jest.mock('@/lib/bunnyAutomationRepository', () => ({ listBunnyAutomationRules: jest.fn() }));
jest.mock('@/lib/whatsapp', () => ({
  normalizePhone: (value: string) => value.replace(/\D/g, ''),
  getWhatsAppEnv: jest.fn(),
  generateAppSecretProof: () => 'mock-proof',
  buildGraphMessagesUrl: (id: string, proof: string) => `https://graph.invalid/${id}/messages?appsecret_proof=${proof}`,
}));
import { sendChatbotMetaOnce } from '@/lib/bunnyChatbotMetaRuntime';

describe('Meta chatbot single-attempt transport (no live sends)', () => {
  const originalFetch = global.fetch;
  const credentials = { accessToken: 'test-token-not-real', phoneNumberId: 'account-one' };
  beforeEach(() => { global.fetch = jest.fn(); });
  afterEach(() => { global.fetch = originalFetch; });
  test('preserves native buttons and strips internal fields from provider payload', async () => {
    jest.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: 'wamid.accepted' }] }) } as any);
    const interactive = { type: 'button', body: { text: 'Choose' }, action: { buttons: [{ type: 'reply', reply: { id: 'join', title: 'Join' } }] } };
    expect(await sendChatbotMetaOnce('919876543210', { type: 'interactive', interactive, _nodeId: 'one' }, credentials)).toBe('wamid.accepted');
    const call = jest.mocked(global.fetch).mock.calls[0];
    expect(call[0]).toContain('appsecret_proof=mock-proof');
    expect(JSON.parse(String(call[1]?.body))).toEqual({ messaging_product: 'whatsapp', recipient_type: 'individual', to: '919876543210', type: 'interactive', interactive });
  });
  test('ambiguous network result never triggers a retry or plain-text downgrade', async () => {
    jest.mocked(global.fetch).mockRejectedValue(new Error('reset after POST'));
    await expect(sendChatbotMetaOnce('919876543210', { type: 'interactive' }, credentials)).rejects.toThrow('reset after POST');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  test('provider rejects without text fallback or retry', async () => {
    jest.mocked(global.fetch).mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { message: 'Bad button' } }) } as any);
    await expect(sendChatbotMetaOnce('919876543210', { type: 'interactive' }, credentials)).rejects.toMatchObject({ code: 'provider_rejected' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  test('successful response without provider ID is explicit uncertainty', async () => {
    jest.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as any);
    await expect(sendChatbotMetaOnce('919876543210', { type: 'text', text: { body: 'Test' } }, credentials)).rejects.toMatchObject({ code: 'provider_result_unknown' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
