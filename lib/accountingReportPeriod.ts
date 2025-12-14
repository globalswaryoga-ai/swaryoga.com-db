export type ReportPeriodKey = 'monthly' | '3month' | '6month' | 'yearly';

export type ISODate = `${number}-${string}-${string}`; // best-effort

export interface ReportPeriodRange {
  key: ReportPeriodKey;
  label: string;
  startDate: ISODate;
  endDate: ISODate;
  /**
   * Safe for filenames (no spaces). Example: "month-2025-01", "last-3-months-2025-01_to_2025-03", "year-2025".
   */
  fileTag: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

const toISODate = (year: number, month1to12: number, day1to31: number): ISODate => {
  return `${year}-${pad2(month1to12)}-${pad2(day1to31)}` as ISODate;
};

const lastDayOfMonth = (year: number, month1to12: number): number => {
  // month in Date is 0-based; passing next month with day 0 gives last day of previous month
  return new Date(year, month1to12, 0).getDate();
};

const shiftMonth = (year: number, month1to12: number, deltaMonths: number): { year: number; month: number } => {
  // Convert to a 0-based linear month index
  const idx = year * 12 + (month1to12 - 1) + deltaMonths;
  const nextYear = Math.floor(idx / 12);
  const nextMonth0 = idx % 12;
  return { year: nextYear, month: nextMonth0 + 1 };
};

const monthLabel = (year: number, month1to12: number) => `${MONTH_NAMES[month1to12 - 1]} ${year}`;

export const filterTransactionsByDateRange = <T extends { date?: string }>(
  items: T[],
  startDateISO: string,
  endDateISO: string
): T[] => {
  // dates are stored as YYYY-MM-DD, so string compare works safely.
  return items.filter((t) => {
    const d = t.date;
    if (!d) return false;
    return d >= startDateISO && d <= endDateISO;
  });
};

export const getReportPeriodRange = (params: {
  period: ReportPeriodKey;
  /** used for yearly period */
  year: number;
  /** used for monthly period as YYYY-MM */
  monthISO?: string;
  /** useful for tests */
  now?: Date;
}): ReportPeriodRange => {
  const now = params.now ?? new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;

  if (params.period === 'yearly') {
    const y = params.year;
    return {
      key: 'yearly',
      label: `Year ${y}`,
      startDate: toISODate(y, 1, 1),
      endDate: toISODate(y, 12, 31),
      fileTag: `year-${y}`
    };
  }

  if (params.period === 'monthly') {
    const monthISO = params.monthISO && /^\d{4}-\d{2}$/.test(params.monthISO) ? params.monthISO : `${endYear}-${pad2(endMonth)}`;
    const [yStr, mStr] = monthISO.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const lastDay = lastDayOfMonth(y, m);

    return {
      key: 'monthly',
      label: `Month ${monthLabel(y, m)}`,
      startDate: toISODate(y, m, 1),
      endDate: toISODate(y, m, lastDay),
      fileTag: `month-${y}-${pad2(m)}`
    };
  }

  const monthsBack = params.period === '3month' ? 3 : 6;
  const { year: startYear, month: startMonth } = shiftMonth(endYear, endMonth, -(monthsBack - 1));

  const startDate = toISODate(startYear, startMonth, 1);
  const endDate = toISODate(endYear, endMonth, lastDayOfMonth(endYear, endMonth));

  const label = `${monthsBack} Months (${monthLabel(startYear, startMonth)} - ${monthLabel(endYear, endMonth)})`;
  const fileTag = `last-${monthsBack}-months-${startYear}-${pad2(startMonth)}_to_${endYear}-${pad2(endMonth)}`;

  return {
    key: params.period,
    label,
    startDate,
    endDate,
    fileTag
  };
};
