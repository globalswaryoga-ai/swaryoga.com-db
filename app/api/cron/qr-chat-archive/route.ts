/**
 * Vercel Cron Job: QR WhatsApp chat archival (Mongo -> Bunny)
 * Schedule: 30 20 * * * UTC = 2:00 AM IST daily
 * Secured by CRON_SECRET env var
 *
 * Moves messages that have sat in `qr_whatsapp_messages` for at least one
 * full day into Bunny Storage (see lib/qrWhatsappArchive.ts), then deletes
 * them from Mongo — only after a confirmed successful upload. Also runs the
 * 6-month final purge on Bunny archives while it's here.
 *
 * Tenant isolation: every archive/delete operation is scoped to the exact
 * (userId, connectedPhone, chatJid) of the messages being processed — never
 * a cross-tenant bulk operation.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { archiveChatDay, purgeExpiredArchives, listArchivedTenants, dateKeyForTimestamp, type ArchivedMessage } from '@/lib/qrWhatsappArchive';

// Stop starting new buckets after this much wall-clock time, so we always
// return cleanly within maxDuration rather than getting killed mid-write.
// Any remaining backlog is picked up by tomorrow's run (or a manual retry).
const TIME_BUDGET_MS = 240_000;
const MAX_BUCKETS_PER_RUN = 500;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const todayDateKey = new Date().toISOString().slice(0, 10);

  try {
    await connectDB();
    const QrMsg = getQrWhatsAppMessage();

    // Find every distinct (userId, connectedPhone, chatJid) bucket that has
    // at least one message older than today (i.e. archivable) still sitting
    // in Mongo. Grouping first keeps this cheap even with a large backlog.
    const buckets = await QrMsg.aggregate([
      { $match: { timestamp: { $lt: Math.floor(new Date(todayDateKey).getTime() / 1000) } } },
      { $group: { _id: { userId: '$userId', connectedPhone: '$connectedPhone', chatJid: '$chatJid' }, count: { $sum: 1 } } },
      { $limit: MAX_BUCKETS_PER_RUN },
    ]);

    let bucketsProcessed = 0;
    let messagesArchived = 0;
    let messagesDeleted = 0;
    let errors = 0;
    const processedTenants = new Set<string>();

    for (const bucket of buckets) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        console.log('[QR Chat Archive] Time budget reached, stopping early — remainder picked up next run.');
        break;
      }

      const { userId, connectedPhone, chatJid } = bucket._id;
      processedTenants.add(`${userId}::${connectedPhone}`);

      try {
        const messages = await QrMsg.find({
          userId, connectedPhone, chatJid,
          timestamp: { $lt: Math.floor(new Date(todayDateKey).getTime() / 1000) },
        }).lean();

        // Group this bucket's messages by day — a chat can have messages
        // spanning several un-archived days if the cron missed a run.
        const byDay = new Map<string, { doc: any; archived: ArchivedMessage }[]>();
        for (const doc of messages) {
          const dateKey = dateKeyForTimestamp(doc.timestamp);
          const archived: ArchivedMessage = {
            messageId: doc.messageId, direction: doc.direction, fromMe: !!doc.fromMe,
            text: doc.text || '', type: doc.type || 'text', participant: doc.participant || '',
            pushName: doc.pushName || '', timestamp: doc.timestamp, status: doc.status || 0,
            hasMedia: !!doc.hasMedia, mediaUrl: doc.mediaUrl || '', mediaMimetype: doc.mediaMimetype || '',
            mediaFileName: doc.mediaFileName || '', quotedId: doc.quotedId || '',
            quotedText: doc.quotedText || '', quotedParticipant: doc.quotedParticipant || '',
          };
          if (!byDay.has(dateKey)) byDay.set(dateKey, []);
          byDay.get(dateKey)!.push({ doc, archived });
        }

        for (const [dateKey, entries] of byDay) {
          await archiveChatDay(userId, connectedPhone, chatJid, dateKey, entries.map((e) => e.archived));
          // Only delete from Mongo now that the archive upload above succeeded.
          const idsToDelete = entries.map((e) => e.doc._id);
          const delResult = await QrMsg.deleteMany({ _id: { $in: idsToDelete } });
          messagesArchived += entries.length;
          messagesDeleted += delResult.deletedCount || 0;
        }
        bucketsProcessed += 1;
      } catch (bucketErr) {
        errors += 1;
        console.error(`[QR Chat Archive] Failed to archive bucket ${JSON.stringify(bucket._id)}:`, bucketErr instanceof Error ? bucketErr.message : bucketErr);
      }
    }

    // 6-month final purge — cheap relative to archiving, safe to do every run.
    let purgedFiles = 0;
    let purgedBytes = 0;
    if (Date.now() - startedAt < TIME_BUDGET_MS) {
      const tenants = await listArchivedTenants();
      for (const { userId, connectedPhone } of tenants) {
        if (Date.now() - startedAt > TIME_BUDGET_MS) break;
        try {
          const result = await purgeExpiredArchives(userId, connectedPhone);
          purgedFiles += result.filesDeleted;
          purgedBytes += result.bytesFreed;
        } catch (purgeErr) {
          console.error(`[QR Chat Archive] Purge failed for ${userId}/${connectedPhone}:`, purgeErr instanceof Error ? purgeErr.message : purgeErr);
        }
      }
    }

    const summary = {
      success: true,
      bucketsProcessed, messagesArchived, messagesDeleted, errors,
      tenantsTouched: processedTenants.size,
      purgedFiles, purgedBytes,
      durationMs: Date.now() - startedAt,
    };
    console.log('[QR Chat Archive] Run complete:', summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('[QR Chat Archive] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
