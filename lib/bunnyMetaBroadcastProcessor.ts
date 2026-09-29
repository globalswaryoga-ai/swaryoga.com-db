import { buildCloudTemplateSendInput, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';
import { upsertBunnyMetaMessage, updateBunnyMetaMessage } from '@/lib/bunnyMetaWhatsAppRepository';
import {
  broadcastRunFind,
  broadcastRunFindOne,
  broadcastRunMessageFind,
  broadcastRunMessageUpdateOne,
  broadcastRunUpdateOne,
  getTemplateById,
  markRunStatsBunny,
} from '@/lib/bunnyBroadcastRepository';

export type BunnyMetaBroadcastResult = {
  scannedRuns: number;
  executedRuns: number;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  runResults: Array<{ runId: string; status: 'ok' | 'error'; attempted: number; sent: number; failed: number; skipped: number; error?: string }>;
};

type RunResult = BunnyMetaBroadcastResult['runResults'][number];

function result(): BunnyMetaBroadcastResult {
  return { scannedRuns: 0, executedRuns: 0, attempted: 0, sent: 0, failed: 0, skipped: 0, runResults: [] };
}

/** Process Meta broadcasts using Bunny SQL as the run/message source of truth. */
export async function processDueBunnyMetaBroadcasts(options?: {
  now?: Date;
  runLimit?: number;
  perRunMessageLimit?: number;
  runId?: string;
}): Promise<BunnyMetaBroadcastResult> {
  const now = options?.now || new Date();
  const output = result();
  const runs = options?.runId
    ? [await broadcastRunFindOne(options.runId)].filter(Boolean)
    : await broadcastRunFind({ status: ['draft', 'scheduled', 'running'], scheduledAtLte: now }, { limit: Math.min(Math.max(options?.runLimit ?? 5, 1), 50) });

  output.scannedRuns = runs.length;
  for (const run of runs) {
    const runId = String(run._id);
    const stat: RunResult = { runId, status: 'ok', attempted: 0, sent: 0, failed: 0, skipped: 0 };
    try {
      if (String(run.provider || 'meta') !== 'meta') {
        output.runResults.push(stat);
        continue;
      }
      if (run.scheduledAt && new Date(run.scheduledAt).getTime() > now.getTime()) {
        output.runResults.push(stat);
        continue;
      }

      const template = await getTemplateById(String(run.templateId || ''));
      if (!template) throw new Error('Template not found for run');
      await broadcastRunUpdateOne(runId, { status: 'running', startedAt: run.startedAt || now });

      const pending = await broadcastRunMessageFind({ runId, status: 'pending' }, { limit: Math.min(Math.max(options?.perRunMessageLimit ?? 50, 1), 1000) });
      if (!pending.length) {
        const stats = await markRunStatsBunny(runId);
        await broadcastRunUpdateOne(runId, { status: stats.pending ? 'running' : 'completed', completedAt: stats.pending ? undefined : now, stats });
        output.runResults.push(stat);
        continue;
      }

      output.executedRuns++;
      const creds = await getMetaCredentialsForTenant(String(run.createdByUserId || '')) || undefined;
      for (const item of pending) {
        const messageId = String(item._id);
        const claimed = await broadcastRunMessageUpdateOne(messageId, { status: 'sending' });
        if (!claimed) continue;
        stat.attempted++;
        output.attempted++;

        try {
          const sendInput = buildCloudTemplateSendInput(template, String(item.phoneNumber || ''));
          const apiResult = await sendWhatsAppTemplate(sendInput, creds);
          const waMessageId = String(apiResult.waMessageId || '');
          const metaMessage = await upsertBunnyMetaMessage({
            documentId: `broadcast_${runId}_${messageId}`,
            leadId: item.leadId || undefined,
            phoneNumber: item.phoneNumber,
            direction: 'outbound',
            messageType: 'template',
            messageContent: String(template.templateContent || '(template)'),
            status: 'sent',
            waMessageId,
            sentAt: now.toISOString(),
            senderNumber: creds?.phoneNumber,
            provider: 'meta',
            sentByUserId: run.createdByUserId,
            metadata: {
              broadcast: { runId },
              templateId: run.templateId,
              template: {
                templateName: template.templateName,
                headerFormat: template.headerFormat,
                headerContent: template.headerContent,
                headerMedia: template.headerMedia || (template.imageFile?.url ? { kind: 'image', url: template.imageFile.url } : null),
              },
            },
          });
          await updateBunnyMetaMessage(metaMessage.documentId, { status: 'sent', waMessageId, provider: 'meta' });
          await broadcastRunMessageUpdateOne(messageId, { status: 'sent', waMessageId, sentAt: now });
          stat.sent++;
          output.sent++;
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          await broadcastRunMessageUpdateOne(messageId, { status: 'failed', failureReason: reason.slice(0, 500) });
          stat.failed++;
          output.failed++;
        }
      }

      const stats = await markRunStatsBunny(runId);
      await broadcastRunUpdateOne(runId, {
        status: stats.pending === 0 ? 'completed' : 'scheduled',
        completedAt: stats.pending === 0 ? now : undefined,
        stats,
      });
    } catch (error) {
      stat.status = 'error';
      stat.error = error instanceof Error ? error.message : String(error);
      await broadcastRunUpdateOne(runId, { status: 'failed', lastError: stat.error });
    }
    output.runResults.push(stat);
  }
  return output;
}
