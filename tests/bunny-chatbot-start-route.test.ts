/** @jest-environment node */
jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }));
jest.mock('@/lib/crm-handlers', () => ({
  getViewerUserId: (decoded: any) => decoded.userId,
  isSuperAdmin: (decoded: any) => ['admin', 'admincrm'].includes(decoded.userId),
}));
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn() }));
jest.mock('@/lib/bunnyLeadsRepository', () => ({ getBunnyLeadById: jest.fn() }));
jest.mock('@/lib/bunnyChatbotMetaRuntime', () => ({ bunnyChatbotMetaRuntime: { start: jest.fn() } }));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/crm/chatbot-flows/start/route';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { getBunnyLeadById } from '@/lib/bunnyLeadsRepository';
import { bunnyChatbotMetaRuntime } from '@/lib/bunnyChatbotMetaRuntime';
import { ChatbotRuntimeError } from '@/lib/bunnyChatbotRuntimeEngine';

describe('Chatbot manual start authorization and response contract', () => {
  const request = () => new NextRequest('http://localhost/api/admin/crm/chatbot-flows/start', {
    method: 'POST', headers: { Authorization: 'Bearer mock-test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ flowId: 'flow-one', leadId: 'lead-one', ownerUserId: 'spoofed-owner' }),
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(verifyToken).mockReturnValue({ isAdmin: true, userId: 'tenant-one' } as any);
    jest.mocked(bunnyExecute).mockResolvedValue({ rows: [{ created_by_user_id: 'tenant-one' }] } as any);
    jest.mocked(getBunnyLeadById).mockResolvedValue({ _id: 'lead-one', phoneNumber: '919876543210', createdByUserId: 'tenant-one' });
    jest.mocked(bunnyChatbotMetaRuntime.start).mockResolvedValue({
      success: true, message: 'Flow started', sentCount: 1, currentNode: 'question', flowCompleted: false,
    });
  });
  test('website userId alone is not admin authorization', async () => {
    jest.mocked(verifyToken).mockReturnValue({ userId: 'tenant-one' } as any);
    expect((await POST(request())).status).toBe(401);
    expect(bunnyChatbotMetaRuntime.start).not.toHaveBeenCalled();
  });
  test('tenant cannot start another owner flow even with role/permission spoofing', async () => {
    jest.mocked(verifyToken).mockReturnValue({ isAdmin: true, userId: 'tenant-one', role: 'superadmin', permissions: ['all'] } as any);
    jest.mocked(bunnyExecute).mockResolvedValue({ rows: [{ created_by_user_id: 'another-tenant' }] } as any);
    expect((await POST(request())).status).toBe(403);
    expect(bunnyChatbotMetaRuntime.start).not.toHaveBeenCalled();
  });
  test('flow ownership is insufficient for a foreign lead', async () => {
    jest.mocked(getBunnyLeadById).mockResolvedValue({ _id: 'lead-one', phoneNumber: '919876543210', createdByUserId: 'another-tenant' });
    expect((await POST(request())).status).toBe(403);
    expect(bunnyChatbotMetaRuntime.start).not.toHaveBeenCalled();
  });
  test('owned flow starts with server-resolved owner, preserving response keys', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, sentCount: 1, currentNode: 'question', flowCompleted: false });
    expect(bunnyChatbotMetaRuntime.start).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 'tenant-one' }));
  });
  test('Super Admin may manage a tenant flow but still uses the tenant credentials scope', async () => {
    jest.mocked(verifyToken).mockReturnValue({ isAdmin: true, userId: 'admincrm' } as any);
    expect((await POST(request())).status).toBe(200);
    expect(bunnyChatbotMetaRuntime.start).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 'tenant-one' }));
  });
  test('24h policy error is not success', async () => {
    jest.mocked(bunnyChatbotMetaRuntime.start).mockRejectedValue(new ChatbotRuntimeError('outside_24h', 'Use an approved template', 422));
    const response = await POST(request());
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ success: false, code: 'outside_24h' });
  });
  test('accepted send persistence failure exposes reconciliation evidence without retry', async () => {
    jest.mocked(bunnyChatbotMetaRuntime.start).mockRejectedValue(new ChatbotRuntimeError('accepted_persistence_failed', 'Persistence failed', 502, 'wamid.accepted'));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ success: false, acceptedMessageId: 'wamid.accepted', automaticResend: false });
    expect(bunnyChatbotMetaRuntime.start).toHaveBeenCalledTimes(1);
  });
});
