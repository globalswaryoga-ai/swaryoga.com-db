export function workshopSessionCalendar(startDate: string, holidayDates?: string[], sessionCount?: number): Array<{ classDate: string; dayNumber: number; holiday: boolean }>;
export function attendanceDuration(participants: Array<{ joinTime?: string; leaveTime?: string; durationSeconds?: number }>): number;
