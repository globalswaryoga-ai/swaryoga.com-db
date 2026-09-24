/**
 * QR WhatsApp Opt-Out (STOP/UNSUBSCRIBE) Handling
 *
 * Compliance layer: when a contact replies STOP (or similar), they are added
 * to a per-tenant opt-out list and excluded from all broadcasts, automations,
 * and chatbot flows. Replying START opts them back in. Manual 1:1 replies from
 * the inbox are NOT blocked — opt-out only silences automated/bulk sends.
 *
 * Collection: qr_opt_outs (per-tenant via userId, phone normalized to digits).
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { resolveQrTenantBridge, isQrTenantConnected, sendQrTenantMessage } from '@/lib/qrTenantBridge';

const COLLECTION = 'qr_opt_outs';

// Exact-match keywords (after trimming punctuation/whitespace, lowercased).
// Deliberately conservative — substring matching would unsubscribe people who
// write sentences like "please stop by the studio".
const OPT_OUT_KEYWORDS = new Set(['stop', 'unsubscribe', 'unsub', 'optout', 'opt out', 'stop all', 'stopall']);
const OPT_IN_KEYWORDS = new Set(['start', 'unstop', 'subscribe', 'optin', 'opt in']);

const OPT_OUT_CONFIRMATION =
  'You have been unsubscribed and will not receive further promotional messages. Reply START anytime to subscribe again. 🙏';
const OPT_IN_CONFIRMATION = 'Welcome back! You are subscribed again. 🙏';

function normalizeDigits(value: string): string {
  return String(value || '').split('@')[0].replace(/\D/g, '');
}

function normalizeKeywordText(text: string): string {
  // Strip surrounding punctuation/emoji so "STOP." and "Stop!" still match.
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectOptOutIntent(messageText: string): 'opt_out' | 'opt_in' | null {
  const normalized = normalizeKeywordText(messageText);
  if (!normalized || normalized.length > 20) return null; // long sentences are never opt-out commands
  if (OPT_OUT_KEYWORDS.has(normalized)) return 'opt_out';
  if (OPT_IN_KEYWORDS.has(normalized)) return 'opt_in';
  return null;
}

async function getCollection() {
  await connectDB();
  return mongoose.connection.db!.collection(COLLECTION);
}

export async function isOptedOut(userId: string, phoneOrJid: string): Promise<boolean> {
  const phone = normalizeDigits(phoneOrJid);
  if (!phone) return false;
  const col = await getCollection();
  const doc = await col.findOne({ userId, phone }, { projection: { _id: 1 } });
  return !!doc;
}

/**
 * All opted-out phone numbers (digits only) for a tenant, as a Set — for bulk
 * filtering broadcast recipient lists without one query per recipient.
 */
export async function getOptedOutPhoneSet(userId: string): Promise<Set<string>> {
  const col = await getCollection();
  const docs = await col.find({ userId }, { projection: { phone: 1 } }).toArray();
  return new Set(docs.map((d: any) => String(d.phone)));
}

export async function recordOptOut(params: {
  userId: string;
  phoneOrJid: string;
  chatJid?: string;
  source?: 'keyword' | 'manual';
  keyword?: string;
}): Promise<void> {
  const phone = normalizeDigits(params.phoneOrJid);
  if (!phone) return;
  const col = await getCollection();
  await col.updateOne(
    { userId: params.userId, phone },
    {
      $set: {
        userId: params.userId,
        phone,
        chatJid: params.chatJid || `${phone}@s.whatsapp.net`,
        source: params.source || 'keyword',
        keyword: params.keyword || '',
        optedOutAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function recordOptIn(userId: string, phoneOrJid: string): Promise<void> {
  const phone = normalizeDigits(phoneOrJid);
  if (!phone) return;
  const col = await getCollection();
  await col.deleteOne({ userId, phone });
}

export async function listOptOuts(userId: string): Promise<Array<{ phone: string; chatJid: string; source: string; keyword: string; optedOutAt: Date }>> {
  const col = await getCollection();
  const docs = await col.find({ userId }).sort({ optedOutAt: -1 }).limit(2000).toArray();
  return docs.map((d: any) => ({
    phone: d.phone,
    chatJid: d.chatJid || '',
    source: d.source || 'keyword',
    keyword: d.keyword || '',
    optedOutAt: d.optedOutAt,
  }));
}

/**
 * Inspect an inbound message for STOP/START intent and handle it fully:
 * record the opt-out/opt-in and send the confirmation reply via the tenant's
 * own QR bridge session.
 *
 * Returns true when the message WAS an opt-out/opt-in command — the caller
 * must then skip chatbot flows and automation rules for this message.
 */
export async function handleQrOptOutKeyword(input: {
  userId: string;
  phoneNumber: string;
  chatJid?: string;
  messageText: string;
}): Promise<boolean> {
  const intent = detectOptOutIntent(input.messageText);
  if (!intent) return false;

  const phone = normalizeDigits(input.phoneNumber);
  if (!phone) return false;

  try {
    if (intent === 'opt_out') {
      await recordOptOut({
        userId: input.userId,
        phoneOrJid: phone,
        chatJid: input.chatJid,
        source: 'keyword',
        keyword: normalizeKeywordText(input.messageText),
      });
      console.log(`[QR OptOut] ${phone} opted OUT for tenant ${input.userId}`);
    } else {
      await recordOptIn(input.userId, phone);
      console.log(`[QR OptOut] ${phone} opted back IN for tenant ${input.userId}`);
    }

    // Confirmation reply via the tenant's own session (best-effort — the
    // opt-out itself is already recorded even if the reply fails).
    try {
      const session = await resolveQrTenantBridge(input.userId);
      if (session && (await isQrTenantConnected(session))) {
        await sendQrTenantMessage(session, {
          to: `${phone}@s.whatsapp.net`,
          type: 'text',
          message: intent === 'opt_out' ? OPT_OUT_CONFIRMATION : OPT_IN_CONFIRMATION,
        });
      }
    } catch (replyErr: any) {
      console.warn(`[QR OptOut] Confirmation reply failed (opt-${intent === 'opt_out' ? 'out' : 'in'} still recorded):`, replyErr?.message);
    }

    return true;
  } catch (err: any) {
    console.error('[QR OptOut] handleQrOptOutKeyword error:', err?.message);
    return false;
  }
}
