export type MakeWorkshopScheduleIdInput = {
  workshopSlug: string;
  mode: string;
  batch?: string;
  startDate?: string | Date | null;
  currency?: string;
  startTime?: string;
};

const normalize = (v: unknown) => String(v || '').trim().toLowerCase();

export function makeWorkshopScheduleId(input: MakeWorkshopScheduleIdInput): string {
  const workshopSlug = normalize(input.workshopSlug).replace(/\s+/g, '-');
  const mode = normalize(input.mode);
  const batch = normalize(input.batch || 'morning');
  const currency = String(input.currency || 'INR').trim().toUpperCase();

  let datePart = 'open';
  if (input.startDate) {
    const d = typeof input.startDate === 'string' ? new Date(input.startDate) : new Date(input.startDate);
    const ms = d.getTime();
    if (!Number.isNaN(ms)) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      datePart = `${y}-${m}-${day}`;
    }
  }

  // Optional: add time discriminator to avoid collisions.
  const timePart = normalize(input.startTime || '');
  const timeSuffix = timePart ? `_${timePart.replace(/[^0-9a-z]+/g, '')}` : '';

  return `${workshopSlug}_${mode}_${batch}_${datePart}_${currency}${timeSuffix}`;
}
