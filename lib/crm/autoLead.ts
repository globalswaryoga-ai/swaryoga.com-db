/**
 * Auto-create or link a CRM lead when a user signs up/logs in.
 * Called by signup, Google, Facebook, and Apple auth routes.
 */
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';

const DEFAULT_ASSIGNED_TO = 'admincrm'; // Mohan Kalburgi (super-admin)

interface AutoLeadInput {
  userId: string;
  profileId?: string;
  name: string;
  email?: string;
  phone?: string;
  source: 'website' | 'google' | 'facebook' | 'apple';
  country?: string;
  state?: string;
  gender?: string;
  age?: number;
  profession?: string;
}

/**
 * Ensures a CRM lead exists for this user. Returns the leadNumber if available.
 * Non-fatal: callers should catch errors to avoid breaking auth flows.
 */
export async function autoCreateOrLinkLead(input: AutoLeadInput): Promise<string | null> {
  try {
    const Lead = getLead();
    const cleanedPhone = input.phone ? normalizePhone(input.phone) : '';
    const cleanedEmail = input.email ? input.email.trim().toLowerCase() : '';
    const cleanedName = (input.name || '').trim();

    if (!cleanedPhone && !cleanedEmail) return null;

    const sourceLabel = input.source === 'website' ? 'Website Signup'
      : input.source === 'google' ? 'Google Login'
      : input.source === 'facebook' ? 'Facebook Login'
      : input.source === 'apple' ? 'Apple Login'
      : 'Website';

    const searchQuery: any[] = [];
    if (cleanedPhone) searchQuery.push({ phoneNumber: cleanedPhone });
    if (cleanedEmail) searchQuery.push({ email: cleanedEmail });

    const existingLead = await Lead.findOne({ $or: searchQuery }).lean();

    if (existingLead) {
      // Update existing lead — link to user account
      await Lead.updateOne(
        { _id: (existingLead as any)._id },
        {
          $addToSet: { labels: { $each: [input.source, 'signup'] } },
          $set: {
            ...(cleanedName ? { name: cleanedName } : {}),
            ...(cleanedEmail ? { email: cleanedEmail } : {}),
            linkedUserId: input.userId,
            linkedProfileId: input.profileId,
            isLinkedToAccount: true,
          },
        },
      );
      await addLeadToMainBroadcastList(existingLead).catch(() => {});
      return String((existingLead as any).leadNumber || '') || null;
    }

    // Create new lead
    const { leadNumber } = await allocateNextLeadNumber();
    const newLead = await Lead.create({
      leadNumber,
      name: cleanedName,
      email: cleanedEmail,
      phoneNumber: cleanedPhone,
      status: 'lead',
      source: input.source,
      workshopName: sourceLabel,
      labels: [input.source, 'signup'],
      createdByUserId: 'system',
      assignedToUserId: DEFAULT_ASSIGNED_TO,
      metadata: {
        formType: `${input.source}-signup`,
        userId: input.userId,
        profileId: input.profileId,
        country: input.country,
        state: input.state,
        gender: input.gender,
        age: input.age,
        profession: input.profession,
        submittedAt: new Date(),
      },
      linkedUserId: input.userId,
      linkedProfileId: input.profileId,
      isLinkedToAccount: true,
    });
    await addLeadToMainBroadcastList(newLead).catch(() => {});
    return String(leadNumber);
  } catch (error) {
    console.error(`[autoCreateOrLinkLead] Error for ${input.source}:`, error);
    return null;
  }
}
