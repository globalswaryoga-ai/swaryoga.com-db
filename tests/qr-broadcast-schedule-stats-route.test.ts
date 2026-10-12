/** @jest-environment node */

import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(() => ({ userId: 'tenant-1', isAdmin: true })),
}));
jest.mock('@/lib/bunnyQrBroadcastScheduleRepository', () => ({
  getBunnyQrBroadcastSchedule: jest.fn(),
}));
jest.mock('@/lib/messageDeduplication', () => ({
  getBunnyMessageDedupStats: jest.fn().mockResolvedValue({ totalSent: 2 }),
}));

import { getBunnyQrBroadcastSchedule } from '@/lib/bunnyQrBroadcastScheduleRepository';
import { getBunnyMessageDedupStats } from '@/lib/messageDeduplication';
import { GET } from '@/app/api/admin/crm/qr-broadcast-schedule/stats/route';

describe('QR broadcast schedule stats route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads stats from Bunny only after confirming schedule ownership', async () => {
    jest.mocked(getBunnyQrBroadcastSchedule).mockResolvedValue({ _id: 'schedule-1' } as never);

    const request = new NextRequest(
      'https://crm.example.test/api/admin/crm/qr-broadcast-schedule/stats?scheduleId=schedule-1',
      { headers: { Authorization: 'Bearer test-token' } },
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, stats: { totalSent: 2 } });
    expect(getBunnyQrBroadcastSchedule).toHaveBeenCalledWith('schedule-1', 'tenant-1');
    expect(getBunnyMessageDedupStats).toHaveBeenCalledWith('schedule-1');
  });

  it('does not return stats for another tenant schedule', async () => {
    jest.mocked(getBunnyQrBroadcastSchedule).mockResolvedValue(null);

    const request = new NextRequest(
      'https://crm.example.test/api/admin/crm/qr-broadcast-schedule/stats?scheduleId=other-schedule',
      { headers: { Authorization: 'Bearer test-token' } },
    );
    const response = await GET(request);

    expect(response.status).toBe(404);
    expect(getBunnyMessageDedupStats).not.toHaveBeenCalled();
  });
});
