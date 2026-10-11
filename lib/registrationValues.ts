export function parseRegistrationValue<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null || value === '') return fallback;
  for (let depth = 0; typeof value === 'string' && depth < 4; depth++) value = JSON.parse(value);
  if (typeof value === 'string') throw new Error('Registration settings are nested too deeply');
  return value as T;
}

export function restoreRegistrationWorkshop<T extends { id?: string }>(listValue: unknown, selectedValue: unknown): T | undefined {
  const list = parseRegistrationValue<T[]>(listValue, []);
  const selected = parseRegistrationValue<T | undefined>(selectedValue, undefined);
  if (!Array.isArray(list)) throw new Error('Invalid saved workshop list');
  return selected?.id ? list.find(workshop => workshop?.id === selected.id) : undefined;
}
