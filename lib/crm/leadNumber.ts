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
 * Ensures a lead exists for the given phone/email and returns its leadNumber.
 * DEDUPLICATION: Checks BOTH phone AND email - if either matches, reuses that lead.
 * One person = One ID across all touchpoints.
 */
export async function getOrCreateLeadIdForPhone(
  phone: string, 
  name?: string, 
  email?: string,
  source: string = 'website',
  labels: string[] = []
): Promise<string> {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) throw new Error('Invalid phone number for lead allocation');

  const Lead = getLead();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  
  // UNIFIED ID: Find existing lead by EITHER phone OR email (one person = one ID)
  const searchQuery: any[] = [{ phoneNumber: cleanPhone }];
  if (cleanEmail) searchQuery.push({ email: cleanEmail });
  
  let lead = await Lead.findOne({ $or: searchQuery });
  
  if (lead) {
    // Ensure leadNumber exists (for legacy leads)
    if (!lead.leadNumber) {
      const { leadNumber } = await allocateNextLeadNumber();
      lead.leadNumber = leadNumber;
    }
    
    // Opportunistically fill missing fields (non-destructive merge)
    if (cleanName && !lead.name) lead.name = cleanName;
    if (cleanEmail && !lead.email) lead.email = cleanEmail;
    if (cleanPhone && !lead.phoneNumber) lead.phoneNumber = cleanPhone;
    
    // Add labels if provided
    if (labels.length > 0) {
      lead.labels = Array.from(new Set([...(lead.labels || []), ...labels]));
    }
    
    await lead.save();
    return lead.leadNumber;
  }

  // No existing lead found - create new one
  const { leadNumber } = await allocateNextLeadNumber();
  lead = new Lead({
    name: cleanName || 'CRM Lead',
    email: cleanEmail || '',
    phoneNumber: cleanPhone,
    leadNumber: leadNumber,
    source: source,
    labels: labels,
    status: 'lead'
  });
  
  await lead.save();
  return leadNumber;
}
