import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';

// Shared between app/api/extension/lead and app/api/extension/funnel-stages.
export const BUILT_IN_FUNNEL_STATUSES = [
  'new_lead', 'contacted', 'interested', 'demo_trial', 'negotiation',
  'enrolled', 'completed', 'inactive', 'repeater', 'old_sadhak',
  'only_for_post', 'lead', 'hot', 'prospect', 'customer',
];

/** Is `status` either a built-in stage or one of this user's own custom ones? */
export async function isValidFunnelStatus(userId: string, status: string): Promise<boolean> {
  if (BUILT_IN_FUNNEL_STATUSES.includes(status)) return true;
  await connectDB();
  const CRMUserSettings = getCRMUserSettings();
  const settings: any = await CRMUserSettings.findOne({ userId }, { extensionFunnelStages: 1 }).lean();
  return !!(settings?.extensionFunnelStages || []).includes(status);
}
