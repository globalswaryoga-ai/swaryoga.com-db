/**
 * QR Drip Sequence Processor (cron, every minute)
 *
 * Sends due drip-sequence steps through each tenant's own QR bridge session,
 * honoring the shared QR safety rails: the 5AM–10PM IST send window, the
 * 150/day + 15/hr per-tenant rate caps, and the opt-out list. Stop-on-reply
 * is enforced by the QR webhook (it stops enrollments when the contact writes
 * back); this processor additionally stops anyone who has opted out.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getQrDripSequence, getQrDripEnrollment } from '@/lib/schemas/enterpriseSchemas';
import { computeStepSendAt } from '@/lib/qrDrip';
import { isOptedOut } from '@/lib/qrOptOut';
import { reserveSendSlot } from '@/lib/qrSendRateLimit';
import { isQRSendAllowed, getCurrentISTTime } from '@/lib/qrTimeGuard';
import { resolveQrBridgeSession, callQrBridge, logQrOutboundMessage } from '@/lib/qrSpecialSend';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const BATCH_LIMIT = 50;
const RETRY_DELAY_MS = 30 * 60 * 1000; // bridge failure → retry in 30 min

export async function GET(req: NextRequest) {
  try {
    const rawAuth = req.headers.get('authorization') || '';
    const cronSecret = rawAuth.replace(/^Bearer\s+/i, '').trim() || req.nextUrl.searchParams.get('secret') || '';
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isQRSendAllowed()) {
      return NextResponse.json({
        success: true,
        processed: 0,
        note: `Outside send window (5:00 AM – 10:00 PM IST), now ${getCurrentISTTime()} — drips resume at 5 AM`,
      });
    }

    await connectDB();
    const QrDripSequence = getQrDripSequence();
    const QrDripEnrollment = getQrDripEnrollment();

    const due: any[] = await QrDripEnrollment.find({ status: 'active', nextSendAt: { $lte: new Date() } })
      .sort({ nextSendAt: 1 })
      .limit(BATCH_LIMIT)
      .lean();

    if (due.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const seqCache = new Map<string, any>();
    const sessionCache = new Map<string, any>();
    const results: any[] = [];

    for (const enrollment of due) {
      const outcome: any = { enrollmentId: String(enrollment._id), phone: enrollment.phone };
      try {
        // Sequence (cached per tick)
        const seqKey = String(enrollment.sequenceId);
        if (!seqCache.has(seqKey)) {
          seqCache.set(seqKey, await QrDripSequence.findById(enrollment.sequenceId).lean());
        }
        const seq: any = seqCache.get(seqKey);

        if (!seq) {
          await QrDripEnrollment.updateOne({ _id: enrollment._id }, { $set: { status: 'stopped', stoppedReason: 'sequence_deleted' } });
          outcome.status = 'stopped_sequence_deleted';
          results.push(outcome);
          continue;
        }
        if (!seq.active) {
          // Paused sequence — check again in an hour without dropping the enrollee.
          await QrDripEnrollment.updateOne({ _id: enrollment._id }, { $set: { nextSendAt: new Date(Date.now() + 60 * 60 * 1000) } });
          outcome.status = 'sequence_paused';
          results.push(outcome);
          continue;
        }

        const step = seq.steps?.[enrollment.currentStep];
        if (!step) {
          await QrDripEnrollment.updateOne({ _id: enrollment._id }, { $set: { status: 'completed' } });
          outcome.status = 'completed';
          results.push(outcome);
          continue;
        }

        // Opt-out compliance
        if (await isOptedOut(enrollment.userId, enrollment.phone)) {
          await QrDripEnrollment.updateOne({ _id: enrollment._id }, { $set: { status: 'stopped', stoppedReason: 'opted_out' } });
          outcome.status = 'stopped_opted_out';
          results.push(outcome);
          continue;
        }

        // Rate caps (shared with broadcasts/automations — 150/day, 15/hr)
        const slot = await reserveSendSlot(enrollment.userId);
        if (!slot.allowed) {
          await QrDripEnrollment.updateOne({ _id: enrollment._id }, { $set: { nextSendAt: slot.resetAt } });
          outcome.status = `deferred_${slot.reason}`;
          results.push(outcome);
          continue;
        }

        // Tenant bridge session (cached per tick)
        if (!sessionCache.has(enrollment.userId)) {
          sessionCache.set(enrollment.userId, await resolveQrBridgeSession(enrollment.userId));
        }
        const session = sessionCache.get(enrollment.userId);
        if (!session?.hasOwnBridge) {
          await QrDripEnrollment.updateOne(
            { _id: enrollment._id },
            { $set: { nextSendAt: new Date(Date.now() + RETRY_DELAY_MS), lastError: 'No isolated bridge session' } }
          );
          outcome.status = 'deferred_no_session';
          results.push(outcome);
          continue;
        }

        const sendResult = await callQrBridge(session, enrollment.userId, '/send', {
          to: enrollment.chatJid || `${enrollment.phone}@s.whatsapp.net`,
          type: 'text',
          message: step.messageText,
        });

        if (!sendResult.ok || sendResult.data?.success === false) {
          const errMsg = sendResult.data?.error || `Bridge returned ${sendResult.status}`;
          await QrDripEnrollment.updateOne(
            { _id: enrollment._id },
            { $set: { nextSendAt: new Date(Date.now() + RETRY_DELAY_MS), lastError: errMsg } }
          );
          outcome.status = 'send_failed_retry_scheduled';
          outcome.error = errMsg;
          results.push(outcome);
          continue;
        }

        const messageId = sendResult.data?.messageId || sendResult.data?.id || '';
        await logQrOutboundMessage({
          userId: enrollment.userId,
          session,
          chatJid: enrollment.chatJid || `${enrollment.phone}@s.whatsapp.net`,
          messageId,
          text: step.messageText,
          type: 'text',
        });

        const nextStepIndex = enrollment.currentStep + 1;
        const nextStep = seq.steps?.[nextStepIndex];
        if (nextStep) {
          await QrDripEnrollment.updateOne(
            { _id: enrollment._id },
            {
              $set: {
                currentStep: nextStepIndex,
                nextSendAt: computeStepSendAt(new Date(enrollment.enrolledAt), nextStep),
                lastError: '',
              },
              $inc: { sentCount: 1 },
            }
          );
          outcome.status = 'sent';
          outcome.nextStep = nextStepIndex;
        } else {
          await QrDripEnrollment.updateOne(
            { _id: enrollment._id },
            { $set: { status: 'completed', lastError: '' }, $inc: { sentCount: 1 } }
          );
          outcome.status = 'sent_and_completed';
        }
        results.push(outcome);
      } catch (err: any) {
        console.error('[QR Drip] Enrollment processing error:', err);
        await QrDripEnrollment.updateOne(
          { _id: enrollment._id },
          { $set: { nextSendAt: new Date(Date.now() + RETRY_DELAY_MS), lastError: err?.message || 'Unknown error' } }
        ).catch(() => {});
        outcome.status = 'error_retry_scheduled';
        outcome.error = err?.message;
        results.push(outcome);
      }
    }

    const sent = results.filter((r) => r.status === 'sent' || r.status === 'sent_and_completed').length;
    console.log(`[QR Drip] Tick done: ${sent} sent of ${due.length} due`);
    return NextResponse.json({ success: true, processed: due.length, sent, results });
  } catch (error) {
    console.error('[QR Drip] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
