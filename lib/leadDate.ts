// Archived Mongo documents store dates as extended JSON, e.g. {"$date":{"$numberLong":"1767559901959"}}.
export function leadDateMs(value: unknown): number | null {
  let raw: any = value;
  for (let depth = 0; depth < 3 && raw && typeof raw === 'object' && !(raw instanceof Date); depth += 1) {
    raw = raw.$date ?? raw.$numberLong ?? raw.$numberDouble ?? null;
  }
  if (raw === null || raw === undefined || raw === '') return null;
  const numeric = typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw) : raw;
  const time = new Date(numeric).getTime();
  return Number.isFinite(time) ? time : null;
}

export function leadDateIso(value: unknown): string | null {
  const time = leadDateMs(value);
  return time === null ? null : new Date(time).toISOString();
}

export function formatLeadDate(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const time = leadDateMs(candidate);
    if (time !== null) return new Date(time).toLocaleString();
  }
  return 'Not recorded';
}
