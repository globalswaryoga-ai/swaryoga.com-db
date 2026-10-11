export function parseRegistrationValue<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null || value === '') return fallback;
  return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}
