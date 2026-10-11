export function isChatbotOfficeOpen(settings: {
  officeHoursEnabled?: boolean; officeHoursStart?: string; officeHoursEnd?: string; officeHoursTimezone?: string;
}, now = new Date()) {
  if (!settings.officeHoursEnabled) return true;
  const start = settings.officeHoursStart || '09:00';
  const end = settings.officeHoursEnd || '18:00';
  if (![start, end].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error('Office hours must use HH:MM.');
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: settings.officeHoursTimezone || 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const time = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}`;
  return start === end || (start < end ? time >= start && time < end : time >= start || time < end);
}
