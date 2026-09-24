/**
 * QR WhatsApp chat archival: Mongo (hot, ~1 day) -> Bunny Storage (cold, up to 6 months).
 *
 * Layout in Bunny: whatsapp-archive/{userId}/{connectedPhone}/{sanitizedChatJid}/{YYYY-MM-DD}.json
 * One JSON file per (tenant, chat, day), containing that day's messages for that chat.
 *
 * `qr_whatsapp_archive_manifest` is the authoritative index of what's been
 * archived (one row per file) — used both to retrieve old messages for a
 * chat and to find/purge anything older than the 6-month retention window,
 * without needing to list Bunny's storage directories.
 *
 * Tenant isolation: every function here takes userId + connectedPhone
 * explicitly and scopes every Mongo query and Bunny path by them — never
 * infer or default these from a shared/global lookup.
 */
import { uploadToPath, fetchFromStorage, deleteFromBunnyStorage } from '@/lib/bunny-storage';
import { connectDB } from '@/lib/db';
import { getQrWhatsAppMessage, getQrWhatsappStorageUsage, getQrWhatsappArchiveManifest } from '@/lib/schemas/enterpriseSchemas';

export const RETENTION_DAYS = 180; // ~6 months, per business requirement

export type ArchivedMessage = {
  messageId: string;
  direction: 'inbound' | 'outbound';
  fromMe: boolean;
  text: string;
  type: string;
  participant: string;
  pushName: string;
  timestamp: number;
  status: number;
  hasMedia: boolean;
  mediaUrl: string;
  mediaMimetype: string;
  mediaFileName: string;
  quotedId: string;
  quotedText: string;
  quotedParticipant: string;
};

