import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getBunnyQrBroadcastSchedule, patchBunnyQrBroadcastSchedule } from '@/lib/bunnyQrBroadcastScheduleRepository';
import { resolveQrTenantBridge, qrTenantHeaders } from '@/lib/qrTenantBridge';
import { upsertBunnyQrChatActivity, upsertBunnyQrMessage } from '@/lib/bunnyQrRepository';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow up to 5 minutes

function getUserId(decoded: any): string {
  return decoded?.userId || decoded?.username || decoded?.id || 'admincrm';
}

function checkAuth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) return null;
  return decoded;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const decoded = checkAuth(req);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const resolvedParams = await (params as any);
    const id = resolvedParams.id;
    const userId = getUserId(decoded);

    // 1. Fetch Schedule
    const schedule = await getBunnyQrBroadcastSchedule(id, userId);
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // 2. Resolve WhatsApp Bridge Session
    const session = await resolveQrTenantBridge(schedule.userId, schedule.sessionKey);
    if (!session) {
      return NextResponse.json(
        { error: 'No connected WhatsApp session found for this user. Please reconnect QR code.' },
        { status: 400 }
      );
    }

    // 3. Verify Bridge Health
    const statusRes = await fetch(`${session.url}/status`, {
      headers: qrTenantHeaders(session),
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    const statusData = await statusRes?.json().catch(() => null);
    const isConnected = statusData?.connected === true || statusData?.status === 'connected';

    if (!isConnected) {
      return NextResponse.json(
        { error: 'WhatsApp is currently not connected on the bridge. Please check QR connection.' },
        { status: 503 }
      );
    }

    // 4. Determine Targets
    const recipients: string[] = Array.isArray(schedule.recipientChatIds) && schedule.recipientChatIds.length > 0
      ? schedule.recipientChatIds
      : (Array.isArray(schedule.groupIds) ? schedule.groupIds : []);

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No groups or recipients in this schedule' }, { status: 400 });
    }

    const messageText = schedule.messageText || '';
    const mediaUrls = Array.isArray(schedule.mediaUrls) ? schedule.mediaUrls : [];
    const hasMedia = mediaUrls.length > 0;

    let sent = 0;
    let failed = 0;
    const newlySentIds: string[] = [];
    const errors: string[] = [];

    console.log(`[QR Broadcast Send-Now] Starting immediate send of schedule "${schedule.name}" to ${recipients.length} recipients`);

    for (let i = 0; i < recipients.length; i++) {
      const chatId = recipients[i];

      // Delay between groups: 3-5 seconds to protect account
      if (i > 0) {
        const delayMs = 3000 + Math.floor(Math.random() * 2000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      try {
        let sendOk = false;
        let waMessageId: string | undefined;

        if (hasMedia) {
          const mediaUrl = mediaUrls[0];
          const res = await fetch(`${session.url}/send`, {
            method: 'POST',
            headers: qrTenantHeaders(session),
            body: JSON.stringify({
              to: chatId,
              type: 'media',
              media: mediaUrl,
              caption: messageText,
            }),
            signal: AbortSignal.timeout(45000),
          });
          const resData = await res.json().catch(() => ({}));
          sendOk = res.ok && resData?.success !== false;
          waMessageId = resData?.id || resData?.messageId || resData?.key?.id;
          if (!sendOk) {
            errors.push(`${chatId}: ${resData?.error || `HTTP ${res.status}`}`);
          }
        } else {
          const res = await fetch(`${session.url}/send`, {
            method: 'POST',
            headers: qrTenantHeaders(session),
            body: JSON.stringify({
              to: chatId,
              type: 'text',
              message: messageText,
            }),
            signal: AbortSignal.timeout(45000),
          });
          const resData = await res.json().catch(() => ({}));
          sendOk = res.ok && resData?.success !== false;
          waMessageId = resData?.id || resData?.messageId || resData?.key?.id;
          if (!sendOk) {
            errors.push(`${chatId}: ${resData?.error || `HTTP ${res.status}`}`);
          }
        }

        if (sendOk) {
          sent++;
          newlySentIds.push(chatId);
          console.log(`[QR Broadcast Send-Now] ✓ Sent to ${chatId} (${i + 1}/${recipients.length})`);

          // Record in messages & chat activity
          try {
            const now = new Date();
            const nowSeconds = Math.floor(now.getTime() / 1000);
            const msgId = waMessageId || `broadcast-${schedule._id}-${chatId.replace(/\D/g, '')}-${Date.now()}`;
            await upsertBunnyQrMessage({
              userId: schedule.userId,
              connectedPhone: session.connectedPhone,
              chatJid: chatId,
              messageId: msgId,
              direction: 'outbound',
              fromMe: true,
              text: messageText || (hasMedia ? '[media]' : ''),
              type: hasMedia ? 'image' : 'text',
              participant: '',
              pushName: '',
              timestamp: nowSeconds,
              status: 1,
              hasMedia,
              mediaUrl: hasMedia ? mediaUrls[0] : '',
              mediaMimetype: '',
              mediaFileName: '',
              metadata: { sessionKey: session.sessionKey, tenantId: session.tenantId, scheduleId: String(schedule._id) },
              createdAt: now,
              updatedAt: now,
            });

            await upsertBunnyQrChatActivity({
              userId: schedule.userId,
              connectedPhone: session.connectedPhone,
              chatJid: chatId,
              isGroup: chatId.endsWith('@g.us'),
              lastMessage: messageText || (hasMedia ? '[media]' : ''),
              lastMessageTime: now,
              lastMessageFromMe: true,
              conversationTimestamp: nowSeconds,
              name: chatId,
              pinned: false,
              archived: false,
              profilePicUrl: '',
              unreadCount: 0,
              createdAt: now,
              updatedAt: now,
            });
          } catch (storageErr) {
            console.warn('[QR Broadcast Send-Now] Non-fatal chat activity record error:', storageErr);
          }
        } else {
          failed++;
          console.warn(`[QR Broadcast Send-Now] ✗ Failed sending to ${chatId}`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`${chatId}: ${err?.message || 'Network send error'}`);
        console.error(`[QR Broadcast Send-Now] Exception sending to ${chatId}:`, err);
      }
    }

    // 5. Update Schedule metadata
    const now = new Date();
    await patchBunnyQrBroadcastSchedule(String(schedule._id), {
      lastRunDate: now,
      sentRecipientChatIds: newlySentIds,
      'stats.totalSent': (schedule.stats?.totalSent || 0) + sent,
      'stats.totalFailed': (schedule.stats?.totalFailed || 0) + failed,
      'stats.totalAttempted': (schedule.stats?.totalAttempted || 0) + recipients.length,
      lastError: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
      lastErrorAt: errors.length > 0 ? now : null,
    });

    return NextResponse.json({
      success: true,
      message: `Broadcast finished: ${sent} sent, ${failed} failed across ${recipients.length} group(s).`,
      sent,
      failed,
      total: recipients.length,
      errors: errors.slice(0, 5),
    });
  } catch (error: any) {
    console.error('[QR Broadcast Send-Now API] Fatal Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while sending broadcast' },
      { status: 500 }
    );
  }
}
