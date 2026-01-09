import { CrmCounter, getLead } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

export const LEAD_NUMBER_COUNTER_ID = 'leadNumber';
export const LEAD_NUMBER_START = 6999; // "006999"

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
  
  // 1. Try to find existing lead
  let lead = await Lead.findOne({ phoneNumber: cleanPhone });
  
  if (lead && lead.leadNumber) {
    return lead.leadNumber;
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
    name: name || 'Community Joiner',
    email: email || '',
    phoneNumber: cleanPhone,
    leadNumber: leadNumber,
    source: 'website',
    status: 'lead'
  });
  
  await lead.save();
  return leadNumber;
}
