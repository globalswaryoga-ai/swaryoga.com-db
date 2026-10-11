import { workshopSessionCalendar } from './workshopSessionUtils';

interface ReportStudent { _id: string; name: string; email?: string; phone?: string; whatsappNumber?: string; }
interface ReportAttendance { studentId: string; classDate: string; joined: boolean; durationSeconds: number; }

export function buildWorkshopAttendanceReport(
  startDate: string, holidays: string[], students: ReportStudent[], attendance: ReportAttendance[], today: string,
) {
  const sessions = workshopSessionCalendar(startDate, holidays).filter(day => !day.holiday);
  const byIdentity = new Map(attendance.map(row => [`${row.studentId}:${row.classDate}`, row]));
  const rows = students.map(student => {
    const cells = sessions.map(session => {
      const record = byIdentity.get(`${student._id}:${session.classDate}`);
      if (session.classDate > today) return { ...session, status: 'Upcoming', minutes: 0 };
      if (!record) return { ...session, status: 'Pending', minutes: 0 };
      const minutes = Math.round(Math.max(0, Number(record.durationSeconds) || 0) / 60);
      return { ...session, status: record.joined ? 'Present' : 'Absent', minutes };
    });
    const confirmed = cells.filter(cell => cell.status === 'Present' || cell.status === 'Absent').length;
    const attended = cells.filter(cell => cell.status === 'Present').length;
    const pending = cells.filter(cell => cell.status === 'Pending').length;
    const percent = confirmed ? Math.round(attended / confirmed * 100) : null;
    const grade = percent === null ? 'Pending' : percent >= 90 ? 'A' : percent >= 70 ? 'B' : percent >= 50 ? 'C' : percent >= 30 ? 'D' : 'E';
    return { student, cells, attended, confirmed, pending, percent, grade, totalMinutes: cells.reduce((sum, cell) => sum + cell.minutes, 0) };
  });
  return { sessions, rows };
}

export function attendanceReportTable(report: ReturnType<typeof buildWorkshopAttendanceReport>) {
  return [
    ['#', 'Student', 'Phone / WhatsApp', 'Email', 'Present sessions', 'Confirmed sessions', 'Pending sessions', 'Total minutes', 'Attendance % (confirmed)', 'Provisional grade',
      ...report.sessions.map(session => `Day ${session.dayNumber} (${session.classDate})`)],
    ...report.rows.map((row, index) => [
      index + 1, row.student.name, row.student.whatsappNumber || row.student.phone || '', row.student.email || '',
      row.attended, row.confirmed, row.pending, row.totalMinutes, row.percent ?? '', row.grade,
      ...row.cells.map(cell => cell.status === 'Present' ? `${cell.minutes} min` : cell.status),
    ]),
  ];
}

export function reportCsv(table: (string | number)[][]) {
  return '\uFEFF' + table.map(row => row.map(value => {
    const text = String(value);
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}
