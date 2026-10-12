jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn(),
}));

import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  createBunnyQrBroadcastSchedule,
  listBunnyQrBroadcastSchedules,
} from '@/lib/bunnyQrBroadcastScheduleRepository';
import { resolveStartTimeFromSchedules } from '@/lib/qrGroupScheduleGap';

describe('Bunny QR broadcast schedules', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a schedule in Bunny SQL without a Mongo model', async () => {
    jest.mocked(bunnyExecute).mockResolvedValue({ rows: [], rowsAffected: 1 } as never);

    const schedule = await createBunnyQrBroadcastSchedule({
      userId: 'tenant-1',
      createdBy: 'tenant-1',
      frequency: 'custom',
      status: 'scheduled',
      isActive: true,
      startTime: '09:00',
      customScheduleDates: [new Date('2026-10-13T00:00:00+05:30')],
      recipientChatIds: ['123@g.us'],
    });

    expect(schedule._id).toEqual(expect.any(String));
    expect(schedule.recipientChatIds).toEqual(['123@g.us']);
    expect(jest.mocked(bunnyExecute)).toHaveBeenCalledWith(expect.objectContaining({
      sql: expect.stringContaining('INSERT INTO qr_broadcast_schedules_sql'),
    }));
  });

  it('maps stored schedules back to the API shape', async () => {
    jest.mocked(bunnyExecute).mockResolvedValue({
      rows: [{
        document_id: 'schedule-1',
        user_id: 'tenant-1',
        created_by: 'tenant-1',
        frequency: 'custom',
        status: 'scheduled',
        is_active: 1,
        start_time: '09:00',
        custom_schedule_dates_json: '["2026-10-13T00:00:00.000Z"]',
        data_json: JSON.stringify({ name: 'Morning group', recipientChatIds: ['123@g.us'] }),
        created_at: '2026-10-12T00:00:00.000Z',
        updated_at: '2026-10-12T00:00:00.000Z',
      }],
    } as never);

    const [schedule] = await listBunnyQrBroadcastSchedules({ userId: 'tenant-1' });
    expect(schedule).toMatchObject({
      _id: 'schedule-1',
      name: 'Morning group',
      isActive: true,
      recipientChatIds: ['123@g.us'],
    });
    expect(schedule.customScheduleDates[0]).toBeInstanceOf(Date);
  });

  it('shifts overlapping group schedules using SQL-loaded schedule data', () => {
    const start = resolveStartTimeFromSchedules(
      [{
        startTime: '09:00',
        customScheduleDates: [new Date('2026-10-13T00:00:00+05:30')],
      }],
      '09:00',
      [new Date('2026-10-13T00:00:00+05:30')],
    );

    expect(start).toBe('09:15');
  });
});
