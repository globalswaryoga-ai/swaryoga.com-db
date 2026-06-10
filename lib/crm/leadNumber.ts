import { getCrmCounter, getLead } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

export const LEAD_NUMBER_COUNTER_ID = 'leadNumber';
// Legacy GLOBAL start (used only for system / non-tenant leads with no owner key).
export const LEAD_NUMBER_START = 699; // "000699"
// Per-tenant SaaS start: every NEW tenant's lead IDs begin at 10000. Existing
// tenants continue from their current max (seeded below) so nothing is renumbered.
export const TENANT_LEAD_NUMBER_START = 10000;

export function formatLeadNumber(seq: number): string {
  // Always at least 6 digits (e.g. 10000 -> "010000").
  return String(seq).padStart(6, '0');
}

async function incrementCounter(counterId: string, fallbackStart: number): Promise<number> {
  const CrmCounter = getCrmCounter();
  // Update pipeline so we don't touch `seq` via multiple operators (avoids
  // "Updating the path 'seq' would create a conflict at 'seq'").
  const counter = await CrmCounter.findOneAndUpdate(
    { _id: counterId },
    [{ $set: { seq: { $add: [{ $ifNull: ['$seq', fallbackStart - 1] }, 1] } } }],
    { new: true, upsert: true }
  ).lean();
  return Number((counter as any)?.seq || 0);
}

/**
 * Atomically allocate the next permanent CRM Lead Number.
 *
 * - tenantKey given  → PER-TENANT counter (`leadNumber:<tenantKey>`). Brand-new
 *   tenants start at TENANT_LEAD_NUMBER_START (10000); existing tenants are seeded
 *   from their current max lead number so their IDs continue without collisions.
 * - tenantKey absent → legacy GLOBAL counter (system / public-site leads).
 *
 * IMPORTANT: caller must have ensured DB connection via connectDB().
 */
export async function allocateNextLeadNumber(tenantKey?: string): Promise<{ seq: number; leadNumber: string }> {
  const key = String(tenantKey || '').trim();

  if (!key) {
    const seq = await incrementCounter(LEAD_NUMBER_COUNTER_ID, LEAD_NUMBER_START);
    return { seq, leadNumber: formatLeadNumber(seq) };
  }

  const counterId = `${LEAD_NUMBER_COUNTER_ID}:${key}`;
  const CrmCounter = getCrmCounter();

  // First allocation for this tenant: seed the counter so we never collide with
  // any lead numbers the tenant already has. New tenant → 10000; existing tenant
  // → continue from its current max.
  const existing = await CrmCounter.findOne({ _id: counterId }).select('_id').lean();
  if (!existing) {
    const Lead = getLead();
    const top = await Lead.find({ createdByUserId: key, leadNumber: { $type: 'string' } })
      .sort({ leadNumber: -1 })
      .limit(1)
      .select('leadNumber')
      .lean();
    const maxExisting = (top as any[])?.[0]?.leadNumber
      ? (parseInt(String((top as any[])[0].leadNumber), 10) || 0)
      : 0;
    const seed = Math.max(TENANT_LEAD_NUMBER_START - 1, maxExisting);
    await CrmCounter.updateOne({ _id: counterId }, { $setOnInsert: { seq: seed } }, { upsert: true });
  }

  const seq = await incrementCounter(counterId, TENANT_LEAD_NUMBER_START);
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
