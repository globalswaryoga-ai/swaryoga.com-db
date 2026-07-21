/**
 * Meta WhatsApp chat archival: Mongo (hot, ~1 day) -> Bunny Storage (cold,
 * up to 1 year). Mirrors lib/qrWhatsappArchive.ts's design for the Meta
 * Cloud API channel (WhatsAppMessage / provider:'meta').
 *
 * Layout in Bunny: whatsapp-archive-meta/{tenantUserId}/{phoneNumber}/{YYYY-MM-DD}.json
 * One JSON file per (tenant, customer phone, day).
 *
 * `meta_whatsapp_archive_manifest` is the authoritative index of what's been
 * archived — used both to retrieve old messages for a chat and to find/purge
 * anything older than the 1-year retention window.
 *
 * Tenant isolation: every function here takes tenantUserId explicitly and
 * scopes every Mongo query and Bunny path by it — 'shared' is a real,
 * distinct bucket (the super-admin/default number), never a wildcard.
 */
import { uploadToPath, fetchFromStorage, deleteFromBunnyStorage } from '@/lib/bunny-storage';
import { connectDB } from '@/lib/db';
import { getMetaWhatsappStorageUsage, getMetaWhatsappArchiveManifest } from '@/lib/schemas/enterpriseSchemas';

export const RETENTION_DAYS = 365; // ~1 year, per business requirement

export type ArchivedMetaMessage = {
  messageId: string; // waMessageId, falling back to the Mongo _id string
  leadId: string;
  direction: 'inbound' | 'outbound';
  text: string;
  messageType: string;
  status: string;
  sentAt: number; // unix seconds
  headerText: string;
  footerText: string;
  hasMedia: boolean;
  mediaUrl: string;
  mediaKind: string;
  sentByUserId: string;
};

function sanitizeForPath(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function bunnyPathFor(tenantUserId: string, phoneNumber: string, dateKey: string): string {
  return `whatsapp-archive-meta/${sanitizeForPath(tenantUserId)}/${sanitizeForPath(phoneNumber)}/${dateKey}.json`;
}

/** 'YYYY-MM-DD' for a given Unix-seconds timestamp, in UTC. */
export function dateKeyForTimestamp(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
}

/**
 * Archive one (tenantUserId, phoneNumber, dateKey) bucket of messages to
 * Bunny, merging with any existing file for that same bucket. Updates the
 * manifest + usage ledger. Does NOT delete from Mongo — callers decide when
 * it's safe to do that (only after a successful upload here).
 */
export async function archiveChatDay(
  tenantUserId: string,
  phoneNumber: string,
  dateKey: string,
  messages: ArchivedMetaMessage[]
): Promise<{ bunnyPath: string; messageCount: number; byteSize: number }> {
  if (!tenantUserId || !phoneNumber || !dateKey || messages.length === 0) {
    throw new Error('archiveChatDay: missing required arguments or empty messages');
  }

  await connectDB();
  const bunnyPath = bunnyPathFor(tenantUserId, phoneNumber, dateKey);
  const Manifest = getMetaWhatsappArchiveManifest();
  const Usage = getMetaWhatsappStorageUsage();

  const existingManifest = await Manifest.findOne({ tenantUserId, phoneNumber, dateKey }).lean();
  let existingMessages: ArchivedMetaMessage[] = [];
  let previousByteSize = 0;
  if (existingManifest) {
    try {
      const { buffer } = await fetchFromStorage(bunnyPath);
      existingMessages = JSON.parse(buffer.toString('utf-8'));
      previousByteSize = (existingManifest as any).byteSize || buffer.length;
    } catch {
      existingMessages = [];
      previousByteSize = 0;
    }
  }

  const byMessageId = new Map<string, ArchivedMetaMessage>();
  for (const m of existingMessages) byMessageId.set(m.messageId, m);
  for (const m of messages) byMessageId.set(m.messageId, m);
  const merged = Array.from(byMessageId.values()).sort((a, b) => a.sentAt - b.sentAt);

  const jsonBuffer = Buffer.from(JSON.stringify(merged), 'utf-8');
  await uploadToPath(jsonBuffer, bunnyPath, 'application/json');

  await Manifest.updateOne(
    { tenantUserId, phoneNumber, dateKey },
    {
      $set: {
        tenantUserId, phoneNumber, dateKey, bunnyPath,
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
    { tenantUserId },
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
 * Retrieve archived messages for a tenant+phone across a date range
 * (inclusive), for display when a user opens a chat and wants history
 * older than what's still in Mongo. Missing days are silently skipped.
 */
export async function getArchivedMessages(
  tenantUserId: string,
  phoneNumber: string,
  sinceDateKey: string,
  untilDateKey: string
): Promise<ArchivedMetaMessage[]> {
  await connectDB();
  const Manifest = getMetaWhatsappArchiveManifest();
  const entries = await Manifest.find({
    tenantUserId, phoneNumber,
    dateKey: { $gte: sinceDateKey, $lte: untilDateKey },
  }).sort({ dateKey: 1 }).lean();

  const results: ArchivedMetaMessage[] = [];
  for (const entry of entries) {
    try {
      const { buffer } = await fetchFromStorage((entry as any).bunnyPath);
      results.push(...JSON.parse(buffer.toString('utf-8')));
    } catch (e) {
      console.warn(`[metaWhatsappArchive] Failed to fetch archive ${(entry as any).bunnyPath}:`, e instanceof Error ? e.message : e);
    }
  }
  return results;
}

/**
 * Delete all archives older than RETENTION_DAYS for a specific tenant
 * (final purge — this data is gone from both Mongo and Bunny after this).
 */
export async function purgeExpiredArchives(
  tenantUserId: string
): Promise<{ filesDeleted: number; messagesDeleted: number; bytesFreed: number }> {
  await connectDB();
  const Manifest = getMetaWhatsappArchiveManifest();
  const Usage = getMetaWhatsappStorageUsage();

  const cutoffDateKey = dateKeyForTimestamp(Math.floor(Date.now() / 1000) - RETENTION_DAYS * 24 * 60 * 60);
  const expired = await Manifest.find({ tenantUserId, dateKey: { $lt: cutoffDateKey } }).lean();

  let filesDeleted = 0;
  let messagesDeleted = 0;
  let bytesFreed = 0;

  for (const entry of expired) {
    const ok = await deleteFromBunnyStorage((entry as any).bunnyPath);
    if (!ok) {
      console.warn(`[metaWhatsappArchive] Failed to delete expired archive ${(entry as any).bunnyPath}, leaving manifest row for retry`);
      continue;
    }
    await Manifest.deleteOne({ _id: (entry as any)._id });
    filesDeleted += 1;
    messagesDeleted += (entry as any).messageCount || 0;
    bytesFreed += (entry as any).byteSize || 0;
  }

  if (filesDeleted > 0) {
    await Usage.updateOne(
      { tenantUserId },
      {
        $inc: { bunnyBytes: -bytesFreed, bunnyFileCount: -filesDeleted, bunnyMessageCount: -messagesDeleted },
        $set: { lastPurgedAt: new Date() },
      }
    );
  }

  return { filesDeleted, messagesDeleted, bytesFreed };
}

/** Get every distinct tenantUserId that has any archive data — for the purge sweep to iterate. */
export async function listArchivedTenants(): Promise<string[]> {
  await connectDB();
  const Usage = getMetaWhatsappStorageUsage();
  const docs = await Usage.find({}, { tenantUserId: 1 }).lean();
  return docs.map((d: any) => d.tenantUserId);
}
