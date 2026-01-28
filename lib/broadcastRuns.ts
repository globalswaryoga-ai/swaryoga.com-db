import { connectDB } from '@/lib/db';
import { ConsentManager } from '@/lib/consentManager';
import { RateLimitManager } from '@/lib/rateLimitManager';
import { BroadcastRun, BroadcastRunMessage, Lead, WhatsAppMessage, WhatsAppTemplate } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

export type BroadcastRunsProcessResult = {
  scannedRuns: number;
  executedRuns: number;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  runResults: Array<{ runId: string; status: 'ok' | 'error'; attempted: number; sent: number; failed: number; skipped: number; error?: string }>;
};

async function markRunStats(runId: any) {
  const counts = await BroadcastRunMessage.aggregate([
    { $match: { runId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const map = new Map<string, number>();
  counts.forEach((c: any) => map.set(String(c._id), Number(c.count || 0)));

  const pending = (map.get('pending') || 0) + (map.get('sending') || 0);
  const sent = map.get('sent') || 0;
  const failed = map.get('failed') || 0;
  const skipped = map.get('skipped') || 0;
  const total = pending + sent + failed + skipped;

  await BroadcastRun.updateOne(
    { _id: runId },
    {
      $set: {
        'stats.total': total,
        'stats.pending': pending,
        'stats.sent': sent,
        'stats.failed': failed,
        'stats.skipped': skipped,
        updatedAt: new Date(),
      },
    }
  );

  return { total, pending, sent, failed, skipped };
}

export async function processDueBroadcastRuns(options?: {
  now?: Date;
  runLimit?: number;
  perRunMessageLimit?: number;
}): Promise<BroadcastRunsProcessResult> {
  await connectDB();

  const now = options?.now || new Date();
  const runLimit = Math.min(Math.max(1, options?.runLimit ?? 10), 50);
  const perRunMessageLimit = Math.min(Math.max(1, options?.perRunMessageLimit ?? 200), 1000);

  const due = await BroadcastRun.find({
    status: { $in: ['draft', 'scheduled', 'running'] },
    $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: null }, { scheduledAt: { $lte: now } }],
  })
    .sort({ scheduledAt: 1, createdAt: 1 })
    .limit(runLimit)
    .lean();

  const result: BroadcastRunsProcessResult = {
    scannedRuns: due.length,
    executedRuns: 0,
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    runResults: [],
  };

  for (const run of due) {
    const runId = String((run as any)._id);
    const stat: BroadcastRunsProcessResult['runResults'][number] = {
      runId,
      status: 'ok',
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: undefined,
    };

    try {
      // Move to running state if not already.
      await BroadcastRun.updateOne(
        { _id: (run as any)._id, status: { $in: ['draft', 'scheduled', 'running'] } },
        { $set: { status: 'running', startedAt: (run as any).startedAt || now, updatedAt: now }, $unset: { lastError: 1 } }
      );

      // Load template
      const templateId = String((run as any).templateId || '').trim();
      const template = templateId ? await WhatsAppTemplate.findById(templateId).lean() : null;
      if (!template) {
        throw new Error('Template not found for run');
      }

      // Fetch pending messages
      const pending = await BroadcastRunMessage.find({ runId: (run as any)._id, status: 'pending' })
        .sort({ createdAt: 1 })
        .limit(perRunMessageLimit)
        .lean();

      if (pending.length === 0) {
        const counts = await markRunStats((run as any)._id);
        if (counts.pending === 0) {
          await BroadcastRun.updateOne(
            { _id: (run as any)._id },
            { $set: { status: 'completed', completedAt: now, updatedAt: now } }
          );
        }
        result.runResults.push(stat);
        continue;
      }

      result.executedRuns++;

      // Best-effort createdBy id label for rate-limit.
      const createdBy = String((run as any).createdByUserId || 'broadcast');

      for (const item of pending) {
        const leadId = String((item as any).leadId || '').trim();
        const to = normalizePhone(String((item as any).phoneNumber || ''));

        if (!to || !leadId) {
          await BroadcastRunMessage.updateOne({ _id: (item as any)._id }, { $set: { status: 'skipped', failureReason: 'Missing phone/leadId', updatedAt: now } });
          stat.skipped++;
          result.skipped++;
          continue;
        }

        // Consent / opt-out compliance
        const compliance = await ConsentManager.validateCompliance(to);
        if (!compliance.compliant) {
          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            { $set: { status: 'skipped', failureReason: compliance.reason || 'Not compliant', updatedAt: now } }
          );
          stat.skipped++;
          result.skipped++;
          continue;
        }

        // Rate limit guard
        const canSend = await RateLimitManager.canSendMessage(createdBy, to);
        if (!canSend.allowed) {
          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            { $set: { status: 'failed', failureReason: canSend.reason || 'Rate limit reached', updatedAt: now } }
          );
          stat.failed++;
          result.failed++;
          continue;
        }

        // Mark as sending
        await BroadcastRunMessage.updateOne({ _id: (item as any)._id, status: 'pending' }, { $set: { status: 'sending', updatedAt: now } });

        // Route-level API stores WhatsAppMessage; we do it here to fully control tracking.
        const msg = await WhatsAppMessage.create({
          leadId: leadId,
          phoneNumber: to,
          direction: 'outbound',
          messageType: 'template',
          templateId: (template as any)._id,
          templateVariables: {},
          messageContent: String((template as any).templateContent || '').trim() || '(template)',
          status: 'queued',
          sentAt: now,
          provider: 'pending',
          metadata: {
            broadcast: { runId: String((run as any)._id) },
            template: {
              templateName: (template as any).templateName,
              headerFormat: (template as any).headerFormat,
              headerContent: (template as any).headerContent,
              footerText: (template as any).footerText,
              buttons: Array.isArray((template as any).buttons) ? (template as any).buttons : [],
              headerMedia: (template as any).headerMedia || null,
            },
          },
        });

        stat.attempted++;
        result.attempted++;

        try {
          // Use the provider specified in the broadcast run ('meta' or 'qr')
          const runProvider = String((run as any).provider || 'meta');
          
          let apiResult: any;
          
          if (runProvider === 'qr') {
            // Send via QR Bridge using /send endpoint (same as single message send)
            const bridgeUrl = (process.env.WHATSAPP_BRIDGE_HTTP_URL || process.env.WHATSAPP_BRIDGE_URL || 'http://52.91.198.23:3333').trim();
            const bridgeSecret = (process.env.WHATSAPP_WEB_BRIDGE_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024').trim();
            
            // Build template message content with header, body, footer
            // Clean templateContent - remove [QUICK_REPLY] markers and button lines
            const rawContent = String((template as any).templateContent || '').trim();
            const templateContent = rawContent
              .replace(/•\s*\[QUICK_REPLY\][^\n]*/gi, '') // Remove • [QUICK_REPLY] lines
              .replace(/\[QUICK_REPLY\][^\n]*/gi, '')     // Remove [QUICK_REPLY] lines
              .replace(/\n{3,}/g, '\n\n')                  // Collapse multiple newlines
              .trim();
            
            const headerText = (template as any).headerContent ? String((template as any).headerContent).trim() : '';
            const footerText = (template as any).footerText ? String((template as any).footerText).trim() : '';
            const buttons = Array.isArray((template as any).buttons) ? (template as any).buttons : [];
            
            // Format message: Body only (header/footer already in template body for QR)
            let fullMessage = templateContent;
            
            // Add button text as clickable format (QR can't send native buttons)
            const buttonTexts = buttons
              .filter((b: any) => b.title)
              .map((b: any) => `📌 ${b.title}`)
              .join('\n');
            if (buttonTexts) fullMessage += `\n\n${buttonTexts}`;
            
            // Check for header media (image)
            const headerMedia = (template as any).headerMedia;
            const mediaUrl = headerMedia?.url || headerMedia?.link || null;
            const hasImage = mediaUrl && headerMedia?.kind === 'image';
            
            console.log('[Broadcast QR] Sending to:', to, 'via', bridgeUrl);
            console.log('[Broadcast QR] Has image:', hasImage, 'URL:', mediaUrl?.substring(0, 50));
            
            // Build payload matching single send endpoint format
            const bridgePayload: any = {
              to: to, // Use plain number, not @c.us format
              message: hasImage ? '' : fullMessage,
              type: hasImage ? 'media' : 'text',
            };
            
            if (hasImage) {
              bridgePayload.media = mediaUrl;
              bridgePayload.caption = fullMessage;
            }
            
            console.log('[Broadcast QR] Payload:', JSON.stringify(bridgePayload, null, 2).substring(0, 500));
            
            const bridgeResponse = await fetch(`${bridgeUrl}/send`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-bridge-secret': bridgeSecret,
              },
              body: JSON.stringify(bridgePayload),
              cache: 'no-store',
            });
            
            if (!bridgeResponse.ok) {
              const errText = await bridgeResponse.text().catch(() => '');
              console.error('[Broadcast QR] Bridge error:', bridgeResponse.status, errText);
              throw new Error(`QR Bridge error: ${bridgeResponse.status} - ${errText}`);
            }
            
            const bridgeData = await bridgeResponse.json();
            console.log('[Broadcast QR] Bridge response:', bridgeData);
            apiResult = {
              waMessageId: bridgeData?.id || bridgeData?.messageId || bridgeData?.key?.id || `qr_${Date.now()}`,
              raw: { provider: 'qr' },
            };
          } else {
            // Send via Meta Cloud API (default)
            const { buildCloudTemplateSendInput, sendWhatsAppTemplate, sendWhatsAppText } = await import('@/lib/whatsapp');

            try {
              const cloudInput = buildCloudTemplateSendInput(template, to);
              console.log('[Broadcast Meta] Template:', (template as any).templateName);
              console.log('[Broadcast Meta] Cloud input:', JSON.stringify(cloudInput, null, 2));
              apiResult = await sendWhatsAppTemplate(cloudInput);
              console.log('[Broadcast Meta] Send result:', apiResult);
            } catch (templateErr: any) {
              console.error('[Broadcast Meta] Template send failed:', templateErr?.message, templateErr?.data);
              // Don't fall back to text - throw the error
              throw templateErr;
            }
          }

          await WhatsAppMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: 'sent',
                waMessageId: apiResult.waMessageId,
                provider: apiResult?.raw?.provider || 'sent',
                updatedAt: new Date(),
              },
              $unset: { failureReason: 1, nextRetryAt: 1 },
            }
          );

          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            {
              $set: {
                status: 'sent',
                waMessageId: apiResult.waMessageId,
                provider: apiResult?.raw?.provider || 'sent',
                whatsappMessageId: msg._id,
                sentAt: now,
                updatedAt: new Date(),
              },
              $unset: { failureReason: 1 },
            }
          );

          await RateLimitManager.incrementCount(createdBy, to);

          stat.sent++;
          result.sent++;
        } catch (err) {
          const m = err instanceof Error ? err.message : 'WhatsApp send failed';

          await WhatsAppMessage.updateOne(
            { _id: msg._id },
            {
              $set: {
                status: 'failed',
                failureReason: String(m),
                updatedAt: new Date(),
              },
            }
          );

          await BroadcastRunMessage.updateOne(
            { _id: (item as any)._id },
            {
              $set: {
                status: 'failed',
                failureReason: String(m),
                whatsappMessageId: msg._id,
                updatedAt: new Date(),
              },
            }
          );

          stat.failed++;
          result.failed++;
        }
      }

      // refresh run stats and maybe complete
      const counts = await markRunStats((run as any)._id);
      if (counts.pending === 0) {
        await BroadcastRun.updateOne(
          { _id: (run as any)._id },
          { $set: { status: 'completed', completedAt: new Date(), updatedAt: new Date() } }
        );
      }

      result.runResults.push(stat);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Broadcast run error';
      stat.status = 'error';
      stat.error = msg;
      result.runResults.push(stat);

      await BroadcastRun.updateOne(
        { _id: (run as any)._id },
        { $set: { status: 'failed', lastError: String(msg), updatedAt: new Date() } }
      );
    }
  }

  return result;
}
