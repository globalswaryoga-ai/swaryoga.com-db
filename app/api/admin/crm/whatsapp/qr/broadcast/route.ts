/**
 * QR WhatsApp Broadcast API
 * POST /api/admin/crm/whatsapp/qr/broadcast — Send bulk broadcast (loops /send on bridge)
 * GET  /api/admin/crm/whatsapp/qr/broadcast — List sessions / connection status
 * DELETE /api/admin/crm/whatsapp/qr/broadcast — (no-op, kept for compatibility)
 *
 * Bridge API reality:
 *   /health  — GET health
 *   /sessions — GET all sessions
 *   /send    — POST one message { to, message, type, imageUrl?, buttons? }
 *   NO /broadcast endpoint exists on the bridge.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getLead, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin as checkSuperAdmin } from '@/lib/crm-handlers';
import { getWhatsAppBridgeUrl, getWhatsAppBridgeSecret } from '@/lib/whatsappBridgeConfig';
import { isQRSendAllowed, getQRTimeGuardError, getCurrentISTTime, getNext5AMIST } from '@/lib/qrTimeGuard';
import { calculateVariableGapsWithBreaks, DEFAULT_GAP_STRATEGY } from '@/lib/whatsappGapCalculator';
import { checkRateLimit, reserveSendSlot, DAILY_LIMIT, HOURLY_LIMIT } from '@/lib/qrSendRateLimit';

// ── Human-like message variation ──────────────────────────────────────
// WhatsApp's anti-spam fingerprints identical text sent to many recipients.
// We add a tiny invisible variation (zero-width spaces / trailing space count)
// so each outgoing payload differs slightly. Visible content is unchanged.
const ZW_CHARS = ['​', '‌', '‍', '﻿']; // zero-width space/non-joiner/joiner/BOM
function humanizeMessage(base: string, index: number): string {
  if (!base) return base;
  // Insert 0–2 invisible chars at end + occasional trailing space count
  const zwCount = (index % 3); // 0, 1, or 2
  let suffix = '';
  for (let i = 0; i < zwCount; i++) suffix += ZW_CHARS[Math.floor(Math.random() * ZW_CHARS.length)];
  if (index % 4 === 0) suffix += ' '; // trailing space some of the time
  return base + suffix;
}

export const dynamic = 'force-dynamic';
// Allow up to 60 seconds for bulk sends (Vercel Pro / hobby has 10s; this is best-effort)
export const maxDuration = 60;

// ── helpers ──────────────────────────────────────────────

function authCheck(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  if (!decoded.isAdmin && !decoded.userId && !decoded.username) return null;
  return decoded;
}

async function safeFetch(url: string, options: RequestInit): Promise<{ ok: boolean; data: any; status: number }> {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); }
    catch { data = { error: `Non-JSON from bridge (${res.status}): ${text.slice(0, 200)}` }; }
    return { ok: res.ok, data, status: res.status };
  } catch (err: any) {
    return { ok: false, data: { error: err.message || 'Bridge unreachable' }, status: 503 };
  }
}

/**
 * Find the connected session key for a given userId from the bridge.
 * Falls back to any connected session if userId match not found.
 */
type SessionInfo = { sessionKey: string; tenantId: string };

async function findConnectedSession(
  bridgeUrl: string,
  bridgeSecret: string,
  userId: string
): Promise<SessionInfo | null> {
  const result = await safeFetch(`${bridgeUrl}/sessions`, {
    method: 'GET',
    headers: { 'x-bridge-secret': bridgeSecret },
  });

  if (!result.ok || !Array.isArray(result.data?.sessions)) return null;

  const sessions: any[] = result.data.sessions;
  // Prefer a session owned by this userId that is connected
  const ownConnected = sessions.find(
    (s) => s.userId === userId && s.status === 'connected'
  );
  if (ownConnected) return { sessionKey: String(ownConnected.sessionKey), tenantId: String(ownConnected.tenantId || ownConnected.sessionKey) };

  // Fallback: any connected session
  const anyConnected = sessions.find((s) => s.status === 'connected');
  if (anyConnected) return { sessionKey: String(anyConnected.sessionKey), tenantId: String(anyConnected.tenantId || anyConnected.sessionKey) };

  return null;
}

