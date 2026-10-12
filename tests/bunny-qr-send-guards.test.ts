jest.mock('@/lib/db', () => ({
  USE_BUNNY_DATABASE_ONLY: false,
  connectDB: jest.fn(),
}));

jest.mock('@/lib/bunnyDatabase', () => ({
  bunnyBatch: jest.fn().mockResolvedValue([]),
  bunnyExecute: jest.fn(),
}));

jest.mock('@/lib/bunnyCrmSettings', () => ({
  getBunnyCrmUserSettings: jest.fn().mockResolvedValue({ qrConnectedPhoneNumber: '+919876543210' }),
}));

import { bunnyExecute } from '@/lib/bunnyDatabase';
import { reserveSendSlot, reserveSendGap } from '@/lib/qrSendRateLimit';
import { getQRAccountRestriction, markQRAccountRestricted } from '@/lib/whatsappRestriction';
import { connectDB } from '@/lib/db';

describe('Bunny-backed QR scheduler send guards', () => {
  beforeEach(() => jest.clearAllMocks());

  it('atomically reserves a per-phone message slot in Bunny SQL', async () => {
    jest.mocked(bunnyExecute).mockImplementation(async (statement: any) => {
      if (statement.sql.includes('SELECT day_sent')) {
        return { rows: [{ day_sent: 1, hour_sent: 1 }], rowsAffected: 0 } as never;
      }
      return { rows: [], rowsAffected: statement.sql.includes('day_sent=day_sent+1') ? 1 : 0 } as never;
    });

    const result = await reserveSendSlot('tenant-1', true);

    expect(result).toMatchObject({ allowed: true, daySent: 1, hourSent: 1 });
    expect(jest.mocked(bunnyExecute)).toHaveBeenCalledWith(expect.objectContaining({
      sql: expect.stringContaining('day_sent=day_sent+1'),
      args: expect.arrayContaining(['phone:919876543210']),
    }));
    expect(connectDB).not.toHaveBeenCalled();
  });

  it('reserves a global per-phone send gap in Bunny SQL', async () => {
    jest.mocked(bunnyExecute).mockImplementation(async (statement: any) => ({
      rows: [],
      rowsAffected: statement.sql.includes('last_send_at=?') ? 1 : 0,
    }) as never);

    await expect(reserveSendGap('tenant-1', undefined, true)).resolves.toEqual({ allowed: true });
    expect(jest.mocked(bunnyExecute)).toHaveBeenCalledWith(expect.objectContaining({
      sql: expect.stringContaining('last_send_at IS NULL OR last_send_at<=?'),
      args: expect.arrayContaining(['phone:919876543210']),
    }));
  });

  it('persists and reads account restrictions through Bunny SQL', async () => {
    jest.mocked(bunnyExecute).mockImplementation(async (statement: any) => ({
      rows: statement.sql.startsWith('SELECT restricted_until')
        ? [{ restricted_until: '2026-10-13T00:00:00.000Z', restriction_reason: 'provider restriction' }]
        : [],
      rowsAffected: 1,
    }) as never);

    await markQRAccountRestricted('+91 98765 43210', 'provider restriction', 24, true);
    await expect(getQRAccountRestriction('919876543210', true)).resolves.toMatchObject({
      restricted: true,
      reason: 'provider restriction',
    });
    expect(jest.mocked(bunnyExecute)).toHaveBeenCalledWith(expect.objectContaining({
      sql: expect.stringContaining('INSERT INTO qr_account_restrictions_sql'),
    }));
  });
});
