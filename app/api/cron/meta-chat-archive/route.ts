/**
 * Vercel Cron Job: Meta WhatsApp chat archival (Mongo -> Bunny)
 * Schedule: 45 20 * * * UTC = 2:15 AM IST daily
 * Secured by CRON_SECRET env var
 *
 * Mirrors app/api/cron/qr-chat-archive for the Meta Cloud API channel:
 * moves WhatsAppMessage (provider:'meta') docs that have sat in Mongo for
 * at least one full day into Bunny Storage (see lib/metaWhatsappArchive.ts),
 * then deletes them from Mongo — only after a confirmed successful upload.
 * Also runs the 1-year final purge on Bunny archives while it's here.
 *
 * Tenant isolation: each message's owning tenant is resolved from its own
 * Lead (assignedToUserId/createdByUserId), never assumed from phoneNumber
 * alone — the same phone number can be a lead for multiple tenants across
 * different channels. Messages whose lead has no resolvable owner (the
 * shared/default super-admin number) are bucketed under 'shared', not
 * left unscoped.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppMessage, getLead } from '@/lib/schemas/enterpriseSchemas';
import { archiveChatDay, purgeExpiredArchives, listArchivedTenants, dateKeyForTimestamp, type ArchivedMetaMessage } from '@/lib/metaWhatsappArchive';

const TIME_BUDGET_MS = 240_000;
const MAX_MESSAGES_PER_RUN = 5000; // caps each run so a large backlog can't time out; picked up again next run

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const todayCutoff = new Date(new Date().toISOString().slice(0, 10));

  try {
    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();
    const Lead = getLead();

    const messages = await WhatsAppMessage.find({
      provider: 'meta',
      $or: [
        { sentAt: { $lt: todayCutoff } },
        { sentAt: { $exists: false }, createdAt: { $lt: todayCutoff } },
      ],
    })
      .sort({ sentAt: 1, createdAt: 1 })
      .limit(MAX_MESSAGES_PER_RUN)
      .lean();

    // Batch-resolve each message's owning tenant via its own Lead — never
    // infer ownership from phoneNumber, since the same number can belong to
    // different tenants' leads across different channels.
    const leadIds = Array.from(new Set(messages.map((m: any) => String(m.leadId || '')).filter(Boolean)));
    const leads = leadIds.length
      ? await Lead.find({ _id: { $in: leadIds } }, { assignedToUserId: 1, createdByUserId: 1 }).lean()
      : [];
    const ownerByLeadId = new Map(
      leads.map((l: any) => [String(l._id), l.assignedToUserId || l.createdByUserId || 'shared'])
    );

    // Bucket: tenantUserId::phoneNumber -> dateKey -> entries
    const buckets = new Map<string, Map<string, { doc: any; archived: ArchivedMetaMessage }[]>>();

    for (const doc of messages as any[]) {
      const tenantUserId = doc.leadId ? ownerByLeadId.get(String(doc.leadId)) || 'shared' : 'shared';
      const bucketKey = `${tenantUserId}::${doc.phoneNumber}`;
      const sentAtDate: Date = doc.sentAt || doc.createdAt || new Date();
      const sentAtSeconds = Math.floor(sentAtDate.getTime() / 1000);
      const dateKey = dateKeyForTimestamp(sentAtSeconds);

      const archived: ArchivedMetaMessage = {
        messageId: doc.waMessageId || String(doc._id),
        leadId: String(doc.leadId || ''),
        direction: doc.direction || 'outbound',
        text: doc.messageContent || (doc.media?.kind ? `[${doc.media.kind}]` : ''),
        messageType: doc.messageType || 'text',
        status: doc.status || 'sent',
        sentAt: sentAtSeconds,
        headerText: doc.headerText || '',
        footerText: doc.footerText || '',
        hasMedia: !!doc.media?.url,
        mediaUrl: doc.media?.url || '',
        mediaKind: doc.media?.kind || '',
        sentByUserId: doc.sentByUserId || '',
      };

      if (!buckets.has(bucketKey)) buckets.set(bucketKey, new Map());
      const byDay = buckets.get(bucketKey)!;
      if (!byDay.has(dateKey)) byDay.set(dateKey, []);
      byDay.get(dateKey)!.push({ doc, archived });
    }

    let bucketsProcessed = 0;
    let messagesArchived = 0;
    let messagesDeleted = 0;
    let errors = 0;
    const processedTenants = new Set<string>();

    for (const [bucketKey, byDay] of buckets) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        console.log('[Meta Chat Archive] Time budget reached, stopping early — remainder picked up next run.');
        break;
      }
      const [tenantUserId, phoneNumber] = bucketKey.split('::');
      processedTenants.add(tenantUserId);

      try {
        for (const [dateKey, entries] of byDay) {
          await archiveChatDay(tenantUserId, phoneNumber, dateKey, entries.map((e) => e.archived));
          const idsToDelete = entries.map((e) => e.doc._id);
          const delResult = await WhatsAppMessage.deleteMany({ _id: { $in: idsToDelete } });
          messagesArchived += entries.length;
          messagesDeleted += delResult.deletedCount || 0;
        }
        bucketsProcessed += 1;
      } catch (bucketErr) {
        errors += 1;
        console.error(`[Meta Chat Archive] Failed to archive bucket ${bucketKey}:`, bucketErr instanceof Error ? bucketErr.message : bucketErr);
      }
    }

    // 1-year final purge — cheap relative to archiving, safe to do every run.
    let purgedFiles = 0;
    let purgedBytes = 0;
    if (Date.now() - startedAt < TIME_BUDGET_MS) {
      const tenants = await listArchivedTenants();
      for (const tenantUserId of tenants) {
        if (Date.now() - startedAt > TIME_BUDGET_MS) break;
        try {
          const result = await purgeExpiredArchives(tenantUserId);
          purgedFiles += result.filesDeleted;
          purgedBytes += result.bytesFreed;
        } catch (purgeErr) {
          console.error(`[Meta Chat Archive] Purge failed for ${tenantUserId}:`, purgeErr instanceof Error ? purgeErr.message : purgeErr);
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
    console.log('[Meta Chat Archive] Run complete:', summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Meta Chat Archive] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