function sanitizeForPath(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function bunnyPathFor(userId: string, connectedPhone: string, chatJid: string, dateKey: string): string {
  return `whatsapp-archive/${sanitizeForPath(userId)}/${sanitizeForPath(connectedPhone)}/${sanitizeForPath(chatJid)}/${dateKey}.json`;
}

/** 'YYYY-MM-DD' for a given Unix-seconds timestamp, in UTC (matches how timestamps are stored). */
export function dateKeyForTimestamp(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
}

function toArchivedMessage(doc: any): ArchivedMessage {
  return {
    messageId: doc.messageId,
    direction: doc.direction,
    fromMe: !!doc.fromMe,
    text: doc.text || '',
    type: doc.type || 'text',
    participant: doc.participant || '',
    pushName: doc.pushName || '',
    timestamp: doc.timestamp,
    status: doc.status || 0,
    hasMedia: !!doc.hasMedia,
    mediaUrl: doc.mediaUrl || '',
    mediaMimetype: doc.mediaMimetype || '',
    mediaFileName: doc.mediaFileName || '',
    quotedId: doc.quotedId || '',
    quotedText: doc.quotedText || '',
    quotedParticipant: doc.quotedParticipant || '',
  };
}

/**
 * Archive one (userId, connectedPhone, chatJid, dateKey) bucket of messages
 * to Bunny, merging with any existing file for that same bucket (safe to
 * call more than once for the same day — e.g. a retried cron run). Updates
 * the manifest + usage ledger. Does NOT delete from Mongo — callers decide
 * when it's safe to do that (only after a successful upload here).
 */
export async function archiveChatDay(
  userId: string,
  connectedPhone: string,
  chatJid: string,
  dateKey: string,
  messages: ArchivedMessage[]
): Promise<{ bunnyPath: string; messageCount: number; byteSize: number }> {
  if (!userId || !connectedPhone || !chatJid || !dateKey || messages.length === 0) {
    throw new Error('archiveChatDay: missing required arguments or empty messages');
  }

  await connectDB();
  const bunnyPath = bunnyPathFor(userId, connectedPhone, chatJid, dateKey);
  const Manifest = getQrWhatsappArchiveManifest();
  const Usage = getQrWhatsappStorageUsage();

  const existingManifest = await Manifest.findOne({ userId, connectedPhone, chatJid, dateKey }).lean();
  let existingMessages: ArchivedMessage[] = [];
  let previousByteSize = 0;
  if (existingManifest) {
    try {
      const { buffer } = await fetchFromStorage(bunnyPath);
      existingMessages = JSON.parse(buffer.toString('utf-8'));
      previousByteSize = (existingManifest as any).byteSize || buffer.length;
    } catch {
      // Manifest says a file should exist but it's missing/unreadable — treat as empty and re-write.
      existingMessages = [];
      previousByteSize = 0;
    }
  }

  const byMessageId = new Map<string, ArchivedMessage>();
  for (const m of existingMessages) byMessageId.set(m.messageId, m);
  for (const m of messages) byMessageId.set(m.messageId, m);
  const merged = Array.from(byMessageId.values()).sort((a, b) => a.timestamp - b.timestamp);

  const jsonBuffer = Buffer.from(JSON.stringify(merged), 'utf-8');
  await uploadToPath(jsonBuffer, bunnyPath, 'application/json');

  await Manifest.updateOne(
    { userId, connectedPhone, chatJid, dateKey },
    {
      $set: {
        userId, connectedPhone, chatJid, dateKey, bunnyPath,
        byteSize: jsonBuffer.length,
        messageCount: merged.length,
        archivedAt: new Date(),
      },
    },
    { upsert: true }
  );

  const byteDelta = jsonBuffer.length - previousByteSize;
  const messageDelta = merged.length - existingMessages.length;
  await Usage.updateOne(
    { userId, connectedPhone },
    {
      $inc: {
        bunnyBytes: byteDelta,
        bunnyFileCount: existingManifest ? 0 : 1,
        bunnyMessageCount: messageDelta,
      },
      $set: { lastArchivedAt: new Date() },
    },
    { upsert: true }
  );

  return { bunnyPath, messageCount: merged.length, byteSize: jsonBuffer.length };
}

/**
 * Retrieve archived messages for a chat across a date range (inclusive),
 * for display when a user opens a chat and wants history older than what's
 * still in Mongo. Missing days are silently skipped (no archive for that day).
 */
export async function getArchivedMessages(
  userId: string,
  connectedPhone: string,
  chatJid: string,
  sinceDateKey: string,
  untilDateKey: string
): Promise<ArchivedMessage[]> {
  await connectDB();
  const Manifest = getQrWhatsappArchiveManifest();
  const entries = await Manifest.find({
    userId, connectedPhone, chatJid,
    dateKey: { $gte: sinceDateKey, $lte: untilDateKey },
  }).sort({ dateKey: 1 }).lean();

  const results: ArchivedMessage[] = [];
  for (const entry of entries) {
    try {
      const { buffer } = await fetchFromStorage((entry as any).bunnyPath);
      results.push(...JSON.parse(buffer.toString('utf-8')));
    } catch (e) {
      console.warn(`[qrWhatsappArchive] Failed to fetch archive ${(entry as any).bunnyPath}:`, e instanceof Error ? e.message : e);
    }
  }
  return results;
}

/**
 * Delete all archives older than RETENTION_DAYS for a specific tenant+number
 * (final purge — this data is gone from both Mongo and Bunny after this).
 * Returns how many files/messages/bytes were purged.
 */
export async function purgeExpiredArchives(
  userId: string,
  connectedPhone: string
): Promise<{ filesDeleted: number; messagesDeleted: number; bytesFreed: number }> {
  await connectDB();
  const Manifest = getQrWhatsappArchiveManifest();
  const Usage = getQrWhatsappStorageUsage();

  const cutoffDateKey = dateKeyForTimestamp(Math.floor(Date.now() / 1000) - RETENTION_DAYS * 24 * 60 * 60);
  const expired = await Manifest.find({ userId, connectedPhone, dateKey: { $lt: cutoffDateKey } }).lean();

  let filesDeleted = 0;
  let messagesDeleted = 0;
  let bytesFreed = 0;

  for (const entry of expired) {
    const ok = await deleteFromBunnyStorage((entry as any).bunnyPath);
    if (!ok) {
      console.warn(`[qrWhatsappArchive] Failed to delete expired archive ${(entry as any).bunnyPath}, leaving manifest row for retry`);
      continue;
    }
    await Manifest.deleteOne({ _id: (entry as any)._id });
    filesDeleted += 1;
    messagesDeleted += (entry as any).messageCount || 0;
    bytesFreed += (entry as any).byteSize || 0;
  }

  if (filesDeleted > 0) {
    await Usage.updateOne(
      { userId, connectedPhone },
      {
        $inc: { bunnyBytes: -bytesFreed, bunnyFileCount: -filesDeleted, bunnyMessageCount: -messagesDeleted },
        $set: { lastPurgedAt: new Date() },
      }
    );
  }

  return { filesDeleted, messagesDeleted, bytesFreed };
}

/** Get every distinct (userId, connectedPhone) pair that has any archive data — for the purge sweep to iterate. */
export async function listArchivedTenants(): Promise<{ userId: string; connectedPhone: string }[]> {
  await connectDB();
  const Usage = getQrWhatsappStorageUsage();
  const docs = await Usage.find({}, { userId: 1, connectedPhone: 1 }).lean();
  return docs.map((d: any) => ({ userId: d.userId, connectedPhone: d.connectedPhone }));
}
