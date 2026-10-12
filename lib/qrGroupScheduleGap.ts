/**
 * Shared helpers for the QR Group Scheduler ('custom' frequency schedules).
 * Keeps any two recurring group schedules at least MIN_SCHEDULE_GAP_MINUTES
 * apart when they share a send date, by auto-shifting the requested start
 * time forward in 15-minute steps.
 */

export const MIN_SCHEDULE_GAP_MINUTES = 15;

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function toIstDateStr(d: Date | string): string {
  return new Date(new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toDateString();
}

export function resolveStartTimeFromSchedules(
  existing: Array<{ startTime?: string; customScheduleDates?: Array<Date | string> }>,
  requestedStart: string,
  requestedDates: Date[]
): string {
  const requestedDateSet = new Set(requestedDates.map(toIstDateStr));
  const conflictMinutes: number[] = [];
  for (const s of existing) {
    if (!Array.isArray(s.customScheduleDates) || !s.startTime) continue;
    const overlaps = s.customScheduleDates.some((d: any) => requestedDateSet.has(toIstDateStr(d)));
    if (overlaps) conflictMinutes.push(timeToMinutes(s.startTime));
  }

  let candidate = timeToMinutes(requestedStart);
  for (let i = 0; i < 96; i++) {
    const hasConflict = conflictMinutes.some((c) => {
      const diff = Math.abs(candidate - c);
      return Math.min(diff, 1440 - diff) < MIN_SCHEDULE_GAP_MINUTES;
    });
    if (!hasConflict) break;
    candidate = (candidate + MIN_SCHEDULE_GAP_MINUTES) % 1440;
  }
  return minutesToTime(candidate);
}
