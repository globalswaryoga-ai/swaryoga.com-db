/** @jest-environment node */
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({
  USE_BUNNY_DATABASE_ONLY: false,
  connectDB: jest.fn(),
}));
jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(() => ({ userId: 'tenant-1', isAdmin: true, tenantSlug: 'tenant-1' })),
}));
jest.mock('@/lib/qrTenantSession', () => ({
  resolveOwnerSessionKey: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/qrTenantBridge', () => ({
  resolveQrTenantBridge: jest.fn().mockResolvedValue({
    sessionKey: 'tenant-session',
    tenantId: 'tenant-1',
    connectedPhone: '919876543210',
  }),
}));
jest.mock('@/lib/bunnyQrBroadcastScheduleRepository', () => ({
  createBunnyQrBroadcastSchedule: jest.fn(async input => ({ ...input, _id: 'schedule-1' })),
  listBunnyQrBroadcastSchedules: jest.fn().mockResolvedValue([]),
}));

import { connectDB } from '@/lib/db';
import { createBunnyQrBroadcastSchedule, listBunnyQrBroadcastSchedules } from '@/lib/bunnyQrBroadcastScheduleRepository';
import { POST } from '@/app/api/admin/crm/qr-broadcast-schedule/route';

describe('QR broadcast schedule creation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates custom group schedules using Bunny SQL paths in hybrid mode', async () => {
    const request = new NextRequest('https://crm.example.test/api/admin/crm/qr-broadcast-schedule', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'October group class',
        messageText: 'Reminder message',
        startTime: '18:00',
        endTime: '18:30',
        frequency: 'custom',
        customScheduleDates: ['2026-10-13'],
        recipientChatIds: ['123456789@g.us'],
        groupIds: ['123456789@g.us'],
      }),
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.data).toMatchObject({
      _id: 'schedule-1',
      startTime: '18:00',
      recipientChatIds: ['123456789@g.us'],
    });
    expect(listBunnyQrBroadcastSchedules).toHaveBeenCalledWith({ userId: 'tenant-1', limit: 1000 });
    expect(createBunnyQrBroadcastSchedule).toHaveBeenCalledWith(expect.objectContaining({
      frequency: 'custom',
      recipientChatIds: ['123456789@g.us'],
      sessionKey: 'tenant-session',
    }));
    expect(connectDB).not.toHaveBeenCalled();
  });
});
