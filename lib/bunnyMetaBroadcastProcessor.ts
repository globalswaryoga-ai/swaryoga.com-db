import { buildCloudTemplateSendInput, sendWhatsAppTemplate } from '@/lib/whatsapp';
import { getMetaCredentialsForTenant } from '@/lib/whatsappAccounts';
import { upsertBunnyMetaMessage } from '@/lib/bunnyMetaWhatsAppRepository';
import { bunnyExecute } from '@/lib/bunnyDatabase';
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
      if (run.status === 'cancelled' || run.reportFolder === 'deleted') {
        output.runResults.push(stat);
        continue;
      }
      if (run.scheduledAt && new Date(run.scheduledAt).getTime() > now.getTime()) {
        output.runResults.push(stat);
        continue;
      }

      const currentTemplate = await getTemplateById(String(run.templateId || ''));
      if (!currentTemplate) throw new Error('Template not found for run');
      const isOfferDocument = runId.startsWith('offer-doc_');
      const recordingAccess = run.templateSnapshot?.recordingAccess;
      if (isOfferDocument && (String(currentTemplate.status).toLowerCase() !== 'approved' || String(currentTemplate.headerFormat).toUpperCase() !== 'DOCUMENT')) throw new Error('Offer delivery template is no longer an approved document template');
      const template = recordingAccess
        ? { ...currentTemplate, variables: run.templateSnapshot.variables }
        : isOfferDocument
        ? { ...currentTemplate, headerMedia: run.templateSnapshot?.headerMedia, headerContent: run.templateSnapshot?.headerContent }
        : currentTemplate;
      if (isOfferDocument && !template.headerMedia?.url) throw new Error('Offer delivery has no saved document URL');
      if (recordingAccess) {
        const { getCohort, listAttendance, listStudents } = await import('@/lib/workshopBunnyRepository');
        const { recordingAccessPolicy, recordingEligibility } = await import('@/lib/workshopRecordingAccess');
        const cohort = await getCohort(recordingAccess.cohortId);
        if (!cohort || String(cohort.createdByUserId) !== String(run.createdByUserId)) throw new Error('Recording workshop ownership changed.');
        const policy = recordingAccessPolicy(cohort.metadata?.recordingAccess);
        const [students, attendance] = await Promise.all([listStudents(cohort._id, true), listAttendance(cohort._id)]);
        if (!policy.enabled || ![String(run.templateId), String(currentTemplate.templateName)].includes(policy.templateId) ||
            !students.some(s => s._id === recordingAccess.studentId) ||
            !recordingEligibility(attendance.find(a => a.studentId === recordingAccess.studentId && a.classDate === recordingAccess.classDate), policy.minimumMinutes).eligible)
          throw new Error('Recording access is no longer eligible; administrator review required.');
        if (String(currentTemplate.status).toUpperCase() !== 'APPROVED') throw new Error('Recording template is no longer approved.');
      }
      await broadcastRunUpdateOne(runId, { status: 'running', startedAt: run.startedAt || now });

      const pending = await broadcastRunMessageFind({ runId, status: 'pending' }, { limit: Math.min(Math.max(options?.perRunMessageLimit ?? 50, 1), 1000) });
      if (!pending.length) {
        const stats = await markRunStatsBunny(runId);
        await broadcastRunUpdateOne(runId, { status: stats.pending ? 'running' : 'completed', completedAt: stats.pending ? undefined : now, stats });
        output.runResults.push(stat);
        continue;
      }

      output.executedRuns++;
      const owner = String(run.createdByUserId || '');
      const creds = await getMetaCredentialsForTenant(owner) || undefined;
      if (owner && !['admin', 'admincrm', 'system'].includes(owner) && !creds) {
        throw new Error('Connect this CRM account to its own Meta WhatsApp number before sending');
      }
      if (creds?.phoneNumber) await broadcastRunUpdateOne(runId, { senderNumber: creds.phoneNumber });
      for (const item of pending) {
        const messageId = String(item._id);
        const claimed = await broadcastRunMessageUpdateOne(messageId, { status: 'sending' });
        if (!claimed) continue;
        stat.attempted++;
        output.attempted++;

        let acceptedMessageId = '';
        try {
          // Prevent duplicate template sending within 24 hours
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const existingCheck = await bunnyExecute({
            sql: `SELECT document_id FROM meta_messages_sql WHERE phone_number = ? AND direction = 'outbound'
              AND json_extract(data_json, '$.metadata.templateId') = ?
              AND json_extract(data_json, '$.sentByUserId') = ?
              AND status != 'failed' AND COALESCE(sent_at, created_at) >= ? LIMIT 1`,
            args: [item.phoneNumber, String(run.templateId), owner, twentyFourHoursAgo]
          });

          if (!recordingAccess && existingCheck.rows && existingCheck.rows.length > 0) {
            await broadcastRunMessageUpdateOne(messageId, { status: 'skipped', failureReason: 'Skipped: Same template already sent in the last 24 hours.' });
            stat.skipped++;
            output.skipped++;
            continue;
          }

          const sendInput = buildCloudTemplateSendInput(template, String(item.phoneNumber || ''));
          if (recordingAccess) sendInput.bodyParams = [String(run.templateSnapshot.variables?.['1'] || '')];
          const apiResult = await sendWhatsAppTemplate(sendInput, creds);
          const waMessageId = String(apiResult.waMessageId || '');
          if (!waMessageId) throw new Error('Meta did not return a WhatsApp message ID.');
          acceptedMessageId = waMessageId;
          await broadcastRunMessageUpdateOne(messageId, { status: 'sent', waMessageId, sentAt: now });
          await upsertBunnyMetaMessage({
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
          if (runId.startsWith('registration_') && !recordingAccess && item.leadId) {
            await bunnyExecute({
              sql: `UPDATE leads_sql SET data_json = json_set(data_json,
                '$.metadata.wtStatus', 'sent', '$.metadata.wtError', NULL,
                '$.metadata.wtLastTemplates', json_patch(COALESCE(json_extract(data_json, '$.metadata.wtLastTemplates'), '{}'), ?))
                WHERE document_id = ?`,
              args: [JSON.stringify({ [template.templateName]: now.toISOString() }), item.leadId],
            });
          }
          stat.sent++;
          output.sent++;
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          if (acceptedMessageId) {
            await broadcastRunMessageUpdateOne(messageId, { status: 'sent', waMessageId: acceptedMessageId, sentAt: now, failureReason: `Sent; CRM history update failed: ${reason}`.slice(0, 500) });
            stat.sent++;
            output.sent++;
            stat.status = 'error';
            stat.error = reason;
            continue;
          }
          await broadcastRunMessageUpdateOne(messageId, { status: 'failed', failureReason: reason.slice(0, 500) });
          if (runId.startsWith('registration_') && item.leadId) {
            await bunnyExecute({
              sql: "UPDATE leads_sql SET data_json = json_set(data_json, '$.metadata.wtStatus', 'failed', '$.metadata.wtError', ?) WHERE document_id = ?",
              args: [reason.slice(0, 500), item.leadId],
            });
          }
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
