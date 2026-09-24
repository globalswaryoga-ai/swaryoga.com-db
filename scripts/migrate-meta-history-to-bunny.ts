/**
 * One-time migration: move the existing Meta WhatsApp message backlog out of
 * whatsapp_messages into the same Mongo -> Bunny archive scheme the daily
 * cron (app/api/cron/meta-chat-archive) uses going forward.
 *
 * Meta has never been archived before, so this backlog can be large (years
 * of history for the shared/default number alone). Per the same policy as
 * QR WhatsApp:
 *   - Messages within the last 365 days (RETENTION_DAYS) are archived to
 *     Bunny via archiveChatDay(), then deleted from Mongo only after a
 *     confirmed successful upload.
 *   - Messages older than 365 days are deleted from Mongo directly — NOT
 *     written to Bunny at all.
 *
 * Tenant isolation: each message's owning tenant is resolved from its own
 * Lead (assignedToUserId/createdByUserId) — never inferred from phoneNumber
 * alone, since the same number can be a lead for multiple tenants. Messages
 * whose lead has no resolvable owner are bucketed under 'shared' (the
 * default/super-admin number), never left unscoped.
 *
 * Usage:
 *   npx tsx scripts/migrate-meta-history-to-bunny.ts                  # dry run, everyone
 *   npx tsx scripts/migrate-meta-history-to-bunny.ts --tenant=admincrm # dry run, one tenant ('shared' for the default number)
 *   npx tsx scripts/migrate-meta-history-to-bunny.ts --confirm         # actually run it
 *
 * Always run without --confirm first and review the printed summary.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import type { ArchivedMetaMessage } from '../lib/metaWhatsappArchive';

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const tenantArg = args.find((a) => a.startsWith('--tenant='))?.split('=')[1];

function toArchivedMessage(doc: any): ArchivedMetaMessage {
  const sentAtDate: Date = doc.sentAt || doc.createdAt || new Date();
  return {
    messageId: doc.waMessageId || String(doc._id),
    leadId: String(doc.leadId || ''),
    direction: doc.direction || 'outbound',
    text: doc.messageContent || (doc.media?.kind ? `[${doc.media.kind}]` : ''),
    messageType: doc.messageType || 'text',
    status: doc.status || 'sent',
    sentAt: Math.floor(sentAtDate.getTime() / 1000),
    headerText: doc.headerText || '',
    footerText: doc.footerText || '',
    hasMedia: !!doc.media?.url,
    mediaUrl: doc.media?.url || '',
    mediaKind: doc.media?.kind || '',
    sentByUserId: doc.sentByUserId || '',
  };
}

async function main() {
  console.log(`[Migrate Meta] Mode: ${CONFIRM ? 'LIVE (writing/deleting)' : 'DRY RUN (no writes)'}`);
  if (tenantArg) console.log(`[Migrate Meta] Filtering to tenantUserId=${tenantArg}`);

  const { connectDB } = await import('../lib/db');
  const { getWhatsAppMessage, getLead } = await import('../lib/schemas/enterpriseSchemas');
  const { archiveChatDay, dateKeyForTimestamp, RETENTION_DAYS } = await import('../lib/metaWhatsappArchive');

  await connectDB();
  const WhatsAppMessage = getWhatsAppMessage();
  const Lead = getLead();

  const cutoffSeconds = Math.floor(Date.now() / 1000) - RETENTION_DAYS * 24 * 60 * 60;

  const allMessages = await WhatsAppMessage.find({ provider: 'meta' }).lean();
  console.log(`[Migrate Meta] Found ${allMessages.length} total Meta messages in Mongo.`);

  const leadIds = Array.from(new Set(allMessages.map((m: any) => String(m.leadId || '')).filter(Boolean)));
  const leads = leadIds.length
    ? await Lead.find({ _id: { $in: leadIds } }, { assignedToUserId: 1, createdByUserId: 1 }).lean()
    : [];
  const ownerByLeadId = new Map(
    leads.map((l: any) => [String(l._id), l.assignedToUserId || l.createdByUserId || 'shared'])
  );

  // Bucket: tenantUserId::phoneNumber -> dateKey -> docs, split into
  // "recent" (archive) vs "expired" (delete outright, not migrated).
  const recentBuckets = new Map<string, Map<string, any[]>>();
  const expiredByBucket = new Map<string, any[]>();

  for (const doc of allMessages as any[]) {
    const tenantUserId = doc.leadId ? ownerByLeadId.get(String(doc.leadId)) || 'shared' : 'shared';
    if (tenantArg && tenantUserId !== tenantArg) continue;

    const bucketKey = `${tenantUserId}::${doc.phoneNumber}`;
    const sentAtDate: Date = doc.sentAt || doc.createdAt || new Date();
    const sentAtSeconds = Math.floor(sentAtDate.getTime() / 1000);

    if (sentAtSeconds < cutoffSeconds) {
      if (!expiredByBucket.has(bucketKey)) expiredByBucket.set(bucketKey, []);
      expiredByBucket.get(bucketKey)!.push(doc);
    } else {
      const dateKey = dateKeyForTimestamp(sentAtSeconds);
      if (!recentBuckets.has(bucketKey)) recentBuckets.set(bucketKey, new Map());
      const byDay = recentBuckets.get(bucketKey)!;
      if (!byDay.has(dateKey)) byDay.set(dateKey, []);
      byDay.get(dateKey)!.push(doc);
    }
  }

  const allBucketKeys = new Set([...recentBuckets.keys(), ...expiredByBucket.keys()]);
  console.log(`[Migrate Meta] ${allBucketKeys.size} (tenantUserId, phoneNumber) buckets to process.`);

  let totalArchived = 0;
  let totalDeletedRecent = 0;
  let totalDeletedExpired = 0;
  let bucketsFailed = 0;
  const tenantsSeen = new Set<string>();

  for (const bucketKey of allBucketKeys) {
    const [tenantUserId, phoneNumber] = bucketKey.split('::');
    tenantsSeen.add(tenantUserId);

    try {
      const byDay = recentBuckets.get(bucketKey);
      if (byDay) {
        for (const [dateKey, docs] of byDay) {
          console.log(
            `[Migrate Meta] ${CONFIRM ? 'Archiving' : '[dry-run] Would archive'} ${docs.length} msg(s) for ${tenantUserId}/${phoneNumber} on ${dateKey}`
          );
          if (CONFIRM) {
            await archiveChatDay(tenantUserId, phoneNumber, dateKey, docs.map(toArchivedMessage));
            const delResult = await WhatsAppMessage.deleteMany({ _id: { $in: docs.map((d: any) => d._id) } });
            totalDeletedRecent += delResult.deletedCount || 0;
          }
          totalArchived += docs.length;
        }
      }

      const expiredDocs = expiredByBucket.get(bucketKey) || [];
      if (expiredDocs.length > 0) {
        console.log(
          `[Migrate Meta] ${CONFIRM ? 'Deleting' : '[dry-run] Would delete'} ${expiredDocs.length} msg(s) older than ${RETENTION_DAYS}d for ${tenantUserId}/${phoneNumber} (not migrated to Bunny)`
        );
        if (CONFIRM) {
          const delResult = await WhatsAppMessage.deleteMany({ _id: { $in: expiredDocs.map((d: any) => d._id) } });
          totalDeletedExpired += delResult.deletedCount || 0;
        } else {
          totalDeletedExpired += expiredDocs.length;
        }
      }
    } catch (err) {
      bucketsFailed += 1;
      console.error(`[Migrate Meta] Failed bucket ${bucketKey}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('\n[Migrate Meta] ── Summary ──');
  console.log(`  Mode:                 ${CONFIRM ? 'LIVE' : 'DRY RUN'}`);
  console.log(`  Tenants touched:      ${tenantsSeen.size}`);
  console.log(`  Buckets processed:    ${allBucketKeys.size - bucketsFailed} / ${allBucketKeys.size}`);
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
  console.error('[Migrate Meta] Fatal error:', err);
  process.exit(1);
});
