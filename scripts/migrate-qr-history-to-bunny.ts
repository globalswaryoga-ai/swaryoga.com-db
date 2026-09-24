/**
 * One-time migration: move existing QR WhatsApp message backlog out of
 * qr_whatsapp_messages into the same Mongo -> Bunny archive scheme the daily
 * cron (app/api/cron/qr-chat-archive) uses going forward.
 *
 * Per business requirement, this does NOT migrate everything to Bunny:
 *   - Messages from the last 180 days (RETENTION_DAYS) are archived to Bunny
 *     via archiveChatDay() (identical logic/format to the daily cron), then
 *     deleted from Mongo only after a confirmed successful upload.
 *   - Messages older than 180 days are deleted from Mongo directly — they are
 *     NOT written to Bunny at all (some numbers have data back to 2022 with
 *     tens of thousands of messages; the explicit ask was "only last six
 *     month chat will be saved in bunny").
 *
 * Tenant isolation: processes one (userId, connectedPhone, chatJid) bucket
 * at a time, scoped exactly to that bucket's own messages — never a
 * cross-tenant bulk operation.
 *
 * Usage:
 *   npx tsx scripts/migrate-qr-history-to-bunny.ts                 # dry run, all tenants
 *   npx tsx scripts/migrate-qr-history-to-bunny.ts --user=<userId>  # dry run, one tenant
 *   npx tsx scripts/migrate-qr-history-to-bunny.ts --phone=919309986820
 *   npx tsx scripts/migrate-qr-history-to-bunny.ts --confirm        # actually run it
 *
 * Always run without --confirm first and review the printed summary.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Loaded dynamically inside main(), after dotenv.config() has run — these
// modules read MONGODB_URI etc. at import time, and static imports would be
// hoisted above the dotenv.config() call above.
import type { ArchivedMessage } from '../lib/qrWhatsappArchive';

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const userArg = args.find((a) => a.startsWith('--user='))?.split('=')[1];
const phoneArg = args.find((a) => a.startsWith('--phone='))?.split('=')[1];

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

async function main() {
  console.log(`[Migrate] Mode: ${CONFIRM ? 'LIVE (writing/deleting)' : 'DRY RUN (no writes)'}`);
  if (userArg) console.log(`[Migrate] Filtering to userId=${userArg}`);
  if (phoneArg) console.log(`[Migrate] Filtering to connectedPhone=${phoneArg}`);

  const { connectDB } = await import('../lib/db');
  const { getQrWhatsAppMessage } = await import('../lib/schemas/enterpriseSchemas');
  const { archiveChatDay, dateKeyForTimestamp, RETENTION_DAYS } = await import('../lib/qrWhatsappArchive');

  await connectDB();
  const QrMsg = getQrWhatsAppMessage();

  const cutoffSeconds = Math.floor(Date.now() / 1000) - RETENTION_DAYS * 24 * 60 * 60;
  const match: any = {};
  if (userArg) match.userId = userArg;
  if (phoneArg) match.connectedPhone = phoneArg;

  const buckets = await QrMsg.aggregate([
    { $match: match },
    { $group: { _id: { userId: '$userId', connectedPhone: '$connectedPhone', chatJid: '$chatJid' }, count: { $sum: 1 } } },
  ]);

  console.log(`[Migrate] Found ${buckets.length} (userId, connectedPhone, chatJid) buckets to process.`);

  let totalArchived = 0;
  let totalDeletedRecent = 0;
  let totalDeletedExpired = 0;
  let bucketsFailed = 0;
  const tenantsSeen = new Set<string>();

  for (const bucket of buckets) {
    const { userId, connectedPhone, chatJid } = bucket._id;
    tenantsSeen.add(`${userId}::${connectedPhone}`);

    try {
      const messages = await QrMsg.find({ userId, connectedPhone, chatJid }).lean();

      const recentByDay = new Map<string, any[]>();
      const expiredIds: any[] = [];

      for (const doc of messages) {
        if (doc.timestamp < cutoffSeconds) {
          expiredIds.push(doc._id);
        } else {
          const dateKey = dateKeyForTimestamp(doc.timestamp);
          if (!recentByDay.has(dateKey)) recentByDay.set(dateKey, []);
          recentByDay.get(dateKey)!.push(doc);
        }
      }

      for (const [dateKey, docs] of recentByDay) {
        console.log(
          `[Migrate] ${CONFIRM ? 'Archiving' : '[dry-run] Would archive'} ${docs.length} msg(s) for ${userId}/${connectedPhone}/${chatJid} on ${dateKey}`
        );
        if (CONFIRM) {
          await archiveChatDay(userId, connectedPhone, chatJid, dateKey, docs.map(toArchivedMessage));
          const delResult = await QrMsg.deleteMany({ _id: { $in: docs.map((d: any) => d._id) } });
          totalDeletedRecent += delResult.deletedCount || 0;
        }
        totalArchived += docs.length;
      }

      if (expiredIds.length > 0) {
        console.log(
          `[Migrate] ${CONFIRM ? 'Deleting' : '[dry-run] Would delete'} ${expiredIds.length} msg(s) older than ${RETENTION_DAYS}d for ${userId}/${connectedPhone}/${chatJid} (not migrated to Bunny)`
        );
        if (CONFIRM) {
          const delResult = await QrMsg.deleteMany({ _id: { $in: expiredIds } });
          totalDeletedExpired += delResult.deletedCount || 0;
        } else {
          totalDeletedExpired += expiredIds.length;
        }
      }
    } catch (err) {
      bucketsFailed += 1;
      console.error(`[Migrate] Failed bucket ${JSON.stringify(bucket._id)}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('\n[Migrate] ── Summary ──');
  console.log(`  Mode:                 ${CONFIRM ? 'LIVE' : 'DRY RUN'}`);
  console.log(`  Tenants touched:      ${tenantsSeen.size}`);
  console.log(`  Buckets processed:    ${buckets.length - bucketsFailed} / ${buckets.length}`);
  console.log(`  Messages archived (<=${RETENTION_DAYS}d, -> Bunny): ${totalArchived}`);
  console.log(`  Messages deleted (>${RETENTION_DAYS}d, not migrated): ${totalDeletedExpired}`);
  if (CONFIRM) {
    console.log(`  Mongo docs deleted (post-archive): ${totalDeletedRecent}`);
  } else {
    console.log('\n  This was a DRY RUN — nothing was written or deleted. Re-run with --confirm to apply.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[Migrate] Fatal error:', err);
  process.exit(1);
});
