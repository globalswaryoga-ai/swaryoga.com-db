export type RecordingAccessPolicy = {
  enabled: boolean;
  maxDays: number;
  minimumMinutes: number;
  keywords: string[];
  templateId: string;
};
export const DEFAULT_RECORDING_ACCESS: RecordingAccessPolicy = {
  enabled: false, maxDays: 3, minimumMinutes: 60,
  keywords: ['recording', 'missed class'], templateId: '',
};

export function recordingAccessPolicy(value: Partial<RecordingAccessPolicy> | undefined): RecordingAccessPolicy {
  const policy = { ...DEFAULT_RECORDING_ACCESS, ...value };
  if (typeof policy.enabled !== 'boolean' || !Number.isInteger(policy.maxDays) || policy.maxDays < 3 || policy.maxDays > 5)
    throw new Error('Recording allowance must be 3, 4 or 5 distinct class days.');
  if (!Number.isFinite(policy.minimumMinutes) || policy.minimumMinutes < 1 || policy.minimumMinutes > 240)
    throw new Error('Attendance completion must be between 1 and 240 minutes.');
  if (!Array.isArray(policy.keywords) || policy.keywords.some(k => typeof k !== 'string' || !k.trim()))
    throw new Error('Recording keywords must be nonempty text.');
  if (typeof policy.templateId !== 'string' || (policy.enabled && !policy.templateId.trim()))
    throw new Error('Select an approved Meta recording template before enabling recording access.');
  return policy;
}
