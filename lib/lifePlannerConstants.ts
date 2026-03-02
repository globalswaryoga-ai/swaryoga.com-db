/**
 * Shared constants for Life Planner pages.
 * Centralised here to avoid duplication across vision, tasks, action-plan, etc.
 */

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export type MonthLabel = (typeof MONTHS)[number];

/** 10 Vision Head colour map used across Vision, Tasks, Action Plan cards. */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Life':        { bg: 'bg-purple-600',  text: 'text-white' },
  'Health':      { bg: 'bg-swar-primary', text: 'text-white' },
  'Wealth':      { bg: 'bg-red-600',     text: 'text-white' },
  'Success':     { bg: 'bg-blue-600',    text: 'text-white' },
  'Respect':     { bg: 'bg-orange-600',  text: 'text-white' },
  'Pleasure':    { bg: 'bg-pink-600',    text: 'text-white' },
  'Prosperity':  { bg: 'bg-indigo-600',  text: 'text-white' },
  'Luxurious':   { bg: 'bg-yellow-600',  text: 'text-white' },
  'Good Habits': { bg: 'bg-teal-600',    text: 'text-white' },
  'Sadhana':     { bg: 'bg-cyan-600',    text: 'text-white' },
};

/** Escape a value for CSV output — wraps in quotes and doubles internal quotes. */
export function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  // If it contains comma, quote, newline, or starts with = + - @ (formula injection), wrap it.
  if (/[,"\r\n]/.test(s) || /^[=+\-@\t\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
