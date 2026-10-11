/** @jest-environment node */
import { workshopSessionCalendar, attendanceDuration } from '../lib/workshopSessionUtils';
import { syncWorkshopZoomAttendance, syncDueWorkshopZoomAttendance } from '../lib/workshop-zoom-attendance';
import { getFullMeetingAnalytics } from '../lib/zoom-analytics';
import { getCohort, listCohorts, listStudents, upsertAttendance } from '../lib/workshopBunnyRepository';

jest.mock('../lib/zoom-analytics', () => ({ getFullMeetingAnalytics: jest.fn() }));
jest.mock('../lib/workshopBunnyRepository', () => ({ getCohort: jest.fn(), listCohorts: jest.fn(), listStudents: jest.fn(), upsertAttendance: jest.fn(), updateCohort: jest.fn() }));

const participant = (start: string, end: string) => ({ name: 'Test Student', email: 'test@example.com', joinTime: `2026-10-12T${start}:00Z`, leaveTime: `2026-10-12T${end}:00Z`, durationSeconds: 600 });

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCohort).mockResolvedValue({ _id: 'c', name: 'Workshop', startDate: '2026-10-12', holidayDates: [], timezone: 'Asia/Kolkata', zoomMeetingId: '123 456' });
  jest.mocked(listStudents).mockResolvedValue([{ _id: 's', name: 'Test Student', email: 'test@example.com', phone: '919999999999' }]);
});

test('14 sessions exclude Sundays and duplicate/out-of-range holidays', () => {
  const calendar = workshopSessionCalendar('2026-10-12', ['2026-10-13', '2026-10-13', '2026-11-20']);
  expect(calendar.filter(row => !row.holiday)).toHaveLength(14);
  expect(calendar.at(-1)?.classDate).toBe('2026-10-28');
  expect(calendar.find(row => row.classDate === '2026-10-18')?.holiday).toBe(true);
});

test('invalid dates cannot generate an infinite calendar', () => {
  expect(() => workshopSessionCalendar('2026-02-30')).toThrow('invalid');
  expect(() => workshopSessionCalendar('', [], 14)).toThrow('invalid');
});

test('rejoins add time, while overlapping devices and duplicate rows count once', () => {
  expect(attendanceDuration([participant('04:00', '04:10'), participant('04:05', '04:20'), participant('04:00', '04:10'), participant('04:25', '04:35')])).toBe(1800);
});

test('duration-only duplicate evidence is counted once', () => {
  expect(attendanceDuration([{ durationSeconds: 90 }, { durationSeconds: 90 }, { durationSeconds: 30 }])).toBe(120);
});

test('Zoom reconnects write a single student/date record and retry replaces it', async () => {
  jest.mocked(getFullMeetingAnalytics).mockResolvedValue({
    sessions: [{ uuid: 'z', date: '2026-10-12', startTime: '2026-10-12T04:00:00Z', duration: 60, participants: [participant('04:00', '04:10'), participant('04:05', '04:20'), participant('04:25', '04:35')] }],
  } as Awaited<ReturnType<typeof getFullMeetingAnalytics>>);
  const result = await syncWorkshopZoomAttendance('c');
  expect(result.updated).toBe(1);
  expect(upsertAttendance).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's', classDate: '2026-10-12', durationSeconds: 1800, attendancePercent: 50 }));
  await syncWorkshopZoomAttendance('c');
  expect(upsertAttendance).toHaveBeenCalledTimes(2);
});

test('cron requests analytics once per cohort, rather than once per calendar date', async () => {
  jest.mocked(listCohorts).mockResolvedValue([{ _id: 'c', zoomMeetingId: '123' }]);
  jest.mocked(getFullMeetingAnalytics).mockResolvedValue({ sessions: [] } as Awaited<ReturnType<typeof getFullMeetingAnalytics>>);
  await syncDueWorkshopZoomAttendance();
  expect(getFullMeetingAnalytics).toHaveBeenCalledTimes(1);
});

test('duplicate Zoom UUIDs do not inflate the daily class denominator', async () => {
  const session = { uuid: 'z', date: '2026-10-12', startTime: '2026-10-12T04:00:00Z', duration: 60, participants: [participant('04:00', '04:10')] };
  jest.mocked(getFullMeetingAnalytics).mockResolvedValue({ sessions: [session, session] } as Awaited<ReturnType<typeof getFullMeetingAnalytics>>);
  await syncWorkshopZoomAttendance('c');
  expect(upsertAttendance).toHaveBeenCalledTimes(1);
  expect(upsertAttendance).toHaveBeenCalledWith(expect.objectContaining({ durationSeconds: 600, attendancePercent: 17 }));
});
