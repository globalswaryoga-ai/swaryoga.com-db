/** @jest-environment node */
import { buildWorkshopAttendanceReport, attendanceReportTable, reportCsv } from '../lib/workshopAttendanceReport';

test('reports preserve 14 actual sessions and distinguish missing reports from absences', () => {
  const report = buildWorkshopAttendanceReport('2026-10-06', ['2026-10-08'], [{ _id: 's', name: 'Test' }], [
    { studentId: 's', classDate: '2026-10-06', joined: true, durationSeconds: 4800 },
    { studentId: 's', classDate: '2026-10-07', joined: false, durationSeconds: 0 },
  ], '2026-10-10');
  expect(report.sessions).toHaveLength(14);
  expect(report.sessions.some(day => day.classDate === '2026-10-08')).toBe(false);
  expect(report.rows[0]).toMatchObject({ attended: 1, confirmed: 2, percent: 50, grade: 'C', totalMinutes: 80, pending: 2 });
  expect(report.rows[0].cells.map(cell => cell.status).slice(0, 5)).toEqual(['Present', 'Absent', 'Pending', 'Pending', 'Upcoming']);
  const table = attendanceReportTable(report);
  expect(table[0]).toHaveLength(table[1].length);
  expect(table[1]).toContain('80 min');
  expect(table[1]).toContain('Pending');
  expect(table[1]).toContain('Upcoming');
});

test('students with no saved records are not given a failing grade', () => {
  const report = buildWorkshopAttendanceReport('2026-10-06', [], [{ _id: 's', name: 'Test' }], [], '2026-10-10');
  expect(report.rows[0]).toMatchObject({ percent: null, grade: 'Pending' });
});

test('CSV handles multilingual names, quotes, commas and spreadsheet formula values', () => {
  const csv = reportCsv([['Name', 'Phone'], ['मोहान, "Test"', '+919999999999'], ['=1+1', '']]);
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"मोहान, ""Test"""');
  expect(csv).toContain('"\'=1+1"');
  expect(csv).toContain('"\' +919999999999"'.replace("' ", "'"));
});
