/**
 * Shared WhatsApp account restriction/ban tracking (QR/Baileys accounts).
 *
 * Root-cause context: a QR-connected number got a 24h WhatsApp restriction
 * from bulk group-merge activity, and — because `whatsapp_accounts` had no
 * field to represent "restricted until X" — the only way anyone had to
 * "reset" it was to delete the account document entirely, which made it
 * vanish from the admin UI instead of just pausing. This module gives every
 * code path (group-ops, broadcasts, manual sends) one shared place to read
 * and write that state, keyed by the connected phone number, via an upsert
 * so it works whether or not an account doc already exists yet.
 */
import { connectDB } from '@/lib/db';
import { getWhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';

/**
 * Same keyword-based classification `broadcastRuns.ts` uses to detect a
 * WhatsApp-side block/restriction signal in a failed send's error message.
 * Kept in sync manually — there is no WhatsApp-provided structured error
 * code for this, only free-text messages from the bridge/WhatsApp.
 */
export function isWhatsAppBlockedSignal(errorMsg: string): boolean {
  const lower = (errorMsg || '').toLowerCase();
  return (
    lower.includes('blocked') ||
    lower.includes('opt-out') ||
    lower.includes('restricted') ||
    lower.includes('banned') ||
    (lower.includes('account') && lower.includes('action'))
  );
}

function normalizePhone(phoneNumber: string): string {
  return String(phoneNumber || '').replace(/[^\d]/g, '');
}

/**
 * Mark a QR account as restricted for `hours` (default 24h, matching the
 * existing broadcast hard-stop). Upserts by phone number so it works even
 * if no `whatsapp_accounts` document exists yet for this number.
 */
export async function markQRAccountRestricted(
  phoneNumber: string,
  reason: string,
  hours = 24
): Promise<void> {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized) return;

  await connectDB();
  const WhatsAppAccount = getWhatsAppAccount();
  const restrictedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

  await WhatsAppAccount.updateOne(
    { commonPhoneNumber: { $regex: `${normalized}$` } },
    {
      $set: {
        status: 'restricted',
        healthStatus: 'down',
        restrictedUntil,
        restrictionReason: reason,
      },
      $setOnInsert: {
        accountName: normalized,
        accountType: 'common',
        commonProvider: 'manual',
        commonPhoneNumber: `+${normalized}`,
        createdByUserId: 'system-restriction-tracker',
        isActive: true,
      },
    },
    { upsert: true }
  );

  console.error(`[WhatsApp Restriction] 🚫 ${normalized} marked restricted until ${restrictedUntil.toISOString()}: ${reason}`);
}

export type QRAccountRestriction =
  | { restricted: false }
  | { restricted: true; restrictedUntil: Date; reason?: string };

/** Check whether a QR account is currently within an active restriction window. */
export async function getQRAccountRestriction(phoneNumber: string): Promise<QRAccountRestriction> {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized) return { restricted: false };

  await connectDB();
  const WhatsAppAccount = getWhatsAppAccount();
  const doc: any = await WhatsAppAccount.findOne(
    { commonPhoneNumber: { $regex: `${normalized}$` } },
    { restrictedUntil: 1, restrictionReason: 1 }
  ).lean();

  if (doc?.restrictedUntil && new Date(doc.restrictedUntil).getTime() > Date.now()) {
    return { restricted: true, restrictedUntil: new Date(doc.restrictedUntil), reason: doc.restrictionReason };
  }
  return { restricted: false };
}
