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
import { connectDB, USE_BUNNY_DATABASE_ONLY } from '@/lib/db';
import { getWhatsAppAccount } from '@/lib/schemas/enterpriseSchemas';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

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

let bunnyRestrictionSchemaPromise: Promise<void> | null = null;

async function ensureBunnyRestrictionSchema(): Promise<void> {
  if (!bunnyRestrictionSchemaPromise) {
    bunnyRestrictionSchemaPromise = bunnyBatch([{
      sql: `CREATE TABLE IF NOT EXISTS qr_account_restrictions_sql (
        phone_number TEXT PRIMARY KEY,
        restricted_until TEXT NOT NULL,
        restriction_reason TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    }]).then(() => undefined).catch(error => {
      bunnyRestrictionSchemaPromise = null;
      throw error;
    });
  }
  await bunnyRestrictionSchemaPromise;
}

/**
 * Mark a QR account as restricted for `hours` (default 24h, matching the
 * existing broadcast hard-stop). Upserts by phone number so it works even
 * if no `whatsapp_accounts` document exists yet for this number.
 */
export async function markQRAccountRestricted(
  phoneNumber: string,
  reason: string,
  hours = 24,
  useBunny = USE_BUNNY_DATABASE_ONLY
): Promise<void> {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized) return;

  const restrictedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
  if (useBunny) {
    await ensureBunnyRestrictionSchema();
    await bunnyExecute({
      sql: `INSERT INTO qr_account_restrictions_sql (phone_number,restricted_until,restriction_reason,updated_at)
        VALUES (?,?,?,?) ON CONFLICT(phone_number) DO UPDATE SET
        restricted_until=excluded.restricted_until,restriction_reason=excluded.restriction_reason,updated_at=excluded.updated_at`,
      args: [normalized, restrictedUntil.toISOString(), reason, new Date().toISOString()],
    });
    console.error(`[WhatsApp Restriction] ${normalized} marked restricted until ${restrictedUntil.toISOString()}: ${reason}`);
    return;
  }

  await connectDB();
  const WhatsAppAccount = getWhatsAppAccount();

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
export async function getQRAccountRestriction(
  phoneNumber: string,
  useBunny = USE_BUNNY_DATABASE_ONLY
): Promise<QRAccountRestriction> {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized) return { restricted: false };

  if (useBunny) {
    await ensureBunnyRestrictionSchema();
    const result = await bunnyExecute({
      sql: 'SELECT restricted_until, restriction_reason FROM qr_account_restrictions_sql WHERE phone_number=? LIMIT 1',
      args: [normalized],
    });
    const row = result.rows[0];
    if (row?.restricted_until && new Date(String(row.restricted_until)).getTime() > Date.now()) {
      return {
        restricted: true,
        restrictedUntil: new Date(String(row.restricted_until)),
        reason: String(row.restriction_reason || ''),
      };
    }
    return { restricted: false };
  }

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
