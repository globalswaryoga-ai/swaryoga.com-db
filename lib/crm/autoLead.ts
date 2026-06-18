/**
 * Auto-create or link a CRM lead when a user signs up/logs in.
 * Called by signup, Google, Facebook, and Apple auth routes.
 */
import { Types } from 'mongoose';
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

interface AutoLeadForSaleInput {
  tenantUserId: string;
  name?: string;
  phone?: string;
  workshopName?: string;
}

export interface AutoLeadForSaleResult {
  id: Types.ObjectId;
  leadNumber: string;
}

/**
 * Ensures a CRM lead exists for a sale recorded without one (manual entry,
 * bulk import, or bank-statement reconciliation). Scoped to the reporting
 * admin's tenant so it never matches/creates across tenants.
 *
 * No real phone on file? Mints an obviously-synthetic placeholder
 * (9 + 9 random digits) so the required `phoneNumber` field is satisfied
 * without it being mistaken for, or used to message, a real contact.
 *
 * Returns the lead's _id and leadNumber, or null if it couldn't be resolved
 * (caller should treat this as non-fatal and create the sale without a
 * leadId). Callers must use the returned leadNumber as the sale's
 * customerId when none was otherwise supplied — otherwise the sale ends up
 * linked to a lead but with no customer-facing ID, which is what made every
 * receipt issued through this path show a meaningless ID fragment instead
 * of the lead's real number.
 */
export async function autoLeadForSale(input: AutoLeadForSaleInput): Promise<AutoLeadForSaleResult | null> {
  try {
    const Lead = getLead();
    const tenantUserId = String(input.tenantUserId || '').trim();
    if (!tenantUserId) return null;

    const cleanedName = (input.name || '').trim();
    const cleanedPhone = input.phone ? normalizePhone(input.phone) : '';
    if (!cleanedName && !cleanedPhone) return null;

    if (cleanedPhone) {
      const existing = await Lead.findOne({
        phoneNumber: cleanedPhone,
        $or: [{ assignedToUserId: tenantUserId }, { createdByUserId: tenantUserId }],
      }).select('_id leadNumber').lean();
      if (existing) return { id: (existing as any)._id, leadNumber: (existing as any).leadNumber || '' };
    }

    const placeholderPhone = cleanedPhone || `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const { leadNumber } = await allocateNextLeadNumber(tenantUserId);
    const lead = await Lead.create({
      leadNumber,
      name: cleanedName || undefined,
      phoneNumber: placeholderPhone,
      status: 'lead',
      source: 'manual',
      labels: ['sales-auto'],
      ...(input.workshopName ? { workshopName: input.workshopName } : {}),
      assignedToUserId: tenantUserId,
      createdByUserId: tenantUserId,
    });
    return { id: lead._id, leadNumber };
  } catch (error) {
    console.error('[autoLeadForSale] Error:', error);
    return null;
  }
}
