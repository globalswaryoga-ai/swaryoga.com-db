import { getCrmCounter, getLead } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

export const LEAD_NUMBER_COUNTER_ID = 'leadNumber';
// Start at 000699 unless an existing counter already exists in the DB.
// Note: If crm_counters already has a higher seq, allocation will continue from there.
export const LEAD_NUMBER_START = 699; // "000699"

export function formatLeadNumber(seq: number): string {
  // Always 6 digits
  return String(seq).padStart(6, '0');
}

/**
 * Atomically allocate the next permanent CRM Lead Number.
 *
 * IMPORTANT: caller must have ensured DB connection via connectDB().
 */
export async function allocateNextLeadNumber(): Promise<{ seq: number; leadNumber: string }> {
  const CrmCounter = getCrmCounter();
  // Use an update pipeline so we don't update the same path (`seq`) via multiple operators,
  // which causes: "Updating the path 'seq' would create a conflict at 'seq'".
  //
  // seq := ifNull(seq, START-1) + 1
  const counter = await CrmCounter.findOneAndUpdate(
    { _id: LEAD_NUMBER_COUNTER_ID },
    [
      {
        $set: {
          seq: {
            $add: [
              { $ifNull: ['$seq', LEAD_NUMBER_START - 1] },
              1,
            ],
          },
        },
      },
    ],
    { new: true, upsert: true }
  ).lean();

  const seq = Number((counter as any)?.seq || 0);
  return { seq, leadNumber: formatLeadNumber(seq) };
}

/**
 * Normalize user input ("6999" -> "006999") for searching by leadNumber.
 */
export function normalizeLeadNumberInput(raw: string): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (!/^\d{1,6}$/.test(s)) return null;
  return s.padStart(6, '0');
}

/**
 * Ensures a lead exists for the given phone number and returns its leadNumber.
 * If multiple leads exist (shouldn't happen with unique index), it returns the first one with a leadNumber.
 * If no lead exists, it creates one and allocates a new leadNumber.
 */
export async function getOrCreateLeadIdForPhone(phone: string, name?: string, email?: string): Promise<string> {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) throw new Error('Invalid phone number for lead allocation');

  const Lead = getLead();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  
  // 1. Try to find existing lead by phone (primary identity)
  let lead = await Lead.findOne({ phoneNumber: cleanPhone });
  
  if (lead && lead.leadNumber) {
    return lead.leadNumber;
  }

  // 1b. If not found by phone, try by email (only when email is present)
  // We do NOT auto-merge two different phone numbers just because email matches.
  // If we find an email match, we reuse the leadNumber but keep the original phone.
  // This avoids accidental merges while still preventing duplicate IDs.
  if (!lead && cleanEmail) {
    const byEmail = await Lead.findOne({ email: cleanEmail });
    if (byEmail) {
      // Ensure leadNumber exists.
      if (!byEmail.leadNumber) {
        const { leadNumber } = await allocateNextLeadNumber();
        byEmail.leadNumber = leadNumber;
      }

      // Opportunistically fill missing fields (non-destructive).
      if (cleanName && !byEmail.name) byEmail.name = cleanName;
      if (cleanEmail && !byEmail.email) byEmail.email = cleanEmail;
      await byEmail.save();

      return String(byEmail.leadNumber);
    }
  }

  // 2. If lead exists but no leadNumber (legacy), allocate one
  if (lead && !lead.leadNumber) {
    const { leadNumber } = await allocateNextLeadNumber();
    lead.leadNumber = leadNumber;
    await lead.save();
    return leadNumber;
  }

  // 3. Create new lead if none exists
  const { leadNumber } = await allocateNextLeadNumber();
  lead = new Lead({
    name: cleanName || 'Community Joiner',
    email: cleanEmail || '',
    phoneNumber: cleanPhone,
    leadNumber: leadNumber,
    source: 'website',
    status: 'lead'
  });
  
  await lead.save();
  return leadNumber;
}
