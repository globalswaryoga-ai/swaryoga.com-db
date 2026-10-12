/** @jest-environment node */

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn(),
}));

import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { getBunnyMessageDedupStats } from '@/lib/messageDeduplication';

describe('Bunny QR message dedup stats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('aggregates schedule send statistics from Bunny SQL', async () => {
    jest.mocked(bunnyExecute).mockResolvedValueOnce({
      rows: [{
        totalSent: 12,
        totalUniqueRecipients: 9,
        todaySent: 3,
        todayUniqueRecipients: 2,
        weekSent: 8,
        weekUniqueRecipients: 6,
        lastMessageAt: '2026-10-12T12:00:00.000Z',
      }],
    } as never);

    const stats = await getBunnyMessageDedupStats('schedule-1', new Date('2026-10-12T12:00:00.000Z'));

    expect(stats).toEqual({
      totalSent: 12,
      totalUniqueRecipients: 9,
      todaySent: 3,
      todayUniqueRecipients: 2,
      weekSent: 8,
      weekUniqueRecipients: 6,
      lastMessageAt: '2026-10-12T12:00:00.000Z',
    });
    expect(bunnyBatch).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS message_dedup_log_sql') }),
      expect.objectContaining({ sql: expect.stringContaining('idx_message_dedup_schedule_sent') }),
    ]));
    expect(bunnyExecute).toHaveBeenCalledWith(expect.objectContaining({
      sql: expect.stringContaining('FROM message_dedup_log_sql'),
      args: [expect.any(String), expect.any(String), expect.any(String), expect.any(String), 'schedule-1'],
    }));
  });
});
