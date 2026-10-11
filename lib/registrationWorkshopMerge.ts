type Workshop = Record<string, unknown> & { metadata?: Record<string, unknown> };

export function registrationValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((value, index) => registrationValuesEqual(value, right[index]));
  }
  const a = Object.entries(left);
  const b = Object.entries(right);
  return a.length === b.length && a.every(([key, value]) =>
    Object.prototype.hasOwnProperty.call(right, key) && registrationValuesEqual(value, Reflect.get(right, key)));
}

function mergeFields(current: Record<string, unknown>, previous: Record<string, unknown>,
  edited: Record<string, unknown>, prefix = '') {
  const merged = { ...current };
  for (const key of new Set([...Object.keys(previous), ...Object.keys(edited)])) {
    if (registrationValuesEqual(edited[key], previous[key])) continue;
    if (!registrationValuesEqual(current[key], previous[key]) && !registrationValuesEqual(current[key], edited[key])) {
      throw new Error(`This batch setting (${prefix}${key}) changed in another update. Reload before saving; newer settings have been preserved.`);
    }
    if (Object.prototype.hasOwnProperty.call(edited, key)) merged[key] = edited[key];
    else delete merged[key];
  }
  return merged;
}

export function mergeRegistrationWorkshop(current: Workshop, previous: Workshop, edited: Workshop): Workshop {
  const { metadata: currentMetadata, ...currentFields } = current;
  const { metadata: previousMetadata, ...previousFields } = previous;
  const { metadata: editedMetadata, ...editedFields } = edited;
  return {
    ...mergeFields(currentFields, previousFields, editedFields),
    metadata: mergeFields(currentMetadata || {}, previousMetadata || {}, editedMetadata || {}, 'metadata.'),
  };
}
