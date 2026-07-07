export function isWithinTimeWindow(startTime: string, endTime: string, timezone = 'Asia/Kolkata', now = new Date()): boolean {
  const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const current = local.getHours() * 60 + local.getMinutes();
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return end < start ? current >= start || current <= end : current >= start && current <= end;
}

export function shouldRunToday(
  frequency: string,
  daysOfWeek: number[],
  firstRunDate?: Date,
  customScheduleDates?: Date[],
  timezone = 'Asia/Kolkata',
  now = new Date(),
): boolean {
  const localDate = (date: Date) => new Date(date.toLocaleString('en-US', { timeZone: timezone })).toDateString();
  if (frequency === 'once') return !firstRunDate || localDate(firstRunDate) === localDate(now);
  if (frequency === 'daily') return true;
  if (frequency === 'weekly') {
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(now);
    return daysOfWeek.includes(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday));
  }
  if (frequency === 'custom') {
    return Array.isArray(customScheduleDates) && customScheduleDates.some((date) => localDate(new Date(date)) === localDate(now));
  }
  return false;
}
