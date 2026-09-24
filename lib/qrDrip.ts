/**
 * QR drip sequence scheduling helpers.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * When should a given step fire for an enrollee?
 * Day 0 = the IST calendar day of enrollment, at the step's timeOfDay (IST).
 * If that moment is already past (e.g. enrolled at 3 PM for an 09:00 step),
 * the step fires as soon as possible instead of being skipped.
 */
export function computeStepSendAt(
  enrolledAt: Date,
  step: { dayOffset: number; timeOfDay?: string }
): Date {
  const istEnroll = new Date(enrolledAt.getTime() + IST_OFFSET_MS);
  const [hh, mm] = String(step.timeOfDay || '09:00').split(':').map((n) => parseInt(n, 10));
  const targetUtcMs =
    Date.UTC(
      istEnroll.getUTCFullYear(),
      istEnroll.getUTCMonth(),
      istEnroll.getUTCDate() + (step.dayOffset || 0),
      isFinite(hh) ? hh : 9,
      isFinite(mm) ? mm : 0
    ) - IST_OFFSET_MS;
  const target = new Date(targetUtcMs);
  return target.getTime() < Date.now() ? new Date(Date.now() + 60 * 1000) : target;
}

export function normalizePhoneDigits(value: string): string {
  return String(value || '').split('@')[0].replace(/\D/g, '');
}
