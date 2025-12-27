import { CrmCounter } from '@/lib/schemas/enterpriseSchemas';

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