/**
 * Send a single WhatsApp message via the bridge /send endpoint.
 */
async function sendOne(
  bridgeUrl: string,
  bridgeSecret: string,
  session: SessionInfo,
  to: string,
  message: string,
  imageUrl?: string,
  buttons?: string[]
): Promise<{ success: boolean; error?: string }> {
  // Preserve group IDs (@g.us) intact; only strip non-digits for individual phone numbers
  const toNormalized = to.includes('@g.us') ? to : to.replace(/\D/g, '');

  const bridgeHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-bridge-secret': bridgeSecret,
    'x-session-key': session.sessionKey,
    'x-tenant-id': session.tenantId,   // ← required by bridge for routing
  };

  // Use /send-template for images (same format as cron processor v2 — ensures image+text sends correctly)
  if (imageUrl) {
    const result = await safeFetch(`${bridgeUrl}/send-template`, {
      method: 'POST',
      headers: bridgeHeaders,
      body: JSON.stringify({
        to: toNormalized,
        imageUrl,
        bodyText: message || '',
        footerText: '',
      }),
    });
    if (result.ok && result.data?.success !== false) return { success: true };
    return { success: false, error: result.data?.error || `Bridge status ${result.status}` };
  }

  let payload: any = { to: toNormalized };
  if (buttons && buttons.length > 0) {
    payload.type = 'buttons';
    payload.message = message;
    payload.buttons = buttons;
  } else {
    payload.type = 'text';
    payload.message = message;
  }

  const result = await safeFetch(`${bridgeUrl}/send`, {
    method: 'POST',
    headers: bridgeHeaders,
    body: JSON.stringify(payload),
  });

  if (result.ok && result.data?.success !== false) {
    return { success: true };
  }
  return { success: false, error: result.data?.error || `Bridge status ${result.status}` };
}

