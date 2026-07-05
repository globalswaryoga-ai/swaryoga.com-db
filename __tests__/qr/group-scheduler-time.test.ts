import { isWithinTimeWindow, shouldRunToday } from '@/lib/qrGroupScheduleTime';

describe('QR group scheduler time rules', () => {
  const tuesday1030Ist = new Date('2026-06-30T05:00:00.000Z');

  it('uses the configured timezone for the send window', () => {
    expect(isWithinTimeWindow('10:00', '11:00', 'Asia/Kolkata', tuesday1030Ist)).toBe(true);
    expect(isWithinTimeWindow('11:00', '12:00', 'Asia/Kolkata', tuesday1030Ist)).toBe(false);
  });

  it('handles windows crossing midnight', () => {
    const midnightIst = new Date('2026-06-29T18:45:00.000Z');
    expect(isWithinTimeWindow('23:50', '00:20', 'Asia/Kolkata', midnightIst)).toBe(true);
  });

  it('uses IST weekday for weekly schedules', () => {
    expect(shouldRunToday('weekly', [2], undefined, undefined, 'Asia/Kolkata', tuesday1030Ist)).toBe(true);
    expect(shouldRunToday('weekly', [1], undefined, undefined, 'Asia/Kolkata', tuesday1030Ist)).toBe(false);
  });

  it('matches custom calendar dates in IST', () => {
    const dates = [new Date('2026-06-30T00:00:00+05:30')];
    expect(shouldRunToday('custom', [], undefined, dates, 'Asia/Kolkata', tuesday1030Ist)).toBe(true);
  });
});
