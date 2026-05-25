/**
 * QR WhatsApp Queue Processor
 * Runs every 5 minutes — sends queued messages once allowed hours begin (5 AM IST)
 * Messages queued after 10:30 PM are held here and sent at 5 AM
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getWhatsAppBridgeUrl, getWhatsAppBridgeSecret } from '@/lib/whatsappBridgeConfig';
import { isQRSendAllowed } from '@/lib/qrTimeGuard';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function resolveSessionInfo(userId: string, bridgeUrl: string, bridgeSecret: string) {
  try {
    const res = await fetch(`${bridgeUrl}/sessions`, {
      headers: { 'x-bridge-secret': bridgeSecret },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const sessions: any[] = data?.sessions || [];
    const own = sessions.find(s => s.userId === userId && s.status === 'connected');
    const any = sessions.find(s => s.status === 'connected');
    const s = own || any;
    if (!s) return null;
    return { sessionKey: String(s.sessionKey), tenantId: String(s.tenantId || s.sessionKey) };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends "Authorization: Bearer {CRON_SECRET}" — strip the prefix before comparing
  const rawAuth = req.headers.get('authorization') || '';
  const cronSecret =
    rawAuth.replace(/^Bearer\s+/i, '').trim() ||
    req.nextUrl.searchParams.get('secret') ||
    '';
  const expectedSecret = process.env.CRON_SECRET || '';
  if (expectedSecret && cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only process when inside allowed hours (5 AM – 10:30 PM IST)
  if (!isQRSendAllowed()) {
    return NextResponse.json({
      success: true,
      note: 'Outside allowed hours — queue held until 5:00 AM IST',
      processed: 0,
    });
  }

  await connectDB();
  const db = mongoose.connection.getClient().db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const queueCol = db.collection('qr_message_queue');

  // Find pending messages whose sendAt has passed
  const pending = await queueCol.find({
    status: 'pending',
    sendAt: { $lte: new Date() },
  }).limit(50).toArray();

  if (pending.length === 0) {
    return NextResponse.json({ success: true, processed: 0, note: 'No queued messages' });
  }

  const bridgeUrl = getWhatsAppBridgeUrl();
  const bridgeSecret = getWhatsAppBridgeSecret();

  let sent = 0;
  let failed = 0;

  for (const msg of pending) {
    try {
      // Get session info for this user
      const sessionInfo = await resolveSessionInfo(msg.userId || 'admincrm', bridgeUrl, bridgeSecret);
      if (!sessionInfo) {
        console.warn(`[QR Queue] No session for user ${msg.userId}`);
        continue;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-bridge-secret': bridgeSecret,
        'x-user-id': msg.userId || 'admincrm',
        'x-session-key': sessionInfo.sessionKey,
        'x-tenant-id': sessionInfo.tenantId,
      };

      const payload: any = { to: msg.to };
      if (msg.type === 'image' && msg.url) {
        payload.type = 'image';
        payload.url = msg.url;
        payload.message = msg.message;
      } else {
        payload.type = 'text';
        payload.message = msg.message;
      }

      const res = await fetch(`${bridgeUrl}/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success !== false) {
        await queueCol.updateOne(
          { _id: msg._id },
          { $set: { status: 'sent', sentAt: new Date() } }
        );
        sent++;
        console.log(`[QR Queue] ✅ Sent queued message to ${msg.to}`);
      } else {
        await queueCol.updateOne(
          { _id: msg._id },
          { $set: { status: 'failed', error: data?.error || `HTTP ${res.status}`, failedAt: new Date() } }
        );
        failed++;
        console.error(`[QR Queue] ✗ Failed for ${msg.to}: ${data?.error}`);
      }

      // Small delay between sends
      await new Promise(r => setTimeout(r, 3000));
    } catch (err: any) {
      await queueCol.updateOne(
        { _id: msg._id },
        { $set: { status: 'failed', error: err.message, failedAt: new Date() } }
      );
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    processed: pending.length,
    sent,
    failed,
    timestamp: new Date().toISOString(),
  });
}