// ── POST: send broadcast ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const decoded = authCheck(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ── TIME GUARD: Auto-schedule for 5 AM instead of blocking ──
    if (!isQRSendAllowed()) {
      // Parse body first so we can create a schedule
      let earlyBody: any = {};
      try { earlyBody = await request.clone().json(); } catch { /* ignore */ }
      const sendAt = getNext5AMIST();
      const sendAtIST = new Date(sendAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const startHH = String(sendAtIST.getHours()).padStart(2,'0');
      const startMM = String(sendAtIST.getMinutes()).padStart(2,'0');
      const endHH = String(sendAtIST.getHours() + 1).padStart(2,'0');
      try {
        await connectDB();
        const { getQRBroadcastSchedule } = await import('@/lib/schemas/enterpriseSchemas');
        const QRBroadcastSchedule = getQRBroadcastSchedule();
        const decoded2 = authCheck(request);
        const uid = decoded2 ? (decoded2.userId || decoded2.username || 'admin') : 'admin';
        await QRBroadcastSchedule.create({
          userId: uid,
          tenantId: 'default',
          name: `Auto-queued Broadcast — ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
          messageText: earlyBody.message || '',
          mediaUrls: earlyBody.imageUrl ? [earlyBody.imageUrl] : [],
          recipientChatIds: Array.isArray(earlyBody.recipients) ? earlyBody.recipients : [],
          totalRecipients: Array.isArray(earlyBody.recipients) ? earlyBody.recipients.length : 0,
          isActive: true,
          startTime: `${startHH}:${startMM}`,
          endTime: `${endHH}:${startMM}`,
          timezone: 'Asia/Kolkata',
          frequency: 'once',
          status: 'scheduled',
          createdBy: uid,
        });
      } catch (schedErr) {
        console.error('[qr-broadcast] Failed to auto-schedule:', schedErr);
      }
      return NextResponse.json({
        success: true,
        queued: true,
        sendAt: sendAt.toISOString(),
        message: `📅 Broadcast queued — will be sent at 5:00 AM IST (${getCurrentISTTime()} now)`,
      });
    }

    const superAdmin = checkSuperAdmin(decoded);
    const viewerUserId = getViewerUserId(decoded);

    let body: any;
    try { body = await request.json(); }
    catch { return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 }); }

    const { recipients, message, imageUrl, buttons, recipientType } = body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'Recipients array required' }, { status: 400 });
    }
    if (!message?.trim() && !imageUrl) {
      return NextResponse.json({ success: false, error: 'Message or image required' }, { status: 400 });
    }

    const bridgeUrl = getWhatsAppBridgeUrl();
    const bridgeSecret = getWhatsAppBridgeSecret();

    // Find the connected WhatsApp session (sessionKey + tenantId both needed)
    const session = await findConnectedSession(bridgeUrl, bridgeSecret, viewerUserId);
    if (!session) {
      console.error(`[qr-broadcast] ❌ No connected session found for user=${viewerUserId} at ${bridgeUrl}/sessions`);
      return NextResponse.json({
        success: false,
        error: '❌ WhatsApp is not connected. Please open the QR WhatsApp page and scan the QR code to connect.',
        bridgeUrl: bridgeUrl,
        instruction: 'Visit the QR WhatsApp page → Scan QR code → Connection will establish',
      }, { status: 503 });
    }

    console.log(`[qr-broadcast] ✅ Session: key=${session.sessionKey} tenantId=${session.tenantId} user=${viewerUserId}`);

    // Normalize recipients — preserve group IDs (@g.us), only strip digits for phone numbers
    const isGroupId = (r: string) => String(r).includes('@g.us');
    let filteredRecipients: string[] = recipients.map((r: string) => {
      const s = String(r);
      return isGroupId(s) ? s : s.replace(/\D/g, ''); // keep group IDs intact
    });

    if (!superAdmin && (recipientType || 'people') === 'people') {
      try {
        await connectDB();
        const Lead = getLead();
        const allPhones: string[] = [];
        for (const phone of filteredRecipients) {
          allPhones.push(phone);
          if (phone.startsWith('91') && phone.length === 12) allPhones.push(phone.substring(2));
          else if (phone.length === 10) allPhones.push('91' + phone);
        }
        const ownedLeads = await Lead.find(
          { phoneNumber: { $in: allPhones }, $or: [{ assignedToUserId: viewerUserId }, { createdByUserId: viewerUserId }] },
          { phoneNumber: 1 }
        ).lean();
        const ownedPhones = new Set<string>();
        for (const lead of ownedLeads as any[]) {
          const lp = lead.phoneNumber;
          if (lp) {
            ownedPhones.add(lp);
            if (lp.startsWith('91') && lp.length === 12) ownedPhones.add(lp.substring(2));
            else if (lp.length === 10) ownedPhones.add('91' + lp);
          }
        }
        filteredRecipients = filteredRecipients.filter((p) => ownedPhones.has(p));
        if (filteredRecipients.length === 0) {
          return NextResponse.json({ success: false, error: 'None of the recipients are assigned to you.' }, { status: 403 });
        }
      } catch (err: any) {
        console.error('[qr-broadcast] Lead filter error:', err.message);
        // Don't block on filter error
      }
    }

    // ── HUMAN-LIKE BROADCAST PACING ─────────────────────────────────────
    // Shuffle recipient order so the send pattern isn't deterministic
    for (let i = filteredRecipients.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filteredRecipients[i], filteredRecipients[j]] = [filteredRecipients[j], filteredRecipients[i]];
    }

    // ── RATE LIMIT CHECK: hard caps 200/day, 20/hour ────────────────────
    const rate = await checkRateLimit(viewerUserId);
    if (!rate.allowed) {
      const resetIst = rate.resetAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      return NextResponse.json({
        success: false,
        rateLimited: true,
        reason: rate.reason,
        daySent: rate.daySent,
        hourSent: rate.hourSent,
        dailyLimit: DAILY_LIMIT,
        hourlyLimit: HOURLY_LIMIT,
        error: rate.reason === 'daily_cap'
          ? `🛑 Daily cap of ${DAILY_LIMIT} reached. Resets at ${resetIst} IST.`
          : `🛑 Hourly cap of ${HOURLY_LIMIT} reached (sent ${rate.hourSent} this hour). Try after ${resetIst} IST.`,
      }, { status: 429 });
    }
    // Trim batch so neither cap is breached in this call
    const remainingThisCall = Math.min(rate.dayRemaining, rate.hourRemaining);
    if (filteredRecipients.length > remainingThisCall) {
      console.log(`[qr-broadcast] Trimming batch ${filteredRecipients.length} -> ${remainingThisCall} (day ${rate.daySent}/${DAILY_LIMIT}, hour ${rate.hourSent}/${HOURLY_LIMIT})`);
      filteredRecipients = filteredRecipients.slice(0, remainingThisCall);
    }

    // 120-240s gaps (avg 3 min = 20/hr) + occasional 5-8 min "phone-down" breaks.
    // The bridge /send also adds 2-5s of typing simulation per message.
    const gaps = calculateVariableGapsWithBreaks(filteredRecipients.length, DEFAULT_GAP_STRATEGY);

    console.log(`[qr-broadcast] ▶ Human-paced broadcast to ${filteredRecipients.length} recipients`);
    console.log(`[qr-broadcast]   Pacing target: ~20/hr (avg 3 min gap) + 5-8 min breaks every 7-12 msgs`);

    let sent = 0;
    let failed = 0;
    let abortReason: string | null = null;
    let queuedForCron = 0;
    const errors: string[] = [];
    const messageRecordsToSave: any[] = [];

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    // ── Send only the FIRST recipient synchronously (verification ping). ──
    // Everything else gets auto-queued for the cron processor, which paces
    // messages with the same 120-240s gaps + breaks and respects rate caps.
    // (Vercel's 60s function limit makes synchronous bulk sending impossible
    // at the safe 3-min gap anyway.)
    if (filteredRecipients.length > 0) {
      const firstRecipient = filteredRecipients[0];
      const isGroup = isGroupId(firstRecipient);

      // Reserve a rate-limit slot atomically before the actual send
      const slot = await reserveSendSlot(viewerUserId);
      if (!slot.allowed) {
        const resetIst = slot.resetAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        return NextResponse.json({
          success: false,
          rateLimited: true,
          reason: slot.reason,
          error: slot.reason === 'daily_cap'
            ? `🛑 Daily cap of ${DAILY_LIMIT} reached. Resets ${resetIst} IST.`
            : `🛑 Hourly cap of ${HOURLY_LIMIT} reached. Try after ${resetIst} IST.`,
        }, { status: 429 });
      }

      try {
        const result = await sendOne(
          bridgeUrl, bridgeSecret, session,
          firstRecipient, humanizeMessage(message, 0), imageUrl,
          Array.isArray(buttons) ? buttons.map((b: any) => String(b?.title || b).slice(0, 20)) : undefined
        );
        if (result.success) {
          sent++;
          console.log(`[qr-broadcast] ✅ 1/${filteredRecipients.length} sent to ${firstRecipient} (day ${slot.daySent}/${DAILY_LIMIT}, hour ${slot.hourSent}/${HOURLY_LIMIT})`);
          messageRecordsToSave.push({
            phoneNumber: firstRecipient,
            direction: 'outbound',
            messageContent: message,
            messageType: imageUrl ? 'media' : 'text',
            media: imageUrl ? { kind: 'image', url: imageUrl } : undefined,
            status: 'sent',
            sentByUserId: viewerUserId,
            sentByLabel: viewerUserId,
            provider: 'whatsapp_web_bridge',
            sentAt: new Date(),
            recipientType: isGroup ? 'group' : 'individual',
          });
        } else {
          failed++;
          errors.push(`${firstRecipient}: ${result.error}`);
          const errLower = String(result.error || '').toLowerCase();
          if (
            errLower.includes('forbidden') || errLower.includes('rate') ||
            errLower.includes('banned') || errLower.includes('restricted') ||
            errLower.includes('not-authorized') || errLower.includes('blocked') ||
            errLower.includes('spam')
          ) {
            abortReason = `WhatsApp signalled "${result.error}" — number may be restricted. NOT queueing remainder. Stop broadcasting for 24h.`;
            console.error(`[qr-broadcast] 🚨 ${abortReason}`);
          }
        }
      } catch (err: any) {
        failed++;
        errors.push(`${firstRecipient}: ${err.message}`);
      }
    }

    if (messageRecordsToSave.length > 0) {
      try { await WhatsAppMessage.insertMany(messageRecordsToSave, { ordered: false }); }
      catch (dbErr: any) { console.error('[qr-broadcast] DB save error:', dbErr.message); }
    }

    // ── Queue remaining recipients as a scheduled broadcast (cron-driven) ──
    const remaining = filteredRecipients.slice(1);
    if (remaining.length > 0 && !abortReason) {
      try {
        const { getQRBroadcastSchedule } = await import('@/lib/schemas/enterpriseSchemas');
        const QRBroadcastSchedule = getQRBroadcastSchedule();
        const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const startHH = String(nowIST.getHours()).padStart(2, '0');
        const startMM = String(nowIST.getMinutes()).padStart(2, '0');
        const endHH = String(Math.min(22, nowIST.getHours() + 10)).padStart(2, '0'); // up to 10h window
        await QRBroadcastSchedule.create({
          userId: viewerUserId,
          tenantId: 'default',
          name: `Auto-paced Broadcast — ${nowIST.toLocaleString('en-IN')}`,
          messageText: message,
          mediaUrls: imageUrl ? [imageUrl] : [],
          recipientChatIds: remaining,
          totalRecipients: remaining.length,
          isActive: true,
          startTime: `${startHH}:${startMM}`,
          endTime: `${endHH}:30`,
          timezone: 'Asia/Kolkata',
          frequency: 'once',
          status: 'scheduled',
          createdBy: viewerUserId,
          // Hand the safe defaults to the cron explicitly so they apply even if schema defaults drift
          gapStrategy: {
            initialGapMs: 30000,
            initialGapCount: 3,
            minGapMs: 120000,
            maxGapMs: 240000,
            ensureVariation: true,
            ensureJitter: true,
            jitterPercent: 15,
          },
          maxMessagesPerDay: DAILY_LIMIT,
        });
        queuedForCron = remaining.length;
        console.log(`[qr-broadcast] 📅 Queued ${queuedForCron} recipients for cron-paced delivery`);
      } catch (schedErr: any) {
        console.error('[qr-broadcast] Auto-queue failed:', schedErr.message);
        errors.push(`Auto-queue failed: ${schedErr.message}`);
      }
    }

    return NextResponse.json({
      success: sent > 0 || queuedForCron > 0,
      sent,
      failed,
      queued: queuedForCron,
      totalRecipients: filteredRecipients.length,
      sessionKey: session.sessionKey,
      ...(errors.length > 0 ? { errors } : {}),
      ...(abortReason ? { aborted: true, abortReason } : {}),
      message: abortReason
        ? `🚨 ${abortReason}`
        : queuedForCron > 0
          ? `✅ Sent 1 test message. ${queuedForCron} more queued — will deliver over ~${Math.ceil(queuedForCron * 3 / 60)}h at human pace (20/hr, 200/day max).`
          : `✅ Sent ${sent}/${filteredRecipients.length}`,
    });

  } catch (error: any) {
    console.error('[qr-broadcast] Unhandled POST error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// ── GET: return session/connection status ─────────────────

export async function GET(request: NextRequest) {
  try {
    const decoded = authCheck(request);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const bridgeUrl = getWhatsAppBridgeUrl();
    const bridgeSecret = getWhatsAppBridgeSecret();

    const result = await safeFetch(`${bridgeUrl}/sessions`, {
      method: 'GET',
      headers: { 'x-bridge-secret': bridgeSecret },
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, broadcasts: [], sessions: [] });
    }

    const sessions = (result.data?.sessions || []).filter(
      (s: any) => s.userId === viewerUserId || checkSuperAdmin(decoded)
    );

    return NextResponse.json({ success: true, broadcasts: [], sessions });
  } catch (error: any) {
    console.error('[qr-broadcast] GET error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: kept for compatibility ────────────────────────

export async function DELETE(request: NextRequest) {
  const decoded = authCheck(request);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  // Bridge has no scheduled broadcast concept — return success
  return NextResponse.json({ success: true, message: 'Deleted' });
}
