/** @jest-environment node */
jest.mock('@/lib/chatbotScheduler', () => ({ runDueChatbotActions: jest.fn() }));
jest.mock('@/lib/crm-handlers', () => ({ handleCrmError: jest.fn() }));
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/crm/chatbot-actions/run/route';
import { runDueChatbotActions } from '@/lib/chatbotScheduler';

describe('Chatbot action cron authentication', () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => { process.env.CRON_SECRET = original; jest.clearAllMocks(); });
  it('fails closed with a missing secret', async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(new NextRequest('http://localhost/api/admin/crm/chatbot-actions/run'))).status).toBe(503);
    expect(runDueChatbotActions).not.toHaveBeenCalled();
  });
  it('does not trust a spoofed Vercel user-agent', async () => {
    process.env.CRON_SECRET = 'unit-test-secret';
    expect((await GET(new NextRequest('http://localhost/api/admin/crm/chatbot-actions/run', {
      headers: { 'user-agent': 'vercel-cron/1.0' },
    }))).status).toBe(401);
    expect(runDueChatbotActions).not.toHaveBeenCalled();
  });
  it('runs bounded actions with the correct secret', async () => {
    process.env.CRON_SECRET = 'unit-test-secret';
    jest.mocked(runDueChatbotActions).mockResolvedValue({ scannedActions: 0, executedActions: 0, delayedMessages: 0, timeoutActions: 0, failedActions: 0, actionResults: [] });
    expect((await GET(new NextRequest('http://localhost/api/admin/crm/chatbot-actions/run', {
      headers: { authorization: 'Bearer unit-test-secret' },
    }))).status).toBe(200);
    expect(runDueChatbotActions).toHaveBeenCalledWith({ limit: 25 });
  });
});
